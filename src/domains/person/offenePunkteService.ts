/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/offenePunkteService.ts

   Die Markierung „bei dieser Person ist noch etwas offen".

   ⚠ EIN FELD, NICHT ZWEI. `personen.offene_punkte` ist Text;
   NICHT LEER IST die Markierung. Ein `boolean` daneben wäre eine
   zweite Stelle für dieselbe Aussage — und davon hat dieses Projekt
   heute drei als Defekt gefunden.

   ⚠ VON HAND GESETZT, VON HAND ENTFERNT. Nie abgeleitet. Würde sie
   aus der inaktiven Mitgliedschaft folgen, wäre wieder jeder
   Ausgetretene automatisch „offen" — genau der Zustand, den der
   Umbau abschafft.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb } from "../../types.ts";

export interface OffenePunkteErgebnis {
  ok: boolean;
  fehler: string | null;
}

/**
 * Den Vermerk setzen oder entfernen.
 *
 * `text = null` entfernt ihn. ⚠ **Das Entfernen ist eine eigene Handlung mit
 * eigener Beschriftung**, nicht „das Pflichtfeld leeren und speichern": ein
 * Pflichtfeld, das man nicht leeren kann, wäre eine Falle, und ein
 * Pflichtfeld, das man durch Leeren aufhebt, wäre keins.
 *
 * ⚠ ES WIRD GEZÄHLT, nicht nur `error` gelesen. Ein `update`, das keine Zeile
 * trifft, ist bei PostgREST kein Fehler — 204, `error === null`. Ohne
 * `.select("id")` meldete diese Funktion Erfolg, während nichts geschrieben
 * wurde. (CLAUDE.md, 23.08.2026.)
 */
export async function setzeOffenePunkte(
  sb: Sb, personId: string, text: string | null,
): Promise<OffenePunkteErgebnis> {
  if (!sb) return { ok: false, fehler: "Keine Verbindung" };

  /* Leerraum ist keine Markierung — der CHECK in der Datenbank weist ihn
     ohnehin ab (23514). Hier wird er zu `null`, damit „Feld leergeräumt" und
     „Vermerk entfernt" nicht zwei Wege mit verschiedenem Ausgang sind. */
  const wert = text != null && text.trim() !== "" ? text.trim() : null;

  const { data, error } = await sb.from("personen")
    .update({ offene_punkte: wert })
    .eq("id", personId)
    .select("id");

  if (error) {
    console.error("setzeOffenePunkte error:", error);
    return { ok: false, fehler: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      fehler: "Die Änderung kam nicht an — fehlt die Berechtigung für diese Person?",
    };
  }
  return { ok: true, fehler: null };
}

/** Trägt diese Person eine Markierung? Eine Stelle für die Frage. */
export function hatOffenePunkte(wert: string | null | undefined): boolean {
  return typeof wert === "string" && wert.trim() !== "";
}
