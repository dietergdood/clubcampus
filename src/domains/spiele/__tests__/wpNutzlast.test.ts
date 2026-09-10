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
  normalisiereRaum, musstNormalisiertWerden,
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
  const wechsel = (ueber = {}) => e({
    typ_id: TYP_WECHSEL, ist_eigener: true,
    sfv_person_id: 222, rueckennr: 11,
    ein_sfv_person_id: 333, ein_rueckennr: 9,
    ...ueber,
  });
  const NAMEN = new Map([[222, "Abdulah Al Abbadie"], [333, "Luca Meier"]]);

  it("nennt den Ausgewechselten beim Namen statt bei der Nummer", () => {
    const [z] = bildeVerlauf([wechsel()], true, NAMEN, "FC Herrliberg");
    expect(z.text).toBe("Abdulah Al Abbadie · für Luca Meier");
  });

  it("faellt auf die Nummer zurueck, solange sein Name fehlt", () => {
    const nur222 = new Map([[222, "Abdulah Al Abbadie"]]);
    const [z] = bildeVerlauf([wechsel()], true, nur222, "FC Herrliberg");
    expect(z.text).toBe("Abdulah Al Abbadie · für Nr. 9");
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
   „Gruppe  2" — der Doppelabstand des Verbands (11.09.2026)

   Gemeldet von der Website-Seite: in allen 270 Etiketten. Der Wert kommt
   so vom Verband. Wir aendern ihn in UNSERER Ausgabe und zaehlen, wie oft
   — die Rohform bleibt in spiele.sfv_gruppe stehen.
   ══════════════════════════════════════════════════════════════════════ */
describe("normalisiereRaum", () => {
  it("macht aus zwei Leerzeichen eines", () => {
    expect(normalisiereRaum("Gruppe  2")).toBe("Gruppe 2");
  });

  it("laesst einen sauberen Wert unangetastet", () => {
    expect(normalisiereRaum("Gruppe 2")).toBe("Gruppe 2");
    expect(musstNormalisiertWerden("Gruppe 2")).toBe(false);
  });

  it("meldet, wenn sie eingreifen musste", () => {
    expect(musstNormalisiertWerden("Gruppe  2")).toBe(true);
  });

  it("⚠ meldet bei LEER nichts — sonst zaehlte der Cup-Fall doppelt", () => {
    /* Cupspiele haben gar keinen Gruppennamen. Sie als „normalisiert" zu
       zaehlen machte aus einer fehlenden Angabe eine Aenderung. */
    expect(musstNormalisiertWerden(null)).toBe(false);
    expect(musstNormalisiertWerden("")).toBe(false);
  });

  it("faengt auch Tabulator und Zeilenumbruch", () => {
    /* ⚠ Die Steuerzeichen als Codepunkte, nicht als Escape: ein 	 im
       Quelltext ueberlebt den Weg durch eine Shell nicht zuverlaessig —
       genau so ist diese Zeile beim ersten Versuch zerbrochen. */
    const roh = "  Gruppe" + String.fromCharCode(9, 10) + " 2 ";
    expect(normalisiereRaum(roh)).toBe("Gruppe 2");
  });

  it("die Nutzlast traegt den bereinigten Wert", () => {
    const s = bildeSpiel(quelle({ sfv_gruppe: "Gruppe  2" }), "38309", [], new Map(), "FC Herrliberg");
    expect(s!.runde).toBe("Gruppe 2");
  });
});
