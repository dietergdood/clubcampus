/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/memberService.js
   Alle Supabase-Calls für Mitglieder, Notizen, Elternkontakte,
   Kader, Benutzer (Portal-Zugang), Ansichten
   ═══════════════════════════════════════════════════════════════ */

/* ── Mitglieder ── */

export async function fetchMitglied(sb, id) {
  const { data } = await sb.from("mitglieder").select("*").eq("id", id).single();
  return data;
}

export async function updateMitglied(sb, id, fields) {
  return sb.from("mitglieder").update(fields).eq("id", id);
}

export async function deleteMitglied(sb, id) {
  return sb.from("mitglieder").delete().eq("id", id);
}

export async function archiviereMitglied(sb, id, deaktiviertVon) {
  return sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date().toISOString(),
    deaktiviert_von: deaktiviertVon,
  }).in("id", Array.isArray(id) ? id : [id]);
}

export async function reaktiviereMitglied(sb, id) {
  return sb.from("mitglieder").update({
    aktiv: true,
    deaktiviert_am: null,
    deaktiviert_von: null,
  }).eq("id", id);
}

export async function fetchArchiv(sb) {
  const { data } = await sb.from("mitglieder")
    .select("id,vorname,nachname,mitgliedtyp,deaktiviert_am,deaktiviert_von")
    .eq("aktiv", false)
    .order("deaktiviert_am", { ascending: false });
  return data || [];
}

export async function fetchArchivCount(sb) {
  const { count } = await sb.from("mitglieder")
    .select("id", { count: "exact", head: true })
    .eq("aktiv", false);
  return count || 0;
}

/* ── Mitglieder Ansichten ── */

export async function fetchAnsichten(sb, benutzerId) {
  const { data } = await sb.from("mitglieder_ansichten")
    .select("*")
    .eq("benutzer_id", benutzerId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function insertAnsicht(sb, ansicht) {
  const { data } = await sb.from("mitglieder_ansichten").insert(ansicht).select().single();
  return data;
}

export async function deleteAnsicht(sb, id) {
  return sb.from("mitglieder_ansichten").delete().eq("id", id);
}

/* ── Notizen ── */

export async function fetchNotizen(sb, mitgliedId) {
  const { data } = await sb.from("mitglieder_notizen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function insertNotiz(sb, notiz) {
  return sb.from("mitglieder_notizen").insert(notiz);
}

export async function updateNotiz(sb, id, text) {
  return sb.from("mitglieder_notizen").update({
    text,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function deleteNotiz(sb, id) {
  return sb.from("mitglieder_notizen").delete().eq("id", id);
}

/* ── Elternkontakte ── */

export async function fetchElternkontakte(sb, mitgliedId) {
  const { data } = await sb.from("elternkontakte")
    .select("*")
    .eq("mitglied_id", mitgliedId);
  return data || [];
}

export async function fetchAlleElternkontakte(sb, vereinId) {
  const { data } = await sb.from("elternkontakte")
    .select(`
      id, vorname, nachname, name, email, telefon, beziehung,
      benutzer_id, hauptkontakt, mitglied_id,
      mitglieder:mitglied_id (id, vorname, nachname, teams:kader_eintraege(team:teams(id,name,kurz)))
    `)
    .eq("verein_id", vereinId)
    .order("nachname", { ascending: true });
  return data || [];
}

export async function insertElternkontakt(sb, kontakt) {
  const { error } = await sb.from("elternkontakte").insert(kontakt);
  return error;
}

export async function updateElternkontakt(sb, id, fields) {
  const { error } = await sb.from("elternkontakte").update(fields).eq("id", id);
  return error;
}

export async function deleteElternkontakt(sb, id) {
  return sb.from("elternkontakte").delete().eq("id", id);
}

export async function setHauptkontakt(sb, mitgliedId, kontaktId) {
  await sb.from("elternkontakte").update({ hauptkontakt: false }).eq("mitglied_id", mitgliedId);
  await sb.from("elternkontakte").update({ hauptkontakt: true }).eq("id", kontaktId);
}

export async function unlinkElternBenutzer(sb, kontaktId) {
  return sb.from("elternkontakte").update({ benutzer_id: null }).eq("id", kontaktId);
}

export async function linkElternBenutzer(sb, kontaktId, benutzerId) {
  return sb.from("elternkontakte").update({ benutzer_id: benutzerId }).eq("id", kontaktId);
}

/* ── Kader ── */

export async function fetchKaderFuerMitglied(sb, mitgliedId) {
  const { data } = await sb.from("kader")
    .select("*, teams(id,name,kurzname)")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function fetchKaderEintraege(sb, mitgliedId) {
  const { data } = await sb.from("kader")
    .select("team_id, rollen")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function upsertKader(sb, eintrag) {
  return sb.from("kader").upsert(eintrag);
}

export async function updateKader(sb, id, fields) {
  return sb.from("kader").update(fields).eq("id", id);
}

export async function deaktiviereKader(sb, id) {
  return sb.from("kader").update({ aktiv: false }).eq("id", id);
}

/* ── Benutzer (Portal-Zugang) ── */

export async function fetchBenutzerFuerMitglied(sb, mitgliedId) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role,created_at,last_sign_in_at,aktiv")
    .eq("mitglied_id", mitgliedId)
    .maybeSingle();
  return data;
}

export async function fetchBenutzerByEmail(sb, email) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();
  return data;
}

export async function updateBenutzer(sb, id, fields) {
  return sb.from("benutzer").update(fields).eq("id", id);
}

export async function portalZugangAktivieren(sb, mitgliedId, benutzerId, neueRolle) {
  await sb.from("mitglieder").update({ hat_portal_zugang: true }).eq("id", mitgliedId);
  await sb.from("benutzer").update({ mitglied_id: mitgliedId, role: neueRolle }).eq("id", benutzerId);
}

export async function portalZugangDeaktivieren(sb, mitgliedId) {
  await sb.from("mitglieder").update({ hat_portal_zugang: false }).eq("id", mitgliedId);
  await sb.from("benutzer").update({ mitglied_id: null }).eq("mitglied_id", mitgliedId);
}

/* ── Portal Funktionen ── */

export async function fetchPortalFunktionen(sb) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name,farbe)")
    .order("name");
  return data || [];
}

export async function fetchPortalFunktionenMitGruppe(sb) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name)")
    .order("name");
  return data || [];
}

/* ── Teams ── */

export async function fetchAktiveTeams(sb) {
  const { data } = await sb.from("teams")
    .select("id,name,kurzname")
    .eq("aktiv", true)
    .order("name");
  return data || [];
}
