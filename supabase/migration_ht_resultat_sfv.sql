-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — ht_resultat gehoert wieder dem SFV
-- 10.09.2026
--
-- ⚠ ⚠  DAS IST DIE RUECKNAHME EINER ENTSCHEIDUNG VOM 14.08.2026 — und der
--       Grund ist nicht, dass sie falsch war, sondern dass ihre
--       VORAUSSETZUNG weggefallen ist.
--
--   `migration_sfv_sync.sql`, Block B, schrieb woertlich:
--
--     „ht_resultat stand in der sfv-Liste, aber /api/club/schedule liefert
--      GAR KEINE Halbzeit — nachgeprueft an der echten Antwort. Es steht
--      nur in /api/match/{matchId} unter intermediateResults, und das
--      waeren 268 zusaetzliche Aufrufe pro Lauf, stuendlich."
--
--   **Beide Saetze stimmen bis heute. Der Schluss stimmt nicht mehr.**
--   `holeMatch` wird seit dem 19.08.2026 bei JEDEM Spiel des
--   Matchdaten-Laufs aufgerufen — und sein Ergebnis in derselben Zeile
--   weggeworfen. Die 268 Aufrufe sind nicht zusaetzlich; sie sind bereits
--   bezahlt.
--
-- ⚠ **Eine Entscheidung, die damals richtig war und die seither niemand
--   nachgeprueft hat, ist nicht falsch geworden — die Lage hat sich
--   geaendert.** (CLAUDE.md, 09.09.2026.) Genau dieser Fall, drei Wochen
--   spaeter bemerkt, weil jemand nach dem Halbzeitstand gefragt hat.
--
-- ── Der Einwand von damals gilt weiter, und er wird beantwortet ───────────
--
--   „Bliebe die Deklaration stehen, schriebe der Sync stuendlich NULL
--    ueber eine von Hand erfasste Halbzeit — genau der Schaden, gegen den
--    die Feldhoheit gebaut wurde."
--
--   **Deshalb schreibt der Lauf NIE null.** `leseHalbzeit()` gibt vier
--   Zustaende zurueck; nur `da` fuehrt zu einem Update. Wer eine Halbzeit
--   von Hand erfasst hat, behaelt sie, solange der Verband keine liefert.
--
--   ⚠ Die Feldhoheit allein haette das nicht sichergestellt — sie sagt,
--   WER schreiben darf, nicht WANN. Der Schutz steht im Code, und dieser
--   Kommentar sagt, wo: matchdatenLauf.ts, Abschnitt „Halbzeitstand".
--
-- ── Warum es ueberhaupt eine Migration braucht ────────────────────────────
--
-- ⚠ ⚠  NICHT, WEIL SONST ETWAS WEGGESCHNITTEN WUERDE — hier stand genau
--       das, und es war falsch.
--
--   `schneideAufFeldhoheit()` steht an EINER Stelle: dem Spielplan-Upsert
--   in `sync.ts`. Der Halbzeit-Schreibvorgang im Matchdaten-Durchgang geht
--   daran vorbei, wie die zwei bestehenden Schreibstellen auch. **Der Wert
--   kaeme also auch ohne diese Migration an.**
--
--   Gebraucht wird sie, damit der VERTRAG stimmt. Ohne sie sagt
--   `sync_felder` weiterhin „ht_resultat gehoert dem Verein", waehrend der
--   Sync es schreibt. Wer den Vertrag liest — und er ist ausdruecklich
--   „Vertrag, keine Dokumentation" —, schliesst daraus „der Sync fasst das
--   nicht an" und sucht den Wert an der falschen Stelle.
--
-- ⚠ **Ein Vertrag, dem der Code widerspricht, ist schlechter als keiner.**
--   Dieselbe Familie wie ein Kommentar, der eine andere Stelle zusichert:
--   er klingt geprueft, weil jemand ihn aufgeschrieben hat.
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠ ⚠  DIESE DATEI IST DAS PROTOKOLL, NICHT DER BLOCK ZUM AUSFUEHREN.
--
--   Am 10.09.2026 sind zwei Fassungen von hier ausgeliefert worden — die
--   erste trug `ht_resultat` in `sfv` ein und hat den stuendlichen Lauf
--   blockiert; die zweite lag richtig, wurde aber in einer
--   `begin; … commit;`-Huelle uebergeben und blieb ohne Wirkung
--   („Success", nichts geaendert).
--
--   Ausgefuehrt wurde am Ende eine EINZELNE Anweisung mit `returning` —
--   ohne Transaktionshuelle, mit Bedingung ueber den INHALT statt ueber
--   `key`, und mit sichtbarer Ausgabe. Sie steht unten unter „Was
--   tatsaechlich gelaufen ist".
--
-- ⚠ Wer diese Datei nachtraeglich als Vorlage nimmt, nimmt den Block von
--   dort, nicht den hier.

begin;

-- ⚠ ⚠  IN `sfv_matchdaten`, NICHT IN `sfv` — der erste Entwurf dieser
--       Migration hatte es falsch, und es waere still schiefgegangen.
--
--   `sync_felder->spiele` hat VIER Listen, nicht zwei:
--
--     sfv             der Spielplan-Durchgang berechnet und schreibt sie
--     sfv_matchdaten  der Matchdaten-Durchgang schreibt sie, pro Spiel
--     abgeleitet      aus eigenen Daten gesetzt (team)
--     verein          der Sync fasst sie nie an
--
--   Die vierte gibt es seit `migration_sfv_schiri_feldhoheit.sql`, und
--   zwar aus genau diesem Grund. Ihr Kopf sagt es woertlich: „Die
--   Zweiwege-Pruefung des Spielplans darf diese Liste NICHT mitpruefen,
--   sonst meldet sie ein Feld als fehlend, das ein anderer Durchgang
--   setzt."
--
--   `ht_resultat` unter `sfv` haette bei JEDEM Lauf eine Warnung erzeugt
--   („berechnet, aber nicht geliefert") — `bildeSpiel()` kann es nicht
--   berechnen, der Spielplan-Endpunkt liefert keine Halbzeit. Der Sync
--   haette sich stuendlich ueber ein Feld beschwert, das er an anderer
--   Stelle korrekt schreibt.
--
-- ⚠ Und ein Melder, der bei jedem Lauf dasselbe sagt, wird nach dem
--   dritten Mal nicht mehr gelesen — dieselbe Abstumpfung wie bei den
--   789 Lint-Warnungen. **Eine falsche Gruppe haette also nicht nur eine
--   falsche Meldung erzeugt, sondern die Meldungen insgesamt entwertet.**

update public.api_verbindungen a
   set sync_felder = jsonb_set(
         a.sync_felder,
         '{spiele}',
         (a.sync_felder->'spiele') || jsonb_build_object(
           'verein', (select coalesce(jsonb_agg(v), '[]'::jsonb)
                        from jsonb_array_elements(a.sync_felder->'spiele'->'verein') v
                       where v <> '"ht_resultat"'::jsonb),
           'sfv_matchdaten',
                     coalesce(a.sync_felder->'spiele'->'sfv_matchdaten', '[]'::jsonb)
                       || '["ht_resultat"]'::jsonb
         )
       )
 where a.key = 'football_ch'
   and a.sync_felder->'spiele'->'verein' @> '["ht_resultat"]'::jsonb;

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- 1 · Es steht genau einmal, und auf der richtigen Seite:
--
--   select
--     (sync_felder->'spiele'->'sfv_matchdaten') @> '["ht_resultat"]'::jsonb as bei_matchdaten,
--     (sync_felder->'spiele'->'sfv')             @> '["ht_resultat"]'::jsonb as bei_sfv,
--     (sync_felder->'spiele'->'verein')          @> '["ht_resultat"]'::jsonb as bei_verein,
--     jsonb_array_length(sync_felder->'spiele'->'sfv_matchdaten') as anz_md,
--     jsonb_array_length(sync_felder->'spiele'->'verein')         as anz_verein
--     from public.api_verbindungen where key = 'football_ch';
--
-- ⚠ Erwartung: bei_matchdaten true, bei_sfv **false**, bei_verein false;
--   anz_md 2 (schiedsrichter + ht_resultat), anz_verein 7 (vorher 8).
--
-- ⚠ `bei_sfv` MUSS false sein. Stuende es dort ebenfalls, meldete der
--   Spielplan-Durchgang das Feld bei jedem Lauf als fehlend — er kann es
--   nicht berechnen.
--
-- 2 · Nach dem naechsten Matchdaten-Lauf — und die Zahl steht auch in der
--     Meldung der Kachel:
--
--   select count(*) filter (where ht_resultat is not null) as mit_halbzeit,
--          count(*) filter (where ht_resultat is null)     as ohne,
--          count(*) filter (where ht_resultat = '0:0')     as torlos
--     from public.spiele
--    where matchdaten_geholt_am is not null;
--
-- ⚠ `torlos` steht mit Absicht daneben: „0:0" ist ein WERT, kein Fehlen.
--   Wer die Spalte mit `if (!wert)` prueft, verschluckt genau diese
--   Spiele — und eine torlose erste Halbzeit ist keine Seltenheit.
--
-- 3 · Und die Gegenrichtung, die dieser Migration ihren Namen gibt:
--     schreibt der Lauf eine von Hand erfasste Halbzeit tot?
--
--   Vor dem Lauf bei einem Spiel OHNE Verbandsangabe von Hand setzen:
--     update public.spiele set ht_resultat = '9:9' where id = '…';
--   Nach dem Lauf muss dort weiterhin '9:9' stehen.
--
-- ⚠ Das ist die eigentliche Probe. Die Feldhoheit sagt, WER schreiben
--   darf; dass der Lauf nicht NULL darueberschreibt, sagt allein der Code.

-- ═══════════════════════════════════════════════════════════════════════════
-- WAS TATSAECHLICH GELAUFEN IST (10.09.2026)
--
-- ⚠ Eine Anweisung, keine Transaktionshuelle, Bedingung ueber den INHALT,
--   `returning` als Ausgabe. Sie kann nicht „Success" melden und nichts
--   tun: bleibt sie wirkungslos, liefert sie NULL ZEILEN, und das ist
--   sichtbar.
--
-- update public.api_verbindungen a
--    set sync_felder = jsonb_set(
--          jsonb_set(
--            a.sync_felder,
--            '{spiele,sfv}',
--            (select coalesce(jsonb_agg(v), '[]'::jsonb)
--               from jsonb_array_elements(
--                      a.sync_felder->'spiele'->'sfv') v
--              where v <> '"ht_resultat"'::jsonb)),
--          '{spiele,sfv_matchdaten}',
--          (select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
--             from jsonb_array_elements(
--                    coalesce(
--                      a.sync_felder->'spiele'->'sfv_matchdaten',
--                      '[]'::jsonb)
--                    || '["ht_resultat"]'::jsonb) v))
--  where a.sync_felder->'spiele'->'sfv' @> '["ht_resultat"]'::jsonb
-- returning key, …;
--
-- ⚠ Gegen vier Ausgangszustaende geprueft, darunter zwei, die die eigene
--   Annahme verletzen (anderer Schluessel; nichts zu tun). Ein Pruefstand,
--   dessen Ausgangszustand man selbst erfindet, bestaetigt die Annahme
--   statt sie zu pruefen.
