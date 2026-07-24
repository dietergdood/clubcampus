/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonAvatar.jsx
   Avatar-Komponente — wiederverwendbar in allen Modulen
   ═══════════════════════════════════════════════════════════════ */
import { Av } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { initials } from "../../domains/person/personUtils.ts";

/**
 * @param {object}   person     - Person-Objekt (name, fotoUrl, vorname, nachname)
 * @param {number}   size       - Avatar-Grösse in px (default: 40)
 * @param {boolean}  canEdit    - Kamera-Overlay anzeigen wenn kein Foto
 * @param {function} onClick    - Klick-Handler (für Foto-Upload)
 * @param {string}   className  - zusätzliche CSS-Klassen
 */
export function PersonAvatar({ person, size = 40, canEdit = false, onClick, className = "" }) {
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
