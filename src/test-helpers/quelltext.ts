/* ═══════════════════════════════════════════════════════════════
   ClubCampus — test-helpers/quelltext.ts

   Strukturprüfungen über den SYNTAXBAUM statt über den Text.

   ┌───────────────────────────────────────────────────────────┐
   │ ⚠ WER HIER EINE NEUE STRUKTURPRÜFUNG ANLEGT, LIEST DAS:   │
   │                                                            │
   │   1. NICHT `readFileSync` + Regex. Der Quelltext ist       │
   │      kein Text — er enthält Kommentare, die genau das      │
   │      Wort tragen, nach dem du suchst.                      │
   │                                                            │
   │   2. Jede Suche braucht eine POSITIVKONTROLLE. `suche()`   │
   │      verlangt sie als Pflichtfeld und läuft sie zuerst.    │
   │      Findet die Abfrage dort nichts, bricht sie ab.        │
   │                                                            │
   │   ⚠ Punkt 2 ist der wichtigere. Eine Suchprüfung, deren    │
   │   SUCHE kaputt ist, findet nichts — und ist damit GRÜN.    │
   │   Sie scheitert nach oben. Das gilt für einen falschen     │
   │   Regex genauso wie für einen falschen Baum-Ausdruck; die  │
   │   Bauweise allein rettet dich nicht.                       │
   └───────────────────────────────────────────────────────────┘

   ⚠ WARUM ES DIESE DATEI GIBT — vier Fehlgriffe an zwei Tagen:

   | gesucht          | getroffen                                  |
   |------------------|--------------------------------------------|
   | `onClick={()=>{}}` | zwei KOMMENTARE, die den Defekt beschreiben |
   | `post_modified`  | ein KOMMENTAR, der erklärt, warum es fehlt  |
   | `\blimit\b`      | `.limit(1)` — der erste Protokolleintrag     |
   | Funktionsrumpf   | die Parameterliste `{ von: string \| null }` |

   Die ersten zwei sind Kommentare, die letzten zwei echter Code, der
   nur gleich AUSSAH. Ein Kommentar-Entferner löst deshalb die Hälfte;
   der Baum löst beide — er weiss, was ein Aufruf ist und wo ein Rumpf
   anfängt.

   ⚠ UND DER TEXTWEG IST HEUTE SCHON FALSCH, nicht bloss unschön:
   `AussehenTab.tsx` enthält `"image/*"` und `TermineModul.tsx` den
   Ausdruck fuer eine Uhrzeit, der auf Stern-Schraegstrich endet — also auf
   genau die zwei Zeichen, die einen Blockkommentar schliessen. Ein Regex-
   Kommentarentferner schneidet an beiden Stellen mitten im Code, und
   der Test wird grün.

   ── GRENZEN, damit niemand mehr erwartet als drinsteht ──────────
   · Nur TS/TSX/JS/JSX. PHP hat seinen eigenen Weg über den
     PHP-Tokenizer (`scripts/check-plugin.mjs`), SQL hat gar keinen —
     `schema.sql` wird weiterhin als Text gelesen, und das bleibt eine
     bekannte Lücke, keine Nachlässigkeit.
   · Der Baum sagt, was DASTEHT, nicht was zur Laufzeit passiert. Ein
     Aufruf über eine Variable (`const f = db.insert; f()`) entgeht ihm.
   · ⚠ Eine Positivkontrolle ist Code in einem Stringliteral — und andere
     Prüfmittel, die den Text lesen, sehen sie. `check:selects` meldet
     seit dem 08.09.2026 „2 übersprungen" statt „0": es sind die
     Kontroll-Schnipsel mit `db.from("x").select("id")`, deren Tabelle es
     nicht gibt. Das ist richtig so — es sagt „übersprungen", nicht „ok" —,
     aber die Zahl bewegt sich, und wer sie jagt, sucht am falschen Ort.
   ═══════════════════════════════════════════════════════════════ */
import ts from "typescript";
import { readFileSync } from "node:fs";

/* ── Laden ──────────────────────────────────────────────────────── */

export function baue(datei: string, quelle?: string): ts.SourceFile {
  const text = quelle ?? readFileSync(datei, "utf8");
  return ts.createSourceFile(datei, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/* ── Die eine Art zu suchen ─────────────────────────────────────── */

export interface SucheAuftrag<T> {
  /** Was gefragt wird, in Worten — steht in der Fehlermeldung. */
  frage: string;
  dateien: string[];
  finde: (baum: ts.SourceFile) => T[];
  /**
   * ⚠ PFLICHT. Ein Schnipsel, in dem `finde` fündig werden MUSS.
   *
   * Ohne ihn wäre nicht zu unterscheiden, ob die Abfrage nichts gefunden
   * hat oder nichts finden KANN. Beides sieht gleich aus: eine leere
   * Liste, ein grüner Test.
   */
  positivkontrolle: string;
}

export interface Treffer<T> { datei: string; fund: T }

export function suche<T>(auftrag: SucheAuftrag<T>): Treffer<T>[] {
  const probe = auftrag.finde(baue("positivkontrolle.tsx", auftrag.positivkontrolle));
  if (probe.length === 0) {
    throw new Error(
      `Die Abfrage „${auftrag.frage}" findet nicht einmal in ihrer eigenen `
      + `Positivkontrolle etwas. Sie ist kaputt — nicht der geprüfte Code. `
      + `Solange das so ist, wäre jedes „bestanden" wertlos.`,
    );
  }
  const treffer: Treffer<T>[] = [];
  for (const datei of auftrag.dateien) {
    for (const fund of auftrag.finde(baue(datei))) treffer.push({ datei, fund });
  }
  return treffer;
}

/* ── Bausteine für `finde` ──────────────────────────────────────── */

export function zeileVon(n: ts.Node): number {
  return n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;
}

/** Jeden Knoten besuchen. */
export function jederKnoten(wurzel: ts.Node, tu: (n: ts.Node) => void): void {
  (function geh(n: ts.Node) { tu(n); n.forEachChild(geh); })(wurzel);
}

/**
 * Eine Funktion beim Namen finden — Deklaration oder `const x = () => …`.
 *
 * ⚠ Kein Textanker und keine Klammerzählung. Genau daran ist die
 * Vorgängerfassung gescheitert: sie nahm die erste `{` nach dem Namen und
 * erwischte damit ein Typliteral in der Parameterliste.
 */
export function findeFunktion(baum: ts.SourceFile, name: string): ts.Node | null {
  let fund: ts.Node | null = null;
  jederKnoten(baum, (n) => {
    if (fund) return;
    if (ts.isFunctionDeclaration(n) && n.name?.text === name) fund = n.body ?? n;
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name
             && n.initializer && (ts.isArrowFunction(n.initializer)
                                  || ts.isFunctionExpression(n.initializer))) {
      fund = n.initializer.body;
    }
  });
  return fund;
}

/**
 * Die Namen aller Aufrufe unterhalb eines Knotens.
 *
 * `db.from("x").select("y")` → `["from", "select"]`, `fetch(…)` → `["fetch"]`.
 * Ein Wort in einem Kommentar kommt hier nicht vor — Kommentare sind Trivia
 * und stehen nicht im Baum.
 */
export function aufrufNamen(wurzel: ts.Node): string[] {
  const namen: string[] = [];
  jederKnoten(wurzel, (n) => {
    if (!ts.isCallExpression(n)) return;
    const z = n.expression;
    if (ts.isIdentifier(z)) namen.push(z.text);
    else if (ts.isPropertyAccessExpression(z)) namen.push(z.name.text);
  });
  return namen;
}

/** Alle Zeichenketten-Literale unterhalb eines Knotens (ohne Kommentare). */
export function textLiterale(wurzel: ts.Node): string[] {
  const werte: string[] = [];
  jederKnoten(wurzel, (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) werte.push(n.text);
    else if (ts.isTemplateExpression(n)) werte.push(n.getText());
  });
  return werte;
}

/** Eigenschaften von Objektliteralen: `{ method: "POST" }` → `[["method","POST"]]`. */
export function objektEigenschaften(wurzel: ts.Node): Array<[string, string]> {
  const paare: Array<[string, string]> = [];
  jederKnoten(wurzel, (n) => {
    if (!ts.isPropertyAssignment(n)) return;
    const schluessel = ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)
      ? n.name.text : n.name.getText();
    const wert = ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer)
      ? n.initializer.text : n.initializer.getText();
    paare.push([schluessel, wert]);
  });
  return paare;
}

/**
 * Eine Aufrufkette rückwärts lesen: bei `.delete()` herausfinden, worauf sie
 * sich bezieht. Liefert die Kette von innen nach aussen als
 * `[{ name, texte }]` — `texte` sind die Zeichenketten-Argumente.
 */
export function kette(aufruf: ts.CallExpression): Array<{ name: string; texte: string[] }> {
  const glieder: Array<{ name: string; texte: string[] }> = [];
  let n: ts.Node = aufruf;
  while (ts.isCallExpression(n)) {
    const z = n.expression;
    const name = ts.isPropertyAccessExpression(z) ? z.name.text
      : ts.isIdentifier(z) ? z.text : "";
    const texte = n.arguments
      .filter((a): a is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
        ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))
      .map((a) => a.text);
    glieder.unshift({ name, texte });
    n = ts.isPropertyAccessExpression(z) ? z.expression : z;
  }
  return glieder;
}

/** Leere Ereignis-Handler in JSX: `onClick={() => {}}`. */
export function leereHandler(baum: ts.SourceFile): Array<{ attribut: string; zeile: number }> {
  const fund: Array<{ attribut: string; zeile: number }> = [];
  jederKnoten(baum, (n) => {
    if (!ts.isJsxAttribute(n) || !n.initializer || !ts.isJsxExpression(n.initializer)) return;
    const name = n.name.getText();
    if (!/^on[A-Z]/.test(name)) return;
    const a = n.initializer.expression;
    if (a && ts.isArrowFunction(a) && ts.isBlock(a.body) && a.body.statements.length === 0) {
      fund.push({ attribut: name, zeile: zeileVon(n) });
    }
  });
  return fund;
}
