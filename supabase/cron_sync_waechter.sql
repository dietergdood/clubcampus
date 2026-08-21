-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC-WAECHTER
-- 21.08.2026
--
-- Meldet, wenn der SFV-Sync ausfaellt.
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

do $waechter$
declare
  v_anz int;
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
        if r.letzter_sync is null then
          v_grund := 'Es hat noch nie ein Lauf stattgefunden.';
        elsif r.minuten > 120 then
          v_grund := 'Der letzte Lauf ist ' || (r.minuten / 60) || ' Stunden her — erwartet wird stuendlich.';
        elsif r.sync_status = 'fehler' then
          v_grund := 'Der letzte Lauf ist gescheitert: ' || coalesce(r.sync_status, '?') || '.';
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

  /* Die Spalte, die der Waechter schreibt und die Kachel liest. */
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='api_verbindungen'
                    and column_name='wache_zuletzt') then
    raise exception 'UNVOLLSTAENDIG: wache_zuletzt fehlt — erst migration_sync_waechter.sql';
  end if;

  raise notice 'Waechter steht: stuendlich zur Minute 47.';
end $waechter$;


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
