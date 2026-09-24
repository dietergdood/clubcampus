/* ══════════════════════════════════════════════════════════════════════
   Warum zeigen die ALTEN Spiele die Rolle nicht? — GENAU EINE ABFRAGE
   Angelegt am 24.09.2026. SIE LIEST NUR.

   Anlass: FC Herrliberg 1 – FC Pfaeffikon 1 vom 22.09.2026 zeigt bei der
   gelben Karte „Trainer/in" mit Namen — die Kette traegt. FC Herrliberg 2
   – FC Maennedorf 1 vom 29.08.2026 (sfv_match_id 4382013) zeigt nur
   „FC Maennedorf".

   ⚠ Das ist eine FREMDE Zeile. `rolle_kategorie_id` wird fuer BEIDE
     Seiten geschrieben (`matchdaten.ts:320`, ohne `eigen ?`-Riegel),
     `person_name` nur fuer eigene (`:322`) — und
     `spiel_ereignisse_fremde_anonym_check` erzwingt das zusaetzlich in
     der Datenbank. Erwartet waere also „Trainer/in FC Maennedorf" OHNE
     Personennamen. Dass die Rolle fehlt, ist der Befund; dass der Name
     fehlt, ist die Regel.

   ⚠ ⚠  EINE ANWEISUNG, EIN ERGEBNIS. `with` und `union all`, aber ein
         Aufruf — sieben Abschnitte in einer Tabelle, `nr` sortiert sie.
         Die Spalten 4 bis 7 tragen je Abschnitt verschiedene Groessen;
         die Ueberschrift steht deshalb IM Wert („0 von 19 …"), nicht im
         Spaltennamen. Eine Zahl ohne Bezugsgroesse ist ein Artefakt.

   ⚠ ⚠  DER ENTSCHEID STEHT OBEN (nr = 0), NICHT UNTEN.
         Am 14.09.2026 hat eine beruhigende Kopfzahl das Detail daneben
         erstickt; hier ist es umgekehrt gebaut. `befund` in Abschnitt 0
         nennt A oder B im Klartext, und alles darunter ist der Beleg, an
         dem man ihn nachrechnet. Wer nur die erste Gruppe liest, hat die
         Antwort — wer sie anzweifelt, findet die Zahlen darunter.

   ── WAS AM CODE SCHON GEMESSEN IST, damit niemand es noch einmal sucht ─

   1  DER EXPORT HAT KEIN ZEITFENSTER. `wp-export/index.ts:2109-2114`
      liest `.not("sfv_match_id","is",null).order("date")` — kein `gte`
      auf `date`. Ein Spiel vom 29.08. geht bei JEDEM Lauf hinaus.
      ⚠ „Es ist zu alt" ist damit ausgeschlossen.

   2  DER SPIELETEIL IST FERTIG, BEVOR DER WAPPENBLOCK BEGINNT.
      Protokollzeile, `letzter_sync` und `sync_status` stehen in
      `index.ts:986-1005`, der Wappenblock erst in `:676`ff. Ein
      `IDLE_TIMEOUT` in den Wappen kostet die ANTWORT und die Wappen,
      nicht die Verlaufszeilen. Und `WAPPEN_BUDGET_MS` gilt nur dort —
      die Spiele-Schleife hat kein Zeitbudget.

   3  DIE DREI NEUEN FELDER STEHEN IN `VERLAUF_VERGLEICH`
      (`matchdatenLauf.ts:391-395`). Ein Neuabruf ERSETZT die Zeilen
      also, weil `null` gegen `3` verschieden ist — er laesst sie nicht
      stehen.

   4  ⚠ ⚠  UND `export_wartet()` SIEHT `spiel_ereignisse` — ABER NUR IN
      DER DATENBANK, NICHT IM PAPIER.

      `supabase/migration_export_wartet.sql:125` zaehlt ZWEI Quellen:
      `spiele` und `ranglisten`. `supabase/schema.sql:105` — also der
      Dump, und der ist der Stand der laufenden Datenbank — zaehlt VIER:
      `spiele`, `ranglisten`, `spiel_aufstellung`, `spiel_ereignisse`.

      **Wo zwei Beschreibungen streiten, gilt die, die keine Beschreibung
      ist.** Der Dump ist erzeugt, die Migration ist ein Schritt dorthin;
      also gilt VIER, und die Migrationsdatei ist der aeltere Stand.

      ⚠ Das ist keine Spitzfindigkeit, sondern der Unterschied zwischen
      „wartet" und „kann nicht warten": `stempel_zuletzt_geaendert()`
      nimmt `matchdaten_geholt_am` AUSDRUECKLICH aus dem Vergleich
      (`migration_export_wartet.sql:85-88`). Ein reiner Matchdaten-Abruf
      an einem alten Spiel aendert an `spiele` also nichts Zaehlbares —
      `spiele.zuletzt_geaendert` bleibt stehen. Bemerkt wird er allein
      ueber `spiel_ereignisse.zuletzt_geaendert` und
      `spiel_aufstellung.zuletzt_geaendert`.

      Mit der Zwei-Quellen-Fassung waere der Abholer strukturell blind
      gewesen — er haette den Neuabruf NIE bemerkt, und Kandidat B waere
      nicht „es ist noch keiner gelaufen", sondern „es kann keiner
      laufen". Mit der Vier-Quellen-Fassung ist Abschnitt 0 die richtige
      Frage. **Abschnitt 5 misst es trotzdem nach, statt diesem Absatz zu
      glauben.**

   ── WAS DIE ABFRAGE NICHT BEANTWORTEN KANN ────────────────────────────

   ⚠ Ob drueben etwas steht. Sie liest unsere Datenbank; was WordPress
     zeigt, sagt nur die Gegenstelle. Ein „gefuellt und hinaus" unten
     heisst: wir haben es gesendet — nicht, dass es angekommen ist.

   ⚠ Und der Export ZAEHLT die Rollen nicht. In `fuersProtokoll()` gibt
     es kein `verlauf_mit_rolle` (geprueft am 24.09.2026: es gibt nur
     `aufstellung_rollen`, und das ist die Aufstellung). Das Protokoll
     kann die Frage also nicht beantworten, auch nicht rueckblickend —
     deshalb steht sie hier als Abfrage und nicht als Protokollspalte.

   ── FALLEN, DIE HIER VERMIEDEN SIND ───────────────────────────────────

   ⚠ Gefragt wird `spiele.matchdaten_geholt_am` — DIE SPALTE DIESER
     ZEILE. NICHT `max(e.zuletzt_synchronisiert)` ueber
     `spiel_ereignisse`: am 11.09.2026 hat genau das eine halbe
     Untersuchung gekostet. Das Aggregat war leer, weil der Verband zu
     diesen Spielen keinen Verlauf fuehrt — und „keine Ereignisse" wurde
     als „nie geholt" gelesen. Eine Abfrage, die ueber eine Nebentabelle
     joint, misst die Anwesenheit der Nebentabelle, nicht die der Sache.

   ⚠ `spiele.date`, nicht `datum`. Die Spalte heisst englisch, waehrend
     `zeit` daneben deutsch heisst. Am 12./13.09.2026 sind drei Abfragen
     an erfundenen Namen gescheitert — und die dritte war nicht bloss
     falsch benannt, sondern nicht messbar: `spiel_ereignisse` hat KEINE
     Spalte fuer „seit wann existiert diese Zeile", und seit dem
     11.09.2026 werden ihre Zeilen beim Abruf geloescht und neu angelegt.
     Ersetzen vernichtet das Alter der Zeile.

   ⚠ `= 1` und `null` stehen GETRENNT. `istRollenvermerk()` sagt zu
     beiden `false`, die Anzeige zeigt in beiden Faellen keinen
     Rollentext — aber `1` heisst „Spieler/in, gefragt und geantwortet"
     und `null` heisst „nicht gefragt". Sie zusammenzuzaehlen machte aus
     einer offenen Frage eine Antwort.

   ⚠ Der Textnachbau in Abschnitt 6 ist UEBERNOMMEN aus
     `abfragen_2026-09-24_probespiel_4382013.sql`, Abfrage 3 — nicht neu
     gebaut. Ein dritter Nachbau derselben Funktion waere die dritte
     Fassung, die still auseinanderlaeuft, und die zweite hat schon einen
     Fehler getragen (den fehlenden Gegnerzweig).

   ⚠ Gefiltert wird ueber `sfv_match_id` allein, nicht ueber
     `(verein_id, sfv_match_id)`. Der Schluessel ist zweiteilig; solange
     ein Verein im Portal steht, ist das folgenlos. Bei einem zweiten
     gehoert `and s.verein_id = '…'` dazu — und dann auch in `wp` unten.

   ⚠ Die zwei Deploy-Zeitpunkte unten sind EINE ANSAGE, keine Messung.
     Sie trennen nur A2 („neu geholt und trotzdem leer") von A3 („der
     letzte Abruf war aelter als die Function"). Der Rohwert
     `matchdaten_geholt_am` steht in derselben Zeile daneben — wer die
     Ansage anzweifelt, liest ihn und entscheidet selbst.
   ══════════════════════════════════════════════════════════════════════ */

with grenzen as (
  /* ⚠ Lokale Zeit, Europe/Zurich, im September also UTC+2. Als
     Zeitzonen-Offset geschrieben und nicht als nackter Zeitstempel: ohne
     ihn haenge das Ergebnis an der Einstellung der Sitzung. */
  select '2026-09-24 16:00:01+02'::timestamptz as sync_v65,
         '2026-09-24 17:36:57+02'::timestamptz as export_v67
),

/* Die Gegenstelle. ⚠ `active` und `auto_sync` stehen mit, weil der
   Abholer BEIDE prueft (`cron_wp_export.sql:96-98`) — und weil ein
   Anschluss auf `false` sechs Tage lang wie einer aussah, der stuendlich
   lief. `letzter_sync` allein saehe gleich aus, ob der Abholer schweigt
   oder abgeschaltet ist. */
wp as (
  select v.id, v.verein_id, v.letzter_sync, v.sync_status, v.sync_meldung,
         v.active, v.auto_sync, v.sync_laeuft_seit
    from public.api_verbindungen v
   where v.key = 'wordpress'
),

/* Die drei aus Abfrage 4 von `abfragen_2026-09-24_rolle_verlauf.sql`. */
gefragt as (
  select unnest(array[4393143, 4367209, 4382013]::bigint[]) as mid
),

lage as (
  select s.id,
         s.sfv_match_id,
         s.date,
         s.team,
         s.gegner,
         s.heimspiel,
         s.liga,
         s.resultat,
         s.sfv_status,
         s.sfv_team_id,
         s.matchdaten_geholt_am,
         s.zuletzt_geaendert                                as spiel_geaendert,
         s.zuletzt_synchronisiert,
         count(e.id)                                        as zeilen_sfv,
         /* ⚠ Die Bezugsgroesse, gegen die der Theme-Chat seine 19 haelt:
            nur diese fuenf Typen erscheinen ueberhaupt im Verlauf
            (`verlaufArt()`), alles andere verwirft `baueVerlauf()`. */
         count(*) filter (where e.typ_id in (1, 2, 3, 4, 9)) as zeilen_verlauf,
         count(e.rolle_kategorie_id)                        as mit_kategorie,
         count(*) filter (where e.rolle_kategorie_id = 1)    as kategorie_spieler,
         count(*) filter (where e.rolle_kategorie_id is not null
                            and e.rolle_kategorie_id <> 1)  as mit_vermerk,
         /* ⚠ `zuletzt_geaendert`, nicht `zuletzt_synchronisiert` — nur
            das erste zaehlt `export_wartet()`. Der Laufstempel wird bei
            jedem Abruf neu gesetzt, auch ohne Aenderung. */
         max(e.zuletzt_geaendert)                           as ereignis_geaendert,
         /* ⚠ Zwei Ausschlusspfade des Exports, die von aussen wie „kein
            Spiel" aussehen: ohne Teamnummer wird es als `heimatlos`
            gezaehlt und NICHT gesendet (`index.ts:980`), und ist die
            Nummer keiner `teams`-Zeile zugeordnet, faellt das Spiel schon
            aus `eigene` heraus (`:2119`) — dann werden nicht einmal seine
            Ereignisse gelesen. */
         exists (select 1 from public.teams t
                  where t.verein_id = s.verein_id
                    and t.sfv_team_id = s.sfv_team_id)      as team_zugeordnet
    from public.spiele s
    join gefragt g on g.mid = s.sfv_match_id
    left join public.spiel_ereignisse e
           on e.spiel_id = s.id and e.herkunft = 'sfv'
   group by s.id, s.verein_id, s.sfv_match_id, s.date, s.team, s.gegner,
            s.heimspiel, s.liga, s.resultat, s.sfv_status, s.sfv_team_id,
            s.matchdaten_geholt_am, s.zuletzt_geaendert,
            s.zuletzt_synchronisiert
),

/* ⚠ ⚠  DIE FALLUNTERSCHEIDUNG — hier und nur hier. Sie steht als eigenes
   CTE, damit der Text in Abschnitt 0 und die Handlung, die daraus folgt,
   aus DERSELBEN Bedingung kommen. Zwei Stellen, eine Aussage, von Hand
   gleichgehalten, ist genau der Fehler, den `werBefund()` am 24.09.2026
   beseitigt hat. */
entscheid as (
  select l.*,
         w.letzter_sync,
         w.active,
         w.auto_sync,
         case
           when l.matchdaten_geholt_am is null then 'A1'
           when l.mit_kategorie = 0
                and l.matchdaten_geholt_am < g.sync_v65 then 'A3'
           when l.mit_kategorie = 0 then 'A2'
           when w.letzter_sync is null then 'B0'
           when l.ereignis_geaendert > w.letzter_sync then 'B'
           else 'DURCH'
         end                                                as fall
    from lage l
    cross join grenzen g
    left join wp w on true
),

/* Der ganze Bestand — die Bezugszahl, gegen die jede Zahl oben zu lesen
   ist. ⚠ Sie steht UNTER dem Entscheid, nicht darueber: eine Kopfzahl,
   die beruhigt, erstickt das Detail daneben. */
bestand as (
  select count(*)                                           as zeilen,
         count(rolle_kategorie_id)                          as mit_kategorie,
         count(*) filter (where rolle_kategorie_id = 1)      as spieler,
         count(*) filter (where rolle_kategorie_id is not null
                            and rolle_kategorie_id <> 1)     as vermerk,
         count(*) filter (where rolle_kategorie_id is null)   as ohne,
         count(distinct spiel_id)                            as spiele,
         count(distinct spiel_id) filter (where rolle_kategorie_id is not null)
                                                             as spiele_mit_kategorie
    from public.spiel_ereignisse
   where herkunft = 'sfv'
),

/* ⚠ ⚠  DIE MENGE, DIE ABFRAGE 4 KUENFTIG FINDEN MUESSTE — und die sie
   NICHT mehr findet.

   Ihre Bedingung hing am RUECKFALLTEXT (eigen ohne Personennummer und
   ohne Rueckennummer, oder fremd ohne Nummer). Der Sync hat die Spiele
   geholt, `matchdaten_geholt_am` traegt wieder einen Wert, und die
   Bedingung trifft dieselben Zeilen weiter — ein zweiter Durchgang
   setzte also erneut Spiele zurueck, die schon geholt sind, und liesse
   genau die aus, deren Rueckfalltext nie das Problem war.

   Die Bedingung, die den Altbestand trifft, ist das MERKMAL selbst: eine
   Verlaufszeile mit `rolle_kategorie_id is null`. Sie kann nicht
   veralten — nach dem Abruf ist sie leer, ohne dass jemand eine Marke
   verbraucht. Dieselbe Regel wie `ableitung is null` statt
   `name <> 'Elternteil'`.

   ⚠ Hier steht sie als LESEABFRAGE. Schreiben ist Didis Handlung. */
altbestand as (
  select count(distinct s.id)                               as spiele,
         count(distinct s.id) filter (where s.matchdaten_geholt_am is null)
                                                            as vorgemerkt,
         count(distinct s.id) filter (where s.matchdaten_geholt_am is not null)
                                                            as zu_merken,
         min(s.date)                                        as aeltestes,
         max(s.date)                                        as juengstes
    from public.spiele s
    join public.spiel_ereignisse e
      on e.spiel_id = s.id and e.herkunft = 'sfv'
   where s.sfv_match_id is not null
     and e.typ_id in (1, 2, 3, 4, 9)
     and e.rolle_kategorie_id is null
),

laeufe as (
  select l.gestartet_am,
         l.beendet_am,
         l.status,
         l.meldung,
         /* ⚠ Der Lauf wird gegen den Deploy-Zeitpunkt gehalten, statt den
            Leser aus dem fehlenden Schluessel schliessen zu lassen. Beide
            Angaben stehen unten nebeneinander: stimmen sie nicht
            zusammen — ein Lauf VOR v67 mit Wappen-Nachtrag, oder einer
            danach ohne —, ist das der Befund, und nicht meine Ansage. */
         l.gestartet_am < (select sync_v65 from grenzen)      as vor_sync_v65,
         l.gestartet_am < (select export_v67 from grenzen)    as vor_export_v67,
         /* ⚠ Der Wappen-Nachtrag existiert erst seit wp-export v67
            (17:36:57). Sein Fehlen bei einem aelteren Lauf ist KEIN
            Defekt, sondern DATIERT ihn. Das gehoert als Spalte gesagt und
            nicht als Schluss, den der Leser zieht.

            ⚠ `->` und `is not null` statt des `?`-Operators: ein
            Fragezeichen ist in manchen Treibern ein Platzhalter. Es
            unterscheidet „Schluessel fehlt" nicht von „Schluessel traegt
            JSON-null" — fuer diese Frage genuegt es, `wappen` ist immer
            ein Objekt. */
         (l.details -> 'wappen')     is not null            as hat_wappen,
         (l.details -> 'ranglisten') is not null            as hat_ranglisten,
         (l.details -> 'zahlen')     is not null            as hat_zahlen
    from public.api_sync_log l
   where l.aktion = 'export'
   order by l.gestartet_am desc
   limit 8
),

/* Die Karten in 4382013. ⚠ typ_id 3 ist die Verwarnung, 4 der
   Ausschluss. */
karten as (
  select e.minute,
         e.zusatzminute,
         e.typ_id,
         e.typ,
         e.subtyp_id,
         e.ist_eigener,
         e.rolle_kategorie_id,
         e.rolle_kategorie,
         e.person_name,
         e.rueckennr,
         e.sfv_person_id,
         e.gegner_club_name,
         w.rolle_text,
         w.name_laut_rangfolge,
         w.benennbar,
         case when w.name_laut_rangfolge is not null
              then btrim(concat_ws(' ', w.rolle_text, w.name_laut_rangfolge))
              else coalesce(nullif(w.rolle_text, ''), 'Unser Team')
         end                                                as erwarteter_text,
         /* ⚠ Eine aktive Vereins-Zeile VERDECKT die SFV-Zeile, auf die
            sie zeigt (`matchdatenAnzeige.ts:149`) — und eine korrigierte
            Zeile traegt die drei neuen Spalten nicht. Steht hier `true`,
            sagt die SFV-Zeile nichts darueber, was die Website zeigt. */
         exists (select 1 from public.spiel_ereignisse k
                  where k.herkunft = 'verein'
                    and k.verworfen_am is null
                    and k.ersetzt_ereignis_id = e.id)       as verdeckt
    from public.spiel_ereignisse e
    join public.spiele s on s.id = e.spiel_id
    left join public.sfv_zuordnung z
           on z.verein_id = e.verein_id
          and z.sfv_person_id = e.sfv_person_id
    left join public.mitglieder m on m.id = z.mitglied_id
    left join public.personen   p on p.id = m.person_id
    left join public.sfv_personen sp
           on sp.verein_id = e.verein_id
          and sp.sfv_person_id = e.sfv_person_id
    /* Die EINE Bedingung, aus der beides folgt — Rollentext UND
       Namenszweig. Uebernommen, nicht nachgebaut. */
    cross join lateral (
      select e.rolle_kategorie_id is not null
               and e.rolle_kategorie_id <> 1                as ist_vermerk
    ) v
    cross join lateral (
      select case when not v.ist_vermerk then ''
                  when btrim(coalesce(e.rolle_kategorie, '')) in ('', '-') then ''
                  else btrim(e.rolle_kategorie) end         as rolle_text,
             coalesce(nullif(btrim(concat_ws(' ', p.vorname, p.nachname)), ''),
                      nullif(btrim(sp.name), ''),
                      case when v.ist_vermerk
                           then nullif(btrim(e.person_name), '') end,
                      case when e.rueckennr is not null
                           then 'Nr. ' || e.rueckennr end)  as eigen_name
    ) r
    /* ⚠ ⚠  DER GEGNERZWEIG STEHT VOR ALLEN NAMENSSTUFEN. `werBefund()`
       prueft `!ist_eigener` als ERSTES (`matchdatenAnzeige.ts:681`) und
       gibt den Vereinsnamen zurueck, NIE eine Rueckennummer.

       ⚠ `coalesce(e.gegner_club_name, 'Gegner')` ohne `nullif` und ohne
       `btrim` — die Funktion schreibt `?? "Gegner"`, und `??` faellt nur
       bei `null` zurueck, nicht bei einer leeren Zeichenkette. Ein
       `nullif` hier waere strenger als das Original. */
    cross join lateral (
      select r.rolle_text,
             case when not e.ist_eigener
                  then coalesce(e.gegner_club_name, 'Gegner')
                  else r.eigen_name end                     as name_laut_rangfolge,
             e.ist_eigener and r.eigen_name is not null      as benennbar
    ) w
   where s.sfv_match_id = 4382013
     and e.typ_id in (3, 4)
),

zeilen as (

/* ── 0 · DER ENTSCHEID — A oder B, je Spiel ──────────────────────────── */
select 0::smallint                                          as nr,
       'ENTSCHEID'                                          as abschnitt,
       to_char(e.date, 'DD.MM.') || ' · ' || e.sfv_match_id
         || ' · ' || e.team || ' – ' || coalesce(e.gegner, '?')
                                                            as gegenstand,
       e.mit_kategorie || ' von ' || e.zeilen_verlauf
         || ' Verlaufszeilen tragen eine rolle_kategorie_id'  as kennzahl,
       'davon Vermerk (<>1): ' || e.mit_vermerk
         || '  ·  Spieler/in (=1): ' || e.kategorie_spieler
         || '  ·  ohne (null): ' || (e.zeilen_sfv - e.mit_kategorie)
                                                            as kennzahl_2,
       'geholt: ' || coalesce(
           to_char(e.matchdaten_geholt_am at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'),
           '— NIE bzw. zurueckgesetzt')                     as zeitpunkt,
       'Ereignisse geaendert: ' || coalesce(
           to_char(e.ereignis_geaendert at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'), '—')
         || '  ·  letzter Export: ' || coalesce(
           to_char(e.letzter_sync at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'), '— nie')           as vergleich,
       case e.fall
         when 'A1' then 'A ⚠ VORGEMERKT UND NOCH NICHT NACHGEHOLT. '
              || 'matchdaten_geholt_am ist leer, das Spiel liegt also im '
              || 'Topf „neu" und wartet. Der Topf ist nach Datum sortiert, '
              || 'das JUENGSTE zuerst (matchdaten.ts:1034), und ein Lauf '
              || 'holt hoechstens 12 Spiele — ein altes Spiel steht damit '
              || 'hinten. Kein Defekt, sondern eine Warteschlange. Ihre '
              || 'Laenge steht in Abschnitt 3.'
         when 'A2' then 'A ⚠ ⚠  BEFUND: NEU GEHOLT UND TROTZDEM LEER. Der '
              || 'Abruf liegt NACH dem sfv-sync-Deploy, und keine Zeile '
              || 'traegt eine Kategorie. Dann liegt es am Sync, nicht am '
              || 'Altbestand — zu pruefen sind die Zuweisung in '
              || 'matchdaten.ts:320 und die Spaltenliste in '
              || 'VERLAUF_VERGLEICH.'
         when 'A3' then 'A ⚠ DER LETZTE ABRUF IST AELTER ALS DIE FUNCTION. '
              || 'Das Spiel ist seit dem Deploy nicht geholt worden — das '
              || 'Ruecksetzen hat es also nicht getroffen (Abfrage 4 '
              || 'verlangt eine Zeile mit Rueckfalltext), oder es ist '
              || 'danach erneut gestempelt worden. Es braucht einen '
              || 'Neuabruf.'
         when 'B0' then 'B ⚠ ES GIBT KEIN letzter_sync FUER „wordpress". '
              || 'Entweder hat der Export nie gelaufen, oder die Zeile '
              || 'fehlt. Dann wartet strukturell ALLES, und '
              || 'export_wartet() zaehlt jede Zeile — siehe Abschnitt 5.'
         when 'B'  then 'B · GEFUELLT, WARTET AUF DEN EXPORT. Die Zeilen '
              || 'tragen die Rolle, und sie haben sich SEIT dem letzten '
              || 'Export geaendert. Ein Lauf genuegt, und der Abholer '
              || 'nimmt ihn von selbst — sofern active und auto_sync '
              || 'stehen (Abschnitt 5).'
         else          'DURCH · gefuellt UND hinaus. Die Zeilen tragen die '
              || 'Rolle, und sie sind aelter als der letzte Export — wir '
              || 'haben sie also gesendet. ⚠ Was drueben steht, sagt diese '
              || 'Abfrage NICHT: sie liest unsere Datenbank. Dann ist die '
              || 'Frage an die Gegenstelle zu richten.'
       end                                                  as befund,
       to_char(e.date, 'YYYY-MM-DD')                        as sortschluessel
  from entscheid e

union all

/* ── 1 · Das Spiel selbst, und die zwei Ausschlusspfade des Exports ─── */
select 1::smallint,
       'SPIEL',
       to_char(e.date, 'DD.MM.') || ' · ' || e.sfv_match_id
         || ' · ' || e.team,
       'sfv_team_id: ' || coalesce(e.sfv_team_id::text, '⚠ LEER')
         || '  ·  in teams zugeordnet: '
         || case when e.team_zugeordnet then 'ja' else '⚠ NEIN' end,
       'sfv_status: ' || coalesce(e.sfv_status::text, '—')
         || '  ·  Resultat: ' || coalesce(e.resultat, '—')
         || '  ·  ' || case when e.heimspiel then 'heim' else 'auswaerts' end
         || '  ·  ' || coalesce(e.liga, '—'),
       'Spiel inhaltlich geaendert: ' || coalesce(
           to_char(e.spiel_geaendert at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'), '—'),
       'Spielplan-Lauf: ' || coalesce(
           to_char(e.zuletzt_synchronisiert at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'), '—')
         || '  ·  sfv-Zeilen: ' || e.zeilen_sfv
         || ', davon im Verlauf: ' || e.zeilen_verlauf,
       case
         when e.sfv_team_id is null
           then '⚠ OHNE TEAMNUMMER — der Export zaehlt es als heimatlos und '
             || 'sendet es NICHT (index.ts:980). Dann ist die fehlende '
             || 'Rolle nicht die Ursache, sondern eine Folge.'
         when not e.team_zugeordnet
           then '⚠ ⚠  DIE TEAMNUMMER IST KEINER teams-ZEILE ZUGEORDNET. '
             || 'Dann faellt das Spiel schon aus `eigene` heraus '
             || '(index.ts:2119), und es werden nicht einmal seine '
             || 'Ereignisse gelesen — es geht gar nicht hinaus.'
         else 'Beide Ausschlusspfade des Exports greifen nicht: das Spiel '
             || 'traegt eine Teamnummer, und sie ist zugeordnet. ⚠ Dass '
             || '„Spiel inhaltlich geaendert" alt ist, ist KEIN Befund — '
             || 'der Trigger nimmt matchdaten_geholt_am aus dem Vergleich, '
             || 'ein reiner Matchdaten-Abruf bewegt diese Spalte also nie.'
       end,
       to_char(e.date, 'YYYY-MM-DD')
  from entscheid e

union all

/* ── 2 · DER GANZE BESTAND — die Bezugszahl ──────────────────────────── */
select 2::smallint,
       'BESTAND',
       'spiel_ereignisse, herkunft = sfv',
       b.mit_kategorie || ' von ' || b.zeilen
         || ' Zeilen tragen eine rolle_kategorie_id',
       'Vermerk (<>1): ' || b.vermerk
         || '  ·  Spieler/in (=1): ' || b.spieler
         || '  ·  ⚠ null (nicht gefragt): ' || b.ohne,
       b.spiele_mit_kategorie || ' von ' || b.spiele
         || ' Spielen haben mindestens eine Zeile mit Kategorie',
       '—',
       case
         when b.mit_kategorie = 0
           then '⚠ ⚠  KANDIDAT A FUER ALLES: der Sync hat die Spalte NIE '
             || 'geschrieben. Dann ist jede Zahl oben erwartet und kein '
             || 'eigener Befund — und zu pruefen ist, ob sfv-sync v65 '
             || 'wirklich laeuft.'
         when b.vermerk = 0
           then '⚠ Kategorien sind da, aber KEINE davon ist ein Vermerk. '
             || 'Alle gelieferten Rollen sind „Spieler/in" (Id 1), und '
             || 'dafuer zeigt rollenText() absichtlich nichts. Dann traegt '
             || 'die Kette, und es gibt einfach keinen Trainer im Bestand '
             || '— zu pruefen mit Abfrage 4 aus probespiel_4382013.'
         else 'Der Sync schreibt die Spalte, und es gibt Vermerke. Die '
             || 'Kette traegt; was oben fehlt, ist eine Frage des '
             || 'Nachlaufs oder des Exports, nicht der Umstellung. '
             || '⚠ Diese Zahl sagt NICHT, ob ein bestimmtes Spiel sie '
             || 'traegt — das steht in Abschnitt 0.'
       end,
       'a'
  from bestand b

union all

/* ── 3 · DIE GROESSE DES ALTBESTANDS, ueber das MERKMAL gemessen ─────── */
select 3::smallint,
       'ALTBESTAND',
       'Spiele mit mindestens einer Verlaufszeile ohne rolle_kategorie_id',
       a.spiele || ' Spiele betroffen'
         || case when a.spiele = 0 then ''
                 else '  ·  Zeitraum ' || to_char(a.aeltestes, 'DD.MM.')
                      || ' bis ' || to_char(a.juengstes, 'DD.MM.') end,
       'davon schon vorgemerkt (geholt_am leer): ' || a.vorgemerkt
         || '  ·  noch zu merken: ' || a.zu_merken,
       'bei 12 Spielen je Lauf und stuendlichem Zeitplan: '
         || ceil(a.vorgemerkt / 12.0)
         || ' Lauf/Laeufe fuer die Vorgemerkten',
       'der rollende Nachlauf allein schafft 2 je Lauf '
         || '(NACHLAUF_PLAETZE = 2) — fuer alle ' || a.spiele
         || ' waeren das ' || ceil(a.spiele / 2.0) || ' Stunden',
       case
         when a.spiele = 0
           then 'Nichts offen. ⚠ Dann kann die fehlende Rolle oben nicht am '
             || 'Altbestand liegen — lies Abschnitt 0 noch einmal.'
         when a.vorgemerkt >= a.spiele
           then 'Alles ist vorgemerkt und laeuft durch den Topf „neu". '
             || 'HANDLUNG: warten und die Zahl morgen erneut messen. '
             || '⚠ Der Topf hat Vorrang bis 12 und verdraengt dabei '
             || 'Fenster und Nachlauf — das ist gewollt und nach den '
             || 'Laeufen vorbei.'
         else 'HANDLUNG, wenn es schneller gehen soll: die ' || a.zu_merken
             || ' noch nicht vorgemerkten Spiele zuruecksetzen — aber ueber '
             || 'das MERKMAL, nicht ueber den Rueckfalltext. Die Bedingung '
             || 'steht im Kopf des CTE `altbestand`; das `update` daraus '
             || 'ist Didis Handlung. ⚠ In Haeppchen von etwa zwoelf, sonst '
             || 'steht das Fenster stundenlang still.'
       end,
       'a'
  from altbestand a

union all

/* ── 4 · Die letzten Export-Laeufe ───────────────────────────────────── */
select 4::smallint,
       'EXPORT-LAUF',
       to_char(l.gestartet_am at time zone 'Europe/Zurich',
               'DD.MM. HH24:MI:SS'),
       coalesce(l.status, '⚠ leer'),
       case when l.beendet_am is null
            then '⚠ ohne Ende — LAEUFT oder GESTORBEN'
            else 'Dauer: '
              || round(extract(epoch from (l.beendet_am - l.gestartet_am)))
              || ' s' end,
       'details: zahlen '
         || case when l.hat_zahlen then 'ja' else 'nein' end
         || '  ·  ranglisten '
         || case when l.hat_ranglisten then 'ja' else 'nein' end
         || '  ·  wappen '
         || case when l.hat_wappen then 'ja' else '⚠ nein' end
         || '  ·  lag '
         || case when l.vor_export_v67 then 'VOR' else 'nach' end
         || ' dem wp-export-Deploy, '
         || case when l.vor_sync_v65 then 'VOR' else 'nach' end
         || ' dem sfv-sync-Deploy',
       left(coalesce(l.meldung, '—'), 200),
       case
         when l.beendet_am is null
           then '⚠ ⚠  KEIN beendet_am. Eine Zeile auf „laeuft", die aelter '
             || 'als ein paar Minuten ist, heisst genau eine Sache: der '
             || 'Lauf ist gestorben. `laeuft` heisst nicht „laeuft gerade".'
         when l.vor_sync_v65
           then 'Dieser Lauf lag VOR dem sfv-sync-Deploy — er KONNTE keine '
             || 'Rolle senden, weil zu dem Zeitpunkt keine Zeile eine trug. '
             || 'Er sagt ueber die Frage nichts.'
         when l.vor_export_v67 and not l.hat_wappen
           then 'Ohne details.wappen, und der Lauf lag vor dem '
             || 'wp-export-Deploy — ⚠ das ist KEIN Defekt, sondern '
             || 'ERWARTET: den Nachtrag gibt es erst seit v67. Die '
             || 'Spielzahlen in details.zahlen gelten trotzdem.'
         when l.vor_export_v67 and l.hat_wappen
           then '⚠ ⚠  WIDERSPRUCH: ein Lauf VOR dem v67-Deploy traegt einen '
             || 'Nachtrag, den es damals nicht gab. Dann ist der '
             || 'Deploy-Zeitpunkt im Kopf dieser Datei falsch — er ist eine '
             || 'Ansage, keine Messung, und diese Zeile widerlegt sie.'
         when not l.hat_wappen
           then '⚠ ⚠  WIDERSPRUCH: ein Lauf NACH dem v67-Deploy ohne '
             || 'Wappen-Nachtrag. Entweder ist der Deploy-Zeitpunkt oben '
             || 'falsch, oder der Nachtrag ist gescheitert — im zweiten '
             || 'Fall stand der Grund in `protokoll_nachtrag` der HTTP-'
             || 'Antwort, und die ist weg.'
         else 'Mit Wappen-Nachtrag, also v67 oder juenger — und nach beiden '
             || 'Deploys. ⚠ Der Status ist der des SPIELETEILS: der '
             || 'Wappenblock kann ihn nicht mehr rot faerben, seine eigene '
             || 'Lage steht in details.wappen.'
       end,
       to_char(l.gestartet_am, 'YYYY-MM-DD HH24:MI:SS')
  from laeufe l

union all

/* ── 5 · Der Anschluss „wordpress" — kann der Abholer ueberhaupt? ────── */
select 5::smallint,
       'ANSCHLUSS',
       'api_verbindungen, key = wordpress',
       'active: ' || case when w.active then 'ja' else '⚠ NEIN' end
         || '  ·  auto_sync: '
         || case when w.auto_sync then 'ja' else '⚠ NEIN' end,
       'export_wartet(): ' || public.export_wartet(w.verein_id) || ' Zeilen',
       'letzter_sync: ' || coalesce(
           to_char(w.letzter_sync at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS'), '— nie')
         || '  ·  Status: ' || coalesce(w.sync_status, '—'),
       case when w.sync_laeuft_seit is null then 'keine Laufsperre'
            else '⚠ Laufsperre seit ' || to_char(
                   w.sync_laeuft_seit at time zone 'Europe/Zurich',
                   'DD.MM. HH24:MI:SS') end,
       case
         when not w.active or not w.auto_sync
           then '⚠ ⚠  DER ABHOLER LAEUFT NICHT. Er prueft active UND '
             || 'auto_sync UND export_wartet() > 0 '
             || '(cron_wp_export.sql:96-98). Steht eines auf false, '
             || 'schweigt er — und das sieht genauso aus wie „es wartet '
             || 'nichts".'
         when public.export_wartet(w.verein_id) = 0
           then 'Es wartet nichts. ⚠ Zusammen mit einem „B" oben ist das '
             || 'ein WIDERSPRUCH: dann sieht export_wartet() die Aenderung '
             || 'nicht, und die laufende Fassung zaehlt weniger als die '
             || 'vier Quellen aus schema.sql:105. Das waere der eigentliche '
             || 'Befund — hier nachgemessen statt behauptet.'
         else 'Der Abholer ist bereit, und es wartet etwas. Er laeuft im '
             || '15-Minuten-Takt. ⚠ export_wartet() zaehlt VIER Quellen '
             || '(schema.sql:105), darunter spiel_ereignisse: ein reiner '
             || 'Matchdaten-Abruf wird also bemerkt, obwohl er '
             || 'spiele.zuletzt_geaendert nicht bewegt.'
       end,
       'a'
  from wp w

union all

/* ── 6 · Die Karte(n) in 4382013, mit dem erwarteten Text ────────────── */
select 6::smallint,
       'KARTE 4382013',
       coalesce(e.minute::text, '?') || '.'
         || case when e.zusatzminute is null then ''
                 else '+' || e.zusatzminute end
         || ' · ' || coalesce(e.typ, 'typ ' || e.typ_id)
         || case when e.subtyp_id = 20 then ' (gelbrot)' else '' end,
       case when e.ist_eigener then 'EIGEN' else 'FREMD' end
         || '  ·  rolle_kategorie_id: '
         || coalesce(e.rolle_kategorie_id::text, '⚠ null (nicht gefragt)')
         || '  ·  rolle_kategorie: '
         || coalesce(nullif(e.rolle_kategorie, ''), '—'),
       'person_name: ' || coalesce(e.person_name, '—')
         || '  ·  rueckennr: ' || coalesce(e.rueckennr::text, '—')
         || '  ·  sfv_person_id: ' || coalesce(e.sfv_person_id::text, '—')
         || '  ·  gegner_club_name: ' || coalesce(e.gegner_club_name, '—'),
       'Rollentext: „' || e.rolle_text || '"'
         || '  ·  Name laut Rangfolge: '
         || coalesce(e.name_laut_rangfolge, '—')
         || '  ·  benennbar: ' || e.benennbar,
       'ERWARTET auf der Website: „' || e.erwarteter_text || '"',
       case
         when e.verdeckt
           then '⚠ ⚠  VON EINER VEREINS-KORREKTUR VERDECKT. Dann sagt diese '
             || 'Zeile NICHTS darueber, was die Website zeigt — '
             || 'mischeEreignisse() laesst die Korrektur gewinnen, und die '
             || 'traegt die drei neuen Spalten nicht.'
         when e.rolle_kategorie_id is null
           then 'Ohne Kategorie, also ohne Rollentext — und damit steht '
             || 'dort genau der gemeldete Text. ⚠ Erwartet fuer den '
             || 'Altbestand, kein eigener Befund.'
         when e.rolle_kategorie_id = 1
           then 'Spieler/in (Id 1) — dafuer zeigt rollenText() ABSICHTLICH '
             || 'nichts. Kein Vermerk, kein Defekt.'
         when e.rolle_text = ''
           then '⚠ Die Id nennt einen Vermerk, der KLARTEXT ist aber leer '
             || 'oder „-". Dann wissen wir, dass es kein Spieler ist, und '
             || 'koennen es nicht in Worte fassen — die Zeile faellt auf '
             || 'den Namen bzw. „Unser Team" zurueck.'
         else 'Vermerk vorhanden und in Worte zu fassen. ⚠ Weicht die '
             || 'Website davon ab, liegt es am Export oder drueben, nicht '
             || 'an dieser Zeile.'
       end,
       lpad(coalesce(e.minute, 0)::text, 3, '0')
         || lpad(coalesce(e.zusatzminute, 0)::text, 3, '0')
  from karten e

)

select z.nr,
       z.abschnitt,
       z.gegenstand,
       z.kennzahl,
       z.kennzahl_2,
       z.zeitpunkt,
       z.vergleich,
       z.befund
  from zeilen z
 order by z.nr, z.sortschluessel;
