/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/modalErreichbarkeit.test.ts

   ⚠ EIN MODAL, DESSEN ZUSTAND GESETZT WERDEN KANN, OHNE DASS ES
   GERENDERT WIRD.

   `MitgliederModul` hat einen frühen Return: solange eine Person
   geöffnet ist, rendert es ausschliesslich `MemberDetail`. Bis zum
   24.08.2026 standen VIER Modale danach — im Listen-Zweig. Der
   Menüeintrag „Austritt" setzte also `austrittFuer`, und nichts
   rendete den Dialog. Es passierte sichtbar gar nichts; wer danach
   den Tab wechselte, sah ihn plötzlich, weil der Zustand noch stand.

   ⚠ Zwei der vier waren erreichbar und betroffen — und der zweite ist
   die eigentliche Nachricht: „Mitglied werden" aus dem Profil hat NIE
   funktioniert, und niemand hat es gemeldet. Ein Weg, dessen Ausfall
   niemandem auffällt, ist ein Weg, den niemand geht.

   ⚠ WARUM DIESER FALL DEN QUELLTEXT LIEST STATT ZU RENDERN.
   Ein Render-Test müsste das ganze Modul mit Supabase-Attrappe
   hochziehen; ich habe es versucht, und er kämpfte mehr mit der
   Attrappe als er mass. Die Aussage ist ohnehin strukturell: es geht
   nicht darum, was ein Modal TUT, sondern WO es steht. Dieselbe
   Bauart wie `icons.test.ts`, das die Icon-Namen im Quelltext prüft.

   ⚠ Und er prüft die REGEL, nicht die vier bekannten Fälle: sobald
   jemand ein fünftes Modal anlegt, greift er von selbst.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { baue, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

const QUELLE = "src/modules/MitgliederModul.tsx";

/* ⚠ UMGESTELLT AM 08.09.2026 VOM TEXT AUF DEN SYNTAXBAUM.

   Vorher wurde die Datei an der Zeichenkette `if(selectedMember) return (`
   zerschnitten und in beiden Hälften nach `<XxxModal` gesucht. Zwei
   Schwächen: die Grenze hängt an einer Schreibweise (ein Leerzeichen nach
   dem `if`, und der Fall ist gegenstandslos — er sagt es immerhin), und ein
   Modalname in einem KOMMENTAR hätte als spätes Modal gezählt.

   Jetzt liefert der Baum beides genau: die Position des frühen Returns und
   die Positionen der JSX-Elemente. Die Regel bleibt dieselbe — sie greift
   auch beim fünften Modal, das noch niemand angelegt hat. */

interface Stelle { name: string; zeile: number; pos: number }

/** Der frühe Return: `if (selectedMember) return (…)`. */
function fruehrerReturn(baum: ts.SourceFile): ts.IfStatement | null {
  let fund: ts.IfStatement | null = null;
  jederKnoten(baum, (n) => {
    if (fund || !ts.isIfStatement(n)) return;
    if (!ts.isIdentifier(n.expression) || n.expression.text !== "selectedMember") return;
    const dann = n.thenStatement;
    const istReturn = ts.isReturnStatement(dann)
      || (ts.isBlock(dann) && dann.statements.some(ts.isReturnStatement));
    if (istReturn) fund = n;
  });
  return fund;
}

/** Jedes JSX-Element, dessen Name auf „Modal" endet. */
function modale(baum: ts.SourceFile): Stelle[] {
  const fund: Stelle[] = [];
  jederKnoten(baum, (n) => {
    if (!ts.isJsxSelfClosingElement(n) && !ts.isJsxOpeningElement(n)) return;
    const name = n.tagName.getText();
    if (/^[A-Z][A-Za-z]*Modal$/.test(name)) fund.push({ name, zeile: zeileVon(n), pos: n.getStart() });
  });
  return fund;
}

describe("⚠ Modale müssen vor dem frühen Return stehen", () => {
  const baum = baue(QUELLE);
  const frueh = fruehrerReturn(baum);

  it("der frühe Return steht überhaupt noch da", () => {
    /* Fällt er weg, ist dieser Fall gegenstandslos — dann soll er es SAGEN
       und nicht still grün bleiben. */
    expect(frueh, "kein `if (selectedMember) return` mehr in " + QUELLE).not.toBeNull();
  });

  it("⚠ jedes <XxxModal steht davor — sonst ist es aus dem Profil unerreichbar", () => {
    const grenze = frueh!.getStart();
    const spaet = modale(baum).filter((m) => m.pos > grenze);
    expect(spaet.map((m) => `${m.name} (Zeile ${m.zeile})`),
      "Diese Modale stehen NACH dem frühen Return und werden nicht gerendert, "
      + "solange eine Person geöffnet ist").toEqual([]);
  });

  /* ⚠ Die Positivkontrolle für diesen Fall ist die Liste selbst: findet
     `modale()` gar nichts, prüft die Zeile darüber nichts. */
  it("die vier bekannten stehen davor", () => {
    const grenze = frueh!.getStart();
    const davor = modale(baum).filter((m) => m.pos < grenze).map((m) => m.name);
    /* Nennt sie beim Namen statt zu zählen. `toHaveLength(4)` bestünde auch
       dann, wenn vier ANDERE dort stünden. */
    for (const name of ["AustrittModal", "ArtAendernModal", "MitgliedWerdenModal", "NeuesMitgliedModal"]) {
      expect(davor, `${name} steht nicht vor dem frühen Return`).toContain(name);
    }
  });

  it("⚠ und der Detail-Zweig bindet sie ein", () => {
    /* Vor dem Return zu STEHEN genügt nicht — der frühe Return muss sie auch
       zurückgeben. `{modale}` ist die Klammer, die beides verbindet. */
    let eingebunden = false;
    jederKnoten(frueh!, (n) => {
      if (ts.isJsxExpression(n) && n.expression
          && ts.isIdentifier(n.expression) && n.expression.text === "modale") {
        eingebunden = true;
      }
    });
    expect(eingebunden, "der Detail-Zweig gibt `{modale}` nicht zurück").toBe(true);
  });
});
