/* ══════════════════════════════════════════════════════════════════════
   Die Wechselprobe zählt, was der Verband liefert (10.09.2026)

   ⚠ Sie beantwortet EINE Frage — und die Fälle unten halten fest, dass
   sie keine zweite nebenbei beantwortet: sie gibt keine Namen heraus,
   und sie zählt den Gegner nicht mit.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  fasseWechselProbe, deuteWechselProbe, TYP_WECHSEL_SFV,
  fasseCupProbe, deuteCupProbe,
} from "../wechselProbe.ts";

const UNSERE = 11057;
const FREMD = 11030;

const wechsel = (ueber: Record<string, unknown> = {}) => ({
  eventTypeId: TYP_WECHSEL_SFV, clubNumber: UNSERE,
  personId: 1135383, personName: "Aksel Nonnez", jerseyNumber: 7,
  substitutePlayerId: null, substitutePlayerJerseyNumber: 19,
  substitutePlayerName: "Ivan Predannikov",
  substitutePlayerBirthDate: "2005-02-01", substitutePlayerPassportNumber: 4711,
  ...ueber,
});

describe("fasseWechselProbe", () => {
  it("zaehlt den Fall, um den es geht: Name ja, Kennung nein", () => {
    const b = fasseWechselProbe([wechsel()], UNSERE);
    expect(b).toMatchObject({
      wechsel_gesamt: 1, wechsel_eigene: 1,
      mit_ersatz_id: 0, mit_ersatz_nummer: 1, mit_ersatz_name: 1,
      mit_person_id: 1,
    });
  });

  it("⚠ gibt KEINEN Namen zurueck, nur ob einer da ist", () => {
    /* Die Probe soll entscheiden, ob ein Feld etwas traegt — nicht, wie
       jemand heisst. Eine Auskunft, die mehr herausgibt als ihre Frage
       verlangt, ist der Anfang des naechsten Protokoll-Funds. */
    const roh = JSON.stringify(fasseWechselProbe([wechsel()], UNSERE));
    expect(roh).not.toContain("Ivan");
    expect(roh).not.toContain("Aksel");
    expect(roh).not.toContain("Predannikov");
  });

  it("⚠ zaehlt den GEGNER nicht mit", () => {
    const b = fasseWechselProbe([wechsel({ clubNumber: FREMD })], UNSERE);
    expect(b.wechsel_gesamt).toBe(1);
    expect(b.wechsel_eigene).toBe(0);
    expect(b.mit_ersatz_name).toBe(0);
  });

  it("laesst andere Ereignisarten weg", () => {
    const tor = wechsel({ eventTypeId: 1 });
    expect(fasseWechselProbe([tor], UNSERE).wechsel_gesamt).toBe(0);
  });

  it("nennt hoechstens drei Beispiele — und darin keine Namen", () => {
    const b = fasseWechselProbe([wechsel(), wechsel(), wechsel(), wechsel()], UNSERE);
    expect(b.wechsel_eigene).toBe(4);
    expect(b.beispiele).toHaveLength(3);
    expect(b.beispiele[0]).toEqual({
      person_id: 1135383, rueckennr: 7,
      ersatz_id: null, ersatz_nr: 19, ersatz_name_vorhanden: true,
    });
  });

  it("⚠ ohne Clubnummer gilt niemand als eigen", () => {
    /* Das ist kein Fehler dieser Funktion, sondern die Bedingung dafuer,
       dass ihre Zahlen etwas heissen. Der Aufrufer bricht deshalb ab,
       statt eine Null zu melden. */
    expect(fasseWechselProbe([wechsel()], null).wechsel_eigene).toBe(0);
  });
});

describe("deuteWechselProbe", () => {
  const b = (ueber: Record<string, number> = {}) => ({
    wechsel_gesamt: 5, wechsel_eigene: 5,
    mit_ersatz_id: 0, mit_ersatz_nummer: 5, mit_ersatz_name: 0,
    mit_person_id: 5, beispiele: [], ...ueber,
  });

  it("⚠ sagt AUSDRUECKLICH, wenn sie nichts gesehen hat", () => {
    /* Null Wechsel und null Namen sehen in einer Zahlenreihe gleich aus.
       Ohne diesen Satz laese jemand „keine Namen" als Befund, wo gar
       nichts geprueft wurde. */
    expect(deuteWechselProbe(b({ wechsel_eigene: 0 }))).toMatch(/sagt nichts/);
  });

  it("bei vorhandener Kennung: keine neue Spalte noetig", () => {
    expect(deuteWechselProbe(b({ mit_ersatz_id: 5 }))).toMatch(/keine neue Spalte/);
  });

  it("bei Name ohne Kennung: eigene Spalte, keine Zuordnung", () => {
    const t = deuteWechselProbe(b({ mit_ersatz_name: 5 }));
    expect(t).toMatch(/eigene Spalte/);
    expect(t).toMatch(/NICHT möglich/);
  });

  it("bei nur einer Nummer: der Verband loest ueber die Aufstellung auf", () => {
    expect(deuteWechselProbe(b())).toMatch(/Aufstellung/);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Cupprobe — was steht statt eines Gruppennamens? (10.09.2026)
   ══════════════════════════════════════════════════════════════════════ */
describe("fasseCupProbe", () => {
  const meisterschaft = {
    matchTypeName: "Meisterschaft", leagueName: "4. Liga",
    groupName: "Gruppe  2", roundNbr: 5, playDay: 5, playDayName: "5. Runde",
  };
  const cup = {
    matchTypeName: "Cup", leagueName: "Cup AJF (4./5. Liga)",
    groupName: "", roundNbr: 1, playDay: null, playDayName: "1. Runde",
  };

  it("zaehlt nur die Spiele OHNE Gruppennamen", () => {
    const b = fasseCupProbe([meisterschaft, cup, cup]);
    expect(b.spiele_gesamt).toBe(3);
    expect(b.ohne_gruppe).toBe(2);
  });

  it("zaehlt die drei Kandidaten einzeln", () => {
    const b = fasseCupProbe([cup]);
    expect(b).toMatchObject({ mit_round_nbr: 1, mit_play_day: 0, mit_play_day_name: 1 });
  });

  it("⚠ nennt Spieltyp UND Wettbewerb nebeneinander", () => {
    /* Weil genau die zwei verwechselt werden: `matchTypeName` ist die
       Betriebsart, `leagueName` der Wettbewerb. Wer nur eines sieht,
       haelt „Cup" fuer den Namen. */
    const b = fasseCupProbe([cup]);
    expect(b.beispiele[0]).toMatchObject({
      wettbewerb: "Cup", liga: "Cup AJF (4./5. Liga)", play_day_name: "1. Runde",
    });
  });

  it("nennt hoechstens fuenf Beispiele", () => {
    const b = fasseCupProbe(Array.from({ length: 9 }, () => cup));
    expect(b.ohne_gruppe).toBe(9);
    expect(b.beispiele).toHaveLength(5);
  });
});

describe("deuteCupProbe", () => {
  const b = (ueber: Record<string, number> = {}) => ({
    spiele_gesamt: 270, ohne_gruppe: 13,
    mit_round_nbr: 0, mit_play_day: 0, mit_play_day_name: 0, beispiele: [], ...ueber,
  });

  it("⚠ sagt, wenn der Satz gar kein Cupspiel enthielt", () => {
    expect(deuteCupProbe(b({ ohne_gruppe: 0 }))).toMatch(/sagt nichts über Cupspiele/);
  });

  it("nennt die Felder, die etwas tragen", () => {
    expect(deuteCupProbe(b({ mit_play_day_name: 13 }))).toMatch(/playDayName \(13\)/);
  });

  it("sagt klar, wenn der Verband die Runde gar nicht liefert", () => {
    expect(deuteCupProbe(b())).toMatch(/nicht zu haben/);
  });
});
