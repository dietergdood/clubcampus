/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/MitgliederKonfigTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function MitgliederKonfigTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,confirm,dbMitgliedtypen,setDbMitgliedtypen,dbPortalRollen,funktionen,rollePflichtfelder,setRollePflichtfelder,mitgliedtypPflichtfelder,setMitgliedtypPflichtfelder,showMitgliedtypForm,setShowMitgliedtypForm,editMitgliedtyp,setEditMitgliedtyp,mitgliedtypForm,setMitgliedtypForm,saveMitgliedtyp,deleteMitgliedtyp,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="mitglieder_config"&&(()=>{
        const ROLLEN_PF=dbPortalRollen.length>0?dbPortalRollen.map(r=>r.name):["spieler","trainer","funktionaer","eltern"];
        const ROLLEN_PF_LABELS=dbPortalRollen.length>0?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label])):{spieler:"Spieler",trainer:"Trainer",funktionaer:"Funktionär",eltern:"Eltern"};
        const MITGLIEDTYPEN_PF=["Aktivmitglied","Juniormitglied","Funktionär","Passivmitglied","Ehrenmitglied","Freimitglied"];
        const MITGLIEDTYPEN_SHORT={Aktivmitglied:"Aktivmitglied",Juniormitglied:"Juniormitglied",Funktionär:"Funktionär",Passivmitglied:"Passivmitglied",Ehrenmitglied:"Ehrenmitglied",Freimitglied:"Freimitglied"};
        const FELDER_ROLLE=["geburtsdatum","adresse","telefon","ahv_nr","spielerpass","js_nr","fairgate_id"];
        const FELDER_ROLLE_LABELS={geburtsdatum:"Geburtsdatum",adresse:"Adresse",telefon:"Telefon",ahv_nr:"AHV-Nr.",spielerpass:"Spielerpass",js_nr:"J+S Nr.",fairgate_id:"Fairgate-ID"};
        const FELDER_TYP=["vorname_nachname","geburtsdatum","adresse","telefon","email"];
        const FELDER_TYP_LABELS={vorname_nachname:"Vorname / Name",geburtsdatum:"Geburtsdatum",adresse:"Adresse",telefon:"Telefon",email:"E-Mail"};

        const isPflichtRolle=(rolle,feld)=>rollePflichtfelder.some(r=>r.rolle===rolle&&r.feld===feld&&r.pflicht);
        const isPflichtTyp=(typ,feld)=>mitgliedtypPflichtfelder.some(r=>r.mitgliedtyp===typ&&r.feld===feld&&r.pflicht);

        async function toggleRolle(rolle,feld,aktuell){
          if(!supabase) return;
          const neu=!aktuell;
          await supabase.from("rolle_pflichtfelder").upsert({rolle,feld,pflicht:neu},{onConflict:"rolle,feld"});
          const{data}=await supabase.from("rolle_pflichtfelder").select("*");
          if(data) setRollePflichtfelder(data);
        }

        async function toggleTyp(mitgliedtyp,feld,aktuell){
          if(!supabase) return;
          const neu=!aktuell;
          await supabase.from("mitgliedtyp_pflichtfelder").upsert({mitgliedtyp,feld,pflicht:neu},{onConflict:"mitgliedtyp,feld"});
          const{data}=await supabase.from("mitgliedtyp_pflichtfelder").select("*");
          if(data) setMitgliedtypPflichtfelder(data);
        }


        async function saveMitgliedtyp(){
          if(!mitgliedtypForm.name.trim()) return;
          const payload={name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true};
          if(supabase){
            if(editMitgliedtyp?.id){
              await supabase.from("mitgliedtypen").update(payload).eq("id",editMitgliedtyp.id);
            } else {
              const maxSort=Math.max(0,...dbMitgliedtypen.map(t=>t.sort_order||0));
              await supabase.from("mitgliedtypen").insert({...payload,sort_order:maxSort+1});
            }
            const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
            if(data) setDbMitgliedtypen(data);
          }
          setShowMitgliedtypForm(false); setEditMitgliedtyp(null);
          setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
        }

        async function deleteMitgliedtyp(id){
          if(!supabase||!window.confirm("Mitgliedtyp wirklich löschen?")) return;
          await supabase.from("mitgliedtypen").update({aktiv:false}).eq("id",id);
          const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
          if(data) setDbMitgliedtypen(data);
        }

        return(
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
                    {[{v:"administrator",l:"Administrator"},{v:"administration",l:"Verwaltung"},{v:"funktionaer",l:"Funktionär"},{v:"trainer",l:"Trainer"},{v:"spieler",l:"Spieler"},{v:"eltern",l:"Eltern"},{v:"mitglied",l:"Mitglied"},{v:"supporter",l:"Supporter"}].map(r=>(
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
                  Der <strong>Mitgliedtyp</strong> definiert die Basis-Pflichtfelder und ob ein Hauptkontakt erforderlich ist. Hat ein Mitglied zusätzlich eine <strong>Rolle</strong> (Spieler, Trainer…), werden die Felder der Rollen-Matrix ergänzt.
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FFBF00)",fontSize:11}}>Mitgliedtyp-Matrix</span>
                  <span style={{fontSize:13}}>+</span>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FFBF00)",fontSize:11}}>Rollen-Matrix (falls Rolle vorhanden)</span>
                  <span style={{fontSize:13}}>=</span>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid #22c55e",color:"#15803d",fontSize:11,fontWeight:600}}>Effektive Pflichtfelder</span>
                </div>
              </div>
            }/>

            {/* Matrix 1: Mitgliedtyp */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge" size={14}/> Pflichtfelder nach Mitgliedtyp</div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>Basis-Pflichtfelder — gelten immer, unabhängig von der Rolle</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th className="cc-th" style={{textAlign:"left",minWidth:160}}>Feld</th>
                    {MITGLIEDTYPEN_PF.map(t=><th key={t} className="cc-th cc-th-center">{MITGLIEDTYPEN_SHORT[t]}</th>)}
                  </tr></thead>
                  <tbody>
                    {FELDER_TYP.map(feld=>(
                      <tr key={feld} className="cc-tr">
                        <td className="cc-td">{FELDER_TYP_LABELS[feld]}</td>
                        {MITGLIEDTYPEN_PF.map(typ=>{
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
                        <td className="cc-td">{FELDER_ROLLE_LABELS[feld]}</td>
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
        );
      })()}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
    </div>
  );
}
