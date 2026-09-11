-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC-WAECHTER
-- 21.08.2026
--
-- Meldet, wenn der SFV-Sync ausfaellt — und seit dem 11.09.2026 zweitens,
-- wenn eine Tabelle auf die stille 1000-Zeilen-Grenze von PostgREST zuwaechst.
--
-- ⚠ ZWEI FRAGEN IN EINEM BLOCK, und sie sind absichtlich NICHT verschmolzen:
--   der Ausfall geht in `v_ausfaell` und damit auf `/fail`, das Wachstum
--   nicht. Eine wachsende Tabelle ist kein Ausfall; wer sie so behandelt,
--   faerbt den Totmannschalter dauerhaft rot und macht ihn wertlos.
--
-- ⚠ WARUM ES IHN GIBT
--   Am 20./21.08.2026 stand der Sync 14 Stunden. Jeder stuendliche Aufruf
--   kam mit 401 zurueck, weil dem Cron-Befehl der Authorization-Header
--   fehlte. Gemerkt hat es niemand — und zwar nicht aus Nachlaessigkeit,
--   sondern weil es NICHTS ZU MERKEN GAB:
--
--     cron.job_run_details  „succeeded"        (= Anfrage abgesetzt, mehr nicht)
--     api_sync_log          keine neue Zeile   (= sieht aus wie „nichts zu tun")
--     net._http_response    401                (reicht nur Stunden zurueck)
--
--   Ein Ausfall, der keine Spur hinterlaesst, braucht jemanden, der das
--   FEHLEN bemerkt. Das ist die ganze Aufgabe dieser Datei.
--
--
-- ⚠ `letzter_sync` ALLEIN IST DIE FALSCHE QUELLE
--
--   Sie heisst „zuletzt FERTIG GEWORDEN", nicht „zuletzt GELUNGEN".
--   `index.ts:181` setzt sie nach jedem abgeschlossenen Lauf — auch bei
--   `status = 'fehler'`:
--
--     const erg = await laufeSync(…);
--     await db.from("api_verbindungen").update({
--       letzter_sync: new Date().toISOString(), sync_status: erg.status, … });
--
--   Ein Sync, der stuendlich scheitert, hielte sie frisch, und ein Waechter,
--   der nur ihr Alter prueft, bliebe still. Genau die Sorte Pruefung, die
--   beruhigt statt zu pruefen.
--
--   ⚠ WER DAS SPAETER AUF EINE SPALTE VEREINFACHT, BAUT DEN AUSFALL WIEDER
--   EIN. Geprueft wird das PAAR `letzter_sync` UND `sync_status`. Beide
--   stehen im selben `update` und koennen nicht auseinanderlaufen.
--
--   Zwei Ausfallarten, zwei Erkennungen:
--     Gateway (der 401-Fall)  keine Spur, die Function startet nie
--                             → `letzter_sync` altert
--     Lauf scheitert          `status='fehler'` steht in beiden Tabellen
--                             → `sync_status = 'fehler'`
--
--
-- WO ER LAEUFT: REINES SQL, KEIN HTTP
--
--   `pg_cron` fuehrt den Block IN DER DATENBANK aus. Kein Gateway, kein
--   `pg_net`, keine Edge Function — genau die drei Wege, die versagt haben,
--   sind an der Pruefung nicht beteiligt. Ein Waechter, der denselben Weg
--   naehme wie der Ueberwachte, fiele mit ihm aus.
--
--   Minute 47, nicht */30: der Sync laeuft zur Minute 17 und darf bis zu
--   120 Sekunden brauchen. Ein Waechter, der gleichzeitig prueft, meldet
--   einen Ausfall, waehrend der Lauf noch arbeitet.
--
--   Schwelle 2 Stunden: bei gesundem Betrieb ist `letzter_sync` hoechstens
--   60 Minuten alt. Darueber heisst, dass mindestens ein Lauf ausgefallen
--   ist — mit Reserve fuer einen langsamen.
--
--
-- WOHIN ER MELDET: `benachrichtigungen`, an die aktiven Administratoren
--
--   Nicht `nachrichten`: dort erlaubt `nachrichten_empfaenger_typ_check` nur
--   'rolle', 'gruppe' und 'team' — eine einzelne Person laesst sich gar
--   nicht adressieren. `benachrichtigungen` ist der einzige Weg, der einen
--   Menschen erreicht, und der SFV-Lauf schreibt bei ueberfluessigen
--   Korrekturen schon dorthin.
--
--   Nicht stuendlich nagen: geschrieben wird nur, wenn zu diesem Anschluss
--   keine UNGELESENE Meldung dieser Art steht. Nach dem Lesen und bei
--   anhaltendem Ausfall kommt eine neue — es ist ja noch kaputt.
--
--   ⚠ GRENZE: eine Benachrichtigung hilft nur, wenn sich jemand anmeldet.
--   Liegt eine Woche niemand im Portal, liegt der Alarm eine Woche
--   ungelesen. Die Mail dazu kommt mit Etappe 3 ueber Resend
--   (docs/auftrag_arten_austritt_loeschen.md) — dort eingetragen, damit sie
--   nicht verlorengeht.
--
--
-- ⚠ DER TOTMANNSCHALTER — was passiert, wenn der WAECHTER ausfaellt
--
--   Ein Waechter in derselben Datenbank stirbt mit ihr. Faellt `pg_cron`
--   aus, wird die Extension deaktiviert oder der Auftrag geloescht, dann
--   schweigt er — und SCHWEIGEN IST VON ZUFRIEDENHEIT NICHT ZU
--   UNTERSCHEIDEN. Dasselbe Loch, eine Ebene hoeher.
--
--   Deshalb meldet er sich bei jedem Lauf bei healthchecks.io. Bleibt die
--   Meldung aus, schlaegt DER DIENST Alarm. Damit wird Schweigen zum Signal.
--
--   Was gepingt wird, ist NICHT bedingungslos:
--
--     alles in Ordnung   <url>        „geprueft, nichts zu melden"
--     Ausfall gefunden   <url>/fail   „geprueft, und es ist kaputt"
--     Waechter laeuft     — nichts —  healthchecks meldet nach der Frist
--       gar nicht
--
--   ⚠ Ein gefundener Ausfall ist KEIN Grund zu schweigen, aber auch keiner
--   fuer ein OK. Ein bedingungsloser Ping hiesse: „ich lebe" — und genau
--   das ist nicht die Frage, die healthchecks beantworten soll.
--
--   ⚠ UND DER PING GEHT UEBER pg_net — also ueber genau einen der drei
--   Wege, die am 20.08. versagt haben. Das ist unvermeidlich: einen Dienst
--   ausserhalb erreicht man nur ueber die Leitung. Faellt `pg_net` aus,
--   schweigt der Ping, und healthchecks meldet. DAS IST SOGAR DER
--   GEWUENSCHTE AUSGANG — der Totmannschalter deckt den Ausfall seines
--   eigenen Uebertragungswegs mit ab.
--
--
-- ANWEISUNG FUER DAS VAULT-SECRET steht am Ende der Datei.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ ⚠  ZUERST LESEN: ES GAB ZWEI WAECHTER, UND SIE SIND HIER ZUSAMMENGELEGT
--
--   Gemessen am 11.09.2026 in der laufenden Datenbank:
--
--     jobid  jobname                    schedule
--       3    sync-waechter-stuendlich   47 * * * *     ← dieser hier
--       9    sync-waechter              */30 * * * *   ← faellt weg
--
--   ⚠ cron.schedule PRUEFT NICHT, OB DIESELBE SACHE SCHON UNTER EINEM
--   ANDEREN NAMEN LAEUFT. Es ersetzt einen GLEICHNAMIGEN Auftrag — und legt
--   sonst einen zweiten an. Am 10.09.2026 bekam der Waechter beim Erweitern
--   einen neuen Namen, und der alte blieb still stehen. Zwei Wochen lang
--   haette niemand es gemerkt: beide liefen, beide meldeten, und die Regel
--   „nur wenn keine ungelesene steht" hat die Doppelmeldungen sogar
--   verdeckt.
--
--
-- ⚠ ⚠  UND KEINER DER BEIDEN KONNTE ALLES — die naheliegende Annahme
--       „der neuere gewinnt" war falsch:
--
--                                 Ausfall  Export  Nachlauf  Wachstum  Totmann
--     sync-waechter-stuendlich       ja      nein    nein       JA       JA
--     sync-waechter (*/30)           ja       JA      JA       nein     nein
--
--   Der Totmannschalter stand in genau einem. Wer „den neueren behaelt",
--   nimmt die einzige Einrichtung weg, die den Ausfall des Waechters SELBST
--   meldet — und Schweigen ist von Zufriedenheit nicht zu unterscheiden.
--
--   Behalten wird deshalb der STUENDLICHE (jobid 3): der Totmannschalter zu
--   verschieben ist riskanter als zwei Fragen zu verschieben, und
--   healthchecks.io ist auf „Period 1 hour" eingestellt. Ein */30-Takt
--   braechte nichts: die Export-Frage vergleicht ohnehin gegen eine Stunde.
--
--
-- REIHENFOLGE — ERST EINSPIELEN, DANN ENTFERNEN
--
--   Andersherum entstuende eine Luecke, in der gar kein Waechter laeuft.
--   Eine kurze Ueberschneidung ist dagegen folgenlos: beide pruefen vor dem
--   Schreiben auf eine ungelesene Meldung derselben Art.
--
--   1. den do $waechter$-Block unten ausfuehren
--   2. den Entfernungs-Block hier darunter ausfuehren
--   3. nachsehen, dass genau drei Auftraege bleiben
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHRITT 1 — was laeuft JETZT? (nur lesen)
--
-- ⚠ ⚠  DAS IST KEINE FORMALITAET, SONDERN DIE EINZIGE QUELLE.
--   Was in cron.job steht, ist eine Zeichenkette, die irgendwann einmal
--   eingespielt wurde. **Keine Pruefkette, kein Test, kein Deploy erreicht
--   sie.** Der einzige Weg zu wissen, was laeuft, ist cron.job zu lesen.
--   (Didi, 11.09.2026.)
--
--   Erwartete Laengen, aus den Dateien gerechnet — LF plus ein Byte je
--   Zeile, weil der Editor beim Einfuegen CRLF daraus macht:
--
--     sfv-sync-stuendlich             1035
--     wp-export-abholer               1395
--     sync-waechter-stuendlich       11932   ← nach diesem Einspielen
--     sync-log-aufraeumen-taeglich      34
--
--   ⚠ Weicht eine ab, laeuft dort etwas anderes als in der Datei steht —
--   und dann ist die Datei nicht die Wirklichkeit.
-- ═══════════════════════════════════════════════════════════════════════════

select jobid, jobname, schedule, active, length(command) as zeichen
  from cron.job
 order by jobid;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCHRITT 2 — BEIDE Waechter entfernen
--
-- ⚠ Beide Namen, nicht einer. Am 10.09.2026 bekam der Waechter beim
--   Erweitern einen neuen Namen, und cron.schedule ersetzt nur einen
--   GLEICHNAMIGEN Auftrag — der alte blieb stehen und meldete weiter.
--
-- ⚠ AS MATERIALIZED ist Pflicht: ohne das liefe die Funktion, die Zeilen
--   loescht, ueber genau die Tabelle, die gerade gelesen wird.
--
-- Die Ausgabe nennt jeden entfernten Auftrag beim Namen. KEINE Zeile heisst:
-- es gab keinen — dann stimmt die Annahme nicht, und Schritt 3 wartet.
-- ═══════════════════════════════════════════════════════════════════════════

with ziel as materialized (
  select jobid, jobname, schedule
    from cron.job
   where jobname in ('sync-waechter', 'sync-waechter-stuendlich')
)
select jobname, schedule, cron.unschedule(jobid) as entfernt
  from ziel;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCHRITT 3 — den EINEN anlegen (der Block darunter)
--
-- Er stellt VIER Fragen und traegt den Totmannschalter:
--
--   1  Ausfall    laeuft der Anschluss noch?      letzter_sync + sync_status
--   2  Export     wartet etwas, und wie lange?    export_wartet()
--   3  Nachlauf   kommt der Durchgang voran?      aelteste_holung_stunden
--   4  Paging     waechst eine Tabelle auf 1000?  n_live_tup + echte Zaehlung
--   +  Totmann    meldet den Ausfall des Waechters SELBST an healthchecks
--
-- ⚠ Der Block prueft nach dem Anlegen jede einzelne davon am GESPEICHERTEN
--   Befehl und bricht ab, wenn eine fehlt. cron.schedule speichert nur eine
--   Zeichenkette und prueft sie nicht.
-- ═══════════════════════════════════════════════════════════════════════════

do $waechter$
declare
  v_anz    int;
  v_befehl text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron ist nicht aktiviert (Dashboard → Database → Extensions)';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'pg_net ist nicht aktiviert — ohne ihn gibt es keinen Totmannschalter';
  end if;

  /* ⚠ ABBRECHEN statt einen Platzhalter anzulegen — dieselbe Falle wie in
     cron_sfv_sync.sql: ein Secret mit dem Platzhalter als Wert ergaebe einen
     gruenen Auftrag und stille Fehlschlaege. */
  /* Seit der Zusammenlegung am 11.09.2026 braucht der Waechter auch die
     Export-Frage. Fehlt sie, laeuft er stuendlich in einen Fehler. */
  if to_regprocedure('public.export_wartet(uuid)') is null then
    raise exception 'ABBRUCH: export_wartet() fehlt — erst migration_export_wartet.sql.';
  end if;

  if not exists (select 1 from vault.secrets where name = 'healthcheck_url') then
    raise exception 'ABBRUCH: healthcheck_url fehlt im Vault. Erst die Anweisung am Ende dieser Datei.';
  end if;

  perform cron.schedule(
    'sync-waechter-stuendlich',
    '47 * * * *',
    $job$
    do $lauf$
    declare
      r          record;
      v_url      text;
      v_ausfaell text[] := '{}';
      v_grund    text;
      v_neu      int := 0;
      /* ⚠ `v_anz` MUSS hier stehen. Sie war nur im aeusseren do-Block
         deklariert — und der laeuft nur EINMAL, beim Einrichten. Der Cron
         fuehrt diesen inneren Block allein aus, und dort war die Variable
         unbekannt: „v_anz is not a known variable", jede Stunde.

         ⚠ WARUM ES BEIM EINRICHTEN NICHT AUFFIEL: `cron.schedule` SPEICHERT
         die Zeichenkette nur — es parst und prueft sie nicht. Der Block lief
         ohne Abbruch durch und sagte damit NICHTS ueber den Befehl aus.
         Dieselbe Verwechslung wie „job_run_details succeeded", eine Ebene
         tiefer: abgesetzt ist nicht geprueft.

         Gefunden hat es der Probelauf, der den gespeicherten Befehl
         ausfuehrt (unten unter „Von Hand ausloesen"). Ohne ihn haette der
         Totmannschalter Alarm geschlagen — richtig, aber ohne zu sagen,
         warum. */
      v_anz      int;
      v_zeilen   bigint;
      v_ref      uuid;
      v_wartet   integer;
      v_alt      integer;
      v_kand     integer;
      v_schwelle integer;
    begin
      /* ── Pruefen: das PAAR, nicht die eine Spalte ──────────────────── */
      for r in
        select v.id, v.verein_id, v.key, v.label, v.sync_status,
               v.letzter_sync,
               round(extract(epoch from (now() - v.letzter_sync)) / 60)::int as minuten
          from public.api_verbindungen v
         where v.active is true and v.auto_sync is true
      loop
        v_grund := null;

        /* ⚠ ⚠ ZWEI ANSCHLUESSE, ZWEI FRAGEN — und wer sie gleich behandelt,
           bekommt fuer den einen einen Fehlalarm-Generator.

             SFV-Sync   hat einen TAKT (stuendlich)
                        → „wann lief er zuletzt?"
             Export     hat KEINEN Takt, er laeuft nach Bedarf
                        → „wartet etwas, und wie lange schon?"

           Zusammengelegt am 11.09.2026 aus cron_waechter_export.sql. */
        if r.key = 'wordpress' then
          v_wartet := public.export_wartet(r.verein_id);
          if v_wartet > 0 and (
               r.letzter_sync is null
               or r.letzter_sync < now() - interval '1 hour'
             ) then
            v_grund := v_wartet || ' Zeile(n) warten seit ueber einer Stunde '
                    || 'auf den Export. Der Abholer laeuft alle 15 Minuten — '
                    || 'er kommt also nicht durch.';
          elsif r.sync_status = 'fehler' then
            v_grund := 'Der letzte Export ist gescheitert.';
          end if;
        else
          if r.letzter_sync is null then
            v_grund := 'Es hat noch nie ein Lauf stattgefunden.';
          elsif r.minuten > 120 then
            v_grund := 'Der letzte Lauf ist ' || (r.minuten / 60) || ' Stunden her — erwartet wird stuendlich.';
          elsif r.sync_status = 'fehler' then
            v_grund := 'Der letzte Lauf ist gescheitert: ' || coalesce(r.sync_status, '?') || '.';
          end if;

          /* ⚠ DIE DRITTE FRAGE: kommt der rollende Nachlauf voran?
             Beide Werte aus dem juengsten Lauf, nicht neu gerechnet.
             Zusammengelegt am 11.09.2026 aus cron_waechter_nachlauf.sql.

             ⚠ ⚠ DIE SCHWELLE IST UNGEPRUEFT. Sie ist hergeleitet
             (Kandidaten / 2 Plaetze = Durchgangsdauer, Alarm beim
             Doppelten) und gegen KEINEN echten Wert gehalten: der einzige,
             den es gibt — 143 Stunden am 11.09.2026 —, stammt von VOR der
             Reparatur der Luecke im alt-Topf.

             ⚠ UND EINE STUFENSCHWELLE BEANTWORTET MOEGLICHERWEISE DIE
             FALSCHE FRAGE. aelteste_holung_stunden STEIGT waehrend eines
             Aufholens, also gerade dann, wenn der Nachlauf richtig
             arbeitet. Der Ausfallmodus ist nicht „die Zahl ist hoch",
             sondern „der Nachlauf bekommt keinen Platz" — messbar als
             kandidaten_alt = 0 ueber mehrere Laeufe. Offen seit dem
             11.09.2026, bis die Messung da ist.

             ⚠ Die 2 ist NACHLAUF_PLAETZE aus matchdaten.ts:787 — zwei Orte
             fuer eine Zahl, und dieser hier sieht die Konstante nicht. Wer
             die Plaetze erhoeht, bekommt eine Schwelle, die weiter durch 2
             teilt. Offen. */
          if v_grund is null then
            select (l.details->'matchdaten'->>'aelteste_holung_stunden')::int,
                   (l.details->'matchdaten'->>'kandidaten_gesamt')::int
              into v_alt, v_kand
              from public.api_sync_log l
             where l.verein_id = r.verein_id
               and l.details->'matchdaten' is not null
             order by l.gestartet_am desc
             limit 1;

            if v_alt is not null and v_kand is not null and v_kand > 0 then
              v_schwelle := (v_kand / 2) * 2;
              if v_alt > v_schwelle then
                v_grund := 'Der rollende Nachlauf kommt nicht voran: das am '
                        || 'laengsten nicht geholte Spiel ist ' || v_alt
                        || ' Stunden alt, erwartet waeren hoechstens '
                        || v_schwelle || ' (' || v_kand || ' Kandidaten, '
                        || '2 Plaetze je Lauf). ⚠ Diese Meldung sagt NICHTS '
                        || 'darueber, ob die geholten Daten stimmen.';
              end if;
            end if;
          end if;
        end if;

        if v_grund is null then continue; end if;
        v_ausfaell := v_ausfaell || (coalesce(r.label, r.key) || ': ' || v_grund);

        /* Nur wenn keine UNGELESENE Meldung zu diesem Anschluss steht —
           sonst naegt der Waechter stuendlich am selben Ausfall. */
        if exists (
          select 1 from public.benachrichtigungen b
           where b.verein_id = r.verein_id
             and b.referenz_typ = 'sync_ausfall'
             and b.referenz_id = r.id
             and b.gelesen is not true
        ) then continue; end if;

        insert into public.benachrichtigungen
               (verein_id, benutzer_id, type, title, content, referenz_typ, referenz_id)
        select r.verein_id, b.id, 'warnung',
               'Der Anschluss ' || coalesce(r.label, r.key) || ' meldet sich nicht',
               v_grund || ' Nachsehen: Portalverwaltung → API-Verbindungen. '
                 || 'Was zurueckkam, steht in net._http_response — 401 heisst Gateway, '
                 || '200 ohne Zeile in api_sync_log heisst die Function.',
               'sync_ausfall', r.id
          from public.benutzer b
         where b.ist_admin is true and b.aktiv is not false;
        get diagnostics v_anz = row_count;
        v_neu := v_neu + v_anz;
      end loop;

      /* Der eigene Zeitstempel — gelesen von der API-Kachel (ApiTab). */
      update public.api_verbindungen set wache_zuletzt = now() where active is true;


      /* ── Zweite Frage: waechst eine Tabelle auf die 1000 zu? ────────── */
      /*
         ⚠ EINE ANDERE FRAGE ALS DER REST DIESER DATEI, und deshalb steht
         sie NICHT in `v_ausfaell`: eine wachsende Tabelle ist kein Ausfall.
         Wuerde sie den Totmannschalter auf `/fail` schicken, stuende
         healthchecks dauerhaft rot — und ein dauerhaft rotes Pruefmittel
         ist keines mehr.

         ⚠ WARUM SIE HIER STEHT UND NICHT IN EINEM EIGENEN AUFTRAG: dieser
         Block laeuft ohnehin, mit vollem SQL-Zugriff, und ein zweiter
         Cron-Auftrag waere ein zweites Ding, das still ausfallen kann.

         ⚠ UND WARUM VOR DEM PING: wirft diese Schleife, unterbleibt der
         Ping, und healthchecks meldet nach der Nachfrist. Ein Fehler hier
         ist damit LAUT. Stuende sie danach, ginge erst das „ok" hinaus und
         der Fehlschlag bliebe in cron.job_run_details liegen.
      */
      for r in
        /* ⚠ `n_live_tup` ist eine SCHAETZUNG des Statistiksammlers, keine
           Zaehlung — nach einem grossen Insert kann sie nachhinken. Sie ist
           deshalb nur der billige VORFILTER, mit 200 Zeilen Reserve unter
           der Schwelle. Entschieden wird auf einer echten Zaehlung. */
        select c.relname from pg_stat_user_tables c
         where c.schemaname = 'public' and c.n_live_tup > 600
         order by c.relname
      loop
        execute format('select count(*) from public.%I', r.relname) into v_zeilen;
        if v_zeilen <= 800 then continue; end if;

        /* ⚠ Zeigt auf KEINE Zeile. Es ist ein aus dem Tabellennamen
           abgeleiteter, stabiler Schluessel — nur damit die Regel „je
           Tabelle hoechstens einmal" ueberhaupt greifen kann. */
        v_ref := md5('tabelle:' || r.relname)::uuid;

        insert into public.benachrichtigungen
               (verein_id, benutzer_id, type, title, content, referenz_typ, referenz_id)
        select b.verein_id, b.id, 'warnung',
               'Die Tabelle ' || r.relname || ' hat ' || v_zeilen || ' Zeilen',
               'PostgREST liefert hoechstens 1000 Zeilen und meldet das nicht: '
                 || 'error bleibt null, data hat genau 1000. Wer diese Tabelle '
                 || 'liest, muss pagen — alleSeiten() in src/domains/db/alleSeiten.ts. '
                 || 'Ob sie irgendwo ungepagt gelesen wird, sagt diese Meldung '
                 || 'NICHT; das steht im Code. Kommt sie fuer eine Tabelle, die '
                 || 'laengst gepagt gelesen wird, ist sie gegenstandslos.',
               'tabelle_gross', v_ref
          from public.benutzer b
         where b.ist_admin is true and b.aktiv is not false
           /* ⚠ OHNE `gelesen` — anders als beim Ausfall oben, und das ist
              der Unterschied zwischen einem ZUSTAND und einem EREIGNIS:
              ein Ausfall wird behoben und darf wiederkommen. Eine Tabelle
              faellt nie wieder unter 800. Mit der Ausfall-Regel naegte die
              Meldung nach jedem Lesen erneut — und nach dem dritten Mal
              schaltet sie jemand ab. */
           and not exists (
             select 1 from public.benachrichtigungen x
              where x.verein_id = b.verein_id
                and x.referenz_typ = 'tabelle_gross'
                and x.referenz_id = v_ref);
        get diagnostics v_anz = row_count;
        v_neu := v_neu + v_anz;
      end loop;

      /* ── Totmannschalter ───────────────────────────────────────────── */
      select decrypted_secret into v_url
        from vault.decrypted_secrets where name = 'healthcheck_url';

      if v_url is not null then
        /* ⚠ `application/json` ist Pflicht: `net.http_post` nimmt eine jsonb
           und weist alles andere ab („Content-Type header must be
           application/json"). Mit `text/plain` scheiterte der Ping — und
           damit haette der Totmannschalter geschwiegen, obwohl der Waechter
           lief. Der schlimmste denkbare Ausgang: healthchecks haette Alarm
           geschlagen fuer einen Waechter, der seine Arbeit tat.

           healthchecks.io nimmt jeden Rumpf und zeigt ihn im Protokoll —
           ein kleines Objekt liest sich dort besser als eine Zeichenkette. */
        perform net.http_post(
          url     := case when array_length(v_ausfaell, 1) is null
                          then v_url else v_url || '/fail' end,
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body    := jsonb_build_object(
                       'meldung', case when array_length(v_ausfaell, 1) is null
                                       then 'ok' else array_to_string(v_ausfaell, ' | ') end,
                       'neue_meldungen', v_neu),
          timeout_milliseconds := 10000);
      end if;
    end $lauf$;
    $job$);

  select count(*) into v_anz from cron.job where jobname = 'sync-waechter-stuendlich';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: Waechter nicht angelegt'; end if;

  /* ⚠ cron.schedule SPEICHERT NUR EINE ZEICHENKETTE. Dass der Auftrag da
     ist, sagt nichts darueber, WAS darin steht — am 21.08.2026 lief das
     Einrichten zweimal fehlerfrei durch und hinterliess einen Befehl, der
     stuendlich scheiterte. Deshalb je Frage eine Probe. */
  select command into v_befehl from cron.job where jobname = 'sync-waechter-stuendlich';
  if v_befehl not ilike '%letzter_sync%'            then raise exception 'UNVOLLSTAENDIG: Frage 1 (Ausfall) fehlt'; end if;
  if v_befehl not ilike '%export_wartet%'           then raise exception 'UNVOLLSTAENDIG: Frage 2 (Export) fehlt'; end if;
  if v_befehl not ilike '%aelteste_holung_stunden%' then raise exception 'UNVOLLSTAENDIG: Frage 3 (Nachlauf) fehlt'; end if;
  if v_befehl not ilike '%n_live_tup%'              then raise exception 'UNVOLLSTAENDIG: Frage 4 (Wachstum) fehlt'; end if;
  if v_befehl not ilike '%healthcheck_url%'         then raise exception 'UNVOLLSTAENDIG: der Totmannschalter fehlt'; end if;

  /* Die Spalte, die der Waechter schreibt und die Kachel liest. */
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='api_verbindungen'
                    and column_name='wache_zuletzt') then
    raise exception 'UNVOLLSTAENDIG: wache_zuletzt fehlt — erst migration_sync_waechter.sql';
  end if;

  raise notice 'Waechter steht: stuendlich zur Minute 47.';
end $waechter$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCHRITT 4 — GEGENPROBE: genau ein Waechter, und er stellt alle Fragen
--
-- ⚠ Als select, nicht als raise notice: der Supabase-Editor zeigt NOTICE
--   nicht an, und eine Bestaetigung, die niemand sieht, ist keine.
-- ═══════════════════════════════════════════════════════════════════════════

-- (a) GENAU EINE Zeile, mit 11932 Zeichen.
select jobid, jobname, schedule, length(command) as zeichen
  from cron.job
 where jobname like '%waechter%';

-- (b) Alle vier Fragen und der Totmannschalter muessen auf true stehen.
select f.frage, position(f.marke in j.command) > 0 as steht_drin
  from cron.job j
 cross join (values
   ('1 Ausfall ', 'letzter_sync'),
   ('2 Export  ', 'export_wartet'),
   ('3 Nachlauf', 'aelteste_holung_stunden'),
   ('4 Paging  ', 'n_live_tup'),
   ('+ Totmann ', 'healthcheck_url')
 ) as f(frage, marke)
 where j.jobname = 'sync-waechter-stuendlich'
 order by 1;

-- (c) Und alle Auftraege gegen ihre Dateilaenge:
--       sfv-sync-stuendlich 1035 · wp-export-abholer 1395
--       sync-waechter-stuendlich 11932 · sync-log-aufraeumen-taeglich 34
select jobid, jobname, schedule, length(command) as zeichen
  from cron.job
 order by jobid;


-- ─── Nachschauen ───────────────────────────────────────────────────────────
-- Lief der Waechter?
--   select wache_zuletzt at time zone 'Europe/Zurich', key
--     from public.api_verbindungen where active;
--
-- Hat er etwas gemeldet?
--   select created_at at time zone 'Europe/Zurich', title, gelesen
--     from public.benachrichtigungen
--    where referenz_typ = 'sync_ausfall' order by created_at desc limit 10;
--
-- Was er ueber die Tabellengroessen gemeldet hat:
--   select created_at at time zone Europe/Zurich, title, gelesen
--     from public.benachrichtigungen
--    where referenz_typ = tabelle_gross order by created_at desc;
--
-- ⚠ VOR DEM EINSPIELEN EINMAL VON HAND, damit der erste Lauf keine
--   Ueberraschung ist — eine Schwelle gehoert gegen einen echten Fall
--   gehalten, nicht gegen eine Erwartung:
--   select relname, n_live_tup from pg_stat_user_tables
--    where schemaname = public and n_live_tup > 600 order by 2 desc;
--
-- Was healthchecks bekommen hat:
--   select status_code, left(content,80), created at time zone 'Europe/Zurich'
--     from net._http_response order by created desc limit 5;
--   (Zwei Eintraege pro Stunde sind normal: einer vom Sync, einer vom Ping.)


-- ─── Von Hand ausloesen, zum Ausprobieren ──────────────────────────────────
--   select cron.schedule('waechter-jetzt', '* * * * *',
--     (select command from cron.job where jobname = 'sync-waechter-stuendlich'));
--   -- eine Minute warten, dann:
--   select cron.unschedule('waechter-jetzt');


-- ═══════════════════════════════════════════════════════════════════════════
-- ANWEISUNG — die Totmannschalter-URL in den Vault (einmalig, von Hand)
--
-- ⚠ NICHT MIT DEM WERT EINCHECKEN. Diese Datei liegt im Repo.
--
-- 1. Auf healthchecks.io einen Check anlegen:
--      Name      ClubCampus SFV-Sync-Waechter
--      Period    1 hour        (so oft meldet sich der Waechter)
--      Grace     20 minutes    (Nachfrist, bevor Alarm ausgeloest wird)
--
--    Die Ping-URL sieht aus wie https://hc-ping.com/<uuid> — OHNE Schraegstrich
--    am Ende, der Waechter haengt bei einem Fund `/fail` an.
--
-- 2. In den Vault legen:
--
--      select vault.create_secret(
--        'HIER_DIE_PING_URL',
--        'healthcheck_url',
--        'Totmannschalter des Sync-Waechters — Schweigen loest dort Alarm aus');
--
--    Ersetzen statt anlegen, falls sie schon da und falsch ist:
--
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'healthcheck_url'),
--        'HIER_DIE_RICHTIGE_URL');
--
-- 3. `migration_sync_waechter.sql` ausfuehren (legt `wache_zuletzt` an),
--    dann den `do $waechter$`-Block oben.
--
-- ⚠ REIHENFOLGE: erst die Migration, dann dieser Block. Der Block prueft es
--    und bricht sonst ab — die Spalte fehlt, und ohne sie schriebe der
--    Waechter jede Stunde in eine Spalte, die es nicht gibt.
-- ═══════════════════════════════════════════════════════════════════════════
