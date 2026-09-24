/* ════════════════════════════════════════════════════════════════════════
   Was ist aus dem abgebrochenen Export-Lauf geworden?
   Angelegt am 24.09.2026. LESEND — keine Zeile wird geaendert.

   ANLASS: „Export starten" (wp-export v66) hat dem Browser nur noch

       {"code":"IDLE_TIMEOUT","message":"Request idle timeout limit (150s) reached"}

   gegeben. Keine Antwort heisst: kein `unterfelder_geprueft`, keine
   Ranglisten-Zahlen, keine Wappen-Zahlen. Die Frage ist, ob der Lauf im
   Hintergrund fertig wurde — und die Protokollzeile kann sie beantworten,
   weil sie VOR dem Lauf entsteht.

   ⚠ `laeuft` HEISST NICHT „LAEUFT GERADE".
     `sendeAnWordpress()` in `wp-export/index.ts` schreibt die Zeile mit
     `status = 'laeuft'` BEVOR der erste POST hinausgeht und aktualisiert
     DIESELBE Zeile am Ende. Eine Zeile, die stehenbleibt, heisst: der Lauf
     ist gestorben. Derselbe Satz steht als Doc-Comment an `LAUF_LAEUFT`
     (`src/domains/sfv/protokollStatus.ts:26`).

   ⚠ ⚠ WAS DIESE ABFRAGEN FUER DEN ABGEBROCHENEN LAUF NICHT BEANTWORTEN
     KOENNEN: RANGLISTEN und WAPPEN standen bis v66 in KEINEM Protokoll —
     nur in der HTTP-Antwort, und die ist weg. Seit dem `protokoll_nachtrag`
     (24.09.2026, ungedeployt) landen sie in `details`; Abfrage 5a liest
     beide Welten und sagt, welche vorliegt. **Fuer den Lauf, um den es hier
     geht, sind sie verloren.**

   ⚠ KEINE ZEILENNUMMERN IN `wp-export/index.ts`. Sie sind waehrend des
     Schreibens dieser Datei bereits gewandert — die Function wird gerade
     umgebaut. Verwiesen wird deshalb auf FUNKTIONSNAMEN: ein Name
     ueberlebt einen Umbau, eine Zeilennummer nicht, und eine falsche
     Zeilennummer schickt den Leser an eine Stelle, die mit der Sache
     nichts zu tun hat.

   ⚠ Jede Zahl gehoert mit ihrem Datum zitiert. Eine Zahl aus einem
     Dokument ist eine Messung von damals, keine Auskunft ueber heute.
   ════════════════════════════════════════════════════════════════════════ */


/* ── 1 · Der Lauf selbst: wurde er fertig? ───────────────────────────────

   Drei Lagen, und sie sind VERSCHIEDEN. Die Spalte `fertig` sagt es im
   Klartext, statt den Leser aus `status` schliessen zu lassen — genau
   dieser Schluss ist die Stelle, an der „gescheitert" und „nichts zu tun"
   verwechselt werden.

   ⚠ `details_da` ist die zweite Ablesung derselben Sache, ohne Uhr:
     `details` wird ausschliesslich im ABSCHLUSS-Update gesetzt
     (im Abschluss von `sendeAnWordpress()`, dasselbe `update` wie `status`
     und `beendet_am`).
     Steht dort nichts, ist der Abschlussblock nie gelaufen — und dann sind
     alle Zahlen des Laufs endgueltig weg, nicht bloss ungesehen.

   ⚠ ⚠ DAS ALTER ENTSCHEIDET INNERHALB DER LAUFSPERRE NICHT.
     `SPERRE_MINUTEN = 30` (oben in `wp-export/index.ts`) — ein Lauf DARF
     also eine halbe Stunde dauern. Ein `laeuft` von vor zehn Minuten kann leben
     oder tot sein, und keine Spalte dieser Tabelle sagt, wann `meldung`
     zuletzt bewegt wurde (es gibt kein `updated_at`).

     **Die ehrliche Probe ist, Abfrage 2 ZWEIMAL laufen zu lassen.** Bewegt
     sich „X von N", lebt er. Bewegt sie sich nicht, ist er tot — und das
     ist ein Beleg statt einer Schaetzung.

   ⚠ Der Doc-Comment an `LAUF_LAEUFT` nennt 15 Minuten. Das ist die Sperre
     von `sfv-sync` (oben in `sfv-sync/index.ts`); `wp-export` hat 30.
     Gemessen am 24.09.2026 — der Kommentar dort ist um diese Zahl ungenau. */
select l.gestartet_am at time zone 'Europe/Zurich'                  as gestartet,
       l.beendet_am   at time zone 'Europe/Zurich'                  as beendet,
       l.status,
       case
         when l.status in ('ok', 'warnung', 'fehler')
           then 'FERTIG — der Abschlussblock ist gelaufen'
         when l.status = 'laeuft' and l.gestartet_am > now() - interval '30 minutes'
           then 'OFFEN — innerhalb der Laufsperre (30 min). Das Alter '
                /* ⚠ KEIN SEMIKOLON IN DIESEM TEXT. Es stand hier und ist am
                   24.09.2026 gefallen: ein Semikolon in einem Stringliteral
                   zerlegt jeden naiven Anweisungstrenner mitten in der
                   Abfrage — derselbe Fehler wie ein `--` innerhalb einer
                   Zeichenkette in `check-spalten.mjs`. psql und der
                   Supabase-Editor lesen Anführungszeichen richtig; ein
                   Skript, das auf `;` splittet, nicht. */
                || 'entscheidet hier NICHT — Abfrage 2 zweimal laufen lassen'
         when l.status = 'laeuft'
           then 'GESTORBEN — aelter als die Laufsperre und nie abgeschlossen'
         else 'unbekannter Status: ' || coalesce(l.status, '(null)')
       end                                                          as fertig,
       /* Zweite Ablesung, ohne Uhr: `details` gibt es nur im Abschluss. */
       (l.details is not null)                                      as details_da,
       round(extract(epoch from (
         coalesce(l.beendet_am, now()) - l.gestartet_am))::numeric, 1) as dauer_s,
       /* ⚠ Bei einer offenen Zeile ist das die Dauer BIS JETZT, nicht die
          des Laufs. Deshalb steht `beendet` daneben: ist es null, ist
          `dauer_s` eine Wanduhr und kein Ergebnis. */
       l.datensaetze_neu                                            as neu,
       l.datensaetze_aktualisiert                                   as aktualisiert,
       l.datensaetze_fehler                                         as fehler,
       l.meldung
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export'
 order by l.gestartet_am desc
 limit 5;


/* ── 2 · Wie weit kam er? ────────────────────────────────────────────────

   ⚠ ⚠ DAS IST DIE EINZIGE AUSKUNFT, DIE EIN TOTER LAUF HINTERLAESST.
     Die Teile-Schleife in `sendeAnWordpress()` schreibt `meldung` nach
     JEDER Mannschaft fort:

         <host> · <n> von <N> Mannschaft(en) · <s> s

     Bei einer Zeile ohne `details` ist das alles, was es gibt. Es genuegt
     fuer die Frage, die hier gestellt wird: bei „21 von 21" war der Lauf
     durch und nur der Abschluss fehlt; bei „7 von 21" sind vierzehn
     Mannschaften nicht angefasst worden — und dann steht drueben fuer
     diese vierzehn der Stand von vorher.

   ⚠ Die drei Zahlen sind aus einem ANZEIGETEXT gelesen, nicht aus Spalten.
     Aendert jemand das Format dort, stehen hier drei Nullen,
     ohne dass etwas fehlschlaegt. Deshalb steht `meldung` ungekuerzt
     daneben — sie ist die Quelle, die Zerlegung ist die Bequemlichkeit.

   ⚠ Bei einer FERTIGEN Zeile sind `mannschaften_fertig` und
     `mannschaften_gesamt` leer, und das ist richtig: die Endmeldung
     (`laufMeldung()` in `wpLauf.ts`) hat ein anderes Format und kennt
     kein „von". Leer heisst hier „kein Fortschrittsstand mehr", nicht
     „null Mannschaften".

   ⚠ `sekunden_laut_meldung` steht dagegen AUCH bei einer fertigen Zeile —
     die Endmeldung fuehrt die Dauer ebenfalls als „<s> s". Hier stand bis
     zum 24.09.2026 „die drei Spalten leer"; an Testdaten gemessen sind es
     zwei. **Ein Kommentar, der eine Zahl mehr behauptet als zutrifft,
     laesst den Leser die dritte Spalte fuer einen Defekt halten.** */
select l.gestartet_am at time zone 'Europe/Zurich'          as gestartet,
       l.status,
       substring(l.meldung from '([0-9]+) von [0-9]+')       as mannschaften_fertig,
       substring(l.meldung from '[0-9]+ von ([0-9]+)')       as mannschaften_gesamt,
       substring(l.meldung from '([0-9]+) s')                as sekunden_laut_meldung,
       l.meldung
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export'
 order by l.gestartet_am desc
 limit 5;


/* ── 3 · Die Zahlen des Spiele-Laufs ─────────────────────────────────────

   QUELLE DER SCHLUESSEL: `fuersProtokoll()` in
   `src/domains/spiele/wpLauf.ts` (`fuersProtokoll`). Das Objekt ist eine
   Allowlist —
   was dort nicht aufgezaehlt ist, steht in keinem Protokoll. Nicht
   geraten, Feld fuer Feld abgelesen.

   ⚠ ⚠ EIN NAME WEICHT AB, UND ER IST DER WICHTIGSTE: die Zahl der
     gesendeten Spiele heisst in `details` schlicht `gesendet`
     (in `fuersProtokoll()`), nicht `spiele_gesendet`. Wer nach dem
     TypeScript-Feldnamen `spiele_gesendet` sucht, findet null — und liest
     die Null als „nichts gesendet".

   ⚠ ZWEI SEITEN NEBENEINANDER, mit Absicht: `gesendete_aufstellung_zeilen`
     ist UNSERE Zahl, `aufstellung_zeilen` die des Empfaengers. Eine allein
     kann „wir bauen nichts" nicht von „drueben landet nichts"
     unterscheiden (Doc-Comment an `GesendeteAufstellung`). */
select l.gestartet_am at time zone 'Europe/Zurich'             as gestartet,
       l.status,
       l.details ->> 'ziel_host'                               as ziel,
       (l.details ->> 'dauer_ms')::bigint / 1000               as dauer_s,
       l.details ->> 'teams_gesendet'                          as teams_gesendet,
       l.details ->> 'teams_gescheitert'                       as teams_gescheitert,
       /* ⚠ heisst `gesendet`, nicht `spiele_gesendet` — siehe oben. */
       l.details ->> 'gesendet'                                as spiele_gesendet,
       l.details ->> 'neu'                                     as neu,
       l.details ->> 'aktualisiert'                            as aktualisiert,
       l.details ->> 'zurueckgezogen'                          as zurueckgezogen,
       l.details ->> 'uebersprungen'                           as uebersprungen,
       l.details ->> 'verlauf_zeilen'                          as verlauf_geschrieben,
       l.details ->> 'gesendete_aufstellung_zeilen'            as aufstellung_gesendet,
       l.details ->> 'aufstellung_zeilen'                      as aufstellung_geschrieben,
       l.details ->> 'gesendete_spiele_ohne_aufstellung'       as spiele_ohne_aufstellung,
       l.details ->> 'gesendeter_verlauf_geleert'              as verlauf_geleert,
       jsonb_array_length(coalesce(l.details -> 'fehler', '[]'::jsonb))          as fehlerzeilen,
       jsonb_array_length(coalesce(l.details -> 'ohne_team', '[]'::jsonb))       as ohne_team,
       jsonb_array_length(coalesce(l.details -> 'doppelte_teams', '[]'::jsonb))  as doppelte_teams
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export'
 order by l.gestartet_am desc
 limit 5;


/* ── 3b · Je Mannschaft: welche ist nicht angekommen? ────────────────────

   `je_team` (in `fuersProtokoll()`) traegt eine Zeile je Mannschaft. Die
   Gesamtzahl aus Abfrage 3 beantwortet nicht, WELCHE nichts bekommen hat —
   und das ist die Frage, die man beim Nachsehen stellt.

   ⚠ Steht zu einem Lauf gar nichts, ist sein `details` null, und das
     heisst: er hat seinen Abschluss nie erreicht. Es heisst NICHT „keine
     Mannschaft gesendet".

   ⚠ ⚠ SIE HAENGT AUSDRUECKLICH NICHT AM NEUESTEN LAUF, und das ist eine
     Korrektur vom 24.09.2026. Die erste Fassung filterte auf
     `max(gestartet_am)` — und gab damit im Anwendungsfall dieser Datei
     **null Zeilen**: der neueste Lauf ist der abgebrochene, der hat kein
     `details`, und damit war der letzte VOLLSTAENDIGE Lauf unerreichbar.
     Gemessen an Testdaten, nicht vermutet.

     **Ein Filter auf „den letzten" verbirgt genau dann alles, wenn der
     letzte gescheitert ist** — also in dem Moment, in dem man nachsieht.
     Deshalb die letzten drei Laeufe MIT `je_team`, jeder mit seinem
     Zeitstempel davor. Wer den abgebrochenen Lauf sucht, liest die Spalte
     `gestartet` — sie ist der Unterschied zwischen „diese Mannschaft ist
     heute gescheitert" und „das war der Lauf von vorgestern". */
select l.gestartet_am at time zone 'Europe/Zurich'      as gestartet,
       t ->> 'team'                                      as team,
       (t ->> 'gescheitert')::boolean                    as gescheitert,
       t ->> 'gesendet'                                  as spiele_gesendet,
       (t ->> 'dauer_ms')::bigint / 1000                 as dauer_s,
       t ->> 'neu'                                       as neu,
       t ->> 'aktualisiert'                              as aktualisiert,
       t ->> 'zurueckgezogen'                            as zurueckgezogen,
       t ->> 'aufstellung_zeilen'                        as aufstellung_geschrieben
  from (select l2.* from public.api_sync_log l2
          join public.api_verbindungen v2 on v2.id = l2.verbindung_id
         where v2.key = 'wordpress'
           and l2.aktion = 'export'
           /* Nur Laeufe, die ueberhaupt eine Mannschaftsliste tragen — ein
              abgebrochener hat keine und wuerde die Ausgabe leer machen. */
           and jsonb_array_length(coalesce(l2.details -> 'je_team', '[]'::jsonb)) > 0
         order by l2.gestartet_am desc
         limit 3) l
  join public.api_verbindungen v on v.id = l.verbindung_id
  cross join lateral jsonb_array_elements(l.details -> 'je_team') as t
 where v.key = 'wordpress'
 order by l.gestartet_am desc,
          (t ->> 'gescheitert')::boolean desc nulls last,
          (t ->> 'team')::bigint;


/* ── 4 · `unterfelder_geprueft` — GEMESSEN: es steht NICHT im Protokoll ──

   ⚠ ⚠ DIE VORGABE ZU DIESER DATEI HAT ES VERMUTET, UND DIE MESSUNG
     BESTAETIGT ES. Nachgesehen am 24.09.2026, an beiden Gliedern:

       wordpress/wp-export-empfaenger.php:2888
         `$erg['unterfelder_geprueft'] = …` — der Empfaenger MELDET es, in
         jeder Antwort von `/clubcampus/v1/spiele`.

       src/domains/spiele/wpLauf.ts  (`fuersProtokoll()`)
         ⚠ FUEHRT ES NICHT. Die Allowlist nennt `unbeachtete_felder`,
         `ohne_feldschluessel` und `feld_mehrdeutig` — `unterfelder_geprueft`
         steht in keiner Zeile. Es faellt hier weg.

       src/domains/spiele/wpExportService.ts (`fasseExportZusammen()`)
         ⚠ ZEIGT ES NICHT. Die Kachel baut ihre Zeilen aus `zahlen`,
         `je_team`, `gebaut` und `unbeachtete_felder`.

     **Es kommt an und wird an zwei Stellen verworfen.** Ein Melder, den
     niemand abholt, ist selbst die Luecke, gegen die er gebaut wurde — und
     genau dieser Satz steht in `fuersProtokoll()` ueber den drei Feldern, die
     es geschafft haben.

   ⚠ DESHALB PRUEFT DIESE ABFRAGE AUF ANWESENHEIT, nicht auf den Inhalt.
     Eine leere Spalte koennte auch „gefragt, und nichts gefunden" heissen.

   ⚠ Geprueft wird mit `-> 'schluessel' is not null` und NICHT mit dem
     jsonb-Operator `?`: manche Clients halten ein Fragezeichen fuer einen
     Parameter-Platzhalter. Die Form hier trennt dieselben zwei Lagen —
     fehlt der Schluessel, ist das Ergebnis SQL-NULL; steht er da (auch als
     JSON-null), ist es `'null'::jsonb` und damit `is not null`. */
select l.gestartet_am at time zone 'Europe/Zurich'      as gestartet,
       l.status,
       case
         when l.details is null
           then 'kein details — der Lauf hat seinen Abschluss nie erreicht'
         when (l.details -> 'unterfelder_geprueft') is not null
           then '⚠ DOCH DA — die Allowlist in wpLauf.ts wurde erweitert, '
                || 'der Kommentar darueber ist veraltet'
         else 'NICHT im Protokoll — faellt in fuersProtokoll() weg '
              || '(gemessen 24.09.2026). Nur die Antwort traegt es, und die '
              || 'ist mit dem IDLE_TIMEOUT verloren'
       end                                               as unterfelder_geprueft,
       /* Die drei Feldbefunde, die es INS Protokoll geschafft haben — seit
          dem 10.09.2026, und sie beantworten die Nachbarfrage („ist das
          Feld drueben angekommen?"). */
       l.details -> 'unbeachtete_felder'                 as unbeachtete_felder,
       l.details -> 'ohne_feldschluessel'                as ohne_feldschluessel,
       l.details -> 'feld_mehrdeutig'                    as feld_mehrdeutig
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export'
 order by l.gestartet_am desc
 limit 5;


/* ── 5 · Ranglisten und Wappen — zwei Welten, und die Grenze ist der Deploy

   Die Vorgabe zu dieser Datei wollte den Lauf „aufgeteilt nach Spielen,
   Ranglisten und Wappen" sehen, mit den Zahlen aus `details`. Gemessen am
   24.09.2026 — und die Antwort hat sich WAEHREND dieser Messung geaendert:

   ── BIS v66, ALSO FUER DEN ABGEBROCHENEN LAUF ────────────────────────────

   **Fuer Ranglisten und Wappen gibt es diese Zahlen nicht — in `details`
   nicht und nirgends sonst in der Datenbank.** Und das war Absicht, kein
   Versehen. Beide Bloecke laufen NACH `sendeAnWordpress()`; zu diesem
   Zeitpunkt ist die Protokollzeile des Spiele-Laufs geschrieben UND
   abgeschlossen. Der Kommentar am Wappenblock sagt es woertlich: „Der
   Wappenblock kann sie nicht mehr rot faerben; sein Ergebnis steht DANEBEN,
   nicht darin." Und der Kopf von `sendeWappen`: „⚠ SIE PROTOKOLLIERT NICHT
   nach `api_sync_log`."

   `sendeRanglisten` gibt ein Objekt zurueck und schreibt nichts.
   `sfv_team_logos` hat keine Spalte „gesendet" (`pfad`, `mime`,
   `geholt_am`, `fehlt_seit` — schema.sql).

   ⚠ ⚠ **DAMIT IST DER IDLE_TIMEOUT VOM 24.09.2026 FUER RANGLISTEN UND
     WAPPEN NICHT NACHTRAEGLICH AUFZULOESEN.** Ihre Zahlen standen
     ausschliesslich in der HTTP-Antwort, und die ist weg. Es ist keine
     Luecke in dieser Abfrage, sondern eine in der Kette — und sie faellt
     genau dann auf, wenn die Antwort ausbleibt.

   ── SEIT DEM `protokoll_nachtrag` (24.09.2026, Stand ungedeployt) ────────

   ⚠ ⚠ DIESER ABSATZ IST DER GRUND, WARUM DIE ABFRAGE UNTEN `details` LIEST
     UND NICHT BEHAUPTET, DORT STEHE NICHTS. Im Arbeitsstand von
     `wp-export/index.ts` gibt es einen Nachtragsblock: er liest die
     bestehende Protokollzeile, mischt `ranglisten` und `wappen` in ihr
     `details` und prueft mit `.select("id")` nach, dass er eine Zeile
     getroffen hat. Sein Ergebnis steht als `protokoll_nachtrag` in der
     Antwort.

     **Ab dem Deploy dieses Stands stehen beide Bloecke im Protokoll** —
     und eine Abfrage, die „steht in keinem Protokoll" fest verdrahtet,
     waere von diesem Tag an falsch, ohne dass etwas fehlschlaegt.

   ⚠ Der Nachtrag hilft dem abgebrochenen Lauf NICHT. Er laeuft nach den
     beiden Bloecken; stirbt der Worker davor, gibt es ihn nicht — und eine
     `laeuft`-Zeile bekommt ihn nie. Auch danach gilt: bei einem toten Lauf
     sind Ranglisten und Wappen verloren.

   ⚠ Und ein `status = 'ok'` in Abfrage 1 sagt ueber sie weiterhin NICHTS.
     Der Status bleibt der des SPIELE-Laufs — ausdruecklich, damit nicht
     zwei Teile in eine Farbe gezwungen werden. „Der Export ist
     durchgelaufen" und „die Ranglisten sind angekommen" sind zwei
     Aussagen, und der Status traegt nur die erste.

   WAS STATTDESSEN ANTWORTET, und es ist ein Abruf, keine Abfrage:

     · `aktion: "status"`      — die Gegenstelle nennt ihren Bestand,
                                 darunter die Wappen-Lage
     · `aktion: "bestand"`     — wie viele Gruppen und Wappen drueben liegen
     · `aktion: "ranglisten"`  — sendet die Tabellen allein, ohne
                                 Spiele-Lauf, und antwortet in Sekunden

     Alle drei beantworten die Frage an der Stelle, an der sie haengt:
     drueben.

   ── 5a · Stehen sie in der Zeile? ────────────────────────────────────────

   DREI LAGEN, und sie sehen sonst alle drei wie eine leere Spalte aus.
   Genau diese Ununterscheidbarkeit ist der Grund fuer die `case`-Spalten:

     details null              der Lauf hat seinen Abschluss nie erreicht
     details ohne 'wappen'     Lauf vor dem Nachtrag (v66 und aelter) —
                               die Zahlen sind endgueltig weg
     'wappen' da               nachgetragen, und dann steht alles da

   ⚠ Geprueft wird wieder mit `-> 'schluessel' is not null`, nicht mit `?` —
     siehe Abfrage 4. */
select l.gestartet_am at time zone 'Europe/Zurich'      as gestartet,
       l.status,
       case
         when l.details is null
           then 'kein details — Abschluss nie erreicht'
         when (l.details -> 'wappen') is not null
           then 'nachgetragen — die Zahlen stehen in dieser Zeile'
         else 'Lauf ohne Nachtrag (v66 oder aelter) — die Zahlen standen '
              || 'nur in der HTTP-Antwort und sind weg'
       end                                               as lage,
       /* Ranglisten: `geschrieben` ist die Zahl des Empfaengers,
          `im_bestand` seine Gesamtzahl — die Differenz ist das Wachstum
          durch Gruppen alter Saisons, die drueben nie entfernt werden. */
       l.details -> 'ranglisten' ->> 'gesendet'          as rang_gesendet,
       l.details -> 'ranglisten' ->> 'geschrieben'       as rang_geschrieben,
       l.details -> 'ranglisten' ->> 'im_bestand'        as rang_im_bestand,
       l.details -> 'ranglisten' ->> 'uebersprungen'     as rang_uebersprungen,
       /* Wappen: `gesendet` ist ein Boolean, `fehler` traegt die
          geschwaerzte Meldung, wenn der Block geworfen hat. */
       l.details -> 'wappen' ->> 'gesendet'              as wappen_gesendet,
       l.details -> 'wappen' ->> 'fehler'                as wappen_fehler,
       /* ⚠ Der Nachtrag selbst steht NICHT im Protokoll, sondern nur in der
          Antwort (`protokoll_nachtrag`). Scheitert er, fehlen `ranglisten`
          und `wappen` hier — und das sieht aus wie ein Lauf vor dem
          Nachtrag. Die zwei sind aus der Datenbank NICHT zu trennen. */
       l.details -> 'ranglisten'                         as ranglisten_roh,
       l.details -> 'wappen'                             as wappen_roh
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export'
 order by l.gestartet_am desc
 limit 5;


/* ── 5b · Was es zu senden GAB ───────────────────────────────────────────

   Was die Datenbank unabhaengig vom Protokoll sagen kann, ist nur, WAS ES
   ZU SENDEN GAB — nicht, ob es gesendet wurde. Die Zahlen stehen hier,
   damit niemand sie fuer eine Erfolgsmeldung nimmt: */
select (select count(*) from public.ranglisten r
         where r.verein_id = (select id from public.vereine where slug = 'fcherrliberg'))
                                                              as ranglisten_zeilen_bei_uns,
       (select count(distinct (r.sfv_liga_id, r.sfv_division_id, r.sfv_gruppe_id))
          from public.ranglisten r
         where r.verein_id = (select id from public.vereine where slug = 'fcherrliberg'))
                                                              as gruppen_bei_uns,
       (select max(r.stand_vom) at time zone 'Europe/Zurich'
          from public.ranglisten r
         where r.verein_id = (select id from public.vereine where slug = 'fcherrliberg'))
                                                              as juengstes_stand_vom,
       (select count(*) from public.sfv_team_logos g
         where g.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
           and g.pfad is not null)                            as wappen_mit_pfad,
       (select count(*) from public.sfv_team_logos g
         where g.verein_id = (select id from public.vereine where slug = 'fcherrliberg')
           and g.pfad is null)                                as wappen_ohne_pfad;
/* ⚠ `juengstes_stand_vom` ist der Zeitpunkt, an dem der SFV-SYNC die
   Rangliste geschrieben hat — nicht der, an dem wir sie nach WordPress
   gesendet haben. Wer die zwei verwechselt, liest einen frischen
   Zeitstempel als Beleg fuer einen Versand, den es nie gab. */


/* ── 6 · Die letzten Laeufe daneben: erster Abbruch oder Muster? ─────────

   ⚠ MIT `aktion`, und das ist nicht Zierrat: `api_sync_log` fuehrt den
     SFV-Sync, `namen`, `wechselnachtrag` UND den Export. Ohne die Spalte
     ist ein `export` von einem `sync` nicht zu unterscheiden — und bis zum
     11.09.2026 liess `wp-export` sie leer, weshalb eine Abfrage
     `where aktion = 'export'` nichts fand, obwohl vier Laeufe dastanden.
     **Das Fehlen wurde als Aussage gelesen** („es hat kein Lauf
     stattgefunden"), siehe den Doc-Comment an `AKTION_EXPORT`.

   ⚠ Eine Zeile mit `aktion is null` ist deshalb aelter als der 11.09.2026
     und KEIN Befund. Sie wird hier mitgezeigt statt weggefiltert: ein
     Filter auf `aktion = 'export'` verschweigt genau die Laeufe, die die
     Spalte noch nicht kannten. */
select l.gestartet_am at time zone 'Europe/Zurich'       as gestartet,
       coalesce(l.aktion, '(null — vor dem 11.09.2026)') as aktion,
       l.status,
       (l.details is not null)                           as details_da,
       round(extract(epoch from (
         coalesce(l.beendet_am, now()) - l.gestartet_am))::numeric, 1) as dauer_s,
       left(coalesce(l.meldung, ''), 110)                as meldung_anfang
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
 order by l.gestartet_am desc
 limit 20;


/* ── 6b · Wie oft ist ein Export-Lauf schon steckengeblieben? ────────────

   Eine Zahl statt einer Liste: sie beantwortet „erster Abbruch oder
   Muster?" in einer Zeile.

   ⚠ Gezaehlt werden als steckengeblieben nur Zeilen AUSSERHALB der
     Laufsperre. Eine offene Zeile von vor fuenf Minuten darf noch leben,
     und sie als Abbruch zu zaehlen waere ein Fehlalarm — siehe die Warnung
     in Abfrage 1. Deshalb stehen beide Toepfe da, nicht nur einer.

   ⚠ DIE AUFTEILUNG MUSS AUFGEHEN: `steckengeblieben + offen_noch_erlaubt +
     ok + warnung + fehler = export_laeufe`. Geht sie nicht auf, traegt eine
     Zeile einen Status, den keine der fuenf Spalten kennt — und das ist
     dann der Befund. **Eine Aufteilung, die aufgehen muss, prueft sich
     selbst; eine einzelne Zahl kann nur behauptet werden.** */
select count(*)                                                   as export_laeufe,
       count(*) filter (where l.status = 'laeuft'
                          and l.gestartet_am < now() - interval '30 minutes')
                                                                  as steckengeblieben,
       count(*) filter (where l.status = 'laeuft'
                          and l.gestartet_am >= now() - interval '30 minutes')
                                                                  as offen_noch_erlaubt,
       count(*) filter (where l.status = 'ok')                     as ok,
       count(*) filter (where l.status = 'warnung')                as warnung,
       count(*) filter (where l.status = 'fehler')                 as fehler,
       min(l.gestartet_am) at time zone 'Europe/Zurich'            as erster_lauf,
       max(l.gestartet_am) at time zone 'Europe/Zurich'            as letzter_lauf
  from public.api_sync_log l
  join public.api_verbindungen v on v.id = l.verbindung_id
 where v.key = 'wordpress'
   and l.aktion = 'export';


/* ── 7 · Haengt die Sperre noch? ─────────────────────────────────────────

   `sync_laeuft_seit` wird in einem `finally` immer geloest
   (im `finally` der Teile-Schleife) — steht dort trotzdem ein Wert, hat der Lauf den
   `finally` nicht mehr erreicht, also wurde der Worker mitten im Vorgang
   beendet. Dann ist der naechste Export bis 30 Minuten nach diesem
   Zeitpunkt gesperrt.

   ⚠ `sync_status` und `sync_meldung` kommen aus dem ABSCHLUSS-Update
     (aus demselben Abschluss-Update) und stehen bei einem toten Lauf noch auf dem Stand
     des VORHERIGEN Laufs. Sie sind dann kein Ergebnis dieses Laufs — und
     das ist die Sorte Stand, die auf einer Kachel wie gepflegt aussieht. */
select v.key,
       v.active,
       v.auto_sync,
       v.sync_laeuft_seit at time zone 'Europe/Zurich'      as sperre_seit,
       case
         when v.sync_laeuft_seit is null then 'frei'
         when v.sync_laeuft_seit > now() - interval '30 minutes'
           then 'GESPERRT bis '
                || to_char((v.sync_laeuft_seit + interval '30 minutes')
                             at time zone 'Europe/Zurich', 'HH24:MI:SS')
         else 'Sperre abgelaufen — der naechste Lauf kommt durch'
       end                                                   as sperre,
       v.letzter_sync at time zone 'Europe/Zurich'           as letzter_sync,
       v.sync_status,
       left(coalesce(v.sync_meldung, ''), 140)               as sync_meldung
  from public.api_verbindungen v
 where v.key = 'wordpress';


/* ── 8 · Nur bei einem CRON-Lauf: die verlorene Antwort ──────────────────

   ⚠ ⚠ DIESE ABFRAGE HILFT BEIM DRUCK IM BROWSER NICHT. `pg_net` legt eine
     Zeile nur an, wenn der Aufruf aus der DATENBANK kam — also vom
     stuendlichen Auftrag (`cron_wp_export.sql`). Ein Klick auf „Export
     starten" laeuft aus dem Browser und hinterlaesst hier nichts.

     **Eine leere Antwort heisst hier also „nicht zutreffend", nicht
     „nichts gefunden".** Genau diese zwei sehen sonst gleich aus.

   Sie steht trotzdem hier, weil sie der EINZIGE Ort ist, an dem die volle
   HTTP-Antwort liegen kann — mit `ranglisten`, `wappen` und
   `unterfelder_geprueft`, die in keinem Protokoll stehen (Abfrage 4 und 5).

   ⚠ `net._http_response` reicht nur wenige Stunden zurueck; pg_net raeumt
     selbst auf. Die Tabelle sagt, ob es JETZT klemmt, nie seit wann.

   ⚠ Ohne Alias geschrieben: die Tabelle liegt im Schema `net` und steht in
     keinem `public`-Dump, also kann `check:spalten` ihre Spaltennamen nicht
     kennen. Ein `r.status_code` waere dort ein Fehlalarm. */
select status_code,
       created at time zone 'Europe/Zurich'   as angekommen,
       left(content, 400)                     as antwort_anfang
  from net._http_response
 order by created desc
 limit 10;
