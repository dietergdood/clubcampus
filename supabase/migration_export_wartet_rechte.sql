-- ══════════════════════════════════════════════════════════════════════
--  migration_export_wartet_rechte.sql            24.09.2026
--
--  WAS: `public.export_wartet(uuid)` wird fuer PUBLIC und `anon`
--  gesperrt und danach ausdruecklich an die Rollen vergeben, die sie
--  brauchen.
--
--  WARUM: die Funktion ist `security definer`, laeuft also als
--  `postgres` und umgeht damit jede RLS. Sie zaehlt ueber VIER Tabellen
--  (`spiele`, `ranglisten`, `spiel_aufstellung`, `spiel_ereignisse`)
--  und nimmt die `verein_id` als Parameter entgegen. Wer unangemeldet
--  eine `verein_id` raet, bekommt heute eine Zeilenzahl zurueck — also
--  eine Auskunft ueber den Datenbestand eines fremden Vereins, ohne
--  Anmeldung. `schema.sql:5753` vergibt sie an `anon`.
--
-- ── ⚠ ⚠  DIE FALLE, UND SIE MACHT DEN GANZEN FIX WERTLOS ──────────────
--
--  In PostgreSQL bekommt JEDE Funktion bei `create` implizit `execute`
--  an **PUBLIC**. Ein `revoke ... from anon` allein bewirkt darum
--  NICHTS: `anon` ruft sie weiter ueber PUBLIC auf. Der Entzug von
--  PUBLIC muss ZUERST kommen, danach werden die erlaubten Rollen
--  einzeln wieder vergeben.
--
--  ⚠ Und `pg_dump` schreibt eine PUBLIC-Vergabe NICHT als eigene Zeile,
--  wenn sie die Vorgabe ist. Sie ist im Dump also nicht zu sehen.
--  Dass `schema.sql` kein `TO PUBLIC` nennt, ist KEIN Beleg dafuer,
--  dass es keines gibt — es ist der Normalfall.
--
--  ⚠ Ein `revoke`, das keine Rolle trifft, ist KEIN Fehler. Postgres
--  meldet schlicht `REVOKE`. Der Entzug ist also NICHT daran zu
--  erkennen, dass er gelingt. Deshalb steht in Abschnitt 3 eine
--  Gegenprobe, die ihn AUSFUEHRT statt ihn zu behaupten.
--
-- ── DIE ERLAUBTEN ROLLEN — die eine massgebliche Liste ────────────────
--
--    authenticated    GEMESSEN. `src/domains/spiele/exportWartetService.ts:61`
--                     ruft `sb.rpc("export_wartet", …)` aus dem Browser;
--                     erreicht wird die Stelle ueber `ApiTab` in der
--                     Portalverwaltung, also angemeldet.
--                     ⚠ SIEHE DEN OFFENEN WIDERSPRUCH WEITER UNTEN.
--
--    service_role     GESTRICHEN. Zweimal unabhaengig gesucht, kein
--                     Aufrufer: in `supabase/functions/` steht `.rpc(`
--                     nur fuer `is_admin` und `get_my_verein_id`, in
--                     `src/` ausser der Zeile oben nur
--                     `check_email_bekannt`. Die Vorgabe lautete „nur
--                     die Rollen behalten, die sie wirklich brauchen".
--                     ⚠ Ein kuenftiger Aufrufer aus einer Edge Function
--                     scheitert dann LAUT mit 42501 — nicht still. Die
--                     Ruecknahme ist eine Zeile:
--                     `grant execute on function
--                      public.export_wartet(uuid) to service_role;`
--
--    postgres         BRAUCHT KEINE VERGABE — Eigentuemer, behaelt
--                     `execute` auch nach dem Entzug von PUBLIC.
--
--                     ⚠ ⚠ UND HIER STAND, DIE BEIDEN CRON-AUFTRAEGE
--                     LIEFEN ALS `postgres`. DAS IST ERSCHLOSSEN, NICHT
--                     GEMESSEN: in KEINER cron-Datei steht ein
--                     `username` (`cron_wp_export.sql:72`,
--                     `cron_sync_waechter.sql:255`), und Abschnitt 3
--                     belegt nur, dass `postgres` DARF — als
--                     Eigentuemer trivial —, nicht, dass der Auftrag
--                     als `postgres` LAEUFT. Zwei verschiedene Fragen.
--
--                     ⚠ VOR DEM LAUF DIESER DATEI ZU MESSEN:
--
--                         select jobname, username
--                           from cron.job order by jobid;
--
--                     Steht dort nicht `postgres`, faellt der Abholer
--                     nach dem Entzug aus — und zwar STILL: „es wartet
--                     nichts" sieht genauso aus wie „ich darf nicht
--                     nachsehen". Dann gehoert die dort genannte Rolle
--                     in Abschnitt 1 UND in die Erwartungstabelle.
--
--    anon             KEIN Aufrufer. Wird entzogen.
--
--  ⚠ Die Liste steht damit dreimal: hier als Entscheid, in Abschnitt 1
--  als Anweisung, in Abschnitt 3 als Erwartung. Das ist Absicht und
--  keine Dublette — laufen sie auseinander, meldet es der Abgleich in
--  Abschnitt 2 (Zeile `Abgleich`) und die Gegenprobe in Abschnitt 3.
--  Eine Aufteilung, die aufgehen muss, prueft sich selbst.
--
-- ── WARUM `authenticated` BLEIBT — und eine Warnung ueber das Lesen ─
--
--  Waehrend diese Datei entstand, lag an derselben Stelle kurzzeitig
--  eine dreizeilige Fassung, die `authenticated` MIT entzog. Sie war
--  eine TESTATTRAPPE aus einer parallelen Gegenprobe, kein Entscheid
--  — nachtraeglich geklaert am 24.09.2026.
--
--  ⚠ Festgehalten wird sie trotzdem, weil der Irrtum lehrreich ist:
--  eine Sabotage, die jemand zur Gegenprobe anlegt, ist von einer
--  Meinung nicht zu unterscheiden, sobald ein Zweiter sie liest. Sie
--  hat hier einen ganzen Abschnitt Gegenargumentation ausgeloest.
--
--  Der Entscheid selbst ruht auf einer Messung und steht unabhaengig
--  davon: es gibt einen `authenticated`-Aufrufer.
--
--      src/domains/spiele/exportWartetService.ts:61
--          await sb.rpc("export_wartet", { p_verein_id: vereinId })
--
--  Gerufen aus `ApiTab` (Portalverwaltung) ueber den Browser, also mit
--  der Sitzung eines Angemeldeten. Faellt `authenticated`, faellt die
--  Kachel „wartet etwas?" — nicht still (`holeExportWartet()` liest
--  `error`), aber sie beantwortet die Frage nicht mehr, fuer die sie am
--  24.09.2026 angeschlossen wurde.
--
--  ⚠ UND DER SATZ, DER DEN IRRTUM ERKLAERT: „cron.job beruecksichtigt"
--  ist kein Gegenargument, sondern eine ANDERE Frage. Der cron ruft
--  nicht aus dem Browser. WER NUR DEN CRON MISST, MISST DEN BROWSER
--  NICHT — und umgekehrt.
--
-- ── ⚠ WAS DIESE MIGRATION NICHT ABDECKT ───────────────────────────────
--
--  · `public.check_email_bekannt(text, uuid)` ist DIESELBE FAMILIE —
--    `security definer`, an `anon` freigegeben (`schema.sql:5747`), und
--    in CLAUDE.md als oeffentliches Orakel beschrieben, das zu einer
--    Adresse Namen und `person_id` herausgibt. Sie ist hier
--    AUSDRUECKLICH NICHT Gegenstand: anders als `export_wartet` hat sie
--    einen gemessenen anon-Aufrufer (`LoginScreen.tsx:56`, die
--    Registrierung). Ihr den Zugang zu entziehen ist eine
--    Produktentscheidung und keine Aufraeumung — sie gehoert in einen
--    eigenen Auftrag.
--
--  · Alle uebrigen Funktionen in `schema.sql`, die an `anon` vergeben
--    sind. Es sind viele; diese Migration fasst genau eine an.
--
--  · ⚠ SIE HAELT NICHT FUER IMMER. `create or replace function`
--    behaelt die Rechte — ein `drop` + `create` NICHT: das neue Objekt
--    bekommt die Vorgaberechte, und in Supabase vergibt eine
--    `alter default privileges`-Regel dabei wieder an `anon`.
--    **Wer die Funktion je loescht und neu anlegt, holt `anon` zurueck,
--    und nichts meldet es.** Dann ist Abschnitt 1 erneut zu fahren.
--    Abschnitt 2 ist die Abfrage, mit der man es nachsieht.
--
-- ── AUSFUEHRUNG ───────────────────────────────────────────────────────
--
--  ⚠ ABSCHNITT FUER ABSCHNITT AUSFUEHREN, NICHT ALS GANZES. Der
--  Supabase-SQL-Editor zeigt bei mehreren Anweisungen nur das Ergebnis
--  der LETZTEN — die Berichte aus Abschnitt 0 und 2 gingen dabei
--  verloren, und Abschnitt 3 endet auf `rollback`, das gar keine Zeilen
--  liefert. Jeder Abschnitt ist einzeln zu markieren und zu starten.
--
--  ⚠ Berichtet wird ausschliesslich als `select`, nie als
--  `raise notice`: der Editor zeigt NOTICE nicht an. „Success. No rows
--  returned" heisst dort „ich habe dir nichts gesagt" — am 10.09.2026
--  ist so eine Zahl endgueltig verlorengegangen.
--
--  ⚠ Keine `begin; … commit;`-Huelle um Abschnitt 1. Jede Anweisung
--  wird einzeln bestaetigt. Die Transaktion in Abschnitt 3 ist etwas
--  anderes: sie gehoert zur Gegenprobe und endet auf `rollback`.
--
--  WIEDERHOLBAR: ein zweiter Lauf aendert nichts. `revoke` auf ein
--  Recht, das schon weg ist, und `grant` auf eines, das schon da ist,
--  sind beide folgenlos. Sichtbar ist das daran, dass der Bericht in
--  Abschnitt 0 dann bereits den Endzustand zeigt und Abschnitt 2
--  denselben.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
--  ABSCHNITT 0 — VORHER. Einzeln ausfuehren und die Ausgabe aufheben.
--
--  ⚠ `aclexplode` liest den ACL der Funktion direkt und zeigt als
--  einzige Quelle den Eintrag fuer PUBLIC (dort steht die Rollen-Oid 0).
--  Das `coalesce(..., acldefault(...))` ist dabei nicht Zierrat:
--  `proacl IS NULL` heisst „nie angefasst" und damit „Eigentuemer UND
--  PUBLIC duerfen" — `aclexplode(NULL)` gaebe aber NULL Zeilen zurueck,
--  und ein leerer Bericht liesse sich als „niemand darf" lesen. Genau
--  die Verwechslung, um die es in dieser Datei geht.
--
--  Die Zeilen `wirksam` beantworten die andere Haelfte: was eine Rolle
--  TATSAECHLICH darf, gleich ob direkt vergeben oder ueber PUBLIC
--  geerbt.
-- ══════════════════════════════════════════════════════════════════════

select 1 as nr,
       'Funktion' as art,
       'public.export_wartet(uuid)' as wer,
       case
         when to_regprocedure('public.export_wartet(uuid)') is null
           then 'GIBT ES NICHT — alles Weitere ist gegenstandslos'
         else 'vorhanden, Eigentuemer: '
              || (select pg_get_userbyid(p.proowner) from pg_proc p
                   where p.oid = to_regprocedure('public.export_wartet(uuid)'))
       end as befund

union all

select 2,
       'ACL-Eintrag',
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
       a.privilege_type
  from pg_proc p,
       lateral aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner)))
         as a(grantor, grantee, privilege_type, is_grantable)
 where p.oid = to_regprocedure('public.export_wartet(uuid)')

union all

select 3,
       'wirksam',
       r.rolle,
       case
         when to_regrole(r.rolle) is null
           then 'diese Rolle gibt es in dieser Datenbank nicht'
         when to_regprocedure('public.export_wartet(uuid)') is null
           then 'Funktion fehlt'
         when has_function_privilege(to_regrole(r.rolle)::oid,
                                     to_regprocedure('public.export_wartet(uuid)')::oid,
                                     'EXECUTE')
           then 'DARF aufrufen'
         else 'darf NICHT aufrufen'
       end
  from (values ('anon'), ('authenticated'), ('service_role'), ('postgres'))
         as r(rolle)

union all

-- ⚠ Diese Zeile steht IMMER da, auch wenn es nichts zu melden gibt.
-- Eine Anzeige, die nur im schlechten Fall etwas zeigt, verlangt vom
-- Leser die Deutung einer Abwesenheit — und die ist immer geraten.
select 4,
       'Abgleich',
       'EXECUTE ausserhalb der erlaubten Liste (authenticated, postgres)',
       coalesce(
         (select string_agg(x.wer, ', ' order by x.wer)
            from (select case when a.grantee = 0 then 'PUBLIC'
                              else pg_get_userbyid(a.grantee) end as wer
                    from pg_proc p,
                         lateral aclexplode(coalesce(p.proacl,
                                                     acldefault('f'::"char", p.proowner)))
                           as a(grantor, grantee, privilege_type, is_grantable)
                   where p.oid = to_regprocedure('public.export_wartet(uuid)')
                     and a.privilege_type = 'EXECUTE') as x
           where x.wer not in ('authenticated', 'postgres')),
         'keine — die Rechtelage entspricht der Liste im Kopf')

 order by 1, 3;


-- ══════════════════════════════════════════════════════════════════════
--  ABSCHNITT 1 — DER ENTZUG UND DIE VERGABE. Vier Einzelanweisungen.
--
--  ⚠ DIE REIHENFOLGE IST DIE SACHE: PUBLIC ZUERST. Stuende `from anon`
--  allein da, bliebe der Aufruf ueber PUBLIC offen, und die Migration
--  saehe trotzdem erfolgreich aus.
--
--  ⚠ Erwartete Ausgabe: viermal `REVOKE` bzw. `GRANT`, keine Zeilen.
--  Das ist KEIN Beleg, dass etwas geschehen ist — der Beleg steht in
--  Abschnitt 2 und 3.
-- ══════════════════════════════════════════════════════════════════════

revoke all on function public.export_wartet(uuid) from public;

revoke all on function public.export_wartet(uuid) from anon;

grant execute on function public.export_wartet(uuid) to authenticated;

-- service_role: KEINE Vergabe. Kein gemessener Aufrufer (siehe Kopf).
-- Ruecknahme waere genau diese Zeile, entkommentiert:
-- grant execute on function public.export_wartet(uuid) to service_role;


-- ══════════════════════════════════════════════════════════════════════
--  ABSCHNITT 2 — NACHHER. Wortgleich mit Abschnitt 0, damit die beiden
--  Ausgaben nebeneinander lesbar sind.
--
--  ERWARTET:
--    · unter `ACL-Eintrag` steht KEIN `PUBLIC` und kein `anon` mehr,
--      wohl aber `postgres` (Eigentuemer), `authenticated`,
--      `service_role`
--    · `wirksam / anon`           → darf NICHT aufrufen
--    · `wirksam / authenticated`  → DARF aufrufen
--    · `wirksam / service_role`   → DARF aufrufen
--    · `wirksam / postgres`       → DARF aufrufen   (die cron-Auftraege)
--    · `Abgleich`                 → „keine — …"
-- ══════════════════════════════════════════════════════════════════════

select 1 as nr,
       'Funktion' as art,
       'public.export_wartet(uuid)' as wer,
       case
         when to_regprocedure('public.export_wartet(uuid)') is null
           then 'GIBT ES NICHT — alles Weitere ist gegenstandslos'
         else 'vorhanden, Eigentuemer: '
              || (select pg_get_userbyid(p.proowner) from pg_proc p
                   where p.oid = to_regprocedure('public.export_wartet(uuid)'))
       end as befund

union all

select 2,
       'ACL-Eintrag',
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
       a.privilege_type
  from pg_proc p,
       lateral aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner)))
         as a(grantor, grantee, privilege_type, is_grantable)
 where p.oid = to_regprocedure('public.export_wartet(uuid)')

union all

select 3,
       'wirksam',
       r.rolle,
       case
         when to_regrole(r.rolle) is null
           then 'diese Rolle gibt es in dieser Datenbank nicht'
         when to_regprocedure('public.export_wartet(uuid)') is null
           then 'Funktion fehlt'
         when has_function_privilege(to_regrole(r.rolle)::oid,
                                     to_regprocedure('public.export_wartet(uuid)')::oid,
                                     'EXECUTE')
           then 'DARF aufrufen'
         else 'darf NICHT aufrufen'
       end
  from (values ('anon'), ('authenticated'), ('service_role'), ('postgres'))
         as r(rolle)

union all

select 4,
       'Abgleich',
       'EXECUTE ausserhalb der erlaubten Liste (authenticated, postgres)',
       coalesce(
         (select string_agg(x.wer, ', ' order by x.wer)
            from (select case when a.grantee = 0 then 'PUBLIC'
                              else pg_get_userbyid(a.grantee) end as wer
                    from pg_proc p,
                         lateral aclexplode(coalesce(p.proacl,
                                                     acldefault('f'::"char", p.proowner)))
                           as a(grantor, grantee, privilege_type, is_grantable)
                   where p.oid = to_regprocedure('public.export_wartet(uuid)')
                     and a.privilege_type = 'EXECUTE') as x
           where x.wer not in ('authenticated', 'postgres')),
         'keine — die Rechtelage entspricht der Liste im Kopf')

 order by 1, 3;


-- ══════════════════════════════════════════════════════════════════════
--  ABSCHNITT 3 — DIE GEGENPROBE. Sie FUEHRT den Entzug aus, statt ihn
--  zu behaupten. Als Block markieren und im Ganzen starten: das
--  `select` vor dem `rollback` ist die Ausgabe.
--
--  ⚠ WARUM UEBERHAUPT: Abschnitt 2 liest den Katalog. Das ist eine
--  Beschreibung. Hier wird der Aufruf tatsaechlich unter jeder Rolle
--  versucht — und nur das unterscheidet einen wirksamen Entzug von
--  einem, der bloss so aussieht.
--
--  ⚠ `set local role` wirkt nur in einer Transaktion und wird vom
--  `rollback` mit zurueckgenommen. Es geht nichts nach draussen: der
--  Aufruf liest vier Tabellen, schreibt nichts, und die uebergebene
--  `verein_id` ist die Null-Uuid — sie trifft keine einzige Zeile. Der
--  Rueckgabewert ist deshalb belanglos; gemessen wird das RECHT, nicht
--  die Zahl.
--
--  ⚠ ⚠ DIE FALLE IN DER PROBE SELBST, und sie waere ein Fehlalarm in
--  der beruhigenden Richtung: schlaegt schon `set local role anon`
--  fehl — etwa weil der ausfuehrende Benutzer nicht Mitglied der Rolle
--  ist —, so wirft auch DAS ein `42501`. Der Fang
--  `insufficient_privilege` haette dann „abgewiesen, wie gewollt"
--  gemeldet, OHNE dass die Funktion je gerufen wurde. Deshalb wird nach
--  dem Rollenwechsel `current_user` festgehalten und mit ausgegeben:
--  steht dort nicht die erwartete Rolle, lautet das Urteil „PROBE
--  UNGUELTIG" und nicht „OK".
-- ══════════════════════════════════════════════════════════════════════

begin;

create temporary table cc_erwartung (
  nr     integer,
  rolle  text,
  darf   boolean,
  warum  text
);

-- Die Erwartung, maschinenlesbar. Sie muss mit der Liste im Kopf und
-- mit Abschnitt 1 uebereinstimmen.
insert into cc_erwartung (nr, rolle, darf, warum) values
  (1, 'anon',          false, 'kein Aufrufer; unangemeldet erreichbar war die Preisgabe'),
  (2, 'authenticated', true,  'ApiTab ueber exportWartetService.ts — siehe Widerspruch im Kopf'),
  (3, 'service_role',  false, 'gestrichen: kein gemessener Aufrufer — siehe Kopf'),
  (4, 'postgres',      true,  'Eigentuemer; die beiden cron-Auftraege rufen sie so');

create temporary table cc_probe (
  nr          integer,
  rolle       text,
  erwartet    text,
  gerufen_als text,
  beobachtet  text,
  urteil      text
);

do $gegenprobe$
declare
  e      record;
  v_anz  integer;
  v_wer  text;
  v_beob text;
  v_ziel constant uuid := '00000000-0000-0000-0000-000000000000';
begin
  for e in select * from cc_erwartung order by nr loop

    -- Vor jedem Durchgang zuruecksetzen. Bleibt der Wert null, hat der
    -- Rollenwechsel nicht stattgefunden — und dann sagt der Versuch
    -- nichts ueber das Recht an der Funktion aus.
    v_wer  := null;
    v_anz  := null;
    v_beob := null;

    begin
      execute format('set local role %I', e.rolle);
      v_wer  := current_user;
      v_anz  := public.export_wartet(v_ziel);
      v_beob := 'durchgelassen, Ergebnis ' || coalesce(v_anz::text, 'null');
    exception
      when insufficient_privilege then
        v_beob := 'abgewiesen mit 42501';
      when others then
        v_beob := 'anderer Fehler ' || sqlstate || ': ' || sqlerrm;
    end;

    -- ⚠ Erst zurueck in die eigene Rolle, dann schreiben: die
    -- Protokolltabelle gehoert nicht der Rolle, unter der eben gerufen
    -- wurde.
    reset role;

    insert into cc_probe (nr, rolle, erwartet, gerufen_als, beobachtet, urteil)
    values (
      e.nr,
      e.rolle,
      case when e.darf then 'MUSS durchgehen' else 'MUSS abgewiesen werden' end,
      coalesce(v_wer, '(Rollenwechsel misslungen)'),
      v_beob,
      case
        when v_wer is distinct from e.rolle
          then 'PROBE UNGUELTIG — der Rollenwechsel hat nicht stattgefunden. '
               || 'Diese Zeile sagt NICHTS ueber das Recht an der Funktion.'
        when e.darf and v_beob like 'durchgelassen%'
          then 'OK — die Rolle kommt durch, wie sie soll'
        when e.darf
          then 'FEHLGESCHLAGEN — diese Rolle BRAUCHT die Funktion und wird abgewiesen'
        when (not e.darf) and v_beob = 'abgewiesen mit 42501'
          then 'OK — der Entzug wirkt'
        when (not e.darf) and v_beob like 'durchgelassen%'
          then 'FEHLGESCHLAGEN — DER ENTZUG IST WIRKUNGSLOS. '
               || 'Vermutlich wurde PUBLIC nicht entzogen (siehe Kopf).'
        else 'UNKLAR — weder durchgelassen noch mit 42501 abgewiesen; '
             || 'die Meldung in der Spalte davor nennt den Grund'
      end
    );

  end loop;
end
$gegenprobe$;

-- ⚠ Die Ausgabe. Sie MUSS vor dem `rollback` stehen — danach gibt es
-- weder die Tabelle noch die Zeilen.
select p.nr, p.rolle, p.erwartet, p.gerufen_als, p.beobachtet, p.urteil,
       (select e.warum from cc_erwartung e where e.nr = p.nr) as begruendung
  from cc_probe p
 order by p.nr;

rollback;


-- ══════════════════════════════════════════════════════════════════════
--  NACH DEM LAUF
--
--  ⚠ `supabase/schema.sql` nachziehen. Rechte stehen im Dump, und die
--  drei Zeilen 5753-5755 zeigen bis dahin einen Zustand, den es nicht
--  mehr gibt:
--      npx supabase db dump --linked -f supabase/schema.sql
--  ⚠ Die Datei NICHT von Hand aendern — sie ist erzeugt, und der
--  naechste Dump naehme die Aenderung zurueck.
--
--  ⚠ Die Zaehlprobe des Dumps (CREATE TABLE / POLICY / INDEX /
--  ADD CONSTRAINT) bleibt hier unveraendert: diese Migration legt kein
--  Objekt an und entfernt keines. Bewegen duerfen sich nur die
--  GRANT-Zeilen.
-- ══════════════════════════════════════════════════════════════════════
