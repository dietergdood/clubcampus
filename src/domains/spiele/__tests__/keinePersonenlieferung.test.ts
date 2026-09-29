/* ══════════════════════════════════════════════════════════════════════
   Der Export sendet KEINE Personen — die fehlende Hälfte, 29.09.2026
   ══════════════════════════════════════════════════════════════════════

   ⚠ ⚠  ANLASS. Die Vorschau „Bestand drüben" meldete am 29.09.2026:

       19 zu sendende Personen · 0 davon mit Verbandsnummer · 0 Treffer
       → alle 19 würden auf der Website NEU ANGELEGT

   Gemessen: es wird keine gesendet. Die Vorschau RECHNET, was ein Lauf
   täte, den es nicht gibt — sie ist eine Auskunft und kein Vorbote.

   ⚠ ⚠  ABER DIE ZUSAGE STAND NIRGENDS. Auf der Gegenseite ist sie seit
   dem 24.09.2026 geprüft (`check:plugin`, „keine Funktion schreibt an
   einen fch_person-Beitrag"). **Auf unserer Seite gab es weder einen
   Test noch einen Kommentar** — jeder `personen`-Vermerk in
   `wp-export/index.ts` handelt vom RÜCKWEG (`nichtDurchgereicht`).

   Das ist die Lage, gegen die der Abgleich ausdrücklich gebaut wurde
   (Gegenstelle, 13.09.2026):

   > Die Einsatzberechnung verknüpft über die Verbandsnummer. **Zwei
   > Datensätze derselben Person bekämen dieselben Einsätze, und keine
   > der zwei Seiten sähe danach falsch aus.**

   ── Warum GENAU DIESE zwei Fragen ────────────────────────────────────

   Geprüft wird der VORGANG — ein Aufruf nach draussen —, nicht ein
   Bezeichner. Ein Verbot des Wortes `personen` träfe `holeKandidaten()`
   und `nichtDurchgereicht()`, die beide zu Recht davon sprechen.

     1) die MENGE der POST-Ziele        ein neues Ziel ist rot
     2) die Rumpffelder JE Ziel         ein neues Feld ist rot

   ⚠ Die zweite ist die wichtigere. Ohne sie genügte es, `personen:` in
   den Rumpf von `/spiele` zu legen — dieselbe Route, dieselbe Zahl der
   Ziele, und die erste Frage bliebe grün. **Ein neues Feld erbt jeden
   Ausgang des Objekts, an dem es hängt**; hier ist das Objekt die
   Nutzlast, und die Allowlist ist ihre obere Ebene.

   ── Was diese Prüfung NICHT weiss ────────────────────────────────────

   Sie kann einem neuen Feld nicht ansehen, ob es Personen trägt. Sie
   macht seine Ankunft SICHTBAR und überlässt die Entscheidung dem
   Menschen — genau wie `unbeachtete_felder` auf der Gegenseite. Wer ein
   Feld ergänzt, trägt es hier nach; wer Personen ergänzt, muss dabei
   erklären, wie die Verbandsnummer hinkommt.

   ⚠ Und sie sieht nur `wp-export`. Gemessen am 29.09.2026: keine andere
   Edge Function nennt `WP_BASIS_URL` oder `clubcampus/v1` — es gibt
   heute genau einen Weg nach draussen. Käme ein zweiter, sähe diese
   Prüfung ihn nicht, und ihre Dateiliste wäre der Ort dafür.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { suche, jederKnoten } from "../../../test-helpers/quelltext.ts";

const EXPORT = "supabase/functions/wp-export/index.ts";

/** Ein `fetch(...)`-Aufruf. */
function istFetch(n: ts.Node): n is ts.CallExpression {
  return ts.isCallExpression(n)
    && ts.isIdentifier(n.expression) && n.expression.text === "fetch";
}

/**
 * Der Pfad aus dem ersten Argument.
 *
 * ⚠ Die Ziele stehen als Template mit `${basis}` davor. Gelesen werden
 * die LITERALEN Stücke — `${basis}` ist ein Host und gehört nicht zur
 * Frage, welcher Endpunkt gerufen wird.
 */
function zielVon(aufruf: ts.CallExpression): string | null {
  const a = aufruf.arguments[0];
  if (!a) return null;
  if (ts.isStringLiteral(a)) return a.text;
  if (ts.isNoSubstitutionTemplateLiteral(a)) return a.text;
  if (ts.isTemplateExpression(a)) {
    return a.head.text + a.templateSpans.map((s) => s.literal.text).join("");
  }
  return null;
}

/** Eine Eigenschaft aus dem Optionsobjekt des zweiten Arguments. */
function option(aufruf: ts.CallExpression, name: string): ts.Expression | null {
  const o = aufruf.arguments[1];
  if (!o || !ts.isObjectLiteralExpression(o)) return null;
  for (const p of o.properties) {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name) {
      return p.initializer;
    }
  }
  return null;
}

/** Schickt dieser Aufruf etwas hin — oder holt er nur? */
function istPost(aufruf: ts.CallExpression): boolean {
  const m = option(aufruf, "method");
  return m != null && ts.isStringLiteral(m) && m.text.toUpperCase() === "POST";
}

/**
 * Die Feldnamen der obersten Ebene des Rumpfs.
 *
 * ⚠ Auch Kurzschreibweise (`{ lauf, teams }`) — sonst wäre die Abfrage
 * genau an der bequemsten Form blind, und die ist im Bestand die
 * häufigere.
 */
function rumpffelder(aufruf: ts.CallExpression): string[] {
  const b = option(aufruf, "body");
  if (!b) return [];
  const raus: string[] = [];
  jederKnoten(b, (n) => {
    if (!ts.isObjectLiteralExpression(n)) return;
    for (const p of n.properties) {
      if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) raus.push(p.name.text);
      if (ts.isShorthandPropertyAssignment(p)) raus.push(p.name.text);
    }
  });
  return raus;
}

/* ⚠ Ein Rumpf mit einem Personenfeld UND ein neues Ziel — beide Abfragen
   müssen hier fündig werden, sonst wäre eine für immer grün. */
const KONTROLLE = `
  const a = await fetch(\`\${basis}/clubcampus/v1/personen\`, {
    method: "POST",
    body: JSON.stringify({ personen: x, lauf }),
  });
`;

describe('⚠ ⚠ der Export sendet keine Personen — der Melder auf UNSERER Seite', () => {
  it("die POST-Ziele sind genau die drei bekannten", () => {
    const ziele = suche<string>({
      frage: "an welche Endpunkte sendet wp-export etwas?",
      positivkontrolle: KONTROLLE,
      dateien: [EXPORT],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!istFetch(n) || !istPost(n)) return;
          raus.push(zielVon(n) ?? "(Ziel nicht lesbar)");
        });
        return raus;
      },
    }).map((t) => t.fund);

    /* ⚠ Sortiert und entdoppelt: die Reihenfolge im Quelltext ist kein
       Teil der Zusage, die MENGE ist es. */
    expect([...new Set(ziele)].sort()).toEqual([
      "/clubcampus/v1/ranglisten",
      "/clubcampus/v1/spiele",
      "/clubcampus/v1/wappen",
    ]);
  });

  it("und ihre Rumpffelder tragen nichts Neues", () => {
    const felder = suche<string>({
      frage: "welche Felder gehen in einer Nutzlast hinaus?",
      positivkontrolle: KONTROLLE,
      dateien: [EXPORT],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!istFetch(n) || !istPost(n)) return;
          raus.push(...rumpffelder(n));
        });
        return raus;
      },
    }).map((t) => t.fund);

    /* Die Allowlist, gemessen am 29.09.2026:
         /spiele      lauf · teams · spiele
         /ranglisten  gruppen · teams
         /wappen      wappen                                         */
    expect([...new Set(felder)].sort()).toEqual([
      "gruppen", "lauf", "spiele", "teams", "wappen",
    ]);
  });

  it("⚠ und kein Aufruf nach draussen bleibt unlesbar", () => {
    /* ⚠ Ohne diesen Fall wäre ein `fetch(url, opt)` mit Variablen still
       durchgegangen: `zielVon` gäbe null, die Menge oben bliebe
       unverändert, und die Zusage wäre an genau der Form blind, die man
       wählt, wenn man sie umgehen will. */
    const unlesbar = suche<string>({
      frage: "gibt es einen Aufruf, dessen Ziel nicht ablesbar ist?",
      positivkontrolle: `
        const u = "x"; const o = { method: "POST" };
        const a = await fetch(u, o);
      `,
      dateien: [EXPORT],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!istFetch(n)) return;
          const zweites = n.arguments[1];
          if (zielVon(n) == null) raus.push("Ziel nicht ablesbar");
          else if (zweites && !ts.isObjectLiteralExpression(zweites)) {
            raus.push("Optionen nicht ablesbar");
          }
        });
        return raus;
      },
    }).map((t) => t.fund);

    expect(unlesbar).toEqual([]);
  });
});
