/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpNutzlast.ts

   Die Nutzlast für den WordPress-Export. Reine Logik, kennt weder
   Datenbank noch HTTP.

   ⚠ WARUM SIE HIER LIEGT UND NICHT IN DER EDGE FUNCTION — das ist die
   Entscheidung, die man später nicht mehr sieht.

   `docs/plan_wordpress_spieldaten.md` §12 sagt über die WordPress-Seite:
   „dort gibt es keinen Typecheck, keine Testkette und keinen Compiler."
   Für eine Edge Function gilt fast dasselbe: `tsc` liest sie nicht (der
   `esm.sh`-Import allein erzeugt 21 Fehler), und vitest kann sie nicht
   importieren.

   **Also gehört alles, was eine Entscheidung trifft, hierher** — in eine
   Datei ohne Laufzeit-Import, die `tsc` typprüft und vitest ausführt. Die
   Edge Function bleibt Zu- und Ableitung: sie liest aus Supabase, ruft
   diese Funktionen, schickt das Ergebnis. Was sie selbst entscheidet,
   prüft niemand.

   Dieselbe Bauform wie `ergebnisTypen.ts` beim SFV-Sync, und aus
   demselben Grund.

   ── DIE DREI ÜBERSETZUNGEN, DIE HIER PASSIEREN ─────────────────────
   ClubCampus und das WordPress-Theme modellieren dasselbe Spiel
   verschieden. Wo sie auseinandergehen, steht hier eine Entscheidung —
   nicht in der Vorlage und nicht im PHP:

     resultat "3:2"      →  tore_heim 3 · tore_gast 2
     sfv_status 1…12     →  vier Zustände + „publizieren"
     spiel_ereignisse    →  verlauf-Zeilen (Text statt Person)
   ═══════════════════════════════════════════════════════════════ */
import type { AnzeigeEreignis } from "./matchdatenAnzeige.ts";
import {
  beschreibeWer, beschreibeGewechselten, TYP_TOR, TYP_VERWARNUNG, TYP_AUSSCHLUSS,
} from "./matchdatenAnzeige.ts";

/** SFV-Ereignistyp „Aus-/Einwechslung". Steht nicht in matchdatenAnzeige,
    weil die Statistik ihn nicht zählt — der Verlauf zeigt ihn aber. */
export const TYP_WECHSEL = 2;

/** SFV-Ereignistyp „Assist". Siehe die Warnung bei `verlaufArt()`. */
export const TYP_ASSIST = 9;

/**
 * Typen, die es gibt und die kein Symbol tragen.
 *
 * ⚠ Sie stehen hier, damit `unbekannte_typen` nur meldet, was WIRKLICH
 * neu ist. Ohne diese Liste meldete jeder Assist einen „unbekannten Typ",
 * und ein Melder, der immer dasselbe sagt, wird nicht gelesen.
 */
export const BEKANNT_OHNE_SYMBOL: number[] = [TYP_ASSIST];
/** SFV-Ereignissubtyp „2. Verwarnung" — unterscheidet Rot von Gelb-Rot. */
export const SUBTYP_ZWEITE_VERWARNUNG = 20;

/** Die vier Zustände, die das Theme kennt (`Fields/spiel.php`, `status`). */
export type WpStatus = "normal" | "verschoben" | "abgesagt" | "forfait";

/** Die fünf Arten, die der Verlauf im Theme kennt. */
export type WpVerlaufArt = "tor" | "gelb" | "gelbrot" | "rot" | "wechsel";

export interface WpVerlaufZeile {
  /** Text, nicht Zahl — damit „45+2" hineinpasst. */
  minute: string;
  art: WpVerlaufArt;
  seite: "heim" | "gast";
  text: string;
  /** ⚠ Bleibt leer, siehe `bildeVerlauf()`. */
  stand: string;
  klub: string;
}

export interface WpSpiel {
  sfv_match_id: string;
  sfv_spiel_nr: string;
  datum: string;
  zeit: string;
  /** ⚠ Die SFV-Teamnummer, NICHT die WordPress-Beitrags-Id.

      Bis zum 05.09.2026 stand hier `fch_team: number` — die Beitrags-Id.
      Das war falsch herum, und eine Messung hat es gezeigt: `sfv_id` ist
      am `fch_team`-Beitrag **nicht** über die REST-API lesbar (`meta:
      null`, `acf: []`), und öffentlich lesbar soll sie auch nicht werden.
      Der Export könnte die Zuordnung also gar nicht holen.

      Er braucht sie auch nicht. Die Zuordnung „SFV-Nummer ↔ Beitrag" ist
      eine Tatsache von WordPress, und das Plugin kennt sie ohnehin
      (`cc_team_karte()`). **Wer die Tatsache besitzt, löst sie auf** —
      das spart einen Abruf und eine Preisgabe zugleich. */
  sfv_team_id: string;
  gegner: string;
  heim_auswaerts: "heim" | "auswaerts";
  ort: string;
  /** Spieltyp: „Meisterschaft", „Cup", „Turnier". NICHT die Liga. */
  wettbewerb: string;
  /**
   * Die Liga oder Stärkeklasse — „Junioren C Promotion".
   *
   * ⚠ NEU AM 10.09.2026, und sie fehlte, ohne dass es auffiel: `spiele.liga`
   * steht seit dem 14.08.2026 in der Datenbank (aus `leagueName`), wurde
   * aber weder gelesen noch gesendet. Auf der Website stand über jedem
   * Spiel nur „MEISTERSCHAFT" — der Spieltyp, wo die Liga hingehört.
   */
  liga: string;
  runde: string;
  status: WpStatus;
  /** false = der Beitrag geht auf Entwurf. Siehe `bildeStatus()`. */
  publizieren: boolean;
  tore_heim: number | null;
  tore_gast: number | null;
  halbzeit_heim: number | null;
  halbzeit_gast: number | null;
  verlauf: WpVerlaufZeile[];
}

/* ── Datum ────────────────────────────────────────────────────────── */

/**
 * `2026-08-23` → `20260823`.
 *
 * ⚠ Das Theme führt `datum` als `date_picker` mit `return_format: 'Ymd'`.
 * Ein ISO-Datum sähe im Backend richtig aus und wäre für ACF unlesbar —
 * der Picker zeigte dann ein leeres Feld über einem gefüllten Wert.
 */
export function wpDatum(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10).replace(/-/g, "");
}

/** `14:00:00` → `14:00`. Das Theme führt `time_picker` mit `H:i`. */
export function wpZeit(zeit: string | null): string {
  if (!zeit) return "";
  return zeit.slice(0, 5);
}

/* ── Resultat ─────────────────────────────────────────────────────── */

export interface ToreZeile {
  tore_heim: number | null;
  tore_gast: number | null;
}

/**
 * `"3:2"` → `{tore_heim: 3, tore_gast: 2}`.
 *
 * ⚠ NICHT nach `heimspiel` tauschen — die naheliegende Zeile wäre falsch.
 * `spiele.resultat` entsteht als `${scoreTeamA}:${scoreTeamB}` (sync.ts:90),
 * und Team A ist das Heimteam (gemessen 24.08.2026: 265 von 269, die vier
 * Abweichungen sind Heimspiele auf ausgelagertem Platz). Die linke Zahl ist
 * also IMMER die des Heimteams, unabhängig davon, ob wir es sind.
 *
 * `heimspiel` sagt, auf welcher Seite WIR stehen — nicht, wie das Resultat
 * gelesen wird. Wer beides verwechselt, dreht jedes Auswärtsresultat um,
 * und niemand meldet es: 2:1 und 1:2 sehen beide plausibel aus.
 */
export function zerlegeResultat(resultat: string | null): ToreZeile {
  if (!resultat) return { tore_heim: null, tore_gast: null };
  const teile = resultat.split(":");
  if (teile.length !== 2) return { tore_heim: null, tore_gast: null };
  const h = Number.parseInt(teile[0].trim(), 10);
  const g = Number.parseInt(teile[1].trim(), 10);
  if (Number.isNaN(h) || Number.isNaN(g)) return { tore_heim: null, tore_gast: null };
  return { tore_heim: h, tore_gast: g };
}

/* ── Zustand ──────────────────────────────────────────────────────── */

export interface StatusEntscheid {
  status: WpStatus;
  publizieren: boolean;
}

/**
 * SFV-Zustand (1…12) auf die vier Werte des Themes abbilden.
 *
 * ⚠ EINE ABBILDUNG 12 → 4 VERLIERT, und der Verlust gehört benannt statt
 * versteckt. „abgebrochen" (5) und „nicht gespielt (SR)" (8) landen beide
 * auf `abgesagt`, obwohl das eine begonnen hat und das andere nicht. Das
 * Theme hat keinen feineren Wert, und einen zu erfinden hiesse, sein
 * Datenmodell zu ändern.
 *
 * ⚠ STATUS 12 IST KEIN ZUSTAND, SONDERN EIN VERBOT. „Spiel ohne Austragung
 * (keine Publikation)" ist eine Anweisung des Verbands. Sie wird nicht als
 * Feldwert abgebildet, sondern über `publizieren: false` — der Beitrag geht
 * auf Entwurf. Ein Feldwert wäre eine Anzeige; hier soll gar nichts
 * angezeigt werden.
 *
 * ⚠ UND EIN UNBEKANNTER ZUSTAND WIRD NICHT VERÖFFENTLICHT. Allowlist, nicht
 * Denylist: was der Verband morgen als 13 einführt, ist im Zweifel nicht auf
 * der Website. Der umgekehrte Vorgabewert („kennen wir nicht, also normal")
 * veröffentlicht Unbekanntes — auf einer öffentlichen Seite die falsche
 * Richtung.
 */
export function bildeStatus(sfvStatus: number | null): StatusEntscheid {
  switch (sfvStatus) {
    case 1:  // noch nicht ausgetragen
    case 2:  // ausgetragen
    case 7:  // neu angesetzt — hat ein neues Datum, also wieder normal
      return { status: "normal", publizieren: true };

    case 6:  // verschoben
      return { status: "verschoben", publizieren: true };

    case 3:  // forfait
    case 4:  // Null zu Null - Null Punkte
    case 9:  // nicht gespielt (Gegner)
      return { status: "forfait", publizieren: true };

    case 5:  // abgebrochen        ⚠ gröber abgebildet als es ist
    case 8:  // nicht gespielt (SR)
    case 10: // findet nicht statt (keine Neuansetzung)
    case 11: // Abbruch der Saison
      return { status: "abgesagt", publizieren: true };

    case 12: // ⚠ Spiel ohne Austragung (KEINE PUBLIKATION)
      return { status: "abgesagt", publizieren: false };

    default:
      return { status: "abgesagt", publizieren: false };
  }
}

/* ── Verlauf ──────────────────────────────────────────────────────── */

/**
 * Ereignistyp → die fünf Arten des Themes.
 *
 * ⚠ ASSIST HAT KEIN GEGENSTÜCK und wird deshalb übersprungen. Der Verlauf
 * des Themes kennt `tor · gelb · gelbrot · rot · wechsel`, keinen Assist —
 * die Vorlage dafür ist `ereignisse`, wo `vorlage_von` in derselben Zeile
 * wie das Tor steht ("Einen Assist ohne Tor gibt es nicht").
 *
 * Ihn als eigene Zeile mit `art: 'tor'` mitzuschicken wäre schlimmer als
 * ihn wegzulassen: die Torschützenliste zählte ihn mit. Und eine sechste
 * Art zu ergänzen hiesse, das Feld des Themes zu ändern.
 *
 * `null` heisst: diese Zeile gehört nicht in den Verlauf.
 */
export function verlaufArt(typId: number, subtypId: number | null): WpVerlaufArt | null {
  if (typId === TYP_TOR) return "tor";
  if (typId === TYP_VERWARNUNG) return "gelb";
  if (typId === TYP_AUSSCHLUSS) {
    return subtypId === SUBTYP_ZWEITE_VERWARNUNG ? "gelbrot" : "rot";
  }
  if (typId === TYP_WECHSEL) return "wechsel";
  return null;
}

/** `34` → `"34"`, `45` mit Zusatz `2` → `"45+2"`. */
export function verlaufMinute(minute: number | null, zusatz: number | null): string {
  if (minute === null) return "";
  return zusatz ? `${minute}+${zusatz}` : String(minute);
}

/**
 * Die Verlaufszeilen für ein Spiel.
 *
 * ⚠ `stand` BLEIBT LEER. Die Feldbeschreibung im Theme sagt warum: „Ein
 * Spiel, das mit 2:0 endet, hat nicht zwingend die Tore in dieser
 * Reihenfolge im Feld — und eine gerechnete Zahl, die von der eingetragenen
 * abweicht, wäre schlimmer als keine." `spiel_ereignisse` führt keinen
 * Zwischenstand, also gibt es nichts zu übernehmen. Herleiten wäre genau
 * das, wovor der Satz warnt.
 *
 * ⚠ `seite` kommt aus `ist_eigener` UND `heimspiel`, nicht aus einem davon.
 * Ein eigenes Tor im Auswärtsspiel steht auf der Gastseite.
 *
 * @param namen   sfv_person_id → Klarname. Heute leer (`sfv_zuordnung` hat
 *                null Zeilen), dann steht überall „Nr. 9".
 * @param unserKlub  Vereinsname für die Klub-Spalte eigener Zeilen.
 */
export function bildeVerlauf(
  ereignisse: AnzeigeEreignis[],
  heimspiel: boolean,
  namen: Map<number, string>,
  unserKlub: string,
): WpVerlaufZeile[] {
  const zeilen: WpVerlaufZeile[] = [];

  for (const e of ereignisse) {
    const art = verlaufArt(e.typ_id, e.subtyp_id ?? null);
    if (!art) continue;

    const wir = e.ist_eigener;
    const seite: "heim" | "gast" = (wir === heimspiel) ? "heim" : "gast";

    /* Der Text ist die einzige Stelle, an der ein Mensch vorkommt — und er
       kommt als TEXT vor, nie als Verweis. So will es das Feld: „Nennt
       Personen nur als Text — für die Statistik zählt die Tabelle darüber." */
    const wer = beschreibeWer(e, namen);
    /* ⚠ `subtyp` kann „-" sein, und das ist kein leerer Wert, sondern der
       Klartext zu Subtyp 0 in den SFV-Stammdaten. Ohne diese Prüfung stünde
       auf der Website „FC Küsnacht a · -". Aufgefallen in der Probe vom
       05.09.2026, in Didis eigener Ausgabe.

       Nicht auf `"-"` allein prüfen: gemeint ist „trägt keine Aussage", und
       ein leergeschlagener Wert gehört zur selben Sache. */
    const subtyp = (e.subtyp ?? "").trim();
    const zusatz = subtyp && subtyp !== "-" ? ` · ${subtyp}` : "";
    /* ⚠ Der Ausgewechselte bekommt seinen Namen nach DERSELBEN Regel wie
       der Eingewechselte — siehe beschreibeGewechselten(). Bis zum
       10.09.2026 stand hier `ein_rueckennr` direkt, und daneben ein Name:
       „Abdulah Al Abbadie · für Nr. 9". Zwei eigene Spieler, einer
       genannt. */
    /* ⚠ ⚠  DIE RICHTUNG WAR VERTAUSCHT — berichtigt am 10.09.2026.
       `personId` ist der Spieler, der VOM Platz geht; `substitutePlayer`
       ist sein Ersatz. Bis heute stand hier „X · für Nr. 19", was das
       Gegenteil behauptet: X komme für die 19.

       ⚠ WARUM ES NIEMAND SAH: solange beide Menschen Nummern waren, ergab
       jede Lesart einen plausiblen Satz. Erst als der eine einen Namen
       bekam und der Verband danebenstand — „Aksel Nonnez ersetzt durch
       Ivan Predannikov" —, wurde der Widerspruch sichtbar.

       Der Wortlaut folgt dem Verband. Nicht aus Bequemlichkeit: wer
       beide Seiten nebeneinanderlegt, soll nicht erst uebersetzen
       muessen, um zu sehen, ob dasselbe dasteht. */
    const zweiter = art === "wechsel" ? beschreibeGewechselten(e, namen) : "";
    const text = zweiter
      ? `${wer} ersetzt durch ${zweiter}`
      : `${wer}${zusatz}`;

    zeilen.push({
      minute: verlaufMinute(e.minute, e.zusatzminute),
      art,
      seite,
      text,
      stand: "",
      klub: wir ? unserKlub : (e.gegner_club_name ?? ""),
    });
  }

  return zeilen;
}

/**
 * Trägt dieser Wert mehrfache oder randständige Leerzeichen?
 *
 * ⚠ ⚠  ER WIRD NICHT BEREINIGT — ENTSCHEIDUNG DIDI, 10.09.2026.
 *
 * Hier stand bis dahin `normalisiereRaum()`, und `runde` trug den
 * geputzten Wert. Zurückgenommen, mit derselben Begründung, die die
 * Website-Seite gegeben hatte und der Didi gefolgt ist:
 *
 *   > Fremde Daten stillschweigend zu putzen versteckt den Fehler,
 *   > statt ihn zu melden.
 *
 * Mein Gegenargument war, `runde` sei unsere Ausgabe und nicht des
 * Verbands Wert. Das trifft zu — und ändert nichts daran, dass danach
 * **niemand mehr sieht**, dass der Verband „Gruppe  2" liefert. Der
 * Doppelabstand steht auf der Website und ist damit die einzige Stelle,
 * an der er jemandem auffällt.
 *
 * ⚠ WAS BLEIBT, IST DIE ZAHL. Nicht bereinigen heisst nicht wegsehen:
 * `runde_mit_doppelabstand` sagt, wie viele Spiele betroffen sind.
 * Ändert der Verband seine Schreibweise, faellt es an dieser Zahl auf —
 * genau das, was ein stilles Trimmen unmöglich gemacht hätte.
 */
export function hatDoppelabstand(w: string | null | undefined): boolean {
  const roh = String(w ?? "");
  return roh !== "" && roh.replace(/\s+/g, " ").trim() !== roh;
}

/* ── Tore und Karten an der Aufstellungszeile ──────────────────────

   ⚠ SIE WERDEN GERECHNET, NICHT GESPEICHERT (Entscheid Didi,
   10.09.2026): *„die Zuordnung ist eine Rechnung, keine Darstellung."*

   ⚠ UND SIE STEHEN NICHT IN DER DATENBANK. Als Spalte an
   `spiel_aufstellung` wären sie eine zweite Wahrheit neben
   `spiel_ereignisse` — und müssten bei jeder Verlaufskorrektur neu
   berechnet werden. Wer das vergisst, hat eine Zeile mit einem Tor, das
   im Verlauf nicht mehr steht. Hier entstehen sie bei jedem Export neu,
   aus den ohnehin geladenen Ereignissen.

   ⚠ DIE ZUORDNUNG LÄUFT ÜBER ZWEI VERSCHIEDENE SCHLÜSSEL, und das ist
   kein Schönheitsfehler:

     eigene Spieler   über `sfv_person_id` — eindeutig
     Gegner           über `rueckennr` — die einzige Angabe, die es gibt

   Die zweite ist schwächer: zwei eigene Teams gegeneinander teilen sich
   eine `spiel_id`, und dann gibt es die 9 zweimal. Deshalb geht die
   Seite mit in den Schlüssel. */

/** Ein Symbol an einer Aufstellungszeile. */
export interface WpAufstellungMarke {
  art: WpVerlaufArt;
  minute: string;
}

export interface AufstellungZaehlung {
  tore: number;
  gelb: number;
  gelbrot: number;
  rot: number;
  /** Die Minuten, in der Reihenfolge des Spiels. */
  marken: WpAufstellungMarke[];
}

function leereZaehlung(): AufstellungZaehlung {
  return { tore: 0, gelb: 0, gelbrot: 0, rot: 0, marken: [] };
}

/**
 * Der Schlüssel, unter dem ein Ereignis einer Aufstellungszeile zufällt.
 *
 * ⚠ `null` heisst: dieses Ereignis lässt sich niemandem zuordnen. Das ist
 * kein Fehler — ein Gegnertor ohne Rückennummer ist genau das. Es zählt
 * dann als `ohne_zuordnung` und fällt nicht still weg.
 */
export function markeSchluessel(
  e: Pick<AnzeigeEreignis, "ist_eigener" | "sfv_person_id" | "rueckennr">,
): string | null {
  if (e.ist_eigener) {
    return e.sfv_person_id != null ? `p:${e.sfv_person_id}` : null;
  }
  return e.rueckennr != null ? `n:${e.rueckennr}` : null;
}

export interface MarkenErgebnis {
  /** Schlüssel → Zählung. Siehe markeSchluessel(). */
  je_spieler: Map<string, AufstellungZaehlung>;
  /**
   * ⚠ Ereignisse, die niemandem zufallen — meist Gegnerzeilen ohne
   * Nummer. Sie werden GEZÄHLT, nicht verschwiegen: eine Aufstellung
   * ohne Symbole und eine ohne zuordenbare Ereignisse sehen sonst gleich
   * aus.
   */
  ohne_zuordnung: number;
  /**
   * ⚠ Ereignistypen, die `verlaufArt()` nicht kennt.
   *
   * Gemessen ist bis heute nur Typ 1 (Tor) an einer echten Antwort;
   * Karten und Wechsel kennen wir aus dem Code, nicht aus einer Lieferung.
   * Taucht ein unbekannter Typ auf, soll er AUFFALLEN — nicht still
   * durchfallen, wie es eine blosse `continue`-Zeile täte.
   */
  unbekannte_typen: number[];
}

export function sammleMarken(ereignisse: AnzeigeEreignis[]): MarkenErgebnis {
  const je_spieler = new Map<string, AufstellungZaehlung>();
  const unbekannt = new Set<number>();
  let ohne = 0;

  for (const e of ereignisse) {
    const art = verlaufArt(e.typ_id, e.subtyp_id ?? null);
    if (!art) {
      /* ⚠ Nur ZAEHLBARE Typen gelten als unbekannt. Assists und
         Nebenereignisse fallen absichtlich weg — sie haben kein Symbol,
         und sie als „unbekannt" zu melden waere Rauschen. */
      if (e.typ_id != null && !BEKANNT_OHNE_SYMBOL.includes(e.typ_id)) {
        unbekannt.add(e.typ_id);
      }
      continue;
    }
    /* Ein Wechsel bekommt kein Symbol — die Pfeile stehen an
       von_minute/bis_minute der Aufstellungszeile. */
    if (art === "wechsel") continue;

    const k = markeSchluessel(e);
    if (k === null) { ohne++; continue; }

    let z = je_spieler.get(k);
    if (!z) { z = leereZaehlung(); je_spieler.set(k, z); }
    if (art === "tor") z.tore++;
    else if (art === "gelb") z.gelb++;
    else if (art === "gelbrot") z.gelbrot++;
    else if (art === "rot") z.rot++;
    z.marken.push({ art, minute: verlaufMinute(e.minute, e.zusatzminute) });
  }

  return { je_spieler, ohne_zuordnung: ohne, unbekannte_typen: [...unbekannt].sort((a, b) => a - b) };
}

/* ── Zählen, wer beim Namen genannt wird ──────────────────────────── */

export interface NamensZaehlung {
  /**
   * Zeilen mit einem zugeordneten Spieler — **unsere** Schreibweise.
   *
   * ⚠ HIESS BIS ZUM 10.09.2026 `mit_personenname` UND MEINTE DASSELBE.
   * Umbenannt, weil daneben eine zweite Sorte Name entstanden ist. Siehe
   * den Warnblock über `zaehleVerlaufNamen`.
   */
  mit_eigenem_namen: number;
  /** Zeilen mit dem Namen aus der SFV-Ablage — der Rückfall. */
  mit_sfv_namen: number;
  /** Eigene Spieler ohne jeden Namen — „Nr. 13". */
  mit_rueckennummer: number;
  /** Gegner — der Mannschaftsname, nie eine Person. */
  mit_gegnername: number;
  /**
   * ⚠ ⚠  STEHT AUSSERHALB DER AUFTEILUNG — nicht mitsummieren.
   *
   * Eine Wechselzeile nennt ZWEI Menschen. Die vier Zahlen darüber teilen
   * **Zeilen** auf, und ihre Summe muss die Zeilenzahl ergeben — das ist
   * die Gegenprobe, die den Zähler an `bildeVerlauf()` bindet. Der zweite
   * Mensch passt da nicht hinein, ohne sie zu zerstören.
   *
   * Weglassen war die Alternative und wäre falsch gewesen: er ist eine
   * eigene Preisgabe. Seit dem 10.09.2026 steht sein Name auf der Website,
   * und eine Zahl, die ihn nicht zählt, sagte zu wenig.
   */
  zeilen_mit_zweitem_namen: number;
  /**
   * ⚠ ⚠  DIE ZWEI ZAHLEN, DIE DEN OFFENEN REST BEZIFFERN — und die
   * ebenfalls AUSSERHALB der Aufteilung stehen.
   *
   * Sie beantworten „wie viele Wechsel zeigen noch eine Nummer statt
   * eines Namens, und WARUM". Der Unterschied ist die ganze Auskunft:
   *
   *   ohne_ersatzkennung  der Verband hat die Kennung nicht geliefert
   *                       ODER die Zeile wurde seit dem 19.08.2026 nicht
   *                       neu geholt  →  `aktion: "wechselnachtrag"`
   *   ohne_ersatzname     die Kennung ist da, aber zu ihr steht kein Name
   *                       in `sfv_personen`  →  `aktion: "namen"`
   *
   * Eine einzelne Zahl „13 offen" schickte niemanden irgendwohin.
   *
   * ⚠ SIE STEHEN IN DER VORSCHAU, NICHT IN EINER EIGENEN AKTION
   * (Entscheidung Didi, 10.09.2026): *„Eine Zahl, für die man einen
   * eigenen Aufruf braucht, liest niemand."*
   */
  zeilen_ohne_ersatzkennung: number;
  zeilen_ohne_ersatzname: number;
}

/**
 * Wie viele Verlaufszeilen nennen einen MENSCHEN beim Namen?
 *
 * ⚠ DIE EINE ZAHL, DIE VOR DEM ERSTEN SCHARFEN LAUF ENTSCHEIDET, ob
 * Klarnamen von Junioren auf eine öffentliche Website gehen. Deshalb steht
 * sie hier — geprüft — und nicht in der Edge Function.
 *
 * ⚠ SIE LIEST NICHT DEN TEXT, SIE LIEST DIE ENTSCHEIDUNG. Die erste
 * Fassung (05.09.2026) prüfte den fertigen Ausgabetext mit
 * `/^[^N]|^N(?!r\. )/` — „beginnt nicht mit «Nr. »" — und zählte damit
 * jede Gegnerzeile mit, denn ein Vereinsname beginnt auch nicht so. Sie
 * meldete **431 statt 0**.
 *
 * Zwei Fehler in einer Zeile, und beide sind Muster:
 *
 *   1. Sie war NEGATIV definiert — eine Denylist in Zahlenform. Was nicht
 *      wie ein Ausschluss aussah, galt als Treffer. Neue Textformen fallen
 *      damit automatisch auf die falsche Seite.
 *   2. Sie mass die AUSGABE statt der ENTSCHEIDUNG. Wer seinen eigenen
 *      Ausgabetext wieder zerlegt, misst seine Formatierung mit — und die
 *      ändert sich, ohne dass jemand an die Messung denkt.
 *
 * Hier wird gefragt, was tatsächlich gilt: ist die Zeile von uns, und
 * steht für ihre `sfv_person_id` ein Name in der Zuordnung?
 *
 * ⚠ Die vier Zahlen ergeben zusammen die Zeilenzahl aus `bildeVerlauf()`.
 * Das ist keine Nettigkeit, sondern die Gegenprobe: gehen sie auseinander,
 * zählt eine der beiden Funktionen etwas anderes als die andere.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ⚠ ⚠  WARUM SIE AM 10.09.2026 VIER ZAHLEN STATT DREI LIEFERT  ⚠ ⚠
 *
 * Seit dem Entscheid, die SFV-Namen zu speichern, gibt es ZWEI Sorten
 * Name: den zugeordneten (unsere Schreibweise) und den des Verbands
 * (Rückfall). Der Export mischt beide in EINE Map, damit
 * `beschreibeWer()` unverändert bleiben kann.
 *
 * **Genau dadurch hätte dieselbe Funktion ab sofort etwas anderes
 * gemessen** — „steht irgendein Name da" statt „ist jemand zugeordnet".
 * Bei 308 SFV-Namen und 0 Zuordnungen hätte sie dreistellige Werte
 * gemeldet und ausgesehen wie ein grosser Erfolg der Zuordnungsarbeit,
 * die gar nicht stattgefunden hat.
 *
 * **Kein Test wäre rot geworden.** Die Funktion rechnet weiterhin
 * richtig; nur die Frage darunter hatte sich geändert.
 *
 * > Eine Zahl, deren Bedeutung sich ändert, ohne dass ihr Name sich
 * > ändert, ist gefährlicher als eine falsche Zahl — die falsche fällt
 * > auf.
 *
 * Deshalb bekommt sie die zwei Mengen GETRENNT und mischt sie nicht
 * selbst. Wer sie mit einer Map aufruft, ruft das Falsche.
 * ══════════════════════════════════════════════════════════════════════
 */
export function zaehleVerlaufNamen(
  ereignisse: AnzeigeEreignis[],
  /** Die Zuordnungen — unsere Schreibweise, sie gewinnt. */
  zugeordnet: ReadonlySet<number> | Map<number, string>,
  /** Die Namen aus der SFV-Ablage — der Rückfall. */
  sfvNamen: ReadonlySet<number> | Map<number, string> = new Set<number>(),
): NamensZaehlung {
  const z: NamensZaehlung = {
    mit_eigenem_namen: 0, mit_sfv_namen: 0, mit_rueckennummer: 0, mit_gegnername: 0,
    zeilen_mit_zweitem_namen: 0,
    zeilen_ohne_ersatzkennung: 0, zeilen_ohne_ersatzname: 0,
  };

  for (const e of ereignisse) {
    /* Derselbe Filter wie in bildeVerlauf — was dort wegfällt, darf hier
       nicht mitgezählt werden. */
    if (!verlaufArt(e.typ_id, e.subtyp_id ?? null)) continue;

    /* ⚠ VOR dem Gegner-Zweig: eine Wechselzeile des GEGNERS nennt keinen
       Menschen — der Constraint erzwingt dort null. Der Zähler darf sie
       also gar nicht erst ansehen, sonst zählte er eine Preisgabe, die es
       nicht geben kann. */
    if (e.ist_eigener && verlaufArt(e.typ_id, e.subtyp_id ?? null) === "wechsel") {
      const zid = e.ein_sfv_person_id;
      if (zid == null) {
        /* Keine Kennung: entweder liefert der Verband sie nicht, oder die
           Zeile ist aelter als der 19.08.2026 und wurde nie neu geholt. */
        z.zeilen_ohne_ersatzkennung++;
      } else if (zugeordnet.has(zid) || sfvNamen.has(zid)) {
        z.zeilen_mit_zweitem_namen++;
      } else {
        /* Kennung ja, Name nein — eine andere Ursache und ein anderer
           Weg dorthin. Die zwei zusammenzuzaehlen hiesse, den Leser in
           die falsche Richtung zu schicken. */
        z.zeilen_ohne_ersatzname++;
      }
    }

    if (!e.ist_eigener) { z.mit_gegnername++; continue; }
    const id = e.sfv_person_id;
    /* ⚠ Die Reihenfolge ist die Aussage — dieselbe wie in der Anzeige:
       zugeordnet gewinnt, sonst der SFV-Name, sonst die Nummer. Wer sie
       hier anders sortiert, misst etwas anderes als die Website zeigt. */
    if (id != null && zugeordnet.has(id)) { z.mit_eigenem_namen++; continue; }
    if (id != null && sfvNamen.has(id)) { z.mit_sfv_namen++; continue; }
    z.mit_rueckennummer++;
  }

  return z;
}

/* ── Das ganze Spiel ──────────────────────────────────────────────── */

/** Die Felder aus `spiele`, die der Export liest. */
export interface SpielQuelle {
  sfv_match_id: number | null;
  sfv_spiel_nr: string | null;
  date: string | null;
  zeit: string | null;
  gegner: string | null;
  heimspiel: boolean | null;
  venue: string | null;
  wettbewerb: string | null;
  /** SFV `leagueName`, z. B. „Junioren C Promotion". */
  liga: string | null;
  sfv_gruppe: string | null;
  sfv_status: number | null;
  resultat: string | null;
  ht_resultat: string | null;
}

/**
 * Ein Spiel in die Form bringen, die das Plugin erwartet.
 *
 * ⚠ Gibt `null` zurück, wenn `sfv_match_id` fehlt. Das ist der Schlüssel,
 * und ohne ihn wäre der Beitrag beim nächsten Lauf nicht wiederzufinden —
 * er entstünde ein zweites Mal. Ein Spiel ohne Schlüssel gehört nicht in
 * die Nutzlast, und es still mitzuschicken wäre schlimmer als es
 * wegzulassen.
 */
export function bildeSpiel(
  q: SpielQuelle,
  sfvTeamId: string,
  ereignisse: AnzeigeEreignis[],
  namen: Map<number, string>,
  unserKlub: string,
): WpSpiel | null {
  if (q.sfv_match_id == null) return null;

  const heimspiel = q.heimspiel !== false;
  const { status, publizieren } = bildeStatus(q.sfv_status);
  const tore = zerlegeResultat(q.resultat);
  const halb = zerlegeResultat(q.ht_resultat);

  return {
    sfv_match_id: String(q.sfv_match_id),
    sfv_spiel_nr: q.sfv_spiel_nr ?? "",
    datum: wpDatum(q.date),
    zeit: wpZeit(q.zeit),
    sfv_team_id: sfvTeamId,
    gegner: q.gegner ?? "",
    heim_auswaerts: heimspiel ? "heim" : "auswaerts",
    ort: q.venue ?? "",
    wettbewerb: q.wettbewerb ?? "",
    liga: q.liga ?? "",
    /* ⚠ „Gruppe  2" — MIT ZWEI LEERZEICHEN, in allen 270 Etiketten.
       Der Wert kommt so vom Verband (`groupName`), und er BLEIBT SO
       (Entscheidung Didi, 10.09.2026). Siehe hatDoppelabstand(). */
    /* ⚠ `runde` TRAEGT DEN GRUPPENNAMEN — „Gruppe 3", nicht eine Runde.
       Der Feldname stammt aus dem Theme und ist aelter als der Inhalt;
       umbenennen hiesse, den Vertrag mit der Vorlage zu brechen. Wer ihn
       liest, muss wissen, was drinsteht: dieselbe Falle wie ein Endpunkt,
       der „Teams" heisst und Teams mit Rangliste liefert. */
    /* ⚠ ⚠  NUR DIE GRUPPE. HIER STAND EINEN TAG LANG EIN RUECKFALL AUF
       `sfv_runde`, UND DER WAR DER WOCHENTAG.

       Gemessen von der Website-Seite am 10.09.2026: 36 Spiele zeigten
       „CUP · SAMSTAG", waehrend links daneben schon „Sa. 19.09. · 19:30"
       stand. `playDayName` ist der Spieltag, nicht die Runde.

       ⚠ LEER IST RICHTIG, DER WOCHENTAG IST FALSCH. Das Etikett drueben
       laesst ein fehlendes Stueck samt Trennzeichen weg — ein leeres Feld
       kostet nichts, ein falsches steht auf der Seite.

       ⚠ Wo es wirklich eine Runde gibt, ist bis heute UNBEKANNT — und
       der Verband liefert sie nicht in einer Form, die einen Namen
       verdient. `roundNbr` stand bis zum 10.09.2026 als `sfv_runde_nr`
       in der Datenbank und ist ausgebaut: gemessen traegt es je
       Wettbewerb etwas anderes (Meisterschaft 1–26, Cup 1–2,
       Trainingsspiele 0, Schweizer-Cup 105).

       Ein Cupspiel hat auf der Website deshalb kein Rundenetikett. Das
       ist richtig so: leer ist ehrlich, eine erfundene Runde nicht. */
    runde: q.sfv_gruppe ?? "",
    status,
    publizieren,
    tore_heim: tore.tore_heim,
    tore_gast: tore.tore_gast,
    halbzeit_heim: halb.tore_heim,
    halbzeit_gast: halb.tore_gast,
    verlauf: bildeVerlauf(ereignisse, heimspiel, namen, unserKlub),
  };
}
