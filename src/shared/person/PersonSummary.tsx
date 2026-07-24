/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonSummary.tsx
   Personen-Zeile — flexibel per Props für alle Module
   Nutzung:
     Kader:      <PersonSummary person={p} subtitle="Trainer/in" right={<Nr>9</Nr>}/>
     Mitglieder: <PersonSummary person={p} subtitle="Juniorenmitglied" right={<StatusBadge/>}/>
     Helfer:     <PersonSummary person={p} subtitle="3 Einsätze"/>
   ═══════════════════════════════════════════════════════════════ */
import type { MouseEventHandler, ReactNode } from "react";
import { PersonAvatar } from "./PersonAvatar.tsx";
import type { PersonAnzeige } from "./types.ts";

interface PersonSummaryProps {
  person?: PersonAnzeige | null;
  /* Sekundäre Info (Rolle, Mitgliedtyp etc.) */
  subtitle?: ReactNode;
  /* Tertiäre Info (E-Mail, Telefon etc.) */
  meta?: ReactNode;
  /* Rechter Slot (Badge, Button, Nummer etc.) */
  right?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  avatarSize?: number;
  className?: string;
}

export function PersonSummary({
  person,
  subtitle,
  meta,
  right,
  onClick,
  avatarSize = 36,
  className = "",
}: PersonSummaryProps) {
  const name = person?.name || `${person?.vorname || ""} ${person?.nachname || ""}`.trim() || "?";

  return (
    <div
      className={`cc-row cc-gap-10 ${onClick ? "cc-clickable" : ""} ${className}`}
      style={{ cursor: onClick ? "pointer" : "default", alignItems: "center" }}
      onClick={onClick}
    >
      <PersonAvatar person={person} size={avatarSize} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cc-text-bold cc-truncate">{name}</div>
        {subtitle && <div className="cc-text-sm cc-text-sub cc-truncate">{subtitle}</div>}
        {meta && <div className="cc-text-sm cc-text-sub cc-truncate" style={{ fontSize: 11 }}>{meta}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

export default PersonSummary;
