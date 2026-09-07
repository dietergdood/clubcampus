/* ═══════════════════════════════════════════════════════════════
   Die Bestandsliste ZEIGT — sie löscht nicht (07.09.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Die Zusage ist eine Entscheidung von Didi, keine Eigenschaft
   des Codes: „Eine Liste, und Didi entscheidet pro Zeile. Kein
   Knopf, der zwanzig Beiträge auf einmal wegräumt — das ist
   dieselbe Aktion wie «Person löschen», nur auf fremdem Boden."

   Eine Zusage, die nur im Kommentar steht, ist eine Behauptung.
   Sie überlebt den nächsten Umbau nicht — und beim nächsten Mal
   liest jemand „hier wird ohnehin schon abgefragt" und hängt ein
   POST daran.

   ⚠ Der Deno-Code wird von `tsc` nicht gelesen und von keinem
   vitest-Lauf ausgeführt: er importiert von `esm.sh`. Was hier
   geht, ist eine STRUKTURPRÜFUNG auf den Quelltext — dasselbe
   Mittel wie bei „niemand löscht aus mitglieder" und bei
   `icons.test.ts`. Sie ist an keinen Aufrufer gebunden und hält
   deshalb über jeden Umbau.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const QUELLE = 'supabase/functions/wp-export/index.ts';
const PLUGIN = 'wordpress/clubcampus-export.php';

/**
 * Kommentare weg, bevor gesucht wird.
 *
 * ⚠ DIE ERSTE FASSUNG DIESER DATEI WAR ROT, UND ZWAR DREIMAL — alle drei
 * Treffer standen in KOMMENTAREN, die genau vor dem warnen, wonach gesucht
 * wurde. `cc_route_bestand()` erklärt in einem Kommentar, warum es
 * `post_modified` NICHT herausgibt und warum `wp_insert_post` das
 * Beitragsdatum setzt — und die Suche fand beide Wörter.
 *
 * Dieselbe Familie wie in `apiKacheln.test.jsx` und dieselbe wie in
 * CLAUDE.md: **ein Werkzeug, das nach Text sucht, trifft was gleich
 * AUSSIEHT, nicht was gleich GEMEINT ist.** Die Kommentare umzuformulieren
 * wäre die falsche Reparatur gewesen — der Test hätte danach die
 * Beschreibung des Fehlers bewacht statt den Fehler.
 */
function ohneKommentare(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*(\/\/|#).*$/gm, '');
}

/** Den Rumpf einer Funktion herausschneiden — grob über die Klammerbilanz. */
function rumpf(text: string, kopf: string): string {
  const a = text.indexOf(kopf);
  if (a < 0) throw new Error(`nicht gefunden: ${kopf}`);
  let i = text.indexOf('{', a), tiefe = 0;
  const start = i;
  for (; i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}' && --tiefe === 0) return text.slice(start, i + 1);
  }
  throw new Error('Klammern gehen nicht auf');
}

describe('wp-export: die Aktion `bestand`', () => {
  const quelle = fs.readFileSync(QUELLE, 'utf8');

  it('ist als gültige Aktion aufgezählt', () => {
    expect(quelle).toContain('const AKTIONEN = ["probe", "export", "bestand"];');
  });

  /* Der Kern. Ein `fetch` ohne Methode ist GET; alles andere wäre ein
     Schreibvorgang gegen die Website. */
  it('schreibt nicht — kein POST, kein PUT, kein DELETE gegen WordPress', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand()');
    expect(körper).toMatch(/clubcampus\/v1\/bestand/);
    expect(körper).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/i);
  });

  /* Ein Nachsehen ist kein Lauf. Stünde es im Protokoll, verschöbe es
     letzter_sync — und die Kachel meldete einen Export, den es nie gab. */
  it('schreibt nichts in die Datenbank — auch nicht ins Protokoll', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand()');
    for (const verboten of ['api_sync_log', 'api_verbindungen', '.insert(', '.update(', '.delete(']) {
      expect(körper).not.toContain(verboten);
    }
  });

  /* Ungekürzt: wer entscheiden soll, muss alle sehen. Dieselbe Lehre wie
     bei der Löschvorschau, deren Schwelle von 20 bei einem Stapel von
     zwei umfiel. */
  it('kürzt die Liste nicht', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand()');
    /* ⚠ Nicht pauschal auf .slice( prüfen: die Fehlerpfade kürzen den
       Antworttext von WordPress (text.slice(0, 200)), und das ist richtig
       so. Geprüft wird die LISTE — sie geht ungekürzt hinaus. */
    expect(körper).toMatch(/beitraege:\s*zeilen/);
    expect(körper).not.toMatch(/zeilen\s*\.slice\(/);
    expect(körper).not.toMatch(/HOECHSTENS|\blimit\b/);
  });

  /* Die Aufteilung muss aufgehen — eine einzelne Zahl kann nur behauptet
     werden. Genau die Lehre aus dem Namenszähler, der 431 statt 0 meldete. */
  it('liefert eine Zählung, die sich selbst prüft', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand()');
    expect(körper).toContain('zaehlung_stimmt');
    expect(körper).toContain('handbeitraege');
  });
});

/* Gegenprobe zum Stripper: er darf den Code nicht mit den Kommentaren
   wegnehmen. Wäre er zu gierig, bestünden die Fälle oben immer. */
describe('der Kommentar-Stripper', () => {
  it('lässt den Code stehen', () => {
    const rest = ohneKommentare(fs.readFileSync(QUELLE, 'utf8'));
    expect(rest).toContain('async function holeBestand()');
    expect(rest).not.toContain('DER BESTAND');   // steht nur im Banner-Kommentar
  });
});

describe('clubcampus-export.php: die Route /bestand', () => {
  const plugin = fs.readFileSync(PLUGIN, 'utf8');

  it('ist als GET registriert, nicht als POST', () => {
    const block = plugin.slice(plugin.indexOf("'/bestand'"));
    expect(block.slice(0, 300)).toMatch(/'methods'\s*=>\s*'GET'/);
  });

  it('ändert nichts — kein wp_update_post, kein wp_delete_post, kein update_field', () => {
    const körper = rumpf(ohneKommentare(plugin), 'function cc_route_bestand()');
    for (const verboten of ['wp_update_post', 'wp_delete_post', 'wp_insert_post',
                            'update_field', 'update_post_meta', 'delete_post_meta']) {
      expect(körper).not.toContain(verboten);
    }
  });

  /* Der Laufstempel ist das einzige Merkmal, an dem „seit dem Einspielen
     nicht mehr angefasst" überhaupt erkennbar ist. Ohne ihn beantwortet
     die Liste die Frage nicht, für die sie gebaut wurde. */
  it('der Export stempelt jeden geschriebenen Beitrag', () => {
    expect(plugin).toContain('cc_stempel( (int) $postId, $lauf );');
    expect(plugin).toContain("$lauf   = trim( (string) ( $daten['lauf'] ?? '' ) );");
  });

  /* ⚠ post_modified bewegt sich beim Auffrischen NICHT (update_field
     schreibt nur Postmeta). Ein Feld, das jemand für „zuletzt angefasst"
     hält und das etwas anderes misst, ist schlimmer als keines. */
  it('gibt post_modified nicht als Zeitangabe heraus', () => {
    const körper = rumpf(ohneKommentare(plugin), 'function cc_route_bestand()');
    expect(körper).not.toContain('post_modified');
    expect(körper).toContain('post_date_gmt');
  });
});
