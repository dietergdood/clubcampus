-- ═══════════════════════════════════════════════════════════════════════
--  Abfragen vom 13.09.2026 — je ein Block, nur lesend.
--
--  ⚠ JEDE SPALTE IST AM SCHEMA GEMESSEN, nicht aus dem Kopf geschrieben.
--    Am 12./13.09.2026 sind drei Abfragen an erfundenen Spaltennamen
--    gescheitert: `datum` statt `date`, `personen.sfv_person_id`, und
--    `spiel_ereignisse.erstmals_gesehen`. Dreimal derselbe Fehler.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 6 · Woher stammen unsere 914 Personen? ─────────────────────────────
--  ⚠ DIE FRAGE HINTER PUNKT 4. Es gibt KEIN Merkmal „Testdatensatz" —
--    weder eine Quelle noch ein Kennzeichen. Was es gibt, sind drei
--    Stellvertreter, und erst zusammen sagen sie etwas:
--
--      created_at   ein Generator legt hunderte Zeilen in derselben
--                   Minute an; ein Verein wächst über Jahre
--      fairgate_id  echte Mitglieder kommen aus dem Fairgate-Import
--      E-Mail-Domäne  ein Generator vergibt eine Domäne für alle
--
--  ⚠ ⚠ DIE DRITTE ENTSCHEIDET ZUGLEICH ÜBER ABFRAGE 4. Vergibt ein
--    Generator je Person eine eigene erfundene Adresse, kann sich KEINE
--    wiederholen — dann ist „keine geteilte Adresse" kein Befund über
--    Familien, sondern eine Eigenschaft des Generators.
select date_trunc('minute', p.created_at)                as angelegt_minute,
       count(*)                                          as personen,
       count(m.fairgate_id)                              as mit_fairgate_id,
       count(*) filter (where p.email like '%@example.%') as beispiel_adressen,
       count(distinct split_part(lower(p.email), '@', 2)) as domaenen
  from public.personen p
  left join public.mitglieder m on m.person_id = p.id
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
 group by 1
 order by 2 desc
 limit 20;


-- ── 7 · Die Domänen einzeln ────────────────────────────────────────────
--  ⚠ Die Gegenprobe zu Abfrage 4 in einer Zeile: steht hier eine Domäne
--    mit mehreren hundert Adressen, ist die leere Antwort von Abfrage 4
--    erklärt, ohne dass jemand über Familien spricht.
select split_part(lower(p.email), '@', 2) as domaene,
       count(*)                           as adressen,
       count(distinct p.email)            as verschiedene
  from public.personen p
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and coalesce(p.email, '') <> ''
 group by 1
 order by 2 desc
 limit 20;


-- ── 8 · Warum nur 19 Kandidaten? ───────────────────────────────────────
--  ⚠ `aktiv` gibt es ZWEIMAL: an `kader` (der Eintrag) und an
--    `mitglieder` (die Mitgliedschaft). Die Kandidatenabfrage verlangt
--    BEIDE. Steht hier, dass fast alle Kadereinträge inaktiv sind,
--    filtert eine Datenlage und nicht die Regel.
select count(*)                                        as kader_gesamt,
       count(*) filter (where k.aktiv)                 as eintrag_aktiv,
       count(*) filter (where k.aktiv and m.aktiv)     as beide_aktiv,
       count(distinct k.saison)                        as saisons,
       count(distinct m.person_id) filter (where k.aktiv and m.aktiv) as personen_daraus
  from public.kader k
  left join public.mitglieder m on m.id = k.mitglied_id
 where k.verein_id = (select id from public.vereine where slug = 'fcherrliberg');


-- ── 9 · Nach Saison — steckt die Null in einer alten Saison? ───────────
--  ⚠ `kader.saison` hat den Default '2025/26'. Läuft die aktuelle Saison
--    unter einem anderen Wert, sind die Einträge der laufenden Saison
--    nicht die, die `aktiv` tragen — und dann ist die 19 eine Frage der
--    Saisonpflege, nicht der Regel.
select k.saison,
       count(*)                        as eintraege,
       count(*) filter (where k.aktiv) as davon_aktiv
  from public.kader k
 where k.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
 group by 1
 order by 1;


-- ── 10 · Die 19 Kandidaten, mit allen Merkmalen ────────────────────────
--  ⚠ PUNKT 2. Statt einen Filter gegen Namen wie „Trainer Zugang" zu
--    bauen — ein Filter auf einen NAMEN prüft eine Schreibweise — zeigt
--    diese Abfrage alle 19 mit jedem Merkmal, das wir haben. Danach ist
--    entscheidbar, WELCHES Merkmal ein Zugangskonto von einem Menschen
--    trennt.
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
select p.vorname,
       p.nachname,
       p.geburtsdatum,
       p.created_at,
       p.funktionen,
       m.mitgliedtyp,
       m.fairgate_id,
       b.id is not null as hat_konto
  from public.personen p
  join kandidaten k on k.id = p.id
  left join public.mitglieder m on m.person_id = p.id and m.aktiv
  left join public.benutzer   b on b.person_id = p.id
 order by p.nachname, p.vorname;


-- ── 11 · Laura Imhof, unabhängig ───────────────────────────────────────
--  Geburtsdatum 16.07.2026 bei einem Passivmitglied — ein Säugling mit
--  Stimmrecht an der GV. Fast sicher ein Tippfehler; die Abfrage zeigt,
--  was sonst an der Zeile hängt.
select p.id, p.vorname, p.nachname, p.geburtsdatum, p.created_at,
       p.funktionen, m.mitgliedtyp, m.fairgate_id, m.eintrittsdatum
  from public.personen p
  left join public.mitglieder m on m.person_id = p.id and m.aktiv
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and p.geburtsdatum > '2021-01-01';


-- ── 5 neu · Gegnerzeilen ohne Klubnamen ────────────────────────────────
--  ⚠ ⚠ DIE ALTE FASSUNG WAR NICHT NUR FALSCH BENANNT, SONDERN NICHT
--    MESSBAR. `spiel_ereignisse` hat kein `erstmals_gesehen` — es gibt
--    dort überhaupt keine Spalte für „seit wann existiert diese Zeile":
--    die Zeilen werden seit dem 11.09.2026 bei jedem Abruf GELÖSCHT und
--    neu angelegt, und damit ist das Alter der Zeile weg.
--
--  ⚠ Der tragfähige Stellvertreter steht am Spiel: `matchdaten_geholt_am`
--    sagt, wann dieses Spiel zuletzt geholt wurde. Weil ein Abruf ALLE
--    Zeilen des Spiels ersetzt, tragen nur Spiele die alte Form, die
--    seither nicht mehr geholt wurden.
select date(s.matchdaten_geholt_am)                                  as geholt_am,
       count(*)                                                      as fremde_zeilen,
       count(*) filter (where coalesce(e.gegner_club_name, '') = '')  as ohne_klub
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
 where e.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and e.ist_eigener = false
 group by 1
 order by 1;
