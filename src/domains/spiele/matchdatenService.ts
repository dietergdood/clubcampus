/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/matchdatenService.ts
   Alle sb-Zugriffe auf spiel_aufstellung, spiel_ereignisse und
   sfv_zuordnung. Die Auswertung steht daneben in matchdatenAnzeige.ts
   und kennt keine Datenbank.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb } from "../../types.ts";
import type { AufstellungZeile, EreignisZeile } from "./matchdatenAnzeige.ts";

export interface AufstellungMitZeit extends AufstellungZeile {
  position_name: string | null;
  von_minute: number | null;
  bis_minute: number | null;
  spielzeit: number | null;
}

/** Aufstellung und Ereignisse eines Spiels — beide Schichten. */
export async function fetchSpielMatchdaten(sb: Sb, spielId: string) {
  if (!sb) return { aufstellung: [], ereignisse: [] };
  const [a, e] = await Promise.all([
    sb.from("spiel_aufstellung").select("*").eq("spiel_id", spielId).order("rueckennr"),
    sb.from("spiel_ereignisse").select("*").eq("spiel_id", spielId),
  ]);
  return {
    aufstellung: (a.data ?? []) as unknown as AufstellungMitZeit[],
    ereignisse: (e.data ?? []) as unknown as EreignisZeile[],
  };
}

/** Alle Aufstellungszeilen des Vereins — Grundlage für Warteschlange
    und Statistik. */
export async function fetchAlleAufstellungen(sb: Sb, vereinId: string | null) {
  if (!sb || !vereinId) return [];
  const { data } = await sb.from("spiel_aufstellung").select("*").eq("verein_id", vereinId);
  return (data ?? []) as unknown as AufstellungMitZeit[];
}

export interface ZuordnungZeile {
  id: string;
  sfv_person_id: number;
  mitglied_id: number;
  zugeordnet_am: string | null;
}

export async function fetchZuordnungen(sb: Sb, vereinId: string | null): Promise<ZuordnungZeile[]> {
  if (!sb || !vereinId) return [];
  const { data } = await sb.from("sfv_zuordnung").select("*").eq("verein_id", vereinId);
  return (data ?? []) as unknown as ZuordnungZeile[];
}

/**
 * Ordnet eine SFV-Person einem Mitglied zu.
 *
 * verein_id als eigener Pflichtparameter, nicht als Feld im Objekt — die
 * Spalte ist NOT NULL ohne Default, und als Objektfeld ist sie vergessbar
 * (CLAUDE.md, verein_id-Regel).
 *
 * Ein Mitglied darf mehrere sfv_person_id tragen: wechselt der Verband die
 * IDs zur neuen Saison, kommt eine dazu, statt eine zu ersetzen. Deshalb
 * greift onConflict nur auf (verein_id, sfv_person_id).
 */
export async function speichereZuordnung(
  sb: Sb, vereinId: string, sfvPersonId: number, mitgliedId: number, benutzerId: string | null,
): Promise<string | null> {
  if (!sb) return "Kein Datenbank-Zugriff";
  const { error } = await sb.from("sfv_zuordnung").upsert({
    verein_id: vereinId,
    sfv_person_id: sfvPersonId,
    mitglied_id: mitgliedId,
    zugeordnet_von: benutzerId,
    zugeordnet_am: new Date().toISOString(),
  }, { onConflict: "verein_id,sfv_person_id" });
  return error?.message ?? null;
}

export async function loescheZuordnung(sb: Sb, id: string): Promise<string | null> {
  if (!sb) return "Kein Datenbank-Zugriff";
  const { error } = await sb.from("sfv_zuordnung").delete().eq("id", id);
  return error?.message ?? null;
}

/* ── Korrekturen ───────────────────────────────────────────────────
   Eine Korrektur ÜBERSCHREIBT die SFV-Zeile nicht, sie verdeckt sie.
   `geaenderte_felder` sagt, was angefasst wurde — nur diese Felder
   werden beim Nachzug-Vergleich geprüft. */

export interface KorrekturEingabe {
  spielId: string;
  /** Die SFV-Zeile, die verdeckt wird. Null bei einem Nachtrag (Assist). */
  ersetztEreignisId: string | null;
  typId: number;
  typ: string | null;
  minute: number | null;
  istEigener: boolean;
  sfvPersonId: number | null;
  rueckennr: number | null;
  gegnerClubName: string | null;
  /** Welche Spalten diese Korrektur setzt. Bei einem Nachtrag leer. */
  geaenderteFelder: string[];
}

export async function speichereKorrektur(
  sb: Sb, vereinId: string, eingabe: KorrekturEingabe, benutzerId: string,
): Promise<string | null> {
  if (!sb) return "Kein Datenbank-Zugriff";
  const { error } = await sb.from("spiel_ereignisse").insert({
    verein_id: vereinId,
    spiel_id: eingabe.spielId,
    herkunft: "verein",
    ersetzt_ereignis_id: eingabe.ersetztEreignisId,
    /* Leeres Array wäre ein Verstoss gegen spiel_ereignisse_schicht_check:
       eine verdeckende Zeile MUSS sagen, was sie ändert. Ein Nachtrag darf
       dagegen gar keine Feldliste haben. */
    geaenderte_felder: eingabe.ersetztEreignisId ? eingabe.geaenderteFelder : null,
    korrigiert_von: benutzerId,
    korrigiert_am: new Date().toISOString(),
    typ_id: eingabe.typId,
    typ: eingabe.typ,
    minute: eingabe.minute,
    ist_eigener: eingabe.istEigener,
    sfv_person_id: eingabe.istEigener ? eingabe.sfvPersonId : null,
    rueckennr: eingabe.istEigener ? eingabe.rueckennr : null,
    gegner_club_name: eingabe.istEigener ? null : eingabe.gegnerClubName,
  });
  return error?.message ?? null;
}

/** Nimmt eine Korrektur zurück — danach gilt wieder die SFV-Zeile.
    Gelöscht wird nicht: der Verlauf bleibt nachvollziehbar. */
export async function verwerfeKorrektur(sb: Sb, id: string): Promise<string | null> {
  if (!sb) return "Kein Datenbank-Zugriff";
  const { error } = await sb.from("spiel_ereignisse")
    .update({ verworfen_am: new Date().toISOString() }).eq("id", id);
  return error?.message ?? null;
}

/** Welche Spiele haben überhaupt einen Verlauf vom Verband? Grundlage für
    den Hinweis und für die Statistik-Spalte „Spiele mit Verlauf". */
export async function fetchSpieleMitVerlauf(sb: Sb, vereinId: string | null): Promise<Set<string>> {
  if (!sb || !vereinId) return new Set();
  const { data } = await sb.from("spiel_ereignisse")
    .select("spiel_id").eq("verein_id", vereinId).eq("herkunft", "sfv");
  return new Set((data ?? []).map(z => z.spiel_id as string));
}

/**
 * sfv_person_id → Anzeigename, für Spielbericht und Warteschlange.
 *
 * Zwei Abfragen statt eines Joins: die Namen stehen an `personen`, nicht
 * an `mitglieder` (seit Etappe 6a), und der Weg dorthin führt über zwei
 * Fremdschlüssel. In JS zusammenzusetzen ist hier billiger als eine
 * verschachtelte Einbettung, die bei jeder Schemaänderung neu zu prüfen
 * wäre.
 *
 * ⚠ Nur EIGENE Spieler. Von fremden gibt es keine sfv_person_id in
 * unseren Tabellen — der CHECK-Constraint verhindert sie.
 */
export async function fetchSfvNamen(sb: Sb, vereinId: string | null): Promise<Map<number, string>> {
  const raus = new Map<number, string>();
  if (!sb || !vereinId) return raus;

  const { data: zuordnung } = await sb.from("sfv_zuordnung")
    .select("sfv_person_id, mitglied_id").eq("verein_id", vereinId);
  if (!zuordnung?.length) return raus;

  const { data: mitglieder } = await sb.from("mitglieder")
    .select("id, personen(vorname, nachname)")
    .in("id", zuordnung.map(z => z.mitglied_id as number));

  const nameNachMitglied = new Map<number, string>();
  for (const m of mitglieder ?? []) {
    const p = (m as unknown as { personen?: { vorname?: string | null; nachname?: string | null } }).personen;
    const name = `${p?.vorname ?? ""} ${p?.nachname ?? ""}`.trim();
    if (name) nameNachMitglied.set(Number(m.id), name);
  }
  for (const z of zuordnung) {
    const name = nameNachMitglied.get(Number(z.mitglied_id));
    if (name) raus.set(Number(z.sfv_person_id), name);
  }
  return raus;
}

/**
 * sfv_team_id → öffentliche Bild-Adresse des Vereinswappens.
 *
 * Der Bucket ist öffentlich lesbar, damit der Browser die Wappen wie jedes
 * andere Bild cacht — das war der ganze Grund, sie nicht als Base64 in der
 * Zeile mitzuschicken.
 *
 * ⚠ NUR GEGNER. Das eigene Wappen kommt aus `vereine.theme` und ist dort in
 * besserer Qualität als die 80×80 vom Verband.
 */
export async function fetchGegnerWappen(sb: Sb, vereinId: string | null): Promise<Map<number, string>> {
  const raus = new Map<number, string>();
  if (!sb || !vereinId) return raus;
  const { data } = await sb.from("sfv_team_logos")
    .select("sfv_team_id,pfad").eq("verein_id", vereinId).not("pfad", "is", null);
  for (const z of data ?? []) {
    const { data: url } = sb.storage.from("sfv-logos").getPublicUrl(z.pfad as string);
    if (url?.publicUrl) raus.set(Number(z.sfv_team_id), url.publicUrl);
  }
  return raus;
}
