-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN ALS KENNZEICHEN, NICHT ALS ROLLENWERT
-- 05.08.2026
--
-- ANLASS
-- `benutzer.role` ist ein BERECHNETER Wert: ableitRolle() bestimmt ihn aus
-- den Kader-Rollen, ersatzweise aus mitgliedtypen.standard_rolle, dann aus
-- den Funktionen. ableitUndSaveRolle() schreibt ihn bei jeder Kader-
-- Zuweisung und jeder Team-/Funktionsaenderung neu.
--
-- `administrator` kommt in dieser Ableitung nicht vor. Ein Admin, der auch
-- Juniorentrainer ist, verliert deshalb beim naechsten Kader-Eintrag
-- stillschweigend seine Adminrolle — sie wird durch 'trainer' ersetzt.
--
-- LOESUNG
-- Der Adminstatus wird ein eigenes Kennzeichen, das die Ableitung nicht
-- anfassen darf. `role` bleibt der berechnete Wert und wird kuenftig so
-- bestimmt:
--
--     ist_admin = true  ->  role = 'administrator'
--     sonst             ->  role = ableitRolle(...)
--
-- Damit funktionieren alle bestehenden Vergleiche auf role='administrator'
-- unveraendert weiter (123 Stellen im Code) — es aendert sich nur, WORAUS
-- der Wert entsteht. Und beides kann nebeneinander bestehen: Admin UND
-- Trainer, ueber benutzer.rollen[].
--
-- NICHT TEIL DIESES SCHRITTS
-- 'administration' bleibt vorerst ein Rollenwert. Es durch „Funktionaer +
-- Gruppe Geschaeftsstelle" zu ersetzen heisst Rechte umziehen, nicht nur
-- eine Spalte anlegen — eigener Schritt.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── A: Spalte ─────────────────────────────────────────────────────────────

alter table public.benutzer
  add column if not exists ist_admin boolean not null default false;

comment on column public.benutzer.ist_admin is
  'Systemzugang (Portalverwaltung, Rechte, Vereinsdaten). Wird NIE von '
  'ableitUndSaveRolle() ueberschrieben — anders als role, das ein '
  'berechneter Wert ist.';

-- ─── B: Backfill aus dem heutigen Stand ────────────────────────────────────
-- Wer jetzt administrator ist, bleibt es. rollen[] wird mitgezogen, damit
-- der Rollenwechsler den Admin weiterhin anbietet.

update public.benutzer
   set ist_admin = true
 where role = 'administrator';

update public.benutzer
   set rollen = array_append(coalesce(rollen, '{}'), 'administrator')
 where ist_admin
   and not ('administrator' = any(coalesce(rollen, '{}')));

create index if not exists benutzer_ist_admin_idx
  on public.benutzer (verein_id) where ist_admin;

-- ─── C: Die Datenbankfunktionen auf das Kennzeichen umstellen ──────────────
-- Beide lesen bisher role. Ab jetzt zaehlt das Kennzeichen; 'administration'
-- bleibt daneben bestehen, bis der zweite Schritt es abloest.

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(ist_admin OR role = 'administration', false)
  FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    (select ist_admin or role = 'administration' from benutzer where id = auth.uid()),
    false
  )
$$;

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────

-- V1: Wer ist Admin? Muss dieselben Personen zeigen wie vorher role='administrator'.
select b.id, b.email, b.name, b.role, b.ist_admin, b.rollen
  from public.benutzer b
 where b.ist_admin
 order by b.email;

-- V2: Sicherheitsnetz — jeder Verein braucht mindestens einen Admin.
--     Liefert diese Abfrage Zeilen, kommt dort niemand mehr in die
--     Portalverwaltung.
select v.id, v.name, count(b.id) filter (where b.ist_admin) as admins
  from public.vereine v
  left join public.benutzer b on b.verein_id = v.id
 group by v.id, v.name
having count(b.id) filter (where b.ist_admin) = 0;

-- V3: Die Funktionen antworten wie erwartet (aus Sicht des angemeldeten
--     Benutzers — im SQL-Editor ist das der Dienstschluessel, dort also
--     erwartungsgemaess false/null).
select public.is_admin() as is_admin, public.is_admin_or_above() as is_admin_or_above;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Code liefern (roleUtils, useDbUser, Benutzerverwaltung), dann:
--     npm run typecheck && npm run build && npm test
--
--   Schema neu dumpen — Strukturaenderung:
--     npx supabase db dump --linked -f supabase/schema.sql
--
-- SPAETER, WENN 'administration' abgeloest ist
--   Dann koennen beide Funktionen auf `select ist_admin ...` verkuerzt und
--   der Rollenwert 'administration' aus portal_rollen entfernt werden.
-- ═══════════════════════════════════════════════════════════════════════════
