/* ═══════════════════════════════════════════════════════════════
   suchePersonen — die Dublettenprüfung bei der Neuanlage

   „Mitglied anlegen prüft nicht auf Dubletten" stand seit Monaten
   unter den bekannten Defekten. Der Kern der Lösung ist eine
   Unterlassung: die Suche schliesst NICHTS aus. Ein stiller Filter
   liess am 05.08.2026 in `sucheElternkontakte` den gesuchten
   Adrian Kaiser verschwinden — und wer seinen Treffer nicht sieht,
   legt ihn neu an.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import { suchePersonen } from "../supporterService.ts";

const person = (over: Record<string, unknown> = {}) => ({
  id: "p-1", vorname: "Adrian", nachname: "Kaiser", email: "a@k.ch",
  mitglieder: [], eltern_kinder: [], ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("suchePersonen", () => {
  it("⚠ zeigt auch, wer schon Mitglied ist — mit Hinweis statt Ausschluss", async () => {
    const sb = makeSb({ "personen.select": { data: [
      person({ id: "p-1", mitglieder: [{ id: 1, aktiv: true, mitgliedtyp: "Aktivmitglied" }] }),
    ] } });
    const [t] = await suchePersonen(sb as never, "v-1", "Kaiser");
    expect(t.hatAktiveMitgliedschaft).toBe(true);
    expect(t.mitgliedtyp).toBe("Aktivmitglied");
  });

  it("eine BEENDETE Mitgliedschaft macht die Person wieder zum Kandidaten", async () => {
    /* Ein früheres Mitglied, das zurückkommt, bekommt eine Mitgliedschaft
       dazu — keine zweite Person. */
    const sb = makeSb({ "personen.select": { data: [
      person({ mitglieder: [{ id: 1, aktiv: false, mitgliedtyp: "Aktivmitglied" }] }),
    ] } });
    const [t] = await suchePersonen(sb as never, "v-1", "Kaiser");
    expect(t.hatAktiveMitgliedschaft).toBe(false);
    expect(t.mitgliedtyp).toBeNull();
  });

  it("zählt die Kinder — ein Elternteil ist ein häufiger Dublettenfall", async () => {
    const sb = makeSb({ "personen.select": { data: [
      person({ eltern_kinder: [{ mitglied_id: 1 }, { mitglied_id: 2 }] }),
    ] } });
    const [t] = await suchePersonen(sb as never, "v-1", "Kaiser");
    expect(t.kinder).toBe(2);
  });

  it("jedes Wort muss treffen — Reihenfolge egal", async () => {
    /* Mehrere .or()-Aufrufe verknüpft PostgREST mit UND. „kaiser adrian“
       und „adrian kaiser“ finden dieselbe Person. */
    const sb = makeSb({ "personen.select": { data: [] } });
    await suchePersonen(sb as never, "v-1", "kaiser adrian");
    const ors = sb.find("personen", "select")!.filters.filter(f => f.method === "or");
    expect(ors).toHaveLength(2);
    expect(ors[0].args[0]).toContain("kaiser");
    expect(ors[1].args[0]).toContain("adrian");
  });

  it("unter zwei Zeichen wird gar nicht gesucht", async () => {
    const sb = makeSb();
    expect(await suchePersonen(sb as never, "v-1", "a")).toEqual([]);
    expect(sb.opsOn("personen")).toHaveLength(0);
  });

  it("ein Fehler ist keine leere Trefferliste", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.select": { data: null, error: pgError("boom", "42501") } });
    expect(await suchePersonen(sb as never, "v-1", "Kaiser")).toEqual([]);
    expect(spy).toHaveBeenCalled();
  });
});
