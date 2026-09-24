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

   4. ⚠ Eine Person darf hier MEHRFACH stehen, eine Zeile je
      Mannschaft — anders als in der Textliste. Der Zuschnitt ist die
      Mannschaft, nicht die Person.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  baueSpielerZeilen, alsMannschaftsliste, MANNSCHAFTSLISTE_SPALTEN, OHNE_NAMEN,
} from "../spielerAusgabe.ts";
import { OHNE_MANNSCHAFT } from "../matchdatenAnzeige.ts";
import type { SpielerZeile } from "../spielerAusgabe.ts";
import type { AufstellungZeile } from "../matchdatenAnzeige.ts";

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
): SpielerZeile => ({
  sfv_person_id, name, teams,
  teamSchluessel: teams.map(t => `k:${t}`),
  rueckennummern, einsaetze: 1,
});

/** Alle Mannschaften, die in den Zeilen vorkommen — der Normalfall der Maske.
    ⚠ Als SCHLUESSEL, nicht als Name: das ist, was die Maske an
    `alsMannschaftsliste()` uebergibt. */
const alleTeams = (zeilen: SpielerZeile[]): ReadonlySet<string> =>
  new Set(zeilen.flatMap(z => z.teamSchluessel.length ? z.teamSchluessel : ["-"]));

/** Die Datenzeilen ohne Kopf und ohne BOM. */
function datenzeilen(csv: string): string[] {
  const zeilen = csv.replace(BOM, "").split("\r\n").filter(z => z !== "");
  return zeilen.slice(1);
}

describe("alsMannschaftsliste — Form der Datei", () => {
  it("die Kopfzeile trägt Name, Team, Rückennummer und SFV-personId, mit Semikolon getrennt", () => {
    const zeilen = [sp(100, "Adrian Schmid", ["1. Mannschaft"], [7])];
    const csv = alsMannschaftsliste(zeilen, alleTeams(zeilen));
    const kopf = csv.replace(BOM, "").split("\r\n")[0];
    expect(kopf).toBe("Name;Team;Rückennummer;SFV-personId");
    /* Die Reihenfolge ist bestellt, nicht abgeleitet — deshalb wörtlich. */
    expect([...MANNSCHAFTSLISTE_SPALTEN]).toEqual(
      ["Name", "Team", "Rückennummer", "SFV-personId"]);
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
    expect(zeile).toBe('Adrian Schmid;1. Mannschaft;9, 18, 21;="100"');
  });

  it("keine Rückennummer ergibt eine leere Zelle, nicht eine Null", () => {
    const zeilen = [sp(100, "Adrian Schmid", ["1. Mannschaft"], [])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe('Adrian Schmid;1. Mannschaft;;="100"');
  });

  it('⚠ ein fehlender Name bleibt LEER — nicht „Nr. 13“ und nicht OHNE_NAMEN', () => {
    /* In der Textliste steht dort eine Warnung, hier nicht: dies ist ein
       Datenfeld, und ein Warntext würde sortiert und gefiltert wie ein Name. */
    const zeilen = [sp(100, "", ["1. Mannschaft"], [13])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe(';1. Mannschaft;13;="100"');
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
    expect(datenzeilen(csv)[0]).toBe(`Adrian Schmid;${OHNE_MANNSCHAFT};;="100"`);
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
    expect(daten.map(z => z.split(";").slice(0, 2).join(" / "))).toEqual([
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
    expect(datenzeilen(csv)).toEqual(['B;2. Mannschaft;;="2"']);
  });

  it("⚠ eine Person in zwei gewählten Mannschaften steht ZWEIMAL da, je einmal", () => {
    /* Der Unterschied zur Textliste, und er ist gewollt: der Zuschnitt ist
       hier die Mannschaft. Wer die Liste der Cb-Junioren durchgeht, will die
       Person darin sehen, auch wenn sie zusätzlich bei den Ca-Junioren steht. */
    const zeilen = [sp(100, "Adrian Schmid", ["Ca-Junioren", "Cb-Junioren"], [9])];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten).toEqual([
      'Adrian Schmid;Ca-Junioren;9;="100"',
      'Adrian Schmid;Cb-Junioren;9;="100"',
    ]);
  });

  it("dieselbe Person erscheint nur einmal, wenn nur eine ihrer Mannschaften gewählt ist", () => {
    const zeilen = [sp(100, "Adrian Schmid", ["Ca-Junioren", "Cb-Junioren"], [9])];
    const daten = datenzeilen(alsMannschaftsliste(zeilen, new Set(["k:Cb-Junioren"])));
    expect(daten).toEqual(['Adrian Schmid;Cb-Junioren;9;="100"']);
  });
});

describe("alsMannschaftsliste — Maskierung", () => {
  it("⚠ ein Feld mit Semikolon wird in Anführungszeichen gesetzt", () => {
    /* Vorsorge: heute trägt kein Mannschaftsname ein Semikolon. Käme je eines
       vom Verband, verschöben sich die Spalten der ganzen Zeile — lautlos,
       weil eine verschobene Spalte plausibel aussieht. */
    const zeilen = [sp(1, "Meier; Hans", ["1. Mannschaft; B"])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile).toBe('"Meier; Hans";"1. Mannschaft; B";;="1"');
  });

  it("ein inneres Anführungszeichen wird verdoppelt", () => {
    const zeilen = [sp(1, 'Hans "Hasi" Meier', ["T1"])];
    const [zeile] = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(zeile.startsWith('"Hans ""Hasi"" Meier";T1;')).toBe(true);
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

describe("alsMannschaftsliste — gegen baueSpielerZeilen", () => {
  it("trägt eine Person, die in zwei Mannschaften aufläuft, aus echten Aufstellungszeilen", () => {
    /* Der gemessene Fall: 27 von 287 laufen in zwei Mannschaften auf. Der
       Weg von der Aufstellung bis in die Datei gehört einmal ganz geprüft. */
    const a = (person: number, team: number | null, nr: number | null, spiel: string):
      AufstellungZeile => ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: spiel });
    const zeilen = baueSpielerZeilen(
      [a(100, 1, 7, "s1"), a(100, 2, 13, "s2")],
      { 100: "Adrian Schmid" },
      new Map([[1, "1. Mannschaft"], [2, "2. Mannschaft"]]),
    );
    const daten = datenzeilen(alsMannschaftsliste(zeilen, alleTeams(zeilen)));
    expect(daten).toEqual([
      'Adrian Schmid;1. Mannschaft;7, 13;="100"',
      'Adrian Schmid;2. Mannschaft;7, 13;="100"',
    ]);
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
      [{ sfv_person_id: 700, sfv_team_id: 58655, rueckennr: 7 }] as never,
      { 700: "Wilma Weber" },
      new Map(),           // ⚠ leer: die Id ist nicht auflösbar
    );
    expect(zeilen[0].teams).toEqual(["Team 58655"]);
    expect(zeilen[0].teamSchluessel).toEqual(["58655"]);
  });

  it("⚠ und die Auswahl über die ID trifft sie trotzdem", () => {
    /* Die zweite Hälfte, und die wichtigere: dass der Platzhalter bleibt,
       nützt nur, wenn die Auswahl greift. Ein Fall auf den Namen allein
       wäre grün, während die Datei leer bleibt. */
    const zeilen = baueSpielerZeilen(
      [{ sfv_person_id: 700, sfv_team_id: 58655, rueckennr: 7 }] as never,
      { 700: "Wilma Weber" },
      new Map(),
    );
    const csv = alsMannschaftsliste(zeilen, new Set(["58655"]));
    expect(csv).toMatch(/Wilma Weber/);
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
      [{ sfv_person_id: 700, sfv_team_id: 58655, rueckennr: 7 }] as never,
      { 700: "Wilma Weber" },
      new Map(),
    );
    const csv = alsMannschaftsliste(zeilen, new Set(["Team 58655"]));
    expect(datenzeilen(csv)).toHaveLength(0);
  });
});
