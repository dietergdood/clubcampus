/* ══════════════════════════════════════════════════════════════════════
   Niemand sendet eine LEERE Aufstellung — Weg B, 12.09.2026
   ══════════════════════════════════════════════════════════════════════

   ⚠ ⚠  DIE ZUSAGE ÜBERLEBT DIE ENTFERNTE ZEILE, NICHT DER KOMMENTAR.

   Bis zum 12.09.2026 schickte der Export für Spiele ohne Aufstellungs-
   zeilen ein ausdrückliches `aufstellung: []` und **löschte** damit auf der
   Website. Der Entscheid ist zurückgenommen: das Feld wird weggelassen.

   Was bleibt, ist eine Zusage über das Produkt — und die gehört in einen
   Fall, nicht in einen Kommentar:

   > **Eine leere Aufstellung sagte zweierlei.** „Der Verband hat sie
   > zurückgezogen" und „der Verband hat nie etwas geliefert" — und der
   > häufige Fall (14 von 82 Spielen) war nicht der, für den die Regel
   > gebaut war. Ein Feld weglassen ist die ehrliche Fassung von „wir wissen
   > nichts".

   ⚠ ⚠  UND SIE IST NICHT AUF DER GEGENSEITE ABZUSICHERN. Der Wächter im
   Theme meldet „gefüllt auf leer" — aber **eine Sperre gegen „gefüllt auf
   leer" kann nicht unterscheiden, WARUM geleert wird.** Sie hätte den
   echten Fall genauso geblockt: ein wirklich zurückgezogenes Matchblatt
   soll drüben verschwinden. (Befund Didi, 12.09.2026.) Die Unterscheidung
   kann nur dort entstehen, wo sie bekannt ist — bei uns, beim Bauen der
   Nutzlast. Deshalb steht die Prüfung hier.

   ── Warum über den Syntaxbaum ────────────────────────────────────────

   Ein Textmuster auf `aufstellung = []` träfe auch Kommentare — und dieser
   Kopf ist voll davon. `suche()` verlangt ausserdem eine Positivkontrolle
   und wirft, wenn die Abfrage nicht einmal darin etwas findet: eine Regel,
   die ihren Gegenstand nicht mehr erkennt, ist ROT und nicht grün.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { suche, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

/** Ein leeres Array-Literal — `[]`, auch `[] as X`. */
function istLeeresArray(n: ts.Node): boolean {
  const k = ts.isAsExpression(n) ? n.expression : n;
  return ts.isArrayLiteralExpression(k) && k.elements.length === 0;
}

/** Heisst dieser Zielausdruck `aufstellung`? */
function heisstAufstellung(n: ts.Node): boolean {
  if (ts.isIdentifier(n)) return n.text === "aufstellung";
  if (ts.isPropertyAccessExpression(n)) return n.name.text === "aufstellung";
  return false;
}

describe("⚠ Weg B — niemand sendet eine leere Aufstellung", () => {
  it("weder als Zuweisung noch als Objektfeld", () => {
    const treffer = suche<number>({
      frage: "setzt jemand aufstellung auf eine leere Liste?",
      /* ⚠ Beide Formen, damit die Abfrage beide sehen MUSS. Fände sie nur
         eine, wäre sie an der anderen für immer grün. */
      positivkontrolle: `
        const spiel: any = {};
        spiel.aufstellung = [];
        const zweites = { aufstellung: [] };
      `,
      dateien: [
        "supabase/functions/wp-export/index.ts",
        "src/domains/spiele/wpNutzlast.ts",
      ],
      finde: (baum) => {
        const raus: number[] = [];
        jederKnoten(baum, (n) => {
          if (
            ts.isBinaryExpression(n)
            && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
            && heisstAufstellung(n.left)
            && istLeeresArray(n.right)
          ) raus.push(zeileVon(n));

          if (
            ts.isPropertyAssignment(n)
            && ts.isIdentifier(n.name) && n.name.text === "aufstellung"
            && istLeeresArray(n.initializer)
          ) raus.push(zeileVon(n));
        });
        return raus;
      },
    });

    expect(treffer.map((t) => `${t.datei}:${t.fund}`)).toEqual([]);
  });
});
