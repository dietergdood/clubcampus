-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — den WordPress-Export scharfschalten
-- 10.09.2026
--
-- ⚠ ⚠  ZULETZT, NICHT ZUERST. Der Waechter nimmt eine Zeile erst dann in
--       seine Schleife auf, wenn `active` UND `auto_sync` gesetzt sind.
--
--   Ohne den geaenderten Waechter (cron_waechter_export.sql) meldete er
--   ab der dritten Stunde alle zwei Stunden, der Export sei ueberfaellig
--   — fuer einen Export, der genau das tut, was er soll. Und eine
--   Warnung, die immer dasselbe sagt, wird nach dem dritten Mal
--   abgeschaltet statt gelesen.
--
--   Reihenfolge:  1) cron_wp_export.sql       (der Abholer)
--                 2) cron_waechter_export.sql (die zweite Frage)
--                 3) DIESE DATEI
--
-- ⚠ Eine einzelne Anweisung, keine Transaktionshuelle, `returning` als
--   Ausgabe — sie kann nicht „Success" melden und nichts tun. Bleibt sie
--   wirkungslos, liefert sie NULL ZEILEN, und das steht in der Ausgabe.
-- ═══════════════════════════════════════════════════════════════════════════

update public.api_verbindungen
   set active = true, auto_sync = true
 where key = 'wordpress'
   and (active is not true or auto_sync is not true)
returning key, active, auto_sync, letzter_sync,
          public.export_wartet(verein_id) as wartet_jetzt;

-- ⚠ Null Zeilen heisst: schon scharf, oder es gibt keine Zeile mit
--   key = 'wordpress'. Die zweite Lage sieht man an:
--
--   select key, active, auto_sync from public.api_verbindungen order by key;
