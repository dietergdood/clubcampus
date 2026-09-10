-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — spiele.sfv_runde heisst jetzt spiele.sfv_spieltag
-- 10.09.2026
--
-- ⚠ ⚠  MEINE ANNAHME WAR FALSCH, UND SIE STAND EINEN TAG LANG ALS TATSACHE
--       IN EINEM SPALTENKOMMENTAR.
--
--   migration_spiele_runde.sql sagte ueber sfv_runde:
--
--     „SFV playDayName — der Rundenname im Klartext (1. Runde,
--      Achtelfinal)."
--
--   Gemessen von der Website-Seite am 10.09.2026 ueber alle 270 Spiele:
--
--     /spiele/336/  Meisterschaft   runde „Gruppe  2"
--     /spiele/338/  Cup             runde „Samstag"
--     /spiele/448/  Trainingsspiel  runde „Samstag"
--
--   **`playDayName` ist der SPIELTAG, nicht die Runde.** 36 Spiele
--   betroffen: 13 Cup, 23 Trainingsspiele. Auf der Website stand
--   „CUP · SAMSTAG", waehrend links daneben schon „Sa. 19.09. · 19:30"
--   steht — der Wochentag zweimal in derselben Zeile.
--
-- ⚠ WARUM UMBENENNEN UND NICHT NUR DEN KOMMENTAR BERICHTIGEN. Eine Spalte
--   `sfv_runde`, in der „Samstag" steht, ist genau die Falle, die dieses
--   Projekt schon dreimal protokolliert hat: eine Beschriftung, die mehr
--   verspricht als der Inhalt haelt. Der naechste Leser baut darauf, ohne
--   nachzusehen — so wie ich auf `playDayName` gebaut habe, ohne es zu
--   messen.
--
-- ⚠ UND DAS IST DER PUNKT, AN DEM ICH GEGEN MEINE EIGENE REGEL VERSTOSSEN
--   HABE. Im Kopf von migration_spiele_runde.sql stand:
--
--     „Was sie bei einem Cupspiel enthalten, ist ungemessen: die
--      Swagger-Datei hat zu keinem eine Beschreibung, und in der
--      aufgezeichneten Beispielantwort ist kein Cupspiel. Erst messen,
--      dann eine Spalte."
--
--   Ich habe die Warnung geschrieben und die Spalte trotzdem gebaut, weil
--   der Auftrag „bau die Cup-Runde" lautete. Richtig waere gewesen, die
--   Probe (`aktion: "cupprobe"`) EINMAL laufen zu lassen — sie war fertig
--   und haette „Samstag" in ihren Beispielen gezeigt.
--
-- ⚠ sfv_runde_nr BLEIBT WIE ES IST. `roundNbr` ist eine Zahl und kann
--   weiterhin die Runde sein; gemessen ist es nicht. Es wird nach wie vor
--   von keiner Anzeige gelesen und ist die Gegenprobe: steht dort bei
--   Cupspielen eine aufsteigende Zahl und bei Meisterschaftsspielen der
--   Spieltag, sind es zwei verschiedene Dinge in einem Feld.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiele
  rename column sfv_runde to sfv_spieltag;

comment on column public.spiele.sfv_spieltag is
  'SFV playDayName. GEMESSEN am 10.09.2026: enthaelt den WOCHENTAG („Samstag"), nicht den Rundennamen. Wird von keiner Anzeige gelesen — die Website zeigt den Wochentag ohnehin aus dem Datum. Hiess bis dahin sfv_runde, was eine falsche Zusage war.';

-- Die Feldhoheit zieht mit: der Sync schreibt jetzt sfv_spieltag.
do $mig$
declare v_sf jsonb;
begin
  update public.api_verbindungen a
     set sync_felder = jsonb_set(
           a.sync_felder, '{spiele,sfv}',
           (select coalesce(jsonb_agg(case when v = '"sfv_runde"'::jsonb
                                           then '"sfv_spieltag"'::jsonb else v end), '[]'::jsonb)
              from jsonb_array_elements(a.sync_felder->'spiele'->'sfv') v))
   where a.key = 'football_ch';

  select sync_felder into v_sf from public.api_verbindungen where key = 'football_ch' limit 1;

  if v_sf->'spiele'->'sfv' @> '["sfv_runde"]'::jsonb
  then raise exception 'UNVOLLSTAENDIG: sfv_runde steht noch in spiele.sfv'; end if;
  if not (v_sf->'spiele'->'sfv' @> '["sfv_spieltag"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: sfv_spieltag fehlt in spiele.sfv'; end if;
  if not (v_sf->'spiele'->'sfv' @> '["sfv_runde_nr","sfv_gruppe","liga"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: bestehende Felder verloren'; end if;

  raise notice 'Fertig: sfv_runde heisst sfv_spieltag, Feldhoheit nachgezogen.';
end $mig$;

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- ⚠ Die zweite Zeile ist die eigentliche Frage: ist roundNbr bei Cupspielen
--   etwas anderes als bei Meisterschaftsspielen? Wenn ja, koennte dort die
--   Runde stehen — und dann waere sie ueber eine ZAHL zu haben, nicht ueber
--   einen Namen. Ausgeschrieben wird sie trotzdem nicht (Achtelfinal).
--
--   select wettbewerb,
--          count(*)                        as spiele,
--          count(sfv_spieltag)             as mit_spieltag,
--          min(sfv_runde_nr)               as kleinste_nr,
--          max(sfv_runde_nr)               as groesste_nr,
--          count(distinct sfv_spieltag)    as verschiedene_spieltage
--     from public.spiele group by 1 order by 2 desc;
--
-- Erwartung nach dem Befund: `verschiedene_spieltage` <= 7. Steht dort mehr,
-- ist playDayName doch nicht bloss der Wochentag — dann noch einmal messen.
