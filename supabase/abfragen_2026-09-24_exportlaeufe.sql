-- Die letzten Laeufe je Anschluss — wp-export ('wordpress') und SFV
-- ('football_ch') nebeneinander, mit dem Stand, den die Kachel zeigt.
--
-- Gemessen am 24.09.2026. Anlass: die Kachel zeigte "Letzter Sync 23.9.
-- 23:57" und "ok", obwohl heute mehrere Laeufe stattfanden und eine
-- Trainerzeile drueben ankam.
--
-- ⚠ DER SCHLUESSEL HEISST 'wordpress', NICHT 'wp_export'. Letzteres ist
--   der Name des Vault-Secrets (wp_export_key) und des Cron-Auftrags
--   (wp-export-abholer) — in api_verbindungen.key steht es nie.
--
-- ⚠ AUSLOESER: api_sync_log.gestartet_von hat KEINE Schreibstelle —
--   weder wp-export noch sfv-sync setzt es. Knopf und Cron sind aus
--   dieser Tabelle NICHT zu unterscheiden. Die Spalte steht trotzdem in
--   der Ausgabe, damit das sichtbar ist statt erschlossen.
--
-- ⚠ Ein Lauf, den die Laufsperre abgewiesen hat, schreibt GAR KEINE
--   Zeile (wp-export/index.ts:816, vor dem Log-Insert bei :834). Seine
--   Abwesenheit ist deshalb kein Beleg dafuer, dass nichts versucht
--   wurde — "nicht protokolliert" und "nicht gelaufen" sehen hier gleich
--   aus.
--
-- left join lateral statt join: eine Verbindung OHNE Protokollzeile im
-- Zeitraum bleibt sichtbar. Genau ihre Abwesenheit ist die Auskunft.

select
  v.key,
  v.label,
  l.aktion,
  to_char(l.gestartet_am at time zone 'Europe/Zurich',
          'DD.MM. HH24:MI:SS')                            as gestartet,
  to_char(l.beendet_am   at time zone 'Europe/Zurich',
          'DD.MM. HH24:MI:SS')                            as beendet,
  l.status,
  case
    when l.gestartet_am is null
      then 'KEINE Protokollzeile im Zeitraum'
    when l.status = 'laeuft'
     and l.gestartet_am < now() - interval '30 minutes'
      then 'GESTORBEN — aelter als die Laufsperre, nie abgeschlossen'
    when l.status = 'laeuft'
      then 'OFFEN — innerhalb der Laufsperre, das Alter entscheidet nicht'
    when l.beendet_am is null
      then 'ABSCHLUSS OHNE beendet_am — sollte es nicht geben'
    else 'fertig'
  end                                                     as lage,
  round(extract(epoch from (
    coalesce(l.beendet_am, now()) - l.gestartet_am))::numeric, 1) as dauer_s,
  (l.details is not null)                                 as details_da,
  l.datensaetze_neu                                       as neu,
  l.datensaetze_aktualisiert                              as aktualisiert,
  l.datensaetze_fehler                                    as fehler,
  left(coalesce(l.meldung, ''), 140)                      as meldung,
  l.gestartet_von                                         as ausloeser_immer_null,
  to_char(v.letzter_sync at time zone 'Europe/Zurich',
          'DD.MM. HH24:MI:SS')                            as kachel_letzter_sync,
  v.sync_status                                           as kachel_status,
  to_char(v.sync_laeuft_seit at time zone 'Europe/Zurich',
          'DD.MM. HH24:MI:SS')                            as sperre_seit,
  v.active,
  v.auto_sync
from public.api_verbindungen v
left join lateral (
  select l2.aktion, l2.status, l2.gestartet_am, l2.beendet_am, l2.details,
         l2.meldung, l2.gestartet_von,
         l2.datensaetze_neu, l2.datensaetze_aktualisiert, l2.datensaetze_fehler
    from public.api_sync_log l2
   where l2.verbindung_id = v.id
     and l2.gestartet_am > now() - interval '3 days'
   order by l2.gestartet_am desc
   limit 40
) l on true
order by v.key, l.gestartet_am desc nulls first;

-- ⚠ Bei einer Zeile auf 'laeuft' ist dauer_s eine Wanduhr BIS JETZT,
--   nicht die Laufdauer. Erkennbar daran, dass beendet leer ist.
--
-- Was die Ausgabe entscheidet:
--
--   wordpress-Zeilen von heute, lage = GESTORBEN, details_da = false
--     -> Laeufe fanden statt und starben vor dem Abschluss.
--        sperre_seit sagt, ob die Sperre noch haengt.
--
--   wordpress-Zeilen von heute, lage = fertig, aber kachel_letzter_sync
--   steht beim 23.9.
--     -> ⚠ widerlegt die Analyse vom 24.09.2026: dann gibt es einen
--        Schreibweg, den niemand gefunden hat. letzter_sync (:1001) und
--        der Log-Abschluss (:986) stehen im selben if — sie koennen
--        nach dem Code nicht auseinanderlaufen.
--
--   gar keine wordpress-Zeile von heute
--     -> nur der Weg "Sperre abgewiesen" hat gefeuert. Dann ist offen,
--        woher die Trainerzeile drueben stammt.
