/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/FunktionenMultiSelect.jsx
   Multi-Select für Vereinsfunktionen
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { TI } from "../../icons.jsx";
import { FONT } from "../../constants.js";

export function FunktionenMultiSelect({funktionen=[],selected=[],onChange}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    function handleClick(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown",handleClick);
  },[]);

  // Gruppieren
  const filtered=funktionen.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())||
    (f.portal_gruppen?.name||"").toLowerCase().includes(search.toLowerCase()));
  const groups=[...new Set(filtered.map(f=>f.portal_gruppen?.name||"Weitere"))];

  function toggle(name){
    const next=selected.includes(name)?selected.filter(x=>x!==name):[...selected,name];
    onChange(next);
  }

  return(
    <div className="cc-multiselect" ref={ref}>
      <button type="button" className="cc-multiselect-trigger" onClick={()=>setOpen(o=>!o)}>
        <div className="cc-multiselect-chips">
          {selected.length===0
            ?<span className="cc-multiselect-placeholder">+ Funktion wählen</span>
            :selected.slice(0,3).map(s=>(
              <span key={s} className="cc-multiselect-chip">
                {s}
                <span className="cc-multiselect-chip-x" onMouseDown={e=>{e.stopPropagation();toggle(s);}}>×</span>
              </span>
            ))
          }
          {selected.length>3&&<span className="cc-multiselect-chip" style={{color:"var(--sub)"}}>+{selected.length-3} weitere</span>}
        </div>
        <TI n={open?"chevron-up":"chevron-down"} size={14} style={{color:"var(--sub)",flexShrink:0}}/>
      </button>
      {open&&(
        <div className="cc-multiselect-dropdown">
          <input className="cc-multiselect-search" placeholder="Funktion suchen…" value={search}
            onChange={e=>setSearch(e.target.value)} autoFocus/>
          <div className="cc-multiselect-list">
            {groups.map(g=>(
              <div key={g}>
                <div className="cc-multiselect-group-label">{g}</div>
                {filtered.filter(f=>(f.portal_gruppen?.name||"Weitere")===g).map(f=>{
                  const on=selected.includes(f.name);
                  return(
                    <div key={f.name} className="cc-multiselect-item" onClick={()=>toggle(f.name)}>
                      <div className={on?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                        {on&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                      </div>
                      <span>{f.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {selected.length>0&&(
            <div className="cc-multiselect-footer">
              <span>{selected.length} ausgewählt</span>
              <button className="cc-ml-dropdown-clear" onClick={()=>onChange([])}>Alle entfernen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

