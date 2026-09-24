/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/spielerAusgabe.ts

   Die Spielerliste für die Übertragung nach WordPress.

   ⚠ DER NAME WIRD NICHT GESPEICHERT, und dieses Modul ändert daran
   nichts. Er kommt live aus der SFV-Antwort, liegt im Zustand der
   Zuordnungsmaske, und diese Funktionen bauen daraus einen Text —
   im Browser, in der Sitzung. **Nichts davon geht an den Server
   zurück:** kein `api_sync_log`, keine Datei, kein zweiter Aufruf
   beim Verband. (Bedingung Didi, 25.08.2026.)

   ⚠ EIGENE AGGREGATION, NICHT `offeneZuordnungen()` — die braucht nur
   EINEN Ort je Person, diese Liste alle Mannschaften (`teams`) UND das
   Stammteam. 27 der 287 Spieler laufen in ZWEI Mannschaften auf,
   durchweg benachbarte Stufen (1./2. Mannschaft, Ca/Cb, Ba/Bb).

   ⚠ ⚠  HIER STAND ALS GRUND: „die behält pro Person nur die ERSTE
   `sfv_team_id`". Das galt bis zum 24.09.2026 und gilt nicht mehr —
   `offeneZuordnungen()` ruft seither `bestimmeStammteam()`, also
   dieselbe Regel wie hier. Die Aggregation bleibt trotzdem eigen: sie
   braucht `rueckennummern` und `teams` je Person, die dort niemand
   führt. **Der Satz war richtig und ist es nicht mehr; ein Grund, der
   veraltet, trägt seine Entscheidung nicht weiter.**

   Eine Zeile je Mannschaft wäre die andere Möglichkeit gewesen — 314
   Zeilen für 287 Spieler. Verworfen: dann steht jemand zweimal in der
   Liste, und beim Abhaken übersieht man den zweiten. (Didi.)

   ⚠ ⚠  UND DIESE ENTSCHEIDUNG GILT SEIT DEM 24.09.2026 AUCH FÜR DIE
   EXCEL-LISTE. Sie führte bis dahin eine Zeile je Person UND
   Mannschaft — die einzige Ausgabe, in der jemand mehrfach stand. Das
   war eine falsche Vorgabe und ist zurückgenommen: eine Zeile je
   Person, unter ihrem STAMMTEAM, und daneben eine Spalte, die sagt,
   nach welcher Regel es bestimmt wurde.

   ⚠ Die Regel selbst steht NICHT hier, sondern in `stammteam.ts` —
   eine zweite Fassung daneben liefe still auseinander.
   ═══════════════════════════════════════════════════════════════ */
import { OHNE_MANNSCHAFT } from "./matchdatenAnzeige.ts";
import type { AufstellungZeile } from "./matchdatenAnzeige.ts";
import { bestimmeStammteam, STAMMTEAM_LAUT } from "./stammteam.ts";
import type { StammteamRegel, StammteamZeile } from "./stammteam.ts";

/**
 * Eine Aufstellungszeile MIT der Spielzeit.
 *
 * ⚠ ⚠  EIN EIGENER PARAMETERTYP, UND `spielzeit` IST PFLICHT — nicht ein
 * Feld an `AufstellungZeile` und nicht `spielzeit?:` mit Rückfall.
 *
 * Warum nicht an `AufstellungZeile`: die trägt, was `offeneZuordnungen()`
 * und `baueStatistik()` brauchen, und die brauchen die Spielzeit nicht
 * (`baueStatistik` liest sie über einen lokalen Cast — das Feld ist
 * absichtlich nicht am Basistyp). Ein Pflichtfeld dort träfe sechs
 * Testdateien und zwei weitere Module, die den Wert nie ansehen. ⚠ Und es
 * wäre trotzdem UNVOLLSTÄNDIG: fünf der Aufrufstellen gehen über
 * `as never`, und dort nennt der Compiler nichts. Der weite Kreis kostet
 * also mehr und deckt weniger.
 *
 * Warum nicht optional: dann zählte eine Aufrufstelle, die den Wert nicht
 * durchreicht, JEDE Zeile als Einsatz von null Minuten — und das Stammteam
 * fiele auf die erste Mannschaft, ohne dass etwas meldet. So nennt der
 * Compiler jede Aufrufstelle einmal.
 *
 * Die Maske lädt ohnehin `AufstellungMitZeit` (`select("*")`); der Wert ist
 * da und wurde nur nicht weitergegeben.
 */
export type AufstellungFuerListe = AufstellungZeile & { spielzeit: number | null };

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
  /**
   * Das Stammteam als AUSWAHLSCHLUESSEL — `String(sfv_team_id)`, oder `"-"`,
   * wenn keine Team-Id bekannt ist.
   *
   * ⚠ Genau EINER, nicht eine Liste: unter dieser Mannschaft steht die
   * Person in der Excel-Liste, und zwar einmal. `teamSchluessel` daneben
   * führt weiterhin ALLE — die Textliste und die Importdatei brauchen das.
   */
  stammteamSchluessel: string;
  /** Dasselbe Stammteam als ANZEIGENAME. Unbekannte Id: `Team 58655`. */
  stammteam: string;
  /**
   * Nach welcher Regel das Stammteam bestimmt wurde.
   *
   * ⚠ DIE KENNUNG, NICHT DER ANZEIGETEXT. Der steht in `STAMMTEAM_LAUT`
   * und wird erst beim Schreiben der Datei nachgeschlagen — ein Text an
   * der Zeile wäre eine zweite Stelle, an der die Formulierung lebt.
   */
  stammteamRegel: StammteamRegel;
  /** ALLE Rückennummern — 58 der 287 laufen unter mehr als einer.
      ⚠ Die Textliste zeigt diese; die Excel-Liste seit dem 24.09.2026
      `stammteamNummern`. Beide bleiben, weil sie zwei Fragen beantworten. */
  rueckennummern: number[];
  /**
   * Nur die Rückennummern aus den Spielen des STAMMTEAMS.
   *
   * ⚠ ⚠  EIN EIGENES FELD UND KEIN FILTER IN `alsMannschaftsliste()` — die
   * Ausgabe bekommt nur `SpielerZeile[]` und hat die Aufstellungszeilen
   * nicht mehr. Der Schnitt kann also nur hier entstehen, wo Nummer und
   * Team noch nebeneinander stehen.
   *
   * ⚠ DER PREIS, und er gehört genannt statt verschwiegen (Entscheidung
   * Didi, 24.09.2026, sie ersetzt die vorherige): eine Nummer, unter der
   * die Person in einer ANDEREN Mannschaft aufgelaufen ist, erscheint in
   * der Excel-Liste NIRGENDS mehr. Bei jemandem, der in zwei Teams zwei
   * Nummern trägt, fehlt die zweite in genau der Liste, die zum
   * Wiedererkennen gedacht ist. Das ist gewollt: die Zeile IST die
   * Mannschaft daneben, und eine Nummer, die zu einer anderen gehört,
   * wäre in dieser Zeile eine falsche Auskunft.
   *
   * ⚠ Gegengerichtet bleibt `rueckennummern` vollständig — die Textliste
   * ist NICHT mannschaftsweise geschnitten, sie gruppiert nach allen
   * Mannschaften der Person. Dort erscheint die zweite Nummer weiterhin.
   *
   * ⚠ Bei `regel: "ohne_team"` sind es die Nummern der Zeilen OHNE
   * Team-Angabe — also dieselbe Menge wie `rueckennummern`, wenn die
   * Person nur solche Zeilen hat. Das ist kein Sonderfall, sondern
   * dieselbe Regel: die Nummern der Zeilen, aus denen das Stammteam
   * hervorgegangen ist.
   */
  stammteamNummern: number[];
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
  aufstellung: AufstellungFuerListe[],
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
  /* ⚠ Das Stammteam steht hier NOCH NICHT drin: es lässt sich erst
     bestimmen, wenn alle Zeilen der Person gesammelt sind. Deshalb ein
     eigener Zwischentyp und nicht `SpielerZeile` mit Platzhaltern — ein
     Platzhalter, den jemand zu überschreiben vergisst, wäre eine
     Mannschaft, die nach einer Messung aussieht. */
  type Zwischen =
    Omit<SpielerZeile,
      "stammteamSchluessel" | "stammteam" | "stammteamRegel" | "stammteamNummern">
    & {
      teamIds: Set<number>;
      stammZeilen: StammteamZeile[];
      /* ⚠ Der Schlüssel ist `number | null` und nicht der Auswahl-Schlüssel
         `String(id ?? "-")`: nachgeschlagen wird mit dem Wert, den
         `bestimmeStammteam()` zurückgibt, und das ist die rohe Id. Über die
         Zeichenform zu gehen hiesse, die Regel und die Ausgabe über eine
         Normalisierung zu verbinden, die zwischen ihnen liegt — und dann
         entscheidet eine Formatierung, welche Nummern erscheinen.
         `null` ist als Map-Schlüssel gültig und meint hier „die Zeilen ohne
         Team-Angabe", also genau die Menge, aus der `ohne_team` entsteht. */
      nummernJeTeam: Map<number | null, number[]>;
    };
  const proPerson = new Map<number, Zwischen>();

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
        teams: [], teamSchluessel: [], teamIds: new Set(), stammZeilen: [],
        nummernJeTeam: new Map(),
        rueckennummern: [], einsaetze: 0,
      };
      proPerson.set(a.sfv_person_id, z);
    }
    z.einsaetze += 1;
    /* ⚠ JEDE Zeile, auch die ohne Team-Id und die ohne Spielzeit. Die
       Regel in `bestimmeStammteam()` entscheidet, was daraus folgt —
       hier zu filtern hiesse, sie an zwei Orten zu führen. */
    z.stammZeilen.push({ sfv_team_id: a.sfv_team_id, spielzeit: a.spielzeit });
    if (a.sfv_team_id !== null) z.teamIds.add(a.sfv_team_id);
    if (a.rueckennr !== null) {
      if (!z.rueckennummern.includes(a.rueckennr)) z.rueckennummern.push(a.rueckennr);
      /* ⚠ Dieselbe Nummer in zwei Mannschaften ist ZWEI Einträge, einer je
         Mannschaft — entdoppelt wird nur innerhalb einer. Wer hier über
         beide entdoppelte, verlöre die Nummer in der zweiten Liste. */
      const je = z.nummernJeTeam.get(a.sfv_team_id);
      if (!je) z.nummernJeTeam.set(a.sfv_team_id, [a.rueckennr]);
      else if (!je.includes(a.rueckennr)) je.push(a.rueckennr);
    }
  }

  /* ⚠ Der Anzeigename einer Team-Id — an EINER Stelle, weil `teams` und
     `stammteam` denselben Platzhalter tragen müssen. Stünde die Regel
     zweimal, zeigte die Spalte `Team` eines Tages `Ohne Mannschaft`, wo die
     Textliste `Team 58655` sagt, und niemand sähe, welche recht hat. */
  const teamName = (id: number | null): string =>
    id === null ? OHNE_MANNSCHAFT : (teamNamen.get(id) || `Team ${id}`);

  const zeilen: SpielerZeile[] = [...proPerson.values()].map(z => {
    const st = bestimmeStammteam(z.stammZeilen);
    return {
    sfv_person_id: z.sfv_person_id,
    name: z.name,
    vorname: z.vorname,
    nachname: z.nachname,
    /* ⚠ `String(id ?? "-")` — genau die Form, die `gruppiereNachTeam()`
       bildet. Die Auswahl der Excel-Liste trifft über DIESEN Wert. */
    stammteamSchluessel: String(st.sfv_team_id ?? "-"),
    stammteam: teamName(st.sfv_team_id),
    stammteamRegel: st.regel,
    /* ⚠ Sortiert, damit „2. Mannschaft, 3. Mannschaft" nicht mal so und mal
       andersherum dasteht — sonst sieht dieselbe Person bei zwei Läufen
       verschieden aus. */
    /* ⚠ `Team ${id}` bleibt der Platzhalter — er sagt, DASS die
       Team-Zuordnung fehlt, und WELCHE Nummer sie braucht. Ein Test haelt
       das seit langem fest, und er hat am 24.09.2026 eine Reparatur
       aufgehalten, die ihn geopfert haette. */
    teams: [...z.teamIds].map(id => teamName(id)).sort(),
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
       Team-Id bekommt hier eine LEERE Liste; in der Maske steht sie
       unter `"-"`.

       ⚠ ⚠  HIER STAND „heute folgenlos, weil `bildeAufstellung` ohne
       Team-Id keine Zeile schreibt". DAS IST FALSCH, gemessen am
       24.09.2026 am Code — und ich habe den Satz gelesen und in einen
       Auftrag uebernommen, statt ihn zu pruefen:

         • `bildeAufstellung` hat genau ZWEI Ausschluesse (`eigen &&
           personId === null`, `!eigen && nummer === null`). Keiner davon
           sieht `teamId` an.
         • `zahl(p.teamId)` gibt `null`, wenn der Wert fehlt oder leer ist.
         • `spiel_aufstellung` hat KEINEN CHECK auf `sfv_team_id`.
         • Das Schema `Player` der Swagger-Datei hat GAR KEINE
           `required`-Liste — `teamId` ist als `integer` deklariert, seine
           ANWESENHEIT nirgends zugesagt. Ein fehlender Schluessel im JSON
           ergibt `undefined` und damit `null`.

       Eine eigene Zeile ohne Team-Id wird also geschrieben. Ob eine im
       Bestand steht, ist ungemessen — die Abfrage dazu liegt in
       `supabase/abfragen_2026-09-24_stammteam.sql` (Nr. 6).

       ⚠ Ein Kommentar, der eine ANDERE Stelle zusichert, ist eine
       Behauptung ohne Pruefung, und wer ihn liest, prueft erst recht
       nicht nach. Dieser hier hat genau das bewirkt. */
    teamSchluessel: [...z.teamIds].map(String).sort(),
    rueckennummern: [...z.rueckennummern].sort((a, b) => a - b),
    /* ⚠ Nachgeschlagen mit `st.sfv_team_id`, also mit dem Wert, den die
       Regel gerade zurückgegeben hat — nicht mit `z.teamIds` und nicht mit
       dem Auswahl-Schlüssel. Damit sind „welche Mannschaft steht in der
       Zeile" und „welche Nummern stehen daneben" derselbe Wert, und keine
       zweite Ableitung kann dazwischengeraten.
       ⚠ Der Rückfall auf `[]` ist kein stiller Ersatz: hat das Stammteam
       keine Nummer, ist die Zelle LEER, und genau das ist die Auskunft —
       siehe `stammteamNummern` am Typ. */
    stammteamNummern:
      [...(z.nummernJeTeam.get(st.sfv_team_id) ?? [])].sort((a, b) => a - b),
    einsaetze: z.einsaetze,
    };
  });

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

   Zum Ausdrucken und Abhaken, mannschaftsweise — und wie jede andere
   Ausgabe **eine Zeile je Person**, unter ihrem STAMMTEAM.

   ⚠ ⚠  BIS ZUM 24.09.2026 STAND HIER DAS GEGENTEIL: eine Zeile je
   Person UND Mannschaft, mit der Begründung, der Zuschnitt sei die
   Mannschaft. Die Vorgabe ist zurückgenommen — und der Grund dagegen
   ist derselbe, der im Kopf dieser Datei schon für die Textliste steht:
   wer eine Liste abhakt und jemanden zweimal darin hat, übersieht den
   zweiten Eintrag.

   ⚠ Der Preis ist benannt und bleibt: eine Person, die für zwei
   Mannschaften gespielt hat, erscheint in der Liste der anderen
   Mannschaft NICHT. Deshalb sagt die Spalte `Stammteam laut`, wie
   eindeutig die eine gewählt wurde — sonst wäre die Zuordnung eine
   Behauptung ohne Herkunft.

   ⚠ ⚠  UND DIE SPALTE SAGT SEIT DEM 24.09.2026 DIE EINDEUTIGKEIT, NICHT
   DEN KADER. Einen Kader je Mannschaft gibt es beim Verband nicht
   (gemessen, siehe `stammteam.ts`), also gilt immer „meiste Einsätze" —
   und was zu wissen bleibt, ist, WIE eindeutig das war: nur dieses Team ·
   meiste Einsätze · Gleichstand · keine Team-Angabe. Der Gleichstand ist
   dabei neu und steckte vorher unsichtbar in „mehrere Kader".

   ⚠ Ebenfalls seit dem 24.09.2026: die Nummern-Zelle trägt nur die
   Nummern des STAMMTEAMS. Der Preis dafür steht an `stammteamNummern`
   und an der Zuweisung — er ist real, und er ist gewollt.

   ⚠ EIGENER CSV-SCHREIBER, OBWOHL `shared/list/exportUtils.ts` EINEN
   HAT — und das ist keine vergessene Dublette. `csvDownload()` dort
   quotet JEDES Feld unbedingt; die Textform der Personennummer
   (siehe `alsTextzelle`) verträgt das nicht: in Anführungszeichen
   gesetzt ist sie keine Zelle mehr, die Excel als Text übernimmt,
   sondern sichtbarer Text `="123"`. Deshalb hier bedingtes Quoten.
   Wer die zwei je zusammenlegt, legt zuerst diese Bedingung zusammen. */

/** Die Spaltenköpfe, in der bestellten Reihenfolge.
    ⚠ `Team` ist das STAMMTEAM; `Stammteam laut` sagt, nach welcher Regel. */
export const MANNSCHAFTSLISTE_SPALTEN = [
  "Name", "Vorname", "Team", "Stammteam laut", "Rückennummer", "SFV-personId",
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
  /** Der Name des STAMMTEAMS. */
  team: string;
  /** Nach welcher Regel es bestimmt wurde — der Text aus `STAMMTEAM_LAUT`. */
  stammteamLaut: string;
  /**
   * Die Nummern DES STAMMTEAMS in EINER Zelle, mit `, `.
   *
   * ⚠ Die Form ist die der Maske (Komma, Leerzeichen), die MENGE ist es
   * nicht: die Maske zeigt alle Nummern der Person, diese Zelle nur die der
   * Mannschaft daneben (24.09.2026). Eine Spalte je Nummer wäre die
   * Alternative und hätte eine Spaltenzahl, die von den Daten abhängt.
   *
   * ⚠ LEER ist eine Auskunft: die Person trug in diesem Team keine Nummer.
   */
  nummern: string;
  sfvPersonId: number;
}

/**
 * Die Liste nach Mannschaft, als CSV für Excel.
 *
 * `teamsGewaehlt` nennt die Mannschaften über ihren SCHLUESSEL —
 * `String(sfv_team_id)`, bzw. `"-"` für eine Person ohne Team-Zuordnung.
 * Dieselbe Form, die `gruppiereNachTeam()` für die Kästchen der Maske
 * bildet; ⚠ ausdrücklich NICHT der Anzeigename.
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
 * ⚠ Und NICHT am Leerzeichen trennen: „Lorena Sara Hug“ und „Tamara Hidber
 * Mullis“ sind mit derselben Regel nicht lösbar — beim einen ist der Vorname
 * zweiteilig, beim anderen der Nachname. Wer hier trennt, hat in der Hälfte
 * der Fälle recht und weiss nicht, in welcher.
 *
 * ⚠ ⚠  EINE ZEILE JE PERSON, UNTER IHREM STAMMTEAM (24.09.2026). Gewählt
 * wird gegen den Schlüssel des STAMMTEAMS — nicht gegen alle Mannschaften
 * der Person. Steht ihr Stammteam nicht in der Auswahl, fällt sie weg, auch
 * wenn sie für eine gewählte Mannschaft gespielt hat. Das ist der Preis
 * dafür, dass niemand zweimal in der Liste steht, und er ist gewollt.
 */
export function alsMannschaftsliste(
  zeilen: SpielerZeile[],
  teamsGewaehlt: ReadonlySet<string>,
): string {
  const daten: MannschaftsZeile[] = [];

  for (const z of zeilen) {
    /* ⚠ ⚠  GEWAEHLT WIRD UEBER DEN SCHLUESSEL, ANGEZEIGT WIRD DER NAME.
       Wer hier gegen `stammteam` filtert, vergleicht einen Anzeigenamen mit
       einem Gruppenschluessel — beides `string`, der Typ passt, die Bedeutung
       nicht. Gemessen am 24.09.2026: Kaestchen setzbar, Download laeuft,
       Datei mit nur der Kopfzeile.

       ⚠ ⚠  DIESER FILTER UND DIE KAESTCHEN DER MASKE FOLGEN SEIT DEM
       24.09.2026 DERSELBEN REGEL — und das ist der Grund, warum hier
       ueberhaupt ein Kommentar steht.

       Bis dahin behielt `offeneZuordnungen()` je Person nur die ERSTE
       geschriebene `sfv_team_id`, der Export nahm das Stammteam, und die
       zwei gingen auseinander. Gemessen im Einbau war es schaerfer als
       erwartet: eine Gruppe entstand nur, wenn irgendeine Person dort ihre
       erste Zeile hatte — war das Stammteam eine Mannschaft, in der sonst
       niemand zuerst auflief, gab es dafuer KEIN Kaestchen, und die Person
       war ueber keines erreichbar. Die Meldung sagte dann wahrheitsgemaess
       „0 Spieler".

       ✅ Behoben: `offeneZuordnungen()` ruft jetzt `bestimmeStammteam()`,
       dieselbe Funktion wie dieser Filter. Eine Person ist damit ueber
       genau ein Kaestchen erreichbar — das ihres Stammteams —, und
       Personen ohne Team-Angabe stehen unter `"-"`. Ein Fall in
       `spielerVorschlagEinbau.test.jsx` haelt es fest.

       ⚠ Der Vermerk bleibt stehen, weil er die Naht benennt: wer eine der
       beiden Seiten aendert, aendert beide oder keine. Zwei Fassungen
       derselben Regel laufen still auseinander, und genau das war der
       Zustand fuer einen halben Tag. */
    if (!teamsGewaehlt.has(z.stammteamSchluessel)) continue;
    daten.push({
      /* ⚠ Leer, wenn der Verband keinen Namen liefert — und hier NICHT
         `OHNE_NAMEN` wie in der Textliste. Dort ist es eine Anzeigezeile,
         hier ein Datenfeld: ein Warntext in der Namensspalte würde
         sortiert und gefiltert, als wäre er ein Name. */
      name: z.nachname,
      vorname: z.vorname,
      team: z.stammteam,
      /* ⚠ Nachgeschlagen, nicht an der Zeile geführt: die Formulierung
         lebt an EINER Stelle, in `stammteam.ts`. */
      stammteamLaut: STAMMTEAM_LAUT[z.stammteamRegel],
      /* ⚠ ⚠  NUR DIE NUMMERN DES STAMMTEAMS (Entscheidung Didi, 24.09.2026)
         — und das ist die UMGEKEHRTE Zusage gegenüber dem Stand vom Morgen
         desselben Tages. Dort stand `z.rueckennummern`, also alle, mit der
         Begründung, die Zelle sei personenbezogen wie Name und personId.

         Der Grund für die Umkehr: die Zeile nennt EINE Mannschaft, und eine
         Nummer aus einer anderen ist in dieser Zeile eine falsche Auskunft.
         Ein Leser, der abhakt, vergleicht die Zelle mit dem Trikot vor sich.

         ⚠ DER PREIS, festgehalten statt verschwiegen: eine Nummer, unter
         der die Person in einer anderen Mannschaft aufgelaufen ist,
         erscheint in DIESER Liste nirgends mehr — auch nicht in der Liste
         jener Mannschaft, denn dort steht die Person gar nicht (sie steht
         nur unter ihrem Stammteam). In der TEXTLISTE erscheint sie
         weiterhin; die ist nicht mannschaftsweise geschnitten.

         ⚠ UND DER SPALTENKOPF TRÄGT DIE EINSCHRÄNKUNG NICHT. Er heisst
         `Rückennummer`, und bis heute Morgen war das die richtige
         Beschriftung — der Kommentar hier begründete sie ausdrücklich mit
         „und nicht «Nummer in diesem Team»". Genau diese Begründung ist
         jetzt weg: die Zelle IST teambezogen, der Kopf sagt es nicht. Der
         Kopf bleibt auf Anweisung unverändert (die sechs Spalten sind
         bestellt); das ist ein offener Punkt und keine Absicht. */
      nummern: z.stammteamNummern.join(", "),
      sfvPersonId: z.sfv_person_id,
    });
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
    csvFeld(d.stammteamLaut),
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
