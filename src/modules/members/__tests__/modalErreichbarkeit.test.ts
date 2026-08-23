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
import { readFileSync } from "node:fs";

const QUELLE = "src/modules/MitgliederModul.tsx";
const src = readFileSync(QUELLE, "utf8");

/* Der frühe Return: ab hier rendert das Modul nur noch die Detailansicht. */
const FRUEHER_RETURN = "if(selectedMember) return (";

describe("⚠ Modale müssen vor dem frühen Return stehen", () => {
  it("der frühe Return steht überhaupt noch da", () => {
    /* Fällt er weg, ist dieser Fall gegenstandslos — dann soll er es SAGEN
       und nicht still grün bleiben. */
    expect(src).toContain(FRUEHER_RETURN);
  });

  it("⚠ jedes <XxxModal steht davor — sonst ist es aus dem Profil unerreichbar", () => {
    const grenze = src.indexOf(FRUEHER_RETURN);
    const danach = src.slice(grenze);

    /* Alles, was wie ein Modal-Element aussieht. Absichtlich über das Muster
       und nicht über eine Liste bekannter Namen: eine gepflegte Liste
       veraltet, sobald jemand ein Modal hinzufügt — und genau dann soll der
       Fall greifen. */
    const spaet = [...danach.matchAll(/<([A-Z][A-Za-z]*Modal)\b/g)].map(m => m[1]);

    expect(spaet, `Diese Modale stehen NACH dem frühen Return und werden `
      + `nicht gerendert, solange eine Person geöffnet ist: ${spaet.join(", ")}`).toEqual([]);
  });

  it("die vier bekannten stehen davor", () => {
    /* ⚠ Nennt sie beim Namen statt zu zählen. `toHaveLength(4)` bestünde auch
       dann, wenn vier ANDERE dort stünden. */
    const grenze = src.indexOf(FRUEHER_RETURN);
    const davor = src.slice(0, grenze);
    for (const name of ["AustrittModal", "ArtAendernModal", "MitgliedWerdenModal", "NeuesMitgliedModal"]) {
      expect(davor, `${name} steht nicht vor dem frühen Return`).toContain(`<${name}`);
    }
  });

  it("⚠ und der Detail-Zweig bindet sie ein", () => {
    /* Vor dem Return zu STEHEN genügt nicht — der frühe Return muss sie auch
       zurückgeben. `{modale}` ist die Klammer, die beides verbindet. */
    const grenze = src.indexOf(FRUEHER_RETURN);
    const detailZweig = src.slice(grenze, src.indexOf("</>\n  );", grenze));
    expect(detailZweig).toContain("{modale}");
  });
});
