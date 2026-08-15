-- ═══════════════════════════════════════════════════════════════════════════
-- SFV CLUB API — Zeitplan
-- 15.08.2026
--
-- Ruft die Edge Function sfv-sync stuendlich auf.
--
-- ⚠ DIESER AUFTRAG STEHT IN KEINEM DUMP.
--   cron.job liegt im Schema `cron`, nicht in `public` —
--   `supabase db dump` erfasst ihn also nicht, genau wie die Trigger auf
--   auth.users (supabase/auth_triggers.sql) und die Realtime-Publication.
--   Wer die Datenbank nachbaut, muss diese Datei von Hand einspielen,
--   sonst laeuft der Sync nie wieder und niemand merkt es: die Anzeige
--   zeigt schlicht den Stand vom Tag des Nachbaus.
--
-- VORAUSSETZUNGEN
--   1. Extensions pg_cron und pg_net aktiviert
--      (Dashboard → Database → Extensions)
--   2. Edge Function sfv-sync deployt
--   3. Secrets gesetzt, inkl. SFV_SYNC_KEY
--   4. Mindestens ein Lauf von Hand war erfolgreich — einen stuendlichen
--      Auftrag auf eine Funktion zu legen, die noch nie lief, erzeugt nur
--      stuendliche Fehler.
--
-- WARUM MINUTE 17
--   Zur vollen Stunde klopfen alle Vereine gleichzeitig beim SFV an.
--   Willst du nachts sparen: '17 5-23 * * *' spart ein Viertel der
--   Aufrufe, ohne dass etwas fehlt.
--
-- WARUM DER SCHLUESSEL AUS DEM VAULT KOMMT
--   cron.job.command steht im Klartext in der Datenbank und ist fuer
--   jeden mit Zugang lesbar. Der Befehl holt den Ausweis deshalb zur
--   Laufzeit aus dem Vault, statt ihn zu enthalten.
-- ═══════════════════════════════════════════════════════════════════════════

do $cron$
declare gefunden int;
begin
  -- Voraussetzungen zuerst, sonst scheitert es weiter unten unverstaendlich.
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron ist nicht aktiviert (Dashboard → Database → Extensions)';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'pg_net ist nicht aktiviert (Dashboard → Database → Extensions)';
  end if;

  -- Ausweis des Zeitplans. Liegt er schon im Vault (z.B. ueber die
  -- Dashboard-Oberflaeche gesetzt), bleibt er unangetastet.
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_key') then
    perform vault.create_secret('HIER_DEIN_SFV_SYNC_KEY', 'sfv_sync_key',
                                'Ausweis des Zeitplans gegenueber der Edge Function sfv-sync');
  end if;

  -- cron.schedule ersetzt einen gleichnamigen Auftrag, ist also wiederholbar.
  perform cron.schedule(
    'sfv-sync-stuendlich',
    '17 * * * *',
    $job$
      select net.http_post(
        url     := 'https://otiyvvxoqghtkcgsjmrv.supabase.co/functions/v1/sfv-sync',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'X-Sync-Key', (select decrypted_secret from vault.decrypted_secrets
                                     where name = 'sfv_sync_key')),
        body    := '{"aktion":"sync"}'::jsonb,
        timeout_milliseconds := 120000);
    $job$);

  select count(*) into gefunden from cron.job where jobname = 'sfv-sync-stuendlich';
  if gefunden <> 1 then raise exception 'UNVOLLSTAENDIG: cron-Auftrag nicht angelegt'; end if;
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_key')
  then raise exception 'UNVOLLSTAENDIG: sfv_sync_key nicht im Vault'; end if;

  raise notice 'Zeitplan steht: stuendlich zur Minute 17.';
end $cron$;


-- ─── Nachschauen ───────────────────────────────────────────────────────────
-- Der Auftrag selbst:
--   select jobid, schedule, active from cron.job where jobname = 'sfv-sync-stuendlich';
--
-- Die letzten Ausfuehrungen des Auftrags (ob er ueberhaupt lief):
--   select start_time, status, return_message
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'sfv-sync-stuendlich')
--    order by start_time desc limit 10;
--
-- Was der Sync dabei getan hat (das ist die aussagekraeftigere Sicht):
--   select gestartet_am, beendet_am, status, datensaetze_neu,
--          datensaetze_aktualisiert, meldung
--     from api_sync_log order by gestartet_am desc limit 10;
--
-- Achtung, zwei verschiedene Fehlerquellen: cron.job_run_details sagt, ob der
-- HTTP-Aufruf abgesetzt wurde; api_sync_log sagt, ob der Lauf gelang. Ein
-- gruenes job_run_details bei leerem api_sync_log heisst, dass die Funktion
-- den Aufruf abgelehnt hat — meist ein falscher X-Sync-Key oder auto_sync
-- steht auf false.


-- ─── Abstellen ─────────────────────────────────────────────────────────────
-- select cron.unschedule('sfv-sync-stuendlich');
