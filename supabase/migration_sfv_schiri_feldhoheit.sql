-- ═══════════════════════════════════════════════════════════════════════════
-- FELDHOHEIT — schiedsrichter gehoert dem Matchdaten-Durchgang
-- 20.08.2026
--
-- ⚠ KORREKTUR ZU migration_sfv_spielinfo.sql VON HEUTE. Jene Migration hat
-- `schiedsrichter` in `sync_felder.spiele.sfv` eingetragen. Das war fachlich
-- richtig — das Feld gehoert dem Verband — und technisch falsch:
--
-- Die Zweiwege-Pruefung in sync.ts vergleicht die Liste `spiele.sfv` gegen
-- das, was bildeSpiel() aus dem SPIELPLAN berechnet. Ein Schiedsrichter steht
-- aber nicht im Spielplan (nachgemessen: der Eintrag hat 32 Schluessel, kein
-- einziger nennt einen Schiedsrichter) — er kommt aus /api/match/{id}/referees
-- und damit aus dem MATCHDATEN-Durchgang.
--
-- Folge: jeder Lauf brach ab mit
--   "sync_felder nennt Spalten, die der Sync nicht berechnet:
--    sfv_spiel_nr, schiedsrichter"
--
-- Die Pruefung hat also genau getan, wofuer sie gebaut wurde. Nur war die
-- Meldung nirgends zu sehen: die Supabase-Logs zeigten "booted" und
-- "shutdown", weil in diesem Ordner kein console.* stehen durfte. Das ist
-- mit protokoll.ts behoben — Fehlermeldungen ja, Zugangsdaten nie.
--
-- (`sfv_spiel_nr` war der leichtere Teil: matchNumber steht im Spielplan
-- und wird jetzt von bildeSpiel berechnet.)
--
--
-- WAS DIESE MIGRATION AENDERT. Eine dritte Liste neben sfv und abgeleitet:
--
--   sfv            der Spielplan-Durchgang berechnet und schreibt sie
--   sfv_matchdaten der Matchdaten-Durchgang schreibt sie, pro Spiel
--   abgeleitet     aus eigenen Daten gesetzt (team)
--   verein         der Sync fasst sie nie an
--
-- Damit bleibt die Feldhoheit vollstaendig — schiedsrichter gehoert weiter
-- dem Verband —, und die Zweiwege-Pruefung des Spielplans prueft nur, was
-- der Spielplan auch berechnen kann.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_sf jsonb;
begin

  update public.api_verbindungen a
     set sync_felder = jsonb_set(
           jsonb_set(a.sync_felder, '{spiele,sfv}',
             (select coalesce(jsonb_agg(v), '[]'::jsonb)
                from jsonb_array_elements(a.sync_felder->'spiele'->'sfv') v
               where v <> '"schiedsrichter"'::jsonb)),
           '{spiele,sfv_matchdaten}', '["schiedsrichter"]'::jsonb)
   where a.key = 'football_ch';

  execute $q$
    update public.api_verbindungen
       set sync_felder = jsonb_set(sync_felder, '{spiele,_regel_matchdaten}',
             to_jsonb('sfv_matchdaten wird vom Matchdaten-Durchgang geschrieben, nicht vom Spielplan: schiedsrichter kommt aus /api/match/{id}/referees. Die Zweiwege-Pruefung des Spielplans darf diese Liste NICHT mitpruefen, sonst meldet sie ein Feld als fehlend, das ein anderer Durchgang setzt.'::text))
     where key = 'football_ch'
  $q$;

  select sync_felder into v_sf from public.api_verbindungen where key = 'football_ch' limit 1;

  if v_sf->'spiele'->'sfv' @> '["schiedsrichter"]'::jsonb
  then raise exception 'UNVOLLSTAENDIG: schiedsrichter steht noch in spiele.sfv'; end if;
  if not (v_sf->'spiele'->'sfv_matchdaten' @> '["schiedsrichter"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: schiedsrichter fehlt in spiele.sfv_matchdaten'; end if;
  if not (v_sf->'spiele'->'sfv' @> '["sfv_spiel_nr"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: sfv_spiel_nr muss in spiele.sfv bleiben — es kommt aus dem Spielplan'; end if;
  if not (v_sf->'spiele'->'verein' @> '["spiel_nr","delegierter"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: spiel_nr oder delegierter aus der Verein-Spalte verloren'; end if;

  raise notice 'Fertig: schiedsrichter in spiele.sfv_matchdaten, sfv_spiel_nr bleibt in spiele.sfv.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────
select jsonb_pretty(sync_felder->'spiele') from public.api_verbindungen where key='football_ch';
-- erwartet: sfv enthaelt sfv_spiel_nr, NICHT schiedsrichter
--           sfv_matchdaten = ["schiedsrichter"]
--           verein enthaelt weiterhin spiel_nr, delegierter, treffpunkt, …


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Nicht empfohlen: er stellt den Abbruch wieder her.
-- begin;
--   update public.api_verbindungen
--      set sync_felder = jsonb_set(sync_felder - 'spiele' || jsonb_build_object('spiele',
--            (sync_felder->'spiele') - 'sfv_matchdaten' - '_regel_matchdaten'),
--            '{spiele,sfv}', (sync_felder->'spiele'->'sfv') || '["schiedsrichter"]'::jsonb)
--    where key = 'football_ch';
-- commit;
