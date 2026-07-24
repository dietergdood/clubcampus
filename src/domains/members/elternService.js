/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/elternService.js
   Alle Elternkontakt-Funktionen (n:m via eltern_kinder)
   ═══════════════════════════════════════════════════════════════ */

export async function fetchElternkontakte(sb, mitgliedId) {
  const { data } = await sb.from("eltern_kinder")
    .select("hauptkontakt, elternkontakte(*)")
    .eq("mitglied_id", mitgliedId);
  if (!data) return [];
  return data.map(row => ({
    ...row.elternkontakte,
    hauptkontakt: row.hauptkontakt,
    _verknuepfung_id: row.id,
  }));
}

export async function fetchAlleElternkontakte(sb, vereinId) {
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

export async function fetchKinderFuerElternteil(sb, elternId) {
  const { data } = await sb.from("eltern_kinder")
    .select("mitglied_id, hauptkontakt, mitglieder:mitglied_id(id, vorname, nachname, aktiv, mitgliedtyp)")
    .eq("eltern_id", elternId);
  return data || [];
}

export async function sucheElternkontakte(sb, vereinId, query) {
  const q = (query||"").trim().toLowerCase();
  if(!q) return [];
  const { data } = await sb.from("elternkontakte")
    .select("id, vorname, nachname, name, email, beziehung, eltern_kinder(mitglied_id, mitglieder:mitglied_id(id, vorname, nachname))")
    .eq("verein_id", vereinId)
    .or(`vorname.ilike.%${q}%,nachname.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  return data || [];
}

export async function insertElternkontakt(sb, kontakt) {
  const { mitglied_id, hauptkontakt=false, ...elternFelder } = kontakt;
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

export async function updateElternkontakt(sb, id, fields) {
  const { error } = await sb.from("elternkontakte").update(fields).eq("id", id);
  return error;
}

export async function deleteElternkontakt(sb, id) {
  return sb.from("elternkontakte").delete().eq("id", id);
}

export async function linkKind(sb, elternId, mitgliedId, vereinId, hauptkontakt=false) {
  const { error } = await sb.from("eltern_kinder").upsert({
    eltern_id: elternId,
    mitglied_id: mitgliedId,
    verein_id: vereinId,
    hauptkontakt,
  }, { onConflict: "eltern_id,mitglied_id,verein_id" });
  return error;
}

export async function unlinkKind(sb, elternId, mitgliedId) {
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

export async function setHauptkontakt(sb, mitgliedId, elternId, vereinId) {
  await sb.from("eltern_kinder").update({ hauptkontakt: false }).eq("mitglied_id", mitgliedId);
  await sb.from("eltern_kinder").update({ hauptkontakt: true })
    .eq("eltern_id", elternId)
    .eq("mitglied_id", mitgliedId);
}

export async function updateBenutzerRolle(sb, benutzerId, rolle) {
  return sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
}

export async function clearHauptkontaktFuerKind(sb, elternId, mitgliedId) {
  return sb.from("eltern_kinder").update({ hauptkontakt: false })
    .eq("eltern_id", elternId).eq("mitglied_id", mitgliedId);
}

export async function unlinkElternBenutzer(sb, kontaktId) {
  return sb.from("elternkontakte").update({ benutzer_id: null }).eq("id", kontaktId);
}

export async function linkElternBenutzer(sb, kontaktId, benutzerId) {
  return sb.from("elternkontakte").update({ benutzer_id: benutzerId }).eq("id", kontaktId);
}
