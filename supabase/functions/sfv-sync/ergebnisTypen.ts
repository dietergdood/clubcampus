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
  /* ⚠ HIER STAND `offene_namen`, vom 21. bis 22.08.2026. Die Namen sind aus
     dem Lauf-Ergebnis VERSCHWUNDEN, und das ist die eigentliche Lehre des
     Vorfalls: sie hatten hier nie etwas zu suchen.

     Der Sync konnte die Frage ohnehin nicht beantworten — er holt zehn
     Spiele nach Zeitplan, und von 177 offenen Spielern waren darueber 48
     GAR NICHT erreichbar. Die Antwort gibt jetzt die eigene Aktion
     `namen` (namenLauf.ts), die die Spiele nach der Frage waehlt.

     Damit traegt dieses Objekt keine Personendaten mehr — und die beiden
     Ausgaenge (api_sync_log.details, pg_net) koennen gar nichts mehr
     ausplaudern. Die Allowlists unten bleiben trotzdem: sie schuetzen vor
     dem NAECHSTEN Feld, nicht vor diesem. */
  fehler: number;
  /* WARUM ein Spiel scheiterte, nicht nur DASS. Ohne diese Liste sah ein
     42P10 aus der Datenbank genauso aus wie ein 404 vom Verband — am
     20.08.2026 hat das einen reproduzierbaren Fehler tagelang als
     "der SFV hat nichts geliefert" getarnt. Auf die ersten fuenf begrenzt:
     scheitern alle zehn, sagen fuenf Meldungen dasselbe wie zehn. */
  fehlermeldungen: string[];
}

/**
 * Wie viele Mannschaften des Verbands in ClubCampus keine Zuordnung haben.
 *
 * ⚠ Beide Richtungen sehen fast gleich aus und meinen Gegenteiliges:
 *
 * | | Frage | wann sie anschlaegt |
 * |---|---|---|
 * | `verwaiste_zuordnungen` | wir kennen eine Nummer, der Verband nicht | ein Team faellt weg |
 * | `sfv_teams_ohne_zuordnung` | der Verband kennt ein Team, wir nicht | ein Team kommt dazu |
 *
 * @param sfvTeamIds  Teamnummern aus `/api/team/list` — die Liste des Verbands.
 * @param zugeordnet  Die `sfv_team_id` unserer `teams`-Zeilen (ohne null).
 */
export function zaehleOhneZuordnung(
  sfvTeamIds: Iterable<number>, zugeordnet: Iterable<number>,
): number {
  const unsere = new Set<number>();
  for (const n of zugeordnet) unsere.add(Number(n));
  let offen = 0;
  for (const n of sfvTeamIds) if (!unsere.has(Number(n))) offen++;
  return offen;
}

/**
 * Dasselbe, aber getrennt nach AKTIV — und das ist der Unterschied
 * zwischen einer Zahl, die man beheben kann, und einer, die bleibt.
 *
 * ⚠⚠ **GEFUNDEN AM 10.09.2026, ZEHN MINUTEN NACH DEM BAU VON
 * `zaehleOhneZuordnung`, UND ES IST EIN FEHLER IN GENAU DIESEM BAU.**
 *
 * `/api/team/list` liefert je Team ein `isTeamActive`; der Sync uebernimmt
 * es seit jeher als `aktiv` (`sfvApi.ts:96`) — und **liest es nirgends**.
 * Weder der Filter `eigene`, noch die Zuordnungsmaske, noch der Export.
 *
 * Fuer den neuen Zaehler heisst das: eine aufgeloeste Mannschaft aus einer
 * frueheren Saison wuerde als „ohne Zuordnung" gemeldet — dauerhaft, und
 * **niemand kann sie beheben**, weil es nichts zuzuordnen gibt.
 *
 * > Ein Pruefmittel, das dauerhaft eine Zahl ueber null meldet, die
 * > niemand senken kann, wird nach zwei Wochen ueberlesen. Dann ist es
 * > schlechter als keines — dieselbe Abstumpfung wie bei den 758
 * > Lint-Warnungen.
 *
 * Deshalb zwei Zahlen statt einer. `offen_aktiv` ist die, auf die jemand
 * reagieren kann; `offen_gesamt` daneben zeigt, ob die Differenz an
 * inaktiven Mannschaften liegt.
 */
export function zaehleOhneZuordnungGetrennt(
  sfvTeams: Iterable<{ sfv_team_id: number; aktiv?: boolean }>,
  zugeordnet: Iterable<number>,
): { offen_gesamt: number; offen_aktiv: number } {
  const unsere = new Set<number>();
  for (const n of zugeordnet) unsere.add(Number(n));
  let gesamt = 0, aktiv = 0;
  for (const t of sfvTeams) {
    if (unsere.has(Number(t.sfv_team_id))) continue;
    gesamt++;
    /* ⚠ Fehlt das Kennzeichen, gilt das Team als aktiv — wie in
       `sfvApi.ts`. Ein unbekannter Zustand darf keine Mannschaft
       unsichtbar machen. */
    if (t.aktiv !== false) aktiv++;
  }
  return { offen_gesamt: gesamt, offen_aktiv: aktiv };
}

/**
 * Mannschaften, die eine Zuordnung haben und im Spielplan nicht vorkommen.
 *
 * ⚠⚠ **DAS IST EIN BEFUND UND KEINE DATENLAGE.** (Didi, 10.09.2026.)
 *
 * Eine `sfv_team_id` ist eine Behauptung: „diese Mannschaft gibt es beim
 * Verband unter dieser Nummer". Liefert der Spielplan zu ihr **null**
 * Spiele, ist die Behauptung entweder falsch geworden — oder sie war es
 * nie.
 *
 * ⚠ **Und der Abruf scheitert dabei nicht, er liefert nichts.** Genau
 * deshalb braucht es diese Zahl: ein Fehler meldet sich, eine leere
 * Antwort nicht.
 *
 * **Der Anlass ist eine offene Frage, die erst der 01.07.2027
 * beantwortet:** ob eine `teamId` den Saisonwechsel überlebt. Gemessen am
 * 10.09.2026: unsere Daten kennen nur eine Saison (2027 seit dem ersten
 * Lauf am 14.08.2026), es gab nie einen Wechsel — **kein Beleg dafür und
 * keiner dagegen.** Kippen die Nummern im Sommer, schlägt diese Zahl
 * dreizehnmal an, und dann wissen wir es.
 *
 * ⚠ **Warum nicht einfach „> 0 heisst Alarm":** vor dem ersten Spieltag
 * hat KEINE Mannschaft Spiele. Eine Meldung, die jeden Juli für alle
 * anschlaegt, wird im August nicht mehr gelesen — dieselbe Abstumpfung wie
 * bei den 758 Lint-Warnungen. Deshalb zaehlt sie nur, wenn der Lauf
 * ueberhaupt Spiele gebracht hat: dann ist „diese eine hat keine" eine
 * Aussage ueber die Mannschaft und nicht ueber den Kalender.
 */
export function findeTeamsOhneSpiele(
  zugeordnet: Iterable<{ sfv_team_id: number; name: string }>,
  teamIdsMitSpielen: Iterable<number>,
  spieleImLauf: number,
): { anzahl: number; teams: string[]; meldepflichtig: boolean } {
  const mitSpielen = new Set<number>();
  for (const n of teamIdsMitSpielen) mitSpielen.add(Number(n));

  const ohne: string[] = [];
  for (const t of zugeordnet) {
    if (!mitSpielen.has(Number(t.sfv_team_id))) ohne.push(`${t.name} (${t.sfv_team_id})`);
  }
  return {
    anzahl: ohne.length,
    teams: ohne,
    /* ⚠ Nur wenn der Lauf ueberhaupt Spiele hatte — siehe oben. */
    meldepflichtig: ohne.length > 0 && spieleImLauf > 0,
  };
}

export interface LaufErgebnis {
  status: "ok" | "warnung" | "fehler";
  meldung: string;
  spiele: { neu: number; aktualisiert: number; ohne_team: number; nicht_mehr_geliefert: number };
  ranglisten: { geschrieben: number; entfernt: number; gruppen: number };
  verwaiste_zuordnungen: number;
  /**
   * Die Gegenrichtung: Mannschaften, die der VERBAND fuehrt und denen in
   * ClubCampus keine `teams`-Zeile zugeordnet ist.
   *
   * ⚠ SIE FEHLTE BIS ZUM 10.09.2026, UND DAS WAR DIE TEURE HAELFTE.
   * `verwaiste_zuordnungen` zaehlt seit jeher unsere Nummern, die der
   * Verband nicht mehr kennt — ein Team, das WEGFAELLT. Ein Team, das
   * DAZUKOMMT, zaehlte niemand.
   *
   * Und genau das passiert jede Saison: ein neuer Jahrgang erscheint beim
   * Verband, seine Spiele werden gesynct (der Filter kommt aus
   * `/api/team/list`, also vom Verband), und dann bleiben sie im EXPORT
   * haengen, weil dort auf `teams.sfv_team_id` gefiltert wird. **Nichts
   * schlaegt fehl. Auf der Website fehlt ein Spielplan, und niemand
   * erfaehrt, warum.**
   *
   * Steht die Zahl ueber 0, ist die Zuordnung unvollstaendig — nachzuholen
   * unter Portalverwaltung → API-Verbindungen → „Teams zuordnen".
   */
  sfv_teams_ohne_zuordnung: number;
  /** Davon aktive — die Zahl, auf die jemand reagieren kann. Siehe
      `zaehleOhneZuordnungGetrennt()`. */
  sfv_teams_ohne_zuordnung_aktiv: number;
  /** Zugeordnete Mannschaften ohne ein einziges Spiel im Lauf — siehe
      `findeTeamsOhneSpiele()`. Namentlich, weil eine Zahl niemanden
      irgendwohin schickt. */
  teams_ohne_spiele: { anzahl: number; teams: string[]; meldepflichtig: boolean };
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
    sfv_teams_ohne_zuordnung: erg.sfv_teams_ohne_zuordnung,
    sfv_teams_ohne_zuordnung_aktiv: erg.sfv_teams_ohne_zuordnung_aktiv,
    teams_ohne_spiele: erg.teams_ohne_spiele,
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

