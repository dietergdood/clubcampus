/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/protokollAllowlist.test.ts

   Was von einem Lauf nach `api_sync_log.details` geschrieben wird.

   ⚠ ANLASS. Am 21.08.2026 bekam das Ergebnisobjekt ein Feld
   (`offene_namen`), das ausdrücklich NICHT gespeichert werden
   sollte — und wurde gespeichert, weil `details: erg` das ganze
   Objekt schrieb. 903 Klarnamen in sieben Läufen, ohne dass etwas
   fehlschlug. Ein neues Feld erbt jeden Ausgang des Objekts.

   ⚠ DIE ATTRAPPE IST TYPISIERT. `LaufErgebnis` steht als Typ am
   Fixture, nicht als abgeschriebene Form: eine erfundene Spalte
   ist damit ein Compilerfehler, und ein neues Feld im echten Typ
   fällt hier auf, statt still durchzureisen. Eine Attrappe, die
   die Form abschreibt, prüft die Abschrift.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { fuersProtokoll, fuerZeitplanAntwort } from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";
import type { LaufErgebnis } from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";

const LAUF: LaufErgebnis = {
  status: "ok",
  meldung: "Matchdaten 10 Spiel(e)",
  spiele: { neu: 1, aktualisiert: 2, ohne_team: 0, nicht_mehr_geliefert: 0 },
  ranglisten: { geschrieben: 4, entfernt: 0, gruppen: 1 },
  verwaiste_zuordnungen: 0,
  derbys: 1,
  saison: { id: 2026, name: "2026/27" },
  logos: { geholt: 3, fehlt: 1 },
  matchdaten: {
    spiele_geholt: 10, aufstellung_zeilen: 156, ereignisse_zeilen: 42,
    eigene_unzugeordnet: 177, zuordnungen_gesamt: 0, paesse_geschrieben: 0,
    pass_konflikte: ["Mitglied 633: zwei Passnummern"],
    nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
  },
};

describe("fuersProtokoll", () => {
  it("nennt unter matchdaten genau die erlaubten Schluessel", () => {
    /* ⚠ DIE DURABLE PROBE. `offene_namen` gibt es im Lauf-Ergebnis nicht
       mehr — es zu verbieten waere jetzt eine Pruefung gegen etwas, das
       nicht existiert. Was bleibt, ist die Frage, die den Vorfall
       verhindert haette: kommt hier etwas an, das niemand aufgezaehlt hat?
       Ein neues Feld in MatchdatenErgebnis macht diesen Fall rot. */
    const md = fuersProtokoll(LAUF).matchdaten as Record<string, unknown>;
    expect(Object.keys(md).sort()).toEqual([
      "aufstellung_zeilen", "eigene_unzugeordnet", "ereignisse_zeilen", "fehler",
      "fehlermeldungen", "nachzug_meldungen", "paesse_geschrieben", "pass_konflikte",
      "spiele_geholt", "zuordnungen_gesamt",
    ]);
  });

  it("behaelt die Zahlen, die das Protokoll braucht", () => {
    const md = fuersProtokoll(LAUF).matchdaten as Record<string, unknown>;
    expect(md.spiele_geholt).toBe(10);
    expect(md.aufstellung_zeilen).toBe(156);
    expect(md.eigene_unzugeordnet).toBe(177);
    expect(md.pass_konflikte).toEqual(["Mitglied 633: zwei Passnummern"]);
  });

  it("nennt auf oberster Ebene genau die erlaubten Schluessel", () => {
    /* Aufgezaehlt, nicht gezaehlt: kaeme ein Feld dazu, waere die Liste
       hier rot und nicht nur die Laenge. */
    expect(Object.keys(fuersProtokoll(LAUF)).sort()).toEqual([
      "derbys", "logos", "matchdaten", "meldung", "ranglisten",
      "saison", "spiele", "status", "verwaiste_zuordnungen",
    ]);
  });

  it("laesst saison und logos weg, wenn der Lauf sie nicht hatte", () => {
    const ohne: LaufErgebnis = { ...LAUF, saison: undefined, logos: undefined, matchdaten: undefined };
    const r = fuersProtokoll(ohne);
    expect(r).not.toHaveProperty("saison");
    expect(r).not.toHaveProperty("logos");
    expect(r).not.toHaveProperty("matchdaten");
  });
});

describe("fuerZeitplanAntwort", () => {
  it("gibt dem Zeitplan dieselbe Auswahl — seine Antwort landet in net._http_response", () => {
    expect(fuerZeitplanAntwort(LAUF)).toEqual(fuersProtokoll(LAUF));
  });
});
