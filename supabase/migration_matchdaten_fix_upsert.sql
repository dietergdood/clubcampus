-- ═══════════════════════════════════════════════════════════════════════════
-- MATCHDATEN — der partielle Schluessel taugt nicht fuer den Upsert
-- 20.08.2026
--
-- BEFUND. Der erste Lauf hat die Aufstellungen geschrieben, aber KEIN
-- einziges Ereignis. Angezeigt wurde deshalb "Der SFV hat zu diesem Spiel
-- keinen Verlauf erfasst" — auch beim Cup-Spiel FC Oberland United gegen
-- FC Herrliberg (0:7 am 16.08.), zu dem der Verband 24 Ereignisse liefert.
-- Nachgemessen an der API: HTTP 200, 24 Eintraege. Es lag nicht am SFV.
--
-- URSACHE. migration_matchdaten.sql legt den Schluessel PARTIELL an:
--
--   create unique index spiel_ereignisse_sfv_event_key
--     on public.spiel_ereignisse (verein_id, sfv_event_id)
--     where herkunft = 'sfv';
--
-- Der Sync upserted mit on_conflict=verein_id,sfv_event_id — ohne das
-- Praedikat. Postgres kann einen partiellen Index nur ableiten, wenn die
-- Anweisung dasselbe WHERE mitbringt (ON CONFLICT (…) WHERE …), und PostgREST
-- kann das gar nicht ausdruecken: der Parameter nimmt Spalten, kein Praedikat.
-- Ergebnis bei jedem Spiel mit mindestens einem Ereignis:
--
--   42P10  there is no unique or exclusion constraint matching
--          the ON CONFLICT specification
--
-- WARUM ES SO AUSSAH, ALS FEHLTEN DIE DATEN BEIM VERBAND. Der Aufstellungs-
-- Upsert laeuft VOR dem Ereignis-Upsert und ging durch. Danach warf der
-- zweite, der Lauf zaehlte das Spiel als Fehler und liess
-- matchdaten_geholt_am leer. Spiele OHNE Ereignisse ueberspringen den Upsert
-- (`if (ereignisse.length)`) und galten als erfolgreich — genau die vier, die
-- im Trockenlauf leer waren. Die Symptome kehrten sich also um: was Daten
-- hatte, sah leer aus, und was leer war, sah heil aus.
--
-- WAS DAS PRAEDIKAT UEBERHAUPT BRINGEN SOLLTE: nur SFV-Zeilen tragen eine
-- sfv_event_id, nur sie muessen eindeutig sein. Das ist richtig gedacht und
-- ueberfluessig: Postgres behandelt NULL in einem Unique-Index als
-- verschieden (NULLS DISTINCT ist der Standard). Vereins-Zeilen tragen
-- sfv_event_id = NULL und kollidieren deshalb ohnehin nie — weder
-- untereinander noch mit einer SFV-Zeile.
--
-- Der partielle Index kostete also den Upsert und kaufte nichts.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_partiell int;
  v_unique   int;
begin

  select count(*) into v_partiell
    from pg_indexes
   where schemaname = 'public' and indexname = 'spiel_ereignisse_sfv_event_key';

  execute $q$drop index if exists public.spiel_ereignisse_sfv_event_key$q$;

  /* Als CONSTRAINT, nicht als Index: PostgREST leitet on_conflict darueber
     zuverlaessig ab, und der Name taucht im Dump unter ADD CONSTRAINT auf —
     dort sucht ihn, wer die Zaehlprobe macht. */
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.spiel_ereignisse'::regclass
                    and conname  = 'spiel_ereignisse_sfv_event_key') then
    alter table public.spiel_ereignisse
      add constraint spiel_ereignisse_sfv_event_key unique (verein_id, sfv_event_id);
  end if;

  execute $q$
    comment on constraint spiel_ereignisse_sfv_event_key on public.spiel_ereignisse is
      'Eine SFV-Zeile je Ereignis. BEWUSST NICHT partiell: ein partieller Index laesst sich von ON CONFLICT (spalten) nicht ableiten, und PostgREST kann das noetige Praedikat nicht mitgeben. Vereins-Zeilen tragen sfv_event_id = NULL und kollidieren nie, weil NULL in einem Unique-Index als verschieden gilt.'
  $q$;

  /* ── Pruefung ──────────────────────────────────────────────────────── */

  select count(*) into v_unique
    from pg_constraint
   where conrelid = 'public.spiel_ereignisse'::regclass
     and conname  = 'spiel_ereignisse_sfv_event_key'
     and contype  = 'u';
  if v_unique <> 1
  then raise exception 'UNVOLLSTAENDIG: Unique-Constraint fehlt'; end if;

  select count(*) into v_partiell
    from pg_indexes
   where schemaname = 'public' and indexname = 'spiel_ereignisse_sfv_event_key'
     and indexdef ilike '%where%';
  if v_partiell <> 0
  then raise exception 'UNVOLLSTAENDIG: der Schluessel ist immer noch partiell'; end if;

  raise notice 'Fertig: spiel_ereignisse_sfv_event_key ist jetzt ein Unique-Constraint ohne Praedikat.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.spiel_ereignisse'::regclass and contype = 'u';
-- erwartet: UNIQUE (verein_id, sfv_event_id) — ohne WHERE

select count(*) as ereigniszeilen from public.spiel_ereignisse;
-- vor dem naechsten Lauf 0; danach die Zahl aus der Sync-Antwort


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Nicht empfohlen: er stellt den Fehler wieder her.
--
-- begin;
--   alter table public.spiel_ereignisse
--     drop constraint if exists spiel_ereignisse_sfv_event_key;
--   create unique index spiel_ereignisse_sfv_event_key
--     on public.spiel_ereignisse (verein_id, sfv_event_id) where herkunft = 'sfv';
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Dump und Typen nachziehen. Zaehlprobe:
--     CREATE UNIQUE INDEX  -1
--     ADD CONSTRAINT       +1   (der Constraint bringt seinen Index selbst mit)
--
--   Dann den Sync noch einmal von Hand anstossen. Die betroffenen Spiele
--   haben kein matchdaten_geholt_am und stehen deshalb wieder vorne in der
--   Kandidatenliste — es ist nichts von Hand nachzuholen.
--
--   Erwartet in der Antwort: matchdaten.fehler = 0 und ereignisse_zeilen
--   deutlich ueber null (im Trockenlauf waren es 95 auf zehn Spiele).
-- ═══════════════════════════════════════════════════════════════════════════
