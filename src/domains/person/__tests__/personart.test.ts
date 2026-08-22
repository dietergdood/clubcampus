/* ═══════════════════════════════════════════════════════════════
   setzePersonart — „Art ändern" als Sammelaktion

   ⚠ DER FILTER STEHT AUF `ableitung IS NULL`, NICHT AUF EINEM NAMEN.
   Seit dem 22.08.2026 gibt es ZWEI abgeleitete Arten — „Elternteil"
   und „Ehemaliges Elternteil" —, und es können weitere dazukommen.
   Eine Prüfung gegen `name !== "Elternteil"` wäre beim zweiten schon
   falsch gewesen: sie hätte „Ehemaliges Elternteil" vergeben lassen,
   die Sicht hätte die Zeile ignoriert, und die Aktion hätte
   scheinbar funktioniert.

   Die Fälle nennen deshalb die Ableitung, nicht den Namen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb } from "../../members/__tests__/_mockSb.ts";
import { setzePersonart, bestimmendeArt } from "../personArtService.ts";

afterEach(() => vi.restoreAllMocks());

const GESETZT   = { id: "a-1", ableitung: null, aktiv: true };
const ABGELEITET = { id: "a-2", ableitung: "eltern_kinder", aktiv: true };
const EHEMALIG  = { id: "a-3", ableitung: "eltern_kinder_ehemalig", aktiv: true };

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

  it("⚠ weist 'Ehemaliges Elternteil' ebenso ab — die ZWEITE abgeleitete", async () => {
    /* DER FALL, DEN EIN NAMENSFILTER DURCHGELASSEN HAETTE. */
    const sb = makeSb({ "personenarten.select": { data: EHEMALIG } });
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
    /* Ein Gönner, dessen letztes Kind ausgetreten ist, trägt zwei Arten.
       Geführt wird er als Gönner (20 < 30) — das ist die Aussage, mit der
       der Verein etwas anfangen kann. */
    const arten = [
      { art_id: "a-3", name: "Ehemaliges Elternteil", sort_order: 30, ableitung: "eltern_kinder_ehemalig" },
      { art_id: "a-1", name: "Supporter", sort_order: 20, ableitung: null },
    ];
    expect(bestimmendeArt(arten)?.name).toBe("Supporter");
  });

  it("ohne Art ist es null — kein erfundener Ersatzwert", () => {
    expect(bestimmendeArt([])).toBeNull();
    expect(bestimmendeArt(null)).toBeNull();
  });
});
