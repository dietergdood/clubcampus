/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberUtils.tsx
   Mitglieder-spezifische Helpers
   ═══════════════════════════════════════════════════════════════ */
import type { FieldVisibility } from "../../shared/person/types.ts";

interface RoleInfo {
  label: string;
  level: number;
}

const ROLES: Record<string, RoleInfo> = {
  administrator: { label:"Administrator", level:7 },
  vorstand:      { label:"Vorstand",      level:6 },
  administration:{ label:"Administration",level:5 },
  funktionaer:   { label:"Funktionär",    level:4 },
  trainer:       { label:"Trainer",       level:3 },
  spieler:       { label:"Spieler",       level:2 },
  eltern:        { label:"Eltern",        level:1 },
};

export function getFieldVisibility(role: string): FieldVisibility {
  const lvl = ROLES[role]?.level || 0;
  return {
    showAhv:        lvl >= 5 && role === "administration" || role === "administrator",
    showGebdat:     lvl >= 3,
    showAdresse:    lvl >= 5,
    showTelefon:    lvl >= 3,
    showEmail:      lvl >= 2,
    showPass:       lvl >= 3,
    showFairgateId: lvl >= 5,
    showNotizen:    lvl >= 5,
  };
}
