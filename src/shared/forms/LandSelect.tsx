/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/LandSelect.tsx
   Länder-Dropdown
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { TI } from "../../icons.tsx";
import type { Land } from "../../domains/person/personUtils.ts";

interface LandSelectProps {
  value?: string | null;
  onChange: (code: string) => void;
  laender: Land[];
  placeholder?: string;
}

export function LandSelect({value,onChange,laender,placeholder="–"}: LandSelectProps){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const wrapRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    function handleClick(e: MouseEvent){
      if(wrapRef.current&&e.target instanceof Node&&!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown",handleClick);
  },[]);

  const filtered=laender.filter(l=>
    !search||l.n.toLowerCase().includes(search.toLowerCase())||l.c.toLowerCase().includes(search.toLowerCase())
  );
  const selected=value?laender.find(l=>l.c===value):null;

  function select(code: string){ onChange(code); setOpen(false); setSearch(""); }

  return(
    <div className="cc-land-wrap" ref={wrapRef}>
      <button type="button" className="cc-land-trigger" onClick={()=>setOpen(o=>!o)}>
        {selected?(
          <>
            <span className="cc-land-badge">{selected.c}</span>
            <span className="cc-land-name">{selected.n}</span>
          </>
        ):(
          <span className="cc-land-name cc-text-sub">{placeholder}</span>
        )}
        <span className="cc-land-chevron">{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div className="cc-land-dropdown">
          <div className="cc-land-search">
            <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
            <input className="cc-land-search-input" autoFocus placeholder="Suchen…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="cc-land-list">
            <div className="cc-land-option" onClick={()=>select("")}>
              <span className="cc-land-option-name cc-text-sub">– Keine Angabe</span>
            </div>
            {filtered.map(l=>(
              <div key={l.c} className="cc-land-option" onClick={()=>select(l.c)}>
                <span className="cc-land-badge">{l.c}</span>
                <span className="cc-land-option-name">{l.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
