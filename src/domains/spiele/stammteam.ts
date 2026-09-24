/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/stammteam.ts
   Das Stammteam einer Person: EINE Zeile je Person im Export, statt
   einer je Mannschaft, fuer die sie je aufgestellt war.
   ═══════════════════════════════════════════════════════════════ */

/* ── Warum die Spalte die EINDEUTIGKEIT nennt und nicht den Kader ─────────

   Bestellt waren ursprünglich drei Stufen: (1) das Team, in dessen KADER
   der Verband die Person fuehrt; (2) bei mehreren Kadern das mit den
   meisten Einsaetzen; (3) ohne Kader das mit den meisten Einsaetzen.

   ⚠ DEN KADER ALS MANNSCHAFTSLISTE GIBT ES BEIM VERBAND NICHT.
   Gemessen gegen `docs/sfv/swagger_2026-08-28.json`, und am 24.09.2026 ein
   zweites Mal nachgezaehlt statt aus dem Papier zitiert:

     /api/club/{clubId}/players  → ClubPlayer, 21 Felder.
       Mannschaftskennung: KEINE — kein einziges Feld traegt „team" im
       Namen. Es gibt nur `clubOwnerId`, `clubOwnerName`,
       `clubOwnerNumber`, und das ist der KLUB.
     /api/match/{matchId}/players → Player, 23 Felder.
       Mit `teamId`, `teamName`, `teamFullname`, `isHomeTeam`.

   Nur der SPIELBERICHT nennt eine Mannschaft, und genau den speichern wir
   in `spiel_aufstellung`. Es gibt also keine zweite Quelle: „Kader" und
   „Einsaetze" kaemen aus DERSELBEN Tabelle.

   ⚠ ⚠  UND DARAUS FOLGT, WAS DIE SPALTE SAGEN KANN (Entscheidung Didi,
   24.09.2026). Es gilt IMMER „meiste Einsaetze" — eine Stufe „laut Kader"
   kann es nicht geben, weil die Quelle keinen Kader kennt. Die drei alten
   Kennungen hiessen `kader` · `mehrere_kader` · `kein_kader` und
   behaupteten damit eine Herkunft, die es nicht gibt: genau die
   Beschriftung, die mehr sagt als der Inhalt haelt.

   Was die Spalte stattdessen sagt, ist die EINDEUTIGKEIT der Wahl:

     nur dieses Team    alle Aufstellungszeilen nennen dieselbe Mannschaft
     meiste Einsaetze   mehrere Mannschaften, eine hat STRENG mehr
     Gleichstand        mehrere haben gleich viele — gewaehlt nach der
                        kleineren Team-Id, also willkuerlich
     keine Team-Angabe  keine einzige Zeile nennt eine Mannschaft

   ⚠ DER GLEICHSTAND IST NEU, und er ist keine Umformulierung. Er steckte
   bis zum 24.09.2026 UNSICHTBAR in `mehrere_kader`: eine Mannschaft, die
   allein aus der kleineren Nummer hervorging, war von einer mit klarem
   Vorsprung nicht zu unterscheiden. Genau diese Unterscheidung ist der
   Zweck der Spalte — sie steht jetzt drin statt daneben. */

/* ── Die vierte Kennung, und warum sie eine bleibt ────────────────────────

   Bestellt waren DREI Texte. Es gibt VIER Lagen.

   Eine Person, deren Zeilen ALLE `sfv_team_id = null` tragen, hat keine
   Mannschaft, die genannt werden koennte. Die drei bestellten Texte sagen
   alle etwas darueber, WIE eindeutig die gewaehlte Mannschaft ist — und
   hier ist keine gewaehlt worden. Jeder der drei waere eine Behauptung:

     „nur dieses Team"   es gibt kein Team
     „Gleichstand"       es gab keinen Vergleich
     „meiste Einsaetze"  es wurde nichts gezaehlt

   ⚠ Sie stillschweigend in einen der drei fallen zu lassen ist deshalb
   nicht Sparsamkeit, sondern eine falsche Auskunft in der einen Spalte,
   die die Herkunft der daneben genannten Mannschaft erklaeren soll. Eine
   Person ohne Team ist etwas anderes als eine mit genau einem.

   ⚠ ⚠  UND DER FALL IST ERREICHBAR — gemessen am 24.09.2026 am Code und
   an der Spezifikation, nicht vermutet:

     · `bildeAufstellung` hat genau ZWEI Ausschluesse (`eigen &&
       personId === null`, `!eigen && nummer === null`). Keiner davon
       sieht `teamId` an.
     · `zahl(p.teamId)` in `matchdaten.ts:142` gibt `null`, wenn der Wert
       fehlt oder unlesbar ist.
     · `spiel_aufstellung` hat KEINEN CHECK auf `sfv_team_id`.
     · Das Schema `Player` hat GAR KEINE `required`-Liste — `teamId` ist
       als `integer` deklariert, seine ANWESENHEIT nirgends zugesagt. Ein
       fehlender Schluessel im JSON ergibt `undefined` und damit `null`.

   Ob solche Zeilen im Bestand stehen, ist UNGEMESSEN (die Datenbank ist
   von hier aus ohne Passwort nicht erreichbar); die Abfrage dazu liegt in
   `supabase/abfragen_2026-09-24_stammteam.sql` (Nr. 6). Die Kennung wird
   deshalb getragen und nicht weggelassen — ein moeglicher Zustand von
   heute, kein Vorgriff auf einen kuenftigen Aufrufer.

   ⚠ Der Text heisst `keine Team-Angabe` und nicht „kein Team": die Person
   hat gespielt, es fehlt die ANGABE, fuer wen. Das ist eine fehlende
   Messung und keine Eigenschaft der Person — dieselbe Unterscheidung wie
   `null` gegen `0` bei der Spielzeit eine Ebene tiefer. */

/* ── Drei Entscheidungen, und ihre Gruende ────────────────────────────────

   1 · `spielzeit === null` ZAEHLT ALS EINSATZ.
       `0` ist ein GEMESSENER Wert — der Verband hat ihn geschrieben, und
       `assignmentRoleName = "Kein Einsatz"` steht daneben. `null` ist eine
       FEHLENDE MESSUNG: bei 12 von 14 Trainingsspielen fehlen die Minuten
       ganz (CLAUDE.md, gemessen 11.09.2026), und dort haben die Leute
       gespielt. Ein `null` als „kein Einsatz" zu lesen rechnete echte
       Einsaetze weg.

       ⚠ Und die Entscheidung ist nicht neu, sondern die BESTEHENDE:
       `rolleAus()` in `wpNutzlast.ts:1167` liest `spielzeit === 0` als
       „nicht_eingesetzt" und faellt bei fehlenden Minuten auf „start"
       zurueck. Zwei Stellen, dieselbe Auslegung — haette ich hier anders
       entschieden, waere dieselbe Zeile in der einen Anzeige eingesetzt
       und in der anderen nicht.

       Nebenbei deckt das den einen gemessenen Datenfehler der Quelle mit
       ab: eine Zeile traegt 54/32/-22 (CLAUDE.md, 10.09.2026). Eine
       negative Spielzeit zaehlt damit als Einsatz — und das ist richtig,
       korrigiert sind es 22 Minuten.

   2 · GLEICHSTAND BEI DEN EINSAETZEN → DIE KLEINERE `sfv_team_id`.
       ⚠ Willkuerlich, aber stabil, und genau so gehoert es hingeschrieben:
       es ist KEINE Aussage darueber, welches Team „richtiger" ist. Der
       Grund ist allein die Wiederholbarkeit — zwei Laeufe derselben Daten
       duerfen nicht verschieden ordnen. Ein Export, der bei jedem Druck
       eine andere Mannschaft nennt, ist von einem Fehler nicht zu
       unterscheiden.

       ⚠ ⚠  SEIT DEM 24.09.2026 STEHT DIE WILLKUER IN DER SPALTE. Bis dahin
       war sie nur hier begruendet, und wer die Datei las, konnte eine so
       gewaehlte Mannschaft von einer eindeutigen nicht unterscheiden. Die
       Kennung `gleichstand` ist deshalb keine Verfeinerung, sondern das
       Einloesen genau dieser Zusage.

   3 · ZEILEN OHNE `sfv_team_id` ZAEHLEN BEI DER ZAEHLUNG NICHT MIT.
       Sie sagen nichts ueber eine Mannschaft. Hat eine Person nur solche
       Zeilen, ist das Ergebnis `{ sfv_team_id: null, regel: "ohne_team" }`
       — siehe den Abschnitt zur vierten Kennung. */

export type StammteamRegel =
  | "nur_dieses_team"
  | "meiste_einsaetze"
  | "gleichstand"
  | "ohne_team";

export interface Stammteam {
  sfv_team_id: number | null;
  regel: StammteamRegel;
}

/** Nur diese zwei Felder werden gelesen — absichtlich schmal. Was die
    Regel nicht sieht, kann sie nicht heimlich mitverwenden; und der
    Aufrufer muss keine ganze Aufstellungszeile beschaffen. Beide Namen
    und beide Typen sind die der Spalten in `spiel_aufstellung`.

    ⚠ Und die Rueckennummer gehoert ausdruecklich NICHT dazu, obwohl die
    Excel-Liste sie seit dem 24.09.2026 je Stammteam schneidet: das ist
    eine Frage der AUSGABE, nicht der Wahl der Mannschaft. Sie hier
    mitzufuehren hiesse, der Regel ein Feld zu geben, das sie nicht
    braucht — und dann kann sie es eines Tages mitverwenden. */
export interface StammteamZeile {
  sfv_team_id: number | null;
  spielzeit: number | null;
}

/** Ein Einsatz ist jede Zeile AUSSER der gemessenen Null. Die zwei Zweige
    stehen einzeln da, obwohl `spielzeit !== 0` dasselbe ergaebe: die
    Entscheidung liegt in der Unterscheidung von fehlender Messung und
    Nullwert, und die soll man lesen koennen (siehe Entscheidung 1). */
function istEinsatz(spielzeit: number | null): boolean {
  if (spielzeit === null) return true;
  return spielzeit !== 0;
}

/** Das Stammteam aus den Aufstellungszeilen EINER Person. */
export function bestimmeStammteam(zeilen: StammteamZeile[]): Stammteam {
  /* Einsaetze je Mannschaft. Eine Mannschaft steht hier, sobald sie EINE
     Zeile hat — auch mit null Einsaetzen: dann hat der Verband die Person
     auf einem Spielbericht dieser Mannschaft gefuehrt und sie hat nicht
     gespielt, und das bleibt eine Zugehoerigkeit. */
  const einsaetze = new Map<number, number>();
  for (const z of zeilen) {
    if (z.sfv_team_id === null) continue;
    const bisher = einsaetze.get(z.sfv_team_id) ?? 0;
    einsaetze.set(z.sfv_team_id, bisher + (istEinsatz(z.spielzeit) ? 1 : 0));
  }

  /* ⚠ Eine TOTALE Ordnung, kein Maximum mit Rueckfall. Weil die Teamnummern
     eindeutig sind, ist „meiste Einsaetze, dann kleinste Nummer" fuer je
     zwei Mannschaften entscheidbar — und damit kann die Reihenfolge der
     EINGABE das Ergebnis nicht aendern. Ein `Math.max` mit einem `find`
     danach haette genau diese Eigenschaft nicht. */
  let beste: { id: number; anzahl: number } | null = null;
  for (const [id, anzahl] of einsaetze) {
    if (
      beste === null
      || anzahl > beste.anzahl
      || (anzahl === beste.anzahl && id < beste.id)
    ) {
      beste = { id, anzahl };
    }
  }

  /* `beste === null` heisst genau: keine einzige Zeile mit Mannschaft. */
  if (beste === null) return { sfv_team_id: null, regel: "ohne_team" };

  /* ⚠ ⚠  GEZAEHLT WIRD DER GLEICHSTAND AN DER SPITZE, NICHT IRGENDEINER.
     5 · 2 · 2 ist KEIN Gleichstand fuer die Wahl: die 5 gewinnt streng, und
     was die beiden Zweier untereinander machen, sagt darueber nichts. Wer
     hier „irgendwo gleich viele" zaehlte, meldete Gleichstand fuer eine
     eindeutige Wahl — und die Spalte behauptete eine Willkuer, die es nicht
     gab. Das ist die teurere der beiden Fehlrichtungen: ein Gleichstand, der
     als eindeutig gemeldet wird, faellt niemandem auf; einer, der zu oft
     gemeldet wird, macht die Spalte wertlos. */
  let anDerSpitze = 0;
  for (const anzahl of einsaetze.values()) {
    if (anzahl === beste.anzahl) anDerSpitze += 1;
  }

  /* ⚠ Die Wahl der Mannschaft ist in allen drei Faellen dieselbe — bei
     genau einer ist sie trivial, bei einem Gleichstand willkuerlich.
     Unterschiedlich ist nur, was wir darueber sagen duerfen.

     ⚠ Die Reihenfolge der Zweige ist die Aussage: der Gleichstand gewinnt
     gegen `einsaetze.size === 1` nicht (dort ist `anDerSpitze` immer 1),
     aber gegen „mehrere" schon — sonst verschwaende er wieder in
     `meiste_einsaetze`, so wie bis zum 24.09.2026. */
  return {
    sfv_team_id: beste.id,
    regel: anDerSpitze > 1
      ? "gleichstand"
      : einsaetze.size === 1 ? "nur_dieses_team" : "meiste_einsaetze",
  };
}

/** Die Spalte „Stammteam laut" im Export. Sie sagt, wie EINDEUTIG die
    Mannschaft daneben ist — ohne sie waere eine, die allein aus der
    kleineren Teamnummer hervorging, von einer eindeutigen nicht zu
    unterscheiden.

    ⚠ Der Text lebt NUR hier. `spielerAusgabe.ts` schlaegt ihn erst beim
    Schreiben der Datei nach und fuehrt ihn nicht an der Zeile mit — sonst
    gaebe es zwei Orte, an denen die Formulierung lebt, und sie liefen
    auseinander. */
export const STAMMTEAM_LAUT: Record<StammteamRegel, string> = {
  nur_dieses_team: "nur dieses Team",
  meiste_einsaetze: "meiste Einsätze",
  gleichstand: "Gleichstand",
  ohne_team: "keine Team-Angabe",
};
