-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — die Verbandskennung des Vereins als SPALTE
-- 14.09.2026
--
-- ⚠ ⚠  ANLASS. 21 von 42 Mannschaften spielen in Turnierform und haben
--      keinen Spielplan über die Schnittstelle — gemessen am 14.09.2026,
--      `zeilen_ohne_bekannte_mannschaft = 0`, also liefert der Verband sie
--      gar nicht. Auf der Website soll bei ihnen ein ehrlicher Satz stehen
--      und ein Link zur Verbandsseite.
--
--      Und genau dieser Link ist ohne diese Spalte nicht baubar.
--
-- ⚠ ⚠  DIE KENNUNG STEHT HEUTE NUR IM SECRET `SFV_CLUB_ID`. Ein Secret gilt
--      PROJEKTWEIT, und projektweit gibt es genau einen Wert — für einen
--      zweiten Verein wäre die Adresse damit nicht baubar. Der offene Punkt
--      steht seit dem 10.09.2026 im Papier.
--
--      https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1&t=<teamId>&a=trr
--                                                ↑ Verein   ↑ Regionalverband
--
-- ⚠ ⚠  ES SIND ZWEI ANGABEN, NICHT EINE. `oid` ist der REGIONALVERBAND, nicht
--      der Verein — der SFV hat dreizehn. Wer nur `v` mandantenfähig macht,
--      hat die Hälfte gemacht, und die andere Hälfte fällt erst auf, wenn
--      ein Klub aus einem anderen Verband dazukommt.
--
-- ⚠  NICHT ZU VERWECHSELN, und das steht im Papier schon dreimal:
--
--      1516   ClubId      — Aufrufe der API UND `v=` im Matchcenter
--                           (heute: Secret SFV_CLUB_ID)
--     11057   clubNumber  — in Ranglisten und Matchdaten
--                           (heute: ranglisten.club_nummer, vereine.sfv_club_nummer)
--        11   oid         — der Regionalverband FVRZ (heute: nirgends)
--
--     Die erste und die zweite sehen beide nach „Vereinsnummer" aus und sind
--     es beide, nur in verschiedenen Systemen. `sfv_club_nummer` ist bereits
--     vergeben — für 11057. Deshalb heisst die neue Spalte anders.
--
-- ⚠  LESEN, NICHT SCHREIBEN: der Sync fasst `vereine` nicht an. Die Spalte
--     wird von Hand gepflegt, wie `slug`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.vereine
  add column if not exists sfv_club_id integer,
  add column if not exists sfv_verband_oid integer;

comment on column public.vereine.sfv_club_id is
  'Die ClubId des Verbands — dieselbe Zahl, die jeder API-Aufruf als ClubId '
  'fuehrt und die im Matchcenter als v=… steht. FCH: 1516. '
  'NICHT sfv_club_nummer (das ist die clubNumber aus Ranglisten, FCH: 11057).';

comment on column public.vereine.sfv_verband_oid is
  'Der Regionalverband im Matchcenter (oid=…). FVRZ: 11. Der SFV hat '
  'dreizehn; ein Klub in einem anderen Verband hat eine andere Zahl.';

-- ── Die Werte für den FCH ──────────────────────────────────────────────────
--
-- ⚠ `v=1516` ist am 05.09.2026 belegt (migration_wp_export.sql:252), `oid=11`
--    am 10.09.2026. Beide sind gemessen und nicht geraten.
--
-- ⚠ `returning` statt stiller Wirkung: eine Änderung, die niemanden trifft,
--    liefert dann null Zeilen, und das steht in der Ausgabe. Ein `raise
--    notice` zeigt der Supabase-Editor NICHT an — am 10.09.2026 ist so eine
--    bestellte Zahl endgültig verloren gegangen.
--
-- ⚠ Bedingung über den INHALT, nicht über einen Schlüssel: trifft sie nicht,
--    sieht man es an den null Zeilen, und ein falsch angenommener Slug kann
--    nicht schaden.
update public.vereine
   set sfv_club_id     = 1516,
       sfv_verband_oid = 11
 where sfv_club_nummer = 11057
   and (sfv_club_id is distinct from 1516 or sfv_verband_oid is distinct from 11)
returning id, name, slug, sfv_club_nummer, sfv_club_id, sfv_verband_oid;

-- ── Gegenprobe ────────────────────────────────────────────────────────────
-- Zweiter Lauf: null Zeilen, sichtbar folgenlos.
select name, slug, sfv_club_nummer as club_nummer_11057,
       sfv_club_id as club_id_1516, sfv_verband_oid as verband_11
  from public.vereine
 order by name;
