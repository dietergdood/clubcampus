/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/ConfirmDialog.jsx
   Bestätigungs-Dialog + useConfirm Hook
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../../constants.js";

export function ConfirmDialog({open, title, message, confirmLabel="Bestätigen", cancelLabel="Abbrechen", danger=false, onConfirm, onCancel}){
  if(!open) return null;
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)",fontFamily:FONT}}>
      <div style={{background:"var(--surface)",borderRadius:12,padding:"24px 28px",maxWidth:380,width:"90%",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)",marginBottom:8}}>{title}</div>
        {message&&<div style={{fontSize:14,color:"var(--sub)",marginBottom:20,lineHeight:1.5}}>{message}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={{padding:"7px 16px",borderRadius:7,border:"0.5px solid var(--border)",background:"transparent",color:"var(--text)",fontSize:13,cursor:"pointer",fontFamily:FONT}} onClick={onCancel}>{cancelLabel}</button>
          <button style={{padding:"7px 16px",borderRadius:7,border:"none",background:danger?"#DC2626":"var(--cc-accent,#FEC604)",color:danger?"#fff":"var(--cc-accent-text,#000)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT}} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirm(){
  const [state,setState]=useState({open:false,title:"",message:"",danger:false,confirmLabel:"Bestätigen",resolve:null});
  const confirm=({title,message,danger=false,confirmLabel="Bestätigen"})=>new Promise(resolve=>{
    setState({open:true,title,message,danger,confirmLabel,resolve});
  });
  const dialog=(
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmLabel={state.confirmLabel}
      onConfirm={()=>{setState(s=>({...s,open:false}));state.resolve(true);}}
      onCancel={()=>{setState(s=>({...s,open:false}));state.resolve(false);}}
    />
  );
  return [confirm, dialog];
}
