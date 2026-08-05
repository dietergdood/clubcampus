/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/MitgliederKonfigTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, ModalOrSheet, ModalTitle, InfoBox, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BTN_COLOR as BTN, BTN_TXT, BL, FONT } from "../../constants.ts";
import { FELDER_ROLLE as FELDER_ROLLE_DOMAIN, FELDER_TYP as FELDER_TYP_DOMAIN, IMMER_PFLICHT, istMatrixLeer } from "../../domains/members/pflichtfelder.ts";
import { FELD_LABEL } from "../../domains/members/memberService.ts";
import type { MitgliedtypPflichtfeld, PortalRolle, Sb, SetState } from "../../types.ts";

/* Zeile aus mitgliedtypen */
export interface MitgliedtypZeile {
  id: string;
  name: string;
  beitragsinfo?: string | null;
  hauptkontakt_pflicht?: boolean | null;
  standard_rolle?: string | null;
  sort_order?: number | null;
  aktiv?: boolean | null;
}

/* Formularzustand des Mitgliedtyp-Modals */
export interface MitgliedtypFormular {
  name: string;
  beitragsinfo: string;
  hauptkontakt_pflicht: boolean;
  standard_rolle: string;
}

/* Ein Pflichtfeld-Eintrag pro Rolle bzw. Mitgliedtyp */
export interface RollePflichtfeld {
  rolle: string;
  feld: string;
  pflicht: boolean | null;
}
/* Wortgleich mit der Definition in types.ts — hier nur re-exportiert,
   damit bestehende Importe aus dieser Datei weiter funktionieren. */
export type { MitgliedtypPflichtfeld };

/* Die Spalten kamen früher aus einer festen Liste ("Juniormitglied",
   "Funktionär"). Die tatsächlichen Typen heissen bei FCH aber
   "Juniorenmitglied" und "Funktionär/in" — ein Häkchen schrieb also Zeilen
   für Mitgliedtypen, die es gar nicht gibt, und Pausenmitglied wie
   Supporter hatten überhaupt keine Spalte. Quelle sind jetzt die Typen aus
   der Datenbank. */
/* Feldlisten und Labels kommen aus der Domain — dieselbe Quelle, aus der
   NeuesMitgliedModal seine Pflichtfelder liest. Beide Matrizen führen seit
   dem 05.08.2026 die feinen Feldnamen (strasse/plz/ort statt adresse);
   `vorname_nachname` ist entfallen, weil vorname/nachname in `mitglieder`
   NOT NULL sind und sich gar nicht abwählen liessen. */
const FELDER_ROLLE=[...FELDER_ROLLE_DOMAIN];
const FELDER_TYP=[...FELDER_TYP_DOMAIN];

const STANDARD_ROLLE_OPTS=[{v:"administrator",l:"Administrator"},{v:"administration",l:"Verwaltung"},{v:"funktionaer",l:"Funktionär"},{v:"trainer",l:"Trainer"},{v:"spieler",l:"Spieler"},{v:"eltern",l:"Eltern"},{v:"mitglied",l:"Mitglied"},{v:"mitglied",l:"Mitglied"},{v:"supporter",l:"Supporter"}];

interface MitgliederKonfigTabProps {
  supabase: Sb;
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
  vereinId: string | null;
  dbMitgliedtypen: MitgliedtypZeile[];
  setDbMitgliedtypen: SetState<MitgliedtypZeile[]>;
  dbPortalRollen: PortalRolle[];
  rollePflichtfelder: RollePflichtfeld[];
  setRollePflichtfelder: SetState<RollePflichtfeld[]>;
  mitgliedtypPflichtfelder: MitgliedtypPflichtfeld[];
  setMitgliedtypPflichtfelder: SetState<MitgliedtypPflichtfeld[]>;
  showMitgliedtypForm: boolean;
  setShowMitgliedtypForm: SetState<boolean>;
  editMitgliedtyp: MitgliedtypZeile | null;
  setEditMitgliedtyp: SetState<MitgliedtypZeile | null>;
  mitgliedtypForm: MitgliedtypFormular;
  setMitgliedtypForm: SetState<MitgliedtypFormular>;
}

export function MitgliederKonfigTab({supabase,loading,isMobile,mobileKachel,tab,vereinId,dbMitgliedtypen,setDbMitgliedtypen,dbPortalRollen,rollePflichtfelder,setRollePflichtfelder,mitgliedtypPflichtfelder,setMitgliedtypPflichtfelder,showMitgliedtypForm,setShowMitgliedtypForm,editMitgliedtyp,setEditMitgliedtyp,mitgliedtypForm,setMitgliedtypForm}: MitgliederKonfigTabProps) {
  const [confirm,confirmDialog]=useConfirm();

  const ROLLEN_PF=dbPortalRollen.length>0?dbPortalRollen.map(r=>r.name):["spieler","trainer","funktionaer","eltern"];
  const ROLLEN_PF_LABELS: Record<string,string>=dbPortalRollen.length>0?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label])):{spieler:"Spieler",trainer:"Trainer",funktionaer:"Funktionär",eltern:"Eltern"};

  /* Spalten der Mitgliedtyp-Matrix — echte Typen aus der DB, in ihrer
     Sortierreihenfolge. */
  const mitgliedtypenPf=(dbMitgliedtypen||[]).map(t=>t.name);

  const isPflichtRolle=(rolle: string,feld: string)=>rollePflichtfelder.some(r=>r.rolle===rolle&&r.feld===feld&&r.pflicht);
  const isPflichtTyp=(typ: string,feld: string)=>mitgliedtypPflichtfelder.some(r=>r.mitgliedtyp===typ&&r.feld===feld&&r.pflicht);

  async function toggleRolle(rolle: string,feld: string,aktuell: boolean){
    /* verein_id ist in rolle_pflichtfelder NOT NULL — fehlte hier, das
       Upsert-Insert schlug fehl und die Matrix liess sich nicht ändern. */
    if(!supabase||!vereinId) return;
    const neu=!aktuell;
    await supabase.from("rolle_pflichtfelder").upsert({rolle,feld,pflicht:neu,verein_id:vereinId},{onConflict:"verein_id,rolle,feld"});
    const{data}=await supabase.from("rolle_pflichtfelder").select("*");
    if(data) setRollePflichtfelder(data);
  }

  async function toggleTyp(mitgliedtyp: string,feld: string,aktuell: boolean){
    /* verein_id ist in mitgliedtyp_pflichtfelder NOT NULL — siehe toggleRolle. */
    if(!supabase||!vereinId) return;
    const neu=!aktuell;
    await supabase.from("mitgliedtyp_pflichtfelder").upsert({mitgliedtyp,feld,pflicht:neu,verein_id:vereinId},{onConflict:"verein_id,mitgliedtyp,feld"});
    const{data}=await supabase.from("mitgliedtyp_pflichtfelder").select("*");
    if(data) setMitgliedtypPflichtfelder(data);
  }

  async function saveMitgliedtyp(){
    if(!mitgliedtypForm.name.trim()) return;
    if(supabase){
      if(editMitgliedtyp?.id){
        await supabase.from("mitgliedtypen").update({name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true}).eq("id",editMitgliedtyp.id);
      } else if(vereinId){
        /* verein_id ist in mitgliedtypen NOT NULL — nur beim Insert nötig. */
        const maxSort=Math.max(0,...dbMitgliedtypen.map(t=>t.sort_order||0));
        await supabase.from("mitgliedtypen").insert({name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true,verein_id:vereinId,sort_order:maxSort+1});
      }
      const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
      if(data) setDbMitgliedtypen(data);
    }
    setShowMitgliedtypForm(false); setEditMitgliedtyp(null);
    setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
  }

  async function deleteMitgliedtyp(id: string){
    if(!supabase) return;
    const ok = await confirm({title:"Mitgliedtyp löschen?", message:"Diese Aktion kann nicht rückgängig gemacht werden.", danger:true, confirmLabel:"Löschen"});
    if(!ok) return;
    await supabase.from("mitgliedtypen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
    if(data) setDbMitgliedtypen(data);
  }

  return (
    <div style={{display:'contents'}}>
      {confirmDialog}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="mitglieder_config"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Mitgliedtypen verwalten */}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="cc-section-title"><TI n="id-badge" size={14}/> Mitgliedtypen</div>
              <button onClick={()=>{setEditMitgliedtyp(null);setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});setShowMitgliedtypForm(true);}}
                style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                + Neu
              </button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                <th className="cc-th cc-th-center">Hauptkontakt</th>
                <th className="cc-th" style={{textAlign:"left"}}>Beitrag</th>
                <th className="cc-th" style={{textAlign:"left"}}>Standard-Rolle</th>
                <th className="cc-th cc-th-center">Aktiv</th>
                <th className="cc-th"></th>
              </tr></thead>
              <tbody>
                {dbMitgliedtypen.map(t=>(
                  <tr key={t.id} className="cc-tr">
                    <td className="cc-td" style={{fontWeight:500}}>{t.name}</td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      {t.hauptkontakt_pflicht
                        ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#fef9c3",color:"#854d0e",fontWeight:600}}>★ Pflicht</span>
                        :<span style={{fontSize:11,color:"var(--sub)"}}>—</span>}
                    </td>
                    <td className="cc-td" style={{fontSize:12,color:"var(--sub)"}}>{t.beitragsinfo||"—"}</td>
                    <td className="cc-td"><span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{t.standard_rolle||"—"}</span></td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:t.aktiv?"#ECFDF5":"var(--surface2)",color:t.aktiv?"#15803d":"var(--sub)",fontWeight:500}}>
                        {t.aktiv?"Aktiv":"Inaktiv"}
                      </span>
                    </td>
                    <td className="cc-td" style={{textAlign:"right"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setEditMitgliedtyp(t);setMitgliedtypForm({name:t.name,beitragsinfo:t.beitragsinfo||"",hauptkontakt_pflicht:!!t.hauptkontakt_pflicht,standard_rolle:t.standard_rolle||""});setShowMitgliedtypForm(true);}}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}>
                          <TI n="edit" size={12}/>
                        </button>
                        <button onClick={()=>deleteMitgliedtyp(t.id)}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}>
                          <TI n="trash" size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mitgliedtyp bearbeiten Modal */}
          <ModalOrSheet open={showMitgliedtypForm} onClose={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} maxWidth={420}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <ModalTitle>{editMitgliedtyp?"Mitgliedtyp bearbeiten":"Neuer Mitgliedtyp"}</ModalTitle>
                <button onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="cc-label">Name *</label>
                <input className="cc-input" value={mitgliedtypForm.name} onChange={e=>setMitgliedtypForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Aktivmitglied" autoFocus/>
              </div>
              <div>
                <label className="cc-label">Beitragsinfo</label>
                <input className="cc-input" value={mitgliedtypForm.beitragsinfo||""} onChange={e=>setMitgliedtypForm(p=>({...p,beitragsinfo:e.target.value}))} placeholder="z.B. Voller Beitrag CHF 150"/>
              </div>
              <div>
                <label className="cc-label">Standard Portal-Rolle</label>
                <select className="cc-input" value={mitgliedtypForm.standard_rolle||""} onChange={e=>setMitgliedtypForm(p=>({...p,standard_rolle:e.target.value}))}>
                  <option value="">– keine –</option>
                  {STANDARD_ROLLE_OPTS.map(r=>(
                    <option key={r.v} value={r.v}>{r.l}</option>
                  ))}
                </select>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Wird automatisch gesetzt wenn keine höhere Rolle vorliegt</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",cursor:"pointer"}}
                onClick={()=>setMitgliedtypForm(p=>({...p,hauptkontakt_pflicht:!p.hauptkontakt_pflicht}))}>
                <div style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${mitgliedtypForm.hauptkontakt_pflicht?"#22c55e":"var(--border)"}`,background:mitgliedtypForm.hauptkontakt_pflicht?"#ECFDF5":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {mitgliedtypForm.hauptkontakt_pflicht&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                </div>
                <span style={{fontSize:13}}>Hauptkontakt Pflicht</span>
                <span style={{fontSize:12,color:"var(--sub)",marginLeft:"auto"}}>nur für Minderjährige</span>
              </div>
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                <button onClick={saveMitgliedtyp} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editMitgliedtyp?"Speichern":"Erstellen"}
                </button>
                <Btn onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>

          {/* Info-Box */}
          <InfoBox color={BL} text={
            <div>
              <div style={{fontWeight:600,marginBottom:6}}>Wie funktioniert die Pflichtfelder-Logik?</div>
              <div style={{fontSize:12,lineHeight:1.6}}>
                Der <strong>Mitgliedtyp</strong> bestimmt, was beim <strong>Anlegen</strong> eines Mitglieds verlangt wird. Die Zusatzfelder einer <strong>Rolle</strong> (Spieler, Trainer…) kommen erst bei der <strong>Datenprüfung</strong> dazu — beim Anlegen steht die sportliche Rolle noch nicht fest, sie ergibt sich später aus dem Kader.
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
                <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FEC604)",fontSize:11}}>Mitgliedtyp-Matrix</span>
                <span style={{fontSize:13}}>+</span>
                <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FEC604)",fontSize:11}}>Rollen-Matrix (falls Rolle vorhanden)</span>
                <span style={{fontSize:13}}>=</span>
                <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid #22c55e",color:"#15803d",fontSize:11,fontWeight:600}}>Effektive Pflichtfelder</span>
              </div>
            </div>
          }/>

          {/* Matrix 1: Mitgliedtyp */}
          <Card>
            <div className="cc-section-title"><TI n="id-badge" size={14}/> Pflichtfelder nach Mitgliedtyp</div>
            <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>
              Gelten beim Anlegen. <strong>{IMMER_PFLICHT.map(f=>FELD_LABEL[f]||f).join(" und ")}</strong> sind immer Pflicht und stehen deshalb nicht in der Tabelle.
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th className="cc-th" style={{textAlign:"left",minWidth:160}}>Feld</th>
                  {mitgliedtypenPf.map(t=>(
                    <th key={t} className="cc-th cc-th-center">
                      {t}
                      {istMatrixLeer(t,mitgliedtypPflichtfelder)&&(
                        <div style={{fontSize:10,fontWeight:400,color:"#b45309"}} title="Für diesen Mitgliedtyp ist nichts konfiguriert — beim Anlegen wird nur Vor- und Nachname verlangt.">
                          nichts gesetzt
                        </div>
                      )}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {FELDER_TYP.map(feld=>(
                    <tr key={feld} className="cc-tr">
                      <td className="cc-td">{FELD_LABEL[feld]||feld}</td>
                      {mitgliedtypenPf.map(typ=>{
                        const on=isPflichtTyp(typ,feld);
                        return(
                          <td key={typ} className="cc-td" style={{textAlign:"center"}}>
                            <div onClick={()=>toggleTyp(typ,feld,on)}
                              style={{width:20,height:20,borderRadius:5,border:`0.5px solid ${on?"#22c55e":"var(--border)"}`,background:on?"#ECFDF5":"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                              {on&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Matrix 2: Rolle */}
          <Card>
            <div className="cc-section-title"><TI n="shield-check" size={14}/> Zusatzfelder nach Rolle</div>
            <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>Ergänzend zur Mitgliedtyp-Matrix — nur wenn Mitglied diese Rolle hat</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th className="cc-th" style={{textAlign:"left",minWidth:160}}>Feld</th>
                  {ROLLEN_PF.map(r=><th key={r} className="cc-th cc-th-center">{ROLLEN_PF_LABELS[r]}</th>)}
                </tr></thead>
                <tbody>
                  {FELDER_ROLLE.map(feld=>(
                    <tr key={feld} className="cc-tr">
                      <td className="cc-td">{FELD_LABEL[feld]||feld}</td>
                      {ROLLEN_PF.map(rolle=>{
                        const on=isPflichtRolle(rolle,feld);
                        return(
                          <td key={rolle} className="cc-td" style={{textAlign:"center"}}>
                            <div onClick={()=>toggleRolle(rolle,feld,on)}
                              style={{width:20,height:20,borderRadius:5,border:`0.5px solid ${on?"#22c55e":"var(--border)"}`,background:on?"#ECFDF5":"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                              {on&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
    </div>
  );
}
