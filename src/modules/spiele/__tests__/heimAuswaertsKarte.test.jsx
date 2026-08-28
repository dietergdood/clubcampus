// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   Die Heim-/Auswärtsbilanz zeigt, was sie ist — und sagt, was sie nicht ist.

   ⚠ WARUM ES DIESE DATEI GIBT

   Die Karte sieht aus wie eine halbe Ligatabelle. Sie ist keine: für
   eine Gruppentabelle mit Heim-/Auswärtstrennung fehlen die Spiele
   ohne eigene Beteiligung, und der Verband liefert sie nicht
   (gemessen 28.08.2026: `ohne_team` in allen 185 Läufen 0, kein
   gruppenweiter Endpunkt in Swagger v26.7.10.1).

   Der Satz darunter ist deshalb kein Zierrat, sondern die halbe
   Aussage der Karte — und ein Satz, der eine Zusage macht, gehört
   in einen Test. Sonst fällt er beim nächsten Umbau weg, und die
   Karte behauptet wieder etwas, das sie nicht kann.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HeimAuswaertsKarte } from '../HeimAuswaertsKarte.tsx';

afterEach(cleanup);

function spiel(teil) {
  return {
    id: 'x', team: '1. Mannschaft', date: 'Sa 24.05.', iso: '2026-05-24',
    time: '16:00', opponent: 'FC Gegner', home: true, sfvGegnerTeamId: null,
    venue: '', venueAddr: '', comp: 'Meisterschaft', liga: '2. Liga',
    spielNr: '', status: 'ausgetragen', result: null, htResult: null,
    att: null, schiedsrichter: '', delegierter: '', notes: '', treffpunkt: '',
    stats: null, trainingsspiel: false, abgesagt: false, verschoben: false,
    meisterschaft: true, ausgetragen: true,
    ...teil,
  };
}

describe('HeimAuswaertsKarte', () => {
  it('nennt die Einschränkung auf das eigene Team', () => {
    render(<HeimAuswaertsKarte spiele={[spiel({ result: '2:0' })]} />);
    expect(screen.getByText(/Aus den eigenen Meisterschaftsspielen/)).toBeTruthy();
    expect(screen.getByText(/Nicht die Gruppe/)).toBeTruthy();
  });

  /* Die zweite Hälfte, und die wichtigere: die Karte darf sich nicht als
     Gruppen- oder Ligatabelle ausgeben. */
  it('gibt sich nicht als Tabelle der ganzen Gruppe aus', () => {
    render(<HeimAuswaertsKarte spiele={[spiel({ result: '2:0' })]} />);
    expect(screen.queryByText(/Ligatabelle/)).toBeNull();
    expect(screen.queryByText(/Rangliste/)).toBeNull();
  });

  it('verschwindet nicht, wenn noch nichts gespielt wurde', () => {
    render(<HeimAuswaertsKarte spiele={[]} />);
    /* Die Ueberschrift setzt das Team-Modul, wie bei „Spielplan" und
       „Tabelle" daneben — die Karte selbst traegt nur den Grund. */
    expect(screen.getByText(/Noch kein ausgetragenes Meisterschaftsspiel/)).toBeTruthy();
  });

  it('zeigt Heim, Auswärts und Gesamt als drei Zeilen', () => {
    render(<HeimAuswaertsKarte spiele={[
      spiel({ home: true, result: '3:1' }),
      spiel({ home: false, result: '1:2' }),
    ]} />);
    expect(screen.getByText('Heim')).toBeTruthy();
    expect(screen.getByText('Auswärts')).toBeTruthy();
    expect(screen.getByText('Gesamt')).toBeTruthy();
  });

  /* Das Auswärtsspiel 1:2 ist ein Sieg für uns — die zweite Zahl ist
     unsere. Steht hier 1:2 statt 2:1, ist die Torreihenfolge gedreht. */
  it('zeigt auswärts unsere Tore zuerst, nicht die des Verbands', () => {
    render(<HeimAuswaertsKarte spiele={[spiel({ home: false, result: '1:2' })]} />);
    /* Zweimal: in der Auswaerts- und in der Gesamtzeile. Bei einem einzigen
       Spiel sind sie gleich — das ist richtig und kein Doppel. */
    expect(screen.getAllByText('2:1')).toHaveLength(2);
    expect(screen.queryByText('1:2')).toBeNull();
  });
});
