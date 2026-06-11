/* ═══════════════════════════════════════════════════════════════
   ClubCampus TrainingsplanModul — TrainingsplanModul.jsx
   Trainingsplan mit Gantt-Ansicht und Platzverwaltung
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { ACCENT, ACCENT2, ACCENT20, BK, BL, BTN_COLOR as BTN, BTN_TXT, FONT, GB, GN, GR, R, RL, STATUS_BG, STATUS_CLR } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, ModalOrSheet, Col, Row, H1, Btn, SectionLabel, Empty, Input } from "./theme.jsx";
import { ATT_EVENTS, GANTT, INITIAL_PLAENE, TRAININGSPLAETZE_DEFAULT } from "./demoData.js";

/* Mutable reference — wird von PlaetzeView befüllt */
const TRAININGSPLAETZE = TRAININGSPLAETZE_DEFAULT.map(p=>({...p}));

/* ── Style-Konstanten ── */
const S_SUB={fontSize:14,color:"var(--sub)"};
const S_FLEX8={display:"flex",gap:8};
const S_BOLD={fontSize:14,fontWeight:600,color:"var(--text)"};



/* ── Hilfskonstanten ── */


function PlaetzeView({sb}){
  const [plaetze, setPlaetze] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHaelften, setEditHaelften] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHaelften, setNewHaelften] = useState("");

  useEffect(function(){
    (async function(){
      try{
        if(sb){
          const {data} = await sb.from("trainingsplaetze").select("*").order("sort_order").order("name");
          if(data&&data.length>0){
            const mapped = data.map(function(p){ return {id:p.id, name:p.name, active:p.active, halfn:p.haelften||[]}; });
            setPlaetze(mapped);
            TRAININGSPLAETZE.length=0; mapped.forEach(function(x){ TRAININGSPLAETZE.push(x); });
            return;
          }
        }
        // Fallback localStorage
        const r=localStorage.getItem("trainingsplaetze_custom");
        const loaded = r?JSON.parse(r):TRAININGSPLAETZE_DEFAULT.map(p=>Object.assign({},p));
        setPlaetze(loaded);
        TRAININGSPLAETZE.length=0; loaded.forEach(function(x){ TRAININGSPLAETZE.push(x); });
      }catch(e){}
    })();
  },[]);

  async function save(p){
    setPlaetze(p);
    TRAININGSPLAETZE.length=0; p.forEach(function(x){ TRAININGSPLAETZE.push(x); });
    if(sb){
      try{
        // Upsert alle aktiven + inaktiven Plätze
        for(let i=0;i<p.length;i++){
          const platz=p[i];
          await sb.from("trainingsplaetze").upsert({
            id: typeof platz.id==="string"&&platz.id.startsWith("platz_")?undefined:platz.id,
            name: platz.name,
            haelften: platz.halfn||[],
            active: platz.active,
            sort_order: i,
          });
        }
      }catch(e){ console.warn("[FCH] savePlaetze:", e.message); }
    } else {
      try{localStorage.setItem("trainingsplaetze_custom", JSON.stringify(p));}catch(e){}
    }
  }

  function parseHaelften(str){
    return str.split(",").map(function(s){ return s.trim(); }).filter(Boolean);
  }

  function handleAdd(){
    if(!newName.trim()) return;
    const h = parseHaelften(newHaelften);
    save(plaetze.concat([{id:"platz_"+Date.now(), name:newName.trim(), active:true, halfn:h}]));
    setNewName(""); setNewHaelften(""); setShowAdd(false);
  }

  function handleRename(id){
    if(!editName.trim()) return;
    const h = parseHaelften(editHaelften);
    save(plaetze.map(function(p){ return p.id===id?Object.assign({},p,{name:editName.trim(),halfn:h}):p; }));
    setEditId(null); setEditName(""); setEditHaelften("");
  }

  function handleToggle(id){
    save(plaetze.map(function(p){ return p.id===id?Object.assign({},p,{active:!p.active}):p; }));
  }

  function handleDelete(id){
    if(!window.confirm("Platz wirklich löschen?")) return;
    save(plaetze.filter(function(p){ return p.id!==id; }));
  }

  function moveUp(i){
    if(i===0) return;
    const next=plaetze.slice();
    const tmp=next[i-1]; next[i-1]=next[i]; next[i]=tmp;
    save(next);
  }

  function moveDown(i){
    if(i===plaetze.length-1) return;
    const next=plaetze.slice();
    const tmp=next[i]; next[i]=next[i+1]; next[i+1]=tmp;
    save(next);
  }

  return(
    <div style={{maxWidth:560}}>
      <Row justify="space-between" align="center" mb={20}>
        <div>
          <H1 mb={4}>Trainingsplätze</H1>
          <p style={{fontSize:14,color:"var(--sub)",margin:0}}>Plätze verwalten, Hälften konfigurieren, aktivieren/deaktivieren</p>
        </div>
        <Btn onClick={function(){setShowAdd(true);}}>+ Platz</Btn>
      </Row>

      {/* Aktiv */}
      <div className="cc-label" style={{marginBottom:6,paddingLeft:2}}>Aktive Plätze</div>
      <div style={{background:"var(--surface)",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        {plaetze.filter(function(p){return p.active;}).length===0&&(
          <div className="cc-empty">Keine aktiven Plätze</div>
        )}
        {plaetze.map(function(p,i){
          if(!p.active) return null;
          return(
            <div key={p.id} style={{borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
              {editId===p.id ? (
                <Col style={{padding:"12px 14px"}} gap={8}>
                  <Input value={editName} onChange={function(e){setEditName(e.target.value);}} autoFocus placeholder="Platzname"/>
                  <div>
                    <p style={{fontSize:14,color:"var(--sub)",marginBottom:4}}>Hälften (kommagetrennt, z.B. <em>Hüttliseite, Rappiseite</em>)</p>
                    <Input value={editHaelften} onChange={function(e){setEditHaelften(e.target.value);}} placeholder="leer = keine Hälften" style={{width:"100%",boxSizing:"border-box"}}/>
                  </div>
                  <Row gap={8}>
                    <Btn className="cc-flex-1" onClick={function(){handleRename(p.id);}}>Speichern</Btn>
                    <Btn variant="ghost" onClick={function(){setEditId(null);setEditName("");setEditHaelften("");}}>Abbrechen</Btn>
                  </Row>
                </Col>
              ) : (
                <Row gap={12} style={{padding:"11px 14px"}}>
                  <Col gap={4} className="cc-shrink-0">
                    <button onClick={function(){moveUp(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===0}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:4,background:"var(--surface)",cursor:"pointer",fontSize:12,color:"var(--sub)",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                    <button onClick={function(){moveDown(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===plaetze.filter(function(x){return x.active;}).length-1}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:4,background:"var(--surface)",cursor:"pointer",fontSize:12,color:"var(--sub)",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
                  </Col>
                  <div style={{width:10,height:10,borderRadius:"50%",background:GN,flexShrink:0,marginTop:2}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={S_BOLD}>{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div style={{fontSize:14,color:"var(--sub)",marginTop:1}}>{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <Row gap={6} className="cc-shrink-0">
                    <button onClick={function(){setEditId(p.id);setEditName(p.name);setEditHaelften((p.halfn||[]).join(", "));}} title="Bearbeiten"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                    <button onClick={function(){handleToggle(p.id);}} title="Deaktivieren"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                    </button>
                    <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                  </Row>
                </Row>
              )}
            </div>
          );
        })}
      </div>

      {/* Inaktiv */}
      {plaetze.some(function(p){return !p.active;})&&(
        <>
          <div className="cc-label" style={{marginBottom:6,paddingLeft:2}}>Inaktive Plätze</div>
          <div style={{background:"var(--surface)",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16,opacity:0.7}}>
            {plaetze.map(function(p,i){
              if(p.active) return null;
              return(
                <Row key={p.id} gap={12} style={{padding:"10px 14px",borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:"var(--border)",flexShrink:0,marginTop:2}}/>
                  <div className="cc-flex-1">
                    <div className="cc-text-sm">{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div className="cc-text-sm">{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <Btn variant="ghost" onClick={function(){handleToggle(p.id);}}>Aktivieren</Btn>
                  <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                    style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                </Row>
              );
            })}
          </div>
        </>
      )}

      {/* Neuer Platz */}
      {showAdd&&(
        <div style={{background:"var(--surface)",border:"1.5px solid "+BL,borderRadius:12,padding:"16px",display:"flex",flexDirection:"column",gap:12,marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:14}}>Neuer Platz</div>
          <Input value={newName} onChange={function(e){setNewName(e.target.value);}} autoFocus placeholder="z.B. Platz Erlenbach"/>
          <div>
            <p style={{fontSize:14,color:"var(--sub)",marginBottom:4}}>Hälften (optional, kommagetrennt)</p>
            <Input value={newHaelften} onChange={function(e){setNewHaelften(e.target.value);}} placeholder="z.B. Nordseite, Südseite" style={{width:"100%",boxSizing:"border-box"}}/>
          </div>
          <Row gap={8}>
            <Btn className="cc-flex-1" onClick={handleAdd}>Hinzufügen</Btn>
            <Btn variant="ghost" onClick={function(){setShowAdd(false);setNewName("");setNewHaelften("");}}>Abbrechen</Btn>
          </Row>
        </div>
      )}

      <div style={S_SUB}>
        Inaktive Plätze erscheinen nicht in Dropdowns. Hälften mit Komma trennen.
      </div>
    </div>
  );
}

function PlatzGantt({plan,wochenSlots,dayDates,DAYS,dagIndexes,today,displayStart,displayEnd,teamFilter,TEAM_COLORS,canEdit,onClickSlot,onNewSlot,GB,GR,BK,BL}){
  const aktivePlaetze = TRAININGSPLAETZE.filter(function(p){return p.active;});
  const idxMap = dagIndexes || DAYS.map(function(_,i){return i;});
  const alleCols = aktivePlaetze.reduce(function(acc,p){
    const halfn = p.halfn||[];
    if(halfn.length > 0){
      halfn.forEach(function(h){ acc.push({platz:p, half:h, key:p.id+"_"+h}); });
    } else {
      acc.push({platz:p, half:null, key:p.id});
    }
    return acc;
  },[]);

  const totalCols = alleCols.length;
  // In Tagesansicht breitere Spalten
  const timeW = 64;
  const nDays = DAYS.length;
  const nCols = nDays * totalCols;
  const minColW = DAYS.length === 1 ? 100 : 52;
  const maxColW = DAYS.length === 1 ? 200 : 120;
  const [containerW, setContainerW] = useState(800);
  const containerRef = useRef(null);
  useEffect(function(){
    function measure(){
      if(containerRef.current){
        setContainerW(containerRef.current.offsetWidth - timeW - 4);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return function(){ window.removeEventListener("resize", measure); };
  }, []);
  const fitsColW = Math.floor(containerW / nCols);
  const colW = Math.max(minColW, Math.min(maxColW, fitsColW));
  const dayW = totalCols * colW;
  const H15 = 18;

  const slots15 = [];
  for(let h=displayStart; h<displayEnd; h++){
    slots15.push(h, h+0.25, h+0.5, h+0.75);
  }

  function fmtT15(v){
    const hh = String(Math.floor(v)).padStart(2,"0");
    const mm = String(Math.round((v%1)*60)).padStart(2,"0");
    return hh+":"+mm;
  }

  function fmtDate(d){
    return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0");
  }

  return (
    <div ref={containerRef} style={{width:"100%", overflowX:"auto", WebkitOverflowScrolling:"touch", fontFamily:FONT, fontSize:14}}>
      <div style={{minWidth: timeW + nDays*dayW}}>

        {/* Headers */}
        <div style={{display:"flex", background:"var(--surface)", borderBottom:"1.5px solid #D1CFC8", height:44, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid var(--border)", height:"100%"}}/>
          {DAYS.map(function(day,di){
            const d = dayDates[idxMap[di]];
            const isToday = d.toDateString()===today.toDateString();
            const hasSlots = (wochenSlots[idxMap[di]]||[]).length > 0;
            return (
              <div key={di} style={{width:dayW, flexShrink:0, borderRight:"1.5px solid #C8C5BC", background:isToday?"#EEF2FF":"transparent", textAlign:"center", padding:"4px", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                <div style={{fontSize:14, fontWeight:700, letterSpacing:0.5, color:isToday?"#4F46E5":hasSlots?BK:"#888580", textTransform:"uppercase"}}>{day}</div>
                <div style={{fontSize:14, marginTop:1, color:isToday?"#6366F1":"#6B7280", fontWeight:isToday?600:400}}>{fmtDate(d)}</div>
              </div>
            );
          })}
        </div>

        {/* Platz-Namen */}
        <div style={{display:"flex", background:"var(--surface2)", borderBottom:"0.5px solid var(--border)", height:22, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid var(--border)", height:"100%"}}/>
          {DAYS.map(function(_,di){
            const isToday = dayDates[idxMap[di]].toDateString()===today.toDateString();
            return aktivePlaetze.map(function(p,pi){
              const spanCols = (p.halfn||[]).length||1;
              const isLast = pi===aktivePlaetze.length-1;
              return (
                <div key={di+"_"+p.id} style={{width:spanCols*colW, flexShrink:0, borderRight:isLast?"1.5px solid #C8C5BC":"1px solid #DDD9CF", background:isToday?"#E8ECFF":"transparent", textAlign:"center", padding:"2px 3px", height:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <div style={{fontSize:14, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
                </div>
              );
            });
          })}
        </div>

        {/* Hälften */}
        <div style={{display:"flex", background:"var(--surface2)", borderBottom:"1.5px solid var(--border)", height:18, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid var(--border)", height:"100%"}}/>
          {DAYS.map(function(_,di){
            const isToday = dayDates[idxMap[di]].toDateString()===today.toDateString();
            return alleCols.map(function(col,ci){
              const isLast = ci===alleCols.length-1;
              return (
                <div key={di+"_"+col.key} style={{width:colW, flexShrink:0, borderRight:isLast?"1.5px solid #C8C5BC":"0.5px solid #DDD9CF", background:isToday?"#DDE1F8":"transparent", textAlign:"center", padding:"1px 2px", height:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <div style={{fontSize:14, fontWeight:600, color:"var(--sub)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.3}}>{col.half||""}</div>
                </div>
              );
            });
          })}
        </div>

        {/* Grid */}
        <div style={{display:"flex"}}>

          {/* Zeitachse */}
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid var(--border)", background:"var(--surface2)"}}>
            {slots15.map(function(t,i){
              const isHour = t%1===0;
              const isHalf = Math.round((t%1)*60)===30;
              return (
                <div key={t} style={{
                  height:H15,
                  borderTop:i>0?"0.5px solid "+(isHour?"#D1CFC8":isHalf?"#E8E6DF":"#F0EFEB"):"none",
                  boxSizing:"border-box",
                  display:"flex", alignItems:"flex-start", justifyContent:"flex-end",
                  paddingRight:5, paddingTop:1
                }}>
                  {isHour && <span style={{fontSize:14, color:"var(--sub)", fontWeight:600, letterSpacing:-0.3}}>{fmtT15(t)}</span>}
                  {!isHour && <span style={{fontSize:14, color:"#D1D5DB", fontWeight:400}}>{fmtT15(t)}</span>}
                </div>
              );
            })}
          </div>

          {/* 7 Tage */}
          {DAYS.map(function(day,di){
            const realDi = idxMap[di];
            const isToday = dayDates[realDi].toDateString()===today.toDateString();
            const daySlots = (wochenSlots[realDi]||[]).filter(function(s){ return teamFilter==="alle"||s.team===teamFilter; });
            const totalH = H15*slots15.length;

            return (
              <div key={di} style={{display:"flex", borderRight:"1.5px solid #C8C5BC", background:isToday?"#F8F9FF":"transparent"}}>
                {alleCols.map(function(col,ci){
                  const platzHaelften = col.platz.halfn||[];
                  const hasHaelften = platzHaelften.length > 0;
                  const isFirstHaelfte = hasHaelften && col.half===platzHaelften[0];
                  const numHaelften = platzHaelften.length||1;

                  const colSlots = daySlots.filter(function(s){
                    if(!hasHaelften){
                      return s.location===col.platz.name || (s.end_ort&&s.end_ort===col.platz.name);
                    }
                    var p1platz = s.location;
                    var p2platz = s.end_ort||s.location;
                    var p1h = s.half;
                    var p2h = s.end_half;
                    if(!s.wechsel_zeit){
                      if(col.platz.name!==p1platz) return false;
                      if(!p1h) return true;
                      return p1h===col.half;
                    }
                    var p1here = col.platz.name===p1platz && (!p1h ? true : p1h===col.half);
                    var p2here = col.platz.name===p2platz && (!p2h ? true : p2h===col.half);
                    return p1here || p2here;
                  });

                  return (
                    <div key={col.key}
                      style={{width:colW, flexShrink:0, position:"relative", height:totalH, borderRight:ci<alleCols.length-1?"0.5px solid #E8E6DF":"none", cursor:canEdit?"crosshair":"default"}}
                      onClick={canEdit ? function(e){
                        if(e.target !== e.currentTarget) return;
                        var rect = e.currentTarget.getBoundingClientRect();
                        var relY = e.clientY - rect.top;
                        var rawTime = displayStart + relY / (H15*4);
                        var snapped = Math.round(rawTime*4)/4;
                        snapped = Math.max(displayStart, Math.min(displayEnd-1, snapped));
                        onNewSlot({
                          weekday: DAYS[di],
                          start: snapped,
                          end: Math.min(snapped+1.5, displayEnd),
                          ort: col.platz.name,
                          half: col.half||"",
                        });
                      } : undefined}>
                      {slots15.map(function(t,i){
                        const isHour = t%1===0;
                        const isHalf = Math.round((t%1)*60)===30;
                        return (
                          <div key={t} style={{position:"absolute", top:i*H15, left:0, right:0, height:H15, borderTop:i>0?"0.5px solid "+(isHour?"#D1CFC8":isHalf?"#E8E6DF":"#F2F1ED"):"none", pointerEvents:"none"}}/>
                        );
                      })}
                      {colSlots.map(function(s,si){
                        const col2 = s.color||TEAM_COLORS[s.team]||BL;
                        var blocks = [];
                        if(!s.wechsel_zeit){
                          var isFullP = hasHaelften&&!s.half;
                          if(isFullP && !isFirstHaelfte){ /* skip */ }
                          else {
                            var sr = (isFullP && isFirstHaelfte) ? -(numHaelften-1)*colW-1 : 1;
                            blocks.push({start:s.start, end:s.end, right:sr});
                          }
                        } else {
                          var p1platz = s.location;
                          var p2platz = s.end_ort||s.location;
                          var p1h = s.half;
                          var p2h = s.end_half;
                          var p1here = col.platz.name===p1platz && (!p1h ? true : p1h===col.half);
                          var p2here = col.platz.name===p2platz && (!p2h ? true : p2h===col.half);
                          if(p1here){
                            var isFullP1 = hasHaelften&&!p1h&&col.platz.name===p1platz;
                            var sr1 = (isFullP1 && isFirstHaelfte) ? -(numHaelften-1)*colW-1 : 1;
                            if(!isFullP1 || isFirstHaelfte){
                              blocks.push({start:s.start, end:s.wechsel_zeit, right:sr1});
                            }
                          }
                          if(p2here){
                            var isFullP2 = hasHaelften&&!p2h&&col.platz.name===p2platz;
                            var otherPlatz = col.platz.name===p2platz;
                            var p2Cols = otherPlatz ? (p2platz===p1platz ? numHaelften : (TRAININGSPLAETZE.find(function(pp){return pp.name===p2platz;})||{}).halfn?.length||1) : 1;
                            var sr2 = (isFullP2 && (isFirstHaelfte||!hasHaelften)) ? -(p2Cols-1)*colW-1 : 1;
                            if(!isFullP2 || isFirstHaelfte || !hasHaelften){
                              blocks.push({start:s.wechsel_zeit, end:s.end, right:sr2});
                            }
                          }
                        }
                        return blocks.map(function(b,bi){
                          var top = (b.start-displayStart)*H15*4;
                          var h = (b.end-b.start)*H15*4-2;
                          return (
                            <div key={si+"_"+bi} onClick={function(){onClickSlot(s);}} title={s.team+" "+fmtT15(b.start)+"-"+fmtT15(b.end)}
                              style={{
                                position:"absolute", top:top+1, left:2, right:b.right<1?b.right:2,
                                height:Math.max(h,14),
                                background:col2,
                                borderRadius:4,
                                borderLeft:"3px solid rgba(255,255,255,0.35)",
                                padding:"2px 4px",
                                overflow:"hidden", cursor:"pointer",
                                zIndex:b.right<1?2:1,
                                boxSizing:"border-box",
                                boxShadow:"0 1px 3px rgba(0,0,0,0.18)"
                              }}>
                              <div style={{color:"#fff", fontWeight:700, fontSize:14, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.2}}>{s.team}</div>
                              {h>28 && <div style={{color:"rgba(255,255,255,0.82)", fontSize:14, letterSpacing:0.1}}>{fmtT15(b.start)}-{fmtT15(b.end)}</div>}
                            </div>
                          );
                        });
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}
function TrainingsplanModul({team: teamProp, role, kannSchreiben, kannVerwalten, sb:supabase, dbTeams=[]}){
  const START = 7, END = 22, H = 52;
  const isMobile = useIsMobile();
  const canEdit = role==="administrator"||role==="administration";

  const [plaene, setPlaene] = useState([]);  // Leer starten — erst nach useEffect befüllen
  const [plaeneGeladen, setPlaeneGeladen] = useState(false);
  const [aktiverPlan, setAktiverPlan] = useState("plan_1");
  const [vorschauPlan, setVorschauPlan] = useState(null); // null = aktiver Plan, sonst Plan-ID
  const [teamFilter, setTeamFilter] = useState(teamProp||"alle");
  const [kwOffset, setKwOffset] = useState(0);
  const [ausnahmen, setAusnahmen] = useState({});
  const [ganttMode, setGanttMode] = useState("tag");
  const [editSlot, setEditSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showAusnahmeModal, setShowAusnahmeModal] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState(null);
  const [trainerNachrichten, setTrainerNachrichten] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [newSlotPrefill, setNewSlotPrefill] = useState(null);
  const [showPlanVerwaltung, setShowPlanVerwaltung] = useState(false);
  const [trainingsTab, setTrainungsTab] = useState("gantt");
  const [ansicht, setAnsicht] = useState("woche"); // "woche" | "tag"
  const [selectedDay, setSelectedDay] = useState(0); // 0=Mo..6=So

  useEffect(function(){
    (async function(){
      try{
        // Supabase laden
        if(supabase){
          // Pläne laden
          const {data: plaeneData} = await supabase.from("trainingsplan_vorlagen").select("*").order("valid_from");
          if(plaeneData && plaeneData.length > 0){
            // Slots pro Plan laden
            const {data: slotsData} = await supabase.from("trainingsplan_slots").select("*");
            const slots = slotsData || [];
            const plaeneMitSlots = plaeneData.map(function(p){
              return {
                ...p,
                slots: slots.filter(function(s){ return s.template_id === p.id; }).map(function(s){
                  return {
                    id: s.id,
                    weekday: s.weekday,
                    team: s.team,
                    start: s.start_zeit,
                    end: s.end_zeit,
                    location: s.location,
                    end_ort: s.end_ort||"",
                    half: s.half||"",
                    end_half: s.end_half||"",
                    wechsel_zeit: s.wechsel_zeit||"",
                    color: s.color||"",
                  };
                }),
              };
            });
            setPlaene(plaeneMitSlots);
            // Aktiven Plan setzen
            const aktiver = plaeneMitSlots.find(function(p){ return p.active; });
            if(aktiver) setAktiverPlan(aktiver.id);
          } else {
            // Supabase leer — mit leerer Liste starten
            setPlaene([]);
          }
          // Ausnahmen laden
          const {data: ausnahmenData} = await supabase.from("trainingsplan_ausnahmen").select("*");
          if(ausnahmenData){
            const ausnahmenMap = {};
            ausnahmenData.forEach(function(a){
              // DB speichert year + week_nr separat → zu kwKey "2026_21" zusammensetzen
              const key = a.year+"_"+a.week_nr;
              if(!ausnahmenMap[key]) ausnahmenMap[key] = [];
              ausnahmenMap[key].push({
                id: a.id,
                slot_id: a.slot_id,
                type: a.type,
                kw_key: key,
                week_nr: a.week_nr,
                year: a.year,
                neue_start: a.neue_start_zeit,
                neue_end: a.neue_end_zeit,
                neuer_ort: a.neuer_ort,
                neue_half: a.neue_haelfte,
                begruendung: a.begruendung||"",
                // Zusatz-Felder
                weekday: a.zusatz_wochentag,
                team: a.zusatz_team,
                start: a.zusatz_start_zeit,
                end: a.zusatz_end_zeit,
                location: a.zusatz_ort,
                color: a.zusatz_farbe,
                isZusatz: a.type==="zusatz",
              });
            });
            setAusnahmen(ausnahmenMap);
          }
        } else {
          // Kein Supabase — localStorage
          const r = await window.storage.get("trainingsPlaene");
          if(r) setPlaene(JSON.parse(r.value));
          else setPlaene(INITIAL_PLAENE);  // Nur wenn gar keine Daten vorhanden
          const a = await window.storage.get("trainingsAusnahmen");
          if(a) setAusnahmen(JSON.parse(a.value));
        }
        const tn = await window.storage.get("trainer_benachrichtigungen");
        if(tn){ const alle=JSON.parse(tn.value); setTrainerNachrichten(alle.filter(function(n){return !n.gelesen;})); }
      }catch(e){ console.warn("[FCH] Trainingsplan laden Fehler:", e.message); }
    })();
  },[]);

  // Wochentag-String → JS getDay() Zahl (Mo=1...So=0)
  const WEEKDAY_MAP = {"Mo":1,"Di":2,"Mi":3,"Do":4,"Fr":5,"Sa":6,"So":0};

  async function syncTrainingsFromSlot(slotId, slot, plan){
    if(!supabase||!slotId||!plan?.valid_from) return;
    try{
      // 1. Bestehende Trainings für diesen Slot löschen
      await supabase.from("trainings").delete().eq("trainingsplan_slot_id", slotId);

      // 2. Neue Einträge für jeden Wochentag im Plan-Zeitraum erstellen
      const from = new Date(plan.valid_from);
      const until = plan.valid_until ? new Date(plan.valid_until) : new Date(from.getFullYear(), 11, 31);
      const targetDay = WEEKDAY_MAP[slot.weekday];
      if(targetDay === undefined) return;

      const trainingsToInsert = [];
      const cur = new Date(from);
      // Zum ersten passenden Wochentag springen
      while(cur.getDay() !== targetDay) cur.setDate(cur.getDate()+1);

      while(cur <= until){
        const dateStr = cur.getFullYear()+"-"+String(cur.getMonth()+1).padStart(2,"0")+"-"+String(cur.getDate()).padStart(2,"0");
        const zeitVon = slot.start!=null ? String(Math.floor(slot.start)).padStart(2,"0")+":"+(slot.start%1===0?"00":"30")+":00" : null;
        const zeitBis = slot.end!=null   ? String(Math.floor(slot.end)).padStart(2,"0")+":"+(slot.end%1===0?"00":"30")+":00"   : null;
        trainingsToInsert.push({
          team: slot.team,
          date: dateStr,
          zeit_von: zeitVon,
          zeit_bis: zeitBis,
          location: slot.location||null,
          end_ort: slot.end_ort||null,
          abgesagt: false,
          trainingsplan_slot_id: slotId,
        });
        cur.setDate(cur.getDate()+7);
      }

      // In Batches von 50 einfügen
      for(let i=0; i<trainingsToInsert.length; i+=50){
        await supabase.from("trainings").insert(trainingsToInsert.slice(i,i+50));
      }
    }catch(e){ console.warn("[FCH] syncTrainingsFromSlot Fehler:", e.message); }
  }

  async function savePlaene(p){
    setPlaene(p);
    if(supabase){
      try{
        for(const plan of p){
          const planId = plan.id && !plan.id.startsWith("plan_") ? plan.id : crypto.randomUUID();
          await supabase.from("trainingsplan_vorlagen").upsert({
            id: planId,
            name: plan.name,
            valid_from: plan.valid_from,
            valid_until: plan.valid_until,
            active: plan.active,
          });
          if(plan.slots){
            for(const s of plan.slots){
              // Lokale IDs (slot_x_y) oder fehlende IDs → neue UUID generieren
              const slotId = s.id && !s.id.startsWith("slot_") ? s.id : crypto.randomUUID();
              await supabase.from("trainingsplan_slots").upsert({
                id: slotId,
                template_id: s.template_id||plan.id,
                weekday: s.weekday,
                team: s.team,
                start_zeit: s.start,
                end_zeit: s.end,
                location: s.location||null,
                end_ort: s.end_ort||null,
                half: s.half||null,
                end_haelfte: s.end_half||null,
                wechsel_zeit: s.wechsel_zeit||null,
                color: s.color||null,
                valid_from_week: s.valid_from_week||null,
                valid_from_week_year: s.valid_from_week ? parseInt(s.valid_from_week.split("_")[0]) : null,
                valid_from_week_nr: s.valid_from_week ? parseInt(s.valid_from_week.split("_")[1]) : null,
              });
              // Trainings-Einträge synchronisieren
              await syncTrainingsFromSlot(slotId, s, plan);
            }
          }
        }
      }catch(e){ console.warn("[FCH] savePlaene Fehler:", e.message); }
    } else {
      try{ await window.storage.set("trainingsPlaene", JSON.stringify(p)); }catch(e){ localStorage.setItem("trainingsPlaene", JSON.stringify(p)); }
    }
  }

  async function saveAusnahmen(a){
    setAusnahmen(a);
    if(supabase){
      try{
        const alle = Object.entries(a).flatMap(function([kwKey, list]){
          const parts = kwKey.split("_");
          const year = parseInt(parts[0]);
          const week_nr = parseInt(parts[1]);
          return list.map(function(ausnahme){ return {...ausnahme, year, week_nr}; });
        });
        for(const ausnahme of alle){
          await supabase.from("trainingsplan_ausnahmen").upsert({
            id: ausnahme.id||undefined,
            slot_id: ausnahme.slot_id||null,
            type: ausnahme.type,
            week_nr: ausnahme.week_nr,
            year: ausnahme.year,
            neue_start_zeit: ausnahme.neue_start||null,
            neue_end_zeit: ausnahme.neue_end||null,
            neuer_ort: ausnahme.neuer_ort||null,
            neue_haelfte: ausnahme.neue_half||null,
            begruendung: ausnahme.begruendung||null,
            // Zusatz-Felder
            zusatz_wochentag: ausnahme.weekday||null,
            zusatz_team: ausnahme.team||null,
            zusatz_start_zeit: ausnahme.start||null,
            zusatz_end_zeit: ausnahme.end||null,
            zusatz_ort: ausnahme.location||null,
            zusatz_farbe: ausnahme.color||null,
          });
        }
      }catch(e){ console.warn("[FCH] saveAusnahmen Fehler:", e.message); }
    } else {
      try{ await window.storage.set("trainingsAusnahmen", JSON.stringify(a)); }catch(e){}
    }
  }

  const today = new Date(2026,4,24);
  function getMonday(d){ const day=d.getDay(); const diff=d.getDate()-day+(day===0?-6:1); return new Date(new Date(d).setDate(diff)); }
  const monday = new Date(getMonday(new Date(today)));
  monday.setDate(monday.getDate() + kwOffset*7);
  const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
  const dayDates = DAYS.map(function(_,i){ const d=new Date(monday); d.setDate(d.getDate()+i); return d; });
  function getKW(d){ const jan4=new Date(d.getFullYear(),0,4); const diff=d-jan4; return Math.ceil((diff/86400000+jan4.getDay()+1)/7); }
  const kw = getKW(monday);
  function fmtDate(d){ return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0"); }
  function fmtTime(v){ return String(Math.floor(v)).padStart(2,"0")+":"+(v%1===0?"00":"30"); }

  const angezeigterPlanId = vorschauPlan || aktiverPlan;
  const plan = plaene.find(function(p){return p.id===angezeigterPlanId;})||plaene[0];
  const isVorschau = vorschauPlan && vorschauPlan!==aktiverPlan;
  const kwKey = monday.getFullYear()+"_"+kw;
  const kwAusnahmen = ausnahmen[kwKey]||[];

  const FCH_TEAMS = dbTeams.length>0
    ? dbTeams.filter(t=>t.aktiv!==false).map(t=>t.name)
    : ["1. Mannschaft","2. Mannschaft","3. Mannschaft","4. Mannschaft",
       "Ältere Junioren A","Ältere Junioren B",
       "Cc-Junioren","Dc-Junioren","Ec-Junioren","Fc-Junioren",
       "Gc-Junioren","Hc-Junioren","Ic-Junioren",
       "Frauen","Mädchen"];
  const alleTeams = Array.from(new Set([
    ...FCH_TEAMS,
    ...(plan?.slots||[]).map(function(s){return s.team;})
  ])).sort();
  const TEAM_COLORS = {};
  (plan?.slots||[]).forEach(function(s){ TEAM_COLORS[s.team]=s.color; });

  // Prüfe ob die aktuelle Woche innerhalb der Plan-Gültigkeit liegt
  const wocheStart = monday;
  const wocheEnd = new Date(monday); wocheEnd.setDate(wocheEnd.getDate()+6);
  const planGueltigAb  = plan?.valid_from  ? new Date(plan.valid_from)  : null;
  const planGueltigBis = plan?.valid_until ? new Date(plan.valid_until) : null;
  // Plan gilt diese Woche wenn: wocheEnd >= valid_from UND (kein valid_until ODER wocheStart <= valid_until)
  const planGueltigDieseWoche =
    (!planGueltigAb  || wocheEnd   >= planGueltigAb) &&
    (!planGueltigBis || wocheStart <= planGueltigBis);

  const wochenSlots = DAYS.map(function(day){
    if(!planGueltigDieseWoche) return [];
    const basis = (plan?.slots||[])
      .filter(function(s){ return s.weekday===day; })
      .filter(function(s){
        // Gilt dieser Slot ab dieser KW?
        if(!s.valid_from_week) return true;
        const [cy,ck] = kwKey.split("_").map(Number);
        const [gy,gk] = s.valid_from_week.split("_").map(Number);
        return cy>gy || (cy===gy && ck>=gk);
      })
      .filter(function(s){ return !kwAusnahmen.some(function(a){ return a.type==="absage"&&a.slot_id===s.id; }); })
      .map(function(s){
        const va = kwAusnahmen.find(function(a){ return a.type==="verschiebung"&&a.slot_id===s.id; });
        const oa = kwAusnahmen.find(function(a){ return a.type==="location"&&a.slot_id===s.id; });
        if(va) return Object.assign({},s,{start:va.neue_start,end:va.neue_end,isVerschoben:true});
        if(oa) return Object.assign({},s,{location:oa.neuer_ort,isOrtGeaendert:true});
        return s;
      });
    const zusatz = kwAusnahmen
      .filter(function(a){ return a.type==="zusatz"&&a.weekday===day; })
      .map(function(a){ return Object.assign({},a,{isZusatz:true}); });
    return basis.concat(zusatz);
  });

  const DEFAULT_START = 14.5; // 14:30 Uhr
  const DEFAULT_END   = 22;   // 22:00 Uhr
  const allStarts = wochenSlots.reduce(function(acc,ss){ return acc.concat(ss.map(function(s){return s.start;})); },[]);
  const allEnds   = wochenSlots.reduce(function(acc,ss){ return acc.concat(ss.map(function(s){return s.end;})); },[]);
  const minStart  = allStarts.length ? Math.min.apply(null,allStarts) : DEFAULT_START;
  const maxEnd    = allEnds.length   ? Math.max.apply(null,allEnds)   : DEFAULT_END;
  // Nur früher als Standard wenn ein Slot wirklich früher startet
  const displayStart = minStart < DEFAULT_START ? Math.max(7, Math.floor(minStart)) : DEFAULT_START;
  // Mindestens bis DEFAULT_END, sonst bis zum Ende des letzten Slots (aufgerundet)
  const displayEnd = Math.max(DEFAULT_END, Math.ceil(maxEnd));
  const trainerAbsagen = kwAusnahmen.filter(function(a){ return a.type==="absage"&&a.von_termin; });

  function handleSlotSave(slot){
    const cleanSlot = Object.assign({},slot);
    delete cleanSlot.nurDieseWoche;

    if(slot.nurDieseWoche){
      if(editSlot&&editSlot.id){
        // Edit existing: save as Ausnahme for this week
        const ausnahme = {
          type: "verschiebung",
          slot_id: editSlot.id,
          weekday: slot.weekday||editSlot.weekday,
          team: slot.team||editSlot.team,
          neue_start: slot.start,
          neue_end: slot.end,
          neuer_ort: slot.location,
          von_termin: false,
        };
        const next = Object.assign({},ausnahmen);
        next[kwKey] = (ausnahmen[kwKey]||[])
          .filter(function(a){ return !(a.slot_id===editSlot.id&&a.type==="verschiebung"); })
          .concat([ausnahme]);
        saveAusnahmen(next);
      } else {
        // New slot: save as zusatz Ausnahme for selected week only
        const targetKwKey = slot.selectedKwKey||kwKey;
        const zusatz = Object.assign({},cleanSlot,{
          type: "zusatz",
          weekday: cleanSlot.weekday,
          isZusatz: true,
          id: "zusatz_"+Date.now(),
        });
        const next = Object.assign({},ausnahmen);
        next[targetKwKey] = (ausnahmen[targetKwKey]||[]).concat([zusatz]);
        saveAusnahmen(next);
      }
    } else {
      // Save permanently — ab der gewählten KW (valid_from)
      delete cleanSlot.selectedKwKey;
      const gueltigAb = slot.selectedKwKey || null; // kwKey format: "2026_21"
      const updated = plaene.map(function(p){
        if(p.id!==angezeigterPlanId) return p;
        return Object.assign({},p,{slots: editSlot&&editSlot.id
          ? p.slots.map(function(s){ return s.id===editSlot.id?Object.assign({},s,cleanSlot):s; })
          : p.slots.concat([Object.assign({},cleanSlot,{id:"slot_"+Date.now(), valid_from_week:gueltigAb})])
        });
      });
      savePlaene(updated);
    }
    setShowSlotModal(false);
    setEditSlot(null);
  }

  function handleSlotDeleteInit(slotId){
    const slot = (plan?.slots||[]).find(function(s){ return s.id===slotId; });
    if(!slot) return;
    const td = new Date(2026,4,24);
    const zukunftigeEvents = ATT_EVENTS.filter(function(e){
      if(e.type!=="Training"||e.team!==slot.team) return false;
      const parts = e.date.split(" ");
      const dm = parts.length>1?parts[1]:parts[0];
      const dparts = dm.split(".");
      const evDate = new Date((parseInt(dparts[2])||2026),parseInt(dparts[1])-1,parseInt(dparts[0]));
      return evDate>=td;
    });
    setDeleteSlot(Object.assign({},slot,{zukunftigeEvents:zukunftigeEvents, selectedEvIds:new Set()}));
    setShowDeleteDialog(true);
    setShowSlotModal(false);
  }

  async function handleSlotDeleteConfirm(slot, selectedEvIds){
    const updated = plaene.map(function(p){
      if(p.id!==angezeigterPlanId) return p;
      return Object.assign({},p,{slots:p.slots.filter(function(s){ return s.id!==slot.id; })});
    });
    savePlaene(updated);
    // Slot aus Supabase löschen
    if(supabase && slot.id){
      try{
        await supabase.from("trainings").delete().eq("trainingsplan_slot_id", slot.id);
        await supabase.from("trainingsplan_slots").delete().eq("id", slot.id);
      }catch(e){ console.warn("[FCH] Slot löschen Fehler:", e.message); }
    }
    if(selectedEvIds.size>0){
      try{
        const cr = await window.storage.get("cancelled_events");
        const cancelled = cr?JSON.parse(cr.value):{};
        selectedEvIds.forEach(function(id){ cancelled[id]=true; });
        await window.storage.set("cancelled_events",JSON.stringify(cancelled));
      }catch(e){}
    }
    setShowDeleteDialog(false);
    setDeleteSlot(null);
    setEditSlot(null);
  }

  function handleAusnahmeSave(ausnahme, fuerAlleWochen){
    if(fuerAlleWochen){
      if(ausnahme.type==="absage"){ handleSlotDeleteInit(ausnahme.slot_id); }
      else if(ausnahme.type==="verschiebung"){
        const updated = plaene.map(function(p){
          if(p.id!==angezeigterPlanId) return p;
          return Object.assign({},p,{slots:p.slots.map(function(s){ return s.id===ausnahme.slot_id?Object.assign({},s,{start:ausnahme.neue_start,end:ausnahme.neue_end}):s; })});
        });
        savePlaene(updated);
      } else if(ausnahme.type==="location"){
        const updated = plaene.map(function(p){
          if(p.id!==angezeigterPlanId) return p;
          return Object.assign({},p,{slots:p.slots.map(function(s){ return s.id===ausnahme.slot_id?Object.assign({},s,{ort:ausnahme.neuer_ort}):s; })});
        });
        savePlaene(updated);
      }
    } else {
      const next = Object.assign({},ausnahmen);
      next[kwKey] = (ausnahmen[kwKey]||[]).filter(function(a){ return !(a.slot_id===ausnahme.slot_id&&a.type===ausnahme.type); }).concat([ausnahme]);
      saveAusnahmen(next);
      // Bei Absage: trainings-Eintrag auf abgesagt=true setzen
      if(ausnahme.type==="absage" && supabase && ausnahme.slot_id){
        const kwParts = kwKey.split("_");
        const year = parseInt(kwParts[0]);
        const weekNr = parseInt(kwParts[1]);
        // Datum des betroffenen Trainings berechnen
        const targetDate = dayDates[DAYS.indexOf(ausnahme.weekday)];
        if(targetDate){
          const dateStr = targetDate.getFullYear()+"-"+String(targetDate.getMonth()+1).padStart(2,"0")+"-"+String(targetDate.getDate()).padStart(2,"0");
          supabase.from("trainings").update({abgesagt:true})
            .eq("trainingsplan_slot_id", ausnahme.slot_id)
            .eq("date", dateStr)
            .then(function({error}){ if(error) console.warn("[FCH] Absage setzen Fehler:", error.message); });
        }
      }
    }
    setShowAusnahmeModal(false);
  }

  function handleAusnahmeRemove(ausnahme){
    const next = Object.assign({},ausnahmen);
    next[kwKey] = (ausnahmen[kwKey]||[]).filter(function(a){ return a!==ausnahme; });
    saveAusnahmen(next);
    // Bei Absage-Rücknahme: trainings-Eintrag wieder auf abgesagt=false setzen
    if(ausnahme.type==="absage" && supabase && ausnahme.slot_id){
      const targetDate = dayDates[DAYS.indexOf(ausnahme.weekday)];
      if(targetDate){
        const dateStr = targetDate.getFullYear()+"-"+String(targetDate.getMonth()+1).padStart(2,"0")+"-"+String(targetDate.getDate()).padStart(2,"0");
        supabase.from("trainings").update({abgesagt:false})
          .eq("trainingsplan_slot_id", ausnahme.slot_id)
          .eq("date", dateStr)
          .then(function({error}){ if(error) console.warn("[FCH] Absage rücknahme Fehler:", error.message); });
      }
    }
  }

  function handlePlanSave(planData){
    if(editPlan&&editPlan.id){
      savePlaene(plaene.map(function(p){ return p.id===editPlan.id?Object.assign({},p,planData):p; }));
    } else {
      const newPlan = Object.assign({},planData,{id:"plan_"+Date.now(),slots:[]});
      savePlaene(plaene.concat([newPlan]));
      setAktiverPlan(newPlan.id);
    }
    setShowPlanEditor(false);
    setEditPlan(null);
  }

  function handlePlanDuplizieren(plan){
    const copy = Object.assign({},plan,{
      id:"plan_"+Date.now(),
      name:plan.name+" (Kopie)",
      active:false,
      slots:(plan.slots||[]).map(function(s){ return Object.assign({},s,{id:"slot_"+Date.now()+Math.random()}); }),
    });
    savePlaene(plaene.concat([copy]));
  }

  function handlePlanAktivieren(id){
    savePlaene(plaene.map(function(p){ return Object.assign({},p,{active:p.id===id}); }));
    setAktiverPlan(id);
  }

  function handlePlanLoeschen(id){
    if(plaene.length<=1){ alert("Mindestens ein Plan muss vorhanden sein."); return; }
    const next = plaene.filter(function(p){ return p.id!==id; });
    savePlaene(next);
    if(aktiverPlan===id) setAktiverPlan(next[0].id);
  }

  function handleDragStart(e, s){
    if(!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({slotId:s.id, duration:s.end-s.start, offsetY:e.clientY-rect.top});
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("slotId", s.id);
  }

  function handleDrop(e, day){
    e.preventDefault();
    if(!dragState) return;
    const slotId = e.dataTransfer.getData("slotId");
    const s = (plan?.slots||[]).find(function(x){ return x.id===slotId; });
    if(!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top - dragState.offsetY;
    const rawTime = displayStart + relY / H;
    const newStart = Math.max(displayStart, Math.min(displayEnd-dragState.duration, Math.round(rawTime*4)/4));
    const newEnd = newStart + dragState.duration;
    const updated = plaene.map(function(p){
      if(p.id!==angezeigterPlanId) return p;
      return Object.assign({},p,{slots:p.slots.map(function(x){ return x.id===slotId?Object.assign({},x,{weekday:day,start:newStart,end:newEnd}):x; })});
    });
    savePlaene(updated);
    setDragState(null);
  }

  function Btn2({children, onClick, active, small, danger}){
    return (
      <button onClick={onClick} style={{padding:small?"4px 10px":"6px 14px", borderRadius:20, border:"1px solid "+(danger?R:active?BK:GB), background:danger?RL:active?BK:"#fff", color:danger?R:active?"#fff":"#555", fontSize:14, fontWeight:active?600:400, cursor:"pointer", whiteSpace:"nowrap"}}>{children}</button>
    );
  }

  return (
    <div>
      {/* Plan-Verwaltung Overlay */}
      {showPlanVerwaltung&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:60,paddingBottom:20,overflowY:"auto"}}>
          <div style={{background:"var(--surface)",borderRadius:16,padding:"0 0 16px",maxWidth:540,width:"100%",margin:"0 16px",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid "+GB}}>
              <div style={{fontWeight:700,fontSize:16}}>Trainingsplan-Versionen</div>
              <button onClick={function(){setShowPlanVerwaltung(false);}} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>x</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:14,color:"var(--sub)",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere einen Plan als Vorlage fur eine neue Version.</div>
              {plaene.map(function(p){
                const isAktiv = p.id===aktiverPlan;
                const slotCount = (p.slots||[]).length;
                return(
                  <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"12px 14px",background:isAktiv?"#EFF6FF":"#fff"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <div style={{fontWeight:700,fontSize:14,color:isAktiv?BL:BK}}>{p.name}</div>
                          {isAktiv&&<span style={{fontSize:14,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                          {p.active&&!isAktiv&&<span style={{fontSize:14,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN,fontWeight:600}}>Aktiviert</span>}
                        </div>
                        <div style={S_SUB}>
                          {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                          {" bis "}
                          {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                          {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        {!isAktiv&&(
                          <button onClick={function(){handlePlanAktivieren(p.id);}}
                            style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                            Aktivieren
                          </button>
                        )}
                        <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);setShowPlanVerwaltung(false);}} title="Bearbeiten"
                          style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                        <button onClick={function(){handlePlanDuplizieren(p);}} title="Duplizieren"
                          style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                        {plaene.length>1&&!isAktiv&&(
                          <button onClick={function(){if(window.confirm("Plan \""+p.name+"\" loeschen?")){handlePlanLoeschen(p.id);}}} title="Loeschen"
                            style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={function(){setEditPlan(null);setShowPlanEditor(true);setShowPlanVerwaltung(false);}}
                style={{padding:"10px",borderRadius:10,border:"1.5px dashed "+GB,background:"transparent",color:"var(--sub)",fontSize:14,cursor:"pointer",textAlign:"center",marginTop:4}}>
                + Neuen Plan erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Tab-Navigation === */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",background:"var(--surface2)",borderRadius:10,padding:3,gap:4}}>
          {[{v:"gantt",l:"GANTT"},{v:"plaetze",l:"Plätze",adminOnly:true},{v:"plaene",l:"Pläne",adminOnly:true}].map(function(t){
            if(t.adminOnly&&!canEdit) return null;
            var isActive = trainingsTab===t.v;
            return(
              <button key={t.v} onClick={function(){setTrainungsTab(t.v);}}
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:isActive?"#fff":"transparent",color:isActive?BK:"#888",fontWeight:isActive?700:400,fontSize:14,cursor:"pointer",boxShadow:isActive?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
                {t.l}
              </button>
            );
          })}
        </div>
        {trainingsTab==="gantt"&&canEdit&&(
          <Btn2 small onClick={function(){setEditSlot(null);setShowSlotModal(true);}}>+ Training</Btn2>
        )}
        {trainingsTab==="plaene"&&canEdit&&(
          <Btn2 small onClick={function(){setEditPlan(null);setShowPlanEditor(true);}}>+ Neuer Plan</Btn2>
        )}
      </div>

      {/* === Tab: Plane === */}
      {trainingsTab==="plaene"&&(
        <Col gap={12}>
          <div style={{fontSize:14,color:"var(--sub)",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere ihn als Vorlage fur eine neue Version.</div>
          {plaene.map(function(p){
            const isAktiv = p.id===aktiverPlan;
            const slotCount = (p.slots||[]).length;
            return(
              <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"14px 16px",background:isAktiv?"#EFF6FF":"#fff"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{fontWeight:700,fontSize:14,color:isAktiv?BL:BK}}>{p.name}</div>
                      {isAktiv&&<span style={{fontSize:14,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                    </div>
                    <div style={S_SUB}>
                      {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                      {" bis "}
                      {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                      {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                    </div>
                  </div>
                  {canEdit&&(
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      {!isAktiv&&<button onClick={function(){handlePlanAktivieren(p.id);}} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:14,fontWeight:600,cursor:"pointer"}}>Aktivieren</button>}
                      <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                      <button onClick={function(){handlePlanDuplizieren(p);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                      {plaene.length>1&&!isAktiv&&<button onClick={function(){if(window.confirm("Plan loeschen?")){handlePlanLoeschen(p.id);}}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>}
                    </div>
                  )}
                </div>
                {isAktiv&&<button onClick={function(){setTrainungsTab("gantt");}} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid "+BL+"40",background:"transparent",color:BL,fontSize:14,cursor:"pointer"}}>Zum GANTT →</button>}
                {!isAktiv&&canEdit&&(
                  <button onClick={function(){setVorschauPlan(p.id);setTrainungsTab("gantt");}}
                    style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid #FDE68A",background:"var(--surface)",color:STATUS_CLR.warn,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                    Vorschau im GANTT →
                  </button>
                )}
              </div>
            );
          })}
        </Col>
      )}

      {/* === Tab: Platze === */}
      {trainingsTab==="plaetze"&&<PlaetzeView sb={supabase}/>}

      {/* === Tab: GANTT === */}
      {trainingsTab==="gantt"&&(
      <div>

      {/* Ausserhalb Gültigkeitsspanne */}
      {!planGueltigDieseWoche&&(
        <div style={{padding:"10px 14px",background:"var(--surface2)",border:"1px solid #D1D5DB",borderRadius:10,marginBottom:12,fontSize:14,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>&#128197;</span>
          <span>
            Diese Woche liegt ausserhalb der Gültigkeitsspanne des Plans
            {planGueltigAb&&<strong style={{color:"var(--text)"}}> ({plan.valid_from&&plan.valid_from.split("-").reverse().join(".")} – {plan.valid_until?plan.valid_until.split("-").reverse().join("."):"unbegrenzt"})</strong>}.
            Keine Trainings angezeigt.
          </span>
        </div>
      )}
      {isVorschau&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 14px",background:"var(--surface)",border:"1.5px solid #FDE68A",borderRadius:10,marginBottom:12}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:STATUS_CLR.warn}}>Vorschau: </span>
            <span style={{fontSize:14,color:STATUS_CLR.warn}}>{plan.name}</span>
            <span style={{fontSize:14,color:"#B45309",marginLeft:8}}>Nicht der aktive Plan</span>
          </div>
          <div style={S_FLEX8}>
            <button onClick={function(){handlePlanAktivieren(vorschauPlan);setVorschauPlan(null);}}
              style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              Jetzt aktivieren
            </button>
            <button onClick={function(){setVorschauPlan(null);}}
              style={{padding:"8px 14px",borderRadius:8,border:"0.5px solid #FDE68A",background:"var(--surface)",color:STATUS_CLR.warn,fontSize:14,cursor:"pointer"}}>
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:isVorschau?"#92400E":BK}}>
              {isVorschau&&<span style={{fontSize:14,background:"#FDE68A",color:STATUS_CLR.warn,padding:"2px 7px",borderRadius:20,marginRight:7,fontWeight:600}}>Vorschau</span>}
              {plan?plan.name:"Trainingsplan"}
            </div>
            <div style={{fontSize:14,color:"var(--sub)",marginTop:2}}>
              {plan&&plan.valid_from?"Gueltig: "+fmtDate(new Date(plan.valid_from))+" - "+(plan.valid_until?fmtDate(new Date(plan.valid_until)):"unbegrenzt"):""}
            </div>
          </div>
          {canEdit && (
            <Btn2 small onClick={function(){setEditSlot(null);setShowSlotModal(true);}}>+ Training</Btn2>
          )}
        </div>

        <div className="cc-row">
          <Row>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===0?6:d-1;}); }
              else { setKwOffset(function(o){return o-1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14}}>&#8249;</button>
            <div style={{textAlign:"center",minWidth:130}}>
              {ansicht==="woche" ? (
                <>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>KW {kw}</div>
                  <div style={S_SUB}>{fmtDate(dayDates[0])} - {fmtDate(dayDates[6])}.{dayDates[6].getFullYear()}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{DAYS[selectedDay]}, {fmtDate(dayDates[selectedDay])}.{dayDates[selectedDay].getFullYear()}</div>
                  <div style={S_SUB}>KW {kw}</div>
                </>
              )}
            </div>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===6?0:d+1;}); }
              else { setKwOffset(function(o){return o+1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14}}>&#8250;</button>
            {kwOffset!==0 && <button onClick={function(){setKwOffset(0);setSelectedDay(0);}} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>Heute</button>}
          </Row>
          {ansicht==="tag" && (
            <div style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {DAYS.map(function(d,i){
                const isToday = dayDates[i].toDateString()===today.toDateString();
                const isSelected = selectedDay===i;
                return(
                  <button key={i} onClick={function(){setSelectedDay(i);}}
                    style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(isSelected?BK:isToday?"#6366F1":GB),background:isSelected?BK:isToday?"#EEF2FF":"#fff",color:isSelected?"#fff":isToday?"#4F46E5":"#555",fontSize:14,fontWeight:isSelected?700:400,cursor:"pointer",flexShrink:0}}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          {kwAusnahmen.length>0 && (
            <span style={{fontSize:14,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"var(--surface)",color:"#D97706",border:"1px solid #FED7AA"}}>
              {kwAusnahmen.length} Ausnahme{kwAusnahmen.length>1?"n":""}
            </span>
          )}
          {/* Team-Filter Dropdown */}
          <select value={teamFilter} onChange={function(e){setTeamFilter(e.target.value);}}
            style={{padding:"8px 14px",borderRadius:8,border:"1px solid "+GB,background:"var(--surface)",fontSize:14,outline:"none",cursor:"pointer",maxWidth:180}}>
            <option value="alle">Alle Mannschaften</option>
            {alleTeams.map(function(t){
              return <option key={t} value={t}>{t}</option>;
            })}
          </select>
          <div className="cc-flex-1"/>
          {/* Ansicht-Toggle */}
          <div style={{display:"flex",background:"var(--surface2)",borderRadius:20,padding:3,gap:4}}>
            {[{v:"woche",l:"Woche"},{v:"tag",l:"Tag"}].map(function(a){
              return(
                <button key={a.v} onClick={function(){setAnsicht(a.v);}}
                  style={{padding:"5px 12px",borderRadius:20,border:"none",background:ansicht===a.v?"#fff":"transparent",color:ansicht===a.v?BK:"#999",fontWeight:ansicht===a.v?600:400,fontSize:14,cursor:"pointer",boxShadow:ansicht===a.v?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                  {a.l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt Grid */}
      <div style={{background:"var(--surface)",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden"}}>
          <PlatzGantt
            wochenSlots={ansicht==="tag" ? wochenSlots.map(function(ss,i){ return i===selectedDay?ss:[]; }) : wochenSlots}
            dayDates={dayDates}
            DAYS={ansicht==="tag" ? [DAYS[selectedDay]] : DAYS}
            dagIndexes={ansicht==="tag" ? [selectedDay] : DAYS.map(function(_,i){return i;})}
            today={today}
            displayStart={displayStart}
            displayEnd={displayEnd}
            teamFilter={teamFilter}
            TEAM_COLORS={TEAM_COLORS}
            canEdit={canEdit}
            onClickSlot={function(s){ if(canEdit){setEditSlot(s);setShowSlotModal(true);}}}
            onNewSlot={canEdit ? function(prefill){
              setEditSlot(null);
              setNewSlotPrefill(prefill);
              setShowSlotModal(true);
            } : undefined}
            GB={GB} GR={GR} BK={BK} BL={BL}
          />
      </div>

      {/* Legende */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
        {alleTeams.filter(function(t){return teamFilter==="alle"||t===teamFilter;}).map(function(t){
          return (
            <div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:14,color:"var(--sub)"}}>
              <div style={{width:10,height:10,borderRadius:4,background:TEAM_COLORS[t]||BL}}/>
              {t}
            </div>
          );
        })}
      </div>

      {/* Trainer-Benachrichtigungen */}
      {trainerNachrichten.filter(function(n){return n.type==="training_geloescht";}).length>0 && (
        <div style={{marginTop:12,border:"1px solid #2563EB40",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:"var(--surface)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <span style={{fontSize:14,fontWeight:700,color:BL}}>Training dauerhaft aus dem Plan entfernt</span>
            <button onClick={async function(){
              try{
                const nr = await window.storage.get("trainer_benachrichtigungen");
                if(nr){ const alle=JSON.parse(nr.value).map(function(n){return Object.assign({},n,{gelesen:true});}); await window.storage.set("trainer_benachrichtigungen",JSON.stringify(alle)); setTrainerNachrichten([]); }
              }catch(e){}
            }} style={{fontSize:14,padding:"5px 12px",borderRadius:20,border:"1px solid #2563EB40",background:"var(--surface)",color:BL,cursor:"pointer"}}>Gelesen</button>
          </div>
        </div>
      )}

      {/* Trainer-Absagen Banner */}
      {trainerAbsagen.length>0 && (
        <div style={{marginTop:12,border:"1px solid "+R+"40",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:RL,padding:"10px 14px",borderBottom:"1px solid "+R+"20"}}>
            <span style={{fontSize:14,fontWeight:700,color:R}}>{trainerAbsagen.length} Training{trainerAbsagen.length>1?"s":""} diese Woche vom Trainer abgesagt</span>
          </div>
          {trainerAbsagen.map(function(a,i){
            const slot=(plan?plan.slots||[]:[]||[]).find(function(s){return s.id===a.slot_id;});
            return (
              <div key={i} style={{padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<trainerAbsagen.length-1?"0.5px solid "+GB:"none",background:"var(--surface)"}}>
                <div>
                  <span style={S_BOLD}>{a.team}</span>
                  <span style={{fontSize:14,color:"var(--sub)",marginLeft:8}}>{a.weekday}{slot?" "+fmtTime(slot.start)+"-"+fmtTime(slot.end)+" Uhr":""}</span>
                </div>
                <span style={{fontSize:14,padding:"2px 8px",borderRadius:20,background:RL,color:R,fontWeight:600}}>Abgesagt</span>
              </div>
            );
          })}
          <div style={{padding:"8px 14px",background:"#FFF5F5"}}>
            <span style={S_SUB}>Administration wurde automatisch benachrichtigt</span>
          </div>
        </div>
      )}

      {/* Losch-Dialog */}
      {showDeleteDialog&&deleteSlot && (
        <ModalOrSheet open onClose={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} maxWidth={480}>
          <div style={{padding:"0 0 8px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid "+GB}}>
              <div style={{fontWeight:700,fontSize:14}}>Training loeschen</div>
              <button onClick={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)"}}>x</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{padding:"12px",background:RL,borderRadius:8,border:"1px solid "+R+"30"}}>
                <div style={{fontSize:14,fontWeight:700,color:R,marginBottom:2}}>Training wird dauerhaft aus dem Plan entfernt</div>
                <div style={S_SUB}>{deleteSlot.team} - {deleteSlot.weekday} {fmtTime(deleteSlot.start)}-{fmtTime(deleteSlot.end)} Uhr</div>
              </div>
              {deleteSlot.zukunftigeEvents.length>0 ? (
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Welche Termine absagen?</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set(s.zukunftigeEvents.map(function(e){return e.id;}))});});}} style={{fontSize:14,padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer"}}>Alle</button>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set()});});}} style={{fontSize:14,padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer"}}>Keine</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
                    {deleteSlot.zukunftigeEvents.map(function(e){
                      const selected = deleteSlot.selectedEvIds.has(e.id);
                      return (
                        <div key={e.id} onClick={function(){setDeleteSlot(function(s){const next=new Set(s.selectedEvIds);selected?next.delete(e.id):next.add(e.id);return Object.assign({},s,{selectedEvIds:next});});}} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:8,border:"1px solid "+(selected?R:GB),background:selected?RL:"#fff",cursor:"pointer"}}>
                          <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(selected?R:"#ccc"),background:selected?R:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {selected && <span style={{color:"#fff",fontSize:14,fontWeight:700}}>v</span>}
                          </div>
                          <div className="cc-flex-1">
                            <div style={S_BOLD}>{e.date}</div>
                            <div style={S_SUB}>{e.time} Uhr</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{padding:"12px",background:"var(--surface2)",borderRadius:8,fontSize:14,color:"var(--sub)"}}>Keine zukuenftigen Termine vorhanden.</div>
              )}
              <div style={S_FLEX8}>
                <button onClick={function(){handleSlotDeleteConfirm(deleteSlot,deleteSlot.selectedEvIds);}} style={{flex:1,padding:"8px 14px",borderRadius:10,border:"none",background:R,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Training loeschen{deleteSlot.selectedEvIds.size>0?" & "+deleteSlot.selectedEvIds.size+" Termin"+(deleteSlot.selectedEvIds.size>1?"e":"")+" absagen":""}
                </button>
                <button onClick={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} style={{padding:"10px 18px",borderRadius:10,border:"1px solid "+GB,background:"var(--surface)",fontSize:14,cursor:"pointer"}}>Abbrechen</button>
              </div>
            </div>
          </div>
        </ModalOrSheet>
      )}

      {/* Slot-Modal */}
      {showSlotModal&&canEdit && (
        <SlotModal
          slot={editSlot}
          prefill={newSlotPrefill}
          plan={plan}
          teams={alleTeams}
          kwKey={kwKey}
          kw={kw}
          monday={monday}
          ausnahmen={kwAusnahmen}
          onSave={handleSlotSave}
          onDelete={editSlot?function(){handleSlotDeleteInit(editSlot.id);}:null}
          onAusnahme={function(a,forAll){handleAusnahmeSave(a,forAll);}}
          onClose={function(){setShowSlotModal(false);setEditSlot(null);setNewSlotPrefill(null);}}
        />
      )}

      {/* Plan-Editor */}
      {showPlanEditor&&canEdit && (
        <PlanEditorModal
          plan={editPlan}
          plaene={plaene}
          onSave={handlePlanSave}
          onClose={function(){setShowPlanEditor(false);setEditPlan(null);}}
        />
      )}
    </div>
    )}

    </div>
  );
}


/* ── SlotModal & PlanEditorModal — hier definiert, von TermineModul importiert ── */

const S_FIELD_LABEL={fontSize:11,fontWeight:600,color:"var(--sub)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"};
const S_INPUT_MODAL={width:"100%",padding:"10px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:16,outline:"none",boxSizing:"border-box",background:"var(--surface)",color:"var(--text)"};
const S_SELECT_MODAL={width:"100%",padding:"10px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:16,outline:"none",background:"var(--surface)",color:"var(--text)"};
const S_07_MODAL={display:"flex",gap:8,flexWrap:"wrap"};
const S_08_MODAL={display:"flex",gap:12};
const S_SUB_MODAL={fontSize:14,color:"var(--sub)",marginBottom:4};

function SlotModal({slot, prefill, plan, teams, kwKey, kw, monday, ausnahmen, onSave, onDelete, onAusnahme, onClose}){
  const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
  const TEAM_COLORS_MAP={};
  (plan?.slots||[]).forEach(s=>{TEAM_COLORS_MAP[s.team]=s.color;});
  const isEdit=!!slot?.id;
  const isZusatz=slot?.isZusatz;

  // TRAININGSPLAETZE wird von PlaetzeView (aus Supabase oder localStorage) befüllt
  const PLAETZE_LIVE = TRAININGSPLAETZE.length>0 ? TRAININGSPLAETZE : (()=>{
    try{
      const r=localStorage.getItem("trainingsplaetze_custom");
      return r?JSON.parse(r):TRAININGSPLAETZE_DEFAULT.map(p=>({...p}));
    }catch(e){ return TRAININGSPLAETZE_DEFAULT.map(p=>({...p})); }
  })();

  const baseMonday = monday ? new Date(monday) : new Date();
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
    location: slot?.location||(prefill?.location)||"",
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
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid var(--border)"}}>
          <div style={{fontWeight:700,fontSize:14}}>{isEdit?(isZusatz?"Zusatztraining":"Training bearbeiten"):"Training hinzufügen"}</div>
          <Btn variant="ghost" onClick={onClose} style={{fontSize:20,padding:"4px 6px",color:"var(--sub)"}}>×</Btn>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {!ausnahmeMode?(
            <>
              {!isEdit&&(
                <div>
                  <div style={S_FIELD_LABEL}>Kalenderwoche</div>
                  <select value={selectedKwOffset} onChange={e=>setSelectedKwOffset(parseInt(e.target.value))} style={S_SELECT_MODAL}>
                    {kwOptions.map(function(o){
                      return <option key={o.offset} value={o.offset}>{o.label}{o.offset===0?" (diese Woche)":""}</option>;
                    })}
                  </select>
                </div>
              )}
              <div>
                <div style={S_FIELD_LABEL}>Wochentag</div>
                <div style={S_07_MODAL}>
                  {DAYS.map(d=>(
                    <button key={d} onClick={()=>setForm(f=>({...f,weekday:d}))}
                      style={{minWidth:44,minHeight:44,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${form.weekday===d?BK:GB}`,background:form.weekday===d?BK:"var(--surface)",color:form.weekday===d?"#fff":"var(--sub)",fontSize:15,cursor:"pointer",fontWeight:form.weekday===d?600:400}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={S_FIELD_LABEL}>Team</div>
                <select value={form.team} onChange={e=>setForm(f=>({...f,team:e.target.value,color:TEAM_COLORS_MAP[e.target.value]||f.color}))} style={S_INPUT_MODAL}>
                  {teams.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S_08_MODAL}>
                <div className="cc-flex-1">
                  <div style={S_FIELD_LABEL}>Von</div>
                  <select value={form.start} onChange={e=>{const v=parseFloat(e.target.value);setForm(f=>({...f,start:v,end:f.end>v?f.end:v+1.5,wechsel_zeit:f.wechsel_zeit&&f.wechsel_zeit>v&&f.wechsel_zeit<(f.end>v?f.end:v+1.5)?f.wechsel_zeit:"",end_ort:"",end_half:""}));}} style={S_INPUT_MODAL}>
                    {TIMES.map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
                <div className="cc-flex-1">
                  <div style={S_FIELD_LABEL}>Bis</div>
                  <select value={form.end} onChange={e=>{const v=parseFloat(e.target.value);setForm(f=>({...f,end:v,wechsel_zeit:f.wechsel_zeit&&f.wechsel_zeit<v?f.wechsel_zeit:"",end_ort:f.wechsel_zeit&&f.wechsel_zeit<v?f.end_ort:"",end_half:f.wechsel_zeit&&f.wechsel_zeit<v?f.end_half:""}));}} style={S_INPUT_MODAL}>
                    {TIMES.filter(t=>t>form.start).map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{background:"var(--surface2)",borderRadius:10,padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
                <div className="cc-label">Platzeinteilung</div>
                <div style={{background:"var(--surface)",borderRadius:8,padding:"10px 12px",border:"0.5px solid var(--border)"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--sub)",marginBottom:10}}>
                    Phase 1 <span style={{fontWeight:400,marginLeft:6}}>{fmtT(form.start)} – {form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}</span>
                  </div>
                  <div className="cc-mb-8">
                    <div style={S_SUB_MODAL}>Platz</div>
                    <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value,half:""}))}
                      style={{...S_SELECT_MODAL,border:`1.5px solid ${form.location?GB:R+"80"}`}}>
                      <option value="" disabled>– Platz wählen –</option>
                      {PLAETZE_LIVE.filter(p=>p.active).map(p=>(
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {form.location&&(PLAETZE_LIVE.find(p=>p.name===form.location)?.halfn||[]).length>0&&(
                    <div>
                      <div style={S_SUB_MODAL}>Seite</div>
                      <div style={S_07_MODAL}>
                        <button onClick={()=>setForm(f=>({...f,half:""}))}
                          style={{padding:"8px 14px",minHeight:40,borderRadius:8,border:`1.5px solid ${!form.half?BK:GB}`,background:!form.half?BK:"var(--surface)",color:!form.half?"#fff":"var(--sub)",fontSize:15,cursor:"pointer"}}>
                          Ganzer Platz
                        </button>
                        {(PLAETZE_LIVE.find(p=>p.name===form.location)?.halfn||[]).map(h=>(
                          <button key={h} onClick={()=>setForm(f=>({...f,half:h}))}
                            style={{padding:"8px 14px",minHeight:40,borderRadius:8,border:`1.5px solid ${form.half===h?BL:GB}`,background:form.half===h?BL:"var(--surface)",color:form.half===h?"#fff":"var(--sub)",fontSize:15,cursor:"pointer"}}>
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {form.location&&(
                  <Row gap={12}>
                    <div style={{fontSize:14,color:"var(--sub)",flexShrink:0}}>Wechsel um:</div>
                    <select value={form.wechsel_zeit} onChange={e=>setForm(f=>({...f,wechsel_zeit:e.target.value?parseFloat(e.target.value):"",end_ort:e.target.value?f.end_ort:"",end_half:e.target.value?f.end_half:""}))}
                      style={{...S_SELECT_MODAL,flex:1}}>
                      <option value="">– kein Wechsel –</option>
                      {Array.from({length:(form.end-form.start)*4},(_,i)=>form.start+i*0.25+0.25).filter(t=>t<form.end).map(t=>(
                        <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{Math.round((t%1)*60).toString().padStart(2,"0")} Uhr</option>
                      ))}
                    </select>
                  </Row>
                )}
                {form.location&&form.wechsel_zeit&&(
                  <div style={{background:"var(--surface)",borderRadius:8,padding:"10px 12px",border:"0.5px solid var(--border)"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--sub)",marginBottom:10}}>
                      Phase 2 <span style={{fontWeight:400,marginLeft:6}}>{fmtT(form.wechsel_zeit)} – {fmtT(form.end)}</span>
                    </div>
                    <div className="cc-mb-8">
                      <div style={S_SUB_MODAL}>Platz</div>
                      <select value={form.end_ort} onChange={e=>setForm(f=>({...f,end_ort:e.target.value,end_half:""}))} style={S_SELECT_MODAL}>
                        <option value="">– gleich wie Phase 1 ({form.location}) –</option>
                        {PLAETZE_LIVE.filter(p=>p.active).map(p=>(
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    {(PLAETZE_LIVE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).length>0&&(
                      <div>
                        <div style={S_SUB_MODAL}>Seite</div>
                        <div style={S_07_MODAL}>
                          <button onClick={()=>setForm(f=>({...f,end_half:""}))}
                            style={{padding:"8px 14px",minHeight:40,borderRadius:8,border:`1.5px solid ${!form.end_half?BK:GB}`,background:!form.end_half?BK:"var(--surface)",color:!form.end_half?"#fff":"var(--sub)",fontSize:15,cursor:"pointer"}}>
                            Ganzer Platz
                          </button>
                          {(PLAETZE_LIVE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).map(h=>(
                            <button key={h} onClick={()=>setForm(f=>({...f,end_half:h}))}
                              style={{padding:"8px 14px",minHeight:40,borderRadius:8,border:`1.5px solid ${form.end_half===h?BL:GB}`,background:form.end_half===h?BL:"var(--surface)",color:form.end_half===h?"#fff":"var(--sub)",fontSize:15,cursor:"pointer"}}>
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {form.location&&(
                  <div style={{fontSize:14,color:"var(--sub)",padding:"8px 10px",background:"var(--surface)",borderRadius:6,lineHeight:1.7}}>
                    <div><strong>{fmtT(form.start)}–{form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}</strong>{" "}{form.location}{form.half?" / "+form.half:" / Ganzer Platz"}</div>
                    {form.wechsel_zeit&&(<div><strong>{fmtT(form.wechsel_zeit)}–{fmtT(form.end)}</strong>{" "}{form.end_ort||form.location}{form.end_half?" / "+form.end_half:" / Ganzer Platz"}</div>)}
                  </div>
                )}
              </div>
              <div>
                <div style={S_FIELD_LABEL}>Farbe</div>
                <Row align="flex-start" gap={8}>
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{width:32,height:32,borderRadius:"50%",background:c,border:form.color===c?"3px solid var(--text)":"2px solid transparent",cursor:"pointer",flexShrink:0}}/>
                  ))}
                </Row>
              </div>
              {showSaveDialog ? (
                <div style={{background:"var(--surface2)",borderRadius:10,padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{isEdit?"Änderung übernehmen für:":"Training gilt:"}</div>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:true, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${BL}`,background:"var(--surface)",color:BL,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Nur diese Woche</div>
                    <div style={{fontSize:13,fontWeight:400,color:"var(--sub)",marginTop:2}}>{isEdit?"Wird als Ausnahme gespeichert":"Einmaliger Zusatztermin"}</div>
                  </button>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:false, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"10px 18px",borderRadius:10,border:`1.5px solid ${BK}`,background:BTN,color:BTN_TXT,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Dauerhaft (neuer Standard)</div>
                    <div style={{fontSize:13,fontWeight:400,color:"rgba(255,255,255,0.7)",marginTop:2}}>
                      {isEdit?"Gilt für alle zukünftigen Wochen":"Ab "+selectedKw.label+" bis Ende des Trainingsplans"}
                    </div>
                  </button>
                  <button onClick={()=>setShowSaveDialog(false)}
                    style={{padding:"10px",borderRadius:10,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button onClick={()=>{ if(!form.location){alert("Bitte einen Platz auswählen.");return;} setShowSaveDialog(true); }}
                  style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:form.location?BTN:"var(--surface2)",color:form.location?BTN_TXT:"var(--sub)",fontSize:15,fontWeight:600,cursor:form.location?"pointer":"not-allowed"}}>
                  {isEdit?"Speichern":"Hinzufügen"}
                </button>
              )}
              {isEdit&&!isZusatz&&(
                <Row align="flex-start" gap={8}>
                  <button onClick={()=>setAusnahmeMode(true)}
                    style={{flex:1,padding:"9px",borderRadius:10,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>
                    <TI n="bolt"/> Ausnahme diese Woche
                  </button>
                  <button onClick={onDelete}
                    style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${R}`,background:RL,color:R,fontSize:14,cursor:"pointer"}}>
                    Löschen
                  </button>
                </Row>
              )}
            </>
          ):(
            <>
              <div style={{padding:"10px 12px",background:"var(--surface)",borderRadius:8,border:"1px solid #FED7AA",fontSize:14,color:STATUS_CLR.warn}}>
                <strong>{slot?.team} · {slot?.weekday}</strong> — Ausnahme für diese Woche.
              </div>
              <div>
                <div style={S_FIELD_LABEL}>Typ</div>
                <div style={S_07_MODAL}>
                  {[{v:"absage",l:"Absagen"},{v:"verschiebung",l:"Verschieben"},{v:"location",l:"Ort ändern"}].map(t=>(
                    <button key={t.v} onClick={()=>setAusnahmeTyp(t.v)}
                      style={{flex:1,padding:"8px 14px",minHeight:40,borderRadius:8,border:`1.5px solid ${ausnahmeTyp===t.v?(t.v==="absage"?R:BL):GB}`,background:ausnahmeTyp===t.v?(t.v==="absage"?RL:"#EFF6FF"):"var(--surface)",color:ausnahmeTyp===t.v?(t.v==="absage"?R:BL):"var(--sub)",fontSize:14,cursor:"pointer"}}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              {ausnahmeTyp==="verschiebung"&&(
                <div style={S_08_MODAL}>
                  <div className="cc-flex-1">
                    <div style={S_FIELD_LABEL}>Von</div>
                    <select value={verschiebungStart} onChange={e=>setVerschiebungStart(parseFloat(e.target.value))} style={S_INPUT_MODAL}>
                      {TIMES.map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                    </select>
                  </div>
                  <div className="cc-flex-1">
                    <div style={S_FIELD_LABEL}>Bis</div>
                    <select value={verschiebungEnd} onChange={e=>setVerschiebungEnd(parseFloat(e.target.value))} style={S_INPUT_MODAL}>
                      {TIMES.filter(t=>t>verschiebungStart).map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {ausnahmeTyp==="location"&&(
                <div>
                  <div style={S_FIELD_LABEL}>Neuer Platz</div>
                  <select value={verschiebungOrt} onChange={e=>setVerschiebungOrt(e.target.value)} style={S_INPUT_MODAL}>
                    <option value="" disabled>– Platz wählen –</option>
                    {PLAETZE_LIVE.filter(p=>p.active).map(p=>(
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div style={S_FIELD_LABEL}>Begründung <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span></div>
                <input value={verschiebungGrund} onChange={e=>setVerschiebungGrund(e.target.value)}
                  placeholder="z.B. Platz für Spiel benötigt" style={S_INPUT_MODAL}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"var(--surface2)",borderRadius:8}}>
                <input type="checkbox" id="fuerAlle" checked={fuerAlleWochen} onChange={e=>setFuerAlleWochen(e.target.checked)} style={{width:16,height:16,cursor:"pointer"}}/>
                <label htmlFor="fuerAlle" style={{fontSize:14,cursor:"pointer"}}>Als neuer Standard (alle zukünftigen Wochen)</label>
              </div>
              <Row align="flex-start" gap={8}>
                <button onClick={()=>onAusnahme({
                  type:ausnahmeTyp, slot_id:slot.id, weekday:slot.weekday, team:slot.team,
                  ...(ausnahmeTyp==="verschiebung"?{neue_start:verschiebungStart,neue_end:verschiebungEnd}:{}),
                  ...(ausnahmeTyp==="location"?{neuer_ort:verschiebungOrt}:{}),
                  begruendung:verschiebungGrund,
                },fuerAlleWochen)}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:ausnahmeTyp==="absage"?R:BTN,color:ausnahmeTyp==="absage"?"#fff":BTN_TXT,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  {ausnahmeTyp==="absage"?"Absagen":ausnahmeTyp==="verschiebung"?"Verschieben":"Ort ändern"}
                </button>
                <button onClick={()=>setAusnahmeMode(false)}
                  style={{padding:"12px 18px",borderRadius:10,border:"0.5px solid var(--border)",background:"var(--surface)",fontSize:14,cursor:"pointer"}}>
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
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={S_INPUT_MODAL}/>
          </div>
          <div style={S_08_MODAL}>
            <div className="cc-flex-1">
              <div style={S_FIELD_LABEL}>Gültig ab</div>
              <input type="date" value={form.valid_from} onChange={e=>setForm(f=>({...f,valid_from:e.target.value}))} style={S_INPUT_MODAL}/>
            </div>
            <div className="cc-flex-1">
              <div style={S_FIELD_LABEL}>Gültig bis</div>
              <input type="date" value={form.valid_until} onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))} style={S_INPUT_MODAL}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"var(--surface2)",borderRadius:8}}>
            <input type="checkbox" id="planAktiv" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="planAktiv" style={{fontSize:14,cursor:"pointer"}}>Plan aktiv (erscheint bei Teams als Termine)</label>
          </div>
          <button onClick={()=>onSave(form)}
            style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,fontSize:15,fontWeight:600,cursor:"pointer"}}>
            Speichern
          </button>
        </div>
      </div>
    </ModalOrSheet>
  );
}

export { TrainingsplanModul, PlaetzeView, SlotModal, PlanEditorModal };
