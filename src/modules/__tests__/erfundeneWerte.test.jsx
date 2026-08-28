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
import fs from 'node:fs';

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
  it('erzeugt in TeamModul niemand mehr Zahlen aus einem Seed', () => {
    const src = fs.readFileSync('src/modules/TeamModul.tsx', 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');   // Kommentare erklären ihn, das ist erlaubt
    expect(code).not.toMatch(/const\s+rnd\s*=/);
    expect(code).not.toMatch(/charCodeAt\(0\)/);
    expect(code).not.toMatch(/1664525/);
  });

  it('behauptet das Admin-Dashboard keine Zahlen im Code', () => {
    const src = fs.readFileSync('src/modules/DashboardModul.tsx', 'utf8');
    const admin = src.slice(src.indexOf('function DashboardAdmin'), src.indexOf('function DashboardAdministration'));
    const code = admin.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/value="\d+"/);
  });
});
