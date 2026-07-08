/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/ModuleRechteTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate, InfoBox} from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT, STATUS_BG } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";
import { ZUGRIFF_ORDER, ZUGRIFF_LABELS, ZUGRIFF_COLORS, ZUGRIFF_ICONS, ALLE_MODULE, ROLLEN_MODULE_DEFAULT, MODUL_AKTIONEN, KAT_LABELS, ROLES } from "./portalUtils.js";

export function ModuleRechteTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,module,moduleAktiv,setModuleAktiv,moduleRechte,setModuleRechte,moduleConfig,moduleBerechtigungen,expandedModul,setExpandedModul,moduleViewMode,setModuleViewMode,moduleDirty,setModuleDirty,ALLE_MODULE,effRechte,getZugriff,setZugriffStufe,cycleZugriff,toggleModulGlobal,toggleBerechtigung,tab,ROLLEN,ROLLEN_LABELS,gruppen,zugriffStufen,setZugriffStufen,effZugriff,toggleModulRolle}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="module"&&(
        <div>
          {/* Header: InfoBox + Legende + Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <InfoBox text="Klick auf ein Modul-Name öffnet die Detail-Aktionen. Klick auf eine Stufe ändert die Berechtigung." color={BL}/>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
              {/* Legende */}
              {ZUGRIFF_ORDER.map(s=>(
                <span key={s} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:ZUGRIFF_COLORS[s]+"20",border:`1px solid ${ZUGRIFF_COLORS[s]}40`}}>
                  <TI n={ZUGRIFF_ICONS[s]} size={11} style={{color:ZUGRIFF_COLORS[s]}}/>
                  <span style={{fontSize:11,fontWeight:600,color:ZUGRIFF_COLORS[s]}}>{ZUGRIFF_LABELS[s]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* View-Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            {/* nach Modul / nach Rolle */}
            <div style={{display:"flex",border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
              {["modul","rolle"].map(v=>(
                <button key={v} onClick={()=>setModuleViewMode(v)} style={{
                  padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",
                  border:"none",fontFamily:FONT,transition:"all .15s",
                  background:moduleViewMode===v?BK:"transparent",
                  color:moduleViewMode===v?"#fff":"var(--sub)"
                }}>{v==="modul"?"nach Modul":"nach Rolle"}</button>
              ))}
            </div>
            {moduleDirty&&(
              <>
                <button onClick={async()=>{
                  if(supabase&&moduleRechte){
                    const rows=[];
                    Object.entries(moduleRechte).forEach(([rolle,module])=>{
                      ALLE_MODULE.forEach(m=>{
                        const hatZugriff=(module||[]).includes(m.key);
                        const stufe=hatZugriff?(zugriffStufen?.[rolle]?.[m.key]||effZugriff[rolle]?.[m.key]||effZugriff[rolle]?._all||"lesen"):"lesen";
                        rows.push({modul:m.key,rolle,hat_zugriff:hatZugriff,stufe});
                      });
                    });
                    const{error}=await supabase.from("modul_rechte").upsert(rows,{onConflict:"modul,rolle"});
                    if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                  }
                  try{localStorage.setItem("fch-module-rechte",JSON.stringify(moduleRechte));
                      if(zugriffStufen) localStorage.setItem("fch-zugriff-stufen",JSON.stringify(zugriffStufen));}catch{}
                  setModuleDirty(false); setSaveMsg("Gespeichert");setTimeout(()=>setSaveMsg(""),2000);
                }} style={{padding:"5px 14px",borderRadius:9,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Speichern
                </button>
                <button onClick={()=>{setModuleRechte(null);setZugriffStufen(null);setModuleDirty(false);try{localStorage.removeItem("fch-module-rechte");localStorage.removeItem("fch-zugriff-stufen");}catch{}setSaveMsg("Verworfen");setTimeout(()=>setSaveMsg(""),2000);}}
                  style={{padding:"5px 14px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--sub)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Verwerfen
                </button>
              </>
            )}
          </div>

          {/* ── ANSICHT: NACH MODUL ── */}
          {moduleViewMode==="modul"&&(()=>{
            return(
              <Card style={{padding:0,overflowX:"auto"}}>
                <table className="cc-table">
                  <thead>
                    <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                      <th className="cc-th">Modul</th>
                      {ROLLEN.map(r=>(
                        <th key={r} style={{textAlign:"center",padding:"9px 8px",fontWeight:700,
                          color:r==="administrator"?"var(--sub)":ROLES[r]?.color||"var(--sub)",
                          fontSize:11,minWidth:90,
                          background:r==="administrator"?"var(--surface2)":"transparent"
                        }}>{ROLLEN_LABELS[r]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["kern","sport","betrieb","kommunikation","verwaltung","admin"].map(kat=>{
                      const mods=ALLE_MODULE.filter(m=>m.kat===kat);
                      if(!mods.length) return null;
                      const KAT_LABELS={kern:"Kern",sport:"Sport",betrieb:"Betrieb",kommunikation:"Kommunikation",verwaltung:"Verwaltung",admin:"Systemverwaltung"};
                      return([
                        <tr key={"kat-"+kat}>
                          <td colSpan={ROLLEN.length+1} style={{padding:"6px 14px 4px",fontSize:10,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:"1px solid var(--border)"}}>{KAT_LABELS[kat]}</td>
                        </tr>,
                        ...mods.map(m=>{
                          const isAktiv=moduleAktiv[m.key]!==false;
                          const isPflicht=!!m.pflicht;
                          const isExpanded=expandedModul===m.key;
                          return([
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)",opacity:isAktiv?1:0.35,background:isPflicht?"#FFFBEB":"transparent"}}>
                              <td style={{padding:"0",position:"sticky",left:0,background:isPflicht?"#FFFBEB":isExpanded?"var(--surface2)":"var(--surface)",zIndex:1}}>
                                <div onClick={()=>setExpandedModul(isExpanded?null:m.key)}
                                  style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer"}}>
                                  <div onClick={e=>{e.stopPropagation();if(!isPflicht)toggleModulGlobal(m.key);}}
                                    title={isPflicht?"Pflichtmodul":isAktiv?"Deaktivieren":"Aktivieren"}
                                    style={{width:26,height:15,borderRadius:8,flexShrink:0,background:isPflicht?"#F59E0B":isAktiv?GN:"var(--border)",cursor:isPflicht?"not-allowed":"pointer",position:"relative",transition:"background 0.2s"}}>
                                    <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"var(--surface)",transition:"left 0.15s",left:isAktiv||isPflicht?13:2}}/>
                                  </div>
                                  <TI n={m.icon} size={13} style={{color:isPflicht?"#B45309":"var(--sub)",flexShrink:0}}/>
                                  <span style={{fontWeight:500,color:isPflicht?"#B45309":isExpanded?"var(--text)":"var(--text)",fontSize:14}}>{m.name||m.label}</span>
                                  {isPflicht&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:5,background:STATUS_BG.warn,color:"#B45309",fontWeight:600}}>Pflicht</span>}
                                  <TI n={isExpanded?"chevron-up":"chevron-down"} size={11} style={{color:"var(--sub)",marginLeft:"auto"}}/>
                                </div>
                              </td>
                              {ROLLEN.map(r=>{
                                const isAdmin=r==="administrator";
                                const stufe=getZugriff(r,m.key);
                                const hasAccess=isAktiv&&effRechte[r]?.includes(m.key);
                                const isEdited=moduleRechte&&(moduleRechte[r]?.includes(m.key))!==(ROLLEN_MODULE_DEFAULT[r]?.includes(m.key));
                                return(
                                  <td key={r} style={{textAlign:"center",padding:"7px 6px",background:isAdmin?"var(--surface2)":"transparent"}}>
                                    {r==="funktionaer"
                                      ?<span style={{fontSize:10,color:"var(--sub)",fontStyle:"italic"}}>via Gruppe</span>
                                      :(()=>{
                                        const sc=stufe?ZUGRIFF_COLORS[stufe]:"var(--border)";
                                        return(
                                          <div onClick={isAdmin?undefined:()=>{
                                            if(!isAktiv) return;
                                            if(hasAccess) cycleZugriff(r,m.key);
                                            else toggleModulRolle(m.key,r);
                                          }}
                                            title={isAdmin?"Administrator – immer vollen Zugriff":
                                              !isAktiv?"Modul inaktiv":
                                              hasAccess?(stufe==="verwalten"?`${ROLLEN_LABELS[r]}: Verwalten → klicken zum Entfernen`:`${ROLLEN_LABELS[r]}: ${ZUGRIFF_LABELS[stufe||"lesen"]} → klicken für nächste Stufe`):
                                              `${ROLLEN_LABELS[r]}: kein Zugriff → klicken für Lesen`}
                                            style={{
                                              width:hasAccess?80:22,height:24,borderRadius:6,margin:"0 auto",
                                              background:isAdmin?"var(--surface2)":hasAccess?sc+"20":"transparent",
                                              border:`${isEdited&&!isAdmin?"2px":"1px"} solid ${isAdmin?"var(--border)":hasAccess?sc:"var(--border)"}`,
                                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                                              cursor:isAdmin||!isAktiv?"not-allowed":"pointer",
                                              transition:"all 0.15s",opacity:!isAktiv?0.3:1,
                                              padding:hasAccess?"0 6px":"0"
                                            }}
                                            onMouseEnter={e=>{if(!isAdmin&&isAktiv&&!hasAccess)e.currentTarget.style.transform="scale(1.1)";}}
                                            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                                          >
                                            {hasAccess&&<><TI n={ZUGRIFF_ICONS[stufe||"lesen"]} size={11} style={{color:isAdmin?"var(--sub)":sc}}/><span style={{fontSize:10,fontWeight:600,color:isAdmin?"var(--sub)":sc}}>{ZUGRIFF_LABELS[stufe||"lesen"]}</span></>}
                                          </div>
                                        );
                                      })()
                                    }
                                  </td>
                                );
                              })}
                            </tr>,
                            isExpanded&&(
                              <tr key={m.key+"-detail"} style={{borderTop:"0.5px solid var(--border)"}}>
                                <td colSpan={ROLLEN.length+1} style={{padding:"10px 14px",background:"var(--surface2)"}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{flex:1}}>Aktionen</span>
                                    <span style={{minWidth:80,textAlign:"right"}}>Minimalstufe</span>
                                  </div>
                                  {(MODUL_AKTIONEN[m.key]||[]).map((a,ai)=>(
                                    <div key={ai} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderTop:ai>0?"0.5px solid var(--border)":"none"}}>
                                      <div style={{flex:1}}>
                                        <span style={{fontSize:12,color:"var(--text)"}}>{a.label}</span>
                                        {a.spez&&<div style={{fontSize:10,color:"var(--sub)",marginTop:2,fontStyle:"italic"}}>{a.spez}</div>}
                                        {a.note&&<div style={{fontSize:10,color:"var(--sub)",marginTop:2}}>ℹ {a.note}</div>}
                                      </div>
                                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,background:ZUGRIFF_COLORS[a.min]+"20",color:ZUGRIFF_COLORS[a.min],fontWeight:600,flexShrink:0}}>{ZUGRIFF_LABELS[a.min]}</span>
                                    </div>
                                  ))}
                                  {!MODUL_AKTIONEN[m.key]&&<span style={{fontSize:12,color:"var(--sub)"}}>Keine Detail-Aktionen definiert.</span>}
                                </td>
                              </tr>
                            )
                          ]);
                        })
                      ]);
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })()}

          {/* ── ANSICHT: NACH ROLLE ── */}
          {moduleViewMode==="rolle"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ROLLEN.filter(r=>r!=="funktionaer").map(role=>{
                const zugMods=ALLE_MODULE.filter(m=>effRechte[role]?.includes(m.key)&&moduleAktiv[m.key]!==false);
                if(!zugMods.length) return null;
                const roleInfo=ROLES[role]||{};
                return(
                  <Card key={role} style={{padding:0,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:roleInfo.color||"#888",flexShrink:0}}/>
                      <span style={{fontWeight:600,fontSize:14,color:roleInfo.color||"var(--text)"}}>{ROLLEN_LABELS[role]}</span>
                      <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>{zugMods.length} Module</span>
                    </div>
                    <table className="cc-table">
                      <thead>
                        <tr style={{background:"var(--surface2)"}}>
                          <th className="cc-th">Modul</th>
                          <th className="cc-th">Stufe</th>
                          <th className="cc-th">Kann</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zugMods.map((m,i)=>{
                          const stufe=getZugriff(role,m.key)||"lesen";
                          const kann=(MODUL_AKTIONEN[m.key]||[]).filter(a=>a.wer.includes(role)).map(a=>a.label);
                          const sc=ZUGRIFF_COLORS[stufe];
                          return(
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)"}}>
                              <td style={{padding:"8px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:7}}>
                                  <TI n={m.icon} size={13} style={{color:"var(--sub)"}}/>
                                  <span style={{fontWeight:500,fontSize:14}}>{m.name||m.label}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px"}}>
                                <div onClick={()=>{const aktiv=moduleAktiv[m.key]!==false;if(aktiv&&role!=="administrator")cycleZugriff(role,m.key);}}
                                  style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:sc+"20",border:`1px solid ${sc}50`,cursor:"pointer"}}>
                                  <TI n={ZUGRIFF_ICONS[stufe]} size={11} style={{color:sc}}/>
                                  <span style={{fontSize:10,fontWeight:600,color:sc}}>{ZUGRIFF_LABELS[stufe]}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px",fontSize:11,color:"var(--sub)"}}>{kann.length?kann.join(" · "):"Nur ansehen"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                );
              })}

              {/* Funktionär: via Gruppen */}
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:ROLES["funktionaer"]?.color||"#8B5CF6",flexShrink:0}}/>
                  <span style={{fontWeight:600,fontSize:14,color:ROLES["funktionaer"]?.color||"#8B5CF6"}}>Funktionär</span>
                  <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>Module via Gruppen & Funktionen</span>
                </div>
                <div style={{padding:"12px 16px"}}>
                  <InfoBox text="Funktionäre erhalten keinen fixen Modulzugang. Stattdessen werden ihnen Gruppen zugewiesen, welche die erlaubten Module definieren. Die Einschränkung auf bestimmte Teams oder Filter erfolgt über Funktionen innerhalb der Gruppe." color={BL}/>
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
                    {(gruppen.length>0?gruppen:[
                      {name:"Vereinsleben & Events",farbe:"#8B5CF6",module:["events","helpers","members","news","docs"]},
                      {name:"Betrieb & Infrastruktur",farbe:"#3B82F6",module:["material","buses","lockers","docs"]},
                      {name:"Kommunikation & Medien", farbe:"#22C55E",module:["media","wiki","news","docs"]},
                      {name:"Stufenleitende",          farbe:"#F97316",module:["team","training","events","attendance_central","members","helpers"]},
                      {name:"Schiedsrichterwesen",     farbe:"#06B6D4",module:["schedule","training","docs"]},
                    ]).map(g=>(
                      <div key={g.name} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:g.farbe,flexShrink:0}}/>
                        <span style={{fontWeight:500,fontSize:14,flex:1}}>{g.name}</span>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(g.module||[]).map(mk=>{
                            const mod=ALLE_MODULE.find(m=>m.key===mk);
                            return mod?<span key={mk} style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:g.farbe+"15",color:g.farbe}}>{mod.name||mod.label}</span>:null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:"var(--sub)"}}>
                    Gruppen und Module konfigurierst du unter <strong>Gruppen & Funktionen</strong>.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: GRUPPEN & FUNKTIONEN ── */}
    </div>
  );
}
