/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonAvatar.tsx
   Avatar-Komponente — wiederverwendbar in allen Modulen
   ═══════════════════════════════════════════════════════════════ */
import type { MouseEventHandler } from "react";
import { Av } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import type { PersonAnzeige } from "./types.ts";

interface PersonAvatarProps {
  person?: PersonAnzeige | null;
  /* Avatar-Grösse in px */
  size?: number;
  /* Kamera-Overlay anzeigen, wenn kein Foto hinterlegt ist */
  canEdit?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export function PersonAvatar({ person, size = 40, canEdit = false, onClick, className = "" }: PersonAvatarProps) {
  const name = person?.name || (person ? `${person.vorname || ""} ${person.nachname || ""}`.trim() : "?");
  const fotoUrl = person?.fotoUrl || person?.foto_url;

  return (
    <div
      className={`cc-hero-av-wrap cc-hero-av-hoverable ${className}`}
      style={{ width: size, height: size, cursor: canEdit ? "pointer" : "default" }}
      onClick={canEdit ? onClick : undefined}
    >
      {fotoUrl
        ? <img src={fotoUrl} className="cc-hero-av-img" alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
        : <Av name={name} size={size} />
      }
      {canEdit && !fotoUrl && (
        <div className="cc-hero-av-cam-overlay">
          <TI n="camera" size={Math.round(size * 0.35)} />
        </div>
      )}
    </div>
  );
}

export default PersonAvatar;
