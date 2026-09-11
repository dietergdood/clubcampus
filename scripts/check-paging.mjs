#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   check:paging — Lesestellen, die in die stille 1000-Zeilen-Grenze laufen
   11.09.2026 · Teil A aus docs/vorschlag_paginierung_sichtbar.md

   ⚠ ⚠  ANLASS: `spiel_aufstellung` hatte 2282 Zeilen, PostgREST lieferte
   1000, und NICHTS hat es gemeldet — `error` war `null`, `data` hatte
   genau 1000 Eintraege. Auf der Website fehlten Aufstellungszeilen, und
   jede Pruefung der Kette war gruen.

   Der Beleg steht in zwei Protokollzeilen desselben Tages:

       09:30   gesendet 1000   geschrieben 1000
       10:06   gesendet 2282   geschrieben 2282

   **Beide Zahlen stimmten ueberein.** Der Empfaenger schrieb genau, was
   ankam; wir sendeten genau, was wir gelesen hatten. 1282 Zeilen fehlten.

   ⚠ Die 1000 ist das Verraeterische: eine krumme Zahl haette jemanden
   stutzig gemacht, eine runde sieht aus wie eine Obergrenze, die jemand
   gesetzt hat — also nach Absicht.

   ── DIE FRAGE IST NICHT „LIEST ES UNGEPAGT?" ─────────────────────────

   Die meisten ungepagten Lesestellen sind harmlos: `api_verbindungen`
   hat eine Handvoll Zeilen und wird nie wachsen.

   > **Die Frage lautet: waechst diese Tabelle auf tausend zu?**

   ⚠ Und die ist hier NICHT abschliessend beantwortbar — sie haengt am
   Bestand, und der steht in der Datenbank. Die Pruefkette hat keine
   Zugangsdaten.

   | wer weiss was | |
   |---|---|
   | **der Code** weiss, welche Tabellen ungepagt gelesen werden | ⚠ nicht, wie gross sie sind |
   | **die Datenbank** weiss, welche Tabellen gross sind | ⚠ nicht, welche gepagt gelesen werden |

   Deshalb zwei Teile. Teil B ist die Wachstumsfrage im Sync-Waechter
   (`supabase/cron_sync_waechter.sql`, Schwelle 800). **Keiner der beiden
   genuegt allein**, und genau das ist der Grund fuer den Aufwand:

   | Nur Teil A | Nur Teil B |
   |---|---|
   | jemand traegt eine Tabelle in `DARF_UNGEPAGT` ein, und sie waechst spaeter doch | meldet `personen` bei 800 — auch wenn sie laengst gepagt gelesen wird |
   | **niemand merkt es** | **Fehlalarm, und nach dem dritten wird abgeschaltet** |

   ── WAS SIE PRUEFT ───────────────────────────────────────────────────

   Ueber den TypeScript-Syntaxbaum jede Aufrufkette, die mit
   `….from("tabelle")` beginnt und LIEST. Ein Befund entsteht, wenn alle
   vier zutreffen:

     1. keine Begrenzung  (`range` · `limit` · `single` · `maybeSingle`
        · `head: true`)
     2. kein Filter auf eine EINZEL-ID (siehe unten)
     3. die Tabelle steht nicht in `DARF_UNGEPAGT`
     4. es ist kein Schreibvorgang und kein Storage-Bucket

   ⚠ KEIN REGEX AUF QUELLTEXT. Das ist in diesem Projekt eine feste Regel
   (`src/test-helpers/quelltext.ts` nennt vier Fehlgriffe an zwei Tagen),
   und hier haette sie besonders wehgetan: `.limit(` steht auch in
   Kommentaren, die erklaeren, warum irgendwo keines steht.

   ── DREI BLINDE FLECKEN DES VORGAENGERS, die mitkommen mussten ───────

   1. **`sb.storage.from("bucket")` ist NICHT `sb.from("tabelle")`.** Das
      Messskript vom 11.09.2026 konnte es nicht unterscheiden und meldete
      zwei Buckets als Tabellen — aus 83 wurden 81. Unterschieden wird am
      EMPFAENGER des `from`, nicht am Namen.
      ⚠ Und Buckets haben eine EIGENE Grenze: `storage.list()` gibt
      standardmaessig 100 Objekte heraus, nicht 1000. Wer dort an
      PostgREST denkt, prueft die falsche Zahl. Diese Pruefung sagt dazu
      nichts.
   2. **`.js` mitlesen.** Die erste Fassung las nur `.tsx?` und uebersprang
      damit `src/domains/app/useAppData.js` — also genau die Datei, die die
      Mitgliederliste laedt.
   3. **Nur LESEN.** Ketten mit `insert`, `update`, `upsert`, `delete`,
      `rpc` zaehlen nicht mit.

   ── ⚠ WAS SIE NICHT SIEHT, und das gehoert dazu ──────────────────────

   · **Wie gross eine Tabelle wirklich ist.** Das ist Teil B.
   · **Eine Kette ueber eine Variable.** `const q = sb.from("x"); q.select()`
     entgeht dem Baum, weil er sagt, was DASTEHT.
   · **`.order()` ohne `.range()`.** Sortieren begrenzt nicht.
   · **Einen dynamisch gebauten Filternamen.** `.eq(spalte, wert)` mit
     `spalte` als Variable gilt als NICHT begrenzend — die vorsichtige
     Richtung.
   · **Testdateien.** Sie tragen Positivkontrollen mit erfundenen Tabellen
     (`db.from("x").select("id")`), die hier Befunde waeren. Ausgenommen
     sind `__tests__/`, `*.test.*` und `src/test-helpers/`.
   · **SQL, PHP, Migrationen.** Dort gibt es keine PostgREST-Grenze.

   ── AUFRUF ───────────────────────────────────────────────────────────

       node scripts/check-paging.mjs           prueft
       node scripts/check-paging.mjs --liste   zeigt ALLE Lesestellen,
                                               auch die erlaubten
   ══════════════════════════════════════════════════════════════════════ */
import ts from "typescript";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const BS = String.fromCharCode(92);

/* ══════════════════════════════════════════════════════════════════════
   DIE ENTSCHEIDUNG — welche Tabelle darf ungepagt gelesen werden

   ⚠ ⚠  DAS IST EINE ENTSCHEIDUNG, KEIN BESTAND. Wer hier eine Tabelle
   eintraegt, sagt: **diese waechst nicht auf tausend zu.** Das ist
   pruefbar falsch — und genau deshalb steht daneben Teil B, der den
   echten Bestand alle 60 Minuten misst.

   Zu jedem Eintrag gehoert der Grund. Ein Name ohne Begruendung ist eine
   Behauptung, die der Naechste fuer geprueft haelt.

   ⚠ WAS HIER NICHT STEHT, UND WARUM: `personen` (912), `mitglieder`
   (515), `eltern_kinder` (399), `sfv_personen` (387), `benutzer`,
   `kader`, `spiele`, `nachrichten*`, `benachrichtigungen`,
   `mitglieder_notizen`, `sfv_zuordnung`, `personenart_pro_person`.
   Alle koennen die 1000 erreichen — `benutzer` heute mit fuenf Konten,
   nach dem Ausrollen mit ueber 900.
   ══════════════════════════════════════════════════════════════════════ */
const DARF_UNGEPAGT = {
  /* ── Konfiguration: so viele Zeilen, wie jemand von Hand anlegt ──── */
  api_verbindungen:        "ein Eintrag je Anschluss — heute zwei",
  vereine:                 "ein Eintrag je Mandant",
  mitgliedtypen:           "acht Mitgliedtypen, vom Verein gepflegt",
  personenarten:           "eine Handvoll, vom Verein gepflegt",
  portal_rollen:           "sieben Rollen",
  portal_gruppen:          "Rechtebuendel, von Hand angelegt",
  portal_funktionen:       "Vereinsaemter, von Hand angelegt",
  portal_gruppen_teams:    "Gruppe x Team — beide Mengen klein",
  kader_rollen:            "sechs Kaderrollen",
  stufen:                  "Juniorenstufen des Verbands",
  team_stufen:             "Team x Stufe",
  module_config:           "ein Eintrag je Modul",
  modul_rechte:            "Modul x Rolle — Kreuzprodukt zweier kleiner Mengen",
  feldsichtbarkeit:        "Feld x Rolle, dito",
  mitgliedtyp_feldkonfig:  "Mitgliedtyp x Feldschluessel, dito",
  teams:                   "21 Mannschaften; eine Saison bringt ein paar dazu",
  team_module:             "Team x Modul",
  mitglieder_ansichten:    "gespeicherte Listenansichten, von Hand angelegt",

  /* ── Trainingsplan: je Saison von Hand gepflegt ──────────────────── */
  trainingsplaetze:        "die Plaetze des Vereins",
  trainingsplan_vorlagen:  "je Team eine Vorlage pro Saison",
  trainingsplan_slots:     "Slots je Vorlage — Wochentag x Platz",
  trainingsplan_ausnahmen: "Absagen je Saison",

  /* ── Ableitungen des Verbands: durch den Wettbewerb begrenzt ─────── */
  ranglisten:              "Gruppen des FCH x Mannschaften darin — 232 Zeilen "
                         + "ueber 21 Gruppen (gemessen 14.08.2026)",
  sfv_team_logos:          "ein Wappen je Gegnerverein",

  /* ── Waechst, wird aber nachweislich nur begrenzt gelesen ────────── */
  api_sync_log:            "waechst (631 am 11.09.2026), aber ALLE vier "
                         + "Lesestellen tragen .limit() — 50 / 20 / 1 / 1",
};

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DER FILTER AUF EINE EINZEL-ID — und warum er die SPALTE liest

   Eine Kette wie `.eq("spiel_id", x)` liest die Zeilen EINES Spiels; die
   Tabelle darf dabei beliebig wachsen. Dasselbe gilt fuer
   `.eq("person_id", …)`, `.in("id", auswahl)` und jeden anderen
   Fremdschluessel auf eine einzelne Zeile.

   ⚠ ⚠  GEPRUEFT WIRD DIE SPALTE, NIEMALS DAS VERB. Die erste Fassung
   dieser Regel stand auf „Tabelle + `eq`" — und `eq` sagt NICHTS
   darueber, WAS begrenzt wird. Sie deckte damit auch

       .from("spiel_aufstellung").select("*").eq("verein_id", vereinId)

   ab, also die GANZE Tabelle bei einem Mandanten. **Zwei echte
   Kuerzungen waeren hinter der Ausnahme verschwunden, fuer die die
   Pruefung gebaut wurde** (meldungZuordnung.ts:47 und namenLauf.ts:120,
   gemessen 11.09.2026 bei 2341 Zeilen).

   > **Ein Filter auf ein VERB prueft eine Schreibweise, ein Filter auf
   > eine SPALTE prueft die Sache.** Dieselbe Regel wie ueberall in
   > diesem Projekt — hier im Pruefwerkzeug selbst.

   ⚠ Die Kardinalitaet bleibt unbeweisbar: der Baum sieht die Spalte,
   nicht wie viele Zeilen daran haengen. Ein Kind hat wenige Eltern, ein
   Spiel zwei Kader — das ist Domaenenwissen, kein Beweis. Die Regel ist
   deshalb eine ANNAHME, und sie steht hier benannt statt stillschweigend
   im Hauptfilter.
   ══════════════════════════════════════════════════════════════════════ */

/** Spalten, die wie eine Begrenzung AUSSEHEN und keine sind. */
const KEINE_BEGRENZUNG = new Set([
  /* ⚠ Der haeufigste Filter der ganzen Codebasis — und er begrenzt bei
     einem Mandanten auf 100 %. Genau hier lag der Fehler der ersten
     Fassung. */
  "verein_id",
  /* Ein Kennzeichen, kein Schluessel: `aktiv` trifft die Mehrheit. */
  "aktiv", "active", "auto_sync", "ist_admin", "ist_eigener",
  /* Einteilungen, keine Einzelzeilen. */
  "herkunft", "saison", "typ", "typ_id", "art_id", "key", "status",
  "referenz_typ", "sfv_status", "sfv_saison_id",
]);

/** Ist dieser Spaltenname ein Verweis auf EINE Zeile? */
function istEinzelId(spalte) {
  if (typeof spalte !== "string" || KEINE_BEGRENZUNG.has(spalte)) return false;
  return spalte === "id" || spalte.endsWith("_id");
}

/* Begrenzer und Schreibglieder — Namen aus der supabase-js-Kette. */
const BEGRENZT = new Set(["range", "limit", "single", "maybeSingle"]);
const SCHREIBT = new Set(["insert", "update", "upsert", "delete", "rpc"]);
const FILTERGLIED = new Set([
  "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
  "like", "ilike", "contains", "containedBy", "overlaps", "filter", "or", "match",
]);

const ORDNER = ["src", "supabase/functions"];

/* ── Dateien ───────────────────────────────────────────────────────── */
function dateien(ordner, raus = []) {
  if (!existsSync(ordner)) return raus;
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n).split(BS).join("/");
    if (statSync(p).isDirectory()) {
      if (n === "__tests__" || n === "test-helpers" || n === "node_modules") continue;
      dateien(p, raus);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(n)) continue;
    if (/\.test\.|\.spec\./.test(n)) continue;
    raus.push(p);
  }
  return raus;
}

/* ── Eine Aufrufkette rueckwaerts lesen ────────────────────────────────
   `sb.from("x").select("y").eq(…)` → glieder [from, select, eq], basis `sb`.
   ⚠ `basis` ist der Punkt, an dem die Kette anfaengt — bei
   `sb.storage.from(…)` ist das `sb.storage`, und nur daran laesst sich
   ein Bucket von einer Tabelle unterscheiden. */
function kette(aufruf) {
  const glieder = [];
  let n = aufruf;
  while (ts.isCallExpression(n)) {
    const z = n.expression;
    const name = ts.isPropertyAccessExpression(z) ? z.name.text
      : ts.isIdentifier(z) ? z.text : "";
    const texte = n.arguments
      .filter((a) => ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))
      .map((a) => a.text);
    const argumente = n.arguments.map((a) => a.getText());
    glieder.unshift({ name, texte, argumente });
    n = ts.isPropertyAccessExpression(z) ? z.expression : z;
  }
  return { glieder, basis: n.getText() };
}

/**
 * Ist dieser Aufruf nur ein GLIED einer laengeren Kette?
 *
 * Bei `a.from("x").select("y")` ist `a.from("x")` ein CallExpression, das
 * als `expression` eines PropertyAccess steckt, der wiederum die
 * `expression` des aeusseren Aufrufs ist. Nur das aeusserste Glied traegt
 * die vollstaendige Kette — und nur an ihm ist zu sehen, ob irgendwo ein
 * `.limit()` haengt.
 */
function istInnenglied(n) {
  const p = n.parent;
  return !!p && ts.isPropertyAccessExpression(p) && p.expression === n
    && !!p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p;
}

/** Alle `from(…)`-Ketten einer Quelle, klassifiziert. */
function ketten(datei, quelle) {
  const baum = ts.createSourceFile(datei, quelle, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const raus = [];
  (function geh(n) {
    if (ts.isCallExpression(n) && !istInnenglied(n)) {
      const { glieder, basis } = kette(n);
      const kopf = glieder[0];
      if (kopf && kopf.name === "from" && kopf.texte.length === 1) {
        const namen = glieder.map((g) => g.name);
        /* ⚠ Der erste Zeichenketten-Parameter eines Filterglieds ist der
           Spaltenname (`.eq("spiel_id", x)`). Ein dynamisch gebauter
           Name taucht hier gar nicht auf und gilt als nicht begrenzend. */
        const filterSpalten = glieder
          .filter((g) => FILTERGLIED.has(g.name))
          .map((g) => g.texte[0]);
        raus.push({
          datei,
          zeile: baum.getLineAndCharacterOfPosition(n.getStart()).line + 1,
          tabelle: kopf.texte[0],
          /* ⚠ Der Empfaenger entscheidet, nicht der Name: `sb.storage.from`
             holt einen Bucket, `sb.from` eine Tabelle. */
          istStorage: /(^|\.)storage$/.test(basis.trim()),
          schreibt: namen.some((x) => SCHREIBT.has(x)),
          begrenzt: namen.some((x) => BEGRENZT.has(x))
            /* `head: true` steht als Objekteigenschaft im zweiten Argument
               von `select` — eine Zaehlabfrage liest keine Zeilen. */
            || glieder.some((g) => g.argumente.some((a) => /\bhead\s*:\s*true\b/.test(a))),
          einzelId: filterSpalten.find(istEinzelId) ?? null,
          filterSpalten: filterSpalten.filter((x) => typeof x === "string"),
          kette: namen.join("."),
        });
      }
    }
    n.forEachChild(geh);
  })(baum);
  return raus;
}

function istBefund(k) {
  if (k.istStorage || k.schreibt || k.begrenzt) return false;
  if (k.einzelId) return false;
  return !Object.prototype.hasOwnProperty.call(DARF_UNGEPAGT, k.tabelle);
}

/* ══════════════════════════════════════════════════════════════════════
   DIE POSITIVKONTROLLE — Pflicht, und sie laeuft VOR der Pruefung

   ⚠ Eine Suchpruefung, deren SUCHE kaputt ist, findet nichts — und ist
   damit GRUEN. Sie scheitert nach oben. Deshalb wird zuerst an einem
   Schnipsel nachgewiesen, dass die Regel ueberhaupt greifen KANN.

   ⚠ ⚠ UND IN BEIDE RICHTUNGEN. Ein Melder, der immer anschlaegt, waere
   von einem richtigen nicht zu unterscheiden — die zweite Haelfte ist
   deshalb ein Schnipsel, in dem NICHTS gefunden werden darf. Sie deckt
   jeden der fuenf Ausnahmegruende genau einmal ab, und die letzte Zeile
   ist die, an der die erste Fassung gescheitert waere.
   ══════════════════════════════════════════════════════════════════════ */
/* ⚠ ⚠ ZEILE `d` IST DIE WICHTIGSTE, und sie hat gefehlt. Eine Sabotage,
   die `istEinzelId()` auf `true` festnagelte, ist durch die ersten drei
   Zeilen SPURLOS durchgelaufen: `a`/`b` haben gar keinen Filter, `c`
   filtert auf `verein_id` und scheitert schon an `KEINE_BEGRENZUNG`.
   Keine von ihnen fasst den Suffix-Test ueberhaupt an — die Kontrolle
   war gruen, waehrend zwei echte Befunde verschwanden.

   `nachname` ist weder eine Einzel-Id noch in `KEINE_BEGRENZUNG`: nur an
   dieser Zeile faellt auf, wenn der Unterscheider kaputt ist. */
const KONTROLLE_FINDET = `
  const a = await sb.from("personen").select("*");
  const b = await sb.from("spiel_aufstellung").select("*").order("id");
  const c = await sb.from("spiel_aufstellung").select("*").eq("verein_id", v);
  const d = await sb.from("personen").select("*").eq("nachname", n);
`;
const KONTROLLE_SCHWEIGT = `
  const a = await sb.from("personen").select("*").limit(10);
  const b = await sb.from("personen").select("*").range(0, 999);
  const c = await sb.from("personen").select("id", { count: "exact", head: true });
  const d = await sb.from("personen").select("*").maybeSingle();
  const e = await sb.storage.from("mitglieder-fotos").list();
  const f = await sb.from("personen").insert({ name: "x" }).select("id");
  const g = await sb.from("api_verbindungen").select("*");
  const h = await sb.from("spiel_aufstellung").select("*").eq("spiel_id", s);
`;

function befunde(quellen) {
  const raus = [];
  for (const [datei, text] of quellen) for (const k of ketten(datei, text)) {
    if (istBefund(k)) raus.push(k);
  }
  return raus;
}

const findet = befunde([["kontrolle-findet.ts", KONTROLLE_FINDET]]);
if (findet.length !== 4) {
  console.error("check-paging: ⚠ Die Pruefung greift nicht in ihrer eigenen "
    + `Positivkontrolle (${findet.length} statt 4 Befunde).`);
  console.error("              Sie ist kaputt — nicht der geprüfte Code. Solange");
  console.error("              das so ist, waere jedes „bestanden\" wertlos.");
  process.exit(1);
}
const schweigt = befunde([["kontrolle-schweigt.ts", KONTROLLE_SCHWEIGT]]);
if (schweigt.length !== 0) {
  console.error("check-paging: ⚠ Die Pruefung schlaegt an, wo nichts ist "
    + `(${schweigt.length} Befund(e) in der Gegenprobe):`);
  for (const k of schweigt) console.error(`              ${k.tabelle}  ${k.kette}`);
  console.error("              Ein Melder, der grundlos anschlaegt, wird nach dem");
  console.error("              dritten Mal abgeschaltet — also schlechter als keiner.");
  process.exit(1);
}

/* ── Der Durchgang ─────────────────────────────────────────────────── */
const quellen = [];
for (const o of ORDNER) for (const d of dateien(o)) quellen.push([d, readFileSync(d, "utf8")]);

const alle = quellen.flatMap(([d, t]) => ketten(d, t));
const lesen = alle.filter((k) => !k.schreibt && !k.istStorage);
const funde = befunde(quellen);

/* `--liste` zeigt ALLE Lesestellen, auch die erlaubten — fuer den
   naechsten Durchgang, wenn eine Tabelle doch zu wachsen beginnt. */
if (process.argv.includes("--liste")) {
  const nach = new Map();
  for (const k of lesen) {
    if (!nach.has(k.tabelle)) nach.set(k.tabelle, []);
    nach.get(k.tabelle).push(k);
  }
  for (const [t, ks] of [...nach].sort((a, b) => b[1].length - a[1].length)) {
    const offen = ks.filter((k) => !k.begrenzt);
    const wie = Object.prototype.hasOwnProperty.call(DARF_UNGEPAGT, t)
      ? `  erlaubt — ${DARF_UNGEPAGT[t]}` : "";
    console.log(`${t}  ${ks.length} Lesestelle(n), davon ${offen.length} ohne Begrenzer${wie}`);
    for (const k of offen) {
      const wieso = k.einzelId ? `Filter auf ${k.einzelId}` : "ohne Einzel-Id";
      console.log(`     ${k.datei}:${k.zeile}  ${k.kette}   [${wieso}]`);
    }
  }
  console.log("");
}

const tabellen = new Set(lesen.map((k) => k.tabelle));

if (funde.length) {
  const nachTabelle = new Map();
  for (const k of funde) {
    if (!nachTabelle.has(k.tabelle)) nachTabelle.set(k.tabelle, []);
    nachTabelle.get(k.tabelle).push(k);
  }
  console.error(`\ncheck-paging: ${funde.length} ungepagte Lesestelle(n) auf `
    + `${nachTabelle.size} Tabelle(n), die wachsen koennen\n`);
  for (const [t, ks] of [...nachTabelle].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`  ${t}`);
    for (const k of ks) {
      const f = k.filterSpalten.length ? `   [nur ${k.filterSpalten.join(", ")}]` : "";
      console.error(`     · ${k.datei}:${k.zeile}  ${k.kette}${f}`);
    }
  }
  console.error(`\n⚠ PostgREST liefert hoechstens 1000 Zeilen und meldet das NICHT:`);
  console.error(`  error bleibt null, data hat genau 1000 Eintraege.\n`);
  console.error(`  Drei Wege, und der erste ist meistens der richtige:`);
  console.error(`    · alleSeiten() aus src/domains/db/alleSeiten.ts — pagt und haelt`);
  console.error(`      am Ende gegen count: "exact"`);
  console.error(`    · .limit() / .range(), wenn ein Ausschnitt genuegt`);
  console.error(`    · die Tabelle in DARF_UNGEPAGT eintragen — MIT Begruendung, wenn`);
  console.error(`      sie strukturell klein ist und bleibt\n`);
  process.exit(1);
}

console.log(`check-paging: ${lesen.length} Lesestellen ueber ${tabellen.size} Tabellen `
  + `geprueft — keine ungepagte`);
console.log(`              auf einer Tabelle, die wachsen kann.`);
console.log(`              ⚠ Das heisst: der Code pagt oder filtert. NICHT: die Tabelle`);
console.log(`                ist klein — das weiss nur die Datenbank (Teil B, im`);
console.log(`                Sync-Waechter).`);
