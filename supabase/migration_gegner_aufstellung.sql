-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — Entscheid B: Gegneraufstellung mit Nummer und Position,
--              ohne jede Person
-- 10.09.2026
--
-- ⚠ ⚠  B IST NICHT C. Der Unterschied steht in beiden Papieren
--   (docs/plan_gegner_aufstellung_b.md und dem abgelehnten
--   docs/plan_gegner_namen.md) und hier noch einmal, weil eine Migration
--   laenger gelesen wird als ein Papier:
--
--     B (angenommen)   Nummer und Position ja, Name VERBOTEN
--     C (abgelehnt)    Name auch
--
--   Wer spaeter „die Gegnerseite wurde geoeffnet" liest, haelt das eine
--   fuer das andere. Sie ist nicht geoeffnet worden — sie ist um zwei
--   Felder erweitert, und der Rest ist in der Datenbank gesperrt.
--
-- ⚠ WARUM sfv_person_id MITGESPERRT IST. Eine Personennummer ist kein
--   Name — aber sie ist ueber DIESELBE Schnittstelle in einen Namen
--   aufzuloesen, und sie bliebe dauerhaft in unserer Datenbank. Ein Feld,
--   das man nur nicht ausliest, ist etwas anderes als eines, das nicht
--   gefuellt werden darf. **Gefordert ist das zweite.**
--
-- ⚠ DER VERLAUF-CHECK WIRD NICHT ANGEFASST.
--   `spiel_ereignisse_fremde_anonym_check` sitzt auf `spiel_ereignisse`,
--   und der Verlauf bleibt bei Gegnern unveraendert. Ihn zu lockern
--   erzeugte genau das, was hier verhindert werden soll: ein Feld, das
--   erlaubt ist und leer bleibt, weil niemand es fuellt.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · Die Trennung als Spalte ────────────────────────────────────────────
--
-- ⚠ SIE ERSETZT DEN ZEILENFILTER, sie hebt ihn nicht auf. `istEigener`
--   wandert vom Anfang von bildeAufstellung() in die FELDZUWEISUNG —
--   dieselbe Bauart wie in bildeEreignis() seit dem 19.08.2026. Eine
--   Zeile, die durchkommt, nimmt beim naechsten neuen Feld alles mit;
--   eine Feldliste nicht.
alter table public.spiel_aufstellung
  add column if not exists ist_eigener boolean not null default true;

comment on column public.spiel_aufstellung.ist_eigener is
  'Gehoert diese Zeile zu unserem Klub? Aus clubNumber gegen vereine.sfv_club_nummer. ⚠ Bis 10.09.2026 gab es nur eigene Zeilen — der Vorgabewert true ist deshalb fuer den Bestand richtig und nicht geraten.';

-- ── 2 · Der neue CHECK ─────────────────────────────────────────────────────
alter table public.spiel_aufstellung
  drop constraint if exists spiel_aufstellung_fremde_ohne_person;

alter table public.spiel_aufstellung
  add constraint spiel_aufstellung_fremde_ohne_person check (
    ist_eigener or (sfv_person_id is null and name is null)
  );

-- ── 3 · Der zweite Schluessel ──────────────────────────────────────────────
--
-- ⚠ ⚠  WORUEBER ER EINDEUTIG IST — die Frage, die Didi gestellt hat, und
--       die Nummer allein reicht wirklich nicht.
--
--   Der bestehende Schluessel ist (verein_id, spiel_id, sfv_person_id).
--   Fuer fremde Zeilen ist sfv_person_id jetzt NULL, und Postgres laesst
--   in einem UNIQUE beliebig viele NULLs zu — der alte Schluessel greift
--   dort also GAR NICHT. Ohne einen zweiten legte jeder stuendliche Lauf
--   dieselben elf Gegnerzeilen neu an.
--
--   Eindeutig ist eine fremde Zeile ueber:
--
--     (verein_id, spiel_id, sfv_team_id, rueckennr)
--
--   ⚠ `sfv_team_id` GEHOERT DAZU, nicht nur die Nummer. Bei zwei eigenen
--     Teams gegeneinander stehen beide Kader unter derselben spiel_id
--     (CLAUDE.md: „Zwei eigene Teams gegeneinander ergeben EINE Zeile") —
--     und dann gibt es die 9 zweimal. Der Fall ist heute leer, aber der
--     Schluessel muss ihn aushalten.
--
--   ⚠ UND `rueckennr IS NOT NULL` IST BEDINGUNG, nicht Zierrat. Eine
--     fremde Zeile ohne Nummer hat KEINE Identitaet: kein Name, keine
--     Personennummer, keine Nummer — sie waere von jeder anderen
--     ununterscheidbar. Solche Zeilen entstehen deshalb gar nicht erst
--     (bildeAufstellung gibt null zurueck), und der Index sagt dasselbe
--     noch einmal.
create unique index if not exists spiel_aufstellung_fremd_key
  on public.spiel_aufstellung (verein_id, spiel_id, sfv_team_id, rueckennr)
  where ist_eigener = false and rueckennr is not null;

comment on index public.spiel_aufstellung_fremd_key is
  'Zweiter Schluessel fuer Gegnerzeilen (10.09.2026). Der alte greift dort nicht: sfv_person_id ist NULL, und UNIQUE laesst beliebig viele NULLs zu. Ohne diesen Index legte jeder Lauf dieselben Gegnerzeilen neu an.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Der CHECK haelt. Diese Anweisung MUSS scheitern:
--
--   insert into public.spiel_aufstellung
--          (verein_id, spiel_id, sfv_person_id, ist_eigener,
--           name, sfv_team_id, rueckennr)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           123, false, 'Max Muster', 1, 7);
--   -- erwartet: 23514 check constraint violated
--
-- 2 · Nach dem naechsten Matchdaten-Lauf:
--
--   select ist_eigener,
--          count(*)                as zeilen,
--          count(sfv_person_id)    as mit_person,
--          count(name)             as mit_namen,
--          count(rueckennr)        as mit_nummer,
--          count(position_name)    as mit_position
--     from public.spiel_aufstellung
--    group by 1
--    order by 1;
--
-- ⚠ Erwartung bei ist_eigener = false:
--      mit_person   = 0
--      mit_namen    = 0
--      mit_nummer   = zeilen
--      mit_position = zeilen
--
--   Steht bei `mit_person` etwas anderes als 0, ist der CHECK umgangen
--   worden — das waere ein eigener Befund und kein Zahlendreher.
--
-- 3 · Und der Lauf legt nichts doppelt an:
--
--   select spiel_id, sfv_team_id, rueckennr, count(*)
--     from public.spiel_aufstellung
--    where not ist_eigener
--    group by 1, 2, 3
--   having count(*) > 1;
--   -- erwartet: null Zeilen
