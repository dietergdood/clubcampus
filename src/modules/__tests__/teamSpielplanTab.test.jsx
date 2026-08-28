// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   Der Tab „Spielplan & Tabelle" zeigt DREI Blöcke (28.08.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Die Bilanz-Karte hatte fünf grüne Komponententests — und war im
   Portal trotzdem nicht zu sehen. Die fünf prüfen die Komponente:
   gib ihr Spiele, dann rendert sie eine Tabelle. Keiner prüfte, ob
   sie überhaupt in den Baum kommt.

   Das ist dieselbe Lücke wie bei den Modalen hinter dem frühen
   Return: eine Komponente kann vollständig richtig sein und
   trotzdem nie gerendert werden, und kein Test der Komponente
   findet das je.

   Deshalb rendert diese Datei den TAB, nicht die Karte.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const spiele = vi.hoisted(() => ({ liste: [] }));
vi.mock('../../domains/spiele/useSpiele.ts', () => ({
  useSpiele: () => ({ spiele: spiele.liste, laedt: false }),
  useRangliste: () => ({ zeilen: [], laedt: false }),
}));

import { TeamView } from '../TeamModul.tsx';

afterEach(() => { cleanup(); spiele.liste = []; });

function spiel(teil) {
  return {
    id: 'x', team: 'Cc-Junioren', date: 'Sa 24.05.', iso: '2026-05-24',
    time: '16:00', opponent: 'FC Gegner', home: true, sfvGegnerTeamId: null,
    venue: '', venueAddr: '', comp: 'Meisterschaft', liga: '2. Liga',
    spielNr: '', status: 'ausgetragen', result: null, htResult: null,
    att: null, schiedsrichter: '', delegierter: '', notes: '', treffpunkt: '',
    stats: null, trainingsspiel: false, abgesagt: false, verschoben: false,
    meisterschaft: true, ausgetragen: true,
    ...teil,
  };
}

const Stub = () => null;

function zeigeTab() {
  render(
    <TeamView
      role="trainer"
      trainerTeams={['Cc-Junioren']}
      teamRollen={{}}
      setActive={() => {}}
      myRosterId={null}
      account={null}
      dbTeams={[{ id: 1, name: 'Cc-Junioren', sfv_team_id: 111, module_aktiv: null }]}
      isModuleVisible={() => true}
      dbMitglieder={[]}
      sb={null}
      kannSchreiben
      benutzerId={null}
      KaderModul={Stub}
      TrainingsplanModul={Stub}
      TermineModul={Stub}
      SpielplanModul={Stub}
      TableTab={Stub}
      HelferModul={Stub}
      vereinId="v1"
    />,
  );
  fireEvent.click(screen.getByText('Spielplan & Tabelle'));
}

describe('Team → Spielplan & Tabelle', () => {
  it('rendert die Bilanz zwischen Spielplan und Tabelle', () => {
    spiele.liste = [spiel({ home: true, result: '3:1' }), spiel({ home: false, result: '1:2' })];
    zeigeTab();

    /* Alle drei Überschriften — und ihre Reihenfolge im Dokument. Die
       Bilanz gehört zwischen den eigenen Spielplan und die Verbandstabelle. */
    const hdrs = screen.getAllByText(/^(Spielplan|Bilanz|Tabelle)$/).map((e) => e.textContent);
    expect(hdrs).toEqual(['Spielplan', 'Bilanz', 'Tabelle']);

    expect(screen.getByText('Heim')).toBeTruthy();
    expect(screen.getByText('Auswärts')).toBeTruthy();
    expect(screen.getByText('Gesamt')).toBeTruthy();
  });

  /* Der Fall, den die Komponententests schon hielten — hier noch einmal
     AM EINBAU. Eine Karte, die im Leerfall verschwindet, sähe im Tab
     genauso aus wie eine, die gar nicht eingebaut ist. */
  it('zeigt die Bilanz auch ohne ein einziges gespieltes Spiel', () => {
    spiele.liste = [];
    zeigeTab();
    expect(screen.getByText('Bilanz')).toBeTruthy();
    expect(screen.getByText(/Noch kein ausgetragenes Meisterschaftsspiel/)).toBeTruthy();
  });
});
