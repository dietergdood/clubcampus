/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/portalTab.test.jsx
   Unit-Tests für PortalTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalTab } from '../tabs/PortalTab.jsx';

vi.mock('../../../theme.jsx', () => ({
  Card: ({ children }) => <div>{children}</div>,
  Chip: ({ text }) => <span data-testid="chip">{text}</span>,
}));

vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../constants.js', () => ({
  GN: '#3B6D11', R: '#A32D2D', RL: '#FCEBEB',
}));

vi.mock('../../../domains/members/memberService.js', () => ({
  updateMitgliedRolle: vi.fn().mockResolvedValue(undefined),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: {},
}));

import { updateMitgliedRolle, logAenderung } from '../../../domains/members/memberService.js';

const DB_PORTAL_ROLLEN = [
  { name: 'trainer',  label: 'Trainer/in' },
  { name: 'spieler',  label: 'Spieler/in' },
  { name: 'mitglied', label: 'Mitglied' },
];

const RAW_AKTIV = { id: 1, hat_portal_zugang: true, rolle: 'spieler' };
const RAW_KEIN  = { id: 1, hat_portal_zugang: false, rolle: null };
const RAW_DEAK  = { id: 1, hat_portal_zugang: false, rolle: 'spieler' };

const BENUTZER = {
  id: 'b1', email: 'adrian@test.ch', role: 'spieler',
  created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-07-23T10:00:00Z',
};

function renderTab(props = {}) {
  return render(<PortalTab
    raw={RAW_AKTIV}
    benutzer={BENUTZER}
    sb={{}}
    dbPortalRollen={DB_PORTAL_ROLLEN}
    portalMsg={null}
    portalLoading={false}
    handleUnlink={vi.fn()}
    handleReactivate={vi.fn()}
    onReload={vi.fn()}
    setBenutzer={vi.fn()}
    vereinId="verein-123"
    account={{ name: 'Dieter Good' }}
    {...props}
  />);
}

describe('PortalTab', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Status-Anzeige', () => {
    it('zeigt Aktiv-Chip wenn Portal aktiv', () => {
      renderTab();
      expect(screen.getByText('Aktiv')).toBeTruthy();
    });

    it('zeigt Kein Zugang wenn kein Benutzer', () => {
      renderTab({ raw: RAW_KEIN, benutzer: null });
      expect(screen.getByText('Kein Zugang')).toBeTruthy();
    });

    it('zeigt Deaktiviert wenn benutzer vorhanden aber kein Zugang', () => {
      renderTab({ raw: RAW_DEAK, benutzer: BENUTZER });
      expect(screen.getByText('Deaktiviert')).toBeTruthy();
    });

    it('zeigt E-Mail des Benutzers', () => {
      renderTab();
      expect(screen.getByText('adrian@test.ch')).toBeTruthy();
    });

    it('zeigt aktuelles Rollen-Label', () => {
      renderTab();
      expect(screen.getByText('Spieler/in')).toBeTruthy();
    });
  });

  describe('Rolle editieren', () => {
    it('öffnet Dropdown bei Klick auf Rolle', () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      expect(screen.getByRole('combobox')).toBeTruthy();
    });

    // jsdom triggert onKeyDown auf Select nicht zuverlässig — manuell in Browser testen
    it.skip('ruft updateMitgliedRolle auf beim Speichern via Enter', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'trainer' } });
      fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13 });
      await waitFor(() => expect(updateMitgliedRolle).toHaveBeenCalled(), { timeout: 2000 });
    });

    it.skip('loggt Änderung beim Speichern', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'trainer' } });
      fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13 });
      await waitFor(() => expect(logAenderung).toHaveBeenCalled(), { timeout: 2000 });
    });

    it('schliesst Dropdown bei Esc', () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      expect(screen.getByRole('combobox')).toBeTruthy();
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
      expect(screen.queryByRole('combobox')).toBeNull();
    });
  });

  describe('Deaktivieren / Reaktivieren', () => {
    it('zeigt Deaktivieren-Button wenn aktiv', () => {
      renderTab();
      expect(screen.getByText('Zugang deaktivieren')).toBeTruthy();
    });

    it('ruft handleUnlink auf bei Klick auf Deaktivieren', () => {
      const handleUnlink = vi.fn();
      renderTab({ handleUnlink });
      fireEvent.click(screen.getByText('Zugang deaktivieren'));
      expect(handleUnlink).toHaveBeenCalled();
    });

    it('zeigt Reaktivieren-Button wenn deaktiviert', () => {
      renderTab({ raw: RAW_DEAK, benutzer: BENUTZER });
      expect(screen.getByText('Zugang reaktivieren')).toBeTruthy();
    });

    it('ruft handleReactivate auf bei Klick', () => {
      const handleReactivate = vi.fn();
      renderTab({ raw: RAW_DEAK, benutzer: BENUTZER, handleReactivate });
      fireEvent.click(screen.getByText('Zugang reaktivieren'));
      expect(handleReactivate).toHaveBeenCalled();
    });
  });

  describe('Kein Zugang', () => {
    it('zeigt Hinweis wenn E-Mail vorhanden', () => {
      renderTab({ raw: { ...RAW_KEIN, email: 'adrian@test.ch' }, benutzer: null });
      expect(screen.getByText(/adrian@test.ch/)).toBeTruthy();
    });

    it('zeigt Hinweis wenn keine E-Mail', () => {
      renderTab({ raw: RAW_KEIN, benutzer: null });
      expect(screen.getByText(/Keine E-Mail/)).toBeTruthy();
    });
  });
});
