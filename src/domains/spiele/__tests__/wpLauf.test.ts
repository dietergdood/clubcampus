/**
 * Der Zuschnitt des scharfen Laufs (Etappe 5).
 *
 * ⚠ Der Kern dieser Datei ist NICHT das Zusammenzaehlen, sondern der
 * Abgleichbereich: `teams` sagt dem Plugin, welche Beitraege es auf
 * Entwurf setzen darf. Eine Mannschaft, die faelschlich darin steht,
 * verliert ihren Spielplan — und der Lauf meldet Erfolg.
 */
import { describe, it, expect } from "vitest";
import {
  teileNachTeam, ohneTeamnummer, fasseLauf, laufMeldung, fuersProtokoll,
} from "../wpLauf.ts";
import type { TeilErgebnis } from "../wpLauf.ts";
import type { WpSpiel } from "../wpNutzlast.ts";

/** Ein Spiel, so schmal wie moeglich — geprueft wird die Aufteilung, nicht
    der Inhalt. Der Typ kommt aus `wpNutzlast.ts`, damit eine erfundene
    Spalte hier nicht durchgeht. */
function spiel(sfv_team_id: string, sfv_match_id: string): WpSpiel {
  return {
    sfv_match_id, sfv_spiel_nr: "", datum: "2026-09-05", zeit: "18:00",
    sfv_team_id, gegner: "FC Irgendwo", heim_auswaerts: "heim", ort: "Langacker",
    wettbewerb: "Meisterschaft", liga: "3. Liga", runde: "", status: "normal", publizieren: true,
    tore_heim: null, tore_gast: null, halbzeit_heim: null, halbzeit_gast: null,
    verlauf: [],
  };
}

const okAntwort = (neu = 0, aktualisiert = 0) => ({
  neu, aktualisiert, zurueckgezogen: 0, uebersprungen: 0, verlauf_zeilen: 0,
  ohne_team: [], doppelte_teams: [], moegliche_dubletten: [], fehler: [],
});

describe("teileNachTeam — der Abgleichbereich", () => {
  it("macht aus einer Spielliste einen Teil je Mannschaft", () => {
    const teile = teileNachTeam([
      spiel("38309", "1"), spiel("38301", "2"), spiel("38309", "3"),
    ]);
    expect(teile.map((t) => t.sfv_team_id)).toEqual(["38301", "38309"]);
    expect(teile.map((t) => t.spiele.length)).toEqual([1, 2]);
  });

  it("nennt NUR Mannschaften, zu denen dieser Lauf Spiele hat", () => {
    /* ⚠ Der Fall, der den Spielplan kosten wuerde: eine Mannschaft ohne
       Spiele darf nicht im Abgleichbereich stehen, sonst raeumt das Plugin
       ihre Beitraege ab. Deshalb kommt die Liste aus den Spielen und nicht
       aus `teams`. */
    const teile = teileNachTeam([spiel("38309", "1")]);
    expect(teile.map((t) => t.sfv_team_id)).toEqual(["38309"]);
    expect(teile.map((t) => t.sfv_team_id)).not.toContain("38301");
  });

  it("bei null Spielen bleibt der Abgleichbereich leer", () => {
    expect(teileNachTeam([])).toEqual([]);
  });

  it("sortiert numerisch, nicht alphabetisch", () => {
    const teile = teileNachTeam([spiel("999", "a"), spiel("1000", "b"), spiel("38", "c")]);
    expect(teile.map((t) => t.sfv_team_id)).toEqual(["38", "999", "1000"]);
  });

  it("laesst ein Spiel ohne Teamnummer weg — und ohneTeamnummer nennt es", () => {
    const liste = [spiel("38309", "1"), spiel("", "4711")];
    expect(teileNachTeam(liste).map((t) => t.sfv_team_id)).toEqual(["38309"]);
    expect(ohneTeamnummer(liste)).toEqual(["4711"]);
  });
});

describe("fasseLauf — was zusammenkommt", () => {
  it("zaehlt ueber alle Teile und meldet ok", () => {
    const teile: TeilErgebnis[] = [
      { sfv_team_id: "38301", gesendet: 5, wp: okAntwort(5, 0), fehler: null },
      { sfv_team_id: "38309", gesendet: 9, wp: { ...okAntwort(2, 7), verlauf_zeilen: 31 }, fehler: null },
    ];
    const { status, zahlen } = fasseLauf(teile);
    expect(status).toBe("ok");
    expect(zahlen.teams_gesendet).toBe(2);
    expect(zahlen.spiele_gesendet).toBe(14);
    expect(zahlen.neu).toBe(7);
    expect(zahlen.aktualisiert).toBe(7);
    expect(zahlen.verlauf_zeilen).toBe(31);
  });

  it("eine gescheiterte Mannschaft ist fehler, nicht warnung", () => {
    /* ⚠ Der Unterschied ist der Waechter: bei `fehler` schlaegt er Alarm,
       bei `warnung` nicht. Eine Mannschaft, die nichts bekommen hat, steht
       sonst mit dem Stand von gestern da und sieht gepflegt aus. */
    const { status, zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 5, wp: okAntwort(5), fehler: null },
      { sfv_team_id: "38309", gesendet: 9, wp: null, fehler: "WordPress 504" },
    ]);
    expect(status).toBe("fehler");
    expect(zahlen.teams_gesendet).toBe(1);
    expect(zahlen.teams_gescheitert).toBe(1);
    /* Die Teamnummer steht in der Meldung — sonst schickt sie niemanden
       irgendwohin. */
    expect(zahlen.fehler).toEqual(["Mannschaft 38309: WordPress 504"]);
  });

  it("die Spiele der gescheiterten Mannschaft zaehlen NICHT als gesendet", () => {
    const { zahlen } = fasseLauf([
      { sfv_team_id: "38309", gesendet: 9, wp: null, fehler: "Zeitlimit" },
    ]);
    expect(zahlen.spiele_gesendet).toBe(0);
  });

  it("ohne_team und doppelte_teams ergeben warnung", () => {
    const { status, zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 1, wp: { ...okAntwort(1), ohne_team: ["38301"] }, fehler: null },
    ]);
    expect(status).toBe("warnung");
    expect(zahlen.ohne_team).toEqual(["38301"]);
  });

  it("ein Lauf ohne Teile ist ok mit lauter Nullen", () => {
    const { status, zahlen } = fasseLauf([]);
    expect(status).toBe("ok");
    expect(zahlen.teams_gesendet).toBe(0);
    expect(zahlen.spiele_gesendet).toBe(0);
  });
});

describe("laufMeldung", () => {
  it("nennt die Mannschaften vor den Spielen", () => {
    const { zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 14, wp: okAntwort(14), fehler: null },
    ]);
    const m = laufMeldung("dev.fcherrliberg.ch", zahlen);
    /* ⚠ Ab Etappe 5 ist die Spielzahl allein keine vollstaendige Auskunft
       mehr: 260 aus 20 Mannschaften sehen aus wie 260 aus 21. */
    expect(m).toContain("1 Mannschaft(en)");
    expect(m).toContain("14 Spiel(e)");
    expect(m).toContain("dev.fcherrliberg.ch");
  });

  it("haengt die gescheiterten Mannschaften sichtbar an", () => {
    const { zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 1, wp: okAntwort(1), fehler: null },
      { sfv_team_id: "38309", gesendet: 9, wp: null, fehler: "504" },
    ]);
    expect(laufMeldung("h", zahlen)).toMatch(/1 Mannschaft\(en\) gescheitert/);
  });

  /* ⚠ "Wie lange dauern 21 serielle POST" war am 09.09.2026 eine Frage,
     auf die niemand eine Zahl hatte. Sie steht seither in der Meldung —
     also dort, wo die Kachel sie zeigt, nicht nur in den Details. */
  it("nennt die gemessene Dauer, wenn eine gemessen wurde", () => {
    const { zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 1, wp: okAntwort(1), fehler: null },
    ]);
    expect(laufMeldung("h", zahlen, 184_000)).toContain("184 s");
  });

  it("erfindet keine Dauer, wenn keine gemessen wurde", () => {
    /* Eine geschaetzte Dauer waere im Protokoll von einer gemessenen nicht
       zu unterscheiden — dann lieber gar keine. */
    const { zahlen } = fasseLauf([
      { sfv_team_id: "38301", gesendet: 1, wp: okAntwort(1), fehler: null },
    ]);
    expect(laufMeldung("h", zahlen)).not.toMatch(/\d+ s/);
  });
});

describe("fuersProtokoll — die Allowlist", () => {
  const teile: TeilErgebnis[] = [
    {
      sfv_team_id: "38309", gesendet: 2, fehler: null, dauer_ms: 1200,
      wp: {
        ...okAntwort(1, 1),
        moegliche_dubletten: [{ neu: 51, von_hand: 12, titel: "Ca-Junioren — FC Küsnacht a" }],
        /* Ein Feld, das die Gegenseite morgen dazuerfindet. */
        neuer_text: "Anna Beispiel, 13",
      },
    },
    { sfv_team_id: "38310", gesendet: 3, wp: null, fehler: "504 Gateway Timeout", dauer_ms: 31000 },
  ];

  it("nimmt weder den Beitragstitel noch ein unbekanntes Feld mit", () => {
    /* ⚠ Am 21.08.2026 sind 903 Klarnamen ins Protokoll geraten, weil ein
       Objekt gespreadet wurde. Aufgezaehlt wird, was gespeichert wird. */
    const { zahlen } = fasseLauf(teile);
    const roh = JSON.stringify(fuersProtokoll("dev.fcherrliberg.ch", zahlen, teile));
    expect(roh).not.toContain("titel");
    expect(roh).not.toContain("Küsnacht");
    expect(roh).not.toContain("neuer_text");
    expect(roh).not.toContain("Anna Beispiel");
  });

  it("nennt jede Mannschaft einzeln — auch die gescheiterte", () => {
    /* Eine Gesamtzahl beantwortet nicht, WELCHE Mannschaft nichts bekommen
       hat, und das ist die Frage beim Nachsehen. */
    const { zahlen } = fasseLauf(teile);
    const d = fuersProtokoll("dev.fcherrliberg.ch", zahlen, teile);
    expect(d.teams).toEqual(["38309", "38310"]);
    expect(d.je_team).toEqual([
      { team: "38309", gesendet: 2, dauer_ms: 1200, neu: 1, aktualisiert: 1,
        zurueckgezogen: 0, gescheitert: false },
      /* ⚠ Auch die gescheiterte Mannschaft traegt ihre Dauer — sie sagt, ob
         der Teil sofort abgewiesen wurde oder in ein Zeitlimit lief. */
      { team: "38310", gesendet: 3, dauer_ms: 31000, neu: 0, aktualisiert: 0,
        zurueckgezogen: 0, gescheitert: true },
    ]);
    expect(d.ziel_host).toBe("dev.fcherrliberg.ch");
    expect(d.teams_gescheitert).toBe(1);
  });

  it("behaelt die Dubletten-Meldung als Zahlenpaar", () => {
    const { zahlen } = fasseLauf(teile);
    const d = fuersProtokoll("h", zahlen, teile);
    expect(d.moegliche_dubletten).toEqual([{ neu: 51, von_hand: 12 }]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Was ankommt und niemand schreibt, erreicht die Anzeige (10.09.2026)

   ⚠ ANLASS. Der Empfänger meldet `unbeachtete_felder` seit 0.7.0 — und
   unsere Seite las es an KEINER Stelle. `liga` kam ein halbes Jahr an
   und wurde verworfen; WO es riss, musste die Website-Seite von Hand
   messen. **Ein Melder, den niemand abholt, ist selbst die Lücke, gegen
   die er gebaut wurde.**
   ══════════════════════════════════════════════════════════════════════ */
describe("unbeachtete_felder erreichen den Lauf", () => {
  const teil = (id: string, felder: string[]) => ({
    sfv_team_id: id, gesendet: 1, fehler: null,
    wp: { neu: 1, aktualisiert: 0, unbeachtete_felder: felder },
  });

  it("nimmt sie aus der Antwort des Empfängers", () => {
    const { zahlen } = fasseLauf([teil("38309", ["liga"])]);
    expect(zahlen.unbeachtete_felder).toEqual(["liga"]);
  });

  it("⚠ vereinigt über alle Mannschaften, statt sie 21-mal zu nennen", () => {
    const { zahlen } = fasseLauf([
      teil("1", ["liga"]), teil("2", ["liga"]), teil("3", ["liga", "zuschauer"]),
    ]);
    expect(zahlen.unbeachtete_felder).toEqual(["liga", "zuschauer"]);
  });

  it("bleibt leer, wenn der Empfänger nichts meldet", () => {
    const { zahlen } = fasseLauf([teil("1", [])]);
    expect(zahlen.unbeachtete_felder).toEqual([]);
  });

  it("⚠ verträgt eine Antwort OHNE das Feld — ein alter Empfänger", () => {
    /* Vor 0.7.0 gab es den Schlüssel nicht. Eine fehlende Liste darf
       nicht als Fehler durchschlagen; sie ist schlicht leer. */
    const alt = { sfv_team_id: "1", gesendet: 1, fehler: null, wp: { neu: 1 } };
    expect(fasseLauf([alt]).zahlen.unbeachtete_felder).toEqual([]);
  });
});
