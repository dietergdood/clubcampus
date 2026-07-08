/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/GruppenTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function GruppenTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,gruppen,setGruppen,funktionen,setFunktionen,pvTeams,gruppenTeams,setGruppenTeams,selectedGruppe,setSelectedGruppe,showGruppeForm,setShowGruppeForm,showFunktionForm,setShowFunktionForm,editGruppe,setEditGruppe,editFunktion,setEditFunktion,gruppeForm,setGruppeForm,funktionForm,setFunktionForm,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="gruppen"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:20}}>
            <InfoBox text="Gruppen bündeln Module für Funktionäre. Funktionen schränken innerhalb einer Gruppe ein (Teams, Filter)." color={BL}/>
            <button onClick={()=>{setEditGruppe(null);setGruppeForm({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{},teams:[]});setShowGruppeForm(true);}}
              style={{padding:"7px 16px",borderRadius:9,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>
              + Neue Gruppe
            </button>
          </div>

          {/* Gruppen als Grid */}
          <div className="cc-grid-cards" style={{gap:12}}>
          {(gruppen.length>0?gruppen:[
            {id:1,name:"Vereinsleben & Events",farbe:"#8B5CF6",beschreibung:"Anlässe, Helfereinsätze, Mitgliederliste",module:["events","helpers","members","news","docs"]},
            {id:2,name:"Betrieb & Infrastruktur",farbe:"#3B82F6",beschreibung:"Material, Busse, Garderoben",module:["material","buses","lockers","docs"]},
            {id:3,name:"Kommunikation & Medien",farbe:"#22C55E",beschreibung:"Website, Social Media, Wiki, News",module:["media","wiki","news","docs"]},
            {id:4,name:"Stufenleitende",farbe:"#F97316",beschreibung:"Teams und Kader der zugewiesenen Stufe",module:["team","training","events","attendance_central","members","helpers"]},
            {id:5,name:"Schiedsrichterwesen",farbe:"#06B6D4",beschreibung:"Spielplan, Koordination",module:["schedule","training","docs"]},
          ]).map(g=>{
            const gFunktionen=funktionen.filter(f=>f.gruppe_id===g.id||f.portal_gruppen?.id===g.id);
            const gTeams=gruppenTeams.filter(gt=>gt.gruppe_id===g.id).map(gt=>pvTeams.find(t=>t.id===gt.team_id)).filter(Boolean);
            const isOpen=selectedGruppe?.id===g.id;
            const moduleLabels=(g.module||[]).map(k=>ALLE_MODULE.find(m=>m.key===k)?.label||k);
            return(
              <div key={g.id} style={{
                borderRadius:14,border:`1.5px solid ${isOpen?g.farbe:"var(--border)"}`,
                overflow:"hidden",
                background:isOpen?g.farbe+"08":"var(--surface)",
                transition:"all 0.15s"
              }}>
                {/* Gruppen-Header */}
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  {/* Farbstreifen */}
                  <div style={{width:4,alignSelf:"stretch",background:g.farbe,flexShrink:0}}/>
                  <div onClick={()=>setSelectedGruppe(isOpen?null:g)}
                    style={{flex:1,padding:"14px 16px",cursor:"pointer",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{g.name}</span>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:g.farbe+"20",color:g.farbe,fontWeight:600}}>
                        {gFunktionen.length} Funktion{gFunktionen.length!==1?"en":""}
                      </span>
                      {gTeams.length>0&&(
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:"#F9731620",color:"#F97316",fontWeight:600}}>
                          {gTeams.length} Team{gTeams.length!==1?"s":""}
                        </span>
                      )}
                    </div>
                    {g.beschreibung&&<div style={{fontSize:12,color:"var(--sub)",marginBottom:6}}>{g.beschreibung}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {moduleLabels.map(ml=>(
                        <span key={ml} style={{fontSize:11,padding:"2px 9px",borderRadius:8,background:g.farbe+"15",color:g.farbe}}>{ml}</span>
                      ))}
                    </div>
                  </div>
                  {/* Aktionen */}
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();const existingTeams=gruppenTeams.filter(gt=>gt.gruppe_id===g.id).map(gt=>gt.team_id);setEditGruppe(g);setGruppeForm({name:g.name,beschreibung:g.beschreibung||"",module:g.module||[],farbe:g.farbe||"#8B5CF6",modul_stufen:g.modul_stufen||{},teams:existingTeams});setShowGruppeForm(true);}}
                      style={{width:30,height:30,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)"}}>
                      <TI n="edit" size={13}/>
                    </button>
                    <div onClick={()=>setSelectedGruppe(isOpen?null:g)} style={{cursor:"pointer",color:"var(--sub)",padding:4}}>
                      <TI n={isOpen?"chevron-up":"chevron-down"} size={16}/>
                    </div>
                  </div>
                </div>

                {/* Expandierte Funktionen */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${g.farbe}30`,background:"var(--surface2)"}}>
                    {/* Funktionen-Header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px 6px"}}>
                      <SectionLabel style={{marginBottom:0}}>
                        Funktionen
                      </SectionLabel>
                      <button onClick={()=>{setEditFunktion(null);setFunktionForm({name:"",beschreibung:"",gruppe_id:g.id,module_override:[],teams:[],filter:{}});setShowFunktionForm(true);}}
                        style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${g.farbe}`,background:g.farbe+"15",color:g.farbe,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                        + Funktion hinzufügen
                      </button>
                    </div>

                    {/* Funktionen-Grid */}
                    <div style={{padding:"6px 12px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
                      {gFunktionen.length===0&&(
                        <div style={{gridColumn:"1/-1",padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14,border:"1px dashed var(--border)",borderRadius:10}}>
                          Noch keine Funktionen — klicke «+ Funktion hinzufügen»
                        </div>
                      )}
                      {gFunktionen.map(f=>(
                        <div key={f.id} style={{
                          background:"var(--surface)",borderRadius:10,
                          border:"1px solid var(--border)",padding:"11px 13px"
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <span style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{f.name}</span>
                            <button onClick={()=>{setEditFunktion(f);setFunktionForm({name:f.name,beschreibung:f.beschreibung||"",gruppe_id:f.gruppe_id||g.id,module_override:f.module_override||[],teams:f.teams||[],filter:f.filter||{}});setShowFunktionForm(true);}}
                              style={{width:26,height:26,borderRadius:7,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)",flexShrink:0}}>
                              <TI n="edit" size={12}/>
                            </button>
                          </div>
                          {f.beschreibung&&<div style={{fontSize:11,color:"var(--sub)",marginBottom:6}}>{f.beschreibung}</div>}
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {f.module_override?.length>0
                              ?f.module_override.map(m=>{const ml=ALLE_MODULE.find(x=>x.key===m);return(
                                <span key={m} style={{fontSize:10,padding:"1px 7px",borderRadius:6,background:"#3B82F615",color:"#3B82F6"}}>
                                  <TI n="arrow-narrow-right" size={9}/> {ml?.label||m}
                                </span>
                              );})
                              :<span style={{fontSize:10,color:"var(--sub)",fontStyle:"italic"}}>alle Gruppen-Module</span>
                            }
                            {f.teams?.length>0&&(
                              <span style={{fontSize:10,padding:"1px 7px",borderRadius:6,background:"#F9731615",color:"#F97316"}}>
                                {f.teams.length} Team{f.teams.length!==1?"s":""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Gruppe bearbeiten Modal */}
          <ModalOrSheet open={showGruppeForm} onClose={()=>{setShowGruppeForm(false);setEditGruppe(null);}} maxWidth={500}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:gruppeForm.farbe}}/>
                  <ModalTitle>{editGruppe?"Gruppe bearbeiten":"Neue Gruppe"}</ModalTitle>
                </div>
                <button onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:16}}>
                {editGruppe?"Module und Name anpassen.":"Neue Gruppe mit Modulzugang erstellen."}
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
              {/* Name + Farbe */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Gruppenname *</label>
                  <input value={gruppeForm.name} onChange={e=>setGruppeForm(p=>({...p,name:e.target.value}))}
                    placeholder="z.B. Vereinsleben & Events" autoFocus
                    style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Farbe</label>
                  <div style={{display:"flex",gap:5}}>
                    {["#8B5CF6","#3B82F6","#22C55E","#F97316","#06B6D4","#EF4444","#F59E0B","#EC4899"].map(c=>(
                      <div key={c} onClick={()=>setGruppeForm(p=>({...p,farbe:c}))}
                        style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",
                          border:`3px solid ${gruppeForm.farbe===c?"var(--text)":"transparent"}`,
                          transition:"border 0.1s"}}/>
                    ))}
                  </div>
                </div>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={gruppeForm.beschreibung||""} onChange={e=>setGruppeForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Wofür ist diese Gruppe?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Teams */}
              {pvTeams.length>0&&(
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"block"}}>
                    Teams <span style={{fontWeight:400,fontSize:11}}>— {(gruppeForm.teams||[]).length} zugeordnet</span>
                  </label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {pvTeams.map(t=>{
                      const sel=(gruppeForm.teams||[]).includes(t.id);
                      return(
                        <button key={t.id} onClick={()=>setGruppeForm(p=>({...p,teams:sel?(p.teams||[]).filter(x=>x!==t.id):[...(p.teams||[]),t.id]}))}
                          style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${sel?gruppeForm.farbe:"var(--border)"}`,background:sel?gruppeForm.farbe+"15":"transparent",color:sel?gruppeForm.farbe:"var(--sub)",fontSize:12,fontWeight:sel?600:400,cursor:"pointer",fontFamily:FONT}}>
                          {t.kurzname||t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Module */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"block"}}>
                  Module & Zugriffstufen <span style={{fontWeight:400,fontSize:11}}>— {(gruppeForm.module||[]).length} ausgewählt</span>
                </label>
                <Col gap={4}>
                  {ALLE_MODULE.filter(m=>m.key!=="dashboard"&&m.key!=="portal").map(m=>{
                    const sel=(gruppeForm.module||[]).includes(m.key);
                    const stufe=(gruppeForm.modul_stufen||{})[m.key]||"lesen";
                    const STUFEN=["lesen","schreiben","verwalten"];
                    return(
                      <div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?gruppeForm.farbe:"var(--border)"}`,background:sel?gruppeForm.farbe+"08":"transparent"}}>
                        {/* Modul aktivieren */}
                        <button onClick={()=>setGruppeForm(p=>{
                          const cur=p.module||[];
                          const newMods=sel?cur.filter(x=>x!==m.key):[...cur,m.key];
                          const newStufen={...p.modul_stufen};
                          if(!sel) newStufen[m.key]="lesen";
                          return{...p,module:newMods,modul_stufen:newStufen};
                        })} style={{display:"flex",alignItems:"center",gap:6,flex:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",fontFamily:FONT}}>
                          <TI n={m.icon} size={13} style={{color:sel?gruppeForm.farbe:"var(--sub)",flexShrink:0}}/>
                          <span style={{fontSize:12,color:sel?gruppeForm.farbe:"var(--sub)",fontWeight:sel?600:400}}>{m.label}</span>
                        </button>
                        {/* Stufen-Toggle (nur wenn aktiv) */}
                        {sel&&(
                          <div style={{display:"flex",gap:2,flexShrink:0}}>
                            {STUFEN.map(s=>(
                              <button key={s} onClick={()=>setGruppeForm(p=>({...p,modul_stufen:{...p.modul_stufen,[m.key]:s}}))}
                                style={{padding:"2px 7px",borderRadius:5,border:`1px solid ${stufe===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:stufe===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:stufe===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:10,fontWeight:stufe===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                                {ZUGRIFF_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Col>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!gruppeForm.name.trim()) return;
                  const payload={name:gruppeForm.name.trim(),beschreibung:gruppeForm.beschreibung||"",module:gruppeForm.module||[],farbe:gruppeForm.farbe||"#8B5CF6",modul_stufen:gruppeForm.modul_stufen||{},aktiv:true};
                  if(supabase){
                    let gruppeId = editGruppe?.id;
                    if(editGruppe?.id){
                      const{error}=await supabase.from("portal_gruppen").update(payload).eq("id",editGruppe.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{data:newG,error}=await supabase.from("portal_gruppen").insert(payload).select().single();
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                      gruppeId = newG?.id;
                    }
                    // Teams speichern
                    if(gruppeId){
                      await supabase.from("portal_gruppen_teams").delete().eq("gruppe_id",gruppeId);
                      const teamRows=(gruppeForm.teams||[]).map(tid=>({gruppe_id:gruppeId,team_id:tid}));
                      if(teamRows.length>0) await supabase.from("portal_gruppen_teams").insert(teamRows);
                      const{data:freshGt}=await supabase.from("portal_gruppen_teams").select("*");
                      if(freshGt) setGruppenTeams(freshGt);
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_gruppen").select("*").order("name");
                    if(fresh) setGruppen(fresh);
                  } else {
                    if(editGruppe){
                      setGruppen(prev=>{
                        const updated=prev.map(g=>g.id===editGruppe.id?{...g,...payload}:g);
                        return updated.length>0?updated:[{id:editGruppe.id,...payload}];
                      });
                      if(selectedGruppe?.id===editGruppe.id) setSelectedGruppe(g=>({...g,...payload}));
                    } else {
                      setGruppen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowGruppeForm(false); setEditGruppe(null);
                  setSaveMsg(editGruppe?"Gruppe gespeichert":"Gruppe erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"10px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editGruppe?"Änderungen speichern":"Gruppe erstellen"}
                </button>
                <Btn onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>

          {/* Funktion bearbeiten Modal */}
          <ModalOrSheet open={showFunktionForm} onClose={()=>{setShowFunktionForm(false);setEditFunktion(null);}} maxWidth={520}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div>
                  <ModalTitle>{editFunktion?"Funktion bearbeiten":"Neue Funktion"}</ModalTitle>
                  {selectedGruppe&&<div style={{fontSize:12,color:selectedGruppe.farbe,fontWeight:600,marginTop:2}}>in {selectedGruppe.name}</div>}
                </div>
                <button onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:16}}>
                Einschränkungen innerhalb der Gruppe — leer = alles der Gruppe sichtbar.
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
              {/* Name */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Name *</label>
                <input value={funktionForm.name} onChange={e=>setFunktionForm(p=>({...p,name:e.target.value}))}
                  placeholder="z.B. Chef Anlässe" autoFocus
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={funktionForm.beschreibung||""} onChange={e=>setFunktionForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Was macht diese Funktion?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Module einschränken + Stufe überschreiben */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>
                  Module & Stufen-Override
                  <span style={{fontWeight:400,marginLeft:6,fontSize:11,color:"var(--sub)"}}>
                    Gruppen-Stufe überschreiben (nur höher)
                  </span>
                </label>
                <InfoBox text="Leer lassen = alle Module der Gruppe mit Gruppen-Stufe. Override = nur für ausgewählte Module die Stufe erhöhen." color={BL}/>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                  {(selectedGruppe?.module||ALLE_MODULE.filter(m=>m.key!=="dashboard").map(m=>m.key)).map(mk=>{
                    const m=ALLE_MODULE.find(x=>x.key===mk)||{key:mk,label:mk,icon:"circle"};
                    const gruppeStufe=(selectedGruppe?.modul_stufen||{})[mk]||"lesen";
                    const override=(funktionForm.stufe_override||{})[mk];
                    const STUFEN=["lesen","schreiben","verwalten"];
                    const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
                    return(
                      <div key={mk} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <TI n={m.icon||"circle"} size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                        <span style={{flex:1,fontSize:12,color:"var(--text)"}}>{m.label}</span>
                        {/* Gruppen-Default als Referenz */}
                        <span style={{fontSize:10,color:"var(--sub)",padding:"2px 6px",borderRadius:4,background:"var(--surface2)"}}>Gruppe: {gruppeStufe}</span>
                        {/* Override Buttons (nur höhere Stufen) */}
                        <div style={{display:"flex",gap:2}}>
                          <button onClick={()=>setFunktionForm(p=>{const ns={...p.stufe_override};delete ns[mk];return{...p,stufe_override:ns};})}
                            style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${!override?"#000":"var(--border)"}`,background:!override?"#00000010":"transparent",color:!override?"var(--text)":"var(--sub)",fontSize:9,cursor:"pointer",fontFamily:FONT}}>
                            Standard
                          </button>
                          {STUFEN.filter(s=>STUFE_RANG[s]>STUFE_RANG[gruppeStufe]).map(s=>(
                            <button key={s} onClick={()=>setFunktionForm(p=>({...p,stufe_override:{...p.stufe_override,[mk]:s}}))}
                              style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${override===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:override===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:override===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:10,fontWeight:override===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                              {ZUGRIFF_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!funktionForm.name.trim()) return;
                  const payload={
                    name:funktionForm.name.trim(),
                    beschreibung:funktionForm.beschreibung||"",
                    gruppe_id:funktionForm.gruppe_id||selectedGruppe?.id,
                    module_override:funktionForm.module_override||[],
                    stufe_override:funktionForm.stufe_override||{},
                    teams:funktionForm.teams||[],
                    filter:funktionForm.filter||{},
                    aktiv:true
                  };
                  if(supabase){
                    if(editFunktion?.id){
                      const{error}=await supabase.from("portal_funktionen").update(payload).eq("id",editFunktion.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{error}=await supabase.from("portal_funktionen").insert(payload);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe)").order("name");
                    if(fresh) setFunktionen(fresh);
                  } else {
                    if(editFunktion){
                      setFunktionen(prev=>prev.map(f=>f.id===editFunktion.id?{...f,...payload}:f));
                    } else {
                      setFunktionen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowFunktionForm(false); setEditFunktion(null);
                  setSaveMsg(editFunktion?"Funktion gespeichert":"Funktion erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"10px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editFunktion?"Änderungen speichern":"Funktion erstellen"}
                </button>
                <Btn onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>
        </div>
      )}

      {/* ── TAB: TEAM-MODULE ── */}
    </div>
  );
}
