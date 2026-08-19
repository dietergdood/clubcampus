/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/feldkonfigService.ts

   Lesen und Schreiben von `mitgliedtyp_feldkonfig`. Die Auswertung
   steht daneben in feldkonfig.ts und kennt keine Datenbank.

   Gespeichert wird nur die Abweichung: eine fehlende Zeile bedeutet
   "freiwillig". Deshalb löscht `setzeModus` die Zeile, statt sie auf
   "freiwillig" zu setzen — sonst füllte sich die Tabelle mit Zeilen,
   die nichts aussagen, und "nichts konfiguriert" liesse sich von
   "alles auf Standard gestellt" nicht mehr unterscheiden.
   ═══════════════════════════════════════════════════════════════ */
import type { SbClient } from "../../types.ts";
import type { FeldkonfigZeile, FeldModus } from "./feldkonfig.ts";

/* Die Rohzeile aus dem Join. PostgREST liefert die eingebettete Tabelle
   je nach Beziehung als Objekt oder als Liste — beides abfangen, statt
   sich auf eine Form zu verlassen. */
interface RohZeile {
  mitgliedtyp_id: string;
  schluessel: string;
  modus: string;
  mitgliedtypen?: { name?: string | null } | { name?: string | null }[] | null;
}

function nameAus(roh: RohZeile): string {
  const m = roh.mitgliedtypen;
  if (!m) return "";
  return (Array.isArray(m) ? m[0]?.name : m.name) || "";
}

/**
 * Alle Konfigurationszeilen des Vereins, flachgezogen um den Namen des
 * Mitgliedtyps.
 *
 * Die Datenbank verknüpft über `mitgliedtyp_id` — ein Name als Schlüssel
 * hatte in der Vorgängertabelle siebzehn Zeilen verwaisen lassen, sobald
 * jemand einen Mitgliedtyp umbenannte. Die Aufrufer haben aber nur den
 * Namen zur Hand (`mitglieder.mitgliedtyp` ist Text). Deshalb hier der
 * Join und die flache Zeile — dasselbe Muster wie `flacheZeile()` bei
 * den Personen.
 */
export async function fetchFeldkonfig(sb: SbClient): Promise<FeldkonfigZeile[]> {
  const { data } = await sb
    .from("mitgliedtyp_feldkonfig")
    .select("mitgliedtyp_id, schluessel, modus, mitgliedtypen(name)");
  if (!data) return [];
  return (data as unknown as RohZeile[]).map(r => ({
    mitgliedtyp_id: r.mitgliedtyp_id,
    mitgliedtyp: nameAus(r),
    schluessel: r.schluessel,
    modus: r.modus as FeldModus,
  }));
}

/**
 * Setzt einen Schlüssel für einen Mitgliedtyp.
 *
 * `freiwillig` löscht die Zeile — siehe Dateikopf. Gibt eine Meldung
 * zurück, wenn es schiefging, sonst null; die Oberfläche zeigt sie an,
 * statt die Änderung still verschwinden zu lassen.
 */
export async function setzeModus(
  sb: SbClient,
  vereinId: string,
  mitgliedtypId: string,
  schluessel: string,
  modus: FeldModus,
): Promise<string | null> {
  if (modus === "freiwillig") {
    const { error } = await sb
      .from("mitgliedtyp_feldkonfig")
      .delete()
      .eq("verein_id", vereinId)
      .eq("mitgliedtyp_id", mitgliedtypId)
      .eq("schluessel", schluessel);
    return error?.message ?? null;
  }

  /* verein_id ist NOT NULL ohne Default — ohne sie lehnt die Datenbank
     die Zeile ab und die Aktion scheitert still (CLAUDE.md, verein_id-Regel).
     onConflict muss dem UNIQUE (verein_id, mitgliedtyp_id, schluessel)
     entsprechen, sonst schlägt jedes zweite Speichern fehl. */
  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      { verein_id: vereinId, mitgliedtyp_id: mitgliedtypId, schluessel, modus },
      { onConflict: "verein_id,mitgliedtyp_id,schluessel" },
    );
  return error?.message ?? null;
}

/**
 * Setzt mehrere Schlüssel in einem Zug — für den Sammelschalter eines
 * Bereichs und für den Adressblock, dessen vier Felder nur gemeinsam
 * abgeschaltet werden dürfen (siehe ADRESS_FELDER in feldkonfig.ts).
 *
 * Ein Zug, nicht vier: bei vier einzelnen Aufrufen kann der dritte
 * scheitern und der Block bliebe halb geschaltet.
 */
export async function setzeModusMehrere(
  sb: SbClient,
  vereinId: string,
  mitgliedtypId: string,
  schluessel: readonly string[],
  modus: FeldModus,
): Promise<string | null> {
  if (schluessel.length === 0) return null;

  if (modus === "freiwillig") {
    const { error } = await sb
      .from("mitgliedtyp_feldkonfig")
      .delete()
      .eq("verein_id", vereinId)
      .eq("mitgliedtyp_id", mitgliedtypId)
      .in("schluessel", schluessel as string[]);
    return error?.message ?? null;
  }

  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      schluessel.map(s => ({
        verein_id: vereinId, mitgliedtyp_id: mitgliedtypId, schluessel: s, modus,
      })),
      { onConflict: "verein_id,mitgliedtyp_id,schluessel" },
    );
  return error?.message ?? null;
}
