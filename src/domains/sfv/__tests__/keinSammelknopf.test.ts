/* ═══════════════════════════════════════════════════════════════
   Kein Knopf speichert mehrere Vorschläge auf einmal.

   ⚠ DAS IST EINE ZUSAGE ÜBER DAS PRODUKT, keine über eine
   Funktion — und deshalb gehört sie in einen Fall und nicht in
   einen Kommentar. „Ein Kommentar, der eine andere Stelle
   zusichert, ist eine Behauptung ohne Prüfung", und wer ihn liest,
   prüft erst recht nicht nach.

   ⚠ WARUM SIE ZÄHLT. `sfv_zuordnung` ist die Quelle jeder
   künftigen Statistik. 381 auf einen Klick gespeicherte Vorschläge
   sind danach von 381 Zuordnungen von Hand nicht zu
   unterscheiden — und ein falscher darunter auch nicht.

   > Ein „alle bestätigen"-Knopf ist der Punkt, an dem aus einem
   > Vorschlag eine Behauptung wird. (Didi, 13.09.2026)

   ⚠ Die Regel hängt an einer BENANNTEN FUNKTION, nicht an einem
   Bezeichner: gesucht wird ein Schreibaufruf innerhalb einer
   Schleife. Eine Prüfung auf das Wort „alle bestätigen" prüfte
   eine Schreibweise — dieselbe Familie wie `name !== "Elternteil"`,
   und im Prüfwerkzeug selbst fällt es niemandem mehr auf.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { suche, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

const MASKE = "src/modules/portal/SfvSpielerZuordnung.tsx";
const SCHREIBT = new Set(["zuordnen", "speichereZuordnung", "loescheZuordnung"]);

/** Heisst dieser Knoten „irgendetwas wiederholen"? */
function istSchleife(n: ts.Node): boolean {
  return ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n)
    || ts.isWhileStatement(n) || ts.isDoStatement(n)
    || (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && ["forEach", "map", "flatMap", "reduce"].includes(n.expression.name.text));
}

/**
 * Loest ein MENSCH diesen Aufruf aus?
 *
 * ⚠ DIE ENTSCHEIDENDE UNTERSCHEIDUNG, und meine erste Fassung hatte sie
 * nicht: ein `zuordnen()` im `onClick` einer Zeile steht syntaktisch
 * INNERHALB des Render-`map` und ist trotzdem kein Sammelspeichern — es
 * laeuft erst, wenn jemand klickt. Ohne diese Ausnahme meldete die Regel
 * die zwei richtigen Handler als Verstoss.
 *
 * **Ein Melder, der grundlos anschlaegt, wird nach dem dritten Mal
 * abgeschaltet** — er waere schlimmer als keiner.
 */
function inEinemHandler(n: ts.Node): boolean {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return true;
  }
  return false;
}

function schreibenInSchleife(baum: ts.SourceFile): Array<{ zeile: number; was: string }> {
  const raus = new Map<string, { zeile: number; was: string }>();
  jederKnoten(baum, (n) => {
    if (!istSchleife(n)) return;
    jederKnoten(n, (innen) => {
      if (!ts.isCallExpression(innen)) return;
      const e = innen.expression;
      const name = ts.isIdentifier(e) ? e.text
        : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      if (!SCHREIBT.has(name) || inEinemHandler(innen)) return;
      /* Eine Map, weil verschachtelte Schleifen denselben Aufruf zweimal
         besuchen — vier Meldungen fuer zwei Stellen waeren Rauschen. */
      raus.set(`${zeileVon(innen)}:${name}`, { zeile: zeileVon(innen), was: name });
    });
  });
  return [...raus.values()];
}

describe("kein Sammelknopf in der Spielerzuordnung", () => {
  it("kein Schreibaufruf steht innerhalb einer Schleife", () => {
    const treffer = suche({
      frage: "speichert ein Aufruf mehrere Zuordnungen in einer Schleife?",
      dateien: [MASKE],
      finde: schreibenInSchleife,
      /* ⚠ PFLICHT, und hier trägt sie besonders: ohne sie wäre nicht
         zu unterscheiden, ob es keinen Sammelknopf gibt oder ob die
         Abfrage keinen finden KANN. Beides ist eine leere Liste. */
      positivkontrolle: `
        function alleSpeichern() {
          for (const v of vorschlaege) { zuordnen(v.id, v.mitglied_id); }
        }`,
    });
    expect(treffer.map(t => `${t.datei}:${t.fund.zeile} ${t.fund.was}`)).toEqual([]);
  });

  it("und die Abfrage findet auch die map-Form", () => {
    /* Eine Schleife muss nicht `for` heissen. Die zweite Kontrolle
       hält fest, dass die Abfrage beide Schreibweisen kennt — sonst
       wäre sie genau um die Form löchrig, die jemand wählen würde. */
    const treffer = suche({
      frage: "map-Form",
      dateien: [],
      finde: schreibenInSchleife,
      positivkontrolle: `
        const x = offen.map(o => speichereZuordnung(sb, v, o.id, o.mid));`,
    });
    expect(treffer).toEqual([]);
  });
});
