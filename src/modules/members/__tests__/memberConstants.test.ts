/* ═══════════════════════════════════════════════════════════════
   ClubCampus — memberConstants: die 29 Spalten der Mitgliederliste

   ⚠ WOZU DIESE DATEI. Am 22.08.2026 sind die 20 personengebundenen
   Spalten nach `shared/person/personSpalten.ts` gezogen, damit die
   Eltern-, Supporter- und Archivliste dieselben verwenden. Beim Umzug
   darf die Mitgliederliste NICHTS verlieren — und ein Verlust wäre
   still:

   `mitglieder_ansichten.spalten` speichert die Schlüssel als TEXT.
   Ein Schlüssel ohne Definition wird beim Rendern übersprungen —
   kein Fehler, keine Meldung. Die gespeicherte Ansicht sieht danach
   aus, als hätte der Nutzer sie so angelegt.

   ⚠ DIESER FALL ZAEHLT NICHT, ER NENNT. `toHaveLength(29)` bestünde
   auch, wenn zwei Schlüssel vertauscht oder umbenannt wären. Die
   Tabelle unten ist aus dem Stand VOR dem Umzug erzeugt und hält
   Gruppe, Schlüssel, Beschriftung und Vorgaben fest.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { COL_GROUPS, ALL_COLS } from "../memberConstants.ts";

/** [Gruppe, Schlüssel, Beschriftung, Vorgaben] — Stand vor dem Umzug. */
const ERWARTET: string[][] = [
  ["Personendaten", "name", "Name", "default+alwaysOn"],
  ["Personendaten", "nachname", "Nachname", "-"],
  ["Personendaten", "vorname", "Vorname", "-"],
  ["Personendaten", "geburtsdatum", "Geburtsdatum", "-"],
  ["Personendaten", "alter", "Alter", "-"],
  ["Personendaten", "geschlecht", "Geschlecht", "-"],
  ["Personendaten", "nationalitaet", "Nationalität", "-"],
  ["Personendaten", "nationalitaet2", "Nationalität 2", "-"],
  ["Personendaten", "heimatort", "Heimatort", "-"],
  ["Personendaten", "ahv_nr", "AHV-Nr.", "-"],
  ["Kontakt", "email", "E-Mail", "-"],
  ["Kontakt", "telefon", "Telefon", "-"],
  ["Kontakt", "strasse", "Strasse", "-"],
  ["Kontakt", "ort", "PLZ/Ort", "-"],
  ["Verein", "mitgliedschaft", "Mitgliedschaft", "default"],
  ["Verein", "rollen", "Portalrolle", "default"],
  ["Verein", "eintritt", "Eintritt", "-"],
  ["Verein", "spielerpass", "Spielerpass", "-"],
  ["Verein", "fairgate_id", "Fairgate-ID", "-"],
  ["Verein", "js_nr", "J+S Nr.", "-"],
  /* ⚠ 29. Spalte, ergaenzt am 23.08.2026. Sie ist ausgeblendet und trotzdem
     noetig: das Archiv zeigt seit dem Umbau KEINE aktiven Mitglieder mehr,
     und der Vermerk bleibt beim Wiedereintritt stehen. Ohne diese Spalte
     waere ein offener Posten dann in keiner Liste auffindbar. */
  ["Verein", "offene_punkte", "Offene Punkte", "hidden"],
  ["Portal", "portal", "Portal-Zugang", "default"],
  ["Portal", "datenpruefung", "Datenpruefung", "default"],
  ["Sport", "teams_rollen", "Teams & Kaderrollen", "default"],
  ["Sport", "funktionen_gruppen", "Funktionen", "default"],
  ["Sport", "teams", "Teams", "hidden"],
  ["Sport", "kaderrollen", "Kaderrolle", "hidden"],
  ["Sport", "funktionen", "Vereinsfunktionen", "hidden"],
  ["Sport", "funktionsgruppen", "Funktionsgruppe", "hidden"],
];

const flach = () => COL_GROUPS.flatMap(g => g.cols.map(c => [
  g.group, c.key, c.label,
  [c.default && "default", c.hidden && "hidden", c.alwaysOn && "alwaysOn"]
    .filter(Boolean).join("+") || "-",
]));

describe("Spaltenkatalog der Mitgliederliste", () => {
  it("⚠ trägt genau die 29 Spalten — Stand 23.08.2026 — Reihenfolge, Beschriftung, Vorgaben", () => {
    expect(flach()).toEqual(ERWARTET);
  });

  it("ALL_COLS bleibt die flache Sicht auf dieselben Spalten", () => {
    expect(ALL_COLS.map(c => c.key)).toEqual(ERWARTET.map(e => e[1]));
  });

  it("⚠ kein Schlüssel doppelt — zwei Definitionen, und die spätere gewinnt lautlos", () => {
    const keys = ALL_COLS.map(c => c.key);
    expect([...new Set(keys)]).toEqual(keys);
  });
});
