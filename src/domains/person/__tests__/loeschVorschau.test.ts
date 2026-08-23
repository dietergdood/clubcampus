/* ═══════════════════════════════════════════════════════════════
   Die Löschvorschau — Darstellung, Fingerabdruck, Abbruchmeldung

   ⚠ Das Löschen ist das einzige Stück im Projekt OHNE ROLLBACK.
   Ein `BEGIN … ROLLBACK`-Probelauf prüft Reihenfolge und
   Fremdschlüssel — die richtige Person erwischt er genauso
   zuverlässig wie der scharfe Lauf. Die Absicherung ist der
   Fingerabdruck, und diese Fälle prüfen ihn.

   Die reinen Funktionen liegen in der Edge Function
   (`supabase/functions/person-loeschen/vorschau.ts`) und werden von
   hier direkt importiert — dieselbe Datei, die im Betrieb läuft,
   nicht eine Abschrift.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  formeVorschau, fingerabdruckDaten, nenneUnterschiede, NICHT_PRUEFBAR,
} from "../../../../supabase/functions/person-loeschen/vorschau.ts";

const PERSON = {
  id: "p-1", name: "Andrea Hauser", email: "a@h.ch",
  aktive_mitgliedschaften: 0, hat_konto: false,
};
const EINTEILUNG = {
  faellt: ["mitglieder", "kader", "benutzer", "personenart_pro_person"],
  anonym: ["helper_zuteilungen"],
  blockiert: ["news"],
};

describe("formeVorschau — was auf dem Schirm steht", () => {
  it("zeigt nur, was Zeilen hat", () => {
    const v = formeVorschau(PERSON,
      { mitglieder: 1, kader: 0, benutzer: 0, personenart_pro_person: 1,
        helper_zuteilungen: 0, news: 0 },
      EINTEILUNG);
    expect(v.faellt.map(p => p.tabelle)).toEqual(["mitglieder", "personenart_pro_person"]);
    expect(v.anonym).toEqual([]);
    expect(v.blockiert).toEqual([]);
  });

  it("⚠ zählt die leeren, statt sie stillschweigend wegzulassen", () => {
    /* Eine Vorschau mit zwei Zeilen sieht sonst aus wie eine, die nur zwei
       Tabellen kennt. „4 weitere geprüft, alle leer" ist eine Aussage;
       stilles Weglassen ist keine. (Didi, 23.08.2026.) */
    const v = formeVorschau(PERSON,
      { mitglieder: 1, kader: 0, benutzer: 0, personenart_pro_person: 1,
        helper_zuteilungen: 0, news: 0 },
      EINTEILUNG);
    expect(v.geprueft_leer).toBe(4);
  });

  it("⚠ nennt die nicht prüfbaren IMMER — auch wenn sie leer sind", () => {
    /* Der einzige Punkt, an dem die Vorschau etwas NICHT weiss: vier
       Tabellen führen `mitglied_id` als uuid ohne Fremdschlüssel, ein Join
       ist unmöglich. Das gehört auf den Schirm, nicht in den
       Fingerabdruck. */
    const v = formeVorschau(PERSON, { mitglieder: 1 }, { faellt: ["mitglieder"], anonym: [], blockiert: [] });
    expect(v.nicht_pruefbar).toEqual([...NICHT_PRUEFBAR]);
    expect(v.nicht_pruefbar).toContain("aufgebote");
  });

  it("rückt ein, was an der Mitgliedschaft hängt statt an der Person", () => {
    const v = formeVorschau(PERSON, { mitglieder: 1, kader: 2 },
      { faellt: ["mitglieder", "kader"], anonym: [], blockiert: [] },
      { kader: "mitglieder" });
    expect(v.faellt.find(p => p.tabelle === "kader")?.unter).toBe("mitglieder");
    expect(v.faellt.find(p => p.tabelle === "mitglieder")?.unter).toBeUndefined();
  });

  it("⚠ blockierende Zeilen erscheinen — sie sind der Grund, NICHT zu löschen", () => {
    const v = formeVorschau(PERSON, { mitglieder: 1, news: 3 },
      { faellt: ["mitglieder"], anonym: [], blockiert: ["news"] });
    expect(v.blockiert).toEqual([{ tabelle: "news", anzahl: 3 }]);
  });
});

describe("fingerabdruckDaten — worüber signiert wird", () => {
  const basis = () => formeVorschau(PERSON, { mitglieder: 1, kader: 0 },
    { faellt: ["mitglieder", "kader"], anonym: [], blockiert: [] });

  it("nennt Person, Mitgliedschaften, Konto und jede Zahl", () => {
    expect(fingerabdruckDaten(basis()))
      .toBe("person=p-1|mitgliedschaften=0|konto=0|kader=0;mitglieder=1");
  });

  it("⚠ sortiert die Schlüssel — sonst bräche eine Umstellung im Code jeden offenen Abdruck", () => {
    const a = formeVorschau(PERSON, { kader: 0, mitglieder: 1 },
      { faellt: ["kader", "mitglieder"], anonym: [], blockiert: [] });
    expect(fingerabdruckDaten(a)).toBe(fingerabdruckDaten(basis()));
  });

  it("⚠ eine andere Person ergibt einen anderen Abdruck", () => {
    const andere = formeVorschau({ ...PERSON, id: "p-2" }, { mitglieder: 1, kader: 0 },
      { faellt: ["mitglieder", "kader"], anonym: [], blockiert: [] });
    expect(fingerabdruckDaten(andere)).not.toBe(fingerabdruckDaten(basis()));
  });

  it("⚠ eine neue Mitgliedschaft ergibt einen anderen Abdruck — der veraltete Tab", () => {
    const inzwischen = formeVorschau({ ...PERSON, aktive_mitgliedschaften: 1 },
      { mitglieder: 2, kader: 0 }, { faellt: ["mitglieder", "kader"], anonym: [], blockiert: [] });
    expect(fingerabdruckDaten(inzwischen)).not.toBe(fingerabdruckDaten(basis()));
  });

  it("⚠ die Darstellung ändert ihn NICHT — nur die Tatsachen", () => {
    /* Ob eine Nullzeile angezeigt wird oder nicht, darf keinen Abbruch
       auslösen. Der Abdruck geht über `zahlen`, nicht über `faellt`. */
    const mitBlock = formeVorschau(PERSON, { mitglieder: 1, kader: 0 },
      { faellt: ["mitglieder"], anonym: ["kader"], blockiert: [] });
    expect(fingerabdruckDaten(mitBlock)).toBe(fingerabdruckDaten(basis()));
  });
});

describe("nenneUnterschiede — die Abbruchmeldung", () => {
  it("⚠ sagt WAS sich geändert hat, nicht nur DASS", () => {
    /* „Hash stimmt nicht" erzieht dazu, auf Vorschau und wieder auf Löschen
       zu klicken, ohne hinzusehen. (Didi, 23.08.2026.) */
    const alt = "person=p-1|mitgliedschaften=0|konto=0|mitglieder=1";
    const neu = "person=p-1|mitgliedschaften=1|konto=1|mitglieder=2";
    expect(nenneUnterschiede(alt, neu)).toEqual([
      "konto: 0 → 1", "mitglieder: 1 → 2", "mitgliedschaften: 0 → 1",
    ]);
  });

  it("nennt nichts, wenn nichts abweicht", () => {
    const g = "person=p-1|mitgliedschaften=0|konto=0|mitglieder=1";
    expect(nenneUnterschiede(g, g)).toEqual([]);
  });

  it("nennt einen Posten, den es vorher gar nicht gab", () => {
    expect(nenneUnterschiede("person=p-1", "person=p-1|kader=2"))
      .toEqual(["kader: — → 2"]);
  });
});
