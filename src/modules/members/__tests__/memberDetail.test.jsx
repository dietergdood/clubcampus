/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberDetail.test.jsx
   Unit-Tests für den MemberDetail-Orchestrator:
   - raw-Rekonstruktion (dbRaw + m, m gewinnt nur bei Non-null-Wert)
   - Benutzer-Fetch beim Öffnen + Dedup (kein Refetch bei Nicht-Portal-Tab)

   MemberHero wird gemockt, um das rekonstruierte raw abzugreifen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({ heroRaw: null, heroMitgliedId: null, confirmMock: vi.fn() }));
const svc = vi.hoisted(() => ({
  fetchBenutzerFuerPerson: vi.fn(),
  fetchBenutzerByEmail: vi.fn(),
  portalZugangAktivieren: vi.fn(),
  portalZugangDeaktivieren: vi.fn(),
  fetchElternkontakte: vi.fn(),
  fetchKaderFuerMitglied: vi.fn(),
  fetchPortalFunktionen: vi.fn(),
  logAktivitaet: vi.fn(),
}));

vi.mock('../../../theme.ts', () => ({
  ModalOrSheet: ({children,open})=>open?<div>{children}</div>:null,
  InfoBox: ({text})=><div>{text}</div>,
  Col: ({children})=><div>{children}</div>,
  Label: ({children})=><span>{children}</span>,
  Input: (p)=><input {...p}/>, useConfirm: () => [h.confirmMock, null] }));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));
vi.mock('../../../domains/roles/roleUtils.ts', () => ({ ableitUndSaveRolle: vi.fn().mockResolvedValue('trainer') }));
vi.mock('../../../domains/person/personUtils.ts', () => ({ initials: () => 'XX' }));
vi.mock('../../../domains/members/memberService.ts', () => ({
  ...svc,
  AKTIVITAET_TYP: { PORTAL_DEAKTIVIERT: 'portal_deaktiviert', PORTAL_REAKTIVIERT: 'portal_reaktiviert' },
}));

vi.mock('../MemberHero.tsx', () => ({ MemberHero: (props) => { h.heroRaw = props.raw; h.heroMitgliedId = props.mitgliedId; return null; } }));
vi.mock('../MemberTabBar.tsx', () => ({ MemberTabBar: () => null }));
vi.mock('../tabs/ElternTab.tsx', () => ({ ElternTab: () => null }));
vi.mock('../tabs/InfoTab.tsx', () => ({ InfoTab: () => null }));
vi.mock('../tabs/PortalTab.tsx', () => ({ PortalTab: () => null }));
vi.mock('../tabs/DatenpruefungTab.tsx', () => ({ DatenpruefungTab: () => null }));
vi.mock('../tabs/VerlaufTab.tsx', () => ({ VerlaufTab: () => null }));
/* Die Mock-Factory listet die benoetigten Exporte einzeln auf — fehlt einer,
   wirft Vitest schon bei der blossen Referenz, und zwar fuer die ganze
   Datei (CLAUDE.md, "Haeufigste Testfalle"). getSichtbarkeit ist seit dem
   19.08.2026 dazugekommen. */
vi.mock('../memberUtils.tsx', () => ({
  getFieldVisibility: () => ({}),
  getSichtbarkeit: () => ({}),
}));

import { MemberDetail } from '../MemberDetail.tsx';

const sb = { _tag: 'sb' };

function props(overrides = {}) {
  const { m = { mitgliedId: 1, personId: "p-1", name: 'X' }, tab = 'info', dbMitglieder = [], sb: sbProp = sb, ...rest } = overrides;
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
  h.heroMitgliedId = null;
  h.confirmMock.mockResolvedValue(true);
  svc.fetchBenutzerFuerPerson.mockResolvedValue({ id: 'u1', role: 'trainer' });
  svc.fetchElternkontakte.mockResolvedValue([]);
  svc.fetchKaderFuerMitglied.mockResolvedValue([]);
  svc.fetchPortalFunktionen.mockResolvedValue([]);
});
afterEach(cleanup);

describe('MemberDetail — raw-Rekonstruktion', () => {
  it('m überschreibt dbRaw bei eigenem Wert, behält dbRaw bei null/fehlend', async () => {
    const dbMitglieder = [{ id: 1, vorname: 'DBVor', nachname: 'DBNach', email: 'db@x.ch' }];
    const m = { mitgliedId: 1, personId: "p-1", name: 'X', vorname: 'MVor', email: null };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder })} />); });

    expect(h.heroRaw.vorname).toBe('MVor');   // m gewinnt (eigener Wert)
    expect(h.heroRaw.nachname).toBe('DBNach'); // m hat keinen -> dbRaw bleibt
    expect(h.heroRaw.email).toBe('db@x.ch');   // m.email null -> dbRaw bleibt
  });

  it('rekonstruiert aus m, wenn keine DB-Zeile existiert (Navigationsobjekt)', async () => {
    const m = { mitgliedId: 5, personId: "p-5", name: 'Nav', vorname: 'NV' };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });

    /* ⚠ `raw.id` gibt es seit dem 21.08.2026 nicht mehr — `PersonZeile` laesst
       es weg. Die Zeile beschreibt einen MENSCHEN; welche Identitaet gemeint
       ist, steht daneben (`mitgliedId` als eigene Prop an den Hero).
       Frueher pruefte dieser Test genau die Zahl, die bei einer Person ohne
       Mitgliedschaft `undefined` gewesen waere. */
    expect(h.heroRaw.id).toBeUndefined();
    expect(h.heroMitgliedId).toBe(5);
    expect(h.heroRaw.vorname).toBe('NV');
    expect(h.heroRaw.name).toBe('Nav');
  });
});

describe('MemberDetail — Benutzer-Fetch', () => {
  it('lädt den Benutzer einmal beim Öffnen mit (sb, id)', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: { mitgliedId: 1, personId: "p-1", name: 'X' } })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, "p-1"));
    expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1);
  });

  it('lädt nicht ohne sb', async () => {
    await act(async () => { render(<MemberDetail {...props({ sb: null })} />); });
    expect(svc.fetchBenutzerFuerPerson).not.toHaveBeenCalled();
  });

  it('lädt beim direkten Einstieg auf den Portal-Tab', async () => {
    await act(async () => { render(<MemberDetail {...props({ tab: 'portal' })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, "p-1"));
  });

  it('kein Refetch beim Wechsel auf einen Nicht-Portal-Tab', async () => {
    const base = props({ tab: 'info' });
    const { rerender } = render(<MemberDetail {...base} />);
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1));

    // Tab-Wechsel info -> eltern: Benutzer ist geladen -> kein erneuter Fetch
    await act(async () => {
      rerender(<MemberDetail {...base} selectedMember={{ mitgliedId: 1, personId: "p-1", name: 'X', _tab: 'eltern' }} />);
    });
    expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════════════════════════
   Eine Person OHNE Mitgliedschaft (21.08.2026)

   Der Schalter der ganzen Seite ist EINE Zeile: welche Achse der
   Feldkonfiguration gilt. Alles andere folgt daraus — kein
   `if (istSupporter)` irgendwo.
   ═══════════════════════════════════════════════════════════════ */
describe('MemberDetail — ohne Mitgliedschaft', () => {
  const ohne = { mitgliedId: null, personId: 'p-9', name: 'Petra Muster' };

  it('reicht mitgliedId=null an den Hero durch', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    expect(h.heroMitgliedId).toBeNull();
  });

  it('⚠ sucht das Konto ueber die PERSON, nicht ueber die Mitgliedschaft', async () => {
    /* Beim Supporter steht benutzer.mitglied_id seit dem Rueckbau vom
       20.08. auf null — ueber sie waere das Konto nie gefunden worden. */
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, 'p-9'));
  });

  it('laedt weder Kader noch Elternkontakte', async () => {
    /* Beides haengt an einer Mitgliedschaft. Frueher waere `raw.id`
       undefined an die Services gegangen — als number typisiert. */
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    expect(svc.fetchKaderFuerMitglied).not.toHaveBeenCalled();
    expect(svc.fetchElternkontakte).not.toHaveBeenCalled();
  });

  it('bei einem Mitglied wird der Kader sehr wohl geladen', async () => {
    /* Die Gegenprobe: sonst koennte der Test oben auch gruen sein, weil
       gar nichts mehr geladen wird. */
    const m = { mitgliedId: 1, personId: 'p-1', name: 'X' };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [{ id: 1 }] })} />); });
    await waitFor(() => expect(svc.fetchKaderFuerMitglied).toHaveBeenCalledWith(sb, 1));
  });
});
