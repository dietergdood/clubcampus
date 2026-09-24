/* ════════════════════════════════════════════════════════════════
   Stammteam und Rueckennummer — die Zahlen zum Umbau des Excel-Exports
   Angelegt am 24.09.2026. LESEND, aendert nichts.

   Anlass: der Export fuehrt jede Person unter JEDER Mannschaft, fuer die sie
   je gespielt hat. Er soll eine Zeile je Person unter ihrem Stammteam
   fuehren. Vier Zahlen entscheiden, wie gross die Frage ist — und eine
   davon entscheidet, ob eine bestellte Spalte ueberhaupt Inhalt hat.

   ⚠ Jede Zahl gehoert mit ihrem Datum zitiert. Eine Zahl aus einem
     Dokument ist eine Messung von damals, keine Auskunft ueber heute.
   ════════════════════════════════════════════════════════════════ */

/* ── 1 · Traegt die Spalte „Rueckennummer" ueberhaupt Inhalt? ────────────

   ⚠ DIE SPALTE FEHLT NICHT. Sie steht seit der ersten Fassung in
   `MANNSCHAFTSLISTE_SPALTEN` — ueber die Git-Historie gemessen am
   24.09.2026, in beiden Fassungen. Wenn sie in der Datei leer aussieht,
   ist `rueckennr` auf den Zeilen null, und das ist eine Datenlage.

   ⚠ „Spalte fehlt" und „Spalte ist leer" sehen in einer Tabelle gleich
   aus — dieselbe Ununterscheidbarkeit wie „gescheitert" gegen „nichts zu
   tun". Diese Abfrage trennt sie. */
select count(*)                                             as zeilen,
       count(a.rueckennr)                                   as mit_nummer,
       count(*) - count(a.rueckennr)                         as ohne_nummer,
       round(100.0 * count(a.rueckennr) / nullif(count(*), 0), 1) as anteil_prozent
  from public.spiel_aufstellung a
 where a.ist_eigener;

/* ── 2 · Wie viele Personen laufen in mehr als einer Mannschaft auf? ────

   Das ist die Menge, fuer die die Stammteam-Regel ueberhaupt etwas
   entscheidet. Bei genau einer Mannschaft ist die Antwort trivial.
   Der Wert im Testkommentar lautet „27 von 287" — zu pruefen. */
select anzahl_teams, count(*) as personen
  from (
    select a.sfv_person_id, count(distinct a.sfv_team_id) as anzahl_teams
      from public.spiel_aufstellung a
     where a.ist_eigener and a.sfv_team_id is not null
     group by a.sfv_person_id
  ) t
 group by anzahl_teams
 order by anzahl_teams;

/* ── 3 · ⚠ Wo weichen Maske und Export voneinander ab? ───────────────

   Die Maske zeigt eine Person unter dem Team ihrer ERSTEN Aufstellungszeile
   (`offeneZuordnungen`, Reihenfolge `.order("id")`, also Einfuegereihenfolge).
   Der Export nimmt kuenftig das Team mit den MEISTEN EINSAETZEN.

   ⚠ Wo die zwei auseinandergehen, ist eine Person in der Maske unter Team A
   sichtbar und nur ueber das Kaestchen von Team B in die Datei zu bekommen.
   Das ist die Folge, die der Umbau erzeugt — sie ist gewollt (die Vorgabe
   nennt das Stammteam), aber ihre GROESSE gehoert gemessen und nicht
   geschaetzt.

   `spielzeit is distinct from 0` liest ein null als Einsatz: 0 ist ein
   gemessener Wert, null eine fehlende Messung. */
with erste as (
  select distinct on (a.sfv_person_id)
         a.sfv_person_id, a.sfv_team_id as team_maske
    from public.spiel_aufstellung a
   where a.ist_eigener and a.sfv_team_id is not null
   order by a.sfv_person_id, a.id
),
je_team as (
  /* ⚠ Erst je (Person, Team) zaehlen. Ein `a.id` in der Gruppierung machte
     aus jeder Zeile ihre eigene Gruppe, und `count(*)` waere ueberall 1 —
     die Auswahl „meiste Einsaetze" traefe dann die kleinste Team-Id und
     saehe trotzdem plausibel aus. So war diese Abfrage zuerst gebaut. */
  select a.sfv_person_id, a.sfv_team_id,
         count(*) filter (where a.spielzeit is distinct from 0) as einsaetze
    from public.spiel_aufstellung a
   where a.ist_eigener and a.sfv_team_id is not null
   group by a.sfv_person_id, a.sfv_team_id
),
meiste as (
  select distinct on (sfv_person_id)
         sfv_person_id, sfv_team_id as team_export, einsaetze
    from je_team
   order by sfv_person_id, einsaetze desc, sfv_team_id
)
select count(*)                                              as personen,
       count(*) filter (where e.team_maske = m.team_export)  as gleich,
       count(*) filter (where e.team_maske <> m.team_export)  as weicht_ab
  from erste e join meiste m using (sfv_person_id);

/* ── 4 · Der Gleichstand, der die Regel nicht beantwortet ─────────────

   Personen, die in mehreren Mannschaften stehen und in keiner einen
   gemessenen Einsatz haben (ueberall `spielzeit = 0`). Fuer sie ist
   „das mit den meisten Einsaetzen" nicht definiert, und es braucht einen
   Stichentscheid.

   ⚠ Entschieden ist: die kleinere `sfv_team_id`. Willkuerlich, aber STABIL
   — zwei Laeufe derselben Daten duerfen nicht verschieden ordnen. Es ist
   keine Aussage darueber, welches Team richtiger ist.

   Ist die Zahl 0, ist der Stichentscheid heute folgenlos. ⚠ Eine Datenlage
   ist keine Absicherung: 156 von 2282 Zeilen trugen am 10.09.2026 0/0/0. */
select count(*) as personen_ohne_jeden_einsatz_in_mehreren_teams
  from (
    select a.sfv_person_id
      from public.spiel_aufstellung a
     where a.ist_eigener and a.sfv_team_id is not null
     group by a.sfv_person_id
    having count(distinct a.sfv_team_id) > 1
       and count(*) filter (where a.spielzeit is distinct from 0) = 0
  ) t;

/* ── 5 · Zur Kontrolle: die Spalte, die es beim Verband NICHT gibt ─────

   ⚠ KEINE ABFRAGE — ein Vermerk, damit niemand danach sucht.

   Die Regel nennt „das Team, in dessen Kader (/players) der Verband die
   Person fuehrt". Gemessen am 24.09.2026 gegen
   `docs/sfv/swagger_2026-08-28.json`:

     /api/club/{clubId}/players  -> Schema ClubPlayer, 21 Felder,
                                    KEINE Mannschaftskennung. Nur
                                    clubOwnerId/Name/Number, also der Klub.
     /api/match/{matchId}/players -> Schema Player, 23 Felder, MIT teamId.

   Es gibt also keinen Kader je Mannschaft. Nur der Spielbericht nennt eine
   Mannschaft, und genau den speichert `spiel_aufstellung`. „Kader" und
   „Einsaetze" kommen aus DERSELBEN Tabelle — der Fall „steht in keinem
   Kader" kann fuer diese Menge nicht eintreten, weil jede Person hier steht,
   WEIL sie eine Aufstellungszeile hat.

   Was es sehr wohl gibt, ist die Unterscheidung „auf dem Spielbericht"
   (eine Zeile) gegen „gespielt" (`spielzeit > 0`) — darauf ruht die
   umgesetzte Regel. */

/* ── 6 · ⚠ Eigene Zeilen OHNE Team-Id — der Fall „kein Kader" ──────────

   ⚠ HIER STAND IN `spielerAusgabe.ts`, DER FALL SEI FOLGENLOS, WEIL
   `bildeAufstellung` OHNE TEAM-ID KEINE ZEILE SCHREIBT. Das ist falsch,
   gemessen am 24.09.2026 am Code:

     • `bildeAufstellung` hat genau ZWEI Ausschluesse — `eigen &&
       personId === null` und `!eigen && nummer === null`. Keiner davon
       sieht `teamId` an.
     • `zahl(p.teamId)` gibt `null`, wenn der Wert fehlt oder leer ist.
     • `spiel_aufstellung` hat keinen CHECK auf `sfv_team_id`; der eine
       CHECK betrifft `sfv_person_id`/`name` fremder Zeilen.
     • Das Schema `Player` der Swagger-Datei hat GAR KEINE `required`-Liste
       — `teamId` ist als `integer` deklariert, seine ANWESENHEIT aber
       nirgends zugesagt. Ein fehlender Schluessel im JSON ergibt
       `undefined` und damit `null`.

   Eine eigene Zeile ohne Team-Id wird also geschrieben. Steht eine Person
   NUR mit solchen Zeilen da, ist ihr Stammteam `null` und die Regel
   „kein Kader, meiste Einsaetze" greift — der Fall ist erreichbar, nicht
   strukturell unmoeglich.

   ⚠ Ein Kommentar, der eine andere Stelle zusichert, ist eine Behauptung
   ohne Pruefung — und wer ihn liest, prueft erst recht nicht nach. Diese
   Abfrage sagt, ob der Fall im Bestand steht. Ist sie 0, ist er heute
   folgenlos; eine Datenlage ist keine Absicherung. */
select count(*)                                              as zeilen_ohne_team,
       count(distinct a.sfv_person_id)                        as personen_betroffen,
       (select count(*) from (
          select b.sfv_person_id from public.spiel_aufstellung b
           where b.ist_eigener group by b.sfv_person_id
          having count(b.sfv_team_id) = 0
        ) t)                                                  as personen_NUR_ohne_team
  from public.spiel_aufstellung a
 where a.ist_eigener and a.sfv_team_id is null;
