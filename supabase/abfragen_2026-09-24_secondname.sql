-- ═══════════════════════════════════════════════════════════════════════════
-- WAS STEHT IN `secondName` — ZWEITER VORNAME ODER ZWEITER NACHNAME?
-- 24.09.2026
--
-- ANLASS. Der Verband liefert `firstname`, `name` und `secondName` getrennt.
-- Wir setzen an zwei Stellen `firstname + " " + name` zusammen und verwerfen
-- `secondName` (`matchdaten.ts:130` in bildeAufstellung, `:350` in
-- bildeSfvPerson, und ein drittes Mal in `leseSchiedsrichter`).
--
-- ⚠ ⚠ DIE BEGRUENDUNG DAFUER IST EINE ANNAHME, KEINE MESSUNG. Sie steht
--      dreimal im Code als Tatsache: „secondName ist ein zweiter Vorname".
--      Gemessen hat sie niemand — die Swagger-Datei sagt zu allen drei
--      Feldern nur `{"type":"string","nullable":true}`, und in der
--      aufgezeichneten Probe (`docs/sfv/matchdaten_beispiel.json`) sind alle
--      drei geschwaerzt.
--
-- ── ⚠ WAS DIESE ABFRAGEN BEANTWORTEN KOENNEN UND WAS NICHT ────────────────
--
-- `sfv_personen.name` und `spiel_aufstellung.name` enthalten den
-- ZUSAMMENGESETZTEN Namen — und zwar ohne `secondName`. Sie koennen deshalb
-- NICHT sagen, was in `secondName` steht.
--
-- Was sie sagen koennen, ist die andere Haelfte und sie genuegt:
--
--   Steht in `sfv_personen.name` der VOLLE Name („Lorena Sara Hug"), dann
--   steckte der Mittelteil schon in `firstname` oder `name` — `secondName`
--   war fuer diese Person LEER oder eine Wiederholung, und die Frage ist
--   fuer sie gegenstandslos.
--
--   Steht dort ein GEKUERZTER Name („Lorena Hug", „Tamara Hidber"), dann
--   traegt `secondName` genau das Fehlende — und WELCHES Wort fehlt, sagt
--   die Richtung:
--       fehlt ein Wort in der MITTE  → zweiter Vorname
--       fehlt das Wort am ENDE       → zweiter Nachname
--
-- ⚠ Der Massstab „voller Name" kommt dabei NICHT aus dem SFV, sondern aus
--    unserem eigenen Bestand (`personen.vorname` / `personen.nachname`).
--    Das ist eine zweite, unabhaengige Quelle — genau deshalb traegt der
--    Vergleich. Ohne sie waere jede Aussage ueber „gekuerzt" zirkulaer.
--
-- ⚠ ⚠ UND EINE GRENZE BLEIBT: der Vergleich sagt, WAS der Verband weglaesst,
--      nicht, WIE er es benennt. Traegt „Tamara Hidber Mullis" bei uns
--      `nachname = 'Hidber Mullis'` und beim SFV `name = 'Hidber'`, dann
--      steht „Mullis" in `secondName` — dass der SFV es deshalb „second
--      NAME" nennt, ist der naheliegende Schluss und keine Messung. Belegen
--      kann das nur ein Abruf, der das Feld selbst ansieht (siehe unten).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1) DIE VIER NAMEN, wie sie bei uns gespeichert sind ──────────────────
-- ⚠ `woerter` ist die entscheidende Spalte, nicht der Name selbst: zwei
--    Woerter heissen „etwas fehlt", drei oder mehr heissen „es ist alles da,
--    und secondName war nicht dabei".
select 'sfv_personen'          as tabelle,
       p.sfv_person_id,
       p.name,
       array_length(regexp_split_to_array(btrim(p.name), '\s+'), 1) as woerter,
       p.sfv_team_id,
       p.rueckennr,
       p.erstmals_gesehen::date as erstmals,
       p.zuletzt_gesehen::date  as zuletzt
  from public.sfv_personen p
 where p.name ilike '%Hug%'
    or p.name ilike '%Hidber%'
    or p.name ilike '%Mullis%'
    or p.name ilike '%Johansen%'
    or p.name ilike '%Zerdilas%'
    or p.name ilike '%Herrera%'
 order by p.name;


-- ─── 2) Dieselben vier in der Aufstellung ─────────────────────────────────
-- ⚠ Eine Gegenprobe und keine zweite Quelle: beide Tabellen werden von
--    DERSELBEN Regel gefuellt (`firstname + " " + name`). Weichen sie
--    voneinander ab, ist das ein Befund ueber den Sync — stimmen sie
--    ueberein, ist damit nichts ueber `secondName` gezeigt.
select 'spiel_aufstellung'     as tabelle,
       a.sfv_person_id,
       a.name,
       array_length(regexp_split_to_array(btrim(a.name), '\s+'), 1) as woerter,
       count(*)                as zeilen,
       min(a.erstmals_gesehen)::date as erstmals,
       max(a.zuletzt_synchronisiert)::date as zuletzt
  from public.spiel_aufstellung a
 where a.ist_eigener
   and a.name is not null
   and (a.name ilike '%Hug%'   or a.name ilike '%Hidber%'
     or a.name ilike '%Mullis%' or a.name ilike '%Johansen%'
     or a.name ilike '%Zerdilas%' or a.name ilike '%Herrera%')
 group by 1, 2, 3, 4
 order by a.name;


-- ─── 3) UNSER eigener Eintrag zu denselben Menschen ───────────────────────
-- Die zweite Quelle. ⚠ Gesucht wird ueber den Nachnamen, NICHT ueber eine
--    Zuordnung: `sfv_zuordnung` war am 23.09.2026 noch leer, ein Join
--    darueber gaebe null Zeilen und saehe aus wie „diese Menschen gibt es
--    bei uns nicht".
select 'personen' as tabelle,
       pe.vorname,
       pe.nachname,
       array_length(regexp_split_to_array(btrim(pe.vorname),  '\s+'), 1) as woerter_vorname,
       array_length(regexp_split_to_array(btrim(pe.nachname), '\s+'), 1) as woerter_nachname,
       pe.vorname || ' ' || pe.nachname as voller_name,
       pe.geburtsdatum
  from public.personen pe
 where pe.nachname ilike '%Hug%'
    or pe.nachname ilike '%Hidber%'
    or pe.nachname ilike '%Mullis%'
    or pe.nachname ilike '%Johansen%'
    or pe.nachname ilike '%Zerdilas%'
    or pe.nachname ilike '%Herrera%'
    or pe.vorname  ilike '%Sara%'
    or pe.vorname  ilike '%Laerke%'
    or pe.vorname  ilike '%Mina%'
 order by pe.nachname, pe.vorname;


-- ─── 4) ⚠ DER ENTSCHEIDER: was der SFV weglaesst ──────────────────────────
-- Fuer jede SFV-Person, deren Name zu einem unserer Eintraege passt: welche
-- Woerter unseres vollen Namens fehlen im SFV-Namen?
--
--   fehlt NICHTS                     → secondName war leer oder redundant
--   fehlt ein Wort aus dem VORNAMEN  → secondName ist ein zweiter VORNAME
--   fehlt ein Wort aus dem NACHNAMEN → secondName ist ein zweiter NACHNAME
--
-- ⚠ Verbunden wird ueber „letztes Wort des Nachnamens kommt im SFV-Namen
--    vor UND erstes Wort des Vornamens ebenso". Das ist eine Naeherung ueber
--    Namensteile, kein Schluessel — ein Treffer kann eine andere Person
--    sein. Deshalb gibt die Abfrage beide Namen vollstaendig aus, damit man
--    jede Zeile einzeln gegenlesen kann, statt die Zahl zu zaehlen.
with unsere as (
  select pe.id, pe.vorname, pe.nachname,
         pe.vorname || ' ' || pe.nachname as voll,
         (regexp_split_to_array(btrim(pe.vorname),  '\s+'))[1] as vorname_erstes,
         (regexp_split_to_array(btrim(pe.nachname), '\s+'))[
            array_length(regexp_split_to_array(btrim(pe.nachname), '\s+'), 1)
         ] as nachname_letztes
    from public.personen pe
),
sfv as (
  select distinct p.sfv_person_id, p.name
    from public.sfv_personen p
)
select s.sfv_person_id,
       s.name                                     as sfv_name,
       u.voll                                     as unser_name,
       (select string_agg(w, ' ' order by ord)
          from unnest(regexp_split_to_array(btrim(u.voll), '\s+'))
               with ordinality as t(w, ord)
         where btrim(s.name) !~* ('(^|\s)' || w || '($|\s)')
       )                                          as fehlt_im_sfv_namen,
       case
         when (select count(*)
                 from unnest(regexp_split_to_array(btrim(u.voll), '\s+')) as w
                where btrim(s.name) !~* ('(^|\s)' || w || '($|\s)')) = 0
           then 'nichts fehlt — secondName war leer oder redundant'
         when (select count(*)
                 from unnest(regexp_split_to_array(btrim(u.nachname), '\s+')) as w
                where btrim(s.name) !~* ('(^|\s)' || w || '($|\s)')) > 0
           then 'ein NACHNAME fehlt → Kandidat: zweiter Nachname'
         else 'ein VORNAME fehlt → Kandidat: zweiter Vorname'
       end                                        as richtung
  from sfv s
  join unsere u
    on btrim(s.name) ~* ('(^|\s)' || u.nachname_letztes || '($|\s)')
   and btrim(s.name) ~* ('(^|\s)' || u.vorname_erstes   || '($|\s)')
 order by 4 nulls last, s.name;


-- ─── 5) Bestandsweit: wie oft betrifft es ueberhaupt etwas? ───────────────
-- ⚠ Die Bezugsgroesse gehoert dazu. „Drei von 387" ist eine Randlage,
--    „achtzig von 387" ist eine Regel — und die Zahl entscheidet, ob eine
--    eigene Spalte fuer `secondName` sich lohnt.
--
-- ⚠ Sie sagt NICHT, wie viele Personen ein gefuelltes `secondName` haben.
--    Das steht in keiner Tabelle. Sie sagt nur, bei wie vielen der
--    gespeicherte Name mehr als zwei Woerter traegt — also wie oft die
--    Zusammensetzung heute schon einen dritten Teil mitbringt.
select array_length(regexp_split_to_array(btrim(p.name), '\s+'), 1) as woerter,
       count(*)                                                    as personen,
       round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as anteil_prozent
  from public.sfv_personen p
 group by 1
 order by 1;
