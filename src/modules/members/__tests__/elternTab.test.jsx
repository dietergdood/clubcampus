// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/elternTab.test.jsx
   Unit-Tests für ElternTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ElternTab } from '../tabs/ElternTab.tsx';

vi.mock('../../../theme.ts', () => ({
  InfoBox: ({text})=><div>{text}</div>,
  Col: ({children})=><div>{children}</div>,
  Label: ({children})=><span>{children}</span>,
  Input: (p)=><input {...p}/>,
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

vi.mock('../../../domains/members/memberService.ts', () => ({
  insertElternkontakt: vi.fn().mockResolvedValue(null),
  updateElternkontakt: vi.fn().mockResolvedValue(null),
  entferneElternVerknuepfung: vi.fn().mockResolvedValue(null),
  setHauptkontakt: vi.fn().mockResolvedValue(null),
  unlinkElternBenutzer: vi.fn().mockResolvedValue(null),
  fetchElternkontakte: vi.fn().mockResolvedValue([]),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  logAktivitaet: vi.fn().mockResolvedValue(undefined),
  /* n:m-Modell: Entknüpfen läuft über eltern_kinder.person_id (Etappe 3).
     Default: noch ein weiteres Kind vorhanden → der Kontakt bleibt. */
  unlinkKind: vi.fn().mockResolvedValue({ verbleibendeKinder: 1, kindNochAktiv: true }),
  /* Kapselt unlinkKind samt Supporter-oder-Loeschen-Entscheidung.
     Die Verzweigung selbst ist in elternService.test.ts geprueft. */
  entkoppleKind: vi.fn().mockResolvedValue("verknuepft"),
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

/* ElternkontaktModal importiert direkt aus elternService — dieser Pfad
   muss ebenfalls gemockt sein, sonst landet der Test auf echtem Supabase. */
vi.mock('../../../domains/members/elternService.ts', () => ({
  insertElternkontakt: vi.fn().mockResolvedValue(null),
  updateElternkontakt: vi.fn().mockResolvedValue(null),
  entferneElternVerknuepfung: vi.fn().mockResolvedValue(null),
  unlinkElternBenutzer: vi.fn().mockResolvedValue(null),
  logFuerAlleKinder: vi.fn().mockResolvedValue(undefined),
  entkoppleKind: vi.fn().mockResolvedValue("verknuepft"),
  setHauptkontakt: vi.fn().mockResolvedValue(null),
  clearHauptkontaktFuerKind: vi.fn().mockResolvedValue(null),
  fetchKinderFuerElternteil: vi.fn().mockResolvedValue([]),
  linkKind: vi.fn().mockResolvedValue(null),

}));

import { logAktivitaet, entkoppleKind, insertElternkontakt } from '../../../domains/members/memberService.ts';

/* "Hinzufügen" öffnet die Suche; das Neu-Formular steht direkt im Tab
   "Neu erfassen" — kein zweites Modal mehr dazwischen. */
function oeffneNeuFormular() {
  fireEvent.click(screen.getByText('Hinzufügen'));
  fireEvent.click(screen.getByText('Neu erfassen'));
}

const ELTERN = [
  { id: 'e1', vorname: 'Maria', nachname: 'Bürgi', email: 'maria@test.ch', telefon: '079 123 45 67', beziehung: 'Mutter', hauptkontakt: true },
  { id: 'e2', vorname: 'Hans', nachname: 'Bürgi', email: 'hans@test.ch', telefon: '079 987 65 43', beziehung: 'Vater', hauptkontakt: false },
];

function renderTab(props = {}) {
  return render(<ElternTab
mitgliedId={1}     eltern={ELTERN}
    canEdit={true}
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
      fireEvent.click(screen.getByText('Anlegen und verknüpfen'));
      await waitFor(() => expect(insertElternkontakt).toHaveBeenCalled());
    });

    it('verlangt eine E-Mail', async () => {
      renderTab();
      oeffneNeuFormular();
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.click(screen.getByText('Anlegen und verknüpfen'));
      await waitFor(() => expect(screen.getByText('E-Mail ist Pflichtfeld')).toBeTruthy());
      expect(insertElternkontakt).not.toHaveBeenCalled();
    });

    it('loggt Aktivität beim Hinzufügen', async () => {
      renderTab();
      oeffneNeuFormular();
      fireEvent.change(screen.getByPlaceholderText('Vorname'), { target: { value: 'Lisa' } });
      fireEvent.change(screen.getByPlaceholderText('Nachname'), { target: { value: 'Bürgi' } });
      fireEvent.change(screen.getByPlaceholderText('E-Mail'), { target: { value: 'lisa@test.ch' } });
      fireEvent.click(screen.getByText('Anlegen und verknüpfen'));
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), expect.objectContaining({ mitgliedId: 1 }), 'verein-123', 'eltern_hinzugefuegt',
        expect.stringContaining('Lisa Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     Vom Kind zum Elternteil (21.08.2026)

     „Bearbeiten" oeffnete ein ElternkontaktModal mit denselben
     Feldern, die die Personenseite ohnehin zeigt — zwei Masken
     fuer dieselbe Zeile in `personen`. Der Eintrag heisst jetzt
     „Profil oeffnen" und fuehrt dorthin.
     ═══════════════════════════════════════════════════════════════ */
  describe('Profil öffnen', () => {
    it('reicht personId und Namen an den Aufrufer durch', () => {
      const onOeffnePerson = vi.fn();
      renderTab({ onOeffnePerson });
      fireEvent.click(screen.getAllByTestId('menu-Profil öffnen')[0]);
      expect(onOeffnePerson).toHaveBeenCalledWith('e1', 'Maria Bürgi');
    });

    it('⚠ „Bearbeiten" gibt es nicht mehr', () => {
      /* Die zweite Haelfte: sie haelt fest, dass die zweite Maske nicht
         zurueckkommt. Ohne sie waere der Test oben auch dann gruen, wenn
         beide Eintraege nebeneinander stuenden. */
      renderTab({ onOeffnePerson: vi.fn() });
      expect(screen.queryByTestId('menu-Bearbeiten')).toBeNull();
    });

    it('ohne Aufrufer erscheint der Eintrag gar nicht — kein toter Knopf', () => {
      renderTab();
      expect(screen.queryByTestId('menu-Profil öffnen')).toBeNull();
      /* Die Gegenprobe, dass das Menue ueberhaupt steht. */
      expect(screen.getAllByTestId('menu-Entknüpfen').length).toBeGreaterThan(0);
    });
  });

  describe('Entknüpfen', () => {
    /* Die Entscheidung, ob der Kontakt beim letzten Kind zum Supporter wird
       oder geloescht, liegt in entkoppleKind und ist in elternService.test.ts
       geprueft. Hier zaehlt nur, dass der Tab korrekt delegiert. */
    it('ruft entkoppleKind mit Elternkontakt und Kind auf', async () => {
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(entkoppleKind).toHaveBeenCalledWith({}, 'e1', 1, undefined));
    });

    it('loggt Aktivität beim Entknüpfen', async () => {
      renderTab();
      fireEvent.click(screen.getAllByTestId('menu-Entknüpfen')[0]);
      await waitFor(() => expect(logAktivitaet).toHaveBeenCalledWith(
        expect.anything(), expect.objectContaining({ mitgliedId: 1 }), 'verein-123', 'eltern_entfernt',
        expect.stringContaining('Maria Bürgi'),
        expect.anything(), expect.anything(), expect.anything()
      ));
    });
  });
});
