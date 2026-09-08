// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   Zwei Stellen zeigen keine erfundenen Zahlen mehr (29.08.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Beide Stellen waren jahrelang da und sind niemandem aufgefallen —
   weil das Erfundene PLAUSIBEL war. „Mitglieder total 187" klingt
   nach einem Verein dieser Grösse (es sind 914 Personen), und die
   Torschützenliste stand still, weil ihr Generator aus Name + Team
   gesetzt war.

   Die zweite Hälfte jedes Falls ist deshalb die wichtigere: nicht
   nur, dass jetzt der ehrliche Text dasteht, sondern dass die
   erfundenen Werte NICHT ZURÜCKKOMMEN. Ein Test, der nur den neuen
   Text prüft, hält beim nächsten Umbau nichts auf.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ts from 'typescript';
import { suche, jederKnoten, findeFunktion } from '../../test-helpers/quelltext.ts';

vi.mock('../../domains/spiele/useSpiele.ts', () => ({
  useSpiele: () => ({ spiele: [], laedt: false }),
  useRangliste: () => ({ zeilen: [], laedt: false }),
}));

import { DashboardAdmin } from '../DashboardModul.tsx';
import { TeamView } from '../TeamModul.tsx';

afterEach(cleanup);

const Stub = () => null;

describe('Admin-Dashboard', () => {
  it('sagt, dass die Übersicht nicht angeschlossen ist', () => {
    render(<DashboardAdmin setActive={() => {}} account={{ name: 'Dieter Good' }} />);
    expect(screen.getByText(/nicht an die Daten angeschlossen/)).toBeTruthy();
    expect(screen.getByText(/nicht durch geschätzte ersetzt/)).toBeTruthy();
  });

  /* Die wichtigere Hälfte: die alten Werte sind weg und bleiben weg. */
  it('zeigt keine der erfundenen Kennzahlen mehr', () => {
    render(<DashboardAdmin setActive={() => {}} account={{ name: 'Dieter Good' }} />);
    for (const erfunden of ['187', '134', '112', 'Noah Beispiel', 'Sara Huber', 'Sandra Berger']) {
      expect(screen.queryByText(new RegExp(erfunden))).toBeNull();
    }
  });

  it('führt zu den Stellen, an denen die echten Zahlen stehen', () => {
    const ziele = [];
    render(<DashboardAdmin setActive={(k) => ziele.push(k)} account={{}} />);
    screen.getAllByText('Öffnen').forEach((b) => fireEvent.click(b));
    expect(ziele).toEqual(['members', 'sync', 'audit', 'portal']);
  });
});

describe('Team → Statistik', () => {
  function zeigeStatistik() {
    render(
      <TeamView
        role="trainer" trainerTeams={['Cc-Junioren']} teamRollen={{}}
        setActive={() => {}} myRosterId={null} account={null}
        dbTeams={[{ id: 1, name: 'Cc-Junioren', sfv_team_id: 111, module_aktiv: null }]}
        isModuleVisible={() => true}
        dbMitglieder={[
          { id: 1, vorname: 'Anna', nachname: 'Beispiel', teams: ['Cc-Junioren'], aktiv: true },
          { id: 2, vorname: 'Beat', nachname: 'Muster', teams: ['Cc-Junioren'], aktiv: true },
        ]}
        sb={null} kannSchreiben benutzerId={null}
        KaderModul={Stub} TrainingsplanModul={Stub} TermineModul={Stub}
        SpielplanModul={Stub} TableTab={Stub} HelferModul={Stub} vereinId="v1"
      />,
    );
    fireEvent.click(screen.getByText('Statistik'));
  }

  it('sagt, dass es noch keine Statistik gibt, und behält die Namen', () => {
    zeigeStatistik();
    expect(screen.getByText(/noch keine Statistik/)).toBeTruthy();
    expect(screen.getByText('Anna Beispiel')).toBeTruthy();
    expect(screen.getByText('Beat Muster')).toBeTruthy();
  });

  it('zeigt keine Spalten mehr, die Zahlen behaupten', () => {
    zeigeStatistik();
    for (const kopf of ['Tore', 'Assists', 'Gelb', 'Rot']) {
      expect(screen.queryByText(kopf)).toBeNull();
    }
  });
});

/* Strukturprüfung — sie überlebt jeden Umbau der Komponenten und ist an
   keinen Aufrufer gebunden. Nach dem Muster von icons.test.ts. */
describe('Der Seed-Generator ist weg und kommt nicht zurück', () => {
  /* ⚠ UMGESTELLT AM 08.09.2026 VOM TEXT AUF DEN SYNTAXBAUM.

     Beide Fälle strichen vorher die Kommentare mit einem Regex weg — und
     genau dieser Regex ist im Bestand schon falsch: `AussehenTab.tsx`
     enthält `"image/*"`, `TermineModul.tsx` einen Uhrzeit-Ausdruck, der auf
     Stern-Schrägstrich endet. Ein Kommentarentferner schneidet dort mitten
     im Code — lautlos, und der Fall bliebe grün.

     Der Baum kennt Kommentare gar nicht. Die Regel dazu steht in
     `test-helpers/quelltext.ts`. */

  it('erzeugt in TeamModul niemand mehr Zahlen aus einem Seed', () => {
    const treffer = suche({
      frage: 'ein Seed-Generator in TeamModul',
      dateien: ['src/modules/TeamModul.tsx'],
      finde: (baum) => {
        const fund = [];
        jederKnoten(baum, (n) => {
          /* ⚠ NUR `rnd`, NICHT `seed` — und das ist eine Entscheidung, kein
             Versehen. Beim Umstellen hatte ich `seed` mit aufgenommen; die
             Abfrage wurde prompt rot und fand `TeamModul.tsx:528`:

               for (let i=0;i<10;i++){ const seed=(ev.id*37+i*13)%100;
                                       total++; if(seed<75) zu++; }

             Das ist ein ZWEITER erfundener Wert — eine Anwesenheitsquote von
             rund 75 %, falls ein Team keine Spieler hat. Er ist heute
             unsichtbar, weil `ATT_EVENTS` leer ist, und würde erst mit der
             echten Anwesenheit auffallen (CLAUDE.md, Ebene 2B).

             ⚠ Er wird hier NICHT verboten. Die Zusage dieses Falls war der
             Generator aus Name + Team; ihn zu erweitern hiesse, den Test rot
             stehen zu lassen für etwas, das niemand entschieden hat — und
             „rot ist ein Zustand für Stunden, nicht für Wochen". Der Befund
             gehört zu den 33 offenen Stellen und wird dort entschieden. */
          if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)
              && n.name.text === 'rnd') fund.push(n.name.text);
          if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
              && n.expression.name.text === 'charCodeAt') fund.push('charCodeAt');
          if (ts.isNumericLiteral(n) && n.text === '1664525') fund.push('1664525');
        });
        return fund;
      },
      positivkontrolle: 'const rnd = (n) => n.charCodeAt(0) * 1664525;',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  it('behauptet das Admin-Dashboard keine Zahlen im Code', () => {
    const treffer = suche({
      frage: 'eine fest verdrahtete Zahl im Admin-Dashboard',
      dateien: ['src/modules/DashboardModul.tsx'],
      finde: (baum) => {
        const rumpf = findeFunktion(baum, 'DashboardAdmin');
        if (!rumpf) throw new Error('DashboardAdmin nicht gefunden');
        const fund = [];
        jederKnoten(rumpf, (n) => {
          if (!ts.isJsxAttribute(n) || n.name.getText() !== 'value') return;
          const w = n.initializer;
          if (w && ts.isStringLiteral(w) && /^\d+$/.test(w.text)) fund.push(w.text);
        });
        return fund;
      },
      positivkontrolle: 'function DashboardAdmin(){ return <Kachel value="187" />; }',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });
});