/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberService.test.ts
   Unit-Tests memberService — Teil 1: verein_id-Injektion bei INSERTs.
   (Fehlerpfade siehe memberService.errors.test.ts)
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import {
  insertMitglied, logAktivitaet, logAenderung, AKTIVITAET_TYP,
} from "../memberService.ts";

/* console.error wird in Fehlerpfaden bewusst aufgerufen — stummschalten,
   damit die Testausgabe sauber bleibt. */
let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { errSpy.mockRestore(); });

describe("memberService — verein_id-Injektion", () => {

  describe("insertMitglied", () => {
    /* Seit Etappe 2b entstehen zwei Zeilen: erst die Person, dann die
       Mitgliedschaft mit ihrer person_id. Der Name gehört zur Person. */
    it("legt die Person an und verknüpft die Mitgliedschaft damit", async () => {
      const sb = makeSb({
        "personen.insert":   { data: { id: "p-7" }, error: null },
        "mitglieder.insert": { data: { id: 42 },   error: null },
      });
      await insertMitglied(sb as any, { vorname: "Max", nachname: "Muster" } as any, "verein-1");

      const person = sb.find("personen", "insert");
      expect(person).toBeTruthy();
      expect(person!.payload).toEqual(expect.objectContaining({
        vorname: "Max", nachname: "Muster", verein_id: "verein-1",
      }));

      const rec = sb.find("mitglieder", "insert");
      expect(rec).toBeTruthy();
      expect(rec!.payload).toEqual(expect.objectContaining({
        person_id: "p-7",
        verein_id: "verein-1",
        aktiv: true,
      }));
      /* Der Name darf NICHT mehr in mitglieder mitgeschrieben werden —
         zwei Wahrheiten laufen sonst auseinander. */
      expect(rec!.payload.vorname).toBeUndefined();
      expect(rec!.payload.created_at).toEqual(expect.any(String));
      expect(rec!.payload.updated_at).toEqual(expect.any(String));
    });

    it("legt keine Mitgliedschaft an, wenn die Person scheitert", async () => {
      const sb = makeSb({
        "personen.insert": { data: null, error: { message: "kaputt" } },
      });
      const id = await insertMitglied(sb as any, { vorname: "Max" } as any, "verein-1");
      expect(id).toBeNull();
      expect(sb.find("mitglieder", "insert")).toBeFalsy();
    });

    it("gibt die neue id zurück", async () => {
      const sb = makeSb({
        "personen.insert":   { data: { id: "p-9" }, error: null },
        "mitglieder.insert": { data: { id: 99 },   error: null },
      });
      const id = await insertMitglied(sb as any, { vorname: "A" } as any, "verein-1");
      expect(id).toBe(99);
    });

    it("gibt bei Fehler null zurück und loggt", async () => {
      const sb = makeSb({ "mitglieder.insert": { data: null, error: pgError("insert fail") } });
      const id = await insertMitglied(sb as any, { vorname: "A" } as any, "verein-1");
      expect(id).toBeNull();
      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe("logAktivitaet", () => {
    it("schreibt verein_id, typ und parseInt(mitglied_id) in mitglieder_aktivitaeten", async () => {
      const sb = makeSb();
      await logAktivitaet(sb as any, "5", "verein-1", AKTIVITAET_TYP.TEAM_ENTFERNT, "Team X entfernt", "teams", "X", "Admin");

      const rec = sb.find("mitglieder_aktivitaeten", "insert");
      expect(rec).toBeTruthy();
      expect(rec!.payload).toEqual(expect.objectContaining({
        mitglied_id: 5,            // parseInt("5")
        verein_id: "verein-1",
        typ: "team_entfernt",
        beschreibung: "Team X entfernt",
        feld: "teams",
        wert: "X",
        geaendert_von: "Admin",
      }));
    });

    it("lässt wert null als null (statt 'null'-String)", async () => {
      const sb = makeSb();
      await logAktivitaet(sb as any, 7, "verein-1", AKTIVITAET_TYP.ARCHIVIERT, "Archiviert");
      const rec = sb.find("mitglieder_aktivitaeten", "insert");
      expect(rec!.payload.wert).toBeNull();
      expect(rec!.payload.mitglied_id).toBe(7);
    });
  });

  describe("logAenderung", () => {
    it("schreibt nichts, wenn alter === neuer Wert", async () => {
      const sb = makeSb();
      await logAenderung(sb as any, 5, "verein-1", "vorname", "Max", "Max");
      expect(sb.calls).toHaveLength(0);
    });

    it("A→B: Insert in mitglieder_aenderungen mit verein_id", async () => {
      const sb = makeSb();
      await logAenderung(sb as any, 5, "verein-1", "vorname", "Max", "Moritz");

      const rec = sb.find("mitglieder_aenderungen", "insert");
      expect(rec).toBeTruthy();
      expect(rec!.payload).toEqual(expect.objectContaining({
        mitglied_id: 5,
        verein_id: "verein-1",
        feld: "vorname",
        alter_wert: "Max",
        neuer_wert: "Moritz",
        geaendert_von: "Administrator", // Default
      }));
      // kein Aktivitäten-Eintrag beim echten Wechsel
      expect(sb.find("mitglieder_aktivitaeten", "insert")).toBeUndefined();
    });

    it("null→B: delegiert an logAktivitaet (FELD_ERFASST) mit verein_id", async () => {
      const sb = makeSb();
      await logAenderung(sb as any, 5, "verein-1", "email", null, "a@b.ch");

      const rec = sb.find("mitglieder_aktivitaeten", "insert");
      expect(rec).toBeTruthy();
      expect(rec!.payload).toEqual(expect.objectContaining({
        verein_id: "verein-1",
        typ: AKTIVITAET_TYP.FELD_ERFASST,
        feld: "email",
        wert: "a@b.ch",
      }));
      expect(sb.find("mitglieder_aenderungen", "insert")).toBeUndefined();
    });

    it("A→null: delegiert an logAktivitaet (FELD_GELEERT)", async () => {
      const sb = makeSb();
      await logAenderung(sb as any, 5, "verein-1", "email", "a@b.ch", null);

      const rec = sb.find("mitglieder_aktivitaeten", "insert");
      expect(rec!.payload).toEqual(expect.objectContaining({
        typ: AKTIVITAET_TYP.FELD_GELEERT,
        feld: "email",
        wert: "a@b.ch",
      }));
    });
  });
});
