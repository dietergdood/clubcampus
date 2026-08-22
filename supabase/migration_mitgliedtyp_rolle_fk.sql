-- ═══════════════════════════════════════════════════════════════════════════
-- FREMDSCHLUESSEL AUF mitgliedtypen.standard_rolle
-- 22.08.2026
--
-- WOZU
--   `personenarten.standard_rolle` hat seit dem 22.08.2026 einen
--   Fremdschluessel auf `portal_rollen(verein_id, name)`.
--   `mitgliedtypen.standard_rolle` nicht — und genau dieses Fehlen liess am
--   05.08.2026 zwei Zeilen mit `rolle = 'Spieler'` (grosses S) zu: einen
--   Wert, den `portal_rollen` nicht kennt und mit dem weder
--   `getPermissions` noch `NAV_BY_ROLE` etwas anfangen.
--
--   `mitgliedtypen.standard_rolle` ist die QUELLE dieses Wertes:
--   `ableitRolle()` nimmt sie, wenn kein Kadereintrag vorliegt, und
--   `ableitUndSaveRolle()` schreibt sie nach `mitglieder.rolle` und
--   `benutzer.role`. Ein Tippfehler dort verteilt sich also auf jede Zeile
--   des Typs, ohne dass irgendwo etwas fehlschlaegt — die Rolle ist dann
--   schlicht unbekannt, und die Navigation zeigt nichts.
--
-- ⚠ ES WIRD HEUTE NICHTS REPARIERT. Gemessen am 22.08.2026: 8 von 8 aktiven
--   Mitgliedtypen tragen eine Rolle, und NULL davon ist unbekannt. Diese
--   Migration ist reine Vorbeugung — sie verhindert den naechsten Fall, nicht
--   einen bestehenden.
--
-- ⚠ ERST PRUEFEN, DANN VERKNUEPFEN. Bricht das `ALTER` an einer Zeile, nennt
--   die Meldung von Postgres sie NICHT. Der Block unten nennt sie, samt der
--   Abfrage zum Nachsehen. Dieselbe Reihenfolge wie bei
--   `migration_austritt.sql`.
--
-- ⚠ `ON DELETE SET NULL`, nicht CASCADE: wird eine Portalrolle geloescht,
--   verliert der Mitgliedtyp seine Vorbelegung — er selbst darf davon nicht
--   verschwinden. `ON UPDATE CASCADE`, damit ein Umbenennen der Rolle
--   mitwandert statt den Schluessel zu brechen.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           68 -> 68   (+-0)
--   ADD CONSTRAINT                  314 -> 315  (+1)
--
--   Die +1 ist der Fremdschluessel.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_anz int;
begin

  select count(*) into v_anz
    from public.mitgliedtypen t
    left join public.portal_rollen r
      on r.verein_id = t.verein_id and r.name = t.standard_rolle
   where t.standard_rolle is not null and r.name is null;
  if v_anz > 0 then
    raise exception
      'ABBRUCH: % Mitgliedtyp(en) tragen eine Rolle, die portal_rollen nicht kennt. Zum Nachsehen: select t.name, t.standard_rolle from public.mitgliedtypen t left join public.portal_rollen r on r.verein_id=t.verein_id and r.name=t.standard_rolle where t.standard_rolle is not null and r.name is null;',
      v_anz;
  end if;

  alter table public.mitgliedtypen
    drop constraint if exists mitgliedtypen_standard_rolle_fkey;
  alter table public.mitgliedtypen
    add constraint mitgliedtypen_standard_rolle_fkey
    foreign key (verein_id, standard_rolle)
    references public.portal_rollen (verein_id, name)
    on update cascade on delete set null;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  select count(*) into v_anz from pg_constraint
   where conname = 'mitgliedtypen_standard_rolle_fkey';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: Fremdschluessel fehlt.'; end if;

  select count(*) into v_anz from public.mitgliedtypen where standard_rolle is not null;
  raise notice 'Fertig. % Mitgliedtyp(en) mit Rolle, alle gueltig.', v_anz;
end $mig$;
