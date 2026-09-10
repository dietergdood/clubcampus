-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — spiele.sfv_runde / spiele.sfv_runde_nr
-- 10.09.2026
--
-- ⚠ ANLASS. Cupspiele tragen kein `runde` — 13 von 13, gemessen von der
--   Website-Seite am 10.09.2026. Der Grund ist kein Fehler: `runde` kommt
--   aus `groupName`, und ein Cupspiel hat keine Gruppe.
--
--   Der Spielplan-Endpunkt fuehrt daneben `playDayName` (Text) und
--   `roundNbr` (Zahl). Beide kommen bei JEDEM Abruf ohnehin mit — die
--   Spalten kosten keinen zusaetzlichen Aufruf beim Verband.
--
-- ⚠ ⚠  WER LIEST DIESE SPALTEN — die Frage, die hier hingehoert:
--
--     sfv_runde     wird gelesen. `bildeSpiel()` in wpNutzlast.ts setzt
--                   `runde` daraus, wenn `sfv_gruppe` leer ist. Ab dem
--                   naechsten Export steht sie auf der Website.
--
--     sfv_runde_nr  wird HEUTE VON NIEMANDEM GELESEN, und das ist Absicht.
--                   Sie ist die Gegenprobe zu sfv_runde: steht dort ein
--                   Text und hier eine Zahl, passen sie zusammen; ist der
--                   Text leer und die Zahl da, liefert der Verband die
--                   Runde nur als Nummer — und DAS ist dann der Befund.
--
--                   ⚠ Sie wird NICHT zu „Runde 3" ausgeschrieben. Ein
--                   Cup hat spaete Runden mit Namen (Achtelfinal,
--                   Viertelfinal); aus roundNbr = 5 „Runde 5" zu machen
--                   waere plausibel und falsch — genau die Sorte
--                   Erfindung, die auf einer oeffentlichen Seite nicht
--                   mehr von einer Auskunft zu unterscheiden ist.
--
-- ⚠ FELDHOHEIT. Beide gehoeren dem VERBAND und stehen deshalb unter `sfv`
--   in api_verbindungen.sync_felder. Der Sync ueberschreibt sie bei jedem
--   Lauf; von Hand gepflegte Werte haetten hier keinen Bestand. Wer eine
--   eigene Rundenbezeichnung braucht, braucht eine eigene Spalte — wie
--   `treffpunkt` und `notes` es sind.
--
-- ⚠ NULLABLE. Ein Meisterschaftsspiel hat keine Runde in diesem Sinn, und
--   ein Vorgabewert waere eine erfundene Angabe. Leer heisst „der Verband
--   nennt keine" — und das ist die Wahrheit ueber diese Zeilen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiele
  add column if not exists sfv_runde    text,
  add column if not exists sfv_runde_nr integer;

comment on column public.spiele.sfv_runde is
  'SFV playDayName — der Rundenname im Klartext („1. Runde", „Achtelfinal"). Gehoert dem Verband, wird bei jedem Sync ueberschrieben. NULL, wenn er keinen nennt.';

comment on column public.spiele.sfv_runde_nr is
  'SFV roundNbr. GEGENPROBE zu sfv_runde, keine Anzeigequelle: aus einer Zahl „Runde 5" zu machen waere bei Achtelfinal & Co. plausibel und falsch.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Nach dem naechsten Sync-Lauf. Die erste Zeile ist die Frage, um die es
-- geht: tragen Cupspiele jetzt einen Rundennamen?
--
--   select wettbewerb,
--          count(*)                                            as spiele,
--          count(*) filter (where coalesce(sfv_gruppe,'') = '') as ohne_gruppe,
--          count(sfv_runde)                                     as mit_rundenname,
--          count(sfv_runde_nr)                                  as mit_rundennummer,
--          count(*) filter (where coalesce(liga,'') = '')       as ohne_liga
--     from public.spiele
--    where verein_id = (select id from public.vereine limit 1)
--    group by 1 order by 2 desc;
--
-- ⚠ `ohne_liga` steht bewusst daneben: die Website-Seite hat gemeldet, bei
--   Cupspielen fehle die Cup-ART. Gemessen ist `wettbewerb` die
--   BETRIEBSART (matchTypeName: „Cup") und `liga` der WETTBEWERB
--   (leagueName: „Cup AJF (4./5. Liga)"). Ist `ohne_liga` gross, fehlt die
--   Art wirklich — dann liegt es an der Quelle. Ist sie null, wurde nur
--   das falsche Feld gelesen.
