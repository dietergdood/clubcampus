/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/FilterPanel.tsx
   Panel für die Filter — aus Toolbar.tsx herausgelöst.

   Derselbe Inhalt für Desktop-Dropdown und Mobile-Sheet, gesteuert
   über das mobile-Flag. Gegenstück zu SortPanel.tsx / GroupPanel.tsx.
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.tsx";
import { RangeFilter } from "./RangeFilter.tsx";
import type { RangeValue } from "./RangeFilter.tsx";
import type { FilterChangeHandler, FilterDef, FilterVals } from "./types.ts";

/* filterVals hält je nach Filterart eine Auswahlliste oder einen Bereich.
   Diese beiden Helfer holen die passende Sicht heraus, ohne Cast. */
export function alsListe(v: FilterVals[string]): string[] {
  return Array.isArray(v) ? v : [];
}
export function alsBereich(v: FilterVals[string]): RangeValue {
  return v && !Array.isArray(v) ? v : {};
}

/* Schlüssel aller Filter, die gerade einen Wert haben — diese Sektionen
   werden beim Öffnen des Filtermenüs aufgeklappt. */
export function aktiveSektionen(filterDefs: FilterDef[], filterVals: FilterVals): Set<string> {
  return new Set(filterDefs.filter(({key,type})=>{
    if(type==="range"){const b=alsBereich(filterVals[key]);return b.von!=null||b.bis!=null;}
    return alsListe(filterVals[key]).length>0;
  }).map(({key})=>key));
}

/* Ist überhaupt ein Filter gesetzt? */
export function hatAktivenFilter(filterVals: FilterVals): boolean {
  return Object.values(filterVals).some(v=>{
    if(!v) return false;
    if(Array.isArray(v)) return v.length>0;
    if(typeof v==="object") return v.von!=null||v.bis!=null;
    return false;
  });
}

/* Anzahl gesetzter Filterwerte — Bereiche zählen als einer. */
export function anzahlAktiverFilter(filterVals: FilterVals): number {
  return Object.values(filterVals).reduce<number>((n,v)=>{
    if(!v) return n;
    if(Array.isArray(v)) return n+(v.length||0);
    if(typeof v==="object") return n+((v.von!=null||v.bis!=null)?1:0);
    return n;
  },0);
}

export interface FilterPanelProps {
  filterDefs: FilterDef[];
  filterVals: FilterVals;
  onFilterChange?: FilterChangeHandler | null;
  filterSearch: string;
  setFilterSearch: (q: string) => void;
  openSecs: Set<string>;
  setOpenSecs: (secs: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  mobile?: boolean;
}

export function FilterPanel({ filterDefs, filterVals, onFilterChange, filterSearch, setFilterSearch, openSecs, setOpenSecs, mobile=false }: FilterPanelProps){
  return(
    <>
      <div className="cc-filter-search">
        <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
        <input
          autoFocus={!mobile}
          placeholder="Filtern…"
          value={filterSearch}
          onChange={e=>{
            const q=e.target.value;
            setFilterSearch(q);
            if(q){
              const matching=new Set(filterDefs.filter(({vals,type})=>type!=="range"&&(vals||[]).some(v=>v.toLowerCase().includes(q.toLowerCase()))).map(({key})=>key));
              setOpenSecs(matching);
            } else {
              setOpenSecs(aktiveSektionen(filterDefs,filterVals));
            }
          }}
        />
      </div>
      {filterDefs.map(({key,label="",vals=[],type,min=0,max=0,suffix})=>{
        const q=filterSearch.toLowerCase();
        if(type==="divider") return q?null:<div key={key} className={mobile?"cc-filter-mobile-divider":"cc-filter-divider"}/>;
        if(type==="or-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-or-badge">ODER</span><div className="cc-filter-or-line"/></div>;
        if(type==="und-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-und-badge">UND</span><div className="cc-filter-or-line"/></div>;
        const isRange=type==="range";
        const visVals=isRange?[]:(q?vals.filter(v=>v.toLowerCase().includes(q)):vals);
        if(!isRange&&visVals.length===0) return null;
        if(isRange&&q&&!label.toLowerCase().includes(q)) return null;
        const rv=alsBereich(filterVals[key]);
        const rangeActive=isRange&&(rv.von!=null||rv.bis!=null);
        const selCount=isRange?(rangeActive?1:0):alsListe(filterVals[key]).length;
        if(mobile){
          return(
            <div key={key}>
              <div className="cc-filter-mobile-sec">
                {label}{selCount>0&&<span className="cc-filter-sec-badge" style={{marginLeft:8}}>{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
              </div>
              {isRange?(
                <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange ?? undefined} padLeft={20}/>
              ):(
                visVals.map(v=>{
                  const active=alsListe(filterVals[key]).includes(v);
                  return(
                    <div key={v} className="cc-filter-mobile-item"
                      onMouseDown={e=>{e.stopPropagation();onFilterChange&&onFilterChange(key,v,!active);}}>
                      <input type="checkbox" readOnly checked={active} className="cc-filter-mobile-checkbox"/>
                      <span>{v}</span>
                    </div>
                  );
                })
              )}
            </div>
          );
        }
        const isOpen=openSecs.has(key);
        return(
          <div key={key}>
            <div className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}}
              onClick={()=>setOpenSecs(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;})}>
              <span>{label}</span>
              <span className="cc-row cc-gap-6">
                {selCount>0&&<span className="cc-filter-sec-badge">{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
                <TI n={isOpen?"chevron-down":"chevron-right"} size={13} style={{color:"var(--sub)"}}/>
              </span>
            </div>
            {isOpen&&(isRange?(
              <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange ?? undefined} padLeft={12}/>
            ):(
              <div className="cc-filter-sec-body">
                {visVals.map(v=>{
                  const active=alsListe(filterVals[key]).includes(v);
                  return(
                    <div key={v} className="cc-col-menu-item"
                      onClick={()=>onFilterChange&&onFilterChange(key,v,!active)}>
                      <div className={`cc-col-menu-check${active?" cc-col-menu-check-on":""}`}>{active&&<TI n="check" size={10}/>}</div>
                      {v}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
