/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personArtService.ts

   Die Arten einer Person ohne Mitgliedschaft: Elternteil,
   Supporter, später Ehemalige, externe Trainer, Sponsoren.

   Gelesen wird die Sicht `personenarten_effektiv` (Migration
   `migration_personenarten.sql`), die zwei Sorten vereinigt:

     gesetzt      steht in `personenart_pro_person`
     abgeleitet   ergibt sich aus einer Zeile in `eltern_kinder`

   ⚠ ABGELEITET HEISST: ES KIPPT. Tritt das letzte Kind aus, ist
   die Person kein Elternteil mehr, und ihr Feldsatz ändert sich
   mit. Das ist beabsichtigt — sie IST dann keiner mehr.

   ⚠ NICHT ÜBER DIE PORTALROLLE. `role === 'eltern'` ist in dieser
   Codebasis schon zweimal falsch gewesen: ein Vater, der selbst
   spielt, bekommt `spieler`. Die Art kommt aus der Sicht, aus
   derselben Quelle wie die Feldkonfiguration.
   ═══════════════════════════════════════════════════════════════ */
import type { SbClient } from "../../types.ts";

export interface PersonArt {
  art_id: string;
  name: string;
  sort_order: number;
  /** NULL = gesetzt. Sonst der Name der Ableitungsregel. */
  ableitung: string | null;
}

/**
 * Welche Art die Feldkonfiguration bestimmt: die mit der kleinsten
 * `sort_order`.
 *
 * ⚠ EINE ART GEWINNT — NICHT DIE VEREINIGUNG ALLER.
 *
 * Eine Person kann mehreres sein: ein Ehemaliger mit Kind im Verein ist auch
 * Elternteil. Verlockend wäre „Pflicht, wenn irgendeine Art es verlangt".
 * Genau das war `rolle_pflichtfelder`, und die ist am 19.08.2026 gestrichen
 * worden, weil sie NUR ADDIEREN, NIE WEGNEHMEN konnte: „Gibt es nicht" liesse
 * sich damit nie durchsetzen.
 *
 * Der Rang ist `sort_order`, weil er in der Portalverwaltung sichtbar ist und
 * dort geändert werden kann — kein zweites Konzept.
 */
export function bestimmendeArt(arten: readonly PersonArt[] | null | undefined): PersonArt | null {
  if (!arten || arten.length === 0) return null;
  return [...arten].sort((a, b) => a.sort_order - b.sort_order)[0];
}

/** Die Arten mehrerer Personen — EINE Abfrage, nicht eine je Zeile. */
export async function fetchArtenFuerPersonen(
  sb: SbClient, personIds: readonly string[],
): Promise<Record<string, PersonArt[]>> {
  if (!sb || personIds.length === 0) return {};
  const { data, error } = await sb
    .from("personenarten_effektiv")
    .select("person_id, art_id, name, sort_order, ableitung")
    .in("person_id", personIds as string[]);
  /* error lesen, nicht nur auf data pruefen: sb.from().select() wirft nicht.
     Ohne das saehe ein 42501 aus wie „diese Personen haben keine Art" — und
     der Chip zeigte „Ohne Mitgliedschaft", obwohl es eine gibt. */
  if (error) { console.error("fetchArtenFuerPersonen error:", error); return {}; }

  const nach: Record<string, PersonArt[]> = {};
  for (const z of (data || []) as unknown as ({ person_id: string } & PersonArt)[]) {
    (nach[z.person_id] ??= []).push({
      art_id: z.art_id, name: z.name, sort_order: z.sort_order, ableitung: z.ableitung,
    });
  }
  return nach;
}

/** Die Arten EINER Person. */
export async function fetchArten(sb: SbClient, personId: string): Promise<PersonArt[]> {
  const alle = await fetchArtenFuerPersonen(sb, [personId]);
  return alle[personId] || [];
}

/** Die Liste der pflegbaren Arten — für die Portalverwaltung. */
export async function fetchPersonenarten(sb: SbClient): Promise<PersonArt[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("personenarten")
    .select("id, name, sort_order, ableitung, aktiv")
    .order("sort_order");
  if (error) { console.error("fetchPersonenarten error:", error); return []; }
  return (data || [])
    .filter(r => r.aktiv !== false)
    .map(r => ({
      art_id: r.id as string,
      name: (r.name as string) || "",
      sort_order: (r.sort_order as number) ?? 0,
      ableitung: (r.ableitung as string | null) ?? null,
    }));
}
