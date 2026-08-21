-- ═══════════════════════════════════════════════════════════════════════════
-- KLARNAMEN AUS api_sync_log.details ENTFERNEN
-- 21.08.2026
--
-- WOZU
--   `offene_namen` war als Durchreiche an den Browser gebaut, die nirgends
--   gespeichert wird. Geschrieben wurde `details: erg` — das ganze
--   Ergebnisobjekt. Damit stehen Klarnamen eigener Spieler dauerhaft im
--   Protokoll. Der Schreibpfad ist seit 23:43 zu (Commit 1138989, Allowlist
--   `fuersProtokoll()`); dieses Skript raeumt auf, was vorher hineingelaufen
--   ist.
--
-- ⚠ ES WIRD NUR DER EINE PFAD ENTFERNT, nicht die Zeile. `details` traegt
--   die Zahlen des Laufs — Spiele, Aufstellungszeilen, Passkonflikte —, und
--   die sind das Protokoll. `#- '{matchdaten,offene_namen}'` schneidet genau
--   einen Schluessel heraus und laesst den Rest unberuehrt.
--
-- ⚠ KEIN `where details::text like '%…%'`. Gefiltert wird ueber die
--   STRUKTUR (`? 'offene_namen'`), nicht ueber den Text — sonst entscheidet
--   der Zufall eines Namens darueber, ob eine Zeile bearbeitet wird.
--
-- ZAEHLPROBE — die Erwartungswerte stehen NICHT hier fest, sondern werden
-- zu Beginn gemessen. Der Bestand waechst, solange der Zeitplan laeuft, und
-- eine hier eingetragene Zahl waere beim Ausfuehren schon falsch.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_vorher_zeilen  int;
  v_vorher_namen   bigint;
  v_nachher_zeilen int;
  v_geaendert      int;
  v_details_weg    int;
begin

  -- ─── Vorher messen ──────────────────────────────────────────────────────
  select count(*), coalesce(sum(jsonb_array_length(details->'matchdaten'->'offene_namen')), 0)
    into v_vorher_zeilen, v_vorher_namen
    from public.api_sync_log
   where (details->'matchdaten') ? 'offene_namen';

  raise notice 'VORHER: % Protokollzeile(n) mit zusammen % Namenseintraegen.',
    v_vorher_zeilen, v_vorher_namen;

  if v_vorher_zeilen = 0 then
    raise notice 'Nichts zu tun.';
    return;
  end if;

  -- ─── Schneiden ──────────────────────────────────────────────────────────
  update public.api_sync_log
     set details = details #- '{matchdaten,offene_namen}'
   where (details->'matchdaten') ? 'offene_namen';
  get diagnostics v_geaendert = row_count;

  -- ─── Nachher pruefen ────────────────────────────────────────────────────
  select count(*) into v_nachher_zeilen
    from public.api_sync_log
   where (details->'matchdaten') ? 'offene_namen';

  /* Die zweite Haelfte der Probe: der Rest von `details` muss STEHEN
     geblieben sein. Eine Zeile, die ihr `matchdaten` ganz verloren haette,
     waere hier auffaellig — und ohne diese Zaehlung saehe „0 Namen uebrig"
     genauso aus wie „details geleert". */
  select count(*) into v_details_weg
    from public.api_sync_log
   where details ? 'matchdaten'
     and (details->'matchdaten'->>'spiele_geholt') is null;

  raise notice 'GEAENDERT: % Zeile(n).', v_geaendert;
  raise notice 'NACHHER:   % Zeile(n) mit Namen (erwartet 0).', v_nachher_zeilen;
  raise notice 'KONTROLLE: % Zeile(n) haben matchdaten ohne spiele_geholt (erwartet 0).', v_details_weg;

  if v_geaendert <> v_vorher_zeilen then
    raise exception 'UNVOLLSTAENDIG: % gemessen, % geaendert.', v_vorher_zeilen, v_geaendert;
  end if;
  if v_nachher_zeilen <> 0 then
    raise exception 'UNVOLLSTAENDIG: % Zeile(n) tragen weiter Namen.', v_nachher_zeilen;
  end if;
  if v_details_weg <> 0 then
    raise exception 'ZU VIEL GESCHNITTEN: % Zeile(n) ohne spiele_geholt.', v_details_weg;
  end if;

  raise notice 'Fertig. % Namenseintraege entfernt, Protokollzahlen unberuehrt.', v_vorher_namen;
end $mig$;
