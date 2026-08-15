/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/spielService.ts
   Alle sb-Zugriffe auf `spiele` und `ranglisten`.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb } from "../../types.ts";
import { aktuelleSfvSaison, saisonZeitraum } from "./spielMapper.ts";
import type { SpielZeile, RanglisteZeile } from "./spielMapper.ts";

/** Spiele der laufenden Saison.

    Gefiltert wird über den Zeitraum, nicht über sfv_saison_id: manuell
    erfasste Spiele (Turniere, interne Spiele) tragen keine Saison-Id und
    fielen sonst aus der Liste — genau die Zeilen, die der Sync nie
    anfasst und die deshalb niemand sonst nachträgt. */
export async function fetchSpiele(
  sb: Sb, vereinId: string | null, team?: string | null,
): Promise<SpielZeile[]> {
  if (!sb || !vereinId) return [];
  const { von, bis } = saisonZeitraum(aktuelleSfvSaison());
  let frage = sb.from("spiele").select("*")
    .eq("verein_id", vereinId)
    .gte("date", von).lte("date", bis)
    .order("date").order("zeit");
  if (team) frage = frage.eq("team", team);
  const { data, error } = await frage;
  if (error) return [];
  return (data ?? []) as SpielZeile[];
}

/** Alle Ranglistenzeilen der laufenden Saison — 232 bei FCH, also nichts.
    Gebündelt wird in der Anzeige, damit die Gruppe eines Teams ohne
    zweiten Zugriff bestimmt werden kann. */
export async function fetchRanglisten(
  sb: Sb, vereinId: string | null,
): Promise<RanglisteZeile[]> {
  if (!sb || !vereinId) return [];
  const { data, error } = await sb.from("ranglisten").select("*")
    .eq("verein_id", vereinId)
    .eq("sfv_saison_id", aktuelleSfvSaison())
    .order("position");
  if (error) return [];
  return (data ?? []) as RanglisteZeile[];
}
