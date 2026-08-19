-- ═══════════════════════════════════════════════════════════════════════════
-- SPIELERPASS — der Verband fuehrt ihn, wir schreiben ihn ab
-- 20.08.2026
--
-- ⚠ DAS ERSTE MAL, DASS EIN SYNC EIN MITGLIEDERFELD SCHREIBT. Bisher fasste
-- er nur `spiele`, `ranglisten` und die drei Matchdaten-Tabellen an. Deshalb
-- eine eigene Migration statt einer Zeile in einer anderen: die Entscheidung
-- soll dort stehen, wo man sie sucht.
--
-- ANLASS (Didi, 20.08.2026): Der Verband fuehrt den Spielerpass. Wir
-- schreiben ihn nur ab, und wer von Hand tippt, macht Fehler.
--
--
-- DREI REGELN, alle als reine Funktion geprueft (passAenderungen in
-- matchdaten.ts, 7 Tests):
--
-- 1) NUR EIGENE SPIELER. `passportNumber` steht an JEDEM Eintrag der
--    Aufstellung, auch am gegnerischen. Dort wird sie nicht gelesen. Die
--    Regel "von fremden Spielern nichts" gilt unveraendert — der Spielerpass
--    eines gegnerischen Junioren hat in unserer Datenbank nichts verloren.
--
-- 2) NIE MIT NULL UEBERSCHREIBEN. Der Sync sieht nur, wer gespielt hat. Ein
--    verletzter oder gesperrter Spieler taucht in keiner Aufstellung auf.
--    Wuerde der Lauf leere Werte schreiben, verschwaende beim naechsten Mal
--    jede von Hand eingetragene Nummer — und niemand wuesste, warum. Was der
--    Verband nicht liefert, bleibt unangetastet.
--
-- 3) EINE ABWEICHUNG WIRD FESTGEHALTEN, nicht still ersetzt. Weicht die
--    Nummer ab, gewinnt der Verband — aber das Vorher geht in den Verlauf,
--    nach der Regel aus CLAUDE.md:
--      Wert A -> Wert B   mitglieder_aenderungen
--      null   -> Wert     mitglieder_aktivitaeten (FELD_ERFASST)
--    Urheber ist "SFV-Sync", nicht ein Mensch. Wer die Nummer von Hand
--    eingetragen hatte, sieht im Verlauf, was daraus wurde.
--
--
-- NICHT UEBERNOMMEN WIRD DAS GEBURTSDATUM. Es steht in `personen` und ist
-- dort gepflegt (Didi, 20.08.2026). Der Endpunkt liefert es mit; die
-- Allowlist liest es nicht.
--
--
-- WAS DIESE MIGRATION NICHT LOEST. Ein Spieler ohne Zuordnung
-- (sfv_zuordnung) bekommt keinen Pass — der Sync weiss nicht, wer er ist.
-- Beim Stand vom 20.08.2026 warten 167 Spieler auf ihre Zuordnung; bis die
-- gemacht ist, schreibt dieser Teil nichts.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_sf jsonb;
begin

  select sync_felder into v_sf from public.api_verbindungen where key = 'football_ch' limit 1;
  if v_sf is null then
    raise exception 'UNVOLLSTAENDIG: kein Anschluss football_ch';
  end if;

  /* `mitglieder` gab es in sync_felder bisher gar nicht — der Sync fasste
     die Tabelle nie an. Der Eintrag nennt AUSDRUECKLICH nur das eine Feld;
     alles andere an `mitglieder` bleibt damit ausserhalb der Feldhoheit und
     wird vom Lauf nicht geschrieben. */
  update public.api_verbindungen a
     set sync_felder = jsonb_set(a.sync_felder, '{mitglieder}', jsonb_build_object(
           'sfv',    jsonb_build_array('spielerpass'),
           'verein', jsonb_build_array('_alles_andere'),
           '_regel',
             'Nur spielerpass, nur bei zugeordneten eigenen Spielern, nie mit NULL ueberschreiben. Eine Abweichung geht in mitglieder_aenderungen bzw. mitglieder_aktivitaeten mit geaendert_von = SFV-Sync. Das Geburtsdatum wird NICHT uebernommen: es steht in personen und ist dort gepflegt.'))
   where a.key = 'football_ch';

  select sync_felder into v_sf from public.api_verbindungen where key = 'football_ch' limit 1;

  if not (v_sf->'mitglieder'->'sfv' @> '["spielerpass"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: spielerpass steht nicht in der SFV-Spalte'; end if;

  /* Genau EIN Feld. Waechst die Liste unbemerkt, faellt es hier auf. */
  if jsonb_array_length(v_sf->'mitglieder'->'sfv') <> 1
  then raise exception 'UNVOLLSTAENDIG: % Felder in mitglieder.sfv statt genau 1',
       jsonb_array_length(v_sf->'mitglieder'->'sfv'); end if;

  raise notice 'Fertig: mitglieder.spielerpass steht in der SFV-Spalte, sonst nichts.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

select jsonb_pretty(sync_felder->'mitglieder') from public.api_verbindungen where key='football_ch';
-- erwartet: sfv = ["spielerpass"], sonst nichts

-- Nach dem naechsten Lauf: was hat der Verband geliefert und was stand vorher?
-- select m.id, m.spielerpass, a.alter_wert, a.neuer_wert, a.geaendert_von, a.geaendert_at
--   from public.mitglieder_aenderungen a
--   join public.mitglieder m on m.id = a.mitglied_id
--  where a.feld = 'spielerpass' and a.geaendert_von = 'SFV-Sync'
--  order by a.geaendert_at desc;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Der Sync hoert sofort auf zu schreiben; bereits uebernommene Nummern
-- bleiben stehen und sind ueber den Verlauf nachvollziehbar.
--
-- begin;
--   update public.api_verbindungen
--      set sync_felder = sync_felder - 'mitglieder'
--    where key = 'football_ch';
-- commit;
