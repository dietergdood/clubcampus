/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-php.mjs

   Syntaxprüfung für die PHP-Dateien unter `wordpress/`.

     node scripts/check-php.mjs

   ⚠ WARUM ES DAS GIBT. `docs/plan_wordpress_spieldaten.md` §12 sagt über
   die WordPress-Seite: „dort gibt es keinen Typecheck, keine Testkette und
   keinen Compiler. Was dort steht, prüft niemand ausser einem Menschen."

   Das stimmte, und es musste nicht stimmen: `php -l` ist da, kostet nichts
   und findet die eine Fehlerklasse, die sonst erst auf der laufenden
   Website auffällt — und zwar als weisse Seite.

   ⚠ WAS SIE NICHT KANN, und das gehört danebengeschrieben, weil sie sonst
   mehr verspricht als sie hält:

     findet      Syntaxfehler — fehlende Klammer, Semikolon, Tippfehler
     findet NICHT ob eine WordPress-Funktion existiert
                 ob ein Hook zum richtigen Zeitpunkt feuert
                 ob ein ACF-Feldname stimmt
                 ob die Logik richtig ist

   **Ein grüner Lauf heisst „es parst", nicht „es funktioniert".** Der
   Mensch aus §12 bleibt zuständig; ihm ist nur eine Fehlerklasse
   abgenommen.

   ── PHP FEHLT? DANN DOCKER. UND WENN AUCH DER FEHLT: ROT ──────────
   Ein Prüfmittel, das ohne sein Werkzeug stillschweigend „ok" sagt, ist
   schlimmer als keines: es beruhigt.

   ⚠ Ein Prüfmittel, das dauerhaft rot steht, ist aber genauso wertlos —
   „rot ist ein Zustand für Stunden, nicht für Wochen" (`CLAUDE.md`). Auf
   einem Windows-Rechner ohne PHP wäre genau das der Fall, und nach der
   dritten roten Zeile schaut niemand mehr hin.

   Deshalb drei Stufen statt zwei: **php · sonst Docker · sonst rot.**
   Der Docker-Weg PRÜFT wirklich, er überspringt nicht — der Unterschied
   ist der ganze Punkt. In der Prüfkette ist PHP auf `ubuntu-latest`
   vorinstalliert, dort greift die erste Stufe.
   ═══════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDNER = join(WURZEL, "wordpress");

if (!existsSync(ORDNER)) {
  console.log("check-php: kein Ordner wordpress/ — nichts zu prüfen.");
  process.exit(0);
}

const dateien = readdirSync(ORDNER).filter(n => n.endsWith(".php"));
if (dateien.length === 0) {
  console.log("check-php: keine PHP-Dateien in wordpress/ — nichts zu prüfen.");
  process.exit(0);
}

/* Ist php da? `php -v` statt `which`: unter Windows heisst es php.exe, und
   ein Aufrufversuch beantwortet die Frage in beiden Welten gleich. */
let phpDa = true;
try {
  execFileSync("php", ["-v"], { stdio: "ignore" });
} catch {
  phpDa = false;
}

/* Stufe 2: Docker. Prüft wirklich — nur eben in einem Container. */
let dockerDa = false;
if (!phpDa) {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
    dockerDa = true;
  } catch {
    dockerDa = false;
  }
}

if (!phpDa && !dockerDa) {
  console.error("check-php: weder PHP noch Docker gefunden — die Dateien sind UNGEPRUEFT.\n");
  console.error("  PHP installieren, oder Docker starten. Von Hand:\n");
  console.error('    docker run --rm -v "/$(pwd)/wordpress":/w php:8.2-cli \\');
  console.error('      sh -c "for f in /w/*.php; do php -l \\$f; done"\n');
  console.error("  ⚠ Nicht übergehen: ein Syntaxfehler in einem mu-plugin");
  console.error("    ergibt auf der Website eine weisse Seite, kein Backend.");
  process.exit(1);
}

/** Eine Datei prüfen — direkt oder im Container, gleiche Rückgabe.
 *
 * ⚠ Der Container bekommt den INHALT über stdin, nicht die Datei über einen
 *   Mount. Der erste Versuch mountete `wordpress/` und scheiterte an der
 *   Windows-Laufwerksangabe: aus `C:/…` wird `-v /C:/…:/w`, und Docker liest
 *   den Doppelpunkt als Trennzeichen („invalid mode: /w"). Ein Pfad, der
 *   plattformabhängig übersetzt werden muss, ist eine Fehlerquelle, die man
 *   sich schenken kann — `php -l` liest ohne Dateiargument von stdin.
 *
 *   Preis: die Meldung des Containers sagt „on line N" ohne Dateinamen. Den
 *   setzen wir selbst davor, er ist ja bekannt.
 */
function pruefe(name) {
  if (phpDa) {
    return execFileSync("php", ["-l", join(ORDNER, name)], { stdio: "pipe" });
  }
  return execFileSync(
    "docker",
    ["run", "--rm", "-i", "php:8.2-cli", "php", "-l"],
    { input: readFileSync(join(ORDNER, name)), stdio: "pipe" }
  );
}

const befunde = [];
for (const name of dateien) {
  try {
    pruefe(name);
  } catch (e) {
    /* ⚠ Gebunden, nicht verschluckt: `php -l` schreibt die Fehlerzeile nach
       stdout, nicht nach stderr. Wer nur `e.message` nimmt, bekommt
       „Command failed" und verliert die Fundstelle. */
    const text = [e.stdout?.toString() ?? "", e.stderr?.toString() ?? ""]
      .join("\n").trim();
    befunde.push({ name, text: text || String(e.message) });
  }
}

if (befunde.length === 0) {
  console.log(`check-php: ${dateien.length} Datei(en) geprueft${phpDa ? "" : " (ueber Docker)"} — keine Syntaxfehler.`);
  console.log("           ⚠ Das heisst: es parst. Nicht: es funktioniert.");
  process.exit(0);
}

console.error(`check-php: ${befunde.length} Datei(en) mit Syntaxfehlern.\n`);
for (const b of befunde) {
  console.error(`  wordpress/${b.name}`);
  console.error(`    ${b.text.replace(/\n/g, "\n    ")}\n`);
}
process.exit(1);
