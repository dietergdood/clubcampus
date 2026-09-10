-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — sfv_runde und sfv_runde_nr in die Feldhoheit
-- 11.09.2026
--
-- ⚠ ⚠  DER NACHTRAG ZU migration_spiele_runde.sql, UND ER IST DER EIGENTLICHE
--       DEFEKT.
--
--   Die Spalten wurden angelegt, der Sync berechnet sie — und nach einem
--   vollen Lauf standen sie bei ALLEN VIER Wettbewerbsarten auf 0:
--   Meisterschaft 234, Trainingsspiele 23, Cup 12, Schweizer-Cup 1.
--
--   Der Grund ist kein Datenproblem und kein Fehler des Verbands:
--   `schneideAufFeldhoheit()` schneidet die berechnete Zeile auf
--   `sync_felder->'spiele'->'sfv'` zu. Was dort nicht steht, kommt gar nicht
--   erst in die Nutzlast — und was nicht in der Nutzlast steht, fasst
--   ON CONFLICT DO UPDATE nicht an.
--
--   **Der Sync hat die Werte also jede Stunde berechnet und weggeworfen.**
--
-- ⚠ UND DER KOPF VON migration_spiele_runde.sql BEHAUPTETE DAS GEGENTEIL:
--
--     „FELDHOHEIT. Beide gehoeren dem VERBAND und stehen deshalb unter `sfv`
--      in api_verbindungen.sync_felder."
--
--   Das war in dem Moment falsch, in dem es geschrieben wurde. Es ist die
--   Sorte Satz, vor der CLAUDE.md ausdruecklich warnt: **ein Kommentar, der
--   eine ANDERE Stelle zusichert, ist eine Behauptung ohne Pruefung — und
--   wer ihn liest, prueft erst recht nicht nach.** Der Satz stand da, klang
--   geprueft, und niemand ist der Liste nachgegangen. Ich am wenigsten.
--
-- ⚠ WARUM ES STILL BLIEB — die asymmetrische Pruefung:
--
--     schneideAufFeldhoheit() meldet `fehlend`  = in sync_felder genannt,
--                                                aber nicht berechnet
--     sie meldete NICHT                          = berechnet, aber nicht
--                                                in sync_felder
--
--   Genau die zweite Richtung ist hier eingetreten. Sie wird mit demselben
--   Auftrag geschlossen (`nicht_erlaubt` in sync.ts) — sonst ist der
--   naechste Fall wieder still.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_sf jsonb;
begin

  update public.api_verbindungen a
     set sync_felder = jsonb_set(
           a.sync_felder, '{spiele,sfv}',
           (a.sync_felder->'spiele'->'sfv')
             || '["sfv_runde","sfv_runde_nr"]'::jsonb)
   where a.key = 'football_ch'
     and not (a.sync_felder->'spiele'->'sfv' @> '["sfv_runde"]'::jsonb);

  select sync_felder into v_sf from public.api_verbindungen where key = 'football_ch' limit 1;

  -- ⚠ Beide einzeln pruefen, nicht die Laenge der Liste. Eine Zahl, die
  --    stimmt, sagt nichts darueber, WELCHE Eintraege drinstehen — genau
  --    die Verwechslung, die dieses Projekt schon bei Testzahlen hatte.
  if not (v_sf->'spiele'->'sfv' @> '["sfv_runde"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: sfv_runde fehlt in spiele.sfv'; end if;
  if not (v_sf->'spiele'->'sfv' @> '["sfv_runde_nr"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: sfv_runde_nr fehlt in spiele.sfv'; end if;

  -- Und die Gegenrichtung: nichts darf dabei verloren gegangen sein.
  if not (v_sf->'spiele'->'sfv' @> '["sfv_gruppe","sfv_spiel_nr","liga","wettbewerb"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: bestehende Felder aus spiele.sfv verloren'; end if;
  if not (v_sf->'spiele'->'verein' @> '["treffpunkt","notes","venue_addr"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: die Verein-Spalte ist angetastet'; end if;

  raise notice 'Fertig: sfv_runde und sfv_runde_nr stehen in spiele.sfv.';
end $mig$;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Erst die Liste, dann der Lauf, dann die Werte. Die mittlere Zeile ist die,
-- die vorher gefehlt hat:
--
--   select sync_felder->'spiele'->'sfv' from public.api_verbindungen
--    where key = 'football_ch';
--
-- Danach EIN Sync-Lauf, dann:
--
--   select wettbewerb, count(*) as spiele,
--          count(sfv_runde)    as mit_rundenname,
--          count(sfv_runde_nr) as mit_rundennummer
--     from public.spiele group by 1 order by 2 desc;
--
-- ⚠ Bleibt `mit_rundenname` bei 0, waehrend `mit_rundennummer` steigt, dann
--   liefert der Verband `playDayName` nicht — und DAS waere dann endlich
--   der Befund an der Quelle, als der es bisher nur aussah.
