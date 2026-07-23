/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberFilter.test.js
   Unit-Tests für filterMembers und sortMembers
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import { filterMembers, sortMembers } from '../memberFilter.js';

// ── Testdaten ────────────────────────────────────────────────────
const ROLLE_LABEL = {
  trainer: 'Trainer/in',
  spieler: 'Spieler/in',
  administrator: 'Administrator',
  funktionaer: 'Funktionär',
};

const mitglieder = [
  {
    id: '1', name: 'Adrian Bürgi', vorname: 'Adrian', nachname: 'Bürgi',
    role: 'trainer', mitgliedschaft: 'Aktivmitglied',
    rollen: ['Trainer/in'], kader_rollen_raw: ['Trainer/in', 'Co-Trainer/in'],
    kader_eintraege: [
      { team: { name: '1. Mannschaft' }, rollen: ['Trainer/in'] },
      { team: { name: 'Frauen 1' }, rollen: ['Trainer/in'] },
    ],
    teams: [{ name: '1. Mannschaft', kurz: 'FCH 1' }, { name: 'Frauen 1', kurz: 'Frauen 1' }],
    funktionen: ['Präsident'], funktionsgruppen: ['Vorstand'],
    email: 'adrian@fch.ch', geburtsdatum: '1985-03-15',
    alter: 40, geschlecht: 'm',
  },
  {
    id: '2', name: 'Adrian Kaiser', vorname: 'Adrian', nachname: 'Kaiser',
    role: 'trainer', mitgliedschaft: 'Aktivmitglied',
    rollen: ['Trainer/in'], kader_rollen_raw: ['Co-Trainer/in'],
    kader_eintraege: [
      { team: { name: 'A-Junioren' }, rollen: ['Co-Trainer/in'] },
    ],
    teams: [{ name: '2. Mannschaft', kurz: 'FCH 2' }, { name: 'A-Junioren', kurz: 'A-Jun.' }],
    funktionen: ['Kassier'], funktionsgruppen: ['Vorstand'],
    email: 'kaiser@fch.ch', geburtsdatum: '1990-07-22',
    alter: 35, geschlecht: 'm',
  },
  {
    id: '3', name: 'Sandra Baumann', vorname: 'Sandra', nachname: 'Baumann',
    role: 'spieler', mitgliedschaft: 'Aktivmitglied',
    rollen: ['Spieler/in'], kader_rollen_raw: ['Trainer/in'],
    kader_eintraege: [
      { team: { name: '1. Mannschaft' }, rollen: ['Trainer/in'] },
    ],
    teams: [{ name: '1. Mannschaft', kurz: 'FCH 1' }],
    funktionen: [], funktionsgruppen: [],
    email: 'baumann@fch.ch', geburtsdatum: '1995-11-03',
    alter: 29, geschlecht: 'w',
  },
  {
    id: '4', name: 'Adrian Meier', vorname: 'Adrian', nachname: 'Meier',
    role: 'funktionaer', mitgliedschaft: 'Funktionär',
    rollen: ['Funktionär'], kader_rollen_raw: [],
    kader_eintraege: [],
    teams: [],
    funktionen: ['Kassier'], funktionsgruppen: ['Vorstand'],
    email: 'meier@fch.ch', geburtsdatum: '1975-05-10',
    alter: 50, geschlecht: 'm',
  },
];

// ── filterMembers Tests ──────────────────────────────────────────
describe('filterMembers', () => {

  describe('Suche', () => {
    it('findet nach Name', () => {
      const result = filterMembers(mitglieder, 'Sandra', {}, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('findet nach E-Mail', () => {
      const result = filterMembers(mitglieder, 'kaiser@fch.ch', {}, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('findet nach mehreren Suchbegriffen (UND)', () => {
      const result = filterMembers(mitglieder, 'Adrian Bürgi', {}, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('gibt alle zurück bei leerem Suchbegriff', () => {
      const result = filterMembers(mitglieder, '', {}, ROLLE_LABEL);
      expect(result).toHaveLength(4);
    });
  });

  describe('Teams Filter (ODER)', () => {
    it('filtert nach einem Team', () => {
      const result = filterMembers(mitglieder, '', { teams: ['A-Junioren'] }, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filtert nach mehreren Teams (ODER)', () => {
      const result = filterMembers(mitglieder, '', { teams: ['A-Junioren', 'Frauen 1'] }, ROLLE_LABEL);
      expect(result).toHaveLength(2);
    });
  });

  describe('Kaderrolle + Funktion + Gruppe ODER-Filter', () => {
    it('filtert nach Kaderrolle', () => {
      const result = filterMembers(mitglieder, '', { kaderrollen: ['Co-Trainer/in'] }, ROLLE_LABEL);
      expect(result).toHaveLength(2); // Bürgi + Kaiser
    });

    it('filtert nach Funktionsgruppe', () => {
      const result = filterMembers(mitglieder, '', { funktionsgruppen: ['Vorstand'] }, ROLLE_LABEL);
      expect(result).toHaveLength(3); // Bürgi, Kaiser, Meier
    });

    it('Kaderrolle ODER Funktionsgruppe', () => {
      // Co-Trainer/in: Kaiser (+ Bürgi hat auch Co-Trainer/in in kader_rollen_raw)
      // Vorstand: Bürgi, Kaiser, Meier
      const result = filterMembers(mitglieder, '', {
        kaderrollen: ['Co-Trainer/in'],
        funktionsgruppen: ['Vorstand'],
      }, ROLLE_LABEL);
      // Alle die Co-Trainer ODER Vorstand sind
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('schliesst Mitglieder ohne passende Rolle aus', () => {
      const result = filterMembers(mitglieder, '', { kaderrollen: ['Co-Trainer/in'] }, ROLLE_LABEL);
      expect(result.find(m => m.id === '4')).toBeUndefined(); // Meier hat keine Kaderrolle
    });
  });

  describe('Portalrollen Filter', () => {
    it('filtert nach Portalrolle', () => {
      const result = filterMembers(mitglieder, '', { rollen: ['Funktionär'] }, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  describe('Geschlecht Filter', () => {
    it('filtert nach Geschlecht', () => {
      const result = filterMembers(mitglieder, '', { geschlecht: ['Weiblich'] }, ROLLE_LABEL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });

  describe('Alter Range Filter', () => {
    it('filtert nach Altersbereich', () => {
      const result = filterMembers(mitglieder, '', { alter: { von: 30, bis: 40 } }, ROLLE_LABEL);
      expect(result.every(m => m.alter >= 30 && m.alter <= 40)).toBe(true);
    });
  });

  describe('Jahrgang Range Filter', () => {
    it('filtert nach Jahrgangsbereich', () => {
      const result = filterMembers(mitglieder, '', { jahrgang: { von: 1990, bis: 1995 } }, ROLLE_LABEL);
      expect(result).toHaveLength(2); // Kaiser (1990) + Baumann (1995)
    });
  });
});

// ── sortMembers Tests ────────────────────────────────────────────
describe('sortMembers', () => {
  it('sortiert nach Name aufsteigend', () => {
    const result = sortMembers(mitglieder, 'name', 'asc');
    // de locale: Adrian Bürgi < Adrian Kaiser < Adrian Meier < Sandra Baumann
    // (ü nach u, S nach A)
    expect(result[0].name).toBe('Adrian Bürgi');
    expect(result[result.length - 1].name).toBe('Sandra Baumann');
  });

  it('sortiert nach Name absteigend', () => {
    const result = sortMembers(mitglieder, 'name', 'desc');
    expect(result[0].name).toBe('Sandra Baumann');
    expect(result[result.length - 1].name).toBe('Adrian Bürgi');
  });

  it('respektiert manuelle Reihenfolge', () => {
    const result = sortMembers(mitglieder, 'name', 'asc', ['3', '1', '2', '4']);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('1');
  });

  it('leere Werte kommen ans Ende', () => {
    const result = sortMembers(mitglieder, 'funktionsgruppen', 'asc');
    // Baumann hat keine Funktionsgruppen → ans Ende
    expect(result[result.length - 1].id).toBe('3');
  });
});
