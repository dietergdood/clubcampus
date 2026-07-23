/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/personTeams.test.jsx
   Unit-Tests für PersonTeams
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonTeams } from '../../../shared/person/PersonTeams.jsx';

vi.mock('../../../theme.jsx', () => ({
  Btn: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  ModalOrSheet: ({ open, children }) => open ? <div data-testid="modal">{children}</div> : null,
  ModalTitle: ({ children }) => <div>{children}</div>,
  DropMenu: ({ items }) => (
    <div>
      {(items||[]).filter(i=>i&&i.label).map((item,i) => (
        <button key={i} onClick={item.onClick} data-testid={`menu-${item.label}`}>{item.label}</button>
      ))}
    </div>
  ),
  useConfirm: () => [vi.fn().mockResolvedValue(true), <div key="cd"/>],
  ConfirmDialog: () => null,
  useIsMobile: () => false,
}));

vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/season/seasonUtils.js', () => ({
  currentSeason: () => '2026',
}));

vi.mock('../../../domains/members/memberService.js', () => ({
  fetchKaderFuerMitglied: vi.fn().mockResolvedValue([]),
  fetchAktiveTeams: vi.fn().mockResolvedValue([]),
  fetchPortalFunktionenMitGruppe: vi.fn().mockResolvedValue([]),
  upsertKader: vi.fn().mockResolvedValue({}),
  updateKader: vi.fn().mockResolvedValue({}),
  deaktiviereKader: vi.fn().mockResolvedValue({}),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  logAktivitaet: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: {
    TEAM_HINZUGEFUEGT: "team_hinzugefuegt",
    TEAM_ENTFERNT: "team_entfernt",
    KADERROLLE_GEAENDERT: "kaderrolle_geaendert",
  },
}));

import { upsertKader, deaktiviereKader, logAktivitaet } from '../../../domains/members/memberService.js';

const RAW = { id: 1 };

const TEAM_DETAILS = [
  { id: 'k1', rollen: ['Spieler/in'], rueckennr: '9', position: 'Stürmer', teams: { id: 1, name: '1. Mannschaft', kurzname: '1M' } },
  { id: 'k2', rollen: ['Trainer/in'], rueckennr: null, position: null, teams: { id: 2, name: 'Bb-Junioren', kurzname: 'BB' } },
];

const ALL_TEAMS = [
  { id: 1, name: '1. Mannschaft' },
  { id: 2, name: 'Bb-Junioren' },
  { id: 3, name: 'Da-Junioren' },
];

const DB_KADER_ROLLEN = [
  { name: 'Spieler/in', ist_trainer: false },
  { name: 'Trainer/in', ist_trainer: true },
];

function renderComp(props = {}) {
  return render(<PersonTeams
    raw={RAW}
    sb={{}}
    canEdit={true}
    vereinId="verein-123"
    account={{ name: 'Dieter Good' }}
    dbKaderRollen={DB_KADER_ROLLEN}
    teamDetails={TEAM_DETAILS}
    setTeamDetails={vi.fn()}
    allTeams={ALL_TEAMS}
    setAllTeams={vi.fn()}
    assignFunktionen={[]}
    setAssignFunktionen={vi.fn()}
    onReload={vi.fn()}
    ableitRolle={vi.fn().mockResolvedValue(undefined)}
    {...props}
  />);
}

describe('PersonTeams', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Anzeige', () => {
    it('zeigt bestehende Teams', () => {
      renderComp();
      expect(screen.getByText('1. Mannschaft')).toBeTruthy();
      expect(screen.getByText('Bb-Junioren')).toBeTruthy();
    });

    it('zeigt Kaderrollen als Chips', () => {
      renderComp();
      expect(screen.getByText('Spieler/in')).toBeTruthy();
      expect(screen.getByText('Trainer/in')).toBeTruthy();
    });

    it('zeigt Zuweisen-Button wenn canEdit', () => {
      renderComp();
      expect(screen.getByText('Zuweisen')).toBeTruthy();
    });

    it('zeigt keinen Zuweisen-Button ohne canEdit', () => {
      renderComp({ canEdit: false });
      expect(screen.queryByText('Zuweisen')).toBeNull();
    });

    it('zeigt leere Meldung wenn keine Teams', () => {
      renderComp({ teamDetails: [] });
      expect(screen.getByText('Keinem Team zugewiesen.')).toBeTruthy();
    });
  });

  describe('Team zuweisen Modal', () => {
    it('öffnet Modal bei Zuweisen-Klick', async () => {
      renderComp();
      fireEvent.click(screen.getByText('Zuweisen'));
      await waitFor(() => expect(screen.getByTestId('modal')).toBeTruthy());
    });
  });

  describe('Team entfernen', () => {
    it('ruft deaktiviereKader auf beim Entfernen', async () => {
      renderComp();
      const entfernenBtns = screen.getAllByTestId('menu-Entfernen');
      fireEvent.click(entfernenBtns[0]);
      await waitFor(() => expect(deaktiviereKader).toHaveBeenCalledWith({}, 'k1'));
    });

    it('loggt Aktivität beim Entfernen', async () => {
      renderComp();
      const entfernenBtns = screen.getAllByTestId('menu-Entfernen');
      fireEvent.click(entfernenBtns[0]);
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), 1, 'verein-123', 'team_entfernt',
        expect.stringContaining('1. Mannschaft'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });


});
