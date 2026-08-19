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
  sfv_person_id: number;
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
): AufstellungZeile | null {
  if (!istEigener(p.clubNumber, unsere)) return null;
  const personId = zahl(p.personId);
  /* Ohne personId ist die Zeile nicht wiedererkennbar und damit wertlos —
     lieber gar nicht anlegen als eine, die nie zugeordnet werden kann. */
  if (personId === null) return null;

  return {
    verein_id: vereinId,
    spiel_id: spielId,
    sfv_person_id: personId,
    sfv_team_id: zahl(p.teamId),
    rueckennr: zahl(p.jerseyNumber),
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

    /* Alles Personenbezogene NUR bei eigenen. Der Constraint in der Datenbank
       prueft dasselbe ein zweites Mal. */
    sfv_person_id:     eigen ? zahl(e.personId) : null,
    rueckennr:         eigen ? zahl(e.jerseyNumber) : null,
    ein_sfv_person_id: eigen ? zahl(e.substitutePlayerId) : null,
    ein_rueckennr:     eigen ? zahl(e.substitutePlayerJerseyNumber) : null,

    zuletzt_synchronisiert: jetzt,
  };
}

/* ── Halbzeitstand ─────────────────────────────────────────────────────────
   /api/match/{id} liefert intermediateResults[] mit resultTypeName. Der
   Spielplan-Endpunkt kennt keine Halbzeit — deshalb steht ht_resultat heute
   in der Verein-Spalte der Feldhoheit. Umgestellt wird erst, wenn der Sync
   laeuft (Entscheidung 6); diese Funktion steht bereit. */
export function leseHalbzeit(m: SfvRoh): string | null {
  const liste = Array.isArray(m.intermediateResults) ? m.intermediateResults : [];
  const hz = (liste as SfvRoh[]).find((r) => text(r.resultTypeName) === "Halbzeit");
  if (!hz) return null;
  const a = zahl(hz.scoreTeamA), b = zahl(hz.scoreTeamB);
  return a === null || b === null ? null : `${a}:${b}`;
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
