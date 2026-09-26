-- ═══════════════════════════════════════════════════════════════════════════
-- PROBE — feuert der Abholer, solange die Rotation laeuft?
-- 26.09.2026 · Gegenprobe zu migration_export_nachlauf.sql
--
-- ⚠ ⚠  SIE AENDERT NICHTS. Alles steht zwischen `begin;` und `rollback;`.
--   Woran man es erkennt: die letzte Zeile der Datei ist `rollback;`, und
--   die Schlussabfrage zaehlt die export-Zeilen — sie muss danach dieselbe
--   Zahl nennen wie die erste.
--
-- ⚠ `pg_net` stellt seine Anfragen TRANSAKTIONAL in die Warteschlange
--   (CLAUDE.md, „cron.schedule PRUEFT DEN BEFEHL NICHT"). Ein Rollback
--   nimmt einen Ping mit zurueck: es geht nichts nach draussen, auch wenn
--   der gespeicherte Befehl ausgefuehrt wird.
--
-- ── WAS SIE MISST, UND WAS DAS WERT IST ───────────────────────────────────
--
--   Sie fuehrt den BEFEHL AUS `cron.job` aus, nicht eine Abschrift davon.
--   `get diagnostics row_count` sagt danach, fuer wie viele Vereine er
--   gefeuert haette. Eine Probe, die die Bedingung nachbaut, prueft die
--   Abschrift — dieses Papier fuehrt den Fehler an einem halben Dutzend
--   Stellen.
--
-- ── ⚠ FALL 2 IST IM BETRIEB NICHT ERREICHBAR ──────────────────────────────
--
--   „nichts offen" gibt es nicht: `offen_teams` leert sich nie, es rotiert
--   (index.ts:998, wpExportReihenfolge.test.ts:167 erwartet [14,14,14]).
--   Fall 2 stellt deshalb den Zustand „die Rotation ist DURCH" her — genug
--   Laeufe seit der Aenderung —, nicht „die Liste ist leer". Wer ihn als
--   Beleg dafuer liest, dass der Abholer je eine leere Liste sieht, liest
--   ihn falsch.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temporary table probe_ergebnis(
  nr int, fall text, gemessen text, erwartet text, urteil text
) on commit drop;

do $probe$
declare
  v_verein  uuid;
  v_verb    uuid;
  v_befehl  text;
  v_runden  int;
  n         int;
  i         int;
begin
  select v.verein_id, v.id into v_verein, v_verb
    from public.api_verbindungen v
   where v.key = 'wordpress' and v.active is true and v.auto_sync is true
   limit 1;
  if v_verein is null then
    insert into probe_ergebnis values
      (0, 'Voraussetzung', 'kein aktiver wordpress-Anschluss', 'einer', '⚠ ABBRUCH');
    return;
  end if;

  select command into v_befehl from cron.job where jobname = 'wp-export-abholer';
  if v_befehl is null then
    insert into probe_ergebnis values
      (0, 'Voraussetzung', 'kein cron-Auftrag wp-export-abholer', 'einer', '⚠ ABBRUCH');
    return;
  end if;

  /* ⚠ Die bestehenden export-Zeilen weg, damit der Zustand definiert ist.
     Nur in dieser Transaktion — das `rollback` am Ende holt sie zurueck. */
  delete from public.api_sync_log where aktion = 'export' and verein_id = v_verein;

  /* Eine Kalibrierungszeile: 7 erledigt, 14 offen → ceil(21/7) = 3 Runden.
     Sie liegt in der Vergangenheit, damit sie nicht als Lauf zaehlt. */
  insert into public.api_sync_log(verbindung_id, verein_id, aktion, status,
                                  gestartet_am, beendet_am, details)
  values (v_verb, v_verein, 'export', 'warnung',
          now() - interval '2 days', now() - interval '2 days',
          jsonb_build_object('teams_gesendet', 7, 'teams_gescheitert', 0,
                             'offen_teams', to_jsonb(array(select generate_series(1,14)::text))));

  select ceil(21::numeric / 7) into v_runden;

  /* ── FALL 1 · die Rotation laeuft noch: EIN Lauf seit der Aenderung ──
     Datenaenderung ist max(zuletzt_geaendert) der vier Quellen und liegt
     in der Vergangenheit; ein Lauf von jetzt zaehlt also danach. */
  insert into public.api_sync_log(verbindung_id, verein_id, aktion, status,
                                  gestartet_am, beendet_am, details)
  values (v_verb, v_verein, 'export', 'warnung', now(), now(),
          jsonb_build_object('teams_gesendet', 7, 'teams_gescheitert', 0,
                             'offen_teams', to_jsonb(array(select generate_series(1,14)::text))));
  update public.api_verbindungen set letzter_sync = now() where id = v_verb;

  execute v_befehl;
  get diagnostics n = row_count;
  insert into probe_ergebnis values
    (1, 'Rotation laeuft (1 von ' || v_runden || ' Runden), Daten unveraendert',
     case when n > 0 then 'feuert' else 'feuert nicht' end, 'feuert',
     case when n > 0 then 'stimmt' else '⚠ WEICHT AB' end);

  /* ── FALL 2 · die Rotation ist durch: so viele Laeufe wie Runden ── */
  i := 1;
  while i < v_runden loop
    insert into public.api_sync_log(verbindung_id, verein_id, aktion, status,
                                    gestartet_am, beendet_am, details)
    values (v_verb, v_verein, 'export', 'ok', now(), now(),
            jsonb_build_object('teams_gesendet', 7, 'teams_gescheitert', 0,
                               'offen_teams', to_jsonb(array(select generate_series(1,14)::text))));
    i := i + 1;
  end loop;

  execute v_befehl;
  get diagnostics n = row_count;
  insert into probe_ergebnis values
    (2, 'Rotation durch (' || v_runden || ' Laeufe), Daten unveraendert',
     case when n > 0 then 'feuert' else 'feuert nicht' end, 'feuert nicht',
     case when n = 0 then 'stimmt' else '⚠ WEICHT AB' end);

  /* ── FALL 3 · KANN DIE PROBE DEN UNTERSCHIED UEBERHAUPT SEHEN? ──
     Der Zustand von Fall 1 wieder her, aber gegen die ALTE Bedingung
     gehalten (nur export_wartet). Sie muss „feuert nicht" ergeben —
     sonst misst die Probe etwas anderes als den Unterschied, und die
     ersten zwei Zeilen sind wertlos. Eine Pruefung, die nie rot war,
     ist keine. */
  delete from public.api_sync_log
   where aktion = 'export' and verein_id = v_verein and gestartet_am >= now() - interval '1 minute';
  insert into public.api_sync_log(verbindung_id, verein_id, aktion, status,
                                  gestartet_am, beendet_am, details)
  values (v_verb, v_verein, 'export', 'warnung', now(), now(),
          jsonb_build_object('teams_gesendet', 7, 'teams_gescheitert', 0,
                             'offen_teams', to_jsonb(array(select generate_series(1,14)::text))));

  select count(*) into n from public.api_verbindungen v
   where v.key = 'wordpress' and v.active is true and v.auto_sync is true
     and public.export_wartet(v.verein_id) > 0;
  insert into probe_ergebnis values
    (3, 'derselbe Zustand, ALTE Bedingung (nur export_wartet)',
     case when n > 0 then 'feuert' else 'feuert nicht' end, 'feuert nicht',
     case when n = 0 then 'stimmt — die Probe sieht den Unterschied'
          else '⚠ WEICHT AB — die Probe misst nicht den Nachlauf' end);
end
$probe$;

select * from probe_ergebnis order by nr;

rollback;

-- ⚠ NACH dem Rollback laufen lassen: die Zahl muss der von vorher gleichen.
select count(*) as export_zeilen_danach
  from public.api_sync_log where aktion = 'export';
