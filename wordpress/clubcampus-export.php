<?php
/**
 * ClubCampus-Abgleich — Empfaenger auf WordPress-Seite
 *
 * Plugin Name: ClubCampus Export
 * Description: Nimmt Spielplan, Verlauf und Ranglisten aus ClubCampus entgegen.
 * Version:     0.1.0
 *
 * ── WOHIN DIESE DATEI GEHOERT ────────────────────────────────────────────
 *   wp-content/mu-plugins/clubcampus-export.php  (neben fch-core.php)
 *
 *   Als mu-plugin, nicht als gewoehnliches: mu-plugins lassen sich im
 *   Backend nicht abschalten. Ein Plugin, das jemand versehentlich
 *   deaktiviert, nimmt die Route mit — und der Abgleich bekaeme 404 statt
 *   einer Antwort, waehrend die Website unveraendert aussieht.
 *
 * ⚠ ZWEI ORTE, EIN INHALT — DAS GEHOERT ENTSCHIEDEN
 *   Diese Datei liegt im ClubCampus-Repository, laeuft aber in fch-theme.
 *   Solange sie an beiden Orten liegt, koennen die Fassungen auseinander
 *   laufen, und niemand merkt es: WordPress meldet keinen Versionsfehler.
 *   Vor dem ersten scharfen Lauf festlegen, welches Repository sie besitzt,
 *   und im anderen nur einen Verweis stehen lassen.
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
const CC_TYP_SPIEL  = 'fch_spiel';
const CC_TYP_TEAM   = 'fch_team';
const CC_OPT_RANG   = 'fch_cc_ranglisten';
const CC_QUELLE     = 'clubcampus';   // ⚠ klein — der WERT, nicht die Beschriftung

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
	}
);

/**
 * Wer darf schreiben.
 *
 * ⚠ `edit_posts` und NICHT `manage_options`. Der Abgleich legt Spiele an und
 *   aendert sie; mehr braucht er nicht. Insbesondere kein Loeschrecht —
 *   zurueckgezogen wird auf Entwurf, und das ist eine Statusaenderung.
 */
function cc_darf_schreiben(): bool {
	return current_user_can( 'edit_posts' );
}

/** Verbindungstest: was hier fehlt, erklaert jeden spaeteren Fehlschlag. */
function cc_route_status(): WP_REST_Response {
	$fehlt = cc_voraussetzungen();
	return new WP_REST_Response(
		array(
			'bereit'          => array() === $fehlt,
			'fehlt'           => $fehlt,
			'spiele_gesamt'   => (int) wp_count_posts( CC_TYP_SPIEL )->publish,
			'spiele_abgleich' => count( cc_abgleich_kandidaten() ),
			'benutzer'        => wp_get_current_user()->user_login,
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
		$sfv = trim( (string) get_post_meta( (int) $id, 'sfv_id', true ) );
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
	$fehlt = cc_voraussetzungen();
	if ( array() !== $fehlt ) {
		return new WP_REST_Response(
			array( 'fehler' => 'Voraussetzungen fehlen', 'fehlt' => $fehlt ),
			503
		);
	}

	$daten  = $req->get_json_params();
	$spiele = is_array( $daten['spiele'] ?? null ) ? $daten['spiele'] : null;
	$teams  = is_array( $daten['teams'] ?? null ) ? $daten['teams'] : null;

	/* ⚠ Ein fehlendes `teams` ist ein Abbruch und kein leerer Satz. Als
	   leerer Satz gelesen, waere der Abgleichbereich leer — harmlos. Als
	   „alle" gelesen, raeumte ein unvollstaendiger Lauf den halben Spielplan
	   ab. Deshalb: gar nicht raten. */
	if ( null === $spiele || null === $teams ) {
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

	$geliefert   = array();
	$erlaubteTid = array();
	foreach ( $teams as $sfv ) {
		$tid = $teamKarte[ (string) $sfv ] ?? null;
		if ( null === $tid ) {
			$erg['ohne_team'][] = (string) $sfv;
			continue;
		}
		if ( 0 === $tid ) {
			$erg['doppelte_teams'][] = (string) $sfv;
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
			$erg['fehler'][] = 'Spiel ohne sfv_match_id uebersprungen';
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
		return new WP_REST_Response( array( 'fehler' => 'gruppen ist Pflicht' ), 400 );
	}

	/* ⚠ Nur gelieferte Gruppen ersetzen, die uebrigen stehen lassen — ein
	   halber Ausfall darf nichts wegraeumen. */
	$alle = get_option( CC_OPT_RANG, array() );
	if ( ! is_array( $alle ) ) {
		$alle = array();
	}

	$n = 0;
	foreach ( $gruppen as $g ) {
		$id = (string) ( $g['sfv_gruppe_id'] ?? '' );
		if ( '' === $id ) {
			continue;
		}
		$alle[ $id ] = $g;
		$n++;
	}

	update_option( CC_OPT_RANG, $alle, false );

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
