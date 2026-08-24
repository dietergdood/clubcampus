/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-quotes.mjs

   Zwei Prüfungen auf Zeichen in JS-Stringliteralen:

     1. ein deutsches Anführungszeichen, das einen "-String zerreisst
     2. Umlaut-Ersatzschreibung (loeschen statt löschen) in UI-Text

     node scripts/check-quotes.mjs

   ⚠ WARUM ES DAS GIBT — und warum die Regel dafür nicht genügt hat.
   In `CLAUDE.md` steht seit dem 23.08.2026: „Deutsche
   Anführungszeichen zerstören jedes JS-Stringliteral, in dem sie
   stehen." Danach ist es noch dreimal passiert, zuletzt am
   25.08.2026 in Testnamen.

   ⚠ Der Grund ist nicht Nachlässigkeit, sondern dass der Satz NICHT
   STIMMT — und ein Satz, der zu viel verbietet, wird beim Schreiben
   übergangen. Die drei Zeichen „ “ ” sind U+201E/C/D und beenden
   keinen String; die halbe Codebasis benutzt sie gefahrlos. Zerrissen
   wird ein String vom ASCII-Zeichen " (U+0022), das jemand als
   SCHLIESSENDES deutsches Anführungszeichen tippt — und nur dann,
   wenn der String selbst mit " begrenzt ist.

   Gemessen: 35 Stringliterale im Bestand enthalten deutsche
   Anführungszeichen, davon ist keines kaputt.

   Diese Prüfung sucht deshalb nicht das Zeichen, sondern die
   UNPAARIGE Öffnung. Der Build findet dasselbe, nur später und mit
   einer Meldung, die drei Zeilen weiter zeigt; hier steht Datei,
   Zeile und der Text.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
/* ⚠  steht NICHT hier. Zwei Gruende: Werkzeuge haben keine
   Oberflaeche, und ihre Regex-Literale bringen den schlichten Scanner oben
   durcheinander — er haelt ein / fuer den Anfang eines Kommentars. Ein
   Fehlalarm im eigenen Werkzeug ist der sicherste Weg, es abzuschalten. */
const ORDNER = ["src", join("supabase", "functions")];

/* ⚠ GEMESSEN AM 25.08.2026, UND ES BERICHTIGT DIE REGEL IN `CLAUDE.md`.
   Dort stand, deutsche Anfuehrungszeichen zerstoerten jedes JS-Stringliteral,
   in dem sie stehen. Das stimmt nicht — und WEIL es nicht stimmt, hat die
   Regel nicht geholfen:

     „ ist U+201E, “ ist U+201C, ” ist U+201D. KEINES davon beendet einen
     String. Zerrissen wird er vom ASCII-Zeichen " (U+0022), das jemand als
     SCHLIESSENDES deutsches Anfuehrungszeichen tippt.

   Deshalb ist `describe('... heisst „Austritt..." und ...')` voellig in
   Ordnung: der String ist mit ' begrenzt, das ASCII-" darin ist harmlos.
   Gemessen im Bestand: 35 Stellen mit deutschen Anfuehrungszeichen in
   Stringliteralen, davon 0 kaputt.

   Das Erkennungsmerkmal ist deshalb nicht das Zeichen, sondern die UNPAARIGE
   Oeffnung: ein „ in einem "-String ohne schliessendes “/” heisst, dass der
   String vorzeitig geendet hat. Genau dort steht der Fehler. */
const OEFFNER    = /[\u201E\u201C\u00AB]/;   // „ “ «
const SCHLIESSER = /[\u201C\u201D\u00BB]/;   // “ ” »

/* ═══ 2 · UMLAUT-ERSATZSCHREIBUNG IN UI-TEXT ═══════════════════════
   „3 Personen loeschen" statt „3 Personen löschen". Entstanden am
   25.08.2026, als ein ganzes Modal über ein Python-Skript geschrieben wurde
   und die Ersatzschreibung durchgängig mitkam. ⚠ KEIN WERKZEUG MELDET DAS:
   Typecheck grün, Build grün, 814 Tests grün — sichtbar erst auf dem Schirm.
   In KOMMENTAREN ist die Ersatzschreibung im Projekt üblich und richtig.

   ⚠ EINE REGEL GEHT HIER NICHT, und das ist der Grund für die Liste.
   „ae/oe/ue ist verdächtig" schlägt bei „neue", „aktuell", „Poesie" an —
   und eine Prüfung mit Fehlalarm wird nach dem dritten Mal abgeschaltet.
   Eine Liste der häufigsten Fälle fängt fast alles und trifft nie falsch.
   (Vorschlag Didi, 25.08.2026.)

   ⚠ UND SIE DARF KEIN KORREKTES WORT ENTHALTEN. Beim ersten Entwurf standen
   `muss` und `schliessen` darin — beides richtiges Deutsch (Schweiz), und
   die Prüfung meldete prompt „Mindestens ein Plan muss vorhanden sein."
   Wer die Liste erweitert, prüft jedes Wort daraufhin, ob es in korrekter
   Schreibung ohne Umlaut vorkommt: `muss`, `gross`, `Strasse`, `heisst`,
   `schliessen`, `weiss` sind alle richtig und gehören NICHT hierhin. */
const ERSATZSCHREIBUNG = [
  /* ⚠ STÄMME, NICHT VOLLFORMEN. Der erste Entwurf führte `pruefen`,
     `geprueft` und `pruefung` — und übersah `"Rechte nicht pruefbar"`, eine
     laufende Meldung der Edge Function. Eine Liste von Vollformen ist immer
     unvollständig, weil Deutsch weiterbildet; ein Stamm fängt jede Ableitung.

     Ein Stamm ist hier gefahrlos, WEIL die Ersatzschreibung in korrektem
     Deutsch nicht vorkommt: kein richtiges Wort enthält `pruef`, `loesch`
     oder `haett`. Genau deshalb darf aber nichts in die Liste, das auch ohne
     Umlaut richtig ist — siehe die Warnung darunter. */
  "loesch", "haett", "gaeb", "waer", "ueber", "uebrig",
  "fuer", "muess", "koenn", "moeglich", "waehl", "zurueck",
  "aender", "gehoer", "naechst", "spaet", "hoechst", "groess",
  "pruef", "laeuf", "faell", "haeng", "erklaer", "zaehl",
  "enthael", "erhael", "gueltig", "vollstaend", "zusaetz",
  "urspruen", "taetig", "beschaeftig", "regelmaess", "verfuegbar",
  "unterstuetz", "beruecksicht", "ausfuehr", "durchfuehr", "einfuehr",
];


/* ⚠ ZWEI FILTER, DAMIT DIE LISTE NICHT AN DER FALSCHEN STELLE TRIFFT.
   Gemessen im Bestand: ohne sie meldet die Prüfung 122 Stellen, davon fast
   alle richtig — Testnamen, Log-Meldungen, Tabellennamen, Variablen. */

/* a) Was NICHT geprüft wird: Testnamen und Log-Meldungen sind
      entwicklerseitig, dort ist die Ersatzschreibung gleichgültig. */
const ENTWICKLERTEXT = /(?:\bit|\bdescribe|\btest|console\.(?:log|error|warn|info|debug))\s*\(\s*$/;

/**
 * b) Bezeichner aus dem Text nehmen, bevor gesucht wird.
 *
 * `${austrittFuer.length}` ist eine Variable, `profil_geprueft_at` eine
 * Spalte, `person-loeschen` ein Function-Name — alle drei sind RICHTIG so
 * geschrieben und dürfen nicht als Text gelten.
 *
 * Was danach noch ein Leerzeichen hat, ist Prosa; ein Bezeichner hat keines.
 */
function nurText(inhalt) {
  return inhalt
    .replace(/\$\{[^}]*\}/g, " ")        // ${...}
    .replace(/[a-z0-9]+[_-][a-z0-9_-]+/gi, " ");  // snake_case, kebab-case
}

function dateien(dir) {
  let raus = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      raus = raus.concat(dateien(p));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
      raus.push(p);
    }
  }
  return raus;
}

/**
 * Laeuft einmal durch die Datei und merkt sich, wo man gerade steht:
 * im Code, in einem String, in einem Kommentar.
 *
 * ⚠ EIN REGEX ALLEIN GENUEGT NICHT, und das ist der ganze Punkt: die
 * Anfuehrungszeichen sind in Kommentaren richtig und nur in Strings falsch.
 * Wer bloss nach dem Zeichen sucht, meldet die halbe Codebasis — und eine
 * Pruefung, die staendig Fehlalarm gibt, wird abgeschaltet.
 */
function pruefe(text) {
  const treffer = [];
  let i = 0, zeile = 1;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (c === "\n") { zeile++; i++; continue; }

    /* Kommentare ueberspringen — dort sind die Zeichen erwuenscht. */
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] === "\n") zeile++;
        i++;
      }
      i += 2;
      continue;
    }

    /* Stringliteral: ' " ` — hier wird geprueft. */
    if (c === '"' || c === "'" || c === "`") {
      const anfang = zeile;
      const anfangIdx = i;
      const ende = c;
      let inhalt = "";
      i++;
      while (i < n && text[i] !== ende) {
        if (text[i] === "\\") { inhalt += text[i]; i++; if (i < n) { inhalt += text[i]; i++; } continue; }
        if (text[i] === "\n") {
          zeile++;
          /* Ein ' oder " ueber einen Zeilenumbruch hinweg ist kein String,
             sondern ein Apostroph im Text (z.B. in einem Kommentar, den der
             Kommentarsprung nicht erwischt hat). Abbrechen statt raten. */
          if (ende !== "`") { break; }
        }
        inhalt += text[i];
        i++;
      }
      i++;   // schliessendes Zeichen

      /* Nur "-Strings koennen so zerreissen. In '...' und `...` ist ein
         ASCII-" harmlos — dort ist ein unpaariges „ hoechstens unsauberer
         Text, und eine Pruefung, die das meldet, gibt Fehlalarm. */
      /* ── 2 · Ersatzschreibung ────────────────────────────────── */
      if (!ENTWICKLERTEXT.test(text.slice(Math.max(0, anfangIdx - 40), anfangIdx))) {
        const roh = nurText(inhalt);
        if (/\s/.test(roh.trim())) {
          const klein = roh.toLowerCase();
          const w = ERSATZSCHREIBUNG.filter(x => klein.includes(x));
          if (w.length) {
            treffer.push({ zeile: anfang, zeichen: w.join(","), art: "umlaut",
                           text: roh.trim().slice(0, 70) });
          }
        }
      }

      /* ── 1 · Unpaariges Anfuehrungszeichen ───────────────────── */
      if (ende === '"') {
        const auf = inhalt.match(OEFFNER);
        if (auf) {
          const rest = inhalt.slice(inhalt.indexOf(auf[0]) + 1);
          /* ⚠ Ein escaptes \\" schliesst ebenfalls, und zwar voellig gueltig:
             `"... nicht „dieselbe Person\\""` laeuft. Ohne diese Zeile war die
             Pruefung bei ihrem ersten Lauf schon einmal Fehlalarm — und eine
             Pruefung mit Fehlalarm wird abgeschaltet, dann ist sie schlechter
             als keine. */
          if (!SCHLIESSER.test(rest) && !rest.includes('\\"')) {
            treffer.push({ zeile: anfang, zeichen: auf[0], art: "quote", text: inhalt.slice(0, 70) });
          }
        }
      }
      continue;
    }

    i++;
  }
  return treffer;
}

let quotes = 0, umlaute = 0;
for (const ordner of ORDNER) {
  let liste;
  try { liste = dateien(join(WURZEL, ordner)); } catch { continue; }
  for (const datei of liste) {
    for (const t of pruefe(readFileSync(datei, "utf8"))) {
      if (t.art === "quote") quotes++; else umlaute++;
      const pfad = relative(WURZEL, datei).split("\\").join("/");
      console.log(`${t.art === "quote" ? "\u201e" : "ae"}  ${pfad}:${t.zeile}  ${t.zeichen}  ${t.text}`);
    }
  }
}

if (quotes + umlaute > 0) {
  if (quotes) {
    console.error(`\ncheck-quotes: ${quotes} unpaarige deutsche Anführungszeichen in "-Strings.`);
    console.error('Vermutlich ist das schliessende Zeichen ein ASCII-" — es beendet den String.');
  }
  if (umlaute) {
    console.error(`\ncheck-quotes: ${umlaute} Stringliterale mit Umlaut-Ersatzschreibung.`);
    console.error("In Kommentaren ist sie richtig — in UI-Text steht sie auf dem Schirm.");
  }
  process.exit(1);
}
console.log("check-quotes: keine unpaarigen Anführungszeichen, keine Ersatzschreibung in Texten.");
