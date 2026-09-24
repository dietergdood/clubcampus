/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/__tests__/mannschaftsliste.test.ts

   Die Liste nach Mannschaft, als CSV für Excel. Vier Entscheidungen
   werden hier festgehalten, und keine davon ist Geschmack:

   1. ⚠ EINE Namensspalte. Bestellt waren `Name` und `Vorname` — der
      Verband liefert `firstname`/`name` getrennt, `matchdaten.ts`
      setzt sie an vier Stellen zusammen und verwirft die Teile. Eine
      leere Spalte `Vorname` wäre eine Behauptung über die Person.

   2. ⚠ Eine LEERE Auswahl ergibt KEINE Datenzeile — und nicht alle.
      Sonst bedeuten „nichts gewählt“ und „alles gewählt“ dasselbe.

   3. ⚠ Die Personennummer als `="123"`. Anführungszeichen allein
      genügen nicht: die entpackt Excel und macht eine Zahl daraus.

   4. ⚠ ⚠  EINE ZEILE JE PERSON, UNTER IHREM STAMMTEAM — und das ist
      seit dem 24.09.2026 die UMGEKEHRTE Zusage. Hier stand: „eine
      Person darf MEHRFACH stehen, eine Zeile je Mannschaft“. Die
      Vorgabe ist zurückgenommen.

      ⚠ Der Fall dazu wurde UMGEDREHT und nicht gelöscht. Er hielt die
      alte Vorgabe fest, also ist er kein falscher Test, sondern ein
      Test einer geänderten Entscheidung — und was an seine Stelle
      tritt, ist die Gegenaussage: sie steht EINMAL da. Hätte ich ihn
      gelöscht, wäre mit ihm der Grund verschwunden.

   5. ⚠ Die Spalte `Stammteam laut` sagt, wie EINDEUTIG gewählt wurde.
      Ohne sie wäre eine Mannschaft, die aus einem Gleichstand
      hervorgeht, von einer eindeutigen nicht zu unterscheiden.

      ⚠ ⚠  UND SIE SAGT SEIT DEM 24.09.2026 NICHT MEHR DEN KADER. Einen
      Kader je Mannschaft gibt es beim Verband nicht (gemessen, siehe
      `stammteam.ts`), also gilt immer „meiste Einsätze". Aus drei
      Kennungen wurden vier: nur dieses Team · meiste Einsätze ·
      Gleichstand · keine Team-Angabe. Der Gleichstand ist eine NEUE
      Stufe, keine Umbenennung — er steckte vorher unsichtbar in
      „mehrere Kader" und trug denselben Text wie ein klarer Vorsprung.

   6. ⚠ ⚠  DIE NUMMERN-ZELLE TRÄGT NUR DIE NUMMERN DES STAMMTEAMS
      (24.09.2026) — und das ist ebenfalls die umgekehrte Zusage. Der
      Fall dazu ist UMGEDREHT, nicht gelöscht, und der Preis steht bei
      ihm: eine Nummer aus der anderen Mannschaft erscheint in dieser
      Liste nirgends mehr. In der Textliste erscheint sie weiterhin.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  baueSpielerZeilen, alsMannschaftsliste, MANNSCHAFTSLISTE_SPALTEN, OHNE_NAMEN,
} from "../spielerAusgabe.ts";
import { OHNE_MANNSCHAFT } from "../matchdatenAnzeige.ts";
import { STAMMTEAM_LAUT } from "../stammteam.ts";
import type { StammteamRegel } from "../stammteam.ts";
import type { SpielerZeile, AufstellungFuerListe } from "../spielerAusgabe.ts";

/* Die VIER Texte der Spalte `Stammteam laut` — abgekürzt, weil sie in fast
   jeder Erwartung vorkommen.
   ⚠ Aus `STAMMTEAM_LAUT` gelesen und nicht getippt: die Formulierung lebt
   an einer Stelle. Dass sie WÖRTLICH so bestellt war, hält der eigene Fall
   „die vier Texte sind die bestellten" weiter unten fest — sonst könnte
   jemand die Map umformulieren und alle Fälle blieben grün.

   ⚠ ⚠  ES WAREN BIS ZUM 24.09.2026 DREI, und sie hiessen nach dem KADER.
   Den gibt es beim Verband nicht (gemessen, siehe `stammteam.ts`), also
   gilt immer „meiste Einsätze", und die Spalte sagt jetzt die
   EINDEUTIGKEIT. `L_GLEICH` ist dabei neu: der Gleichstand steckte vorher
   unsichtbar in `mehrere_kader` und trug denselben Text wie ein klarer
   Vorsprung. */
const L_EIN = STAMMTEAM_LAUT.nur_dieses_team;
const L_MEHR = STAMMTEAM_LAUT.meiste_einsaetze;
const L_GLEICH = STAMMTEAM_LAUT.gleichstand;
const L_OHNE = STAMMTEAM_LAUT.ohne_team;

/* ⚠ Über `fromCharCode`, nicht als Escape im Quelltext: ein rohes BOM in
   einer eingecheckten Datei ist genau das, was check:encoding abweist. */
const BOM = String.fromCharCode(0xFEFF);

/**
 * Eine Attrappe einer `SpielerZeile`.
 *
 * ⚠ ⚠  SIE FUEHRT `teamSchluessel` NEBEN `teams`, UND DAS IST DER PUNKT.
 * Gewaehlt wird ueber den Schluessel (`String(sfv_team_id)`), angezeigt
 * wird der Name. Eine Attrappe, die nur die Namen fuehrte, koennte die
 * Verwechslung der beiden nicht zeigen — und genau die hat am 24.09.2026
 * eine Datei mit nur der Kopfzeile erzeugt.
 *
 * Die Schluessel werden aus dem Namen abgeleitet (`k:Cb-Junioren`) —
 * absichtlich NICHT der Name selbst: wer die beiden verwechselt, wird rot.
 *
 * ⚠ ⚠  UND ABGELEITET STATT DURCHGEZAEHLT. Die erste Fassung nahm
 * `t${i}` — die Position in der Liste. Damit trug die erste Mannschaft
 * JEDER Person denselben Schluessel `t0`, und ein Fall, der genau eine
 * von zwei Mannschaften waehlen sollte, traf beide. **Eine Team-Id gehoert
 * zu einer Mannschaft, nicht zu einer Position** — eine Attrappe, die das
 * anders herum baut, prueft etwas, das es nicht gibt.
 */
const sp = (
  sfv_person_id: number, name: string, teams: string[], rueckennummern: number[] = [],
  /* ⚠ Ausdruecklich setzbar, weil die Ableitung unten am letzten
     Leerzeichen trennt. Wo ein Name ein Semikolon oder ein
     Anfuehrungszeichen traegt, ist diese Trennung ein Artefakt der
     Attrappe — dort gehoeren die Teile hingeschrieben, sonst prueft der
     Fall die Trennung statt die Maskierung. */
  teile?: { vorname: string; nachname: string },
  /* ⚠ Der Stammteam-Anteil: ohne Angabe die ERSTE Mannschaft, die `regel`
     nach der Anzahl. Das ist NICHT die Regel des Codes — die zaehlt
     Einsaetze und steht in `stammteam.ts`. Hier genuegt ein stabiler Wert,
     damit die Faelle, die vom Stammteam NICHT handeln, unberuehrt bleiben.
     Wer die Regel selbst pruefen will, geht ueber `baueSpielerZeilen` mit
     echten Aufstellungszeilen — das tun die Faelle unter „Das Stammteam". */
  stamm?: { schluessel: string; name: string; regel: StammteamRegel },
): SpielerZeile => ({
  sfv_person_id, name, teams,
  teamSchluessel: teams.map(t => `k:${t}`),
  stammteamSchluessel: stamm ? stamm.schluessel : (teams.length ? `k:${teams[0]}` : "-"),
  stammteam: stamm ? stamm.name : (teams[0] ?? OHNE_MANNSCHAFT),
  stammteamRegel: stamm ? stamm.regel
    : (teams.length === 0 ? "ohne_team"
      : teams.length === 1 ? "nur_dieses_team" : "meiste_einsaetze"),
  rueckennummern,
  /* ⚠ ⚠  DIESELBEN NUMMERN WIE `rueckennummern` — UND DAS IST KEINE
     Vereinfachung, sondern die einzige Menge, die die Attrappe kennen kann.
     Welche Nummer zu welcher Mannschaft gehört, steht in den
     AUFSTELLUNGSZEILEN; `sp()` hat keine. Für eine Person mit EINER
     Mannschaft sind die beiden Mengen ohnehin gleich, und genau solche
     Personen führen die Fälle, die von der Nummer nicht handeln.

     ⚠ Wer den SCHNITT selbst prüfen will, muss über `baueSpielerZeilen`
     gehen — dort entsteht er. Ein setzbares Feld hier hiesse: der Fall
     prüft, was der Fall selbst hineingeschrieben hat. Die Fälle dazu
     stehen unter „Das Stammteam". */
  stammteamNummern: rueckennummern,
  einsaetze: 1,
  /* ⚠ Am LETZTEN Leerzeichen, und das ist NICHT die Regel des Codes — der
     trennt nie selbst, er nimmt `firstname` und `name` des Verbands. Hier
     steht sie nur, damit `name` und die Teile zusammenpassen; im
     Produktivcode waere sie fuer „Tamara Hidber Mullis" falsch. */
  vorname: teile ? teile.vorname : name.slice(0, Math.max(0, name.lastIndexOf(" "))),
  nachname: teile ? teile.nachname : name.slice(name.lastIndexOf(" ") + 1),
});

/**
 * Die getrennten Teile zu einem Namens-Objekt.
 *
 * ⚠ Am LETZTEN Leerzeichen — und das ist NICHT die Regel des Codes. Der
 * trennt nie selbst, er nimmt `firstname` und `name` des Verbands, wie sie
 * kommen. Hier steht sie nur, damit die Attrappe nicht jeden Namen doppelt
 * fuehren muss; im Produktivcode waere sie fuer „Tamara Hidber Mullis"
 * falsch (sie ergaebe Nachname „Mullis" statt „Hidber Mullis").
 */
const teileAus = (namen: Record<number, string>): Record<number, { vorname: string; nachname: string }> =>
  Object.fromEntries(Object.entries(namen).map(([id, ganz]) => {
    const i = ganz.lastIndexOf(" ");
    return [Number(id), i < 0
      ? { vorname: "", nachname: ganz }
      : { vorname: ganz.slice(0, i), nachname: ganz.slice(i + 1) }];
  }));

/** Alle Mannschaften, die in den Zeilen vorkommen — der Normalfall der Maske.
    ⚠ Als SCHLUESSEL, nicht als Name: das ist, was die Maske an
    `alsMannschaftsliste()` uebergibt. */
const alleTeams = (zeilen: SpielerZeile[]): ReadonlySet<string> =>
  new Set(zeilen.flatMap(z =>
    /* ⚠ Der Stammteam-Schluessel ausdruecklich MIT — die Auswahl trifft seit
       dem 24.09.2026 ueber ihn, und er muss nicht unter `teamSchluessel`
       stehen. Ohne ihn waere „alles gewaehlt" ein Fixture, in dem eine
       Person gar nicht erreichbar ist, und der Fall waere gruen, weil die
       Datei leer bliebe. */
    [z.stammteamSchluessel, ...(z.teamSchluessel.length ? z.teamSchluessel : ["-"])]));

/** Die Datenzeilen ohne Kopf und ohne BOM. */
function datenzeilen(csv: string): string[] {
  const zeilen = csv.replace(BOM, "").split("\r\n").filter(z => z !== "");
  return zeilen.slice(1);
}

describe("alsMannschaftsliste — Form der Datei", () => {
  it("die Kopfzeile trägt SECHS Spalten in der bestellten Reihenfolge", () => {
    const zeilen = [sp(100, "Adrian Schmid", ["1. Mannschaft"], [7])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    const kopf = csv.replace(BOM, "").split("\r\n")[0];
    expect(kopf).toBe("Name;Vorname;Team;Stammteam laut;Rückennummer;SFV-personId");
    /* Die Reihenfolge ist bestellt, nicht abgeleitet — deshalb wörtlich.
       ⚠ `Stammteam laut` steht zwischen `Team` und `Rückennummer`: es
       erklärt die Spalte davor, und dort wird es gelesen. */
    expect([...MANNSCHAFTSLISTE_SPALTEN]).toEqual(
      ["Name", "Vorname", "Team", "Stammteam laut", "Rückennummer", "SFV-personId"]);
  });

  it("⚠ die vier Texte der Spalte `Stammteam laut` sind die bestellten", () => {
    /* ⚠ DIE EINZIGE STELLE DIESER DATEI, DIE DEN WORTLAUT FESTHÄLT. Alle
       anderen Fälle lesen ihn aus `STAMMTEAM_LAUT` — die prüfen die
       Verdrahtung und blieben grün, wenn jemand die Map umformuliert.

       Bestellt waren am 24.09.2026 „nur dieses Team", „meiste Einsätze"
       und „Gleichstand"; der vierte Text ist nicht bestellt worden und
       steht hier, damit eine Änderung daran nicht unbemerkt bleibt.
       Warum es einen vierten gibt, steht in `stammteam.ts`. */
    expect(STAMMTEAM_LAUT.nur_dieses_team).toBe("nur dieses Team");
    expect(STAMMTEAM_LAUT.meiste_einsaetze).toBe("meiste Einsätze");
    expect(STAMMTEAM_LAUT.gleichstand).toBe("Gleichstand");
    expect(STAMMTEAM_LAUT.ohne_team).toBe("keine Team-Angabe");
  });

  it("⚠ das BOM ist das erste Zeichen — ohne es liest Excel die Umlaute als Latin-1", () => {
    const zeilen = [sp(100, "Jürg Müller", ["1. Mannschaft"])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    /* Und nur einmal, nicht vor jeder Zeile. */
    expect(csv.split(BOM).length - 1).toBe(1);
  });

  it("⚠ die Zeilen enden mit CRLF, weil Excel das in CSV erwartet", () => {
    const zeilen = [sp(1, "A", ["T1"]), sp(2, "B", ["T1"])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    expect(csv).toContain("\r\n");
    /* Kein nacktes LF ohne CR davor — sonst sieht Excel eine Zeile. */
    expect(csv.replace(/\r\n/g, "")).not.toContain("\n");
  });
});

describe("alsMannschaftsliste — Spalteninhalte", () => {
  it("⚠ mehrere Rückennummern stehen in EINER Zelle, mit Komma und Leerzeichen", () => {
    /* Wie die Maske sie zeigt. 58 der 287 laufen unter mehr als einer Nummer;
       eine Spalte je Nummer wäre eine Spaltenzahl, die von den Daten abhängt. */
    const zeilen = [sp(100, "Adrian Schmid", ["1. Mannschaft"], [9, 18, 21])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`Schmid;Adrian;1. Mannschaft;${L_EIN};9, 18, 21;="100"`);
  });

  it("keine Rückennummer ergibt eine leere Zelle, nicht eine Null", () => {
    const zeilen = [sp(100, "Adrian Schmid", ["1. Mannschaft"], [])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`Schmid;Adrian;1. Mannschaft;${L_EIN};;="100"`);
  });

  it('⚠ ein fehlender Name bleibt LEER — nicht „Nr. 13“ und nicht OHNE_NAMEN', () => {
    /* In der Textliste steht dort eine Warnung, hier nicht: dies ist ein
       Datenfeld, und ein Warntext würde sortiert und gefiltert wie ein Name. */
    const zeilen = [sp(100, "", ["1. Mannschaft"], [13])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`;;1. Mannschaft;${L_EIN};13;="100"`);
    expect(zeile).not.toContain(OHNE_NAMEN);
    expect(zeile).not.toContain("Nr.");
  });

  it("eine Person ohne Team-Zuordnung steht unter demselben Namen wie in der Maske", () => {
    const zeilen = [sp(100, "Adrian Schmid", [])];
    /* ⚠ Gewaehlt wird der SCHLUESSEL `"-"` — dieselbe Form, die
       `gruppiereNachTeam()` fuer eine Zeile ohne Team-Id bildet. Der
       ANZEIGENAME daneben ist `OHNE_MANNSCHAFT`, und die beiden sind
       absichtlich nicht dasselbe. */
    const csv = alsMannschaftsliste(zeilen, new Set(["-"]));
    /* ⚠ Und die Regel daneben ist `ohne_team` — die Person hat keine
       Mannschaft, und die Spalte sagt das, statt „nur dieses Team" zu
       behaupten, wo es kein Team gibt. */
    expect(datenzeilen(csv)[0]).toBe(`Schmid;Adrian;${OHNE_MANNSCHAFT};${L_OHNE};;="100"`);
  });
});

describe("alsMannschaftsliste — die Personennummer als Text", () => {
  it('⚠ sie steht als ="100" da — Anführungszeichen allein macht Excel zur Zahl', () => {
    const zeilen = [sp(1097318, "Adrian Schmid", ["1. Mannschaft"])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    const [zeile] = datenzeilen(csv);
    expect(zeile.endsWith('="1097318"')).toBe(true);
    /* Die Gegenprobe ist die wichtigere Hälfte: NICHT die nackte Zahl und
       NICHT zusätzlich gequotet. Ein zweites Quoten machte aus der Zelle
       sichtbaren Text `="1097318"` statt einer Textzelle. */
    expect(zeile.endsWith(";1097318")).toBe(false);
    expect(zeile).not.toContain('"="');
    expect(zeile).not.toContain('""');
  });
});

describe("alsMannschaftsliste — Sortierung", () => {
  it("sortiert nach Team, darin nach Name", () => {
    const zeilen = [
      sp(3, "Zeller", ["2. Mannschaft"]),
      sp(1, "Berger", ["1. Mannschaft"]),
      sp(2, "Amrein", ["2. Mannschaft"]),
    ];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    /* ⚠ Spalte 0 und 2 — dazwischen steht seit dem 24.09.2026 der Vorname.
       Ein `slice(0, 2)` ergaebe „Berger / " und sagte nichts ueber das Team. */
    expect(daten.map(z => { const f = z.split(";"); return `${f[0]} / ${f[2]}`; })).toEqual([
      "Berger / 1. Mannschaft",
      "Amrein / 2. Mannschaft",
      "Zeller / 2. Mannschaft",
    ]);
  });

  it('⚠ Umlaute werden einsortiert, nicht hinter Z gehängt — „Ärni“ vor „Oberli“', () => {
    /* Mit einem Vergleich über Zeichencodes stünde Ärni am ENDE (gemessen:
       „Berger, Oberli, Ärni“), und in einer Liste zum Abhaken sucht man dort
       nicht. Gegengeprobt mit `<` statt `localeCompare` — dann ist er rot.
       ⚠ WAS ER NICHT DECKT: die Locale-Angabe „de“ selbst. Gemessen sind
       `localeCompare(b)` und `localeCompare(b, "de")` für diesen Fall
       zeichengleich — für Ä sortiert auch en-US bei A ein. Die Angabe steht
       also aus Absicht da und ist durch keinen Fall gedeckt; ein Test, der
       das behauptet, wäre grün, ohne es zu prüfen. */
    const zeilen = [
      sp(2, "Berger", ["1. Mannschaft"]),
      sp(1, "Ärni", ["1. Mannschaft"]),
      sp(3, "Oberli", ["1. Mannschaft"]),
    ];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten.map(z => z.split(";")[0])).toEqual(["Ärni", "Berger", "Oberli"]);
  });

  it("die Reihenfolge hängt nicht von der Eingabereihenfolge ab", () => {
    /* Sonst sehen zwei Ausgaben derselben Daten verschieden aus, und wer sie
       vergleicht, sucht einen Unterschied, den es nicht gibt. */
    const a = [sp(1, "Ärni", ["T1"]), sp(2, "Berger", ["T1"])];
    const b = [sp(2, "Berger", ["T1"]), sp(1, "Ärni", ["T1"])];
    expect(alsMannschaftsliste(a, alleTeams(a)))
      .toBe(alsMannschaftsliste(b, alleTeams(b)));
  });
});

describe("alsMannschaftsliste — die Auswahl", () => {
  it("⚠ eine LEERE Auswahl ergibt keine Datenzeile — und NICHT alle", () => {
    /* „Nichts gewählt“ und „alles gewählt“ dürfen nicht dasselbe bedeuten:
       sonst bekommt jemand die ganze Liste, der eine Mannschaft vergessen
       hat anzuklicken, und hält sie für seine Auswahl. */
    const zeilen = [sp(1, "A", ["1. Mannschaft"]), sp(2, "B", ["2. Mannschaft"])];
    const csv = alsMannschaftsliste(zeilen, new Set<string>());
    expect(datenzeilen(csv)).toEqual([]);
    expect(csv).not.toContain("1. Mannschaft");
  });

  it("der Spaltenkopf bleibt auch bei leerer Auswahl stehen", () => {
    /* Eine Datei mit Köpfen und ohne Zeilen ist eine leere Liste; eine ganz
       leere Datei sieht nach einem Fehler beim Erzeugen aus. */
    const csv = alsMannschaftsliste([sp(1, "A", ["T1"])], new Set<string>());
    expect(csv.replace(BOM, "").split("\r\n")[0]).toContain("SFV-personId");
  });

  it("nimmt nur die gewählten Mannschaften auf", () => {
    const zeilen = [sp(1, "A", ["1. Mannschaft"]), sp(2, "B", ["2. Mannschaft"])];
    /* ⚠ Der SCHLUESSEL, nicht der Name. Wer hier `"2. Mannschaft"`
       einsetzt, bekommt eine Datei mit nur der Kopfzeile — genau der
       Fehler vom 24.09.2026. */
    const csv = alsMannschaftsliste(zeilen, new Set(["k:2. Mannschaft"]));
    expect(datenzeilen(csv)).toEqual([`B;;2. Mannschaft;${L_EIN};;="2"`]);
  });

  it("⚠ ⚠  eine Person in ZWEI gewählten Mannschaften steht EINMAL da", () => {
    /* ⚠ ⚠  DIESER FALL IST UMGEDREHT, NICHT NEU (24.09.2026). Er hiess
       „steht ZWEIMAL da, je einmal" und hielt die damalige Vorgabe fest —
       der Zuschnitt sei die Mannschaft. Die Vorgabe ist zurückgenommen,
       und damit ist die Gegenaussage die Zusage: wer eine Liste abhakt und
       jemanden zweimal darin hat, übersieht den zweiten Eintrag.

       ⚠ Gelöscht wäre er der falsche Weg gewesen: mit ihm verschwände der
       Grund, und niemand sähe mehr, dass hier einmal anders entschieden
       wurde. Beide Hälften stehen deshalb dran — die eine Zeile UND dass
       es keine zweite gibt. */
    const zeilen = [sp(100, "Adrian Schmid", ["Ca-Junioren", "Cb-Junioren"], [9])];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten).toEqual([`Schmid;Adrian;Ca-Junioren;${L_MEHR};9;="100"`]);
    /* Die Gegenprobe: die andere Mannschaft kommt in der Datei NICHT vor.
       Ohne sie wäre der Fall auch grün, wenn zwei Zeilen entstünden und die
       erste zufällig passte. */
    expect(daten).toHaveLength(1);
    expect(daten.join("\n")).not.toContain("Cb-Junioren");
  });

  it("⚠ ⚠  und das Kästchen der ANDEREN Mannschaft erreicht sie NICHT", () => {
    /* ⚠ DER PREIS DER ENTSCHEIDUNG, festgehalten statt verschwiegen. Diese
       Person hat für die Cb-Junioren gespielt; ihr Stammteam sind die Ca.
       Wer die Cb-Liste zieht, bekommt sie nicht — und das ist die Folge,
       nicht ein Defekt.

       ⚠ ⚠  HIER STAND, MASKE UND AUSGABE LIEFEN AN DIESER STELLE
       AUSEINANDER — das galt fuer einen halben Tag und ist behoben.
       `offeneZuordnungen()` ruft seit dem 24.09.2026 `bestimmeStammteam()`,
       also dieselbe Regel wie dieser Filter. Eine Person ist damit ueber
       genau ein Kaestchen erreichbar, und der Fall dazu steht in
       `spielerVorschlagEinbau.test.jsx`.

       ⚠ Was dieser Fall prueft, gilt unveraendert: die Auswahl trifft das
       STAMMTEAM und nicht jede Mannschaft, in der die Person gespielt hat.
       Wer die Cb-Liste zieht, bekommt sie nicht — und das ist die Folge der
       Regel, kein Defekt.

       Dieser Fall hiess vorher „erscheint nur einmal, wenn nur eine ihrer
       Mannschaften gewählt ist" und erwartete eine Cb-Zeile. */
    const zeilen = [sp(100, "Adrian Schmid", ["Ca-Junioren", "Cb-Junioren"], [9])];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, new Set(["k:Cb-Junioren"])));
    expect(daten).toEqual([]);
    /* Und die Gegenrichtung: über ihr Stammteam ist sie sehr wohl zu
       erreichen. Ohne diese Hälfte wäre der Fall auch grün, wenn die
       Auswahl gar nichts mehr träfe. */
    const ueberStamm = datenzeilen(alsMannschaftsliste(zeilen, new Set(["k:Ca-Junioren"])));
    expect(ueberStamm).toEqual([`Schmid;Adrian;Ca-Junioren;${L_MEHR};9;="100"`]);
  });

  /* ⚠ ⚠  DIESER FALL IST AM 24.09.2026 UMGEDREHT WORDEN, NICHT GELÖSCHT.
     Er hiess „die Rückennummern BEIDER Mannschaften stehen in der einen
     Zeile" und erwartete `9, 13`. Die Entscheidung dahinter war: die Zelle
     ist personenbezogen wie Name und personId, und eine Nummer, die nur in
     der anderen Mannschaft vergeben wurde, soll nicht verloren gehen.

     Die Entscheidung ist zurückgenommen (Didi, 24.09.2026): die Zeile nennt
     EINE Mannschaft, und eine Nummer aus einer anderen ist in dieser Zeile
     eine falsche Auskunft — wer abhakt, vergleicht die Zelle mit dem Trikot
     vor sich.

     ⚠ Der alte Fall war kein falscher Test, sondern der Test einer anderen
     Entscheidung; was an seine Stelle tritt, ist die Gegenaussage. Und der
     PREIS steht mit ihm da statt verschwiegen zu werden: die 13 erscheint
     ab jetzt in dieser Liste NIRGENDS — auch nicht in der Cb-Liste, denn
     dort steht die Person gar nicht. In der TEXTLISTE erscheint sie
     weiterhin; die ist nicht mannschaftsweise geschnitten.

     ⚠ Über `baueSpielerZeilen` mit echten Zeilen, nicht über `sp()`: die
     Attrappe kennt die Zuordnung Nummer→Mannschaft nicht, und ein Fall auf
     ihr prüfte, was er selbst hineingeschrieben hat. */
  it("⚠ NUR die Nummern des Stammteams stehen in der Zeile", () => {
    const zeilen = baueSpielerZeilen(
      /* Ca (Team 1) hat zwei Einsätze und ist damit Stammteam; in Cb
         (Team 2) trug die Person die 13. */
      [a(100, 1, 9, "s1"), a(100, 1, 9, "s2"), a(100, 2, 13, "s3")],
      { 100: "Adrian Schmid" },
      new Map([[1, "Ca-Junioren"], [2, "Cb-Junioren"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`Schmid;Adrian;Ca-Junioren;${L_MEHR};9;="100"`);

    /* ⚠ ⚠  DIE ZWEITE HÄLFTE, UND SIE IST DIE TRAGENDE. Ohne sie wäre der
       Fall auch grün, wenn weiterhin ALLE Nummern erschienen — `9` steht in
       `9, 13` ja drin. Geprüft wird die ganze Zelle und ausdrücklich, dass
       die 13 fehlt. */
    expect(zeile).not.toContain("13");
    expect(zeile.split(";")[4]).toBe("9");

    /* ⚠ Und die Gegenrichtung zur Vollständigkeit: an der PERSON stehen
       beide Nummern weiterhin. Der Schnitt ist eine Entscheidung der
       Ausgabe, kein Datenverlust in `baueSpielerZeilen` — sonst verlöre
       auch die Textliste die 13. */
    expect(zeilen[0].rueckennummern).toEqual([9, 13]);
    expect(zeilen[0].stammteamNummern).toEqual([9]);
  });

  /* ⚠ ⚠  DIESER FALL IST DURCH EINE SABOTAGE ENTSTANDEN, NICHT DURCH DIE
     VORGABE. Beim Gegenproben des Schnitts lief eine Sabotage GRÜN: die
     Entdopplung je Mannschaft gegen die GESAMTLISTE der Person geprüft
     (`!z.rueckennummern.includes(...)` statt `!je.includes(...)`) — dann
     bekommt jede Mannschaft nur ihre ERSTE Nummer, und die zweite fällt
     wortlos weg. Kein Fall hat das gemeldet.

     ⚠ Der Grund für die Lücke: alle Fälle des Schnitts gaben jeder
     Mannschaft genau EINE Nummer. Innerhalb einer Mannschaft mehrere zu
     tragen ist aber der gemessene Normalfall — 58 der 287 laufen unter mehr
     als einer Nummer, und über eine Saison wechselt die Nummer auch im
     selben Team.

     Eine Sabotage, die grün bleibt, ist ein fehlender Fall — nicht ein
     harmloser Code. */
  it("⚠ ZWEI Nummern in DERSELBEN Mannschaft stehen beide da", () => {
    const zeilen = baueSpielerZeilen(
      /* Dieselbe Mannschaft, zwei Nummern — und in der anderen noch eine
         dritte, die nicht erscheinen darf. */
      [a(100, 1, 7, "s1"), a(100, 1, 21, "s2"), a(100, 2, 13, "s3")],
      { 100: "Adrian Schmid" },
      new Map([[1, "Ca-Junioren"], [2, "Cb-Junioren"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`Schmid;Adrian;Ca-Junioren;${L_MEHR};7, 21;="100"`);
    /* Die zwei Hälften einzeln, damit man beim Rotwerden sieht, welche: die
       eigene Mannschaft vollständig, die andere gar nicht. */
    expect(zeilen[0].stammteamNummern).toEqual([7, 21]);
    expect(zeile).not.toContain("13");
  });

  it("⚠ keine Nummer im Stammteam ergibt eine LEERE Zelle, auch wenn die andere Mannschaft eine hat", () => {
    /* ⚠ DIE FOLGE DER ENTSCHEIDUNG, und sie ist ausdrücklich so gewollt
       (Didi, 24.09.2026). Die Person trug im Stammteam keine Nummer und in
       der anderen Mannschaft die 13. Die Zelle bleibt LEER.

       Der Grund: die Zelle bedeutet seit heute „die Nummer in DIESER
       Mannschaft". Stünde bei fehlender Nummer die der anderen drin,
       bedeutete dieselbe Zelle je nach Datenlage zweierlei — und niemand
       könnte ihr ansehen, welches von beiden. Eine leere Zelle ist eine
       Auskunft; eine Nummer aus einem anderen Team ist eine Behauptung.

       ⚠ UND DER MANGEL DARAN GEHÖRT DAZU: eine leere Zelle sieht aus wie
       ein Ausfall. Im Feld selbst ist das nicht zu heilen — ein Merktext
       würde sortiert und gefiltert, als wäre er eine Nummer (dieselbe
       Entscheidung wie für `OHNE_NAMEN` in der Namensspalte, siehe oben).
       Was es heilen würde, wäre ein Spaltenkopf „Nummer in diesem Team";
       die sechs Köpfe sind bestellt und bleiben. Offener Punkt. */
    const zeilen = baueSpielerZeilen(
      [a(100, 1, null, "s1"), a(100, 1, null, "s2"), a(100, 2, 13, "s3")],
      { 100: "Adrian Schmid" },
      new Map([[1, "Ca-Junioren"], [2, "Cb-Junioren"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`Schmid;Adrian;Ca-Junioren;${L_MEHR};;="100"`);
    expect(zeile).not.toContain("13");
    /* Und an der Person steht die 13 weiterhin — die Zelle ist leer, die
       Daten sind es nicht. */
    expect(zeilen[0].rueckennummern).toEqual([13]);
    expect(zeilen[0].stammteamNummern).toEqual([]);
  });
});

describe("alsMannschaftsliste — Maskierung", () => {
  it("⚠ ein Feld mit Semikolon wird in Anführungszeichen gesetzt", () => {
    /* Vorsorge: heute trägt kein Mannschaftsname ein Semikolon. Käme je eines
       vom Verband, verschöben sich die Spalten der ganzen Zeile — lautlos,
       weil eine verschobene Spalte plausibel aussieht. */
    /* ⚠ Die Teile ausdruecklich: das Semikolon gehoert in den NACHNAMEN,
       also in die Spalte „Name". Waere es der Ableitung ueberlassen, landete
       es im Vornamen, und der Fall pruefte die Trennregel der Attrappe. */
    const zeilen = [sp(1, "Meier; Hans", ["1. Mannschaft; B"], [],
      { vorname: "Hans", nachname: "Meier;" })];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(`"Meier;";Hans;"1. Mannschaft; B";${L_EIN};;="1"`);
  });

  it("ein inneres Anführungszeichen wird verdoppelt", () => {
    const zeilen = [sp(1, 'Hans "Hasi" Meier', ["T1"], [],
      { vorname: 'Hans "Hasi"', nachname: "Meier" })];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile.startsWith('Meier;"Hans ""Hasi""";T1;')).toBe(true);
  });

  it("ein Zeilenumbruch im Namen zerreisst die Datei nicht", () => {
    const zeilen = [sp(1, "Hans\nMeier", ["T1"])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    expect(csv).toContain('"Hans\nMeier"');
  });

  it("ein Feld ohne Sonderzeichen bleibt UNGEQUOTET", () => {
    /* Die Gegenprobe zur Maskierung: quotet sie unbedingt, träfe die
       Personennummer-Zelle es mit, und deren Textform wäre zerstört. */
    const zeilen = [sp(1, "Adrian Schmid", ["1. Mannschaft"], [7])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).not.toContain('"Adrian');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Das Stammteam — durch die ganze Kette, mit ECHTEN Aufstellungszeilen

   ⚠ Die Fälle hier gehen absichtlich NICHT über die `sp()`-Attrappe: die
   trägt das Stammteam als gesetzten Wert, und dann prüfte der Fall die
   Attrappe. Gefragt ist die Verdrahtung `baueSpielerZeilen` →
   `bestimmeStammteam()` → Spalte — also der Weg von der Aufstellungszeile
   bis in die Zelle. Die Regel selbst hat ihre eigenen Fälle in
   `stammteam.test.ts`.
   ══════════════════════════════════════════════════════════════════════ */

/** Eine echte Aufstellungszeile. ⚠ `spielzeit` ist Pflicht — siehe den
    Kommentar an `AufstellungFuerListe`. */
const a = (
  person: number, team: number | null, nr: number | null, spiel: string,
  spielzeit: number | null = 90,
): AufstellungFuerListe =>
  ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: spiel, spielzeit });

describe("Das Stammteam — gegen baueSpielerZeilen", () => {
  it("⚠ bei GENAU EINER Mannschaft sagt die Spalte „nur dieses Team“", () => {
    const zeilen = baueSpielerZeilen(
      [a(100, 1, 7, "s1"), a(100, 1, 7, "s2")],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    expect(zeilen[0].stammteam).toBe("1. Mannschaft");
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten).toEqual([`Schmid;Adrian;1. Mannschaft;${L_EIN};7;="100"`]);
  });

  it("⚠ bei ZWEI Mannschaften mit Vorsprung sagt sie „meiste Einsätze“", () => {
    /* Der gemessene Fall: 27 von 287 laufen in zwei Mannschaften auf. Der
       Weg von der Aufstellung bis in die Datei gehört einmal ganz geprüft —
       und er ergibt seit dem 24.09.2026 EINE Zeile statt zwei. */
    const zeilen = baueSpielerZeilen(
      /* Team 2 hat mehr Einsätze — die Mannschaft wird also nicht über die
         Reihenfolge und nicht über die kleinere Nummer gewählt, sondern
         gezählt. Ein Fall mit je einem Einsatz wäre ein Gleichstand und
         träfe Team 1 zufällig richtig. */
      [a(100, 1, 7, "s1"), a(100, 2, 13, "s2"), a(100, 2, 13, "s3")],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"], [2, "2. Mannschaft"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    expect(zeilen[0].stammteam).toBe("2. Mannschaft");
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    /* ⚠ `13` und nicht `7, 13` — die Nummer der 1. Mannschaft fällt seit dem
       24.09.2026 weg. Dieser Fall handelt von der Mannschaftswahl, die
       Nummer war nur Beifang; die Zusage zum Schnitt hat ihre eigenen zwei
       Fälle weiter oben. */
    expect(daten).toEqual([`Schmid;Adrian;2. Mannschaft;${L_MEHR};13;="100"`]);
  });

  /* ⚠ ⚠  DER GLEICHSTAND BIS IN DIE ZELLE — und er ist der Grund, aus dem
     die Spalte überhaupt existiert. Bis zum 24.09.2026 stand hier derselbe
     Text wie beim Fall darüber, und eine willkürlich gewählte Mannschaft war
     von einer mit klarem Vorsprung nicht zu unterscheiden.

     ⚠ Je EIN Einsatz, also Gleichstand — gewählt wird Team 1, weil seine
     Nummer die kleinere ist, nicht weil es zuerst kommt. Die Eingabe ist
     deshalb absichtlich mit Team 2 VORNE geschrieben. */
  it("⚠ bei einem GLEICHSTAND sagt die Spalte „Gleichstand“, nicht „meiste Einsätze“", () => {
    const zeilen = baueSpielerZeilen(
      [a(100, 2, 13, "s1"), a(100, 1, 7, "s2")],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"], [2, "2. Mannschaft"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    expect(zeilen[0].stammteam).toBe("1. Mannschaft");
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten).toEqual([`Schmid;Adrian;1. Mannschaft;${L_GLEICH};7;="100"`]);
    /* ⚠ Die tragende Hälfte: der Text ist ein ANDERER als bei einem echten
       Vorsprung. Ohne sie wäre der Fall grün, wenn beide Lagen wieder
       denselben Text bekämen — also genau im Zustand von vorher. */
    expect(daten[0]).not.toContain(L_MEHR);
  });

  it("⚠ eine Zeile ohne Spielzeit zählt als Einsatz — 12 von 14 Trainingsspielen haben keine", () => {
    /* ⚠ Die Zusage der Regel, an der Kette geprüft: `null` ist eine
       FEHLENDE MESSUNG, nicht „kein Einsatz". Würde sie wegzählen, gewänne
       hier Team 1 mit seinem einen gemessenen Einsatz — und die Spalte
       nennte die falsche Mannschaft, ohne dass etwas fehlschlägt. */
    const zeilen = baueSpielerZeilen(
      [a(100, 1, 7, "s1", 90), a(100, 2, 13, "s2", null), a(100, 2, 13, "s3", null)],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"], [2, "2. Mannschaft"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    expect(zeilen[0].stammteam).toBe("2. Mannschaft");
  });

  it("⚠ eine unauflösbare Team-Id behält ihren Platzhalter AUCH im Stammteam", () => {
    /* Dieselbe Zusage wie für `teams` — und sie muss an beiden Orten
       gelten, sonst zeigt die Spalte `Team` etwas anderes als die
       Textliste. Gegengeprobt: mit `OHNE_MANNSCHAFT` als Rückfall im
       Stammteam ist dieser Fall rot und der Fall auf `teams` bleibt grün. */
    const zeilen = baueSpielerZeilen(
      [a(700, 58655, 7, "s1")],
      { 700: "Wilma Weber" },
      new Map(),
      teileAus({ 700: "Wilma Weber" }),
    );
    expect(zeilen[0].stammteam).toBe("Team 58655");
    expect(zeilen[0].stammteamSchluessel).toBe("58655");
    const daten = datenzeilen(alsMannschaftsliste(zeilen, new Set(["58655"])));
    expect(daten).toEqual([`Weber;Wilma;Team 58655;${L_EIN};7;="700"`]);
  });

  it("⚠ eine Person, deren Zeilen ALLE keine Team-Id tragen, steht unter „-“", () => {
    /* Der zweite Weg zu `ohne_team`: nicht „keine Aufstellungszeile" (die
       Person käme in dieser Liste gar nicht vor), sondern Zeilen, deren
       `sfv_team_id` null ist. Die Spalte ist nullable, und ob es solche
       Zeilen im Bestand gibt, ist ungemessen — der Fall hält fest, was
       dann herauskommt, statt es offen zu lassen. */
    const zeilen = baueSpielerZeilen(
      [a(100, null, 7, "s1")],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"]]),
      teileAus({ 100: "Adrian Schmid" }),
    );
    expect(zeilen[0].stammteamSchluessel).toBe("-");
    const daten = datenzeilen(alsMannschaftsliste(zeilen, new Set(["-"])));
    expect(daten).toEqual([`Schmid;Adrian;${OHNE_MANNSCHAFT};${L_OHNE};7;="100"`]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DIE AUSWAHL TRIFFT ÜBER DIE ID, NICHT ÜBER DEN ANZEIGENAMEN

   Die Kästchen in der Maske kommen aus `gruppiereNachTeam()` und tragen
   `String(sfv_team_id)`. Die Zeilen kommen aus `baueSpielerZeilen()` und
   tragen einen Anzeigenamen. **Beides ist `string` — der Typ passt, die
   Bedeutung nicht.**

   ⚠ Gemessen am 24.09.2026: filterte die Ausgabe gegen den NAMEN, liess
   sich das Kästchen setzen, der Download lief, und die Datei enthielt
   **nur die Kopfzeile**. Kein Fehler, keine Meldung.

   ── ⚠ ⚠  UND DIE ERSTE REPARATUR WAR DIE FALSCHE ─────────────────────

   Sie machte beide Seiten auf denselben NAMEN gleich (`OHNE_MANNSCHAFT`
   statt `Team 58655`). Das traf sich — und opferte eine Zusage, die ein
   bestehender Test seit langem hielt: *„«Team 99» sagt, dass die
   Team-Zuordnung fehlt"*, samt der Nummer, die sie braucht.

   **Der Test hat die Reparatur aufgehalten, und er hatte recht.** Wer
   einen roten Test anpasst, bis er grün ist, löscht die Meldung statt den
   Fehler — hier wäre es eine Meldung gewesen, die niemand vermisst hätte.

   Die richtige Lösung opfert keinen der beiden Werte: `SpielerZeile`
   trägt `teamSchluessel` NEBEN `teams`, gefiltert wird über den
   Schlüssel, angezeigt der Name.
   ══════════════════════════════════════════════════════════════════════ */

describe("⚠ Gewählt wird über den Schlüssel, angezeigt der Name", () => {
  it("eine unauflösbare Team-Id behält ihren erkennbaren Platzhalter", () => {
    /* Die Zusage, die die erste Reparatur geopfert hätte. */
    const zeilen = baueSpielerZeilen(
      [a(700, 58655, 7, "s1")],
      { 700: "Wilma Weber" },
      new Map(),           // ⚠ leer: die Id ist nicht auflösbar
      teileAus({ 700: "Wilma Weber" }),
    );
    expect(zeilen[0].teams).toEqual(["Team 58655"]);
    expect(zeilen[0].teamSchluessel).toEqual(["58655"]);
  });

  it("⚠ und die Auswahl über die ID trifft sie trotzdem", () => {
    /* Die zweite Hälfte, und die wichtigere: dass der Platzhalter bleibt,
       nützt nur, wenn die Auswahl greift. Ein Fall auf den Namen allein
       wäre grün, während die Datei leer bleibt. */
    const zeilen = baueSpielerZeilen(
      [a(700, 58655, 7, "s1")],
      { 700: "Wilma Weber" },
      new Map(),
      teileAus({ 700: "Wilma Weber" }),
    );
    const csv = alsMannschaftsliste(zeilen, new Set(["58655"]));
    /* ⚠ Nachname zuerst: „Wilma Weber" stuende so in keiner Zeile mehr.
       Ein Muster auf den zusammengesetzten Namen waere ab dem 24.09.2026
       dauerhaft rot — und der Fall handelt von der Auswahl, nicht vom Namen. */
    expect(csv).toMatch(/Weber;Wilma/);
    /* ⚠ Ueber `datenzeilen()`, nicht selbst gezaehlt: der Helfer gibt es
       schon, und die Zeilenenden von Hand zu schreiben hat hier beim
       ersten Versuch echte Steuerzeichen in den Quelltext gelegt statt
       Escapes. Wo ein Helfer existiert, wird nicht nachgerechnet. */
    expect(datenzeilen(csv)).toHaveLength(1);
  });

  it("⚠ und der ANZEIGENAME als Auswahl trifft NICHT — das war der Fehler", () => {
    /* Die Gegenrichtung, ohne die der Fall eine Tautologie wäre: hätte
       `alsMannschaftsliste` beides akzeptiert, wäre nie aufgefallen, dass
       die Maske den falschen Schlüssel schickte. */
    const zeilen = baueSpielerZeilen(
      [a(700, 58655, 7, "s1")],
      { 700: "Wilma Weber" },
      new Map(),
      teileAus({ 700: "Wilma Weber" }),
    );
    const csv = alsMannschaftsliste(zeilen, new Set(["Team 58655"]));
    expect(datenzeilen(csv)).toHaveLength(0);
  });
});

describe("⚠ Vorname und Name kommen aus den TEILEN, nie aus einer Trennung", () => {
  /* Der Grund, aus dem `baueSpielerZeilen` ein viertes Argument bekam und es
     PFLICHT ist statt optional: der Compiler nennt so jede Aufrufstelle. Und
     der Grund, aus dem hier vier echte Namen stehen statt „Hans Meier":

     ⚠ JEDE Trennung am Leerzeichen ist bei mindestens einem von ihnen falsch,
     und zwar in BEIDE Richtungen. „Lorena Sara Hug" braucht die Trennung am
     LETZTEN Leerzeichen, „Tamara Hidber Mullis" am ERSTEN — es gibt keine
     Regel, die beide trifft. Deshalb wird nicht getrennt, sondern genommen,
     was der Verband getrennt liefert. */
  /* ⚠ ⚠  DIESE AUFTEILUNGEN SIND KONSTRUIERT, NICHT GEMESSEN.
     Welches Wort der Verband bei diesen vier Menschen in `firstname` und
     welches in `name` legt, ist ungemessen: `secondName` hat in der
     Spezifikation weder Beschreibung noch Beispiel (geprüft am 24.09.2026
     an `docs/sfv/swagger_2026-08-28.json`), und in keiner Spalte steht es.
     Die Zusage hier ist deshalb NICHT „Lorenas Vorname ist X", sondern:
     **was als `firstname` ankommt, bleibt Vorname.**

     ⚠ Und der Beleg dafür liegt in der PAARUNG, nicht im Einzelfall: Zeile 1
     und 3 wären nur durch eine Trennung am LETZTEN Leerzeichen zu treffen,
     Zeile 2 und 4 nur durch eine am ERSTEN. Keine der beiden Regeln besteht
     alle vier — nur das Durchreichen. Ein Fall allein wäre grün, egal welche
     Regel der Code anwendet, und genau das ist beim ersten Versuch passiert:
     die Sabotage „trenne am ersten Leerzeichen" machte 2 von 4 rot statt 4. */
  const FAELLE: Array<[string, string, string]> = [
    /* Zwei Vornamen → nur eine Trennung am LETZTEN Leerzeichen träfe das */
    ["Lorena Sara", "Hug", "Hug;Lorena Sara"],
    /* Allianzname, zwei Nachnamen → nur eine am ERSTEN träfe das */
    ["Tamara", "Hidber Mullis", "Hidber Mullis;Tamara"],
    /* Drei Vornamen → wieder nur die letzte */
    ["Stella Laerke Mina", "Johansen", "Johansen;Stella Laerke Mina"],
    /* Spanische Doppelform, zwei Nachnamen → wieder nur die erste */
    ["Karmen", "Zerdilas Herrera", "Zerdilas Herrera;Karmen"],
  ];

  for (const [vorname, nachname, erwartet] of FAELLE) {
    it(`„${vorname} ${nachname}" bleibt getrennt, wie der Verband es liefert`, () => {
      const zeilen = baueSpielerZeilen(
        [a(1, 1, 7, "s1")],
        { 1: `${vorname} ${nachname}` },
        new Map([[1, "T"]]),
        { 1: { vorname, nachname } },
      );
      const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, new Set(["1"])));
      expect(zeile).toBe(`${erwartet};T;${L_EIN};7;="1"`);
    });
  }

  it("⚠ ohne Teile steht der GANZE Name unter Name, und Vorname bleibt LEER", () => {
    /* Der Rueckfall, und er raet ausdruecklich nicht. Eine leere Zelle ist
       eine Auskunft — eine falsch getrennte eine Behauptung, und die stuende
       in einer Liste, die jemand abhakt. */
    const zeilen = baueSpielerZeilen(
      [a(1, 1, 7, "s1")],
      { 1: "Lorena Sara Hug" },
      new Map([[1, "T"]]),
      {},                                  // ⚠ keine Teile bekannt
    );
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, new Set(["1"])));
    expect(zeile).toBe(`Lorena Sara Hug;;T;${L_EIN};7;="1"`);
  });

  it("⚠ und die Sortierung folgt dem NACHNAMEN, nicht dem ganzen Namen", () => {
    /* Die Gegenprobe zur Spaltenfrage: waere `name` weiterhin der
       zusammengesetzte Wert, stuende „Anna Zeller" vor „Bruno Amrein". In
       einer Liste zum Abhaken sucht man den Nachnamen. */
    const z = (id: number, vorname: string, nachname: string): SpielerZeile => ({
      sfv_person_id: id, name: `${vorname} ${nachname}`, teams: ["T"],
      teamSchluessel: ["k"], stammteamSchluessel: "k", stammteam: "T",
      stammteamRegel: "nur_dieses_team",
      rueckennummern: [], stammteamNummern: [], einsaetze: 1, vorname, nachname,
    });
    const zeilen = [z(1, "Anna", "Zeller"), z(2, "Bruno", "Amrein")];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, new Set(["k"])));
    expect(daten.map(d => d.split(";")[0])).toEqual(["Amrein", "Zeller"]);
  });
});
