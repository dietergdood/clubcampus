-- ═══════════════════════════════════════════════════════════════════════════
-- SICHT portal_zugang — Regression aus Etappe 3 beheben
-- 05.08.2026
--
-- ANLASS
-- Die Elternliste zeigt eine Spalte „Portal": hat dieser Elternteil einen
-- Zugang oder nicht. Die Angabe kam bis Etappe 3 aus
-- `elternkontakte.benutzer_id`, und auf `elternkontakte` liegt nur eine
-- verein_id-Policy — jeder Eingeloggte des Vereins konnte sie lesen.
--
-- Seit Etappe 3 kommt sie aus `benutzer.person_id`. Dort gelten
-- benutzer_select_admin und benutzer_select_self: ein Trainer bekommt beim
-- Join eine leere Menge zurueck. Die Liste zeigt ihm fuer ALLE „Kein Zugang"
-- — ohne Fehler, ohne Meldung. Genau die stille Sorte Defekt.
--
-- LOESUNG
-- Eine Sicht mit GENAU ZWEI Spalten, die mit den Rechten ihres Besitzers
-- laeuft und damit an der RLS von `benutzer` vorbeikommt.
--
-- ⚠ security_invoker = false IST HIER DER ZWECK, NICHT EIN VERSEHEN.
-- Eine Sicht mit security_invoker = true wuerde die RLS von `benutzer`
-- anwenden und dem Trainer wieder nichts liefern. Sonst gilt fuer Sichten
-- in ClubCampus das Gegenteil: security_invoker = true, weil eine Sicht
-- ohne diese Angabe RLS umgeht.
--
-- WAS PREISGEGEBEN WIRD: ausschliesslich „diese Person hat einen Zugang,
-- ja oder nein". Kein Name, keine E-Mail, kein ist_admin. Das ist keine
-- Erweiterung gegenueber frueher, sondern die Wiederherstellung des
-- Zustands vor Etappe 3.
--
-- ⚠ REGEL: An dieser Sicht wird NIE eine Spalte ergaenzt, ohne dass jemand
-- ueber die Rechte nachdenkt. Sie umgeht RLS — das ist ihr Zweck und ihr
-- Risiko. Wer hier `email` oder `role` dazunimmt, gibt sie allen frei.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create or replace view public.portal_zugang
  with (security_invoker = false)
  as
select b.person_id,
       coalesce(b.aktiv, true) as hat_zugang
  from public.benutzer b
 where b.person_id is not null;

alter view public.portal_zugang owner to postgres;

comment on view public.portal_zugang is
  'Nur: hat diese Person einen Portal-Zugang? Laeuft bewusst OHNE '
  'security_invoker, damit auch Trainer die Spalte in der Elternliste sehen '
  '— wie vor Etappe 3 ueber elternkontakte.benutzer_id. Keine weiteren '
  'Spalten ergaenzen.';

grant select on public.portal_zugang to authenticated;

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────

-- V1: Die Sicht liefert Zeilen und nur die zwei Spalten.
select * from public.portal_zugang order by person_id limit 5;

-- V2: Deckt sich die Zahl mit den Benutzern, die an einer Person haengen?
select (select count(*) from public.portal_zugang)                          as sicht,
       (select count(*) from public.benutzer where person_id is not null)   as benutzer_mit_person;

-- V3: security_invoker muss AUS sein — sonst wirkt die Sicht nicht.
--     Erwartet: leere reloptions oder security_invoker=false.
select c.relname, c.reloptions
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'portal_zugang';


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Typen neu erzeugen — die Sicht erscheint dort unter Views:
--     npx supabase gen types typescript --linked > src/database.types.ts
--   Dump nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
-- ═══════════════════════════════════════════════════════════════════════════
