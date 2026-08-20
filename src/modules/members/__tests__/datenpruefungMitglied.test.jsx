/* ═══════════════════════════════════════════════════════════════
   Die Sperre beim MITGLIED — die Gegenprobe (20.08.2026)

   `pflichtfelderFuerZiel()` ist am 20.08.2026 als gemeinsame
   Quelle nach `feldkonfig.ts` gezogen; `getProfilCheck`
   delegiert seither dorthin, damit die Eltern-Maske nicht eine
   zweite Liste bekommt.

   ⚠ Ohne diese Datei wäre „die Eltern-Maske sperrt korrekt" auch
   dann grün, wenn das Delegieren etwas ANDERES liefert als
   vorher — dann sperrte die neue Maske richtig und die alte
   falsch, und niemand sähe es. Geprüft wird deshalb hier, wo die
   Sperre seit dem 20.08.2026 unverändert steht.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../theme.ts', () => ({
  Btn: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  PhoneInput: ({ value, onChange }) => <input aria-label="tel" value={value || ''} onChange={e => onChange(e.target.value)}/>,
  useAddrSearch: () => [],
  usePlzLookup: () => {},
}));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));
vi.mock('../../../domains/person/personService.ts', () => ({ updatePerson: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../domains/members/memberService.ts', () => ({
  updateMitglied: vi.fn().mockResolvedValue(true),
  FELD_LABEL: { ahv_nr: 'AHV-Nr.', geburtsdatum: 'Geburtsdatum', spielerpass: 'Spielerpass' },
}));

import { DatenpruefungMitglied } from '../tabs/DatenpruefungMitglied.tsx';

const RAW = {
  person_id: 'p-1', vorname: 'Hans', nachname: 'Beispiel',
  mitgliedtyp: 'Aktivmitglied', geburtsdatum: '1990-01-01',
  nationalitaet: 'CH', strasse: 'Seestrasse 1', plz: '8704', ort: 'Herrliberg',
  kanton: 'ZH', geschlecht: 'm', heimatort: 'Zürich',
  email: 'hans@example.ch', telefon: '079 000 00 00', ahv_nr: null,
};

function props(over = {}) {
  return { raw: RAW, sb: {}, setPortalMsg: vi.fn(), onReload: null, pflichtfelder: [], ...over };
}

const knopf = () => screen.getAllByRole('button').find(b => /bestätig/i.test(b.textContent));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('DatenpruefungMitglied — die Sperre steht unverändert', () => {
  it('⚠ sperrt bei einem leeren Pflichtfeld, das es selbst erfassen kann', () => {
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['ahv_nr'] })} />);
    expect(knopf().disabled).toBe(true);
    expect(screen.getByText(/Noch auszufüllen/)).toBeTruthy();
  });

  it('die Gegenprobe: ohne fehlendes Pflichtfeld ist der Knopf offen', () => {
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['geburtsdatum'] })} />);
    expect(knopf().disabled).toBe(false);
  });

  it('⚠ ein Feld, an das nur die Verwaltung kommt, sperrt NICHT', () => {
    /* `spielerpass` steht nicht im Formular — ein Mitglied dafür zu sperren
       wäre eine Sackgasse. Genannt wird es trotzdem. */
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['spielerpass'] })} />);
    expect(knopf().disabled).toBe(false);
  });

  it('nach dem Ausfüllen geht der Knopf auf — gerechnet wird gegen das Formular', () => {
    /* ⚠ Das AHV-Feld ist hier eindeutig zu treffen, weil es das einzige
       `type="password"` der Maske ist (maskierte Nummer, Auge zum Aufdecken).
       Ein „irgendein Textfeld"-Griff waere wertlos: er koennte den Vornamen
       erwischen, und der Test saehe genauso gruen aus. */
    const { container } = render(<DatenpruefungMitglied {...props({ pflichtfelder: ['ahv_nr'] })} />);
    expect(knopf().disabled).toBe(true);
    const ahvFelder = container.querySelectorAll('input[type="password"]');
    expect(ahvFelder).toHaveLength(1);
    fireEvent.change(ahvFelder[0], { target: { value: '756.1111.2222.33' } });
    /* Gegen `raw` gerechnet bliebe der Knopf gesperrt, bis jemand neu laedt. */
    expect(knopf().disabled).toBe(false);
  });
});
