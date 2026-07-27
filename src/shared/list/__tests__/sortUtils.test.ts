/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/__tests__/sortUtils.test.ts
   Unit-Tests für die Stufensortierung
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { sortiereMehrstufig } from "../sortUtils.ts";
import type { SortDef } from "../types.ts";

/* Team + Name bewusst so gewählt, dass eine einstufige Sortierung die
   Reihenfolge der jeweils anderen Spalte nicht schon miterledigt. */
const zeilen = [
  { id: 1, team: "B", name: "Meier" },
  { id: 2, team: "A", name: "Zumbrunn" },
  { id: 3, team: "B", name: "Aebi" },
  { id: 4, team: "A", name: "Meier" },
];

type Zeile = typeof zeilen[number];

const paare = (rows: Zeile[]) => rows.map(r => `${r.team}/${r.name}`);

describe("sortiereMehrstufig — Standardvergleich", () => {
  it("sortiert einstufig wie bisher", () => {
    const result = sortiereMehrstufig(zeilen, [{ key: "name", dir: "asc" }]);
    expect(result.map(r => r.name)).toEqual(["Aebi", "Meier", "Meier", "Zumbrunn"]);
  });

  it("sortiert nach zweiter Ebene innerhalb der ersten", () => {
    const defs: SortDef[] = [{ key: "team", dir: "asc" }, { key: "name", dir: "asc" }];
    expect(paare(sortiereMehrstufig(zeilen, defs))).toEqual(["A/Meier", "A/Zumbrunn", "B/Aebi", "B/Meier"]);
  });

  it("beachtet die Richtung je Ebene getrennt", () => {
    const defs: SortDef[] = [{ key: "team", dir: "asc" }, { key: "name", dir: "desc" }];
    expect(paare(sortiereMehrstufig(zeilen, defs))).toEqual(["A/Zumbrunn", "A/Meier", "B/Meier", "B/Aebi"]);
  });

  it("liefert die Zeilen unveraendert zurueck, wenn keine Ebene gesetzt ist", () => {
    expect(sortiereMehrstufig(zeilen, [{ key: "", dir: "asc" }])).toBe(zeilen);
  });

  it("mutiert die Eingabe nicht", () => {
    const vorher = [...zeilen];
    sortiereMehrstufig(zeilen, [{ key: "team", dir: "desc" }, { key: "name", dir: "asc" }]);
    expect(zeilen).toEqual(vorher);
  });
});

/* Der Kern der Umsetzung: die einstufige sortFn der Module (sortMembers
   & Co.) bleibt unveraendert — die Mehrstufigkeit entsteht allein aus
   der stabilen Anwendung von hinten nach vorne. Die sortFn hier ist
   bewusst nachgebaut statt importiert: shared/ darf nicht aus modules/
   importieren (Schichtenregel). */
const einstufigeSortFn = (rows: Zeile[], key: string, dir: "asc" | "desc"): Zeile[] =>
  [...rows].sort((a, b) => {
    const av = String(a[key as keyof Zeile] ?? "");
    const bv = String(b[key as keyof Zeile] ?? "");
    return dir === "asc" ? av.localeCompare(bv, "de") : bv.localeCompare(av, "de");
  });

describe("sortiereMehrstufig — mit modulspezifischer sortFn", () => {
  it("wendet die Ebenen so an, dass die feinere innerhalb der groeberen greift", () => {
    const defs: SortDef[] = [{ key: "team", dir: "asc" }, { key: "name", dir: "asc" }];
    expect(paare(sortiereMehrstufig(zeilen, defs, einstufigeSortFn)))
      .toEqual(["A/Meier", "A/Zumbrunn", "B/Aebi", "B/Meier"]);
  });

  it("kombiniert gegenlaeufige Richtungen korrekt", () => {
    const defs: SortDef[] = [{ key: "team", dir: "desc" }, { key: "name", dir: "asc" }];
    expect(paare(sortiereMehrstufig(zeilen, defs, einstufigeSortFn)))
      .toEqual(["B/Aebi", "B/Meier", "A/Meier", "A/Zumbrunn"]);
  });

  it("entspricht bei einer Ebene exakt der sortFn allein", () => {
    const mehrstufig = sortiereMehrstufig(zeilen, [{ key: "name", dir: "asc" }], einstufigeSortFn);
    expect(mehrstufig).toEqual(einstufigeSortFn(zeilen, "name", "asc"));
  });

  it("ergibt dasselbe wie der eingebaute Vergleich", () => {
    const defs: SortDef[] = [{ key: "team", dir: "asc" }, { key: "name", dir: "desc" }];
    expect(sortiereMehrstufig(zeilen, defs, einstufigeSortFn)).toEqual(sortiereMehrstufig(zeilen, defs));
  });
});
