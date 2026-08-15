/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/useSpiele.ts
   Laden von Spielplan und Rangliste für die Anzeige.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { fetchSpiele, fetchRanglisten } from "./spielService.ts";
import { mapSpiel, sortiereSpiele, gruppeFuerTeam, mapRangliste } from "./spielMapper.ts";
import type { SpielUi, TabellenZeile } from "./spielMapper.ts";
import type { Sb } from "../../types.ts";

export function useSpiele(sb: Sb, vereinId: string | null, team?: string | null) {
  const [spiele, setSpiele] = useState<SpielUi[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      setLaedt(true);
      const zeilen = await fetchSpiele(sb, vereinId, team ?? null);
      if (abgebrochen) return;
      setSpiele(sortiereSpiele(zeilen.map(mapSpiel)));
      setLaedt(false);
    })();
    return () => { abgebrochen = true; };
  }, [sb, vereinId, team]);

  return { spiele, laedt };
}

export function useRangliste(sb: Sb, vereinId: string | null, sfvTeamId: number | null) {
  const [zeilen, setZeilen] = useState<TabellenZeile[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      setLaedt(true);
      const alle = await fetchRanglisten(sb, vereinId);
      if (abgebrochen) return;
      setZeilen(mapRangliste(gruppeFuerTeam(alle, sfvTeamId), sfvTeamId));
      setLaedt(false);
    })();
    return () => { abgebrochen = true; };
  }, [sb, vereinId, sfvTeamId]);

  return { zeilen, laedt };
}
