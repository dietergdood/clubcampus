-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der Waechter lernt die zweite Frage
-- 10.09.2026
--
-- ⚠ ⚠  ZWEI ANSCHLUESSE, ZWEI FRAGEN — und wer sie gleich behandelt,
--       bekommt fuer den einen einen Fehlalarm-Generator.
--
--     SFV-Sync   hat einen TAKT (stuendlich)
--                → „wann lief er zuletzt?"  ist die richtige Frage
--
--     Export     hat KEINEN Takt, er laeuft nach Bedarf
--                → „wartet etwas?"  ist die richtige Frage
--
--   Bis heute kannte der Waechter nur die erste, fest verdrahtet:
--
--     elsif r.minuten > 120 then
--       v_grund := '… — erwartet wird stuendlich.';
--
--   Legte man `active`/`auto_sync` fuer `wordpress` um, ohne das zu
--   aendern, meldete er ab der dritten Stunde **alle zwei Stunden**, der
--   Export sei ueberfaellig — fuer einen Export, der genau das tut, was
--   er soll.
--
-- ⚠ Und eine Warnung, die immer dasselbe sagt, wird nach dem dritten Mal
--   abgeschaltet statt gelesen — dieselbe Abstumpfung wie bei den 789
--   Lint-Warnungen und beim dauerhaft roten Test. **Ein Melder, der
--   Unsinn meldet, macht die uebrigen Meldungen mit wertlos.**
--
-- ── Warum nicht einfach `erwartet_minuten` je Anschluss ───────────────────
--
--   Weil dann der teuerste Fall unentdeckt bliebe: der Export laeuft brav
--   alle 15 Minuten, findet aber wegen eines Fehlers nie etwas, und der
--   Waechter saehe einen frischen `letzter_sync` und schwiege.
--
--   **Ein Zeitstempel sagt, dass etwas lief. Nicht, dass es etwas
--   ausgerichtet hat.** Dasselbe wie `job_run_details.status =
--   'succeeded'`, das nur „abgesetzt" heisst.
--
-- ⚠ DIESES SKRIPT ERSETZT DEN AUFTRAG `sync-waechter`. Es ist die
--   vollstaendige Fassung, nicht ein Zusatz — `cron.schedule` ersetzt
--   einen gleichnamigen Auftrag, und ein halber Waechter waere
--   schlimmer als der alte.
-- ═══════════════════════════════════════════════════════════════════════════

do $cron$
declare
  gefunden integer;
  befehl   text;
begin
  if to_regprocedure('public.export_wartet(uuid)') is null then
    raise exception 'ABBRUCH: export_wartet() fehlt — erst migration_export_wartet.sql.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name = 'api_verbindungen'
                    and column_name = 'wache_zuletzt') then
    raise exception 'ABBRUCH: wache_zuletzt fehlt — erst migration_sync_waechter.sql.';
  end if;

  perform cron.schedule(
    'sync-waechter',
    '*/30 * * * *',
    $job$
    do $waechter$
    declare
      r          record;
      v_grund    text;
      v_anz      integer;
      v_neu      integer := 0;
      v_wartet   integer;
    begin
      for r in
        select v.id, v.verein_id, v.key, v.label, v.sync_status,
               v.letzter_sync,
               round(extract(epoch from (now() - v.letzter_sync)) / 60)::int as minuten
          from public.api_verbindungen v
         where v.active is true and v.auto_sync is true
      loop
        v_grund := null;

        if r.key = 'wordpress' then
          -- ⚠ DIE ZWEITE FRAGE. Nicht „wann lief er zuletzt?", sondern
          --    „wartet etwas, und wie lange schon?". Ein Export, der
          --    drei Tage nicht lief, weil sich nichts geaendert hat, ist
          --    in Ordnung — und darf keine Meldung erzeugen.
          v_wartet := public.export_wartet(r.verein_id);
          if v_wartet > 0 and (
               r.letzter_sync is null
               or r.letzter_sync < now() - interval '1 hour'
             ) then
            v_grund := v_wartet || ' Zeile(n) warten seit ueber einer Stunde '
                    || 'auf den Export. Der Abholer laeuft alle 15 Minuten — '
                    || 'er kommt also nicht durch.';
          elsif r.sync_status = 'fehler' then
            v_grund := 'Der letzte Export ist gescheitert.';
          end if;
        else
          -- Der Takt-Anschluss, unveraendert.
          if r.letzter_sync is null then
            v_grund := 'Es hat noch nie ein Lauf stattgefunden.';
          elsif r.minuten > 120 then
            v_grund := 'Der letzte Lauf ist ' || (r.minuten / 60) || ' Stunden her — erwartet wird stuendlich.';
          elsif r.sync_status = 'fehler' then
            v_grund := 'Der letzte Lauf ist gescheitert: ' || coalesce(r.sync_status, '?') || '.';
          end if;
        end if;

        if v_grund is null then continue; end if;

        -- Nur wenn keine UNGELESENE Meldung zu diesem Anschluss steht.
        if exists (
          select 1 from public.benachrichtigungen b
           where b.verein_id = r.verein_id
             and b.referenz_typ = 'sync_ausfall'
             and b.referenz_id = r.id
             and b.gelesen is not true
        ) then continue; end if;

        insert into public.benachrichtigungen
               (verein_id, benutzer_id, type, title, content, referenz_typ, referenz_id)
        select r.verein_id, b.id, 'warnung',
               'Der Anschluss ' || coalesce(r.label, r.key) || ' meldet sich nicht',
               v_grund || ' Nachsehen: Portalverwaltung → API-Verbindungen. '
                 || 'Was zurueckkam, steht in net._http_response — 401 heisst Gateway, '
                 || '200 ohne Zeile in api_sync_log heisst die Function.',
               'sync_ausfall', r.id
          from public.benutzer b
         where b.ist_admin is true and b.aktiv is not false;
        get diagnostics v_anz = row_count;
        v_neu := v_neu + v_anz;
      end loop;

      update public.api_verbindungen set wache_zuletzt = now() where active is true;
    end
    $waechter$;
    $job$);

  select count(*) into gefunden from cron.job where jobname = 'sync-waechter';
  if gefunden <> 1 then raise exception 'UNVOLLSTAENDIG: sync-waechter nicht angelegt'; end if;

  select command into befehl from cron.job where jobname = 'sync-waechter';
  if befehl not ilike '%export_wartet%' then
    raise exception 'UNVOLLSTAENDIG: der Waechter kennt die zweite Frage nicht';
  end if;
  if befehl not ilike '%wache_zuletzt%' then
    raise exception 'UNVOLLSTAENDIG: der Waechter setzt sein eigenes Lebenszeichen nicht';
  end if;

  raise notice 'Waechter steht — mit zwei Fragen statt einer.';
end $cron$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ ⚠  DER PROBELAUF — UNBEDINGT
--
--   `cron.schedule` speichert eine Zeichenkette und prueft sie nicht. Am
--   21.08.2026 ist genau dieser Waechter zweimal hintereinander mit einem
--   Fehler gespeichert worden, und beide Male meldete das Einrichten
--   „Waechter steht".
--
--   ⚠ Und der Tag des aeusseren Dollar-Quotings darf im Befehl nirgends
--   vorkommen: hier ist es `$job$`, drinnen `$waechter$`. Ein `$job$` im
--   Kommentartext beendete den Block mittendrin, und der Fehler zeigte
--   auf eine Stelle, die mit der Ursache nichts zu tun hat.
-- ═══════════════════════════════════════════════════════════════════════════

-- begin;
--   do $probe$ declare c text; begin
--     select command into c from cron.job where jobname = 'sync-waechter';
--     execute c;
--     raise notice 'Der gespeicherte Befehl laeuft.';
--   end $probe$;
-- rollback;

-- ⚠ Der Probelauf legt Benachrichtigungen an, wenn gerade etwas faellig
--   ist — das `rollback` nimmt sie mit zurueck. Ohne die Klammer stuenden
--   sie danach da, ohne dass jemand sie ausgeloest hat.
