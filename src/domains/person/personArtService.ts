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
  /** Portalrolle, die diese Art mitbringt. Fremdschlüssel auf
      `portal_rollen(verein_id, name)` — anders als bei `mitgliedtypen`,
      wo genau dieses Fehlen am 05.08.2026 einen Wert zugelassen hat, den
      keine Rolle kennt. */
  standard_rolle?: string | null;
  /** Nur in der Verwaltungsliste gesetzt — die Sicht liefert nur Aktive. */
  aktiv?: boolean;
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

/**
 * Die Liste der pflegbaren Arten — für die Portalverwaltung.
 *
 * `nurAktive = true` ist der Normalfall: Auswahllisten sollen keine
 * abgeschalteten Arten anbieten. Die Verwaltung selbst braucht auch die
 * inaktiven, sonst liesse sich keine wieder einschalten.
 */
export async function fetchPersonenarten(
  sb: SbClient, nurAktive = true,
): Promise<PersonArt[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("personenarten")
    .select("id, name, sort_order, ableitung, aktiv, standard_rolle")
    .order("sort_order");
  if (error) { console.error("fetchPersonenarten error:", error); return []; }
  return (data || [])
    .filter(r => !nurAktive || r.aktiv !== false)
    .map(r => ({
      art_id: r.id as string,
      name: (r.name as string) || "",
      sort_order: (r.sort_order as number) ?? 0,
      ableitung: (r.ableitung as string | null) ?? null,
      standard_rolle: (r.standard_rolle as string | null) ?? null,
      aktiv: r.aktiv !== false,
    }));
}

/* ── Pflege der Liste ─────────────────────────────────────────────────────
   Der Nachzug aus Etappe 1: die Tabelle stand, die Sicht stand, die
   Feldkonfiguration las sie — nur ANLEGEN konnte man nichts. „Ehemalige",
   das naheliegendste Austrittsziel überhaupt, liess sich nicht einrichten.

   ⚠ DIE SORTE IST BEIM ANLEGEN NICHT WÄHLBAR. Eine neu angelegte Art ist
   immer GESETZT (`ableitung = null`). Eine Ableitung ist eine Regel, die
   jemand berechnen muss — sie entsteht in `personenarten_effektiv`, nicht in
   einem Formular. Wäre sie wählbar, könnte jemand „Elternteil" von Hand
   vergeben, und die Ableitung überschriebe es im nächsten Moment still:
   derselbe Fehler wie bei den von Hand gesetzten Rollen. */

/** Eine neue Art anlegen. Immer gesetzt, nie abgeleitet. */
export async function insertPersonart(
  sb: SbClient,
  felder: { name: string; sort_order: number; standard_rolle: string | null },
  vereinId: string,
): Promise<{ artId: string | null; fehler: string | null }> {
  if (!sb) return { artId: null, fehler: "Keine Verbindung" };
  /* verein_id als eigener Pflichtparameter, nicht als Feld im Objekt: als
     Feld ist es vergessbar, und die DB lehnt die Zeile dann still ab. */
  const { data, error } = await sb.from("personenarten")
    .insert({ ...felder, verein_id: vereinId, ableitung: null, aktiv: true } as never)
    .select("id").single();
  if (error) {
    console.error("insertPersonart error:", error);
    if (error.code === "23503") {
      return { artId: null, fehler: "Diese Portalrolle gibt es nicht." };
    }
    return { artId: null, fehler: error.message || "Anlegen fehlgeschlagen" };
  }
  return { artId: (data?.id as string) ?? null, fehler: null };
}

/**
 * Eine Art ändern.
 *
 * ⚠ `ableitung` steht NICHT in der Allowlist. Aus einer gesetzten Art
 * nachträglich eine abgeleitete zu machen, hiesse eine Regel zu behaupten,
 * die es im Code nicht gibt — die Sicht kennt genau `eltern_kinder`.
 */
export async function updatePersonart(
  sb: SbClient, artId: string,
  felder: { name?: string; sort_order?: number; standard_rolle?: string | null; aktiv?: boolean },
): Promise<string | null> {
  if (!sb) return "Keine Verbindung";
  const ERLAUBT = ["name", "sort_order", "standard_rolle", "aktiv"] as const;
  const rein: Record<string, unknown> = {};
  for (const k of ERLAUBT) if (felder[k] !== undefined) rein[k] = felder[k];
  if (Object.keys(rein).length === 0) return null;
  const { error } = await sb.from("personenarten").update(rein as never).eq("id", artId);
  if (error) {
    console.error("updatePersonart error:", error);
    if (error.code === "23503") return "Diese Portalrolle gibt es nicht.";
    return error.message || "Speichern fehlgeschlagen";
  }
  return null;
}

/**
 * Das Austrittsziel des Vereins lesen und setzen.
 *
 * ⚠ NUR GESETZTE ARTEN. Eine abgeleitete als Ziel wäre eine Zusage, die die
 * Ableitung im nächsten Moment überschreibt. Geprüft wird hier und in der
 * Oberfläche, NICHT per CHECK — ein CHECK darf nicht in eine andere Tabelle
 * sehen; die Begründung steht im Kopf von `migration_austritt.sql`.
 */
export async function fetchAustrittsziel(
  sb: SbClient, vereinId: string,
): Promise<string | null> {
  if (!sb) return null;
  const { data, error } = await sb.from("vereine")
    .select("austritt_art_id").eq("id", vereinId).maybeSingle();
  if (error) { console.error("fetchAustrittsziel error:", error); return null; }
  return (data?.austritt_art_id as string | null) ?? null;
}

export async function setzeAustrittsziel(
  sb: SbClient, vereinId: string, artId: string | null,
): Promise<string | null> {
  if (!sb) return "Keine Verbindung";
  const { error } = await sb.from("vereine")
    .update({ austritt_art_id: artId }).eq("id", vereinId);
  if (error) {
    console.error("setzeAustrittsziel error:", error);
    return error.message || "Speichern fehlgeschlagen";
  }
  return null;
}
