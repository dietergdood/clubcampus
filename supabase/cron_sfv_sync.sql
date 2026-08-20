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
--
--
-- ⚠ ZWEI AUSWEISE, ZWEI VERSCHIEDENE AUFGABEN (Nachtrag 21.08.2026)
--
--   sfv_sync_key       das SCHLOSS. Die Function vergleicht ihn mit
--                      SFV_SYNC_KEY und schaltet damit den Zeitplan-Pfad
--                      frei (`perZeitplan`). Er autorisiert.
--   sfv_sync_anon_key  der TUERSTEHER. Supabase prueft am Gateway einen
--                      Authorization-Header, BEVOR die Function ueberhaupt
--                      startet (`verify_jwt` steht auf dem Standard true).
--                      Er autorisiert NICHTS.
--
--   Deshalb der Publishable-/Anon-Key und NICHT der Service-Role-Key: der
--   Anon-Key ist ohnehin oeffentlich (er steckt im Frontend-Bundle), der
--   Service-Role-Key haette volle Rechte an allem und braechte keinerlei
--   Zugewinn — die Function liest ihn im Zeitplan-Pfad gar nicht:
--
--     const perZeitplan = Boolean(syncKey && syncKey === erwarteterSyncKey);
--     if (!perZeitplan) { if (!authHeader) return 401; … }
--
--   Stimmt X-Sync-Key, wird der Authorization-Zweig uebersprungen.
--
--
-- ⚠ WAS AM 20./21.08.2026 PASSIERT IST
--
--   Der Befehl schickte X-Sync-Key und KEINEN Authorization-Header. Jeder
--   stuendliche Aufruf kam mit 401 UNAUTHORIZED_NO_AUTH_HEADER zurueck —
--   14 Stunden lang, ohne dass es jemand merkte:
--
--     cron.job_run_details  succeeded, „1 row"   ← nur: Anfrage abgesetzt
--     net._http_response    401                  ← die Antwort, und nur hier
--     api_sync_log          keine neue Zeile     ← sieht aus wie „nichts zu tun"
--
--   Die Verwechslung von „abgesetzt" mit „geklappt" steht seither auch in
--   CLAUDE.md.
--
--
-- ⚠ WARUM Authorization UND apikey
--
--   Supabase akzeptiert beide; welcher genuegt, haengt am Format des
--   Schluessels (`sb_publishable_…` ist das neue). Beide zu schicken kostet
--   nichts und erspart einen zweiten Anlauf, bei dem man wieder eine Stunde
--   auf Minute 17 wartet.
--
--   BLEIBT ES TROTZDEM BEI 401, liegt es nicht am Header, sondern am WERT:
--   dann steht im Vault unter `sfv_sync_anon_key` nicht der Publishable-Key
--   aus `.env.local` (VITE_SUPABASE_ANON_KEY). Anweisung 1 unten noch einmal
--   mit dem richtigen Wert ausfuehren — `vault.update_secret`, nicht
--   `create_secret`.
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

  /* ⚠ ABBRECHEN statt einen Platzhalter anzulegen. Bis zum 21.08.2026 stand
     hier `create_secret('HIER_DEIN_SFV_SYNC_KEY', …)` — wer den Block auf
     einer frischen Datenbank laufen liess, bekam ein Secret mit dem
     Platzhalter als Wert, einen gruenen Auftrag und stuendliche 401er. Ein
     Fehlschlag, der wie ein Erfolg aussieht.

     Beide Ausweise setzt der Mensch, nicht dieses Skript — sie stehen
     nirgends im Repo. */
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_key') then
    raise exception 'ABBRUCH: sfv_sync_key fehlt im Vault. Erst Anweisung 1 unten (mit dem Wert aus den Function-Secrets), dann diesen Block.';
  end if;
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_anon_key') then
    raise exception 'ABBRUCH: sfv_sync_anon_key fehlt im Vault. Erst Anweisung 1 unten (Wert = VITE_SUPABASE_ANON_KEY aus .env.local), dann diesen Block.';
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
                     -- Tuersteher: kommt am Gateway vorbei, autorisiert nichts.
                     'Authorization', 'Bearer ' || (select decrypted_secret
                                                      from vault.decrypted_secrets
                                                     where name = 'sfv_sync_anon_key'),
                     'apikey', (select decrypted_secret from vault.decrypted_secrets
                                 where name = 'sfv_sync_anon_key'),
                     -- Schloss: schaltet den Zeitplan-Pfad der Function frei.
                     'X-Sync-Key', (select decrypted_secret from vault.decrypted_secrets
                                     where name = 'sfv_sync_key')),
        body    := '{"aktion":"sync"}'::jsonb,
        timeout_milliseconds := 120000);
    $job$);

  select count(*) into gefunden from cron.job where jobname = 'sfv-sync-stuendlich';
  if gefunden <> 1 then raise exception 'UNVOLLSTAENDIG: cron-Auftrag nicht angelegt'; end if;
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_key')
  then raise exception 'UNVOLLSTAENDIG: sfv_sync_key nicht im Vault'; end if;
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_anon_key')
  then raise exception 'UNVOLLSTAENDIG: sfv_sync_anon_key nicht im Vault'; end if;
  if (select command from cron.job where jobname = 'sfv-sync-stuendlich') not ilike '%authorization%'
  then raise exception 'UNVOLLSTAENDIG: der Befehl traegt keinen Authorization-Header — genau der Fehler vom 20.08.2026'; end if;

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
-- ⚠ DIE ANTWORT DES AUFRUFS — die Tabelle, die am 20.08.2026 gefehlt hat:
--   select status_code, left(content,120) as antwort,
--          created at time zone 'Europe/Zurich' as zeit
--     from net._http_response order by created desc limit 5;
--
-- DREI Quellen, drei verschiedene Aussagen:
--   cron.job_run_details   wurde die Anfrage ABGESETZT? („succeeded" heisst
--                          nur das — nicht, dass jemand geantwortet hat)
--   net._http_response     was kam ZURUECK? 401 = Gateway, 5xx = Function
--   api_sync_log           hat der LAUF etwas getan?
--
-- Ein gruenes job_run_details bei leerem api_sync_log heisst NICHT
-- automatisch „falscher X-Sync-Key". Erst net._http_response unterscheidet:
--   401  am Gateway abgewiesen — Authorization/apikey fehlt oder ist falsch
--   200 und trotzdem keine Zeile in api_sync_log — dann die Function:
--        falscher X-Sync-Key, auto_sync auf false, oder Laufsperre
--        (api_verbindungen.sync_laeuft_seit)
--
-- ⚠ net._http_response reicht nur WENIGE STUNDEN zurueck — pg_net raeumt
--   selbst auf. Sie sagt, ob es JETZT klemmt, nie seit wann. Dafuer sind
--   api_sync_log und api_verbindungen.letzter_sync die Quelle.


-- ─── Abstellen ─────────────────────────────────────────────────────────────
-- select cron.unschedule('sfv-sync-stuendlich');


-- ═══════════════════════════════════════════════════════════════════════════
-- ANWEISUNG 1 — die zwei Ausweise in den Vault (einmalig, von Hand)
--
-- ⚠ NICHT MIT DEM WERT EINCHECKEN. Diese Datei liegt im Repo; die Werte
--   stehen in `.env.local` bzw. in den Function-Secrets und gehoeren dorthin.
--
-- Der Anon-Key: Wert von VITE_SUPABASE_ANON_KEY aus `.env.local`
--   (gleichlautend im Dashboard unter Settings → API Keys).
--   Er ist oeffentlich — er steckt im Frontend-Bundle. Trotzdem nicht ins
--   Repo: ein Repo ist kein Ort fuer Schluessel, auch nicht fuer harmlose.
--
--   select vault.create_secret(
--     'HIER_DER_ANON_KEY',
--     'sfv_sync_anon_key',
--     'Publishable Key — kommt am Gateway vorbei, autorisiert nichts');
--
-- Liegt er schon da und ist falsch, ersetzen statt anlegen:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'sfv_sync_anon_key'),
--     'HIER_DER_RICHTIGE_ANON_KEY');
--
--
-- ANWEISUNG 2 — den Auftrag neu setzen
--
--   Den `do $cron$`-Block oben ausfuehren. `cron.schedule` ersetzt einen
--   gleichnamigen Auftrag, ist also wiederholbar.
--
--
-- NACH DEM NAECHSTEN LAUF (Minute 17) — hat es geklappt?
--
--   select
--     (select status_code from net._http_response
--       order by created desc limit 1)                        as letzte_antwort,
--     (select max(created at time zone 'Europe/Zurich')
--        from net._http_response)                             as antwort_um,
--     (select max(gestartet_am at time zone 'Europe/Zurich')
--        from public.api_sync_log)                            as letzter_lauf,
--     (select status from public.api_sync_log
--       order by gestartet_am desc limit 1)                   as lauf_status;
--
--   Erwartet: letzte_antwort = 200, letzter_lauf frisch, lauf_status = 'ok'.
--   Steht dort weiter 401, ist der WERT falsch — siehe update_secret oben.
-- ═══════════════════════════════════════════════════════════════════════════
