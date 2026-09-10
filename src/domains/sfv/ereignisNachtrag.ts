/* ══════════════════════════════════════════════════════════════════════
   Der Nachtrag: Wechselzeilen ohne Kennung des Ersatzspielers

   ⚠ ANLASS (10.09.2026). Zwei Messungen, die einander widersprechen:

     Leseprobe gegen den Verband   32 von 32 Wechseln tragen
                                   `substitutePlayerId`
     Abfrage gegen unsere Daten    176 von 176 Wechselzeilen haben
                                   `ein_sfv_person_id = null`

   Der Mapper füllt die Spalte seit dem 19.08.2026 (`matchdaten.ts:138`),
   und beide Zahlen stammen aus derselben Antwort desselben Endpunkts.
   **Einer der beiden Stände ist also älter als der andere** — die Zeilen
   in unserer Datenbank wurden geschrieben, bevor der Verband die Kennung
   mitschickte, oder von einem Lauf, der sie nicht las.

   ⚠ DIESER NACHTRAG BEANTWORTET DIE FRAGE, STATT SIE ZU KLÄREN. Er holt
   die Ereignisse neu und schreibt sie über dieselbe Funktion wie der
   Sync. Bleibt die Spalte danach leer, liegt es nicht an den Daten,
   sondern am Schreibweg — und **das** wäre dann der Befund. So oder so
   ist die Frage nach einem Lauf entschieden statt vermutet.

   ── Warum eine eigene Aktion und nicht der stündliche Lauf ──────────
   Dieselbe Begründung wie bei `namen`: der Sync wählt zehn Spiele nach
   DATUM. Die Frage hier betrifft alle Spiele, in denen ein Wechsel ohne
   Kennung steht — und das sind überwiegend alte. Der Sync erreicht sie
   nie.

   ⚠ ER FASST `matchdaten_geholt_am` NICHT AN. Das Feld sagt, wann der
   Sync ein Spiel zuletzt vollständig geholt hat; ein Nachtrag, der nur
   Ereignisse holt, darf diesen Stand nicht behaupten.
   ══════════════════════════════════════════════════════════════════════ */

/** Eine Zeile aus `spiel_ereignisse`, so weit der Nachtrag sie braucht. */
export interface OffeneWechselZeile {
  spiel_id: string;
  sfv_match_id: number | null;
}

export interface NachtragAuswahl {
  /** Die Spiele, die dieser Lauf holt — höchstens `hoechstens`. */
  matchIds: number[];
  /** Wie viele Spiele insgesamt offen sind, auch die nicht gewählten. */
  offen_gesamt: number;
  /**
   * ⚠ Spiele mit offener Wechselzeile, aber ohne `sfv_match_id`.
   * Sie sind beim Verband nicht abrufbar — und ohne diese Zahl sähe der
   * Lauf aus, als hätte er alles erledigt, während sie liegen bleiben.
   */
  ohne_match_id: number;
}

/**
 * Welche Spiele dieser Lauf holt.
 *
 * ⚠ NACH DER FRAGE GEWÄHLT, NICHT NACH DEM DATUM — der ganze Grund für
 * eine eigene Aktion. Und entdoppelt: ein Spiel mit fünf offenen
 * Wechseln ist EIN Abruf, nicht fünf.
 *
 * @param hoechstens Obergrenze je Lauf. Sie steht da, weil jeder Abruf
 *   einer beim Verband ist — nicht weil eine Liste zu lang würde. Der
 *   Rest bleibt offen und wird gemeldet, nicht stillschweigend gekürzt.
 */
export function waehleNachtragSpiele(
  zeilen: OffeneWechselZeile[],
  hoechstens: number,
): NachtragAuswahl {
  const ids = new Set<number>();
  const ohneId = new Set<string>();

  for (const z of zeilen) {
    const m = Number(z.sfv_match_id);
    if (!Number.isFinite(m) || z.sfv_match_id === null) {
      ohneId.add(String(z.spiel_id));
      continue;
    }
    ids.add(m);
  }

  const alle = [...ids];
  return {
    matchIds: alle.slice(0, Math.max(0, hoechstens)),
    offen_gesamt: alle.length,
    ohne_match_id: ohneId.size,
  };
}

export interface NachtragErgebnis {
  spiele_abgefragt: number;
  spiele_fehlgeschlagen: number;
  ereignisse_geschrieben: number;
  offen_gesamt: number;
  offen_danach: number;
  ohne_match_id: number;
}

/**
 * Der Satz, der aus dem Lauf folgt.
 *
 * ⚠ Er sagt, ob noch etwas offen ist — sonst liest sich „12 Spiele
 * abgefragt" wie „fertig", während 200 warten. Dieselbe Regel wie bei
 * jeder Kürzung: keine stille Obergrenze.
 */
export function deuteNachtrag(e: NachtragErgebnis): string {
  const teile: string[] = [];
  if (e.spiele_fehlgeschlagen > 0) {
    teile.push(`${e.spiele_fehlgeschlagen} Spiel(e) nicht abrufbar`);
  }
  if (e.offen_danach > 0) {
    teile.push(`noch ${e.offen_danach} Spiel(e) offen — den Nachtrag erneut aufrufen`);
  } else if (e.offen_gesamt > 0) {
    teile.push("alle offenen Spiele geholt");
  } else {
    teile.push("nichts offen — kein Wechsel ohne Kennung");
  }
  if (e.ohne_match_id > 0) {
    /* ⚠ Nicht als Fehler, aber genannt: diese Spiele bleiben dauerhaft
       offen, und der Zähler oben würde sie sonst nie erklären. */
    teile.push(`${e.ohne_match_id} Spiel(e) ohne sfv_match_id — beim Verband nicht abrufbar`);
  }
  return teile.join("; ") + ".";
}
