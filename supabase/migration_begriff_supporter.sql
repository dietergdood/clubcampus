-- ═══════════════════════════════════════════════════════════════════════════
-- BEGRIFFSKORREKTUR IN EINEM SPALTENKOMMENTAR
-- 22.08.2026
--
-- WOZU
--   `mitgliedtypen.zaehlt_als_mitgliedschaft` traegt einen Kommentar, der
--   „Goenner/Supporter" sagt. „Goenner" ist in diesem Verein FALSCH: es ist
--   ein Sponsoring-Begriff und meint jemanden, der Geld gibt. Ein Supporter
--   ist jemand, der dem Verein VERBUNDEN bleibt — ehemalige Spieler, Eltern
--   nach dem Austritt des Kindes, Leute die mithelfen. Nicht finanziell.
--   (Klaerung Didi, 22.08.2026.)
--
-- ⚠ WARUM ALS MIGRATION UND NICHT IM DUMP. `supabase/schema.sql` ist
--   ERZEUGT. Wer den Text dort von Hand aendert, aendert nichts an der
--   Datenbank — und der naechste `db dump` nimmt die Aenderung wieder
--   zurueck. Der Kommentar lebt in `pg_description`; nur ein
--   `COMMENT ON COLUMN` erreicht ihn.
--
--   Beim Durchgang durch die 86 Fundstellen ist genau das passiert: die
--   Ersetzung traf auch `schema.sql` und erzeugte dort „Supporter/Supporter".
--   Zurueckgenommen mit `git checkout`; die Aenderung gehoert hierher.
--
-- ZAEHLPROBE — ein Kommentar bewegt keinen der vier Zaehler:
--
--   CREATE TABLE 91 · CREATE POLICY 174 · INDEX 68 · ADD CONSTRAINT 315
--
--   Geprueft wird ueber `col_description()` unten.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare v_txt text;
begin

  comment on column public.mitgliedtypen.zaehlt_als_mitgliedschaft is
    'False = dieser Typ ist keine Mitgliedschaft: kein Beitrag, kein Stimmrecht an der GV, kein Spielbetrieb, eigener Tab in der Mitgliederliste. Ersetzt den Namensvergleich auf "Supporter" im Frontend.';

  select col_description('public.mitgliedtypen'::regclass, ordinal_position)
    into v_txt
    from information_schema.columns
   where table_schema='public' and table_name='mitgliedtypen'
     and column_name='zaehlt_als_mitgliedschaft';

  if v_txt is null then
    raise exception 'UNVOLLSTAENDIG: Kommentar nicht gesetzt.';
  end if;
  if v_txt ilike '%oenner%' or v_txt ilike '%önner%' then
    raise exception 'UNVOLLSTAENDIG: der Kommentar nennt weiterhin den falschen Begriff.';
  end if;

  raise notice 'Fertig. Kommentar gesetzt: %', left(v_txt, 60);
end $mig$;
