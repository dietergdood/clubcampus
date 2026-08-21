// ClubCampus — supabase/functions/sfv-sync/ergebnisTypen.ts
//
// Die FORM eines Sync-Ergebnisses — und die Allowlist, die bestimmt, was
// davon die Function verlaesst.
//
// ⚠ WARUM EINE EIGENE DATEI. Sie enthaelt keinen Deno-eigenen Import und
// kein `esm.sh`. Damit koennen BEIDE Welten sie lesen: `deno check` fuer die
// Edge Function und `tsc`/vitest fuer die Tests im Portal. `sync.ts` selbst
// laesst sich aus einem Test nicht importieren — der esm.sh-Import allein
// erzeugt 21 Fehler unter `tsc`, weil es eine Deno-Datei ist.
//
// Und das ist mehr als ein Werkzeugproblem: eine Attrappe, die die Form
// ABSCHREIBT, prueft die Abschrift. Hier steht die Form einmal, und der Test
// annotiert sein Fixture damit — ein neues Feld faellt dort auf.

import type { OffenerName } from "./matchdaten.ts";

export interface MatchdatenErgebnis {
  spiele_geholt: number;
  aufstellung_zeilen: number;
  ereignisse_zeilen: number;
  eigene_unzugeordnet: number;
  /* Wie viele Zuordnungen es ueberhaupt schon gibt. Trennt den
     Normalzustand vom Verdachtsfall: ohne eine einzige Zuordnung steht sie
     schlicht noch aus, das ist keine Auffaelligkeit. */
  zuordnungen_gesamt: number;
  /* Spielerpaesse, die der Verband geliefert hat und die sich geaendert
     haben. Jeder davon steht auch im Verlauf des Mitglieds. */
  paesse_geschrieben: number;
  /* Mitglieder mit widerspruechlicher Zuordnung: zwei SFV-Personen, zwei
     Passnummern. Fuer sie wird NICHTS geschrieben — der Wert pendelte sonst
     bei jedem Lauf. Von Hand zu klaeren. */
  pass_konflikte: string[];
  nachzug_meldungen: number;
  /**
   * Namen der noch nicht zugeordneten EIGENEN Spieler.
   *
   * ⚠ Sie werden NICHT gespeichert — sie reisen nur in dieser Antwort mit,
   * damit die Zuordnungsmaske sie fuer diese Sitzung zeigen kann. Siehe
   * `bildeOffeneNamen` in matchdaten.ts.
   *
   * ⚠ Nur beim Lauf von Hand nuetzlich: die Antwort des stuendlichen
   * Zeitplans geht an pg_net, nicht an einen Browser.
   */
  offene_namen: OffenerName[];
  fehler: number;
  /* WARUM ein Spiel scheiterte, nicht nur DASS. Ohne diese Liste sah ein
     42P10 aus der Datenbank genauso aus wie ein 404 vom Verband — am
     20.08.2026 hat das einen reproduzierbaren Fehler tagelang als
     "der SFV hat nichts geliefert" getarnt. Auf die ersten fuenf begrenzt:
     scheitern alle zehn, sagen fuenf Meldungen dasselbe wie zehn. */
  fehlermeldungen: string[];
}

export interface LaufErgebnis {
  status: "ok" | "warnung" | "fehler";
  meldung: string;
  spiele: { neu: number; aktualisiert: number; ohne_team: number; nicht_mehr_geliefert: number };
  ranglisten: { geschrieben: number; entfernt: number; gruppen: number };
  verwaiste_zuordnungen: number;
  derbys: number;
  matchdaten?: MatchdatenErgebnis;
  logos?: { geholt: number; fehlt: number };
  saison?: { id: number; name: string };
}

/**
 * Was von einem Lauf nach `api_sync_log.details` geschrieben werden darf.
 *
 * ⚠ ALLOWLIST, UND ZWAR AUS EINEM KONKRETEN ANLASS. Am 21.08.2026 bekam
 * `MatchdatenErgebnis` das Feld `offene_namen` — gedacht als Durchreiche an
 * den Browser, die NIRGENDS gespeichert wird. Geschrieben wurde bis dahin
 * `details: erg`, also das ganze Objekt. Damit lagen nach sieben Laeufen
 * 903 Klarnamen eigener Spieler in `api_sync_log`, dauerhaft, und der
 * stuendliche Zeitplan legte jede Stunde 129 dazu.
 *
 * Es hat nichts fehlschlagen koennen: das Feld war neu, der Ausgang alt.
 * **Ein neues Feld erbt jeden Ausgang des Objekts, an dem es haengt** — auch
 * die, die man beim Hinzufuegen nicht ansieht.
 *
 * Deshalb wird hier aufgezaehlt statt ausgeschlossen. Ein kuenftiges Feld
 * steht damit im Zweifel NICHT im Protokoll und faellt auf, statt still
 * mitzureisen.
 */
export function fuersProtokoll(erg: LaufErgebnis): Record<string, unknown> {
  const raus: Record<string, unknown> = {
    status: erg.status,
    meldung: erg.meldung,
    spiele: erg.spiele,
    ranglisten: erg.ranglisten,
    verwaiste_zuordnungen: erg.verwaiste_zuordnungen,
    derbys: erg.derbys,
  };
  if (erg.saison) raus.saison = erg.saison;
  if (erg.logos) raus.logos = erg.logos;
  const md = erg.matchdaten;
  if (md) {
    /* ⚠ `offene_namen` steht hier bewusst NICHT. `pass_konflikte` und
       `fehlermeldungen` fuehren Mitglieds-IDs und Fehlertexte, keine
       Klarnamen — nachgeprueft am 21.08.2026. */
    raus.matchdaten = {
      spiele_geholt: md.spiele_geholt,
      aufstellung_zeilen: md.aufstellung_zeilen,
      ereignisse_zeilen: md.ereignisse_zeilen,
      eigene_unzugeordnet: md.eigene_unzugeordnet,
      zuordnungen_gesamt: md.zuordnungen_gesamt,
      paesse_geschrieben: md.paesse_geschrieben,
      pass_konflikte: md.pass_konflikte,
      nachzug_meldungen: md.nachzug_meldungen,
      fehler: md.fehler,
      fehlermeldungen: md.fehlermeldungen,
    };
  }
  return raus;
}

/**
 * Dasselbe Ergebnis fuer die ANTWORT eines Zeitplan-Laufs.
 *
 * ⚠ Der zweite Ausgang, und er war genauso wenig im Blick: die Antwort
 * eines Cron-Laufs geht an `pg_net` — und pg_net legt den Antwortkoerper in
 * `net._http_response.content` ab. Die Namen waeren damit ein zweites Mal
 * in der Datenbank, nur kurzlebiger.
 *
 * Sie nuetzen dort ohnehin niemandem: Namen sind fuer die Zuordnungsmaske
 * da, und die sitzt in einem Browser. Der Zeitplan bekommt sie deshalb gar
 * nicht erst.
 */
export function fuerZeitplanAntwort(erg: LaufErgebnis): Record<string, unknown> {
  return fuersProtokoll(erg);
}

