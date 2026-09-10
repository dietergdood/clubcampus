// ClubCampus — src/domains/sfv/feldhoheit.ts
//
// ⚠ WARUM DIESE FUNKTION HIER LIEGT UND NICHT IN sync.ts
//   Dieselbe Begruendung wie bei wpNutzlast.ts und ergebnisTypen.ts: was
//   ENTSCHEIDET, gehoert dorthin, wo tsc und vitest es lesen koennen.
//   `sync.ts` importiert von esm.sh und wird von beiden nicht geprueft.
//
//   ⚠ Und das ist hier keine Formsache: der Versuch, sie direkt aus
//   `sync.ts` zu testen, hat am 11.09.2026 `npm run typecheck` rot
//   gemacht — der Import zieht die ganze Datei samt esm.sh in die
//   tsc-Programmliste. Ein Test, der die Pruefkette kaputtmacht, ist
//   kein Test, sondern ein zweiter Defekt.

/* ── Feldhoheit ───────────────────────────────────────────────────────────
   Die erlaubten Spalten stehen in sync_felder. Diese Funktion schneidet die
   berechnete Zeile darauf zu — und meldet BEIDE Richtungen.

   ⚠ ⚠  BIS ZUM 11.09.2026 MELDETE SIE NUR EINE, UND DAS WAR DER DEFEKT.

   Sie kannte `fehlend`: in sync_felder genannt, aber nicht berechnet. Ein
   Tippfehler in der Liste fiel damit auf. Die Gegenrichtung fiel nicht auf:

     berechnet, aber NICHT in sync_felder  →  wird stillschweigend
                                              weggeschnitten

   Genau das ist mit `sfv_runde` und `sfv_runde_nr` passiert. Der Sync hat
   sie jede Stunde berechnet und weggeworfen; in der Datenbank standen sie
   bei allen 270 Spielen auf NULL, und von aussen sah es aus, als liefere
   der Verband sie nicht. **Ein Ausfall in der Verkleidung einer Datenlage
   — und zwar einer, die zu einer Meldung an den Verband gefuehrt haette.**

   ⚠ WARUM `nicht_erlaubt` KEIN FEHLER IST, SONDERN EINE WARNUNG. Es gibt
   einen legitimen Fall: ein Feld, das der Spielplan berechnet, aber ein
   ANDERER Durchgang schreiben soll (so steht `schiedsrichter` unter
   `sfv_matchdaten`). Ein `throw` machte den stuendlichen Lauf dann rot,
   obwohl alles richtig ist. Gemeldet gehoert es trotzdem — was hier
   auftaucht, ist entweder ein vergessener Eintrag oder eine Absicht, die
   niemand aufgeschrieben hat. */
export function schneideAufFeldhoheit(
  erlaubt: string[], berechnet: Record<string, unknown>,
): { zeile: Record<string, unknown>; fehlend: string[]; nicht_erlaubt: string[] } {
  const zeile: Record<string, unknown> = {};
  const fehlend: string[] = [];
  for (const feld of erlaubt) {
    if (!(feld in berechnet)) { fehlend.push(feld); continue; }
    zeile[feld] = berechnet[feld];
  }
  const erlaubtSatz = new Set(erlaubt);
  const nicht_erlaubt = Object.keys(berechnet).filter((k) => !erlaubtSatz.has(k));
  return { zeile, fehlend, nicht_erlaubt };
}
