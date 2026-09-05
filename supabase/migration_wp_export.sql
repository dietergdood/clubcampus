-- ═══════════════════════════════════════════════════════════════════════════
-- WORDPRESS-EXPORT — ETAPPE 1: der Anschluss
-- 05.09.2026
--
-- Legt die zweite Zeile in api_verbindungen an: key = 'wordpress'.
-- Sie ist Konfiguration UND Ueberwachung zugleich — der Waechter
-- (cron_sync_waechter.sql) liest genau diese Tabelle.
--
-- Plan: docs/plan_wordpress_spieldaten.md
-- Auftrag: docs/auftrag_wordpress_spieldaten.md
--
-- SCHREIBT KEINE NUTZDATEN. Eine Zeile in api_verbindungen, sonst nichts.
-- Keine neue Tabelle, keine Spalte, kein Index, keine Policy.
--
--
-- ⚠ ⚠ ⚠  WARUM active = false — UND WAS DAS TEUER MACHT  ⚠ ⚠ ⚠
--
--   Das ist der wichtigste Teil dieser Datei, und er sieht wie eine
--   Nebensaechlichkeit aus.
--
--   DER WAECHTER SIEHT NUR ZEILEN, DIE BEIDES SIND:
--
--     -- cron_sync_waechter.sql
--     where v.active is true and v.auto_sync is true
--
--   Er ist NICHT auf 'football_ch' verdrahtet — er prueft jede Zeile, die
--   diese Bedingung erfuellt, auf letzter_sync IS NULL, auf Alter > 120
--   Minuten und auf sync_status = 'fehler'. Eine zweite Zeile waere damit
--   OHNE EINE ZEILE AENDERUNG ueberwacht.
--
--   ⚠ UND GENAU DARIN LIEGT DIE FALLE, DIE DIESEN AUFTRAG AUSGELOEST HAT.
--
--   migration_sfv_spielplan.sql (Block D) legt die SFV-Zeile mit
--   active = false an, mit dem Kommentar „bleibt false, bis die Edge
--   Function steht". Die Function kam — und niemand hat die Spalte
--   nachgezogen. Folge:
--
--     · SECHS TAGE grauer Stecker fuer einen Anschluss, der stuendlich lief
--     · der Knopf „Sync starten" haengt an active und hat nie gerendert
--     · und der Waechter hat die Zeile die ganze Zeit NICHT ANGESEHEN
--
--   Die ersten beiden sind aergerlich. Der dritte ist der eigentliche
--   Schaden: ein Anschluss, der ausfaellt, und ein Waechter, der schweigt.
--   SCHWEIGEN IST VON ZUFRIEDENHEIT NICHT ZU UNTERSCHEIDEN — genau der
--   Satz, gegen den der Waechter ueberhaupt gebaut wurde.
--
--
-- ⚠ DIESE DATEI MACHT TROTZDEM DENSELBEN SCHRITT. HIER STEHT, WARUM.
--
--   Der erste Entwurf legte die Zeile auf active = true an, mit genau der
--   Begruendung oben. Didi hat sie am 05.09.2026 umgedreht, und das Argument
--   sticht:
--
--     „Wenn ich nach Etappe 1 aufhoere und das Portal steht drei Wochen mit
--      rotem healthchecks, ist die Ueberwachung danach wertlos. Ein
--      Waechter, den man wochenlang ignoriert, ist schlimmer als einer, der
--      spaeter anfaengt."
--
--   Mit active = true meldet der Waechter ab der ersten Stunde zu Recht
--   „Es hat noch nie ein Lauf stattgefunden" und pingt healthchecks.io auf
--   /fail — bis Etappe 6 steht. Solange die Etappen 2–6 in einem Zug folgen,
--   ist das ein paar Stunden Laerm fuer eine echte Beobachtung. Ziehen sie
--   sich, ist es WOCHENLANGES ROT FUER EINEN BEKANNTEN ZUSTAND, und das
--   stumpft den Alarm fuer den SFV-Sync gleich mit ab — der haengt an
--   demselben healthchecks-Ping.
--
--   ⚠ DAS IST DER TEURERE SCHADEN. Ein unueberwachter Anschluss faellt
--   still aus; ein abgestumpfter Waechter laesst JEDEN Anschluss still
--   ausfallen. Deshalb false.
--
--   Und die Lage ist eine andere als beim SFV: Etappe 3 liegt auf der
--   WordPress-Installation (Plugin, Export-Benutzer, Application Password)
--   und ist von hier aus nicht erreichbar. Die Etappen 2–6 sind an EINEM
--   Tag nicht zu schaffen — gemessen an dem, was fehlt, nicht geschaetzt.
--
--
-- ⚠ WAS ES KOSTET, UND WIE DIE RECHNUNG BEZAHLT WIRD
--
--   Verloren geht die Beobachtung an Tag eins: ob der Waechter die neue
--   Zeile ueberhaupt ansieht, ist bis Etappe 6 eine ANNAHME. Genau das war
--   der Grund fuer den ersten Entwurf, und der Verlust gehoert benannt
--   statt weggeredet.
--
--   Drei Dinge treten an seine Stelle:
--
--   1) sync_status = 'ausstehend'. Die Kachel faerbt den Chip BERNSTEIN
--      statt grau (ApiTab.tsx:136-137) — sichtbar anders als „deaktiviert".
--      ⚠ sync_meldung wird dort NICHT gerendert (0 Treffer auf
--      „api.sync_meldung"; der Kommentar bei ApiTab.tsx:99 behauptet das
--      Gegenteil und liegt daneben). Der Satz steht trotzdem in der Spalte,
--      fuer den, der die Tabelle abfragt — aber niemand sieht ihn im Portal.
--
--   2) Pruefung 2 unten sagt NICHT 'ok', solange die Zeile unueberwacht ist,
--      sondern 'offen (Etappe 6)'. Die Verifikation dieser Datei geht damit
--      absichtlich nicht vollstaendig gruen — sie ist eine Frage, die man
--      jederzeit neu stellen kann, statt eines Kommentars, der etwas
--      zusichert. Das ist der Unterschied zum SFV-Satz von damals: der war
--      eine Behauptung, das hier ist eine Abfrage.
--
--   3) Etappe 6 (cron_wp_export.sql) schaltet scharf UND legt den Zeitplan
--      an — in EINER Datei, damit beides nicht auseinanderlaufen kann —,
--      und bricht ab, wenn active/auto_sync danach nicht true sind.
--
--   ⚠ KEINES DER DREI ERSETZT DIE BEOBACHTUNG. Sie machen den vergessenen
--   Fall nur auffindbar, nicht unmoeglich. Wer Etappe 6 nie faehrt, hat
--   einen bernsteinfarbenen Chip und sonst nichts — und das ist genau der
--   Zustand, in dem die SFV-Zeile sechs Tage stand. Die einzige echte
--   Absicherung ist, die Etappen 2–6 zu Ende zu fahren.
--
--
-- IDEMPOTENZ, MIT EINER AUSNAHME
--
--   on conflict aktualisiert label, icon, sync_intervall und sync_felder —
--   aber NICHT active, auto_sync, konfiguriert, sync_status, sync_meldung
--   und api_url. Ein erneuter Lauf soll einen laufenden Export nicht
--   anfassen und eine bewusst abgeschaltete Zeile nicht wieder
--   einschalten. Dieselbe Entscheidung wie in migration_sfv_spielplan.sql,
--   und aus demselben Grund.
--
--   ⚠ api_url steht in dieser Zeile ohnehin auf NULL (die Adresse lebt im
--   Secret). Es aus dem SET zu lassen ist der Fall, in dem es spaeter doch
--   jemand von Hand setzt — dann soll ein erneuter Lauf es nicht loeschen.
--
--   ⚠ DIE SECHS SIND DER GRUND, WARUM DIESE DATEI NACH ETAPPE 6 NOCH
--   LAUFEN DARF. Stuenden sie im SET, setzte ein erneuter Lauf einen
--   scharfen Anschluss auf 'ausstehend' zurueck und schaltete ihn ab —
--   und weil das kein Fehler waere, faende es niemand. Die Zaehlprobe
--   stellt nichts her, sie MELDET nur.
--
--
-- MANDANT
--
--   Die Zeile haengt an vereine.slug = 'fcherrliberg'. Beim zweiten Verein
--   ist das nachzuziehen — genau wie beim SFV-Anschluss, und api_url wie
--   die Secrets sind dann ohnehin andere.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

insert into public.api_verbindungen
       (verein_id, key, label, icon, active, konfiguriert,
        api_url, auto_sync, sync_intervall, sync_status, sync_meldung,
        sync_felder, sort_order)
select v.id,
       'wordpress',
       -- ⚠ OHNE HOST IM NAMEN. „WordPress-Export (fcherrliberg.ch)" waere
       --   dieselbe Adresse an einem zweiten Ort — und zwar an dem, den man
       --   am seltensten nachzieht, weil er nur eine Beschriftung ist. Der
       --   Anschluss zeigt zuerst auf dev; ein Label mit der Produktions-
       --   domain waere ab Tag eins falsch, ohne dass etwas fehlschlaegt.
       'WordPress-Export',
       'globe',
       -- ⚠ false — und das ist eine Entscheidung, kein Vorgabewert. Die
       --   Begruendung steht oben und ist der Kern dieser Datei: solange die
       --   Etappen 2-6 nicht in einem Zug folgen, waere true wochenlanges
       --   Rot fuer einen bekannten Zustand. ETAPPE 6 SCHALTET SCHARF.
       false,
       -- konfiguriert = false: die Secrets sind noch nicht gesetzt.
       -- ⚠ Die Spalte hat heute KEINEN Leser — ApiTab deklariert sie
       --   (ApiTab.tsx:20), rendert sie aber nirgends (0 Treffer auf
       --   „api.konfiguriert"). Sie wird hier ehrlich gesetzt und es haengt
       --   nichts daran; wer ihr einen Leser gibt, faengt bei diesem Wert an.
       false,
       -- ⚠ ⚠  api_url BLEIBT LEER — DIE ADRESSE STEHT IM SECRET  ⚠ ⚠
       --
       --   Anders als beim SFV-Anschluss, und das ist Absicht (Didi,
       --   05.09.2026). Der Export zeigt zuerst auf dev.fcherrliberg.ch und
       --   spaeter auf fcherrliberg.ch. Ein Wechsel soll EIN Befehl sein:
       --
       --     npx supabase secrets set WP_BASIS_URL=https://…/wp-json
       --
       --   Stuende die Adresse hier, waere der Wechsel zwei Orte — Secret
       --   und Tabelle —, und zwei Orte fuer eine Aussage laufen
       --   auseinander. Dann zeigte die Kachel auf die eine Seite und der
       --   Export schriebe auf die andere, ohne dass etwas fehlschlaegt.
       --   Genau das Muster, das in diesem Projekt schon dreimal Zeit
       --   gekostet hat (hat_portal_zugang, active, ROLLE_MAP).
       --
       --   ⚠ WAS DAMIT VERLOREN GEHT, und es ist nicht nichts: die Tabelle
       --   sagt nicht mehr, wohin geschrieben wird. Ersetzt wird das nicht
       --   durch eine Kopie, sondern durch eine BEOBACHTUNG — der Export
       --   nennt den Ziel-Host in sync_meldung und api_sync_log.meldung.
       --
       --     Konfiguration (kann veralten)  → nur das Secret
       --     Beobachtung   (kann nicht luegen) → die Meldung des letzten Laufs
       --
       --   Eine Konfigurationskopie behauptet etwas ueber die Zukunft, ein
       --   Protokoll berichtet ueber die Vergangenheit. Nur das zweite kann
       --   nach einem Wechsel nicht falsch sein.
       --
       --   ⚠ Und die Kachel behauptet das Gegenteil: die InfoBox in
       --   ApiTab.tsx:117 sagt „Die Adresse des Anschlusses steht in
       --   api_verbindungen.api_url". Fuer diese Zeile stimmt das nicht.
       --   Offener Punkt, siehe plan_wordpress_spieldaten.md 15.
       null,
       -- auto_sync ebenfalls false: der Waechter verlangt BEIDE, und es gibt
       -- bis Etappe 6 keinen Zeitplan, der etwas ausloesen koennte.
       false,
       'stuendlich',
       -- ⚠ 'ausstehend' faerbt den Chip in der Kachel BERNSTEIN statt grau
       --   (ApiTab.tsx:136-137). Der einzige sichtbare Unterschied zu einem
       --   vergessenen Anschluss — mager, aber es ist der, den es gibt.
       'ausstehend',
       -- ⚠ Steht in der Spalte, wird aber NICHT in der Kachel gerendert.
       --   Fuer den, der die Tabelle abfragt, nicht fuer den, der hinsieht.
       'Angelegt am 05.09.2026 (Etappe 1). NICHT UEBERWACHT: der Waechter verlangt active UND auto_sync, beide stehen auf false. Etappe 6 (cron_wp_export.sql) schaltet scharf und legt den Zeitplan an. Bis dahin laeuft kein Export.',
       jsonb_build_object(
         '_hinweis',
           'Verbindlicher Vertrag, keine Dokumentation. Der Export liest ausschliesslich die unter "quelle" genannten Spalten und sendet ausschliesslich die daraus und aus "berechnet" gebildeten Felder. Was unter "redaktionell" steht, gehoert der Website und wird nie geschrieben. Was unter "nicht_exportiert" steht, verlaesst den Verein nicht.',

         -- ── spiel ────────────────────────────────────────────────────
         'spiel', jsonb_build_object(
           -- Spalten von public.spiele, die gelesen und gesendet werden.
           -- Pruefung 3 haelt jede davon gegen information_schema.
           'quelle', jsonb_build_array(
                       'id','date','zeit','sfv_team_id','gegner','heimspiel',
                       'venue','wettbewerb','liga','sfv_gruppe',
                       'status','sfv_status','resultat','ht_resultat',
                       'sfv_match_id','sfv_spiel_nr'),

           -- Keine Spalten: im Export gebildet. Stehen deshalb NICHT in
           -- Pruefung 3 — sie waeren dort zwangslaeufig „unbekannt".
           'berechnet', jsonb_build_array('ereignisse','export_lauf'),

           -- Felder auf WordPress-Seite, die der Export nie anfasst.
           'redaktionell', jsonb_build_array('bericht','bilder','beitragsstatus'),

           -- ⚠ Spalten, die es GIBT und die bewusst NICHT wandern. Sie
           --   stehen hier, damit niemand sie spaeter stillschweigend
           --   ergaenzt — dieselbe Disziplin wie „wer liest diese Spalte?",
           --   nur in die andere Richtung.
           'nicht_exportiert', jsonb_build_array(
                       'treffpunkt','notes','venue_addr','spiel_nr',
                       'schiedsrichter','delegierter','zuschauer'),

           '_regel_team',
             'spiele.team steht ABSICHTLICH nicht unter quelle. Die Spalte ist ein Abbild, das der Sync bei jedem Lauf aus teams.name ueber teams.sfv_team_id neu setzt (sync.ts:74-77) — und ohne Zuordnung traegt sie den SFV-Namen als Platzhalter. Die Zuordnung laeuft ueber sfv_team_id. Pruefung 6 haelt das fest.',
           '_regel_sfv_stand',
             'spiele.sfv_stand steht ABSICHTLICH nicht unter quelle. Es ist die rohe Antwortzeile des Verbands; sie zu senden hiesse, eine fremde Nutzlast ungelesen nach draussen zu reichen — genau das, was die Allowlist-Regel verbietet. Pruefung 7 haelt das fest.',
           '_regel_treffpunkt',
             'treffpunkt und notes gehoeren dem Verein und sind INTERNE Angaben fuer die Mannschaft. Sie stehen in der Feldhoheit des SFV-Sync unter "verein" und verlassen den Verein nicht.',
           '_regel_ht_resultat',
             'ht_resultat steht unter quelle, obwohl es heute bei jedem Spiel leer ist: holeMatch liefert den Halbzeitstand und wirft ihn weg (CLAUDE.md). Wird das behoben, fuellt sich das Feld ohne Aenderung am Export. Solange es leer ist, darf die Vorlage daraus nichts machen — kein "0:0".'),

         -- ── team ─────────────────────────────────────────────────────
         'team', jsonb_build_object(
           'quelle', jsonb_build_array(),
           'redaktionell', jsonb_build_array('alle'),
           '_regel',
             'Der Export schreibt NIE nach team — er legt keines an, aendert keines und loescht keines. Er liest die Zuordnung (WordPress team.sfv_id gegen teams.sfv_team_id) und sonst nichts. Damit bleibt die Sichtbarkeit einer Mannschaft auf der Website eine Entscheidung des Vereins. Pruefung 8 haelt fest, dass quelle leer ist.',
           '_regel_sfv_id',
             'team.sfv_id IST teams.sfv_team_id. Belegt am 05.09.2026 im Browser, mit Gegenprobe: t=38309 zeigt FC Herrliberg a (Junioren C Promotion), t=37931 zeigt FC Kuesnacht a. Der Linkparameter v=1516 ist die FCH-Vereinsseite und traegt nur fuer eigene Teams.',
           '_regel_clubcampus_id',
             'team bekommt KEIN Feld clubcampus_id. Die Verknuepfung laeuft ganz ueber sfv_id; ein zweites Feld haette keinen Leser. Entschieden am 05.09.2026, siehe plan_wordpress_spieldaten.md 3.2.'),

         -- ── spieler ──────────────────────────────────────────────────
         'spieler', jsonb_build_object(
           'quelle', jsonb_build_array(),
           'berechnet', jsonb_build_array(
                       'einsaetze','minuten','spiele_mit_verlauf','tore','assists',
                       'verwarnungen','ausschluesse','rueckennummern','position',
                       'export_lauf'),
           'redaktionell', jsonb_build_array(
                       'name','foto','vorstellungstext','sfv_spieler_id'),
           '_regel_verknuepfung',
             'Ein Spieler-Beitrag haengt an sfv_person_id, nicht an einer ClubCampus-Person. Ohne sfv_person_id ist er ein rein redaktioneller Eintrag und wird uebergangen — die Redaktion soll Spieler erfassen koennen, bevor sie je auf einem Spielbericht standen.',
           '_regel_name',
             'Der Name ist heute redaktionell und wird nie ueberschrieben: sfv_zuordnung hat null Zeilen. Sobald eine Zuordnung besteht, sendet der Export den Namen aus personen — und ab dann ist er im Backend nicht mehr aenderbar. Das geht Spieler fuer Spieler und braucht keinen Stichtag.',
           '_regel_spiele_mit_verlauf',
             'spiele_mit_verlauf wandert mit, obwohl es niemand bestellt hat: bei rund vier von zehn Spielen liefert der Verband keinen Verlauf. Ohne diese Zahl zeigt die Website "14 Einsaetze, 0 Tore" fuer einen Stuermer, der getroffen hat. Sie muss nicht angezeigt werden — sie muss DA sein.'),

         -- ── rangliste ────────────────────────────────────────────────
         'rangliste', jsonb_build_object(
           'quelle', jsonb_build_array('alle'),
           'redaktionell', jsonb_build_array(),
           '_regel',
             'Gehoert ganz dem Verband, nichts daran ist redaktionell. Gespeichert wird je GRUPPE, nicht je Team und nicht als Beitragstyp — eine Tabelle hat keinen Titel, keinen Permalink und keinen Inhalt, den jemand bearbeiten darf. Und ein Feld am team-Beitrag schiede aus, weil der Export team nie schreibt.'),

         -- ── Zwei Allowlisten, die den Verein verlassen ────────────────
         -- ⚠ ALLOWLIST, NICHT DENYLIST. Beide Male ist die Frage nicht
         --   „was wollen wir draussen halten", sondern „was darf hinaus".
         --   Was der Verband morgen neu einfuehrt, ist damit im Zweifel
         --   NICHT auf der Website — und das ist die richtige Vorgabe fuer
         --   eine oeffentliche Seite.
         'ereignis_typen', jsonb_build_array(1, 9, 2, 3, 4),
         '_regel_ereignis_typen',
           'SFV-Ereignistypen, die exportiert werden: 1 Tor, 9 Assist, 2 Aus-/Einwechslung, 3 Verwarnung, 4 Ausschluss. Genau die vier Gruppen aus dem Auftrag. bildeEreignis() speichert JEDEN Typ, den der Verband liefert (matchdaten.ts:121) — die Stammdaten kennen mindestens 19. Typ 15 heisst "Strafen (Trainer, Funktionaere, Zuschauer)" und nennt Menschen, die keine Spieler sind; ohne diese Liste stuende er mit auf der Seite.',

         'spiel_status_export', jsonb_build_array(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
         '_regel_spiel_status',
           'SFV-Spielzustaende, die auf die Website duerfen. ⚠ 12 FEHLT ABSICHTLICH: "Spiel ohne Austragung (keine Publikation)" ist ein Veroeffentlichungsverbot des Verbands. Es steht so in den Stammdaten und kam bis zum 05.09.2026 an keiner Stelle des Projekts vor. Ein Spiel, das nach der Veroeffentlichung auf 12 wechselt, wird zurueckgezogen (Beitrag auf Entwurf). Ein verschobenes Spiel (6) dagegen BLEIBT — es findet statt, nur spaeter.',

         '_regel_loeschen',
           'Ein spiel-Beitrag, den der Export nicht mehr liefert, wird auf Entwurf gesetzt, nie geloescht — und abgeglichen wird JE TEAM, nur fuer Teams, zu denen der Lauf tatsaechlich Spiele geliefert hat. Dieselbe Lehre wie sync.ts:230 ("ein halber Ausfall kann so nichts wegraeumen"), nur diesmal auf einer Seite, auf der niemand prueft. ⚠ In ClubCampus verschwindet ein Spiel uebrigens NIE: es gibt keinen Loeschpfad auf spiele, und der Sync zaehlt nicht mehr gelieferte Zeilen, statt sie zu entfernen.'
       ),
       -- 10 ist football_ch. Der Export steht daneben.
       20
  from public.vereine v
 where v.slug = 'fcherrliberg'
    on conflict (verein_id, key) do update
   set label          = excluded.label,
       icon           = excluded.icon,
       sync_intervall = excluded.sync_intervall,
       sync_felder    = excluded.sync_felder,
       updated_at     = now();
-- ⚠ active, auto_sync, konfiguriert, sync_status, sync_meldung und api_url
--   stehen absichtlich NICHT im SET. Ein erneuter Lauf nach Etappe 6 wuerde sonst
--   einen scharfen Anschluss abschalten und auf 'ausstehend' zuruecksetzen
--   — lautlos, weil das kein Fehler ist. Pruefung 2 meldet den Zustand,
--   statt ihn herzustellen.

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Eine Abfrage, ein Ergebnis. Alle elf Zeilen muessen 'ok' zeigen.
--
-- Vorab offline gegengeprueft (05.09.2026): spiele hat 34 Spalten, alle 23
-- genannten existieren, quelle und nicht_exportiert ueberschneiden sich nicht.

with p(nr, pruefung, erwartet, gefunden) as (values
  (1, 'Zeile wordpress existiert',
      1::bigint, (select count(*) from public.api_verbindungen where key='wordpress')),

  -- ⚠ DIE WICHTIGSTE — UND DIE EINZIGE, DIE HEUTE NICHT 'ok' SAGEN DARF.
  --
  --   Der Waechter sieht nur Zeilen mit BEIDEN Kennzeichen
  --   (cron_sync_waechter.sql). Steht hier 0, ist der Anschluss
  --   unueberwacht — und ein unueberwachter Anschluss faellt still aus.
  --   Genau so stand die SFV-Zeile sechs Tage grau, waehrend sie lief.
  --
  --   Nach Etappe 1 steht hier absichtlich 0, und die Statusspalte zeigt
  --   dafuer 'offen (Etappe 6)' statt '>>> PRUEFEN'. Der eigene Wortlaut
  --   ist Absicht: ein bekannter offener Punkt darf nicht wie ein Defekt
  --   aussehen, sonst gewoehnt man sich an rote Zeilen — dieselbe Regel wie
  --   „rot ist ein Zustand fuer Stunden, nicht fuer Wochen".
  --
  --   ⚠ NACH ETAPPE 6 MUSS HIER 'ok' STEHEN. Diese Abfrage ist der Ersatz
  --   fuer den Kommentar, den beim SFV niemand nachgezogen hat: sie laesst
  --   sich jederzeit erneut stellen und antwortet mit dem Ist-Zustand,
  --   waehrend ein Kommentar nur behauptet.
  (2, 'ueberwacht (active UND auto_sync)',
      1, (select count(*) from public.api_verbindungen
           where key='wordpress' and active is true and auto_sync is true)),

  (3, 'jede Quellspalte existiert in spiele',
      0, (select count(*) from public.api_verbindungen a
           cross join lateral jsonb_array_elements_text(
             (a.sync_felder->'spiel'->'quelle')
             || (a.sync_felder->'spiel'->'nicht_exportiert')) as f(feld)
           where a.key='wordpress'
             and not exists (select 1 from information_schema.columns c
                              where c.table_schema='public' and c.table_name='spiele'
                                and c.column_name=f.feld))),

  (4, 'keine Spalte zugleich exportiert und nicht',
      0, (select count(*) from public.api_verbindungen a
           cross join lateral jsonb_array_elements_text(a.sync_felder->'spiel'->'quelle') as f(feld)
           where a.key='wordpress'
             and f.feld in (select jsonb_array_elements_text(a.sync_felder->'spiel'->'nicht_exportiert')))),

  -- Der Verweis auf den FVRZ-Spielbericht haengt an dieser einen Spalte.
  -- Faellt sie aus der Liste, verliert jedes Spiel seinen Link — lautlos.
  (5, 'sfv_match_id wandert mit',
      1, (select count(*) from public.api_verbindungen
           where key='wordpress' and sync_felder->'spiel'->'quelle' @> '["sfv_match_id"]'::jsonb)),

  -- spiele.team ist ein Abbild, kein Schluessel (siehe _regel_team).
  (6, 'spiele.team wandert NICHT',
      0, (select count(*) from public.api_verbindungen
           where key='wordpress' and sync_felder->'spiel'->'quelle' @> '["team"]'::jsonb)),

  -- Die rohe SFV-Antwort darf den Verein nicht verlassen.
  (7, 'sfv_stand wandert NICHT',
      0, (select count(*) from public.api_verbindungen
           where key='wordpress' and sync_felder->'spiel'->'quelle' @> '["sfv_stand"]'::jsonb)),

  -- Status 12 ist das Veroeffentlichungsverbot des Verbands.
  (8, 'Status 12 NICHT freigegeben',
      0, (select count(*) from public.api_verbindungen
           where key='wordpress' and sync_felder->'spiel_status_export' @> '[12]'::jsonb)),

  -- Der Export darf team nie schreiben — sonst waere die Sichtbarkeit pro
  -- Mannschaft nicht mehr die Entscheidung des Vereins.
  (9, 'team.quelle ist leer',
      0, (select jsonb_array_length(sync_felder->'team'->'quelle')
            from public.api_verbindungen where key='wordpress')),

  (10, 'Ereignis-Allowlist hat 5 Typen',
      5, (select jsonb_array_length(sync_felder->'ereignis_typen')
            from public.api_verbindungen where key='wordpress')),

  -- ⚠ DIE UNBEQUEME. Sie zaehlt die Spalten von spiele, ueber die NIEMAND
  --   entschieden hat — weder „wandert" noch „wandert bewusst nicht".
  --
  --   Stand 05.09.2026 sind es genau diese elf, alle absichtlich:
  --     created_at, verein_id, zuletzt_synchronisiert, matchdaten_geholt_am
  --       — Buchhaltung des Sync, fuer die Website ohne Bedeutung
  --     sfv_saison_id, sfv_liga_id, sfv_gruppe_id, sfv_gegner_team_id,
  --     sfv_spiel_typ
  --       — Schluessel und Filter; der Klartext steht in liga, sfv_gruppe
  --         und wettbewerb und wandert dort
  --     team      — Abbild, siehe _regel_team und Pruefung 6
  --     sfv_stand — rohe Fremdantwort, siehe _regel_sfv_stand und Pruefung 7
  --
  --   ⚠ DIESE PRUEFUNG SOLL BRECHEN, WENN SPIELE EINE SPALTE BEKOMMT. Das
  --   ist ihr Zweck, nicht ihr Mangel: eine neue Spalte ist eine offene
  --   Frage („wandert die?"), und die faellt sonst niemandem auf. Wer sie
  --   beantwortet, traegt die Spalte in eine der Listen ein ODER erhoeht
  --   diese Zahl mitsamt der Aufzaehlung darueber.
  (11, 'unentschiedene Spalten in spiele',
      11, (select count(*) from information_schema.columns c
            where c.table_schema='public' and c.table_name='spiele'
              and c.column_name not in (
                select jsonb_array_elements_text(
                         (a.sync_felder->'spiel'->'quelle')
                         || (a.sync_felder->'spiel'->'nicht_exportiert'))
                  from public.api_verbindungen a where a.key='wordpress')))
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet         then 'ok'
            when nr = 2 and gefunden = 0     then 'offen (Etappe 6)'
            else '>>> PRUEFEN' end as status
  from p order by nr;

-- ERWARTET NACH ETAPPE 1: zehnmal 'ok', einmal 'offen (Etappe 6)' in Zeile 2.
-- ERWARTET NACH ETAPPE 6: elfmal 'ok'. Steht dort dann immer noch 'offen',
-- ist der Export nicht ueberwacht — unabhaengig davon, ob er laeuft.


-- ─── Probelauf ─────────────────────────────────────────────────────────────
-- Vor dem scharfen Einspielen: denselben Block mit rollback fahren und die
-- Verifikation dazwischen ansehen. Die Migration schreibt nur eine Zeile,
-- der Rollback nimmt sie restlos zurueck.
--
--   begin;
--     <insert von oben>
--     <verifikation von oben>
--   rollback;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- ⚠ Loescht die Protokolleintraege NICHT mit: api_sync_log.verbindung_id
--   zeigt auf diese Zeile. Erst die Eintraege ansehen, dann entscheiden.
--
--   select count(*) from public.api_sync_log
--    where verbindung_id = (select id from public.api_verbindungen where key='wordpress');
--
--   begin;
--     delete from public.api_verbindungen where key = 'wordpress';
--   commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   KEINE Strukturaenderung — schema.sql und database.types.ts bleiben
--   unberuehrt. Diese Migration schreibt eine Datenzeile, keine Spalte.
--
--   1) ⚠ DIE ADRESSE STEHT NICHT HIER. Sie kommt aus dem Secret
--      WP_BASIS_URL und wird in Etappe 2 gesetzt:
--
--        npx supabase secrets set WP_BASIS_URL=https://dev.fcherrliberg.ch/wp-json
--
--      Zuerst dev, spaeter Produktion — der Wechsel ist genau dieser eine
--      Befehl. Wohin der letzte Lauf TATSAECHLICH geschrieben hat, steht
--      danach in der Meldung, nicht in der Konfiguration:
--
--        select key, sync_status, left(sync_meldung, 120), letzter_sync
--          from public.api_verbindungen where key='wordpress';
--
--   2) ⚠ DER WAECHTER MELDET NICHTS, UND DAS IST DER OFFENE PUNKT.
--      Die Zeile steht auf active = false / auto_sync = false und ist damit
--      unueberwacht. Kein Alarm heisst hier NICHT „alles in Ordnung" — es
--      heisst „niemand sieht hin". Bis Etappe 6.
--
--      Der Zustand ist jederzeit abfragbar, und das ist der Ersatz fuer
--      einen Kommentar, den man vergisst:
--
--        select key, active, auto_sync, sync_status, letzter_sync
--          from public.api_verbindungen order by sort_order;
--
--      Erwartet bis Etappe 6: wordpress mit f | f | ausstehend | NULL.
--
--   3) ⚠ Etappe 6 (cron_wp_export.sql) ist damit KEIN Zusatz mehr, sondern
--      Bedingung. Sie schaltet active und auto_sync scharf UND legt den
--      Zeitplan an — in einer Datei, damit beides nicht auseinanderlaufen
--      kann — und bricht ab, wenn danach nicht beides true ist.
--
--      Wer diese Datei einspielt und dort nie ankommt, hat einen
--      bernsteinfarbenen Chip in der Kachel und einen Anschluss, den
--      niemand ueberwacht. Genau der Zustand, in dem die SFV-Zeile sechs
--      Tage stand — diesmal wenigstens mit Datum und Namen versehen.
--
--   4) Etappe 2 (Edge Function wp-export, Aktion `probe`) folgt als
--      naechstes.
-- ═══════════════════════════════════════════════════════════════════════════
