/* ═══════════════════════════════════════════════════════════════
   setzePersonart — „Art ändern" als Sammelaktion

   ⚠ DER FILTER STEHT AUF `ableitung IS NULL`, NICHT AUF EINEM NAMEN.

   ⚠ DAS BEISPIEL IST SEIT DEM 22.08.2026 HYPOTHETISCH — die Regel
   nicht. An jenem Tag existierte für einen halben Tag eine zweite
   abgeleitete Art („Ehemaliges Elternteil"); sie ist am selben Abend
   zurückgebaut worden, weil der Austritt die Art SETZT statt sie
   abzuleiten. Heute gibt es wieder genau eine.

   Der Beleg steht trotzdem hier, und zwar absichtlich: ein Filter
   `name !== "Elternteil"` hätte die zweite durchgelassen, die Zeile
   wäre geschrieben worden, die Sicht hätte sie ignoriert — und die
   Aktion hätte SCHEINBAR funktioniert. Kein Fehler, keine Meldung.

   Ohne diesen Beleg wäre die Regel eine Vorsichtsmassnahme ohne
   Anlass, und der Nächste hielte sie für Umständlichkeit und
   vereinfachte sie weg. Der Fall `a-3` unten trägt deshalb einen
   erfundenen Ableitungswert: er prüft, dass JEDE Ableitung abgewiesen
   wird, nicht die eine, die es gerade gibt. Damit ist er strenger als
   vorher.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb } from "../../members/__tests__/_mockSb.ts";
import { setzePersonart, bestimmendeArt } from "../personArtService.ts";

afterEach(() => vi.restoreAllMocks());

const GESETZT   = { id: "a-1", ableitung: null, aktiv: true };
const ABGELEITET = { id: "a-2", ableitung: "eltern_kinder", aktiv: true };
/* ⚠ Erfunden, und das ist der Punkt: `ableitung` ist heute per CHECK auf
   NULL oder 'eltern_kinder' begrenzt. Der Fall prüft die REGEL („jede
   Ableitung wird abgewiesen"), nicht den einen Wert, den es gerade gibt. */
const ANDERE_ABLEITUNG = { id: "a-3", ableitung: "irgendeine_kuenftige_regel", aktiv: true };

describe("setzePersonart — nur gesetzte Arten", () => {
  it("setzt eine gesetzte Art für mehrere Personen", async () => {
    const sb = makeSb({
      "personenarten.select": { data: GESETZT },
    });
    const fehler = await setzePersonart(sb as never, ["p-1", "p-2"], "a-1", "v-1");
    expect(fehler).toBeNull();
    const rec = sb.find("personenart_pro_person", "upsert")!;
    expect(rec.payload).toEqual([
      { verein_id: "v-1", person_id: "p-1", art_id: "a-1" },
      { verein_id: "v-1", person_id: "p-2", art_id: "a-1" },
    ]);
  });

  it("⚠ weist 'Elternteil' ab — abgeleitet", async () => {
    const sb = makeSb({ "personenarten.select": { data: ABGELEITET } });
    const fehler = await setzePersonart(sb as never, ["p-1"], "a-2", "v-1");
    expect(fehler).toContain("Abgeleitete");
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
  });

  it("⚠ weist JEDE andere Ableitung ebenso ab — nicht nur die bekannte", async () => {
    /* DER FALL, DEN EIN NAMENSFILTER DURCHGELASSEN HAETTE. Am 22.08.2026
       gab es dafuer einen halben Tag lang ein echtes Beispiel; heute ist
       der Wert erfunden, und der Fall damit strenger. */
    const sb = makeSb({ "personenarten.select": { data: ANDERE_ABLEITUNG } });
    const fehler = await setzePersonart(sb as never, ["p-1"], "a-3", "v-1");
    expect(fehler).toContain("Abgeleitete");
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
  });

  it("weist eine abgeschaltete Art ab", async () => {
    const sb = makeSb({ "personenarten.select": { data: { ...GESETZT, aktiv: false } } });
    expect(await setzePersonart(sb as never, ["p-1"], "a-1", "v-1")).toContain("abgeschaltet");
  });

  it("⚠ ändern heisst ändern: die bisherigen gesetzten Arten fallen weg", async () => {
    const sb = makeSb({ "personenarten.select": { data: GESETZT } });
    await setzePersonart(sb as never, ["p-1"], "a-1", "v-1");
    const del = sb.opsOn("personenart_pro_person").find(r => r.op === "delete");
    expect(del).toBeTruthy();
    /* Die Filter nennen: ein `delete` ohne `verein_id` traefe bei einem
       zweiten Verein fremde Zeilen, und ohne `person_id` alle. */
    const inFilter = del!.filters.filter(f => f.method === "in").map(f => f.args[0]);
    expect(inFilter).toContain("person_id");
    const eqFilter = del!.filters.filter(f => f.method === "eq").map(f => f.args[0]);
    expect(eqFilter).toContain("verein_id");
  });

  it("ohne Auswahl passiert nichts", async () => {
    const sb = makeSb({});
    expect(await setzePersonart(sb as never, [], "a-1", "v-1")).toBe("Keine Auswahl");
    expect(sb.calls).toHaveLength(0);
  });
});

describe("bestimmendeArt — die kleinste sort_order gewinnt", () => {
  it("⚠ eine Art gewinnt, nicht die Vereinigung aller", async () => {
    /* Ein Supporter, der noch ein Kind im Verein hat, trägt zwei Arten:
       „Supporter" gesetzt und „Elternteil" abgeleitet. Geführt wird er als
       Elternteil (10 < 20) — das ist die Aussage, mit der der Verein etwas
       anfangen kann, und sie kippt von selbst, wenn das Kind austritt. */
    const arten = [
      { art_id: "a-2", name: "Elternteil", sort_order: 10, ableitung: "eltern_kinder" },
      { art_id: "a-1", name: "Supporter", sort_order: 20, ableitung: null },
    ];
    expect(bestimmendeArt(arten)?.name).toBe("Elternteil");
  });

  it("ohne Art ist es null — kein erfundener Ersatzwert", () => {
    expect(bestimmendeArt([])).toBeNull();
    expect(bestimmendeArt(null)).toBeNull();
  });
});
