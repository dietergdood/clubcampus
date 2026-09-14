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
  versuche: [], wege_mit_spielplanzeilen: 0,
  wege_die_die_nummer_kennen: 0, wege_mit_ignoriertem_parameter: 0,
  spielplan_mit_datumsfenster: 270,
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
    ] }));
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

describe("die Schlusszeile zaehlt, was sie meint", () => {
  /* ⚠ ⚠ HIER STANDEN ZWEI FÄLLE FÜR `wege_mit_daten`. Die Zahl zählte
     jede Antwort, die kein Fehler war — darunter die UNVERÄNDERTE
     Teamliste (21 Einträge, Parameter ignoriert) und ein BILD. Die
     Schlusszeile meldete „das löst das Problem", während siebenmal
     darunter das Gegenteil stand.

     > Eine Zusammenfassung, die dem Detail widerspricht, wird zuerst
     > gelesen — und ist gefährlicher als gar keine.

     Ersetzt, nicht angepasst: das alte Verhalten war messbar falsch. */
  const mit = (ueber: Record<string, unknown>) =>
    deuteNummernprobe({ ...BASIS, ...ueber });

  it("meldet nur SPIELPLANZEILEN als Lösung", () => {
    const t = zus(mit({ wege_mit_spielplanzeilen: 1 }));
    expect(t).toMatch(/1 Weg\(e\) liefern SPIELPLANZEILEN für 38315/);
    expect(t).toMatch(/Das löst das Problem/);
  });

  it("⚠ ein Bild ist KEINE Lösung — es steht getrennt", () => {
    /* Der Fall, der die Meldung falsch machte: `team/picture` antwortet,
       also „kennt die Nummer" — aber kein Spielplan. */
    const t = zus(mit({ wege_mit_spielplanzeilen: 0, wege_die_die_nummer_kennen: 1 }));
    expect(t).toMatch(/KEIN Weg liefert Spielplanzeilen/);
    expect(t).toMatch(/kennen die Nummer überhaupt \(z\. B\. ein Wappen\)/);
    expect(t).toMatch(/ist kein Spielplan/);
    expect(t).not.toMatch(/löst das Problem/);
  });

  it("⚠ ein ignorierter Filter wird BENANNT, nicht als Fehlschlag gewertet", () => {
    /* Ein 200 mit derselben Menge wie ohne Parameter ist selbst ein
       Befund über die Schnittstelle. */
    const t = zus(mit({ wege_mit_ignoriertem_parameter: 2 }));
    expect(t).toMatch(/2 Weg\(e\) haben den Filter offenbar ignoriert/);
  });

  it("je Versuch steht der Grund, warum er nicht zählt", () => {
    const t = zus(mit({ versuche: [
      { weg: "team/list mit TeamId", ausgang: "21 Eintrag/Eintraege",
        parameter_offenbar_ignoriert: true, nennt_gesuchte_nummer: false },
      { weg: "club/ranking mit TeamId", ausgang: "leere Liste",
        parameter_offenbar_ignoriert: false, nennt_gesuchte_nummer: false },
    ] }));
    expect(t).toMatch(/Der Parameter wurde offenbar IGNORIERT/);
    expect(t).toMatch(/Die Antwort nennt die gesuchte Nummer nicht/);
  });

  it("kein Weg: die Anfrage wird stärker, nicht schwächer", () => {
    expect(zus(mit({}))).toMatch(/mit diesem Ergebnis stärker als ohne/);
  });

  it("eine ältere Function meldet es, statt Nullen zu zeigen", () => {
    /* ⚠ „nicht gemeldet" ist nicht „0 Wege". */
    const alt = { ...BASIS } as Record<string, unknown>;
    delete alt.wege_mit_spielplanzeilen;
    const t = zus(deuteNummernprobe(alt));
    expect(t).toMatch(/Ergebnis: nicht gemeldet/);
    expect(t).not.toMatch(/KEIN Weg liefert/);
  });
});

describe("das Zeitfenster — ein Filter, den niemand setzt", () => {
  /* ⚠ ⚠ `/api/club/schedule` nimmt dreizehn Parameter, wir setzen drei.
     Nicht zu filtern heisst normalerweise „alles" — aber `DateFrom`/
     `DateUntil` könnten eine Vorgabe haben, und dann fährt jeder Lauf
     gegen ein Fenster, das niemand gewählt hat. */
  const mit = (ueber: Record<string, unknown>) =>
    zus(deuteNummernprobe({ ...BASIS, ...ueber }));

  it("gleiche Zahl heisst: keine Vorgabe", () => {
    expect(mit({ spielplan_mit_datumsfenster: 270 }))
      .toMatch(/ebenfalls 270 Zeilen — keine Vorgabe/);
  });

  it("⚠ mehr Zeilen heissen: es GIBT eine Vorgabe", () => {
    const t = mit({ spielplan_mit_datumsfenster: 312 });
    expect(t).toMatch(/312 Zeilen mit Datumsbereich gegen 270 ohne/);
    expect(t).toMatch(/VORGABE, die wir nie gewählt haben/);
    expect(t).toMatch(/weit über die Turnierfrage hinaus/);
  });

  it("null ist nicht null Zeilen", () => {
    /* ⚠ „nicht feststellbar" und „gleich viele" dürfen nicht dieselbe
       Zeile bekommen. */
    expect(mit({ spielplan_mit_datumsfenster: null }))
      .toMatch(/keine Zeilenzahl geliefert — nicht feststellbar/);
  });

  it("eine aeltere Function meldet es getrennt", () => {
    const alt = { ...BASIS } as Record<string, unknown>;
    delete alt.spielplan_mit_datumsfenster;
    expect(zus(deuteNummernprobe(alt))).toMatch(/Zeitfenster: nicht geprüft/);
  });
});
