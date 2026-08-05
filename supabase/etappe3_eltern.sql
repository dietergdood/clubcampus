-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 3 — Elternkontakte auf `personen` umstellen
-- 05.08.2026
--
-- ZIEL
--   personen        der Mensch
--   eltern_kinder   person_id → personen.id, mitglied_id → mitglieder.id,
--                   hauptkontakt und beziehung PRO VERKNUEPFUNG
--   elternkontakte  wird nicht mehr gelesen/geschrieben; geloescht erst in
--                   Etappe 6
--
-- DIE EIGENHEIT, UM DIE ES GEHT
-- `elternkontakte.mitglied_id` ist NOT NULL. Der Elternteil haengt also an
-- EINEM Kind. Ein Vater mit zwei Kindern hat ZWEI Zeilen — und ist damit
-- zweimal derselbe Mensch. Genau das loest diese Etappe auf.
--
-- DER ENTSCHEIDENDE SCHRITT ist Block F: `eltern_kinder.eltern_id` wird
-- nullable. Solange die Spalte NOT NULL ist, braucht jede neue Verknuepfung
-- zwingend eine elternkontakte-Zeile — der Umbau waere folgenlos.
--
-- REIHENFOLGE:  A → B → C → D → E → F → G
--   A  Sperrabfragen (muessen leer sein)
--   B  Personen anlegen bzw. verknuepfen, zusammengefuehrt ueber die E-Mail
--   C  eltern_kinder.person_id nachziehen
--   D  Portal-Zugang uebertragen (benutzer.person_id)
--   E  beziehung und hauptkontakt konsolidieren
--   F  eltern_kinder.eltern_id nullable  >>> SCHREIBT STRUKTUR <<<
--   G  Verifikation, Hilfstabelle entfernen
--
-- KEIN ROLLBACK. Vorher einen Snapshot ziehen (Database → Backups).
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Sperrabfragen. Beide muessen LEER sein.                       ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- A1: Elternkontakte ohne Verknuepfung. Sie wuerden beim Umbau ihr Kind
--     verlieren — lautlos. (Am 05.08.2026 wurde eine solche Altzeile
--     nachgetragen: Philippe Kern, angelegt am 05.06.)
select e.id, e.name, e.email, e.mitglied_id, e.created_at
  from public.elternkontakte e
 where not exists (select 1 from public.eltern_kinder ek where ek.eltern_id = e.id);

-- A2: Eine E-Mail, die an MEHREREN bestehenden Personen haengt. Dann waere
--     nicht entscheidbar, welcher Person der Elternkontakt zugeordnet wird.
--     (Der partielle Unique-Index auf personen sollte das verhindern; die
--     Abfrage prueft, dass er wirkt.)
select verein_id, lower(btrim(email)) as mail, count(*) as personen
  from public.personen
 where email is not null and btrim(email) <> ''
 group by verein_id, lower(btrim(email))
having count(*) > 1;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Personen anlegen bzw. verknuepfen      >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Zusammengefuehrt wird ueber (verein_id, lower(btrim(email))): zwei      ║
-- ║ elternkontakte-Zeilen mit derselben Adresse ergeben EINE Person.        ║
-- ║ Ohne E-Mail gibt es keinen Schluessel — dann eine Person pro Zeile.     ║
-- ║                                                                         ║
-- ║ Die Hilfstabelle _etappe3_map haelt die Zuordnung fest. Sie ueberlebt   ║
-- ║ absichtlich zwischen den Bloecken (der SQL-Editor fuehrt sie einzeln    ║
-- ║ aus) und wird in Block G entfernt.                                      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

create table if not exists public._etappe3_map (
  eltern_id  uuid primary key,
  person_id  uuid not null,
  herkunft   text not null   -- 'etappe1' | 'email' | 'neu'
);

-- B1: Zeilen, fuer die Etappe 1 bereits eine Person angelegt hat.
--     Erkennbar an der gleichen id (siehe ARCHITECTURE.md → Etappe 1).
insert into public._etappe3_map (eltern_id, person_id, herkunft)
select e.id, p.id, 'etappe1'
  from public.elternkontakte e
  join public.personen p on p.id = e.id
on conflict (eltern_id) do nothing;

-- B2: Zeilen ohne eigene Person, deren E-Mail schon an einer Person haengt.
--     Dieselbe Adresse heisst derselbe Mensch — hier entsteht die
--     Zusammenfuehrung mit einem Mitglied oder einem Geschwister-Elternteil.
insert into public._etappe3_map (eltern_id, person_id, herkunft)
select e.id, p.id, 'email'
  from public.elternkontakte e
  join public.personen p
    on p.verein_id = e.verein_id
   and lower(btrim(p.email)) = lower(btrim(e.email))
 where e.email is not null and btrim(e.email) <> ''
   and not exists (select 1 from public._etappe3_map m where m.eltern_id = e.id)
on conflict (eltern_id) do nothing;

-- B3: Der Rest bekommt eine neue Person. Gruppiert nach E-Mail, damit
--     Geschwister-Elternteile EINE Person werden statt zwei.
--     Ohne E-Mail: eine Person je Zeile (kein Schluessel zum Zusammenfuehren).
with offen as (
  select e.*,
         case when e.email is not null and btrim(e.email) <> ''
              then lower(btrim(e.email)) else 'ohne:' || e.id::text end as schluessel
    from public.elternkontakte e
   where not exists (select 1 from public._etappe3_map m where m.eltern_id = e.id)
),
eine_pro_schluessel as (
  select distinct on (verein_id, schluessel) *
    from offen
   order by verein_id, schluessel, created_at
),
neu as (
  insert into public.personen (verein_id, vorname, nachname, email, telefon, profil_geprueft_at)
  select o.verein_id,
         coalesce(nullif(btrim(o.vorname), ''), split_part(o.name, ' ', 1), '?'),
         coalesce(nullif(btrim(o.nachname), ''),
                  nullif(btrim(substr(o.name, strpos(o.name, ' ') + 1)), ''), '?'),
         nullif(btrim(coalesce(o.email, '')), ''),
         coalesce(nullif(btrim(coalesce(o.telefon, '')), ''), nullif(btrim(coalesce(o.tel, '')), '')),
         o.profil_geprueft_at
    from eine_pro_schluessel o
  returning id, verein_id, lower(btrim(coalesce(email, ''))) as mail, vorname, nachname
)
insert into public._etappe3_map (eltern_id, person_id, herkunft)
select o.id, n.id, 'neu'
  from offen o
  join eine_pro_schluessel k
    on k.verein_id = o.verein_id and k.schluessel = o.schluessel
  join neu n
    on n.verein_id = k.verein_id
   and n.vorname = coalesce(nullif(btrim(k.vorname), ''), split_part(k.name, ' ', 1), '?')
   and n.nachname = coalesce(nullif(btrim(k.nachname), ''),
                             nullif(btrim(substr(k.name, strpos(k.name, ' ') + 1)), ''), '?')
   and n.mail = lower(btrim(coalesce(k.email, '')))
on conflict (eltern_id) do nothing;

commit;

-- B4: Kontrolle. Jede elternkontakte-Zeile braucht einen Eintrag.
select 'ohne Zuordnung (muss 0 sein)' as pruefung,
       (select count(*) from public.elternkontakte e
         where not exists (select 1 from public._etappe3_map m where m.eltern_id = e.id))::text as wert
union all
select 'Zuordnungen nach Herkunft: ' || herkunft, count(*)::text
  from public._etappe3_map group by herkunft;

-- B5: Wo wurden mehrere Elternkontakte zu EINER Person? (Geschwisterfall)
select m.person_id, p.vorname || ' ' || p.nachname as person, p.email,
       count(*) as elternkontakte_zeilen
  from public._etappe3_map m
  join public.personen p on p.id = m.person_id
 group by m.person_id, p.vorname, p.nachname, p.email
having count(*) > 1;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — eltern_kinder.person_id nachziehen     >>> SCHREIBT <<<       ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

update public.eltern_kinder ek
   set person_id = m.person_id
  from public._etappe3_map m
 where ek.eltern_id = m.eltern_id
   and (ek.person_id is null or ek.person_id <> m.person_id);

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Portal-Zugang uebertragen              >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Formal gehoert benutzer.person_id zu Etappe 4. Der Bezug darf hier      ║
-- ║ aber nicht verlorengehen: elternkontakte.benutzer_id ist die einzige    ║
-- ║ Stelle, an der steht, welcher Elternteil einen Zugang hat.              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

update public.benutzer b
   set person_id = m.person_id
  from public.elternkontakte e
  join public._etappe3_map m on m.eltern_id = e.id
 where e.benutzer_id = b.id
   and b.person_id is null;

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK E — beziehung und hauptkontakt konsolidieren  >>> SCHREIBT <<<    ║
-- ║                                                                         ║
-- ║ Nur LEERE Felder auffuellen — dieselbe Regel wie in Etappe 2a.          ║
-- ║ Abweichende Werte bleiben stehen und erscheinen im Bericht E3.          ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

update public.eltern_kinder ek
   set beziehung = e.beziehung
  from public.elternkontakte e
 where ek.eltern_id = e.id
   and nullif(btrim(coalesce(ek.beziehung, '')), '') is null
   and nullif(btrim(coalesce(e.beziehung, '')), '') is not null;

/* hauptkontakt: nur setzen, wo fuer dieses Kind noch keiner bestimmt ist —
   der partielle Index eltern_kinder_ein_hauptkontakt laesst pro Kind
   hoechstens einen zu. */
update public.eltern_kinder ek
   set hauptkontakt = true
  from public.elternkontakte e
 where ek.eltern_id = e.id
   and e.hauptkontakt is true
   and ek.hauptkontakt is not true
   and not exists (
         select 1 from public.eltern_kinder x
          where x.mitglied_id = ek.mitglied_id and x.hauptkontakt);

commit;

-- E3: Abweichungen, die NICHT uebernommen wurden.
select ek.id, ek.mitglied_id,
       ek.beziehung as bleibt, e.beziehung as verworfen
  from public.eltern_kinder ek
  join public.elternkontakte e on e.id = ek.eltern_id
 where nullif(btrim(coalesce(ek.beziehung,'')),'') is not null
   and nullif(btrim(coalesce(e.beziehung,'')),'') is not null
   and btrim(ek.beziehung) <> btrim(e.beziehung);


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK F — eltern_kinder.eltern_id nullable       >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ Der eigentliche Schritt. Ab hier braucht eine Verknuepfung nur noch     ║
-- ║ person_id — eine neue Elternverknuepfung erzeugt keine elternkontakte-  ║
-- ║ Zeile mehr.                                                             ║
-- ║                                                                         ║
-- ║ person_id wird gleichzeitig NOT NULL: ab jetzt ist die Person der       ║
-- ║ Bezugspunkt, nicht mehr der Elternkontakt.                              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

alter table public.eltern_kinder alter column eltern_id drop not null;
alter table public.eltern_kinder alter column person_id set not null;

create unique index if not exists eltern_kinder_person_mitglied_key
  on public.eltern_kinder (verein_id, person_id, mitglied_id);

comment on column public.eltern_kinder.eltern_id is
  'Altlast: zeigt auf elternkontakte. Seit Etappe 3 (05.08.2026) nullable und '
  'nicht mehr massgeblich — die Verknuepfung laeuft ueber person_id. '
  'Entfaellt mit elternkontakte in Etappe 6.';

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK G — Verifikation und Aufraeumen                                   ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select 'eltern_kinder ohne person_id' as pruefung,
       (select count(*) from public.eltern_kinder where person_id is null)::text as wert, '0' as erwartet
union all select 'eltern_kinder mit toter person_id',
       (select count(*) from public.eltern_kinder ek
         where not exists (select 1 from public.personen p where p.id = ek.person_id))::text, '0'
union all select 'elternkontakte ohne Person',
       (select count(*) from public.elternkontakte e
         where not exists (select 1 from public._etappe3_map m where m.eltern_id = e.id))::text, '0'
union all select 'Kinder mit mehr als einem Hauptkontakt',
       (select count(*) from (
          select mitglied_id from public.eltern_kinder
           where hauptkontakt group by mitglied_id having count(*) > 1) d)::text, '0'
union all select 'personen gesamt',
       (select count(*) from public.personen)::text, '908 + neu angelegte Elternteile';

-- G2: Der Geschwisterfall — Stefan Odermatt muss EINE Person mit ZWEI
--     Kindern sein. Vor Etappe 3 waren es zwei Personen.
select p.id, p.vorname || ' ' || p.nachname as elternteil, p.email,
       count(ek.id) as kinder,
       array_agg(mp.vorname || ' ' || mp.nachname order by mp.vorname) as kindernamen
  from public.personen p
  join public.eltern_kinder ek on ek.person_id = p.id
  join public.mitglieder m     on m.id = ek.mitglied_id
  join public.personen mp      on mp.id = m.person_id
 group by p.id, p.vorname, p.nachname, p.email
having count(ek.id) > 1
 order by p.nachname;

-- G3: Elternteil ohne E-Mail — Rosmarie Steiner muss erhalten geblieben und
--     NICHT mit anderen adresslosen Zeilen verschmolzen sein.
select p.id, p.vorname, p.nachname, p.telefon, count(ek.id) as kinder
  from public.personen p
  left join public.eltern_kinder ek on ek.person_id = p.id
 where p.email is null or btrim(p.email) = ''
 group by p.id, p.vorname, p.nachname, p.telefon
 order by p.nachname;

-- G4: Hilfstabelle entfernen — ERST ausfuehren, wenn G1 bis G3 stimmen.
-- drop table public._etappe3_map;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Code liefern, dann:
--     npm run typecheck && npm run build && npm test
--   Struktur hat sich geaendert — Dump UND Typen nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
-- ═══════════════════════════════════════════════════════════════════════════
