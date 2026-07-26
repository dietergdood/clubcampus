/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/elternService.ts
   Alle Elternkontakt-Funktionen (n:m via eltern_kinder)
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import type { Elternkontakt, SbClient, TablesInsert, TablesUpdate } from "../../types.ts";

/* Elternkontakt inklusive der Angaben aus der Verknüpfungstabelle */
export interface ElternkontaktMitLink extends Partial<Elternkontakt> {
  hauptkontakt: boolean | null;
}

export async function fetchElternkontakte(sb: SbClient, mitgliedId: number): Promise<ElternkontaktMitLink[]> {
  const { data } = await sb.from("eltern_kinder")
    .select("hauptkontakt, elternkontakte(*)")
    .eq("mitglied_id", mitgliedId);
  if (!data) return [];
  return data.map(row => ({
    ...row.elternkontakte,
    hauptkontakt: row.hauptkontakt,
  }));
}

export async function fetchAlleElternkontakte(sb: SbClient, vereinId: string) {
  const { data, error } = await sb.from("elternkontakte")
    .select(`
      id, vorname, nachname, name, email, telefon, beziehung,
      benutzer_id,
      eltern_kinder(
        mitglied_id, hauptkontakt,
        mitglieder:mitglied_id(
          id, vorname, nachname,
          kader(rollen, aktiv, teams(id, name, kurzname))
        )
      )
    `)
    .eq("verein_id", vereinId)
    .order("nachname", { ascending: true });
  if(error) console.error("fetchAlleElternkontakte error:", error);
  return (data||[]).map(e => {
    const erstesKind = e.eltern_kinder?.[0];
    return {
      ...e,
      mitglied_id: erstesKind?.mitglied_id || null,
      hauptkontakt: erstesKind?.hauptkontakt || false,
      mitglieder: erstesKind?.mitglieder || null,
      _alle_kinder: e.eltern_kinder || [],
    };
  });
}

export async function fetchKinderFuerElternteil(sb: SbClient, elternId: string) {
  const { data } = await sb.from("eltern_kinder")
    .select("mitglied_id, hauptkontakt, mitglieder:mitglied_id(id, vorname, nachname, aktiv, mitgliedtyp)")
    .eq("eltern_id", elternId);
  return data || [];
}

export async function fetchKinderVollstaendigFuerElternteil(sb: SbClient, elternId: string) {
  const { data } = await sb.from("eltern_kinder")
    .select(`mitglied_id, mitglieder:mitglied_id(
      id, vorname, nachname, name, geburtsdatum, nationalitaet, nationalitaet2,
      strasse, plz, ort, kanton, email, telefon, ahv_nr, profil_geprueft_at
    )`)
    .eq("eltern_id", elternId);
  return (data || []).map(r => r.mitglieder).filter(Boolean);
}

export async function sucheElternkontakte(sb: SbClient, vereinId: string, query: string) {
  const q = (query||"").trim().toLowerCase();
  if(!q) return [];
  const { data } = await sb.from("elternkontakte")
    .select("id, vorname, nachname, name, email, beziehung, eltern_kinder(mitglied_id, mitglieder:mitglied_id(id, vorname, nachname))")
    .eq("verein_id", vereinId)
    .or(`vorname.ilike.%${q}%,nachname.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  return data || [];
}

/* Eingabe von insertElternkontakt: Kontaktfelder plus die Verknüpfung,
   die anschliessend in eltern_kinder geschrieben wird. */
export interface NeuerElternkontakt extends Omit<TablesInsert<"elternkontakte">, "hauptkontakt"> {
  /* Kind, mit dem der neue Kontakt verknüpft wird. Die Spalte ist laut
     ELTERN_LOGIK.md deprecated (verknüpft wird über eltern_kinder), in der
     Datenbank aber weiterhin NOT NULL — daher Pflichtfeld. */
  mitglied_id: number;
  /* Nur für den eltern_kinder-Eintrag, keine Spalte in elternkontakte */
  hauptkontakt?: boolean;
}

export async function insertElternkontakt(sb: SbClient, kontakt: NeuerElternkontakt): Promise<PostgrestError | null> {
  const { hauptkontakt=false, ...elternFelder } = kontakt;
  const mitglied_id = elternFelder.mitglied_id;
  /* ⚠ elternkontakte.mitglied_id ist bigint NOT NULL ohne Default. Bisher
     wurde die Spalte beim Insert herausdestrukturiert und damit weggelassen —
     jeder neue Elternkontakt scheiterte an der NOT-NULL-Verletzung. Sie wird
     jetzt mitgeschrieben, bis die Spalte laut ELTERN_LOGIK.md entfällt. */
  const { data, error } = await sb.from("elternkontakte").insert(elternFelder).select().single();
  if (error) return error;
  if (mitglied_id) {
    const { error: linkError } = await sb.from("eltern_kinder").insert({
      eltern_id: data.id,
      mitglied_id,
      verein_id: elternFelder.verein_id,
      hauptkontakt,
    });
    if (linkError) return linkError;
  }
  return null;
}

export async function updateElternkontakt(sb: SbClient, id: string, fields: TablesUpdate<"elternkontakte">): Promise<PostgrestError | null> {
  const { error } = await sb.from("elternkontakte").update(fields).eq("id", id);
  return error;
}

export async function deleteElternkontakt(sb: SbClient, id: string) {
  return sb.from("elternkontakte").delete().eq("id", id);
}

export async function linkKind(sb: SbClient, elternId: string, mitgliedId: number, vereinId: string, hauptkontakt = false): Promise<PostgrestError | null> {
  const { error } = await sb.from("eltern_kinder").upsert({
    eltern_id: elternId,
    mitglied_id: mitgliedId,
    verein_id: vereinId,
    hauptkontakt,
  }, { onConflict: "eltern_id,mitglied_id,verein_id" });
  return error;
}

export interface UnlinkErgebnis {
  verbleibendeKinder: number;
  kindNochAktiv: boolean;
}

export async function unlinkKind(sb: SbClient, elternId: string, mitgliedId: number): Promise<UnlinkErgebnis> {
  await sb.from("eltern_kinder").delete()
    .eq("eltern_id", elternId)
    .eq("mitglied_id", mitgliedId);
  const { count } = await sb.from("eltern_kinder")
    .select("id", { count: "exact", head: true })
    .eq("eltern_id", elternId);
  const { data: kind } = await sb.from("mitglieder")
    .select("aktiv")
    .eq("id", mitgliedId)
    .maybeSingle();
  return { verbleibendeKinder: count || 0, kindNochAktiv: kind?.aktiv === true };
}

export async function setHauptkontakt(sb: SbClient, mitgliedId: number, elternId: string, _vereinId?: string | null) {
  await sb.from("eltern_kinder").update({ hauptkontakt: false }).eq("mitglied_id", mitgliedId);
  await sb.from("eltern_kinder").update({ hauptkontakt: true })
    .eq("eltern_id", elternId)
    .eq("mitglied_id", mitgliedId);
}

export async function updateBenutzerRolle(sb: SbClient, benutzerId: string, rolle: string) {
  return sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
}

export async function clearHauptkontaktFuerKind(sb: SbClient, elternId: string, mitgliedId: number) {
  return sb.from("eltern_kinder").update({ hauptkontakt: false })
    .eq("eltern_id", elternId).eq("mitglied_id", mitgliedId);
}

export async function unlinkElternBenutzer(sb: SbClient, kontaktId: string) {
  return sb.from("elternkontakte").update({ benutzer_id: null }).eq("id", kontaktId);
}

export async function linkElternBenutzer(sb: SbClient, kontaktId: string, benutzerId: string) {
  return sb.from("elternkontakte").update({ benutzer_id: benutzerId }).eq("id", kontaktId);
}
