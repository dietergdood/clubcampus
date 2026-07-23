/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/elternTab.test.jsx
   Unit-Tests für ElternTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ElternTab } from '../tabs/ElternTab.jsx';

vi.mock('../../../theme.jsx', () => ({
  Btn: ({ children, onClick, small }) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  ModalOrSheet: ({ open, children }) => open ? <div>{children}</div> : null,
  DropMenu: ({ items }) => (
    <div>
      {(items||[]).filter(i=>i&&i.label).map((item,i) => (
        <button key={i} onClick={item.onClick} data-testid={`menu-${item.label}`}>{item.label}</button>
      ))}
    </div>
  ),
  EmptyState: ({ title }) => <div data-testid="empty">{title}</div>,
  useConfirm: () => [vi.fn().mockResolvedValue(true), <div key="cd"/>],
}));

vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/members/memberService.js', () => ({
  insertElternkontakt: vi.fn().mockResolvedValue(null),
  updateElternkontakt: vi.fn().mockResolvedValue(null),
  deleteElternkontakt: vi.fn().mockResolvedValue(null),
  setHauptkontakt: vi.fn().mockResolvedValue(null),
  unlinkElternBenutzer: vi.fn().mockResolvedValue(null),
  fetchElternkontakte: vi.fn().mockResolvedValue([]),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  logAktivitaet: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: {
    ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt",
    ELTERN_ENTFERNT: "eltern_entfernt",
    ELTERN_GEAENDERT: "eltern_geaendert",
  },
}));

import { insertElternkontakt, updateElternkontakt, deleteElternkontakt, logAktivitaet } from '../../../domains/members/memberService.js';

const RAW = { id: 1, mitgliedtyp: 'Juniormitglied' };
const ELTERN = [
  { id: 'e1', vorname: 'Maria', nachname: 'Bürgi', email: 'maria@test.ch', telefon: '079 123 45 67', beziehung: 'Mutter', hauptkontakt: true },
  { id: 'e2', vorname: 'Hans', nachname: 'Bürgi', email: 'hans@test.ch', telefon: '079 987 65 43', beziehung: 'Vater', hauptkontakt: false },
];

function renderTab(props = {}) {
  return render(<ElternTab
    eltern={ELTERN}
    canEdit={true}
    raw={RAW}
    sb={{}}
    onReload={vi.fn()}
    setElternLoaded={vi.fn()}
    vereinId="verein-123"
    account={{ name: 'Dieter Good' }}
    {...props}
  />);
}

describe('ElternTab', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Anzeige', () => {
    it('zeigt alle Elternkontakte', () => {
      renderTab();
      expect(screen.getByText('Maria Bürgi')).toBeTruthy();
      expect(screen.getByText('Hans Bürgi')).toBeTruthy();
    });

    it('zeigt Anzahl Elternkontakte', () => {
      renderTab();
      expect(screen.getByText('2 Elternkontakte')).toBeTruthy();
    });

    it('zeigt Hinzufügen-Button wenn canEdit', () => {
      renderTab();
      expect(screen.getByText('Hinzufügen')).toBeTruthy();
    });

    it('zeigt keinen Hinzufügen-Button wenn kein canEdit', () => {
      renderTab({ canEdit: false });
      expect(screen.queryByText('Hinzufügen')).toBeNull();
    });

    it('zeigt EmptyState wenn keine Eltern', () => {
      renderTab({ eltern: [] });
      expect(screen.getByTestId('empty')).toBeTruthy();
    });

    it('zeigt Beziehung', () => {
      renderTab();
      expect(screen.getByText('Mutter')).toBeTruthy();
    });
  });

  describe('Neu anlegen', () => {
    it('öffnet Formular bei Hinzufügen-Klick', () => {
      renderTab();
      fireEvent.click(screen.getByText('Hinzufügen'));
      expect(screen.getByPlaceholderText('Vorname')).toBeTruthy();
    });

    it('ruft insertElternkontakt auf beim Speichern', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Hinzufügen'));
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(insertElternkontakt).toHaveBeenCalled());
    });

    it('loggt Aktivität beim Hinzufügen', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Hinzufügen'));
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), 1, 'verein-123', 'eltern_hinzugefuegt',
        expect.stringContaining('Lisa Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });

  describe('Löschen', () => {
    it('ruft deleteElternkontakt auf', async () => {
      renderTab();
      const loeschenBtns = screen.getAllByTestId('menu-Löschen');
      fireEvent.click(loeschenBtns[0]);
      await waitFor(() => expect(deleteElternkontakt).toHaveBeenCalled());
    });

    it('loggt Aktivität beim Löschen', async () => {
      renderTab();
      const loeschenBtns = screen.getAllByTestId('menu-Löschen');
      fireEvent.click(loeschenBtns[0]);
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), 1, 'verein-123', 'eltern_entfernt',
        expect.stringContaining('Maria Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });
});
