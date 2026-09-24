/* ═══════════════════════════════════════════════════════════════════
   `export_wartet()` lesen — die Zahl, die «Änderungen warten» beantwortet.

   ⚠ ⚠  DER BEFUND, GEMESSEN AM 24.09.2026: DAS FRONTEND HAT SIE NIE
   GELESEN. Die Funktion steht seit dem 10.09.2026 in der Datenbank und
   hat genau zwei Leser, beide dort — `cron_wp_export.sql:98` (soll der
   Abholer laufen?) und `cron_sync_waechter.sql:309` (hätte er laufen
   müssen?). In `src/` kommt sie nur in `database.types.ts` vor und in
   Kommentaren. Der einzige `.rpc()`-Aufruf der ganzen App war
   `check_email_bekannt`.

   **Damit konnte die Kachel «wartet etwas?» gar nicht beantworten — und
   hat stattdessen «ok» gezeigt.**

   ⚠ WARUM ANSCHLIESSEN UND NICHT NACHBAUEN. Die Zahl liesse sich auch
   im Browser bilden: vier Abfragen mit `zuletzt_geaendert > letzter_sync`
   auf `spiele`, `ranglisten`, `spiel_aufstellung`, `spiel_ereignisse`.
   Das wäre eine ZWEITE Rechnung für dieselbe Frage — und die Frage, wer
   von beiden recht hat, wenn sie auseinanderlaufen, ist in diesem Papier
   der teuerste wiederkehrende Fehler. Dazu bräuchte sie RLS-Lesrechte
   auf zwei Matchdaten-Tabellen, die `export_wartet()` als
   `security definer` gar nicht braucht.

   **Was es kostet:** ein RPC je Öffnen des Tabs. Die Funktion ist
   `stable`, zählt vier kleine Tabellen (rund 4000 Zeilen zusammen) und
   ist an `authenticated` freigegeben (`schema.sql:5754`) — also
   Millisekunden, und kein neues Recht.

   ⚠ ⚠  UND SIE GIBT `null` ZURÜCK, WENN SIE NICHT LESEN KANN — nie 0.
   «Es wartet nichts» und «ich konnte nicht nachsehen» sind zwei
   Auskünfte, und sie hier zusammenzulegen hiesse, eine nicht gestellte
   Frage als Entwarnung anzuzeigen.
   ═══════════════════════════════════════════════════════════════════ */

import type { Sb } from "../../types.ts";

export interface WartetErgebnis {
  /** Die Zahl — oder `null`, wenn nicht gelesen werden konnte. */
  wartet: number | null;
  /** Warum sie fehlt. Steht wörtlich in der Kachel. */
  grund: string | null;
}

/**
 * Wie viele Zeilen sich seit dem letzten WordPress-Export inhaltlich
 * geändert haben.
 *
 * ⚠ Die Datenbankfunktion vergleicht gegen
 * `api_verbindungen.letzter_sync` der Zeile mit `key = 'wordpress'` —
 * sie ist auf diesen einen Anschluss verdrahtet und für keinen anderen
 * zu gebrauchen.
 */
export async function holeExportWartet(sb: Sb, vereinId: string | null): Promise<WartetErgebnis> {
  if (!sb) return { wartet: null, grund: "keine Verbindung" };
  if (!vereinId) return { wartet: null, grund: "kein Verein bekannt" };

  /* ⚠ `error` WIRD GELESEN. Ein `data`-only-Zugriff machte aus einem
     abgewiesenen Aufruf eine `null`, aus der gleich darauf eine 0
     würde — genau der Weg, auf dem in diesem Projekt schon mehrfach
     aus einem Ausfall eine Datenlage geworden ist. */
  const { data, error } = await sb.rpc("export_wartet", { p_verein_id: vereinId });
  if (error) return { wartet: null, grund: `export_wartet() antwortet nicht: ${error.message || error.code || "unbekannter Fehler"}` };

  /* ⚠ Und eine Antwort ohne Zahl ist ebenfalls keine Null. `rpc` gibt
     bei einer Funktion, die es nicht gibt, schon oben einen Fehler —
     hier bleibt der Fall, dass etwas anderes zurückkommt als erwartet. */
  const zahl = Number(data);
  if (!Number.isFinite(zahl)) {
    return { wartet: null, grund: `export_wartet() gab keine Zahl zurück (${JSON.stringify(data)})` };
  }
  return { wartet: zahl, grund: null };
}
