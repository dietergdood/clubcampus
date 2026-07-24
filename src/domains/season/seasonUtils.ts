/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/season/seasonUtils.ts
   Saison-Utilities — nie mehr "2025/26" hardcoden!
   ═══════════════════════════════════════════════════════════════ */

export function currentSeason(saisonStartMonat = 7): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= saisonStartMonat) {
    return `${year}/${String(year + 1).slice(2)}`;
  }
  return `${year - 1}/${String(year).slice(2)}`;
}

export function recentSeasons(n = 5): string[] {
  const current = currentSeason();
  const [startYear] = current.split('/').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const y = startYear - i;
    return `${y}/${String(y + 1).slice(2)}`;
  });
}

export function formatSaison(saison: string | null | undefined): string {
  if (!saison) return '—';
  return `Saison ${saison}`;
}
