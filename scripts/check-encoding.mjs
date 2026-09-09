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
   .gitignore, und geprueft werden soll das, was eingecheckt WIRD.

   ⚠ HIER STAND BIS ZUM 09.09.2026 EIN BLOSSES `git ls-files` — mit der
   Begruendung „was nicht im Index steht, kann niemanden ueberraschen".
   Das ist genau falsch herum: eine NEUE Datei steht noch nicht im Index,
   und sie ist der Zustand, in dem ein Werkzeug gerade eben geschrieben
   hat. Die Pruefung sah also alles ausser dem, was frisch entstanden war.

   Aufgefallen an der Zahl, nicht an einem Befund: nach drei neuen Dateien
   meldete sie unveraendert „354 Textdateien geprueft". Dieselbe Familie
   wie die verlorenen Testdateien — es fehlt etwas, und nichts meldet es,
   ausser einer Zahl, die sich nicht bewegt.

   `--cached --others --exclude-standard` nimmt Index UND neue Dateien und
   laesst .gitignore weiterhin gelten. */
let dateien;
try {
  dateien = execSync("git ls-files --cached --others --exclude-standard", { maxBuffer: 1e8 })
    .toString().split("\n").filter(Boolean);
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

  /* 3 · Unsichtbare Steuerzeichen — dazugekommen am 08.09.2026, nachdem
     sie an EINEM TAG ZWEIMAL entstanden sind:

       · ein Zero-Width-Space (U+200B), mit dem ich Stern und Schrägstrich
         in einem Kommentar trennen wollte — `tsc` meldete
         „TS1127: Invalid character" und zeigte auf eine Spalte, an der
         nichts zu sehen war;
       · ein BACKSPACE (0x08), weil `\b` auf dem Weg durch eine
         Shell zum Steuerzeichen wurde. Aus dem Ausdruck `/\bCHECK/` wurde
         `/\bCHECK/` — er traf nichts mehr, und der Test war GRÜN, weil
         eine Suche ohne Treffer wie „nichts zu beanstanden" aussieht.

     ⚠ Der zweite ist der gefährliche: er macht aus einer Prüfung eine
     Attrappe, ohne dass irgendetwas fehlschlägt. Genau die Familie, gegen
     die diese Datei gebaut ist — es fehlt etwas, und nichts meldet es.

     Erlaubt bleiben Tabulator (0x09), Zeilenumbruch (0x0A) und
     Wagenrücklauf (0x0D). Alles andere unter 0x20 hat in einer Textdatei
     nichts zu suchen. U+200B kommt dazu, weil es genauso unsichtbar ist.

     ⚠ U+FEFF steht ABSICHTLICH NICHT in der Liste, obwohl es ebenso
     unsichtbar ist. `shared/list/exportUtils.ts:71` stellt es einem CSV
     voran, damit Excel die Umlaute liest — richtiger Code, seit langem.
     Es mit zu verbieten hätte diese Prüfung dauerhaft rot gemacht, und
     eine dauerhaft rote Prüfung wird abgeschaltet, nicht befolgt. Ein
     führendes BOM fängt ohnehin Prüfung 1. **Nicht mehr verbieten als
     die Zusage** — dieselbe Lehre wie beim Tabellennamen `api_sync_log`
     und beim Wort `limit`. */
  const text0 = roh.toString("utf8");
  const steuer = [...text0].findIndex((z) => {
    const c = z.codePointAt(0);
    return (c < 0x20 && c !== 9 && c !== 10 && c !== 13) || c === 0x200b;
  });
  if (steuer >= 0) {
    const c = text0.codePointAt(steuer);
    befunde.push({
      pfad, art: "unsichtbares Steuerzeichen",
      zeile: text0.slice(0, steuer).split("\n").length,
      hinweis: `U+${c.toString(16).toUpperCase().padStart(4, "0")} — entsteht, wenn eine `
        + `Escape-Folge unterwegs ausgewertet wird. Ein Ausdruck, der so entstellt wird, `
        + `trifft nichts mehr und wird trotzdem gruen.`,
    });
    continue;
  }

  /* 4 · Kaputtes UTF-8. Der Umweg ueber die Rueckkodierung ist der
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
  console.log(`check-encoding: ${n} Textdateien geprueft — sauberes UTF-8, kein BOM, kein NUL-Byte, keine unsichtbaren Steuerzeichen.`);
  process.exit(0);
}

console.error(`check-encoding: ${befunde.length} Datei(en) mit einem Problem, das Werkzeuge STILL falsch behandeln.\n`);
for (const b of befunde) {
  console.error(`  ${b.pfad}${b.zeile ? `:${b.zeile}` : ""}`);
  console.error(`    ${b.art} — ${b.hinweis}\n`);
}
process.exit(1);
