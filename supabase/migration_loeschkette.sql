-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 3b, SCHRITT 1 · DIE LOESCHKETTE VORBEREITEN
-- 23.08.2026
--
-- WOZU
--   Eine Person zu loeschen scheitert heute an Fremdschluesseln. Der Auftrag
--   nennt „drei Fremdschluessel ohne ON DELETE"; gemessen sind es an den vier
--   Wurzeln 51 Schluessel, und **23 davon blockieren das Loeschen eines
--   KONTOS**. Der Auftrag beschreibt Schritt 3 als „benutzer loeschen und
--   auth.users dazu" — das ist die halbe Wahrheit.
--
-- ⚠ ZWEI SORTEN, UND SIE BRAUCHEN VERSCHIEDENE ANTWORTEN:
--
--     ZUORDNUNG      die Person ist der GEGENSTAND der Zeile
--                    -> faellt mit (CASCADE), oder die Zeile ist sinnlos
--     URHEBERSCHAFT  die Person hat etwas GETAN
--                    -> SET NULL. Die Zeile ist ein NACHWEIS: eine
--                       Korrektur an einem Spielereignis, ein Sync-Lauf,
--                       eine Rechteaenderung. Sie zu loeschen, weil die
--                       Person geht, zerstoert das Protokoll; sie mit einem
--                       Verweis ins Leere zu behalten geht nicht.
--
--   Neun von elf hier sind Urheberschaft. Dieselbe Antwort wie am 17.08.2026
--   fuer die Helfereinsaetze — und derselbe Grund.
--
-- ⚠ WARUM VOR DER VORSCHAU. Eine Vorschau, die „blockiert" meldet, wo eine
--   Woche spaeter `SET NULL` steht, zeigt einen Zustand, den es dann nicht
--   mehr gibt. Wer sie liest, trifft eine Entscheidung auf veralteter
--   Grundlage. (Entscheidung Didi, 23.08.2026.)
--
-- ⚠ ES BLOCKIERT HEUTE FAST NICHTS — UND DAS IST KEIN ARGUMENT.
--   Von den sechs betroffenen Tabellen mit Zeilen traegt genau EINE einen
--   Verweis (`spiel_ereignisse.korrigiert_von`, 1 von 268 Zeilen). Alle
--   diese Spalten sind „wer hat das getan": sie fuellen sich im Betrieb.
--   Heute blockiert eine, naechstes Jahr blockieren fuenf. Eine Datenlage
--   ist keine Absicherung.
--
-- ⚠ EIN FUND, DER NICHT IM AUFTRAG STEHT: `audit_log.benutzer_id` blockiert
--   ebenfalls. Wer das Loeschen protokolliert, traegt sich dort als Handelnder
--   ein — und koennte danach selbst nie geloescht werden. Ein Protokoll, das
--   den Protokollanten festhaelt, waere genau die Falle, die diese Etappe
--   beseitigen soll. Auch hier: SET NULL, das Protokoll ueberlebt, der
--   Verweis nicht.
--
-- ⚠ `elternkontakte` ist eine ALTLAST (faellt in Etappe 6) und wird weder
--   gelesen noch geschrieben. `benutzer_id` steht dort in 0 von 398 Zeilen.
--   Trotzdem mit: solange die Tabelle steht, blockiert der Schluessel, und
--   eine tote Tabelle soll kein Loeschen aufhalten.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           68 -> 68   (+-0)
--   ADD CONSTRAINT                  315 -> 315  (+-0)
--
--   Elf Schluessel werden ERSETZT, nicht hinzugefuegt — die Zahl bleibt
--   gleich. Geprueft wird ueber `pg_constraint.confdeltype` unten.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz  int;
  v_rest int;
  /* name, tabelle, spalte, ziel */
  v_liste text[][] := array[
    /* ── Urheberschaft: „wer hat das getan" ── */
    ['api_sync_log_gestartet_von_fkey',            'api_sync_log',            'gestartet_von',   'benutzer'],
    ['audit_log_benutzer_id_fkey',                 'audit_log',               'benutzer_id',     'benutzer'],
    ['feldsichtbarkeit_updated_by_fkey',           'feldsichtbarkeit',        'updated_by',      'benutzer'],
    ['module_berechtigungen_updated_by_fkey',      'module_berechtigungen',   'updated_by',      'benutzer'],
    ['spiel_ereignisse_korrigiert_von_fkey',       'spiel_ereignisse',        'korrigiert_von',  'benutzer'],
    ['trainingsplan_vorlagen_erstellt_von_fkey',   'trainingsplan_vorlagen',  'created_by',      'benutzer'],
    ['helper_zuteilungen_eingetragen_von_fkey',    'helper_zuteilungen',      'eingetragen_von', 'benutzer'],
    ['team_helfer_zuteilungen_eingetragen_von_fkey','team_helfer_zuteilungen','eingetragen_von', 'benutzer'],
    /* ── Altlast, faellt in Etappe 6 ── */
    ['elternkontakte_benutzer_id_fkey',            'elternkontakte',          'benutzer_id',     'benutzer'],
    /* ── Der Entscheid vom 17.08.2026: der NACHWEIS bleibt, anonymisiert ──
       `helper_zuteilungen` und `team_helfer_zuteilungen` haengen mit CASCADE
       an `person_id`. Beim Loeschen ginge damit der Nachweis verloren, dass
       eine Schicht besetzt war. `person_id` ist in beiden bereits nullable;
       der Unique-Schluessel (schicht_id, person_id) stoert nicht, weil NULL
       in UNIQUE als verschieden gilt — mehrere anonymisierte Zeilen pro
       Schicht passen nebeneinander. */
    ['helper_zuteilungen_person_fkey',             'helper_zuteilungen',      'person_id',       'personen'],
    ['team_helfer_zuteilungen_person_fkey',        'team_helfer_zuteilungen', 'person_id',       'personen']
  ];
  v_zeile text[];
begin

  foreach v_zeile slice 1 in array v_liste loop
    execute format('alter table public.%I drop constraint if exists %I',
                   v_zeile[2], v_zeile[1]);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete set null',
                   v_zeile[2], v_zeile[1], v_zeile[3], v_zeile[4]);
  end loop;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  /* Alle elf muessen jetzt SET NULL sein. */
  select count(*) into v_anz
    from pg_constraint c
   where c.contype='f' and c.confdeltype='n'
     and c.conname = any (array(select v_liste[i][1] from generate_subscripts(v_liste,1) i));
  if v_anz <> 11 then
    raise exception 'UNVOLLSTAENDIG: % von 11 Schluesseln auf SET NULL.', v_anz;
  end if;

  /* ⚠ DIE PROBE, AUF DIE ES ANKOMMT: wie viele blockieren NOCH auf
     `benutzer`? Vorher 23. Neun davon sind oben behandelt; die restlichen
     14 gehoeren zu Tabellen, die heute leer sind — sie bleiben stehen und
     tauchen in der Vorschau als „blockiert" auf, sobald sie Zeilen haben.
     Das ist gewollt: was den Loeschvorgang aufhalten SOLL, soll ihn auch
     aufhalten. */
  select count(*) into v_rest
    from pg_constraint c
   where c.contype='f' and c.confdeltype='a'
     and c.confrelid = 'public.benutzer'::regclass;

  raise notice 'Fertig. 11 Schluessel auf SET NULL. Auf `benutzer` blockieren noch % (vorher 23).', v_rest;

  /* ⚠ KEINE ZEILE WIRD GEAENDERT. `SET NULL` gilt kuenftig; bestehende
     Werte bleiben. Der eine Verweis in `spiel_ereignisse.korrigiert_von`
     steht danach unveraendert da — er faellt erst, wenn das Konto
     tatsaechlich geloescht wird. */
  select count(*) into v_anz from public.spiel_ereignisse where korrigiert_von is not null;
  raise notice 'Unveraendert: % Verweis(e) in spiel_ereignisse.korrigiert_von.', v_anz;
end $mig$;
