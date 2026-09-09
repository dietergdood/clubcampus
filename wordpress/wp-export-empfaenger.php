<?php
/**
 * ClubCampus-Abgleich — Empfaenger auf WordPress-Seite
 *
 * Plugin Name: ClubCampus Export
 * Description: Nimmt Spielplan, Verlauf und Ranglisten aus ClubCampus entgegen.
 * Version:     0.1.0
 *
 * ⚠ ⚠  STAND 08.09.2026: DIESE DATEI IST NICHT INSTALLIERT  ⚠ ⚠
 *
 *   Auf dem Server laeuft ein ANDERER Empfaenger: `fch-core` bringt unter
 *   `src/Spiegel/clubcampus-export.php` eine eigene Fassung mit. Sie ist
 *   ein Fork DIESER Datei (der Kopf hier steht auch dort) und in der
 *   Anmeldung besser: gemeinsames Geheimnis aus der wp-config.php mit
 *   hash_equals, statt Application Password und `edit_posts`.
 *
 *   > Mit `edit_posts` konnte JEDER angemeldete Redakteur Resultate,
 *   > Verlauf und Ranglisten schreiben. Das war ein Loch, und es ist dort
 *   > geschlossen.
 *
 *   ⚠ BEIDE ZUGLEICH GEHEN NICHT. Gleiche Funktions- und Konstantennamen
 *   (`cc_darf_schreiben`, `cc_route_spiele`, `CC_ROUTE`, `CC_TYP_SPIEL`) —
 *   PHP stirbt an der Doppeldeklaration. Ein anderer Dateiname aendert
 *   daran nichts; er verhindert nur die VERWECHSLUNG, und die hat am
 *   08.09.2026 einen halben Tag gekostet.
 *
 *   Was aus dieser Datei drueben FEHLT und uebergeben gehoert:
 *   `cc_stempel()` samt `_cc_lauf`, die Route `/bestand`, und
 *   `get_post_time('c', true)` statt `post_date_gmt`.
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
 *   NIE        fch_team          — Teams gehoeren dem Verein
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
 *      (`Masken/spiel.php:154`) — und update_field() loest den Haken NICHT
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
   Fall, der am 09.09.2026 einen ganzen Anlauf gekostet hat. */
const CC_VERSION    = '0.1.0';
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
	'wettbewerb', 'runde', 'status', 'quelle',
	'tore_heim', 'tore_gast', 'halbzeit_heim', 'halbzeit_gast',
	'sfv_match_id', 'sfv_spiel_nr',
);

/** Unterfelder des Verlaufs — dieselbe Rolle, eine Ebene tiefer. */
const CC_VERLAUF_FELDER = array( 'minute', 'art', 'seite', 'text', 'stand', 'klub' );


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
	return $bericht;
}

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
 *   ⚠ `teams_zugeordnet = 0` bei `teams_gesamt > 0` ist die Antwort auf
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
			/* Der Schluessel, an dem die Team-Zuordnung haengt. Steht er hier,
			   muss ihn niemand aus dem Quelltext holen. */
			'meta_schluessel'  => CC_META_TEAM_SFV,
			'teams_gesamt'     => count(
				get_posts(
					array(
						'post_type'   => CC_TYP_TEAM,
						'post_status' => 'any',
						'numberposts' => -1,
						'fields'      => 'ids',
					)
				)
			),
			'teams_zugeordnet' => count( $karte ) - $mehrfach,
			'teams_mehrfach'   => $mehrfach,
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
function cc_team_karte(): array {
	$ids   = get_posts(
		array(
			'post_type'   => CC_TYP_TEAM,
			'post_status' => 'any',
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
function cc_schreibe_felder( int $post_id, array $spiel ): array {
	$geschrieben = array();
	foreach ( CC_FELDER as $feld ) {
		if ( ! array_key_exists( $feld, $spiel ) ) {
			continue;
		}
		update_field( $feld, $spiel[ $feld ], $post_id );
		$geschrieben[] = $feld;
	}
	return $geschrieben;
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
	update_field( 'verlauf', $zeilen, $post_id );
	return count( $zeilen );
}

/**
 * Den abgeleiteten Titel nachziehen.
 *
 * ⚠ DER GRUND, WARUM ES DIESE FUNKTION GIBT: update_field() loest
 *   `acf/save_post` nicht aus, und daran haengt die Titelableitung des
 *   Themes (`Masken/spiel.php:154`). Ohne diesen Aufruf haette jedes neu
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

	$vorhanden = cc_abgleich_kandidaten();
	$teamKarte = cc_team_karte();

	$erg = array(
		'neu' => 0, 'aktualisiert' => 0, 'zurueckgezogen' => 0,
		'uebersprungen' => 0, 'verlauf_zeilen' => 0,
		'ohne_team' => array(), 'doppelte_teams' => array(),
		'moegliche_dubletten' => array(), 'fehler' => array(),
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

	foreach ( $spiele as $spiel ) {
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
			'uebersprungen'  => cc_bericht_deckel( $uebersprungen ),
			'mehrfach'       => cc_bericht_deckel( $mehrfach ),
			'hinweis'        => $erg['fehler'],
		)
	);

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

	$n             = 0;
	$uebersprungen = array();
	foreach ( $gruppen as $g ) {
		$id = (string) ( $g['sfv_gruppe_id'] ?? '' );
		if ( '' === $id ) {
			/* ⚠ Bis zum 09.09.2026 fiel diese Gruppe stillschweigend heraus.
			   **Eine Gruppe ohne Kennung ist kein Nichts, sondern eine
			   Rangliste, die niemand je zu sehen bekommt.** Übernommen aus
			   der Spiegel-Fassung. */
			$uebersprungen[] = array(
				'sfv_match_id' => '—',
				'grund'        => 'Rangliste ohne sfv_gruppe_id — nicht zuzuordnen',
			);
			continue;
		}
		$alle[ $id ] = $g;
		$n++;
	}

	update_option( CC_OPT_RANG, $alle, false );

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
			'hinweis'       => array(),
		)
	);

	return new WP_REST_Response(
		array( 'gruppen_geschrieben' => $n, 'gruppen_gesamt' => count( $alle ) ),
		200
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
