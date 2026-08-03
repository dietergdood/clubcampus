-- ═══════════════════════════════════════════════════════════════
-- ClubCampus — Trigger auf auth.users
--
-- Warum eine eigene Datei:
-- `supabase db dump` und `pg_dump --schema=public` erfassen beide nur das
-- Schema `public`. Diese zwei Trigger liegen auf `auth.users` und fehlen
-- deshalb in `supabase/schema.sql` — dort stehen nur die aufgerufenen
-- Funktionen, ohne jeden Aufrufer. Wer das Schema allein aus schema.sql
-- nachbaut, bekommt ein Portal, in dem sich niemand registrieren kann:
-- es entsteht keine `benutzer`-Zeile und keine Verknüpfung zum Mitglied.
--
-- Die Funktionen selbst (public.handle_new_user, public.handle_user_login)
-- stehen in supabase/schema.sql. Diese Datei nach schema.sql einspielen.
--
-- Stand: 04.08.2026, ausgelesen aus pg_trigger der verlinkten Datenbank.
-- ═══════════════════════════════════════════════════════════════

-- Registrierung: legt die benutzer-Zeile an, sucht über die E-Mail das
-- passende Mitglied bzw. den Elternkontakt und setzt mitglied_id,
-- vorname/nachname/telefon sowie mitglieder.hat_portal_zugang.
drop trigger if exists on_auth_user_created on auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Anmeldung: schreibt benutzer.last_sign_in_at fort.
drop trigger if exists on_auth_user_login on auth.users;
CREATE TRIGGER on_auth_user_login AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_user_login();

-- Hinweis: beide Definitionen stehen hier wortgetreu so, wie sie in der
-- Datenbank liegen — die Funktionsnamen sind unqualifiziert und werden über
-- den search_path aufgelöst. Beim Nachbauen muss `public` im search_path
-- liegen (Standard), sonst schlägt das Anlegen fehl.

-- Gegenprobe nach dem Einspielen:
--   select t.tgname, pg_get_triggerdef(t.oid)
--     from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--     join pg_namespace n on n.oid = c.relnamespace
--    where not t.tgisinternal and n.nspname = 'auth';
