/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/PortalBadge.jsx
   Portal-Zugang und Datenprüfungs-Status Badges
   ═══════════════════════════════════════════════════════════════ */

export function PortalBadge({val}){
  if(val==="Aktiv") return <span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>;
  if(val==="Deaktiviert") return <span className="cc-portal-status cc-portal-status-deaktiviert"><span className="cc-portal-dot"/> Deaktiviert</span>;
  return <span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>;
}

export function DpBadge({val}){
  if(val==="Geprueft") return <span className="cc-dp-status cc-dp-status-ok"><span className="cc-dp-dot"/> Geprüft</span>;
  if(val==="Ausstehend") return <span className="cc-dp-status cc-dp-status-warn"><span className="cc-dp-dot"/> Ausstehend</span>;
  return <span className="cc-dp-status cc-dp-status-err"><span className="cc-dp-dot"/> {val||"Unbekannt"}</span>;
}
