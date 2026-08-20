-- ═══════════════════════════════════════════════════════════════════════════
-- HELFEREINSATZ GEHOERT DER PERSON, DIE PFLICHT DER MITGLIEDSCHAFT
-- 20.08.2026
--
-- Anlass: das Supporter-Modal versprach „kann Helferschichten uebernehmen".
-- Das Datenmodell kann das nicht einloesen — `helper_zuteilungen.mitglied_id`
-- verweist auf eine Mitgliedschaft, die ein Supporter nicht hat. Der Satz ist
-- am selben Tag aus dem Nutzertext verschwunden; hier wird die Ursache
-- behoben.
--
--
-- ZWEI FRAGEN, DIE HEUTE EINE SPALTE BEANTWORTET
--
--   „Wer DARF mithelfen?"   → die PERSON. Der Elternteil, der die
--                             Festwirtschaft macht, ist oft kein Mitglied;
--                             der Goenner, der beim Turnier hilft, auch nicht.
--   „Wer MUSS Einsaetze leisten?" → die MITGLIEDSCHAFT. Ein Goenner schuldet
--                             dem Verein nichts.
--
-- Dieselbe Verwechslung wie Amt und Rechtebuendel unter einem Namen
-- (ARCHITECTURE.md → Berechtigungen). Deshalb trennen sich die vier Tabellen:
--
--   helper_zuteilungen              mitglied_id uuid  →  person_id  uuid
--   team_helfer_zuteilungen         mitglied_id uuid  →  person_id  uuid
--   helper_einsatz_pflicht_mitglied mitglied_id uuid  →  mitglied_id bigint
--   anwesenheiten                   mitglied_id uuid  →  mitglied_id bigint
--
-- `anwesenheiten` bleibt bei der Mitgliedschaft: Training und Spiel setzen
-- einen Kadereintrag voraus, und der haengt am Mitglied.
--
--
-- ⚠ ALLE VIER WAREN OHNEHIN KAPUTT
--
-- `mitglieder.id` ist `bigint`. Ein Join von `uuid` darauf ist nicht bloss
-- unpassend, er ist unmoeglich — die Spalte war fuer NIEMANDEN benutzbar,
-- auch fuer Mitglieder nicht. Keine der vier hat einen Fremdschluessel auf
-- `mitglieder`; genau das liess den Typfehler jahrelang unbemerkt stehen.
-- Diese Migration legt die Fremdschluessel deshalb mit an.
--
--
-- ⚠ `mitglied_name` FAELLT WEG
--
-- `helper_zuteilungen` fuehrte neben `mitglied_id` ein `mitglied_name text`,
-- und `mitglied_id` war nullable. Das ist eine Umgehung, die eingebaut wurde,
-- bevor jemand die Frage gestellt hat: Wer den Namen daneben speichert, weiss,
-- dass der Helfer manchmal keine Zeile in `mitglieder` hat.
--
-- Eine Kopie, die auseinanderlaeuft, statt der richtigen Verknuepfung —
-- dasselbe Muster wie `mitglieder.eltern` (jsonb mit Name, Mail und Telefon,
-- aber ohne benutzer_id; 391 Zeilen, die nie einen Treffer ergaben) und wie
-- `hat_portal_zugang` neben dem Join auf `benutzer`. Mit `person_id` gibt es
-- den Namen an einer Stelle, und die ist die richtige.
--
--
-- ⚠ `anwesenheiten.benutzer_id` FAELLT EBENFALLS WEG — MIT FOLGEN FUER RLS
--
-- Die Spalte hiess „hat ein Portal-Konto", und das ist etwas anderes als „war
-- im Training": wer kein Konto hat, kann trotzdem anwesend sein.
--
-- ABER: beide Policies auf `anwesenheiten` pruefen heute
-- `benutzer_id = auth.uid()` — das war der einzige Weg, „meine eigene Zeile"
-- auszudruecken, solange `mitglied_id` als uuid unbrauchbar war. Ohne Ersatz
-- saehe nach dem Streichen niemand mehr seine eigene Anwesenheit, und ein
-- Spieler koennte sich nicht mehr selbst eintragen.
--
-- Block E schreibt sie deshalb auf `mitglied_id = get_my_mitglied_id()` um.
-- Die Funktion gibt es seit langem; sie war nur nicht verwendbar, weil die
-- Typen nicht zueinander passten. Das Recht wird dadurch nicht weiter, nur
-- richtig ausgedrueckt.
--
--
-- ⚠ VIER WEITERE TABELLEN BLEIBEN UNANGETASTET
--
-- `aufgebote`, `bus_anmeldungen`, `abstimmung_antworten` und
-- `material_ausleihen` fuehren `mitglied_id` ebenfalls als uuid. Sie sind
-- NICHT Teil dieser Migration, weil jede eine eigene Antwort braucht und
-- keine davon hier entschieden wurde:
--
--   aufgebote            vermutlich Mitgliedschaft (Aufgebot setzt Kader voraus)
--   bus_anmeldungen      vermutlich Person (Eltern und Goenner fahren mit)
--   abstimmung_antworten offen — haengt daran, ob eine Abstimmung ein
--                        GV-Beschluss ist (Mitgliedschaft) oder eine Umfrage
--                        (Person)
--   material_ausleihen   vermutlich Person (wer den Gegenstand physisch hat)
--
-- „Vermutlich" ist kein Grund, eine Spalte umzustellen. Sie kommen mit dem
-- Modul, das sie benutzt.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_zeilen  int;
  v_typ     text;
  v_anz     int;
begin

  -- ─── A) Sind sie wirklich leer? ──────────────────────────────────────────
  -- Solange sie leer sind, ist die Umstellung ein `drop column`/`add column`
  -- ohne Datenverlust. Mit Zeilen darin waere es eine Migration mit Abbildung
  -- — und die kann dieser Block nicht leisten, weil er nicht weiss, welche
  -- Person hinter einer uuid stand, die auf nichts verweist.

  select
    (select count(*) from public.helper_zuteilungen)
  + (select count(*) from public.team_helfer_zuteilungen)
  + (select count(*) from public.helper_einsatz_pflicht_mitglied)
  + (select count(*) from public.anwesenheiten)
    into v_zeilen;

  if v_zeilen > 0 then
    raise exception 'ABBRUCH: % Zeilen in den vier Tabellen. Diese Migration setzt voraus, dass sie leer sind — die alten uuid-Werte verweisen auf nichts, eine Abbildung auf Personen oder Mitglieder ist daraus nicht herstellbar. Erst klaeren, woher die Zeilen kommen.', v_zeilen;
  end if;
  raise notice 'Alle vier Tabellen leer — die Umstellung ist verlustfrei.';


  -- ─── A2) Haengt eine Policy an den Spalten, die fallen sollen? ───────────
  -- Eine Policy ist ein abhaengiges Objekt und BLOCKIERT `drop column` mit
  -- 2BP01 — anders als ein Unique-Schluessel oder ein Index, die
  -- stillschweigend mitfallen. Beim ersten Anlauf ist genau das passiert.
  --
  -- Bekannt sind die zwei auf `anwesenheiten`; Block E streicht und ersetzt
  -- sie ausdruecklich. Kommt eine weitere dazu, soll hier ein Satz stehen und
  -- nicht der Rohtext von Postgres.

  select count(*) into v_anz
    from pg_policies
   where schemaname = 'public'
     and tablename in ('helper_zuteilungen','team_helfer_zuteilungen',
                       'helper_einsatz_pflicht_mitglied','anwesenheiten')
     and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '(mitglied_id|mitglied_name|benutzer_id)'
     and policyname not in ('anwesenheiten_select','anwesenheiten_write');

  if v_anz > 0 then
    raise exception 'ABBRUCH: % Policy/Policies ausser den zwei bekannten nennen mitglied_id, mitglied_name oder benutzer_id. Sie wuerden das DROP mit 2BP01 blockieren. Sie gehoeren in diese Migration aufgenommen — nicht per CASCADE weggeraeumt, sonst verschwinden sie ungenannt.', v_anz;
  end if;


  -- ─── B) helper_zuteilungen → person_id ───────────────────────────────────
  -- Wer eine Schicht uebernimmt, ist ein Mensch, keine Mitgliedschaft.

  alter table public.helper_zuteilungen
    drop column if exists mitglied_id,
    /* Die Kopie faellt mit. Der Name steht ab jetzt in `personen`. */
    drop column if exists mitglied_name;

  alter table public.helper_zuteilungen
    add column if not exists person_id uuid;

  alter table public.helper_zuteilungen
    add constraint helper_zuteilungen_person_fkey
    foreign key (person_id) references public.personen(id) on delete cascade;

  /* Der Schluessel bleibt ohne verein_id: `schicht_id` zeigt auf
     `helper_schichten`, das selbst mandantengebunden ist — anders als ein
     Name, der global eindeutig waere und dem zweiten Verein etwas wegnaehme
     (ARCHITECTURE.md → Mandantenfaehigkeit). */
  alter table public.helper_zuteilungen
    add constraint helper_zuteilungen_schicht_person_key unique (schicht_id, person_id);

  create index if not exists idx_helper_zuteilungen_person
    on public.helper_zuteilungen (person_id);

  execute $q$ comment on column public.helper_zuteilungen.person_id is
    'Wer die Schicht uebernimmt — eine PERSON, keine Mitgliedschaft. Eltern und Supporter helfen mit, ohne Mitglied zu sein. Die Pflicht zu Einsaetzen haengt dagegen an der Mitgliedschaft (helper_einsatz_pflicht_mitglied).' $q$;


  -- ─── C) team_helfer_zuteilungen → person_id ──────────────────────────────

  alter table public.team_helfer_zuteilungen
    drop column if exists mitglied_id;

  alter table public.team_helfer_zuteilungen
    add column if not exists person_id uuid;

  alter table public.team_helfer_zuteilungen
    add constraint team_helfer_zuteilungen_person_fkey
    foreign key (person_id) references public.personen(id) on delete cascade;

  alter table public.team_helfer_zuteilungen
    add constraint team_helfer_zuteilungen_aufgabe_person_key unique (aufgabe_id, person_id);

  create index if not exists idx_team_helfer_zuteilungen_person
    on public.team_helfer_zuteilungen (person_id);

  execute $q$ comment on column public.team_helfer_zuteilungen.person_id is
    'Wer die Teamaufgabe uebernimmt — eine PERSON. Gerade hier sind es ueberwiegend Eltern, die selbst keine Mitgliedschaft haben.' $q$;


  -- ─── D) helper_einsatz_pflicht_mitglied → mitglied_id bigint ─────────────
  -- Eine PFLICHT trifft die Mitgliedschaft. Das Wort steht im Tabellennamen.

  alter table public.helper_einsatz_pflicht_mitglied
    drop column if exists mitglied_id;

  /* NOT NULL wie zuvor: eine Pflicht ohne Mitglied ist keine Aussage.
     Auf einer leeren Tabelle kostet das nichts. */
  alter table public.helper_einsatz_pflicht_mitglied
    add column if not exists mitglied_id bigint not null;

  /* Zusammengesetzt auf (id, verein_id) wie sfv_zuordnung: der Fremdschluessel
     erzwingt damit zugleich, dass Pflicht und Mitglied demselben Verein
     gehoeren. */
  alter table public.helper_einsatz_pflicht_mitglied
    add constraint helper_pflicht_m_mitglied_fkey
    foreign key (mitglied_id, verein_id) references public.mitglieder(id, verein_id) on delete cascade;

  alter table public.helper_einsatz_pflicht_mitglied
    add constraint helper_pflicht_m_mitglied_saison_key unique (mitglied_id, saison);

  execute $q$ comment on column public.helper_einsatz_pflicht_mitglied.mitglied_id is
    'Wer Einsaetze SCHULDET — die Mitgliedschaft, nicht die Person. Ein Supporter schuldet dem Verein nichts; wer mithelfen DARF, steht in helper_zuteilungen.person_id.' $q$;


  -- ─── E) anwesenheiten → mitglied_id bigint, benutzer_id weg ──────────────
  --
  -- ⚠ DIE REIHENFOLGE IST DER GANZE BLOCK.
  --
  -- Erster Anlauf am 20.08.2026 brach ab:
  --
  --   ERROR 2BP01: cannot drop column benutzer_id of table anwesenheiten
  --   because other objects depend on it
  --   DETAIL: policy anwesenheiten_select … policy anwesenheiten_write
  --
  -- Eine Policy ist ein abhaengiges Objekt und blockiert das DROP — anders
  -- als ein Unique-Schluessel oder ein Index, die stillschweigend mitfallen.
  -- Die drei Tabellen darueber haben deshalb kein Problem: ihre Policies
  -- pruefen nur `verein_id` und `is_admin()`, nicht die Spalte.
  --
  -- ⚠ KEIN `drop column … cascade`. Es waere die kuerzere Zeile und der
  -- falsche Weg: die Policies verschwaenden, ohne dass es im Migrationstext
  -- steht — genau die stille Sorte Nebenwirkung, die man ein halbes Jahr
  -- spaeter sucht. Sie werden ausdruecklich gestrichen und ausdruecklich neu
  -- angelegt.
  --
  -- Reihenfolge deshalb:  Policies weg → Spalten weg → Spalte neu →
  -- Schluessel → Policies neu. Dazwischen hat die Tabelle RLS ohne Policy,
  -- ist also vollstaendig gesperrt und nicht offen — und weil alles in einem
  -- Block laeuft, sieht diesen Zustand ohnehin niemand.

  drop policy if exists anwesenheiten_select on public.anwesenheiten;
  drop policy if exists anwesenheiten_write  on public.anwesenheiten;

  alter table public.anwesenheiten
    drop column if exists mitglied_id,
    /* „hat ein Konto" ist nicht „war im Training". */
    drop column if exists benutzer_id;

  alter table public.anwesenheiten
    add column if not exists mitglied_id bigint;

  alter table public.anwesenheiten
    add constraint anwesenheiten_mitglied_fkey
    foreign key (mitglied_id, verein_id) references public.mitglieder(id, verein_id) on delete cascade;

  alter table public.anwesenheiten
    add constraint anwesenheiten_mitglied_event_key unique (mitglied_id, event_type, event_id);

  create index if not exists idx_anwesenheiten_mitglied
    on public.anwesenheiten (mitglied_id);

  execute $q$ comment on column public.anwesenheiten.mitglied_id is
    'Wer anwesend war — die Mitgliedschaft. Training und Spiel setzen einen Kadereintrag voraus, und der haengt am Mitglied. Die fruehere Spalte benutzer_id ist am 20.08.2026 entfallen: sie hiess „hat ein Portal-Konto", und wer keines hat, kann trotzdem anwesend sein.' $q$;

  /* Jetzt erst die Policies — vorher gaebe es die Spalte nicht, auf die sie
     sich beziehen. get_my_mitglied_id() statt auth.uid(): das Recht wird
     dadurch nicht weiter, es wird richtig ausgedrueckt. */
  create policy anwesenheiten_select on public.anwesenheiten for select
    using (verein_id = public.get_my_verein_id()
           and (mitglied_id = public.get_my_mitglied_id()
                or public.get_my_role() = any (array['administrator','administration','trainer','funktionaer'])));

  create policy anwesenheiten_write on public.anwesenheiten
    using (verein_id = public.get_my_verein_id()
           and (mitglied_id = public.get_my_mitglied_id()
                or public.get_my_role() = any (array['administrator','administration','trainer'])));


  -- ─── F) Pruefung ─────────────────────────────────────────────────────────

  for v_typ, v_anz in
    select 'helper_zuteilungen.person_id',              count(*) from information_schema.columns
     where table_schema='public' and table_name='helper_zuteilungen' and column_name='person_id' and data_type='uuid'
    union all
    select 'team_helfer_zuteilungen.person_id',         count(*) from information_schema.columns
     where table_schema='public' and table_name='team_helfer_zuteilungen' and column_name='person_id' and data_type='uuid'
    union all
    select 'helper_einsatz_pflicht_mitglied.mitglied_id', count(*) from information_schema.columns
     where table_schema='public' and table_name='helper_einsatz_pflicht_mitglied' and column_name='mitglied_id' and data_type='bigint'
    union all
    select 'anwesenheiten.mitglied_id',                 count(*) from information_schema.columns
     where table_schema='public' and table_name='anwesenheiten' and column_name='mitglied_id' and data_type='bigint'
  loop
    if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: % fehlt oder hat den falschen Typ', v_typ; end if;
  end loop;

  /* Die gestrichenen Spalten duerfen nicht mehr da sein. */
  select count(*) into v_anz from information_schema.columns
   where table_schema='public'
     and ((table_name='helper_zuteilungen' and column_name in ('mitglied_id','mitglied_name'))
       or (table_name='team_helfer_zuteilungen' and column_name='mitglied_id')
       or (table_name='anwesenheiten' and column_name='benutzer_id'));
  if v_anz <> 0 then raise exception 'UNVOLLSTAENDIG: % Altspalte(n) stehen noch', v_anz; end if;

  /* Vier neue Fremdschluessel — ohne sie bliebe der naechste Typfehler
     wieder jahrelang unbemerkt. */
  select count(*) into v_anz from pg_constraint
   where contype = 'f' and conname in ('helper_zuteilungen_person_fkey','team_helfer_zuteilungen_person_fkey',
                                       'helper_pflicht_m_mitglied_fkey','anwesenheiten_mitglied_fkey');
  if v_anz <> 4 then raise exception 'UNVOLLSTAENDIG: nur % von 4 Fremdschluesseln angelegt', v_anz; end if;

  /* Und die zwei Policies, ohne die niemand seine eigene Anwesenheit sieht. */
  select count(*) into v_anz from pg_policies
   where schemaname='public' and tablename='anwesenheiten'
     and policyname in ('anwesenheiten_select','anwesenheiten_write');
  if v_anz <> 2 then raise exception 'UNVOLLSTAENDIG: nur % von 2 Policies auf anwesenheiten', v_anz; end if;

  raise notice 'Fertig. Helfereinsatz haengt an der Person, Pflicht und Anwesenheit an der Mitgliedschaft.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

select table_name, column_name, data_type
  from information_schema.columns
 where table_schema='public' and column_name in ('mitglied_id','person_id')
   and table_name in ('helper_zuteilungen','team_helfer_zuteilungen',
                      'helper_einsatz_pflicht_mitglied','anwesenheiten')
 order by table_name, column_name;
-- erwartet: helper_zuteilungen.person_id uuid
--           team_helfer_zuteilungen.person_id uuid
--           helper_einsatz_pflicht_mitglied.mitglied_id bigint
--           anwesenheiten.mitglied_id bigint

/* Die vier, die NICHT angefasst wurden — sie stehen weiter als uuid da und
   warten auf ihr Modul. */
select table_name, data_type from information_schema.columns
 where table_schema='public' and column_name='mitglied_id' and data_type='uuid'
 order by table_name;
-- erwartet: aufgebote, bus_anmeldungen, abstimmung_antworten, material_ausleihen


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und Typen nachziehen (`npm run gen:types`).
--
--   ZAEHLPROBE:
--     CREATE TABLE   +0
--     CREATE POLICY  +0   zwei ersetzt, nicht ergaenzt
--     CREATE INDEX   ±0   idx_anwesenheiten_mitglied faellt mit der Spalte und
--                         entsteht neu; zwei kommen dazu (helper_*_person)
--                         → netto +2
--     ADD CONSTRAINT +4   die Fremdschluessel; die drei Unique-Schluessel
--                         fallen mit ihren Spalten und entstehen neu → ±0
--
--   Der Satz „kann Helferschichten uebernehmen" darf danach zurueck in
--   SupporterModal, AustrittModal und EntkopplungModal — aber erst, wenn das
--   HelferModul die Tabellen tatsaechlich benutzt. Es haengt heute an
--   demoData; ein Versprechen bleibt es bis dahin.
-- ═══════════════════════════════════════════════════════════════════════════
