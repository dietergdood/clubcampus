-- ═══════════════════════════════════════════════════════════════════════════
-- MANDANTENFAEHIGKEIT — globale Schluessel auf verein_id umstellen
-- 05.08.2026
--
-- 13 Tabellen haben einen Schluessel, der GLOBAL eindeutig ist statt pro
-- Verein. Solange nur FC Herrliberg im System steht, faellt das nicht auf.
-- Beim zweiten Verein schon:
--
--   trainingsplaetze   kein zweiter "Platz A"
--   kader_rollen       keine eigene Kaderrolle
--   modul_rechte       die Rechte-Matrix waere GETEILT — Verein B aendert
--                      ein Haekchen, Verein A bekommt es mit
--   module_config      dasselbe fuer Modul an/aus
--   *_pflichtfelder    dasselbe fuer die Pflichtfeld-Matrizen
--
-- UNGEFAEHRLICH: Ein Schluessel wird durch das Hinzufuegen von verein_id nur
-- LOCKERER, nie strenger. Bestehende Zeilen koennen dadurch nicht kollidieren.
--
-- ACHTUNG — CODE MUSS MIT. Fuenf upsert()-Aufrufe nennen den Schluessel
-- explizit (onConflict). Ohne die Codeaenderung schlaegt danach jedes
-- Speichern fehl:
--   MitgliederKonfigTab.tsx      rolle,feld   /  mitgliedtyp,feld
--   PortalverwaltungModul.tsx    feld_key,role  /  modul
--   ModuleRechteTab.tsx          modul,rolle
--
-- NICHT umgestellt, absichtlich:
--   api_verbindungen.key          API-Schluessel sollen global eindeutig sein
--   mitglieder.fairgate_id        Fremdsystem-ID, eigene Frage
--   alles mit mitglied_id/team_id/gruppe_id als erster Spalte — diese sind
--     ueber ihren Fremdschluessel bereits mandantengebunden
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── UNIQUE-Constraints ────────────────────────────────────────────────────

alter table public.mitgliedtypen
  drop constraint if exists mitgliedtypen_name_key,
  add  constraint mitgliedtypen_verein_name_key unique (verein_id, name);

alter table public.mitgliedtyp_pflichtfelder
  drop constraint if exists mitgliedtyp_pflichtfelder_mitgliedtyp_feld_key,
  add  constraint mitgliedtyp_pflichtfelder_verein_key unique (verein_id, mitgliedtyp, feld);

alter table public.rolle_pflichtfelder
  drop constraint if exists rolle_pflichtfelder_rolle_feld_key,
  add  constraint rolle_pflichtfelder_verein_key unique (verein_id, rolle, feld);

alter table public.kader_rollen
  drop constraint if exists kader_rollen_name_key,
  add  constraint kader_rollen_verein_name_key unique (verein_id, name);

alter table public.portal_rollen
  drop constraint if exists portal_rollen_name_key,
  add  constraint portal_rollen_verein_name_key unique (verein_id, name);

alter table public.portal_gruppen
  drop constraint if exists portal_gruppen_name_key,
  add  constraint portal_gruppen_verein_name_key unique (verein_id, name);

alter table public.rollen
  drop constraint if exists rollen_name_key,
  add  constraint rollen_verein_name_key unique (verein_id, name);

alter table public.trainingsplaetze
  drop constraint if exists trainingsplaetze_name_key,
  add  constraint trainingsplaetze_verein_name_key unique (verein_id, name);

alter table public.feldsichtbarkeit
  drop constraint if exists feldsichtbarkeit_feld_key_role_key,
  add  constraint feldsichtbarkeit_verein_key unique (verein_id, feld_key, role);

alter table public.module
  drop constraint if exists module_key_key,
  add  constraint module_verein_key_key unique (verein_id, key);

-- ─── Primaerschluessel ─────────────────────────────────────────────────────
-- Keine Fremdschluessel zeigen auf diese drei Tabellen (geprueft), der
-- Austausch ist deshalb gefahrlos. verein_id ist ueberall NOT NULL.

alter table public.modul_rechte
  drop constraint if exists modul_rechte_pkey,
  add  constraint modul_rechte_pkey primary key (verein_id, modul, rolle);

alter table public.module_config
  drop constraint if exists module_config_pkey,
  add  constraint module_config_pkey primary key (verein_id, modul);

alter table public.portal_einstellungen
  drop constraint if exists portal_einstellungen_pkey,
  add  constraint portal_einstellungen_pkey primary key (verein_id, schluessel);

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Muss 13 Zeilen liefern, jede mit verein_id an erster Stelle.

select c.conrelid::regclass::text as tabelle,
       c.conname                  as constraint_name,
       case c.contype when 'p' then 'PRIMARY KEY' else 'UNIQUE' end as art,
       pg_get_constraintdef(c.oid) as definition
  from pg_constraint c
 where c.conrelid::regclass::text in (
         'mitgliedtypen','mitgliedtyp_pflichtfelder','rolle_pflichtfelder',
         'kader_rollen','portal_rollen','portal_gruppen','rollen',
         'trainingsplaetze','feldsichtbarkeit','module',
         'modul_rechte','module_config','portal_einstellungen')
   and c.contype in ('p','u')
 order by tabelle;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Code liefern (die fuenf onConflict-Zeilen), dann:
--     npm run typecheck && npm run build && npm test
--
--   Schema neu dumpen — das ist eine Strukturaenderung:
--     npx supabase db dump --linked -f supabase/schema.sql
--
-- FOLGE FUER ETAPPE 6
--   Der dort geplante Fremdschluessel mitglieder.mitgliedtyp ->
--   mitgliedtypen.name braucht jetzt BEIDE Spalten:
--     foreign key (verein_id, mitgliedtyp) references mitgliedtypen (verein_id, name)
--   mitglieder.verein_id existiert bereits.
-- ═══════════════════════════════════════════════════════════════════════════
