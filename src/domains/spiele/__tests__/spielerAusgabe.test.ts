/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/__tests__/spielerAusgabe.test.ts

   Die Spielerliste für WordPress. Drei Entscheidungen werden hier
   festgehalten, und alle drei kamen aus einer Messung:

   1. ⚠ ALLE Mannschaften je Spieler, nicht die erste. 27 der 287
      laufen in zwei Mannschaften auf. `offeneZuordnungen()` behält
      nur die erste — für die Maske reicht das, für eine Liste zum
      Abhaken nicht.

   2. ⚠ Spieler OHNE Namen stehen in der Textliste, markiert. Am
      22.08.2026 lieferte der Verband zu 48 von 177 keinen — 27 %.
      Wegzulassen wäre die stille Variante.

   3. ⚠ In der Importdatei stehen sie NICHT. Ein WordPress-Entwurf
      ohne Titel ist Müll im Backend. Wie viele fehlen, muss die
      Oberfläche sagen — deshalb gibt `alsWxr` die Zahl zurück.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { baueSpielerZeilen, alsTextliste, alsWxr, OHNE_NAMEN } from "../spielerAusgabe.ts";
import type { AufstellungZeile } from "../matchdatenAnzeige.ts";

const z = (person: number, team: number | null, nr: number | null, spiel = "s1"): AufstellungZeile =>
  ({ sfv_person_id: person, sfv_team_id: team, rueckennr: nr, spiel_id: spiel });

const TEAMS = new Map([[1, "1. Mannschaft"], [2, "2. Mannschaft"]]);

describe("baueSpielerZeilen", () => {
  it("⚠ sammelt ALLE Mannschaften, nicht nur die erste", () => {
    /* Der gemessene Fall: 27 von 287 laufen in zwei Mannschaften auf,
       durchweg benachbarte Stufen. */
    const [zeile] = baueSpielerZeilen(
      [z(100, 1, 7, "a"), z(100, 2, 7, "b")], { 100: "Adrian Schmid" }, TEAMS);
    expect(zeile.teams).toEqual(["1. Mannschaft", "2. Mannschaft"]);
    expect(zeile.einsaetze).toBe(2);
  });

  it("⚠ sammelt ALLE Rückennummern — 58 laufen unter mehreren", () => {
    const [zeile] = baueSpielerZeilen(
      [z(100, 1, 7, "a"), z(100, 1, 13, "b")], { 100: "A" }, TEAMS);
    expect(zeile.rueckennummern).toEqual([7, 13]);
  });

  it("⚠ die Reihenfolge der Mannschaften ist stabil", () => {
    /* Sonst sieht dieselbe Person bei zwei Läufen verschieden aus, und wer
       zwei Listen vergleicht, sucht einen Unterschied, den es nicht gibt. */
    const a = baueSpielerZeilen([z(1, 2, null, "a"), z(1, 1, null, "b")], { 1: "X" }, TEAMS);
    const b = baueSpielerZeilen([z(1, 1, null, "a"), z(1, 2, null, "b")], { 1: "X" }, TEAMS);
    expect(a[0].teams).toEqual(b[0].teams);
  });

  it("eine unbekannte Mannschaft bekommt einen erkennbaren Platzhalter", () => {
    /* Nicht leer lassen: „Team 99" sagt, dass die Team-Zuordnung fehlt. */
    const [zeile] = baueSpielerZeilen([z(1, 99, null)], { 1: "X" }, TEAMS);
    expect(zeile.teams).toEqual(["Team 99"]);
  });
});

describe("alsTextliste", () => {
  it("⚠ nennt Spieler ohne Namen, statt sie wegzulassen", () => {
    const text = alsTextliste(baueSpielerZeilen(
      [z(100, 1, 7), z(200, 1, 9)], { 100: "Adrian Schmid" }, TEAMS));
    expect(text).toContain("Adrian Schmid");
    expect(text).toContain(OHNE_NAMEN);
    expect(text).toContain("200");
  });

  it("gruppiert nach Mannschaft", () => {
    const text = alsTextliste(baueSpielerZeilen(
      [z(1, 1, null), z(2, 2, null)], { 1: "Eins", 2: "Zwei" }, TEAMS));
    expect(text).toContain("1. Mannschaft");
    expect(text).toContain("2. Mannschaft");
    expect(text.indexOf("1. Mannschaft")).toBeLessThan(text.indexOf("2. Mannschaft"));
  });
});

describe("alsWxr", () => {
  it("⚠ trägt die sfv_person_id als postmeta — das ist der ganze Zweck", () => {
    const { xml } = alsWxr(baueSpielerZeilen([z(1339751, 1, 13)], { 1339751: "Adrian Schmid" }, TEAMS));
    expect(xml).toContain("<wp:meta_key>sfv_person_id</wp:meta_key>");
    expect(xml).toContain("1339751");
    expect(xml).toContain("<title>Adrian Schmid</title>");
  });

  it("⚠ legt Entwürfe an, nicht veröffentlichte Beiträge", () => {
    /* 287 auf einen Schlag veröffentlichte Spielerseiten mit Namen und ohne
       Foto hat niemand bestellt. */
    const { xml } = alsWxr(baueSpielerZeilen([z(1, 1, null)], { 1: "X" }, TEAMS));
    expect(xml).toContain("<wp:status>draft</wp:status>");
    expect(xml).not.toContain("publish");
  });

  it("⚠ lässt Spieler ohne Namen weg UND sagt wie viele", () => {
    /* Die Zahl ist der Punkt: ein Import mit 1 statt 3 Beiträgen, ohne dass
       jemand die Differenz erfährt, ist die stille Sorte. */
    const erg = alsWxr(baueSpielerZeilen(
      [z(1, 1, null), z(2, 1, null), z(3, 1, null)], { 1: "Nur einer" }, TEAMS));
    expect(erg.aufgenommen).toBe(1);
    expect(erg.uebergangen).toBe(2);
    expect(erg.xml).not.toContain("<title></title>");
  });

  it("⚠ maskiert XML-Sonderzeichen im Namen", () => {
    /* Ein Name mit & oder < zerreisst die Datei, und der WordPress-Importer
       sagt dann nicht, welche Zeile schuld ist. */
    const { xml } = alsWxr(baueSpielerZeilen([z(1, 1, null)], { 1: 'Ann & <Ben>' }, TEAMS));
    expect(xml).toContain("Ann &amp; &lt;Ben&gt;");
    expect(xml).not.toContain("<Ben>");
  });

  it("die Pflicht-Namensräume stehen im Kopf", () => {
    /* Ohne sie weist der Importer die Datei ab, ohne zu sagen warum. */
    const { xml } = alsWxr(baueSpielerZeilen([z(1, 1, null)], { 1: "X" }, TEAMS));
    for (const ns of ["xmlns:wp=", "xmlns:content=", "xmlns:excerpt=", "<wp:wxr_version>1.2"]) {
      expect(xml).toContain(ns);
    }
  });
});
