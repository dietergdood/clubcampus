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
/* ⚠ Aus dem `beforeEach` gesetzt statt fest verdrahtet. Die
   Mannschafts-Auswahl braucht ZWEI Gruppen — eine Sammlung aus einem
   Element kann „alle" nicht von „eines" unterscheiden, und ein Test, der
   das nicht trennen kann, ist grün, ohne zu prüfen. Die Vorgabe bleibt
   die eine Zeile von vorher, damit die älteren Fälle unberührt sind. */
let aufstellungZeilen;
vi.mock('../../domains/spiele/matchdatenService.ts', () => ({
  fetchAlleAufstellungen: vi.fn(async () => aufstellungZeilen),
  fetchZuordnungen: vi.fn(async () => []),
  loescheZuordnung: vi.fn(async () => null),
  speichereZuordnung: vi.fn(async (_sb, _v, sfvId, mid) => {
    gespeichert.push([sfvId, mid]); return null;
  }),
}));

/* ⚠ NUR `dateiDownload` ist eine Attrappe, nicht die Ausgabe-Funktion.
   Im jsdom einen echten Download auszulösen prüfte den Browser; was hier
   zu prüfen ist, ist ob überhaupt einer ausgelöst wird — und mit welchem
   Dateinamen. `alsMannschaftsliste()` läuft dabei ECHT: eine Attrappe
   dafür prüfte die Abschrift statt den Einbau. */
const geladen = [];
vi.mock('../../shared/list/exportUtils.ts', () => ({
  dateiDownload: vi.fn((inhalt, name, mime) => { geladen.push({ inhalt, name, mime }); }),
  inZwischenablage: vi.fn(async () => true),
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

const TEAMS = [
  { id: 't1', name: 'Da-Junioren', sfv_team_id: 38309 },
  /* Zweite Mannschaft: nur damit `38310` einen NAMEN bekommt. Eine Gruppe
     entsteht daraus erst, wenn eine Aufstellungszeile darauf zeigt. */
  { id: 't2', name: 'Cb-Junioren', sfv_team_id: 38310 },
];
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
  geladen.length = 0;
  aufstellungZeilen = [
    { sfv_person_id: 500, sfv_team_id: 38309, rueckennr: 9, spiel_id: 's1',
      /* ⚠ `spielzeit` gehoert dazu, seit die Liste das Stammteam kennt.
         Der Dienst liefert sie immer (`select("*")`); eine Attrappe ohne sie
         pruefte eine Form, die es nicht gibt. */
      spielzeit: 90 },
  ];
  antwort = {
    /* ⚠ Mit den getrennten Teilen, so wie `bildeOffeneNamen` sie seit dem
       24.09.2026 liefert. `name` ist der ABGELEITETE Wert — eine Attrappe,
       in der die drei nicht zusammenpassen, prüft eine Form, die es nie gibt. */
    namen: [{ sfv_person_id: 500, name: 'Anna Meier', vorname: 'Anna',
      nachname: 'Meier', jahrgang: 2011 }],
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

/* ══════════════════════════════════════════════════════════════════════
   Die Mannschafts-Auswahl für die Excel-Liste — im EINBAU.

   ⚠ Geprüft wird nicht, ob `alsMannschaftsliste()` richtig rechnet (das
   ist ihre eigene Sache), sondern ob die Maske sie überhaupt erreicht:
   dass das Kästchen dasteht, dass es NUR auswählt, und dass ohne Auswahl
   nichts geladen wird. Dieselbe Trennung wie beim Vorschlag oben.
   ══════════════════════════════════════════════════════════════════════ */
describe('Die Mannschaft lässt sich für die Liste wählen', () => {
  it('zeigt je Mannschaft ein Kästchen und setzt es', async () => {
    zeichne([MITGLIED()]);
    await waitFor(() =>
      expect(screen.getByLabelText(/Da-Junioren für die Liste/)).toBeTruthy());
    expect(screen.getByLabelText(/Da-Junioren für die Liste/).checked).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Da-Junioren für die Liste/));
    });
    expect(screen.getByLabelText(/Da-Junioren für die Liste/).checked).toBe(true);
  });

  it('⚠ ein Klick aufs Kästchen klappt die Gruppe NICHT auf', async () => {
    /* ⚠ DIE ZUSAGE, DIE SONST STILL BRICHT. Die Überschrift ist der
       Auslöser fürs Aufklappen; wandert das Kästchen je hinein — oder
       wird die ganze Zeile anklickbar —, tut ein Klick zwei Dinge, und
       zwei Wirkungen auf einen Klick sind von einer falschen Wirkung
       nicht zu unterscheiden.

       Erkannt am `<select>`: das steht nur in einer aufgeklappten Gruppe. */
    zeichne([MITGLIED()]);
    await waitFor(() =>
      expect(screen.getByLabelText(/Da-Junioren für die Liste/)).toBeTruthy());
    expect(screen.queryByRole('combobox')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Da-Junioren für die Liste/));
    });
    /* Beide Hälften. Ohne die erste wäre der Fall auch grün, wenn das
       Kästchen gar nichts täte — und prüfte dann nichts. */
    expect(screen.getByLabelText(/Da-Junioren für die Liste/).checked).toBe(true);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('„Alle auswählen" wählt alle Mannschaften', async () => {
    aufstellungZeilen.push(
      { sfv_person_id: 501, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's2',
        spielzeit: 90 });
    zeichne([MITGLIED()]);
    await namenHolen();

    await act(async () => { fireEvent.click(screen.getByText('Alle auswählen')); });
    /* ⚠ ZWEI Mannschaften, und beide werden genannt. Mit einer einzigen
       Gruppe wäre „alle" von „die eine" nicht zu unterscheiden. */
    expect(screen.getByLabelText(/Da-Junioren für die Liste/).checked).toBe(true);
    expect(screen.getByLabelText(/Cb-Junioren für die Liste/).checked).toBe(true);
    /* Die Mischung als ZAHL — angezeigt, nicht bedienbar. */
    expect(screen.getByText(/2 von 2 Mannschaften gewählt/)).toBeTruthy();
  });

  it('„Auswahl aufheben" nimmt alle zurück — zwei Handlungen, kein Schalter', async () => {
    /* ⚠ Die Gegenprobe zur Regel aus CLAUDE.md: es gibt kein Kästchen
       „alle", das bei Teilauswahl falsch stünde, sondern zwei Knöpfe, die
       jeder sagen, was sie tun. Also muss auch der zweite wirken. */
    aufstellungZeilen.push(
      { sfv_person_id: 501, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's2',
        spielzeit: 90 });
    zeichne([MITGLIED()]);
    await namenHolen();

    await act(async () => { fireEvent.click(screen.getByText('Alle auswählen')); });
    await act(async () => { fireEvent.click(screen.getByText('Auswahl aufheben')); });
    expect(screen.getByLabelText(/Da-Junioren für die Liste/).checked).toBe(false);
    expect(screen.getByText(/0 von 2 Mannschaften gewählt/)).toBeTruthy();
  });

  it('⚠ ohne Auswahl wird NICHTS geladen, und die Meldung sagt warum', async () => {
    /* ⚠ Eine leere Datei sieht aus wie ein Fehlschlag und ist einer, den
       niemand meldet: sie landet im Download-Ordner und fällt erst auf,
       wenn jemand sie öffnet. */
    zeichne([MITGLIED()]);
    await namenHolen();

    await act(async () => {
      /* ⚠ Auf die ROLLE eingeengt, nicht `getByText`: der Hinweis
         darunter nennt denselben Knopfnamen, und ein Muster über das ganze
         Dokument träfe beide. `getByRole` wirft bei zwei Treffern — und das
         ist richtig so, es zwingt zur Frage, WELCHE Stelle gemeint ist. */
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });
    expect(geladen).toEqual([]);
    expect(screen.getByText(/Keine Mannschaft gewählt/)).toBeTruthy();
  });

  it('mit Auswahl wird geladen, und die Meldung nennt ZWEI Zahlen', async () => {
    /* ⚠ DIE GEGENPROBE ZUM FALL DARÜBER. Ohne sie wäre die Sperre auch
       dann grün, wenn der Knopf NIE etwas lädt — eine Prüfung, die den
       Gut-Fall nicht kennt, kann „geht nicht" nicht von „geht nie"
       unterscheiden. */
    zeichne([MITGLIED()]);
    await namenHolen();
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Da-Junioren für die Liste/));
    });

    await act(async () => {
      /* ⚠ Auf die ROLLE eingeengt, nicht `getByText`: der Hinweis
         darunter nennt denselben Knopfnamen, und ein Muster über das ganze
         Dokument träfe beide. `getByRole` wirft bei zwei Treffern — und das
         ist richtig so, es zwingt zur Frage, WELCHE Stelle gemeint ist. */
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });
    expect(geladen).toHaveLength(1);
    expect(geladen[0].name).toBe('spieler-nach-mannschaft.csv');
    expect(geladen[0].mime).toMatch(/text\/csv/);
    /* ⚠ Die Zahlen NAMENTLICH, nicht bloss „eine Meldung erscheint". Ein
       „✓" ohne Zahl ist in diesem Projekt ausdrücklich unerwünscht — und
       eine Erwartung, die nur die Länge prüft, hielte auch ein „0 Spieler
       aus 0 Mannschaften". */
    expect(screen.getByText(/1 Spieler aus 1 Mannschaft geladen/)).toBeTruthy();
  });

  it('⚠ ⚠  und die Datei hat eine DATENZEILE, nicht nur den Kopf', async () => {
    /* ⚠ ⚠  DIE ERWARTUNG, DIE DEN VERTRAGSFEHLER GEFANGEN HÄTTE.
       Der Auftrag nannte als zweites Argument `String(sfv_team_id ?? "-")`.
       `alsMannschaftsliste()` filtert aber gegen `SpielerZeile.teams`, und
       das führt NAMEN — eine Nummer trifft dort nie.

       ⚠ Beides ist `ReadonlySet<string>`: `typecheck` war grün, ein
       Download fand statt, und die Meldung sagte „1 Spieler geladen“ —
       während in der Datei nur die Kopfzeile stand. Ein Fall, der bloss
       prüft, DASS geladen wird, kann das nicht sehen.

       Deshalb hier der INHALT. Mit dem falschen Schlüssel ist dieser Fall
       rot und die fünf darüber bleiben grün. */
    zeichne([MITGLIED()]);
    await namenHolen();
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Da-Junioren für die Liste/));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });

    const zeilen = geladen[0].inhalt.trim().split('\r\n');
    /* Kopf plus genau eine Datenzeile. `toHaveLength` allein wäre hier
       richtig — aber die Zeile soll auch die richtige sein. */
    expect(zeilen).toHaveLength(2);
    /* ⚠ Nachname zuerst, Vorname als zweite Spalte — `/Anna Meier/` stünde
       so in keiner Zeile mehr. */
    expect(zeilen[1]).toMatch(/Meier;Anna/);
    expect(zeilen[1]).toMatch(/Da-Junioren/);
  });

  it('⚠ ⚠  die Datei trägt Vorname und Name GETRENNT — im Einbau', async () => {
    /* ⚠ ⚠  DER FALL, DER DAS DURCHREICHEN DER TEILE PRÜFT.

       `alsMannschaftsliste()` und `leseNamenTeile()` sind einzeln geprüft.
       Was dazwischen liegt, ist die Verdrahtung in dieser Komponente:
       `setNamensTeile(leseNamenTeile(daten))` und das VIERTE Argument an
       `baueSpielerZeilen`. Gibt die Maske dort `{}` durch, fällt der Code
       auf den ganzen Namen unter „Name" zurück, die Spalte „Vorname" bleibt
       bei JEDER Person leer — und kein einziger anderer Fall wird rot.

       ⚠ Gegengeprobt mit zwei Sabotagen — das vierte Argument auf `{}`,
       und `setNamensTeile` gar nicht gerufen. Beide machen ZWEI Fälle rot:
       diesen und den darüber, der seit dem 24.09.2026 `Meier;Anna` erwartet.
       ⚠ Hier stand „die sieben darüber bleiben grün" — gemessen sind es
       sechs. Ein Kommentar über eine andere Stelle ist eine Behauptung ohne
       Prüfung, und diese hier war falsch. */
    zeichne([MITGLIED()]);
    await namenHolen();
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Da-Junioren für die Liste/));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });

    const zeilen = geladen[0].inhalt.trim().split('\r\n');
    /* Der Kopf nennt SECHS Spalten in dieser Reihenfolge — `Stammteam laut`
       kam am 24.09.2026 zwischen `Team` und `Rückennummer` dazu. */
    expect(zeilen[0]).toContain('Name;Vorname;Team;Stammteam laut;Rückennummer;SFV-personId');
    /* Und die Datenzeile füllt BEIDE — die zweite Zelle ist nicht leer.
       Genau das wäre sie beim Rückfall, und dann sähe die Datei auf den
       ersten Blick richtig aus. */
    const felder = zeilen[1].split(';');
    expect(felder[0]).toBe('Meier');
    expect(felder[1]).toBe('Anna');
  });

  it('⚠ ⚠  die Datei trägt EINE Zeile je Person, unter ihrem Stammteam — im Einbau', async () => {
    /* ⚠ ⚠  DER FALL ZUM UMBAU VOM 24.09.2026, und er prüft die VERDRAHTUNG.

       `alsMannschaftsliste()` und `bestimmeStammteam()` sind einzeln
       geprüft. Was dazwischen liegt, ist diese Komponente: `spielzeit` muss
       von `fetchAlleAufstellungen` durch `baueSpielerZeilen` bis in die
       Regel kommen. Reicht die Maske sie nicht durch, fällt jede Person auf
       eine Mannschaft ohne gezählte Einsätze zurück — und die Spalte
       `Stammteam laut` stünde trotzdem gefüllt da.

       Diese Person läuft in ZWEI Mannschaften auf, mit mehr Einsätzen bei
       den Cb-Junioren. Die Datei muss deshalb EINE Zeile haben, und darin
       die Cb — über das Da-Kästchen ist sie nicht mehr zu erreichen.

       ⚠ Gegengeprobt: `spielzeit` in der Attrappe weggelassen — dann sind
       die Einsätze ein Gleichstand, die kleinere Nummer 38309 gewinnt, und
       die Zeile nennt Da-Junioren statt Cb. Dieser Fall rot, die anderen
       grün.

       ⚠ Person 501 steht hier NUR, damit es die Cb-Gruppe überhaupt gibt —
       siehe den Fall darunter. Ohne sie ist Person 500 über kein Kästchen
       erreichbar, und dieser Fall prüfte eine leere Datei. */
    aufstellungZeilen.push(
      { sfv_person_id: 500, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's2', spielzeit: 90 },
      { sfv_person_id: 500, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's3', spielzeit: 90 },
      { sfv_person_id: 501, sfv_team_id: 38310, rueckennr: 4, spiel_id: 's4', spielzeit: 90 });
    zeichne([MITGLIED()]);
    await namenHolen();
    /* Beide Kästchen setzen — die Frage ist nicht, ob die Auswahl greift,
       sondern ob die Person EINMAL dasteht. */
    await act(async () => { fireEvent.click(screen.getByText('Alle auswählen')); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });

    const zeilen = geladen[0].inhalt.trim().split('\r\n');
    /* ⚠ Die Zeilen DIESER Person, über die personId gesucht — nicht
       `zeilen[1]`: Person 501 steht ebenfalls in der Datei, und eine
       Erwartung auf die Position hinge an der Sortierung. */
    const meine = zeilen.filter(z => z.includes('="500"'));
    /* GENAU EINE — vorher waren es zwei, eine je Mannschaft. */
    expect(meine).toHaveLength(1);
    const felder = meine[0].split(';');
    expect(felder[2]).toBe('Cb-Junioren');
    /* ⚠ Die vierte Spalte ist gefüllt, und zwar mit dem Text der Regel, die
       hier greifen MUSS. `toBeTruthy()` allein hielte auch „Kader" — und das
       wäre die Aussage, die Person hätte nur eine Mannschaft. */
    expect(felder[3]).toBe('mehrere Kader, meiste Einsätze');
    /* Und ihre andere Mannschaft steht in ihrer Zeile nirgends. */
    expect(meine[0]).not.toContain('Da-Junioren');
  });

  it('⚠ ⚠  gemessen: eine Person in zwei Mannschaften kann über KEIN Kästchen erreichbar sein', async () => {
    /* ⚠ ⚠  DIE FOLGE DES UMBAUS, UND SIE IST SCHÄRFER ALS ANGENOMMEN.

       Erwartet hatte ich: die Person ist nur über das Kästchen der ANDEREN
       Mannschaft zu bekommen. Gemessen am 24.09.2026 an diesem Fall: es gibt
       das andere Kästchen unter Umständen gar nicht.

       `gruppiereNachTeam()` arbeitet auf `offeneZuordnungen()`, und das
       behält je Person nur die ERSTE `sfv_team_id`. Person 500 landet damit
       in der Da-Gruppe; eine Cb-Gruppe entsteht nur, wenn eine ANDERE Person
       dort ihre erste Zeile hat. Ihr Stammteam ist aber die Cb — also wählt
       „Alle auswählen" die Da, und die Datei bleibt leer.

       ⚠ Das ist kein Defekt dieses Umbaus, sondern die Naht zwischen Maske
       und Ausgabe. Die Maske wird hier ausdrücklich nicht geändert; dieser
       Fall hält fest, was dabei offen bleibt — damit niemand es später für
       einen Zufall hält.

       ⚠ Und die Meldung sagt die WAHRE Zahl: „0 Spieler". Zählte die Maske
       weiter über alle Mannschaften der Person, stünde dort „1 Spieler" über
       einer Datei mit nur der Kopfzeile — zwei Zahlen für dieselbe Sache,
       und die falsche an der Stelle, an die der Benutzer schaut. */
    aufstellungZeilen.push(
      { sfv_person_id: 500, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's2', spielzeit: 90 },
      { sfv_person_id: 500, sfv_team_id: 38310, rueckennr: 7, spiel_id: 's3', spielzeit: 90 });
    zeichne([MITGLIED()]);
    await namenHolen();

    /* Es gibt nur EIN Kästchen, obwohl die Person in zwei Mannschaften
       aufläuft — die Hälfte des Befundes, die man sonst nicht sieht. */
    expect(screen.queryByLabelText(/Cb-Junioren für die Liste/)).toBeNull();
    await act(async () => { fireEvent.click(screen.getByText('Alle auswählen')); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Liste nach Mannschaft/ }));
    });

    /* Nur der Kopf. ⚠ Die Datei wird MITGEPRÜFT, nicht nur die Meldung: ein
       Fall auf den Satz allein wäre grün, sobald die Zahl 0 heisst, egal was
       in der Datei steht. */
    expect(geladen[0].inhalt.trim().split('\r\n')).toHaveLength(1);
    expect(screen.getByText(/0 Spieler aus 1 Mannschaft geladen/)).toBeTruthy();
  });
});
