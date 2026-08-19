import { describe, it, expect } from "vitest";
import {
  ADRESS_FELDER,
  BEREICHE,
  FELD_REGISTRY,
  IMMER_PFLICHT_KEYS,
  MODI,
  eintraegeFuerBereich,
  getFeldkonfig,
  istBereichSichtbar,
  istPflicht,
  istSichtbar,
  kombiniereMitRolle,
  labelFuer,
  pflichtfelderAus,
} from "../feldkonfig.ts";
import type { FeldkonfigZeile } from "../feldkonfig.ts";

/* So sieht der FCH-Bestand nach der Migration vom 19.08.2026 aus:
   der Goenner hat fuenf Pflichtfelder und sieben Schluessel auf "aus",
   ein Aktivmitglied hat Pflichtfelder und ein abgewaehltes Feld. */
const zeilen: FeldkonfigZeile[] = [
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", schluessel: "geburtsdatum", modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", schluessel: "email",        modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", schluessel: "strasse",      modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", schluessel: "geschlecht",   modus: "freiwillig" },

  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "email",        modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "strasse",      modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "plz",          modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "ort",          modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "telefon",      modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "geburtsdatum", modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "geschlecht",   modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "spielerpass",  modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "js_nr",        modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "fairgate_id",  modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "teams",        modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "funktionen",   modus: "aus" },
];

describe("getFeldkonfig", () => {
  it("liefert den gespeicherten Modus", () => {
    const k = getFeldkonfig("Aktivmitglied", zeilen);
    expect(k.geburtsdatum).toBe("pflicht");
    expect(k.geschlecht).toBe("freiwillig");
  });

  it("gibt fuer eine fehlende Zeile 'freiwillig' zurueck", () => {
    /* Der Kern der Bauweise: gespeichert wird nur die Abweichung. Beim
       Aktivmitglied steht nichts zu heimatort — also freiwillig, nicht
       Pflicht und nicht versteckt. */
    const k = getFeldkonfig("Aktivmitglied", zeilen);
    expect(k.heimatort).toBe("freiwillig");
    expect(k.notizen).toBe("freiwillig");
  });

  it("mischt Mitgliedtypen nicht", () => {
    const aktiv = getFeldkonfig("Aktivmitglied", zeilen);
    const supp  = getFeldkonfig("Supporter", zeilen);
    expect(aktiv.spielerpass).toBe("freiwillig");
    expect(supp.spielerpass).toBe("aus");
  });

  it("verlangt und versteckt ohne Mitgliedtyp nichts", () => {
    /* Ein Ladezustand darf weder ein Feld ausblenden noch ein Formular
       blockieren. */
    for (const m of [null, undefined, ""]) {
      const k = getFeldkonfig(m, zeilen);
      expect(pflichtfelderAus(k)).toEqual([]);
      expect(istSichtbar(k, "spielerpass")).toBe(true);
    }
  });

  it("verschluckt unbekannte Schluessel nicht", () => {
    const k = getFeldkonfig("Aktivmitglied", [
      ...zeilen,
      { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", schluessel: "erfunden", modus: "aus" },
    ]);
    expect(k.erfunden).toBe("aus");
  });
});

describe("istSichtbar / istPflicht", () => {
  it("blendet 'aus' aus und zeigt den Rest", () => {
    const k = getFeldkonfig("Supporter", zeilen);
    expect(istSichtbar(k, "spielerpass")).toBe(false);
    expect(istSichtbar(k, "teams")).toBe(false);
    expect(istSichtbar(k, "email")).toBe(true);
    expect(istSichtbar(k, "heimatort")).toBe(true);
  });

  it("haelt vorname und nachname immer fuer Pflicht und sichtbar", () => {
    /* Beide sind in `mitglieder` NOT NULL. Auch eine Zeile, die etwas
       anderes behauptet, darf daran nichts aendern. */
    const k = getFeldkonfig("Supporter", [
      ...zeilen,
      { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", schluessel: "vorname", modus: "aus" },
    ]);
    expect(istSichtbar(k, "vorname")).toBe(true);
    expect(istPflicht(k, "vorname")).toBe(true);
    expect(istPflicht(k, "nachname")).toBe(true);
  });

  it("zaehlt ein ausgeblendetes Feld nicht als Pflicht", () => {
    const k = getFeldkonfig("Supporter", zeilen);
    expect(istPflicht(k, "geburtsdatum")).toBe(false);
  });
});

describe("istBereichSichtbar", () => {
  it("blendet einen Bereich aus, dessen Eintraege alle 'aus' sind", () => {
    /* Sonst bliebe beim Goenner eine leere Karte "Teams" stehen — genau
       das, was istSupporter in InfoTab bisher von Hand verhindert hat. */
    const k = getFeldkonfig("Supporter", zeilen);
    expect(istBereichSichtbar(k, "teams")).toBe(false);
    expect(istBereichSichtbar(k, "funktionen")).toBe(false);
  });

  it("laesst einen Bereich stehen, solange ein Eintrag sichtbar ist", () => {
    /* Vereinsdaten: spielerpass/js_nr/fairgate_id sind aus, mitgliedtyp
       und eintrittsdatum bleiben — die Karte behaelt zwei Zeilen. */
    const k = getFeldkonfig("Supporter", zeilen);
    expect(istBereichSichtbar(k, "vereinsdaten")).toBe(true);
    expect(istSichtbar(k, "mitgliedtyp")).toBe(true);
    expect(istSichtbar(k, "eintrittsdatum")).toBe(true);
  });

  it("haelt Personalien wegen vorname/nachname immer sichtbar", () => {
    const alleAus = FELD_REGISTRY
      .filter(e => e.bereich === "personalien" && e.modi.length > 0)
      .map(e => ({ mitgliedtyp_id: "t9", mitgliedtyp: "Leer", schluessel: e.schluessel, modus: "aus" as const }));
    const k = getFeldkonfig("Leer", alleAus);
    expect(istBereichSichtbar(k, "personalien")).toBe(true);
  });
});

describe("pflichtfelderAus", () => {
  it("liefert die Pflichtfelder in Registry-Reihenfolge", () => {
    /* Feste Reihenfolge, damit die Fehlermeldung im Formular nicht von
       der Zeilenreihenfolge der Datenbank abhaengt. */
    const k = getFeldkonfig("Supporter", zeilen);
    expect(pflichtfelderAus(k)).toEqual(["email", "telefon", "strasse", "plz", "ort"]);
  });

  it("enthaelt vorname/nachname nicht", () => {
    const k = getFeldkonfig("Aktivmitglied", zeilen);
    expect(pflichtfelderAus(k)).not.toContain("vorname");
    expect(pflichtfelderAus(k)).not.toContain("nachname");
  });
});

describe("kombiniereMitRolle", () => {
  it("laesst 'aus' gegen jede Rolle gewinnen", () => {
    /* Die Reihenfolge ist die Aussage: "Gibt es nicht" gilt auch fuer
       die Verwaltung, sonst waere der Wert nicht das, was sein Name sagt. */
    const k = getFeldkonfig("Supporter", zeilen);
    expect(kombiniereMitRolle(k, true, "spielerpass")).toBe(false);
  });

  it("laesst die Rolle weiterhin ausblenden", () => {
    /* Die andere Richtung bleibt: ein Trainer sieht die AHV-Nummer nicht,
       auch wenn sie beim Mitgliedtyp freiwillig ist. */
    const k = getFeldkonfig("Aktivmitglied", zeilen);
    expect(istSichtbar(k, "ahv_nr")).toBe(true);
    expect(kombiniereMitRolle(k, false, "ahv_nr")).toBe(false);
  });
});

describe("Registry", () => {
  it("hat fuer jeden Eintrag einen bekannten Bereich", () => {
    const bekannt = BEREICHE.map(b => b.key);
    for (const e of FELD_REGISTRY) expect(bekannt).toContain(e.bereich);
  });

  it("hat keine doppelten Schluessel", () => {
    const keys = FELD_REGISTRY.map(e => e.schluessel);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("nennt jeden Eintrag beim Namen", () => {
    for (const e of FELD_REGISTRY) {
      expect(labelFuer(e.schluessel)).not.toBe(e.schluessel);
    }
  });

  it("bietet nur gueltige Modi an", () => {
    for (const e of FELD_REGISTRY) {
      for (const m of e.modi) expect(MODI).toContain(m);
    }
  });

  it("fuehrt genau vorname und nachname als fest", () => {
    expect(IMMER_PFLICHT_KEYS.sort()).toEqual(["nachname", "vorname"]);
  });

  it("kennt die vier Adressfelder und ordnet sie dem Kontakt zu", () => {
    const adresse = FELD_REGISTRY.filter(e => e.adresse).map(e => e.schluessel);
    expect(adresse.sort()).toEqual([...ADRESS_FELDER].sort());
    for (const e of FELD_REGISTRY.filter(x => x.adresse)) {
      expect(e.bereich).toBe("kontakt");
    }
  });

  it("laesst Bereiche und Tabs nicht 'Pflicht' werden", () => {
    /* An einem Tab oder einer Team-Liste gibt es nichts auszufuellen —
       ein dritter Wert waere ein Versprechen ohne Deckung. */
    for (const e of FELD_REGISTRY) {
      if (e.bereich === "tabs" || ["teams", "funktionen", "notizen", "mitgliedtyp"].includes(e.schluessel)) {
        expect(e.modi).not.toContain("pflicht");
      }
    }
  });

  it("hat fuer jeden Bereich mindestens einen Eintrag", () => {
    for (const b of BEREICHE) expect(eintraegeFuerBereich(b.key).length).toBeGreaterThan(0);
  });

  it("laesst Teams, Funktionen und Notizen aus genau einem Eintrag bestehen", () => {
    /* Die Oberflaeche erkennt daran, dass sie dort nur den Schalter im Kopf
       zeigt und keine Zeile darunter: zwei Bedienelemente fuer dieselbe
       Entscheidung koennten auseinanderlaufen, und dann wuesste niemand,
       was gilt. Erkannt wird es am Schluessel — kommt ein weiterer solcher
       Bereich dazu, verhaelt er sich von selbst richtig. */
    for (const key of ["teams", "funktionen", "notizen"]) {
      const e = eintraegeFuerBereich(key);
      expect(e).toHaveLength(1);
      expect(e[0].schluessel).toBe(key);
    }
  });

  it("gibt jedem Schluessel ohne auszufuellenden Wert genau an und aus", () => {
    /* Bei einem Profil-Tab und beim Mitgliedtyp gibt es nichts einzutragen —
       "Freiwillig" waere dort bedeutungslos. Solche Schluessel bekommen einen
       Schiebeschalter statt eines Segments; ein Segment mit zwei Feldern
       wuerde einen dritten Zustand suggerieren, den es nicht gibt. */
    const anAus = FELD_REGISTRY.filter(e => e.modi.includes("aus") && !e.modi.includes("pflicht"));
    expect(anAus.map(e => e.schluessel).sort()).toEqual([
      "funktionen", "mitgliedtyp", "notizen",
      "tab_datenpruefung", "tab_eltern", "tab_portal", "tab_stats", "tab_verlauf",
      "teams",
    ]);
    for (const e of anAus) expect([...e.modi].sort()).toEqual(["aus", "freiwillig"]);
  });
});
