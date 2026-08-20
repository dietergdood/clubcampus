/* ═══════════════════════════════════════════════════════════════
   fetchSupporter — wer in der Goennerliste steht

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT (Statuten
   Artikel 6). Die Auswahl besteht aus zwei Ausschluessen, und
   beide sind leicht falsch herum zu bauen — deshalb hier je ein
   Test pro Richtung.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import { fetchSupporter } from "../supporterService.ts";

/** Eine Personenzeile, wie PostgREST sie mit den Einbettungen liefert. */
const person = (over: Record<string, unknown> = {}) => ({
  id: "p-1", vorname: "Petra", nachname: "Brunner",
  email: "p@b.ch", telefon: null, strasse: null, plz: null, ort: null,
  geburtsdatum: null, geschlecht: null, nationalitaet: null,
  nationalitaet2: null, heimatort: null, ahv_nr: null, foto_url: null,
  funktionen: [], profil_geprueft_at: null,
  mitglieder: [], eltern_kinder: [], benutzer: [],
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("fetchSupporter — die zwei Ausschluesse", () => {
  it("nimmt eine Person ohne Mitgliedschaft und ohne Kind", async () => {
    const sb = makeSb({ "personen.select": { data: [person()] } });
    const raus = await fetchSupporter(sb as never, "v-1");
    expect(raus.map(p => p.id)).toEqual(["p-1"]);
  });

  it("laesst weg, wer eine Mitgliedschaft hat", async () => {
    const sb = makeSb({ "personen.select": {
      data: [person({ id: "p-1", mitglieder: [{ id: 42 }] }), person({ id: "p-2" })],
    } });
    const raus = await fetchSupporter(sb as never, "v-1");
    expect(raus.map(p => p.id)).toEqual(["p-2"]);
  });

  it("⚠ auch eine BEENDETE Mitgliedschaft schliesst aus", async () => {
    /* `mitglieder(id)` fragt bewusst nicht nach `aktiv`. Ein ausgetretenes
       Mitglied gehoert ins Archiv, nicht unter die Goenner — sonst stuende
       dieselbe Person an zwei Orten, und niemand wuesste, welcher gilt.
       Die Einbettung liefert die Zeile unabhaengig von `aktiv`; ein Filter
       darauf waere genau der Fehler. */
    const sb = makeSb({ "personen.select": {
      data: [person({ id: "p-1", mitglieder: [{ id: 7 }] })],
    } });
    expect(await fetchSupporter(sb as never, "v-1")).toEqual([]);
  });

  it("laesst weg, wer ein Kind hat — das ist ein Elternteil", async () => {
    const sb = makeSb({ "personen.select": {
      data: [person({ id: "p-1", eltern_kinder: [{ person_id: "p-1" }] }), person({ id: "p-2" })],
    } });
    const raus = await fetchSupporter(sb as never, "v-1");
    expect(raus.map(p => p.id)).toEqual(["p-2"]);
  });

  it("filtert auf den Verein", async () => {
    const sb = makeSb({ "personen.select": { data: [] } });
    await fetchSupporter(sb as never, "v-9");
    const eq = sb.find("personen", "select")!.filters.find(f => f.method === "eq");
    expect(eq!.args).toEqual(["verein_id", "v-9"]);
  });
});

describe("fetchSupporter — das Konto", () => {
  it("uebernimmt Rolle und Zugang aus benutzer", async () => {
    const sb = makeSb({ "personen.select": {
      data: [person({ benutzer: [{ id: "u-1", role: "supporter", aktiv: true }] })],
    } });
    const [p] = await fetchSupporter(sb as never, "v-1");
    expect(p.rolle).toBe("supporter");
    expect(p.hat_benutzer).toBe(true);
    expect(p.benutzer_deaktiviert).toBe(false);
  });

  it("ein deaktiviertes Konto bleibt ein Konto", async () => {
    /* „Deaktiviert" und „Kein Zugang" sind zwei verschiedene Aussagen —
       im ersten Fall gibt es ein Konto, das jemand wieder freischalten kann. */
    const sb = makeSb({ "personen.select": {
      data: [person({ benutzer: [{ id: "u-1", role: "supporter", aktiv: false }] })],
    } });
    const [p] = await fetchSupporter(sb as never, "v-1");
    expect(p.hat_benutzer).toBe(true);
    expect(p.benutzer_deaktiviert).toBe(true);
  });

  it("ohne Konto: kein Zugang, keine Rolle", async () => {
    const sb = makeSb({ "personen.select": { data: [person()] } });
    const [p] = await fetchSupporter(sb as never, "v-1");
    expect(p.hat_benutzer).toBe(false);
    expect(p.benutzer_deaktiviert).toBe(false);
    expect(p.rolle).toBeNull();
  });
});

describe("fetchSupporter — ein Fehler ist keine Datenlage", () => {
  it("meldet den Datenbankfehler, statt ihn als leere Liste auszugeben", async () => {
    /* sb.from().select() WIRFT nicht — es liefert { data, error }. Wer
       `error` nicht liest, verwandelt jedes 42501 in „es gibt keine
       Supporter". Genau das soll dieser Test verhindern. */
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.select": { data: null, error: pgError("keine Rechte", "42501") } });
    expect(await fetchSupporter(sb as never, "v-1")).toEqual([]);
    expect(spy).toHaveBeenCalled();
  });
});
