-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — sfv_person_id darf leer sein, sonst gibt es keine
--              Gegnerzeile
-- 10.09.2026
--
-- ⚠ ⚠  ZWEI REGELN, DIE EINANDER AUSSCHLIESSEN — und beide sind von mir.
--
--     sfv_person_id  integer NOT NULL                    (seit 19.08.2026)
--     CHECK (ist_eigener or (sfv_person_id is null …))   (seit 10.09.2026)
--
--   Zusammen sagen sie: eine Gegnerzeile muss die Personennummer weglassen
--   UND darf sie nicht weglassen. **Es kann keine geben.**
--
--   migration_gegner_aufstellung.sql hat den CHECK gesetzt und das
--   NOT NULL nicht angefasst. Der Entwurf sprach von „sfv_person_id ist
--   NULL, und UNIQUE laesst beliebig viele NULLs zu" — richtig gedacht,
--   nur war die Spalte nie nullable gemacht worden.
--
-- ⚠ WARUM ES NICHT AUFGEFALLEN IST: der Lauf brach eine Stufe frueher ab.
--   „no unique or exclusion constraint matching the ON CONFLICT
--   specification" entsteht beim PLANEN der Anweisung, das NOT NULL erst
--   beim Schreiben der Zeile. Wer nur den ersten Fehler behebt, bekommt
--   im naechsten Lauf 23502 — und haelt ihn fuer einen neuen.
--
-- ── Was der Schluessel dazu sagt ──────────────────────────────────────────
--
--   spiel_aufstellung_verein_key UNIQUE (verein_id, spiel_id,
--                                        sfv_person_id)
--
--   bleibt unveraendert richtig: fuer eigene Zeilen ist die Nummer
--   gesetzt und der Schluessel greift; fuer fremde ist sie NULL, und
--   Postgres laesst in einem UNIQUE beliebig viele NULLs zu. Genau
--   deshalb gibt es den zweiten, partiellen Index fuer Gegnerzeilen.
--
-- ⚠ DIESE MIGRATION LOCKERT DIE SPERRE NICHT. Der CHECK bleibt Wort fuer
--   Wort stehen: eine Gegnerzeile traegt weiterhin weder Namen noch
--   Personennummer. Sie macht nur moeglich, dass er ueberhaupt erfuellbar
--   ist.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiel_aufstellung
  alter column sfv_person_id drop not null;

comment on column public.spiel_aufstellung.sfv_person_id is
  'SFV personId. ⚠ NULL bei Gegnerzeilen — erzwungen von spiel_aufstellung_fremde_ohne_person (Entscheid B, 10.09.2026): eine Personennummer ist ueber dieselbe Schnittstelle in einen Namen aufzuloesen und bliebe dauerhaft hier stehen. Fuer eigene Zeilen immer gesetzt; sie ist dort der Schluesselteil.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Eine Gegnerzeile ist jetzt ueberhaupt anlegbar. Diese Anweisung MUSS
--     durchgehen (danach wieder loeschen):
--
--   insert into public.spiel_aufstellung
--          (verein_id, spiel_id, ist_eigener, sfv_team_id, rueckennr)
--   select verein_id, id, false, -1, 99
--     from public.spiele limit 1;
--   -- erwartet: 1 Zeile. Vorher: 23502 not-null violation.
--
--   delete from public.spiel_aufstellung where sfv_team_id = -1;
--
-- 2 · Und die Sperre haelt weiterhin. Diese MUSS scheitern:
--
--   insert into public.spiel_aufstellung
--          (verein_id, spiel_id, ist_eigener, sfv_team_id, rueckennr,
--           sfv_person_id)
--   select verein_id, id, false, -1, 98, 123
--     from public.spiele limit 1;
--   -- erwartet: 23514 check constraint violated
--
-- ⚠ Der zweite Fall ist der wichtigere. Waere er gruen, haette diese
--   Migration die Sperre geoeffnet statt sie erfuellbar zu machen — und
--   das waere das Gegenteil des Entscheids.
