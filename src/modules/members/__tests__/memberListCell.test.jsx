/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberListCell.test.jsx
   Unit-Tests für makeMemberRenderCell
   Fokus: kontextsensitive Cases (teams_rollen, funktionen, rollen)
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeMemberRenderCell } from '../MemberListCell.jsx';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n} />,
}));
vi.mock('../../../theme.jsx', () => ({
  Av: ({ name }) => <span data-av={name}>{name?.slice(0,2)}</span>,
  PortalBadge: ({ val }) => <span data-portal={val}>{val}</span>,
  DpBadge: ({ val }) => <span data-dp={val}>{val}</span>,
}));

// ── Testdaten ────────────────────────────────────────────────────
const ROLLE_LABEL = {
  trainer: 'Trainer/in',
  spieler: 'Spieler/in',
  administrator: 'Administrator',
};
const TRAINER_KEYS = ['Trainer/in', 'Co-Trainer/in'];

const mitglied = {
  id: '1', name: 'Adrian Bürgi', vorname: 'Adrian', nachname: 'Bürgi',
  role: 'trainer', mitgliedschaft: 'Aktivmitglied',
  rollen: ['Trainer/in'],
  kader_rollen_raw: ['Trainer/in', 'Co-Trainer/in'],
  kader_eintraege: [
    { team: { name: '1. Mannschaft', kurz: 'FCH 1' }, rollen: ['Trainer/in'] },
    { team: { name: 'Frauen 1', kurz: 'Fr. 1' }, rollen: ['Co-Trainer/in'] },
  ],
  teams: [
    { name: '1. Mannschaft', kurz: 'FCH 1' },
    { name: 'Frauen 1', kurz: 'Fr. 1' },
  ],
  funktionen: ['Präsident'],
  funktionsgruppen: ['Vorstand'],
  hat_portal_zugang: true, hat_benutzer: true,
  portal: 'Aktiv',
  datenpruefung: 'Geprueft',
  foto_url: null,
};

const defaultProps = {
  portalFunktionen: [],
  TRAINER_KEYS,
  ROLLE_LABEL,
  teamsPopover: null,
  setTeamsPopover: vi.fn(),
  expandedTeams: new Set(),
  setExpandedTeams: vi.fn(),
  setSelectedMember: vi.fn(),
};

function renderCell(colKey, row=mitglied, gc={type:'none',key:null}, filterVals={}) {
  const renderFn = makeMemberRenderCell(defaultProps);
  const col = { key: colKey };
  const { container } = render(<table><tbody><tr>{renderFn(col, row, gc, filterVals)}</tr></tbody></table>);
  return container.querySelector('td');
}

// ── Tests ────────────────────────────────────────────────────────
describe('makeMemberRenderCell', () => {

  describe('name', () => {
    it('zeigt Mitgliedname', () => {
      const td = renderCell('name');
      expect(td.textContent).toContain('Adrian Bürgi');
    });
  });

  describe('mitgliedschaft', () => {
    it('zeigt Mitgliedschaftstyp', () => {
      const td = renderCell('mitgliedschaft');
      expect(td.textContent).toContain('Aktivmitglied');
    });

    it('zeigt — wenn leer', () => {
      const td = renderCell('mitgliedschaft', { ...mitglied, mitgliedschaft: null });
      expect(td.textContent).toContain('—');
    });
  });

  describe('rollen', () => {
    it('zeigt Portalrolle als Chip', () => {
      const td = renderCell('rollen');
      expect(td.textContent).toContain('Trainer/in');
    });

    it('zeigt — wenn keine Portalrolle', () => {
      const td = renderCell('rollen', { ...mitglied, role: null });
      expect(td.textContent).toContain('—');
    });

    it('zeigt — wenn Portalrolle ist -', () => {
      const td = renderCell('rollen', { ...mitglied, role: '-' });
      expect(td.textContent).toContain('—');
    });
  });

  describe('teams', () => {
    it('zeigt Teams', () => {
      const td = renderCell('teams');
      expect(td.textContent).toContain('FCH 1');
    });

    it('zeigt — bei gc.type="gruppe"', () => {
      const td = renderCell('teams', mitglied, { type: 'gruppe', key: 'Vorstand' });
      expect(td.textContent).toContain('—');
    });

    it('filtert auf aktuelles Team bei gc.type="team"', () => {
      const td = renderCell('teams', mitglied, { type: 'team', key: '1. Mannschaft' });
      expect(td.textContent).toContain('FCH 1');
      expect(td.textContent).not.toContain('Fr. 1');
    });
  });

  describe('teams_rollen — kritischer kontextsensitiver Case', () => {
    it('zeigt alle Teams+Rollen ohne Kontext', () => {
      const td = renderCell('teams_rollen');
      expect(td.textContent).toContain('FCH 1');
    });

    it('zeigt — bei gc.type="gruppe"', () => {
      const td = renderCell('teams_rollen', mitglied, { type: 'gruppe', key: 'Vorstand' });
      expect(td.textContent).toContain('—');
    });

    it('filtert auf Team bei gc.type="team"', () => {
      const td = renderCell('teams_rollen', mitglied, { type: 'team', key: '1. Mannschaft' });
      expect(td.textContent).toContain('FCH 1');
      expect(td.textContent).not.toContain('Fr. 1');
    });

    it('filtert auf Rolle bei gc.subType="kaderrolle" (Mehrfachgruppierung)', () => {
      // Team=1. Mannschaft, Rolle=Trainer/in → nur FCH 1 · Trainer/in
      // NICHT auch Co-Trainer/in aus Frauen 1
      const td = renderCell('teams_rollen', mitglied, {
        type: 'team', key: '1. Mannschaft',
        subType: 'kaderrolle', subKey: 'Trainer/in',
      });
      expect(td.textContent).toContain('FCH 1');
      expect(td.textContent).not.toContain('Fr. 1');
    });
  });

  describe('funktionen', () => {
    it('zeigt Vereinsfunktionen', () => {
      const td = renderCell('funktionen');
      expect(td.textContent).toContain('Präsident');
    });

    it('zeigt — bei gc.type="team"', () => {
      const td = renderCell('funktionen', mitglied, { type: 'team', key: '1. Mannschaft' });
      expect(td.textContent).toContain('—');
    });
  });

  describe('funktionsgruppen', () => {
    it('zeigt Funktionsgruppen', () => {
      const td = renderCell('funktionsgruppen');
      expect(td.textContent).toContain('Vorstand');
    });

    it('zeigt — bei gc.type="team"', () => {
      const td = renderCell('funktionsgruppen', mitglied, { type: 'team', key: '1. Mannschaft' });
      expect(td.textContent).toContain('—');
    });
  });

  describe('datenpruefung', () => {
    it('rendert DpBadge', () => {
      const td = renderCell('datenpruefung');
      expect(td.querySelector('[data-dp]')).toBeTruthy();
    });
  });

  describe('portal', () => {
    it('rendert PortalBadge', () => {
      const td = renderCell('portal');
      expect(td.querySelector('[data-portal]')).toBeTruthy();
    });
  });

  describe('Standardfelder', () => {
    it('zeigt Email', () => {
      const td = renderCell('email', { ...mitglied, email: 'test@fch.ch' });
      expect(td.textContent).toContain('test@fch.ch');
    });

    it('zeigt — wenn Feld leer', () => {
      const td = renderCell('email', { ...mitglied, email: null });
      expect(td.textContent).toContain('—');
    });
  });
});
