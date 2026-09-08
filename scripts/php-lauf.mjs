/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/php-lauf.mjs

   Die eine Stelle, an der entschieden wird, WIE PHP läuft:
   **php · sonst Docker · sonst rot.**

   ⚠ WARUM ES DIESE DATEI GIBT. Am 08.09.2026 kam mit
   `check-plugin.mjs` ein zweites Skript dazu, das PHP braucht. Zwei
   Kopien derselben Leiter wären zwei Orte für eine Aussage — und der
   zweite wird nicht nachgezogen: ein Versionssprung des Bildes, eine
   geänderte Meldung, und die beiden Skripte prüfen verschieden, ohne
   dass etwas fehlschlägt.

   ⚠ EIN PRÜFMITTEL, DAS OHNE SEIN WERKZEUG „ok" SAGT, IST SCHLIMMER
   ALS KEINES: es beruhigt. Deshalb gibt es hier keine Stufe
   „überspringen". Fehlt beides, meldet der Aufrufer rot — mit der
   Anleitung, wie man es von Hand nachholt.

   ── GRENZE ───────────────────────────────────────────────────────
   Diese Datei entscheidet nur, WO php läuft. Was geprüft wird, steht
   im Aufrufer. `php -l` prüft Syntax, `php -r` führt aus — beides sagt
   nichts darüber, ob WordPress-Funktionen existieren oder Hooks zur
   richtigen Zeit feuern.
   ═══════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";

/* Das Bild steht hier und nur hier. */
export const PHP_BILD = "php:8.2-cli";

function vorhanden(befehl, args) {
  try { execFileSync(befehl, args, { stdio: "ignore" }); return true; } catch { return false; }
}

/* `php -v` statt `which`: unter Windows heisst es php.exe, und ein
   Aufrufversuch beantwortet die Frage in beiden Welten gleich. */
export const phpDa = vorhanden("php", ["-v"]);
export const dockerDa = phpDa ? false : vorhanden("docker", ["info"]);

export const werkzeugDa = phpDa || dockerDa;
export const wieGelaufen = phpDa ? "" : " (ueber Docker)";

/**
 * PHP aufrufen — direkt oder im Container, gleiche Rückgabe.
 *
 * ⚠ Der Container bekommt seine Eingabe über STDIN, nicht über einen Mount.
 *   Der erste Versuch mountete und scheiterte an der Windows-Laufwerksangabe:
 *   aus `C:/…` wird `-v /C:/…:/w`, und Docker liest den Doppelpunkt als
 *   Trennzeichen („invalid mode: /w"). Ein Pfad, der plattformabhängig
 *   übersetzt werden muss, ist eine Fehlerquelle, die man sich schenken kann.
 *
 * ⚠ Deshalb nimmt auch `check-plugin.mjs` den Quelltext über stdin und
 *   nicht über einen Dateinamen — der Container sieht das Projekt nicht.
 */
export function phpLauf(args, eingabe) {
  if (phpDa) {
    return execFileSync("php", args, { input: eingabe, stdio: "pipe" }).toString();
  }
  return execFileSync(
    "docker",
    ["run", "--rm", "-i", PHP_BILD, "php", ...args],
    { input: eingabe, stdio: "pipe" },
  ).toString();
}

/** Die Meldung, wenn weder php noch Docker da ist. Ein Text, ein Ort. */
export function fehltMeldung(name) {
  return [
    `${name}: weder PHP noch Docker gefunden — die Dateien sind UNGEPRUEFT.`,
    "",
    "  PHP installieren, oder Docker starten.",
    "",
    "  ⚠ Nicht übergehen: ein Syntaxfehler in einem mu-plugin ergibt auf",
    "    der Website eine weisse Seite, kein Backend.",
  ].join("\n");
}
