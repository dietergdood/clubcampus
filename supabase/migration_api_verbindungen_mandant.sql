-- ═══════════════════════════════════════════════════════════════════════════
-- MANDANTENFAEHIGKEIT — api_verbindungen.key nachgezogen
-- 14.08.2026
--
-- Nachtrag zu migration_mandant_schluessel.sql vom 05.08.2026. Jene Migration
-- hat dreizehn global eindeutige Schluessel auf (verein_id, …) umgestellt und
-- api_verbindungen.key dabei bewusst ausgenommen, mit der Begruendung:
--
--     "api_verbindungen.key   API-Schluessel sollen global eindeutig sein"
--
-- Die Begruendung trifft auf diese Spalte nicht zu. api_verbindungen.key ist
-- kein Geheimnis, sondern der Name des Anschlusses: 'fairgate', 'football_ch',
-- 'fvrz', 'clubdesk', 'sfa'. Derselbe Wert waehlt in modules/portal/ApiTab.tsx
-- den Beschreibungstext aus API_INFOS. Ein Geheimnis steht in dieser Tabelle
-- ueberhaupt nicht — die Spalten sind key, label, icon, active, konfiguriert,
-- api_url und die sync_*-Felder. Der Hinweis im ApiTab sagt es selbst:
-- "API-Keys werden aus Sicherheitsgruenden nicht in der Datenbank
-- gespeichert."
--
-- FOLGE DES IST-ZUSTANDS
-- Der erste Verein, der einen Anschluss anlegt, nimmt ihn allen anderen weg.
-- Sobald FCH die Zeile 'football_ch' hat, ist derselbe Eintrag fuer Verein
-- zwei ein Constraint-Fehler — und zwar einer, der beim Einrichten auftritt,
-- nicht beim Entwickeln. Dasselbe gilt fuer 'fairgate', das jeder Verein
-- braucht.
--
-- UNGEFAEHRLICH. Ein Schluessel wird durch das Hinzufuegen von verein_id nur
-- LOCKERER, nie strenger. Bestehende Zeilen koennen dadurch nicht kollidieren.
--
-- KEIN CODE AENDERT SICH MIT. Anders als am 05.08.2026, wo fuenf onConflict-
-- Zeilen nachgezogen werden mussten: auf api_verbindungen gibt es keinen
-- upsert. Geprueft ueber alle onConflict-Aufrufe in src/ — sie betreffen
-- eltern_kinder, kader, rolle_pflichtfelder, mitgliedtyp_pflichtfelder,
-- modul_rechte, module_config, feldsichtbarkeit, team_module und
-- nachrichten_gelesen. Auf api_verbindungen laeuft nur select().
--
-- REIHENFOLGE. Diese Migration laeuft VOR migration_sfv_spielplan.sql. Deren
-- Block D legt die Zeile 'football_ch' mit
-- "on conflict (verein_id, key)" an — ohne den Schluessel hier scheitert das.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.api_verbindungen
  drop constraint if exists api_verbindungen_key_key,
  add  constraint api_verbindungen_verein_key_key unique (verein_id, key);

comment on column public.api_verbindungen.key is
  'Name des Anschlusses (fairgate, football_ch, fvrz, clubdesk, sfa), kein Geheimnis. Eindeutig pro Verein, nicht global — Geheimnisse liegen in den Secrets der Edge Function.';

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- 1) Muss genau eine Zeile liefern: UNIQUE (verein_id, key).

select c.conname                   as constraint_name,
       pg_get_constraintdef(c.oid) as definition
  from pg_constraint c
 where c.conrelid = 'public.api_verbindungen'::regclass
   and c.contype  = 'u';

-- 2) Der alte globale Schluessel muss weg sein: muss 0 Zeilen liefern.

select conname from pg_constraint where conname = 'api_verbindungen_key_key';


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Nur moeglich, solange nicht zwei Vereine denselben Anschluss haben — sonst
-- laesst sich der globale Schluessel nicht mehr anlegen. Genau das ist der
-- Grund, warum dieser Block nicht in der SFV-Migration steht: wird jene je
-- zurueckgenommen, soll nicht nebenbei ein Mandantenfehler zurueckkehren.
--
-- begin;
--   alter table public.api_verbindungen
--     drop constraint if exists api_verbindungen_verein_key_key,
--     add  constraint api_verbindungen_key_key unique (key);
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Strukturaenderung — Dump UND Typen nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   Zaehlprobe: ADD CONSTRAINT netto +/- 0 (einer weg, einer neu),
--   CREATE TABLE / POLICY / INDEX unveraendert.
--
--   CLAUDE.md ist mitkorrigiert — der Satz, api_verbindungen_key_key sei
--   "absichtlich global (ein API-Schluessel ist ein Geheimnis)", stand unter
--   "Offene Punkte aus Session 23" und war die Begruendung, die hier widerlegt
--   wird.
-- ═══════════════════════════════════════════════════════════════════════════
