/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/Toolbar.tsx
   Liste Toolbar: Suche, Filter, Gruppierung, Mehr-Menü, Spalten
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { TI } from "../../icons.tsx";
import { useIsMobile } from "../ui/hooks.ts";
import { SortPanel } from "./SortPanel.tsx";
import { GroupPanel } from "./GroupPanel.tsx";
import { FilterPanel, aktiveSektionen, hatAktivenFilter, anzahlAktiverFilter } from "./FilterPanel.tsx";
import { FilterChips } from "./FilterChips.tsx";
import { MoreMenu } from "./MoreMenu.tsx";
import { MoreSheet } from "./MoreSheet.tsx";
import type { MobileSubMenu } from "./MoreSheet.tsx";
import type { FilterChangeHandler, FilterDef, FilterVals, GroupOption, MoreEntry, SortControls } from "./types.ts";

export type { FilterChangeHandler };

export interface ToolbarProps {
  /* Suche — onSearch=null blendet das Suchfeld aus */
  search?: string;
  onSearch?: ((q: string) => void) | null;
  /* Filter */
  filterDefs?: FilterDef[];
  filterVals?: FilterVals;
  onFilterChange?: FilterChangeHandler | null;
  /* Gruppieren */
  groupOptions?: GroupOption[];
  groupOptionsMore?: GroupOption[];
  groupBy?: string | string[];
  onGroupChange?: ((groupBy: string | string[]) => void) | null;
  multiGroup?: boolean;
  /* Stufensortierung — null blendet den Sortieren-Button aus */
  sort?: SortControls | null;
  /* Zähler: jede Erhöhung öffnet das jeweilige Mobile-Panel */
  externalFilterOpen?: number;
  onExternalFilterClose?: (() => void) | null;
  externalGroupOpen?: number;
  onExternalGroupClose?: (() => void) | null;
  /* Mehr-Menu */
  moreItems?: MoreEntry[];
  /* Spalten */
  colMenu?: ReactNode;
  /* Rechter Slot */
  right?: ReactNode;
}

export function Toolbar({
  /* Suche */
  search="", onSearch=null,
  /* Filter */
  filterDefs=[], filterVals={}, onFilterChange=null,
  /* Gruppieren */
  groupOptions=[], groupOptionsMore=[], groupBy="none", onGroupChange=null, multiGroup=false,
  /* Sortieren */
  sort=null,
  externalFilterOpen=0, onExternalFilterClose=null,
  externalGroupOpen=0, onExternalGroupClose=null,
  /* Mehr-Menu */
  moreItems=[],
  /* Spalten */
  colMenu=null,
  /* Rechter Slot */
  right=null,
}: ToolbarProps){
  const isMobile=useIsMobile();
  const [filterOpen,setFilterOpen]=useState(false);
  const [filterSearch,setFilterSearch]=useState("");
  const [openSecs,setOpenSecs]=useState<Set<string>>(new Set());
  const [groupOpen,setGroupOpen]=useState(false);
  const [sortOpen,setSortOpen]=useState(false);
  useEffect(()=>{if(externalFilterOpen>0){setFilterOpen(true);setGroupOpen(false);setMoreOpen(false);}},[externalFilterOpen]);
  useEffect(()=>{if(externalGroupOpen>0){setGroupOpen(true);setFilterOpen(false);setMoreOpen(false);}},[externalGroupOpen]);
  const [moreOpen,setMoreOpen]=useState(false);
  const [openMoreSections,setOpenMoreSections]=useState<Set<string>>(new Set());
  const [mobileSubMenu,setMobileSubMenu]=useState<MobileSubMenu>(null);
  const filterRef=useRef<HTMLDivElement>(null);
  const groupRef=useRef<HTMLDivElement>(null);
  const sortRef=useRef<HTMLDivElement>(null);
  const moreRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(filterOpen){
      setFilterSearch("");
      setOpenSecs(aktiveSektionen(filterDefs,filterVals));
    }
  },[filterOpen]);
  useEffect(()=>{
    if(!filterOpen){onExternalFilterClose&&onExternalFilterClose(); return;}
    const h=(e: MouseEvent)=>{if(filterRef.current&&e.target instanceof Node&&!filterRef.current.contains(e.target))setFilterOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[filterOpen]);
  useEffect(()=>{
    if(!groupOpen) return;
    const h=(e: MouseEvent)=>{if(groupRef.current&&e.target instanceof Node&&!groupRef.current.contains(e.target))setGroupOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[groupOpen]);
  useEffect(()=>{
    if(!sortOpen) return;
    const h=(e: MouseEvent)=>{if(sortRef.current&&e.target instanceof Node&&!sortRef.current.contains(e.target))setSortOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[sortOpen]);
  useEffect(()=>{
    if(!moreOpen||isMobile) return;
    const h=(e: MouseEvent)=>{if(moreRef.current&&e.target instanceof Node&&!moreRef.current.contains(e.target))setMoreOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[moreOpen,isMobile]);

  const hasActiveFilter=hatAktivenFilter(filterVals);
  const activeFilterCount=anzahlAktiverFilter(filterVals);
  const groupByArr=Array.isArray(groupBy)?groupBy:[groupBy];
  const isGrouped=groupByArr.some(g=>g&&g!=="none");
  /* Eine Ebene ist der Normalfall — akzentuiert wird erst ab der zweiten */
  const sortEbenen=(sort?.sortDefs||[]).filter(d=>d.key);
  const istMehrstufig=sortEbenen.length>1;

  const accentStyle={background:"var(--cc-accent,#FEC604)",borderColor:"var(--cc-accent,#FEC604)",color:"var(--cc-accent-text,#000)"};
  /* Was GroupPanel braucht — an allen drei Einsatzorten identisch */
  const groupPanelProps={groupOptions,groupOptionsMore,groupBy,multiGroup,onGroupChange};
  /* Was FilterPanel braucht — Desktop-Dropdown und Sheet teilen den State */
  const filterPanelProps={filterDefs,filterVals,onFilterChange,filterSearch,setFilterSearch,openSecs,setOpenSecs};

  function closeSheet(){ setMoreOpen(false); setMobileSubMenu(null); }

  return(
    <div>
      <div className="cc-ml-toolbar">
        {/* Suche */}
        {onSearch!==null&&(
          <div className="cc-ml-srch-wrap">
            <div className="cc-ml-srch">
              <TI n="search" size={15} className="cc-input-icon"/>
              <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Suchen…"/>
            </div>
            {search&&<div className="cc-search-hint">Suche über alle Felder — auch ausgeblendete Spalten</div>}
          </div>
        )}

        {/* Filter */}
        {filterDefs.length>0&&(
          <div ref={filterRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={hasActiveFilter?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setFilterSearch("");setOpenSecs(aktiveSektionen(filterDefs,filterVals));setMoreOpen(true);setMobileSubMenu("filter");}
                else{setFilterOpen(o=>!o);setGroupOpen(false);setSortOpen(false);setMoreOpen(false);}
              }}>
              <TI n="filter" size={15}/>
              {!isMobile&&"Filter"}
              {hasActiveFilter&&<span className="cc-ml-filter-badge">{activeFilterCount}</span>}
            </button>
            {filterOpen&&!isMobile&&(
                <div className="cc-ml-dropdown cc-ml-filter-dropdown">
                  <div className="cc-filter-footer">
                    <button className="cc-ml-dropdown-clear" onClick={()=>onFilterChange&&onFilterChange("__reset")}>Zurücksetzen</button>
                    <button className="cc-ml-dropdown-apply" onClick={()=>setFilterOpen(false)}>Fertig</button>
                  </div>
                  <FilterPanel {...filterPanelProps}/>
                </div>
            )}
          </div>
        )}

        {/* Gruppieren */}
        {groupOptions.length>0&&(
          <div ref={groupRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={isGrouped?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setMoreOpen(true);setMobileSubMenu("group");}
                else{setGroupOpen(o=>!o);setFilterOpen(false);setSortOpen(false);setMoreOpen(false);}
              }}>
              <TI n="layout-rows" size={15}/>
              {!isMobile&&"Gruppieren"}
              {isGrouped&&!isMobile&&<span className="cc-ml-filter-badge">{groupByArr.filter(g=>g&&g!=="none").length}</span>}
            </button>
            {groupOpen&&(
              isMobile?(
                <div className="cc-mehr-sheet-overlay" onClick={()=>setGroupOpen(false)}>
                  <div className="cc-mehr-sheet-backdrop"/>
                  <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                    <div className="cc-mehr-sheet-handle"/>
                    <div className="cc-mehr-sheet-title">Gruppieren nach</div>
                    <GroupPanel {...groupPanelProps} mobile onDone={()=>setGroupOpen(false)}/>
                  </div>
                </div>
              ):(
                <div className="cc-ml-dropdown cc-ml-group-dropdown" style={{minWidth:240}}>
                  <GroupPanel {...groupPanelProps} onDone={()=>setGroupOpen(false)}/>
                </div>
              )
            )}
          </div>
        )}

        {/* Sortieren */}
        {sort&&(
          <div ref={sortRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={istMehrstufig?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setMoreOpen(true);setMobileSubMenu("sort");}
                else{setSortOpen(o=>!o);setFilterOpen(false);setGroupOpen(false);setMoreOpen(false);}
              }}>
              <TI n="arrows-sort" size={15}/>
              {!isMobile&&"Sortieren"}
              {istMehrstufig&&!isMobile&&<span className="cc-ml-filter-badge">{sortEbenen.length}</span>}
            </button>
            {sortOpen&&!isMobile&&(
              <div className="cc-ml-dropdown cc-ml-group-dropdown" style={{minWidth:260}}>
                <SortPanel {...sort} onDone={()=>setSortOpen(false)}/>
              </div>
            )}
          </div>
        )}

        {/* Separator vor Mehr/Spalten */}


        {/* Spalten-Slot */}
        {colMenu&&<div className="cc-ml-dropdown-wrap">{colMenu}</div>}

        {/* Mehr-Menu */}
        {moreItems.length>0&&(
          <div ref={moreRef} className="cc-ml-dropdown-wrap">
            <button className="cc-ml-btn"
              onClick={()=>{setMoreOpen(o=>{const next=!o;if(next)setOpenMoreSections(new Set(["Aktionen"]));return next;});setFilterOpen(false);setGroupOpen(false);setSortOpen(false);setMobileSubMenu(null);}}>
              <TI n="dots" size={15}/>
            </button>
            {moreOpen&&(
              isMobile?(
                <MoreSheet
                  moreItems={moreItems}
                  subMenu={mobileSubMenu}
                  setSubMenu={setMobileSubMenu}
                  onClose={closeSheet}
                  panels={{
                    filter:(
                      <>
                        <FilterPanel {...filterPanelProps} mobile/>
                        {hasActiveFilter&&(
                          <div className="cc-filter-mobile-footer">
                            <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onFilterChange&&onFilterChange("__reset");}}>Alle Filter zurücksetzen</button>
                          </div>
                        )}
                      </>
                    ),
                    sort: sort?<SortPanel {...sort} mobile onDone={closeSheet}/>:undefined,
                    group:<GroupPanel {...groupPanelProps} mobile onDone={closeSheet}/>,
                  }}
                />
              ):(
                <MoreMenu
                  moreItems={moreItems}
                  offeneAbschnitte={openMoreSections}
                  setOffeneAbschnitte={setOpenMoreSections}
                  onClose={()=>setMoreOpen(false)}
                />
              )
            )}
          </div>
        )}

        {/* Rechter Slot */}
        {right&&<><div className="cc-ml-sep"/>{right}</>}
      </div>

      {/* Aktive Filter Chips */}
      {hasActiveFilter&&(
        <FilterChips filterDefs={filterDefs} filterVals={filterVals} onFilterChange={onFilterChange}/>
      )}
    </div>
  );
}


// ColMenuContent, ColMenuButton, BulkBar, ConfirmDialog, useConfirm → shared/
// COMPONENT_REGISTRY → shared/componentRegistry.js



// PhoneInput, useAddrSearch, usePlzLookup → shared/forms/
// RollenAuswahlListe, InlineField → shared/forms/
// PortalBadge → shared/list/PortalBadge.tsx

// DpBadge → shared/list/PortalBadge.tsx

