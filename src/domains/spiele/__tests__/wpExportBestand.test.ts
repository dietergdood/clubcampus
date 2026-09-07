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

/**
 * Den Rumpf einer Funktion herausschneiden.
 *
 * ⚠ ZWEI FALLEN, BEIDE HIER ERLEBT.
 *
 * 1) Der Kopf wird OHNE schliessende Klammer gesucht. Mit `()` traf er nur
 *    eine parameterlose Funktion — und als `holeBestand` Parameter bekam,
 *    war die Folge kein klarer Fehlschlag, sondern ein `throw` mitten in
 *    vier Fällen, deren Meldung auf etwas ganz anderes zeigte.
 *
 * 2) ⚠ Die erste `{` nach dem Kopf ist NICHT der Rumpf, sobald ein
 *    Parameter ein Typliteral trägt (`{ von: string | null }`). Der
 *    Schnitt lieferte dann die Parameterliste — und alle Prüfungen darin
 *    fanden nichts, also war jede „bestanden"-Aussage wertlos gewesen,
 *    hätten sie nicht zufällig auf Vorhandenes gezielt.
 *
 *    **Genau das ist die Sorte Fehler, gegen die diese Datei gebaut ist:
 *    eine Prüfung, die etwas anderes ansieht als gemeint.** Deshalb wird
 *    erst die Parameterliste überklammert und dann der Rumpf genommen.
 */
function rumpf(text: string, kopf: string): string {
  const a = text.indexOf(kopf);
  if (a < 0) throw new Error(`nicht gefunden: ${kopf}`);
  /* Der Kopf endet auf "(" — also steht die Klammerbilanz schon auf 1. */
  let i = a + kopf.length, klammern = 1;
  for (; i < text.length && klammern > 0; i++) {
    if (text[i] === '(') klammern++;
    else if (text[i] === ')') klammern--;
  }
  const auf = text.indexOf('{', i);
  if (auf < 0) throw new Error(`kein Rumpf zu: ${kopf}`);
  let tiefe = 0;
  for (let j = auf; j < text.length; j++) {
    if (text[j] === '{') tiefe++;
    else if (text[j] === '}' && --tiefe === 0) return text.slice(auf, j + 1);
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
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand(');
    expect(körper).toMatch(/clubcampus\/v1\/bestand/);
    expect(körper).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/i);
  });

  /* Ein Nachsehen ist kein Lauf. Stünde es im Protokoll, verschöbe es
     letzter_sync — und die Kachel meldete einen Export, den es nie gab.

     ⚠ Diese Prüfung war zuerst zu scharf gefasst: sie verbot die
     TABELLENNAMEN `api_sync_log` und `api_verbindungen`. Damit verbot sie
     auch das LESEN — und genau das braucht der Zeitraum, dessen Beginn aus
     dem ersten Protokolleintrag kommt. Die Zusage lautet „sie schreibt
     nicht", nicht „sie sieht nicht hin". Ein Test, der mehr verbietet als
     die Zusage, steht dem nächsten richtigen Schritt im Weg und wird dann
     aufgeweicht — dabei geht meist auch die echte Hälfte verloren. */
  it('schreibt nichts in die Datenbank — auch nicht ins Protokoll', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand(');
    for (const verboten of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) {
      expect(körper).not.toContain(verboten);
    }
    /* Die positive Hälfte: was sie mit der Datenbank tut, ist select. */
    expect(körper).toContain('.select(');
  });

  /* Ungekürzt: wer entscheiden soll, muss alle sehen. Dieselbe Lehre wie
     bei der Löschvorschau, deren Schwelle von 20 bei einem Stapel von
     zwei umfiel. */
  /* ⚠ DIESE ZWEI FAELLE HABEN DEN BESITZER GEWECHSELT — und das ist der
     richtige Ausgang, nicht ein Verlust.

     Sie prüften früher `beitraege: zeilen` und `zaehlung_stimmt` im Rumpf
     der Edge Function. Beides ist am 07.09.2026 nach
     `domains/spiele/wpBestand.ts` gewandert, weil es RECHNUNG ist und
     keine Zusage — und dort prüfen es echte Fälle mit echten Daten
     (`wpBestandZeitraum.test.ts`), statt eines Zeichenvergleichs auf den
     Quelltext.

     ⚠ Eine Strukturprüfung ist das Mittel für das, was sich nicht
     ausführen lässt. Wo ein richtiger Test möglich ist, ist sie die
     schwächere Antwort. Was hier bleibt, ist deshalb nur noch die Frage,
     ob die Function die Rechnung überhaupt BENUTZT — und ob sie daneben
     nicht doch selbst kürzt. */
  it('rechnet nicht selbst, sondern benutzt wpBestand.ts', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand(');
    expect(körper).toContain('waehleZeitraum(');
    expect(körper).toContain('fassBestandZusammen(');
    expect(körper).toContain('...erg,');
  });

  it('kürzt die Liste nicht', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand(');
    /* ⚠ DRITTER ANLAUF, UND JEDES MAL DASSELBE MUSTER.

       Erst traf `onClick={()=>{}}` einen Kommentar, dann `post_modified`
       einen zweiten — und hier traf ein Verbot von `\blimit\b` das
       `.limit(1)`, mit dem der ERSTE Protokolleintrag geholt wird. Das ist
       kein Kürzen der Liste, sondern das Gegenteil: es holt die eine Zeile,
       aus der die Zeitraumgrenze kommt.

       Eine Strukturprüfung sucht Zeichen und kennt keine Bedeutung. Sie
       taugt nur mit einem Muster, das die SACHE trifft — hier also eine
       Kürzung DER LISTE, nicht das Wort `limit` irgendwo. */
    expect(körper).not.toMatch(/(zeilen|beitraege|erg\.beitraege)\s*\.slice\(/);
    expect(körper).not.toContain('HOECHSTENS');
  });

  /* Die Gegenprobe auf die Besitzregel steht AUSSERHALB des Zeitraums: ein
     Handbeitrag hat mit dem Export nichts zu tun und darf durch keinen
     Filter verschwinden. */
  it('führt die Handbeiträge ungefiltert mit', () => {
    const körper = rumpf(ohneKommentare(quelle), 'async function holeBestand(');
    expect(körper).toContain('handbeitraege');
    expect(körper).toContain('seiten_einig');
  });
});

/* Gegenprobe zum Stripper: er darf den Code nicht mit den Kommentaren
   wegnehmen. Wäre er zu gierig, bestünden die Fälle oben immer. */
describe('der Kommentar-Stripper', () => {
  it('lässt den Code stehen', () => {
    const rest = ohneKommentare(fs.readFileSync(QUELLE, 'utf8'));
    expect(rest).toContain('async function holeBestand(');
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
    const körper = rumpf(ohneKommentare(plugin), 'function cc_route_bestand(');
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
    const körper = rumpf(ohneKommentare(plugin), 'function cc_route_bestand(');
    expect(körper).not.toContain('post_modified');
    /* ⚠ Mit Zone. `post_date_gmt` und `post_date` sehen identisch aus und
       unterscheiden sich um den Zeitzonenversatz — eine Verwechslung
       verschiebt jeden Zeitpunkt, ohne dass etwas fehlschlägt. */
    expect(körper).toContain("get_post_time( 'c', true,");
  });
});
