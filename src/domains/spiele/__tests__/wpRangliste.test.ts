/**
 * Die Ranglisten-Nutzlast.
 *
 * ⚠ Der Vertrag steht drüben in `themes/fch/inc/rangtabelle.php` und ist
 * am 09.09.2026 gemessen worden. Diese Datei hält ihn von dieser Seite
 * fest — vor allem die zwei Stellen, an denen er leicht kippt: die
 * Differenz, die NICHT mitgeschickt wird, und `sfv_team_id`, ohne die der
 * Empfänger die Gruppe nicht findet.
 */
import { describe, it, expect } from "vitest";
import { baueGruppen, wiegeGruppen, beurteileBestand } from "../wpRangliste.ts";
import type { RanglisteZeile } from "../wpRangliste.ts";

function zeile(teil: Partial<RanglisteZeile> & { sfv_team_id: number }): RanglisteZeile {
  return {
    sfv_saison_id: 2026, sfv_liga_id: 401, sfv_liga_name: "Junioren C",
    sfv_division_id: 0, sfv_division_name: null,
    sfv_gruppe_id: 900, sfv_gruppe: "Gruppe 3",
    team_name: "FC Irgendwo", position: 1, anzahl_spiele: 9, siege: 5,
    unentschieden: 2, niederlagen: 2, tore: 20, gegentore: 12, punkte: 17,
    fairplay_punkte: 3, stand_vom: "2026-09-09T18:00:00+02:00",
    ...teil,
  };
}

const UNSERE = new Set(["38309"]);

describe("baueGruppen — der Vertrag mit der Vorlage", () => {
  it("bildet die elf Schlüssel, die die Vorlage liest", () => {
    const [g] = baueGruppen([zeile({ sfv_team_id: 38309, team_name: "FC Herrliberg a" })], UNSERE);
    expect(Object.keys(g.zeilen[0]).sort()).toEqual([
      "fair", "ist_wir", "niederlagen", "punkte", "rang", "sfv_team_id",
      "siege", "spiele", "team", "tore_minus", "tore_plus", "unentschieden",
    ]);
  });

  it("schickt KEINE Tordifferenz mit", () => {
    /* ⚠ Die Vorlage rechnet sie aus tore_plus - tore_minus. Eine
       mitgeschickte wäre eine zweite Wahrheit — belegt am 09.09.2026:
       eine gelieferte `differenz: 99` erschien nicht auf der Seite. */
    const [g] = baueGruppen([zeile({ sfv_team_id: 38309 })], UNSERE);
    expect(g.zeilen[0]).not.toHaveProperty("differenz");
    expect(g.zeilen[0]).not.toHaveProperty("diff");
    expect(g.zeilen[0]).not.toHaveProperty("tordifferenz");
  });

  it("benennt die Felder um, wie die Vorlage sie erwartet", () => {
    const [g] = baueGruppen([zeile({
      sfv_team_id: 38309, position: 4, anzahl_spiele: 11,
      fairplay_punkte: 6, tore: 23, gegentore: 17,
    })], UNSERE);
    expect(g.zeilen[0].rang).toBe(4);
    expect(g.zeilen[0].spiele).toBe(11);
    expect(g.zeilen[0].fair).toBe(6);
    expect(g.zeilen[0].tore_plus).toBe(23);
    expect(g.zeilen[0].tore_minus).toBe(17);
  });

  it("trägt sfv_team_id — sonst findet der Empfänger die Gruppe nicht", () => {
    /* `fch_cc_rangliste_fuer_team()` vergleicht genau diesen Schlüssel
       (wp-export-empfaenger.php:1217). Ohne ihn liegt die Rangliste in der
       Ablage und die Seite bleibt leer — ohne Fehler. */
    const [g] = baueGruppen([zeile({ sfv_team_id: 38309 })], UNSERE);
    expect(g.zeilen[0].sfv_team_id).toBe(38309);
  });

  it("markiert genau die eigene Zeile", () => {
    const [g] = baueGruppen([
      zeile({ sfv_team_id: 37931, position: 1 }),
      zeile({ sfv_team_id: 38309, position: 2 }),
    ], UNSERE);
    expect(g.zeilen.map((r) => r.ist_wir)).toEqual([false, true]);
  });

  it("sortiert nach Rang, nicht nach Reihenfolge der Datenbank", () => {
    const [g] = baueGruppen([
      zeile({ sfv_team_id: 38309, position: 3 }),
      zeile({ sfv_team_id: 37931, position: 1 }),
      zeile({ sfv_team_id: 37932, position: 2 }),
    ], UNSERE);
    expect(g.zeilen.map((r) => r.rang)).toEqual([1, 2, 3]);
  });

  it("lässt eine Gruppe ohne eigene Mannschaft ganz weg", () => {
    /* Sie hätte drüben keinen Leser — die Vorlage sucht über die eigene
       Teamnummer — und liesse die Ablage wachsen für nichts. */
    const gruppen = baueGruppen([
      zeile({ sfv_team_id: 11111, sfv_gruppe_id: 901 }),
      zeile({ sfv_team_id: 38309, sfv_gruppe_id: 900 }),
    ], UNSERE);
    expect(gruppen.map((g) => g.sfv_gruppe_id)).toEqual([900]);
  });

  it("macht aus null eine 0 statt aus einer Lücke einen leeren Platz", () => {
    const [g] = baueGruppen([zeile({ sfv_team_id: 38309, punkte: null, tore: null })], UNSERE);
    expect(g.zeilen[0].punkte).toBe(0);
    expect(g.zeilen[0].tore_plus).toBe(0);
  });
});

describe("wiegeGruppen — zählen statt eine Schwelle erfinden", () => {
  it("nennt Gruppen, Zeilen und Bytes", () => {
    const gruppen = baueGruppen([
      zeile({ sfv_team_id: 38309, position: 1 }),
      zeile({ sfv_team_id: 37931, position: 2 }),
    ], UNSERE);
    const w = wiegeGruppen(gruppen);
    expect(w.gruppen).toBe(1);
    expect(w.zeilen).toBe(2);
    expect(w.groesste_gruppe).toBe(2);
    expect(w.bytes).toBeGreaterThan(100);
  });

  it("wiegt eine leere Menge mit 2 Bytes und nicht mit nichts", () => {
    /* `[]` ist zwei Zeichen — und eine Zahl, die bei nichts fehlt statt 2
       zu sein, sieht aus wie ein ausgefallener Zähler. */
    expect(wiegeGruppen([]).bytes).toBe(2);
    expect(wiegeGruppen([]).gruppen).toBe(0);
  });
});

describe("beurteileBestand — das Wachstum, das niemand sieht", () => {
  it("schweigt, wenn der Lauf alles geliefert hat, was drüben liegt", () => {
    expect(beurteileBestand(21, 21)).toEqual({ alt: 0, hinweis: null });
  });

  it("meldet Gruppen, die dieser Lauf nicht kennt", () => {
    /* ⚠ Der Empfänger ersetzt nur gelieferte Gruppen und entfernt nie
       eine. Nach einem Saisonwechsel bleiben die alten für immer liegen —
       das ist das Wachstum, nach dem gefragt wurde, und es ist ohne jede
       Byte-Schwelle zu sehen. */
    const b = beurteileBestand(21, 42);
    expect(b.alt).toBe(21);
    expect(b.hinweis).toMatch(/21 Gruppe\(n\)/);
    expect(b.hinweis).toMatch(/entfernt nie eine/);
  });

  it("wird bei einem kleineren Bestand nicht negativ", () => {
    expect(beurteileBestand(21, 3).alt).toBe(0);
  });
});
