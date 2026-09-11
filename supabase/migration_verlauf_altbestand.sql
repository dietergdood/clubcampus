-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — den mehrfach geholten Verlauf aufräumen
-- 11.09.2026
--
-- ⚠ ⚠  ERST DEN SYNC DEPLOYEN, DANN DIESEN BLOCK.
--
--   Räumt man zuerst auf, legt der nächste stündliche Lauf dieselben Zeilen
--   wieder an — und der Aufräumlauf sähe aus, als hätte er nichts bewirkt.
--   Der Sync ersetzt den SFV-Verlauf seit dem 11.09.2026 je Spiel, statt
--   ihn über `sfv_event_id` zu upserten.
--
-- ── Warum es überhaupt Altbestand gibt ────────────────────────────────────
--
--   `sfv_event_id` ist KEINE Kennung des Ereignisses, sondern eine des
--   Eintrags beim Verband. Wird ein Matchblatt nachträglich berichtigt,
--   bekommt derselbe Vorgang eine neue Nummer — der Upsert findet keinen
--   Konflikt und legt den ganzen Verlauf noch einmal an.
--
--   Gemessen an Spiel 4379006 (29.08., 1:6), das Tor der 37.:
--
--     30038739 · 31.08.    30064899 · 01.09.    30083863 · 11.09.
--
--   Dieselbe Minute, derselbe Typ, dieselbe Person, drei Kennungen. Auf
--   der Website stand jede Verlaufszeile dreifach.
--
-- ⚠ DER CONSTRAINT HAT NIE VERSAGT. Gemessen: 1051 Zeilen, 1051
--   verschiedene (verein_id, sfv_event_id). Er hält genau, was er
--   verspricht. Falsch war die Annahme darüber, WAS eine sfv_event_id ist —
--   dieselbe Klasse wie substitutePlayerId.
--
-- ── Warum der jüngste Abruf ganz gilt ─────────────────────────────────────
--
--   Gemessen am 11.09.2026 über 70 Spiele: jeder Abruf liefert den
--   VOLLSTÄNDIGEN Verlauf, keine Deltas. Bei 4379006 sind es 22 / 22 / 25
--   Zeilen mit je 7 Toren und 10 Wechseln — die drei zusätzlichen im
--   jüngsten sind die Assists, die erst seit dem 11.09. mitkommen.
--
--   Und die Vollständigkeit ist gegen etwas EXTERNES belegt: bei 68 von 70
--   Spielen stimmt die Zahl der Tor-Ereignisse des jüngsten Abrufs exakt
--   gegen das Resultat (3:15 → 18, 0:11 → 11, 9:0 → 9).
--
-- ⚠ DESHALB WIRD NICHT ENTDOPPELT, SONDERN ERSETZT. Ein fachlicher
--   Schlüssel (Minute, Typ, Person) hätte eine echte Doppelung verschluckt:
--   ein Gegner mit der Nummer 9 hat in der 69. ZWEI Tore erzielt, in EINEM
--   Abruf, und nichts, was wir führen, unterscheidet die beiden Zeilen.
--   **Was man nicht entdoppelt, kann man nicht fälschlich entdoppeln.**
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1 · VORHER MESSEN ────────────────────────────────────────────────────
--
-- ⚠ Die Zahl gehört VOR die Änderung. Danach ist sie nicht mehr
--   herstellbar — und „Success. No rows returned" sagt nichts (10.09.2026).

select count(*)                                   as zeilen_gesamt,
       count(*) filter (where herkunft = 'sfv')   as sfv_zeilen,
       count(*) filter (where herkunft = 'verein') as vereinszeilen
  from public.spiel_ereignisse;

-- Erwartung am 11.09.2026: 1051 · 1051 · 0.


-- ─── 2 · WAS WEGGEHT, BEVOR ES WEGGEHT ────────────────────────────────────

select s.sfv_match_id, s.datum, s.gegner,
       count(*)                                    as zeilen,
       count(distinct e.zuletzt_synchronisiert)    as abrufe,
       min(e.zuletzt_synchronisiert)               as aeltester,
       max(e.zuletzt_synchronisiert)               as juengster,
       count(*) filter (
         where e.zuletzt_synchronisiert
             < (select max(e2.zuletzt_synchronisiert)
                  from public.spiel_ereignisse e2
                 where e2.spiel_id = e.spiel_id
                   and e2.herkunft = 'sfv'))       as faellt_weg
  from public.spiele s
  join public.spiel_ereignisse e on e.spiel_id = s.id
 where e.herkunft = 'sfv'
 group by 1, 2, 3
having count(distinct e.zuletzt_synchronisiert) > 1
 order by faellt_weg desc;

-- Erwartung: genau EIN Spiel (4379006) mit drei Abrufen.


-- ─── 3 · DER SCHNITT ──────────────────────────────────────────────────────
--
-- ⚠ EINE EINZIGE ANWEISUNG, mit `returning` — kein `begin/commit`, kein
--   `raise notice`. Der Supabase-Editor zeigt `notice` nicht an, und eine
--   Änderung ohne `returning` meldet „Success" und verschweigt, was sie
--   getan hat (10.09.2026, zweimal an einem Tag).
--
-- ⚠ ÜBER DEN EXAKTEN ZEITSTEMPEL, NICHT ÜBER DAS DATUM. `jetzt` wird in
--   matchdatenLauf.ts EINMAL JE LAUF berechnet — alle Zeilen eines Abrufs
--   tragen denselben Wert auf die Millisekunde. Mit `::date` verschmölzen
--   zwei Läufe desselben Tages, und genau das ist vorgekommen: der
--   Nachhol-Lauf um 00:44 und der reguläre um 01:17 sind beide der 11.09.
--
-- ⚠ NUR `herkunft = 'sfv'`. Vereinszeilen sind Eingaben von Menschen.

delete from public.spiel_ereignisse e
 where e.herkunft = 'sfv'
   and e.zuletzt_synchronisiert
     < (select max(e2.zuletzt_synchronisiert)
          from public.spiel_ereignisse e2
         where e2.spiel_id = e.spiel_id
           and e2.herkunft = 'sfv')
returning e.spiel_id, e.sfv_event_id, e.minute, e.typ,
          e.zuletzt_synchronisiert;

-- Erwartung: rund 44 Zeilen (22 + 22 aus den zwei älteren Abrufen von
-- 4379006). ⚠ Kommen NULL zurück, hat die Bedingung niemanden getroffen —
-- und das ist eine Auskunft, keine Bestätigung.


-- ─── 4 · GEGENPROBE ───────────────────────────────────────────────────────

select count(*)                                as zeilen,
       count(distinct spiel_id)                as spiele,
       count(distinct (spiel_id, zuletzt_synchronisiert)) as spiel_abruf_paare
  from public.spiel_ereignisse
 where herkunft = 'sfv';

-- ⚠ `zeilen` sollte um die gelöschte Zahl gesunken sein, und
--   `spiele` = `spiel_abruf_paare`: je Spiel genau EIN Abruf. Sind die
--   beiden ungleich, steht noch ein mehrfach geholtes Spiel da.


-- ─── 5 · UND WAS DANACH GILT ──────────────────────────────────────────────
--
-- ⚠ ZWEI SPIELE FÜHREN EINEN LEEREN VERLAUF BEI VORHANDENEM RESULTAT —
--   gemessen am 11.09.2026, und sie sind KEIN Fehler dieser Migration:
--
--     4395740   28.08.   1:6   0 Tor-Ereignisse
--     4375665   29.08.   1:5   1 Tor-Ereignis
--
--   Der Verband führt dort den Verlauf nicht. Auf der Website erscheinen
--   diese Spiele mit Resultat und leerer Verlaufsliste. Das ist eine
--   Datenlage und kein Ausfall — festgehalten, damit es beim nächsten Mal
--   niemand für einen hält.
