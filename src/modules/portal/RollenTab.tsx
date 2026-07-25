/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/RollenTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, ModalOrSheet, ModalTitle } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BTN_COLOR as BTN, BTN_TXT, FONT } from "../../constants.ts";
import type { PortalRolle, SetState } from "../../types.ts";

/* Formularzustand. prioritaet startet als Zahl und wird vom Zahlenfeld als
   String zurückgeschrieben; der Parent parst beim Speichern. */
export interface RollenFormular {
  name: string;
  label: string;
  prioritaet: number | string;
}

interface RollenTabProps {
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
  dbPortalRollen: PortalRolle[];
  rollenForm: RollenFormular;
  setRollenForm: SetState<RollenFormular>;
  editRolle: PortalRolle | null;
  setEditRolle: SetState<PortalRolle | null>;
  showRolleForm: boolean;
  setShowRolleForm: SetState<boolean>;
  saveRolle: () => void;
  deleteRolle: (id: number) => void;
}

export function RollenTab({loading,isMobile,mobileKachel,tab,dbPortalRollen,rollenForm,setRollenForm,editRolle,setEditRolle,showRolleForm,setShowRolleForm,saveRolle,deleteRolle}: RollenTabProps) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="rollen"&&(
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
                        <button onClick={()=>{setEditRolle(r);setRollenForm({name:r.name,label:r.label,prioritaet:r.prioritaet??50});setShowRolleForm(true);}}
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
      )}

    </div>
  );
}
