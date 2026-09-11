/* ══════════════════════════════════════════════════════════════════════
   Die Fassung der Nutzlast — und die Felder, die sie beschreibt
   11.09.2026

   ⚠ ⚠  EINE REGEL, AN DIE JEMAND DENKEN MUSS, IST DIE SCHWÄCHSTE LÖSUNG.

   `NUTZLAST_FASSUNG` löst den Export aus, wenn sich die Nutzlast geändert
   hat — aber nur, wenn jemand sie hochzählt. **Genau dafür ist dieser
   Fall da:** ändert sich ein Feldname in `WpVerlaufZeile` oder
   `WpAufstellungZeile`, wird er rot und nennt beide Stellen.

   ⚠ Er prüft NICHT, ob die Fassung „richtig" ist — das kann er nicht.
   Er prüft, dass Feldliste und Fassung **zusammen** geändert werden.

   ── Warum die Felder hier noch einmal stehen ─────────────────────────

   Doppelt ist es nur scheinbar: die eine Liste ist der TYP (was der Code
   baut), die andere die ZUSICHERUNG (worauf die Gegenseite sich
   verlässt). Laufen sie auseinander, ist das der Befund — und ohne die
   zweite Liste gäbe es nichts, wogegen man halten könnte.

   **Dieselbe Bauart wie `icons.test.ts`:** der Quelltext wird gelesen,
   nicht der Code ausgeführt.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { baue, findeFunktion } from "../../../test-helpers/quelltext.ts";
import { NUTZLAST_FASSUNG } from "../wpNutzlast.ts";
import ts from "typescript";
import { readFileSync } from "node:fs";

const DATEI = "src/domains/spiele/wpNutzlast.ts";

/** Die Feldnamen eines exportierten Interfaces, in Reihenfolge. */
function felderVon(name: string): string[] {
  const baum = ts.createSourceFile(
    DATEI, readFileSync(DATEI, "utf8"), ts.ScriptTarget.Latest, true,
  );
  let raus: string[] = [];
  const lauf = (k: ts.Node) => {
    if (ts.isInterfaceDeclaration(k) && k.name.text === name) {
      raus = k.members
        .filter(ts.isPropertySignature)
        .map((m) => (m.name as ts.Identifier).text);
    }
    ts.forEachChild(k, lauf);
  };
  lauf(baum);
  return raus;
}

describe("NUTZLAST_FASSUNG hält mit den Feldern Schritt", () => {
  /* ⚠ ⚠  WER HIER ETWAS ÄNDERT, ÄNDERT `NUTZLAST_FASSUNG` MIT.
     Sonst merkt der Export nicht, dass es etwas Neues zu senden gibt —
     dreimal passiert: `liga`, `aufstellung`, und die drei
     Verlaufsfelder am 11.09.2026. */
  const VERLAUF_FASSUNG_3 = [
    "minute", "nummer", "ereignis_zusatz", "art", "seite", "text",
    "stand", "klub", "sfv_person_id", "ein_nummer",
  ];

  const AUFSTELLUNG_FASSUNG_3 = [
    "seite", "sfv_person_id", "nummer", "spieler", "position", "rolle",
    "ist_captain", "von_minute", "bis_minute", "spielzeit", "marken",
  ];

  it("⚠⚠ WpVerlaufZeile trägt genau die Felder der Fassung 3", () => {
    expect(felderVon("WpVerlaufZeile")).toEqual(VERLAUF_FASSUNG_3);
  });

  it("⚠⚠ WpAufstellungZeile trägt genau die Felder der Fassung 3", () => {
    expect(felderVon("WpAufstellungZeile")).toEqual(AUFSTELLUNG_FASSUNG_3);
  });

  it("die Fassung steht auf 3", () => {
    /* Der zweite Anker: wer die Listen oben anpasst und die Zahl
       vergisst, wird hier rot. Beide Fälle zusammen erzwingen, dass
       Feldliste und Fassung gemeinsam wandern. */
    expect(NUTZLAST_FASSUNG).toBe(3);
  });

  it("die Konstante steht in derselben Datei wie die Felder", () => {
    /* ⚠ Sie gehört neben das, was sie beschreibt. Zöge jemand sie in eine
       eigene Datei, stünde sie nicht mehr im selben Commit wie die
       Feldänderung — und genau das ist ihr einziger Schutz. */
    const quelle = readFileSync(DATEI, "utf8");
    expect(quelle).toContain("export const NUTZLAST_FASSUNG");
  });

  it("die Fassung ist eine Zahl und wächst nur", () => {
    /* Kein Datum, kein Hash: eine Zahl lässt sich vergleichen („ist die
       gespeicherte kleiner?"), und genau das tut die Function. */
    expect(Number.isInteger(NUTZLAST_FASSUNG)).toBe(true);
    expect(NUTZLAST_FASSUNG).toBeGreaterThan(0);
  });

  it("der Quelltextleser findet überhaupt etwas", () => {
    /* ⚠ Die Positivkontrolle der Prüfung selbst: ohne sie wäre ein
       kaputter Leser grün, weil zwei leere Listen gleich sind. Genau
       dieser Fall ist am 10.09.2026 in `check:plugin` aufgetreten. */
    expect(felderVon("WpVerlaufZeile").length).toBeGreaterThan(5);
    expect(felderVon("GibtEsNicht")).toEqual([]);
    expect(baue).toBeTypeOf("function");
    expect(findeFunktion).toBeTypeOf("function");
  });
});
