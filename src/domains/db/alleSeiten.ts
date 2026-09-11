/* ═══════════════════════════════════════════════════════════════════════
   ClubCampus — domains/db/alleSeiten.ts

   Eine Abfrage VOLLSTÄNDIG lesen — seitenweise, mit Zählprobe.

   ⚠ ⚠  ANLASS, 11.09.2026: PostgREST gibt höchstens 1000 Zeilen heraus
   und KÜRZT STILL. `error` ist `null`, `data` hat genau 1000 Einträge,
   und nichts unterscheidet das von „es gibt genau 1000".

   `spiel_aufstellung` stand an dem Tag bei 2282 Zeilen — auf der Website
   fehlten Aufstellungen, ohne dass irgendetwas fehlschlug.

   ⚠ AUSGELÖST HAT ES EIN AUFRÄUMEN. Die Grenze war folgenlos, solange
   der Bestand darunter lag; über die Schwelle geschoben hat ihn der
   Nachhol-Lauf über 62 eingefrorene Spiele — also die Reparatur eines
   ANDEREN Defekts, in derselben Nacht.

   **Eine stille Grenze ist keine Bombe mit Zünder, sondern eine mit
   Wasserstand.** Sie tut nichts, bis jemand etwas hineingiesst — und wer
   giesst, ist meistens derjenige, der gerade etwas in Ordnung bringt.
   Damit ist „es lief doch bisher" kein Argument.

   ── WARUM HIER UND NICHT IN DER EDGE FUNCTION ────────────────────────
   Weil beide Welten dieselbe Grenze haben. Zuerst stand die Funktion in
   `wp-export/index.ts`; eine zweite Fassung für die Browser-Dienste wäre
   genau die Doppelung, die dieses Projekt an einem Dutzend Stellen als
   teuersten Fehler führt — zwei Rechnungen für dieselbe Frage, und beim
   Vereinheitlichen gewinnt die ärmere.
   ═══════════════════════════════════════════════════════════════════════ */

/** Wie viele Zeilen PostgREST höchstens auf einmal herausgibt. */
export const SEITE = 1000;

/** Ein Deckel gegen die Endlosschleife — 200 Seiten sind 200 000 Zeilen,
    weit über allem, was dieses Portal je halten wird, und trotzdem eine
    Grenze statt eines `while (true)`. */
const HOECHSTENS_SEITEN = 200;

type Antwort = { data: unknown; error: unknown };
type Zaehlung = { count: number | null; error: unknown };

function meldung(e: unknown): string {
  return (e as { message?: string })?.message ?? String(e);
}

/**
 * Alle Zeilen einer Abfrage holen.
 *
 * @param seite  baut die Abfrage für einen Bereich. **`order()` ist
 *               Pflicht** — siehe unten.
 * @param zaehle **DIESELBE Abfrage** als `count: "exact", head: true`.
 * @param was    für die Fehlermeldung, in der Sprache des Lesers.
 *
 * ⚠ ⚠ `zaehle` MUSS JEDEN FILTER DER SEITENABFRAGE TRAGEN — auch einen
 * `!inner`-Embed, auch ein `.not(…)`. Zählt sie mehr Zeilen, als die
 * Seiten liefern können, schlägt die Zählprobe **falsch** an: sie meldet
 * einen Verlust, den es nicht gibt.
 *
 * **Und das wäre schlimmer als gar keine Prüfung.** Ein Melder, der
 * grundlos anschlägt, wird nach dem dritten Mal abgeschaltet — dieselbe
 * Abstumpfung wie bei den 758 Lint-Warnungen und beim dauerhaft roten
 * Test. Wer hier einen Filter vergisst, macht die Prüfung wertlos, nicht
 * bloss ungenau.
 *
 * ── DIE ZWEI HÄLFTEN, UND BEIDE SIND NÖTIG ─────────────────────────────
 *
 * **1 · `order()` ist Pflicht, nicht Kosmetik.**
 *
 * > Paginieren ohne Reihenfolge ist schlimmer als keines, weil es
 * > zufällig meistens stimmt.
 *
 * Ohne feste Sortierung darf Postgres zwei Seiten verschieden anordnen —
 * dann fehlen Zeilen in der Mitte und andere kommen doppelt. Ein Fehler,
 * der von der Ausführungsreihenfolge abhängt, tritt beim Prüfen nicht auf
 * und im Betrieb sporadisch; **er wird nicht gesucht, weil er sich nicht
 * reproduzieren lässt.**
 *
 * ⚠ Diese Funktion kann das NICHT erzwingen — sie sieht die fertige
 * Abfrage, nicht ihre Bestandteile. Es bleibt eine Zusage des Aufrufers,
 * und deshalb steht sie hier so laut.
 *
 * **2 · Bei Abweichung wird GEWORFEN, nicht still repariert.**
 *
 * > Paginieren allein behebt den Fehler und verbirgt zugleich, dass es
 * > ihn gab.
 *
 * Die nächste Kürzung — ein Gateway-Zeitlimit, eine Policy, ein Abbruch
 * mitten in der Schleife — sähe sonst wieder aus wie eine Datenlage. Eine
 * unvollständige Liste ist schlimmer als eine Fehlermeldung: **eine Liste
 * sieht immer vollständig aus.**
 */
export async function alleSeiten<T>(
  seite: (von: number, bis: number) => PromiseLike<Antwort>,
  zaehle: () => PromiseLike<Zaehlung>,
  was: string,
): Promise<T[]> {
  const raus: T[] = [];
  for (let s = 0; s < HOECHSTENS_SEITEN; s++) {
    const r = await seite(s * SEITE, s * SEITE + SEITE - 1);
    if (r.error) throw new Error(`${was} nicht lesbar: ${meldung(r.error)}`);
    const teil = (r.data ?? []) as T[];
    raus.push(...teil);
    if (teil.length < SEITE) break;
  }

  const z = await zaehle();
  if (z.error) {
    throw new Error(`${was}: Zählprobe nicht möglich — ${meldung(z.error)}`);
  }
  if (z.count !== null && z.count !== raus.length) {
    throw new Error(`${was}: ${raus.length} Zeilen gelesen, ${z.count} vorhanden`
      + ` — die Liste wäre unvollständig, und eine unvollständige Liste`
      + ` sieht aus wie eine vollständige.`);
  }
  return raus;
}
