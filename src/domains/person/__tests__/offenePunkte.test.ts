/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/offenePunkte.test.ts

   Die Markierung „bei dieser Person ist noch etwas offen".

   ⚠ EIN FELD, NICHT ZWEI. `personen.offene_punkte` ist Text, und
   NICHT LEER IST die Markierung. Ein `boolean` daneben wäre eine
   zweite Stelle für dieselbe Aussage — davon hat dieses Projekt am
   23.08.2026 drei als Defekt gefunden (`hat_portal_zugang`,
   `api_verbindungen.active`, `zaehlt_als_mitgliedschaft`).

   Diese Fälle halten fest, was daraus folgt: es darf nur EINE Art
   von „nichts" geben, und der Schreibvorgang muss ZÄHLEN.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb } from "../../members/__tests__/_mockSb.ts";
import { setzeOffenePunkte, hatOffenePunkte } from "../offenePunkteService.ts";

afterEach(() => vi.restoreAllMocks());

/* Ein Schreibvorgang, der ankommt: `update … .select("id")` gibt die
   geschriebene Zeile zurück. Eine LEERE Liste heisst „nicht getroffen". */
const sbOk = () => makeSb({ "personen.update": { data: [{ id: "p-1" }] } });

describe("hatOffenePunkte — nur EINE Art von nichts", () => {
  it("null, undefined und Leerraum sind alle keine Markierung", () => {
    expect(hatOffenePunkte(null)).toBe(false);
    expect(hatOffenePunkte(undefined)).toBe(false);
    expect(hatOffenePunkte("")).toBe(false);
    expect(hatOffenePunkte("   ")).toBe(false);
  });

  it("ein Text ist eine Markierung", () => {
    expect(hatOffenePunkte("Beitrag 2026 offen")).toBe(true);
  });
});

describe("setzeOffenePunkte", () => {
  it("schreibt den getrimmten Text", async () => {
    const sb = sbOk();
    const erg = await setzeOffenePunkte(sb as never, "p-1", "  Tenue nicht zurück  ");
    expect(erg.ok).toBe(true);
    expect(sb.find("personen", "update")!.payload.offene_punkte).toBe("Tenue nicht zurück");
  });

  it("⚠ entfernt den Vermerk mit null — die eigene Handlung", async () => {
    /* Ein Pflichtfeld, das man nicht leeren kann, wäre eine Falle; ein
       Pflichtfeld, das man durch Leeren aufhebt, wäre keins. Deshalb ist das
       Entfernen ein eigener Aufruf mit eigener Beschriftung. */
    const sb = sbOk();
    const erg = await setzeOffenePunkte(sb as never, "p-1", null);
    expect(erg.ok).toBe(true);
    expect(sb.find("personen", "update")!.payload.offene_punkte).toBeNull();
  });

  it("⚠ Leerraum wird zu null, nicht zu einem leeren Text", async () => {
    /* Sonst gäbe es zwei Arten von „nichts", und die Archiv-Ansicht müsste
       beide kennen. Die Datenbank weist den Leerstring ohnehin ab (23514) —
       hier wird er vorher zur einen Form. */
    const sb = sbOk();
    await setzeOffenePunkte(sb as never, "p-1", "   ");
    expect(sb.find("personen", "update")!.payload.offene_punkte).toBeNull();
  });

  it("⚠ meldet KEINEN Erfolg, wenn keine Zeile getroffen wurde", async () => {
    /* Der gefährliche Fall: RLS liefert keinen Fehler, sondern ein update
       über null Zeilen — PostgREST antwortet 204 mit `error === null`. Ohne
       `.select("id")` stünde hier eine Erfolgsmeldung ohne Deckung.
       (CLAUDE.md, 23.08.2026.) */
    const sb = makeSb({ "personen.update": { data: [] } });
    const erg = await setzeOffenePunkte(sb as never, "fremd", "Beitrag");
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toContain("kam nicht an");
  });

  it("meldet einen Datenbankfehler mit seiner Meldung", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.update": { error: { message: "keine Rechte", code: "42501" } } });
    const erg = await setzeOffenePunkte(sb as never, "p-1", "Beitrag");
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toBe("keine Rechte");
    expect(spy).toHaveBeenCalled();
  });

  it("ohne Verbindung wird nichts behauptet", async () => {
    const erg = await setzeOffenePunkte(null, "p-1", "Beitrag");
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toBeTruthy();
  });
});
