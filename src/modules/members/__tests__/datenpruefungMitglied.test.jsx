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
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

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
import { updatePerson } from '../../../domains/person/personService.ts';

const RAW = {
  person_id: 'p-1', vorname: 'Hans', nachname: 'Beispiel',
  mitgliedtyp: 'Aktivmitglied', geburtsdatum: '1990-01-01',
  nationalitaet: 'CH', strasse: 'Seestrasse 1', plz: '8704', ort: 'Herrliberg',
  kanton: 'ZH', geschlecht: 'm', heimatort: 'Zürich',
  email: 'hans@example.ch', telefon: '079 000 00 00', ahv_nr: null,
};

function props(over = {}) {
  /* Standardmaessig faellig: die Faelle unten pruefen den Pruef-Knopf. Der
     Fall „nicht faellig" steht eigens weiter unten. */
  return { raw: RAW, sb: {}, setPortalMsg: vi.fn(), onReload: null,
           pflichtfelder: [], pruefungFaellig: true, ...over };
}

/* Seit dem 20.08.2026 sind es ZWEI Knoepfe: „Speichern" (der Normalfall
   unter dem Jahr) und „Meine Angaben sind korrekt ✓" im Pruef-Balken. */
const pruefKnopf = () => screen.getAllByRole('button').find(b => /korrekt/i.test(b.textContent));
const speichernKnopf = () => screen.getAllByRole('button').find(b => /^Speicher/.test(b.textContent));
const ahvFeld = c => c.querySelector('input[type="password"]');

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('DatenpruefungMitglied — die Sperre steht unverändert', () => {
  it('⚠ sperrt bei einem leeren Pflichtfeld, das es selbst erfassen kann', () => {
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['ahv_nr'] })} />);
    expect(pruefKnopf().disabled).toBe(true);
    expect(screen.getByText(/Noch auszufüllen/)).toBeTruthy();
  });

  it('die Gegenprobe: ohne fehlendes Pflichtfeld ist der Knopf offen', () => {
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['geburtsdatum'] })} />);
    expect(pruefKnopf().disabled).toBe(false);
  });

  it('⚠ ein Feld, an das nur die Verwaltung kommt, sperrt NICHT', () => {
    /* `spielerpass` steht nicht im Formular — ein Mitglied dafür zu sperren
       wäre eine Sackgasse. Genannt wird es trotzdem. */
    render(<DatenpruefungMitglied {...props({ pflichtfelder: ['spielerpass'] })} />);
    expect(pruefKnopf().disabled).toBe(false);
  });

  it('⚠ nach dem Ausfüllen wechselt der GRUND der Sperre', () => {
    /* ⚠ Das AHV-Feld ist hier eindeutig zu treffen, weil es das einzige
       `type="password"` der Maske ist. Ein „irgendein Textfeld"-Griff waere
       wertlos: er koennte den Vornamen erwischen, und der Test saehe genauso
       gruen aus.

       Gerechnet wird gegen das FORMULAR — gegen `raw` bliebe „Noch
       auszufüllen" stehen, bis jemand neu laedt. Offen ist der Pruef-Knopf
       danach trotzdem nicht: jetzt ist etwas ungespeichert. */
    const { container } = render(<DatenpruefungMitglied {...props({ pflichtfelder: ['ahv_nr'] })} />);
    expect(pruefKnopf().disabled).toBe(true);
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(1);
    fireEvent.change(ahvFeld(container), { target: { value: '756.1111.2222.33' } });
    expect(screen.queryByText(/Noch auszufüllen/)).toBeNull();
    expect(screen.getByText(/bitte zuerst speichern/)).toBeTruthy();
    expect(pruefKnopf().disabled).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   Zwei Anlaesse, zwei Knoepfe (20.08.2026)

   Dieselbe Trennung wie in der Eltern-Maske — eine Regel fuer
   beide, sonst verhalten sich zwei Masken verschieden und
   niemand weiss, welche recht hat.
   ═══════════════════════════════════════════════════════════════ */
describe('DatenpruefungMitglied — Speichern und Prüfen sind getrennt', () => {
  it('⚠ Speichern setzt profil_geprueft_at NICHT', async () => {
    const { container } = render(<DatenpruefungMitglied {...props()} />);
    fireEvent.change(ahvFeld(container), { target: { value: '756.1' } });
    await act(async () => { fireEvent.click(speichernKnopf()); });
    expect(updatePerson).toHaveBeenCalledTimes(1);
    expect(updatePerson.mock.calls[0][2]).not.toHaveProperty('profil_geprueft_at');
    expect(updatePerson.mock.calls[0][2].ahv_nr).toBe('756.1');
  });

  it('⚠ Speichern geht auch bei einem leeren Pflichtfeld', async () => {
    /* Wer seine Adresse korrigieren will, darf daran nicht scheitern, dass
       die AHV-Nummer leer ist. */
    const { container } = render(<DatenpruefungMitglied {...props({ pflichtfelder: ['ahv_nr'] })} />);
    const strasse = container.querySelector('input[value="Seestrasse 1"]');
    fireEvent.change(strasse, { target: { value: 'Neue Gasse 2' } });
    expect(speichernKnopf().disabled).toBe(false);
    await act(async () => { fireEvent.click(speichernKnopf()); });
    expect(updatePerson).toHaveBeenCalledTimes(1);
  });

  it('ohne Änderung ist Speichern gesperrt', () => {
    render(<DatenpruefungMitglied {...props()} />);
    expect(speichernKnopf().disabled).toBe(true);
  });

  it('⚠ Prüfen schreibt NUR das Datum', async () => {
    render(<DatenpruefungMitglied {...props()} />);
    await act(async () => { fireEvent.click(pruefKnopf()); });
    expect(updatePerson).toHaveBeenCalledTimes(1);
    expect(Object.keys(updatePerson.mock.calls[0][2])).toEqual(['profil_geprueft_at']);
  });

  it('⚠ der Prüf-Balken erscheint NUR, wenn die Prüfung fällig ist', () => {
    const { unmount } = render(<DatenpruefungMitglied {...props({ pruefungFaellig: false })} />);
    expect(screen.queryByText(/Der Verein bittet um Prüfung/)).toBeNull();
    expect(screen.queryByText(/korrekt/)).toBeNull();
    /* Speichern gibt es trotzdem — das ist der Normalfall unter dem Jahr. */
    expect(speichernKnopf()).toBeTruthy();
    unmount();

    render(<DatenpruefungMitglied {...props()} />);
    expect(screen.getByText(/Der Verein bittet um Prüfung/)).toBeTruthy();
  });
});
