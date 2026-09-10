-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — api_sync_log.aktion, und was `laeuft` heisst
-- 10.09.2026
--
-- ⚠ ANLASS (Didi). Der Eintrag um 08:26:15 steht auf `ok` und hat
--   `details->'spiele' = null`. Eine Zeile, die spaeter niemand mehr
--   deuten kann:
--
--     · war es ein Lauf, der keine Spiele anfasst?
--     · oder einer, der welche anfassen sollte und keine fand?
--
--   Dieselbe Ununterscheidbarkeit wie „gescheitert" gegen „nichts zu tun",
--   nur eine Ebene hoeher.
--
--   Abgeleitet (nicht gemessen, aber vollstaendig): nach `api_sync_log`
--   schreiben genau ZWEI Stellen — der Sync und die Aktion `namen`. Der
--   Sync schreibt immer `details.spiele`. Also war es ein `namen`-Lauf.
--   **Genau das soll man kuenftig ablesen koennen, statt es abzuleiten.**
--
-- ⚠ WARUM EINE SPALTE UND NICHT EIN FELD IN `details`. `details` ist eine
--   Allowlist je Aktion — jede schreibt etwas anderes hinein, und genau
--   deshalb taugt es nicht fuer die Frage „welche Aktion war das?". Eine
--   Auskunft ueber die ZEILE gehoert an die Zeile.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.api_sync_log
  add column if not exists aktion text;

comment on column public.api_sync_log.aktion is
  'Welche Aktion diese Zeile erzeugt hat: sync, namen, wechselnachtrag. NULL bei Zeilen vor dem 10.09.2026 — dort ist es nur aus details ableitbar (der Sync schreibt immer details.spiele, namen nie).';

-- ⚠ DER WICHTIGERE KOMMENTAR. Er steht bewusst in der DATENBANK und nicht
--   nur im Code: wer die Tabelle im SQL-Editor liest, hat den Code nicht
--   daneben — und `laeuft` liest sich wie „laeuft gerade".
comment on column public.api_sync_log.status is
  'ok | warnung | fehler | laeuft. ⚠ `laeuft` heisst NICHT „laeuft gerade": die Zeile wird VOR dem ersten Abruf geschrieben und am Ende ueberschrieben. Bleibt sie stehen, ist der Lauf GESTORBEN. Aelter als die Laufsperre (15 Minuten) ist der Beleg dafuer — ein abgebrochener Lauf hinterliess bis dahin ueberhaupt keine Spur, und „gescheitert" sah aus wie „nichts zu tun".';

comment on column public.api_sync_log.beendet_am is
  'NULL solange status = laeuft. Zusammen mit gestartet_am die Laufdauer — und bei einer haengengebliebenen Zeile das Alter, an dem man sie als gestorben erkennt.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Nach dem naechsten Lauf traegt jede neue Zeile eine Aktion:
--
--   select gestartet_am at time zone 'Europe/Zurich' as zeit,
--          aktion,
--          status,
--          details ? 'spiele' as hat_spiele
--     from public.api_sync_log
--    order by gestartet_am desc
--    limit 10;
--
-- ⚠ Die alten Zeilen bleiben auf NULL. Das ist richtig so: eine Aktion
--   nachtraeglich hineinzuschreiben waere geraten, und geratene Werte in
--   einem Protokoll sind schlimmer als leere.
--
-- Und die Frage, fuer die der Umbau da ist:
--
--   select gestartet_am at time zone 'Europe/Zurich' as zeit,
--          aktion,
--          age(now(), gestartet_am) as alter_der_zeile
--     from public.api_sync_log
--    where status = 'laeuft'
--    order by gestartet_am desc;
--
-- Steht dort etwas, das aelter als 15 Minuten ist, ist dieser Lauf
-- gestorben — kein Raetselraten ueber Luecken.
