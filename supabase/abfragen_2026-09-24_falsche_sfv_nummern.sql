-- ═══════════════════════════════════════════════════════════════════════════
-- ZUORDNUNGEN MIT EINER NUMMER, DIE IN KEINER AUFSTELLUNG VORKOMMT
-- 24.09.2026 — NUR LESEN. Keine dieser Abfragen schreibt.
--
-- FRAGE. "Wie viele Profile tragen eine SFV-Nummer, die in keiner
-- Aufstellung vorkommt, obwohl ihr Name sehr wohl in einer Aufstellung
-- steht?" — also der Verdacht auf eine vertippte oder verwechselte Nummer.
--
-- ⚠ ⚠  WAS DIESE DATEI MESSEN KANN UND WAS NICHT.
--
--   `personen` und `mitglieder` fuehren KEINE SFV-Spalte. Gemessen am
--   Schema, nicht aus dem Gedaechtnis: die Verknuepfung steht allein in
--   `sfv_zuordnung` (sfv_person_id -> mitglied_id).
--
--   Diese Abfragen sagen deshalb etwas ueber UNSERE Zuordnungen. Ueber die
--   `fch_person`-Beitraege auf der Website (ACF-Feld `sfv_person_id`) sagen
--   sie NICHTS — das ist ein fremdes System. Der Weg dorthin steht im
--   Bericht, nicht hier.
--
-- ⚠ ⚠  EIN NAME IST KEIN SCHLUESSEL.
--
--   Dieser Verein hat zwei Adrian Schmid (gemessen 23.08.2026). Verglichen
--   wird hier trotzdem ueber den NAMEN, weil es nichts anderes gibt — und
--   genau deshalb RAET die Abfrage nicht, sondern ZEIGT die
--   Mehrdeutigkeit:
--
--     `kandidaten`                 wie viele verschiedene SFV-Nummern
--                                  diesen Namen in einer Aufstellung
--                                  tragen. Groesser 1 heisst: nicht
--                                  entscheidbar.
--     `personen_gleichen_namens`   wie viele Personen bei UNS so heissen.
--                                  Groesser 1 heisst: der Treffer gehoert
--                                  vielleicht der anderen Person.
--     `kandidaten_schon_vergeben`  wie viele der Kandidatennummern bereits
--                                  einem anderen Mitglied zugeordnet sind.
--
--   Eine Zeile mit `kandidaten = 1`, `personen_gleichen_namens = 1` und
--   `kandidaten_schon_vergeben = 0` ist ein Befund. Alles andere ist eine
--   FRAGE und gehoert von Hand angesehen.
--
-- ⚠  DER NAMENSVERGLEICH IST EINE NAEHERUNG, KEINE MESSUNG. Er haelt
--    `personen.vorname || ' ' || personen.nachname` gegen
--    `spiel_aufstellung.name`, und letzteres baut der Sync aus `firstname`
--    + `name` des Verbands (`matchdaten.ts:132`). Ein zweiter Vorname, ein
--    Doppelname oder eine abweichende Schreibweise beim Verband ergeben
--    KEINEN Treffer. Die Abfrage findet also eher zu wenig als zu viel —
--    von zwei Fehlerrichtungen ist das die bezahlbare.
--
-- ⚠  `ist_eigener` steht ueberall dabei. Es waere heute entbehrlich:
--    `spiel_aufstellung_fremde_ohne_person` erzwingt bei fremden Zeilen
--    `sfv_person_id IS NULL` und `name IS NULL`. Aber eine Abfrage, die
--    sich auf einen CHECK verlaesst, ist eine Zusicherung ueber eine
--    andere Stelle.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1) DIE BEZUGSGROESSE, und die Aufteilung muss aufgehen ────────────────
--
-- ⚠ Eine Trefferzahl ohne Bezugsgroesse ist ein Artefakt. Und die drei
--   Teilmengen ergeben zusammen `zuordnungen_gesamt` — eine Aufteilung, die
--   aufgehen MUSS, prueft sich selbst. Geht sie nicht auf, misst eine der
--   Bedingungen etwas anderes als die andere.
--
-- ⚠ `nummer_fehlt_name_fehlt_auch` ist ausdruecklich KEIN Befund ueber eine
--   falsche Nummer. Diese Person taucht in keiner Aufstellung auf — weder
--   ueber die Nummer noch ueber den Namen. Das kann heissen: sie hat nie
--   gespielt, der Verband fuehrt die Spiele nicht, oder ihr Name steht dort
--   anders geschrieben. Nicht feststellbar ist nicht dasselbe wie nichts
--   gefunden.
with zuordnung as (
  -- ⚠ INNER JOIN ist hier sicher und keine Nachlaessigkeit: der
  --   Fremdschluessel `sfv_zuordnung_mitglied_fkey` geht auf
  --   `mitglieder(id, verein_id)` mit ON DELETE CASCADE. Eine Waise kann es
  --   nicht geben; ein LEFT JOIN taeuschte eine Sorge vor, die das Schema
  --   ausschliesst.
  select z.verein_id                                                as verein_id,
         z.sfv_person_id                                            as nummer,
         z.mitglied_id                                              as mitglied_id,
         lower(regexp_replace(
           btrim(coalesce(p.vorname, '') || ' ' || coalesce(p.nachname, '')),
           '[[:space:]]+', ' ', 'g'))                               as name_norm
    from public.sfv_zuordnung z
    join public.mitglieder    m on m.id = z.mitglied_id and m.verein_id = z.verein_id
    join public.personen      p on p.id = m.person_id
),
aufstellung as (
  select a.verein_id                                                as verein_id,
         lower(regexp_replace(btrim(a.name), '[[:space:]]+', ' ', 'g'))
                                                                    as name_norm
    from public.spiel_aufstellung a
   where a.ist_eigener
     and a.sfv_person_id is not null
     and a.name is not null
     and btrim(a.name) <> ''
   group by 1, 2
),
lage as (
  select exists (
           select 1 from public.spiel_aufstellung s
            where s.verein_id = z.verein_id
              and s.ist_eigener
              and s.sfv_person_id = z.nummer
         )                                                          as nummer_steht_drin,
         exists (
           select 1 from aufstellung a
            where a.verein_id = z.verein_id
              and a.name_norm = z.name_norm
         )                                                          as name_steht_drin
    from zuordnung z
)
select count(*)                                                     as zuordnungen_gesamt,
       count(*) filter (where nummer_steht_drin)                    as nummer_steht_in_aufstellung,
       count(*) filter (where not nummer_steht_drin and name_steht_drin)
                                                                    as nummer_fehlt_name_da,
       count(*) filter (where not nummer_steht_drin and not name_steht_drin)
                                                                    as nummer_fehlt_name_fehlt_auch,
       round(100.0 * count(*) filter (where not nummer_steht_drin and name_steht_drin)
             / nullif(count(*), 0), 1)                              as anteil_verdacht_prozent,
       -- ⚠ Die Gegenprobe auf die Aufteilung. Muss `true` sein.
       (count(*) = count(*) filter (where nummer_steht_drin)
                 + count(*) filter (where not nummer_steht_drin and name_steht_drin)
                 + count(*) filter (where not nummer_steht_drin and not name_steht_drin))
                                                                    as aufteilung_stimmt
  from lage;


-- ─── 2) DIE LISTE: Name, falsche Nummer, richtige Nummer ───────────────────
--
-- ⚠ KEINE KUERZUNG, KEIN TOP-N. Wer entscheiden soll, muss alle sehen —
--   dieselbe Lehre wie bei der Loeschvorschau, wo eine Schwelle von 20 bei
--   einem Stapel von zwei umfiel.
--
-- ⚠ `richtige_nummer` ist ein VORSCHLAG, kein Ergebnis. Er traegt nur, wenn
--   `kandidaten = 1` UND `personen_gleichen_namens = 1` UND
--   `kandidaten_schon_vergeben = 0`. Die drei Spalten stehen deshalb
--   daneben und nicht in einer Fussnote.
with zuordnung as (
  select z.verein_id                                                as verein_id,
         z.sfv_person_id                                            as nummer,
         z.mitglied_id                                              as mitglied_id,
         m.aktiv                                                    as mitglied_aktiv,
         m.mitgliedtyp                                              as mitgliedtyp,
         btrim(coalesce(p.vorname, '') || ' ' || coalesce(p.nachname, ''))
                                                                    as voller_name,
         lower(regexp_replace(
           btrim(coalesce(p.vorname, '') || ' ' || coalesce(p.nachname, '')),
           '[[:space:]]+', ' ', 'g'))                               as name_norm
    from public.sfv_zuordnung z
    join public.mitglieder    m on m.id = z.mitglied_id and m.verein_id = z.verein_id
    join public.personen      p on p.id = m.person_id
),
aufstellung as (
  -- Je Name die Nummern, die ihn in einer eigenen Aufstellungszeile tragen.
  select a.verein_id                                                as verein_id,
         lower(regexp_replace(btrim(a.name), '[[:space:]]+', ' ', 'g'))
                                                                    as name_norm,
         a.sfv_person_id                                            as nummer,
         -- ⚠ Der Name, wie der VERBAND ihn schreibt. Er kann von unserem
         --   abweichen, und wer die Nummer von Hand setzt, will sehen, wen
         --   der Verband darunter fuehrt.
         -- ⚠ `min()` waehlt EINE Schreibweise, wenn der Verband dieselbe
         --   Nummer verschieden schreibt ("Anna Meier" und "Anna  Meier").
         --   Die Spalte ist damit ein Beispiel, keine Aufzaehlung.
         min(btrim(a.name))                                         as name_beim_verband,
         count(*)                                                   as zeilen,
         count(distinct a.spiel_id)                                 as spiele
    from public.spiel_aufstellung a
   where a.ist_eigener
     and a.sfv_person_id is not null
     and a.name is not null
     and btrim(a.name) <> ''
   group by 1, 2, 3
),
namensgleiche as (
  -- ⚠ Wie oft es diesen Namen bei UNS gibt. Zwei Adrian Schmid heissen:
  --   der Namenstreffer kann der anderen Person gehoeren.
  select p.verein_id                                                as verein_id,
         lower(regexp_replace(
           btrim(coalesce(p.vorname, '') || ' ' || coalesce(p.nachname, '')),
           '[[:space:]]+', ' ', 'g'))                               as name_norm,
         count(*)                                                   as personen_gleichen_namens
    from public.personen p
   group by 1, 2
)
select z.voller_name                                                as name,
       z.nummer                                                     as falsche_nummer,
       string_agg(a.nummer::text, ', ' order by a.nummer)           as richtige_nummer,
       string_agg(a.name_beim_verband, ' | ' order by a.nummer)     as name_beim_verband,
       count(*)                                                     as kandidaten,
       max(ng.personen_gleichen_namens)                             as personen_gleichen_namens,
       count(*) filter (where exists (
         select 1 from public.sfv_zuordnung v
          where v.verein_id = a.verein_id
            and v.sfv_person_id = a.nummer))                        as kandidaten_schon_vergeben,
       sum(a.zeilen)                                                as aufstellungszeilen,
       sum(a.spiele)                                                as spiele,
       z.mitglied_id                                                as mitglied_id,
       z.mitglied_aktiv                                             as mitglied_aktiv,
       z.mitgliedtyp                                                as mitgliedtyp
  from zuordnung z
  join aufstellung a
    on a.verein_id = z.verein_id
   and a.name_norm = z.name_norm
  left join namensgleiche ng
    on ng.verein_id = z.verein_id
   and ng.name_norm = z.name_norm
 -- Die zugeordnete Nummer taucht in KEINER eigenen Aufstellungszeile auf.
 where not exists (
         select 1 from public.spiel_aufstellung s
          where s.verein_id = z.verein_id
            and s.ist_eigener
            and s.sfv_person_id = z.nummer
       )
 group by z.voller_name, z.nummer, z.mitglied_id, z.mitglied_aktiv, z.mitgliedtyp
 -- Die eindeutigen zuerst: sie sind die Befunde, der Rest sind Fragen.
 order by count(*) asc, max(ng.personen_gleichen_namens) asc, z.voller_name;


-- ─── 3) Die Gegenrichtung: Nummern in der Aufstellung ohne Zuordnung ───────
--
-- ⚠ Sie beantwortet die Frage NICHT — sie ist die Kehrseite und gehoert
--   daneben. Eine falsch gesetzte Nummer hinterlaesst ZWEI Spuren: eine
--   Zuordnung, die ins Leere zeigt (Abfrage 2), und eine Nummer in der
--   Aufstellung, die niemand traegt. Wer nur eine Seite ansieht, haelt eine
--   unvollstaendige Zuordnungsarbeit fuer einen Fehler.
--
-- ⚠ Eine grosse Zahl ist hier der Normalfall, kein Defekt: am 29.08.2026
--   standen 308 Spieler in der Aufstellung und NULL in `sfv_zuordnung`.
--   Der Durchgang von Hand steht aus.
select count(distinct a.sfv_person_id)                              as nummern_in_aufstellung,
       count(distinct a.sfv_person_id) filter (where not exists (
         select 1 from public.sfv_zuordnung z
          where z.verein_id = a.verein_id
            and z.sfv_person_id = a.sfv_person_id))                 as davon_ohne_zuordnung
  from public.spiel_aufstellung a
 where a.ist_eigener and a.sfv_person_id is not null;


-- ─── 4) GEGENPROBE: dieselbe Frage mit einem toleranteren Schluessel ───────
--
-- ⚠ BEIDE LESARTEN NEBENEINANDER, und die Reihenfolge ist die Aussage:
--   Abfrage 2 ist die strenge, diese hier die weite. Findet sie MEHR, liegt
--   der Unterschied an der Schreibweise — vertauschte Felder, Doppelname,
--   Umlaut. Jeder zusaetzliche Treffer gehoert dann EINZELN angesehen, nicht
--   uebernommen.
--
-- ⚠ Der Schluessel ist derselbe wie `cc_namensschluessel()` im
--   WordPress-Empfaenger: klein, Umlaute aufgeloest, alles ausser Buchstaben
--   weg, Teile SORTIERT — weil "Anna Meier" und "Meier Anna" derselbe
--   Mensch sind. Genau das macht ihn aber auch anfaelliger: er wirft Namen
--   zusammen, die nur aus denselben Bestandteilen bestehen.
-- ⚠ `translate()` kann KEINEN Umlaut aufloesen: es bildet Zeichen auf
--   Zeichen ab, und "ae" sind zwei. Ein `translate(x, 'äöü', 'aou')` sieht
--   richtig aus und ergibt "Mueller" -> "Muller" statt "Mueller" — eine
--   stille Abweichung gegen den Schluessel drueben. Deshalb `replace()`,
--   geschachtelt.
with roh_wir as (
  select z.verein_id                                                as verein_id,
         z.sfv_person_id                                            as nummer,
         regexp_replace(
           replace(replace(replace(replace(
             lower(btrim(coalesce(p.vorname, '') || ' ' || coalesce(p.nachname, ''))),
             'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
           '[^a-z ]+', ' ', 'g')                                    as roh
    from public.sfv_zuordnung z
    join public.mitglieder    m on m.id = z.mitglied_id and m.verein_id = z.verein_id
    join public.personen      p on p.id = m.person_id
),
roh_sfv as (
  select distinct
         a.verein_id                                                as verein_id,
         regexp_replace(
           replace(replace(replace(replace(
             lower(btrim(a.name)),
             'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
           '[^a-z ]+', ' ', 'g')                                    as roh
    from public.spiel_aufstellung a
   where a.ist_eigener
     and a.sfv_person_id is not null
     and a.name is not null
     and btrim(a.name) <> ''
),
weich_wir as (
  select w.verein_id                                                as verein_id,
         w.nummer                                                   as nummer,
         (select string_agg(t, ' ' order by t)
            from unnest(string_to_array(w.roh, ' ')) as t
           where t <> '')                                           as name_weich
    from roh_wir w
),
weich_sfv as (
  select distinct
         r.verein_id                                                as verein_id,
         (select string_agg(t, ' ' order by t)
            from unnest(string_to_array(r.roh, ' ')) as t
           where t <> '')                                           as name_weich
    from roh_sfv r
)
select count(*)                                                     as zuordnungen_gesamt,
       count(*) filter (where not exists (
         select 1 from public.spiel_aufstellung s
          where s.verein_id = ww.verein_id
            and s.ist_eigener
            and s.sfv_person_id = ww.nummer)
         and exists (
         select 1 from weich_sfv ws
          where ws.verein_id = ww.verein_id
            and ws.name_weich = ww.name_weich))                     as verdacht_weiche_lesart
  from weich_wir ww;
