// ClubCampus — src/domains/sfv/protokollStatus.ts
//
// Die Statuswerte von `api_sync_log.status`, an EINER Stelle.
//
// ⚠ WARUM ES DIESE DATEI GIBT. Der Wert stand als Zeichenkette an drei
//   Stellen in `index.ts` — und eine vierte in einem Test, der ihn im
//   Quelltext suchte. Vier Kopien desselben Werts, und keine wusste von
//   den anderen.
//
// ⚠ UND DER ANLASS WAR EIN FEHLALARM, KEIN FEHLER: `npm run check:quotes`
//   meldete `"laeuft"` als Umlaut-Ersatzschreibung in einem Text. Das ist
//   es nicht — es ist ein DATENBANKWERT, und der heisst so, weil in einer
//   Spalte kein Umlaut steht.
//
//   Die Prüfung liess sich nicht sinnvoll aufweichen: ihre Ausnahme für
//   Entwicklertext um `toContain` zu erweitern hätte auch echte Fälle
//   verdeckt (`expect(x).toContain("Fehler beim Loeschen")` prüft sehr
//   wohl Anzeigetext). **Eine Prüfung, die man breiter macht, damit sie
//   schweigt, ist danach für den echten Fall taub.**
//
//   Also die andere Richtung: den Wert einmal benennen. Danach steht in
//   `src/` keine Ersatzschreibung mehr, die Prüfung bleibt scharf, und
//   der Wert hat nebenbei die Quelle, die ihm ohnehin fehlte.

/**
 * ⚠ `LAEUFT` heisst NICHT „läuft gerade".
 *
 * Die Zeile wird VOR dem ersten Abruf geschrieben und am Ende
 * überschrieben. Bleibt sie stehen, ist der Lauf **gestorben** — älter
 * als die Laufsperre (15 Minuten) ist der Beleg dafür.
 *
 * Derselbe Satz steht als Spaltenkommentar in der Datenbank: wer die
 * Tabelle im SQL-Editor liest, hat den Code nicht daneben.
 */
export const LAUF_LAEUFT = "laeuft";
export const LAUF_OK = "ok";
export const LAUF_WARNUNG = "warnung";
export const LAUF_FEHLER = "fehler";

/** Die Aktionen, die eine Zeile schreiben. Leseproben stehen nicht hier. */
export const AKTION_SYNC = "sync";
export const AKTION_NAMEN = "namen";
export const AKTION_WECHSELNACHTRAG = "wechselnachtrag";
/**
 * Der WordPress-Export.
 *
 * ⚠ ⚠  ER HAT DIE SPALTE BIS ZUM 11.09.2026 LEER GELASSEN. Die Spalte
 *       kam am 10.09.2026 dazu (`migration_api_sync_log_aktion.sql`) —
 *       eingetragen wurde sie nur in `sfv-sync`, und `wp-export` blieb
 *       stehen.
 *
 *   Folge: eine Abfrage `where aktion = 'export'` fand **nichts**,
 *   obwohl vier Laeufe protokolliert waren. **Das Fehlen wurde als
 *   Aussage gelesen — „es hat kein Lauf stattgefunden".**
 *
 *   ⚠ Fuenfter Fall derselben Klasse an zwei Tagen, und diesmal in
 *   unserer eigenen Protokollspalte. Die Spalte wurde ausdruecklich
 *   angelegt, damit niemand mehr ableiten muss, welcher Lauf es war —
 *   und dann hat der zweite Schreiber sie nicht gefuellt.
 *
 * **Wer eine Spalte anlegt, nennt ALLE Stellen, die sie fuellen.**
 */
export const AKTION_EXPORT = "export";
