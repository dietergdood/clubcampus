#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   check-sql — parst jede .sql-Datei mit dem echten Postgres-Parser
   10.09.2026

   ⚠ ANLASS, gemessen: `migration_bench_ausbau.sql` brach beim Ausfuehren
   ab mit

     ERROR: 42601: syntax error at or near "declare"

   Ursache war ein Dollar-Quoting-Tag, den ich falsch geschrieben hatte:
   `do $$bench$$` ist KEIN Block mit dem Tag `bench`, sondern ein leerer
   Tag `$$...$$` um den Text `bench`. Der DO-Rumpf war die Zeichenkette
   'bench', und alles danach stand frei im SQL.

   ⚠ ⚠  UND DIE GANZE PRUEFKETTE WAR GRUEN. typecheck, sieben check:*,
         1123 Tests, Build. **Keine davon hat je eine SQL-Datei
         angesehen.** Derselbe blinde Fleck wie bei den Edge Functions vor
         check:deno.

   ── Was sie findet und was nicht ──────────────────────────────────────

   Gemessen am 10.09.2026 gegen eine LEERE Datenbank:

     Eine Datei mit einem Syntaxfehler NACH einem gescheiterten Statement
     wird trotzdem gemeldet. Der Server parst, bevor er ablehnt —
     „current transaction is aborted" verdeckt einen Syntaxfehler NICHT.

   Gemeldet wird deshalb **nur** `syntax error`. Alles andere — fehlende
   Tabellen, fehlende Spalten, Rechte — ist gegen eine leere Datenbank
   der Normalfall und kein Befund.

   **Ein gruener Lauf heisst „es parst". Nicht: es tut das Richtige.**
   Dieselbe Leiter wie check:php und check:deno.
   ══════════════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORDNER = "supabase";

function sqlDateien(rel) {
  const raus = [];
  for (const name of readdirSync(join(WURZEL, rel))) {
    const p = join(rel, name);
    if (statSync(join(WURZEL, p)).isDirectory()) {
      /* functions/ enthaelt TypeScript, .temp/ Verbindungsdaten. */
      if (name === "functions" || name.startsWith(".")) continue;
      raus.push(...sqlDateien(p));
      continue;
    }
    if (name.endsWith(".sql")) raus.push(p.split("\\").join("/"));
  }
  return raus;
}

const dateien = sqlDateien(ORDNER).sort();
if (!dateien.length) {
  console.log("check-sql: keine .sql-Dateien gefunden.");
  process.exit(0);
}

function vorhanden(cmd, args) {
  try { execFileSync(cmd, args, { stdio: "ignore" }); return true; }
  catch { return false; }
}

/* ⚠ ROT, nicht „uebersprungen". Eine Pruefung, die bei fehlendem Werkzeug
   gruen sagt, schweigt genau dann, wenn sie gebraucht wird — dieselbe
   Leiter wie in php-lauf.mjs und check-deno.mjs. */
if (!vorhanden("docker", ["info"])) {
  console.error("check-sql: docker fehlt — SQL ungeprueft.");
  console.error("           Docker Desktop starten und erneut laufen lassen.");
  process.exit(1);
}

/* Ein Container, ein initdb, alle Dateien. Der Start kostet ein paar
   Sekunden; ihn je Datei zu zahlen waere die eigentliche Bremse. */
const START = [
  "export PGDATA=/tmp/d",
  "initdb -U p --auth=trust -E UTF8 >/dev/null 2>&1",
  "pg_ctl -D $PGDATA -o '-k /tmp -c listen_addresses=' -w start >/dev/null 2>&1",
];
const LAEUFE = dateien.map((d) =>
  "psql -h /tmp -U p -d postgres -q -f /w/" + d + " 2>&1"
  + " | grep -i 'syntax error' | sed 's|^|" + d + " :: |'");
const skript = [...START, ...LAEUFE].join("; ");

let ausgabe = "";
try {
  ausgabe = execFileSync("docker", [
    "run", "--rm", "--user", "postgres",
    "-v", WURZEL + ":/w:ro",
    "postgres:16-alpine", "sh", "-c", skript,
  ], { cwd: WURZEL, stdio: "pipe" }).toString();
} catch (e) {
  /* ⚠ Gebunden, nicht leer: der Fehlertext IST das Ergebnis. */
  ausgabe = String((e.stdout ?? "") + (e.stderr ?? ""));
}

const funde = ausgabe.split(/\r?\n/).filter((z) => z.includes(" :: "));
if (funde.length) {
  console.error("check-sql: " + funde.length + " Syntaxfehler in "
    + dateien.length + " Datei(en).");
  console.error("");
  for (const f of funde) console.error("  " + f);
  console.error("");
  console.error("⚠ Ein haeufiger Fall: ein Dollar-Quoting-Tag als $$tag$$"
    + " statt $tag$ — das ist ein LEERER Tag um den Text, und der Block"
    + " endet sofort.");
  process.exit(1);
}

console.log("check-sql: " + dateien.length
  + " SQL-Datei(en) mit dem Postgres-Parser geprueft — sauber.");
console.log("           ⚠ Das heisst: sie parsen. Nicht: sie tun das Richtige.");
