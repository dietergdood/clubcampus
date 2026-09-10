-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der WordPress-Export als ABHOLER
-- 10.09.2026
--
-- ⚠ ⚠  ER LAEUFT NICHT NACH TAKT, SONDERN NACH BEDARF.
--
--   Alle 15 Minuten wird NACHGESEHEN. Wartet nichts, geschieht nichts —
--   kein HTTP-Aufruf, keine Zeile, keine Kosten ausser einer Abfrage.
--
--   Der Sync hat einen Takt und die Frage „wann lief er zuletzt?". Der
--   Export hat keinen: laeuft er drei Tage nicht, weil sich drei Tage
--   nichts geaendert hat, ist das richtig. **Die Frage lautet „wartet
--   etwas?"** — und `export_wartet()` beantwortet sie.
--
-- ⚠ Und dieselbe Funktion ist AUSLOESER und WAECHTER: „soll er laufen?"
--   und „haette er laufen muessen?" sind dieselbe Frage, eine Stunde
--   auseinander. Zwei Fragen, eine Quelle.
--
-- ── Warum 15 Minuten und nicht stuendlich ─────────────────────────────────
--
--   Der Sync laeuft stuendlich zur Minute 17. Ein Viertelstundentakt
--   heisst also **hoechstens ein echter Export je Stunde**, der Rest sind
--   Leerlaeufe von einer Abfrage. Dafuer liegt zwischen einer Aenderung
--   und der Website hoechstens eine Viertelstunde statt einer Stunde.
--
-- ⚠ ER DARF NICHT OEFTER LAUFEN ALS DER SYNC, sonst schickt er dieselbe
--   Aenderung mehrfach — 15 Minuten sind der kuerzeste sinnvolle Abstand.
--
-- ── ⚠ NUR `export`, NIE `probe` ───────────────────────────────────────────
--
--   Der Zeitplan-Pfad in `wp-export` laesst ausschliesslich `export` zu
--   und antwortet auf alles andere mit 403. Der Grund haengt am INHALT
--   DER ANTWORT, nicht am Aufrufweg:
--
--     probe   gibt die gebauten Spiele samt Verlauf und Aufstellung
--             zurueck — also Klarnamen, sobald jemand zugeordnet ist
--     export  gibt Zaehlungen je Mannschaft und die WordPress-Antwort
--             zurueck — keine Namen
--
--   `pg_net` legt die Antwort eines Cron-Aufrufs in
--   `net._http_response.content` ab, einen Speicher, den niemand im Blick
--   hat. **Deshalb ist die Sperre eine Aussage ueber die Antwort und
--   nicht ueber den Zeitplan** — wer eine dritte Aktion freigeben will,
--   misst zuerst, was sie zurueckgibt.
--
-- ── Voraussetzung ─────────────────────────────────────────────────────────
--
--   1. Function-Secret `WP_SYNC_KEY` (Dashboard → Edge Functions)
--   2. Derselbe Wert im Vault als `wp_export_key`
--   3. `sfv_sync_anon_key` im Vault (steht dort schon, fuer den Sync)
--
--   Beide Ausweise setzt der Mensch, nicht dieses Skript — sie stehen
--   nirgends im Repo.
-- ═══════════════════════════════════════════════════════════════════════════

do $cron$
declare
  gefunden integer;
  befehl   text;
begin
  if not exists (select 1 from vault.secrets where name = 'wp_export_key') then
    raise exception 'ABBRUCH: wp_export_key fehlt im Vault. Erst das Secret setzen (derselbe Wert wie WP_SYNC_KEY in den Function-Secrets), dann diesen Block.';
  end if;
  if not exists (select 1 from vault.secrets where name = 'sfv_sync_anon_key') then
    raise exception 'ABBRUCH: sfv_sync_anon_key fehlt im Vault.';
  end if;
  if to_regprocedure('public.export_wartet(uuid)') is null then
    raise exception 'ABBRUCH: export_wartet() fehlt — erst migration_export_wartet.sql.';
  end if;

  -- cron.schedule ersetzt einen gleichnamigen Auftrag, ist also wiederholbar.
  perform cron.schedule(
    'wp-export-abholer',
    '*/15 * * * *',
    $job$
      -- ⚠ DIE BEDINGUNG STEHT IM BEFEHL, nicht in der Function. Wartet
      --    nichts, geht kein Aufruf hinaus — ein Leerlauf kostet eine
      --    Abfrage statt einer HTTP-Anfrage.
      select net.http_post(
        url     := 'https://otiyvvxoqghtkcgsjmrv.supabase.co/functions/v1/wp-export',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     -- Tuersteher am Gateway; autorisiert nichts.
                     'Authorization', 'Bearer ' || (select decrypted_secret
                                                      from vault.decrypted_secrets
                                                     where name = 'sfv_sync_anon_key'),
                     'apikey', (select decrypted_secret from vault.decrypted_secrets
                                 where name = 'sfv_sync_anon_key'),
                     -- Schloss: schaltet den Zeitplan-Pfad frei.
                     'X-Sync-Key', (select decrypted_secret from vault.decrypted_secrets
                                     where name = 'wp_export_key')),
        body    := '{"aktion":"export"}'::jsonb,
        timeout_milliseconds := 240000)
        from public.api_verbindungen v
       where v.key = 'wordpress'
         and v.active is true
         and v.auto_sync is true
         and public.export_wartet(v.verein_id) > 0;
    $job$);

  select count(*) into gefunden from cron.job where jobname = 'wp-export-abholer';
  if gefunden <> 1 then raise exception 'UNVOLLSTAENDIG: cron-Auftrag nicht angelegt'; end if;

  select command into befehl from cron.job where jobname = 'wp-export-abholer';
  if befehl not ilike '%authorization%' then
    raise exception 'UNVOLLSTAENDIG: kein Authorization-Header — der Fehler vom 20.08.2026';
  end if;
  if befehl not ilike '%export_wartet%' then
    raise exception 'UNVOLLSTAENDIG: der Befehl fragt nicht, ob etwas wartet — er waere ein Takt';
  end if;
  if befehl ilike '%"probe"%' then
    raise exception 'UNVOLLSTAENDIG: der Zeitplan darf nur "export" rufen';
  end if;

  raise notice 'Abholer steht: alle 15 Minuten nachsehen.';
end $cron$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ ⚠  DER PROBELAUF — UNBEDINGT, UND ZWAR DANACH
--
--   `cron.schedule` PRUEFT DEN BEFEHL NICHT. Es speichert eine
--   Zeichenkette. Am 21.08.2026 ist das zweimal hintereinander
--   danebengegangen — eine Variable, die nur im aeusseren Block
--   deklariert war, und ein Content-Type, den net.http_post ablehnt.
--   **Beide Male meldete das Einrichten „Waechter steht".**
--
--   Also den gespeicherten Befehl einmal ausfuehren, bevor man ihm
--   glaubt. `pg_net` stellt seine Anfragen transaktional in die
--   Warteschlange: ein `rollback` nimmt einen Ping mit zurueck, es geht
--   nichts nach draussen.
-- ═══════════════════════════════════════════════════════════════════════════

-- begin;
--   do $probe$ declare c text; begin
--     select command into c from cron.job where jobname = 'wp-export-abholer';
--     execute c;
--     raise notice 'Der gespeicherte Befehl laeuft.';
--   end $probe$;
-- rollback;

-- ⚠ Laeuft er durch, ist die SYNTAX gut — nicht, dass der Export etwas
--   tut. Ob er etwas tut, sagt erst der erste echte Lauf.


-- ─── Nachschauen ───────────────────────────────────────────────────────────
--
-- Wartet gerade etwas?
--   select v.key, public.export_wartet(v.verein_id) as wartet,
--          v.active, v.auto_sync, v.letzter_sync
--     from public.api_verbindungen v where v.key = 'wordpress';
--
-- Lief der Abholer?
--   select start_time at time zone 'Europe/Zurich', status, return_message
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'wp-export-abholer')
--    order by start_time desc limit 10;
--
-- ⚠ `status = 'succeeded'` heisst hier NUR „der select lief" — bei einem
--   Leerlauf ohne Wartendes ist das genauso wahr wie bei einem echten
--   Aufruf. Was zurueckkam, steht in net._http_response; ob der Export
--   etwas ausgerichtet hat, in api_sync_log.
