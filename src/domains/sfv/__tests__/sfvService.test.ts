/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/sfvService.test.ts
   Die reine Logik der SFV-Team-Zuordnung.

   Schwerpunkte: die Zuordnung wird gegen die Saisonliste des SFV
   gebildet, nicht gegen die gespeicherten Werte — und ein Team,
   dessen SFV-Nummer es nicht mehr gibt, darf nicht als „frei"
   erscheinen. Sonst überschreibt man eine Zuordnung, ohne es zu
   merken.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { baueZuordnung, auswahlFuer, leseNamenAntwort } from "../sfvService.ts";
import type { NamenAntwort } from "../sfvService.ts";
import type { SfvTeam } from "../sfvService.ts";
import type { Team } from "../../../types.ts";

const sfv = (id: number, name: string): SfvTeam => ({
  sfv_team_id: id, name, voller_name: name, liga_id: 13010,
  liga_name: "2. Liga", division: "-", aktiv: true,
});

/* Tables<'teams'> hat zwei Dutzend Pflichtspalten, die hier nichts zur
   Sache tun — der Cast hält die Fixtures lesbar. */
const team = (id: number, name: string, sfvId: number | null = null): Team =>
  ({ id, name, sfv_team_id: sfvId } as unknown as Team);

describe("baueZuordnung", () => {
  it("verbindet SFV-Team und ClubCampus-Team über die sfv_team_id", () => {
    const z = baueZuordnung([sfv(38301, "FC Herrliberg 1")], [team(7, "1. Mannschaft", 38301)]);
    expect(z.zeilen).toHaveLength(1);
    expect(z.zeilen[0].team?.name).toBe("1. Mannschaft");
    expect(z.offen).toHaveLength(0);
    expect(z.veraltet).toHaveLength(0);
  });

  it("führt jedes SFV-Team auf, auch ohne Zuordnung", () => {
    const z = baueZuordnung([sfv(38301, "A"), sfv(38302, "B")], [team(7, "1. Mannschaft", 38301)]);
    expect(z.zeilen.map((x) => x.team?.name ?? null)).toEqual(["1. Mannschaft", null]);
  });

  it("meldet ein Team als veraltet, wenn seine SFV-Nummer nicht mehr in der Saison steht", () => {
    const z = baueZuordnung([sfv(38301, "A")], [team(7, "1. Mannschaft", 38301), team(8, "Alte Garde", 99999)]);
    expect(z.veraltet.map((t) => t.name)).toEqual(["Alte Garde"]);
    expect(z.offen).toHaveLength(0);
  });

  it("zählt ein Team ohne SFV-Nummer als offen, nicht als veraltet", () => {
    const z = baueZuordnung([sfv(38301, "A")], [team(8, "Frauen 1")]);
    expect(z.offen.map((t) => t.name)).toEqual(["Frauen 1"]);
    expect(z.veraltet).toHaveLength(0);
  });

  /* Fünf SFV-Teams des FCH heissen „FC Herrliberg a" — über den Namen
     ginge die Zuordnung nicht, über die Id schon. */
  it("unterscheidet gleichnamige SFV-Teams über die Nummer", () => {
    const z = baueZuordnung(
      [sfv(38309, "FC Herrliberg a"), sfv(73031, "FC Herrliberg a")],
      [team(7, "Junioren C", 73031)],
    );
    expect(z.zeilen[0].team).toBeNull();
    expect(z.zeilen[1].team?.name).toBe("Junioren C");
  });
});

describe("auswahlFuer", () => {
  it("bietet die offenen Teams an, plus das bereits zugeordnete", () => {
    const z = baueZuordnung([sfv(38301, "A")], [team(7, "1. Mannschaft", 38301), team(8, "Frauen 1")]);
    expect(auswahlFuer(z, 38301).map((t) => t.name)).toEqual(["1. Mannschaft", "Frauen 1"]);
  });

  it("bietet ein Team, das schon anderswo zugeordnet ist, nicht erneut an", () => {
    const z = baueZuordnung([sfv(38301, "A"), sfv(38302, "B")], [team(7, "1. Mannschaft", 38301)]);
    expect(auswahlFuer(z, 38302).map((t) => t.name)).toEqual([]);
  });

  it("hält ein veraltetes Team aus der Auswahl heraus", () => {
    const z = baueZuordnung([sfv(38301, "A")], [team(8, "Alte Garde", 99999)]);
    expect(auswahlFuer(z, 38301)).toHaveLength(0);
  });
});

/* ── Die Allowlist der Namen ──────────────────────────────────────────────
   ⚠ ZWEI FEHLER AN EINEM ABEND, beide hier festgehalten:

   1. `leseOffeneNamen` las eine Ebene zu hoch (`lauf.offene_namen` statt
      `lauf.matchdaten.offene_namen`). Der damalige Test war gruen, weil
      seine Attrappe dieselbe falsche Form hatte wie der Code.
   2. Die Namen reisten ueberhaupt im Lauf-Ergebnis mit — und damit ueber
      dessen zwei Ausgaenge nach `api_sync_log.details` und `pg_net`.

   Beide sind weg: der Sync kennt keine Namen mehr, sie kommen aus der
   eigenen Aktion `namen` mit eigener Antwortform. Geblieben ist die
   Allowlist beim Lesen — sie schuetzt vor dem naechsten Feld. */
describe("leseNamenAntwort", () => {
  const ANTWORT: NamenAntwort = {
    namen: [
      { sfv_person_id: 7, name: "Adrian Schmid" },
      { sfv_person_id: 9, name: "Lea Jenni" },
    ],
    spiele_abgefragt: 22, namen_gefunden: 2, offen_gesamt: 2, fehler: 0,
  };

  it("liest sfv_person_id und name", () => {
    expect(leseNamenAntwort(ANTWORT)).toEqual({ 7: "Adrian Schmid", 9: "Lea Jenni" });
  });

  it("nimmt NUR name mit — ein neues Feld reist nicht still mit", () => {
    const mitExtra = { ...ANTWORT, namen: [
      { sfv_person_id: 7, name: "Adrian Schmid", geburtsdatum: "2001-03-04", pass: 987654 },
    ] } as unknown as NamenAntwort;
    /* toEqual auf einem String: alles andere fiele auf. */
    expect(leseNamenAntwort(mitExtra)).toEqual({ 7: "Adrian Schmid" });
  });

  it("uebergeht Zeilen ohne Namen, statt eine leere anzuzeigen", () => {
    const luecken = { ...ANTWORT, namen: [
      { sfv_person_id: 7, name: "  " }, { sfv_person_id: 8, name: "Gut" },
    ] };
    expect(leseNamenAntwort(luecken)).toEqual({ 8: "Gut" });
  });

  it("ohne Antwort ist es leer, kein Fehler", () => {
    expect(leseNamenAntwort(null)).toEqual({});
  });
});
