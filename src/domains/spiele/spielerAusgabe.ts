/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/spielerAusgabe.ts

   Die Spielerliste für die Übertragung nach WordPress.

   ⚠ DER NAME WIRD NICHT GESPEICHERT, und dieses Modul ändert daran
   nichts. Er kommt live aus der SFV-Antwort, liegt im Zustand der
   Zuordnungsmaske, und diese Funktionen bauen daraus einen Text —
   im Browser, in der Sitzung. **Nichts davon geht an den Server
   zurück:** kein `api_sync_log`, keine Datei, kein zweiter Aufruf
   beim Verband. (Bedingung Didi, 25.08.2026.)

   ⚠ EIGENE AGGREGATION, NICHT `offeneZuordnungen()`. Die behält pro
   Person nur die ERSTE `sfv_team_id` — die Map-Zeile wird einmal
   angelegt und der Wert nie ergänzt. Für die Maske reicht das (sie
   gruppiert und braucht einen Ort); für eine Liste, die jemand
   abhakt, nicht: 27 der 287 Spieler laufen in ZWEI Mannschaften auf,
   durchweg benachbarte Stufen (1./2. Mannschaft, Ca/Cb, Ba/Bb).

   Eine Zeile je Mannschaft wäre die andere Möglichkeit gewesen — 314
   Zeilen für 287 Spieler. Verworfen: dann steht jemand zweimal in der
   Liste, und beim Abhaken übersieht man den zweiten. (Didi.)
   ═══════════════════════════════════════════════════════════════ */
import { OHNE_MANNSCHAFT } from "./matchdatenAnzeige.ts";
import type { AufstellungZeile } from "./matchdatenAnzeige.ts";

export interface SpielerZeile {
  sfv_person_id: number;
  /** Aus der SFV-Antwort; leer, wenn der Verband keinen liefert.
      ⚠ Die ABLEITUNG aus `vorname`/`nachname`, wo die Teile vorliegen. */
  name: string;
  /**
   * `firstname` des Verbands, ungetrennt.
   *
   * ⚠ ⚠  LEER, WENN DIE TEILE NICHT VORLIEGEN — und dann bleibt die
   * Spalte leer, statt am Leerzeichen geraten zu werden. „Lorena Sara
   * Hug" und „Tamara Hidber Mullis" trennt dieselbe Regel entgegengesetzt
   * falsch; eine leere Zelle ist eine Auskunft, eine falsch getrennte
   * eine Behauptung.
   */
  vorname: string;
  /** `name` des Verbands, ungetrennt. Leer, wenn die Teile fehlen. */
  nachname: string;
  /** ALLE Mannschaften, in denen die Person aufgelaufen ist — als
      ANZEIGENAME. Unbekannte Id: `Team 58655`. */
  teams: string[];
  /** Dieselben Mannschaften als AUSWAHLSCHLUESSEL — `String(sfv_team_id)`,
      dieselbe Form wie `gruppiereNachTeam()` sie bildet.
      ⚠ Getrennt von `teams`, weil ein Anzeigename sich aendern darf und
      ein Schluessel nicht. */
  teamSchluessel: string[];
  /** ALLE Rückennummern — 58 der 287 laufen unter mehr als einer. */
  rueckennummern: number[];
  einsaetze: number;
}

/**
 * Eine Zeile je Spieler, mit allen Mannschaften und allen Nummern.
 *
 * Sortiert nach Mannschaft, dann nach Name — nicht nach Einsätzen wie in der
 * Maske. Dort sucht man den nächsten zu bearbeitenden Spieler; hier hakt man
 * eine Liste ab, und dafür ist die Reihenfolge der Mannschaften die, in der
 * jemand auch die WordPress-Beiträge durchgeht.
 */
export function baueSpielerZeilen(
  aufstellung: AufstellungZeile[],
  namen: Record<number, string>,
  teamNamen: Map<number, string>,
  /**
   * Die getrennten Teile, wo der Verband sie geliefert hat.
   *
   * ⚠ ⚠  PFLICHTARGUMENT UND NICHT OPTIONAL — mit Absicht. Optional
   * haette jeder bestehende Aufrufer weitergebaut, und die Teile waeren an
   * einer Stelle da und an der anderen nicht, ohne dass etwas meldet. So
   * nennt der Compiler jede Aufrufstelle einmal.
   */
  teile: Record<number, { vorname: string; nachname: string }>,
): SpielerZeile[] {
  const proPerson = new Map<number, SpielerZeile & { teamIds: Set<number> }>();

  for (const a of aufstellung) {
    let z = proPerson.get(a.sfv_person_id);
    if (!z) {
      const ganz = namen[a.sfv_person_id] ?? "";
      const t = teile[a.sfv_person_id];
      z = {
        sfv_person_id: a.sfv_person_id,
        name: ganz,
        vorname: t?.vorname ?? "",
        /* ⚠ ⚠  DER RUECKFALL LEGT DEN GANZEN NAMEN IN `nachname`, NICHT
           IN `vorname`. Liefert die Gegenstelle die Teile nicht (eine
           Fassung vor dem 24.09.2026), ist die Trennung unbekannt — und
           dann gehoert der ganze Name in die Spalte, die im Export `Name`
           heisst, damit er nicht verloren geht. `Vorname` bleibt leer und
           zeigt damit an, dass nicht getrennt wurde.

           ⚠ Die Alternative waere, am Leerzeichen zu raten. „Lorena Sara
           Hug" und „Tamara Hidber Mullis" trennt dieselbe Regel
           entgegengesetzt falsch — eine leere Zelle ist eine Auskunft,
           eine falsch getrennte eine Behauptung. */
        nachname: t?.nachname ?? ganz,
        teams: [], teamSchluessel: [], teamIds: new Set(), rueckennummern: [], einsaetze: 0,
      };
      proPerson.set(a.sfv_person_id, z);
    }
    z.einsaetze += 1;
    if (a.sfv_team_id !== null) z.teamIds.add(a.sfv_team_id);
    if (a.rueckennr !== null && !z.rueckennummern.includes(a.rueckennr)) {
      z.rueckennummern.push(a.rueckennr);
    }
  }

  const zeilen: SpielerZeile[] = [...proPerson.values()].map(z => ({
    sfv_person_id: z.sfv_person_id,
    name: z.name,
    vorname: z.vorname,
    nachname: z.nachname,
    /* ⚠ Sortiert, damit „2. Mannschaft, 3. Mannschaft" nicht mal so und mal
       andersherum dasteht — sonst sieht dieselbe Person bei zwei Läufen
       verschieden aus. */
    /* ⚠ `Team ${id}` bleibt der Platzhalter — er sagt, DASS die
       Team-Zuordnung fehlt, und WELCHE Nummer sie braucht. Ein Test haelt
       das seit langem fest, und er hat am 24.09.2026 eine Reparatur
       aufgehalten, die ihn geopfert haette. */
    teams: [...z.teamIds].map(id => teamNamen.get(id) || `Team ${id}`).sort(),
    /* ⚠ ⚠  DER SCHLUESSEL FUER DIE AUSWAHL — und er ist NICHT der
       Anzeigename.

       Die Mannschafts-Auswahl in der Maske kommt aus
       `gruppiereNachTeam()`, und die gruppiert nach `sfv_team_id`. Wer
       hier gegen `teams` filtert, vergleicht ANZEIGENAMEN mit
       GRUPPENSCHLUESSELN — beides `string`, der Typ passt, die Bedeutung
       nicht. Gemessen am 24.09.2026: das Kaestchen laesst sich setzen,
       der Download laeuft, und die Datei enthaelt nur die Kopfzeile.

       ⚠ Und `String(id)` ist genau die Form, die `gruppiereNachTeam`
       bildet (`String(o.sfv_team_id ?? "-")`). Eine Person ohne jede
       Team-Id bekommt hier eine LEERE Liste und ist damit ueber kein
       Kaestchen erreichbar — in der Maske steht sie unter `"-"`. Das ist
       die eine Lage, die beide Seiten noch verschieden sehen; heute
       folgenlos, weil `bildeAufstellung` ohne Team-Id keine Zeile
       schreibt. */
    teamSchluessel: [...z.teamIds].map(String).sort(),
    rueckennummern: [...z.rueckennummern].sort((a, b) => a - b),
    einsaetze: z.einsaetze,
  }));

  return zeilen.sort((a, b) =>
    (a.teams[0] || "").localeCompare(b.teams[0] || "", "de")
    || (a.name || "￿").localeCompare(b.name || "￿", "de")
    /* ⚠ Der Vorname als zweite Ebene: zwei Adrian Schmid gibt es in
       diesem Verein nachweislich, und ohne sie stuenden zwei Menschen mit
       demselben Nachnamen in zufaelliger Reihenfolge. */
    || a.vorname.localeCompare(b.vorname, "de"));
}

/* ── A · Nachschlageliste ───────────────────────────────────────── */

/** Steht anstelle des Namens, wenn der Verband keinen geliefert hat. */
export const OHNE_NAMEN = "⚠ KEIN NAME VOM VERBAND";

/**
 * Zum Danebenlegen beim Zuordnen — geht in die Zwischenablage.
 *
 * ⚠ SPIELER OHNE NAMEN STEHEN DRIN, deutlich markiert. Sie wegzulassen wäre
 * die stille Variante, und am 22.08.2026 betraf das 48 von 177 — 27 %. Wer
 * eine Liste abhakt, muss sehen, dass dort jemand fehlt, statt es nicht zu
 * erfahren. (Didi, 25.08.2026.)
 */
export function alsTextliste(zeilen: SpielerZeile[]): string {
  const teil: string[] = [];
  /* ⚠ Der Waechterwert ist das NUL-Zeichen, geschrieben als ESCAPE.
     Bis zum 05.09.2026 stand hier das rohe Byte — damit hielt grep die
     ganze Datei fuer binaer und uebersprang sie stillschweigend. Der
     Laufzeitwert ist derselbe; nur die Datei ist wieder durchsuchbar.
     Geprueft von scripts/check-encoding.mjs. */
  let letztesTeam = "\0";

  for (const z of zeilen) {
    /* ⚠ Die Konstante, nicht die getippte Zeichenkette — ihr eigener
       Kommentar in matchdatenAnzeige.ts verlangt genau das. Wertgleich
       zum Stand davor, es ändert sich keine Ausgabe. */
    const team = z.teams.join(", ") || OHNE_MANNSCHAFT;
    if (team !== letztesTeam) { teil.push(`\n${team}`); letztesTeam = team; }
    const nr = z.rueckennummern.length ? `Nr. ${z.rueckennummern.join(", ")}` : "";
    teil.push([
      String(z.sfv_person_id).padStart(9),
      (z.name || OHNE_NAMEN).padEnd(28),
      nr.padEnd(14),
      `${z.einsaetze} ${z.einsaetze === 1 ? "Einsatz" : "Einsätze"}`,
    ].join("  ").trimEnd());
  }
  return teil.join("\n").trimStart() + "\n";
}

/* ── B · WordPress-Importdatei ──────────────────────────────────── */

/** `&<>"` in XML-Text unschädlich machen. */
function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export interface WxrErgebnis {
  xml: string;
  /** Wie viele Spieler drin sind. */
  aufgenommen: number;
  /** ⚠ Wie viele fehlen, weil kein Name da war — gehört auf den Schirm. */
  uebergangen: number;
}

/**
 * WXR für den WordPress-Import.
 *
 * ⚠ WXR UND NICHT CSV. Der WordPress-Kern importiert ausschliesslich WXR
 * (WordPress eXtended RSS, XML); CSV setzt ein Plugin voraus (WP All Import,
 * WP Ultimate CSV Importer). Geprüft am 25.08.2026 — „CSV vermutlich" war die
 * naheliegende Annahme und traf nicht zu. WXR kann über `<wp:postmeta>` eigene
 * Felder tragen, also alles, was hier gebraucht wird.
 *
 * ⚠ `status: draft`. 287 auf einen Schlag veröffentlichte Spielerseiten mit
 * Namen und ohne Foto hat niemand bestellt. Entwurf heisst: im Backend da,
 * auf der Website nicht.
 *
 * ⚠ SPIELER OHNE NAMEN BLEIBEN HIER DRAUSSEN — anders als in der Textliste.
 * Ein WordPress-Entwurf ohne Titel ist Müll im Backend. Wie viele es waren,
 * steht in `uebergangen` und gehört dem Benutzer gesagt. (Didi, 25.08.2026.)
 */
export function alsWxr(zeilen: SpielerZeile[], postTyp = "spieler"): WxrErgebnis {
  const mitNamen = zeilen.filter(z => z.name.trim() !== "");

  const items = mitNamen.map((z, i) => `  <item>
    <title>${xml(z.name)}</title>
    <wp:post_id>${i + 1}</wp:post_id>
    <wp:post_type>${xml(postTyp)}</wp:post_type>
    <wp:status>draft</wp:status>
    <wp:postmeta>
      <wp:meta_key>sfv_person_id</wp:meta_key>
      <wp:meta_value><![CDATA[${z.sfv_person_id}]]></wp:meta_value>
    </wp:postmeta>
  </item>`).join("\n");

  /* ⚠ Die drei Namensräume sind Pflicht — ohne sie weist der WordPress-
     Importer die Datei ab, ohne zu sagen warum. `excerpt` und `content`
     stehen drin, obwohl hier nicht benutzt: der Importer erwartet sie. */
  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>ClubCampus — Spieler</title>
  <wp:wxr_version>1.2</wp:wxr_version>
${items}
</channel>
</rss>
`,
    aufgenommen: mitNamen.length,
    uebergangen: zeilen.length - mitNamen.length,
  };
}

/* ── C · Liste nach Mannschaft (CSV für Excel) ──────────────────────

   Zum Ausdrucken und Abhaken, mannschaftsweise — und damit die EINE
   Ausgabe, in der eine Person MEHRFACH stehen darf: eine Zeile je
   Person und Mannschaft. Der Kopf dieser Datei begründet, warum die
   Textliste das nicht tut (dort hakt man EINE Liste ab und übersieht
   den zweiten Eintrag). Hier ist die Mannschaft der Zuschnitt: wer die
   Liste der Cb-Junioren durchgeht, will die Person darin sehen, auch
   wenn sie zusätzlich bei den Ca-Junioren steht.

   ⚠ EIGENER CSV-SCHREIBER, OBWOHL `shared/list/exportUtils.ts` EINEN
   HAT — und das ist keine vergessene Dublette. `csvDownload()` dort
   quotet JEDES Feld unbedingt; die Textform der Personennummer
   (siehe `alsTextzelle`) verträgt das nicht: in Anführungszeichen
   gesetzt ist sie keine Zelle mehr, die Excel als Text übernimmt,
   sondern sichtbarer Text `="123"`. Deshalb hier bedingtes Quoten.
   Wer die zwei je zusammenlegt, legt zuerst diese Bedingung zusammen. */

/** Die Spaltenköpfe, in der bestellten Reihenfolge. */
export const MANNSCHAFTSLISTE_SPALTEN = [
  "Name", "Vorname", "Team", "Rückennummer", "SFV-personId",
] as const;

/* Excel in der Schweiz liest CSV mit Semikolon. */
const CSV_TRENNER = ";";

/**
 * Ein CSV-Feld, nur wenn nötig in Anführungszeichen.
 *
 * ⚠ VORSORGE, kein bekannter Fall: heute trägt kein Mannschaftsname ein
 * Semikolon, und die Nummernzelle trennt mit Komma. Ein Mannschaftsname kommt
 * aber vom Verband, und ein Trennzeichen darin zerschösse die Spalten der
 * ganzen Zeile — lautlos, weil eine verschobene Spalte plausibel aussieht.
 *
 * ⚠ Was es NICHT tut: ein Feld gegen Excel-Formeln sichern. Beginnt ein
 * Mannschaftsname je mit `=`, `+`, `-` oder `@`, wertet Excel ihn aus — auch
 * in Anführungszeichen. Nicht abgefangen, weil fremde Daten stillschweigend
 * zu putzen den Fehler versteckt statt ihn zu melden; offener Punkt, sobald
 * ein solcher Name auftaucht.
 */
/* ⚠ Das Anfuehrungszeichen steht als \u0022 und nicht als Zeichen: ein
   ASCII-" in einem Regex-Literal bringt den Scanner von
   scripts/check-quotes.mjs aus dem Tritt — er kennt keine Regex-Literale,
   haelt das Zeichen fuer einen Stringanfang und meldet danach Fehlalarm in
   dieser Datei (gemessen am 24.09.2026, Exit 1). Wertgleich; wer es
   zurueckvereinfacht, macht die Pruefkette rot.
   Dieselbe Familie wie das NUL-Byte, das grep verstummen liess. */
function csvFeld(wert: string): string {
  return /[;\u0022\r\n]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert;
}

/**
 * Die Personennummer so, dass Excel sie als TEXT übernimmt.
 *
 * ⚠ ANFÜHRUNGSZEICHEN ALLEIN GENÜGEN NICHT. `"1097318"` in einer CSV-Zeile
 * entpackt Excel und macht eine Zahl daraus; die Form `="1097318"` ist der
 * einzige Weg, der ohne Import-Assistenten eine Textzelle ergibt.
 *
 * ⚠ DER PREIS, und er gehört genannt: die Zelle ist damit eine FORMEL — in
 * Excel wie in LibreOffice. Angezeigt und beim gewöhnlichen Kopieren
 * übernommen wird `1097318`; wer die Rohzelle liest, bekommt `="1097318"`.
 *
 * ⚠ UND DIE GRENZE DER ZUSAGE, gemessen statt vermutet: `sfv_person_id` ist
 * in TypeScript eine `number` — führende Nullen sind strukturell unmöglich —
 * und die Nummern sind sechs- bis siebenstellig, also weit unter den 15
 * Stellen, ab denen Excel rundet. Der WERT geht also auch als Zahl nicht
 * verloren. Die Textform schützt den TYP, nicht den Wert: sie hält die Spalte
 * vergleichbar mit einer Textspalte und sortierbar wie eine Kennung. Wer sie
 * je gegen eine nackte Zahl tauscht, verliert nichts als das.
 */
function alsTextzelle(sfvPersonId: number): string {
  return `="${sfvPersonId}"`;
}

interface MannschaftsZeile {
  /** Der NACHNAME — oder der ganze Name, wenn die Teile fehlen. */
  name: string;
  /** Der Vorname. Leer, wenn die Gegenstelle die Teile nicht lieferte. */
  vorname: string;
  team: string;
  /** Alle Nummern in EINER Zelle, mit `, ` — wie die Maske sie zeigt. */
  nummern: string;
  sfvPersonId: number;
}

/**
 * Die Liste nach Mannschaft, als CSV für Excel.
 *
 * `teamsGewaehlt` nennt die Mannschaften beim NAMEN — dasselbe, was
 * `SpielerZeile.teams` führt und was die Maske gruppiert, einschliesslich
 * `OHNE_MANNSCHAFT` für die Personen ohne Team-Zuordnung.
 *
 * ⚠ EINE LEERE AUSWAHL ERGIBT KEINE DATENZEILE — und ausdrücklich nicht
 * alle. „Nichts gewählt“ und „alles gewählt“ dürfen nicht dasselbe bedeuten;
 * sonst bekommt jemand 314 Zeilen, der eine Mannschaft vergessen hat
 * anzuklicken, und hält sie für seine Auswahl.
 *
 * Der Spaltenkopf bleibt trotzdem stehen: eine Datei mit Köpfen und ohne
 * Zeilen ist eine leere Liste, eine ganz leere Datei sieht nach einem Fehler
 * beim Erzeugen aus.
 *
 * ⚠ EINE Namensspalte, und die Spalte `Vorname` ENTFÄLLT. Bestellt waren
 * beide, mit der Bedingung „nimm die getrennten Felder des Verbands, falls es
 * sie gibt“. Es gibt sie bei uns nicht: der Verband liefert `firstname`,
 * `name` und `secondName` getrennt, und `matchdaten.ts` setzt sie an vier
 * Stellen zusammen und verwirft die Teile (`sfv_personen.name` und
 * `spiel_aufstellung.name` führen EIN Feld). Eine leere Spalte `Vorname`
 * wäre eine Behauptung über die Person („hat keinen“); sie weglassen ist
 * eine Auskunft über unsere Daten.
 *
 * ⚠ Und NICHT am Leerzeichen trennen: „Lorena Sara Hug“ und „Tamara Hidber
 * Mullis“ sind mit derselben Regel nicht lösbar — beim einen ist der Vorname
 * zweiteilig, beim anderen der Nachname. Wer hier trennt, hat in der Hälfte
 * der Fälle recht und weiss nicht, in welcher.
 */
export function alsMannschaftsliste(
  zeilen: SpielerZeile[],
  teamsGewaehlt: ReadonlySet<string>,
): string {
  const daten: MannschaftsZeile[] = [];

  for (const z of zeilen) {
    /* ⚠ ⚠  GEWAEHLT WIRD UEBER DEN SCHLUESSEL, ANGEZEIGT WIRD DER NAME.

       Sie stehen paarweise in derselben Reihenfolge (beide aus `teamIds`,
       beide sortiert). Wer hier gegen `teams` filtert, vergleicht
       Anzeigenamen mit Gruppenschluesseln — beides `string`, der Typ
       passt, die Bedeutung nicht. Gemessen am 24.09.2026: Kaestchen
       setzbar, Download laeuft, Datei mit nur der Kopfzeile.

       ⚠ Eine Person ohne jede Team-Id steht unter demselben Namen wie in
       der Maske; ihr Schluessel ist dann `"-"`, wie `gruppiereNachTeam()`
       ihn bildet. */
    const paare: Array<[string, string]> = z.teamSchluessel.length
      ? z.teamSchluessel.map((k, i) => [k, z.teams[i] ?? OHNE_MANNSCHAFT])
      : [["-", OHNE_MANNSCHAFT]];
    for (const [schluessel, team] of paare) {
      if (!teamsGewaehlt.has(schluessel)) continue;
      daten.push({
        /* ⚠ Leer, wenn der Verband keinen Namen liefert — und hier NICHT
           `OHNE_NAMEN` wie in der Textliste. Dort ist es eine Anzeigezeile,
           hier ein Datenfeld: ein Warntext in der Namensspalte würde
           sortiert und gefiltert, als wäre er ein Name. */
        name: z.nachname,
        vorname: z.vorname,
        team,
        nummern: z.rueckennummern.join(", "),
        sfvPersonId: z.sfv_person_id,
      });
    }
  }

  /* Mannschaft, darin Name — `localeCompare` mit "de", damit Umlaute
     einsortiert werden und nicht hinter Z landen.
     ⚠ Der Wächterwert für den fehlenden Namen ist derselbe wie in
     `baueSpielerZeilen`, als ESCAPE geschrieben: zwei Ausgaben derselben
     Daten sollen nicht verschieden ordnen. */
  daten.sort((a, b) =>
    a.team.localeCompare(b.team, "de")
    || (a.name || "\uFFFF").localeCompare(b.name || "\uFFFF", "de"));

  const kopf = MANNSCHAFTSLISTE_SPALTEN.map(csvFeld).join(CSV_TRENNER);
  const zeilenText = daten.map(d => [
    csvFeld(d.name),
    csvFeld(d.vorname),
    csvFeld(d.team),
    csvFeld(d.nummern),
    /* ⚠ OHNE `csvFeld`: die Textform trägt selbst Anführungszeichen, und ein
       zweites Quoten machte aus der Zelle sichtbaren Text `="123"`. */
    alsTextzelle(d.sfvPersonId),
  ].join(CSV_TRENNER));

  /* ⚠ Führendes BOM, sonst liest Excel die Umlaute als Latin-1 — und ⚠ als
     ESCAPE geschrieben, nicht als rohes Byte: ein BOM im Quelltext ist genau
     das, was `scripts/check-encoding.mjs` abweist (dieselbe Regel wie beim
     NUL-Wächter in `alsTextliste`). Zeilenenden CRLF, weil Excel sie in CSV
     erwartet. */
  return "\uFEFF" + [kopf, ...zeilenText].join("\r\n") + "\r\n";
}
