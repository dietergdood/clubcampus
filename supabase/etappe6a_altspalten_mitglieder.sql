-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 6, TEIL A — die Personenfelder aus `mitglieder` streichen
-- 05.08.2026
--
-- Damit endet der Personen-Umbau. Seit Etappe 2b liest niemand mehr diese
-- Spalten: `flacheZeile()` ueberschreibt jedes Feld aus PERSON_FELDER mit
-- dem Wert der Person. Die Altspalten stehen seither nur noch da und
-- veralten still — wer im Portal einen Namen aendert, aendert die Person.
--
-- ⚠ KEIN ROLLBACK. Vorher einen Snapshot ziehen (Database → Backups).
--
-- ─── WAS NICHT GESTRICHEN WIRD ─────────────────────────────────────────────
--
--   rolle               BLEIBT. Entschieden am 05.08.2026: Die Spalte
--                       „Portalrolle" sagt, welche Berechtigung jemand hat;
--                       „Portal-Zugang" daneben sagt, ob er sie nutzen kann.
--                       Zwei Haelften einer Aussage, keine Doppelung. Man
--                       sieht damit, dass ein Trainer noch kein Konto hat und
--                       eine Einladung lohnt. Ausserdem haengen Gruppierung,
--                       Filter und die gespeicherten Ansichten in
--                       `mitglieder_ansichten` daran.
--
--   position,           Sollen nach `kader` — ein Spieler kann in zwei Teams
--   rueckennr           zwei Nummern haben. Eigener Schritt (Teil B): 146
--                       Fundstellen im Code plus Datenmigration.
--
--   datenstatus,        Ungeprueft. `hat_portal_zugang` wird an 13 Stellen
--   notizen,            geschrieben, unter anderem vom Registrierungs-
--   fairgate_sync_at,   Trigger. Eigener Schritt (Teil C).
--   hat_portal_zugang
--
-- REIHENFOLGE: A → B → C. Der Code muss VOR Block C eingespielt sein.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Sperrabfragen                                                 ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- A1: Jede Mitgliedschaft braucht eine Person. MUSS 0 sein — sonst verliert
--     diese Zeile ihre Daten ersatzlos.
select count(*) as ohne_person from public.mitglieder where person_id is null;

-- A2: Weicht irgendwo die Altspalte von der Person ab? Das ist NORMAL und
--     erwartet — die Person ist seit Etappe 2b die Wahrheit, die Altspalte
--     blieb auf dem Stand von damals stehen. Die Abfrage dient nur dazu, die
--     Zahl einmal gesehen zu haben, bevor die Spalten fallen.
select count(*) filter (where coalesce(m.vorname,'')  is distinct from coalesce(p.vorname,''))  as vorname,
       count(*) filter (where coalesce(m.nachname,'') is distinct from coalesce(p.nachname,'')) as nachname,
       count(*) filter (where coalesce(m.email,'')    is distinct from coalesce(p.email,''))    as email,
       count(*) filter (where coalesce(m.telefon,'')  is distinct from coalesce(p.telefon,''))  as telefon,
       count(*) as gesamt
  from public.mitglieder m
  join public.personen p on p.id = m.person_id;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Sicherheitskopie                       >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Eine Tabelle mit den Altwerten, bevor sie verschwinden. Sie kostet       ║
-- ║ nichts und ist die einzige Spur zurueck, falls sich herausstellt, dass   ║
-- ║ irgendwo doch etwas nur in der Altspalte stand.                         ║
-- ║ Loeschen, wenn ein paar Wochen nichts aufgefallen ist.                  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

create table if not exists public._etappe6_altspalten_mitglieder as
select id, person_id,
       vorname, nachname, email, telefon,
       strasse, plz, ort, kanton, land,
       geburtsdatum, geschlecht,
       nationalitaet, nationalitaet2, heimatort,
       ahv_nr, foto_url, funktionen, profil_geprueft_at,
       now() as gesichert_am
  from public.mitglieder;

commit;

select count(*) as gesicherte_zeilen from public._etappe6_altspalten_mitglieder;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Die Spalten streichen                  >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ ERST ausfuehren, wenn der Code eingespielt ist. Vier Stellen nannten     ║
-- ║ diese Spalten noch und wurden am 05.08.2026 umgestellt:                 ║
-- ║   useAppData.js      .order("nachname").order("vorname") — entfernt,    ║
-- ║                      sortiert wird ohnehin im Browser                   ║
-- ║   KaderModul.tsx     select ohne die Altspalten                         ║
-- ║   memberService.ts   fetchArchiv, dazu ein expliziter Rueckgabetyp      ║
-- ║   elternService.ts   macheZumSupporter schrieb sie vorsorglich mit      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

alter table public.mitglieder
  drop column vorname,
  drop column nachname,
  drop column email,
  drop column telefon,
  drop column strasse,
  drop column plz,
  drop column ort,
  drop column kanton,
  drop column land,
  drop column geburtsdatum,
  drop column geschlecht,
  drop column nationalitaet,
  drop column nationalitaet2,
  drop column heimatort,
  drop column ahv_nr,
  drop column foto_url,
  drop column funktionen,
  drop column profil_geprueft_at;

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Verifikation                                                  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- D1: Keine der 18 Spalten darf noch da sein.
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mitglieder'
   and column_name in ('vorname','nachname','email','telefon','strasse','plz','ort',
                       'kanton','land','geburtsdatum','geschlecht','nationalitaet',
                       'nationalitaet2','heimatort','ahv_nr','foto_url','funktionen',
                       'profil_geprueft_at');

-- D2: Was bleibt in `mitglieder` uebrig?
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mitglieder'
 order by ordinal_position;

-- D3: Der Join liefert weiterhin vollstaendige Zeilen.
select m.id, m.mitgliedtyp, m.rolle, p.vorname, p.nachname, p.email
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
 where m.aktiv
 order by p.nachname
 limit 5;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   npm run typecheck && npm run build && npm test   -> 362 gruen
--   npx supabase db dump --linked -f supabase/schema.sql
--   npx supabase gen types typescript --linked > src/database.types.ts
--
--   Die Typen sind diesmal PFLICHT: database.types.ts kennt die 18 Spalten
--   noch, und `flacheZeile()` wuerde sie weiterhin als vorhanden annehmen.
--
--   Wenn ein paar Wochen nichts aufgefallen ist:
--     drop table public._etappe6_altspalten_mitglieder;
-- ═══════════════════════════════════════════════════════════════════════════
