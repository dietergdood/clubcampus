import { FONT } from "../../constants.js";

export function Btn({children,onClick,variant="outline",color=null,small,disabled=false,type="button",style={}}){
  const p=small?"4px 10px":"7px 14px";
  const base={
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
    padding:p,borderRadius:6,fontSize:small?12:13,fontWeight:500,
    cursor:disabled?"not-allowed":"pointer",fontFamily:FONT,
    minHeight:small?30:36,opacity:disabled?0.5:1,border:"none",
    transition:"all 0.1s",...style
  };
  if(variant==="primary"){
    const bg=color||"var(--btn-primary,#FEC604)";
    const fg=color?(color==="#F3F4F6"||color==="#E5E7EB"||color==="#F9FAFB"?"#374151":"var(--btn-primary-text,#000)"):"var(--btn-primary-text,#000)";
    return <button type={type} onClick={onClick} disabled={disabled}
      className="cc-btn-primary"
      style={{...base,background:bg,color:fg}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.88";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
      onTouchStart={e=>{if(!disabled)e.currentTarget.style.opacity="0.75";}}
      onTouchEnd={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
    >{children}</button>;
  }
  if(variant==="ghost"){
    return <button type={type} onClick={onClick} disabled={disabled}
      style={{...base,background:"none",border:"none",color:color==="BK"?"var(--text)":color||"var(--sub)",
        padding:small?"4px 8px":"5px 10px"}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="var(--surface2)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="none";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    >{children}</button>;
  }
  if(variant==="danger"){
    return <button type={type} onClick={onClick} disabled={disabled}
      style={{...base,background:"#FEF2F2",border:"1px solid #FECACA",color:"#C8102E"}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="#FEE2E2";}}
      onMouseLeave={e=>{e.currentTarget.style.background="#FEF2F2";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    >{children}</button>;
  }
  return <button type={type} onClick={onClick} disabled={disabled}
    style={{...base,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)"}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="var(--surface2)";}}
    onMouseLeave={e=>{e.currentTarget.style.background="var(--surface)";}}
    onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
    onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    onTouchStart={e=>{if(!disabled)e.currentTarget.style.opacity="0.7";}}
    onTouchEnd={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
  >{children}</button>;
}
