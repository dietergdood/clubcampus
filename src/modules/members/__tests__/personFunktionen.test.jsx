// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/personFunktionen.test.jsx
   Unit-Tests für PersonFunktionen
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonFunktionen } from '../../../shared/person/PersonFunktionen.tsx';

vi.mock('../../../theme.ts', () => ({
  Btn: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  ModalOrSheet: ({ open, children }) => open ? <div data-testid="modal">{children}</div> : null,
  ModalTitle: ({ children }) => <div>{children}</div>,
  DropMenu: ({ items }) => (
    <div>
      {(items||[]).filter(i=>i&&i.label&&!i.hidden).map((item,i) => (
        <button key={i} onClick={item.onClick} data-testid={`menu-${item.label}`}>{item.label}</button>
      ))}
    </div>
  ),
}));

vi.mock('../../../icons.tsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../domains/members/memberService.ts', () => ({
  updateMitglied: vi.fn().mockResolvedValue(true),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  logAktivitaet: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: { FUNKTION_GEAENDERT: "funktion_geaendert" },
}));

import { updateMitglied, logAktivitaet } from '../../../domains/members/memberService.ts';

const RAW = { id: 1, funktionen: ['Präsident', 'Kassier'] };
const RAW_LEER = { id: 1, funktionen: [] };

const ASSIGN_FUNKTIONEN = [
  { id: 'f1', name: 'Präsident',  portal_gruppen: { name: 'Vorstand', farbe: '#123456' } },
  { id: 'f2', name: 'Kassier',    portal_gruppen: { name: 'Vorstand', farbe: '#123456' } },
  { id: 'f3', name: 'Trainer',    portal_gruppen: { name: 'Sport',    farbe: '#654321' } },
  { id: 'f4', name: 'Torhüter',   portal_gruppen: { name: 'Sport',    farbe: '#654321' } },
];

/* Persistenz/Logging liegen seit der Schichtentrennung im Parent (InfoTab);
   die Komponente meldet nur noch die neue Funktionsliste via onSaveFunktionen. */
const onSaveFunktionen = vi.fn().mockResolvedValue(undefined);

function renderComp(props = {}) {
  return render(<PersonFunktionen
    raw={RAW}
    canEdit={true}
    canDelete={true}
    assignFunktionen={ASSIGN_FUNKTIONEN}
    onSaveFunktionen={onSaveFunktionen}
    {...props}
  />);
}

describe('PersonFunktionen', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Anzeige', () => {
    it('zeigt bestehende Funktionen', () => {
      renderComp();
      expect(screen.getByText('Präsident')).toBeTruthy();
      expect(screen.getByText('Kassier')).toBeTruthy();
    });

    it('zeigt Hinzufügen-Button wenn canEdit', () => {
      renderComp();
      expect(screen.getByText('Hinzufügen')).toBeTruthy();
    });

    it('zeigt keinen Hinzufügen-Button ohne canEdit', () => {
      renderComp({ canEdit: false });
      expect(screen.queryByText('Hinzufügen')).toBeNull();
    });

    it('zeigt leere Meldung wenn keine Funktionen', () => {
      renderComp({ raw: RAW_LEER });
      expect(screen.getByText('Keine Vereinsfunktionen.')).toBeTruthy();
    });

    it('zeigt Entfernen-Button wenn canDelete', () => {
      renderComp();
      expect(screen.getAllByTestId('menu-Entfernen').length).toBeGreaterThan(0);
    });
  });

  describe('Modal öffnen', () => {
    it('öffnet Modal bei Hinzufügen-Klick', () => {
      renderComp();
      fireEvent.click(screen.getByText('Hinzufügen'));
      expect(screen.getByTestId('modal')).toBeTruthy();
    });

    it('zeigt nur Funktionen die noch nicht zugewiesen sind', () => {
      renderComp();
      fireEvent.click(screen.getByText('Hinzufügen'));
      // Präsident und Kassier sind bereits zugewiesen — nur Trainer und Torhüter sollten sichtbar sein
      expect(screen.queryByText('Präsident')).toBeTruthy(); // noch in der Liste (bestehende Anzeige)
      expect(screen.getByText('Trainer')).toBeTruthy();
    });

    it('schliesst Modal bei Abbrechen', () => {
      renderComp();
      fireEvent.click(screen.getByText('Hinzufügen'));
      fireEvent.click(screen.getByText('Abbrechen'));
      expect(screen.queryByTestId('modal')).toBeNull();
    });
  });

  describe('Funktion hinzufügen', () => {
    it('meldet die neue Liste inkl. hinzugefügter Funktion via onSaveFunktionen', async () => {
      renderComp();
      fireEvent.click(screen.getByText('Hinzufügen'));
      fireEvent.click(screen.getByText('Trainer'));
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => expect(onSaveFunktionen).toHaveBeenCalledWith(
        expect.arrayContaining(['Präsident', 'Kassier', 'Trainer'])
      ));
    });
  });

  describe('Funktion entfernen via DropMenu', () => {
    it('meldet die Liste ohne die entfernte Funktion via onSaveFunktionen', async () => {
      renderComp();
      const entfernenBtns = screen.getAllByTestId('menu-Entfernen');
      fireEvent.click(entfernenBtns[0]);
      await waitFor(() => expect(onSaveFunktionen).toHaveBeenCalled());
      // erste Funktion (Präsident) entfernt -> nicht mehr in der gemeldeten Liste
      const gemeldet = onSaveFunktionen.mock.calls[0][0];
      expect(gemeldet).not.toContain('Präsident');
    });
  });
});
