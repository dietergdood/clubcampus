import { describe, it, expect } from "vitest";
import { getProfilCheck } from "../getProfilCheck.ts";

/* Minimale Attrappen — getProfilCheck liest nur Felder, kein Verhalten. */
const sb = null as never;
const setDbUser = (() => {}) as never;

const feldkonfig = [
  { mitgliedtyp: "Aktivmitglied",    schluessel: "geburtsdatum", modus: "pflicht" },
  { mitgliedtyp: "Aktivmitglied",    schluessel: "strasse",      modus: "pflicht" },
  { mitgliedtyp: "Aktivmitglied",    schluessel: "telefon",      modus: "pflicht" },
  { mitgliedtyp: "Passivmitglied",   schluessel: "telefon",      modus: "pflicht" },
  { mitgliedtyp: "Juniorenmitglied", schluessel: "geburtsdatum", modus: "pflicht" },
] as never;

function baue(mitglied: Record<string, unknown>, opts: Record<string, unknown> = {}) {
  const dbUser = { id: "u1", mitglied_id: 1, role: "spieler" } as never;
  return getProfilCheck({
    sb, setDbUser, dbUser, role: "spieler" as never,
    dbMitglieder: [{ id: 1, ...mitglied }] as never,
    feldkonfig, ...opts,
  });
}

/* Elternteil: keine Mitgliedschaft, also kein Mitgliedtyp und keine Matrix.
   Seine eigenen Angaben stehen seit Etappe 4 an der PERSON — benutzer hat
   keine vorname/nachname/telefon mehr. */
function baueEltern(person: Record<string, unknown> | null) {
  const dbUser = { id: "u1", mitglied_id: null, person_id: "p1" } as never;
  return getProfilCheck({
    sb, setDbUser, dbUser, role: "eltern" as never,
    dbMitglieder: [] as never,
    eigenePerson: person as never,
    feldkonfig,
  });
}

describe("Elternteil ohne Mitgliedschaft", () => {
  it("meldet die fehlenden Angaben der Person", () => {
    const { getProfilFehlend } = baueEltern({ vorname: "Petra", nachname: null, telefon: null });
    expect(getProfilFehlend()).toEqual(["Nachname", "Telefon"]);
  });

  it("meldet nichts, wenn die Person vollständig ist", () => {
    const { getProfilFehlend } = baueEltern({ vorname: "Petra", nachname: "Brunner", telefon: "079" });
    expect(getProfilFehlend()).toEqual([]);
  });

  it("verlangt nichts, solange die Person nicht geladen ist", () => {
    /* Ladezustand: ein leerer Zustand darf keinen Hinweis auslösen — sonst
       sieht jeder Elternteil beim Aufbau kurz drei Fehlermeldungen. */
    const { getProfilFehlend } = baueEltern(null);
    expect(getProfilFehlend()).toEqual([]);
  });

  it("behandelt Leerzeichen als leer", () => {
    const { getProfilFehlend } = baueEltern({ vorname: "  ", nachname: "Brunner", telefon: "079" });
    expect(getProfilFehlend()).toEqual(["Vorname"]);
  });
});

describe("getProfilFehlend", () => {
  it("meldet nichts, wenn alle Pflichtfelder gefüllt sind", () => {
    const { getProfilFehlend } = baue({
      vorname: "Adrian", nachname: "Bürgi", mitgliedtyp: "Aktivmitglied",
      geburtsdatum: "2000-01-01", strasse: "Dorfstrasse 9", telefon: "+41 79 000 00 00",
    });
    expect(getProfilFehlend()).toEqual([]);
  });

  it("meldet die Adresse — früher prüfte die Datenprüfung sie bei Mitgliedern gar nicht", () => {
    const { getProfilFehlend } = baue({
      vorname: "Adrian", nachname: "Bürgi", mitgliedtyp: "Aktivmitglied",
      geburtsdatum: "2000-01-01", telefon: "+41 79 000 00 00",
    });
    expect(getProfilFehlend()).toEqual(["Strasse"]);
  });

  it("verlangt Telefon und E-Mail getrennt, nicht mehr das eine ODER das andere", () => {
    /* Früher galt: `!telefon && !email` — eine E-Mail genügte. Jetzt zählt,
       was die Matrix sagt: hier Telefon. */
    const { getProfilFehlend } = baue({
      vorname: "A", nachname: "B", mitgliedtyp: "Aktivmitglied",
      geburtsdatum: "2000-01-01", strasse: "Dorfstrasse 9", email: "a@b.ch",
    });
    expect(getProfilFehlend()).toContain("Telefon");
  });

  it("richtet sich nach dem Mitgliedtyp", () => {
    const { getProfilFehlend } = baue({
      vorname: "A", nachname: "B", mitgliedtyp: "Passivmitglied",
    });
    /* Passivmitglied verlangt laut Matrix nur Telefon — kein Geburtsdatum,
       keine Adresse. */
    expect(getProfilFehlend()).toEqual(["Telefon"]);
  });

  it("zählt die Rolle NICHT mehr mit", () => {
    /* Bis zum 19.08.2026 legte `rolle_pflichtfelder` einem Spieler zusätzlich
       Spielerpass, J+S-Nr. und Fairgate-ID auf. Die Achse ist entfallen: sie
       konnte nur addieren, nie wegnehmen, und `rolle` ist ein berechneter
       Wert, den ableitUndSaveRolle() laufend neu schreibt. Was ein Verein
       verlangt, steht jetzt am Mitgliedtyp. */
    const { getProfilFehlend } = baue({
      vorname: "A", nachname: "B", mitgliedtyp: "Aktivmitglied", rolle: "spieler",
      geburtsdatum: "2000-01-01", strasse: "Dorfstrasse 9", telefon: "+41 79 000 00 00",
    });
    expect(getProfilFehlend()).toEqual([]);
  });

  it("blendet ein Feld auf 'aus' aus der Prüfung aus", () => {
    /* Der neue dritte Wert: was es nicht gibt, kann nicht fehlen. */
    const { getProfilFehlend } = baue(
      { vorname: "A", nachname: "B", mitgliedtyp: "Goenner" },
      { feldkonfig: [
        { mitgliedtyp: "Goenner", schluessel: "telefon",      modus: "pflicht" },
        { mitgliedtyp: "Goenner", schluessel: "geburtsdatum", modus: "aus" },
      ] as never },
    );
    expect(getProfilFehlend()).toEqual(["Telefon"]);
  });

  it("meldet Vorname und Nachname auch ohne Matrix-Eintrag", () => {
    const { getProfilFehlend } = baue({ mitgliedtyp: "Passivmitglied", telefon: "079" });
    expect(getProfilFehlend()).toEqual(["Vorname", "Nachname"]);
  });

  it("verlangt nichts, solange die Konfiguration nicht geladen ist", () => {
    /* Ladezustand: leere Konfiguration darf keinen Hinweis auslösen. */
    const { getProfilFehlend } = baue(
      { vorname: "A", nachname: "B", mitgliedtyp: "Aktivmitglied" },
      { feldkonfig: [] },
    );
    expect(getProfilFehlend()).toEqual([]);
  });

  it("behandelt Leerzeichen als leer", () => {
    const { getProfilFehlend } = baue({
      vorname: "A", nachname: "B", mitgliedtyp: "Passivmitglied", telefon: "   ",
    });
    expect(getProfilFehlend()).toEqual(["Telefon"]);
  });
});
