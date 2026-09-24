/* ══════════════════════════════════════════════════════════════════════
   Das Zeitbudget des Spiele-Laufs — und die Reihenfolge der Mannschaften

   ⚠ ⚠  DIESE DATEI IMPORTIERT NICHTS VON esm.sh, UND DAS IST DER GRUND,
   WARUM ES SIE GIBT.

   `index.ts` zieht `createClient` von esm.sh und ist damit aus vitest
   nicht ladbar. Was eine ZUSAGE traegt, gehoert deshalb hierher — in eine
   Datei, die `deno check` UND vitest lesen. Dieselbe Stelle und dieselbe
   Begruendung wie `sfv-sync/ergebnisTypen.ts`:

     > Die Unmoeglichkeit, etwas zu pruefen, erzeugt dasselbe Bild wie die
     > gepruefte Richtigkeit: eine gruene Kette.

   ── WOFUER ─────────────────────────────────────────────────────────────

   Bis zum 24.09.2026 hatte der Spiele-Lauf KEIN Zeitbudget. Das Gateway
   von Supabase bricht nach 150 Sekunden ab (`IDLE_TIMEOUT`, gemessen am
   24.09.2026), und ein getoeteter Worker fuehrt kein `finally` aus:

     · die Protokollzeile bleibt auf `laeuft` stehen — ihr Ergebnis fehlt
       endgueltig, nicht bloss ungesehen
     · `api_verbindungen.sync_laeuft_seit` bleibt gesetzt und sperrt den
       naechsten Lauf, bis die Frist abgelaufen ist

   **Ein Lauf, der abgebrochen wird, hat kein Ergebnis** — und genau das
   ist die Zusage, die hier gehalten wird: der Lauf hoert von SELBST auf,
   bevor die Grenze kommt, schreibt sein Ergebnis und gibt die Sperre frei.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Was das Gateway zulaesst.
 *
 * ⚠ GEMESSEN, nicht aus einer Doku abgeschrieben: am 24.09.2026 kam beim
 * ersten Lauf mit allen Wappen woertlich
 * `{"code":"IDLE_TIMEOUT","message":"Request idle timeout limit (150s)
 * reached"}` im Browser an.
 *
 * ⚠ Und die Uhr laeuft ab der ANFRAGE, nicht ab dem Beginn einer
 * Teilaufgabe. Jede Rechnung, die spaeter anfaengt, ist um die Zeit davor
 * zu grosszuegig — deshalb bekommen alle Budgets denselben Nullpunkt
 * (`anfrageBeginnMs` in `index.ts`).
 */
export const GATEWAY_MS = 150_000;

/**
 * Wie lange die Teile-Schleife neue Mannschaften anfangen darf.
 *
 * ⚠ ⚠  DIE ZAHL IST EINE AUFTEILUNG, KEINE SCHAETZUNG — und sie muss
 * aufgehen. Eine Aufteilung, die aufgehen muss, prueft sich selbst; eine
 * einzelne Zahl kann nur behauptet werden.
 *
 *     90_000  diese Schleife darf neue Mannschaften anfangen
 *   + 30_000  die Mannschaft, die beim Ablauf schon laeuft (EIN_TEIL)
 *   + 30_000  Ranglisten-POST, Abschluss-Update, Nachtrag, Antwort
 *   ────────
 *    150_000  = GATEWAY_MS
 *
 * ⚠ 90_000 ist DIESELBE Marke wie `WAPPEN_BUDGET_MS`, und das ist kein
 * Zufall, sondern eine Rangfolge: beide Budgets zaehlen ab derselben
 * Anfrage, also sind es zwei Marken auf EINER Uhr und keine Summe. Braucht
 * die Spiele-Schleife das ganze Fenster, gehen in diesem Lauf keine Wappen
 * hinaus — **der Spielplan geht vor, ein Wappen ist ein Bild.** Dass es so
 * ist, steht als `wappen_offen` in der Antwort und im Protokoll, statt
 * still zu geschehen.
 *
 * ⚠ ⚠  WAS DARAN GEMESSEN IST UND WAS NICHT, damit niemand mehr erwartet:
 * gemessen sind die 150 Sekunden. Gemessen ist ausserdem (Commit 8e2fc6b,
 * 24.09.2026), dass die Protokollzeile des Spiele-Laufs ihr Ergebnis
 * bekam — er war also VOR dem Wappenblock fertig und lag unter dieser
 * Marke. **Ungemessen ist, wie lange EINE Mannschaft braucht.** Die
 * Aufteilung oben ist deshalb eine erste Fassung, und `offen_teams` ueber
 * mehrere Laeufe ist die einzige Auskunft darueber, ob sie stimmt: bleibt
 * die Liste ueber Laeufe hinweg gefuellt, ist das Budget zu klein — und
 * dann gehoert es korrigiert und nicht geraten.
 */
export const EXPORT_BUDGET_MS = 90_000;

/**
 * Was die Mannschaft bekommt, die beim Ablauf des Budgets schon laeuft.
 *
 * ⚠ Die Pruefung steht VOR dem POST — eine Mannschaft, die gestartet ist,
 * laeuft zu Ende. Das ist Absicht und keine Nachlaessigkeit: **die Grenze
 * verlaeuft ZWISCHEN Mannschaften, nie innerhalb einer.** Der Empfaenger
 * setzt jedes Spiel einer gelieferten Mannschaft auf `draft`, das nicht in
 * der Nutzlast steht — eine halb gesendete Mannschaft loeschte drueben den
 * halben Spielplan.
 *
 * ⚠ 30 Sekunden sind NICHT gemessen. Sie sind die Groessenordnung, in der
 * PHP sein eigenes Zeitlimit hat; eine Mannschaft, die laenger braucht,
 * ist bereits ein Befund und kein Normalfall. Steht sie je in
 * `details.je_team[].dauer_ms`, gehoert diese Zahl dagegen gehalten.
 */
export const EIN_TEIL_RESERVE_MS = 30_000;

/**
 * Was nach der letzten Mannschaft noch geschehen muss.
 *
 * Ranglisten-POST, das Abschluss-`update` auf `api_sync_log`, das
 * `update` auf `api_verbindungen`, der Protokoll-Nachtrag und die Antwort.
 *
 * ⚠ Der Wappenblock steht NICHT in dieser Reserve: er hat sein eigenes
 * Budget auf derselben Uhr und faellt von selbst aus, wenn die Zeit
 * verbraucht ist.
 */
export const ABSCHLUSS_RESERVE_MS = 30_000;

/** Ein Teil des Laufs, soweit die Reihenfolge ihn kennen muss. */
export interface TeilMitTeam { sfv_team_id: string }

/**
 * Die Mannschaften, die der letzte Lauf nicht mehr geschafft hat, nach
 * vorn — der Rest behaelt seine Reihenfolge.
 *
 * ⚠ ⚠  OHNE DAS WAERE DAS BUDGET EIN DAUERHAFTER BLINDER FLECK, UND ZWAR
 * EIN SCHLIMMERER ALS DER ABBRUCH.
 *
 * `teileNachTeam()` sortiert stabil nach Teamnummer. Schneidet das Budget
 * bei Mannschaft 12, faengt der naechste Lauf wieder bei 1 an und
 * schneidet an derselben Stelle — die Mannschaften 13 bis 21 gingen NIE
 * hinaus. Auf der Website staende fuer sie dauerhaft der Stand von
 * damals, und nichts sagte warum: **ein Ausfall in der Verkleidung einer
 * Datenlage.**
 *
 * ⚠ Die Nutzlast je Mannschaft bleibt dabei unangetastet. Umgeordnet wird
 * die REIHENFOLGE der POSTs, nicht ihr Inhalt — jeder POST traegt
 * weiterhin genau eine Mannschaft mit allen ihren Spielen, und damit
 * bleibt der Abgleichbereich der Gegenstelle so gross wie der Teil selbst.
 *
 * ⚠ Sie verliert und verdoppelt nichts: was nicht in `offen` steht, bleibt
 * hinten stehen, und eine Nummer aus `offen`, die es nicht mehr gibt
 * (Mannschaft abgemeldet), faellt schlicht weg. Beides haelt ein Fall
 * fest, nicht dieser Kommentar.
 */
export function ordneOffeneNachVorn<T extends TeilMitTeam>(
  teile: readonly T[], offen: readonly string[],
): T[] {
  if (!offen.length) return [...teile];
  const menge = new Set(offen.map((t) => String(t)));
  const vorn: T[] = [];
  const rest: T[] = [];
  for (const t of teile) (menge.has(t.sfv_team_id) ? vorn : rest).push(t);
  return [...vorn, ...rest];
}

/**
 * Die Liste der offenen Mannschaften aus dem `details` eines frueheren
 * Laufs — als Fremddaten gelesen, nicht als Typ geglaubt.
 *
 * ⚠ Sie kommt aus einer jsonb-Spalte, die aelter sein kann als dieses
 * Feld. Ein `details.offen_teams as string[]` waere eine Behauptung ueber
 * eine Zeile, die vor dem 24.09.2026 geschrieben wurde — und die trug das
 * Feld nicht.
 */
export function leseOffeneTeams(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  const roh = (details as Record<string, unknown>).offen_teams;
  if (!Array.isArray(roh)) return [];
  return roh.map((x) => String(x)).filter((x) => x.length > 0);
}
