-- ═══════════════════════════════════════════════════════════════════════════
-- WIE VIELE PERSONEN BETRIFFT ES — 23.09.2026
--
-- ANLASS. Vier Spielerinnen fehlten in der Zuordnungsliste und im Export,
-- obwohl sie Einsaetze haben. Gemessen: der Sync arbeitet richtig, alle 16
-- stehen in `spiel_aufstellung`. Der Verlust entstand beim LESEN —
-- `matchdatenService.ts:34` las die Tabelle ungepagt und ohne `order()`,
-- PostgREST kuerzt bei 1000 Zeilen still, und ohne Sortierung ist nicht
-- definiert, WELCHE 1000 kommen.
--
-- ⚠ Behoben am 23.09.2026 (`alleSeiten()` an vier Stellen). Diese Abfragen
--    sagen, wie gross der Schaden war und ob er weg ist.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1) ⚠ DIE BESTELLTE ZAHL, mit Bezugsgroesse in derselben Zeile ────────
-- „Wie viele Personen haben eine eigene Aufstellungszeile, stehen aber in
--  keinem aktiven Kader?"
--
-- ⚠ Das ist die Menge, die eine Kaderpruefung verlieren WUERDE. Gemessen am
--    23.09.2026 gibt es eine solche Pruefung NICHT — weder in der
--    Zuordnungsliste (`offeneZuordnungen`) noch im Export
--    (`baueAufstellung`). Die Zahl sagt also, was auf dem Spiel stuende,
--    wenn jemand eine einbaute; sie ist kein Fehlerzaehler.
with eigene as (
  select distinct a.sfv_person_id
    from public.spiel_aufstellung a
   where a.ist_eigener and a.sfv_person_id is not null
),
im_kader as (
  select distinct z.sfv_person_id
    from public.sfv_zuordnung z
    join public.mitglieder m on m.id = z.mitglied_id and m.aktiv
    join public.kader      k on k.mitglied_id = m.id and k.aktiv
)
select (select count(*) from eigene)                                 as mit_aufstellungszeile,
       (select count(*) from im_kader)                               as davon_im_aktiven_kader,
       (select count(*) from eigene
         where sfv_person_id not in (select sfv_person_id from im_kader)) as ohne_kader,
       round(100.0 * (select count(*) from eigene
                       where sfv_person_id not in (select sfv_person_id from im_kader))
             / nullif((select count(*) from eigene), 0), 1)          as anteil_prozent;


-- ─── 2) Die Grenze, an der es hing ─────────────────────────────────────────
-- ⚠ Liegt `zeilen` ueber 1000, war die Liste im Browser gekuerzt. Genau
--    das war der Fall: 2282 am 11.09.2026, seither um die Gegnerzeilen
--    gewachsen.
select count(*)                                              as zeilen,
       count(*) filter (where ist_eigener)                   as eigen,
       count(*) filter (where not ist_eigener)               as fremd,
       count(distinct sfv_person_id)
         filter (where ist_eigener)                          as eigene_personen,
       case when count(*) > 1000
            then 'ueber der Grenze — ungepagt waere die Liste gekuerzt'
            else 'unter der Grenze' end                      as lage
  from public.spiel_aufstellung;


-- ─── 3) Die vier aus der Meldung, namentlich ───────────────────────────────
-- Erwartet: alle vier mit Einsaetzen, Lianne mit mindestens fuenf.
select a.sfv_person_id,
       max(a.name)                as name,
       count(*)                   as einsaetze,
       min(s.date)                as erster,
       max(s.date)                as letzter,
       bool_or(z.sfv_person_id is not null) as zugeordnet
  from public.spiel_aufstellung a
  join public.spiele s on s.id = a.spiel_id
  left join public.sfv_zuordnung z
         on z.sfv_person_id = a.sfv_person_id and z.verein_id = a.verein_id
 where a.ist_eigener
   and a.sfv_person_id in (1132270, 1352416, 1230939, 1143744)
 group by a.sfv_person_id
 order by einsaetze desc;


-- ─── 4) ⚠ DIE GEGENPROBE NACH DEM UMBAU ────────────────────────────────────
-- Die Maske zeigt jetzt `offenGesamt`. Diese Zahl muss dieselbe sein.
-- Weicht sie ab, liest die Maske immer noch nicht alles.
select count(*) as offen_erwartet
  from (
    select distinct a.sfv_person_id
      from public.spiel_aufstellung a
     where a.ist_eigener and a.sfv_person_id is not null
       and not exists (
         select 1 from public.sfv_zuordnung z
          where z.sfv_person_id = a.sfv_person_id
            and z.verein_id = a.verein_id)
  ) q;
