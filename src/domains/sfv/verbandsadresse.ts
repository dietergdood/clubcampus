/* ══════════════════════════════════════════════════════════════════════
   Verbandsadressen aus blossen Zahlen — die Haelfte, die Deno lesen kann
   25.09.2026

   ⚠ ⚠  WARUM ES DIESE DATEI GIBT, UND WARUM SIE KEIN ZWEITER LINKBAUER IST.

   `verbandslink.ts` daneben ist die Schicht, die `vereine` kennt: sie
   nimmt eine `Verbandskennung` und holt dafuer `Tables<"vereine">` aus
   `src/types.ts`. Genau dieser Import macht sie fuer eine Edge Function
   unbrauchbar — `types.ts` nennt den React-Namensraum, und `deno check`
   bricht mit `TS2503 Cannot find namespace 'React'` ab. Gemessen beim
   ersten Lauf der Pruefkette nach dem Anschluss.

   Der Spielbericht braucht `vereine` ueberhaupt nicht: nur `tg`. Also
   liegt er hier, in einer Datei ohne einen einzigen Typ-Import — und
   `verbandslink.ts` reicht ihn weiter, damit es fuer den Browser bei
   EINER Anlaufstelle bleibt.

   > Wo eine Zusage in einer Datei steht, die `tsc` oder `deno` nicht
   > lesen kann, gehoert sie in eine eigene Datei, die beide Welten lesen.

   Dieselbe Bauart und derselbe Grund wie bei `ergebnisTypen.ts`
   (21.08.2026) — dort war es eine Form, hier eine Adresse.

   ⚠ Es ist ausdruecklich KEINE Kopie: `verbandsLinkSpiel` steht genau
   einmal, hier. Eine zweite Fassung im Export waere die Doppelung, die
   in diesem Projekt verlaesslich auseinanderlaeuft.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Eine Zahl, die wirklich eine ist.
 *
 * ⚠ ⚠  `Number(null)` IST 0, UND 0 IST ENDLICH. Ein blosses
 * `Number.isFinite(Number(x))` haelt eine fehlende Angabe fuer die Zahl
 * Null — und dann entstuende ein Link mit `v=0` oder `tg=0`, der auf eine
 * fremde oder leere Seite fuehrt. Genau die Einebnung, die dieses Papier
 * an einem Dutzend Stellen fuehrt: ein fehlender Wert und die Zahl Null
 * sehen gleich aus.
 *
 * Gefangen hat es der eigene Testfall, nicht der Compiler.
 */
export function zahl(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Der Spielbericht beim Verband — die Seite, auf der das Matchblatt steht.
 *
 * ⚠ ⚠  `v=253` IST HIER DIE ANSICHT, NICHT DER VEREIN. In
 *       `verbandsLinkTeam()` traegt derselbe Parameter die ClubId (1516).
 *       Zwei Adressen desselben Servers, derselbe Buchstabe, zwei
 *       Bedeutungen — wer die eine aus der anderen ableitet, baut einen
 *       Link auf einen fremden Verein.
 *
 *       Die 253 ist deshalb eine Konstante der ANSICHT und kommt
 *       ausdruecklich nicht aus `vereine`. Ein Spielbericht braucht weder
 *       Club noch Verband: nur `tg`.
 *
 * ⚠ `tg` ist `spiele.sfv_match_id` (7-stellig, aus `matchId`) und NICHT
 *   `sfv_spiel_nr` (6-stellig, aus `matchNumber`). Belegt am 25.08.2026:
 *   die Seite zu `tg=4393132` zeigte unser Spiel vom 23.08.2026, und die
 *   dort genannte „Spielnummer: 177238" ist unsere `sfv_spiel_nr`. Die
 *   zwei laufen innerhalb einer Gruppe parallel hoch und sehen deshalb
 *   verwandt aus; in `tg=` funktioniert nur die erste.
 *
 * ⚠ `null` statt eines halben Links — eine Adresse ohne `tg` fuehrt auf
 *   eine leere Seite, und die sieht aus wie ein Defekt unserer Seite.
 *
 * ⚠ Ein serverseitiger Abruf dieser Adresse bekommt **403** (gemessen
 *   25.08.2026). Sie ist fuer Menschen, nicht fuer Maschinen.
 */
export function verbandsLinkSpiel(
  sfvMatchId: number | string | null | undefined,
): string | null {
  const id = zahl(sfvMatchId);
  if (id === null) return null;
  return `https://matchcenter.fvrz.ch/default.aspx?lng=1&cxxlnus=1&v=253&a=tg&tg=${id}&bn=0`;
}
