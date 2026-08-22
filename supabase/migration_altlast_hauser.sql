-- ═══════════════════════════════════════════════════════════════════════════
-- EINE ALTLAST AUS DEM JULI BEKOMMT IHRE ART
-- 22.08.2026
--
-- WOZU
--   Drei Mitgliedschaften wurden im Juli 2026 beendet, bevor es
--   `personenarten` gab (20.08.2026). Alle drei liegen seither im Archiv
--   OHNE Art — in einem Zustand, den der heutige Ablauf nicht mehr erzeugt.
--
--   Nach dem Ablauf bekaeme ein austretendes Mitglied ohne weitere
--   Mitgliedschaft sofort die eingestellte Art. Fuer sie ist der Ausloeser
--   nie gelaufen, und er wird es auch nicht: er haengt am Austritt, und der
--   liegt zwei Monate zurueck.
--
-- ⚠ NUR EINE VON DREIEN, und das ist die Entscheidung (Didi, 22.08.2026):
--
--     Hauser Andrea    34, KEIN Elternteil, eigene Adresse
--                      -> bekommt die Art. Der Fall, fuer den der Ablauf
--                         gebaut ist.
--     Frei Andrea      15, Elternteil Frei Finn
--     Furrer Andrea    12, Elternteil Furrer Patrick
--                      -> bleiben ARCHIVIERT.
--
--   Grund: am 22.08.2026 ist entschieden worden, wie der Austritt eines
--   JUNIORS laeuft — ein Kind ohne eigene E-Mail folgt den Eltern, statt
--   selbst Supporter zu werden. Beide Elternteile sind seit demselben
--   Vormittag Supporter; die zwei Kinder bleiben damit nach der NEUEN Regel
--   genau dort, wo sie heute stehen. Es ist also kein Aufschieben, sondern
--   der Zielzustand.
--
--   Die Regel steht in `docs/auftrag_arten_austritt_loeschen.md`, Etappe 3.
--
-- ⚠ WAS SICH DADURCH AENDERT — gemessen, nicht vermutet:
--   Hauser Andrea erscheint danach im SUPPORTER-Tab. Heute steht sie nur im
--   Archiv. `fetchSupporter()` nimmt sie ueber den zweiten Weg auf („traegt
--   die Austritts-Art"), und die Kinder-Bedingung greift bei ihr nicht — sie
--   ist Elternteil von niemandem.
--
--   ⚠ Die Bedingung heisst „IST Elternteil", nicht „HAT ein Elternteil":
--   die Einbettung `eltern_kinder(person_id)` folgt der Spalte `person_id`,
--   und das ist der Elternteil. Fuer Frei und Furrer Andrea haette sie also
--   NICHT gegriffen — auch sie stuenden im Supporter-Tab, wenn sie die Art
--   bekaemen. Genau deshalb bekommen sie sie nicht.
--
--   Im ARCHIV bleibt sie sichtbar: das haengt an der beendeten
--   Mitgliedschaftszeile, nicht an der Art.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           68 -> 68   (+-0)
--   ADD CONSTRAINT                  315 -> 315  (+-0)
--
--   Eine Datenzeile bewegt keinen der vier Zaehler. Geprueft wird ueber
--   `personenart_pro_person` und die Namen unten.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_art     uuid;
  v_person  uuid;
  v_vorher  int;
  v_nachher int;
  v_name    text;
begin

  select v.austritt_art_id into v_art
    from public.vereine v where v.austritt_art_id is not null limit 1;
  if v_art is null then
    raise exception 'ABBRUCH: kein Austrittsziel eingestellt (vereine.austritt_art_id).';
  end if;

  /* ⚠ UEBER DIE EIGENSCHAFTEN, NICHT UEBER DEN NAMEN. „Hauser Andrea" waere
     ein Filter auf eine Schreibweise; gemeint ist: ausgetreten, keine aktive
     Mitgliedschaft, KEINE Art, und Elternteil von niemandem. Gaebe es zwei
     Personen dieses Namens, traefe der Namensfilter die falsche. */
  select p.id, p.nachname||' '||p.vorname into v_person, v_name
    from public.personen p
   where exists (select 1 from public.mitglieder m where m.person_id = p.id)
     and not exists (select 1 from public.mitglieder m where m.person_id = p.id and m.aktiv)
     and not exists (select 1 from public.personenarten_effektiv e where e.person_id = p.id)
     and not exists (select 1 from public.eltern_kinder k where k.person_id = p.id)
     /* ⚠ UND: hat selbst KEIN Elternteil. Das trennt sie von Frei und
        Furrer Andrea, die nach der Junioren-Regel bei ihren Eltern bleiben. */
     and not exists (
       select 1 from public.eltern_kinder k2
         join public.mitglieder m2 on m2.id = k2.mitglied_id
        where m2.person_id = p.id);

  if v_person is null then
    raise exception 'ABBRUCH: keine passende Person gefunden — Bestand hat sich geaendert, bitte neu messen.';
  end if;

  select count(*) into v_vorher from public.personenart_pro_person;

  insert into public.personenart_pro_person (verein_id, person_id, art_id)
  select p.verein_id, p.id, v_art from public.personen p where p.id = v_person
  on conflict (verein_id, person_id, art_id) do nothing;

  select count(*) into v_nachher from public.personenart_pro_person;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  if v_nachher <> v_vorher + 1 then
    raise exception 'UNERWARTET: % Zeile(n) statt genau einer.', v_nachher - v_vorher;
  end if;

  /* ⚠ Die zwei Kinder muessen UNVERAENDERT ohne Art bleiben. Ohne diese
     Probe faellt ein zu weiter Filter nicht auf — er saehe aus wie
     Gruendlichkeit. */
  select count(*) into v_vorher
    from public.personen p
   where exists (select 1 from public.mitglieder m where m.person_id = p.id)
     and not exists (select 1 from public.mitglieder m where m.person_id = p.id and m.aktiv)
     and not exists (select 1 from public.personenarten_effektiv e where e.person_id = p.id);
  if v_vorher <> 2 then
    raise exception 'UNERWARTET: % Person(en) ohne Art statt der zwei Kinder.', v_vorher;
  end if;

  raise notice 'Fertig. % hat die Austritts-Art. 2 Kinder bleiben archiviert ohne Art.', v_name;
end $mig$;
