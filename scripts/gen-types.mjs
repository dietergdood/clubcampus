#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/gen-types.mjs
   `supabase gen types` und das Ergebnis als UTF-8 in die Datei.

   ⚠ WARUM ES DIESES SKRIPT GIBT

   Die Supabase-CLI kann nur nach stdout schreiben — sie hat kein
   Flag fuer eine Zieldatei (Stand CLI 2.x, `gen types --help`).
   Die Umleitung ist also unvermeidlich, und genau daran haengt
   eine Falle:

   **Windows PowerShell 5.1 schreibt bei `>` UTF-16LE mit BOM.**

   Am 20.08.2026 lag `src/database.types.ts` so mit 300 KB statt
   145 KB im Repository. Folgen:

     · Git haelt die Datei fuer binaer — `Bin 140356 -> 300554
       bytes` im Diff. Kein Zeilenvergleich, keine Review, keine
       Konfliktaufloesung.
     · `grep` und `Select-String` finden nichts darin.
     · Build und Typecheck laufen trotzdem durch, weil TypeScript
       das BOM versteht.

   Also: nichts schlaegt fehl, und niemand sieht es.

   Eine Regel „bitte an das Encoding denken" waere hier die
   schwaechste Loesung — sie wirkt nur, solange jemand daran denkt.
   Dieses Skript nimmt die Entscheidung aus dem Kopf des Aufrufers
   heraus: `npm run gen:types` schreibt immer UTF-8, unabhaengig
   davon, welche Shell es startet.
   ═══════════════════════════════════════════════════════════════ */
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const ZIEL = "src/database.types.ts";
const BEFEHL = "npx supabase gen types typescript --linked";

/* shell:true, weil `npx` unter Windows eine .cmd ist — und der Befehl als EIN
   String, nicht als Argumentliste: die Kombination aus beidem meldet Node als
   DEP0190. Hier steht kein Wert aus fremder Hand im Befehl, die Warnung waere
   also gegenstandslos — aber eine Warnung, die man ignorieren lernt, ist
   dieselbe Sorte Rauschen wie die 758 Lint-Meldungen. */
const p = spawn(BEFEHL, { shell: true });

let aus = "";
let fehler = "";
p.stdout.setEncoding("utf8");
p.stderr.setEncoding("utf8");
p.stdout.on("data", d => { aus += d; });
p.stderr.on("data", d => { fehler += d; process.stderr.write(d); });

p.on("close", code => {
  if (code !== 0) {
    console.error(`\n✗ supabase gen types beendet mit Code ${code} — ${ZIEL} bleibt unveraendert.`);
    process.exit(code ?? 1);
  }

  /* Eine leere oder verstuemmelte Antwort darf die vorhandene Datei nicht
     ueberschreiben. Ohne diese Pruefung machte ein Netzwerkfehler aus einem
     fehlgeschlagenen Aufruf eine geleerte Typdatei — und der naechste
     Typecheck meldete hunderte Fehler an Stellen, die niemand angefasst hat. */
  if (!aus.includes("export type Database")) {
    console.error("✗ Die Antwort enthaelt kein `export type Database`.");
    console.error(`  ${aus.length} Zeichen empfangen. ${ZIEL} bleibt unveraendert.`);
    if (fehler.trim()) console.error(`  stderr: ${fehler.trim().split("\n")[0]}`);
    process.exit(1);
  }

  const vorher = existsSync(ZIEL) ? readFileSync(ZIEL, "utf8") : "";
  writeFileSync(ZIEL, aus, { encoding: "utf8" });

  const zeilen = aus.split("\n").length;
  const kb = Math.round(Buffer.byteLength(aus, "utf8") / 1024);
  console.log(`✓ ${ZIEL} geschrieben — ${zeilen} Zeilen, ${kb} KB, UTF-8 ohne BOM.`);
  if (vorher && vorher === aus) console.log("  (unveraendert gegenueber vorher)");
});
