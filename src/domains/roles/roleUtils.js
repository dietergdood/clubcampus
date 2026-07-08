/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/roles/roleUtils.js
   Rollen-Ableitung — eine Wahrheit für alle Module
   War 4x dupliziert: MitgliederModul, KaderModul,
   PortalverwaltungModul, clubcampus.jsx
   ═══════════════════════════════════════════════════════════════ */

/** Priorität der Portal-Rollen (höchste zuerst) */
export const ROLLE_PRIORITAET = [
  "administrator",
  "administration",
  "funktionaer",
  "trainer",
  "spieler",
  "eltern",
  "supporter",
];

/** Label-Mapping für Rollen */
export const ROLLE_LABEL = {
  administrator:  "Administrator",
  administration: "Verwaltung",
  funktionaer:    "Funktionär",
  trainer:        "Trainer/in",
  spieler:        "Spieler/in",
  eltern:         "Elternteil",
  supporter:      "Unterstützer",
};

/**
 * Leitet die Portal-Rolle eines Mitglieds ab.
 * Reihenfolge:
 * 1. Hat Trainer-Kader-Rolle → "trainer"
 * 2. Hat andere Kader-Rolle → höchste nach PRIORITAET
 * 3. Hat standard_rolle im Mitgliedtyp (spieler/trainer) → diese
 * 4. Hat Vereinsfunktionen → "funktionaer"
 * 5. Hat andere standard_rolle → diese
 * 6. Fallback → "supporter"
 *
 * @param {object} sb - Supabase Client
 * @param {number} mitgliedId - ID des Mitglieds
 * @param {Array}  dbKaderRollen - Kader-Rollen aus DB [{name, ist_trainer}]
 * @param {string} mitgliedtyp - Mitgliedtyp-Name
 * @param {Array}  funktionen - Vereinsfunktionen des Mitglieds
 * @returns {Promise<string>} - die abgeleitete Rolle
 */
export async function ableitRolle(sb, mitgliedId, dbKaderRollen = [], mitgliedtyp = null, funktionen = []) {
  if (!sb || !mitgliedId) return "supporter";

  const TRAINER_ROLLEN = dbKaderRollen
    .filter(r => r.ist_trainer)
    .map(r => r.name);

  // Kader-Einträge laden
  const { data: kaderData } = await sb
    .from("kader")
    .select("rollen")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);

  if (kaderData && kaderData.length > 0) {
    const alleRollenNamen = kaderData.flatMap(k => k.rollen || []);
    const hatTrainer = alleRollenNamen.some(r => TRAINER_ROLLEN.includes(r));
    if (hatTrainer) return "trainer";

    // Höchste Kader-Rolle nach Priorität
    const kaderRollenMapped = alleRollenNamen.map(r => {
      const kr = dbKaderRollen.find(k => k.name === r);
      return kr?.ist_trainer ? "trainer" : "spieler";
    });
    const hoechste = ROLLE_PRIORITAET.find(p => kaderRollenMapped.includes(p));
    if (hoechste) return hoechste;
  }

  // Mitgliedtyp standard_rolle (spieler/trainer)
  if (mitgliedtyp) {
    const { data: typData } = await sb
      .from("mitgliedtypen")
      .select("standard_rolle")
      .eq("name", mitgliedtyp)
      .maybeSingle();

    if (typData?.standard_rolle && ["spieler", "trainer"].includes(typData.standard_rolle)) {
      return typData.standard_rolle;
    }

    // Vereinsfunktionen
    if (funktionen && funktionen.length > 0) return "funktionaer";

    // Andere standard_rolle
    if (typData?.standard_rolle) return typData.standard_rolle;
  }

  // Vereinsfunktionen (ohne Mitgliedtyp)
  if (funktionen && funktionen.length > 0) return "funktionaer";

  return "supporter";
}

/**
 * Speichert die abgeleitete Rolle in mitglieder + benutzer Tabelle.
 * @param {object} sb
 * @param {number} mitgliedId
 * @param {string} neueRolle
 */
export async function saveRolle(sb, mitgliedId, neueRolle) {
  if (!sb || !mitgliedId) return;
  await sb.from("mitglieder").update({ rolle: neueRolle }).eq("id", mitgliedId);
  const { data: benutzer } = await sb
    .from("benutzer")
    .select("id")
    .eq("mitglied_id", mitgliedId)
    .maybeSingle();
  if (benutzer?.id) {
    await sb.from("benutzer").update({ role: neueRolle }).eq("id", benutzer.id);
  }
}

/**
 * Leitet Rolle ab und speichert sie direkt.
 * Convenience-Funktion für alle Modul-Aufrufe.
 */
export async function ableitUndSaveRolle(sb, mitgliedId, dbKaderRollen, mitgliedtyp, funktionen) {
  const neueRolle = await ableitRolle(sb, mitgliedId, dbKaderRollen, mitgliedtyp, funktionen);
  await saveRolle(sb, mitgliedId, neueRolle);
  return neueRolle;
}
