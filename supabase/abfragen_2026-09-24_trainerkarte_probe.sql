/* ════════════════════════════════════════════════════════════════
   Eine Stelle finden, an der der neue Rollentext erscheint
   Angelegt am 24.09.2026. ALLE DREI ABFRAGEN LESEN NUR.

   Anlass: seit Commit baac77a traegt eine Verlaufszeile das Feld `rolle`,
   und bei einer Karte gegen einen eigenen Trainer steht statt
   „Unser Team" jetzt „Trainer/in Hans Meier". Gesucht ist EIN Spiel, an
   dem sich das ansehen laesst — mit Titel und Link.

   ⚠ ⚠  ABFRAGE 1 ZUERST, UND SIE KANN NULL ERGEBEN. Der Altbestand traegt
         `rolle_kategorie_id = null`, und `null` heisst NICHT GEFRAGT,
         nicht „Spieler". Solange kein Nachlauf die Spiele neu geholt hat,
         findet Abfrage 2 moeglicherweise KEINE Zeile — und das ist dann
         kein Defekt, sondern die Antwort auf Abfrage 1.

         Das Ruecksetzen dafuer steht in
         `abfragen_2026-09-24_rolle_verlauf.sql`, Abfrage 4.

   ⚠     `spiele.date`, nicht `datum`. Die Spalte heisst englisch, waehrend
         `zeit` daneben deutsch heisst; drei Abfragen sind am 12./13.09.2026
         an erfundenen Spaltennamen gescheitert.
   ════════════════════════════════════════════════════════════════ */


/* ── 1 · Tragen die Zeilen die Rollenangabe ueberhaupt schon? ──────────

   Die Bezugsgroesse gehoert in dieselbe Zeile wie die Trefferzahl: eine
   Null ohne sie laesst offen, ob nichts da ist oder nichts gemessen wurde.

   Zu lesen:
     mit_kategorie = 0      kein Spiel neu geholt — Abfrage 2 bleibt leer,
                            und das ist richtig. Erst zuruecksetzen.
     mit_vermerk   = 0      neu geholt, aber keine Zeile traegt eine
                            Kategorie ausser 1 (Spieler) — dann gibt es im
                            Bestand keine Funktionaers-Karte.
     mit_vermerk   > 0      Abfrage 2 findet etwas. */
select count(*)                                                     as zeilen_gesamt,
       count(e.rolle_kategorie_id)                                  as mit_kategorie,
       count(*) filter (where e.rolle_kategorie_id is not null
                          and e.rolle_kategorie_id <> 1)            as mit_vermerk,
       count(*) filter (where e.person_name is not null
                          and btrim(e.person_name) <> '')           as mit_person_name,
       count(distinct e.spiel_id) filter (where e.rolle_kategorie_id is not null
                                            and e.rolle_kategorie_id <> 1)
                                                                    as spiele_mit_vermerk
  from public.spiel_ereignisse e
 where e.herkunft = 'sfv';


/* ── 2 · Das Spiel mit einer KARTE gegen einen eigenen Funktionaer ─────

   ⚠ Die Bedingung ist dieselbe wie in `istRollenvermerk()`
     (`matchdatenAnzeige.ts`): `rolle_kategorie_id is not null` UND
     `<> 1`. NICHT ueber den Klartext — die echte Antwort schreibt
     „Spieler/in", `sfv_stammdaten.json` schreibt „Spieler", und ein
     Vergleich auf „Trainer" traefe „Trainer/in" nicht.

   ⚠ NICHT ueber die fehlende Rueckennummer. Bis zum 24.09.2026 hing der
     Text daran; ein unzugeordneter SPIELER ohne Nummer landet im selben
     Zustand, und fuer ihn gilt weiter „Nr. 13" bzw. „Unser Team".

   ⚠ `typ_id in (3, 4)` sind Verwarnung und Ausschluss — die Karten.
     Der Verlauf zeigt ausserdem 1 (Tor), 2 (Wechsel) und 9 (Assist);
     alles andere kennt `verlaufArt()` nicht und erscheint nirgends.

   ⚠ ⚠  DIE KORREKTURPRUEFUNG IST KEIN ZIERRAT. Der Export laeuft ueber
         `mischeEreignisse()`: eine aktive Vereins-Zeile VERDECKT die
         SFV-Zeile, auf die sie zeigt — und eine korrigierte Zeile traegt
         die drei neuen Spalten nicht. Ohne diesen `not exists` koennte
         hier ein Spiel stehen, an dem weiter „Unser Team" steht. */
select s.sfv_match_id,
       s.date                                    as spieldatum,
       s.team                                    as unsere_mannschaft,
       s.gegner,
       case when s.heimspiel then 'heim' else 'auswaerts' end as heim_auswaerts,
       s.liga,
       s.resultat,
       e.minute,
       e.zusatzminute,
       e.typ_id,
       e.typ,
       e.rolle_kategorie_id,
       e.rolle_kategorie,
       /* ⚠ ⚠  DIE RANGFOLGE AUS `werBefund()`, IN DERSELBEN REIHENFOLGE:
          Zuordnung gewinnt, dann der rohe Name des Verbands
          (`sfv_personen`), dann der Name an der Ereigniszeile
          (`person_name`), dann die Rueckennummer. Nur so steht hier der
          Text, den die Website zeigt.

          ⚠ Ein Trainer steht in `sfv_personen` GAR NICHT — die Tabelle
          kommt aus /players, und /players fuehrt nur Spieler. Die zwei
          oberen Zweige treffen bei ihm also im Normalfall nicht; sie
          stehen trotzdem hier, weil sie GEWINNEN, wenn sie treffen. */
       w.name_laut_rangfolge,
       /* ⚠ ⚠  UND WENN KEIN NAME GILT, IST DER TEXT DIE ROLLE ALLEIN —
          sonst „Unser Team". Genau die Stufe 5 aus `werBefund()`:
          `rolle || "Unser Team"`. Ohne diesen Zweig stuende hier ein
          leeres Feld, wo die Website einen Satz zeigt. */
       case when w.name_laut_rangfolge is not null
            then btrim(concat_ws(' ', w.rolle_text, w.name_laut_rangfolge))
            else coalesce(nullif(w.rolle_text, ''), 'Unser Team')
       end                                              as erwarteter_text,
       s.matchdaten_geholt_am
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
             and e.rolle_kategorie_id <> 1                       as ist_vermerk
  ) v
  /* ⚠ `-` gilt als LEER, nicht als Text — bei `subtyp` steht dort der
     Klartext zu Subtyp 0, und ohne diese Pruefung stand am 05.09.2026
     beinahe „FC Kuesnacht a · -" auf der Website. Ob der Verband das bei
     `roleCategoryName` ebenso tut, ist ungemessen; die Pruefung kostet
     nichts. Dieselbe Zeile steht in `rollenText()`. */
  cross join lateral (
    select case when not v.ist_vermerk then ''
                when btrim(coalesce(e.rolle_kategorie, '')) in ('', '-') then ''
                else btrim(e.rolle_kategorie) end               as rolle_text,
           coalesce(nullif(btrim(concat_ws(' ', p.vorname, p.nachname)), ''),
                    nullif(btrim(sp.name), ''),
                    /* ⚠ ⚠  NUR BEI EINEM ROLLENVERMERK — derselbe Riegel wie
                       in `rollenName()`. Ohne ihn bekaeme ein unzugeordneter
                       eigener SPIELER seinen rohen Verbandsnamen, obwohl die
                       Website „Nr. 13" zeigt: eine Preisgabe in der Vorschau,
                       die es in der Anzeige nicht gibt.

                       ⚠ Gemessen am 24.09.2026 gegen `bildeVerlauf()`: ohne
                       diesen Zweig sagte die Abfrage
                       „Spieler/in <Name>", die Funktion „Nr. 13". */
                    case when v.ist_vermerk
                         then nullif(btrim(e.person_name), '') end,
                    case when e.rueckennr is not null
                         then 'Nr. ' || e.rueckennr end)         as name_laut_rangfolge
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
    Gemessen am 24.09.2026 gegen `bildeVerlauf()`: bei `rolle_kategorie
    = '-'` steht dort „Unser Team", nicht „- Hans Meier".

    ⚠ Sie wird deshalb NICHT weggefiltert, nur nach hinten gestellt — wer
    sie wegfiltert, sieht nicht mehr, dass der Verband einen Strich
    geliefert hat. */
 order by (w.rolle_text = '') , s.date desc, e.minute
 limit 10;


/* ── 3 · Rueckfall: JEDER Rollenvermerk, nicht nur Karten ─────────────

   Wenn Abfrage 2 leer bleibt und Abfrage 1 `mit_vermerk > 0` meldet, steht
   der Vermerk an einer anderen Ereignisart — dann zeigt diese Abfrage, an
   welcher. `typ_id` bleibt auf die fuenf begrenzt, die im Verlauf
   ueberhaupt erscheinen; ein Vermerk an einem anderen Typ waere sichtbar
   nirgends und damit fuer die Probe unbrauchbar. */
select e.typ_id,
       e.typ,
       e.rolle_kategorie_id,
       e.rolle_kategorie,
       count(*)                          as zeilen,
       count(distinct e.spiel_id)        as spiele,
       min(s.date)                       as frueheste,
       max(s.date)                       as spaeteste
  from public.spiel_ereignisse e
  join public.spiele s on s.id = e.spiel_id
 where e.herkunft = 'sfv'
   and e.ist_eigener
   and e.typ_id in (1, 2, 3, 4, 9)
   and e.rolle_kategorie_id is not null
   and e.rolle_kategorie_id <> 1
 group by 1, 2, 3, 4
 order by zeilen desc;
