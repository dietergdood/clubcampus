/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/stammteam.ts
   Das Stammteam einer Person: EINE Zeile je Person im Export, statt
   einer je Mannschaft, fuer die sie je aufgestellt war.
   ═══════════════════════════════════════════════════════════════ */

/* ── Was bestellt war, und was daraus messbar ist ─────────────────────────

   Bestellt waren drei Stufen: (1) das Team, in dessen KADER der Verband
   die Person fuehrt; (2) bei mehreren Kadern das mit den meisten
   Einsaetzen; (3) ohne Kader das mit den meisten Einsaetzen.

   ⚠ DEN KADER ALS MANNSCHAFTSLISTE GIBT ES BEIM VERBAND NICHT.
   Gemessen am 24.09.2026 gegen `docs/sfv/swagger_2026-08-28.json`:

     /api/club/{clubId}/players  → ClubPlayer, 21 Felder.
       Mannschaftskennung: KEINE. Es gibt nur `clubOwnerId`,
       `clubOwnerName`, `clubOwnerNumber` — und das ist der KLUB.
     /api/match/{matchId}/players → Player, 23 Felder.
       Mit `teamId`, `teamName`, `teamFullname`.

   Nur der SPIELBERICHT nennt eine Mannschaft, und genau den speichern wir
   in `spiel_aufstellung`. Es gibt also keine zweite Quelle: „Kader" und
   „Einsaetze" kommen aus DERSELBEN Tabelle.

   Die Unterscheidung, die in dieser Tabelle sehr wohl steckt:

     im Kader  → eine Zeile in `spiel_aufstellung`, gleich ob gespielt
     Einsatz   → `spielzeit` ist nicht die gemessene Null

   Damit sind die drei Stufen umsetzbar, ohne dass eine davon etwas
   behauptet, das wir nicht wissen: „Kader" heisst hier „genau eine
   Mannschaft hat sie auf einem Spielbericht gefuehrt".

   ⚠ ⚠ UND STUFE 3 IST ERREICHBAR — anders als im Auftrag angenommen.
   Zwei Wege muss man auseinanderhalten:

     · eine Person OHNE jede Aufstellungszeile. Die kommt in dieser Liste
       nicht vor, WEIL die Menge aus `spiel_aufstellung` stammt. Dieser
       Weg ist zu, und er war der gemeinte.
     · eine Person, deren Zeilen ALLE `sfv_team_id = null` tragen. Dieser
       Weg ist OFFEN: die Spalte ist nullable (`schema.sql`), `zahl(p.teamId)`
       in `matchdaten.ts:142` gibt `null` bei fehlendem oder unlesbarem
       Wert, und die Swagger-Datei deklariert fuer `Player` ueberhaupt
       KEIN Pflichtfeld — `required` fehlt dort ganz.

   Ob es solche Zeilen im Bestand gibt, ist UNGEMESSEN und von hier aus
   nicht messbar (die Datenbank ist ohne Passwort nicht erreichbar).
   Stufe 3 ist damit kein Vorgriff auf einen kuenftigen Aufrufer, sondern
   ein moeglicher Zustand von heute. Sie wird gebaut und nicht
   weggelassen. */

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

   3 · ZEILEN OHNE `sfv_team_id` ZAEHLEN BEI DER KADER-ZAEHLUNG NICHT MIT.
       Sie sagen nichts ueber eine Mannschaft. Hat eine Person nur solche
       Zeilen, ist das Ergebnis `{ sfv_team_id: null, regel: "kein_kader" }`
       — siehe den zweiten Weg oben. */

export type StammteamRegel = "kader" | "mehrere_kader" | "kein_kader";

export interface Stammteam {
  sfv_team_id: number | null;
  regel: StammteamRegel;
}

/** Nur diese zwei Felder werden gelesen — absichtlich schmal. Was die
    Regel nicht sieht, kann sie nicht heimlich mitverwenden; und der
    Aufrufer muss keine ganze Aufstellungszeile beschaffen. Beide Namen
    und beide Typen sind die der Spalten in `spiel_aufstellung`. */
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
     Zeile hat — auch mit null Einsaetzen: dann ist die Person in ihrem
     Kader gefuehrt worden und hat nicht gespielt, und das bleibt eine
     Kaderzugehoerigkeit. */
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
  if (beste === null) return { sfv_team_id: null, regel: "kein_kader" };

  /* Die Wahl der Mannschaft ist in beiden Faellen dieselbe — bei genau
     einer ist sie trivial. Unterschiedlich ist nur, was wir darueber
     sagen duerfen. */
  return {
    sfv_team_id: beste.id,
    regel: einsaetze.size === 1 ? "kader" : "mehrere_kader",
  };
}

/** Die Spalte „Stammteam laut" im Export. Sie sagt, welche Regel gegriffen
    hat — ohne sie waere eine Mannschaft, die aus einem Gleichstand
    hervorgegangen ist, von einer eindeutigen nicht zu unterscheiden. */
export const STAMMTEAM_LAUT: Record<StammteamRegel, string> = {
  kader: "Kader",
  mehrere_kader: "mehrere Kader, meiste Einsätze",
  kein_kader: "kein Kader, meiste Einsätze",
};
