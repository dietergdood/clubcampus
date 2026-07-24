/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/DropMenu.jsx
   Dreipunkt-Dropdown Menü
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TI } from "../../icons.jsx";
import { FONT } from "../../constants.js";
import { useIsMobile } from "./hooks.jsx";

export function DropMenu({items}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,right:0});
  const btnRef=useRef(null);
  const wrapRef=useRef(null);
  const isMobile=useIsMobile();

  useEffect(()=>{
    function handleClick(e){ 
      if(wrapRef.current&&!wrapRef.current.contains(e.target)) setOpen(false); 
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
                  {item.label}
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
                  {item.label}
                </button>
            )}
          </div>,
          document.body
        )
      )}
    </div>
  );
}

