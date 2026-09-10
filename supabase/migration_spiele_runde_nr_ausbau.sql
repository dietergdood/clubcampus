-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — spiele.sfv_runde_nr faellt
-- 10.09.2026
--
-- ⚠ GEMESSEN VON DIDI ueber alle 270 Spiele — und keine meiner drei
--   Deutungen traf zu:
--
--     Meisterschaft    234 Spiele   Werte 1–26, 26 verschiedene
--     Cup               12 Spiele   1–2
--     Trainingsspiele   23 Spiele   durchgehend 0
--     Schweizer-Cup      1 Spiel    105
--
--   `roundNbr` traegt je Wettbewerb etwas anderes. Bei der Meisterschaft
--   den Spieltag, beim Cup vielleicht die Runde, bei Trainingsspielen
--   nichts — und **105 ist keine Rundenzahl**.
--
-- ⚠ WARUM AUSBAUEN UND NICHT UMBENENNEN. Ein Feld, das je nach Zeile
--   etwas anderes bedeutet, hat keinen Namen, der stimmt. Jeder Name waere
--   fuer drei Viertel der Zeilen falsch — und ein falscher Name ist genau
--   das, was `sfv_runde` (= Wochentag) und `wettbewerb` (= Betriebsart)
--   heute schon anrichten.
--
-- ⚠ DIE EIGENTLICHE BEGRUENDUNG IST ABER EINE ANDERE, und sie ist Didis:
--   die Spalte wurde „auf Verdacht" behalten — ungemessen, von nichts
--   gelesen. Das ist dieselbe Bauart wie `sfv_liga_name` am Team, das
--   ausgebaut werden soll, und wie `playDayName`, das gerade eben
--   zurueckgebaut wurde. **Behalten auf Verdacht ist die Fehlerklasse,
--   nicht der Einzelfall.**
--
-- ⚠ UND WENN roundNbr WEITER ANKOMMT, GEHOERT ES IN unbeachtete_felder,
--   NICHT IN EINE SPALTE. Der Empfaenger meldet seit 0.7.0, was die
--   Nutzlast bringt und niemand schreibt; die Feldhoheit meldet seit
--   heute, was der Sync berechnet und niemand erlaubt. Beide Melder sind
--   der richtige Ort fuer ein Feld ohne Zweck — eine Spalte ist es nicht.
--
-- ⚠ KEIN DATENVERLUST, DER SCHMERZT: die Werte kommen bei jedem Abruf
--   erneut mit. Wer sie je braucht, holt sie in einem Lauf zurueck.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Erst die Feldhoheit, dann die Spalte: solange der Name in sync_felder
-- steht, meldet `schneideAufFeldhoheit()` ihn als „genannt, aber nicht
-- berechnet" — und das ist ein throw, kein Hinweis.
do $mig$
declare v_sf jsonb;
begin
  update public.api_verbindungen a
     set sync_felder = jsonb_set(
           a.sync_felder, '{spiele,sfv}',
           (select coalesce(jsonb_agg(v), '[]'::jsonb)
              from jsonb_array_elements(a.sync_felder->'spiele'->'sfv') v
             where v <> '"sfv_runde_nr"'::jsonb))
   where a.key = 'football_ch';

  select sync_felder into v_sf
    from public.api_verbindungen
   where key = 'football_ch'
   limit 1;

  if v_sf->'spiele'->'sfv' @> '["sfv_runde_nr"]'::jsonb
  then raise exception 'UNVOLLSTAENDIG: sfv_runde_nr steht noch in spiele.sfv'; end if;

  -- Gegenrichtung: nichts darf dabei verloren gegangen sein.
  if not (v_sf->'spiele'->'sfv' @> '["sfv_spieltag","sfv_gruppe","liga","wettbewerb"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: bestehende Felder aus spiele.sfv verloren'; end if;

  raise notice 'Feldhoheit: sfv_runde_nr entfernt.';
end $mig$;

alter table public.spiele
  drop column if exists sfv_runde_nr;

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Die Spalte ist weg, und die Feldhoheit nennt sie nicht mehr:
--
--   select count(*) as spalte_da
--     from information_schema.columns
--    where table_schema = 'public'
--      and table_name = 'spiele'
--      and column_name = 'sfv_runde_nr';
--
--   select sync_felder->'spiele'->'sfv' as felder
--     from public.api_verbindungen
--    where key = 'football_ch';
--
-- ⚠ Nach dem naechsten Lauf steht `roundNbr` NICHT in
--   `feldhoheit_weggeschnitten` — der Sync berechnet es gar nicht mehr.
--   Stuende es dort, waere die Schreibstelle in sync.ts stehengeblieben.
