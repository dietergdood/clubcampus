/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/__tests__/vormerken.test.ts

   Das Vormerken erfasst nur GESPIELTE Spiele der GEWAEHLTEN Mannschaft.

   ⚠ Die Erwartungen nennen Werte, keine Laengen. `toHaveLength(6)` waere
   auch dann gruen, wenn sechs ganz andere Filter abgesetzt wuerden —
   und genau dann prueft der Fall nichts mehr.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { makeSb } from "../../members/__tests__/_mockSb.ts";
import { merkeGespielteVor, restStunden } from "../vormerkenService.ts";
import { MATCHDATEN_STATUS, VORGEMERKT_PLAETZE } from "../../../../supabase/functions/sfv-sync/matchdaten.ts";
import type { Sb } from "../../../types.ts";

const VEREIN = "11111111-1111-1111-1111-111111111111";
const TEAM = 38301;
/* Mitten in der Saison 2026/27 — die laeuft vom 01.07.2026 bis 30.06.2027. */
const JETZT = new Date("2026-09-27T10:00:00Z");

const drei = [{ id: "s-1" }, { id: "s-2" }, { id: "s-3" }];

/* ⚠ Die erwarteten Filter — als Werte, in der Reihenfolge des Aufrufs.
   Beide Abfragen tragen sie gleich: waere die Zaehlabfrage weiter
   gefasst als der Schreibvorgang, meldete die Gegenprobe im Dienst einen
   Verlust, den es nicht gibt. */
const ERWARTETE_FILTER = [
  { method: "eq", args: ["verein_id", VEREIN] },
  { method: "eq", args: ["sfv_team_id", TEAM] },
  { method: "in", args: ["sfv_status", [2]] },
  { method: "not", args: ["sfv_match_id", "is", null] },
  { method: "gte", args: ["date", "2026-07-01"] },
  { method: "lte", args: ["date", "2027-06-30"] },
];

function sbMitDrei() {
  return makeSb({
    "spiele.select": { data: drei },   // Zaehlabfrage: head:true -> count = 3
    "spiele.update": { data: drei },
  });
}

describe("merkeGespielteVor — erfasst nur gespielte Spiele der gewählten Mannschaft", () => {
  it("setzt genau die sechs Filter, mit den erwarteten Werten", async () => {
    const sb = sbMitDrei();
    await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    const schreib = sb.find("spiele", "update");
    expect(schreib).toBeDefined();
    expect(schreib!.filters).toEqual(ERWARTETE_FILTER);
  });

  it("zählt mit denselben Filtern wie es schreibt", async () => {
    const sb = sbMitDrei();
    await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(sb.find("spiele", "select")!.filters).toEqual(ERWARTETE_FILTER);
  });

  it("schreibt den Vormerk-Zeitstempel und sonst nichts", async () => {
    const sb = sbMitDrei();
    await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(sb.find("spiele", "update")!.payload)
      .toEqual({ matchdaten_vorgemerkt_am: JETZT.toISOString() });
  });

  /* ⚠ ⚠  DIE PRODUKTZUSAGE, ausgeschrieben statt als Konstante zitiert.
     Ein Forfait (3) ist kein gespieltes Spiel — dort wurde nicht
     gespielt. Und 5 „abgebrochen" ist ausdruecklich UNGEMESSEN: der
     Verband fuehrt dazu vielleicht Matchdaten, vielleicht nicht. Wer es
     hier hineinnaehme, beantwortete diese offene Frage durch die
     Hintertuer — und der Lauf holte die Spiele trotzdem nicht.

     Wird die Menge je erweitert, faellt dieser Fall um. Das ist die
     Absicht: die Erweiterung ist eine Entscheidung und kein Nebeneffekt. */
  it("merkt weder ein Forfait (3) noch ein abgebrochenes Spiel (5) vor", async () => {
    const sb = sbMitDrei();
    await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    const status = sb.find("spiele", "update")!.filters
      .find(f => f.method === "in" && f.args[0] === "sfv_status")!.args[1] as number[];
    expect(status).toEqual([2]);
    expect(status).not.toContain(3);
    expect(status).not.toContain(5);
  });

  /* ⚠ Und dieselbe Menge, die der Lauf holt. `matchdatenLauf.ts:105`
     filtert `.in("sfv_status", MATCHDATEN_STATUS)` — ein Spiel, das die
     Kachel vormerkt und der Lauf nicht holt, traegt eine Marke, die nie
     wieder verschwindet. Dieser Fall haelt die zwei Stellen zusammen;
     der Fall darueber haelt fest, welche Menge es ist. */
  it("nimmt dieselbe Statusmenge wie der Matchdaten-Lauf", async () => {
    const sb = sbMitDrei();
    await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(sb.find("spiele", "update")!.filters)
      .toContainEqual({ method: "in", args: ["sfv_status", MATCHDATEN_STATUS] });
  });
});

describe("merkeGespielteVor — was gemeldet wird", () => {
  it("nennt Zahl und Restzeit aus VORGEMERKT_PLAETZE", async () => {
    const sb = sbMitDrei();
    const e = await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(e.ok).toBe(true);
    expect(e.anzahl).toBe(3);
    /* 3 Spiele, 6 Plaetze je Stunde -> eine Stunde, und „Stunde" einzahl. */
    expect(e.stunden).toBe(1);
    expect(e.text).toBe("3 Spiele vorgemerkt, voraussichtlich fertig in etwa 1 Stunde.");
  });

  /* ⚠ Bei X = 0 keine Stundenangabe, sondern der Grund — und der Grund
     nennt den Zuschnitt. „Keine gespielten Spiele" allein liesse offen,
     ob nach der falschen Saison oder nach Spielen ohne Verbandsnummer
     gesucht wurde. */
  it("sagt bei null Treffern warum, ohne eine Dauer zu nennen", async () => {
    const sb = makeSb({ "spiele.select": { data: [] }, "spiele.update": { data: [] } });
    const e = await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(e.ok).toBe(true);
    expect(e.stunden).toBeNull();
    expect(e.text).toContain("2026/27");
    expect(e.text).toContain("kein ausgetragenes Spiel mit Verbandsnummer");
    expect(e.text).not.toContain("Stunde");
  });

  /* ⚠ ⚠  DER FALL, DEN `error` NICHT FINDET. Ein `update`, das keine
     Zeile trifft, ist fuer PostgREST kein Fehler — `error` bleibt `null`.
     Hier sind drei Zeilen lesbar und null wurden geschrieben: das ist ein
     Schreibrecht und keine Datenlage, und die Meldung sagt es. */
  it("meldet es, wenn Zeilen lesbar sind und trotzdem keine geschrieben wurde", async () => {
    const sb = makeSb({
      "spiele.select": { data: drei },
      "spiele.update": { data: [] },     // getroffen: nichts, ohne Fehler
    });
    const e = await merkeGespielteVor(sb as unknown as Sb, VEREIN, TEAM, JETZT);

    expect(e.ok).toBe(false);
    expect(e.anzahl).toBe(0);
    expect(e.gefunden).toBe(3);
    expect(e.stunden).toBeNull();
    expect(e.text).toContain("Schreibrecht");
  });

  it("schreibt gar nicht, wenn keine Mannschaft gewählt ist", async () => {
    const sb = sbMitDrei();
    const e = await merkeGespielteVor(sb as unknown as Sb, VEREIN, null, JETZT);

    expect(e.ok).toBe(false);
    expect(sb.find("spiele", "update")).toBeUndefined();
  });
});

describe("restStunden", () => {
  it("rechnet aufgerundet gegen VORGEMERKT_PLAETZE", () => {
    expect(VORGEMERKT_PLAETZE).toBe(6);   // Bezugsgrösse der Zahlen darunter
    expect(restStunden(0)).toBe(0);
    expect(restStunden(1)).toBe(1);
    expect(restStunden(6)).toBe(1);
    expect(restStunden(7)).toBe(2);
    expect(restStunden(13)).toBe(3);
  });
});
