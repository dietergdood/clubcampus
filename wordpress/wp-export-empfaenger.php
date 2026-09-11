<?php
/**
 * ClubCampus-Abgleich — Empfaenger auf WordPress-Seite
 *
 * Plugin Name: ClubCampus Export
 * Description: Nimmt Spielplan, Verlauf und Ranglisten aus ClubCampus entgegen.
 * Version:     0.9.13
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
const CC_VERSION    = '0.9.13';
const CC_TYP_SPIEL  = 'fch_spiel';
const CC_TYP_TEAM   = 'fch_team';
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
			'feld_mehrdeutig'       => (array) ( $GLOBALS['cc_feld_mehrdeutig'] ?? array() ),
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

function cc_schreibe_felder( int $post_id, array $spiel ): array {
	$geschrieben = array();
	foreach ( CC_FELDER as $feld ) {
		if ( ! array_key_exists( $feld, $spiel ) ) {
			continue;
		}
		/* ⚠ Der Repeater geht durch eine eigene Unterfeld-Allowlist —
		   wie der Verlauf, und aus demselben Grund. Bis 0.9.7 reichte er
		   jede Zeile unveraendert durch. */
		$wert = ( 'aufstellung' === $feld )
			? cc_saeubere_aufstellung( $spiel[ $feld ] )
			: $spiel[ $feld ];

		/* ⚠ Ueber den SCHLUESSEL. Findet sich keiner, wird NICHT ueber
		   den Namen ausgewichen: das waere genau der unvorhersehbare
		   Weg. Lieber nicht schreiben und es sagen. */
		$key = cc_feld_schluessel( $post_id, $feld );
		if ( null === $key ) {
			$GLOBALS['cc_ohne_feldschluessel'][ $feld ] = true;
			continue;
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
function cc_schreibe_verlauf( int $post_id, array $verlauf ): int {
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
		$teamId = (int) get_field( 'fch_team', $postId );
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

	return new WP_REST_Response(
		array(
			'gesamt'                    => count( $zeilen ),
			'ohne_laufstempel'          => $ohne,
			'ohne_laufstempel_sichtbar' => $ohne_publ,
			/* ⚠ Die Gegenprobe auf die Besitzregel: Beitraege OHNE
			   sfv_match_id fasst der Export nie an. Bleibt diese Zahl
			   konstant, hat er die Grenze eingehalten. */
			'handbeitraege'             => cc_zaehle_handbeitraege(),
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

	$vorhanden = cc_abgleich_kandidaten();
	$teamKarte = cc_team_karte();

	$erg = array(
		'neu' => 0, 'aktualisiert' => 0, 'zurueckgezogen' => 0,
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
			$erg['aktualisiert']++;
			/* Status 12 des Verbands ("keine Publikation"): zurueckziehen. */
			if ( false === ( $spiel['publizieren'] ?? true ) ) {
				wp_update_post( array( 'ID' => $postId, 'post_status' => 'draft' ) );
			}
		}

		$spiel['quelle'] = CC_QUELLE;
		/* ⚠ VOR dem Schreiben, und aus der Nutzlast wie sie kam: `quelle`
		   setzen wir selbst, das gehoert nicht in die Meldung. */
		foreach ( cc_unbeachtete_felder( $spiel ) as $f ) {
			$erg['unbeachtete_felder'][ $f ] = true;
		}
		cc_schreibe_felder( (int) $postId, $spiel );
		cc_stempel( (int) $postId, $lauf );

		if ( is_array( $spiel['verlauf'] ?? null ) ) {
			$erg['verlauf_zeilen'] += cc_schreibe_verlauf( (int) $postId, $spiel['verlauf'] );
		}

		cc_titel_nachziehen( (int) $postId );
	}

	/* ── Rueckzug ────────────────────────────────────────────────────────
	   ⚠ Zwei Bedingungen, beide verengend: der Beitrag muss dem Abgleich
	   gehoeren (sfv_match_id gesetzt — das ist $vorhanden) UND sein Team
	   muss in diesem Lauf geliefert worden sein. Nichts wird geloescht. */
	foreach ( $vorhanden as $mid => $postId ) {
		if ( isset( $geliefert[ $mid ] ) ) {
			continue;
		}
		$teamId = (int) get_field( 'fch_team', $postId );
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
			'zurueckgezogen' => (int) $erg['zurueckgezogen'],
			'verlauf_zeilen' => (int) $erg['verlauf_zeilen'],
			/* ⚠ In den Bericht, nicht nur in die Antwort: die Antwort sieht
			   nur, wer den Lauf ausloest. Der Bericht ist die Stelle, an
			   der jemand SPAETER nachsieht — und genau dann wird gefragt,
			   ob die Aufstellung angekommen ist. */
			'aufstellung_zeilen' => (int) ( $GLOBALS['cc_aufstellung_zeilen'] ?? 0 ),
			'aufstellung_spiele' => (int) ( $GLOBALS['cc_aufstellung_spiele'] ?? 0 ),
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
	$erg['aufstellung_je_spiel'] = (array) ( $GLOBALS['cc_aufstellung_je_spiel'] ?? array() );

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
