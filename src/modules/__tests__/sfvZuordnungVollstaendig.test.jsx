// @vitest-environment jsdom
/* ══════════════════════════════════════════════════════════════
   Die Zuordnungsmaske sagt, WOVON ihre Zahl handelt (10.09.2026)

   ⚠ ANLASS. Die Maske meldete „21 von 21 zugeordnet" — und sah damit
   vollständig aus. Sie war es für ihren Nenner: `/api/team/list`
   lieferte 21 Mannschaften, alle zugeordnet. Nur standen daneben
   **21 weitere ClubCampus-Teams ohne SFV-Nummer**, die in dieser
   Liste gar nicht vorkommen.

   > Eine Zahl, die vollständig aussieht, lässt niemanden
   > weitersuchen.

   ⚠ Und die Auskunft war die ganze Zeit da: `baueZuordnung()`
   berechnet `offen` seit jeher — benutzt wurde es nur, um das
   Auswahlfeld zu füllen. Berechnet und nie ausgesprochen.
   ══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/* Die Maske ruft beim Aufbau die Edge Function. Hier antwortet eine
   Attrappe mit der Lage vom 10.09.2026: der Verband führt zwei Teams,
   beide zugeordnet — und in ClubCampus stehen drei weitere ohne Nummer. */
vi.mock('../../domains/sfv/sfvService.ts', async () => {
  const echt = await vi.importActual('../../domains/sfv/sfvService.ts');
  return {
    ...echt,
    fetchSfvTeams: vi.fn(async () => ({
      daten: {
        saison: { id: 2027, name: '2026/27' },
        teams: [
          { sfv_team_id: 38301, name: 'Herrliberg 1', voller_name: '', liga_id: 1,
            liga_name: '3. Liga', division: '', aktiv: true },
          { sfv_team_id: 38309, name: 'Junioren Ca', voller_name: '', liga_id: 2,
            liga_name: 'Junioren C', division: '', aktiv: true },
        ],
      },
      fehler: null,
    })),
    setzeTeamZuordnung: vi.fn(async () => null),
  };
});

import { SfvZuordnung } from '../portal/SfvZuordnung.tsx';

afterEach(cleanup);

const TEAMS = [
  { id: 1, name: 'FC Herrliberg 1', sfv_team_id: 38301 },
  { id: 2, name: 'Ca-Junioren',     sfv_team_id: 38309 },
  /* Die drei ohne Nummer — beim Verband gibt es sie nicht. */
  { id: 3, name: 'Ea-Junioren',   sfv_team_id: null },
  { id: 4, name: 'G1-Junioren',   sfv_team_id: null },
  { id: 5, name: 'E-Pool',        sfv_team_id: null },
];

function zeige() {
  render(<SfvZuordnung sb={{}} dbTeams={TEAMS} setDbTeams={() => {}} onZurueck={() => {}} />);
}

describe('Zuordnungsmaske — Vollständigkeit', () => {
  it('sagt, dass der Nenner vom Verband kommt', async () => {
    zeige();
    /* Nicht „2 von 2 zugeordnet" allein: der Satz muss sagen, WOVON. */
    expect(await screen.findByText(/2 von 2 Mannschaften zugeordnet, die der Verband/))
      .toBeTruthy();
  });

  it('nennt die ClubCampus-Teams, die in der Liste gar nicht vorkommen', async () => {
    zeige();
    expect(await screen.findByText(/3 Mannschaft\(en\) in ClubCampus haben keine SFV-Nummer/))
      .toBeTruthy();
    /* Namentlich — eine Zahl allein schickt niemanden irgendwohin. */
    expect(screen.getByText(/Ea-Junioren, G1-Junioren, E-Pool/)).toBeTruthy();
  });

  it('erklärt, dass das richtig sein kann', async () => {
    /* Ohne den Satz läse sich der Kasten wie ein Fehler — F- und
       G-Junioren spielen ohne Meldung, und dann ist nichts zu tun. */
    zeige();
    expect(await screen.findByText(/spielen ohne Meldung/)).toBeTruthy();
  });

  it('schweigt, wenn jede ClubCampus-Mannschaft eine Nummer hat', async () => {
    render(
      <SfvZuordnung sb={{}} dbTeams={TEAMS.slice(0, 2)} setDbTeams={() => {}} onZurueck={() => {}} />,
    );
    expect(await screen.findByText(/2 von 2 Mannschaften/)).toBeTruthy();
    expect(screen.queryByText(/haben keine SFV-Nummer/)).toBeNull();
  });
});
