/* ═══════════════════════════════════════════════════════════════
   Die Feldkonfiguration bedienen (20.08.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Die Spalte „Ohne Mitgliedschaft" war seit ihrem ersten Tag
   (21.08.2026) TOT. `aendern()` prüfte `!typ?.id` ohne den
   istOhne-Fall — dort ist `typ` null, die Funktion kehrte um,
   kein Schalter bewegte sich, nichts wurde gespeichert, nichts
   gemeldet. `lokalSetzen()` hatte den Guard richtig: zwei
   Bedingungen für dieselbe Sache, eine davon falsch.

   Aufgefallen ist es nie, weil die drei Konfigurationszeilen aus
   der Migration stammten — sie standen da, bevor jemand den
   ersten Schalter drückte. **Eine Oberfläche, die nichts
   speichert und nichts meldet, ist von einer funktionierenden
   nicht zu unterscheiden.**

   Und es gab keinen Test. Diese Komponente ist die einzige
   Stelle, an der die Konfiguration bedient wird.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  setzeModus: vi.fn(),
  setzeModusMehrere: vi.fn(),
}));
vi.mock('../../../domains/members/feldkonfigService.ts', () => svc);

vi.mock('../../../theme.ts', () => ({
  Btn: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  InfoBox: ({ text }) => <div>{text}</div>,
}));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));

import { MitgliedtypFelderSektion } from '../MitgliedtypFelderSektion.tsx';

const TYP = { id: 'typ-1', name: 'Aktivmitglied', aktiv: true };
const ART = { art_id: 'art-1', name: 'Elternteil', sort_order: 10, ableitung: 'eltern_kinder' };

function props(over = {}) {
  return {
    supabase: { _tag: 'sb' },
    vereinId: 'verein-1',
    dbMitgliedtypen: [TYP],
    feldkonfig: [],
    setFeldkonfig: vi.fn(),
    personenarten: [ART],
    ...over,
  };
}

/* Der Dreifach-Schalter einer Zeile. `Telefon` steht in jedem Feldsatz und
   trägt alle drei Werte — ein Feld mit nur zwei Werten sagte weniger. */
function schalter(wert) {
  const alle = screen.getAllByText(wert);
  return alle[alle.length - 1].closest('button') || alle[alle.length - 1];
}

function waehle(value) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.setzeModus.mockResolvedValue(null);
  svc.setzeModusMehrere.mockResolvedValue(null);
});
afterEach(cleanup);

describe('MitgliedtypFelderSektion — beide Achsen schreiben', () => {
  it('eine Änderung auf einer MITGLIEDTYP-Spalte schreibt', async () => {
    render(<MitgliedtypFelderSektion {...props()} />);
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    expect(svc.setzeModus).toHaveBeenCalled();
    const [, vereinId, ziel] = svc.setzeModus.mock.calls[0];
    expect(vereinId).toBe('verein-1');
    expect(ziel).toEqual({ achse: 'mitgliedtyp', mitgliedtypId: 'typ-1' });
  });

  it('⚠ eine Änderung auf einer ART-Spalte schreibt AUCH', async () => {
    /* DER FUND. Bis zum 20.08.2026 kehrte `aendern()` hier um, weil `typ`
       null ist — kein Schreibvorgang, keine Meldung, kein Ausschlag. */
    render(<MitgliedtypFelderSektion {...props()} />);
    waehle('art:art-1');
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    expect(svc.setzeModus).toHaveBeenCalled();
    const [, , ziel] = svc.setzeModus.mock.calls[0];
    expect(ziel).toEqual({ achse: 'personenart', artId: 'art-1' });
  });

  it('die Achse wandert mit der Auswahl — nicht die eine für die andere', async () => {
    /* Die Gegenprobe zu beiden oben: sonst waeren sie auch gruen, wenn
       IMMER dieselbe Achse geschrieben wuerde. */
    render(<MitgliedtypFelderSektion {...props()} />);
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    waehle('art:art-1');
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    expect(svc.setzeModus.mock.calls[0][2].achse).toBe('mitgliedtyp');
    expect(svc.setzeModus.mock.calls[1][2].achse).toBe('personenart');
  });
});

describe('MitgliedtypFelderSektion — ein Fehlschlag wird gemeldet', () => {
  it('⚠ auf der Mitgliedtyp-Spalte: Meldung statt stiller Rückkehr', async () => {
    svc.setzeModus.mockResolvedValue('permission denied for table mitgliedtyp_feldkonfig');
    const setFeldkonfig = vi.fn();
    render(<MitgliedtypFelderSektion {...props({ setFeldkonfig })} />);
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    expect(screen.getByText(/permission denied/)).toBeTruthy();
    /* Und die optimistische Änderung wird zurückgedreht — sonst stünde der
       Schalter auf einem Wert, den die Datenbank nicht kennt. */
    expect(setFeldkonfig).toHaveBeenCalledTimes(2);
  });

  it('⚠ auf der Art-Spalte ebenso', async () => {
    svc.setzeModus.mockResolvedValue('42501');
    render(<MitgliedtypFelderSektion {...props()} />);
    waehle('art:art-1');
    await act(async () => { fireEvent.click(schalter('Pflicht')); });
    expect(screen.getByText(/42501/)).toBeTruthy();
  });
});

describe('MitgliedtypFelderSektion — die Auswahl', () => {
  it('zeigt Mitgliedtypen und Arten in getrennten Gruppen', () => {
    render(<MitgliedtypFelderSektion {...props()} />);
    expect(screen.getByRole('combobox').querySelectorAll('optgroup')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Aktivmitglied' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Elternteil' })).toBeTruthy();
  });

  it('⚠ ohne Arten steht ein Satz da, keine leere Gruppe', () => {
    /* Eine Gruppe, die still verschwindet, ist von einer nicht gerenderten
       nicht zu unterscheiden (CLAUDE.md). */
    render(<MitgliedtypFelderSektion {...props({ personenarten: [] })} />);
    expect(screen.getByText(/keine Arten angelegt/)).toBeTruthy();
  });
});

/* ═══════════════════════════════════════════════════════════════
   Was die Spalte zeigt (21.08.2026)

   Zwei Funde aus dem Screenshot der Art-Spalte:

     · Vereinsdaten, Teams und Notizen standen als leere
       Ueberschrift ohne einen einzigen Schalter da. Alle ihre
       Schluessel tragen `nur_mitgliedschaft`. Eine Ueberschrift
       ohne Inhalt sieht aus wie etwas Kaputtes.

     · Der Bereichskopf trug einen Schiebeschalter fuer bis zu
       sechs Felder. Sein Zustand kam aus `some(sichtbar)` und
       malte „gemischt" wie „alle an" — bei sechs Feldern ist
       gemischt der Normalfall.
   ═══════════════════════════════════════════════════════════════ */
describe('MitgliedtypFelderSektion — leere Bereiche', () => {
  it('⚠ auf der Art-Spalte fehlen Vereinsdaten und Teams ganz', () => {
    render(<MitgliedtypFelderSektion {...props()} />);
    waehle('art:art-1');
    for (const leer of ['Vereinsdaten', 'Teams']) {
      expect(screen.queryByText(leer)).toBeNull();
    }
  });

  it('⚠ Notizen stehen dort seit dem 21.08.2026 wieder', () => {
    /* Sie galten als `nur_mitgliedschaft`, weil
       `mitglieder_notizen.mitglied_id` NOT NULL war — eine technische Grenze,
       als fachliche Regel behandelt. Ein Verein will ueber einen Supporter
       oder ein Elternteil sehr wohl etwas notieren koennen. */
    render(<MitgliedtypFelderSektion {...props()} />);
    waehle('art:art-1');
    expect(screen.getByText('Notizen')).toBeTruthy();
  });

  it('die Gegenprobe: beim Mitgliedtyp stehen sie alle', () => {
    /* Ohne diesen Fall waere der Test oben auch gruen, wenn die Bereiche
       ueberhaupt nicht mehr gerendert wuerden. */
    render(<MitgliedtypFelderSektion {...props()} />);
    for (const da of ['Vereinsdaten', 'Teams', 'Notizen']) {
      expect(screen.getByText(da)).toBeTruthy();
    }
  });

  it('Bereiche mit Inhalt bleiben auf beiden Achsen', () => {
    render(<MitgliedtypFelderSektion {...props()} />);
    expect(screen.getByText('Personalien')).toBeTruthy();
    waehle('art:art-1');
    expect(screen.getByText('Personalien')).toBeTruthy();
    expect(screen.getByText('Kontakt')).toBeTruthy();
  });
});

describe('MitgliedtypFelderSektion — der Bereichskopf ist eine Handlung', () => {
  it('⚠ trägt einen Knopf mit Text, keinen Schiebeschalter', () => {
    /* Ein Zustand fuer eine Sammlung kann nur luegen: drei Tatsachen
       (alle an · gemischt · alle aus), zwei Schalterstellungen. */
    render(<MitgliedtypFelderSektion {...props()} />);
    expect(screen.getAllByText('Alle ausblenden').length).toBeGreaterThan(0);
  });

  it('schaltet alle Felder des Bereichs auf einmal', async () => {
    render(<MitgliedtypFelderSektion {...props()} />);
    await act(async () => { fireEvent.click(screen.getAllByText('Alle ausblenden')[0]); });
    expect(svc.setzeModusMehrere).toHaveBeenCalled();
    const [, , , schluessel, modus] = svc.setzeModusMehrere.mock.calls[0];
    expect(modus).toBe('aus');
    /* Personalien: geburtsdatum, geschlecht, nationalitaet, nationalitaet2,
       heimatort, ahv_nr — vorname und nachname sind fest und nicht dabei. */
    expect(schluessel).toContain('ahv_nr');
    expect(schluessel).not.toContain('vorname');
  });

  it('⚠ ist alles aus, heisst der Knopf umgekehrt', () => {
    const alleAus = ['geburtsdatum','geschlecht','nationalitaet','nationalitaet2','heimatort','ahv_nr']
      .map(k => ({ mitgliedtyp_id: 'typ-1', mitgliedtyp: 'Aktivmitglied',
                   art_id: null, art: '', schluessel: k, modus: 'aus' }));
    render(<MitgliedtypFelderSektion {...props({ feldkonfig: alleAus })} />);
    expect(screen.getAllByText('Alle einblenden').length).toBeGreaterThan(0);
  });

  it('ein Ein-Eintrag-Bereich behält den Schiebeschalter', () => {
    /* Teams, Notizen, Vereinsfunktionen: ein Schluessel, zwei Zustaende —
       dort ist er ehrlich. Geprueft am Titel des Knopfs. */
    render(<MitgliedtypFelderSektion {...props()} />);
    const titel = [...document.querySelectorAll('button[title]')].map(b => b.getAttribute('title'));
    expect(titel.some(t => /^Teams (ein|aus)schalten$/.test(t))).toBe(true);
  });
});
