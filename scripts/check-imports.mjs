/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-imports.mjs

   Prüft, ob alle verwendeten Konstanten aus src/constants.ts auch
   importiert werden. Ersetzt die früheren check_imports.py und
   check_imports_fix.py (Python ist keine Voraussetzung mehr, und die
   Skripte lasen noch das alte src/constants.js).

     node scripts/check-imports.mjs          # nur prüfen
     node scripts/check-imports.mjs --fix    # fehlende Imports ergänzen

   Danach immer: npm run build

   Hinweis: Für .ts/.tsx-Dateien findet `npx tsc --noEmit` dasselbe
   Problem zuverlässiger. Dieses Skript deckt vor allem die noch nicht
   migrierten .js/.jsx-Dateien ab.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const FIX = process.argv.includes("--fix");

/* ── Konstanten-Datei finden (constants.ts, früher constants.js) ── */
const constantsFile = ["constants.ts", "constants.js"]
  .map(f => join(SRC, f))
  .find(existsSync);

if (!constantsFile) {
  console.error("Keine src/constants.ts gefunden.");
  process.exit(1);
}
const constantsName = constantsFile.endsWith(".ts") ? "constants.ts" : "constants.js";
const exported = [...readFileSync(constantsFile, "utf8").matchAll(/export const (\w+)/g)].map(m => m[1]);

/* ── Quelldateien sammeln ── */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
    return /\.(js|jsx|ts|tsx)$/.test(e.name) ? [p] : [];
  });
}
/* database.types.ts ist generiert und nutzt R als Typparameter — das
   schlaegt sonst als fehlender Import der Konstante R an. */
const GENERIERT = ["database.types.ts"];

const files = walk(SRC).filter(p =>
  !p.includes("__tests__") &&
  p !== constantsFile &&
  !GENERIERT.some(g => p.endsWith(g))
);

/* Import-Statements, Kommentare und String-Literale entfernen, damit
   kurze Namen wie R, GB oder BL nicht in Texten/CSS falsch anschlagen. */
function stripNonCode(src) {
  return src
    .replace(/import\s+[\s\S]*?\s+from\s*["'][^"']*["'];?/g, "")
    .replace(/import\s*["'][^"']*["'];?/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/* Import aus constants — Endung offen, damit .ts und .js beide greifen */
const IMPORT_RE = /(import\s*\{)([^}]*)(\}\s*from\s*["'])((?:\.\.?\/)*)constants(?:\.[jt]s)?(["'])/;

const problems = [];

for (const path of files) {
  const content = readFileSync(path, "utf8");
  const match = content.match(IMPORT_RE);
  const imported = new Set(match ? [...match[2].matchAll(/\b(\w+)\b/g)].map(m => m[1]) : []);

  const code = stripNonCode(content);

  /* Wortgrenze inklusive Umlauten, und lokale Deklarationen ausnehmen.

     `\b` allein ist in einer deutschen Codebasis unbrauchbar: JS zaehlt nur
     [A-Za-z0-9_] als Wortzeichen, also steht mitten in „Rückennummer" eine
     Wortgrenze hinter dem R. Da constants.ts ein `R` (Rot) exportiert,
     meldete der Pruefer jede Datei, in der das Wort vorkommt.
     /\bR\b/.test("Rückennummer") ist true — am 19.08.2026 an
     SfvSpielerZuordnung.tsx aufgefallen.

     Zweiter Fall: eine lokal deklarierte Konstante gleichen Namens (`const
     ICON = …` neben dem exportierten ICON aus constants.ts). Das ist kein
     fehlender Import, sondern hoechstens eine unglueckliche Namenswahl — ein
     Import dazu waere eine Kollision.

     Beide Male haette `--fix` einen falschen Import ergaenzt. */
  const GRENZE = "[^\\p{L}\\p{N}_]";
  const lokalDeklariert = c =>
    new RegExp(`\\b(?:const|let|var|function|class)\\s+${c}\\b`).test(code);
  const kommtVor = c =>
    new RegExp(`(?<=^|${GRENZE})${c}(?=$|${GRENZE})`, "u").test(code);

  const missing = exported.filter(
    c => !imported.has(c) && !lokalDeklariert(c) && kommtVor(c));
  if (missing.length === 0) continue;

  const rel = relative(SRC, path).split(sep).join("/");
  problems.push({ path, rel, missing, match });
}

if (problems.length === 0) {
  console.log("Alle Konstanten-Imports OK.");
  process.exit(0);
}

if (!FIX) {
  console.log(`\n${problems.length} Datei(en) mit fehlenden Konstanten-Imports:\n`);
  for (const { rel, missing } of problems) console.log(`  ${rel}\n    FEHLT: ${missing.join(", ")}\n`);
  console.log("Fix: node scripts/check-imports.mjs --fix");
  process.exit(1);
}

for (const { path, rel, missing, match } of problems) {
  let content = readFileSync(path, "utf8");
  if (match) {
    /* Bestehenden Import erweitern */
    const erweitert = `${match[1]}${match[2].trimEnd()}, ${missing.join(", ")}${match[3]}${match[4]}${constantsName}${match[5]}`;
    content = content.replace(IMPORT_RE, erweitert);
    console.log(`Erweitert: ${rel} (+${missing.join(", ")})`);
  } else {
    /* Neuen Import nach der ersten Import-Zeile einfügen */
    const tiefe = rel.split("/").length - 1;
    const prefix = tiefe > 0 ? "../".repeat(tiefe) : "./";
    const ersterImport = content.indexOf("import ");
    const einfuegeAb = ersterImport === -1 ? 0 : content.indexOf("\n", ersterImport) + 1;
    const zeile = `import { ${missing.join(", ")} } from "${prefix}${constantsName}";\n`;
    content = content.slice(0, einfuegeAb) + zeile + content.slice(einfuegeAb);
    console.log(`Neu: ${rel} (+${missing.join(", ")})`);
  }
  writeFileSync(path, content);
}

console.log(`\n${problems.length} Datei(en) korrigiert. Bitte Build pruefen: npm run build`);
