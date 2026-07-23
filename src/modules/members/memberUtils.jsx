/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberUtils.jsx
   Mitglieder-spezifische Helpers
   ═══════════════════════════════════════════════════════════════ */
import { Chip } from "../../theme.jsx";

// Re-exports für Rückwärtskompatibilität
export { LAENDER, getLandName } from "../../domains/person/personUtils.js";
export { RolleChip } from "../../shared/person/RolleChip.jsx";

const ROLES = {
  administrator: { label:"Administrator", level:7 },
  vorstand:      { label:"Vorstand",      level:6 },
  administration:{ label:"Administration",level:5 },
  funktionaer:   { label:"Funktionär",    level:4 },
  trainer:       { label:"Trainer",       level:3 },
  spieler:       { label:"Spieler",       level:2 },
  eltern:        { label:"Eltern",        level:1 },
};

export function getFieldVisibility(role) {
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
