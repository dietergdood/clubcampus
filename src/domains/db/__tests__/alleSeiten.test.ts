import { describe, it, expect } from "vitest";
import { alleSeiten, SEITE } from "../alleSeiten.ts";

/** Eine Attrappe, die sich wie PostgREST verhält: sie gibt höchstens
    SEITE Zeilen je Aufruf heraus und kürzt OHNE Fehler. */
function quelle(zeilen: number, echteZahl = zeilen) {
  const alle = Array.from({ length: zeilen }, (_, i) => ({ id: i }));
  return {
    seite: (von: number, bis: number) =>
      Promise.resolve({ data: alle.slice(von, bis + 1), error: null }),
    zaehle: () => Promise.resolve({ count: echteZahl, error: null }),
  };
}

describe("alleSeiten", () => {
  it("liest weniger als eine Seite in einem Zug", async () => {
    const q = quelle(7);
    expect(await alleSeiten(q.seite, q.zaehle, "Test")).toHaveLength(7);
  });

  it("⚠ liest ueber die stille 1000er-Grenze hinaus", async () => {
    /* ⚠ DER FALL, UM DEN ES GEHT. Ein einzelner Aufruf haette 1000
       geliefert — mit error === null, also ununterscheidbar von „es gibt
       genau 1000". Am 11.09.2026 standen 2282 Zeilen in
       spiel_aufstellung, und auf der Website fehlten Aufstellungen. */
    const q = quelle(2282);
    expect(await alleSeiten(q.seite, q.zaehle, "Aufstellung")).toHaveLength(2282);
  });

  it("eine volle Seite ohne Rest hoert nach der leeren Folgeseite auf", async () => {
    /* Genau SEITE Zeilen: die erste Seite ist voll, also wird eine zweite
       geholt — und die ist leer. Ohne diesen Fall bliebe offen, ob die
       Schleife bei „genau voll" haengt oder zu frueh abbricht. */
    const q = quelle(SEITE);
    expect(await alleSeiten(q.seite, q.zaehle, "Test")).toHaveLength(SEITE);
  });

  it("keine Zeilen sind keine Zeilen, kein Fehler", async () => {
    const q = quelle(0);
    expect(await alleSeiten(q.seite, q.zaehle, "Test")).toEqual([]);
  });

  it("⚠⚠ wirft, wenn die Zaehlprobe nicht aufgeht", async () => {
    /* Die zweite Haelfte der Bauart: Paginieren allein behebt den Fehler
       UND verbirgt, dass es ihn gab. Hier liefert die Quelle 500 Zeilen,
       behauptet aber 900 — so saehe ein Zeitlimit oder eine Policy aus. */
    const q = quelle(500, 900);
    await expect(alleSeiten(q.seite, q.zaehle, "Aufstellung"))
      .rejects.toThrow(/500 Zeilen gelesen, 900 vorhanden/);
  });

  it("die Meldung nennt, was gefehlt hat — nicht nur dass etwas fehlt", async () => {
    const q = quelle(500, 900);
    await expect(alleSeiten(q.seite, q.zaehle, "Supporter"))
      .rejects.toThrow(/^Supporter:/);
  });

  it("ein Lesefehler wirft und wird nicht zu einer leeren Liste", async () => {
    /* ⚠ Der Fehler, den dieses Projekt am haeufigsten gemacht hat: aus
       einem Ausfall wird eine Datenlage. */
    await expect(alleSeiten(
      () => Promise.resolve({ data: null, error: { message: "42501" } }),
      () => Promise.resolve({ count: 0, error: null }),
      "Personen",
    )).rejects.toThrow(/Personen nicht lesbar: 42501/);
  });

  it("eine gescheiterte Zaehlprobe wirft ebenfalls", async () => {
    /* Ohne sie waere die Liste ungeprueft — und ungeprueft sieht aus wie
       geprueft. */
    const q = quelle(5);
    await expect(alleSeiten(
      q.seite,
      () => Promise.resolve({ count: null, error: { message: "kaputt" } }),
      "Personen",
    )).rejects.toThrow(/Zählprobe nicht möglich/);
  });

  it("count === null wird hingenommen — die Gegenstelle zaehlt nicht", async () => {
    /* Nicht jede Abfrage kann zaehlen (Sichten, rpc). Dann gilt, was
       gelesen wurde; die Alternative waere, deswegen zu werfen, und das
       machte die Funktion an solchen Stellen unbenutzbar. */
    const q = quelle(5);
    const raus = await alleSeiten(
      q.seite, () => Promise.resolve({ count: null, error: null }), "Test",
    );
    expect(raus).toHaveLength(5);
  });
});
