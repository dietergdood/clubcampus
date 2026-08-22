/* ═══════════════════════════════════════════════════════════════
   fetchSupporter — wer in der Supporterliste steht

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
       Mitglied gehoert ins Archiv, nicht unter die Supporter — sonst stuende
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
    /* „Deaktiviert“ und „Kein Zugang“ sind zwei verschiedene Aussagen —
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
       Supporter“. Genau das soll dieser Test verhindern. */
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.select": { data: null, error: pgError("keine Rechte", "42501") } });
    expect(await fetchSupporter(sb as never, "v-1")).toEqual([]);
    expect(spy).toHaveBeenCalled();
  });
});

/* ── Der zweite Weg in die Liste ──────────────────────────────────────────
   ⚠ Bis zum 22.08.2026 galt NUR der doppelte Ausschluss, und deshalb machte
   „Supporter" beim Austritt niemanden zum Supporter: die beendete
   Mitgliedschaftszeile bleibt stehen und schloss die Person hier aus.
   Seit dem Austritt die Art schreibt, liest diese Liste sie. */
describe("fetchSupporter — die Austritts-Art", () => {
  const mitArt = (personen: unknown[], artTraeger: string[] = []) => makeSb({
    "personen.select": { data: personen },
    "vereine.select": { data: { austritt_art_id: "art-1" } },
    "personenart_pro_person.select": { data: artTraeger.map(id => ({ person_id: id })) },
  });

  it("⚠ nimmt eine AUSGETRETENE Person auf, wenn sie die Art trägt", async () => {
    const sb = mitArt([person({ id: "p-1", mitglieder: [{ id: 42 }] })], ["p-1"]);
    const raus = await fetchSupporter(sb as never, "v-1");
    expect(raus.map(p => p.id)).toEqual(["p-1"]);
  });

  it("⚠ lässt eine ausgetretene Person OHNE die Art weg — sie gehört ins Archiv", async () => {
    /* Sonst stünde dieselbe Person an zwei Orten. */
    const sb = mitArt([person({ id: "p-1", mitglieder: [{ id: 42 }] })], []);
    const raus = await fetchSupporter(sb as never, "v-1");
    expect(raus).toEqual([]);
  });

  it("ein Elternteil bleibt aussen vor, auch mit der Art", async () => {
    /* Die Kinder-Bedingung gewinnt: wer ein Kind hat, steht im Eltern-Tab. */
    const sb = mitArt([person({ id: "p-1", eltern_kinder: [{ person_id: "p-1" }] })], ["p-1"]);
    expect(await fetchSupporter(sb as never, "v-1")).toEqual([]);
  });

  it("ohne eingestellte Art bleibt es beim doppelten Ausschluss", async () => {
    const sb = makeSb({
      "personen.select": { data: [person({ id: "p-1", mitglieder: [{ id: 42 }] }), person({ id: "p-2" })] },
      "vereine.select": { data: { austritt_art_id: null } },
    });
    expect((await fetchSupporter(sb as never, "v-1")).map(p => p.id)).toEqual(["p-2"]);
  });
});
