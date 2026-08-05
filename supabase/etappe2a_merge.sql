-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 2a — Merge ueber E-Mail-Gleichheit
--
-- Fuehrt Personen zusammen, die zweimal im System stehen: einmal als
-- Mitgliedschaft, einmal als Elternkontakt. Zusammengefuehrt wird
-- AUSSCHLIESSLICH ueber E-Mail-Gleichheit (Begruendung: ARCHITECTURE.md ->
-- Personen-Modell -> Merge-Regel).
--
-- Die Mitgliedschafts-Person ueberlebt. Die Eltern-Person wird geloescht,
-- nachdem ihre Verknuepfungen umgehaengt sind.
--
-- REIHENFOLGE:  0 (optional) -> A -> B -> C -> D
--
-- BLOCK 0  Aufraeumen: zwei Test-Zeilen aus dem Registrierungstest
-- BLOCK A  Sperrabfrage — muss leer sein, sonst ist der Merge mehrdeutig
-- BLOCK B  Konfliktbericht — beide Seiten gefuellt, Werte weichen ab
-- BLOCK C  Merge (schreibt, in einer Transaktion)
-- BLOCK D  Verifikation
--
-- ─── WAS UEBERNOMMEN WIRD ──────────────────────────────────────────────────
-- elternkontakte hat nur fuenf Datenfelder: vorname, nachname, email,
-- telefon/tel, profil_geprueft_at. Mehr konnte Etappe 1 gar nicht in eine
-- Eltern-Person schreiben. Deshalb ist die Uebernahme kurz:
--
--   telefon              -> nur wenn bei der Mitgliedschafts-Person leer
--   profil_geprueft_at   -> das spaetere der beiden Daten
--   vorname/nachname     -> NIE uebernommen (bei mitglieder NOT NULL),
--                           Abweichungen erscheinen nur im Konfliktbericht
--
-- Adresse, Geburtsdatum, AHV, Funktionen, Foto existieren auf der Elternseite
-- nicht. Genau diese Luecke schliesst der Umbau — sie kommt aus der
-- Mitgliedschafts-Person und bleibt unangetastet.
--
-- ─── FOLGE, DIE MAN KENNEN MUSS ────────────────────────────────────────────
-- Etappe 1 hat Eltern-Personen mit derselben id wie die elternkontakte-Zeile
-- angelegt. Nach diesem Merge gilt personen.id = elternkontakte.id fuer die
-- zusammengefuehrten Faelle NICHT MEHR. Die Kontrollabfrage I1 aus
-- etappe1_personen.sql findet sie danach nicht mehr — das ist gewollt.
-- Wer die Verknuepfung braucht, geht ab jetzt ueber eltern_kinder.person_id.
--
-- eltern_kinder.eltern_id bleibt unberuehrt und zeigt weiter auf
-- elternkontakte. Der Anwendungscode liest personen noch nicht, es bricht
-- also nichts. Aufgeloest wird eltern_id erst in Etappe 4.
--
-- ─── KEIN ROLLBACK ─────────────────────────────────────────────────────────
-- Block C loescht Zeilen. Ein Rueckbau wie in Etappe 1 ist nicht moeglich.
-- Vor Block C einen Snapshot ziehen (Supabase -> Database -> Backups) oder
-- zumindest die betroffenen Zeilen sichern:
--
--   create table public._2a_backup_personen as
--     select p.* from public.personen p where p.id in (<pe_ids aus Block B>);
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK 0 — Aufraeumen (optional)                                         ║
-- ║           Zwei Zeilen "Test User" <test@fch-test.ch>, angelegt am       ║
-- ║           26.07.2026 fuenf Sekunden auseinander. Kein Elternkontakt,    ║
-- ║           kein Benutzer, kein verknuepftes Kind — Muell aus dem         ║
-- ║           Registrierungstest.                                           ║
-- ║                                                                         ║
-- ║           Kein Blocker fuer den Merge (auf der Elternseite gibt es zu   ║
-- ║           dieser Adresse nichts). Der Sinn ist, dass Block A dauerhaft  ║
-- ║           die klare Bedeutung "leer = in Ordnung" behaelt.              ║
-- ║                                                                         ║
-- ║           Alle acht Fremdschluessel auf mitglieder stehen auf           ║
-- ║           ON DELETE CASCADE, nur benutzer.mitglied_id auf SET NULL.     ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- 0.1 Vorher ansehen, was geloescht wird
select p.id as person_id, m.id as mitglied_id, p.vorname, p.nachname,
       p.email, m.mitgliedtyp, m.aktiv, p.created_at
  from public.personen p
  join public.mitglieder m on m.person_id = p.id
 where lower(btrim(p.email)) = 'test@fch-test.ch'
 order by p.created_at;

-- 0.2 Loeschen — erst die Mitgliedschaft, dann die Person
begin;

delete from public.mitglieder m
 using public.personen p
 where m.person_id = p.id
   and lower(btrim(p.email)) = 'test@fch-test.ch';

delete from public.personen p
 where lower(btrim(p.email)) = 'test@fch-test.ch'
   and not exists (select 1 from public.mitglieder    m where m.person_id  = p.id)
   and not exists (select 1 from public.elternkontakte e where e.id        = p.id)
   and not exists (select 1 from public.eltern_kinder ek where ek.person_id = p.id)
   and not exists (select 1 from public.benutzer      b where b.person_id  = p.id);

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Sperrabfrage (2a-0)                                           ║
-- ║           MUSS LEER SEIN. Jede Zeile ist eine E-Mail, die auf beiden    ║
-- ║           Seiten vorkommt und auf mindestens einer Seite mehrfach.      ║
-- ║           Dann waere nicht entscheidbar, welche Mitgliedschaft zu       ║
-- ║           welchem Elternkontakt gehoert.                                ║
-- ║                                                                         ║
-- ║           Eine Mehrfachnennung auf nur EINER Seite ist unkritisch —     ║
-- ║           der Merge fasst solche Zeilen nicht an (Fall "Test User").    ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select verein_id, mail, n_mitgliedschaft, n_elternkontakt
  from (
    select p.verein_id,
           lower(btrim(p.email)) as mail,
           count(*) filter (
             where exists (select 1 from public.mitglieder m where m.person_id = p.id)
           ) as n_mitgliedschaft,
           count(*) filter (
             where exists (select 1 from public.elternkontakte e where e.id = p.id)
           ) as n_elternkontakt
      from public.personen p
     where p.email is not null
       and btrim(p.email) <> ''
     group by p.verein_id, lower(btrim(p.email))
  ) x
 where n_mitgliedschaft > 0
   and n_elternkontakt  > 0
   and (n_mitgliedschaft > 1 or n_elternkontakt > 1)
 order by mail;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Konfliktbericht                                               ║
-- ║           Was der Merge NICHT anfasst: Felder, die auf beiden Seiten    ║
-- ║           gefuellt sind und sich unterscheiden. Diese Liste sichten,    ║
-- ║           bevor Block C laeuft.                                         ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- B1: Die Paare, die zusammengefuehrt werden.
--     Nach dem Seed genau 1 Zeile: Martin Wyss.
with paare as (
  select pm.id as pm_id, pe.id as pe_id, pm.verein_id,
         lower(btrim(pm.email)) as mail
    from public.personen pm
    join public.mitglieder m  on m.person_id = pm.id
    join public.personen pe   on pe.verein_id = pm.verein_id
                             and lower(btrim(pe.email)) = lower(btrim(pm.email))
                             and pe.id <> pm.id
    join public.elternkontakte e on e.id = pe.id
   where pm.email is not null
     and btrim(pm.email) <> ''
     and not exists (select 1 from public.mitglieder m2 where m2.person_id = pe.id)
)
select pa.mail,
       pm.vorname || ' ' || pm.nachname as person_bleibt,
       pa.pm_id,
       pe.vorname || ' ' || pe.nachname as person_entfaellt,
       pa.pe_id,
       (select count(*) from public.eltern_kinder ek where ek.person_id = pa.pe_id) as kinder_umzuhaengen,
       (select count(*) from public.benutzer      b  where b.person_id  = pa.pe_id) as benutzer_umzuhaengen
  from paare pa
  join public.personen pm on pm.id = pa.pm_id
  join public.personen pe on pe.id = pa.pe_id
 order by pm.nachname;

-- B2: Feldkonflikte. Nur telefon und die Namensschreibweise koennen kollidieren
--     — mehr traegt die Elternseite nicht. Leeres Ergebnis = nichts geht verloren.
with paare as (
  select pm.id as pm_id, pe.id as pe_id
    from public.personen pm
    join public.mitglieder m  on m.person_id = pm.id
    join public.personen pe   on pe.verein_id = pm.verein_id
                             and lower(btrim(pe.email)) = lower(btrim(pm.email))
                             and pe.id <> pm.id
    join public.elternkontakte e on e.id = pe.id
   where pm.email is not null
     and btrim(pm.email) <> ''
     and not exists (select 1 from public.mitglieder m2 where m2.person_id = pe.id)
)
select * from (
  select pm.id as pm_id, pm.vorname || ' ' || pm.nachname as person,
         'telefon'  as feld, pm.telefon  as wert_bleibt, pe.telefon  as wert_entfaellt
    from paare pa join public.personen pm on pm.id = pa.pm_id
                  join public.personen pe on pe.id = pa.pe_id
   where nullif(btrim(coalesce(pm.telefon,'')),'') is not null
     and nullif(btrim(coalesce(pe.telefon,'')),'') is not null
     and btrim(pm.telefon) <> btrim(pe.telefon)
  union all
  select pm.id, pm.vorname || ' ' || pm.nachname,
         'vorname', pm.vorname, pe.vorname
    from paare pa join public.personen pm on pm.id = pa.pm_id
                  join public.personen pe on pe.id = pa.pe_id
   where lower(btrim(pm.vorname)) <> lower(btrim(pe.vorname))
  union all
  select pm.id, pm.vorname || ' ' || pm.nachname,
         'nachname', pm.nachname, pe.nachname
    from paare pa join public.personen pm on pm.id = pa.pm_id
                  join public.personen pe on pe.id = pa.pe_id
   where lower(btrim(pm.nachname)) <> lower(btrim(pe.nachname))
) k
 order by person, feld;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Merge                                >>> SCHREIBT <<<         ║
-- ║           Laeuft in einer Transaktion und bricht ab, wenn die           ║
-- ║           Sperrabfrage aus Block A etwas findet.                        ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

-- C0: Sperre. Bricht die ganze Transaktion ab, falls mehrdeutig.
do $$
declare n integer;
begin
  select count(*) into n
    from (
      select p.verein_id, lower(btrim(p.email)) as mail,
             count(*) filter (
               where exists (select 1 from public.mitglieder m where m.person_id = p.id)
             ) as n_m,
             count(*) filter (
               where exists (select 1 from public.elternkontakte e where e.id = p.id)
             ) as n_e
        from public.personen p
       where p.email is not null and btrim(p.email) <> ''
       group by p.verein_id, lower(btrim(p.email))
    ) x
   where n_m > 0 and n_e > 0 and (n_m > 1 or n_e > 1);

  if n > 0 then
    raise exception 'Etappe 2a abgebrochen: % mehrdeutige E-Mail-Adresse(n). Zuerst Block A klaeren.', n;
  end if;
end $$;

-- C1: Arbeitsliste materialisieren. Ab hier steht die Paarung fest —
--     spaetere Schritte veraendern die Ausgangsdaten und die Ableitung
--     wuerde sonst mitwandern.
create temporary table _2a_paare on commit drop as
select pm.id as pm_id, pe.id as pe_id
  from public.personen pm
  join public.mitglieder m  on m.person_id = pm.id
  join public.personen pe   on pe.verein_id = pm.verein_id
                           and lower(btrim(pe.email)) = lower(btrim(pm.email))
                           and pe.id <> pm.id
  join public.elternkontakte e on e.id = pe.id
 where pm.email is not null
   and btrim(pm.email) <> ''
   and not exists (select 1 from public.mitglieder m2 where m2.person_id = pe.id);

-- C2: Felder auffuellen — nur wo die bleibende Person leer ist.
update public.personen pm
   set telefon = coalesce(nullif(btrim(pm.telefon), ''), pe.telefon),
       profil_geprueft_at = greatest(
         coalesce(pm.profil_geprueft_at, pe.profil_geprueft_at),
         coalesce(pe.profil_geprueft_at, pm.profil_geprueft_at)
       ),
       updated_at = now()
  from _2a_paare pa
  join public.personen pe on pe.id = pa.pe_id
 where pm.id = pa.pm_id;

-- C3: Kinder-Verknuepfungen umhaengen.
--     eltern_id bleibt unberuehrt (zeigt weiter auf elternkontakte).
update public.eltern_kinder ek
   set person_id = pa.pm_id
  from _2a_paare pa
 where ek.person_id = pa.pe_id;

-- C4: Portal-Zugang umhaengen.
update public.benutzer b
   set person_id = pa.pm_id
  from _2a_paare pa
 where b.person_id = pa.pe_id;

-- C5: Eltern-Person loeschen. Scheitert absichtlich, falls C3/C4 etwas
--     uebersehen haben — eltern_kinder.person_id und benutzer.person_id
--     haben KEIN ON DELETE CASCADE. Das ist das Sicherheitsnetz.
delete from public.personen p
 using _2a_paare pa
 where p.id = pa.pe_id;

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Verifikation                                                  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select 'offene Paare (muss 0 sein)' as pruefung,
       (select count(*)
          from public.personen pm
          join public.mitglieder m on m.person_id = pm.id
          join public.personen pe  on pe.verein_id = pm.verein_id
                                  and lower(btrim(pe.email)) = lower(btrim(pm.email))
                                  and pe.id <> pm.id
          join public.elternkontakte e on e.id = pe.id
         where pm.email is not null and btrim(pm.email) <> '')::text as wert,
       '0' as erwartet
union all select 'eltern_kinder ohne person_id',
       (select count(*) from public.eltern_kinder where person_id is null)::text, '0'
union all select 'eltern_kinder mit toter person_id',
       (select count(*) from public.eltern_kinder ek
         where ek.person_id is not null
           and not exists (select 1 from public.personen p where p.id = ek.person_id))::text, '0'
union all select 'benutzer mit toter person_id',
       (select count(*) from public.benutzer b
         where b.person_id is not null
           and not exists (select 1 from public.personen p where p.id = b.person_id))::text, '0'
union all select 'personen gesamt',
       (select count(*) from public.personen)::text, '908 minus zusammengefuehrte'
union all select 'doppelte Kind-Verknuepfung nach Merge',
       (select count(*) from (
          select person_id, mitglied_id from public.eltern_kinder
           where person_id is not null
           group by person_id, mitglied_id having count(*) > 1) d)::text, '0';

-- D2: Kontrolle am Seed-Fall. Martin Wyss muss jetzt eine Person sein,
--     die eine Mitgliedschaft hat UND ueber eltern_kinder an einem Kind haengt.
select p.id, p.vorname, p.nachname, p.email, p.telefon,
       m.id as mitglied_id, m.mitgliedtyp,
       (select count(*) from public.eltern_kinder ek where ek.person_id = p.id) as kinder
  from public.personen p
  left join public.mitglieder m on m.person_id = p.id
 where lower(p.nachname) = 'wyss' and lower(p.vorname) = 'martin'
 order by p.created_at;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   npm run typecheck && npm run build && npm test     -> 254 gruen erwarten
--
--   Der Anwendungscode liest personen noch nicht — die Testzahl darf sich
--   durch 2a nicht veraendern. Tut sie es doch, liest doch schon etwas mit.
--
--   Schema neu dumpen (CLAUDE.md -> Datenbank-Workflow):
--       npx supabase db dump --linked -f supabase/schema.sql
--   2a aendert keine Struktur, nur Daten — ein Dump ist streng genommen
--   nicht noetig. Block 0 aendert auch keine.
--
-- OFFEN, unabhaengig vom Umbau
--
--   Mitglied anlegen hat keine Dublettenpruefung. Zweimal abgeschickt heisst
--   zweimal in der Datenbank (siehe Block 0). Bei Testdaten egal, bei der
--   geplanten Online-Anmeldung nicht.
-- ═══════════════════════════════════════════════════════════════════════════
