-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — die Rueckennummer im Verlauf, auch beim Gegner
-- 10.09.2026
--
-- ⚠ ⚠  DER VERLAUF-CHECK WIRD JETZT DOCH ANGEFASST — und zwar genau um
--       EIN Feldpaar, nicht mehr.
--
--   Im Plan zu Entscheid B stand: „Ihn zu lockern erzeugte genau das,
--   wovor du warnst — ein Feld, das erlaubt ist und leer bleibt." Das galt
--   fuer B, weil dort der Verlauf unveraendert bleiben sollte.
--
--   Mit dem Entscheid vom 10.09.2026 stimmt die Voraussetzung nicht mehr:
--   der Gegner bekommt Tor- und Kartensymbole an seiner
--   Aufstellungszeile, und die Zuordnung laeuft ueber die Rueckennummer.
--   **Das Feld bleibt also nicht leer — es wird gebraucht.**
--
--   ⚠ Der Unterschied ist der ganze Punkt: ein Feld freizugeben, das
--   niemand fuellt, ist ein Versaeumnis. Eines freizugeben, weil eine
--   Anzeige daran haengt, ist eine Entscheidung. Dieselbe Aenderung, zwei
--   verschiedene Sachen.
--
-- ── Was faellt und was bleibt ─────────────────────────────────────────────
--
--   faellt    rueckennr, ein_rueckennr
--   BLEIBT    sfv_person_id, ein_sfv_person_id
--
--   ⚠ Und „bleibt" heisst VERBOTEN, nicht ungenutzt. Eine Personennummer
--   ist ueber dieselbe Schnittstelle in einen Namen aufzuloesen; sie
--   bliebe dauerhaft in unserer Datenbank. Dieselbe Grenze wie bei
--   spiel_aufstellung_fremde_ohne_person, nur an der zweiten Tabelle.
--
-- ⚠ UND DER TEXT AENDERT SICH NICHT. Bei einem Gegnerwechsel steht
--   weiterhin nur der Vereinsname — kein „ersetzt durch", keine Nummer in
--   der Zeichenkette. Die Nummer wandert ins FELD, nicht in den Text:
--   zwei Wahrheiten waeren eine zu viel (Entscheid Didi, 10.09.2026).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiel_ereignisse
  drop constraint if exists spiel_ereignisse_fremde_anonym_check;

alter table public.spiel_ereignisse
  add constraint spiel_ereignisse_fremde_anonym_check check (
    ist_eigener
    or (sfv_person_id is null and ein_sfv_person_id is null)
  );

comment on table public.spiel_ereignisse is
  'Spielverlauf. herkunft=sfv wird bei jedem Lauf fortgeschrieben, herkunft=verein nie. Eine Vereins-Zeile verdeckt ueber ersetzt_ereignis_id eine SFV-Zeile (Korrektur) oder steht fuer sich (nachgetragener Assist). Von fremden Spielern bleiben gegner_club_name UND die Rueckennummer (seit 10.09.2026, fuer die Symbole an der Gegneraufstellung) — Personennummern bleiben verboten, erzwungen durch spiel_ereignisse_fremde_anonym_check.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Der CHECK haelt weiterhin, wo er soll. Diese Anweisung MUSS
--     scheitern (Personennummer bei einem Gegner):
--
--   insert into public.spiel_ereignisse
--          (verein_id, spiel_id, sfv_event_id, typ_id,
--           ist_eigener, sfv_person_id)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           -1, 1, false, 123);
--   -- erwartet: 23514 check constraint violated
--
-- 2 · Und er laesst durch, was er soll:
--
--   insert into public.spiel_ereignisse
--          (verein_id, spiel_id, sfv_event_id, typ_id,
--           ist_eigener, rueckennr)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000',
--           -2, 1, false, 7);
--   -- erwartet: geht durch. Danach wieder loeschen:
--   --   delete from public.spiel_ereignisse where sfv_event_id in (-1, -2);
--
-- 3 · Nach dem naechsten Matchdaten-Lauf — die Frage, die offen ist:
--     liefert der Verband die Nummer auch bei KARTEN und WECHSELN?
--
--   select typ_id,
--          ist_eigener,
--          count(*)         as zeilen,
--          count(rueckennr) as mit_nummer
--     from public.spiel_ereignisse
--    group by 1, 2
--    order by 1, 2;
--
-- ⚠ Gemessen ist bisher nur der Typ 1 (Tor), und nur an einer
--   aufgezeichneten Antwort: drei Gegnertore, alle mit Nummer. Ueber
--   Karten (3, 4) und Wechsel (2) sagt sie NICHTS. Bleibt `mit_nummer`
--   bei einem Typ auf 0, bekommt dieser Typ beim Gegner kein Symbol —
--   und das gehoert benannt, nicht stillschweigend leer gelassen.
