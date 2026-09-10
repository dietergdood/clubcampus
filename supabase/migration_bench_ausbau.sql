-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — /bench faellt: die Trainerzeilen weg, vier Spalten weg
-- 10.09.2026
--
-- ⚠ ⚠  DIESE MIGRATION MUSS VOR DEM DEPLOY LAUFEN, NICHT DANACH.
--
--   Den Abruf zu entfernen loescht nichts. Die Zeilen aus /bench bleiben
--   stehen: ohne Rueckennummer, ohne Position, mit rolle_zuweisung_id
--   NULL. Und rolleAus(null, …) ergibt „start".
--
--   **Sie erschienen damit in der Startformation — namentlich, auf der
--   oeffentlichen Website, als Spieler.** Es sind Trainer.
--
-- ── Warum /bench ueberhaupt faellt ────────────────────────────────────────
--
--   Gemessen am 10.09.2026: 20 Personen kommen nur aus /bench, davon
--   **null Spieler und zwanzig Trainer/innen**. Fuer Spielernamen traegt
--   der Abruf nichts bei und kostet ein Viertel der vierzig
--   Matchdaten-Aufrufe je Lauf.
--
--   Er entstand aus dem Satz „/players liefert nur die Startelf" —
--   gezogen aus den 207, die fehlende NAMEN messen und nicht fehlende
--   ZEILEN. Beide Haelften sind widerlegt (CLAUDE.md, Lehrsatz vom
--   10.09.2026).
--
-- ⚠ WAS DANACH FEHLT, UND ZWAR GANZ: die Trainer eines Spiels. Nicht
--   „werden nicht angezeigt" — die Angabe kommt nicht mehr an. /players
--   fuehrt sie nicht, /api/match/{id} liefert Mannschaften und Resultat.
--   **Der Weg zurueck ist aktion: "rohschluessel"**, die /bench weiterhin
--   abfragt und nur liest. Siehe docs/plan_bench_ausbau.md §6.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · Die Zeilen, die nur aus /bench stammen ─────────────────────────────
--
-- Merkmal: aus der Bankliste UND ohne Zuweisung aus /players. Wer in
-- beiden Listen stand, ist verschmolzen und traegt rolle_zuweisung_id —
-- diese Zeilen bleiben, sie kommen aus /players.
do $$bench$$
declare
  anz integer;
begin
  delete from public.spiel_aufstellung
   where ist_bank
     and rolle_zuweisung_id is null;
  get diagnostics anz = row_count;
  raise notice 'Nur-aus-/bench geloescht: % Zeilen', anz;
end
$$bench$$;

-- ── 2 · Gegenprobe VOR dem Streichen der Spalte ────────────────────────────
--
-- ⚠ Sie muss hier stehen und nicht danach: nach dem drop gibt es
--   `ist_bank` nicht mehr, und die Pruefung waere nicht mehr formulierbar.
--   Eine Pruefung, die nach der Aenderung nicht mehr moeglich ist, gehoert
--   davor — sonst wird sie weggelassen.
do $$probe$$
declare
  rest integer;
begin
  select count(*) into rest
    from public.spiel_aufstellung
   where ist_bank and rolle_zuweisung_id is null;
  if rest > 0 then
    raise exception 'Gegenprobe gescheitert: % Zeile(n) mit ist_bank und ohne rolle_zuweisung_id stehen noch. Sie wuerden als Startspieler erscheinen.', rest;
  end if;
end
$$probe$$;

-- ── 3 · Die vier Spalten ───────────────────────────────────────────────────
--
-- Jede einzeln geprueft (docs/plan_bench_ausbau.md §2):
--
--   rolle_kategorie      keinen Leser im ganzen Portal
--   rolle_kategorie_id   nur bildeSfvPersonAusBank, die mitgeht
--   rolle_id             keinen Leser
--   ist_bank             rolleAus() als Abkuerzung — rolle_zuweisung_id
--                        traegt die Unterscheidung ohnehin
--
-- ⚠ `rolle_kategorie` ist selbst ein Fall von „wer liest diese Spalte?":
--   am 10.09.2026 angelegt, an keiner Stelle gelesen, und der einzige
--   Grund fuer ihre Existenz faellt mit diesem Schritt weg.
alter table public.spiel_aufstellung
  drop column if exists ist_bank,
  drop column if exists rolle_id,
  drop column if exists rolle_kategorie_id,
  drop column if exists rolle_kategorie;

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Die Spalten sind weg:
--
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'spiel_aufstellung'
--      and column_name in ('ist_bank','rolle_id','rolle_kategorie',
--                          'rolle_kategorie_id');
--   -- erwartet: null Zeilen
--
-- 2 · Und kein Trainer steht mehr in der Aufstellung. Alle verbliebenen
--     Zeilen ohne Zuweisung sind Altbestand aus der Zeit vor der Spalte —
--     sie tragen eine Position:
--
--   select count(*) filter (where rolle_zuweisung_id is null)             as ohne_zuweisung,
--          count(*) filter (where rolle_zuweisung_id is null
--                             and position_name is null)                  as ohne_beides
--     from public.spiel_aufstellung
--    where ist_eigener;
--
-- ⚠ `ohne_beides` ist die Zahl, auf die es ankommt: eine eigene Zeile ohne
--   Zuweisung UND ohne Position hat nichts, woran man einen Spieler
--   erkennt. Erwartung 0. Steht dort etwas, ist eine Quelle uebrig, die
--   niemand kennt.
