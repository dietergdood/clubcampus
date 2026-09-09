-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — ranglisten.sfv_saison_name
-- 10.09.2026
--
-- Die Saison steht auf der Teamseite als „2026/27". Woher der Wert kommt,
-- war bis heute unklar; gemessen: ein Postmeta ohne Feldgruppe, von der
-- Saat an zwei Mannschaften geschrieben.
--
-- ⚠ WARUM EINE SPALTE UND NICHT ABGELEITET. Aus `sfv_saison_id = 2027`
--   liesse sich „2026/2027" ausrechnen — heute richtig, und still falsch,
--   sobald der Verband anders benennt. Die Schreibweise gehoert dem
--   Verband; wir schreiben sie ab, statt sie zu erzeugen.
--
-- ⚠ UND SIE GEHOERT IN DIESE TABELLE, nicht in api_sync_log. Der Name
--   soll aus DERSELBEN Zeile kommen wie Liga und Gruppe (Bedingung Didi,
--   09.09.2026) — ein zweiter Zugriff koennte eine andere Saison treffen.
--   Im Protokoll steht er zwar auch (`details.saison.name`), aber ein
--   Protokoll ist eine Aufzeichnung und keine Datenquelle.
--
-- ⚠ NULLABLE, mit Absicht. Zeilen aus Laeufen vor heute haben ihn nicht,
--   und ein Vorgabewert waere eine erfundene Saison. Leer heisst „von
--   einem Lauf, der die Spalte noch nicht kannte" — und das ist die
--   Wahrheit ueber diese Zeilen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.ranglisten
  add column if not exists sfv_saison_name text;

comment on column public.ranglisten.sfv_saison_name is
  'SFV seasonName, z.B. „2026/2027" — die Schreibweise des Verbands. NULL bei Zeilen aus Laeufen vor dem 10.09.2026. Nicht aus sfv_saison_id ableiten: die Benennung gehoert dem Verband.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Nach dem naechsten Sync-Lauf sollte jede Zeile der laufenden Saison einen
-- Namen tragen. Bleibt er leer, schreibt der Sync ihn nicht:
--
--   select sfv_saison_id, sfv_saison_name, count(*)
--     from public.ranglisten group by 1, 2 order by 1;
