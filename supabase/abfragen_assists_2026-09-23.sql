-- ══════════════════════════════════════════════════════════════════════
-- ══ ASSISTS · 23.09.2026 — zwei Bloecke, einzeln ausfuehren
-- ══════════════════════════════════════════════════════════════════════
--
--  ⚠ DER SUPABASE-EDITOR ZEIGT BEI MEHREREN ANWEISUNGEN NUR DAS ERGEBNIS
--    DER LETZTEN. Jeden Block einzeln markieren und ausfuehren.
--
--  ⚠ BEIDE BLOECKE LESEN NUR.
--
--  Belege fuer die Kennzahlen, damit niemand sie nachschlagen muss:
--    typ_id = 1  Tor      (TYP_TOR,    matchdatenAnzeige.ts:235)
--    typ_id = 9  Assist   (TYP_ASSIST, wpNutzlast.ts:45)
--
--  ⚠ DIE KORREKTURSCHICHT IST MITGEFUEHRT. `spiel_ereignisse` haelt
--    Vereinszeilen, die SFV-Zeilen verdecken (`ersetzt_ereignis_id`), und
--    verworfene Korrekturen (`verworfen_am`). Ein blosses `count(*)`
--    zaehlt doppelt. Beide Bloecke rechnen deshalb ueber `wirksam`.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- ══ BLOCK 1 · FINDET JEDER ASSIST SEIN TOR?
-- ══════════════════════════════════════════════════════════════════════
--
--  AUSFUEHREN: von `with aktiv as (` bis zum Semikolon markieren.
--
--  DIE FRAGE: Der Export stellt einen Assist unter sein Tor, wenn es in
--  derselben Minute auf derselben Seite GENAU EINES gibt. Wie oft trifft
--  das zu?
--
--  ⚠ VERGLICHEN WIRD (minute, zusatzminute) UND DIE SEITE. Die Minute
--    allein genuegt nicht: „45" und „45+2" sind zwei verschiedene
--    Zeitpunkte, und das Theme vergleicht die zerlegte Minute.
--
--  WAS EIN UEBERRASCHENDES ERGEBNIS HIESSE:
--    · `genau_ein_tor` = alle  → jeder Assist findet sein Tor, die
--      Zuordnung ueber Minute und Seite traegt vollstaendig.
--    · `kein_tor` > 0  → der Verband hat den Verlauf unvollstaendig
--      erfasst (Assist ohne Tor). KEIN Fehler bei uns — der Assist steht
--      dann eigenstaendig auf der Seite.
--    · `mehrere_tore` > 0  → zwei Tore derselben Minute und Seite. Wir
--      koennen nicht entscheiden, welches gemeint ist, und stellen den
--      Assist bewusst NICHT unter eines davon.
--
--  ⚠ WAS DIESER BLOCK NICHT BEANTWORTET: ob die Website es richtig
--    anzeigt. Er misst die Datenlage, nicht die Anzeige.
-- ══════════════════════════════════════════════════════════════════════
with aktiv as (
  select k.id, k.ersetzt_ereignis_id, k.spiel_id, k.typ_id,
         k.minute, k.zusatzminute, k.ist_eigener, k.sfv_person_id
    from public.spiel_ereignisse k
   where k.herkunft = 'verein' and k.verworfen_am is null
),
wirksam as (
  select s.spiel_id                                                         as spiel_id,
         case when k.id is null then s.typ_id       else k.typ_id       end as w_typ_id,
         case when k.id is null then s.minute       else k.minute       end as w_minute,
         case when k.id is null then s.zusatzminute else k.zusatzminute end as w_zusatzminute,
         case when k.id is null then s.ist_eigener  else k.ist_eigener  end as w_ist_eigener,
         case when k.id is null then s.sfv_person_id
                                else k.sfv_person_id end                    as w_sfv_person_id
    from public.spiel_ereignisse s
    left join aktiv k on k.ersetzt_ereignis_id = s.id
   where s.herkunft = 'sfv'
  union all
  select k.spiel_id, k.typ_id, k.minute, k.zusatzminute, k.ist_eigener,
         k.sfv_person_id
    from aktiv k
   where k.ersetzt_ereignis_id is null
      or not exists (select 1 from public.spiel_ereignisse s2
                      where s2.id = k.ersetzt_ereignis_id and s2.herkunft = 'sfv')
),
assists as (
  select w.spiel_id, w.w_minute, w.w_zusatzminute, w.w_ist_eigener,
         w.w_sfv_person_id,
         (select count(*) from wirksam t
           where t.spiel_id      = w.spiel_id
             and t.w_typ_id      = 1
             and t.w_ist_eigener = w.w_ist_eigener
             and t.w_minute       is not distinct from w.w_minute
             and t.w_zusatzminute is not distinct from w.w_zusatzminute) as tore_dazu
    from wirksam w
   where w.w_typ_id = 9
)
select
  count(*)                                             as assists_gesamt,
  count(*) filter (where a.tore_dazu = 1)              as genau_ein_tor,
  count(*) filter (where a.tore_dazu = 0)              as kein_tor,
  count(*) filter (where a.tore_dazu > 1)              as mehrere_tore,
  -- ── Bezugsgroessen, in DERSELBEN Zeile ──────────────────────────────
  (select count(*) from wirksam w2 where w2.w_typ_id = 1) as von_tor_ereignissen,
  (select count(distinct a2.spiel_id) from assists a2)    as in_wie_vielen_spielen,
  (select count(*) from public.spiele)                    as von_spielen_gesamt,
  -- ⚠ Gegenprobe: die drei Faelle MUESSEN die Gesamtzahl ergeben.
  --   Gehen sie auseinander, rechnet der Block falsch — nicht die Daten.
  (count(*) filter (where a.tore_dazu = 1)
   + count(*) filter (where a.tore_dazu = 0)
   + count(*) filter (where a.tore_dazu > 1)) = count(*)  as aufteilung_stimmt
  from assists a;


-- ══════════════════════════════════════════════════════════════════════
-- ══ BLOCK 2 · DAS PROBESPIEL — SEINE VERBANDSNUMMER UND SEINE ZEILEN
-- ══════════════════════════════════════════════════════════════════════
--
--  AUSFUEHREN: von `select` bis zum Semikolon markieren.
--
--  DIE FRAGE: Wie heisst das Probespiel beim Verband, und welche Tore und
--  Assists stehen darin?
--
--  ⚠ `sfv_match_id` IST DIE NUMMER FUER DEN SPIELBERICHT — nicht
--    `sfv_spiel_nr`. Die zwei stehen auf der Verbandsseite nebeneinander
--    und sehen verwandt aus; nur die erste funktioniert im Link.
--
--  Eine Zeile je Tor und Assist, chronologisch. Nebeneinander gelesen
--  zeigt sie, welcher Assist zu welchem Tor gehoert.
-- ══════════════════════════════════════════════════════════════════════
select
  sp.sfv_match_id                                       as sfv_match_id,
  sp.date                                               as spiel_datum,
  sp.team                                               as unser_team,
  sp.gegner                                             as gegner,
  case when sp.heimspiel then 'heim' else 'auswaerts' end as heim_auswaerts,
  sp.resultat                                           as resultat_heim_gast,
  e.minute                                              as minute,
  e.zusatzminute                                        as zusatzminute,
  case when e.typ_id = 1 then 'Tor'
       when e.typ_id = 9 then 'Assist'
       else e.typ end                                   as art,
  case when e.ist_eigener then 'unsere Mannschaft'
                          else 'Gegner' end             as seite,
  e.sfv_person_id                                       as sfv_person_id,
  e.rueckennr                                           as rueckennr,
  p.name                                                as name_laut_verband,
  e.sfv_event_id                                        as sfv_event_id
  from public.spiele sp
  join public.spiel_ereignisse e on e.spiel_id = sp.id
  left join public.sfv_personen p
         on p.verein_id     = e.verein_id
        and p.sfv_person_id = e.sfv_person_id
 where sp.id = '00cb3819-7bef-4c36-9dc8-f4adbbd3d437'
   and e.typ_id in (1, 9)
   and e.verworfen_am is null
 order by e.minute nulls last, e.zusatzminute nulls first, e.typ_id;
