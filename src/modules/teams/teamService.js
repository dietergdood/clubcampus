/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/teams/teamService.js
   Teams Service — alle sb.from("teams") Aufrufe zentralisiert
   ═══════════════════════════════════════════════════════════════ */

/**
 * Alle aktiven Teams laden
 */
export async function fetchTeams(sb, options = {}) {
  if (!sb) return [];
  const { includeStufen = false, saison = null } = options;

  let query = sb
    .from("teams")
    .select(includeStufen ? "*, team_stufen(id,name,ebene)" : "*")
    .eq("aktiv", true)
    .order("hauptbereich")
    .order("name");

  if (saison) query = query.eq("saison", saison);

  const { data, error } = await query;
  if (error) { console.error("fetchTeams:", error); return []; }
  return data || [];
}

/**
 * Ein Team laden
 */
export async function fetchTeam(sb, teamId) {
  if (!sb || !teamId) return null;
  const { data } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  return data;
}

/**
 * Team erstellen
 */
export async function createTeam(sb, teamData) {
  if (!sb) return null;
  const { data, error } = await sb
    .from("teams")
    .insert({ ...teamData, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Team aktualisieren
 */
export async function updateTeam(sb, teamId, teamData) {
  if (!sb || !teamId) return;
  const { error } = await sb
    .from("teams")
    .update({ ...teamData, updated_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}

/**
 * Team deaktivieren (soft delete)
 */
export async function deactivateTeam(sb, teamId) {
  if (!sb || !teamId) return;
  const { error } = await sb
    .from("teams")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}

/**
 * Team-Modul togglen
 */
export async function toggleTeamModul(sb, teamId, modul, aktiv) {
  if (!sb) return;
  const { error } = await sb
    .from("team_module")
    .upsert({ team_id: teamId, modul, aktiv }, { onConflict: "team_id,modul" });
  if (error) throw error;
}

/**
 * Saison für alle Teams setzen
 */
export async function setTeamsSaison(sb, saison) {
  if (!sb) return;
  const { error } = await sb
    .from("teams")
    .update({ saison, updated_at: new Date().toISOString() })
    .neq("id", 0);
  if (error) throw error;
}

/**
 * Team-Stufen laden
 */
export async function fetchTeamStufen(sb) {
  if (!sb) return [];
  const { data } = await sb
    .from("team_stufen")
    .select("*")
    .order("ebene")
    .order("sortorder");
  return data || [];
}
