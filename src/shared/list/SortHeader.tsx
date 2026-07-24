/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/SortHeader.tsx
   Sortierbarer Tabellen-Header
   ═══════════════════════════════════════════════════════════════ */
import type { CSSProperties, ReactNode } from "react";

export type SortDir = "asc" | "desc";

interface SortHeaderProps {
  label?: ReactNode;
  col: string;
  sortCol?: string | null;
  sortDir?: SortDir;
  onSort: (col: string) => void;
  style?: CSSProperties;
  className?: string;
}

export function SortHeader({label, col, sortCol, sortDir, onSort, style={}, className="cc-members-th"}: SortHeaderProps){
  const active=sortCol===col;
  return(
    <th
      className={`${className}${active?" cc-members-th-sorted":""}`}
      style={{cursor:"pointer",...style}}
      onClick={()=>onSort(col)}>
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
        {label}
        {active
          ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
          :<span className="cc-sort-hover-icon">↕</span>
        }
      </span>
    </th>
  );
}
