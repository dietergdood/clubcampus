-- ═══════════════════════════════════════════════════════════════════════════
-- SFV MATCHDATEN — Aufstellung, Ereignisse, Zuordnung
-- 19.08.2026
--
-- Grundlage: docs/auftrag_matchdaten.md, Entscheidungen vom 19.08.2026, und
-- die Probe an echten Daten (docs/sfv/matchdaten_beispiel.json, Spiel
-- 4308382). Ohne die Probe waeren zwei Annahmen ungeprueft geblieben:
--
--   clubNumber steht PRO EINTRAG — players[].clubNumber, events[].clubNumber
--              und zusaetzlich match.teams[].clubNumber. Die Trennung
--              eigen/fremd ist damit eine Zeile Logik.
--   personId   existiert pro Eintrag. Die Wiedererkennung braucht deshalb
--              KEINEN zusammengesetzten Schluessel aus Name und Rueckennummer
--              — was gut ist, denn der Verein hat zwei Adrian Schmid.
--
--
-- DIE REGEL, DIE DAS MODELL BESTIMMT
-- Von fremden Spielern wird nichts gespeichert. Nicht der Name, nicht das
-- Geburtsdatum, nicht die Passnummer — und auch keine personId, ueber die
-- sich das nachschlagen liesse. Vom Gegner bleibt der Vereinsname.
--
-- Das steht hier nicht als Vorsatz, sondern als CHECK-Constraint: eine Zeile
-- mit ist_eigener = false und einer sfv_person_id wird von der Datenbank
-- abgelehnt. Was nie gespeichert werden kann, kann nicht versehentlich
-- angezeigt, exportiert oder vergessen werden.
--
--
-- ZWEI SCHICHTEN BEI DEN EREIGNISSEN
-- Der Verein korrigiert Tore und Karten und traegt Assists nach. Die
-- Korrektur ueberschreibt die SFV-Zeile NICHT, sondern verdeckt sie:
--
--   herkunft='sfv'     der Sync schreibt sie bei jedem Lauf fort
--   herkunft='verein'  verdeckt eine SFV-Zeile (ersetzt_ereignis_id)
--                      oder steht fuer sich (Assist)
--
-- Das ist keine Feinheit, sondern Voraussetzung: Zieht der SFV spaeter nach
-- und korrigiert von sich aus auf denselben Wert, soll ein Hinweis kommen.
-- Ueberschriebe die Korrektur die SFV-Zeile, gaebe es beim naechsten Lauf
-- nichts mehr zu vergleichen — die Meldung koennte nie ausloesen.
--
-- Verglichen wird nur, was die Korrektur angefasst hat (geaenderte_felder).
-- Wer den Torschuetzen korrigiert, hat zur Minute nichts gesagt; ein
-- Vergleich der ganzen Zeile schluege bei jeder Nebenaenderung an.
--
--
-- ⚠ ASSIST IST EIN SFV-TYP
-- Der Auftrag sagt, Assists liefere der SFV "gar nicht". Die Stammdaten
-- sagen etwas anderes: Ereignistyp 9 heisst "Assist". Im Beispielspiel kam
-- er nicht vor, in unseren Ligen wird er vermutlich nicht erfasst — aber
-- der Typ existiert.
--
-- Deshalb ist "Assist" hier KEINE eigene Kategorie und kein eigenes Feld,
-- sondern typ_id = 9 wie jeder andere Typ. Woher die Zeile stammt, sagt
-- allein `herkunft`. Faengt der SFV eines Tages an, Assists zu liefern,
-- fuegen sie sich ein und lassen sich mit unseren vergleichen. Waere
-- "Assist" fest als Vereins-Sache gebaut, muesste man es dann umbauen.
--
--
-- WAS DIESE MIGRATION NICHT ANFASST
--   `aufgebote`  Aufgebot und Aufstellung sind zwei Dinge: das eine vorher,
--                das andere nachher, und sie decken sich nie ganz. Wer krank
--                absagt, steht im Aufgebot und nicht in der Aufstellung.
--                Die Tabelle existiert seit langem und wartet auf Phase 4.
--                Der spaetere Vergleich ist moeglich, weil beide Seiten an
--                `spiele` haengen und auf `mitglied_id` aufloesen.
--   `spiele.ht_resultat`  Entscheidung 6: erst umstellen, wenn der Sync
--                laeuft. Diese Migration ruehrt die Feldhoheit nicht an.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_policies    int;
  v_tabellen    int;
  v_clubnummern int;
  v_rls_fehlend text;
begin

  -- ─── A) Unsere clubNumber gehoert in die Datenbank ───────────────────────
  -- 11057, NICHT die ClubId 1516 — zwei verschiedene Zahlen. Bisher stand
  -- nur die ClubId als Secret (SFV_CLUB_ID); die clubNumber kam in keiner
  -- Konfiguration vor, obwohl Ranglisten und Matchdaten ausschliesslich sie
  -- fuehren. Als Konstante im Code waere sie beim zweiten Verein falsch.

  alter table public.vereine
    add column if not exists sfv_club_nummer integer;

  execute $q$
    comment on column public.vereine.sfv_club_nummer is
      'SFV clubNumber des Vereins (FCH = 11057). NICHT die ClubId (1516) — in Ranglisten und Matchdaten steht ausschliesslich die clubNumber. Der Matchdaten-Sync trennt daran eigene von fremden Spielern.'
  $q$;

  execute $q$update public.vereine set sfv_club_nummer = 11057 where slug = 'fcherrliberg'$q$;

  -- ─── B) Wann wurden die Matchdaten zuletzt geholt ────────────────────────
  -- Traegt die Auswahl der Kandidaten: null = noch nie geholt (Vorrang),
  -- gesetzt = wird nur noch in der Woche nach dem Spiel nachgeholt.

  alter table public.spiele
    add column if not exists matchdaten_geholt_am timestamp with time zone;

  execute $q$
    comment on column public.spiele.matchdaten_geholt_am is
      'Letzter erfolgreicher Abruf von /api/match/{id}(+players,+events). NULL = noch nie. Der Sync holt zuerst die noch nie geholten, danach zum Nachziehen die aus der Woche nach dem Spiel.'
  $q$;

  -- Zusammengesetzter Schluessel, damit die Kindtabellen unten BEIDE Spalten
  -- pruefen koennen: eine Aufstellungszeile mit fremder verein_id waere sonst
  -- moeglich. (id ist Primaerschluessel, (id, verein_id) trivial eindeutig.)
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.spiele'::regclass
                    and conname  = 'spiele_id_verein_key') then
    alter table public.spiele add constraint spiele_id_verein_key unique (id, verein_id);
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.mitglieder'::regclass
                    and conname  = 'mitglieder_id_verein_key') then
    alter table public.mitglieder add constraint mitglieder_id_verein_key unique (id, verein_id);
  end if;


  -- ─── C) sfv_zuordnung — Person ↔ Mitglied ────────────────────────────────
  -- Von Hand gesetzt: beim ersten Spiel erscheint ein unbekannter eigener
  -- Spieler in der Warteschlange, die Verwaltung waehlt das Mitglied, ab dann
  -- wird er automatisch erkannt. Automatisch ueber den Namen scheidet aus —
  -- zwei Adrian Schmid, zwei Adrian Jenni.
  --
  -- ⚠ KEIN unique auf mitglied_id. Ob personId ueber Saisongrenzen haelt,
  -- weiss niemand; die Probe zeigt eine laufende Saison. Wechselt der SFV die
  -- IDs zum 1. Juli, kommt fuer dasselbe Mitglied eine zweite Zeile dazu,
  -- statt dass eine ersetzt werden muesste — die Historie bleibt lesbar und
  -- alte Spiele zeigen weiter auf den richtigen Menschen.
  --
  -- Aufgeloest wird auf mitglied_id, nicht auf person_id: `aufgebote` haengt
  -- an mitglied_id, und der spaetere Vergleich Aufgebot ↔ Aufstellung joint
  -- dann direkt. Ausserdem ist ein Einsatz eine mitgliedschaftsbezogene
  -- Tatsache — dieselbe Begruendung, aus der position und rueckennr an der
  -- Kaderzeile haengen und nicht am Mitglied.

  execute $q$
    create table if not exists public.sfv_zuordnung (
      id             uuid primary key default gen_random_uuid(),
      verein_id      uuid        not null references public.vereine(id),
      sfv_person_id  integer     not null,
      /* bigint, nicht uuid: mitglieder.id ist bigint. In acht aelteren,
         ungenutzten Tabellen steht mitglied_id faelschlich als uuid — keine
         davon hat einen Fremdschluessel, sonst waere es aufgefallen. Siehe
         den Nachtrag am Dateiende. */
      mitglied_id    bigint      not null,
      zugeordnet_von uuid        references public.benutzer(id),
      zugeordnet_am  timestamptz not null default now(),
      notiz          text,

      constraint sfv_zuordnung_verein_key unique (verein_id, sfv_person_id),
      constraint sfv_zuordnung_mitglied_fkey
        foreign key (mitglied_id, verein_id)
        references public.mitglieder (id, verein_id) on delete cascade
    )
  $q$;

  execute $q$create index if not exists sfv_zuordnung_mitglied_idx on public.sfv_zuordnung (mitglied_id)$q$;

  execute $q$
    comment on table public.sfv_zuordnung is
      'Welches Mitglied hinter einer SFV-personId steckt. Von Hand gesetzt. Mehrere sfv_person_id duerfen auf dasselbe Mitglied zeigen — falls der SFV die IDs zur neuen Saison wechselt, kommt eine dazu statt eine zu ersetzen.'
  $q$;


  -- ─── D) spiel_aufstellung — nur unsere Spieler ───────────────────────────
  -- Fremde Aufstellungszeilen werden vom Sync verworfen, nicht gespeichert.
  -- Der Spielbericht zeigt vom Gegner nur den Verein; einzelne gegnerische
  -- Spieler kommen darin gar nicht vor, es gibt also nichts abzulegen.
  --
  -- Kein mitglied_id an dieser Zeile: die Zuordnung steht einmal in
  -- sfv_zuordnung und wird gejoint. Eine Kopie hier hiesse, dass eine falsch
  -- getroffene Zuordnung in jedem vergangenen Spiel einzeln zu korrigieren
  -- waere. So genuegt eine Zeile und alle Spiele stimmen rueckwirkend.

  execute $q$
    create table if not exists public.spiel_aufstellung (
      id             uuid primary key default gen_random_uuid(),
      verein_id      uuid    not null references public.vereine(id),
      spiel_id       uuid    not null,
      sfv_person_id  integer not null,
      sfv_team_id    integer,
      rueckennr      integer,
      position_id    integer,
      position_name  text,
      von_minute     integer,
      bis_minute     integer,
      spielzeit      integer,
      zuletzt_synchronisiert timestamptz not null default now(),

      constraint spiel_aufstellung_verein_key unique (verein_id, spiel_id, sfv_person_id),
      constraint spiel_aufstellung_spiel_fkey
        foreign key (spiel_id, verein_id)
        references public.spiele (id, verein_id) on delete cascade
    )
  $q$;

  execute $q$
    comment on table public.spiel_aufstellung is
      'Aufstellung EIGENER Spieler aus /api/match/{id}/players. Fremde Zeilen werden nicht gespeichert. Nicht zu verwechseln mit `aufgebote`: das Aufgebot steht vor dem Spiel und deckt sich nie ganz mit der Aufstellung danach.'
  $q$;


  -- ─── E) spiel_ereignisse — zwei Schichten in einer Tabelle ───────────────

  execute $q$
    create table if not exists public.spiel_ereignisse (
      id            uuid primary key default gen_random_uuid(),
      verein_id     uuid not null references public.vereine(id),
      spiel_id      uuid not null,

      herkunft      text not null,
      sfv_event_id  integer,
      ersetzt_ereignis_id uuid references public.spiel_ereignisse(id) on delete cascade,
      geaenderte_felder   text[],
      korrigiert_von uuid references public.benutzer(id),
      korrigiert_am  timestamptz,
      verworfen_am   timestamptz,

      typ_id        integer not null,
      typ           text,
      subtyp_id     integer,
      subtyp        text,
      minute        integer,
      zusatzminute  integer,

      ist_eigener   boolean not null,
      sfv_team_id   integer,
      gegner_club_name text,
      sfv_person_id integer,
      rueckennr     integer,
      ein_sfv_person_id integer,
      ein_rueckennr integer,

      zuletzt_synchronisiert timestamptz not null default now(),

      constraint spiel_ereignisse_herkunft_check
        check (herkunft in ('sfv','verein')),

      /* Jede Schicht traegt genau ihre Felder. Ohne diese Pruefung koennte
         eine Vereins-Zeile eine sfv_event_id bekommen und vom Sync
         ueberschrieben werden — genau das, was die Trennung verhindern soll. */
      constraint spiel_ereignisse_schicht_check check (
        (herkunft = 'sfv'
           and sfv_event_id is not null
           and ersetzt_ereignis_id is null
           and geaenderte_felder is null
           and korrigiert_von is null)
        or
        (herkunft = 'verein'
           and sfv_event_id is null
           and korrigiert_von is not null
           /* verdeckt eine SFV-Zeile -> sagt, welche Felder sie setzt;
              steht fuer sich (Assist) -> keine geaenderten Felder */
           and ((ersetzt_ereignis_id is not null and array_length(geaenderte_felder,1) > 0)
             or (ersetzt_ereignis_id is null and geaenderte_felder is null)))
      ),

      /* DIE Regel des Auftrags, als Constraint statt als Vorsatz: von einem
         fremden Spieler bleibt nichts als der Vereinsname. */
      constraint spiel_ereignisse_fremde_anonym_check check (
        ist_eigener
        or (sfv_person_id is null and rueckennr is null
            and ein_sfv_person_id is null and ein_rueckennr is null)
      ),

      constraint spiel_ereignisse_spiel_fkey
        foreign key (spiel_id, verein_id)
        references public.spiele (id, verein_id) on delete cascade
    )
  $q$;

  /* Partiell: nur SFV-Zeilen haben eine sfv_event_id, und nur sie muss
     eindeutig sein. */
  execute $q$
    create unique index if not exists spiel_ereignisse_sfv_event_key
      on public.spiel_ereignisse (verein_id, sfv_event_id)
      where herkunft = 'sfv'
  $q$;

  execute $q$
    create index if not exists spiel_ereignisse_spiel_idx
      on public.spiel_ereignisse (verein_id, spiel_id)
  $q$;

  /* Traegt den Nachzug-Vergleich: welche Vereins-Zeile verdeckt welche
     SFV-Zeile. Ohne Index laeuft die Pruefung bei jedem Lauf ueber alles. */
  execute $q$
    create index if not exists spiel_ereignisse_ersetzt_idx
      on public.spiel_ereignisse (ersetzt_ereignis_id)
      where ersetzt_ereignis_id is not null
  $q$;

  execute $q$
    comment on table public.spiel_ereignisse is
      'Spielverlauf. herkunft=sfv wird bei jedem Lauf fortgeschrieben, herkunft=verein nie. Eine Vereins-Zeile verdeckt ueber ersetzt_ereignis_id eine SFV-Zeile (Korrektur) oder steht fuer sich (nachgetragener Assist). Von fremden Spielern bleibt nur gegner_club_name — erzwungen durch spiel_ereignisse_fremde_anonym_check.'
  $q$;

  execute $q$
    comment on column public.spiel_ereignisse.geaenderte_felder is
      'Welche Felder diese Korrektur setzt. Nur diese werden beim Nachzug-Vergleich gegen die SFV-Zeile geprueft: wer den Torschuetzen korrigiert, hat zur Minute nichts gesagt.'
  $q$;

  execute $q$
    comment on column public.spiel_ereignisse.typ_id is
      'SFV Ereignistyp: 1 Tor, 2 Aus-/Einwechslung, 3 Verwarnung, 4 Ausschluss, 9 Assist. Vollstaendig in docs/sfv/sfv_stammdaten.json. Assist ist ein SFV-Typ wie jeder andere — woher die Zeile stammt, sagt herkunft, nicht der Typ.'
  $q$;


  -- ─── F) Zugriff ──────────────────────────────────────────────────────────
  -- Lesen: alle im Verein. Der Spielbericht ist fuer alle da.
  -- Schreiben:
  --   spiel_aufstellung  nur is_admin() — die Zeilen kommen vom Sync, von
  --                      Hand wird hier nichts gepflegt.
  --   spiel_ereignisse   is_admin() ODER is_trainer() — Tore und Karten
  --                      korrigiert, wer beim Spiel war.
  --   sfv_zuordnung      nur is_admin() — eine falsche Zuordnung verfaelscht
  --                      rueckwirkend jede Statistik.
  -- using UND with check: ohne with check liesse sich eine Zeile mit fremder
  -- verein_id einfuegen.

  execute $q$alter table public.sfv_zuordnung    enable row level security$q$;
  execute $q$alter table public.spiel_aufstellung enable row level security$q$;
  execute $q$alter table public.spiel_ereignisse  enable row level security$q$;

  execute $q$grant all on table public.sfv_zuordnung    to anon, authenticated, service_role$q$;
  execute $q$grant all on table public.spiel_aufstellung to anon, authenticated, service_role$q$;
  execute $q$grant all on table public.spiel_ereignisse  to anon, authenticated, service_role$q$;

  execute $q$drop policy if exists sfv_zuordnung_select on public.sfv_zuordnung$q$;
  execute $q$create policy sfv_zuordnung_select on public.sfv_zuordnung
              for select using (verein_id = public.get_my_verein_id())$q$;
  execute $q$drop policy if exists sfv_zuordnung_write on public.sfv_zuordnung$q$;
  execute $q$create policy sfv_zuordnung_write on public.sfv_zuordnung
              for all
              using      (verein_id = public.get_my_verein_id() and public.is_admin())
              with check (verein_id = public.get_my_verein_id() and public.is_admin())$q$;

  execute $q$drop policy if exists spiel_aufstellung_select on public.spiel_aufstellung$q$;
  execute $q$create policy spiel_aufstellung_select on public.spiel_aufstellung
              for select using (verein_id = public.get_my_verein_id())$q$;
  execute $q$drop policy if exists spiel_aufstellung_write on public.spiel_aufstellung$q$;
  execute $q$create policy spiel_aufstellung_write on public.spiel_aufstellung
              for all
              using      (verein_id = public.get_my_verein_id() and public.is_admin())
              with check (verein_id = public.get_my_verein_id() and public.is_admin())$q$;

  execute $q$drop policy if exists spiel_ereignisse_select on public.spiel_ereignisse$q$;
  execute $q$create policy spiel_ereignisse_select on public.spiel_ereignisse
              for select using (verein_id = public.get_my_verein_id())$q$;
  execute $q$drop policy if exists spiel_ereignisse_write on public.spiel_ereignisse$q$;
  execute $q$create policy spiel_ereignisse_write on public.spiel_ereignisse
              for all
              using      (verein_id = public.get_my_verein_id() and (public.is_admin() or public.is_trainer()))
              with check (verein_id = public.get_my_verein_id() and (public.is_admin() or public.is_trainer()))$q$;


  -- ─── G) Pruefung, im selben Block ────────────────────────────────────────

  select count(*) into v_tabellen from information_schema.tables
   where table_schema = 'public'
     and table_name in ('sfv_zuordnung','spiel_aufstellung','spiel_ereignisse');
  if v_tabellen <> 3
  then raise exception 'UNVOLLSTAENDIG: % von 3 Tabellen angelegt', v_tabellen; end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='vereine'
                    and column_name='sfv_club_nummer')
  then raise exception 'UNVOLLSTAENDIG: vereine.sfv_club_nummer fehlt'; end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='spiele'
                    and column_name='matchdaten_geholt_am')
  then raise exception 'UNVOLLSTAENDIG: spiele.matchdaten_geholt_am fehlt'; end if;

  /* Ohne clubNumber trennt der Sync eigen und fremd nicht — und wuerde im
     schlimmsten Fall fremde Personendaten fuer eigene halten. */
  execute $q$select count(*) from public.vereine where sfv_club_nummer is not null$q$ into v_clubnummern;
  if v_clubnummern = 0 then
    raise exception 'UNVOLLSTAENDIG: kein Verein hat eine sfv_club_nummer. Heisst der Slug anders als "fcherrliberg"?';
  end if;

  select string_agg(c.relname, ', ') into v_rls_fehlend
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('sfv_zuordnung','spiel_aufstellung','spiel_ereignisse')
     and c.relrowsecurity is not true;
  if v_rls_fehlend is not null
  then raise exception 'UNVOLLSTAENDIG: RLS fehlt auf %', v_rls_fehlend; end if;

  select count(*) into v_policies from pg_policies
   where schemaname = 'public'
     and tablename in ('sfv_zuordnung','spiel_aufstellung','spiel_ereignisse');
  if v_policies <> 6
  then raise exception 'UNVOLLSTAENDIG: % Policies statt 6', v_policies; end if;

  /* Die Anonymitaets-Pruefung ist der Kern des Auftrags — wenn sie fehlt,
     ist die Tabelle da und die Regel weg. */
  if not exists (select 1 from pg_constraint
                  where conname = 'spiel_ereignisse_fremde_anonym_check')
  then raise exception 'UNVOLLSTAENDIG: spiel_ereignisse_fremde_anonym_check fehlt'; end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'spiel_ereignisse_schicht_check')
  then raise exception 'UNVOLLSTAENDIG: spiel_ereignisse_schicht_check fehlt'; end if;

  raise notice 'Fertig: 3 Tabellen, 6 Policies, 2 Spalten, 2 Schluessel.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Bestaetigung fuer den Menschen. Die Absicherung ist der Block oben.

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'neue Tabellen', 3,
         (select count(*) from information_schema.tables
           where table_schema='public'
             and table_name in ('sfv_zuordnung','spiel_aufstellung','spiel_ereignisse'))::int
  union all
  select 2, 'Policies', 6,
         (select count(*) from pg_policies where schemaname='public'
           and tablename in ('sfv_zuordnung','spiel_aufstellung','spiel_ereignisse'))::int
  union all
  select 3, 'Vereine mit sfv_club_nummer', 1,
         (select count(*) from public.vereine where sfv_club_nummer is not null)::int
  union all
  select 4, 'CHECK-Constraints auf spiel_ereignisse', 3,
         (select count(*) from pg_constraint
           where conrelid = 'public.spiel_ereignisse'::regclass and contype = 'c')::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

-- Die Anonymitaets-Regel zum Anfassen. BEIDE muessen scheitern.
-- (Einzeln ausfuehren, jede fuer sich; ohne Rollback bleibt nichts stehen,
--  weil die Constraint vorher greift.)
--
-- insert into public.spiel_ereignisse
--   (verein_id, spiel_id, herkunft, sfv_event_id, typ_id, ist_eigener, sfv_person_id)
-- select verein_id, id, 'sfv', -1, 1, false, 999999 from public.spiele limit 1;
--   → erwartet: spiel_ereignisse_fremde_anonym_check
--
-- insert into public.spiel_ereignisse
--   (verein_id, spiel_id, herkunft, sfv_event_id, typ_id, ist_eigener, korrigiert_von)
-- select verein_id, id, 'verein', 42, 1, true, null from public.spiele limit 1;
--   → erwartet: spiel_ereignisse_schicht_check


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Gefahrlos, solange der Sync noch nicht laeuft: es gibt nichts zu verlieren
-- ausser von Hand gesetzten Zuordnungen und Korrekturen.
--
-- begin;
--   drop table if exists public.spiel_ereignisse;
--   drop table if exists public.spiel_aufstellung;
--   drop table if exists public.sfv_zuordnung;
--   alter table public.spiele  drop column if exists matchdaten_geholt_am;
--   alter table public.vereine drop column if exists sfv_club_nummer;
--   alter table public.spiele     drop constraint if exists spiele_id_verein_key;
--   alter table public.mitglieder drop constraint if exists mitglieder_id_verein_key;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Strukturaenderung — Dump UND Typen nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   Zaehlprobe gegen die alte Fassung:
--     CREATE TABLE     +3
--     CREATE POLICY    +6
--     CREATE INDEX     +4   (2 normale, 2 partielle unique)
--     ADD CONSTRAINT   +11  3 pkey, 2 unique, 4 fkey, 2 auf spiele/mitglieder
--
--   NICHT +14: die vier CHECK-Constraints (herkunft, schicht, fremde_anonym
--   und der impliziten) stehen im Dump INLINE im CREATE TABLE, nicht als
--   eigenes ADD CONSTRAINT — siehe CLAUDE.md, Datenbank-Workflow.
--
-- WAS DANACH KOMMT
--   Schritt 3  sfvApi.ts um holeMatch/holeAufstellung/holeEreignisse,
--              sync.ts um den Matchdaten-Abschnitt. Zehn Spiele pro Lauf,
--              neue vor Wiederholungen, Wiederholung bis Spieldatum + 7 Tage.
--   Schritt 4  Anzeige: Spielbericht, Warteschlange fuer die Zuordnung,
--              Korrekturmaske.
--   Schritt 5  ht_resultat aus intermediateResults (resultTypeName
--              "Halbzeit") und die Feldhoheit umstellen — erst wenn der
--              Sync laeuft.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ NACHTRAG — mitglied_id ist im halben Schema der falsche Typ
--
-- Beim Schreiben dieser Migration aufgefallen. `mitglieder.id` ist bigint.
-- In ACHT Tabellen steht `mitglied_id` trotzdem als uuid:
--
--   aufgebote, anwesenheiten, abstimmung_antworten, bus_anmeldungen,
--   helper_einsatz_pflicht_mitglied, helper_zuteilungen,
--   material_ausleihen, team_helfer_zuteilungen
--   (dazu news.mitglied_ids als uuid[])
--
-- Die anderen acht sind richtig (bigint): benutzer, kader, eltern_kinder,
-- elternkontakte, mitglieder_aenderungen, mitglieder_aktivitaeten,
-- mitglieder_notizen, mitglieder_team_details.
--
-- KEINE der uuid-Tabellen hat einen Fremdschluessel auf mitglieder — sonst
-- waere es beim Anlegen aufgefallen. Sie sind alle noch ungenutzt und warten
-- auf Phase 4 (Kader, Termine, Helfer, Dashboard); der Fehler wirkt heute
-- nirgends, weil niemand hineinschreibt.
--
-- WARUM ES HIER STEHT. `aufgebote.mitglied_id` ist eine davon. Der spaetere
-- Vergleich "wer war aufgeboten und hat nicht gespielt" braucht den Join
-- Aufgebot ↔ Aufstellung ueber das Mitglied — und der ist mit uuid gegen
-- bigint nicht moeglich. Diese Migration baut ihre Seite richtig (bigint mit
-- Fremdschluessel); die andere Seite muss vor Phase 4 nachgezogen werden.
--
-- NICHT TEIL DIESER MIGRATION. Die acht Tabellen sind leer und gehoeren zu
-- einem anderen Auftrag. Hier steht nur der Befund, damit er nicht erst
-- auffaellt, wenn jemand den Vergleich bauen will.
--
-- Zum Nachzaehlen:
--   select table_name, data_type from information_schema.columns
--    where table_schema='public' and column_name='mitglied_id'
--    order by data_type, table_name;
-- ═══════════════════════════════════════════════════════════════════════════
