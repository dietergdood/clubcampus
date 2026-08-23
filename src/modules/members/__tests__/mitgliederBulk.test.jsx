// @vitest-environment jsdom
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
  /* Seit dem Supporter-Rueckbau rendert MitgliederModul drei Modale
     (Supporter, Mitglied werden, Austritt). Sie sind hier ohne Belang, muessen
     aber im Mock stehen: Vitest wirft schon bei der blossen Referenz — und
     zwar fuer die ganze Datei. */
  ModalOrSheet: ({ children, open }) => (open ? children : null),
  /* ⚠ Seit dem 22.08.2026 kommt `ArtAendernModal` dazu (Sammelaktion „Art
     ändern" in Eltern- und Supporterliste). Es nutzt `ModalTitle` — und der
     Mock zählt seine Exporte einzeln auf, also wirft Vitest schon bei der
     blossen Referenz, für die ganze Datei. */
  ModalTitle: ({ children }) => children,
  Btn: ({ children }) => children,
  Input: () => null,
  Select: () => null,
  InfoBox: () => null,
  Col: ({ children }) => children,
  Label: ({ children }) => children,
  PhoneInput: () => null,
  Card: ({ children }) => children,
  Chip: () => null,
  Row: ({ children }) => children,
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
/* Ebenso seit dem Supporter-Rueckbau (20.08.2026): die Supporter-Liste kommt
   aus `personen` und wird beim Mounten geladen. */
vi.mock('../../../domains/members/supporterService.ts', () => ({
  fetchSupporter: vi.fn(async () => []),
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
/* ⚠ Die Beschriftung hiess bis zum 21.08.2026 „Löschen (DSGVO)" und
   verspricht seither das, was sie tut: „Mitgliedschaft löschen". Der Text ist
   Teil dessen, was dieser Test absichert — wer ihn wieder auf „Löschen"
   verkürzt, soll hier rot werden, nicht erst bei einem Löschbegehren. */
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
    const del = bulkAction('Mitgliedschaft löschen');
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
    await act(async () => { await bulkAction('Mitgliedschaft löschen')(new Set([1, 2, 3])); });

    expect(onReload).toHaveBeenCalled();
    expect(h.confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nicht alle gelöscht',
      message: expect.stringContaining('1 von 3'),
    }));
  });

  it('zählt eine rejected Promise als fehlgeschlagen (allSettled)', async () => {
    svc.deleteMitglied.mockImplementation((_sb, id) => id === 2 ? Promise.reject(new Error('boom')) : Promise.resolve(null));
    renderModul();
    await act(async () => { await bulkAction('Mitgliedschaft löschen')(new Set([1, 2, 3])); });

    expect(h.confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('1 von 3'),
    }));
  });

  it('tut nichts, wenn der Bestätigungsdialog abgebrochen wird', async () => {
    h.confirmMock.mockResolvedValueOnce(false);
    renderModul();
    await act(async () => { await bulkAction('Mitgliedschaft löschen')(new Set([1])); });

    expect(svc.deleteMitglied).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe('⚠ Die Sammelaktion heisst „Austritt…" und SCHREIBT NICHTS', () => {
  /* Bis zum 23.08.2026 hiess sie „Archivieren" und nahm n Zeilen ohne zu
     fragen, was danach gilt: heutiges Datum, Zugang weg, fertig.

     ⚠ DIESE FAELLE WURDEN NICHT ANGEPASST, BIS SIE GRUEN WAREN — die REGEL
     hat sich geaendert. Sie hielten fest, dass `archiviereMitglied` mit
     genau diesen Argumenten laeuft; heute laeuft es dort gar nicht mehr,
     weil die Aktion nur noch den Austrittsdialog OEFFNET. Der Unterschied
     gehoert benannt, sonst liest ihn der Naechste als Reparatur.

     Was bleibt, ist die schaerfere Zusage: die Sammelaktion darf fuer sich
     genommen NICHTS schreiben. Wer zwanzig Zeilen auswaehlt und klickt, hat
     noch nichts getan — er bekommt eine Frage. */
  it('schreibt beim Klick nichts — sie öffnet nur den Dialog', async () => {
    renderModul();
    await act(async () => { await bulkAction('Austritt')(new Set([1, 2])); });

    expect(svc.archiviereMitglied).not.toHaveBeenCalled();
    expect(svc.deleteMitglied).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    /* ⚠ Und keine Rueckfrage: die Frage stellt der Dialog, nicht ein
       confirm() davor. Zwei Rueckfragen hintereinander erzieht dazu, die
       erste wegzuklicken. */
    expect(h.confirmMock).not.toHaveBeenCalled();
  });

  it('⚠ es gibt keine Sammelaktion „Archivieren" mehr', () => {
    /* Der Knopf tat seit dem 22.08.2026 dasselbe wie der Austritt, nur ohne
       waehlbares Datum und ohne die Frage, was danach gilt. Zwei Knoepfe fuer
       einen Vorgang, von denen einer weniger fragt, sind keine Wahl. */
    renderModul();
    const labels = (h.listViewProps.bulkActions || []).map(a => a.label);
    expect(labels.some(l => /Archivieren/.test(l))).toBe(false);
    expect(labels.some(l => /Austritt/.test(l))).toBe(true);
  });
});

