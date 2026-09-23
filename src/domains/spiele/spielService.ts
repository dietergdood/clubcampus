/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/spielService.ts
   Alle sb-Zugriffe auf `spiele` und `ranglisten`.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb } from "../../types.ts";
import { aktuelleSfvSaison, saisonZeitraum } from "./spielMapper.ts";
import { alleSeiten } from "../db/alleSeiten.ts";
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
  /* ⚠ ⚠  SEITENWEISE SEIT DEM 23.09.2026 — Vorsorge mit kurzem Weg zur
     Grenze. Der Saison-Zeitraum begrenzt auf rund 270 Spiele (gemessen
     25.08.2026); die 1000 liegt damit bei knapp vier Saisons — und sie
     rueckt naeher, sobald die 21 Mannschaften ohne Spielplan dazukommen.

     ⚠ `order("date").order("zeit")` ist die ANZEIGE-Ordnung und nicht
     eindeutig: an einem Samstag stehen zwanzig Spiele mit derselben
     Anstosszeit. `id` als dritte Ebene macht daraus eine totale Ordnung —
     ohne sie darf Postgres zwei Seiten verschieden anordnen, und dann
     faellt an der Seitengrenze ein Spiel aus dem Spielplan, waehrend ein
     anderes doppelt darin steht. */
  /* ⚠ DER TEAM-FILTER KOMMT ZULETZT, und zwar auf beiden Seiten gleich.
     Die supabase-Kette ist reihenfolgeunabhaengig — `.eq()` haengt einen
     Suchparameter an, `.range()` setzt einen anderen. Was der Filter
     einschraenkt, schraenkt er in der Seiten- UND in der Zaehlabfrage ein;
     genau das verlangt `alleSeiten()`, und ein hier vergessener Filter
     machte aus der Zaehlprobe einen Fehlalarm. */
  try {
    return await alleSeiten<SpielZeile>(
      (a, b) => {
        const q = sb.from("spiele").select("*")
          .eq("verein_id", vereinId)
          .gte("date", von).lte("date", bis)
          .order("date").order("zeit").order("id").range(a, b);
        return team ? q.eq("team", team) : q;
      },
      () => {
        const q = sb.from("spiele").select("id", { count: "exact", head: true })
          .eq("verein_id", vereinId)
          .gte("date", von).lte("date", bis);
        return team ? q.eq("team", team) : q;
      },
      "Spiele",
    );
  } catch (e) {
    /* ⚠ `[]` IST HIER DER BESTEHENDE VERTRAG, und er bleibt — die Funktion
       gab schon vorher bei einem Fehler eine leere Liste zurueck.
       Was der Nutzer sieht, ist ein leerer Spielplan; `useSpiele` zeigt
       daneben „Lädt…" nicht mehr an. Das ist ehrlicher als eine gekuerzte
       Liste, aber nicht ehrlich: es sieht aus wie „keine Spiele".
       ⚠ OFFEN und ausdruecklich hier vermerkt statt stillschweigend
       hingenommen: `useSpiele` braucht einen Fehlerzustand, damit der
       Spielplan sagen kann, dass er nicht gelesen wurde. Das ist eine
       Aenderung an der Oberflaeche und gehoert in einen eigenen Schritt. */
    console.error("fetchSpiele error:", e);
    return [];
  }
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
