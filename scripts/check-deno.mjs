/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-deno.mjs

   Typprüfung für die Edge Functions unter `supabase/functions/`.

     node scripts/check-deno.mjs

   ══════════════════════════════════════════════════════════════════
   ⚠ ⚠  WARUM ES DAS GIBT — GEMESSEN AM 10.09.2026, NICHT VERMUTET
   ══════════════════════════════════════════════════════════════════

   `wp-export` v17 ging raus und **bootete nicht**. Aus dem Browser kam:

     Access to fetch … blocked by CORS policy: Response to preflight
     request doesn't pass access control check

   ⚠ Und das ist die falsche Fährte, die der Ausfall selbst legt: es sah
   aus wie ein Problem mit den CORS-Kopfzeilen — also mit dem Code, der
   OPTIONS beantwortet. Der war unverändert. Gemessen war es

     OPTIONS /functions/v1/wp-export  → 503
     POST    …                        → {"code":"BOOT_ERROR"}

   **Eine Function, die nicht startet, kann auch den Preflight nicht
   beantworten** — und der Browser meldet das als CORS-Fehler, weil er
   nur sieht, dass die Vorab-Anfrage keinen 200 bekommt. Dieselbe Familie
   wie „eine Meldung nennt das letzte Glied der Kette, nicht das
   gerissene".

   DIE URSACHE war eine Zeile:

     const sRes = await db.from("spiele")…        // Zeile 849
     const sRes = await db.from("sfv_personen")…  // Zeile 900, NEU

   `Cannot redeclare block-scoped variable` — im selben Block. Ein
   Syntaxfehler, der beim Modulstart wirft.

   ⚠ ⚠ **UND DIE GANZE PRÜFKETTE WAR GRÜN.** typecheck, alle sechs
   `check:*`, 1024 Tests. Der Grund steht in mehreren Dateiköpfen dieses
   Projekts und war bis heute nur eine Bemerkung:

     > „Diese Datei importiert von esm.sh und wird von tsc und vitest
     >  nicht geprüft."

   Daraus folgte bisher, Entscheidungen nach `src/` zu verlagern — richtig
   und weiterhin gültig. Aber der REST der Datei blieb ungeprüft, und
   „ungeprüft" hiess: bis zum Deploy. **`deno check` ist da, kostet nichts
   und findet genau diese Klasse.**

   ── ⚠ GRENZE — ABSICHTLICH ENG ───────────────────────────────

     findet       Syntax- und Typfehler der Function samt ihrer
                  `src/`-Importe und der esm.sh-Typen
     findet NICHT ob eine Abfrage die richtigen Zeilen trifft
                  ob eine Policy sie durchlässt
                  ob die Logik stimmt

   **Ein grüner Lauf heisst „sie startet", nicht „sie tut das Richtige."**

   ⚠ Sie prüft nur die `index.ts` jeder Function. Das ist Absicht: von dort
   aus zieht `deno check` den ganzen Importgraphen mit — eine Datei
   einzeln zu nennen brächte nichts und würde beim nächsten neuen Modul
   vergessen.

   ── Werkzeug ────────────────────────────────────────────────
   `deno` lokal, sonst über Docker (`denoland/deno`), sonst ROT.
   ⚠ NICHT still überspringen: eine Prüfung, die bei fehlendem Werkzeug
   grün meldet, ist genau die Sorte, die in dem Moment schweigt, in dem
   sie gebraucht wird. Dieselbe Leiter wie in `php-lauf.mjs`.
   ═══════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const WURZEL = resolve(import.meta.dirname, "..");
const ORDNER = resolve(WURZEL, "supabase/functions");

function vorhanden(befehl, args) {
  try { execFileSync(befehl, args, { stdio: "ignore" }); return true; } catch { return false; }
}

/** Jede Function, die eine `index.ts` hat. `_shared` und Ähnliches fällt weg. */
function functions() {
  return readdirSync(ORDNER, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `supabase/functions/${e.name}/index.ts`)
    .filter((p) => existsSync(resolve(WURZEL, p)))
    .sort();
}

const denoDa = vorhanden("deno", ["--version"]);
const dockerDa = denoDa ? false : vorhanden("docker", ["info"]);

if (!denoDa && !dockerDa) {
  console.error("check-deno: weder `deno` noch Docker gefunden — die Pruefung ist ROT,");
  console.error("            nicht uebersprungen. Eine Pruefung, die ohne Werkzeug gruen");
  console.error("            meldet, schweigt genau dann, wenn sie gebraucht wird.");
  process.exit(1);
}

const dateien = functions();
if (!dateien.length) {
  console.error("check-deno: keine Function mit index.ts gefunden — das ist ein Befund,");
  console.error("            kein Erfolg. Sieht die Pruefung den richtigen Ordner an?");
  process.exit(1);
}

let ausgabe = "";
try {
  ausgabe = denoDa
    ? execFileSync("deno", ["check", ...dateien], { cwd: WURZEL, stdio: "pipe" }).toString()
    : execFileSync("docker", [
      "run", "--rm",
      "-v", `${WURZEL}:/w`, "-w", "/w",
      "denoland/deno:latest", "deno", "check", ...dateien,
    ], { cwd: WURZEL, stdio: "pipe" }).toString();
} catch (e) {
  /* ⚠ Gebunden, nicht leer: der Fehlertext IST das Ergebnis. `deno check`
     schreibt seine Befunde nach stderr. */
  const text = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
  console.error(`check-deno: ${dateien.length} Function(s) geprueft — FEHLER.\n`);
  console.error(text || String(e));
  process.exit(1);
}

void ausgabe;
console.log(`check-deno: ${dateien.length} Function(s) typgeprueft (${denoDa ? "deno" : "ueber Docker"}) — sauber.`);
console.log("            ⚠ Das heisst: sie startet. Nicht: sie tut das Richtige.");
