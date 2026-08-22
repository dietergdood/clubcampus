/* ═══════════════════════════════════════════════════════════════
   Die gespeicherten Ansichten überstehen den Umzug

   ⚠ ECHTE DATEN, keine erfundenen. Die drei Ansichten unten sind am
   22.08.2026 aus `mitglieder_ansichten` gelesen — mit ihren echten
   Namen und ihren echten Spaltenlisten. Zwei davon sind geteilt,
   stehen also mehr als einer Person zur Verfügung.

   ⚠ WARUM DAS EIN EIGENER FALL IST, obwohl `memberConstants.test.ts`
   schon die 28 Schlüssel festhält: der Katalogtest deckt den
   UMBENENNUNGSFALL — er wird rot, wenn beim Umzug ein Schlüssel
   anders heisst. Dieser hier deckt den LADEFALL, und das ist der,
   bei dem der Nutzer den Verlust sieht.

   Die Mechanik dahinter, wörtlich aus `useListView.ts:353`:

       const COLS = visibleCols
         .map(k => colDefs.find(c => c.key === k))
         .filter((c): c is ColDef => !!c);

   Ein Schlüssel ohne Definition wird zu `undefined` und fällt aus
   dem `.filter()`. Kein Fehler, keine Meldung — die Spalte ist
   einfach weg, und die gespeicherte Ansicht sieht danach aus, als
   hätte der Nutzer sie so angelegt. Dasselbe in `ColMenu.tsx:34`.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { ALL_COLS } from "../memberConstants.ts";
import type { ColDef } from "../../../shared/list/types.ts";

/** Stand `mitglieder_ansichten` am 22.08.2026, typ = "mitglieder". */
const ANSICHTEN: { name: string; geteilt: boolean; spalten: string[] }[] = [
  { name: "Adressliste Global", geteilt: true, spalten:
    ["name","strasse","ort","telefon","email","mitgliedschaft","datenpruefung"] },
  { name: "Trainer & Funktionäre", geteilt: false, spalten:
    ["name","nachname","vorname","email","telefon","funktionen_gruppen","teams_rollen"] },
  { name: "Trainers", geteilt: true, spalten:
    ["name","nachname","vorname","email","telefon","funktionen_gruppen","teams_rollen"] },
];

/** Genau die Auflösung aus `useListView.ts:353`. */
function aufloesen(spalten: string[]): ColDef[] {
  return spalten
    .map(k => ALL_COLS.find(c => c.key === k))
    .filter((c): c is ColDef => !!c);
}

describe("gespeicherte Ansichten — der Ladefall", () => {
  for (const a of ANSICHTEN) {
    it(`⚠ '${a.name}' behält alle ${a.spalten.length} Spalten`, () => {
      /* Die Schlüssel nennen, nicht die Anzahl: `toHaveLength` bestünde
         auch, wenn zwei Spalten getauscht wären. */
      expect(aufloesen(a.spalten).map(c => c.key)).toEqual(a.spalten);
    });
  }

  it("⚠ zeigt, WIE der Verlust aussähe — ein unbekannter Schlüssel verschwindet stumm", () => {
    /* Der Gegenbeweis. Ohne diesen Fall wäre oben nur belegt, dass es
       gerade gut geht — nicht, dass die Prüfung überhaupt etwas merkt. */
    const mitTippfehler = ["name", "teams_rollenX", "email"];
    expect(aufloesen(mitTippfehler).map(c => c.key)).toEqual(["name", "email"]);
    /* Kein Wurf, kein null, keine Lücke im Ergebnis — die Spalte ist
       einfach nicht mehr da. Genau deshalb braucht es diese Datei. */
  });

  it("die geteilten Ansichten sind dieselben für alle — deshalb wiegen sie schwerer", () => {
    const geteilt = ANSICHTEN.filter(a => a.geteilt);
    expect(geteilt.map(a => a.name)).toEqual(["Adressliste Global", "Trainers"]);
    for (const a of geteilt) {
      expect(aufloesen(a.spalten)).toHaveLength(a.spalten.length);
    }
  });
});
