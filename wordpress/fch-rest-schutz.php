<?php
/**
 * REST-Schutz — was unter /wp-json/ nicht stehen soll
 *
 * Plugin Name: FCH REST-Schutz
 * Description: Schliesst die Benutzeraufzaehlung ueber die REST-API und meldet zwei Schalter, die unbemerkt veroeffentlichen.
 * Version:     0.1.0
 *
 * ⚠ DIES IST NICHT DER CLUBCAMPUS-EXPORT und gehoert bewusst nicht in
 *   `clubcampus-export.php`. Der Export hat mit der Benutzerliste nichts zu
 *   tun; ein Plugin, das nebenbei fremde Routen abschaltet, ueberrascht den
 *   naechsten Leser an einer Stelle, an der er es nicht sucht.
 *
 * ── WOHIN, UND WER ─────────────────────────────────────────────────────
 *   wp-content/mu-plugins/fch-rest-schutz.php
 *
 * ⚠ SEIN ZUHAUSE IST `fch-theme`, NICHT DIESES REPOSITORY. Eine
 *   Sicherungsmassnahme, die nur auf dem Server liegt, verschwindet beim
 *   naechsten Deploy aus dem Theme-Repository — lautlos, denn ein
 *   fehlendes mu-plugin meldet nichts. Die Kopie hier ist ein Zwischenstand
 *   mit Ablaufdatum; sie gehoert eingecheckt, wo `fch-core` steht.
 *
 * ── WOGEGEN ────────────────────────────────────────────────────────────
 *
 *   Gemessen am 05.09.2026 gegen dev.fcherrliberg.ch, unangemeldet: DREI
 *   Wege fuehren zum Anmeldenamen des Administrators, nicht einer.
 *
 *     wp/v2/users                200   slug „dgood"
 *     oembed/1.0/embed           200   author_url .../author/dgood/
 *     ?author=1                  301   Weiterleitung auf /author/dgood/
 *
 *   ⚠ Die ersten beiden liegen UNTER /wp-json/. Der geplante Schutz der
 *   Dev-Seite ist Basic-Auth mit einer Ausnahme fuer genau diesen Pfad —
 *   die Ausnahme laesst also beide durch, waehrend sie den dritten schliesst.
 *   Wer nur `wp/v2/users` abschaltet, macht eine Tuer neben einer offenen zu.
 *
 *   Warum es zaehlt: der Slug ist bei den meisten Installationen der
 *   Anmeldename. Nach einem Einbruch macht das aus „Benutzername UND
 *   Passwort raten" ein „Passwort raten".
 *
 * ── WAS DIESE DATEI NICHT TUT ──────────────────────────────────────────
 *
 *   Den dritten Weg (`?author=1` und `/author/<slug>/`) laesst sie in Ruhe.
 *   Er liegt im Frontend und wird von Basic-Auth gedeckt; ihn hier zu
 *   schliessen hiesse, das Verhalten der Website zu aendern, ohne dass
 *   jemand danach gefragt hat. **Solange kein Basic-Auth steht, ist er
 *   offen** — das ist eine Betriebsentscheidung und keine Codefrage.
 *
 *   Wer ihn doch schliessen will, tut es nicht hier, sondern bewusst:
 *     add_action( 'template_redirect', function () {
 *         if ( is_author() ) { global $wp_query; $wp_query->set_404(); status_header( 404 ); }
 *     } );
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


/* ═══════════════════════════════════════════════════════════════════════
   1 · DIE BENUTZERROUTE — nur fuer Nichtangemeldete
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * ⚠ NUR unangemeldet. Der Block-Editor braucht `/wp/v2/users` fuer die
 *   Autorenauswahl; sie ganz zu entfernen macht das Backend kaputt, und
 *   zwar an einer Stelle, die niemand mit dieser Datei in Verbindung
 *   bringt.
 *
 * Der Filter greift an der Registrierung, nicht an der Adresse — damit
 * deckt er beide Schreibweisen ab: `/wp-json/wp/v2/users` und
 * `/?rest_route=/wp/v2/users`. Eine Sperre auf den Pfad haette die zweite
 * uebersehen.
 */
add_filter(
	'rest_endpoints',
	static function ( array $endpunkte ): array {
		if ( is_user_logged_in() ) {
			return $endpunkte;
		}
		unset(
			$endpunkte['/wp/v2/users'],
			$endpunkte['/wp/v2/users/(?P<id>[\d]+)'],
			$endpunkte['/wp/v2/users/me']
		);
		return $endpunkte;
	}
);


/* ═══════════════════════════════════════════════════════════════════════
   2 · oEMBED — die zweite Tuer
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * `author_url` traegt den Slug und damit denselben Namen wie die
 * Benutzerroute. Sie zu schliessen und diese stehen zu lassen waere eine
 * halbe Massnahme, die vollstaendig aussieht.
 *
 * ⚠ `author_name` BLEIBT. Der Anzeigename steht ohnehin unter jedem
 *   Beitrag; er ist nicht das Leck. Wer ihn mitentfernt, nimmt einer
 *   fremden Seite die Quellenangabe und gewinnt nichts — und eine
 *   Massnahme, die mehr wegnimmt als noetig, wird beim naechsten Umbau
 *   als uebertrieben zurueckgedreht, mitsamt dem Teil, auf den es ankam.
 */
add_filter(
	'oembed_response_data',
	static function ( $daten ) {
		if ( is_array( $daten ) ) {
			unset( $daten['author_url'] );
		}
		return $daten;
	}
);


/* ═══════════════════════════════════════════════════════════════════════
   3 · ZWEI SCHALTER, DIE WIE ANZEIGEEINSTELLUNGEN AUSSEHEN
   ═══════════════════════════════════════════════════════════════════════

   ⚠ WARUM HIER EINE PRUEFUNG STEHT UND NICHT NUR EIN SATZ IN EINER DATEI.

   Beide Schalter unten liegen in `fch-core` bzw. in der ACF-Oberflaeche —
   also dort, wo diese Datei nichts zu sagen hat. Eine Warnung an einer
   anderen Stelle als am Schalter ist eine Zusicherung ueber fremden Code,
   und die haelt erfahrungsgemaess nicht: wer den Haken setzt, liest keine
   Datei in einem anderen Repository.

   Deshalb steht hier keine Warnung, sondern eine BEOBACHTUNG. Sie meldet
   nicht, dass man etwas nicht tun soll — sie meldet, dass es getan wurde
   und was daraus folgt. Das ist der Unterschied zwischen einem Kommentar
   und einer Abfrage.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Schalter A: `show_in_rest` an `fch_spiel`.
 *
 * Heute steht er auf `false`, mit Begruendung in
 * `fch-core/src/PostTypes/registrierung.php`. Wird er umgelegt, passiert
 * zweierlei — und das zweite erwartet niemand:
 *
 *   1. die Spiele samt `sfv_match_id` werden oeffentlich lesbar
 *   2. ⚠ der Export-Benutzer `clubcampus-export` erscheint mitsamt seinem
 *      Anmeldenamen in `/wp/v2/users` — WordPress listet unangemeldet
 *      genau die Benutzer, die Beitraege in einem REST-sichtbaren Typ
 *      veroeffentlicht haben. Heute ist er unsichtbar, WEIL der Schalter
 *      aus ist. Das ist kein Zufall, sondern eine Abhaengigkeit.
 *
 * (Punkt 2 entschaerft der Filter oben — aber nur, solange er steht.)
 */
function fch_rest_schutz_spiel_offen(): bool {
	$typ = get_post_type_object( 'fch_spiel' );
	return $typ ? (bool) $typ->show_in_rest : false;
}

/**
 * Schalter B: „Show in REST API" an einer ACF-Feldgruppe.
 *
 * ⚠ Er sieht aus wie eine Anzeigeeinstellung und ist eine
 *   Veroeffentlichung: die Felder der Gruppe erscheinen unter `acf` in der
 *   oeffentlichen REST-Antwort ihres Beitragstyps — ohne dass jemand einen
 *   Endpunkt geoeffnet haette.
 *
 * Gemessen am 05.09.2026: `acf` ist als Schluessel vorhanden, aber leer.
 * Die Anbindung ist also aktiv und wartet nur auf einen Haken.
 *
 * Gemeldet wird NUR, was tatsaechlich an ist — nicht vorbeugend. Eine
 * Meldung, die immer steht, wird weggeklickt.
 */
function fch_rest_schutz_acf_offen(): array {
	if ( ! function_exists( 'acf_get_field_groups' ) ) {
		return array();
	}
	$offen = array();
	foreach ( acf_get_field_groups() as $gruppe ) {
		if ( ! empty( $gruppe['show_in_rest'] ) ) {
			$offen[] = (string) ( $gruppe['title'] ?? $gruppe['key'] ?? '?' );
		}
	}
	return $offen;
}

add_action(
	'admin_notices',
	static function (): void {
		/* Nur fuer die, die etwas daran aendern koennen — und nur auf der
		   Uebersicht plus der Spieleliste. Eine Meldung auf jeder Seite
		   waere Laerm, und Laerm wird zu Blindheit. */
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$id     = $screen ? (string) $screen->id : '';
		if ( 'dashboard' !== $id && 'edit-fch_spiel' !== $id ) {
			return;
		}

		if ( fch_rest_schutz_spiel_offen() ) {
			echo '<div class="notice notice-warning"><p><strong>REST-Schutz:</strong> '
				. '<code>fch_spiel</code> steht auf <code>show_in_rest = true</code>. '
				. 'Damit sind die Spiele samt SFV-Match-ID oeffentlich lesbar — und der '
				. 'Benutzer <code>clubcampus-export</code> erscheint mit seinem Anmeldenamen '
				. 'in der Benutzerliste, sobald der Schutz dieser Datei einmal fehlt. '
				. 'War das Absicht?</p></div>';
		}

		$acf = fch_rest_schutz_acf_offen();
		if ( $acf ) {
			printf(
				'<div class="notice notice-warning"><p><strong>REST-Schutz:</strong> '
				. '%d ACF-Feldgruppe(n) mit „Show in REST API": %s. '
				. 'Ihre Felder stehen damit in der oeffentlichen REST-Antwort ihres '
				. 'Beitragstyps. Das ist keine Anzeigeeinstellung, sondern eine '
				. 'Veroeffentlichung.</p></div>',
				count( $acf ),
				esc_html( implode( ', ', array_slice( $acf, 0, 8 ) ) )
			);
		}
	}
);
