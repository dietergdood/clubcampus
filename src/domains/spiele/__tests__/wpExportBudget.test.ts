/* ══════════════════════════════════════════════════════════════════════
   Das Zeitbudget des Spiele-Laufs — 24.09.2026

   ⚠ ⚠  DIE ZUSAGE, UM DIE ES GEHT, IST EIN SATZ VON DIDI:

   > **Das Ergebnis eines Laufs steht IMMER im Protokoll.**

   Bis zum 24.09.2026 gab es einen Weg, auf dem das nicht galt. Der
   Spiele-Lauf sendet einen POST je Mannschaft, seriell, ohne Budget. Das
   Gateway von Supabase bricht nach 150 Sekunden ab (`IDLE_TIMEOUT`,
   gemessen am selben Tag) — und ein getoeteter Worker fuehrt **kein
   `finally`** aus:

     · die Protokollzeile bleibt auf `laeuft`, ihr Ergebnis fehlt
       endgueltig — nicht bloss ungesehen
     · `sync_laeuft_seit` bleibt gesetzt und sperrt den naechsten Lauf

   Beides sieht von aussen aus wie „der Lauf ist noch unterwegs". Genau
   diese Ununterscheidbarkeit ist der Defekt, nicht die verlorene Zeit.

   ── Was hier gehalten wird, und was ausdruecklich NICHT ──────────────

   Gehalten wird VERHALTEN, keine Abschrift:

     1. die Aufteilung der 150 Sekunden geht auf
     2. der Zeit-Ausstieg ist ein `break` — nie ein `return` oder `throw`,
        sonst spraenge er am Abschluss vorbei und die Zeile bliebe auf
        `laeuft`
     3. die Uhr laeuft ab der ANFRAGE, nicht ab dem Beginn der Funktion
     4. es GIBT ueberhaupt eine Pruefung (sonst waeren 2 und 3 ueber einer
        leeren Menge gruen)
     5. eine Mannschaft geht ganz hinaus oder gar nicht
     6. die offenen Mannschaften des letzten Laufs kommen zuerst — und der
        Schluessel, unter dem sie stehen, ist derselbe, unter dem sie
        gelesen werden

   NICHT gehalten wird, ob 90 Sekunden die richtige Zahl sind. Eine
   Schwelle ist nie durch einen Test gedeckt (CLAUDE.md); was ein Test
   halten kann, ist ihr VERHAELTNIS zur gemessenen Grenze.

   ── Warum ueber den Syntaxbaum ───────────────────────────────────────

   `wp-export/index.ts` importiert `createClient` von esm.sh und ist aus
   vitest nicht ladbar. Die reinen Teile liegen deshalb in
   `laufBudget.ts` (esm.sh-frei, direkt importiert); alles, was nur in
   `index.ts` steht, wird ueber den Baum geprueft. Ein Textmuster traefe
   die Kommentare — und dieser Kopf ist voll davon.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { suche, jederKnoten, zeileVon, findeFunktion } from "../../../test-helpers/quelltext.ts";
import {
  GATEWAY_MS, EXPORT_BUDGET_MS, EIN_TEIL_RESERVE_MS, ABSCHLUSS_RESERVE_MS,
  ordneOffeneNachVorn, leseOffeneTeams,
} from "../../../../supabase/functions/wp-export/laufBudget.ts";

const INDEX = "supabase/functions/wp-export/index.ts";
const BUDGET = "supabase/functions/wp-export/laufBudget.ts";

/* ── Bausteine ──────────────────────────────────────────────────── */

/** Ein Aufruf von `nochZeit(...)`. */
function istNochZeit(n: ts.Node): n is ts.CallExpression {
  return ts.isCallExpression(n)
    && ts.isIdentifier(n.expression)
    && n.expression.text === "nochZeit";
}

/** Enthaelt dieser Teilbaum einen Knoten dieser Art? */
function enthaelt(wurzel: ts.Node, passt: (n: ts.Node) => boolean): boolean {
  let ja = false;
  jederKnoten(wurzel, (n) => { if (passt(n)) ja = true; });
  return ja;
}

/* ══════════════════════════════════════════════════════════════════
   1 · Die Aufteilung geht auf
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ das Zeitbudget teilt die 150 Sekunden auf", () => {
  /* ⚠ Eine Aufteilung, die aufgehen MUSS, prueft sich selbst. Eine
     einzelne Zahl kann nur behauptet werden — dieselbe Bauart wie
     `zaehlung_stimmt` im Export und 37 + 5 = 42 bei den Verwarnungen. */
  it("Schleifenbudget + eine laufende Mannschaft + Abschluss passen in das Gateway", () => {
    expect(EXPORT_BUDGET_MS + EIN_TEIL_RESERVE_MS + ABSCHLUSS_RESERVE_MS)
      .toBeLessThanOrEqual(GATEWAY_MS);
  });

  /* ⚠ Die gemessene Grenze, und sie steht als Zahl da, damit eine
     Aenderung an ihr auffaellt statt still zu wirken. Gemessen am
     24.09.2026: `Request idle timeout limit (150s) reached`. */
  it("das Gateway ist die gemessenen 150 Sekunden", () => {
    expect(GATEWAY_MS).toBe(150_000);
  });

  /* ⚠ Ohne Reserve waere das Budget die Grenze selbst — und die
     Mannschaft, die beim Ablauf schon laeuft, traege den Lauf darueber
     hinaus. Die Pruefung steht VOR dem POST, nicht danach. */
  it("es bleibt Zeit fuer die Mannschaft, die beim Ablauf schon laeuft", () => {
    expect(EXPORT_BUDGET_MS).toBeLessThan(GATEWAY_MS);
    expect(EIN_TEIL_RESERVE_MS).toBeGreaterThan(0);
    expect(ABSCHLUSS_RESERVE_MS).toBeGreaterThan(0);
  });
});

/* ══════════════════════════════════════════════════════════════════
   2 · Der Ausstieg ist ein `break`
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ der Zeit-Ausstieg springt nicht am Abschluss vorbei", () => {
  it("jede Zeitpruefung endet in break — nie in return oder throw", () => {
    const treffer = suche<string>({
      frage: "verlaesst ein Zeit-Ausstieg die Funktion, statt die Schleife zu verlassen?",
      /* ⚠ Die Positivkontrolle enthaelt einen VERSTOSS — die Abfrage
         sucht Verletzungen, also muss sie dort fuendig werden. Beide
         verbotenen Formen, damit sie keine davon uebersehen kann. */
      positivkontrolle: `
        function a() { for (const x of []) { if (!nochZeit(1, 2, 3)) { return; } } }
        function b() { for (const x of []) { if (!nochZeit(1, 2, 3)) { throw new Error("x"); } } }
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isIfStatement(n)) return;
          if (!enthaelt(n.expression, istNochZeit)) return;
          const zweig = n.thenStatement;
          /* ⚠ Ein `return` oder `throw` im Zeitzweig bedeutet: der
             Abschlussblock laeuft nicht, das Protokoll bleibt auf
             `laeuft`, die Sperre bleibt stehen. Genau der Zustand, gegen
             den das Budget gebaut ist. */
          if (enthaelt(zweig, (k) => ts.isReturnStatement(k) || ts.isThrowStatement(k))) {
            raus.push(`Zeile ${zeileVon(n)}: verlaesst die Funktion statt die Schleife`);
          }
        });
        return raus;
      },
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  it("und sie bricht die Schleife wirklich ab", () => {
    /* ⚠ Die Gegenrichtung. Ohne sie waere eine Zeitpruefung ohne jeden
       Ausstieg gruen — sie enthielte ja kein `return`. Eine Pruefung, die
       nur Verbotenes zaehlt, ist bei der leeren Menge zufrieden. */
    const treffer = suche<string>({
      frage: "gibt es eine Zeitprüfung ohne break?",
      positivkontrolle: `
        function a() { for (const x of []) { if (!nochZeit(1, 2, 3)) { let y = 1; } } }
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isIfStatement(n)) return;
          if (!enthaelt(n.expression, istNochZeit)) return;
          if (!enthaelt(n.thenStatement, ts.isBreakStatement)) {
            raus.push(`Zeile ${zeileVon(n)}: Zeitprüfung ohne break`);
          }
        });
        return raus;
      },
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════
   3 · Die Uhr laeuft ab der Anfrage
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ der Nullpunkt kommt von aussen", () => {
  /* ⚠ ⚠  DAS IST DIE STELLE, AN DER EIN BUDGET STILL ZU GROSSZUEGIG
     WIRD. Das Gateway zaehlt ab der Anfrage; vor `sendeAnWordpress()`
     liegt der Aufbau der Nutzlast mit mehreren gepagten Abfragen. Ein
     `nochZeit(beginnMs, …)` — die Uhr der Funktion selbst — verschenkt
     genau diese Zeit, und zwar unsichtbar: der Lauf stiege trotzdem
     aus, nur zu spaet. */
  it("sendeAnWordpress misst nicht mit der eigenen Uhr", () => {
    const treffer = suche<string>({
      frage: "misst sendeAnWordpress das Budget ab dem eigenen Funktionsbeginn?",
      positivkontrolle: `
        async function sendeAnWordpress(db, v, erg, anfrageBeginnMs) {
          const beginnMs = Date.now();
          if (!nochZeit(beginnMs, Date.now(), 90000)) { }
        }
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const rumpf = findeFunktion(baum, "sendeAnWordpress");
        if (!rumpf) return [];
        const raus: string[] = [];
        jederKnoten(rumpf, (n) => {
          if (!istNochZeit(n)) return;
          const erstes = n.arguments[0];
          if (erstes && ts.isIdentifier(erstes) && erstes.text === "beginnMs") {
            raus.push(`Zeile ${zeileVon(n)}: misst ab dem Funktionsbeginn statt ab der Anfrage`);
          }
        });
        return raus;
      },
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });

  /* ⚠ ⚠  UND DIE PRUEFUNG DARUEBER IST WERTLOS, WENN ES GAR KEINE
     ZEITPRUEFUNG GIBT. Ohne diesen Fall waere „entfernt jemand das
     Budget" gruen — eine leere Menge verletzt keine Regel. Dieselbe
     Luecke ist in diesem Projekt viermal vorgekommen. */
  it("und sie hat ueberhaupt eine — mit dem Budget des Exports", () => {
    const treffer = suche<number>({
      frage: "prüft sendeAnWordpress das Zeitbudget?",
      positivkontrolle: `
        async function sendeAnWordpress(db, v, erg, anfrageBeginnMs) {
          if (!nochZeit(anfrageBeginnMs, Date.now(), EXPORT_BUDGET_MS)) { break; }
        }
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const rumpf = findeFunktion(baum, "sendeAnWordpress");
        if (!rumpf) return [];
        const raus: number[] = [];
        jederKnoten(rumpf, (n) => {
          if (!istNochZeit(n)) return;
          /* Mit dem Budget des Exports, nicht mit der Vorgabe: die
             Vorgabe von `nochZeit()` ist das Wappen-Budget, und das ist
             hier die falsche Marke. */
          const drittes = n.arguments[2];
          if (drittes && ts.isIdentifier(drittes) && drittes.text === "EXPORT_BUDGET_MS") {
            raus.push(zeileVon(n));
          }
        });
        return raus;
      },
    });
    expect(treffer.length).toBeGreaterThanOrEqual(1);
  });
});

/* ══════════════════════════════════════════════════════════════════
   4 · Eine Mannschaft geht ganz hinaus oder gar nicht
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ die Grenze verlaeuft ZWISCHEN Mannschaften", () => {
  /* ⚠ Der Empfaenger setzt jedes Spiel einer GELIEFERTEN Mannschaft auf
     `draft`, das nicht in der Nutzlast steht. Eine Mannschaft auf zwei
     Anfragen zu verteilen loescht drueben den halben Spielplan — und die
     Antwort meldete dabei `zurueckgezogen: 12` statt eines Fehlers.
     Das Zeitbudget ist genau die Stelle, an der jemand auf die Idee
     kaeme, eine Mannschaft aufzuteilen. */
  it("sendeTeil bekommt die ganze Spielliste, nie einen Ausschnitt", () => {
    const treffer = suche<string>({
      frage: "bekommt sendeTeil einen Ausschnitt der Spiele?",
      positivkontrolle: `
        sendeTeil(a, b, c, d, teil.spiele.slice(0, 5));
        sendeTeil(a, b, c, d, teil.spiele.filter(Boolean));
      `,
      dateien: [INDEX],
      finde: (baum) => {
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isCallExpression(n)) return;
          if (!ts.isIdentifier(n.expression) || n.expression.text !== "sendeTeil") return;
          const spiele = n.arguments[4];
          if (!spiele) return;
          /* Erlaubt ist genau `x.spiele` — ein Aufruf darauf (`.slice`,
             `.filter`, `.concat`) waere eine Teilung. */
          if (!ts.isPropertyAccessExpression(spiele) || spiele.name.text !== "spiele") {
            raus.push(`Zeile ${zeileVon(n)}: sendeTeil bekommt nicht teil.spiele`);
          }
        });
        return raus;
      },
    });
    expect(treffer.map((t) => t.fund)).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════
   5 · Die offenen Mannschaften kommen zuerst
   ══════════════════════════════════════════════════════════════════ */

describe("ordneOffeneNachVorn — der Rest des letzten Laufs geht vor", () => {
  const T = (...ids: string[]) => ids.map((sfv_team_id) => ({ sfv_team_id }));

  it("stellt die offenen nach vorn und laesst den Rest in Reihenfolge", () => {
    const raus = ordneOffeneNachVorn(T("1", "2", "3", "4"), ["3", "4"]);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["3", "4", "1", "2"]);
  });

  /* ⚠ ⚠  DAS IST DIE EIGENTLICHE ZUSAGE: es darf nichts verlorengehen.
     Eine Mannschaft, die beim Umordnen wegfaellt, geht NIE hinaus — und
     drueben bliebe der Stand von damals, ohne dass etwas fehlschlaegt. */
  it("verliert keine Mannschaft und verdoppelt keine", () => {
    const alle = T("11", "7", "3", "21", "9");
    const raus = ordneOffeneNachVorn(alle, ["21", "7"]);
    expect(raus).toHaveLength(alle.length);
    expect([...raus.map((t) => t.sfv_team_id)].sort())
      .toEqual(["11", "21", "3", "7", "9"]);
  });

  it("eine Nummer, die es nicht mehr gibt, faellt schlicht weg", () => {
    /* Eine abgemeldete Mannschaft steht noch im Protokoll des letzten
       Laufs. Sie darf die Reihenfolge nicht verletzen und keine leere
       Zeile erzeugen. */
    const raus = ordneOffeneNachVorn(T("1", "2"), ["99", "2"]);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["2", "1"]);
  });

  it("ohne offene Liste bleibt die Reihenfolge, wie sie war", () => {
    const raus = ordneOffeneNachVorn(T("1", "2", "3"), []);
    expect(raus.map((t) => t.sfv_team_id)).toEqual(["1", "2", "3"]);
  });
});

describe("leseOffeneTeams — eine alte Protokollzeile ist kein Fehler", () => {
  it("liest die Liste", () => {
    expect(leseOffeneTeams({ offen_teams: ["7", "9"] })).toEqual(["7", "9"]);
  });

  /* ⚠ Zeilen von vor dem 24.09.2026 tragen das Feld nicht. Das ist kein
     Befund, sondern die Lage — und darf keinen Wurf ergeben. */
  it("eine Zeile ohne das Feld ergibt eine leere Liste, keinen Wurf", () => {
    expect(leseOffeneTeams({ dauer_ms: 1234 })).toEqual([]);
    expect(leseOffeneTeams(null)).toEqual([]);
    expect(leseOffeneTeams(undefined)).toEqual([]);
  });

  it("was kein Array ist, wird nicht geglaubt", () => {
    expect(leseOffeneTeams({ offen_teams: "7,9" })).toEqual([]);
    expect(leseOffeneTeams({ offen_teams: 7 })).toEqual([]);
  });

  it("leere Eintraege fallen weg — sie waeren eine Mannschaft ohne Nummer", () => {
    expect(leseOffeneTeams({ offen_teams: ["7", "", "9"] })).toEqual(["7", "9"]);
  });
});

/* ══════════════════════════════════════════════════════════════════
   6 · Geschrieben und gelesen unter DEMSELBEN Schluessel
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ ⚠ der Schluessel der offenen Liste hat zwei Enden", () => {
  /* ⚠ ⚠  EIN UMBENENNEN AN EINEM ENDE SCHALTET DIE REIHENFOLGE AB, OHNE
     DASS ETWAS FEHLSCHLAEGT. Der naechste Lauf faenge wieder bei
     Mannschaft 1 an und schnitte an derselben Stelle — die hinteren
     Mannschaften gingen nie hinaus, und auf der Website staende fuer sie
     dauerhaft der Stand von damals.

     Deshalb wird der Name nicht abgeschrieben, sondern AUS `laufBudget.ts`
     GELESEN und gegen `index.ts` gehalten. Ein Test, der ihn selbst
     nennt, waere eine dritte Stelle, die auseinanderlaufen kann. */
  it("was leseOffeneTeams liest, schreibt das Protokoll", () => {
    const gelesen = suche<string>({
      frage: "unter welchem Schluessel liest leseOffeneTeams?",
      positivkontrolle: `
        function leseOffeneTeams(d) { const roh = (d as any).offen_teams; return roh; }
      `,
      dateien: [BUDGET],
      finde: (baum) => {
        const rumpf = findeFunktion(baum, "leseOffeneTeams");
        if (!rumpf) return [];
        const raus: string[] = [];
        jederKnoten(rumpf, (n) => {
          /* ⚠ NUR DER ZUGRIFF AUF DIE GECASTETE `details`-Zeile — also
             `(details as Record<…>).offen_teams`. Ein blosses „jeder
             Property-Zugriff" traf `Array.isArray` und `x.length` mit;
             die Abfrage war zu weit und meldete Namen, die keine
             Protokollschluessel sind. Ein Melder, der grundlos anschlaegt,
             wird nach dem dritten Mal abgeschaltet. */
          if (!ts.isPropertyAccessExpression(n)) return;
          let ziel: ts.Node = n.expression;
          while (ts.isParenthesizedExpression(ziel)) ziel = ziel.expression;
          if (ts.isAsExpression(ziel)) raus.push(n.name.text);
        });
        return raus;
      },
    });
    const namen = gelesen.map((t) => t.fund);
    /* ⚠ Findet die Abfrage den Namen nicht, ist das ein Wurf und kein
       gruener Test — `suche()` besteht auf der Positivkontrolle. */
    expect(namen.length).toBeGreaterThanOrEqual(1);

    const geschrieben = suche<string>({
      frage: "welche Schluessel schreibt der Abschluss in DETAILS?",
      positivkontrolle: `const x = { details: { offen_teams: [], budget_ms: 1 } };`,
      dateien: [INDEX],
      finde: (baum) => {
        /* ⚠ ⚠  NUR DAS OBJEKT HINTER `details:`, UND DAS IST DER GANZE
           UNTERSCHIED. Die erste Fassung sammelte JEDEN Schluessel der
           Datei — und war damit gruen, als `details.offen_teams` in
           `offen_mannschaften` umbenannt wurde: derselbe Name steht
           ausserdem im Rueckgabeobjekt, und den las die Abfrage mit.
           `leseOffeneTeams()` liest aber `details`, nicht die Antwort.

           Die Pruefung konnte den Fall also nicht sehen, fuer den sie
           gebaut war — sie haette nur „in Ordnung" sagen koennen.
           Gefunden hat es die Gegenprobe, nicht das Nachdenken. */
        const raus: string[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isPropertyAssignment(n)) return;
          if (!ts.isIdentifier(n.name) || n.name.text !== "details") return;
          if (!ts.isObjectLiteralExpression(n.initializer)) return;
          for (const f of n.initializer.properties) {
            if (ts.isPropertyAssignment(f) && ts.isIdentifier(f.name)) raus.push(f.name.text);
          }
        });
        return raus;
      },
    });
    const schluessel = new Set(geschrieben.map((t) => t.fund));

    for (const name of namen) {
      expect(
        schluessel.has(name),
        `„${name}" wird in laufBudget.ts aus dem details-Objekt gelesen, `
        + "aber der Abschluss in index.ts schreibt es dort nicht — die Reihenfolge "
        + "wäre still abgeschaltet, und der nächste Lauf schnitte an "
        + "derselben Stelle wie dieser",
      ).toBe(true);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════
   7 · Die Laufsperre passt zum Gateway
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ die Laufsperre ist am Gateway bemessen, nicht an einer Vermutung", () => {
  /* ⚠ ⚠  EIN LAUF KANN NICHT LAENGER DAUERN, ALS DAS GATEWAY ZULAESST.
     Eine Sperre, die deutlich laenger steht, verlaengert jeden Ausfall um
     einen Takt des Abholers (alle 15 Minuten). Bis zum 24.09.2026 standen
     hier 30 Minuten — zwoelfmal der laengstmoegliche Lauf.

     Gehalten wird das VERHAELTNIS, nicht die Zahl: die Sperre muss
     laenger sein als ein vollstaendiger Lauf (sonst loest sie sich unter
     einem lebenden Lauf) und kuerzer als der Takt des Abholers (sonst
     kostet ein haengender Lauf einen zweiten). */
  it("laenger als ein Lauf dauern kann und kuerzer als der Takt des Abholers", () => {
    const gefunden = suche<number>({
      frage: "welchen Wert hat SPERRE_MINUTEN?",
      positivkontrolle: `const SPERRE_MINUTEN = 5;`,
      dateien: [INDEX],
      finde: (baum) => {
        const raus: number[] = [];
        jederKnoten(baum, (n) => {
          if (
            ts.isVariableDeclaration(n)
            && ts.isIdentifier(n.name) && n.name.text === "SPERRE_MINUTEN"
            && n.initializer && ts.isNumericLiteral(n.initializer)
          ) raus.push(Number(n.initializer.text));
        });
        return raus;
      },
    });
    expect(gefunden).toHaveLength(1);
    const sperreMs = gefunden[0].fund * 60_000;

    /* Ein Lauf kann das Gateway nicht ueberschreiten — die Sperre muss
       laenger sein, sonst beansprucht ein zweiter Lauf sie mitten im
       ersten. */
    expect(sperreMs).toBeGreaterThan(GATEWAY_MS);

    /* Der Abholer laeuft alle 15 Minuten (`cron_wp_export.sql`). Eine
       haengende Sperre muss sich davor loesen, sonst faellt ein Takt aus. */
    const ABHOLER_MS = 15 * 60_000;
    expect(sperreMs).toBeLessThan(ABHOLER_MS);
  });
});
