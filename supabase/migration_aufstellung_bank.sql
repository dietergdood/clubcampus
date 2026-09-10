-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — die Ersatzbank in spiel_aufstellung
-- 10.09.2026
--
-- ⚠ ANLASS, und er zieht sich durch den ganzen Tag: „Enea Scot ersetzt
--   durch Nr. 12". 207 Eingewechselte ohne Namen — gemessen zweimal
--   unabhaengig (Vorschau des Exports und SQL gegen spiel_aufstellung,
--   beide 207).
--
--   Der Grund ist nicht die Namensaufloesung, sondern die QUELLE:
--   `/api/match/{id}/players` liefert nur die STARTELF. Wer eingewechselt
--   wird, steht dort nicht.
--
-- ⚠ /bench IST BELEGT, an der Leitung gemessen (Didi, 10.09.2026):
--     Spiel 4368856, Accept: application/json, HTTP 200, 6 Objekte
--     Schluessel u.a.: personId, personName, roleId, roleCategoryId,
--                      roleCategoryName, teamId, clubNumber, isHomeTeam
--
--   Der erste Anlauf hatte 406 gemeldet — die Spielwahl war falsch (das
--   LETZTE Spiel des Plans, also eines in der Zukunft; ein nicht
--   ausgetragenes Spiel hat keine Bank). Der Endpunkt war nie zu.
--
-- ⚠ ⚠  /bench IST NICHT „DIE ERSATZBANK", SONDERN „ALLES, WAS NICHT AUF
--       DEM FELD STAND."
--
--   Die oeffentliche FVRZ-Seite zeigt zu Spiel 4393132 fuenf
--   Ersatzspieler, ZWEI TRAINER und einen Abwesenden — und /bench gab zu
--   4368856 sechs Objekte zurueck. Die Trennung steht in den Stammdaten
--   (sfv_stammdaten.json → Rollenkategorie):
--
--     1 Spieler · 2 Schiedsrichter · 3 Trainer · 4 Funktionaer
--     9 Betreuer  (und zwanzig weitere)
--
--   **Wer die Bank ungefiltert anzeigt, setzt den Trainer auf die
--   Ersatzbank.** Die Anzeige nimmt nur Kategorie 1.
--
-- ⚠ WARUM DIE KATEGORIE ALS SPALTE UND NICHT ALS FILTER BEIM SCHREIBEN:
--   damit eine neue oder unerwartete Kategorie AUFFAELLT, statt still
--   durch den Filter zu fallen. Gefiltert wird bei der Anzeige, gemessen
--   wird an der Spalte. Dieselbe Regel wie ueberall heute: erst holen und
--   ansehen, dann die Anzeige darauf bauen.
--
-- ⚠ UND NICHT ABLEITEN: „von_minute > 0 heisst Ersatz" waere plausibel
--   und falsch — ein Starter, der in der 1. Minute verletzt herausmuss,
--   haette auch eine Minute. Die Rolle steht da; sie wird gelesen.
--
-- ── Was NICHT passiert ────────────────────────────────────────────────────
--   Entscheid A (10.09.2026): die Gegnerseite bleibt anonym.
--   `spiel_ereignisse_fremde_anonym_check` bleibt, `istEigener` bleibt in
--   bildeAufstellung und bildeEreignis, und auch die Bank wird nur fuer
--   EIGENE Spieler geschrieben. Von Gegnern kommt keine Personenzeile.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiel_aufstellung
  add column if not exists name               text,
  add column if not exists ist_bank           boolean not null default false,
  add column if not exists rolle_id           integer,
  add column if not exists rolle_kategorie_id integer,
  add column if not exists rolle_kategorie    text;

comment on column public.spiel_aufstellung.name is
  'Klarname aus der SFV-Antwort. Aus /players als firstname + name, aus /bench als personName (der Verband liefert dort nur die zusammengesetzte Form). ⚠ Fuer die Anzeige gewinnt eine Zuordnung ueber sfv_zuordnung; diese Spalte ist der Rueckfall.';

comment on column public.spiel_aufstellung.ist_bank is
  'Kommt die Zeile aus /api/match/{id}/bench statt aus /players? ⚠ /players liefert NUR die Startelf — gemessen 10.09.2026: 207 von 207 Eingewechselten fehlten. Die Bank ist ein eigener Abruf, keine Ableitung aus von_minute.';

comment on column public.spiel_aufstellung.rolle_kategorie_id is
  'SFV roleCategoryId. 1 = Spieler, 3 = Trainer, 4 = Funktionaer, 9 = Betreuer (sfv_stammdaten.json → Rollenkategorie). ⚠ /bench liefert NICHT nur Ersatzspieler: die FVRZ-Seite zeigt zu Spiel 4393132 fuenf Ersatzspieler, zwei Trainer und einen Abwesenden. Die Anzeige nimmt nur 1.';

comment on column public.spiel_aufstellung.rolle_kategorie is
  'SFV roleCategoryName im Klartext — mitgeschrieben, damit eine unerwartete Kategorie auffaellt, statt still durch den Filter zu fallen.';

comment on column public.spiel_aufstellung.rolle_id is
  'SFV roleId, die feinere Rolle innerhalb der Kategorie. ⚠ Ungemessen, was sie enthaelt — mitgeschrieben, von nichts gelesen. Wer sie liest, misst sie vorher.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Nach dem naechsten Matchdaten-Lauf:
--
--   select ist_bank,
--          rolle_kategorie,
--          count(*)    as zeilen,
--          count(name) as mit_namen
--     from public.spiel_aufstellung
--    group by 1, 2
--    order by 1, 2;
--
-- ⚠ Erwartung: bei `ist_bank = true` mehrere Kategorien, darunter Trainer.
--   Steht dort nur „Spieler", liefert der Verband die Trainer doch nicht
--   mit — und dann ist die Filterung bei der Anzeige unnoetig, aber nicht
--   falsch.
--
-- ⚠ UND DIE FRAGE, UM DIE ES VON ANFANG AN GING:
--
--   select count(*) as ersatz_ohne_namen
--     from public.spiel_ereignisse e
--    where e.typ_id = 2
--      and e.ist_eigener
--      and e.ein_sfv_person_id is not null
--      and not exists (select 1 from public.sfv_personen p
--                       where p.verein_id = e.verein_id
--                         and p.sfv_person_id = e.ein_sfv_person_id);
--
--   Vorher: 207. Erwartung nach ein bis zwei Laeufen: deutlich weniger.
--   Bleibt sie bei 207, schreibt der Bank-Durchgang nicht nach
--   sfv_personen — und DAS waere dann der Befund.
