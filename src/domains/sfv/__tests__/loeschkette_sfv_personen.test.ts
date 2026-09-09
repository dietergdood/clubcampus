/* ══════════════════════════════════════════════════════════════════════
   Eine DSGVO-Löschung nimmt den SFV-Namen mit (10.09.2026)

   ⚠ ANLASS. `sfv_personen` hängt an keiner `mitglied_id` und kaskadiert
   deshalb nicht. Bliebe die Zeile stehen, erschiene die gelöschte Person
   beim nächsten Website-Export wieder — nur in der Schreibweise des
   Verbands statt in unserer.

   > Eine Löschung, die den Namen wieder sichtbar macht, ist das Gegenteil
   > dessen, was sie soll.

   ⚠ WARUM ALS STRUKTURPRÜFUNG UND NICHT ALS LAUF. Die Löschkette ist eine
   Edge Function mit `esm.sh`-Importen; sie lässt sich von hier weder
   ausführen noch typprüfen. Was prüfbar bleibt, ist ihr Quelltext — und
   die Zusage, die das Produkt braucht, ist eine über den QUELLTEXT:
   *irgendwo in dieser Kette wird `sfv_personen` gelöscht, und zwar bevor
   die Mitgliedschaften fallen.*

   ⚠ ÜBER DEN SYNTAXBAUM, NICHT ÜBER EINEN REGEX. `.eq("mitglied_id", …)`
   steht in derselben Datei mehrfach und meint jedes Mal etwas anderes —
   ein Textmuster träfe, was gleich AUSSIEHT, nicht was gleich GEMEINT ist.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { baue, jederKnoten, kette, zeileVon } from "../../../test-helpers/quelltext.ts";

const DATEI = "supabase/functions/person-loeschen/index.ts";

/** Jede `db.from("X").…delete()`-Kette der Datei, mit ihrer Zeile. */
function loeschStellen(quelle?: string): Array<{ tabelle: string; zeile: number }> {
  const baum = baue(DATEI, quelle);
  const fund: Array<{ tabelle: string; zeile: number }> = [];
  jederKnoten(baum, (n) => {
    if (!ts.isCallExpression(n)) return;
    const g = kette(n);
    if (!g.some((x) => x.name === "delete")) return;
    const von = g.find((x) => x.name === "from");
    if (!von || !von.texte[0]) return;
    fund.push({ tabelle: von.texte[0], zeile: zeileVon(n) });
  });
  return fund;
}

describe("person-loeschen — der SFV-Name fällt mit", () => {
  const stellen = loeschStellen();

  it("löscht überhaupt aus sfv_personen", () => {
    expect(stellen.map((s) => s.tabelle)).toContain("sfv_personen");
  });

  it("⚠ und zwar VOR den Mitgliedschaften", () => {
    /* Die Reihenfolge ist die ganze Sache: `sfv_zuordnung` kaskadiert mit
       `mitglieder`. Ist sie erst weg, gibt es keinen Weg mehr von dieser
       Person zu ihrer SFV-Personennummer — und die Namenszeile bliebe für
       immer stehen, ohne dass etwas fehlschlägt. */
    const namen = stellen.find((s) => s.tabelle === "sfv_personen");
    const mitgl = stellen.find((s) => s.tabelle === "mitglieder");
    expect(namen).toBeDefined();
    expect(mitgl).toBeDefined();
    expect(namen!.zeile).toBeLessThan(mitgl!.zeile);
  });

  /* ── Positivkontrollen ────────────────────────────────────────────────
     Eine Prüfung, die nie rot war, ist keine Prüfung, sondern eine
     Behauptung. Beide Fälle unten sind der Defekt, gegen den die zwei
     Fälle oben stehen — je einmal ausgeschrieben. */
  it("Positivkontrolle: ohne die Löschung ist sie rot", () => {
    const ohne = `
      const db = null as any;
      await db.from("mitglieder").delete().eq("person_id", personId);
    `;
    expect(loeschStellen(ohne).map((s) => s.tabelle)).not.toContain("sfv_personen");
  });

  it("Positivkontrolle: in der falschen Reihenfolge ist sie rot", () => {
    const verkehrt = `
      const db = null as any;
      await db.from("mitglieder").delete().eq("person_id", personId);
      await db.from("sfv_personen").delete().in("sfv_person_id", ids);
    `;
    const s = loeschStellen(verkehrt);
    const namen = s.find((x) => x.tabelle === "sfv_personen")!;
    const mitgl = s.find((x) => x.tabelle === "mitglieder")!;
    expect(namen.zeile).toBeGreaterThan(mitgl.zeile);
  });
});

describe("person-loeschen — die Vorschau nennt sie", () => {
  it("führt sfv_personen in der Liste der fallenden Tabellen", () => {
    /* ⚠ Nicht nur löschen, sondern es auch ANKÜNDIGEN. Der
       Bestätigungsdialog ist die einzige Stelle, an der jemand sieht, was
       eine unwiderrufliche Aktion anfasst — was dort fehlt, geschieht
       ungesehen. */
    const roh = baue(DATEI).getFullText();
    expect(roh).toContain('"sfv_personen"');
  });
});
