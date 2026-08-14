-- ═══════════════════════════════════════════════════════════════════════════
-- SFV CLUB API — Teil A: Datenbank
-- 14.08.2026
--
-- Legt die Struktur an, damit Spielplan und Ranglisten vom SFV geholt,
-- gespeichert und wieder ausgeliefert werden koennen. Der Sync selbst
-- (Edge Function) ist Teil B und nicht in dieser Datei.
--
-- Auftrag: docs/auftrag_sfv_api.md
-- Erkundung: 13.08.2026, echte Aufrufe gegen die Produktion, ClubId 1516
--
-- BLOECKE
--   A  spiele      — SFV-Spalten + Schluessel (verein_id, sfv_match_id)
--   B  teams       — Zuordnung ClubCampus-Team <-> SFV-Team
--   C  ranglisten  — neue Tabelle (Index, RLS, Policies)
--   D  Eintrag football_ch samt Feldhoheit in sync_felder
--
-- VORAUSSETZUNG — zuerst laufen lassen:
--   supabase/migration_api_verbindungen_mandant.sql
-- Sie stellt api_verbindungen.key von global auf (verein_id, key) um. Block D
-- unten legt die Zeile mit "on conflict (verein_id, key)" an und scheitert
-- ohne diesen Schluessel. Die Umstellung steht bewusst in einer eigenen Datei:
-- wird die SFV-Anbindung je zurueckgebaut, soll nicht nebenbei ein
-- Mandantenfehler zurueckkehren, der mit ihr nichts zu tun hat.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ZWEI ENTSCHEIDE, DIE ERKLAERUNG BRAUCHEN
--
-- 1) spiel_nr ist NICHT die SFV-Nummer.
--    Der SFV liefert zwei Zahlen pro Spiel: matchId (4305790) und matchNumber
--    (700389). Keine davon steht heute in spiele.spiel_nr — die Spalte ist ein
--    freies Textfeld und wird von Hand gepflegt. Sie bleibt unangetastet und
--    gehoert dem Verein. Der Sync-Schluessel ist die neue Spalte sfv_match_id.
--
-- 2) Der Schluessel auf spiele ist eine gewoehnliche UNIQUE-Constraint, kein
--    partieller Index.
--    Postgres behandelt NULL in UNIQUE als verschieden (NULLS DISTINCT ist der
--    Standard). Damit erlaubt unique (verein_id, sfv_match_id) beliebig viele
--    manuelle Spiele mit sfv_match_id = NULL und verbietet trotzdem, dass
--    dasselbe SFV-Spiel zweimal im selben Verein steht — genau das, was
--    Ergaenzung b verlangt.
--    Ein partieller Index (... where sfv_match_id is not null) wuerde dasselbe
--    aussagen, aber ON CONFLICT koennte ihn nicht mehr ableiten: dafuer muesste
--    das Praedikat im Statement wiederholt werden, und das kann PostgREST
--    (supabase-js .upsert) nicht ausdruecken. Der Sync wuerde still auf INSERT
--    zurueckfallen und Dubletten erzeugen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── A ─ spiele ────────────────────────────────────────────────────────────
-- Nur Spalten, die der Sync zum Abgleichen oder zum Filtern in der Anzeige
-- braucht. Alles Uebrige liegt ohnehin in sfv_stand und laesst sich spaeter
-- ohne erneutes Abholen nachziehen.

alter table public.spiele
  add column if not exists sfv_match_id            bigint,
  add column if not exists sfv_saison_id           integer,
  add column if not exists sfv_team_id             bigint,
  add column if not exists sfv_gegner_team_id      bigint,
  add column if not exists sfv_liga_id             integer,
  add column if not exists sfv_gruppe_id           integer,
  add column if not exists sfv_gruppe              text,
  add column if not exists sfv_spiel_typ           integer,
  add column if not exists sfv_status              integer,
  add column if not exists sfv_stand               jsonb,
  add column if not exists zuletzt_synchronisiert  timestamptz;

comment on column public.spiele.sfv_match_id       is 'SFV matchId — Schluessel des Sync. NULL = manuell erfasstes Spiel, der Sync fasst es nie an.';
comment on column public.spiele.sfv_saison_id      is 'SFV seasonId, benannt nach dem Endjahr: 2027 = Saison 2026/2027.';
comment on column public.spiele.sfv_team_id        is 'SFV teamId des eigenen Teams (teamAId oder teamBId, je nach Heimrecht).';
comment on column public.spiele.sfv_gegner_team_id is 'SFV teamId des Gegners — fuer /api/team/picture/{teamId}.';
comment on column public.spiele.sfv_gruppe_id      is 'SFV groupId; zusammen mit sfv_liga_id der Bezug zur Rangliste.';
comment on column public.spiele.sfv_spiel_typ      is 'SFV matchType: 1 Meisterschaft, 2 Cup, 3 Trainingsspiel, 9 Schweizer-Cup. Zum Filtern in der Anzeige — der Klartext steht in wettbewerb.';
comment on column public.spiele.sfv_status         is 'SFV matchState: 1 noch nicht ausgetragen, 2 ausgetragen, 6 verschoben, 7 neu angesetzt, 10 findet nicht statt. Zum Filtern — der Klartext steht in status.';
comment on column public.spiele.sfv_stand          is 'Rohe Antwortzeile des SFV, unveraendert. Damit ist jede Abweichung nachvollziehbar und neue Felder brauchen keinen erneuten Abruf.';

-- Schluessel des Sync. Begruendung siehe Kopf, Punkt 2.
alter table public.spiele
  drop constraint if exists spiele_verein_sfv_match_key,
  add  constraint spiele_verein_sfv_match_key unique (verein_id, sfv_match_id);

create index if not exists idx_spiele_sfv_team   on public.spiele using btree (sfv_team_id);
create index if not exists idx_spiele_sfv_saison on public.spiele using btree (verein_id, sfv_saison_id);


-- ─── B ─ teams ─────────────────────────────────────────────────────────────
-- Die Zuordnung wird von Hand gesetzt (Portalverwaltung -> API), nicht vom
-- Sync. Ueber den Namen geht sie nachweislich nicht: von den 21 SFV-Teams des
-- FCH heissen fuenf "FC Herrliberg a" und drei "Team Herrliberg-Kuesnacht".
-- Eindeutig ist allein die teamId.

alter table public.teams
  add column if not exists sfv_team_id    bigint,
  add column if not exists sfv_liga_id    integer,
  add column if not exists sfv_liga_name  text,
  add column if not exists sfv_division   text;

comment on column public.teams.sfv_team_id   is 'SFV teamId. NULL = kein Pendant beim SFV (z.B. reine Trainingsgruppe). Von Hand zugeordnet, nie vom Sync geschrieben.';
comment on column public.teams.sfv_liga_id   is 'SFV teamLeagueId, z.B. 13010 = 2. Liga.';
comment on column public.teams.sfv_division  is 'SFV teamDivisionName, z.B. "Herbstrunde" oder "Staerkeklasse 2".';

-- Verhindert, dass zwei ClubCampus-Teams auf dasselbe SFV-Team zeigen.
-- NULL bleibt beliebig oft erlaubt (NULLS DISTINCT), nicht zugeordnete Teams
-- sind davon also nicht betroffen.
alter table public.teams
  drop constraint if exists teams_verein_sfv_team_key,
  add  constraint teams_verein_sfv_team_key unique (verein_id, sfv_team_id);


-- ─── C ─ ranglisten ────────────────────────────────────────────────────────
-- Eine Zeile je Team je Gruppe. Gespeichert werden alle Zeilen der Gruppe,
-- auch die der Gegner (232 Zeilen ueber 21 Gruppen bei FCH) — ohne die
-- Gegnerzeilen ist eine Tabelle keine Tabelle.
--
-- Die Spalte heisst anzahl_spiele und nicht spiele, damit sie nicht gleich
-- heisst wie die Tabelle spiele. Erlaubt waere es, lesbar nicht.

create table if not exists public.ranglisten (
  id                 uuid primary key default gen_random_uuid(),
  verein_id          uuid not null references public.vereine(id),

  sfv_saison_id      integer not null,
  sfv_liga_id        integer not null,
  sfv_liga_name      text,
  sfv_division_id    integer not null default 0,
  sfv_division_name  text,
  sfv_gruppe_id      integer not null default 0,
  sfv_gruppe         text,

  sfv_team_id        bigint  not null,
  team_name          text,
  club_nummer        integer,

  position           integer,
  anzahl_spiele      integer,
  siege              integer,
  unentschieden      integer,
  niederlagen        integer,
  tore               integer,
  gegentore          integer,
  punkte             integer,
  fairplay_punkte    integer,

  stand_vom          timestamptz default now(),
  created_at         timestamptz default now()
);

comment on table  public.ranglisten                 is 'Ranglisten vom SFV, eine Zeile je Team je Gruppe. Wird vom Sync vollstaendig bewirtschaftet.';
comment on column public.ranglisten.club_nummer     is 'SFV clubNumber (FCH = 11057). NICHT die ClubId (1516) — in Ranglisten und Matchdaten steht ausschliesslich die clubNumber.';
comment on column public.ranglisten.fairplay_punkte is 'SFV penaltyPoints. KEIN Punktabzug: die Punkte sind ungekuerzt, FCH hatte 2025/2026 deren 76 auf Rang 2. Es ist die Fairplay-/Bussenwertung. Nie als Abzug anzeigen.';
comment on column public.ranglisten.stand_vom       is 'Zeitpunkt des Abrufs, nicht des Spieltags.';

alter table public.ranglisten
  drop constraint if exists ranglisten_verein_zeile_key,
  add  constraint ranglisten_verein_zeile_key
       unique (verein_id, sfv_saison_id, sfv_liga_id, sfv_division_id, sfv_gruppe_id, sfv_team_id);

create index if not exists idx_ranglisten_verein on public.ranglisten using btree (verein_id);
create index if not exists idx_ranglisten_gruppe on public.ranglisten using btree (verein_id, sfv_saison_id, sfv_liga_id, sfv_gruppe_id);

alter table public.ranglisten enable row level security;

-- CREATE POLICY kennt kein IF NOT EXISTS — ohne das Vorabloeschen waere ein
-- zweiter Lauf dieser Migration hier gescheitert.
drop policy if exists "ranglisten_select" on public.ranglisten;
create policy "ranglisten_select" on public.ranglisten
  for select using (verein_id = public.get_my_verein_id());

-- Geschrieben wird nur vom Sync (service_role, umgeht RLS). Die Policy deckt
-- den Fall ab, dass jemand von Hand korrigieren muss.
--
-- with check ist hier ausgeschrieben, obwohl Postgres es bei FOR ALL sonst aus
-- der using-Klausel ableitet. Ausgeschrieben steht die Absicht da, statt von
-- einer Voreinstellung abzuhaengen — und wer die Policy spaeter auf FOR INSERT
-- oder FOR UPDATE verengt, verliert die Pruefung nicht unbemerkt.
drop policy if exists "ranglisten_write" on public.ranglisten;
create policy "ranglisten_write" on public.ranglisten
  for all
  using      (verein_id = public.get_my_verein_id() and public.is_admin())
  with check (verein_id = public.get_my_verein_id() and public.is_admin());


-- ─── D ─ Eintrag football_ch samt Feldhoheit ───────────────────────────────
-- Der SFV wird ein Eintrag in api_verbindungen, kein Sonderweg. Der Schluessel
-- 'football_ch' existiert in API_INFOS bereits mit genau der passenden
-- Beschreibung ("Spielplaene, Resultate und Ranglisten von Football.ch") — es
-- wird also kein neuer erfunden.
--
-- FELDHOHEIT (Ergaenzung a). sync_felder ist nicht Dokumentation, sondern
-- Vertrag: Teil B baut die Spaltenliste seines Upsert aus
-- sync_felder->'spiele'->'sfv' und ->'abgeleitet'. Was dort nicht steht, kommt
-- gar nicht erst in die Nutzlast — und was nicht in der Nutzlast steht, fasst
-- ON CONFLICT DO UPDATE nicht an. Damit ueberlebt der Treffpunkt jeden
-- stuendlichen Lauf. Bedingung dafuer: jede Zeile der Nutzlast traegt
-- denselben Satz Schluessel, sonst setzt PostgREST fehlende Felder auf NULL.
--
-- DRITTE KATEGORIE: 'abgeleitet'. spiele.team gehoert weder dem SFV noch dem
-- Verein. Die Spalte traegt den ClubCampus-Teamnamen ("2. Mannschaft"), der
-- SFV liefert "FC Herrliberg 2" — schriebe der Sync den SFV-Namen hinein,
-- filterte TermineModul (SCHEDULE.filter(g => g.team === team)) ins Leere.
-- Sie einfach wegzulassen geht nicht: die Spalte ist NOT NULL, beim Anlegen
-- muss ein Wert her.
--
-- Deshalb: bei jedem Lauf aus teams.name ueber teams.sfv_team_id ableiten.
-- Quelle ist damit eindeutig teams.name; spiele.team ist ein Abbild davon,
-- das sich stuendlich neu ausrichtet. Wird ein Team umbenannt, repariert der
-- naechste Lauf alle seine Zeilen selbst — genau das, was ein einmaliges
-- Schreiben beim Anlegen nicht koennte.
--
-- Die saubere Loesung waere ein team_id bigint references teams(id) statt des
-- Textfelds. Sie gehoert zu Phase 4, wenn TermineModul, TeamModul und
-- DashboardModul von demoData auf Supabase kommen — dort wird die Spalte
-- ohnehin angefasst. Bis dahin ist die Ableitung die engste Fassung, die
-- ohne Aenderung an drei noch nicht migrierten Modulen auskommt.
--
-- api_url zeigt auf die Produktion. Staging (https://stg-club-api-services.
-- football.ch) taugt nur zum Lesen der Spezifikation: der Token wird dort zwar
-- ausgestellt, aber jede Datenabfrage fuer ClubId 1516 endet in 403.
--
-- active und konfiguriert bleiben false, bis die Edge Function steht und die
-- Geheimnisse gesetzt sind (npx supabase secrets set). auto_sync bleibt
-- ebenfalls false — eingeschaltet wird von Hand, nicht von einer Migration.

insert into public.api_verbindungen
       (verein_id, key, label, icon, active, konfiguriert,
        api_url, auto_sync, sync_intervall, sync_felder, sort_order)
select v.id,
       'football_ch',
       'Football.ch (SFV Club API)',
       'ball-football',
       false,
       false,
       'https://club-api-services.football.ch',
       false,
       'stuendlich',
       jsonb_build_object(
         '_hinweis',
           'Verbindliche Feldhoheit. Der Sync schreibt ausschliesslich die unter "sfv" und "abgeleitet" genannten Spalten. Alles unter "verein" gehoert dem Verein und wird nie ueberschrieben.',
         'spiele', jsonb_build_object(
           'sfv',    jsonb_build_array(
                       'date','zeit','gegner','heimspiel','venue',
                       'wettbewerb','liga','status','resultat','ht_resultat',
                       'sfv_match_id','sfv_saison_id','sfv_team_id',
                       'sfv_gegner_team_id','sfv_liga_id','sfv_gruppe_id',
                       'sfv_gruppe','sfv_spiel_typ','sfv_status','sfv_stand',
                       'zuletzt_synchronisiert'),
           'abgeleitet', jsonb_build_array('team'),
           'verein', jsonb_build_array(
                       'treffpunkt','notes','venue_addr','spiel_nr',
                       'zuschauer','schiedsrichter','delegierter'),
           '_regel',
             'Nur Zeilen mit gesetzter sfv_match_id werden angefasst. Zeilen ohne (Turniere, interne Spiele) bleiben unberuehrt und werden nie geloescht.',
           '_regel_abgeleitet',
             'team ist der ClubCampus-Teamname und wird bei jedem Lauf aus teams.name ueber teams.sfv_team_id gesetzt — NIE aus dem SFV-Namen. Fehlt die Zuordnung, traegt der Sync den SFV-Namen als Platzhalter ein und ersetzt ihn beim naechsten Lauf nach der Zuordnung.'),
         'ranglisten', jsonb_build_object(
           'sfv',    jsonb_build_array('alle'),
           'verein', jsonb_build_array()),
         'teams', jsonb_build_object(
           'sfv',    jsonb_build_array(),
           'verein', jsonb_build_array('alle'),
           '_regel',
             'Der Sync schreibt nie nach teams. Die Spalten sfv_team_id, sfv_liga_id, sfv_liga_name und sfv_division werden von Hand zugeordnet.')
       ),
       10
  from public.vereine v
 where v.slug = 'fcherrliberg'
    on conflict (verein_id, key) do update
   set label          = excluded.label,
       icon           = excluded.icon,
       api_url        = excluded.api_url,
       sync_intervall = excluded.sync_intervall,
       sync_felder    = excluded.sync_felder,
       updated_at     = now();
-- active, konfiguriert und auto_sync stehen absichtlich nicht im SET:
-- ein erneuter Lauf dieser Migration soll einen laufenden Sync nicht abstellen.

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- 1) Spalten: muss 11 Zeilen fuer spiele und 4 fuer teams liefern.

select table_name, column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'spiele' and (column_name like 'sfv\_%' or column_name = 'zuletzt_synchronisiert'))
     or (table_name = 'teams'  and  column_name like 'sfv\_%'))
 order by table_name, column_name;

-- 2) Schluessel: muss 3 Zeilen liefern, jede mit verein_id an erster Stelle.
--    Der vierte (api_verbindungen_verein_key_key) wird in
--    migration_api_verbindungen_mandant.sql geprueft.

select c.conrelid::regclass::text as tabelle,
       c.conname                  as constraint_name,
       pg_get_constraintdef(c.oid) as definition
  from pg_constraint c
 where c.conname in ('spiele_verein_sfv_match_key','teams_verein_sfv_team_key',
                     'ranglisten_verein_zeile_key')
 order by tabelle;

-- 3) RLS auf ranglisten: muss 2 Policies zeigen, rls_aktiv = true.
--    ranglisten_write muss qual UND with_check tragen.

select p.policyname, p.cmd,
       p.qual       is not null as hat_using,
       p.with_check is not null as hat_with_check
  from pg_policies p
 where p.schemaname = 'public' and p.tablename = 'ranglisten'
 order by p.policyname;

select c.relrowsecurity as rls_aktiv
  from pg_class c
 where c.oid = 'public.ranglisten'::regclass;

-- 4) Der Eintrag: muss genau 1 Zeile liefern, active = false,
--    felder_sfv = 21, felder_abgeleitet = 1, felder_verein = 7.

select key, label, api_url, active, konfiguriert, auto_sync, sync_intervall,
       jsonb_array_length(sync_felder->'spiele'->'sfv')        as felder_sfv,
       jsonb_array_length(sync_felder->'spiele'->'abgeleitet') as felder_abgeleitet,
       jsonb_array_length(sync_felder->'spiele'->'verein')     as felder_verein
  from public.api_verbindungen
 where key = 'football_ch';

-- 5) Gegenprobe zur Feldhoheit: muss 0 Zeilen liefern.
--    Keine Spalte darf in zwei Listen zugleich stehen.

select f.feld
  from public.api_verbindungen a
 cross join lateral jsonb_array_elements_text(
              (a.sync_felder->'spiele'->'sfv') ||
              (a.sync_felder->'spiele'->'abgeleitet')) as f(feld)
 where a.key = 'football_ch'
   and f.feld in (select jsonb_array_elements_text(a.sync_felder->'spiele'->'verein'));

-- 6) Gegenprobe gegen die Wirklichkeit: muss 0 Zeilen liefern.
--    Jede in sync_felder genannte Spalte muss es in spiele auch geben —
--    ein Tippfehler waere sonst erst beim ersten Sync aufgefallen.

select f.feld
  from public.api_verbindungen a
 cross join lateral jsonb_array_elements_text(
              (a.sync_felder->'spiele'->'sfv') ||
              (a.sync_felder->'spiele'->'abgeleitet') ||
              (a.sync_felder->'spiele'->'verein')) as f(feld)
 where a.key = 'football_ch'
   and not exists (select 1 from information_schema.columns c
                    where c.table_schema = 'public' and c.table_name = 'spiele'
                      and c.column_name = f.feld);


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Vollstaendig moeglich, solange noch kein Sync gelaufen ist. Danach gehen die
-- geholten Spiele und Ranglisten verloren — manuell erfasste Spiele nicht,
-- die haben sfv_match_id = NULL und stehen unveraendert in spiele.
--
-- begin;
--   delete from public.api_verbindungen where key = 'football_ch';
--   drop table if exists public.ranglisten;
--   alter table public.teams
--     drop constraint if exists teams_verein_sfv_team_key,
--     drop column if exists sfv_team_id, drop column if exists sfv_liga_id,
--     drop column if exists sfv_liga_name, drop column if exists sfv_division;
--   alter table public.spiele
--     drop constraint if exists spiele_verein_sfv_match_key,
--     drop column if exists sfv_match_id,       drop column if exists sfv_saison_id,
--     drop column if exists sfv_team_id,        drop column if exists sfv_gegner_team_id,
--     drop column if exists sfv_liga_id,        drop column if exists sfv_gruppe_id,
--     drop column if exists sfv_gruppe,         drop column if exists sfv_spiel_typ,
--     drop column if exists sfv_status,         drop column if exists sfv_stand,
--     drop column if exists zuletzt_synchronisiert;
-- commit;
--
-- Der Schluessel auf api_verbindungen wird hier bewusst NICHT zurueckgesetzt.
-- Er gehoert zur Mandantenfaehigkeit, nicht zur SFV-Anbindung; sein Rueckbau
-- steht in migration_api_verbindungen_mandant.sql und ist dort auch nur
-- moeglich, solange nicht zwei Vereine denselben Anschluss haben.


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Strukturaenderung — Dump UND Typen nachziehen, beides:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   Vor dem Committen die Zaehlprobe gegen die alte Fassung, fuer BEIDE
--   Migrationen zusammen:
--     CREATE TABLE    +1  (ranglisten)
--     CREATE POLICY   +2  (ranglisten_select, ranglisten_write)
--     CREATE INDEX    +4  (2x spiele, 2x ranglisten)
--     ADD CONSTRAINT  +5  (ranglisten: pkey, FK, Zeilenschluessel;
--                          spiele +1; teams +1;
--                          api_verbindungen -1 +1 = 0 aus der anderen Datei)
--   Die zwei ALTER PUBLICATION und die auth-Trigger fallen durch jede
--   Zaehlung — siehe CLAUDE.md.
--
--   npm run typecheck && npm run build && npm test
--
-- OFFEN FUER TEIL B
--   - Die Zuordnung der 21 SFV-Teams auf die ClubCampus-Teams ist noch leer.
--     Bis sie gesetzt ist, laesst sich ein Spiel keinem Team zuordnen.
--   - Der Sync holt genau einen Token pro Lauf und laeuft streng seriell:
--     ein zweiter POST /api/token macht den ersten Token sofort ungueltig
--     (am 13.08.2026 gemessen). Zwei gleichzeitige Laeufe wuerden einander
--     abschiessen — es braucht eine Laufsperre.
--   - sync_intervall = 'stuendlich' ist mit dieser Migration der erste Wert,
--     der ueberhaupt in der Spalte steht. Teil B legt damit die Schreibweise
--     fuer alle kuenftigen Anschluesse fest.
--
-- NICHT TEIL DIESES AUFTRAGS
--   Matchdaten (Aufstellungen, Torschuetzen, Karten). Sie liefern
--   Personendaten fremder Vereine und sind nur fuer die laufende Saison
--   abrufbar — Spiele der Vorsaison antworten mit 404.
-- ═══════════════════════════════════════════════════════════════════════════
