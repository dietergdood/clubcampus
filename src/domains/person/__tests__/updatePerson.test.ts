/* ═══════════════════════════════════════════════════════════════
   updatePerson — der Schreibpfad ohne Mitgliedschaft

   `updateMitglied()` findet die Person über `mitglieder.person_id`.
   Ein Supporter hat diese Zeile nicht, also braucht er einen
   eigenen Weg. Der interessante Teil ist, was er ABLEHNT.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb, pgError } from "../../members/__tests__/_mockSb.ts";
import { updatePerson } from "../personService.ts";

afterEach(() => vi.restoreAllMocks());

describe("updatePerson", () => {
  it("schreibt Personenfelder nach personen", async () => {
    const sb = makeSb();
    expect(await updatePerson(sb as never, "p-1", { email: "a@b.ch", ort: "Herrliberg" })).toBe(true);
    const op = sb.find("personen", "update")!;
    expect(op.payload).toEqual(expect.objectContaining({ email: "a@b.ch", ort: "Herrliberg" }));
    expect(op.payload.updated_at).toBeTruthy();
  });

  it("⚠ lehnt Mitgliedschaftsfelder ab, statt sie still zu verschlucken", async () => {
    /* Ohne diese Prüfung wäre `mitgliedtyp` ein Nulleffekt: verteileFelder
       sortiert es in den Mitgliedschafts-Teil, den es hier nicht gibt, und
       der Aufruf meldete Erfolg. Dieselbe Sorte Fehler wie ein leerer catch —
       es sieht aus, als sei nichts zu tun gewesen. */
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb();
    expect(await updatePerson(sb as never, "p-1", { email: "a@b.ch", mitgliedtyp: "Aktivmitglied" })).toBe(false);
    expect(sb.opsOn("personen")).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
  });

  it("ohne Änderung wird nichts geschrieben", async () => {
    const sb = makeSb();
    expect(await updatePerson(sb as never, "p-1", {})).toBe(true);
    expect(sb.opsOn("personen")).toHaveLength(0);
  });

  it("meldet einen Datenbankfehler als false", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.update": { error: pgError("keine Rechte", "42501") } });
    expect(await updatePerson(sb as never, "p-1", { email: "a@b.ch" })).toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
