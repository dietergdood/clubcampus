/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/SortHeader.jsx
   Sortierbarer Tabellen-Header
   ═══════════════════════════════════════════════════════════════ */

export function SortHeader({label, col, sortCol, sortDir, onSort, style={}, className="cc-members-th"}){
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
