#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   check:spalten — erfundene Spaltennamen in .sql-Dateien
   11.09.2026

   ⚠ ⚠  ANLASS: `spiele.datum` — an einem Tag SECHSMAL geschrieben, und
   die Spalte heisst `date`. Jedes Mal ein Fehlschlag beim Ausführen,
   jedes Mal dieselbe Stelle.

   ── WARUM ES KEINE NACHLÄSSIGKEIT IST ────────────────────────────────

   Die Codebasis ist durchgehend deutsch — Tabellen, Spalten, Bezeichner,
   Kommentare. In `spiele` steht aber:

       team · date · zeit · gegner · heimspiel · venue · notes

   **`zeit` ist deutsch, `date` daneben englisch.** Und die
   WordPress-Nutzlast übersetzt es zurück: `datum: wpDatum(q.date)`.
   Dieselbe Sache heisst an zwei Enden derselben Kette verschieden — wer
   die eine Seite im Kopf hat, schreibt die andere falsch.

   ⚠ Gemessen am 11.09.2026: `spiele.datum` stand NIRGENDS im Bestand.
   **Die Quelle war sauber, der Fehler war Gedächtnis** — und gegen
   Gedächtnis hilft keine Regel, nur eine Prüfung.

   ── WAS SIE PRÜFT ────────────────────────────────────────────────────

   Sie sammelt ALLE Spaltennamen aus `schema.sql` und meldet jede
   `alias.spalte`-Referenz in einer `.sql`-Datei, deren Name im ganzen
   Schema nicht vorkommt.

   ⚠ KEINE PFLEGELISTE. Eine Denylist („`datum` gibt es nicht") fänge
   genau diesen einen Fall und keinen zweiten — und niemand pflegt sie.
   Die Spaltenmenge kommt aus dem Dump und altert mit ihm.

   ── WAS SIE NICHT PRÜFT, und das gehört dazu ─────────────────────────

   · ob die Spalte an DIESER Tabelle existiert (nur, ob es sie überhaupt
     gibt). Ein Alias sauber aufzulösen hiesse, SQL zu parsen.
   · Sichten und Funktionen, die eigene Namen erzeugen (`as faellt_weg`).
     Deshalb werden Alias-Namen aus `as …` mitgesammelt.
   · alles ausserhalb von `.sql` — dafür gibt es `check:selects`.

   **Sie fängt den erfundenen Namen, nicht die falsche Tabelle.** Das ist
   die häufigere Hälfte und die billigere.
   ══════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SCHEMA = "supabase/schema.sql";

/* Schemata und Sonderpräfixe: `public.spiele` sieht aus wie
   `alias.spalte` und ist keines. */
const PRAEFIXE = new Set([
  "public", "auth", "storage", "cron", "net", "vault", "extensions",
  "information_schema", "pg_catalog", "pg_temp", "graphql", "realtime",
  "supabase_functions", "pgbouncer", "_analytics", "_realtime",
]);

/* ── 1 · Die Spaltenmenge aus dem Dump ────────────────────────────── */
const dump = readFileSync(SCHEMA, "utf8");
const spalten = new Set();
for (const m of dump.matchAll(/^\s{4}"([a-z0-9_]+)"\s/gm)) spalten.add(m[1]);
/* Funktionsparameter und Rückgabespalten stehen anders da. */
for (const m of dump.matchAll(/"([a-z0-9_]+)"\s+(?:integer|text|uuid|boolean|bigint|date|jsonb|numeric|timestamp)/g)) {
  spalten.add(m[1]);
}

if (spalten.size < 100) {
  console.error(`check-spalten: nur ${spalten.size} Spalten aus ${SCHEMA} `
    + `gelesen — das kann nicht stimmen. Hat sich das Dumpformat geändert?`);
  console.error("⚠ Eine Prüfung, die ihre Bezugsmenge nicht findet, ist "
    + "grün ohne zu prüfen. Deshalb bricht sie hier ab.");
  process.exit(1);
}

/* ── 2 · Die .sql-Dateien ─────────────────────────────────────────── */
function dateien(ordner, raus = []) {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { dateien(p, raus); continue; }
    if (n.endsWith(".sql") && p !== join("supabase", "schema.sql")) raus.push(p);
  }
  return raus;
}

const funde = [];
for (const datei of dateien("supabase")) {
  const roh = readFileSync(datei, "utf8");
  /* ⚠ ⚠ KOMMENTARE UND ZEICHENKETTEN RAUS, BEIDE — und die zweite Hälfte
     habe ich beim ersten Anlauf vergessen. Ergebnis: 242 Befunde, alle
     falsch: `martin.wyss@example.ch`, `env.local`,
     `migration_export_wartet.sql`, `otiyvvxoqghtkcgsjmrv.supabase.co`.

     **Eine Prüfung, die grundlos anschlägt, wird nach dem dritten Mal
     abgeschaltet** — dieselbe Abstumpfung wie bei den 758 Lint-Warnungen.
     Sie wäre damit schlechter gewesen als gar keine.

     ⚠ Die Zeilennummern bleiben erhalten: ersetzt wird durch Leerzeichen
     gleicher Länge, nicht gelöscht. Sonst zeigt der Befund auf eine
     Zeile, die mit der Ursache nichts zu tun hat. */
  /* ⚠ DIE REIHENFOLGE IST DER ZWEITE ANLAUF. Zuerst standen die
     Zeichenketten vor den Zeilenkommentaren — und ein Apostroph in einem
     Kommentartext („Didi's") eröffnete eine Zeichenkette, die über
     Zeilengrenzen lief und die `--` der Folgezeilen mitnahm. Sechs
     Befunde, alle Dateinamen aus Kopfkommentaren.

     Zeilenkommentare gehen deshalb ZUERST. Der Preis ist ein `--` INNEN
     in einer Zeichenkette — das schneidet dann zu viel weg und ergibt
     einen übersehenen Fall statt eines falschen. **Die Fehlerrichtung ist
     die bessere: ein Fehlalarm schaltet die Prüfung ab, eine Lücke
     nicht.** */
  /* ⚠ ⚠ `\r` ZUERST WEG, und das war der dritte Anlauf.

     Die Dateien tragen CRLF. `split("\n")` lässt das `\r` am Zeilenende
     stehen, `.` trifft es nicht, und `$` steht dahinter — also greift
     `/--.*$/` NICHT, und jeder Zeilenkommentar blieb stehen. Sechs
     Befunde, alle Dateinamen aus Kopfkommentaren.

     **Dieselbe Familie wie `\b` gegen deutsche Bezeichner und wie das
     NUL-Byte, das `grep` verstummen liess:** ein unsichtbares Zeichen
     bricht ein Muster, und das Ergebnis sieht aus wie ein Befund. */
  const leer = (m) => " ".repeat(m.length);
  const text = roh
    .split(/\r?\n/)
    .map((z) => z.replace(/--.*$/, (m) => " ".repeat(m.length)))
    .join("\n")
    .replace(/\$([a-z_]*)\$[\s\S]*?\$\1\$/gi, leer)   // Dollar-Quoting
    .replace(/'(?:[^']|'')*'/g, leer)                  // Zeichenketten
    .replace(/\/\*[\s\S]*?\*\//g, leer);               // Blockkommentare

  /* Eigene Namen der Datei: `as name`, Tabellen aus `create table`,
     Parameter aus `declare`. Sie sind gültige Referenzen. */
  const eigene = new Set();
  for (const m of text.matchAll(/\bas\s+([a-z0-9_]+)/gi)) eigene.add(m[1].toLowerCase());
  for (const m of text.matchAll(/\b(?:add\s+column|column)\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi)) {
    eigene.add(m[1].toLowerCase());
  }
  for (const m of text.matchAll(/^\s*([a-z0-9_]+)\s+(?:integer|text|uuid|boolean|bigint|date|jsonb|numeric|timestamptz|record)\b/gim)) {
    eigene.add(m[1].toLowerCase());
  }

  /* ⚠ ⚠  ALIASE FREMDER SCHEMATA SIND NICHT PRÜFBAR, und das muss die
     Prüfung wissen statt es zu melden.

     `schema.sql` deckt NUR `public` ab (steht so in CLAUDE.md, mit vier
     benannten blinden Flecken). Eine Abfrage über `pg_constraint c`
     benutzt `c.conname` — eine echte Spalte, die hier nie stehen kann.
     Im ersten Lauf waren das 70 von 70 Befunden.

     Also: jeder Alias, der an eine Tabelle ausserhalb von `public`
     gebunden ist, wird übersprungen. **Nicht weil er in Ordnung ist,
     sondern weil diese Prüfung dazu nichts sagen kann** — und eine
     Prüfung, die über Ungeprüftes schweigt, ist ehrlicher als eine, die
     es für einen Befund hält. */
  const fremd = new Set();
  const BINDUNG = /\b(?:from|join|update|into)\s+((?:[a-z_]+\.)?[a-z_][a-z0-9_]*)\s+(?:as\s+)?([a-z][a-z0-9_]*)\b/gi;
  for (const m of text.matchAll(BINDUNG)) {
    const tabelle = m[1].toLowerCase();
    const alias = m[2].toLowerCase();
    if (["as", "on", "where", "set", "select", "using", "left", "right",
         "inner", "outer", "full", "cross", "lateral"].includes(alias)) continue;
    const istPublic = dump.includes(`"public"."${tabelle.split(".").pop()}"`);
    if (!istPublic) fremd.add(alias);
  }

  /* ⚠ ⚠  EINE SPALTENLISTE AM ALIAS ERFINDET NAMEN, DIE ES GEBEN DARF.

     Standard-SQL erlaubt `… as f(spalte, spalte)` — bei `values`, bei
     Funktionen, bei Unterabfragen. Die Namen darin sind gültig und stehen
     in keinem Schema.

     Gefunden am 11.09.2026 an der eigenen Prüfkette: die Gegenprobe des
     Sync-Wächters benutzt
       cross join (values ('1 Ausfall', 'letzter_sync'), …) as f(frage, marke)
     und `f.marke` wurde als erfundene Spalte gemeldet. **Ein Melder, der
     grundlos anschlägt, wird nach dem dritten Mal abgeschaltet** — und
     dieser hätte bei völlig gültigem SQL angeschlagen.

     ⚠ Aufgenommen werden die Namen, nicht der Alias: `f.marke` ist damit
     bekannt, ein Tippfehler `f.mark` weiterhin ein Befund. Die Grenze
     bleibt also eng. */
  const aliasSpalten = new Set();
  const SPALTENLISTE = /\)\s*(?:as\s+)?[a-z][a-z0-9_]*\s*\(([^()]*)\)/gi;
  for (const m of text.matchAll(SPALTENLISTE)) {
    for (const teil of m[1].split(",")) {
      const name = teil.trim().toLowerCase();
      if (/^[a-z][a-z0-9_]*$/.test(name)) aliasSpalten.add(name);
    }
  }

  const zeilen = text.split("\n");
  zeilen.forEach((zeile, i) => {
    for (const m of zeile.matchAll(/\b([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)\b/g)) {
      const [, links, rechts] = m;
      if (PRAEFIXE.has(links)) continue;
      if (fremd.has(links)) continue;
      if (spalten.has(rechts) || eigene.has(rechts)) continue;
      if (aliasSpalten.has(rechts)) continue;
      /* Eine Tabelle als rechte Seite (`cron.job`) ist keine Spalte —
         Tabellennamen stehen ebenfalls im Dump. */
      if (dump.includes(`"public"."${rechts}"`)) continue;
      funde.push(`${datei}:${i + 1}  ${links}.${rechts}`);
    }
  });
}

if (funde.length) {
  console.error(`\ncheck-spalten: ${funde.length} Spaltenname(n), die es im `
    + `Schema nicht gibt\n`);
  for (const f of funde) console.error("  · " + f);
  console.error(`\n⚠ Häufigste Ursache: die deutsche Form einer englischen `
    + `Spalte.\n  spiele.datum → spiele.date  (die Nutzlast heisst `
    + `datum, die Spalte date)\n`);
  process.exit(1);
}

console.log(`check-spalten: ${dateien("supabase").length} SQL-Datei(en) gegen `
  + `${spalten.size} Spalten aus schema.sql geprueft — keine erfundenen Namen.`);
console.log("           ⚠ Geprueft wird, ob es den Namen GIBT — nicht, ob er");
console.log("             an dieser Tabelle haengt. Dafuer braeuchte es einen");
console.log("             SQL-Parser mit Alias-Aufloesung.");
