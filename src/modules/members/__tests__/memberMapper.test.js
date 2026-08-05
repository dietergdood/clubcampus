/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberMapper.test.js
   Unit-Tests für mapMembers
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import { mapMembers } from '../memberMapper.ts';

const DB_PORTAL_ROLLEN = [
  { name: 'trainer', label: 'Trainer/in' },
  { name: 'spieler', label: 'Spieler/in' },
  { name: 'funktionaer', label: 'Funktionär' },
];
const DB_KADER_ROLLEN = ['Trainer/in', 'Co-Trainer/in', 'Spieler/in'];

const dbMitglied = {
  id: '1',
  vorname: 'Adrian', nachname: 'Bürgi',
  rolle: 'trainer',
  mitgliedtyp: 'Aktivmitglied',
  kader_rollen: ['Trainer/in'],
  kader_eintraege: [{ team: { name: '1. Mannschaft', kurz: 'FCH 1' }, rollen: ['Trainer/in'] }],
  kader_teams: [{ name: '1. Mannschaft', kurz: 'FCH 1' }],
  teams: [],
  /* Der Portal-Status kommt seit Etappe 6c aus dem Join auf `benutzer`
     (hat_benutzer / benutzer_deaktiviert), nicht mehr aus dem Kennzeichen
     mitglieder.hat_portal_zugang — das war eine Kopie derselben Aussage und
     konnte veralten. */
  hat_benutzer: true, benutzer_deaktiviert: false,
  profil_geprueft_at: '2026-07-01T10:00:00Z',
  email: 'adrian@fch.ch', telefon: '079 123 45 67',
  geburtsdatum: '1985-03-15',
  geschlecht: 'm',
  ort: 'Herrliberg', plz: '8704',
  nationalitaet: 'Schweiz', nationalitaet2: null,
  funktionen: ['Präsident'], foto_url: null,
  fairgate_id: 'FG-001', js_nr: 'JS-123',
  spielerpass: null, eintrittsdatum: '2010-01-01',
  strasse: 'Seestrasse 1', heimatort: 'Küsnacht', ahv_nr: null,
};

describe('mapMembers', () => {

  describe('Grundtransformation', () => {
    it('gibt ein Array zurück', () => {
      const result = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('setzt Name korrekt zusammen', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.name).toBe('Adrian Bürgi');
      expect(m.vorname).toBe('Adrian');
      expect(m.nachname).toBe('Bürgi');
    });

    it('gibt ? zurück wenn Name fehlt', () => {
      const [m] = mapMembers([{ ...dbMitglied, vorname: null, nachname: null }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.name).toBe('?');
    });

    it('setzt id korrekt', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.id).toBe('1');
    });
  });

  describe('Rollenlogik', () => {
    it('setzt Portalrolle korrekt', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.role).toBe('trainer');
    });

    it('übersetzt Kaderrollen via ROLLE_LABEL', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.rollen).toContain('Trainer/in');
    });

    it('nutzt Portalrolle als Fallback wenn keine Kaderrollen', () => {
      const [m] = mapMembers([{ ...dbMitglied, kader_rollen: [] }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.rollen).toContain('Trainer/in');
    });

    it('gibt leere rollen zurück wenn weder Kader noch Portalrolle', () => {
      const [m] = mapMembers([{ ...dbMitglied, kader_rollen: [], rolle: null }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.rollen).toHaveLength(0);
    });
  });

  describe('Portal-Status', () => {
    it('setzt Aktiv wenn hat_portal_zugang', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.portal).toBe('Aktiv');
    });

    it('setzt Deaktiviert wenn das Konto deaktiviert ist', () => {
      const [m] = mapMembers([{ ...dbMitglied, hat_benutzer: true, benutzer_deaktiviert: true }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.portal).toBe('Deaktiviert');
    });

    it('setzt Kein Zugang wenn kein Benutzer', () => {
      const [m] = mapMembers([{ ...dbMitglied, hat_benutzer: false }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.portal).toBe('Kein Zugang');
    });
  });

  describe('Datenprüfungs-Status', () => {
    /* Quelle ist profil_geprueft_at (seit Session 17). Das frühere Feld
       "geprueft" gibt es in mitglieder nicht — die alte Fixture hat es
       erfunden, wodurch dieser Test grün war, obwohl die Spalte in der App
       für jedes Mitglied "Ausstehend" zeigte. datenstatus ist veraltet. */
    it('setzt Geprueft wenn profil_geprueft_at gesetzt ist', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.datenpruefung).toBe('Geprueft');
    });

    it('setzt Ausstehend wenn profil_geprueft_at null ist', () => {
      const [m] = mapMembers([{ ...dbMitglied, profil_geprueft_at: null }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.datenpruefung).toBe('Ausstehend');
    });

    it('setzt Ausstehend wenn profil_geprueft_at fehlt', () => {
      const { profil_geprueft_at, ...ohne } = dbMitglied;
      const [m] = mapMembers([ohne], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.datenpruefung).toBe('Ausstehend');
    });

    it('ignoriert das veraltete datenstatus-Feld', () => {
      const [m] = mapMembers([{ ...dbMitglied, datenstatus: 'Unvollstaendig' }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.datenpruefung).toBe('Geprueft');
    });
  });

  describe('Teams', () => {
    it('nimmt kader_teams wenn vorhanden', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.teams[0].name).toBe('1. Mannschaft');
      expect(m.teams[0].kurz).toBe('FCH 1');
    });

    it('fällt zurück auf teams wenn keine kader_teams', () => {
      const [m] = mapMembers([{
        ...dbMitglied,
        kader_teams: [],
        teams: ['2. Mannschaft'],
      }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.teams[0].name).toBe('2. Mannschaft');
    });
  });

  describe('Berechnete Felder', () => {
    it('berechnet Alter aus Geburtsdatum', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.alter).toBeGreaterThan(30);
      expect(m.alter).toBeLessThan(60);
    });

    it('gibt null zurück wenn kein Geburtsdatum', () => {
      const [m] = mapMembers([{ ...dbMitglied, geburtsdatum: null }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.alter).toBeNull();
    });

    it('setzt Wohnort korrekt zusammen', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.wohnort).toBe('8704 Herrliberg');
    });

    it('gibt null zurück wenn kein Ort', () => {
      const [m] = mapMembers([{ ...dbMitglied, ort: null, plz: null }], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.wohnort).toBeNull();
    });
  });

  describe('Kontaktdaten', () => {
    it('übernimmt Email und Telefon', () => {
      const [m] = mapMembers([dbMitglied], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(m.email).toBe('adrian@fch.ch');
      expect(m.telefon).toBe('079 123 45 67');
    });
  });

  describe('ROLLE_LABEL Fallback', () => {
    it('nutzt hardcoded Labels wenn nicht in dbPortalRollen', () => {
      const [m] = mapMembers([{ ...dbMitglied, kader_rollen: [], rolle: 'administrator' }], [], DB_KADER_ROLLEN);
      expect(m.rollen).toContain('Administrator');
    });
  });

  describe('Leere Liste', () => {
    it('gibt leeres Array zurück', () => {
      const result = mapMembers([], DB_PORTAL_ROLLEN, DB_KADER_ROLLEN);
      expect(result).toHaveLength(0);
    });
  });
});
