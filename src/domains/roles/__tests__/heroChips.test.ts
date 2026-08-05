import { describe, it, expect } from "vitest";
import { heroChips } from "../roleUtils.ts";

const L: Record<string, string> = {
  administrator: "Administrator", administration: "Verwaltung",
  funktionaer: "Funktionär", trainer: "Trainer/in", spieler: "Spieler/in",
  eltern: "Elternteil", mitglied: "Mitglied", supporter: "Supporter",
};

const baue = (o: Partial<Parameters<typeof heroChips>[0]>) => heroChips({
  portalRolle: null, mitgliedtyp: null,
  hatTrainerKader: false, hatSpielerKader: false, hatFunktion: false,
  rolleLabel: L, ...o,
});

const labels = (c: ReturnType<typeof heroChips>) => c.map(x => x.label);

describe("heroChips — mit Tätigkeit", () => {
  it("Trainer und Spieler: Rolle gold, Kaderrolle grau", () => {
    const c = baue({ portalRolle: "trainer", mitgliedtyp: "Juniorenmitglied",
                     hatTrainerKader: true, hatSpielerKader: true });
    expect(labels(c)).toEqual(["Trainer/in", "Spieler/in"]);
    expect(c[0].type).toBe("portal");
    expect(c[1].type).toBe("kader");
  });

  it("Pausenmitglied, das aushilft, bleibt Spieler", () => {
    /* Militärdienst, spielt alle zwei Wochen — hat einen Kadereintrag,
       also gilt die Tätigkeit, nicht die Beitragskategorie. */
    const c = baue({ portalRolle: "spieler", mitgliedtyp: "Pausenmitglied",
                     hatSpielerKader: true });
    expect(labels(c)).toEqual(["Spieler/in"]);
  });

  it("Vereinsfunktion erzeugt einen eigenen Chip", () => {
    /* Bis 05.08.2026 fehlte er: der Kopf zeigte nur Portalrolle und
       Kaderrollen. Wer eine Funktion hatte und eine andere Portalrolle,
       sah sie nirgends. */
    const c = baue({ portalRolle: "trainer", mitgliedtyp: "Aktivmitglied",
                     hatTrainerKader: true, hatFunktion: true });
    expect(labels(c)).toEqual(["Trainer/in", "Funktionär"]);
  });

  it("verdoppelt die Portalrolle nicht", () => {
    const c = baue({ portalRolle: "funktionaer", mitgliedtyp: "Aktivmitglied", hatFunktion: true });
    expect(labels(c)).toEqual(["Funktionär"]);
  });

  it("zeigt alles gleichzeitig, gold bleibt die höchste Berechtigung", () => {
    const c = baue({ portalRolle: "administrator", mitgliedtyp: "Aktivmitglied",
                     hatTrainerKader: true, hatSpielerKader: true, hatFunktion: true });
    expect(labels(c)).toEqual(["Administrator", "Trainer/in", "Spieler/in", "Funktionär"]);
    expect(c[0].type).toBe("portal");
  });
});

describe("heroChips — ohne Kader und ohne Funktion", () => {
  it("neu erfasster Junior zeigt den Mitgliedtyp statt „Spieler/in“", () => {
    /* Der häufigste Fall: erfasst, aber noch keinem Team zugeteilt. Die
       Portalrolle kommt aus standard_rolle und behauptet eine
       Teamzugehörigkeit, die es nicht gibt. */
    const c = baue({ portalRolle: "spieler", mitgliedtyp: "Juniorenmitglied" });
    expect(labels(c)).toEqual(["Juniorenmitglied"]);
  });

  it("Ehrenmitglied statt des unspezifischen „Mitglied“", () => {
    const c = baue({ portalRolle: "mitglied", mitgliedtyp: "Ehrenmitglied" });
    expect(labels(c)).toEqual(["Ehrenmitglied"]);
  });

  it("Pausenmitglied ohne Kader zeigt die Beitragskategorie", () => {
    const c = baue({ portalRolle: "spieler", mitgliedtyp: "Pausenmitglied" });
    expect(labels(c)).toEqual(["Pausenmitglied"]);
  });

  it("Administrator wird NICHT durch den Mitgliedtyp ersetzt", () => {
    /* administrator kommt aus benutzer.ist_admin, nicht aus dem
       Mitgliedtyp — der Systemzugang darf nicht verschwinden. */
    const c = baue({ portalRolle: "administrator", mitgliedtyp: "Aktivmitglied" });
    expect(labels(c)).toEqual(["Administrator"]);
  });

  it("Verwaltung ebenso wenig", () => {
    const c = baue({ portalRolle: "administration", mitgliedtyp: "Passivmitglied" });
    expect(labels(c)).toEqual(["Verwaltung"]);
  });

  it("ohne Mitgliedschaft bleibt die Rolle stehen", () => {
    /* Ein reiner Elternteil hat keinen Mitgliedtyp. */
    const c = baue({ portalRolle: "eltern", mitgliedtyp: null });
    expect(labels(c)).toEqual(["Elternteil"]);
  });

  it("ohne alles bleibt der Kopf leer", () => {
    expect(baue({})).toEqual([]);
  });

  it("behandelt „-“ wie keine Rolle", () => {
    const c = baue({ portalRolle: "-", mitgliedtyp: "Aktivmitglied" });
    expect(labels(c)).toEqual(["Aktivmitglied"]);
  });
});
