-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der Nachlauf des WordPress-Exports
-- 26.09.2026
--
-- ⚠ ⚠  DER ANLASS: EINE AENDERUNG KANN VERSCHLUCKT WERDEN.
--
--   Ein Export-Lauf schafft im Zeitbudget rund 7 von 21 Mannschaften
--   (`EXPORT_BUDGET_MS`, wp-export/index.ts). Die uebrigen stehen als
--   `details.offen_teams` im Protokoll und gehen beim naechsten Lauf
--   zuerst hinaus — seit dem 26.09.2026 wirklich (`ordneOffeneNachVorn`).
--
--   Am Ende JEDES Laufs setzt `wp-export/index.ts:1229` aber
--   `api_verbindungen.letzter_sync` auf `now()`, **unabhaengig davon, ob
--   Mannschaften offen geblieben sind**. Und `export_wartet()` zaehlt
--   genau gegen diesen Stempel.
--
--     Aenderung an Mannschaft 20
--       → Lauf, kommt bis Mannschaft 7
--       → letzter_sync = now()
--       → export_wartet() = 0
--       → der Abholer feuert nicht mehr
--       → Mannschaft 20 wartet auf die NAECHSTE Datenaenderung
--
--   Auf der Website steht dann ein alter Stand, und nichts meldet es.
--   Dieselbe Familie wie „ein Ausfall in der Verkleidung einer Datenlage":
--   „es wartet nichts" und „ich habe nicht nachgesehen" sehen gleich aus.
--
-- ── ⚠ WARUM NICHT EINFACH „solange offen_teams nicht leer ist" ────────────
--
--   Weil `offen_teams` sich NIE leert. Gemessen an zwei Stellen:
--
--     wp-export/index.ts:998   for (let r = ix; r < teile.length; r++)
--                              schreibt ALLES ab der Abbruchstelle hinein,
--                              auch Mannschaften, die dieser Lauf nie
--                              angefasst hat
--     wpExportReihenfolge.test.ts:167
--                              erwartet [14, 14, 14] ueber drei Laeufe
--
--   `teile` entsteht in jedem Lauf aus ALLEN Spielen
--   (`teileNachTeam(alle)`, index.ts:849) — ein Lauf ist eine vollstaendige
--   Momentaufnahme, kein Nachtrag. Es sind also immer 21 Teile und immer
--   rund 14 offen. **Eine Bedingung auf „offen ist nicht leer" feuerte alle
--   15 Minuten, fuer immer** — auch im Winter, wenn sich seit Wochen
--   nichts geaendert hat. Eine Einrichtung, die immer anschlaegt, wird
--   abgeschaltet, und dann fehlt auch die, die sie haette sein koennen.
--
--   „offen" heisst „dieser Lauf hat sie nicht angefasst", nicht „sie ist
--   im Rueckstand". Der Testkommentar sagt es woertlich: es ist eine
--   Rotation, keine Abarbeitung.
--
-- ── DIE FRAGE, DIE STATTDESSEN ZAEHLT ─────────────────────────────────────
--
--   Nicht „ist etwas offen?", sondern:
--
--     HAT SEIT DER LETZTEN DATENAENDERUNG JEDE MANNSCHAFT EINMAL
--     AN DER REIHE GEWESEN?
--
--   Die Rotation braucht dafuer `ceil(21 / 7) = 3` Laeufe. Diese Zahl
--   steht hier NICHT als Konstante — sie wird aus dem letzten Lauf
--   GERECHNET: erledigte Mannschaften und offene stehen beide im
--   Protokoll. Verschiebt sich das Budget oder werden es mehr
--   Mannschaften, waechst die Zahl mit, ohne dass jemand daran denkt.
--
--   ⚠ Damit ist der Nachlauf BEGRENZT: nach einer Aenderung laeuft der
--   Export so oft, wie die Rotation braucht — und dann nicht mehr. Kein
--   Dauerfeuer, keine 96 Protokollzeilen je Tag.
--
-- ── ⚠ WARUM EINE ZWEITE FUNKTION UND NICHT `export_wartet()` ──────────────
--
--   `export_wartet()` beantwortet eine Frage ueber DATEN („wie viele
--   Zeilen haben sich geaendert?"). „Eine Mannschaft war noch nicht an
--   der Reihe" ist eine Frage ueber den LETZTEN LAUF. Zwei Fragen in eine
--   Funktion zu legen, deren Name die eine nennt, ergibt genau den
--   Zaehler, dessen Name mehr behauptet als er misst.
--
--   ⚠ Und `export_wartet()` hat einen zweiten Leser: den Sync-Waechter
--   (`cron_sync_waechter.sql:309`, Frage 2). Wer ihre Bedeutung aendert,
--   aendert sie fuer ihn mit — und dort heisst sie „so viele Zeilen
--   warten seit ueber einer Stunde". Ein Rueckstand aus der Rotation ist
--   kein wartender Datensatz; er gehoerte dort falsch beschriftet.
--
--   Deshalb: `export_wartet()` bleibt Zeichen fuer Zeichen, wie sie ist.
--
-- ── Was diese Funktion NICHT sagt ─────────────────────────────────────────
--
--   · WELCHE Mannschaft im Rueckstand ist. Dafuer braeuchte es einen
--     Stand je Mannschaft; siehe den offenen Punkt am Ende.
--   · Ob eine Mannschaft GESCHEITERT ist. Ein Fehlschlag steht nicht in
--     `offen_teams` und gilt hier als erledigt — der Lauf hat sie
--     angefasst. Gemeldet wird er ueber `sync_status = 'fehler'`.
--   · Ob die Rotation wirklich greift. Sie zaehlt Runden, sie prueft sie
--     nicht. Das tut `wpExportReihenfolge.test.ts`.
-- ═══════════════════════════════════════════════════════════════════════════


create or replace function public.export_nachlauf_faellig(p_verein_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $nachlauf$
  with aenderung as (
    -- Wann hat sich zuletzt INHALTLICH etwas geaendert? Dieselben vier
    -- Quellen wie export_wartet() — wer dort eine ergaenzt, ergaenzt sie
    -- hier mit, sonst zaehlt der Nachlauf gegen einen zu alten Zeitpunkt.
    select greatest(
             coalesce((select max(s.zuletzt_geaendert) from public.spiele s
                        where s.verein_id = p_verein_id), '-infinity'::timestamptz),
             coalesce((select max(r.zuletzt_geaendert) from public.ranglisten r
                        where r.verein_id = p_verein_id), '-infinity'::timestamptz),
             coalesce((select max(a.zuletzt_geaendert) from public.spiel_aufstellung a
                        where a.verein_id = p_verein_id), '-infinity'::timestamptz),
             coalesce((select max(e.zuletzt_geaendert) from public.spiel_ereignisse e
                        where e.verein_id = p_verein_id), '-infinity'::timestamptz)
           ) as seit
  ),
  -- ⚠ WIE VIELE MANNSCHAFTEN EIN LAUF SCHAFFT — gemessen am juengsten
  --   abgeschlossenen Lauf, nicht geschaetzt.
  --
  --   `jsonb_typeof(...) = 'array'` prueft die Anwesenheit gleich mit: ein
  --   fehlender Schluessel ergibt NULL, und NULL ist kein 'array'. Damit
  --   faellt eine Zeile im Zustand `laeuft` (details noch ohne
  --   offen_teams) heraus, statt als „nichts offen" durchzugehen — und
  --   eine LEERE Liste bleibt von einer FEHLENDEN unterscheidbar.
  kalibrierung as (
    select (l.details->>'teams_gesendet')::int
             + coalesce((l.details->>'teams_gescheitert')::int, 0) as erledigt,
           jsonb_array_length(l.details->'offen_teams')            as offen
      from public.api_sync_log l
     where l.verein_id = p_verein_id
       and l.aktion = 'export'
       and l.beendet_am is not null
       and jsonb_typeof(l.details->'offen_teams') = 'array'
     order by l.gestartet_am desc
     limit 1
  ),
  -- Abgeschlossene Export-Laeufe, die NACH der Aenderung begonnen haben.
  -- Wer vorher begonnen hat, kann sie fuer die Mannschaften, die er
  -- anfasste, nicht gesehen haben.
  laeufe as (
    select count(*) as anzahl
      from public.api_sync_log l, aenderung a
     where l.verein_id = p_verein_id
       and l.aktion = 'export'
       and l.beendet_am is not null
       and l.gestartet_am > a.seit
  )
  select case
    -- Noch nie eine Aenderung: nichts zu tun.
    when (select seit from aenderung) = '-infinity'::timestamptz
      then false
    -- Noch kein Lauf mit `offen_teams` im Protokoll: nicht messbar. Dann
    -- bleibt es beim bisherigen Verhalten (nur export_wartet), statt eine
    -- Zahl zu erfinden.
    when (select erledigt from kalibrierung) is null
      then false
    -- Ein Lauf, der keine einzige Mannschaft geschafft hat, sagt nichts
    -- darueber, wie viele Runden noetig sind — und ein weiterer Lauf
    -- schaffte es genauso wenig. Sichtbar machen statt endlos feuern.
    when (select erledigt from kalibrierung) < 1
      then false
    else (select anzahl from laeufe)
         < ceil((select (erledigt + offen)::numeric / erledigt from kalibrierung))
  end;
$nachlauf$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RECHTE — dieselben wie bei `export_wartet()`, und zwar ausdruecklich
--
-- ⚠ ⚠  EINE `security definer`-FUNKTION IST OHNE DIESE ZEILEN FUER JEDEN
--   AUSFUEHRBAR. PostgreSQL vergibt EXECUTE an PUBLIC als Vorgabe — auch an
--   `anon`, also an jeden, der den publishable key aus dem Bundle liest.
--
--   `migration_export_wartet_rechte.sql:255-259` hat das fuer die
--   Schwesterfunktion bereits geklaert: entzogen von `public` und `anon`,
--   gewaehrt nur `authenticated`. Diese hier liest DIESELBEN Tabellen
--   (`api_sync_log` samt `details`, und die vier Quellen) und umgeht als
--   `security definer` ebenso die RLS. Sie ohne Rechtezeile zu lassen
--   hiesse, die Entscheidung von damals fuer eine zweite Tuer nicht zu
--   treffen — und eine offene Tuer neben einer verschlossenen faellt
--   niemandem auf, weil beide gleich aussehen.
--
-- ⚠ Der cron-Auftrag ist davon nicht betroffen: er laeuft unter der Rolle,
--   die ihn angelegt hat (postgres), und die braucht kein grant.
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on function public.export_nachlauf_faellig(uuid) from public;
revoke all on function public.export_nachlauf_faellig(uuid) from anon;
grant execute on function public.export_nachlauf_faellig(uuid) to authenticated;

comment on function public.export_nachlauf_faellig(uuid) is
  'Ist nach der letzten Datenaenderung noch eine Runde des WordPress-Exports offen? Ein Lauf schafft nur einen Teil der Mannschaften und setzt trotzdem letzter_sync — danach steht export_wartet() auf 0, und der Rest der Rotation bliebe liegen. Die Zahl der noetigen Runden wird aus dem juengsten Protokolleintrag GERECHNET (erledigt + offen / erledigt), nicht als Konstante gefuehrt. ⚠ Sagt NICHT, welche Mannschaft im Rueckstand ist, und zaehlt eine gescheiterte Mannschaft als erledigt. Angelegt 26.09.2026.';


-- ═══════════════════════════════════════════════════════════════════════════
-- BERICHT — als `select`, nicht als `raise notice`
--
-- ⚠ Der Supabase-SQL-Editor zeigt `notice` nicht an. Eine Migration, die
--   ihre Arbeit meldet, meldet sie als Zeile — sonst steht dort „Success.
--   No rows returned", und das heisst: ich habe dir nichts gesagt.
--
-- Wiederholbar: `create or replace` ist idempotent, der Bericht liest nur.
-- Ein zweiter Lauf zeigt dieselbe Zeile und aendert nichts.
-- ═══════════════════════════════════════════════════════════════════════════

select v.key,
       public.export_wartet(v.verein_id)          as wartet_zeilen,
       public.export_nachlauf_faellig(v.verein_id) as nachlauf_faellig,
       v.letzter_sync,
       -- Die Kalibrierung zum Mitlesen: woraus die Rundenzahl entsteht.
       (select (l.details->>'teams_gesendet')::int
          from public.api_sync_log l
         where l.verein_id = v.verein_id and l.aktion = 'export'
           and l.beendet_am is not null
           and jsonb_typeof(l.details->'offen_teams') = 'array'
         order by l.gestartet_am desc limit 1)     as letzte_runde_erledigt,
       (select jsonb_array_length(l.details->'offen_teams')
          from public.api_sync_log l
         where l.verein_id = v.verein_id and l.aktion = 'export'
           and l.beendet_am is not null
           and jsonb_typeof(l.details->'offen_teams') = 'array'
         order by l.gestartet_am desc limit 1)     as letzte_runde_offen
  from public.api_verbindungen v
 where v.key = 'wordpress';

-- ⚠ ERWARTUNG BEIM EINSPIELEN — und was welche Zeile heisst:
--
--   letzte_runde_erledigt leer  →  es gibt noch keinen Lauf mit
--                                  `offen_teams`. `nachlauf_faellig` ist
--                                  dann false, und das ist richtig: die
--                                  Zahl waere geraten. Nach dem ersten
--                                  Lauf noch einmal nachsehen.
--   erledigt 7 · offen 14       →  drei Runden noetig. Nach einer
--                                  Aenderung feuert der Abholer bis zu
--                                  dreimal und dann nicht mehr.
--   offen 0                     →  ein Lauf schafft alles. Dann ist eine
--                                  Runde genug, und diese Funktion sagt
--                                  nach dem ersten Lauf false.
--
-- ⚠ NICHT EINGESPIELT HEISST NICHT UNWIRKSAM: `cron_wp_export.sql` bricht
--   ab, wenn diese Funktion fehlt. Reihenfolge ist also: erst diese
--   Migration, dann die Cron-Datei. Umgekehrt bleibt der alte Auftrag
--   unveraendert stehen und der Defekt bestehen — ohne Fehlermeldung.


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ OFFENER PUNKT — die saubere Fassung braucht einen Stand JE MANNSCHAFT
--
--   Diese Funktion zaehlt RUNDEN. Sie kann nicht sagen, welche Mannschaft
--   im Rueckstand ist, und sie glaubt der Rotation, dass jede Runde andere
--   Mannschaften anfasst. Beides ist heute gedeckt
--   (`ordneOffeneNachVorn` samt Fall), aber es ist eine Annahme ueber eine
--   andere Stelle — und genau die Sorte, die dieses Projekt teuer bezahlt.
--
--   Die truehafte Frage lautet: **hat sich an dieser Mannschaft etwas
--   geaendert, seit sie zuletzt erfolgreich hinausging?** Sie braucht
--   einen Zeitstempel je Mannschaft — etwa `teams.wp_export_stand`, den
--   `sendeTeil()` nach jedem erfolgreichen POST setzt.
--
--   ⚠ Das ist eine Aenderung an der Edge Function, also ein Deploy, und
--     gehoert in einen eigenen Auftrag. Beim Bauen zu beachten:
--
--     · Reihenfolge: Spalte zuerst, Deploy danach. Umgekehrt schriebe die
--       Function in eine Spalte, die es nicht gibt.
--     · Zwischenzustand: solange die Function sie nicht setzt, ist sie
--       ueberall NULL. „Geaendert seit NULL" ist fuer JEDE Mannschaft
--       wahr — eine Bedingung darauf feuerte alle 15 Minuten. NULL muss
--       deshalb „nicht feststellbar, also nicht faellig" heissen.
--     · Zuordnung: eine Zeile in `spiel_aufstellung`/`spiel_ereignisse`
--       traegt die `sfv_team_id` DER SEITE, zu der der Spieler gehoert —
--       bei einer Gegnerzeile also eine fremde. Wer je Mannschaft
--       vergleicht, geht ueber `spiele.sfv_team_id` und den `spiel_id`,
--       nicht ueber die `sfv_team_id` der Zeile. Sonst faellt jede
--       Aenderung an einer Gegnerzeile durch.
--
-- ⚠ UND EIN ZWEITER BEFUND, DER HIER NICHT BEHOBEN WIRD:
--
--   Der Sync-Waechter (`cron_sync_waechter.sql:309`) fragt fuer den Export
--   ausschliesslich `export_wartet() > 0` UND `letzter_sync` aelter als
--   eine Stunde. Weil jeder Lauf `letzter_sync` setzt und
--   `export_wartet()` damit auf 0 faellt, **kann dieser Alarm fuer einen
--   Rueckstand aus der Rotation nie ausloesen.** Er ist gegen den Fall
--   blind, den diese Migration behebt. Ihn zu erweitern ist ein eigener
--   Entscheid: eine Meldung, die nach jedem Teillauf anschlaegt, waere
--   der Fehlalarm-Generator, den der Waechter ausdruecklich vermeiden
--   will.
-- ═══════════════════════════════════════════════════════════════════════════
