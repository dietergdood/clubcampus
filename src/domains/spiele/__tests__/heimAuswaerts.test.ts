import { describe, it, expect } from "vitest";
import { heimAuswaertsBilanz, leseResultat } from "../heimAuswaerts.ts";
import type { SpielUi } from "../spielMapper.ts";

/* Die Attrappe traegt den vollen Typ. Kommt ein Feld dazu, faellt es hier
   auf, statt still als `undefined` durch die Rechnung zu laufen. */
function spiel(teil: Partial<SpielUi>): SpielUi {
  return {
    id: "x", team: "1. Mannschaft", date: "Sa 24.05.", iso: "2026-05-24",
    time: "16:00", opponent: "FC Gegner", home: true, sfvGegnerTeamId: null,
    venue: "", venueAddr: "", comp: "Meisterschaft", liga: "2. Liga",
    spielNr: "", status: "ausgetragen", result: null, htResult: null,
    att: null, schiedsrichter: "", delegierter: "", notes: "", treffpunkt: "",
    stats: null, trainingsspiel: false, abgesagt: false, verschoben: false,
    meisterschaft: true, ausgetragen: true,
    ...teil,
  };
}

describe("leseResultat", () => {
  it("liest Heim:Gast als Zahlenpaar", () => {
    expect(leseResultat("3:1")).toEqual([3, 1]);
    expect(leseResultat(" 0 : 0 ")).toEqual([0, 0]);
  });

  it("gibt null statt eines erfundenen 0:0", () => {
    for (const roh of [null, "", "3", "3:1:2", "a:b", "-1:2", "3.5:1"]) {
      expect(leseResultat(roh)).toBeNull();
    }
  });
});

describe("heimAuswaertsBilanz", () => {
  it("zaehlt einen Heimsieg auf der Heimseite, mit drei Punkten", () => {
    const { heim, auswaerts } = heimAuswaertsBilanz([
      spiel({ home: true, result: "3:1" }),
    ]);
    expect(heim).toEqual({ sp: 1, s: 1, u: 0, n: 0, tore: 3, gegentore: 1, diff: 2, pts: 3 });
    expect(auswaerts.sp).toBe(0);
  });

  /* ⚠ Der Fall, der die ganze Rechnung traegt. `resultat` steht in der
     Reihenfolge des Verbands (Heim:Gast) — auswaerts ist unsere Zahl die
     ZWEITE. Wer `home` uebergeht, macht aus diesem 1:4 einen Sieg. */
  it("dreht bei einem Auswaertsspiel die Torreihenfolge: 1:4 ist ein Sieg fuer uns", () => {
    const { auswaerts, heim } = heimAuswaertsBilanz([
      spiel({ home: false, result: "1:4" }),
    ]);
    expect(auswaerts).toEqual({ sp: 1, s: 1, u: 0, n: 0, tore: 4, gegentore: 1, diff: 3, pts: 3 });
    expect(heim.sp).toBe(0);
  });

  it("zaehlt eine Auswaertsniederlage als Niederlage, nicht als Sieg", () => {
    const { auswaerts } = heimAuswaertsBilanz([spiel({ home: false, result: "4:1" })]);
    expect(auswaerts).toEqual({ sp: 1, s: 0, u: 0, n: 1, tore: 1, gegentore: 4, diff: -3, pts: 0 });
  });

  it("gibt einem Unentschieden je einen Punkt, heim wie auswaerts", () => {
    const { heim, auswaerts } = heimAuswaertsBilanz([
      spiel({ home: true, result: "2:2" }),
      spiel({ home: false, result: "0:0" }),
    ]);
    expect(heim.u).toBe(1);
    expect(heim.pts).toBe(1);
    expect(auswaerts.u).toBe(1);
    expect(auswaerts.pts).toBe(1);
  });

  it("laesst nicht ausgetragene Spiele draussen, auch mit Resultat", () => {
    const { gesamt } = heimAuswaertsBilanz([
      spiel({ result: "3:0", ausgetragen: false }),
      spiel({ result: null }),
    ]);
    expect(gesamt.sp).toBe(0);
  });

  it("zaehlt nur Meisterschaft — Cup und Trainingsspiel bleiben draussen", () => {
    const { gesamt } = heimAuswaertsBilanz([
      spiel({ result: "5:0", meisterschaft: false, comp: "Cup" }),
      spiel({ result: "5:0", meisterschaft: false, trainingsspiel: true }),
      spiel({ result: "1:0" }),
    ]);
    expect(gesamt.sp).toBe(1);
    expect(gesamt.tore).toBe(1);
  });

  it("ueberspringt ein unlesbares Resultat, statt ein 0:0 zu erfinden", () => {
    const { gesamt } = heimAuswaertsBilanz([spiel({ result: "abgebrochen" })]);
    expect(gesamt).toEqual({ sp: 0, s: 0, u: 0, n: 0, tore: 0, gegentore: 0, diff: 0, pts: 0 });
  });

  it("summiert gesamt aus beiden Haelften", () => {
    const { heim, auswaerts, gesamt } = heimAuswaertsBilanz([
      spiel({ home: true, result: "3:1" }),
      spiel({ home: true, result: "0:2" }),
      spiel({ home: false, result: "1:1" }),
      spiel({ home: false, result: "2:5" }),
    ]);
    expect(heim).toEqual({ sp: 2, s: 1, u: 0, n: 1, tore: 3, gegentore: 3, diff: 0, pts: 3 });
    expect(auswaerts).toEqual({ sp: 2, s: 1, u: 1, n: 0, tore: 6, gegentore: 3, diff: 3, pts: 4 });
    expect(gesamt).toEqual({ sp: 4, s: 2, u: 1, n: 1, tore: 9, gegentore: 6, diff: 3, pts: 7 });
  });

  it("gibt fuer eine leere Liste ueberall Null zurueck", () => {
    const { heim, auswaerts, gesamt } = heimAuswaertsBilanz([]);
    for (const b of [heim, auswaerts, gesamt]) {
      expect(b).toEqual({ sp: 0, s: 0, u: 0, n: 0, tore: 0, gegentore: 0, diff: 0, pts: 0 });
    }
  });
});
