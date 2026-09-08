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

   ── ⚠ GRENZE — ABSICHTLICH ENG, NICHT UNFERTIG ───────────────
   Damit sie niemand später „vereinheitlicht" und dabei kaputtmacht
   (Didi, 08.09.2026):

     · **Nur `php -l`, nur Syntax.** Inhaltliche Prüfungen am Plugin
       stehen in `check-plugin.mjs` und benutzen den PHP-TOKENIZER.
       Die zwei nicht zusammenlegen: `php -l` sagt über JEDE Datei
       etwas, `check-plugin` kennt genau eine und ihre Regeln.
     · **Nur `wordpress/`.** Nicht auf `src/` ausdehnen — dort ist
       kein PHP.
     · **Kein Überspringen.** Die Leiter php → Docker → ROT steht in
       `php-lauf.mjs` und ist der ganze Punkt: ein Prüfmittel, das
       ohne sein Werkzeug „ok" sagt, beruhigt, statt zu prüfen.

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
/* ⚠ Die Leiter php → Docker → rot steht an EINER Stelle. Seit dem
   08.09.2026 braucht sie ein zweites Skript (check-plugin.mjs); zwei
   Kopien liefen still auseinander. */
import { werkzeugDa, wieGelaufen, phpLauf, fehltMeldung } from "./php-lauf.mjs";
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

if (!werkzeugDa) {
  console.error(fehltMeldung("check-php"));
  process.exit(1);
}

/** Eine Datei prüfen. Über stdin, damit der Container keinen Mount braucht.
 *
 *  Preis: die Meldung sagt „on line N" ohne Dateinamen. Den setzen wir
 *  selbst davor, er ist ja bekannt. */
function pruefe(name) {
  return phpLauf(["-l"], readFileSync(join(ORDNER, name)));
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
  console.log(`check-php: ${dateien.length} Datei(en) geprueft${wieGelaufen} — keine Syntaxfehler.`);
  console.log("           ⚠ Das heisst: es parst. Nicht: es funktioniert.");
  process.exit(0);
}

console.error(`check-php: ${befunde.length} Datei(en) mit Syntaxfehlern.\n`);
for (const b of befunde) {
  console.error(`  wordpress/${b.name}`);
  console.error(`    ${b.text.replace(/\n/g, "\n    ")}\n`);
}
process.exit(1);
