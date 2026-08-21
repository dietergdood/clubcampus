-- ═══════════════════════════════════════════════════════════════════════════
-- WAECHTER-ZEITSTEMPEL
-- 21.08.2026
--
-- Eine Spalte: wann der Sync-Waechter zuletzt gelaufen ist.
--
-- ⚠ WER SIE LIEST, STEHT IM SELBEN AUFTRAG (CLAUDE.md-Regel): die
-- API-Kachel in der Portalverwaltung (`src/modules/portal/ApiTab.tsx`) zeigt
-- „Waechter: vor 12 Minuten". Ohne diesen Leser waere sie der naechste Fall
-- von `zaehlt_als_mitgliedschaft` — eine Spalte, die niemand ausliest, ist
-- von einer, die niemand befuellt, an der Oberflaeche nicht zu unterscheiden.
--
-- WOZU
--   Der Waechter meldet, wenn der Sync ausfaellt. Faellt der WAECHTER aus,
--   schweigt er — und Schweigen ist von Zufriedenheit nicht zu
--   unterscheiden. Diese Spalte macht seinen eigenen Ausfall wenigstens
--   SICHTBAR, sobald jemand hinschaut. Sie loest das Problem nicht; dafuer
--   gibt es den Totmannschalter in `cron_sync_waechter.sql`.
--
-- ZAEHLPROBE — Erwartungswerte aus `supabase/schema.sql`:
--
--   CREATE TABLE              91 -> 91   (+-0)
--   CREATE POLICY            174 -> 174  (+-0)
--   CREATE INDEX              63 -> 63   (+-0)
--   ADD CONSTRAINT           312 -> 312  (+-0)
--
-- ⚠ ALLE VIER BLEIBEN GLEICH, und das ist richtig: eine Spalte ohne
-- Constraint, ohne Index und ohne Default bewegt keinen der vier Zaehler.
-- Wer hier eine Veraenderung erwartet, sucht sie vergebens — die Probe ist
-- `information_schema.columns`, nicht der Dump.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_anz int;
begin

  alter table public.api_verbindungen
    add column if not exists wache_zuletzt timestamptz;

  comment on column public.api_verbindungen.wache_zuletzt is
    'Wann der Sync-Waechter (cron: sync-waechter-stuendlich) zuletzt geprueft hat. Gelesen von ApiTab.';

  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='api_verbindungen'
     and column_name='wache_zuletzt';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: wache_zuletzt fehlt.'; end if;

  raise notice 'wache_zuletzt angelegt. Leer, bis der Waechter das erste Mal laeuft.';
end $mig$;
