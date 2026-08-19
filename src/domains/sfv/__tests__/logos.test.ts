import { describe, it, expect } from "vitest";
import {
  ausBase64, erkenneBild, logoPfad, offeneLogos, LOGOS_PRO_LAUF, WIEDERHOLUNG_TAGE,
} from "../../../../supabase/functions/sfv-sync/logos.ts";

const b = (...bytes: number[]) => new Uint8Array([...bytes, ...new Array(16).fill(0)]);

describe("erkenneBild — Typ aus den Magic Bytes", () => {
  it("erkennt die Formate, die der SFV tatsächlich liefert", () => {
    /* An echten Daten geprüft (Probe 20.08.2026): FCH liefert GIF89a,
       FC Oberland United JPEG. Wer image/jpeg annimmt, zeigt bei manchen
       Vereinen nichts. */
    expect(erkenneBild(b(0x47, 0x49, 0x46, 0x38))).toEqual({ mime: "image/gif", endung: "gif" });
    expect(erkenneBild(b(0xff, 0xd8, 0xff, 0xe0))).toEqual({ mime: "image/jpeg", endung: "jpg" });
    expect(erkenneBild(b(0x89, 0x50, 0x4e, 0x47))).toEqual({ mime: "image/png", endung: "png" });
  });

  it("erkennt WEBP an RIFF und WEBP zusammen", () => {
    const webp = new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50,0,0,0,0]);
    expect(erkenneBild(webp)?.endung).toBe("webp");
    /* RIFF allein ist eine Audiodatei, kein Bild. */
    const riff = new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x41,0x56,0x45,0,0,0,0]);
    expect(erkenneBild(riff)).toBeNull();
  });

  it("legt nichts ab, was kein bekanntes Bild ist", () => {
    expect(erkenneBild(b(0x3c, 0x21, 0x44, 0x4f))).toBeNull();   // "<!DO…" — HTML
    expect(erkenneBild(new Uint8Array([]))).toBeNull();
  });
});

describe("ausBase64", () => {
  it("dekodiert den Körper, wie der SFV ihn schickt", () => {
    /* Ohne data:-Präfix, ohne Anführungszeichen — so kam er in der Probe. */
    const bytes = ausBase64("R0lGODlhAQABAAAAACwAAAAAAQABAAA=")!;
    expect([...bytes.subarray(0, 4)]).toEqual([0x47, 0x49, 0x46, 0x38]);
  });

  it("verträgt Anführungszeichen und data:-Präfix", () => {
    /* Beides kommt heute nicht — aber eine Antwort, die sich morgen anders
       verpackt, soll nicht still Unsinn ablegen. */
    for (const t of ['"R0lGODlhAQABAAAAACwAAAAAAQABAAA="',
                     "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="]) {
      expect([...ausBase64(t)!.subarray(0, 4)]).toEqual([0x47, 0x49, 0x46, 0x38]);
    }
  });

  it("liefert null bei zu kurzem oder kaputtem Inhalt", () => {
    expect(ausBase64("")).toBeNull();
    expect(ausBase64("kurz")).toBeNull();
  });
});

describe("offeneLogos — was dieser Lauf holt", () => {
  const jetzt = new Date("2026-08-20T12:00:00Z");
  const tageHer = (n: number) =>
    new Date(jetzt.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it("holt, was noch nie versucht wurde", () => {
    expect(offeneLogos([100, 200], [], jetzt).sort()).toEqual([100, 200]);
  });

  it("holt nie erneut, was schon liegt", () => {
    /* Ein Wappen ändert sich alle zehn Jahre. */
    const bekannt = [{ sfv_team_id: 100, pfad: "v1/100.gif", fehlt_seit: null }];
    expect(offeneLogos([100], bekannt, jetzt)).toEqual([]);
  });

  it("wartet die Frist ab, bevor es erneut fragt", () => {
    const frisch = [{ sfv_team_id: 100, pfad: null, fehlt_seit: tageHer(3) }];
    expect(offeneLogos([100], frisch, jetzt)).toEqual([]);
  });

  it("fragt nach Ablauf der Frist erneut", () => {
    /* Ein Verein, der sein Wappen nachträgt, soll es innerhalb der Saison
       zeigen — nicht erst im nächsten Juli. */
    const alt = [{ sfv_team_id: 100, pfad: null, fehlt_seit: tageHer(WIEDERHOLUNG_TAGE + 1) }];
    expect(offeneLogos([100], alt, jetzt)).toEqual([100]);
  });

  it("fragt sofort, wenn ein Versuch ohne Vermerk zurückblieb", () => {
    const halb = [{ sfv_team_id: 100, pfad: null, fehlt_seit: null }];
    expect(offeneLogos([100], halb, jetzt)).toEqual([100]);
  });

  it("fragt jede Team-Id nur einmal pro Lauf", () => {
    /* Dieselbe Mannschaft steht in mehreren Spielen. */
    expect(offeneLogos([100, 100, 100], [], jetzt)).toEqual([100]);
  });

  it("übergeht fehlende Ids", () => {
    expect(offeneLogos([NaN, 100], [], jetzt)).toEqual([100]);
  });
});

describe("logoPfad", () => {
  it("stellt die verein_id voran", () => {
    /* Sonst überschreibt ein Mandant dem anderen die Datei — womöglich mit
       einem anderen Format unter derselben Endung. */
    expect(logoPfad("v1", 78342, "jpg")).toBe("v1/78342.jpg");
  });
});

describe("Obergrenze pro Lauf", () => {
  const jetzt = new Date("2026-08-20T12:00:00Z");

  it("holt höchstens LOGOS_PRO_LAUF auf einmal", () => {
    /* Der erste Lauf am 20.08.2026 holte 217 Wappen in einem Zug: die
       Kandidaten kommen aus ALLEN Spielen der Saison, nicht nur den
       ausgetragenen. Richtig, aber ein Ausschlag — und Rate Limits sind
       beim SFV nicht dokumentiert. */
    const viele = Array.from({ length: 217 }, (_, i) => 1000 + i);
    expect(offeneLogos(viele, [], jetzt)).toHaveLength(LOGOS_PRO_LAUF);
  });

  it("holt den Rest beim nächsten Lauf", () => {
    const viele = Array.from({ length: 40 }, (_, i) => 1000 + i);
    const ersteRunde = offeneLogos(viele, [], jetzt);
    const abgelegt = ersteRunde.map(id => ({ sfv_team_id: id, pfad: `v/${id}.gif`, fehlt_seit: null }));
    expect(offeneLogos(viele, abgelegt, jetzt)).toHaveLength(40 - LOGOS_PRO_LAUF);
  });
});
