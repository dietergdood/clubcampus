/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/personZiel.ts

   Wen die Personenseite gerade zeigt.

   ⚠ WARUM ES DIESE DATEI GIBT

   Der Typ hiess `SelectedMember`, hatte eine Index-Signatur
   (`[key: string]: unknown`) und wurde an vier Einstiegen als
   Objektliteral zusammengebaut. Am 21.08.2026 hat das einen Fehler
   gekostet, der beinahe still geblieben wäre:

   Der Archiv-Einstieg schrieb `{...data, name, _tab} as never`. Der
   Cast liess `mitgliedId` und `personId` weg — beide fehlten, und
   `mitgliedId === undefined` las die Seite als „keine Mitgliedschaft".
   Ein archiviertes Juniorenmitglied verlor Eltern-, Statistik- und
   Verlauf-Tab, die Teams-Karte und alle Vereinsdaten, während der Kopf
   weiterhin „Juniorenmitglied" zeigte.

   Drei Dinge kamen zusammen, und jedes einzelne hätte gereicht:

     1. Die Index-Signatur nahm jedes Objekt an.
     2. Der Cast nahm auch das noch an, was sie nicht annahm.
     3. „Keine Mitgliedschaft" wurde aus einem FEHLENDEN Wert
        abgeleitet, statt ausgesprochen zu werden.

   Deshalb: keine Index-Signatur, ein ausdrückliches `art`, und die
   beiden Fabrikfunktionen unten als einziger Weg. Wer das Ziel nicht
   mehr selbst zusammenbaut, kann auch nichts weglassen.

   ⚠ Braucht hier je wieder jemand einen Cast, ist das die Meldung —
   nicht die Lösung.
   ═══════════════════════════════════════════════════════════════ */
import type { PersonZeile } from "../../types.ts";
import type { PersonArt } from "../../domains/person/personArtService.ts";

/**
 * Wen die Seite zeigt — als POSITIVE Aussage.
 *
 * `art` ist der Unterschied zwischen „diese Person hat keine
 * Mitgliedschaft" und „die Id wurde nicht mitgereicht". Vorher sahen
 * beide gleich aus.
 */
export type PersonZiel =
  & { personId: string; name: string; daten?: Partial<PersonZeile>;
      /**
       * Die Arten der Person (Elternteil, Supporter, …) — vom Aufrufer
       * geladen, NICHT hier abgeleitet.
       *
       * ⚠ 400 Personen. Eine Abfrage je Zeile waere ein N+1; der Aufrufer
       * hat die Liste ohnehin in einer Runde. Und `role === 'eltern'` ist
       * als Quelle zweimal falsch gewesen — ein Vater, der selbst spielt,
       * bekommt `spieler`.
       */
      arten?: PersonArt[];
      /** Aktiver Tab, vom Aufrufer beim Öffnen gesetzt. */
      _tab?: string;
      /** Archiv öffnet schreibgeschützt. */
      _readonly?: boolean }
  & (
      | { art: "mitglied"; mitgliedId: number }
      /* Kein `mitgliedId: null` in diesem Zweig: was es nicht gibt,
         bekommt keinen Platzhalter. Wer es liest, muss vorher `art`
         geprüft haben — und genau das ist der Zweck. */
      | { art: "person" }
    );

/** Bequemer Zugriff, ohne dass jeder Aufrufer `art` prüfen muss. */
export function mitgliedIdVon(ziel: PersonZiel): number | null {
  return ziel.art === "mitglied" ? ziel.mitgliedId : null;
}

/* ─── Die einzigen zwei Wege, ein Ziel zu bauen ─────────────────── */

/** Eine Zeile mit Mitgliedschaft — aus `mitglieder` samt Person. */
export function zielAusMitglied(
  zeile: { id: number; person_id: string } & Partial<PersonZeile>,
  name: string,
  extras: { _tab?: string; _readonly?: boolean; arten?: PersonArt[] } = {},
): PersonZiel {
  /* ⚠ `id` wird HERAUSGENOMMEN. `PersonZeile` laesst es aus gutem Grund weg
     (siehe types.ts); bliebe es in `daten`, landete es ueber den Merge wieder
     in `raw` — zur Laufzeit vorhanden, im Typ nicht existent. Genau die Lüge,
     die der ganze Umbau beseitigt. Die Zahl steht in `mitgliedId`. */
  const { id: _mitgliedschaftsId, ...ohneId } = zeile;
  return {
    art: "mitglied",
    mitgliedId: zeile.id,
    personId: zeile.person_id,
    name,
    daten: ohneId,
    ...extras,
  };
}

/**
 * Eine Person OHNE Mitgliedschaft — Supporter oder Elternteil.
 *
 * ⚠ Der Aufrufer muss WISSEN, dass keine Mitgliedschaft besteht. Diese
 * Funktion leitet es nicht ab; sie schreibt nieder, was er weiss.
 */
export function zielAusPerson(
  zeile: { id: string } & Partial<PersonZeile>,
  name: string,
  extras: { _tab?: string; _readonly?: boolean; arten?: PersonArt[] } = {},
): PersonZiel {
  /* Auch hier ohne `id`: es ist die PERSONEN-Id und steht in `personId`.
     In `daten` waere sie eine zweite Wahrheit an falscher Stelle. */
  const { id: _personenId, ...ohneId } = zeile;
  return {
    art: "person",
    personId: zeile.id,
    name,
    daten: ohneId,
    ...extras,
  };
}
