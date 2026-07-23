/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberKPIs.jsx
   KPI-Cards + Aufschlüsselung für MitgliederModul
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { Stat, useIsMobile } from "../../theme.jsx";
import { GN, AM, BL } from "../../constants.js";

export function MemberKPIs({ allMembers, dbMitgliedtypen, onFilter }) {
  const isMobile = useIsMobile();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const breakdownRef = useRef(null);

  useEffect(() => {
    if (!breakdownOpen || isMobile) return;
    const h = e => { if (breakdownRef.current && !breakdownRef.current.contains(e.target)) setBreakdownOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [breakdownOpen, isMobile]);

  const totalCount    = allMembers.length;
  const portalAktiv   = allMembers.filter(m => m.hat_portal_zugang).length;
  const dpOffen       = allMembers.filter(m => m.datenpruefung !== "Geprueft").length;
  const ohneTeam      = allMembers.filter(m => (m.teams||[]).length === 0).length;
  const trainerCount  = allMembers.filter(m => (m.rollen||[]).some(r => r.toLowerCase().includes("trainer"))).length;
  const funktionaerCount = allMembers.filter(m => (m.rollen||[]).some(r => r.toLowerCase().includes("funktion"))).length;

  const mitgliedTypen = (dbMitgliedtypen||[]).length > 0
    ? dbMitgliedtypen.map(t => t.name)
    : [...new Set(allMembers.map(m => m.mitgliedschaft).filter(v => v && v !== "-"))].sort();

  const BREAKDOWN = [
    ...mitgliedTypen.map(typ => ({label:typ, key:typ})),
    {label:"Trainer/innen",    key:"__trainer"},
    {label:"Funktionär/innen", key:"__funktionaer"},
  ];

  function bdCount(b) {
    if (b.key === "__trainer")    return trainerCount;
    if (b.key === "__funktionaer") return funktionaerCount;
    return allMembers.filter(m => m.mitgliedschaft === b.key).length;
  }

  function bdFilter(b) {
    const vals = b.key === "__trainer"    ? {rollen:["Trainer/in"]} :
                 b.key === "__funktionaer" ? {rollen:["Funktionär"]} :
                 {mitgliedschaft:[b.key]};
    if (onFilter) onFilter(vals);
    setBreakdownOpen(false);
  }

  return (
    <div className="cc-grid-stats cc-mb-20">
      <div ref={breakdownRef} style={{position:"relative"}}>
        <Stat label="Mitglieder" value={totalCount} color={BL} onClick={() => setBreakdownOpen(o => !o)}/>
        {breakdownOpen && (
          isMobile ? (
            <div className="cc-mehr-sheet-overlay" onClick={() => setBreakdownOpen(false)}>
              <div className="cc-mehr-sheet-backdrop"/>
              <div className="cc-mehr-sheet-box" onClick={e => e.stopPropagation()}>
                <div className="cc-mehr-sheet-handle"/>
                <div className="cc-mehr-sheet-title">Aufschlüsselung</div>
                {BREAKDOWN.map(b => (
                  <button key={b.key} className="cc-mehr-sheet-item" onMouseDown={e=>{e.stopPropagation();bdFilter(b);}}>
                    <span className="cc-kpi-breakdown-label">{b.label}</span>
                    <span className="cc-kpi-breakdown-value">{bdCount(b)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cc-breakdown-popover">
              <div className="cc-breakdown-popover-title">Aufschlüsselung</div>
              {BREAKDOWN.map(b => (
                <button key={b.key} className="cc-breakdown-popover-item" onClick={() => bdFilter(b)}>
                  <span>{b.label}</span>
                  <span className="cc-kpi-breakdown-value">{bdCount(b)}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
      <Stat label="Portal aktiv"   value={portalAktiv} color={GN}/>
      <Stat label="Prüfung offen"  value={dpOffen}     color={AM}/>
      <Stat label="Ohne Team"      value={ohneTeam}    color={AM}/>
    </div>
  );
}
