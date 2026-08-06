import { describe, it, expect } from "vitest";
import { makeSb } from "./_mockSb.ts";
import { sucheElternkontakte } from "../elternService.ts";

const person = (id: string, vorname: string, nachname: string) => ({
  id, vorname, nachname, email: `${vorname}.${nachname}@x.ch`.toLowerCase(), eltern_kinder: [],
});

/* Gesucht wird über ALLE Personen des Vereins, nicht nur über die, die bereits
   Elternteil sind — sonst fände man ein Aktivmitglied nicht, das Vater wird,
   und müsste es ein zweites Mal erfassen. Genau die Dublette, die Etappe 2a
   auflösen musste. */
describe("sucheElternkontakte", () => {
  it("verknüpft mehrere Wörter mit UND, in beliebiger Reihenfolge", async () => {
    /* „adrian kaiser" und „kaiser adrian" müssen dieselbe Person finden.
       Technisch: ein .or() pro Wort, und PostgREST verknüpft mehrere .or()
       mit UND. */
    const sb = makeSb({ "personen.select": { data: [person("p1", "Adrian", "Kaiser")] } });
    await sucheElternkontakte(sb as never, "v-1", "kaiser adrian");
    const ors = sb.find("personen", "select")!.filters.filter(f => f.method === "or");
    expect(ors).toHaveLength(2);
    expect(ors[0].args[0]).toContain("kaiser");
    expect(ors[1].args[0]).toContain("adrian");
  });

  it("ein einzelnes Wort ergibt eine Bedingung", async () => {
    const sb = makeSb({ "personen.select": { data: [] } });
    await sucheElternkontakte(sb as never, "v-1", "kaiser");
    expect(sb.find("personen", "select")!.filters.filter(f => f.method === "or")).toHaveLength(1);
  });

  it("leere Eingabe fragt gar nicht erst ab", async () => {
    const sb = makeSb();
    expect(await sucheElternkontakte(sb as never, "v-1", "   ")).toEqual([]);
    expect(sb.opsOn("personen")).toHaveLength(0);
  });

  it("schliesst das Kind aus, für das gesucht wird", async () => {
    /* Sonst liesse sich jemand als sein eigener Elternteil eintragen. */
    const sb = makeSb({
      "personen.select":      { data: [person("p1", "Adrian", "Kaiser"), person("p2", "Otto", "Kaiser")] },
      "mitglieder.select":    { data: { person_id: "p1" } },
      "eltern_kinder.select": { data: [] },
    });
    const treffer = await sucheElternkontakte(sb as never, "v-1", "kaiser", 42);
    expect(treffer.map(t => t.id)).toEqual(["p2"]);
  });

  it("schliesst NICHT aus, wer anderswo als Kind eingetragen ist", async () => {
    /* Ein erwachsenes Mitglied, dessen Eltern ebenfalls im Verein sind, ist
       selbst ein Kind — und trotzdem Vater seiner eigenen Kinder. Ein
       Filter darauf liess am 05.08.2026 den gesuchten Adrian Kaiser
       verschwinden. */
    const sb = makeSb({
      "personen.select":      { data: [person("p1", "Adrian", "Kaiser"), person("p2", "Otto", "Kaiser")] },
      "mitglieder.select":    { data: { person_id: "p9" } },
      "eltern_kinder.select": { data: [] },
    });
    const treffer = await sucheElternkontakte(sb as never, "v-1", "kaiser", 42);
    expect(treffer.map(t => t.id)).toEqual(["p1", "p2"]);
  });

  it("schliesst den Zirkel aus", async () => {
    /* Ist das Kind bereits Elternteil von Otto, darf Otto nicht umgekehrt
       sein Elternteil werden. */
    const sb = makeSb({
      "personen.select":      { data: [person("p1", "Adrian", "Kaiser"), person("p2", "Otto", "Kaiser")] },
      "mitglieder.select":    { data: { person_id: "p9" } },
      "eltern_kinder.select": { data: [{ mitglieder: { person_id: "p2" } }] },
    });
    const treffer = await sucheElternkontakte(sb as never, "v-1", "kaiser", 42);
    expect(treffer.map(t => t.id)).toEqual(["p1"]);
  });

  it("liefert die E-Mail mit — auch ohne Elternrolle", async () => {
    /* Im Modal steht sie auf einer eigenen Zeile; hing sie an der Beziehung,
       fehlte sie genau bei denen, die noch kein Elternteil sind. */
    const sb = makeSb({
      "personen.select":      { data: [person("p1", "Adrian", "Kaiser")] },
      "eltern_kinder.select": { data: [] },
    });
    const [t] = await sucheElternkontakte(sb as never, "v-1", "kaiser");
    expect(t.email).toBe("adrian.kaiser@x.ch");
    expect(t.beziehung).toBeFalsy();
  });
});
