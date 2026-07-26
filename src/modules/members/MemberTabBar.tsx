/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberTabBar.tsx
   Tab-Leiste des Mitglieder-Details inkl. "Mehr"-Menü (Desktop-
   Dropdown / Mobile-Sheet). Kapselt die reine Tab-UI samt eigenem
   Öffnen-Zustand — MemberDetail steuert nur activeTab/onTabChange.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../../theme.ts";
import { TI } from "../../icons.tsx";

export interface MemberTab {
  key: string;
  label: string;
  icon?: string;
}

interface MemberTabBarProps {
  tabs: MemberTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

/* Auf Mobile sichtbare Tabs vor dem "Mehr"-Menü */
const MOBILE_VISIBLE = 3;

export function MemberTabBar({ tabs, activeTab, onTabChange }: MemberTabBarProps) {
  const isMobile = useIsMobile();
  const [mehrOpen, setMehrOpen] = useState(false);
  const mehrRef = useRef<HTMLDivElement>(null);

  /* Mehr-Menü schliessen bei Klick ausserhalb */
  useEffect(() => {
    if (!mehrOpen) return;
    const handler = (e: MouseEvent) => { if (mehrRef.current && e.target instanceof Node && !mehrRef.current.contains(e.target)) setMehrOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mehrOpen]);

  const visibleTabs = isMobile ? tabs.slice(0, MOBILE_VISIBLE) : tabs;
  const moreTabs = isMobile ? tabs.slice(MOBILE_VISIBLE) : [];
  const moreActive = moreTabs.some(t => t.key === activeTab);

  return (
    <div className="cc-member-tabs">
      {visibleTabs.map(t => (
        <button
          key={t.key}
          className={`cc-member-tab${activeTab === t.key ? " cc-member-tab-active" : ""}`}
          onClick={() => onTabChange(t.key)}
        >
          {t.icon && <TI n={t.icon} size={13}/>}
          {t.label}
        </button>
      ))}
      {moreTabs.length > 0 && (
        <>
          <div ref={mehrRef} className="cc-mehr-btn-wrap">
            <button
              className={`cc-member-tab${moreActive ? " cc-member-tab-active" : ""}`}
              onClick={() => setMehrOpen(o => !o)}
            >
              <TI n="dots" size={13}/> Mehr
            </button>
            {mehrOpen && !isMobile && (
              <div className="cc-mehr-dropdown">
                {moreTabs.map(t => (
                  <button
                    key={t.key}
                    className={`cc-mehr-item${activeTab === t.key ? " cc-mehr-item-active" : ""}`}
                    onClick={() => { onTabChange(t.key); setMehrOpen(false); }}
                  >
                    {t.icon && <TI n={t.icon} size={14}/>}
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isMobile && mehrOpen && (
            <div className="cc-mehr-sheet-overlay">
              <div className="cc-mehr-sheet-backdrop" onMouseDown={() => setMehrOpen(false)}/>
              <div className="cc-mehr-sheet-box">
                <div className="cc-mehr-sheet-handle"/>
                <div className="cc-mehr-sheet-title">Weitere Tabs</div>
                {moreTabs.map(t => (
                  <button
                    key={t.key}
                    className={`cc-mehr-sheet-item${activeTab === t.key ? " cc-mehr-sheet-item-active" : ""}`}
                    onMouseDown={e => { e.stopPropagation(); onTabChange(t.key); setMehrOpen(false); }}
                  >
                    {t.icon && <TI n={t.icon} size={18}/>}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
