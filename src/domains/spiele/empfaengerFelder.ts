/**
 * Die Auskunftsfelder der Gegenstelle — EINE Liste für beide Seiten.
 *
 * ⚠ ⚠  WARUM SIE EXISTIERT: DIESELBE LÜCKE HAT DREIMAL ZUGESCHLAGEN.
 *
 * `holeStatus()` reicht die Antwort des Empfängers Feld für Feld weiter
 * (eine Allowlist, damit kein neues Feld der Gegenseite still mitreist),
 * und die Kachel zeigt sie an. Das sind zwei Listen an zwei Orten, und
 * sie sind dreimal auseinandergelaufen:
 *
 *   09.09.2026  `unterfelder` — zwei Tage lang wurde
 *               `unterfelder.aufstellung.faellt_weg` gesucht; über
 *               unsere Kachel war es NIE erreichbar
 *   (undatiert) `geschwister` — dieselbe Lücke, zweiter Fall
 *   26.09.2026  **elf Felder auf einmal.** Die Kachel meldete „0
 *               veröffentlichte Spiel-Beiträge", „Kein Bericht
 *               abgelegt", „Abgleich findet 0" und „Feldnamen NICHT
 *               geprüft", während die Rohantwort 275 Spiele nannte
 *
 * ⚠ Jedes Mal sah es aus wie ein Befund über die GEGENSTELLE, und jedes
 * Mal lag es an unserer Durchreichliste. Eine Null, die aus einem nicht
 * durchgereichten Feld entsteht, ist von einer gemessenen nicht zu
 * unterscheiden — und sie schickt die Suche auf die andere Seite.
 *
 * Deshalb steht die Liste hier und nicht dort: was die Kachel zeigt und
 * was durchgereicht wird, KANN nicht mehr auseinanderlaufen.
 *
 * ── Was hier NICHT hineingehört ──────────────────────────────────────
 *
 * Felder, die die Kachel nicht zeigt. Die Liste ist kein Sammelbecken
 * für alles, was die Gegenstelle schickt — sonst wäre sie der Spread,
 * den sie ersetzt. Der Empfänger 0.9.39 liefert acht Diagnosefelder
 * (`spiele_roh`, `abgleich_ohne_filter`, `spiel_typ_angemeldet`,
 * `team_typ_angemeldet`, `bericht_roh`, `datenbank`, `objekt_cache`,
 * `wpdb_letzter_fehler`), die hier bewusst fehlen: sie werden nicht
 * gebraucht, und sie stehen weiterhin in `nicht_durchgereicht`.
 *
 * ⚠ Und `nicht_durchgereicht` bleibt der Melder darüber. Er hat diesen
 * Befund gefunden — die elf Namen standen darin, bevor jemand sie
 * suchte. Eine Liste macht ihn nicht überflüssig, sie macht ihn kürzer.
 */
export const EMPFAENGER_DIAGNOSE = [
  /** Spiel-Beiträge je Zustand (publish, draft, auto-draft …). */
  "spiele_nach_zustand",
  /** Der letzte Lauf drüben: neu, aktualisiert, verworfene Feldnamen. */
  "letzter_bericht",
  /** Was dieselbe Abfrage findet, die auch der Export benutzt. */
  "abgleich_findet",
  /** Wie viele Feldnamen auf Mehrdeutigkeit geprüft wurden. */
  "feldnamen_geprueft",
  /** Namen, die zu mehreren ACF-Feldern auflösen — nicht geschrieben. */
  "feld_mehrdeutig",
  /** Felder ohne auflösbaren Schlüssel am fch_spiel. */
  "ohne_feldschluessel",
  /** Beiträge mit sfv_match_id, nach Typ und Zustand. */
  "match_id_typen",
  /** Der Beitragstyp, nach dem gesucht wurde. */
  "spiel_typ_gesucht",
  /** Die Feldnamen am fch_spiel, wie ACF sie kennt. */
  "spielfelder",
  /**
   * Wie lange die Gegenstelle für DIESE Auskunft gebraucht hat.
   *
   * ⚠ Seit Empfänger 0.9.38 in jeder Antwort des Namensraums. Neben
   * unserer eigenen Wanduhr gelesen trennt sie Netz von PHP — genau die
   * Trennung, die am 26.09.2026 fehlte, als niemand sagen konnte, wohin
   * die 90 Sekunden eines Exportlaufs gehen.
   */
  "laufzeit_ms",
] as const;

export type EmpfaengerDiagnoseFeld = typeof EMPFAENGER_DIAGNOSE[number];
