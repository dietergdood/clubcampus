-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — ht_resultat gehoert wieder dem SFV
-- 10.09.2026
--
-- ⚠ ⚠  DAS IST DIE RUECKNAHME EINER ENTSCHEIDUNG VOM 14.08.2026 — und der
--       Grund ist nicht, dass sie falsch war, sondern dass ihre
--       VORAUSSETZUNG weggefallen ist.
--
--   `migration_sfv_sync.sql`, Block B, schrieb woertlich:
--
--     „ht_resultat stand in der sfv-Liste, aber /api/club/schedule liefert
--      GAR KEINE Halbzeit — nachgeprueft an der echten Antwort. Es steht
--      nur in /api/match/{matchId} unter intermediateResults, und das
--      waeren 268 zusaetzliche Aufrufe pro Lauf, stuendlich."
--
--   **Beide Saetze stimmen bis heute. Der Schluss stimmt nicht mehr.**
--   `holeMatch` wird seit dem 19.08.2026 bei JEDEM Spiel des
--   Matchdaten-Laufs aufgerufen — und sein Ergebnis in derselben Zeile
--   weggeworfen. Die 268 Aufrufe sind nicht zusaetzlich; sie sind bereits
--   bezahlt.
--
-- ⚠ **Eine Entscheidung, die damals richtig war und die seither niemand
--   nachgeprueft hat, ist nicht falsch geworden — die Lage hat sich
--   geaendert.** (CLAUDE.md, 09.09.2026.) Genau dieser Fall, drei Wochen
--   spaeter bemerkt, weil jemand nach dem Halbzeitstand gefragt hat.
--
-- ── Der Einwand von damals gilt weiter, und er wird beantwortet ───────────
--
--   „Bliebe die Deklaration stehen, schriebe der Sync stuendlich NULL
--    ueber eine von Hand erfasste Halbzeit — genau der Schaden, gegen den
--    die Feldhoheit gebaut wurde."
--
--   **Deshalb schreibt der Lauf NIE null.** `leseHalbzeit()` gibt vier
--   Zustaende zurueck; nur `da` fuehrt zu einem Update. Wer eine Halbzeit
--   von Hand erfasst hat, behaelt sie, solange der Verband keine liefert.
--
--   ⚠ Die Feldhoheit allein haette das nicht sichergestellt — sie sagt,
--   WER schreiben darf, nicht WANN. Der Schutz steht im Code, und dieser
--   Kommentar sagt, wo: matchdatenLauf.ts, Abschnitt „Halbzeitstand".
--
-- ── Warum es ueberhaupt eine Migration braucht ────────────────────────────
--
--   `schneideAufFeldhoheit()` schneidet jedes Feld weg, das nicht unter
--   `sfv` steht — **wortlos, bis zum 10.09.2026 sogar ohne Meldung**. Genau
--   so sind `sfv_runde` und `sfv_runde_nr` heute Morgen bei allen 270
--   Spielen auf NULL geblieben, obwohl der Sync sie berechnete. Ohne diese
--   Migration passierte dem Halbzeitstand dasselbe.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

update public.api_verbindungen a
   set sync_felder = jsonb_set(
         a.sync_felder,
         '{spiele}',
         (a.sync_felder->'spiele') || jsonb_build_object(
           'verein', (select coalesce(jsonb_agg(v), '[]'::jsonb)
                        from jsonb_array_elements(a.sync_felder->'spiele'->'verein') v
                       where v <> '"ht_resultat"'::jsonb),
           'sfv',    (a.sync_felder->'spiele'->'sfv') || '["ht_resultat"]'::jsonb
         )
       )
 where a.key = 'football_ch'
   and a.sync_felder->'spiele'->'verein' @> '["ht_resultat"]'::jsonb;

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Es steht genau einmal, und auf der richtigen Seite:
--
--   select
--     (sync_felder->'spiele'->'sfv')    @> '["ht_resultat"]'::jsonb as bei_sfv,
--     (sync_felder->'spiele'->'verein') @> '["ht_resultat"]'::jsonb as bei_verein,
--     jsonb_array_length(sync_felder->'spiele'->'sfv')    as anz_sfv,
--     jsonb_array_length(sync_felder->'spiele'->'verein') as anz_verein
--     from public.api_verbindungen where key = 'football_ch';
--
-- ⚠ Erwartung: bei_sfv true, bei_verein false, sfv 21, verein 7.
--   Vorher waren es 20 und 8. **Die Summe muss gleich bleiben** — steht
--   dort 21 und 8, ist das Feld in BEIDEN Listen, und dann entscheidet
--   die Reihenfolge im Code statt der Vertrag.
--
-- 2 · Nach dem naechsten Matchdaten-Lauf — und die Zahl steht auch in der
--     Meldung der Kachel:
--
--   select count(*) filter (where ht_resultat is not null) as mit_halbzeit,
--          count(*) filter (where ht_resultat is null)     as ohne,
--          count(*) filter (where ht_resultat = '0:0')     as torlos
--     from public.spiele
--    where matchdaten_geholt_am is not null;
--
-- ⚠ `torlos` steht mit Absicht daneben: „0:0" ist ein WERT, kein Fehlen.
--   Wer die Spalte mit `if (!wert)` prueft, verschluckt genau diese
--   Spiele — und eine torlose erste Halbzeit ist keine Seltenheit.
--
-- 3 · Und die Gegenrichtung, die dieser Migration ihren Namen gibt:
--     schreibt der Lauf eine von Hand erfasste Halbzeit tot?
--
--   Vor dem Lauf bei einem Spiel OHNE Verbandsangabe von Hand setzen:
--     update public.spiele set ht_resultat = '9:9' where id = '…';
--   Nach dem Lauf muss dort weiterhin '9:9' stehen.
--
-- ⚠ Das ist die eigentliche Probe. Die Feldhoheit sagt, WER schreiben
--   darf; dass der Lauf nicht NULL darueberschreibt, sagt allein der Code.
