/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/UsersTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, Chip } from "../../theme.ts";
import { GN, R, RL, FONT } from "../../constants.ts";
import { ROLES } from "./portalUtils.ts";
import type { Sb, SetState } from "../../types.ts";

/* Vereinsfunktion, wie sie an Benutzer gehängt wird */
export interface BenutzerFunktion {
  id: number;
  name: string;
  portal_gruppen?: { name?: string | null } | null;
}

/* Zeile aus benutzer, angereichert um die zugewiesenen Funktionen */
export interface BenutzerZeile {
  id: string;
  name?: string | null;
  email: string;
  role?: string | null;
  aktiv?: boolean | null;
  funktionen?: BenutzerFunktion[];
}

interface UsersTabProps {
  supabase: Sb;
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
  setSaveMsg: (msg: string) => void;
  benutzerListe: BenutzerZeile[];
  setBenutzerListe: SetState<BenutzerZeile[]>;
  updateBenutzerRolle: (id: string, role: string) => void;
  ROLLEN: string[];
  ROLLEN_LABELS: Record<string, string>;
  funktionen: BenutzerFunktion[];
  vereinId: string | null;
}

export function UsersTab({supabase,loading,isMobile,mobileKachel,tab,setSaveMsg,benutzerListe,setBenutzerListe,updateBenutzerRolle,ROLLEN,ROLLEN_LABELS,funktionen,vereinId}: UsersTabProps) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="users"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,color:"var(--sub)"}}>{benutzerListe.length} Benutzer</div>
            <Btn variant="primary" onClick={()=>{}}>+ Benutzer einladen</Btn>
          </div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th className="cc-th">Name</th>
                  <th className="cc-th">E-Mail</th>
                  <th className="cc-th">Portal-Rolle</th>
                  <th className="cc-th">Funktionen</th>
                  <th className="cc-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {benutzerListe.length===0&&(
                  <tr className="cc-tr"><td colSpan={5} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14}}>Keine Benutzer gefunden</td></tr>
                )}
                {benutzerListe.map(b=>(
                  <tr key={b.id} style={{borderTop:"0.5px solid var(--border)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600,color:"var(--text)"}}>{b.name||"—"}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:12}}>{b.email}</td>
                    <td style={{padding:"9px 13px"}}>
                      <select value={b.role||"spieler"} onChange={e=>updateBenutzerRolle(b.id,e.target.value)}
                        style={{padding:"5px 8px",border:"1px solid var(--border)",borderRadius:7,fontSize:12,background:"var(--surface)",color:(b.role?ROLES[b.role]?.color:null)||"var(--text)",fontFamily:FONT,cursor:"pointer"}}>
                        {ROLLEN.map(r=><option key={r} value={r}>{ROLLEN_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      {/* Funktionen anzeigen + zuweisen */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                        {(b.funktionen||[]).map(f=>(
                          <span key={f.id} style={{
                            fontSize:11,padding:"2px 8px",borderRadius:8,
                            background:"#8B5CF615",color:"#7C3AED",
                            display:"flex",alignItems:"center",gap:4
                          }}>
                            {f.name}
                            <button onClick={async()=>{
                              if(supabase) await supabase.from("benutzer_funktionen").delete().match({benutzer_id:b.id,funktion_id:f.id});
                              setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:(u.funktionen||[]).filter(x=>x.id!==f.id)}:u));
                            }} style={{background:"none",border:"none",cursor:"pointer",color:"#7C3AED",padding:0,lineHeight:1,fontSize:12}}>×</button>
                          </span>
                        ))}
                        {/* Funktion hinzufügen */}
                        <select
                          value=""
                          onChange={async e=>{
                            const fid=Number(e.target.value);
                            if(!fid) return;
                            const fn=funktionen.find(f=>f.id===fid);
                            if(!fn) return;
                            if(supabase){
                              /* verein_id ist in benutzer_funktionen NOT NULL und fehlte
                                 hier — die Zuweisung schlug dadurch immer fehl. */
                              if(!vereinId){setSaveMsg("Fehler: Verein nicht geladen");setTimeout(()=>setSaveMsg(""),3000);return;}
                              const{error}=await supabase.from("benutzer_funktionen").upsert({benutzer_id:b.id,funktion_id:fid,verein_id:vereinId},{onConflict:"benutzer_id,funktion_id"});
                              if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                            }
                            setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:[...(u.funktionen||[]),fn]}:u));
                            setSaveMsg("Funktion zugewiesen");setTimeout(()=>setSaveMsg(""),2000);
                          }}
                          style={{padding:"3px 6px",border:"1px dashed var(--border)",borderRadius:7,fontSize:11,background:"transparent",color:"var(--sub)",cursor:"pointer",fontFamily:FONT}}>
                          <option value="">+ Funktion</option>
                          {funktionen.filter(f=>!(b.funktionen||[]).find(x=>x.id===f.id)).map(f=>(
                            <option key={f.id} value={f.id}>{f.portal_gruppen?.name?`${f.portal_gruppen.name} · `:""}{f.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      <Chip text={b.aktiv!==false?"Aktiv":"Inaktiv"} color={b.aktiv!==false?GN:R} bg={b.aktiv!==false?"#ECFDF5":RL}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: MITGLIEDER-KONFIGURATION ── */}
    </div>
  );
}
