/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/vormerkenService.ts

   Spiele einer Mannschaft zum Neuabruf der Matchdaten vormerken.

   ANLASS: Ein Trainer traegt beim Verband nachtraeglich etwas nach —
   Assists, eine Auswechslung, eine Karte. Bei uns steht der Stand vom
   Abruf, und der rollende Nachlauf kommt erst in rund fuenf Tagen wieder
   vorbei (NACHLAUF_PLAETZE = 2 ueber ~270 Spiele). Bis dahin zeigt die
   Website die alte Aufstellung.

   Dieser Dienst setzt `spiele.matchdaten_vorgemerkt_am`; der
   Matchdaten-Lauf nimmt diese Spiele mit Vorrang
   (`VORGEMERKT_PLAETZE` Plaetze je Stunde) und loescht die Marke danach.

   ⚠ ⚠  DIE GRENZEN DIESES DIENSTES SIND IMPORTIERT, NICHT ABGESCHRIEBEN.

   `MATCHDATEN_STATUS` und `VORGEMERKT_PLAETZE` stehen in
   `supabase/functions/sfv-sync/matchdaten.ts` und werden von dort
   geholt. Beides waere hier mit einer Zahl billiger zu haben und beides
   waere derselbe Fehler: zwei Stellen, die dieselbe Frage beantworten,
   laufen still auseinander — und keine Pruefkette wird dabei rot.

   Konkret, und es ist kein hypothetischer Schaden:

   - `MATCHDATEN_STATUS` haelt den Knopf und den Lauf auf DERSELBEN Menge.
     Ein Spiel vorzumerken, das der Lauf gar nicht holt, hiesse eine Marke
     zu setzen, die nie wieder verschwindet (siehe unten).
   - `VORGEMERKT_PLAETZE` ist der Nenner der Restzeitangabe. Wer den Deckel
     im Lauf aendert und die 6 hier stehen laesst, bekommt eine Kachel, die
     eine Dauer nennt, die es nicht mehr gibt.

   ⚠ `matchdaten.ts` hat KEINE Importzeile — weder esm.sh noch sonst etwas.
   Sie ist aus `src/` lesbar, so wie `person-loeschen/vorschau.ts` es
   schon fuer `domains/person/loeschService.ts` ist.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb, TablesUpdate } from "../../types.ts";
import {
  MATCHDATEN_STATUS, VORGEMERKT_PLAETZE,
} from "../../../supabase/functions/sfv-sync/matchdaten.ts";
import { aktuelleSfvSaison, saisonZeitraum } from "./spielMapper.ts";


export interface VormerkErgebnis {
  ok: boolean;
  /** Wie viele Zeilen der Schreibvorgang TATSAECHLICH getroffen hat. */
  anzahl: number;
  /**
   * Wie viele Zeilen der Filter findet — gelesen, nicht geschrieben.
   *
   * ⚠ Die zweite Zahl ist keine Verzierung, sondern die Gegenprobe. Ein
   * `update`, das keine Zeile trifft, ist fuer PostgREST kein Fehler:
   * `error` bleibt `null`, und RLS lehnt nicht ab — sie laesst die Zeile
   * nicht sehen. „Es gibt keine solchen Spiele" und „wir duerfen sie
   * nicht schreiben" ergeben damit dieselbe Null, und genau diese
   * Ununterscheidbarkeit ist der teuerste Fehler dieses Projekts.
   *
   * Gehen die beiden Zahlen auseinander, sagt die Meldung es.
   */
  gefunden: number;
  /** `null`, wenn nichts vorgemerkt wurde — dann gibt es keine Dauer. */
  stunden: number | null;
  text: string;
}

/**
 * Wie viele Stunden es dauert, bis der Lauf `anzahl` Spiele durch hat.
 *
 * Der Sync laeuft stuendlich (`17 * * * *`, `supabase/cron_sfv_sync.sql`)
 * und nimmt je Lauf hoechstens `VORGEMERKT_PLAETZE` vorgemerkte Spiele.
 *
 * ⚠ Der Nenner ist ein Parameter mit Vorgabewert, damit ein Testfall ihn
 * setzen kann, ohne die Konstante des Laufs anzufassen. Im Betrieb wird er
 * NIE uebergeben — sonst waere die Zahl wieder an zwei Orten.
 */
export function restStunden(anzahl: number, plaetze = VORGEMERKT_PLAETZE): number {
  if (anzahl <= 0) return 0;
  /* Ein Deckel von 0 oder weniger waere ein Programmierfehler und keine
     Datenlage; ohne diese Zeile ergaebe er Infinity und die Kachel zeigte
     „in etwa Infinity Stunden". */
  if (plaetze <= 0) return anzahl;
  return Math.ceil(anzahl / plaetze);
}

/** „1 Stunde" statt „1 Stunden" — und „Spiel" statt „Spiele". */
const mehrzahl = (n: number, eins: string, viele: string) => (n === 1 ? eins : viele);

/**
 * Merkt alle ausgetragenen Spiele einer Mannschaft in der laufenden Saison
 * zum Neuabruf vor.
 *
 * @param sfvTeamId Die Verbandsnummer der Mannschaft (`teams.sfv_team_id`).
 */
export async function merkeGespielteVor(
  sb: Sb, vereinId: string | null, sfvTeamId: number | null,
  jetzt: Date = new Date(),
): Promise<VormerkErgebnis> {
  if (!sb || !vereinId || sfvTeamId == null) {
    return {
      ok: false, anzahl: 0, gefunden: 0, stunden: null,
      text: "Kein Verein oder keine Mannschaft gewählt — es wurde nichts vorgemerkt.",
    };
  }

  const saison = aktuelleSfvSaison(jetzt);
  const { von, bis } = saisonZeitraum(saison);

  /* ⚠ ⚠  DIE SAISON UEBER DEN ZEITRAUM, NICHT UEBER `sfv_saison_id`.

     Beide Wege leiten sich aus derselben Funktion ab, und `sfv_saison_id`
     ist als Angabe des Verbands das nahere Merkmal. Er ist trotzdem der
     schlechtere:

     - `spiele.sfv_saison_id` ist NULLABLE, `spiele.date` ist NOT NULL.
       Eine Zeile ohne Saison-Id fiele still heraus, und eine zu niedrige
       Zahl in der Kachel sieht genauso aus wie „so viele gibt es".
     - `fetchSpiele()` filtert bereits ueber denselben Zeitraum. Zwei
       Saisonfilter nebeneinander waeren zwei Rechnungen fuer dieselbe
       Frage — dann koennte der Spielplan 13 Spiele zeigen und der Knopf
       12 vormerken, ohne dass jemand sagen kann, welche Zahl stimmt.

     ⚠ Ob `sfv_saison_id` im Bestand tatsaechlich Luecken hat, ist
     UNGEMESSEN — von hier aus gibt es keinen Datenbankzugang. Die Wahl
     faellt deshalb auf die Spalte, die keine haben KANN. */

  /* ⚠ DIESELBEN FILTER IN BEIDEN ABFRAGEN. Ein hier vergessener Filter
     machte aus der Gegenprobe einen Fehlalarm — dieselbe Regel wie bei
     `alleSeiten()`, wo ein fehlender Embed in der Zaehlabfrage am
     12.09.2026 genau das erzeugt hat. */
  const zaehlung = await sb.from("spiele")
    .select("id", { count: "exact", head: true })
    .eq("verein_id", vereinId)
    .eq("sfv_team_id", sfvTeamId)
    .in("sfv_status", MATCHDATEN_STATUS)
    .not("sfv_match_id", "is", null)
    .gte("date", von).lte("date", bis);

  if (zaehlung.error) {
    return {
      ok: false, anzahl: 0, gefunden: 0, stunden: null,
      text: `Die Spiele konnten nicht gelesen werden: ${zaehlung.error.message}`,
    };
  }
  const gefunden = zaehlung.count ?? 0;

  /* Der erzeugte Typ traegt die Spalte seit dem 27.09.2026 selbst — bis
     dahin stand hier eine Umdeutung, weil `database.types.ts` sie noch
     nicht kannte. Sie ist mit der Migration gefallen, und ein Fall hat
     sie bewacht: er wurde rot, als es soweit war, statt darauf zu
     hoffen, dass jemand daran denkt. */
  const rumpf: TablesUpdate<"spiele"> = {
    matchdaten_vorgemerkt_am: jetzt.toISOString(),
  };

  /* ⚠ ⚠  `.select("id")` AM SCHREIBVORGANG, nicht als zweite Abfrage
     daneben. Lesen und Schreiben haengen an verschiedenen Policies: eine
     Zeile, die man sehen aber nicht aendern darf, besteht jede Gegenprobe,
     die danach noch einmal LIEST — sie beantwortet „ist lesbar?" statt
     „wurde geschrieben?". Genau diese Verwechslung stand bis zum
     23.08.2026 in `kindService.ts`.

     ⚠ Die 1000er-Grenze von PostgREST greift hier nicht: gefiltert wird
     auf EINE Mannschaft in EINER Saison, das sind rund 13 Spiele (269
     ueber 21 Mannschaften, Stand 25.08.2026). Sollte die Zahl je in die
     Naehe kommen, faellt es an der Gegenprobe darunter auf — `gefunden`
     zaehlt ueber `count: "exact"` und wird nicht gekuerzt. */
  const { data, error } = await sb.from("spiele")
    .update(rumpf)
    .eq("verein_id", vereinId)
    .eq("sfv_team_id", sfvTeamId)
    .in("sfv_status", MATCHDATEN_STATUS)
    .not("sfv_match_id", "is", null)
    .gte("date", von).lte("date", bis)
    .select("id");

  if (error) {
    return {
      ok: false, anzahl: 0, gefunden, stunden: null,
      text: `Vormerken fehlgeschlagen: ${error.message}`,
    };
  }

  const anzahl = (data ?? []).length;

  /* X = 0: keine Stundenangabe, sondern der Grund. Und der Grund nennt den
     Zuschnitt der Messung — „keine gespielten Spiele" allein liesse offen,
     ob nach Spielen ohne Verbandsnummer oder nach einer anderen Saison
     gesucht wurde. */
  if (anzahl === 0 && gefunden === 0) {
    return {
      ok: true, anzahl: 0, gefunden: 0, stunden: null,
      text: `Nichts vorgemerkt: diese Mannschaft hat in der Saison ${saison - 1}/${String(saison).slice(2)}`
        + " kein ausgetragenes Spiel mit Verbandsnummer"
        + ` (gesucht wurde vom ${von} bis ${bis}, Status ${MATCHDATEN_STATUS.join(", ")}).`,
    };
  }

  /* ⚠ Die Aufteilung muss aufgehen. Tut sie es nicht, ist das ein Befund
     ueber die Schreibrechte und keine Datenlage — und er gehoert auf den
     Schirm, nicht in ein Protokoll. */
  if (anzahl !== gefunden) {
    return {
      ok: false, anzahl, gefunden, stunden: null,
      text: `⚠ ${gefunden} ${mehrzahl(gefunden, "Spiel passt", "Spiele passen")} zum Filter,`
        + ` geschrieben wurden ${anzahl}.`
        + " Das ist kein Datenstand, sondern ein Schreibrecht: die übrigen Zeilen"
        + " sind lesbar und wurden nicht geändert.",
    };
  }

  const stunden = restStunden(anzahl);
  return {
    ok: true, anzahl, gefunden, stunden,
    text: `${anzahl} ${mehrzahl(anzahl, "Spiel", "Spiele")} vorgemerkt,`
      + ` voraussichtlich fertig in etwa ${stunden} ${mehrzahl(stunden, "Stunde", "Stunden")}.`,
  };
}
