/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonSummary.jsx
   Personen-Zeile — flexibel per Props für alle Module
   Nutzung:
     Kader:      <PersonSummary person={p} subtitle="Trainer/in" right={<Nr>9</Nr>}/>
     Mitglieder: <PersonSummary person={p} subtitle="Juniorenmitglied" right={<StatusBadge/>}/>
     Helfer:     <PersonSummary person={p} subtitle="3 Einsätze"/>
   ═══════════════════════════════════════════════════════════════ */
import { PersonAvatar } from "./PersonAvatar.jsx";

/**
 * @param {object}    person    - Person-Objekt
 * @param {string}    subtitle  - Sekundäre Info (Rolle, Mitgliedtyp etc.)
 * @param {string}    meta      - Tertiäre Info (Email, Telefon etc.)
 * @param {ReactNode} right     - Rechter Slot (Badge, Button, Nummer etc.)
 * @param {function}  onClick   - Klick-Handler auf die ganze Zeile
 * @param {number}    avatarSize - Avatar-Grösse (default: 36)
 * @param {string}    className  - CSS-Klassen
 */
export function PersonSummary({
  person,
  subtitle,
  meta,
  right,
  onClick,
  avatarSize = 36,
  className = "",
}) {
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
