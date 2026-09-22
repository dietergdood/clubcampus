-- ══════════════════════════════════════════════════════════════════════
--  EIGENTORE — DIE ZWEI BLOECKE ZUM DRUECKEN, 22.09.2026
--
--  Auszug aus `supabase/abfragen_eigentore_2026-09-22.sql`. Jene Datei
--  bleibt unveraendert stehen — sie ist das vollstaendige Papier mit
--  acht Abfragen, Herleitung und Belegstellen. Diese hier ist der
--  Auszug: genau zwei Bloecke, jeder einzeln auszufuehren.
--
--  ── ⚠ ⚠  WARUM ZWEI BLOECKE UND NICHT EINE DATEI ────────────────────
--
--  Der Supabase-SQL-Editor zeigt bei mehreren Anweisungen **nur das
--  Ergebnis der letzten**. Eine Datei mit acht Abfragen liefert dort
--  sieben unsichtbare Ergebnisse — und „Success" daneben, das wie eine
--  Bestaetigung aussieht und heisst: ich habe dir nichts gesagt.
--
--  Deshalb: **einen Block markieren, nur die Markierung ausfuehren.**
--  Ein Block reicht von seinem `with` bis zum Semikolon.
--
--  Nur lesend. Keine begin/commit-Huelle, kein raise notice.
--
--  ── DIE KONSTANTEN, BELEGT ──────────────────────────────────────────
--
--    typ_id    = 1  Tor       src/domains/spiele/matchdatenAnzeige.ts:235
--    subtyp_id = 2  Eigentor  src/domains/spiele/wpNutzlast.ts:463
--
--  ⚠ UEBER DIE KENNZAHL, NIE UEBER DEN KLARTEXT. `subtyp` traegt den
--    Text des Verbands und waere eine Schreibweise; `subtyp_id` ist das
--    Merkmal. Bei Subtyp 0 steht im Klartext ein blosser Strich.
--
--  ── ⚠ ⚠  WAS „WIRKSAM" HEISST ───────────────────────────────────────
--
--  `spiel_ereignisse` hat ZWEI Schichten (`herkunft` = sfv | verein):
--
--    · eine Vereins-Zeile MIT `ersetzt_ereignis_id` verdeckt die
--      SFV-Zeile, auf die sie zeigt — beide stehen in der Tabelle
--    · `verworfen_am` macht eine Korrektur gegenstandslos, dann gilt
--      die SFV-Zeile erneut
--    · eine Vereins-Zeile OHNE `ersetzt_ereignis_id` ist ein Nachtrag
--      und kommt zusaetzlich dazu
--
--  Die Regel steht in `mischeEreignisse()`
--  (src/domains/spiele/matchdatenAnzeige.ts:61-95) und ist unten als
--  CTE `wirksam` nachgebaut — Zeichen fuer Zeichen aus der
--  vollstaendigen Datei uebernommen, nicht neu erfunden. BEIDE Bloecke
--  fuehren sie mit.
--
--  ── ⚠ `resultat` UND `ht_resultat` STEHEN IMMER ALS heim:gast ───────
--
--  Nicht unsere Seite zuerst. Die Zuordnung laeuft ueber
--  `spiele.heimspiel` — so macht es `halbzeitWiderspruch()`
--  (wpNutzlast.ts:418-419). Wer das verwechselt, meldet JEDES
--  Auswaertsspiel mit ungleichem Stand als Widerspruch.
--
--  ⚠ `spiele.date` heisst NICHT `datum`.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- ══ MESSUNG 4 · WELCHE SPIELE HABEN EIN WIRKSAMES EIGENTOR?
-- ══════════════════════════════════════════════════════════════════════
--
--  ⚠ DIE NUMMER IST DIE DER MESSUNG, NICHT DIE DES BLOCKS IM PAPIER.
--  Im vollstaendigen `abfragen_eigentore_2026-09-22.sql` ist dies
--  Block 3; Block 4 dort ist die Endstand-Gegenprobe. Wer quervergleicht
--  und die Zahl fuer dieselbe haelt, landet an der falschen Abfrage —
--  dieselbe Falle wie eine Spalte, die in zwei Systemen verschieden
--  heisst.
--
--  AUSFUEHREN: diesen Block von `with aktiv as (` bis zum Semikolon
--  markieren und nur die Markierung ausfuehren.
--
--  FRAGE: eine Zeile je Eigentor, das durch die Korrekturschicht
--         hindurch heute WIRKSAM ist — mit Spiel, Minute, Seite und
--         Name, zum Gegenlesen von Hand.
--
--  ⚠ Diese Abfrage ist nicht zum Zaehlen da, sondern zum ANSEHEN. Die
--    Zeilenzahl muss `von_wirksamen_eigentoren` ergeben — tut sie es
--    nicht, misst eine der beiden Haelften etwas anderes.
--
--  ⚠ Die nicht-wirksamen Eigentore werden GETRENNT ausgewiesen
--    (`eigentore_verdeckt_durch_korrektur`, `eigentore_verworfene_korrektur`)
--    und nicht stillschweigend weggelassen. Die Aufteilung muss aufgehen:
--
--        wirksam + verdeckt + verworfen = roh
--
--    ⚠ ⚠  SIE GEHT IMMER AUF — auch dann, wenn eine Korrektur den
--    Subtyp in die eine oder andere Richtung aendert. Jede rohe
--    Eigentor-Zeile ist genau eines von dreien: eine SFV-Zeile ohne
--    aktive Korrektur (wirksam), eine SFV-Zeile mit aktiver Korrektur
--    (verdeckt), oder eine Vereins-Zeile (aktiv → wirksam, sonst
--    verworfen). Geht die Rechnung NICHT auf, ist das kein Befund ueber
--    die Daten, sondern ein Fehler im CTE `wirksam` oder in einer der
--    vier Zaehlungen. Nachgestellt am 22.09.2026 gegen ein echtes
--    Postgres, mit Korrekturen in beide Richtungen: 5 + 1 + 1 = 7.
--
--  ⚠ `eigentore_aus_korrektur_entstanden` ist etwas anderes und steht
--    NICHT in dieser Rechnung: es ist eine TEILMENGE von `wirksam` —
--    Eigentore, die es nur gibt, weil jemand eine SFV-Zeile korrigiert
--    hat, die vorher kein Eigentor war. Sie stehen so in keinem
--    Matchblatt des Verbands.
--
--  UEBERRASCHEND WAERE:
--    · `von_wirksamen_eigentoren` <> `eigentore_roh_alle_zeilen` → es
--      gibt Vereins-Korrekturen an Toren. Dann gilt `wirksam`, und die
--      Differenz ist selbst der Befund.
--    · `name_aus_aufstellung` leer bei Seite = unsere Mannschaft → die
--      Person steht in keiner Aufstellungszeile dieses Spiels (kommt
--      vor, gemessen 11.09.2026: fuenf Faelle).
--    · `subtyp_klartext` <> Eigentor bei subtyp_id = 2 → der Klartext
--      des Verbands weicht ab. Dann ist belegt, warum hier die Kennzahl
--      gefiltert wird und nicht der Text.
--    · `vom_verein` = true → diese Zeile ist eine Korrektur und stand
--      so nicht beim Verband.
--    · `eigentore_in_diesem_spiel` > 1 → ein Spiel mit mehreren
--      Eigentoren; es steht hier mehrfach, und das ist richtig.
--
--  ⚠ WAS DIESER BLOCK NICHT BEANTWORTET: ob die Rechnung aufgeht — ob
--    also ein Eigentor der Gegenseite gutgeschrieben werden muss. Das
--    ist Block 5. Und er sagt nichts darueber, ob zwei aktive
--    Korrekturen auf DIESELBE SFV-Zeile zeigen; das waere ein
--    Datenfehler, und diese Zeile erschiene dann doppelt (Abfrage 0 der
--    vollstaendigen Datei, Spalte `doppelt_verdeckt`).
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.spiel_id, k.typ_id, k.subtyp_id,
         k.subtyp, k.minute, k.zusatzminute, k.ist_eigener,
         k.sfv_person_id, k.rueckennr, k.gegner_club_name
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select s.id                                                               as ereignis_id,
         s.spiel_id                                                         as spiel_id,
         case when k.id is null then s.typ_id        else k.typ_id        end as w_typ_id,
         case when k.id is null then s.subtyp_id     else k.subtyp_id     end as w_subtyp_id,
         case when k.id is null then s.subtyp        else k.subtyp        end as w_subtyp,
         case when k.id is null then s.minute        else k.minute        end as w_minute,
         case when k.id is null then s.zusatzminute  else k.zusatzminute  end as w_zusatzminute,
         case when k.id is null then s.ist_eigener   else k.ist_eigener   end as w_ist_eigener,
         case when k.id is null then s.sfv_person_id else k.sfv_person_id end as w_sfv_person_id,
         case when k.id is null then s.rueckennr     else k.rueckennr     end as w_rueckennr,
         case when k.id is null then s.gegner_club_name
                                else k.gegner_club_name end                 as w_gegner_club_name,
         (k.id is not null)                                                 as w_vom_verein
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.id, k.spiel_id, k.typ_id, k.subtyp_id, k.subtyp, k.minute,
         k.zusatzminute, k.ist_eigener, k.sfv_person_id, k.rueckennr,
         k.gegner_club_name, true
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
),
bezug as (
  select
    /* die Zeilenzahl, die dieser Block liefern MUSS */
    (select count(*) from wirksam w
      where w.w_typ_id = 1 and w.w_subtyp_id = 2)              as eigentore_wirksam,
    (select count(distinct w.spiel_id) from wirksam w
      where w.w_typ_id = 1 and w.w_subtyp_id = 2)              as spiele_mit_eigentor,
    /* roh = jede Tabellenzeile, Korrekturschicht ignoriert */
    (select count(*) from public.spiel_ereignisse r
      where r.typ_id = 1 and r.subtyp_id = 2)                  as eigentore_roh,
    /* nicht wirksam, GETRENNT nach dem Grund */
    (select count(*) from public.spiel_ereignisse r
      where r.typ_id = 1 and r.subtyp_id = 2 and r.herkunft = 'sfv'
        and exists (select 1 from aktiv k
                     where k.ersetzt_ereignis_id = r.id))      as eigentore_verdeckt,
    (select count(*) from public.spiel_ereignisse r
      where r.typ_id = 1 and r.subtyp_id = 2
        and r.herkunft = 'verein'
        and r.verworfen_am is not null)                        as eigentore_verworfen,
    /* ⚠ die Gegenrichtung: eine Korrektur macht aus etwas anderem ein
       Eigentor. Solche Zeilen sind wirksam und stehen in KEINER der
       drei Zahlen darueber — sie sind der Grund, wenn die Aufteilung
       nicht aufgeht. */
    (select count(*) from aktiv k
      where k.typ_id = 1 and k.subtyp_id = 2
        and k.ersetzt_ereignis_id is not null
        and exists (select 1 from public.spiel_ereignisse s3
                     where s3.id = k.ersetzt_ereignis_id
                       and s3.herkunft = 'sfv'
                       and (s3.typ_id <> 1 or s3.subtyp_id is distinct from 2)))
                                                               as eigentore_aus_korrektur,
    /* Bezugsgroesse fuer alles: wie viele Tor-Ereignisse gibt es ueberhaupt */
    (select count(*) from wirksam w where w.w_typ_id = 1)      as tor_ereignisse_wirksam,
    (select count(*) from public.spiele)                       as spiele_gesamt
)
select
  sp.date                                                 as spiel_datum,
  sp.team                                                 as unser_team,
  sp.gegner                                               as gegner,
  case when sp.heimspiel then 'heim' else 'auswaerts' end as heim_auswaerts,
  sp.resultat                                             as resultat_heim_gast,
  sp.ht_resultat                                          as ht_resultat_heim_gast,
  w.w_minute                                              as minute,
  w.w_zusatzminute                                        as zusatzminute,
  case when w.w_ist_eigener then 'unsere Mannschaft'
                            else 'Gegner' end             as seite,
  w.w_rueckennr                                           as rueckennr,
  w.w_sfv_person_id                                       as sfv_person_id,
  a.name                                                  as name_aus_aufstellung,
  w.w_subtyp_id                                           as subtyp_id,
  w.w_subtyp                                              as subtyp_klartext,
  w.w_gegner_club_name                                    as gegner_club_name,
  w.w_vom_verein                                          as vom_verein,
  sp.sfv_match_id                                         as sfv_match_id,
  sp.matchdaten_geholt_am                                 as matchdaten_geholt_am,
  -- ── Bezugsgroessen, in DERSELBEN Zeile ────────────────────────────
  count(*) over (partition by w.spiel_id)                 as eigentore_in_diesem_spiel,
  b.eigentore_wirksam                                     as von_wirksamen_eigentoren,
  b.spiele_mit_eigentor                                   as von_spielen_mit_eigentor,
  b.tor_ereignisse_wirksam                                as von_tor_ereignissen_wirksam,
  b.spiele_gesamt                                         as von_spielen_gesamt,
  -- ── was hier NICHT als Zeile steht, getrennt nach dem Grund ───────
  b.eigentore_roh                                         as eigentore_roh_alle_zeilen,
  b.eigentore_verdeckt                                    as eigentore_verdeckt_durch_korrektur,
  b.eigentore_verworfen                                   as eigentore_verworfene_korrektur,
  b.eigentore_aus_korrektur                               as eigentore_aus_korrektur_entstanden
  from wirksam w
  join public.spiele sp on sp.id = w.spiel_id
  cross join bezug b
  left join public.spiel_aufstellung a
         on a.spiel_id = w.spiel_id
        and a.sfv_person_id = w.w_sfv_person_id
 where w.w_typ_id = 1 and w.w_subtyp_id = 2
 order by sp.date, w.w_minute nulls last, w.w_zusatzminute nulls first;


-- ══════════════════════════════════════════════════════════════════════
-- ══ MESSUNG 5 · GEDREHT ODER UNGEDREHT — HALBZEIT UND ENDSTAND
-- ══════════════════════════════════════════════════════════════════════
--
--  ⚠ Auch diese Nummer ist die der Messung. Im vollstaendigen Papier
--  sind das die Bloecke 4 UND 5 — hier zusammengelegt, weil die Frage
--  eine ist und zwei Ergebnismengen sie nur trennen wuerden.
--
--  ⚠ WAS DIESEM AUSZUG FEHLT: der Waechter `doppelt_verdeckt` aus
--  Abfrage 0 des Papiers. Zeigen ZWEI aktive Korrekturen auf dieselbe
--  SFV-Zeile, erscheint eine Zeile doppelt, und keiner der zwei Bloecke
--  hier sieht das. Wenn eine Zahl nicht aufgeht und sonst nichts es
--  erklaert, ist das die Abfrage, die man aus dem Papier nachholt.
--
--  AUSFUEHREN: diesen Block von `with aktiv as (` bis zum Semikolon
--  markieren und nur die Markierung ausfuehren.
--
--  FRAGE: geht die Rechnung auf, wenn das Eigentor der GEGENSEITE
--         gutgeschrieben wird — oder wenn nicht? Je Spiel mit
--         mindestens einem Eigentor, und zwar
--
--           (a) UNGEDREHT: jedes Tor zaehlt der Seite, auf der es steht
--           (b) GEDREHT:   ein Eigentor zaehlt der GEGENSEITE
--
--         gegen BEIDE Zeithorizonte: `ht_resultat` (Minute <= 45) und
--         `resultat` (Endstand).
--
--  ⚠ BEIDE SUMMEN STEHEN NEBENEINANDER, UND KEINE WIRD KORRIGIERT.
--    Zaehlen statt glaetten: welche Lesart aufgeht, ist ein Ergebnis
--    und keine Entscheidung. Die vier Spalten `geht_auf_*` sagen es je
--    Spiel und Zeithorizont.
--
--  ⚠ ⚠  WAS HIER AUF DEM SPIEL STEHT: `halbzeitWiderspruch()`
--    (wpNutzlast.ts:410-414) zaehlt UNGEDREHT — es fragt nur
--    `ist_eigener` und sieht den Subtyp nicht an. Geht hier die
--    gedrehte Lesart auf, ist jene Funktion falsch, und zwar still:
--    sie meldete dann fuer jedes Spiel mit Eigentor einen Widerspruch,
--    den es nicht gibt.
--
--  ⚠ Bis zur Pause heisst `minute` <= 45. Die Nachspielzeit der ersten
--    Haelfte steht als Minute 45 mit `zusatzminute` — sie zaehlt also
--    mit. So macht es `halbzeitWiderspruch()` (wpNutzlast.ts:413).
--
--  ⚠ ⚠  EIN TOR OHNE MINUTE MACHT DIE HALBZEIT UNPRUEFBAR, nicht
--    halbzeitlos. `halbzeitWiderspruch()` gibt dann null zurueck. Die
--    Spalte `pruefbar_halbzeit` bildet das ab — wer sie uebersieht,
--    zaehlt ein Tor ohne Minute stillschweigend in die zweite Haelfte
--    und bekommt einen Widerspruch, den es nicht gibt. Fuer den
--    ENDSTAND ist eine fehlende Minute dagegen folgenlos; deshalb sind
--    es zwei getrennte `pruefbar`-Spalten und nicht eine.
--
--  ⚠ Und nicht pruefbar ist eine EIGENE Lage, nicht „stimmt nicht".
--    Ohne `resultat` bzw. `ht_resultat` gibt es nichts, wogegen man
--    halten koennte. Die Spalten stehen deshalb im Klartext da und
--    nicht als null.
--
--  ⚠ `resultat` wird nur zerlegt, wenn es wirklich zahl:zahl ist —
--    genau wie `zerlegeResultat()` (wpNutzlast.ts:297-305), das bei
--    NaN zwei null liefert. Ohne diese Bremse braeche die Abfrage an
--    einem einzigen krummen Wert ab.
--
--  UEBERRASCHEND WAERE:
--    · beide Lesarten gehen auf → dann hat das Spiel gleich viele
--      Eigentore auf beiden Seiten; die Zeile entscheidet nichts.
--    · KEINE geht auf → dann fehlt etwas anderes, nicht die Drehung:
--      eher Tore, die der Verband nicht im Verlauf fuehrt (gemessen
--      11.09.2026: 14 von 82 Spielen ohne jeden Verlauf).
--    · Endstand und Halbzeit widersprechen sich → zwei Endpunkte des
--      Verbands sagen Verschiedenes; das ist ein Befund ueber IHN.
--    · viele Zeilen nicht pruefbar → dann ist diese Abfrage schwach
--      besetzt und ihre Aussage duenn. `davon_pruefbar_endstand` und
--      `davon_pruefbar_halbzeit` stehen genau darum in jeder Zeile.
--
--  ⚠ WAS DIESER BLOCK NICHT BEANTWORTET: ob die Website es richtig
--    anzeigt. Er misst unsere Tabelle gegen den Stand des Verbands —
--    ueber die Anzeige drueben sagt keine seiner Zahlen etwas.
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.spiel_id, k.typ_id, k.subtyp_id,
         k.minute, k.ist_eigener
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select s.spiel_id                                                       as spiel_id,
         case when k.id is null then s.typ_id      else k.typ_id      end as w_typ_id,
         case when k.id is null then s.subtyp_id   else k.subtyp_id   end as w_subtyp_id,
         case when k.id is null then s.minute      else k.minute      end as w_minute,
         case when k.id is null then s.ist_eigener else k.ist_eigener end as w_ist_eigener
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.spiel_id, k.typ_id, k.subtyp_id, k.minute, k.ist_eigener
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
),
tore as (
  select w.spiel_id                                                      as spiel_id,
         /* ⚠ ueber ALLE Tore des Spiels, nicht nur die erste Haelfte:
            eine fehlende Minute macht die Zuordnung ueberhaupt
            unmoeglich */
         bool_or(w.w_minute is null)                                     as hat_tor_ohne_minute,
         count(*)                                                        as tore_gezaehlt,
         count(*) filter (where w.w_subtyp_id = 2)                       as eigentore_gesamt,
         -- ── Endstand: alle Tore ───────────────────────────────────
         count(*) filter (where w.w_ist_eigener)                         as unsere_seite,
         count(*) filter (where not w.w_ist_eigener)                     as gegner_seite,
         count(*) filter (where w.w_ist_eigener and w.w_subtyp_id = 2)   as eigentor_bei_uns,
         count(*) filter (where not w.w_ist_eigener
                            and w.w_subtyp_id = 2)                       as eigentor_beim_gegner,
         -- ── Halbzeit: Minute <= 45 (Nachspielzeit steht als 45) ───
         count(*) filter (where w.w_minute <= 45 and w.w_subtyp_id = 2)  as eigentore_h1,
         count(*) filter (where w.w_minute <= 45 and w.w_ist_eigener)    as unsere_seite_h1,
         count(*) filter (where w.w_minute <= 45
                            and not w.w_ist_eigener)                     as gegner_seite_h1,
         count(*) filter (where w.w_minute <= 45 and w.w_ist_eigener
                            and w.w_subtyp_id = 2)                       as eigentor_bei_uns_h1,
         count(*) filter (where w.w_minute <= 45 and not w.w_ist_eigener
                            and w.w_subtyp_id = 2)                       as eigentor_beim_gegner_h1
    from wirksam w
   where w.w_typ_id = 1
   group by w.spiel_id
),
stand as (
  select sp.id                                                 as spiel_id,
         sp.date                                               as spiel_datum,
         sp.team                                               as unser_team,
         sp.gegner                                             as gegner,
         sp.heimspiel                                          as heimspiel,
         sp.resultat                                           as resultat,
         sp.ht_resultat                                        as ht_resultat,
         case when sp.resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.resultat, ':', 1)::int end    as tore_heim,
         case when sp.resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.resultat, ':', 2)::int end    as tore_gast,
         case when sp.ht_resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.ht_resultat, ':', 1)::int end as ht_heim,
         case when sp.ht_resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.ht_resultat, ':', 2)::int end as ht_gast
    from public.spiele sp
)
select
  st.spiel_datum                                          as spiel_datum,
  st.unser_team                                           as unser_team,
  st.gegner                                               as gegner,
  case when st.heimspiel then 'heim' else 'auswaerts' end as heim_auswaerts,
  t.eigentore_gesamt                                      as eigentore_im_spiel,
  t.eigentore_h1                                          as davon_bis_minute_45,
  t.tore_gezaehlt                                         as tore_gezaehlt_gesamt,

  -- ══ ENDSTAND ════════════════════════════════════════════════════
  st.resultat                                                    as resultat_heim_gast,
  case when st.tore_heim is null then 'kein zerlegbares resultat'
       else 'pruefbar' end                                       as pruefbar_endstand,
  case when st.heimspiel then st.tore_heim else st.tore_gast end as soll_uns_endstand,
  case when st.heimspiel then st.tore_gast else st.tore_heim end as soll_gegner_endstand,
  t.unsere_seite                                                 as ist_uns_ungedreht_endstand,
  t.gegner_seite                                                 as ist_gegner_ungedreht_endstand,
  t.unsere_seite - t.eigentor_bei_uns
                 + t.eigentor_beim_gegner                        as ist_uns_gedreht_endstand,
  t.gegner_seite - t.eigentor_beim_gegner
                 + t.eigentor_bei_uns                            as ist_gegner_gedreht_endstand,
  case when st.tore_heim is null then null
       else (t.unsere_seite = case when st.heimspiel then st.tore_heim else st.tore_gast end
         and t.gegner_seite = case when st.heimspiel then st.tore_gast else st.tore_heim end)
  end                                                            as geht_auf_ungedreht_endstand,
  case when st.tore_heim is null then null
       else (t.unsere_seite - t.eigentor_bei_uns + t.eigentor_beim_gegner
               = case when st.heimspiel then st.tore_heim else st.tore_gast end
         and t.gegner_seite - t.eigentor_beim_gegner + t.eigentor_bei_uns
               = case when st.heimspiel then st.tore_gast else st.tore_heim end)
  end                                                            as geht_auf_gedreht_endstand,

  -- ══ HALBZEIT ════════════════════════════════════════════════════
  st.ht_resultat                                               as ht_resultat_heim_gast,
  case when st.ht_heim is null then 'kein zerlegbares ht_resultat'
       when t.hat_tor_ohne_minute then 'ein Tor ohne Minute — nicht zuzuordnen'
       else 'pruefbar' end                                     as pruefbar_halbzeit,
  case when st.heimspiel then st.ht_heim else st.ht_gast end   as soll_uns_halbzeit,
  case when st.heimspiel then st.ht_gast else st.ht_heim end   as soll_gegner_halbzeit,
  t.unsere_seite_h1                                            as ist_uns_ungedreht_halbzeit,
  t.gegner_seite_h1                                            as ist_gegner_ungedreht_halbzeit,
  t.unsere_seite_h1 - t.eigentor_bei_uns_h1
                    + t.eigentor_beim_gegner_h1                as ist_uns_gedreht_halbzeit,
  t.gegner_seite_h1 - t.eigentor_beim_gegner_h1
                    + t.eigentor_bei_uns_h1                    as ist_gegner_gedreht_halbzeit,
  case when st.ht_heim is null or t.hat_tor_ohne_minute then null
       else (t.unsere_seite_h1 = case when st.heimspiel then st.ht_heim else st.ht_gast end
         and t.gegner_seite_h1 = case when st.heimspiel then st.ht_gast else st.ht_heim end)
  end                                                          as geht_auf_ungedreht_halbzeit,
  case when st.ht_heim is null or t.hat_tor_ohne_minute then null
       else (t.unsere_seite_h1 - t.eigentor_bei_uns_h1 + t.eigentor_beim_gegner_h1
               = case when st.heimspiel then st.ht_heim else st.ht_gast end
         and t.gegner_seite_h1 - t.eigentor_beim_gegner_h1 + t.eigentor_bei_uns_h1
               = case when st.heimspiel then st.ht_gast else st.ht_heim end)
  end                                                          as geht_auf_gedreht_halbzeit,

  -- ══ BEZUGSGROESSEN, in DERSELBEN Zeile ══════════════════════════
  (select count(*) from tore t2
    where t2.eigentore_gesamt > 0)                             as von_spielen_mit_eigentor,
  (select count(*) from tore t3
     join stand s3 on s3.spiel_id = t3.spiel_id
    where t3.eigentore_gesamt > 0
      and s3.tore_heim is not null)                            as davon_pruefbar_endstand,
  (select count(*) from tore t4
     join stand s4 on s4.spiel_id = t4.spiel_id
    where t4.eigentore_gesamt > 0
      and s4.ht_heim is not null
      and not t4.hat_tor_ohne_minute)                          as davon_pruefbar_halbzeit,
  (select count(*) from public.spiele)                         as von_spielen_gesamt
  from tore t
  join stand st on st.spiel_id = t.spiel_id
 where t.eigentore_gesamt > 0
 order by st.spiel_datum;
