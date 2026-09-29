/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  BERECHNET, GELIEFERT — UND GEZEIGT
   29.09.2026

   ANLASS: die drei Zähler `wechsel_eigen`, `wechsel_beide_nummern` und
   `wechsel_nummer_vom_verband` waren gebaut, standen in der Antwort der
   Probe, waren durch Testfälle gedeckt — und **`deuteVorschau()` zeigte
   keinen davon.** Wer „Vorschau" drückte, sah sie nicht.

   Es ist der neunte Fall derselben Familie an zwei Tagen. Und gegen ihn
   gibt es kein Werkzeug: ein Wert, der berechnet und nicht gezeigt wird,
   ist in keiner Hinsicht defekt — richtiger Typ, richtige Zahl, grüner
   Test, erklärender Kommentar. Es fehlt nur der Leser.

   > Gefunden hat ihn eine Frage von aussen, keine Prüfung.

   ⚠ ⚠  DESHALB DIESER FALL. Er prüft nicht, dass die Zahl RICHTIG ist —
   das tun die Fälle in `wpNutzlast.test.ts`. Er prüft, dass sie **an der
   Oberfläche ankommt**, also das eine Glied, das keine der anderen
   Prüfungen ansieht.

   ⚠ Über den Quelltext, nicht über einen Lauf: `deuteVorschau()` steht
   innerhalb der Komponente in `ApiTab.tsx` und ist nicht aufrufbar. Ein
   Strukturtest ist hier das Einzige, was die Zusage tragen kann — und
   er ist besser als der Kommentar, der sonst allein dastünde.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const TAB = "src/modules/portal/ApiTab.tsx";

/** Der Rumpf von `deuteVorschau()` — von seiner Zeile bis zum nächsten
    `function` auf derselben Einrückungstiefe. */
function deutungsRumpf(): string {
  const quelle = readFileSync(TAB, "utf8");
  const start = quelle.indexOf("function deuteVorschau");
  expect(start, "deuteVorschau() gibt es nicht mehr in " + TAB)
    .toBeGreaterThan(-1);
  /* Bis zur naechsten Funktion derselben Ebene — grob, aber es genuegt:
     gesucht wird die Anwesenheit von Schluesselnamen, nicht Syntax. */
  const rest = quelle.slice(start + 1);
  const ende = rest.indexOf("\n  function ");
  return ende > 0 ? rest.slice(0, ende) : rest;
}

describe("⚠⚠ die Wechselnummern-Quote wird in der Vorschau GEZEIGT", () => {
  /* ⚠ Genau die drei, die der Auftraggeber am 29.09.2026 gemeldet haben
     wollte — plus `hergeleitet`, weil `vom_verband` ohne sie nur die
     halbe Herkunft ist. */
  const PFLICHT = [
    "wechsel_eigen",
    "wechsel_beide_nummern",
    "wechsel_nummer_vom_verband",
    "wechsel_nummer_hergeleitet",
  ];

  it("nennt alle vier Schlüssel", () => {
    const rumpf = deutungsRumpf();
    const fehlt = PFLICHT.filter((k) => !rumpf.includes(k));
    expect(fehlt, "deuteVorschau() zeigt diese Zähler nicht — sie werden "
      + "berechnet, gesendet und von niemandem gelesen").toEqual([]);
  });

  it("⚠ die Bezugsgrösse steht in DERSELBEN Zeile wie die Trefferzahl", () => {
    /* Eine Zahl ohne Bezugsgroesse ist ein Artefakt, und eine, die erst
       durch die naechste Zeile richtig wird, kommt zu spaet. */
    const zeile = deutungsRumpf().split("\n")
      .find((z) => z.includes("wechsel_beide_nummern"));
    expect(zeile, "keine Zeile nennt wechsel_beide_nummern").toBeTruthy();
    expect(zeile, "die Trefferzahl steht ohne ihre Bezugsgrösse da")
      .toContain("wechsel_eigen");
  });

  it("⚠⚠ null von null wird als «nichts zu messen» gesagt, nicht als Quote", () => {
    /* Ohne eine einzige eigene Wechselzeile sagt „0 von 0" nichts ueber
       die Kette. Eine Null, die wie ein Befund aussieht, ist teurer als
       ein Satz — dieselbe Trennung wie bei `halbzeit_nicht_pruefbar`. */
    const rumpf = deutungsRumpf();
    expect(rumpf, 'der Fall „keine eigene Wechselzeile" wird nicht getrennt')
      .toMatch(/wechsel_eigen"\s*\)\s*===\s*0/);
  });

  it("die Aufteilung wird gegengerechnet, nicht behauptet", () => {
    /* Gehen die acht Gruende nicht auf, misst eine der Stellen etwas
       anderes als die andere. Eine Aufteilung, die aufgehen MUSS, prueft
       sich selbst — eine einzelne Zahl kann nur behauptet werden. */
    const rumpf = deutungsRumpf();
    for (const k of ["wechsel_nummer_ohne_person", "wechsel_nummer_kollision",
      "wechsel_nummer_mehrdeutig", "wechsel_nummer_ohne_zeile"]) {
      expect(rumpf, `${k} fehlt in der Gegenprobe der Aufteilung`)
        .toContain(k);
    }
  });

  it("der Quelltextleser findet überhaupt etwas", () => {
    /* ⚠ Die Positivkontrolle: ohne sie waere ein kaputter Leser gruen,
       weil ein leerer Rumpf keine verbotenen Namen enthaelt. Genau dieser
       Fall ist am 10.09.2026 in `check:plugin` aufgetreten. */
    const rumpf = deutungsRumpf();
    expect(rumpf.length).toBeGreaterThan(200);
    expect(rumpf).toContain("zeilen");
  });
});
