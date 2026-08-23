-- ClubCampus — supabase/migration_offene_punkte.sql
-- 23.08.2026  ·  Schritt 1 von „ein Mensch, ein Ort"
--
-- Das Archiv ist kein Ort, sondern eine MARKIERUNG: „bei dieser Person ist
-- noch etwas offen" — Beitrag, Rechnung, Material, Tenue.
--
-- Heute steht ein Ausgetretener in ZWEI Listen: im Archiv (weil die
-- Mitgliedschaftszeile inaktiv ist) und bei den Supportern (weil er die
-- Austritts-Art traegt). Derselbe Mensch, zwei Tabs, und man sieht nicht, dass
-- es derselbe ist. Kuenftig steht er bei den Supportern, und der Archiv-Tab
-- wird eine gefilterte Ansicht darauf.
--
--
-- ⚠ EIN FELD, NICHT ZWEI. Kein `boolean` mit einer Notiz daneben.
--
--   Zwei Spalten fuer eine Aussage sind heute DREIMAL als Defekt
--   aufgeschlagen: `hat_portal_zugang` gegen den Join, `api_verbindungen.active`
--   gegen die Edge Function, `zaehlt_als_mitgliedschaft` ohne Leser. Ein `true`
--   mit leerer Notiz und eine Notiz mit `false` sind beide moeglich, beide
--   bedeutungslos — und nichts meldet es.
--
--   Hier kann das nicht entstehen: NICHT LEER IST die Markierung.
--
--
-- ⚠ AN DER PERSON, NICHT AN DER MITGLIEDSCHAFT.
--
--   Der Archiv-Tab wird eine gefilterte Ansicht auf die Supporter-Liste, und
--   die liest `personen`. Laege die Markierung an `mitglieder`, muesste die
--   Liste die INAKTIVE Mitgliedschaft dazujoinen — und bei zwei
--   Mitgliedschaften „die richtige" waehlen, eine Regel, die falsch sein kann.
--
--   ⚠ DER PREIS, und er gehoert benannt: ein `CHECK` „nur bei inaktiven
--   Zeilen" ist damit unmoeglich, weil `personen` kein `aktiv` kennt. Wer
--   wieder eintritt, BEHAELT die Markierung, bis jemand sie entfernt. Das ist
--   Absicht: ein offener Beitrag verschwindet nicht dadurch, dass jemand
--   wieder eintritt.
--
--
-- ⚠ VON HAND GESETZT, VON HAND ENTFERNT — NIE ABGELEITET.
--
--   Wuerde sie aus der inaktiven Mitgliedschaft abgeleitet, waere wieder jeder
--   Ausgetretene automatisch „offen", und das ist genau der heutige Zustand.
--   Es gibt deshalb keinen Trigger und keine Sicht, die sie fuellt.
--
--
-- WER SIE LIEST (Regel aus CLAUDE.md — wer eine Spalte anlegt, nennt die
-- Stelle, die sie liest):
--
--   1. `InfoTab` → Karte „Offene Punkte", nur fuer die Verwaltung sichtbar.
--      Setzen verlangt einen Text; Entfernen ist eine eigene Handlung.
--   2. Der Archiv-Tab (Schritt 2): `offene_punkte is not null` IST die
--      Ansicht, und der Text steht als Spalte darin.
--
--   ⚠ Punkt 2 gibt es beim Einspielen dieser Migration noch nicht. Bis dahin
--   ist die Spalte gesetzt und nur im Profil sichtbar — ein offener Punkt mit
--   Datum, keine stille Luecke.

begin;

do $mig$
declare
  v_vorher  int;
  v_nachher int;
begin
  select count(*) into v_vorher
    from information_schema.columns
   where table_schema = 'public' and table_name = 'personen';

  alter table public.personen
    add column if not exists offene_punkte text;

  /* Leerstring ist keine Markierung — sonst gaebe es zwei Arten von „nichts"
     und die Ansicht muesste beide kennen. */
  alter table public.personen
    drop constraint if exists personen_offene_punkte_nicht_leer;
  alter table public.personen
    add constraint personen_offene_punkte_nicht_leer
    check (offene_punkte is null or btrim(offene_punkte) <> '');

  comment on column public.personen.offene_punkte is
    'Von Hand gesetzte Markierung: was bei dieser Person noch offen ist '
    '(Beitrag, Rechnung, Material). NICHT LEER = markiert. Nie abgeleitet; '
    'der Archiv-Tab ist die gefilterte Ansicht darauf.';

  select count(*) into v_nachher
    from information_schema.columns
   where table_schema = 'public' and table_name = 'personen';

  if v_nachher <> v_vorher + 1 then
    raise exception 'Spalten: erwartet %, gezaehlt %', v_vorher + 1, v_nachher;
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'personen_offene_punkte_nicht_leer') then
    raise exception 'Der CHECK fehlt.';
  end if;

  raise notice 'OK — personen.offene_punkte angelegt (% -> % Spalten)', v_vorher, v_nachher;
end
$mig$;

commit;

-- ── Nachher zum Nachsehen ────────────────────────────────────────────────
-- select count(*) filter (where offene_punkte is not null) as markiert,
--        count(*) as personen from public.personen;
--
-- Erwartet direkt nach der Migration: 0 markiert.
--
-- ⚠ Der Leerstring muss abgewiesen werden:
--   update public.personen set offene_punkte = '   ' where id = '…';
--   → 23514 personen_offene_punkte_nicht_leer
