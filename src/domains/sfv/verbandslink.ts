/* ═══════════════════════════════════════════════════════════════════
   Der Link zur Verbandsseite — und der Satz daneben.

   ⚠ ⚠  ANLASS, 14.09.2026, gemessen. 21 von 42 Mannschaften haben keinen
   Spielplan: sie spielen in Turnierform, `/api/team/list` gibt nur
   Mannschaften MIT Rangliste heraus, und der Spielplan-Endpunkt liefert
   ihre Spiele gar nicht (`zeilen_ohne_bekannte_mannschaft = 0`).

   **Es ist ein Quellenproblem, kein Filterproblem.** Bei uns ist nichts
   zu reparieren — und genau deshalb braucht es einen Satz.

   > Eine Mannschaftsseite ohne Spielplan sieht aus wie eine, bei der
   > etwas kaputt ist. Genau diese Ununterscheidbarkeit kostet hier
   > regelmässig die meiste Zeit.

   ── WARUM DER LINK EINE SPALTE BRAUCHT ──────────────────────────────

   `v=` ist die ClubId, `oid=` der Regionalverband. Die ClubId stand bis
   zum 14.09.2026 **nur im Secret** `SFV_CLUB_ID` — ein Secret gilt
   projektweit, und projektweit gibt es genau einen Wert. Seither liegen
   beide als Spalten an `vereine` (`migration_vereine_verbandskennung.sql`).

   ⚠ `sfv_club_id` (1516) ist NICHT `sfv_club_nummer` (11057). Beide sehen
   nach „Vereinsnummer" aus und sind es in verschiedenen Systemen.
   ═══════════════════════════════════════════════════════════════════ */

import type { Tables } from "../../types.ts";

/**
 * Eine Zahl, die wirklich eine ist.
 *
 * ⚠ ⚠  `Number(null)` IST 0, UND 0 IST ENDLICH. Ein blosses
 * `Number.isFinite(Number(x))` hält eine fehlende Angabe für die Zahl Null
 * — und dann entstünde ein Link mit `v=0`, der auf eine fremde oder leere
 * Seite führt. Genau die Einebnung, die dieses Papier an einem Dutzend
 * Stellen führt: ein fehlender Wert und die Zahl Null sehen gleich aus.
 *
 * Gefangen hat es der eigene Testfall, nicht der Compiler.
 */
function zahl(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Was der Link braucht — aus `vereine`, nicht aus einem Secret.
 *
 * ⚠ Ein `Pick` auf die Tabelle, kein eigenes Interface. Bis zum
 * 14.09.2026 stand hier eine handgeschriebene Fassung, **weil es die
 * Spalten noch nicht gab** — seit der Migration gibt es sie, und damit
 * fällt der Grund weg. Ein handgeschriebenes Interface mit denselben
 * Feldern läuft still auseinander, sobald der Basistyp sich ändert.
 */
export type Verbandskennung = Partial<
  Pick<Tables<"vereine">, "sfv_club_id" | "sfv_verband_oid">
>;

/**
 * Die Adresse der Mannschaftsseite beim Verband.
 *
 * ⚠ `null`, wenn eine der drei Angaben fehlt — **kein halber Link**. Eine
 * Adresse mit fehlendem `v=` führt auf eine fremde oder leere Seite, und
 * das wäre schlimmer als kein Link: ein Link, der ins Leere führt, sieht
 * aus wie ein Defekt unserer Seite.
 */
export function verbandsLinkTeam(
  v: Verbandskennung | null | undefined, sfvTeamId: number | null | undefined,
): string | null {
  const club = zahl(v?.sfv_club_id);
  const oid = zahl(v?.sfv_verband_oid);
  const team = zahl(sfvTeamId);
  if (club === null || oid === null || team === null) return null;
  return `https://matchcenter.fvrz.ch/default.aspx?v=${club}&oid=${oid}`
    + `&lng=1&t=${team}&a=trr`;
}

/**
 * Die Vereinsseite beim Verband — für Mannschaften **ohne** Nummer.
 *
 * ⚠ Sie ist der einzige Link, den es für die 21 gibt: eine Teamadresse
 * braucht `t=<teamId>`, und die haben sie nicht. Von der Vereinsseite aus
 * findet ein Mensch die Turniere; eine Maschine nicht.
 */
export function verbandsLinkVerein(v: Verbandskennung | null | undefined): string | null {
  const club = zahl(v?.sfv_club_id);
  const oid = zahl(v?.sfv_verband_oid);
  if (club === null || oid === null) return null;
  return `https://matchcenter.fvrz.ch/default.aspx?v=${club}&oid=${oid}&lng=1`;
}

/**
 * Warum diese Mannschaft keinen Spielplan hat — in einem Satz.
 *
 * ⚠ ⚠  DREI LAGEN, UND KEINE DARF WIE EINE ANDERE AUSSEHEN:
 *
 * | | heisst |
 * |---|---|
 * | keine `sfv_team_id` | der Verband führt sie nicht über die Schnittstelle — **das ist der Normalfall bei Turnierform** |
 * | Nummer da, keine Spiele | die Zuordnung steht, der Verband liefert trotzdem nichts — das ist ein Befund |
 * | Nummer da, Spiele da | nichts zu sagen |
 *
 * Die zweite als die erste auszugeben wäre die Einebnung, die dieses
 * Projekt an einem Dutzend Stellen teuer bezahlt hat.
 */
export function spielplanHinweis(
  sfvTeamId: number | null | undefined, anzahlSpiele: number,
  v: Verbandskennung | null | undefined,
): { satz: string; link: string | null } | null {
  if (anzahlSpiele > 0) return null;

  if (sfvTeamId == null) {
    return {
      satz: "Diese Mannschaft spielt in Turnierform. Der Verband führt ihren "
        + "Spielplan nicht über die Schnittstelle — er steht nur auf seiner "
        + "eigenen Website.",
      link: verbandsLinkVerein(v),
    };
  }

  return {
    /* ⚠ Ein anderer Satz, weil es eine andere Lage ist: hier IST die
       Mannschaft zugeordnet, und der Verband liefert trotzdem nichts.
       Das ist erklärungsbedürftig, nicht normal. */
    satz: "Für diese Mannschaft ist beim Verband kein Spiel eingetragen. "
      + "Die Zuordnung steht — es liegt also nicht an einer fehlenden "
      + "Verbandsnummer.",
    link: verbandsLinkTeam(v, sfvTeamId),
  };
}
