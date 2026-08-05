import { describe, it, expect, vi, beforeEach } from "vitest";

/* Die Services werden ersetzt — geprüft wird die Orchestrierung:
   Reihenfolge, Hauptkontakt und das Verhalten bei Teilfehlern. */
type Fehler = { message: string } | null;
const linkKind = vi.fn(
  async (_sb: unknown, _elternId: string, _mitgliedId: number, _vereinId: string, _haupt: boolean): Promise<Fehler> => null);
const insertElternkontakt = vi.fn(
  async (_sb: unknown, _kontakt: Record<string, unknown>, _vereinId: string): Promise<Fehler> => null);
const setHauptkontakt = vi.fn(
  async (_sb: unknown, _mitgliedId: number, _elternId: string): Promise<void> => undefined);

vi.mock("../../../domains/members/elternService.ts", () => ({
  linkKind, insertElternkontakt, setHauptkontakt,
  sucheElternkontakte: vi.fn(async () => []),
}));
vi.mock("../../../domains/members/memberService.ts", () => ({
  logAktivitaet: vi.fn(),
  AKTIVITAET_TYP: { ELTERN_HINZUGEFUEGT: "ELTERN_HINZUGEFUEGT" },
}));
vi.mock("../../../domains/person/personUtils.ts", () => ({ vollname: () => "X" }));
vi.mock("../../../theme.ts", () => ({ Btn: () => null }));
vi.mock("../../../icons.tsx", () => ({ TI: () => null }));
vi.mock("../ElternkontaktModal.tsx", () => ({
  ElternFelder: () => null,
  validateElternkontakt: () => null,
}));

const { speichereEltern } = await import("../NeuesMitgliedElternSektion.tsx");

const sb = {} as never;
const VEREIN = "v1";

beforeEach(() => {
  linkKind.mockClear(); insertElternkontakt.mockClear(); setHauptkontakt.mockClear();
  linkKind.mockImplementation(async () => null);
  insertElternkontakt.mockImplementation(async () => null);
});

describe("speichereEltern", () => {
  it("tut nichts ohne Einträge", async () => {
    expect(await speichereEltern(sb, VEREIN, 1, [], "Admin")).toBeNull();
    expect(linkKind).not.toHaveBeenCalled();
    expect(setHauptkontakt).not.toHaveBeenCalled();
  });

  it("verknüpft bestehende Kontakte und legt neue an", async () => {
    await speichereEltern(sb, VEREIN, 42, [
      { key: "a", id: "e1", anzeigename: "Petra Brunner", hauptkontakt: true },
      { key: "b", form: { vorname: "Reto", nachname: "Brunner", email: "r@b.ch" }, anzeigename: "Reto Brunner", hauptkontakt: false },
    ], "Admin");
    expect(linkKind).toHaveBeenCalledTimes(1);
    expect(insertElternkontakt).toHaveBeenCalledTimes(1);
  });

  it("schreibt mitglied_id an den neuen Elternkontakt", async () => {
    /* elternkontakte.mitglied_id ist NOT NULL — fehlt sie, scheitert der
       Insert. Deshalb kann der Elternteil auch nicht vor dem Kind entstehen. */
    await speichereEltern(sb, VEREIN, 42, [
      { key: "b", form: { vorname: "Reto", nachname: "Brunner", email: "r@b.ch" }, anzeigename: "Reto Brunner", hauptkontakt: true },
    ], "Admin");
    const arg = insertElternkontakt.mock.calls[0][1];
    expect(arg.mitglied_id).toBe(42);
    expect(arg.hauptkontakt).toBe(true);
    expect(arg.name).toBe("Reto Brunner");
  });

  it("setzt den Hauptkontakt erst am Schluss", async () => {
    /* setHauptkontakt() räumt zuerst alle anderen ab — mitten in der
       Schleife würde es die zuvor gesetzten wieder löschen. */
    await speichereEltern(sb, VEREIN, 42, [
      { key: "a", id: "e1", anzeigename: "Petra", hauptkontakt: true },
      { key: "b", id: "e2", anzeigename: "Reto",  hauptkontakt: false },
    ], "Admin");
    expect(setHauptkontakt).toHaveBeenCalledTimes(1);
    expect(setHauptkontakt).toHaveBeenCalledWith(sb, 42, "e1");
    /* Beide wurden ohne Hauptkontakt-Flag verknüpft */
    expect(linkKind.mock.calls.every(c => c[4] === false)).toBe(true);
  });

  it("meldet einen Teilfehler, macht aber den Rest fertig", async () => {
    linkKind.mockImplementationOnce(async () => ({ message: "kaputt" }));
    const fehler = await speichereEltern(sb, VEREIN, 42, [
      { key: "a", id: "e1", anzeigename: "Petra", hauptkontakt: true },
      { key: "b", id: "e2", anzeigename: "Reto",  hauptkontakt: false },
    ], "Admin");
    expect(fehler).toContain("Petra");
    expect(linkKind).toHaveBeenCalledTimes(2);
    /* Der gescheiterte war der Hauptkontakt — dann wird keiner gesetzt,
       statt einen falschen zu bestimmen. */
    expect(setHauptkontakt).not.toHaveBeenCalled();
  });
});
