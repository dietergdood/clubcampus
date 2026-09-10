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
  /**
   * Die SFV-Personennummer des Menschen, um den es in dieser Zeile geht
   * — **nur bei eigenen Zeilen**, bei Gegnern immer `null`.
   *
   * ⚠ ⚠  OHNE SIE MUESSTE DIE WEBSITE DEN NAMEN AUS `text`
   *       ZURUECKPARSEN. Das ist derselbe Umweg, den dieses Projekt an
   *       zwei Stellen als Fehler fuehrt: die 431 vermeintlichen
   *       Klarnamen, die 0 waren, kamen genau daher — jemand hat seinen
   *       eigenen Ausgabetext wieder zerlegt, um zu erfahren, was er
   *       hineingeschrieben hatte.
   *
   *   Mit ihr kann die Website Tore und Karten einem Spielerprofil
   *   zuordnen, ohne ueber Namen zu gehen — und ein Name ist eine
   *   Schreibweise, kein Schluessel.
   *
   * ⚠ Bei Gegnern verboten, nicht bloss ungenutzt: eine Personennummer
   *   ist ueber dieselbe Schnittstelle in einen Namen aufzuloesen.
   *   Erzwungen von `spiel_ereignisse_fremde_anonym_check`.
   *
   * ⚠ Der ZWEITE Mensch einer Wechselzeile bekommt bewusst KEIN Feld:
   *   `ein_sfv_person_id` loest nirgends auf (`substitutePlayerId` ist
   *   kein `personId`, gemessen 10.09.2026), und Einsatzminuten stehen
   *   ohnehin an der Aufstellungszeile.
   */
  sfv_person_id: number | null;
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
  /**
   * ⚠ Optional, und zwar mit Absicht: ein Spiel ohne Aufstellung schickt
   * das Feld GAR NICHT, statt eine leere Liste zu senden. Eine leere
   * Liste hiesse „niemand hat gespielt"; das Fehlen heisst „wir wissen es
   * nicht". Der Unterschied ist genau der, um den es an diesem Tag
   * mehrfach ging.
   */
  aufstellung?: WpAufstellungZeile[];
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
  /** Siehe baueNummernBruecke() — `spiel_id:nummer` → Name. */
  bruecke?: Map<string, string>,
  spielId?: string,
  /** ⚠ Wird hochgezaehlt, wenn die Bruecke traegt. Sie ist ein Rueckfall
      ueber eine Anzeigeangabe, und wie oft er greift, gehoert gezaehlt —
      steigt die Zahl gegen null, loest der Verband wieder auf. */
  zaehler?: { ueber_nummer_aufgeloest: number },
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
    let zweiter = "";
    if (art === "wechsel") {
      const ohne = beschreibeGewechselten(e, namen);
      zweiter = beschreibeGewechselten(e, namen, bruecke, spielId);
      /* ⚠ Die Differenz ist der Zaehler: nur wenn die Bruecke etwas
         beigetragen hat, das die Karte nicht hatte. Sonst zaehlte er
         jeden aufgeloesten Wechsel mit und saehe nach Erfolg aus, wo
         nichts geschah. */
      if (zaehler && zweiter !== ohne && !zweiter.startsWith("Nr. ")) {
        zaehler.ueber_nummer_aufgeloest += 1;
      }
    }
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
      /* ⚠ Der Zweig steht hier, obwohl der CHECK fremde Zeilen ohnehin
         auf null zwingt: wer diese Zeile liest, soll die Grenze sehen
         statt sie voraussetzen zu muessen. */
      sfv_person_id: wir ? (e.sfv_person_id ?? null) : null,
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

/* ── Wie ein Spieler in der Aufstellung heisst ─────────────────────

   ⚠ EINE STELLE FUER BEIDE SEITEN (Entscheid Didi, 10.09.2026). Wer
   keinen Namen hat — ein Gegner immer, ein eigener Spieler bis zur
   Zuordnung —, erscheint als „Nr. 10". **Dieselbe Bildung, dieselbe
   Schreibweise, ein Ort im Code.** Zwei Stellen liefen sonst
   auseinander, und der Unterschied fiele erst auf der Website auf.

   ⚠ UND DIE DOPPELUNG IST ABSICHT, KEIN VERSEHEN: `spieler` traegt bei
   fehlendem Namen die Nummer, und `nummer` fuehrt sie zusaetzlich als
   eigenes Feld. Mein Einwand dagegen (zwei Wahrheiten) ist notiert und
   ueberstimmt worden — die Einheitlichkeit der Zeile wiegt schwerer.
   Wer das spaeter „aufraeumt", nimmt der Vorlage die Wahl.

   ⚠ WO WEDER NAME NOCH NUMMER DA IST, BLEIBT ES LEER. Kein „Nr. null",
   kein Platzhalter — ein erfundener Text auf einer oeffentlichen Seite
   ist von einer Auskunft nicht zu unterscheiden. Gemessen im
   Beispielspiel: dieser Fall kommt bei den 32 Spielern NICHT vor, und
   er kann bei Gegnern gar nicht entstehen (eine fremde Zeile ohne
   Nummer wird nicht angelegt). */
export function spielerAnzeige(
  name: string | null | undefined, nummer: number | null | undefined,
): string {
  const n = String(name ?? "").trim();
  if (n) return n;
  return nummer != null ? `Nr. ${nummer}` : "";
}

/* ── Startelf, eingewechselt oder gar nicht eingesetzt ─────────────

   ⚠ ⚠  AUS DEN MINUTEN, NICHT AUS `assignmentRoleId` — umgestellt am
         10.09.2026, nachdem die Zuweisung sich in BEIDE Richtungen als
         unzuverlaessig erwiesen hat.

   Gemessen ueber ALLE Zeilen (Didi, 10.09.2026):

     assignmentRole 2 „Ersatz"       32x 0/0/0   ✅ nicht eingesetzt
                                      9x 1/90/90 ❌ hat durchgespielt
                                      8x 1/80/80 ❌ hat durchgespielt
     assignmentRole 0 „-"            20x 0/0/0   ❌ nicht eingesetzt
     assignmentRole 3 „Kein Einsatz" 10x 0/0/0   ✅

   **Die Minuten widersprechen sich nie, die Zuweisung staendig.**

   ⚠ WAS ICH VORHER BEHAUPTET HABE UND ZURUECKNEHME: „die drei
   Minutenfelder sind Konstanten, keine Messwerte." Das galt fuer EIN
   aufgezeichnetes Spiel, in dem zufaellig ueberall 1/90/90 stand. Ueber
   alle Zeilen sind es echte Werte — 1/90/90 531x, 1/80/80 226x, 0/0/0
   156x, 1/70/70 59x, 1/46/45 29x (ausgewechselt), 46/90/45 25x
   (eingewechselt zur Halbzeit), dazu Dutzende Abstufungen.

   **Derselbe Fehler wie bei der Rollenmenge 0–2: aus einer Stichprobe
   eine Aussage ueber den Bestand gemacht. Zweimal am selben Tag.**

   ⚠ UND „Kein Einsatz" HEISST GENAU DAS. Ich hatte behauptet, die
   Bezeichnung sage das Gegenteil der Daten. Sie tut es nicht — alle
   zehn Zeilen tragen 0/0/0. Erzeugt hat den Irrtum meine eigene
   Testbedingung: `von_minute is not null` ist bei **0** wahr. Ich habe
   die Null mit dem Fehlen verwechselt und daraus „sie haben gespielt"
   gelesen.

   ── Die Regel ────────────────────────────────────────────────────────
     spielzeit === 0        →  nicht eingesetzt
     von_minute  >  1       →  eingewechselt
     sonst                  →  Startelf

   ⚠ Die Zuweisung wird trotzdem gelesen: als `ist_captain` (das ist die
   einzige Aussage, die sie ALLEIN traegt) und als `widerspruch`, damit
   die Uneinigkeit der Quelle zaehlbar bleibt statt geglaettet zu
   werden. **Aus deinen Zahlen folgt eine Vorhersage: mindestens 37
   Widersprueche** (17 Ersatzspieler, die durchspielten, plus 20 mit
   „-" ohne Einsatz). Weicht der naechste Lauf stark davon ab, ist die
   Regel falsch und nicht die Quelle. */
export const ROLLE_ERSATZ_ID = 2;

/**
 * „Kein Einsatz" — gefunden hat ihn eine SQL-Abfrage, nicht die Meldung
 * fuer unbekannte Werte: `rolleAus()` hatte am 10.09.2026 keinen
 * Aufrufer.
 */
export const ROLLE_KEIN_EINSATZ_ID = 3;

/** SFV assignmentRoleId 1 — orthogonal zu Startelf/Bank. */
export const ROLLE_CAPTAIN_ID = 1;

/**
 * Die Wertemenge von `assignmentRoleId`.
 *
 * ⚠ AN ALLEN ZEILEN GEZAEHLT, nicht aus einem Beispiel gelesen. Bis zum
 * 10.09.2026 stand hier `[0, 1, 2]` — die drei stammten aus EINER
 * aufgezeichneten Antwort. Gemessen: 0 (185), 1 (19), 2 (78), 3 (10).
 *
 * Eine Liste zum Nachschlagen gibt es nicht: `sfv_stammdaten.json`
 * fuehrt elf Listen, `assignmentRole` ist keine davon, und die
 * Swagger-Datei nennt die zwei Felder ohne jede Beschreibung.
 */
export const ROLLE_BEKANNT: number[] = [
  0, ROLLE_CAPTAIN_ID, ROLLE_ERSATZ_ID, ROLLE_KEIN_EINSATZ_ID,
];

export type SpielerRolle = "start" | "eingewechselt" | "nicht_eingesetzt";

export interface RollenBefund {
  rolle: SpielerRolle;
  ist_captain: boolean;
  /** Ein Wert, den der Verband bisher nicht geliefert hat. */
  unbekannt: number | null;
  /**
   * ⚠ Negative Spielzeit oder bis < von — kommt so vom Verband.
   *
   * BLEIBT GESETZT, AUCH WENN KORRIGIERT WURDE. Die Zahl muss zaehlbar
   * bleiben: werden es viele, ist es ein Muster beim Verband und kein
   * Tippfehler. Ein Flag, das die Reparatur mitloescht, macht aus einem
   * Befund eine Datenlage. (Entscheid Didi, 10.09.2026.)
   */
  unplausibel: boolean;
  /** Die Zuweisung sagt etwas anderes als die Minuten. */
  widerspruch: boolean;
  /** Gar keine Minutenangabe — dann traegt die Zuweisung, notgedrungen. */
  ohne_minuten: boolean;
  /** ⚠ Wurde getauscht? Enger als `unplausibel` — siehe korrigiereMinuten(). */
  korrigiert: boolean;
  /** Fuer die ANZEIGE. In der Datenbank steht weiter, was der Verband lieferte. */
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
}

/* ── Die eine Stelle, an der fremde Daten korrigiert werden ────────────

   ⚠ ⚠  HIER WIRD BEWUSST VOM GRUNDSATZ „UNVERAENDERT KOPIEREN"
         ABGEWICHEN. Ueberall sonst gilt in diesem Projekt: fremde Daten
         stillschweigend zu putzen versteckt den Fehler, statt ihn zu
         melden — der Doppelabstand in „Gruppe  2" bleibt, „Schweizer-Cup"
         und „Schweizer Cup" bleiben nebeneinander stehen.

   **Der Grund fuer die Ausnahme: eine negative Minutenzahl darf nicht
   auf die Website.** (Entscheid Didi, 10.09.2026.)

   ── Und die Grenzen, die sie zur Ausnahme machen ──────────────────────

   1 · NUR `bis_minute < von_minute`. Nicht „irgendwie unplausibel":
       eine Spielzeit, die nicht zur Differenz passt, wird nicht
       angefasst, Werte ueber 90 oder 120 auch nicht.
   2 · NUR in der Anzeige. `spiel_aufstellung` behaelt, was der Verband
       lieferte — sonst waere spaeter nicht mehr zu sehen, dass es einen
       Fehler gab, und ein Vergleich mit dem Matchblatt faende nichts.
   3 · `unplausibel` bleibt gesetzt. Die Korrektur macht den Befund
       unsichtbar, nicht ungeschehen.

   Gemessen am 10.09.2026: eine Zeile, 54/32/-22. */
export function korrigiereMinuten(
  von: number | null, bis: number | null, spielzeit: number | null,
): { von: number | null; bis: number | null; spielzeit: number | null; korrigiert: boolean } {
  if (von === null || bis === null || bis >= von) {
    return { von, bis, spielzeit, korrigiert: false };
  }
  /* Getauscht — und die Spielzeit neu gerechnet, weil die gelieferte zur
     verdrehten Reihenfolge gehoerte (bei 54/32 war sie -22). */
  return { von: bis, bis: von, spielzeit: von - bis, korrigiert: true };
}

export function rolleAus(z: {
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
  rolle_zuweisung_id: number | null;
}): RollenBefund {
  const id = z.rolle_zuweisung_id;
  const ist_captain = id === ROLLE_CAPTAIN_ID;
  const unbekannt = id !== null && !ROLLE_BEKANNT.includes(id) ? id : null;

  /* ⚠ Nicht rechnen, nur feststellen. `spielzeit` kommt als
     `totalPlayTime` unveraendert vom Verband — wir bilden die Differenz
     nirgends. Eine Zeile traegt 54/32/-22: ausgewechselt vor der
     Einwechslung, minus 22 Minuten. Das ist ein Fehler IN DER QUELLE,
     und er wird gemeldet statt stillschweigend geputzt. */
  const unplausibel = (z.spielzeit !== null && z.spielzeit < 0)
    || (z.von_minute !== null && z.bis_minute !== null && z.bis_minute < z.von_minute);

  /* ⚠ Erst korrigieren, dann ableiten. Die Rolle aus den VERDREHTEN
     Werten zu bestimmen und die korrigierten anzuzeigen waere die
     schlechteste Mischung: die Anzeige zeigte dann Minuten, zu denen die
     danebenstehende Rolle nicht passt. */
  const k = korrigiereMinuten(z.von_minute, z.bis_minute, z.spielzeit);

  const ohne_minuten = k.spielzeit === null && k.von === null;

  let rolle: SpielerRolle;
  if (ohne_minuten) {
    /* ⚠ Notloesung, und sie ist als solche gezaehlt: ohne Minuten bleibt
       nur die Zuweisung, und die ist die schlechtere Quelle. */
    rolle = id === ROLLE_KEIN_EINSATZ_ID ? "nicht_eingesetzt" : "start";
  } else if (k.spielzeit === 0) {
    rolle = "nicht_eingesetzt";
  } else if (k.von !== null && k.von > 1) {
    rolle = "eingewechselt";
  } else {
    rolle = "start";
  }

  /* Bank laut Zuweisung: 2 „Ersatz" und 3 „Kein Einsatz". */
  const zuweisungBank = id === ROLLE_ERSATZ_ID || id === ROLLE_KEIN_EINSATZ_ID;
  const widerspruch = id === null || ohne_minuten
    ? false
    : zuweisungBank
      ? rolle === "start"
      : rolle === "nicht_eingesetzt";

  return {
    rolle, ist_captain, unbekannt, unplausibel, widerspruch, ohne_minuten,
    korrigiert: k.korrigiert,
    von_minute: k.von, bis_minute: k.bis, spielzeit: k.spielzeit,
  };
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
  /** Siehe baueNummernBruecke(). Fehlt sie, bleibt es bei „Nr. 9". */
  bruecke?: Map<string, string>,
  spielId?: string,
  zaehler?: { ueber_nummer_aufgeloest: number },
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
    verlauf: bildeVerlauf(ereignisse, heimspiel, namen, unserKlub,
      bruecke, spielId, zaehler),
  };
}

/* ── Die Aufstellung fuer die Website ──────────────────────────────────

   ⚠ ⚠  DIE VIER FUNKTIONEN DARUEBER HATTEN BIS ZUM 10.09.2026 KEINEN
         AUFRUFER. `rolleAus`, `sammleMarken`, `markeSchluessel`,
         `spielerAnzeige` waren gebaut, getestet und tot — und deshalb hat
         den vierten Rollenwert („Kein Einsatz") eine SQL-Abfrage
         gefunden und nicht die Meldung, die genau dafuer gebaut war.

   **Ein Melder ohne Aufrufer ist selbst die Luecke, gegen die er gebaut
   wurde.** Das hier ist der Aufrufer.

   ── Was von einer GEGNERZEILE mitgeht ─────────────────────────────────
   Nummer, Position, Minuten, Rolle, Symbole. **Kein Name, keine
   Personennummer** — Entscheid B vom 10.09.2026, in der Datenbank durch
   `spiel_aufstellung_fremde_ohne_person` erzwungen. `spieler` bleibt beim
   Gegner leer, und das ist eine ENTSCHEIDUNG, keine Grenze der Quelle:
   der Verband liefert den Namen, wir nehmen ihn nicht. */

/** Eine Zeile, wie sie aus `spiel_aufstellung` kommt. */
export interface AufstellungQuelle {
  ist_eigener: boolean;
  sfv_person_id: number | null;
  name: string | null;
  rueckennr: number | null;
  position_name: string | null;
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
  rolle_zuweisung_id: number | null;
}

export interface WpAufstellungZeile {
  seite: "heim" | "gast";
  /**
   * Die SFV-Personennummer — **nur bei eigenen Zeilen**, bei Gegnern
   * immer `null`.
   *
   * ⚠ ⚠  DAS IST KEINE SPARSAMKEIT, SONDERN EIN VERBOT. Eine
   *       Personennummer ist ueber dieselbe Schnittstelle in einen Namen
   *       aufzuloesen — sie ist ein Name mit einem Zwischenschritt.
   *       `spiel_aufstellung_fremde_ohne_person` erzwingt es in der
   *       Datenbank; hier steht es noch einmal, weil eine Nutzlast
   *       leichter geaendert wird als ein CHECK.
   *
   * Wofuer sie da ist: die Website kann damit ein Spielerprofil an seine
   * Einsaetze binden, ohne ueber Namen zu gehen — und ein Name ist eine
   * Schreibweise, kein Schluessel.
   */
  sfv_person_id: number | null;
  nummer: number | null;
  spieler: string;
  position: string;
  rolle: SpielerRolle;
  ist_captain: boolean;
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
  /**
   * Die Symbole dieser Zeile, je mit Minute: `[{art:"tor",minute:"67"}]`.
   *
   * ⚠ ⚠  HIER STAND EINE ZEICHENKETTE („tor,tor,gelb"), UND DAS WAR EIN
   *       FEHLER, KEINE ENTSCHEIDUNG. `sammleMarken()` traegt die Minute
   *       durch die ganze Kette — der Kommentar an `AufstellungZaehlung`
   *       sagt es woertlich —, und `baueAufstellung()` hat sie in der
   *       letzten Zeile weggeworfen. Der Prototyp zeigt „⚽67'".
   *
   * Gefunden hat es Didi beim Gegenlesen der Feldliste, BEVOR der
   * Theme-Chat den Repeater angelegt hat. Danach haette dieselbe
   * Berichtigung ihn den ganzen Bau gekostet.
   *
   * ⚠ Die Wechselpfeile stehen NICHT hier, sondern an `von_minute` und
   * `bis_minute` derselben Zeile — ein Wechsel bekommt kein Symbol.
   *
   * Leer heisst „keine Symbole" — beim Gegner zusaetzlich „keine
   * Zuordnung moeglich". Siehe die Feldliste.
   */
  marken: WpAufstellungMarke[];
}

/**
 * Die sieben Zahlen der Vorschau.
 *
 * ⚠ JEDE STEHT IMMER DA, AUCH ALS NULL. Eine Zahl, die nur im schlechten
 * Fall erscheint, verlangt vom Leser eine Deutung — und die Deutung einer
 * Abwesenheit ist geraten. Am 10.09.2026 achtmal an einem Tag passiert,
 * zuletzt mit `gegner_doppel`, das Didi suchte und nicht fand.
 */
export interface AufstellungZahlen {
  zeilen_eigen: number;
  zeilen_fremd: number;
  /** Eigene Zeilen, die als „Nr. 18" erscheinen — ohne Klarnamen. */
  ohne_namen: number;
  /** Die Zuweisung des Verbands sagt etwas anderes als die Minuten. */
  widerspruch: number;
  /** Verdrehte oder negative Minuten. Bleibt gezaehlt, auch wenn korrigiert. */
  unplausibel: number;
  /** Davon getauscht (bis < von). Gemessen am 10.09.2026: 1. */
  korrigiert: number;
  /** Zuweisungswerte ausserhalb 0–3. */
  unbekannte_rollen: number[];
  /** Zeilen ohne jede Minutenangabe — dort trug die Zuweisung die Rolle. */
  ohne_minuten: number;
}

export function leereAufstellungZahlen(): AufstellungZahlen {
  return {
    zeilen_eigen: 0, zeilen_fremd: 0, ohne_namen: 0, widerspruch: 0,
    unplausibel: 0, korrigiert: 0, unbekannte_rollen: [], ohne_minuten: 0,
  };
}

/** Startelf zuerst, dann Eingewechselte, dann wer nicht zum Einsatz kam. */
const ROLLEN_ORDNUNG: SpielerRolle[] = ["start", "eingewechselt", "nicht_eingesetzt"];

export function baueAufstellung(
  zeilen: AufstellungQuelle[],
  marken: Map<string, AufstellungZaehlung>,
  heimspiel: boolean,
  namen: Map<number, string>,
  zahlen: AufstellungZahlen,
): WpAufstellungZeile[] {
  const unbekannt = new Set<number>(zahlen.unbekannte_rollen);
  const raus: WpAufstellungZeile[] = [];

  for (const z of zeilen) {
    const b = rolleAus(z);

    if (z.ist_eigener) zahlen.zeilen_eigen += 1; else zahlen.zeilen_fremd += 1;
    if (b.widerspruch) zahlen.widerspruch += 1;
    if (b.unplausibel) zahlen.unplausibel += 1;
    if (b.korrigiert) zahlen.korrigiert += 1;
    if (b.ohne_minuten) zahlen.ohne_minuten += 1;
    if (b.unbekannt !== null && b.unbekannt >= 0) unbekannt.add(b.unbekannt);

    /* ⚠ Der Schluessel wird GENAUSO gebildet wie in markeSchluessel() —
       eigene ueber die Person, fremde ueber die Nummer. Wer ihn hier
       anders bildet, zeigt Symbole an der falschen Zeile, und nichts
       schlaegt fehl. */
    const k = z.ist_eigener
      ? (z.sfv_person_id != null ? `p:${z.sfv_person_id}` : null)
      : (z.rueckennr != null ? `n:${z.rueckennr}` : null);
    const zaehlung = k !== null ? marken.get(k) : undefined;

    /* Der eigene Name kommt aus der Zuordnung, sonst aus der SFV-Antwort,
       sonst als „Nr. 18". Beim Gegner: gar nichts. */
    const eigenerName = z.sfv_person_id != null
      ? (namen.get(z.sfv_person_id) ?? z.name)
      : z.name;
    const spieler = z.ist_eigener ? spielerAnzeige(eigenerName, z.rueckennr) : "";
    if (z.ist_eigener && !String(eigenerName ?? "").trim()) zahlen.ohne_namen += 1;

    raus.push({
      /* Eine eigene Zeile steht auf unserer Seite, eine fremde auf der
         anderen — der Spielort entscheidet, welche das ist. */
      seite: z.ist_eigener === heimspiel ? "heim" : "gast",
      /* ⚠ Der Zweig steht hier und nicht in der Quelle: eine fremde
         Zeile TRAEGT gar keine Personennummer (der CHECK verbietet es),
         aber wer diese Zeile spaeter liest, soll die Grenze sehen statt
         sie voraussetzen zu muessen. */
      sfv_person_id: z.ist_eigener ? z.sfv_person_id : null,
      nummer: z.rueckennr,
      spieler,
      position: String(z.position_name ?? ""),
      rolle: b.rolle,
      ist_captain: b.ist_captain,
      von_minute: b.von_minute,
      bis_minute: b.bis_minute,
      spielzeit: b.spielzeit,
      marken: zaehlung?.marken ?? [],
    });
  }

  zahlen.unbekannte_rollen = [...unbekannt].sort((a, b) => a - b);

  /* Eigene zuerst, darin Startelf vor Eingewechselten vor
     Nichteingesetzten, darin nach Nummer. */
  return raus.sort((a, b) => {
    if (a.seite !== b.seite) return a.seite === (heimspiel ? "heim" : "gast") ? -1 : 1;
    const ra = ROLLEN_ORDNUNG.indexOf(a.rolle) - ROLLEN_ORDNUNG.indexOf(b.rolle);
    if (ra !== 0) return ra;
    return (a.nummer ?? 999) - (b.nummer ?? 999);
  });
}
