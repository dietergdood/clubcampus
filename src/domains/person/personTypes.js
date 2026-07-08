/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personTypes.js
   Normalisiert Supabase-Zeilen zu einheitlichem Person-Objekt
   ═══════════════════════════════════════════════════════════════ */

import { vollname, initials, age } from "./personUtils.js";

/**
 * Normalisiert eine Supabase-Zeile (mitglieder, kader.mitglieder etc.)
 * zu einem einheitlichen Person-Objekt.
 * Alle Module nutzen dieses Format — nie direkt raw.vorname etc.
 */
export function toPerson(raw) {
  if (!raw) return null;
  const m = {
    id:           raw.id,
    vorname:      raw.vorname || raw.firstName || "",
    nachname:     raw.nachname || raw.lastName || "",
    email:        raw.email || "",
    telefon:      raw.telefon || raw.tel || "",
    geburtsdatum: raw.geburtsdatum || raw.dob || null,
    nationalitaet:  raw.nationalitaet || raw.nat || "",
    nationalitaet2: raw.nationalitaet2 || null,
    heimatort:    raw.heimatort || "",
    geschlecht:   raw.geschlecht || null,
    strasse:      raw.strasse || raw.street || "",
    plz:          raw.plz || "",
    ort:          raw.ort || raw.city || "",
    kanton:       raw.kanton || "",
    land:         raw.land || "",
    fotoUrl:      raw.foto_url || raw.avatar_url || null,
    spielerpass:  raw.spielerpass || raw.pass || "",
    jsNr:         raw.js_nr || raw.js || "",
    ahvNr:        raw.ahv_nr || null,
    fairgateId:   raw.fairgate_id || raw.fairgate || "",
    mitgliedtyp:  raw.mitgliedtyp || null,
    rolle:        raw.rolle || null,
    funktionen:   raw.funktionen || [],
    aktiv:        raw.aktiv !== false,
    notizen:      raw.notizen || null,
  };
  // Computed
  m.name     = vollname(m);
  m.initials = initials(m);
  m.age      = age(m.geburtsdatum);
  return m;
}
