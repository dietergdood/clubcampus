-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — Leseabfragen vom 14.09.2026
--
-- ⚠ NUR LESEN. Keine dieser Abfragen schreibt; sie sind zum Kopieren in den
--    SQL-Editor gedacht und geben Zeilen zurueck.
--
-- ⚠ ALS `select`, NICHT `raise notice`. Der Supabase-Editor zeigt NOTICE
--    nicht an — am 10.09.2026 ist so eine bestellte Zahl endgueltig verloren
--    gegangen, weil die Migration sie als Notiz meldete und die Spalte, ueber
--    die man sie nachzaehlen koennte, im selben Lauf fiel.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Abfrage 1 · Wie viele unserer Kandidaten tragen einen E-Mail-Hash? ────
--
-- Die Kernfrage des Theme-Chats vom 13.09.2026. `unsere_nutzbar` steht seit
-- Fassung 49 in der Karte — sie ist aber nur in der LEBENDEN Antwort zu
-- haben: `bestand` ist eine Leseprobe und protokolliert absichtlich nichts
-- (siehe protokollSpur.test.ts). Diese Abfrage rechnet dieselbe Zahl nach.
--
-- ⚠ SIE BILDET `holeKandidaten()` VOLLSTAENDIG NACH, also BEIDE Zweige:
--      (a) aktive Mitgliedschaft mit aktivem Kadereintrag
--      (b) `personen.funktionen` ist nicht leer
--    Die Function liest sie als zwei Abfragen und vereinigt ueber die Id,
--    weil PostgREST kein `or` ueber einen Embed hinweg bilden kann. Wer nur
--    Zweig (a) zaehlt, misst eine kleinere Menge und hat einen Widerspruch
--    zur Karte, den es nicht gibt.
--
-- ⚠ `count(distinct p.id)` — eine Person, die beides hat, darf nicht doppelt
--    zaehlen. Wer Personen zaehlt, zaehlt Ids und keine Zeilen.
with kandidaten as (
  select p.id, p.email
    from public.personen p
   where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
     and (exists (
           select 1 from public.mitglieder m
            where m.person_id = p.id and m.aktiv
              and exists (select 1 from public.kader k
                           where k.mitglied_id = m.id and k.aktiv))
          or coalesce(array_length(p.funktionen, 1), 0) > 0))
select count(*)                                             as kandidaten,
       count(*) filter (where coalesce(email, '') <> '')     as mit_email,
       count(*) filter (where coalesce(email, '') =  '')     as ohne_email,
       -- ⚠ Die Aufteilung MUSS aufgehen. Eine Aufteilung, die aufgehen muss,
       --    prueft sich selbst; eine einzelne Zahl kann nur behauptet werden.
       count(*) = count(*) filter (where coalesce(email, '') <> '')
               + count(*) filter (where coalesce(email, '') =  '')
                                                             as zaehlung_stimmt
  from kandidaten;

-- ⚠ Und die Gegenprobe zur Aufteilung der Function: je Zweig einzeln, damit
--    eine Abweichung zur Karte zuzuordnen ist statt bloss sichtbar.
select count(distinct p.id) filter (where p.hat_kader)     as nur_zweig_kader,
       count(distinct p.id) filter (where p.hat_funktion)  as nur_zweig_funktion,
       count(distinct p.id)                                as vereinigung
  from (
    select p.id,
           exists (select 1 from public.mitglieder m
                    where m.person_id = p.id and m.aktiv
                      and exists (select 1 from public.kader k
                                   where k.mitglied_id = m.id and k.aktiv)) as hat_kader,
           coalesce(array_length(p.funktionen, 1), 0) > 0                   as hat_funktion
      from public.personen p
     where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
  ) p
 where p.hat_kader or p.hat_funktion;

-- ── Abfrage 2 · Teilen sich mehrere unserer Personen eine Adresse? ────────
--
-- Die Gegenprobe zur neuen Zahl `geteilte_adressen`, die drueben gemessen
-- wird. Ist sie hier hoch, ist die E-Mail als Merkmal auch auf unserer Seite
-- untauglich — eine Adresse, die zwei Menschen benennt, ist kein Schluessel.
--
-- ⚠ ZWEI ZAHLEN, nicht eine: drei Geschwister an einer Adresse sind EINE
--    Adresse und DREI Personen. Eine Zahl allein liesse offen, ob es viele
--    kleine Gruppen sind oder eine grosse.
with geteilt as (
  select lower(trim(p.email)) as adresse, count(*) as wie_viele
    from public.personen p
   where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
     and coalesce(p.email, '') <> ''
   group by 1
  having count(*) > 1)
select count(*)          as geteilte_adressen,
       sum(wie_viele)    as betroffene_personen,
       max(wie_viele)    as groesste_gruppe
  from geteilt;

-- ── Abfrage 3 · Was die Spielerzuordnung vorfindet ───────────────────────
--
-- Vor dem ersten Durchgang mit dem Vorschlag: wie viele Spieler sind offen,
-- und wie viele davon haengen an einer Mannschaft, die wir kennen?
--
-- ⚠ Der Vorschlag schneidet ueber die Mannschaft zu. Ein Spieler, dessen
--    `sfv_team_id` sich nicht aufloesen laesst, landet in der Gruppe „Ohne
--    Mannschaft" — dort vergleicht er nur ueber Name und Jahrgang, und bei
--    zwei Gleichnamigen schweigt er. Diese Zahl sagt also, wie viel die
--    Team-Zuordnung noch beitraegt.
select count(distinct a.sfv_person_id)                                  as offene_spieler,
       count(distinct a.sfv_person_id) filter (where t.id is not null)  as mit_bekannter_mannschaft,
       count(distinct a.sfv_person_id) filter (where t.id is null)       as ohne_mannschaft
  from public.spiel_aufstellung a
  left join public.teams t
         on t.sfv_team_id = a.sfv_team_id and t.verein_id = a.verein_id
 where a.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and a.ist_eigener
   and a.sfv_person_id is not null
   and not exists (
     select 1 from public.sfv_zuordnung z
      where z.verein_id = a.verein_id and z.sfv_person_id = a.sfv_person_id);

-- ── Abfrage 4 · Unsere EIGENEN Ranglistenzeilen, samt stand_vom ───────────
--
-- Die Datenbank-Haelfte zu Punkt 5. `rangprobe` fragt seit dem 14.09.2026
-- dieselbe Frage beim Verband; diese Abfrage sagt, was bei UNS steht. Erst
-- beide zusammen trennen „der Verband hinkt nach" von „unser Sync hinkt
-- nach".
--
-- ⚠ UEBER `club_nummer`, NICHT ueber einen Join auf `teams`. Die Nummer steht
--    an jeder Ranglistenzeile; ein Join ueber `sfv_team_id` haette zusaetzlich
--    von der Team-Zuordnung abgehangen und eine fehlende Zuordnung als
--    fehlende Zeile gemeldet.
--
-- ⚠ `anzahl_spiele IS NULL` ist NICHT `= 0`. „Der Verband nennt keine Zahl"
--    und „null Spiele" sind zwei Aussagen, und nur die zweite ist ein
--    Rueckstand.
select r.sfv_liga_name                      as liga,
       r.sfv_gruppe                         as gruppe,
       r.team_name                          as mannschaft,
       r.anzahl_spiele,
       r.punkte,
       r.position,
       r.stand_vom at time zone 'Europe/Zurich' as stand_vom_zuerich
  from public.ranglisten r
 where r.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and r.club_nummer = (select sfv_club_nummer from public.vereine
                         where slug = 'fcherrliberg')
 order by r.anzahl_spiele nulls first, r.sfv_liga_name;

-- ── Abfrage 5 · Wie alt ist der Ranglistenstand insgesamt? ────────────────
--
-- ⚠ EIN Zeitpunkt je Lauf, nicht je Gruppe: `/api/club/ranking` ist ein
--    einziger Abruf, und `stand_vom` kommt aus einem `jetzt`. Stehen hier
--    mehrere Werte, hat ein Lauf nur einen Teil geschrieben — das waere der
--    Befund.
select r.stand_vom at time zone 'Europe/Zurich' as stand_vom_zuerich,
       count(*)                                 as zeilen,
       count(distinct (r.sfv_saison_id, r.sfv_liga_id,
                       r.sfv_division_id, r.sfv_gruppe_id)) as gruppen
  from public.ranglisten r
 where r.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
 group by 1
 order by 1 desc;

-- ── Abfrage 6 · Traegt `klub` an den Gegnerzeilen einen Wert? ─────────────
--
-- Punkt 2 des Theme-Chats. Die Nutzlast setzt `klub` bei fremden Zeilen aus
-- `spiel_ereignisse.gegner_club_name` (`wpNutzlast.ts:619`), und nichts auf
-- dem Weg entfernt es wieder. Was gesendet wird, haengt also allein daran, ob
-- die SPALTE gefuellt ist — und das sagt diese Abfrage.
--
-- ⚠ Seine Anzeige hat einen Rueckfall, der „leer gesendet" und „nicht
--    gesendet" gleich aussehen laesst. Deshalb messen wir es auf unserer
--    Seite; eine Zahl von hier ist von seiner Anzeige unabhaengig.
--
-- ⚠ Gruppiert nach `matchdaten_geholt_am` des Spiels, weil ein Abruf ALLE
--    Zeilen eines Spiels ersetzt: nur Spiele, die seit der Umstellung nicht
--    mehr geholt wurden, koennen die alte Form tragen. `spiel_ereignisse` hat
--    keine eigene Altersspalte — das Ersetzen vernichtet sie.
select date_trunc('day', s.matchdaten_geholt_am at time zone 'Europe/Zurich') as tag,
       count(*)                                                       as fremde_zeilen,
       count(*) filter (where coalesce(e.gegner_club_name, '') <> '') as mit_klub,
       count(*) filter (where coalesce(e.gegner_club_name, '') =  '') as ohne_klub
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
 where e.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and e.ist_eigener = false
 group by 1
 order by 1 desc nulls last;
