-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der Wächter lernt die DRITTE Frage
-- 11.09.2026
--
-- ⚠ ⚠  DREI ANSCHLUSSFRAGEN, DREI BAUARTEN — und wer sie gleich behandelt,
--       bekommt für eine davon einen Fehlalarm-Generator.
--
--     SFV-Sync (Takt)      „wann lief er zuletzt?"
--     Export (nach Bedarf) „wartet etwas?"
--     Nachlauf (rollend)   „KOMMT DER DURCHGANG VORAN?"   ← neu
--
--   Der rollende Nachlauf holt zwei der zwölf Plätze je Lauf für das am
--   längsten nicht Geholte. Er fällt still aus, wenn `neu` dauerhaft alle
--   Plätze braucht, wenn die Sortierung bricht, oder wenn der Zweig tot
--   ist — und **das merkt monatelang niemand:** alle Spiele haben ja
--   Daten, nur eben die vom Tag ihres Abrufs. Genau so lagen am 11.09.2026
--   62 Spiele wochenlang eingefroren.
--
-- ── ⚠ DIE SCHWELLE WIRD GERECHNET, NICHT GERATEN ─────────────────────────
--
--   Ein voller Durchgang braucht `kandidaten / plaetze` Läufe, also ebenso
--   viele Stunden. Alarm gibt es beim DOPPELTEN davon.
--
--     heute   ~50 Kandidaten / 2  =  25 h   →  Alarm ab 50 h
--     Ende    270 Kandidaten / 2  = 135 h   →  Alarm ab 270 h
--
--   Damit steht keine Zahl im Code, die niemand gemessen hat. **Die
--   Schwelle folgt dem Bestand, so wie er gerade ist** — anders als die
--   festen 120 Minuten, die für den Export ein Fehlalarm-Generator
--   gewesen wären.
--
-- ⚠ ⚠  SIE RECHNET MIT DEM MINDESTMASS, NICHT MIT DEM SCHNITT.
--   `NACHLAUF_PLAETZE` (2) ist eine RESERVIERUNG, keine Obergrenze:
--   braucht das Fenster die Plätze nicht, nimmt der Nachlauf mehr — bei
--   ruhiger Woche bis zu zwölf. Der Durchgang ist dann schneller als
--   gerechnet, und die Schwelle ist zu grosszügig.
--
--   **Das ist die sichere Richtung.** Eine zu enge Schwelle meldete einen
--   Ausfall, den es nicht gibt — und ein Melder, der grundlos anschlägt,
--   wird nach dem dritten Mal abgeschaltet statt gelesen.
--
-- ⚠ Beide Werte kommen aus dem Lauf selbst (`api_sync_log.details`), nicht
--   aus einer zweiten Rechnung in SQL. Zwei Stellen, die dieselbe Frage
--   beantworten, laufen still auseinander.
--
-- ⚠ DIESES SKRIPT ERSETZT DEN AUFTRAG `sync-waechter` VOLLSTÄNDIG.
--   `cron.schedule` ersetzt einen gleichnamigen Auftrag, und ein halber
--   Wächter wäre schlimmer als der alte.
-- ═══════════════════════════════════════════════════════════════════════════

do $cron$
declare
  gefunden integer;
  befehl   text;
begin
  if to_regprocedure('public.export_wartet(uuid)') is null then
    raise exception 'ABBRUCH: export_wartet() fehlt — erst migration_export_wartet.sql.';
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
      v_alt      integer;
      v_kand     integer;
      v_schwelle integer;
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
          -- Die zweite Frage: wartet etwas, und wie lange schon?
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
          -- Der Takt-Anschluss.
          if r.letzter_sync is null then
            v_grund := 'Es hat noch nie ein Lauf stattgefunden.';
          elsif r.minuten > 120 then
            v_grund := 'Der letzte Lauf ist ' || (r.minuten / 60) || ' Stunden her — erwartet wird stuendlich.';
          elsif r.sync_status = 'fehler' then
            v_grund := 'Der letzte Lauf ist gescheitert: ' || coalesce(r.sync_status, '?') || '.';
          end if;

          -- ⚠ DIE DRITTE FRAGE: kommt der rollende Nachlauf voran?
          --   Beide Werte aus dem juengsten Lauf, nicht neu gerechnet.
          if v_grund is null then
            select (l.details->'matchdaten'->>'aelteste_holung_stunden')::int,
                   (l.details->'matchdaten'->>'kandidaten_gesamt')::int
              into v_alt, v_kand
              from public.api_sync_log l
             where l.verein_id = r.verein_id
               and l.details->'matchdaten' is not null
             order by l.gestartet_am desc
             limit 1;

            -- ⚠ Zwei Plaetze je Lauf, stuendlich: ein voller Durchgang
            --   dauert kandidaten/2 Stunden. Alarm beim Doppelten.
            if v_alt is not null and v_kand is not null and v_kand > 0 then
              v_schwelle := (v_kand / 2) * 2;
              if v_alt > v_schwelle then
                v_grund := 'Der rollende Nachlauf kommt nicht voran: das am '
                        || 'laengsten nicht geholte Spiel ist ' || v_alt
                        || ' Stunden alt, erwartet waeren hoechstens '
                        || v_schwelle || ' (' || v_kand || ' Kandidaten, '
                        || '2 Plaetze je Lauf). ⚠ Diese Meldung sagt NICHTS '
                        || 'darueber, ob die geholten Daten stimmen.';
              end if;
            end if;
          end if;
        end if;

        if v_grund is null then continue; end if;

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
  if befehl not ilike '%aelteste_holung_stunden%' then
    raise exception 'UNVOLLSTAENDIG: der Waechter kennt die dritte Frage nicht';
  end if;
  if befehl not ilike '%wache_zuletzt%' then
    raise exception 'UNVOLLSTAENDIG: der Waechter setzt sein eigenes Lebenszeichen nicht';
  end if;

  raise notice 'Waechter steht — mit drei Fragen statt zwei.';
end $cron$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ ⚠  DER PROBELAUF — UNBEDINGT
--
--   `cron.schedule` PRUEFT DEN BEFEHL NICHT. Es speichert eine
--   Zeichenkette. Am 21.08.2026 ist genau dieser Waechter zweimal
--   hintereinander mit einem Fehler gespeichert worden, und beide Male
--   meldete das Einrichten „Waechter steht".
-- ═══════════════════════════════════════════════════════════════════════════

-- begin;
--   do $probe$ declare c text; begin
--     select command into c from cron.job where jobname = 'sync-waechter';
--     execute c;
--     raise notice 'Der gespeicherte Befehl laeuft.';
--   end $probe$;
-- rollback;

-- ⚠ Der Probelauf legt Benachrichtigungen an, wenn gerade etwas faellig
--   ist — das `rollback` nimmt sie mit zurueck.


-- ─── Nachschauen ───────────────────────────────────────────────────────────
--
-- Kommt der Nachlauf voran?
--   select gestartet_am at time zone 'Europe/Zurich' as zeit,
--          details->'matchdaten'->>'kandidaten_neu'      as neu,
--          details->'matchdaten'->>'kandidaten_fenster'  as fenster,
--          details->'matchdaten'->>'kandidaten_alt'      as alt,
--          details->'matchdaten'->>'spiele_geholt'       as geholt,
--          details->'matchdaten'->>'aelteste_holung_stunden' as aeltest
--     from public.api_sync_log
--    where details->'matchdaten' is not null
--    order by gestartet_am desc limit 12;
--
-- ⚠ `neu + fenster + alt` muss `geholt` ergeben. Geht es nicht auf, misst
--   eine der Stellen etwas anderes als die andere.
--
-- ⚠ Und `aeltest` ist die Zahl, auf die es ankommt: sie soll PENDELN.
--   Waechst sie ueber mehrere Laeufe stetig, steht der Durchgang — auch
--   wenn `alt` bei 2 steht.
