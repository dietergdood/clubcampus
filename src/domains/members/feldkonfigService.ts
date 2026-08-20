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
import type { FeldkonfigZeile, FeldModus, GiltFuer, KonfigZielSchreiben } from "./feldkonfig.ts";

/* Die Rohzeile aus dem Join. PostgREST liefert die eingebettete Tabelle
   je nach Beziehung als Objekt oder als Liste — beides abfangen, statt
   sich auf eine Form zu verlassen. */
interface RohZeile {
  mitgliedtyp_id: string | null;
  gilt_fuer: string;
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
  /* ⚠ `gilt_fuer` MUSS mit. Ohne die Spalte filterte die Auswertung die
     Zeilen fuer „ohne Mitgliedschaft" lautlos weg: ihr Join auf
     `mitgliedtypen` ist leer, `nameAus()` gibt "" zurueck, und ein
     Namensvergleich trifft nie. Kein Fehler, nur eine Konfiguration ohne
     Wirkung. */
  const { data, error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .select("mitgliedtyp_id, gilt_fuer, schluessel, modus, mitgliedtypen(name)");
  /* error lesen, nicht nur auf data pruefen: sb.from().select() wirft nicht.
     Ohne das saehe ein 42501 aus wie „nichts konfiguriert" — und damit waere
     alles freiwillig und sichtbar. */
  if (error) { console.error("fetchFeldkonfig error:", error); return []; }
  if (!data) return [];
  return (data as unknown as RohZeile[]).map(r => ({
    mitgliedtyp_id: r.mitgliedtyp_id,
    mitgliedtyp: nameAus(r),
    gilt_fuer: (r.gilt_fuer || "mitgliedtyp") as GiltFuer,
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
/* ⚠ `.eq("mitgliedtyp_id", null)` TRIFFT NICHTS. `= NULL` ist in SQL nie wahr:
   fuer die Zeilen mit `gilt_fuer = "ohne_mitgliedschaft"` loeschte das nichts,
   PostgREST gibt keinen Fehler zurueck, und die Oberflaeche meldete Erfolg —
   „Freiwillig" (= Zeile loeschen) bliebe wirkungslos. Dieselbe Familie wie
   das 42P10 vom 20.08.: ein Schreibpfad, der richtig aussieht und still nicht
   greift.

   Deshalb setzt diese Funktion den Filter selbst, statt sich darauf zu
   verlassen, dass ein Aufrufer an `.is(...)` denkt. */
/** Die Werte fuer den Upsert — beide Spalten der Achse zusammen, damit der
    CHECK `mitgliedtyp_feldkonfig_achse_check` nicht anschlagen kann. */
function zielWerte(ziel: KonfigZielSchreiben) {
  return ziel.gilt_fuer === "ohne_mitgliedschaft"
    ? { mitgliedtyp_id: null, gilt_fuer: "ohne_mitgliedschaft" }
    : { mitgliedtyp_id: ziel.mitgliedtypId, gilt_fuer: "mitgliedtyp" };
}

export async function setzeModus(
  sb: SbClient,
  vereinId: string,
  ziel: KonfigZielSchreiben,
  schluessel: string,
  modus: FeldModus,
): Promise<string | null> {
  if (modus === "freiwillig") {
    const q = sb.from("mitgliedtyp_feldkonfig").delete()
      .eq("verein_id", vereinId).eq("schluessel", schluessel);
    const { error } = await (ziel.gilt_fuer === "ohne_mitgliedschaft"
      ? q.is("mitgliedtyp_id", null)
      : q.eq("mitgliedtyp_id", ziel.mitgliedtypId));
    return error?.message ?? null;
  }

  /* verein_id ist NOT NULL ohne Default — ohne sie lehnt die Datenbank
     die Zeile ab und die Aktion scheitert still (CLAUDE.md, verein_id-Regel).
     onConflict muss dem UNIQUE (verein_id, mitgliedtyp_id, schluessel)
     entsprechen, sonst schlägt jedes zweite Speichern fehl.

     ⚠ Der Schlüssel trägt seit dem 21.08.2026 `NULLS NOT DISTINCT` — ohne das
     entstünde bei jedem Speichern in der neuen Spalte eine weitere Zeile
     statt einer Aktualisierung, und zwar ohne Fehlermeldung. */
  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      { verein_id: vereinId, ...zielWerte(ziel), schluessel, modus },
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
  ziel: KonfigZielSchreiben,
  schluessel: readonly string[],
  modus: FeldModus,
): Promise<string | null> {
  if (schluessel.length === 0) return null;

  if (modus === "freiwillig") {
    const q = sb.from("mitgliedtyp_feldkonfig").delete()
      .eq("verein_id", vereinId).in("schluessel", schluessel as string[]);
    const { error } = await (ziel.gilt_fuer === "ohne_mitgliedschaft"
      ? q.is("mitgliedtyp_id", null)
      : q.eq("mitgliedtyp_id", ziel.mitgliedtypId));
    return error?.message ?? null;
  }

  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      schluessel.map(s => ({
        verein_id: vereinId, ...zielWerte(ziel), schluessel: s, modus,
      })),
      { onConflict: "verein_id,mitgliedtyp_id,schluessel" },
    );
  return error?.message ?? null;
}
