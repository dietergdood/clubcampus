import { describe, it, expect } from "vitest";
import {
  bestimmeStammteam, STAMMTEAM_LAUT,
  type StammteamZeile, type StammteamRegel,
} from "../stammteam.ts";

/* ═══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DIE KENNUNGEN SIND AM 24.09.2026 ANDERE GEWORDEN, UND ZWAR NICHT
   NUR IM WORTLAUT.

   Vorher: `kader` · `mehrere_kader` · `kein_kader`.
   Jetzt:  `nur_dieses_team` · `meiste_einsaetze` · `gleichstand` ·
           `ohne_team`.

   Der Grund steht in `stammteam.ts`: einen Kader je Mannschaft gibt es
   beim Verband nicht (gemessen), also gilt immer „meiste Einsaetze", und
   was die Spalte sagen kann, ist die EINDEUTIGKEIT der Wahl.

   ⚠ DER GLEICHSTAND IST EINE NEUE STUFE, keine Umbenennung. Er steckte
   vorher unsichtbar in `mehrere_kader`. Jeder Fall unten, der ihn
   erwartet, hielt vorher `mehrere_kader` — und er ist NICHT angepasst
   worden, bis er gruen war: die ZUSAGE ueber das Verhalten (kleinere
   Teamnummer, stabil in beiden Eingabereihenfolgen) ist unveraendert, nur
   die Kennung daneben ist feiner geworden. Das ist der Unterschied
   zwischen einer geaenderten Entscheidung und einem geloeschten Befund.
   ═══════════════════════════════════════════════════════════════════════ */

/* Die Attrappe traegt genau die zwei Felder des Typs. Kommt ein drittes
   dazu, faellt es hier auf, statt still als `undefined` durch die Regel
   zu laufen. */
function zeile(teil: Partial<StammteamZeile>): StammteamZeile {
  return { sfv_team_id: 7, spielzeit: 90, ...teil };
}

describe("bestimmeStammteam — eine Mannschaft", () => {
  it("nennt sie und begruendet mit „nur dieses Team“", () => {
    expect(bestimmeStammteam([zeile({ sfv_team_id: 7 })]))
      .toEqual({ sfv_team_id: 7, regel: "nur_dieses_team" });
  });

  /* ⚠ Der bestellte Fall: ALLE Einsaetze fuer ein Team. Mehrere Zeilen,
     damit der Fall nicht auch dann gruen waere, wenn die Regel bloss die
     erste Zeile ansaehe. */
  it("bleibt „nur dieses Team“, wenn ALLE Einsaetze derselben Mannschaft gelten", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 12 }), zeile({ sfv_team_id: 12 }),
      zeile({ sfv_team_id: 12 }), zeile({ sfv_team_id: 12 }),
      zeile({ sfv_team_id: 12 }),
    ])).toEqual({ sfv_team_id: 12, regel: "nur_dieses_team" });
  });

  /* Im Kader gefuehrt und nicht gespielt ist eine Zugehoerigkeit.
     Wer hier auf die Einsaetze sieht statt auf die Zeilen, verliert das
     Stammteam jedes Ersatzspielers, der die Saison auf der Bank sass.
     ⚠ Und die Kennung darf dann NICHT `gleichstand` sein: es gibt nur
     eine Mannschaft, also nichts, wogegen sie gleichstehen koennte. */
  it("bleibt eindeutig, wenn sie dort NIE gespielt hat", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7, spielzeit: 0 }),
      zeile({ sfv_team_id: 7, spielzeit: 0 }),
    ])).toEqual({ sfv_team_id: 7, regel: "nur_dieses_team" });
  });

  /* ⚠ Vier Zeilen, eine Mannschaft. Wer Zeilen zaehlt statt Mannschaften,
     antwortet hier `meiste_einsaetze` — und begruendet ein eindeutiges
     Stammteam mit einem Vergleich, den es nicht gab. */
  it("zaehlt vier Zeilen derselben Mannschaft als EINE Mannschaft", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7 }), zeile({ sfv_team_id: 7 }),
      zeile({ sfv_team_id: 7 }), zeile({ sfv_team_id: 7 }),
    ])).toEqual({ sfv_team_id: 7, regel: "nur_dieses_team" });
  });
});

describe("bestimmeStammteam — mehrere Mannschaften", () => {
  it("nimmt die mit den meisten Einsaetzen, 8 gegen 2", () => {
    const zeilen: StammteamZeile[] = [
      ...Array.from({ length: 8 }, () => zeile({ sfv_team_id: 12 })),
      ...Array.from({ length: 2 }, () => zeile({ sfv_team_id: 3 })),
    ];
    expect(bestimmeStammteam(zeilen))
      .toEqual({ sfv_team_id: 12, regel: "meiste_einsaetze" });
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

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DER GLEICHSTAND IST EINE EIGENE KENNUNG (24.09.2026)

   Er ist der Grund, aus dem die Spalte ueberhaupt existiert: eine
   Mannschaft, die allein aus der kleineren Teamnummer hervorgeht, ist
   willkuerlich gewaehlt, und das muss in der Datei stehen. Bis zum
   24.09.2026 stand dort `mehrere Kader, meiste Einsaetze` — derselbe Text
   wie bei einem klaren Vorsprung.

   ⚠ Die Willkuer ist stabil, und DAS ist die Zusage: ein Export, der bei
   jedem Druck eine andere Mannschaft nennt, ist von einem Fehler nicht zu
   unterscheiden.
   ══════════════════════════════════════════════════════════════════════ */
describe("bestimmeStammteam — Gleichstand", () => {
  /* ⚠ DER FALL, DER DIE NEUE AUFTEILUNG TRAEGT: zwei Mannschaften, und die
     Kennung haengt allein daran, OB eine streng mehr hat. Beide Lagen
     stehen absichtlich in EINEM Fall nebeneinander — getrennt waere jede
     fuer sich auch gruen, wenn beide dieselbe Kennung bekaemen, und genau
     das war der Zustand vorher. */
  it("⚠ unterscheidet Gleichstand von einem echten Vorsprung", () => {
    const ungleich = bestimmeStammteam([
      zeile({ sfv_team_id: 41 }), zeile({ sfv_team_id: 41 }),
      zeile({ sfv_team_id: 9 }),
    ]);
    const gleich = bestimmeStammteam([
      zeile({ sfv_team_id: 41 }), zeile({ sfv_team_id: 9 }),
    ]);
    expect(ungleich).toEqual({ sfv_team_id: 41, regel: "meiste_einsaetze" });
    expect(gleich).toEqual({ sfv_team_id: 9, regel: "gleichstand" });
    /* Und ausgeschrieben, weil es die Aussage des Falls ist: dieselbe
       Mannschaftszahl, verschiedene Kennung. */
    expect(ungleich.regel).not.toBe(gleich.regel);
  });

  it("nimmt bei gleich vielen Einsaetzen die kleinere Teamnummer", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 41 }), zeile({ sfv_team_id: 9 }),
    ])).toEqual({ sfv_team_id: 9, regel: "gleichstand" });
  });

  it("antwortet in BEIDEN Eingabereihenfolgen gleich", () => {
    const a = zeile({ sfv_team_id: 41 }), b = zeile({ sfv_team_id: 9 });
    expect(bestimmeStammteam([a, b])).toEqual(bestimmeStammteam([b, a]));
    expect(bestimmeStammteam([a, b]).sfv_team_id).toBe(9);
  });

  /* ⚠ ⚠  EIN GLEICHSTAND UNTER DEN VERLIERERN IST KEINER FUER DIE WAHL.
     5 · 2 · 2: die 5 gewinnt streng. Wer „irgendwo gleich viele" zaehlt,
     meldet hier Gleichstand — und behauptet eine Willkuer, die es nicht
     gab. Das ist die teurere Fehlrichtung: ein zu oft gemeldeter
     Gleichstand macht die Spalte wertlos, und dann liest sie niemand mehr. */
  it("⚠ meldet KEINEN Gleichstand, wenn nur die Unterlegenen gleichstehen", () => {
    expect(bestimmeStammteam([
      ...Array.from({ length: 5 }, () => zeile({ sfv_team_id: 20 })),
      ...Array.from({ length: 2 }, () => zeile({ sfv_team_id: 3 })),
      ...Array.from({ length: 2 }, () => zeile({ sfv_team_id: 8 })),
    ])).toEqual({ sfv_team_id: 20, regel: "meiste_einsaetze" });
  });

  /* ⚠ Drei Mannschaften an der Spitze: der Gleichstand ist nicht auf zwei
     beschraenkt, und die kleinste Nummer gewinnt. */
  it("traegt einen Gleichstand zu DRITT", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 41 }), zeile({ sfv_team_id: 9 }),
      zeile({ sfv_team_id: 17 }),
    ])).toEqual({ sfv_team_id: 9, regel: "gleichstand" });
  });

  /* ⚠ Zwei Mannschaften, ueberall die gemessene Null: KEINE hat einen
     Einsatz. Die Regel darf hier nicht in ein `undefined` laufen — ein
     `Math.max` ueber eine leere Auswahl tut genau das, und die Spalte
     stuende dann ohne Fehlermeldung leer.
     ⚠ Null gegen null IST ein Gleichstand: gleich viele Einsaetze,
     naemlich keine. Vorher hiess derselbe Fall `mehrere_kader`. */
  it("laeuft bei null Einsaetzen auf BEIDEN Seiten nicht ins Leere", () => {
    const erg = bestimmeStammteam([
      zeile({ sfv_team_id: 41, spielzeit: 0 }),
      zeile({ sfv_team_id: 9, spielzeit: 0 }),
    ]);
    expect(erg).toEqual({ sfv_team_id: 9, regel: "gleichstand" });
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
    ])).toEqual({ sfv_team_id: 12, regel: "meiste_einsaetze" });
  });

  /* Der gemessene Datenfehler der Quelle: eine Zeile traegt 54/32/-22
     (CLAUDE.md, 10.09.2026). Korrigiert sind es 22 Minuten, also ein
     Einsatz — und so wird er gezaehlt. */
  it("zaehlt eine negative Spielzeit als Einsatz, nicht als Null", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 3, spielzeit: 0 }),
      zeile({ sfv_team_id: 12, spielzeit: -22 }),
    ])).toEqual({ sfv_team_id: 12, regel: "meiste_einsaetze" });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DIE VIERTE KENNUNG — bestellt waren DREI Texte, es gibt VIER LAGEN

   Eine Person, deren Zeilen ALLE `sfv_team_id = null` tragen, hat keine
   Mannschaft, die genannt werden koennte. Sie in eine der drei bestellten
   Kennungen fallen zu lassen waere jedes Mal eine Behauptung:
   `nur_dieses_team` — es gibt kein Team; `gleichstand` — es gab keinen
   Vergleich; `meiste_einsaetze` — es wurde nichts gezaehlt.

   ⚠ Der Fall ist ERREICHBAR (gemessen 24.09.2026 an Code und
   Spezifikation, siehe `stammteam.ts`), und ob er im Bestand steht, ist
   ungemessen. Er wird getragen und nicht weggelassen.
   ══════════════════════════════════════════════════════════════════════ */
describe("bestimmeStammteam — keine Team-Angabe", () => {
  it("gibt bei leerer Eingabe kein erfundenes Team", () => {
    expect(bestimmeStammteam([]))
      .toEqual({ sfv_team_id: null, regel: "ohne_team" });
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
    ])).toEqual({ sfv_team_id: null, regel: "ohne_team" });
  });

  /* ⚠ DIE GEGENPROBE ZUR VIERTEN KENNUNG, und ohne sie waere die
     Entscheidung nicht festgehalten: `ohne_team` ist KEINE der drei
     anderen. Waere sie stillschweigend in `nur_dieses_team` gefallen —
     der naheliegendste Griff, weil beide „eine Mannschaft" ergeben —,
     stuende in der Datei eine Herkunft fuer eine Mannschaft, die es nicht
     gibt. */
  it("⚠ ist ausdruecklich KEINE der drei anderen Kennungen", () => {
    const { regel } = bestimmeStammteam([zeile({ sfv_team_id: null })]);
    expect(regel).toBe("ohne_team");
    expect(regel).not.toBe("nur_dieses_team");
    expect(regel).not.toBe("meiste_einsaetze");
    expect(regel).not.toBe("gleichstand");
  });

  /* Eine Zeile ohne Teamnummer darf die eine Mannschaft daneben nicht zu
     mehreren machen — sie sagt nichts ueber eine Mannschaft. */
  it("uebergeht Zeilen ohne Teamnummer, statt sie als Mannschaft zu zaehlen", () => {
    expect(bestimmeStammteam([
      zeile({ sfv_team_id: 7 }),
      zeile({ sfv_team_id: null }),
    ])).toEqual({ sfv_team_id: 7, regel: "nur_dieses_team" });
  });
});

/* Die Beschriftung ist der Vertrag mit dem Export. Ein Umformulieren hier
   aendert eine Spalte in einer Datei, die jemand liest — deshalb stehen
   die vier Texte im Wortlaut da und nicht bloss als vorhanden. */
describe("STAMMTEAM_LAUT", () => {
  it("beschriftet jede Regel im abgestimmten Wortlaut", () => {
    expect(STAMMTEAM_LAUT).toEqual({
      nur_dieses_team: "nur dieses Team",
      meiste_einsaetze: "meiste Einsätze",
      gleichstand: "Gleichstand",
      ohne_team: "keine Team-Angabe",
    });
  });

  /* ⚠ ⚠  UND KEIN TEXT NENNT NOCH DEN KADER. Den gibt es beim Verband
     nicht (gemessen), und die alten Texte behaupteten ihn dreimal. Ohne
     diesen Fall koennte jemand „Kader" zurueckschreiben, und alle anderen
     Faelle blieben gruen, weil sie aus der Map lesen. */
  it("⚠ nennt nirgends mehr einen Kader — den gibt es beim Verband nicht", () => {
    for (const text of Object.values(STAMMTEAM_LAUT)) {
      expect(text.toLowerCase()).not.toContain("kader");
    }
  });

  /* ⚠ Jede Regel, die `bestimmeStammteam` zurueckgeben KANN, braucht eine
     Beschriftung — sonst stuende im Export ein `undefined`. Die vier Werte
     stehen hier ausgeschrieben, damit der Fall rot wird, wenn eine fuenfte
     Regel dazukommt und niemand an die Spalte denkt. */
  it("laesst keine Regel ohne Text", () => {
    const alle: StammteamRegel[] = [
      "nur_dieses_team", "meiste_einsaetze", "gleichstand", "ohne_team",
    ];
    for (const r of alle) {
      expect(STAMMTEAM_LAUT[r]).toBeTruthy();
      expect(typeof STAMMTEAM_LAUT[r]).toBe("string");
    }
    expect(Object.keys(STAMMTEAM_LAUT).sort()).toEqual([...alle].sort());
  });

  /* ⚠ Vier verschiedene Texte, nicht bloss vier Schluessel. Zwei Lagen mit
     demselben Text waeren in der Datei nicht zu unterscheiden — und genau
     das war der Zustand bis zum 24.09.2026, als Gleichstand und Vorsprung
     dieselbe Zeile trugen. */
  it("⚠ gibt jeder Lage einen EIGENEN Text", () => {
    const texte = Object.values(STAMMTEAM_LAUT);
    expect(new Set(texte).size).toBe(texte.length);
  });
});
