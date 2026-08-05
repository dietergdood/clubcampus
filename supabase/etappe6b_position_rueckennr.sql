-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 6b — `position` und `rueckennr` aus `mitglieder` streichen
-- 05.08.2026
--
-- WARUM
-- Beide hingen am MITGLIED und galten damit fuer alle Teams. Ein Spieler in
-- zwei Mannschaften hatte zwangslaeufig dieselbe Position und dieselbe
-- Nummer. Im Bestand war das sichtbar:
--
--   Adrian Buergi   1. Mannschaft + 2. Mannschaft   beide „Linksverteidiger"
--   Adrian Kern     Ba-Junioren  + Eb-Junioren      beide „Linksverteidiger"
--   Adrian Vogel    2. Mannschaft + D-Juniorinnen   beide „Verteidiger"
--   Heinz Berger    2. Mannschaft + A-Junioren      beide „Defensiver MF"
--
-- `kader` hat `position` und `rueckennr` bereits, und KaderModul wie
-- PersonTeams schreiben laengst dorthin — pro Team UND Saison. Die Spalten
-- in `mitglieder` sind Ueberbleibsel.
--
-- ─── WAS MIT DEN WERTEN PASSIERT ───────────────────────────────────────────
-- 484 Mitglieder tragen eine Position, aber nur 16 stehen ueberhaupt in
-- einem Kader — KaderModul laeuft noch auf demoData, die echten Zuweisungen
-- fehlen. Ein Umzug wuerde 468 Werte ersatzlos verlieren.
--
-- ENTSCHIEDEN am 05.08.2026: Es sind Testdaten, die der Fairgate-Import
-- ohnehin ersetzt. Die Spalten fallen ohne Migration.
--
-- Bei einem Verein mit echten Daten waere das anders: dort muesste ZUERST
-- die Kader-Migration laufen, damit jede Zuweisung existiert, und DANN die
-- Position pro Kaderzeile uebernommen werden.
--
-- ⚠ KEIN ROLLBACK. Block B legt vorher eine Sicherheitskopie an.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Bestandsaufnahme                                              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select count(*) filter (where rueckennr is not null and btrim(rueckennr) <> '') as mit_nummer,
       count(*) filter (where position  is not null and btrim(position)  <> '') as mit_position,
       count(*) as gesamt
  from public.mitglieder;

-- A2: Wer steht in mehreren Teams? Genau diese Faelle sind der Grund.
select p.vorname, p.nachname, m.position,
       array_agg(t.name order by t.name) as teams
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
  join public.kader k    on k.mitglied_id = m.id and k.aktiv
  left join public.teams t on t.id = k.team_id
 group by p.vorname, p.nachname, m.position
having count(*) > 1;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Sicherheitskopie                       >>> SCHREIBT <<<       ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

create table if not exists public._etappe6b_position_mitglieder as
select id, person_id, position, rueckennr, now() as gesichert_am
  from public.mitglieder
 where (position  is not null and btrim(position)  <> '')
    or (rueckennr is not null and btrim(rueckennr) <> '');

commit;

select count(*) as gesicherte_zeilen from public._etappe6b_position_mitglieder;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Bestehende Kaderzeilen uebernehmen     >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Betrifft die 16 vorhandenen Zeilen. Ab jetzt kann die Position pro Team ║
-- ║ abweichen — heute ist sie ueberall gleich, was dem bisherigen Stand     ║
-- ║ entspricht.                                                             ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

update public.kader k
   set position = m.position
  from public.mitglieder m
 where k.mitglied_id = m.id
   and (k.position is null or btrim(k.position) = '')
   and m.position is not null and btrim(m.position) <> '';

update public.kader k
   set rueckennr = m.rueckennr
  from public.mitglieder m
 where k.mitglied_id = m.id
   and (k.rueckennr is null or btrim(k.rueckennr) = '')
   and m.rueckennr is not null and btrim(m.rueckennr) <> '';

commit;

select count(*) filter (where position  is not null and btrim(position)  <> '') as mit_position,
       count(*) filter (where rueckennr is not null and btrim(rueckennr) <> '') as mit_nummer,
       count(*) as kader_zeilen
  from public.kader;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Die Spalten streichen                  >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ ERST ausfuehren, wenn der Code eingespielt ist. Drei Stellen lasen sie: ║
-- ║   memberMapper.ts    fuehrte beide mit, angezeigt hat sie niemand       ║
-- ║   memberFilter.ts    suchte in `position`                               ║
-- ║   TeamModul.tsx      liest sie, laeuft aber noch auf demoData           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

alter table public.mitglieder
  drop column position,
  drop column rueckennr;

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK E — Verifikation                                                  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mitglieder'
   and column_name in ('position', 'rueckennr');

-- Muss leer sein. `kader` behaelt beide Spalten.
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'kader'
   and column_name in ('position', 'rueckennr');


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   npm run typecheck && npm run build && npm test   -> 362 gruen
--   npx supabase db dump --linked -f supabase/schema.sql
--   npx supabase gen types typescript --linked > src/database.types.ts
--
--   Sicherheitskopie loeschen, wenn nichts auffaellt:
--     drop table public._etappe6b_position_mitglieder;
-- ═══════════════════════════════════════════════════════════════════════════
