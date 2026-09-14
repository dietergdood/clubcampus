/* ══════════════════════════════════════════════════════════════════════
   Die Rohschlüssel-Probe gibt Namen heraus, keine Werte (10.09.2026)
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { schluesselVon, suchtBildfeld, schluesselTief } from "../rohschluessel.ts";

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

describe("schluesselTief — wenn eine Ebene nicht reicht", () => {
  /* ⚠ ⚠ ANLASS, 14.09.2026. `/api/common/ids` antwortete mit EINEM
     Objekt und EINEM Feldnamen: `sfv_ids`. Ein Endpunkt, der „alle
     relevanten Ids" verspricht und ein Feld liefert, ist selbst
     auffällig — das Feld ist vermutlich die ganze Struktur.

     Dieselbe Form wie der Unterfeld-Melder, der nur die oberste
     Ebene prüfte. */
  it("findet Felder, die eine Ebene tiefer liegen", () => {
    const r = schluesselTief({ sfv_ids: { seasonId: 1, clubId: 2 } });
    expect(r["sfv_ids"]).toEqual(["seasonId", "clubId"]);
  });

  it("steigt durch Listen und nennt ihre Laenge", () => {
    /* ⚠ „Eine Liste" und „eine Liste mit 340 Einträgen" sind zwei
       verschiedene Auskünfte. */
    const r = schluesselTief({ sfv_ids: { teams: [{ teamId: 1, name: "a" },
                                                   { teamId: 2, name: "b" }] } });
    expect(r["sfv_ids.teams[] (2)"]).toEqual(["teamId", "name"]);
  });

  it("gibt NIEMALS einen Wert heraus", () => {
    /* ⚠ Das ist der Grund, warum die Tiefe hier erlaubt ist und in
       `schluesselVon` nicht: ein Wert kann gar nicht mitreisen, weil
       keiner angefasst wird. */
    const roh = JSON.stringify(schluesselTief({
      sfv_ids: { geheim: "streng-vertraulich", zahl: 4711,
                 liste: [{ name: "Anna Beispiel" }] },
    }));
    expect(roh).not.toContain("streng-vertraulich");
    expect(roh).not.toContain("4711");
    expect(roh).not.toContain("Anna Beispiel");
    /* Die NAMEN dürfen erscheinen — genau danach wird gesucht. */
    expect(roh).toContain("geheim");
  });

  it("meldet den Abbruch, statt ihn zu verschweigen", () => {
    /* ⚠ Eine gekappte Struktur sähe sonst aus wie eine flache. */
    const tief = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    const r = schluesselTief(tief, 2);
    expect(JSON.stringify(r)).toContain("tiefer nicht gelesen");
  });

  it("nennt den Typ, wo eine Liste keine Objekte enthaelt", () => {
    const r = schluesselTief({ sfv_ids: { nummern: [1, 2, 3] } });
    expect(r["sfv_ids.nummern[] (3)"]).toEqual(["(number)"]);
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    const r = schluesselTief({ sfv_ids: { teams: [] } });
    expect(r["sfv_ids.teams[] (0)"]).toEqual(["(leer)"]);
  });
});
