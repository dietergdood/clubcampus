/* ═══════════════════════════════════════════════════════════════
   Der Link zur Verbandsseite und der Satz daneben.

   ⚠ ANLASS, 14.09.2026: 21 von 42 Mannschaften haben keinen
   Spielplan, weil der Verband sie nicht über die Schnittstelle
   führt. Gemessen, nicht vermutet.

   > Eine Mannschaftsseite ohne Spielplan sieht aus wie eine, bei
   > der etwas kaputt ist.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { verbandsLinkTeam, verbandsLinkVerein, spielplanHinweis }
  from "../verbandslink.ts";

const FCH = { sfv_club_id: 1516, sfv_verband_oid: 11 };

describe("der Link", () => {
  it("baut die Teamadresse aus Verein, Verband und Mannschaft", () => {
    expect(verbandsLinkTeam(FCH, 38301))
      .toBe("https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1&t=38301&a=trr");
  });

  it("gibt KEINEN halben Link, wenn eine Angabe fehlt", () => {
    /* ⚠ Ein Link ohne `v=` führt auf eine fremde oder leere Seite —
       und das sieht aus wie ein Defekt UNSERER Seite. Lieber kein
       Link als einer, der ins Leere führt. */
    expect(verbandsLinkTeam({ sfv_club_id: null, sfv_verband_oid: 11 }, 38301)).toBeNull();
    expect(verbandsLinkTeam({ sfv_club_id: 1516, sfv_verband_oid: null }, 38301)).toBeNull();
    expect(verbandsLinkTeam(FCH, null)).toBeNull();
    expect(verbandsLinkTeam(null, 38301)).toBeNull();
  });

  it("die Vereinsseite kommt ohne Mannschaftsnummer aus", () => {
    /* Sie ist der einzige Link, den es für die 21 gibt. */
    expect(verbandsLinkVerein(FCH))
      .toBe("https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1");
    expect(verbandsLinkVerein({ sfv_club_id: 1516 })).toBeNull();
  });
});

describe("der Satz — drei Lagen, drei Antworten", () => {
  it("schweigt, wenn es Spiele gibt", () => {
    expect(spielplanHinweis(38301, 12, FCH)).toBeNull();
    /* Auch ohne Nummer: wo Spiele stehen, ist nichts zu erklären. */
    expect(spielplanHinweis(null, 3, FCH)).toBeNull();
  });

  it("ohne Nummer: Turnierform, und das ist der Normalfall", () => {
    const h = spielplanHinweis(null, 0, FCH)!;
    expect(h.satz).toMatch(/spielt in Turnierform/);
    expect(h.satz).toMatch(/nicht über die Schnittstelle/);
    /* Die Vereinsseite, weil es keine Teamadresse geben kann. */
    expect(h.link).toBe("https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1");
  });

  it("⚠ MIT Nummer und ohne Spiele ist eine ANDERE Lage", () => {
    /* Die zweite als die erste auszugeben wäre die Einebnung, die
       dieses Projekt an einem Dutzend Stellen teuer bezahlt hat:
       hier IST die Mannschaft zugeordnet, und der Verband liefert
       trotzdem nichts. Das ist ein Befund, kein Normalfall. */
    const h = spielplanHinweis(38301, 0, FCH)!;
    expect(h.satz).toMatch(/kein Spiel eingetragen/);
    expect(h.satz).toMatch(/Die Zuordnung steht/);
    expect(h.satz).not.toMatch(/Turnierform/);
    expect(h.link).toMatch(/t=38301/);
  });

  it("der Satz steht auch ohne Link", () => {
    /* ⚠ Fehlt die ClubId-Spalte, fällt der Link weg — der Satz nicht.
       Er ist der Teil, der die Ununterscheidbarkeit behebt. */
    const h = spielplanHinweis(null, 0, null)!;
    expect(h.satz).toMatch(/Turnierform/);
    expect(h.link).toBeNull();
  });
});
