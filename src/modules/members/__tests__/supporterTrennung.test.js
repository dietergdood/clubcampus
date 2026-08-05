import { describe, it, expect } from 'vitest';
import { mapMembers } from '../memberMapper.ts';

const DB_PORTAL_ROLLEN = [{ name: 'spieler', label: 'Spieler/in' }, { name: 'supporter', label: 'Supporter/in' }];
const DB_KADER_ROLLEN  = [{ name: 'Spieler/in', ist_trainer: false }];

const zeile = (id, mitgliedtyp) => ({
  id, mitgliedtyp, vorname: 'A', nachname: `Nr${id}`, aktiv: true,
  kader_rollen: [], kader_teams: [], kader_eintraege: [], teams: [],
  hat_benutzer: false, benutzer_deaktiviert: false,
});

/* Supporter sind KEINE Mitglieder: kein Beitrag, kein Stimmrecht an der GV,
   kein Spielbetrieb. Sie stehen seit Etappe 5 in `mitglieder`, damit sie
   ueberhaupt auffindbar sind — aber sie gehoeren nicht in die
   Mitgliederliste, sonst stimmt der Zaehler nicht und Auswertungen zaehlen
   sie mit. Getrennt wird ueber den Mitgliedtyp. */
describe('Supporter gehören nicht in die Mitgliederliste', () => {
  const rows = mapMembers(
    [zeile(1, 'Aktivmitglied'), zeile(2, 'Supporter'), zeile(3, 'Juniorenmitglied')],
    DB_PORTAL_ROLLEN, DB_KADER_ROLLEN,
  );

  const mitglieder = rows.filter(m => m.mitgliedschaft !== 'Supporter');
  const supporter  = rows.filter(m => m.mitgliedschaft === 'Supporter');

  it('trennt sauber nach Mitgliedtyp', () => {
    expect(mitglieder.map(m => m.id)).toEqual([1, 3]);
    expect(supporter.map(m => m.id)).toEqual([2]);
  });

  it('der Zähler der Mitglieder enthält keine Supporter', () => {
    expect(mitglieder).toHaveLength(2);
    expect(rows).toHaveLength(3);
  });

  it('mapMembers stellt den Mitgliedtyp als `mitgliedschaft` bereit', () => {
    /* Daran haengt die Trennung — ohne dieses Feld gaebe es kein Kriterium. */
    expect(supporter[0].mitgliedschaft).toBe('Supporter');
  });
});
