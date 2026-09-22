-- ══════════════════════════════════════════════════════════════════════
--  Eigentore — Messabfragen, 22.09.2026
--  Nur lesend. Einzeln ausfuehren, keine begin/commit-Huelle.
--
--  ── DIE KONSTANTEN, BELEGT ──────────────────────────────────────────
--
--    typ_id    = 1  Tor       src/domains/spiele/matchdatenAnzeige.ts:235
--                             export const TYP_TOR = 1;
--    subtyp_id = 2  Eigentor  src/domains/spiele/wpNutzlast.ts:463
--                             export const SUBTYP_EIGENTOR = 2;
--
--  ⚠ UEBER DIE KENNZAHL, NIE UEBER DEN KLARTEXT. `subtyp` traegt den
--    Text des Verbands und waere eine Schreibweise; `subtyp_id` ist das
--    Merkmal. Der Kommentar an `torZusatz()` sagt es woertlich, und bei
--    Subtyp 0 steht im Klartext ein blosser Strich.
--
--  ── ⚠ ⚠  DIE KORREKTURSCHICHT — WER SIE UEBERSIEHT, ZAEHLT DOPPELT ──
--
--  `spiel_ereignisse` hat ZWEI Schichten (`herkunft` = sfv | verein):
--
--    · eine Vereins-Zeile MIT `ersetzt_ereignis_id` verdeckt die
--      SFV-Zeile, auf die sie zeigt — beide stehen in der Tabelle
--    · `verworfen_am` macht eine Korrektur wieder gegenstandslos,
--      dann gilt die SFV-Zeile erneut
--    · eine Vereins-Zeile OHNE `ersetzt_ereignis_id` ist ein Nachtrag
--      und kommt zusaetzlich dazu
--
--  Ein blosses `count(*) where subtyp_id = 2` zaehlt deshalb
--  korrigierte Ereignisse ZWEIMAL und verworfene Korrekturen MIT.
--  Und es uebersieht die Gegenrichtung: eine Korrektur kann ein
--  normales Tor ZU einem Eigentor machen oder umgekehrt — dann steht
--  das Merkmal nur an der Vereins-Zeile.
--
--  Die Filterregel steht in `mischeEreignisse()`
--  (src/domains/spiele/matchdatenAnzeige.ts:61-95) und ist hier als
--  CTE `wirksam` nachgebaut. JEDE Abfrage unten fuehrt sie mit.
--
--  ⚠ Deshalb nennen die Abfragen ROH und WIRKSAM nebeneinander.
--    Gehen die zwei Zahlen auseinander, ist das kein Fehler, sondern
--    der Befund: dann gibt es Vereins-Korrekturen an Toren.
--
--  ── ZUR VORMESSUNG ACHT ─────────────────────────────────────────────
--
--  ⚠ Die Zahl 8 ist eine BEHAUPTUNG und steht in keiner Abfrage hier
--    als Erwartung. Sie ist von hier aus weder zu bestaetigen noch zu
--    widerlegen (kein Datenbankzugang). Abfrage 1 liefert die Zahl.
--    Kommt etwas anderes heraus, ist zuerst zu pruefen, WELCHE der
--    beiden Zaehlweisen die 8 erzeugt hat — roh oder wirksam.
--
--  ── DIE SPALTEN, GELESEN AUS supabase/schema.sql ────────────────────
--
--  spiel_ereignisse : id verein_id spiel_id herkunft sfv_event_id
--                     ersetzt_ereignis_id geaenderte_felder korrigiert_von
--                     korrigiert_am verworfen_am typ_id typ subtyp_id
--                     subtyp minute zusatzminute ist_eigener sfv_team_id
--                     gegner_club_name sfv_person_id rueckennr
--                     ein_sfv_person_id ein_rueckennr
--                     zuletzt_synchronisiert zuletzt_geaendert
--
--  spiele           : id team date zeit gegner heimspiel venue venue_addr
--                     treffpunkt wettbewerb liga spiel_nr status resultat
--                     ht_resultat zuschauer schiedsrichter delegierter
--                     notes created_at verein_id sfv_match_id sfv_saison_id
--                     sfv_team_id sfv_gegner_team_id sfv_liga_id
--                     sfv_gruppe_id sfv_gruppe sfv_spiel_typ sfv_status
--                     sfv_stand zuletzt_synchronisiert matchdaten_geholt_am
--                     sfv_spiel_nr sfv_spieltag zuletzt_geaendert
--
--  spiel_aufstellung: id verein_id spiel_id sfv_person_id sfv_team_id
--                     rueckennr position_id position_name von_minute
--                     bis_minute spielzeit zuletzt_synchronisiert
--                     erstmals_gesehen name ist_eigener
--                     rolle_zuweisung_id rolle_zuweisung zuletzt_geaendert
--
--  sfv_personen     : verein_id sfv_person_id name sfv_team_id rueckennr
--                     erstmals_gesehen zuletzt_gesehen
--                     PRIMARY KEY (verein_id, sfv_person_id)
--
--  api_verbindungen : id key label icon active konfiguriert api_url
--                     letzter_sync sync_status sync_meldung auto_sync
--                     sync_intervall sync_uhrzeit sync_felder sort_order
--                     created_at updated_at verein_id sync_laeuft_seit
--                     wache_zuletzt zuordnung_gemeldet_am
--
--  ⚠ `spiele.date` heisst NICHT `datum` — an einem Tag sechsmal falsch
--    geschrieben. Und `spiel_ereignisse` hat KEIN `erstmals_gesehen`;
--    das gibt es nur an `spiel_aufstellung`.
--
--  ── ⚠ `resultat` STEHT IMMER ALS heim:gast ──────────────────────────
--
--  Nicht unsere Seite zuerst. Die Zuordnung laeuft ueber
--  `spiele.heimspiel` — so macht es `halbzeitWiderspruch()`
--  (wpNutzlast.ts:418-419). Wer das verwechselt, meldet JEDES
--  Auswaertsspiel mit ungleichem Stand als Widerspruch.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 0 · BEZUGSGROESSEN UND KONTROLLZAHLEN
--
--  Frage: wie gross ist der Bestand, auf den sich alles Folgende
--         bezieht — und gibt es die Korrekturschicht ueberhaupt?
--
--  Ueberraschend waere:
--    · `korrekturen_aktiv` > 0  → dann sind roh und wirksam NICHT
--      dasselbe, und jede Zahl unten muss in der Zeile `wirksam`
--      gelesen werden.
--    · `doppelt_verdeckt` > 0   → zwei aktive Korrekturen zeigen auf
--      DIESELBE SFV-Zeile. Das ist ein Datenfehler: `mischeEreignisse()`
--      behaelt in seiner Map die letzte, der CTE `wirksam` unten
--      erzeugte dann eine Zeile zu viel. Vor allem Weiteren klaeren.
--    · `tore_ohne_minute` > 0   → Abfrage 5 (Halbzeit) ist fuer diese
--      Spiele gegenstandslos; `halbzeitWiderspruch()` gibt dort null.
-- ══════════════════════════════════════════════════════════════════════
select
  (select count(*) from public.spiel_ereignisse)                        as ereignisse_gesamt,
  (select count(*) from public.spiel_ereignisse where herkunft = 'sfv') as davon_sfv,
  (select count(*) from public.spiel_ereignisse
    where herkunft = 'verein')                                          as davon_verein,
  (select count(*) from public.spiel_ereignisse
    where herkunft = 'verein' and verworfen_am is null)                 as korrekturen_aktiv,
  (select count(*) from public.spiel_ereignisse
    where herkunft = 'verein' and verworfen_am is not null)             as korrekturen_verworfen,
  (select count(*) from (
     select k.ersetzt_ereignis_id
       from public.spiel_ereignisse k
      where k.herkunft = 'verein' and k.verworfen_am is null
        and k.ersetzt_ereignis_id is not null
      group by k.ersetzt_ereignis_id having count(*) > 1) d)            as doppelt_verdeckt,
  (select count(*) from public.spiel_ereignisse where typ_id = 1)       as tor_ereignisse_roh,
  (select count(*) from public.spiel_ereignisse
    where typ_id = 1 and minute is null)                                as tore_ohne_minute,
  (select count(*) from public.spiele)                                  as spiele_gesamt,
  (select count(*) from public.spiele
    where matchdaten_geholt_am is not null)                             as spiele_mit_matchdaten;


-- ══════════════════════════════════════════════════════════════════════
-- 1 · WIE VIELE EIGENTORE GIBT ES?
--
--  Frage: Anzahl der Eigentore (typ_id = 1, subtyp_id = 2), einmal
--         roh gezaehlt und einmal nach der Regel, die die Anzeige
--         anwendet — jeweils mit ihrer Bezugsgroesse daneben.
--
--  ⚠ Die Bezugsgroesse gehoert in DIESELBE Zeile. Eine 8 allein ist
--    keine Auskunft; 8 von 431 Tor-Ereignissen ist eine.
--
--  Ueberraschend waere:
--    · roh <> wirksam           → es gibt Vereins-Korrekturen an Toren.
--      Dann gilt `wirksam`, und die Differenz ist selbst ein Befund.
--    · eigentore_wirksam = 0 bei eigentore_roh > 0 → alle Eigentore
--      sind wegkorrigiert worden.
--    · von_tor_ereignissen = 0  → dann ist jeder Anteil unten
--      gegenstandslos, und die Frage lautet, ob ueberhaupt Matchdaten
--      geholt wurden (Abfrage 0, `spiele_mit_matchdaten`).
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.typ_id, k.subtyp_id
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select case when k.id is null then s.typ_id    else k.typ_id    end as w_typ_id,
         case when k.id is null then s.subtyp_id else k.subtyp_id end as w_subtyp_id
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.typ_id, k.subtyp_id
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
)
select
  'roh — jede Tabellenzeile, Korrekturschicht ignoriert' as zaehlweise,
  (select count(*) from public.spiel_ereignisse
    where typ_id = 1 and subtyp_id = 2)                  as eigentore,
  (select count(*) from public.spiel_ereignisse
    where typ_id = 1)                                    as von_tor_ereignissen,
  (select count(*) from public.spiel_ereignisse)         as von_ereignissen_gesamt
union all
select
  'wirksam — so wie mischeEreignisse() es anzeigt',
  (select count(*) from wirksam where w_typ_id = 1 and w_subtyp_id = 2),
  (select count(*) from wirksam where w_typ_id = 1),
  (select count(*) from wirksam);


-- ══════════════════════════════════════════════════════════════════════
-- 2 · WIE VERTEILEN SICH DIE EIGENTORE AUF ist_eigener?
--
--  Frage: stehen die Eigentore auf unserer Seite (true) oder beim
--         Gegner (false) — und wie viele Tore stehen je Seite
--         insgesamt daneben?
--
--  ⚠ `ist_eigener` sagt, WESSEN Mannschaft die Zeile gehoert, nicht
--    wem das Tor zaehlt. Ein Eigentor mit `ist_eigener` = true ist ein
--    Tor, das einer von uns ins eigene Netz geschossen hat — es zaehlt
--    dem Gegner. Genau darum geht es in Abfrage 4 und 5.
--
--  Ueberraschend waere:
--    · alles auf einer Seite → moeglich, aber pruefenswert: fuer
--      fremde Zeilen ist `sfv_person_id` durch einen CHECK gesperrt
--      (`spiel_ereignisse_fremde_anonym_check`), der Subtyp aber nicht.
--      Eine Einseitigkeit waere also kein Zwang des Schemas.
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.typ_id, k.subtyp_id, k.ist_eigener
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select case when k.id is null then s.typ_id      else k.typ_id      end as w_typ_id,
         case when k.id is null then s.subtyp_id   else k.subtyp_id   end as w_subtyp_id,
         case when k.id is null then s.ist_eigener else k.ist_eigener end as w_ist_eigener
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.typ_id, k.subtyp_id, k.ist_eigener
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
)
select
  w.w_ist_eigener                                                  as ist_eigener,
  case when w.w_ist_eigener then 'unsere Mannschaft'
                            else 'Gegner' end                      as seite,
  count(*) filter (where w.w_subtyp_id = 2)                        as eigentore,
  count(*)                                                         as von_tor_ereignissen_dieser_seite,
  (select count(*) from wirksam w2 where w2.w_typ_id = 1)          as von_tor_ereignissen_gesamt,
  (select count(*) from wirksam w3
    where w3.w_typ_id = 1 and w3.w_subtyp_id = 2)                  as von_eigentoren_gesamt
  from wirksam w
 where w.w_typ_id = 1
 group by w.w_ist_eigener
 order by w.w_ist_eigener desc;


-- ══════════════════════════════════════════════════════════════════════
-- 3 · EINE ZEILE JE EIGENTOR — zum Gegenlesen von Hand
--
--  Frage: was traegt jede dieser Zeilen heute wirklich?
--
--  ⚠ Diese Abfrage ist nicht zum Zaehlen da, sondern zum ANSEHEN.
--    Die Zeilenzahl muss `eigentore` aus Abfrage 1, Zeile `wirksam`
--    ergeben — tut sie es nicht, misst eine der beiden etwas anderes.
--
--  ⚠ `name` kommt aus `spiel_aufstellung` ueber (spiel_id,
--    sfv_person_id). Der Schluessel dort ist
--    `spiel_aufstellung_verein_key UNIQUE (verein_id, spiel_id,
--    sfv_person_id)`, der Join liefert also hoechstens eine Zeile.
--    ⚠ NICHT ueber die Rueckennummer joinen: sie ist kein Schluessel,
--    auch nicht innerhalb eines Spiels — bei zwei eigenen Mannschaften
--    gegeneinander gibt es die 9 zweimal.
--
--  Ueberraschend waere:
--    · `name_aus_aufstellung` leer bei Seite = unsere Mannschaft → die
--      Person steht in keiner Aufstellungszeile dieses Spiels (kommt
--      vor, gemessen 11.09.2026: fuenf Faelle).
--    · `subtyp_klartext` nicht Eigentor bei subtyp_id = 2 → der
--      Klartext des Verbands weicht ab. Dann ist belegt, warum hier die
--      Kennzahl gefiltert wird und nicht der Text.
--    · `vom_verein` = true → diese Zeile ist eine Korrektur und stand
--      so nicht beim Verband.
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
  sp.matchdaten_geholt_am                                 as matchdaten_geholt_am
  from wirksam w
  join public.spiele sp on sp.id = w.spiel_id
  left join public.spiel_aufstellung a
         on a.spiel_id = w.spiel_id
        and a.sfv_person_id = w.w_sfv_person_id
 where w.w_typ_id = 1 and w.w_subtyp_id = 2
 order by sp.date, w.w_minute nulls last, w.w_zusatzminute nulls first;


-- ══════════════════════════════════════════════════════════════════════
-- 4 · GEGENPROBE ENDSTAND — welche der beiden Lesarten geht auf?
--
--  Frage: je Spiel mit mindestens einem Eigentor — stimmt das
--         `resultat` laut `spiele` mit den gezaehlten Tor-Ereignissen
--         ueberein, und zwar
--           (a) UNGEDREHT: jedes Tor zaehlt der Seite, auf der es steht
--           (b) GEDREHT:   ein Eigentor zaehlt der GEGENSEITE
--
--  ⚠ BEIDE SUMMEN STEHEN NEBENEINANDER, und keine wird korrigiert.
--    Zaehlen statt glaetten: welche Lesart aufgeht, ist ein Ergebnis
--    und keine Entscheidung. Die Spalten `geht_auf_ungedreht` und
--    `geht_auf_gedreht` sagen es je Spiel.
--
--  ⚠ ⚠  WAS HIER AUF DEM SPIEL STEHT: `halbzeitWiderspruch()`
--    (wpNutzlast.ts:410-414) zaehlt UNGEDREHT — es fragt nur
--    `ist_eigener` und sieht den Subtyp nicht an. Geht hier die
--    gedrehte Lesart auf, ist jene Funktion falsch, und zwar still:
--    sie meldete dann fuer jedes Spiel mit Eigentor einen Widerspruch,
--    den es nicht gibt.
--
--  ⚠ `resultat` wird nur zerlegt, wenn es wirklich zahl:zahl ist —
--    genau wie `zerlegeResultat()` (wpNutzlast.ts:297-305), das bei
--    NaN zwei null liefert. Ohne diese Bremse braeche die Abfrage an
--    einem einzigen krummen Wert ab.
--
--  Ueberraschend waere:
--    · beide Lesarten gehen auf  → dann hat das Spiel gleich viele
--      Eigentore auf beiden Seiten; die Zeile entscheidet nichts.
--    · KEINE geht auf            → dann fehlt etwas anderes, nicht die
--      Drehung: eher Tore, die der Verband nicht im Verlauf fuehrt
--      (gemessen 11.09.2026: 14 von 82 Spielen ohne jeden Verlauf).
--    · `soll_uns` leer           → `resultat` traegt keinen zerlegbaren
--      Wert; das Spiel ist nicht pruefbar und faellt nicht zur Last.
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
  select w.spiel_id                                                     as spiel_id,
         count(*)                                                       as tore_gezaehlt,
         count(*) filter (where w.w_subtyp_id = 2)                      as eigentore,
         count(*) filter (where w.w_ist_eigener)                        as unsere_seite,
         count(*) filter (where not w.w_ist_eigener)                    as gegner_seite,
         count(*) filter (where w.w_ist_eigener and w.w_subtyp_id = 2)  as eigentor_bei_uns,
         count(*) filter (where not w.w_ist_eigener
                            and w.w_subtyp_id = 2)                      as eigentor_beim_gegner
    from wirksam w
   where w.w_typ_id = 1
   group by w.spiel_id
),
stand as (
  select sp.id                                              as spiel_id,
         sp.date                                            as spiel_datum,
         sp.team                                            as unser_team,
         sp.gegner                                          as gegner,
         sp.heimspiel                                       as heimspiel,
         sp.resultat                                        as resultat,
         case when sp.resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.resultat, ':', 1)::int end as tore_heim,
         case when sp.resultat ~ '^[[:space:]]*[0-9]+[[:space:]]*:[[:space:]]*[0-9]+[[:space:]]*$'
              then split_part(sp.resultat, ':', 2)::int end as tore_gast
    from public.spiele sp
)
select
  st.spiel_datum                                          as spiel_datum,
  st.unser_team                                           as unser_team,
  st.gegner                                               as gegner,
  case when st.heimspiel then 'heim' else 'auswaerts' end as heim_auswaerts,
  st.resultat                                             as resultat_heim_gast,
  t.eigentore                                             as eigentore_im_spiel,
  t.tore_gezaehlt                                         as tore_gezaehlt_gesamt,
  -- was das Resultat fuer unsere bzw. die gegnerische Seite verlangt
  case when st.heimspiel then st.tore_heim else st.tore_gast end as soll_uns,
  case when st.heimspiel then st.tore_gast else st.tore_heim end as soll_gegner,
  -- (a) ungedreht: jedes Tor zaehlt der Seite, auf der die Zeile steht
  t.unsere_seite                                          as ist_uns_ungedreht,
  t.gegner_seite                                          as ist_gegner_ungedreht,
  -- (b) gedreht: ein Eigentor zaehlt der Gegenseite
  t.unsere_seite - t.eigentor_bei_uns + t.eigentor_beim_gegner as ist_uns_gedreht,
  t.gegner_seite - t.eigentor_beim_gegner + t.eigentor_bei_uns as ist_gegner_gedreht,
  case when st.tore_heim is null then null
       else (t.unsere_seite = case when st.heimspiel then st.tore_heim else st.tore_gast end
         and t.gegner_seite = case when st.heimspiel then st.tore_gast else st.tore_heim end)
  end                                                     as geht_auf_ungedreht,
  case when st.tore_heim is null then null
       else (t.unsere_seite - t.eigentor_bei_uns + t.eigentor_beim_gegner
               = case when st.heimspiel then st.tore_heim else st.tore_gast end
         and t.gegner_seite - t.eigentor_beim_gegner + t.eigentor_bei_uns
               = case when st.heimspiel then st.tore_gast else st.tore_heim end)
  end                                                     as geht_auf_gedreht,
  (select count(*) from tore t2 where t2.eigentore > 0)   as von_spielen_mit_eigentor
  from tore t
  join stand st on st.spiel_id = t.spiel_id
 where t.eigentore > 0
 order by st.spiel_datum;


-- ══════════════════════════════════════════════════════════════════════
-- 5 · DIESELBE RECHNUNG FUER DIE HALBZEIT (Minute <= 45)
--
--  Frage: geht `ht_resultat` mit den Toren bis zur Pause auf — wieder
--         ungedreht und gedreht nebeneinander?
--
--  ⚠ Bis zur Pause heisst `minute` <= 45. Die Nachspielzeit der ersten
--    Haelfte steht als Minute 45 mit `zusatzminute` — sie zaehlt also
--    mit. So macht es `halbzeitWiderspruch()` (wpNutzlast.ts:413).
--
--  ⚠ ⚠  EIN TOR OHNE MINUTE MACHT DAS SPIEL UNPRUEFBAR, nicht
--    halbzeitlos. `halbzeitWiderspruch()` gibt dann null zurueck.
--    Die Spalte `pruefbar` bildet das ab — wer sie uebersieht, zaehlt
--    ein Tor ohne Minute stillschweigend in die zweite Haelfte und
--    bekommt einen Widerspruch, den es nicht gibt.
--
--  ⚠ Und nicht pruefbar ist eine EIGENE Lage, nicht stimmt nicht.
--    Ohne `ht_resultat` gibt es nichts, wogegen man halten koennte.
--
--  Ueberraschend waere:
--    · viele Zeilen mit `pruefbar` <> pruefbar → dann ist diese ganze
--      Abfrage schwach besetzt, und ihre Aussage duenn. Die Zahl der
--      pruefbaren Spiele steht deshalb in jeder Zeile daneben.
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
         -- ueber ALLE Tore des Spiels, nicht nur die erste Haelfte:
         -- eine fehlende Minute macht die Zuordnung ueberhaupt unmoeglich
         bool_or(w.w_minute is null)                                     as hat_tor_ohne_minute,
         count(*) filter (where w.w_subtyp_id = 2)                       as eigentore_gesamt,
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
         sp.ht_resultat                                        as ht_resultat,
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
  st.ht_resultat                                          as ht_resultat_heim_gast,
  t.eigentore_gesamt                                      as eigentore_im_spiel,
  t.eigentore_h1                                          as davon_bis_minute_45,
  case when st.ht_heim is null then 'kein zerlegbares ht_resultat'
       when t.hat_tor_ohne_minute then 'ein Tor ohne Minute — nicht zuzuordnen'
       else 'pruefbar' end                                as pruefbar,
  case when st.heimspiel then st.ht_heim else st.ht_gast end as soll_uns_h1,
  case when st.heimspiel then st.ht_gast else st.ht_heim end as soll_gegner_h1,
  t.unsere_seite_h1                                       as ist_uns_ungedreht_h1,
  t.gegner_seite_h1                                       as ist_gegner_ungedreht_h1,
  t.unsere_seite_h1 - t.eigentor_bei_uns_h1
                    + t.eigentor_beim_gegner_h1           as ist_uns_gedreht_h1,
  t.gegner_seite_h1 - t.eigentor_beim_gegner_h1
                    + t.eigentor_bei_uns_h1               as ist_gegner_gedreht_h1,
  case when st.ht_heim is null or t.hat_tor_ohne_minute then null
       else (t.unsere_seite_h1 = case when st.heimspiel then st.ht_heim else st.ht_gast end
         and t.gegner_seite_h1 = case when st.heimspiel then st.ht_gast else st.ht_heim end)
  end                                                     as geht_auf_ungedreht,
  case when st.ht_heim is null or t.hat_tor_ohne_minute then null
       else (t.unsere_seite_h1 - t.eigentor_bei_uns_h1 + t.eigentor_beim_gegner_h1
               = case when st.heimspiel then st.ht_heim else st.ht_gast end
         and t.gegner_seite_h1 - t.eigentor_beim_gegner_h1 + t.eigentor_bei_uns_h1
               = case when st.heimspiel then st.ht_gast else st.ht_heim end)
  end                                                     as geht_auf_gedreht,
  (select count(*) from tore t2 where t2.eigentore_gesamt > 0) as von_spielen_mit_eigentor,
  (select count(*) from tore t3
     join stand s3 on s3.spiel_id = t3.spiel_id
    where t3.eigentore_gesamt > 0
      and s3.ht_heim is not null
      and not t3.hat_tor_ohne_minute)                     as davon_pruefbar
  from tore t
  join stand st on st.spiel_id = t.spiel_id
 where t.eigentore_gesamt > 0
 order by st.spiel_datum;


-- ══════════════════════════════════════════════════════════════════════
-- 6 · WIE VIELE EIGENTORE LIEGEN IN SPIELEN MIT MATCHDATEN?
--
--  Frage: von den Eigentoren — wie viele haengen an einem Spiel, das
--         `matchdaten_geholt_am` traegt?
--
--  ⚠ ⚠  DIE FRAGE LAUTETE SCHON EXPORTIERT. DAS IST ETWAS ANDERES,
--    UND ES GIBT KEINE SPALTE DAFUER. Gemessen im Schema:
--
--      · `spiele` hat KEINE Export-Marke — kein exportiert_am, kein
--        Kennzeichen. Gesucht und nicht gefunden.
--      · `matchdaten_geholt_am` heisst: ein Matchdaten-Lauf hat dieses
--        Spiel einmal angefasst — eine Marke des SYNC, nicht des
--        Exports (so auch sfv-sync/index.ts:207).
--      · Ob exportiert wurde, entscheidet `export_wartet()`
--        (migration_export_wartet.sql:125) ueber den Vergleich
--        `spiele.zuletzt_geaendert` > `api_verbindungen.letzter_sync`
--        bei `key` = wordpress. Das ist ein Zustand JETZT, keine
--        Historie — ob je exportiert wurde, ist daraus nicht ablesbar.
--
--    Beide Lesarten stehen deshalb nebeneinander. Sie zu vermengen
--    hiesse, eine Marke des einen Systems als Aussage ueber ein
--    anderes zu lesen.
--
--  Ueberraschend waere:
--    · `spiele_warten_auf_export` > 0 → das Spiel hat sich seit dem
--      letzten Export geaendert; was drueben steht, ist aelter als das,
--      was hier steht.
--    · `letzter_export_wordpress` leer → es gibt keine Zeile wordpress
--      in `api_verbindungen`, oder sie hat nie gelaufen. Dann sagt
--      `spiele_warten_auf_export`, alles warte — und das ist richtig.
--
--  ⚠ `spiele_warten_auf_export` zaehlt SPIELE, nicht Eigentore — die
--    Bezugsgroesse ist `spiele` in derselben Zeile.
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.spiel_id, k.typ_id, k.subtyp_id
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select s.spiel_id                                                    as spiel_id,
         case when k.id is null then s.typ_id    else k.typ_id    end  as w_typ_id,
         case when k.id is null then s.subtyp_id else k.subtyp_id end  as w_subtyp_id
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.spiel_id, k.typ_id, k.subtyp_id
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
),
eigentore as (
  select w.spiel_id as spiel_id, count(*) as anzahl
    from wirksam w
   where w.w_typ_id = 1 and w.w_subtyp_id = 2
   group by w.spiel_id
),
export as (
  select v.verein_id as verein_id, v.letzter_sync as letzter_sync
    from public.api_verbindungen v
   where v.key = 'wordpress'
)
select
  case when sp.matchdaten_geholt_am is not null
       then 'Spiel hat Matchdaten (matchdaten_geholt_am gesetzt)'
       else 'Spiel OHNE Matchdaten' end                          as lage,
  count(*)                                                       as spiele,
  sum(e.anzahl)                                                  as eigentore,
  (select coalesce(sum(e2.anzahl), 0) from eigentore e2)         as von_eigentoren_gesamt,
  (select count(*) from eigentore e3)                            as von_spielen_mit_eigentor,
  count(*) filter (where ex.letzter_sync is null
                      or sp.zuletzt_geaendert > ex.letzter_sync) as spiele_warten_auf_export,
  max(ex.letzter_sync)                                           as letzter_export_wordpress
  from eigentore e
  join public.spiele sp on sp.id = e.spiel_id
  left join export ex on ex.verein_id = sp.verein_id
 group by 1
 order by 1;


-- ══════════════════════════════════════════════════════════════════════
-- 7 · WER TRAEGT HEUTE EIN EIGENTOR IN SEINER TORZAHL?
--
--  Frage: der Export haengt jedes Tor-Ereignis als Symbol an eine
--         Aufstellungszeile. Ein Eigentor ist dabei art = tor
--         (`verlaufArt()` sieht den Subtyp nicht an) und erhoeht die
--         Torzahl des Traegers. Wer ist das — je Seite getrennt?
--
--  ── DER SCHLUESSEL, BELEGT ──────────────────────────────────────────
--
--  `markeSchluessel()` (src/domains/spiele/wpNutzlast.ts:980-987):
--
--      ist_eigener  → p: + sfv_person_id ; ist sie null → kein
--                     Schluessel, das Ereignis faellt weg
--      sonst        → n: + rueckennr     ; ist sie null → dasselbe
--
--  ⚠ DIE FREMDE SEITE WIRD JE SPIEL GEZAEHLT, NICHT UEBER DEN BESTAND.
--    `sammleMarken()` baut seine Map je Spiel; n:9 meint dort die 9
--    DIESES Spiels. Ueber alle Spiele hinweg waere die Rueckennummer
--    kein Schluessel — bei zwei eigenen Mannschaften gegeneinander gibt
--    es die 9 sogar innerhalb eines Spiels zweimal. Deshalb gruppiert
--    die fremde Haelfte auf (spiel_id, rueckennr).
--
--  ⚠ Die eigene Haelfte gruppiert dagegen auf die PERSON ueber alle
--    Spiele — das ist die Torzahl, nach der jemand fragt.
--
--  ⚠ `name` kommt aus `sfv_personen` ueber (verein_id, sfv_person_id).
--    Das ist dort der PRIMARY KEY, der Join liefert also hoechstens
--    eine Zeile. Bleibt er leer, ist die Person dem Verband bekannt und
--    uns nicht — kein Fehler, sondern der Stand der Zuordnung.
--
--  ── ⚠ WAS FAELLT WEG HEISST ─────────────────────────────────────────
--
--  Ein Ereignis ohne Schluessel wird heute SCHON keinem Spieler
--  zugerechnet (`sammleMarken()` zaehlt es unter `ohne_zuordnung`).
--  Es steht hier als eigene Zahl, damit die Aufteilung aufgeht:
--
--      Traeger-Eigentore + weggefallene Eigentore = Eigentore der Seite
--
--  Geht sie nicht auf, misst eine der beiden Haelften etwas anderes.
--
--  Ueberraschend waere:
--    · `eigentore` > `tore_gesamt_dieses_traegers` → unmoeglich, ein
--      Eigentor IST ein Tor-Ereignis. Dann stimmt die Filterung nicht.
--    · beide gleich bei einer Person → ihre ganze Torzahl besteht aus
--      Eigentoren. Auf einer oeffentlichen Seite ist das die teuerste
--      Zeile von allen.
--    · viele weggefallene auf der fremden Seite → Gegnerzeilen ohne
--      Nummer, gemessen 11.09.2026 der Normalfall bei Trainern und
--      Betreuern. Kein Befund, sondern die Datenlage.
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.verein_id, k.spiel_id,
         k.typ_id, k.subtyp_id, k.ist_eigener, k.sfv_person_id, k.rueckennr
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select s.verein_id                                                          as verein_id,
         s.spiel_id                                                           as spiel_id,
         case when k.id is null then s.typ_id        else k.typ_id        end as w_typ_id,
         case when k.id is null then s.subtyp_id     else k.subtyp_id     end as w_subtyp_id,
         case when k.id is null then s.ist_eigener   else k.ist_eigener   end as w_ist_eigener,
         case when k.id is null then s.sfv_person_id else k.sfv_person_id end as w_sfv_person_id,
         case when k.id is null then s.rueckennr     else k.rueckennr     end as w_rueckennr
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.verein_id, k.spiel_id, k.typ_id, k.subtyp_id, k.ist_eigener,
         k.sfv_person_id, k.rueckennr
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
),
tore as (
  select w.verein_id                                                as verein_id,
         w.spiel_id                                                 as spiel_id,
         w.w_subtyp_id                                              as subtyp_id,
         w.w_ist_eigener                                            as ist_eigener,
         w.w_sfv_person_id                                          as sfv_person_id,
         w.w_rueckennr                                              as rueckennr,
         to_char(sp.date, 'YYYY-MM-DD') || ' ' || sp.team
           || ' - ' || coalesce(sp.gegner, '?')                     as spiel_text
    from wirksam w
    join public.spiele sp on sp.id = w.spiel_id
   where w.w_typ_id = 1
),
bezug as (
  select
    count(distinct t.sfv_person_id) filter (
      where t.ist_eigener and t.sfv_person_id is not null)           as eigene_traeger_gesamt,
    count(*) filter (
      where t.ist_eigener and t.sfv_person_id is null)               as eigene_tore_ohne_schluessel,
    count(*) filter (
      where t.ist_eigener and t.sfv_person_id is null
        and t.subtyp_id = 2)                                         as eigene_eigentore_ohne_schluessel,
    count(distinct (t.spiel_id::text || ':' || t.rueckennr::text)) filter (
      where not t.ist_eigener and t.rueckennr is not null)           as fremde_traeger_gesamt,
    count(*) filter (
      where not t.ist_eigener and t.rueckennr is null)               as fremde_tore_ohne_schluessel,
    count(*) filter (
      where not t.ist_eigener and t.rueckennr is null
        and t.subtyp_id = 2)                                         as fremde_eigentore_ohne_schluessel
    from tore t
),
eigene as (
  select 'unsere Mannschaft'                                           as seite,
         'p:' || t.sfv_person_id                                       as traeger_schluessel,
         t.sfv_person_id                                               as sfv_person_id,
         null::integer                                                 as rueckennr,
         count(*) filter (where t.subtyp_id = 2)                       as eigentore,
         count(*)                                                      as tore_gesamt,
         count(distinct t.spiel_id)                                    as in_spielen,
         string_agg(distinct t.spiel_text, '; ' order by t.spiel_text) as spiele,
         t.verein_id                                                   as verein_id
    from tore t
   where t.ist_eigener and t.sfv_person_id is not null
   -- ⚠ `verein_id` MUSS in die Gruppierung. Ohne sie fielen zwei
   --   Personen derselben Nummer aus zwei Vereinen in eine Zeile —
   --   und die Zahl waere still zu gross.
   group by t.verein_id, t.sfv_person_id
  having count(*) filter (where t.subtyp_id = 2) > 0
),
fremde as (
  select 'Gegner'                                                       as seite,
         'n:' || t.rueckennr                                            as traeger_schluessel,
         null::integer                                                  as sfv_person_id,
         t.rueckennr                                                    as rueckennr,
         count(*) filter (where t.subtyp_id = 2)                        as eigentore,
         count(*)                                                       as tore_gesamt,
         count(distinct t.spiel_id)                                     as in_spielen,
         string_agg(distinct t.spiel_text, '; ' order by t.spiel_text)  as spiele,
         t.verein_id                                                    as verein_id
    from tore t
   where not t.ist_eigener and t.rueckennr is not null
   group by t.verein_id, t.spiel_id, t.rueckennr
  having count(*) filter (where t.subtyp_id = 2) > 0
),
traeger as (
  select * from eigene
  union all
  select * from fremde
)
select
  tr.seite                                         as seite,
  tr.traeger_schluessel                            as traeger_schluessel,
  tr.sfv_person_id                                 as sfv_person_id,
  p.name                                           as name_aus_sfv_personen,
  tr.rueckennr                                     as rueckennr,
  tr.eigentore                                     as eigentore,
  tr.tore_gesamt                                   as tore_gesamt_dieses_traegers,
  tr.in_spielen                                    as in_spielen,
  tr.spiele                                        as spiele,
  -- Bezugsgroessen, in derselben Zeile
  case when tr.seite = 'unsere Mannschaft'
       then b.eigene_traeger_gesamt
       else b.fremde_traeger_gesamt end            as von_traegern_dieser_seite,
  case when tr.seite = 'unsere Mannschaft'
       then b.eigene_eigentore_ohne_schluessel
       else b.fremde_eigentore_ohne_schluessel end as eigentore_ohne_schluessel_diese_seite,
  case when tr.seite = 'unsere Mannschaft'
       then b.eigene_tore_ohne_schluessel
       else b.fremde_tore_ohne_schluessel end      as tor_ereignisse_ohne_schluessel_diese_seite,
  b.eigene_traeger_gesamt                          as eigene_traeger_gesamt,
  b.fremde_traeger_gesamt                          as fremde_traeger_gesamt,
  b.eigene_eigentore_ohne_schluessel               as eigene_eigentore_ohne_schluessel,
  b.fremde_eigentore_ohne_schluessel               as fremde_eigentore_ohne_schluessel
  from traeger tr
  cross join bezug b
  left join public.sfv_personen p
         on p.verein_id = tr.verein_id
        and p.sfv_person_id = tr.sfv_person_id
 order by tr.seite, tr.eigentore desc, tr.traeger_schluessel;
