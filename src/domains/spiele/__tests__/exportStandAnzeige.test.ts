/* ═══════════════════════════════════════════════════════════════════
   Die Lagen der Export-Kachel.

   ⚠ ⚠  ANLASS, 24.09.2026. Die Kachel zeigte „Letzter Sync: 23.9.2026,
   23:57:00" und daneben den Chip **ok**, während an diesem Tag mehrere
   Läufe stattgefunden hatten und mindestens einer sein Ergebnis drüben
   hinterlassen hat.

   Sie war also nicht bloss veraltet — **sie hat einen veralteten Stand
   als «ok» ausgegeben.** Und sie konnte gar nicht anders: die Zahl, die
   «wartet etwas?» beantwortet (`export_wartet()`), wurde vom Frontend
   nie gelesen.

   ⚠ Die wichtigeren Fälle hier sind nicht «ok» und «veraltet», sondern
   die DRITTE Lage: `wartet === null` heisst «nicht feststellbar» und
   darf weder als «ok» noch als «veraltet» erscheinen. In diesem Projekt
   ist mehrfach eine nicht gestellte Frage als beruhigende Null
   angezeigt worden — bei `deuteBestand`, bei `merkmale_nutzbar`, bei
   `gruppen_ohne_spiele`. Vier der Fälle unten prüfen genau das.
   ═══════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
/* Fuer die Waechter-Abfrage weiter unten: eine .sql-Datei hat keinen
   Syntaxbaum, den `suche()` lesen koennte. */
import { readFileSync } from "node:fs";
import { suche, jederKnoten } from "../../../test-helpers/quelltext.ts";
import {
  deuteExportStand, VERALTET_MINUTEN, SPERRE_MINUTEN,
} from "../exportStandAnzeige.ts";

/* Ein fester Jetzt-Zeitpunkt. ⚠ Ohne ihn prüfte jeder Fall die Uhr mit —
   und ein Test, der einen Zeitpunkt liest und ihn nicht festlegt, prüft
   den Tag mit. */
const JETZT = new Date("2026-09-24T12:00:00.000Z");
/** Ein Zeitstempel, so viele Minuten vor JETZT. */
const vor = (minuten: number) => new Date(JETZT.getTime() - minuten * 60_000).toISOString();

describe("deuteExportStand — ok und veraltet", () => {
  it("frischer Lauf, nichts wartet: ok", () => {
    const s = deuteExportStand({
      letzter_sync: vor(10), sync_status: "ok", wartet: 0, jetzt: JETZT,
    });
    expect(s.lage).toBe("ok");
    expect(s.chip).toBe("ok");
    expect(s.semantic).toBe("success");
    /* ⚠ Auch die Null steht da. „Es wartet nichts" ist die Auskunft, die
       den Unterschied zu „nicht nachgesehen" trägt. */
    expect(s.zeilen.join(" | ")).toMatch(/0 Änderungen warten/);
  });

  it("⚠ DER FALL VOM 24.09.2026: alter Lauf UND Änderungen warten → veraltet, nicht ok", () => {
    const s = deuteExportStand({
      letzter_sync: vor(12 * 60), sync_status: "ok", wartet: 47, jetzt: JETZT,
    });
    expect(s.lage).toBe("veraltet");
    expect(s.chip).toBe("veraltet");
    expect(s.lage).not.toBe("ok");
    /* Beide Hälften der Begründung stehen da — Alter UND Menge. */
    expect(s.zeilen.join(" | ")).toMatch(/47 Änderungen warten/);
    expect(s.zeilen.join(" | ")).toMatch(/12 Stunden/);
    /* ⚠ Und warum eine Stunde die Grenze ist, steht daneben: sonst ist
       die Schwelle eine Zahl, die niemand begründen kann. */
    expect(s.zeilen.join(" | ")).toMatch(/alle 15 Minuten/);
  });

  it("alter Lauf, aber NICHTS wartet: das ist in Ordnung", () => {
    /* ⚠ Der Export hat keinen Takt. Ein Stand von gestern ist richtig,
       solange sich seither nichts geändert hat — wer hier „veraltet"
       meldete, baute einen Fehlalarm-Generator. */
    const s = deuteExportStand({
      letzter_sync: vor(48 * 60), sync_status: "ok", wartet: 0, jetzt: JETZT,
    });
    expect(s.lage).toBe("ok");
  });

  it("die Grenze ist strikt: genau eine Stunde ist noch nicht veraltet", () => {
    const gleich = deuteExportStand({
      letzter_sync: vor(VERALTET_MINUTEN), sync_status: "ok", wartet: 3, jetzt: JETZT,
    });
    expect(gleich.lage).toBe("ok");
    const drueber = deuteExportStand({
      letzter_sync: vor(VERALTET_MINUTEN + 1), sync_status: "ok", wartet: 3, jetzt: JETZT,
    });
    expect(drueber.lage).toBe("veraltet");
  });
});

describe("deuteExportStand — ⚠ nicht feststellbar ist weder ok noch veraltet", () => {
  it("`wartet` fehlt: unbekannt, und der Satz sagt warum", () => {
    const s = deuteExportStand({
      letzter_sync: vor(12 * 60), sync_status: "ok", wartet: null, jetzt: JETZT,
    });
    expect(s.lage).toBe("unbekannt");
    expect(s.chip).toBe("nicht feststellbar");
    expect(s.semantic).toBe("neutral");
    /* ⚠ DIE ZWEITE HÄLFTE IST DIE WICHTIGERE: keine der beiden
       Behauptungen darf fallen, wenn die Grundlage fehlt. */
    expect(s.lage).not.toBe("ok");
    expect(s.lage).not.toBe("veraltet");
    expect(s.zeilen.join(" | ")).toMatch(/Ob Änderungen warten, ist nicht feststellbar/);
  });

  it("der Grund steht wörtlich da — eine Fehlermeldung verschwindet nicht", () => {
    const s = deuteExportStand({
      letzter_sync: vor(10), sync_status: "ok", wartet: null,
      wartet_grund: "export_wartet() antwortet nicht: permission denied", jetzt: JETZT,
    });
    expect(s.lage).toBe("unbekannt");
    expect(s.zeilen.join(" | ")).toMatch(/permission denied/);
  });

  it("noch nie ein Lauf abgeschlossen: unbekannt, aber das Wartende steht trotzdem da", () => {
    const s = deuteExportStand({
      letzter_sync: null, sync_status: null, wartet: 12, jetzt: JETZT,
    });
    expect(s.lage).toBe("unbekannt");
    /* ⚠ „älter als eine Stunde" hat ohne einen letzten Lauf keinen
       Bezugspunkt — aber die Hälfte, die wir wissen, gehört auf den
       Schirm. Sonst sähe „nicht feststellbar" aus wie „nichts los". */
    expect(s.zeilen.join(" | ")).toMatch(/noch kein Lauf abgeschlossen/);
    expect(s.zeilen.join(" | ")).toMatch(/12 Änderungen warten/);
  });

  it("ein unlesbarer Zeitstempel fällt NICHT in den Gut-Zweig", () => {
    /* ⚠ `NaN > 60` ist `false` — ohne die Prüfung auf eine endliche Zahl
       wäre ein kaputter Zeitstempel eine Entwarnung. */
    const s = deuteExportStand({
      letzter_sync: "kein Datum", sync_status: "ok", wartet: 9, jetzt: JETZT,
    });
    expect(s.lage).toBe("unbekannt");
    expect(s.zeilen.join(" | ")).toMatch(/unlesbaren Zeitstempel/);
  });
});

describe("deuteExportStand — Fehler, hängender Lauf, laufender Lauf", () => {
  it("gemeldeter Fehler schlägt die Wartezahl", () => {
    const s = deuteExportStand({
      letzter_sync: vor(5), sync_status: "fehler", wartet: 0, jetzt: JETZT,
    });
    expect(s.lage).toBe("fehler");
    expect(s.semantic).toBe("danger");
    /* ⚠ ⚠  UND DIE KACHEL SAGT, WARUM DIE NULL HIER NICHTS HEISST:
       `letzter_sync` wird auch bei einem gescheiterten Lauf gesetzt, und
       `export_wartet()` rechnet gegen genau diesen Zeitstempel. Ohne
       diesen Satz liest man „0 warten" als Entwarnung. */
    expect(s.zeilen.join(" | ")).toMatch(/auch bei einem gescheiterten Lauf gesetzt/);
  });

  it("ein Lauf, der länger als das Zeitbudget steht, hängt — und ist nicht ok", () => {
    const s = deuteExportStand({
      letzter_sync: vor(6 * 60), sync_status: "ok",
      sync_laeuft_seit: vor(SPERRE_MINUTEN + 5), wartet: 30, jetzt: JETZT,
    });
    expect(s.lage).toBe("haengt");
    expect(s.lage).not.toBe("ok");
    /* Die Sperre ist der Grund, warum nichts mehr nachkommt — das gehört
       in den Satz, sonst sucht jemand den Fehler beim Abholer. */
    expect(s.zeilen.join(" | ")).toMatch(/sperrt jeden weiteren Export/);
  });

  it("ein Lauf innerhalb des Budgets ist kein Defekt — und unterdrückt „veraltet\"", () => {
    /* ⚠ Ohne diesen Ast meldete die Kachel „veraltet", WÄHREND der
       Export gerade läuft: der letzte vollständige Lauf ist dann
       naturgemäss alt und es wartet naturgemäss etwas. */
    const s = deuteExportStand({
      letzter_sync: vor(6 * 60), sync_status: "ok",
      sync_laeuft_seit: vor(3), wartet: 30, jetzt: JETZT,
    });
    expect(s.lage).toBe("laeuft");
    expect(s.lage).not.toBe("veraltet");
    /* ⚠ Und der Stand wird nicht verdeckt: „läuft" sagt nichts darüber,
       wie alt der letzte FERTIGE Lauf ist. */
    expect(s.zeilen.join(" | ")).toMatch(/letzte vollständige Lauf ist 6 Stunden her/);
  });

  it("ein unbekannter Status wird durchgereicht, nicht als ok gelesen", () => {
    /* ⚠ Eine Aufzählung, die einen unbekannten Wert stillschweigend als
       „ok" behandelt, wird für vollständig gehalten, GERADE WEIL sie
       aufzählt. `warnung` und `uebersprungen` gibt es beide. */
    const s = deuteExportStand({
      letzter_sync: vor(5), sync_status: "warnung", wartet: 0, jetzt: JETZT,
    });
    expect(s.lage).toBe("gemeldet");
    expect(s.lage).not.toBe("ok");
    expect(s.chip).toBe("warnung");
  });
});

describe("⚠ die Schwellen stehen an zwei Orten — dieser Fall hält sie zusammen", () => {
  /* ⚠ ⚠  WARUM DIESER FALL UND KEIN KOMMENTAR.
     `SPERRE_MINUTEN` steht hier UND in `supabase/functions/wp-export/index.ts`.
     Die Doppelung ist nicht zu vermeiden — die Edge Function importiert von
     `esm.sh` und ist aus dem Browser-Bündel nicht erreichbar.

     Ein Kommentar „muss übereinstimmen" wäre eine Behauptung über eine
     andere Stelle, und dieses Papier führt ein halbes Dutzend Fälle, in
     denen genau die auseinandergelaufen ist. Ein Fall wird rot. */
  const FUNCTION = "supabase/functions/wp-export/index.ts";

  it(`SPERRE_MINUTEN ist dieselbe Zahl wie in ${FUNCTION}`, () => {
    /* ⚠ Ueber den Syntaxbaum, nicht per Regex auf den Quelltext. Ein
       Muster `const SPERRE_MINUTEN = (\d+)` traefe auch einen
       auskommentierten Rest oder eine gleichnamige lokale Variable —
       und `index.ts:309` nennt die Konstante tatsaechlich in einem
       Kommentar. Heute geht es zufaellig gut; das ist kein Zustand,
       auf den sich der naechste Leser verlassen soll.

       ⚠ `suche()` wirft, wenn die Abfrage nicht einmal in ihrer
       eigenen Positivkontrolle faellig wird — sonst prüfte der Fall
       eine leere Menge und sagte trotzdem „bestanden". Das ist in
       diesem Projekt viermal passiert. */
    const gefunden = suche<number>({
      frage: "welchen Wert hat SPERRE_MINUTEN in der Edge Function?",
      positivkontrolle: `const SPERRE_MINUTEN = 5;`,
      dateien: [FUNCTION],
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
    expect(gefunden, `${FUNCTION} führt kein "const SPERRE_MINUTEN = <Zahl>" mehr — `
      + "entweder umbenannt oder entfernt. Dann stimmt die Zahl hier gegen nichts.")
      .toHaveLength(1);
    expect(gefunden[0].fund).toBe(SPERRE_MINUTEN);
  });

  it(`VERALTET_MINUTEN ist dieselbe Stunde, die der Wächter benutzt`, () => {
    /* ⚠ Der Wächter meldet einen Ausfall ab „letzter_sync < now() -
       interval '1 hour'" (cron_sync_waechter.sql). Zeigte die Kachel
       daneben „ok", gäbe es zwei Antworten auf eine Frage — und die
       beruhigende gewönne, weil sie näher am Auge steht. */
    const quelle = readFileSync("supabase/cron_sync_waechter.sql", "utf8");
    const stelle = quelle.indexOf("export_wartet(r.verein_id)");
    expect(stelle, "cron_sync_waechter.sql ruft export_wartet() nicht mehr — "
      + "die Export-Frage des Wächters ist weg oder anders gebaut.").toBeGreaterThan(-1);
    const abschnitt = quelle.slice(stelle, stelle + 600);
    expect(abschnitt, "Der Wächter vergleicht nicht mehr gegen eine Stunde. "
      + `Dann ist VERALTET_MINUTEN = ${VERALTET_MINUTEN} nicht mehr dieselbe Frage.`)
      .toMatch(/interval '1 hour'/);
    expect(VERALTET_MINUTEN).toBe(60);
  });
});
