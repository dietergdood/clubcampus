/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/FilterChips.tsx
   Zeile mit den aktiven Filtern unter der Toolbar
   ═══════════════════════════════════════════════════════════════ */
import type { ReactNode } from "react";
import type { FilterChangeHandler, FilterDef, FilterVals } from "./types.ts";

/* Filter, die untereinander ODER-verknüpft sind — zwischen ihren Chips
   erscheint ein "oder" statt des impliziten UND. */
const ODER_GRUPPEN = [["kaderrollen","funktionen"],["teams","funktionsgruppen"]];

export interface FilterChipsProps {
  filterDefs: FilterDef[];
  filterVals: FilterVals;
  onFilterChange?: FilterChangeHandler | null;
}

export function FilterChips({ filterDefs, filterVals, onFilterChange }: FilterChipsProps) {
  const chips: ReactNode[] = [];
  let letzteGruppe: string[] | null = null;

  Object.entries(filterVals).forEach(([k,vals])=>{
    if(!vals) return;
    /* Bereichsfilter: ein Chip mit von–bis, Klick löscht den Bereich */
    if(typeof vals==="object"&&!Array.isArray(vals)){
      if(vals.von==null&&vals.bis==null) return;
      const def=filterDefs.find(d=>d.key===k);
      const label=def?def.label:k;
      const display=`${label}: ${vals.von??def?.min??''}–${vals.bis??def?.max??''}${def?.suffix||''}`;
      chips.push(
        <div key={k} className="cc-ml-chip"
          onClick={()=>onFilterChange&&onFilterChange("__range",{rangeKey:k,von:null,bis:null})}>
          {display} <span className="cc-ml-chip-x">×</span>
        </div>
      );
      return;
    }
    const gruppe=ODER_GRUPPEN.find(g=>g.includes(k));
    if(gruppe&&letzteGruppe&&gruppe===letzteGruppe){
      chips.push(<span key={k+"_or"} className="cc-ml-chip-or">oder</span>);
    }
    letzteGruppe=gruppe||null;
    (vals||[]).forEach(v=>{
      chips.push(
        <div key={k+v} className="cc-ml-chip" onClick={()=>onFilterChange&&onFilterChange(k,v,false)}>
          {v} <span className="cc-ml-chip-x">×</span>
        </div>
      );
    });
  });

  return (
    <div className="cc-ml-chips cc-ml-chips-row">
      <div className="cc-ml-chips-list">{chips}</div>
      <button className="cc-ml-dropdown-clear cc-ml-chips-clear"
        onClick={()=>onFilterChange&&onFilterChange("__reset")}>Zurücksetzen</button>
    </div>
  );
}
