-- ═══════════════════════════════════════════════════════════════════════════
-- SFV CLUB API — Teil B: Vorbereitung des Sync
-- 14.08.2026
--
-- Zwei Aenderungen, beide klein, beide noetig BEVOR die Edge Function
-- sfv-sync um `spielplan` und `rangliste` erweitert wird.
--
--   A  api_verbindungen.sync_laeuft_seit   — Laufsperre
--   B  sync_felder: ht_resultat von 'sfv' nach 'verein'
--
-- Voraussetzung: migration_sfv_spielplan.sql ist gelaufen (Zeile football_ch
-- existiert, sonst greift Block B ins Leere).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── A ─ Laufsperre ────────────────────────────────────────────────────────
-- Die SFV-API kennt pro Anwendung genau EINEN gueltigen Token; ein zweiter
-- POST /api/token macht den ersten sofort ungueltig (am 13.08.2026 gemessen).
-- Zwei gleichzeitige Laeufe schiessen einander also ab. Bisher gibt es keine
-- Spalte, mit der sich ein Lauf ATOMAR beanspruchen laesst: sync_status
-- pruefen und danach setzen sind zwei Schritte, und dazwischen passt ein
-- zweiter Lauf.
--
-- Mit dieser Spalte wird es ein einziges Statement:
--
--   update api_verbindungen set sync_laeuft_seit = now()
--    where key = 'football_ch'
--      and (sync_laeuft_seit is null
--           or sync_laeuft_seit < now() - interval '15 minutes')
--   returning id;
--
-- Kommt nichts zurueck, laeuft schon einer — die Funktion bricht ab, ohne
-- Log-Eintrag. Das Zeitfenster loest Sperren abgestuerzter Laeufe, die sie
-- nicht selbst loesen konnten. Ein Lauf dauert wenige Sekunden; 15 Minuten
-- sind grosszuegig und trotzdem kuerzer als das stuendliche Intervall.
--
-- MANDANTENFAEHIGKEIT: die Sperre haengt an der Zeile, also am Verein. Das
-- ist richtig, solange jeder Verein eigene SFV-Zugangsdaten hat — dann hat
-- er auch seinen eigenen Token. Teilten sich zwei Vereine einen Schluessel,
-- braeuchte es eine Sperre ueber alle Zeilen. Beim Anschluss des zweiten
-- Vereins pruefen.

alter table public.api_verbindungen
  add column if not exists sync_laeuft_seit timestamptz;

comment on column public.api_verbindungen.sync_laeuft_seit is
  'Zeitpunkt, zu dem der laufende Sync die Sperre beansprucht hat. NULL = kein Lauf. Aeltere Eintraege als 15 Minuten gelten als abgestuerzt und werden ueberschrieben.';


-- ─── B ─ ht_resultat gehoert dem Verein, nicht dem SFV ─────────────────────
-- Korrektur an der Feldhoheit vom 14.08.2026. ht_resultat stand in der
-- sfv-Liste, aber /api/club/schedule liefert GAR KEINE Halbzeit —
-- nachgeprueft an der echten Antwort, das Feld existiert dort nicht. Es
-- steht nur in /api/match/{matchId} unter intermediateResults, und das
-- waeren 268 zusaetzliche Aufrufe pro Lauf, stuendlich.
--
-- Bliebe die Deklaration stehen, schriebe der Sync stuendlich NULL ueber
-- eine von Hand erfasste Halbzeit — genau der Schaden, gegen den die
-- Feldhoheit gebaut wurde.
--
-- Danach: 20 SFV-Felder, 1 abgeleitet, 8 Verein.
--
-- Das `where` macht die Anweisung wiederholbar: ist ht_resultat schon
-- umgezogen, passiert nichts.

update public.api_verbindungen a
   set sync_felder = jsonb_set(
         a.sync_felder,
         '{spiele}',
         (a.sync_felder->'spiele') || jsonb_build_object(
           'sfv',    (select jsonb_agg(v)
                        from jsonb_array_elements(a.sync_felder->'spiele'->'sfv') v
                       where v <> '"ht_resultat"'::jsonb),
           'verein', (a.sync_felder->'spiele'->'verein') || '["ht_resultat"]'::jsonb,
           '_regel_ht_resultat',
             'Nicht wieder in die sfv-Liste aufnehmen. Der Spielplan-Endpunkt liefert keine Halbzeit; sie steht nur in /api/match/{matchId}, also ein Aufruf je Spiel. Als SFV-Feld deklariert wuerde sie stuendlich mit NULL ueberschrieben.'
         )),
       updated_at = now()
 where a.key = 'football_ch'
   and a.sync_felder->'spiele'->'sfv' @> '["ht_resultat"]'::jsonb;

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Eine Abfrage, ein Ergebnis. Alle sieben Zeilen muessen 'ok' zeigen.

with p(nr, pruefung, erwartet, gefunden) as (values
  (1, 'Spalte sync_laeuft_seit',      1::bigint, (select count(*) from information_schema.columns
                                                   where table_schema='public' and table_name='api_verbindungen'
                                                     and column_name='sync_laeuft_seit')),
  (2, 'Feldhoheit sfv (20)',         20, (select jsonb_array_length(sync_felder->'spiele'->'sfv')
                                            from public.api_verbindungen where key='football_ch')),
  (3, 'Feldhoheit abgeleitet (1)',    1, (select jsonb_array_length(sync_felder->'spiele'->'abgeleitet')
                                            from public.api_verbindungen where key='football_ch')),
  (4, 'Feldhoheit verein (8)',        8, (select jsonb_array_length(sync_felder->'spiele'->'verein')
                                            from public.api_verbindungen where key='football_ch')),
  (5, 'ht_resultat NICHT bei sfv',    0, (select count(*) from public.api_verbindungen
                                           where key='football_ch' and sync_felder->'spiele'->'sfv' @> '["ht_resultat"]'::jsonb)),
  (6, 'ht_resultat beim Verein',      1, (select count(*) from public.api_verbindungen
                                           where key='football_ch' and sync_felder->'spiele'->'verein' @> '["ht_resultat"]'::jsonb)),
  (7, 'keine Spalte doppelt',         0, (select count(*) from public.api_verbindungen a
                                           cross join lateral jsonb_array_elements_text(
                                             (a.sync_felder->'spiele'->'sfv')||(a.sync_felder->'spiele'->'abgeleitet')) as f(feld)
                                           where a.key='football_ch'
                                             and f.feld in (select jsonb_array_elements_text(a.sync_felder->'spiele'->'verein')))),
  (8, 'alle Spalten existieren',      0, (select count(*) from public.api_verbindungen a
                                           cross join lateral jsonb_array_elements_text(
                                             (a.sync_felder->'spiele'->'sfv')||(a.sync_felder->'spiele'->'abgeleitet')
                                             ||(a.sync_felder->'spiele'->'verein')) as f(feld)
                                           where a.key='football_ch'
                                             and not exists (select 1 from information_schema.columns c
                                                              where c.table_schema='public' and c.table_name='spiele'
                                                                and c.column_name=f.feld)))
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- begin;
--   update public.api_verbindungen a
--      set sync_felder = jsonb_set(a.sync_felder, '{spiele}',
--            (a.sync_felder->'spiele') - '_regel_ht_resultat' || jsonb_build_object(
--              'sfv',    (a.sync_felder->'spiele'->'sfv') || '["ht_resultat"]'::jsonb,
--              'verein', (select jsonb_agg(v)
--                           from jsonb_array_elements(a.sync_felder->'spiele'->'verein') v
--                          where v <> '"ht_resultat"'::jsonb)))
--    where a.key = 'football_ch';
--   alter table public.api_verbindungen drop column if exists sync_laeuft_seit;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Strukturaenderung — Dump UND Typen nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   Zaehlprobe: CREATE TABLE / POLICY / INDEX / ADD CONSTRAINT alle +/- 0.
--   Es kommt nur eine Spalte und ein Kommentar dazu.
--
-- NOCH NICHT HIER: der Zeitplan.
--   pg_cron und pg_net sind in diesem Projekt NICHT installiert (vorhanden
--   sind nur pg_stat_statements, pgcrypto, supabase_vault). Beide muessen im
--   Supabase-Dashboard unter Database -> Extensions aktiviert werden, und der
--   cron.schedule-Eintrag kommt erst, wenn die Edge Function deployt und von
--   Hand einmal erfolgreich gelaufen ist. Einen stuendlichen Auftrag auf eine
--   Funktion zu legen, die noch nie lief, erzeugt nur stuendliche Fehler.
--   Das Secret fuer X-Sync-Key gehoert dann in supabase_vault, nicht in den
--   cron-Befehl — der steht sonst im Klartext in cron.job.
-- ═══════════════════════════════════════════════════════════════════════════
