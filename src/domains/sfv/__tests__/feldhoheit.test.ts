/* ══════════════════════════════════════════════════════════════════════
   Die Feldhoheit meldet BEIDE Richtungen (11.09.2026)

   ⚠ ANLASS. `sfv_runde` und `sfv_runde_nr` wurden angelegt, vom Sync
   berechnet — und standen nach einem vollen Lauf bei allen 270 Spielen
   auf NULL. Nicht weil der Verband sie nicht liefert, sondern weil
   `sync_felder` sie nicht nannte und `schneideAufFeldhoheit()` sie
   wortlos wegschnitt.

   Die Funktion hatte eine Prüfung — aber nur in EINE Richtung:

     `fehlend`       in sync_felder genannt, nicht berechnet    ✅ gemeldet
     `nicht_erlaubt` berechnet, nicht in sync_felder            ❌ still

   ⚠ Und die stille Richtung ist die gefährlichere: sie sieht von aussen
   aus wie eine Datenlage. „Der Verband liefert die Runde nicht" war die
   naheliegende Erklärung, und sie hätte fast zu einer Rückfrage beim
   Verband geführt.

   Dieselbe Familie wie eine leere Liste aus einer gescheiterten Abfrage:
   **es fehlt etwas, und nichts meldet es.**
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { schneideAufFeldhoheit } from "../feldhoheit.ts";

const BERECHNET = {
  date: "2026-08-23", gegner: "FC Uster", liga: "4. Liga",
  sfv_gruppe: "Gruppe  2", sfv_runde: "1. Runde", sfv_runde_nr: 1,
};

describe("schneideAufFeldhoheit", () => {
  it("nimmt genau die erlaubten Spalten", () => {
    const { zeile } = schneideAufFeldhoheit(["date", "gegner"], BERECHNET);
    expect(Object.keys(zeile).sort()).toEqual(["date", "gegner"]);
  });

  it("meldet Spalten, die genannt aber nicht berechnet sind", () => {
    const { fehlend } = schneideAufFeldhoheit(["date", "treffpunkt"], BERECHNET);
    expect(fehlend).toEqual(["treffpunkt"]);
  });

  it("⚠ MELDET AUCH DIE GEGENRICHTUNG — der Fall vom 11.09.2026", () => {
    /* Ohne diese Zeile schneidet die Funktion `sfv_runde` weg und sagt
       nichts. In der Datenbank steht dann NULL, und von aussen sieht es
       aus, als liefere der Verband nichts. */
    const { nicht_erlaubt } = schneideAufFeldhoheit(["date", "gegner", "liga"], BERECHNET);
    expect(nicht_erlaubt.sort()).toEqual(["sfv_gruppe", "sfv_runde", "sfv_runde_nr"]);
  });

  it("schweigt, wenn die Liste vollständig ist", () => {
    const { fehlend, nicht_erlaubt } = schneideAufFeldhoheit(Object.keys(BERECHNET), BERECHNET);
    expect(fehlend).toEqual([]);
    expect(nicht_erlaubt).toEqual([]);
  });

  it("⚠ ein Wert null ist NICHT dasselbe wie ein fehlendes Feld", () => {
    /* `sfv_runde: null` heisst „der Verband nennt keine Runde" und gehört
       geschrieben. Nur ein Feld, das die Zeile gar nicht führt, ist eine
       Lücke in der Liste. Wer hier auf Wahrheitswert prüft statt auf
       Vorhandensein, macht aus jedem leeren Wert einen Befund. */
    const { zeile, fehlend } = schneideAufFeldhoheit(["sfv_runde"], { sfv_runde: null });
    expect(fehlend).toEqual([]);
    expect(zeile).toEqual({ sfv_runde: null });
  });
});
