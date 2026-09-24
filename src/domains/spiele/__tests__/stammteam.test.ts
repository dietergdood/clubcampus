import { describe, it, expect } from "vitest";
import {
  bestimmeStammteam, STAMMTEAM_LAUT,
  type StammteamZeile, type StammteamRegel,
} from "../stammteam.ts";

/* Die Attrappe traegt genau die zwei Felder des Typs. Kommt ein drittes
   dazu, faellt es hier auf, statt still als `undefined` durch die Regel
   zu laufen. */
function zeile(teil: Partial<StammteamZeile>): StammteamZeile {
  return { sfv_team_id: 7, spielzeit: 90, ...teil };
}

describe("bestimmeStammteam — eine Mannschaft", () => {
  it("nennt sie und begruendet mit Kader", () => {
    expect(bestimmeStammteam([zeile({ sfv_team_id: 7 })]))
      .toEqual({ sfv_team_id: 7, regel: "kader" });
  });

  /* Im Kader gefuehrt und nicht gespielt ist eine Kaderzugehoerigkeit.
     Wer hier auf die Einsaetze sieht statt auf die Zeilen, verliert das
     Stammteam jedes Ersatzspielers, der die Saison auf der Bank sass. */
  it("bleibt Kader, wenn sie dort NIE gespielt hat", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7, spielzeit: 0 }),
      zeile({ sfv_team_id: 7, spielzeit: 0 }),
    ])).toEqual({ sfv_team_id: 7, regel: "kader" });
  });

  /* ⚠ Vier Zeilen, eine Mannschaft. Wer Zeilen zaehlt statt Mannschaften,
     antwortet hier mehrere_kader — und begruendet ein eindeutiges
     Stammteam mit einem Gleichstand, den es nicht gab. */
  it("zaehlt vier Zeilen derselben Mannschaft als EINEN Kader", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7 }), zeile({ sfv_team_id: 7 }),
      zeile({ sfv_team_id: 7 }), zeile({ sfv_team_id: 7 }),
    ])).toEqual({ sfv_team_id: 7, regel: "kader" });
  });
});

describe("bestimmeStammteam — mehrere Mannschaften", () => {
  it("nimmt die mit den meisten Einsaetzen, 8 gegen 2", () => {
    const zeilen: StammteamZeile[] = [
      ...Array.from({ length: 8 }, () => zeile({ sfv_team_id: 12 })),
      ...Array.from({ length: 2 }, () => zeile({ sfv_team_id: 3 })),
    ];
    expect(bestimmeStammteam(zeilen))
      .toEqual({ sfv_team_id: 12, regel: "mehrere_kader" });
  });

  /* ⚠ Die 12 muss auch dann gewinnen, wenn die 3 zuerst kommt — sonst
     haengt das Ergebnis an der Sortierung der Abfrage. */
  it("entscheidet nach Einsaetzen, nicht nach der Reihenfolge der Eingabe", () => {
    const viel = Array.from({ length: 8 }, () => zeile({ sfv_team_id: 12 }));
    const wenig = Array.from({ length: 2 }, () => zeile({ sfv_team_id: 3 }));
    expect(bestimmeStammteam([...wenig, ...viel]).sfv_team_id).toBe(12);
    expect(bestimmeStammteam([...viel, ...wenig]).sfv_team_id).toBe(12);
  });
});

/* ⚠ Willkuerlich, aber stabil — und die Stabilitaet ist der Gegenstand
   dieser Faelle, nicht die Wahl. Ein Export, der bei jedem Druck eine
   andere Mannschaft nennt, ist von einem Fehler nicht zu unterscheiden. */
describe("bestimmeStammteam — Gleichstand", () => {
  it("nimmt bei gleich vielen Einsaetzen die kleinere Teamnummer", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 41 }), zeile({ sfv_team_id: 9 }),
    ])).toEqual({ sfv_team_id: 9, regel: "mehrere_kader" });
  });

  it("antwortet in BEIDEN Eingabereihenfolgen gleich", () => {
    const a = zeile({ sfv_team_id: 41 }), b = zeile({ sfv_team_id: 9 });
    expect(bestimmeStammteam([a, b])).toEqual(bestimmeStammteam([b, a]));
    expect(bestimmeStammteam([a, b]).sfv_team_id).toBe(9);
  });

  /* ⚠ Zwei Mannschaften, ueberall die gemessene Null: KEINE hat einen
     Einsatz. Die Regel darf hier nicht in ein `undefined` laufen — ein
     `Math.max` ueber eine leere Auswahl tut genau das, und die Spalte
     stuende dann ohne Fehlermeldung leer. */
  it("laeuft bei null Einsaetzen auf BEIDEN Seiten nicht ins Leere", () => {
    const erg = bestimmeStammteam([
      zeile({ sfv_team_id: 41, spielzeit: 0 }),
      zeile({ sfv_team_id: 9, spielzeit: 0 }),
    ]);
    expect(erg).toEqual({ sfv_team_id: 9, regel: "mehrere_kader" });
    expect(erg.sfv_team_id).not.toBeUndefined();
  });
});

/* ── Die Entscheidung, die man nicht sieht, wenn man sie nicht prueft ──────
   `0` ist ein GEMESSENER Wert, `null` eine FEHLENDE Messung. Bei 12 von 14
   Trainingsspielen fehlen die Minuten ganz, und dort haben die Leute
   gespielt. Dieselbe Auslegung wie `rolleAus()` in `wpNutzlast.ts`. */
describe("bestimmeStammteam — was als Einsatz zaehlt", () => {
  /* ⚠ Der Fall, der eine falsche Umsetzung faengt: Team 3 hat DREI Zeilen
     und Team 12 nur EINE. Wer Zeilen zaehlt, nimmt die 3; wer `null` als
     kein Einsatz liest, nimmt sie auch. Richtig ist 12 — ein Einsatz
     gegen keinen. */
  it("zaehlt eine fehlende Spielzeit als Einsatz und schlaegt damit drei gemessene Nullen", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 3, spielzeit: 0 }),
      zeile({ sfv_team_id: 3, spielzeit: 0 }),
      zeile({ sfv_team_id: 3, spielzeit: 0 }),
      zeile({ sfv_team_id: 12, spielzeit: null }),
    ])).toEqual({ sfv_team_id: 12, regel: "mehrere_kader" });
  });

  /* Der gemessene Datenfehler der Quelle: eine Zeile traegt 54/32/-22
     (CLAUDE.md, 10.09.2026). Korrigiert sind es 22 Minuten, also ein
     Einsatz — und so wird er gezaehlt. */
  it("zaehlt eine negative Spielzeit als Einsatz, nicht als Null", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 3, spielzeit: 0 }),
      zeile({ sfv_team_id: 12, spielzeit: -22 }),
    ])).toEqual({ sfv_team_id: 12, regel: "mehrere_kader" });
  });
});

describe("bestimmeStammteam — kein Kader", () => {
  it("gibt bei leerer Eingabe kein erfundenes Team", () => {
    expect(bestimmeStammteam([]))
      .toEqual({ sfv_team_id: null, regel: "kein_kader" });
  });

  /* ⚠ ⚠ DIESER FALL IST HEUTE ERREICHBAR, und der Auftrag hielt ihn fuer
     unerreichbar. Zwei Wege muss man auseinanderhalten:

       · eine Person OHNE jede Aufstellungszeile kommt in dieser Liste
         nicht vor, WEIL die Menge aus `spiel_aufstellung` stammt. Dieser
         Weg ist zu, und er war der gemeinte.
       · eine Person, deren Zeilen ALLE `sfv_team_id = null` tragen —
         dieser Weg ist OFFEN. Die Spalte ist nullable, `zahl(p.teamId)`
         in `matchdaten.ts:142` gibt `null` bei fehlendem oder unlesbarem
         Wert, und die Swagger-Datei deklariert fuer `Player` ueberhaupt
         kein Pflichtfeld (`required` fehlt ganz, gemessen 24.09.2026).

     Ob es solche Zeilen im Bestand gibt, ist ungemessen. Die Regel muss
     sie trotzdem tragen: sie hat gespielt, wir wissen nur nicht, fuer
     wen — und das ist etwas anderes als kein Team. */
  it("traegt eine Person, deren Zeilen alle ohne Teamnummer sind", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: null, spielzeit: 90 }),
      zeile({ sfv_team_id: null, spielzeit: 45 }),
    ])).toEqual({ sfv_team_id: null, regel: "kein_kader" });
  });

  /* Eine Zeile ohne Teamnummer darf die eine Mannschaft daneben nicht zu
     mehreren Kadern machen — sie sagt nichts ueber eine Mannschaft. */
  it("uebergeht Zeilen ohne Teamnummer, statt sie als Kader zu zaehlen", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7 }),
      zeile({ sfv_team_id: null }),
    ])).toEqual({ sfv_team_id: 7, regel: "kader" });
  });
});

/* Die Beschriftung ist der Vertrag mit dem Export. Ein Umformulieren hier
   aendert eine Spalte in einer Datei, die jemand liest — deshalb stehen
   die drei Texte im Wortlaut da und nicht bloss als vorhanden. */
describe("STAMMTEAM_LAUT", () => {
  it("beschriftet jede Regel im abgestimmten Wortlaut", () => {
    expect(STAMMTEAM_LAUT).toEqual({
      kader: "Kader",
      mehrere_kader: "mehrere Kader, meiste Einsätze",
      kein_kader: "kein Kader, meiste Einsätze",
    });
  });

  /* ⚠ Jede Regel, die `bestimmeStammteam` zurueckgeben KANN, braucht eine
     Beschriftung — sonst stuende im Export ein `undefined`. Die drei Werte
     stehen hier ausgeschrieben, damit der Fall rot wird, wenn eine vierte
     Regel dazukommt und niemand an die Spalte denkt. */
  it("laesst keine Regel ohne Text", () => {
    const alle: StammteamRegel[] = ["kader", "mehrere_kader", "kein_kader"];
    for (const r of alle) {
      expect(STAMMTEAM_LAUT[r]).toBeTruthy();
      expect(typeof STAMMTEAM_LAUT[r]).toBe("string");
    }
    expect(Object.keys(STAMMTEAM_LAUT).sort()).toEqual([...alle].sort());
  });
});
