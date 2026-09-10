// ClubCampus — supabase/functions/sfv-sync/sfvPersonenSchreiben.ts
// Der EINE Schreibweg nach `sfv_personen`. Kein console.* in dieser Datei.
//
// ⚠ WARUM EINE EIGENE DATEI UND NICHT EINE FUNKTION IN matchdatenLauf.ts
//   Beide Laeufe schreiben — der stuendliche und die Aktion `namen`. Laege
//   die Funktion im einen, muesste der andere ihn importieren, und damit
//   haetten wir eine Abhaengigkeit zwischen zwei Laeufen, die sonst nichts
//   miteinander zu tun haben. Zwei Kopien waeren schlimmer: sie liefen
//   auseinander, und die Aktion `namen` schriebe irgendwann etwas anderes
//   als der Sync.
//
// ⚠ SIE LIEST `error`. Ein Upsert, dessen Ergebnis niemand ansieht, ist
//   eine Behauptung — und bei Supabase kommt der Datenbankfehler nicht als
//   `throw`, sondern in `{ data, error }`.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bildeSfvPerson, entdoppleSfvPersonen } from "./matchdaten.ts";
import type { SfvRoh } from "./matchdaten.ts";

export interface NamenSchreibErgebnis {
  /** Zeilen, die in die Datenbank gegangen sind (neu ODER aktualisiert). */
  geschrieben: number;
  /** Rohe Spielerzeilen, die keine Person ergaben — Gegner oder ohne Namen. */
  uebersprungen: number;
}

/**
 * Schreibt die Klarnamen aller EIGENEN Spieler aus den rohen
 * Aufstellungszeilen nach `sfv_personen`.
 *
 * ⚠ UEBERSCHREIBT BEI JEDEM LAUF (Entscheid Didi, 10.09.2026):
 *
 *   > „Korrigiert der Verband eine Schreibweise, soll sie ankommen. Ein
 *   >  Abzug von damals ist genau das, was heute schon mehrfach in die
 *   >  Irre gefuehrt hat."
 *
 * Deshalb `upsert` ohne `ignoreDuplicates` — der Name wird ersetzt, nicht
 * bewahrt. `erstmals_gesehen` bleibt stehen: es hat einen DEFAULT und
 * steht in keiner geschriebenen Spalte, ein Update fasst es also nicht an.
 */
export async function schreibeSfvPersonen(
  db: SupabaseClient,
  rohSpieler: SfvRoh[],
  unsereClubNummer: number | null,
  vereinId: string,
  jetzt: string,
): Promise<NamenSchreibErgebnis> {
  const zeilen = entdoppleSfvPersonen([
    ...rohSpieler
      .map((p) => bildeSfvPerson(p, unsereClubNummer, vereinId, jetzt)),
    /* ⚠ Hier stand bis zum 10.09.2026 eine zweite Quelle: /bench, „weil
       /players nur die Startelf liefert". Der Satz ist widerlegt — die
       207, aus denen er stammte, messen fehlende NAMEN und nicht
       fehlende Zeilen. Gemessen brachte /bench 20 Personen, die
       /players nicht hat: alle Trainer/in, kein Spieler. Fuer diese
       Funktion also nichts. */
  ].filter((z): z is NonNullable<typeof z> => z !== null));
  if (!zeilen.length) {
    return { geschrieben: 0, uebersprungen: rohSpieler.length };
  }

  /* ⚠ `.select("sfv_person_id")` am Schreibvorgang selbst, nicht als
     zweite Abfrage daneben: ein Upsert, der KEINE Zeile trifft, ist fuer
     PostgREST kein Fehler (204, error null). Gefragt ist „wurde
     geschrieben?", nicht „ist es lesbar?". */
  const { data, error } = await db.from("sfv_personen")
    .upsert(zeilen, { onConflict: "verein_id,sfv_person_id" })
    .select("sfv_person_id");
  if (error) throw new Error(`sfv_personen: ${error.message}`);

  return {
    geschrieben: (data ?? []).length,
    uebersprungen: rohSpieler.length - zeilen.length,
  };
}
