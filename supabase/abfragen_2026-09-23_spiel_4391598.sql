-- ═══════════════════════════════════════════════════════════════════════════
-- SPIEL 4391598 — vier fehlende Spielerinnen
-- 23.09.2026
--
-- ANLASS. FC Kuesnacht 3 - FC Herrliberg, 23.08.2026, Frauen 4. Liga, 2:3.
-- Der Spielbericht des Verbands fuehrt 16 FCH-Namen; 12 sind bei uns. Vier
-- fehlen ganz, darunter eine Torschuetzin (Nr. 10, 77.) und eine
-- Eingewechselte (Nr. 18, 70.). Zwei personId (1905405, 1122655) ergeben in
-- allen Spalten aller Tabellen 0 Treffer.
--
-- ⚠ DIESE ABFRAGEN AENDERN NICHTS. Sie lesen.
--
-- ⚠ ⚠  WAS SIE BEANTWORTEN SOLLEN, UND WORAUF ZU ACHTEN IST:
--   Sind die vier WIRKLICH weg, oder stehen sie als GEGNERZEILEN da?
--   Eine fremde Zeile traegt weder Namen noch personId (Entscheid B,
--   CHECK-Constraint) — sie waere bei einer Nummernsuche unsichtbar und
--   saehe aus wie "gar nicht vorhanden". Abfrage 2 trennt die beiden Faelle.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1) Das Spiel selbst: steht es, und wann wurden Matchdaten geholt? ─────
select s.id,
       s.sfv_match_id,
       s.date,
       s.gegner,
       s.heimspiel,
       s.liga,
       s.resultat,
       s.ht_resultat,
       s.sfv_team_id,
       s.sfv_gegner_team_id,
       s.sfv_status,
       s.sfv_spiel_typ,
       s.matchdaten_geholt_am at time zone 'Europe/Zurich' as geholt_am
  from public.spiele s
 where s.sfv_match_id = 4391598;


-- ─── 2) ⚠ DIE KERNFRAGE: alle Aufstellungszeilen, eigene UND fremde ────────
-- Erwartet, wenn nichts verloren ging: 16 eigene Zeilen.
-- ⚠ Stehen dort 12 eigene und 4 fremde OHNE Namen, deren Rueckennummern
--    13/15/10/18 sind, dann sind die vier NICHT verloren, sondern als
--    Gegnerinnen eingeordnet — und ihr Tor stuende auf der falschen Seite.
select a.ist_eigener,
       a.rueckennr,
       a.name,
       a.sfv_person_id,
       a.sfv_team_id,
       a.position_name,
       a.rolle_zuweisung,
       a.von_minute,
       a.bis_minute,
       a.spielzeit,
       a.erstmals_gesehen at time zone 'Europe/Zurich'      as erstmals,
       a.zuletzt_synchronisiert at time zone 'Europe/Zurich' as zuletzt
  from public.spiel_aufstellung a
  join public.spiele s on s.id = a.spiel_id
 where s.sfv_match_id = 4391598
 order by a.ist_eigener desc, a.rueckennr nulls last;


-- ─── 3) Die Zaehlung dazu, damit man nicht zaehlen muss ────────────────────
-- ⚠ Eine Aufteilung, die aufgehen MUSS, prueft sich selbst: eigen + fremd
--    ist die Gesamtzahl. Und eine eigene Zeile OHNE personId waere ein
--    eigener Befund (der CHECK laesst sie eigentlich nicht zu).
select count(*)                                                  as zeilen_gesamt,
       count(*) filter (where a.ist_eigener)                      as eigen,
       count(*) filter (where not a.ist_eigener)                  as fremd,
       count(*) filter (where a.ist_eigener and a.sfv_person_id is null) as eigen_ohne_person,
       count(*) filter (where not a.ist_eigener and a.sfv_person_id is not null) as fremd_mit_person,
       count(distinct a.sfv_team_id)                              as verschiedene_teamnummern
  from public.spiel_aufstellung a
  join public.spiele s on s.id = a.spiel_id
 where s.sfv_match_id = 4391598;


-- ─── 4) Der Verlauf: wo steht das Tor der 77. und der Wechsel der 70.? ─────
-- ⚠ Steht das Tor auf `ist_eigener = false`, ist es dem Gegner zugeschrieben
--    — auf der Website waere es ein Tor fuer FC Kuesnacht.
select e.minute,
       e.zusatzminute,
       e.typ_id,
       e.typ,
       e.subtyp,
       e.ist_eigener,
       e.rueckennr,
       e.sfv_person_id,
       e.ein_rueckennr,
       e.ein_sfv_person_id,
       e.sfv_team_id,
       e.gegner_club_name,
       e.herkunft
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
 where s.sfv_match_id = 4391598
 order by e.minute nulls last, e.zusatzminute nulls last;


-- ─── 5) Kennen wir die vier Namen ueberhaupt IRGENDWO? ─────────────────────
-- ⚠ Ueber den NAMEN gesucht, nicht ueber die Nummer: die Nummer ist bei einer
--    fremden Zeile geloescht, der Name in sfv_personen waere aber da, falls
--    sie je als eigene Zeile eines ANDEREN Spiels gesehen wurden.
select p.sfv_person_id, p.name, p.sfv_team_id, p.rueckennr,
       p.erstmals_gesehen at time zone 'Europe/Zurich' as erstmals,
       p.zuletzt_gesehen  at time zone 'Europe/Zurich' as zuletzt
  from public.sfv_personen p
 where p.name ilike '%Rechberger%'
    or p.name ilike '%Fabienne%Schneider%'
    or p.name ilike '%Imboden%'
    or p.name ilike '%Brauchli%'
 order by p.name;


-- ─── 6) ⚠ DIE MENGENFRAGE: wie viele gespielte Spiele sind betroffen? ──────
-- Ein Spiel ist verdaechtig, wenn es fremde Aufstellungszeilen traegt, die
-- unsere eigene Teamnummer haben — oder wenn auffallend wenige eigene Zeilen
-- dastehen. Beide Spalten nebeneinander, damit man sie vergleichen kann.
--
-- ⚠ Eine kurze Aufstellung ist fuer sich KEIN Befund: bei Siebnerfussball
--    sind neun Zeilen eine vollstaendige Mannschaft. Die Liga steht deshalb
--    daneben.
select s.sfv_match_id,
       s.date,
       s.gegner,
       s.liga,
       count(*) filter (where a.ist_eigener)     as eigen,
       count(*) filter (where not a.ist_eigener) as fremd,
       count(*) filter (where not a.ist_eigener
                          and a.sfv_team_id = s.sfv_team_id) as fremd_mit_unserer_teamnummer,
       s.matchdaten_geholt_am at time zone 'Europe/Zurich' as geholt_am
  from public.spiele s
  join public.spiel_aufstellung a on a.spiel_id = s.id
 where s.sfv_status = 2
 group by s.id, s.sfv_match_id, s.date, s.gegner, s.liga, s.sfv_team_id,
          s.matchdaten_geholt_am
 having count(*) filter (where not a.ist_eigener and a.sfv_team_id = s.sfv_team_id) > 0
 order by s.date desc;


-- ─── 7) Die Bezugsgroesse dazu ─────────────────────────────────────────────
-- ⚠ Ohne sie ist Abfrage 6 ein Artefakt: "12 betroffen" heisst etwas anderes
--    bei 20 als bei 200 gespielten Spielen.
select count(*) filter (where s.sfv_status = 2)                    as gespielt,
       count(*) filter (where s.sfv_status = 2
                          and s.matchdaten_geholt_am is not null)   as gespielt_und_geholt,
       count(*)                                                     as spiele_gesamt
  from public.spiele s;


-- ═══════════════════════════════════════════════════════════════════════════
-- NACHTRAG 23.09.2026 — das Muster ist systematisch
--
-- Lianne Rechberger fehlt in mindestens FUENF Spielen. Damit scheiden ein
-- abgebrochener Abruf und ein Dedupe aus: beide waeren an ein Spiel
-- gebunden, nicht an eine Person.
--
-- ⚠ ⚠  DAS MERKMAL, AUF DAS ES ANKOMMT — am Code belegt, noch nicht an den
-- Daten gemessen:
--
--   matchdaten.ts:39   istEigener(clubNumber, unsere)  -> n === unsere
--   matchdaten.ts:90   const eigen = istEigener(p.clubNumber, unsere)
--   matchdaten.ts:127  sfv_person_id: eigen ? personId : null
--   matchdaten.ts:142  sfv_team_id:   zahl(p.teamId)     <- IMMER, auch fremd
--
-- Verglichen wird die KLUB-Nummer (vereine.sfv_club_nummer, FCH 11057),
-- nicht die Teamnummer. Eine Spielerin bei einem anderen FCH-Team kaeme
-- also an. Eine Spielerin, die bei einem ANDEREN VEREIN lizenziert ist —
-- Doppellizenz, Spielgemeinschaft, Gastspielrecht — nicht.
--
-- Sie wuerde abgelegt als:  ist_eigener = false
--                           sfv_team_id = UNSERE Teamnummer
--                           sfv_person_id = null, name = null
--
-- ⚠ Eine fremde Zeile mit UNSERER Teamnummer ist ein Widerspruch in sich:
--    sie spielt fuer uns und gilt als fremd. Genau danach fragen 6 und 8.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 8) ⚠ DIE URSACHENPROBE: fremde Zeilen mit unserer eigenen Teamnummer ──
-- Trifft die Hypothese zu, stehen hier die vier aus Spiel 4391598 mit den
-- Rueckennummern 13, 15, 10 und 18 — und Lianne Rechbergers Nummer taucht
-- ueber mehrere Spiele hinweg immer wieder auf.
--
-- ⚠ Kommt hier NICHTS zurueck, ist die Hypothese widerlegt, und die Ursache
--    ist `eigen_ohne_person` (matchdaten.ts:110) — dann gibt es die Zeile
--    gar nicht, und Abfrage 3 zeigt eine zu kleine Gesamtzahl.
select s.date,
       s.sfv_match_id,
       s.gegner,
       s.liga,
       a.rueckennr,
       a.position_name,
       a.rolle_zuweisung,
       a.von_minute, a.bis_minute, a.spielzeit,
       a.sfv_team_id                        as zeile_teamnr,
       s.sfv_team_id                        as spiel_unsere_teamnr,
       s.sfv_gegner_team_id                 as spiel_gegner_teamnr
  from public.spiel_aufstellung a
  join public.spiele s on s.id = a.spiel_id
 where not a.ist_eigener
   and a.sfv_team_id = s.sfv_team_id
 order by s.date desc, a.rueckennr;


-- ─── 9) Dieselbe Frage fuer den VERLAUF ────────────────────────────────────
-- ⚠ Hier wird es sichtbar: ein Tor, das unter `ist_eigener = false` mit
--    UNSERER Teamnummer steht, erscheint auf der Website als Tor des
--    GEGNERS. Das Tor der 77. in Spiel 4391598 waere genau so ein Fall.
select s.date,
       s.sfv_match_id,
       s.gegner,
       e.minute, e.zusatzminute,
       e.typ_id, e.typ, e.subtyp,
       e.rueckennr,
       e.ein_rueckennr,
       e.gegner_club_name,
       e.sfv_team_id        as zeile_teamnr,
       s.sfv_team_id        as spiel_unsere_teamnr
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
 where not e.ist_eigener
   and e.sfv_team_id = s.sfv_team_id
 order by s.date desc, e.minute;


-- ─── 10) ⚠ DIE MENGE, MIT BEZUGSGROESSE IN DERSELBEN ZEILE ─────────────────
-- Eine Zahl ohne Bezugsgroesse ist ein Artefakt: "12 Spiele betroffen" heisst
-- etwas anderes bei 20 als bei 200 gespielten.
--
-- ⚠ `gespielt_und_geholt` ist die richtige Bezugsgroesse, nicht `gespielt`:
--    ein Spiel ohne Matchdaten kann gar keine Aufstellungszeile haben und
--    darf nicht als "nicht betroffen" zaehlen.
with betroffen as (
  select distinct s.id
    from public.spiel_aufstellung a
    join public.spiele s on s.id = a.spiel_id
   where not a.ist_eigener and a.sfv_team_id = s.sfv_team_id
),
personen as (
  select count(distinct (a.spiel_id, a.rueckennr)) as zeilen
    from public.spiel_aufstellung a
    join public.spiele s on s.id = a.spiel_id
   where not a.ist_eigener and a.sfv_team_id = s.sfv_team_id
)
select (select count(*) from betroffen)                                as spiele_betroffen,
       (select count(*) from public.spiele
         where sfv_status = 2 and matchdaten_geholt_am is not null)     as gespielt_und_geholt,
       (select count(*) from public.spiele where sfv_status = 2)        as gespielt,
       (select zeilen from personen)                                    as verlorene_zeilen;


-- ═══════════════════════════════════════════════════════════════════════════
-- 11) ⚠ ⚠  BERICHTIGT — DIE ERSTE FASSUNG WAR FALSCH, UND DER FEHLER WAR MEINER
--
-- Sie rechnete `geliefert = eigen + fremd + eigen_ohne_person +
-- fremd_ohne_nummer` und meldete in ALLEN 25 Laeufen `false`.
--
-- ⚠ Die Formel stand so im Kommentar an `aufstellung_geliefert`
--    (ergebnisTypen.ts:53) — und ich habe sie ABGESCHRIEBEN, statt sie am
--    Code zu pruefen. Gezaehlt wird aber woanders:
--
--      matchdatenLauf.ts:274   if (gegnerUnveraendert(...)) {
--      matchdatenLauf.ts:279     erg.fremd_unveraendert += fremdeZeilen.length;
--      matchdatenLauf.ts:302   } else { ... erg.aufstellung_fremd += ... }
--
-- **`aufstellung_fremd` zaehlt nur die GESCHRIEBENEN Gegnerzeilen.** Sind
-- sie unveraendert — der Normalfall —, landen sie in `fremd_unveraendert`,
-- einem anderen Zaehler. Der fehlt in der Formel, und er ist rund die
-- Haelfte von `geliefert`. Genau das, was der Auftraggeber gesehen hat.
--
-- ⚠ ⚠  UND DAS IST EIN EIGENER BEFUND, GROESSER ALS DIE VIER SPIELERINNEN:
--    Die Aufteilung geht seit dem 10.09.2026 NIE auf, und niemand hat es
--    gemerkt — weil sie nirgends gerechnet wurde. Es gibt keinen Testfall
--    dazu, sonst waere er rot. Eine Aufteilung, die sich selbst pruefen
--    soll, tut das nur, wenn jemand sie ausrechnet.
--
--    Dieselbe Familie wie „ein Kommentar, der eine ANDERE Stelle
--    zusichert": die Formel steht in ergebnisTypen.ts, gezaehlt wird in
--    matchdatenLauf.ts, und nichts hielt die beiden gegeneinander.
select l.gestartet_am at time zone 'Europe/Zurich' as zeit,
       l.status,
       l.details->'matchdaten'->>'spiele_geholt'          as spiele,
       l.details->'matchdaten'->>'aufstellung_geliefert'  as geliefert,
       l.details->'matchdaten'->>'aufstellung_zeilen'     as eigen,
       l.details->'matchdaten'->>'aufstellung_fremd'      as fremd_geschrieben,
       l.details->'matchdaten'->>'fremd_unveraendert'     as fremd_unveraendert,
       l.details->'matchdaten'->>'gegner_doppel'          as gegner_doppel,
       l.details->'matchdaten'->>'eigen_ohne_person'      as eigen_ohne_person,
       l.details->'matchdaten'->>'fremd_ohne_nummer'      as fremd_ohne_nummer,
       /* ⚠ Jetzt mit BEIDEN fremden Zaehlern. Geht sie immer noch nicht
          auf, fehlt ein weiterer — und DAS waere dann der Befund. */
       ( coalesce((l.details->'matchdaten'->>'aufstellung_zeilen')::int, 0)
       + coalesce((l.details->'matchdaten'->>'aufstellung_fremd')::int, 0)
       + coalesce((l.details->'matchdaten'->>'fremd_unveraendert')::int, 0)
       + coalesce((l.details->'matchdaten'->>'gegner_doppel')::int, 0)
       + coalesce((l.details->'matchdaten'->>'eigen_ohne_person')::int, 0)
       + coalesce((l.details->'matchdaten'->>'fremd_ohne_nummer')::int, 0)
       ) as summe,
       ( coalesce((l.details->'matchdaten'->>'aufstellung_zeilen')::int, 0)
       + coalesce((l.details->'matchdaten'->>'aufstellung_fremd')::int, 0)
       + coalesce((l.details->'matchdaten'->>'fremd_unveraendert')::int, 0)
       + coalesce((l.details->'matchdaten'->>'gegner_doppel')::int, 0)
       + coalesce((l.details->'matchdaten'->>'eigen_ohne_person')::int, 0)
       + coalesce((l.details->'matchdaten'->>'fremd_ohne_nummer')::int, 0)
       = coalesce((l.details->'matchdaten'->>'aufstellung_geliefert')::int, -1)
       ) as aufteilung_stimmt
  from public.api_sync_log l
 where l.details->'matchdaten'->>'aufstellung_geliefert' is not null
 order by l.gestartet_am desc
 limit 25;


-- ⚠ ⚠  UND DER FALL, DEN NIEMAND GEPRUEFT HAT — Fall 5.
--
-- Der Spielbericht, in dem die 16 Namen stehen, ist die WEBSITE des
-- Verbands (matchcenter.fvrz.ch). Die API ist eine andere Quelle. Dass die
-- Website Daten zeigt, die die API nicht herausgibt, ist in diesem Projekt
-- BELEGT: 21 von 42 Mannschaften haben auf der Website einen Spielplan und
-- in `/api/team/list` keinen (gemessen 10.09.2026).
--
-- Ist es Fall 5, ist bei uns nichts kaputt — und jede Reparatur an
-- `istEigener` waere eine Aenderung an einer Stelle, die richtig arbeitet.
