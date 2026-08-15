/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/spielMapper.test.ts
   Die reine Abbildung DB → Anzeige für Spielplan und Rangliste.

   Schwerpunkte: die Saisongrenze (der alte Code klebte fest "2026-"
   vor jedes Datum), das Resultat nur bei ausgetragenen Spielen, und
   dass „wir" in der Tabelle über die SFV-Zuordnung erkannt wird —
   nicht über den Namen, denn fünf SFV-Teams des FCH heissen gleich.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  aktuelleSfvSaison, saisonZeitraum, formatDatum, mapSpiel, sortiereSpiele,
  gruppeFuerTeam, mapRangliste, sfvTeamIdFuer,
} from "../spielMapper.ts";
import type { SpielZeile, RanglisteZeile } from "../spielMapper.ts";

const spiel = (f: Partial<SpielZeile>): SpielZeile =>
  ({ id: "s1", team: "1. Mannschaft", date: "2026-08-12", zeit: "20:00:00",
     gegner: "FC Horgen", heimspiel: true, status: "ausgetragen", resultat: "3:2",
     sfv_status: 2, sfv_spiel_typ: 1, ...f } as unknown as SpielZeile);

const rang = (f: Partial<RanglisteZeile>): RanglisteZeile =>
  ({ sfv_liga_id: 13010, sfv_division_id: 0, sfv_gruppe_id: 2, sfv_team_id: 1,
     position: 1, team_name: "X", anzahl_spiele: 10, siege: 5, unentschieden: 2,
     niederlagen: 3, tore: 20, gegentore: 12, punkte: 17, ...f } as unknown as RanglisteZeile);

describe("Saison", () => {
  it("benennt die Saison nach dem Endjahr", () => {
    expect(aktuelleSfvSaison(new Date("2026-08-15"))).toBe(2027);
    expect(aktuelleSfvSaison(new Date("2027-02-01"))).toBe(2027);
  });

  it("wechselt am 1. Juli, nicht am 1. Januar", () => {
    expect(aktuelleSfvSaison(new Date("2026-06-30"))).toBe(2026);
    expect(aktuelleSfvSaison(new Date("2026-07-01"))).toBe(2027);
  });

  it("spannt den Zeitraum von Juli bis Juni", () => {
    expect(saisonZeitraum(2027)).toEqual({ von: "2026-07-01", bis: "2027-06-30" });
  });
});

describe("mapSpiel", () => {
  it("trennt Datum und Zeit für die Anzeige", () => {
    const s = mapSpiel(spiel({ date: "2026-08-12", zeit: "20:00:00" }));
    expect(s.date).toBe("Mi 12.08.");
    expect(s.time).toBe("20:00");
    expect(s.iso).toBe("2026-08-12");
  });

  /* Der alte Code rechnete den Anzeigetext zurück und klebte fest "2026-"
     davor — über den Jahreswechsel hätte das falsch sortiert. */
  it("führt das echte Jahr mit, auch über den Jahreswechsel", () => {
    expect(mapSpiel(spiel({ date: "2027-03-06" })).iso).toBe("2027-03-06");
    expect(formatDatum("2027-03-06")).toBe("Sa 06.03.");
  });

  it("übernimmt kein Resultat, wenn keines gespeichert ist", () => {
    expect(mapSpiel(spiel({ resultat: null, sfv_status: 1 })).result).toBeNull();
  });

  it("erkennt Trainingsspiele über die Kennzahl, nicht über den Text", () => {
    expect(mapSpiel(spiel({ sfv_spiel_typ: 3 })).trainingsspiel).toBe(true);
    expect(mapSpiel(spiel({ sfv_spiel_typ: 1 })).trainingsspiel).toBe(false);
  });

  it("erkennt abgesagte und verschobene Spiele", () => {
    expect(mapSpiel(spiel({ sfv_status: 10 })).abgesagt).toBe(true);
    expect(mapSpiel(spiel({ sfv_status: 6 })).verschoben).toBe(true);
    expect(mapSpiel(spiel({ sfv_status: 6 })).abgesagt).toBe(false);
  });

  /* Manuell erfasste Spiele haben keine SFV-Kennzahl. */
  it("erkennt eine Absage auch am Klartext", () => {
    expect(mapSpiel(spiel({ sfv_status: null, status: "Abgesagt" })).abgesagt).toBe(true);
  });

  it("führt keine Matchdaten — dafür gibt es keine Tabelle", () => {
    expect(mapSpiel(spiel({})).stats).toBeNull();
  });
});

describe("sortiereSpiele", () => {
  it("stellt gespielte vor kommende, beide nach Datum", () => {
    const s = sortiereSpiele([
      mapSpiel(spiel({ id: "b", date: "2026-09-01", resultat: null })),
      mapSpiel(spiel({ id: "a", date: "2026-08-20", resultat: null })),
      mapSpiel(spiel({ id: "d", date: "2026-08-12", resultat: "3:2" })),
      mapSpiel(spiel({ id: "c", date: "2026-08-05", resultat: "1:1" })),
    ]);
    expect(s.map((x) => x.id)).toEqual(["c", "d", "a", "b"]);
  });
});

describe("gruppeFuerTeam", () => {
  const zeilen = [
    rang({ sfv_gruppe_id: 2, sfv_team_id: 38301, position: 2, team_name: "FC Herrliberg 1" }),
    rang({ sfv_gruppe_id: 2, sfv_team_id: 38134, position: 1, team_name: "FC Stäfa" }),
    rang({ sfv_gruppe_id: 6, sfv_team_id: 38302, position: 1, team_name: "FC Herrliberg 2" }),
  ];

  it("liefert nur die Gruppe des Teams, nach Rang sortiert", () => {
    const g = gruppeFuerTeam(zeilen, 38301);
    expect(g.map((z) => z.team_name)).toEqual(["FC Stäfa", "FC Herrliberg 1"]);
  });

  it("liefert nichts ohne Zuordnung", () => {
    expect(gruppeFuerTeam(zeilen, null)).toEqual([]);
  });

  it("liefert nichts, wenn die Nummer in dieser Saison fehlt", () => {
    expect(gruppeFuerTeam(zeilen, 99999)).toEqual([]);
  });
});

describe("sfvTeamIdFuer", () => {
  const teams = [
    { name: "1. Mannschaft", sfv_team_id: 38301 },
    { name: "2. Mannschaft", sfv_team_id: 38302 },
    { name: "Frauen 1", sfv_team_id: null },
  ];

  it("findet die SFV-Nummer über den ClubCampus-Namen", () => {
    expect(sfvTeamIdFuer(teams, "2. Mannschaft")).toBe(38302);
  });

  it("liefert null für ein Team ohne Zuordnung", () => {
    expect(sfvTeamIdFuer(teams, "Frauen 1")).toBeNull();
  });

  it("liefert null für ein unbekanntes oder fehlendes Team", () => {
    expect(sfvTeamIdFuer(teams, "Senioren")).toBeNull();
    expect(sfvTeamIdFuer(teams, null)).toBeNull();
    expect(sfvTeamIdFuer([], "1. Mannschaft")).toBeNull();
  });
});

describe("mapRangliste", () => {
  it("setzt Tore zusammen und rechnet die Differenz", () => {
    const [z] = mapRangliste([rang({ tore: 78, gegentore: 30 })], null);
    expect(z.tore).toBe("78:30");
    expect(z.diff).toBe(48);
  });

  it("erkennt das eigene Team über die SFV-Nummer, nicht über den Namen", () => {
    const zeilen = mapRangliste([
      rang({ sfv_team_id: 38301, team_name: "FC Herrliberg 1" }),
      rang({ sfv_team_id: 38999, team_name: "FC Herrliberg 1" }),
    ], 38301);
    expect(zeilen.map((z) => z.me)).toEqual([true, false]);
  });

  it("markiert niemanden, solange keine Zuordnung besteht", () => {
    expect(mapRangliste([rang({})], null)[0].me).toBe(false);
  });
});
