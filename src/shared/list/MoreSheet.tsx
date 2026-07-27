/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/MoreSheet.tsx
   Mobile Bottom Sheet der Toolbar

   Zwei Stufen:
     1. Hauptmenü — Aktionen ohne Abschnitt + Einstiege in Ansichten/Export
     2. Unterseite — Filter / Sortieren / Gruppieren als Slot, oder eine
        Abschnittsliste (Ansichten, Export, Aktionen)

   Die drei Panels kommen fertig gerendert als Slots herein, damit das
   Sheet nichts über Filter, Sortierung oder Gruppierung wissen muss.
   ═══════════════════════════════════════════════════════════════ */
import type { ReactNode } from "react";
import { TI } from "../../icons.tsx";
import type { MoreEntry } from "./types.ts";

export type MobileSubMenu = "filter" | "group" | "sort" | "views" | "export" | null;

/* Unterseiten mit eigenem Panel — sie bekommen einen "Fertig"-Knopf,
   die reinen Listen dagegen nicht. */
const PANEL_TITEL: Record<string, string> = { filter: "Filter", sort: "Sortieren", group: "Gruppieren" };
const LISTEN_TITEL: Record<string, string> = { views: "Ansichten", export: "Exportieren" };
/* Abschnittsüberschrift in moreItems je Unterseite */
const LISTEN_ABSCHNITT: Record<string, string> = { views: "Ansichten", export: "Export" };

export interface MoreSheetProps {
  moreItems: MoreEntry[];
  subMenu: MobileSubMenu;
  setSubMenu: (m: MobileSubMenu) => void;
  /* Schliesst das ganze Sheet inklusive Unterseite */
  onClose: () => void;
  /* Fertig gerenderte Panels — null blendet die Unterseite aus */
  panels: { filter?: ReactNode; sort?: ReactNode; group?: ReactNode };
}

export function MoreSheet({ moreItems, subMenu, setSubMenu, onClose, panels }: MoreSheetProps) {
  const hatAbschnitt = (label: string) =>
    moreItems.some(item => item !== "sep" && item.header && item.label === label);

  const panelSlot = subMenu && subMenu in panels ? panels[subMenu as keyof typeof panels] : null;

  return (
    <div className="cc-mehr-sheet-overlay" onClick={onClose}>
      <div className="cc-mehr-sheet-backdrop"/>
      <div className="cc-mehr-sheet-box cc-mehr-sheet-box-flush" onClick={e => e.stopPropagation()}>
        <div className="cc-mehr-sheet-handle cc-mehr-sheet-handle-top"/>

        {subMenu === null ? (
          /* ── Stufe 1: Hauptmenü ── */
          <div>
            {(() => {
              /* Alles vor dem ersten Abschnittskopf sind freie Aktionen */
              let abschnittBegonnen = false;
              return moreItems.map((item, i) => {
                if (item === "sep") return abschnittBegonnen ? null : <div key={i} className="cc-menu-sep cc-menu-sep-sheet"/>;
                if (item.header) { abschnittBegonnen = true; return null; }
                if (abschnittBegonnen) return null;
                return (
                  <button key={i} className="cc-sheet-nav-item"
                    onMouseDown={e => { e.stopPropagation(); onClose(); item.onClick?.(); }}>
                    <span className="cc-sheet-nav-left">{item.icon && <TI n={item.icon} size={18}/>}{item.label}</span>
                  </button>
                );
              });
            })()}

            {hatAbschnitt("Ansichten") && (
              <button className="cc-sheet-nav-item"
                onMouseDown={e => { e.stopPropagation(); setSubMenu("views"); }}>
                <span className="cc-sheet-nav-left"><TI n="bookmark" size={18}/> Ansichten</span>
                <TI n="chevron-right" size={14}/>
              </button>
            )}

            {hatAbschnitt("Export") && (
              <button className="cc-sheet-nav-item"
                onMouseDown={e => { e.stopPropagation(); setSubMenu("export"); }}>
                <span className="cc-sheet-nav-left"><TI n="download" size={18}/> Exportieren</span>
                <TI n="chevron-right" size={14}/>
              </button>
            )}
          </div>
        ) : panelSlot ? (
          /* ── Stufe 2a: Filter / Sortieren / Gruppieren ── */
          <div>
            <div className="cc-sheet-subhdr">
              <button className="cc-icon-btn" onMouseDown={e => { e.stopPropagation(); setSubMenu(null); }}>
                <TI n="chevron-left" size={16}/>
              </button>
              <span className="cc-sheet-subhdr-title">{PANEL_TITEL[subMenu]}</span>
              <button className="cc-ml-dropdown-apply" onMouseDown={e => { e.stopPropagation(); onClose(); }}>Fertig</button>
            </div>
            <div className="cc-sheet-scroll">{panelSlot}</div>
          </div>
        ) : (
          /* ── Stufe 2b: Ansichten / Export / Aktionen ── */
          <div>
            <div className="cc-sheet-subhdr">
              <button className="cc-icon-btn" onMouseDown={e => { e.stopPropagation(); setSubMenu(null); }}>
                <TI n="chevron-left" size={16}/>
              </button>
              <span className="cc-sheet-subhdr-title">{LISTEN_TITEL[subMenu] || "Aktionen"}</span>
              <div className="cc-sheet-subhdr-spacer"/>
            </div>
            <div className="cc-sheet-scroll">
              {(() => {
                const abschnitt = LISTEN_ABSCHNITT[subMenu] || "Aktionen";
                let imAbschnitt = false;
                return moreItems.map((item, i) => {
                  if (item === "sep") { imAbschnitt = false; return null; }
                  if (item.header) { imAbschnitt = item.label === abschnitt; return null; }
                  if (!imAbschnitt) return null;
                  return (
                    <div key={i} className="cc-sheet-list-row">
                      <button className="cc-mehr-sheet-item cc-sheet-list-btn"
                        onMouseDown={e => { e.stopPropagation(); onClose(); item.onClick?.(); }}>
                        <TI n={item.icon || "layout"} size={16}/>{item.label}
                      </button>
                      {item.onDelete && (
                        <button className="cc-sheet-trash"
                          onMouseDown={e => { e.stopPropagation(); onClose(); item.onDelete?.(); }}>
                          <TI n="trash" size={15}/>
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
