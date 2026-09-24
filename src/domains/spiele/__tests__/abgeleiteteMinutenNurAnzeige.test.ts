/* ══════════════════════════════════════════════════════════════════════
   Abgeleitete Minuten bleiben in der ANZEIGE — Bedingung 1, 25.09.2026
   ══════════════════════════════════════════════════════════════════════

   ⚠ ⚠  DIE ZUSAGE UEBERLEBT DEN KOMMENTAR NICHT VON SELBST.

   `leiteWechselMinutenAb()` darf gebaut werden, WEIL sie nichts
   speichert. CLAUDE.md, 11.09.2026, Entscheid Didi:

   > eine Aufstellungszeile aus Ereignissen zusammenzusetzen ist
   > ausdruecklich abgelehnt: eine Zeile, die wir uns selbst ableiten,
   > waere von einer gelieferten nicht mehr zu unterscheiden — und genau
   > diese Ununterscheidbarkeit ist der teuerste Fehler in diesem Papier.
   > **Wenn je, dann mit eigenem Merkmal und eigenem Zaehler.**

   Die Erlaubnis haengt also an einer Grenze, und eine Grenze, die nur in
   einem Kommentar steht, ist eine Behauptung ueber eine andere Stelle —
   die Familie, die dieses Projekt an einem Dutzend Stellen teuer bezahlt
   hat.

   ── DER WEG, AUF DEM ES SCHIEFGEHEN WUERDE ────────────────────────────

   Nicht hier. `wpNutzlast.ts` kennt keine Datenbank; der naheliegende
   naechste Schritt ist ein anderer: jemand findet die Funktion nuetzlich
   und ruft sie in `sfv-sync/matchdatenLauf.ts` auf, wo die
   Aufstellungszeilen GESCHRIEBEN werden. Dann stuende die Ableitung in
   `spiel_aufstellung`, und niemand koennte sie mehr von einer
   gelieferten Zeile unterscheiden.

   ⚠ Ein Vergleich mit dem Matchblatt faende danach nichts mehr, und der
   Befund waere nicht falsch — er waere weg.

   ── WARUM UEBER DEN SYNTAXBAUM ────────────────────────────────────────

   Ein Textmuster auf den Funktionsnamen traefe diesen Kopf und jeden
   Kommentar, der von der Sache handelt. Gesucht wird der IMPORT, also
   ein Vorgang, nicht eine Schreibweise.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { readdirSync, existsSync } from "node:fs";
import { suche, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

const SYNC = "supabase/functions/sfv-sync";

/** Jede `.ts` des Sync — er ist die Stelle, die `spiel_aufstellung` schreibt. */
function syncDateien(): string[] {
  if (!existsSync(SYNC)) return [];
  return readdirSync(SYNC)
    .filter((n) => n.endsWith(".ts"))
    .map((n) => `${SYNC}/${n}`);
}

/** Importierte Namen aus `wpNutzlast.ts`, mit Zeile. */
function importeAusNutzlast(baum: ts.SourceFile): { name: string; zeile: number }[] {
  const raus: { name: string; zeile: number }[] = [];
  jederKnoten(baum, (n) => {
    if (!ts.isImportDeclaration(n)) return;
    if (!ts.isStringLiteral(n.moduleSpecifier)) return;
    if (!n.moduleSpecifier.text.includes("wpNutzlast")) return;
    const b = n.importClause?.namedBindings;
    if (b && ts.isNamedImports(b)) {
      for (const el of b.elements) raus.push({ name: el.name.text, zeile: zeileVon(el) });
    }
  });
  return raus;
}

describe("⚠⚠ die Ableitung erreicht `spiel_aufstellung` nicht", () => {
  /* ⚠ Die drei Namen zusammen, nicht nur der eine: wer die Ableitung in
     den Sync zoege, braeuchte mindestens einen davon. `AbgeleiteteMinuten`
     allein waere harmlos — aber ein Typ ohne die Funktion nuetzt dort
     nichts, und die Liste kostet nichts. */
  const VERBOTEN = ["leiteWechselMinutenAb", "ableitungsSchluessel", "AbgeleiteteMinuten"];

  it("kein Modul des SFV-Sync importiert sie", () => {
    const dateien = syncDateien();
    /* ⚠ Die Positivkontrolle der Positivkontrolle: findet das Verzeichnis
       keine Datei, prueft dieser Fall eine leere Menge — und das ist in
       diesem Projekt schon viermal passiert. */
    expect(dateien.length).toBeGreaterThan(3);

    const treffer = suche({
      frage: "importiert der SFV-Sync die Minuten-Ableitung?",
      dateien,
      finde: (baum) => importeAusNutzlast(baum)
        .filter((i) => VERBOTEN.includes(i.name)),
      positivkontrolle:
        'import { leiteWechselMinutenAb } from "../../../src/domains/spiele/wpNutzlast.ts";',
    });

    expect(treffer.map((t) => `${t.datei}:${t.fund.zeile} ${t.fund.name}`)).toEqual([]);
  });

  it("⚠ und wpNutzlast.ts fasst selbst keine Tabelle an", () => {
    /* Sie ist heute rein: kein einziges `from("tabelle")`. Der Fall haelt
       das fest, damit die Ableitung nicht spaeter „gleich hier" gespeichert
       wird, wo sie entsteht.

       ⚠ ⚠  GESUCHT WIRD `from("...")`, NICHT `insert`/`update`/`delete`.
       Die erste Fassung dieser Abfrage zaehlte die vier Methodennamen —
       und schlug sofort an: `lageDerSeite()` ruft `stand.delete(n)` auf
       einer Map. **Ein Melder, der grundlos anschlaegt, wird nach dem
       dritten Mal abgeschaltet**, und dann fehlt auch die Pruefung, die
       er haette sein koennen.

       `from` mit einem Tabellennamen als Zeichenkette ist der Einstieg
       von PostgREST und kommt sonst nirgends vor. `Array.from` ist
       ausgenommen — es ist derselbe Name und eine andere Sache. */
    const treffer = suche({
      frage: "fasst wpNutzlast.ts eine Tabelle an?",
      dateien: ["src/domains/spiele/wpNutzlast.ts"],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isCallExpression(n)) return;
          const f = n.expression;
          if (!ts.isPropertyAccessExpression(f) || f.name.text !== "from") return;
          if (ts.isIdentifier(f.expression)
            && ["Array", "Object", "Buffer"].includes(f.expression.text)) return;
          const arg = n.arguments[0];
          if (arg && ts.isStringLiteral(arg)) raus.push(`${arg.text}:${zeileVon(n)}`);
        });
        return raus;
      },
      positivkontrolle: 'const x = db.from("spiel_aufstellung").upsert(z);',
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });
});
