/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/verlaufTab.test.jsx
   Unit-Tests für VerlaufTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VerlaufTab } from '../tabs/VerlaufTab.jsx';

vi.mock('../../../theme.jsx', () => ({
  Card: ({ children }) => <div>{children}</div>,
  EmptyState: ({ title }) => <div data-testid="empty">{title}</div>,
}));

vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/members/memberService.js', () => ({
  fetchAenderungen: vi.fn(),
  fetchAktivitaeten: vi.fn(),
  FELD_LABEL: {
    strasse: "Strasse", email: "E-Mail", ahv_nr: "AHV-Nr.", rolle: "Portalrolle",
  },
  AKTIVITAET_TYP: {
    ANGELEGT: "angelegt", TEAM_HINZUGEFUEGT: "team_hinzugefuegt",
    TEAM_ENTFERNT: "team_entfernt", FUNKTION_GEAENDERT: "funktion_geaendert",
    ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt", ELTERN_ENTFERNT: "eltern_entfernt",
    ELTERN_GEAENDERT: "eltern_geaendert", KADERROLLE_GEAENDERT: "kaderrolle_geaendert",
    FELD_ERFASST: "feld_erfasst", FELD_GELEERT: "feld_geleert",
    PORTAL_AKTIVIERT: "portal_aktiviert", PORTAL_DEAKTIVIERT: "portal_deaktiviert",
    PORTAL_REAKTIVIERT: "portal_reaktiviert",
  },
}));

import { fetchAenderungen, fetchAktivitaeten } from '../../../domains/members/memberService.js';

const RAW = { id: 1 };
const SB = {};

const AENDERUNG = {
  id: 'a1', feld: 'strasse',
  alter_wert: 'Rosenweg 10', neuer_wert: 'Rosenweg 22',
  geaendert_von: 'Dieter Good',
  geaendert_at: new Date().toISOString(),
};

const AKTIVITAET = {
  id: 'b1', typ: 'team_hinzugefuegt',
  beschreibung: 'Team zugewiesen: 1. Mannschaft',
  geaendert_von: 'Dieter Good',
  geaendert_at: new Date().toISOString(),
};

describe('VerlaufTab', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAenderungen.mockResolvedValue([]);
    fetchAktivitaeten.mockResolvedValue([]);
  });

  describe('Leer-Zustand', () => {
    it('zeigt EmptyState wenn keine Einträge', async () => {
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy());
    });

    it('zeigt Ladezustand initial', () => {
      fetchAenderungen.mockReturnValue(new Promise(() => {}));
      fetchAktivitaeten.mockReturnValue(new Promise(() => {}));
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      expect(screen.getByText('Wird geladen…')).toBeTruthy();
    });
  });

  describe('Änderungen anzeigen', () => {
    it('zeigt Feldname einer Änderung', async () => {
      fetchAenderungen.mockResolvedValue([AENDERUNG]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByText('Strasse')).toBeTruthy());
    });

    it('zeigt alten und neuen Wert', async () => {
      fetchAenderungen.mockResolvedValue([AENDERUNG]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => {
        expect(screen.getByText('Rosenweg 10')).toBeTruthy();
        expect(screen.getByText('Rosenweg 22')).toBeTruthy();
      });
    });

    it('zeigt Benutzer', async () => {
      fetchAenderungen.mockResolvedValue([AENDERUNG]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByText('Dieter Good')).toBeTruthy());
    });

    it('maskiert AHV-Nr. auf beiden Seiten', async () => {
      fetchAenderungen.mockResolvedValue([{
        ...AENDERUNG, feld: 'ahv_nr',
        alter_wert: '756.1234.5678.90', neuer_wert: '756.9876.5432.10',
      }]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => {
        const masks = screen.getAllByText('••• •• ••••');
        expect(masks.length).toBe(2);
      });
    });

    it('übersetzt Portalrolle', async () => {
      fetchAenderungen.mockResolvedValue([{
        ...AENDERUNG, feld: 'rolle',
        alter_wert: 'spieler', neuer_wert: 'trainer',
      }]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => {
        expect(screen.getByText('Spieler/in')).toBeTruthy();
        expect(screen.getByText('Trainer/in')).toBeTruthy();
      });
    });

    it('übersetzt Geschlecht', async () => {
      fetchAenderungen.mockResolvedValue([{
        ...AENDERUNG, feld: 'geschlecht',
        alter_wert: 'm', neuer_wert: 'w',
      }]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => {
        expect(screen.getByText('Männlich')).toBeTruthy();
        expect(screen.getByText('Weiblich')).toBeTruthy();
      });
    });
  });

  describe('Aktivitäten anzeigen', () => {
    it('zeigt Aktivitäts-Beschreibung', async () => {
      fetchAktivitaeten.mockResolvedValue([AKTIVITAET]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByText('Team zugewiesen: 1. Mannschaft')).toBeTruthy());
    });
  });

  describe('Datum-Trenner', () => {
    it('zeigt Heute-Trenner', async () => {
      fetchAenderungen.mockResolvedValue([AENDERUNG]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByText('Heute')).toBeTruthy());
    });

    it('zeigt Datum-Trenner für alten Eintrag', async () => {
      fetchAenderungen.mockResolvedValue([{
        ...AENDERUNG,
        geaendert_at: '2026-07-15T10:00:00Z',
      }]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => expect(screen.getByText('15.07.2026')).toBeTruthy());
    });
  });

  describe('Kombinierte Anzeige', () => {
    it('zeigt Änderungen und Aktivitäten zusammen', async () => {
      fetchAenderungen.mockResolvedValue([AENDERUNG]);
      fetchAktivitaeten.mockResolvedValue([AKTIVITAET]);
      render(<VerlaufTab raw={RAW} sb={SB}/>);
      await waitFor(() => {
        expect(screen.getByText('Strasse')).toBeTruthy();
        expect(screen.getByText('Team zugewiesen: 1. Mannschaft')).toBeTruthy();
      });
    });
  });
});
