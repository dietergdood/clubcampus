import { describe, it, expect } from "vitest";
import {
  PERSON_FELDER,
  flacheZeile,
  flacheZeilen,
  hatPersonFelder,
  verteileFelder,
} from "../personService.ts";

const joinZeile = {
  id: 42,
  person_id: "p1",
  mitgliedtyp: "Aktivmitglied",
  spielerpass: "SP-9",
  aktiv: true,
  /* Altspalten in mitglieder — ab Etappe 2b nicht mehr die Wahrheit */
  vorname: "ALT",
  nachname: "ALT",
  telefon: "ALT",
  personen: {
    id: "p1",
    vorname: "Martin",
    nachname: "Wyss",
    telefon: "+41 79 100 10 01",
    strasse: "Dorfstrasse 9",
    email: "martin.wyss@example.ch",
  },
};

describe("flacheZeile", () => {
  it("liefert eine flache Zeile ohne verschachteltes personen-Objekt", () => {
    /* Verschachtelt wäre der Bruch: memberFilter, memberMapper und vor allem
       die gespeicherten Ansichten in mitglieder_ansichten arbeiten mit
       flachen Feld-Keys. Eine Verschachtelung ergäbe keinen Fehler, nur
       stumm leere Spalten. */
    const flach = flacheZeile(joinZeile)!;
    expect(flach.personen).toBeUndefined();
    expect(flach.vorname).toBe("Martin");
    expect(flach.strasse).toBe("Dorfstrasse 9");
  });

  it("personen gewinnt über die Altspalten in mitglieder", () => {
    const flach = flacheZeile(joinZeile)!;
    expect(flach.nachname).toBe("Wyss");
    expect(flach.telefon).toBe("+41 79 100 10 01");
  });

  it("id bleibt die Mitglieds-Id, person_id kommt dazu", () => {
    /* An mitglieder.id hängt alles: kader, eltern_kinder, benutzer,
       Notizen, Verlauf. Würde sie durch die Personen-Id ersetzt, bräche
       jede dieser Verknüpfungen. */
    const flach = flacheZeile(joinZeile)!;
    expect(flach.id).toBe(42);
    expect(flach.person_id).toBe("p1");
  });

  it("behält die Felder der Mitgliedschaft", () => {
    const flach = flacheZeile(joinZeile)!;
    expect(flach.mitgliedtyp).toBe("Aktivmitglied");
    expect(flach.spielerpass).toBe("SP-9");
  });

  it("fällt ohne Person auf die Altspalten zurück", () => {
    /* Mitglieder, die zwischen Etappe 1 und 2b angelegt wurden, haben
       person_id = null. Sie dürfen nicht still aus der Liste fallen. */
    const ohne = { id: 7, person_id: null, vorname: "Ohne", nachname: "Person", personen: null };
    const flach = flacheZeile(ohne)!;
    expect(flach.vorname).toBe("Ohne");
    expect(flach.id).toBe(7);
    expect(flach.person_id).toBeNull();
  });

  it("null bleibt null", () => {
    expect(flacheZeile(null)).toBeNull();
  });

  it("übernimmt keine Personenfelder, die die Person gar nicht hat", () => {
    /* Fehlt ein Feld im Join-Ergebnis (etwa weil nur einzelne Spalten
       gelesen wurden), darf es den Wert aus mitglieder nicht mit
       undefined überschreiben. */
    const teil = { id: 1, ort: "Herrliberg", personen: { id: "p", vorname: "A" } };
    const flach = flacheZeile(teil)!;
    expect(flach.ort).toBe("Herrliberg");
    expect(flach.vorname).toBe("A");
  });
});

describe("flacheZeilen", () => {
  it("verarbeitet eine Liste", () => {
    expect(flacheZeilen([joinZeile, joinZeile])).toHaveLength(2);
  });
  it("verträgt null und undefined", () => {
    expect(flacheZeilen(null)).toEqual([]);
    expect(flacheZeilen(undefined)).toEqual([]);
  });
});

describe("verteileFelder", () => {
  it("trennt Personenfelder von der Mitgliedschaft", () => {
    const { person, mitgliedschaft } = verteileFelder({
      vorname: "Martin", strasse: "Dorfstrasse 9",
      mitgliedtyp: "Aktivmitglied", spielerpass: "SP-9",
    });
    expect(person).toEqual({ vorname: "Martin", strasse: "Dorfstrasse 9" });
    expect(mitgliedschaft).toEqual({ mitgliedtyp: "Aktivmitglied", spielerpass: "SP-9" });
  });

  it("hält AHV und Foto bei der Person", () => {
    /* AHV gehört zur Person, sie ist lebenslang. Spielerpass und J+S
       hängen an der Mitgliedschaft — Passivmitglieder haben keine. */
    const { person, mitgliedschaft } = verteileFelder({ ahv_nr: "756", foto_url: "u", js_nr: "1" });
    expect(person).toEqual({ ahv_nr: "756", foto_url: "u" });
    expect(mitgliedschaft).toEqual({ js_nr: "1" });
  });

  it("lässt leere Objekte leer", () => {
    expect(verteileFelder({})).toEqual({ person: {}, mitgliedschaft: {} });
  });

  it("behält auch null-Werte — Leeren ist eine Änderung", () => {
    const { person } = verteileFelder({ telefon: null });
    expect(person).toEqual({ telefon: null });
  });
});

describe("hatPersonFelder", () => {
  it("erkennt Personenfelder", () => {
    expect(hatPersonFelder({ vorname: "A" })).toBe(true);
    expect(hatPersonFelder({ mitgliedtyp: "X" })).toBe(false);
    expect(hatPersonFelder({})).toBe(false);
  });
});

describe("PERSON_FELDER", () => {
  it("enthält nicht die Felder der Mitgliedschaft", () => {
    for (const feld of ["mitgliedtyp", "spielerpass", "js_nr", "fairgate_id", "eintritt", "aktiv"]) {
      expect(PERSON_FELDER as readonly string[]).not.toContain(feld);
    }
  });
  it("enthält die Adresse — getrennte Eltern brauchen eigene Adressen", () => {
    for (const feld of ["strasse", "plz", "ort", "kanton", "land"]) {
      expect(PERSON_FELDER as readonly string[]).toContain(feld);
    }
  });
});
