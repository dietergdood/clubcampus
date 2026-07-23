/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/neuesMitgliedModal.test.jsx
   Unit-Tests für NeuesMitgliedModal
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NeuesMitgliedModal } from '../NeuesMitgliedModal.jsx';

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('../../../theme.jsx', () => ({
  Btn: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  ModalOrSheet: ({ open, children }) => open ? <div>{children}</div> : null,
}));

vi.mock('../../../icons.jsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/members/memberService.js', () => ({
  insertMitglied: vi.fn().mockResolvedValue('new-id-123'),
}));
import { insertMitglied } from '../../../domains/members/memberService.js';

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

    it('zeigt keine E-Mail bei Passivmitglied', () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Passivmitglied' } });
      expect(screen.queryByPlaceholderText('adrian@example.ch')).toBeNull();
    });
  });

  describe('Validierung', () => {
    it('Button ist disabled wenn kein Mitgliedtyp', () => {
      renderModal();
      const btn = screen.getByText('Mitglied anlegen');
      expect(btn.disabled).toBe(true);
    });

    it('zeigt Fehler wenn Vorname fehlt', async () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Aktivmitglied' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => expect(screen.getByText('Vorname ist Pflicht.')).toBeTruthy());
    });

    it('zeigt Fehler wenn Nachname fehlt', async () => {
      renderModal();
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'Aktivmitglied' } });
      fireEvent.change(screen.getByPlaceholderText('Adrian'), { target: { value: 'Adrian' } });
      fireEvent.click(screen.getByText('Mitglied anlegen'));
      await waitFor(() => expect(screen.getByText('Nachname ist Pflicht.')).toBeTruthy());
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
      fireEvent.change(screen.getByPlaceholderText('079 123 45 67'), { target: { value: '079 123 45 67' } });
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
      fireEvent.change(screen.getByPlaceholderText('079 123 45 67'), { target: { value: '079 123 45 67' } });
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
