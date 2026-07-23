/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberGrouping.test.js
   Unit-Tests für getGroupKey und buildGroups
   Alle 10 Gruppierungsszenarien aus ARCHITECTURE.md
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import { getGroupKey, buildGroups } from '../memberGrouping.js';

// ── Testdaten ────────────────────────────────────────────────────
const ROLLE_LABEL = {
  trainer: 'Trainer/in',
  spieler: 'Spieler/in',
  funktionaer: 'Funktionär',
};

const buergi = {
  id: '1', name: 'Adrian Bürgi', role: 'trainer',
  kader_rollen_raw: ['Trainer/in'],
  kader_eintraege: [
    { team: { name: '1. Mannschaft', kurz: 'FCH 1' }, rollen: ['Trainer/in'] },
    { team: { name: 'Frauen 1', kurz: 'Frauen 1' }, rollen: ['Trainer/in'] },
  ],
  teams: [{ name: '1. Mannschaft', kurz: 'FCH 1' }, { name: 'Frauen 1', kurz: 'Frauen 1' }],
  funktionen: ['Präsident'], funktionsgruppen: ['Vorstand'],
  geburtsdatum: '1985-03-15', eintritt: '2010-01-01',
};

const kaiser = {
  id: '2', name: 'Adrian Kaiser', role: 'trainer',
  kader_rollen_raw: ['Co-Trainer/in'],
  kader_eintraege: [
    { team: { name: '2. Mannschaft', kurz: 'FCH 2' }, rollen: ['Spieler/in'] },
    { team: { name: 'A-Junioren', kurz: 'A-Jun.' }, rollen: ['Co-Trainer/in'] },
  ],
  teams: [{ name: '2. Mannschaft', kurz: 'FCH 2' }, { name: 'A-Junioren', kurz: 'A-Jun.' }],
  funktionen: ['Kassier'], funktionsgruppen: ['Vorstand'],
  geburtsdatum: '1990-07-22', eintritt: '2015-06-01',
};

const meier = {
  id: '3', name: 'Adrian Meier', role: 'funktionaer',
  kader_rollen_raw: [],
  kader_eintraege: [],
  teams: [],
  funktionen: ['Kassier'], funktionsgruppen: ['Vorstand'],
  geburtsdatum: '1975-05-10', eintritt: '2005-03-01',
};

const paged = [buergi, kaiser, meier];

// ── getGroupKey Tests ────────────────────────────────────────────
describe('getGroupKey', () => {

  describe('Teams', () => {
    it('gibt alle Teams zurück', () => {
      const keys = getGroupKey(buergi, 'teams', ROLLE_LABEL, {});
      expect(keys.map(k => k.key)).toContain('1. Mannschaft');
      expect(keys.map(k => k.key)).toContain('Frauen 1');
      expect(keys[0].type).toBe('team');
    });

    it('gibt Kein Team zurück wenn keine Teams', () => {
      const keys = getGroupKey(meier, 'teams', ROLLE_LABEL, {});
      expect(keys[0].key).toBe('Kein Team');
    });

    it('filtert Teams nach Kaderrolle-Filter (Szenario 1)', () => {
      // Kaiser ist nur in A-Junioren Co-Trainer — 2. Mannschaft soll NICHT erscheinen
      const keys = getGroupKey(kaiser, 'teams', ROLLE_LABEL, {
        kaderrollen: ['Co-Trainer/in'],
      });
      const teamNames = keys.map(k => k.key);
      expect(teamNames).toContain('A-Junioren');
      expect(teamNames).not.toContain('2. Mannschaft');
    });
  });

  describe('Kaderrollen', () => {
    it('gibt alle Kaderrollen zurück', () => {
      const keys = getGroupKey(buergi, 'kaderrollen', ROLLE_LABEL, {});
      expect(keys[0].key).toBe('Trainer/in');
      expect(keys[0].type).toBe('kaderrolle');
    });

    it('filtert nach __parentTeam (Szenario 3 — Mehrfachgruppierung)', () => {
      // Kaiser ist Co-Trainer in A-Junioren, Spieler in 2. Mannschaft
      // Bei parentTeam = "A-Junioren" → nur Co-Trainer/in
      const keys = getGroupKey(kaiser, 'kaderrollen', ROLLE_LABEL, {
        __parentTeam: 'A-Junioren',
      });
      expect(keys.map(k => k.key)).toContain('Co-Trainer/in');
      expect(keys.map(k => k.key)).not.toContain('Spieler/in');
    });

    it('gibt Keine Kaderrolle zurück wenn leer', () => {
      const keys = getGroupKey(meier, 'kaderrollen', ROLLE_LABEL, {});
      expect(keys[0].key).toBe('Keine Kaderrolle');
    });
  });

  describe('Portalrollen', () => {
    it('gibt Portalrolle zurück', () => {
      const keys = getGroupKey(buergi, 'rollen', ROLLE_LABEL, {});
      expect(keys[0]).toBe('Trainer/in');
    });
  });

  describe('Funktionsgruppen', () => {
    it('gibt Funktionsgruppen zurück', () => {
      const keys = getGroupKey(buergi, 'funktionsgruppen', ROLLE_LABEL, {});
      expect(keys[0].key).toBe('Vorstand');
      expect(keys[0].type).toBe('gruppe');
    });

    it('filtert nach aktivem Gruppen-Filter', () => {
      const keys = getGroupKey(buergi, 'funktionsgruppen', ROLLE_LABEL, {
        funktionsgruppen: ['Vorstand'],
      });
      expect(keys.map(k => k.key)).toContain('Vorstand');
    });
  });

  describe('Jahrgang', () => {
    it('gibt Jahrgang aus Geburtsdatum zurück', () => {
      const keys = getGroupKey(buergi, '__jahrgang', ROLLE_LABEL, {});
      expect(keys[0]).toBe('1985');
    });

    it('gibt Unbekannt zurück wenn kein Geburtsdatum', () => {
      const keys = getGroupKey({ ...buergi, geburtsdatum: null }, '__jahrgang', ROLLE_LABEL, {});
      expect(keys[0]).toBe('Unbekannt');
    });
  });
});

// ── buildGroups Tests ────────────────────────────────────────────
describe('buildGroups', () => {

  it('Szenario 5: keine Gruppierung', () => {
    const groups = buildGroups(paged, 'none', ROLLE_LABEL, {});
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('');
    expect(groups[0].members).toHaveLength(3);
  });

  it('Szenario 6: Gruppierung nach Kaderrolle', () => {
    const groups = buildGroups(paged, 'kaderrollen', ROLLE_LABEL, {});
    const keys = groups.map(g => g.key);
    expect(keys).toContain('Trainer/in');
    expect(keys).toContain('Co-Trainer/in');
    expect(keys).toContain('Keine Kaderrolle'); // Meier
  });

  it('Szenario 7: Mehrfachgruppierung Team → Kaderrolle', () => {
    const groups = buildGroups(paged, ['teams', 'kaderrollen'], ROLLE_LABEL, {});
    // Erste Ebene: Teams
    const teamKeys = groups.map(g => g.key);
    expect(teamKeys).toContain('1. Mannschaft');
    expect(teamKeys).toContain('A-Junioren');
    // Zweite Ebene: Kaderrollen im Team
    const mannschaft = groups.find(g => g.key === '1. Mannschaft');
    expect(mannschaft?.children).toBeTruthy();
    const rollenInMannschaft = mannschaft.children.map(g => g.key);
    expect(rollenInMannschaft).toContain('Trainer/in');
    // Kaiser soll NICHT als Co-Trainer in 1. Mannschaft erscheinen
    expect(rollenInMannschaft).not.toContain('Co-Trainer/in');
  });

  it('Szenario 1: Filter Kaderrolle + Gruppierung nach Team', () => {
    // Nur Co-Trainer/in Filter
    const groups = buildGroups(paged, 'teams', ROLLE_LABEL, {
      kaderrollen: ['Co-Trainer/in'],
    });
    const teamKeys = groups.map(g => g.key);
    // Kaiser ist Co-Trainer in A-Junioren → erscheint dort
    expect(teamKeys).toContain('A-Junioren');
    // Kaiser ist nur Spieler in 2. Mannschaft → soll NICHT erscheinen
    expect(teamKeys).not.toContain('2. Mannschaft');
  });

  it('Szenario 4: Filter Kaderrolle ODER Funktionsgruppe', () => {
    const groups = buildGroups(paged, '__teams_funktionen', ROLLE_LABEL, {
      kaderrollen: ['Co-Trainer/in'],
      funktionsgruppen: ['Vorstand'],
    });
    const keys = groups.map(g => g.key);
    // Vorstand als Gruppe
    expect(keys).toContain('Vorstand');
    // A-Junioren als Team (Kaiser ist Co-Trainer dort)
    expect(keys).toContain('A-Junioren');
  });

  it('sortiert Gruppen alphabetisch by default', () => {
    const groups = buildGroups(paged, 'kaderrollen', ROLLE_LABEL, {});
    const keys = groups.map(g => g.key);
    const sorted = [...keys].sort((a, b) => a.localeCompare(b));
    expect(keys).toEqual(sorted);
  });

  it('respektiert groupOrder', () => {
    const groups = buildGroups(paged, 'kaderrollen', ROLLE_LABEL, {}, null, {
      kaderrollen: ['Co-Trainer/in', 'Trainer/in'],
    });
    expect(groups[0].key).toBe('Co-Trainer/in');
    expect(groups[1].key).toBe('Trainer/in');
  });
});
