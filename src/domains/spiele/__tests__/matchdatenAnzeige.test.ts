import { describe, it, expect } from "vitest";
import {
  baueStatistik, gruppiereNachTeam, hatVerlauf, mischeEreignisse,
  offeneZuordnungen, TYP_AUSSCHLUSS, TYP_TOR, TYP_VERWARNUNG,
  beschreibeEreignis, geaenderteFelder, unzugeordnetLabel,
} from "../matchdatenAnzeige.ts";
import type { EreignisZeile } from "../matchdatenAnzeige.ts";

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
  const a = (person: number, spiel: string, nr: number | null, team = 1) =>
    ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: spiel });

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
});

describe("gruppiereNachTeam", () => {
  it("gruppiert und nennt die Mannschaft beim Namen", () => {
    const offen = offeneZuordnungen([
      { sfv_person_id: 1, sfv_team_id: 10, rueckennr: 1, spiel_id: "s" },
      { sfv_person_id: 2, sfv_team_id: 10, rueckennr: 2, spiel_id: "s" },
      { sfv_person_id: 3, sfv_team_id: 20, rueckennr: 3, spiel_id: "s" },
    ], new Set());
    const g = gruppiereNachTeam(offen, new Map([[10, "Herren 1"], [20, "Junioren B"]]));
    expect(g.map(x => [x.teamName, x.offen.length])).toEqual([["Herren 1", 2], ["Junioren B", 1]]);
  });

  it("fängt eine unbekannte Mannschaft ab", () => {
    const offen = offeneZuordnungen(
      [{ sfv_person_id: 1, sfv_team_id: null, rueckennr: 1, spiel_id: "s" }], new Set());
    expect(gruppiereNachTeam(offen, new Map())[0].teamName).toBe("Ohne Mannschaft");
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
