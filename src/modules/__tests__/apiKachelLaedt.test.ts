/* ═══════════════════════════════════════════════════════════════
   Die Kachel bekommt ihre Ziel-Zeilen wirklich (08.09.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   `apiKacheln.test.jsx` prüft, was die Kachel ANZEIGT, wenn man ihr
   Protokollzeilen gibt. Alle Fälle waren grün — und in der laufenden
   App zeigte sie trotzdem dauerhaft „kein Lauf".

   Der Grund lag eine Ebene höher: das Modul reichte ihr die 50
   Zeilen des Audit-Tabs. `sfv-sync` läuft stündlich und schreibt je
   Lauf eine Zeile, 50 Zeilen sind damit rund ZWEI TAGE — und der
   einzige WordPress-Lauf war älter. Die Zeile mit dem Ziel-Host war
   nie dabei.

   ⚠ Damit konnte der Vergleich zwischen Konfiguration und
   Beobachtung NIE anschlagen: ein Prüfzweig, den nichts erreicht.
   Dieselbe Familie wie die Tautologie in `zaehlung_stimmt` — eine
   Gegenprobe, die nicht scheitern kann, wird gelesen wie eine, die
   es könnte.

   Und es ist dieselbe Lücke wie bei der Bilanz-Karte: fünf grüne
   Komponententests, und niemand prüfte, ob sie in den Baum kommt.
   Deshalb prüft diese Datei den EINBAU — die Abfrage, nicht die
   Anzeige.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { suche, jederKnoten, kette } from '../../test-helpers/quelltext.ts';

const MODUL = 'src/modules/PortalverwaltungModul.tsx';

/**
 * Wie viele Abfragen auf `api_sync_log` es gibt.
 *
 * ⚠ Gezählt wird der `from("api_sync_log")`-AUFRUF, nicht die Kette.
 * Die erste Fassung zählte jede CallExpression, deren Kette ein `from`
 * enthält — also `.select()`, `.order()`, `.limit()` gleich mit, und kam
 * auf 9 statt 2. Sie trug dazu eine Bedingung, die nie zutreffen kann
 * (`x !== x`): ein Zweig, den nichts erreicht, in einem Test gegen genau
 * diesen Fehler. Beim Zählen gilt dasselbe wie beim Suchen — das Merkmal
 * nehmen, nicht das, was gleich aussieht.
 */
function abfragen(baum: ts.SourceFile): string[] {
  const raus: string[] = [];
  jederKnoten(baum, (n) => {
    if (!ts.isCallExpression(n)) return;
    const z = n.expression;
    if (!ts.isPropertyAccessExpression(z) || z.name.text !== 'from') return;
    const arg = n.arguments[0];
    if (arg && ts.isStringLiteral(arg) && arg.text === 'api_sync_log') raus.push(arg.text);
  });
  return raus;
}

describe('PortalverwaltungModul lädt die Ziel-Zeilen eigens', () => {
  /* ⚠ Der Kern: eine Abfrage, die auf `ziel_host` filtert. Ohne sie hängt
     die Kachel am Strom der stündlichen SFV-Läufe und sieht den
     WordPress-Lauf nach zwei Tagen nicht mehr. */
  it('fragt api_sync_log gezielt nach Zeilen mit ziel_host', () => {
    const treffer = suche({
      frage: 'eine api_sync_log-Abfrage, die auf ziel_host filtert',
      dateien: [MODUL],
      finde: (baum) => {
        const fund: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isCallExpression(n)) return;
          const glieder = kette(n);
          const aufLog = glieder.some((g) => g.name === 'from' && g.texte.includes('api_sync_log'));
          const aufZiel = glieder.some((g) => g.texte.some((t) => t.includes('ziel_host')));
          if (aufLog && aufZiel) fund.push(glieder.map((g) => g.name).join('.'));
        });
        return fund;
      },
      positivkontrolle:
        'const r = await sb.from("api_sync_log").select("details").not("details->>ziel_host","is",null);',
    });
    expect(treffer.length).toBeGreaterThan(0);
  });

  /* Geladen zu werden genügt nicht — die Zeilen müssen auch ankommen.
     Dieselbe Lehre wie „vor dem frühen Return zu stehen genügt nicht". */
  it('reicht sie an die Kachel weiter', () => {
    const treffer = suche({
      frage: 'syncLogs an ApiTab, gespeist aus den Ziel-Zeilen',
      dateien: [MODUL],
      finde: (baum) => {
        const fund: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isJsxAttribute(n) || n.name.getText() !== 'syncLogs') return;
          const text = n.getText();
          if (text.includes('zielLogs')) fund.push(text.replace(/\s+/g, ' '));
        });
        return fund;
      },
      positivkontrolle: 'const X = () => <ApiTab syncLogs={[...auditLogs, ...zielLogs]} />;',
    });
    expect(treffer.length).toBe(1);
  });

  /* ⚠ Die Zahl 50 gehört dem Audit-Tab. Fiele die eigene Abfrage weg und
     jemand höbe stattdessen das Limit, wäre der Defekt nur verschoben:
     eine geratene Zahl gegen ein wachsendes Protokoll. */
  it('macht die Kachel nicht von der Zeilenzahl des Audit-Tabs abhängig', () => {
    const abfragenAufLog = suche({
      frage: 'Abfragen auf api_sync_log',
      dateien: [MODUL],
      finde: abfragen,
      positivkontrolle: 'const r = await sb.from("api_sync_log").select("*");',
    });
    /* Zwei: die 50 Zeilen für den Audit-Tab und die gefilterte für die
       Kachel. Wird daraus wieder eine, ist die Kachel zurück am Strom. */
    expect(abfragenAufLog.length).toBe(2);
  });
});
