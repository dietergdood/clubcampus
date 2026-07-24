/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/elternTab.test.jsx
   Unit-Tests für ElternTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ElternTab } from '../tabs/ElternTab.jsx';

vi.mock('../../../theme.ts', () => ({
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
  /* Spiegelt die Signatur von shared/forms/PhoneInput.tsx:
     onChange bekommt den Wert direkt, nicht das Event. */
  PhoneInput: ({ value = "", onChange, placeholder = "79 123 45 67" }) => (
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}/>
  ),
}));

vi.mock('../../../icons.tsx', () => ({
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
  /* n:m-Modell (siehe ELTERN_LOGIK.md): Entknüpfen läuft über eltern_kinder.
     Default: noch ein weiteres Kind vorhanden → kein Löschen des Kontakts. */
  unlinkKind: vi.fn().mockResolvedValue({ verbleibendeKinder: 1, kindNochAktiv: true }),
  fetchKinderFuerElternteil: vi.fn().mockResolvedValue([]),
  updateBenutzerRolle: vi.fn().mockResolvedValue(null),
  clearHauptkontaktFuerKind: vi.fn().mockResolvedValue(null),
  /* Von ElternSucheModal genutzt */
  sucheElternkontakte: vi.fn().mockResolvedValue([]),
  linkKind: vi.fn().mockResolvedValue(null),
  AKTIVITAET_TYP: {
    ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt",
    ELTERN_ENTFERNT: "eltern_entfernt",
    ELTERN_GEAENDERT: "eltern_geaendert",
  },
}));

import { insertElternkontakt, updateElternkontakt, deleteElternkontakt, unlinkKind, logAktivitaet } from '../../../domains/members/memberService.js';

/* "Hinzufügen" öffnet seit dem n:m-Umbau zuerst die Suche.
   Der Weg zum Neu-Formular: Hinzufügen → Tab "Neu erfassen" → Weiter. */
function oeffneNeuFormular() {
  fireEvent.click(screen.getByText('Hinzufügen'));
  fireEvent.click(screen.getByText('Neu erfassen'));
  fireEvent.click(screen.getByText('Weiter'));
}

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
    it('öffnet die Suche bei Hinzufügen-Klick', () => {
      renderTab();
      fireEvent.click(screen.getByText('Hinzufügen'));
      expect(screen.getByText('Elternkontakt hinzufügen')).toBeTruthy();
      expect(screen.getByPlaceholderText('Name oder E-Mail suchen…')).toBeTruthy();
    });

    it('öffnet das Formular über den Tab "Neu erfassen"', () => {
      renderTab();
      oeffneNeuFormular();
      expect(screen.getByPlaceholderText('Vorname')).toBeTruthy();
    });

    it('ruft insertElternkontakt auf beim Speichern', async () => {
      renderTab();
      oeffneNeuFormular();
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.change(screen.getByPlaceholderText('E-Mail'), { target: { value: 'lisa@test.ch' } });
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(insertElternkontakt).toHaveBeenCalled());
    });

    it('verlangt eine E-Mail', async () => {
      renderTab();
      oeffneNeuFormular();
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(screen.getByText('E-Mail ist Pflichtfeld')).toBeTruthy());
      expect(insertElternkontakt).not.toHaveBeenCalled();
    });

    it('loggt Aktivität beim Hinzufügen', async () => {
      renderTab();
      oeffneNeuFormular();
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.change(screen.getByPlaceholderText('E-Mail'), { target: { value: 'lisa@test.ch' } });
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), 1, 'verein-123', 'eltern_hinzugefuegt',
        expect.stringContaining('Lisa Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });

  describe('Entknüpfen', () => {
    it('ruft unlinkKind auf', async () => {
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(unlinkKind).toHaveBeenCalledWith({}, 'e1', 1));
    });

    it('behält den Kontakt wenn noch weitere Kinder verknüpft sind', async () => {
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(unlinkKind).toHaveBeenCalled());
      expect(deleteElternkontakt).not.toHaveBeenCalled();
    });

    it('macht den Elternteil zum Supporter wenn das Kind im Verein bleibt', async () => {
      unlinkKind.mockResolvedValueOnce({ verbleibendeKinder: 0, kindNochAktiv: true });
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(updateElternkontakt).toHaveBeenCalledWith({}, 'e1', { supporter: true }));
      expect(deleteElternkontakt).not.toHaveBeenCalled();
    });

    it('löscht den Kontakt wenn das letzte Kind den Verein verlassen hat', async () => {
      unlinkKind.mockResolvedValueOnce({ verbleibendeKinder: 0, kindNochAktiv: false });
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(deleteElternkontakt).toHaveBeenCalledWith({}, 'e1'));
    });

    it('loggt Aktivität beim Entknüpfen', async () => {
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), 1, 'verein-123', 'eltern_entfernt',
        expect.stringContaining('Maria Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });
});
