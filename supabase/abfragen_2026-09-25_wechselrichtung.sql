-- Stimmt unsere Wechsel-Zuordnung mit dem Spielbericht des Verbands?
--
-- Gemessen am 25.09.2026. Anlass: bei vier Spielen fehlen die
-- Wechselpfeile, und beim Spiel FC Herrliberg 2 - FC Hinwil 1 vom
-- 12.09.2026 steht der Verdacht im Raum, die Richtung sei vertauscht.
--
-- ⚠ AM QUELLTEXT IST DIE FRAGE BEREITS BEANTWORTET: unsere Abbildung
--   gibt den Verband getreu wieder.
--
--     sfv_person_id / rueckennr          = wer GEHT   (links von "ersetzt durch")
--     ein_sfv_person_id / ein_rueckennr  = wer KOMMT  (rechts davon)
--
--   Die Richtung war am 10.09.2026 einmal vertauscht, ist berichtigt
--   (wpNutzlast.ts:943-955) und haengt seither an Testfaellen
--   (wpNutzlast.test.ts:697-718). Diese Abfragen pruefen die DATEN,
--   nicht die Kette.
--
-- ⚠ Der Verband spezifiziert die Richtung NICHT. Im Swagger haben
--   personId, jerseyNumber, substitutePlayerId und
--   substitutePlayerJerseyNumber alle vier KEINE description. Was wir
--   wissen, ist gemessen, nicht gelesen.
--
-- ⚠ Und die zwei Namen einer Wechselzeile stammen aus ZWEI
--   Endpunkten: der Ausgewechselte aus dem Ereignis, der Eingewechselte
--   ueber die Nummern-Bruecke aus der Aufstellung (ein_sfv_person_id
--   loest nicht auf - substitutePlayerId ist keine personId, gemessen
--   10.09.2026, fuenf von fuenf). Bei einem verdrehten Matchblatt sieht
--   die Zeile trotzdem plausibel aus.

-- ── 1) Die Wechselzeilen beider Spiele, roh gegen Anzeige ───────────────
select s.sfv_match_id,
       s.date,
       s.team,
       s.gegner,
       e.minute,
       e.zusatzminute,
       e.ist_eigener,
       e.rueckennr                                   as nr_raus,
       e.sfv_person_id                               as pid_raus,
       coalesce(pr.name, e.person_name)              as name_raus,
       e.ein_rueckennr                               as nr_rein,
       e.ein_sfv_person_id                           as pid_rein,
       ar.name                                       as name_rein_ueber_bruecke
  from public.spiel_ereignisse e
  join public.spiele s
    on s.id = e.spiel_id
  left join public.sfv_personen pr
    on pr.verein_id = e.verein_id
   and pr.sfv_person_id = e.sfv_person_id
  -- die Bruecke, exakt wie baueNummernBruecke(): gleiches Spiel, gleiche
  -- Seite, ueber die Rueckennummer. ⚠ Bei zwei Treffern schweigt der
  -- Code - deshalb zaehlt Abfrage 3 sie nach.
  left join public.spiel_aufstellung ar
    on ar.spiel_id     = e.spiel_id
   and ar.ist_eigener  = e.ist_eigener
   and ar.rueckennr    = e.ein_rueckennr
 where e.typ_id = 2                       -- Aus-/Einwechslung
   and (s.sfv_match_id = 4391598
        or (s.date = date '2026-09-12' and s.team ilike '%Herrliberg 2%'))
 order by s.sfv_match_id, e.minute nulls last, e.zusatzminute nulls last;


-- ── 2) ⚠ DIE GEGENPROBE: was sagt die Aufstellung ueber DIESELBEN zwei? ─
--  Steht der Eingewechselte dort als Startelf (von_minute <= 1,
--  Spielzeit voll) und der Ausgewechselte auf der Bank, ist das
--  Matchblatt verkehrt - und zwar BEIM VERBAND, nicht bei uns. Genau das
--  zaehlt zaehleWechselWiderspruch() als `eigen_als_start`.
select s.sfv_match_id,
       a.ist_eigener,
       a.rueckennr,
       a.name,
       a.sfv_person_id,
       a.position_name,
       a.rolle_zuweisung,
       a.von_minute,
       a.bis_minute,
       a.spielzeit
  from public.spiel_aufstellung a
  join public.spiele s
    on s.id = a.spiel_id
 where s.sfv_match_id = 4391598
    or (s.date = date '2026-09-12' and s.team ilike '%Herrliberg 2%')
 order by s.sfv_match_id, a.ist_eigener desc, a.rueckennr nulls last;


-- ── 3) Traegt die Bruecke ueberhaupt? ───────────────────────────────────
--  ⚠ Bei zwei Namen unter derselben Nummer schweigt sie (Absicht), und
--     dann stuende "Nr. 18" statt eines Namens - das saehe wie ein
--     fehlender Datensatz aus und waere keiner.
select s.sfv_match_id,
       a.rueckennr,
       count(*)                     as kandidaten,
       string_agg(a.name, ' | ')    as namen
  from public.spiel_aufstellung a
  join public.spiele s
    on s.id = a.spiel_id
 where a.ist_eigener
   and a.rueckennr is not null
   and a.name is not null
   and (s.sfv_match_id = 4391598
        or (s.date = date '2026-09-12' and s.team ilike '%Herrliberg 2%'))
 group by s.sfv_match_id, a.rueckennr
 order by s.sfv_match_id, a.rueckennr;

-- ⚠ Das Spiel vom 12.09.2026 ist ueber date + team ilike gesucht, nicht
--   ueber sfv_match_id - die Nummer wurde nicht genannt. Trifft Abfrage 1
--   dort null Zeilen, ist das KEIN Befund ueber die Daten, sondern ueber
--   den Filter. Dann zuerst:
--
--     select sfv_match_id, team, gegner from public.spiele
--      where date = date '2026-09-12';
--
-- DIE DEUTUNG IN EINEM SATZ: stimmt name_raus mit dem ueberein, was auf
-- der Verbandsseite LINKS von "ersetzt durch" steht, und
-- name_rein_ueber_bruecke mit dem RECHTS - dann geben wir getreu wieder,
-- und der Fehler bei Hinwil liegt im Matchblatt des Verbands. Stehen sie
-- vertauscht, kippt es an genau einer Stelle: wpNutzlast.ts:968-970.
