/* ════════════════════════════════════════════════════════════════
   Das Probespiel 4382013 — hat es eine Karte gegen einen eigenen Trainer?
   Angelegt am 24.09.2026. ALLE VIER ABFRAGEN LESEN NUR.

   Anlass: der Theme-Chat meldet fuer
     FC Herrliberg 2 – FC Maennedorf 1, 29.08.2026, sfv_match_id 4382013
     https://dev.fcherrliberg.ch/spiele/2026-08-29-fc-herrliberg-2-fc-maennedorf-1/
   „0 von 19 Verlaufszeilen mit einer Rolle" und keine Trainerzeile.

   ⚠ ⚠  DIE ERSTE FRAGE IST, OB DIESE MELDUNG ETWAS UEBER DAS SPIEL SAGT —
         UND NACH DEM CODE IST DIE ANTWORT NEIN.

         `rolle` in der Nutzlast kommt aus `werBefund().rolle`, und das ist
         `rollenText(e)` (`matchdatenAnzeige.ts:582`):

             if (!istRollenvermerk(e)) return "";

         `istRollenvermerk()` gibt `false` zurueck, sobald
         `rolle_kategorie_id == null` — und `null` traegt JEDE Zeile des
         Altbestands, weil die Spalte erst mit Commit baac77a dazugekommen
         ist. Fuer ein Spiel, das seither nicht neu geholt wurde, ist
         `rolle` also auf JEDER Zeile leer.

         Damit ist „0 von 19" die erwartete Ausgabe vor dem Neuabruf und
         kein Befund ueber dieses Spiel. Abfrage 1 und 2 belegen das mit
         Zahlen statt mit diesem Satz — die Messung gilt, nicht der Absatz.

   ⚠     `null` heisst NICHT GEFRAGT, nicht „Spieler". Fuer die ANZEIGE
         fallen beide zusammen (`istRollenvermerk()` sagt zu beiden
         `false`), und genau deshalb bleibt fuer den Altbestand der alte
         Rueckfalltext „Unser Team" stehen.

   ⚠     `spiele.date`, nicht `datum`. Die Spalte heisst englisch, waehrend
         `zeit` daneben deutsch heisst; drei Abfragen sind am 12./13.09.2026
         an erfundenen Spaltennamen gescheitert.

   ⚠     Gefiltert wird ueber `sfv_match_id` allein, nicht ueber
         `(verein_id, sfv_match_id)`. Der Schluessel ist zweiteilig; solange
         ein Verein im Portal steht, ist das folgenlos. Bei einem zweiten
         Verein gehoert `and s.verein_id = '…'` dazu.
   ════════════════════════════════════════════════════════════════ */


/* ── 1 · Traegt der BESTAND ueberhaupt schon Rollenangaben? ────────────

   ⚠ ⚠  DIESE ABFRAGE ENTSCHEIDET, OB ALLES WEITERE ETWAS BEDEUTET.
         Steht `mit_kategorie` auf 0, ist Abfrage 4 strukturell leer und
         die Meldung des Theme-Chats gegenstandslos — dann ist NICHTS neu
         geholt worden, und keine Zeile KANN eine Rolle tragen.

   Die Bezugsgroesse gehoert in dieselbe Zeile wie die Trefferzahl: eine
   Null ohne sie laesst offen, ob nichts da ist oder nichts gemessen wurde.

   ⚠ `vorgemerkt` ist die Gegenprobe auf Abfrage 4 aus
     `abfragen_2026-09-24_rolle_verlauf.sql`. Sie setzt
     `matchdaten_geholt_am = null` und legt die Spiele damit in den Topf
     `neu`. Zu lesen:

       vorgemerkt = 0 UND mit_kategorie = 0
           ⚠ das Ruecksetzen ist NICHT gelaufen. Nichts wird nachgeholt,
             und es aendert sich von allein auch nichts — der rollende
             Nachlauf hat nur zwei Plaetze je Stunde.
       vorgemerkt > 0
           es laeuft; je Stunde kommen zwoelf Spiele dazu.
       vorgemerkt = 0 UND mit_kategorie > 0
           durch — alle vorgemerkten Spiele sind geholt. */
select (select count(*) from public.spiel_ereignisse
         where herkunft = 'sfv')                                   as zeilen_gesamt,
       (select count(rolle_kategorie_id) from public.spiel_ereignisse
         where herkunft = 'sfv')                                   as mit_kategorie,
       (select count(*) from public.spiel_ereignisse
         where herkunft = 'sfv'
           and rolle_kategorie_id is not null
           and rolle_kategorie_id <> 1)                            as mit_vermerk,
       (select count(distinct spiel_id) from public.spiel_ereignisse
         where herkunft = 'sfv' and rolle_kategorie_id is not null) as spiele_mit_kategorie,
       (select count(distinct spiel_id) from public.spiel_ereignisse
         where herkunft = 'sfv')                                   as spiele_mit_ereignissen,
       /* ⚠ Ein Spiel OHNE `matchdaten_geholt_am`, das Ereignisse hat, war
          schon einmal geholt und ist zurueckgesetzt worden — es wartet
          also auf den Nachlauf. */
       (select count(*) from public.spiele s
         where s.matchdaten_geholt_am is null
           and exists (select 1 from public.spiel_ereignisse e
                        where e.spiel_id = s.id and e.herkunft = 'sfv'))
                                                                   as vorgemerkt;


/* ── 2 · Wurde DIESES Spiel seit dem Ruecksetzen neu geholt? ───────────

   ⚠ ⚠  GEFRAGT WIRD DIE SPALTE DIESER ZEILE — `spiele.matchdaten_geholt_am`.
         NICHT `max(e.zuletzt_synchronisiert)` ueber `spiel_ereignisse`: am
         11.09.2026 hat genau das eine halbe Untersuchung gekostet. Das
         Aggregat war leer, weil der Verband zu diesen Spielen keinen
         Verlauf fuehrt — und „keine Ereignisse" wurde als „nie geholt"
         gelesen. Eine Abfrage, die ueber eine Nebentabelle joint, misst
         die Anwesenheit der Nebentabelle, nicht die der Sache.

   Zu lesen:
     matchdaten_geholt_am is null
         ⚠ zurueckgesetzt und noch NICHT nachgeholt. Dann traegt keine
           Zeile eine Rolle, und „0 von 19" ist richtig und erwartet.
     geholt_am liegt VOR dem Ruecksetzen
         ⚠ das Ruecksetzen hat dieses Spiel nicht getroffen — die
           Bedingung in Abfrage 4 verlangt eine Zeile mit Rueckfalltext,
           und ein Spiel ohne eine solche Zeile bleibt stehen.
     geholt_am liegt DANACH und zeilen_mit_kategorie = 0
         das waere der Befund — neu geholt, und trotzdem keine
         Rollenangabe. Dann liegt es am Sync, nicht am Altbestand.

   ⚠ Die Zahlen daneben sind die Bezugsgroesse: ohne sie sagt ein
     Zeitstempel nicht, ob die Zeilen etwas tragen. */
select s.sfv_match_id,
       s.date                                                   as spieldatum,
       s.team                                                   as unsere_mannschaft,
       s.gegner,
       case when s.heimspiel then 'heim' else 'auswaerts' end    as heim_auswaerts,
       s.liga,
       s.resultat,
       s.sfv_status,
       s.matchdaten_geholt_am,
       s.zuletzt_synchronisiert,
       count(e.id)                                              as zeilen_sfv,
       count(e.rolle_kategorie_id)                              as zeilen_mit_kategorie,
       count(*) filter (where e.rolle_kategorie_id is not null
                          and e.rolle_kategorie_id <> 1)        as zeilen_mit_vermerk,
       count(*) filter (where e.person_name is not null
                          and btrim(e.person_name) <> '')       as zeilen_mit_person_name,
       /* ⚠ Die Zahl, gegen die der Theme-Chat seine 19 haelt: nur diese
          fuenf Typen erscheinen ueberhaupt im Verlauf (`verlaufArt()`),
          alles andere verwirft `baueVerlauf()` mit `continue`. */
       count(*) filter (where e.typ_id in (1, 2, 3, 4, 9))      as zeilen_im_verlauf
  from public.spiele s
  left join public.spiel_ereignisse e
         on e.spiel_id = s.id and e.herkunft = 'sfv'
 where s.sfv_match_id = 4382013
 group by s.id, s.sfv_match_id, s.date, s.team, s.gegner, s.heimspiel,
          s.liga, s.resultat, s.sfv_status, s.matchdaten_geholt_am,
          s.zuletzt_synchronisiert;


/* ── 3 · Jede Ereigniszeile des Spiels, mit dem erwarteten Text ────────

   ⚠ ⚠  DER TEXTNACHBAU IST UEBERNOMMEN AUS
         `abfragen_2026-09-24_trainerkarte_probe.sql`, Abfrage 2 — nicht neu
         gebaut. Zwei Nachbauten derselben Funktion laufen still
         auseinander, und dort ist er gegen ein echtes Postgres geprueft.

   ⚠     Die erste Fassung dort hatte einen Fehler, der hier mitkommt, weil
         er behoben ist: dem Zweig auf `person_name` fehlte der
         `istRollenvermerk`-Riegel. Ohne ihn zeigt die Abfrage bei einem
         unzugeordneten eigenen SPIELER seinen rohen Verbandsnamen, waehrend
         die Funktion „Nr. 13" anzeigt — eine Preisgabe in der Vorschau, die
         es in der Anzeige nicht gibt. Der Riegel steht unten als
         `case when v.ist_vermerk then nullif(btrim(e.person_name), '') end`.

   ⚠ ⚠  DIE RANGFOLGE IST DIE AUS `werBefund()`, UND SIE IST GEMESSEN:
         `wp-export/index.ts:2232` baut

             namen = new Map([...sfvNamen, ...zugeordnet])

         — die Zuordnung ueberschreibt also den Verbandsnamen, und BEIDE
         liegen in derselben Karte, die Stufe 4 von `werBefund()` abfragt.
         Erst danach kommt `rollenName()` mit `person_name`, dann die
         Rueckennummer, dann Stufe 5: der Rollentext allein, sonst
         „Unser Team".

   ⚠     Ein Trainer steht in `sfv_personen` GAR NICHT — die Tabelle kommt
         aus /players, und /players fuehrt nur Spieler. Die zwei oberen
         Zweige treffen bei ihm im Normalfall nicht; sie stehen trotzdem
         hier, weil sie GEWINNEN, wenn sie treffen.

   ⚠ ⚠  `verlauf_art` ist `verlaufArt()` nachgebaut. Steht dort `null`,
         erscheint die Zeile auf der Website NICHT — und wer das nicht
         sieht, sucht eine Zeile, die nie gesendet wurde. */
select e.minute,
       e.zusatzminute,
       e.typ_id,
       e.typ,
       e.subtyp_id,
       e.subtyp,
       case when e.typ_id = 1 then 'tor'
            when e.typ_id = 3 then 'gelb'
            when e.typ_id = 4 and e.subtyp_id = 20 then 'gelbrot'
            when e.typ_id = 4 then 'rot'
            when e.typ_id = 2 then 'wechsel'
            when e.typ_id = 9 then 'assist'
       end                                                      as verlauf_art,
       e.ist_eigener,
       e.rolle_kategorie_id,
       e.rolle_kategorie,
       /* ⚠ Der Klarname des Verbands an der Zeile. Er steht hier, weil die
          Frage lautet, ob wir einen Trainer BENENNEN koennten — nicht nur,
          ob eine Rolle dasteht. */
       e.person_name,
       e.rueckennr,
       e.sfv_person_id,
       e.gegner_club_name,
       /* ⚠ ⚠  DER ROLLENTEXT, WIE `rollenText()` IHN BILDET. `-` gilt als
          LEER, nicht als Text: bei `subtyp` steht dort der Klartext zu
          Subtyp 0, und ohne diese Pruefung stand am 05.09.2026 beinahe
          „FC Kuesnacht a · -" auf der Website. */
       w.rolle_text,
       w.name_laut_rangfolge,
       /* Stufe 5 aus `werBefund()`: der Rollentext allein, sonst
          „Unser Team". Ohne diesen Zweig stuende hier ein leeres Feld, wo
          die Website einen Satz zeigt. */
       case when w.name_laut_rangfolge is not null
            then btrim(concat_ws(' ', w.rolle_text, w.name_laut_rangfolge))
            else coalesce(nullif(w.rolle_text, ''), 'Unser Team')
       end                                                      as erwarteter_text,
       /* ⚠ ⚠  DIE KORREKTURPRUEFUNG IST KEIN ZIERRAT. Der Export laeuft
          ueber `mischeEreignisse()`: eine aktive Vereins-Zeile VERDECKT die
          SFV-Zeile, auf die sie zeigt (`matchdatenAnzeige.ts:149`) — und
          eine korrigierte Zeile traegt die drei neuen Spalten nicht. Steht
          hier `true`, sagt die SFV-Zeile nichts darueber, was die Website
          zeigt. */
       exists (select 1 from public.spiel_ereignisse k
                where k.herkunft = 'verein'
                  and k.verworfen_am is null
                  and k.ersetzt_ereignis_id = e.id)             as verdeckt_von_korrektur,
       e.herkunft,
       e.verworfen_am,
       e.zuletzt_synchronisiert
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
  left join public.sfv_zuordnung z
         on z.verein_id = e.verein_id and z.sfv_person_id = e.sfv_person_id
  left join public.mitglieder m on m.id = z.mitglied_id
  left join public.personen   p on p.id = m.person_id
  left join public.sfv_personen sp
         on sp.verein_id = e.verein_id and sp.sfv_person_id = e.sfv_person_id
  /* ⚠ ⚠  DIE EINE BEDINGUNG, AUS DER BEIDES FOLGT — Rollentext UND
     Namenszweig. Sie steht als eigene Unterabfrage da, damit sie nicht
     zweimal getippt wird: zwei Stellen, eine Aussage, von Hand
     gleichgehalten, ist genau der Fehler, den `werBefund()` am
     24.09.2026 beseitigt hat. */
  cross join lateral (
    select e.rolle_kategorie_id is not null
             and e.rolle_kategorie_id <> 1                      as ist_vermerk
  ) v
  cross join lateral (
    select case when not v.ist_vermerk then ''
                when btrim(coalesce(e.rolle_kategorie, '')) in ('', '-') then ''
                else btrim(e.rolle_kategorie) end               as rolle_text,
           coalesce(nullif(btrim(concat_ws(' ', p.vorname, p.nachname)), ''),
                    nullif(btrim(sp.name), ''),
                    case when v.ist_vermerk
                         then nullif(btrim(e.person_name), '') end,
                    case when e.rueckennr is not null
                         then 'Nr. ' || e.rueckennr end)        as name_laut_rangfolge
  ) w
 /* ⚠ ALLE Herkuenfte, nicht nur `sfv`. Eine Vereins-Zeile ist ein Nachtrag
    oder eine Korrektur und erscheint auf der Website genauso; sie
    wegzufiltern hiesse, einen Teil des Verlaufs zu verschweigen. */
 where s.sfv_match_id = 4382013
 order by e.minute nulls last, e.zusatzminute nulls first, e.typ_id;


/* ── 4 · Rueckfall: EIN Spiel, das eine Karte gegen einen eigenen
          Funktionaer traegt — falls 4382013 keine hat ─────────────────

   ⚠ ⚠  SIE BLEIBT LEER, SOLANGE ABFRAGE 1 `mit_vermerk = 0` MELDET. Das
         ist dann kein Defekt, sondern dieselbe Antwort: nichts ist neu
         geholt, also traegt nichts eine Kategorie.

   ⚠     Die Bedingung laeuft ueber die ID, nie ueber den Klartext:
         `rolle_kategorie_id is not null AND <> 1`. Die echte Antwort
         schreibt „Spieler/in", `sfv_stammdaten.json` schreibt „Spieler" —
         zwei Listen desselben Verbands, nicht zeichengleich. Ein Vergleich
         auf „Trainer" traefe „Trainer/in" nicht.

   ⚠     NICHT ueber die fehlende Rueckennummer. Bis zum 24.09.2026 hing
         der Text daran; ein unzugeordneter SPIELER ohne Nummer landet im
         selben Zustand, und fuer ihn gilt weiter „Nr. 13" bzw.
         „Unser Team".

   ⚠     `typ_id in (3, 4)` sind Verwarnung und Ausschluss — die Karten.

   ⚠ ⚠  ZUR ADRESSE: SIE IST AUS DIESEM REPOSITORY NICHT HERLEITBAR.
         `get_permalink()` und `post_name` kommen im Empfaenger nicht vor,
         und der Titel entsteht in `fch_core_spiel_titel()` — das liegt in
         `fch-core`, also im anderen Repository. Ausgegeben werden deshalb
         die BESTANDTEILE, aus denen sich der Link zusammensetzen laesst,
         nicht der Link.

         Die eine bekannte Adresse lautet

           /spiele/2026-08-29-fc-herrliberg-2-fc-maennedorf-1/

         also Datum, dann Heim, dann Gast — klein, mit Bindestrichen,
         Umlaute umschrieben (ae). Das ist EIN Beispiel, kein Muster: ob
         bei einem AUSWAERTSSPIEL dieselbe Reihenfolge gilt, ist
         ungemessen. Und der Mannschaftsname im Slug kommt von drueben —
         unser `spiele.team` kann anders lauten. Deshalb steht er hier
         daneben, statt in einen Link eingesetzt zu werden. */
select s.sfv_match_id,
       s.date                                                   as spieldatum,
       s.team                                                   as unsere_mannschaft,
       s.gegner,
       case when s.heimspiel then 'heim' else 'auswaerts' end    as heim_auswaerts,
       /* ⚠ Die zwei Bestandteile in der Reihenfolge des einen bekannten
          Links — heim zuerst. Als VERMUTUNG, nicht als Bauanleitung: bei
          einem Auswaertsspiel ist die Reihenfolge ungemessen. */
       case when s.heimspiel then s.team  else s.gegner end      as slug_erster_teil,
       case when s.heimspiel then s.gegner else s.team  end      as slug_zweiter_teil,
       s.liga,
       s.resultat,
       e.minute,
       e.zusatzminute,
       e.typ_id,
       e.typ,
       e.rolle_kategorie_id,
       e.rolle_kategorie,
       e.person_name,
       e.rueckennr,
       w.rolle_text,
       w.name_laut_rangfolge,
       case when w.name_laut_rangfolge is not null
            then btrim(concat_ws(' ', w.rolle_text, w.name_laut_rangfolge))
            else coalesce(nullif(w.rolle_text, ''), 'Unser Team')
       end                                                      as erwarteter_text,
       s.matchdaten_geholt_am
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
  left join public.sfv_zuordnung z
         on z.verein_id = e.verein_id and z.sfv_person_id = e.sfv_person_id
  left join public.mitglieder m on m.id = z.mitglied_id
  left join public.personen   p on p.id = m.person_id
  left join public.sfv_personen sp
         on sp.verein_id = e.verein_id and sp.sfv_person_id = e.sfv_person_id
  cross join lateral (
    select e.rolle_kategorie_id is not null
             and e.rolle_kategorie_id <> 1                      as ist_vermerk
  ) v
  cross join lateral (
    select case when not v.ist_vermerk then ''
                when btrim(coalesce(e.rolle_kategorie, '')) in ('', '-') then ''
                else btrim(e.rolle_kategorie) end               as rolle_text,
           coalesce(nullif(btrim(concat_ws(' ', p.vorname, p.nachname)), ''),
                    nullif(btrim(sp.name), ''),
                    case when v.ist_vermerk
                         then nullif(btrim(e.person_name), '') end,
                    case when e.rueckennr is not null
                         then 'Nr. ' || e.rueckennr end)        as name_laut_rangfolge
  ) w
 where e.herkunft = 'sfv'
   and e.ist_eigener
   and e.typ_id in (3, 4)
   and e.rolle_kategorie_id is not null
   and e.rolle_kategorie_id <> 1
   and s.sfv_match_id is not null
   and not exists (
         select 1 from public.spiel_ereignisse k
          where k.herkunft = 'verein'
            and k.verworfen_am is null
            and k.ersetzt_ereignis_id = e.id)
 /* ⚠ ⚠  ZEILEN MIT EINEM ROLLENTEXT ZUERST — und das ist kein Geschmack.
    Eine Zeile kann einen Vermerk TRAGEN (Id 3) und trotzdem „Unser Team"
    zeigen: naemlich dann, wenn `rolle_kategorie` leer ist oder `-`. Fuer
    die Probe ist sie unbrauchbar, obwohl die Bedingung auf sie zutrifft.

    ⚠ Sie wird deshalb NICHT weggefiltert, nur nach hinten gestellt — wer
    sie wegfiltert, sieht nicht mehr, dass der Verband einen Strich
    geliefert hat. */
 order by (w.rolle_text = ''), s.date desc, e.minute
 limit 10;
