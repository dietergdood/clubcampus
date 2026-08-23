-- ClubCampus — supabase/migration_vereine_schreibrecht.sql
-- 23.08.2026
--
-- ⚠ ZWEI SCHREIBWEGE DER PORTALVERWALTUNG TREFFEN NULL ZEILEN UND MELDEN ERFOLG.
--
--   `vereine` hat RLS an und genau ZWEI Policies — beide `FOR SELECT`. Für
--   UPDATE gibt es keine. Ein `update()` aus dem Browser trifft damit null
--   Zeilen; PostgREST antwortet `204 No Content` ohne Fehler, und der Code
--   liest `error` — der ist `null`. Also:
--
--     AussehenTab              → „Theme gespeichert ✓"      (nichts gespeichert)
--     „Standard wiederherstellen" → „Standard gespeichert ✓" (dito)
--     PersonenartenSektion     → kein Fehler, Ziel unverändert
--
--   Gemessen am 23.08.2026 gegen die laufende Datenbank, als `authenticated`
--   mit der Identität eines echten Admins, in einer zurückgerollten
--   Transaktion:
--
--     update vereine set theme = … where id = <eigener Verein>  →  0 Zeilen
--     dieselbe Anweisung ohne where                             →  0 Zeilen
--
--   Ein Durchgang über alle 34 aus `src/` beschriebenen Tabellen fand genau
--   diesen einen Fall — `vereine` ist die einzige Tabelle, in die das Portal
--   ohne passende Policy schreibt.
--
-- ⚠ WARUM DAS NIEMANDEM AUFGEFALLEN IST. Die Oberfläche zeigt den neuen Wert
--   sofort aus dem React-State und legt ihn in `localStorage["cc-theme"]` ab;
--   beim nächsten Laden wird er als Flicker-Schutz zuerst angewendet. Erst
--   `loadTenant()` überschreibt ihn mit dem Wert aus der Datenbank — und
--   löscht dabei die localStorage-Kopie gleich mit. Die Änderung ist also
--   nicht nur ungespeichert, sie verschwindet spurlos.
--
-- ⚠ UND DIE SPALTEN SIND EINE ALLOWLIST, KEIN PAUSCHALRECHT. Eine blosse
--   UPDATE-Policy gäbe jedem Vereinsadmin auch `vereine.slug` — und der Slug
--   ist seit dem 23.08.2026 die Quelle des Linkziels in der Einladungs-Mail
--   (`invite-user`). Wer ihn setzen kann, bestimmt, wohin ein Anmeldelink
--   führt. Genau dieser Ausgang ist heute Morgen geschlossen worden; er darf
--   nicht durch die Reparatur wieder aufgehen.
--
--   Deshalb: UPDATE wird der Rolle entzogen und spaltenweise neu vergeben.
--   Was das Portal schreibt, steht dann an EINER Stelle — hier.

begin;

do $mig$
declare
  v_pol_vorher   int;
  v_pol_nachher  int;
  v_spalten      int;
begin
  select count(*) into v_pol_vorher
    from pg_policies where schemaname = 'public' and tablename = 'vereine';

  -- ── A · Die Policy ─────────────────────────────────────────────────────
  -- Nur der eigene Verein, nur ein Admin. `with check` gleich wie `using`:
  -- ohne ihn könnte ein Admin die Zeile auf einen fremden Verein umschreiben.
  drop policy if exists "vereine_update" on public.vereine;
  create policy "vereine_update" on public.vereine
    for update to authenticated
    using       (id = public.get_my_verein_id() and public.is_admin())
    with check  (id = public.get_my_verein_id() and public.is_admin());

  -- ── B · Die Spalten-Allowlist ──────────────────────────────────────────
  -- `GRANT ALL` schliesst UPDATE auf JEDER Spalte ein, auch `slug`.
  revoke update on public.vereine from authenticated, anon;
  grant  update (theme, austritt_art_id) on public.vereine to authenticated;

  -- ── Zählprobe ──────────────────────────────────────────────────────────
  select count(*) into v_pol_nachher
    from pg_policies where schemaname = 'public' and tablename = 'vereine';

  select count(*) into v_spalten
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'vereine'
     and grantee = 'authenticated' and privilege_type = 'UPDATE';

  if v_pol_nachher <> v_pol_vorher + 1 then
    raise exception 'Policies: erwartet %, gezaehlt %', v_pol_vorher + 1, v_pol_nachher;
  end if;
  if v_spalten <> 2 then
    raise exception 'Schreibbare Spalten: erwartet 2 (theme, austritt_art_id), gezaehlt %', v_spalten;
  end if;

  raise notice 'OK — Policies % -> %, schreibbare Spalten: %',
    v_pol_vorher, v_pol_nachher, v_spalten;
end
$mig$;

commit;

-- ── Nachher zum Nachsehen ────────────────────────────────────────────────
-- select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='vereine' order by cmd, policyname;
--
-- select column_name from information_schema.column_privileges
--  where table_schema='public' and table_name='vereine'
--    and grantee='authenticated' and privilege_type='UPDATE' order by 1;
--
-- ⚠ `slug` darf in dieser zweiten Liste NICHT stehen.
