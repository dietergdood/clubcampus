/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpLauf.ts

   Der scharfe Lauf des WordPress-Exports, aufgeteilt: welche Teile
   gehen hinaus, was kommt zusammen zurück, was davon darf ins
   Protokoll. Reine Logik — kein HTTP, keine Datenbank.

   ⚠ WARUM HIER UND NICHT IN DER EDGE FUNCTION: dieselbe Begründung wie
   bei `wpNutzlast.ts`. `tsc` liest die Function nicht, vitest kann sie
   nicht importieren. Was eine Entscheidung trifft, gehört in eine Datei,
   die beide Welten lesen.

   ── DIE DREI ENTSCHEIDUNGEN, DIE HIER STEHEN ──────────────────────
   1. Ein POST JE MANNSCHAFT, nicht einer für alle (`teileNachTeam`).
   2. Der Abgleichbereich kommt aus den GELIEFERTEN Spielen, nie aus
      der Teamliste — eine Mannschaft ohne Spiele wird nicht genannt
      und deshalb auch nicht abgeräumt.
   3. Eine gescheiterte Mannschaft bricht den Lauf nicht ab, sie wird
      gezählt und benannt (`fasseLauf` → Status `fehler`).
   ═══════════════════════════════════════════════════════════════ */
import type { WpSpiel } from "./wpNutzlast.ts";

/** Was das Plugin auf `/clubcampus/v1/spiele` zurückgibt. Absichtlich
    offen getippt: die Gegenseite ist PHP, und was von dort kommt, wird
    gelesen wie Fremddaten — durch eine Allowlist, nicht durch einen
    Typ. Siehe `fuersProtokoll()`. */
export type WpAntwort = Record<string, unknown>;

/** Ein Teil des Laufs: eine Mannschaft und ihre Spiele. */
export interface LaufTeil {
  sfv_team_id: string;
  spiele: WpSpiel[];
}

/** Wie ein Teil ausgegangen ist. `wp === null` heisst gescheitert. */
export interface TeilErgebnis {
  sfv_team_id: string;
  gesendet: number;
  wp: WpAntwort | null;
  fehler: string | null;
  /** Wanduhr fuer DIESEN POST. Optional, damit ein Test nicht so tun muss,
      als haette er gestoppt — eine erfundene Dauer waere im Protokoll von
      einer gemessenen nicht zu unterscheiden. */
  dauer_ms?: number;
}

export type LaufStatus = "ok" | "warnung" | "fehler";

export interface LaufZahlen {
  teams_gesendet: number;
  teams_gescheitert: number;
  spiele_gesendet: number;
  neu: number;
  aktualisiert: number;
  zurueckgezogen: number;
  uebersprungen: number;
  verlauf_zeilen: number;
  /**
   * Aufstellungszeilen, die der Empfänger GESCHRIEBEN hat — seine Zahl,
   * nicht unsere.
   *
   * ⚠ ⚠ SIE FEHLTE BIS ZUM 11.09.2026 GANZ, und deshalb war die Frage
   * „ist die Aufstellung überhaupt angekommen?" nicht zu beantworten.
   * Für den Verlauf gab es `verlauf_zeilen` seit dem ersten Tag; für die
   * Aufstellung nichts — und „270 aktualisiert" sagt über sie nichts aus,
   * weil es Beiträge zählt und keine Zeilen.
   *
   * ⚠ SIE STEHT NEBEN `gesendete_aufstellung_zeilen`, und das ist der
   * Punkt: eine Zahl allein kann „wir haben nichts gesendet" nicht von
   * „sie haben nichts geschrieben" unterscheiden. Zwei Zahlen können es.
   */
  aufstellung_zeilen: number;
  ohne_team: string[];
  doppelte_teams: string[];
  fehler: string[];
  moegliche_dubletten: { neu: unknown; von_hand: unknown }[];
  /**
   * Feldnamen, die die Nutzlast bringt und die keine Allowlist des
   * Empfängers führt — er meldet sie seit 0.7.0 als `unbeachtete_felder`.
   *
   * ⚠ VEREINIGT ÜBER ALLE TEILE, nicht je Mannschaft aufgezählt: bei 21
   * Teams lautete derselbe Name 21-mal gleich, und eine Liste, die sich
   * wiederholt, wird nicht gelesen.
   *
   * ⚠ UND SIE FEHLTE BIS ZUM 10.09.2026 GANZ. Der Empfänger meldete,
   * unsere Seite las es nicht — `liga` kam ein halbes Jahr an und wurde
   * verworfen, und WO es riss, musste die Website-Seite von Hand messen.
   * Ein Melder, den niemand abholt, ist selbst die Lücke, gegen die er
   * gebaut wurde.
   */
  unbeachtete_felder: string[];
}

/**
 * Die Spiele eines Laufs in Teile je Mannschaft zerlegen.
 *
 * ⚠ DER ABGLEICHBEREICH ENTSTEHT HIER, UND ER IST DIE GEFÄHRLICHSTE ZAHL
 *   DES GANZEN EXPORTS. Das Plugin räumt genau die Mannschaften ab, die
 *   in `teams` stehen: ein Beitrag, dessen Team geliefert wurde und
 *   dessen Spiel nicht mehr kommt, geht auf Entwurf.
 *
 *   Deshalb kommt die Liste aus den SPIELEN und nicht aus der Teamliste.
 *   Eine Mannschaft, zu der dieser Lauf nichts gebaut hat, taucht gar
 *   nicht auf — und kann folglich nichts verlieren. Plan §8.2:
 *   abgeglichen wird je Team, und nur für Teams, zu denen der Lauf
 *   tatsächlich Spiele geliefert hat.
 *
 *   ⚠ Bis zum 09.09.2026 stand im scharfen Lauf `teams: [nurTeam]` — die
 *   Mannschaft aus dem AUFRUF. Bei einem Ausfall der Spiele-Abfrage wäre
 *   das ein leerer Satz mit vollem Abgleichbereich gewesen: null Spiele
 *   geliefert, alle Beiträge dieser Mannschaft auf Entwurf. Ein halber
 *   Ausfall hätte den Spielplan abgeräumt und Erfolg gemeldet.
 *
 * Die Reihenfolge ist stabil (numerisch nach Teamnummer), damit zwei
 * Läufe dieselbe Abfolge haben und ein Protokoll vergleichbar bleibt.
 */
export function teileNachTeam(spiele: WpSpiel[]): LaufTeil[] {
  const proTeam = new Map<string, WpSpiel[]>();
  for (const s of spiele) {
    const t = String(s.sfv_team_id ?? "").trim();
    /* Ohne Teamnummer wäre der Abgleichbereich nicht bestimmbar. Das
       sollte nicht vorkommen — `bildeSpiel` setzt sie —, und genau
       deshalb wird der Fall gezählt statt geraten: `ohneTeamnummer()`. */
    if (!t) continue;
    const liste = proTeam.get(t) ?? [];
    liste.push(s);
    proTeam.set(t, liste);
  }
  return [...proTeam.entries()]
    .map(([sfv_team_id, sp]) => ({ sfv_team_id, spiele: sp }))
    .sort((a, b) => a.sfv_team_id.localeCompare(b.sfv_team_id, "de", { numeric: true }));
}

/** Spiele, die keiner Mannschaft zugeordnet werden konnten — sie gehen
    nicht hinaus. Getrennt gezählt, weil `teileNachTeam` sie schweigend
    weglässt und Schweigen hier eine Datenlage vortäuschen würde. */
export function ohneTeamnummer(spiele: WpSpiel[]): string[] {
  return spiele
    .filter((s) => !String(s.sfv_team_id ?? "").trim())
    .map((s) => String(s.sfv_match_id ?? "?"));
}

/** Eine Liste aus der Antwort des Plugins — fehlt sie, ist sie leer. */
function liste(wp: WpAntwort | null, feld: string): string[] {
  const roh = wp?.[feld];
  return Array.isArray(roh) ? roh.map((x) => String(x)) : [];
}

function zahl(wp: WpAntwort | null, feld: string): number {
  const n = Number(wp?.[feld] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Die Teile zu einem Lauf zusammenfassen.
 *
 * ⚠ EINE GESCHEITERTE MANNSCHAFT IST `fehler`, KEINE `warnung`. Der
 *   Unterschied ist nicht Geschmack: der Wächter schlägt bei
 *   `sync_status = 'fehler'` Alarm und bei `warnung` nicht. Ein Teil, der
 *   gar nicht angekommen ist, hinterlässt eine Mannschaft mit dem Stand
 *   von gestern — und das sieht auf der Website aus wie gepflegt.
 */
export function fasseLauf(teile: TeilErgebnis[]): { status: LaufStatus; zahlen: LaufZahlen } {
  const zahlen: LaufZahlen = {
    teams_gesendet: 0,
    teams_gescheitert: 0,
    spiele_gesendet: 0,
    neu: 0,
    aktualisiert: 0,
    zurueckgezogen: 0,
    uebersprungen: 0,
    verlauf_zeilen: 0,
    aufstellung_zeilen: 0,
    ohne_team: [],
    doppelte_teams: [],
    fehler: [],
    moegliche_dubletten: [],
    unbeachtete_felder: [],
  };

  for (const t of teile) {
    if (!t.wp) {
      zahlen.teams_gescheitert += 1;
      /* Die Teamnummer gehört in die Meldung — ein Teil ist gescheitert
         schickt niemanden irgendwohin. */
      zahlen.fehler.push(`Mannschaft ${t.sfv_team_id}: ${t.fehler || "unbekannter Fehler"}`);
      continue;
    }
    zahlen.teams_gesendet += 1;
    zahlen.spiele_gesendet += t.gesendet;
    /* ⚠ VEREINIGT, nicht angehaengt: derselbe Feldname kaeme sonst von
       jeder der 21 Mannschaften einmal. Eine Liste, die sich wiederholt,
       wird nicht gelesen. */
    for (const f of liste(t.wp, "unbeachtete_felder")) {
      if (!zahlen.unbeachtete_felder.includes(f)) zahlen.unbeachtete_felder.push(f);
    }
    zahlen.neu += zahl(t.wp, "neu");
    zahlen.aktualisiert += zahl(t.wp, "aktualisiert");
    zahlen.zurueckgezogen += zahl(t.wp, "zurueckgezogen");
    zahlen.uebersprungen += zahl(t.wp, "uebersprungen");
    zahlen.verlauf_zeilen += zahl(t.wp, "verlauf_zeilen");
    zahlen.aufstellung_zeilen += zahl(t.wp, "aufstellung_zeilen");
    zahlen.ohne_team.push(...liste(t.wp, "ohne_team"));
    zahlen.doppelte_teams.push(...liste(t.wp, "doppelte_teams"));
    zahlen.fehler.push(...liste(t.wp, "fehler"));
    const dubl = t.wp.moegliche_dubletten;
    if (Array.isArray(dubl)) {
      for (const d of dubl as Record<string, unknown>[]) {
        zahlen.moegliche_dubletten.push({ neu: d?.neu, von_hand: d?.von_hand });
      }
    }
  }

  const status: LaufStatus = zahlen.teams_gescheitert > 0
    ? "fehler"
    : (zahlen.fehler.length || zahlen.ohne_team.length || zahlen.doppelte_teams.length)
      ? "warnung"
      : "ok";

  zahlen.unbeachtete_felder.sort();
  return { status, zahlen };
}

/**
 * Die eine Zeile, die in `api_sync_log.meldung` und in die Kachel geht.
 *
 * ⚠ SIE NENNT DIE MANNSCHAFTEN ZUERST. Bis Etappe 4 lief der Export je
 *   Mannschaft, und 14 Spiele war eine vollständige Auskunft. Ab
 *   Etappe 5 ist sie es nicht mehr: 260 Spiele aus 20 Mannschaften sehen
 *   genauso aus wie 260 aus 21, und der Unterschied ist genau der
 *   Ausfall, den man sehen will.
 */
/**
 * Was WIR gebaut haben — die Gegenzahl zu `LaufZahlen.aufstellung_zeilen`.
 *
 * ⚠ ⚠ ZWEI ZAHLEN, WEIL EINE DIE FRAGE NICHT BEANTWORTEN KANN. Am
 * 11.09.2026 stand die Lage so: wir senden für ein Spiel 17
 * Aufstellungszeilen, WordPress meldet 270 aktualisiert, und die Seite
 * zeigt eine Zeile. Mit nur einer der beiden Zahlen bleibt offen, wo es
 * reisst — mit beiden ist es eine Ablesung:
 *
 * | gesendet | geschrieben | heisst |
 * |---|---|---|
 * | 0 | 0 | wir bauen nichts — der Fehler liegt bei uns |
 * | 17 | 0 | wir senden, drüben landet nichts — Empfänger oder Feld |
 * | 17 | 17 | beides steht; dann ist es die Anzeige |
 *
 * ⚠ Und `rollen` beantwortet die zweite Frage desselben Abends: kommt
 * `eingewechselt` bei uns überhaupt vor? Drei Zahlen, keine Person.
 */
export interface GesendeteAufstellung {
  zeilen: number;
  rollen: Record<string, number>;
}

export function laufMeldung(
  host: string, zahlen: LaufZahlen, dauerMs?: number,
  gesendet?: GesendeteAufstellung,
): string {
  /* ⚠ Die Dauer steht in der Meldung, nicht nur in den Details. Sie ist die
     Zahl, nach der beim zweiten Lauf jemand fragt („ging das schneller?"),
     und die Kachel zeigt genau diese eine Zeile. */
  const dauer = typeof dauerMs === "number" ? ` · ${Math.round(dauerMs / 1000)} s` : "";
  const zeile = `${host} · ${zahlen.teams_gesendet} Mannschaft(en) · `
    + `${zahlen.spiele_gesendet} Spiel(e)${dauer} · ${zahlen.neu} neu, `
    + `${zahlen.aktualisiert} aktualisiert, ${zahlen.zurueckgezogen} zurückgezogen, `
    + `${zahlen.verlauf_zeilen} Verlaufszeilen`
    /* ⚠ IMMER, AUCH ALS NULL — und immer beide Seiten. Genau diese Zeile
       hat am 11.09.2026 gefehlt; ohne sie war „ist die Aufstellung
       angekommen?" aus der Kachel nicht zu beantworten. */
    + ` · Aufstellung ${gesendet ? `${gesendet.zeilen} gesendet / ` : ""}`
    + `${zahlen.aufstellung_zeilen} geschrieben`;
  return zahlen.teams_gescheitert
    ? `${zeile} — ⚠ ${zahlen.teams_gescheitert} Mannschaft(en) gescheitert`
    : zeile;
}

/**
 * Was ins Protokoll darf — Zahlen, Teamnummern und Beitrags-Ids, keine
 * Texte aus der Antwort.
 *
 * ⚠ EIGENE ALLOWLIST, das Objekt wird nicht durchgereicht. Die Antwort
 * des Plugins trägt bei Dubletten den abgeleiteten Beitragstitel
 * (Team — Gegner). Der ist hier harmlos, die Regel ist es nicht: am
 * 21.08.2026 sind 903 Klarnamen ins Protokoll geraten, weil ein Objekt
 * gespreadet wurde. Was gespeichert wird, wird aufgezählt.
 *
 * ⚠ `je_team` ist die Hälfte, die ab Etappe 5 dazukommt. Eine Gesamtzahl
 * beantwortet nicht mehr, WELCHE Mannschaft nichts bekommen hat — und
 * das ist die Frage, die man beim Nachsehen stellt.
 */
export function fuersProtokoll(
  host: string, zahlen: LaufZahlen, teile: TeilErgebnis[], dauerMs?: number,
  gesendet?: GesendeteAufstellung,
): Record<string, unknown> {
  return {
    ziel_host: host,
    /* ⚠ Die gemessene Wanduhr des ganzen Laufs. Sie steht hier, damit die
       Sperrfrist (SPERRE_MINUTEN) beim naechsten Mal gegen eine Messung
       gehalten werden kann statt gegen eine Meinung. */
    dauer_ms: dauerMs ?? null,
    teams: teile.map((t) => t.sfv_team_id),
    je_team: teile.map((t) => ({
      team: t.sfv_team_id,
      gesendet: t.gesendet,
      dauer_ms: t.dauer_ms ?? null,
      neu: zahl(t.wp, "neu"),
      aktualisiert: zahl(t.wp, "aktualisiert"),
      zurueckgezogen: zahl(t.wp, "zurueckgezogen"),
      aufstellung_zeilen: zahl(t.wp, "aufstellung_zeilen"),
      gescheitert: t.wp === null,
    })),
    teams_gesendet: zahlen.teams_gesendet,
    teams_gescheitert: zahlen.teams_gescheitert,
    gesendet: zahlen.spiele_gesendet,
    neu: zahlen.neu,
    aktualisiert: zahlen.aktualisiert,
    zurueckgezogen: zahlen.zurueckgezogen,
    uebersprungen: zahlen.uebersprungen,
    verlauf_zeilen: zahlen.verlauf_zeilen,
    /* ⚠ Beide Seiten, beide immer da. Siehe GesendeteAufstellung. */
    aufstellung_zeilen: zahlen.aufstellung_zeilen,
    gesendete_aufstellung_zeilen: gesendet?.zeilen ?? null,
    gesendete_rollen: gesendet?.rollen ?? null,
    ohne_team: zahlen.ohne_team,
    doppelte_teams: zahlen.doppelte_teams,
    moegliche_dubletten: zahlen.moegliche_dubletten,
    fehler: zahlen.fehler,

    /* ── Die Feldbefunde der Gegenstelle ────────────────────────────
       ⚠ ⚠  SIE FEHLTEN HIER, UND DAS WAR DER GRUND, WARUM SEIT STUNDEN
             NIEMAND SEHEN KONNTE, WAS DRUEBEN ANKOMMT.

       WordPress meldet sie in jeder Antwort — `unbeachtete_felder`
       seit 0.7.0, `ohne_feldschluessel` und `feld_mehrdeutig` seit
       0.9.8/0.9.9. Diese Allowlist hat sie weggeschnitten, und damit
       stand die einzige Auskunft, die „ist das Feld angekommen?"
       beantwortet, in keinem Protokoll.

       ⚠ Es ist der dritte Fall derselben Klasse an einem Tag: der
       Zaehler war da, der Melder war da — nur der Weg nach draussen
       fehlte. **Ein Melder, den niemand abholt, ist selbst die Luecke.**

       ⚠ Und sie sind unbedenklich: es sind FELDNAMEN, keine Werte und
       keine Personen. Die Allowlist ist gegen Klarnamen gebaut, nicht
       gegen Diagnose. */
    unbeachtete_felder: sammleNamen(teile, "unbeachtete_felder"),
    ohne_feldschluessel: sammleNamen(teile, "ohne_feldschluessel"),
    /* Ein Objekt Name → Kandidaten; hier genuegen die Namen. */
    feld_mehrdeutig: sammleSchluessel(teile, "feld_mehrdeutig"),
  };
}

/** Namen aus einer Liste in allen Teil-Antworten, entdoppelt und sortiert. */
function sammleNamen(teile: TeilErgebnis[], feld: string): string[] {
  const raus = new Set<string>();
  for (const t of teile) {
    const w = (t.wp as Record<string, unknown> | null)?.[feld];
    if (Array.isArray(w)) for (const n of w) raus.add(String(n));
  }
  return [...raus].sort();
}

/** Schluessel eines Objekts in allen Teil-Antworten. */
function sammleSchluessel(teile: TeilErgebnis[], feld: string): string[] {
  const raus = new Set<string>();
  for (const t of teile) {
    const w = (t.wp as Record<string, unknown> | null)?.[feld];
    if (w && typeof w === "object" && !Array.isArray(w)) {
      for (const n of Object.keys(w)) raus.add(n);
    }
  }
  return [...raus].sort();
}
