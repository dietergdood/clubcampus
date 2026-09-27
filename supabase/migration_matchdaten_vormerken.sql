-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — Spiele zum Neuabruf vormerken
-- 27.09.2026
--
-- ANLASS: Ein Trainer traegt beim Verband nachtraeglich etwas nach — Assists,
--   eine Auswechslung, eine Karte. Bei uns steht der Stand vom Abruf, und der
--   rollende Nachlauf kommt erst in ~5 Tagen wieder vorbei (2 Plaetze je Lauf
--   ueber ~270 Spiele). Bis dahin zeigt die Website die alte Aufstellung.
--
-- ── ⚠ WARUM EINE EIGENE SPALTE UND NICHT `matchdaten_geholt_am = null` ────
--
--   Die Kandidatenwahl gibt Spielen ohne `matchdaten_geholt_am` bereits
--   Vorrang (`neu`, ohne Deckel). Ein Vormerken waere also ein `update … set
--   matchdaten_geholt_am = null` und braeuchte keine Migration.
--
--   Drei Gruende dagegen, und der dritte entscheidet:
--
--   1 · Es LOESCHT eine Messung. `matchdaten_geholt_am` ist die Reihenfolge
--       des rollenden Nachlaufs; wer sie auf null setzt, nimmt dem Spiel
--       seinen Platz darin und kann ihn nicht wiederherstellen.
--
--   2 · „Vorgemerkt" waere von „noch nie geholt" nicht zu unterscheiden.
--       Der Knopf koennte nicht melden, wie viele noch offen sind, und
--       niemand koennte nachsehen, ob das Vormerken ueberhaupt gewirkt hat.
--
--   3 · ⚠ ES VERSCHAERFT EINEN BEKANNTEN DEFEKT. Ein Spiel, dessen Abruf
--       scheitert, behaelt heute schon `matchdaten_geholt_am = null` und
--       steht damit in JEDEM Lauf wieder ganz vorne — es verstopft den Kopf
--       der Schlange, ohne je fertig zu werden (CLAUDE.md, „EIN SPIEL, DAS
--       BEIM ABRUF SCHEITERT, BLEIBT FUER IMMER «NIE GEHOLT»"). Vormerken
--       ueber dieselbe Spalte hiesse, diesen Fall absichtlich herzustellen.
--
--   Mit einer eigenen Spalte bleibt jede dieser Fragen beantwortbar, und der
--   Abruf loescht die Marke wieder — ein vorgemerktes Spiel ist damit nach
--   seinem Lauf fertig, gleich ob er gelang.
--
-- ── Wer sie liest ─────────────────────────────────────────────────────────
--
--   `waehleKandidaten()` in `supabase/functions/sfv-sync/matchdaten.ts` —
--   ein eigener Topf mit Vorrang, gedeckelt, damit das 7-Tage-Fenster nicht
--   liegen bleibt. Die Oberflaeche setzt sie (Football.ch-Kachel,
--   „Gespielte Spiele neu holen") und zaehlt sie fuer die Restzeit.
--
--   ⚠ Diese Zeile ist Pflicht und keine Hoeflichkeit: eine Spalte, die
--   niemand liest, ist von einer, die niemand befuellt, an der Oberflaeche
--   nicht zu unterscheiden — beide zeigen ein leeres Feld.
--
-- ⚠ Wiederholbar: `if not exists`, und der Bericht liest nur. Ein zweiter
--   Lauf zeigt dieselbe Zeile und aendert nichts.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.spiele
  add column if not exists matchdaten_vorgemerkt_am timestamp with time zone;

comment on column public.spiele.matchdaten_vorgemerkt_am is
  'Von Hand zum Neuabruf vorgemerkt (Football.ch-Kachel). NULL = nicht vorgemerkt. Der Matchdaten-Lauf nimmt diese Spiele mit Vorrang und loescht die Marke danach — auch wenn der Abruf scheitert, damit ein dauerhaft scheiterndes Spiel den Kopf der Schlange nicht verstopft. ⚠ NICHT ueber matchdaten_geholt_am vormerken: das loescht die Reihenfolge des rollenden Nachlaufs. Angelegt 27.09.2026.';

-- ⚠ Teilindex: gesucht wird immer „wo ist die Marke gesetzt", nie der
--   Normalfall. Bei ~270 Spielen kostet er nichts und haelt die Abfrage
--   auch dann klein, wenn der Bestand ueber Jahre waechst.
create index if not exists spiele_matchdaten_vorgemerkt
  on public.spiele (verein_id, matchdaten_vorgemerkt_am)
  where matchdaten_vorgemerkt_am is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- BERICHT — als `select`, nicht als `raise notice`
-- ⚠ Der Supabase-Editor zeigt `notice` nicht an. „Success. No rows returned"
--   heisst dann: ich habe dir nichts gesagt.
-- ═══════════════════════════════════════════════════════════════════════════

select count(*)                                            as spiele_gesamt,
       count(*) filter (where matchdaten_geholt_am is not null)     as schon_geholt,
       count(*) filter (where matchdaten_vorgemerkt_am is not null) as vorgemerkt,
       -- Die Spalte gibt es jetzt; steht hier eine Zahl, ist sie lesbar.
       min(matchdaten_geholt_am)                            as aelteste_holung
  from public.spiele;
