// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/portalTab.test.jsx
   Unit-Tests für PortalTab
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalTab } from '../tabs/PortalTab.tsx';

vi.mock('../../../theme.ts', () => ({
  Card: ({ children }) => <div>{children}</div>,
  Chip: ({ text }) => <span data-testid="chip">{text}</span>,
}));

vi.mock('../../../icons.tsx', () => ({
  TI: ({ n }) => <span data-icon={n}/>,
}));

vi.mock('../../../constants.js', () => ({
  GN: '#3B6D11', R: '#A32D2D', RL: '#FCEBEB',
}));

vi.mock('../../../domains/members/memberService.ts', () => ({
  updateMitgliedRolle: vi.fn().mockResolvedValue(undefined),
  logAenderung: vi.fn().mockResolvedValue(undefined),
  AKTIVITAET_TYP: {},
}));

import { updateMitgliedRolle, logAenderung } from '../../../domains/members/memberService.ts';
/* PortalTab schreibt seit dem 21.08.2026 ueber updateBenutzerRolle, wenn keine
   Mitgliedschaft besteht — der Mock muss ihn kennen, sonst wirft Vitest schon
   bei der blossen Referenz, und zwar fuer die ganze Datei. */
vi.mock('../../../domains/members/elternService.ts', () => ({
  updateBenutzerRolle: vi.fn().mockResolvedValue(undefined),
}));
import { updateBenutzerRolle } from '../../../domains/members/elternService.ts';

const DB_PORTAL_ROLLEN = [
  { name: 'trainer',  label: 'Trainer/in' },
  { name: 'spieler',  label: 'Spieler/in' },
  { name: 'mitglied', label: 'Mitglied' },
];

/* Seit Etappe 6c entscheidet allein das KONTO, ob ein Zugang aktiv ist —
   nicht mehr ein Kennzeichen am Mitglied. Der Unterschied zwischen „Aktiv"
   und „Deaktiviert" steckt deshalb in `benutzer.aktiv`, nicht in `raw`. */
const RAW_AKTIV = { id: 1, rolle: 'spieler' };
const RAW_KEIN  = { id: 1, rolle: null };
const RAW_DEAK  = { id: 1, rolle: 'spieler' };

const BENUTZER = {
  id: 'b1', email: 'adrian@test.ch', role: 'spieler',
  created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-07-23T10:00:00Z',
};

function renderTab(props = {}) {
  return render(<PortalTab
    mitgliedId={1}
    konfig={{}}
    raw={RAW_AKTIV}
    benutzer={BENUTZER}
    sb={{}}
    dbPortalRollen={DB_PORTAL_ROLLEN}
    portalMsg={null}
    portalLoading={false}
    handleUnlink={vi.fn()}
    handleReactivate={vi.fn()}
    onReload={vi.fn()}
    setBenutzer={vi.fn()}
    vereinId="verein-123"
    account={{ name: 'Dieter Good' }}
    {...props}
  />);
}

describe('PortalTab', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Status-Anzeige', () => {
    it('zeigt Aktiv-Chip wenn Portal aktiv', () => {
      renderTab();
      expect(screen.getByText('Aktiv')).toBeTruthy();
    });

    it('zeigt Kein Zugang wenn kein Benutzer', () => {
      renderTab({ raw: RAW_KEIN, benutzer: null });
      expect(screen.getByText('Kein Zugang')).toBeTruthy();
    });

    it('zeigt Deaktiviert wenn benutzer vorhanden aber kein Zugang', () => {
      renderTab({ raw: RAW_DEAK, benutzer: { ...BENUTZER, aktiv: false } });
      expect(screen.getByText('Deaktiviert')).toBeTruthy();
    });

    it('zeigt E-Mail des Benutzers', () => {
      renderTab();
      expect(screen.getByText('adrian@test.ch')).toBeTruthy();
    });

    it('zeigt aktuelles Rollen-Label', () => {
      renderTab();
      expect(screen.getByText('Spieler/in')).toBeTruthy();
    });
  });

  describe('Rolle editieren', () => {
    it('öffnet Dropdown bei Klick auf Rolle', () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      expect(screen.getByRole('combobox')).toBeTruthy();
    });

    // jsdom triggert onKeyDown auf Select nicht zuverlässig — manuell in Browser testen
    it('ruft updateMitgliedRolle auf beim Speichern via Enter', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'trainer' } });
      fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13 });
      await waitFor(() => expect(updateMitgliedRolle).toHaveBeenCalled(), { timeout: 2000 });
    });

    it('loggt Änderung beim Speichern', async () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'trainer' } });
      fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13 });
      await waitFor(() => expect(logAenderung).toHaveBeenCalled(), { timeout: 2000 });
    });

    it('schliesst Dropdown bei Esc', () => {
      renderTab();
      fireEvent.click(screen.getByText('Spieler/in'));
      expect(screen.getByRole('combobox')).toBeTruthy();
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
      expect(screen.queryByRole('combobox')).toBeNull();
    });
  });

  describe('Deaktivieren / Reaktivieren', () => {
    it('zeigt Deaktivieren-Button wenn aktiv', () => {
      renderTab();
      expect(screen.getByText('Zugang deaktivieren')).toBeTruthy();
    });

    it('ruft handleUnlink auf bei Klick auf Deaktivieren', () => {
      const handleUnlink = vi.fn();
      renderTab({ handleUnlink });
      fireEvent.click(screen.getByText('Zugang deaktivieren'));
      expect(handleUnlink).toHaveBeenCalled();
    });

    it('zeigt Reaktivieren-Button wenn deaktiviert', () => {
      renderTab({ raw: RAW_DEAK, benutzer: { ...BENUTZER, aktiv: false } });
      expect(screen.getByText('Zugang reaktivieren')).toBeTruthy();
    });

    it('ruft handleReactivate auf bei Klick', () => {
      const handleReactivate = vi.fn();
      renderTab({ raw: RAW_DEAK, benutzer: { ...BENUTZER, aktiv: false }, handleReactivate });
      fireEvent.click(screen.getByText('Zugang reaktivieren'));
      expect(handleReactivate).toHaveBeenCalled();
    });
  });

  describe('Kein Zugang', () => {
    it('zeigt Hinweis wenn E-Mail vorhanden', () => {
      renderTab({ raw: { ...RAW_KEIN, email: 'adrian@test.ch' }, benutzer: null });
      expect(screen.getByText(/adrian@test.ch/)).toBeTruthy();
    });

    it('zeigt Hinweis wenn keine E-Mail', () => {
      renderTab({ raw: RAW_KEIN, benutzer: null });
      expect(screen.getByText(/Keine E-Mail/)).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   Der Tab OHNE Mitgliedschaft (21.08.2026)

   `tab_portal` traegt kein `nur_mitgliedschaft`: ein Supporter und
   ein Elternteil haben einen Zugang, nur keine Mitgliedschaft. Der
   Tab ist damit der einzige neben Profil und Datenpruefung, der in
   beiden Faellen erscheint — und der einzige, in dem der Unterschied
   im Code stehen muss.
   ═══════════════════════════════════════════════════════════════ */
describe('PortalTab — ohne Mitgliedschaft', () => {
  const OHNE = { rolle: null, email: 'petra@test.ch' };

  /* Ohne das schleppt „nicht aufgerufen" den Aufruf des vorigen Falls mit —
     und die Gegenprobe waere wertlos. */
  beforeEach(() => { vi.clearAllMocks(); });

  /* Die Rolle wird ueber ein Inline-Feld bearbeitet: erst der Stift, dann das
     Auswahlfeld. `saveRolle` laeuft beim Verlassen (onBlur). */
  async function rolleSetzen(container, wert) {
    /* Gezielt ueber die Klasse: `getByText` traefe auch den Status-Chip, der
       dieselbe Beschriftung tragen kann. */
    const feld = container.querySelector('.cc-inline-field');
    fireEvent.click(feld);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: wert } });
    /* ⚠ NEU SUCHEN statt die alte Referenz weiterzubenutzen. `RolleField` ist
       INNERHALB von `PortalTab` definiert; jeder Re-Render erzeugt damit einen
       neuen Komponententyp, und React haengt den Teilbaum ab und neu an. Das
       alte `<select>` bleibt als losgeloester Knoten stehen und behaelt seinen
       alten Wert — ein `blur` darauf erreicht niemanden.
       (Deshalb steht der aeltere Test dieser Datei auf `it.skip`.) */
    const frisch = await screen.findByRole('combobox');
    await waitFor(() => expect(frisch.value).toBe(wert));
    fireEvent.blur(frisch);
  }

  it('⚠ schreibt die Rolle NUR ans Konto', async () => {
    /* updateMitgliedRolle() schriebe `mitglieder.rolle` UND `benutzer.role`.
       Ohne Mitgliedschaft gibt es nur das zweite — der Aufruf haette kein
       Ziel und waere still gescheitert. */
    const { container } = renderTab({ mitgliedId: null, raw: OHNE });
    await rolleSetzen(container, 'mitglied');
    await waitFor(() => expect(updateBenutzerRolle).toHaveBeenCalledWith(expect.anything(), 'b1', 'mitglied'));
    expect(updateMitgliedRolle).not.toHaveBeenCalled();
  });

  it('mit Mitgliedschaft geht es weiterhin ueber updateMitgliedRolle', async () => {
    /* Die Gegenprobe: sonst waere der Fall oben auch gruen, wenn gar nichts
       mehr geschrieben wuerde. */
    const { container } = renderTab();
    await rolleSetzen(container, 'trainer');
    await waitFor(() => expect(updateMitgliedRolle).toHaveBeenCalled());
    expect(updateBenutzerRolle).not.toHaveBeenCalled();
  });

  it('⚠ schreibt keinen Verlauf ohne Mitgliedschaft', async () => {
    /* mitglieder_aenderungen fuehrt mitglied_id NOT NULL. Der Aufruf
       ENTFAELLT, statt zu scheitern. */
    const { container } = renderTab({ mitgliedId: null, raw: OHNE });
    await rolleSetzen(container, 'mitglied');
    await waitFor(() => expect(updateBenutzerRolle).toHaveBeenCalled());
    expect(logAenderung).not.toHaveBeenCalled();
  });

  it('spricht von „dieser Person", nicht vom Mitglied', () => {
    /* Bei 393 Elternteilen und 7 Supportern waere „Das Mitglied kann sich
       registrieren" fuer die Mehrheit schlicht falsch. */
    renderTab({ mitgliedId: null, raw: OHNE, benutzer: null });
    expect(screen.getByText(/Diese Person kann sich/)).toBeTruthy();
  });

  it('⚠ verweist aufs Profil, nicht auf einen Kontakt-Tab', () => {
    /* Einen Kontakt-Tab gibt es nicht — die Anleitung schickte den Nutzer
       an einen Ort, den er nie findet. */
    renderTab({ mitgliedId: null, raw: { rolle: null }, benutzer: null });
    expect(screen.getByText(/im Profil erfassen/)).toBeTruthy();
    expect(screen.queryByText(/Kontakt-Tab/)).toBeNull();
  });
});
