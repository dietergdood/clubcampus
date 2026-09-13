/* ═══════════════════════════════════════════════════════════════
   ClubCampus — spielerVorschlag.test.ts

   ⚠ DIE ZWEI SCHUTZREGELN SIND DER GEGENSTAND, nicht die
   Trefferquote. Ein Vorschlag, der oft richtig ist, aber im
   Zweifel raet, ist schlechter als einer, der seltener trifft und
   schweigt — `sfv_zuordnung` ist die Quelle jeder kuenftigen
   Statistik, und ein falscher Treffer sieht danach aus wie eine
   Zuordnung von Hand.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { schlageVor, schlageAlleVor } from "../spielerVorschlag.ts";
import type { VorschlagKandidat, OffenerSpieler } from "../spielerVorschlag.ts";

const M = (ueber: Partial<VorschlagKandidat> = {}): VorschlagKandidat => ({
  id: "1", vorname: "Anna", nachname: "Meier",
  geburtsdatum: "2011-03-14", teams: ["Da-Junioren"], ...ueber,
});
const S = (ueber: Partial<OffenerSpieler> = {}): OffenerSpieler => ({
  sfv_person_id: 500, name: "Anna Meier", jahrgang: 2011,
  team: "Da-Junioren", ...ueber,
});

describe("schlageVor — die Schutzregeln", () => {
  it("schweigt bei zwei Namensgleichen, die der Jahrgang nicht trennt", () => {
    /* ⚠ DER WICHTIGSTE FALL. Zwei Adrian Schmid gibt es in diesem
       Verein wirklich (gemessen 23.08.2026), und bei genau diesen
       zwei wuerde ein falscher Treffer am wenigsten auffallen. */
    const r = schlageVor(S({ jahrgang: null }), [
      M({ id: "1", geburtsdatum: "2011-01-01" }),
      M({ id: "2", geburtsdatum: "2012-01-01" }),
    ]);
    expect(r.art).toBe("keiner");
    expect(r.grund).toContain("entscheidet ein Mensch");
  });

  it("schweigt auch dann, wenn BEIDE denselben Jahrgang tragen", () => {
    /* Der Jahrgang trennt hier nichts — und dann darf er auch
       nichts entscheiden. */
    const r = schlageVor(S(), [
      M({ id: "1", geburtsdatum: "2011-05-05" }),
      M({ id: "2", geburtsdatum: "2011-09-09" }),
    ]);
    expect(r.art).toBe("keiner");
  });

  it("trennt zwei Namensgleiche, wenn der Jahrgang es kann", () => {
    const r = schlageVor(S({ jahrgang: 2012 }), [
      M({ id: "1", geburtsdatum: "2011-01-01" }),
      M({ id: "2", geburtsdatum: "2012-01-01" }),
    ]);
    expect(r).toEqual({ art: "treffer", mitglied_id: "2",
      grund: "Mannschaft Da-Junioren · Name · Jahrgang 2012 — bitte prüfen." });
  });

  it("verwirft niemanden, dem UNSER Jahrgang fehlt", () => {
    /* ⚠ Ein fehlender Jahrgang darf nicht ausschliessen: die Form
       von `birthDate` beim Verband ist ungemessen. Er fuehrt dann
       zu zwei Kandidaten — und dann schweigt die Funktion. Das ist
       die sichere Richtung, sie findet weniger, nie mehr. */
    const r = schlageVor(S({ jahrgang: 2012 }), [
      M({ id: "1", geburtsdatum: null }),
      M({ id: "2", geburtsdatum: "2012-01-01" }),
    ]);
    expect(r.art).toBe("keiner");
  });
});

describe("schlageVor — die Mannschaft schneidet zu", () => {
  it("nimmt den Gleichnamigen aus der richtigen Mannschaft", () => {
    const r = schlageVor(S({ jahrgang: null }), [
      M({ id: "1", teams: ["Ea-Junioren"], geburtsdatum: null }),
      M({ id: "2", teams: ["Da-Junioren"], geburtsdatum: null }),
    ]);
    expect(r).toEqual({ art: "treffer", mitglied_id: "2",
      grund: "Mannschaft Da-Junioren · Name — bitte prüfen." });
  });

  it("nennt den Grund, wenn der Name da ist und die Mannschaft nicht", () => {
    /* ⚠ Die zwei Faelle verlangen Verschiedenes: hier fehlt ein
       Kadereintrag, dort die Person. Eine Zeile, die nur schweigt,
       ist von einer nicht geprueften nicht zu unterscheiden. */
    const r = schlageVor(S(), [M({ teams: ["Ea-Junioren"] })]);
    expect(r.art).toBe("keiner");
    expect(r.grund).toContain("Nicht im Kader von Da-Junioren");
  });

  it("arbeitet weiter, wenn UNSERE Mannschaft unbekannt ist", () => {
    /* Ein Abbruch liesse genau die Spieler ohne Vorschlag, deren
       Team-Zuordnung noch fehlt — also die, die am meisten warten. */
    const r = schlageVor(S({ team: null }), [M({ teams: [] })]);
    expect(r).toEqual({ art: "treffer", mitglied_id: "1",
      grund: "Name · Jahrgang 2011 — bitte prüfen." });
  });
});

describe("schlageVor — der Namensschluessel", () => {
  it("trifft ueber die Reihenfolge hinweg", () => {
    expect(schlageVor(S({ name: "Meier Anna" }), [M()]).art).toBe("treffer");
  });

  it("loest Umlaute auf, wie beide Seiten es tun", () => {
    const r = schlageVor(S({ name: "Jürg Müller" }),
      [M({ vorname: "Juerg", nachname: "Mueller" })]);
    expect(r.art).toBe("treffer");
  });

  it("trifft NICHT bei Lea gegen Lea mit Akzent", () => {
    /* ⚠ Die bekannte Grenze: nur ae oe ue ss werden aufgeloest,
       jeder andere Akzent wird weggeworfen. Das ist die sichere
       Richtung — es findet weniger, nie mehr —, und es steht hier
       als Fall, damit niemand es fuer einen Defekt haelt. */
    const r = schlageVor(S({ name: "Léa Meier" }), [M({ vorname: "Lea" })]);
    expect(r.art).toBe("keiner");
  });

  it("schweigt, wenn der Verband keinen Namen nennt", () => {
    const r = schlageVor(S({ name: "  " }), [M()]);
    expect(r.grund).toContain("keinen Namen");
  });

  it("nennt kein Mitglied, wo keines ist", () => {
    const r = schlageVor(S({ name: "Niemand Unbekannt" }), [M()]);
    expect(r.grund).toBe("Kein Mitglied dieses Namens.");
  });
});

describe("schlageAlleVor", () => {
  it("die Aufteilung geht auf", () => {
    /* ⚠ `mit + ohne === spieler.length`. Eine Aufteilung, die
       aufgehen muss, prueft sich selbst; eine einzelne Zahl kann
       nur behauptet werden. */
    const spieler = [
      S({ sfv_person_id: 1 }),
      S({ sfv_person_id: 2, name: "Niemand Unbekannt" }),
      S({ sfv_person_id: 3, name: "Anna Meier", jahrgang: null }),
    ];
    const r = schlageAlleVor(spieler, [
      M({ id: "1" }), M({ id: "2", geburtsdatum: "2012-01-01" }),
    ]);
    expect(r.mit + r.ohne).toBe(spieler.length);
    expect(r.vorschlaege.size).toBe(spieler.length);
  });

  it("gibt fuer JEDEN Spieler einen Eintrag — auch ohne Treffer", () => {
    /* Ein fehlender Eintrag und „kein Vorschlag" sehen in der
       Maske gleich aus. Es gibt immer einen, mit Grund. */
    const r = schlageAlleVor([S({ name: "Niemand Unbekannt" })], [M()]);
    expect(r.vorschlaege.get(500)?.art).toBe("keiner");
    expect(r.vorschlaege.get(500)?.grund).toBeTruthy();
  });
});
