-- ═══════════════════════════════════════════════════════════════════════════
-- api_sync_log — Aufbewahrung 14 Tage
-- 11.09.2026
--
-- Entscheidung Didi, 11.09.2026: 14 Tage. Rund 700 Zeilen im Gleichgewicht,
-- also unter der 1000er-Lesegrenze von PostgREST — die Tabelle bleibt damit
-- dauerhaft im unauffaelligen Bereich und taucht im Paging-Waechter nicht
-- mehr auf.
--
--
-- ⚠ ⚠  DER PREIS, UND ER IST AUSDRUECKLICH ANGENOMMEN — NICHT UEBERSEHEN
--
--   Eine Spur wie die 630 Zeilen vom 11.09.2026, die belegten, dass die
--   Aufraeumfunktion NIE GELAUFEN IST, reicht ab jetzt nur noch ZWEI WOCHEN
--   zurueck.
--
--   Das steht hier in derselben Zeile wie die Frist, damit es eine
--   ENTSCHEIDUNG bleibt und nicht als Selbstverstaendlichkeit gelesen wird.
--   (Anweisung Didi, 11.09.2026.) Wer die Frist spaeter kuerzt oder
--   verlaengert, aendert damit, wie weit zurueck sich eine Behauptung ueber
--   die Vergangenheit noch pruefen laesst — und genau das ist an diesem Tag
--   dreimal der Punkt gewesen, an dem eine Untersuchung haengenblieb.
--
--
-- ⚠  DIE ZAHL STEHT AN GENAU EINER STELLE
--
--   Als Vorgabewert des Parameters. Der Zeitplan unten ruft die Funktion
--   OHNE Argument — sonst gaebe es die 14 zweimal, und die zweite kennt
--   niemand. (Didi, 11.09.2026: „zwei Fristen und die zweite kennt
--   niemand.")
--
--
-- ⚠ ⚠  DIE AELTESTE ZEILE JE ANSCHLUSS BLEIBT STEHEN — UND DAS IST KEINE
--       NETTIGKEIT, SONDERN DIE VORAUSSETZUNG
--
--   `wp-export/index.ts:819` liest die AELTESTE Zeile eines Anschlusses:
--
--     .order("gestartet_am", { ascending: true }).limit(1)
--
--   und `wpBestand.ts:96` macht daraus den Anfang des
--   Betrachtungszeitraums. Ohne diese Ausnahme rueckte der Zeitraum mit
--   jedem Aufraeumlauf vor — kein Fehler, keine Meldung, nur ein anderer
--   Bestandsbericht. Dieselbe Familie wie ein leerer catch: aus einer
--   Handlung wird eine Datenlage.
--
--   ⚠ DAMIT ENTFAELLT SCHRITT ① aus docs/vorschlag_api_sync_log.md
--     (`api_verbindungen.erster_lauf` als Spalte). Die Ausnahme loest
--     dasselbe mit einer `where`-Bedingung statt mit einer Migration und
--     einer Codeaenderung. Der Vorschlag wird entsprechend nachgezogen.
--
--
-- ⚠  `returning` STATT `raise notice`
--
--   Der Supabase-SQL-Editor zeigt NOTICE nicht an. Am 10.09.2026 meldete
--   `migration_bench_ausbau.sql` deshalb „Success. No rows returned" und
--   verschwieg die Zahl, die ausdruecklich bestellt war — und die Zeilen
--   waren danach weg und die Zahl nicht mehr herstellbar.
--   **Was eine Migration berichten soll, berichtet sie als Zeile.**
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── VORHER: wie viele trifft der erste Lauf? ──────────────────────────────
-- ⚠ Von Hand ausfuehren, BEVOR der Zeitplan steht. Eine Schwelle gehoert
--   gegen einen echten Fall gehalten, nicht gegen eine Erwartung — und nach
--   dem Loeschen ist die Zahl nicht mehr herstellbar.
--
--   with erste as (
--     select distinct on (verein_id, verbindung_id) id
--       from public.api_sync_log
--      order by verein_id, verbindung_id, gestartet_am
--   )
--   select count(*)                                   as trifft,
--          min(gestartet_am)::date                    as aeltester,
--          max(gestartet_am)::date                    as juengster,
--          count(*) filter (where aktion is null)     as davon_ohne_aktion
--     from public.api_sync_log l
--    where l.gestartet_am < now() - interval '14 days'
--      and l.id not in (select id from erste);


create or replace function public.raeume_sync_log(p_tage int default 14)
returns table (
  geloescht        bigint,
  behalten_erste   bigint,
  verbleibend      bigint,
  aeltester        timestamptz
)
language plpgsql
as $fn$
begin
  return query
  with erste as (
    /* ⚠ Je Verein UND Anschluss die aelteste — nicht global. `verein_id`
       gehoert dazu, sonst naehme der erste Verein dem zweiten seine
       Anfangszeile weg. Dieselbe Regel wie bei jedem Schluessel auf
       Vereinsdaten. */
    select distinct on (verein_id, verbindung_id) id
      from public.api_sync_log
     order by verein_id, verbindung_id, gestartet_am
  ),
  weg as (
    delete from public.api_sync_log l
     where l.gestartet_am < now() - make_interval(days => p_tage)
       and l.id not in (select id from erste)
    returning l.id
  )
  select (select count(*) from weg)::bigint,
         (select count(*) from erste)::bigint,
         (select count(*) from public.api_sync_log)::bigint,
         (select min(gestartet_am) from public.api_sync_log);
end;
$fn$;

comment on function public.raeume_sync_log(int) is
  'Loescht Protokollzeilen aelter als p_tage (Vorgabe 14) und behaelt je '
  '(verein_id, verbindung_id) die aelteste. Die Ausnahme schuetzt '
  'wp-export/index.ts:819, das die aelteste Zeile als Anfang des '
  'Betrachtungszeitraums liest. Gibt EINE Zeile mit vier Zahlen zurueck — '
  'raise notice zeigt der Supabase-Editor nicht an.';

/* ⚠ Sie loescht. Der Zeitplan laeuft als Eigentuemer; sonst soll sie
   niemand rufen koennen. Ohne dieses revoke haette jeder angemeldete
   Benutzer sie ueber RPC zur Verfuegung. */
revoke execute on function public.raeume_sync_log(int) from public;
revoke execute on function public.raeume_sync_log(int) from anon, authenticated;


-- ─── Probelauf, folgenlos ──────────────────────────────────────────────────
-- ⚠ Zeigt die Wirkung, ohne sie zu behalten. `rollback` nimmt das delete
--   mit zurueck.
--
--   begin;
--     select * from public.raeume_sync_log();
--   rollback;
--
-- Zweiter Aufruf danach muss `geloescht = 0` ergeben — sichtbar folgenlos.
