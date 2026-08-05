-- ═══════════════════════════════════════════════════════════════════════════
-- NACHTRAG ZU ETAPPE 2b — Personen für Mitglieder ohne person_id
-- 05.08.2026
--
-- ANLASS
-- Etappe 1 hat am 04.08.2026 für jede damalige Mitgliedschaft eine Person
-- angelegt. Danach lief das Anlegen aber weiter über NeuesMitgliedModal, und
-- das schrieb bis Etappe 2b ausschliesslich nach `mitglieder` — ohne Person.
--
-- Diese Zeilen haben person_id = null. Die Fassade (personService) faengt das
-- ab und faellt auf die Altspalten zurueck, damit sie nicht aus der Liste
-- verschwinden. Fuer die Suche reicht das aber nicht: Sie muss auf `personen`
-- filtern, sonst findet sie nach einer Namenskorrektur den alten Wert.
--
-- Nach diesem Skript hat jede Mitgliedschaft eine Person.
-- ═══════════════════════════════════════════════════════════════════════════

-- A: Wie viele sind es?
select count(*) as ohne_person from public.mitglieder where person_id is null;

-- B: Welche? (zur Sichtkontrolle, bevor geschrieben wird)
select id, vorname, nachname, email, mitgliedtyp, created_at
  from public.mitglieder
 where person_id is null
 order by created_at;


-- ═══════════════════════════════════════════════════════════════════════════
-- C: Personen nachlegen und verknuepfen
--
-- ACHTUNG E-MAIL: `personen` hat seit dem 05.08.2026 einen partiellen
-- Unique-Index auf (verein_id, lower(btrim(email))). Traegt eine dieser
-- Zeilen eine E-Mail, die schon an einer Person haengt, wird KEINE neue
-- Person angelegt — stattdessen wird auf die bestehende verwiesen. Das ist
-- richtig: dieselbe Adresse heisst dieselbe Person.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- C1: Auf bestehende Person verweisen, wo die E-Mail schon vorkommt.
update public.mitglieder m
   set person_id = p.id
  from public.personen p
 where m.person_id is null
   and m.email is not null and btrim(m.email) <> ''
   and p.verein_id = m.verein_id
   and lower(btrim(p.email)) = lower(btrim(m.email));

-- C2: Fuer den Rest eine neue Person anlegen.
with neu as (
  insert into public.personen (
    verein_id, vorname, nachname, email, telefon,
    strasse, plz, ort, kanton, land,
    geburtsdatum, geschlecht, nationalitaet, nationalitaet2, heimatort,
    ahv_nr, foto_url, funktionen, profil_geprueft_at
  )
  select m.verein_id, m.vorname, m.nachname,
         nullif(btrim(coalesce(m.email,'')), ''),
         m.telefon, m.strasse, m.plz, m.ort, m.kanton, m.land,
         m.geburtsdatum, m.geschlecht, m.nationalitaet, m.nationalitaet2,
         m.heimatort, m.ahv_nr, m.foto_url,
         coalesce(m.funktionen, '{}'), m.profil_geprueft_at
    from public.mitglieder m
   where m.person_id is null
  returning id, verein_id, lower(btrim(coalesce(email,''))) as mail, vorname, nachname
)
update public.mitglieder m
   set person_id = n.id
  from neu n
 where m.person_id is null
   and m.verein_id = n.verein_id
   and m.vorname = n.vorname
   and m.nachname = n.nachname
   and lower(btrim(coalesce(m.email,''))) = n.mail;

commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATION
-- ═══════════════════════════════════════════════════════════════════════════

select 'Mitglieder ohne Person (muss 0 sein)' as pruefung,
       (select count(*) from public.mitglieder where person_id is null)::text as wert, '0' as erwartet
union all select 'Mitglieder mit toter person_id',
       (select count(*) from public.mitglieder m
         where m.person_id is not null
           and not exists (select 1 from public.personen p where p.id = m.person_id))::text, '0'
union all select 'personen gesamt',
       (select count(*) from public.personen)::text, '905 + neu angelegte';

-- Stichprobe: weichen Altspalte und Person irgendwo ab? Direkt nach dem
-- Backfill muss das leer sein — spaeter ist es normal, weil `personen` die
-- Wahrheit ist und die Altspalten stehenbleiben.
select m.id, m.nachname as mitglieder_nachname, p.nachname as personen_nachname
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
 where coalesce(m.nachname,'') <> coalesce(p.nachname,'')
 limit 20;
