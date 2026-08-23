// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/personLoeschenModal.test.jsx

   „Person löschen (DSGVO)" — die Vorschau vor dem einzigen Vorgang
   im Projekt OHNE ROLLBACK.

   ⚠ Was diese Fälle festhalten, ist nicht die Optik, sondern drei
   Zusagen, die man einer Vorschau ansehen können muss:

     1. Sie verschweigt nichts. Leere Tabellen werden GEZÄHLT
        („N weitere geprüft, alle leer"), die vier nicht prüfbaren
        stehen IMMER da — auch wenn sie leer sind.
     2. Der Name, gegen den bestätigt wird, kommt aus der VORSCHAU,
        nicht aus der Liste. Zeigen Liste und Id verschiedene
        Personen, bestätigt man sonst den Irrtum.
     3. Ein Abbruch nennt WAS sich geändert hat, nicht nur DASS.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  holeLoeschVorschau: vi.fn(),
  loeschePerson: vi.fn(),
}));

/* ⚠ `istLoeschFehler` wird NICHT gemockt, sondern nachgebaut wie im Original —
   die Attrappe soll die Weiche stellen, nicht die Weiche ersetzen. */
vi.mock('../../../domains/person/loeschService.ts', () => ({
  holeLoeschVorschau: svc.holeLoeschVorschau,
  loeschePerson: svc.loeschePerson,
  istLoeschFehler: (x) => !!x && typeof x === 'object' && 'fehler' in x,
}));

vi.mock('../../../theme.ts', () => ({
  ModalOrSheet: ({ children, open }) => open ? <div>{children}</div> : null,
  Btn: ({ children, onClick, disabled }) =>
    <button onClick={onClick} disabled={disabled}>{children}</button>,
  Input: (p) => <input {...p} />,
  InfoBox: ({ text }) => <div>{text}</div>,
  Label: ({ children }) => <span>{children}</span>,
}));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));

const { PersonLoeschenModal } = await import('../PersonLoeschenModal.tsx');

const VORSCHAU = {
  person: { id: 'p-1', name: 'Adrian Kaiser', email: 'a@k.ch',
            aktive_mitgliedschaften: 1, hat_konto: true },
  faellt: [
    { tabelle: 'mitglieder', anzahl: 1 },
    { tabelle: 'kader', anzahl: 7, unter: 'mitglieder' },
    { tabelle: 'benutzer', anzahl: 1 },
  ],
  anonym: [],
  blockiert: [],
  nicht_pruefbar: ['abstimmung_antworten', 'aufgebote', 'bus_anmeldungen', 'material_ausleihen'],
  geprueft_leer: 9,
  zahlen: { mitglieder: 1, kader: 7, benutzer: 1 },
};

const zeige = (props = {}) => render(
  <PersonLoeschenModal open onClose={() => {}} sb={{}} personId="p-1"
    name="Adrian Kaiser" {...props} />);

beforeEach(() => {
  svc.holeLoeschVorschau.mockResolvedValue({
    vorschau: VORSCHAU, abdruck: 'abc.sig', gueltig_bis: '2026-08-23T12:00:00Z' });
  svc.loeschePerson.mockResolvedValue({
    geloescht: true, zahlen: VORSCHAU.zahlen, nicht_geprueft: VORSCHAU.nicht_pruefbar });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('die Vorschau verschweigt nichts', () => {
  it('zählt die leeren Tabellen, statt sie wegzulassen', async () => {
    zeige();
    expect(await screen.findByText(/9 weitere Tabellen geprüft, alle leer/)).toBeTruthy();
  });

  it('⚠ nennt die vier nicht prüfbaren, obwohl sie leer sind', async () => {
    zeige();
    await screen.findByText(/9 weitere/);
    /* Der einzige Punkt, an dem die Vorschau etwas NICHT weiss. Er gehört auf
       den Schirm und nicht in eine Fussnote. */
    expect(screen.getByText(/aufgebote/)).toBeTruthy();
    expect(screen.getByText(/Nicht prüfbar:/)).toBeTruthy();
  });

  it('rückt ein, was an der Mitgliedschaft hängt', async () => {
    zeige();
    expect(await screen.findByText(/↳ Kadereinträge/)).toBeTruthy();
  });

  it('nennt das Portal-Konto samt Anmeldung — die Hälfte, die sonst stehenbliebe', async () => {
    zeige();
    expect(await screen.findByText(/Portal-Konto \(samt Anmeldung\)/)).toBeTruthy();
  });
});

describe('die Bestätigung', () => {
  const loeschKnopf = () =>
    screen.getAllByRole('button').find(b => /Endgültig löschen/.test(b.textContent));

  it('sperrt den Knopf, bis der Name stimmt', async () => {
    zeige();
    await screen.findByText(/9 weitere/);
    expect(loeschKnopf().disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Adrian Kaiser'), { target: { value: 'Adrian Kaiser' } });
    expect(loeschKnopf().disabled).toBe(false);
  });

  it('⚠ prüft gegen den Namen aus der VORSCHAU, nicht gegen den aus der Liste', async () => {
    /* Der gefährliche Fall: die Liste zeigt einen anderen Namen als die Id
       meint. Gegen die Prop zu prüfen hiesse, den Irrtum bestätigen zu
       lassen. */
    zeige({ name: 'Ganz jemand anderes' });
    await screen.findByText(/9 weitere/);
    fireEvent.change(screen.getByPlaceholderText('Adrian Kaiser'), { target: { value: 'Ganz jemand anderes' } });
    expect(loeschKnopf().disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Adrian Kaiser'), { target: { value: 'Adrian Kaiser' } });
    expect(loeschKnopf().disabled).toBe(false);
  });

  it('⚠ sagt, dass die Eingabe NICHT die Sperre ist', async () => {
    /* Sonst hält der Admin die Rückfrage für die Absicherung — und sie
       schützt vor dem Verklicken, nicht vor dem Irrtum. */
    zeige();
    expect(await screen.findByText(/Sperre gegen die falsche Person ist nicht diese Eingabe/)).toBeTruthy();
  });
});

describe('der Abbruch', () => {
  it('⚠ nennt WAS sich geändert hat, nicht nur DASS', async () => {
    svc.loeschePerson.mockResolvedValue({
      fehler: 'Seit der Vorschau hat sich etwas geändert, es wurde NICHT gelöscht.',
      unterschiede: ['kader: 7 → 8', 'mitgliedschaften: 1 → 2'],
    });
    zeige();
    await screen.findByText(/9 weitere/);
    fireEvent.change(screen.getByPlaceholderText('Adrian Kaiser'), { target: { value: 'Adrian Kaiser' } });
    fireEvent.click(screen.getAllByRole('button').find(b => /Endgültig löschen/.test(b.textContent)));
    expect(await screen.findByText(/kader: 7 → 8/)).toBeTruthy();
    expect(screen.getByText(/mitgliedschaften: 1 → 2/)).toBeTruthy();
  });

  it('blockierende Zeilen sperren den Knopf ganz — kein Namensfeld', async () => {
    svc.holeLoeschVorschau.mockResolvedValue({
      vorschau: { ...VORSCHAU, blockiert: [{ tabelle: 'news', anzahl: 3 }] },
      abdruck: 'abc.sig', gueltig_bis: 'x' });
    zeige();
    await screen.findByText(/9 weitere/);
    expect(screen.queryByPlaceholderText('Adrian Kaiser')).toBeNull();
    expect(screen.getAllByRole('button').find(b => /Endgültig löschen/.test(b.textContent)).disabled).toBe(true);
  });
});

describe('nach dem Löschen', () => {
  it('meldet, was entfernt wurde — und was nicht aufgeräumt werden konnte', async () => {
    const onGeloescht = vi.fn();
    zeige({ onGeloescht });
    await screen.findByText(/9 weitere/);
    fireEvent.change(screen.getByPlaceholderText('Adrian Kaiser'), { target: { value: 'Adrian Kaiser' } });
    fireEvent.click(screen.getAllByRole('button').find(b => /Endgültig löschen/.test(b.textContent)));
    await waitFor(() => expect(onGeloescht).toHaveBeenCalled());
    expect(screen.getByText(/Gelöscht\. Was entfernt wurde:/)).toBeTruthy();
    /* ⚠ Auch am Ende genannt: was die Vorschau nicht prüfen konnte, konnte
       auch dieser Lauf nicht aufräumen. */
    expect(screen.getByText(/Nicht aufgeräumt, weil nicht prüfbar/)).toBeTruthy();
  });
});

describe('wenn die Vorschau selbst scheitert', () => {
  it('zeigt die Meldung der Function statt einer leeren Maske', async () => {
    svc.holeLoeschVorschau.mockResolvedValue({ fehler: 'Nur Administratoren' });
    zeige();
    expect(await screen.findByText('Nur Administratoren')).toBeTruthy();
    /* Keine Komponente, die bei fehlenden Daten `null` zurückgibt — eine
       Sektion, die still verschwindet, ist von einer nicht gerenderten nicht
       zu unterscheiden. */
    expect(screen.queryByPlaceholderText('Adrian Kaiser')).toBeNull();
  });
});
