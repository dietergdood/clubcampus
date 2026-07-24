/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/Toolbar.jsx
   Liste Toolbar: Suche, Filter, Gruppierung, Mehr-Menü, Spalten
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { TI } from "../../icons.jsx";
import { FONT } from "../../constants.js";
import { useIsMobile } from "../ui/hooks.jsx";
import { RangeFilter } from "./RangeFilter.jsx";

export function Toolbar({
  /* Suche */
  search="", onSearch=null,
  /* Filter */
  filterDefs=[], filterVals={}, onFilterChange=null,
  /* Gruppieren */
  groupOptions=[], groupOptionsMore=[], groupBy="none", onGroupChange=null, multiGroup=false,
  externalFilterOpen=false, onExternalFilterClose=null,
  externalGroupOpen=false, onExternalGroupClose=null,
  /* Mehr-Menu */
  moreItems=[],
  /* Spalten */
  colMenu=null,
  /* Rechter Slot */
  right=null,
}){
  const isMobile=useIsMobile();
  const [filterOpen,setFilterOpen]=useState(false);
  const [filterSearch,setFilterSearch]=useState("");
  const [openSecs,setOpenSecs]=useState(new Set());
  const [groupOpen,setGroupOpen]=useState(false);
  useEffect(()=>{if(externalFilterOpen>0){setFilterOpen(true);setGroupOpen(false);setMoreOpen(false);}},[externalFilterOpen]);
  useEffect(()=>{if(externalGroupOpen>0){setGroupOpen(true);setFilterOpen(false);setMoreOpen(false);}},[externalGroupOpen]);
  const [moreOpen,setMoreOpen]=useState(false);
  const [moreSubPanel,setMoreSubPanel]=useState(null);
  const [groupMoreOpen,setGroupMoreOpen]=useState(false);
  const [openMoreSections,setOpenMoreSections]=useState(new Set());
  const [dragGroup,setDragGroup]=useState(null);
  const [dragOverGroup,setDragOverGroup]=useState(null);
  const [mobileGroupPicker,setMobileGroupPicker]=useState(null); // index of level being picked
  const [mobileSubMenu,setMobileSubMenu]=useState(null); // null | "filter" | "group" | "views" | "export"
  const filterRef=useRef(null);
  const groupRef=useRef(null);
  const moreRef=useRef(null);
  useEffect(()=>{
    if(filterOpen){
      setFilterSearch("");
      setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
    }
  },[filterOpen]);
  useEffect(()=>{
    if(!filterOpen){onExternalFilterClose&&onExternalFilterClose(); return;}
    const h=e=>{if(filterRef.current&&!filterRef.current.contains(e.target))setFilterOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[filterOpen]);
  useEffect(()=>{
    if(!groupOpen) return;
    const h=e=>{if(groupRef.current&&!groupRef.current.contains(e.target))setGroupOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[groupOpen]);
  useEffect(()=>{
    if(!moreOpen||isMobile) return;
    const h=e=>{if(moreRef.current&&!moreRef.current.contains(e.target))setMoreOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[moreOpen,isMobile]);

  const hasActiveFilter=Object.values(filterVals).some(v=>{if(!v) return false; if(Array.isArray(v)) return v.length>0; if(typeof v==="object") return v.von!=null||v.bis!=null; return false;});
  const activeFilterCount=Object.values(filterVals).reduce((n,v)=>{if(!v) return n; if(Array.isArray(v)) return n+(v.length||0); if(typeof v==="object") return n+((v.von!=null||v.bis!=null)?1:0); return n;},0);
  const groupByArr=Array.isArray(groupBy)?groupBy:[groupBy];
  const isGrouped=groupByArr.some(g=>g&&g!=="none");

  const accentStyle={background:"var(--cc-accent,#FEC604)",borderColor:"var(--cc-accent,#FEC604)",color:"var(--cc-accent-text,#000)"};
  const isGroupActive=v=>groupByArr.includes(v);
  function toggleGroup(val){
    if(!onGroupChange) return;
    if(!multiGroup){ onGroupChange(val==="none"?"none":val); return; }
    if(val==="none"){ onGroupChange(["none"]); return; }
    const curr=groupByArr.filter(g=>g&&g!=="none");
    if(curr.includes(val)) onGroupChange(curr.filter(g=>g!==val).length>0?curr.filter(g=>g!==val):["none"]);
    else onGroupChange([...curr,val]);
  }

  return(
    <div>
      <div className="cc-ml-toolbar">
        {/* Suche */}
        {onSearch!==null&&(
          <div className="cc-ml-srch">
            <TI n="search" size={15} className="cc-input-icon"/>
            <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Suchen…"/>
          </div>
        )}

        {/* Filter */}
        {filterDefs.length>0&&(
          <div ref={filterRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={hasActiveFilter?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setFilterSearch("");setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));setMoreOpen(true);setMobileSubMenu("filter");}
                else{setFilterOpen(o=>!o);setGroupOpen(false);setMoreOpen(false);}
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
                  <div className="cc-filter-search">
                    <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                    <input
                      autoFocus
                      placeholder="Filtern…"
                      value={filterSearch}
                      onChange={e=>{
                        const q=e.target.value;
                        setFilterSearch(q);
                        if(q){
                          const matching=new Set(filterDefs.filter(({vals,type})=>type!=="range"&&(vals||[]).some(v=>v.toLowerCase().includes(q.toLowerCase()))).map(({key})=>key));
                          setOpenSecs(matching);
                        } else {
                          setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
                        }
                      }}
                    />
                  </div>
                  {filterDefs.map(({key,label,vals,type,min,max,suffix})=>{
                    const q=filterSearch.toLowerCase();
                    if(type==="divider") return q?null:<div key={key} className="cc-filter-divider"/>;
                    if(type==="or-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-or-badge">ODER</span><div className="cc-filter-or-line"/></div>;
                    if(type==="und-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-und-badge">UND</span><div className="cc-filter-or-line"/></div>;
                    const isRange=type==="range";
                    const visVals=isRange?[]:(q?vals.filter(v=>v.toLowerCase().includes(q)):vals);
                    if(!isRange&&visVals.length===0) return null;
                    if(isRange&&q&&!label.toLowerCase().includes(q)) return null;
                    const isOpen=openSecs.has(key);
                    const rv=filterVals[key]||{};
                    const rangeActive=isRange&&(rv.von!=null||rv.bis!=null);
                    const selCount=isRange?(rangeActive?1:0):(filterVals[key]||[]).length;
                    return(
                      <div key={key}>
                        <div className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}} onClick={()=>setOpenSecs(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;})}>
                          <span>{label}</span>
                          <span className="cc-row cc-gap-6">
                            {selCount>0&&<span className="cc-filter-sec-badge">{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
                            <TI n={isOpen?"chevron-down":"chevron-right"} size={13} style={{color:"var(--sub)"}}/>
                          </span>
                        </div>
                        {isOpen&&(isRange?(
                          <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange} padLeft={12}/>
                        ):(
                          <div className="cc-filter-sec-body">
                            {visVals.map(v=>{
                              const active=(filterVals[key]||[]).includes(v);
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
                else{setGroupOpen(o=>!o);setFilterOpen(false);setMoreOpen(false);}
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
                    <div style={{display:"flex",justifyContent:"space-between",padding:"0 16px 12px",borderBottom:"0.5px solid var(--border)",marginBottom:4}}>
                      <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onGroupChange&&onGroupChange(["none"]);setGroupOpen(false);}}>Zurücksetzen</button>
                      <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setGroupOpen(false);}}>Fertig</button>
                    </div>
                    {groupOptions.map(o=>(
                      <div key={o.val} className="cc-mehr-sheet-item"
                        style={{fontWeight:isGroupActive(o.val)?600:400,color:isGroupActive(o.val)?"var(--cc-accent,#FEC604)":"var(--text)"}}
                        onMouseDown={e=>{e.stopPropagation();toggleGroup(o.val);if(!multiGroup)setGroupOpen(false);}}>
                        {isGroupActive(o.val)&&<TI n="check" size={14}/>}{o.label}
                        {o.val==="__teams_funktionen"&&<TI n="info-circle" size={13} style={{marginLeft:"auto",color:"var(--sub)"}}/>}
                      </div>
                    ))}
                    {isGroupActive("__teams_funktionen")&&(
                      <div style={{margin:"0 16px 8px",background:"var(--bg-accent,#EFF6FF)",border:"0.5px solid var(--border-accent,#BFDBFE)",borderRadius:8,padding:"8px 10px",fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>
                        Zeigt Trainer und Funktionäre in einer gemeinsamen Liste — ideal für Kontaktlisten oder Vereinsverzeichnisse.
                      </div>
                    )}
                    {groupOptionsMore.length>0&&(
                      <>
                        <div className="cc-mehr-sheet-item" style={{color:"var(--sub)",fontWeight:500}}
                          onMouseDown={e=>{e.stopPropagation();setGroupMoreOpen(o=>!o);}}>
                          <TI n={groupMoreOpen?"chevron-up":"chevron-down"} size={14}/>
                          Weitere ({groupOptionsMore.length})
                        </div>
                        {groupMoreOpen&&groupOptionsMore.map(o=>(
                          <div key={o.val} className="cc-mehr-sheet-item"
                            style={{fontWeight:isGroupActive(o.val)?600:400,color:isGroupActive(o.val)?"var(--cc-accent,#FEC604)":"var(--text)"}}
                            onMouseDown={e=>{e.stopPropagation();toggleGroup(o.val);if(!multiGroup)setGroupOpen(false);}}>
                            {isGroupActive(o.val)&&<TI n="check" size={14}/>}{o.label}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ):(
                <div className="cc-ml-dropdown cc-ml-group-dropdown" style={{minWidth:240}}>
                  <div className="cc-filter-footer">
                    <button className="cc-ml-dropdown-clear" onClick={()=>{onGroupChange&&onGroupChange(["none"]);setGroupOpen(false);}}>Zurücksetzen</button>
                    <button className="cc-ml-dropdown-apply" onClick={()=>setGroupOpen(false)}>Fertig</button>
                  </div>
                  {groupByArr.filter(g=>g&&g!=="none").length>0&&(
                    <>
                      <div className="cc-ml-dropdown-section-lbl">Aktiv <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span></div>
                      {groupByArr.filter(g=>g&&g!=="none").map((val,idx)=>{
                        const opt=[...groupOptions,...groupOptionsMore].find(o=>o.val===val);
                        if(!opt) return null;
                        return(
                          <div key={val}
                            className={`cc-group-drag-item${dragOverGroup===val?" cc-drag-over":""}`}
                            draggable
                            onDragStart={()=>setDragGroup(val)}
                            onDragOver={e=>{e.preventDefault();setDragOverGroup(val);}}
                            onDrop={e=>{
                              e.preventDefault();
                              if(dragGroup&&dragGroup!==val){
                                const curr=groupByArr.filter(g=>g&&g!=="none");
                                const from=curr.indexOf(dragGroup),to=curr.indexOf(val);
                                const next=[...curr];
                                next.splice(from,1);next.splice(to,0,dragGroup);
                                onGroupChange&&onGroupChange(next);
                              }
                              setDragGroup(null);setDragOverGroup(null);
                            }}
                            onDragEnd={()=>{setDragGroup(null);setDragOverGroup(null);}}>
                            <TI n="grip-vertical" size={14} className="cc-group-drag-handle"/>
                            <div className="cc-group-drag-nr">{idx+1}</div>
                            <span style={{flex:1,fontSize:13}}>{opt.label}</span>
                            <button style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:15,padding:"0 2px"}}
                              onClick={e=>{e.stopPropagation();toggleGroup(val);}}>×</button>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="cc-ml-dropdown-section-lbl">Hinzufügen</div>
                  {groupOptions.filter(o=>!groupByArr.includes(o.val)).map(o=>(
                    <div key={o.val} className="cc-group-inactive-item"
                      onClick={()=>toggleGroup(o.val)}>
                      <TI n="plus" size={12}/>
                      {o.label}
                      {o.val==="__teams_funktionen"&&<TI n="info-circle" size={12} style={{marginLeft:"auto",color:"var(--sub)"}}/>}
                    </div>
                  ))}
                  {groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).length>0&&(
                    <>
                      <div className="cc-group-inactive-item cc-text-sub" style={{fontWeight:500}}
                        onClick={()=>setGroupMoreOpen(o=>!o)}>
                        <TI n={groupMoreOpen?"chevron-up":"chevron-down"} size={12}/>
                        Weitere ({groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).length})
                      </div>
                      {groupMoreOpen&&groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).map(o=>(
                        <div key={o.val} className="cc-group-inactive-item"
                          onClick={()=>toggleGroup(o.val)}>
                          <TI n="plus" size={12}/>
                          {o.label}
                        </div>
                      ))}
                    </>
                  )}
                  {groupByArr.filter(g=>g&&g!=="none").length>0&&(
                    <div style={{padding:"6px 12px 8px",fontSize:11,color:"var(--sub)",borderTop:"0.5px solid var(--border)"}}>
                      {groupByArr.filter(g=>g&&g!=="none").map(v=>[...groupOptions,...groupOptionsMore].find(o=>o.val===v)?.label).filter(Boolean).join(" › ")}
                    </div>
                  )}
                </div>
              )
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
              onClick={()=>{setMoreOpen(o=>{const next=!o;if(next)setOpenMoreSections(new Set(["Aktionen"]));return next;});setFilterOpen(false);setGroupOpen(false);setMobileSubMenu(null);}}>
              <TI n="dots" size={15}/>
            </button>
            {moreOpen&&(
              isMobile?(
                <div className="cc-mehr-sheet-overlay" onClick={()=>{setMoreOpen(false);setMobileSubMenu(null);}}>
                  <div className="cc-mehr-sheet-backdrop"/>
                  <div className="cc-mehr-sheet-box" style={{padding:"0 0 32px"}} onClick={e=>e.stopPropagation()}>
                    <div className="cc-mehr-sheet-handle" style={{margin:"10px auto 0"}}/>
                    {mobileSubMenu===null?(
                      // Stufe 1: Hauptmenü
                      <div>

                        {(()=>{
                          let hasHeader=false;
                          return moreItems.map((item,i)=>{
                            if(item==="sep"){return hasHeader?null:<div key={i} className="cc-menu-sep" style={{margin:"4px 0"}}/>;}
                            if(item.header){hasHeader=true;return null;}
                            if(hasHeader) return null;
                            return(
                              <button key={i} className="cc-sheet-nav-item"
                                onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onClick();}}>
                                <span className="cc-sheet-nav-left">{item.icon&&<TI n={item.icon} size={18}/>}{item.label}</span>
                              </button>
                            );
                          });
                        })()}

                        {moreItems.filter(item=>item!=="sep"&&item.header&&item.label==="Ansichten").length>0&&(
                          <button className="cc-sheet-nav-item"
                            onMouseDown={e=>{e.stopPropagation();setMobileSubMenu("views");}}>
                            <span className="cc-sheet-nav-left"><TI n="bookmark" size={18}/> Ansichten</span>
                            <TI n="chevron-right" size={14}/>
                          </button>
                        )}

                        {moreItems.filter(item=>item!=="sep"&&item.header&&item.label==="Export").length>0&&(
                          <button className="cc-sheet-nav-item"
                            onMouseDown={e=>{e.stopPropagation();setMobileSubMenu("export");}}>
                            <span className="cc-sheet-nav-left"><TI n="download" size={18}/> Exportieren</span>
                            <TI n="chevron-right" size={14}/>
                          </button>
                        )}
                      </div>
                    ):mobileSubMenu==="filter"?(
                      // Stufe 2: Filter
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">Filter</span>
                          <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);}}>Fertig</button>
                        </div>
                        <div className="cc-filter-search">
                          <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                          <input
                            placeholder="Filtern…"
                            value={filterSearch}
                            onChange={e=>{
                              const q=e.target.value;
                              setFilterSearch(q);
                              if(q){
                                const matching=new Set(filterDefs.filter(({vals,type})=>type!=="range"&&(vals||[]).some(v=>v.toLowerCase().includes(q.toLowerCase()))).map(({key})=>key));
                                setOpenSecs(matching);
                              } else {
                                setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
                              }
                            }}
                          />
                        </div>
                        <div className="cc-sheet-scroll">
                          {filterDefs.map(({key,label,vals,type,min,max,suffix})=>{
                            const q=filterSearch.toLowerCase();
                            if(type==="divider") return q?null:<div key={key} className="cc-filter-mobile-divider"/>;
                            if(type==="or-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-or-badge">ODER</span><div className="cc-filter-or-line"/></div>;
                    if(type==="und-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-und-badge">UND</span><div className="cc-filter-or-line"/></div>;
                            const isRange=type==="range";
                            const visVals=isRange?[]:(q?vals.filter(v=>v.toLowerCase().includes(q)):vals);
                            if(!isRange&&visVals.length===0) return null;
                            if(isRange&&q&&!label.toLowerCase().includes(q)) return null;
                            const rv=filterVals[key]||{};
                            const rangeActive=isRange&&(rv.von!=null||rv.bis!=null);
                            const selCount=isRange?(rangeActive?1:0):(filterVals[key]||[]).length;
                            return(
                              <div key={key}>
                                <div className="cc-filter-mobile-sec">
                                  {label}{selCount>0&&<span className="cc-filter-sec-badge" style={{marginLeft:8}}>{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
                                </div>
                                {isRange?(
                                  <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange} padLeft={20}/>
                                ):(
                                  visVals.map(v=>{
                                    const active=(filterVals[key]||[]).includes(v);
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
                          })}
                          {hasActiveFilter&&(
                            <div className="cc-filter-mobile-footer">
                              <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onFilterChange&&onFilterChange("__reset");}}>Alle Filter zurücksetzen</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ):mobileSubMenu==="group"?(
                      // Stufe 2: Gruppieren — Ebenen
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">Gruppieren</span>
                          <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);}}>Fertig</button>
                        </div>
                        <div className="cc-sheet-scroll">
                          {groupByArr.filter(g=>g&&g!=="none").map((val,idx)=>{
                            const opt=[...groupOptions,...groupOptionsMore].find(o=>o.val===val);
                            if(!opt) return null;
                            return(
                              <div key={val} className="cc-group-mobile-level"
                                onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(idx);}}>
                                <div className="cc-group-mobile-dot">{idx+1}</div>
                                <span className="cc-group-mobile-lbl">{opt.label}</span>
                                <button style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:18,padding:"0 2px"}}
                                  onMouseDown={e=>{e.stopPropagation();toggleGroup(val);}}>×</button>
                              </div>
                            );
                          })}
                          {groupByArr.filter(g=>g&&g!=="none").length<3&&(
                            <div className="cc-group-mobile-level" style={{opacity:0.5}}
                              onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(groupByArr.filter(g=>g&&g!=="none").length);}}>
                              <div className="cc-group-mobile-dot-empty"><TI n="plus" size={10}/></div>
                              <span className="cc-group-mobile-lbl-empty">Ebene hinzufügen</span>
                              <TI n="chevron-right" size={14} style={{color:"var(--sub)"}}/>
                            </div>
                          )}
                          {mobileGroupPicker!==null&&(
                            <div style={{borderTop:"1px solid var(--border)",marginTop:4}}>
                              <div style={{padding:"10px 20px 4px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:".06em",background:"var(--surface2)"}}>Ebene {mobileGroupPicker+1} wählen</div>
                              {[...groupOptions,...groupOptionsMore].filter(o=>!groupByArr.includes(o.val)).map(o=>(
                                <div key={o.val} className="cc-filter-mobile-item"
                                  onMouseDown={e=>{
                                    e.stopPropagation();
                                    const curr=groupByArr.filter(g=>g&&g!=="none");
                                    curr.splice(mobileGroupPicker,0,o.val);
                                    onGroupChange&&onGroupChange(curr);
                                    setMobileGroupPicker(null);
                                  }}>
                                  <span style={{flex:1}}>{o.label}</span>
                                  <TI n="chevron-right" size={13} style={{color:"var(--sub)"}}/>
                                </div>
                              ))}
                              <div className="cc-filter-mobile-footer">
                                <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(null);}}>Abbrechen</button>
                              </div>
                            </div>
                          )}
                          {isGrouped&&(
                            <div className="cc-group-preview">
                              {groupByArr.filter(g=>g&&g!=="none").map(v=>[...groupOptions,...groupOptionsMore].find(o=>o.val===v)?.label).filter(Boolean).join(" › ")}
                            </div>
                          )}
                          {isGrouped&&(
                            <div className="cc-filter-mobile-footer">
                              <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onGroupChange&&onGroupChange(["none"]);setMobileGroupPicker(null);}}>Alle zurücksetzen</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ):(
                      // Stufe 2: Ansichten / Aktionen / Export
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">{mobileSubMenu==="views"?"Ansichten":mobileSubMenu==="export"?"Exportieren":"Aktionen"}</span>
                          <div style={{width:32}}/>
                        </div>
                        <div className="cc-sheet-scroll">
                          {(()=>{
                            const section=mobileSubMenu==="views"?"Ansichten":mobileSubMenu==="export"?"Export":"Aktionen";
                            let inSection=false;
                            return moreItems.map((item,i)=>{
                              if(item==="sep"){inSection=false;return null;}
                              if(item.header){inSection=item.label===section;return null;}
                              if(!inSection) return null;
                              return(
                                <div key={i} style={{display:"flex",alignItems:"center",borderBottom:"0.5px solid var(--border)",overflow:"visible"}}>
                                  <button className="cc-mehr-sheet-item" style={{flex:1,borderBottom:"none",padding:"13px 20px",minWidth:0}}
                                    onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onClick();}}>
                                    {item.icon?<TI n={item.icon} size={16}/>:<TI n="layout" size={16}/>}{item.label}
                                  </button>
                                  {item.onDelete&&(
                                    <button className="cc-sheet-trash"
                                      onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onDelete();}}>
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
              ):(
                <div className="cc-ml-dropdown" style={{right:0,left:"auto",minWidth:220}}>
                  {(()=>{
                    let currentSection=null;
                    return moreItems.map((item,i)=>{
                      if(item==="sep") return openMoreSections.has(currentSection)?<div key={i} className="cc-menu-sep"/>:null;
                      if(item.header){
                        currentSection=item.label;
                        const isOpen=openMoreSections.has(item.label);
                        return(
                          <div key={i} className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}}
                            onClick={()=>setOpenMoreSections(prev=>{const n=new Set(prev);n.has(item.label)?n.delete(item.label):n.add(item.label);return n;})}>
                            <span>{item.label}</span>
                            <TI n={isOpen?"chevron-down":"chevron-right"} size={12}/>
                          </div>
                        );
                      }
                      if(currentSection !== null && !openMoreSections.has(currentSection)) return null;
                      if(item.hidden) return null;
                      if(item.subPanel) return(
                        <Fragment key={i}>
                          <div className="cc-col-menu-item" style={{justifyContent:"space-between"}}
                            onClick={()=>setMoreSubPanel(p=>p===i?null:i)}>
                            <span style={{display:"flex",alignItems:"center",gap:8}}>{item.icon&&<TI n={item.icon} size={14}/>}{item.label}</span>
                            <TI n="chevron-right" size={12}/>
                          </div>
                          {moreSubPanel===i&&<div className="cc-ml-more-subpanel">{item.subPanel}</div>}
                        </Fragment>
                      );
                      return(
                        <div key={i} className={`cc-col-menu-item${item.danger?" cc-menu-item-danger":""}`}
                          style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}
                          onClick={()=>{setMoreOpen(false);setMoreSubPanel(null);item.onClick();}}>
                          <span style={{display:"flex",alignItems:"center",gap:8}}>
                            {item.icon&&<TI n={item.icon} size={14}/>}{item.label}
                          </span>
                          {item.onDelete&&(
                            <button
                              className="cc-icon-btn"
                              style={{color:"var(--sub)",opacity:0.6,padding:"2px 4px"}}
                              onClick={e=>{e.stopPropagation();setMoreOpen(false);item.onDelete();}}>
                              <TI n="trash" size={12}/>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )
            )}
          </div>
        )}

        {/* Rechter Slot */}
        {right&&<><div className="cc-ml-sep"/>{right}</>}
      </div>

      {/* Aktive Filter Chips */}
      {hasActiveFilter&&(
        <div className="cc-ml-chips" style={{justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(()=>{
            const OR_GROUPS=[["kaderrollen","funktionen"],["teams","funktionsgruppen"]];
            const chips=[];
            let lastGroup=null;
            Object.entries(filterVals).forEach(([k,vals])=>{
              if(!vals) return;
              if(typeof vals==="object"&&!Array.isArray(vals)){
                if(vals.von==null&&vals.bis==null) return;
                const def=filterDefs.find(d=>d.key===k);
                const label=def?def.label:k;
                const display=`${label}: ${vals.von??def?.min??''}–${vals.bis??def?.max??''}${def?.suffix||''}`;
                chips.push(<div key={k} className="cc-ml-chip" onClick={()=>onFilterChange&&onFilterChange("__range",{rangeKey:k,von:null,bis:null})}>{display} <span className="cc-ml-chip-x">×</span></div>);
                return;
              }
              const currentGroup=OR_GROUPS.find(g=>g.includes(k));
              if(currentGroup&&lastGroup&&currentGroup===lastGroup){
                chips.push(<span key={k+"_or"} className="cc-ml-chip-or">oder</span>);
              }
              lastGroup=currentGroup||null;
              (vals||[]).forEach(v=>{
                chips.push(<div key={k+v} className="cc-ml-chip" onClick={()=>onFilterChange&&onFilterChange(k,v,false)}>{v} <span className="cc-ml-chip-x">×</span></div>);
              });
            });
            return chips;
          })()}
          </div>
          <button className="cc-ml-dropdown-clear" style={{flexShrink:0,marginLeft:4}}
            onClick={()=>onFilterChange&&onFilterChange("__reset")}>Zurücksetzen</button>
        </div>
      )}
    </div>
  );
}


// ColMenuContent, ColMenuButton, BulkBar, ConfirmDialog, useConfirm → shared/
// COMPONENT_REGISTRY → shared/componentRegistry.js



// PhoneInput, useAddrSearch, usePlzLookup → shared/forms/
// RollenAuswahlListe, InlineField → shared/forms/
// PortalBadge → shared/list/PortalBadge.jsx

// DpBadge → shared/list/PortalBadge.jsx

