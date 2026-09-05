/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-encoding.mjs

   Haelt jede eingecheckte TEXTDATEI gegen drei Dinge, die Werkzeuge
   still falsch behandeln:

     1. NUL-Byte      → grep haelt die Datei fuer BINAER und
                        ueberspringt sie wortlos
     2. BOM           → UTF-8-BOM oder UTF-16; Git sieht ein
                        Binaerdiff, grep findet nichts
     3. kaputtes UTF-8 → einzelne Zeichen sind zerstoert, meist durch
                        eine Umkodierung unterwegs

     node scripts/check-encoding.mjs

   ⚠ WARUM ES DAS GIBT — zweimal derselbe Ausfall, zwei Wochen
   auseinander, und beide Male lief die ganze Pruefkette gruen.

   20.08.2026 · `src/database.types.ts` lag als UTF-16LE im Repository,
   300 KB statt 145 KB. `>` schreibt in PowerShell 5.1 UTF-16 — bei
   JEDEM Befehl, nicht nur bei `gen types`. Git hielt die Datei fuer
   binaer (`Bin 140356 -> 300554 bytes`: kein Zeilendiff, keine Review,
   keine Konfliktaufloesung), `grep` fand nichts darin, und Build wie
   Typecheck liefen durch, weil TypeScript das BOM versteht.

   05.09.2026 · `src/domains/spiele/spielerAusgabe.ts` enthielt EIN
   rohes NUL-Byte in einem Stringliteral (`let letztesTeam = "\0"`, als
   Byte statt als Escape). Funktional harmlos — es ist ein Waechterwert,
   den kein Mannschaftsname trifft. Fuer Werkzeuge nicht: `grep` meldete
   `Binary file … matches` OHNE eine einzige Trefferzeile.

   ⚠ DER SCHADEN IST NICHT DIE DATEI, SONDERN DIE SUCHE, DIE SIE NICHT
   FINDET. Bei der Bestandsaufnahme zum WordPress-Export lief
   `grep -rniE "wordpress|wp_post|wp-json" src/` — und uebersprang genau
   die Datei, die den bestehenden WordPress-Pfad enthielt. Der Plan
   entstand danach unter der Annahme, es gebe keinen.

   Beide Male gilt der Satz, der in `CLAUDE.md` ueber den verlorenen
   Testdateien steht: ES FEHLT ETWAS, UND NICHTS MELDET ES.

   ⚠ UND DESHALB IST DAS HIER EINE PRUEFUNG UND KEINE REGEL. Gegen
   „schreib UTF-8" hilft kein Vorsatz: die Umkodierung passiert in der
   Shell, im Editor, im Werkzeug — an Stellen, an die niemand denkt,
   waehrend er etwas anderes tut. (Beim Fix am 05.09.2026 ist genau das
   noch einmal passiert: der erste Versuch schrieb das NUL-Byte neu,
   weil ein Backslash auf dem Weg durch die Shell verschwand.)

   ── ALLOWLIST, NICHT DENYLIST ──────────────────────────────────
   Geprueft wird, was in TEXT_ENDUNGEN steht — nicht „alles ausser
   Bildern". Eine neue Binaerendung ist damit im Zweifel NICHT
   geprueft (harmlos), eine neue Textendung ebenfalls nicht — und das
   faellt auf, sobald jemand sie ergaenzen will. Umgekehrt waere eine
   vergessene Binaerendung ein Fehlalarm bei jedem Lauf, und ein
   Fehlalarm, den man wegklickt, ist das Ende der Pruefung.

   Gemessen am 05.09.2026: 362 Dateien im Index, davon 23 mit
   NUL-Bytes — 22 echte Binaerdateien (PNG, ICO, XLSX) und die eine
   oben.
   ═══════════════════════════════════════════════════════════════ */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/* Endungen, die Text enthalten MUESSEN. Bewusst knapp gehalten. */
const TEXT_ENDUNGEN = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".sql", ".css", ".html", ".yml", ".yaml",
  ".txt", ".svg", ".gitignore", ".env.example",
];

/* Dateien ohne Punkt im Namen (LICENSE, Dockerfile) — Endungsliste
   greift dort nicht, und sie sind fast immer Text. */
const OHNE_ENDUNG = ["LICENSE", "Dockerfile", "Procfile"];

function istText(pfad) {
  const name = pfad.split("/").pop() ?? "";
  if (OHNE_ENDUNG.includes(name)) return true;
  return TEXT_ENDUNGEN.some(e => name.endsWith(e));
}

/* `git ls-files` statt eines eigenen Verzeichnisdurchlaufs: es kennt
   .gitignore, und geprueft werden soll genau das, was eingecheckt ist.
   Was nicht im Index steht, kann niemanden ueberraschen. */
let dateien;
try {
  dateien = execSync("git ls-files", { maxBuffer: 1e8 }).toString().split("\n").filter(Boolean);
} catch (e) {
  console.error(`check-encoding: git ls-files fehlgeschlagen — ${e.message}`);
  process.exit(1);
}

const befunde = [];

for (const pfad of dateien) {
  if (!istText(pfad)) continue;

  let roh;
  try {
    roh = readFileSync(pfad);
  } catch (e) {
    /* ⚠ Gebunden, nicht verschluckt. Eine Datei im Index, die sich nicht
       lesen laesst, ist selbst ein Befund — sonst zaehlt die Pruefung
       eine Datei weniger und sagt trotzdem „alles in Ordnung". */
    befunde.push({ pfad, art: "nicht lesbar", hinweis: e.message });
    continue;
  }
  if (roh.length === 0) continue;

  /* 1 · BOM. Zuerst, weil UTF-16 auch NUL-Bytes erzeugt und die
     Meldung „NUL-Byte" dort in die Irre fuehrte. */
  if (roh[0] === 0xFF && roh[1] === 0xFE) {
    befunde.push({ pfad, art: "UTF-16LE", hinweis: "In PowerShell entsteht das durch `>`. Abhilfe: | Out-File -Encoding utf8" });
    continue;
  }
  if (roh[0] === 0xFE && roh[1] === 0xFF) {
    befunde.push({ pfad, art: "UTF-16BE", hinweis: "Als UTF-8 neu schreiben." });
    continue;
  }
  if (roh[0] === 0xEF && roh[1] === 0xBB && roh[2] === 0xBF) {
    befunde.push({ pfad, art: "UTF-8 mit BOM", hinweis: "Die ersten drei Bytes entfernen." });
    continue;
  }

  /* 2 · NUL-Byte. Zeile nennen, nicht nur die Datei — sonst sucht man
     in einer 8-KB-Datei nach einem unsichtbaren Zeichen. */
  const nul = roh.indexOf(0);
  if (nul >= 0) {
    const zeile = roh.subarray(0, nul).toString("utf8").split("\n").length;
    const anzahl = roh.filter(b => b === 0).length;
    befunde.push({
      pfad, art: "NUL-Byte", zeile,
      hinweis: `${anzahl}× — grep haelt die Datei fuer binaer. In einem Stringliteral gehoert die Escape-Folge \\0 hin, nicht das Byte.`,
    });
    continue;
  }

  /* 3 · Kaputtes UTF-8. Der Umweg ueber die Rueckkodierung ist der
     verlaesslichste Weg ohne Zusatzpaket: `toString("utf8")` ersetzt
     ungueltige Folgen durch U+FFFD, und die Ruecksicht faellt dann
     laenger oder kuerzer aus als das Original. */
  const text = roh.toString("utf8");
  if (Buffer.byteLength(text, "utf8") !== roh.length) {
    const i = text.indexOf("�");
    befunde.push({
      pfad, art: "kein gueltiges UTF-8",
      zeile: i >= 0 ? text.slice(0, i).split("\n").length : undefined,
      hinweis: "Wahrscheinlich eine Umkodierung unterwegs (cp1252/latin1).",
    });
  }
}

if (befunde.length === 0) {
  const n = dateien.filter(istText).length;
  console.log(`check-encoding: ${n} Textdateien geprueft — sauberes UTF-8, kein BOM, kein NUL-Byte.`);
  process.exit(0);
}

console.error(`check-encoding: ${befunde.length} Datei(en) mit einem Problem, das Werkzeuge STILL falsch behandeln.\n`);
for (const b of befunde) {
  console.error(`  ${b.pfad}${b.zeile ? `:${b.zeile}` : ""}`);
  console.error(`    ${b.art} — ${b.hinweis}\n`);
}
process.exit(1);
