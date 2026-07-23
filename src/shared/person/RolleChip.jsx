/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/RolleChip.jsx
   Rolle-Badge — wiederverwendbar in allen Modulen
   ═══════════════════════════════════════════════════════════════ */
import { Chip } from "../../theme.jsx";

export function RolleChip({ rolle }) {
  const colors = {
    "Spieler":       {c:"#22C55E",bg:"#F0FDF4"},
    "Trainer":       {c:"#F97316",bg:"#FFF7ED"},
    "Assistent/in":  {c:"#F97316",bg:"#FFF7ED"},
    "Goalietrainer": {c:"#F97316",bg:"#FFF7ED"},
    "Vorstand":      {c:"#8B5CF6",bg:"#F5F3FF"},
    "Kassier":       {c:"#8B5CF6",bg:"#F5F3FF"},
    "Materialwart":  {c:"#3B82F6",bg:"#EFF6FF"},
    "Platzwart":     {c:"#3B82F6",bg:"#EFF6FF"},
    "Schiedsrichter":{c:"#EC4899",bg:"#FDF2F8"},
    "Elternteil":    {c:"#06B6D4",bg:"#ECFEFF"},
    "Ehrenmitglied": {c:"#f8de09",bg:"#FFFBEB"},
    "Passivmitglied":{c:"#9CA3AF",bg:"#F9FAFB"},
  };
  const s = colors[rolle] || {c:"#9CA3AF",bg:"#F9FAFB"};
  return <Chip text={rolle||"–"} color={s.c} bg={s.bg}/>;
}
