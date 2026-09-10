-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — ein falsches Datum in einem Spaltenkommentar
-- 10.09.2026
--
-- ⚠ ANLASS. Ich habe heute durchgehend „11.09.2026" geschrieben — 83 Stellen
--   in 31 Dateien. Heute ist der 10.09.2026. Didi hat es an einem Hinweistext
--   im Portal gesehen.
--
--   82 davon standen in Dateien und sind mit einer Ersetzung berichtigt.
--   EINE steht in der DATENBANK, als Spaltenkommentar — und dorthin reicht
--   keine Ersetzung im Repository.
--
-- ⚠ WARUM schema.sql NICHT VON HAND BERICHTIGT WIRD: er ist ERZEUGT. Wer
--   einen Dump von Hand aendert, aendert nichts, und der naechste Dump nimmt
--   es zurueck — dieselbe Falle wie am 22.08.2026 beim Begriff „Supporter".
--   Die Aenderung gehoert in eine Migration; danach stimmt der Dump von
--   selbst.
--
-- ⚠ UND DAS IST DER GRUND, WARUM EIN DATUM IN EINEM KOMMENTAR KEIN
--   SCHMUCK IST. CLAUDE.md sagt: „jede Zahl bekommt ihr Datum in dieselbe
--   Zeile". Ein falsches Datum ist schlechter als keines: es datiert eine
--   Messung auf einen Tag, an dem sie nicht stattfand, und wer spaeter
--   nachrechnet, sucht den Fehler bei sich.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

comment on column public.spiele.sfv_spieltag is
  'SFV playDayName. GEMESSEN am 10.09.2026: enthaelt den WOCHENTAG („Samstag"), nicht den Rundennamen. Wird von keiner Anzeige gelesen — die Website zeigt den Wochentag ohnehin aus dem Datum. Hiess bis dahin sfv_runde, was eine falsche Zusage war.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Kein Kommentar in `public` traegt mehr das falsche Datum:
--
--   select c.relname as tabelle,
--          a.attname as spalte
--     from pg_description d
--     join pg_class c on c.oid = d.objoid
--     join pg_namespace n on n.oid = c.relnamespace
--     join pg_attribute a on a.attrelid = c.oid
--                        and a.attnum = d.objsubid
--    where n.nspname = 'public'
--      and d.description like '%11.09.2026%';
--
-- Erwartung: null Zeilen.
