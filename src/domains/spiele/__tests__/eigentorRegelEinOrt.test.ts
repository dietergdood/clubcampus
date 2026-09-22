/* ══════════════════════════════════════════════════════════════════════
   Die Eigentor-Regel steht an EINEM Ort — 22.09.2026
   ══════════════════════════════════════════════════════════════════════

   ⚠ ⚠  DIESE PRÜFUNG GIBT ES, WEIL DIE VERHALTENS-GEGENPROBE UNMÖGLICH IST.

   Bestellt war (Didi, 22.09.2026): *„Gegenprobe: `torZusatz()` →
   `subtyp_id === 2` → der Verwarnungs-Fall wird rot."* Gemessen: **er
   wird es nicht, und er kann es nicht.**

   In `halbzeitWiderspruch()` steht eine Zeile früher
   `if (e.typ_id !== TYP_TOR) continue`. Jede Nicht-Tor-Zeile ist damit
   längst hinaus, bevor der Subtyp überhaupt angesehen wird. Und für eine
   Zeile, die bis dorthin kommt, gilt `typ_id === TYP_TOR` — dann sind
   `torZusatz(typ_id, subtyp_id) === "eigentor"` und `subtyp_id === 2`
   **für jede mögliche Eingabe dasselbe.**

   > **Eine Prüfung hinter dem Filter, den sie prüfen soll, kann nur „in
   > Ordnung" sagen.**

   Es gibt also keinen Testfall, der die zwei Fassungen auseinanderhält.
   Kein sorgfältigerer Fall, kein anderer Eingabewert — es ist keine Lücke
   im Test, sondern eine Eigenschaft der Stelle.

   ── Was daraus folgt ─────────────────────────────────────────────────

   Die Zusage, um die es geht, ist ohnehin keine über VERHALTEN, sondern
   eine über STRUKTUR:

   > **Die Eigentor-Regel steht an einem Ort, und alle drei Zählstellen
   > fragen dort.**

   Verhalten kann sie heute nicht belegen. Struktur kann es — und genau
   dafür gibt es in diesem Projekt den Syntaxbaum-Helfer. Sabotiert
   jemand `torZusatz()` zu einem blossen Vergleich, ist **dieser** Fall
   rot, und zwar an jeder der drei Stellen.

   ── Warum ZWEI Fälle und nicht einer ─────────────────────────────────

   ⚠ Der erste Fall allein wäre grün, wenn jemand die Erkennung **ganz
   entfernt** — dann steht dort kein verbotener Vergleich, weil dort gar
   nichts mehr steht. Eine Prüfung über die leere Menge ist in diesem
   Papier viermal vorgekommen und hat jedes Mal „bestanden" gesagt.

   Deshalb hält der zweite Fall die Gegenrichtung: jede der drei
   Funktionen RUFT `torZusatz`. Erst beide zusammen sind die Zusage.

   ── Und warum der Guard trotzdem nicht überflüssig ist ───────────────

   ⚠ An dieser einen Aufrufstelle ist der Typ-Guard von `torZusatz()`
   **Deckung, nicht tragend** — das `continue` nimmt ihm die Arbeit ab.
   In `sammleMarken()` und `baueStatistik()` trägt er sehr wohl: dort gibt
   es kein vorgelagertes `continue` auf den Ereignistyp, und eine
   Verwarnung mit `subtyp_id = 2` würde ohne ihn verschluckt. Der Guard
   selbst ist an `torZusatz()` geprüft (`matchdatenAnzeige.test.ts`).
   ══════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import {
  suche, baue, findeFunktion, aufrufNamen, jederKnoten, zeileVon,
} from "../../../test-helpers/quelltext.ts";

const WPNUTZLAST = "src/domains/spiele/wpNutzlast.ts";
const ANZEIGE = "src/domains/spiele/matchdatenAnzeige.ts";

/** Die drei Stellen, die ein Eigentor erkennen — und wo sie stehen. */
const ZAEHLSTELLEN: Array<{ datei: string; funktion: string }> = [
  { datei: WPNUTZLAST, funktion: "sammleMarken" },
  { datei: WPNUTZLAST, funktion: "halbzeitWiderspruch" },
  { datei: ANZEIGE, funktion: "baueStatistik" },
];

/**
 * Ein Vergleich, der den Subtyp selbst abfragt statt `torZusatz()`.
 *
 * ⚠ Beide Richtungen (`a === b` und `b === a`) und beide Schreibweisen
 * (die Zahl und die Konstante). Wer nur eine Form sucht, prüft eine
 * Schreibweise — und genau davor warnt die Regel, die hier gehalten wird.
 */
function blosserSubtypVergleich(wurzel: ts.Node): Array<{ text: string; zeile: number }> {
  const funde: Array<{ text: string; zeile: number }> = [];
  jederKnoten(wurzel, (n) => {
    if (!ts.isBinaryExpression(n)) return;
    const op = n.operatorToken.kind;
    if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken
        && op !== ts.SyntaxKind.EqualsEqualsToken) return;
    const seiten = [n.left.getText(), n.right.getText()];
    const nenntSubtyp = seiten.some(s => /subtyp_id/.test(s));
    const nenntWert = seiten.some(s => s.trim() === "2" || /SUBTYP_EIGENTOR/.test(s));
    if (nenntSubtyp && nenntWert) funde.push({ text: n.getText(), zeile: zeileVon(n) });
  });
  return funde;
}

describe("Die Eigentor-Regel steht an einem Ort", () => {
  it("⚠ keine Zählstelle fragt den Subtyp selbst ab — alle über torZusatz()", () => {
    const treffer = suche({
      frage: "ein blosser Vergleich auf subtyp_id statt torZusatz()",
      dateien: [WPNUTZLAST, ANZEIGE],
      /* ⚠ Genau die Sabotage, die bestellt war — sie MUSS gefunden werden,
         sonst prüft dieser Fall nichts. */
      positivkontrolle: `
        function halbzeitWiderspruch(e) {
          if (e.typ_id !== TYP_TOR) return;
          const dreht = (e.subtyp_id ?? null) === 2;
        }`,
      finde: (baum) => {
        const funde: Array<{ funktion: string; text: string; zeile: number }> = [];
        for (const { funktion } of ZAEHLSTELLEN) {
          const knoten = findeFunktion(baum, funktion);
          if (!knoten) continue;
          for (const f of blosserSubtypVergleich(knoten)) {
            funde.push({ funktion, ...f });
          }
        }
        return funde;
      },
    });

    expect(
      treffer.map(t => `${t.datei}:${t.fund.zeile} in ${t.fund.funktion}: ${t.fund.text}`),
    ).toEqual([]);
  });

  it("⚠ und jede der drei Zählstellen RUFT torZusatz — sonst wäre der Fall oben leer", () => {
    /* ⚠ Die Gegenrichtung. Ohne sie wäre „kein verbotener Vergleich"
       auch dann erfüllt, wenn die Erkennung ganz verschwindet — die
       Prüfung liefe über die leere Menge und sagte „bestanden". */
    const gefunden: string[] = [];
    for (const { datei, funktion } of ZAEHLSTELLEN) {
      const knoten = findeFunktion(baue(datei), funktion);
      if (!knoten) {
        gefunden.push(`${funktion}: FUNKTION NICHT GEFUNDEN in ${datei}`);
        continue;
      }
      const ruft = aufrufNamen(knoten).includes("torZusatz");
      gefunden.push(`${funktion}: ${ruft ? "ruft torZusatz" : "RUFT torZusatz NICHT"}`);
    }

    expect(gefunden).toEqual([
      "sammleMarken: ruft torZusatz",
      "halbzeitWiderspruch: ruft torZusatz",
      "baueStatistik: ruft torZusatz",
    ]);
  });
});
