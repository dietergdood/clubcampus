-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der Abholer sieht auch Matchdaten
-- 11.09.2026
--
-- ⚠ ⚠  DERSELBE FEHLER WIE IM ERSTEN ENTWURF, EINE EBENE TIEFER.
--
--   `export_wartet()` zaehlt `spiele` und `ranglisten`. Die Nutzlast
--   traegt aber auch den VERLAUF und die AUFSTELLUNG — und die stehen in
--   `spiel_ereignisse` und `spiel_aufstellung`.
--
--   Folge, gemessen am 11.09.2026: seit dem letzten Export sind
--   Matchdaten dazugekommen, und `wartet_jetzt` blieb 0. **Der Abholer
--   lief alle 15 Minuten und fand nichts, obwohl etwas da war.**
--
-- ⚠ Es ist genau die Luecke, die beim ersten Entwurf schon einmal
--   auffiel — damals fehlten die Ranglisten, und sie wurden auf
--   Anweisung gleich mitgebaut. Zwei Tabellen dazu, zwei uebersehen:
--   **wer eine Quelle nennt, zaehlt alle Quellen der Nutzlast auf.**
--
-- ── Warum ein Trigger und kein Zeitstempel ────────────────────────────────
--
--   `spiel_aufstellung.zuletzt_synchronisiert` und
--   `spiel_ereignisse.zuletzt_synchronisiert` werden bei JEDEM Lauf neu
--   gesetzt, fuer jede Zeile — genau wie `spiele.zuletzt_synchronisiert`.
--   Sie halten fest, WANN EIN LAUF WAR, nicht ob sich etwas geaendert
--   hat. Ein Zaehler darauf meldete stuendlich „alles wartet".
--
--   **Also derselbe Trigger wie bei spiele und ranglisten**, der die
--   Zeile ohne die Laufstempel mit sich selbst vergleicht.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiel_aufstellung
  add column if not exists zuletzt_geaendert timestamptz not null default now();
alter table public.spiel_ereignisse
  add column if not exists zuletzt_geaendert timestamptz not null default now();

comment on column public.spiel_aufstellung.zuletzt_geaendert is
  'Wann sich an dieser Zeile INHALTLICH etwas geaendert hat. ⚠ NICHT zuletzt_synchronisiert: das ist der Laufstempel und wird stuendlich fuer jede Zeile neu gesetzt.';
comment on column public.spiel_ereignisse.zuletzt_geaendert is
  'Wie bei spiel_aufstellung.';

drop trigger if exists spiel_aufstellung_zuletzt_geaendert on public.spiel_aufstellung;
create trigger spiel_aufstellung_zuletzt_geaendert
  before insert or update on public.spiel_aufstellung
  for each row execute function public.stempel_zuletzt_geaendert();

drop trigger if exists spiel_ereignisse_zuletzt_geaendert on public.spiel_ereignisse;
create trigger spiel_ereignisse_zuletzt_geaendert
  before insert or update on public.spiel_ereignisse
  for each row execute function public.stempel_zuletzt_geaendert();

create or replace function public.export_wartet(p_verein_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  with stand as (
    select coalesce(
             (select v.letzter_sync from public.api_verbindungen v
               where v.verein_id = p_verein_id and v.key = 'wordpress'),
             '-infinity'::timestamptz) as seit
  )
  select (
    (select count(*) from public.spiele s, stand
      where s.verein_id = p_verein_id and s.zuletzt_geaendert > stand.seit)
    +
    (select count(*) from public.ranglisten r, stand
      where r.verein_id = p_verein_id and r.zuletzt_geaendert > stand.seit)
    +
    (select count(*) from public.spiel_aufstellung a, stand
      where a.verein_id = p_verein_id and a.zuletzt_geaendert > stand.seit)
    +
    (select count(*) from public.spiel_ereignisse e, stand
      where e.verein_id = p_verein_id and e.zuletzt_geaendert > stand.seit)
  )::integer;
$fn$;

comment on function public.export_wartet(uuid) is
  'Wie viele Zeilen haben sich seit dem letzten WordPress-Export INHALTLICH geaendert? VIER Quellen: spiele, ranglisten, spiel_aufstellung, spiel_ereignisse — alles, was die Nutzlast traegt. ⚠ Wer eine Quelle ergaenzt, ergaenzt sie hier mit, sonst laeuft der Export nicht, obwohl etwas wartet.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Nach dem Einspielen wartet zunaechst ALLES — die neuen Spalten
--     tragen den Migrationszeitpunkt, und der liegt nach dem letzten
--     Export. Das ist richtig: exportiert wurden diese Zeilen nie.
--
--   select public.export_wartet(id) from public.vereine;
--
-- 2 · ⚠ DIE WICHTIGE: bewegt sich die Zahl nach einem Sync-Lauf, der
--     nichts geaendert hat?
--
--   -- vor dem Lauf und nach dem Lauf, ohne Aenderung beim Verband
--   select public.export_wartet(id) from public.vereine;
--
-- ⚠ Erwartung: GLEICH. Springt sie auf mehrere Tausend, greift der
--   Trigger an den zwei neuen Tabellen nicht — dann steht die Zahl
--   wieder fuer „ein Lauf war" statt fuer „etwas hat sich geaendert",
--   und der Export laeuft stuendlich statt nach Bedarf.
--
-- 3 · Und die Verteilung, damit sichtbar ist, WAS wartet:
--
--   select 'spiele' as quelle, count(*) from public.spiele
--    where zuletzt_geaendert > now() - interval '2 hours'
--   union all select 'aufstellung', count(*) from public.spiel_aufstellung
--    where zuletzt_geaendert > now() - interval '2 hours'
--   union all select 'ereignisse', count(*) from public.spiel_ereignisse
--    where zuletzt_geaendert > now() - interval '2 hours';
