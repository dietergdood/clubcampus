import { describe, it, expect } from "vitest";
import {
  baueStatistik, gruppiereNachTeam, hatVerlauf, mischeEreignisse,
  offeneZuordnungen, TYP_AUSSCHLUSS, TYP_TOR, TYP_VERWARNUNG,
  beschreibeEreignis, geaenderteFelder, unzugeordnetLabel, SUBTYP_EIGENTOR,
  OHNE_MANNSCHAFT,
} from "../matchdatenAnzeige.ts";
import type { EreignisZeile } from "../matchdatenAnzeige.ts";
/* ⚠ NUR LESEND. Die Regel lebt in `stammteam.ts`; hier wird sie als
   unabhängige Autorität befragt und nicht nachgebaut. */
import { bestimmeStammteam } from "../stammteam.ts";

const e = (p: Partial<EreignisZeile> & { id: string }): EreignisZeile => ({
  herkunft: "sfv", ersetzt_ereignis_id: null, verworfen_am: null,
  /* Am 05.09.2026 dazugekommen: EreignisZeile fuehrt jetzt subtyp_id.
     Die Attrappe muss es tragen, sonst prueft sie eine andere Form als
     die, die laeuft. */
  subtyp_id: null,
  typ_id: TYP_TOR, typ: "Tor", subtyp: null, minute: 10, zusatzminute: 0,
  ist_eigener: true, gegner_club_name: null, sfv_person_id: 111,
  rueckennr: 9, ein_sfv_person_id: null, ein_rueckennr: null, ...p,
});

describe("mischeEreignisse — die zwei Schichten", () => {
  it("zeigt die SFV-Zeile, solange es keine Korrektur gibt", () => {
    const raus = mischeEreignisse([e({ id: "s1" })]);
    expect(raus).toHaveLength(1);
    expect(raus[0].vomVerein).toBe(false);
    expect(raus[0].original).toBeNull();
  });

  it("setzt die Korrektur an die Stelle der SFV-Zeile und behält das Original", () => {
    const raus = mischeEreignisse([
      e({ id: "s1", sfv_person_id: 111 }),
      e({ id: "k1", herkunft: "verein", ersetzt_ereignis_id: "s1", sfv_person_id: 222 }),
    ]);
    expect(raus).toHaveLength(1);
    expect(raus[0].sfv_person_id).toBe(222);
    expect(raus[0].vomVerein).toBe(true);
    expect(raus[0].original?.sfv_person_id).toBe(111);
  });

  it("lässt nach dem Verwerfen wieder den SFV gelten", () => {
    const raus = mischeEreignisse([
      e({ id: "s1", sfv_person_id: 111 }),
      e({ id: "k1", herkunft: "verein", ersetzt_ereignis_id: "s1",
          sfv_person_id: 222, verworfen_am: "2026-08-19T10:00:00Z" }),
    ]);
    expect(raus).toHaveLength(1);
    expect(raus[0].sfv_person_id).toBe(111);
    expect(raus[0].vomVerein).toBe(false);
  });

  it("nimmt einen nachgetragenen Assist zusätzlich auf", () => {
    /* Eine Vereins-Zeile ohne ersetzt_ereignis_id verdeckt nichts — sie
       kommt dazu. Der SFV kennt den Typ 9, befüllt ihn bei uns aber nicht. */
    const raus = mischeEreignisse([
      e({ id: "s1", minute: 10 }),
      e({ id: "a1", herkunft: "verein", typ_id: 9, typ: "Assist", minute: 10, sfv_person_id: 333 }),
    ]);
    expect(raus).toHaveLength(2);
    expect(raus.filter(x => x.vomVerein)).toHaveLength(1);
  });

  it("verliert eine Korrektur nicht, deren SFV-Zeile verschwunden ist", () => {
    /* Der Verband kann ein Ereignis zurücknehmen. Die Eingabe des Vereins
       darf dabei nicht stillschweigend verschwinden. */
    const raus = mischeEreignisse([
      e({ id: "k1", herkunft: "verein", ersetzt_ereignis_id: "weg", sfv_person_id: 222 }),
    ]);
    expect(raus).toHaveLength(1);
    expect(raus[0].vomVerein).toBe(true);
    expect(raus[0].original).toBeNull();
  });

  it("sortiert nach Minute und Zusatzminute", () => {
    const raus = mischeEreignisse([
      e({ id: "c", minute: 90, zusatzminute: 3 }),
      e({ id: "a", minute: 10 }),
      e({ id: "b", minute: 90, zusatzminute: 1 }),
    ]);
    expect(raus.map(x => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("hatVerlauf", () => {
  it("erkennt ein Spiel ohne Ereignisse des Verbands", () => {
    /* Bei vier von zehn Spielen liefert der SFV keinen Verlauf — auch bei
       sieben Toren. Das wird gesagt, nicht als leere Liste gezeigt. */
    expect(hatVerlauf([])).toBe(false);
  });

  it("zählt eigene Nachträge nicht als Verlauf des Verbands", () => {
    /* Ein nachgetragener Assist macht aus einem nicht erfassten Spiel
       keinen erfassten. Sonst verschwände der Hinweis, sobald jemand eine
       einzige Zeile ergänzt. */
    expect(hatVerlauf([e({ id: "a1", herkunft: "verein", typ_id: 9 })])).toBe(false);
  });

  it("erkennt einen erfassten Verlauf", () => {
    expect(hatVerlauf([e({ id: "s1" })])).toBe(true);
  });
});

describe("offeneZuordnungen", () => {
  /* ⚠ `spielzeit` gehört dazu, seit das Team über `bestimmeStammteam()`
     entschieden wird (24.09.2026). Der Dienst liefert sie immer
     (`select("*")` auf `spiel_aufstellung`); eine Attrappe ohne sie prüfte
     eine Form, die es nicht gibt — und sie wäre nicht harmlos: ohne
     Spielzeit zählt jede Zeile gleich, also stünde überall Gleichstand,
     und das Stammteam fiele auf die kleinste Teamnummer. */
  const a = (person: number, spiel: string, nr: number | null, team = 1, spielzeit = 90) =>
    ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: spiel, spielzeit });

  it("lässt bereits zugeordnete Personen weg", () => {
    const raus = offeneZuordnungen([a(111, "s1", 9), a(222, "s1", 7)], new Set([111]));
    expect(raus.map(o => o.sfv_person_id)).toEqual([222]);
  });

  it("fasst eine Person über mehrere Spiele zusammen", () => {
    const raus = offeneZuordnungen([a(111, "s1", 9), a(111, "s2", 9), a(111, "s3", 14)], new Set());
    expect(raus).toHaveLength(1);
    expect(raus[0].einsaetze).toBe(3);
    expect([...raus[0].rueckennummern].sort((a, b) => a - b)).toEqual([9, 14]);
  });

  it("nimmt die Person mit den meisten Einsätzen zuerst", () => {
    /* Wer oft spielt, ist am leichtesten zu erkennen. */
    const raus = offeneZuordnungen([a(111, "s1", 9), a(222, "s1", 7), a(222, "s2", 7)], new Set());
    expect(raus.map(o => o.sfv_person_id)).toEqual([222, 111]);
  });

  /* ══════════════════════════════════════════════════════════════════
     ⚠ ⚠  DAS TEAM IST DAS STAMMTEAM, NICHT DAS DER ERSTEN ZEILE

     Bis zum 24.09.2026 behielt diese Funktion die `sfv_team_id` der
     ERSTEN Zeile, die sie sah — und die Reihenfolge kam aus
     `.order("id")`, also aus der Einfügereihenfolge in die Datenbank.

     Der Schaden lag nicht in der Willkür selbst, sondern daneben: die
     Excel-Liste nimmt seit demselben Tag das Stammteam. Kästchen und
     Datei gruppierten nach zwei verschiedenen Regeln, und gemessen
     konnte eine Person dadurch über KEIN Kästchen erreichbar sein.
     ══════════════════════════════════════════════════════════════════ */
  it("⚠ ⚠ nimmt das Team mit den meisten Einsätzen — nicht das der ersten Zeile", () => {
    /* Erste Zeile: Mannschaft 20. Stammteam: 10, mit vier Einsätzen
       gegen einen. Die alte Regel hätte 20 gesagt. */
    const zeilen = [
      a(111, "s0", 7, 20),
      a(111, "s1", 9, 10), a(111, "s2", 9, 10), a(111, "s3", 9, 10), a(111, "s4", 9, 10),
    ];
    expect(offeneZuordnungen(zeilen, new Set())[0].sfv_team_id).toBe(10);

    /* ⚠ ⚠  UND DASSELBE MIT UMGEDREHTER EINGABE. Das ist der Kern: die
       alte Fassung hing an der Reihenfolge, die neue darf es nicht. Ein
       Fall mit nur EINER Reihenfolge wäre auch dann grün, wenn jemand
       „nimm die LETZTE Zeile" einbaut — und das wäre dieselbe Willkür in
       neuer Verkleidung. */
    expect(offeneZuordnungen([...zeilen].reverse(), new Set())[0].sfv_team_id).toBe(10);
  });

  it("zählt eine gemessene Null nicht als Einsatz — die Mannschaft mit Spielzeit gewinnt", () => {
    /* ⚠ Die Regel dazu steht in `stammteam.ts` und wird hier nicht
       nachgebaut, nur ihre Wirkung an der Naht geprüft: `spielzeit = 0`
       ist ein gemessener Wert („Kein Einsatz"), `null` eine fehlende
       Messung. Käme die Spielzeit hier nicht durch, stünden beide
       Mannschaften auf eins und die kleinere Nummer (10) gewänne. */
    const raus = offeneZuordnungen([
      a(111, "s1", 9, 10, 0), a(111, "s2", 9, 10, 0),
      a(111, "s3", 7, 20, 90),
    ], new Set());
    expect(raus[0].sfv_team_id).toBe(20);
  });

  it("⚠ der Zähler „offen“ zählt jede Person genau einmal", () => {
    /* Die Maske summiert `g.offen.length` über die Gruppen. Eine Person
       in zwei Mannschaften darf diese Summe nicht erhöhen — sonst nennt
       die Karte mehr offene Spieler, als es Menschen gibt, und die Zahl
       ist von einem echten Rückstand nicht zu unterscheiden. */
    const zeilen = [
      a(111, "s1", 9, 10), a(111, "s2", 7, 20), a(111, "s3", 7, 20),
      a(222, "s1", 4, 10),
      a(333, "s9", 5, null as unknown as number),
    ];
    const offen = offeneZuordnungen(zeilen, new Set());
    expect(offen).toHaveLength(3);
    const gruppen = gruppiereNachTeam(offen, new Map());
    expect(gruppen.reduce((n, g) => n + g.offen.length, 0)).toBe(3);
  });
});

describe("gruppiereNachTeam", () => {
  /* Dieselbe Attrappe wie oben — mit `spielzeit`, weil `spiel_aufstellung`
     sie führt. */
  const a = (person: number, team: number | null, nr: number, spielzeit = 90) =>
    ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: "s", spielzeit });

  it("gruppiert und nennt die Mannschaft beim Namen", () => {
    const offen = offeneZuordnungen([a(1, 10, 1), a(2, 10, 2), a(3, 20, 3)], new Set());
    const g = gruppiereNachTeam(offen, new Map([[10, "Herren 1"], [20, "Junioren B"]]));
    expect(g.map(x => [x.teamName, x.offen.length])).toEqual([["Herren 1", 2], ["Junioren B", 1]]);
  });

  it("fängt eine Mannschaft ab, die `teams` nicht kennt", () => {
    /* ⚠ Eine Teamnummer OHNE Namen — nicht dasselbe wie keine Nummer.
       Der Schlüssel bleibt hier `"99999"`, nur der Anzeigename fehlt:
       das ist eine fehlende Team-Zuordnung bei uns, kein fehlender Wert
       beim Verband. Die Gruppe darunter prüft den anderen Fall. */
    const g = gruppiereNachTeam(offeneZuordnungen([a(1, 99999, 1)], new Set()), new Map());
    expect(g[0].teamName).toBe(OHNE_MANNSCHAFT);
    expect(g[0].sfv_team_id).toBe(99999);
  });

  it("⚠ ⚠ eine Person ohne jede Team-Id steht in der Gruppe „-“ — und die hat ein Kästchen", () => {
    /* ⚠ ⚠  DER SCHLÜSSEL IST DIE ZUSAGE, NICHT DER NAME. Das Kästchen der
       Maske trägt `String(g.sfv_team_id ?? "-")`, und
       `alsMannschaftsliste()` filtert gegen genau diese Form. Fiele diese
       Gruppe weg oder hiesse ihr Schlüssel anders, wäre jede Person ohne
       Team-Id unerreichbar — nicht zuzuordnen und nicht zu exportieren,
       und nichts schlüge fehl.

       ⚠ `null` steht hier über einen Cast, weil `sfv_team_id` in
       `spiel_aufstellung` nullable ist (`schema.sql`): `zahl(p.teamId)`
       gibt `null`, wenn der Verband keine Mannschaft nennt — und die
       Swagger-Datei erklärt für `Player` kein einziges Pflichtfeld. */
    const offen = offeneZuordnungen([a(1, null, 3), a(1, null, 3)], new Set());
    expect(offen[0].sfv_team_id).toBeNull();

    const g = gruppiereNachTeam(offen, new Map([[10, "Herren 1"]]));
    expect(g).toHaveLength(1);
    expect(String(g[0].sfv_team_id ?? "-")).toBe("-");
    expect(g[0].teamName).toBe(OHNE_MANNSCHAFT);
  });

  /* ══════════════════════════════════════════════════════════════════
     ⚠ ⚠  JEDE PERSON IST ÜBER GENAU EIN KÄSTCHEN ERREICHBAR

     Das ist der Befund, der den Umbau ausgelöst hat — und er war nicht
     der vermutete. Erwartet war: eine Person in zwei Mannschaften steht
     unter der falschen und ist nur über das andere Kästchen zu bekommen.
     Gemessen am 24.09.2026 im Einbau: **es gibt das andere Kästchen
     unter Umständen gar nicht.** Eine Gruppe entstand nur, wenn
     irgendjemand dort seine ERSTE Zeile hatte.

     ⚠ Geprüft wird gegen `bestimmeStammteam()` — eine ZWEITE, unabhängige
     Rechnung über dieselben Zeilen. Eine Erwartung, die den Schlüssel aus
     `offeneZuordnungen()` selbst zieht, wäre nicht zu brechen: sie
     verglich die Funktion mit sich. So nennt der Fall die Autorität, und
     wer die Regel in der Warteschlange ändert, macht ihn rot.

     ⚠ Und positiv über ALLE Personen, nicht an einem Beispiel: eine
     Stichprobe an einer Person ist grün, egal welche Regel der Code
     anwendet — sie trifft zufällig in der Hälfte der Fälle.
     ══════════════════════════════════════════════════════════════════ */
  it("⚠ ⚠ jede Person der Liste steht in genau einer Gruppe, und zwar der ihres Stammteams", () => {
    /* Eine Lage, in der die alte Regel nachweislich umfällt: Person 1
       hat ihre erste Zeile bei 10 und ihr Stammteam bei 20 — und bei 20
       läuft sonst NIEMAND zuerst auf. Vorher entstand für 20 also keine
       Gruppe, und Person 1 war über kein Kästchen erreichbar. */
    const zeilen = [
      a(1, 10, 9), a(1, 20, 7), a(1, 20, 7),
      a(2, 10, 4), a(2, 10, 4),
      a(3, null, 5),
      a(4, 30, 2),
    ];
    const gruppen = gruppiereNachTeam(
      offeneZuordnungen(zeilen, new Set()),
      new Map([[10, "Herren 1"], [20, "Herren 2"], [30, "Junioren A"]]));

    /* Die Kästchen, genau in der Form, die die Maske bildet. */
    const kaestchen = gruppen.map(g => String(g.sfv_team_id ?? "-"));
    /* ⚠ Keine Dublette: zwei Gruppen mit demselben Schlüssel gäben zwei
       Kästchen für dieselbe Mannschaft, und „n von m gewählt" behauptete
       eine unvollständige Auswahl. */
    expect(new Set(kaestchen).size).toBe(kaestchen.length);

    for (const person of [1, 2, 3, 4]) {
      const meine = zeilen.filter(z => z.sfv_person_id === person);
      /* Die unabhängige Rechnung — die Autorität steht in `stammteam.ts`. */
      const erwartet = String(bestimmeStammteam(meine).sfv_team_id ?? "-");

      const drin = gruppen.filter(g => g.offen.some(o => o.sfv_person_id === person));
      expect(drin.map(g => String(g.sfv_team_id ?? "-")),
        `Person ${person} muss in GENAU EINER Gruppe stehen, und zwar in ${erwartet}`)
        .toEqual([erwartet]);
      expect(kaestchen).toContain(erwartet);
    }
  });
});

describe("baueStatistik", () => {
  const auf = (person: number, spiel: string, minuten: number) =>
    ({ sfv_person_id: person, sfv_team_id: 1, rueckennr: 9, spiel_id: spiel, spielzeit: minuten });

  it("zählt Einsätze und Minuten aus der Aufstellung", () => {
    const s = baueStatistik([auf(111, "s1", 90), auf(111, "s2", 45)], [], new Set());
    expect(s[0].einsaetze).toBe(2);
    expect(s[0].minuten).toBe(135);
  });

  it("zählt Spiele mit Verlauf getrennt", () => {
    /* Die Zahl trägt den Hinweis an der Anzeige: 14 Einsätze, aber nur 8
       davon mit erfasstem Verlauf — dann sagt eine 0 bei den Toren wenig. */
    const s = baueStatistik(
      [auf(111, "s1", 90), auf(111, "s2", 90), auf(111, "s3", 90)], [], new Set(["s1"]),
    );
    expect(s[0].einsaetze).toBe(3);
    expect(s[0].spieleMitVerlauf).toBe(1);
  });

  it("zählt Tore, Verwarnungen und Ausschlüsse", () => {
    const s = baueStatistik([auf(111, "s1", 90)], [
      { ...e({ id: "1", typ_id: TYP_TOR, sfv_person_id: 111 }), spiel_id: "s1" },
      { ...e({ id: "2", typ_id: TYP_TOR, sfv_person_id: 111 }), spiel_id: "s1" },
      { ...e({ id: "3", typ_id: TYP_VERWARNUNG, sfv_person_id: 111 }), spiel_id: "s1" },
      { ...e({ id: "4", typ_id: TYP_AUSSCHLUSS, sfv_person_id: 111 }), spiel_id: "s1" },
    ], new Set(["s1"]));
    expect(s[0]).toMatchObject({ tore: 2, verwarnungen: 1, ausschluesse: 1 });
  });

  it("⚠ ein Eigentor erhöht die Torzahl nicht — das reguläre daneben schon", () => {
    /* ⚠ Ein Eigentor ist kein persönliches Tor. Dieselbe Regel wie an
       der Aufstellungszeile (`sammleMarken()`), und über dieselbe
       Funktion — `torZusatz()` statt `subtyp_id === 2`: sonst stünde sie
       an zwei Stellen, und der Typ-Guard fiele weg.

       ⚠ Das reguläre Tor steht mit Absicht daneben. Eine Erwartung auf
       `tore: 0` allein bestünde auch dann, wenn gar nichts mehr gezählt
       würde. */
    const s = baueStatistik([auf(111, "s1", 90)], [
      { ...e({ id: "1", typ_id: TYP_TOR, sfv_person_id: 111 }), spiel_id: "s1" },
      { ...e({ id: "2", typ_id: TYP_TOR, subtyp_id: SUBTYP_EIGENTOR, sfv_person_id: 111 }), spiel_id: "s1" },
    ], new Set(["s1"]));
    expect(s[0]).toMatchObject({ tore: 1, verwarnungen: 0, ausschluesse: 0 });
  });

  it("zählt einem Gegner nichts zu", () => {
    /* Fremde Zeilen haben ohnehin keine sfv_person_id — der Constraint in
       der Datenbank erzwingt es. Hier die zweite Sicherung im Code. */
    const s = baueStatistik([auf(111, "s1", 90)], [
      { ...e({ id: "1", ist_eigener: false, sfv_person_id: null, gegner_club_name: "FC Egg" }), spiel_id: "s1" },
    ], new Set(["s1"]));
    expect(s[0].tore).toBe(0);
  });
});

describe("geaenderteFelder — was die Korrektur anfasst", () => {
  const original = { typ_id: 1, minute: 34, ist_eigener: true, sfv_person_id: 111, rueckennr: 11, gegner_club_name: null };

  it("nennt nur das geänderte Feld", () => {
    /* Wer den Torschützen korrigiert, hat zur Minute nichts gesagt — genau
       diese Liste entscheidet später den Nachzug-Vergleich. */
    const neu = { ...original, sfv_person_id: 222, rueckennr: 11 };
    expect(geaenderteFelder(original, neu)).toEqual(["sfv_person_id"]);
  });

  it("nennt mehrere, wenn mehrere abweichen", () => {
    const neu = { ...original, sfv_person_id: 222, rueckennr: 7 };
    expect(geaenderteFelder(original, neu).sort()).toEqual(["rueckennr", "sfv_person_id"]);
  });

  it("liefert leer, wenn nichts abweicht", () => {
    /* Dann speichert die Maske nicht: eine Vereins-Zeile ohne Abweichung
       verdeckte die SFV-Zeile, ohne etwas zu ändern. */
    expect(geaenderteFelder(original, { ...original })).toEqual([]);
  });

  it("behandelt null und undefined gleich", () => {
    expect(geaenderteFelder({ ...original, gegner_club_name: null }, { ...original })).toEqual([]);
  });
});

describe("beschreibeEreignis — für den Verwerfen-Dialog", () => {
  const sfv = e({ id: "s1", typ: "Tor", minute: 34, rueckennr: 11, sfv_person_id: 111 });

  it("sagt, was nach dem Verwerfen wieder gilt", () => {
    expect(beschreibeEreignis(sfv)).toBe("Tor, 34' · Nr. 11");
  });

  it("nimmt den Namen, sobald die Person zugeordnet ist", () => {
    expect(beschreibeEreignis(sfv, new Map([[111, "A. Schmid"]]))).toBe("Tor, 34' · A. Schmid");
  });

  it("nennt beim Gegner den Verein", () => {
    const fremd = e({ id: "s2", typ: "Verwarnung", minute: 57, ist_eigener: false,
                      sfv_person_id: null, rueckennr: null, gegner_club_name: "FC Egg" });
    expect(beschreibeEreignis(fremd)).toBe("Verwarnung, 57' · FC Egg");
  });
});

describe("unzugeordnetLabel", () => {
  it("nennt die Rückennummer und sagt, dass die Zuordnung fehlt", () => {
    /* Eine rohe personId ist schlechter als ein Platzhalter: sie sagt dem
       Leser nichts, sieht aber aus wie eine Auskunft — und verdeckt, dass
       hier noch etwas zu tun ist. */
    expect(unzugeordnetLabel(1)).toBe("Nr. 1 · nicht zugeordnet");
    expect(unzugeordnetLabel(27)).toBe("Nr. 27 · nicht zugeordnet");
  });

  it("kommt ohne Rückennummer aus", () => {
    expect(unzugeordnetLabel(null)).toBe("Nicht zugeordnet");
  });

  it("nennt nie eine personId", () => {
    expect(unzugeordnetLabel(9)).not.toMatch(/personId|\d{5,}/);
  });
});
