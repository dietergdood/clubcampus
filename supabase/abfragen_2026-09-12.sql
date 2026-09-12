-- ═══════════════════════════════════════════════════════════════════════
--  Drei Abfragen, 12.09.2026 — je ein eigener Block, nur lesend.
--  Kein update, kein delete, beliebig oft wiederholbar.
--
--  ⚠ Die verein_id wird über den Slug aufgelöst, nicht als UUID getippt —
--    eine UUID, die beim Übertragen ein Zeichen verliert, findet nichts
--    und meldet keinen Fehler.
--
--  ⚠ Der Kandidatenbegriff ist der der Function: Personen mit aktivem
--    Kadereintrag ODER mit einer Vereinsfunktion, als union über die Id.
--    Wer beides hat, zählt einmal.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1 · Stimmt die 19? ─────────────────────────────────────────────────
with v as (
  select id from public.vereine where slug = 'fcherrliberg'
),
mit_kader as (
  select p.id
    from public.personen p
    join public.mitglieder m on m.person_id = p.id and m.aktiv
    join public.kader      k on k.mitglied_id = m.id and k.aktiv
   where p.verein_id = (select id from v)
),
mit_funktion as (
  select p.id
    from public.personen p
   where p.verein_id = (select id from v)
     and p.funktionen <> '{}'
)
select (select count(*) from mit_kader)                          as mit_kader,
       (select count(*) from mit_funktion)                       as mit_funktion,
       (select count(*) from (
          select id from mit_kader union select id from mit_funktion) x) as kandidaten;


-- ── 2 · Die Personen ohne Geburtsdatum ─────────────────────────────────
--  ⚠ Punkt 4 aus deiner Liste: zwei der 19 tragen name_hash = null und
--    jahrgang = null. Der Grund ist immer derselbe — ohne Geburtsdatum
--    kein Jahrgang, ohne Jahrgang kein Namenshash.
with v as (
  select id from public.vereine where slug = 'fcherrliberg'
),
kandidaten as (
  select p.id
    from public.personen p
    join public.mitglieder m on m.person_id = p.id and m.aktiv
    join public.kader      k on k.mitglied_id = m.id and k.aktiv
   where p.verein_id = (select id from v)
  union
  select p.id
    from public.personen p
   where p.verein_id = (select id from v)
     and p.funktionen <> '{}'
)
select p.id,
       p.vorname,
       p.nachname,
       p.geburtsdatum,
       p.email is not null and p.email <> '' as hat_mail
  from public.personen p
  join kandidaten k on k.id = p.id
 where p.geburtsdatum is null
 order by p.nachname, p.vorname;


-- ── 3 · Unplausible Jahrgänge ──────────────────────────────────────────
--  ⚠ Punkt 5: ein Jahrgang lautet 2026. Ein Säugling im Kader ist fast
--    sicher ein Tippfehler im Geburtsdatum (2026 statt 2016 oder 2006).
--
--  ⚠ Die Grenze ist nach OBEN offen gelassen und nicht auf 2026 gesetzt:
--    eine Prüfung, die nur den bekannten Fall trifft, findet den nächsten
--    nicht. Alles ab 2019 ist für Spielbetrieb und Vereinsfunktion
--    auffällig.
select p.id,
       p.vorname,
       p.nachname,
       p.geburtsdatum,
       extract(year from p.geburtsdatum)::int as jahrgang,
       m.mitgliedtyp
  from public.personen p
  left join public.mitglieder m on m.person_id = p.id and m.aktiv
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and p.geburtsdatum is not null
   and extract(year from p.geburtsdatum) >= 2019
 order by p.geburtsdatum desc;
