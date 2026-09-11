// ClubCampus — supabase/functions/sfv-sync/matchdaten.ts
// Reine Funktionen des Matchdaten-Syncs. Kennt weder Datenbank noch Netz
// und kein console.* — deshalb aus src/ heraus testbar.
//
// ═══════════════════════════════════════════════════════════════════════════
// DIE ALLOWLIST IST DAS ERSTE NETZ
//
// bildeEreignis() und bildeAufstellung() nennen jedes Feld, das in die Zeile
// kommt, einzeln beim Namen. Was der SFV sonst noch liefert — personName,
// birthDate, passportNumber, firstname, name, secondName, gender — wird nicht
// weggefiltert, sondern gar nicht erst gelesen. Ein neues Feld der Gegenseite
// reist damit nicht mit (CLAUDE.md: bei Fremddaten immer Allowlist).
//
// Das zweite Netz ist der CHECK-Constraint
// spiel_ereignisse_fremde_anonym_check: ist_eigener = false erzwingt
// sfv_person_id, rueckennr und die Wechselfelder auf NULL. Beide Netze sind
// getestet — das erste in matchdaten.test.ts, das zweite ueber eine Pruefung
// gegen schema.sql in derselben Datei.
// ═══════════════════════════════════════════════════════════════════════════

export type SfvRoh = Record<string, unknown>;

function zahl(w: unknown): number | null {
  if (w === null || w === undefined || w === "") return null;
  const n = Number(w);
  return Number.isFinite(n) ? n : null;
}

function text(w: unknown): string | null {
  if (w === null || w === undefined) return null;
  const s = String(w).trim();
  return s === "" ? null : s;
}

/* ── Eigen oder fremd ──────────────────────────────────────────────────────
   Die eine Zeile, an der alles haengt. `unsere` kommt aus
   vereine.sfv_club_nummer (FCH 11057) — NICHT aus einer Konstante und nicht
   aus der ClubId 1516, das ist eine andere Zahl. */
export function istEigener(clubNumber: unknown, unsere: number | null): boolean {
  const n = zahl(clubNumber);
  return n !== null && unsere !== null && n === unsere;
}

/* ── Aufstellung ───────────────────────────────────────────────────────────
   Nur eigene Spieler. Fremde Zeilen gibt diese Funktion als null zurueck —
   der Spielbericht zeigt vom Gegner den Verein, nicht seine Mannschaft. */
export interface AufstellungZeile {
  verein_id: string;
  spiel_id: string;
  /** ⚠ NULL bei Gegnern — der CHECK erzwingt es. Siehe bildeAufstellung. */
  sfv_person_id: number | null;
  ist_eigener: boolean;
  /** Klarname aus der SFV-Antwort. Rueckfall — eine Zuordnung gewinnt. */
  name: string | null;
  /** SFV assignmentRoleId aus /players — 2 = Ersatz. Fuer BEIDE Seiten. */
  rolle_zuweisung_id: number | null;
  rolle_zuweisung: string | null;
  sfv_team_id: number | null;
  rueckennr: number | null;
  position_id: number | null;
  position_name: string | null;
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
  zuletzt_synchronisiert: string;
}

export function bildeAufstellung(
  p: SfvRoh, unsere: number | null, vereinId: string, spielId: string, jetzt: string,
  /** ⚠ Optional, damit kein Aufrufer zum Zaehlen gezwungen ist — aber wer
      zaehlen WILL, bekommt den Grund und nicht bloss die Menge. Ohne den
      Grund waere die Zahl eine zweite Frage statt einer Antwort. */
  verworfen?: string[],
): AufstellungZeile | null {
  /* ⚠ ⚠  ENTSCHEID B (10.09.2026): DIE GEGNERAUFSTELLUNG KOMMT MIT —
     Rueckennummer und Position, KEINE Person.

     Hier stand `if (!istEigener(...)) return null`. Der Filter ist nicht
     gefallen, er ist GEWANDERT: von hier in die Feldzuweisung, genau wie
     bildeEreignis() es seit dem 19.08.2026 tut.

     ⚠ WARUM NICHT DIE GANZE ZEILE DURCHREICHEN: dann waere die Allowlist
     keine mehr. Die Grenze steht Feld fuer Feld — eine Zeile, die
     durchkommt, nimmt beim naechsten neuen Feld alles mit; eine
     Feldliste nicht. `personName`, `birthDate`, `passportNumber` und
     `gender` stehen in DERSELBEN Antwort, und keines davon wird gelesen.

     ⚠ UND B IST NICHT C: der Name ist nicht bloss ungenutzt, er ist in
     der Datenbank verboten (spiel_aufstellung_fremde_ohne_person). */
  const eigen = istEigener(p.clubNumber, unsere);
  const personId = zahl(p.personId);
  const nummer = zahl(p.jerseyNumber);

  /* Ohne personId ist eine EIGENE Zeile nicht wiedererkennbar und damit
     wertlos — lieber gar nicht anlegen als eine, die nie zugeordnet
     werden kann.

     ⚠ ⚠  UND GENAU HIER VERSCHWINDEN ZEILEN, OHNE DASS ETWAS FEHLSCHLAEGT.
     Gemessen am 11.09.2026: vier Spiele tragen 8 bis 10 eigene Zeilen,
     eines davon bei 21 Ereignissen. Weniger als elf kann keine
     Mannschaft aufstellen — es ist also entweder ein abgebrochener
     Abruf oder dieser Filter.

     **Und die beiden waren nicht zu unterscheiden, weil niemand
     zaehlte.** Der Aufrufer sah eine Liste und wusste nicht, ob sie so
     kam oder so uebrig blieb. Dieselbe Klasse wie ein leerer catch: aus
     einem Ausfall wird eine Datenlage. Seither nennt `verworfen` den
     Grund, und `geliefert` steht daneben — drei Zahlen, die aufgehen
     muessen. */
  if (eigen && personId === null) {
    verworfen?.push("eigen_ohne_person");
    return null;
  }

  /* ⚠ Und eine FREMDE Zeile ohne Nummer hat ueberhaupt keine Identitaet:
     kein Name, keine Personennummer, keine Nummer. Sie waere von jeder
     anderen ununterscheidbar — und der zweite Schluessel
     (verein_id, spiel_id, sfv_team_id, rueckennr) griffe nicht. */
  if (!eigen && nummer === null) {
    verworfen?.push("fremd_ohne_nummer");
    return null;
  }

  return {
    verein_id: vereinId,
    spiel_id: spielId,
    sfv_person_id: eigen ? personId : null,
    ist_eigener: eigen,
    /* ⚠ `firstname` + `name`, nicht `personName`: dieselbe Regel wie in
       bildeSfvPerson(), und `secondName` bleibt weg. */
    name: eigen
      ? ([text(p.firstname), text(p.name)].filter(Boolean).join(" ").trim() || null)
      : null,
    /* Die KATEGORIE (Spieler/Trainer/Betreuer) kommt nur von der Bank. */
    /* ⚠ DIE ZUWEISUNG DAGEGEN STEHT HIER — und zwar fuer BEIDE
       Mannschaften. Gemessen am 10.09.2026: der Gegner hat eine Bank, sie
       steht nur nicht in `positionName`. Drei Spieler tragen „Ersatz" bei
       echter Position; wer die Rolle aus der Position ableitet, zaehlt sie
       falsch. */
    rolle_zuweisung_id: zahl(p.assignmentRoleId),
    rolle_zuweisung: text(p.assignmentRoleName),
    sfv_team_id: zahl(p.teamId),
    /* ⚠ Beide Mannschaften — das ist der Gegenstand von B. Gemessen an
       einer echten Antwort: 12 von 12 fremden Spielern tragen Nummer und
       Position. */
    rueckennr: nummer,
    position_id: zahl(p.positionId),
    position_name: text(p.positionName),
    von_minute: zahl(p.playFromMinute),
    bis_minute: zahl(p.playUntilMinute),
    spielzeit: zahl(p.totalPlayTime),
    zuletzt_synchronisiert: jetzt,
  };
}

/* ── Ereignisse ────────────────────────────────────────────────────────────
   Alle, eigene wie fremde — der Spielverlauf bleibt vollstaendig. Vom
   Gegner bleibt nur der Vereinsname; die Person dahinter bleibt anonym. */
export interface EreignisZeile {
  verein_id: string;
  spiel_id: string;
  herkunft: "sfv";
  sfv_event_id: number | null;
  typ_id: number;
  typ: string | null;
  subtyp_id: number | null;
  subtyp: string | null;
  minute: number | null;
  zusatzminute: number | null;
  ist_eigener: boolean;
  sfv_team_id: number | null;
  gegner_club_name: string | null;
  sfv_person_id: number | null;
  rueckennr: number | null;
  ein_sfv_person_id: number | null;
  ein_rueckennr: number | null;
  zuletzt_synchronisiert: string;
}

export function bildeEreignis(
  e: SfvRoh, unsere: number | null, vereinId: string, spielId: string, jetzt: string,
): EreignisZeile | null {
  const eventId = zahl(e.eventId);
  if (eventId === null) return null;
  const eigen = istEigener(e.clubNumber, unsere);

  return {
    verein_id: vereinId,
    spiel_id: spielId,
    herkunft: "sfv",
    sfv_event_id: eventId,
    typ_id: zahl(e.eventTypeId) ?? 0,
    typ: text(e.eventTypeName),
    subtyp_id: zahl(e.eventSubTypeId),
    subtyp: text(e.eventSubTypeName),
    minute: zahl(e.minute),
    zusatzminute: zahl(e.additionalMinute),
    ist_eigener: eigen,
    sfv_team_id: zahl(e.teamId),

    /* Vom Gegner der Verein, sonst nichts. teamName ist der Mannschaftsname
       ("FC Kuesnacht a") — er nennt keine Person. */
    gegner_club_name: eigen ? null : text(e.teamName),

    /* ⚠ ⚠  DIE NUMMER FUER BEIDE, DIE PERSON NUR FUER EIGENE — seit dem
       10.09.2026. Vorher stand hier viermal `eigen ? … : null`.

       Der Grund fuer die Aenderung ist eine ANZEIGE: der Gegner bekommt
       Tor- und Kartensymbole an seiner Aufstellungszeile, und die
       Zuordnung laeuft ueber die Rueckennummer. Ohne sie bliebe die
       Gegneraufstellung ohne Symbole.

       ⚠ DIE GRENZE VERSCHIEBT SICH NICHT, SIE WIRD GENAUER. Personen-
       nummern bleiben verboten — nicht ungenutzt, sondern vom CHECK
       erzwungen. Eine Personennummer ist ueber dieselbe Schnittstelle in
       einen Namen aufzuloesen; eine Rueckennummer ist eine Beschriftung
       auf einem Trikot.

       ⚠ UND DER TEXT AENDERT SICH NICHT. beschreibeWer() gibt beim
       Gegner weiterhin den Vereinsnamen zurueck; die Nummer wandert ins
       FELD, nicht in die Zeichenkette. Zwei Wahrheiten waeren eine zu
       viel. */
    sfv_person_id:     eigen ? zahl(e.personId) : null,
    rueckennr:         zahl(e.jerseyNumber),
    ein_sfv_person_id: eigen ? zahl(e.substitutePlayerId) : null,
    ein_rueckennr:     zahl(e.substitutePlayerJerseyNumber),

    zuletzt_synchronisiert: jetzt,
  };
}

/* ── Die Ersatzbank ist am 10.09.2026 wieder ausgebaut worden ────────────

   `bildeBankZeile()` stand hier einen halben Tag. Sie kam aus dem Satz
   „/players liefert nur die Startelf" — gezogen aus den 207, die fehlende
   NAMEN messen und nicht fehlende ZEILEN.

   Gemessen, bevor sie fiel: /players fuehrt die Bank mit (die Verteilung
   von assignmentRoleName ist auf beiden Seiten gleich — Ersatz fremd 37,
   eigen 40), und /bench brachte 20 Personen, die /players nicht hat:
   **alle Trainer/in, kein einziger Spieler.**

   ⚠ Damit kennt ClubCampus die Trainer eines Spiels nicht mehr. Der Weg
   zurueck ist `aktion: "rohschluessel"`, die /bench weiterhin abfragt und
   nur liest — siehe docs/plan_bench_ausbau.md §6. */


/* ── Zwei Listen, eine Zeile je Person ────────────────────────────────────

   ⚠ ⚠  DER FEHLER VOM 10.09.2026, UND ER WAR MEINER.

   Ich habe `/players` und `/bench` mit `[...a, ...b]` aneinandergehaengt.
   Beide fuehren dieselbe Person: wer auf der Bank sass, steht in
   `/players` als „Ersatz" UND in `/bench`. Der Upsert bekam damit
   zweimal denselben Konfliktschluessel und brach den GANZEN Stapel ab:

     ON CONFLICT DO UPDATE command cannot affect row a second time

   ⚠ Und der Abbruch traf nicht nur die Aufstellung: der Ereignis-Upsert
   steht im selben `try`, also blieben auch die Ereignisse aus. Ein
   Fehler, zwei Ausfaelle.

   ⚠ ES IST DERSELBE FALL, DEN entdoppleSfvPersonen() FUER `sfv_personen`
   SCHON LOEST — und ich habe ihn eine Datei weiter noch einmal gebaut,
   ohne ihn wiederzuerkennen. Dass dieselbe Person in beiden Listen steht,
   hatte ich am selben Vormittag gemessen.

   ── Warum VERSCHMELZEN und nicht die Bankzeile wegwerfen ──────────────
   Die `/players`-Zeile traegt Nummer, Position und Minuten; die
   `/bench`-Zeile traegt die Rollenkategorie (Spieler/Trainer/Betreuer),
   die es in `/players` nicht gibt. Wer eine der beiden verwirft, verliert
   etwas — also gewinnt `/players` als Grundzeile und `/bench` steuert bei,
   was nur dort steht. */
export function verschmelzeAufstellung(zeilen: AufstellungZeile[]): AufstellungZeile[] {
  /* Zwei Schluessel, wie beim Upsert: eigene ueber die Person, fremde
     ueber Team und Nummer. Wer sie hier anders bildet als dort, entdoppelt
     etwas anderes, als die Datenbank zusammenfuehrt. */
  const schluessel = (z: AufstellungZeile) =>
    z.ist_eigener
      ? `p:${z.sfv_person_id}`
      : `n:${z.sfv_team_id}:${z.rueckennr}`;

  const nach = new Map<string, AufstellungZeile>();
  for (const z of zeilen) {
    const k = schluessel(z);
    const da = nach.get(k);
    if (!da) { nach.set(k, z); continue; }

    /* ⚠ Seit dem Ausbau von /bench gibt es nur noch EINE Quelle, und der
       eigene Zweig kann nicht mehr treffen — er bleibt trotzdem stehen:
       es ist die Stelle, an der eine zweite Quelle wieder andocken
       wuerde, und sie hat einen halben Tag gefehlt. Der FREMDE Zweig
       arbeitet weiter (siehe unten). */
    nach.set(k, da);
  }
  return [...nach.values()];
}

/** Die Kategorie, die einen SPIELER bezeichnet — Stammdaten, nicht geraten. */
export const ROLLE_SPIELER = 1;

/* ── Der Klarname einer eigenen Person ────────────────────────────────────

   ⚠ ⚠  HIER WIRD DER ENTSCHEID VOM 22.08.2026 UMGEDREHT  ⚠ ⚠
   Die Begruendung steht vollstaendig in migration_sfv_personen.sql und wird
   hier nicht wiederholt — sie gehoert an die Stelle, die die Struktur
   anlegt, nicht an die, die sie fuellt. Kurz: die Namen sollen auf die
   Website, damit haben sie einen dauerhaften Zweck, und dieselben Namen
   stehen oeffentlich auf fvrz.ch.

   ⚠ WAS SICH NICHT AENDERT — und was der naechste Leser zuerst pruefen
   wird: `istEigener` steht unveraendert an derselben Stelle. Vom Gegner
   wird hier nichts gebildet, `null` zurueckgegeben, fertig. Der Constraint
   in der Datenbank ist das zweite Netz und bleibt ebenfalls.

   ⚠ DIE ALLOWLIST IST DAS ERSTE NETZ, und sie gilt hier genauso wie in
   bildeAufstellung(): jedes Feld einzeln beim Namen. `birthDate`,
   `passportNumber`, `gender` und `secondName` werden nicht gefiltert,
   sondern GAR NICHT GELESEN — ein neues Feld der Gegenseite reist damit
   nicht mit.

   ⚠ `secondName` bleibt weg: ein zweiter Vorname hilft beim Wiedererkennen
   nicht und macht die Zeile nur laenger. Dieselbe Regel wie beim
   Schiedsrichter und wie bei bildeOffeneNamen(). */
export interface SfvPersonZeile {
  verein_id: string;
  sfv_person_id: number;
  name: string;
  sfv_team_id: number | null;
  rueckennr: number | null;
  zuletzt_gesehen: string;
}

export function bildeSfvPerson(
  p: SfvRoh,
  unsere: number | null,
  vereinId: string,
  jetzt: string,
): SfvPersonZeile | null {
  if (!istEigener(p.clubNumber, unsere)) return null;
  const id = zahl(p.personId);
  if (id === null) return null;
  const name = [text(p.firstname), text(p.name)].filter(Boolean).join(" ").trim();
  /* Ohne Namen keine Zeile: `name` ist NOT NULL, und eine leere Zeile
     saehe in der Maske aus wie ein Spieler ohne Namen statt wie einer,
     dessen Name noch nicht geholt wurde. */
  if (!name) return null;
  return {
    verein_id: vereinId,
    sfv_person_id: id,
    name,
    sfv_team_id: zahl(p.teamId),
    rueckennr: zahl(p.jerseyNumber),
    zuletzt_gesehen: jetzt,
  };
}


/* ⚠ EIN SPIELER STEHT IN MEHREREN SPIELEN DESSELBEN LAUFS.
   Ein Upsert-Stapel mit zwei Zeilen desselben Schluessels laesst Postgres
   mit `21000 ON CONFLICT DO UPDATE command cannot affect row a second
   time` scheitern — der ganze Stapel, nicht die eine Zeile. Deshalb wird
   vor dem Schreiben entdoppelt, und zwar auf den SPAETEREN Treffer: er
   stammt aus dem zuletzt verarbeiteten Spiel, und `rueckennr` soll die
   juengste Momentaufnahme sein. */
export function entdoppleSfvPersonen(zeilen: SfvPersonZeile[]): SfvPersonZeile[] {
  const nach = new Map<number, SfvPersonZeile>();
  for (const z of zeilen) nach.set(z.sfv_person_id, z);
  return [...nach.values()];
}

/* ── Namen der noch nicht zugeordneten eigenen Spieler ────────────────────

   ⚠ SIE WERDEN NICHT GESPEICHERT. Sie reisen in der ANTWORT des Laufs mit,
   die Zuordnungsmaske haelt sie im Speicher, und beim Neuladen sind sie weg.

   Warum dieser Weg und kein anderer:

     Speichern         eine Spalte an `spiel_aufstellung` liest JEDER — die
                       Tabelle steht dem ganzen Verein offen, unabhaengig
                       davon, wo die Maske steht. Und nach der Zuordnung ist
                       der Name ueberfluessig: ein Bestand ohne Zweck, den
                       jemand loeschen muesste und vergessen wuerde.
     Eigener Abruf     scheidet aus: die API kennt pro Anwendung genau EIN
                       gueltiges Token. Ein zweiter POST macht den ersten
                       ungueltig, und der stuendliche Sync stirbt.
     Dieser Weg        derselbe Lauf, dieselbe Antwort. Nichts zu loeschen,
                       weil nichts gespeichert wird.

   ⚠ NUR EIGENE SPIELER. `istEigener` filtert nach `clubNumber`. Vom Gegner
   kommt der Name genauso mit — er wird hier nicht angefasst, und der
   Constraint `spiel_ereignisse_fremde_anonym_check` bleibt unberuehrt.
   Entscheidung Didi, 21.08.2026.

   ⚠ `secondName` bleibt weg: ein zweiter Vorname hilft beim Wiedererkennen
   nicht und macht die Zeile nur laenger. Dieselbe Regel wie beim
   Schiedsrichter. */
export interface OffenerName {
  sfv_person_id: number;
  name: string;
  rueckennr: number | null;
  sfv_team_id: number | null;
}

export function bildeOffeneNamen(
  alleRoh: SfvRoh[],
  unsere: number | null,
  bereitsZugeordnet: ReadonlySet<number>,
): OffenerName[] {
  const nach = new Map<number, OffenerName>();
  for (const p of alleRoh) {
    if (!istEigener(p.clubNumber, unsere)) continue;
    const id = zahl(p.personId);
    if (id === null || bereitsZugeordnet.has(id)) continue;
    /* Erster Treffer gewinnt: derselbe Spieler steht in mehreren Spielen,
       und der Name ist ueberall derselbe. */
    if (nach.has(id)) continue;
    const name = [text(p.firstname), text(p.name)].filter(Boolean).join(" ").trim();
    if (!name) continue;
    nach.set(id, {
      sfv_person_id: id,
      name,
      rueckennr: zahl(p.jerseyNumber),
      sfv_team_id: zahl(p.teamId),
    });
  }
  return [...nach.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/* ── Halbzeitstand ─────────────────────────────────────────────────────────
   /api/match/{id} liefert intermediateResults[] mit resultTypeName. Der
   Spielplan-Endpunkt kennt keine Halbzeit — deshalb steht ht_resultat heute
   in der Verein-Spalte der Feldhoheit. Umgestellt wird erst, wenn der Sync
   laeuft (Entscheidung 6); diese Funktion steht bereit. */
/**
 * SFV-Resultattyp „Halbzeit". Aus `sfv_stammdaten.json` → Resultattyp,
 * nicht geraten: 0 „-", **1 „Halbzeit"**, 2 „Stand nach regulaerer
 * Spielzeit", 5 „Stand nach Verlaengerung", 6 „nach Elfmeterschiessen",
 * dazu Drittel- und Viertelspausen.
 */
export const RESULTAT_HALBZEIT_ID = 1;

/**
 * Drei Zustaende, nicht zwei — und der Unterschied ist die halbe Aussage.
 *
 * ⚠ `null` und `[]` und „0:0" sind DREI verschiedene Dinge, und die
 * Anzeige unterscheidet sie: „wir wissen es nicht" gegen „der Verband
 * fuehrt keine Halbzeit" gegen „es stand null zu null". Ein Rueckgabewert
 * `string | null` konnte das nicht sagen.
 */
export type HalbzeitZustand =
  /** `intermediateResults` fehlt oder ist null. */
  | "fehlt"
  /** Die Liste ist da und leer. */
  | "leer"
  /** Eintraege da, aber keiner mit Resultattyp 1. */
  | "ohne_halbzeit"
  /** Gefunden — `stand` traegt „A:B", auch „0:0". */
  | "da";

export function leseHalbzeit(m: SfvRoh): { stand: string | null; zustand: HalbzeitZustand } {
  const roh = m.intermediateResults;
  if (roh === null || roh === undefined) return { stand: null, zustand: "fehlt" };
  if (!Array.isArray(roh)) return { stand: null, zustand: "fehlt" };
  if (roh.length === 0) return { stand: null, zustand: "leer" };

  /* ⚠ ⚠  NACH DER ID, NICHT NACH DEM NAMEN — berichtigt am 10.09.2026.
     Hier stand `text(r.resultTypeName) === "Halbzeit"`. Das ist ein
     Filter auf eine SCHREIBWEISE: der Name ist ein Anzeigetext des
     Verbands und kann sich aendern, die Id ist ein Schluessel aus den
     Stammdaten. Dieselbe Regel wie bei `ableitung === null` gegen
     `name !== "Elternteil"` — und dieselbe Falle wie ueberall, wo ein
     Vergleich gegen eine Zeichenkette aus fremder Hand steht. */
  const hz = (roh as SfvRoh[]).find((r) => zahl(r.resultTypeId) === RESULTAT_HALBZEIT_ID);
  if (!hz) return { stand: null, zustand: "ohne_halbzeit" };

  const a = zahl(hz.scoreTeamA), b = zahl(hz.scoreTeamB);
  if (a === null || b === null) return { stand: null, zustand: "ohne_halbzeit" };
  /* ⚠ Reihenfolge wie bei `resultat`: A:B in der Zaehlweise des Verbands,
     NICHT „wir:sie". Wer das dreht, dreht es nur an einer der beiden
     Stellen — und dann widersprechen sich Resultat und Halbzeit. */
  return { stand: `${a}:${b}`, zustand: "da" };
}

/* ── Kandidaten ────────────────────────────────────────────────────────────
   Neue Spiele zuerst, Wiederholungen fuellen auf: ein fehlender Spielbericht
   faellt auf, eine um eine Stunde verzoegerte Korrektur nicht.

   Nachgeholt wird bis Spieldatum + 7 Tage (Entscheidung 4) — Korrekturen des
   Verbands kommen fast immer in den Tagen danach. */
export interface SpielKandidat {
  id: string;
  date: string | null;
  matchdaten_geholt_am: string | null;
  sfv_match_id: number | null;
}

export const NACHZUG_TAGE = 7;

export function waehleKandidaten<T extends SpielKandidat>(
  spiele: T[], jetzt: Date, hoechstens = 10,
): T[] {
  /* Auf den Tagesanfang normalisiert, weil `spiele.date` eine DATE-Spalte
     ohne Uhrzeit ist: `new Date("2026-08-12")` ist Mitternacht UTC. Gegen
     einen Zeitstempel verglichen fiele ein Spiel am Randtag je nach
     Tageszeit heraus — vormittags drin, nachmittags nicht. Die Frist zaehlt
     in Tagen, also endet sie am Tagesanfang. */
  const tagesanfang = Date.UTC(
    jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate(),
  );
  const grenze = tagesanfang - NACHZUG_TAGE * 24 * 60 * 60 * 1000;
  const mitId = spiele.filter((s) => s.sfv_match_id !== null);

  /* Innerhalb jeder Gruppe das juengste zuerst — was gerade gespielt wurde,
     interessiert am meisten. */
  const neuer = (a: T, b: T) => String(b.date ?? "").localeCompare(String(a.date ?? ""));

  const neu  = mitId.filter((s) => !s.matchdaten_geholt_am).sort(neuer);
  const wieder = mitId
    .filter((s) => s.matchdaten_geholt_am && s.date && new Date(s.date).getTime() >= grenze)
    .sort(neuer);

  return [...neu, ...wieder].slice(0, hoechstens);
}

/* ── Nachzug: ist unsere Korrektur ueberfluessig geworden? ─────────────────
   Verglichen wird NUR, was die Korrektur angefasst hat. Wer den Torschuetzen
   korrigiert, hat zur Minute nichts gesagt; ein Vergleich der ganzen Zeile
   schluege bei jeder Nebenaenderung an und entwertete die Meldungen.

   Eine Vereins-Zeile ohne ersetzt_ereignis_id (nachgetragener Assist) hat
   nichts, womit sie verglichen werden koennte — sie wird nie ueberfluessig. */
export interface KorrekturZeile {
  id: string;
  ersetzt_ereignis_id: string | null;
  geaenderte_felder: string[] | null;
  verworfen_am: string | null;
  /* Wer korrigiert hat — an diese Person geht die Nachzug-Meldung. Nicht an
     den Trainer, sondern an den, der weiss warum. */
  korrigiert_von?: string | null;
  /* Die korrigierten Werte selbst stehen unter ihren Spaltennamen. */
  [feld: string]: unknown;
}

export function istKorrekturUeberfluessig(
  korrektur: KorrekturZeile, sfvZeile: Record<string, unknown> | null | undefined,
): boolean {
  if (!sfvZeile) return false;
  if (korrektur.verworfen_am) return false;
  if (!korrektur.ersetzt_ereignis_id) return false;
  const felder = korrektur.geaenderte_felder ?? [];
  if (felder.length === 0) return false;
  return felder.every((f) => gleich(korrektur[f], sfvZeile[f]));
}

/* null und undefined sind dasselbe "nicht gesetzt"; Zahlen werden nicht
   ueber ihren Text verglichen (13 !== "13" waere ein falscher Alarm). */
function gleich(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a) === String(b);
}

/* ── Schiedsrichter ────────────────────────────────────────────────────────
   Ein Schiedsrichter ist eine Amtsfunktion, keine Privatperson. Sein Name
   steht auf jedem Spielbericht und ist der Zweck seiner Anwesenheit. Von
   gegnerischen SPIELERN wird weiterhin nichts gespeichert — das ist keine
   Aufweichung der Regel, sondern eine Unterscheidung zwischen Teilnehmer
   und Amtstraeger.

   ⚠ NUR DER NAME. Der Endpunkt liefert auch birthDate, gender, personId,
   refereeId, clubNumber und clubName. Nichts davon wird gelesen — auch nicht
   personId: bei Spielern haelt sie die Wiedererkennung ueber Saisons, hier
   gaebe es keinen Zweck, und eine Kennung ohne Zweck ist eine zu viel. */

/** Hauptschiedsrichter laut Probe vom 20.08.2026: 1 = Schiedsrichter,
    2 = Assistent 1, 5 = Assistent 2. Einen Delegierten liefert der Endpunkt
    in unseren Ligen nicht. */
export const ROLLE_SCHIEDSRICHTER = 1;

export function leseSchiedsrichter(eintraege: SfvRoh[]): string | null {
  const haupt = eintraege.find((e) => zahl(e.refereeRoleId) === ROLLE_SCHIEDSRICHTER);
  if (!haupt) return null;
  /* firstname + name; secondName ist ein zweiter Vorname und gehoert nicht
     in eine Anzeige, die neben dem Resultat steht. */
  const name = [text(haupt.firstname), text(haupt.name)].filter(Boolean).join(" ").trim();
  return name || null;
}

/* ── Spielerpass ───────────────────────────────────────────────────────────
   ERSTES MAL, DASS EIN SYNC EIN MITGLIEDERFELD SCHREIBT. Deshalb drei
   Regeln, und alle drei sind hier als reine Funktion nachpruefbar.

   1. NUR EIGENE SPIELER. `passportNumber` steht auch an jedem gegnerischen
      Eintrag — und wird dort nicht gelesen. Die Regel "von fremden Spielern
      nichts" gilt unveraendert.

   2. NIE MIT NULL UEBERSCHREIBEN. Der Sync sieht nur, wer gespielt hat. Ein
      verletzter oder gesperrter Spieler taucht in keiner Aufstellung auf;
      sein von Hand eingetragener Pass bliebe sonst beim naechsten Lauf leer.
      Was der Verband nicht liefert, bleibt unangetastet.

   3. EINE ABWEICHUNG WIRD FESTGEHALTEN, nicht still ersetzt. Der Verband
      fuehrt den Pass, wir schreiben ihn ab — aber wenn sich der Wert
      aendert, gehoert das Vorher in den Verlauf. Sonst faellt niemandem auf,
      dass eine Nummer, die jemand von Hand eintrug, ueberschrieben wurde. */

export interface PassAenderung {
  mitglied_id: number;
  alt: string | null;
  neu: string;
}

/**
 * Welche Mitglieder bekommen einen neuen Spielerpass?
 *
 * `aufstellung` sind die ROHEN Eintraege des SFV (nur die eigenen werden
 * gelesen), `zuordnung` bildet sfv_person_id auf mitglied_id ab, `bestand`
 * haelt den heutigen Wert je Mitglied.
 *
 * Zurueck kommt nur, was sich tatsaechlich aendert — gleiche Werte erzeugen
 * kein Schreiben und keinen Verlaufseintrag.
 */
export function passAenderungen(
  aufstellung: SfvRoh[],
  unsere: number | null,
  zuordnung: Map<number, number>,
  bestand: Map<number, string | null>,
): PassAenderung[] {
  /* Mitglieder mit widerspruechlicher Zuordnung bleiben aussen vor —
     sonst pendelte ihr Pass bei jedem Lauf. Siehe passKonflikte(). */
  const strittig = new Set(passKonflikte(aufstellung, unsere, zuordnung).map((k) => k.mitglied_id));
  const raus = new Map<number, PassAenderung>();

  for (const p of aufstellung) {
    if (strittig.has(zuordnung.get(zahl(p.personId) ?? -1) ?? -1)) continue;
    if (!istEigener(p.clubNumber, unsere)) continue;      // Regel 1
    const personId = zahl(p.personId);
    if (personId === null) continue;

    const mitgliedId = zuordnung.get(personId);
    if (mitgliedId === undefined) continue;                // noch nicht zugeordnet

    const neu = text(p.passportNumber);
    if (neu === null) continue;                            // Regel 2: nie null

    const alt = bestand.get(mitgliedId) ?? null;
    if (alt !== null && alt.trim() === neu) continue;      // unveraendert

    raus.set(mitgliedId, { mitglied_id: mitgliedId, alt, neu });
  }

  return [...raus.values()];
}

/**
 * Mitglieder, denen ZWEI verschiedene SFV-Personen mit verschiedenen
 * Passnummern zugeordnet sind.
 *
 * ⚠ DER FALL IST BAUART, NICHT ZUFALL. `sfv_zuordnung` hat bewusst keinen
 * Unique auf mitglied_id: ein Mitglied darf mehrere sfv_person_id tragen,
 * damit ein Saisonwechsel der IDs die Historie nicht zerreisst. Genau das
 * erlaubt aber auch, zwei verschiedene Menschen versehentlich auf dasselbe
 * Mitglied zu legen.
 *
 * Was dann ohne diese Pruefung geschaehe: der Pass wechselte bei JEDEM Lauf
 * zwischen beiden Werten hin und her, und jeder Wechsel schriebe einen
 * Verlaufseintrag. Ein Feld, das nie zur Ruhe kommt, und eine Historie
 * voller Rauschen — beides ohne erkennbare Ursache.
 *
 * Deshalb: gar nicht schreiben und melden. Eine falsche Zuordnung ist von
 * Hand zu klaeren, nicht vom Sync zu raten.
 */
export interface PassKonflikt {
  mitglied_id: number;
  werte: string[];
}

export function passKonflikte(
  aufstellung: SfvRoh[], unsere: number | null, zuordnung: Map<number, number>,
): PassKonflikt[] {
  const proMitglied = new Map<number, Set<string>>();

  for (const p of aufstellung) {
    if (!istEigener(p.clubNumber, unsere)) continue;
    const personId = zahl(p.personId);
    if (personId === null) continue;
    const mitgliedId = zuordnung.get(personId);
    if (mitgliedId === undefined) continue;
    const pass = text(p.passportNumber);
    if (pass === null) continue;

    let werte = proMitglied.get(mitgliedId);
    if (!werte) { werte = new Set(); proMitglied.set(mitgliedId, werte); }
    werte.add(pass);
  }

  return [...proMitglied.entries()]
    .filter(([, werte]) => werte.size > 1)
    .map(([mitglied_id, werte]) => ({ mitglied_id, werte: [...werte].sort() }));
}
