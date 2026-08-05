-- ═══════════════════════════════════════════════════════════════════════════
-- VORBEREITUNG ETAPPE 4 — Konten aufräumen
-- 05.08.2026
--
-- AUSGANGSLAGE
-- Zehn Portal-Konten, davon neun ohne Person und ohne Mitgliedschaft:
--
--   dieter.good@fcherrliberg.ch   dein Zugang — haengt an nichts, kommt nur
--                                 ueber ist_admin ueberall hin
--   acht @fch-test.ch             Testkonten vom 28.05.2026, nie angemeldet
--                                 (last_sign_in_at ueberall null)
--   dieter2good@hotmail.com       Adrian Kaiser — als einziges vollstaendig
--                                 verdrahtet (Mitglied 589, Person)
--
-- Ein Backfill von benutzer.person_id kann daran nichts aendern: Die
-- Personen existieren schlicht nicht, weder ueber mitglied_id noch ueber die
-- E-Mail.
--
-- WARUM DAS VOR ETAPPE 4 GEHOERT
-- Nach Etappe 6 laeuft alles ueber die Person. Ein Konto ohne Person haette
-- dann kein Profil, keine eigenen Daten, keine Datenpruefung — Administrator
-- ohne Existenz im Verein.
--
-- Ausserdem haengen `personen_select_self` und `personen_update_self` an
-- get_my_person_id(), das benutzer.person_id liest. Solange die Spalte leer
-- ist, laufen beide Policies ins Leere.
--
-- ENTSCHEIDUNG (05.08.2026): Sechs Testkonten werden geloescht. Behalten
-- werden trainer@fch-test.ch und funktionaer@fch-test.ch — beide bekommen
-- eine Person, sonst waeren sie nach Etappe 6 genauso funktionslos wie jetzt.
--
--   trainer@fch-test.ch      einziger Weg, die Portal-Spalte der Elternliste
--                            zu pruefen; als Admin sieht man den Fehler nicht
--   funktionaer@fch-test.ch  daran haengt die Gruppe „Betrieb & Infrastruktur"
--                            mit der Funktion Materialwart — der Prueffall
--                            fuer hat_modul_recht() beim RLS-Umbau
--
-- Fuer den eigenen Zugang wird ebenfalls eine Person angelegt.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Was haengt an den Testkonten?                                 ║
-- ║                                                                         ║
-- ║ benutzer.id verweist mit ON DELETE CASCADE auf auth.users — das Loeschen║
-- ║ dort raeumt die Portal-Zeile mit weg. Nicht alle abhaengigen Tabellen   ║
-- ║ haben aber Cascade: `anwesenheiten` und `audit_log` nicht. Liefert A2   ║
-- ║ Zeilen, scheitert das Loeschen — dann zuerst dort aufraeumen.           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- A1: Die Kandidaten zum Loeschen. Muessen SECHS sein — trainer und
--     funktionaer bleiben.
select b.id, b.email, b.name, b.role, b.ist_admin, b.created_at, b.last_sign_in_at
  from public.benutzer b
 where b.email like '%@fch-test.ch'
   and b.email not in ('trainer@fch-test.ch', 'funktionaer@fch-test.ch')
 order by b.email;

-- A2: Haengt etwas ohne Cascade daran?
select 'anwesenheiten' as tabelle, count(*)::text as zeilen
  from public.anwesenheiten a
  join public.benutzer b on b.id = a.benutzer_id
 where b.email like '%@fch-test.ch'
   and b.email not in ('trainer@fch-test.ch', 'funktionaer@fch-test.ch')
union all
select 'audit_log', count(*)::text
  from public.audit_log l
  join public.benutzer b on b.id = l.benutzer_id
 where b.email like '%@fch-test.ch'
   and b.email not in ('trainer@fch-test.ch', 'funktionaer@fch-test.ch')
union all
select 'benutzer_funktionen', count(*)::text
  from public.benutzer_funktionen bf
  join public.benutzer b on b.id = bf.benutzer_id
 where b.email like '%@fch-test.ch'
   and b.email not in ('trainer@fch-test.ch', 'funktionaer@fch-test.ch');


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Testkonten loeschen                    >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Geloescht wird in auth.users. Der Cascade raeumt public.benutzer,       ║
-- ║ benutzer_funktionen, benutzer_teams und benachrichtigungen mit.         ║
-- ║                                                                         ║
-- ║ trainer@ und funktionaer@ bleiben ausdruecklich stehen.                 ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

delete from auth.users
 where email like '%@fch-test.ch'
   and email not in ('trainer@fch-test.ch', 'funktionaer@fch-test.ch');

commit;

-- B2: Kontrolle — muss 4 sein: dein Zugang, Adrian Kaiser, Trainer, Funktionaer.
select count(*) as benutzer_uebrig from public.benutzer;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Person fuer den eigenen Zugang         >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Die E-Mail der Person ist dieselbe wie die des Kontos: Sie ist der      ║
-- ║ Login-Name, und personen hat einen partiellen Unique-Index darauf.      ║
-- ║ Waere sie schon vergeben, scheitert der Insert mit 23505 — das ist das  ║
-- ║ Sicherheitsnetz, nicht der Fehler.                                      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Gilt fuer alle drei Konten ohne Person: dein Zugang, Trainer, Funktionaer.
-- Der Name wird aus benutzer.name zerlegt („Trainer Tester" → Trainer /
-- Tester); wo kein Leerzeichen steht, wandert alles in den Vornamen.

begin;

do $$
declare r record; neue_person uuid;
begin
  for r in
    select id, verein_id, email, coalesce(nullif(btrim(name), ''), email) as name
      from public.benutzer
     where person_id is null
     order by created_at
  loop
    insert into public.personen (verein_id, vorname, nachname, email)
    values (
      r.verein_id,
      split_part(r.name, ' ', 1),
      coalesce(nullif(btrim(substr(r.name, strpos(r.name, ' ') + 1)), ''), '—'),
      r.email
    )
    returning id into neue_person;

    update public.benutzer set person_id = neue_person where id = r.id;
    raise notice 'Person angelegt fuer %', r.email;
  end loop;
end $$;

commit;

-- C2: Kontrolle. Alle vier muessen eine person_id haben.
select b.email, b.person_id, p.vorname, p.nachname, p.email as person_email
  from public.benutzer b
  left join public.personen p on p.id = b.person_id
 order by b.email;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — OPTIONAL: Mitgliedschaft fuer den eigenen Zugang              ║
-- ║                                                                         ║
-- ║ Nur ausfuehren, wenn du bei FCH auch Mitglied bist. Ohne Mitgliedschaft ║
-- ║ bist du eine Person mit Portal-Zugang — das genuegt fuer alles ausser   ║
-- ║ der Mitgliederliste.                                                    ║
-- ║                                                                         ║
-- ║ Mitgliedtyp anpassen, falls nicht Aktivmitglied.                        ║
-- ║                                                                         ║
-- ║ Fuer die zwei Testkonten NICHT noetig: Ein Trainer muss kein Mitglied   ║
-- ║ sein, und seine Rolle kommt ohnehin ueber das Kader.                    ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- begin;
--
-- insert into public.mitglieder (person_id, verein_id, mitgliedtyp, aktiv,
--                                vorname, nachname, email)
-- select p.id, p.verein_id, 'Aktivmitglied', true, p.vorname, p.nachname, p.email
--   from public.personen p
--  where p.email = 'dieter.good@fcherrliberg.ch';
--
-- update public.benutzer b
--    set mitglied_id = m.id
--   from public.mitglieder m
--  where m.person_id = b.person_id
--    and b.email = 'dieter.good@fcherrliberg.ch';
--
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Zwei Policies werden dadurch zum ersten Mal wirksam:
--     personen_select_self, personen_update_self
--   Du kannst ab jetzt deine eigene Person sehen und bearbeiten — vorher
--   lief das ins Leere, weil get_my_person_id() null lieferte.
--
--   Kein Dump noetig: nur Daten, keine Struktur.
-- ═══════════════════════════════════════════════════════════════════════════
