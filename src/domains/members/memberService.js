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

export async function fetchAnsichten(sb, benutzerId, typ="mitglieder") {
  const { data } = await sb.from("mitglieder_ansichten")
    .select("*")
    .eq("typ", typ)
    .or(`benutzer_id.eq.${benutzerId},geteilt.eq.true`)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function insertAnsicht(sb, ansicht) {
  const { data, error } = await sb.from("mitglieder_ansichten").insert(ansicht).select().single();
  if (error) console.error("insertAnsicht error:", error);
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

/* ── Elternkontakte (n:m via eltern_kinder) ── */

export async function fetchElternkontakte(sb, mitgliedId) {
  // Alle Elternkontakte für ein Kind via eltern_kinder
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
      eltern_kinder(mitglied_id, hauptkontakt, mitglieder:mitglied_id(id, vorname, nachname))
    `)
    .eq("verein_id", vereinId)
    .order("nachname", { ascending: true });
  if(error) console.error("fetchAlleElternkontakte error:", error);
  return data || [];
}

export async function fetchKinderFuerElternteil(sb, elternId) {
  const { data } = await sb.from("eltern_kinder")
    .select("mitglied_id, hauptkontakt, mitglieder:mitglied_id(id, vorname, nachname, aktiv, mitgliedtyp)")
    .eq("eltern_id", elternId);
  return data || [];
}

export async function insertElternkontakt(sb, kontakt) {
  // kontakt enthält mitglied_id + verein_id — zuerst elternkontakt anlegen, dann verknüpfen
  const { mitglied_id, hauptkontakt=false, ...elternFelder } = kontakt;
  const { data, error } = await sb.from("elternkontakte").insert(elternFelder).select().single();
  if (error) return error;
  // Verknüpfung anlegen
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

export async function linkKind(sb, elternId, mitgliedId, vereinId, hauptkontakt=false) {
  // Kind zu bestehendem Elternteil verknüpfen
  const { error } = await sb.from("eltern_kinder").upsert({
    eltern_id: elternId,
    mitglied_id: mitgliedId,
    verein_id: vereinId,
    hauptkontakt,
  }, { onConflict: "eltern_id,mitglied_id,verein_id" });
  return error;
}

export async function unlinkKind(sb, elternId, mitgliedId) {
  // Kind entknüpfen
  await sb.from("eltern_kinder").delete()
    .eq("eltern_id", elternId)
    .eq("mitglied_id", mitgliedId);
  // Anzahl verbleibender Kinder prüfen
  const { count } = await sb.from("eltern_kinder")
    .select("id", { count: "exact", head: true })
    .eq("eltern_id", elternId);
  // Ist das Kind noch aktiv im Verein?
  const { data: kind } = await sb.from("mitglieder")
    .select("aktiv")
    .eq("id", mitgliedId)
    .maybeSingle();
  return { verbleibendeKinder: count || 0, kindNochAktiv: kind?.aktiv === true };
}

export async function deleteElternkontakt(sb, id) {
  // Löscht Elternkontakt + alle eltern_kinder Einträge (CASCADE)
  return sb.from("elternkontakte").delete().eq("id", id);
}

export async function setHauptkontakt(sb, mitgliedId, elternId, vereinId) {
  // Alle Hauptkontakte für dieses Kind zurücksetzen
  await sb.from("eltern_kinder").update({ hauptkontakt: false }).eq("mitglied_id", mitgliedId);
  // Neuen Hauptkontakt setzen
  await sb.from("eltern_kinder").update({ hauptkontakt: true })
    .eq("eltern_id", elternId)
    .eq("mitglied_id", mitgliedId);
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
  return sb.from("kader").upsert(eintrag, { onConflict: "mitglied_id,team_id,saison" });
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

export async function updateMitglied(sb, id, fields) {
  const { error } = await sb.from("mitglieder").update({
    ...fields,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) console.error("updateMitglied error:", error);
  return !error;
}

export async function updateMitgliedRolle(sb, id, rolle, benutzerId=null) {
  await sb.from("mitglieder").update({ rolle: rolle||null }).eq("id", id);
  if (rolle && benutzerId) {
    await sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
  }
}

export async function updateMitgliedFoto(sb, id, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${id}/foto.${ext}`;
  const { error: upErr } = await sb.storage.from("mitglieder-fotos").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = sb.storage.from("mitglieder-fotos").getPublicUrl(path);
  const { error: dbErr } = await sb.from("mitglieder").update({ foto_url: data.publicUrl + "?t=" + Date.now() }).eq("id", id);
  if (dbErr) throw dbErr;
  return data.publicUrl;
}

export async function deleteMitgliedFoto(sb, id) {
  const { error } = await sb.from("mitglieder").update({ foto_url: null }).eq("id", id);
  if (error) console.error("deleteMitgliedFoto error:", error);
  return !error;
}

export async function fetchBenutzerByMitglied(sb, mitgliedId) {
  const { data } = await sb.from("benutzer").select("id,role").eq("mitglied_id", mitgliedId).maybeSingle();
  return data;
}

export async function insertMitglied(sb, fields, vereinId) {
  const { data, error } = await sb.from("mitglieder").insert({
    ...fields,
    verein_id: vereinId,
    aktiv: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select("id").single();
  if (error) { console.error("insertMitglied error:", error); return null; }
  return data?.id;
}

export async function fetchMitgliedtypPflichtfelder(sb) {
  const { data } = await sb.from("mitgliedtyp_pflichtfelder").select("*");
  return data || [];
}

export const FELD_LABEL = {
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

export async function logAenderung(sb, mitgliedId, vereinId, feld, alterWert, neuerWert, geaendertVon) {
  if (alterWert === neuerWert) return; // Keine Änderung

  const feldLabel = FELD_LABEL[feld] || feld;
  const von = geaendertVon || "Administrator";

  if (alterWert && neuerWert) {
    // Echter Wechsel: Wert A → Wert B → in mitglieder_aenderungen
    await sb.from("mitglieder_aenderungen").insert({
      mitglied_id:   parseInt(mitgliedId),
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

export async function fetchAenderungen(sb, mitgliedId) {
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
};

export async function logAktivitaet(sb, mitgliedId, vereinId, typ, beschreibung, feld=null, wert=null, geaendertVon=null) {
  await sb.from("mitglieder_aktivitaeten").insert({
    mitglied_id:   parseInt(mitgliedId),
    verein_id:     vereinId,
    typ,
    beschreibung,
    feld:          feld || null,
    wert:          wert || null,
    geaendert_von: geaendertVon || null,
  });
}

export async function fetchAktivitaeten(sb, mitgliedId) {
  const { data } = await sb.from("mitglieder_aktivitaeten")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("geaendert_at", { ascending: false })
    .limit(100);
  return data || [];
}
