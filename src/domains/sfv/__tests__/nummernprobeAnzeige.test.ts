/* ═══════════════════════════════════════════════════════════════
   deuteNummernprobe — kennt die Schnittstelle eine Nummer, die sie
   nicht nennt?

   ⚠ ANLASS, 14.09.2026: `t=38315` auf der Verbandsseite. Die
   Mannschaften ohne Rangliste HABEN eine Teamnummer.

   > Eine Liste, die eine Mannschaft nicht nennt, muss sie nicht
   > ablehnen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { deuteNummernprobe } from "../nummernprobeAnzeige.ts";

const BASIS = {
  gesucht: 38315,
  suchraum: { pfade_in_der_spezifikation: 15, pfade_mit_teamnummer: 4,
              versuche_gesamt: 7, begriffe_geprueft: "tournament 0x, turnier 0x" },
  steht_in_teamliste: false, teamliste_gesamt: 21,
  zeilen_im_rohen_spielplan: 0, spielplan_gesamt: 270,
  versuche: [], wege_mit_daten: 0,
};
const zus = (t: string[]) => t.join(" | ");

describe("der Suchraum steht zuerst", () => {
  it("nennt Pfade, Kandidaten und Versuche", () => {
    /* ⚠ „Nichts gefunden" und „nicht gesucht" sehen sonst gleich aus. */
    const t = zus(deuteNummernprobe(BASIS));
    expect(t).toMatch(/15 Pfade in der Spezifikation · 4 nehmen eine Mannschaftsnummer/);
    expect(t).toMatch(/7 Versuche gemacht/);
    expect(t).toMatch(/tournament 0x/);
  });
});

describe("die zwei Grundmessungen koennen den Befund kippen", () => {
  it("Zeilen im rohen Spielplan heissen FILTERproblem", () => {
    const t = zus(deuteNummernprobe({ ...BASIS, zeilen_im_rohen_spielplan: 9 }));
    expect(t).toMatch(/9 Zeilen im rohen Spielplan \(270\) nennen 38315/);
    expect(t).toMatch(/DANN KOMMT SIE AN/);
    expect(t).toMatch(/der Befund vom 14\.09\.2026 kippt/);
  });

  it("null Zeilen heisst: der ungefilterte Plan kennt sie nicht", () => {
    const t = zus(deuteNummernprobe(BASIS));
    expect(t).toMatch(/0 von 270 Spielplanzeilen nennen 38315/);
    expect(t).not.toMatch(/kippt/);
  });

  it("steht sie in der Teamliste, ist die Ausgangsannahme falsch", () => {
    const t = zus(deuteNummernprobe({ ...BASIS, steht_in_teamliste: true }));
    expect(t).toMatch(/STEHT in der Teamliste/);
    expect(t).toMatch(/Ausgangsannahme falsch/);
  });
});

describe("jeder Versuch bekommt eine Zeile — auch der erfolglose", () => {
  it("nennt Weg und Ausgang, und die Felder wo es welche gibt", () => {
    /* ⚠ Ein 404 ist eine Antwort und kein Fehler. Eine Liste, die nur
       Erfolge zeigt, lässt offen, ob überhaupt gefragt wurde. */
    const t = zus(deuteNummernprobe({ ...BASIS, versuche: [
      { weg: "team/list mit TeamId", status: 404, ausgang: "HTTP 404", schluessel: null },
      { weg: "club/schedule mit TeamId", status: 200, ausgang: "3 Eintrag/Eintraege",
        schluessel: { anzahl: 3, alle: ["matchId", "teamAId", "teamBId"] } },
    ], wege_mit_daten: 1 }));
    expect(t).toMatch(/team\/list mit TeamId — HTTP 404/);
    expect(t).toMatch(/club\/schedule mit TeamId — 3 Eintrag\/Eintraege · Felder: matchId, teamAId, teamBId/);
  });

  it("unterscheidet leere Liste von HTTP-Fehler", () => {
    /* ⚠ Eine leere Liste ist eine Antwort: der Endpunkt kennt die
       Nummer, hat aber nichts zu ihr. Ein 404 ist etwas anderes. */
    const t = zus(deuteNummernprobe({ ...BASIS, versuche: [
      { weg: "club/ranking mit TeamId", status: 200, ausgang: "leere Liste", schluessel: null },
    ] }));
    expect(t).toMatch(/club\/ranking mit TeamId — leere Liste/);
  });
});

describe("die eine Zahl, die alles entscheidet", () => {
  it("ein Weg mit Daten loest das Problem", () => {
    const t = zus(deuteNummernprobe({ ...BASIS, wege_mit_daten: 2 }));
    expect(t).toMatch(/2 Weg\(e\) antworten mit Daten/);
    expect(t).toMatch(/sie nennt sie nur nicht von selbst/);
  });

  it("kein Weg mit Daten macht die Anfrage staerker, nicht schwaecher", () => {
    /* ⚠ Auch der negative Ausgang ist ein Ergebnis — und er gehört
       gesagt, statt als Schweigen zu erscheinen. */
    const t = zus(deuteNummernprobe(BASIS));
    expect(t).toMatch(/Kein Weg antwortet mit Daten/);
    expect(t).toMatch(/mit diesem Ergebnis stärker als ohne/);
  });
});
