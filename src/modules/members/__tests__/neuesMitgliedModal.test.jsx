/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/neuesMitgliedModal.test.jsx
   Unit-Tests für NeuesMitgliedModal
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NeuesMitgliedModal } from '../NeuesMitgliedModal.tsx';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../../theme.ts', () => ({
  Btn: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  ModalOrSheet: ({ open, children }) => open ? <div>{children}</div> : null,
  /* Spiegelt die Signatur von shared/forms/PhoneInput.tsx:
     onChange bekommt den Wert direkt, nicht das Event. */
  PhoneInput: ({ value = "", onChange, placeholder = "79 123 45 67" }) => (
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}/>
  ),
  useAddrSearch: () => [],
  usePlzLookup: () => {},
}));

vi.mock('../../../icons.tsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/members/memberService.ts', () => ({
  insertMitglied: vi.fn().mockResolvedValue('new-id-123'),
  logAktivitaet: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: { ANGELEGT: "angelegt" },
  /* Die Attrappe listet die Exporte einzeln — fehlt einer, wirft Vitest
     schon bei der blossen Referenz. FELD_LABEL wird seit der
     Sammel-Fehlermeldung in validate() gebraucht. */
  FELD_LABEL: {
    vorname: "Vorname", nachname: "Nachname", email: "E-Mail", telefon: "Telefon",
    geburtsdatum: "Geburtsdatum", geschlecht: "Geschlecht", strasse: "Strasse",
    plz: "PLZ", ort: "Ort", ahv_nr: "AHV-Nr.", nationalitaet: "Nationalität 1",
    heimatort: "Heimatort",
  },
}));
import { insertMitglied } from '../../../domains/members/memberService.ts';

const DB_MITGLIEDTYPEN = [
  { name: 'Aktivmitglied' },
  { name: 'Juniormitglied' },
  { name: 'Passivmitglied' },
];

const DB_PORTAL_ROLLEN = [
  { name: 'trainer', label: 'Trainer/in' },
  { name: 'spieler', label: 'Spieler/in' },
];

const DB_PFLICHTFELDER = [
  { mitgliedtyp: 'Aktivmitglied', feld: 'geburtsdatum', pflicht: true },
  { mitgliedtyp: 'Aktivmitglied', feld: 'geschlecht',   pflicht: true },
  { mitgliedtyp: 'Aktivmitglied', feld: 'strasse',      pflicht: true },
  { mitgliedtyp: 'Aktivmitglied', feld: 'plz',          pflicht: true },
  { mitgliedtyp: 'Aktivmitglied', feld: 'ort',          pflicht: true },
  { mitgliedtyp: 'Aktivmitglied', feld: 'telefon',      pflicht: true },
  { mitgliedtyp: 'Passivmitglied', feld: 'geburtsdatum', pflicht: true },
  { mitgliedtyp: 'Passivmitglied', feld: 'telefon',      pflicht: true },
];

function renderModal(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    sb: {},
    dbMitgliedtypen: DB_MITGLIEDTYPEN,
    dbPortalRollen: DB_PORTAL_ROLLEN,
    dbPflichtfelder: DB_PFLICHTFELDER,
    vereinId: 'verein-123',
    onSuccess: vi.fn(),
  };
  return render(<NeuesMitgliedModal {...defaultProps} {...props}/>);
}

describe('NeuesMitgliedModal', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('zeigt Modal wenn open=true', () => {
      renderModal();
      expect(screen.getByText('Neues Mitglied')).toBeTruthy();
    });

    it('zeigt nichts wenn open=false', () => {
      renderModal({ open: false });
      expect(screen.queryByText('Neues Mitglied')).toBeNull();
    });

    it('zeigt Mitgliedtyp Dropdown', () => {
      renderModal();
      expect(screen.getByText('— zuerst wählen —')).toBeTruthy();
    });

    it('zeigt Mitgliedtypen aus DB', () => {
      renderModal();
      expect(screen.getByText('Aktivmitglied')).toBeTruthy();
      expect(screen.getByText('Passivmitglied')).toBeTruthy();
    });
  });

  describe('Mitgliedtyp Auswahl', () => {
    it('zeigt Felder erst nach Mitgliedtyp-Auswahl', () => {
      renderModal();
      expect(screen.queryByLabelText(/Vorname/)).toBeNull();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Aktivmitglied' } });
      expect(screen.getByPlaceholderText('Adrian')).toBeTruthy();
    });

    it('zeigt E-Mail bei Aktivmitglied', () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Aktivmitglied' } });
      expect(screen.getByPlaceholderText('adrian@example.ch')).toBeTruthy();
    });

    /* Früher blendete das Modal die E-Mail bei Passiv-, Ehren- und
       Freimitgliedern aus, während die Pflichtfeld-Matrix sie verlangte.
       Die Prüfung schlug an, das Feld zum Ausfüllen fehlte — diese drei
       Mitgliedtypen liessen sich dadurch gar nicht anlegen. Die E-Mail ist
       jetzt immer sichtbar; ob sie Pflicht ist, entscheidet allein die
       Matrix. */
    it('zeigt E-Mail auch bei Passivmitglied', () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Passivmitglied' } });
      expect(screen.getByPlaceholderText('adrian@example.ch')).toBeTruthy();
    });

    it('zeigt keine Adressfelder, wenn die Matrix für den Typ nichts vorgibt', () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Passivmitglied' } });
      /* Ohne Eintrag in dbPflichtfelder ist nichts Pflicht — früher griff
         hier eine fest verdrahtete Rückfallliste. */
      expect(screen.queryByLabelText(/Strasse/)).toBeNull();
    });
  });

  describe('Validierung', () => {
    it('Button ist disabled wenn kein Mitgliedtyp', () => {
      renderModal();
      const btn = screen.getByText('Mitglied anlegen');
      expect(btn.disabled).toBe(true);
    });

    /* Früher meldete validate() nur das ERSTE fehlende Feld. Bei neun
       Pflichtfeldern hiess das: ausfüllen, klicken, nächste Meldung. Jetzt
       kommen alle auf einmal. */
    it('nennt alle fehlenden Pflichtfelder auf einmal', async () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Aktivmitglied' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => {
        const meldung = screen.getByText(/Es fehlt noch:/);
        expect(meldung.textContent).toContain('Vorname');
        expect(meldung.textContent).toContain('Nachname');
        expect(meldung.textContent).toContain('Geburtsdatum');
        expect(meldung.textContent).toContain('Telefon');
      });
    });

    it('bleibt beim kurzen Satz, wenn nur ein Feld fehlt', async () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Passivmitglied' } });
      fireEvent.change(screen.getByPlaceholderText('Adrian'), { target: { value: 'Adrian' } });
      fireEvent.change(screen.getByPlaceholderText('Bürgi'), { target: { value: 'Bürgi' } });
      /* Die Labels im Formular sind nicht per htmlFor mit den Feldern
         verknüpft — deshalb über den Feldtyp statt über das Label. */
      fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2000-01-01' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => expect(screen.getByText('Telefon ist Pflicht.')).toBeTruthy());
    });
  });

  describe('Speichern', () => {
    it('ruft insertMitglied mit korrekten Daten auf', async () => {
      renderModal();
      // Mitgliedtyp wählen
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Passivmitglied' } });
      // Mindestfelder ausfüllen
      fireEvent.change(screen.getByPlaceholderText('Adrian'), { target: { value: 'Adrian' } });
      fireEvent.change(screen.getByPlaceholderText('Bürgi'), { target: { value: 'Bürgi' } });
      fireEvent.change(screen.getByPlaceholderText('79 123 45 67'), { target: { value: '079 123 45 67' } });
      // Geburtsdatum
      const inputs = document.querySelectorAll('input[type="date"]');
      if (inputs.length > 0) fireEvent.change(inputs[0], { target: { value: '1990-01-01' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => expect(insertMitglied).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ vorname: 'Adrian', nachname: 'Bürgi', mitgliedtyp: 'Passivmitglied' }),
        'verein-123'
      ));
    });

    it('ruft onSuccess nach Erfolg auf', async () => {
      const onSuccess = vi.fn();
      renderModal({ onSuccess });
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Passivmitglied' } });
      fireEvent.change(screen.getByPlaceholderText('Adrian'), { target: { value: 'Adrian' } });
      fireEvent.change(screen.getByPlaceholderText('Bürgi'), { target: { value: 'Bürgi' } });
      fireEvent.change(screen.getByPlaceholderText('79 123 45 67'), { target: { value: '079 123 45 67' } });
      const inputs = document.querySelectorAll('input[type="date"]');
      if (inputs.length > 0) fireEvent.change(inputs[0], { target: { value: '1990-01-01' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => expect(insertMitglied).toHaveBeenCalled());
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-id-123'));
    });
  });

  describe('Abbrechen', () => {
    it('ruft onClose auf bei Abbrechen', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByText('Abbrechen'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
