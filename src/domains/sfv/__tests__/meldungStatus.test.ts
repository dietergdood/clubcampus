/* ══════════════════════════════════════════════════════════════════════
   Ein gezaehlter Fehler darf den Status nicht auf „ok" lassen (10.09.2026)

   ⚠ ANLASS, und er ist gemessen: der Lauf vom 10.09.2026 meldete
   **status ok**, waehrend zehn von zehn Spielen ohne Matchdaten blieben.
   `baueMeldung` schrieb den Grund in den Text — und liess den Status
   stehen.

   ⚠ DAS IST DIE FAMILIE „eine Pruefung, die gruen ist, ohne zu pruefen".
   Wer auf den Status schaut statt auf den Text — die API-Kachel, eine
   Auswertung ueber `api_sync_log`, ein spaeterer Waechter —, sieht „ok"
   und hoert auf zu suchen. Ein Text erreicht nur den, der ihn liest;
   ein Status erreicht jede Maschine danach.

   ── Warum als Strukturpruefung ────────────────────────────────────────
   `sync.ts` importiert von `esm.sh` und ist fuer vitest nicht ladbar —
   die Regel laesst sich nicht am Verhalten pruefen. Sie steht deshalb am
   Quelltext, wie `icons.test.ts` und die Loeschketten-Pruefung.

   ⚠ Und sie ist absichtlich allgemeiner als der eine Fall: sie gilt fuer
   JEDEN Zweig, der einen gezaehlten Fehler liest — auch fuer den
   naechsten, den jemand dazuschreibt.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { baue, findeFunktion, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

const DATEI = "supabase/functions/sfv-sync/sync.ts";

/* Ein Feld, das ein Scheitern ZAEHLT — nicht jedes Feld, das „fehler"
   im Namen traegt. `fehlermeldungen` etwa ist der Text dazu und steht
   nie allein in einer Bedingung. */
const ZAEHLT_SCHEITERN = /^(fehler|konflikte|pass_konflikte)$/;

interface Zweig { zeile: number; bedingung: string; setztStatus: boolean }

function zweige(): Zweig[] {
  const baum = baue(DATEI);
  const fn = findeFunktion(baum, "laufeSync");
  expect(fn, "laufeSync nicht gefunden — ist sie umbenannt worden?").not.toBeNull();

  const gefunden: Zweig[] = [];
  jederKnoten(fn!, (n) => {
    if (!ts.isIfStatement(n)) return;
    const bed = n.expression.getText();
    /* ⚠ Zerlegt wird bis auf den einzelnen BEZEICHNER, nicht bis zum
       Zugriffspfad. Ein erster Versuch behielt die Punkte und pruefte den
       Pfad als Ganzes — „md.pass_konflikte.length" endet dann auf
       „.length" und fiel durch. Der Zweig, der genau diesen Fall
       behandelt, war damit ungeprueft, und der Test war gruen. */
    const liestFehler = bed
      .split(/[^A-Za-z0-9_]+/)
      .some((w) => ZAEHLT_SCHEITERN.test(w));
    if (!liestFehler) return;

    let setzt = false;
    jederKnoten(n.thenStatement, (k) => {
      if (ts.isBinaryExpression(k)
          && k.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && k.left.getText().endsWith(".status")) setzt = true;
    });
    gefunden.push({ zeile: zeileVon(n), bedingung: bed, setztStatus: setzt });
  });
  return gefunden;
}

describe("laufeSync — ein gezaehlter Fehler setzt den Status", () => {
  it("findet ueberhaupt solche Zweige (sonst prueft der Test nichts)", () => {
    /* ⚠ Ohne diesen Fall waere die Pruefung darunter gruen, sobald jemand
       `laufeSync` umbenennt oder die Zweige umbaut — eine Pruefung, die
       nicht scheitern KANN. */
    expect(zweige().length).toBeGreaterThanOrEqual(2);
  });

  it("jeder davon laesst den Status nicht auf ok stehen", () => {
    const stumm = zweige().filter((z) => !z.setztStatus)
      .map((z) => `${DATEI}:${z.zeile} — ${z.bedingung}`);
    expect(stumm).toEqual([]);
  });
});
