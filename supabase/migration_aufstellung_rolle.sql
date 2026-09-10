-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — die Rolle aus /players, fuer beide Mannschaften
-- 10.09.2026
--
-- ⚠ ⚠  ANLASS: EINE FALSCHE ZEILE IN MEINER FELDLISTE.
--
--   Dort stand: „`rolle` beim Gegner immer `start` — Grenze der Quelle:
--   /bench fuehrt fuer Gegner nichts Verwertbares."
--
--   Der zweite Halbsatz stimmt fuer /bench. Er stimmt NICHT fuer
--   /players — und der erste Halbsatz folgt daraus nicht. Ich habe eine
--   Grenze an der falschen Quelle gemessen und die Folgerung auf die
--   Anzeige uebertragen.
--
--   ⚠ Daraus die Regel, die ab heute in solchen Zeilen steht: **wer eine
--   Grenze nennt, nennt die QUELLE dazu.** „Grenze der Quelle" ohne
--   Angabe, welcher, ist nicht nachpruefbar.
--
-- ── Gemessen an docs/sfv/matchdaten_beispiel.json (32 Spieler) ────────────
--
--     assignmentRoleId  0 = „-"        20x
--                       1 = „Captain"   2x
--                       2 = „Ersatz"   10x
--
--     GEGNER (12 Spieler):  positionName „Ersatz (S)"  →  0
--                           assignmentRoleName „Ersatz" →  1
--
--   **Der Gegner hat eine Bank — sie steht nur in einem anderen Feld.**
--
-- ⚠ ⚠  UND DIE ZWEI FELDER WIDERSPRECHEN SICH. Drei Spieler tragen die
--       Rolle „Ersatz" bei einer echten Position:
--
--         Klub 11030  Nr  9  Ersatz / Mittelfeld linksaussen
--         Klub 11057  Nr 18  Ersatz / Mittelfeld
--         Klub 11057  Nr  9  Ersatz / Sturmspitze
--
--   `positionName = "Ersatz (S)"` ist also ein GELEGENTLICHER Vermerk,
--   `assignmentRoleId` die verlaessliche Angabe. Wer die Rolle aus der
--   Position ableitet, zaehlt drei Ersatzspieler zu wenig — und merkt es
--   nicht, weil beide Werte plausibel aussehen.
--
-- ⚠ WARUM BEIDE GESPEICHERT WERDEN: damit der Widerspruch messbar bleibt.
--   Wuerde nur die abgeleitete Rolle gespeichert, waere spaeter nicht mehr
--   zu sehen, dass die Quelle uneinig ist.
--
-- ⚠ UND WARUM DIE ID UND NICHT DER NAME entscheidet: der Name ist ein
--   Anzeigetext des Verbands und kann sich aendern; die Id ist ein
--   Schluessel. Der Name wird trotzdem mitgeschrieben — damit ein neuer
--   Wert AUFFAELLT, statt still als „start" durchzufallen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.spiel_aufstellung
  add column if not exists rolle_zuweisung_id integer,
  add column if not exists rolle_zuweisung    text;

comment on column public.spiel_aufstellung.rolle_zuweisung_id is
  'SFV assignmentRoleId aus /players. Gemessen 10.09.2026: 0 = „-", 1 = „Captain", 2 = „Ersatz". ⚠ Fuer BEIDE Mannschaften gefuellt — der Gegner hat eine Bank, sie steht nur nicht in positionName. Die Anzeige leitet `rolle` hieraus ab, nicht aus der Position.';

comment on column public.spiel_aufstellung.rolle_zuweisung is
  'SFV assignmentRoleName im Klartext. Mitgeschrieben, damit ein unbekannter Wert AUFFAELLT statt still als „start" durchzufallen — dieselbe Regel wie bei unbekannten Ereignistypen.';

comment on column public.spiel_aufstellung.position_name is
  'SFV positionName. ⚠ NICHT als Ersatz-Kennzeichen verwenden: gemessen 10.09.2026 tragen drei Spieler die Rolle „Ersatz" bei echter Position, und beim Gegner steht „Ersatz (S)" gar nicht. Die Rolle steht in rolle_zuweisung_id.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- Nach dem naechsten Matchdaten-Lauf:
--
--   select ist_eigener,
--          rolle_zuweisung,
--          count(*) as zeilen
--     from public.spiel_aufstellung
--    where not ist_bank
--    group by 1, 2
--    order by 1, 2;
--
-- ⚠ Erwartung: bei ist_eigener = false steht „Ersatz" mit einer Zahl > 0.
--   Steht dort nur „-", hat der Verband beim Gegner doch keine Bank — dann
--   belegt das die QUELLE und nicht mehr nur ein Spiel, und die Anzeige
--   muss es sagen statt eine leere Bank zu zeigen.
--
-- Und der Widerspruch, den die Messung gefunden hat:
--
--   select count(*) as rolle_ersatz_aber_echte_position
--     from public.spiel_aufstellung
--    where rolle_zuweisung = 'Ersatz'
--      and position_name is not null
--      and position_name not like '%Ersatz%';
--
-- ⚠ Erwartung: > 0. Waere sie 0, haette das Beispiel getaeuscht — dann
--   waere positionName doch verlaesslich, und diese Migration einen
--   Kommentar zu viel.
