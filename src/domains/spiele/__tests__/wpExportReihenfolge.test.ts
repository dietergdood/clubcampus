/* ══════════════════════════════════════════════════════════════════════
   Die Warteschlange des Spiele-Laufs — 26.09.2026

   ⚠ ⚠  DIE ZUSAGE, UM DIE ES GEHT:

   > **Jede Mannschaft geht nach spaetestens `ceil(n / pro Lauf)` Laeufen
   > hinaus.**

   Das Zeitbudget (`EXPORT_BUDGET_MS`) laesst einen Lauf von selbst
   aufhoeren; was er nicht mehr geschafft hat, steht als
   `details.offen_teams` im Protokoll und geht beim naechsten Lauf zuerst.
   Dieser Satz steht seit dem 24.09.2026 in der Meldung, die ein Mensch
   nach jedem Lauf zu sehen bekommt:

     „14 Mannschaft(en) offen — das Zeitbudget war erreicht.
      Sie gehen beim nächsten Lauf zuerst hinaus: …"

   ── DER DEFEKT, DEN DIESE DATEI EINFAENGT ────────────────────────────

   Der Satz war ein Versprechen MIT Mechanismus — und der Mechanismus war
   zur Haelfte gebaut. `ordneOffeneNachVorn()` stellte die offenen nach
   vorn, **sortierte sie dabei aber zurueck in die globale Nummernfolge**.
   Damit war die Warteschlange nach jedem Lauf neu sortiert, und wer in
   ihrer Mitte stand, kam nie an die Spitze.

   Gemessen am 26.09.2026, nachgestellt mit 21 Mannschaften und 7 je Lauf:
   ein Zweierkreis, in dem sieben Mannschaften NIE hinausgehen. Der Beleg
   ist die gemeldete Zeile selbst — der Nachbau liefert `offen_teams`
   zeichengleich so, wie sie nach einem scharfen Lauf dastand:

     73031, 73032, 73035, 73039, 73042, 73044, 79348,
     38301, 38302, 38304, 38306, 38308, 38309, 70535

   Die ersten sieben sind die, die dauerhaft stehenbleiben.

   ── WAS HIER ECHT IST UND WAS VORGABE ────────────────────────────────

   ⚠ Die 14 Nummern oben sind GEMESSEN — sie stammen aus der Meldung eines
   scharfen Laufs. Die sieben dazwischen sind es NICHT: welche
   Mannschaften in diesem Lauf hinausgingen, nennt die Meldung nicht. Sie
   stehen hier als `71001`–`71007`, und sie sind **erfunden** — eine
   Vorgabe fuer den Nachbau, keine Behauptung ueber den Bestand.

   ⚠ Der Nachbau sagt aber etwas ueber den Bestand VORHER: damit die
   gemeldete Liste so zustande kommt, muessen die sieben fehlenden Nummern
   zwischen `70535` und `73031` liegen. Das ist eine Vorhersage und keine
   Messung; sie faellt mit `select sfv_team_id from teams where
   sfv_team_id is not null order by 1`.

   ── WARUM EIN NACHBAU DER SCHLEIFE ───────────────────────────────────

   `wp-export/index.ts` importiert `createClient` von esm.sh und ist aus
   vitest nicht ladbar. Nachgebaut sind deshalb genau zwei Zeilen der
   Schleife — „die ersten n gehen hinaus, der Rest bleibt offen" —, und
   zwar die, die in `index.ts` woertlich dastehen (`teile[r].sfv_team_id`
   ab `ix`). Die ENTSCHEIDUNG selbst wird nicht nachgebaut: sie kommt aus
   `laufBudget.ts` und wird von dort importiert.

   ⚠ Damit der Nachbau nicht am echten Code vorbeilaeuft, haelt der letzte
   Fall ueber den Syntaxbaum fest, dass `index.ts` die Liste nicht
   sortiert. Eine Sortierung an einem der beiden Enden machte aus der
   Warteschlange wieder eine Menge — ohne dass etwas fehlschlaegt.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { suche, jederKnoten } from "../../../test-helpers/quelltext.ts";
import { ordneOffeneNachVorn } from "../../../../supabase/functions/wp-export/laufBudget.ts";

const INDEX = "supabase/functions/wp-export/index.ts";

/* ── Der Bestand, mit dem gerechnet wird ────────────────────────────── */

/** Gemessen: die 14, die die Meldung eines scharfen Laufs als offen nennt. */
const GEMELDET_OFFEN = [
  "73031", "73032", "73035", "73039", "73042", "73044", "79348",
  "38301", "38302", "38304", "38306", "38308", "38309", "70535",
];

/** Erfunden: die sieben, die in demselben Lauf hinausgingen. Vorgabe. */
const ERFUNDEN = ["71001", "71002", "71003", "71004", "71005", "71006", "71007"];

/**
 * Alle 21, sortiert wie `teileNachTeam()` es tut.
 *
 * ⚠ Dieselbe Sortierung wie dort (`localeCompare` mit `numeric`), nicht
 * eine eigene: der Defekt entsteht GERADE daraus, dass die Nummernfolge
 * die Warteschlange ueberstimmt. Ein Nachbau mit anderer Sortierung
 * pruefte etwas anderes.
 */
const ALLE_21 = [...GEMELDET_OFFEN, ...ERFUNDEN]
  .sort((a, b) => a.localeCompare(b, "de", { numeric: true }));

/** Wie viele Mannschaften ein Lauf schafft, bevor das Budget greift. */
const PRO_LAUF = 7;

interface Teil { sfv_team_id: string }
const teileRoh: Teil[] = ALLE_21.map((sfv_team_id) => ({ sfv_team_id }));

/**
 * Die Teile-Schleife aus `index.ts`, auf ihre zwei Zeilen eingedampft.
 *
 * Ein Lauf: die offene Liste des vorigen nach vorn, die ersten `PRO_LAUF`
 * gehen hinaus, der Rest ist die offene Liste des naechsten.
 */
function lauf(offenVorher: readonly string[]): { gesendet: string[]; offen: string[] } {
  const teile = ordneOffeneNachVorn(teileRoh, offenVorher);
  return {
    gesendet: teile.slice(0, PRO_LAUF).map((t) => t.sfv_team_id),
    offen: teile.slice(PRO_LAUF).map((t) => t.sfv_team_id),
  };
}

/** `n` Laeufe hintereinander, beginnend ohne offene Liste. */
function laeufe(n: number): Array<{ gesendet: string[]; offen: string[] }> {
  const raus: Array<{ gesendet: string[]; offen: string[] }> = [];
  let offen: string[] = [];
  for (let i = 0; i < n; i++) {
    const l = lauf(offen);
    raus.push(l);
    offen = l.offen;
  }
  return raus;
}

/* ══════════════════════════════════════════════════════════════════
   1 · Die Zusage: drei Laeufe reichen fuer alle 21
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ ueber drei Laeufe geht JEDE Mannschaft mindestens einmal hinaus", () => {
  /* ⚠ ⚠  DER FALL, DER DEN DEFEKT EINFAENGT.

     Er nennt die Nummern, statt zu zaehlen: `toHaveLength(21)` waere auch
     dann gruen, wenn dieselbe Mannschaft dreimal hinausginge und eine
     andere nie — und genau das war der Defekt. */
  it("nennt nach drei Laeufen jede der 21 Nummern", () => {
    const drei = laeufe(3);
    const hinaus = [...new Set(drei.flatMap((l) => l.gesendet))]
      .sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
    expect(hinaus).toEqual([
      "38301", "38302", "38304", "38306", "38308", "38309",
      "70535",
      "71001", "71002", "71003", "71004", "71005", "71006", "71007",
      "73031", "73032", "73035", "73039", "73042", "73044", "79348",
    ]);
  });

  /* ⚠ Die sieben, die im Zweierkreis dauerhaft stehenblieben, einzeln
     benannt. Der Fall darueber wuerde auch umfallen, wenn eine ganz
     andere Mannschaft fehlte — dieser sagt, WELCHE es waren. */
  it("die sieben aus dem Zweierkreis sind dabei", () => {
    const hinaus = new Set(laeufe(3).flatMap((l) => l.gesendet));
    for (const nr of ["73031", "73032", "73035", "73039", "73042", "73044", "79348"]) {
      expect({ nr, hinaus: hinaus.has(nr) }).toEqual({ nr, hinaus: true });
    }
  });

  /* ⚠ ⚠  DIE SCHLANGE WIRD NIE LEER, UND DAS IST RICHTIG SO.

     `index.ts` schreibt ab der Abbruchstelle ALLES in die offene Liste —
     auch die Mannschaften, die in diesem Lauf gar nicht an der Reihe
     waren. Bei 21 und 7 je Lauf stehen deshalb dauerhaft 14 darin. Das
     ist eine Rotation, keine Abarbeitung: „offen" heisst hier „dieser
     Lauf hat sie nicht angefasst", nicht „sie ist im Rueckstand".

     Ohne diesen Fall laese jemand die 14 in der Meldung als wachsenden
     Rueckstand — und genau diese Fehllesung hat den Defekt ausgeloest. */
  it("die Schlange bleibt 14 lang — sie rotiert, sie leert sich nicht", () => {
    expect(laeufe(3).map((l) => l.offen.length)).toEqual([14, 14, 14]);
  });

  /* ⚠ ⚠  DER GEMESSENE FALL, UND ER IST DER SCHAERFSTE DIESER DATEI.

     Der zweite Lauf hinterlaesst zeichengleich die Liste, die nach einem
     scharfen Lauf in der Meldung stand. Der dritte muss dann genau ihre
     ersten sieben senden — das ist das Versprechen im Wortlaut:
     „Sie gehen beim nächsten Lauf zuerst hinaus."

     Mit der alten Fassung sendet der dritte Lauf stattdessen wieder
     38301–70535, und die sieben vorn bleiben stehen. */
  it("der Lauf nach der gemeldeten Liste sendet genau deren erste sieben", () => {
    const drei = laeufe(3);
    expect(drei[1].offen).toEqual(GEMELDET_OFFEN);
    expect(drei[2].gesendet).toEqual(GEMELDET_OFFEN.slice(0, PRO_LAUF));
  });
});

/* ══════════════════════════════════════════════════════════════════
   2 · Die Schlange behaelt ihre Reihenfolge
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ die offene Liste ist eine Warteschlange, keine Menge", () => {
  /* ⚠ ⚠  DAS IST DER DEFEKT IN EINER ZEILE. Die alte Fassung lief ueber
     `teile` und lieferte `["1","2","3"]` — die Nummernfolge, nicht die
     Wartezeit. Wer am laengsten wartet, steht vorn. */
  it("die Reihenfolge von `offen` gewinnt gegen die Nummernfolge", () => {
    const teile = ["1", "2", "3", "4"].map((sfv_team_id) => ({ sfv_team_id }));
    const raus = ordneOffeneNachVorn(teile, ["3", "1", "2"]);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["3", "1", "2", "4"]);
  });

  it("wer nicht wartet, kommt hinten an — in seiner Reihenfolge", () => {
    const teile = ["1", "2", "3", "4", "5"].map((sfv_team_id) => ({ sfv_team_id }));
    const raus = ordneOffeneNachVorn(teile, ["4"]);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["4", "1", "2", "3", "5"]);
  });

  /* ⚠ Eine Nummer zweimal in der Warteschlange ist kein zweiter Platz —
     sonst ruecke sie beim naechsten Lauf doppelt vor. */
  it("eine doppelt genannte Nummer zaehlt einmal, an ihrer ersten Stelle", () => {
    const teile = ["1", "2", "3"].map((sfv_team_id) => ({ sfv_team_id }));
    const raus = ordneOffeneNachVorn(teile, ["3", "1", "3"]);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["3", "1", "2"]);
  });

  /* ⚠ Die Zusage, die aelter ist als dieser Defekt und bleiben muss: eine
     Mannschaft, die beim Umordnen wegfaellt, geht NIE hinaus. */
  it("verliert keine Mannschaft und verdoppelt keine", () => {
    const raus = ordneOffeneNachVorn(teileRoh, ["79348", "38301", "99999"]);
    expect([...raus.map((t) => t.sfv_team_id)]
      .sort((a, b) => a.localeCompare(b, "de", { numeric: true })))
      .toEqual(ALLE_21);
  });
});

/* ══════════════════════════════════════════════════════════════════
   3 · Der Nachbau misst nicht an sich selbst vorbei
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ die Warteschlange wird nirgends sortiert", () => {
  /* ⚠ ⚠  EIN `sort()` AN EINEM DER BEIDEN ENDEN SCHALTET DIE
     REIHENFOLGE AB, OHNE DASS ETWAS FEHLSCHLAEGT.

     `offenTeams` wird in der Teile-Schleife gefuellt und als
     `details.offen_teams` abgelegt; `offenVorher` kommt von dort zurueck.
     Beide sehen aus wie Listen, die man „zum Lesen" ordnen koennte — und
     danach entschiede wieder die Teamnummer statt der Wartezeit. Der
     naechste Lauf schnitte an derselben Stelle wie der vorige, und auf
     der Website staende fuer die hinteren Mannschaften dauerhaft der
     Stand von damals.

     Deshalb haelt ein Fall es fest und nicht ein Kommentar. */
  it("weder `offenTeams` noch `offenVorher` bekommen ein sort/reverse", () => {
    const treffer = suche<string>({
      frage: "wird die offene Liste in index.ts sortiert oder umgedreht?",
      /* ⚠ PFLICHT: haette die Abfrage hier nichts gefunden, waere sie
         ueber der echten Datei ebenfalls leer — und damit gruen, ohne
         etwas geprueft zu haben. */
      positivkontrolle: `
        const offenTeams = []; offenTeams.sort();
        const offenVorher = []; offenVorher.reverse();
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isCallExpression(n)) return;
          const zugriff = n.expression;
          if (!ts.isPropertyAccessExpression(zugriff)) return;
          if (!["sort", "reverse", "toSorted", "toReversed"].includes(zugriff.name.text)) return;
          /* ⚠ Nur der direkte Empfaenger. Ein `[...offenTeams].sort()`
             waere harmlos — die Kopie geht nirgends hin —, und eine
             Abfrage, die grundlos anschlaegt, wird nach dem dritten Mal
             abgeschaltet. */
          const ziel = zugriff.expression;
          if (!ts.isIdentifier(ziel)) return;
          if (ziel.text === "offenTeams" || ziel.text === "offenVorher") {
            raus.push(`${ziel.text}.${zugriff.name.text}()`);
          }
        });
        return raus;
      },
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });
});
