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
import { baueZuordnung, auswahlFuer, leseOffeneNamen } from "../sfvService.ts";
import type { SyncAntwort } from "../sfvService.ts";
import type { LaufErgebnis } from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";
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
   ⚠ DIE ANTWORT WIRD AUS `LaufErgebnis` GEBAUT, nicht abgeschrieben. Am
   21.08.2026 las `leseOffeneNamen` eine Ebene zu hoch (`lauf.offene_namen`
   statt `lauf.matchdaten.offene_namen`) — und der damalige Test war grün,
   weil seine Attrappe dieselbe falsche Form hatte wie der Code. Eine
   Attrappe, die die Form abschreibt, prüft die Abschrift.

   Die echte Form: `index.ts` legt `{ verein_id, ...erg }` in `laeufe`. */
const ERGEBNIS: LaufErgebnis = {
  status: "ok",
  meldung: "Matchdaten 10 Spiel(e)",
  spiele: { neu: 0, aktualisiert: 0, ohne_team: 0, nicht_mehr_geliefert: 0 },
  ranglisten: { geschrieben: 0, entfernt: 0, gruppen: 0 },
  verwaiste_zuordnungen: 0,
  derbys: 0,
  matchdaten: {
    spiele_geholt: 10, aufstellung_zeilen: 156, ereignisse_zeilen: 0,
    eigene_unzugeordnet: 177, zuordnungen_gesamt: 0, paesse_geschrieben: 0,
    pass_konflikte: [], nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
    offene_namen: [
      { sfv_person_id: 7, name: "Adrian Schmid", rueckennr: 9, sfv_team_id: 38309 },
    ],
  },
};

type OffeneNamen = NonNullable<LaufErgebnis["matchdaten"]>["offene_namen"];

const antwortMit = (namen: OffeneNamen): SyncAntwort => ({
  laeufe: [{ verein_id: "v1", ...ERGEBNIS,
             matchdaten: { ...ERGEBNIS.matchdaten!, offene_namen: namen } }],
});

describe("leseOffeneNamen", () => {
  it("findet die Namen dort, wo die Edge Function sie ablegt", () => {
    expect(leseOffeneNamen({ laeufe: [{ verein_id: "v1", ...ERGEBNIS }] }))
      .toEqual({ 7: "Adrian Schmid" });
  });

  it("liest ueber mehrere Laeufe hinweg", () => {
    const zweiter: LaufErgebnis = { ...ERGEBNIS, matchdaten: {
      ...ERGEBNIS.matchdaten!,
      offene_namen: [{ sfv_person_id: 9, name: "Lea Jenni", rueckennr: null, sfv_team_id: null }],
    } };
    expect(leseOffeneNamen({ laeufe: [
      { verein_id: "v1", ...ERGEBNIS }, { verein_id: "v1", ...zweiter },
    ] })).toEqual({ 7: "Adrian Schmid", 9: "Lea Jenni" });
  });

  it("nimmt NUR name mit — ein neues Feld reist nicht still mit", () => {
    const mitExtra = antwortMit([{
      sfv_person_id: 7, name: "Adrian Schmid", rueckennr: 9, sfv_team_id: 38309,
    }]);
    /* toEqual auf einem String: alles andere fiele auf. */
    expect(leseOffeneNamen(mitExtra)).toEqual({ 7: "Adrian Schmid" });
  });

  it("uebergeht Zeilen ohne Namen, statt eine leere anzuzeigen", () => {
    expect(leseOffeneNamen(antwortMit([
      { sfv_person_id: 7, name: "  ", rueckennr: null, sfv_team_id: null },
      { sfv_person_id: 8, name: "Gut", rueckennr: null, sfv_team_id: null },
    ]))).toEqual({ 8: "Gut" });
  });

  it("ein Lauf OHNE Matchdaten ist leer, kein Fehler", () => {
    const ohne: LaufErgebnis = { ...ERGEBNIS, matchdaten: undefined };
    expect(leseOffeneNamen({ laeufe: [{ verein_id: "v1", ...ohne }] })).toEqual({});
    expect(leseOffeneNamen(null)).toEqual({});
  });
});
