/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/mitgliederBulk.test.jsx
   Unit-Tests für die Bulk-Aktionen in MitgliederModul (Senior-Review H1):
   handleBulkDelete / handleBulkDeactivate werten Supabase-Fehler aus,
   statt faelschlich Erfolg zu melden.

   Die Handler sind komponenteninterne Funktionen -> wir rendern das
   Modul, mocken ListView und greifen dessen bulkActions-Callbacks ab.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

// Hoisted State: von ListView abgegriffene Props + steuerbarer confirm.
const h = vi.hoisted(() => ({ listViewProps: null, confirmMock: vi.fn() }));

// Steuerbare Service-Mocks.
const svc = vi.hoisted(() => ({
  archiviereMitglied: vi.fn(),
  deleteMitglied: vi.fn(),
  fetchArchiv: vi.fn(),
  fetchArchivCount: vi.fn(),
  fetchMitglied: vi.fn(),
  fetchAlleElternkontakte: vi.fn(),
  fetchMitgliedtypPflichtfelder: vi.fn(),
  fetchPortalFunktionen: vi.fn(),
}));

vi.mock('../../../shared/list/ListView.tsx', () => ({
  ListView: (props) => { h.listViewProps = props; return null; },
}));
vi.mock('../../../theme.ts', () => ({
  Av: () => null,
  useConfirm: () => [h.confirmMock, null],
}));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));
vi.mock('../../../domains/members/memberService.ts', () => svc);
/* MitgliederModul laedt seit dem 19.08.2026 die Feldkonfiguration. Ohne
   diesen Mock lief der echte Service gegen die sb-Attrappe und warf eine
   unbehandelte Rejection — die Tests blieben gruen, Vitest meldete sie
   aber als "unhandled error". */
vi.mock('../../../domains/members/feldkonfigService.ts', () => ({
  fetchFeldkonfig: vi.fn(async () => []),
}));
vi.mock('../../../domains/members/useMemberMeta.ts', () => ({
  useMemberMeta: () => ({ ROLLE_LABEL: {}, TRAINER_KEYS: [], funktionenGruppenMap: {} }),
}));
vi.mock('../../../domains/person/personUtils.ts', () => ({ vollname: (m) => m?.name || '' }));

// Kinder-Komponenten / Daten-Utils stubben (Bulk-Logik braucht sie nicht).
vi.mock('../MemberDetail.tsx', () => ({ MemberDetail: () => null }));
vi.mock('../NeuesMitgliedModal.tsx', () => ({ NeuesMitgliedModal: () => null }));
vi.mock('../MemberKPIs.tsx', () => ({ MemberKPIs: () => null }));
vi.mock('../ArchivView.tsx', () => ({ ArchivView: () => null }));
vi.mock('../ElternListView.tsx', () => ({ ElternListView: () => null }));
vi.mock('../MemberListCell.tsx', () => ({ makeMemberRenderCell: () => () => null }));
vi.mock('../memberConstants.ts', () => ({
  SAVED_VIEWS: { standard: { cols: [] } }, COL_GROUPS: [], ALL_COLS: [],
  GROUP_OPTIONS: [], GROUP_OPTIONS_MORE: [],
}));
vi.mock('../memberDataUtils.ts', () => ({
  mapMembers: () => [], filterMembers: (r) => r, sortMembers: (r) => r,
  buildGroups: () => [], exportData: () => {},
}));

import { MitgliederModul } from '../../MitgliederModul.tsx';

const sb = { _tag: 'sb' };
let onReload;

function renderModul(extra = {}) {
  onReload = vi.fn();
  return render(
    <MitgliederModul
      role="administrator"
      account={{ id: 'a1', name: 'Test Admin' }}
      dbMitglieder={[]}
      dbMitgliedtypen={[]}
      dbPortalRollen={[]}
      dbKaderRollen={[]}
      kannVerwalten={() => true}
      kannSchreiben={() => true}
      sb={sb}
      onReload={onReload}
      vereinId="verein-1"
      {...extra}
    />,
  );
}

/** Holt einen Bulk-Callback aus den abgegriffenen ListView-Props. */
function bulkAction(labelPart) {
  const a = (h.listViewProps.bulkActions || []).find((x) => x.label.includes(labelPart));
  return a.onClick;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.listViewProps = null;
  h.confirmMock.mockResolvedValue(true);
  svc.fetchArchiv.mockResolvedValue([]);
  svc.fetchArchivCount.mockResolvedValue(0);
  svc.fetchMitglied.mockResolvedValue(null);
  svc.fetchAlleElternkontakte.mockResolvedValue([]);
  svc.fetchMitgliedtypPflichtfelder.mockResolvedValue([]);
  svc.fetchPortalFunktionen.mockResolvedValue([]);
  svc.deleteMitglied.mockResolvedValue(null);
  svc.archiviereMitglied.mockResolvedValue(null);
});
afterEach(cleanup);

describe('MitgliederModul — handleBulkDelete (H1)', () => {
  it('löscht alle und meldet keinen Fehler, wenn nichts fehlschlägt', async () => {
    renderModul();
    const del = bulkAction('Löschen');
    await act(async () => { await del(new Set([1, 2, 3])); });

    expect(svc.deleteMitglied).toHaveBeenCalledTimes(3);
    expect(svc.deleteMitglied).toHaveBeenCalledWith(sb, 1);
    expect(onReload).toHaveBeenCalled();
    // nur der initiale Bestätigungsdialog, kein Fehler-Dialog
    expect(h.confirmMock).toHaveBeenCalledTimes(1);
  });

  it('meldet die Anzahl fehlgeschlagener Löschungen (deleteMitglied gibt Fehler zurück)', async () => {
    svc.deleteMitglied.mockImplementation((_sb, id) => Promise.resolve(id === 2 ? { message: 'FK' } : null));
    renderModul();
    await act(async () => { await bulkAction('Löschen')(new Set([1, 2, 3])); });

    expect(onReload).toHaveBeenCalled();
    expect(h.confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nicht alle gelöscht',
      message: expect.stringContaining('1 von 3'),
    }));
  });

  it('zählt eine rejected Promise als fehlgeschlagen (allSettled)', async () => {
    svc.deleteMitglied.mockImplementation((_sb, id) => id === 2 ? Promise.reject(new Error('boom')) : Promise.resolve(null));
    renderModul();
    await act(async () => { await bulkAction('Löschen')(new Set([1, 2, 3])); });

    expect(h.confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('1 von 3'),
    }));
  });

  it('tut nichts, wenn der Bestätigungsdialog abgebrochen wird', async () => {
    h.confirmMock.mockResolvedValueOnce(false);
    renderModul();
    await act(async () => { await bulkAction('Löschen')(new Set([1])); });

    expect(svc.deleteMitglied).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe('MitgliederModul — handleBulkDeactivate (H1)', () => {
  it('meldet Fehler und bricht ab, wenn archiviereMitglied einen Fehler liefert', async () => {
    svc.archiviereMitglied.mockResolvedValue({ message: 'RLS' });
    renderModul();
    await act(async () => { await bulkAction('Archivieren')(new Set([1, 2])); });

    expect(svc.archiviereMitglied).toHaveBeenCalledWith(sb, [1, 2], 'Test Admin');
    expect(h.confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivierung fehlgeschlagen' }));
    // Abbruch: kein Reload nach dem Fehler
    expect(onReload).not.toHaveBeenCalled();
  });

  it('archiviert erfolgreich, meldet keinen Fehler und lädt neu', async () => {
    renderModul();
    await act(async () => { await bulkAction('Archivieren')(new Set([1, 2])); });

    expect(svc.archiviereMitglied).toHaveBeenCalledWith(sb, [1, 2], 'Test Admin');
    expect(onReload).toHaveBeenCalled();
    expect(h.confirmMock).toHaveBeenCalledTimes(1); // nur der initiale Dialog
  });
});
