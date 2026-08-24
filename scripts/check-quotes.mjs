/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-quotes.mjs

   Findet ein deutsches Anführungszeichen, das einen "-String
   zerreisst.

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
const ORDNER = ["src", "scripts", join("supabase", "functions")];

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
            treffer.push({ zeile: anfang, zeichen: auf[0], text: inhalt.slice(0, 70) });
          }
        }
      }
      continue;
    }

    i++;
  }
  return treffer;
}

let gesamt = 0;
for (const ordner of ORDNER) {
  let liste;
  try { liste = dateien(join(WURZEL, ordner)); } catch { continue; }
  for (const datei of liste) {
    const treffer = pruefe(readFileSync(datei, "utf8"));
    for (const t of treffer) {
      gesamt++;
      console.log(`${relative(WURZEL, datei).split("\\").join("/")}:${t.zeile}  ${t.zeichen}  ${t.text}`);
    }
  }
}

if (gesamt > 0) {
  console.error(`\ncheck-quotes: ${gesamt} unpaarige deutsche Anführungszeichen in "-Strings.`);
  console.error("Vermutlich ist das schliessende Zeichen ein ASCII-\" — es beendet den String.");
  process.exit(1);
}
console.log("check-quotes: keine unpaarigen deutschen Anführungszeichen in \"-Strings.");
