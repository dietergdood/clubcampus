/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberService.errors.test.ts
   Unit-Tests memberService — Teil 2: Fehlerpfade / Write-Vertrag.
   Reine Write-Funktionen geben PostgrestError | null zurück; die
   zweistufigen Portal-Operationen brechen beim ersten Fehler ab.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSb, pgError, type SbOp, type MockSb } from "./_mockSb.ts";
import {
  deleteMitglied, archiviereMitglied, reaktiviereMitglied,
  upsertKader, updateKader, deaktiviereKader,
  updateBenutzer, insertNotiz, updateNotiz, deleteNotiz, deleteAnsicht,
  portalZugangAktivieren, portalZugangDeaktivieren, updateMitglied,
} from "../memberService.ts";

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { errSpy.mockRestore(); });

/* Write-Funktionen mit einheitlichem Vertrag PostgrestError | null. */
const CONTRACT: Array<{ name: string; table: string; op: SbOp; call: (sb: MockSb) => Promise<unknown> }> = [
  { name: "deleteMitglied",     table: "mitglieder",           op: "delete", call: sb => deleteMitglied(sb as any, 1) },
  { name: "archiviereMitglied", table: "mitglieder",           op: "update", call: sb => archiviereMitglied(sb as any, 1, "Admin") },
  { name: "reaktiviereMitglied",table: "mitglieder",           op: "update", call: sb => reaktiviereMitglied(sb as any, 1) },
  { name: "upsertKader",        table: "kader",                op: "upsert", call: sb => upsertKader(sb as any, { mitglied_id: 1, team_id: 2, saison: "2026" } as any) },
  { name: "updateKader",        table: "kader",                op: "update", call: sb => updateKader(sb as any, 1, { rollen: ["x"] } as any) },
  { name: "deaktiviereKader",   table: "kader",                op: "update", call: sb => deaktiviereKader(sb as any, 1) },
  { name: "updateBenutzer",     table: "benutzer",             op: "update", call: sb => updateBenutzer(sb as any, "u1", { role: "trainer" } as any) },
  { name: "insertNotiz",        table: "mitglieder_notizen",   op: "insert", call: sb => insertNotiz(sb as any, { mitglied_id: 1, text: "x" } as any, "v") },
  { name: "updateNotiz",        table: "mitglieder_notizen",   op: "update", call: sb => updateNotiz(sb as any, 1, "neu") },
  { name: "deleteNotiz",        table: "mitglieder_notizen",   op: "delete", call: sb => deleteNotiz(sb as any, 1) },
  { name: "deleteAnsicht",      table: "mitglieder_ansichten", op: "delete", call: sb => deleteAnsicht(sb as any, "a1") },
];

describe("memberService — Write-Vertrag (PostgrestError | null)", () => {
  it.each(CONTRACT)("$name reicht den PostgrestError durch", async ({ table, op, call }) => {
    const err = pgError();
    const sb = makeSb({ [`${table}.${op}`]: { error: err } });
    expect(await call(sb)).toBe(err);
  });

  it.each(CONTRACT)("$name gibt bei Erfolg null zurück", async ({ call }) => {
    const sb = makeSb(); // Default: error null
    expect(await call(sb)).toBeNull();
  });
});

describe("memberService — Payload-Details", () => {
  it("archiviereMitglied schreibt aktiv:false + Deaktiviert-Felder, akzeptiert ein Array", async () => {
    const sb = makeSb();
    await archiviereMitglied(sb as any, [1, 2, 3], "Admin");
    const rec = sb.find("mitglieder", "update")!;
    expect(rec.payload).toEqual(expect.objectContaining({ aktiv: false, deaktiviert_von: "Admin" }));
    expect(rec.payload.deaktiviert_am).toEqual(expect.any(String));
    const inFilter = rec.filters.find(f => f.method === "in");
    expect(inFilter!.args).toEqual(["id", [1, 2, 3]]);
  });

  it("archiviereMitglied wandelt eine einzelne id in ein Array", async () => {
    const sb = makeSb();
    await archiviereMitglied(sb as any, 7, null);
    const inFilter = sb.find("mitglieder", "update")!.filters.find(f => f.method === "in");
    expect(inFilter!.args).toEqual(["id", [7]]);
  });

  it("upsertKader setzt onConflict", async () => {
    const sb = makeSb();
    await upsertKader(sb as any, { mitglied_id: 1, team_id: 2, saison: "2026" } as any);
    expect(sb.find("kader", "upsert")!.upsertOptions).toEqual({ onConflict: "mitglied_id,team_id,saison" });
  });
});

describe("portalZugangAktivieren", () => {
  it("fasst `mitglieder` nicht mehr an", async () => {
    /* Der Zugang haengt seit Etappe 6c allein an benutzer.mitglied_id; das
       Kennzeichen mitglieder.hat_portal_zugang war eine Kopie derselben
       Aussage und konnte veralten. */
    const sb = makeSb();
    await portalZugangAktivieren(sb as any, 1, "u1", "trainer");
    expect(sb.opsOn("mitglieder")).toHaveLength(0);
  });

  it("gibt den Fehler des Updates zurück", async () => {
    const e2 = pgError("benutzer");
    const sb = makeSb({ "benutzer.update": { error: e2 } });
    expect(await portalZugangAktivieren(sb as any, 1, "u1", "trainer")).toBe(e2);
  });

  it("verknüpft Konto und Mitglied und setzt die Rolle", async () => {
    const sb = makeSb();
    const res = await portalZugangAktivieren(sb as any, 5, "u1", "trainer");
    expect(res).toBeNull();
    expect(sb.find("benutzer", "update")!.payload).toEqual({ mitglied_id: 5, role: "trainer" });
  });
});

describe("portalZugangDeaktivieren", () => {
  it("gibt den Fehler zurück und fasst `mitglieder` nicht an", async () => {
    const e1 = pgError();
    const sb = makeSb({ "benutzer.update": { error: e1 } });
    expect(await portalZugangDeaktivieren(sb as any, "p-1")).toBe(e1);
    expect(sb.opsOn("mitglieder")).toHaveLength(0);
  });

  it("löst die Verknüpfung am Konto", async () => {
    const sb = makeSb();
    const res = await portalZugangDeaktivieren(sb as any, "p-5");
    expect(res).toBeNull();
    expect(sb.find("benutzer", "update")!.payload).toEqual({ mitglied_id: null });
    const eq = sb.find("benutzer", "update")!.filters.find(f => f.method === "eq");
    /* ⚠ Seit dem 21.08.2026 ueber person_id. Ueber `mitglied_id` traf die
       Abfrage beim Supporter NICHTS: dort steht seit dem Rueckbau vom 20.08.
       null, und der Portal-Tab zeigte „kein Zugang" — ohne Fehler. */
    expect(eq!.args).toEqual(["person_id", "p-5"]);
  });
});

describe("updateMitglied — boolean-Vertrag", () => {
  it("schreibt ein Personenfeld nach personen", async () => {
    /* ⚠ Hier stand bis zum 21.08.2026 die Erwartung, `vorname` lande in
       `mitglieder`. Das war der Altspalten-Ausweichpfad — und die Spalte gibt
       es seit Etappe 6a nicht mehr. Gruen war der Test nur, weil die Attrappe
       kein Schema kennt: sie nimmt jede Spalte entgegen, auch eine, die in
       der Datenbank einen Laufzeitfehler ergaebe. */
    const sb = makeSb({ "mitglieder.select": { data: { person_id: "p-1" } } });
    const ok = await updateMitglied(sb as any, 5, { vorname: "Neu" } as any);
    expect(ok).toBe(true);
    const rec = sb.find("personen", "update")!;
    expect(rec.payload).toEqual(expect.objectContaining({ vorname: "Neu" }));
    expect(rec.payload.updated_at).toEqual(expect.any(String));
    /* Nach `mitglieder` geht dabei nichts — es war kein Mitgliedschaftsfeld dabei. */
    expect(sb.opsOn("mitglieder").filter(o => o.op === "update")).toHaveLength(0);
  });

  it("schreibt ein Mitgliedschaftsfeld nach mitglieder", async () => {
    const sb = makeSb();
    const ok = await updateMitglied(sb as any, 5, { mitgliedtyp: "Aktivmitglied" } as any);
    expect(ok).toBe(true);
    const rec = sb.find("mitglieder", "update")!;
    expect(rec.payload).toEqual(expect.objectContaining({ mitgliedtyp: "Aktivmitglied" }));
  });

  it("⚠ ist die Mitgliedschaft nicht lesbar, wird NICHTS geschrieben", async () => {
    /* Der Fall entsteht unter RLS: ein Elternteil sah `mitglieder` bis zum
       21.08.2026 gar nicht, und die Abfrage kam leer zurueck — OHNE Fehler.
       Frueher schloss der Code daraus „Mitglied ohne Person" und schrieb in
       die Altspalten. `mitglieder.person_id` ist aber NOT NULL, und in der
       Datenbank steht keine einzige Zeile mit NULL: der Fall kann gar nicht
       eintreten, die Diagnose war also immer falsch. */
    const sb = makeSb();   // keine mitglieder.select-Antwort = nicht sichtbar
    const ok = await updateMitglied(sb as any, 5, { vorname: "Neu" } as any);
    expect(ok).toBe(false);
    expect(sb.opsOn("personen")).toHaveLength(0);
    expect(sb.opsOn("mitglieder").filter(o => o.op === "update")).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it("gibt false zurück und loggt bei Fehler", async () => {
    const sb = makeSb({ "mitglieder.update": { error: pgError() } });
    const ok = await updateMitglied(sb as any, 5, { mitgliedtyp: "X" } as any);
    expect(ok).toBe(false);
    expect(errSpy).toHaveBeenCalled();
  });
});
