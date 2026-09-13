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
-- Fassung 49 in der Karte und ist nie gedrueckt worden — diese Abfrage
-- beantwortet dasselbe ohne die Function.
--
-- ⚠ SIE BILDET `holeKandidaten()` NACH, Bedingung fuer Bedingung:
--      personen.verein_id     = unser Verein
--      mitglieder.aktiv       = true   (!inner)
--      mitglieder.kader.aktiv = true   (!inner)
--    Wer die Zahl gegen die Karte haelt und eine Bedingung auslaesst, misst
--    eine andere Menge und hat einen Widerspruch, den es nicht gibt.
--
-- ⚠ ES IST DER ZWEIG „MIT TEAM". `holeKandidaten` fuehrt einen zweiten ueber
--    `personen.funktionen` und vereinigt beide ueber die Id. Die Karte nennt
--    deshalb eine groessere Zahl als diese Abfrage — das ist kein Fehler,
--    sondern die zweite Menge.
select count(*)                                             as kandidaten_mit_team,
       count(*) filter (where coalesce(p.email, '') <> '')   as mit_email,
       count(*) filter (where coalesce(p.email, '') =  '')   as ohne_email,
       -- ⚠ Die Aufteilung MUSS aufgehen. Eine Aufteilung, die aufgehen muss,
       --    prueft sich selbst; eine einzelne Zahl kann nur behauptet werden.
       count(*) = count(*) filter (where coalesce(p.email, '') <> '')
               + count(*) filter (where coalesce(p.email, '') =  '')
                                                             as zaehlung_stimmt
  from public.personen p
 where p.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and exists (
     select 1 from public.mitglieder m
      where m.person_id = p.id and m.aktiv
        and exists (select 1 from public.kader k where k.mitglied_id = m.id and k.aktiv));

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
