/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/DropMenu.tsx
   Dreipunkt-Dropdown Menü
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TI } from "../../icons.tsx";
import { FONT } from "../../constants.ts";
import { useIsMobile } from "./hooks.ts";

export interface DropMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
  /**
   * Untertitel unter der Beschriftung — die FOLGE, nicht die Handlung.
   *
   * ⚠ Gedacht fuer Menues, in denen zwei Eintraege aehnlich heissen und
   * verschieden wirken. „Austritt" und „Person löschen (DSGVO)" sind beides
   * Wege hinaus; welcher etwas zurücklaesst, steht nicht im Namen. Ein
   * Untertitel ist billiger als eine Rueckfrage und wird gelesen, BEVOR
   * geklickt wird — eine Rueckfrage erst danach.
   *
   * Sparsam benutzen: stuende er ueberall, laese ihn niemand.
   */
  sub?: string;
}

/* Aufrufer mischen Einträge mit dem Literal "sep" für den Trenner. */
export type DropMenuEntry = DropMenuItem | "sep";

interface DropMenuProps {
  items: DropMenuEntry[];
}

export function DropMenu({items}: DropMenuProps){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,right:0});
  const btnRef=useRef<HTMLButtonElement>(null);
  const wrapRef=useRef<HTMLDivElement>(null);
  const isMobile=useIsMobile();

  useEffect(()=>{
    function handleClick(e: MouseEvent){
      if(wrapRef.current&&e.target instanceof Node&&!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[]);

  function handleOpen(){
    if(!isMobile&&btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4, right:window.innerWidth-r.right});
    }
    setOpen(o=>!o);
  }

  const visibleItems=items.filter(item=>item!=="sep"&&!item.hidden);

  return(
    <div className="cc-menu-wrap" ref={wrapRef}>
      <button className="cc-menu-trigger" ref={btnRef} onClick={e=>{e.stopPropagation();handleOpen();}} onMouseDown={e=>e.stopPropagation()}>
        <TI n="dots-vertical" size={16}/>
      </button>
      {open&&(
        isMobile?createPortal(
          <div className="cc-mehr-sheet-overlay" onMouseDown={()=>setOpen(false)}>
            <div className="cc-mehr-sheet-backdrop"/>
            <div className="cc-mehr-sheet-box" style={{fontFamily:FONT}} onMouseDown={e=>e.stopPropagation()}>
              <div className="cc-mehr-sheet-handle"/>
              {items.map((item,i)=>item==="sep"?null:item.hidden?null:(
                <button key={i}
                  className={`cc-mehr-sheet-item${item.danger?" cc-mehr-sheet-item-danger":""}`}
                  style={{borderBottom:i<items.length-1?"0.5px solid var(--border)":"none"}}
                  onMouseDown={e=>{e.stopPropagation();setOpen(false);item.onClick();}}
                >
                  {item.icon&&<TI n={item.icon} size={16}/>}
                  {item.sub
                    ?<span style={{display:"flex",flexDirection:"column",gap:1,textAlign:"left"}}>
                       <span>{item.label}</span>
                       <span className="cc-text-muted" style={{fontSize:12,lineHeight:1.3,fontWeight:400}}>{item.sub}</span>
                     </span>
                    :item.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        ):createPortal(
          <div className="cc-menu" style={{position:"fixed",top:pos.top,right:pos.right,left:"auto",zIndex:9999,fontFamily:FONT}}>
            {items.map((item,i)=>item==="sep"
              ?<div key={i} className="cc-menu-sep"/>
              :item.hidden?null
              :<button key={i}
                  className={`cc-menu-item${item.danger?" cc-menu-item-danger":""}`}
                  onMouseDown={e=>{e.stopPropagation();}}
                  onClick={()=>{setOpen(false);item.onClick();}}
                >
                  {item.icon&&<TI n={item.icon} size={13}/>}
                  {item.sub
                    ?<span style={{display:"flex",flexDirection:"column",gap:1,textAlign:"left"}}>
                       <span>{item.label}</span>
                       <span className="cc-text-muted" style={{fontSize:11,lineHeight:1.3,fontWeight:400}}>{item.sub}</span>
                     </span>
                    :item.label}
                </button>
            )}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
