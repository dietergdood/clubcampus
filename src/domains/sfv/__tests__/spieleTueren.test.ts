/* ══════════════════════════════════════════════════════════════════════
   Wer schreibt in `spiele`? (10.09.2026)

   ⚠ ANLASS, und er ist beim Gegenlesen des eigenen Baus aufgefallen:
   `schneideAufFeldhoheit()` steht an **einer** Stelle — dem Spielplan-
   Upsert in `sync.ts`. Jeder andere Schreibvorgang in dieselbe Tabelle
   geht **an der Feldhoheit vorbei**.

   Das ist kein Fehler: `matchdaten_geholt_am` ist eine Marke des Laufs
   und steht in keinem Vertrag, `schiedsrichter` und `ht_resultat` sind
   ausdrücklich als SFV-Felder deklariert. **Aber es heisst, dass der
   Vertrag in `api_verbindungen.sync_felder` nur EINE Tür bewacht.**

   ⚠ Und genau deshalb steht hier eine Zählung: eine neue Tür fällt sonst
   niemandem auf. Sie entsteht in einer Zeile, sie schlägt nirgends fehl,
   und sie umgeht eine Regel, von der alle annehmen, sie gelte überall.

   **Diese Prüfung sagt nicht, dass die Türen richtig sind.** Sie sagt,
   dass es keine unbemerkte neue gibt — wie die Löschketten-Prüfung, die
   festhält, dass niemand aus `mitglieder` löscht.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { baue, findeFunktion, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";
import { join } from "node:path";

const ORDNER = "supabase/functions/sfv-sync";
const ZEILEN = new RegExp(String.fromCharCode(13) + "?" + String.fromCharCode(10));

/**
 * Schreibende Aufrufe auf `spiele` — Datei und Art, OHNE Zeilennummer.
 *
 * ⚠ ⚠  DIE ZEILENNUMMER STAND HIER BIS ZUM 11.09.2026, UND SIE WAR DER
 * DEFEKT DIESER PRUEFUNG. An einem einzigen Tag ist sie zweimal rot
 * geworden, beide Male ohne Aussage: ein Kommentar weiter oben hatte die
 * Tueren um sechs Zeilen verschoben.
 *
 * **Eine Pruefung, die bei jeder Kommentaraenderung anschlaegt, bringt
 * niemandem etwas bei — sie bringt bei, die Zahl hochzuzaehlen, ohne zu
 * lesen, was sie sagt.** Dieselbe Abstumpfung wie bei den 758
 * Lint-Warnungen; „rot ist ein Zustand fuer Stunden" gilt auch fuer „rot
 * ohne Aussage".
 *
 * ⚠ Die ZUSAGE bleibt unveraendert scharf: genau drei Tueren, zwei in
 * matchdatenLauf.ts und eine in sync.ts. Eine vierte macht den Fall rot —
 * und nur das soll er tun. **Geprueft wird die Anzahl der Schreibwege,
 * nicht ihre Lage im Text.**
 */
function tueren(): string[] {
  const raus: string[] = [];
  for (const name of readdirSync(ORDNER)) {
    if (!name.endsWith(".ts")) continue;
    const zeilen = readFileSync(join(ORDNER, name), "utf8").split(ZEILEN);
    zeilen.forEach((z, i) => {
      if (!z.includes('from("spiele")')) return;
      /* Der Aufruf steht auf derselben oder einer der nächsten Zeilen —
         die Kette wird oft umbrochen. */
      const umfeld = zeilen.slice(i, i + 3).join(" ");
      if (!/\.(update|upsert|insert|delete)\(/.test(umfeld)) return;
      const art = (umfeld.match(/\.(update|upsert|insert|delete)\(/) ?? [])[1];
      raus.push(`${name} ${art}`);
    });
  }
  return raus.sort();
}

describe("Türen in die Tabelle spiele", () => {
  it("es sind genau die drei bekannten", () => {
    /* ⚠ Kommt eine dazu, ist die Frage zu beantworten, BEVOR sie steht:
       schreibt sie ein Feld, das unter `sfv` deklariert ist? Und wenn
       nein — gehört es dorthin, oder gehört der Schreibvorgang weg?

       matchdatenLauf.ts  Halbzeitstand (ht_resultat, seit 10.09.2026)
       matchdatenLauf.ts  matchdaten_geholt_am + schiedsrichter
       sync.ts            der Spielplan-Upsert — die EINZIGE Tür, an der
                          schneideAufFeldhoheit() steht */
    expect(tueren()).toEqual([
      "matchdatenLauf.ts update",
      "matchdatenLauf.ts update",
      "sync.ts upsert",
    ]);
  });

  it("und nur eine davon geht durch die Feldhoheit", () => {
    /* ⚠ Die unbequeme Hälfte des Befunds, als Zusage festgehalten: der
       Vertrag in sync_felder bewacht EINE Tür. Wer das für „überall"
       hält, deklariert ein Feld und wundert sich, dass ein anderer
       Schreibweg es trotzdem setzt — oder umgekehrt. */
    const quelle = readFileSync(join(ORDNER, "sync.ts"), "utf8");
    expect(quelle).toContain("schneideAufFeldhoheit");
    const lauf = readFileSync(join(ORDNER, "matchdatenLauf.ts"), "utf8");
    expect(lauf).not.toContain("schneideAufFeldhoheit");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Worauf `vertragsprobe` steht (10.09.2026)

   Die Probe baut EINE erfundene Zeile und hält sie gegen den Vertrag —
   ohne API-Aufruf. Das trägt nur, solange `bildeSpiel()` eine FESTE
   Schlüsselmenge liefert: welche Werte drinstehen, darf von den Daten
   abhängen, WELCHE FELDER es gibt nicht.

   ⚠ Käme ein `...(bedingung ? {a:1} : {})` hinein, prüfte die Probe je
   nach erfundener Zeile etwas anderes als der echte Lauf — und wäre
   grün, während der Lauf wirft. Eine Prüfung, die grün ist, ohne zu
   prüfen: genau die Familie, gegen die sie gebaut wurde.
   ══════════════════════════════════════════════════════════════════════ */
describe("bildeSpiel baut eine feste Schlüsselmenge", () => {
  it("keine bedingten Felder im zurückgegebenen Objekt", () => {
    const baum = baue("supabase/functions/sfv-sync/sync.ts");
    const fn = findeFunktion(baum, "bildeSpiel");
    expect(fn, "bildeSpiel nicht gefunden — umbenannt?").not.toBeNull();

    const verstoesse: string[] = [];
    jederKnoten(fn!, (n) => {
      if (!ts.isObjectLiteralExpression(n)) return;
      for (const e of n.properties) {
        if (ts.isSpreadAssignment(e)) {
          verstoesse.push(`Spread in Zeile ${zeileVon(e)}`);
        }
        if (e.name && ts.isComputedPropertyName(e.name)) {
          verstoesse.push(`berechneter Schlüssel in Zeile ${zeileVon(e)}`);
        }
      }
    });
    expect(verstoesse).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   `spiele.sfv_team_id` IST UNSERE MANNSCHAFT — nie der Gegner, nie eine
   Gruppensumme.

   ⚠ ANLASS, 14.09.2026, Frage des Theme-Chats: zählt
   `gespielt_laut_spielplan` in der `rangprobe` unsere Mannschaft oder die
   Gruppe? Die Zahl entsteht aus `count(*) group by spiele.sfv_team_id` —
   ihre ganze Bedeutung hängt daran, was in dieser Spalte steht.

   `bildeSpiel()` schreibt dort `unserId`, und `unserId` ist über
   `unsA ? aId : bId` die EIGENE Seite. Der Gegner steht in `gegnerId` und
   landet in einer anderen Spalte.

   ⚠ Ein Test hält es fest, weil die Zeile sonst eine Behauptung über eine
   andere Datei wäre — und die Gegenstelle zeigt die Zahl erst an, wenn
   ihre Bedeutung feststeht. **Auf ein Feld zu bauen, dessen Bedeutung
   niemand genannt hat, ist Raten mit Quellenangabe.**

   ⚠ Über den Syntaxbaum, weil `sync.ts` von esm.sh importiert und aus
   vitest nicht ladbar ist — dieselbe Grenze wie beim Fall darüber.
   ══════════════════════════════════════════════════════════════════════ */
describe("sfv_team_id an einer Spielzeile", () => {
  it("bekommt `unserId`, nicht `gegnerId`", () => {
    const baum = baue("supabase/functions/sfv-sync/sync.ts");
    const fn = findeFunktion(baum, "bildeSpiel");
    expect(fn, "bildeSpiel nicht gefunden — umbenannt?").not.toBeNull();

    const zuweisungen: string[] = [];
    jederKnoten(fn!, (n) => {
      if (!ts.isPropertyAssignment(n)) return;
      const name = ts.isIdentifier(n.name) ? n.name.text : "";
      if (name !== "sfv_team_id") return;
      zuweisungen.push(n.initializer.getText());
    });

    /* ⚠ Die leere Menge wäre grün und hätte nichts geprüft — dieselbe
       Falle, die in `check:plugin` viermal vorkam. Deshalb erst die
       Existenz, dann der Wert. */
    expect(zuweisungen, "kein sfv_team_id in bildeSpiel — umgebaut?")
      .toHaveLength(1);
    expect(zuweisungen[0]).toBe("unserId");
  });

  it("`unserId` ist die eigene Seite, nicht die des Gegners", () => {
    /* Die zweite Hälfte: `unserId` könnte umdefiniert werden, und dann
       wäre der Fall oben grün und die Bedeutung gedreht. */
    const quelle = baue("supabase/functions/sfv-sync/sync.ts").getFullText();
    expect(quelle).toContain("const unserId = unsA ? aId : bId;");
    expect(quelle).toContain("const gegnerId = unsA ? bId : aId;");
  });
});
