import { describe, it, expect } from "vitest";
import {
  ADRESS_FELDER,
  BEREICHE,
  FELD_REGISTRY,
  IMMER_PFLICHT_KEYS,
  MODI,
  eintraegeFuerBereich,
  getFeldkonfig,
  fuerMitgliedtyp,
  giltFuerZiel,
  fuerPersonenart,
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
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", art_id: null, art: "" as const, schluessel: "geburtsdatum", modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", art_id: null, art: "" as const, schluessel: "email",        modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", art_id: null, art: "" as const, schluessel: "strasse",      modus: "pflicht" },
  { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", art_id: null, art: "" as const, schluessel: "geschlecht",   modus: "freiwillig" },

  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "email",        modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "strasse",      modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "plz",          modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "ort",          modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "telefon",      modus: "pflicht" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "geburtsdatum", modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "geschlecht",   modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "spielerpass",  modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "js_nr",        modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "fairgate_id",  modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "teams",        modus: "aus" },
  { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "funktionen",   modus: "aus" },
];

describe("getFeldkonfig", () => {
  it("liefert den gespeicherten Modus", () => {
    const k = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), zeilen);
    expect(k.geburtsdatum).toBe("pflicht");
    expect(k.geschlecht).toBe("freiwillig");
  });

  it("gibt fuer eine fehlende Zeile 'freiwillig' zurueck", () => {
    /* Der Kern der Bauweise: gespeichert wird nur die Abweichung. Beim
       Aktivmitglied steht nichts zu heimatort — also freiwillig, nicht
       Pflicht und nicht versteckt. */
    const k = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), zeilen);
    expect(k.heimatort).toBe("freiwillig");
    expect(k.notizen).toBe("freiwillig");
  });

  it("mischt Mitgliedtypen nicht", () => {
    const aktiv = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), zeilen);
    const supp  = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(aktiv.spielerpass).toBe("freiwillig");
    expect(supp.spielerpass).toBe("aus");
  });

  it("verlangt und versteckt ohne Mitgliedtyp nichts", () => {
    /* Ein Ladezustand darf weder ein Feld ausblenden noch ein Formular
       blockieren. */
    for (const m of [null, undefined, ""]) {
      const k = getFeldkonfig(fuerMitgliedtyp(m), zeilen);
      expect(pflichtfelderAus(k)).toEqual([]);
      expect(istSichtbar(k, "spielerpass")).toBe(true);
    }
  });

  it("verschluckt unbekannte Schluessel nicht", () => {
    const k = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), [
      ...zeilen,
      { mitgliedtyp_id: "t1", mitgliedtyp: "Aktivmitglied", art_id: null, art: "" as const, schluessel: "erfunden", modus: "aus" },
    ]);
    expect(k.erfunden).toBe("aus");
  });
});

describe("istSichtbar / istPflicht", () => {
  it("blendet 'aus' aus und zeigt den Rest", () => {
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(istSichtbar(k, "spielerpass")).toBe(false);
    expect(istSichtbar(k, "teams")).toBe(false);
    expect(istSichtbar(k, "email")).toBe(true);
    expect(istSichtbar(k, "heimatort")).toBe(true);
  });

  it("haelt vorname und nachname immer fuer Pflicht und sichtbar", () => {
    /* Beide sind in `mitglieder` NOT NULL. Auch eine Zeile, die etwas
       anderes behauptet, darf daran nichts aendern. */
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), [
      ...zeilen,
      { mitgliedtyp_id: "t2", mitgliedtyp: "Supporter", art_id: null, art: "" as const, schluessel: "vorname", modus: "aus" },
    ]);
    expect(istSichtbar(k, "vorname")).toBe(true);
    expect(istPflicht(k, "vorname")).toBe(true);
    expect(istPflicht(k, "nachname")).toBe(true);
  });

  it("zaehlt ein ausgeblendetes Feld nicht als Pflicht", () => {
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(istPflicht(k, "geburtsdatum")).toBe(false);
  });
});

describe("istBereichSichtbar", () => {
  it("blendet einen Bereich aus, dessen Eintraege alle 'aus' sind", () => {
    /* Sonst bliebe beim Goenner eine leere Karte "Teams" stehen — genau
       das, was istSupporter in InfoTab bisher von Hand verhindert hat. */
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(istBereichSichtbar(k, "teams")).toBe(false);
    expect(istBereichSichtbar(k, "funktionen")).toBe(false);
  });

  it("laesst einen Bereich stehen, solange ein Eintrag sichtbar ist", () => {
    /* Vereinsdaten: spielerpass/js_nr/fairgate_id sind aus, mitgliedtyp
       und eintrittsdatum bleiben — die Karte behaelt zwei Zeilen. */
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(istBereichSichtbar(k, "vereinsdaten")).toBe(true);
    expect(istSichtbar(k, "mitgliedtyp")).toBe(true);
    expect(istSichtbar(k, "eintrittsdatum")).toBe(true);
  });

  it("haelt Personalien wegen vorname/nachname immer sichtbar", () => {
    const alleAus = FELD_REGISTRY
      .filter(e => e.bereich === "personalien" && e.modi.length > 0)
      .map(e => ({ mitgliedtyp_id: "t9", mitgliedtyp: "Leer", art_id: null, art: "" as const, schluessel: e.schluessel, modus: "aus" as const }));
    const k = getFeldkonfig(fuerMitgliedtyp("Leer"), alleAus);
    expect(istBereichSichtbar(k, "personalien")).toBe(true);
  });
});

describe("pflichtfelderAus", () => {
  it("liefert die Pflichtfelder in Registry-Reihenfolge", () => {
    /* Feste Reihenfolge, damit die Fehlermeldung im Formular nicht von
       der Zeilenreihenfolge der Datenbank abhaengt. */
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(pflichtfelderAus(k)).toEqual(["email", "telefon", "strasse", "plz", "ort"]);
  });

  it("enthaelt vorname/nachname nicht", () => {
    const k = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), zeilen);
    expect(pflichtfelderAus(k)).not.toContain("vorname");
    expect(pflichtfelderAus(k)).not.toContain("nachname");
  });
});

describe("kombiniereMitRolle", () => {
  it("laesst 'aus' gegen jede Rolle gewinnen", () => {
    /* Die Reihenfolge ist die Aussage: "Gibt es nicht" gilt auch fuer
       die Verwaltung, sonst waere der Wert nicht das, was sein Name sagt. */
    const k = getFeldkonfig(fuerMitgliedtyp("Supporter"), zeilen);
    expect(kombiniereMitRolle(k, true, "spielerpass")).toBe(false);
  });

  it("laesst die Rolle weiterhin ausblenden", () => {
    /* Die andere Richtung bleibt: ein Trainer sieht die AHV-Nummer nicht,
       auch wenn sie beim Mitgliedtyp freiwillig ist. */
    const k = getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), zeilen);
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

/* ═══════════════════════════════════════════════════════════════
   Die Achse „ohne Mitgliedschaft" (21.08.2026)

   Vorher hatte `getFeldkonfig(null, …)` ein `if (!mitgliedtyp)
   return konfig;` und lieferte ALLES auf freiwillig — ein Gönner
   bekam jede Karte und jeden Tab. Der Elternteil hatte daneben
   einen fest verdrahteten Satz in getProfilCheck, also einen
   zweiten Konfigurationsort.
   ═══════════════════════════════════════════════════════════════ */

/* Die Achse traegt seit dem 20.08.2026 eine echte Id statt eines festen
   Wortes: aus einem Sammelwert fuer 401 Personen ist eine pflegbare Liste
   geworden (`personenarten`). */
const ART_ID = "art-elternteil";
const OHNE_ART = fuerPersonenart(ART_ID);

const ohneZeilen: FeldkonfigZeile[] = [
  { mitgliedtyp_id: null, mitgliedtyp: "", art_id: ART_ID, art: "Elternteil", schluessel: "telefon", modus: "pflicht" },
  { mitgliedtyp_id: null, mitgliedtyp: "", art_id: ART_ID, art: "Elternteil", schluessel: "email",   modus: "pflicht" },
  { mitgliedtyp_id: null, mitgliedtyp: "", art_id: ART_ID, art: "Elternteil", schluessel: "ahv_nr",  modus: "aus" },
];

describe("ohne Mitgliedschaft", () => {
  it("liest die Zeilen der neuen Achse", () => {
    const k = getFeldkonfig(OHNE_ART, ohneZeilen);
    expect(k.telefon).toBe("pflicht");
    expect(k.email).toBe("pflicht");
    expect(k.ahv_nr).toBe("aus");
  });

  it("⚠ blendet aus, was an einer Mitgliedschaft haengt — OHNE Seed-Zeile", () => {
    /* Das Registry-Merkmal wirkt in der AUSWERTUNG. Wirkte es nur in der
       Oberflaeche, braeuchten diese zehn je eine Zeile in der Datenbank —
       und ein Direktzugriff haette sie wieder sichtbar. */
    const k = getFeldkonfig(OHNE_ART, ohneZeilen);
    for (const s of ["mitgliedtyp","eintrittsdatum","spielerpass","js_nr","fairgate_id",
                     "teams","tab_stats","tab_eltern"]) {
      expect(k[s]).toBe("aus");
    }
    /* ⚠ `notizen` und `tab_verlauf` stehen hier seit dem 21.08.2026 NICHT
       mehr. Sie hingen daran, dass `mitglieder_notizen.mitglied_id` und
       `mitglieder_aenderungen.mitglied_id` NOT NULL waren — eine technische
       Grenze, als fachliche Regel behandelt. Seit
       `migration_verlauf_person.sql` haengen beide an der Person. */
    expect(k.notizen).not.toBe("aus");
    expect(k.tab_verlauf).not.toBe("aus");
  });

  it("laesst stehen, was auch ohne Mitgliedschaft Sinn hat", () => {
    /* funktionen bleibt sichtbar: „Er darf eine Vereinsfunktion haben"
       (17.08.2026). Und die fuenf Personalien-Felder bleiben freiwillig statt
       `aus` — „aus" hiesse unsichtbar, nicht geloescht, und bei jedem Austritt
       entstuende ein Bestand an Personendaten, den niemand mehr sieht. */
    const k = getFeldkonfig(OHNE_ART, ohneZeilen);
    expect(k.funktionen).toBe("freiwillig");
    expect(k.tab_portal).toBe("freiwillig");
    expect(k.tab_datenpruefung).toBe("freiwillig");
    for (const s of ["geburtsdatum","geschlecht","nationalitaet","nationalitaet2","heimatort"]) {
      expect(k[s]).toBe("freiwillig");
    }
  });

  it("⚠ die Registry gewinnt gegen eine Altzeile", () => {
    /* Stellt jemand per Direktzugriff `teams` auf Pflicht, bleibt es `aus`:
       eine Anforderung, die niemand erfuellen kann, darf nicht entstehen. */
    const k = getFeldkonfig(OHNE_ART, [
      ...ohneZeilen,
      { mitgliedtyp_id: null, mitgliedtyp: "", art_id: ART_ID, art: "Elternteil", schluessel: "teams", modus: "pflicht" },
    ]);
    expect(k.teams).toBe("aus");
  });

  it("mischt die beiden Achsen nicht", () => {
    const gemischt = [...zeilen, ...ohneZeilen];
    /* Der Mitgliedtyp sieht die neue Zeile nicht … */
    expect(getFeldkonfig(fuerMitgliedtyp("Aktivmitglied"), gemischt).ahv_nr).toBe("freiwillig");
    /* … und die neue Achse nicht die des Mitgliedtyps. */
    expect(getFeldkonfig(OHNE_ART, gemischt).geburtsdatum).toBe("freiwillig");
  });

  it("⚠ ein Datenloch ist NICHT „ohne Mitgliedschaft“", () => {
    /* `mitglieder.mitgliedtyp` ist nullable. Eine Mitgliedschaft ohne Typ
       faellt auf „alles freiwillig" zurueck — wer beide Faelle zusammenlegte,
       blendete bei einem Datenloch ploetzlich Felder aus. */
    const k = getFeldkonfig(fuerMitgliedtyp(null), zeilen);
    expect(k.teams).toBe("freiwillig");
    expect(k.spielerpass).toBe("freiwillig");
  });

  it("giltFuerZiel filtert die Spalte der Oberflaeche", () => {
    const teams = FELD_REGISTRY.find(e => e.schluessel === "teams")!;
    const telefon = FELD_REGISTRY.find(e => e.schluessel === "telefon")!;
    expect(giltFuerZiel(teams, OHNE_ART)).toBe(false);
    expect(giltFuerZiel(teams, fuerMitgliedtyp("Aktivmitglied"))).toBe(true);
    expect(giltFuerZiel(telefon, OHNE_ART)).toBe(true);
  });

  it("genau acht Schluessel haengen an einer Mitgliedschaft", () => {
    /* Faellt die Zahl auseinander, hat jemand einen Eintrag ergaenzt, ohne
       ueber die Achse nachzudenken.

       ⚠ Waren zehn bis zum 21.08.2026. `notizen` und `tab_verlauf` sind
       freigeworden — und die ZAHL hat es gemeldet, nicht ein Mensch. Genau
       dafuer steht sie hier. */
    expect(FELD_REGISTRY.filter(e => e.nur_mitgliedschaft).length).toBe(8);
    /* Und die Namen dazu: eine Zahl allein sagte nicht, WELCHE. */
    expect(FELD_REGISTRY.filter(e => e.nur_mitgliedschaft).map(e => e.schluessel).sort())
      .toEqual(["eintrittsdatum","fairgate_id","js_nr","mitgliedtyp",
                "spielerpass","tab_eltern","tab_stats","teams"]);
  });
});
