/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/ColMenu.jsx
   Spalten-Auswahl Komponenten
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { TI } from "../../icons.jsx";

export function ColMenuContent({colGroups,visibleCols,onVisibleColsChange,dragCol,onDragStart,onDragOver,onDrop,onDragEnd,search,setSearch}){
  const allCols=colGroups.flatMap(g=>g.cols);
  const [openGroups,setOpenGroups]=useState(new Set());
  const toggleGroup=g=>setOpenGroups(prev=>{const n=new Set(prev);n.has(g)?n.delete(g):n.add(g);return n;});
  return(
    <div>
      <div className="cc-col-menu-group-hdr">Aktive Spalten <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span></div>
      {visibleCols.filter(k=>allCols.find(c=>c.key===k)).map(key=>{
        const col=allCols.find(c=>c.key===key);
        if(!col) return null;
        return(
          <div key={key}
            className={`cc-col-menu-item cc-col-menu-item-active${dragCol===key?" cc-col-menu-item-dragging":""}`}
            draggable={!col.alwaysOn}
            onDragStart={()=>onDragStart&&onDragStart(key)}
            onDragOver={e=>{e.preventDefault();onDragOver&&onDragOver(key);}}
            onDrop={()=>onDrop&&onDrop(key,dragCol)}
            onDragEnd={()=>onDragEnd&&onDragEnd()}
            onClick={()=>!col.alwaysOn&&onVisibleColsChange&&onVisibleColsChange(visibleCols.filter(k=>k!==key))}>
            {!col.alwaysOn&&<TI n="grip-vertical" size={13} className="cc-col-drag-handle cc-col-menu-icon-drag"/>}
            {col.alwaysOn&&<TI n="lock" size={11} className="cc-col-menu-icon-lock"/>}
            <span className="cc-flex-1" style={{fontSize:13}}>{col.label}</span>
            {!col.alwaysOn&&<TI n="x" size={11} style={{opacity:0.4}}/>}
          </div>
        );
      })}
      <div className="cc-col-menu-group-hdr cc-col-menu-hdr-mt">Inaktive Spalten</div>
      <div className="cc-col-search-wrap">
        <TI n="search" size={13} className="cc-col-search-icon"/>
        <input className="cc-col-search-input" value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Spalte suchen…"/>
        {search&&<button className="cc-col-search-clear" onClick={()=>setSearch("")}><TI n="x" size={11}/></button>}
      </div>
      {(()=>{
        const q=search.toLowerCase();
        const groups=colGroups.map(g=>({...g,
          cols:g.cols.filter(c=>!c.hidden&&!visibleCols.includes(c.key)&&(!q||c.label.toLowerCase().includes(q)))
            .sort((a,b)=>a.label.localeCompare(b.label))
        })).filter(g=>g.cols.length>0);
        if(groups.length===0) return <div className="cc-col-search-empty">Keine Spalte gefunden</div>;
        return groups.map(g=>{
          const isOpen=search?true:openGroups.has(g.group);
          return(
            <div key={g.group}>
              <div className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}}
                onClick={()=>toggleGroup(g.group)}>
                <span>{g.group}</span>
                <TI n={isOpen?"chevron-down":"chevron-right"} size={12}/>
              </div>
              {isOpen&&g.cols.map(c=>(
                <div key={c.key} className="cc-col-menu-item"
                  onClick={()=>onVisibleColsChange&&onVisibleColsChange([...visibleCols,c.key])}>
                  <div className="cc-col-menu-check"/>
                  <span className="cc-flex-1" style={{fontSize:13}}>{c.label}</span>
                </div>
              ))}
            </div>
          );
        });
      })()}
    </div>
  );
}

export function ColMenuButton({
  colGroups=[],
  visibleCols=[],
  onVisibleColsChange=null,
  dragCol=null,
  dragOverCol=null,
  onDragStart=null,
  onDragOver=null,
  onDrop=null,
  onDragEnd=null,
  inline=false,
}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    function handleClick(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[]);

  if(inline) return <ColMenuContent colGroups={colGroups} visibleCols={visibleCols} onVisibleColsChange={onVisibleColsChange} dragCol={dragCol} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} search={search} setSearch={setSearch}/>;

  return(
    <div className="cc-ml-dropdown-wrap" ref={ref}>
      <button className={`cc-ml-btn${open?" cc-active":""}`}
        onClick={()=>setOpen(o=>!o)}>
        <TI n="table" size={15}/>
      </button>
      {open&&(
        <div className="cc-ml-dropdown cc-ml-filter-dropdown">
          <ColMenuContent
            colGroups={colGroups}
            visibleCols={visibleCols}
            onVisibleColsChange={onVisibleColsChange}
            dragCol={dragCol}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            search={search}
            setSearch={setSearch}
          />
        </div>
      )}
    </div>
  );
}
