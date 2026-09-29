<?php
/* ═══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  ABSCHRIFT — NICHT DIE LAUFENDE DATEI, UND VON HIER GEHT NICHTS RAUS

   Die Wahrheit liegt im Theme-Repository:

       fch-theme/mu-plugins/wp-export-empfaenger.php

   Dort wird sie geaendert, dort wird sie ausgeliefert. Dieses Repository
   hat keinen Weg auf den Server: kein Deploy-Skript fasst `wordpress/`
   an, und `npm run deploy` kennt nur die vier Edge Functions.

   ── Wozu sie hier dann liegt ─────────────────────────────────────────

   Damit `npm run check:plugin` die Zusagen der Gegenstelle gegen unsere
   Nutzlast halten kann — 29 Regeln, die sonst nichts zu lesen haetten.
   Sie ist ein Pruefgegenstand, keine Quelle.

   ── ⚠ WAS DARAUS FOLGT, WENN SIE VERALTET ────────────────────────────

   Am 26.09.2026 stand hier 0.9.26, waehrend drueben 0.9.39 lief: zwoelf
   Fassungen Abstand. Unsere Kopie kannte die Route `/wappen` nicht, die
   unsere eigene Function aufruft — wer hier nachsah, um zu verstehen,
   was drueben passiert, las einen Stand von zwei Wochen zuvor.

   **Eine Abschrift, die niemand nachzieht, ist schlimmer als keine:**
   sie sieht aus wie eine Auskunft und ist eine Erinnerung.

   ── ⚠ BEIM NAECHSTEN ABGLEICH ────────────────────────────────────────

       cp <theme-repo>/mu-plugins/wp-export-empfaenger.php \
          wordpress/wp-export-empfaenger.php

   ⚠ **DIESER BLOCK GEHOERT NICHT ZUR QUELLE UND WIRD DABEI
   UEBERSCHRIEBEN.** Er ist danach von Hand wieder einzusetzen — sonst
   liest der Naechste den Satz gleich darunter („DIESE DATEI IST DER
   EMPFAENGER“), der im Theme-Repo stimmt und hier das Gegenteil sagt.

   Uebernommen am 26.09.2026 aus Commit b2c94ae, Fassung 0.9.39,
   byteweise (`cp`, mit `cmp` gegengeprueft). Ausser diesem Block ist
   die Datei Zeichen fuer Zeichen die des Theme-Repos.
   ═══════════════════════════════════════════════════════════════════ */
/**
 * ClubCampus-Abgleich — Empfaenger auf WordPress-Seite
 *
 * Plugin Name: ClubCampus Export
 * Description: Nimmt Spielplan, Verlauf und Ranglisten aus ClubCampus entgegen.
 * Version:     0.9.40
 *
 * ⚠ ⚠  STAND 10.09.2026: DIESE DATEI **IST** DER EMPFAENGER  ⚠ ⚠
 *
 *   Sie liegt auf dem Server unter `mu-plugins/wp-export-empfaenger.php`,
 *   also auf der obersten Ebene, die WordPress selbst laedt. Der
 *   Spiegel-Ordner `fch-core/src/Spiegel/` ist am 09.09.2026 GELOESCHT
 *   worden; einen zweiten Empfaenger gibt es nicht mehr.
 *
 *   ── ⚠ WAS HIER BIS ZUM 10.09.2026 STAND, WORTWOERTLICH ──────────────
 *
 *   > «STAND 08.09.2026: DIESE DATEI IST NICHT INSTALLIERT — auf dem
 *   > Server laeuft ein ANDERER Empfaenger: `fch-core` bringt unter
 *   > `src/Spiegel/clubcampus-export.php` eine eigene Fassung mit. …
 *   > BEIDE ZUGLEICH GEHEN NICHT. … Was aus dieser Datei drueben FEHLT
 *   > und uebergeben gehoert: `cc_stempel()` samt `_cc_lauf`, die Route
 *   > `/bestand`, und `get_post_time('c', true)` statt `post_date_gmt`.»
 *
 *   Am 08.09.2026 war das richtig. Am 09.09.2026 wurde diese Datei
 *   eingespielt und der Spiegel entfernt — **und der Satz blieb stehen.**
 *   Gemeldet vom Website-Chat am 10.09.2026: wer oben einsteigt, erfaehrt
 *   als Erstes, er habe die falsche Datei vor sich.
 *
 *   ⚠ **Ein Warnhinweis ist die Sorte Text, die am laengsten ueberlebt**:
 *   er sieht aus wie Sorgfalt, niemand loescht ihn leichthin, und je
 *   dringlicher er formuliert ist, desto weniger wird er angezweifelt.
 *   Die drei Uebergaben aus dem alten Text SIND uebergeben — sie stehen
 *   in dieser Datei und damit auf dem Server.
 *
 *   Woran man den Stand PRUEFT, statt diesem Kopf zu glauben:
 *
 *       (await wpExport('status')).empfaenger   // Dateiname
 *       (await wpExport('status')).version      // CC_VERSION
 *
 * ── WOHIN DIESE DATEI GEHOERT, FALLS SIE WIEDER GEBRAUCHT WIRD ──────────
 *   wp-content/mu-plugins/wp-export-empfaenger.php  —  OBERSTE EBENE,
 *   neben fch-core.php, NICHT darin.
 *
 *   ⚠ WordPress laedt aus mu-plugins/ nur Dateien der obersten Ebene. Was
 *   in einem Unterordner liegt, ist fuer WordPress unsichtbar; `fch-core`
 *   holt seine Bausteine mit require_once aus einer AUSDRUECKLICHEN Liste
 *   (`FCH_CORE_BAUSTEINE`), nicht per glob(). Eine Datei, die dort nicht
 *   eingetragen ist, wird nie geladen — und die Route antwortet 404, ohne
 *   dass etwas fehlschlaegt.
 *
 *   Als mu-plugin, nicht als gewoehnliches: mu-plugins lassen sich im
 *   Backend nicht abschalten. Ein Plugin, das jemand versehentlich
 *   deaktiviert, nimmt die Route mit — und der Abgleich bekaeme 404 statt
 *   einer Antwort, waehrend die Website unveraendert aussieht.
 *
 * ── WAS SIE TUT, UND WAS AUSDRUECKLICH NICHT ────────────────────────────
 *
 *   schreibt   fch_spiel: Kopfdaten und den Repeater `verlauf`
 *              die Ranglisten (eine Option, je Gruppe ein Eintrag)
 *
 *   am fch_team  NUR `liga`, `gruppe` und `abgleich_stand` — die eine
 *              ausdruecklich beschlossene Ausnahme (10.09.2026, Fassung
 *              0.4.0). Welche Felder das sind, sagt CC_TEAM_FELDER; die
 *              Pruefung `check-plugin` haelt es fest.
 *
 *              ⚠ HIER STAND BIS ZUM 10.09.2026 „NIE fch_team". Das war
 *              richtig bis 0.3.0 und danach falsch — gemeldet von der
 *              Website-Seite, nicht selbst bemerkt. Ein Kopf, der eine
 *              Zusage nennt, die der Code nicht mehr haelt, ist schlimmer
 *              als keiner: er wird geglaubt statt nachgesehen.
 *
 *   NIE        einen fch_team ANLEGEN oder LOESCHEN
 *              jedes andere Feld am fch_team — Rangliste, Trainer, Bilder
 *              fch_person        — Personen gehoeren der Redaktion
 *              `ereignisse`      — der redaktionelle Ablauf mit Personen
 *              `matchbericht`    — der Verweis auf den News-Beitrag
 *              den Beitragstitel — er wird abgeleitet, siehe unten
 *              LOESCHEN          — zurueckgezogen wird auf Entwurf
 *
 * ── DIE DREI ENTSCHEIDUNGEN, DIE MAN SPAETER NICHT MEHR SIEHT ───────────
 *
 *   1) update_field() statt update_post_meta().
 *      ACF legt je Repeaterzeile den Wert UND den Feldschluessel ab
 *      (`verlauf_0_minute` und `_verlauf_0_minute`), dazu die Zeilenzahl.
 *      Ueber Postmeta ist das nicht verlaesslich zu schreiben. Und das
 *      Theme liest fast ausschliesslich mit get_field() — 416 Fundstellen
 *      gegen 44 get_post_meta() (gemessen 05.09.2026).
 *
 *   2) Eigene Route statt der Kern-REST-API.
 *      `fch_spiel` steht auf `show_in_rest => false`, und das ist eine
 *      begruendete Entscheidung des Themes, keine Luecke — die REST-Ausgabe
 *      gaebe alle Felder an unangemeldete Leser. Eine eigene Route haengt
 *      nicht daran. `supports` nennt ausserdem kein `custom-fields`, die
 *      Kernroute koennte die Felder also ohnehin nicht ausgeben.
 *
 *   3) ⚠ Der Titel wird NACH dem Schreiben von fch-core abgeleitet, und
 *      zwar von uns angestossen. Die Ableitung haengt an `acf/save_post`
 *      (`Masken/spiel.php`, Haken `acf/save_post`) — und update_field()
 *      loest den Haken NICHT
 *      aus. Ohne diesen Anstoss haetten alle neuen Spiele einen leeren
 *      Titel. Wir rufen `fch_core_spiel_titel()` auf, statt die Regel ein
 *      zweites Mal zu schreiben: eine Quelle, nicht zwei.
 *
 * ── DAS BESITZMERKMAL: sfv_match_id ─────────────────────────────────────
 *
 * ⚠ EIN BEITRAG OHNE sfv_match_id WIRD NIE ANGEFASST. Nicht aktualisiert,
 *   nicht zurueckgezogen, nicht gezaehlt. Das sind die von Hand angelegten
 *   Freundschaftsspiele und Turniere, und sie gehoeren der Redaktion.
 *
 *   Das ist keine Vorsichtsmassnahme, sondern die Regel — und sie steht
 *   hier so ausdruecklich, weil sie sonst bei der naechsten Fassung
 *   wegfaellt: ein Abgleich, der „aufraeumt", raeumt genau diese Beitraege
 *   ab, und niemand meldet es. Die Pruefung dafuer steht in
 *   `cc_abgleich_kandidaten()` und ist die erste Bedingung, nicht die
 *   letzte.
 *
 *   Warum nicht `quelle`: das ist ein Etikett, das jemand aendern kann.
 *   `sfv_match_id` ist der Zeiger auf die Zeile in ClubCampus. Ein Filter
 *   auf ein Merkmal statt auf einen Namen.
 *
 * ── DIE FEHLERRICHTUNG ──────────────────────────────────────────────────
 *   Im Zweifel NICHT anfassen. Ein Beitrag, den der Abgleich faelschlich
 *   fuer fremd haelt, veraltet — aergerlich. Einer, den er faelschlich
 *   fuer seinen haelt, wird zurueckgezogen — Verlust.
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const CC_ROUTE      = 'clubcampus/v1';
/* ⚠ MUSS MIT DEM KOPF DIESER DATEI UEBEREINSTIMMEN (Version: oben). Sie
   steht in der Antwort von /status und ist die einzige Moeglichkeit, von
   aussen zwei Empfaenger mit demselben Dateinamen zu unterscheiden — der
   Fall, der am 09.09.2026 einen ganzen Anlauf gekostet hat.

   ⚠ **WER DIESE DATEI INHALTLICH AENDERT, ERHOEHT SIE.** Sonst meldet
   `/status` fuer zwei verschiedene Fassungen dieselbe Zahl, und die eine
   Auskunft, die „laeuft drueben der neue Empfaenger?" beantworten koennte,
   beantwortet sie nicht mehr.

   0.9.40 (29.09.2026): `ereignis_subtyp` im Repeater `verlauf` — der
   Subtyp des Verbands als Klartext («Kopftor», «Freistosstor»,
   «Notbremse», «2. Verwarnung»). Nutzlast-Fassung 8.
   ⚠ ANLASS: das Theme bildet eigene Verlaufszeilen jetzt aus den FELDERN
      (Namensregel je Team, «Vorname N.» bei Junioren). Damit faellt `text`
      als Anzeige weg — und mit ihm die Zusaetze, die NUR dort standen.
   ⚠ ⚠  NICHT IN `ereignis_zusatz`, OBWOHL DER AUFTRAG DAS WOLLTE. Zwei
      gemessene Gruende: `f_s_v_zusatz` ist ein `select` mit zwei Optionen
      und verwirft alles andere WORTLOS (der `ein_nummer`-Fall) — und die
      zwei Optionen heissen im Klartext des Verbands `Eigentor` und
      `Penalty`. Ein Durchreichen traefe also genau das Feld, an dem die
      Spielseite den Zwischenstand auf die andere Mannschaft dreht.
   ⚠ ⚠  DAS ACF-UNTERFELD MUSS DRUEBEN ANGELEGT WERDEN (`f_s_v_subtyp`,
      Typ `text`, in `fch-core/src/Fields/spiel.php`) — beide Haelften,
      sonst verwirft `update_field()` den Wert wortlos. Bis dahin meldet
      `unterfelder_ohne_acf` genau diesen Namen, und
      `unterfelder_geprueft["verlauf"]` steht auf 13:13:12 statt 13:13:13.
      **Der Ausfall ist damit sichtbar und nicht still** — aber er ist
      einer.
   ⚠ NICHT jeder Subtyp geht hinaus. Die Liste des Verbands hat 100
      Eintraege und ist ein gemeinsamer Vorrat ueber alle 30
      Ereignistypen; 50–72 sind Abwesenheitsgruende (`Verletzt`, `Krank`,
      `Gesperrt`, `Militaer`). Die Grenze liegt auf UNSERER Seite
      (`ZUSATZ_TYPEN`: Tor, Verwarnung, Ausschluss) — hier kommt nur an,
      was sie durchlaesst.
   ⚠ `text` bleibt unveraendert. Die Spielseite liest das Wort «Eigentor»
      daraus, solange dieses Feld nicht bestaetigt ankommt; wer den Zusatz
      vorher aus dem Text nimmt, verschiebt den Stand um zwei Tore.

   0.9.39 (26.09.2026): unveraenderte Spiele werden nicht neu geschrieben.
   ⚠ ANLASS, gemessen mit 0.9.38: `laufzeit_ms` 14–19 s je Mannschaft,
      rund 1,6 s je Spiel — und **alle 63 Spiele meldeten
      «aktualisiert», obwohl sich nichts geaendert hatte.** Ein Lauf
      schaffte so 6 von 21 Mannschaften.
   ⚠ NEU AN DER NUTZLAST: nichts. Der Empfaenger entscheidet allein aus
      dem, was ohnehin geliefert wird.
   ⚠ NEUES META: `_cc_pruefsumme` (Konstante CC_META_PRUEFSUMME) —
      sha256 ueber die GELIEFERTEN Daten des Spiels plus CC_VERSION.
      Maps werden vor dem Serialisieren rekursiv nach Schluessel
      sortiert, Listen (`verlauf`, Aufstellung) NICHT — dort ist die
      Reihenfolge Inhalt. Dass CC_VERSION eingeht, ist Absicht: Jede
      neue Empfaengerfassung schreibt jedes Spiel einmal neu.
   ⚠ NEUER ZAEHLER: `unveraendert`, in der Antwort und im Bericht.
      **`aktualisiert` zaehlt ab jetzt nur noch wirklich geschriebene
      Spiele** — ein Rueckgang dieser Zahl ist der Erfolg und kein
      Verlust. Dasselbe gilt fuer `verlauf_zeilen` und
      `aufstellung_zeilen`.
   ⚠ Ein uebersprungenes Spiel gilt weiterhin als GELIEFERT. Stuende
      `$geliefert[ $mid ] = true;` hinter dem Sparschalter, zoege der
      Rueckzug genau die Spiele zurueck, die man gerade gespart hat.
   ⚠ Ein zurueckgezogener Beitrag wird bei gleicher Pruefsumme wieder
      VEROEFFENTLICHT — sonst schriebe die Ersparnis den Rueckzug fest.
   ⚠ Der Laufstempel `cc_stempel()` laeuft auf JEDEM Weg weiter. Ohne
      ihn saehe ein unveraendertes Spiel aus wie eines, das gar nicht
      geliefert wurde.

   0.9.38 (26.09.2026): der Rueckzug sieht nur noch die gelieferte
   Mannschaft an, und JEDE Antwort nennt ihre Laufzeit.
   ⚠ ANLASS: sieben Mannschaften brauchten rund 90 s bei einem Zeitlimit
      von 150 s. Die Rueckzugsschleife lief ueber ALLE Beitraege mit
      `sfv_match_id` — im Pruefstapel 271 — und rief fuer jeden
      `get_field( 'fch_team', … )`. Gemessen am 26.09.2026 bei einer
      Lieferung fuer EINE Mannschaft: 268 Aufrufe, 48 ms; mit der
      Vorauswahl 0 Aufrufe und 2 ms. Die Kriterien darunter sind
      unveraendert — die Abfrage entscheidet nichts, sie verkleinert nur
      die Menge.
   ⚠ Die Vorauswahl sucht BEIDE Formen, in denen `fch_team` im Postmeta
      stehen kann: die nackte Id (`post_object`) und die serialisierte
      Liste (`relationship`). Eine Abfrage mit `IN` auf die nackte Id
      uebersieht die zweite — gemessen am selben Tag: 7 Treffer statt 8,
      und der fehlende Beitrag waere NIE zurueckgezogen worden, stumm,
      mit einer Antwort, die Erfolg meldet. Dieselbe Klasse wie der
      Fehler von 0.9.31.
   ⚠ `laufzeit_ms` steht neu in jeder Antwort des Namensraums, auch in
      Fehlerantworten — bisher gab es die Zahl nur im Abbruchbericht,
      also genau dann, wenn es zu spaet war. Einheit im Namen, weil das
      Feld `laufzeit` des Abbruchberichts SEKUNDEN fuehrt.

   0.9.37 (24.09.2026): `rolle` im Repeater `verlauf` — der Rollenvermerk
   des Verbands als eigenes Feld statt als Wort im Satz. Nutzlast-Fassung 6.
   ⚠  Ohne den Namen in CC_VERLAUF_FELDER faellt der Wert an der EIGENEN
      Allowlist weg, eine Stufe VOR ACF: `cc_schreibe_verlauf()` baut jede
      Zeile aus dieser Liste. `unbeachtete_unterfelder` meldete dann
      `verlauf.rolle`, und `unterfelder_geprueft["verlauf"]` stand auf
      12:11:11. Mit dem Namen hier und dem Unterfeld drueben sind es 12:12:12.
   ⚠  Das ACF-Unterfeld ist am selben Tag angelegt (`f_s_v_rolle`,
      `fch-core/src/Fields/spiel.php`) — beide Haelften, sonst verwirft
      `update_field()` den Wert wortlos, und `unterfelder_ohne_acf` meldet es.
      Genau der `ein_nummer`-Fall.
   ⚠  Der Name `rolle` gibt es zweimal: `aufstellung.rolle` (`f_s_a_rolle`)
      fuehrt `start`/`eingewechselt`/`nicht_eingesetzt`. Als UNTERFELD ist das
      keine Falle — `update_field('verlauf', …)` ordnet die Schluessel diesem
      Wiederholer zu —, aber fuer einen Menschen, der beide Listen liest,
      schon. Beide tragen `text`.
   ⚠  Die Website gibt das Feld HEUTE NICHT aus: `text` traegt die Rolle
      bereits mit («Trainer/in Hans Meier»), und ein zweites Mal waere sie
      doppelt. Der Wert wird gespeichert, damit `text` spaeter schrumpfen
      kann, ohne dass die Angabe verschwindet.

   0.9.36 (23.09.2026): ein ZWEITER Durchlauf fuer weisse Wappen auf
   durchsichtigem Grund. Findet der erste keinen Inhaltspunkt, zaehlt der
   zweite nur noch die Durchsichtigkeit: **was nicht durchsichtig ist, ist
   Inhalt.**
   ⚠  ANLASS ist ein Befund aus 0.9.35, gemeldet und damals ausdruecklich
      NICHT gebaut, weil er die Semantik aendert — Didis Entscheid vom
      selben Tag hat ihn dann bestellt. **Ein weisser Schriftzug auf
      durchsichtigem Grund hat nach der Regel des ersten Durchlaufs keinen
      einzigen Inhaltspunkt**: jeder seiner Punkte ist weiss, also «leer».
      Er ging unbeschnitten zurueck — und das war ausgerechnet die Datei,
      die den Beschnitt am noetigsten hatte.
   ⚠  **Die zweite Regel ist die zweite Wahl und nicht die bessere.** Sie
      kann einen weissen Grund nicht von weisser Schrift unterscheiden; auf
      einem Bild OHNE Durchsichtigkeit haelt sie alles fuer Inhalt und
      schneidet nichts. Genau darum laeuft sie NUR, wenn der erste
      Durchlauf leer ausgeht, und nicht als Ersatz. Ein ganz weisses Bild
      ohne Alphakanal kommt darueber unveraendert zurueck — richtig, denn
      dort ist nichts zu unterscheiden.
   ⚠  **Zwei Schleifen und kein Schalter im Rumpf der ersten.** Der Vermerk
      an Schritt 6 ist gemessen: ein Funktionsruf je Bildpunkt kostet bei
      512px rund 5 ms von 20. Ein Test je Bildpunkt waere billiger, liefe
      aber auf JEDEM Bild mit, um einem seltenen Fall zu dienen.
   ⚠  **`grund` hat damit zwei Bedeutungen bekommen, und `weg` trennt sie.**
      Bisher hiess ein gefuellter `grund` immer «wir wollten und konnten
      nicht». Jetzt gibt es einen Erfolg, der erklaert gehoert. Gelesen
      wird das Paar (`beschnitten`, `grund`); `weg` sagt dasselbe
      maschinenlesbar: 0 kein Inhalt, 1 erster Durchlauf, 2 zweiter.
      In der Antwort der Route steht `beschnitt_weg` NUR beim zweiten Weg.
   ⚠  Der Text in `grund` wird erst gesetzt, wenn wirklich geschnitten
      wird. Stuende er frueher, traege das ganz weisse Bild — das ueber den
      zweiten Weg laeuft und dort nichts wegzuschneiden findet — einen
      gefuellten `grund` bei `beschnitten === false`, und das liest sich
      als Fehlschlag.

   0.9.35 (23.09.2026): beim ANNEHMEN faellt der leere Rand weg. Die
   abgelegte Datei ist das beschnittene Bild — die Pruefsumme bleibt die
   der Lieferung.
   ⚠  ANLASS ist ein optischer, und er ist Didis: Viele Logodateien tragen
      rundum weissen oder durchsichtigen Rand. Die Anzeige setzt jedes
      Wappen in denselben Kreis; das eigentliche Wappen sitzt darin dann
      klein, und **zwei Wappen nebeneinander wirken ungleich gross, obwohl
      beide Dateien dieselbe Kantenlaenge haben.** Der Rand ist eine
      Eigenschaft der DATEI und keine des Wappens.
   ⚠  Die Regel ist ein umschliessendes Rechteck ueber alle Bildpunkte, die
      weder nahezu weiss noch nahezu durchsichtig sind. **Sie erfuellt
      Didis zwei Bedingungen von selbst und ohne Fuellalgorithmus:** Der
      Inhalt kann per Konstruktion nicht angeschnitten werden (das Rechteck
      IST die Huelle aller Inhaltspunkte), und Weiss innerhalb des Wappens
      liegt darin und bleibt darum unberuehrt. Ausfuehrlich begruendet an
      `cc_wappen_beschnitt()`, samt der Stelle, an der ein spaeterer
      Flood-Fill nichts verbessern wuerde.
   ⚠ ⚠ **GD und nicht Imagick**, obwohl beide im Container stehen (gemessen:
      GD bundled 2.1.0, ImageMagick 7.1.1-43 mit `trimImage`). GD ist
      gebuendelt und dieser Weg benutzt es schon; was auf dem ENTWICKLUNGS-
      Container steht, sagt ueber den Server nichts. Und
      `Imagick::trimImage()` haette die falsche Semantik: Es beschneidet
      gegen die ECKFARBE mit Unschaerfe, nicht gegen «weiss ODER
      durchsichtig» — eine Datei mit durchsichtiger Ecke und weissem Rand
      traefe es nur halb, und zwar ohne dass es auffiele.
   ⚠ ⚠ **`imagecrop()` ZERSTOERT ein Palettenbild mit durchsichtigem Index**
      — gemessen an einem GIF mit drei Farben: danach `transidx=-1,
      farben=1`, und die Ecke, die durchsichtiges Weiss war, liest sich als
      deckendes Rot. Palettenbilder gehen darum ueber `imagecreate()` +
      `imagecopy()` mit dem durchsichtigen Ton vorab als Index 0. **Der
      naheliegende Ausweg waere der falsche gewesen:**
      `imagepalettetotruecolor()` uebertraegt die Durchsichtigkeit zwar
      richtig, aber `imagegif()` flacht Alpha beim Zurueckschreiben auf
      SCHWARZ (`rgb=4,2,4` gemessen). Unser eigenes Wappen ist ein GIF.
   ⚠  Die Schwellen sind eng und das ist begruendet: **Die zwei Fehler sind
      nicht gleich teuer.** Zu locker heisst, blasse Inhaltspunkte fuer Rand
      zu halten und genau das wegzuschneiden, was geschuetzt gehoert; zu
      streng heisst, einen Saum stehen zu lassen, den niemand sieht.
      Gemessen an einem 200px-Bild mit 60px Rand (wahr ist `[60,60,140,140]`):
      PNG und GIF zeichengenau, WebP q92 vier Punkte Saum, JPEG q92 zwoelf.
      **Der JPEG-Saum ist der bezahlte Preis und kein Versehen.**
   ⚠  `CC_WAPPEN_PUNKTE` (2048x2048) bremst die Flaeche und **wiederholt
      CC_WAPPEN_BYTES nicht**: Ein weisses GIF von 2000x2000 wiegt gemessen
      10 288 Bytes und kaeme glatt durch die 512 KiB. Geprueft wird am
      DATEIKOPF, vor dem Dekodieren — eine Grenze, die erst nach
      `imagecreatefromstring()` greift, hat den Speicher schon ausgegeben,
      gegen den sie schuetzen soll.
   ⚠ ⚠ **DIE PRUEFSUMME BLEIBT DIE DER LIEFERUNG**, genau wie beim
      Standbild. Sie quittiert den EMPFANG und nicht das Ergebnis. Stuende
      dort die Summe der beschnittenen Datei, faende der Zweig
      `unveraendert` nie wieder eine Uebereinstimmung — ClubCampus schickte
      jedes Wappen bei jedem Lauf neu, der Anhang wuerde jedes Mal ersetzt,
      **und nichts davon saehe nach einem Fehler aus.** Gemessen: derselbe
      Bestand ein zweites Mal geschickt ergibt `unveraendert`, derselbe
      Anhang.
   ⚠  **Die Antwort sagt es**, wie beim Standbild: `beschnitt` («200x200 →
      81x81») steht da, wenn geschnitten wurde, `beschnitt_grund`, wenn es
      versucht wurde und nicht ging. Fehlen beide, war nichts wegzuschneiden.
      `bytes` und `sha256` daneben beschreiben weiterhin die LIEFERUNG.
   ⚠  Reihenfolge **Standbild → Beschnitt**, und das ist keine Laune: GD
      liest aus einem animierten GIF nur das erste Bild. Andersherum machte
      der Beschnitt aus der Lieferung stillschweigend ein Standbild, und
      `standbild` meldete trotzdem 0. `cc_wappen_beschnitt()` weigert sich
      bei einem animierten GIF ausserdem von sich aus — **fuer jeden
      anderen Aufrufer**, der ihr eine beliebige abgelegte Datei reicht.
   ⚠  `cc_wappen_mangel()` urteilt deswegen NICHT anders — gemessen und
      nicht vermutet: Es prueft Beitrag, Anhangstyp, hinterlegten Pfad,
      Dasein auf der Platte und gesetzte Summe. Keines davon beruehrt der
      Beschnitt; nach dem Lauf meldet es leer.
   ⚠  Jeder Fehlweg endet in «Original zurueck», und `$masse` traegt dabei
      **immer die wahren Kantenlaengen** — ~~die frueheren Rueckkehrpfade
      standen vor der Messung~~ (Stand 23.09.2026, noch am selben Tag
      abgeloest, gemeldet von der Seite der Einmal-Routine: ein animiertes
      GIF von 160x160 kam mit `breite=0` zurueck). **`0x0` liest sich wie
      ein kaputtes Bild und nicht wie «nicht beschnitten, und hier ist der
      Grund».** Wo die Groesse wirklich nicht zu ermitteln war, steht die 0
      heute zusammen mit einem Grund, der das sagt.
   ⚠  Gegenprobe in `pruef/wappenempfang.py`, B1 bis B6 — **und der
      Nachweis «kein Inhalt verloren» ist eine ZAHL**: gezaehlt werden die
      Inhaltspunkte vorher und nachher, nicht die Kantenlaengen. 200x200 →
      80x80 und 200x200 → 81x81 sehen beide nach «kleiner geworden» aus.
      Gemessen: B1 weisser Rand 200x200 → 81x81 (Inhalt 5089 → 5089),
      B2 randlos 200x200 → 200x200 und Byte fuer Byte derselbe String,
      B3 weisse Insel innen 200x200 → 80x80 (Inhalt 4800 → 4800, die Insel
      von 1600 Punkten ueberlebt vollstaendig), B4 durchsichtiger Rand
      200x200 → 81x81 (durchsichtig 34911 → 1472), B5 dasselbe als GIF,
      B6 der Einbau. Zwei neue Mutanten (E6 schneidet eine Spalte zu eng,
      E7 kodiert auch randlos neu) — **7 von 7 gemeldet, Referenzlauf 0.**
      Laufzeit fuer ein 512px-Wappen im Lauf gemessen: 32 ms.

   0.9.34 (23.09.2026): drei Map-Schluessel bleiben auch leer ein Objekt.
   ⚠  `spiele.aufstellung_je_spiel`, `spiele.unterfelder_geprueft` und
      `status.feld_mehrdeutig` sind **ueber einen NAMEN indiziert** — eine
      Spiel-Id, ein Repeatername, ein Feldname. Gefuellt waren sie darum
      `{…}`, leer aber `[]`, weil `json_encode()` ein leeres Array als Liste
      schreibt. **Ein Leser, der `for k, v in x.items()` schreibt, bricht am
      leeren Lauf** — und zwar nur dann, also genau beim ersten stillen Tag.
   ⚠  `cc_als_objekt()` steht mit Absicht direkt ueber `cc_verlust_bericht()`:
      Dort wird eine Map zur LISTE umgebaut, hier bleibt sie Map. **Die zwei
      entgegengesetzten Entscheide stehen nebeneinander**, damit niemand den
      einen fuer den ganzen Fall haelt. Der tragende Satz ist derselbe: Ein
      Schluessel, dessen Typ sich mit dem Inhalt aendert, ist beim Auswerten
      teurer als ein paar Zeichen mehr.
   ⚠  **`(object)` und nicht `JSON_FORCE_OBJECT`.** Das Flag gilt fuer die
      GANZE Antwort: Aus `"fehler":[]` wuerde `{}`, aus `beitraege` eine Map
      mit Zaehlnummern als Schluesseln. Ein Flaechenbrand fuer drei
      Schluessel. `(object)` fasst nur die oberste Ebene — die Listen INNEN
      bleiben Listen, gemessen an
      `"feld_mehrdeutig":{"liga":["text:f_tm_liga","text:f_s_liga"]}`.
   ⚠  Der Wurf `(array)` davor bleibt: `(object) 'x'` ergaebe
      `{"scalar":"x"}` — eine Form, die wie ein Feldname aussieht. Ueber
      `(array)` wird `{"0":"x"}` daraus: **sichtbar falsch statt still
      plausibel.**
   ⚠  **Der gefuellte Fall ist Zeichen fuer Zeichen unveraendert** — 12 von
      16 verglichenen Antworttexten byteweise gleich, und die vier
      Unterschiede sind genau die vier leeren Faelle.
   ⚠  Danach alle **58 Containerpfade** noch einmal durchgesehen, diesmal auf
      den Typ: **0 kippen noch** (vorher 3). Die 23, die in keinem Lauf
      gefuellt waren und am JSON darum nicht zu entscheiden sind, einzeln im
      Code gelesen — alle gegen das Kippen geschuetzt.
   ⚠  Gemeldet und NICHT gebaut: Zwei Schluessel wechseln zwischen `null` und
      Container (`status.letzter_bericht`, `status.unterfelder.*`). Andere
      Klasse — ein Leser unterscheidet `null` von beidem, und «nicht
      feststellbar ist KEINE leere Liste» steht dort schon als Begruendung.

   0.9.33 (23.09.2026): `bestand.wappen` ist eine LISTE. Vorher war es ein
   Objekt — und darum ist der erste echte Wappenlauf ins Leere gelaufen.
   ⚠⚠ **Der Befund kam von drueben, nicht von hier.** ClubCampus meldete:
      «Die Gegenstelle meldet unter «wappen» keine Liste.» `bestand_lage`
      unlesbar, 0 Eintraege empfangen. Erwartet wird
      `"wappen": [ { "sfv_team_id": "39010", "sha256": "…" } ]`; geliefert
      wurde der Zaehlerblock von `cc_wappen_lage()`, in dem die Liste eine
      Ebene tiefer unter `teams` steckte.
   ⚠  **Der Fehler steht seit 0.9.29 und hat sich vier Fassungen lang nicht
      gemeldet.** Nichts schlug fehl: Die Route antwortete mit 200, die
      Zeilen trugen die richtigen Felder, alle Pruefstaende waren gruen.
      Sie lasen den INHALT der Zeilen und nie die Klammer davor.

      > **Eine Pruefung, die `is_array()` fragt, sieht diesen Fehler nie.**
      > In PHP ist beides ein Array; der Unterschied entsteht erst im
      > `json_encode`, und nur dort ist er messbar.

      Der neue Pruefpunkt in `pruef/wappenempfang.py` misst darum das erste
      Zeichen des erzeugten JSON-Textes.
   ⚠  **Kein Zaehler ist verlorengegangen, kein Zeilenfeld umbenannt.** Die
      sechs Zahlen stehen im Geschwisterschluessel `wappen_lage`
      (`teams_gesamt`, `teams_ohne_sfv_id`, `mit_wappen`, `ohne_wappen`,
      `wappen_verloren`, `ohne_team`). Sie gehoeren nicht in die Liste:
      `teams_ohne_sfv_id` zaehlt Teams, die in KEINER Zeile vorkommen — eine
      Zahl ueber Abwesende hat in keiner Zeile Platz.
   ⚠  `cc_wappen_lage()` selbst ist unveraendert; sie hat weitere Leser. Die
      Aufteilung geschieht in `cc_route_bestand()`.
   ⚠  **Leer ist `[]` und nicht `{}`** — und das ist nicht von selbst so:
      Ein Array mit Luecken in den Schluesseln wird beim `json_encode` still
      zum Objekt (`array( 0 => …, 2 => … )` → `{"0":…,"2":…}`). Heute
      entstehen hier keine Luecken; `array_values()` steht trotzdem da,
      **weil die naechste Filterzeile sie erzeugt und niemand es merkt.**
   ⚠  ~~«Gemeldet und NICHT gebaut: Drei Schluessel kippen ihren JSON-Typ
      mit dem Inhalt — leer `[]`, gefuellt `{}`.»~~ — Stand 23.09.2026,
      **noch am selben Tag entschieden und gebaut, siehe 0.9.34.** Der Satz
      bleibt stehen, weil er die Reihenfolge belegt: erst gemeldet, dann
      entschieden, dann gebaut.

   0.9.32 (23.09.2026): ein animiertes Wappen wird ruhig gestellt, nicht
   abgelehnt.
   ⚠  **Didis Bedingung zuerst: das Wappen soll erscheinen, nur ruhig.**
      Ein zappelndes Wappen in Spielplanzeile und Rangliste ist unruhig —
      aber ablehnen hiesse, dass gar keines erscheint. Ein animiertes GIF
      wird darum beim ANNEHMEN auf sein erstes Bild zurueckgefuehrt.
   ⚠⚠ **Hier stand bis heute, das sei an der ANZEIGE zu entscheiden und
      nicht an der Allowlist** (0.9.31, 23.09.2026). Der Satz war falsch,
      und zwar nicht knapp: **Die Anzeige kann es gar nicht.** Gemessen im
      wp-Container —
      `make_subsize( 64x64 )` auf eine 64px-Quelle: `image_subsize_create_error`
      («hat bereits die Groesse»); `make_subsize( 96x96, ohne Beschnitt )`:
      `error_getting_dimensions`; `image_resize_dimensions( 64,64,96,96,false )`:
      `false`. **WordPress legt weder eine Zwischengroesse in Originalgroesse
      an noch vergroessert es.** Der Weg ueber die Anzeige haette einen
      Filter gebraucht, der ein 64er Wappen auf 96 aufblaest — Schaerfe
      weggeworfen fuer Ruhe, und ein Filter, der jedes Bild der Website
      sieht.
   ⚠  `cc_gif_bilder()` zaehlt die Bilder **ohne Imagick und ohne GD**,
      direkt an den Bytes. Die Entscheidung «anfassen ja/nein» faellt damit
      auf jedem Server gleich aus — anders als die Umrechnung selbst, die
      nimmt, was da ist (Imagick, sonst GD). Gegen `getNumberImages()`
      geprueft: 8 von 8 gleich.
   ⚠  **Jeder Fehlweg gibt die Original-Bytes zurueck.** Ein Server ohne
      Bildbibliothek legt das animierte GIF ab, statt das Wappen zu
      verlieren. Ruhe ist der Wunsch, Erscheinen ist die Bedingung.
   ⚠⚠ **`sha256` bleibt die Summe der LIEFERUNG, nicht der abgelegten
      Datei.** Das ist die Falle an diesem Umbau, und sie ist geprueft:
      Wuerde die Summe nachgerechnet, passte sie nie mehr zu dem, was
      ClubCampus geschickt hat — der Zweig `unveraendert` traefe nicht
      mehr, **die Gegenstelle schickte jedes animierte Wappen bei jedem
      Lauf neu und bekaeme brav `ersetzt` zurueck.** Gemessen: zweite
      Lieferung desselben animierten GIF ergibt `unveraendert`.
   ⚠  Neues Antwortfeld `standbild` je Urteil (die Zahl der Bilder, die das
      gelieferte GIF trug; fehlt, wenn nichts umgerechnet wurde). **Die
      abgelegte Datei ist dann nicht die gelieferte, und das soll sichtbar
      sein** statt stillschweigend zu geschehen.
   ⚠  PNG, WebP, JPEG und einbildriges GIF gehen **Byte fuer Byte**
      unveraendert durch — nicht «gleich gross», sondern derselbe String.

   0.9.31 (23.09.2026): GIF gehoert dazu, und eine Pruefsumme darf nie
   ohne ihren Anhang dastehen.
   ⚠  **`image/gif` ist neu erlaubt** (CC_WAPPEN_MIME). Der Grund ist
      nicht Vollstaendigkeit, sondern Bedarf: Der Verband liefert GIF,
      und unser eigenes Wappen ist eines. Die Aufnahme kostet nichts —
      WordPress fuehrt `gif` von Haus aus (nachgemessen: 98 Typen, `gif`
      darunter). **SVG bleibt abgelehnt**, und die Begruendung dafuer
      haengt nicht an der Laenge der Liste, sondern an ausfuehrbarem
      Markup aus fremder Herkunft.
   ⚠  **Der Fund schlaegt weiterhin die Angabe.** Ein PNG, das als
      `image/gif` angekuendigt wird, ist abgelehnt — gemessen. Und die
      Grenze von 512 KiB gilt fuer GIF wie fuer alles andere.
   ⚠  **Die Fehlermeldung liest jetzt aus der Konstante**
      (`implode(', ', array_keys(CC_WAPPEN_MIME))`) statt eine Liste von
      Hand zu fuehren. Der handgeschriebene Satz «bitte PNG oder WebP
      schicken» war nach einer Zeile Aenderung falsch, und niemand haette
      es gemerkt — die Gegenstelle liest ihn, nicht wir.
   ⚠  ~~«**Offen fuer Didi, gemeldet und nicht gebaut:** Ein animiertes
      GIF wird angenommen. … **Ein animiertes Wappen unter 96px laeuft
      also auf der Seite.** Das ist an der ANZEIGE zu entscheiden, nicht
      an der Allowlist.»~~ — Stand 23.09.2026, **entschieden und
      gebaut:** Ein animiertes GIF wird beim ANNEHMEN auf sein erstes Bild
      zurueckgefuehrt (`cc_wappen_standbild()`), und die Anzeige bekommt
      ein stilles Bild in voller Kantenlaenge. Die Anzeige selbst kam
      nicht in Frage — WordPress legt keine Zwischengroesse in der
      Originalgroesse an und vergroessert nicht; beide Wege sind dort
      gemessen zu. **Die Pruefsumme bleibt die der Lieferung**, sonst
      faende `unveraendert` nie wieder eine Uebereinstimmung. Neu in der
      Antwort: `standbild` je Urteil, damit die Gegenstelle erfaehrt, dass
      die abgelegte Datei nicht die gelieferte ist.

   ⚠⚠ **`bestand` meldet eine Pruefsumme nur noch mit tragendem
      Anhang.** Bisher las `cc_wappen_lage()` die Summe aus dem Postmeta
      und fragte nicht, ob das Bild noch daliegt. **Fehlt die Datei im
      Uploads-Ordner** — von Hand geloescht, Serverumzug, halbe
      Uebertragung —, dann meldete der Bestand weiter ihre Summe,
      ClubCampus sah «ist schon da» und schickte nie wieder, und die
      Seite zeigte stumm den Platzhalter. **Nichts schlug fehl.** Genau
      das ist die gefaehrlichste Sorte Fehler.
      Neu entscheidet `cc_wappen_mangel()` an EINER Stelle, ob ein Anhang
      traegt: Beitrag da, Anhang, Datei hinterlegt, Datei auf der Platte,
      Summe gesetzt.
   ⚠  **Zwei neue Auskuenfte, und sie sind ein Vertrag:** je Teamzeile
      `mangel` (Text, leer = in Ordnung) und oben `wappen_verloren`.
      **«Nie geliefert» und «geliefert, aber verloren» saehen sonst
      gleich aus** — das zweite ist ein Befund, dem jemand nachgeht. Wer
      `mangel` nicht kennt, sieht eine leere `sha256` und schickt nach;
      das ist gewollt. Bestehende Felder behalten Name und Bedeutung.
   ⚠  Der Zweig `unveraendert` verlangt jetzt zusaetzlich einen
      tragenden Anhang. Ohne das waere die Selbstheilung an der zweiten
      Tuer gescheitert: Die Gegenstelle haette nachgeliefert und ein
      «unveraendert» zurueckbekommen.
   ⚠⚠ **Und genau dabei kam ein zweiter Fehler zum Vorschein, der
      sich selbst versteckte.** Die erste Heilung meldete `ersetzt` — und
      die Datei fehlte danach weiter. Grund: `wp_unique_filename()` haengt
      nur dann `-1` an, wenn die Datei daliegt. Fehlt sie, bekommt das
      NEUE Bild denselben Pfad, und `wp_delete_attachment( $alt, true )`
      loescht exakt die eben geschriebenen Dateien. **Die Heilung hob sich
      still selbst auf, beliebig oft.** Der Ersetzen-Zweig schuetzt die
      Pfade des neuen Anhangs jetzt ausdruecklich.
   ⚠  **Die Pruefsumme wird ZULETZT geschrieben.** Ihre Anwesenheit ist
      damit die Quittung dafuer, dass alles davor gelungen ist — die
      Team-Nummer bleibt vorne, sie ist die Besitzmarke. Bricht der Lauf
      mittendrin ab (Zeitueberschreitung, Speicher, fataler Fehler),
      raeumt `register_shutdown_function()` Anhang UND Datei weg. Vorher
      blieb eine Waise im Uploads-Ordner liegen, die niemand mehr
      zuordnen konnte.

   0.9.30 (23.09.2026): zwei FREIWILLIGE Felder fuer die Wappen der
   Gegner und der Ranglistenzeilen.
   ⚠  `sfv_gegner_team_id` am fch_spiel (Schluessel `f_s_gtid`) steht neu
      in CC_FELDER. Damit bekommt die Gegnerhaelfte der Spielseite zum
      ersten Mal eine Nummer — bis heute fuehrte das Spiel den Gegner
      allein als TEXT, und aus einem Klubnamen eine Nummer zu erraten
      waere das Zurueckparsen, das neunmal gutgeht.
   ⚠  **`sfv_team_id` je Ranglistenzeile braucht hier NICHTS.** Der
      Ranglisten-Weg legt die Gruppenobjekte UNVERAENDERT in die Option
      CC_OPT_RANG (`$alle[ $id ] = $g;`) — ein neuer Schluessel in der
      Zeile kommt also von selbst an und wird von selbst gelesen. Nur die
      HANDGEPFLEGTE Rueckfallquelle, der Wiederholer `rangliste` am
      Team-Beitrag, brauchte ein Feld dafuer (`f_t_r_tid`, gebaut in
      `Fields/team.php`); der Empfaenger schreibt es nie.
      **Wer hier eine Schreibstelle sucht und keine findet, hat nichts
      uebersehen.**
   ⚠  FREIWILLIG heisst zweierlei, und das zweite ist die Falle: Ein
      fehlendes Feld lehnt keinen Eintrag ab UND leert keinen
      bestehenden Wert. Beides traegt `cc_schreibe_felder()` schon —
      `array_key_exists()` ueberspringt, was die Nutzlast nicht fuehrt.
      **Weggelassen ist nicht leer:** kommt das Feld leer MIT, ist das
      eine Aussage und wird geschrieben.
   ⚠  Die Nummer wird als TEXT normalisiert (`cc_wappen_tid()`), damit
      `39010` und `"39010"` dasselbe treffen — dieselbe Funktion wie beim
      Wappen, keine zweite eigene.
   ⚠  `bestand` meldet neu `sfv_nummern`: wie viele Spiele eine
      Gegnernummer tragen und wie viele Ranglistenzeilen eine Nummer.
      **Heute ist beides null, und null ist hier eine Auskunft** — die
      Gegenstelle schickt die Felder erst ab ihrem naechsten Deploy.

   0.9.29 (23.09.2026): neue Aktion `wappen` — ClubCampus schickt die
   Vereinswappen in die Mediathek. Je Eintrag `{sfv_team_id, sha256,
   mime, daten}`, `daten` als base64, hoechstens CC_WAPPEN_JE_AUFRUF (20)
   je Aufruf. Jedes Bild wird ein Anhang mit den Metafeldern
   `sfv_team_id` und `sha256`. Die Antwort zaehlt `angelegt`, `ersetzt`,
   `unveraendert` und `fehler`. `bestand` meldet zusaetzlich je Team
   `sfv_team_id` und `sha256`.
   ⚠  **Die Pruefsumme wird NACHGERECHNET, nicht geglaubt.** Stimmt sie
      nicht zu den Bytes, ist der Eintrag `fehler` — nichts angelegt,
      nichts geloescht. Ebenso der Typ: `finfo_buffer()` auf die
      dekodierten Bytes entscheidet, nicht die Angabe in `mime`.
   ⚠  **SVG wird ABGELEHNT, nicht gesaeubert** — Begruendung an
      `cc_wappen_pruefe()`. Kurz: WordPress erlaubt den Typ von Haus aus
      gar nicht, und ein selbstgebauter Saeuberer fuer ausfuehrbares
      Markup ist gefaehrlicher als die Luecke.
      ~~«gemessen am 23.09.2026: `wp_get_mime_types()` fuehrt png, jpeg
      und webp, svg NICHT»~~ — Stand 23.09.2026, ueberholt. Der Satz war
      nicht falsch, aber er las sich wie eine vollstaendige Liste, und
      genau diese Kuerze hat GIF uebersehen lassen. Nachgemessen am
      23.09.2026 im lokalen Stapel: `wp_get_mime_types()` fuehrt **98**
      Eintraege, darunter `jpg|jpeg|jpe`, **`gif`**, `png`, `bmp`,
      `tiff|tif`, `webp`, `avif`, `ico`, `heic`. `svg` kommt **null Mal**
      vor — weder als Schluessel noch als Wert. Die SVG-Begruendung
      traegt also unveraendert; sie haengt nicht daran, wie kurz die
      Liste ist.
   ⚠  **Grenze je Bild: CC_WAPPEN_BYTES (512 KiB) auf die DEKODIERTEN
      Bytes.** Gemessen am 23.09.2026 an einem 512px-Wappen: png 2,7 KB,
      webp 3,9 KB, jpeg 12,7 KB. Die Grenze laesst also auch ein
      detailreiches 1024px-Bild durch und schliesst nur das aus, was
      kein Wappen mehr ist.

   0.9.28 (23.09.2026): die WERTPRUEFUNG von 0.9.27 ist ZURUECKGEBAUT. Der
   Empfaenger nimmt Werte wieder an wie vor 0.9.27 — keine Pruefung gegen
   erlaubte Werte, kein Ablehnen, kein Protokoll. Didis Entscheid.
   ⚠  **Der Eintrag bleibt stehen, damit niemand die Pruefung fuer ungebaut
      haelt und sie ein zweites Mal baut.** Sie war gebaut und gemessen —
      null Ablehnungen an 1468 `verlauf`-, 3373 `aufstellung`- und 738
      Markenzeilen — und ist gefallen, weil der Anlass zu klein war: eine
      leere Zeile auf EINER Spielseite, deren Ursache ein Datenfehler ist,
      den Didi selbst korrigiert.
   ⚠  **Und was damit wieder offen ist:** Ein unbekanntes `art` landet
      unbeanstandet in der Datenbank und erscheint auf der Spielseite ohne
      Zeichen — Minute und Text da, kein Symbol, und in Zwischenstand und
      Torschuetzenliste zaehlt es nicht mit. Keine Meldung. Heute ist der
      Bestand sauber (nur die erwarteten Werte); es ist eine Luecke auf
      Vorrat, kein Fehler von heute.

   > ~~«0.9.27 (23.09.2026): WERTE werden geprueft, nicht mehr nur
   > Feldnamen. Geprueft wird gegen CC_WERTE; eine Zeile mit unbekanntem
   > Wert wird ABGELEHNT.»~~ — abgeloest am selben Tag, siehe oben.

   0.9.26 (13.09.2026): `ohne_person` im Repeater `verlauf` — das Merkmal
   statt des Rueckfalltexts „Unser Team“. Nutzlast-Fassung 4.
   ⚠  Drueben muss das Unterfeld angelegt werden, sonst verwirft es ACF
      still — `unterfelder_ohne_acf` meldet es dann.

   0.9.25 (13.09.2026): die E-Mail wird ueber den FELDSCHLUESSEL gelesen,
   nicht ueber den Namen. `mail` gibt es zweimal — am fch_person und an
   der Taxonomie fch_funktion; das zweite gehoert einem Amt.
   ⚠  Aufgeloest ueber cc_feld_schluessel(), nicht ueber eine importierte
      Konstante: die Funktion verweigert bei Mehrdeutigkeit, und ein fremder
      Schluessel im Quelltext waere eine zweite Wahrheit, die veraltet.

   0.9.24 (12.09.2026): zwei falsche Feldnamen im Personen-Bestand — 'email'
   heisst 'mail' (Fields/person.php:302), und 'geburtsdatum' gibt es an der
   Person nicht. `email_hash` und `name_hash` waren damit seit 0.9.20 fuer
   JEDE Person `null`.
   ⚠  Nur der erste ist eine Umbenennung. Der Jahrgang steht nirgends — kein
      ACF-Feld, und der Personen-Import ueberspringt die Spalte ausdruecklich.
      `name_hash` bleibt `null`, und das ist richtig.
   ⚠ ⚠  `merkmale_nutzbar` sagt jetzt je Achse, wie viele Personen ueberhaupt
         etwas tragen. Eine Null auf einer Achse, die gar nichts traegt, ist
         von einem Messergebnis nicht zu unterscheiden — und hat dazu
         gefuehrt, dass auch `treffer_sfv = 0` in Zweifel geriet, obwohl
         DIESE Achse den richtigen Feldnamen las.

   0.9.23 (12.09.2026): cc_pruefe_verlust() — der Vorher-Nachher-Vergleich
   fuer BEIDE Repeater. `verlust` steht in der Antwort UND im Bericht, je
   Repeater vier Zahlen und die Liste der betroffenen Spiele.
   ⚠ ⚠  ANLASS: ein fremder Waechter meldete 100 verlorene Aufstellungen
         („38 → 0"). Es war sein Zaehlfehler — `is_array()` auf einen Wert,
         den ACF als Zeilenzahl liefert. **Diese Datei konnte es nicht
         widerlegen:** `aufstellung_zeilen` und `verlauf_zeilen` zaehlen nur,
         was NACHHER dasteht. Gekostet hat es einen Export-Stopp.
   ⚠  `verlust` und `rueckgang` getrennt: ein Rueckgang kann richtig sein
      (der Verband korrigiert), ein Sturz auf null ist der Alarm.
   ⚠  NACH WEG B (12.09.2026): ClubCampus schickt `aufstellung` nur noch mit
      Zeilen. Ein Verlust an DIESEM Repeater heisst seither, dass Zeilen
      ankamen und nicht geschrieben wurden — er kann nicht mehr vom Sender
      kommen. Fuer `verlauf` bleibt er zweideutig: der wird weiterhin immer
      gesendet, auch leer.

   0.9.22 (12.09.2026): `geschwister` unterscheidet drei Arten statt einer —
   `kopie`, `verweis` (Symlink, gezaehlt und nicht verfolgt), `unlesbar`.
   ⚠  `unlesbar` war ein `continue`, also „gibt es nicht" — damit waere
      ausgerechnet die absichtlich weggesperrte Datei unsichtbar geblieben.

   0.9.21 (12.09.2026): `geschwister` — liegt eine ZWEITE Kopie dieses
   Plugins im selben Ordner?
   ⚠ ⚠  ANLASS: der DRITTE Fall seit dem 09.09.2026, in dem eine Datei
         antwortete, die niemand gemeint hatte — und jedes Mal sagte
         /status „bereit". Zuletzt lagen zwei Kopien in mu-plugins,
         0.9.20 und 0.9.11; geantwortet hat die alte.
   ⚠ ⚠  `empfaenger` HAT NICHT GEHOLFEN, obwohl es dafuer gebaut war:
         die antwortende Datei trug den ERWARTETEN Namen, und die Kopie
         mit dem unerwarteten Namen war die richtige.
   ⚠     Erkannt wird an `clubcampus/v1` im Quelltext, nicht am
         Dateinamen — der Name ist beliebig, die Route nicht.
   ⚠     Eine leere Liste heisst „ich bin allein". Jeder Eintrag ist ein
         Befund.

   0.9.20 (11.09.2026): `bestand` liefert je Person drei
   VERGLEICHSMERKMALE — Nummer, E-Mail-Hash, Name-plus-Jahrgang-Hash.
   ⚠ ⚠  KEINE KLARNAMEN. Fuer die Schnittmenge genuegt Gleichheit, und
         dafuer genuegt ein SHA-256. Eine Auskunft ist kein
         Schreibvorgang und trotzdem eine Preisgabe.
   ⚠     Ein Hash findet WENIGER Treffer als ein Mensch. `ohne_treffer`
         wird damit eher zu gross geschaetzt — und das ist die bezahlbare
         Fehlerrichtung: wer zu viele neue Datensaetze erwartet, sieht
         genauer hin; wer zu wenige erwartet, drueckt.
   ⚠     `cc_namensschluessel()` steht auch in personenAbgleich.ts. Laufen
         die beiden auseinander, trifft kein Hash mehr und die Vorschau
         meldet lauter neue Personen — LAUT, nicht still.

   0.9.19 (11.09.2026): JEDE Antwort nennt Datei und Fassung, nicht nur
   /status.
   ⚠ ⚠  ANLASS: die Karte zeigte lauter Nullen, und niemand konnte sagen,
         ob drueben eine aeltere Fassung antwortet oder ob wirklich nichts
         dasteht. Eine Auskunft, die ihre eigene Herkunft verschweigt,
         laesst genau die Frage offen, die man bei einem ueberraschenden
         Wert zuerst stellt.

   0.9.18 (11.09.2026): `bestand` zaehlt auch PERSONEN und TEAMS.
   ⚠ ⚠  ANLASS: der Knopf „Bestand drueben" wurde gebaut, um die Frage zu
         beantworten, die an einem Tag dreimal offen war — und beantwortete
         sie nicht. Er zeigte 270 Spiele und musste dazuschreiben, dass er
         Personen gar nicht kennt.
   ⚠     **Ein Knopf, der seinen eigenen Zuschnitt entschuldigen muss, ist
         am falschen Zuschnitt gebaut.**
   ⚠     OHNE KLARNAMEN: gezaehlt wird, und die `sfv_person_id` kommt als
         Liste mit. Fuer die Schnittmenge genuegt die Nummer; ein Name
         waere eine Preisgabe ohne Gegenwert.
   ⚠     `ohne_nummer` ist die Zahl, die zaehlt — diese Personen sind ueber
         die Nummer NIE erreichbar und bleiben auf dem Stand ihres
         CSV-Imports stehen.
   ⚠     `personen.vorhanden = false` heisst „den Beitragstyp gibt es hier
         nicht" und ist KEINE Null.
   0.9.17 (11.09.2026): `/status` nennt die UNTERFELDER der Repeater —
   was ACF kennt, was wir schicken, und was dabei wortlos wegfaellt.
   ⚠ ⚠  ANLASS: `sfv_person_id` kam an KEINER der 33 Aufstellungszeilen
         an. Unsere Seite war nachweislich in Ordnung — die Spalte steht
         im Select des Exports und in der Nutzlast. Der Verlust lag
         drueben, und keine Auskunft konnte ihn benennen.
   ⚠     Der Melder aus 0.9.16 fuellt sich nur bei einem SCHREIBLAUF.
         **Eine Auskunft, die einen Lauf braucht, beantwortet die Frage
         nicht, die man VOR dem Lauf stellt.** `/status` ist ein Lesen und
         antwortet sofort.
   ⚠     `acf_kennt = null` heisst „nicht feststellbar" und ist KEINE
         leere Liste — sonst liest sich eine fehlende Feldgruppe wie
         „alle Unterfelder fehlen".
   0.9.16 (11.09.2026): DER UNTERFELD-MELDER MISST IN BEIDE RICHTUNGEN —
   und `cc_nutzlast_pfade()` steigt rekursiv hinab statt ueber einen
   Parameter.
   ⚠ ⚠  ANLASS, Befund des Theme-Chats: bis 0.9.15 verglich er die
         KONSTANTE gegen ACF. Das ist ein Waechter gegen Auseinanderlaufen
         der Konstante, nuetzlich — aber nicht die Frage. Kaeme
         `rueckennr` statt `nummer` in der Nutzlast, fiele der Name
         weiterhin wortlos weg, naemlich schon an unserer eigenen
         Allowlist. Genau der Fall, der `ein_nummer` zwei Wochen gekostet
         hat, nur eine Stufe frueher.
   ⚠     Deshalb ZWEI Listen in der Antwort, und sie heissen verschieden:
           unbeachtete_unterfelder  die Nutzlast bringt einen Namen, den
                                    WIR nicht kopieren  (rueckennr)
           unterfelder_ohne_acf     wir kopieren einen Namen, den der
                                    Zielrepeater nicht kennt (ein_nummer)
         Der erste Name traegt jetzt dieselbe Bedeutung wie
         `unbeachtete_felder` eine Ebene darueber. Zwei Felder mit
         gleichlautendem Namen und entgegengesetzter Richtung waeren die
         schlechtere Loesung gewesen.
   ⚠ ⚠  UND GEPRUEFT WIRD DIE ROHE NUTZLAST, nicht die gesaeuberte. Mit
         den gefilterten Zeilen waere die neue Richtung strukturell leer
         — eine Pruefung hinter dem Filter, den sie pruefen soll, kann nur
         „in Ordnung" sagen.
   ⚠     `unterfelder_geprueft` (gesendet:erlaubt:acf, je Repeater) steht
         IMMER da. Am 11.09.2026 meldete der Melder nichts, weil alles
         deckungsgleich war — der Zustand, in dem ein arbeitender und ein
         toter Melder dieselbe leere Liste ausgeben.
   ⚠     Die Rekursion ersetzt den Parameter `$verschachtelt`: er
         erreichte genau eine Ebene, eine DRITTE waere ungeprueft
         durchgelaufen. Gegengeprobt in der Pruefkette, die die vier
         reinen Funktionen aus dieser Datei schneidet und AUSFUEHRT.

   0.9.15 (11.09.2026): der Unterfeld-Melder ueberhaupt
   (`unbeachtete_unterfelder`, `unterfelder_unbekannt`).
   ⚠ ⚠  BERICHTIGT AM 11.09.2026, eine Stunde nach dem Eintrag. Hier stand
         "`nutzlast_fassung` in jeder Antwort". DAS FELD GIBT ES IN DIESER
         DATEI NICHT UND GAB ES NIE — gemessen mit
         `git log -S nutzlast_fassung`: genau ein Commit, naemlich der,
         der diese Zeile geschrieben hat.
   ⚠     Woher der Fehler kam: der Eintrag ist aus dem COMMIT-TITEL
         abgeschrieben ("NUTZLAST_FASSUNG und der Unterfeld-Melder") — und
         diese Haelfte landete in src/, nicht im Empfaenger.
         **Ein Aenderungsverlauf, der aus der ABSICHT geschrieben wird
         statt aus dem ERZEUGNIS, ist eine Behauptung ueber eine andere
         Stelle.** Dieselbe Familie wie ein Kommentar, der eine andere
         Stelle zusichert.
   ⚠     ACF verwirft unbekannte Unterfelder eines Repeaters wortlos —
         kein Rueckgabewert, keine Warnung. `cc_unbeachtete_felder()` sah
         das nicht: sie vergleicht nur die oberste Ebene.

   0.9.14 (11.09.2026): `ereignis_zusatz` — `eigentor` · `penalty` · leer.
   ⚠ ⚠  DAS FELD, AN DEM DER ZWISCHENSTAND HAENGT. Bis es GEFUELLT
         ankommt, liest die Spielseite das Wort „Eigentor" aus `text`;
         wer den Zusatz vorher aus dem Text nimmt, verschiebt den Stand
         um zwei Tore — ohne Fehlermeldung.

   0.9.13 (11.09.2026): `nummer` und `ein_nummer` im Verlauf, auf BEIDEN
   Seiten — die Rueckennummer des Handelnden und die des Eingewechselten.
   ⚠     Eine Rueckennummer ist eine Beschriftung auf einem Trikot, kein
         Personendatum; Entscheid B bleibt unberuehrt.

   0.9.12 (11.09.2026): die Zaehlung auch JE SPIEL —
   `aufstellung_je_spiel`, sfv_match_id => Zeilen.
   ⚠ ⚠  ANLASS: die Summe beantwortet die Frage nicht mehr, sobald sie
         an einem EINZELNEN Spiel gestellt wird. Bei 4395750 standen in
         der ClubCampus-Datenbank neun Zeilen und in Beitrag #552 zwei —
         ueber 46 Spiele summiert ist das unsichtbar.
   ⚠     Der Schluessel ist die sfv_match_id aus der Nutzlast, nicht die
         Beitrags-Id: nur sie laesst sich drueben gegen die eigene Zahl
         halten. Eine Beitrags-Id kennt ClubCampus nicht.

   0.9.11 (11.09.2026): der Abgleich ZAEHLT die Aufstellungszeilen, die
   er geschrieben hat — `aufstellung_zeilen` und `aufstellung_spiele`, in
   der Antwort und im Bericht, immer, auch als Null.
   ⚠ ⚠  ANLASS: fuer den Verlauf gab es `verlauf_zeilen` seit dem ersten
         Tag, fuer die Aufstellung NICHTS. Und „270 aktualisiert" zaehlt
         BEITRAEGE — ob in einem davon eine einzige Aufstellungszeile
         steht, sagt es nicht.
   ⚠     Damit war die Lage vom 11.09.2026 von aussen nicht aufzuloesen:
         die Gegenstelle sendet fuer ein Spiel 17 Zeilen, dieser Empfaenger
         meldet 270 aktualisiert und nichts verworfen, und die Seite zeigt
         eine Zeile. Drei Auskuenfte, und keine sagt, ob die Zeilen hier
         angekommen sind. Die Website-Seite musste im Backend nachsehen.
   ⚠     Gezaehlt wird in cc_schreibe_felder(), unmittelbar nach dem
         `update_field` — nicht im Aufrufer. Nur dort steht fest, dass
         geschrieben wurde; eine Zeile weiter aussen haette die Faelle
         mitgezaehlt, die am fehlenden Feldschluessel gescheitert sind.

   0.9.10 (11.09.2026): `/status` MISST die Mehrdeutigkeit, statt die
   Reste eines Schreibvorgangs zu melden, der in dieser Anfrage nicht
   stattgefunden hat.
   ⚠ ⚠  ANLASS: `feld_mehrdeutig` und `ohne_feldschluessel` werden NUR
         beim Schreiben gefuellt. `/status` schreibt nicht — also waren
         beide Listen dort IMMER leer, und die Kachel las das als
         „jeder Schluessel eindeutig aufloesbar".
   **Eine leere Menge als Bestaetigung gelesen — zum vierten Mal an zwei
   Tagen**, nach „ACF kennt alle 0 Feldnamen", „0 Spiel-Beitraege" und
   „Success. No rows returned". Der Fehler ist immer derselbe: NICHT
   GEMESSEN und IN ORDNUNG sehen gleich aus, wenn man nur die Abwesenheit
   zeigt.
   ⚠ Jetzt loest `/status` jeden Namen aus CC_FELDER an einem
   Beispielbeitrag auf — das FUELLT die Melder und macht die Auskunft zu
   einer Messung.

   0.9.9 (11.09.2026): bei NAMENSGLEICHHEIT wird nicht mehr gewaehlt,
   sondern abgelehnt.
   ⚠ ANLASS: der Theme-Chat fand `gruppe` zweimal am fch_team — einmal
   als Taxonomie, einmal als Text. **Ein Taxonomie-Feld schreibt ueber
   wp_set_object_terms(): wer dort Text durchreicht, LEGT BEGRIFFE AN,
   statt einen Wert zu setzen.**
   ⚠ ⚠  UND 0.9.8 HAETTE DAS NICHT VERHINDERT. Die Schluesselkarte nahm
   bei zwei gleichnamigen Feldern schlicht das letzte — aus
   unvorhersehbar wurde damit **vorhersehbar falsch**, und das ist
   schlimmer: es faellt nie auf. Jetzt zaehlt sie die Kandidaten und
   schreibt bei mehr als einem GAR NICHT (`feld_mehrdeutig`).
   ⚠ Dieselbe Regel wie bei der Nummern-Bruecke im Export: bei zwei
   Kandidaten gar keiner. Eine Bruecke, die raet, ist schlimmer als
   keine.

   0.9.8 (10.09.2026): geschrieben wird ueber den FELDSCHLUESSEL, nicht
   ueber den Namen.
   ⚠ ANLASS, vom Theme-Chat an vier Aufrufen gemessen: welches Feld ACFs
   globale Namenssuche liefert, haengt an der LADEREIHENFOLGE —
   nichts vorher geladen → f_s_v_sfv, vorher die Aufstellung → f_s_a_sfv,
   vorher die Person → f_p_sfv. **Nicht falsch, sondern
   unvorhersehbar.**
   ⚠ Es betrifft ALLE Felder, nicht `sfv_person_id`: fuenf Schreibstellen
   riefen `update_field()` mit dem Namen.
   ⚠ Aufgeloest wird jetzt aus den Feldgruppen DES BEITRAGS — dann
   braucht es keine Schluesselliste von drueben, die ohnehin veralten
   wuerde. Was sich nicht aufloesen laesst, wird NICHT geschrieben,
   sondern gemeldet (`ohne_feldschluessel`).

   0.9.7 (10.09.2026): `sfv_person_id` und `ein_nummer` in
   CC_VERLAUF_FELDER, und der Repeater `aufstellung` bekommt eine eigene
   Unterfeld-Allowlist.
   ⚠ ANLASS: `sfv_person_id` wurde geschickt und fiel VOR dem Schreiben
   heraus — cc_schreibe_verlauf() baut jede Zeile aus CC_VERLAUF_FELDER,
   was nicht darin steht, erreicht `update_field()` gar nicht. Dieselbe
   Klasse wie `liga` und `aufstellung` vorher, nur eine Ebene tiefer:
   nicht die Feldliste des Spiels, sondern die des Unterfeldes.
   ⚠ ⚠  UND DIE ZWEI REPEATER WAREN UNGLEICH BEHANDELT: der Verlauf
   filterte, die Aufstellung reichte jede Zeile unveraendert durch. Ein
   neues Unterfeld waere dort still mitgereist — genau die Richtung, vor
   der `unbeachtete_felder` warnt, nur ohne Melder.

   0.9.6 (10.09.2026): `/status` liefert den LETZTEN BERICHT aus.
   ⚠ ANLASS: die Aufstellung kam drueben nicht an, und der Empfaenger
   wusste warum — `cc_bericht_ablegen()` legt bei jedem Lauf ab, was
   geschrieben wurde und was unter `unbeachtete_felder` fiel. **Nur
   ausgeliefert hat er es nie.**
   ⚠ Ein Melder, den niemand abholt, ist selbst die Luecke, gegen die er
   gebaut wurde — derselbe Satz wie bei `unbeachtete_felder` in 0.7.0,
   nur eine Ebene hoeher: dort fehlte der Zaehler, hier der Weg nach
   draussen.

   0.9.5 (10.09.2026): `/status` meldet, wie viele Spiele DER ABGLEICH
   findet — dieselbe Abfrage, die beim Export laeuft.
   ⚠ ANLASS: der Export meldete 269 aktualisierte Spiele, die Zaehlung in
   derselben Datei fand keines. Beide Wege gehen ueber `get_posts()` mit
   demselben Beitragstyp — sie unterscheiden sich nur in Kleinigkeiten
   (`suppress_filters`, die Zustandsliste, `meta_query`). **Welche davon
   es ist, entscheidet keine Ueberlegung, sondern die Gegenueberstellung
   in EINER Antwort.**

   0.9.4 (10.09.2026): der Dateikopf stimmt wieder mit CC_VERSION ueberein
   — und eine PRUEFUNG haelt es fest, statt eines Satzes.
   ⚠ Sie liefen seit 2d62ace (0.9.0, 10.09.2026) auseinander: Kopf 0.8.0,
   Konstante zuletzt 0.9.3. Vorher wurde bei jeder Erhoehung beides
   angefasst — viermal hintereinander nur noch eines.
   ⚠ Und der Satz bei CC_ROUTE, der die Uebereinstimmung „verlangt", ist
   ein KOMMENTAR. Er hat nie gegriffen, weil er nicht greifen kann.
   **Eine Pruefung, die aus einem Satz besteht, schweigt immer.**
   ⚠ Was er NICHT erklaert: /status meldet `CC_VERSION`, nicht den Kopf.
   Die Karte von 0.9.2 war also ein richtiger Beleg ueber den laufenden
   Code. Falsch war, was WordPress in seiner Plugin-Liste zeigt — und
   damit jede Auskunft, die ein Mensch DORT abliest.

   0.9.3 (10.09.2026): `/status` fragt die Datenbank DIREKT, welche
   Beitragstypen ein `sfv_match_id` tragen — ohne post_type-Filter und
   ohne WP_Query.
   ⚠ ANLASS, und es ist ein WIDERSPRUCH ZWISCHEN ZWEI AUSKUENFTEN: der
   Export meldete um 12:30 „270 Spiele, 270 aktualisiert" — also 270
   BESTEHENDE Beitraege —, und dieselbe Datei meldet in `/status` „kein
   einziger Spiel-Beitrag, auch kein Entwurf". Beide koennen nicht
   stimmen.
   ⚠ Der Abgleich und die Zaehlung benutzen DENSELBEN Beitragstyp
   (CC_TYP_SPIEL, beide Stellen) — ein Namensunterschied wie bei
   sfv_letzter_sync gegen sfv_zuletzt_abgeglichen ist es also nicht.
   Was uebrig bleibt, laesst sich aus dem Quelltext nicht entscheiden.
   **Also fragt die Auskunft es die Datenbank.**

   0.9.2 (10.09.2026): `/status` zaehlt Spiel-Beitraege NACH ZUSTAND, und
   `spielfelder` sagt, wenn es nicht pruefen konnte.
   ⚠ ANLASS: die Karte meldete „0 Spiel-Beitraege … ACF kennt alle 0
   Feldnamen", waehrend auf dev 270 Spiele liegen. Beide Zahlen waren
   nicht falsch, sondern ZU SCHMAL: gezaehlt wurde `->publish`, gesucht
   in fuenf Zustaenden — `auto-draft` in keinem von beiden. Genau der
   Zustand, in dem auf dev zehn von einundzwanzig Teams lagen (0.6.0).
   ⚠ Und „ACF kennt alle 0 Feldnamen" liest sich wie eine Bestaetigung
   und ist eine LEERE MENGE. Eine Auskunft, die aus „nichts geprueft"
   ein „alles in Ordnung" macht, ist schlimmer als keine.

   0.9.1 (10.09.2026): `aufstellung` steht in CC_FELDER — der Repeater ist
   drueben angelegt (f_s_auf, zehn Unterfelder, darin der verschachtelte
   `marken` mit f_s_a_mk_art und f_s_a_mk_min). Zeichengenau gegen die
   Nutzlast verglichen: keine Abweichung, auch keine kleine.
   ⚠ Ein Spiel ohne Aufstellung schickt das Feld GAR NICHT — und
   cc_schreibe_felder() ueberspringt, was nicht in der Nutzlast steht.
   Damit bleibt ein einmal geschriebener Repeater stehen, wenn der
   Verband die Aufstellung spaeter nicht mehr liefert. Das ist gewollt:
   eine leere Liste hiesse „niemand hat gespielt", das Fehlen heisst
   „wir wissen es nicht".

   0.9.0 (10.09.2026): Zeitschutz. `set_time_limit()` je Anfrage, ein
   BERICHT AUCH BEIM ABBRUCH ueber register_shutdown_function(), und
   `zeitlimit` in `/status`.
   ⚠ Der Abbruchbericht ist der wichtigste Teil: bis dahin stand
   `cc_bericht_ablegen()` am ENDE der Route — riss ein Zeitlimit, wurde
   GAR NICHTS abgelegt. Der Verein sah nichts, die Gegenstelle einen 504.
   **Ein Zeitlimit war damit nicht von „nichts zu tun" zu unterscheiden**,
   derselbe blinde Fleck wie bei einem Sync-Lauf ohne Protokollzeile.
   ⚠ `teil` ist BEWUSST NICHT gebaut: es ist die Voraussetzung fuers
   Stueckeln, nicht sein Ersatz, und gestueckelt wird nicht. Warum
   Stueckeln ohne `teil` gefaehrlich ist, steht bei cc_route_spiele().

   0.8.0 (10.09.2026): `liga` steht in CC_FELDER — das fch_spiel hat seit
   heute ein Feld dieses Namens (`f_s_liga`, „Wettbewerbsbezeichnung").
   Es traegt die WETTBEWERBSBEZEICHNUNG, nicht die Betriebsart.
   ⚠ Dazu `spielfelder` in `/status`: fuer JEDES Feld aus CC_FELDER, ob
   ACF es am fch_spiel kennt. Eine Aufzaehlung im Pruefskript kann nicht
   wissen, was drueben registriert ist — diese Auskunft schon, und sie
   ist der eigentliche Schutz gegen ACFs globale Namenssuche.

   0.7.0 (10.09.2026): der Empfaenger meldet `unbeachtete_felder` — was die
   Nutzlast bringt und keine Allowlist fuehrt. `liga` kam seit jeher an und
   wurde wortlos verworfen; WO es riss, musste die Website-Seite von Hand
   messen. Dieselbe Klasse wie schneideAufFeldhoheit() drueben, am selben
   Tag: eine Allowlist, die nur eine Richtung meldet.
   ⚠ `liga` ist NICHT in CC_FELDER aufgenommen — erst muss das fch_spiel
   ein Feld dieses Namens haben, sonst schreibt update_field() ueber ACFs
   globale Namenssuche in das Feld des TEAMS.

   0.6.0 (10.09.2026): `wp_teams` und die Team-Zuordnung zaehlen keine
   `auto-draft` mehr (CC_TEAM_ZUSTAENDE) — auf dev waren zehn von
   einundzwanzig gezaehlten Teams nie gespeicherte Entwuerfe. Und der
   Dateikopf sagt nicht mehr „NIE fch_team": seit 0.4.0 schreibt der
   Abgleich `liga`, `gruppe` und `abgleich_stand`.

   0.5.0 (10.09.2026): `/status` sagt fuer `liga`, `gruppe` und
   `abgleich_stand`, ob ACF den Namen als FELD kennt (`feld`) oder ob dort
   nur ein Postmeta liegt (`nur_postmeta`). Ein falscher Feldname schlaegt
   nirgends fehl — er sieht aus wie ein leeres Feld. Die Auskunft ersetzt
   den vierten Rateanlauf durch eine Messung.

   0.4.1 (10.09.2026): der Zeitstempel geht nach `abgleich_stand` — das
   Feld, das die Team-Maske wirklich liest. Vorher stand er unter einem
   selbst erfundenen `_cc_team_abgleich` und wurde von niemandem gelesen.

   0.4.0 (10.09.2026): der Abgleich schreibt `liga` und `gruppe` an den
   fch_team-Beitrag — die eine ausdruecklich beschlossene Ausnahme von
   „schreibt nie an fch_team". Dazu `_cc_team_abgleich` als Lebenszeichen
   bei JEDEM Lauf und `teamfelder` in der Antwort der Ranglisten-Route.

   0.3.0 (10.09.2026): die drei Team-Zahlen in `/status` heissen `wp_teams*`
   — sie zaehlen WordPress-Beitraege, und der alte Name sagte das nicht.

   0.2.0 (09.09.2026): Gruppen werden auf `schluessel` abgelegt statt auf
   `sfv_gruppe_id` (zwei Gruppen mit derselben Nummer ueberschrieben
   einander), `autoload` wird nach dem Schreiben geprueft und notfalls
   berichtigt, `/status` nennt Empfaenger, Version, Metaschluessel und die
   Team-Zuordnung. */
const CC_VERSION    = '0.9.40';
const CC_TYP_SPIEL  = 'fch_spiel';
const CC_TYP_TEAM   = 'fch_team';
/* ⚠ NUR ZUM ZAEHLEN. Dieses Plugin legt keine Person an und aendert
   keine — 'fch_person' steht im Kopf unter NIE. Der Typ steht hier,
   damit `bestand` die Frage beantworten kann, wie viele drueben
   stehen; siehe cc_personen_lage(). */
const CC_TYP_PERSON = 'fch_person';
/* ⚠ DER SCHLUESSEL, AN DEM DIE GANZE ZUORDNUNG HAENGT — Meta am
   fch_team-Beitrag, gepflegt von der Redaktion (Plan §1). Stimmt er
   nicht, ist `cc_team_karte()` leer, und der Lauf meldet `ohne_team`:
   „diese Mannschaft hat kein Team mit dieser sfv_id". Das sieht aus wie
   ein fehlender Wert im Backend und ist einer im Code.

   Er steht seit dem 09.09.2026 als Konstante und in der Antwort von
   /status, damit niemand ihn mehr aus dem Quelltext holen muss. */
const CC_META_TEAM_SFV = 'sfv_id';
const CC_OPT_RANG   = 'fch_cc_ranglisten';
/* ⚠ VERTRAG MIT DEM THEME-REPOSITORY: fch-core/src/Admin/clubcampus.php
   liest genau diesen Namen (dort mit Rueckfall auf die Zeichenkette). */
const CC_OPT_BERICHT = 'fch_cc_bericht';
const CC_BERICHT_MAX = 10;
const CC_QUELLE     = 'clubcampus';   // ⚠ klein — der WERT, nicht die Beschriftung

/*
 * Buchhaltung, keine Inhaltsfelder — deshalb update_post_meta() statt
 * update_field() und deshalb ein Unterstrich-Praefix: ACF und die
 * Beitragsmaske zeigen sie nicht an.
 *
 * ⚠ ⚠  WARUM ES SIE GIBT — UND ES IST NICHT BEQUEMLICHKEIT  ⚠ ⚠
 *
 *   Frage von Didi (07.09.2026): woran erkennt man, welche Beitraege aus
 *   Probelaeufen stammen? Antwort bis heute: GAR NICHT. Und die zwei
 *   Merkmale, die man dafuer nehmen wuerde, sind beide falsch:
 *
 *     1) DER INHALT. Jeder Lauf schreibt dieselben Felder — ein Beitrag aus
 *        einem Testlauf ist von einem aus einem echten Lauf nicht zu
 *        unterscheiden. Er ist inhaltlich auch nicht falsch: jeder Lauf
 *        sendet den VOLLEN Satz je Mannschaft.
 *
 *     2) `post_modified`. Sieht aus wie „zuletzt angefasst" und ist es
 *        nicht: cc_schreibe_felder() schreibt ueber update_field(), also
 *        reines Postmeta, und das bewegt post_modified NICHT. Bewegt wird
 *        es nur, wenn sich der TITEL aendert oder der Beitrag
 *        zurueckgezogen wird. Ein Beitrag, den der Export einen Monat lang
 *        taeglich auffrischt, traegt weiter das Datum vom ersten Tag.
 *        ⚠ Ein Zeitstempel, der plausibel aussieht und etwas anderes misst,
 *        ist schlimmer als keiner.
 *
 *   `lauf` steht seit dem ersten Entwurf in der Nutzlast und wurde NIE
 *   gelesen. Genau das aendert sich hier.
 *
 *   ⚠ UND DAS FEHLEN IST DIE AUSSAGE: ein Beitrag OHNE `_cc_lauf` ist
 *   seit dem EINSPIELEN DIESER FASSUNG von keinem Lauf mehr angefasst
 *   worden — also aus der Erprobung und seither nicht aufgefrischt, oder
 *   eine Waise.
 *
 *   ⚠ Die Grenze ist das Einspielen, NICHT der 07.09.2026. Laeuft der
 *   Export vorher noch einmal, bleiben auch diese Beitraege ohne Stempel
 *   — richtigerweise, denn nachtraeglich weiss niemand, aus welchem Lauf
 *   sie stammen. Ein Datum in den Code zu schreiben waere eine Behauptung
 *   ueber einen Zeitpunkt, den diese Datei nicht kennt. Die Menge braucht kein festgeschriebenes Datum und schrumpft von
 *   selbst: wen ein echter Lauf beruehrt, der faellt heraus. Was
 *   uebrigbleibt, ist genau das, was niemand mehr pflegt.
 */
const CC_META_LAUF  = '_cc_lauf';      // Zeitstempel des LETZTEN Laufs
const CC_META_ERST  = '_cc_lauf_erst'; // Zeitstempel des ersten — nie ueberschrieben

/* ⚠ ⚠  DIE PRUEFSUMME JE SPIEL — NEU AM 26.09.2026, ANLASS LAUFZEIT  ⚠ ⚠
   ─────────────────────────────────────────────────────────────────────
   Gemessen mit 0.9.38: `laufzeit_ms` 14–19 s je Mannschaft, rund 1,6 s
   je Spiel — und **alle 63 Spiele eines Laufs galten als „aktualisiert",
   obwohl sich an keinem etwas geaendert hatte.** Ein Lauf schaffte so 6
   von 21 Mannschaften; der Rest fiel ins Zeitlimit.

   Hier steht ein `sha256` ueber die GELIEFERTEN Daten eines Spiels plus
   CC_VERSION. Stimmt er mit dem gespeicherten ueberein, schreibt der Lauf
   das Spiel nicht noch einmal und zaehlt es als `unveraendert`. Gebildet
   wird er in cc_pruefsumme(), verglichen und abgelegt in
   cc_route_spiele().

   ⚠ CC_VERSION GEHOERT IN DEN HASH, UND ZWAR ABSICHTLICH. Aendert sich
   der Empfaenger — eine neue Allowlist, ein anderer Schreibweg, eine
   berichtigte Umrechnung —, muss jedes Spiel EINMAL durch den neuen
   Code. Ohne die Fassung im Hash bliebe der alte Stand stehen, und zwar
   stumm: die Antwort meldete `unveraendert` fuer Beitraege, die in
   Wahrheit nach der alten Regel geschrieben sind. Der Preis ist ein
   voller, langsamer Lauf nach jeder neuen Fassung. Das ist gewollt und
   billiger als ein Feld, das sich nie mehr bewegt.

   ⚠ WAS DER HASH NICHT DECKT: die aufgeloeste Beitrags-Id `fch_team`.
   Sie steht bewusst nicht drin (siehe cc_pruefsumme()). Wird ein
   Team-Beitrag geloescht und mit derselben `sfv_id` neu angelegt, zeigen
   die Spiele weiter auf die alte Id, bis die naechste CC_VERSION alles
   einmal nachzieht — oder bis jemand dieses Meta entfernt.

   ⚠ **DIESE DATEI LIEFERT CLUBCAMPUS ALS GANZES.** Beim naechsten
   Nachschub wird sie ERSETZT und nicht zusammengefuehrt. Was hier
   geaendert und drueben nicht nachgezogen wird, ist dann weg — ohne
   Konflikt und ohne Meldung. Drueben nachzuziehen sind: diese Konstante,
   cc_tief_sortiert(), cc_pruefsumme(), der Zaehler `unveraendert` in
   `$erg`/Antwort/Bericht und der Block in cc_route_spiele(). */
const CC_META_PRUEFSUMME = '_cc_pruefsumme';
/* ⚠ ⚠  DAS FELD HEISST `abgleich_stand`, UND ES IST EIN ACF-FELD.
   BERICHTIGT AM 10.09.2026 — hier stand vorher `_cc_team_abgleich`,
   ein Meta mit Unterstrich, das ich selbst erfunden hatte.

   Geschrieben wurde also fleissig, gelesen wurde nie: die Team-Maske
   fragt `get_field( 'abgleich_stand', $team )` (`Masken/team.php`), und
   dort stand weiter nichts. **Zwei Namen fuer dieselbe Aussage, die sich
   nie trafen** — dieselbe Familie wie `sfv_id` gegen `sfv_team_id`, nur
   diesmal auf unserer Seite.

   ⚠ Und das Unterstrich-Argument war falsch: dieses Feld SOLL im Backend
   stehen. Das Theme fuehrt es als sichtbares, schreibgeschuetztes
   Textfeld mit der Beschriftung „Zuletzt abgeglichen".

   ⚠ Es ist `type => 'text'`, und die Maske gibt den Wert ROH aus
   (`esc_html( $stand )`). Also gehoert ein lesbares Datum hinein, kein
   MySQL-Zeitstempel. */
const CC_META_TEAM_STAND = 'abgleich_stand';

/* ⚠ ⚠  DIE DREI FELDER, DIE DER ABGLEICH AM TEAM ANFASST  ⚠ ⚠
   Als Liste, weil `/status` sie aufzaehlen koennen muss (`teamfelder`).
   Eine Aufzaehlung, aus der die Auskunft UND das Schreiben lesen, kann
   nicht auseinanderlaufen — anders als eine Zahl im Text daneben. */
const CC_TEAM_FELDER = array( 'liga', 'gruppe', CC_META_TEAM_STAND );

/**
 * Felder, die der Abgleich schreibt. Alles andere am Spiel ist tabu.
 *
 * ⚠ Diese Liste ist die Allowlist und nicht bloss Dokumentation: geschrieben
 *   wird nur, was hier steht. Ein neues Feld in der Nutzlast, das hier fehlt,
 *   wird still verworfen — das ist die gewollte Richtung. Umgekehrt waere ein
 *   Abgleich, der alles durchreicht, was ihm jemand schickt.
 */
const CC_FELDER = array(
	/* ⚠ `fch_team` steht hier, `sfv_team_id` nicht: die Nutzlast bringt die
	   SFV-Nummer mit, geschrieben wird die aufgeloeste Beitrags-Id. Was der
	   Export schickt und was am Beitrag steht, ist nicht dasselbe — und
	   diese Liste beschreibt den Beitrag. */
	'datum', 'zeit', 'fch_team', 'gegner', 'heim_auswaerts', 'ort',
	/* ⚠ NUR EIGENE ZEILEN tragen sie — bei Gegnern ist die
	   Personennummer verboten, nicht bloss ungenutzt: sie ist ueber
	   dieselbe Schnittstelle in einen Namen aufzuloesen. Erzwungen von
	   `spiel_aufstellung_fremde_ohne_person` in der Datenbank, gebaut in
	   `baueAufstellung()`, und hier steht es zum dritten Mal, weil diese
	   Datei laenger gelesen wird als beide.

	   Feldname `sfv_person_id`, Schluessel `f_s_a_sfv` — Unterfeld des
	   Repeaters `aufstellung`, kein eigenes Spielfeld. Es steht deshalb
	   NICHT in dieser Liste; `update_field('aufstellung', …)` schreibt
	   die ganze Zeile samt Unterfeldern. */
	/* ⚠ `liga` traegt die WETTBEWERBSBEZEICHNUNG („Cup AJF (4./5. Liga)",
	   „Schweizer Cup U-18"), NICHT die Betriebsart — die steht in
	   `wettbewerb` und heisst beim Cup schlicht „Cup". Die zwei werden
	   verwechselt, und der Feldname `wettbewerb` traegt Schuld daran.

	   ⚠ AUFGENOMMEN AM 10.09.2026, KEINE MINUTE FRUEHER. Bis dahin gab es
	   am fch_spiel kein Feld dieses Namens, und `update_field('liga', …)`
	   haette ueber ACFs globale Namenssuche in das Feld des TEAMS
	   geschrieben — die Liga einer Mannschaft, ueberschrieben mit der
	   eines einzelnen Spiels. Kein Fehler, keine Meldung, nur ein falsch
	   gefuelltes Teamfeld.

	   Jetzt steht es: Beitragstyp fch_spiel, Feldname `liga`,
	   Feldschluessel `f_s_liga`, Beschriftung „Wettbewerbsbezeichnung" —
	   registriert, lesbar, ein gestellter Wert kam an. Gemeldet vom
	   Theme-Chat, nicht angenommen.

	   ⚠ UND DIE LISTE IST NICHT DER SCHUTZ. Was drueben registriert ist,
	   kann eine Aufzaehlung hier nicht wissen. Deshalb meldet `/status`
	   seit 0.8.0 fuer JEDES dieser Felder, ob ACF es am fch_spiel kennt —
	   `spielfelder`. Steht dort `nur_postmeta`, schreibt der Abgleich ins
	   Leere. */
	'wettbewerb', 'liga', 'runde', 'status', 'quelle',
	'tore_heim', 'tore_gast', 'halbzeit_heim', 'halbzeit_gast',
	'sfv_match_id', 'sfv_spiel_nr',
	/* ⚠ SEIT 0.9.30 (23.09.2026). Die SFV-Teamnummer des GEGNERS, Feldname
	   `sfv_gegner_team_id`, Schluessel `f_s_gtid` am fch_spiel.

	   ⚠ Nicht zu verwechseln mit den drei Nachbarn, und die Namen werden
	   NICHT angeglichen: `sfv_id` am Team-Beitrag, `sfv_team_id` in der
	   Nutzlast und am Wappen-Anhang, `sfv_gegner_team_id` hier. Drei
	   Namen fuer drei Dinge.

	   ⚠ **Freiwillig.** Fehlt das Feld in der Nutzlast, ueberspringt die
	   Schleife in `cc_schreibe_felder()` es ueber `array_key_exists()` —
	   kein Eintrag wird abgelehnt und kein bestehender Wert geleert. Das
	   ist wichtiger, als es aussieht: `update_field( $key, '' )` bei
	   fehlendem Schluessel loeschte, was schon dasteht. */
	'sfv_gegner_team_id',
	/* ⚠ REPEATER, kein Textfeld. `update_field()` nimmt dafuer ein Array
	   von Zeilen; die Unterfeldnamen muessen zeichengenau stimmen, sonst
	   schreibt ACF still nichts hinein.

	   Zurueckgemeldet vom Theme-Chat am 10.09.2026 (Beitragstyp
	   fch_spiel, Schluessel f_s_auf):

	     seite f_s_a_seite · nummer f_s_a_nr · spieler f_s_a_spieler
	     position f_s_a_pos · rolle f_s_a_rolle · ist_captain f_s_a_ist_cap
	     von_minute f_s_a_von · bis_minute f_s_a_bis · spielzeit f_s_a_zeit
	     marken f_s_a_mk  →  art f_s_a_mk_art · minute f_s_a_mk_min

	   Gegen die Nutzlast gehalten: zehn Namen, dieselbe Reihenfolge,
	   keine Abweichung — und die zwei Unterfelder des verschachtelten
	   Repeaters ebenso. */
	'aufstellung',
);

/**
 * Welche dieser Felder REPEATER sind — also eine Zeilenzahl haben.
 *
 * ⚠  Gebraucht fuer cc_pruefe_verlust(): nur ein Repeater kann Zeilen
 *    verlieren. Ein Textfeld hat keinen Vorher-Stand, den man zaehlen
 *    koennte, und `(int) 'FC Meilen 3'` waere 0 — also ein gemeldeter
 *    Verlust bei jedem einzelnen Spielfeld.
 *
 * ⚠  `verlauf` steht hier, obwohl er nicht in CC_FELDER steht: er wird
 *    von cc_schreibe_verlauf() geschrieben und ruft die Pruefung selbst.
 *    Die Liste nennt, WAS ein Repeater ist — nicht, wer ihn schreibt.
 */
const CC_REPEATER = array( 'aufstellung', 'verlauf' );

/**
 * Felder der Nutzlast, die ABSICHTLICH nicht ans Spiel geschrieben werden.
 *
 * ⚠ ⚠  WARUM ES DIESE LISTE GIBT — GEMESSEN AM 10.09.2026.
 *
 * `liga` wird seit jeher mitgeschickt und von CC_FELDER nicht gefuehrt.
 * Der Empfaenger hat es wortlos verworfen; auf der Website fehlte die
 * Cup-Bezeichnung, und WO es riss, musste die Website-Seite von Hand
 * messen — drei Dateien durchsuchen, um zu sehen, dass ein Feld gar nicht
 * ankommt.
 *
 * ⚠ Das ist DIESELBE KLASSE wie `schneideAufFeldhoheit()` auf der
 * ClubCampus-Seite, die am selben Tag `sfv_runde` still weggeschnitten
 * hat: eine Allowlist, die nur EINE Richtung meldet.
 *
 *   fehlt in der Nutzlast, steht in der Liste   → wird uebersprungen, ok
 *   steht in der Nutzlast, fehlt in der Liste   → war STILL
 *
 * Die zweite Richtung ist die gefaehrlichere: von aussen sieht sie aus wie
 * „die Gegenstelle schickt es nicht".
 *
 * ⚠ Und deshalb reicht es nicht, einfach alles Unbekannte zu melden: drei
 * Felder gehoeren dort hin und waeren dauerhaftes Rauschen. Ein Melder,
 * der immer dasselbe sagt, wird nicht mehr gelesen — dieselbe Abstumpfung
 * wie bei einem dauerhaft roten Test.
 */
const CC_FELDER_ABSICHTLICH_UNGENUTZT = array(
	/* Die SFV-Nummer wird zur Beitrags-Id aufgeloest und als `fch_team`
	   geschrieben — der Wert am Beitrag ist ein anderer. */
	'sfv_team_id',
	/* Steuert den Beitragsstatus (publish/draft), ist kein Feld. */
	'publizieren',
	/* Wird ueber den Repeater geschrieben, nicht ueber die Feldliste. */
	'verlauf',
);

/** Unterfelder des Verlaufs — dieselbe Rolle, eine Ebene tiefer. */
const CC_VERLAUF_FELDER = array(
	'minute', 'art', 'seite', 'text', 'stand', 'klub',
	/* ⚠ Unterfelder des Repeaters `verlauf` — NICHT ueber ACFs globale
	   Namenssuche geschrieben. `update_field('verlauf', $zeilen, …)`
	   ordnet die Schluessel den Unterfeldern DIESES Repeaters zu; ein
	   gleichnamiges Feld an einem anderen Beitragstyp wird dabei nicht
	   getroffen.

	   ⚠ `sfv_person_id` gibt es drueben dreimal (f_s_v_sfv, f_s_a_sfv,
	   f_p_sfv). Fuer ein TOP-LEVEL-Feld waere das die Falle von `liga`;
	   als Unterfeld ist es keine — aber der Satz gehoert hierher, weil
	   der naechste Leser genau diese Frage stellen wird. */
	'sfv_person_id',
	'ein_nummer',
	/* ⚠ Seit 0.9.13: die Rueckennummer des Handelnden, BEIDE Seiten.
	   Ohne sie kann die Website ein Gegnertor nur dem Verein zuordnen —
	   „FC Wagen RJ" statt „Nr. 10". Entscheid B verbietet Name und
	   Personennummer, nicht die Nummer. */
	'nummer',
	/* ⚠ ⚠ Seit 0.9.13: `eigentor` · `penalty` · leer. DAS FELD, AN DEM
	   DER ZWISCHENSTAND HAENGT — ein Eigentor zaehlt fuer den Gegner,
	   und `art` steht dort auf `tor`. Bis dieses Feld GEFUELLT ankommt,
	   liest die Spielseite das Wort „Eigentor" aus `text`; wer den
	   Zusatz vorher aus dem Text nimmt, verschiebt den Stand um zwei
	   Tore — ohne Fehlermeldung.

	   ⚠ Drueben `f_s_v_zusatz`, ein `select` mit `allow_null`. Es kennt
	   genau zwei Werte; was hier nicht passt, kommt als leerer Text. */
	'ereignis_zusatz',
	/* ⚠ ⚠  Seit 0.9.40: der Subtyp des Verbands als KLARTEXT — «Kopftor»,
	   «Freistosstor», «Notbremse», «2. Verwarnung». Er steht NEBEN
	   `ereignis_zusatz` und nicht darin, und die Reihenfolge ist hier die
	   Aussage.

	   ⚠ ⚠  WARUM NICHT DARIN, obwohl der Auftrag das wollte: `f_s_v_zusatz`
	   ist ein `select` mit genau zwei Optionen und verwirft alles andere
	   WORTLOS — und die zwei heissen im Klartext des Verbands `Eigentor`
	   und `Penalty`. Ein Durchreichen traefe also ausgerechnet das Feld, an
	   dem die Spielseite den Zwischenstand auf die andere Mannschaft dreht.
	   **Ein Eigentor zaehlt fuer den Gegner.**

	   ⚠ Drueben `f_s_v_subtyp`, ein `text` — wie `rolle` und aus demselben
	   Grund: die Website ZEIGT die Angabe, sie rechnet nicht damit. Ein
	   `select` braeuchte die Liste der 100 Subtypen, also eine zweite
	   Wahrheit neben den Stammdaten des Verbands.

	   ⚠ Der Name `subtyp` gibt es drueben nur hier. Als UNTERFELD waere ein
	   gleichnamiges Feld ohnehin keine Falle — `update_field('verlauf', …)`
	   ordnet die Schluessel diesem Wiederholer zu —, aber der Satz gehoert
	   hierher, weil der naechste Leser genau diese Frage stellt. */
	'ereignis_subtyp',
	/* ⚠ ⚠  DAS MERKMAL STATT DES NAMENS — Nutzlast-Fassung 4, 13.09.2026.
	   Vier Verlaufszeilen trugen `spieler: "Unser Team"`, und das ist unser
	   Rueckfalltext fuer „eigenes Ereignis, kein zugeordneter Name, keine
	   Rueckennummer" — keine Mannschaftsstrafe.

	   ⚠ Die Gegenseite haette `"Unser Team"` als ZEICHENKETTE vergleichen
	   muessen, und beim ersten Umformulieren waere es gebrochen. Ein Name als
	   Kennzeichen prueft eine Schreibweise.

	   ⚠ Das Feld behauptet nur, was wir wissen: hier steht kein Mensch, den
	   wir benennen koennen. NICHT `mannschaftsstrafe` — dafuer haben wir kein
	   Merkmal. */
	'ohne_person',
	/* ⚠ ⚠  DER VERMERK STATT DES ZERLEGTEN SATZES — Nutzlast-Fassung 6,
	   24.09.2026. Der Klartext des Verbands zur Rollenkategorie
	   («Trainer/in», «Betreuer», …), leer fuer jeden Spieler.

	   ⚠ Ohne dieses Feld muesste die Website die Rolle aus `text`
	   herausschneiden — derselbe Fehler wie `"Unser Team"` als Zeichenkette
	   eine Zeile darueber, nur eine Runde spaeter. Eine eigene Liste der 28
	   Kategorien waere die andere Falle: eine zweite Wahrheit neben den
	   Stammdaten des Verbands, die gepflegt werden muesste.

	   ⚠ NICHT gegen einen Text vergleichen. Zwei Listen desselben Verbands
	   schreiben verschieden — `/events` sagt «Spieler/in», die Stammdaten
	   sagen «Spieler». Ein `=== 'Trainer'` traefe `'Trainer/in'` nicht, und
	   der Vermerk fehlte, ohne dass etwas fehlschlaegt.

	   ⚠ Drueben `f_s_v_rolle`, ein `text`. NICHT `f_s_a_rolle`:
	   `aufstellung.rolle` traegt denselben Namen und fuehrt
	   `start`/`eingewechselt`/`nicht_eingesetzt` — ein anderes Feld. */
	'rolle',
);

/**
 * Unterfelder des Repeaters `aufstellung`.
 *
 * ⚠ ⚠  BIS 0.9.7 GAB ES DIESE LISTE NICHT. Der Verlauf filterte seine
 *       Zeilen, die Aufstellung reichte sie unveraendert an
 *       `update_field()` weiter. Ein neues Unterfeld waere damit still
 *       mitgereist — und ein Feld, das ankommt und niemand fuehrt, ist
 *       genau das, wogegen `unbeachtete_felder` seit 0.7.0 gebaut ist.
 *
 * **Zwei Repeater, zwei Bauarten, ohne dass es jemand entschieden
 * haette.** Die strengere gewinnt.
 */
const CC_AUFSTELLUNG_FELDER = array(
	'seite', 'sfv_person_id', 'nummer', 'spieler', 'position', 'rolle',
	'ist_captain', 'von_minute', 'bis_minute', 'spielzeit', 'marken',
);

/** Unterfelder des verschachtelten Repeaters `marken`. */
const CC_MARKEN_FELDER = array( 'art', 'minute' );

/* ═══ WAPPEN — seit 0.9.29 ═══════════════════════════════════════════

   ⚠ **Die Metafeldnamen sind ein Vertrag mit der Anzeige.**
   `fch_wappen()` im Theme sucht den Anhang ueber genau diese zwei
   Schluessel. Wer sie hier aendert, muss sie dort mitaendern — sonst
   findet die Seite nichts und meldet es nicht, sie zeigt einfach
   weiter den Platzhalter.

   ⚠ **`sfv_team_id` ist bewusst NICHT `sfv_id`** (so heisst das Feld am
   Team, CC_META_TEAM_SFV). Am Anhang steht der Name, den die Nutzlast
   fuehrt; am Team der Name, den die Maske fuehrt. Zwei Orte, zwei
   Namen, und beide sind an ihrer Stelle richtig — ein gemeinsamer Name
   waere die Einladung, das eine fuer das andere zu halten. */
const CC_META_WAPPEN_TEAM = 'sfv_team_id';
const CC_META_WAPPEN_SHA  = 'sha256';

/* ⚠ Hoechstens 20 je Aufruf — Didis Zahl. Was darueber liegt, wird
   NICHT stumm abgeschnitten: `cc_route_wappen()` meldet es, weil eine
   Gegenstelle, die 50 schickt und 20 bestaetigt bekommt, sonst 30
   Wappen fuer erledigt haelt. */
const CC_WAPPEN_JE_AUFRUF = 20;

/* ⚠ 512 KiB auf die DEKODIERTEN Bytes, nicht auf die base64-Laenge —
   base64 traegt ein Drittel Aufschlag, und eine Grenze auf der
   Zeichenkette waere darum in Wahrheit 384 KiB und wuerde niemandem
   auffallen.

   Die Zahl ist gemessen und nicht gewaehlt (23.09.2026, GD im
   Container, ein 512px-Wappen): png 2,7 KB, webp 3,9 KB, jpeg 12,7 KB.
   512 KiB ist rund das Hundertachtzigfache — Platz fuer ein
   detailreiches 1024px-Bild, und eine Grenze gegen das, was kein
   Wappen mehr ist. */
const CC_WAPPEN_BYTES = 524288;

/* ⚠ Die erlaubten Typen, und die Endung dazu. **Der Schluessel ist der
   Fund von `finfo_buffer()`**, nicht die Angabe der Gegenstelle.

   ⚠ `svg` steht NICHT hier, und das ist eine Entscheidung mit
   Begruendung — siehe `cc_wappen_pruefe()`.

   ⚠ **`image/gif` steht seit 23.09.2026 hier, weil der Verband GIF
   liefert — unser eigenes Wappen ist eines.** Ohne GIF laufen genau die
   Bilder in `fehler`, die am haeufigsten kommen. WordPress fuehrt `gif`
   von Haus aus (gemessen am 23.09.2026, siehe Kopf der Datei), es ist
   also kein Tor, das wir eigens aufstossen muessten — anders als bei
   SVG. Die Grenze von CC_WAPPEN_BYTES gilt unveraendert auch hier.

   ⚠ **Ein GIF darf animiert sein — und ob die Seite es animiert zeigt,
   haengt an der Kantenlaenge, nicht am Typ.** Gemessen am 23.09.2026 im
   lokalen Stapel an einem dreibildrigen GIF: Die Zwischengroesse
   `fch-wappen` (96x96) hat **ein** Bild, das Original behaelt seine
   drei — mit Imagick wie mit GD. Der Kern sagt es selbst
   (`wp-includes/media.php`: «WordPress flattens animated GIFs into one
   frame when generating intermediate sizes»).
   ⚠ **Aber:** `fch-wappen` ist auf 96px ohne Beschnitt gesetzt, und
   `image_resize_dimensions()` liefert fuer eine Quelle unter 96px
   `false` — dann entsteht gar keine Zwischengroesse und die Anzeige
   faellt auf das Original zurueck. **Ein animiertes Wappen von 64px
   wuerde also auf der Seite laufen.**

   ~~«Das ist Didis Entscheid und hier bewusst NICHT verbaut: Der
   Empfaenger nimmt an, was ein gueltiges GIF ist. Wer Standbilder
   erzwingen will, entscheidet das an der Anzeige, nicht an der
   Allowlist.»~~ — Stand 23.09.2026, ueberholt. **Didi hat entschieden:
   ruhig, aber sichtbar.** Der Satz blieb im uebrigen wahr — die Allowlist
   ist unveraendert, GIF wird weiter angenommen —, nur der Ort stimmte
   nicht: Die Anzeige kann es gar nicht. WordPress verweigert eine
   Zwischengroesse in der Originalgroesse und vergroessert nicht (beides
   gemessen, siehe `cc_wappen_standbild()`). Das Standbild entsteht darum
   beim Annehmen, in `cc_wappen_anlegen()`. */
const CC_WAPPEN_MIME = array(
	'image/png'  => 'png',
	'image/jpeg' => 'jpg',
	'image/webp' => 'webp',
	'image/gif'  => 'gif',
);

/* ⚠ ⚠  DIE ZWEI SCHWELLEN DES BESCHNITTS — und warum beide ENG sind.

   `CC_WAPPEN_WEISS` ist die Untergrenze je Farbkanal (0..255), ab der ein
   Bildpunkt als «nahezu weiss» gilt. `CC_WAPPEN_ALPHA` ist die Untergrenze
   der GD-Durchsichtigkeit (0..127, 0 = deckend, 127 = unsichtbar), ab der
   er als «nahezu durchsichtig» gilt. Wer weder das eine noch das andere
   ist, ist Inhalt — und Inhalt spannt das Rechteck auf.

   ⚠ ⚠  **DIE ZWEI FEHLER SIND NICHT GLEICH TEUER.** Eine zu LOCKERE
   Schwelle erklaert blasse Inhaltspunkte zu Rand und schneidet damit genau
   das weg, was Didi ausdruecklich geschuetzt haben will. Eine zu STRENGE
   laesst einen Saum stehen, den niemand sieht. **Der billigere Fehler
   gewinnt** — darum 250 und nicht 240, obwohl 240 schoener schneidet.

   Gemessen am 23.09.2026 im wp-Container, ein 200px-Bild mit 60px weissem
   Rand um einen roten Kreis (wahr ist also `[60,60,140,140]`):

       PNG, GIF   250 → [60,60,140,140]   zeichengenau, auf jeder Schwelle
       WebP q92   250 → [56,56,142,142]   vier Bildpunkte Saum
       JPEG q92   250 → [48,48,143,143]   ZWOELF Bildpunkte Saum
                  240 → [59,59,141,141]
                  230 → [60,60,140,140]

   ⚠ **Der JPEG-Saum ist gewollt und kein Versehen.** JPEG streut um eine
   harte Kante herum; der Rand misst dort `255,243,241` statt `255,255,255`
   und faellt darum unter 250 als Inhalt durch. Das Wappen wird trotzdem
   von 200px auf 96px eng — 48 der 60 leeren Punkte je Seite fallen weg.
   **Die Alternative waere, bei jedem Bild ein Risiko auf den Inhalt zu
   nehmen, um bei einem Typ zwoelf Punkte zu gewinnen.**

   ⚠ 120 und nicht 127: Ein PNG, das schon einmal skaliert wurde, traegt am
   Saum 125 oder 126 statt der glatten 127. Was darunter liegt, ist auf
   jedem Grund sichtbar und zaehlt als Inhalt.

   ⚠ **Ein Sicherheitsrand bleibt NICHT stehen** — kein zusaetzlicher
   Punkt, keine Prozentzahl. Jede stehengelassene Zeile ist genau die
   Wirkung, gegen die der Beschnitt gebaut ist; und die Toleranz sitzt
   schon in der Schwelle: ein Saumpunkt unter 250 spannt das Rechteck von
   selbst eine Zeile weiter. */
const CC_WAPPEN_WEISS = 250;
const CC_WAPPEN_ALPHA = 120;

/* ⚠ **Die Obergrenze in BILDPUNKTEN — und sie wiederholt CC_WAPPEN_BYTES
   nicht.** Die Byte-Grenze bindet die Kantenlaenge ueberhaupt nicht:
   gemessen am 23.09.2026 wiegt ein weisses GIF von 2000x2000 genau
   10 288 Bytes und kaeme glatt durch die 512 KiB. Der Beschnitt kostet
   dagegen an der FLAECHE — gemessen im wp-Container: 512px 23 ms, 2000px
   390 ms, 4000px 1,46 s, und das dekodierte 2000px-Bild belegt 82 MiB.

   Bei CC_WAPPEN_JE_AUFRUF (20) Eintraegen ist das der Unterschied zwischen
   einer halben Sekunde und einer halben Minute. 4 194 304 sind 2048x2048 —
   ein Vielfaches dessen, was ein Wappen je braucht, und trotzdem eine
   Grenze. Geprueft wird sie am DATEIKOPF, vor dem Dekodieren: eine Grenze,
   die erst nach `imagecreatefromstring()` greift, hat den Speicher schon
   ausgegeben, gegen den sie schuetzen soll.

   ⚠ Wer darueber liegt, bekommt sein Bild UNBESCHNITTEN abgelegt und den
   Grund in der Antwort. **Abgelehnt wird nichts** — dieselbe Regel wie
   ueberall auf diesem Weg. */
const CC_WAPPEN_PUNKTE = 4194304;

/* ⚠ Die Guete fuer die zwei verlustbehafteten Typen. **Neu kodiert wird
   nur, wenn wirklich geschnitten wurde** — ein Bild ohne leeren Rand geht
   Byte fuer Byte unveraendert durch, siehe `cc_wappen_beschnitt()`. 92
   statt der GD-Vorgabe (75 bei JPEG, 80 bei WebP): Der Beschnitt soll
   Rand wegnehmen und nicht Schaerfe. Gemessen am 23.09.2026: ein
   200px-Kreis kostet als JPEG q75 1 344 Bytes, als q92 1 823 — ein halbes
   Kilobyte fuer eine Stufe, die man nicht mehr sieht. */
const CC_WAPPEN_GUETE = 92;


/* ═══════════════════════════════════════════════════════════════════════
   VORAUSSETZUNGEN — laut abbrechen, nicht still weiterlaufen
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Ist alles da, was der Abgleich braucht?
 *
 * ⚠ Fehlt ACF oder fch-core, ist NICHTS zu retten: ohne get_field/update_field
 *   gibt es keine Felder, und ohne fch_core_spiel_titel() keinen Titel. Ein
 *   Abgleich, der dann „so gut es geht" schreibt, hinterliesse Beitraege ohne
 *   Titel und ohne Werte — und meldete Erfolg.
 */
function cc_voraussetzungen(): array {
	$fehlt = array();
	if ( ! function_exists( 'get_field' ) )    { $fehlt[] = 'ACF (get_field)'; }
	if ( ! function_exists( 'update_field' ) ) { $fehlt[] = 'ACF (update_field)'; }
	if ( ! function_exists( 'fch_core_spiel_titel' ) ) { $fehlt[] = 'fch-core (fch_core_spiel_titel)'; }
	/* ⚠ **Seit 0.9.31 auch der Beitragszeiger.** `(int)` auf ein Array
	   ergibt stumm die 1 — und im Zurueckzieh-Zweig heisst das, dass ein
	   Spiel NIE zurueckgezogen wird, ohne dass etwas fehlschlaegt.
	   Lieber laut fehlen als leise falsch rechnen. */
	if ( ! function_exists( 'fch_core_beitrags_id' ) ) { $fehlt[] = 'fch-core (fch_core_beitrags_id)'; }
	if ( ! post_type_exists( CC_TYP_SPIEL ) )  { $fehlt[] = 'Beitragstyp ' . CC_TYP_SPIEL; }
	if ( ! post_type_exists( CC_TYP_TEAM ) )   { $fehlt[] = 'Beitragstyp ' . CC_TYP_TEAM; }
	return $fehlt;
}


/* ═══════════════════════════════════════════════════════════════════════
   ROUTEN
   ═══════════════════════════════════════════════════════════════════════ */

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			CC_ROUTE,
			'/spiele',
			array(
				'methods'             => 'POST',
				'callback'            => 'cc_route_spiele',
				'permission_callback' => 'cc_darf_schreiben',
			)
		);

		register_rest_route(
			CC_ROUTE,
			'/ranglisten',
			array(
				'methods'             => 'POST',
				'callback'            => 'cc_route_ranglisten',
				'permission_callback' => 'cc_darf_schreiben',
			)
		);

		/* Nur lesen: sagt, ob die Gegenseite ueberhaupt richtig ankommt.
		   ⚠ Sie ist der Ersatz fuer einen Verbindungstest, den es sonst
		   nicht gaebe — ein 200 auf /wp-json/ sagt nichts darueber, ob
		   ACF und fch-core geladen sind. */
		register_rest_route(
			CC_ROUTE,
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => 'cc_route_status',
				'permission_callback' => 'cc_darf_schreiben',
			)
		);

		/* ⚠ NUR LESEN, UND ZWAR ABSICHTLICH — siehe cc_route_bestand(). */
		register_rest_route(
			CC_ROUTE,
			'/bestand',
			array(
				'methods'             => 'GET',
				'callback'            => 'cc_route_bestand',
				'permission_callback' => 'cc_darf_schreiben',
			)
		);

		/* Seit 0.9.29: die Wappen in die Mediathek. */
		register_rest_route(
			CC_ROUTE,
			'/wappen',
			array(
				'methods'             => 'POST',
				'callback'            => 'cc_route_wappen',
				'permission_callback' => 'cc_darf_schreiben',
			)
		);
	}
);

/**
 * Wer darf schreiben.
 *
 * ⚠ `edit_posts` und NICHT `manage_options`. Der Abgleich legt Spiele an und
 *   aendert sie; mehr braucht er nicht. Insbesondere kein Loeschrecht —
 *   zurueckgezogen wird auf Entwurf, und das ist eine Statusaenderung.
 */
/**
 * Wer darf schreiben — ein gemeinsames Geheimnis und keine Benutzerrolle.
 *
 * ⚠ ÜBERNOMMEN AUS DER SPIEGEL-FASSUNG (Website-Chat), 09.09.2026.
 *   Nicht nachgebaut, sondern samt ihrer Begründung übernommen, weil sie
 *   einen Fehler von mir behebt.
 *
 * ── Hier stand `current_user_can( 'edit_posts' )` ─────────────────────
 *
 * Mit dieser Begruendung: «Der Abgleich legt Spiele an und aendert sie; mehr
 * braucht er nicht.» **Der zweite Halbsatz stimmt, der erste beschreibt die
 * falsche Groesse.** `edit_posts` beantwortet die Frage «darf dieser MENSCH
 * Beitraege bearbeiten» — gefragt ist aber «kommt das hier von ClubCampus».
 *
 * > **ClubCampus ist kein Redakteur, und ein Redakteur ist kein Abgleich.**
 *
 * In der alten Fassung konnte **jeder angemeldete Redakteur** ueber diese
 * Wege Spieldaten schreiben — Resultate, Verlauf, Ranglisten, ohne dass eine
 * Maske ihn je danach gefragt haette.
 *
 * ── Der Wert steht in der `wp-config.php` ─────────────────────────────
 *
 * `FCH_CLUBCAMPUS_SCHLUESSEL`, **nicht in der Datenbank und nicht im
 * Repository**:
 *
 * > **Ein Schluessel im Verlauf ist auch nach dem Loeschen noch im Verlauf.**
 *
 * In der Datenbank laege er in `wp_options` — also in jeder Sicherung, in
 * jedem Datenbankauszug und hinter jeder Luecke, die Optionen ausliest.
 *
 * ⚠ **Fehlt die Konstante, ist der Empfaenger ZU und nicht offen.** Das ist
 * der richtige Ausfall: Ein Abgleich, der nicht laeuft, faellt auf; einer,
 * der offen steht, nicht.
 *
 * ── Zeitkonstant verglichen ───────────────────────────────────────────
 *
 * `hash_equals()` und nicht `===`. Ein gewoehnlicher Vergleich bricht beim
 * ersten falschen Zeichen ab, und **aus dem Zeitunterschied laesst sich der
 * Schluessel Zeichen fuer Zeichen erraten**, ohne ihn je zu kennen.
 *
 * ⚠ **Kein Geheimnis in einer Ausgabe, einer Fehlermeldung oder einem
 * Protokoll** — auch nicht gekuerzt und nicht in seiner Laenge. Die Antwort
 * sagt «nicht berechtigt» und sonst nichts; sie unterscheidet nicht einmal
 * zwischen «kein Kopf mitgeschickt» und «falscher Wert».
 *
 * ── Der Kopfname ist ein Vertrag mit der Gegenseite ───────────────────
 *
 * `X-FCH-Schluessel` — die Gegenstelle sendet denselben Namen
 * (`supabase/functions/wp-export/index.ts`). **Wer ihn hier aendert, aendert
 * ihn dort mit**, sonst kommt nichts mehr an, und die Meldung dafuer lautet
 * nur «nicht berechtigt».
 *
 * WordPress reicht den Kopf als `X-FCH-Schluessel` durch; `get_header()` am
 * `WP_REST_Request` nimmt den Namen ohne Ruecksicht auf Gross- und
 * Kleinschreibung.
 *
 * ⚠ **Auch die reinen Leserouten `/status` und `/bestand` verlangen ihn.**
 *   Sie aendern nichts, geben aber Titel, Ids und Zaehlungen heraus. Eine
 *   Auskunft ist kein Schreibvorgang und trotzdem eine Preisgabe.
 */
function cc_darf_schreiben( ?WP_REST_Request $anfrage = null ) {
	if ( ! defined( 'FCH_CLUBCAMPUS_SCHLUESSEL' ) || '' === (string) FCH_CLUBCAMPUS_SCHLUESSEL ) {
		return new WP_Error(
			'cc_kein_schluessel',
			'Der Abgleich ist nicht eingerichtet: FCH_CLUBCAMPUS_SCHLUESSEL fehlt in der wp-config.php.',
			array( 'status' => 503 )
		);
	}

	$mitgeschickt = $anfrage instanceof WP_REST_Request
		? (string) $anfrage->get_header( 'X-FCH-Schluessel' )
		: '';

	if ( '' === $mitgeschickt || ! hash_equals( (string) FCH_CLUBCAMPUS_SCHLUESSEL, $mitgeschickt ) ) {
		return new WP_Error( 'cc_nicht_berechtigt', 'Nicht berechtigt.', array( 'status' => 401 ) );
	}

	return true;
}


/* ═══════════════════════════════════════════════════════════════════════
   DER LAUFBERICHT — damit der Verein sieht, was ankam
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Eine Liste deckeln und dabei sagen, wieviel abgeschnitten wurde.
 *
 * ⚠ **Der Deckel darf die Zahl nicht verschweigen.** Zehn gezeigte Faelle aus
 * zweihundert sehen ohne `gesamt` aus wie zehn Faelle — und dann sucht
 * niemand die uebrigen hundertneunzig.
 *
 * @return array{gesamt:int,faelle:array}
 */
function cc_bericht_deckel( array $faelle ): array {
	return array(
		'gesamt' => count( $faelle ),
		'faelle' => array_slice( array_values( $faelle ), 0, CC_BERICHT_MAX ),
	);
}

/**
 * **Den Empfang aufschreiben — eine Option, ueberschrieben.**
 *
 * ⚠ ÜBERNOMMEN AUS DER SPIEGEL-FASSUNG, 09.09.2026, mit ihrer Begruendung:
 *
 * > **Auch ein abgebrochener Empfang wird abgelegt.** Die Gegenstelle sieht
 * > 503 beziehungsweise 400, der Verein sieht nichts.
 *
 * ⚠ **DIE SCHLUESSEL SIND EIN VERTRAG MIT DEM ANDEREN REPOSITORY.**
 *   `fch-core/src/Admin/clubcampus.php` rendert `zeit`, `weg`, `neu`,
 *   `geaendert`, `zurueckgezogen`, `uebersprungen`, `mehrfach`, `hinweis`
 *   und — nur auf dem Ranglisten-Weg — `gruppen`. Fehlt einer, zeigt die
 *   Seite `0` beziehungsweise eine leere Liste: **also „nichts passiert"
 *   statt „nicht erfasst".** Deshalb werden alle gefuellt, auch mit null.
 *
 * ⚠ **NEU AM 26.09.2026: `unveraendert` auf dem Spiele-Weg.** Die Zahl der
 *   Spiele, die der Lauf wegen gleicher Pruefsumme gar nicht geschrieben
 *   hat (siehe CC_META_PRUEFSUMME). Sie steht in ALLEN drei Berichten
 *   dieser Route, auch in den beiden Abbruchberichten mit null: ein
 *   Schluessel, der nur manchmal da ist, zwingt jeden Leser drueben zu
 *   einer Fallunterscheidung, und geraten wird dann „null". **Der
 *   Unterschied zwischen „null unveraendert" und „diese Fassung kennt die
 *   Zahl nicht" gehoert in den Bericht, nicht in eine Vermutung.**
 *   ⚠ `fch-core/src/Admin/clubcampus.php` rendert den Schluessel noch
 *   nicht — bis dahin ist die Zahl abgelegt und unsichtbar.
 *
 * ⚠ `$weg` ist der Name der Route und nicht der Pfad: `spiele` oder
 * `ranglisten`. Die reinen Leserouten `/status` und `/bestand` schreiben
 * KEINEN Bericht — ein Nachsehen ist kein Lauf, und es wuerde den Zeitpunkt
 * des letzten Empfangs verschieben.
 *
 * @param string $weg    'spiele' oder 'ranglisten'
 * @param array  $inhalt Zahlen und bereits gedeckelte Listen
 */
function cc_bericht_ablegen( string $weg, array $inhalt ): array {
	$bericht = array_merge( array( 'zeit' => time(), 'weg' => $weg ), $inhalt );
	update_option( CC_OPT_BERICHT, $bericht, false );
	/* Der Abbruchbericht darf danach nicht mehr schreiben. */
	$GLOBALS['cc_bericht_steht'] = true;
	return $bericht;
}

/**
 * Der Bericht, wenn die Route NICHT bis zum Ende kommt.
 *
 * ⚠ ⚠  DER WICHTIGSTE TEIL VON 0.9.0. `cc_bericht_ablegen()` steht am ENDE
 *       der Route. Riss ein Zeitlimit, wurde gar nichts abgelegt — der
 *       Verein sah nichts, die Gegenstelle einen 504.
 *
 *   **Damit war ein Zeitlimit nicht von „nichts zu tun" zu
 *   unterscheiden.** Derselbe blinde Fleck wie bei einem Sync-Lauf, der
 *   keine Protokollzeile hinterlaesst: der Beleg ist eine Abwesenheit,
 *   und eine Abwesenheit faellt niemandem auf.
 *
 * ⚠ `register_shutdown_function()` laeuft AUCH beim Zeitlimit — anders als
 *   jede Zeile nach der Schleife. Das ist der ganze Grund fuer diese
 *   Bauart.
 *
 * ⚠ `abgebrochen` steht als eigenes FELD da, nicht als fehlender Wert.
 *   Ein Bericht ohne Abschluss behauptet sonst mehr, als geschehen ist —
 *   dieselbe Regel wie beim Loeschprotokoll ohne `nachher`.
 */
function cc_bericht_notfalls(): void {
	if ( ! empty( $GLOBALS['cc_bericht_steht'] ) ) {
		return;
	}
	$stand = $GLOBALS['cc_lauf_stand'] ?? null;
	if ( ! is_array( $stand ) ) {
		return;   // keine Route dieses Plugins war aktiv
	}
	$letzter = error_get_last();
	cc_bericht_ablegen(
		$stand['weg'] ?? 'unbekannt',
		array(
			'abgebrochen'   => true,
			'verarbeitet'   => (int) ( $stand['verarbeitet'] ?? 0 ),
			'erwartet'      => (int) ( $stand['erwartet'] ?? 0 ),
			'letztes_spiel' => (string) ( $stand['letztes_spiel'] ?? '' ),
			'laufzeit'      => (int) ( microtime( true ) - (float) ( $stand['start'] ?? microtime( true ) ) ),
			/* ⚠ Der Grund, soweit PHP ihn kennt. Bei einem Zeitlimit steht
			   hier „Maximum execution time … exceeded"; bei einem sauberen
			   Abbruch aus anderem Grund etwas anderes — und der
			   Unterschied ist die halbe Diagnose. */
			'grund'         => $letzter ? (string) ( $letzter['message'] ?? '' ) : '',
			'hinweis'       => array(
				'Abgebrochen, bevor der Lauf zu Ende war. Das Aufraeumen ist NICHT gelaufen: '
				. 'es steht nach der Schleife, und ein Abbruch ueberspringt es. '
				. 'Die bereits geschriebenen Spiele stehen vollstaendig; '
				. 'hoechstens die Aufstellung des zuletzt genannten Spiels ist halb.',
			),
		)
	);
}
register_shutdown_function( 'cc_bericht_notfalls' );

/**
 * Zwei Beitraege mit derselben `sfv_match_id`.
 *
 * ⚠ ÜBERNOMMEN AUS DER SPIEGEL-FASSUNG, 09.09.2026 — mir fehlte diese
 *   Pruefung ganz, und sie deckt den Zustand auf, der den Abgleich STILL
 *   falsch macht: `cc_abgleich_kandidaten()` baut eine Karte
 *   `sfv_match_id => post_id`. Bei einem Duplikat gewinnt einer, der andere
 *   wird nie wieder angefasst — er altert auf der Website vor sich hin, und
 *   nichts meldet es.
 */
function cc_doppelte_match_ids(): array {
	global $wpdb;

	$zeilen = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT pm.meta_value AS mid, pm.post_id AS pid
			   FROM {$wpdb->postmeta} pm
			   JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			  WHERE pm.meta_key = %s AND pm.meta_value <> ''
			    AND p.post_type = %s AND p.post_status <> 'trash'
			    AND pm.meta_value IN (
			        SELECT x.meta_value FROM {$wpdb->postmeta} x
			          JOIN {$wpdb->posts} y ON y.ID = x.post_id
			         WHERE x.meta_key = %s AND x.meta_value <> ''
			           AND y.post_type = %s AND y.post_status <> 'trash'
			         GROUP BY x.meta_value HAVING COUNT(*) > 1 )
			  ORDER BY pm.meta_value, pm.post_id",
			'sfv_match_id',
			CC_TYP_SPIEL,
			'sfv_match_id',
			CC_TYP_SPIEL
		)
	);

	$karte = array();
	foreach ( (array) $zeilen as $z ) {
		$karte[ (string) $z->mid ][] = (int) $z->pid;
	}
	return $karte;
}

/**
 * Verbindungstest: was hier fehlt, erklaert jeden spaeteren Fehlschlag.
 *
 * ⚠ ERWEITERT AM 09.09.2026, UND ZWAR AUS EINEM BEFUND. Etappe 4 hat drei
 *   Anlaeufe gebraucht, und alle drei sahen gleich aus — `ohne_team`, also
 *   „diese Mannschaft hat auf der Website kein Team mit dieser sfv_id".
 *   Zutreffend war das bei EINEM:
 *
 *     1. die Datei lag im falschen Ordner   → es lief gar kein Empfaenger
 *     2. eine fremde Datei trug denselben Namen → es antwortete ein anderer
 *     3. der Meta-Schluessel stimmte nicht  → DAS war die Meldung wirklich
 *
 *   Die alte Fassung dieser Route konnte nur den ERSTEN Fall trennen (sie
 *   antwortete gar nicht). Fall 2 und 3 sahen auch hier gleich aus, weil
 *   sie nichts ueber sich selbst und nichts ueber die Team-Zuordnung sagte.
 *
 *   Deshalb drei Angaben mehr, und jede beantwortet genau eine der drei
 *   Fragen:
 *
 *     `empfaenger`      WELCHE Datei antwortet hier
 *     `meta_schluessel` an welchem Feld gesucht wird
 *     `teams_*`         ob ueberhaupt ein Team zugeordnet ist
 *
 *   ⚠ `wp_teams_mit_sfv_id = 0` bei `wp_teams > 0` ist die Antwort auf
 *   Fall 3 in einer Sekunde. Sie macht die Route NICHT rot — ein
 *   Empfaenger ohne Zuordnung ist betriebsbereit, nur nutzlos, und ein
 *   503 wuerde den Unterschied zu Fall 1 wieder einebnen.
 */
/**
 * Welche UNTERFELDER kennt ACF in den Repeatern — und welche schicken wir?
 *
 * ⚠ ⚠  DIE FRAGE, DIE BIS 0.9.16 NIEMAND OHNE EINEN LAUF BEANTWORTEN
 *       KONNTE. `spielfelder` sagt seit 0.8.0, ob ACF einen Feldnamen auf
 *       der OBERSTEN Ebene kennt. Fuer die Unterfelder eines Repeaters gab
 *       es nichts — und dort verwirft update_field() wortlos.
 *
 * ⚠ ⚠  ANLASS, 11.09.2026: `sfv_person_id` kam an keiner einzigen der 33
 *       Aufstellungszeilen an. Unsere Seite war nachweislich in Ordnung —
 *       die Spalte steht im Select des Exports UND in der Nutzlast. Der
 *       Verlust lag drueben, und es gab keine Auskunft, die ihn benennt:
 *       der Melder aus 0.9.16 fuellt sich nur bei einem SCHREIBLAUF.
 *
 *       **Eine Auskunft, die einen Lauf braucht, beantwortet die Frage
 *       nicht, die man VOR dem Lauf stellt.**
 *
 * ⚠  `acf_kennt = null` heisst „nicht feststellbar" und ist KEINE leere
 *    Liste: der Repeater steht dann gar nicht in der Feldgruppe dieses
 *    Beitrags. Wer beides gleich liest, meldet eine fehlende Feldgruppe
 *    als „alle Unterfelder fehlen".
 *
 * Sie schreibt nichts und aendert nichts.
 */
function cc_unterfeld_lage( int $spielId ): array {
	if ( $spielId <= 0 ) {
		return array( 'hinweis' => 'kein fch_spiel-Beitrag vorhanden — nichts aufzuloesen' );
	}
	$raus = array();
	foreach ( array(
		'verlauf'     => CC_VERLAUF_FELDER,
		'aufstellung' => cc_erlaubt_aufstellung(),
	) as $repeater => $erlaubt ) {
		$acf = cc_unterfelder( $spielId, $repeater );
		$raus[ $repeater ] = array(
			'acf_kennt'    => $acf,
			'wir_schicken' => $erlaubt,
			/* ⚠ DAS IST DIE ANTWORT: was wir schicken und ACF nicht fuehrt,
			   faellt beim Schreiben wortlos weg. */
			'faellt_weg'   => null === $acf
				? null : array_values( array_diff( $erlaubt, $acf ) ),
			/* Die Gegenrichtung — ACF fuehrt ein Unterfeld, das wir nie
			   fuellen. Kein Fehler, aber ein leeres Feld auf der Seite. */
			'bleibt_leer'  => null === $acf
				? null : array_values( array_diff( $acf, $erlaubt ) ),
		);
	}
	return $raus;
}

function cc_route_status(): WP_REST_Response {
	$fehlt = cc_voraussetzungen();

	$karte     = cc_team_karte();
	$mehrfach  = 0;
	foreach ( $karte as $tid ) {
		if ( 0 === $tid ) {
			++$mehrfach;
		}
	}

	return new WP_REST_Response(
		array(
			'bereit'           => array() === $fehlt,
			'fehlt'            => $fehlt,
			/* ⚠ Der DATEINAME, nicht der Pfad: der Pfad des Servers gehoert
			   niemandem ausserhalb. Der Name genuegt fuer die Frage
			   „antwortet meine Datei oder eine zweite mit gleichem Namen?" —
			   und wenn beide gleich heissen, sagt es die Version daneben. */
			'empfaenger'       => basename( __FILE__ ),
			'version'          => CC_VERSION,
			/* ⚠ Ob der Zeitschutz ueberhaupt greift. Eine Aufzaehlung im
			   Code kann das nicht wissen — der Hoster kann
			   set_time_limit verbieten, und dann laeuft die Anfrage
			   weiter ins Limit, waehrend alle glauben, sie sei
			   geschuetzt. Dieselbe Klasse wie `spielfelder` in 0.8.0:
			   die Gegenstelle fragen statt annehmen. */
			'zeitlimit'        => array(
				'jetzt'     => (int) ini_get( 'max_execution_time' ),
				'aenderbar' => function_exists( 'set_time_limit' )
					&& false === stripos( (string) ini_get( 'disable_functions' ), 'set_time_limit' ),
			),
			/* Der Schluessel, an dem die Team-Zuordnung haengt. Steht er hier,
			   muss ihn niemand aus dem Quelltext holen. */
			/* ⚠ ⚠ ANDERE KOPIEN IM SELBEN ORDNER — seit 0.9.21. Eine leere
			   Liste heisst „ich bin allein"; jeder Eintrag ist ein Befund,
			   denn zwei Kopien laden beide, und welche gewinnt, entscheidet
			   das Alphabet. */
			'geschwister'      => cc_geschwister(),
			'geladen_aus'      => basename( dirname( __FILE__ ) ),
			'meta_schluessel'  => CC_META_TEAM_SFV,
			/* ⚠ ⚠  DIE NAMEN SAGEN, WESSEN TEAMS GEZAEHLT WERDEN  ⚠ ⚠
			   Umbenannt am 10.09.2026, alter Wortlaut: `teams_gesamt`,
			   `teams_zugeordnet`, `teams_mehrfach`.

			   Sie zaehlen **WordPress-Beitraege**, nicht ClubCampus-Teams —
			   `cc_team_karte()` fragt `get_posts( post_type = fch_team )`.
			   Ohne das Praefix las derselbe Abend zweimal in die falsche
			   Richtung: einmal wurden 11 WordPress-Beitraege fuer 11
			   ClubCampus-Teams gehalten, einmal sollte `teams_zugeordnet`
			   in `teams_in_clubcampus` umbenannt werden — was den Namen
			   genau andersherum falsch gemacht haette.

			   > Eine Zahl, deren Name nicht sagt, WESSEN Dinge sie zaehlt,
			   > ist in einer Kette aus zwei Systemen keine Auskunft. */
			/* ⚠ DIESELBE ZUSTANDSLISTE WIE cc_team_karte(). Zwei Listen
			   waeren der naechste Fund: die Zahl zaehlte dann etwas
			   anderes als die Zuordnung ansieht. */
			'wp_teams'              => count(
				get_posts(
					array(
						'post_type'   => CC_TYP_TEAM,
						'post_status' => CC_TEAM_ZUSTAENDE,
						'numberposts' => -1,
						'fields'      => 'ids',
					)
				)
			),
			/* ⚠ NICHT „schreibt der Abgleich?", sondern „kennt ACF den
			   Namen?". Steht dort `nur_postmeta`, wird geschrieben und
			   nichts gelesen — der Fall, den `_cc_team_abgleich` und das
			   Postmeta `saison` beide gemacht haben. */
			'teamfelder'            => cc_teamfeld_lage( (int) ( array_values( array_filter( $karte ) )[0] ?? 0 ) ),
			/* ⚠ DASSELBE FUER DAS SPIEL, seit 0.8.0. Ein Feldname, den ACF
			   am fch_spiel nicht kennt, wird als blosses Postmeta
			   geschrieben und von niemandem gelesen — genau der Fall, der
			   `liga` bis zum 10.09.2026 unmoeglich machte. Die Liste in
			   der Pruefkette kann das nicht wissen, diese Auskunft schon. */
			'spielfelder'           => cc_spielfeld_lage( cc_ein_spiel_id() ),
			/* ⚠ ⚠ UND DIE EBENE DARUNTER, seit 0.9.17. `spielfelder` sieht nur
			   die obersten Namen; was INNERHALB von `verlauf` und
			   `aufstellung` steht, durchlief bis dahin keine Auskunft —
			   und genau dort verwirft update_field() wortlos.

			   ⚠ Eine Grenze, die eine Ebene tiefer offen ist, sieht wie eine
			   ganze aus. Das galt fuer die Allowlist, und es galt fuer die
			   Auskunft darueber. */
			'unterfelder'           => cc_unterfeld_lage( cc_ein_spiel_id() ),
			/* ⚠ MISST, statt Reste zu melden. Der Aufruf loest jeden
			   Feldnamen an einem Beispielbeitrag auf und fuellt dabei
			   `cc_feld_mehrdeutig` / `cc_ohne_feldschluessel` — ohne ihn
			   waeren beide Listen in einer /status-Anfrage immer leer,
			   weil dort nichts geschrieben wird. */
			'feldnamen_geprueft'    => cc_pruefe_feldnamen( cc_ein_spiel_id() ),
			/* ⚠ NACH ZUSTAND, nicht nur `publish`. Eine einzelne Zahl kann
			   nicht zwischen „es gibt keine" und „sie stehen alle in einem
			   Zustand, den ich nicht zaehle" unterscheiden — und genau
			   diese Zweideutigkeit hat am 10.09.2026 eine Stunde
			   gekostet. */
			'spiele_nach_zustand'   => cc_spiele_nach_zustand(),
			/* ⚠ Was wir SUCHEN — damit ein Namensunterschied sichtbar
			   wird, statt als leere Menge zu erscheinen. */
			'spiel_typ_gesucht'     => CC_TYP_SPIEL,
			/* ⚠ Und was tatsaechlich DA IST, an WP_Query vorbei. */
			'match_id_typen'        => cc_typen_mit_match_id(),
			/* ⚠ DIESELBE ABFRAGE WIE DER EXPORT. Findet sie hier etwas
			   anderes als `spiele_nach_zustand`, liegt der Unterschied in
			   der ABFRAGE und nicht in den Daten — und die zwei Zahlen
			   nebeneinander sagen es, statt dass jemand es herleitet. */
			'abgleich_findet'       => count( cc_abgleich_kandidaten() ),
			/* ⚠ Der letzte Bericht, unveraendert. Er traegt `neu`,
			   `aktualisiert`, `zurueckgezogen` und vor allem
			   `unbeachtete_felder` — die Antwort auf „ist das Feld
			   angekommen und wurde es verworfen?". Bis 0.9.6 stand er
			   nur in einer Option, die niemand von aussen lesen kann. */
			'letzter_bericht'       => get_option( CC_OPT_BERICHT, null ),
			/* ⚠ Felder, deren Schluessel sich an diesem Beitragstyp nicht
			   aufloesen laesst. Sie werden NICHT geschrieben — lieber gar
			   nicht als unvorhersehbar. Eine leere Liste ist die
			   Erwartung; steht etwas darin, fehlt drueben ein Feld. */
			'ohne_feldschluessel'   => array_keys( (array) ( $GLOBALS['cc_ohne_feldschluessel'] ?? array() ) ),
			/* ⚠ Namen, die es an diesem Beitragstyp MEHRFACH gibt. Sie werden
			   NICHT geschrieben — und die Liste nennt Typ und Schluessel jedes
			   Kandidaten, damit drueben entschieden werden kann, welcher
			   gemeint ist. Ein Taxonomie-Feld schreibt ueber
			   wp_set_object_terms() und legt BEGRIFFE an. */
			/* ⚠ ~~`(array) ( … )`~~ — bis 0.9.33, 23.09.2026. Der Schluessel
			   ist ueber den FELDNAMEN indiziert und darum immer `{}`, auch
			   leer; siehe cc_als_objekt(). */
			'feld_mehrdeutig'       => cc_als_objekt( $GLOBALS['cc_feld_mehrdeutig'] ?? array() ),
			'wp_teams_mit_sfv_id'   => count( $karte ) - $mehrfach,
			'wp_teams_sfv_id_doppelt' => $mehrfach,
			'spiele_gesamt'    => (int) wp_count_posts( CC_TYP_SPIEL )->publish,
			'spiele_abgleich'  => count( cc_abgleich_kandidaten() ),
			'benutzer'         => wp_get_current_user()->user_login,
		),
		array() === $fehlt ? 200 : 503
	);
}


/* ═══════════════════════════════════════════════════════════════════════
   HELFER
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Alle fch_spiel-Beitraege, die dem Abgleich GEHOEREN.
 *
 * ⚠ DAS IST DIE STELLE, AN DER DIE FREUNDSCHAFTSSPIELE GESCHUETZT WERDEN.
 *   Bedingung ist eine gesetzte, nicht leere `sfv_match_id`. Alles andere
 *   kommt in dieser Liste gar nicht erst vor — und was hier nicht vorkommt,
 *   kann weder aktualisiert noch zurueckgezogen werden.
 *
 * Rueckgabe: sfv_match_id => post_id
 */
function cc_abgleich_kandidaten(): array {
	$ids = get_posts(
		array(
			'post_type'        => CC_TYP_SPIEL,
			'post_status'      => array( 'publish', 'draft', 'pending', 'private' ),
			'numberposts'      => -1,
			'fields'           => 'ids',
			'suppress_filters' => false,
			/* meta_query statt get_field je Beitrag: eine Abfrage statt n. */
			'meta_query'       => array(
				array(
					'key'     => 'sfv_match_id',
					'compare' => 'EXISTS',
				),
				array(
					'key'     => 'sfv_match_id',
					'value'   => '',
					'compare' => '!=',
				),
			),
		)
	);

	$karte = array();
	foreach ( $ids as $id ) {
		$mid = trim( (string) get_post_meta( (int) $id, 'sfv_match_id', true ) );
		if ( '' === $mid ) {
			continue;
		}
		$karte[ $mid ] = (int) $id;
	}
	return $karte;
}

/**
 * sfv_id (die SFV-Teamnummer) => WordPress-Beitrags-Id des Teams.
 *
 * ⚠ Der Abgleich legt NIE ein Team an. Fehlt eines, wird sein Spiel
 *   uebersprungen und namentlich gemeldet — die Sichtbarkeit einer
 *   Mannschaft auf der Website bleibt eine Entscheidung des Vereins.
 */
/**
 * Die Beitragszustaende, die als „ein Team" zaehlen.
 *
 * ⚠ ⚠  `'any'` ZAEHLT `auto-draft` MIT — UND DAS SIND KEINE TEAMS.
 *
 * WordPress legt bei jedem Klick auf „Neu" einen `auto-draft` an, auch
 * wenn niemand etwas speichert. Auf der dev-Instanz waren das **zehn von
 * einundzwanzig**: `wp_teams` meldete 21, es gab elf. Gemeldet von der
 * Website-Seite am 10.09.2026.
 *
 * ⚠ Die Zahl war damit nicht bloss zu hoch, sondern IRREFUEHREND: sie
 * stand neben `wp_teams_mit_sfv_id` und liess elf zugeordnete Teams
 * aussehen wie eine halb erledigte Zuordnung. Eine Auskunft, die zum
 * Suchen an einer Stelle verleitet, an der nichts ist.
 *
 * `trash` faellt aus demselben Grund weg: ein geloeschtes Team ist keines.
 */
const CC_TEAM_ZUSTAENDE = array( 'publish', 'draft', 'pending', 'private', 'future' );

function cc_team_karte(): array {
	$ids   = get_posts(
		array(
			'post_type'   => CC_TYP_TEAM,
			'post_status' => CC_TEAM_ZUSTAENDE,
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);
	$karte = array();
	foreach ( $ids as $id ) {
		$sfv = trim( (string) get_post_meta( (int) $id, CC_META_TEAM_SFV, true ) );
		if ( '' === $sfv ) {
			continue;
		}
		/* ⚠ Doppelte sfv_id: KEINES von beiden bedienen. Ein Wert, der bei
		   jedem Lauf zwischen zwei Beitraegen pendelt, sieht aus wie Pflege
		   und ist ein Fehler. Dieselbe Regel wie bei den Spielerpaessen im
		   SFV-Sync: lieber nichts schreiben und melden. */
		if ( isset( $karte[ $sfv ] ) ) {
			$karte[ $sfv ] = 0;
			continue;
		}
		$karte[ $sfv ] = (int) $id;
	}
	return $karte;
}

/**
 * Den Laufstempel setzen. Buchhaltung, kein Inhalt.
 *
 * ⚠ `_cc_lauf_erst` wird nur gesetzt, wenn es fehlt — es soll sagen, wann
 *   der Beitrag ENTSTANDEN ist, und das aendert sich nie. `post_date` sagt
 *   dasselbe und ist zuverlaessig; der eigene Wert steht daneben, damit ein
 *   spaeteres Verschieben des Beitragsdatums (Redaktion darf das) die
 *   Herkunft nicht ueberschreibt.
 */
function cc_stempel( int $post_id, string $lauf ): void {
	if ( '' === $lauf ) {
		return;
	}
	update_post_meta( $post_id, CC_META_LAUF, $lauf );
	if ( '' === trim( (string) get_post_meta( $post_id, CC_META_ERST, true ) ) ) {
		update_post_meta( $post_id, CC_META_ERST, $lauf );
	}
}

/**
 * Schluessel rekursiv sortieren — LISTEN AUSGENOMMEN.
 *
 * ⚠ ⚠  WARUM UEBERHAUPT SORTIERT WIRD (26.09.2026). Die Pruefsumme darunter
 * serialisiert `$spiel`. Schickt die Gegenstelle morgen dieselben Werte in
 * anderer Schluesselreihenfolge — und das entscheidet drueben ein
 * Array-Aufbau, keine Absicht —, waere die Zeichenkette eine andere und
 * jedes Spiel „geaendert". Der Hash haenge dann an der Form der Lieferung
 * statt an ihrem Inhalt, und die ganze Ersparnis waere weg, ohne dass
 * irgendwo etwas auffiele.
 *
 * ⚠ ⚠  UND WARUM LISTEN NICHT SORTIERT WERDEN. Bei `verlauf` und
 * `aufstellung` IST die Reihenfolge Inhalt: ACF legt Repeaterzeilen in der
 * gelieferten Folge ab, und ein Spielverlauf, dessen Zeilen die Plaetze
 * tauschen, ist ein anderer Verlauf. Wuerden wir Listen mitsortieren, bliebe
 * genau diese Aenderung unsichtbar — das Spiel wuerde nicht neu geschrieben,
 * und der falsche Verlauf bliebe stehen. Darum: Maps `ksort`, Listen nie.
 *
 * ⚠ Die Listenprobe geht ueber `array_keys() === range()` statt
 * `array_is_list()`: das gibt es erst ab PHP 8.1, und welche Fassung auf
 * dem Server laeuft, bestimmt der Hoster.
 *
 * @param mixed $wert Beliebiger Nutzlastteil.
 * @return mixed Derselbe Wert, Maps rekursiv nach Schluessel sortiert.
 */
function cc_tief_sortiert( $wert ) {
	if ( ! is_array( $wert ) || array() === $wert ) {
		return $wert;
	}
	$ist_liste = ( array_keys( $wert ) === range( 0, count( $wert ) - 1 ) );
	foreach ( $wert as $k => $v ) {
		$wert[ $k ] = cc_tief_sortiert( $v );
	}
	if ( ! $ist_liste ) {
		ksort( $wert );
	}
	return $wert;
}

/**
 * Die Pruefsumme eines gelieferten Spiels. Siehe CC_META_PRUEFSUMME.
 *
 * ⚠ ⚠  NUR GELIEFERTE DATEN. Aufgerufen wird sie in cc_route_spiele(),
 * BEVOR der Empfaenger `fch_team` und `quelle` in `$spiel` schreibt. Beides
 * sind unsere eigenen Werte: `fch_team` ist die aufgeloeste Beitrags-Id (der
 * Export kennt sie nie), `quelle` eine Konstante dieser Datei. Haengte der
 * Hash daran, meldete er eine Aenderung, sobald WIR etwas anders machen —
 * und die Aussage „die Lieferung ist dieselbe" waere keine mehr.
 *
 * ⚠ CC_VERSION mit im Hash: eine neue Fassung des Empfaengers schreibt jedes
 * Spiel einmal neu. Begruendung bei der Konstante.
 *
 * ⚠ Leere Rueckgabe heisst „nicht bestimmbar", nicht „leeres Spiel".
 * `wp_json_encode()` liefert bei ungueltigem UTF-8 `false`; wer daraus
 * stillschweigend `''` machte und hashte, gaebe ALLEN betroffenen Spielen
 * denselben Hash — und sie wuerden einander gegenseitig als unveraendert
 * bestaetigen. Der Aufrufer behandelt `''` deshalb als „schreiben" und legt
 * nichts ab. Aus `get_json_params()` kann das praktisch nicht kommen; die
 * Sperre kostet nichts und deckt den Fall, dass es doch geschieht.
 *
 * @param array $spiel Ein Spiel aus der Nutzlast, unveraendert.
 * @return string sha256 in Hex, oder '' wenn nicht bestimmbar.
 */
function cc_pruefsumme( array $spiel ): string {
	$roh = wp_json_encode( cc_tief_sortiert( $spiel ) );
	if ( ! is_string( $roh ) ) {
		return '';
	}
	return hash( 'sha256', CC_VERSION . '|' . $roh );
}

/** Nur die Felder aus der Allowlist, und nur die, die mitgeschickt wurden. */
/**
 * Jede Aufstellungszeile auf CC_AUFSTELLUNG_FELDER zuschneiden.
 *
 * ⚠ Was nicht in der Liste steht, erreicht `update_field()` nicht — und
 * ein Feld, das ankommt und niemand fuehrt, waere sonst still
 * mitgereist. Dieselbe Bauart wie cc_schreibe_verlauf() seit 0.2.0.
 *
 * ⚠ Der verschachtelte Repeater `marken` wird mitgeschnitten; ohne das
 * waere die Allowlist an der Oberflaeche streng und eine Ebene tiefer
 * offen — die Sorte halbe Grenze, die schlimmer ist als keine, weil sie
 * wie eine ganze aussieht.
 */
function cc_saeubere_aufstellung( $zeilen ) {
	if ( ! is_array( $zeilen ) ) {
		return array();
	}
	$raus = array();
	foreach ( $zeilen as $z ) {
		if ( ! is_array( $z ) ) {
			continue;
		}
		$zeile = array();
		foreach ( CC_AUFSTELLUNG_FELDER as $f ) {
			if ( 'marken' === $f ) {
				$marken = array();
				foreach ( (array) ( $z['marken'] ?? array() ) as $m ) {
					if ( ! is_array( $m ) ) {
						continue;
					}
					$eine = array();
					foreach ( CC_MARKEN_FELDER as $mf ) {
						$eine[ $mf ] = array_key_exists( $mf, $m ) ? $m[ $mf ] : '';
					}
					$marken[] = $eine;
				}
				$zeile['marken'] = $marken;
				continue;
			}
			$zeile[ $f ] = array_key_exists( $f, $z ) ? $z[ $f ] : '';
		}
		$raus[] = $zeile;
	}
	return $raus;
}

/**
 * Der Feldschluessel zu einem Namen — aufgeloest an DIESEM Beitrag.
 *
 * ⚠ ⚠  WARUM NICHT EINFACH DER NAME. `update_field( 'sfv_person_id', … )`
 *       laesst ACF global suchen, und welches der drei gleichnamigen
 *       Felder es findet, haengt an der Ladereihenfolge der Seite —
 *       gemessen vom Theme-Chat an vier Aufrufen, mit drei
 *       verschiedenen Ergebnissen. **Nicht falsch, sondern
 *       unvorhersehbar**, und das ist schlimmer: ein Fehler, der
 *       manchmal ausbleibt, wird nicht gesucht.
 *
 * ⚠ WAS DABEI NICHT PASSIEREN KANN, damit niemand die falsche Sorge
 *   erbt: `update_field( $sel, $wert, $post_id )` schreibt IMMER an
 *   `$post_id`. Eine falsch aufgeloeste Definition aendert die
 *   Feld-REFERENZ (`_name`), nie den Beitrag. **An einem
 *   fch_person-Beitrag ist nichts gelandet.**
 *
 * ⚠ Aufgeloest wird aus den Feldgruppen des Beitrags, nicht aus einer
 *   Liste von drueben: eine Liste veraltet, sobald jemand ein Feld
 *   umbenennt — und dann schreibt sie ins Leere, ohne dass es
 *   fehlschlaegt.
 */
/** Ein Feld ueber den Schluessel schreiben; ohne Schluessel gar nicht. */
function cc_schreibe_feld( int $post_id, string $name, $wert ): bool {
	$key = cc_feld_schluessel( $post_id, $name );
	if ( null === $key ) {
		$GLOBALS['cc_ohne_feldschluessel'][ $name ] = true;
		return false;
	}
	update_field( $key, $wert, $post_id );
	return true;
}

function cc_feld_schluessel( int $post_id, string $name ) {
	static $karten = array();
	$typ = get_post_type( $post_id );
	if ( ! isset( $karten[ $typ ] ) ) {
		$karte = array();
		if ( function_exists( 'acf_get_field_groups' ) && function_exists( 'acf_get_fields' ) ) {
			foreach ( acf_get_field_groups( array( 'post_id' => $post_id ) ) as $gruppe ) {
				foreach ( (array) acf_get_fields( $gruppe ) as $feld ) {
					if ( empty( $feld['name'] ) || empty( $feld['key'] ) ) {
						continue;
					}
					/* ⚠ SAMMELN, NICHT UEBERSCHREIBEN. Zwei Felder duerfen
					   denselben Namen tragen — `gruppe` gibt es am
					   fch_team als Taxonomie UND als Text. Wer hier das
					   letzte nimmt, waehlt; und eine Wahl, die niemand
					   getroffen hat, ist keine. */
					$karte[ $feld['name'] ][] = array(
						'key' => $feld['key'],
						'typ' => (string) ( $feld['type'] ?? '?' ),
					);
				}
			}
		}
		$karten[ $typ ] = $karte;
	}

	$kandidaten = $karten[ $typ ][ $name ] ?? array();
	if ( 1 === count( $kandidaten ) ) {
		return $kandidaten[0]['key'];
	}
	if ( count( $kandidaten ) > 1 ) {
		/* ⚠ ⚠  BEI ZWEI KANDIDATEN GAR KEINER.
		   Ein Taxonomie-Feld schreibt ueber wp_set_object_terms() und
		   LEGT BEGRIFFE AN. Das falsche zu treffen hinterlaesst Spuren,
		   die niemand bestellt hat — und die von Hand wegzuraeumen sind.
		   Dieselbe Regel wie bei der Nummern-Bruecke im Export. */
		$typen = array();
		foreach ( $kandidaten as $k ) {
			$typen[] = $k['typ'] . ':' . $k['key'];
		}
		$GLOBALS['cc_feld_mehrdeutig'][ $name ] = $typen;
		return null;
	}
	return null;
}

/**
 * Wie viele Zeilen ein Repeater VORHER trug — und was daraus wird.
 *
 * ⚠ ⚠  ANLASS, 12.09.2026: ein Waechter meldete 100 verlorene
 *       Aufstellungen („38 → 0"). Es war ein Zaehlfehler, und der Bestand
 *       war unberuehrt — aber **von dieser Datei aus war das nicht zu
 *       widerlegen.** `aufstellung_zeilen` und `verlauf_zeilen` zaehlen,
 *       was NACHHER dasteht.
 *
 *       > **Ein Zaehler, der nur den Endstand kennt, kann einen Verlust
 *       > nicht von einem Erfolg unterscheiden.** „2433 geschrieben" sagt
 *       > nichts darueber, ob vorher 2533 dastanden.
 *
 *       Dieselbe Familie wie eine Pruefung hinter dem Filter, den sie
 *       pruefen soll: beide koennen nur „in Ordnung" sagen.
 *
 * ⚠  EIN AUFRUF, NICHT ZWEI, und er steht VOR `update_field()` — mit der
 *    Zahl, die geschrieben werden soll. Ein Paar aus `merke_vorher()` und
 *    `melde_nachher()` waere an jeder neuen Schreibstelle einzeln zu
 *    vergessen; hier kann nur die ganze Messung fehlen, nicht ihre
 *    Haelfte.
 *
 * ⚠  UEBER DENSELBEN $key WIE DER SCHREIBVORGANG. Wer hier ueber den
 *    NAMEN liest, misst womoeglich ein anderes Feld als das, das gleich
 *    beschrieben wird — `sfv_person_id` gibt es an diesem Beitrag
 *    dreimal. Dann meldet der Waechter einen Verlust, den es nicht gibt,
 *    oder verschweigt einen, den es gibt. Siehe cc_feld_schluessel().
 *
 * ⚠ ⚠  ROH GELESEN (`false`), UND DAS IST DER FEHLER, DEN DER WAECHTER
 *       DES THEMES GEMACHT HAT: bei einem Repeater steht im Meta-Wert die
 *       ZEILENZAHL, kein Array. `is_array()` darauf ist immer falsch, und
 *       wer daraus 0 ableitet, meldet jede gefuellte Aufstellung als
 *       geleert. Deshalb hier beide Formen, und die Zahl gewinnt.
 *
 *       Formatiert zu lesen waere die andere Falle: es zoege alle
 *       Unterfelder aller Zeilen nach — je Spiel, je Repeater, bei 270
 *       Spielen.
 *
 * ⚠ ⚠  DREI ZAHLEN, NICHT EINE. `verlust` (von mehr als null auf null)
 *       steht getrennt von `rueckgang` (weniger, aber nicht nichts). Ein
 *       Rueckgang kann RICHTIG sein — der Verband korrigiert ein
 *       Matchblatt, und dann sind es zwei Zeilen weniger. Ein Sturz auf
 *       null nach einem gefuellten Stand ist der Alarm. Wer beides
 *       zusammenzaehlt, meldet Korrekturen als Datenverlust, und ein
 *       Melder mit Fehlalarmen wird nach dem dritten Mal abgeschaltet.
 */
/**
 * Der Ausgangsstand beider Repeater — mit BEIDEN Eintraegen, immer.
 *
 * ⚠ ⚠  NICHT `array()`, und das ist der ganze Zweck. Waechse die Struktur
 *       erst beim ersten Treffer, fehlte der Schluessel `aufstellung`
 *       genau dann, wenn kein Spiel eine Aufstellung hatte — also in dem
 *       Fall, den man wissen will. **„Kein Eintrag" saehe aus wie „nicht
 *       gemessen", und nicht gemessen saehe aus wie in Ordnung.**
 *
 *       Dieselbe Regel wie bei den Zahlen der Antwort: immer da, auch als
 *       Null. Ein Wert, der nur im schlechten Fall erscheint, verlangt vom
 *       Leser eine Deutung, und die Deutung einer Abwesenheit ist geraten.
 */
function cc_verlust_leer(): array {
	$leer = array();
	foreach ( CC_REPEATER as $feld ) {
		$leer[ $feld ] = array(
			'vorher' => 0, 'nachher' => 0,
			'verlust' => 0, 'rueckgang' => 0, 'je_spiel' => array(),
		);
	}
	return $leer;
}

/**
 * Eine Map, die auch LEER ein JSON-Objekt bleibt.
 *
 * ⚠ ⚠  DER GEGENSATZ ZU cc_verlust_bericht() DARUNTER — und derselbe
 *       Grund. Dort wird eine Map zur LISTE umgebaut, weil sie als Liste
 *       ausgeliefert werden soll; hier bleibt sie Map, weil sie ueber
 *       einen NAMEN indiziert wird. Beide Male gilt derselbe Satz: ein
 *       Schluessel, dessen Typ sich mit dem Inhalt aendert, ist beim
 *       Auswerten teurer als ein paar Zeichen mehr.
 *
 * ⚠ ⚠  WAS OHNE DIESEN AUFRUF GESCHIEHT. `json_encode( array() )` ergibt
 *       `[]`, `json_encode( array( 'a' => 1 ) )` ergibt `{"a":1}` — der
 *       Typ haengt am INHALT und nicht am Vertrag. Ein Leser, der
 *       `for k, v in x.items()` schreibt, bricht am leeren Lauf, und zwar
 *       genau dann, wenn nichts zu berichten war. Gemessen am
 *       23.09.2026 an allen drei Stellen, je leer und gefuellt.
 *
 * ⚠  `(object)` und NICHT `JSON_FORCE_OBJECT`: das Flag gilt fuer die
 *    GANZE Antwort und machte jede Liste darin zum Objekt — aus
 *    `"fehler":[]` wuerde `"fehler":{}`, aus `beitraege` eine Map mit den
 *    Zaehlnummern als Schluesseln. Ein Flaechenbrand fuer drei Schluessel.
 *
 * ⚠  `(object)` wirkt nur auf die OBERSTE Ebene, und genau das wird hier
 *    gebraucht: `feld_mehrdeutig` traegt LISTEN als Werte
 *    (`{"liga":["text:f_s_liga","text:f_tm_liga"]}`), und die muessen
 *    Listen bleiben. Geprueft am erzeugten JSON, nicht am PHP-Wert — in
 *    PHP sehen `[]` und `{}` beide wie `array()` aus.
 *
 * ⚠  Der `(array)`-Wurf davor bleibt stehen. `(object) 'x'` ergaebe
 *    `{"scalar":"x"}` — eine Form, die niemand bestellt hat und die wie
 *    ein Feldname aussieht. Ueber `(array)` wird daraus `{"0":"x"}`:
 *    sichtbar falsch statt still plausibel.
 */
function cc_als_objekt( $wert ): stdClass {
	return (object) (array) $wert;
}

/**
 * Aus der Map eine Liste — fuer die Antwort.
 *
 * ⚠  Gesammelt als Map (entdoppelt sich selbst, ein Spiel kommt nur
 *    einmal vor), ausgeliefert als LISTE: ein leeres JSON-Objekt und eine
 *    leere JSON-Liste sehen in jedem Leser verschieden aus, und ein
 *    Schluessel, dessen Typ sich mit dem Inhalt aendert, ist beim
 *    Auswerten teurer als ein paar Zeichen mehr.
 */
function cc_verlust_bericht(): array {
	$raus = array();
	foreach ( (array) ( $GLOBALS['cc_verlust'] ?? cc_verlust_leer() ) as $feld => $w ) {
		$liste = array();
		foreach ( (array) $w['je_spiel'] as $mid => $z ) {
			$liste[] = array(
				'sfv_match_id' => (string) $mid,
				'vorher'       => (int) $z['vorher'],
				'nachher'      => (int) $z['nachher'],
			);
		}
		$raus[ $feld ] = array(
			'zeilen_vorher'  => (int) $w['vorher'],
			'zeilen_nachher' => (int) $w['nachher'],
			'verlust'        => (int) $w['verlust'],
			'rueckgang'      => (int) $w['rueckgang'],
			'je_spiel'       => $liste,
		);
	}
	return $raus;
}

function cc_pruefe_verlust(
	int $post_id, string $feld, string $key, string $mid, int $nachher
): void {
	$roh = get_field( $key, $post_id, false );
	$vorher = is_array( $roh ) ? count( $roh ) : (int) $roh;

	if ( ! isset( $GLOBALS['cc_verlust'][ $feld ] ) ) {
		$GLOBALS['cc_verlust'][ $feld ] = array(
			'vorher' => 0, 'nachher' => 0,
			'verlust' => 0, 'rueckgang' => 0, 'je_spiel' => array(),
		);
	}
	$w = &$GLOBALS['cc_verlust'][ $feld ];
	$w['vorher']  += $vorher;
	$w['nachher'] += $nachher;

	if ( $vorher > 0 && 0 === $nachher ) {
		$w['verlust']++;
	} elseif ( $nachher > 0 && $nachher < $vorher ) {
		$w['rueckgang']++;
	} else {
		return;
	}
	/* ⚠ Die Liste nennt das Spiel, nicht nur die Anzahl. Eine Zahl allein
	   sagt „irgendwo sind Zeilen weg" — und dann sucht jemand 270 Spiele
	   durch. Der Schluessel ist die sfv_match_id aus der Nutzlast: nur sie
	   laesst sich auf der anderen Seite gegen die eigene Zahl halten. */
	if ( '' !== $mid ) {
		$w['je_spiel'][ $mid ] = array( 'vorher' => $vorher, 'nachher' => $nachher );
	}
}

function cc_schreibe_felder( int $post_id, array $spiel ): array {
	$geschrieben = array();
	foreach ( CC_FELDER as $feld ) {
		if ( ! array_key_exists( $feld, $spiel ) ) {
			continue;
		}
		/* ⚠ Der Repeater geht durch eine eigene Unterfeld-Allowlist —
		   wie der Verlauf, und aus demselben Grund. Bis 0.9.7 reichte er
		   jede Zeile unveraendert durch. */
		if ( 'aufstellung' === $feld ) {
			$wert = cc_saeubere_aufstellung( $spiel[ $feld ] );
		} elseif ( 'sfv_gegner_team_id' === $feld ) {
			/* ⚠ ⚠  ALS TEXT, SEIT 0.9.30 — und mit DERSELBEN Funktion wie
			   das Wappen, nicht mit einer zweiten eigenen.

			   JSON kennt Zahlen, ACF speichert, was es bekommt: `39010`
			   landete als Ganzzahl, `"39010"` als Zeichenkette. Die
			   Anzeige vergleicht die Nummer gegen das Metafeld eines
			   Anhangs, und `get_post_meta()` gibt IMMER eine
			   Zeichenkette — ein Vergleich mit `===` fande die Zahl dann
			   nie. Dieselbe Falle ist beim Wappen schon gemessen worden.

			   ⚠ Der Name `cc_wappen_tid()` ist enger als ihre Aufgabe:
			   Sie normalisiert eine SFV-Teamnummer, nicht ein Wappen.
			   **Eine zweite, gleichlautende Funktion daneben waere
			   schlimmer als der enge Name** — eine Nummer, die auf zwei
			   Wegen verschieden normalisiert wird, trifft irgendwann
			   nicht mehr dasselbe. */
			$wert = cc_wappen_tid( $spiel[ $feld ] );
		} else {
			$wert = $spiel[ $feld ];
		}

		/* ⚠ Ueber den SCHLUESSEL. Findet sich keiner, wird NICHT ueber
		   den Namen ausgewichen: das waere genau der unvorhersehbare
		   Weg. Lieber nicht schreiben und es sagen. */
		$key = cc_feld_schluessel( $post_id, $feld );
		if ( null === $key ) {
			$GLOBALS['cc_ohne_feldschluessel'][ $feld ] = true;
			continue;
		}
		/* ⚠ ⚠  VOR DEM SCHREIBEN, mit derselben $key. Nach
		   `update_field()` ist der alte Stand weg — dann waere „38 → 0"
		   von „0 → 0" nicht mehr zu unterscheiden, und genau diese
		   Unterscheidung war am 12.09.2026 eine halbe Stunde wert.
		   Nur Repeater: ein Textfeld hat keine Zeilenzahl.

		   ⚠ ⚠  WAS EIN VERLUST SEIT WEG B HEISST — und die Aussage ist
		   SCHAERFER als vorher. ClubCampus schickt das Feld `aufstellung`
		   seit dem 12.09.2026 nur noch, wenn es Zeilen HAT; fehlt es, wird
		   hier uebersprungen und gar nichts gemessen.

		     vorher   ein Verlust konnte von dort kommen (`aufstellung: []`)
		     seither  ein Verlust heisst: Zeilen kamen an und wurden nicht
		              geschrieben — also hier oder in ACF

		   ⚠ Fuer `verlauf` gilt das NICHT: er wird weiterhin immer gesendet,
		   auch leer. Dort bleibt ein Verlust zweideutig. */
		if ( in_array( $feld, CC_REPEATER, true ) ) {
			cc_pruefe_verlust(
				$post_id, $feld, $key,
				(string) ( $spiel['sfv_match_id'] ?? '' ),
				count( (array) $wert )
			);
		}
		update_field( $key, $wert, $post_id );
		$geschrieben[] = $feld;
		/* ⚠ ⚠ HIER WIRD GEZAEHLT, NICHT IM AUFRUFER. Nur an dieser Stelle
		   steht fest, dass `update_field` wirklich lief — der Zweig
		   darueber springt ab, wenn kein Feldschluessel gefunden wurde,
		   und ein Zaehler weiter aussen haette das mitgezaehlt.

		   ⚠ ANLASS, 11.09.2026: fuer den Verlauf gab es `verlauf_zeilen`
		   seit dem ersten Tag, fuer die Aufstellung NICHTS. „270
		   aktualisiert" zaehlt Beitraege und sagt ueber Zeilen nichts.
		   Damit war „ist die Aufstellung angekommen?" von hier aus nicht
		   zu beantworten — und die Website-Seite musste im Backend
		   nachsehen. */
		if ( 'aufstellung' === $feld ) {
			/* ⚠ ⚠ DIE ROHE NUTZLAST, nicht $wert. $wert ist bereits durch
			   cc_saeubere_aufstellung() gelaufen — dort fallen unbekannte
			   Namen heraus, und eine Pruefung HINTER dem Filter, den sie
			   pruefen soll, kann nur „in Ordnung" sagen.

			   ⚠ Ein Aufruf statt zwei: cc_nutzlast_pfade() steigt seit
			   0.9.16 selbst in `marken` hinab. Der Parameter erreichte
			   genau eine Ebene — eine dritte waere ungeprueft
			   durchgelaufen. */
			cc_pruefe_unterfelder(
				$post_id, 'aufstellung', $spiel[ $feld ], cc_erlaubt_aufstellung() );
			$GLOBALS['cc_aufstellung_zeilen'] += count( (array) $wert );
			if ( count( (array) $wert ) > 0 ) {
				$GLOBALS['cc_aufstellung_spiele']++;
			}
			/* ⚠ ⚠ UND JE SPIEL, seit 0.9.12. Die Summe beantwortet die
			   Frage nicht mehr, sobald sie an einem EINZELNEN Spiel
			   gestellt wird: bei 4395750 standen in der ClubCampus-
			   Datenbank neun Zeilen und in diesem Beitrag zwei. Ueber 46
			   Spiele summiert ist das unsichtbar.

			   ⚠ Der Schluessel ist die sfv_match_id aus der NUTZLAST,
			   nicht die Beitrags-Id: nur sie laesst sich auf der anderen
			   Seite gegen die eigene Zahl halten. Eine Beitrags-Id kennt
			   ClubCampus nicht. */
			$mid = (string) ( $spiel['sfv_match_id'] ?? '' );
			if ( '' !== $mid ) {
				$GLOBALS['cc_aufstellung_je_spiel'][ $mid ] = count( (array) $wert );
			}
		}
	}
	return $geschrieben;
}

/**
 * Was die Nutzlast bringt und niemand schreibt — die zweite Richtung.
 *
 * ⚠ SIE SCHREIBT NICHTS UND AENDERT NICHTS. Sie nennt nur Feldnamen, damit
 * ein vergessener Eintrag in CC_FELDER nicht wie eine fehlende Lieferung
 * aussieht. Siehe CC_FELDER_ABSICHTLICH_UNGENUTZT.
 *
 * ⚠ Der Empfaenger entscheidet damit NICHT, ob das Feld hingehoert. Ein
 * Name in dieser Liste heisst „jemand muss hinsehen", nicht „hier fehlt
 * etwas" — die Antwort kann auch lauten, dass die Gegenstelle es gar
 * nicht schicken sollte.
 *
 * @return string[] Feldnamen, alphabetisch. Keine Werte.
 */
function cc_unbeachtete_felder( array $spiel ): array {
	$bekannt = array_merge( CC_FELDER, CC_FELDER_ABSICHTLICH_UNGENUTZT );
	$offen   = array_diff( array_keys( $spiel ), $bekannt );
	sort( $offen );
	return array_values( $offen );
}

/**
 * Den Verlauf ersetzen — vollstaendig, je Lauf.
 *
 * ⚠ `ereignisse` wird hier NICHT angefasst. Die beiden beantworten
 *   verschiedene Fragen: `verlauf` sagt, was der Verband gemeldet hat,
 *   `ereignisse` sagt, wem es zuzurechnen ist. Der zweite gehoert der
 *   Redaktion und ueberlebt jeden Lauf.
 *
 * ⚠ `stand` wird NICHT gerechnet. Die Feldbeschreibung im Theme sagt warum:
 *   „eine gerechnete Zahl, die von der eingetragenen abweicht, waere
 *   schlimmer als keine." Kommt kein Zwischenstand mit, bleibt das Feld leer.
 */
/**
 * Welche Unterfelder kennt der Repeater DRUEBEN?
 *
 * ⚠ ⚠  ANLASS: `ein_nummer` schrieb von 0.9.7 bis zum 11.09.2026 ins
 * Leere — zwei Wochen, in jeder Nutzlast, ohne eine einzige Meldung.
 *
 * ACF schreibt einen Repeater als Ganzes. **Schluessel, die keinem
 * Unterfeld entsprechen, fallen wortlos weg** — kein Rueckgabewert, keine
 * Warnung, kein Eintrag irgendwo.
 *
 * ⚠ Und `cc_unbeachtete_felder()` sieht das NICHT: sie vergleicht
 * ausschliesslich die obersten Feldnamen gegen CC_FELDER. Was innerhalb
 * eines Repeaters steht, durchlaeuft die Pruefung nie.
 *
 * > **Eine Grenze, die eine Ebene tiefer offen ist, sieht wie eine ganze
 * > aus.**
 *
 * ⚠ Doppelt tueckisch: `cc_schreibe_felder()` meldet `verlauf` als
 * geschrieben, sobald `update_field` lief — **es lief ja auch.** Dass ein
 * Feld geschrieben wurde, ist keine Aussage ueber den INHALT einer Zeile.
 *
 * @return string[] Unterfeldnamen, oder `null` wenn die Feldgruppe des
 *                  Beitrags den Repeater gar nicht fuehrt.
 */
function cc_unterfelder( int $post_id, string $repeater ): ?array {
	$key = cc_feld_schluessel( $post_id, $repeater );
	if ( null === $key ) {
		return null;
	}
	$feld = function_exists( 'acf_get_field' ) ? acf_get_field( $key ) : null;
	if ( ! is_array( $feld ) || ! isset( $feld['sub_fields'] ) ) {
		return null;
	}
	return cc_acf_pfade( $feld['sub_fields'] );
}

/**
 * Ist das eine Liste von Zeilen — also ein verschachtelter Repeater?
 *
 * Eine leere Liste ergibt `false`: sie traegt keine Pfade, und ob sie ein
 * Repeater ohne Zeilen oder ein leerer Wert ist, laesst sich nicht sagen.
 */
function cc_ist_zeilenliste( $wert ): bool {
	if ( ! is_array( $wert ) || array() === $wert ) {
		return false;
	}
	if ( array_keys( $wert ) !== range( 0, count( $wert ) - 1 ) ) {
		return false;
	}
	foreach ( $wert as $e ) {
		if ( ! is_array( $e ) ) {
			return false;
		}
	}
	return true;
}

/**
 * Alle Pfade, die die NUTZLAST in diesem Repeater fuehrt.
 *
 * `nummer` · `marken` · `marken.art` — **beliebig tief, rekursiv.**
 *
 * ⚠ WARUM REKURSIV UND NICHT UEBER EINEN PARAMETER. Bis 0.9.15 wurde die
 * zweite Ebene ueber ein Argument erreicht (`cc_pruefe_unterfelder(…,
 * 'marken')`), und eine DRITTE Ebene waere ungeprueft durchgelaufen —
 * eine Grenze, die eine Ebene tiefer offen ist, sieht wie eine ganze aus.
 * Der Parameter musste ausserdem von Hand nachgezogen werden, sobald ein
 * Repeater dazukommt; die Rekursion nicht.
 */
function cc_nutzlast_pfade( $zeilen, string $praefix = '' ): array {
	$raus = array();
	if ( ! is_array( $zeilen ) ) {
		return $raus;
	}
	foreach ( $zeilen as $z ) {
		if ( ! is_array( $z ) ) {
			continue;
		}
		foreach ( $z as $name => $wert ) {
			if ( ! is_string( $name ) || '' === $name ) {
				continue;
			}
			$pfad = '' === $praefix ? $name : $praefix . '.' . $name;
			$raus[ $pfad ] = true;
			if ( cc_ist_zeilenliste( $wert ) ) {
				foreach ( cc_nutzlast_pfade( $wert, $pfad ) as $p ) {
					$raus[ $p ] = true;
				}
			}
		}
	}
	$raus = array_keys( $raus );
	sort( $raus );
	return $raus;
}

/** Dieselbe Pfadform aus den Unterfeldern einer ACF-Feldgruppe. */
function cc_acf_pfade( $sub_fields, string $praefix = '' ): array {
	$raus = array();
	foreach ( (array) $sub_fields as $u ) {
		if ( ! is_array( $u ) || ! isset( $u['name'] ) || '' === $u['name'] ) {
			continue;
		}
		$pfad = '' === $praefix ? (string) $u['name'] : $praefix . '.' . $u['name'];
		$raus[] = $pfad;
		if ( isset( $u['sub_fields'] ) && is_array( $u['sub_fields'] ) ) {
			foreach ( cc_acf_pfade( $u['sub_fields'], $pfad ) as $p ) {
				$raus[] = $p;
			}
		}
	}
	sort( $raus );
	return $raus;
}

/** Die Pfade, die `cc_saeubere_aufstellung()` durchlaesst — aus den zwei
 *  Konstanten abgeleitet, damit die Namen nicht ein viertes Mal dastehen. */
function cc_erlaubt_aufstellung(): array {
	$raus = CC_AUFSTELLUNG_FELDER;
	foreach ( CC_MARKEN_FELDER as $f ) {
		$raus[] = 'marken.' . $f;
	}
	sort( $raus );
	return $raus;
}

/**
 * DIE ENTSCHEIDUNG — ohne WordPress, ohne ACF, ohne Beitrag.
 *
 * ⚠ ⚠ ZWEI RICHTUNGEN, UND SIE FANGEN VERSCHIEDENE FEHLER. Bis 0.9.15 gab
 * es nur die zweite; die erste war die Frage, die der Theme-Chat am
 * 11.09.2026 gestellt hat.
 *
 *   nutzlast   Die Nutzlast bringt einen Namen, den WIR nicht kopieren.
 *              Er faellt schon in cc_schreibe_verlauf() bzw.
 *              cc_saeubere_aufstellung() heraus — ACF sieht ihn nie.
 *              ⚠ Das ist der Fall `rueckennr` statt `nummer`.
 *
 *   ohne_acf   Wir kopieren einen Namen, den der Zielrepeater nicht kennt.
 *              update_field() verwirft ihn wortlos.
 *              ⚠ Das ist der Fall `ein_nummer`, der zwei Wochen gekostet hat.
 *
 * ⚠ Die erste Richtung braucht ACF GAR NICHT und ist deshalb auch dann
 * beantwortbar, wenn die zweite es nicht ist. Genau deshalb steht sie
 * oberhalb der null-Pruefung.
 *
 * ⚠ `null` fuer `$vorhanden` heisst „nicht feststellbar" und ist KEINE
 * leere Liste: ein `array_diff` gegen `array()` meldete ALLE Namen als
 * unbekannt, sobald ACF fehlt. **Ein Melder, der grundlos anschlaegt,
 * wird nach dem dritten Mal abgeschaltet.**
 */
function cc_unterfeld_befund( array $gesendet, array $erlaubt, ?array $vorhanden ): array {
	return array(
		'nutzlast'  => array_values( array_diff( $gesendet, $erlaubt ) ),
		'ohne_acf'  => null === $vorhanden
			? array()
			: array_values( array_diff( $erlaubt, $vorhanden ) ),
		'unbekannt' => null === $vorhanden,
	);
}

/**
 * Der Melder — beide Richtungen, und er sagt, dass er gelaufen ist.
 *
 * ⚠ SIE SCHREIBT NICHTS UND AENDERT NICHTS. Sie nennt Namen, damit ein
 * fehlendes Unterfeld nicht wie eine fehlende Lieferung aussieht.
 *
 * ⚠ ⚠ `$roh` IST DIE UNGESAEUBERTE NUTZLAST. Mit den gesaeuberten Zeilen
 * waere die erste Richtung strukturell leer — die unbekannten Namen sind
 * dort ja bereits herausgefallen. **Eine Pruefung hinter dem Filter, den
 * sie pruefen soll, kann nur „in Ordnung" sagen.**
 */
function cc_pruefe_unterfelder( int $post_id, string $repeater, $roh, array $erlaubt ): void {
	$vorhanden = cc_unterfelder( $post_id, $repeater );
	$gesendet  = cc_nutzlast_pfade( $roh );
	$befund    = cc_unterfeld_befund( $gesendet, $erlaubt, $vorhanden );

	foreach ( $befund['nutzlast'] as $name ) {
		$GLOBALS['cc_unbeachtete_unterfelder'][ $repeater . '.' . $name ] = true;
	}
	foreach ( $befund['ohne_acf'] as $name ) {
		$GLOBALS['cc_unterfelder_ohne_acf'][ $repeater . '.' . $name ] = true;
	}
	if ( $befund['unbekannt'] ) {
		$GLOBALS['cc_unterfelder_unbekannt'][ $repeater ] = true;
	}

	/* ⚠ ⚠ DIE DREI ZAHLEN, DAMIT EIN ARBEITENDER UND EIN TOTER MELDER
	   NICHT GLEICH AUSSEHEN. Am 11.09.2026 meldete er nichts, weil alles
	   deckungsgleich war (Verlauf 10:10, Aufstellung 11:11) — und genau
	   das ist der Zustand, in dem „nichts gefunden" und „nie gelaufen"
	   dieselbe leere Liste ergeben. Fehlt der Eintrag, ist der Melder
	   nicht gelaufen; steht er da, hat er geprueft.

	   `?` statt einer Zahl heisst: ACF war nicht zu befragen. */
	$GLOBALS['cc_unterfelder_geprueft'][ $repeater ] =
		count( $gesendet ) . ':' . count( $erlaubt ) . ':'
		. ( null === $vorhanden ? '?' : (string) count( $vorhanden ) );
}

/* ⚠ `$mid` ist kein Zierrat: cc_pruefe_verlust() nennt das Spiel, und
   eine Beitrags-Id kennt ClubCampus nicht — nur die sfv_match_id laesst
   sich auf der anderen Seite gegen die eigene Zahl halten. */
function cc_schreibe_verlauf( int $post_id, array $verlauf, string $mid = '' ): int {
	$zeilen = array();
	foreach ( $verlauf as $z ) {
		if ( ! is_array( $z ) ) {
			continue;
		}
		$zeile = array();
		foreach ( CC_VERLAUF_FELDER as $f ) {
			$zeile[ $f ] = array_key_exists( $f, $z ) ? $z[ $f ] : '';
		}
		$zeilen[] = $zeile;
	}
	/* ⚠ Auch hier ueber den Schluessel — derselbe Grund. */
	$key = cc_feld_schluessel( $post_id, 'verlauf' );
	if ( null === $key ) {
		$GLOBALS['cc_ohne_feldschluessel']['verlauf'] = true;
		return 0;
	}
	/* ⚠ $verlauf, nicht $zeilen — derselbe Grund wie bei der Aufstellung. */
	cc_pruefe_unterfelder( $post_id, 'verlauf', $verlauf, CC_VERLAUF_FELDER );
	/* ⚠ ⚠  DER VERLAUF IST DER AELTERE FALL, nicht der neuere. Die
	   Aufstellung wird erst seit dem 10.09.2026 ausdruecklich geleert; der
	   Verlauf wird seit dem ERSTEN TAG bei jedem Lauf ersetzt — auch mit
	   einer leeren Liste, ohne Entscheid und ohne Zaehler. Wer nur die
	   Aufstellung bewacht, bewacht die juengere Haelfte. */
	cc_pruefe_verlust( $post_id, 'verlauf', $key, $mid, count( $zeilen ) );
	update_field( $key, $zeilen, $post_id );
	return count( $zeilen );
}

/**
 * Den abgeleiteten Titel nachziehen.
 *
 * ⚠ DER GRUND, WARUM ES DIESE FUNKTION GIBT: update_field() loest
 *   `acf/save_post` nicht aus, und daran haengt die Titelableitung des
 *   Themes (`Masken/spiel.php`, Haken `acf/save_post`). Ohne diesen Aufruf
 *   haette jedes neu
 *   angelegte Spiel einen leeren Titel — im Backend unbrauchbar, und
 *   niemand meldete es.
 *
 *   Gerufen wird die Funktion des Themes, nicht eine eigene Fassung. Der
 *   Titel hat eine Regel, und sie steht dort.
 */
function cc_titel_nachziehen( int $post_id ): void {
	$titel = fch_core_spiel_titel( $post_id );
	if ( '' === $titel ) {
		return;
	}
	$post = get_post( $post_id );
	if ( ! $post || $post->post_title === $titel ) {
		return;
	}
	wp_update_post(
		array(
			'ID'         => $post_id,
			'post_title' => wp_slash( $titel ),
		)
	);
}


/**
 * Was der Export auf dieser Website angelegt hat — Beitrag für Beitrag.
 *
 * ⚠ ⚠  SIE ZEIGT. SIE LOESCHT NICHT.  ⚠ ⚠
 *
 *   Vorgabe von Didi, 07.09.2026, woertlich: „Eine Liste, und Didi
 *   entscheidet pro Zeile. Kein Knopf, der zwanzig Beitraege auf einmal
 *   wegraeumt — das ist dieselbe Aktion wie «Person loeschen», nur auf
 *   fremdem Boden."
 *
 *   Deshalb GET und nicht POST, deshalb keine Sammelaktion, und deshalb
 *   traegt jede Zeile ihre `bearbeiten_url`: entschieden wird im
 *   WordPress-Backend, an einem Beitrag, von einem Menschen.
 *
 *   ⚠ Und das ist nicht Vorsicht um der Vorsicht willen. Ein Beitrag aus
 *   einem Probelauf ist inhaltlich NICHT falsch — jeder Lauf sendet den
 *   vollen Satz je Mannschaft, ein spaeterer Lauf frischt ihn auf. Was
 *   „wegraeumen" hiesse, weiss nur jemand, der die Website kennt.
 *
 * WAS FRAGLICH IST, UND WORAN MAN ES SIEHT
 *
 *   `ohne_laufstempel` — der Beitrag ist seit dem Einspielen dieser
 *   Plugin-Fassung von keinem Lauf mehr angefasst worden (CC_META_LAUF
 *   fehlt). Entweder aus der
 *   Erprobung und seither nicht aufgefrischt, oder eine Waise: seine
 *   Mannschaft wird nicht mehr exportiert.
 *
 *   ⚠ Die Menge schrumpft von selbst. Wen ein echter Lauf beruehrt, der
 *   faellt heraus — richtigerweise, denn dann ist sein Inhalt aktuell.
 *   Uebrig bleibt genau das, was niemand mehr pflegt. Kein festgeschriebenes
 *   Datum, keine Schwelle, die jemand raten muesste.
 *
 *   ⚠ `status` steht daneben, weil es den Unterschied macht: eine Waise im
 *   Entwurf sieht niemand, eine veroeffentlichte steht auf der Website und
 *   sieht aktuell aus.
 *
 * ⚠ KEINE KUERZUNG, KEINE SEITE, KEIN TOP-N. Wer entscheiden soll, muss
 *   alle sehen — dieselbe Lehre wie bei der Loeschvorschau im Portal, wo
 *   eine Schwelle von 20 bei einem Stapel von zwei umfiel. Sind es viele,
 *   ist eine lange Liste die ehrliche Auskunft.
 */
/**
 * Wie viele Personen stehen drueben, und wie viele tragen eine Nummer?
 *
 * ⚠ ⚠  OHNE KLARNAMEN — und das ist keine Sparsamkeit. Die Frage lautet
 *       „welche erreichen wir?", und dafuer genuegen ZAHLEN und die
 *       NUMMERN. Ein Name waere eine Preisgabe ohne Gegenwert; die
 *       Schnittmenge rechnet sich ueber `sfv_person_id`, und die haben
 *       wir ohnehin.
 *
 * ⚠  `ohne_nummer` IST DIE ZAHL, DIE ZAEHLT. Diese Personen sind ueber
 *    die Nummer NIE erreichbar — fuer sie ist der Abgleich strukturell
 *    blind, unabhaengig von jedem Filter. Sie bleiben auf dem Stand
 *    ihres CSV-Imports stehen und laufen auseinander.
 *
 * ⚠  Und die Liste `nummern` erlaubt die Schnittmenge auf der anderen
 *    Seite: wie viele der gesendeten wuerden gefunden, und wie viele
 *    stehen hier und dort nicht. **Zwei Zahlen nebeneinander sind eine
 *    Auskunft, zwei Listen sind eine Aufgabe** — deshalb kommt die
 *    Liste mit, aber gerechnet wird drueben.
 */
/**
 * Der Namensschluessel fuer den Hash — und er muss drueben identisch sein.
 *
 * ⚠ Kleinschreibung, Umlaute aufgeloest, alles ausser Buchstaben weg,
 *   dann sortiert. **Sortiert, weil „Anna Meier" und „Meier Anna"
 *   derselbe Mensch sind** und der Beitragstitel die Reihenfolge nicht
 *   garantiert.
 *
 * ⚠ Wer ihn aendert, aendert ihn in personenAbgleich.ts mit — sonst
 *   trifft kein einziger Hash mehr, und die Vorschau meldet lauter neue
 *   Personen. Ein Auseinanderlaufen waere also LAUT, nicht still; das ist
 *   Absicht.
 */
function cc_namensschluessel( string $roh ): string {
	$t = strtolower( $roh );
	$t = strtr( $t, array( 'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss' ) );
	$t = preg_replace( '/[^a-z ]+/u', ' ', $t );
	$teile = array_values( array_filter( explode( ' ', (string) $t ) ) );
	sort( $teile );
	return implode( ' ', $teile );
}

/**
 * Liegt eine ZWEITE Kopie dieses Plugins im selben Ordner?
 *
 * ⚠ ⚠  DIE FRAGE, DIE DREIMAL EINEN ABEND GEKOSTET HAT — 09.09., 10.09.
 *       und 11.09.2026. Jedes Mal antwortete eine Datei, die niemand
 *       gemeint hatte, und jedes Mal sagte /status „bereit".
 *
 *       Zuletzt lagen in mu-plugins:
 *         fch-clubcampus-empfaenger.php   0.9.20
 *         wp-export-empfaenger.php        0.9.11   ← diese antwortete
 *
 * ⚠ ⚠  UND `empfaenger` HAT NICHT GEHOLFEN, obwohl es genau dafuer
 *       gebaut war. Es meldet `basename(__FILE__)` — und die antwortende
 *       Datei trug den ERWARTETEN Namen. **Die Kopie mit dem
 *       unerwarteten Namen war die richtige.** Ein Name unterscheidet
 *       nur, wenn der Falsche auffaellt.
 *
 *       > Eine Fassungsangabe, die aus dem geladenen Code stammt, sagt
 *       > nichts darueber, WELCHE Datei geladen wurde. Sie ist korrekt
 *       > und beantwortet die falsche Frage. (Didi, 11.09.2026)
 *
 * ⚠  DESHALB SIEHT SIE IN DEN ORDNER, nicht in sich selbst. Das ist die
 *    einzige Auskunft, die eine Datei ueber ihre Geschwister geben kann —
 *    und sie beantwortet von innen, wofuer es sonst einen `find` auf dem
 *    Server braucht.
 *
 * ⚠  Erkannt wird an der Routen-Konstante im Quelltext, nicht am
 *    Dateinamen: der Name ist beliebig, die Route ist es nicht. Genau
 *    daran ist die Suche zuletzt gescheitert.
 *
 * Sie liest nur und gibt nie einen Pfad ausserhalb von wp-content heraus.
 */
function cc_geschwister(): array {
	$ordner = dirname( __FILE__ );
	$mich   = basename( __FILE__ );
	$raus   = array();
	foreach ( (array) glob( $ordner . '/*.php' ) as $datei ) {
		if ( basename( (string) $datei ) === $mich ) {
			continue;
		}
		/* ⚠ Nur der Anfang: die Datei kann gross sein, und die Kennzeichen
		   stehen im Kopf. 8 KB reichen fuer Kopf, Version und Routen. */
		/* ⚠ ⚠ EIN SYMLINK WIRD GEZAEHLT, NICHT VERFOLGT. Verfolgen hiesse,
		   eine Datei ausserhalb dieses Ordners zu lesen und ihren Pfad zu
		   melden — eine Preisgabe ohne Gegenwert. Dass hier ein Verweis
		   liegt, ist die Auskunft; wohin er zeigt, ist Sache des Servers. */
		if ( is_link( (string) $datei ) ) {
			$raus[] = array( 'datei' => basename( (string) $datei ),
								 'version' => null, 'art' => 'verweis' );
			continue;
		}

		$kopf = @file_get_contents( (string) $datei, false, null, 0, 8192 );

		/* ⚠ ⚠ UNLESBAR IST NICHT `KEIN GESCHWISTER`. file_get_contents gibt
		   bei fehlenden Rechten `false` zurueck — und die erste Fassung hat
		   das uebersprungen, also wie `gibt es nicht` behandelt. **Damit
		   waere ausgerechnet die Datei unsichtbar geblieben, die jemand
		   absichtlich weggesperrt hat.** Dieselbe Verwechslung, die an
		   diesem Tag viermal Zeit gekostet hat. */
		if ( false === $kopf ) {
			$raus[] = array( 'datei' => basename( (string) $datei ),
								 'version' => null, 'art' => 'unlesbar' );
			continue;
		}

		if ( false === strpos( $kopf, 'clubcampus/v1' ) ) {
			continue;
		}
		$v = preg_match( '/Version:\\s*([0-9.]+)/', $kopf, $m ) ? $m[1] : '?';
		$raus[] = array(
			'datei'   => basename( (string) $datei ),
			'version' => $v,
			'art'     => 'kopie',
		);
	}
	return $raus;
}

function cc_personen_lage(): array {
	if ( ! post_type_exists( CC_TYP_PERSON ) ) {
		/* ⚠ null-Semantik wie bei cc_unterfelder(): „gibt es hier nicht"
		   ist KEINE Null. Wer beides gleich liest, meldet einen fehlenden
		   Beitragstyp als leeren Bestand. */
		return array( 'vorhanden' => false );
	}
	$ids = get_posts(
		array(
			'post_type'   => CC_TYP_PERSON,
			'post_status' => CC_TEAM_ZUSTAENDE,
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);
	/* ⚠ ⚠ VERGLEICHSMERKMALE STATT NAMEN.

	   Die Schnittmenge braucht drei Ebenen — Nummer, E-Mail, Name plus
	   Jahrgang. Die erste ist eine Zahl und harmlos. Fuer die zweite und
	   dritte geht ein SHA-256 hinaus, nie der Wert selbst: **eine Auskunft
	   ist kein Schreibvorgang und trotzdem eine Preisgabe.**

	   ⚠ EIN HASH VERGLEICHT NUR AUF GLEICHHEIT, und das ist hier die
	   richtige Richtung: er findet weniger Treffer als ein menschlicher
	   Abgleich. Damit wird `ohne_treffer` eher zu GROSS geschaetzt — die
	   Vorschau sagt also im Zweifel mehr neue Datensaetze voraus, als
	   entstehen. **Von zwei Fehlerrichtungen ist das die bezahlbare:** wer
	   zu viele erwartet, sieht genauer hin; wer zu wenige erwartet, drueckt.

	   ⚠ Die Normalisierung muss auf BEIDEN Seiten dieselbe sein. Sie steht
	   deshalb hier ausgeschrieben und in `personenAbgleich.ts` noch einmal,
	   mit einem Testfall, der beide gegeneinander haelt. */
	$nummern  = array();
	$merkmale = array();
	$ohne    = 0;
	foreach ( $ids as $id ) {
		$nr = trim( (string) get_post_meta( (int) $id, 'sfv_person_id', true ) );

		/* E-Mail und Jahrgang als Hash — nie im Klartext.

		   ⚠ ⚠  ZWEI FALSCHE FELDNAMEN, GEMESSEN AM 12.09.2026 — und sie waren
		   es seit 0.9.20, also in JEDER Fassung, die je gelaufen ist:

		     hier stand 'email'         → Fields/person.php:302 heisst 'mail'
		     hier stand 'geburtsdatum'  → gibt es an der Person NICHT

		   Damit waren `email_hash` und `name_hash` fuer JEDE Person `null`.
		   Zwei von drei Achsen des Abgleichs trugen nichts — und eine Null auf
		   einer Achse, die gar nichts traegt, sieht aus wie ein Messergebnis.

		   ⚠ ⚠  DIE ZWEI FEHLER SIND VERSCHIEDENER ART, und nur der erste ist
		   eine Umbenennung:

		     'email' → 'mail'   ein NAME. Behoben, die Achse traegt wieder.
		     'geburtsdatum'     eine FEHLENDE ANGABE. Es gibt kein ACF-Feld,
		                        weder `geburtsdatum` noch `jahrgang`, und
		                        Werkzeuge/personen-import.php:1053 ueberspringt
		                        die Spalte ausdruecklich (`continue`).

		   **Der Jahrgang steht an einer Person nirgends.** `name_hash` bleibt
		   deshalb `null`, und das ist richtig — einen Wert zu erfinden waere
		   schlimmer als keiner. Was fehlte, war die ANSAGE: siehe
		   `merkmale_nutzbar` weiter unten.

		   ⚠ Gelesen wird ueber `get_post_meta` und nicht ueber
		   `cc_feld_schluessel()`: hier wird nichts geschrieben. Wer das
		   aendert, aendert die Begruendung mit. */
		/* ⚠ ⚠  UEBER DEN SCHLUESSEL, NICHT UEBER DEN NAMEN — 13.09.2026.
		   Der Theme-Chat hat gemessen: `mail` gibt es ZWEIMAL, einmal am
		   fch_person (`f_p_mail`) und einmal an der Taxonomie fch_funktion
		   (`f_fn_mail`). Das zweite gehoert einem AMT, nicht einem Menschen.

		   ⚠ Es liegt in `termmeta`, und `get_post_meta` liest `postmeta` —
		   erreichen konnte es uns also nicht. **Aber das ist ein Zufall der
		   Speicherorte und keine Absicherung:** kaeme ein zweites `mail` je an
		   denselben Beitragstyp, traefe der Name unvorhersehbar. Genau dieser
		   Fall hat am 10.09.2026 einen Abend gekostet.

		   ⚠ Aufgeloest wird ueber `cc_feld_schluessel()`, nicht ueber eine
		   importierte Konstante `f_p_mail`: die Funktion liest die Feldgruppen
		   DIESES Beitrags und **verweigert bei Mehrdeutigkeit**. Ein fremder
		   Schluessel im Quelltext waere eine zweite Wahrheit, die veraltet,
		   ohne dass etwas fehlschlaegt.

		   ⚠ Findet sich kein Schluessel, wird NICHT auf den Namen
		   ausgewichen. Dann bleibt der Hash leer, `merkmale_nutzbar`
		   meldet 0, und `ohne_feldschluessel` nennt das Feld — sichtbar
		   statt still. */
		$mailKey = cc_feld_schluessel( (int) $id, 'mail' );
		if ( null === $mailKey ) {
			$GLOBALS['cc_ohne_feldschluessel']['mail'] = true;
		}
		$mail = ( null === $mailKey )
			? ''
			: strtolower( trim( (string) get_field( $mailKey, (int) $id ) ) );
		/* ⚠ Bleibt leer, solange es kein Jahrgangsfeld gibt. Die Zerlegung
		   steht hier, damit sie am Tag X nicht neu erfunden wird. */
		$geb  = '';
		$jahr = ( '' !== $geb && preg_match( '/(\d{4})/', $geb, $m ) ) ? $m[1] : '';
		$post = get_post( (int) $id );
		$name = $post ? cc_namensschluessel( (string) $post->post_title ) : '';

		$merkmale[] = array(
			'sfv_person_id' => '' === $nr ? null : $nr,
			'email_hash'    => '' === $mail ? null : hash( 'sha256', $mail ),
			'name_hash'     => ( '' === $name || '' === $jahr )
				? null : hash( 'sha256', $name . '|' . $jahr ),
		);
		if ( '' === $nr ) {
			$ohne++;
			continue;
		}
		$nummern[] = $nr;
	}
	sort( $nummern );
	return array(
		'vorhanden'   => true,
		'gesamt'      => count( $ids ),
		'mit_nummer'  => count( $nummern ),
		'ohne_nummer' => $ohne,
		'nummern'     => $nummern,
		/* ⚠ Je Person drei Merkmale, keines davon ein Klartext. Die
		   Schnittmenge rechnet die andere Seite — sie hat die 93. */
		'merkmale'    => $merkmale,
		/* ⚠ ⚠  WIE VIELE PERSONEN JE ACHSE UEBERHAUPT ETWAS TRAGEN — und das
		   ist der eigentliche Befund vom 12.09.2026, nicht die zwei
		   Feldnamen.

		   Zwei Achsen waren seit 0.9.20 fuer JEDE Person `null`, und die
		   Gegenseite bekam daraus eine Null geliefert. **Eine Null auf einer
		   Achse, die gar nichts traegt, ist von einem Messergebnis nicht zu
		   unterscheiden** — und genau das hat dazu gefuehrt, dass auch
		   `treffer_sfv = 0` in Zweifel geriet, obwohl DIESE Achse den
		   richtigen Feldnamen las.

		   > **Nicht feststellbar ist nicht dasselbe wie nichts gefunden.**

		   Steht hier `name_hash: 0`, ist jede Aussage ueber Namenstreffer
		   gegenstandslos, und man sucht nicht nach Treffern, sondern nach dem
		   Jahrgang. Dieselbe Bauart wie `halbzeit_nicht_pruefbar`. */
		'merkmale_nutzbar' => array(
			'sfv_person_id' => count( array_filter(
				$merkmale, static fn( $m ) => null !== $m['sfv_person_id'] ) ),
			'email_hash'    => count( array_filter(
				$merkmale, static fn( $m ) => null !== $m['email_hash'] ) ),
			'name_hash'     => count( array_filter(
				$merkmale, static fn( $m ) => null !== $m['name_hash'] ) ),
		),
	);
}

/**
 * Und dasselbe fuer Teams — die dritte Menge, nach der `bestand` bisher
 * nicht gefragt hat.
 *
 * ⚠ `cc_team_karte()` setzt bei Mehrdeutigkeit 0 ein; das wird hier
 *   getrennt ausgewiesen statt mitgezaehlt. Eine Zahl, die zwei Faelle
 *   zusammenwirft, ist keine Auskunft.
 */
function cc_teams_lage(): array {
	$karte     = cc_team_karte();
	$mehrfach  = 0;
	foreach ( $karte as $tid ) {
		if ( 0 === $tid ) {
			++$mehrfach;
		}
	}
	$alle = get_posts(
		array(
			'post_type'   => CC_TYP_TEAM,
			'post_status' => CC_TEAM_ZUSTAENDE,
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);
	return array(
		'gesamt'        => count( $alle ),
		'mit_sfv_id'    => count( $karte ) - $mehrfach,
		'sfv_id_doppelt' => $mehrfach,
		'ohne_sfv_id'   => count( $alle ) - count( $karte ),
	);
}

function cc_route_bestand(): WP_REST_Response {
	$fehlt = cc_voraussetzungen();
	if ( array() !== $fehlt ) {
		return new WP_REST_Response(
			array( 'fehler' => 'Voraussetzungen fehlen', 'fehlt' => $fehlt ),
			503
		);
	}

	$zeilen    = array();
	$ohne      = 0;
	$ohne_publ = 0;

	foreach ( cc_abgleich_kandidaten() as $mid => $postId ) {
		$post   = get_post( $postId );
		$lauf   = trim( (string) get_post_meta( $postId, CC_META_LAUF, true ) );
		$erst   = trim( (string) get_post_meta( $postId, CC_META_ERST, true ) );
		/* ⚠ Siehe `cc_voraussetzungen()`: `(int)` auf ein Array ist die 1. */
		$teamId = fch_core_beitrags_id( get_field( 'fch_team', $postId ) );
		$status = $post ? (string) $post->post_status : '?';

		$fraglich = ( '' === $lauf );
		if ( $fraglich ) {
			$ohne++;
			if ( 'publish' === $status ) {
				$ohne_publ++;
			}
		}

		$zeilen[] = array(
			'beitrag_id'       => (int) $postId,
			'titel'            => $post ? (string) $post->post_title : '',
			'status'           => $status,
			'sfv_match_id'     => (string) $mid,
			'team'             => $teamId ? get_the_title( $teamId ) : '',
			/* ⚠ post_date ist zuverlaessig (wp_insert_post setzt es).
			   post_modified waere es NICHT — siehe CC_META_LAUF. Es steht
			   deshalb gar nicht erst hier: ein Feld, das jemand fuer
			   „zuletzt angefasst" haelt, richtet mehr Schaden an, als es
			   nuetzt.

			   ⚠ get_post_time('c', true) statt post_date_gmt: das liefert
			   ISO8601 MIT Zone. `post_date_gmt` und `post_date` sehen
			   identisch aus („2026-09-05 17:20:00") und unterscheiden sich um
			   den Zeitzonenversatz der Website — wer die zwei spaeter
			   verwechselt, verschiebt jeden Zeitpunkt um zwei Stunden, und
			   nichts schlaegt fehl. Steht die Zone IM WERT, kann die
			   Verwechslung nicht entstehen. */
			'angelegt'         => (string) get_post_time( 'c', true, $postId ),
			'lauf_zuletzt'     => $lauf,
			'lauf_erst'        => $erst,
			'ohne_laufstempel' => $fraglich,
			'bearbeiten_url'   => get_edit_post_link( $postId, 'raw' ),
		);
	}

	usort(
		$zeilen,
		static function ( array $a, array $b ): int {
			/* Die fraglichen zuerst, darin die veroeffentlichten zuerst —
			   die Reihenfolge ist die Dringlichkeit. */
			if ( $a['ohne_laufstempel'] !== $b['ohne_laufstempel'] ) {
				return $a['ohne_laufstempel'] ? -1 : 1;
			}
			if ( $a['status'] !== $b['status'] ) {
				return 'publish' === $a['status'] ? -1 : 1;
			}
			return strcmp( (string) $a['angelegt'], (string) $b['angelegt'] );
		}
	);

	/* ⚠ ⚠  `wappen` IST DIE LISTE — BERICHTIGT AM 23.09.2026, NACH DEM
	   ERSTEN ECHTEN WAPPENLAUF.

	   Bis 0.9.32 stand in der Antwort:

	   > ~~'wappen' => cc_wappen_lage(),~~   (0.9.29 bis 23.09.2026)

	   Damit lag unter `wappen` der ganze Zaehlerblock — ein Objekt. Der
	   Vertrag mit ClubCampus lautet aber auf eine LISTE aus
	   `{ sfv_team_id, sha256 }`. Die Gegenstelle meldete «Die Gegenstelle
	   meldet unter «wappen» keine Liste», `bestand_lage` blieb «unlesbar»,
	   und der erste Lauf schickte **nichts**.

	   > Ein Objekt an der Stelle einer Liste ist keine magere Auskunft,
	   > sondern eine unlesbare. Es fiel zwischen 0.9.29 und heute nicht
	   > auf, weil bis zum ersten echten Lauf niemand drueben hinsah.

	   ⚠ **Die Zaehler gehen nicht verloren, sie ruecken einen Schluessel
	   weiter** — nach `wappen_lage` daneben. Sie in `wappen` zu belassen
	   und die Liste darunter zu haengen, hiesse denselben Vertrag noch
	   einmal zu brechen; sie wegzulassen naehme dem Verein die einzige
	   Stelle, an der «elf Teams, null Nummern» ueberhaupt steht.

	   ⚠ **`array_values()` und nicht `$lage['teams']` direkt.** Aus einem
	   PHP-Array mit Luecken in den Schluesseln macht `json_encode` still
	   ein OBJEKT — und zwar ohne Fehler, ohne Warnung und ohne dass hier
	   etwas anders aussieht. Heute entstehen in `cc_wappen_lage()` keine
	   Luecken; die naechste Filterzeile dort erzeugt sie, und der Befund
	   fiele wieder erst drueben auf.

	   ⚠ Gemessen, nicht angenommen (23.09.2026, im wp-Container):
	     `json_encode( array( 0 => …, 2 => … ) )` → `{"0":…,"2":…}`
	     `json_encode( array_values( … ) )`       → `[…]`
	     `json_encode( array() )`                 → `[]`
	   Die leere Liste ist also schon ohne Zutun `[]`; `array_values()`
	   sichert den FUELLTEN Fall.

	   ⚠ Zwei Stellen in dieser Datei haben denselben Schutz aus eigenem
	   Anlass: `cc_route_wappen()` legt `array_values()` auf die
	   EINGEHENDE Liste (die Gegenstelle koennte Luecken schicken), und
	   `cc_verlust_bericht()` baut die Map ausdruecklich zur Liste um —
	   mit der Begruendung, dass ein Schluessel, dessen Typ sich mit dem
	   Inhalt aendert, beim Auswerten teurer ist als ein paar Zeichen. */
	$cc_wappen_lage = cc_wappen_lage();
	$cc_wappen      = array_values( (array) ( $cc_wappen_lage['teams'] ?? array() ) );
	unset( $cc_wappen_lage['teams'] );

	return new WP_REST_Response(
		array(
			'gesamt'                    => count( $zeilen ),
			'ohne_laufstempel'          => $ohne,
			'ohne_laufstempel_sichtbar' => $ohne_publ,
			/* ⚠ Die Gegenprobe auf die Besitzregel: Beitraege OHNE
			   sfv_match_id fasst der Export nie an. Bleibt diese Zahl
			   konstant, hat er die Grenze eingehalten. */
			'handbeitraege'             => cc_zaehle_handbeitraege(),
			/* ⚠ ⚠ SEIT 0.9.18. Bis dahin hiess die Route `bestand` und
			   beantwortete nur die Spielfrage — und die Karte im Portal
			   musste dazuschreiben, was sie NICHT zeigt. Ein Knopf, der
			   seinen eigenen Zuschnitt entschuldigen muss, ist am falschen
			   Zuschnitt gebaut. */
			/* ⚠ ⚠ WER ANTWORTET HIER — seit 0.9.19 in JEDER Antwort, nicht
			   nur in /status. Am 11.09.2026 zeigte die Karte lauter Nullen,
			   und es gab keine Moeglichkeit zu unterscheiden, ob drueben eine
			   aeltere Fassung antwortet oder ob wirklich nichts dasteht.
			   Eine Auskunft, die ihre eigene Herkunft verschweigt, laesst
			   genau die Frage offen, die man bei einem ueberraschenden Wert
			   zuerst stellt. */
			'empfaenger'                => basename( __FILE__ ),
			'geschwister'               => cc_geschwister(),
			'version'                   => CC_VERSION,
			'personen'                  => cc_personen_lage(),
			'teams'                     => cc_teams_lage(),
			/* ⚠ Seit 0.9.29. Die Gegenstelle braucht je Team die Summe, um
			   zu entscheiden, was sie schicken MUSS — ohne sie schickt sie
			   jedes Mal alles, und `unveraendert` waere die haeufigste
			   Antwort statt der seltensten.

			   ⚠ Eine LISTE, und leer ist sie `[]` und nicht `{}` — die
			   Begruendung steht oben bei `$cc_wappen`. */
			'wappen'                    => $cc_wappen,
			/* ⚠ Die Zaehler zu derselben Sache: `teams_gesamt`,
			   `teams_ohne_sfv_id`, `mit_wappen`, `ohne_wappen`,
			   `wappen_verloren` und `ohne_team`. Sie standen bis 0.9.32
			   zusammen mit der Liste unter `wappen` — siehe oben.

			   ⚠ Ein eigener Schluessel und kein Anhaengsel an die Zeilen:
			   `teams_ohne_sfv_id` zaehlt die Teams, die in der Liste GAR
			   NICHT vorkommen. Eine Zahl ueber Abwesende hat in keiner
			   Zeile Platz. */
			'wappen_lage'               => $cc_wappen_lage,
			/* ⚠ Seit 0.9.30. Damit die Gegenstelle nach ihrem Deploy sehen
			   kann, ob die zwei neuen Felder ANKOMMEN — ohne diese Zahl
			   bliebe nur die Website als Anzeige, und dort faellt ein
			   fehlendes Feld als Platzhalter gar nicht auf. */
			'sfv_nummern'               => cc_sfv_nummern_lage(),
			'beitraege'                 => $zeilen,
		),
		200
	);
}

/** fch_spiel-Beitraege OHNE sfv_match_id — die, die dem Export nicht gehoeren. */
function cc_zaehle_handbeitraege(): int {
	$alle = get_posts(
		array(
			'post_type'        => CC_TYP_SPIEL,
			'post_status'      => array( 'publish', 'draft', 'pending', 'private' ),
			'numberposts'      => -1,
			'fields'           => 'ids',
			'suppress_filters' => false,
		)
	);
	return count( $alle ) - count( cc_abgleich_kandidaten() );
}


/* ═══════════════════════════════════════════════════════════════════════
   SPIELE
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Nutzlast:
 *   {
 *     "lauf":   "2026-09-05T16:32:00Z",
 *     "teams":  ["38309", "38301"],     // Abgleichbereich: NUR diese Teams
 *     "spiele": [ { sfv_match_id, datum, ... , verlauf: [...] }, ... ]
 *   }
 *
 * ⚠ `teams` ist nicht Zierrat, sondern die Grenze des Aufraeumens. Nur
 *   Beitraege, deren Team darin steht, kommen fuer einen Rueckzug in Frage.
 *   Liefert der Abgleich wegen eines halben Ausfalls nur zwei von einundzwanzig
 *   Mannschaften, bleiben die uebrigen neunzehn unberuehrt — dieselbe Lehre
 *   wie beim Ranglisten-Abgleich des SFV-Sync.
 */
function cc_route_spiele( WP_REST_Request $req ) {
	/* ⚠ AUCH EIN ABGEBROCHENER EMPFANG WIRD ABGELEGT. Diese zwei Abbrueche
	   sind von hier aus sonst unsichtbar: die Gegenstelle sieht 503
	   beziehungsweise 400, der Verein sieht nichts. */
	$fehlt = cc_voraussetzungen();
	if ( array() !== $fehlt ) {
		cc_bericht_ablegen(
			'spiele',
			array(
			'neu' => 0,
			'geaendert' => 0,
			'unveraendert' => 0,   // seit 26.09.2026; siehe cc_bericht_ablegen()
			'zurueckgezogen' => 0,
			'verlauf_zeilen' => 0,
			'uebersprungen' => cc_bericht_deckel( array() ),
			'mehrfach' => cc_bericht_deckel( array() ),
				'hinweis' => array( 'Abgewiesen: Voraussetzungen fehlen — ' . implode( ', ', $fehlt ) ),
			)
		);

		return new WP_REST_Response(
			array( 'fehler' => 'Voraussetzungen fehlen', 'fehlt' => $fehlt ),
			503
		);
	}

	/* ── Zeitschutz (0.9.0) ────────────────────────────────────────────
	   ⚠ `@` mit Absicht: manche Hoster verbieten die Funktion, und dann
	   soll der Aufruf nichts tun statt eine Warnung in die Antwort zu
	   schreiben. **Ob er greift, sagt `/status` unter `zeitlimit`** —
	   ohne diese Auskunft waere der Schutz eine Behauptung. */
	@set_time_limit( 300 );

	/* Der Stand fuer den Abbruchbericht. Ab hier weiss
	   cc_bericht_notfalls(), dass diese Route lief. */
	$GLOBALS['cc_lauf_stand'] = array(
		'weg' => 'spiele', 'start' => microtime( true ),
		'verarbeitet' => 0, 'erwartet' => 0, 'letztes_spiel' => '',
	);

	$daten  = $req->get_json_params();
	$spiele = is_array( $daten['spiele'] ?? null ) ? $daten['spiele'] : null;
	$teams  = is_array( $daten['teams'] ?? null ) ? $daten['teams'] : null;
	/* ⚠ Steht seit dem ersten Entwurf in der Nutzlast und wurde bis zum
	   07.09.2026 nie gelesen. Fehlt er, wird nicht gestempelt — nicht
	   ersatzweise die eigene Uhr genommen: ein Stempel, der vom Empfaenger
	   stammt, behauptet eine Zuordnung zu einem Lauf, die er nicht kennt. */
	$lauf   = trim( (string) ( $daten['lauf'] ?? '' ) );

	/* ⚠ Ein fehlendes `teams` ist ein Abbruch und kein leerer Satz. Als
	   leerer Satz gelesen, waere der Abgleichbereich leer — harmlos. Als
	   „alle" gelesen, raeumte ein unvollstaendiger Lauf den halben Spielplan
	   ab. Deshalb: gar nicht raten. */
	if ( null === $spiele || null === $teams ) {
		cc_bericht_ablegen(
			'spiele',
			array(
			'neu' => 0,
			'geaendert' => 0,
			'unveraendert' => 0,   // seit 26.09.2026; siehe cc_bericht_ablegen()
			'zurueckgezogen' => 0,
			'verlauf_zeilen' => 0,
			'uebersprungen' => cc_bericht_deckel( array() ),
			'mehrfach' => cc_bericht_deckel( array() ),
				'hinweis' => array( 'Abgewiesen: «spiele» und «teams» sind Pflicht — die Nutzlast fuehrte sie nicht.' ),
			)
		);

		return new WP_REST_Response(
			array( 'fehler' => 'spiele und teams sind Pflicht' ),
			400
		);
	}

	/* ⚠ ⚠ VORBELEGT, NICHT ERST BEIM ERSTEN VORKOMMEN ANGELEGT. Ein
	   fehlender Schluessel waere von einer Null nicht zu unterscheiden —
	   und genau diese Verwechslung ist der Anlass fuer die zwei Zaehler:
	   „kein Wert" und „null Zeilen" sahen bis 0.9.10 gleich aus, naemlich
	   wie gar nichts.

	   ⚠ Als Globals und nicht in $erg, weil gezaehlt wird, WO geschrieben
	   wird (cc_schreibe_felder) — dort steht als einziger Stelle fest,
	   dass update_field wirklich lief. Ein Zaehler im Aufrufer haette die
	   Zeilen mitgezaehlt, die am fehlenden Feldschluessel gescheitert
	   sind. */
	$GLOBALS['cc_aufstellung_zeilen'] = 0;
	$GLOBALS['cc_aufstellung_spiele'] = 0;
	$GLOBALS['cc_aufstellung_je_spiel'] = array();
	/* ⚠ LEER INITIALISIERT, nicht erst beim ersten Treffer angelegt. Sonst
	   waere „kein Eintrag" von „nicht gemessen" nicht zu unterscheiden —
	   dieselbe Verwechslung, die die zwei Zaehler daneben ueberhaupt
	   veranlasst hat. */
	$GLOBALS['cc_verlust'] = cc_verlust_leer();
	$GLOBALS['cc_unbeachtete_unterfelder'] = array();
	$GLOBALS['cc_unterfelder_ohne_acf'] = array();
	$GLOBALS['cc_unterfelder_unbekannt'] = array();
	$GLOBALS['cc_unterfelder_geprueft'] = array();

	$vorhanden = cc_abgleich_kandidaten();
	$teamKarte = cc_team_karte();

	$erg = array(
		/* ⚠ ⚠  `aktualisiert` ZAEHLT SEIT DEM 26.09.2026 NUR NOCH SPIELE,
		   AN DENEN WIRKLICH GESCHRIEBEN WURDE.
		   > ~~«$erg['aktualisiert']++» stand im else-Zweig der Schleife und
		   > zaehlte JEDEN bestehenden Beitrag~~ — bis 0.9.38, 26.09.2026.
		   Die Zahl war damit dasselbe wie „gefunden" und sagte ueber Arbeit
		   nichts: 63 von 63 „aktualisiert", geaendert hatte sich keines.

		   `unveraendert` ist die Gegenzahl: Pruefsumme gleich, also nicht
		   geschrieben. Zusammen ergeben `neu + aktualisiert + unveraendert
		   + uebersprungen` wieder die Zahl der gelieferten Spiele — sonst
		   saehe die Ersparnis wie ein Verlust aus. */
		'neu' => 0, 'aktualisiert' => 0, 'unveraendert' => 0,
		'zurueckgezogen' => 0,
		'uebersprungen' => 0, 'verlauf_zeilen' => 0,
		'ohne_team' => array(), 'doppelte_teams' => array(),
		'moegliche_dubletten' => array(), 'fehler' => array(),
		/* ⚠ Feldnamen, die ankommen und niemand schreibt — die zweite
		   Richtung der Allowlist. Siehe cc_unbeachtete_felder(). */
		'unbeachtete_felder' => array(),
	);

	/* ⚠ Namentlich, nicht nur gezaehlt. Eine Zahl sagt „21 uebersprungen"
	   und schickt niemanden irgendwohin; der Grund je Fall tut es. */
	$uebersprungen = array();
	$geliefert     = array();
	$erlaubteTid = array();
	foreach ( $teams as $sfv ) {
		$tid = $teamKarte[ (string) $sfv ] ?? null;
		if ( null === $tid ) {
			$erg['ohne_team'][] = (string) $sfv;
			$uebersprungen[]    = array(
				'sfv_match_id' => '—',
				'grund'        => 'Mannschaft ' . (string) $sfv . ' hat auf dieser Website kein Team mit dieser sfv_id',
			);
			continue;
		}
		if ( 0 === $tid ) {
			$erg['doppelte_teams'][] = (string) $sfv;
			$uebersprungen[]         = array(
				'sfv_match_id' => '—',
				'grund'        => 'Mannschaft ' . (string) $sfv . ' ist mehreren Team-Beitraegen zugeordnet',
			);
			continue;
		}
		$erlaubteTid[ $tid ] = true;
	}

	$GLOBALS['cc_lauf_stand']['erwartet'] = count( $spiele );
	foreach ( $spiele as $spiel ) {
		/* ⚠ VOR der Arbeit hochzaehlen und die Id merken: reisst das
		   Zeitlimit mitten in diesem Durchgang, nennt der Bericht genau
		   das Spiel, bei dem es passierte. Danach hochzuzaehlen naennte
		   das vorige — und schickte die Suche einen Schritt daneben. */
		$GLOBALS['cc_lauf_stand']['verarbeitet']++;
		$GLOBALS['cc_lauf_stand']['letztes_spiel'] =
			(string) ( $spiel['sfv_match_id'] ?? '' );
		if ( ! is_array( $spiel ) ) {
			continue;
		}
		$mid = trim( (string) ( $spiel['sfv_match_id'] ?? '' ) );

		/* ⚠ Ohne Schluessel wird nichts geschrieben. Ein Spiel ohne
		   sfv_match_id waere spaeter nicht wiederzufinden und beim naechsten
		   Lauf ein zweites Mal angelegt. */
		if ( '' === $mid ) {
			$erg['fehler'][]  = 'Spiel ohne sfv_match_id uebersprungen';
			$uebersprungen[]  = array(
				'sfv_match_id' => '—',
				'grund'        => 'Spiel ohne sfv_match_id — spaeter nicht wiederzufinden',
			);
			continue;
		}
		$geliefert[ $mid ] = true;

		/* ⚠ Der Export schickt die SFV-TEAMNUMMER, nicht die Beitrags-Id.
		   Aufgeloest wird hier, weil hier die Zuordnung liegt: `sfv_id` ist
		   am Team-Beitrag nicht ueber REST lesbar und soll es auch nicht
		   werden. Wer die Tatsache besitzt, loest sie auf. */
		$sfv    = trim( (string) ( $spiel['sfv_team_id'] ?? '' ) );
		$teamId = $teamKarte[ $sfv ] ?? 0;
		if ( ! $teamId || ! isset( $erlaubteTid[ $teamId ] ) ) {
			$erg['uebersprungen']++;
			continue;
		}
		/* ⚠ ⚠  DIE PRUEFSUMME WIRD GENAU HIER GEBILDET — 26.09.2026.
		   ─────────────────────────────────────────────────────────────
		   An dieser Zeile ist `$spiel` zum LETZTEN Mal genau das, was
		   ClubCampus geliefert hat. Zwei Zeilen tiefer kommt `fch_team`
		   hinein, weiter unten `quelle` — beides Werte des Empfaengers.
		   Haengte der Hash daran, meldete er eine Aenderung, sobald wir
		   etwas anders machen, und die Frage, die er beantworten soll
		   („hat sich die LIEFERUNG geaendert?"), waere eine andere.

		   Weiter oben als hier ginge es auch, kostete aber: die beiden
		   `continue` darueber (kein Schluessel, fremdes Team) werfen das
		   Spiel weg, und ein Hash ueber ein weggeworfenes Spiel ist
		   Rechenzeit ohne Leser. Siehe cc_pruefsumme(). */
		$pruefsumme = cc_pruefsumme( $spiel );

		/* ⚠ ⚠  HIERHIN GEZOGEN AM 26.09.2026 — VOR das Ueberspringen.
		   > ~~Die Schleife stand unter `$spiel['quelle'] = CC_QUELLE;` mit
		   > dem Satz «VOR dem Schreiben, und aus der Nutzlast wie sie kam:
		   > `quelle` setzen wir selbst, das gehoert nicht in die
		   > Meldung.»~~ — bis 0.9.38.

		   Zwei Gruende fuer den Umzug. Erstens war der Satz dort schon
		   nicht mehr wahr: `quelle` war eine Zeile FRUEHER gesetzt worden;
		   dass die Meldung trotzdem stimmte, lag allein daran, dass
		   `quelle` und `fch_team` beide in CC_FELDER stehen und damit als
		   „beachtet" gelten. Zweitens, und das ist der Anlass: unten
		   laeuft die Zeile fuer ein uebersprungenes Spiel gar nicht mehr.
		   Die Liste `unbeachtete_felder` beantwortet aber die Frage „ist
		   das Feld angekommen und wurde es verworfen?" — sie muss JEDE
		   Lieferung sehen, nicht nur die geschriebene. Sonst verstummte
		   sie nach dem ersten Lauf und saehe aus wie „alles in Ordnung".

		   ⚠ Sie schreibt nichts und kostet keine Abfrage: ein `array_diff`
		   ueber die obersten Schluessel. Siehe cc_unbeachtete_felder(). */
		foreach ( cc_unbeachtete_felder( $spiel ) as $f ) {
			$erg['unbeachtete_felder'][ $f ] = true;
		}

		/* Die Beitrags-Id ist ein WordPress-Wert und gehoert erst ab hier in
		   die Nutzlast — der Export kennt sie nie. */
		$spiel['fch_team'] = $teamId;

		$postId = $vorhanden[ $mid ] ?? 0;

		if ( ! $postId ) {
			/* ⚠ Titel bewusst leer: fch-core leitet ihn ab, und wir stossen
			   das unten an. Ein eigener Titel waere eine zweite Regel. */
			$postId = wp_insert_post(
				array(
					'post_type'   => CC_TYP_SPIEL,
					'post_status' => ( $spiel['publizieren'] ?? true ) ? 'publish' : 'draft',
					'post_title'  => '',
				),
				true
			);
			if ( is_wp_error( $postId ) ) {
				$erg['fehler'][] = 'Spiel ' . $mid . ': ' . $postId->get_error_message();
				continue;
			}
			$erg['neu']++;
			cc_pruefe_dublette( (int) $postId, $spiel, $erg );
		} else {
			/* ⚠ ⚠  DER SPARSCHALTER — 26.09.2026, ANLASS LAUFZEIT  ⚠ ⚠
			   ──────────────────────────────────────────────────────────
			   > ~~«$erg['aktualisiert']++;» als erste Zeile dieses
			   > Zweiges~~ — bis 0.9.38. Sie zaehlte jeden BESTEHENDEN
			   > Beitrag, ob geschrieben wurde oder nicht.

			   Darunter entscheidet die Pruefsumme, ob ueberhaupt
			   geschrieben wird. Sie deckt nur die Lieferung; siehe
			   CC_META_PRUEFSUMME und cc_pruefsumme().

			   ⚠ ⚠  UND DIE GEFAEHRLICHSTE FALLE DIESES UMBAUS: `$geliefert[
			   $mid ] = true;` steht WEITER OBEN in der Schleife und gilt
			   auch fuer jedes uebersprungene Spiel. **Ein uebersprungenes
			   Spiel ist geliefert.** Stuende das Merkzeichen hier unten,
			   zoege der Rueckzug weiter unten genau die Spiele als
			   Entwurf ein, die wir gerade gespart haben — und die Ersparnis
			   waere ein halber Spielplan. */
			$pruefAlt = (string) get_post_meta( (int) $postId, CC_META_PRUEFSUMME, true );
			/* ⚠ Beide Seiten muessen einen Wert haben. Ein fehlendes Meta
			   liest sich als '', und eine nicht bestimmbare Pruefsumme ist
			   ebenfalls '' — ohne die erste Bedingung wuerden zwei
			   Unbekannte einander als „gleich" bestaetigen und ein nie
			   geschriebenes Spiel uebersprungen. */
			$gleich = ( '' !== $pruefsumme && $pruefsumme === $pruefAlt );

			$statusIst  = (string) get_post_status( $postId );
			$zurueck    = ( false === ( $spiel['publizieren'] ?? true ) );
			$statusSoll = $zurueck ? 'draft' : 'publish';

			/* Status 12 des Verbands ("keine Publikation"): zurueckziehen.
			   ⚠ Unveraendert in der Sache und ABSICHTLICH vor der
			   Pruefsumme: wer den Beitrag von Hand wieder veroeffentlicht
			   hat, soll ihn beim naechsten Lauf wieder als Entwurf
			   vorfinden. Neu ist nur, dass wir vorher nachsehen — ein
			   `wp_update_post()` auf einen Beitrag, der schon Entwurf ist,
			   schreibt `post_modified` fort und sagt nichts aus. */
			$statusGeschrieben = false;
			if ( $zurueck && 'draft' !== $statusIst ) {
				wp_update_post( array( 'ID' => $postId, 'post_status' => 'draft' ) );
				$statusIst         = 'draft';
				$statusGeschrieben = true;
			}

			/* ⚠ ⚠  DIE GEGENRICHTUNG — NEU AM 26.09.2026, AUSDRUECKLICH SO
			   BESTELLT. Ein Spiel, das ein frueherer Lauf nicht geliefert
			   bekam, steht als Entwurf da (siehe Rueckzug weiter unten).
			   Kommt es zurueck und hat sich nichts geaendert, wuerde es der
			   Sparschalter ueberspringen — und der Entwurf bliebe fuer
			   immer. **Die Ersparnis wuerde den Rueckzug festschreiben.**
			   Also: veroeffentlichen, und NUR das. Die Felder stimmen ja;
			   die Pruefsumme wird erst nach einem vollstaendigen Schreiben
			   abgelegt.

			   ⚠ Nur aus `draft`, nicht aus `pending` oder `private`: die
			   beiden setzt kein Lauf, sondern die Redaktion. Was wir nicht
			   angerichtet haben, raeumen wir nicht weg.

			   ⚠ Gezaehlt als `aktualisiert`, nicht als `unveraendert`: am
			   Beitrag wurde geschrieben. `unveraendert` heisst „nichts
			   angefasst", und das waere hier falsch. */
			if ( ! $zurueck && $gleich && 'draft' === $statusIst ) {
				wp_update_post( array( 'ID' => $postId, 'post_status' => 'publish' ) );
				cc_stempel( (int) $postId, $lauf );
				$erg['aktualisiert']++;
				continue;
			}

			/* ⚠ ⚠  HIER WIRD GESPART. Gleiche Pruefsumme und der Status
			   ist der, den die Lieferung verlangt → nichts schreiben.

			   ⚠ DER LAUFSTEMPEL BLEIBT — ENTSCHIEDEN AM 26.09.2026.
			   `cc_stempel()` ist „Buchhaltung, kein Inhalt": ein einziges
			   `update_post_meta`, und es sagt „in diesem Lauf gesehen".
			   Fiele er hier weg, saehe ein unveraendertes Spiel genauso aus
			   wie eines, das gar nicht geliefert wurde — und `_cc_lauf` ist
			   genau das Merkmal, an dem Waisen und Probelaeufe erkannt
			   werden (siehe CC_META_LAUF). Die Ersparnis machen die ACF-
			   Schreibwege aus, nicht dieses eine Meta. */
			if ( $gleich && $statusIst === $statusSoll ) {
				cc_stempel( (int) $postId, $lauf );
				/* ⚠ Der Rueckzug drei Zeilen weiter oben IST ein
				   Schreibvorgang. Er kommt nur vor, wenn jemand den
				   Beitrag von Hand wieder veroeffentlicht hatte — selten,
				   aber dann waere `unveraendert` gelogen: am Beitrag hat
				   sich etwas bewegt. Die Felder bleiben trotzdem
				   ungeschrieben, denn die Lieferung ist dieselbe. */
				if ( $statusGeschrieben ) {
					$erg['aktualisiert']++;
				} else {
					$erg['unveraendert']++;
				}
				continue;
			}

			$erg['aktualisiert']++;
		}

		/* ⚠ Erst hier, also NACH der Pruefsumme: `quelle` ist eine Konstante
		   dieser Datei und kommt nicht aus der Lieferung. Geschrieben wird
		   sie trotzdem — sie steht in CC_FELDER. Siehe cc_pruefsumme(). */
		$spiel['quelle'] = CC_QUELLE;
		cc_schreibe_felder( (int) $postId, $spiel );
		cc_stempel( (int) $postId, $lauf );

		if ( is_array( $spiel['verlauf'] ?? null ) ) {
			$erg['verlauf_zeilen'] += cc_schreibe_verlauf(
				(int) $postId, $spiel['verlauf'],
				(string) ( $spiel['sfv_match_id'] ?? '' )
			);
		}

		cc_titel_nachziehen( (int) $postId );

		/* ⚠ ⚠  ZULETZT, UND DAS IST DIE GANZE SICHERHEIT DES VERFAHRENS.
		   Die Pruefsumme behauptet „dieser Beitrag traegt genau diese
		   Lieferung". Stuende sie weiter oben, wuerde ein Lauf, der im
		   Zeitlimit mitten zwischen Feldern und Verlauf abbricht, eine
		   Behauptung hinterlassen, die nicht stimmt — und der naechste Lauf
		   liesse das halb geschriebene Spiel in Ruhe, fuer immer. Erst
		   ablegen, wenn alles gelaufen ist: bricht es vorher, fehlt die
		   Pruefsumme, und das Spiel wird beim naechsten Mal eben noch
		   einmal geschrieben. Der teure Fehler ist der stille.

		   ⚠ Auch bei NEUEN Beitraegen — der Zweig darueber faellt hier
		   durch. Ohne das waere jedes neue Spiel im naechsten Lauf ohne
		   Pruefsumme und wuerde ein zweites Mal vollstaendig geschrieben.

		   ⚠ Leer heisst „nicht bestimmbar" und wird NICHT abgelegt; siehe
		   cc_pruefsumme(). Ein leeres Meta wuerde beim naechsten Lauf gegen
		   eine leere Pruefsumme verglichen. */
		if ( '' !== $pruefsumme ) {
			update_post_meta( (int) $postId, CC_META_PRUEFSUMME, $pruefsumme );
		}
	}

	/* ── Rueckzug ────────────────────────────────────────────────────────
	   ⚠ Zwei Bedingungen, beide verengend: der Beitrag muss dem Abgleich
	   gehoeren (sfv_match_id gesetzt — das ist $vorhanden) UND sein Team
	   muss in diesem Lauf geliefert worden sein. Nichts wird geloescht.

	   ⚠ **DIESE DATEI LIEFERT CLUBCAMPUS ALS GANZES.** Beim naechsten
	   Nachschub wird sie ERSETZT und nicht zusammengefuehrt — was hier
	   geaendert und drueben nicht nachgezogen wird, ist dann weg, ohne
	   Konflikt und ohne Meldung. */

	/* ⚠ ⚠  DIE VORAUSWAHL — 26.09.2026, ANLASS LAUFZEIT.
	   ─────────────────────────────────────────────────────────────────
	   > ~~«foreach ( $vorhanden as $mid => $postId ) { … $teamId =
	   >   fch_core_beitrags_id( get_field( 'fch_team', $postId ) ); … }»~~
	   > — so lief die Schleife bis heute, 26.09.2026.

	   `$vorhanden` sind ALLE rund 275 `fch_spiel` mit `sfv_match_id`.
	   Fuer jeden NICHT gelieferten lief `get_field()` — und das ist hier
	   der teure Teil: Feldgruppen aufloesen, Referenzzeile lesen, den
	   Wert durch `format_value` schicken, dazu `get_post_status()` mit
	   einem eigenen Beitragsabruf. Sieben Mannschaften brauchten rund
	   90 s bei einem Zeitlimit von 150 s. Reisst das Limit, bricht der
	   Lauf MITTEN im Rueckzug ab: ein Teil der Spiele steht auf `draft`,
	   der Rest nicht — und welcher Teil, sagt niemand.

	   Darum eine Metaabfrage VOR der Schleife. Sie ENTSCHEIDET nichts;
	   sie verkleinert nur die Menge, auf der die unveraenderten
	   Kriterien darunter entscheiden.

	   ⚠ ⚠  WARUM DIE ABFRAGE ZWEI FORMEN SUCHT.
	   `fch_team` steht im Postmeta ROH — und roh heisst hier zweierlei:

	     3972                    `f_s_team` ist ein `post_object`
	                             (fch-core `Fields/spiel.php:82`)
	     a:1:{i:0;s:4:"3972";}   `f_be_team` ist ein `relationship` —
	                             ACF legt eine Liste SERIALISIERT ab

	   Gemessen am 26.09.2026 im lokalen Pruefstapel ueber `wp_postmeta`:
	   `fch_spiel` 11 von 11 in der ersten Form, `post` 2 von 2 (und neun
	   Revisionen) in der zweiten. Am `fch_spiel` kommt die zweite HEUTE
	   also nicht vor — **aber sie kann dorthin geraten**: am 23.09.2026
	   stand die Referenzzeile `_fch_team` an 11 von 11 `fch_spiel` auf
	   `f_be_team` (der Absatz in der Schleife unten haelt den Fall fest).
	   Der `relationship`-Schluessel FINDET an diesen Beitrag, und wer
	   ueber ihn schreibt, legt die serialisierte Form ab.

	   Eine Abfrage mit `'compare' => 'IN'` auf die nackte Team-Id fande
	   sie dann nicht. Und ein Beitrag, den die Vorauswahl uebersieht,
	   wird NIE zurueckgezogen — stumm, ohne Fehlermeldung, mit einer
	   Antwort, die Erfolg meldet. Also `REGEXP` ueber beide Formen:

	     (^|:)"?(3972|4001)"?(;|$)

	       3972                die nackte Id, ganzer Wert
	       …;s:4:"3972";}      die serialisierte Zeichenkette
	       …;i:3972;}          die serialisierte Ganzzahl

	   Die Laengenangabe `s:3972:"…"` trifft es NICHT: darauf folgt ein
	   Doppelpunkt, das Muster verlangt ein Semikolon oder das Ende.

	   ⚠ **Zu weit darf die Vorauswahl sein, zu eng nie.** Traegt ein
	   Beitrag mehrere Teams, trifft das Muster ihn auch dann, wenn das
	   gelieferte nicht an erster Stelle steht; `fch_core_beitrags_id()`
	   nimmt den ersten, die Bedingung darunter faellt durch, der Beitrag
	   bleibt unangetastet — dasselbe Ergebnis wie bisher. Andersherum
	   waere es ein stiller Verlust.

	   ⚠ **Ohne gelieferte Mannschaft gar keine Abfrage.** Ein leeres
	   `$erlaubteTid` ergaebe das Muster `(^|:)"?()"?(;|$)`, und das
	   trifft JEDEN Wert — aus einer Verengung wuerde eine Oeffnung.
	   Heute zieht `isset( $erlaubteTid[ $teamId ] )` in diesem Fall
	   nichts zurueck, und genau das bleibt so.

	   ⚠ **Ein Spiel OHNE Teamzuordnung bleibt unangetastet.** Es traegt
	   `fch_team` gar nicht oder leer, faellt damit schon aus der
	   Vorauswahl — und fiele auch ohne sie an `! $teamId` durch. Zwei
	   Wege, dasselbe Ergebnis; das Verhalten ist unveraendert. */
	$vorauswahl = array();
	if ( array() !== $erlaubteTid ) {
		$muster = array();
		foreach ( array_keys( $erlaubteTid ) as $tid ) {
			$muster[] = (string) (int) $tid;
		}
		$treffer = get_posts(
			array(
				'post_type'   => CC_TYP_SPIEL,
				'post_status' => array( 'publish', 'draft', 'pending', 'private' ),
				'numberposts' => -1,
				'fields'      => 'ids',
				/* ⚠ Dieselbe Einstellung wie in cc_abgleich_kandidaten().
				   Filtert ein Plugin dort mit und hier nicht, waere die
				   Vorauswahl ENGER als $vorhanden — und die Differenz
				   wuerde nie zurueckgezogen. */
				'suppress_filters' => false,
				'meta_query'  => array(
					array(
						'key'     => 'fch_team',
						'value'   => '(^|:)"?(' . implode( '|', $muster ) . ')"?(;|$)',
						'compare' => 'REGEXP',
					),
				),
			)
		);
		foreach ( $treffer as $vid ) {
			$vorauswahl[ (int) $vid ] = true;
		}
	}

	/* ⚠ Erst schneiden, dann arbeiten: `$geliefert` und `$vorauswahl`
	   sind zwei isset() und kosten nichts, `get_field()` kostet alles.
	   Die Schleife darunter laeuft nur noch ueber den Schnitt. */
	$rueckzugKandidaten = array();
	foreach ( $vorhanden as $mid => $postId ) {
		if ( isset( $geliefert[ $mid ] ) ) {
			continue;
		}
		if ( ! isset( $vorauswahl[ (int) $postId ] ) ) {
			continue;
		}
		$rueckzugKandidaten[ $mid ] = (int) $postId;
	}

	foreach ( $rueckzugKandidaten as $postId ) {
		/* ⚠⚠ **Hier stand `(int) get_field(…)` — bis 0.9.31, 23.09.2026.**
		   Liefert das Feld ein Array (Referenzzeile auf einem
		   `relationship`), ist `(int)` davon die **1**, und `1` steht in
		   keiner Lieferliste. Die Bedingung darunter greift dann IMMER,
		   und **kein Spiel wird je zurueckgezogen** — stumm, ohne
		   Fehlermeldung, mit einer Antwort, die Erfolg meldet. */
		$teamId = fch_core_beitrags_id( get_field( 'fch_team', $postId ) );
		if ( ! $teamId || ! isset( $erlaubteTid[ $teamId ] ) ) {
			continue;
		}
		if ( 'draft' === get_post_status( $postId ) ) {
			continue;
		}
		wp_update_post( array( 'ID' => $postId, 'post_status' => 'draft' ) );
		$erg['zurueckgezogen']++;
	}

	/* ⚠ Zwei Beitraege mit derselben sfv_match_id machen den Abgleich STILL
	   falsch: die Karte behaelt einen, der andere wird nie wieder angefasst.
	   Deshalb bei jedem Lauf nachgesehen — es kostet eine Abfrage. */
	$mehrfach = array();
	foreach ( cc_doppelte_match_ids() as $mid => $ids ) {
		$mehrfach[] = array( 'sfv_match_id' => (string) $mid, 'beitraege' => $ids );
	}

	cc_bericht_ablegen(
		'spiele',
		array(
			'neu'            => (int) $erg['neu'],
			'geaendert'      => (int) $erg['aktualisiert'],
			/* ⚠ ⚠  NEU AM 26.09.2026. `geaendert` zaehlt seit heute nur
			   noch WIRKLICH geschriebene Spiele; was die Pruefsumme
			   ausgespart hat, steht hier. Ohne die zweite Zahl saehe ein
			   sparsamer Lauf wie ein halb ausgefallener aus: „63 geliefert,
			   2 geaendert" liest sich als Verlust, „63 geliefert, 2
			   geaendert, 61 unveraendert" als Ersparnis.

			   ⚠ FUER DAS THEME-REPOSITORY: `fch-core/src/Admin/
			   clubcampus.php` rendert diesen Schluessel noch nicht. Bis er
			   dort steht, ist die Zahl abgelegt und unsichtbar.

			   ⚠ Und die Zeilenzaehler daneben aendern damit ihre
			   Bedeutung: `verlauf_zeilen` und `aufstellung_zeilen` zaehlen
			   ab jetzt die Zeilen der GESCHRIEBENEN Spiele. Ein
			   uebersprungenes bringt keine mit — seine Zeilen stehen ja
			   schon am Beitrag. Ein Ruecklauf auf null bei vielen
			   `unveraendert` ist deshalb kein Verlust. */
			'unveraendert'   => (int) $erg['unveraendert'],
			'zurueckgezogen' => (int) $erg['zurueckgezogen'],
			'verlauf_zeilen' => (int) $erg['verlauf_zeilen'],
			/* ⚠ In den Bericht, nicht nur in die Antwort: die Antwort sieht
			   nur, wer den Lauf ausloest. Der Bericht ist die Stelle, an
			   der jemand SPAETER nachsieht — und genau dann wird gefragt,
			   ob die Aufstellung angekommen ist. */
			'aufstellung_zeilen' => (int) ( $GLOBALS['cc_aufstellung_zeilen'] ?? 0 ),
			'aufstellung_spiele' => (int) ( $GLOBALS['cc_aufstellung_spiele'] ?? 0 ),
			/* ⚠ In den Bericht, nicht nur in die Antwort — aus demselben Grund
			   wie die zwei Zeilen darueber: die Antwort sieht nur, wer den Lauf
			   ausloest. Ein Verlust wird SPAETER gesucht. */
			'verlust'            => cc_verlust_bericht(),
			'uebersprungen'  => cc_bericht_deckel( $uebersprungen ),
			'mehrfach'       => cc_bericht_deckel( $mehrfach ),
			'hinweis'        => $erg['fehler'],
		)
	);

	/* ⚠ Aus den Schluesseln eine Liste: als Map gesammelt (entdoppelt sich
	   selbst), als Liste ausgeliefert (JSON-Objekt mit true-Werten laese
	   sich wie ein Schalter). */
	$erg['unbeachtete_felder'] = array_keys( $erg['unbeachtete_felder'] );
	sort( $erg['unbeachtete_felder'] );

	/* ⚠ ⚠ DIE ZWEI ZAHLEN, DIE BIS 0.9.10 GEFEHLT HABEN.
	   Fuer den Verlauf gab es `verlauf_zeilen` seit dem ersten Tag; fuer
	   die Aufstellung nichts. „270 aktualisiert" zaehlt BEITRAEGE — ob in
	   einem davon eine einzige Aufstellungszeile steht, sagt es nicht.

	   ⚠ Immer da, auch als Null. Eine Zahl, die nur im schlechten Fall
	   erscheint, verlangt vom Leser eine Deutung, und die Deutung einer
	   Abwesenheit ist geraten. */
	$erg['aufstellung_zeilen'] = (int) ( $GLOBALS['cc_aufstellung_zeilen'] ?? 0 );
	$erg['aufstellung_spiele'] = (int) ( $GLOBALS['cc_aufstellung_spiele'] ?? 0 );
	/* ⚠ ~~`(array) ( … )`~~ — bis 0.9.33, 23.09.2026. Die Map ist ueber die
	   `sfv_match_id` indiziert und darum immer `{}`, auch leer; siehe
	   cc_als_objekt(). */
	$erg['aufstellung_je_spiel'] = cc_als_objekt( $GLOBALS['cc_aufstellung_je_spiel'] ?? array() );
	/* ⚠ ⚠  DER VORHER-NACHHER-VERGLEICH — bestellt am 12.09.2026, nachdem
	   ein Waechter 100 Verluste gemeldet hatte, die es nicht gab, und diese
	   Datei sie nicht widerlegen konnte. Siehe cc_pruefe_verlust().
	   Beide Repeater, beide Richtungen, immer da. */
	$erg['verlust'] = cc_verlust_bericht();
	/* ⚠ ⚠ ZWEI RICHTUNGEN, UND SIE HEISSEN VERSCHIEDEN. Bis 0.9.15 trug
	   `unbeachtete_unterfelder` die zweite; seit 0.9.16 die erste — damit
	   sie dasselbe bedeutet wie `unbeachtete_felder` eine Ebene darueber.
	   Zwei Felder mit gleichlautendem Namen und entgegengesetzter Richtung
	   waeren die schlechtere Loesung gewesen. */
	$erg['unbeachtete_unterfelder'] = array_keys(
		(array) ( $GLOBALS['cc_unbeachtete_unterfelder'] ?? array() ) );
	sort( $erg['unbeachtete_unterfelder'] );
	$erg['unterfelder_ohne_acf'] = array_keys(
		(array) ( $GLOBALS['cc_unterfelder_ohne_acf'] ?? array() ) );
	sort( $erg['unterfelder_ohne_acf'] );
	/* ⚠ Getrennt: „nicht feststellbar" ist KEINE leere Liste. */
	$erg['unterfelder_unbekannt'] = array_keys(
		(array) ( $GLOBALS['cc_unterfelder_unbekannt'] ?? array() ) );
	/* ⚠ ⚠ „gesendet:erlaubt:acf" je Repeater — steht IMMER da. Ohne sie
	   sehen „nichts gefunden" und „nie gelaufen" gleich aus, naemlich als
	   drei leere Listen. */
	/* ⚠ ~~`(array) ( … )`~~ — bis 0.9.33, 23.09.2026. Die Map ist ueber den
	   REPEATERNAMEN indiziert und darum immer `{}`, auch leer; siehe
	   cc_als_objekt(). */
	$erg['unterfelder_geprueft'] = cc_als_objekt( $GLOBALS['cc_unterfelder_geprueft'] ?? array() );

	return new WP_REST_Response( $erg, 200 );
}

/**
 * Koennte dieses Spiel schon von Hand erfasst sein?
 *
 * ⚠ NUR MELDEN, NIE ZUSAMMENFUEHREN. Datum plus Team ist ein Namensvergleich
 *   und kein Schluessel; automatisch zu verschmelzen ueberschriebe
 *   redaktionelle Arbeit auf Verdacht. Der Mensch entscheidet.
 */
function cc_pruefe_dublette( int $neu, array $spiel, array &$erg ): void {
	$datum  = (string) ( $spiel['datum'] ?? '' );
	$teamId = (int) ( $spiel['fch_team'] ?? 0 );  // hier bereits aufgeloest
	if ( '' === $datum || ! $teamId ) {
		return;
	}

	$treffer = get_posts(
		array(
			'post_type'   => CC_TYP_SPIEL,
			'post_status' => array( 'publish', 'draft', 'pending', 'private' ),
			'numberposts' => 5,
			'fields'      => 'ids',
			'exclude'     => array( $neu ),
			'meta_query'  => array(
				'relation' => 'AND',
				array( 'key' => 'datum', 'value' => $datum ),
				array( 'key' => 'fch_team', 'value' => (string) $teamId ),
				/* ⚠ Nur Handbeitraege: was eine sfv_match_id traegt, ist ein
				   Geschwister aus demselben Abgleich und keine Dublette. */
				array(
					'relation' => 'OR',
					array( 'key' => 'sfv_match_id', 'compare' => 'NOT EXISTS' ),
					array( 'key' => 'sfv_match_id', 'value' => '', 'compare' => '=' ),
				),
			),
		)
	);

	foreach ( $treffer as $t ) {
		$erg['moegliche_dubletten'][] = array(
			'neu'         => $neu,
			'von_hand'    => (int) $t,
			'titel'       => get_the_title( (int) $t ),
			'datum'       => $datum,
		);
	}
}


/* ═══════════════════════════════════════════════════════════════════════
   RANGLISTEN
   ═══════════════════════════════════════════════════════════════════════

   ⚠ WEDER BEITRAGSTYP NOCH FELD AM TEAM.
     Eine Tabelle hat keinen Titel, keinen Permalink und keinen Inhalt, den
     jemand bearbeiten darf — ein Beitragstyp gaebe ihr eine Adresse, die
     niemand aufruft. Und ein Feld am Team schiede aus, weil der Abgleich
     `fch_team` nie schreibt.

     Gespeichert wird je GRUPPE, nicht je Team: ein Team steht in einer
     Gruppe, und in seiner Gruppe stehen auch die Gegner.
   ═══════════════════════════════════════════════════════════════════════ */

function cc_route_ranglisten( WP_REST_Request $req ) {
	$daten   = $req->get_json_params();
	$gruppen = is_array( $daten['gruppen'] ?? null ) ? $daten['gruppen'] : null;

	if ( null === $gruppen ) {
		cc_bericht_ablegen(
			'ranglisten',
			array(
				'neu'           => 0,
				'geaendert'     => 0,
				'uebersprungen' => cc_bericht_deckel( array() ),
				'mehrfach'      => cc_bericht_deckel( array() ),
				'hinweis'       => array( 'Abgewiesen: «gruppen» ist Pflicht — die Nutzlast fuehrte es nicht.' ),
			)
		);

		return new WP_REST_Response( array( 'fehler' => 'gruppen ist Pflicht' ), 400 );
	}

	/* ⚠ Nur gelieferte Gruppen ersetzen, die uebrigen stehen lassen — ein
	   halber Ausfall darf nichts wegraeumen. */
	$alle = get_option( CC_OPT_RANG, array() );
	if ( ! is_array( $alle ) ) {
		$alle = array();
	}
	$teamKarteR = cc_team_karte();

	$n             = 0;
	$uebersprungen = array();
	foreach ( $gruppen as $g ) {
		/* ⚠⚠ DER SCHLUESSEL IST `schluessel`, NICHT `sfv_gruppe_id`.
		   BERICHTIGT AM 09.09.2026, NACH EINEM BEFUND AUF DER WEBSITE.

		   Eine Gruppe ist beim Verband vierteilig — Saison, Liga, Division,
		   Gruppennummer. Die Nummer allein ist NICHT eindeutig: in der
		   Datenbank steht dafuer ein sechsteiliger Unique-Schluessel, und
		   `sfv_gruppe_id` traegt obendrein `DEFAULT 0`.

		   Mit der Nummer als Schluessel haetten zwei verschiedene Gruppen
		   dieselbe Zeile der Ablage belegt — die zweite ueberschriebe die
		   erste, **ohne Fehler und ohne Meldung**. Eine Mannschaft verlöre
		   ihre Tabelle, und auf der Seite stuende die einer anderen.

		   ⚠ Der Rueckfall auf `sfv_gruppe_id` steht da fuer eine
		   Gegenstelle, die den Schluessel noch nicht mitschickt — er ist
		   die alte, kollidierende Form und wird gemeldet, nicht
		   stillschweigend hingenommen. */
		$id = (string) ( $g['schluessel'] ?? '' );
		if ( '' === $id ) {
			$id = (string) ( $g['sfv_gruppe_id'] ?? '' );
			if ( '' !== $id ) {
				$uebersprungen[] = array(
					'sfv_match_id' => '—',
					'grund'        => 'Gruppe ' . $id . ' kam ohne «schluessel» — alte Form der '
						. 'Gegenstelle. Zwei Gruppen mit derselben Nummer wuerden einander '
						. 'ueberschreiben.',
				);
			}
		}
		if ( '' === $id ) {
			/* ⚠ Bis zum 09.09.2026 fiel diese Gruppe stillschweigend heraus.
			   **Eine Gruppe ohne Kennung ist kein Nichts, sondern eine
			   Rangliste, die niemand je zu sehen bekommt.** Übernommen aus
			   der Spiegel-Fassung. */
			$uebersprungen[] = array(
				'sfv_match_id' => '—',
				'grund'        => 'Rangliste ohne «schluessel» und ohne sfv_gruppe_id — nicht zuzuordnen',
			);
			continue;
		}
		$alle[ $id ] = $g;
		$n++;
	}

	update_option( CC_OPT_RANG, $alle, false );

	/* ⚠ ⚠  NACHSEHEN, NICHT GLAUBEN — DER AUTOLOAD-ZWEIG  ⚠ ⚠

	   Der Aufruf darueber uebergibt `false`, und in WordPress 6.x ist das
	   bindend: `wp_determine_option_autoload_value()` gibt bei einem
	   Boolean sofort 'off' zurueck, ohne Filter und ohne Groessenheuristik
	   (`wp-includes/option.php`, in `wp_determine_option_autoload_value()`
	   selbst — gemessen am 09.09.2026 an WordPress 6.x. Kein Zeilenverweis:
	   Core-Zeilen verschieben sich mit jedem Update, der Funktionsname
	   nicht).

	   **Der Zweig steht trotzdem hier, und zwar fuer den Fall, den unser
	   eigener Aufruf nicht abdeckt:** schreibt IRGENDWANN eine andere
	   Stelle diese Option mit `update_option( CC_OPT_RANG, $x )` — ohne
	   dritten Parameter —, faellt WordPress auf seine Heuristik zurueck und
	   kann 'auto-on' setzen. Ab da haengen 60–80 KB an JEDEM Seitenaufruf.

	   ⚠ **Und niemand wuerde es sehen.** Es gibt keine Fehlermeldung, keine
	   langsamere Seite, die jemandem auffiele — nur eine Spalte in
	   `wp_options`, in die nie jemand schaut. Genau die Sorte, die dieses
	   Projekt zweimal teuer bezahlt hat.

	   Deshalb: lesen, notfalls berichtigen, und **in jedem Fall melden, was
	   vorgefunden wurde**. Eine stille Korrektur waere wieder eine Stelle,
	   an der etwas passiert und nichts davon spricht. */
	/* ⚠ Liga und Gruppe an die Teams — aus denselben Gruppenobjekten, die
	   eben abgelegt wurden. Siehe cc_schreibe_teamfelder(). */
	$cc_teamfelder = cc_schreibe_teamfelder( $gruppen, $teamKarteR );

	$cc_autoload_vor = cc_autoload_lesen( CC_OPT_RANG );
	$cc_korrigiert   = false;
	if ( ! in_array( $cc_autoload_vor, array( 'off', 'no', 'auto-off' ), true ) ) {
		global $wpdb;
		$wpdb->update(
			$wpdb->options,
			array( 'autoload' => 'off' ),
			array( 'option_name' => CC_OPT_RANG )
		);
		wp_cache_delete( CC_OPT_RANG, 'options' );
		wp_cache_delete( 'alloptions', 'options' );
		$cc_korrigiert = true;
	}

	/**
	 * ⚠ `neu` und `geaendert` bleiben bei null, und das ist keine
	 * Nachlaessigkeit: **Der Ranglisten-Weg legt keinen Beitrag an und
	 * aendert keinen.** Er schreibt eine Option. Die Zahlen unter `gruppen`
	 * sind seine eigene Groesse; sie in die Spalten der Spiele zu schreiben,
	 * machte den Bericht vergleichbar, wo nichts zu vergleichen ist.
	 */
	cc_bericht_ablegen(
		'ranglisten',
		array(
			'neu'           => 0,
			'geaendert'     => 0,
			'uebersprungen' => cc_bericht_deckel( $uebersprungen ),
			'mehrfach'      => cc_bericht_deckel( array() ),
			'gruppen'       => array( 'geschrieben' => $n, 'gesamt' => count( $alle ) ),
			'hinweis'       => $cc_korrigiert
				? array( 'autoload stand auf «' . $cc_autoload_vor . '» und wurde auf «off» gesetzt.' )
				: array(),
		)
	);

	return new WP_REST_Response(
		array(
			'gruppen_geschrieben' => $n,
			'gruppen_gesamt'      => count( $alle ),
			/* ⚠ Die Groesse kommt von HIER und nicht von der Gegenstelle.
			   Sie misst, was TATSAECHLICH in der Datenbank liegt — inklusive
			   der Gruppen frueherer Laeufe, die diese Nutzlast gar nicht
			   kannte. Die Gegenstelle koennte nur ihre eigene Sendung
			   wiegen und haette damit die kleinere Haelfte gemessen. */
			'bytes'               => cc_option_bytes( CC_OPT_RANG ),
			'autoload'            => cc_autoload_lesen( CC_OPT_RANG ),
			'autoload_korrigiert' => $cc_korrigiert,
			'teamfelder'          => $cc_teamfelder,
		),
		200
	);
}

/**
 * Liga und Gruppe an die Team-Beitraege schreiben — aus DERSELBEN Zeile
 * wie die Ablage.
 *
 * ⚠⚠ **DAS IST DIE EINE AUSNAHME VON „DER EXPORT SCHREIBT NIE AN
 * fch_team", und sie ist am 10.09.2026 ausdruecklich beschlossen worden.**
 *
 * Die Zusage galt, solange niemand die Werte im Backend brauchte: die
 * Anzeige holt Liga und Gruppe seit dem 09.09.2026 aus der Ablage, das
 * Feld war nur Rueckfall. Wer aber ein Team im Backend oeffnet, soll
 * dasselbe sehen wie auf der Seite — und ein Feld, das dauerhaft leer
 * bleibt und „kommt vom Verband" verspricht, ist die schlechtere Loesung.
 *
 * ⚠ **Was WEITERHIN gilt und von `check:plugin` gehalten wird:** kein
 * Team wird angelegt, keines geloescht, kein anderes Feld angefasst. Die
 * Ausnahme ist auf `liga` und `gruppe` begrenzt — namentlich, nicht als
 * „Teamfelder".
 *
 * ⚠ **Aus derselben Zeile, kein zweiter Zugriff** (Bedingung Didi):
 * `liga_name` und `gruppe_name` kommen aus dem Gruppenobjekt, das auch
 * die Tabelle liefert. Ein zweiter Zugriff koennte eine andere Gruppe
 * treffen — dann stuende im Feld die Liga einer anderen Mannschaft.
 *
 * @return array Zahl der geschriebenen und der unveraenderten Teams.
 */
function cc_schreibe_teamfelder( array $gruppen, array $teamKarte ): array {
	$geschrieben = 0;
	$unveraendert = 0;
	/* Lesbar, nicht maschinenlesbar — siehe CC_META_TEAM_STAND. */
	$jetzt = wp_date( 'j.n.Y · H:i' );

	foreach ( $gruppen as $g ) {
		$liga   = trim( (string) ( $g['liga_name'] ?? '' ) );
		$gruppe = trim( (string) ( $g['gruppe_name'] ?? '' ) );
		if ( '' === $liga && '' === $gruppe ) {
			continue;
		}

		foreach ( (array) ( $g['zeilen'] ?? array() ) as $z ) {
			$sfv = (string) ( $z['sfv_team_id'] ?? '' );
			$tid = $teamKarte[ $sfv ] ?? 0;
			/* 0 heisst „mehrfach zugeordnet" — dann keines von beiden
			   bedienen, wie in cc_team_karte() begruendet. */
			if ( ! $tid ) {
				continue;
			}

			/* ⚠ ⚠  DER ZEITSTEMPEL GEHT BEI JEDEM LAUF, AUCH OHNE AENDERUNG.
			   Entschieden am 10.09.2026, und die Begruendung ist die
			   Frage, die er beantworten soll:

			   > „Ich will wissen, wann der Abgleich zuletzt DA war, nicht
			   >  wann sich zufaellig etwas geaendert hat."

			   Beides sind verschiedene Aussagen, und nur die erste taugt
			   als Lebenszeichen. Stuende dort das Datum der letzten
			   AENDERUNG, sagte ein alter Wert „seit Wochen nichts
			   gelaufen" — obwohl der Abgleich stuendlich kommt und die
			   Liga schlicht dieselbe ist.

			   Die andere Haelfte geht nicht verloren: `geschrieben` und
			   `unveraendert` stehen in der Antwort, und daraus ist
			   ablesbar, ob dieser Lauf etwas bewegt hat. */
			cc_schreibe_feld( $tid, CC_META_TEAM_STAND, $jetzt );

			$alt_liga   = (string) get_field( 'liga', $tid );
			$alt_gruppe = (string) get_field( 'gruppe', $tid );
			if ( $alt_liga === $liga && $alt_gruppe === $gruppe ) {
				$unveraendert++;
				continue;
			}

			if ( '' !== $liga ) { cc_schreibe_feld( $tid, 'liga', $liga ); }
			if ( '' !== $gruppe ) { cc_schreibe_feld( $tid, 'gruppe', $gruppe ); }
			$geschrieben++;
		}
	}

	return array( 'geschrieben' => $geschrieben, 'unveraendert' => $unveraendert );
}

/**
 * Kennt ACF diese Feldnamen — oder schreibt der Abgleich ins Leere?
 *
 * ⚠ ⚠  DIE FRAGE, DIE HEUTE DREI ANLAEUFE GEKOSTET HAT  ⚠ ⚠
 *
 * `update_field( 'name', … )` legt bei einem UNBEKANNTEN Namen trotzdem
 * ein Postmeta an — ohne die `_name`-Referenz, die ACF fuer sein Feld
 * braucht. Der Wert steht dann in der Datenbank, ist ueber `get_field()`
 * nicht zu holen und im Backend unsichtbar. **Es schlaegt nichts fehl.**
 *
 * Genau so entstand `_cc_team_abgleich` (mein erfundener Name, 10.09.2026)
 * und genau so steht am fch_team ein Postmeta `saison`, zu dem es keine
 * Feldgruppe gibt: ein WERT OHNE FELD. Von aussen sieht beides gleich aus
 * wie ein gepflegtes Feld — und ein leeres Feld sieht aus wie fehlende
 * Daten, nicht wie ein falscher Name.
 *
 * ⚠ Deshalb wird hier nicht geraten und nicht auf Verdacht in zwei Namen
 * geschrieben. Die Gegenstelle wird gefragt, welche Namen sie kennt.
 *
 * @param int $tid Ein fch_team-Beitrag, an dem geprueft wird. 0 = keiner da.
 * @return array<string,string> Feldname => `feld` | `nur_postmeta` | `leer`
 */
function cc_teamfeld_lage( int $tid ): array {
	return cc_feld_lage( CC_TEAM_FELDER, $tid );
}

/**
 * Dasselbe fuer die Felder am Spiel.
 *
 * ⚠ SEIT 0.8.0, UND DER ANLASS IST `liga`. Es kam seit jeher in der
 * Nutzlast an und stand nicht in CC_FELDER — der Empfaenger verwarf es
 * wortlos, und WO es riss, musste die Website-Seite von Hand messen.
 *
 * ⚠ Die eigentliche Lehre war aber die Gegenrichtung: `liga` durfte man
 * NICHT einfach aufnehmen, solange das fch_spiel kein Feld dieses Namens
 * hatte — ACFs globale Namenssuche haette in das Feld des TEAMS
 * geschrieben. Eine Aufzaehlung im Pruefskript kann das nicht wissen;
 * `get_field_object()` schon. **Diese Auskunft ist der Schutz, nicht die
 * Liste.**
 */
/**
 * Jeden Feldnamen an einem Beispielbeitrag aufloesen — und dabei die
 * Melder fuellen.
 *
 * ⚠ ⚠  DER GRUND: `cc_feld_schluessel()` fuellt `cc_feld_mehrdeutig` als
 *       NEBENWIRKUNG des Schreibens. In einer `/status`-Anfrage wird
 *       nicht geschrieben — also war die Liste dort immer leer, und die
 *       Kachel meldete „jeder Schluessel eindeutig aufloesbar".
 *
 *   **Das ist eine leere Menge, keine Entwarnung.** Zum vierten Mal an
 *   zwei Tagen derselbe Fehler: nicht gemessen und in Ordnung sehen
 *   gleich aus, wenn man nur die Abwesenheit zeigt.
 *
 * ⚠ Rueckgabe ist die ZAHL der geprueften Namen. Steht dort 0, wurde
 *   nichts geprueft — und dann sind die zwei Listen daneben wieder
 *   bedeutungslos. Die Zahl ist der Beleg, dass es eine Messung war.
 */
function cc_pruefe_feldnamen( int $sid ): int {
	if ( ! $sid ) {
		return 0;
	}
	$n = 0;
	foreach ( CC_FELDER as $name ) {
		cc_feld_schluessel( $sid, $name );
		$n++;
	}
	return $n;
}

function cc_spielfeld_lage( int $sid ): array {
	return cc_feld_lage( CC_FELDER, $sid );
}

/**
 * Irgendein `fch_spiel`, an dem sich die Feldlage ablesen laesst.
 *
 * ⚠ Ein beliebiger genuegt: die Frage ist, ob ACF den NAMEN kennt, und
 * das haengt am Beitragstyp, nicht am einzelnen Beitrag. Gibt es noch
 * keinen, meldet cc_feld_lage() `kein_beitrag` — und das ist die
 * ehrliche Antwort, nicht `leer`.
 */
/**
 * Spiel-Beitraege je post_status.
 *
 * ⚠ ⚠  WARUM NICHT EINE ZAHL. `wp_count_posts()->publish` meldete am
 *       10.09.2026 **0**, waehrend auf dev 270 Spiele lagen. Die Zahl war
 *       nicht falsch — sie war zu schmal, und eine zu schmale Zahl ist
 *       von einer leeren Menge nicht zu unterscheiden.
 *
 * ⚠ `auto-draft` steht mit in der Liste, obwohl es KEIN richtiger Beitrag
 *   ist. Genau darum: wer 270 auto-drafts hat, soll das SEHEN, statt eine
 *   Null zu deuten. Was zaehlt, entscheidet der Leser — die Auskunft
 *   zaehlt alles und sagt, was was ist.
 */
/**
 * Welche Beitragstypen tragen ein `sfv_match_id` — und wie viele?
 *
 * ⚠ ⚠  DIREKT UEBER $wpdb, OHNE post_type-FILTER UND OHNE WP_Query.
 *
 *   Der Grund ist ein Widerspruch zwischen zwei Auskuenften derselben
 *   Datei (10.09.2026): der Export meldete 270 AKTUALISIERTE Spiele —
 *   also 270 bestehende Beitraege, gefunden ueber genau dieses
 *   Meta-Feld —, und `/status` fand keinen einzigen Beitrag vom Typ
 *   `fch_spiel`, auch keinen Entwurf.
 *
 *   Beide Wege gehen ueber `get_posts()` und denselben Beitragstyp. Was
 *   sie trennen KANN, sieht man von aussen nicht: eine Registrierung,
 *   die zum Zeitpunkt der einen Route noch nicht steht; ein Filter auf
 *   `pre_get_posts`; ein Zustand, den keine der Listen nennt.
 *
 *   **Diese Abfrage umgeht alles davon.** Sie fragt die Tabelle, nicht
 *   die Abstraktion — und beantwortet damit die Frage, die die Kachel
 *   sonst nur stellen kann: wo SIND die 270?
 *
 * ⚠ Sie nennt auch die Zustaende. Ein Beitrag im Papierkorb (`trash`)
 *   faellt aus jeder normalen Abfrage und ist trotzdem da.
 */
function cc_typen_mit_match_id(): array {
	global $wpdb;
	$zeilen = $wpdb->get_results(
		"SELECT p.post_type, p.post_status, COUNT(*) AS anzahl
		   FROM {$wpdb->posts} p
		   JOIN {$wpdb->postmeta} m ON m.post_id = p.ID
		  WHERE m.meta_key = 'sfv_match_id' AND m.meta_value <> ''
		  GROUP BY p.post_type, p.post_status
		  ORDER BY anzahl DESC",
		ARRAY_A
	);
	if ( ! is_array( $zeilen ) || array() === $zeilen ) {
		return array(
			'_hinweis' => 'Kein einziger Beitrag im ganzen WordPress traegt '
				. 'ein sfv_match_id — gleich welchen Typs und Zustands. '
				. 'Dann hat der Export nie geschrieben, oder er schrieb in '
				. 'eine andere Installation.',
		);
	}
	$raus = array();
	foreach ( $zeilen as $z ) {
		$raus[] = array(
			'typ'     => (string) $z['post_type'],
			'zustand' => (string) $z['post_status'],
			'anzahl'  => (int) $z['anzahl'],
		);
	}
	return $raus;
}

function cc_spiele_nach_zustand(): array {
	$z = wp_count_posts( CC_TYP_SPIEL );
	$raus = array();
	foreach ( (array) $z as $name => $anzahl ) {
		if ( (int) $anzahl > 0 ) {
			$raus[ $name ] = (int) $anzahl;
		}
	}
	if ( array() === $raus ) {
		$raus['_hinweis'] = 'Kein einziger Beitrag vom Typ ' . CC_TYP_SPIEL
			. ' — auch kein Entwurf. Stimmt der Beitragstyp?';
	}
	return $raus;
}

function cc_ein_spiel_id(): int {
	$ids = get_posts(
		array(
			'post_type'   => CC_TYP_SPIEL,
			/* ⚠ `auto-draft` MIT — hier geht es nicht darum, was als Spiel
			   zaehlt, sondern nur darum, EINEN Beitrag zu finden, an dem
			   sich die Feldnamen pruefen lassen. Ein Entwurf taugt dafuer
			   genauso, und auf dev liegen die Beitraege genau so. */
			'post_status' => array( 'publish', 'draft', 'pending', 'private',
			                        'future', 'auto-draft' ),
			'numberposts' => 1,
			'fields'      => 'ids',
		)
	);
	return (int) ( $ids[0] ?? 0 );
}

/**
 * Kennt ACF diese Feldnamen an diesem Beitrag — oder wird ins Leere
 * geschrieben?
 *
 * ⚠ `update_field()` legt bei einem UNBEKANNTEN Namen trotzdem ein
 * Postmeta an, ohne die `_name`-Referenz, die ACF fuer sein Feld
 * braucht. Der Wert steht dann in der Datenbank, ist ueber `get_field()`
 * nicht zu holen und im Backend unsichtbar. **Es schlaegt nichts fehl.**
 *
 * @return array<string,string> Feldname => `feld` | `nur_postmeta` | `leer`
 */
function cc_feld_lage( array $namen, int $tid ): array {
	$lage = array();
	foreach ( $namen as $name ) {
		if ( ! $tid ) {
			$lage[ $name ] = 'kein_beitrag';
			continue;
		}
		/* ⚠ `get_field_object()` fragt die FELDDEFINITION, nicht den Wert.
		   Ein Feld ohne Inhalt ist etwas anderes als ein Name ohne Feld —
		   und nur der zweite Fall ist der Defekt. */
		$obj = function_exists( 'get_field_object' ) ? get_field_object( $name, $tid ) : null;
		if ( is_array( $obj ) && ! empty( $obj['key'] ) ) {
			$lage[ $name ] = 'feld';
			continue;
		}
		$lage[ $name ] = ( '' === (string) get_post_meta( $tid, $name, true ) )
			? 'leer'
			: 'nur_postmeta';
	}
	return $lage;
}

/**
 * Was in der Spalte `autoload` dieser Option steht — roh, ohne Deutung.
 *
 * ⚠ NICHT ueber `get_option()`: das liefert den WERT und sagt ueber die
 * Spalte nichts. Gefragt ist hier die Spalte selbst.
 */
function cc_autoload_lesen( string $name ): string {
	global $wpdb;
	return (string) $wpdb->get_var(
		$wpdb->prepare( "SELECT autoload FROM {$wpdb->options} WHERE option_name = %s LIMIT 1", $name )
	);
}

/** Wieviel die Option in der Datenbank wiegt — serialisiert, wie sie liegt. */
function cc_option_bytes( string $name ): int {
	global $wpdb;
	return (int) $wpdb->get_var(
		$wpdb->prepare( "SELECT LENGTH(option_value) FROM {$wpdb->options} WHERE option_name = %s LIMIT 1", $name )
	);
}

/**
 * Die Rangliste zu einem Team — fuer die Vorlage.
 *
 * Gesucht wird die Gruppe, in der die SFV-Teamnummer vorkommt. Bei rund
 * einundzwanzig Gruppen ist das nichts, und es kommt ohne einen einzigen
 * Schreibvorgang an `fch_team` aus.
 */
function fch_cc_rangliste_fuer_team( string $sfv_team_id ): ?array {
	$alle = get_option( CC_OPT_RANG, array() );
	if ( ! is_array( $alle ) ) {
		return null;
	}
	foreach ( $alle as $gruppe ) {
		foreach ( (array) ( $gruppe['zeilen'] ?? array() ) as $z ) {
			if ( (string) ( $z['sfv_team_id'] ?? '' ) === $sfv_team_id ) {
				return $gruppe;
			}
		}
	}
	return null;
}


/* ═══════════════════════════════════════════════════════════════════════
   WAPPEN — seit 0.9.29
   ═══════════════════════════════════════════════════════════════════════

   Nutzlast:
     {
       "wappen": [
         { "sfv_team_id": "39010",
           "sha256":      "e3b0c442…",
           "mime":        "image/png",
           "daten":       "iVBORw0KGgo…"        // base64
         }, …
       ]
     }

   ⚠ `image/png` ist hier ein BEISPIEL, keine Vorschrift. Erlaubt ist,
     was in CC_WAPPEN_MIME steht — seit 23.09.2026 png, jpeg, webp und
     **gif**. Und `mime` ist eine Angabe, keine Entscheidung: Es zaehlt,
     was `finfo_buffer()` in den dekodierten Bytes findet.

   ⚠ **WAS DIESER WEG BESITZT UND WAS NICHT.** Er fasst ausschliesslich
     Anhaenge an, die das Metafeld `sfv_team_id` tragen — also die, die er
     selbst angelegt hat. Ein von Hand hochgeladenes Wappen ohne dieses
     Feld ist fuer ihn unsichtbar und bleibt unberuehrt. Dieselbe
     Besitzregel wie bei den Spielen (`sfv_match_id`), und aus demselben
     Grund: Ein Abgleich, der loescht, was er nicht angelegt hat, ist kein
     Abgleich.

   ⚠ **DIE REIHENFOLGE DER PRUEFUNGEN IST DER GANZE SCHUTZ.** Erst
     dekodieren, dann Groesse, dann Pruefsumme, dann Typ — und nichts wird
     angelegt oder geloescht, solange nicht alle vier durch sind. Wer die
     Pruefsumme nach dem Schreiben prueft, hat sie umsonst geprueft.

   ⚠ **`standbild` im Urteil — seit 23.09.2026.** Ein animiertes GIF wird
     angenommen, aber auf sein erstes Bild zurueckgefuehrt; das Feld traegt
     dann die Bilderzahl des GELIEFERTEN (etwa `3`) und fehlt sonst ganz.
     **`sha256` und `bytes` im selben Urteil beschreiben weiterhin die
     LIEFERUNG** und nicht die abgelegte Datei — das ist Absicht und der
     Grund, warum `standbild` ueberhaupt gebraucht wird: Ohne das Feld
     waere der Unterschied von aussen unsichtbar. */

/**
 * **Die Team-Nummer, wie sie verglichen wird — an EINER Stelle.**
 *
 * ⚠ `sfv_team_id` kommt als Text, aber JSON erlaubt auch `39010` ohne
 * Anfuehrungszeichen. Ohne gemeinsame Normalisierung traefen `"39010"` und
 * `39010` verschiedene Anhaenge: Der eine schriebe das Metafeld als
 * `"39010"`, der andere als `39010`, und `meta_value` ist in der Datenbank
 * eine Zeichenkette — der Vergleich gelaenge zufaellig oder auch nicht.
 *
 * **Darum laufen Schreiben UND Lesen durch diese Funktion.** Sie ist die
 * Antwort auf Didis Pruefung 4.
 */
function cc_wappen_tid( $roh ): string {
	if ( is_array( $roh ) || is_object( $roh ) || is_bool( $roh ) || null === $roh ) {
		return '';
	}
	return trim( (string) $roh );
}

/**
 * **Alle Anhaenge zu einer Team-Nummer.** Normalerweise einer, im Fehlerfall
 * mehrere.
 *
 * ⚠ **Mehrere sind kein Abbruchgrund, sondern werden aufgeraeumt.** Die
 * Hausregel bei doppelten Kennungen lautet sonst „keines von beiden
 * bedienen und melden" (siehe `cc_team_karte()`) — hier ist sie falsch:
 * Dort waere die Frage, WELCHER Beitrag gemeint ist, und die kann der
 * Abgleich nicht entscheiden. Hier ist die Sache eindeutig, es gibt genau
 * ein richtiges Wappen je Nummer; mehrere sind ein Ueberrest. Ein
 * Abgleich, der sich davon dauerhaft blockieren liesse, waere nicht
 * vorsichtig, sondern kaputt.
 *
 * @return int[] Anhang-IDs, neueste zuerst.
 */
function cc_wappen_anhaenge( string $tid ): array {
	if ( '' === $tid ) {
		return array();
	}

	$ids = get_posts(
		array(
			'post_type'        => 'attachment',
			'post_status'      => 'inherit',
			'numberposts'      => -1,
			'fields'           => 'ids',
			'orderby'          => 'ID',
			'order'            => 'DESC',
			'suppress_filters' => false,
			'meta_query'       => array(
				array(
					'key'     => CC_META_WAPPEN_TEAM,
					'value'   => $tid,
					'compare' => '=',
				),
			),
		)
	);

	return array_map( 'intval', (array) $ids );
}

/**
 * **Traegt dieser Anhang wirklich ein Wappen? — leer heisst ja, sonst der
 * Grund.** Seit 23.09.2026.
 *
 * ── ⚠⚠ WARUM ES DIESE FRAGE ÜBERHAUPT BRAUCHT ──────────────────────────
 *
 * `bestand` meldete bis heute die Pruefsumme, sobald ein Anhang mit dem
 * Metafeld dastand — **ohne zu pruefen, ob die Datei im Uploads-Ordner
 * noch liegt.** Gemessen am 23.09.2026 im lokalen Stapel: Anhang #4342
 * angelegt, danach `wappen-99001.png` und `wappen-99001-96x96.png` von
 * Hand geloescht. `bestand` meldete davor wie danach Zeichen fuer Zeichen
 * dasselbe (`sha256: 00fcc0b2…`, `anhang_id: 4342`, `mehrfach: 0`), die
 * Seite lieferte ein `<img>` auf eine Adresse mit **HTTP 404**, und ein
 * erneut geschicktes Wappen bekam `unveraendert` zurueck.
 *
 * > **Drei Stellen sagten «alles in Ordnung», und keine hatte nachgesehen.**
 * > Eine Pruefsumme ist eine Zusage, dass das Bild daliegt. Wer sie ohne
 * > Anhang meldet, sperrt die Nachlieferung fuer immer aus — ClubCampus
 * > ueberspringt, was `bestand` als vorhanden fuehrt.
 *
 * Die Faelle, aus denen das entsteht, sind keine Theorie: ein Griff von
 * Hand in die Mediathek, eine unvollstaendige Uebertragung, ein
 * Serverumzug ohne `uploads/`, ein Sicherungsstand, der die Datenbank
 * zurueckspielt und die Dateien nicht.
 *
 * ── DIE VIER MAENGEL, UND WARUM JEDER EINZELN GEPRUEFT WIRD ────────────
 *
 *  1. **Der Beitrag ist weg.** Kommt vor, wenn jemand in der Datenbank
 *     aufraeumt und die Meta-Zeilen stehen laesst.
 *  2. **Der Beitrag ist kein Anhang.** `cc_wappen_anhaenge()` grenzt schon
 *     auf `attachment` ein; diese Zeile ist die zweite Sperre fuer jeden
 *     anderen Aufrufer, der eine Id von irgendwoher hat.
 *  3. **Keine Datei hinterlegt** (`_wp_attached_file` fehlt) — ein Anhang
 *     ohne Dateiverweis ist ein Beitrag und kein Bild.
 *  4. **Die Datei fehlt auf der Platte.** Der Hauptfall, siehe oben.
 *  5. **Die Pruefsumme fehlt am Anhang.** Seit 23.09.2026 schreibt
 *     `cc_wappen_anlegen()` sie ZULETZT — ihr Fehlen ist damit die Spur
 *     eines abgebrochenen Anlegens und kein Schoenheitsfehler.
 *
 * ⚠ **Die Zwischengroessen werden bewusst NICHT geprueft.** Gemessen am
 * 23.09.2026: Ein Anhang ganz ohne `sizes` faellt auf das Original zurueck
 * (`image_src: wappen-99302.png 96x96`), das Bild erscheint. Wer das zum
 * Mangel erklaerte, liesse ClubCampus ein funktionierendes Wappen noch
 * einmal schicken — und `fch-wappen` entsteht ohnehin nicht, wenn die
 * Quelle unter 96px liegt.
 *
 * @return string Leer, wenn der Anhang traegt; sonst der Grund im Klartext.
 */
function cc_wappen_mangel( int $anhang ): string {
	if ( $anhang <= 0 || ! ( get_post( $anhang ) instanceof WP_Post ) ) {
		return 'Anhang ' . $anhang . ' gibt es nicht mehr';
	}
	if ( 'attachment' !== get_post_type( $anhang ) ) {
		return 'Beitrag ' . $anhang . ' ist kein Anhang';
	}

	$datei = (string) get_attached_file( $anhang );
	if ( '' === $datei ) {
		return 'Anhang ' . $anhang . ' hat keine Datei hinterlegt';
	}
	if ( ! file_exists( $datei ) ) {
		return 'Datei fehlt im Uploads-Ordner (' . basename( $datei ) . ')';
	}

	if ( '' === trim( (string) get_post_meta( $anhang, CC_META_WAPPEN_SHA, true ) ) ) {
		return 'Pruefsumme fehlt am Anhang — das Anlegen wurde abgebrochen';
	}

	return '';
}

/**
 * **Ein Eintrag geprueft — vier Huerden, und keine darf uebersprungen
 * werden.**
 *
 * ── ⚠⚠ WARUM SVG ABGELEHNT WIRD UND NICHT GESAEUBERT ────────────────────
 *
 * Didi laesst die Wahl. Sie faellt auf Ablehnen, aus drei Gruenden, und der
 * erste allein genuegt:
 *
 *  1. **WordPress erlaubt den Typ gar nicht.** ~~«Gemessen am 23.09.2026:
 *     `wp_get_mime_types()` fuehrt `png`, `jpg|jpeg|jpe` und `webp`»~~ —
 *     Stand 23.09.2026, ueberholt: die Aufzaehlung nannte nur unsere drei
 *     Typen und klang, als waere das die ganze Liste. **Nachgemessen am
 *     23.09.2026 im lokalen Stapel: 98 Eintraege**, darunter
 *     `jpg|jpeg|jpe`, `gif`, `png`, `bmp`, `tiff|tif`, `webp`, `avif`,
 *     `ico`, `heic`. Auf `svg` faellt dabei **kein einziger Treffer** —
 *     weder als Schluessel noch als Wert. Punkt 1 traegt also weiter, und
 *     er traegt schaerfer als vorher: Der Kern fuehrt fast hundert Typen
 *     und laesst SVG trotzdem weg, das ist kein Vergessen. `wp_upload_bits()`
 *     wuerde die Datei abweisen. Ein Saeuberer haette erst das Tor zu
 *     oeffnen, das der Kern absichtlich zu haelt.
 *  2. **Ein SVG ist ausfuehrbares Markup, kein Bild.** Es traegt `<script>`,
 *     `onload`, `<foreignObject>` und Verweise nach aussen. Was hier
 *     ankommt, kommt von einer Gegenstelle, die in einem anderen
 *     Repository liegt — genau die Sorte Herkunft, bei der man nicht auf
 *     Wohlverhalten baut.
 *  3. **Ein selbstgebauter Saeuberer ist gefaehrlicher als die Luecke.** Er
 *     sieht aus wie Schutz und ist eine Liste von Faellen, an die jemand
 *     gedacht hat. Trauen wuerde man ihm trotzdem — und das ist der
 *     Schaden.
 *
 * ⚠ **Abgelehnt heisst gemeldet, nicht verschwiegen:** Der Eintrag wird
 * `fehler` mit klarem Grund, und der Grund nennt die erlaubten Typen.
 * ~~«damit ClubCampus weiss, dass PNG oder WebP gebraucht wird»~~ — Stand
 * 23.09.2026, ueberholt: die Meldung zaehlte die Typen von Hand auf und
 * verschwieg nach der GIF-Aufnahme genau den Typ, der am haeufigsten
 * kommt. **Sie liest die Liste jetzt aus CC_WAPPEN_MIME**, damit die
 * naechste Aenderung an der Allowlist die Meldung nicht wieder luegen
 * laesst. Ein stilles Weglassen liesse die Gegenstelle glauben, das
 * Wappen sei angekommen.
 *
 * @return array{bytes?:string,mime?:string,sha?:string,fehler?:string}
 */
function cc_wappen_pruefe( array $eintrag ): array {
	/* ── 1 ── Dekodieren. `true` ist der strenge Modus: er verwirft
	   Zeichen, die nicht in das Alphabet gehoeren, statt sie zu
	   ueberspringen. Ohne ihn kommt aus Unsinn stillschweigend Muell,
	   und der Muell scheitert erst an der Pruefsumme — also am richtigen
	   Ort, aber mit einer Meldung, die auf das falsche Feld zeigt. */
	$roh = $eintrag['daten'] ?? null;
	if ( ! is_string( $roh ) || '' === $roh ) {
		return array( 'fehler' => '«daten» fehlt oder ist leer' );
	}

	$bytes = base64_decode( $roh, true );
	if ( false === $bytes || '' === $bytes ) {
		return array( 'fehler' => '«daten» ist kein gueltiges base64' );
	}

	/* ── 2 ── Groesse, auf die DEKODIERTEN Bytes. */
	$gross = strlen( $bytes );
	if ( $gross > CC_WAPPEN_BYTES ) {
		return array(
			'fehler' => sprintf(
				'%d Bytes — mehr als die Grenze von %d (%d KiB)',
				$gross,
				CC_WAPPEN_BYTES,
				(int) ( CC_WAPPEN_BYTES / 1024 )
			),
		);
	}

	/* ── 3 ── Die Pruefsumme NACHRECHNEN.
	   ⚠ `hash_equals()` und nicht `===`: Der Vergleich soll nicht ueber
	   seine Laufzeit verraten, wie weit zwei Summen uebereinstimmen. Hier
	   ist das kein scharfes Risiko, aber es ist die Gewohnheit, die man
	   nicht fallweise pflegt. */
	$soll = strtolower( trim( (string) ( $eintrag['sha256'] ?? '' ) ) );
	if ( '' === $soll ) {
		return array( 'fehler' => '«sha256» fehlt' );
	}
	$ist = hash( 'sha256', $bytes );
	if ( ! hash_equals( $ist, $soll ) ) {
		return array(
			'fehler' => 'Pruefsumme passt nicht zu den Daten (geliefert '
				. substr( $soll, 0, 12 ) . '…, gerechnet ' . substr( $ist, 0, 12 ) . '…)',
		);
	}

	/* ── 4 ── Der Typ, am INHALT. */
	if ( ! function_exists( 'finfo_buffer' ) ) {
		/* ⚠ Ohne finfo wird NICHT durchgelassen. Der Typ ist hier die
		   Sicherheitsgrenze, nicht ein Etikett — und eine Grenze, die bei
		   fehlendem Werkzeug oeffnet, ist keine. */
		return array( 'fehler' => 'finfo fehlt auf dem Server — der Typ ist nicht pruefbar' );
	}

	$finfo = finfo_open( FILEINFO_MIME_TYPE );
	$fund  = $finfo ? (string) finfo_buffer( $finfo, $bytes ) : '';
	if ( $finfo ) {
		finfo_close( $finfo );
	}

	if ( 'image/svg+xml' === $fund || 'image/svg' === $fund ) {
		return array(
			'fehler' => 'SVG wird nicht angenommen — bitte eines von '
				. implode( ', ', array_keys( CC_WAPPEN_MIME ) ) . ' schicken. '
				. 'Grund: ausfuehrbares Markup, und WordPress erlaubt den Typ nicht.',
		);
	}

	if ( ! isset( CC_WAPPEN_MIME[ $fund ] ) ) {
		return array(
			'fehler' => 'Typ «' . ( '' !== $fund ? $fund : 'unbekannt' )
				. '» ist nicht erlaubt (erlaubt: ' . implode( ', ', array_keys( CC_WAPPEN_MIME ) ) . ')',
		);
	}

	/* ⚠ **Die ANGABE muss zum FUND passen.** Ein PNG, das als
	   `image/jpeg` angekuendigt wird, ist ein Befund und kein Detail: Es
	   heisst, dass auf der Gegenseite Typ und Inhalt auseinanderlaufen,
	   und das naechste Mal laufen sie vielleicht weiter auseinander.

	   ⚠ `image/jpg` wird als Schreibweise von `image/jpeg` durchgelassen —
	   sie ist verbreitet und meint nichts anderes. Mehr wird NICHT
	   geglaettet: Wer `image/gif` schickt und ein PNG meint, soll es
	   erfahren. */
	$angabe = strtolower( trim( (string) ( $eintrag['mime'] ?? '' ) ) );
	if ( 'image/jpg' === $angabe ) {
		$angabe = 'image/jpeg';
	}
	if ( '' !== $angabe && $angabe !== $fund ) {
		return array(
			'fehler' => 'angekuendigt als «' . $angabe . '», tatsaechlich «' . $fund . '»',
		);
	}

	return array( 'bytes' => $bytes, 'mime' => $fund, 'sha' => $ist );
}

/**
 * **Wie viele Bilder traegt dieses GIF?** - 23.09.2026
 *
 * Der Zaehler laeuft die GIF-Struktur ab und zaehlt die Bilddeskriptoren
 * (`0x2C`). **Er braucht dafuer weder Imagick noch GD**, und das ist der
 * Grund, warum er von Hand geschrieben ist und nicht `getNumberImages()`
 * ruft: Die Antwort entscheidet, ob eine Datei ueberhaupt angefasst wird.
 * Haengt diese Entscheidung an einer Bibliothek, faellt sie auf einem
 * Server ohne sie anders aus als hier - und zwar still.
 *
 * > **Ein nicht animiertes GIF muss Byte fuer Byte durchkommen.** Diese
 * > Zusicherung ist nur so viel wert wie die Frage, die ihr vorausgeht.
 *
 * ⚠ Bei einem unerwarteten Block bricht der Zaehler ab und gibt zurueck,
 * was er bis dahin gesehen hat. Das ist die vorsichtige Richtung: Wer
 * schon zwei Bilder gezaehlt hat, rechnet um; wer keines sicher hat,
 * laesst die Bytes in Ruhe. **Ein krummes GIF wird nicht abgelehnt** -
 * darueber entscheidet `cc_wappen_pruefe()` und nicht dieser Zaehler.
 *
 * @param string $bytes Die rohen Bilddaten.
 * @return int Zahl der Bilder; 0, wenn es kein GIF ist.
 */
function cc_gif_bilder( string $bytes ): int {
	$laenge = strlen( $bytes );

	/* 6 Bytes Kopf + 7 Bytes Bildschirmbeschreibung = 13. */
	if ( $laenge < 13 || 'GIF8' !== substr( $bytes, 0, 4 ) ) {
		return 0;
	}

	/* Bit 7 des Sammelbytes: es folgt eine globale Farbtabelle, und ihre
	   Groesse steht in den untersten drei Bits als Zweierpotenz. */
	$sammel = ord( $bytes[10] );
	$p      = 13;
	if ( $sammel & 0x80 ) {
		$p += 3 * ( 1 << ( ( $sammel & 0x07 ) + 1 ) );
	}

	$bilder = 0;

	while ( $p < $laenge ) {
		$block = ord( $bytes[ $p ] );

		if ( 0x3B === $block ) {
			break; /* Abschluss. */
		}

		if ( 0x21 === $block ) {
			$p += 2; /* Erweiterung: Kennung ueberspringen, dann Teilbloecke. */
		} elseif ( 0x2C === $block ) {
			++$bilder;
			if ( $p + 9 >= $laenge ) {
				return $bilder;
			}
			$lokal = ord( $bytes[ $p + 9 ] );
			$p    += 10;
			if ( $lokal & 0x80 ) {
				$p += 3 * ( 1 << ( ( $lokal & 0x07 ) + 1 ) );
			}
			++$p; /* Mindestcodelaenge der LZW-Daten. */
		} else {
			return $bilder;
		}

		/* Teilbloecke: Laengenbyte, Daten, … bis zum Nullbyte. */
		while ( $p < $laenge ) {
			$n = ord( $bytes[ $p ] );
			++$p;
			if ( 0 === $n ) {
				break;
			}
			$p += $n;
		}
	}

	return $bilder;
}

/**
 * **Aus einem animierten GIF ein Standbild machen.** - Didis Entscheid
 * vom 23.09.2026
 *
 * ── ⚠⚠ WARUM HIER UND NICHT AN DER ANZEIGE ──────────────────────
 *
 * ~~«Ein animiertes Wappen unter 96px laeuft also auf der Seite. Das ist
 * an der ANZEIGE zu entscheiden, nicht an der Allowlist.»~~ - Stand
 * 23.09.2026, ueberholt. Der Satz stellte zwei Orte gegeneinander, von
 * denen nur der eine je gangbar war; **die Anzeige kann es gar nicht.**
 * Gemessen im lokalen Stapel (Imagick, so wie ausgeliefert wird):
 *
 *     image_resize_dimensions( 64, 64, 96, 96, false )  →  false
 *     make_subsize( 64 x 64, ohne Beschnitt )  →  image_subsize_create_error
 *                                                 «hat bereits die Groesse»
 *     make_subsize( 96 x 96, ohne Beschnitt )  →  error_getting_dimensions
 *
 * **Beide Tueren sind zu.** WordPress legt keine Zwischengroesse in der
 * Originalgroesse an - es lehnt das ausdruecklich ab - und es vergroessert
 * nicht. Ein Standbild an der Anzeige haette also bedeutet, ein 64er
 * Wappen auf 96 aufzublasen: Schaerfe wegwerfen, um Ruhe zu bekommen, und
 * dafuer einen Filter zu setzen, der jedes Bild der Website sieht.
 *
 * > **Die Umrechnung beim Annehmen kostet keinen Bildpunkt.** Das
 * > Standbild hat die volle Kantenlaenge des Gelieferten; es hat nur ein
 * > Bild statt drei.
 *
 * ── ⚠⚠ UND WAS DAS FUER `sha256` BEDEUTET ───────────────────────
 *
 * Die abgelegte Datei ist dann **nicht mehr die gelieferte**. Die
 * Pruefsumme am Anhang bleibt trotzdem die der **LIEFERUNG** - sie kommt
 * als eigener Parameter in `cc_wappen_anlegen()` an und wird hier nicht
 * angefasst.
 *
 * **Das ist kein Detail, sondern die ganze Frage.** Wuerde die Summe der
 * umgerechneten Datei abgelegt, faende `cc_route_wappen()` im Zweig
 * `unveraendert` nie wieder eine Uebereinstimmung: ClubCampus schickte
 * dasselbe Wappen bei jedem Lauf neu, der Anhang wuerde bei jedem Lauf
 * ersetzt, und **nichts davon saehe nach einem Fehler aus** - die Antwort
 * meldete brav `ersetzt`. Die Summe ist die Quittung ueber das, was
 * ankam, und nicht ueber das, was daraus wurde.
 *
 * ⚠ `cc_wappen_mangel()` rechnet die Datei NICHT nach - geprueft und
 * nicht vermutet: es prueft Beitrag, Anhangstyp, hinterlegten Pfad, Dasein
 * auf der Platte und gesetzte Summe. Die Abweichung zwischen Datei und
 * Summe faellt also nirgends als Schaden an.
 *
 * ── ⚠ NICHT ABLEHNEN, UNTER KEINEN UMSTAENDEN ────────────────────
 *
 * Jeder Fehlweg gibt die **urspruenglichen Bytes** zurueck. Fehlt Imagick,
 * fehlt GD, stolpert einer von beiden ueber ein krummes GIF: Das Wappen
 * erscheint, dann eben animiert. **Didis Bedingung ist «erscheint, nur
 * ruhig» - und die erste Haelfte wiegt schwerer als die zweite.**
 *
 * ⚠ **Was kein GIF ist und was nicht animiert ist, kommt Byte fuer Byte
 * unveraendert zurueck** - nicht «gleich gross» oder «gleich aussehend»,
 * sondern derselbe String. Ein PNG, ein WebP und ein einbildriges GIF
 * laufen durch diese Funktion, als gaebe es sie nicht.
 *
 * ⚠ Imagick zuerst, GD als Rueckfall: `coalesceImages()` rechnet die
 * Teilbilder eines animierten GIF zu vollen Bildern aus, bevor das erste
 * genommen wird. GD liest von sich aus nur das erste Bild - das trifft
 * hier dasselbe, ist aber die groebere Zusicherung.
 *
 * @param string $bytes  Die gelieferten Bilddaten.
 * @param string $mime   Der am Inhalt gefundene Typ.
 * @param int   &$bilder Zahl der Bilder im Gelieferten; 0, wenn kein GIF.
 * @return string Standbild-Bytes, oder unveraendert die urspruenglichen.
 */
function cc_wappen_standbild( string $bytes, string $mime, &$bilder = null ): string {
	$bilder = 0;

	if ( 'image/gif' !== $mime ) {
		return $bytes;
	}

	$bilder = cc_gif_bilder( $bytes );
	if ( $bilder < 2 ) {
		return $bytes;
	}

	if ( class_exists( 'Imagick' ) ) {
		try {
			$quelle = new Imagick();
			$quelle->readImageBlob( $bytes );

			$voll = $quelle->coalesceImages();
			$voll->setIteratorIndex( 0 );
			$erst = $voll->getImage();
			$erst->setImageFormat( 'gif' );
			$neu = (string) $erst->getImageBlob();

			$erst->clear();
			$voll->clear();
			$quelle->clear();

			/* ⚠ Nachgezaehlt und nicht geglaubt: Was hier zurueckgeht, muss
			   genau ein Bild haben. Sonst waere die Umrechnung umsonst
			   gewesen und haette die gelieferte Datei trotzdem ersetzt. */
			if ( '' !== $neu && 1 === cc_gif_bilder( $neu ) ) {
				return $neu;
			}
		} catch ( Throwable $e ) {
			/* Weiter zu GD. */
		}
	}

	if ( function_exists( 'imagecreatefromstring' ) && function_exists( 'imagegif' ) ) {
		$bild = @imagecreatefromstring( $bytes );
		if ( false !== $bild ) {
			ob_start();
			$ok  = imagegif( $bild );
			$neu = (string) ob_get_clean();
			imagedestroy( $bild );

			if ( $ok && '' !== $neu && 1 === cc_gif_bilder( $neu ) ) {
				return $neu;
			}
		}
	}

	return $bytes;
}

/**
 * **Den leeren Rand wegschneiden — Didis Entscheid vom 23.09.2026.**
 *
 * ── ⚠ ⚠  DER ANLASS, UND ER IST EIN OPTISCHER ──────────────────────────
 *
 * Viele Logodateien tragen rundum weissen oder durchsichtigen Rand. Die
 * Anzeige setzt jedes Wappen in denselben Kreis — das eigentliche Wappen
 * sitzt darin dann klein, und **zwei Wappen nebeneinander wirken ungleich
 * gross, obwohl beide Dateien dieselbe Kantenlaenge haben.** Der Rand ist
 * keine Eigenschaft des Wappens, sondern eine der Datei; also gehoert er
 * weg, bevor die Datei abgelegt wird.
 *
 * ── DIE REGEL, UND WARUM SIE SO EINFACH SEIN DARF ──────────────────────
 *
 * Ein umschliessendes Rechteck ueber ALLE Bildpunkte, die weder nahezu
 * weiss noch nahezu durchsichtig sind. Darauf wird zugeschnitten.
 *
 * ⚠ ⚠  **DER INHALT KANN PER KONSTRUKTION NICHT ANGESCHNITTEN WERDEN.**
 * Das Rechteck ist die Huelle aller Inhaltspunkte — jeder einzelne von
 * ihnen liegt darin, sonst waere es keine Huelle. Das ist Didis
 * ausdrueckliche Bedingung, und sie ist hier keine Zusicherung, die
 * jemand einhalten muss, sondern eine Eigenschaft der Rechnung.
 *
 * ⚠ **Was die Rechnung NICHT traegt, ist die Einstufung selbst**: Ein
 * blasser Inhaltspunkt, den die Schwelle faelschlich fuer Rand haelt, ist
 * kein Inhaltspunkt mehr und spannt nichts auf. Die Zusicherung lautet
 * also genau: **kein Punkt, der als Inhalt gilt, geht verloren.** Darum
 * sind die Schwellen eng gewaehlt, und die Begruendung dafuer steht
 * ausfuehrlich bei CC_WAPPEN_WEISS.
 *
 * ⚠ ⚠  **WEISS INNERHALB DES WAPPENS BLEIBT UNBERUEHRT, OHNE JEDEN
 * FUELLALGORITHMUS.** Eine weisse Flaeche mitten im Wappen liegt zwischen
 * Inhaltspunkten und damit INNERHALB des Rechtecks; sie wird nicht
 * betrachtet, sondern mitgenommen. Wer hier spaeter einen Flood-Fill
 * nachruesten will, soll wissen: **die einfache Form ist hier die richtige
 * und nicht die faule.** Ein Fuellalgorithmus koennte zusaetzlich nur das
 * leisten, was diese Regel absichtlich nicht tut — eine weisse Bucht vom
 * Rand her ausraeumen —, und dafuer muesste er Bildpunkte innerhalb der
 * Huelle veraendern. Genau das soll nie geschehen.
 *
 * ── ⚠  WAS SIE NICHT KANN, UND WAS DAS KOSTET ──────────────────────────
 *
 * **Ein weisses Wappen auf durchsichtigem Grund** (ein weisser Schriftzug
 * etwa) hat nach dieser Regel keinen einzigen Inhaltspunkt: seine Punkte
 * sind weiss, der Rest ist durchsichtig. Die Huelle waere leer, und statt
 * eines Rechtecks der Groesse 0 geht das **Original** zurueck, mit einem
 * Grund in `$masse`. Gemeldet und nicht heimlich behandelt: Ein zweiter
 * Durchlauf, der dann nur noch die Durchsichtigkeit zaehlt, waere machbar
 * und ist **nicht gebaut** — er ist Didis Entscheid und nicht meiner.
 *
 * **Ein animiertes GIF wird nicht beschnitten.** GD liest davon nur das
 * erste Bild; ein Beschnitt machte aus der Lieferung still ein Standbild,
 * und `$standbild` in der Antwort meldete trotzdem 0. Auf dem Weg durch
 * `cc_wappen_anlegen()` kommt der Fall nicht vor — dort laeuft
 * `cc_wappen_standbild()` davor. **Die Sperre steht fuer JEDEN anderen
 * Aufrufer**, der dieser Funktion eine beliebige abgelegte Datei reicht.
 *
 * ── ⚠ ⚠  GD UND NICHT IMAGICK, UND DAS IST KEINE BEQUEMLICHKEIT ────────
 *
 * Im Container stehen beide (gemessen am 23.09.2026: GD bundled 2.1.0,
 * ImageMagick 7.1.1-43 mit `trimImage`). Genommen wird GD, aus zwei
 * Gruenden:
 *
 *  1. **GD ist gebuendelt, und dieser Weg benutzt es schon.**
 *     `cc_wappen_standbild()` arbeitet zwei Zeilen hoeher mit `imagegif`
 *     und `imagedestroy`. Was auf DIESEM Container steht, sagt ueber den
 *     Server nichts; eine zweite Bibliothek als Voraussetzung einzufuehren
 *     hiesse, den Beschnitt dort stillschweigend ausfallen zu lassen.
 *  2. **`Imagick::trimImage()` hat die falsche Semantik.** Es beschneidet
 *     gegen die ECKFARBE mit Unschaerfe — nicht gegen «weiss ODER
 *     durchsichtig». Eine Datei mit durchsichtiger Ecke und weissem Rand
 *     traefe es nur halb, und zwar ohne dass es auffiele.
 *
 * ── ⚠ ⚠  DREI GEMESSENE EIGENHEITEN VON GD, DIE HIER DEN CODE FORMEN ───
 *
 *  1. **`imagecrop()` ZERSTOERT ein Palettenbild mit durchsichtigem
 *     Index.** Gemessen am 23.09.2026 an einem GIF mit drei Farben, Index 0
 *     durchsichtig: nach `imagecrop()` meldet das Ergebnis
 *     `transidx=-1, farben=1`, und die Ecke, die durchsichtiges Weiss war,
 *     liest sich als deckendes Rot. **Das ist kein Schoenheitsfehler,
 *     sondern ein falsches Bild.** Palettenbilder gehen darum ueber
 *     `imagecreate()` + `imagecopy()`, mit dem durchsichtigen Farbton
 *     vorab als Index 0 — gemessen: `transidx=0`, drei Farben, jede
 *     zeichengenau.
 *  2. **`imagepalettetotruecolor()` waere der falsche Ausweg.** Es
 *     UEBERTRAEGT die GIF-Durchsichtigkeit zwar richtig (der durchsichtige
 *     Ton kommt als `a=127` an), aber `imagegif()` flacht Alpha beim
 *     Zurueckschreiben auf Schwarz: der durchsichtige Rand kam als
 *     `rgb=4,2,4` wieder. Gemessen, und darum nicht gebaut.
 *  3. **`imagesavealpha()` muss bei Vollfarbe ausdruecklich gesetzt
 *     werden.** Ohne sie liest sich die durchsichtige Ecke des
 *     zugeschnittenen PNG als `a=0` — die Durchsichtigkeit waere weg, die
 *     Datei sogar kleiner (198 statt 256 Bytes), und nichts haette
 *     fehlgeschlagen.
 *
 * ── ⚠  DIE EINSTUFUNG KOSTET JE PALETTENFARBE, NICHT JE BILDPUNKT ──────
 *
 * Bei einem Palettenbild haengt das Urteil am INDEX. Es wird darum einmal
 * je Palettenfarbe gefaellt (hoechstens 256) und dann nachgeschlagen —
 * sonst kostete jeder Bildpunkt ein `imagecolorsforindex()`, und GIF waere
 * um ein Vielfaches teurer als PNG.
 *
 * ── ⚠  LAUFZEIT, GEMESSEN STATT VERMUTET ───────────────────────────────
 *
 * 23.09.2026, wp-Container, ein Durchlauf ueber alle Bildpunkte:
 * **512px: 23 ms.** 2000px: 390 ms. 4000px: 1,46 s. Darum die Grenze
 * CC_WAPPEN_PUNKTE, und darum wird sie am Dateikopf geprueft.
 *
 * ── ⚠ ⚠  UND WAS DAS FUER `sha256` BEDEUTET: NICHTS ────────────────────
 *
 * Dieselbe Frage ist beim Standbild schon entschieden und ausfuehrlich
 * begruendet (siehe den Kopf von `cc_wappen_standbild()`, Abschnitt «UND
 * WAS DAS FUER `sha256` BEDEUTET»). Der Beschnitt aendert daran nichts:
 * **Die Pruefsumme am Anhang bleibt die der LIEFERUNG.** Wuerde die Summe
 * der abgelegten Datei gespeichert, faende `cc_route_wappen()` im Zweig
 * `unveraendert` nie wieder eine Uebereinstimmung — ClubCampus schickte
 * jedes Wappen bei jedem Lauf neu, der Anhang wuerde jedes Mal ersetzt,
 * und die Antwort meldete dabei brav `ersetzt`.
 *
 * ── ⚠  SIE WIRFT NIE ───────────────────────────────────────────────────
 *
 * Jeder Fehlweg endet in «Original zurueck»: fehlende Bibliothek, krummes
 * Bild, entartete Kantenlaengen, gescheiterter Schnitt, gescheitertes
 * Schreiben. Didis Bedingung ist «nichts verlieren», und die wiegt
 * schwerer als ein enger Rand.
 *
 * @param string     $bytes Die Bilddaten.
 * @param string     $mime  Der am Inhalt gefundene Typ.
 * @param array|null $masse **Immer gefuellt, immer dieselben sechs
 *   Schluessel, immer dieselben Typen** — kein Schluessel kippt mit dem
 *   Inhalt, und keiner ist ein Behaelter (die Begruendung dafuer steht in
 *   0.9.34 im Aenderungsverzeichnis):
 *
 *     'beschnitten' bool   Sind die zurueckgegebenen Bytes andere?
 *     'breite'      int    Kantenlaenge VORHER (0, wenn nicht lesbar)
 *     'hoehe'       int
 *     'breite_neu'  int    Kantenlaenge NACHHER (gleich vorher, wenn
 *     'hoehe_neu'   int      nichts geschah)
 *     'grund'       string Der Klartext dazu; leer, wenn der erste
 *                          Durchlauf entschieden hat und nichts zu
 *                          erklaeren war
 *     'weg'         int    0 = kein Inhalt gefunden, 1 = erster
 *                          Durchlauf, 2 = zweiter (nur Durchsichtigkeit)
 *
 *   ⚠ **`beschnitten === false` und `grund === ''` heissen zusammen «es
 *   war nichts zu tun».** Das ist der Normalfall eines randlosen Wappens
 *   und keine Stoerung — er gehoert darum in keine Meldung.
 *
 *   ── ⚠ DER GRUND HAT SEIT 0.9.36 ZWEI BEDEUTUNGEN, UND `weg` TRENNT SIE ─
 *
 *   > ~~«Ein gefuellter `grund` heisst dagegen immer: **wir wollten und
 *   > konnten nicht.**»~~ — Stand 23.09.2026, ueberholt.
 *
 *   Seit dem zweiten Durchlauf gibt es einen Erfolg, der erklaert gehoert:
 *   ein weisses Wappen auf durchsichtigem Grund wird beschnitten, aber
 *   nach einer ANDEREN Regel als das uebrige. Gelesen wird darum das Paar:
 *
 *     beschnitten === true  und grund !== ''   der zweite Weg hat gegriffen
 *     beschnitten === false und grund !== ''   wir wollten und konnten nicht
 *     beschnitten === false und grund === ''   es war nichts zu tun
 *
 *   ⚠ **`weg` sagt dasselbe maschinenlesbar** und ist der Schluessel, den
 *   eine Pruefung befragt. Der Text ist fuer Menschen; wer auf ihn
 *   vergleicht, haengt an einer Formulierung.
 * @return string Die beschnittenen Bytes — oder **unveraendert `$bytes`**.
 */
function cc_wappen_beschnitt( string $bytes, string $mime, ?array &$masse = null ): string {
	$masse = array(
		'beschnitten' => false,
		'breite'      => 0,
		'hoehe'       => 0,
		'breite_neu'  => 0,
		'hoehe_neu'   => 0,
		'grund'       => '',
		'weg'         => 0,
	);

	/* ⚠ Die Schreibfunktion haengt am TYP und nicht an der Endung — und sie
	   wird hier ausgewaehlt, nicht als Variable gerufen: `imagegif()` nimmt
	   nur zwei Argumente, `imagejpeg()` und `imagewebp()` drei. Ein
	   `$aus( $bild, null, 92 )` waere fuer GIF ein TypeError. */
	$schreiber = array(
		'image/png'  => 'imagepng',
		'image/jpeg' => 'imagejpeg',
		'image/webp' => 'imagewebp',
		'image/gif'  => 'imagegif',
	);
	$aus = (string) ( $schreiber[ $mime ] ?? '' );

	$bild  = null;
	$zu    = null;
	/* ⚠ Der Puffer wird gleich aufgemacht. Wirft irgendetwas dazwischen,
	   bliebe er sonst offen stehen und schluckte die Antwort der Route. */
	$stufe = ob_get_level();

	try {
		/* ── 0 ── ⚠ ⚠  **DIE KANTENLAENGEN ZUERST, VOR JEDER WEIGERUNG.**
		   ~~Der Dateikopf wurde erst nach der Werkzeug- und der GIF-Pruefung
		   gelesen.~~ — Stand 23.09.2026, noch am selben Tag abgeloest.
		   Gemeldet von der Seite der Einmal-Routine, die diese Funktion
		   gegen fuenf echte Anhaenge laufen liess: Ein animiertes GIF von
		   160x160 kam mit `breite=0 hoehe=0` zurueck, obwohl der Kopf
		   lesbar war.

		   > **`0x0` liest sich wie ein kaputtes Bild und nicht wie «nicht
		   > beschnitten, und hier ist der Grund».** Ein Kanal, der im
		   > Aussetzerfall Nullen meldet, schweigt genau dort, wo man ihn
		   > liest.

		   ⚠ **Weggelassen ist nicht dasselbe wie leer.** Wo die Groesse
		   wirklich nicht zu ermitteln war, steht die 0 zusammen mit einem
		   Grund, der das sagt — und nie allein. */
		if ( function_exists( 'getimagesizefromstring' ) ) {
			$kopf = @getimagesizefromstring( $bytes );
			if ( is_array( $kopf ) && (int) ( $kopf[0] ?? 0 ) > 0 && (int) ( $kopf[1] ?? 0 ) > 0 ) {
				$masse['breite']     = (int) $kopf[0];
				$masse['hoehe']      = (int) $kopf[1];
				$masse['breite_neu'] = (int) $kopf[0];
				$masse['hoehe_neu']  = (int) $kopf[1];
			}
		}

		/* ── 1 ── Werkzeug. Fehlt eines, geschieht nichts — laut. */
		if ( '' === $aus
			|| ! function_exists( 'imagecreatefromstring' )
			|| ! function_exists( 'getimagesizefromstring' )
			|| ! function_exists( 'imagecrop' )
			|| ! function_exists( $aus ) ) {
			$masse['grund'] = 'GD kann «' . $mime . '» auf diesem Server nicht beschneiden';
			return $bytes;
		}

		/* ── 2 ── Ein animiertes GIF bleibt, wie es ist. Siehe den Kopf. */
		if ( 'image/gif' === $mime && cc_gif_bilder( $bytes ) > 1 ) {
			$masse['grund'] = 'animiertes GIF — ein Beschnitt naehme still nur das erste Bild';
			return $bytes;
		}

		/* ── 3 ── Der Dateikopf als BREMSE — die Auskunft steht schon oben.
		   ⚠ Genau darum steht die Punktgrenze hier und nicht drei Zeilen
		   tiefer: `imagecreatefromstring()` legt das ganze Bild im Speicher
		   an (2000px: 82 MiB gemessen). Eine Grenze, die erst danach
		   greift, hat schon bezahlt, wogegen sie schuetzen soll. */
		if ( $masse['breite'] < 1 || $masse['hoehe'] < 1 ) {
			$masse['grund'] = 'Kantenlaengen aus dem Dateikopf nicht lesbar — die 0 oben '
				. 'ist darum keine Messung, sondern ihr Fehlen';
			return $bytes;
		}

		if ( $masse['breite'] * $masse['hoehe'] > CC_WAPPEN_PUNKTE ) {
			$masse['grund'] = sprintf(
				'%dx%d Bildpunkte — mehr als die Grenze von %d; nicht beschnitten',
				$masse['breite'],
				$masse['hoehe'],
				CC_WAPPEN_PUNKTE
			);
			return $bytes;
		}

		/* ── 4 ── Dekodieren. */
		$bild = @imagecreatefromstring( $bytes );
		if ( false === $bild ) {
			$masse['grund'] = 'GD konnte das Bild nicht lesen';
			return $bytes;
		}

		/* ⚠ Ab hier gilt das DEKODIERTE Bild und nicht mehr der Kopf: Die
		   zwei koennen auseinanderlaufen (ein krummer Kopf, ein Typ, den GD
		   anders liest), und zugeschnitten wird auf das, was GD vor sich
		   hat. **Die Auskunft wird darum ueberschrieben und nicht ergaenzt**
		   — es soll immer die Kantenlaenge dastehen, an der wirklich
		   gearbeitet wurde. */
		$breite = (int) imagesx( $bild );
		$hoehe  = (int) imagesy( $bild );
		if ( $breite < 1 || $hoehe < 1 ) {
			$masse['grund'] = 'entartetes Bild (' . $breite . 'x' . $hoehe
				. ' nach dem Dekodieren)';
			return $bytes;
		}
		$masse['breite']     = $breite;
		$masse['hoehe']      = $hoehe;
		$masse['breite_neu'] = $breite;
		$masse['hoehe_neu']  = $hoehe;

		if ( $breite * $hoehe > CC_WAPPEN_PUNKTE ) {
			$masse['grund'] = sprintf(
				'%dx%d Bildpunkte nach dem Dekodieren — mehr als die Grenze von %d',
				$breite,
				$hoehe,
				CC_WAPPEN_PUNKTE
			);
			return $bytes;
		}

		/* ── 5 ── Bei Palette: das Urteil einmal je Farbe, siehe den Kopf.
		   ⚠ `imagecolorsforindex()` liefert fuer den durchsichtigen Index
		   `alpha => 127` (gemessen) — die Durchsichtigkeit eines GIF kommt
		   also auf demselben Weg an wie die eines PNG. */
		$tafel = null;
		if ( ! imageistruecolor( $bild ) ) {
			$tafel  = array();
			$farben = (int) imagecolorstotal( $bild );
			for ( $i = 0; $i < $farben; $i++ ) {
				$f = (array) imagecolorsforindex( $bild, $i );
				$tafel[ $i ] = ( (int) ( $f['alpha'] ?? 0 ) >= CC_WAPPEN_ALPHA )
					|| ( (int) ( $f['red'] ?? 0 ) >= CC_WAPPEN_WEISS
						&& (int) ( $f['green'] ?? 0 ) >= CC_WAPPEN_WEISS
						&& (int) ( $f['blue'] ?? 0 ) >= CC_WAPPEN_WEISS );
			}
		}

		/* ── 6 ── Die Huelle ueber alle Inhaltspunkte.
		   ⚠ Die Einstufung steht IM Schleifenrumpf und nicht in einer
		   eigenen Funktion: gemessen am 23.09.2026 kostet ein Funktionsruf
		   je Bildpunkt bei 512px rund 5 ms zusaetzlich (20 gegen 25 ms) —
		   ein Viertel des ganzen Durchlaufs fuer eine Zeile Lesbarkeit.
		   ⚠ Ein Index, den die Tafel nicht kennt, gilt als INHALT. Die
		   unbekannte Richtung soll das Rechteck weiten und nicht engen. */
		$links  = $breite;
		$oben   = $hoehe;
		$rechts = -1;
		$unten  = -1;

		for ( $y = 0; $y < $hoehe; $y++ ) {
			for ( $x = 0; $x < $breite; $x++ ) {
				$c = imagecolorat( $bild, $x, $y );

				if ( null === $tafel ) {
					if ( ( ( $c >> 24 ) & 0x7F ) >= CC_WAPPEN_ALPHA ) {
						continue;
					}
					if ( ( ( $c >> 16 ) & 0xFF ) >= CC_WAPPEN_WEISS
						&& ( ( $c >> 8 ) & 0xFF ) >= CC_WAPPEN_WEISS
						&& ( $c & 0xFF ) >= CC_WAPPEN_WEISS ) {
						continue;
					}
				} elseif ( ! empty( $tafel[ $c ] ) ) {
					continue;
				}

				if ( $x < $links ) {
					$links = $x;
				}
				if ( $x > $rechts ) {
					$rechts = $x;
				}
				if ( $y < $oben ) {
					$oben = $y;
				}
				if ( $y > $unten ) {
					$unten = $y;
				}
			}
		}

		$masse['weg'] = 1;

		/* ── 6b ── DER ZWEITE DURCHLAUF — Didis Auftrag vom 23.09.2026.
		   ⚠ Er laeuft NUR, wenn der erste nichts gefunden hat.

		   > ~~«Kein Rechteck der Groesse 0. Ein Bild ganz ohne Inhaltspunkt
		   > ist entweder leer oder weiss auf durchsichtigem Grund — beides
		   > Faelle, in denen das Original das Richtige ist.»~~ — Stand
		   > 23.09.2026, ueberholt: **die zwei Faelle sind nicht dasselbe.**

		   Ein weisses Wappen auf durchsichtigem Grund — ein Schriftzug in
		   Weiss ist der haeufige Fall — hat nach der Regel des ersten
		   Durchlaufs keinen einzigen Inhaltspunkt: jeder seiner Punkte ist
		   weiss, also «leer». Es ging damit unbeschnitten zurueck, und
		   genau die Datei, die den Beschnitt am noetigsten hat, bekam ihn
		   nicht. Fuer sie zaehlt nur noch die Durchsichtigkeit: **was nicht
		   durchsichtig ist, ist Inhalt.**

		   ⚠ **Die Regel ist die zweite Wahl und nicht die bessere.** Sie
		   kann einen weissen Grund nicht von weisser Schrift unterscheiden
		   — auf einem Bild OHNE Durchsichtigkeit haelt sie schlicht alles
		   fuer Inhalt und schneidet nichts. Darum steht sie hinten und
		   nicht vorne; der erste Durchlauf bleibt der Normalweg.

		   ⚠ **Eine zweite Schleife und kein Schalter im Rumpf der ersten.**
		   Der Vermerk an Schritt 6 ist gemessen: ein Funktionsruf je
		   Bildpunkt kostet bei 512px rund 5 ms von 20. Ein Test je
		   Bildpunkt ist billiger, aber er liefe auf JEDEM Bild mit, um
		   einem seltenen Fall zu dienen. Die Verdopplung ist bezahlter
		   Platz gegen Laufzeit auf dem Normalweg — und sie steht
		   unmittelbar neben ihrem Zwilling, wo eine Abweichung auffaellt. */
		if ( $rechts < $links || $unten < $oben ) {
			$tafel_d = null;
			if ( ! imageistruecolor( $bild ) ) {
				$tafel_d = array();
				$farben  = (int) imagecolorstotal( $bild );
				for ( $i = 0; $i < $farben; $i++ ) {
					$f = (array) imagecolorsforindex( $bild, $i );
					$tafel_d[ $i ] = ( (int) ( $f['alpha'] ?? 0 ) >= CC_WAPPEN_ALPHA );
				}
			}

			for ( $y = 0; $y < $hoehe; $y++ ) {
				for ( $x = 0; $x < $breite; $x++ ) {
					$c = imagecolorat( $bild, $x, $y );

					if ( null === $tafel_d ) {
						if ( ( ( $c >> 24 ) & 0x7F ) >= CC_WAPPEN_ALPHA ) {
							continue;
						}
					} elseif ( ! empty( $tafel_d[ $c ] ) ) {
						continue;
					}

					if ( $x < $links ) {
						$links = $x;
					}
					if ( $x > $rechts ) {
						$rechts = $x;
					}
					if ( $y < $oben ) {
						$oben = $y;
					}
					if ( $y > $unten ) {
						$unten = $y;
					}
				}
			}

			/* ⚠ **Jetzt ist das Bild wirklich leer** — kein Punkt, der
			   nicht durchsichtig waere. Da ist nichts zu beschneiden, und
			   die Lieferung geht unveraendert zurueck. */
			if ( $rechts < $links || $unten < $oben ) {
				$masse['weg']   = 0;
				$masse['grund'] = 'kein Inhaltspunkt, auch nicht nach der Durchsichtigkeit — '
					. 'das Bild ist ganz durchsichtig; nicht beschnitten';
				return $bytes;
			}

			$masse['weg'] = 2;
		}

		$neu_breite = $rechts - $links + 1;
		$neu_hoehe  = $unten - $oben + 1;

		/* ⚠ **Nichts wegzuschneiden ist kein Mangel**, und `grund` bleibt
		   darum leer. Die Bytes gehen Zeichen fuer Zeichen zurueck — nicht
		   «gleich aussehend», sondern derselbe String. Didis zweiter
		   Pruefpunkt haengt genau hier. */
		if ( $neu_breite === $breite && $neu_hoehe === $hoehe ) {
			return $bytes;
		}

		/* ⚠ **Der Grund wird hier gesetzt und nicht oben.** Ein ganz
		   weisses Bild ohne Durchsichtigkeit laeuft ebenfalls ueber den
		   zweiten Weg, findet dort ALLES als Inhalt und hat darum nichts
		   wegzuschneiden — es kehrt eine Zeile hoeher um. Stuende der Text
		   oben, traege dieser Fall einen gefuellten `grund` bei
		   `beschnitten === false`, und das liest sich als Fehlschlag.
		   **Erklaert wird, was geschehen IST, nicht was versucht wurde.** */
		if ( 2 === $masse['weg'] ) {
			$masse['grund'] = 'zweiter Durchlauf: kein Punkt war farbig genug, gezaehlt '
				. 'wurde darum nur die Durchsichtigkeit (weiss auf durchsichtigem Grund)';
		}

		/* ── 7 ── Zuschneiden. Zwei Wege, weil GD zwei braucht — siehe die
		   drei gemessenen Eigenheiten im Kopf dieser Funktion. */
		if ( null === $tafel ) {
			$zu = @imagecrop(
				$bild,
				array( 'x' => $links, 'y' => $oben, 'width' => $neu_breite, 'height' => $neu_hoehe )
			);
			if ( false === $zu || null === $zu ) {
				$masse['grund'] = 'imagecrop() hat nichts geliefert';
				return $bytes;
			}
			/* ⚠ Ohne diese zwei Zeilen faellt der Alphakanal beim Schreiben
			   still weg — gemessen, siehe Kopf. */
			imagealphablending( $zu, false );
			imagesavealpha( $zu, true );
		} else {
			$zu = @imagecreate( $neu_breite, $neu_hoehe );
			if ( false === $zu || null === $zu ) {
				$masse['grund'] = 'imagecreate() hat nichts geliefert';
				return $bytes;
			}
			/* ⚠ **Der durchsichtige Farbton ZUERST**, damit er Index 0 des
			   neuen Bildes wird und zugleich dessen Hintergrund. Genau das
			   ist der Unterschied zwischen einem GIF, dessen Rand
			   durchsichtig bleibt, und einem, dessen Rand ploetzlich die
			   Inhaltsfarbe traegt. */
			$ti = imagecolortransparent( $bild );
			if ( $ti >= 0 ) {
				$f   = (array) imagecolorsforindex( $bild, $ti );
				$idx = imagecolorallocate(
					$zu,
					(int) ( $f['red'] ?? 255 ),
					(int) ( $f['green'] ?? 255 ),
					(int) ( $f['blue'] ?? 255 )
				);
				if ( false !== $idx ) {
					imagecolortransparent( $zu, $idx );
				}
			}
			if ( ! imagecopy( $zu, $bild, 0, 0, $links, $oben, $neu_breite, $neu_hoehe ) ) {
				$masse['grund'] = 'imagecopy() ist fehlgeschlagen';
				return $bytes;
			}
		}

		/* ── 8 ── Schreiben. */
		ob_start();
		if ( 'imagepng' === $aus ) {
			$ok = imagepng( $zu );
		} elseif ( 'imagegif' === $aus ) {
			$ok = imagegif( $zu );
		} elseif ( 'imagejpeg' === $aus ) {
			$ok = imagejpeg( $zu, null, CC_WAPPEN_GUETE );
		} else {
			$ok = imagewebp( $zu, null, CC_WAPPEN_GUETE );
		}
		$neu = (string) ob_get_clean();

		if ( ! $ok || '' === $neu ) {
			$masse['grund'] = $aus . '() hat nichts geschrieben';
			return $bytes;
		}

		/* ⚠ **Nachgemessen und nicht geglaubt** — dieselbe Vorsicht wie bei
		   `cc_wappen_standbild()`, wo die Bilderzahl des Ergebnisses
		   nachgezaehlt wird. Was hier zurueckgeht, muss genau die berechnete
		   Groesse haben. Sonst waere die Lieferung durch etwas ersetzt, das
		   niemand geprueft hat. */
		$probe = @getimagesizefromstring( $neu );
		if ( ! is_array( $probe )
			|| (int) ( $probe[0] ?? 0 ) !== $neu_breite
			|| (int) ( $probe[1] ?? 0 ) !== $neu_hoehe ) {
			$masse['grund'] = 'das geschriebene Bild misst nicht ' . $neu_breite . 'x' . $neu_hoehe;
			return $bytes;
		}

		$masse['beschnitten'] = true;
		$masse['breite_neu']  = $neu_breite;
		$masse['hoehe_neu']   = $neu_hoehe;

		return $neu;
	} catch ( Throwable $e ) {
		/* ⚠ **Sie wirft nie.** Jeder Fehlweg endet hier oder oben in
		   «Original zurueck»; `$masse` traegt danach wieder die
		   Kantenlaengen der Lieferung, damit kein Aufrufer aus einem
		   halbgefuellten Feld schliesst, es sei etwas geschehen. */
		$masse['beschnitten'] = false;
		$masse['breite_neu']  = $masse['breite'];
		$masse['hoehe_neu']   = $masse['hoehe'];
		$masse['grund']       = 'Beschnitt fehlgeschlagen (' . get_class( $e ) . '): '
			. $e->getMessage();
		return $bytes;
	} finally {
		while ( ob_get_level() > $stufe ) {
			ob_end_clean();
		}
		if ( $bild ) {
			imagedestroy( $bild );
		}
		if ( $zu ) {
			imagedestroy( $zu );
		}
	}
}

/**
 * **Einen Wappen-Anhang anlegen.** Datei schreiben, Anhang eintragen, die
 * zwei Metafelder setzen, Bildgroessen erzeugen.
 *
 * ⚠ **Seit dem 23.09.2026 geht ein animiertes GIF vorher durch
 * `cc_wappen_standbild()`** und wird dabei auf sein erstes Bild
 * zurueckgefuehrt. `$standbild` meldet dem Aufrufer die Zahl der Bilder,
 * die eingegangen waren — **damit die Antwort sagt, dass die abgelegte
 * Datei nicht die gelieferte ist.** Eine stille Umrechnung waere genau die
 * Sorte Aenderung, die niemand bemerkt, bis sie jemanden kostet.
 *
 * ⚠ **Und seit 0.9.35 geht danach JEDES Bild durch
 * `cc_wappen_beschnitt()`** — der leere Rand faellt weg. `$beschnitt`
 * meldet dem Aufrufer, was dabei geschah, und zwar aus demselben Grund:
 * Die abgelegte Datei ist dann nicht die gelieferte, und **das darf nicht
 * nur die Datei wissen.**
 *
 * ⚠ **Was keinen leeren Rand hat, kommt Byte fuer Byte unveraendert hier
 * an und geht Byte fuer Byte unveraendert weiter** — nicht «gleich gross»
 * oder «gleich aussehend», sondern derselbe String. Beide Umrechnungen
 * geben im Fall «nichts zu tun» dieselbe Zeichenkette zurueck, und der
 * Vergleich unten ist darum `!==` auf die Bytes.
 *
 * ⚠ **Der Dateiname traegt die Team-Nummer** (`wappen-39010.png`). Er ist
 * damit im Uploads-Ordner lesbar, und ein verwaistes Bild laesst sich
 * zuordnen, ohne die Datenbank zu befragen.
 *
 * ⚠ `wp_generate_attachment_metadata()` braucht `wp-admin/includes/image.php`
 * — im REST-Aufruf ist das nicht geladen. **Ohne diesen Einschluss entsteht
 * der Anhang, aber keine einzige Zwischengroesse**, und die Anzeige fiele
 * stumm auf das Original zurueck.
 *
 * ── ⚠⚠ DIE PRUEFSUMME STEHT ZULETZT, UND DAS IST DER GANZE TRICK ───────
 *
 * ~~«`update_post_meta( CC_META_WAPPEN_TEAM )` → `update_post_meta(
 * CC_META_WAPPEN_SHA )` → Alternativtext → Bildgroessen»~~ — Stand
 * 23.09.2026, ueberholt: **die Summe stand vor dem Rest.** Stirbt der
 * Aufruf dazwischen (Zeitueberschreitung, Speicher, fataler Fehler), trug
 * der Anhang eine Pruefsumme, die nichts mehr belegte — und `bestand`
 * meldete sie, ClubCampus uebersprang das Team, das Wappen kam nie.
 *
 * > **Die Pruefsumme ist die Quittung und nicht der Anfang.** Steht sie
 * > da, ist alles davor gelungen; fehlt sie, war der Lauf unvollstaendig.
 * > Eine Reihenfolge, die das umdreht, macht aus dem verlaesslichsten Feld
 * > der Antwort das unzuverlaessigste.
 *
 * ⚠ **Die Team-Nummer bleibt VORNE**, und zwar mit Absicht: Sie ist die
 * Besitzmarke. Ohne sie ist der Anhang fuer `cc_wappen_anhaenge()`
 * unsichtbar — ein Abbruch hinterliesse dann ein Bild, das dieser Weg nie
 * wieder anfassen duerfte. Erst Besitz anmelden, dann arbeiten, zuletzt
 * quittieren.
 *
 * ── ⚠⚠ UND EIN AUFRAEUMER, DER AUCH NACH EINEM ABSTURZ NOCH LAEUFT ─────
 *
 * Gemessen am 23.09.2026: Ein fataler Fehler mitten in
 * `wp_insert_attachment()` liess `wappen-99202.png` im Uploads-Ordner
 * zurueck — eine Datei ohne jeden Eintrag, die niemand mehr zuordnet und
 * die beim naechsten Versuch `wappen-99202-1.png` erzwingt. Die
 * `return`-Wege raeumten sauber auf; **der Abbruch kennt kein `return`.**
 *
 * Darum haengt die Aufraeumung an `register_shutdown_function()`: PHP ruft
 * sie auch nach einem fatalen Fehler und nach der Zeitueberschreitung. Sie
 * loescht Anhang und Datei, solange `$schwebt` noch gefuellt ist — und
 * jeder Ausgang dieser Funktion leert es, der erfolgreiche wie der
 * fehlerhafte. **Was sie also entfernt, ist ausschliesslich ein Lauf, der
 * nie zu Ende kam.**
 *
 * @param string $tid       Die SFV-Teamnummer.
 * @param string $bytes     Die gelieferten Bilddaten.
 * @param string $mime      Der am Inhalt gefundene Typ.
 * @param string $sha       Die Pruefsumme der LIEFERUNG — unangetastet.
 * @param int   &$standbild 0, oder die Bilderzahl des gelieferten GIF,
 *                          wenn daraus ein Standbild gemacht wurde.
 * @param array &$beschnitt Der Bericht von `cc_wappen_beschnitt()`, in der
 *                          dort beschriebenen Form — immer gefuellt.
 * @return int|string Anhang-ID, oder eine Fehlermeldung als Text.
 */
function cc_wappen_anlegen( string $tid, string $bytes, string $mime, string $sha, &$standbild = null, &$beschnitt = null ) {
	$standbild = 0;

	$endung = CC_WAPPEN_MIME[ $mime ] ?? '';
	if ( '' === $endung ) {
		return 'Typ «' . $mime . '» hat keine Endung — nicht anzulegen';
	}

	$name = sanitize_file_name( 'wappen-' . $tid . '.' . $endung );

	/* ⚠⚠ **Ein animiertes GIF wird hier still gestellt** — Didis Entscheid
	   vom 23.09.2026, ausfuehrlich begruendet an `cc_wappen_standbild()`.
	   Kurz: Die Anzeige kann es nicht (WordPress legt keine Zwischengroesse
	   in Originalgroesse an und vergroessert nicht), also geschieht es beim
	   Annehmen.

	   ⚠ **`$sha` wird NICHT nachgerechnet.** Es ist die Summe der
	   LIEFERUNG, und nur so findet der Zweig `unveraendert` beim naechsten
	   Lauf wieder eine Uebereinstimmung. Eine Summe der umgerechneten Datei
	   liesse ClubCampus jedes Wappen bei jedem Lauf neu schicken, und die
	   Antwort meldete dabei brav `ersetzt`.

	   ⚠ Der Vergleich ist `!==` auf die Bytes und nicht «war es ein GIF?»:
	   Die Funktion gibt in jedem Fall, der nicht umgerechnet wurde, denselben
	   String zurueck — **auch im Fehlerfall**. `$standbild` meldet damit nur
	   das, was wirklich geschah. */
	$eingegangen = $bytes;
	$bytes       = cc_wappen_standbild( $bytes, $mime, $bilder );
	if ( $bytes !== $eingegangen ) {
		$standbild = (int) $bilder;
	}

	/* ⚠ ⚠ **Und danach faellt der leere Rand weg** — Didis Entscheid vom
	   23.09.2026, ausfuehrlich begruendet an `cc_wappen_beschnitt()`.
	   **Die abgelegte Datei ist das beschnittene Bild.**

	   ⚠ ⚠ **DIE REIHENFOLGE STANDBILD → BESCHNITT IST ABSICHT, NICHT
	   ZUFALL.** GD liest aus einem animierten GIF nur das erste Bild; ein
	   Beschnitt VOR dem Standbild machte aus der Lieferung stillschweigend
	   ein Standbild, und `$standbild` meldete trotzdem 0 — die Antwort
	   loege ueber das, was geschehen ist. So herum wird das GIF erst
	   ausdruecklich auf ein Bild zurueckgefuehrt und gemeldet, und der
	   Beschnitt sieht genau die Bytes, die abgelegt werden.
	   ⚠ `cc_wappen_beschnitt()` weigert sich bei einem animierten GIF
	   ausserdem von sich aus — falls `cc_wappen_standbild()` nicht
	   durchkam, bleibt die Animation und wird nicht heimlich kassiert.

	   ⚠ **`$sha` bleibt auch hier unangetastet**, aus demselben Grund wie
	   beim Standbild: Es ist die Summe der LIEFERUNG. Eine Summe der
	   beschnittenen Datei liesse `bestand` bei jedem Lauf eine Abweichung
	   melden, und ClubCampus schickte jedes Wappen jedes Mal neu. */
	$vor_beschnitt = $bytes;
	$bytes         = cc_wappen_beschnitt( $bytes, $mime, $beschnitt );
	if ( $bytes === $vor_beschnitt && is_array( $beschnitt ) ) {
		/* ⚠ Gemessen und nicht geglaubt: Meldet der Bericht einen Beschnitt,
		   die Bytes sind aber dieselben, dann ist der Bericht falsch — und
		   ein falscher Bericht ist teurer als gar keiner. */
		$beschnitt['beschnitten'] = false;
	}

	$ablage = wp_upload_bits( $name, null, $bytes );
	if ( ! is_array( $ablage ) || ! empty( $ablage['error'] ) ) {
		return 'Datei nicht ablegbar: ' . (string) ( $ablage['error'] ?? 'unbekannt' );
	}

	/* ⚠ Ab hier liegt etwas da, das ohne uns niemand mehr findet. `$schwebt`
	   ist die Notbremse; sie wird auf JEDEM Ausgang geleert, damit der
	   Aufraeumer nur den Abbruch trifft und nie einen zweiten Eintrag
	   derselben Nutzlast, der denselben Dateinamen bekommen hat. */
	$schwebt = array( 'datei' => (string) $ablage['file'], 'anhang' => 0 );
	register_shutdown_function(
		static function () use ( &$schwebt ): void {
			if ( ! is_array( $schwebt ) ) {
				return;
			}
			/* Erst der Anhang (er nimmt seine Dateien mit), dann der Rest —
			   ein Anhang ohne Pruefsumme ist eine halbe Spur und kein
			   Wappen. Die Reihenfolge ueberlebt auch einen Speicherabbruch
			   nach dem ersten Schritt. */
			if ( $schwebt['anhang'] > 0 ) {
				wp_delete_attachment( (int) $schwebt['anhang'], true );
			}
			if ( '' !== $schwebt['datei'] && file_exists( $schwebt['datei'] ) ) {
				wp_delete_file( $schwebt['datei'] );
			}
			$schwebt = null;
		}
	);

	/* ⚠ Der Anhang haengt am Team, wenn es eines gibt — sonst an nichts.
	   Ein Elternteil, das auf einen Beitrag zeigt, der gar nicht gemeint
	   ist, waere schlimmer als keines. */
	$karte  = cc_team_karte();
	$teamId = (int) ( $karte[ $tid ] ?? 0 );

	$anhang = wp_insert_attachment(
		array(
			'post_mime_type' => $mime,
			'post_title'     => 'Wappen ' . $tid,
			'post_content'   => '',
			'post_status'    => 'inherit',
			'post_parent'    => $teamId,
		),
		$ablage['file'],
		$teamId
	);

	if ( is_wp_error( $anhang ) || 0 === (int) $anhang ) {
		/* ⚠ Die Datei liegt dann schon da. Sie wird weggeraeumt, sonst
		   sammelt der Uploads-Ordner Reste, die niemand je findet. */
		if ( file_exists( $ablage['file'] ) ) {
			wp_delete_file( $ablage['file'] );
		}
		$schwebt = null;
		return 'Anhang nicht anlegbar: '
			. ( is_wp_error( $anhang ) ? $anhang->get_error_message() : 'ID 0' );
	}

	$anhang             = (int) $anhang;
	$schwebt['anhang']  = $anhang;

	/* ⚠ Die Besitzmarke zuerst — siehe den Kopf dieser Funktion. */
	update_post_meta( $anhang, CC_META_WAPPEN_TEAM, $tid );

	/* Der Alternativtext: der Teamname, wenn er da ist. Ein Wappen ohne
	   Namen ist fuer ein Vorleseprogramm nichts — und «Wappen» allein sagt
	   auch nichts. */
	if ( $teamId ) {
		update_post_meta( $anhang, '_wp_attachment_image_alt', 'Wappen ' . get_the_title( $teamId ) );
	}

	require_once ABSPATH . 'wp-admin/includes/image.php';
	$meta = wp_generate_attachment_metadata( $anhang, $ablage['file'] );
	if ( is_array( $meta ) ) {
		wp_update_attachment_metadata( $anhang, $meta );
	}

	/* ⚠ **Letzter Blick auf die Platte, bevor quittiert wird.** Die
	   Bilderzeugung fasst die Quelldatei an (Drehen nach EXIF, Verkleinern
	   eines zu grossen Originals); dass sie danach noch daliegt, ist
	   wahrscheinlich und nicht sicher. Eine Summe, die auf nichts zeigt,
	   soll hier gar nicht erst entstehen. */
	$liegt = (string) get_attached_file( $anhang );
	if ( '' === $liegt || ! file_exists( $liegt ) ) {
		wp_delete_attachment( $anhang, true );
		if ( file_exists( $ablage['file'] ) ) {
			wp_delete_file( $ablage['file'] );
		}
		$schwebt = null;
		return 'Datei nach dem Anlegen nicht mehr auffindbar — nichts eingetragen';
	}

	/* ⚠ **Die Quittung, und nichts steht mehr dahinter.** */
	update_post_meta( $anhang, CC_META_WAPPEN_SHA, $sha );
	$schwebt = null;

	return $anhang;
}

/**
 * Die Aktion `wappen`.
 *
 * ⚠ **Je Eintrag ein Urteil, und ein schlechter Eintrag haelt die uebrigen
 * nicht auf.** Dieselbe Regel wie ueberall in dieser Datei: Nicht die ganze
 * Nutzlast scheitern lassen, sonst kostet ein krummes Wappen alle zwanzig.
 */
function cc_route_wappen( WP_REST_Request $req ) {
	$fehlt = cc_voraussetzungen();
	if ( array() !== $fehlt ) {
		return new WP_REST_Response(
			array( 'fehler' => 'Voraussetzungen fehlen', 'fehlt' => $fehlt ),
			503
		);
	}

	$daten  = $req->get_json_params();
	$liste  = is_array( $daten['wappen'] ?? null ) ? $daten['wappen'] : null;
	$hinweis = array();

	if ( null === $liste ) {
		cc_bericht_ablegen(
			'wappen',
			array(
				'angelegt'     => 0,
				'ersetzt'      => 0,
				'unveraendert' => 0,
				'fehler'       => 0,
				'hinweis'      => array( 'Abgewiesen: «wappen» ist Pflicht — die Nutzlast fuehrte es nicht.' ),
			)
		);
		return new WP_REST_Response( array( 'fehler' => 'wappen ist Pflicht' ), 400 );
	}

	$liste = array_values( $liste );

	/* ⚠ **Nicht stumm abschneiden.** Eine Gegenstelle, die 50 schickt und
	   20 bestaetigt bekommt, haelt sonst 30 Wappen fuer erledigt. */
	if ( count( $liste ) > CC_WAPPEN_JE_AUFRUF ) {
		$hinweis[] = sprintf(
			'%d Eintraege geliefert, %d je Aufruf erlaubt — die uebrigen %d sind NICHT '
				. 'bearbeitet und muessen erneut geschickt werden.',
			count( $liste ),
			CC_WAPPEN_JE_AUFRUF,
			count( $liste ) - CC_WAPPEN_JE_AUFRUF
		);
		$liste = array_slice( $liste, 0, CC_WAPPEN_JE_AUFRUF );
	}

	$zahl = array( 'angelegt' => 0, 'ersetzt' => 0, 'unveraendert' => 0, 'fehler' => 0 );
	$urteile = array();

	foreach ( $liste as $i => $eintrag ) {
		if ( ! is_array( $eintrag ) ) {
			++$zahl['fehler'];
			$urteile[] = array(
				'nummer'      => (int) $i,
				'sfv_team_id' => '',
				'urteil'      => 'fehler',
				'grund'       => 'Eintrag ist kein Objekt',
			);
			continue;
		}

		$tid = cc_wappen_tid( $eintrag['sfv_team_id'] ?? null );
		if ( '' === $tid ) {
			++$zahl['fehler'];
			$urteile[] = array(
				'nummer'      => (int) $i,
				'sfv_team_id' => '',
				'urteil'      => 'fehler',
				'grund'       => '«sfv_team_id» fehlt oder ist leer',
			);
			continue;
		}

		$geprueft = cc_wappen_pruefe( $eintrag );
		if ( isset( $geprueft['fehler'] ) ) {
			++$zahl['fehler'];
			$urteile[] = array(
				'nummer'      => (int) $i,
				'sfv_team_id' => $tid,
				'urteil'      => 'fehler',
				'grund'       => $geprueft['fehler'],
			);
			continue;
		}

		$alt = cc_wappen_anhaenge( $tid );

		/* ── Unveraendert: genau einer, er traegt, und seine Summe stimmt. ──
		   ⚠ Bei MEHREREN wird nicht „unveraendert" gemeldet, auch wenn die
		   Summe passt: Der Ueberrest gehoert weg, und das ist ein
		   Schreibvorgang. Er laeuft darum ueber den Ersetzen-Zweig.

		   ⚠⚠ **Und `cc_wappen_mangel()` steht seit 23.09.2026 davor.**
		   ~~«genau einer, und seine Summe stimmt»~~ — Stand 23.09.2026,
		   ueberholt: Der Zweig verglich zwei Zeichenketten und sah nie
		   nach, ob das Bild ueberhaupt noch daliegt. Gemessen: Anhang
		   #4342 mit geloeschter Datei, dasselbe Wappen erneut geschickt →
		   `unveraendert`, und die Datei blieb weg. **Das war die zweite
		   Sperre neben `bestand`:** Selbst eine Gegenstelle, die es
		   trotzdem versuchte, kam nicht durch. Mit der Pruefung faellt ein
		   beschaedigter Anhang in den Ersetzen-Zweig und heilt sich. */
		if ( 1 === count( $alt ) && '' === cc_wappen_mangel( $alt[0] ) ) {
			$hat = strtolower( trim( (string) get_post_meta( $alt[0], CC_META_WAPPEN_SHA, true ) ) );
			if ( hash_equals( $geprueft['sha'], $hat ) ) {
				++$zahl['unveraendert'];
				$urteile[] = array(
					'nummer'      => (int) $i,
					'sfv_team_id' => $tid,
					'urteil'      => 'unveraendert',
					'anhang_id'   => $alt[0],
					'sha256'      => $hat,
				);
				continue;
			}
		}

		/* ── Anlegen, und erst DANN das Alte weg. ──
		   ⚠ **Die Reihenfolge ist Absicht.** Scheitert das Anlegen, steht
		   das alte Wappen noch — die Seite zeigt etwas Veraltetes statt
		   nichts. Umgekehrt waere der Fehlerfall ein Verlust. */
		$standbild = 0;
		$beschnitt = null;
		$neu       = cc_wappen_anlegen(
			$tid,
			$geprueft['bytes'],
			$geprueft['mime'],
			$geprueft['sha'],
			$standbild,
			$beschnitt
		);

		if ( ! is_int( $neu ) ) {
			++$zahl['fehler'];
			$urteile[] = array(
				'nummer'      => (int) $i,
				'sfv_team_id' => $tid,
				'urteil'      => 'fehler',
				'grund'       => (string) $neu,
			);
			continue;
		}

		/* ── ⚠⚠ DAS ALTE WEG, ABER NICHT MIT DEN DATEIEN DES NEUEN ──────
		   Gefunden am 23.09.2026, unmittelbar nachdem die Pruefung oben
		   den beschaedigten Anhang in diesen Zweig gelenkt hatte:

		     Nachlieferung fuer 99001 → «ersetzt», anhang_id 4350,
		     entfernt 1 — **und die Datei fehlte danach weiter.**

		   Der Grund ist die Namensvergabe. `wp_unique_filename()` haengt
		   nur dann eine `-1` an, wenn die Datei schon DALIEGT. Fehlt sie
		   (und genau das ist der Fall, der hier heilen soll), bekommt das
		   neue Bild **denselben** Pfad wie das alte — und
		   `wp_delete_attachment( $alt, true )` loescht die Dateien nach
		   dem Eintrag des ALTEN Anhangs, also exakt die eben
		   geschriebenen.

		   > **Die Selbstheilung haette sich in derselben Zeile wieder
		   > aufgehoben, und zwar still:** Beitrag ersetzt, Zaehler auf
		   > «ersetzt», Datei weg. Jede Nachlieferung haette das Gleiche
		   > getan, unbegrenzt oft.

		   Darum ein Schutzband um genau die Pfade des NEUEN Anhangs.
		   `wp_delete_file` ist der Kernfilter, durch den `wp_delete_
		   attachment_files()` jede einzelne Datei schickt — Original,
		   Zwischengroessen und das unskalierte Original. Ein leerer
		   Rueckgabewert laesst sie stehen. Der Filter haengt nur fuer die
		   Dauer dieser Schleife. */
		$schutz_pfade = array();
		$neu_datei    = (string) get_attached_file( $neu );
		if ( '' !== $neu_datei ) {
			$schutz_pfade[] = $neu_datei;
			$ordner         = dirname( $neu_datei );
			$neu_meta       = wp_get_attachment_metadata( $neu );
			foreach ( (array) ( $neu_meta['sizes'] ?? array() ) as $groesse ) {
				if ( ! empty( $groesse['file'] ) ) {
					$schutz_pfade[] = $ordner . '/' . $groesse['file'];
				}
			}
			if ( ! empty( $neu_meta['original_image'] ) ) {
				$schutz_pfade[] = $ordner . '/' . $neu_meta['original_image'];
			}
		}
		$schutz = static function ( $datei ) use ( $schutz_pfade ) {
			return in_array( (string) $datei, $schutz_pfade, true ) ? '' : $datei;
		};
		add_filter( 'wp_delete_file', $schutz );

		$weg = 0;
		foreach ( $alt as $id ) {
			/* ⚠ `true` — die Datei im Uploads-Ordner soll mit. Ohne das
			   bleibt sie liegen, zaehlt gegen den Platz und ist von der
			   Mediathek aus nicht mehr erreichbar. */
			if ( wp_delete_attachment( $id, true ) ) {
				++$weg;
			}
		}

		remove_filter( 'wp_delete_file', $schutz );

		if ( $alt ) {
			++$zahl['ersetzt'];
		} else {
			++$zahl['angelegt'];
		}

		$urteil = array(
			'nummer'      => (int) $i,
			'sfv_team_id' => $tid,
			'urteil'      => $alt ? 'ersetzt' : 'angelegt',
			'anhang_id'   => $neu,
			'sha256'      => $geprueft['sha'],
			'mime'        => $geprueft['mime'],
			'bytes'       => strlen( $geprueft['bytes'] ),
		);
		if ( $weg ) {
			$urteil['entfernt'] = $weg;
		}
		/* ⚠ **Die Antwort sagt es, wenn die abgelegte Datei nicht die
		   gelieferte ist.** `bytes` und `sha256` daneben beschreiben
		   weiterhin die LIEFERUNG — das ist kein Widerspruch, sondern die
		   Aufgabenteilung: Die Summe quittiert den Empfang, `standbild`
		   meldet, was daraus wurde. Ohne dieses Feld haette die Gegenstelle
		   keine Moeglichkeit, von der Umrechnung zu erfahren. */
		if ( $standbild > 1 ) {
			$urteil['standbild'] = $standbild;
		}
		/* ⚠ **Derselbe Satz noch einmal, fuer den Beschnitt.** Die abgelegte
		   Datei misst dann weniger als die gelieferte, und `bytes`/`sha256`
		   daneben beschreiben weiterhin die LIEFERUNG. Ohne dieses Feld
		   haette die Gegenstelle keine Moeglichkeit, von der Aenderung zu
		   erfahren — und genau solche stillen Aenderungen kosten spaeter.

		   ⚠ **Zwei Schluessel, und sie schliessen einander aus.**
		   `beschnitt` steht da, wenn geschnitten wurde; `beschnitt_grund`,
		   wenn es versucht wurde und nicht ging. **Fehlen beide, war nichts
		   wegzuschneiden** — der Normalfall eines randlosen Wappens, der
		   keine Meldung verdient.

		   ⚠ Die Kantenlaengen gehen als TEXT («200x200») und nicht als
		   Behaelter: Ein Schluessel, dessen JSON-Typ sich mit dem Inhalt
		   aendert, ist beim Auswerten teurer als ein paar Zeichen mehr —
		   dieselbe Begruendung wie in 0.9.33 und 0.9.34, nur diesmal von
		   vornherein.

		   ⚠ **`beschnitt_weg` steht nur beim zweiten Weg da** (0.9.36).
		   Der erste ist der Normalweg und braucht keine Meldung; der
		   zweite hat nach einer anderen Regel geschnitten — nur die
		   Durchsichtigkeit —, und das ist eine Auskunft, die die
		   Gegenstelle haben soll, falls ein Wappen anders herauskommt als
		   erwartet. Eine Zahl und kein Satz: der Text in `grund` ist fuer
		   Menschen, und wer auf ihn vergleicht, haengt an einer
		   Formulierung. */
		if ( is_array( $beschnitt ) ) {
			if ( ! empty( $beschnitt['beschnitten'] ) ) {
				if ( 2 === (int) ( $beschnitt['weg'] ?? 0 ) ) {
					$urteil['beschnitt_weg'] = 2;
				}
				$urteil['beschnitt'] = sprintf(
					'%dx%d → %dx%d',
					(int) $beschnitt['breite'],
					(int) $beschnitt['hoehe'],
					(int) $beschnitt['breite_neu'],
					(int) $beschnitt['hoehe_neu']
				);
			} elseif ( '' !== (string) ( $beschnitt['grund'] ?? '' ) ) {
				$urteil['beschnitt_grund'] = (string) $beschnitt['grund'];
			}
		}
		if ( count( $alt ) > 1 ) {
			$hinweis[] = sprintf(
				'Team %s trug %d Wappen — aufgeraeumt, eines bleibt.',
				$tid,
				count( $alt )
			);
		}
		$urteile[] = $urteil;
	}

	$antwort = array_merge(
		$zahl,
		array(
			'gesamt'     => count( $liste ),
			'eintraege'  => $urteile,
			'hinweis'    => $hinweis,
			'empfaenger' => basename( __FILE__ ),
			'version'    => CC_VERSION,
		)
	);

	cc_bericht_ablegen( 'wappen', $antwort );

	return new WP_REST_Response( $antwort, 200 );
}

/**
 * **Was `bestand` ueber die Wappen meldet — je Team die Nummer und die
 * Summe.**
 *
 * ⚠ **Auch die Teams OHNE Wappen stehen drin**, mit leerer Summe. Eine
 * Liste, die nur die vorhandenen nennt, beantwortet die Frage der
 * Gegenstelle nicht: Sie will wissen, was sie schicken muss, und das sind
 * die leeren Zeilen.
 *
 * ⚠ **Und die Wappen OHNE Team stehen auch drin.** Sie entstehen, wenn ein
 * Wappen vor seinem Team ankommt — kein Fehler, aber ein Zustand, den
 * niemand sonst sehen wuerde.
 *
 * ⚠ ⚠ **SEIT DEM 23.09.2026 GEHT DIESER RUECKGABEWERT AUF ZWEI SCHLUESSEL
 * DER ANTWORT.** `cc_route_bestand()` legt `teams` als LISTE unter
 * `wappen` ab und den Rest unter `wappen_lage`. Wer hier ein Feld
 * hinzufuegt, muss wissen, in welchem der beiden es landet: alles ausser
 * `teams` geht nach `wappen_lage`.
 *
 * ⚠ Die Funktion selbst blieb unveraendert — sie hat weitere Leser
 * (`pruef/`, Wegwerfskripte), und eine Form zu aendern, die nur an EINER
 * Stelle falsch verwendet wurde, haette den Fehler verschoben statt
 * behoben.
 */
/**
 * **Wie viele der zwei freiwilligen Nummern schon ankommen — seit 0.9.30.**
 *
 * ⚠ **Eine Null ist hier eine AUSKUNFT und kein Fehler.** ClubCampus
 * schickt beide Felder erst ab dem naechsten Deploy; bis dahin ist null der
 * richtige Wert. Ohne diese Zahl bliebe der Gegenstelle nur die Website als
 * Anzeige — und dort faellt ein fehlendes Feld nicht auf, weil an seiner
 * Stelle der Platzhalter steht.
 *
 * ⚠ **Die Ranglistenzeilen werden aus der OPTION gezaehlt**, nicht aus dem
 * Wiederholer am Team: Der Abgleich schreibt in `CC_OPT_RANG`, der
 * Wiederholer ist die handgepflegte Rueckfallquelle. Wer den Wiederholer
 * zaehlte, mass die Handarbeit und nicht die Lieferung.
 *
 * @return array Zaehler fuer beide Felder.
 */
function cc_sfv_nummern_lage(): array {
	/* ── Die Gegnernummer an den Spielen ── */
	$spiele_mit  = 0;
	$spiele_alle = 0;

	foreach ( cc_abgleich_kandidaten() as $postId ) {
		++$spiele_alle;
		if ( '' !== cc_wappen_tid( get_field( 'sfv_gegner_team_id', (int) $postId ) ) ) {
			++$spiele_mit;
		}
	}

	/* ── Die Nummer je Ranglistenzeile, aus der Ablage ── */
	$rang       = get_option( CC_OPT_RANG, array() );
	$zeilen_mit = 0;
	$zeilen_all = 0;
	$gruppen    = 0;

	if ( is_array( $rang ) ) {
		foreach ( $rang as $g ) {
			if ( ! is_array( $g ) ) {
				continue;
			}
			++$gruppen;
			/* ⚠ Der Name der Zeilenliste ist nicht zugesichert — die
			   Gruppenobjekte kommen unveraendert von der Gegenstelle.
			   Darum jede Liste von Zeilen befragen, statt einen Schluessel
			   zu raten. */
			foreach ( $g as $wert ) {
				if ( ! is_array( $wert ) ) {
					continue;
				}
				foreach ( $wert as $zeile ) {
					if ( ! is_array( $zeile ) || ! array_key_exists( 'team', $zeile ) ) {
						continue;
					}
					++$zeilen_all;
					if ( '' !== cc_wappen_tid( $zeile['sfv_team_id'] ?? null ) ) {
						++$zeilen_mit;
					}
				}
			}
		}
	}

	return array(
		'spiele_gesamt'          => $spiele_alle,
		'spiele_mit_gegnernummer' => $spiele_mit,
		'rang_gruppen'           => $gruppen,
		'rang_zeilen_gesamt'     => $zeilen_all,
		'rang_zeilen_mit_nummer' => $zeilen_mit,
	);
}

/**
 * ── ⚠⚠ KEINE PRUEFSUMME OHNE ANHANG — 23.09.2026 ──────────────────────
 *
 * ~~«`sha256` aus `get_post_meta($ids[0], CC_META_WAPPEN_SHA)`»~~ — Stand
 * 23.09.2026, ueberholt: **Die Summe wurde gemeldet, sobald das Metafeld
 * dastand.** Ob die Datei dahinter noch existierte, fragte niemand.
 *
 * Gemessen im lokalen Stapel (23.09.2026): Anhang #4342 angelegt, dann die
 * zwei Dateien von Hand geloescht. Die Antwort war **vorher wie nachher
 * identisch** — `mit_wappen: 1`, `sha256: 00fcc0b2…`, `anhang_id: 4342`,
 * `mehrfach: 0` —, die Seite zeigte ein `<img>` auf eine Adresse mit HTTP
 * **404**, und eine erneute Lieferung wurde mit `unveraendert` abgewiesen.
 *
 * ── ⚠⚠ WAS CLUBCAMPUS DAVON SIEHT (VERTRAG MIT EINEM FREMDEN REPOSITORY)
 *
 * Die Antwortform waechst um **ein** Feld je Teamzeile und **einen**
 * Zaehler. Bestehende Felder behalten Name und Bedeutung; ein Leser, der
 * das neue Feld nicht kennt, liest weiter richtig — er sieht nur eine
 * leere `sha256` und schickt das Wappen nach, und genau das ist gewollt.
 *
 *   `mangel`          je Teamzeile, Text. Leer heisst: alles in Ordnung.
 *                     Sonst steht da im Klartext, WARUM die Summe leer ist
 *                     («Datei fehlt im Uploads-Ordner (wappen-39010.png)»,
 *                     «Pruefsumme fehlt am Anhang — das Anlegen wurde
 *                     abgebrochen»).
 *   `wappen_verloren` oben in der Lage, Zahl. Wie viele Teams ein Wappen
 *                     hatten und es verloren haben.
 *
 * > **Warum nicht einfach stumm die Summe leeren?** Weil «nie geliefert»
 * > und «geliefert, aber verloren» dasselbe aussaehen. Das erste ist der
 * > Normalfall eines jungen Bestands, das zweite ein Befund, dem jemand
 * > nachgehen muss — eine Mediathek, die Dateien verliert, verliert
 * > naechste Woche mehr als Wappen.
 *
 * ⚠ **`anhang_id` und `mehrfach` haetten NICHT gereicht**, und das ist
 * geprueft und nicht vermutet: `anhang_id > 0` bei leerer `sha256` waere
 * eine Regel, die nur kennt, wer sie hier nachliest — und sie nennte den
 * Grund nicht. `mehrfach` beantwortet eine andere Frage (Ueberreste) und
 * ist im Schadensfall `0`, sieht also aus wie Ordnung.
 */
function cc_wappen_lage(): array {
	$karte    = cc_team_karte();
	$zeilen   = array();
	$mit      = 0;
	$verloren = 0;

	foreach ( $karte as $tid => $teamId ) {
		$tid    = cc_wappen_tid( $tid );
		$ids    = cc_wappen_anhaenge( $tid );
		$id     = $ids ? (int) $ids[0] : 0;
		$mangel = $id ? cc_wappen_mangel( $id ) : '';

		/* ⚠ Die Summe wird NUR gelesen, wenn der Anhang traegt. Sie sonst
		   zu melden, waere die Zusage, dass das Bild daliegt — und die
		   Gegenstelle ueberspringt, was `bestand` als vorhanden fuehrt. */
		$sha = ( $id && '' === $mangel )
			? strtolower( trim( (string) get_post_meta( $id, CC_META_WAPPEN_SHA, true ) ) )
			: '';

		if ( '' !== $sha ) {
			++$mit;
		} elseif ( '' !== $mangel ) {
			++$verloren;
		}

		$zeilen[] = array(
			'sfv_team_id' => $tid,
			'sha256'      => $sha,
			'anhang_id'   => $id,
			'mehrfach'    => count( $ids ) > 1 ? count( $ids ) : 0,
			'mangel'      => $mangel,
			'team'        => $teamId ? get_the_title( $teamId ) : '',
		);
	}

	/* Wappen, deren Nummer zu keinem Team passt. */
	$fremd = array();
	foreach ( cc_wappen_alle() as $id => $tid ) {
		if ( ! isset( $karte[ $tid ] ) ) {
			$fremd[] = array( 'sfv_team_id' => $tid, 'anhang_id' => (int) $id );
		}
	}

	/* ⚠⚠ **`teams_gesamt` zaehlt Teams MIT `sfv_id`, nicht alle Teams — und
	   eine Null hier braucht ihre Erklaerung.** Gemessen am 23.09.2026 im
	   lokalen Stapel: 11 Teams, davon **0 mit `sfv_id`**. `bestand` meldete
	   damit «teams_gesamt: 0», waehrend elf Mannschaften dastehen.

	   > **Eine Null ohne Bezugsgroesse ist keine Auskunft, sondern eine
	   > Falle.** Die Gegenstelle koennte sie fuer «keine Teams» lesen und
	   > aufhoeren, statt fuer «die Nummern fehlen noch» und nachzufragen.

	   Darum steht `teams_ohne_sfv_id` daneben. Die elf SFV-Nummern sind ein
	   offener Punkt des Vereins, kein Fehler dieses Wegs — aber er darf ihn
	   nicht verschweigen. */
	$alle_teams = get_posts(
		array(
			'post_type'   => CC_TYP_TEAM,
			'post_status' => CC_TEAM_ZUSTAENDE,
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);

	/* ⚠ `wappen_verloren` ist eine Teilmenge von `ohne_wappen` und kein
	   dritter Topf. Ohne den Zaehler muesste die Gegenstelle alle Zeilen
	   durchsehen, um zu merken, dass ueberhaupt etwas kaputt ist — und ein
	   Befund, den man suchen muss, wird nicht gefunden. */
	return array(
		'teams_gesamt'      => count( $zeilen ),
		'teams_ohne_sfv_id' => count( $alle_teams ) - count( $zeilen ),
		'mit_wappen'        => $mit,
		'ohne_wappen'       => count( $zeilen ) - $mit,
		'wappen_verloren'   => $verloren,
		'ohne_team'         => $fremd,
		'teams'             => $zeilen,
	);
}

/** Alle Wappen-Anhaenge als `[ Anhang-ID => sfv_team_id ]`. */
function cc_wappen_alle(): array {
	$ids = get_posts(
		array(
			'post_type'        => 'attachment',
			'post_status'      => 'inherit',
			'numberposts'      => -1,
			'fields'           => 'ids',
			'suppress_filters' => false,
			'meta_query'       => array(
				array(
					'key'     => CC_META_WAPPEN_TEAM,
					'compare' => 'EXISTS',
				),
			),
		)
	);

	$raus = array();
	foreach ( (array) $ids as $id ) {
		$raus[ (int) $id ] = cc_wappen_tid( get_post_meta( (int) $id, CC_META_WAPPEN_TEAM, true ) );
	}
	return $raus;
}


/* ═══════════════════════════════════════════════════════════════════════
   SPERREN IM BACKEND
   ═══════════════════════════════════════════════════════════════════════

   ⚠ WARUM UEBERHAUPT: was der Abgleich schreibt, ueberschreibt er beim
     naechsten Lauf. Ein Feld, das sich aendern laesst und stillschweigend
     zurueckgesetzt wird, ist schlimmer als ein gesperrtes — es kostet
     Arbeit und meldet den Verlust nicht.

   ⚠ UND DESHALB EIN HINWEIS UND NICHT NUR EIN GRAUES FELD: eine Sperre ohne
     Wegweiser ist eine Sackgasse. Der Satz sagt, wohin man geht.
   ═══════════════════════════════════════════════════════════════════════ */

add_filter(
	'acf/prepare_field',
	static function ( $field ) {
		if ( ! is_array( $field ) || ! is_admin() ) {
			return $field;
		}

		$name = (string) ( $field['name'] ?? '' );

		/* Nur an fch_spiel, und nur bei Beitraegen, die dem Abgleich
		   gehoeren. ⚠ Ein von Hand erfasstes Freundschaftsspiel bleibt
		   vollstaendig bearbeitbar — es wird ja auch nie ueberschrieben. */
		$post_id = (int) ( get_the_ID() ?: 0 );
		if ( ! $post_id || CC_TYP_SPIEL !== get_post_type( $post_id ) ) {
			return $field;
		}
		if ( '' === trim( (string) get_post_meta( $post_id, 'sfv_match_id', true ) ) ) {
			return $field;
		}

		$gesperrt = array_merge( CC_FELDER, array( 'verlauf' ) );
		if ( ! in_array( $name, $gesperrt, true ) ) {
			return $field;
		}

		$field['readonly'] = 1;
		$field['disabled'] = 1;

		$hinweis = 'verlauf' === $name
			? 'Kommt aus ClubCampus, wird stuendlich ueberschrieben. Korrektur im Portal: Termine → Spiel → Spielbericht. Wem ein Ereignis zuzurechnen ist, steht im Feld «Ereignisse» darueber — das bleibt bearbeitbar.'
			: 'Kommt aus ClubCampus, wird stuendlich ueberschrieben.';

		$field['instructions'] = trim( (string) ( $field['instructions'] ?? '' ) . ' ' . $hinweis );

		return $field;
	}
);


/* ═══════════════════════════════════════════════════════════════════════
   ZWEI BEITRAEGE MIT DERSELBEN sfv_match_id
   ═══════════════════════════════════════════════════════════════════════

   ⚠ Waeren es zwei, bekaeme bei jedem Lauf ein anderer die Daten — ein Wert,
     der pendelt, sieht aus wie Pflege. Der Abgleich faengt es ohnehin ab
     (cc_abgleich_kandidaten behaelt nur einen), aber erst beim Lauf; hier
     faellt es sofort auf.

   ⚠ Diese Pruefung MELDET nur. Sie verhindert das Speichern nicht — wer
     einen Wert von Hand berichtigt, soll dabei nicht ausgesperrt werden.
   ═══════════════════════════════════════════════════════════════════════ */

add_action(
	'admin_notices',
	static function (): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || CC_TYP_SPIEL !== $screen->post_type ) {
			return;
		}

		global $wpdb;
		$doppelte = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT pm.meta_value FROM {$wpdb->postmeta} pm
				   JOIN {$wpdb->posts} p ON p.ID = pm.post_id
				  WHERE pm.meta_key = %s AND pm.meta_value <> ''
				    AND p.post_type = %s AND p.post_status <> 'trash'
				  GROUP BY pm.meta_value HAVING COUNT(*) > 1",
				'sfv_match_id',
				CC_TYP_SPIEL
			)
		);

		if ( ! $doppelte ) {
			return;
		}

		printf(
			'<div class="notice notice-warning"><p><strong>ClubCampus-Abgleich:</strong> %d SFV-Match-ID(s) kommen mehrfach vor (%s). Der Abgleich bedient dann nur einen der Beitraege — bitte von Hand klaeren.</p></div>',
			count( $doppelte ),
			esc_html( implode( ', ', array_slice( $doppelte, 0, 10 ) ) )
		);
	}
);


/* ══════════════════════════════════════════════════════════════════════
   LAUFZEIT IN JEDER ANTWORT — 0.9.38 (26.09.2026)
   ══════════════════════════════════════════════════════════════════════

   ⚠ **DIESE DATEI LIEFERT CLUBCAMPUS ALS GANZES.** Beim naechsten Nachschub
   wird sie ERSETZT und nicht zusammengefuehrt — was hier steht und drueben
   nicht nachgezogen wird, ist dann weg, ohne Konflikt und ohne Meldung.

   ── Warum die Zahl in JEDE Antwort gehoert ──────────────────────────────

   Die Laufzeit wurde bisher nur im ABBRUCHBERICHT festgehalten
   (`cc_bericht_notfalls()`, Feld `laufzeit`). **Damit gab es sie genau dann,
   wenn es zu spaet war.** Ein Lauf, der in 90 s durchkommt, meldete dieselbe
   Antwort wie einer, der in 8 s durchkam — und niemand konnte sehen, dass
   die 150 s naeher rueckten, bevor sie gerissen wurden.

   > **Eine Zahl, die erst im Schadensfall entsteht, misst den Schaden und
   > nicht den Weg dorthin.**

   Die Gegenstelle bekommt sie jetzt bei jedem Aufruf und kann selbst
   entscheiden, ob sie den Abgleich kleiner schneidet.

   ── Was genau gemessen wird, und warum zwei Quellen ─────────────────────

   ```
   cc_lauf_stand['start']   die Messung der Route selbst (Weg «spiele»);
                            beginnt NACH cc_voraussetzungen() und dem
                            Zeitschutz — dieselbe Zahl, die der
                            Abbruchbericht fuehrt
   cc_anfrage_start         Rueckfall fuer alle uebrigen Routen: gesetzt,
                            wenn diese Datei geladen wird
   ```

   ⚠ **Die zwei sind nicht dasselbe, und das ist Absicht.** Wer `laufzeit_ms`
   mit dem `laufzeit`-Feld des Abbruchberichts vergleicht, soll dieselbe
   Zahl sehen; darum hat `cc_lauf_stand['start']` Vorrang. Fuer `/status`
   und `/bestand` gibt es keine solche Messung, und dort ist die Ladezeit
   der Datei der ehrlichere Anfang.

   ⚠ **Auch Fehlerantworten tragen sie** — 401, 400, 503. Gerade dort ist
   sie etwas wert: Eine abgewiesene Anfrage, die 40 s gebraucht hat, sagt
   etwas ganz anderes als eine, die sofort zurueckkam.

   ⚠ **In Millisekunden und als Ganzzahl.** Der Abbruchbericht fuehrt
   `laufzeit` in SEKUNDEN (`(int)` einer Differenz, also abgeschnitten —
   aus 0,9 s wird dort 0). Ein zweites Feld mit demselben Namen und einer
   anderen Einheit waere die Falle; darum heisst dieses `laufzeit_ms` und
   sagt die Einheit im Namen. */

$GLOBALS['cc_anfrage_start'] = microtime( true );

/**
 * Die bisher verstrichene Zeit dieser Anfrage in Millisekunden.
 *
 * @return int Millisekunden, nie negativ.
 */
function cc_laufzeit_ms(): int {
	$start = $GLOBALS['cc_lauf_stand']['start']
		?? $GLOBALS['cc_anfrage_start']
		?? microtime( true );

	return (int) max( 0, round( ( microtime( true ) - (float) $start ) * 1000 ) );
}

add_filter(
	'rest_post_dispatch',
	/**
	 * @param mixed           $ergebnis Antwort des Servers.
	 * @param mixed           $server   REST-Server (ungenutzt).
	 * @param WP_REST_Request $anfrage  Die Anfrage.
	 * @return mixed
	 */
	static function ( $ergebnis, $server, $anfrage ) {
		if ( ! $ergebnis instanceof WP_HTTP_Response || ! $anfrage instanceof WP_REST_Request ) {
			return $ergebnis;
		}

		/* ⚠ Nur der eigene Namensraum. Ein Filter, der JEDE REST-Antwort
		   der Website anfasst, veraendert fremde Schnittstellen — und der
		   Block-Editor ist eine davon. */
		if ( 0 !== strpos( (string) $anfrage->get_route(), '/' . CC_ROUTE . '/' ) ) {
			return $ergebnis;
		}

		$daten = $ergebnis->get_data();
		if ( ! is_array( $daten ) ) {
			return $ergebnis;
		}

		/* ⚠ Nicht ueberschreiben, falls eine Route das Feld je selbst
		   fuehrt: die Route weiss mehr ueber ihren eigenen Lauf als dieser
		   Filter, der nur das Ende sieht. */
		if ( ! array_key_exists( 'laufzeit_ms', $daten ) ) {
			$daten['laufzeit_ms'] = cc_laufzeit_ms();
			$ergebnis->set_data( $daten );
		}

		return $ergebnis;
	},
	10,
	3
);
