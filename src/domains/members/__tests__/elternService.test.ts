/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/elternService.test.ts
   Unit-Tests elternService: verein_id/mitglied_id beim Anlegen,
   Link-Logik (linkKind/unlinkKind), Hauptkontakt-Umschaltung.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import {
  insertElternkontakt, linkKind, unlinkKind, setHauptkontakt,
} from "../elternService.ts";

const BASIS = { vorname: "Erika", nachname: "Kontakt", name: "Erika Kontakt", email: "e@k.ch", verein_id: "verein-1" };

describe("insertElternkontakt", () => {
  it("schreibt mitglied_id und verein_id in den elternkontakte-Insert (hauptkontakt entfernt)", async () => {
    const sb = makeSb({ "elternkontakte.insert": { data: { id: "ek-1" }, error: null } });
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7, hauptkontakt: true } as any);

    const rec = sb.find("elternkontakte", "insert")!;
    expect(rec.payload).toEqual(expect.objectContaining({ vorname: "Erika", verein_id: "verein-1", mitglied_id: 7 }));
    // hauptkontakt ist keine elternkontakte-Spalte -> darf nicht im Insert stehen
    expect(rec.payload.hauptkontakt).toBeUndefined();
  });

  it("verknüpft via eltern_kinder mit verein_id, eltern_id (=Insert-id), mitglied_id und hauptkontakt; gibt null zurück", async () => {
    const sb = makeSb({ "elternkontakte.insert": { data: { id: "ek-1" }, error: null } });
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7, hauptkontakt: true } as any);

    expect(res).toBeNull();
    expect(sb.find("eltern_kinder", "insert")!.payload).toEqual({
      eltern_id: "ek-1", mitglied_id: 7, verein_id: "verein-1", hauptkontakt: true,
    });
  });

  it("hauptkontakt fällt auf false zurück, wenn nicht gesetzt", async () => {
    const sb = makeSb({ "elternkontakte.insert": { data: { id: "ek-1" }, error: null } });
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 } as any);
    expect(sb.find("eltern_kinder", "insert")!.payload.hauptkontakt).toBe(false);
  });

  it("bei Fehler im elternkontakte-Insert: gibt Fehler zurück, kein Link-Insert", async () => {
    const err = pgError("insert fail");
    const sb = makeSb({ "elternkontakte.insert": { data: null, error: err } });
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 } as any);
    expect(res).toBe(err);
    expect(sb.opsOn("eltern_kinder")).toHaveLength(0);
  });

  it("reicht einen Fehler beim Link-Insert durch", async () => {
    const linkErr = pgError("link fail");
    const sb = makeSb({
      "elternkontakte.insert": { data: { id: "ek-1" }, error: null },
      "eltern_kinder.insert": { error: linkErr },
    });
    expect(await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 } as any)).toBe(linkErr);
  });

  it("ohne mitglied_id (0) kein Link, gibt null zurück", async () => {
    const sb = makeSb({ "elternkontakte.insert": { data: { id: "ek-1" }, error: null } });
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 0 } as any);
    expect(res).toBeNull();
    expect(sb.opsOn("eltern_kinder")).toHaveLength(0);
  });
});

describe("linkKind", () => {
  it("upsert enthält verein_id und onConflict-Schlüssel", async () => {
    const sb = makeSb();
    await linkKind(sb as any, "e1", 7, "verein-1", true);
    const rec = sb.find("eltern_kinder", "upsert")!;
    expect(rec.payload).toEqual({ eltern_id: "e1", mitglied_id: 7, verein_id: "verein-1", hauptkontakt: true });
    expect(rec.upsertOptions).toEqual({ onConflict: "eltern_id,mitglied_id,verein_id" });
  });

  it("hauptkontakt default false", async () => {
    const sb = makeSb();
    await linkKind(sb as any, "e1", 7, "verein-1");
    expect(sb.find("eltern_kinder", "upsert")!.payload.hauptkontakt).toBe(false);
  });

  it("reicht den Fehler durch", async () => {
    const err = pgError();
    const sb = makeSb({ "eltern_kinder.upsert": { error: err } });
    expect(await linkKind(sb as any, "e1", 7, "verein-1")).toBe(err);
  });
});

describe("unlinkKind", () => {
  it("löscht die Verknüpfung (eltern_id + mitglied_id) und meldet verbleibende Kinder + Kind-Status", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 2 },
      "mitglieder.select": { data: { aktiv: true } },
    });
    const res = await unlinkKind(sb as any, "e1", 7);

    const del = sb.find("eltern_kinder", "delete")!;
    expect(del.filters).toEqual([
      { method: "eq", args: ["eltern_id", "e1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
    expect(res).toEqual({ verbleibendeKinder: 2, kindNochAktiv: true });
  });

  it("kindNochAktiv=false bei inaktivem Kind, verbleibendeKinder aus count", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 0 },
      "mitglieder.select": { data: { aktiv: false } },
    });
    expect(await unlinkKind(sb as any, "e1", 7)).toEqual({ verbleibendeKinder: 0, kindNochAktiv: false });
  });

  it("Kind nicht gefunden -> kindNochAktiv false; count null -> 0", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: null },
      "mitglieder.select": { data: null },
    });
    expect(await unlinkKind(sb as any, "e1", 7)).toEqual({ verbleibendeKinder: 0, kindNochAktiv: false });
  });
});

describe("setHauptkontakt", () => {
  it("setzt erst alle Kontakte des Kindes auf false, dann den Zielkontakt auf true", async () => {
    const sb = makeSb();
    await setHauptkontakt(sb as any, 7, "e1");

    const recs = sb.opsOn("eltern_kinder");
    expect(recs).toHaveLength(2);
    // 1) alle auf false, nur per mitglied_id gefiltert
    expect(recs[0].payload).toEqual({ hauptkontakt: false });
    expect(recs[0].filters).toEqual([{ method: "eq", args: ["mitglied_id", 7] }]);
    // 2) Zielkontakt auf true, per eltern_id + mitglied_id
    expect(recs[1].payload).toEqual({ hauptkontakt: true });
    expect(recs[1].filters).toEqual([
      { method: "eq", args: ["eltern_id", "e1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
  });
});
