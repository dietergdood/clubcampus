/* ═══════════════════════════════════════════════════════════════
   ClubCampus — scripts/check-plugin.mjs

   Strukturprüfungen an `wordpress/wp-export-empfaenger.php` — über den
   PHP-TOKENIZER, nicht über den Text.

     node scripts/check-plugin.mjs

   ┌───────────────────────────────────────────────────────────┐
   │ ⚠ WER HIER EINE PRÜFUNG ERGÄNZT, LIEST DAS:               │
   │                                                            │
   │   1. NICHT nach Zeichenketten suchen. `token_get_all()`    │
   │      klassifiziert Kommentare als T_COMMENT — sie kommen   │
   │      hier gar nicht erst an.                               │
   │                                                            │
   │   2. Jede Regel braucht eine POSITIVKONTROLLE. `pruefe()`  │
   │      verlangt sie und läuft sie zuerst gegen einen         │
   │      Schnipsel, in dem die Regel greifen MUSS.             │
   │                                                            │
   │   ⚠ Punkt 2 ist der wichtigere: eine Suchprüfung, deren    │
   │   SUCHE kaputt ist, findet nichts — und ist damit GRÜN.    │
   └───────────────────────────────────────────────────────────┘

   ⚠ WARUM ES DAS GIBT. Die Regeln standen bis zum 08.09.2026 als
   Textsuche in `wpExportBestand.test.ts` und haben sich zweimal
   vergriffen — `post_modified` und `wp_insert_post` wurden in
   KOMMENTAREN gefunden, die erklären, warum sie dort fehlen. Beide
   Male war der Test rot, ohne dass am Code etwas falsch war; die
   naheliegende „Reparatur" (Kommentare umformulieren) hätte den Test
   grün gemacht und ab da die Beschreibung des Fehlers bewacht statt
   den Fehler.

   ── ⚠ GRENZE — ABSICHTLICH ENG ───────────────────────────────────
   · **Genau eine Datei**, und die Regeln kennen ihre Funktionen beim
     Namen. Das ist kein Mangel: was hier steht, ist eine Zusage über
     DIESES Plugin, keine allgemeine Lint-Regel.
   · **Nicht mit `check:php` zusammenlegen.** Das prüft Syntax über
     alle PHP-Dateien; dieses hier prüft Inhalt über eine. Die Leiter
     php → Docker → rot teilen sie sich über `php-lauf.mjs`.
   · Der Tokenizer sagt, was DASTEHT. Ein Aufruf über eine Variable
     (`$f = 'wp_update_post'; $f();`) entgeht ihm.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { werkzeugDa, wieGelaufen, phpLauf, fehltMeldung } from "./php-lauf.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATEI = join(WURZEL, "wordpress", "wp-export-empfaenger.php");

if (!existsSync(DATEI)) {
  console.log("check-plugin: wordpress/wp-export-empfaenger.php fehlt — nichts zu prüfen.");
  process.exit(0);
}
if (!werkzeugDa) {
  console.error(fehltMeldung("check-plugin"));
  process.exit(1);
}

/* ── Der Zerleger. Läuft in PHP, weil PHP seinen eigenen Quelltext kennt. ──
   Er gibt JSON zurück: je Funktion die aufgerufenen Namen und alle
   Bezeichner, dazu die Zeichenketten jedes register_rest_route-Aufrufs. */
const ZERLEGER = `
$src = stream_get_contents(STDIN);
$roh = token_get_all($src);
$t = [];
foreach ($roh as $x) {
  if (is_array($x)) {
    if (in_array($x[0], [T_COMMENT, T_DOC_COMMENT, T_WHITESPACE], true)) continue;
    $t[] = [token_name($x[0]), $x[1]];
  } else { $t[] = ['CHAR', $x]; }
}
$n = count($t);
$istRuf = function ($i) use ($t, $n) {
  return $t[$i][0] === 'T_STRING' && $i + 1 < $n && $t[$i+1] === ['CHAR', '('];
};
$funktionen = [];
for ($i = 0; $i < $n; $i++) {
  if ($t[$i][0] !== 'T_FUNCTION' || $i + 1 >= $n || $t[$i+1][0] !== 'T_STRING') continue;
  $name = $t[$i+1][1];
  $j = $i + 2;
  while ($j < $n && $t[$j] !== ['CHAR', '{']) $j++;
  if ($j >= $n) continue;
  $tiefe = 0; $rufe = []; $bez = []; $texte = [];
  for (; $j < $n; $j++) {
    if ($t[$j] === ['CHAR', '{']) $tiefe++;
    elseif ($t[$j] === ['CHAR', '}']) { $tiefe--; if ($tiefe === 0) break; }
    elseif ($t[$j][0] === 'T_STRING') { $bez[] = $t[$j][1]; if ($istRuf($j)) $rufe[] = $t[$j][1]; }
    elseif ($t[$j][0] === 'T_CONSTANT_ENCAPSED_STRING') $texte[] = trim($t[$j][1], "'\\"");
  }
  $zaehlung = [];
  foreach ($rufe as $r) { $zaehlung[$r] = ($zaehlung[$r] ?? 0) + 1; }
  $funktionen[$name] = ['rufe' => array_values(array_unique($rufe)),
                        'rufe_zaehlung' => $zaehlung,
                        'bezeichner' => array_values(array_unique($bez)),
                        'texte' => $texte];
}
$routen = [];
for ($i = 0; $i < $n; $i++) {
  if ($t[$i][0] !== 'T_STRING' || $t[$i][1] !== 'register_rest_route') continue;
  $j = $i + 1; $tiefe = 0; $texte = [];
  for (; $j < $n; $j++) {
    if ($t[$j] === ['CHAR', '(']) $tiefe++;
    elseif ($t[$j] === ['CHAR', ')']) { $tiefe--; if ($tiefe === 0) break; }
    elseif ($t[$j][0] === 'T_CONSTANT_ENCAPSED_STRING') $texte[] = trim($t[$j][1], "'\\"");
  }
  $routen[] = $texte;
}
echo json_encode(['funktionen' => $funktionen, 'routen' => $routen]);
`;

function zerlege(quelle) {
  return JSON.parse(phpLauf(["-r", ZERLEGER], quelle));
}

/* ── Die Regeln ──────────────────────────────────────────────────────────
   Jede nennt ihre Frage, ihre Prüfung und den Schnipsel, in dem sie
   greifen MUSS. Ohne den letzten wäre nicht zu unterscheiden, ob die
   Prüfung nichts gefunden hat oder nichts finden KANN. */
const SCHREIBT = [
  "wp_insert_post", "wp_update_post", "wp_delete_post", "wp_trash_post",
  "update_field", "update_post_meta", "delete_post_meta", "add_post_meta",
];

const REGELN = [
  {
    frage: "cc_route_bestand schreibt nichts",
    pruefe: (b) => (b.funktionen.cc_route_bestand?.rufe ?? []).filter(r => SCHREIBT.includes(r)),
    kontrolle: "<?php function cc_route_bestand() { update_field('a', 1, 2); }",
    erwarteImKontrollfall: 1,
  },
  {
    frage: "cc_route_bestand gibt post_modified nicht heraus",
    pruefe: (b) => (b.funktionen.cc_route_bestand?.bezeichner ?? []).filter(x => x === "post_modified"),
    kontrolle: "<?php function cc_route_bestand() { $x = $post->post_modified; }",
    erwarteImKontrollfall: 1,
  },
  {
    frage: "cc_darf_schreiben prüft keine Benutzerrolle mehr",
    pruefe: (b) => (b.funktionen.cc_darf_schreiben?.rufe ?? [])
      .filter(r => ["current_user_can", "is_user_logged_in", "wp_get_current_user"].includes(r)),
    kontrolle: "<?php function cc_darf_schreiben() { return current_user_can('edit_posts'); }",
    erwarteImKontrollfall: 1,
  },
  {
    frage: "die Route /bestand ist GET, nicht POST",
    pruefe: (b) => (b.routen.find(r => r.includes("/bestand")) ?? ["(keine Route /bestand)"])
      .filter(x => x === "POST" || x === "(keine Route /bestand)"),
    kontrolle: "<?php register_rest_route('cc/v1', '/bestand', array('methods' => 'POST'));",
    erwarteImKontrollfall: 1,
  },
];

/* Regeln, die etwas VERLANGEN statt zu verbieten — hier ist der Fund die
   Erwartung, und die Kontrolle zeigt den Fall, in dem er ausbleibt. */
const PFLICHTEN = [
  {
    frage: "die Anmeldung läuft über den Schlüssel, nicht über eine Benutzerrolle",
    pruefe: (b) => (b.funktionen.cc_darf_schreiben?.rufe ?? []).filter(r => r === "hash_equals"),
    kontrolle: "<?php function cc_darf_schreiben() { return current_user_can('edit_posts'); }",
  },
  {
    frage: "der Kopfname X-FCH-Schluessel steht als Vertrag in der Datei",
    pruefe: (b) => (b.funktionen.cc_darf_schreiben?.texte ?? []).filter(t => t === "X-FCH-Schluessel"),
    kontrolle: "<?php function cc_darf_schreiben() { $x = 1; }",
  },
  {
    frage: "doppelte sfv_match_id werden gesucht",
    pruefe: (b) => (b.funktionen.cc_route_spiele?.rufe ?? []).filter(r => r === "cc_doppelte_match_ids"),
    kontrolle: "<?php function cc_route_spiele() { $x = 1; }",
  },

  {
    frage: "cc_route_bestand nennt die Zeit mit Zone (get_post_time)",
    pruefe: (b) => (b.funktionen.cc_route_bestand?.rufe ?? []).filter(r => r === "get_post_time"),
    kontrolle: "<?php function cc_route_bestand() { $x = 1; }",
  },
  {
    frage: "cc_route_spiele stempelt jeden geschriebenen Beitrag",
    pruefe: (b) => (b.funktionen.cc_route_spiele?.rufe ?? []).filter(r => r === "cc_stempel"),
    kontrolle: "<?php function cc_route_spiele() { $x = 1; }",
  },
  {
    frage: "die Route /bestand ist überhaupt registriert",
    pruefe: (b) => (b.routen.find(r => r.includes("/bestand")) ?? []).filter(x => x === "GET"),
    kontrolle: "<?php register_rest_route('cc/v1', '/spiele', array('methods' => 'POST'));",
  },
];

/* ⚠ EIGENE FORM, WEIL „grösser als null" HIER NICHT GENÜGT.

   Die erste Fassung zählte `cc_bericht_ablegen` und verlangte mehr als null.
   Bei der Gegenprobe habe ich den ABSCHLUSSBERICHT entfernt — die zwei
   Abbruch-Berichte blieben stehen, die Regel blieb GRÜN, und genau der Fall,
   um den es geht (ein gelungener Lauf, den niemand sieht), war ungedeckt.

   Die Zusage lautet „JEDER Ausgang berichtet". Also wird gegen die Zahl der
   Ausgänge geprüft: so viele `cc_bericht_ablegen` wie `new WP_REST_Response`.
   Kommt ein Ausgang dazu, wird die Regel rot — und das ist der Moment, in dem
   jemand entscheiden muss, ob er berichtet. */
const MIT_BERICHT = ["cc_route_spiele", "cc_route_ranglisten"];

const baum = zerlege(readFileSync(DATEI));
const befunde = [];

for (const fn of MIT_BERICHT) {
  const z = baum.funktionen[fn]?.rufe_zaehlung ?? {};
  const antworten = z.WP_REST_Response ?? 0;
  const berichte = z.cc_bericht_ablegen ?? 0;
  if (antworten === 0) {
    befunde.push(`⚠ ${fn}: keine einzige Antwort gefunden — die Prüfung sieht `
      + `die falsche Funktion an, nicht die Datei ist kaputt.`);
  } else if (berichte !== antworten) {
    befunde.push(`${fn}: ${antworten} Ausgänge, aber ${berichte} Bericht(e) — `
      + `ein Ausgang schweigt, und dort sieht der Verein nichts.`);
  }
}

for (const r of REGELN) {
  const kontrolle = r.pruefe(zerlege(r.kontrolle));
  if (kontrolle.length < r.erwarteImKontrollfall) {
    befunde.push(`⚠ Die Prüfung „${r.frage}" greift nicht einmal in ihrer eigenen\n`
      + `     Positivkontrolle. Sie ist kaputt — nicht das Plugin.`);
    continue;
  }
  const treffer = r.pruefe(baum);
  if (treffer.length > 0) befunde.push(`${r.frage} — verletzt durch: ${treffer.join(", ")}`);
}

for (const p of PFLICHTEN) {
  /* Umgekehrte Kontrolle: im Schnipsel FEHLT das Verlangte, die Prüfung
     muss dort also leer ausgehen. Fände sie auch dort etwas, prüfte sie
     nichts. */
  if (p.pruefe(zerlege(p.kontrolle)).length > 0) {
    befunde.push(`⚠ Die Prüfung „${p.frage}" findet auch dort etwas, wo nichts ist.`);
    continue;
  }
  if (p.pruefe(baum).length === 0) befunde.push(`${p.frage} — nicht erfüllt`);
}

if (befunde.length === 0) {
  const anzahl = REGELN.length + PFLICHTEN.length + MIT_BERICHT.length;
  console.log(`check-plugin: ${anzahl} Regeln geprueft${wieGelaufen} — alle erfuellt.`);
  console.log("              ⚠ Ueber den PHP-Tokenizer, nicht ueber den Text:");
  console.log("                Kommentare koennen nicht mitgezaehlt werden.");
  process.exit(0);
}

console.error(`check-plugin: ${befunde.length} Befund(e) in wordpress/wp-export-empfaenger.php\n`);
for (const b of befunde) console.error(`  · ${b}\n`);
process.exit(1);
