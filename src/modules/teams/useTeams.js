/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/teams/useTeams.js
   Teams Hook — State + Reload für alle Module
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { fetchTeams } from "./teamService.js";

/**
 * @param {object} sb        - Supabase Client
 * @param {object} options   - { includeStufen, saison, skip }
 * @returns {{ teams, loading, reload }}
 */
export function useTeams(sb, options = {}) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!sb || options.skip) return;
    setLoading(true);
    try {
      const data = await fetchTeams(sb, options);
      setTeams(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [sb, options.saison]);

  return { teams, loading, reload };
}
