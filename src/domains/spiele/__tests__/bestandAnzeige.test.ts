/* ═══════════════════════════════════════════════════════════════════
   Die drei Zustände der Bestands-Auskunft.

   ⚠ ⚠  ANLASS, 11.09.2026. Die Karte zeigte `0 Personen · 0 mit
   Verbandsnummer · 0 ohne`, während drüben 129 standen — und es gab zwei
   plausible Erklärungen, die in der Anzeige gleich aussahen:

     · drüben läuft eine ältere Fassung, die die Frage nicht kennt
     · den Beitragstyp `fch_person` gibt es dort nicht
     · es stehen wirklich null da

   **Drei Fälle, zwei Äste.** `vorhanden === false` war eingebaut, um den
   zweiten vom dritten zu trennen — und der ERSTE fiel durch, weil ein
   fehlender Schlüssel `undefined` ergibt und nicht `false`.

   > Eine Auskunft, die eine unbekannte Frage mit „null" beantwortet statt
   > mit „kenne ich nicht", ist derselbe Fehler wie eine leere Menge im
   > Gut-Zweig. (Didi, 11.09.2026)

   ⚠ Diese Datei ist der Beleg, den der Fall verlangt hat: die Deutung wird
   gegen eine ALTE Antwort gehalten, nicht gegen eine Beschreibung davon.
   ═══════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { deuteBestand } from "../bestandAnzeige.ts";

/** Was die Fassung vor 0.9.18 zurückgibt — ohne `personen`, ohne `teams`. */
const ALT = {
  gesamt: 270,
  ohne_laufstempel: 0,
  ohne_laufstempel_sichtbar: 0,
  handbeitraege: 0,
};

/* ⚠ ⚠ DIE ZAHLEN HIER SIND ERFUNDEN, UND DAS STEHT MIT ABSICHT DA.
   129 und 24 stammen aus einer Nachricht, nicht aus einer Messung — sie
   sind in dieser Runde durch drei Haende gegangen, ohne dass eine ihre
   Herkunft mitgetragen haette. In einer Attrappe ist das folgenlos; in
   einem Bericht war es das nicht.

   **Eine Zahl in einem Testfall ist eine Vorgabe. Dieselbe Zahl in einem
   Satz ist eine Behauptung.** */
const NEU = {
  ...ALT,
  empfaenger: "wp-export-empfaenger.php",
  version: "0.9.19",
  personen: { vorhanden: true, gesamt: 129, mit_nummer: 0, ohne_nummer: 129, nummern: [] },
  teams: { gesamt: 24, mit_sfv_id: 21, sfv_id_doppelt: 0, ohne_sfv_id: 3 },
};

describe("deuteBestand — drei Zustände, nicht zwei", () => {
  it("⚠ eine ALTE Antwort ergibt „kenne ich nicht\", nicht null", () => {
    const zeilen = deuteBestand(ALT).join(" | ");
    /* Der Kern: keine erfundene Null. */
    expect(zeilen).not.toMatch(/0 Personen stehen drüben/);
    expect(zeilen).not.toMatch(/0 Teams/);
    expect(zeilen).toMatch(/kennt Personen und Teams nicht/);
    /* Und sie sagt, woran es liegt — nicht nur, dass etwas fehlt. */
    expect(zeilen).toMatch(/Fassung vor 0\.9\.18/);
  });

  it("⚠ und sie meldet, dass die Antwort keine Fassung nennt", () => {
    expect(deuteBestand(ALT).join(" | ")).toMatch(/nennt keine Fassung/);
  });

  it("ein fehlender Beitragstyp ist etwas anderes als ein leerer Bestand", () => {
    const zeilen = deuteBestand({ ...NEU, personen: { vorhanden: false } }).join(" | ");
    expect(zeilen).toMatch(/gibt es drüben nicht — nicht gezählt, nicht leer/);
    expect(zeilen).not.toMatch(/0 Personen stehen drüben/);
  });

  it("echte Zahlen erscheinen als Zahlen — jede, auch die Null", () => {
    const zeilen = deuteBestand(NEU).join(" | ");
    expect(zeilen).toMatch(/129 Personen stehen drüben · 0 mit Verbandsnummer · 129 ohne/);
    expect(zeilen).toMatch(/24 Teams · 21 mit SFV-Nummer · 3 ohne/);
  });

  it("⚠ und die Zahl, die zählt, bekommt ihre Bedeutung daneben", () => {
    /* „129 ohne Nummer" ist eine Zahl; „nie erreichbar" ist eine Auskunft. */
    expect(deuteBestand(NEU).join(" | ")).toMatch(/über die Nummer nie erreichbar/);
  });

  it("wer geantwortet hat, steht in der Auskunft", () => {
    expect(deuteBestand(NEU).join(" | "))
      .toMatch(/Geantwortet hat wp-export-empfaenger\.php 0\.9\.19/);
  });

  it("⚠ ein echter Nullbestand sagt null — und ist vom Unbekannten unterscheidbar", () => {
    const leer = { ...NEU, personen: { vorhanden: true, gesamt: 0, mit_nummer: 0, ohne_nummer: 0 } };
    const zeilen = deuteBestand(leer).join(" | ");
    expect(zeilen).toMatch(/0 Personen stehen drüben/);
    expect(zeilen).not.toMatch(/kennt Personen und Teams nicht/);
    /* Ohne Personen ohne Nummer auch kein Warnsatz — sonst warnt sie ins Leere. */
    expect(zeilen).not.toMatch(/nie erreichbar/);
  });
});
