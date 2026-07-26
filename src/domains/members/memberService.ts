/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/memberService.ts
   Alle Supabase-Calls für Mitglieder, Notizen, Elternkontakte,
   Kader, Benutzer (Portal-Zugang), Ansichten
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import type { Ansicht, SbClient, TablesInsert, TablesUpdate } from "../../types.ts";

/* ── Fehler-Vertrag der Write-Funktionen ──────────────────────────
   Reine Schreiboperationen (insert/update/delete/upsert ohne Rückgabe-
   daten) geben einheitlich `PostgrestError | null` zurück: null = ok,
   sonst der Fehler. Aufrufer koennen so konsistent `if (await fn())`
   pruefen (wie in elternService). Funktionen, die Daten zurueckgeben
   (fetch*, insertMitglied, insertAnsicht …), behalten ihren Rückgabetyp. */

/* ── Mitglieder ── */

export async function fetchMitglied(sb: SbClient, id: number) {
  const { data } = await sb.from("mitglieder").select("*").eq("id", id).single();
  return data;
}

export async function deleteMitglied(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").delete().eq("id", id);
  return error;
}

export async function archiviereMitglied(sb: SbClient, id: number | number[], deaktiviertVon: string | null): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date().toISOString(),
    deaktiviert_von: deaktiviertVon,
  }).in("id", Array.isArray(id) ? id : [id]);
  return error;
}

export async function reaktiviereMitglied(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").update({
    aktiv: true,
    deaktiviert_am: null,
    deaktiviert_von: null,
  }).eq("id", id);
  return error;
}

export async function fetchArchiv(sb: SbClient) {
  const { data } = await sb.from("mitglieder")
    .select("id,vorname,nachname,mitgliedtyp,deaktiviert_am,deaktiviert_von")
    .eq("aktiv", false)
    .order("deaktiviert_am", { ascending: false });
  return data || [];
}

export async function fetchArchivCount(sb: SbClient): Promise<number> {
  const { count } = await sb.from("mitglieder")
    .select("id", { count: "exact", head: true })
    .eq("aktiv", false);
  return count || 0;
}

/* ── Mitglieder Ansichten ── */

export async function fetchAnsichten(sb: SbClient, benutzerId: string, typ = "mitglieder"): Promise<Ansicht[]> {
  const { data } = await sb.from("mitglieder_ansichten")
    .select("*")
    .eq("typ", typ)
    .or(`benutzer_id.eq.${benutzerId},geteilt.eq.true`)
    .order("created_at", { ascending: true });
  return (data || []) as Ansicht[];
}

export async function insertAnsicht(sb: SbClient, ansicht: TablesInsert<"mitglieder_ansichten">): Promise<Ansicht | null> {
  const { data, error } = await sb.from("mitglieder_ansichten").insert(ansicht).select().single();
  if (error) console.error("insertAnsicht error:", error);
  return (data as Ansicht | null) ?? null;
}

export async function deleteAnsicht(sb: SbClient, id: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_ansichten").delete().eq("id", id);
  return error;
}

/* ── Notizen ── */

export async function fetchNotizen(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_notizen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function insertNotiz(sb: SbClient, notiz: TablesInsert<"mitglieder_notizen">): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").insert(notiz);
  return error;
}

export async function updateNotiz(sb: SbClient, id: number, text: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").update({
    text,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  return error;
}

export async function deleteNotiz(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").delete().eq("id", id);
  return error;
}

/* ── Elternkontakte ── */

// Eltern-Funktionen → elternService.ts
export * from "./elternService.ts";

/* ── Kader ── */

export async function fetchKaderFuerMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("*, teams(id,name,kurzname)")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function fetchKaderEintraege(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("team_id, rollen")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function upsertKader(sb: SbClient, eintrag: TablesInsert<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").upsert(eintrag, { onConflict: "mitglied_id,team_id,saison" });
  return error;
}

export async function updateKader(sb: SbClient, id: number, fields: TablesUpdate<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update(fields).eq("id", id);
  return error;
}

export async function deaktiviereKader(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update({ aktiv: false }).eq("id", id);
  return error;
}

/* ── Benutzer (Portal-Zugang) ── */

export async function fetchBenutzerFuerMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role,created_at,last_sign_in_at,aktiv")
    .eq("mitglied_id", mitgliedId)
    .maybeSingle();
  return data;
}

export async function fetchBenutzerByEmail(sb: SbClient, email: string) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();
  return data;
}

export async function updateBenutzer(sb: SbClient, id: string, fields: TablesUpdate<"benutzer">): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update(fields).eq("id", id);
  return error;
}

export async function portalZugangAktivieren(sb: SbClient, mitgliedId: number, benutzerId: string, neueRolle: string): Promise<PostgrestError | null> {
  const { error: e1 } = await sb.from("mitglieder").update({ hat_portal_zugang: true }).eq("id", mitgliedId);
  if (e1) return e1;
  const { error: e2 } = await sb.from("benutzer").update({ mitglied_id: mitgliedId, role: neueRolle }).eq("id", benutzerId);
  return e2;
}

export async function portalZugangDeaktivieren(sb: SbClient, mitgliedId: number): Promise<PostgrestError | null> {
  const { error: e1 } = await sb.from("mitglieder").update({ hat_portal_zugang: false }).eq("id", mitgliedId);
  if (e1) return e1;
  const { error: e2 } = await sb.from("benutzer").update({ mitglied_id: null }).eq("mitglied_id", mitgliedId);
  return e2;
}

/* ── Portal Funktionen ── */

export async function fetchPortalFunktionen(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name,farbe)")
    .order("name");
  return data || [];
}

export async function fetchPortalFunktionenMitGruppe(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name)")
    .order("name");
  return data || [];
}

/* ── Teams ── */

export async function fetchAktiveTeams(sb: SbClient) {
  const { data } = await sb.from("teams")
    .select("id,name,kurzname")
    .eq("aktiv", true)
    .order("name");
  return data || [];
}

export async function updateMitglied(sb: SbClient, id: number, fields: TablesUpdate<"mitglieder">): Promise<boolean> {
  const { error } = await sb.from("mitglieder").update({
    ...fields,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) console.error("updateMitglied error:", error);
  return !error;
}

export async function updateMitgliedRolle(sb: SbClient, id: number, rolle: string | null, benutzerId: string | null = null) {
  await sb.from("mitglieder").update({ rolle: rolle||null }).eq("id", id);
  if (rolle && benutzerId) {
    await sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
  }
}

export async function updateMitgliedFoto(sb: SbClient, id: number, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const path = `${id}/foto.${ext}`;
  const { error: upErr } = await sb.storage.from("mitglieder-fotos").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = sb.storage.from("mitglieder-fotos").getPublicUrl(path);
  const { error: dbErr } = await sb.from("mitglieder").update({ foto_url: data.publicUrl + "?t=" + Date.now() }).eq("id", id);
  if (dbErr) throw dbErr;
  return data.publicUrl;
}

export async function deleteMitgliedFoto(sb: SbClient, id: number): Promise<boolean> {
  const { error } = await sb.from("mitglieder").update({ foto_url: null }).eq("id", id);
  if (error) console.error("deleteMitgliedFoto error:", error);
  return !error;
}

export async function fetchBenutzerByMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("benutzer").select("id,role").eq("mitglied_id", mitgliedId).maybeSingle();
  return data;
}

export async function insertMitglied(
  sb: SbClient,
  fields: Omit<TablesInsert<"mitglieder">, "verein_id">,
  vereinId: string,
): Promise<number | null> {
  const { data, error } = await sb.from("mitglieder").insert({
    ...fields,
    verein_id: vereinId,
    aktiv: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select("id").single();
  if (error) { console.error("insertMitglied error:", error); return null; }
  return data?.id ?? null;
}

export async function fetchMitgliedtypPflichtfelder(sb: SbClient) {
  const { data } = await sb.from("mitgliedtyp_pflichtfelder").select("*");
  return data || [];
}

export const FELD_LABEL: Record<string, string> = {
  vorname: "Vorname", nachname: "Nachname", email: "E-Mail",
  telefon: "Telefon", geburtsdatum: "Geburtsdatum", geschlecht: "Geschlecht",
  nationalitaet: "Nationalität 1", nationalitaet2: "Nationalität 2",
  heimatort: "Heimatort", ahv_nr: "AHV-Nr.", strasse: "Strasse",
  plz: "PLZ", ort: "Ort", kanton: "Kanton",
  mitgliedtyp: "Mitgliedtyp", rolle: "Portalrolle",
  spielerpass: "Spielerpass", js_nr: "J+S Nr.", fairgate_id: "Fairgate-ID",
  teams: "Teams", kaderrollen: "Kaderrollen",
  funktionen: "Vereinsfunktionen", elternkontakte: "Elternkontakte",
};

/* Werte, die in der Historie landen — die Aufrufer geben auch Zahlen
   oder Arrays weiter, deshalb bewusst weit gefasst. */
export type LogWert = string | number | boolean | null | undefined;

export async function logAenderung(
  sb: SbClient,
  mitgliedId: number | string,
  vereinId: string,
  feld: string,
  alterWert: LogWert,
  neuerWert: LogWert,
  geaendertVon?: string | null,
): Promise<void> {
  if (alterWert === neuerWert) return; // Keine Änderung

  const feldLabel = FELD_LABEL[feld] || feld;
  const von = geaendertVon || "Administrator";

  if (alterWert && neuerWert) {
    // Echter Wechsel: Wert A → Wert B → in mitglieder_aenderungen
    await sb.from("mitglieder_aenderungen").insert({
      mitglied_id:   parseInt(String(mitgliedId)),
      verein_id:     vereinId,
      feld,
      alter_wert:    String(alterWert),
      neuer_wert:    String(neuerWert),
      geaendert_von: von,
    });
  } else if (!alterWert && neuerWert) {
    // Erstmalig erfasst: null → Wert → in mitglieder_aktivitaeten
    await logAktivitaet(sb, mitgliedId, vereinId,
      AKTIVITAET_TYP.FELD_ERFASST,
      `${feldLabel} erfasst`,
      feld, String(neuerWert), von
    );
  } else if (alterWert && !neuerWert) {
    // Geleert: Wert → null → in mitglieder_aktivitaeten
    await logAktivitaet(sb, mitgliedId, vereinId,
      AKTIVITAET_TYP.FELD_GELEERT,
      `${feldLabel} geleert`,
      feld, String(alterWert), von
    );
  }
}

export async function fetchAenderungen(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_aenderungen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("geaendert_at", { ascending: false })
    .limit(50);
  return data || [];
}

// ── Aktivitäten-Typen ─────────────────────────────────────────
export const AKTIVITAET_TYP = {
  ANGELEGT:            "angelegt",
  FELD_ERFASST:        "feld_erfasst",
  FELD_GELEERT:        "feld_geleert",
  TEAM_HINZUGEFUEGT:   "team_hinzugefuegt",
  TEAM_ENTFERNT:       "team_entfernt",
  KADERROLLE_GEAENDERT:"kaderrolle_geaendert",
  FUNKTION_GEAENDERT:  "funktion_geaendert",
  ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt",
  ELTERN_ENTFERNT:     "eltern_entfernt",
  ELTERN_GEAENDERT:    "eltern_geaendert",
  PORTAL_AKTIVIERT:    "portal_aktiviert",
  PORTAL_DEAKTIVIERT:  "portal_deaktiviert",
  PORTAL_REAKTIVIERT:  "portal_reaktiviert",
  ARCHIVIERT:          "archiviert",
  REAKTIVIERT:         "reaktiviert",
} as const;

export type AktivitaetTyp = typeof AKTIVITAET_TYP[keyof typeof AKTIVITAET_TYP];

export async function logAktivitaet(
  sb: SbClient,
  mitgliedId: number | string,
  vereinId: string,
  typ: AktivitaetTyp,
  beschreibung: string,
  feld: string | null = null,
  wert: LogWert = null,
  geaendertVon: string | null = null,
): Promise<void> {
  await sb.from("mitglieder_aktivitaeten").insert({
    mitglied_id:   parseInt(String(mitgliedId)),
    verein_id:     vereinId,
    typ,
    beschreibung,
    feld:          feld || null,
    wert:          wert == null ? null : String(wert),
    geaendert_von: geaendertVon || null,
  });
}

export async function fetchAktivitaeten(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_aktivitaeten")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("geaendert_at", { ascending: false })
    .limit(100);
  return data || [];
}
