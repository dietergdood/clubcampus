/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/season/seasonUtils.js
   Saison-Utilities — nie mehr "2025/26" hardcoden!
   ═══════════════════════════════════════════════════════════════ */

/**
 * Gibt die aktuelle Saison zurück.
 * Fussball-Saison: August–Juli (z.B. Aug 2025 → "2025/26")
 * Anpassbar per saisonStart-Monat (0=Jan, 7=Aug)
 */
export function currentSeason(saisonStartMonat = 7) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  if (month >= saisonStartMonat) {
    return `${year}/${String(year + 1).slice(2)}`;
  }
  return `${year - 1}/${String(year).slice(2)}`;
}

/**
 * Gibt eine Liste der letzten N Saisons zurück.
 * @param {number} n - Anzahl Saisons (default: 5)
 */
export function recentSeasons(n = 5) {
  const current = currentSeason();
  const [startYear] = current.split("/").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const y = startYear - i;
    return `${y}/${String(y + 1).slice(2)}`;
  });
}

/**
 * Formatiert eine Saison für die Anzeige.
 * "2025/26" → "Saison 2025/26"
 */
export function formatSaison(saison) {
  if (!saison) return "—";
  return `Saison ${saison}`;
}
