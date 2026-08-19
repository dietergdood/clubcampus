import { describe, it, expect } from "vitest";
import { darfMatchdatenKorrigieren } from "../matchdatenRechte.ts";

/* Die Policy, die gespiegelt wird:
     is_admin() or get_my_role() = 'trainer'
                or hat_modul_recht('schedule','schreiben')  */
const nie = () => false;
const immer = () => true;

describe("darfMatchdatenKorrigieren spiegelt spiel_ereignisse_write", () => {
  it("lässt Administrator und Verwaltung durch (is_admin)", () => {
    expect(darfMatchdatenKorrigieren("administrator", nie)).toBe(true);
    expect(darfMatchdatenKorrigieren("administration", nie)).toBe(true);
  });

  it("lässt den Trainer durch, auch ohne Gruppenrecht", () => {
    /* Der Punkt des mittleren Zweigs: hat_modul_recht() kennt die Rolle
       nicht, und schedule steht für den Trainer auf 'lesen'. Ohne diesen
       Zweig könnte kein Trainer korrigieren. */
    expect(darfMatchdatenKorrigieren("trainer", nie)).toBe(true);
  });

  it("lässt einen Funktionär nur mit schedule:schreiben durch", () => {
    /* Der Stufenleiter kommt über seine Gruppe dazu — ohne Aufzählung. */
    expect(darfMatchdatenKorrigieren("funktionaer", immer)).toBe(true);
    expect(darfMatchdatenKorrigieren("funktionaer", nie)).toBe(false);
  });

  it("fragt für einen Funktionär genau das Modul schedule", () => {
    const gefragt: string[] = [];
    darfMatchdatenKorrigieren("funktionaer", m => { gefragt.push(m); return false; });
    expect(gefragt).toEqual(["schedule"]);
  });

  it("lässt Spieler und Eltern nicht durch", () => {
    for (const r of ["spieler", "eltern", "mitglied", "supporter", null, undefined, ""]) {
      expect(darfMatchdatenKorrigieren(r, immer)).toBe(false);
    }
  });

  it("zeigt lieber zu wenig als zu viel", () => {
    /* Ein Spieler, dem jemand in der Portalverwaltung schedule:schreiben
       gäbe, käme durch die Policy (hat_modul_recht liest Gruppen
       rollenunabhängig), sieht hier aber keinen Stift. Ein fehlender Knopf
       kostet weniger als einer, der beim Speichern scheitert. */
    expect(darfMatchdatenKorrigieren("spieler", immer)).toBe(false);
  });
});
