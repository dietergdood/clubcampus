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


-- ── 4 · Trägt dieselbe Adresse mehrere Personen? ───────────────────────
--  ⚠ DIE FRAGE HINTER PUNKT 3. Stünde bei Junioren die Adresse eines
--    Elternteils, hätten zwei Geschwister denselben E-Mail-Hash — und der
--    Abgleich fände einen Treffer, der richtig aussieht und eine ANDERE
--    Person bezeichnet. Das ist gefährlicher als null Treffer.
--
--  ⚠ Diese Abfrage braucht KEINE Antwort von drüben: mehrere Personen
--    unter einer Adresse sind bei uns messbar, und sie sind der direkte
--    Beleg. Die Messung des Theme-Chats über seine 129 Personenkarten kann
--    es nicht beantworten — dort stehen nur Betreuer, keine Junioren.
select lower(trim(p.email))                     as adresse_klein,
       count(*)                                 as personen,
       count(*) filter (where m.mitgliedtyp = 'Juniorenmitglied') as davon_junioren
  from public.personen p
  left join public.mitglieder m on m.person_id = p.id and m.aktiv
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and coalesce(p.email, '') <> ''
 group by 1
having count(*) > 1
 order by 2 desc, 1
 limit 25;


-- ── 5 · Wie viele Gegnerzeilen tragen keinen Klubnamen? ────────────────
--  ⚠ PUNKT 5a. Wir senden `klub` bei Gegnern aus `gegner_club_name`, und
--    der Sync füllt es (`eigen ? null : text(e.teamName)`). Eine leere
--    Anzeige kann deshalb nur heissen, dass die Spalte leer IST.
--
--  ⚠ Nach `erstmals_gesehen` gruppiert, weil die wahrscheinlichste
--    Erklärung ein Altbestand ist: Gegnerzeilen haben ihre Felder
--    nacheinander bekommen, und alte Zeilen tragen die alte Form. Steht
--    die Leere an alten Tagen und nicht an neuen, ist es der Nachlauf und
--    kein Defekt.
select date(e.erstmals_gesehen)                            as erstmals,
       count(*)                                            as fremde_zeilen,
       count(*) filter (where coalesce(e.gegner_club_name, '') = '') as ohne_klub
  from public.spiel_ereignisse e
 where e.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and e.ist_eigener = false
 group by 1
 order by 1;
