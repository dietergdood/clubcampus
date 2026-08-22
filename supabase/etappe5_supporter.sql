-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 5 — Supporter ist ein Mitgliedtyp, kein Flag
-- 05.08.2026
--
-- WARUM
-- „Supporter" war ein Kennzeichen an `elternkontakte`. Damit war es an die
-- Elternrolle gebunden — dabei ist ein Supporter jemand, der den Verein
-- unterstuetzt, ohne Mitglied oder Elternteil zu sein. Als Mitgliedtyp steht
-- er neben Aktivmitglied und Passivmitglied, wo er hingehoert.
--
-- Das loest zugleich den offenen Punkt aus Etappe 3: `fetchAlleElternkontakte`
-- steigt ueber `eltern_kinder!inner` ein, wer keine Verknuepfung mehr hat,
-- verschwindet aus der Elternliste. Mit einer Mitgliedschaft vom Typ
-- „Supporter" erscheint die Person wieder — in der Mitgliederliste.
--
-- ─── DIE REGEL ─────────────────────────────────────────────────────────────
-- Aktivmitglied und Supporter schliessen sich aus. Wer vom einen zum anderen
-- wechselt, dessen alte Mitgliedschaft geht auf aktiv = false — sie bleibt
-- als Historie stehen. Erzwungen wird das durch einen partiellen
-- Unique-Index auf (person_id) where aktiv: EINE aktive Mitgliedschaft pro
-- Person, nicht mehr.
--
-- Der Index ist zugleich das Sicherheitsnetz fuer alles Weitere: Ohne ihn
-- koennte ein fehlerhafter Import oder ein doppelter Klick eine Person
-- zweimal aktiv fuehren, und niemand merkte es.
--
-- ─── DATENLAGE (05.08.2026) ────────────────────────────────────────────────
--   elternkontakte mit supporter = true : 1  (Philippe Kern, 05.06.2026)
--   Personen mit mehreren aktiven Mitgliedschaften : 0  → Index geht durch
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Sperrabfragen                                                 ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- A1: Personen mit mehreren aktiven Mitgliedschaften. MUSS 0 sein, sonst
--     scheitert der Index in Block D.
select p.id, p.vorname, p.nachname, count(*) as aktive_mitgliedschaften,
       array_agg(m.mitgliedtyp) as typen
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
 where m.aktiv
 group by p.id, p.vorname, p.nachname
having count(*) > 1;

-- A2: Gibt es den Mitgliedtyp „Supporter"?
select name, aktiv, sort_order, standard_rolle, hauptkontakt_pflicht
  from public.mitgliedtypen
 order by sort_order;

-- A3: Wer traegt heute das Flag?
select e.id, e.name, e.email, e.mitglied_id, e.supporter,
       (select count(*) from public.eltern_kinder ek where ek.eltern_id = e.id) as verknuepfungen
  from public.elternkontakte e
 where e.supporter;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Mitgliedtyp sicherstellen              >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ standard_rolle = 'supporter', damit die Rollenableitung greift.         ║
-- ║ hauptkontakt_pflicht = false: ein Supporter hat kein Kind.              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

insert into public.mitgliedtypen (verein_id, name, aktiv, sort_order,
                                  standard_rolle, hauptkontakt_pflicht)
select v.id, 'Supporter', true,
       coalesce((select max(sort_order) + 10 from public.mitgliedtypen mt
                  where mt.verein_id = v.id), 100),
       'supporter', false
  from public.vereine v
 where not exists (select 1 from public.mitgliedtypen mt
                    where mt.verein_id = v.id and mt.name = 'Supporter');

/* Falls der Typ schon existierte, aber ohne Standardrolle. */
update public.mitgliedtypen
   set standard_rolle = 'supporter'
 where name = 'Supporter'
   and (standard_rolle is null or btrim(standard_rolle) = '');

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B2 — Portalrolle „mitglied" anlegen        >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Drei Mitgliedtypen tragen standard_rolle = 'mitglied' — Passiv-, Ehren- ║
-- ║ und Freimitglied. Den Rollenwert gab es aber nirgends: nicht in         ║
-- ║ portal_rollen, nicht in types.ts, nicht in getPermissions. Wer sich als ║
-- ║ Passivmitglied registriert hätte, waere mit einer Rolle dagestanden,    ║
-- ║ die das Portal nicht kennt.                                             ║
-- ║                                                                         ║
-- ║ Ein Vereinsmitglied ist NICHT dasselbe wie ein Supporter: Passiv-,      ║
-- ║ Ehren- und Freimitglieder sind Mitglieder des Vereins mit Stimmrecht    ║
-- ║ an der GV, ein Supporter ist Supporter von aussen. Deshalb eine eigene    ║
-- ║ Rolle und nicht der bequeme Ersatz durch supporter.                     ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

insert into public.portal_rollen (verein_id, name, label, prioritaet, aktiv)
select v.id, 'mitglied', 'Mitglied', 65, true
  from public.vereine v
 where not exists (select 1 from public.portal_rollen pr
                    where pr.verein_id = v.id and pr.name = 'mitglied');

commit;

-- B2b: Kontrolle — die Rollen in ihrer Reihenfolge.
select name, label, prioritaet, aktiv
  from public.portal_rollen
 order by prioritaet;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Flag in Mitgliedschaft ueberfuehren    >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Wer das Flag traegt und noch KEINE aktive Mitgliedschaft hat, bekommt   ║
-- ║ eine vom Typ „Supporter". Wer bereits eine hat, behaelt sie — der Index ║
-- ║ aus Block D liesse eine zweite ohnehin nicht zu, und Aktivmitglied      ║
-- ║ wiegt schwerer als Supporter.                                           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

insert into public.mitglieder (person_id, verein_id, mitgliedtyp, aktiv,
                               vorname, nachname, email, created_at, updated_at)
select distinct on (m.person_id)
       m.person_id, e.verein_id, 'Supporter', true,
       p.vorname, p.nachname, p.email, now(), now()
  from public.elternkontakte e
  join public.eltern_kinder ek on ek.eltern_id = e.id
  join public.personen p       on p.id = ek.person_id
  cross join lateral (select ek.person_id) m
 where e.supporter
   and not exists (select 1 from public.mitglieder mm
                    where mm.person_id = ek.person_id and mm.aktiv);

commit;

-- C2: Kontrolle — wer ist jetzt Supporter?
select p.vorname, p.nachname, p.email, m.mitgliedtyp, m.aktiv,
       (select count(*) from public.eltern_kinder ek where ek.person_id = p.id) as kinder
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
 where m.mitgliedtyp = 'Supporter';


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Der Index                              >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ EINE aktive Mitgliedschaft pro Person. Wer wechselt, dessen alte geht   ║
-- ║ auf aktiv = false und bleibt als Historie stehen.                       ║
-- ║                                                                         ║
-- ║ Partiell, weil archivierte Mitgliedschaften beliebig viele sein duerfen:║
-- ║ jemand kann ueber die Jahre Junior, Aktivmitglied und Passivmitglied    ║
-- ║ gewesen sein.                                                           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

create unique index if not exists mitglieder_eine_aktive_mitgliedschaft
  on public.mitglieder (person_id) where aktiv;

comment on index public.mitglieder_eine_aktive_mitgliedschaft is
  'Eine aktive Mitgliedschaft pro Person. Aktivmitglied und Supporter '
  'schliessen sich aus; beim Wechsel muss die alte auf aktiv = false. '
  'Archivierte Mitgliedschaften sind beliebig viele — sie sind die Historie.';

commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATION
-- ═══════════════════════════════════════════════════════════════════════════

select 'Mitgliedtyp Supporter vorhanden' as pruefung,
       (select count(*) from public.mitgliedtypen where name = 'Supporter')::text as wert, '1' as erwartet
union all select 'Mitgliedschaften vom Typ Supporter',
       (select count(*) from public.mitglieder where mitgliedtyp = 'Supporter' and aktiv)::text, '>= 1'
union all select 'Personen mit mehreren aktiven Mitgliedschaften',
       (select count(*) from (select person_id from public.mitglieder
                               where aktiv group by person_id having count(*) > 1) d)::text, '0'
union all select 'Index vorhanden',
       (select count(*) from pg_indexes
         where schemaname='public' and indexname='mitglieder_eine_aktive_mitgliedschaft')::text, '1';

-- V2: Der Index greift. Muss mit 23505 scheitern.
-- begin;
-- insert into public.mitglieder (person_id, verein_id, mitgliedtyp, aktiv, vorname, nachname)
-- select m.person_id, m.verein_id, 'Supporter', true, 'Zweite', 'Mitgliedschaft'
--   from public.mitglieder m where m.aktiv limit 1;
-- rollback;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Code liefern: entkoppleKind() legt eine Supporter-Mitgliedschaft an,
--   statt nur die Benutzerrolle zu setzen. Erst damit taucht ein Supporter
--   wieder in einer Liste auf.
--
--   Dump und Typen nachziehen (Strukturaenderung):
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
-- OFFEN, bewusst nicht Teil dieser Etappe
--   `elternkontakte.supporter` bleibt stehen und wird nicht mehr gelesen.
--   Die Spalte faellt mit der ganzen Tabelle in Etappe 6.
-- ═══════════════════════════════════════════════════════════════════════════
