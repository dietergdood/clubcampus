// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   Der Vorschlag im EINBAU — nicht die Funktion.

   ⚠ ANLASS. `schlageVor()` hat vierzehn eigene Fälle, und keiner
   davon sagt, ob das Ergebnis je in den Baum kommt. Genau dieser
   Unterschied ist am 28.08.2026 teuer geworden: die Bilanz-Karte
   hatte fünf grüne Komponententests und erschien nicht.

   ⚠ UND ER TRIFFT HIER DIE HÄUFIGSTE FEHLERFORM DES PROJEKTS:
   berechnet, geliefert, nicht gezeigt. Ein Vorschlag, der im
   `useMemo` steht und nicht im Auswahlfeld, ist von keinem
   Vorschlag zu unterscheiden.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

vi.mock('../../theme.ts', () => ({
  Btn: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  InfoBox: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../icons.tsx', () => ({ TI: () => null }));

const gespeichert = [];
vi.mock('../../domains/spiele/matchdatenService.ts', () => ({
  fetchAlleAufstellungen: vi.fn(async () => ([
    { sfv_person_id: 500, sfv_team_id: 38309, rueckennr: 9, spiel_id: 's1' },
  ])),
  fetchZuordnungen: vi.fn(async () => []),
  loescheZuordnung: vi.fn(async () => null),
  speichereZuordnung: vi.fn(async (_sb, _v, sfvId, mid) => {
    gespeichert.push([sfvId, mid]); return null;
  }),
}));

let antwort;
vi.mock('../../domains/sfv/sfvService.ts', async (echt) => ({
  /* ⚠ DIE LESER BLEIBEN ECHT. Eine Attrappe für sie würde die
     Abschrift prüfen — und genau in einem dieser Leser sitzt die
     Frage, ob der Jahrgang überhaupt ankommt. */
  ...(await echt()),
  holeNamen: vi.fn(async () => ({ daten: antwort, fehler: null })),
}));

import { SfvSpielerZuordnung } from '../portal/SfvSpielerZuordnung.tsx';

const TEAMS = [{ id: 't1', name: 'Da-Junioren', sfv_team_id: 38309 }];
const MITGLIED = (ueber) => ({
  id: 1, vorname: 'Anna', nachname: 'Meier', aktiv: true,
  geburtsdatum: '2011-03-14', kader_teams: [{ name: 'Da-Junioren' }], ...ueber,
});

function zeichne(mitglieder) {
  return render(<SfvSpielerZuordnung sb={{}} vereinId="v1" benutzerId="b1"
    dbMitglieder={mitglieder} dbTeams={TEAMS}/>);
}

async function namenHolen() {
  await waitFor(() => expect(screen.getByText(/Namen holen/)).toBeTruthy());
  await act(async () => { fireEvent.click(screen.getByText(/Namen holen/)); });
  /* ⚠ Die Gruppe ist zugeklappt. Ohne diesen Klick prüfte der Fall
     eine Zeile, die gar nicht gerendert wird — und wäre grün, weil
     nichts Falsches dastünde. Eine Prüfung, die ihren Gegenstand
     nicht sieht, sagt „in Ordnung". */
  await act(async () => { fireEvent.click(screen.getByText('Da-Junioren')); });
}

beforeEach(() => {
  gespeichert.length = 0;
  antwort = {
    namen: [{ sfv_person_id: 500, name: 'Anna Meier', jahrgang: 2011 }],
    spiele_abgefragt: 1, namen_gefunden: 1, offen_gesamt: 1, fehler: 0,
    jahrgang_unlesbar: 0,
  };
});

describe('Der Vorschlag erreicht die Maske', () => {
  it('waehlt das Mitglied im Auswahlfeld vor und nennt den Grund', async () => {
    zeichne([MITGLIED()]);
    await namenHolen();
    /* ⚠ Der VORGEWÄHLTE Wert, nicht bloss ein Text: ein Grund im
       Hinweis und ein leeres Feld daneben wäre die halbe Lieferung. */
    await waitFor(() => {
      expect(screen.getByRole('combobox').value).toBe('1');
    });
    expect(screen.getByText(/Vorschlag:/).textContent).toMatch(/Jahrgang 2011/);
  });

  it('speichert NICHTS von selbst — erst der Klick schreibt', async () => {
    /* ⚠ DIE SCHUTZREGEL IM EINBAU. `onChange` feuert bei einem
       `defaultValue` nicht; wäre das anders, hätte die Vorauswahl
       381 Zeilen ungefragt geschrieben. */
    zeichne([MITGLIED()]);
    await namenHolen();
    await waitFor(() => expect(screen.getByRole('combobox').value).toBe('1'));
    expect(gespeichert).toEqual([]);

    await act(async () => { fireEvent.click(screen.getByText('Übernehmen')); });
    /* ⚠ Eine ZAHL, keine Zeichenkette: `zuordnen()` wandelt, und
       `sfv_zuordnung.mitglied_id` ist numerisch. Meine erste
       Erwartung stand auf '1' und war der Griff ins Gedächtnis
       statt an den Code. */
    expect(gespeichert).toEqual([[500, 1]]);
  });

  it('zeigt bei zwei Namensgleichen KEINE Vorauswahl und sagt warum', async () => {
    antwort.namen[0].jahrgang = null;
    antwort.jahrgang_unlesbar = 1;
    zeichne([MITGLIED({ id: 1 }), MITGLIED({ id: 2, geburtsdatum: '2012-01-01' })]);
    await namenHolen();
    await waitFor(() => expect(screen.getByText(/Kein Vorschlag:/)).toBeTruthy());
    expect(screen.getByRole('combobox').value).toBe('');
    expect(screen.queryByText('Übernehmen')).toBeNull();
    expect(screen.getByText(/Kein Vorschlag:/).textContent).toMatch(/entscheidet ein Mensch/);
  });

  it('unterscheidet „nicht gemeldet" von „alle lesbar"', async () => {
    /* ⚠ Eine Fassung vor dem 13.09.2026 schickt `jahrgang_unlesbar`
       nicht. `undefined` als Null zu zeigen wäre genau die
       Einebnung, die am 11.09.2026 drei Nullen für 129 Personen
       stehen liess. */
    delete antwort.jahrgang_unlesbar;
    zeichne([MITGLIED()]);
    await namenHolen();
    await waitFor(() => expect(screen.getByText(/nicht gemeldet/)).toBeTruthy());
    expect(screen.queryByText(/bei allen lesbar/)).toBeNull();
  });

  it('nennt die Aufteilung, und sie geht auf', async () => {
    antwort.namen.push({ sfv_person_id: 501, name: 'Niemand Unbekannt', jahrgang: null });
    antwort.namen_gefunden = 2; antwort.offen_gesamt = 2;
    zeichne([MITGLIED()]);
    await namenHolen();
    /* Ein Spieler steht in der Aufstellung, also ist die Grundmenge 1 —
       der zweite Name gehoert zu keinem offenen Spieler. Die Zahl muss
       die OFFENEN zaehlen, nicht die geholten Namen. */
    await waitFor(() => expect(screen.getByText(/von 1 Spielern haben einen/)).toBeTruthy());
  });
});

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DER SATZ, DER VOM FALSCHEN WEG ABHÄLT (24.09.2026)

   Vier Profile drüben trugen Nummern, die in keiner Aufstellung
   vorkommen — unter anderem 1905405 und 1122655. Sie sind nicht
   erfunden: die vier standen wegen eines Lesefehlers nicht in dieser
   Liste, also hat jemand die Zahl dort geholt, wo sie sichtbar war —
   beim Verband.

   ⚠ Und dessen Datensatz führt mehrere Nummern nebeneinander.
   `passportNumber` steht neben `personId`, ist ebenfalls eine sechs-
   bis siebenstellige Zahl und heisst auf dem Matchblatt „Passnummer".
   Man sieht es ihr nicht an, welche die richtige ist.

   Der Lesefehler ist behoben. Dieser Satz ist die zweite Hälfte — und
   er steht in der Maske, weil ihn genau der braucht, der gerade
   überträgt, nicht der, der den Quelltext liest.

   ⚠ ⚠  DIE ZWEITE ERWARTUNG IST DIE WICHTIGERE. Dass der Satz DA ist,
   hält ihn nicht am Leben — dass die falsche Zahl NICHT als gültige
   Quelle dasteht, schon. Dieselbe Bauart wie beim „Kontakt-Tab", den es
   nie gab: die zweite Zeile hält fest, dass der falsche Weg nicht
   zurückkommt.
   ══════════════════════════════════════════════════════════════════════ */

describe('⚠ Die Maske sagt, WELCHE Nummer gilt', () => {
  it('nennt personId als Quelle und warnt vor der Passnummer', async () => {
    zeichne([MITGLIED()]);
    await namenHolen();

    /* Die Ausgabe erscheint erst, wenn Namen geholt sind — sie hängt an
       der Namensmeldung, nicht an einer eigenen Stelle. */
    const hinweis = screen.getByText(/Diese Nummern und keine anderen/)
      .closest('div');
    /* ⚠ Im Hinweis gesucht, nicht im ganzen Dokument: `personId` steht
       auch in der Spaltenüberschrift der Liste. `getByText` wirft bei
       mehreren Treffern — und das ist richtig so, es zwingt zur Frage,
       WELCHE Stelle gemeint ist. */
    expect(hinweis.textContent).toMatch(/personId/);
    expect(hinweis.textContent).toMatch(/Passnummer/);
  });

  it('⚠ und sagt, was NICHT zu tun ist, wenn jemand fehlt', async () => {
    /* Der Satz muss den Umkehrschluss mitliefern. Sonst sucht, wer eine
       Person vermisst, die Nummer anderswo — und genau so ist der Fehler
       entstanden. */
    zeichne([MITGLIED()]);
    await namenHolen();
    expect(screen.getByText(/noch keinen Einsatz/)).toBeTruthy();
    expect(screen.getByText(/keine Nummer ins Profil/)).toBeTruthy();
  });
});
