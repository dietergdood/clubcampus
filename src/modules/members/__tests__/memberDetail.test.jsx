/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberDetail.test.jsx
   Unit-Tests für den MemberDetail-Orchestrator:
   - raw-Rekonstruktion (dbRaw + m, m gewinnt nur bei Non-null-Wert)
   - Benutzer-Fetch beim Öffnen + Dedup (kein Refetch bei Nicht-Portal-Tab)

   MemberHero wird gemockt, um das rekonstruierte raw abzugreifen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({ heroRaw: null, confirmMock: vi.fn() }));
const svc = vi.hoisted(() => ({
  fetchBenutzerFuerMitglied: vi.fn(),
  fetchBenutzerByEmail: vi.fn(),
  portalZugangAktivieren: vi.fn(),
  portalZugangDeaktivieren: vi.fn(),
  fetchElternkontakte: vi.fn(),
  fetchKaderFuerMitglied: vi.fn(),
  fetchPortalFunktionen: vi.fn(),
  logAktivitaet: vi.fn(),
}));

vi.mock('../../../theme.ts', () => ({ useConfirm: () => [h.confirmMock, null] }));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));
vi.mock('../../../domains/roles/roleUtils.ts', () => ({ ableitUndSaveRolle: vi.fn().mockResolvedValue('trainer') }));
vi.mock('../../../domains/person/personUtils.ts', () => ({ initials: () => 'XX' }));
vi.mock('../../../domains/members/memberService.ts', () => ({
  ...svc,
  AKTIVITAET_TYP: { PORTAL_DEAKTIVIERT: 'portal_deaktiviert', PORTAL_REAKTIVIERT: 'portal_reaktiviert' },
}));

vi.mock('../MemberHero.tsx', () => ({ MemberHero: (props) => { h.heroRaw = props.raw; return null; } }));
vi.mock('../MemberTabBar.tsx', () => ({ MemberTabBar: () => null }));
vi.mock('../tabs/ElternTab.tsx', () => ({ ElternTab: () => null }));
vi.mock('../tabs/InfoTab.tsx', () => ({ InfoTab: () => null }));
vi.mock('../tabs/PortalTab.tsx', () => ({ PortalTab: () => null }));
vi.mock('../tabs/DatenpruefungTab.tsx', () => ({ DatenpruefungTab: () => null }));
vi.mock('../tabs/VerlaufTab.tsx', () => ({ VerlaufTab: () => null }));
vi.mock('../memberUtils.tsx', () => ({ getFieldVisibility: () => ({}) }));

import { MemberDetail } from '../MemberDetail.tsx';

const sb = { _tag: 'sb' };

function props(overrides = {}) {
  const { m = { id: 1, name: 'X' }, tab = 'info', dbMitglieder = [], sb: sbProp = sb, ...rest } = overrides;
  return {
    m,
    onClose: vi.fn(),
    sb: sbProp,
    role: 'administrator',
    account: { name: 'Admin' },
    dbMitglieder,
    dbMitgliedtypen: [],
    dbPortalRollen: [],
    dbKaderRollen: [],
    kannVerwalten: () => true,
    onReload: vi.fn(),
    setSelectedMember: vi.fn(),
    selectedMember: { id: m.id, name: m.name, _tab: tab },
    reloadMember: vi.fn(),
    refreshArchivCount: vi.fn(),
    brauchtEltern: () => false,
    vereinId: 'verein-1',
    ...rest,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.heroRaw = null;
  h.confirmMock.mockResolvedValue(true);
  svc.fetchBenutzerFuerMitglied.mockResolvedValue({ id: 'u1', role: 'trainer' });
  svc.fetchElternkontakte.mockResolvedValue([]);
  svc.fetchKaderFuerMitglied.mockResolvedValue([]);
  svc.fetchPortalFunktionen.mockResolvedValue([]);
});
afterEach(cleanup);

describe('MemberDetail — raw-Rekonstruktion', () => {
  it('m überschreibt dbRaw bei eigenem Wert, behält dbRaw bei null/fehlend', async () => {
    const dbMitglieder = [{ id: 1, vorname: 'DBVor', nachname: 'DBNach', email: 'db@x.ch' }];
    const m = { id: 1, name: 'X', vorname: 'MVor', email: null };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder })} />); });

    expect(h.heroRaw.vorname).toBe('MVor');   // m gewinnt (eigener Wert)
    expect(h.heroRaw.nachname).toBe('DBNach'); // m hat keinen -> dbRaw bleibt
    expect(h.heroRaw.email).toBe('db@x.ch');   // m.email null -> dbRaw bleibt
  });

  it('rekonstruiert aus m, wenn keine DB-Zeile existiert (Navigationsobjekt)', async () => {
    const m = { id: 5, name: 'Nav', vorname: 'NV' };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });

    expect(h.heroRaw.id).toBe(5);
    expect(h.heroRaw.vorname).toBe('NV');
    expect(h.heroRaw.name).toBe('Nav');
  });
});

describe('MemberDetail — Benutzer-Fetch', () => {
  it('lädt den Benutzer einmal beim Öffnen mit (sb, id)', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: { id: 1, name: 'X' } })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerMitglied).toHaveBeenCalledWith(sb, 1));
    expect(svc.fetchBenutzerFuerMitglied).toHaveBeenCalledTimes(1);
  });

  it('lädt nicht ohne sb', async () => {
    await act(async () => { render(<MemberDetail {...props({ sb: null })} />); });
    expect(svc.fetchBenutzerFuerMitglied).not.toHaveBeenCalled();
  });

  it('lädt beim direkten Einstieg auf den Portal-Tab', async () => {
    await act(async () => { render(<MemberDetail {...props({ tab: 'portal' })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerMitglied).toHaveBeenCalledWith(sb, 1));
  });

  it('kein Refetch beim Wechsel auf einen Nicht-Portal-Tab', async () => {
    const base = props({ tab: 'info' });
    const { rerender } = render(<MemberDetail {...base} />);
    await waitFor(() => expect(svc.fetchBenutzerFuerMitglied).toHaveBeenCalledTimes(1));

    // Tab-Wechsel info -> eltern: Benutzer ist geladen -> kein erneuter Fetch
    await act(async () => {
      rerender(<MemberDetail {...base} selectedMember={{ id: 1, name: 'X', _tab: 'eltern' }} />);
    });
    expect(svc.fetchBenutzerFuerMitglied).toHaveBeenCalledTimes(1);
  });
});
