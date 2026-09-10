/* ══════════════════════════════════════════════════════════════════════
   Die Rohschlüssel-Probe gibt Namen heraus, keine Werte (11.09.2026)
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { schluesselVon, suchtBildfeld } from "../rohschluessel.ts";

const TEAM = {
  teamId: 38309, teamName: "Junioren Ca", clubNumber: 11057,
  teamLeagueName: "Junioren C", logoUrl: "https://example.invalid/w.gif",
};

describe("schluesselVon", () => {
  it("nennt die Schlüssel des ersten Objekts in seiner Reihenfolge", () => {
    const b = schluesselVon([TEAM]);
    expect(b.erstes).toEqual(["teamId", "teamName", "clubNumber", "teamLeagueName", "logoUrl"]);
  });

  it("⚠ gibt KEINEN Wert heraus", () => {
    /* Die eine Zusage, an der alles hängt. Ein Werte-Ausgang wäre wieder
       ein Ausgang, den jemand prüfen muss. */
    const roh = JSON.stringify(schluesselVon([TEAM]));
    expect(roh).not.toContain("38309");
    expect(roh).not.toContain("Junioren Ca");
    expect(roh).not.toContain("example.invalid");
  });

  it("⚠ meldet Schlüssel, die NICHT in jedem Objekt stehen", () => {
    /* Der interessante Teil: ein Feld, das nur manchmal kommt, ist genau
       das, was eine Stichprobe von einem übersieht. */
    const b = schluesselVon([TEAM, { teamId: 1, teamName: "X", clubNumber: 2, teamLeagueName: "Y" }]);
    expect(b.anzahl).toBe(2);
    expect(b.nicht_ueberall).toEqual(["logoUrl"]);
  });

  it("nennt verschachtelte Objekte eine Ebene tief", () => {
    const b = schluesselVon([{ id: 1, teams: [{ a: 1, b: 2 }], meta: { x: 1 } }]);
    expect(b.verschachtelt["teams[]"]).toEqual(["a", "b"]);
    expect(b.verschachtelt["meta{}"]).toEqual(["x"]);
  });

  it("⚠ eine leere Antwort ergibt einen leeren Befund, keinen Fehler", () => {
    expect(schluesselVon([])).toMatchObject({ anzahl: 0, erstes: [], alle: [] });
    expect(schluesselVon(null)).toMatchObject({ anzahl: 0 });
  });

  it("nimmt auch ein einzelnes Objekt statt einer Liste", () => {
    expect(schluesselVon(TEAM).anzahl).toBe(1);
  });
});

describe("suchtBildfeld", () => {
  it("findet ein Feld, das nach einem Bild aussieht", () => {
    const t = suchtBildfeld(schluesselVon([TEAM]));
    expect(t).toMatch(/Treffer: logoUrl/);
    /* ⚠ Und sagt dazu, dass der Wert hier nicht steht — sonst fragt als
       nächstes jemand, warum die Adresse fehlt. */
    expect(t).toMatch(/steht hier NICHT/);
  });

  it("findet es auch eine Ebene tiefer, mit Pfad", () => {
    const b = schluesselVon([{ id: 1, teams: [{ teamId: 1, pictureUrl: "x" }] }]);
    expect(suchtBildfeld(b)).toMatch(/teams\[\]\.pictureUrl/);
  });

  it("sagt klar, wenn keines da ist — und woher die Auskunft stammt", () => {
    const b = schluesselVon([{ teamId: 1, teamName: "X" }]);
    const t = suchtBildfeld(b);
    expect(t).toMatch(/Kein Schlüssel/);
    expect(t).toMatch(/nicht aus dem Schema abgeleitet/);
  });

  it('⚠ unterscheidet „nichts gefunden" von „nichts geprüft"', () => {
    /* Eine leere Antwort und eine Antwort ohne Bildfeld sehen in einer
       Zahlenreihe gleich aus. Ohne diesen Satz läse jemand den ersten
       Fall als Befund. */
    expect(suchtBildfeld(schluesselVon([]))).toMatch(/sagt nichts/);
  });
});
