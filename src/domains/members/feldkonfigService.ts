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
import type { FeldkonfigZeile, FeldModus, KonfigZielSchreiben } from "./feldkonfig.ts";

/* Die Rohzeile aus dem Join. PostgREST liefert die eingebettete Tabelle
   je nach Beziehung als Objekt oder als Liste — beides abfangen, statt
   sich auf eine Form zu verlassen. */
interface RohZeile {
  mitgliedtyp_id: string | null;
  art_id: string | null;
  schluessel: string;
  modus: string;
  mitgliedtypen?: { name?: string | null } | { name?: string | null }[] | null;
  personenarten?: { name?: string | null } | { name?: string | null }[] | null;
}

type Eingebettet = { name?: string | null } | { name?: string | null }[] | null | undefined;

function nameAus(m: Eingebettet): string {
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
  /* ⚠ BEIDE Id-Spalten MUESSEN mit. Die Achse steht seit dem 20.08.2026 in
     den Daten selbst — genau eine der beiden ist gesetzt. Fehlte `art_id`,
     fielen die Zeilen einer Personenart lautlos durch: ihr Join auf
     `mitgliedtypen` ist leer, `nameAus()` gibt "" zurueck, und ein
     Namensvergleich trifft nie. Kein Fehler, nur eine Konfiguration ohne
     Wirkung. */
  const { data, error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .select("mitgliedtyp_id, art_id, schluessel, modus, mitgliedtypen(name), personenarten(name)");
  /* error lesen, nicht nur auf data pruefen: sb.from().select() wirft nicht.
     Ohne das saehe ein 42501 aus wie „nichts konfiguriert" — und damit waere
     alles freiwillig und sichtbar. */
  if (error) { console.error("fetchFeldkonfig error:", error); return []; }
  if (!data) return [];
  return (data as unknown as RohZeile[]).map(r => ({
    mitgliedtyp_id: r.mitgliedtyp_id,
    mitgliedtyp: nameAus(r.mitgliedtypen),
    art_id: r.art_id,
    art: nameAus(r.personenarten),
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
   fuer eine Zeile ohne Mitgliedtyp loeschte das nichts, PostgREST gibt keinen
   Fehler zurueck, und die Oberflaeche meldete Erfolg — „Freiwillig" (= Zeile
   loeschen) bliebe wirkungslos. Dieselbe Familie wie das 42P10 vom 20.08.:
   ein Schreibpfad, der richtig aussieht und still nicht greift.

   Seit dem 20.08.2026 traegt die Achse eine echte Id (`art_id`), der Filter
   ist also ein gewoehnliches `.eq(...)`. Die Regel bleibt trotzdem stehen:
   sie gilt fuer die jeweils ANDERE Spalte, die null sein muss. */

/** Die Werte fuer den Upsert — BEIDE Spalten der Achse zusammen, damit der
    CHECK `num_nonnulls(mitgliedtyp_id, art_id) = 1` nicht anschlagen kann. */
function zielWerte(ziel: KonfigZielSchreiben) {
  return ziel.achse === "personenart"
    ? { mitgliedtyp_id: null, art_id: ziel.artId }
    : { mitgliedtyp_id: ziel.mitgliedtypId, art_id: null };
}

/** Der Filter fuer das Loeschen — dieselbe Achse, dieselbe Kennung. */
function zielFilter<T extends { eq: (s: string, v: string) => T; is: (s: string, v: null) => T }>(
  q: T, ziel: KonfigZielSchreiben,
): T {
  return ziel.achse === "personenart"
    ? q.eq("art_id", ziel.artId).is("mitgliedtyp_id", null)
    : q.eq("mitgliedtyp_id", ziel.mitgliedtypId).is("art_id", null);
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
    const { error } = await zielFilter(q, ziel);
    return error?.message ?? null;
  }

  /* verein_id ist NOT NULL ohne Default — ohne sie lehnt die Datenbank
     die Zeile ab und die Aktion scheitert still (CLAUDE.md, verein_id-Regel).
     onConflict muss dem UNIQUE entsprechen, sonst schlägt jedes zweite
     Speichern fehl. Der Schlüssel lautet seit dem 20.08.2026
     (verein_id, mitgliedtyp_id, art_id, schluessel).

     ⚠ Er trägt `NULLS NOT DISTINCT` — ohne das entstünde bei jedem Speichern
     auf einer Achse mit null-Spalte eine weitere Zeile statt einer
     Aktualisierung, und zwar ohne Fehlermeldung.

     ⚠ Und `art_id` MUSS im Schlüssel stehen. Ohne sie hätten
     „Elternteil.telefon" und „Supporter.telefon" beide `mitgliedtyp_id IS
     NULL` und kollidierten — beim Anlegen der zweiten Art ist genau das
     passiert, mitten in der Migration. */
  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      { verein_id: vereinId, ...zielWerte(ziel), schluessel, modus },
      { onConflict: "verein_id,mitgliedtyp_id,art_id,schluessel" },
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
    const { error } = await zielFilter(q, ziel);
    return error?.message ?? null;
  }

  const { error } = await sb
    .from("mitgliedtyp_feldkonfig")
    .upsert(
      schluessel.map(s => ({
        verein_id: vereinId, ...zielWerte(ziel), schluessel: s, modus,
      })),
      { onConflict: "verein_id,mitgliedtyp_id,art_id,schluessel" },
    );
  return error?.message ?? null;
}
