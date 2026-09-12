/* ═══════════════════════════════════════════════════════════════════
   Die Vorschau auf den Personenlauf.

   ⚠ ⚠  SIE ENTSCHEIDET, OB JEMAND DRÜCKT. Doppelte Personen drüben sind
   von Hand zusammenzuführen — die Zahl `ohne_treffer` ist die einzige,
   die vorher sagt, wie viele entstehen.

   ⚠  Die Zahlen hier sind ERFUNDEN. Das steht da, weil in dieser Runde
   drei Zahlen durch drei Hände gegangen sind, ohne ihre Herkunft
   mitzutragen. **Eine Zahl in einem Testfall ist eine Vorgabe, dieselbe
   Zahl in einem Satz eine Behauptung.**
   ═══════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  baueAbgleich, deuteAbgleich, namensschluessel, ordneEin,
  type UnserePerson, type DruebenMerkmal,
} from "../personenAbgleich.ts";

const u = (id: string, p: Partial<UnserePerson> = {}): UnserePerson =>
  ({ id, sfv_person_id: null, email_hash: null, name_hash: null, ...p });
const d = (p: Partial<DruebenMerkmal> = {}): DruebenMerkmal =>
  ({ sfv_person_id: null, email_hash: null, name_hash: null, ...p });

describe("namensschluessel — beide Seiten müssen ihn gleich bilden", () => {
  it("⚠ sortiert, weil „Anna Meier\" und „Meier Anna\" derselbe Mensch sind", () => {
    expect(namensschluessel("Anna Meier")).toBe(namensschluessel("Meier Anna"));
  });

  it("löst Umlaute auf und wirft alles andere weg", () => {
    expect(namensschluessel("Jürg Müller-Bär")).toBe("baer juerg mueller");
  });

  it("⚠ nur ä ö ü ß werden aufgelöst — jeder andere Akzent fällt weg", () => {
    /* Gemessen gegen die PHP-Fassung am 11.09.2026: beide Seiten tun
       dasselbe, also trifft der Vergleich. Aber Lea und Léa ergeben
       verschiedene Schlüssel — es findet WENIGER, nie mehr. */
    expect(namensschluessel("Léa Brien")).toBe("a brien l");
    expect(namensschluessel("Lea Brien")).not.toBe(namensschluessel("Léa Brien"));
  });

  it("⚠ verschiedene Menschen bleiben verschieden", () => {
    expect(namensschluessel("Anna Meier")).not.toBe(namensschluessel("Anna Meyer"));
  });
});

describe("baueAbgleich — fünf Gruppen", () => {
  it("⚠ die Nummer schlägt jede Schreibweise", () => {
    /* Dieselbe Person, drüben mit Nummer UND abweichendem Namen. */
    const e = baueAbgleich(
      [u("a", { sfv_person_id: 1097318, name_hash: "anders" })],
      [d({ sfv_person_id: "1097318", name_hash: "voellig-anders" })],
    );
    expect(e.treffer_sfv).toBe(1);
    expect(e.treffer_name).toBe(0);
    /* ⚠ Und sie zählt NICHT zusätzlich als „drüben unbekannt". */
    expect(e.personen_ohne_uns).toBe(0);
  });

  it("die Ebenen greifen in der Reihenfolge, jede nur einmal", () => {
    const e = baueAbgleich(
      [u("a", { sfv_person_id: 1 }), u("b", { email_hash: "m" }), u("c", { name_hash: "n" })],
      [d({ sfv_person_id: "1" }), d({ email_hash: "m" }), d({ name_hash: "n" })],
    );
    expect([e.treffer_sfv, e.treffer_email, e.treffer_name]).toEqual([1, 1, 1]);
    expect(e.ohne_treffer).toBe(0);
  });

  it("⚠ ohne_treffer ist die Zahl, die zählt — neue Datensätze", () => {
    const e = baueAbgleich(
      [u("a"), u("b", { email_hash: "x" }), u("c", { name_hash: "y" })],
      [d({ sfv_person_id: "99" })],
    );
    expect(e.ohne_treffer).toBe(3);
  });

  it("⚠ personen_ohne_uns ist der stille Rest, der auseinanderläuft", () => {
    const e = baueAbgleich(
      [u("a", { sfv_person_id: 1 })],
      [d({ sfv_person_id: "1" }), d({ sfv_person_id: "2" }), d({ name_hash: "fremd" })],
    );
    expect(e.personen_ohne_uns).toBe(2);
  });

  it("⚠ ⚠ die Aufteilung MUSS aufgehen — sie prüft sich selbst", () => {
    const unsere = [
      u("a", { sfv_person_id: 1 }), u("b", { email_hash: "m" }),
      u("c", { name_hash: "n" }), u("d"), u("e"),
    ];
    const e = baueAbgleich(unsere, [d({ sfv_person_id: "1" }), d({ email_hash: "m" })]);
    expect(e.treffer_sfv + e.treffer_email + e.treffer_name + e.ohne_treffer)
      .toBe(e.gesendet);
  });

  it("leere Mengen ergeben Nullen, keine Ausnahme", () => {
    const e = baueAbgleich([], []);
    expect(e).toEqual({
      gesendet: 0, treffer_sfv: 0, treffer_email: 0, treffer_name: 0,
      ohne_treffer: 0, personen_ohne_uns: 0,
      ohne_treffer_liste: [], ohne_uns_liste: [],
    });
  });

  it("⚠ null-Merkmale treffen nie — auch nicht gegen andere nulls", () => {
    /* Beide Seiten ohne Merkmal: das darf KEIN Treffer sein, sonst gälte
       jede merkmalslose Person als bekannt. */
    const e = baueAbgleich([u("a")], [d()]);
    expect(e.ohne_treffer).toBe(1);
    expect(e.personen_ohne_uns).toBe(1);
  });
});

describe("deuteAbgleich — Zahlen mit ihrer Bedeutung", () => {
  it("⚠ jede Zahl steht da, auch die Null", () => {
    const zeilen = deuteAbgleich(baueAbgleich([], [])).join(" | ");
    expect(zeilen).toMatch(/0 Personen würden gesendet/);
    expect(zeilen).toMatch(/0 über die Verbandsnummer/);
    expect(zeilen).toMatch(/keine neuen Datensätze/);
  });

  it("⚠ ohne_treffer bekommt seinen Satz, nicht nur seine Zahl", () => {
    const e = baueAbgleich([u("a"), u("b")], []);
    expect(deuteAbgleich(e).join(" | ")).toMatch(/2 fallen durch alle drei — so viele Datensätze entstehen NEU/);
  });

  it("⚠ ⚠ eine Aufteilung, die nicht aufgeht, sagt es in der ANTWORT", () => {
    /* Von Hand verdreht — so kann keine echte Rechnung aussehen, und
       genau deshalb muss die Anzeige es melden statt es zu zeigen. */
    const kaputt = {
      gesendet: 10, treffer_sfv: 1, treffer_email: 1, treffer_name: 1,
      ohne_treffer: 1, personen_ohne_uns: 0,
      ohne_treffer_liste: [], ohne_uns_liste: [],
    };
    expect(deuteAbgleich(kaputt).join(" | "))
      .toMatch(/Die Aufteilung geht nicht auf: 4 statt 10/);
  });
});

describe("ordneEin — die Gegenrichtung, und nur eine Gruppe ist ein Befund", () => {
  const h = (x: string) => x;

  it("wen wir kennen und bewusst nicht senden, ist gefiltert", () => {
    const e = ordneEin([{ name_hash: h("eltern") }], new Set(["eltern"]), new Set());
    expect(e).toMatchObject({ gefiltert: 1, uebersehen: 0, fremd: 0 });
  });

  it("wen wir gar nicht kennen, ist fremd — von Hand drüben angelegt", () => {
    const e = ordneEin([{ name_hash: h("unbekannt") }], new Set(["eltern"]), new Set());
    expect(e).toMatchObject({ gefiltert: 0, uebersehen: 0, fremd: 1 });
  });

  it("⚠ ohne Hash ist es fremd — aber aus einem anderen Grund", () => {
    /* Wir WISSEN es nicht, statt es zu wissen. Die Zahl wirft beides
       zusammen; die Liste der Übersehenen bleibt davon frei. */
    const e = ordneEin([{ name_hash: null }], new Set(), new Set());
    expect(e).toMatchObject({ fremd: 1, uebersehen: 0 });
    expect(e.uebersehen_liste).toEqual([]);
  });

  it("⚠ ⚠ gesendet UND als „ohne uns\" gezählt ist ein Widerspruch — er fällt auf", () => {
    /* Eine Zahl, die nicht stimmen kann, soll sichtbar sein statt
       weggerundet: sie zählt als übersehen und steht in der Liste. */
    const e = ordneEin([{ name_hash: h("x") }], new Set(), new Set(["x"]));
    expect(e.uebersehen).toBe(1);
    expect(e.uebersehen_liste).toEqual([{ name_hash: "x" }]);
  });

  it("leere Eingabe ergibt drei Nullen, keine Ausnahme", () => {
    expect(ordneEin([], new Set(), new Set()))
      .toEqual({ gefiltert: 0, uebersehen: 0, fremd: 0, uebersehen_liste: [] });
  });
});
