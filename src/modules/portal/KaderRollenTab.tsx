/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/KaderRollenTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, ModalOrSheet, ModalTitle } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BTN_COLOR as BTN, BTN_TXT, FONT } from "../../constants.ts";
import type { SetState } from "../../types.ts";

/* Zeile aus kader_rollen */
export interface KaderRolleZeile {
  id: number;
  name: string;
  ist_trainer?: boolean | null;
  sort_order?: number | null;
}

/* Formularzustand. sort_order startet als Zahl und wird vom Zahlenfeld als
   String zurückgeschrieben; der Parent parst beim Speichern. */
export interface KaderRolleFormular {
  name: string;
  ist_trainer: boolean;
  sort_order: number | string;
}

interface KaderRollenTabProps {
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
  dbKaderRollen: KaderRolleZeile[];
  kaderRolleForm: KaderRolleFormular;
  setKaderRolleForm: SetState<KaderRolleFormular>;
  editKaderRolle: KaderRolleZeile | null;
  setEditKaderRolle: SetState<KaderRolleZeile | null>;
  showKaderRolleForm: boolean;
  setShowKaderRolleForm: SetState<boolean>;
  saveKaderRolle: () => void;
  deleteKaderRolle: (id: number) => void;
}

export function KaderRollenTab({loading,isMobile,mobileKachel,tab,dbKaderRollen,kaderRolleForm,setKaderRolleForm,editKaderRolle,setEditKaderRolle,showKaderRolleForm,setShowKaderRolleForm,saveKaderRolle,deleteKaderRolle}: KaderRollenTabProps) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="kader_rollen"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="cc-section-title"><TI n="users" size={14}/> Kader-Rollen</div>
              <button onClick={()=>{setEditKaderRolle(null);setKaderRolleForm({name:"",ist_trainer:false,sort_order:50});setShowKaderRolleForm(true);}}
                style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                + Neu
              </button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                <th className="cc-th cc-th-center">Ist Trainer</th>
                <th className="cc-th cc-th-center">Reihenfolge</th>
                <th className="cc-th"></th>
              </tr></thead>
              <tbody>
                {dbKaderRollen.map(r=>(
                  <tr key={r.id} className="cc-tr">
                    <td className="cc-td" style={{fontWeight:500}}>{r.name}</td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      {r.ist_trainer
                        ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#DCFCE7",color:"#166534",fontWeight:600}}>Ja</span>
                        :<span style={{fontSize:11,color:"var(--sub)"}}>—</span>}
                    </td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{r.sort_order}</span>
                    </td>
                    <td className="cc-td" style={{textAlign:"right"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setEditKaderRolle(r);setKaderRolleForm({name:r.name,ist_trainer:!!r.ist_trainer,sort_order:r.sort_order??50});setShowKaderRolleForm(true);}}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}><TI n="edit" size={12}/></button>
                        <button onClick={()=>deleteKaderRolle(r.id)}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}><TI n="trash" size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <ModalOrSheet open={showKaderRolleForm} onClose={()=>{setShowKaderRolleForm(false);setEditKaderRolle(null);}} maxWidth={400}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <ModalTitle>{editKaderRolle?"Kader-Rolle bearbeiten":"Neue Kader-Rolle"}</ModalTitle>
                <button onClick={()=>{setShowKaderRolleForm(false);setEditKaderRolle(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="cc-label">Name *</label>
                <input className="cc-input" value={kaderRolleForm.name} onChange={e=>setKaderRolleForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Libero" autoFocus/>
              </div>
              <div>
                <label className="cc-label">Reihenfolge</label>
                <input className="cc-input" type="number" min={1} max={999} value={kaderRolleForm.sort_order} onChange={e=>setKaderRolleForm(p=>({...p,sort_order:e.target.value}))}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",cursor:"pointer"}}
                onClick={()=>setKaderRolleForm(p=>({...p,ist_trainer:!p.ist_trainer}))}>
                <div style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${kaderRolleForm.ist_trainer?"#22c55e":"var(--border)"}`,background:kaderRolleForm.ist_trainer?"#ECFDF5":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {kaderRolleForm.ist_trainer&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                </div>
                <span style={{fontSize:13}}>Gilt als Trainer-Rolle</span>
                <span style={{fontSize:12,color:"var(--sub)",marginLeft:"auto"}}>beeinflusst Rollenableitung</span>
              </div>
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                <button onClick={saveKaderRolle} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editKaderRolle?"Speichern":"Erstellen"}
                </button>
                <Btn onClick={()=>{setShowKaderRolleForm(false);setEditKaderRolle(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>
        </div>
      )}

    </div>
  );
}
