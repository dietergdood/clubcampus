/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpBestand.ts

   Der Zeitraum der Bestandsliste — reine Logik, ohne Netz und ohne
   Datenbank, damit sie prüfbar ist.

   ⚠ WARUM SIE HIER LIEGT UND NICHT IN DER EDGE FUNCTION

   `supabase/functions/wp-export/index.ts` importiert von `esm.sh` und
   wird deshalb weder von `tsc` gelesen noch von vitest ausgeführt —
   für sie gäbe es nur eine Strukturprüfung auf den Quelltext. Das ist
   das Mittel für ZUSAGEN („sie schreibt nicht"), nicht für RECHNUNGEN.
   Eine Filterung, die eine Zeile zu viel oder zu wenig durchlässt,
   findet keine Strukturprüfung.

   Dasselbe Muster wie `wpNutzlast.ts` und `matchdatenAnzeige.ts`: die
   Function importiert von hier.

   ⚠ ZEITRAUM STATT ANZAHL — die Entscheidung, und sie hat einen Grund.
   Didi, 07.09.2026: *„die Frage ist «was ist seit dem Anfang
   entstanden», und eine Anzahl beantwortet sie nur zufällig."* Ein
   „letzte 50" trifft die Frage nur, solange es zufällig 50 sind; es
   ist dieselbe geratene Zahl wie die Schwelle 20 der Löschvorschau,
   die bei einem Stapel von zwei umfiel.
   ═══════════════════════════════════════════════════════════════ */

/** Eine Zeile, wie WordPress sie liefert. */
export interface BestandZeile {
  beitrag_id: number;
  titel: string;
  status: string;
  sfv_match_id: string;
  team: string;
  /** Wann der Export den Beitrag ANGELEGT hat (post_date, GMT). */
  angelegt: string;
  lauf_zuletzt: string;
  lauf_erst: string;
  ohne_laufstempel: boolean;
  bearbeiten_url: string;
}

export type ZeitraumQuelle = "vorgegeben" | "erster-lauf" | "offen";

export interface Zeitraum {
  von: string | null;
  bis: string | null;
  /**
   * Woher `von` kommt. ⚠ Steht in der Antwort, weil es die Aussagekraft
   * bestimmt: ein vorgegebener Zeitraum ist eine Frage, ein aus dem
   * Protokoll gelesener ist eine Messung, und `offen` heisst, dass es
   * keinen Anfang zu lesen gab.
   */
  quelle: ZeitraumQuelle;
}

/**
 * Eine Zeitangabe vergleichbar machen.
 *
 * ⚠ WORDPRESS LIEFERT KEIN ISO. `post_date_gmt` ist MySQL-Schreibweise
 * („2026-09-05 17:20:00"), `api_sync_log.gestartet_am` ist ISO
 * („2026-09-05T17:20:00.000Z"). Ein Zeichenvergleich der beiden geht
 * SCHIEF, und zwar lautlos: das Leerzeichen (0x20) sortiert vor dem „T"
 * (0x54), also gilt jeder MySQL-Zeitpunkt als kleiner als jeder
 * ISO-Zeitpunkt desselben Tages — die Filterung liesse dann genau die
 * Beiträge durchfallen, um die es geht.
 *
 * Deshalb wird geparst, nicht verglichen. Ohne Zeitzone gilt UTC: beide
 * Quellen liefern GMT, und `new Date("… …")` würde sonst ortszeitlich
 * gelesen — auf einem Server in Zürich zwei Stunden daneben.
 */
export function zeitWert(roh: string | null | undefined): number | null {
  const t = (roh ?? "").trim();
  if (!t) return null;
  /* MySQL-Form ohne Zone → ausdrücklich als UTC lesen. */
  const mysql = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(t);
  const wert = Date.parse(mysql ? `${mysql[1]}T${mysql[2]}Z` : t);
  return Number.isNaN(wert) ? null : wert;
}

/**
 * Den Zeitraum bestimmen.
 *
 * ⚠ DER ANFANG WIRD GELESEN, NICHT GESCHRIEBEN. Didis Ergänzung vom
 * 07.09.2026: den Beginn des Exports nicht als Datum in den Code
 * schreiben, sondern aus dem ersten Protokolleintrag nehmen. Ein Datum
 * im Code ist eine Behauptung über einen Zeitpunkt, den der Code nicht
 * kennt — und es veraltet, ohne dass etwas fehlschlägt.
 */
export function waehleZeitraum(
  vorgabe: { von?: string | null; bis?: string | null },
  ersterLauf: string | null,
): Zeitraum {
  const bis = (vorgabe.bis ?? "").trim() || null;
  const vorVon = (vorgabe.von ?? "").trim();
  if (vorVon) return { von: vorVon, bis, quelle: "vorgegeben" };
  if (ersterLauf) return { von: ersterLauf, bis, quelle: "erster-lauf" };
  return { von: null, bis, quelle: "offen" };
}

export interface BestandZusammenfassung {
  zeitraum: Zeitraum;
  /** Alle Beiträge, die dem Export gehören — ungefiltert. */
  gesamt: number;
  im_zeitraum: number;
  ausserhalb: number;
  /** ⚠ Ohne verwertbares Datum. Sie werden GEZEIGT, nie stillschweigend weggelassen. */
  ohne_datum: number;
  ohne_laufstempel: number;
  ohne_laufstempel_sichtbar: number;
  /** Der älteste Beitrag überhaupt — die Gegenprobe auf `zeitraum.von`. */
  aeltester: string | null;
  /**
   * ⚠ Beiträge, die ÄLTER sind als der erste protokollierte Lauf.
   *
   * Wären es null, deckte das Protokoll den ganzen Bestand ab. Sind es
   * mehr, hat ein Lauf geschrieben, ohne eine Zeile zu hinterlassen —
   * `api_sync_log` wird erst NACH der Antwort von WordPress geschrieben,
   * ein Absturz dazwischen lässt Beiträge ohne Protokoll zurück. Dann ist
   * der gelesene Anfang zu spät, und die Vorbelegung verdeckt genau die
   * ältesten Beiträge.
   */
  vor_erstem_lauf: number;
  zaehlung_stimmt: boolean;
  beitraege: BestandZeile[];
}

/**
 * Die Liste auf den Zeitraum einschränken — und die Zahlen dazu.
 *
 * ⚠ KEINE KÜRZUNG NACH ANZAHL, und die Reihenfolge bleibt, wie sie kam
 * (WordPress sortiert: fragliche zuerst, darin die veröffentlichten).
 * Wer entscheiden soll, muss alle sehen.
 *
 * ⚠ ZEILEN OHNE DATUM BLEIBEN DRIN. Ein Filter, der sie wegnimmt, macht
 * aus „ich weiss es nicht" ein „gibt es nicht" — und niemand sucht danach,
 * weil die Liste vollständig aussieht.
 */
export function fassBestandZusammen(
  zeilen: BestandZeile[],
  zeitraum: Zeitraum,
  ersterLauf: string | null,
): BestandZusammenfassung {
  const von = zeitWert(zeitraum.von);
  const bis = zeitWert(zeitraum.bis);
  const start = zeitWert(ersterLauf);

  const drin: BestandZeile[] = [];
  let draussen = 0;          // ⚠ eigenständig gezählt, NICHT als Differenz
  let ohneDatum = 0;
  let aeltester: number | null = null;
  let vorErstem = 0;

  for (const z of zeilen) {
    const t = zeitWert(z.angelegt);
    if (t === null) {
      ohneDatum++;
      drin.push(z);          // ⚠ bleibt drin: unbekannt ist nicht abwesend
      continue;
    }
    if (aeltester === null || t < aeltester) aeltester = t;
    if (start !== null && t < start) vorErstem++;
    if (von !== null && t < von) { draussen++; continue; }
    if (bis !== null && t > bis) { draussen++; continue; }
    drin.push(z);
  }

  const sichtbar = drin.filter((z) => z.ohne_laufstempel && z.status === "publish");

  return {
    zeitraum,
    gesamt: zeilen.length,
    im_zeitraum: drin.length,
    ausserhalb: draussen,
    ohne_datum: ohneDatum,
    ohne_laufstempel: drin.filter((z) => z.ohne_laufstempel).length,
    ohne_laufstempel_sichtbar: sichtbar.length,
    aeltester: aeltester === null ? null : new Date(aeltester).toISOString(),
    vor_erstem_lauf: vorErstem,
    /* ⚠ EINE AUFTEILUNG, DIE AUFGEHEN MUSS — UND SIE MUSS ES WIRKLICH.
       Die erste Fassung rechnete `ausserhalb` als `gesamt - drin` und
       prüfte dann, ob `drin + (gesamt - drin) === gesamt`. Das ist eine
       TAUTOLOGIE: immer wahr, auch bei kaputter Filterung. Eine Gegenprobe,
       die nicht scheitern kann, ist keine — sie ist schlimmer als keine,
       weil sie gelesen wird wie eine.

       Jetzt zählt die Schleife beide Seiten selbst. Vergisst ein Zweig
       seinen Zähler oder zählt eine Zeile doppelt, geht die Summe nicht
       auf — und DAS ist dann der Befund. */
    zaehlung_stimmt: drin.length + draussen === zeilen.length,
    beitraege: drin,
  };
}
