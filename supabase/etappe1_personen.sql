-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — Datenmodell-Umbau, ETAPPE 1
-- personen additiv anlegen, befuellen und den fehlenden Testfall herstellen
--
-- Stand: 04.08.2026 · Ziel-DB: clubcampus (otiyvvxoqghtkcgsjmrv)
-- Verein: 00000000-0000-0000-0000-000000000001 (FC Herrliberg)
--
-- ───────────────────────────────────────────────────────────────────────────
-- WAS DIESE ETAPPE TUT
--
--   Legt die Tabelle `personen` an, ergaenzt `person_id` als NULLABLE Spalte
--   in mitglieder, benutzer und eltern_kinder, und befuellt beides aus dem
--   Bestand. `elternkontakte` bleibt unangetastet und weiterhin fuehrend.
--
--   Der Code wird NICHT angefasst. Alles ist additiv, alle neuen Spalten sind
--   nullable, `database.types.ts` wird ein Superset. Nach dieser Etappe
--   muessen unveraendert gruen sein:
--       npm run typecheck
--       npm run build
--       npm test          -> 254 passed, 2 skipped
--
-- ───────────────────────────────────────────────────────────────────────────
-- WAS DIESE ETAPPE BEWUSST NICHT TUT
--
--   Sie fuehrt KEINE Personen zusammen. Aus jeder mitglieder-Zeile und jeder
--   elternkontakte-Zeile wird genau eine Person — 1:1, ohne Namens- oder
--   E-Mail-Abgleich. Grund: im Bestand gibt es 0 gemeinsame E-Mail-Adressen,
--   aber 54 gleiche Namen, die verschiedene Menschen sind (mehrere "Urs Huber"
--   als verschiedene mitglied_id). Ein Merge ueber den Namen wuerde Menschen
--   verschmelzen. Block I meldet Kandidaten nur; der Merge kommt in Etappe 2.
--
-- ───────────────────────────────────────────────────────────────────────────
-- AUSFUEHRUNGSREIHENFOLGE  (blockweise in den Supabase-SQL-Editor kopieren)
--
--   A   Tabelle personen
--   D   Additive Spalten             <- VOR B, siehe Hinweis unten
--   B   Hilfsfunktionen
--   C   Policies
--   E   Backfill                     <- 1. Durchlauf
--   F   Verifikation                 <- 1. Durchlauf, erwartet 898 Personen
--   G   Seed
--   E   Backfill                     <- 2. Durchlauf (identisches SQL)
--   F   Verifikation                 <- 2. Durchlauf, erwartet 908 Personen
--   G2  Adressen der getrennten Eltern
--   H   Portal-Zugang fuer einen Elternteil (mit einem Schritt im Dashboard)
--   I   Dublettenbericht
--
--   Die Buchstaben sind absichtlich nicht alphabetisch: D muss vor B laufen.
--   LANGUAGE-sql-Funktionen werden bei CREATE geparst und validiert
--   (check_function_bodies ist an), und beide Funktionen aus B greifen auf
--   person_id zu — eine Spalte, die erst D anlegt. In alphabetischer Folge
--   scheitert Block B mit »column person_id does not exist«. C wiederum
--   braucht die Funktionen aus B, steht also danach.
--
--   Jeder Block ist idempotent — bei einem Abbruch nachbessern und den Block
--   erneut laufen lassen. Der Seed (G) ist ein einzelner DO-Block und damit
--   atomar: er laeuft ganz durch oder gar nicht.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Tabelle personen                                              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

create table if not exists public.personen (
  id                 uuid        primary key default gen_random_uuid(),
  verein_id          uuid        not null references public.vereine(id),
  vorname            text        not null,
  nachname           text        not null,
  email              text,
  telefon            text,
  strasse            text,
  plz                text,
  ort                text,
  kanton             text,
  land               text        default 'Schweiz',
  geburtsdatum       date,
  geschlecht         text,
  nationalitaet      text        default 'CH',
  nationalitaet2     text,
  heimatort          text,
  ahv_nr             text,
  foto_url           text,
  funktionen         text[]      not null default '{}',
  profil_geprueft_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Nicht enthalten, mit Absicht:
--   supporter          -> ist ein mitgliedtyp (existiert bereits, sort_order 8)
--   position/rueckennr -> gehoeren an kader (Team + Saison, nicht an den Menschen)
--   hat_portal_zugang  -> wird aus benutzer abgeleitet
--   datenstatus, notizen, fairgate_sync_at, eltern -> entfallen in Etappe 6

comment on table  public.personen is
  'Ein Mensch, einmal pro Verein. mitglieder ist die Mitgliedschaft dieser Person.';
comment on column public.personen.profil_geprueft_at is
  'Datenpruefung der Person. Loest die drei parallelen Felder in mitglieder, elternkontakte und benutzer ab.';
comment on column public.personen.funktionen is
  'Vereinsfunktionen. An der Person, nicht an der Mitgliedschaft: ein Materialwart muss kein Mitglied sein.';
comment on column public.personen.strasse is
  'Adresse an der Person: getrennte Eltern und Kind koennen drei verschiedene Adressen haben.';

create index if not exists personen_verein_idx   on public.personen (verein_id);
create index if not exists personen_nachname_idx on public.personen (verein_id, nachname);
create index if not exists personen_email_idx    on public.personen (verein_id, lower(email));
create index if not exists personen_geprueft_idx on public.personen (profil_geprueft_at);

alter table public.personen enable row level security;

drop trigger if exists personen_updated_at on public.personen;
create trigger personen_updated_at before update on public.personen
  for each row execute function public.update_updated_at();


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Additive Spalten                                              ║
-- ║           Laeuft VOR B: die Funktionen in B greifen auf person_id zu.   ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

alter table public.mitglieder    add column if not exists person_id uuid references public.personen(id);
alter table public.benutzer      add column if not exists person_id uuid references public.personen(id);
alter table public.eltern_kinder add column if not exists person_id uuid references public.personen(id);

-- beziehung wandert von elternkontakte hierher: "Mutter/Vater/Vormund" ist
-- eine Eigenschaft der Verknuepfung, nicht der Person. Dieselbe Person kann
-- Mutter von Kind A und Vormund von Kind B sein.
alter table public.eltern_kinder add column if not exists beziehung text;

comment on column public.eltern_kinder.beziehung is
  'Mutter/Vater/Vormund … — Eigenschaft der Verknuepfung, nicht der Person.';

create index if not exists mitglieder_person_idx    on public.mitglieder    (person_id);
create index if not exists benutzer_person_idx      on public.benutzer      (person_id);
create index if not exists eltern_kinder_person_idx on public.eltern_kinder (person_id);

-- Hoechstens ein Hauptkontakt pro Kind. Bisher erzwang das nichts:
-- setHauptkontakt() macht zwei UPDATEs ohne Transaktion. Fuer eine
-- Rechnungsadresse zu wenig. Aktuell 0 Verstoesse — greift also sofort.
create unique index if not exists eltern_kinder_ein_hauptkontakt
  on public.eltern_kinder (mitglied_id) where hauptkontakt;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Hilfsfunktionen                                               ║
-- ║           Laeuft NACH D. LANGUAGE-sql-Funktionen werden bei CREATE      ║
-- ║           geparst und validiert (check_function_bodies ist an) — vor D  ║
-- ║           scheitern beide an der noch fehlenden Spalte person_id.       ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Pendant zu get_my_mitglied_id(). Liefert NULL, solange benutzer.person_id
-- leer ist; die Self-Policies greifen dann schlicht nicht. Unschaedlich.
-- get_my_mitglied_id() bleibt bestehen und wird erst in Etappe 6 entfernt.
create or replace function public.get_my_person_id() returns uuid
  language sql stable security definer set search_path = public, pg_temp
as $fn$
  select person_id from public.benutzer where id = auth.uid() limit 1;
$fn$;

-- SECURITY DEFINER ist hier zwingend: eine Unterabfrage in einer Policy
-- unterliegt der RLS der abgefragten Tabelle. Ohne Definer koennte ein
-- Elternteil die mitglieder-Zeile seines Kindes nicht lesen — die Rolle
-- 'eltern' hat auf mitglieder weder select_self noch select_priv — und die
-- Policy liefe immer leer.
create or replace function public.person_ist_mein_kind(p_person_id uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.eltern_kinder ek
    join public.mitglieder    m on m.id = ek.mitglied_id
    where m.person_id  = p_person_id
      and ek.person_id = public.get_my_person_id()
  );
$fn$;

alter function public.get_my_person_id()         owner to postgres;
alter function public.person_ist_mein_kind(uuid) owner to postgres;
grant execute on function public.get_my_person_id()         to anon, authenticated, service_role;
grant execute on function public.person_ist_mein_kind(uuid) to anon, authenticated, service_role;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Policies                                                      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- Bewusst OHNE das Muster von elternkontakte_verein:
--     CREATE POLICY … FOR ALL USING (verein_id = get_my_verein_id())
-- Das gibt heute jedem eingeloggten Vereinsbenutzer Lese- UND Schreibzugriff
-- auf alle Elternkontakte, weil Policies ODER-verknuepft werden und die
-- engere elternkontakte_select dadurch wirkungslos ist. In personen liegen
-- kuenftig die Privatadressen getrennter Eltern — dort darf das nicht sein.

drop policy if exists personen_select_priv  on public.personen;
drop policy if exists personen_select_self  on public.personen;
drop policy if exists personen_select_kind  on public.personen;
drop policy if exists personen_insert_admin on public.personen;
drop policy if exists personen_update_admin on public.personen;
drop policy if exists personen_update_self  on public.personen;
drop policy if exists personen_delete_admin on public.personen;

-- Paritaet zu mitglieder_select_priv, damit Etappe 2 die Listen nicht bricht.
-- Bewusste Entscheidung: Trainer und Funktionaere sehen damit auch die
-- Adressen der Eltern. Enger ziehen laesst sich das jederzeit genau hier.
create policy personen_select_priv on public.personen for select
  using (verein_id = public.get_my_verein_id()
         and public.get_my_role() = any (array['administrator','administration','trainer','funktionaer']));

create policy personen_select_self on public.personen for select
  using (verein_id = public.get_my_verein_id() and id = public.get_my_person_id());

-- Neu gegenueber heute: Eltern duerfen die Person ihres Kindes lesen.
-- Diese Moeglichkeit fehlt aktuell vollstaendig.
create policy personen_select_kind on public.personen for select
  using (verein_id = public.get_my_verein_id() and public.person_ist_mein_kind(id));

create policy personen_insert_admin on public.personen for insert
  with check (verein_id = public.get_my_verein_id() and public.is_admin());

create policy personen_update_admin on public.personen for update
  using (verein_id = public.get_my_verein_id() and public.is_admin());

create policy personen_update_self on public.personen for update
  using (verein_id = public.get_my_verein_id() and id = public.get_my_person_id());

create policy personen_delete_admin on public.personen for delete
  using (verein_id = public.get_my_verein_id() and public.is_admin());

alter table public.personen owner to postgres;
grant select, insert, update, delete on public.personen to authenticated;
grant all on public.personen to service_role;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK E — Backfill                            >>> 1. DURCHLAUF <<<      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- Deterministische IDs statt Mapping-Tabelle: dadurch beliebig wiederholbar.
-- Fuer eine echte Migration mit Echtdaten nimmt man eine Map-Tabelle — hier
-- sind die Daten wegwerfbar.
--
-- KEIN Zusammenfuehren: 1 Person je mitglieder-Zeile, 1 Person je
-- elternkontakte-Zeile. Martin Wyss aus dem Seed bekommt bewusst zwei
-- Personenzeilen — das ist der Zustand, den der Umbau spaeter aufloest.

-- E1: Person je Mitglied
insert into public.personen (
  id, verein_id, vorname, nachname, email, telefon,
  strasse, plz, ort, kanton, land, geburtsdatum, geschlecht,
  nationalitaet, nationalitaet2, heimatort, ahv_nr, foto_url,
  funktionen, profil_geprueft_at, created_at)
select md5('mitglied:' || m.id::text)::uuid,
       m.verein_id, m.vorname, m.nachname, m.email, m.telefon,
       m.strasse, m.plz, m.ort, m.kanton, coalesce(m.land,'Schweiz'),
       m.geburtsdatum, m.geschlecht, coalesce(m.nationalitaet,'CH'),
       m.nationalitaet2, m.heimatort, m.ahv_nr, m.foto_url,
       coalesce(m.funktionen,'{}'), m.profil_geprueft_at, coalesce(m.created_at, now())
from public.mitglieder m
on conflict (id) do nothing;

update public.mitglieder m
   set person_id = md5('mitglied:' || m.id::text)::uuid
 where m.person_id is null;

-- E2: Person je Elternkontakt.
--     personen.id = elternkontakte.id (beide uuid) — dadurch wird der spaetere
--     Wechsel eltern_id -> person_id zur reinen Umbenennung.
--     elternkontakte hat KEINE Adressspalten: diese Personen starten ohne
--     Adresse. Genau die Luecke schliesst der Umbau.
--     Telefon: die Daten liegen in 388 Faellen in tel, in 3 in telefon.
--     name ist NOT NULL und wird nur als Rueckfall benutzt, falls
--     vorname/nachname leer sind.
insert into public.personen (
  id, verein_id, vorname, nachname, email, telefon, profil_geprueft_at, created_at)
select e.id, e.verein_id,
       coalesce(nullif(btrim(e.vorname), ''),  split_part(e.name, ' ', 1)),
       coalesce(nullif(btrim(e.nachname), ''), nullif(regexp_replace(e.name, '^\S+\s*', ''), ''), '-'),
       e.email,
       coalesce(e.telefon, e.tel),
       e.profil_geprueft_at, coalesce(e.created_at, now())
from public.elternkontakte e
on conflict (id) do nothing;

-- E3: Verknuepfung und beziehung uebernehmen
update public.eltern_kinder ek
   set person_id = ek.eltern_id
 where ek.person_id is null;

update public.eltern_kinder ek
   set beziehung = e.beziehung
  from public.elternkontakte e
 where e.id = ek.eltern_id and ek.beziehung is null;

-- E4: benutzer.person_id ueber die bestehende mitglied_id
update public.benutzer b
   set person_id = m.person_id
  from public.mitglieder m
 where m.id = b.mitglied_id and b.person_id is null;

-- E5: Benutzer, die an einem Elternkontakt haengen.
--     Aktuell 0 Zeilen — greift erst nach Block H.
update public.benutzer b
   set person_id = e.id
  from public.elternkontakte e
 where e.benutzer_id = b.id and b.person_id is null;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK F — Verifikation                        >>> 1. DURCHLAUF <<<      ║
-- ║           erwartet: 898 Personen (507 + 391)                            ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select 'personen gesamt' as pruefung,
       (select count(*) from public.personen)::text as wert,
       ((select count(*) from public.mitglieder) + (select count(*) from public.elternkontakte))::text as erwartet
union all select 'mitglieder ohne person_id',    (select count(*) from public.mitglieder    where person_id is null)::text, '0'
union all select 'eltern_kinder ohne person_id', (select count(*) from public.eltern_kinder where person_id is null)::text, '0'
union all select 'eltern_kinder ohne beziehung', (select count(*) from public.eltern_kinder where beziehung is null)::text, '0'
union all select 'personen ohne vorname',        (select count(*) from public.personen where btrim(vorname) = '')::text, '0'
union all select 'personen mit fremdem verein',  (select count(*) from public.personen p
                                                    where not exists (select 1 from public.vereine v where v.id = p.verein_id))::text, '0'
union all select 'benutzer ohne person_id',      (select count(*) from public.benutzer where person_id is null)::text, 'darf >0 sein';


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK G — Seed                                                          ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- Der wichtigste Teil dieser Etappe. Der Testbestand enthaelt den Anlass des
-- Umbaus NICHT: 0 gemeinsame E-Mail-Adressen zwischen mitglieder und
-- elternkontakte, nur 5 von 393 Verknuepfungen mit hauptkontakt, kein
-- einziger Elternkontakt mit Portal-Zugang. Ohne diesen Seed testen wir
-- gegen einen Bestand, in dem das Problem gar nicht vorkommt.
--
-- REIN ADDITIV: kein delete, kein truncate, kein update auf Bestandszeilen.
--   mitglieder      507 -> 513
--   elternkontakte  391 -> 395
--   eltern_kinder   393 -> 397
--
-- Atomar (ein DO-Block): laeuft ganz durch oder gar nicht.
-- Wiederholungsschutz ueber Martins E-Mail.

do $seed$
declare
  v_verein uuid := '00000000-0000-0000-0000-000000000001';
  m_martin bigint; m_nico bigint; m_sandra bigint; m_tim bigint; m_lea bigint;
  e_martin uuid;   e_sandra uuid; e_petra uuid;    e_reto uuid;
begin
  if exists (select 1 from public.mitglieder
              where email = 'martin.wyss@example.ch' and verein_id = v_verein) then
    raise notice 'Seed bereits vorhanden — uebersprungen.';
    return;
  end if;

  -- ── Fall 1: Vater ist selbst Aktivmitglied UND Elternteil, GLEICHE E-Mail.
  --    Der Kernfall des Umbaus. Muss in Block I als eindeutig zusammenfuehrbar
  --    erscheinen.
  insert into public.mitglieder (vorname,nachname,email,telefon,strasse,plz,ort,kanton,
                                 geburtsdatum,geschlecht,nationalitaet,mitgliedtyp,aktiv,verein_id)
  values ('Martin','Wyss','martin.wyss@example.ch','+41 79 100 10 01',
          'Seestrasse 12','8704','Herrliberg','ZH','1981-04-12','m','CH','Aktivmitglied',true,v_verein)
  returning id into m_martin;

  insert into public.mitglieder (vorname,nachname,email,telefon,strasse,plz,ort,kanton,
                                 geburtsdatum,geschlecht,nationalitaet,mitgliedtyp,aktiv,verein_id)
  values ('Nico','Wyss','nico.wyss@example.ch','+41 79 100 10 02',
          'Seestrasse 12','8704','Herrliberg','ZH','2013-09-03','m','CH','Juniorenmitglied',true,v_verein)
  returning id into m_nico;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,tel,beziehung,verein_id)
  values (m_nico,'Martin Wyss','Martin','Wyss','martin.wyss@example.ch','+41 79 100 10 01','Vater',v_verein)
  returning id into e_martin;

  insert into public.eltern_kinder (verein_id,eltern_id,mitglied_id,hauptkontakt)
  values (v_verein,e_martin,m_nico,true);

  -- ── Fall 2: Mutter ist Aktivmitglied UND Elternteil, ABWEICHENDE E-Mail.
  --    Darf NICHT automatisch zusammengefuehrt werden — nur zur Sichtung.
  insert into public.mitglieder (vorname,nachname,email,telefon,strasse,plz,ort,kanton,
                                 geburtsdatum,geschlecht,nationalitaet,mitgliedtyp,aktiv,verein_id)
  values ('Sandra','Vogt','sandra.vogt@example.ch','+41 79 100 20 01',
          'Bergweg 4','8704','Herrliberg','ZH','1979-11-22','w','CH','Aktivmitglied',true,v_verein)
  returning id into m_sandra;

  insert into public.mitglieder (vorname,nachname,email,strasse,plz,ort,kanton,
                                 geburtsdatum,geschlecht,nationalitaet,mitgliedtyp,aktiv,verein_id)
  values ('Tim','Vogt','tim.vogt@example.ch',
          'Bergweg 4','8704','Herrliberg','ZH','2012-02-17','m','CH','Juniorenmitglied',true,v_verein)
  returning id into m_tim;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,tel,beziehung,verein_id)
  values (m_tim,'Sandra Vogt','Sandra','Vogt','s.vogt@privat.example','+41 79 100 20 01','Mutter',v_verein)
  returning id into e_sandra;

  insert into public.eltern_kinder (verein_id,eltern_id,mitglied_id,hauptkontakt)
  values (v_verein,e_sandra,m_tim,true);

  -- ── Fall 3: getrennte Eltern, DREI verschiedene Adressen.
  --    Mutter ist Hauptkontakt -> dorthin geht die Rechnung.
  --    Angeschrieben werden beide. Die Adressen der Eltern setzt Block G2:
  --    elternkontakte hat keine Adressspalten, erst personen kann das.
  insert into public.mitglieder (vorname,nachname,email,strasse,plz,ort,kanton,
                                 geburtsdatum,geschlecht,nationalitaet,mitgliedtyp,aktiv,verein_id)
  values ('Lea','Brunner','lea.brunner@example.ch',
          'Dorfstrasse 9','8704','Herrliberg','ZH','2011-06-30','w','CH','Juniorenmitglied',true,v_verein)
  returning id into m_lea;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,tel,beziehung,verein_id)
  values (m_lea,'Petra Brunner','Petra','Brunner','petra.brunner@example.ch','+41 79 100 30 01','Mutter',v_verein)
  returning id into e_petra;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,tel,beziehung,verein_id)
  values (m_lea,'Reto Brunner','Reto','Brunner','reto.brunner@example.ch','+41 79 100 30 02','Vater',v_verein)
  returning id into e_reto;

  insert into public.eltern_kinder (verein_id,eltern_id,mitglied_id,hauptkontakt)
  values (v_verein,e_petra,m_lea,true),
         (v_verein,e_reto, m_lea,false);

  -- ── Fall 4: Supporter als Mitgliedtyp statt als Flag.
  --    Der Mitgliedtyp existiert bereits (sort_order 8, standard_rolle supporter).
  insert into public.mitglieder (vorname,nachname,email,mitgliedtyp,aktiv,verein_id)
  values ('Heidi','Studer','heidi.studer@example.ch','Supporter',true,v_verein);

  raise notice 'Seed ok — Martin=% Nico=% Sandra=% Tim=% Lea=%', m_martin,m_nico,m_sandra,m_tim,m_lea;
end $seed$;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK E — Backfill                            >>> 2. DURCHLAUF <<<      ║
-- ║           Identisches SQL wie oben. Vergibt Personen fuer die           ║
-- ║           Seed-Zeilen. Bestehende Personen bleiben unberuehrt.          ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- E1: Person je Mitglied
insert into public.personen (
  id, verein_id, vorname, nachname, email, telefon,
  strasse, plz, ort, kanton, land, geburtsdatum, geschlecht,
  nationalitaet, nationalitaet2, heimatort, ahv_nr, foto_url,
  funktionen, profil_geprueft_at, created_at)
select md5('mitglied:' || m.id::text)::uuid,
       m.verein_id, m.vorname, m.nachname, m.email, m.telefon,
       m.strasse, m.plz, m.ort, m.kanton, coalesce(m.land,'Schweiz'),
       m.geburtsdatum, m.geschlecht, coalesce(m.nationalitaet,'CH'),
       m.nationalitaet2, m.heimatort, m.ahv_nr, m.foto_url,
       coalesce(m.funktionen,'{}'), m.profil_geprueft_at, coalesce(m.created_at, now())
from public.mitglieder m
on conflict (id) do nothing;

update public.mitglieder m
   set person_id = md5('mitglied:' || m.id::text)::uuid
 where m.person_id is null;

-- E2: Person je Elternkontakt
insert into public.personen (
  id, verein_id, vorname, nachname, email, telefon, profil_geprueft_at, created_at)
select e.id, e.verein_id,
       coalesce(nullif(btrim(e.vorname), ''),  split_part(e.name, ' ', 1)),
       coalesce(nullif(btrim(e.nachname), ''), nullif(regexp_replace(e.name, '^\S+\s*', ''), ''), '-'),
       e.email,
       coalesce(e.telefon, e.tel),
       e.profil_geprueft_at, coalesce(e.created_at, now())
from public.elternkontakte e
on conflict (id) do nothing;

-- E3: Verknuepfung und beziehung
update public.eltern_kinder ek
   set person_id = ek.eltern_id
 where ek.person_id is null;

update public.eltern_kinder ek
   set beziehung = e.beziehung
  from public.elternkontakte e
 where e.id = ek.eltern_id and ek.beziehung is null;

-- E4: benutzer.person_id ueber mitglied_id
update public.benutzer b
   set person_id = m.person_id
  from public.mitglieder m
 where m.id = b.mitglied_id and b.person_id is null;

-- E5: benutzer.person_id ueber elternkontakte.benutzer_id
update public.benutzer b
   set person_id = e.id
  from public.elternkontakte e
 where e.benutzer_id = b.id and b.person_id is null;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK F — Verifikation                        >>> 2. DURCHLAUF <<<      ║
-- ║           erwartet: 908 Personen (513 + 395)                            ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select 'personen gesamt' as pruefung,
       (select count(*) from public.personen)::text as wert,
       ((select count(*) from public.mitglieder) + (select count(*) from public.elternkontakte))::text as erwartet
union all select 'mitglieder ohne person_id',    (select count(*) from public.mitglieder    where person_id is null)::text, '0'
union all select 'eltern_kinder ohne person_id', (select count(*) from public.eltern_kinder where person_id is null)::text, '0'
union all select 'eltern_kinder ohne beziehung', (select count(*) from public.eltern_kinder where beziehung is null)::text, '0'
union all select 'personen ohne vorname',        (select count(*) from public.personen where btrim(vorname) = '')::text, '0'
union all select 'personen mit fremdem verein',  (select count(*) from public.personen p
                                                    where not exists (select 1 from public.vereine v where v.id = p.verein_id))::text, '0'
union all select 'benutzer ohne person_id',      (select count(*) from public.benutzer where person_id is null)::text, 'darf >0 sein';


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK G2 — Adressen der getrennten Eltern                               ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- Erst jetzt moeglich: elternkontakte hat keine Adressspalten. Damit steht
-- der Fall, um dessentwillen die Adresse an die Person wandert — Kind,
-- Mutter und Vater an drei verschiedenen Orten.
-- Lea bekommt denselben Wert nochmal, den sie aus ihrer mitglieder-Zeile
-- schon hat — harmlos, dient der Vollstaendigkeit des Falls.

update public.personen set strasse='Dorfstrasse 9',    plz='8704', ort='Herrliberg', kanton='ZH'
 where email = 'lea.brunner@example.ch';
update public.personen set strasse='Ahornweg 21',      plz='8703', ort='Erlenbach',  kanton='ZH'
 where email = 'petra.brunner@example.ch';
update public.personen set strasse='Bahnhofstrasse 5', plz='8032', ort='Zürich',     kanton='ZH'
 where email = 'reto.brunner@example.ch';

-- Kontrolle: drei Personen, drei Adressen, Hauptkontakt bei der Mutter
select p.vorname, p.nachname, p.strasse, p.plz, p.ort, ek.beziehung, ek.hauptkontakt
  from public.personen p
  left join public.eltern_kinder ek on ek.person_id = p.id
 where p.email in ('lea.brunner@example.ch','petra.brunner@example.ch','reto.brunner@example.ch')
 order by ek.hauptkontakt desc nulls last, p.nachname, p.vorname;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK H — Portal-Zugang fuer einen Elternteil                           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- ACHTUNG: erst den Schritt im Dashboard machen, dann das SQL unten.
--
-- Per SQL allein geht das nicht: benutzer.id referenziert auth.users, und ein
-- von Hand eingefuegter Auth-Benutzer ohne gueltige Passwort-Hashes ist
-- wertlos. Der Weg ueber das Dashboard testet nebenbei on_auth_user_created.
--
--   1. Dashboard -> Authentication -> Users -> "Add user"
--        E-Mail:  petra.brunner@example.ch
--        Passwort: frei waehlen
--        "Auto Confirm User" einschalten
--   2. handle_new_user feuert, findet ueber die E-Mail den Elternkontakt und
--      legt die benutzer-Zeile an.
--   3. Das SQL unten zieht die Verknuepfung nach und loest dabei
--      trigger_add_eltern_rolle aus — der hat in diesem Bestand noch nie
--      gefeuert, weil kein einziger Elternkontakt eine benutzer_id hatte.

update public.elternkontakte e
   set benutzer_id = b.id
  from public.benutzer b
 where b.email = e.email and e.email = 'petra.brunner@example.ch';

update public.benutzer b
   set person_id = e.id, role = 'eltern'
  from public.elternkontakte e
 where e.benutzer_id = b.id and e.email = 'petra.brunner@example.ch';

-- Kontrolle: 'eltern' muss jetzt in rollen stehen (vom Trigger gesetzt),
-- person_id muss auf Petras Person zeigen.
select b.email, b.role, b.rollen, b.person_id, b.mitglied_id
  from public.benutzer b
 where b.email = 'petra.brunner@example.ch';


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK I — Dublettenbericht (nur SELECT, veraendert nichts)              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
-- Der Merge selbst kommt in Etappe 2. Automatisch zusammenfuehren waere hier
-- falsch: die zweite Abfrage liefert im Altbestand 54 Namenskollisionen des
-- Zufallsgenerators — dieselbe "Urs Huber" als verschiedene mitglied_id,
-- "Reto Imhof" gegen drei verschiedene Elternkontakte. Ein Merge ueber den
-- Namen wuerde verschiedene Menschen verschmelzen.

-- I1: Eindeutig zusammenfuehrbar — gleiche E-Mail, beide Quellen.
--     Nach dem Seed genau 1 Treffer: Martin Wyss.
select pm.id as person_aus_mitglied, pe.id as person_aus_elternkontakt,
       pm.vorname, pm.nachname, pm.email
  from public.personen pm
  join public.mitglieder m     on m.person_id = pm.id
  join public.personen pe      on lower(pe.email) = lower(pm.email) and pe.verein_id = pm.verein_id
  join public.elternkontakte e on e.id = pe.id
 order by pm.nachname;

-- I2: Verdachtsfaelle — gleicher Name, abweichende E-Mail. NUR zur Sichtung.
--     Nach dem Seed 1 echter Fall (Sandra Vogt) plus die 54 Kollisionen.
select pm.id, pe.id, pm.vorname, pm.nachname,
       pm.email as mail_mitglied, pe.email as mail_eltern
  from public.personen pm
  join public.mitglieder m     on m.person_id = pm.id
  join public.personen pe      on pe.verein_id = pm.verein_id
       and lower(btrim(pe.vorname))  = lower(btrim(pm.vorname))
       and lower(btrim(pe.nachname)) = lower(btrim(pm.nachname))
       and lower(coalesce(pe.email,'')) <> lower(coalesce(pm.email,''))
  join public.elternkontakte e on e.id = pe.id
 order by pm.nachname;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   npm run typecheck && npm run build && npm test     -> 254 gruen erwarten
--
--   Typ-Regeneration ist in dieser Etappe optional — nichts im Code liest
--   personen. Wenn doch, muss der Testlauf trotzdem gruen bleiben, weil alle
--   neuen Felder nullable sind:
--       npx supabase gen types typescript --linked > src/database.types.ts
--
--   Schema neu dumpen nicht vergessen (siehe CLAUDE.md, Datenbank-Workflow) —
--   und daran denken, dass ein Dump ohne Docker die vier CREATE EXTENSION und
--   die drei ALTER PUBLICATION verliert.
--
-- OFFEN, unabhaengig vom Umbau
--
--   481 der 507 Mitglieder haben mitgliedtyp = 'Spieler' — ein Wert, den
--   mitgliedtypen nicht kennt (dort steht 'Aktivmitglied', 'Juniorenmitglied',
--   …). Ebenso 'Funktionär' gegen 'Funktionär/in'. Dadurch greift
--   hauptkontakt_pflicht nur fuer die 2 Juniorenmitglied-Zeilen und
--   sucheKinder() findet praktisch keine Kandidaten. Verfaelscht jeden Test
--   der Eltern-Logik.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- ANHANG — ROLLBACK.  NICHT AUSFUEHREN, ausser du willst Etappe 1 zuruecknehmen.
-- Setzt den Stand vor Block A wieder her. Der Seed-Bestand in mitglieder,
-- elternkontakte und eltern_kinder bleibt dabei erhalten.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- drop index  if exists public.eltern_kinder_ein_hauptkontakt;
-- alter table public.eltern_kinder drop column if exists beziehung;
-- alter table public.eltern_kinder drop column if exists person_id;
-- alter table public.benutzer      drop column if exists person_id;
-- alter table public.mitglieder    drop column if exists person_id;
-- drop function if exists public.person_ist_mein_kind(uuid);
-- drop function if exists public.get_my_person_id();
-- drop table    if exists public.personen;
