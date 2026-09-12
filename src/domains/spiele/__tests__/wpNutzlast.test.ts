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
  TYP_WECHSEL, TYP_ASSIST, SUBTYP_ZWEITE_VERWARNUNG, torZusatz,
  hatDoppelabstand, sammleMarken, markeSchluessel, zaehleWechselWiderspruch,
  halbzeitWiderspruch,
  leererWechselWiderspruch,
  spielerAnzeige, rolleAus, ROLLE_ERSATZ_ID, ROLLE_KEIN_EINSATZ_ID,
  ROLLE_CAPTAIN_ID, baueAufstellung, leereAufstellungZahlen,
} from "../wpNutzlast.ts";
import { baueNummernBruecke, beschreibeGewechselten } from "../matchdatenAnzeige.ts";
import type { SpielQuelle, AufstellungQuelle, AufstellungZaehlung } from "../wpNutzlast.ts";
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
  venue: "Langacker", wettbewerb: "Meisterschaft",
  liga: "Junioren C Promotion", sfv_gruppe: "Gruppe 3",
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

describe("⚠ die Reihenfolge der Verlaufszeilen — chronologisch, und das ist eine Zusage", () => {
  /* ⚠ ⚠ ANLASS, 12.09.2026: auf der Spielseite standen die Wechsel am ENDE
     statt chronologisch, und an der Sortierung war nie etwas beauftragt.

     Gemessen: `bildeVerlauf()` sortiert NICHT — es schiebt in der
     Reihenfolge, die es bekommt. Die kommt aus `mischeEreignisse()`, und
     das sortiert nach Minute, dann Zusatzminute.

     ⚠ Damit lag die Ursache nicht bei uns. **Aber „einmal gemessen" ist
     keine Zusage** — dieser Fall macht daraus eine: er wird rot, sobald
     unsere Seite die Reihenfolge je verliert, und schliesst uns damit
     dauerhaft aus, statt bei jeder Meldung neu nachzusehen. */
  const namen = new Map<number, string>();

  it("gibt die Zeilen in der Reihenfolge heraus, in der sie ankommen", () => {
    const z = bildeVerlauf([
      e({ minute: 12, typ_id: TYP_WECHSEL, ist_eigener: true }),
      e({ minute: 46, typ_id: TYP_WECHSEL, ist_eigener: true }),
      e({ minute: 80, typ_id: TYP_WECHSEL, ist_eigener: true }),
    ], true, namen, "FC Herrliberg");
    expect(z.map((x) => x.minute)).toEqual(["12", "46", "80"]);
  });

  it("⚠ und ordnet NICHT um — ein Wechsel bleibt, wo die Minute ihn hinstellt", () => {
    /* Genau der gemeldete Eindruck: Wechsel am Ende. Käme er von uns,
       müsste bildeVerlauf() nach Art sortieren. Es tut es nicht — und
       dieser Fall hält fest, dass es dabei bleibt. */
    const z = bildeVerlauf([
      e({ minute: 20, typ_id: TYP_WECHSEL, ist_eigener: true }),
      e({ minute: 35, typ_id: 1, ist_eigener: true }),
      e({ minute: 55, typ_id: TYP_WECHSEL, ist_eigener: true }),
      e({ minute: 70, typ_id: 1, ist_eigener: true }),
    ], true, namen, "FC Herrliberg");
    expect(z.map((x) => x.minute)).toEqual(["20", "35", "55", "70"]);
    /* ⚠ ⚠ DIE ARTEN STEHEN VERSCHRÄNKT, nicht geblockt — und die Erwartung
       nennt die Reihenfolge, statt ein Muster auszuschliessen.

       Hier stand zuerst `.not.toMatch(/^(wechsel,)+tor/)`, und das traf
       genau den erlaubten Fall: „wechsel,tor,wechsel,tor" beginnt mit
       `wechsel,` und dann `tor`. **Eine negativ definierte Erwartung
       prüft, was sie ausschliessen wollte** — dieselbe Familie wie der
       Zähler, der 431 statt 0 meldete. */
    expect(z.map((x) => x.art)).toEqual(["wechsel", "tor", "wechsel", "tor"]);
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
    expect(z.mit_eigenem_namen).toBe(0);
    expect(z.mit_gegnername).toBe(2);
  });

  it("zaehlt einen unzugeordneten eigenen Spieler als Rueckennummer", () => {
    expect(zaehleVerlaufNamen([offen], namen).mit_rueckennummer).toBe(1);
    expect(zaehleVerlaufNamen([offen], namen).mit_eigenem_namen).toBe(0);
  });

  it("zaehlt einen zugeordneten eigenen Spieler als Personennamen", () => {
    expect(zaehleVerlaufNamen([zug], namen).mit_eigenem_namen).toBe(1);
  });

  it("meldet ohne jede Zuordnung null Personennamen", () => {
    expect(zaehleVerlaufNamen([gegner, offen, zug], new Map()).mit_eigenem_namen).toBe(0);
  });

  /* ⚠ DIE GEGENPROBE, die den Zaehler an bildeVerlauf bindet: gehen die
     beiden auseinander, misst einer etwas anderes als der andere. */
  it("die vier Zahlen ergeben zusammen die Zeilen aus bildeVerlauf", () => {
    const alle = [
      gegner, offen, zug,
      e({ typ_id: TYP_ASSIST }),                    // faellt in beiden weg
      e({ typ_id: TYP_VERWARNUNG, ist_eigener: true, sfv_person_id: 222 }),
    ];
    const z = zaehleVerlaufNamen(alle, namen);
    const summe = z.mit_eigenem_namen + z.mit_sfv_namen
      + z.mit_rueckennummer + z.mit_gegnername;
    expect(summe).toBe(bildeVerlauf(alle, true, namen, "FC Herrliberg").length);
  });
});

describe("Das ganze Spiel", () => {
  it("baut die Felder so, wie das Theme sie fuehrt", () => {
    const s = bildeSpiel(quelle(), "38309", [], new Map(), "FC Herrliberg");
    expect(s).not.toBeNull();
    expect(s!.datum).toBe("20260823");
    expect(s!.zeit).toBe("14:00");
    expect(s!.sfv_team_id).toBe("38309");
    expect(s!.heim_auswaerts).toBe("heim");
    expect(s!.tore_heim).toBe(3);
    expect(s!.tore_gast).toBe(3);
    expect(s!.status).toBe("normal");
    expect(s!.publizieren).toBe(true);
  });

  /* ⚠ UMGEDREHT AM 05.09.2026. Hier stand die WordPress-Beitrags-Id, und
     die kann der Export gar nicht kennen: `sfv_id` ist am Team-Beitrag
     nicht ueber REST lesbar und soll es auch nicht werden. Die Aufloesung
     macht das Plugin, das die Tatsache besitzt. */
  it("traegt die SFV-Teamnummer, nicht die WordPress-Beitrags-Id", () => {
    const s = bildeSpiel(quelle(), "38309", [], new Map(), "FC Herrliberg");
    expect(s!.sfv_team_id).toBe("38309");
  });

  /* ⚠ Ohne Schluessel gaebe es beim naechsten Lauf einen zweiten Beitrag. */
  it("laesst ein Spiel ohne sfv_match_id ganz weg", () => {
    expect(bildeSpiel(quelle({ sfv_match_id: null }), "38309", [], new Map(), "X")).toBeNull();
  });

  it("zieht ein Spiel mit Status 12 zurueck, statt es zu zeigen", () => {
    const s = bildeSpiel(quelle({ sfv_status: 12 }), "38309", [], new Map(), "X");
    expect(s!.publizieren).toBe(false);
  });

  it("setzt bei einem angesetzten Spiel kein Resultat", () => {
    const s = bildeSpiel(quelle({ sfv_status: 1, resultat: null }), "38309", [], new Map(), "X");
    expect(s!.tore_heim).toBeNull();
    expect(s!.tore_gast).toBeNull();
  });

  /* Vier von zehn Spielen haben keinen Verlauf — das ist der Normalfall
     und kein Fehler. Die leere Liste ersetzt den Repeater vollstaendig. */
  it("gibt bei fehlendem Verlauf eine leere Liste, nicht undefined", () => {
    const s = bildeSpiel(quelle(), "38309", [], new Map(), "X");
    expect(s!.verlauf).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════
   Liga und Gruppe je Spiel (10.09.2026)

   ⚠ Auf der Website stand ueber jedem Spiel „MEISTERSCHAFT" — der
   SPIELTYP. Die Liga („Junioren C Promotion") lag seit dem
   14.08.2026 in `spiele.liga` und wurde weder gelesen noch
   gesendet; die Gruppe kam an, aber unter dem Namen `runde`.
   ═══════════════════════════════════════════════════════════════ */
describe("Liga und Gruppe je Spiel", () => {
  it("schickt die Liga mit — sie ist nicht der Wettbewerb", () => {
    const s = bildeSpiel(quelle(), "38309", [], new Map(), "FC Herrliberg");
    expect(s?.liga).toBe("Junioren C Promotion");
    expect(s?.wettbewerb).toBe("Meisterschaft");
  });

  it("⚠ `runde` traegt den GRUPPENNAMEN, nicht eine Runde", () => {
    /* Der Feldname stammt aus dem Theme und ist aelter als der Inhalt.
       Umbenennen hiesse, den Vertrag mit der Vorlage zu brechen — wer
       ihn liest, muss wissen, was drinsteht. Dieselbe Falle wie ein
       Endpunkt, der „Teams" heisst und Teams mit Rangliste liefert. */
    const s = bildeSpiel(quelle(), "38309", [], new Map(), "FC Herrliberg");
    expect(s?.runde).toBe("Gruppe 3");
  });

  it("macht aus fehlender Liga einen leeren Text, keinen Ausfall", () => {
    const s = bildeSpiel(quelle({ liga: null }), "38309", [], new Map(), "FC Herrliberg");
    expect(s?.liga).toBe("");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Der SFV-Name ist der RUECKFALL, nicht die Wahrheit (10.09.2026)

   ⚠ Diese Faelle halten fest, was der Zaehler NICHT tun darf: die
   beiden Sorten Name in einen Topf werfen. Ohne sie meldete er bei 308
   SFV-Namen und 0 Zuordnungen einen Erfolg der Zuordnungsarbeit, die
   nicht stattgefunden hat.
   ══════════════════════════════════════════════════════════════════════ */
describe("zaehleVerlaufNamen — zugeordnet gegen SFV-Rueckfall", () => {
  const eig = e({ typ_id: TYP_TOR, ist_eigener: true, sfv_person_id: 222, rueckennr: 9 });
  const sfv = e({ typ_id: TYP_TOR, ist_eigener: true, sfv_person_id: 333, rueckennr: 4 });
  const nix = e({ typ_id: TYP_TOR, ist_eigener: true, sfv_person_id: 444, rueckennr: 7 });

  const ZUGEORDNET = new Set([222]);
  const SFV_NAMEN  = new Set([222, 333]);   // 222 hat BEIDES

  it("⚠ zaehlt einen zugeordneten Spieler NICHT als SFV-Namen, obwohl beides da ist", () => {
    /* Der Kern: 222 steht in beiden Mengen. Die Reihenfolge entscheidet,
       und sie muss dieselbe sein wie in der Anzeige. */
    const z = zaehleVerlaufNamen([eig], ZUGEORDNET, SFV_NAMEN);
    expect(z).toMatchObject({ mit_eigenem_namen: 1, mit_sfv_namen: 0, mit_rueckennummer: 0 });
  });

  it("zaehlt den Rueckfall getrennt", () => {
    const z = zaehleVerlaufNamen([sfv], ZUGEORDNET, SFV_NAMEN);
    expect(z).toMatchObject({ mit_eigenem_namen: 0, mit_sfv_namen: 1, mit_rueckennummer: 0 });
  });

  it("wer in keiner Menge steht, bleibt eine Rueckennummer", () => {
    const z = zaehleVerlaufNamen([nix], ZUGEORDNET, SFV_NAMEN);
    expect(z).toMatchObject({ mit_eigenem_namen: 0, mit_sfv_namen: 0, mit_rueckennummer: 1 });
  });

  it("⚠ ohne zweite Menge zaehlt sie wie vorher — kein SFV-Name ist kein Fehler", () => {
    /* Der Aufruf mit einem Argument muss weiter das Alte tun, sonst
       kippt die Bedeutung an jeder Stelle, die noch nicht umgestellt ist. */
    const z = zaehleVerlaufNamen([eig, sfv, nix], ZUGEORDNET);
    expect(z).toMatchObject({ mit_eigenem_namen: 1, mit_sfv_namen: 0, mit_rueckennummer: 2 });
  });

  it("die vier Zahlen ergeben auch mit Rueckfall die Zeilenzahl", () => {
    const alle = [eig, sfv, nix, e({ typ_id: TYP_TOR, ist_eigener: false })];
    const z = zaehleVerlaufNamen(alle, ZUGEORDNET, SFV_NAMEN);
    const summe = z.mit_eigenem_namen + z.mit_sfv_namen
      + z.mit_rueckennummer + z.mit_gegnername;
    expect(summe).toBe(bildeVerlauf(alle, true, new Map(), "FC Herrliberg").length);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Der Ausgewechselte ist auch ein Mensch (10.09.2026)

   ⚠ ANLASS, gemeldet von Didi: „52' Abdulah Al Abbadie · für Nr. 9".
   Zwei eigene Spieler in einer Zeile, einer mit Namen, einer mit Nummer.
   Die Id lag seit dem ersten Matchdaten-Lauf in der Datenbank
   (`ein_sfv_person_id`, aus `substitutePlayerId`) und wurde von keiner
   Anzeigestelle gelesen.
   ══════════════════════════════════════════════════════════════════════ */
describe("Wechsel — beide Menschen werden genannt", () => {
  /* ⚠ Die RICHTUNG steht seit dem 10.09.2026 fest und ist gemessen, nicht
     angenommen: personId geht vom Platz, substitutePlayer kommt fuer ihn.
     Der Wortlaut folgt dem Verband („X ersetzt durch Y"), damit sich
     beide Seiten ohne Uebersetzung vergleichen lassen. */
  const wechsel = (ueber = {}) => e({
    typ_id: TYP_WECHSEL, ist_eigener: true,
    sfv_person_id: 222, rueckennr: 11,
    ein_sfv_person_id: 333, ein_rueckennr: 9,
    ...ueber,
  });
  const NAMEN = new Map([[222, "Abdulah Al Abbadie"], [333, "Luca Meier"]]);

  it("nennt den Ausgewechselten beim Namen statt bei der Nummer", () => {
    const [z] = bildeVerlauf([wechsel()], true, NAMEN, "FC Herrliberg");
    expect(z.text).toBe("Abdulah Al Abbadie ersetzt durch Luca Meier");
  });

  it("faellt auf die Nummer zurueck, solange sein Name fehlt", () => {
    const nur222 = new Map([[222, "Abdulah Al Abbadie"]]);
    const [z] = bildeVerlauf([wechsel()], true, nur222, "FC Herrliberg");
    expect(z.text).toBe("Abdulah Al Abbadie ersetzt durch Nr. 9");
  });

  it("⚠ nennt ihn gar nicht, wenn weder Id noch Nummer da sind", () => {
    /* „für Nr. null" waere schlimmer als ihn wegzulassen: es behauptete
       eine Angabe, die es nicht gibt. */
    const [z] = bildeVerlauf(
      [wechsel({ ein_sfv_person_id: null, ein_rueckennr: null })], true, NAMEN, "FC Herrliberg");
    expect(z.text).toBe("Abdulah Al Abbadie");
  });

  it("zaehlt den zweiten Namen — ausserhalb der Aufteilung", () => {
    const z = zaehleVerlaufNamen([wechsel()], new Set([222, 333]));
    expect(z.zeilen_mit_zweitem_namen).toBe(1);
    /* ⚠ Die Gegenprobe bleibt intakt: die VIER Zahlen zaehlen Zeilen. */
    const summe = z.mit_eigenem_namen + z.mit_sfv_namen
      + z.mit_rueckennummer + z.mit_gegnername;
    expect(summe).toBe(1);
  });

  it("⚠ zaehlt beim GEGNER keinen zweiten Namen", () => {
    /* Der Constraint erzwingt dort null — eine Preisgabe, die es nicht
       geben kann, darf der Zaehler nicht melden. */
    const fremd = wechsel({ ist_eigener: false, ein_sfv_person_id: null, ein_rueckennr: null });
    expect(zaehleVerlaufNamen([fremd], new Set([333])).zeilen_mit_zweitem_namen).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   „Gruppe  2" — der Doppelabstand des Verbands (10.09.2026)

   Gemeldet von der Website-Seite: in allen 270 Etiketten. Der Wert kommt
   so vom Verband. Wir aendern ihn in UNSERER Ausgabe und zaehlen, wie oft
   — die Rohform bleibt in spiele.sfv_gruppe stehen.
   ══════════════════════════════════════════════════════════════════════ */
describe("Der Doppelabstand des Verbands bleibt stehen", () => {
  /* ⚠ Entscheidung Didi, 10.09.2026 — und eine Umkehr meines eigenen
     Vorschlags vom Vortag. Fremde Daten stillschweigend zu putzen
     versteckt den Fehler; der Doppelabstand steht auf der Website und
     ist damit die einzige Stelle, an der er jemandem auffaellt. */
  it("⚠ die Nutzlast traegt den Wert UNVERAENDERT", () => {
    const s = bildeSpiel(quelle({ sfv_gruppe: "Gruppe  2" }), "38309", [], new Map(), "FC Herrliberg");
    expect(s!.runde).toBe("Gruppe  2");
  });

  it("meldet ihn trotzdem", () => {
    expect(hatDoppelabstand("Gruppe  2")).toBe(true);
    expect(hatDoppelabstand("Gruppe 2")).toBe(false);
  });

  it("⚠ meldet bei LEER nichts — sonst zaehlte der Cup-Fall mit", () => {
    expect(hatDoppelabstand(null)).toBe(false);
    expect(hatDoppelabstand("")).toBe(false);
  });
});

describe("Cupspiele: `runde` bleibt LEER, nicht der Wochentag", () => {
  /* ⚠ Hier stand einen Tag lang ein Rueckfall auf `sfv_runde`, und der
     war der Wochentag: 36 Spiele zeigten „CUP · SAMSTAG", waehrend links
     daneben schon „Sa. 19.09. · 19:30" stand. `playDayName` ist der
     Spieltag, nicht die Runde — gemessen, nicht angenommen. */
  it("⚠ ohne Gruppe bleibt runde leer", () => {
    const s = bildeSpiel(quelle({ sfv_gruppe: null }), "38309", [], new Map(), "FC Herrliberg");
    expect(s!.runde).toBe("");
  });

  it("die Gruppe kommt unveraendert durch", () => {
    const s = bildeSpiel(quelle({ sfv_gruppe: "Gruppe  2" }), "38309", [], new Map(), "FC Herrliberg");
    expect(s!.runde).toBe("Gruppe  2");
  });

  it("⚠ SpielQuelle kennt kein Feld, aus dem ein Wochentag kaeme", () => {
    /* Die staerkste Form: der Rueckfall kann nicht zurueckkommen, weil
       der Typ die Quelle gar nicht mehr fuehrt. */
    const q = quelle({ sfv_gruppe: null }) as unknown as Record<string, unknown>;
    expect("sfv_runde" in q).toBe(false);
    expect("sfv_spieltag" in q).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Der offene Rest wird beziffert — und getrennt (10.09.2026)

   ⚠ Didis Messung: der Nachtrag holte 22 Spiele, der Sync holt 10 je
   Lauf; 13 Wechsel stammen aus Spielen dazwischen. Damit die Zahl beim
   naechsten Mal ohne Rechnung dasteht, steht sie in der VORSCHAU — nicht
   in einer eigenen Aktion:

     > Eine Zahl, für die man einen eigenen Aufruf braucht, liest
     > niemand.

   ⚠ Und sie steht ZWEIGETEILT da, weil die zwei Ursachen an
   verschiedene Stellen schicken. „13 offen" allein schickte niemanden
   irgendwohin.
   ══════════════════════════════════════════════════════════════════════ */
describe("Wechsel — der offene Rest, nach Ursache getrennt", () => {
  const w = (ueber = {}) => e({
    typ_id: TYP_WECHSEL, ist_eigener: true, sfv_person_id: 222, rueckennr: 11,
    ein_sfv_person_id: 333, ein_rueckennr: 9, ...ueber,
  });

  it("ohne Kennung → wechselnachtrag", () => {
    const z = zaehleVerlaufNamen([w({ ein_sfv_person_id: null })], new Set([222]), new Set([333]));
    expect(z).toMatchObject({ zeilen_ohne_ersatzkennung: 1, zeilen_ohne_ersatzname: 0 });
  });

  it("Kennung ja, Name nein → namen", () => {
    const z = zaehleVerlaufNamen([w()], new Set([222]), new Set());
    expect(z).toMatchObject({ zeilen_ohne_ersatzkennung: 0, zeilen_ohne_ersatzname: 1 });
  });

  it("beides da → keine der zwei Zahlen steigt", () => {
    const z = zaehleVerlaufNamen([w()], new Set([222]), new Set([333]));
    expect(z).toMatchObject({
      zeilen_mit_zweitem_namen: 1, zeilen_ohne_ersatzkennung: 0, zeilen_ohne_ersatzname: 0,
    });
  });

  it("⚠ die drei schliessen einander aus — jede Zeile zaehlt genau einmal", () => {
    /* Sonst waere die Summe groesser als die Zahl der Wechsel, und
       niemand koennte sie gegen etwas halten. */
    const alle = [w(), w({ ein_sfv_person_id: null }), w({ ein_sfv_person_id: 444 })];
    const z = zaehleVerlaufNamen(alle, new Set([222]), new Set([333]));
    expect(z.zeilen_mit_zweitem_namen + z.zeilen_ohne_ersatzkennung
      + z.zeilen_ohne_ersatzname).toBe(3);
  });

  it("⚠ beim GEGNER steigt keine der drei", () => {
    const fremd = w({ ist_eigener: false, ein_sfv_person_id: null, ein_rueckennr: null });
    const z = zaehleVerlaufNamen([fremd], new Set([222]), new Set([333]));
    expect(z.zeilen_ohne_ersatzkennung).toBe(0);
    expect(z.zeilen_ohne_ersatzname).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Tore und Karten an der Aufstellungszeile (10.09.2026)

   ⚠ Gerechnet, nicht gespeichert — Entscheid Didi: „die Zuordnung ist
   eine Rechnung, keine Darstellung."
   ══════════════════════════════════════════════════════════════════════ */
describe("sammleMarken", () => {
  const tor = (u = {}) => e({ typ_id: TYP_TOR, ist_eigener: true, sfv_person_id: 222, minute: 11, ...u });
  const gelb = (u = {}) => e({ typ_id: TYP_VERWARNUNG, ist_eigener: true, sfv_person_id: 222, minute: 40, ...u });

  it("zählt Tore und Karten je Spieler, mit Minute", () => {
    const r = sammleMarken([tor(), gelb()]);
    const z = r.je_spieler.get("p:222")!;
    expect(z).toMatchObject({ tore: 1, gelb: 1, gelbrot: 0, rot: 0 });
    expect(z.marken.map(m => `${m.art}${m.minute}`)).toEqual(["tor11", "gelb40"]);
  });

  it("⚠ ordnet den GEGNER über die Rückennummer zu, nicht über die Person", () => {
    /* Die Person ist beim Gegner verboten — die Nummer ist die einzige
       Angabe, die es gibt. */
    const g = tor({ ist_eigener: false, sfv_person_id: null, rueckennr: 7 });
    const r = sammleMarken([g]);
    expect(r.je_spieler.get("n:7")!.tore).toBe(1);
    expect(r.ohne_zuordnung).toBe(0);
  });

  it("⚠ zählt, was sich NIEMANDEM zuordnen lässt", () => {
    /* Ein Gegnertor ohne Nummer ist kein Fehler, aber es darf nicht still
       wegfallen: eine Aufstellung ohne Symbole und eine ohne zuordenbare
       Ereignisse sähen sonst gleich aus. */
    const g = tor({ ist_eigener: false, sfv_person_id: null, rueckennr: null });
    const r = sammleMarken([g]);
    expect(r.ohne_zuordnung).toBe(1);
    expect(r.je_spieler.size).toBe(0);
  });

  it("⚠ meldet einen unbekannten Ereignistyp, statt ihn zu überspringen", () => {
    /* Gemessen ist nur Typ 1 an einer echten Antwort. Taucht ein Typ auf,
       den verlaufArt() nicht kennt, soll er AUFFALLEN. */
    const r = sammleMarken([tor({ typ_id: 77 })]);
    expect(r.unbekannte_typen).toEqual([77]);
  });

  it("⚠ ein Assist ist NICHT unbekannt — er hat nur kein Symbol", () => {
    /* Ohne diese Unterscheidung meldete jeder Assist einen „unbekannten
       Typ", und ein Melder, der immer dasselbe sagt, wird nicht gelesen. */
    const r = sammleMarken([tor({ typ_id: TYP_ASSIST })]);
    expect(r.unbekannte_typen).toEqual([]);
  });

  it("ein Wechsel bekommt kein Symbol", () => {
    /* Die Pfeile stehen an von_minute und bis_minute der Zeile. */
    const r = sammleMarken([tor({ typ_id: TYP_WECHSEL, ein_rueckennr: 12 })]);
    expect(r.je_spieler.size).toBe(0);
    expect(r.unbekannte_typen).toEqual([]);
  });
});

describe("markeSchluessel", () => {
  it("eigene über die Person, Gegner über die Nummer", () => {
    expect(markeSchluessel({ ist_eigener: true, sfv_person_id: 5, rueckennr: 9 })).toBe("p:5");
    expect(markeSchluessel({ ist_eigener: false, sfv_person_id: null, rueckennr: 9 })).toBe("n:9");
  });

  it("⚠ null, wo keine Zuordnung möglich ist", () => {
    expect(markeSchluessel({ ist_eigener: true, sfv_person_id: null, rueckennr: 9 })).toBeNull();
    expect(markeSchluessel({ ist_eigener: false, sfv_person_id: null, rueckennr: null })).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Eine Stelle für beide Seiten (10.09.2026)

   ⚠ Entscheid Didi: `spieler` trägt bei fehlendem Namen die Nummer —
   bei Gegnern immer, bei eigenen bis zur Zuordnung. Dieselbe Bildung,
   dieselbe Schreibweise, EIN Ort im Code. Zwei liefen auseinander.
   ══════════════════════════════════════════════════════════════════════ */
describe("spielerAnzeige", () => {
  it("nimmt den Namen, wenn es einen gibt", () => {
    expect(spielerAnzeige("Luca Meier", 10)).toBe("Luca Meier");
  });

  it("⚠ fällt auf die Nummer zurück — bei Gegnern und eigenen gleich", () => {
    expect(spielerAnzeige(null, 10)).toBe("Nr. 10");
    expect(spielerAnzeige("", 10)).toBe("Nr. 10");
    /* Dieselbe Schreibweise wie im Verlauf — sonst stünde auf derselben
       Seite zweimal etwas anderes für dieselbe Sache. */
    expect(spielerAnzeige(null, 10)).toBe("Nr. 10");
  });

  it("⚠ bleibt LEER, wo weder Name noch Nummer da ist", () => {
    /* Kein „Nr. null", kein Platzhalter: ein erfundener Text auf einer
       öffentlichen Seite ist von einer Auskunft nicht zu unterscheiden. */
    expect(spielerAnzeige(null, null)).toBe("");
    expect(spielerAnzeige("  ", null)).toBe("");
  });
});

describe("rolleAus", () => {
  /* Eine Zeile, wie sie in spiel_aufstellung steht. */
  const z = (von: number | null, bis: number | null, zeit: number | null,
             id: number | null = 0) =>
    ({ von_minute: von, bis_minute: bis, spielzeit: zeit, rolle_zuweisung_id: id });

  /* ── Die Regel (10.09.2026) ─────────────────────────────────────────
     Aus den MINUTEN, nicht aus der Zuweisung. Alle Werte hier sind
     gemessene Kombinationen aus dem Bestand, keine erfundenen. */

  it("1/90/90 ist die Startelf", () => {
    expect(rolleAus(z(1, 90, 90)).rolle).toBe("start");
    expect(rolleAus(z(1, 80, 80)).rolle).toBe("start");
  });

  it("1/46/45 ist die Startelf — ausgewechselt, nicht eingewechselt", () => {
    /* ⚠ Der Fall, an dem eine Regel auf `bis_minute` scheitern wuerde. */
    expect(rolleAus(z(1, 46, 45)).rolle).toBe("start");
  });

  it("46/90/45 ist eingewechselt", () => {
    expect(rolleAus(z(46, 90, 45)).rolle).toBe("eingewechselt");
    expect(rolleAus(z(40, 80, 40)).rolle).toBe("eingewechselt");
  });

  it("0/0/0 heisst nicht eingesetzt", () => {
    expect(rolleAus(z(0, 0, 0)).rolle).toBe("nicht_eingesetzt");
  });

  /* ── Die Zuweisung widerspricht — in beide Richtungen ──────────── */

  it("„Ersatz“ mit 90 Minuten ist Startelf, und der Widerspruch wird gezählt", () => {
    /* Gemessen: 9x 1/90/90 und 8x 1/80/80 bei assignmentRole 2. */
    const r = rolleAus(z(1, 90, 90, ROLLE_ERSATZ_ID));
    expect(r.rolle).toBe("start");
    expect(r.widerspruch).toBe(true);
  });

  it("„-“ ohne Minuten ist nicht eingesetzt, und auch das widerspricht", () => {
    /* Gemessen: 20x 0/0/0 bei assignmentRole 0. */
    const r = rolleAus(z(0, 0, 0, 0));
    expect(r.rolle).toBe("nicht_eingesetzt");
    expect(r.widerspruch).toBe(true);
  });

  it("„Kein Einsatz“ heisst genau das — kein Widerspruch", () => {
    /* ⚠ Ich hatte behauptet, die Bezeichnung sage das Gegenteil der
       Daten. Alle zehn Zeilen tragen 0/0/0. Den Irrtum erzeugt hat meine
       eigene Testbedingung: `von_minute is not null` ist bei 0 wahr. */
    const r = rolleAus(z(0, 0, 0, ROLLE_KEIN_EINSATZ_ID));
    expect(r.rolle).toBe("nicht_eingesetzt");
    expect(r.widerspruch).toBe(false);
    expect(r.unbekannt).toBeNull();
  });

  it("ein Ersatzspieler ohne Einsatz widerspricht nicht", () => {
    expect(rolleAus(z(0, 0, 0, ROLLE_ERSATZ_ID)).widerspruch).toBe(false);
  });

  /* ── Captain, Unbekanntes, Unplausibles ────────────────────────── */

  it("Captain ist ein eigenes Merkmal, kein Rollenwert", () => {
    /* ⚠ Vorher fiel die Angabe weg: rolleAus(1) gab schlicht „start"
       zurueck. Ein Captain kann eingewechselt werden — die zwei Fragen
       sind unabhaengig. */
    const r = rolleAus(z(46, 90, 45, ROLLE_CAPTAIN_ID));
    expect(r.ist_captain).toBe(true);
    expect(r.rolle).toBe("eingewechselt");
    expect(rolleAus(z(1, 90, 90, 0)).ist_captain).toBe(false);
  });

  it("⚠ ein UNBEKANNTER Zuweisungswert fällt auf", () => {
    expect(rolleAus(z(1, 90, 90, 77)).unbekannt).toBe(77);
    expect(rolleAus(z(1, 90, 90, 0)).unbekannt).toBeNull();
  });

  /* ── Die eine Korrektur an fremden Daten (10.09.2026) ───────────── */

  it("54/32 wird zu 32/54 mit Spielzeit 22", () => {
    const r = rolleAus(z(54, 32, -22));
    expect(r.von_minute).toBe(32);
    expect(r.bis_minute).toBe(54);
    expect(r.spielzeit).toBe(22);
    expect(r.korrigiert).toBe(true);
  });

  it("⚠ unplausibel bleibt gesetzt, AUCH nach der Korrektur", () => {
    /* Die Korrektur macht den Befund unsichtbar, nicht ungeschehen.
       Werden es viele, ist es ein Muster beim Verband und kein
       Tippfehler — ein Flag, das die Reparatur mitlöscht, machte aus
       einem Befund eine Datenlage. */
    expect(rolleAus(z(54, 32, -22)).unplausibel).toBe(true);
  });

  it("⚠ die Bedingung ist eng — nur bis < von", () => {
    /* Eine Spielzeit, die nicht zur Differenz passt: nicht angefasst. */
    const passtNicht = rolleAus(z(1, 90, 45));
    expect(passtNicht.korrigiert).toBe(false);
    expect(passtNicht.spielzeit).toBe(45);
    /* Werte über 90: nicht angefasst. */
    const lang = rolleAus(z(1, 150, 150));
    expect(lang.korrigiert).toBe(false);
    expect(lang.bis_minute).toBe(150);
    /* Und eine negative Spielzeit ohne verdrehte Minuten ebenfalls nicht
       — sie ist unplausibel, aber nicht diese eine Bedingung. */
    const negativ = rolleAus(z(1, 90, -5));
    expect(negativ.korrigiert).toBe(false);
    expect(negativ.spielzeit).toBe(-5);
    expect(negativ.unplausibel).toBe(true);
  });

  it("die Rolle kommt aus den KORRIGIERTEN Minuten", () => {
    /* ⚠ Sonst zeigte die Anzeige Minuten, zu denen die danebenstehende
       Rolle nicht passt — die schlechteste der drei Mischungen. */
    expect(rolleAus(z(90, 1, -89)).rolle).toBe("start");
  });

  it("⚠ negative Spielzeit wird gemeldet, nicht geglättet", () => {
    /* Gemessen: eine Zeile traegt 54/32/-22 — ausgewechselt vor der
       Einwechslung. Der Wert kommt so vom Verband; wir rechnen ihn
       nicht. Fremde Daten stillschweigend zu putzen versteckt den
       Fehler, statt ihn zu melden. */
    const r = rolleAus(z(54, 32, -22));
    expect(r.unplausibel).toBe(true);
    expect(rolleAus(z(1, 90, 90)).unplausibel).toBe(false);
  });

  it("ohne jede Minutenangabe trägt die Zuweisung — und sagt es", () => {
    const r = rolleAus(z(null, null, null, ROLLE_KEIN_EINSATZ_ID));
    expect(r.ohne_minuten).toBe(true);
    expect(r.rolle).toBe("nicht_eingesetzt");
    /* ⚠ Ohne Minuten gibt es nichts, dem die Zuweisung widersprechen
       koennte — der Zaehler bleibt sauber. */
    expect(r.widerspruch).toBe(false);
    expect(rolleAus(z(null, null, null, 0)).rolle).toBe("start");
  });
});


/* ══════════════════════════════════════════════════════════════════════
   baueAufstellung — der Aufrufer, der bis zum 10.09.2026 fehlte

   ⚠ `rolleAus`, `sammleMarken`, `markeSchluessel` und `spielerAnzeige`
   waren gebaut, geprüft und tot. Deshalb hat den vierten Rollenwert eine
   SQL-Abfrage gefunden und nicht die Meldung, die dafür gebaut war.
   ══════════════════════════════════════════════════════════════════════ */
describe("baueAufstellung", () => {
  const q = (ueber: Partial<AufstellungQuelle> = {}): AufstellungQuelle => ({
    ist_eigener: true, sfv_person_id: 100, name: "Anna Beispiel",
    rueckennr: 9, position_name: "Sturm",
    von_minute: 1, bis_minute: 90, spielzeit: 90,
    rolle_zuweisung_id: 0, ...ueber,
  });
  const keine = new Map<string, AufstellungZaehlung>();
  const keineNamen = new Map<number, string>();

  it("eine eigene Zeile trägt Name, Nummer, Position und Rolle", () => {
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung([q()], keine, true, keineNamen, zahlen);
    expect(z).toMatchObject({
      seite: "heim", nummer: 9, spieler: "Anna Beispiel",
      position: "Sturm", rolle: "start", ist_captain: false, marken: [],
    });
    expect(zahlen.zeilen_eigen).toBe(1);
    expect(zahlen.zeilen_fremd).toBe(0);
  });

  it("⚠ eine Gegnerzeile trägt KEINE Personennummer", () => {
    /* Der CHECK verbietet sie in der Datenbank; hier wird sichergestellt,
       dass die Anzeige sie auch dann nicht einsetzt, wenn eine dasteht.
       Eine Personennummer ist über dieselbe Schnittstelle in einen Namen
       aufzulösen — ein Name mit einem Zwischenschritt. */
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung(
      [q({ ist_eigener: false, sfv_person_id: 4711 })],
      keine, true, keineNamen, zahlen,
    );
    expect(z.sfv_person_id).toBeNull();
  });

  it("eine eigene Zeile trägt sie — als ZEICHENKETTE", () => {
    /* ⚠ Das Ziel des Vergleichs drüben (`f_p_sfv` am fch_person) ist
       Text. In PHP ist "1097318" === 1097318 falsch — und dann fehlen
       bei einer Zählung über 269 Spiele Zeilen, ohne dass es auffällt.
       Eine Statistik, die zu wenig zählt, sieht aus wie eine Statistik. */
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung([q()], keine, true, keineNamen, zahlen);
    expect(z.sfv_person_id).toBe("100");
    expect(typeof z.sfv_person_id).toBe("string");
  });

  it("⚠ eine Gegnerzeile trägt KEINEN Namen — auch wenn einer dasteht", () => {
    /* Entscheid B: der Verband liefert ihn, wir nehmen ihn nicht. In der
       Datenbank kann er gar nicht stehen; hier wird zusätzlich
       sichergestellt, dass die Anzeige ihn nicht doch einsetzt. */
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung(
      [q({ ist_eigener: false, name: "Fremder Name", sfv_person_id: null })],
      keine, true, keineNamen, zahlen,
    );
    expect(z.spieler).toBe("");
    expect(z.nummer).toBe(9);
    expect(z.seite).toBe("gast");
    expect(zahlen.zeilen_fremd).toBe(1);
    /* ⚠ Und sie zählt NICHT als „ohne Namen" — das wäre eine Lücke, die
       keine ist. */
    expect(zahlen.ohne_namen).toBe(0);
  });

  it("ohne Klarnamen steht „Nr. 9“, und es wird gezählt", () => {
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung([q({ name: null })], keine, true, keineNamen, zahlen);
    expect(z.spieler).toBe("Nr. 9");
    expect(zahlen.ohne_namen).toBe(1);
  });

  it("eine Zuordnung gewinnt gegen den Namen aus der SFV-Antwort", () => {
    const zahlen = leereAufstellungZahlen();
    const namen = new Map([[100, "Anna Vereinsname"]]);
    const [z] = baueAufstellung([q()], keine, true, namen, zahlen);
    expect(z.spieler).toBe("Anna Vereinsname");
  });

  it("⚠ die Symbole hängen am selben Schlüssel wie in markeSchluessel()", () => {
    /* Wer ihn hier anders bildet, zeigt Symbole an der falschen Zeile —
       und nichts schlägt fehl. */
    const zahlen = leereAufstellungZahlen();
    const m = new Map<string, AufstellungZaehlung>([
      ["p:100", { tore: 2, gelb: 1, gelbrot: 0, rot: 0, marken: [
        { art: "tor", minute: "12" }, { art: "tor", minute: "44" },
        { art: "gelb", minute: "70" },
      ] }],
      ["n:9", { tore: 1, gelb: 0, gelbrot: 0, rot: 0, marken: [
        { art: "tor", minute: "5" },
      ] }],
    ]);
    const [eigen] = baueAufstellung([q()], m, true, keineNamen, zahlen);
    expect(eigen.marken.map((x) => x.art)).toEqual(["tor", "tor", "gelb"]);
    const [fremd] = baueAufstellung(
      [q({ ist_eigener: false, sfv_person_id: null })], m, true, keineNamen,
      leereAufstellungZahlen(),
    );
    expect(fremd.marken.map((x) => x.art)).toEqual(["tor"]);
  });

  it("⚠ die MINUTE reist mit — sie ist der halbe Wert des Symbols", () => {
    /* Der Prototyp zeigt „⚽67'". Eine Zeichenkette „tor,tor,gelb" hätte
       die Minute verloren, obwohl sammleMarken() sie durch die ganze
       Kette trägt. Gefunden beim Gegenlesen der Feldliste, bevor der
       Repeater drüben angelegt war. */
    const zahlen = leereAufstellungZahlen();
    const m = new Map<string, AufstellungZaehlung>([
      ["p:100", { tore: 1, gelb: 1, gelbrot: 0, rot: 0, marken: [
        { art: "tor", minute: "67" }, { art: "gelb", minute: "45+2" },
      ] }],
    ]);
    const [z] = baueAufstellung([q()], m, true, keineNamen, zahlen);
    expect(z.marken).toEqual([
      { art: "tor", minute: "67" },
      { art: "gelb", minute: "45+2" },
    ]);
  });

  it("sortiert: Startelf, dann eingewechselt, dann ohne Einsatz", () => {
    const zahlen = leereAufstellungZahlen();
    const zeilen = baueAufstellung([
      q({ rueckennr: 3, von_minute: 0, bis_minute: 0, spielzeit: 0 }),
      q({ rueckennr: 2, von_minute: 46, bis_minute: 90, spielzeit: 45 }),
      q({ rueckennr: 1 }),
    ], keine, true, keineNamen, zahlen);
    expect(zeilen.map((z) => z.rolle))
      .toEqual(["start", "eingewechselt", "nicht_eingesetzt"]);
  });

  it("eigene Zeilen stehen vor fremden", () => {
    const zahlen = leereAufstellungZahlen();
    const zeilen = baueAufstellung([
      q({ ist_eigener: false, sfv_person_id: null, rueckennr: 4 }),
      q({ rueckennr: 5 }),
    ], keine, true, keineNamen, zahlen);
    expect(zeilen.map((z) => z.seite)).toEqual(["heim", "gast"]);
  });

  it("bei einem Auswärtsspiel dreht sich die Seite", () => {
    const zahlen = leereAufstellungZahlen();
    const [z] = baueAufstellung([q()], keine, false, keineNamen, zahlen);
    expect(z.seite).toBe("gast");
  });

  /* ── Die sieben Zahlen ───────────────────────────────────────────── */

  it("zählt Widerspruch, Unplausibles und Korrigiertes einzeln", () => {
    const zahlen = leereAufstellungZahlen();
    baueAufstellung([
      /* Zuweisung „Ersatz", aber 90 Minuten gespielt. */
      q({ rolle_zuweisung_id: ROLLE_ERSATZ_ID }),
      /* Verdrehte Minuten — korrigiert UND weiterhin unplausibel. */
      q({ von_minute: 54, bis_minute: 32, spielzeit: -22 }),
    ], keine, true, keineNamen, zahlen);
    expect(zahlen.widerspruch).toBe(1);
    expect(zahlen.unplausibel).toBe(1);
    expect(zahlen.korrigiert).toBe(1);
  });

  it("⚠ meldet einen unbekannten Zuweisungswert, statt ihn zu schlucken", () => {
    const zahlen = leereAufstellungZahlen();
    baueAufstellung([q({ rolle_zuweisung_id: 77 })], keine, true, keineNamen, zahlen);
    expect(zahlen.unbekannte_rollen).toEqual([77]);
  });

  it("⚠ eine FEHLENDE Zuweisung ist kein unbekannter Wert", () => {
    /* rolleAus meldet dafür -1 — der Zähler darf das nicht als neuen
       Verbandswert lesen, sonst stünde dort dauerhaft „-1" und niemand
       schaute mehr hin. */
    const zahlen = leereAufstellungZahlen();
    baueAufstellung([q({ rolle_zuweisung_id: null })], keine, true, keineNamen, zahlen);
    expect(zahlen.unbekannte_rollen).toEqual([]);
  });

  it("zählt Zeilen ganz ohne Minutenangabe", () => {
    const zahlen = leereAufstellungZahlen();
    baueAufstellung(
      [q({ von_minute: null, bis_minute: null, spielzeit: null })],
      keine, true, keineNamen, zahlen,
    );
    expect(zahlen.ohne_minuten).toBe(1);
  });

  it("die acht Zahlen stehen auch bei leerer Aufstellung da", () => {
    /* ⚠ Der Fall, um den es bei „immer, auch als Null" geht. */
    const zahlen = leereAufstellungZahlen();
    expect(baueAufstellung([], keine, true, keineNamen, zahlen)).toEqual([]);
    expect(zahlen).toEqual({
      zeilen_eigen: 0, zeilen_fremd: 0, ohne_namen: 0, widerspruch: 0,
      unplausibel: 0, korrigiert: 0, unbekannte_rollen: [], ohne_minuten: 0,
      /* ⚠ Alle drei, auch die, die nie vorkommt. Ein fehlender Schlüssel
         wäre von einer Null nicht zu unterscheiden. */
      rollen: { start: 0, eingewechselt: 0, nicht_eingesetzt: 0 },
    });
  });

  it("zaehlt die Rollen — und `eingewechselt` entsteht aus den Minuten", () => {
    /* ⚠ ⚠ DIE MESSUNG VOM 11.09.2026. Die Website-Seite meldete, `rolle`
       komme drüben überall als `start` oder leer an, auch dort, wo der
       Verlauf vier Auswechslungen führt. Gemessen liefert `rolleAus()`
       für 63/90/27 sauber `eingewechselt` — der Fall hält das fest,
       damit die Frage beim nächsten Mal nicht wieder bei uns beginnt. */
    const zahlen = leereAufstellungZahlen();
    baueAufstellung(
      [
        q({ von_minute: 1, bis_minute: 90, spielzeit: 90, rueckennr: 1 }),
        q({ von_minute: 63, bis_minute: 90, spielzeit: 27, rueckennr: 2 }),
        q({ von_minute: 82, bis_minute: 90, spielzeit: 8, rueckennr: 3 }),
        q({ von_minute: 0, bis_minute: 0, spielzeit: 0, rueckennr: 4 }),
      ],
      keine, true, keineNamen, zahlen,
    );
    expect(zahlen.rollen).toEqual({
      start: 1, eingewechselt: 2, nicht_eingesetzt: 1,
    });
    /* Die Summe muss die Zeilenzahl ergeben — eine Aufteilung, die
       aufgeht, prüft sich selbst. */
    const summe = Object.values(zahlen.rollen).reduce((a, b) => a + b, 0);
    expect(summe).toBe(zahlen.zeilen_eigen + zahlen.zeilen_fremd);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Die Brücke über die Rückennummer (10.09.2026)

   ⚠ ANLASS, gemessen an fünf Wechseln eines Spiels: KEIN einziges Paar
   aus `substitutePlayerId` und `personId` stimmt überein.

     Minute  Ereignis-Id  Nr.  Aufstellungs-Id  Name
      30     1266706      15   1097318          Yves Binkert
      35      476984      16    466339          Lukas Dangel
      41      954486      12    845688          Nicolas Grimm

   **`substitutePlayerId` ist kein `personId`.** Die Kennung war die
   ganze Zeit da und zeigte ins Leere.
   ══════════════════════════════════════════════════════════════════════ */
describe("baueNummernBruecke", () => {
  const z = (nr: number | null, name: string | null, eigen = true, spiel = "s1") =>
    ({ spiel_id: spiel, ist_eigener: eigen, rueckennr: nr, name });

  it("bildet spiel:nummer → Name aus eigenen Zeilen", () => {
    const b = baueNummernBruecke([z(9, "Sara Bösch"), z(12, "Nicolas Grimm")]);
    expect(b.get("s1:9")).toBe("Sara Bösch");
    expect(b.get("s1:12")).toBe("Nicolas Grimm");
  });

  it("⚠ nimmt KEINE Gegnerzeile auf", () => {
    /* Sie trägt ohnehin keinen Namen (der CHECK verbietet es) — aber die
       Brücke soll auch dann schweigen, wenn doch einer dastünde. */
    const b = baueNummernBruecke([z(9, "Fremde Spielerin", false)]);
    expect(b.size).toBe(0);
  });

  it("⚠ schweigt bei zwei Namen unter derselben Nummer", () => {
    /* Der Fall von der Website: die 9 gibt es in beiden Mannschaften.
       Eine Brücke, die rät, ist schlimmer als keine. */
    const b = baueNummernBruecke([z(9, "Sara Bösch"), z(9, "Andere Person")]);
    expect(b.has("s1:9")).toBe(false);
  });

  it("hält die Spiele auseinander", () => {
    const b = baueNummernBruecke([z(9, "A", true, "s1"), z(9, "B", true, "s2")]);
    expect(b.get("s1:9")).toBe("A");
    expect(b.get("s2:9")).toBe("B");
  });
});

describe("zaehleWechselWiderspruch — Verlauf gegen Aufstellung", () => {
  /* ⚠ ⚠ EINE ANDERE FRAGE ALS aufstellung_widerspruch. Der misst
     rolle_zuweisung gegen die Minuten INNERHALB einer Zeile; dieser misst
     /events gegen /players, also zwei Endpunkte gegeneinander.

     Bei 4395750 hätte der erste NICHT angeschlagen: Nr. 9 trug Zuweisung
     „-" und 1/70/70 — beide sagen Startelf. Gefunden wurde es über ein
     Bild auf der Website. */
  const wechselEreignis = (eigen: boolean, nr: number) =>
    ({ typ_id: 2, subtyp_id: null, ist_eigener: eigen, ein_rueckennr: nr });
  const zeile = (eigen: boolean, nr: number, von: number | null) =>
    ({ ist_eigener: eigen, sfv_person_id: null, name: null, rueckennr: nr,
       position_name: null, von_minute: von, bis_minute: 90,
       spielzeit: 90, rolle_zuweisung_id: 0 });

  it("⚠⚠ der Fall von 4395750: Verlauf sagt eingewechselt, Zeile sagt 1", () => {
    const r = zaehleWechselWiderspruch(
      [wechselEreignis(false, 9)], [zeile(false, 9, 1)],
    );
    expect(r.fremd_als_start).toBe(1);
    expect(r.fremd_als_nicht_eingesetzt).toBe(0);
  });

  it("stimmt die Zeile überein, ist es kein Widerspruch", () => {
    const r = zaehleWechselWiderspruch(
      [wechselEreignis(false, 9)], [zeile(false, 9, 40)],
    );
    expect(r).toEqual(leererWechselWiderspruch());
  });

  it("zählt eigene und fremde getrennt", () => {
    const r = zaehleWechselWiderspruch(
      [wechselEreignis(true, 5), wechselEreignis(false, 9)],
      [zeile(true, 5, 1), zeile(false, 9, 1)],
    );
    expect(r.eigen_als_start).toBe(1);
    expect(r.fremd_als_start).toBe(1);
  });

  it("⚠⚠ prüft die SEITE, nicht nur die Nummer", () => {
    /* Dieselbe Grenze wie bei der Nummern-Brücke — dort hat ihr Fehlen am
       11.09.2026 unsere Namen auf die Gegnerseite gesetzt. Ein
       gegnerisches Ereignis darf sich nicht an unserer Zeile messen. */
    const r = zaehleWechselWiderspruch(
      [wechselEreignis(false, 9)], [zeile(true, 9, 1)],
    );
    expect(r).toEqual(leererWechselWiderspruch());
  });

  it("ohne Aufstellungszeile wird nicht gezählt", () => {
    /* Eine fehlende Zeile ist eine andere Sache und keine Uneinigkeit. */
    const r = zaehleWechselWiderspruch([wechselEreignis(false, 9)], []);
    expect(r).toEqual(leererWechselWiderspruch());
  });

  it("ein Tor ist kein Wechsel", () => {
    const r = zaehleWechselWiderspruch(
      [{ typ_id: 1, subtyp_id: null, ist_eigener: true, ein_rueckennr: 9 }],
      [zeile(true, 9, 1)],
    );
    expect(r).toEqual(leererWechselWiderspruch());
  });

  it("⚠ eine Zeile OHNE JEDE Minutenangabe landet bei als_start", () => {
    /* ⚠ Der Fall, den ich beim Schreiben falsch erwartet hatte — und der
       Code hat recht.

       Trägt die Zeile weder von_minute noch bis_minute noch spielzeit,
       fällt `rolleAus()` auf die Zuweisung zurück, und die ergibt hier
       `start`. Der Verlauf sagt `eingewechselt` — also ein Widerspruch,
       und er gehört gezählt.

       ⚠ Er landet im selben Topf wie das 4395750-Muster, obwohl die Zeile
       nichts BEHAUPTET statt etwas Falsches zu behaupten. Das ist eine
       bewusste Vereinfachung: ob der Fall überhaupt vorkommt, ist
       ungemessen (`aufstellung_ohne_minuten` steht daneben und
       beantwortet genau das). **Ein eigener Topf für einen Fall, den
       niemand gemessen hat, wäre ein Zähler ohne Frage.** */
    const ohneAlles = { ist_eigener: false, sfv_person_id: null, name: null,
      rueckennr: 9, position_name: null, von_minute: null,
      bis_minute: null, spielzeit: null, rolle_zuweisung_id: 0 };
    const r = zaehleWechselWiderspruch([wechselEreignis(false, 9)], [ohneAlles]);
    expect(r.fremd_als_start).toBe(1);
  });

  it("⚠⚠ das 4378093-Muster: 0/0/0 ist NICHT dasselbe wie 1/70/70", () => {
    /* Beide Spiele zeigten keine Wechselpfeile, aus entgegengesetzten
       Gründen — und die erste Fassung dieses Zählers warf sie in einen
       Topf. Der Unterschied ist die ganze Aussage. */
    const nullNull = { ist_eigener: false, sfv_person_id: null, name: null,
      rueckennr: 9, position_name: null, von_minute: 0,
      bis_minute: 0, spielzeit: 0, rolle_zuweisung_id: 2 };
    const r = zaehleWechselWiderspruch([wechselEreignis(false, 9)], [nullNull]);
    expect(r.fremd_als_nicht_eingesetzt).toBe(1);
    expect(r.fremd_als_start).toBe(0);
  });
});

describe("beschreibeGewechselten mit Brücke", () => {
  const bruecke = new Map([["s1:9", "Sara Bösch"]]);
  /* ⚠ ⚠  `ist_eigener` STAND BIS ZUM 11.09.2026 IN KEINEM DIESER FÄLLE —
     und das ist der Grund, warum sie den Defekt nicht fangen KONNTEN.
     Die Objekte trugen zwei Felder; die Seite war nicht ausdrückbar.
     Seither ist es Pflicht im Typ. */
  const eigen = (id: number | null, nr: number | null) =>
    ({ ein_sfv_person_id: id, ein_rueckennr: nr, ist_eigener: true });
  const fremd = (id: number | null, nr: number | null) =>
    ({ ein_sfv_person_id: id, ein_rueckennr: nr, ist_eigener: false });

  it("die Karte gewinnt, wenn sie auflöst", () => {
    const namen = new Map([[500, "Aus der Zuordnung"]]);
    expect(beschreibeGewechselten(eigen(500, 9), namen, bruecke, "s1"))
      .toBe("Aus der Zuordnung");
  });

  it("⚠ die Brücke greift, wenn die Kennung ins Leere zeigt", () => {
    /* Der Normalfall, nicht die Ausnahme: 1266706 steht in keiner
       Personentabelle, die 15 aber in der Aufstellung. */
    expect(beschreibeGewechselten(eigen(1266706, 9), new Map(), bruecke, "s1"))
      .toBe("Sara Bösch");
  });

  it("ohne Brücke bleibt es bei „Nr. 9“", () => {
    expect(beschreibeGewechselten(eigen(1266706, 9), new Map())).toBe("Nr. 9");
  });

  it("⚠ eine fremde Nummer im anderen Spiel greift nicht", () => {
    expect(beschreibeGewechselten(fremd(null, 9), new Map(), bruecke, "s2"))
      .toBe("Nr. 9");
  });

  /* ══════════════════════════════════════════════════════════════════
     ⚠ ⚠  DER FALL VON DER WEBSITE — 11.09.2026, Junioren Ba – FC
     Fällanden vom 30.08. Viermal stand dort „FC Fällanden ersetzt durch
     <unser Spieler>", und derselbe Mensch wurde im selben Verlauf bei
     UNS eingewechselt.

     ⚠ WARUM DIE VORHANDENEN FÄLLE GRÜN WAREN, obwohl einer ausdrücklich
     „die 9 gibt es in beiden Mannschaften" hiess: er prüfte
     `baueNummernBruecke()` — die AUFSTELLUNGSSEITE, und die war richtig.
     Die Ereignisseite konnte kein Fall prüfen, weil die Funktion
     `ist_eigener` gar nicht entgegennahm.

     **Geprüft war die Hälfte, die gebaut wurde, nicht die, die fehlte.**
     Dieselbe Familie wie „ein Komponententest prüft die Komponente,
     nicht ihren Einbau".
     ══════════════════════════════════════════════════════════════════ */
  it("⚠⚠ ein GEGNERISCHER Wechsel bekommt NIE einen Namen aus der Brücke", () => {
    /* Die Brücke kennt s1:9 als unseren Spieler. Bei einem gegnerischen
       Wechsel mit der 9 darf sie trotzdem schweigen. */
    expect(beschreibeGewechselten(fremd(1266706, 9), new Map(), bruecke, "s1"))
      .toBe("Nr. 9");
  });

  it("⚠⚠ auch die Zuordnungskarte gilt beim Gegner nicht", () => {
    /* Die zweite Hälfte derselben Grenze: löste `ein_sfv_person_id` eines
       GEGNERISCHEN Wechsels zufällig in unserer Karte auf, stünde der
       Name genauso falsch da. Entscheid B verbietet beides. */
    const namen = new Map([[500, "Unser Spieler"]]);
    expect(beschreibeGewechselten(fremd(500, 25), namen, bruecke, "s1"))
      .toBe("Nr. 25");
  });

  it("ein gegnerischer Wechsel ohne Nummer bleibt leer", () => {
    expect(beschreibeGewechselten(fremd(null, null), new Map(), bruecke, "s1"))
      .toBe("");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Die Personennummer an der Verlaufszeile (10.09.2026)

   ⚠ Ohne sie müsste die Website den Namen aus `text` zurückparsen —
   derselbe Umweg, aus dem die 431 vermeintlichen Klarnamen entstanden,
   die in Wahrheit 0 waren.
   ══════════════════════════════════════════════════════════════════════ */
describe("bildeVerlauf — sfv_person_id", () => {
  const tor = (ueber = {}) => ({
    typ_id: 1, subtyp_id: 0, minute: 34, zusatzminute: 0,
    ist_eigener: true, sfv_person_id: 4711, rueckennr: 9,
    gegner_club_name: null, ein_sfv_person_id: null, ein_rueckennr: null,
    ...ueber,
  }) as never;

  it("eine eigene Zeile trägt sie", () => {
    const [z] = bildeVerlauf([tor()], true, new Map(), "FC Herrliberg");
    expect(z.sfv_person_id).toBe("4711");
  });

  it("⚠ eine Gegnerzeile trägt sie NICHT — auch wenn eine dasteht", () => {
    /* Der CHECK verbietet sie in der Datenbank; hier wird sichergestellt,
       dass die Nutzlast sie auch dann nicht einsetzt. Eine
       Personennummer ist über dieselbe Schnittstelle in einen Namen
       aufzulösen. */
    const [z] = bildeVerlauf(
      [tor({ ist_eigener: false, sfv_person_id: 4711,
             gegner_club_name: "FC Uster" })],
      true, new Map(), "FC Herrliberg",
    );
    expect(z.sfv_person_id).toBeNull();
    expect(z.text).toContain("FC Uster");
  });

  it("ohne Kennung bleibt sie leer, statt geraten zu werden", () => {
    const [z] = bildeVerlauf([tor({ sfv_person_id: null })], true,
      new Map(), "FC Herrliberg");
    expect(z.sfv_person_id).toBeNull();
  });
});

describe("bildeVerlauf — ein_nummer", () => {
  const wechsel = (ueber = {}) => ({
    typ_id: 2, subtyp_id: 0, minute: 76, zusatzminute: 0,
    ist_eigener: true, sfv_person_id: 100, rueckennr: 7,
    gegner_club_name: null, ein_sfv_person_id: 1266706, ein_rueckennr: 21,
    ...ueber,
  }) as never;

  it("trägt die Nummer des Eingewechselten als eigenes Feld", () => {
    /* ⚠ Sie stand bisher nur im Fliesstext („ersetzt durch Nr. 21").
       Wer ihn zurückparst, misst seine eigene Formatierung mit. */
    const [z] = bildeVerlauf([wechsel()], true, new Map(), "FC Herrliberg");
    expect(z.ein_nummer).toBe(21);
    expect(z.text).toContain("Nr. 21");
  });

  it("⚠⚠ bei einem Gegnerwechsel geht sie MIT — umgedreht am 11.09.2026", () => {
    /* ⚠ ⚠ DIESER FALL HIELT DEN GEGENTEILIGEN ENTSCHEID FEST und ist beim
       Umdrehen von selbst rot geworden — genau wofür er da war.

       Die alte Begründung lautete: „die Nummer steht beim Gegner an der
       Aufstellungszeile, und zwei Wahrheiten wären eine zu viel."

       **Sie trägt nicht mehr, und zwar aus einem gemessenen Grund.** Bei
       4395750 sagt die Gegner-Aufstellungszeile 1/70/70 — Startelf —,
       während der Verlauf denselben Spieler in der 40. einwechselt. **Es
       gibt dort keine zweite Wahrheit, die man verdoppeln könnte; es gibt
       zwei, die sich widersprechen.** Wer die eine weglässt, entscheidet
       den Widerspruch stillschweigend zugunsten der anderen.

       ⚠ Entscheid B bleibt unberührt: sfv_person_id ist weiterhin null,
       der Name ebenfalls. Eine Rückennummer ist eine Beschriftung auf
       einem Trikot, kein Personendatum — und der CHECK in der Datenbank
       nennt genau die zwei anderen Spalten. */
    const [z] = bildeVerlauf(
      [wechsel({ ist_eigener: false, sfv_person_id: null,
                 ein_sfv_person_id: null, gegner_club_name: "FC Uster" })],
      true, new Map(), "FC Herrliberg",
    );
    expect(z.ein_nummer).toBe(21);
    /* Die Grenze, die NICHT gefallen ist. */
    expect(z.sfv_person_id).toBeNull();
  });

  it("⚠ die Nummer des Handelnden geht bei BEIDEN Seiten mit", () => {
    /* Ohne sie kann die Website ein Gegnertor nur dem VEREIN zuordnen —
       „FC Uster" statt „Nr. 7". Der Name steht im Text; ihn
       zurückzuparsen wäre der Umweg, den dieses Projekt zweimal als
       Fehler führt. */
    const [eigen] = bildeVerlauf([wechsel({ rueckennr: 7 })],
      true, new Map(), "FC Herrliberg");
    expect(eigen.nummer).toBe(7);

    const [fremd] = bildeVerlauf(
      [wechsel({ ist_eigener: false, sfv_person_id: null,
                 ein_sfv_person_id: null, rueckennr: 7,
                 gegner_club_name: "FC Uster" })],
      true, new Map(), "FC Herrliberg",
    );
    expect(fremd.nummer).toBe(7);
    expect(fremd.sfv_person_id).toBeNull();
  });

  it("⚠ bei einem Tor bleibt sie leer — sie gehört zum Wechsel", () => {
    const [z] = bildeVerlauf([wechsel({ typ_id: 1, ein_rueckennr: 21 })],
      true, new Map(), "FC Herrliberg");
    expect(z.ein_nummer).toBeNull();
  });
});
describe("torZusatz — das Feld, an dem der Zwischenstand haengt", () => {
  /* ⚠ ⚠ UEBER DIE KENNZAHL, NIE UEBER DEN TEXT. `subtyp` traegt den
     Klartext des Verbands und waere eine Schreibweise; `subtyp_id` ist
     das Merkmal. Gemessen in sfv_stammdaten.json: 2 Eigentor, 4 Penalty
     — aus einer Liste mit 100 Eintraegen. */
  it("erkennt ein Eigentor an subtyp_id 2", () => {
    expect(torZusatz(TYP_TOR, 2)).toBe("eigentor");
  });

  it("erkennt einen Penalty an subtyp_id 4", () => {
    expect(torZusatz(TYP_TOR, 4)).toBe("penalty");
  });

  it("⚠ ein Kopftor ist kein Zusatz — das Theme kennt zwei Werte", () => {
    /* Die Liste hat 100 Eintraege; was hier nicht steht, ergibt bewusst
       leer. Ein dritter Wert fiele drueben in ein select mit festen
       Optionen. */
    expect(torZusatz(TYP_TOR, 1)).toBe("");
    expect(torZusatz(TYP_TOR, 3)).toBe("");
    expect(torZusatz(TYP_TOR, 0)).toBe("");
    expect(torZusatz(TYP_TOR, null)).toBe("");
  });

  it("⚠⚠ eine VERWARNUNG bekommt nie einen Zusatz", () => {
    /* Auch nicht bei subtyp_id 2 — dort bedeutet die Zahl etwas anderes.
       Der Zusatz gilt ausschliesslich fuer Tore. */
    expect(torZusatz(TYP_VERWARNUNG, 2)).toBe("");
    expect(torZusatz(TYP_AUSSCHLUSS, 4)).toBe("");
    expect(torZusatz(TYP_WECHSEL, 2)).toBe("");
  });

  it("⚠ die 2. Verwarnung bekommt BEWUSST keinen", () => {
    /* `art` traegt bereits gelbrot und das Theme zeigt ein eigenes
       Symbol — ein Zusatz waere eine Wiederholung. Beim Eigentor ist es
       umgekehrt: `art` steht auf tor, und dass es eines war, steht
       nirgends sonst. */
    expect(torZusatz(TYP_AUSSCHLUSS, SUBTYP_ZWEITE_VERWARNUNG)).toBe("");
  });
});

describe("bildeVerlauf — die drei Felder fuer die Website", () => {
  /* Der globale e()-Helfer statt eines lokalen: er wird gegen den echten
     Typ geprueft, und genau das ist sein Zweck. */
  const ev = (f: Partial<AnzeigeEreignis>) => e({
    ist_eigener: true, sfv_person_id: 222, ...f,
  });
  it("ein Eigentor traegt den Zusatz UND weiterhin den Text", () => {
    /* ⚠ Der Text bleibt, bis der Theme-Chat bestaetigt hat, dass das
       Feld GEFUELLT ankommt. Die Spielseite faellt bis dahin darauf
       zurueck; wer ihn vorher entfernt, verschiebt den Stand um zwei
       Tore — ohne Fehlermeldung. */
    const [z] = bildeVerlauf(
      [ev({ typ_id: TYP_TOR, subtyp_id: 2, subtyp: "Eigentor", rueckennr: 10 })],
      true, new Map(), "FC Herrliberg",
    );
    expect(z.ereignis_zusatz).toBe("eigentor");
    expect(z.text).toContain("Eigentor");
    expect(z.nummer).toBe(10);
  });

  it("ein gewoehnliches Tor traegt einen leeren Zusatz", () => {
    const [z] = bildeVerlauf(
      [ev({ typ_id: TYP_TOR, subtyp_id: 0, subtyp: "-", rueckennr: 7 })],
      true, new Map(), "FC Herrliberg",
    );
    expect(z.ereignis_zusatz).toBe("");
    expect(z.nummer).toBe(7);
    expect(z.ein_nummer).toBeNull();
  });

  it("ein Wechsel traegt beide Nummern und keinen Zusatz", () => {
    const [z] = bildeVerlauf([ev({ typ_id: TYP_WECHSEL, rueckennr: 5, ein_rueckennr: 21 })],
      true, new Map(), "FC Herrliberg");
    expect(z.nummer).toBe(5);
    expect(z.ein_nummer).toBe(21);
    expect(z.ereignis_zusatz).toBe("");
  });
});
describe("halbzeitWiderspruch — Doppelmeldungen zaehlen statt glaetten", () => {
  /* ⚠ ⚠ BELEGT an Spiel 4346574 (0:7): ht_resultat sagt 0:2, die
     Ereignisliste nennt DREI Tore bis zur 45. Zwei unabhaengige Quellen
     des Verbands widersprechen sich.

     ⚠ Und er entdoppelt NICHT: zwei inhaltsgleiche Zeilen aus einem
     Abruf koennen zwei echte Tore sein (Nr. 9 in der 69., gemessen am
     11.09.2026). Was man nicht entdoppelt, kann man nicht faelschlich
     entdoppeln. */
  const tor = (minute: number | null, eigen = false) =>
    ({ typ_id: TYP_TOR, minute, ist_eigener: eigen });

  it("⚠⚠ der Fall 4346574: drei Tore bis zur 45., Halbzeit sagt zwei", () => {
    const r = halbzeitWiderspruch(
      [tor(12), tor(30), tor(45)], "0:2", true,
    );
    expect(r).toBe(true);
  });

  it("stimmt es ueberein, ist es kein Widerspruch", () => {
    expect(halbzeitWiderspruch([tor(12), tor(30)], "0:2", true)).toBe(false);
  });

  it("⚠ die zweite Halbzeit zaehlt nicht mit", () => {
    expect(halbzeitWiderspruch(
      [tor(12), tor(30), tor(70), tor(88)], "0:2", true,
    )).toBe(false);
  });

  it("Minute 45 zaehlt zur ersten Haelfte, 46 nicht", () => {
    expect(halbzeitWiderspruch([tor(45)], "0:1", true)).toBe(false);
    expect(halbzeitWiderspruch([tor(46)], "0:0", true)).toBe(false);
  });

  it("⚠ auswaerts sind die Seiten getauscht", () => {
    /* ht_resultat steht immer als heim:gast. Wer das verwechselt, meldet
       jedes Auswaertsspiel mit ungleichem Stand als Widerspruch. */
    expect(halbzeitWiderspruch([tor(20, true)], "0:1", false)).toBe(false);
    expect(halbzeitWiderspruch([tor(20, true)], "1:0", false)).toBe(true);
  });

  it("⚠⚠ ohne ht_resultat ist es NICHT PRUEFBAR, nicht in Ordnung", () => {
    /* null heisst „es gibt nichts, wogegen man halten koennte". Wer es
       mit false zusammenzaehlt, meldet fehlende Halbzeitstaende als
       geprueft. */
    expect(halbzeitWiderspruch([tor(12)], null, true)).toBeNull();
    expect(halbzeitWiderspruch([tor(12)], "", true)).toBeNull();
    expect(halbzeitWiderspruch([tor(12)], "kaputt", true)).toBeNull();
  });

  it("⚠ ein Tor ohne Minute macht die Pruefung gegenstandslos", () => {
    expect(halbzeitWiderspruch([tor(null), tor(20)], "0:1", true)).toBeNull();
  });

  it("Karten und Wechsel zaehlen nicht als Tore", () => {
    expect(halbzeitWiderspruch(
      [{ typ_id: 3, minute: 20, ist_eigener: false },
       { typ_id: 2, minute: 30, ist_eigener: true }], "0:0", true,
    )).toBe(false);
  });
});
