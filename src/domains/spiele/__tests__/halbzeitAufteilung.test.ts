/* ══════════════════════════════════════════════════════════════════════
   Die Halbzeit-Aufteilung muss aufgehen — 23.09.2026
   ══════════════════════════════════════════════════════════════════════

   Die Zusage, um die es geht:

   > **halbzeit_widerspruch + halbzeit_stimmt + halbzeit_nicht_pruefbar
   > === spiele_gebaut**

   Eine Aufteilung, die aufgehen MUSS, prueft sich selbst. Eine einzelne
   Zahl kann nur behauptet werden.

   ── Was vorher war, und warum es von aussen unsichtbar blieb ──────────

   Bis zum 23.09.2026 stand der Aufruf in `if (aufZeilen.length)`. Spiele
   OHNE Aufstellungszeilen liefen damit gar nicht durch die Pruefung und
   standen in KEINEM der drei Zaehler.

   ⚠ Das ist etwas anderes als `nicht_pruefbar` — und von aussen nicht
   davon zu unterscheiden. `nicht_pruefbar` heisst *„es gibt nichts,
   wogegen man halten koennte"*; hier hiess es *„wir haben nicht
   gefragt"*. Beides ergab dieselbe Luecke in der Summe, und die Summe
   hat niemand gebildet.

   > **Nicht gefragt ist nicht dasselbe wie nichts gefunden.**

   Die Pruefung braucht die Aufstellung nicht: sie bekommt `ereignisse`,
   `ht_resultat` und `heimspiel`. Die Verzweigung war also nicht zu eng
   gewaehlt, sondern gegenstandslos.

   ── Warum ueber den SYNTAXBAUM und nicht ueber das Verhalten ──────────

   `supabase/functions/wp-export/index.ts` ist Deno und importiert von
   esm.sh. `tsc` und vitest koennen die Datei nicht laden — dieselbe
   Grenze wie bei `namenFuersProtokoll` am 13.09.2026. Ein Verhaltensfall
   ist hier nicht zu haben; die Struktur ist es.

   ⚠ UND NIE UEBER EIN TEXTMUSTER. Die Datei enthaelt an genau dieser
   Stelle Kommentare, die `aufZeilen`, `halbzeitWiderspruch` und
   `if (aufZeilen.length)` woertlich fuehren — ein Regex auf den
   Quelltext faende die Kommentare, die den behobenen Defekt
   BESCHREIBEN, und waere rot, obwohl der Code stimmt.

   ── Warum ZWEI Faelle ────────────────────────────────────────────────

   ⚠ Der erste allein waere gruen, wenn der Aufruf **ganz verschwindet**
   — dann steht er in keinem `if`, weil er nirgends steht. Eine Pruefung
   ueber die leere Menge ist in diesem Papier fuenfmal vorgekommen und
   hat jedes Mal „bestanden" gesagt.

   Deshalb haelt der zweite Fall die Gegenrichtung: der Aufruf steht
   genau einmal da. Erst beide zusammen sind die Zusage.

   ── Und warum ein DRITTER Fall — 23.09.2026 ──────────────────────────

   Die zwei Faelle oben halten, dass die Pruefung fuer JEDES Spiel
   LAEUFT. Sie sagen nichts darueber, ob ihr Ergebnis auch ANKOMMT.

   ⚠ Ein vierter `if`-Zweig zwischen Aufruf und Zaehlung, ein
   `continue` dazwischen, eine fehlende `else`-Haelfte: jedes davon
   laesst Spiele durchfallen, ohne dass etwas fehlschlaegt. Die
   Aufteilung waere wieder lueckenhaft, und `halbzeit_aufteilung_stimmt`
   fiele erst zur LAUFZEIT auf — also im scharfen Lauf, nicht hier.

   > **Eine Aufteilung, die aufgehen MUSS, prueft sich selbst — aber
   > erst, wenn sie ueberhaupt gebildet wird.**

   Der dritte Fall haelt deshalb die Form: auf die Zuweisung folgt
   UNMITTELBAR eine `if / else if / else`-Kette ueber genau drei
   Zweige, jeder Zweig erhoeht genau einen der drei Zaehler, und jeder
   Zaehler kommt genau einmal vor. Kein vierter Ausgang, kein frueher
   Ausstieg dazwischen.
   ══════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import {
  suche, baue, jederKnoten, zeileVon,
} from "../../../test-helpers/quelltext.ts";

const INDEX = "supabase/functions/wp-export/index.ts";

/** Heisst dieser Aufruf `halbzeitWiderspruch(...)`? */
function istHalbzeitAufruf(n: ts.Node): n is ts.CallExpression {
  if (!ts.isCallExpression(n)) return false;
  const z = n.expression;
  const name = ts.isIdentifier(z) ? z.text
    : ts.isPropertyAccessExpression(z) ? z.name.text : "";
  return name === "halbzeitWiderspruch";
}

/**
 * Jeder Aufruf, der im RUMPF eines `if` steht, dessen Bedingung
 * `aufZeilen` nennt.
 *
 * ⚠ Die Vorfahren werden Schritt fuer Schritt abgelaufen, und `kind`
 * ist dabei immer das unmittelbare Kind von `p`. `p.expression === kind`
 * heisst deshalb genau: der Aufruf steht in der BEDINGUNG selbst — das
 * waere kein Verstoss, sondern eine andere Konstruktion.
 *
 * ⚠ `thenStatement` und `elseStatement` gelten gleichermassen: auch ein
 * `else`-Zweig haengt an derselben Bedingung.
 */
function aufrufUnterAufZeilen(
  baum: ts.SourceFile,
): Array<{ zeile: number; bedingung: string }> {
  const funde: Array<{ zeile: number; bedingung: string }> = [];
  jederKnoten(baum, (n) => {
    if (!istHalbzeitAufruf(n)) return;
    let kind: ts.Node = n;
    let p: ts.Node | undefined = n.parent;
    while (p) {
      if (ts.isIfStatement(p) && p.expression !== kind
          && /aufZeilen/.test(p.expression.getText())) {
        funde.push({ zeile: zeileVon(n), bedingung: p.expression.getText() });
      }
      kind = p;
      p = p.parent;
    }
  });
  return funde;
}

/** Die drei Zaehler, ueber deren Summe die Zusage laeuft. */
const ZAEHLER = ["nicht_pruefbar", "widerspruch", "stimmt"];

/** `halbzeit.stimmt += 1` / `halbzeit.stimmt++` → `["stimmt"]`. */
function erhoehteZaehler(wurzel: ts.Node): string[] {
  const namen: string[] = [];
  jederKnoten(wurzel, (n) => {
    let ziel: ts.Expression | undefined;
    if (ts.isBinaryExpression(n)
        && n.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) ziel = n.left;
    else if (ts.isPostfixUnaryExpression(n)
             && n.operator === ts.SyntaxKind.PlusPlusToken) ziel = n.operand;
    else if (ts.isPrefixUnaryExpression(n)
             && n.operator === ts.SyntaxKind.PlusPlusToken) ziel = n.operand;
    if (ziel && ts.isPropertyAccessExpression(ziel)) namen.push(ziel.name.text);
  });
  return namen;
}

/**
 * Nennt dieser Ausdruck den Namen — als Bezeichner, nicht als Textstelle?
 *
 * ⚠ Bewusst ueber den Baum und nicht ueber ein Muster auf `getText()`.
 * `\b` ist in dieser Codebasis unbrauchbar (`\w` kennt kein `ä`), und
 * ein `$` im Bezeichner waere im Muster ein Anker. Ein Identifier-Knoten
 * kennt beide Fallen nicht.
 */
function nenntNamen(ausdruck: ts.Node, name: string): boolean {
  let ja = false;
  jederKnoten(ausdruck, (n) => {
    if (ts.isIdentifier(n) && n.text === name) ja = true;
  });
  return ja;
}

/**
 * Jede Stelle, an der das Ergebnis von `halbzeitWiderspruch()` NICHT in
 * genau einem der drei Zaehler landet.
 *
 * Gefordert ist die Form, und zwar vollstaendig:
 *
 *   const hw = halbzeitWiderspruch(…);
 *   if (…)      halbzeit.nicht_pruefbar += 1;
 *   else if (…) halbzeit.widerspruch   += 1;
 *   else        halbzeit.stimmt        += 1;
 *
 * ⚠ Die Kette muss UNMITTELBAR folgen. Ein `continue`, ein `return` oder
 * ein zusaetzliches `if` dazwischen ist genau der Weg, auf dem Spiele
 * wieder durchfallen — und die Summe faellt erst zur Laufzeit auf.
 *
 * ⚠ Der letzte Zweig darf KEIN `if` mehr sein. `else if (…) x` ohne
 * abschliessendes `else` ist ein vierter Ausgang: die Kette laeuft
 * durch, ohne dass irgendetwas gezaehlt wird.
 *
 * ⚠ Und jeder Zaehler genau einmal: zweimal derselbe waere eine Kette
 * ueber drei Zweige, die trotzdem einen Zaehler nie erreicht.
 */
function zaehlketteVerletzt(
  baum: ts.SourceFile,
): Array<{ zeile: number; grund: string }> {
  const funde: Array<{ zeile: number; grund: string }> = [];
  jederKnoten(baum, (n) => {
    if (!ts.isVariableStatement(n)) return;
    const d = n.declarationList.declarations.find(
      (v) => v.initializer && istHalbzeitAufruf(v.initializer),
    );
    if (!d) return;
    const zeile = zeileVon(n);
    const melde = (grund: string) => funde.push({ zeile, grund });

    if (!ts.isIdentifier(d.name)) {
      melde("das Ergebnis wird nicht an einen Namen gebunden");
      return;
    }
    const name = d.name.text;

    const eltern = n.parent;
    if (!eltern || !("statements" in eltern)) {
      melde("die Zuweisung steht in keiner Anweisungsliste");
      return;
    }
    const liste = (eltern as { statements: ts.NodeArray<ts.Statement> }).statements;
    const naechste = liste[liste.indexOf(n) + 1];

    if (!naechste || !ts.isIfStatement(naechste)) {
      melde(`auf die Zuweisung folgt kein if, sondern `
        + `${naechste ? ts.SyntaxKind[naechste.kind] : "nichts"} — frueher Ausstieg?`);
      return;
    }

    /* Die Kette ablaufen: jedes `else if` ist ein weiterer Zweig, der
       letzte `else`-Zweig schliesst sie ab. */
    const zweige: ts.Statement[] = [];
    let k: ts.Statement = naechste;
    while (ts.isIfStatement(k)) {
      if (!nenntNamen(k.expression, name)) {
        melde(`ein Zweig fragt nicht ${name} ab, sondern `
          + `${k.expression.getText()}`);
        return;
      }
      zweige.push(k.thenStatement);
      if (!k.elseStatement) {
        melde("die Kette hat kein abschliessendes else — ein vierter "
          + "Ausgang, in dem gar nicht gezählt wird");
        return;
      }
      k = k.elseStatement;
    }
    zweige.push(k);

    if (zweige.length !== 3) {
      melde(`die Kette hat ${zweige.length} Zweige statt 3`);
      return;
    }
    const getroffen = zweige.map((z) => erhoehteZaehler(z));
    getroffen.forEach((namen, i) => {
      if (namen.length !== 1) {
        melde(`Zweig ${i + 1} erhöht ${namen.length} Zähler statt genau einen`
          + `${namen.length ? ` (${namen.join(", ")})` : ""}`);
      }
    });
    const flach = getroffen.flat();
    for (const z of ZAEHLER) {
      const wieoft = flach.filter((x) => x === z).length;
      if (wieoft !== 1) melde(`${z} wird ${wieoft}-mal erhöht statt genau einmal`);
    }
    for (const z of flach) {
      if (!ZAEHLER.includes(z)) melde(`ein Zweig erhöht ${z} — kein Halbzeit-Zähler`);
    }
  });
  return funde;
}

describe("Die drei Halbzeit-Zaehler decken jedes gebaute Spiel", () => {
  it("⚠⚠ der Aufruf steht in keinem `if`, dessen Bedingung aufZeilen nennt", () => {
    const treffer = suche({
      frage: "halbzeitWiderspruch() im Rumpf eines if auf aufZeilen",
      dateien: [INDEX],
      /* ⚠ Genau der Zustand vor dem 23.09.2026. Er MUSS gefunden werden,
         sonst prueft dieser Fall nichts. */
      positivkontrolle: `
        const aufZeilen = aufProSpiel.get(String(s.id)) ?? [];
        if (aufZeilen.length) {
          const hw = halbzeitWiderspruch(ereignisse, s.ht_resultat, heim);
          if (hw === null) halbzeit.nicht_pruefbar += 1;
        }`,
      finde: aufrufUnterAufZeilen,
    });

    expect(
      treffer.map(t => `${t.datei}:${t.fund.zeile} steht in if (${t.fund.bedingung})`),
    ).toEqual([]);
  });

  it("⚠ und der Aufruf steht ueberhaupt da — sonst waere der Fall oben leer", () => {
    /* ⚠ Die Gegenrichtung. Ohne sie waere „steht in keinem if" auch dann
       erfuellt, wenn die Pruefung ganz verschwindet — und dann gaebe es
       die drei Zaehler nicht mehr, ueber deren Aufteilung dieser Test
       wacht. */
    const aufrufe: number[] = [];
    jederKnoten(baue(INDEX), (n) => {
      if (istHalbzeitAufruf(n)) aufrufe.push(zeileVon(n));
    });

    expect(aufrufe).toHaveLength(1);
  });

  it("⚠⚠ das Ergebnis landet in genau einem der drei Zähler", () => {
    const treffer = suche({
      frage: "eine Zählkette, die nicht jedes Ergebnis in genau einen Zähler legt",
      dateien: [INDEX],
      /* ⚠ Genau die Sabotage, gegen die der Fall gebaut ist: ein vierter
         Zweig, und damit ein Ausgang, in dem gar nicht gezählt wird.
         Sie MUSS gefunden werden, sonst prüft dieser Fall nichts.

         ⚠ ⚠  DIE ZÄHLERNAMEN KOMMEN AUS `ZAEHLER`, NICHT ABGESCHRIEBEN.
         Zwei Gründe, und beide stehen so im Kopf von
         `scripts/check-quotes.mjs`:

           1. Abgeschrieben wären sie Prosa in einem Stringliteral, und
              `nicht_pruefbar` sähe dort aus wie eine Umlaut-Ersatz-
              schreibung. Genau dieser Fehlalarm ist am 23.09.2026
              aufgetreten — das Skript nennt ihn und nennt das
              Gegenmittel: *„gehört der Name aus der Funktion selbst
              geholt statt abgeschrieben."*
           2. ⚠ Und das ist der wichtigere: **eine Umbenennung der
              Zähler könnte diese Stelle sonst still aushöhlen.** Die
              Positivkontrolle liefe weiter gegen alte Namen, fände
              nichts mehr — und `suche()` würfe dann zwar, aber erst,
              wenn jemand sie laufen lässt. So kann sie nicht
              auseinanderlaufen. */
      positivkontrolle: `
        const hw = halbzeitWiderspruch(ereignisse, s.ht_resultat, heim);
        if (hw === null) halbzeit.${ZAEHLER[0]} += 1;
        else if (hw) halbzeit.${ZAEHLER[1]} += 1;
        else if (sonstwas) halbzeit.${ZAEHLER[2]} += 1;`,
      finde: zaehlketteVerletzt,
    });

    expect(
      treffer.map(t => `${t.datei}:${t.fund.zeile} — ${t.fund.grund}`),
    ).toEqual([]);
  });
});
