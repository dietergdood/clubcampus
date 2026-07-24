/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/RollenTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.ts";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function RollenTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,confirm,dbPortalRollen,rollenForm,setRollenForm,editRolle,setEditRolle,showRolleForm,setShowRolleForm,saveRolle,deleteRolle,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="rollen"&&(()=>{
        return(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="cc-section-title"><TI n="shield" size={14}/> Portal-Rollen</div>
                <button onClick={()=>{setEditRolle(null);setRollenForm({name:"",label:"",prioritaet:50});setShowRolleForm(true);}}
                  style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  + Neu
                </button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                  <th className="cc-th" style={{textAlign:"left"}}>Label</th>
                  <th className="cc-th cc-th-center">Priorität</th>
                  <th className="cc-th"></th>
                </tr></thead>
                <tbody>
                  {dbPortalRollen.map(r=>(
                    <tr key={r.id} className="cc-tr">
                      <td className="cc-td" style={{fontWeight:500,fontFamily:"monospace",fontSize:12}}>{r.name}</td>
                      <td className="cc-td">{r.label}</td>
                      <td className="cc-td" style={{textAlign:"center"}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{r.prioritaet}</span>
                      </td>
                      <td className="cc-td" style={{textAlign:"right"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button onClick={()=>{setEditRolle(r);setRollenForm({name:r.name,label:r.label,prioritaet:r.prioritaet});setShowRolleForm(true);}}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}><TI n="edit" size={12}/></button>
                          <button onClick={()=>deleteRolle(r.id)}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}><TI n="trash" size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <ModalOrSheet open={showRolleForm} onClose={()=>{setShowRolleForm(false);setEditRolle(null);}} maxWidth={400}>
              <div style={{padding:"20px 20px 0",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <ModalTitle>{editRolle?"Rolle bearbeiten":"Neue Rolle"}</ModalTitle>
                  <button onClick={()=>{setShowRolleForm(false);setEditRolle(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
                </div>
              </div>
              <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label className="cc-label">Name (intern) *</label>
                  <input className="cc-input" value={rollenForm.name} onChange={e=>setRollenForm(p=>({...p,name:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))} placeholder="z.B. schiedsrichter" autoFocus disabled={!!editRolle}/>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Kleinbuchstaben, keine Sonderzeichen. Kann nach dem Erstellen nicht mehr geändert werden.</div>
                </div>
                <div>
                  <label className="cc-label">Label (Anzeige) *</label>
                  <input className="cc-input" value={rollenForm.label} onChange={e=>setRollenForm(p=>({...p,label:e.target.value}))} placeholder="z.B. Schiedsrichter"/>
                </div>
                <div>
                  <label className="cc-label">Priorität (tiefer = höhere Berechtigung)</label>
                  <input className="cc-input" type="number" min={1} max={999} value={rollenForm.prioritaet} onChange={e=>setRollenForm(p=>({...p,prioritaet:e.target.value}))} placeholder="50"/>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Aktuell: {dbPortalRollen.map(r=>`${r.prioritaet} ${r.label}`).join(" → ")}</div>
                </div>
                <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                  <button onClick={saveRolle} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                    {editRolle?"Speichern":"Erstellen"}
                  </button>
                  <Btn onClick={()=>{setShowRolleForm(false);setEditRolle(null);}}>Abbrechen</Btn>
                </div>
              </div>
            </ModalOrSheet>
          </div>
        );
      })()}

    </div>
  );
}
