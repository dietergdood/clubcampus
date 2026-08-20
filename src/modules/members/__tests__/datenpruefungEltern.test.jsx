/* ═══════════════════════════════════════════════════════════════
   Die Datenprüfung des Elternteils (21.08.2026)

   Vier Dinge, die vorher anders waren und deshalb hier stehen:

     1. Die Felder kommen aus der KONFIGURATION, nicht aus einer
        Liste in der Datei. Der Beweis ist die Gegenprobe: ein
        Feld auf „aus" verschwindet, ohne dass jemand die Maske
        anfasst.
     2. Die AHV-Nummer ist SCHREIBBAR. Sie war ein Lesefeld mit
        „Nur lesbar — Änderungen durch den Administrator", und
        genau daran hingen 372 Junioren fest.
     3. Geschrieben wird über die Allowlist-Services, nicht über
        `updateMitglied()`.
     4. Ein Fehlschlag meldet KEINEN Erfolg.

   ⚠ `PersonFelderFormular` und `feldkonfig` laufen hier ECHT.
   Mit einer Attrappe prüfte der Test seine eigene Attrappe — und
   „die Konfiguration steuert die Felder" ist die Aussage, um die
   es geht.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  updateEigenePerson: vi.fn(),
  updateKindDurchElternteil: vi.fn(),
}));

vi.mock('../../../domains/members/kindService.ts', async (orig) => ({
  ...(await orig()),
  ...svc,
}));

/* Die Mock-Factory listet die benoetigten Exporte einzeln auf — fehlt einer,
   wirft Vitest schon bei der blossen Referenz, und zwar fuer die ganze Datei
   (CLAUDE.md, „Haeufigste Testfalle"). */
vi.mock('../../../theme.ts', () => ({
  Btn: ({children,onClick,disabled}) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card: ({children}) => <div>{children}</div>,
  PhoneInput: ({value,onChange}) => <input aria-label="tel" value={value} onChange={e=>onChange(e.target.value)}/>,
  useAddrSearch: () => [],
  usePlzLookup: () => {},
}));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));

import { DatenpruefungEltern } from '../tabs/DatenpruefungEltern.tsx';
import { updateEigenePerson, updateKindDurchElternteil } from '../../../domains/members/kindService.ts';

const sb = { _tag: 'sb' };

const ELTERNTEIL = {
  id: 'p-mutter', vorname: 'Anna', nachname: 'Muster',
  email: 'anna@example.ch', telefon: '079 111 11 11',
  profil_geprueft_at: null,
};

const KIND = {
  id: 42, person_id: 'p-kind', mitgliedtyp: 'Juniorenmitglied',
  vorname: 'Tim', nachname: 'Muster', ahv_nr: '756.0000.0000.00',
  strasse: 'Seestrasse 1', plz: '8704', ort: 'Herrliberg',
};

function props(over = {}) {
  return {
    sb,
    elternteil: ELTERNTEIL,
    kinder: [KIND],
    feldkonfig: [],
    setPortalMsg: vi.fn(),
    onReload: null,
    ...over,
  };
}

/* Seit dem 20.08.2026 sind die Karten Klappkarten, und was vollstaendig ist,
   startet ZU. Der Weg zum Feld ist damit ein Klick laenger — die Aussage der
   Tests darunter bleibt dieselbe. */
function oeffne(name) {
  const kopf = screen.getAllByRole('button').find(b => b.textContent.includes(name));
  if (!kopf) throw new Error(`Keine Klappkarte fuer "${name}" gefunden`);
  if (kopf.getAttribute('aria-expanded') === 'false') fireEvent.click(kopf);
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.updateEigenePerson.mockResolvedValue({ ok: true, abgewiesen: [], fehler: null });
  svc.updateKindDurchElternteil.mockResolvedValue({ ok: true, abgewiesen: [], fehler: null });
});
afterEach(cleanup);

describe('DatenpruefungEltern — was die Maske zeigt', () => {
  it('⚠ die AHV-Nummer des Kindes ist beschreibbar', async () => {
    /* DAS ist der Grund fuer den ganzen Eltern-Auftrag: die Nummer steht auf
       der Krankenkassenkarte des Kindes. Der Elternteil hat sie, die
       Verwaltung nicht — 372 aktive Junioren ohne AHV-Nummer. */
    await act(async () => { render(<DatenpruefungEltern {...props()} />); });
    oeffne('Tim Muster');
    const felder = screen.getAllByLabelText(/AHV-Nr\./);
    expect(felder.length).toBeGreaterThan(0);
    expect(felder.some(f => !f.disabled)).toBe(true);
  });

  it('⚠ der alte Satz „Nur lesbar" steht nirgends mehr', () => {
    /* Die zweite Haelfte, und die wichtigere: sie haelt fest, dass die
       Sperre nicht zurueckkommt. */
    render(<DatenpruefungEltern {...props()} />);
    expect(screen.queryByText(/Nur lesbar/)).toBeNull();
    expect(screen.queryByText(/Änderungen durch den Administrator$/)).toBeNull();
  });

  it('die E-Mail ist gesperrt und sagt warum', () => {
    render(<DatenpruefungEltern {...props()} />);
    oeffne('Anna Muster'); oeffne('Tim Muster');
    const mails = screen.getAllByLabelText(/E-Mail/);
    expect(mails.every(m => m.disabled)).toBe(true);
    /* Angezeigt und nicht weggelassen: ein Feld, das verschwindet, ist von
       einem nicht konfigurierten nicht zu unterscheiden. */
    expect(screen.getAllByText(/nur durch den Administrator änderbar/).length).toBeGreaterThan(0);
  });

  it('⚠ die Konfiguration steuert die Felder — Gegenprobe mit „aus"', () => {
    /* Ohne Zeile in mitgliedtyp_feldkonfig heisst es „freiwillig"; das Feld
       erscheint. Mit `aus` verschwindet es — und zwar ohne dass jemand diese
       Maske anfasst. Genau dafuer gibt es die Konfiguration. */
    const { unmount } = render(<DatenpruefungEltern {...props()} />);
    oeffne('Anna Muster'); oeffne('Tim Muster');
    expect(screen.getAllByLabelText(/Heimatort/).length).toBeGreaterThan(0);
    unmount();

    /* ⚠ Die Attrappe traegt `mitgliedtyp` (den NAMEN), nicht nur
       `mitgliedtyp_id`: gefiltert wird beim LESEN ueber den Namen, weil die
       Aufrufstellen nur ihn haben (`raw.mitgliedtyp`). Mit der Id allein
       traefe die Zeile nichts, das Feld bliebe stehen — und der Test waere
       gruen fuer den falschen Grund. Genau die Falle aus CLAUDE.md: eine
       Attrappe kennt kein Schema. */
    render(<DatenpruefungEltern {...props({
      feldkonfig: [{
        gilt_fuer: 'mitgliedtyp', mitgliedtyp_id: 'typ-1',
        mitgliedtyp: 'Juniorenmitglied', schluessel: 'heimatort', modus: 'aus',
      }],
    })} />);
    oeffne('Anna Muster'); oeffne('Tim Muster');
    /* Beim Elternteil (Achse ohne_mitgliedschaft) steht Heimatort weiterhin —
       die Zeile gilt nur fuer den Mitgliedtyp. Beim Kind ist sie weg. */
    expect(screen.queryAllByLabelText(/Heimatort/).length).toBe(1);
  });

  it('⚠ ohne verknüpftes Kind sagt sie es, statt nichts zu zeigen', () => {
    /* Ein Elternteil, dessen Verknuepfung fehlt, saehe sonst nur seine eigene
       Karte. „Keine Kinder" und „konnte nicht geladen werden" sehen von aussen
       gleich aus — gesagt werden muss es trotzdem. */
    render(<DatenpruefungEltern {...props({ kinder: [] })} />);
    expect(screen.getByText(/Keine Kinder verknüpft/)).toBeTruthy();
    expect(screen.getByText(/melde es dem Vereinsadministrator/)).toBeTruthy();
  });

  it('mit Kind erscheint der Hinweis nicht — die Gegenprobe', () => {
    render(<DatenpruefungEltern {...props()} />);
    expect(screen.queryByText(/Keine Kinder verknüpft/)).toBeNull();
    expect(screen.getByText('Tim Muster')).toBeTruthy();
  });

  it('⚠ ein Ladefehler wird als Ladefehler gemeldet, nicht als „keine Kinder"', () => {
    /* Am 20.08.2026 sagte die Maske „Keine Kinder verknuepft", waehrend die
       Abfrage in einen 400er lief: `profil_geprueft_at` auf `mitglieder` gibt
       es seit Etappe 6a nicht mehr, und `(data || [])` machte aus dem Fehler
       eine leere Liste. Ein Satz, der das Falsche sagt, ist schlimmer als
       keiner — er schickt die Suche in die Datenbank statt in den Code. */
    render(<DatenpruefungEltern {...props({ kinder: [], kinderFehler: 'column mitglieder_1.profil_geprueft_at does not exist' })} />);
    expect(screen.getByText(/konnten nicht geladen werden/)).toBeTruthy();
    expect(screen.getByText(/profil_geprueft_at/)).toBeTruthy();
    expect(screen.queryByText(/Keine Kinder verknüpft/)).toBeNull();
  });

  it('die eigenen Daten bleiben trotz Ladefehler prüfbar', () => {
    /* Der Kinderfehler kippt die Seite nicht: die eigene Haelfte ist geladen. */
    render(<DatenpruefungEltern {...props({ kinder: [], kinderFehler: 'irgendein Fehler' })} />);
    expect(screen.getByText('Meine Angaben')).toBeTruthy();
    expect(screen.getByText(/Alles geprüft/)).toBeTruthy();
  });

  it('der Profil-Status kommt vom Elternteil, nicht von einem Mitglied', () => {
    render(<DatenpruefungEltern {...props({ elternteil: { ...ELTERNTEIL, profil_geprueft_at: '2026-02-01' } })} />);
    expect(screen.getByText('Geprüft')).toBeTruthy();
    expect(screen.queryByText('Ausstehend')).toBeNull();
  });
});

describe('DatenpruefungEltern — was sie schreibt', () => {
  it('⚠ nutzt die Allowlist-Services, nicht updateMitglied', async () => {
    render(<DatenpruefungEltern {...props()} />);
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    expect(updateEigenePerson).toHaveBeenCalledTimes(1);
    expect(updateKindDurchElternteil).toHaveBeenCalledTimes(1);
    /* Ueber die PERSON des Kindes, nicht ueber seine Mitglieds-Id: geschrieben
       wird `personen`, und `personen_update_kind` filtert darauf. */
    expect(updateKindDurchElternteil.mock.calls[0][1]).toBe('p-kind');
  });

  it('bestätigt über den eigenen Parameter, nicht als Feld', async () => {
    render(<DatenpruefungEltern {...props()} />);
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    expect(updateEigenePerson.mock.calls[0][3]).toBe(true);
    expect(updateKindDurchElternteil.mock.calls[0][3]).toBe(true);
    /* profil_geprueft_at darf NICHT im Feldobjekt stehen — sonst waere die
       Bestaetigung ein Feld unter Feldern. */
    expect(updateEigenePerson.mock.calls[0][2]).not.toHaveProperty('profil_geprueft_at');
  });

  it('schickt nur, was sich geändert hat', async () => {
    render(<DatenpruefungEltern {...props()} />);
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    /* Nichts angefasst: ein leeres Aenderungsobjekt. Ein update mit
       unveraenderten Werten schriebe `updated_at` fort und saehe im Verlauf
       wie eine Bearbeitung aus, die nie stattgefunden hat. */
    expect(updateEigenePerson.mock.calls[0][2]).toEqual({});

    /* Das ZWEITE Feld ist das des Kindes — das erste gehoert dem Elternteil.
       Die Reihenfolge steht fest: eigene Karte, dann je eine pro Kind. */
    oeffne('Anna Muster'); oeffne('Tim Muster');
    const ahvFelder = screen.getAllByLabelText(/AHV-Nr\./);
    expect(ahvFelder).toHaveLength(2);
    await act(async () => { fireEvent.change(ahvFelder[1], { target: { value: '756.9999.9999.99' } }); });
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    expect(updateKindDurchElternteil.mock.calls[1][2]).toEqual({ ahv_nr: '756.9999.9999.99' });
    /* Und die Gegenprobe: die eigene Zeile bleibt unberuehrt. */
    expect(updateEigenePerson.mock.calls[1][2]).toEqual({});
  });

  it('⚠ ein abgewiesener Schreibvorgang meldet KEINEN Erfolg', async () => {
    /* Bei RLS gibt es keinen Fehler zu lesen — eine gesperrte Zeile wird
       schlicht nicht getroffen. Vorher stand hier bedingungslos
       „Alles bestätigt ✓": eine Erfolgsmeldung ohne Deckung. */
    svc.updateKindDurchElternteil.mockResolvedValue({
      ok: false, abgewiesen: [], fehler: 'fehlt die Verknüpfung zum Kind?',
    });
    const setPortalMsg = vi.fn();
    render(<DatenpruefungEltern {...props({ setPortalMsg })} />);
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    const letzte = setPortalMsg.mock.calls.at(-1)[0];
    expect(letzte.ok).toBe(false);
    expect(letzte.text).toContain('Tim Muster');
    expect(letzte.text).not.toContain('Alles bestätigt');
  });

  it('⚠ ein Kind ohne person_id wird gemeldet, nicht übersprungen', async () => {
    /* Stillschweigend uebersprungen saehe es aus, als waeren die Daten des
       Kindes gespeichert worden — ein Fehler, der wie eine Datenlage
       aussieht. */
    const setPortalMsg = vi.fn();
    const { person_id: _weg, ...ohnePerson } = KIND;
    render(<DatenpruefungEltern {...props({ kinder: [ohnePerson], setPortalMsg })} />);
    await act(async () => { fireEvent.click(screen.getByText(/Alles geprüft/)); });
    expect(updateKindDurchElternteil).not.toHaveBeenCalled();
    const letzte = setPortalMsg.mock.calls.at(-1)[0];
    expect(letzte.ok).toBe(false);
    expect(letzte.text).toContain('keine Person verknüpft');
  });
});

/* ═══════════════════════════════════════════════════════════════
   Die Sperre (20.08.2026)

   Bis dahin liess sich „Alles geprüft und korrekt ✓" druecken,
   waehrend Pflichtfelder leer waren. Das Sternchen am Feld kam aus
   istPflicht(), der Knopf war an nichts gebunden — eine Anzeige,
   die eine Regel behauptet, die es nicht gibt.

   Beim ersten echten Elternkonto ging genau das durch: Stefan
   Wengers AHV-Nummer fehlte, bestaetigt wurde trotzdem.
   ═══════════════════════════════════════════════════════════════ */
const PFLICHT_AHV = [{
  gilt_fuer: 'mitgliedtyp', mitgliedtyp_id: 'typ-1',
  mitgliedtyp: 'Juniorenmitglied', schluessel: 'ahv_nr', modus: 'pflicht',
}];

const knopf = () => screen.getByText(/Alles geprüft/).closest('button');

describe('DatenpruefungEltern — die Sperre', () => {
  it('⚠ sperrt, wenn beim Kind ein Pflichtfeld leer ist', () => {
    render(<DatenpruefungEltern {...props({
      feldkonfig: PFLICHT_AHV,
      kinder: [{ ...KIND, ahv_nr: null }],
    })} />);
    expect(knopf().disabled).toBe(true);
    expect(screen.getByText(/Noch 1 Feld auszufüllen/)).toBeTruthy();
  });

  it('die Gegenprobe: mit ausgefülltem Feld ist der Knopf offen', () => {
    render(<DatenpruefungEltern {...props({ feldkonfig: PFLICHT_AHV })} />);
    expect(knopf().disabled).toBe(false);
  });

  it('⚠ ein leeres Feld auf der FALSCHEN Achse sperrt nicht', () => {
    /* Geburtsdatum und Geschlecht sind auf `ohne_mitgliedschaft` nicht
       Pflicht — beim ersten Test sahen sie leer aus und wurden fuer
       Pflichtfelder gehalten. Wer hier pauschal sperrte, hielte ein
       Elternteil fuer ein Feld auf, das seine Achse gar nicht verlangt. */
    render(<DatenpruefungEltern {...props({
      elternteil: { ...ELTERNTEIL, geburtsdatum: null, geschlecht: null },
    })} />);
    expect(knopf().disabled).toBe(false);
  });

  it('⚠ was nur die Verwaltung ändern kann, wird genannt und sperrt NICHT', () => {
    /* Ein Mitglied fuer ein Feld zu sperren, das es nicht aendern kann, waere
       eine Sackgasse. Die E-Mail ist gesperrt (Login-Name) — sie gehoert in
       die Gruppe „Verwaltung". */
    render(<DatenpruefungEltern {...props({
      feldkonfig: [{ gilt_fuer: 'mitgliedtyp', mitgliedtyp_id: 'typ-1',
        mitgliedtyp: 'Juniorenmitglied', schluessel: 'email', modus: 'pflicht' }],
      kinder: [{ ...KIND, email: null }],
    })} />);
    expect(knopf().disabled).toBe(false);
    oeffne('Tim Muster');
    expect(screen.getByText(/Nur durch die Vereinsverwaltung zu ergänzen/)).toBeTruthy();
  });

  it('nach dem Ausfüllen geht der Knopf auf — ohne Neuladen', () => {
    /* Gerechnet wird gegen die FORMULARWERTE. Gegen die DB-Zeile bliebe der
       Knopf gesperrt, bis jemand die Seite neu laedt. */
    render(<DatenpruefungEltern {...props({
      feldkonfig: PFLICHT_AHV, kinder: [{ ...KIND, ahv_nr: null }],
    })} />);
    expect(knopf().disabled).toBe(true);
    const ahv = screen.getAllByLabelText(/AHV-Nr\./).find(f => !f.disabled);
    fireEvent.change(ahv, { target: { value: '756.9999.9999.99' } });
    expect(knopf().disabled).toBe(false);
  });

  it('⚠ ein gesperrter Knopf schreibt auch dann nicht, wenn er gedrückt wird', () => {
    /* `disabled` ist Anzeige. Die Sperre gehoert auch in den Handler — sonst
       genuegte ein Klick per Tastatur oder ein zweiter Renderpfad. */
    render(<DatenpruefungEltern {...props({
      feldkonfig: PFLICHT_AHV, kinder: [{ ...KIND, ahv_nr: null }],
    })} />);
    fireEvent.click(knopf());
    expect(updateEigenePerson).not.toHaveBeenCalled();
    expect(updateKindDurchElternteil).not.toHaveBeenCalled();
  });
});

describe('DatenpruefungEltern — Klappkarten', () => {
  it('unvollständige Karte startet offen, vollständige zu', () => {
    render(<DatenpruefungEltern {...props({
      feldkonfig: PFLICHT_AHV, kinder: [{ ...KIND, ahv_nr: null }],
    })} />);
    const kopf = n => screen.getAllByRole('button').find(b => b.textContent.includes(n));
    expect(kopf('Tim Muster').getAttribute('aria-expanded')).toBe('true');
    expect(kopf('Anna Muster').getAttribute('aria-expanded')).toBe('false');
  });

  it('⚠ Pille und Sperre kommen aus derselben Rechnung', () => {
    /* Zwei Zaehler waeren derselbe Fehler wie zwei Pflichtfeldlisten: sie
       laufen auseinander, und dann sperrt der Knopf, waehrend die Karte
       „Vollständig" sagt. */
    render(<DatenpruefungEltern {...props({
      feldkonfig: PFLICHT_AHV, kinder: [{ ...KIND, ahv_nr: null }],
    })} />);
    expect(screen.getByText('1 fehlt')).toBeTruthy();
    expect(knopf().disabled).toBe(true);

    const ahv = screen.getAllByLabelText(/AHV-Nr\./).find(f => !f.disabled);
    fireEvent.change(ahv, { target: { value: '756.1' } });
    expect(screen.queryByText('1 fehlt')).toBeNull();
    expect(screen.getAllByText('Vollständig').length).toBe(2);
    expect(knopf().disabled).toBe(false);
  });

  it('die eigenen Angaben sind auch eine Klappkarte', () => {
    render(<DatenpruefungEltern {...props()} />);
    const kopf = screen.getAllByRole('button').find(b => b.textContent.includes('Anna Muster'));
    expect(kopf).toBeTruthy();
    expect(kopf.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(kopf);
    expect(kopf.getAttribute('aria-expanded')).toBe('true');
  });
});
