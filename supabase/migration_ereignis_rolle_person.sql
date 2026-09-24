-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — Rollenkategorie und Personenname am Spielereignis
-- 24.09.2026
--
-- Aus „Unser Team" wird „Trainer Hans Meier".
--
-- Heute steht im Spielverlauf bei einer Karte gegen einen Trainer der
-- Rückfalltext `"Unser Team"` — ein Trainer hat keine Rückennummer und keine
-- Aufstellungszeile, also greift kein anderer Weg. Gemessen am 11.09.2026:
-- 5 von 42 eigenen Verwarnungen, 29 von 542 fremden Zeilen.
--
-- ── Es kostet KEINEN zusätzlichen Abruf ───────────────────────────────────
--
--   `/api/match/{id}/events` wird bei jedem Spiel geholt, und `MatchEvent`
--   trägt 28 Felder. Gemessen am 24.09.2026 gegen
--   docs/sfv/swagger_2026-08-28.json:
--
--     roleId · roleCategoryId · roleCategoryName · isPlayer
--     personId · personName
--
--   `bildeEreignis()` liest kein einziges davon. Die Angaben werden geholt,
--   bezahlt und in derselben Zeile verworfen — dieselbe Lage wie bei
--   `holeMatch`.
--
-- ⚠ `/bench` wird dafür NICHT wieder eingebaut. Es kostete einen Abruf je
--   Spiel und ist am 10.09.2026 ausgebaut worden.
--
-- ── Dieselben Spaltennamen gab es schon einmal ────────────────────────────
--
--   `rolle_kategorie_id`, `rolle_kategorie` und `rolle_id` standen bis zum
--   10.09.2026 an `spiel_aufstellung` und kamen aus `/bench`. Sie sind
--   gefallen, weil sie **keinen Leser** hatten
--   (migration_bench_ausbau.sql).
--
-- ⚠ Andere Tabelle, andere Quelle, und diesmal MIT Leser: der Spielverlauf
--   auf der Website. Wer die alte Begründung liest, darf sie nicht auf
--   diese Spalten anwenden.
--
-- ⚠ `rolle_id` kommt NICHT mit, und das ist eine Entscheidung. Gemessen in
--   docs/sfv/matchdaten_beispiel.json: sie steht je Ereignis verschieden
--   (1313161, 1731146, 1595830) und **wiederholt sich für dieselbe Person**
--   — sie kennzeichnet also die Rollen-Zuweisung eines Menschen, nicht eine
--   Kategorie. Damit wäre sie bei einem Gegner eine Personen-Handhabe, und
--   Entscheid B verbietet genau die. Die KATEGORIE ist einer von 28 festen
--   Werten des Verbands und nennt niemanden.
--
-- ── Was die drei Spalten tragen ───────────────────────────────────────────
--
--   rolle_kategorie_id   integer   BEIDE Seiten — Id des Verbands
--   rolle_kategorie      text      BEIDE Seiten — Klartext des Verbands
--   person_name          text      ⚠ NUR eigene Zeilen, erzwungen vom CHECK
--
--   Damit wird auf der Website aus „FC Fällanden" ein
--   „Trainer FC Fällanden" — ohne einen Namen. Entscheid B (10.09.2026)
--   bleibt unangetastet: von fremden Personen bleiben `gegner_club_name`
--   und die Rückennummer, **keine Namen, keine Personennummern**.
--
-- ⚠ ⚠  UND DESHALB MUSS DER CHECK IM SELBEN SCHRITT MIT. Er lautet heute
--
--     CHECK (ist_eigener OR (sfv_person_id IS NULL
--                            AND ein_sfv_person_id IS NULL))
--
--   und kennt `person_name` nicht. Ohne Erweiterung könnte ein FREMDER Name
--   in die Datenbank — und von dort auf eine öffentliche Website. Eine
--   Spalte anzulegen und den Riegel für „später" zu notieren wäre genau der
--   Fall, den dieses Projekt als teuersten führt: es schlägt nichts fehl.
--
-- ── Die Klartexte sind NICHT zeichengleich mit den Stammdaten ─────────────
--
-- ⚠ ⚠  GEMESSEN AM 24.09.2026, und es ist die wichtigste Warnung hier.
--
--   docs/sfv/sfv_stammdaten.json führt `Rollenkategorie` mit 28 Einträgen:
--
--     1 Spieler · 2 Schiedsrichter · 3 Trainer · 4 Funktionär
--     5 Auswahlspieler · 6 Kursorganisatoren · 9 Betreuer · 10 Verein
--     11 Medien · 12 Lieferant · 13/14 Sponsor · 15 Sportanlage
--     16 Verband · 17 Kommission · 18/20 Sportanlagebesitzer
--     19 Kreisverband · 21 Medien natürlich · 22 Mitglied natürlich
--     23/24 Ticketing · 25 Community Member · 26 Sporthalle
--     27 Mitglied juristisch · 28 Scout · 98/99 Diverse
--
--   Die ECHTE Antwort schreibt dort aber `"Spieler/in"`, nicht `"Spieler"`
--   (matchdaten_beispiel.json, alle vier aufgezeichneten Ereignisse).
--
-- ⚠ **Zwei Listen desselben Verbands, und sie stimmen nicht zeichengleich
--   überein.** Wer später `rolle_kategorie = 'Trainer'` vergleicht, prüft
--   eine Schreibweise und trifft `Trainer/in` nicht. Die **Id** ist der
--   Schlüssel, der Klartext ist Anzeige — dieselbe Regel wie
--   `subtyp_id` statt `subtyp` und `ist_trainer` statt einer Namensliste.
--
-- ⚠ Und die Ids sind NICHT fortlaufend: 7 und 8 fehlen, 98/99 stehen am
--   Ende. Wer eine Menge 1..28 annimmt, nimmt zwei Werte an, die es nicht
--   gibt, und verliert zwei, die es gibt.
--
-- ── Form dieser Datei ─────────────────────────────────────────────────────
--
-- ⚠ Kein `begin;`/`commit;`. Am 10.09.2026 haben zwei Blöcke „Success"
--   gemeldet und nichts bewirkt, und die Ursache ist bis heute offen
--   (CLAUDE.md: „Ein «Success», dessen Ursache man nicht kennt, ist
--   gefährlicher als ein Fehler"). Deshalb einzelne Anweisungen, jede mit
--   eigener Bestätigung.
--
-- ⚠ Kein `raise notice` — der Supabase-SQL-Editor zeigt es nicht an. Was
--   berichtet werden soll, kommt als `select` zurück.
--
-- ⚠ Wiederholbar: `add column if not exists`, `drop constraint if exists`
--   vor dem Anlegen. Ein zweiter Lauf ist sichtbar folgenlos.
--
-- ⚠ NICHT AUSGEFÜHRT. Diese Datei ist zum Einspielen von Hand.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1 · VORHER MESSEN ────────────────────────────────────────────────────
--
-- ⚠ Die Zahl gehört VOR die Änderung. Sie sagt, wie gross die Menge ist,
--   die der erweiterte CHECK ab jetzt bewacht — und ohne sie wäre „0
--   abgewiesen" hinterher von „nichts geprüft" nicht zu unterscheiden.

select count(*)                                          as zeilen_gesamt,
       count(*) filter (where ist_eigener)               as eigene,
       count(*) filter (where not ist_eigener)           as fremde,
       count(*) filter (where herkunft = 'verein')       as vereinszeilen
  from public.spiel_ereignisse;

-- Erwartung am 24.09.2026: fremde > 0 (am 11.09. waren es 542),
-- vereinszeilen = 0. Steht `fremde` auf 0, bewacht der CHECK heute eine
-- leere Menge — das ist keine Entwarnung, sondern eine Auskunft über den
-- Bestand.


-- ─── 2 · DIE DREI SPALTEN ─────────────────────────────────────────────────
--
-- ⚠ Eine `alter table`-Anweisung kann nichts zurückgeben — es gibt kein
--   `returning`. Deshalb steht die Zählprobe in Schritt 3 daneben, und
--   „Success. No rows returned" ist hier die einzig möglche Antwort und
--   keine Bestätigung.

alter table public.spiel_ereignisse
  add column if not exists rolle_kategorie_id integer,
  add column if not exists rolle_kategorie    text,
  add column if not exists person_name        text;


-- ─── 3 · ZÄHLPROBE AUF SCHRITT 2 ──────────────────────────────────────────
--
-- ⚠ Das ist die Bestätigung, die `alter table` nicht liefert. Kommen
--   weniger als drei Zeilen zurück, fehlt eine Spalte — und der Rest dieser
--   Datei liefe danach ins Leere.

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'spiel_ereignisse'
   and column_name in ('rolle_kategorie_id', 'rolle_kategorie', 'person_name')
 order by column_name;

-- Erwartung: GENAU DREI Zeilen, alle `YES` bei is_nullable.


-- ─── 4 · WÜRDE DER NEUE CHECK EINE BESTEHENDE ZEILE ABWEISEN? ─────────────
--
-- ⚠ ⚠  DIESE ABFRAGE GEHÖRT VOR DAS `add constraint`, NICHT DANACH.
--   Scheitert das `add`, nennt Postgres die Zeile nicht — die Meldung sagt
--   nur, dass eine verletzt. Wer vorher zählt, weiss hinterher, ob 0
--   „geprüft und leer" oder „nicht geprüft" heisst.

select count(*) as wuerden_abgewiesen
  from public.spiel_ereignisse
 where not ist_eigener
   and (sfv_person_id is not null
        or ein_sfv_person_id is not null
        or person_name is not null);

-- Erwartung: 0.
--
-- ⚠ Für `person_name` ist die Null hier BAUARTBEDINGT — die Spalte ist
--   gerade entstanden und überall NULL. Die Abfrage prüft also in Wahrheit
--   die zwei ALTEN Bedingungen; sie steht trotzdem in dieser Form da, weil
--   sie beim WIEDERHOLEN dieser Migration die echte Antwort gibt.
--
-- ⚠ Kommt hier eine Zahl > 0, NICHT weitermachen: dann steht im Bestand
--   etwas, das der CHECK bisher durchgelassen hat, und das ist ein eigener
--   Befund.


-- ─── 5 · DER RIEGEL ───────────────────────────────────────────────────────
--
-- ⚠ ERSETZT, nicht ergänzt. Postgres kennt kein
--   `add constraint if not exists`; drop + add macht den Block
--   wiederholbar.
--
-- ⚠ `rueckennr` und `ein_rueckennr` stehen weiterhin NICHT im Verbot —
--   sie sind seit dem 10.09.2026 frei (die Symbole an der
--   Gegneraufstellung hängen daran). Wer hier ergänzt, prüft zuerst
--   migration_gegner_nummer_verlauf.sql.
--
-- ⚠ `rolle_kategorie` und `rolle_kategorie_id` stehen ebenfalls nicht im
--   Verbot, und das ist der Gegenstand dieser Migration: eine Kategorie
--   nennt keine Person.

alter table public.spiel_ereignisse
  drop constraint if exists spiel_ereignisse_fremde_anonym_check;

alter table public.spiel_ereignisse
  add constraint spiel_ereignisse_fremde_anonym_check check (
    ist_eigener
    or (sfv_person_id is null
        and ein_sfv_person_id is null
        and person_name is null)
  );


-- ─── 6 · ZÄHLPROBE AUF SCHRITT 5 ──────────────────────────────────────────
--
-- ⚠ Dass ein `alter table` durchläuft, heisst nicht, dass der Constraint
--   den neuen Text trägt — ein `drop` ohne `add` läuft genauso durch.
--   Hier steht die Definition, die tatsächlich gilt.

select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.spiel_ereignisse'::regclass
   and conname  = 'spiel_ereignisse_fremde_anonym_check';

-- Erwartung: EINE Zeile, und in der Definition kommt `person_name` vor.
-- Fehlt es, hat Schritt 5 die alte Fassung wiederhergestellt.


-- ─── 7 · KOMMENTARE ───────────────────────────────────────────────────────

comment on column public.spiel_ereignisse.rolle_kategorie_id is
  'SFV roleCategoryId aus /events. BEIDE Seiten — eine Kategorie nennt keine Person. Einer von 28 Werten (docs/sfv/sfv_stammdaten.json, Rollenkategorie): 1 Spieler, 3 Trainer, 4 Funktionaer, 9 Betreuer, dazu Verein, Medien, Sponsor, Scout. ⚠ Die Ids sind nicht fortlaufend (7 und 8 fehlen, 98/99 am Ende). DIES ist der Schluessel, nicht der Klartext daneben.';

comment on column public.spiel_ereignisse.rolle_kategorie is
  'SFV roleCategoryName aus /events, Klartext des Verbands. BEIDE Seiten. ⚠ NUR ANZEIGE, NIE VERGLEICH: die echte Antwort schreibt "Spieler/in", die Stammdaten schreiben "Spieler" — zwei Listen desselben Verbands, nicht zeichengleich (gemessen 24.09.2026). Wer darauf filtert, prueft eine Schreibweise und trifft "Trainer/in" nicht. Dafuer ist rolle_kategorie_id da.';

comment on column public.spiel_ereignisse.person_name is
  'SFV personName aus /events. ⚠ NUR bei ist_eigener — erzwungen von spiel_ereignisse_fremde_anonym_check, nicht bloss ungelesen (Entscheid B, 10.09.2026). Die Quelle fuer Menschen, die in KEINER Aufstellungszeile stehen: Trainer und Betreuer kommen aus /players nicht mit. ⚠ Fuer einen eigenen SPIELER ist es die ZWEITE Namensquelle neben sfv_personen.name — die zugeordnete gewinnt, siehe den Kommentar in matchdaten.ts.';

comment on table public.spiel_ereignisse is
  'Spielverlauf. herkunft=sfv wird bei jedem Lauf fortgeschrieben, herkunft=verein nie. Eine Vereins-Zeile verdeckt ueber ersetzt_ereignis_id eine SFV-Zeile (Korrektur) oder steht fuer sich (nachgetragener Assist). Von fremden Spielern bleiben gegner_club_name, die Rueckennummer (seit 10.09.2026, fuer die Symbole an der Gegneraufstellung) UND die Rollenkategorie (seit 24.09.2026, fuer "Trainer FC Faellanden") — Personennummern und Namen bleiben verboten, erzwungen durch spiel_ereignisse_fremde_anonym_check.';


-- ─── 8 · GEGENPROBE, VON HAND ─────────────────────────────────────────────
--
-- ⚠ Eine Prüfung, die nie rot war, ist keine Prüfung. Diese drei
--   Anweisungen belegen, dass der Riegel greift UND dass er nicht zu weit
--   greift. Beides ist nötig: ein CHECK, der alles abweist, wäre genauso
--   falsch wie einer, der nichts abweist.
--
-- 1 · MUSS SCHEITERN — fremder Name:
--
--   insert into public.spiel_ereignisse
--          (verein_id, spiel_id, herkunft, sfv_event_id, typ_id,
--           ist_eigener, person_name)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           'sfv', -101, 3, false, 'Hans Meier');
--   -- erwartet: 23514 check constraint violated
--
-- 2 · MUSS DURCHGEHEN — fremde Kategorie OHNE Namen. Das ist der
--     Gegenstand dieser Migration:
--
--   insert into public.spiel_ereignisse
--          (verein_id, spiel_id, herkunft, sfv_event_id, typ_id,
--           ist_eigener, rueckennr, rolle_kategorie_id, rolle_kategorie)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           'sfv', -102, 3, false, null, 3, 'Trainer/in');
--   -- erwartet: geht durch
--
-- 3 · MUSS DURCHGEHEN — eigener Name:
--
--   insert into public.spiel_ereignisse
--          (verein_id, spiel_id, herkunft, sfv_event_id, typ_id,
--           ist_eigener, person_name, rolle_kategorie_id, rolle_kategorie)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           'sfv', -103, 3, true, 'Hans Meier', 3, 'Trainer/in');
--   -- erwartet: geht durch
--
-- ⚠ Danach wieder wegräumen, mit `returning`, damit die Zahl sichtbar ist:
--
--   delete from public.spiel_ereignisse
--    where sfv_event_id in (-101, -102, -103)
--   returning sfv_event_id, ist_eigener, person_name;
--   -- erwartet: ZWEI Zeilen (-102, -103). Die erste gab es nie.


-- ─── 9 · NACH DEM NÄCHSTEN MATCHDATEN-LAUF ────────────────────────────────
--
-- ⚠ ERST DEN SYNC DEPLOYEN, DANN MESSEN. Vorher schreibt der laufende Code
--   die drei Spalten nicht, und eine Null hiesse „nicht gefragt" statt
--   „nichts gefunden".
--
-- ⚠ ⚠  UND DER VERLAUF WIRD NUR ERSETZT, WENN SICH ETWAS GEÄNDERT HAT
--   (`verlaufUnveraendert`, seit 11.09.2026). Die drei Spalten stehen
--   deshalb in `VERLAUF_VERGLEICH` — sonst blieben sie bei jedem Spiel, an
--   dem der Verband sonst nichts ändert, **für immer NULL**, und nichts
--   würde es melden. Das ist die Stelle, an der diese Migration still
--   wirkungslos werden könnte.
--
-- 1 · Kommen die Kategorien an, und auf BEIDEN Seiten?
--
--   select ist_eigener,
--          rolle_kategorie_id,
--          rolle_kategorie,
--          count(*) as zeilen
--     from public.spiel_ereignisse
--    where herkunft = 'sfv'
--    group by 1, 2, 3
--    order by 1, 4 desc;
--
--   ⚠ Steht bei `ist_eigener = false` überall NULL, greift die
--   Feldzuweisung in bildeEreignis() nicht für die fremde Seite — und
--   dann bekommt der Gegner kein „Trainer FC Fällanden".
--
-- 2 · Die Frage, um die es überhaupt ging: löst sich „Unser Team" auf?
--
--   select typ_id, typ,
--          count(*)                                        as zeilen,
--          count(rueckennr)                                as mit_nummer,
--          count(person_name)                              as mit_name,
--          count(*) filter (where rueckennr is null
--                             and person_name is null)     as weiterhin_ohne
--     from public.spiel_ereignisse
--    where herkunft = 'sfv' and ist_eigener
--    group by 1, 2
--    order by 1;
--
--   ⚠ Erwartung aus der Messung vom 11.09.2026: bei typ_id = 3
--   (Verwarnung) standen 5 von 42 ohne Nummer. `mit_name` sollte diese
--   fünf jetzt tragen, und `weiterhin_ohne` auf 0 stehen.
--
--   ⚠ Bleibt `weiterhin_ohne` > 0, liefert der Verband für diese Zeilen
--   auch keinen `personName` — das ist eine Datenlage und kein Ausfall,
--   und es gehört benannt statt stillschweigend leer gelassen.
--
-- 3 · ⚠ Und die Gegenprobe, die keiner der beiden oberen liefert:
--     trägt eine FREMDE Zeile einen Namen? Sie darf nicht.
--
--   select count(*) as verboten
--     from public.spiel_ereignisse
--    where not ist_eigener and person_name is not null;
--
--   -- erwartet: 0. Und wäre es nicht 0, hätte der CHECK versagt — dann
--   -- ist die Definition aus Schritt 6 gegenzulesen.
