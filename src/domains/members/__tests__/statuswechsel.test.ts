/* ═══════════════════════════════════════════════════════════════
   Statuswechsel Supporter → Mitglied

   Der Kern ist eine Auslassung: es wird KEINE Person angelegt.
   `insertMitglied()` legt immer eine an — sie hier zu benutzen,
   ergäbe eine Dublette derselben Person, und `personen_email_pro_verein`
   liesse sie durch, solange keine E-Mail hinterlegt ist. Der Fehler
   wäre also je nach Datenlage mal sichtbar und mal nicht.

   Eine Auslassung lässt sich nur negativ prüfen — deshalb hier.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import { macheZuMitglied } from "../supporterService.ts";

afterEach(() => vi.restoreAllMocks());

describe("macheZuMitglied — die Person bleibt dieselbe", () => {
  it("legt eine Mitgliedschaft an und KEINE Person", async () => {
    const sb = makeSb({
      "mitglieder.select": { data: [] },
      "mitglieder.insert": { data: { id: 77 } },
    });
    const { mitgliedId, fehler } = await macheZuMitglied(
      sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied", eintrittsdatum: "2026-08-20" });

    expect(fehler).toBeNull();
    expect(mitgliedId).toBe(77);
    /* Das Entscheidende: nichts nach `personen`. */
    expect(sb.opsOn("personen")).toHaveLength(0);
  });

  it("gibt verein_id mit — sonst lehnt die Datenbank die Zeile still ab", async () => {
    const sb = makeSb({
      "mitglieder.select": { data: [] },
      "mitglieder.insert": { data: { id: 77 } },
    });
    await macheZuMitglied(sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied" });
    expect(sb.find("mitglieder", "insert")!.payload).toEqual(expect.objectContaining({
      person_id: "p-1", verein_id: "v-1", mitgliedtyp: "Aktivmitglied", aktiv: true,
    }));
  });

  it("setzt die Portalrolle NICHT — sie ist ein abgeleiteter Wert", async () => {
    /* Sie hier zu raten hiesse, den berechneten Wert an zwei Orten zu
       bestimmen; `ableitUndSaveRolle` macht es danach. */
    const sb = makeSb({
      "mitglieder.select": { data: [] },
      "mitglieder.insert": { data: { id: 77 } },
    });
    await macheZuMitglied(sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied" });
    expect(sb.find("mitglieder", "insert")!.payload).not.toHaveProperty("rolle");
  });

  it("ohne Eintrittsdatum steht dort null, nicht ein leerer String", async () => {
    const sb = makeSb({
      "mitglieder.select": { data: [] },
      "mitglieder.insert": { data: { id: 77 } },
    });
    await macheZuMitglied(sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied", eintrittsdatum: "" });
    expect(sb.find("mitglieder", "insert")!.payload.eintrittsdatum).toBeNull();
  });
});

describe("macheZuMitglied — wenn es nicht geht", () => {
  it("bei bestehender Mitgliedschaft: eigener Satz statt 23505 aus der Datenbank", async () => {
    /* Der partielle Index `mitglieder_eine_aktive_mitgliedschaft` laesst nur
       eine zu. Ohne die Vorabfrage bekaeme der Nutzer den Rohtext der
       Datenbank zu sehen. */
    const sb = makeSb({ "mitglieder.select": { data: [{ id: 5, mitgliedtyp: "Aktivmitglied" }] } });
    const { mitgliedId, fehler } = await macheZuMitglied(
      sb as never, "p-1", "v-1", { mitgliedtyp: "Passivmitglied" });

    expect(mitgliedId).toBeNull();
    expect(fehler).toContain("bereits Aktivmitglied");
    expect(sb.opsOn("mitglieder").filter(o => o.op === "insert")).toHaveLength(0);
  });

  it("ein Lesefehler wird nicht als „keine Mitgliedschaft“ gedeutet", async () => {
    /* sb.from().select() wirft nicht. Wer `error` uebergeht, haelt ein 42501
       fuer eine leere Menge — und legt dann eine zweite Mitgliedschaft an. */
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "mitglieder.select": { data: null, error: pgError("keine Rechte", "42501") } });
    const { mitgliedId, fehler } = await macheZuMitglied(
      sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied" });

    expect(mitgliedId).toBeNull();
    expect(fehler).toBeTruthy();
    expect(sb.opsOn("mitglieder").filter(o => o.op === "insert")).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
  });

  it("ein Schreibfehler wird gemeldet, nicht verschluckt", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({
      "mitglieder.select": { data: [] },
      "mitglieder.insert": { data: null, error: pgError("verletzt Fremdschluessel", "23503") },
    });
    const { mitgliedId, fehler } = await macheZuMitglied(
      sb as never, "p-1", "v-1", { mitgliedtyp: "Aktivmitglied" });

    expect(mitgliedId).toBeNull();
    expect(fehler).toBe("verletzt Fremdschluessel");
    expect(spy).toHaveBeenCalled();
  });
});
