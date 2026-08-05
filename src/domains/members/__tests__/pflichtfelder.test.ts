import { describe, it, expect } from "vitest";
import {
  FELDER_ROLLE,
  FELDER_TYP,
  IMMER_PFLICHT,
  getEffektivePflichtfelder,
  istMatrixLeer,
} from "../pflichtfelder.ts";
import type { MitgliedtypPflichtfeld } from "../../../types.ts";
import type { RollePflichtfeld } from "../pflichtfelder.ts";

const typMatrix = [
  { mitgliedtyp: "Aktivmitglied",    feld: "geburtsdatum", pflicht: true },
  { mitgliedtyp: "Aktivmitglied",    feld: "strasse",      pflicht: true },
  { mitgliedtyp: "Aktivmitglied",    feld: "plz",          pflicht: true },
  { mitgliedtyp: "Aktivmitglied",    feld: "ort",          pflicht: true },
  { mitgliedtyp: "Aktivmitglied",    feld: "email",        pflicht: true },
  { mitgliedtyp: "Juniorenmitglied", feld: "geburtsdatum", pflicht: true },
  { mitgliedtyp: "Juniorenmitglied", feld: "telefon",      pflicht: true },
  /* abgewähltes Feld — zählt nicht */
  { mitgliedtyp: "Juniorenmitglied", feld: "email",        pflicht: false },
] as unknown as MitgliedtypPflichtfeld[];

const rolleMatrix: RollePflichtfeld[] = [
  { rolle: "spieler", feld: "ahv_nr",      pflicht: true },
  { rolle: "spieler", feld: "spielerpass", pflicht: true },
  { rolle: "trainer", feld: "js_nr",       pflicht: true },
];

describe("getEffektivePflichtfelder", () => {
  it("liest die Mitgliedtyp-Matrix", () => {
    const f = getEffektivePflichtfelder({ mitgliedtyp: "Aktivmitglied", typMatrix });
    expect(f).toEqual(["geburtsdatum", "strasse", "plz", "ort", "email"]);
  });

  it("übergeht Einträge mit pflicht=false", () => {
    const f = getEffektivePflichtfelder({ mitgliedtyp: "Juniorenmitglied", typMatrix });
    expect(f).not.toContain("email");
    expect(f).toEqual(["geburtsdatum", "telefon"]);
  });

  it("ergänzt die Rollen-Zusatzfelder nur wenn eine Rolle übergeben wird", () => {
    const ohne = getEffektivePflichtfelder({ mitgliedtyp: "Aktivmitglied", typMatrix, rolleMatrix });
    expect(ohne).not.toContain("spielerpass");

    const mit = getEffektivePflichtfelder({
      mitgliedtyp: "Aktivmitglied", rolle: "spieler", typMatrix, rolleMatrix,
    });
    expect(mit).toContain("spielerpass");
    expect(mit).toContain("ahv_nr");
    expect(mit).not.toContain("js_nr");
  });

  it("liefert jedes Feld nur einmal", () => {
    const doppelt = [
      ...typMatrix,
      { mitgliedtyp: "Aktivmitglied", feld: "strasse", pflicht: true },
    ] as unknown as MitgliedtypPflichtfeld[];
    const f = getEffektivePflichtfelder({ mitgliedtyp: "Aktivmitglied", typMatrix: doppelt });
    expect(f.filter(x => x === "strasse")).toHaveLength(1);
  });

  it("ohne Mitgliedtyp leer", () => {
    expect(getEffektivePflichtfelder({ mitgliedtyp: "", typMatrix })).toEqual([]);
    expect(getEffektivePflichtfelder({ mitgliedtyp: null, typMatrix })).toEqual([]);
  });

  it("KEINE Rückfallliste: unbekannter Typ liefert leer statt einer Basisliste", () => {
    expect(getEffektivePflichtfelder({ mitgliedtyp: "Pausenmitglied", typMatrix })).toEqual([]);
  });

  it("enthält vorname/nachname nicht — die sind immer Pflicht", () => {
    const f = getEffektivePflichtfelder({ mitgliedtyp: "Aktivmitglied", typMatrix });
    for (const feld of IMMER_PFLICHT) expect(f).not.toContain(feld);
  });

  it("sortiert nach der Reihenfolge der Feldlisten, unbekannte Felder hinten", () => {
    const wild = [
      { mitgliedtyp: "X", feld: "zzz_unbekannt", pflicht: true },
      { mitgliedtyp: "X", feld: "telefon",       pflicht: true },
      { mitgliedtyp: "X", feld: "geburtsdatum",  pflicht: true },
    ] as unknown as MitgliedtypPflichtfeld[];
    expect(getEffektivePflichtfelder({ mitgliedtyp: "X", typMatrix: wild }))
      .toEqual(["geburtsdatum", "telefon", "zzz_unbekannt"]);
  });
});

describe("istMatrixLeer", () => {
  it("erkennt einen Typ ohne jede Konfiguration", () => {
    expect(istMatrixLeer("Pausenmitglied", typMatrix)).toBe(true);
    expect(istMatrixLeer("Aktivmitglied", typMatrix)).toBe(false);
  });

  it("wertet nur gesetzte Häkchen — pflicht=false zählt als leer", () => {
    const nurAus = [
      { mitgliedtyp: "Supporter", feld: "email", pflicht: false },
    ] as unknown as MitgliedtypPflichtfeld[];
    expect(istMatrixLeer("Supporter", nurAus)).toBe(true);
  });
});

describe("Feldlisten", () => {
  it("führen keine groben Schlüssel mehr", () => {
    for (const liste of [FELDER_TYP, FELDER_ROLLE]) {
      expect(liste).not.toContain("adresse");
      expect(liste).not.toContain("vorname_nachname");
    }
  });

  it("die Mitgliedtyp-Matrix bietet die Adressteile einzeln an", () => {
    for (const feld of ["strasse", "plz", "ort"]) {
      expect(FELDER_TYP as readonly string[]).toContain(feld);
    }
  });
});
