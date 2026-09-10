#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   npm test — mit eingebauter Zählprobe
   10.09.2026

   ⚠ ⚠  ANLASS: EIN LAUF KANN TESTDATEIEN VERLIEREN UND „passed" MELDEN.

   Reproduziert am 10.09.2026 in zwei von neun Läufen unter Last:

     3 unter einfacher Last   → 1 Verlust (74 statt 76 Dateien)
     3 unter dreifacher Last  → 1 Verlust (73 statt 76), mit
                                [vitest-pool-runner]: Timeout waiting
                                for worker to respond
     4 weitere                → 0

   Zwei Ausprägungen, und nur eine ist laut:

     laut   „6 failed | 67 passed (73)"   — fällt auf
     still  „59 passed (59)"              — ⚠ nichts deutet auf 17
                                             fehlende Dateien

   ── Warum ein Wrapper und keine vitest-Einstellung ────────────────────

   Der Verlust entsteht, WEIL ein Worker nicht antwortet — vitest weiss
   dann nichts von der Datei, die er hätte laufen lassen sollen. Es gibt
   keine Einstellung „melde, was du nicht ausgeführt hast": vitest kann
   nur melden, was es kennt.

   **Die einzige Stelle, die den Verlust sehen kann, ist ausserhalb.**
   `vitest list` zählt, ohne auszuführen — die Differenz ist der Beweis.

   ⚠ ⚠  UND DESHALB IST DIE ZÄHLPROBE JETZT `npm test` SELBST.

   Bis heute stand sie als Anweisung im Papier: „nach jedem Lauf die
   Dateizahl gegen `vitest list` halten". Eine Regel, an die jemand
   denken muss, ist die schwächste Lösung — und genau diese hier wurde
   an einem einzigen Tag mehrfach übersprungen, von demjenigen, der sie
   aufgeschrieben hat.

   **Wer `npm test` ruft, ruft die Zählprobe mit. Sie ist nicht mehr
   auszulassen, ohne es zu wollen.**

   ⚠ ⚠  UND DIE REIHENFOLGE IN `npm run pruefkette` IST TEIL DAVON.

   Am 10.09.2026 stand `npm test` dort HINTER vier Docker-Prüfungen
   (`check:php`, `check:plugin`, `check:deno`, `check:sql`). Ergebnis:
   `teamSpielplanTab.test.jsx` fiel **zweimal hintereinander** in den
   5-Sekunden-Timeout — allein aufgerufen grün, als `npm test` grün, nur
   in der Kette rot.

   **Die Prüfkette erzeugte die Last, an der ihr eigener Testlauf
   scheiterte.** Und das eine Stunde, nachdem hier stand: „Testlauf und
   Build gehören nicht in dieselbe Befehlskette."

   Seither läuft `npm test` als ERSTES — auf der ruhigen Maschine. Die
   Docker-Prüfungen danach stören niemanden mehr.
   ══════════════════════════════════════════════════════════════════════ */
import { spawnSync } from "node:child_process";

const ZEILEN = new RegExp(String.fromCharCode(13) + "?" + String.fromCharCode(10));
const args = process.argv.slice(2);

/* ── 1 · Zählen, ohne auszuführen ──────────────────────────────────── */
const liste = spawnSync("npx", ["vitest", "list", ...args], {
  encoding: "utf8", shell: true,
});
if (liste.status !== 0) {
  console.error("test: `vitest list` ist gescheitert — die Zählprobe hat "
    + "keine Erwartung, gegen die sie halten könnte.\n");
  console.error(String(liste.stderr || liste.stdout).slice(-2000));
  process.exit(1);
}

/* ⚠ Steuerzeichen raus, bevor irgendetwas gelesen wird. Lokal traegt die
   Ausgabe keine; in einer Prüfkette kann sie welche tragen, und dann
   scheitert ein `$`-Anker am unsichtbaren Rest. */
const ESC = new RegExp(String.fromCharCode(27) + "\[[0-9;]*[A-Za-z]", "g");
const ohneFarbe = (t) => String(t).replace(ESC, "");

/* ⚠ NICHT auf `src/` prüfen: der Pfad kann je nach Betriebssystem und
   Aufrufort anders beginnen. Erkannt wird eine Testdatei daran, dass sie
   auf `.test.<endung>` endet — das gilt überall. */
const erwarteteDateien = new Set();
let erwarteteFaelle = 0;
for (const roh of ohneFarbe(liste.stdout).split(ZEILEN)) {
  const z = roh.trim();
  if (!z) continue;
  const datei = z.split(" > ")[0].trim();
  if (!/\.test\.[jt]sx?$/.test(datei)) continue;
  erwarteteFaelle += 1;
  erwarteteDateien.add(datei.split("\\").join("/"));
}

if (erwarteteDateien.size === 0) {
  console.error("test: `vitest list` nennt keine einzige Datei. Entweder "
    + "gibt es keine Tests, oder die Liste ist selbst kaputt — in beiden "
    + "Fällen ist ein grüner Lauf danach wertlos.\n");
  /* ⚠ Die Ausgabe MIT anzeigen. Eine Prüfung, die scheitert und ihren
     Eingabetext verschweigt, schickt den Leser ins Raten — genau das
     hat sie in der Prüfkette einmal getan. */
  console.error("Was `vitest list` geliefert hat (letzte 20 Zeilen):");
  for (const z of ohneFarbe(liste.stdout).split(ZEILEN).slice(-20)) {
    console.error("  | " + z);
  }
  process.exit(1);
}

/* ── 2 · Ausführen ─────────────────────────────────────────────────── */
const lauf = spawnSync("npx", ["vitest", "run", ...args], {
  encoding: "utf8", shell: true,
});
const ausgabe = ohneFarbe(String(lauf.stdout || "") + String(lauf.stderr || ""));
process.stdout.write(String(lauf.stdout || "") + String(lauf.stderr || ""));

/* ── 3 · Die Zählprobe ─────────────────────────────────────────────── */
/* ⚠ Aus der Zusammenfassung gelesen, nicht aus den Fortschrittszeilen:
   `grep` auf eine laufende Ausgabe trifft Zwischenstände — am
   23.08.2026 zweimal einem Fehlalarm aufgesessen. Deshalb der LETZTE
   Treffer, nicht der erste. */
function letzteZahl(muster) {
  let wert = null;
  for (const z of ausgabe.split(ZEILEN)) {
    const m = z.match(muster);
    if (m) wert = Number(m[1]);
  }
  return wert;
}
const gelaufeneDateien = letzteZahl(/Test Files.*\((\d+)\)\s*$/);
const gelaufeneFaelle = letzteZahl(/^\s*Tests\s.*\((\d+)\)\s*$/);

const befunde = [];
if (gelaufeneDateien === null || gelaufeneFaelle === null) {
  befunde.push("Die Zusammenfassung ist nicht lesbar — hat vitest sein "
    + "Ausgabeformat geändert? Ohne sie kann die Zählprobe nichts sagen.");
} else {
  if (gelaufeneDateien !== erwarteteDateien.size) {
    befunde.push(`Dateien: ${gelaufeneDateien} gelaufen, `
      + `${erwarteteDateien.size} erwartet — `
      + `${erwarteteDateien.size - gelaufeneDateien} nicht ausgeführt.`);
  }
  if (gelaufeneFaelle !== erwarteteFaelle) {
    befunde.push(`Fälle: ${gelaufeneFaelle} gelaufen, `
      + `${erwarteteFaelle} erwartet.`);
  }
}

if (befunde.length) {
  console.error("\n══════════════════════════════════════════════════════");
  console.error("ZÄHLPROBE GESCHEITERT — der Lauf ist wertlos,");
  console.error("unabhaengig davon, was oben bei „passed“ steht.\n");
  for (const b of befunde) console.error("  · " + b);
  /* ⚠ Der Eingabetext gehört dazu — sonst ist nicht zu unterscheiden, ob
     der Lauf Dateien verloren hat oder ob diese Prüfung die
     Zusammenfassung nicht lesen konnte. Zwei sehr verschiedene Dinge mit
     derselben roten Farbe. */
  console.error("\nDie gelesenen Zeilen (letzte 12):");
  for (const z of ausgabe.split(ZEILEN).slice(-12)) console.error("  | " + z);
  console.error("\n⚠ Häufigste Ursache: ein Worker hat nicht geantwortet");
  console.error("  ([vitest-pool-runner]: Timeout waiting for worker).");
  console.error("  Reproduziert in 2 von 9 Läufen unter Last. Lief");
  console.error("  gleichzeitig ein Build oder ein Typecheck? Dann den");
  console.error("  Lauf allein wiederholen — es ist kein Testfehler.");
  console.error("══════════════════════════════════════════════════════");
  process.exit(1);
}

if (lauf.status !== 0) process.exit(lauf.status ?? 1);

console.log(`\nZaehlprobe: ${gelaufeneDateien} Dateien, ${gelaufeneFaelle} `
  + `Faelle — so viele, wie vitest list nennt.`);
