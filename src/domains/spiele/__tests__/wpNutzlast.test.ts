/* ═══════════════════════════════════════════════════════════════
   Die Nutzlast für den WordPress-Export.

   ⚠ WAS DIESE DATEI ABSICHERT, IST NICHT DIE RECHNUNG, SONDERN DIE
   ÜBERSETZUNG. ClubCampus und das Theme modellieren dasselbe Spiel
   verschieden, und an jeder Nahtstelle steht eine Entscheidung, die man
   auf der Website nicht als Fehler erkennt:

     ein vertauschtes Resultat sieht aus wie ein Resultat
     ein falsch abgebildeter Zustand sieht aus wie ein Zustand
     ein fehlender Assist sieht aus wie ein Spiel ohne Assist

   Deshalb nennen die Erwartungen Werte und nicht Längen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  wpDatum, wpZeit, zerlegeResultat, bildeStatus,
  verlaufArt, verlaufMinute, bildeVerlauf, bildeSpiel, zaehleVerlaufNamen,
  TYP_WECHSEL, TYP_ASSIST, SUBTYP_ZWEITE_VERWARNUNG,
} from "../wpNutzlast.ts";
import type { SpielQuelle } from "../wpNutzlast.ts";
import type { AnzeigeEreignis } from "../matchdatenAnzeige.ts";
import { TYP_TOR, TYP_VERWARNUNG, TYP_AUSSCHLUSS } from "../matchdatenAnzeige.ts";

const e = (f: Partial<AnzeigeEreignis>): AnzeigeEreignis => ({
  id: "x", herkunft: "sfv", ersetzt_ereignis_id: null, verworfen_am: null,
  typ_id: TYP_TOR, typ: "Tor", subtyp: null, subtyp_id: null,
  minute: 10, zusatzminute: null,
  ist_eigener: true, gegner_club_name: null,
  sfv_person_id: null, rueckennr: null,
  ein_sfv_person_id: null, ein_rueckennr: null,
  vomVerein: false, original: null,
  ...f,
});
/* ⚠ KEIN `as AnzeigeEreignis`. Der Cast stand hier bis zum 05.09.2026 und
   war genau der Fehler, vor dem CLAUDE.md warnt: er liess die Attrappe ein
   Feld tragen, das der Typ gar nicht kennt (`subtyp_id`), und verdeckte
   damit, dass der Produktionscode danach griff. Aufgefallen ist es erst
   beim `deno check` der Edge Function. Ohne Cast prueft der Compiler die
   Attrappe gegen den echten Typ — und das ist ihr einziger Zweck. */

const quelle = (f: Partial<SpielQuelle> = {}): SpielQuelle => ({
  sfv_match_id: 4393132, sfv_spiel_nr: "177238",
  date: "2026-08-23", zeit: "14:00:00",
  gegner: "FC Blau-Weiss Erlenbach 1", heimspiel: true,
  venue: "Langacker", wettbewerb: "Meisterschaft", sfv_gruppe: "Gruppe 3",
  sfv_status: 2, resultat: "3:3", ht_resultat: null,
  ...f,
});

describe("Formate, die ACF erwartet", () => {
  it("gibt das Datum als Ymd, weil der date_picker return_format Ymd fuehrt", () => {
    expect(wpDatum("2026-08-23")).toBe("20260823");
  });

  it("laesst ein fehlendes Datum leer statt einen Ersatz zu erfinden", () => {
    expect(wpDatum(null)).toBe("");
  });

  it("kuerzt die Zeit auf H:i", () => {
    expect(wpZeit("14:00:00")).toBe("14:00");
  });
});

describe("Resultat zerlegen", () => {
  it("liest links Heim und rechts Gast", () => {
    expect(zerlegeResultat("3:2")).toEqual({ tore_heim: 3, tore_gast: 2 });
  });

  /* ⚠ DER FALL, DER DIESE DATEI RECHTFERTIGT.
     Die naheliegende Zeile waere ein Tausch nach `heimspiel`. Sie waere
     falsch: `spiele.resultat` ist immer scoreTeamA:scoreTeamB, und Team A
     ist das Heimteam. Ein Auswaertsspiel, das wir 1:2 verlieren, steht als
     "2:1" da — aus Sicht des Heimteams. Wer hier tauscht, dreht JEDES
     Auswaertsresultat um, und beide Fassungen sehen plausibel aus. */
  it("dreht bei einem Auswaertsspiel NICHTS um", () => {
    expect(zerlegeResultat("2:1")).toEqual({ tore_heim: 2, tore_gast: 1 });
  });

  it("gibt bei fehlendem Resultat zwei Leerwerte, nicht 0:0", () => {
    expect(zerlegeResultat(null)).toEqual({ tore_heim: null, tore_gast: null });
  });

  /* Ein Spiel ohne Resultat ist der Normalfall (angesetzt, verschoben).
     0:0 waere eine Behauptung ueber ein Spiel, das nicht stattgefunden hat. */
  it("macht aus Unfug kein 0:0", () => {
    expect(zerlegeResultat("abgesagt")).toEqual({ tore_heim: null, tore_gast: null });
    expect(zerlegeResultat("1:2:3")).toEqual({ tore_heim: null, tore_gast: null });
  });
});

describe("Zustand abbilden — zwoelf auf vier", () => {
  it("veroeffentlicht angesetzt, ausgetragen und neu angesetzt als normal", () => {
    for (const s of [1, 2, 7]) {
      expect(bildeStatus(s)).toEqual({ status: "normal", publizieren: true });
    }
  });

  it("haelt verschoben auseinander von abgesagt", () => {
    expect(bildeStatus(6)).toEqual({ status: "verschoben", publizieren: true });
  });

  it("zaehlt forfait und Nichtantritt des Gegners als forfait", () => {
    expect(bildeStatus(3).status).toBe("forfait");
    expect(bildeStatus(9).status).toBe("forfait");
  });

  /* ⚠ DIE WICHTIGSTE ZEILE DER DATEI.
     Status 12 heisst "Spiel ohne Austragung (keine Publikation)" — ein
     Veroeffentlichungsverbot des Verbands. Es darf NICHT als Feldwert
     abgebildet werden, sondern muss den Beitrag zurueckziehen. */
  it("veroeffentlicht Status 12 NICHT — das ist ein Verbot, kein Zustand", () => {
    expect(bildeStatus(12).publizieren).toBe(false);
  });

  /* ⚠ Allowlist, nicht Denylist: was der Verband morgen als 13 einfuehrt,
     ist im Zweifel nicht auf einer oeffentlichen Seite. */
  it("veroeffentlicht einen unbekannten Zustand NICHT", () => {
    expect(bildeStatus(13).publizieren).toBe(false);
    expect(bildeStatus(null).publizieren).toBe(false);
  });

  it("gibt nur Werte zurueck, die das Theme kennt", () => {
    const erlaubt = ["normal", "verschoben", "abgesagt", "forfait"];
    for (let s = 1; s <= 13; s++) {
      expect(erlaubt).toContain(bildeStatus(s).status);
    }
  });
});

describe("Verlauf — Art und Minute", () => {
  it("unterscheidet Rot von Gelb-Rot am Subtyp", () => {
    expect(verlaufArt(TYP_AUSSCHLUSS, null)).toBe("rot");
    expect(verlaufArt(TYP_AUSSCHLUSS, SUBTYP_ZWEITE_VERWARNUNG)).toBe("gelbrot");
  });

  /* ⚠ Der Verlauf des Themes kennt keinen Assist. Ihn als "tor"
     mitzuschicken hiesse, ihn in der Torschuetzenliste mitzuzaehlen. */
  it("laesst den Assist weg, statt ihn als Tor auszugeben", () => {
    expect(verlaufArt(TYP_ASSIST, null)).toBeNull();
  });

  it("kennt Tor, Gelb und Wechsel", () => {
    expect(verlaufArt(TYP_TOR, null)).toBe("tor");
    expect(verlaufArt(TYP_VERWARNUNG, null)).toBe("gelb");
    expect(verlaufArt(TYP_WECHSEL, null)).toBe("wechsel");
  });

  it("schreibt die Nachspielzeit als 45+2", () => {
    expect(verlaufMinute(45, 2)).toBe("45+2");
    expect(verlaufMinute(34, null)).toBe("34");
  });
});

describe("Verlauf — Seite und Text", () => {
  const namen = new Map<number, string>();

  it("setzt ein eigenes Tor im Heimspiel auf die Heimseite", () => {
    const z = bildeVerlauf([e({ ist_eigener: true })], true, namen, "FC Herrliberg");
    expect(z[0].seite).toBe("heim");
    expect(z[0].klub).toBe("FC Herrliberg");
  });

  /* ⚠ Der Fall, den man beim Bauen uebersieht: die Seite haengt an BEIDEN
     Werten. Ein eigenes Tor im Auswaertsspiel steht auf der Gastseite. */
  it("setzt ein eigenes Tor im Auswaertsspiel auf die Gastseite", () => {
    const z = bildeVerlauf([e({ ist_eigener: true })], false, namen, "FC Herrliberg");
    expect(z[0].seite).toBe("gast");
  });

  it("setzt ein gegnerisches Tor im Heimspiel auf die Gastseite", () => {
    const z = bildeVerlauf(
      [e({ ist_eigener: false, gegner_club_name: "FC Kuesnacht a" })],
      true, namen, "FC Herrliberg");
    expect(z[0].seite).toBe("gast");
    expect(z[0].klub).toBe("FC Kuesnacht a");
  });

  /* Ohne Zuordnung bleibt die Rueckennummer — nie die rohe personId. */
  it("nennt einen unzugeordneten Spieler bei der Nummer", () => {
    const z = bildeVerlauf(
      [e({ ist_eigener: true, sfv_person_id: 1339751, rueckennr: 9 })],
      true, namen, "FC Herrliberg");
    expect(z[0].text).toBe("Nr. 9");
    expect(z[0].text).not.toContain("1339751");
  });

  it("nennt einen zugeordneten Spieler mit vollem Namen", () => {
    const mit = new Map([[1339751, "Adrian Lustgarten"]]);
    const z = bildeVerlauf(
      [e({ ist_eigener: true, sfv_person_id: 1339751, rueckennr: 9 })],
      true, mit, "FC Herrliberg");
    expect(z[0].text).toBe("Adrian Lustgarten");
  });

  it("nennt beim Gegner die Mannschaft und keine Person", () => {
    const z = bildeVerlauf(
      [e({ ist_eigener: false, gegner_club_name: "FC Kuesnacht a" })],
      true, namen, "FC Herrliberg");
    expect(z[0].text).toBe("FC Kuesnacht a");
  });

  /* ⚠ Die Feldbeschreibung im Theme verbietet das Rechnen ausdruecklich:
     "eine gerechnete Zahl, die von der eingetragenen abweicht, waere
     schlimmer als keine." */
  it("laesst den Zwischenstand leer statt ihn zu rechnen", () => {
    const z = bildeVerlauf(
      [e({ minute: 10 }), e({ minute: 20 }), e({ minute: 30 })],
      true, namen, "FC Herrliberg");
    expect(z.map(x => x.stand)).toEqual(["", "", ""]);
  });
});

describe("Subtyp — der Klartext von Subtyp 0 ist ein Strich", () => {
  const namen = new Map<number, string>();

  /* ⚠ „-" ist kein leerer Wert, sondern der Klartext zu Subtyp 0 in den
     SFV-Stammdaten. Ohne Pruefung stuende „FC Kuesnacht a · -" auf der
     Website — aufgefallen in der Probe vom 05.09.2026. */
  it("haengt einen Subtyp «-» NICHT an", () => {
    const z = bildeVerlauf(
      [e({ ist_eigener: false, gegner_club_name: "FC Kuesnacht a", subtyp: "-" })],
      true, namen, "FC Herrliberg");
    expect(z[0].text).toBe("FC Kuesnacht a");
  });

  it("haengt einen echten Subtyp an", () => {
    const z = bildeVerlauf(
      [e({ ist_eigener: false, gegner_club_name: "FC Kuesnacht a", subtyp: "Kopftor" })],
      true, namen, "FC Herrliberg");
    expect(z[0].text).toBe("FC Kuesnacht a · Kopftor");
  });
});

describe("Klarnamen zaehlen — die Zahl vor dem scharfen Lauf", () => {
  const gegner = e({ ist_eigener: false, gegner_club_name: "FC Kuesnacht a" });
  const offen  = e({ ist_eigener: true, sfv_person_id: 111, rueckennr: 13 });
  const zug    = e({ ist_eigener: true, sfv_person_id: 222, rueckennr: 7 });
  const namen  = new Map([[222, "Adrian Lustgarten"]]);

  /* ⚠ DER FALL, DER DEN ZAEHLER GEKOSTET HAT.
     Die erste Fassung prueft den Ausgabetext auf „beginnt nicht mit Nr. "
     und zaehlte damit jede Gegnerzeile mit — 431 statt 0. Ein
     Vereinsname ist kein Personenname. */
  it("zaehlt eine Gegnerzeile NICHT als Personennamen", () => {
    const z = zaehleVerlaufNamen([gegner, gegner], new Map());
    expect(z.mit_personenname).toBe(0);
    expect(z.mit_gegnername).toBe(2);
  });

  it("zaehlt einen unzugeordneten eigenen Spieler als Rueckennummer", () => {
    expect(zaehleVerlaufNamen([offen], namen).mit_rueckennummer).toBe(1);
    expect(zaehleVerlaufNamen([offen], namen).mit_personenname).toBe(0);
  });

  it("zaehlt einen zugeordneten eigenen Spieler als Personennamen", () => {
    expect(zaehleVerlaufNamen([zug], namen).mit_personenname).toBe(1);
  });

  it("meldet ohne jede Zuordnung null Personennamen", () => {
    expect(zaehleVerlaufNamen([gegner, offen, zug], new Map()).mit_personenname).toBe(0);
  });

  /* ⚠ DIE GEGENPROBE, die den Zaehler an bildeVerlauf bindet: gehen die
     beiden auseinander, misst einer etwas anderes als der andere. */
  it("die drei Zahlen ergeben zusammen die Zeilen aus bildeVerlauf", () => {
    const alle = [
      gegner, offen, zug,
      e({ typ_id: TYP_ASSIST }),                    // faellt in beiden weg
      e({ typ_id: TYP_VERWARNUNG, ist_eigener: true, sfv_person_id: 222 }),
    ];
    const z = zaehleVerlaufNamen(alle, namen);
    const summe = z.mit_personenname + z.mit_rueckennummer + z.mit_gegnername;
    expect(summe).toBe(bildeVerlauf(alle, true, namen, "FC Herrliberg").length);
  });
});

describe("Das ganze Spiel", () => {
  it("baut die Felder so, wie das Theme sie fuehrt", () => {
    const s = bildeSpiel(quelle(), 42, [], new Map(), "FC Herrliberg");
    expect(s).not.toBeNull();
    expect(s!.datum).toBe("20260823");
    expect(s!.zeit).toBe("14:00");
    expect(s!.fch_team).toBe(42);
    expect(s!.heim_auswaerts).toBe("heim");
    expect(s!.tore_heim).toBe(3);
    expect(s!.tore_gast).toBe(3);
    expect(s!.status).toBe("normal");
    expect(s!.publizieren).toBe(true);
  });

  /* ⚠ `fch_team` ist die WordPress-Beitrags-Id, NICHT die SFV-Teamnummer.
     Beide sind Zahlen, beide sehen plausibel aus — dieselbe
     Verwechslungsgefahr wie sfv_match_id gegen sfv_spiel_nr. */
  it("traegt die WordPress-Beitrags-Id des Teams, nicht die SFV-Nummer", () => {
    const s = bildeSpiel(quelle(), 42, [], new Map(), "FC Herrliberg");
    expect(s!.fch_team).toBe(42);
    expect(s!.fch_team).not.toBe(38309);
  });

  /* ⚠ Ohne Schluessel gaebe es beim naechsten Lauf einen zweiten Beitrag. */
  it("laesst ein Spiel ohne sfv_match_id ganz weg", () => {
    expect(bildeSpiel(quelle({ sfv_match_id: null }), 42, [], new Map(), "X")).toBeNull();
  });

  it("zieht ein Spiel mit Status 12 zurueck, statt es zu zeigen", () => {
    const s = bildeSpiel(quelle({ sfv_status: 12 }), 42, [], new Map(), "X");
    expect(s!.publizieren).toBe(false);
  });

  it("setzt bei einem angesetzten Spiel kein Resultat", () => {
    const s = bildeSpiel(quelle({ sfv_status: 1, resultat: null }), 42, [], new Map(), "X");
    expect(s!.tore_heim).toBeNull();
    expect(s!.tore_gast).toBeNull();
  });

  /* Vier von zehn Spielen haben keinen Verlauf — das ist der Normalfall
     und kein Fehler. Die leere Liste ersetzt den Repeater vollstaendig. */
  it("gibt bei fehlendem Verlauf eine leere Liste, nicht undefined", () => {
    const s = bildeSpiel(quelle(), 42, [], new Map(), "X");
    expect(s!.verlauf).toEqual([]);
  });
});
