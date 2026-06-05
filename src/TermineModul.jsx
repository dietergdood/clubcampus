/* ═══════════════════════════════════════════════════════════════
   ClubCampus TermineModul — TermineModul.jsx
   An-/Abmeldung für Trainings, Spiele und Vereinsanlässe
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { ACCENT, ACCENT2, ACCENT20, AM, BK, BL, BTN_COLOR as BTN, BTN_TXT, FONT, GB, GN, GR, R, RL, STATUS_BG, STATUS_CLR } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, ModalOrSheet, Card, Chip , Stat, Av, Col, Row, SectionLabel, Btn, avColor} from "./theme.jsx";
import { ATT_EVENTS, ATT_INITIAL, GANTT, ROSTER, SCHEDULE, TABLES, TRAININGSPLAETZE_DEFAULT } from "./demoData.js";


/* ── Style-Konstanten ── */
const S_FIELD_LABEL={fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5};
const S_SUB={fontSize:13,color:"var(--sub)",marginBottom:4};
const S_INPUT={width:"100%",padding:"8px 10px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"};
const S_LIST_ITEM={padding:"10px 14px",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"};
const S_06={fontSize:13,fontWeight:600,color:"var(--text)"};
const S_07={display:"flex",gap:8,flexWrap:"wrap"};
const S_08={display:"flex",gap:12};
const S_10={display:"flex",flexDirection:"column",gap:8};

/* ── Hilfsfunktionen ── */
const NAV_TARGET={tab:null,filter:null,kindTeam:null,openEvId:null,selectedSpiel:null};

const TRAININGSPLAETZE = TRAININGSPLAETZE_DEFAULT.slice();

const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};
try{const s=localStorage.getItem("rueckennrn");if(s){const d=JSON.parse(s);Object.assign(NR_CACHE.data,d);}}catch(e){}

function getVereinsnameStatic(){try{const t=localStorage.getItem("cc-theme");return t?(JSON.parse(t).vereinsname||"ClubCampus"):"ClubCampus";}catch{return "ClubCampus";}}

function getNr(id){return NR_CACHE.data[id]||"";}

/* Hex → rgba() für Hover-Farben */

function kannTerminAbsagen(role, typ, team, meineTeams=[]){
  return kannTerminErstellen(role, typ, team, meineTeams);
}

function kannTerminBearbeiten(role, typ, team, meineTeams=[]){
  return kannTerminErstellen(role, typ, team, meineTeams);
}

function kannTerminErstellen(role, typ, team, meineTeams=[]){
  if(role==="administrator"||role==="administration") return true;
  if(role==="funktionaer") return typ==="vereinsanlass";
  if(role==="trainer"){
    if(typ==="team_event") return !team||(meineTeams||[]).includes(team);
    if(typ==="spiel")      return (meineTeams||[]).includes(team); // Treffpunkt etc.
    return false; // Trainer kann keine Vereinsanlässe erstellen
  }
  return false;
}



/* ── Demo-Daten (werden durch Supabase ersetzt) ── */

function SlotModal({slot, prefill, plan, teams, kwKey, kw, monday, ausnahmen, onSave, onDelete, onAusnahme, onClose}){
  const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
  const TEAM_COLORS_MAP={};
  (plan?.slots||[]).forEach(s=>{TEAM_COLORS_MAP[s.team]=s.color;});
  const isEdit=!!slot?.id;
  const isZusatz=slot?.isZusatz;

  // Build list of next 20 KWs from current week
  const baseMonday = monday ? new Date(monday) : new Date(2026,4,18);
  function getKWLabel(offset){
    const d = new Date(baseMonday);
    d.setDate(d.getDate() + offset*7);
    function getKW(dt){ const j=new Date(dt.getFullYear(),0,4); return Math.ceil(((dt-j)/86400000+j.getDay()+1)/7); }
    const kwNum = getKW(d);
    const dd = String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0");
    const de = new Date(d); de.setDate(de.getDate()+6);
    const de2 = String(de.getDate()).padStart(2,"0")+"."+String(de.getMonth()+1).padStart(2,"0");
    return {offset, kwNum, label:"KW "+kwNum+" ("+dd+"–"+de2+")", key:d.getFullYear()+"_"+kwNum};
  }
  const kwOptions = Array.from({length:20},function(_,i){ return getKWLabel(i); });
  const [selectedKwOffset, setSelectedKwOffset] = useState(0);
  const selectedKw = kwOptions[selectedKwOffset];

  const [form, setForm] = useState({
    weekday: slot?.weekday||(prefill?.weekday)||"Mo",
    team: slot?.team||teams[0]||"",
    start: slot?.start||(prefill?.start)||17,
    end: slot?.end||(prefill?.end)||18.5,
    ort: slot?.location||(prefill?.location)||"",
    half: slot?.half||(prefill?.half)||"",
    wechsel_zeit: slot?.wechsel_zeit||"",
    end_ort: slot?.end_ort||"",
    end_half: slot?.end_half||"",
    color: slot?.color||TEAM_COLORS_MAP[slot?.team||""]||BL,
  });
  const [ausnahmeMode, setAusnahmeMode] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [ausnahmeTyp, setAusnahmeTyp] = useState("absage");
  const [fuerAlleWochen, setFuerAlleWochen] = useState(false);
  const [verschiebungStart, setVerschiebungStart] = useState(slot?.start||17);
  const [verschiebungEnd, setVerschiebungEnd] = useState(slot?.end||18.5);
  const [verschiebungOrt, setVerschiebungOrt] = useState(slot?.location||"");
  const [verschiebungGrund, setVerschiebungGrund] = useState("");

  const TIMES = Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5);
  const fmtT = v=>`${Math.floor(v).toString().padStart(2,"0")}:${v%1===0?"00":"30"}`;

  const COLORS = ["#C8102E","#2563EB","#059669","#7C3AED","#0891B2","#D97706","#64748B","#DB2777"];

  return(
    <ModalOrSheet open onClose={onClose} maxWidth={480}>
      <div style={{padding:"0 0 8px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid var(--border)"}}>
          <div style={{fontWeight:700,fontSize:14}}>{isEdit?(isZusatz?"Zusatztraining":"Training bearbeiten"):"Training hinzufügen"}</div>
          <Btn variant="ghost" onClick={onClose} style={{fontSize:20,padding:"4px 6px",color:"var(--sub)"}}>×</Btn>
        </div>

        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {!ausnahmeMode?(
            <>
              {/* Kalenderwoche - nur bei neuen Trainings */}
              {!isEdit&&(
                <div>
                  <div style={S_FIELD_LABEL}>Kalenderwoche</div>
                  <select value={selectedKwOffset} onChange={e=>setSelectedKwOffset(parseInt(e.target.value))}
                    style={{width:"100%",padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none"}}>
                    {kwOptions.map(function(o){
                      return <option key={o.offset} value={o.offset}>{o.label}{o.offset===0?" (diese Woche)":""}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Wochentag */}
              <div>
                <div style={S_FIELD_LABEL}>Wochentag</div>
                <div style={S_07}>
                  {DAYS.map(d=>(
                    <button key={d} onClick={()=>setForm(f=>({...f,weekday:d}))}
                      style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${form.weekday===d?BK:GB}`,background:form.weekday===d?BK:"#fff",color:form.weekday===d?"#fff":"#555",fontSize:13,cursor:"pointer"}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team */}
              <div>
                <div style={S_FIELD_LABEL}>Team</div>
                <select value={form.team} onChange={e=>setForm(f=>({...f,team:e.target.value,color:TEAM_COLORS_MAP[e.target.value]||f.color}))}
                  style={S_INPUT}>
                  {teams.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Zeit */}
              <div style={S_08}>
                <div style={{flex:1}}>
                  <div style={S_FIELD_LABEL}>Von</div>
                  <select value={form.start} onChange={e=>setForm(f=>({...f,start:parseFloat(e.target.value)}))}
                    style={S_INPUT}>
                    {TIMES.map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <div style={S_FIELD_LABEL}>Bis</div>
                  <select value={form.end} onChange={e=>setForm(f=>({...f,end:parseFloat(e.target.value)}))}
                    style={S_INPUT}>
                    {TIMES.filter(t=>t>form.start).map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
              </div>

              {/* Platzeinteilung */}

                  <div style={{background:"#F8F8F6",borderRadius:8,padding:"12px",display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Platzeinteilung</div>

                    {/* Phase 1 */}
                    <div style={{background:"var(--surface)",borderRadius:8,padding:"10px 12px",border:"0.5px solid var(--border)"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10}}>
                        Phase 1
                        <span style={{fontWeight:400,color:"var(--sub)",marginLeft:6}}>
                          {fmtT(form.start)} – {form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}
                        </span>
                      </div>

                      {/* Platz Phase 1 */}
                      <div style={{marginBottom:8}}>
                        <div style={S_SUB}>Platz</div>
                        <select value={form.location} onChange={e=>setForm(f=>({...f,ort:e.target.value,half:""}))}
                          style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${form.location?GB:R+"80"}`,borderRadius:8,fontSize:13,outline:"none"}}>
                          <option value="" disabled>– Platz wählen –</option>
                          {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Seite Phase 1 */}
                      {form.location&&(TRAININGSPLAETZE.find(p=>p.name===form.location)?.halfn||[]).length>0&&(
                        <div>
                          <div style={S_SUB}>Seite</div>
                          <div style={S_07}>
                            <button onClick={()=>setForm(f=>({...f,half:""}))}
                              style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${!form.half?BK:GB}`,background:!form.half?BK:"#fff",color:!form.half?"#fff":"#555",fontSize:13,cursor:"pointer"}}>
                              Ganzer Platz
                            </button>
                            {(TRAININGSPLAETZE.find(p=>p.name===form.location)?.halfn||[]).map(h=>(
                              <button key={h} onClick={()=>setForm(f=>({...f,half:h}))}
                                style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${form.half===h?BL:GB}`,background:form.half===h?BL:"#fff",color:form.half===h?"#fff":"#555",fontSize:13,cursor:"pointer"}}>
                                {h}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wechsel-Zeitpunkt */}
                    {form.location&&(
                      <Row gap={12}>
                        <div style={{fontSize:13,color:"var(--sub)",flexShrink:0}}>Wechsel um:</div>
                        <select value={form.wechsel_zeit} onChange={e=>setForm(f=>({...f,wechsel_zeit:e.target.value?parseFloat(e.target.value):"",end_ort:"",end_half:""}))}
                          style={{flex:1,padding:"7px 10px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,outline:"none"}}>
                          <option value="">– kein Wechsel –</option>
                          {Array.from({length:(form.end-form.start)*4},(_,i)=>form.start+i*0.25+0.25).filter(t=>t<form.end).map(t=>(
                            <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{Math.round((t%1)*60).toString().padStart(2,"0")} Uhr</option>
                          ))}
                        </select>
                      </Row>
                    )}

                    {/* Phase 2 */}
                    {form.location&&form.wechsel_zeit&&(
                      <div style={{background:"var(--surface)",borderRadius:8,padding:"10px 12px",border:"0.5px solid var(--border)"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10}}>
                          Phase 2
                          <span style={{fontWeight:400,color:"var(--sub)",marginLeft:6}}>
                            {fmtT(form.wechsel_zeit)} – {fmtT(form.end)}
                          </span>
                        </div>

                        {/* Platz Phase 2 */}
                        <div style={{marginBottom:8}}>
                          <div style={S_SUB}>Platz</div>
                          <select value={form.end_ort} onChange={e=>setForm(f=>({...f,end_ort:e.target.value,end_half:""}))}
                            style={{width:"100%",padding:"7px 10px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,outline:"none"}}>
                            <option value="">– gleich wie Phase 1 ({form.location}) –</option>
                            {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Seite Phase 2 */}
                        {(TRAININGSPLAETZE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).length>0&&(
                          <div>
                            <div style={S_SUB}>Seite</div>
                            <div style={S_07}>
                              <button onClick={()=>setForm(f=>({...f,end_half:""}))}
                                style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${!form.end_half?BK:GB}`,background:!form.end_half?BK:"#fff",color:!form.end_half?"#fff":"#555",fontSize:13,cursor:"pointer"}}>
                                Ganzer Platz
                              </button>
                              {(TRAININGSPLAETZE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).map(h=>(
                                <button key={h} onClick={()=>setForm(f=>({...f,end_half:h}))}
                                  style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${form.end_half===h?BL:GB}`,background:form.end_half===h?BL:"#fff",color:form.end_half===h?"#fff":"#555",fontSize:13,cursor:"pointer"}}>
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Zusammenfassung */}
                    {form.location&&(
                      <div style={{fontSize:13,color:"var(--sub)",padding:"8px 10px",background:"var(--surface)",borderRadius:6,lineHeight:1.7}}>
                        <div>
                          <strong>{fmtT(form.start)}–{form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}</strong>
                          {" "}{form.location}{form.half?" / "+form.half:" / Ganzer Platz"}
                        </div>
                        {form.wechsel_zeit&&(
                          <div>
                            <strong>{fmtT(form.wechsel_zeit)}–{fmtT(form.end)}</strong>
                            {" "}{form.end_ort||form.location}{form.end_half?" / "+form.end_half:" / Ganzer Platz"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

              {/* Farbe */}
              <div>
                <div style={S_FIELD_LABEL}>Farbe</div>
                <Row align="flex-start">
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #1A1A1A":"2px solid transparent",cursor:"pointer"}}/>
                  ))}
                </Row>
              </div>

              {/* Aktionen */}
              {showSaveDialog ? (
                <div style={{background:"#F8F8F6",borderRadius:10,padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{isEdit?"Änderung übernehmen für:":"Training gilt:"}</div>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:true, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${BL}`,background:"var(--surface)",color:BL,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Nur diese Woche</div>
                    <div style={{fontSize:13,fontWeight:400,color:"var(--sub)",marginTop:2}}>{isEdit?"Wird als Ausnahme gespeichert":"Einmaliger Zusatztermin"}</div>
                  </button>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:false, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"10px 18px",borderRadius:10,border:`1.5px solid ${BK}`,background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Dauerhaft (neuer Standard)</div>
                    <div style={{fontSize:13,fontWeight:400,color:"rgba(255,255,255,0.7)",marginTop:2}}>
                      {isEdit?"Gilt fur alle zukunftigen Wochen":"Ab "+selectedKw.label+" bis Ende des Trainingsplans"}
                    </div>
                  </button>
                  <button onClick={()=>setShowSaveDialog(false)}
                    style={{padding:"8px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={()=>{ if(!form.location){alert("Bitte einen Platz auswählen.");return;} setShowSaveDialog(true); }}
                    style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:form.location?BK:"#ccc",color:"#fff",fontSize:13,fontWeight:600,cursor:form.location?"pointer":"not-allowed"}}>
                    {isEdit?"Speichern":"Hinzufügen"}
                  </button>
                </div>
              )}

              {isEdit&&!isZusatz&&(
                <Row align="flex-start">
                  <button onClick={()=>setAusnahmeMode(true)}
                    style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                    <TI n="bolt"/> Ausnahme diese Woche
                  </button>
                  <button onClick={onDelete}
                    style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${R}`,background:RL,color:R,fontSize:13,cursor:"pointer"}}>
                    Löschen
                  </button>
                </Row>
              )}
            </>
          ):(
            /* Ausnahme-Modus */
            <>
              <div style={{padding:"10px 12px",background:"var(--surface)",borderRadius:8,border:"1px solid #FED7AA",fontSize:13,color:STATUS_CLR.warn}}>
                <strong>{slot?.team} · {slot?.weekday}</strong> - Ausnahme für diese Woche (oder als neuer Standard).
              </div>

              {/* Typ-Auswahl */}
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Typ</div>
                <div style={S_07}>
                  {[{v:"absage",l:"Absagen",icon:"✕"},{v:"verschiebung",l:"Verschieben",icon:"⏰"},{v:"location",l:"Ort ändern",icon:"map-pin"}].map(t=>(
                    <button key={t.v} onClick={()=>setAusnahmeTyp(t.v)}
                      style={{flex:1,padding:"8px 14px",borderRadius:8,border:`1.5px solid ${ausnahmeTyp===t.v?(t.v==="absage"?R:BL):GB}`,background:ausnahmeTyp===t.v?(t.v==="absage"?RL:"#EFF6FF"):"#fff",color:ausnahmeTyp===t.v?(t.v==="absage"?R:BL):"#555",fontSize:13,cursor:"pointer",minWidth:80}}>
                      {t.icon} {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verschiebung: neue Zeit */}
              {ausnahmeTyp==="verschiebung"&&(
                <div style={S_08}>
                  <div style={{flex:1}}>
                    <div style={S_FIELD_LABEL}>Neue Zeit von</div>
                    <select value={verschiebungStart} onChange={e=>setVerschiebungStart(parseFloat(e.target.value))}
                      style={S_INPUT}>
                      {Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5).map(t=>(
                        <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{t%1===0?"00":"30"}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S_FIELD_LABEL}>Bis</div>
                    <select value={verschiebungEnd} onChange={e=>setVerschiebungEnd(parseFloat(e.target.value))}
                      style={S_INPUT}>
                      {Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5).filter(t=>t>verschiebungStart).map(t=>(
                        <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{t%1===0?"00":"30"}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Ort ändern */}
              {ausnahmeTyp==="location"&&(
                <div>
                  <div style={S_FIELD_LABEL}>Neuer Platz</div>
                  <select value={verschiebungOrt} onChange={e=>setVerschiebungOrt(e.target.value)}
                    style={S_INPUT}>
                    <option value="" disabled>- Platz wählen (Pflichtfeld) -</option>
                    {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Begründung */}
              <div>
                <div style={S_FIELD_LABEL}>Begründung <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span></div>
                <input value={verschiebungGrund} onChange={e=>setVerschiebungGrund(e.target.value)}
                  placeholder="z.B. Platz für Spiel benötigt"
                  style={S_INPUT}/>
              </div>

              {/* Als Standard */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"var(--surface2)",borderRadius:8}}>
                <input type="checkbox" id="fuerAlle" checked={fuerAlleWochen} onChange={e=>setFuerAlleWochen(e.target.checked)}
                  style={{width:16,height:16,cursor:"pointer"}}/>
                <label htmlFor="fuerAlle" style={{fontSize:13,cursor:"pointer"}}>
                  Als neuer Standard übernehmen (alle zukünftigen Wochen)
                </label>
              </div>

              <Row align="flex-start">
                <button onClick={()=>onAusnahme({
                  type:ausnahmeTyp,
                  slot_id:slot.id,
                  weekday:slot.weekday,
                  team:slot.team,
                  ...(ausnahmeTyp==="verschiebung"?{neue_start:verschiebungStart,neue_end:verschiebungEnd}:{}),
                  ...(ausnahmeTyp==="location"?{neuer_ort:verschiebungOrt}:{}),
                  begruendung:verschiebungGrund,
                },fuerAlleWochen)}
                  style={{flex:1,padding:"8px 14px",borderRadius:10,border:"none",background:ausnahmeTyp==="absage"?R:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {ausnahmeTyp==="absage"?"Absagen":ausnahmeTyp==="verschiebung"?"Verschieben":"Ort ändern"}
                </button>
                <button onClick={()=>setAusnahmeMode(false)}
                  style={{padding:"10px 18px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",fontSize:13,cursor:"pointer"}}>
                  Zurück
                </button>
              </Row>
            </>
          )}
        </div>
      </div>
    </ModalOrSheet>
  );
}

/* -- Plan-Editor-Modal -- */
function PlanEditorModal({plan, plaene, onSave, onClose}){
  const [form, setForm] = useState({
    name: plan?.name||"Neuer Trainingsplan",
    valid_from: plan?.valid_from||new Date().toISOString().split("T")[0],
    valid_until: plan?.valid_until||"",
    active: plan?.active??true,
  });

  return(
    <ModalOrSheet open onClose={onClose} maxWidth={480}>
      <div style={{padding:"0 0 8px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid var(--border)"}}>
          <div style={{fontWeight:700,fontSize:14}}>{plan?.id?"Plan bearbeiten":"Neuer Plan"}</div>
          <Btn variant="ghost" onClick={onClose} style={{fontSize:20,padding:"4px 6px",color:"var(--sub)"}}>×</Btn>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div style={S_FIELD_LABEL}>Name</div>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              style={S_INPUT}/>
          </div>
          <div style={S_08}>
            <div style={{flex:1}}>
              <div style={S_FIELD_LABEL}>Gültig ab</div>
              <input type="date" value={form.valid_from} onChange={e=>setForm(f=>({...f,valid_from:e.target.value}))}
                style={S_INPUT}/>
            </div>
            <div style={{flex:1}}>
              <div style={S_FIELD_LABEL}>Gültig bis</div>
              <input type="date" value={form.valid_until} onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))}
                style={S_INPUT}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"var(--surface2)",borderRadius:8}}>
            <input type="checkbox" id="planAktiv" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}
              style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="planAktiv" style={{fontSize:13,cursor:"pointer"}}>Plan aktiv (erscheint bei Teams als Termine)</label>
          </div>
          <button onClick={()=>onSave(form)}
            style={{width:"100%",padding:"12px 20px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Speichern
          </button>
        </div>
      </div>
    </ModalOrSheet>
  );
}

/* -- Spiel-Detailansicht Modal (FVRZ-Stil) -- */
/* -- Spiel-Detailansicht Modal (FVRZ-Stil) -- */
function SpielDetail({spiel,onClose,canEdit,motmAll:motmAllProp,setMotmAll:setMotmAllProp}){
  const isMobile=useIsMobile();
  const played=!!spiel.result;
  const [activeTab,setActiveTab]=useState("info");

  /* motmVotes from parent - persists across modal open/close */
  const motmAll=motmAllProp||{};
  const setMotmAll=setMotmAllProp||(()=>{});
  const myVoterKey="current_user";
  const myVotes=new Set(Object.entries(motmAll[spiel?.id]||{}).filter(([k,v])=>k===myVoterKey).map(([k,v])=>v));
  const myVote=null; /* kept for compat */
  const voteCounts=(roster)=>{
    const gameVotes=motmAll[spiel?.id]||{};
    return roster.reduce((acc,p)=>{
      acc[p.id]=Object.values(gameVotes).filter(v=>v===p.id).length;
      return acc;
    },{});
  };
  const castVote=(pid)=>{
    setMotmAll(prev=>{
      const gameVotes={...(prev[spiel.id]||{})};
      /* Each voter gets a unique key per voted player */
      const voteKey=myVoterKey+"_"+pid;
      if(gameVotes[voteKey]) delete gameVotes[voteKey];
      else gameVotes[voteKey]=pid;
      return {...prev,[spiel.id]:gameVotes};
    });
  };
  const isVotedFor=(pid)=>{
    const gameVotes=motmAll[spiel?.id]||{};
    return !!gameVotes[myVoterKey+"_"+pid];
  };
  const [stats,setStats]=useState(()=>{
    const base=spiel.stats||{kader:[],tore:[],assists:[],karten:[],wechsel:[]};
    return base;
  });

  /* Load aufgebotState and auto-populate kader if empty */
  useEffect(()=>{
    if(stats.kader.length>0) return;
    (async()=>{
      try{
        const r=await window.storage.get("aufgebot_state");
        if(r){
          const aufgebotState=JSON.parse(r.value);
          const attEv=ATT_EVENTS.find(e=>e.date===spiel.date&&e.type==="Spiel"&&
            (e.opponent===spiel.opponent||e.team===spiel.team));
          if(attEv){
            const aufgebotIds=(aufgebotState[attEv.id]||[]).filter(id=>
              ROSTER.find(p=>p.id===id&&(p.teams||[]).includes(spiel.team||"")&&!p.role)
            );
            if(aufgebotIds.length>0) setStats(s=>({...s,kader:aufgebotIds}));
          }
        }
      }catch(e){}
    })();
  },[]);
  const [editMode,setEditMode]=useState(false);
  const [newTor,setNewTor]=useState({spieler:"",min:"",kaderName:""});
  const [newAssist,setNewAssist]=useState({spieler:"",min:""});
  const [newKarte,setNewKarte]=useState({spieler:"",min:"",type:"gelb"});
  const [newWechsel,setNewWechsel]=useState({raus:"",rein:"",min:""});

  const teamRosterNames=ROSTER.filter(p=>(p.teams||[]).includes(spiel.team||"")).map(p=>p.name);
  const spielerNamen=teamRosterNames.length>0?teamRosterNames:ROSTER.map(p=>p.name);
  const kaderNamen=stats.kader.map(id=>ROSTER.find(p=>p.id===id)?.name).filter(Boolean);

  const KARTEN_STYLE={
    "gelb":     {bg:"#FCD34D",color:"#78350F",label:"Gelb"},
    "gelb-rot": {bg:"#F97316",color:"#fff",  label:"Gelb-Rot"},
    "rot":      {bg:"#C8102E",color:"#fff",  label:"Rot"},
  };

  const ST=({children})=>(<SectionLabel>{children}</SectionLabel>);
  const IR=({label,value})=>(<div style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}><span style={{fontSize:13,color:"var(--sub)",flexShrink:0,minWidth:130}}>{label}</span><span style={{fontSize:13,fontWeight:600,textAlign:"right"}}>{value||"-"}</span></div>);
  const EZ=({icon,text,min,onDelete})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
      <span style={{fontSize:13,color:"var(--sub)",minWidth:28,fontWeight:600,flexShrink:0}}>{icon}</span>
      <span style={{flex:1,fontSize:13}}>{text}</span>
      {min&&<span style={{fontSize:13,color:"var(--sub)",flexShrink:0}}>{min}{"'"}</span>}
      {editMode&&onDelete&&<Btn variant="ghost" onClick={onDelete} style={{color:"var(--sub)"}}>{"x"}</Btn>}
    </div>
  );
  const AR=({children,onAdd})=>(<div style={{display:"flex",gap:8,marginTop:7,flexWrap:"wrap",alignItems:"center"}}>{children}<button onClick={onAdd} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:700,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",cursor:"pointer"}}>+ Add</button></div>);
  const SS=({value,onChange,options,placeholder,style={}})=>(<select value={value} onChange={e=>onChange(e.target.value)} style={{padding:"3px 6px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,outline:"none",...style}}><option value="">{placeholder||"-"}</option>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select>);
  const MI=({value,onChange})=>(<input type="number" min="1" max="90" placeholder="Min" value={value} onChange={e=>onChange(e.target.value)} style={{width:46,padding:"3px 6px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,outline:"none"}}/>);

  return(
    <div onClick={onClose} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"var(--surface)",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:"20px 22px 0",position:"sticky",top:0,zIndex:1}}>
          {/* Top row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{color:"rgba(0,0,0,0.45)",fontSize:13,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:4}}>{spiel.comp}</div>
              <div style={{color:BK,fontWeight:800,fontSize:18,lineHeight:1.15}}>{getVereinsnameStatic()}</div>
              <div style={{color:"rgba(0,0,0,0.55)",fontSize:13,marginTop:1}}>vs. {spiel.opponent}</div>
            </div>
            {played?(
              <div style={{display:"none"}}/>
            ):(
              <div style={{display:"none"}}/>
            )}
            <button onClick={onClose} style={{background:"rgba(0,0,0,0.1)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"var(--surface2)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
          </div>
          {/* Meta strip */}
          <div style={{display:"flex",gap:16,paddingBottom:14,fontSize:13,color:"rgba(0,0,0,0.55)"}}>
            <span><TI n="calendar" style={{marginRight:3}}/> {spiel.date}</span>
            <span><TI n="clock" style={{marginRight:3}}/> {spiel.time} Uhr</span>
            <span>{spiel.home?"Heim":"Auswärts"}</span>
            {spiel.att&&<span><TI n="users" style={{marginRight:3}}/> {spiel.att} Spieler</span>}
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginTop:-1}}>
            {[{key:"info",label:"Spielinfo"},{key:"stats",label:played?"Statistik":"Startaufstellung"},...(played?[{key:"motm",label:"Player of the Match"}]:[])].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{padding:"8px 14px",border:"none",borderRadius:"10px 10px 0 0",background:activeTab===t.key?"#fff":"transparent",color:activeTab===t.key?BK:"rgba(0,0,0,0.5)",fontWeight:activeTab===t.key?700:500,cursor:"pointer",fontSize:13,transition:"all 0.1s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"18px 22px"}}>
          {/* -- Spielinfo -- */}
          {activeTab==="info"&&(
            <Col gap={12}>

              {/* Ergebnis-Banner für gespielte Spiele */}
              {played&&(
                <div style={{background:"linear-gradient(135deg,#3B82F6 0%,#60A5FA 100%)",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>Endergebnis</div>
                    <div style={{fontSize:24,fontWeight:800,color:"#fff",letterSpacing:3,lineHeight:1}}>{spiel.result}</div>
                    {spiel.htResult&&<div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>Halbzeit: {spiel.htResult}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{spiel.home?"Heimspiel":"Auswärtsspiel"}</div>
                    {spiel.att&&<div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}><TI n="users" style={{marginRight:3}}/> {spiel.att} Spieler</div>}
                    <div style={{marginTop:8}}><span style={{background:spiel.result?.split(":")[0]>spiel.result?.split(":")[1]?"#16A34A":spiel.result?.split(":")[0]===spiel.result?.split(":")[1]?"#F3F4F6":"#DC2626",color:"#fff",fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{spiel.result?.split(":")[0]>spiel.result?.split(":")[1]?"Sieg":spiel.result?.split(":")[0]===spiel.result?.split(":")[1]?"Unentschieden":"Niederlage"}</span></div>
                  </div>
                </div>
              )}

              {/* Ort & Treffpunkt */}
              <div style={{display:"grid",gridTemplateColumns:spiel.treffpunkt?"1fr 1fr":"1fr",gap:12}}>
                <div style={{background:"var(--surface2)",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:21}}><TI n="map-pin"/></span>
                  <div>
                    <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Spielort</div>
                    <div style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{spiel.venue}</div>
                    <div style={S_SUB}>{spiel.venueAddr}</div>
                  </div>
                </div>
                {spiel.treffpunkt&&(
                  <div style={{background:"var(--surface)",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,border:"0.5px solid #DBEAFE"}}>
                    <span style={{fontSize:21}}><TI n="target"/></span>
                    <div>
                      <div style={{fontSize:13,color:BL,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Treffpunkt</div>
                      <div style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{spiel.treffpunkt}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spielinfos kompakt */}
              <div style={{background:"var(--surface2)",borderRadius:12,overflow:"hidden"}}>
                <div style={S_LIST_ITEM}>
                  <span style={S_SUB}>Wettbewerb</span>
                  <span style={S_06}>{spiel.comp}</span>
                </div>
                <div style={S_LIST_ITEM}>
                  <span style={S_SUB}>Spielnummer</span>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)",fontFamily:"monospace"}}>{spiel.spielNr}</span>
                </div>
                <div style={S_LIST_ITEM}>
                  <span style={S_SUB}>Datum &amp; Zeit</span>
                  <span style={S_06}>{spiel.date} · {spiel.time} Uhr</span>
                </div>
                <div style={S_LIST_ITEM}>
                  <span style={S_SUB}>Heim / Gast</span>
                  <span style={S_06}>{spiel.home?getVereinsnameStatic():getVereinsnameStatic()} <span style={{color:"var(--sub)",fontWeight:400}}>vs.</span> {spiel.opponent}</span>
                </div>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={S_SUB}>Status</span>
                  <span style={{background:"var(--surface)",color:"#065F46",fontSize:13,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{spiel.status}</span>
                </div>
              </div>

              {/* Offizielle */}
              <div style={{background:"var(--surface2)",borderRadius:12,overflow:"hidden"}}>
                <div style={S_LIST_ITEM}>
                  <span style={S_SUB}><TI n="scale"/> Schiedsrichter</span>
                  <span style={S_06}>{spiel.schiedsrichter||"-"}</span>
                </div>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={S_SUB}>≡ Delegierter</span>
                  <span style={S_06}>{spiel.delegierter||"-"}</span>
                </div>
              </div>

              {spiel.notes&&<div style={{background:"var(--surface)",borderRadius:10,padding:"10px 14px",fontSize:13,color:STATUS_CLR.warn,border:"0.5px solid #FDE68A",display:"flex",gap:8,alignItems:"flex-start"}}><span>⚠</span><span>{spiel.notes}</span></div>}
              <div style={{padding:"8px 12px",background:"#F0F9FF",borderRadius:8,fontSize:13,color:BL,display:"flex",gap:8,alignItems:"center"}}><span><TI n="refresh"/></span><span>Synchronisiert mit <strong>fvrz.ch</strong> · {spiel.spielNr}</span></div>
            </Col>
          )}

          {/* -- Statistik -- */}
          {activeTab==="stats"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={S_SUB}>Manuell erfasst · nicht von FVRZ</div>
                {canEdit&&<button onClick={()=>setEditMode(v=>!v)} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:`0.5px solid ${editMode?GN:GB}`,background:editMode?"#F0FDF4":"#fff",color:editMode?GN:BL}}>{editMode?"Fertig ✓":"Bearbeiten"}</button>}
              </div>

              <ST>Kader ({stats.kader.length} Spieler · {stats.kader.length-(stats.ersatz||[]).length} Start · {(stats.ersatz||[]).filter(id=>stats.kader.includes(id)).length} Ersatz)</ST>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:4}}>
                {[...stats.kader]
                  .map(id=>ROSTER.find(r=>r.id===id))
                  .filter(Boolean)
                  .sort((a,b)=>{
                    const na=getNr(a.id)?parseInt(getNr(a.id)):null;
                    const nb=getNr(b.id)?parseInt(getNr(b.id)):null;
                    if(na!==null&&nb!==null) return na-nb;
                    if(na!==null) return -1;
                    if(nb!==null) return 1;
                    return String(a.lastName||'').localeCompare(String(b.lastName||''));
                  })
                  .map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,background:"var(--surface2)",borderRadius:6,padding:"5px 10px"}}>
                      <span style={{fontSize:13,fontWeight:700,color:getNr(p.id)?R:"#ccc",minWidth:22,textAlign:"right"}}>{getNr(p.id)||"-"}</span>
                      <Av name={p.name} size={20} bg={(stats.ersatz||[]).includes(p.id)?"#9CA3AF":"#16A34A"}/>
                      <span style={{fontSize:13,fontWeight:600,flex:1}}>{p.firstName} {p.lastName}</span>
                      {/* Start / Ersatz toggle */}
                      {canEdit?(
                        <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"0.5px solid var(--border)",flexShrink:0}}>
                          <button onClick={()=>setStats(s=>({...s,ersatz:(s.ersatz||[]).filter(x=>x!==p.id)}))}
                            style={{padding:"2px 7px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",background:!(stats.ersatz||[]).includes(p.id)?"#16A34A":"#fff",color:!(stats.ersatz||[]).includes(p.id)?"#fff":"#888"}}>
                            Start
                          </button>
                          <button onClick={()=>setStats(s=>({...s,ersatz:[...(s.ersatz||[]).filter(x=>x!==p.id),p.id]}))}
                            style={{padding:"2px 7px",fontSize:13,fontWeight:700,border:"none",borderLeft:`0.5px solid ${GB}`,cursor:"pointer",background:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#fff",color:(stats.ersatz||[]).includes(p.id)?"#fff":"#888"}}>
                            Ersatz
                          </button>
                        </div>
                      ):(
                        <span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:6,background:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#DCFCE7",color:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#16A34A",border:`0.5px solid ${(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#16A34A60"}`,flexShrink:0}}>
                          {(stats.ersatz||[]).includes(p.id)?"Ersatz":"Start"}
                        </span>
                      )}
                      {editMode&&<button onClick={()=>setStats(s=>({...s,kader:s.kader.filter(x=>x!==p.id)}))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--sub)",fontSize:14,padding:"0 2px"}}>{"x"}</button>}
                    </div>
                  ))
                }
              </div>
              {editMode&&<AR onAdd={()=>{const p=ROSTER.find(r=>r.name===newTor.kaderName);if(p&&!stats.kader.includes(p.id))setStats(s=>({...s,kader:[...s.kader,p.id]}));setNewTor(t=>({...t,kaderName:""}));}}><SS value={newTor.kaderName||""} onChange={v=>setNewTor(t=>({...t,kaderName:v}))} options={spielerNamen.filter(n=>!kaderNamen.includes(n))} placeholder="Spieler auswählen"/></AR>}

              {!played&&<div style={{padding:"10px 12px",background:"var(--surface)",borderRadius:8,fontSize:13,color:BL,marginTop:8}}>≡ Startaufstellung - Tore, Assists und Karten können nach dem Spiel erfasst werden.</div>}

              {played&&<><ST>Tore ({stats.tore.length})</ST>
              {stats.tore.length===0&&!editMode&&<div style={S_SUB}>Keine Tore erfasst.</div>}
              {stats.tore.map((t,i)=>(
                <EZ key={i} icon="Tor" text={t.eigentor?t.spieler+" (Eigentor)":t.spieler} min={t.min} onDelete={()=>setStats(s=>({...s,tore:s.tore.filter((_,j)=>j!==i)}))}/>
              ))}
              {editMode&&<AR onAdd={()=>{if(!newTor.spieler)return;setStats(s=>({...s,tore:[...s.tore,{spieler:newTor.spieler,min:newTor.min||"",eigentor:false}]}));setNewTor(t=>({...t,spieler:"",min:""}));}}><SS value={newTor.spieler} onChange={v=>setNewTor(t=>({...t,spieler:v}))} options={spielerNamen} placeholder="Torschütze"/><MI value={newTor.min} onChange={v=>setNewTor(t=>({...t,min:v}))}/></AR>}

              <ST>Assists ({stats.assists.length})</ST>
              {stats.assists.length===0&&!editMode&&<div style={S_SUB}>Keine Assists erfasst.</div>}
              {stats.assists.map((a,i)=>(
                <EZ key={i} icon="Ass" text={a.spieler} min={a.min} onDelete={()=>setStats(s=>({...s,assists:s.assists.filter((_,j)=>j!==i)}))}/>
              ))}
              {editMode&&<AR onAdd={()=>{if(!newAssist.spieler)return;setStats(s=>({...s,assists:[...s.assists,{spieler:newAssist.spieler,min:newAssist.min||""}]}));setNewAssist({spieler:"",min:""});}}><SS value={newAssist.spieler} onChange={v=>setNewAssist(a=>({...a,spieler:v}))} options={spielerNamen} placeholder="Spieler"/><MI value={newAssist.min} onChange={v=>setNewAssist(a=>({...a,min:v}))}/></AR>}

              <ST>Karten ({stats.karten.length})</ST>
              {stats.karten.length===0&&!editMode&&<div style={S_SUB}>Keine Karten erfasst.</div>}
              {stats.karten.map((k,i)=>{
                const ks=KARTEN_STYLE[k.type]||KARTEN_STYLE["gelb"];
                const karteBadge=<span style={{background:ks.bg,color:ks.color,fontSize:13,fontWeight:700,padding:"1px 5px",borderRadius:4}}>{ks.label}</span>;
                return <EZ key={i} icon={karteBadge} text={k.spieler} min={k.min} onDelete={()=>setStats(s=>({...s,karten:s.karten.filter((_,j)=>j!==i)}))}/>;
              })}
              {editMode&&<AR onAdd={()=>{if(!newKarte.spieler)return;setStats(s=>({...s,karten:[...s.karten,{spieler:newKarte.spieler,min:newKarte.min||"",type:newKarte.type}]}));setNewKarte({spieler:"",min:"",type:"gelb"});}}><SS value={newKarte.spieler} onChange={v=>setNewKarte(k=>({...k,spieler:v}))} options={spielerNamen} placeholder="Spieler"/><SS value={newKarte.type} onChange={v=>setNewKarte(k=>({...k,type:v}))} options={[{value:"gelb",label:"Gelb"},{value:"gelb-rot",label:"Gelb-Rot"},{value:"rot",label:"Rot"}]}/><MI value={newKarte.min} onChange={v=>setNewKarte(k=>({...k,min:v}))}/></AR>}

              <ST>Ein-/Auswechslungen ({stats.wechsel.length})</ST>
              {stats.wechsel.length===0&&!editMode&&<div style={S_SUB}>Keine Wechsel erfasst.</div>}
              {stats.wechsel.map((w,i)=>{
                const wText=(
                  <span style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:R}}>{"Raus: "+w.raus}</span>
                    <span style={{color:"var(--sub)"}}>{"/"}</span>
                    <span style={{color:GN}}>{"Rein: "+w.rein}</span>
                  </span>
                );
                return <EZ key={i} icon="Wec" text={wText} min={w.min} onDelete={()=>setStats(s=>({...s,wechsel:s.wechsel.filter((_,j)=>j!==i)}))}/>;
              })}
              {editMode&&<AR onAdd={()=>{if(!newWechsel.raus||!newWechsel.rein)return;setStats(s=>({...s,wechsel:[...s.wechsel,{raus:newWechsel.raus,rein:newWechsel.rein,min:newWechsel.min||""}]}));setNewWechsel({raus:"",rein:"",min:""});}}><SS value={newWechsel.raus} onChange={v=>setNewWechsel(w=>({...w,raus:v}))} options={spielerNamen} placeholder="Raus"/><SS value={newWechsel.rein} onChange={v=>setNewWechsel(w=>({...w,rein:v}))} options={spielerNamen} placeholder="Rein"/><MI value={newWechsel.min} onChange={v=>setNewWechsel(w=>({...w,min:v}))}/></AR>}

              <div style={{marginTop:12,padding:"7px 11px",background:"var(--surface2)",borderRadius:8,fontSize:13,color:"var(--sub)"}}>Manuell durch Trainer erfasst · nicht Teil der FVRZ-Synchronisation</div>
              </>}
            </div>
          )}

          {/* -- Player of the Match -- */}
          {activeTab==="motm"&&played&&(()=>{
            const roster=ROSTER.filter(p=>(p.teams||[]).includes(spiel.team)&&!p.role);
            const counts=voteCounts(roster);
            const maxV=Math.max(0,...roster.map(p=>counts[p.id]||0));
            const sorted=[...roster].sort((x,y)=>(counts[y.id]||0)-(counts[x.id]||0));

            /* Build top-3 rank groups */
            const topGroups=[];
            let rank=1,idx=0;
            while(idx<sorted.length&&rank<=3){
              const vv=counts[sorted[idx].id]||0;
              if(vv===0) break;
              const grp=sorted.filter(pl=>counts[pl.id]===vv);
              topGroups.push({rank,votes:vv,players:grp});
              idx+=grp.length;
              rank+=grp.length;
            }
            const medals=["①","②","③"];
            const gradients=["linear-gradient(135deg,#FEF3C7,#FDE68A)","linear-gradient(135deg,#F3F4F6,#E5E7EB)","linear-gradient(135deg,#FEF9EE,#FDE68A80)"];
            const borders=[AM,"#9CA3AF","#D97706"];

            return(
              <div>
                {/* Podium */}
                <div style={{marginBottom:16}}>
                  {topGroups.length===0&&<div style={{fontSize:13,color:"var(--sub)",padding:"12px",background:"var(--surface2)",borderRadius:8,textAlign:"center",marginBottom:12}}>Noch keine Stimmen abgegeben</div>}
                  {topGroups.map((grp,gi)=>(
                    <div key={gi} style={{background:gradients[gi],border:`1px solid ${borders[gi]}`,borderRadius:10,padding:"11px 16px",marginBottom:6}}>
                      <div style={{fontSize:13,fontWeight:700,color:borders[gi],textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{medals[gi]} Platz {grp.rank}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {grp.players.map(pl=>(
                            <div key={pl.id} style={{display:"flex",alignItems:"center",gap:8}}>
                              <Av name={pl.name} size={24} bg={gi===0?AM:"#9CA3AF"}/>
                              <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{pl.firstName} {pl.lastName}</span>
                            </div>
                          ))}
                        </div>
                        <span style={{fontSize:13,color:borders[gi],fontWeight:600}}>{grp.votes} {grp.votes===1?"Stimme":"Stimmen"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Voting list */}
                <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Abstimmen</div>
                <div style={S_10}>
                  {roster.map(pl=>{
                    const vv=counts[pl.id]||0;
                    const isVoted=isVotedFor(pl.id);
                    const barPct=maxV>0?Math.round(vv/maxV*100):0;
                    return(
                      <div key={pl.id} onClick={()=>castVote(pl.id)}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,border:`1.5px solid ${isVoted?AM:GB}`,background:isVoted?"#FFFBEB":"#fff",cursor:"pointer"}}>
                        <Av name={pl.name} size={28} bg={isVoted?AM:R}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <span style={{fontWeight:isVoted?700:500,fontSize:13}}>{pl.firstName} {pl.lastName}</span>
                            <span style={{fontSize:13,fontWeight:700,color:isVoted?AM:"#aaa"}}>{vv>0?vv+(vv===1?" Stimme":" Stimmen"):""}</span>
                          </div>
                          <div style={{height:4,background:"var(--surface2)",borderRadius:2}}>
                            <div style={{height:"100%",width:barPct+"%",background:isVoted?AM:"#F3F4F6",borderRadius:2}}/>
                          </div>
                        </div>
                        {isVoted&&<span style={{fontSize:16}}>⭐</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:12,padding:"7px 11px",background:"var(--surface2)",borderRadius:8,fontSize:13,color:"var(--sub)"}}>Jeder Spieler kann einmal abstimmen · Ergebnis nach Spielschluss sichtbar</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}



function SpielplanModul({role,team,initialSelected}){
  const isMobile=useIsMobile();
  const [selected,setSelected]=useState(initialSelected||null);
  const canEdit=["trainer","administrator","administration"].includes(role);
  const parseGDate=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";}
  useEffect(()=>{
    if(NAV_TARGET.selectedSpiel){
      setSelected(NAV_TARGET.selectedSpiel);
      NAV_TARGET.selectedSpiel=null;
    }
  },[]);
  const allGames=team ? SCHEDULE.filter(g=>g.team===team) : SCHEDULE;
  const playedGames=allGames.filter(g=>g.result).sort((a,b)=>parseGDate(a.date).localeCompare(parseGDate(b.date)));
  const upcomingGames=allGames.filter(g=>!g.result).sort((a,b)=>parseGDate(a.date).localeCompare(parseGDate(b.date)));
  const games=[...playedGames,...upcomingGames];
  const [motmAll,setMotmAll]=useState({
    4:{"demo_voter1":1,"demo_voter2":2,"demo_voter3":2,"demo_voter4":5},
    5:{"demo_voter1":2,"demo_voter2":1,"demo_voter3":3},
  });
  return(
    <>
      {selected&&<SpielDetail spiel={selected} onClose={()=>setSelected(null)} canEdit={canEdit} motmAll={motmAll} setMotmAll={setMotmAll}/>}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table className="cc-table">
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {["Datum","Zeit","Gegner","H/A","Ort","Wettbewerb","Resultat",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((g,i)=>(
              <tr
                key={g.id}
                onClick={()=>setSelected(g)}
                className="hov-row"
                style={{borderTop:"0.5px solid var(--border)",background:g.result?"var(--surface2)":"var(--surface)",cursor:"pointer",height:isMobile?52:40}}>
                <td style={{padding:"11px 13px",fontWeight:600,whiteSpace:"nowrap"}}>{g.date}</td>
                {!isMobile&&<td style={{padding:"9px 13px"}}>{g.time+" Uhr"}</td>}
                <td style={{padding:"9px 13px",fontWeight:600}}>{g.opponent}</td>
                <td style={{padding:"9px 13px"}}><Chip text={g.home?"H":"A"} color={g.home?"#16A34A":"#6B7280"}/></td>
                {!isMobile&&<><td style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>{g.venue.split(",")[0]}</td>
                <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>{g.comp}</td></>}
                <td style={{padding:"9px 13px"}}>{g.result?<span style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>{g.result}{g.htResult&&<span style={{fontWeight:400,fontSize:13,color:"var(--sub)",marginLeft:5}}>({g.htResult})</span>}</span>:<Chip text="Ausstehend" color="#999"/>}</td>
                <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function TableTab({team}){
  const rows=TABLES[team]||[];

  return(
    <div>

      <Card style={{padding:0,overflowX:"auto"}}>
        <table className="cc-table">
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {["#","Mannschaft","Sp","S","U","N","Tore","+/-","Pts"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:i>1?"center":"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{borderTop:"0.5px solid var(--border)",background:r.me?ACCENT20:i%2===0?"var(--surface)":"var(--surface2)"}}>
                <td style={{padding:"9px 13px",fontWeight:700,color:"var(--sub)"}}>{r.rank}</td>
                <td style={{padding:"9px 13px",fontWeight:r.me?700:400,color:r.me?BK:BK}}>
                  {r.team}
                  {r.me&&<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:ACCENT,marginLeft:6,verticalAlign:"middle"}}/>}
                </td>
                {[r.sp,r.s,r.u,r.n].map((v,j)=><td key={j} style={{padding:"9px 13px",textAlign:"center",color:"var(--sub)"}}>{v}</td>)}
                <td style={{padding:"9px 13px",textAlign:"center",color:"var(--sub)"}}>{r.tore}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:r.diff>0?GN:r.diff<0?R:"#555"}}>{r.diff>0?"+":""}{r.diff}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:800}}>{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TermineModul({role,team,setActive,onNavigateToSpiel,myRosterId:myRosterIdProp,initialFilter="alle",responses:responsesProp,onResponseChange,allTeams,account,kannSchreiben,kannVerwalten}){
  const isMobile=useIsMobile();
  const isTrainer=["trainer"].includes(role);
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isSpieler=role==="spieler";
  const isEltern=role==="eltern";
  const kinder=account?.kinder||[];
  const hasMultiKinder=isEltern&&kinder.length>1;
  const [activeKind,setActiveKind]=useState(kinder[0]||null);
  const hasMultiTeams=(allTeams&&allTeams.length>1)||(isEltern&&hasMultiKinder);
  const [selectedTeam,setSelectedTeam]=useState("alle");
  useEffect(()=>{setSelectedTeam("alle");},[allTeams?.join(",")]);
  /* Dynamic myId: for eltern use child matching selected team */
  const myId=(()=>{
    if(hasMultiKinder&&allTeams){
      const matchingKind=selectedTeam!=="alle"?kinder.find(k=>k.team===selectedTeam):kinder[0];
      return matchingKind?.rosterId||myRosterIdProp||1;
    }
    return myRosterIdProp||(isSpieler?1:isEltern?1:isTrainer?200:null);
  })();

  /* Events: if allTeams provided show all teams, filtered by selectedTeam or active child */
  const teamEvents=(()=>{
    /* Eltern with multiple kids + allTeams → show all kids' events */
    if(hasMultiKinder&&allTeams&&allTeams.length>0){
      const teams=selectedTeam==="alle"?allTeams:[selectedTeam];
      return ATT_EVENTS.filter(e=>teams.some(t=>e.team===t)||e.subtype==="Vereinsanlass");
    }
    /* Multi-team (trainer) */
    if(allTeams&&allTeams.length>0){
      const teams=selectedTeam==="alle"?allTeams:[selectedTeam];
      return ATT_EVENTS.filter(e=>teams.some(t=>e.team===t)||e.subtype==="Vereinsanlass");
    }
    return team?ATT_EVENTS.filter(e=>e.team===team||e.subtype==="Vereinsanlass"):ATT_EVENTS;
  })();
  const activeTeamForRoster=selectedTeam!=="alle"?selectedTeam:(allTeams?.[0]||team);
  const teamRoster=activeTeamForRoster?ROSTER.filter(p=>(p.teams||[]).includes(activeTeamForRoster)):ROSTER.filter(p=>(p.teams||[]).includes("Cc-Junioren"));

  const [responsesLocal,setResponsesLocal]=useState(ATT_INITIAL);
  const responses=responsesProp||responsesLocal;
  const setResponses=(r)=>{
    if(onResponseChange) onResponseChange(r);
    else setResponsesLocal(r);
  };
  const [selEvent,setSelEvent]=useState(teamEvents[0]?.id||1);
  const [modalOpen,setModalOpen]=useState(()=>{
    if(NAV_TARGET.openEvId){const id=NAV_TARGET.openEvId;NAV_TARGET.openEvId=null;setSelEvent(id);return true;}
    return false;
  });
  const [activeFilters,setActiveFilters]=useState(()=>{
    if(Array.isArray(initialFilter)) return new Set(initialFilter);
    return new Set(initialFilter==="alle"||!initialFilter?[]:[ initialFilter]);
  });
  useEffect(()=>{
    if(Array.isArray(initialFilter)) setActiveFilters(new Set(initialFilter));
    else setActiveFilters(new Set(initialFilter==="alle"||!initialFilter?[]:[ initialFilter]));
  },[initialFilter]);
  const toggleFilter=(f)=>{
    if(f==="alle"){setActiveFilters(new Set());return;}
    setActiveFilters(prev=>{
      const next=new Set(prev);
      next.has(f)?next.delete(f):next.add(f);
      return next;
    });
  };
  const isFilterActive=(f)=>f==="alle"?activeFilters.size===0:activeFilters.has(f);
  const [timeFilter,setTimeFilter]=useState("kommend");
  const [showMoreEvents,setShowMoreEvents]=useState(false);
  const [cancelledEvents,setCancelledEvents]=useState({});
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("aufgebot_state");if(r)setAufgebotState(JSON.parse(r.value));}catch(e){}
    })();
  },[]);
  const toggleAufgebot=(evId,pid)=>{
    setAufgebotState(prev=>{
      const evList=prev[evId]||[];
      const next=evList.includes(pid)?evList.filter(x=>x!==pid):[...evList,pid];
      const updated={...prev,[evId]:next};
      window.storage.set("aufgebot_state",JSON.stringify(updated)).catch(()=>{});
      return updated;
    });
  };
  const isInAufgebot=(evId,pid)=>(aufgebotState[evId]||[]).includes(pid);
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("cancelled_events");if(r)setCancelledEvents(JSON.parse(r.value));}catch(e){}}
    )();
  },[]);
  const toggleCancel=(evId)=>{
    setCancelledEvents(prev=>{
      const next={...prev,[evId]:!prev[evId]};
      window.storage.set("cancelled_events",JSON.stringify(next)).catch(()=>{});

      // Sync mit GANTT: Training-Event → Ausnahme in trainingsAusnahmen schreiben
      const ev=ATT_EVENTS.find(e=>e.id===evId&&e.type==="Training");
      if(ev){
        (async()=>{
          try{
            // KW berechnen
            const [wd,dm]=ev.date.split(" ");
            const [day,mon,yr]=(dm||ev.date).split(".").map(Number);
            const evDate=new Date(yr||2026,mon-1,day);
            const jan4=new Date(evDate.getFullYear(),0,4);
            const kw=Math.ceil(((evDate-jan4)/86400000+jan4.getDay()+1)/7);
            const kwKey=`${evDate.getFullYear()}_${kw}`;

            // Passenden GANTT-Slot finden
            const WOCHENTAGE=["So","Mo","Di","Mi","Do","Fr","Sa"];
            const weekday=WOCHENTAGE[evDate.getDay()];
            const r=await window.storage.get("trainingsPlaene");
            if(r){
              const plaene=JSON.parse(r.value);
              const aktiverPlan=plaene.find(p=>p.active)||plaene[0];
              const matchSlot=aktiverPlan?.slots?.find(s=>
                s.weekday===weekday&&s.team===ev.team
              );
              if(matchSlot){
                const ar=await window.storage.get("trainingsAusnahmen");
                const ausnahmen=ar?JSON.parse(ar.value):{};
                const kwAusnahmen=ausnahmen[kwKey]||[];
                const isCancelling=!prev[evId]; // next state
                let newKwAusnahmen;
                if(isCancelling){
                  // Absage hinzufügen
                  newKwAusnahmen=[
                    ...week_nrAusnahmen.filter(a=>!(a.slot_id===matchSlot.id&&a.type==="absage")),
                    {type:"absage",slot_id:matchSlot.id,weekday,team:ev.team,evId,von_termin:true}
                  ];
                } else {
                  // Absage rückgängig
                  newKwAusnahmen=kwAusnahmen.filter(a=>!(a.slot_id===matchSlot.id&&a.type==="absage"&&a.von_termin));
                }
                await window.storage.set("trainingsAusnahmen",JSON.stringify({...ausnahmen,[kwKey]:newKwAusnahmen}));

                // Benachrichtigung für Administration
                if(isCancelling){
                  const nr=await window.storage.get("admin_benachrichtigungen");
                  const bestehende=nr?JSON.parse(nr.value):[];
                  const neue=[...bestehende,{
                    id:Date.now(),
                    type:"training_absage",
                    titel:`Training abgesagt: ${ev.team}`,
                    inhalt:`${weekday} ${ev.date} · ${ev.time} Uhr · abgesagt vom Trainer`,
                    team:ev.team,
                    datum:ev.date,
                    gelesen:false,
                    created_at:new Date().toISOString(),
                  }];
                  await window.storage.set("admin_benachrichtigungen",JSON.stringify(neue));
                }
              }
            }
          }catch(e){}
        })();
      }
      return next;
    });
  };
  const [showNoteFor,setShowNoteFor]=useState(null);
  const [attLoaded,setAttLoaded]=useState(false);

  /* Load persisted responses on mount */
  if(!attLoaded){
    setAttLoaded(true);
    (async()=>{
      try{
        const res=await window.storage.get("att_responses");
        if(res){
          const stored=JSON.parse(res.value);
          const merged={...ATT_INITIAL};
          Object.keys(stored).forEach(evId=>{merged[evId]={...ATT_INITIAL[evId],...stored[evId]};});
          setResponses(merged);
        }
      }catch(e){}
    })();
  }

  const saveResp=(newResp)=>{
    setResponses(newResp);
    /* Only persist user-changed entries (delta vs ATT_INITIAL) */
    const delta={};
    Object.keys(newResp).forEach(evId=>{
      Object.keys(newResp[evId]||{}).forEach(pid=>{
        const cur=newResp[evId]?.[pid]?.status;
        const init=ATT_INITIAL[evId]?.[pid]?.status;
        if(cur!==init){
          if(!delta[evId]) delta[evId]={};
          delta[evId][pid]=newResp[evId][pid];
        }
      });
    });
    window.storage.set("att_responses",JSON.stringify(delta)).catch(()=>{});
  };

  const parseEvDate2=(d)=>{
    if(!d) return "";
    const c=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const p=c.split(".");
    return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";
  };
  const TODAY="2026-05-23";
  const isPast=(ev)=>parseEvDate2(ev.date)<TODAY;

  const getResp=(evId,pid)=>{
    const stored=responses[evId]?.[pid];
    if(stored?.status) return stored;
    const ev=ATT_EVENTS.find(e=>e.id===evId);
    if(ev?.type==="Training") return {status:"zu",note:""};
    return {status:null,note:""};
  };

  const setResp=(evId,pid,status,note)=>{
    const updated={
      ...responses,
      [evId]:{...responses[evId],[pid]:{status,note:note!==undefined?note:(responses[evId]?.[pid]?.note||"")}}
    };
    saveResp(updated);
  };

  const evCounts=(ev)=>{
    const pids=teamRoster.map(p=>p.id);
    return{
      zu:      pids.filter(id=>getResp(ev.id,id).status==="zu").length,
      ab:      pids.filter(id=>getResp(ev.id,id).status==="ab").length,
      unent:   pids.filter(id=>getResp(ev.id,id).status==="unentschuldigt").length,
      aufgebot:pids.filter(id=>isInAufgebot(ev.id,id)).length,
      frag:    pids.filter(id=>getResp(ev.id,id).status==="fraglich").length,
      offen:   pids.filter(id=>!getResp(ev.id,id).status).length,
      total:   pids.length,
    };
  };

  const STATUS_CFG={
    "zu":             {label:"Zusage",        color:GN,    bg:"#ECFDF5", icon:"✓"},
    "ab":             {label:"Absage",         color:R,     bg:RL,        icon:"✕"},
    "unentschuldigt": {label:"Unentschuldigt", color:AM, bg:"#FFF7ED", icon:"!"},
    "fraglich":       {label:"Fraglich",       color:AM,    bg:"#FFFBEB", icon:"?"},
    "aufgebot":       {label:"Aufgebot",     color:"var(--cc-accent)",bg:"#EEF2FF",icon:"ball-football"},
    null:             {label:"Ausstehend",     color:"var(--sub)",bg:"#f5f5f5", icon:"-"},
  };

  const parseEvDate=(d)=>{
    if(!d) return "";
    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const parts=clean.split(".");
    if(parts.length>=2) return `2026-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    return "";
  };
  const filteredEvents=teamEvents
    .filter(e=>timeFilter==="alle"||(timeFilter==="kommend"&&!isPast(e))||(timeFilter==="vergangen"&&isPast(e)))
    .filter(e=>{
      if(activeFilters.size===0) return true;
      if(activeFilters.has("training")&&e.type==="Training") return true;
      if(activeFilters.has("spiele")&&e.type==="Spiel") return true;
      if(activeFilters.has("team-event")&&e.type==="Veranstaltung"&&e.subtype==="Team-Event") return true;
      if(activeFilters.has("vereinsanlass")&&e.type==="Veranstaltung"&&e.subtype==="Vereinsanlass") return true;
      return false;
    })
    .sort((a,b)=>{
      const da=parseEvDate(a.date), db=parseEvDate(b.date);
      return timeFilter==="vergangen"?String(db||"").localeCompare(String(da||"")):String(da||"").localeCompare(String(db||""));
    });
  const selEv=teamEvents.find(e=>e.id===selEvent)||teamEvents[0];

  /* Modal state - shared between trainer and spieler/eltern views */
  const [editingDeadline,setEditingDeadline]=useState(false);
  const [deadlines,setDeadlines]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,e.deadline||""])));
  const [autoReminder,setAutoReminder]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,true])));
  const [reminderTimes,setReminderTimes]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,"3h"])));
  const REMINDER_OPTIONS=[
    {v:"30m",l:"30 Min. vorher"},
    {v:"1h", l:"1 Std. vorher"},
    {v:"2h", l:"2 Std. vorher"},
    {v:"3h", l:"3 Std. vorher"},
    {v:"6h", l:"6 Std. vorher"},
    {v:"12h",l:"12 Std. vorher"},
    {v:"24h",l:"1 Tag vorher"},
    {v:"48h",l:"2 Tage vorher"},
  ];

  const getReminderTime=(dl)=>{
    if(!dl) return null;
    try{
      const parts=dl.split(",");
      const datePart=parts[0].trim();
      const timePart=(parts[1]||"").trim();
      if(!timePart) return null;
      const [h,m]=timePart.split(":").map(Number);
      let rh=h-3;
      const rday=rh<0?"Vortag":"";
      if(rh<0) rh+=24;
      return `${datePart}${rday?" ("+rday+")":""}, ${String(rh).padStart(2,"0")}:${String(m).padStart(2,"0")} Uhr`;
    }catch(e){return null;}
  };

  const openEvent=(id)=>{setSelEvent(id);setModalOpen(true);setEditingDeadline(false);};

  /* Trainer notes per event */
  const [trainerNotes,setTrainerNotes]=useState({});
  const [editingNote,setEditingNote]=useState(false);
  const [besammlungen,setBesammlungen]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,
    e.treffpunkt?{date:e.date||"",time:(e.treffpunkt.match(/^\d{2}:\d{2}/)||[""])[0],ort:e.treffpunkt.replace(/^\d{2}:\d{2}\s*/,"")}:
    {date:"",time:"",ort:""}
  ])));
  const [editingBesammlung,setEditingBesammlung]=useState(false);
  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("trainer_notes");if(r)setTrainerNotes(JSON.parse(r.value));}catch(e){}
      try{const r=await window.storage.get("besammlungen");if(r)setBesammlungen(prev=>({...prev,...JSON.parse(r.value)}));}catch(e){}
    })();
  },[]);
  const saveTrainerNote=(evId,text)=>{
    const updated={...trainerNotes,[evId]:text};
    setTrainerNotes(updated);
    window.storage.set("trainer_notes",JSON.stringify(updated)).catch(()=>{});
  };
  const saveBesammlung=(evId,field,value)=>{
    const updated={...besammlungen,[evId]:{...(besammlungen[evId]||{}),date:"",time:"",ort:"",...besammlungen[evId],[field]:value}};
    setBesammlungen(updated);
    window.storage.set("besammlungen",JSON.stringify(updated)).catch(()=>{});
  };

  const canEditEvent=(ev)=>{
    if(!ev) return false;
    /* Stufe aus Portalverwaltung prüfen falls verfügbar */
    if(kannVerwalten&&!kannVerwalten("events")) return false;
    const typ=ev.subtype==="Vereinsanlass"?"vereinsanlass":ev.subtype==="Team-Event"?"team_event":ev.type==="Spiel"?"spiel":"training";
    return kannTerminBearbeiten(role, typ, ev.team, allTeams||[team]);
  };

  const canCreateEvent=(typ="team_event")=>{
    return kannTerminErstellen(role, typ, null, allTeams||[team]);
  };

  const canDeleteEvent=(ev)=>{
    if(!ev) return false;
    const typ=ev.subtype==="Vereinsanlass"?"vereinsanlass":ev.subtype==="Team-Event"?"team_event":ev.type==="Spiel"?"spiel":"training";
    return kannTerminAbsagen(role, typ, ev.team, allTeams||[team]);
  };

  /* Spieler/Eltern: gleiche Kartenansicht wie Trainer */
  if(!isTrainer&&myId){
    return(
      <div>
        {/* Modal auch für Spieler/Eltern */}
        {modalOpen&&selEv&&(
          <div onClick={()=>setModalOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"var(--surface)",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
              {/* Header */}
              {(()=>{
                const hBg=selEv.type==="Spiel"?"#EFF6FF":selEv.subtype==="Vereinsanlass"?"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)":selEv.type==="Veranstaltung"?`linear-gradient(135deg,${AM} 0%,#b45309 100%)`:"#F0FDF4";
                const hLight=selEv.type==="Spiel"||selEv.type==="Training";
                const hTxt=hLight?"#1a1a1a":"#fff";
                const hTxtSub=hLight?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.75)";
                const hBtn=hLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.18)";
                return(
                  <div style={{background:hBg,borderRadius:"20px 20px 0 0",padding:"20px 22px",color:"#fff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <span style={{background:hBtn,color:hTxt,fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,textTransform:"uppercase",letterSpacing:0.6}}>{selEv.subtype||selEv.type}</span>
                      <button onClick={()=>setModalOpen(false)} style={{background:hBtn,border:"none",borderRadius:"50%",width:30,height:30,color:hTxt,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                    <div style={{fontWeight:800,fontSize:21,lineHeight:1.2,marginBottom:12,color:hTxt}}>
                      {selEv.opponent?"vs. "+selEv.opponent:selEv.type==="Training"?"Training":selEv.title||selEv.type}
                    </div>
                    {/* Info Pills */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><TI n="calendar" style={{marginRight:3}}/> {selEv.date}{selEv.endDate?" - "+selEv.endDate:""}</span>
                      <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><TI n="clock" style={{marginRight:3}}/> {selEv.time} Uhr</span>
                      <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><TI n="map-pin" style={{marginRight:3}}/> {selEv.location}</span>
                      {selEv.treffpunkt&&<span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><TI n="target" style={{marginRight:3}}/> {selEv.treffpunkt}</span>}
                    </div>
                  </div>
                );
              })()}
              {/* Beschreibung */}
              {selEv.description&&(
                <div style={{padding:"14px 20px",borderBottom:"0.5px solid var(--border)",display:"flex",gap:12,background:"var(--surface)"}}>
                  <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
                  <p style={{margin:0,fontSize:13,color:"var(--text)",lineHeight:1.65}}>{selEv.description}</p>
                </div>
              )}
              {/* Weitere Informationen */}
              {(trainerNotes[selEv.id]||besammlungen[selEv.id])&&(
                <div style={{padding:"14px 20px",borderBottom:"0.5px solid var(--border)",background:"var(--surface)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>≡ Weitere Informationen</div>
                  {besammlungen[selEv.id]&&(besammlungen[selEv.id].time||besammlungen[selEv.id].location)&&(
                    <div style={{marginBottom:trainerNotes[selEv.id]?8:0}}>
                      <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginBottom:2}}><TI n="target" style={{marginRight:3}}/> Treffpunkt</div>
                      <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>
                        {besammlungen[selEv.id].date&&<span style={{marginRight:8}}><TI n="calendar" style={{marginRight:3}}/> {besammlungen[selEv.id].date}</span>}
                        {besammlungen[selEv.id].time&&<span style={{marginRight:8}}><TI n="clock" style={{marginRight:3}}/> {besammlungen[selEv.id].time} Uhr</span>}
                        {besammlungen[selEv.id].location&&<span><TI n="target" style={{marginRight:3}}/> {besammlungen[selEv.id].location}</span>}
                      </div>
                    </div>
                  )}
                  {trainerNotes[selEv.id]&&(
                    <div>
                      <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginBottom:2}}><TI n="edit" style={{marginRight:3}}/> Bemerkungen</div>
                      <p style={{margin:0,fontSize:13,color:"#1a3a2a",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{trainerNotes[selEv.id]}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Zum Spielplan Link bei Spielen */}
              {selEv.type==="Spiel"&&onNavigateToSpiel&&(
                <div style={{padding:"10px 20px",background:"var(--surface)",borderBottom:`0.5px solid #DBEAFE`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:BL,fontWeight:600}}><TI n="ball-football" style={{marginRight:4}}/> Dieses Spiel im Spielplan ansehen</span>
                  <button onClick={()=>{const match=SCHEDULE.find(g=>g.date===selEv.date&&g.opponent===selEv.opponent);setModalOpen(false);if(match)onNavigateToSpiel(match);}}
                    style={{fontSize:13,fontWeight:700,color:BL,background:"var(--surface)",border:`1px solid ${BL}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>
                    Zum Spielplan →
                  </button>
                </div>
              )}
              {/* Eigene RSVP */}
              {selEv.rsvp!==false&&(
                <div style={{padding:"14px 20px"}}>
                  {/* Aufgebot-Banner für Spieler/Eltern */}
                  {!isTrainer&&!isAdmin&&isInAufgebot(selEv.id,myId)&&(
                    <div style={{background:"var(--surface)",border:"1.5px solid #818CF8",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:18}}><TI n="ball-football"/></span>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"var(--cc-accent)"}}>Du bist im Aufgebot!</div>
                        <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
                          {selEv.treffpunkt?`Treffpunkt: ${selEv.treffpunkt}`:"Treffpunkt folgt"}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Aufgebotene Mitspieler */}
                  {!isTrainer&&!isAdmin&&selEv.type==="Spiel"&&(()=>{
                    const ichSelbst=teamRoster.find(p=>p.id===myId);
                    const mitspieler=teamRoster.filter(p=>p.id!==myId&&isInAufgebot(selEv.id,p.id));
                    const alleAufgebotene=[...(isInAufgebot(selEv.id,myId)&&ichSelbst?[{...ichSelbst,ich:true}]:[]),...mitspieler];
                    if(alleAufgebotene.length===0) return null;
                    return(
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Aufgebot ({alleAufgebotene.length})</div>
                        <div style={S_10}>
                          {alleAufgebotene.map(p=>(
                            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:p.ich?"#4F46E5":"#EEF2FF",borderRadius:8}}>
                              <Av name={p.name} size={26} bg={p.ich?"rgba(255,255,255,0.3)":"#6366F1"}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:700,color:p.ich?"#fff":"#4F46E5"}}>{p.firstName} {p.lastName}{p.ich?" (Du)":""}</div>
                                {p.pos&&p.pos!=="-"&&<div style={{fontSize:13,color:p.ich?"rgba(255,255,255,0.7)":"#818CF8"}}>{p.pos}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Meine Rückmeldung</div>
                  <div style={S_08}>
                    {["zu","ab"].map(s=>{
                      const resp=getResp(selEv.id,myId);
                      const active=resp.status===s;
                      return(
                        <button key={s} onClick={()=>setResp(selEv.id,myId,active?null:s)}
                          style={{flex:1,padding:"8px 14px",borderRadius:10,border:`1.5px solid ${active?(s==="zu"?GN:R):GB}`,background:active?(s==="zu"?"#ECFDF5":RL):"#fff",color:active?(s==="zu"?GN:R):"#888",fontWeight:active?700:400,fontSize:13,cursor:"pointer"}}>
                          {s==="zu"?"✓ Zusagen":"✕ Absagen"}
                        </button>
                      );
                    })}
                  </div>
                  {getResp(selEv.id,myId).status==="ab"&&(
                    <textarea value={getResp(selEv.id,myId).note||""} onChange={e=>setResp(selEv.id,myId,"ab",e.target.value)}
                      placeholder="Begründung (optional)…" rows={2}
                      style={{width:"100%",marginTop:8,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:FONT}}/>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Statistik-Header */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:14}}>
          {(()=>{
            const rsvpEvs=teamEvents.filter(e=>!(e.subtype==="Vereinsanlass"&&e.rsvp===false));
            const spielTrainEvs=rsvpEvs.filter(e=>e.type==="Training"||e.type==="Spiel");

            /* Vergangene Events → Anwesenheitsquote */
            const pastST=spielTrainEvs.filter(e=>isPast(e));
            const pastZu=pastST.filter(e=>getResp(e.id,myId).status==="zu").length;
            const pastPct=pastST.length?Math.round(pastZu/pastST.length*100):null;

            /* Trainings */
            const pastTrain=spielTrainEvs.filter(e=>e.type==="Training"&&isPast(e));
            const pastTrainZu=pastTrain.filter(e=>getResp(e.id,myId).status==="zu").length;
            const trainPct=pastTrain.length?Math.round(pastTrainZu/pastTrain.length*100):null;

            /* Spiele */
            const pastSpiele=spielTrainEvs.filter(e=>e.type==="Spiel"&&isPast(e));
            const pastSpieleZu=pastSpiele.filter(e=>getResp(e.id,myId).status==="zu").length;
            const spielPct=pastSpiele.length?Math.round(pastSpieleZu/pastSpiele.length*100):null;

            const fmt=(pct,zu,total,label)=>pct!==null?[pct+"%",zu+"/"+total+" "+label]:["-","Noch keine "+label];
            const col=(pct)=>pct===null?"#aaa":pct>=80?GN:pct>=60?AM:R;

            const [tv,ts]=fmt(pastPct,pastZu,pastST.length,"Spiele & Trainings");
            const [trv,trs]=fmt(trainPct,pastTrainZu,pastTrain.length,"Trainings");
            const [spv,sps]=fmt(spielPct,pastSpieleZu,pastSpiele.length,"Spiele");
            return[
              <Stat key="t"  label="Anwesenheit Total" value={tv}  sub={ts}  color={col(pastPct)}/>,
              <Stat key="tr" label="Trainings"          value={trv} sub={trs} color={col(trainPct)}/>,
              <Stat key="sp" label="Spiele"             value={spv} sub={sps} color={col(spielPct)}/>,
            ];
          })()}
        </div>

        {/* Team-Filter (nur wenn mehrere Teams) */}
        {hasMultiTeams&&(
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"var(--sub)",fontWeight:600,alignSelf:"center",marginRight:2}}>{isEltern?"Kind:":"Team:"}</span>
            {["alle",...allTeams].map(t=>{
              const active=selectedTeam===t;
              const kind=isEltern?kinder.find(k=>k.team===t):null;
              const label=t==="alle"?(isEltern?"Alle Kinder":"Alle Teams"):kind?`${kind.name.split(" ")[0]} · ${t}`:t;
              return(
                <button key={t} onClick={()=>setSelectedTeam(t)}
                  style={{padding:"5px 12px",borderRadius:20,border:`0.5px solid ${active?ACCENT:GB}`,background:active?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:13,fontWeight:active?700:400,cursor:"pointer"}}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {/* Filter */}
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:14}}>
          {/* Typ-Pills scrollbar */}
          <div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",flex:1,minWidth:0}}>
            {[
              {k:"alle",l:"Alle"},
              {k:"training",l:"Trainings"},
              {k:"spiele",l:"Spiele"},
              {k:"team-event",l:"Teamevents"},
              {k:"vereinsanlass",l:"Vereinsanlass"},
            ].map(f=>{
              const active=isFilterActive(f.k);
              return(
                <button key={f.k} onClick={()=>toggleFilter(f.k)}
                  style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${active?"#1A1A1A":GB}`,background:active?"#1A1A1A":"transparent",color:active?"#fff":"#666",fontSize:13,fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
                  {f.l}
                </button>
              );
            })}
          </div>
          {/* Zeit-Toggle - eigene Zeile auf Mobile durch flex-basis 100% */}
          <button onClick={()=>setTimeFilter(p=>p==="kommend"?"vergangen":"kommend")}
            style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:20,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,flexBasis:"100%",transition:"all 0.15s"}}>
            <span style={{fontSize:13,opacity:0.6}}>{"▾"}</span>
            <span>{timeFilter==="kommend"?"Vergangene Termine":"Kommende Termine"}</span>
          </button>
        </div>

        <Col gap={12}>
          {(showMoreEvents?filteredEvents:filteredEvents.slice(0,5)).map(ev=>{
            const resp=getResp(ev.id,myId);
            const past=isPast(ev);
            const accentColor=ev.type==="Spiel"?BL:ev.subtype==="Vereinsanlass"?"#7C3AED":ev.type==="Veranstaltung"?AM:GN;
            const dateParts=ev.date.split(" ");
            const weekday=dateParts[0]||"";
            const dayMonth=dateParts[1]||ev.date;
            const MONTHS=["","Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
            const dayNum=dayMonth.split(".")[0];
            const monNum=parseInt(dayMonth.split(".")[1])||0;
            const monName=MONTHS[monNum]||"";
            const isZu=resp.status==="zu";
            const isAb=resp.status==="ab";
            const isCancelled=!!cancelledEvents[ev.id];
            const canCancel=isTrainer&&!past&&(ev.type==="Training"||ev.subtype==="Team-Event");
            const showRsvp=!past&&!canCancel&&!(ev.subtype==="Vereinsanlass"&&ev.rsvp===false);
            const inAufgebot=!past&&isInAufgebot(ev.id,myId);

            return(
              <div key={ev.id}
                onMouseEnter={e=>e.currentTarget.style.background=isCancelled?"#FFF5F5":"#FAFAF8"}
                onMouseLeave={e=>e.currentTarget.style.background=isCancelled?"#FFF5F5":"var(--surface)"}
                style={{
                background:isCancelled?"#FFF5F5":"#fff",
                border:"0.5px solid var(--border)",
                borderRadius:14,
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                opacity:past?0.65:1,
              }}>
                {/* Haupt-Inhalt */}
                <div onClick={()=>openEvent(ev.id)} style={{flex:1,padding:"12px 14px",minWidth:0,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                  {/* Datum-Block */}
                  <div style={{width:62,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--surface2)",borderRadius:10,padding:"8px 6px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{weekday}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--text)",lineHeight:1}}>{dayNum}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{monName}</div>
                  </div>
                  {/* Text */}
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <div style={{fontWeight:600,fontSize:14,color:isCancelled?"#aaa":"#1A1A1A",textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.opponent?"vs. "+ev.opponent:ev.type==="Training"?"Training · "+ev.team:ev.title||ev.type}
                      </div>
                      <span style={{background:accentColor+"18",color:accentColor,fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,flexShrink:0}}>
                        {ev.subtype||ev.type}
                      </span>
                      {isCancelled&&<span style={{fontSize:13,fontWeight:600,padding:"2px 8px",borderRadius:20,background:RL,color:R,flexShrink:0}}>⚠ Abgesagt</span>}
                      {inAufgebot&&<span style={{fontSize:13,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:"var(--cc-accent)",flexShrink:0}}><TI n="ball-football" style={{marginRight:3}}/> Aufgebot</span>}
                      {past&&<span style={{fontSize:13,fontWeight:600,padding:"2px 8px",borderRadius:20,background:isZu?"#ECFDF5":isAb?RL:"#F3F4F6",color:isZu?GN:isAb?R:"#aaa",flexShrink:0}}>{isZu?"✓ Anwesend":isAb?"✕ Abwesend":"-"}</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"2px 6px",fontSize:13,color:"var(--sub)"}}>
                      <span><TI n="clock" style={{marginRight:3}}/> {ev.time} Uhr</span>
                      {ev.type==="Spiel"&&ev.treffpunkt&&(<>
                        <span style={{color:"var(--border)"}}>·</span>
                        <span><TI n="target" style={{marginRight:3}}/> <span style={{fontWeight:600,color:"var(--sub)"}}>Treffpunkt: </span>{ev.treffpunkt}</span>
                      </>)}
                    </div>
                  </div>
                </div>

                {/* RSVP-Buttons - segmentierter Toggle */}
                {showRsvp&&(
                  <div style={{padding:"10px 12px",borderTop:"0.5px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",background:"var(--surface2)",borderRadius:10,padding:3,gap:4}}>
                      <button onClick={()=>setResp(ev.id,myId,isZu?null:"zu")}
                        style={{flex:1,padding:"8px 14px",border:"none",borderRadius:8,background:isZu?"#16A34A":"transparent",color:isZu?"#fff":(!isZu&&!isAb)?"#888":"#bbb",fontSize:13,fontWeight:isZu?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        <span style={{fontSize:14}}>▲</span>
                        <span>{isZu?"Zugesagt":"Zusagen"}</span>
                      </button>
                      <div style={{width:1,background:GB,flexShrink:0,margin:"4px 0"}}/>
                      <button onClick={()=>setResp(ev.id,myId,isAb?null:"ab")}
                        style={{flex:1,padding:"8px 14px",border:"none",borderRadius:8,background:isAb?"#DC2626":"transparent",color:isAb?"#fff":(!isZu&&!isAb)?"#888":"#bbb",fontSize:13,fontWeight:isAb?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        <span style={{fontSize:14}}>▽</span>
                        <span>{isAb?"Abgesagt":"Absagen"}</span>
                      </button>
                    </div>
                  </div>
                )}
                {showRsvp&&isAb&&(
                  <div style={{borderTop:"0.5px solid var(--border)",padding:"8px 12px"}} onClick={e=>e.stopPropagation()}>
                    <textarea value={resp.note} onChange={e=>setResp(ev.id,myId,"ab",e.target.value)}
                      placeholder="Begründung (optional)…" rows={2}
                      style={{width:"100%",padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:FONT}}/>
                  </div>
                )}
                {canCancel&&(
                  <div style={{borderTop:"0.5px solid var(--border)",display:"flex",justifyContent:"flex-end",padding:"8px 12px"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>toggleCancel(ev.id)}
                      style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${isCancelled?R:GB}`,background:isCancelled?RL:"transparent",color:isCancelled?R:"#bbb",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                      {isCancelled?"↩ Rückgängig":"✕ Absagen"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredEvents.length>5&&(
            <button onClick={()=>setShowMoreEvents(p=>!p)}
              style={{padding:'12px 0',borderRadius:12,border:"0.5px solid var(--border)",background:'#fff',color:'#555',fontSize:13,fontWeight:600,cursor:'pointer',width:'100%'}}>
              {showMoreEvents?`↑ Weniger anzeigen`:`+ ${filteredEvents.length-5} weitere anzeigen`}
            </button>
          )}
        </Col>
      </div>
    );
  }

  return(
    <div>
      {/* Modal */}
      {modalOpen&&selEv&&(
        <div onClick={()=>setModalOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"var(--surface)",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
            {/* Modal Header */}
            {(()=>{
              const hBg=selEv.type==="Spiel"?"#EFF6FF":selEv.subtype==="Vereinsanlass"?"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)":selEv.type==="Veranstaltung"?`linear-gradient(135deg,${AM} 0%,#b45309 100%)`:"#F0FDF4";
                const hLight=selEv.type==="Spiel"||selEv.type==="Training";
                const hTxt=hLight?"#1a1a1a":"#fff";
                const hTxtSub=hLight?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.75)";
                const hBtn=hLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.18)";
              return(
                <div style={{background:hBg,borderRadius:"20px 20px 0 0",padding:"20px 22px",overflow:"hidden"}}>
                  {cancelledEvents[selEv.id]&&(
                    <div style={{background:hBtn,borderRadius:10,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,border:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{fontSize:16}}>⚠</span>
                      <span style={{color:hTxt,fontWeight:700,fontSize:13}}>Dieser Termin wurde abgesagt</span>
                      {isTrainer&&<button onClick={()=>toggleCancel(selEv.id)} style={{marginLeft:"auto",fontSize:13,padding:"3px 10px",borderRadius:20,border:"0.5px solid rgba(255,255,255,0.4)",background:"transparent",color:"#fff",cursor:"pointer",fontWeight:600}}>↩ Rückgängig</button>}
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <span style={{background:hBtn,color:hTxt,fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:0.8,textTransform:"uppercase"}}>
                      {selEv.subtype||selEv.type}
                    </span>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {isTrainer&&!isPast(selEv)&&(selEv.type==="Training"||selEv.subtype==="Team-Event")&&(
                        <button onClick={()=>toggleCancel(selEv.id)}
                          style={{display:"flex",alignItems:"center",gap:8,background:cancelledEvents[selEv.id]?hBtn:hBtn,border:"0.5px solid rgba(0,0,0,0.15)",borderRadius:20,padding:"5px 12px",cursor:"pointer",color:hTxt,fontSize:13,fontWeight:700}}>
                          {cancelledEvents[selEv.id]?"↩ Reaktivieren":"✕ Training absagen"}
                        </button>
                      )}
                      <button onClick={()=>setModalOpen(false)}
                        style={{background:hBtn,border:"none",borderRadius:"50%",width:30,height:30,color:hTxt,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  </div>
                  <div style={{color:hTxt,fontWeight:800,fontSize:21,lineHeight:1.15,marginBottom:12,letterSpacing:-0.3}}>
                    {selEv.opponent?"vs. "+selEv.opponent:selEv.type==="Training"?"Training":selEv.title||selEv.type}
                  </div>
                  {/* Info Pills */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                    <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20}}><TI n="calendar" style={{marginRight:3}}/> {selEv.date}{selEv.endDate?" - "+selEv.endDate:""}</span>
                    <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20}}><TI n="clock" style={{marginRight:3}}/> {selEv.time} Uhr</span>
                    <span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20}}><TI n="map-pin" style={{marginRight:3}}/> {selEv.location}</span>
                    {(()=>{const b=besammlungen[selEv.id]||{};const t=b.time||"";const o=b.location||selEv.treffpunkt||"";return (t||o)?<span style={{background:hBtn,color:hTxt,fontSize:13,padding:"4px 10px",borderRadius:20}}><TI n="target" style={{marginRight:3}}/> {t?t+" Uhr":""}{t&&o?" · ":""}{o}</span>:null;})()}
                  </div>
                  {/* Deadline & Erinnerung - für alle editierbaren Events */}
                  {canEditEvent(selEv)&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",paddingTop:10,borderTop:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{color:hTxtSub,fontSize:13,fontWeight:700,letterSpacing:0.5}}>⏰ DEADLINE</span>
                      {editingDeadline?(
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <input type="date"
                            defaultValue={(()=>{const d=deadlines[selEv.id];if(!d)return"";try{const p=d.split(",")[0].trim().replace(/^\S+\s+/,"").split(".");return `2026-${p[1]?.padStart(2,"0")}-${p[0]?.padStart(2,"0")}`;}catch(e){return "";}})()}
                            onBlur={e=>{const d=e.target.value;if(d){const[y,m,day]=d.split("-");const days=["So","Mo","Di","Mi","Do","Fr","Sa"];const wd=days[new Date(d).getDay()];const time=(deadlines[selEv.id]||"").split(",")[1]?.trim()||"18:00";setDeadlines(prev=>({...prev,[selEv.id]:`${wd} ${day}.${m}.${y}, ${time}`}));}setEditingDeadline(false);}}
                            style={{background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.2)",borderRadius:6,padding:"3px 8px",color:hTxt,fontSize:13,outline:"none",colorScheme:"dark"}} autoFocus/>
                          <input type="time"
                            defaultValue={(deadlines[selEv.id]||"").split(",")[1]?.trim()||"18:00"}
                            onBlur={e=>{const t=e.target.value;if(t){const curDate=(deadlines[selEv.id]||"").split(",")[0].trim();setDeadlines(prev=>({...prev,[selEv.id]:`${curDate}, ${t}`}));}}}
                            style={{background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.2)",borderRadius:6,padding:"3px 8px",color:hTxt,fontSize:13,outline:"none",colorScheme:"dark",width:80}}/>
                          <button onClick={()=>setEditingDeadline(false)}
                            style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}>✓</button>
                        </div>
                      ):(
                        <span onClick={()=>setEditingDeadline(true)}
                          style={{color:hTxt,fontWeight:600,fontSize:13,cursor:"pointer",background:hBtn,padding:"3px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}>
                          {deadlines[selEv.id]||"Setzen"}{deadlines[selEv.id]?" Uhr":""}
                        </span>
                      )}
                      <button onClick={()=>setAutoReminder(prev=>({...prev,[selEv.id]:!prev[selEv.id]}))}
                        style={{display:"flex",alignItems:"center",gap:8,background:hBtn,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:20,padding:"5px 12px",cursor:"pointer",color:hTxt,fontSize:13}}>
                        <span style={{width:22,height:12,borderRadius:6,background:autoReminder[selEv.id]?(hLight?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.85)"):"rgba(0,0,0,0.15)",position:"relative",display:"inline-block",flexShrink:0}}>
                          <span style={{position:"absolute",top:2,left:autoReminder[selEv.id]?11:2,width:8,height:8,borderRadius:"50%",background:autoReminder[selEv.id]?GN:(hLight?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.4)")}}/>
                        </span>
                        <span style={{opacity:autoReminder[selEv.id]?1:0.5,color:hTxt}}>
                          {autoReminder[selEv.id]?"◬ Erinnerung":"Keine Erinnerung"}
                        </span>
                      </button>
                      {autoReminder[selEv.id]&&(
                        <select value={reminderTimes[selEv.id]||"3h"}
                          onChange={e=>setReminderTimes(prev=>({...prev,[selEv.id]:e.target.value}))}
                          style={{background:hBtn,border:"0.5px solid rgba(0,0,0,0.15)",borderRadius:20,padding:"5px 12px",color:hTxt,fontSize:13,cursor:"pointer",outline:"none"}}>
                          {REMINDER_OPTIONS.map(o=><option key={o.v} value={o.v} style={{color:"var(--text)",background:"var(--surface)"}}>{o.l}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Beschreibung für Vereinsanlass/Team-Event */}
            {selEv.description&&(
              <div style={{padding:"14px 20px",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>ℹ️</span>
                <p style={{margin:0,fontSize:13,color:"var(--text)",lineHeight:1.7}}>{selEv.description}</p>
              </div>
            )}
            {/* Weitere Informationen */}
            <div style={{padding:"14px 20px",borderBottom:"0.5px solid var(--border)",background:"var(--surface)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>≡ Weitere Informationen</div>
                {canEditEvent(selEv)&&(
                  <button onClick={()=>setEditingNote(v=>!v)}
                    style={{fontSize:13,fontWeight:600,color:editingNote?R:BL,background:"transparent",border:"none",cursor:"pointer",padding:"2px 6px"}}>
                    {editingNote?"Fertig ✓":"Bearbeiten"}
                  </button>
                )}
              </div>
              {/* Besammlung */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginBottom:6}}><TI n="target" style={{marginRight:3}}/> Treffpunkt</div>
                {editingNote&&canEditEvent(selEv)?(
                  <div style={S_10}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>
                        <div style={{fontSize:13,color:"var(--sub)",marginBottom:2}}>Datum</div>
                        <input type="date" value={(()=>{const d=besammlungen[selEv.id]?.date||selEv.date||"";const c=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1]?.padStart(2,"0")}-${p[0]?.padStart(2,"0")}`:"";})()}
                          onChange={e=>{const v=e.target.value;if(v){const[y,m,d]=v.split("-");const days=["So","Mo","Di","Mi","Do","Fr","Sa"];const wd=days[new Date(v).getDay()];saveBesammlung(selEv.id,"date",`${wd} ${d}.${m}.`);}}}
                          style={{width:"100%",padding:"7px 8px",border:"1px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                      </div>
                      <div>
                        <div style={{fontSize:13,color:"var(--sub)",marginBottom:2}}>Uhrzeit</div>
                        <input type="time" value={besammlungen[selEv.id]?.time||""}
                          onChange={e=>saveBesammlung(selEv.id,"time",e.target.value)}
                          style={{width:"100%",padding:"7px 8px",border:"1px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:13,color:"var(--sub)",marginBottom:2}}>Ort</div>
                      <input value={besammlungen[selEv.id]?.location||""} onChange={e=>saveBesammlung(selEv.id,"location",e.target.value)}
                        placeholder="z.B. Sportanlage Aabach, Parkplatz Bahnhof…"
                        style={{width:"100%",padding:"7px 8px",border:"1px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                    </div>
                  </div>
                ):(()=>{
                  const b=besammlungen[selEv.id]||{};
                  const hasData=b.time||b.location||b.date;
                  return hasData?(
                    <div style={{fontSize:13,color:"var(--text)"}}>
                      {b.date&&<span style={{marginRight:8}}><TI n="calendar" style={{marginRight:3}}/> {b.date}</span>}
                      {b.time&&<span style={{marginRight:8}}><TI n="clock" style={{marginRight:3}}/> {b.time} Uhr</span>}
                      {b.location&&<span><TI n="map-pin" style={{marginRight:3}}/> {b.location}</span>}
                    </div>
                  ):<div style={{fontSize:13,color:"var(--sub)",fontStyle:"italic"}}>Noch nicht gesetzt</div>;
                })()}
              </div>
              {/* Notizen */}
              <div>
                <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginBottom:4}}><TI n="edit" style={{marginRight:3}}/> Bemerkungen</div>
                {editingNote&&canEditEvent(selEv)?(
                  <textarea value={trainerNotes[selEv.id]||""} onChange={e=>saveTrainerNote(selEv.id,e.target.value)}
                    placeholder="Bemerkungen, Taktik-Hinweise, Infos für Spieler und Eltern…" rows={3}
                    style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${GN}`,borderRadius:10,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:FONT,lineHeight:1.6,outline:"none",color:"var(--text)"}}/>
                ):trainerNotes[selEv.id]?(
                  <p style={{margin:0,fontSize:13,color:"#1a3a2a",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{trainerNotes[selEv.id]}</p>
                ):(
                  canEditEvent(selEv)&&<div style={{fontSize:13,color:"var(--sub)",fontStyle:"italic"}}>Noch keine Notizen.</div>
                )}
              </div>
            </div>
            {/* Zum Spielplan Link bei Spielen */}
            {selEv.type==="Spiel"&&onNavigateToSpiel&&(
              <div style={{padding:"10px 20px",background:"var(--surface)",borderBottom:`0.5px solid #DBEAFE`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:BL,fontWeight:600}}><TI n="ball-football" style={{marginRight:4}}/> Dieses Spiel im Spielplan ansehen</span>
                <button onClick={()=>{const match=SCHEDULE.find(g=>g.date===selEv.date&&g.opponent===selEv.opponent);setModalOpen(false);if(match)onNavigateToSpiel(match);}}
                  style={{fontSize:13,fontWeight:700,color:BL,background:"var(--surface)",border:`1px solid ${BL}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>
                  Zum Spielplan →
                </button>
              </div>
            )}
            {/* Readonly banner for trainer on Vereinsanlass with RSVP */}
            {(isTrainer||isAdmin)&&!canEditEvent(selEv)&&selEv.rsvp!==false&&(
              <div style={{padding:"8px 16px",background:"var(--surface)",borderBottom:`0.5px solid #FED7AA`,fontSize:13,color:STATUS_CLR.warn,display:"flex",alignItems:"center",gap:8}}>
                <span>{"ℹ️"}</span>
                <span>Vereinsanlass - nur Administratoren können Anwesenheiten bearbeiten. Du siehst die Übersicht als Lesezugriff.</span>
              </div>
            )}
            {/* Stats + Spieler-Liste nur wenn RSVP aktiv und Trainer/Admin */}
            {selEv.rsvp!==false&&(isTrainer||isAdmin)&&(
            <>
            {/* Stats */}
            {(()=>{
              const c=evCounts(selEv);
              const items=[{v:c.zu,l:"Zusagen",c:GN,bg:"#ECFDF5"},{v:c.ab,l:"Absagen",c:R,bg:RL},{v:c.unent,l:"Unentschuldigt",c:AM,bg:"#FFF7ED"},{v:c.offen,l:"Ausstehend",c:"#aaa",bg:GR}];
              return(
                <div style={{display:"flex",gap:8,padding:"14px 20px",borderBottom:"0.5px solid var(--border)",background:"var(--surface)"}}>
                  {items.map(s=>(
                    <div key={s.l} style={{flex:1,background:s.bg,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`0.5px solid ${s.c}20`}}>
                      <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                      <div style={{fontSize:13,color:s.c,fontWeight:600,marginTop:3,opacity:0.8}}>{s.l}</div>
                    </div>
                  ))}
                  {c.aufgebot>0&&(
                    <div style={{flex:1,background:"var(--surface)",borderRadius:10,padding:"10px 8px",textAlign:"center",border:"0.5px solid #818CF820"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"var(--sub)",lineHeight:1}}>{c.aufgebot}</div>
                      <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginTop:3,opacity:0.8}}>Aufgebot</div>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Spieler-Liste */}
            <div style={{padding:"0 0 4px"}}>
              <div style={{padding:"8px 20px 4px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                <div style={{display:"grid",gridTemplateColumns:`1fr auto auto${selEv.type==="Spiel"?" auto":""}`,fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,gap:"0 16px"}}>
                  <span>Spieler</span><span style={{textAlign:"center"}}>Status</span><span style={{minWidth:80,textAlign:"left"}}>Begründung</span>{selEv.type==="Spiel"&&<span style={{textAlign:"center",color:"var(--cc-accent)"}}><TI n="ball-football"/></span>}
                </div>
              </div>
              {teamRoster.map((p,i)=>{
                const resp=getResp(selEv.id,p.id);
                const editingNote=showNoteFor===p.id;
                const statusColor=resp.status==="zu"?GN:resp.status==="ab"?R:resp.status==="unentschuldigt"?AM:resp.status==="fraglich"?AM:"#F3F4F6";
                return(
                  <div key={p.id} style={{display:"grid",gridTemplateColumns:`1fr auto auto${selEv.type==="Spiel"?" auto":""}`,alignItems:"center",gap:"0 16px",padding:"8px 20px",borderBottom:"0.5px solid var(--border)",background:resp.status==="zu"?"#F9FFFB":resp.status==="ab"?"#FFF9F9":resp.status==="unentschuldigt"?"#FFF7ED":"#fff"}}>
                    <Row>
                      <div style={{width:4,height:28,borderRadius:2,background:statusColor,flexShrink:0}}/>
                      <Av name={p.name} size={28} bg={resp.status==="zu"?GN:resp.status==="ab"?R:resp.status==="unentschuldigt"?AM:resp.status==="fraglich"?AM:"#D1D5DB"}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{p.firstName} {p.lastName}</div>
                        {getNr(p.id)&&<div style={S_SUB}>{"#"+getNr(p.id)}</div>}
                      </div>
                    </Row>
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      {(canEditEvent(selEv)?(selEv.type==="Spiel"?["zu","ab","unentschuldigt"]:selEv.type==="Veranstaltung"?["zu","ab"]:["zu","ab","unentschuldigt"]):[]).map(s=>{
                        const cfg=STATUS_CFG[s];
                        const active=resp.status===s;
                        return(
                          <button key={s} onClick={()=>{setResp(selEv.id,p.id,s);if(s==="ab")setShowNoteFor(p.id);else setShowNoteFor(null);}}
                            title={cfg.label}
                            style={{width:s==="aufgebot"?32:26,height:s==="aufgebot"?32:26,borderRadius:"50%",border:`1.5px solid ${active?cfg.color:"var(--surface2)"}`,background:active?cfg.color:"#fff",color:active?"#fff":"#ccc",fontSize:s==="aufgebot"?13:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {cfg.icon}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{minWidth:80}}>
                      {editingNote?(
                        <textarea value={resp.note} onChange={e=>setResp(selEv.id,p.id,"ab",e.target.value)}
                          readOnly={!canEditEvent(selEv)}
                          onBlur={()=>setShowNoteFor(null)}
                          placeholder="Begründung…" rows={2} autoFocus
                          style={{width:"100%",padding:"3px 6px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,resize:"none",fontFamily:FONT}}/>
                      ):(
                        <span style={{fontSize:13,color:resp.note?"#555":"#ccc",fontStyle:resp.note?"normal":"italic"}}>{resp.note||"-"}</span>
                      )}
                    </div>
                    {selEv.type==="Spiel"&&(
                      <button onClick={()=>toggleAufgebot(selEv.id,p.id)} title="Im Aufgebot"
                        style={{width:30,height:30,borderRadius:"50%",border:`1.5px solid ${isInAufgebot(selEv.id,p.id)?"#4F46E5":"#F3F4F6"}`,background:isInAufgebot(selEv.id,p.id)?"#4F46E5":"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <TI n="ball-football"/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            </>
            )}
          </div>
          </div>
      )}

      {/* Ereignisliste */}

      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",flex:1,minWidth:0}}>
          {["alle","training","spiele","team-event","vereinsanlass"].map(f=>{
            const active=isFilterActive(f);
            return(
              <button key={f} onClick={()=>toggleFilter(f)}
                style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${active?"#1A1A1A":GB}`,background:active?"#1A1A1A":"transparent",color:active?"#fff":"#666",fontSize:13,fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
                {f==="alle"?"Alle":f==="training"?"Trainings":f==="spiele"?"Spiele":f==="team-event"?"Teamevents":"Vereinsanlass"}
              </button>
            );
          })}
        </div>
        <button onClick={()=>setTimeFilter(p=>p==="kommend"?"vergangen":"kommend")}
          style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:20,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,flexBasis:"100%",transition:"all 0.15s"}}>
          <span style={{fontSize:13,opacity:0.6}}>{"▾"}</span>
          <span>{timeFilter==="kommend"?"Vergangene Termine":"Kommende Termine"}</span>
        </button>
      </div>
      <div style={S_10}>
        {(showMoreEvents?filteredEvents:filteredEvents.slice(0,5)).map(ev=>{
          const c=evCounts(ev);
          const noRsvp=ev.subtype==="Vereinsanlass"&&ev.rsvp===false;
          const isCancelled=!!cancelledEvents[ev.id];
          const canCancel=isTrainer&&!isPast(ev)&&(ev.type==="Training"||ev.subtype==="Team-Event");
          const accentColor=ev.type==="Spiel"?BL:ev.subtype==="Vereinsanlass"?"#7C3AED":ev.type==="Veranstaltung"?AM:GN;
          const dateParts=ev.date.split(" ");
          const weekday=dateParts[0]||"";
          const dayMonth=dateParts[1]||ev.date;
          const MONTHS=["","Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          const dayNum=dayMonth.split(".")[0];
          const monNum=parseInt(dayMonth.split(".")[1])||0;
          const monName=MONTHS[monNum]||dayMonth.split(".")[1];
          const isSpiel=ev.type==="Spiel";
          const isVerein=ev.subtype==="Vereinsanlass";
          const isVeranst=ev.type==="Veranstaltung"&&!isVerein;
          const needsRichCard=isSpiel||isVerein||isVeranst;
          const headerBg=isSpiel?"#1a3a2a":isVerein?"#4C1D95":"#78350F";
          return(
            <div key={ev.id}
              style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:14,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",opacity:isCancelled?0.7:1}}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF8"}
              onMouseLeave={e=>e.currentTarget.style.background="var(--surface)"}>

              {needsRichCard?(
                /* -- SPIEL / ANLASS: dunkler Header -- */
                <>
                  <div onClick={()=>openEvent(ev.id)} style={{background:headerBg,padding:"12px 14px",display:"flex",alignItems:"center",gap:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:56,paddingRight:14}}>
                      <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.6}}>{weekday}</div>
                      <div style={{fontSize:21,fontWeight:700,color:"#fff",lineHeight:1.1}}>{dayNum}.</div>
                      <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.4}}>{monName}</div>
                    </div>
                    <div style={{width:1,alignSelf:"stretch",background:"rgba(255,255,255,0.15)",marginRight:14,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#fff",lineHeight:1.25,textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.opponent?"vs. "+ev.opponent:ev.title||ev.type}
                      </div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:2}}>
                        {isSpiel?(ev.home?"Heimspiel":"Auswärtsspiel"):ev.subtype||ev.type}
                        {isCancelled&&" · ⚠ Abgesagt"}
                      </div>
                    </div>
                  </div>
                  <div onClick={()=>openEvent(ev.id)} style={{display:"flex",borderBottom:"0.5px solid var(--border)"}}>
                    {[
                      {label:"Treffen",time:ev.treffpunkt?(ev.treffpunkt.match(/\d{2}:\d{2}/)||[""])[0]||"-":"-"},
                      {label:"Beginn", time:ev.time||"-"},
                      {label:"Ende",   time:ev.endTime||"-"},
                    ].map((t,i,arr)=>(
                      <div key={i} style={{flex:1,padding:"12px 8px",borderRight:i<arr.length-1?`0.5px solid ${GB}`:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <SectionLabel>{t.label}</SectionLabel>
                        <div style={{fontSize:18,fontWeight:700,color:"var(--text)",lineHeight:1}}>{t.time}</div>
                      </div>
                    ))}
                  </div>
                </>
              ):(
                /* -- TRAINING / STANDARD: schlank wie Bild 2 -- */
                <div onClick={()=>openEvent(ev.id)} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:16}}>
                  <div style={{width:58,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--surface2)",borderRadius:10,padding:"8px 6px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{weekday}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--text)",lineHeight:1}}>{dayNum}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{monName}</div>
                  </div>
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <div style={{fontWeight:600,fontSize:14,color:isCancelled?"#aaa":"#1A1A1A",textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.type==="Training"?"Training · "+ev.team:ev.title||ev.type}
                      </div>
                      <span style={{background:accentColor+"18",color:accentColor,fontSize:13,fontWeight:600,padding:"2px 8px",borderRadius:20,flexShrink:0}}>
                        {ev.subtype||ev.type}
                      </span>
                      {isCancelled&&<span style={{fontSize:13,fontWeight:600,padding:"2px 8px",borderRadius:20,background:RL,color:R}}>⚠ Abgesagt</span>}
                    </div>
                    <div style={S_SUB}><TI n="clock" style={{marginRight:3}}/> {ev.time} Uhr</div>
                  </div>
                </div>
              )}

              {/* Stat-Blöcke - immer, Aufgebot nur bei Spielen */}
              {!noRsvp&&(
                <div style={{display:"flex",borderTop:"0.5px solid var(--border)",borderBottom:"0.5px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
                  {[
                    {label:"Zusagen",  value:c.zu,    color:"#16A34A"},
                    {label:"Absagen",  value:c.ab,    color:R},
                    {label:"Unentsch.",value:c.unent, color:"#D97706"},
                    {label:"Offen",    value:c.offen, color:"var(--sub)"},
                    ...(isSpiel?[{label:"Aufgebot",value:c.aufgebot,color:"var(--cc-accent)"}]:[]),
                  ].map((s,i,arr)=>(
                    <div key={i} style={{flex:1,padding:"9px 2px",borderRight:i<arr.length-1?`0.5px solid ${GB}`:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:s.value>0?s.color:"var(--border)",lineHeight:1}}>{s.value}</div>
                      <div style={{fontSize:13,color:s.value>0?s.color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.3,fontWeight:600,opacity:0.8}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* RSVP-Toggle */}
              {!isAdmin&&!noRsvp&&myId&&(()=>{
                const resp=getResp(ev.id,myId);
                const isZu=resp.status==="zu";
                const isAb=resp.status==="ab";
                const none=!isZu&&!isAb;
                return(
                  <div style={{padding:"10px 12px",background:"var(--surface)"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",background:"var(--surface2)",borderRadius:10,padding:3,gap:4}}>
                      <button onClick={()=>setResp(ev.id,myId,isZu?null:"zu")}
                        style={{flex:1,padding:"8px 14px",border:"none",borderRadius:8,background:isZu?"#16A34A":"transparent",color:isZu?"#fff":none?"#888":"#bbb",fontSize:13,fontWeight:isZu?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        <span style={{fontSize:14}}>▲</span>
                        <span>{isZu?"Zugesagt":"Zusagen"}</span>
                      </button>
                      <div style={{width:1,background:GB,flexShrink:0,margin:"4px 0"}}/>
                      <button onClick={()=>setResp(ev.id,myId,isAb?null:"ab")}
                        style={{flex:1,padding:"8px 14px",border:"none",borderRadius:8,background:isAb?"#DC2626":"transparent",color:isAb?"#fff":none?"#888":"#bbb",fontSize:13,fontWeight:isAb?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        <span style={{fontSize:14}}>▽</span>
                        <span>{isAb?"Abgesagt":"Absagen"}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {filteredEvents.length>5&&(
          <button onClick={()=>setShowMoreEvents(p=>!p)}
            style={{padding:"8px 0",borderRadius:10,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",width:"100%"}}>
            {showMoreEvents?`↑ Weniger anzeigen`:`+ ${filteredEvents.length-5} weitere anzeigen`}
          </button>
        )}
      </div>
    </div>
  );
}

function kannTerminLesen(role){ return true; }

function kannTerminAnmelden(role){
  return ["spieler","eltern","trainer","administrator","administration","vorstand","funktionaer"].includes(role);
}

function getTerminTypLabel(typ){
  const map={training:"Training",spiel:"Spiel",vereinsanlass:"Vereinsanlass","team-event":"Team-Event",aufgebot:"Aufgebot"};
  return map[typ]||typ||"Termin";
}

export { SlotModal, SpielDetail, TermineModul, SpielplanModul, TableTab , kannTerminLesen, kannTerminAnmelden, getTerminTypLabel, PlanEditorModal};
