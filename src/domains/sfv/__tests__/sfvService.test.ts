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
import { baueZuordnung, auswahlFuer, leseNamenAntwort, leseNamenTeile } from "../sfvService.ts";
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


/* ── Die getrennten Namensteile ───────────────────────────────────────────
   ⚠ ⚠  DIESE FUNKTION HATTE BIS ZUM 24.09.2026 KEINEN EINZIGEN FALL, und
   das ist die Lücke, die keine Prüfkette findet: gäbe `leseNamenTeile`
   dauerhaft `{}` zurück, fiele die Maske auf den ganzen Namen in der Spalte
   „Name" zurück, die Spalte „Vorname" bliebe bei JEDER Person leer — und
   `typecheck`, Tests und `check:deno` wären grün. Eine Funktion ohne
   Aufrufer ist in keiner Hinsicht defekt; eine ohne Fall auch nicht.

   Sie ist das Glied zwischen der Antwort der Function und dem Zustand der
   Maske. Beide Enden sind geprüft (`bildeOffeneNamen` drüben, `alsMannschafts-
   liste` hier) — geprüft war die Mitte nicht. */
describe("leseNamenTeile", () => {
  const MIT_TEILEN = {
    namen: [
      { sfv_person_id: 7, name: "Lorena Sara Hug", vorname: "Lorena Sara", nachname: "Hug" },
      { sfv_person_id: 9, name: "Tamara Hidber Mullis", vorname: "Tamara", nachname: "Hidber Mullis" },
    ],
    spiele_abgefragt: 1, namen_gefunden: 2, offen_gesamt: 2, fehler: 0,
  } as unknown as NamenAntwort;

  it("liest vorname und nachname getrennt, wie sie ankommen", () => {
    expect(leseNamenTeile(MIT_TEILEN)).toEqual({
      7: { vorname: "Lorena Sara", nachname: "Hug" },
      9: { vorname: "Tamara", nachname: "Hidber Mullis" },
    });
  });

  it("⚠ und setzt NICHT zusammen — der ganze Name steht in keinem Teil", () => {
    /* Die Gegenrichtung: beide Teile zusammen ergeben den Namen, aber kein
       einzelner trägt ihn. Ohne diesen Fall wäre eine Fassung grün, die
       `nachname` mit dem ganzen Namen füllt — und in der Datei stünde dann
       „Lorena Sara Hug" unter Name UND „Lorena Sara" unter Vorname. */
    const t = leseNamenTeile(MIT_TEILEN)[7];
    expect(t.nachname).toBe("Hug");
    expect(t.vorname).toBe("Lorena Sara");
  });

  it("eine Antwort OHNE Teile ergibt eine leere Karte, keinen Fehler", () => {
    /* Der Fall, der heute eintritt, solange `sfv-sync` nicht neu deployt
       ist: die Function liefert nur `name`. Dann gibt es keine Teile, und
       der Rückfall in `baueSpielerZeilen` legt den ganzen Namen unter
       „Name" — eine leere Zelle ist eine Auskunft, eine geratene nicht. */
    const ohne: NamenAntwort = {
      namen: [{ sfv_person_id: 7, name: "Adrian Schmid" }],
      spiele_abgefragt: 1, namen_gefunden: 1, offen_gesamt: 1, fehler: 0,
    };
    expect(leseNamenTeile(ohne)).toEqual({});
  });

  it("⚠ ein einzelner Teil genügt — nur BEIDE leer wird übergangen", () => {
    /* Liefert der Verband keinen Vornamen, ist das eine gültige Auskunft.
       Zwei leere Teile sind keine: sie stünden für eine alte Antwortform
       und überschrieben später eine echte Trennung mit Leere. */
    const halb = {
      namen: [
        { sfv_person_id: 7, name: "Schmid", vorname: "", nachname: "Schmid" },
        { sfv_person_id: 8, name: "Egal", vorname: "  ", nachname: " " },
      ],
      spiele_abgefragt: 1, namen_gefunden: 2, offen_gesamt: 2, fehler: 0,
    } as unknown as NamenAntwort;
    expect(leseNamenTeile(halb)).toEqual({ 7: { vorname: "", nachname: "Schmid" } });
  });

  it("ohne Antwort ist es leer, kein Fehler", () => {
    expect(leseNamenTeile(null)).toEqual({});
  });

  it("⚠ eine unlesbare sfv_person_id wird übergangen, nicht zu NaN", () => {
    /* `Number("x")` ist `NaN`, und `raus[NaN]` wäre ein Eintrag, den kein
       Aufrufer je findet — die Person hätte dann stumm keine Teile. */
    const kaputt = { namen: [
      { sfv_person_id: "x", name: "A B", vorname: "A", nachname: "B" },
      { sfv_person_id: 7, name: "C D", vorname: "C", nachname: "D" },
    ] } as unknown as NamenAntwort;
    expect(leseNamenTeile(kaputt)).toEqual({ 7: { vorname: "C", nachname: "D" } });
  });
});
