/* ══════════════════════════════════════════════════════════════════════
   Die Wappen der Gegner — was hinausgeht, und woran das hängt
   ══════════════════════════════════════════════════════════════════════

   ⚠ ⚠  EINER DER VIER BESTELLTEN FÄLLE IST SO NICHT BAUBAR, UND DAS IST
   DER WICHTIGSTE TEIL DIESER DATEI.

   Bestellt war: *„Geänderte Prüfsumme: Das Bild wird gesendet."*

   **Das tut der Code nicht, und zwar mit Absicht.** `waehleWappen()`
   überspringt jedes Wappen, dessen NUMMER die Gegenstelle führt —
   gleichgültig, welche Prüfsumme dort steht. Es lädt die Bytes gar nicht
   erst, also kann es nicht vergleichen. Die Bedingung lautet
   `bestand.bekannt.has(String(z.sfv_team_id))`; eine Prüfsumme kommt in
   `waehleWappen()` nirgends vor.

   Gemessen ist der Grund, nicht vermutet: `offeneLogos()` in
   `supabase/functions/sfv-sync/logos.ts` enthält `if (z.pfad) continue;`
   — **ein abgelegtes Wappen wird nie wieder geholt.** Eine Datei ändert
   sich bei uns also nie. Die Alternative wäre, alle 219 Bilder bei jedem
   Lauf zu laden und zu hashen, viermal die Stunde, für Daten, die sich
   nicht bewegen.

   Deshalb steht hier der Fall, der die WIRKLICHKEIT festhält, und nicht
   der bestellte Wortlaut: ein Wappen mit ANDERER Prüfsumme drüben wird
   **auch dann übersprungen** — und der Titel sagt, warum das richtig ist.

   ── ⚠ ⚠  UND DAZU GEHÖRT DER FALL, DER DIE FREMDE ZEILE FESTNAGELT ───

   Sonst steht die ganze Ersparnis auf einer Zeile in einer fremden Datei,
   und das ist die Bauart, die dieses Projekt ein Dutzend Mal bezahlt hat
   („ein Kommentar, der eine ANDERE Stelle zusichert").

   > Ein Wappen wird übersprungen, weil die Gegenstelle seine Nummer schon
   > führt — tragfähig nur, solange `offeneLogos()` ein abgelegtes Wappen
   > nie wieder holt. Fällt `if (z.pfad) continue;`, ist die
   > Überspringen-Regel falsch, und drüben bleibt das alte Bild stehen,
   > **ohne dass etwas fehlschlägt.**

   ⚠ ⚠  UND ES GIBT DIESEN FALL SCHON, NUR SAGT ER ETWAS ANDERES.
   `src/domains/sfv/__tests__/logos.test.ts` hält mit „holt nie erneut,
   was schon liegt" das VERHALTEN von `offeneLogos()` fest. Das ist eine
   Zusage über `logos.ts` und **keine über den Wappenversand**: wer die
   Auffrischung eines Tages absichtlich einbaut, zieht jenen Fall mit —
   das ist dann richtig so — und **nichts sagt ihm, dass dabei die
   Kostenrechnung hier still falsch wird.**

   Der Fall unten ist deshalb keine Dublette, sondern die VERBINDUNG. Sein
   Nutzen liegt in seiner Fehlermeldung, nicht in seiner Bedingung.

   ── Warum über den Syntaxbaum ────────────────────────────────────────

   `logos.ts` und dieser Kopf führen die Wörter `pfad`, `continue` und
   `offeneLogos` mehrfach in KOMMENTAREN. Ein Textmuster träfe sie.
   `suche()` verlangt ausserdem eine Positivkontrolle und wirft, wenn die
   Abfrage nicht einmal darin etwas findet — eine Prüfung, die ihren
   Gegenstand verliert, ist ROT und nicht grün.
   ══════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import ts from "typescript";
import {
  WAPPEN_PRO_PAKET, leseWappenBestand, waehleWappen, bildePakete,
} from "../wpWappen.ts";
import type { WappenZeile } from "../wpWappen.ts";
import {
  suche, baue, findeFunktion, aufrufNamen, jederKnoten, zeileVon,
} from "../../../test-helpers/quelltext.ts";

const LOGOS = "supabase/functions/sfv-sync/logos.ts";
const INDEX = "supabase/functions/wp-export/index.ts";

/** Eine Zeile aus `sfv_team_logos`, wie der Export sie sieht. */
function zeile(id: number): WappenZeile {
  return { sfv_team_id: id, pfad: `verein/${id}.gif`, mime: "image/gif" };
}

const UNSERE = [zeile(38301)];

/* ═══════════════════════════════════════════════════════════════════
   1 · WELCHE WAPPEN HINAUSGEHEN
   ═══════════════════════════════════════════════════════════════════ */

describe("waehleWappen — was hinausgeht", () => {
  it("unveränderte Prüfsumme: das Wappen wird nicht gesendet", () => {
    const bestand = leseWappenBestand({
      wappen: [{ sfv_team_id: "38301", sha256: "die gleiche Prüfsumme" }],
    });
    const wahl = waehleWappen(UNSERE, bestand);

    expect(wahl.zu_senden).toEqual([]);
    expect(wahl.uebersprungen_bekannt).toBe(1);
    /* ⚠ `null` heisst hier „es wurde gesendet, nur eben nichts" — nicht
       „übersprungen". Die zwei Lagen sind verschieden und dürfen nicht
       dieselbe Antwort ergeben. */
    expect(wahl.uebersprungen).toBeNull();
  });

  it("⚠ geänderte Prüfsumme: es wird TROTZDEM übersprungen — die Bytes werden nie geladen", () => {
    /* ⚠ Der bestellte Fall lautete „das Bild wird gesendet". Gemessen:
       das tut der Code nicht. Die Überspringen-Regel ist „die Gegenstelle
       kennt die Nummer", nicht „die Prüfsummen sind gleich" — siehe den
       Kopf dieser Datei. Festgehalten wird deshalb, was gilt. */
    const gleich = leseWappenBestand({
      wappen: [{ sfv_team_id: "38301", sha256: "die gleiche Prüfsumme" }],
    });
    const anders = leseWappenBestand({
      wappen: [{ sfv_team_id: "38301", sha256: "eine völlig andere Prüfsumme" }],
    });

    /* Die Prüfsumme drüben ändert am Ergebnis nichts — das IST die Regel. */
    expect(waehleWappen(UNSERE, anders)).toEqual(waehleWappen(UNSERE, gleich));
    expect(waehleWappen(UNSERE, anders).zu_senden).toEqual([]);
    expect(waehleWappen(UNSERE, anders).uebersprungen_bekannt).toBe(1);
  });

  it("eine unbekannte Nummer geht hinaus, eine bekannte nicht", () => {
    const bestand = leseWappenBestand({
      wappen: [{ sfv_team_id: "38301", sha256: "x" }],
    });
    const wahl = waehleWappen([zeile(38301), zeile(38302)], bestand);

    expect(wahl.zu_senden.map((z) => z.sfv_team_id)).toEqual([38302]);
    expect(wahl.uebersprungen_bekannt).toBe(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2 · DIE VIER LAGEN DES GEGENBESTANDS
   ═══════════════════════════════════════════════════════════════════ */

describe("leseWappenBestand — die vier Lagen", () => {
  it("⚠ feld_fehlt und leer tragen DIESELBEN Zahlen und führen zum Gegenteil", () => {
    /* ⚠ Das ist der Grund, warum dort kein `boolean` steht und warum eine
       Null hier nichts entscheidet: beide melden 0 Einträge und 0
       Prüfsummen. Nur die Lage trennt sie — und die Folgen sind
       entgegengesetzt. Eine Null, die für «nicht gefragt» steht, war in
       diesem Projekt schon zweimal teuer. */
    const fehlt = leseWappenBestand({});
    const leer = leseWappenBestand({ wappen: [] });

    expect([fehlt.lage, fehlt.quelle, fehlt.eintraege, fehlt.bekannt.size])
      .toEqual(["feld_fehlt", null, 0, 0]);
    expect([leer.lage, leer.quelle, leer.eintraege, leer.bekannt.size])
      .toEqual(["leer", "wappen", 0, 0]);

    /* Gleiche Zahlen, gegenteilige Folge. */
    const beiFehlt = waehleWappen(UNSERE, fehlt);
    expect(beiFehlt.zu_senden).toEqual([]);
    expect(beiFehlt.uebersprungen).toMatch(/Wappen-Feld/);

    const beiLeer = waehleWappen(UNSERE, leer);
    expect(beiLeer.zu_senden).toEqual(UNSERE);
    expect(beiLeer.uebersprungen).toBeNull();
  });

  it("unlesbar ist weder alt noch leer — nichts gesendet, mit eigenem Satz", () => {
    const b = leseWappenBestand({ wappen: "das ist keine Liste" });
    expect([b.lage, b.quelle, b.eintraege]).toEqual(["unlesbar", "wappen", 0]);

    const wahl = waehleWappen(UNSERE, b);
    expect(wahl.zu_senden).toEqual([]);
    expect(wahl.uebersprungen).toMatch(/keine Liste/);
  });

  it("gefüllt — und das zweite Feld «teams.wappen» zählt auch, mit eigener Herkunft", () => {
    const b = leseWappenBestand({
      teams: { wappen: [{ sfv_team_id: 38301, sha256: "x" }] },
    });
    expect([b.lage, b.quelle, b.eintraege]).toEqual(["gefuellt", "teams.wappen", 1]);
    expect(waehleWappen([zeile(38301), zeile(38302)], b).zu_senden.map((z) => z.sfv_team_id))
      .toEqual([38302]);
  });

  it("⚠ eine Nummer OHNE Prüfsumme zählt nicht als bekannt — sie kennt die Nummer und hat kein Bild", () => {
    const b = leseWappenBestand({ wappen: [{ sfv_team_id: "38301" }] });

    expect([b.lage, b.eintraege, b.bekannt.size, b.ohne_pruefsumme])
      .toEqual(["gefuellt", 1, 0, 1]);
    /* Sie wird gesendet — sonst bliebe drüben für immer ein Platzhalter. */
    expect(waehleWappen(UNSERE, b).zu_senden).toEqual(UNSERE);
    expect(waehleWappen(UNSERE, b).uebersprungen_bekannt).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3 · DIE PAKETE
   ═══════════════════════════════════════════════════════════════════ */

describe("bildePakete — 219 Wappen", () => {
  it("⚠ WAPPEN_PRO_PAKET ist 20 — die Grenze steht drüben, sie ist nicht unsere Wahl", () => {
    /* ⚠ Bewusst die Zahl und nicht die Konstante gegen sich selbst. Ein
       `expect(WAPPEN_PRO_PAKET).toBe(WAPPEN_PRO_PAKET)` wäre für jede
       Änderung grün — also eine Prüfung, die nichts prüft. */
    expect(WAPPEN_PRO_PAKET).toBe(20);
  });

  it("⚠ 219 ergeben 11 Pakete, das letzte mit 19 — und KEINE der beiden Zahlen genügt allein", () => {
    /* ⚠ ⚠  GEMESSEN, NICHT VERMUTET: bei einer Paketgrösse von 25 wäre das
       letzte Paket EBENFALLS 19 gross (8 × 25 + 19 = 219). Wer nur die
       Grösse des letzten Pakets prüft, lässt diese Fehlverteilung durch —
       und wer nur die Anzahl prüft, lässt eine andere durch. Deshalb
       stehen alle vier Zahlen in EINER Erwartung: so zeigt ein
       Fehlschlag, welche davon gekippt ist, statt beim ersten
       abzubrechen. */
    const liste = Array.from({ length: 219 }, (_, i) => i);
    const pakete = bildePakete(liste);

    expect({
      pakete: pakete.length,
      letztes: pakete[pakete.length - 1].length,
      groesstes: Math.max(...pakete.map((p) => p.length)),
      summe: pakete.reduce((s, p) => s + p.length, 0),
    }).toEqual({ pakete: 11, letztes: 19, groesstes: 20, summe: 219 });

    /* Die Reihenfolge bleibt — ein Paket ist ein Schnitt, keine Auswahl. */
    expect(pakete[0][0]).toBe(0);
    expect(pakete[10][18]).toBe(218);
  });

  it("eine Paketgrösse unter 1 wirft — sonst liefe die Schleife ewig", () => {
    expect(() => bildePakete([1, 2], 0)).toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4 · DIE ABHÄNGIGKEIT, AUF DER DIE ERSPARNIS RUHT
   ═══════════════════════════════════════════════════════════════════ */

/** Ist das ein direkter Zugriff auf `pfad` — und NICHT seine Verneinung? */
function nenntPfadDirekt(n: ts.Node): boolean {
  if (ts.isPropertyAccessExpression(n)) return n.name.text === "pfad";
  if (ts.isIdentifier(n)) return n.text === "pfad";
  return false;
}

/** `continue;` oder ein Block, der nur daraus besteht. */
function istNurContinue(n: ts.Statement): boolean {
  if (ts.isContinueStatement(n)) return true;
  return ts.isBlock(n) && n.statements.length === 1
    && ts.isContinueStatement(n.statements[0]);
}

/**
 * Die Wache `if (z.pfad) continue;` — der Satz, an dem die ganze
 * Kostenrechnung des Wappenversands hängt.
 *
 * ⚠ Die Bedingung muss DIREKT auf `pfad` zeigen. Eine Verneinung
 * (`if (!z.pfad) continue`) hiesse das Gegenteil — sie übersprünge genau
 * die Wappen, die noch fehlen — und darf deshalb nicht als Treffer
 * durchgehen.
 */
function pfadWache(wurzel: ts.Node): Array<{ text: string; zeile: number }> {
  const funde: Array<{ text: string; zeile: number }> = [];
  jederKnoten(wurzel, (n) => {
    if (!ts.isIfStatement(n)) return;
    if (n.elseStatement) return;
    if (!nenntPfadDirekt(n.expression)) return;
    if (!istNurContinue(n.thenStatement)) return;
    funde.push({ text: n.getText().replace(/\s+/g, " "), zeile: zeileVon(n) });
  });
  return funde;
}

describe("⚠ Die Überspringen-Regel hängt an offeneLogos()", () => {
  it("⚠ ein abgelegtes Wappen wird NIE wieder geholt — fällt das, ist der Wappenversand still falsch", () => {
    /* ⚠ Zuerst der Gegenstand selbst. Wird `offeneLogos` umbenannt oder
       entfernt, fände die Abfrage unten nichts — und eine Prüfung, die
       ihren Gegenstand verliert, wäre sonst GRÜN. Deshalb wirft sie
       hier, statt still leer auszugehen. */
    if (findeFunktion(baue(LOGOS), "offeneLogos") === null) {
      throw new Error(
        `In ${LOGOS} gibt es keine Funktion «offeneLogos» mehr. Damit ist `
        + "nicht mehr zu prüfen, ob ein abgelegtes Wappen erneut geholt wird — "
        + "und genau darauf ruht die Überspringen-Regel der Wappen-Auswahl. "
        + "Entweder ist die Funktion umbenannt (dann gehört dieser Fall "
        + "nachgezogen), oder die Regel ist falsch geworden.",
      );
    }

    const treffer = suche<{ text: string; zeile: number }>({
      frage: "überspringt offeneLogos() ein Wappen, das schon abgelegt ist?",
      dateien: [LOGOS],
      /* ⚠ Die Wache in genau der Form, in der sie gefunden werden MUSS.
         Fände die Abfrage hier nichts, wäre jedes «bestanden» wertlos. */
      positivkontrolle: `
        function offeneLogos(gebraucht, bekannt, jetzt) {
          for (const id of gebraucht) {
            const z = bekannt.get(id);
            if (!z) { raus.push(id); continue; }
            if (z.pfad) continue;
            if (!z.fehlt_seit) { raus.push(id); continue; }
          }
        }`,
      finde: (baum) => {
        const knoten = findeFunktion(baum, "offeneLogos");
        return knoten ? pfadWache(knoten) : [];
      },
    });

    expect(
      treffer.map((t) => `${t.datei}:${t.fund.zeile}: ${t.fund.text}`),
      /* Die Meldung ist der eigentliche Nutzen dieses Falls — siehe Kopf. */
    ).not.toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5 · DER WAPPENBLOCK NIMMT SPIELPLAN UND RANGLISTEN NICHT MIT
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Das INNERSTE `try`, in dessen Block `sendeWappen` gerufen wird.
 *
 * ⚠ Nicht das erste. Der ganze Export steht seinerseits in einem `try`,
 * und der enthält den Aufruf ebenso — wer das erste nimmt, prüft die
 * äussere Klammer und bekommt für jede Bauart ein «bestanden».
 */
function wappenTry(baum: ts.SourceFile): ts.TryStatement[] {
  const kandidaten: ts.TryStatement[] = [];
  jederKnoten(baum, (n) => {
    if (!ts.isTryStatement(n)) return;
    if (aufrufNamen(n.tryBlock).includes("sendeWappen")) kandidaten.push(n);
  });
  if (kandidaten.length === 0) return [];
  kandidaten.sort((a, b) => a.getWidth() - b.getWidth());
  return [kandidaten[0]];
}

/** Der Name, den eine `const x = …`-Anweisung bindet. */
function bindetNamen(s: ts.Statement, name: string): boolean {
  return ts.isVariableStatement(s)
    && s.declarationList.declarations.some(
      (d) => ts.isIdentifier(d.name) && d.name.text === name,
    );
}

describe("⚠ Ein Fehler beim Wappenversand nimmt Spielplan und Ranglisten nicht mit", () => {
  it("eigener try, gebundener Fehler, kein Weiterwurf — und nichts dazwischen, das sie mitrisse", () => {
    /* ⚠ Alle Befunde in EINER Liste statt in fünf Erwartungen: sonst
       bricht der Fall beim ersten ab, und man sieht nicht, ob die Bauart
       an einer Stelle gekippt ist oder an allen. */
    const befunde: string[] = [];

    const treffer = suche<ts.TryStatement>({
      frage: "in welchem try steht der Aufruf von sendeWappen?",
      dateien: [INDEX],
      positivkontrolle: `
        async function handler() {
          const lauf = await sendeAnWordpress(db, vereinId, erg);
          const rang = await sendeRanglisten(db, vereinId);
          let wappen;
          try {
            wappen = await sendeWappen(db, vereinId);
          } catch (e) {
            wappen = { gesendet: false, fehler: meldung(e) };
          }
          return json({ ...lauf, ranglisten: rang, wappen });
        }`,
      finde: wappenTry,
    });

    if (treffer.length === 0) {
      /* ⚠ Auch das ist der Befund: ein Aufruf ohne eigenes `try` reisst
         den ganzen Lauf mit, und niemand erführe warum. */
      befunde.push(
        `${INDEX}: der Aufruf von sendeWappen steht in KEINEM eigenen try — `
        + "ein Fehler beim Wappenversand nähme Spielplan und Ranglisten mit.",
      );
      expect(befunde).toEqual([]);
      return;
    }

    const wTry = treffer[0].fund;

    /* ── a) Der Fehler wird gebunden und nicht weitergeworfen ───────── */
    const fang = wTry.catchClause;
    if (!fang) {
      befunde.push("Der Wappen-try hat kein catch — der Fehler liefe nach oben durch.");
    } else {
      if (!fang.variableDeclaration) {
        befunde.push(
          /* ⚠ Beide Anführungspaare stehen GANZ in je einem Stringliteral.
             Über zwei Literale verteilt meldet check:quotes sie als
             unpaarig — zu Recht: dort steht dann ein öffnendes Zeichen
             ohne sein schliessendes im selben String. */
          "Das catch bindet den Fehler nicht (leerer catch ohne Bindung). "
          + "Ein leerer catch macht aus dem Ausfall eine Datenlage: "
          + "«drüben liegt kein Wappen» sähe dann aus wie «der Versand ist gescheitert».",
        );
      }
      const wuerfe: number[] = [];
      jederKnoten(fang.block, (n) => {
        if (ts.isThrowStatement(n)) wuerfe.push(zeileVon(n));
      });
      if (wuerfe.length > 0) {
        befunde.push(
          `Das catch wirft weiter (Zeile ${wuerfe.join(", ")}) — damit ist der `
          + "eigene Block wirkungslos und der Lauf fällt doch aus.",
        );
      }
    }

    /* ── b) Spielplan und Ranglisten liegen AUSSERHALB seiner Reichweite ─ */
    const drin = new Set<string>();
    jederKnoten(wTry.tryBlock, (n) => {
      if (ts.isIdentifier(n) && (n.text === "lauf" || n.text === "rang")) drin.add(n.text);
    });
    if (drin.size > 0) {
      befunde.push(
        `Im Wappen-try steht ${[...drin].sort().join(" und ")} — was in seinem `
        + "Block liegt, fällt mit ihm aus. Der Spielplan und die Ranglisten "
        + "gehören davor, nicht hinein.",
      );
    }

    /* ── c) Zwischen dem Ranglisten-Ergebnis und dem return steht kein
       Aufruf ausserhalb dieses try ─────────────────────────────────────
       ⚠ Das ist die zweite Hälfte der Zusage. Ein eigener Block nützt
       nichts, wenn daneben — nach `rang` und vor dem `return` — noch ein
       ungeschützter `await` steht: der nähme beide Ergebnisse mit, und
       zwar aus einem Grund, der mit ihnen nichts zu tun hat. */
    const block = wTry.parent;
    if (!block || !ts.isBlock(block)) {
      befunde.push("Der Wappen-try steht in keinem Anweisungsblock — die Reihenfolge ist nicht zu lesen.");
    } else {
      const s = block.statements;
      const iLauf = s.findIndex((x) => bindetNamen(x, "lauf"));
      const iRang = s.findIndex((x) => bindetNamen(x, "rang"));
      const iTry = s.findIndex((x) => x === wTry);
      const iReturn = s.findIndex((x) => ts.isReturnStatement(x));

      if (iLauf < 0 || iRang < 0 || iReturn < 0) {
        befunde.push(
          `Im Block des Wappen-try fehlt eine der drei Marken (lauf ${iLauf}, `
          + `rang ${iRang}, return ${iReturn}) — die Reihenfolge ist damit `
          + "nicht mehr zu prüfen, nicht etwa in Ordnung.",
        );
      } else if (!(iLauf < iRang && iRang < iTry && iTry < iReturn)) {
        befunde.push(
          `Die Reihenfolge stimmt nicht: lauf ${iLauf}, rang ${iRang}, `
          + `wappen-try ${iTry}, return ${iReturn}. Der Wappenblock gehört `
          + "hinter beide und vor das return.",
        );
      } else {
        for (let i = iRang + 1; i < iReturn; i++) {
          if (i === iTry) continue;
          const namen = aufrufNamen(s[i]);
          if (namen.length > 0) {
            befunde.push(
              `Zwischen dem Ranglisten-Ergebnis und dem return steht ein Aufruf `
              + `ausserhalb des Wappen-try (Zeile ${zeileVon(s[i])}: `
              + `${namen.join(", ")}) — er nähme beide Ergebnisse mit.`,
            );
          }
        }
      }
    }

    expect(befunde).toEqual([]);
  });
});
