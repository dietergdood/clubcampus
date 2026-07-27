/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/MoreMenu.tsx
   Desktop-Dropdown des Mehr-Menüs (Aktionen, Ansichten, Export)

   Die Einträge kommen als flache Liste mit Abschnittsköpfen und
   "sep"-Trennern; die Abschnitte sind auf- und zuklappbar.
   ═══════════════════════════════════════════════════════════════ */
import { Fragment, useState } from "react";
import { TI } from "../../icons.tsx";
import type { MoreEntry } from "./types.ts";

export interface MoreMenuProps {
  moreItems: MoreEntry[];
  /* Abschnitte, die beim Öffnen aufgeklappt sind */
  offeneAbschnitte: Set<string>;
  setOffeneAbschnitte: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onClose: () => void;
}

export function MoreMenu({ moreItems, offeneAbschnitte, setOffeneAbschnitte, onClose }: MoreMenuProps) {
  /* Index des Eintrags, dessen subPanel gerade offen ist */
  const [subPanel, setSubPanel] = useState<number | null>(null);

  function toggleAbschnitt(label: string) {
    setOffeneAbschnitte(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });
  }

  let aktuellerAbschnitt: string | null = null;

  return (
    <div className="cc-ml-dropdown cc-ml-more-dropdown">
      {moreItems.map((item, i) => {
        if (item === "sep") return offeneAbschnitte.has(aktuellerAbschnitt as string) ? <div key={i} className="cc-menu-sep"/> : null;

        if (item.header) {
          aktuellerAbschnitt = item.label;
          const offen = offeneAbschnitte.has(item.label);
          return (
            <div key={i} className="cc-ml-dropdown-section-lbl cc-between cc-clickable-plain"
              onClick={() => toggleAbschnitt(item.label)}>
              <span>{item.label}</span>
              <TI n={offen ? "chevron-down" : "chevron-right"} size={12}/>
            </div>
          );
        }

        if (aktuellerAbschnitt !== null && !offeneAbschnitte.has(aktuellerAbschnitt)) return null;
        if (item.hidden) return null;

        if (item.subPanel) return (
          <Fragment key={i}>
            <div className="cc-col-menu-item cc-between"
              onClick={() => setSubPanel(p => p === i ? null : i)}>
              <span className="cc-menu-item-label">{item.icon && <TI n={item.icon} size={14}/>}{item.label}</span>
              <TI n="chevron-right" size={12}/>
            </div>
            {subPanel === i && <div className="cc-ml-more-subpanel">{item.subPanel}</div>}
          </Fragment>
        );

        return (
          <div key={i} className={`cc-col-menu-item cc-between${item.danger ? " cc-menu-item-danger" : ""}`}
            onClick={() => { onClose(); setSubPanel(null); item.onClick?.(); }}>
            <span className="cc-menu-item-label">
              {item.icon && <TI n={item.icon} size={14}/>}{item.label}
            </span>
            {item.onDelete && (
              <button className="cc-icon-btn cc-menu-item-trash"
                onClick={e => { e.stopPropagation(); onClose(); item.onDelete?.(); }}>
                <TI n="trash" size={12}/>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
