#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   check-selects.mjs — Spaltennamen in `.select(…)` gegen database.types.ts
   ═══════════════════════════════════════════════════════════════════════════

   WARUM ES DIESE PRUEFUNG GIBT

   Am 20.08.2026 lieferte die Datenpruefung eines Elternteils „Keine Kinder
   verknuepft", obwohl das Kind verknuepft war. Die Abfrage selektierte
   `profil_geprueft_at` auf `mitglieder` — eine Spalte, die dort seit Etappe
   6a (05.08.2026) nicht mehr steht. PostgREST antwortete mit

       400  42703  column mitglieder_1.profil_geprueft_at does not exist

   und der Aufrufer las nur `data`:

       const { data } = await sb.from("eltern_kinder").select(…);
       return (data || []).map(…)          // aus 400 wird []

   Aus einem Fehler wurde eine Datenlage. Zwei Wochen unbemerkt, weil die
   Funktion genau einen Aufrufer hat und den bis dahin niemand benutzte.

   Weder Build noch Typecheck noch Tests finden so etwas: die Select-Liste ist
   eine ZEICHENKETTE. Diese Pruefung liest sie und haelt jede Spalte gegen
   `src/database.types.ts`.

   ⚠ WAS SIE NICHT FINDET — vollstaendig, damit niemand mehr erwartet:

     1. Dynamisch gebaute Selects. `select(SPALTEN)`, `select(\`…${x}…\`)` oder
        eine als Konstante abgelegte Liste werden UEBERSPRUNGEN. Nur ein
        Literal direkt im Aufruf wird gelesen.
     2. `rpc(…)`. Eine Funktion hat keine Spaltenliste, die hier zu pruefen
        waere; ein falscher Parametername faellt nicht auf.
     3. Embeds, deren Zieltabelle nicht aus dem Namen hervorgeht. `alias:hint(…)`
        wird ueber den Alias und ueber den Hinweis versucht; passt keiner auf
        einen Tabellennamen, wird der GANZE Block uebersprungen — samt allem,
        was darin steht, auch tiefer verschachtelt.
     4. Das Gegenteil einer fehlenden Spalte: eine Spalte, die es GIBT, aber
        die falsche Bedeutung hat. `mitglied_id` statt `person_id` ist hier
        unsichtbar (siehe CLAUDE.md, der fetchNotizen-Fall).
     5. `filter`/`eq`/`order` — geprueft wird nur `select`. Ein `.order("nachname")`
        auf `mitglieder` bricht zur Laufzeit genauso und faellt hier durch.
     6. Alles ausserhalb von `src/`: Edge Functions, Skripte, SQL.

   Sie findet also EINE Fehlerart, und die gut. Wer mehr erwartet, bekommt
   eine gruene Meldung ueber einem Loch.
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const WURZEL = process.cwd();
const QUELLE = join(WURZEL, "src");
const TYPEN = join(WURZEL, "src", "database.types.ts");

/* ── 1. Schema aus database.types.ts lesen ──────────────────────────────── */

/**
 * Liefert Map<tabelle, Set<spalte>> aus den `Row`-Bloecken.
 * Views zaehlen mit: sie werden genauso selektiert (z.B. `portal_zugang`).
 */
function leseSchema() {
  const text = readFileSync(TYPEN, "utf8");
  const tabellen = new Map();
  const zeilen = text.split(/\r?\n/);

  let tabelle = null;
  let inRow = false;
  for (const zeile of zeilen) {
    /* `      mitglieder: {` — sechs Leerzeichen, direkt unter Tables/Views. */
    const t = zeile.match(/^ {6}(\w+): \{$/);
    if (t) { tabelle = t[1]; inRow = false; continue; }
    if (!tabelle) continue;

    if (/^ {8}Row: \{$/.test(zeile)) { inRow = true; tabellen.set(tabelle, new Set()); continue; }
    if (inRow && /^ {8}\}/.test(zeile)) { inRow = false; tabelle = null; continue; }

    if (inRow) {
      const s = zeile.match(/^ {10}(\w+)(\??): /);
      if (s) tabellen.get(tabelle).add(s[1]);
    }
  }
  return tabellen;
}

/* ── 2. Quelldateien einsammeln ─────────────────────────────────────────── */

function dateien(verzeichnis, treffer = []) {
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) { dateien(pfad, treffer); continue; }
    if (/\.(ts|tsx|js|jsx)$/.test(eintrag) && !/database\.types\.ts$/.test(eintrag)) treffer.push(pfad);
  }
  return treffer;
}

/* ── 3. Select-Ausdruck zerlegen ────────────────────────────────────────── */

/**
 * Zerlegt eine PostgREST-Select-Liste in Spalten und Embeds.
 * Klammertiefe zaehlen, nicht `split(",")`: `personen(vorname,nachname)`
 * enthaelt selbst Kommas.
 */
function zerlege(ausdruck) {
  const teile = [];
  let tiefe = 0, puffer = "";
  for (const z of ausdruck) {
    if (z === "(") tiefe++;
    if (z === ")") tiefe--;
    if (z === "," && tiefe === 0) { teile.push(puffer); puffer = ""; continue; }
    puffer += z;
  }
  if (puffer.trim()) teile.push(puffer);
  return teile.map(t => t.trim()).filter(Boolean);
}

/* ── 4. Einen Select gegen eine Tabelle pruefen ─────────────────────────── */

function pruefeSelect(ausdruck, tabelle, schema, ctx, funde, uebersprungen) {
  const spalten = schema.get(tabelle);
  if (!spalten) { uebersprungen.push({ ...ctx, grund: `Tabelle \`${tabelle}\` steht nicht in database.types.ts` }); return; }

  for (const teil of zerlege(ausdruck)) {
    const embed = teil.match(/^([\w:]+)\s*(?:!\w+)?\s*\((.*)\)$/s);
    if (embed) {
      const [, kopf, innen] = embed;
      /* `alias:hinweis(…)` — beides gegen die Tabellennamen halten. */
      const kandidaten = kopf.split(":").map(k => k.replace(/!.*$/, "").trim());
      const ziel = kandidaten.find(k => schema.has(k));
      if (!ziel) {
        uebersprungen.push({ ...ctx, grund: `Embed \`${kopf}\` — Zieltabelle nicht aus dem Namen ableitbar` });
        continue;
      }
      pruefeSelect(innen, ziel, schema, ctx, funde, uebersprungen);
      continue;
    }

    /* `*`, `count`, Aggregate und Aliase (`neu:alt`) */
    if (teil === "*" || teil.startsWith("count")) continue;
    const name = (teil.includes(":") ? teil.split(":").pop() : teil)
      .replace(/::.*$/, "")            // Cast
      .replace(/\.\.\..*$/, "")        // Spread
      .trim();
    if (!name || name === "*" || /^\d/.test(name)) continue;
    /* JSON-Pfad (`theme->>farbe`) — die Spalte ist der Teil davor. */
    const basis = name.split(/->>?/)[0].trim();
    if (!basis) continue;

    if (!spalten.has(basis)) funde.push({ ...ctx, tabelle, spalte: basis });
  }
}

/* ── 5. Durchlauf ───────────────────────────────────────────────────────── */

const schema = leseSchema();
if (schema.size === 0) {
  console.error("check-selects: database.types.ts liess sich nicht lesen — Abbruch statt gruener Meldung.");
  process.exit(2);
}

const funde = [];
const uebersprungen = [];
let gepruefte = 0;
/* Jedes `.select(` im Quelltext, auch die, die das Muster unten gar nicht
   erst trifft. Die Differenz ist der blinde Fleck — und der gehoert in den
   Bericht, sonst liest sich „0 uebersprungen" wie „alles geprueft". */
let selectsGesamt = 0;

/* `.from("x")` … `.select("…")` im selben Ausdruck. Bewusst genuegsam: das
   `from` muss vor dem `select` stehen und hoechstens 400 Zeichen entfernt.

   ⚠ Der Zwischenraum darf KEIN weiteres `.from(` enthalten. Ohne diese
   Bedingung nahm die Pruefung das erste `from` und das naechste `select` —
   auch ueber eine dazwischenliegende zweite Abfrage hinweg. Beim ersten Lauf
   am 20.08.2026 hat sie so `benutzer.ist_admin` als fehlende Spalte von
   `mitglieder` gemeldet. Ein Fehlalarm faellt auf; er kostet trotzdem genau
   das Vertrauen, das die Pruefung braucht. */
const MUSTER = /\.from\(\s*["'`](\w+)["'`]\s*\)((?:(?!\.from\()[\s\S]){0,400}?)\.select\(\s*(["'`])([\s\S]*?)\3/g;

for (const pfad of dateien(QUELLE)) {
  const text = readFileSync(pfad, "utf8");
  const rel = relative(WURZEL, pfad).replace(/\\/g, "/");
  selectsGesamt += (text.match(/\.select\(/g) || []).length;
  for (const treffer of text.matchAll(MUSTER)) {
    const [ganz, tabelle, , , ausdruck] = treffer;
    const zeile = text.slice(0, treffer.index).split(/\r?\n/).length;
    const ctx = { datei: rel, zeile };
    /* Template-Literale mit ${…} sind zur Bauzeit unbekannt. */
    if (ausdruck.includes("${")) {
      uebersprungen.push({ ...ctx, grund: "Select wird dynamisch gebaut (${…})" });
      continue;
    }
    void ganz;
    gepruefte++;
    pruefeSelect(ausdruck.replace(/\s+/g, ""), tabelle, schema, ctx, funde, uebersprungen);
  }
}

/* ── 6. Bericht ─────────────────────────────────────────────────────────── */

const ausfuehrlich = process.argv.includes("--verbose");
/* Weder geprueft noch als „uebersprungen" vermerkt: das Muster verlangt ein
   `.from("tabelle")` innerhalb von 400 Zeichen vor dem `.select("…")`. Wer
   den Query-Builder in einer Variablen fuehrt (`let q = sb.from(…); … q.select(…)`)
   oder `select()` ohne Literal aufruft, faellt hier durch. */
const nichtErfasst = selectsGesamt - gepruefte - uebersprungen.length;
const reichweite = `${gepruefte} von ${selectsGesamt} select() geprüft, ${uebersprungen.length} übersprungen, ${nichtErfasst} vom Muster nicht erfasst`;

if (uebersprungen.length > 0 && ausfuehrlich) {
  console.log(`\nÜbersprungen (${uebersprungen.length}) — hier prüft NICHTS:`);
  for (const u of uebersprungen) console.log(`  ${u.datei}:${u.zeile}  ${u.grund}`);
}

if (funde.length === 0) {
  console.log(`check-selects: ${reichweite} — keine unbekannten Spalten.`);
  if (!ausfuehrlich && uebersprungen.length > 0) console.log("  (--verbose zeigt, was übersprungen wurde)");
  process.exit(0);
}

/* ⚠ Die Reichweite gehoert AUCH in den Fehlerpfad. Wer nur die Funde sieht,
   haelt sie fuer die ganze Wahrheit — und uebersieht, dass daneben n
   Ausdruecke ungeprueft durchgelaufen sind. */
console.error(`
check-selects: ${reichweite}.`);
console.error(`${funde.length} Spalte(n) in einem select(), die es in database.types.ts nicht gibt:
`);
for (const f of funde) {
  console.error(`  ${f.datei}:${f.zeile}`);
  console.error(`      ${f.tabelle}.${f.spalte}`);
}
console.error(`
Zur Laufzeit antwortet PostgREST darauf mit 400 / 42703. Wer nur \`data\`
liest, bekommt \`null\` und macht daraus eine leere Liste — der Fehler wird
zur Datenlage. Entweder die Spalte gibt es woanders (Personenfelder stehen
seit Etappe 6a in \`personen\`), oder database.types.ts ist veraltet:
\`npm run gen:types\`.
`);
process.exit(1);
