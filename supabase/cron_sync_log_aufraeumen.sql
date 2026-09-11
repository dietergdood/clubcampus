-- ═══════════════════════════════════════════════════════════════════════════
-- DER AUFRUFER ZU raeume_sync_log() — taeglich 03:33
-- 11.09.2026
--
-- ⚠  WARUM ER IM SELBEN AUFTRAG ENTSTEHT WIE DIE FUNKTION
--
--   Am 10.09.2026 standen in diesem Projekt FUENFZEHN exportierte
--   Funktionen ohne einen einzigen Aufrufer, darunter `leseHalbzeit()` —
--   drei Wochen fertig, mit vier Testfaellen, verdrahtet bis zur letzten
--   Zeile, nie gerufen. Der sechzehnte Fall (`export_wartet()`) war beim
--   Abliefern SECHZIG MINUTEN alt.
--
--   **Die Luecke entsteht nicht durch Vergessen, sondern durch die
--   Reihenfolge des Bauens:** man baut das Werkzeug, weil man es gleich
--   brauchen wird, und zwischen beiden liegt ein Bericht, eine Freigabe,
--   eine Nacht. Deshalb steht der Aufrufer hier und nicht im naechsten
--   Auftrag.
--
--
-- ⚠ ⚠  ER RUFT OHNE ARGUMENT — DAS IST DIE GANZE POINTE
--
--     perform public.raeume_sync_log();     -- nicht (14)
--
--   Die Frist steht als Vorgabewert an der Funktion, an genau einer Stelle.
--   Stuende sie hier noch einmal, gaebe es zwei Fristen — und die zweite
--   kennt niemand (Didi, 11.09.2026). Wer die Frist aendert, aendert sie an
--   der Funktion; dieser Auftrag muss dafuer nicht angefasst werden.
--
--
-- ⚠  03:33, UND ZWAR NEBEN ALLEM ANDEREN
--
--     :17    sfv-sync, stuendlich, bis zu 120 Sekunden
--     :47    sync-waechter, stuendlich
--     */15   wp-export-Abholer
--
--   Ein Loeschlauf, der gleichzeitig mit einem Schreiblauf liegt, ist nicht
--   gefaehrlich (verschiedene Zeilen), aber er macht ein Protokoll
--   schwerer zu lesen. Taeglich genuegt: bei rund 33 Zeilen am Tag geht es
--   um Dutzende, nicht um Tausende.
--
--
-- ⚠  DIESER AUFTRAG STEHT IN KEINEM schema.sql
--
--   `cron.job` liegt im Schema `cron`. Wie der SFV-Zeitplan, der Waechter
--   und der Abholer geht er bei einem Nachbau verloren — und auch das faellt
--   nicht auf: die Tabelle waechst dann einfach wieder. Eingetragen in
--   ARCHITECTURE.md → „schema.sql baut die Datenbank NICHT nach".
-- ═══════════════════════════════════════════════════════════════════════════

do $auftrag$
declare
  v_anz int;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron ist nicht aktiviert (Dashboard → Database → Extensions)';
  end if;

  /* ⚠ ABBRECHEN statt einen Auftrag anzulegen, der jede Nacht scheitert.
     `cron.schedule` PRUEFT DEN BEFEHL NICHT — es speichert eine
     Zeichenkette. Am 21.08.2026 lief das Einrichten zweimal fehlerfrei
     durch und hinterliess einen Befehl, der stuendlich scheiterte. */
  if to_regprocedure('public.raeume_sync_log(int)') is null then
    raise exception 'ABBRUCH: raeume_sync_log() fehlt — erst migration_sync_log_aufraeumen.sql.';
  end if;

  perform cron.schedule(
    'sync-log-aufraeumen-taeglich',
    '33 3 * * *',
    $job$ select public.raeume_sync_log(); $job$);

  select count(*) into v_anz
    from cron.job where jobname = 'sync-log-aufraeumen-taeglich';
  if v_anz <> 1 then
    raise exception 'UNVOLLSTAENDIG: Aufraeum-Auftrag nicht angelegt';
  end if;
end $auftrag$;

/* ⚠ Der gespeicherte Befehl einmal ausfuehren, bevor man ihm glaubt —
   dieselbe Probe wie beim Waechter. `rollback` nimmt das delete zurueck.

   begin;
     do $probe$ declare c text; begin
       select command into c from cron.job
        where jobname = 'sync-log-aufraeumen-taeglich';
       execute c;
     end $probe$;
   rollback;
*/


-- ─── Nachschauen ───────────────────────────────────────────────────────────
-- Lief er, und was hat er getan?
--   select start_time at time zone 'Europe/Zurich', status, return_message
--     from cron.job_run_details d
--     join cron.job j on j.jobid = d.jobid
--    where j.jobname = 'sync-log-aufraeumen-taeglich'
--    order by start_time desc limit 7;
--
-- ⚠ `status = 'succeeded'` heisst hier WIRKLICH „ausgefuehrt" — anders als
--   beim SFV-Zeitplan, wo es nur „die HTTP-Anfrage wurde abgesetzt" heisst.
--   Der Unterschied: dieser Auftrag laeuft vollstaendig in der Datenbank.
--   Die ZAHL steht trotzdem nicht darin; dafuer:
--
--   select count(*), min(gestartet_am)::date, max(gestartet_am)::date
--     from public.api_sync_log;
--
--   Bei 14 Tagen Frist muss `min` ab dem zweiten Lauf hoechstens 14 Tage
--   zurueckliegen — ausser bei den je Anschluss behaltenen Anfangszeilen.
