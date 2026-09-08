/* ═══════════════════════════════════════════════════════════════
   Die Bestandsliste ZEIGT — sie löscht nicht (07.09.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Die Zusage ist eine Entscheidung von Didi, keine Eigenschaft des
   Codes: „Eine Liste, und Didi entscheidet pro Zeile. Kein Knopf, der
   zwanzig Beiträge auf einmal wegräumt — das ist dieselbe Aktion wie
   «Person löschen», nur auf fremdem Boden."

   Eine Zusage, die nur im Kommentar steht, ist eine Behauptung. Sie
   überlebt den nächsten Umbau nicht — und beim nächsten Mal liest
   jemand „hier wird ohnehin schon abgefragt" und hängt ein POST daran.

   ⚠ `supabase/functions/wp-export/index.ts` importiert von `esm.sh` und
   wird deshalb weder von `tsc` gelesen noch von vitest ausgeführt. Was
   hier geht, ist eine Strukturprüfung — das Mittel für ZUSAGEN, nicht
   für Rechnungen. Die Rechnung (Zeitraum, Zählung) liegt in
   `wpBestand.ts` und wird nebenan mit echten Daten geprüft.

   ── UMGESTELLT AM 08.09.2026 VOM TEXT AUF DEN SYNTAXBAUM ──────────
   Die Textfassung hat sich viermal vergriffen: zweimal an Kommentaren,
   einmal an `.limit(1)` (dem ersten Protokolleintrag, also dem
   Gegenteil einer Kürzung) und einmal an einem Typliteral, das sie für
   den Funktionsrumpf hielt. Der Baum kennt den Unterschied.

   ⚠ Die PHP-Hälfte ist mit derselben Umstellung ausgezogen: sie braucht
   den PHP-Tokenizer und steht in `scripts/check-plugin.mjs`.
   Die Regel für beide steht in `test-helpers/quelltext.ts`.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  suche, findeFunktion, aufrufNamen, textLiterale, objektEigenschaften, jederKnoten,
} from '../../../test-helpers/quelltext.ts';

import { waehleZeitraum, fassBestandZusammen } from '../wpBestand.ts';

const QUELLE = 'supabase/functions/wp-export/index.ts';

/** Der Rumpf von `holeBestand` — oder ein Fehler, wenn es ihn nicht gibt. */
function bestandRumpf(baum: ts.SourceFile): ts.Node {
  const n = findeFunktion(baum, 'holeBestand');
  if (!n) throw new Error('holeBestand nicht gefunden');
  return n;
}

describe('wp-export: die Aktion `bestand`', () => {
  it('ist als gültige Aktion aufgezählt', () => {
    const treffer = suche({
      frage: 'AKTIONEN enthält "bestand"',
      dateien: [QUELLE],
      finde: (baum) => {
        const werte: string[] = [];
        jederKnoten(baum, (n) => {
          if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)
              && n.name.text === 'AKTIONEN' && n.initializer) {
            werte.push(...textLiterale(n.initializer));
          }
        });
        return werte.includes('bestand') ? ['ja'] : [];
      },
      positivkontrolle: 'const AKTIONEN = ["probe", "bestand"];',
    });
    expect(treffer.length).toBe(1);
  });

  /* `status` fragt die Website, was bei ihr steht — und braucht dafür die
     neue Plugin-Fassung NICHT. Dieselbe Zusage wie `bestand`: nur lesen. */
  it('schreibt auch in `status` nichts', () => {
    const VERBOTEN = ['insert', 'update', 'upsert', 'delete', 'rpc'];
    const treffer = suche({
      frage: 'ein schreibender Aufruf in holeStatus',
      dateien: [QUELLE],
      finde: (baum) => {
        const rumpf = findeFunktion(baum, 'holeStatus');
        if (!rumpf) throw new Error('holeStatus nicht gefunden');
        const schreibt = aufrufNamen(rumpf).filter((n) => VERBOTEN.includes(n));
        const methode = objektEigenschaften(rumpf)
          .filter(([k, v]) => k === 'method' && v.toUpperCase() !== 'GET')
          .map(([, v]) => v);
        return [...schreibt, ...methode];
      },
      positivkontrolle:
        'async function holeStatus() { await fetch(u, { method: "POST" }); }',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  /* Der Kern. Ein `fetch` ohne `method` ist GET; alles andere wäre ein
     Schreibvorgang gegen die Website. */
  it('holt den Bestand mit GET, nicht mit POST', () => {
    const treffer = suche({
      frage: 'ein schreibendes fetch in holeBestand',
      dateien: [QUELLE],
      finde: (baum) => objektEigenschaften(bestandRumpf(baum))
        .filter(([k, v]) => k === 'method' && v.toUpperCase() !== 'GET'),
      positivkontrolle:
        'async function holeBestand() { await fetch(u, { method: "POST" }); }',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  it('spricht die Bestandsroute an', () => {
    const treffer = suche({
      frage: 'die Route clubcampus/v1/bestand',
      dateien: [QUELLE],
      finde: (baum) => textLiterale(bestandRumpf(baum))
        .filter((t) => t.includes('clubcampus/v1/bestand')),
      positivkontrolle:
        'async function holeBestand() { await fetch(`${b}/clubcampus/v1/bestand`); }',
    });
    expect(treffer.length).toBeGreaterThan(0);
  });

  /* Ein Nachsehen ist kein Lauf. Stünde es im Protokoll, verschöbe es
     letzter_sync — und die Kachel meldete einen Export, den es nie gab.

     ⚠ Verboten ist das SCHREIBEN, nicht der Tabellenname. Die
     Vorgängerfassung verbot `api_sync_log` als Zeichenkette und damit auch
     das Lesen — genau das, was der Zeitraum braucht. Ein Test, der mehr
     verbietet als die Zusage, steht dem nächsten richtigen Schritt im Weg
     und wird dann aufgeweicht; dabei geht meist auch die echte Hälfte
     verloren. */
  it('schreibt nichts in die Datenbank — auch nicht ins Protokoll', () => {
    const VERBOTEN = ['insert', 'update', 'upsert', 'delete', 'rpc'];
    const treffer = suche({
      frage: 'ein schreibender Datenbankaufruf in holeBestand',
      dateien: [QUELLE],
      finde: (baum) => aufrufNamen(bestandRumpf(baum)).filter((n) => VERBOTEN.includes(n)),
      positivkontrolle:
        'async function holeBestand() { await db.from("x").insert({ a: 1 }); }',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  it('liest die Datenbank nur mit select', () => {
    const treffer = suche({
      frage: 'select in holeBestand',
      dateien: [QUELLE],
      finde: (baum) => aufrufNamen(bestandRumpf(baum)).filter((n) => n === 'select'),
      positivkontrolle: 'async function holeBestand() { await db.from("x").select("id"); }',
    });
    expect(treffer.length).toBeGreaterThan(0);
  });

  /* Die Rechnung gehört nach wpBestand.ts, wo echte Fälle sie prüfen.
     Hier bleibt nur die Frage, ob die Function sie überhaupt BENUTZT.

     ⚠ Die Namen kommen aus den FUNKTIONEN selbst (`.name`), nicht aus
     Zeichenketten. Zwei Gründe, und der zweite ist der bessere:
       · `check:quotes` sieht in `waehleZeitraum` sonst eine
         Umlaut-Ersatzschreibung in einem Literal — richtig gefragt,
         hier aber ein Bezeichner und keine Prosa.
       · Wichtiger: eine Umbenennung kann die Prüfung so nicht mehr
         still aushöhlen. Stünde der Name als Text da, wäre sie nach
         einem Rename grün und prüfte nichts mehr. */
  it('rechnet nicht selbst, sondern benutzt wpBestand.ts', () => {
    const gebraucht = [waehleZeitraum.name, fassBestandZusammen.name];
    const treffer = suche({
      frage: 'Aufruf der Zeitraum-Rechnung aus wpBestand',
      dateien: [QUELLE],
      finde: (baum) => aufrufNamen(bestandRumpf(baum)).filter((n) => gebraucht.includes(n)),
      positivkontrolle:
        `async function holeBestand() { return ${gebraucht[1]}(z, ${gebraucht[0]}(v, e), e); }`,
    });
    expect(new Set(treffer.map((t) => t.fund))).toEqual(new Set(gebraucht));
  });

  /* ⚠ Nicht „kein .slice" — die Fehlerpfade kürzen den Antworttext von
     WordPress, und das ist richtig so. Gefragt ist eine Kürzung DER LISTE. */
  it('kürzt die Liste nicht', () => {
    const LISTEN = ['zeilen', 'beitraege'];
    const treffer = suche({
      frage: 'eine Kürzung der Beitragsliste',
      dateien: [QUELLE],
      finde: (baum) => {
        const fund: string[] = [];
        jederKnoten(bestandRumpf(baum), (n) => {
          if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return;
          const z = n.expression;
          if (!['slice', 'splice'].includes(z.name.text)) return;
          if (ts.isIdentifier(z.expression) && LISTEN.includes(z.expression.text)) {
            fund.push(`${z.expression.text}.${z.name.text}`);
          }
        });
        return fund;
      },
      positivkontrolle: 'async function holeBestand() { return zeilen.slice(0, 20); }',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  /* Die Gegenprobe auf die Besitzregel steht AUSSERHALB des Zeitraums: ein
     Handbeitrag hat mit dem Export nichts zu tun und darf durch keinen
     Filter verschwinden. */
  it('führt die Handbeiträge und die Einigkeit der Seiten mit', () => {
    const treffer = suche({
      frage: 'die Felder handbeitraege und seiten_einig in der Antwort',
      dateien: [QUELLE],
      finde: (baum) => objektEigenschaften(bestandRumpf(baum))
        .map(([k]) => k)
        .filter((k) => k === 'handbeitraege' || k === 'seiten_einig'),
      positivkontrolle:
        'async function holeBestand() { return { handbeitraege: 1, seiten_einig: true }; }',
    });
    expect(new Set(treffer.map((t) => t.fund)))
      .toEqual(new Set(['handbeitraege', 'seiten_einig']));
  });
});
