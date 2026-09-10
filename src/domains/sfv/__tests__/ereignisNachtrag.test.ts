/* ══════════════════════════════════════════════════════════════════════
   Der Nachtrag wählt nach der FRAGE und kürzt nicht still (10.09.2026)
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { waehleNachtragSpiele, deuteNachtrag } from "../ereignisNachtrag.ts";

const z = (spiel: string, match: number | null) => ({ spiel_id: spiel, sfv_match_id: match });

describe("waehleNachtragSpiele", () => {
  it("⚠ ein Spiel mit fuenf offenen Wechseln ist EIN Abruf", () => {
    /* Jeder Abruf ist einer beim Verband. Ohne Entdopplung kostete ein
       torreiches Spiel fuenfmal so viel wie noetig. */
    const w = waehleNachtragSpiele([z("a", 100), z("a", 100), z("a", 100)], 40);
    expect(w.matchIds).toEqual([100]);
    expect(w.offen_gesamt).toBe(1);
  });

  it("haelt die Obergrenze ein und meldet, was uebrig bleibt", () => {
    const viele = Array.from({ length: 50 }, (_, i) => z(`s${i}`, 1000 + i));
    const w = waehleNachtragSpiele(viele, 40);
    expect(w.matchIds).toHaveLength(40);
    /* ⚠ `offen_gesamt` bleibt 50 — die Zahl darf nicht auf die Auswahl
       schrumpfen, sonst saehe ein halber Lauf aus wie ein ganzer. */
    expect(w.offen_gesamt).toBe(50);
  });

  it("⚠ zaehlt Spiele ohne sfv_match_id getrennt, statt sie zu verschweigen", () => {
    /* Sie bleiben dauerhaft offen. Ohne eigene Zahl erklaerte niemand,
       warum `offen_danach` nie null wird. */
    const w = waehleNachtragSpiele([z("a", 100), z("b", null), z("c", null)], 40);
    expect(w.matchIds).toEqual([100]);
    expect(w.ohne_match_id).toBe(2);
    expect(w.offen_gesamt).toBe(1);
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    expect(waehleNachtragSpiele([], 40)).toEqual({
      matchIds: [], offen_gesamt: 0, ohne_match_id: 0,
    });
  });
});

describe("deuteNachtrag", () => {
  const e = (ueber: Record<string, number> = {}) => ({
    spiele_abgefragt: 40, spiele_fehlgeschlagen: 0, ereignisse_geschrieben: 300,
    offen_gesamt: 40, offen_danach: 0, ohne_match_id: 0, ...ueber,
  });

  it("⚠ sagt, dass noch etwas offen ist — sonst liest sich 40 wie fertig", () => {
    expect(deuteNachtrag(e({ offen_danach: 160 }))).toMatch(/noch 160 Spiel\(e\) offen/);
  });

  it("meldet Fertigkeit nur, wenn wirklich nichts mehr offen ist", () => {
    expect(deuteNachtrag(e())).toMatch(/alle offenen Spiele geholt/);
  });

  it('unterscheidet „nichts offen" von „alles erledigt"', () => {
    /* Der Unterschied zwischen „es gab nichts zu tun" und „ich habe alles
       getan" ist genau der, den ein Zaehler sonst einebnet. */
    expect(deuteNachtrag(e({ offen_gesamt: 0, spiele_abgefragt: 0 })))
      .toMatch(/nichts offen/);
  });

  it("nennt nicht abrufbare Spiele beim Namen", () => {
    const t = deuteNachtrag(e({ ohne_match_id: 3 }));
    expect(t).toMatch(/3 Spiel\(e\) ohne sfv_match_id/);
  });

  it("meldet Fehlschlaege statt sie in der Erfolgszahl verschwinden zu lassen", () => {
    expect(deuteNachtrag(e({ spiele_fehlgeschlagen: 2 }))).toMatch(/2 Spiel\(e\) nicht abrufbar/);
  });
});
