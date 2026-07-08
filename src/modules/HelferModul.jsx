/* ═══════════════════════════════════════════════════════════════
   ClubCampus HelferModul — HelferModul.jsx
   Helfereinsätze verwalten und anmelden
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, ACCENT20, GN, R, RL, BL, AM, BK, GR, GB } from "../constants.js";
import { TI } from "../icons.jsx";
import { Av, Between, Btn, Card, Chip, Col, H1, InfoBox, Input, Row, Stat, useIsMobile , avColor} from "../theme.jsx";
import { HELPER_GRUPPEN, HELPER_EVENTS, HELPERS } from "../demoData.js";

/* ── Hilfsfunktionen ── */
function Tabs({tabs,active,setActive}){
  const isMobile=useIsMobile();
  return(
    <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:3,marginBottom:18,overflowX:"auto",flexWrap:"nowrap",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=>(
        <Btn onClick={()=>setActive(t.key)}>{isMobile&&t.icon&&<TI n={t.icon} size={13} className="cc-shrink-0"/>} {isMobile&&t.short?t.short:t.label}</Btn>
      ))}
    </div>
  );
}

function getHelperName(role,account){
  if(account?.name) return account.name;
  if(role==="spieler") return "Luca Meier";
  if(role==="eltern")  return "Anna Meier";
  if(role==="trainer") return "Thomas Müller";
  return "Sandra Berger";
}

/* Alle möglichen Übergabe-Empfänger (alle Helfer ausser dem aktuellen) */
const ALLE_HELFER_NAMEN = (HELPERS||[]).map(h=>h.name);

function BemerkungEdit({notes,onSave}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(notes||"");
  if(editing) return(
    <div style={{display:"flex",gap:4,marginTop:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Bemerkung…"
        style={{padding:"2px 7px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,outline:"none",width:130}}
        onKeyDown={e=>{if(e.key==="Enter"){onSave(draft);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
      <Btn onClick={()=>{onSave(draft);setEditing(false);}}>✓</Btn>
      <Btn onClick={()=>setEditing(false)}>✕</Btn>
    </div>
  );
  return <Btn variant="ghost" onClick={e=>{e.stopPropagation();setEditing(true);setDraft(notes||"");}}><TI n="edit" style={{marginRight:3}}/> Bemerkung</Btn>;
}

function SchichtKarte({schicht,einsatz,meinName,canEdit,canFreigeben,canZuteilen,teamMitglieder,schichtenState,onEintragen,onFreigeben,onÜbertragen,freigabeAnfragen,notes,onSaveBemerkung}){
  const helfer=schichtenState[schicht.id]??schicht.helfer;
  const filled=helfer.length, max=schicht.max;
  const pct=Math.round(filled/max*100);
  const voll=filled>=max;
  const ichDrin=helfer.includes(meinName);
  const anfrageData=(freigabeAnfragen||{})[schicht.id];
  const anfragePending=anfrageData?.name===meinName;

  const [showTransfer,setShowTransfer]=useState(false);
  const [transferTarget,setTransferTarget]=useState("");
  const [showAnfrageForm,setShowAnfrageForm]=useState(false);
  const [anfrageBegruendung,setAnfrageBegruendung]=useState("");
  const [showAnfrageOk,setShowAnfrageOk]=useState(false);
  const [showZuteilen,setShowZuteilen]=useState(false);
  const [zuteilTarget,setZuteilTarget]=useState("");
  const [zuteilSearch,setZuteilSearch]=useState("");
  const [showHelfer,setShowHelfer]=useState(false);

  let sc=GN,sb="#ECFDF5",st=`${filled}/${max} belegt`;
  if(voll){sc="#888";sb="#f5f5f5";st="Besetzt";}
  else if(filled===0){sc=R;sb=RL;st="Offen";}
  else{sc=AM;sb="#FFFBEB";}

  const handleÜbertragen=()=>{
    if(!transferTarget) return;
    onÜbertragen(schicht.id, meinName, transferTarget);
    setShowTransfer(false);
    setTransferTarget("");
  };

  const handleAnfrageSenden=()=>{
    if(!anfrageBegruendung.trim()) return;
    onFreigeben(schicht.id, meinName, anfrageBegruendung.trim());
    setShowAnfrageForm(false);
    setAnfrageBegruendung("");
    setShowAnfrageOk(true);
    setTimeout(()=>setShowAnfrageOk(false), 3000);
  };

  const handleZuteilen=()=>{
    if(!zuteilTarget) return;
    onEintragen(schicht.id,zuteilTarget);
    setShowZuteilen(false);
    setZuteilTarget("");
    setZuteilSearch("");
  };

  const zuteilKandidaten=(teamMitglieder||[]).filter(n=>!helfer.includes(n));

  const statusColor=anfragePending?AM:voll?GN:filled>0?AM:R;
  const statusBg=anfragePending?"#FFFBEB":voll?"#ECFDF5":filled>0?"#FFFBEB":"#FEF2F2";
  const statusText=anfragePending?"⏳ Angefragt":`${filled}/${max}`;

  return(
    <div style={{border:`1px solid ${ichDrin?GN+"60":anfragePending?AM+"60":voll?"#e5e7eb":"#e5e7eb"}`,borderRadius:12,overflow:"hidden",background:ichDrin?"#F0FDF4":anfragePending?"#FFFBEB":voll?"#FAFAF8":"#fff"}}>
      {/* Colored top strip */}
      <div style={{height:3,background:voll?GN:filled>0?AM:R}}/>
      <div style={{padding:"14px 16px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)",lineHeight:1.2}}>{schicht.label}</div>
            <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
              <span><TI n="map-pin"/></span><span>{einsatz.location}</span>
            </div>
            {notes&&<div style={{fontSize:14,color:AM,marginTop:3,fontStyle:"italic"}}><TI n="edit" style={{marginRight:3}}/> {notes}</div>}
            {canEdit&&onSaveBemerkung&&<BemerkungEdit notes={notes} onSave={onSaveBemerkung}/>}
          </div>
          <span style={{fontSize:14,fontWeight:700,padding:"3px 9px",borderRadius:20,background:statusBg,color:statusColor,flexShrink:0,whiteSpace:"nowrap"}}>
            {statusText}
          </span>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{height:6,background:"var(--surface2)",borderRadius:4,marginBottom:10}}>
          <div style={{height:"100%",width:`${pct}%`,background:voll?GN:filled>0?AM:R,borderRadius:4}}/>
        </div>

        {/* Plätze Zähler */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:ichDrin||!voll?10:0}}>
          <Btn variant="ghost" onClick={()=>setShowHelfer(v=>!v)}><span style={{fontSize:14,display:"inline-block",transform:showHelfer?"rotate(90deg)":"none"}}>▶</span> <span><strong style={{color:"var(--text)"}}>{filled}</strong> / {max} belegt</span></Btn>
          {ichDrin&&<span style={{fontSize:14,color:GN,fontWeight:700}}>Du dabei ✓</span>}
        </div>

        {showHelfer&&(
          <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
            {helfer.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:h===meinName?"#DCFCE7":"#F3F4F6",borderRadius:6,padding:"4px 8px"}}>
                <Av name={h} size={16} bg={h===meinName?GN:"#9CA3AF"}/>
                <span style={{fontSize:14,fontWeight:h===meinName?700:500,color:h===meinName?GN:"#374151",flex:1}}>{h}</span>
                {h===meinName&&<span style={{fontSize:14,color:GN}}>Du</span>}
              </div>
            ))}
            {Array.from({length:max-filled},(_,i)=>(
              <div key={`f${i}`} style={{display:"flex",alignItems:"center",gap:8,background:"var(--surface)",border:"1px dashed #D1D5DB",borderRadius:6,padding:"4px 8px"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#E5E7EB",flexShrink:0}}/>
                <span className="cc-text-sm">Freier Platz</span>
              </div>
            ))}
          </div>
        )}

      {/* Aktionsbereich */}
      {ichDrin?(
        <div>
          {/* Haupt-Buttons (solange kein Formular offen und keine Anfrage pending) */}
          {!showTransfer&&!showAnfrageForm&&!anfragePending&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn small onClick={()=>setShowTransfer(true)}>⇄ Übertragen</Btn>
              <Btn small onClick={()=>setShowAnfrageForm(true)}>↩ Freigabe anfragen</Btn>
            </div>
          )}

          {/* Bestätigung nach Absenden */}
          {showAnfrageOk&&(
            <div style={{fontSize:14,color:GN,fontWeight:600,padding:"3px 0"}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>
          )}

          {/* Ausstehende Anfrage */}
          {anfragePending&&!showAnfrageOk&&(
            <div style={{background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontSize:14,color:AM,fontWeight:700,marginBottom:3}}>⏳ Freigabe ausstehend</div>
              <div className="cc-text-sm">Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
          )}

          {/* Freigabe-Anfrage Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"10px 12px",background:"var(--surface)",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={anfrageBegruendung}
                onChange={e=>setAnfrageBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:FONT}}
              />
              <Row align="flex-start">
                <Btn small onClick={handleAnfrageSenden} disabled={!anfrageBegruendung.trim()}>Anfrage senden</Btn>
                <Btn small onClick={()=>{setShowAnfrageForm(false);setAnfrageBegruendung("");}}>Abbrechen</Btn>
              </Row>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid #0891B2`,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0891B2",marginBottom:6}}>Schicht an wen übertragen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setTransferTarget("");}}
                  placeholder="Person suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?"#0891B2":GB}`,borderRadius:6,fontSize:14,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<Btn variant="ghost" onClick={()=>{setZuteilSearch("");setTransferTarget("");}}>×</Btn>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const kandidaten=ALLE_HELFER_NAMEN.filter(n=>n!==meinName&&!helfer.includes(n));
                const gefiltert=kandidaten.filter(n=>!zuteilSearch||n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:14,color:"var(--sub)",padding:"4px 0",marginBottom:7}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const h=HELPERS.find(m=>m.name===n);
                      const info=h?.gruppe||h?.role||"";
                      const selected=transferTarget===n;
                      return(
                        <Btn onClick={()=>setTransferTarget(selected?"":n)}><Av name={n} size={20} bg={selected?"#0891B2":"#9CA3AF"}/> <div style={{flex:1,minWidth:0}}> <div style={{fontSize:14,fontWeight:selected?700:400,color:selected?"#0891B2":"#374151"}}>{n}</div> {info&&<div className="cc-text-sm">{info}</div>} </div> {selected&&<span style={{fontSize:14,color:"#0891B2",flexShrink:0}}>✓</span>}</Btn>
                      );
                    })}
                  </div>
                );
              })()}
              <Row align="flex-start">
                <Btn small onClick={handleÜbertragen} disabled={!transferTarget}>Übertragen</Btn>
                <Btn small onClick={()=>{setShowTransfer(false);setTransferTarget("");}}>Abbrechen</Btn>
              </Row>
            </div>
          )}
        </div>
      ):!voll?(
        <div>
          {/* Trainer: Zuteilungs-Dropdown */}
          {canZuteilen&&!showZuteilen&&(
            <Btn small onClick={()=>setShowZuteilen(true)}>+ Zuteilen</Btn>
          )}
          {/* Standard Eintragen für alle anderen */}
          {!canZuteilen&&(
            <Btn small onClick={()=>onEintragen(schicht.id,meinName)}>✓ Eintragen</Btn>
          )}
          {/* Zuteilungs-Formular */}
          {canZuteilen&&showZuteilen&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${GN}`,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:600,color:GN,marginBottom:6}}>Wen zuteilen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setZuteilTarget("");}}
                  placeholder="Name suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?GN:GB}`,borderRadius:6,fontSize:14,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<Btn variant="ghost" onClick={()=>{setZuteilSearch("");setZuteilTarget("");}}>×</Btn>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const gefiltert=zuteilKandidaten.filter(n=>n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:14,color:"var(--sub)",padding:"4px 0"}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const gruppe=HELPERS.find(m=>m.name===n)?.gruppe||"";
                      const selected=zuteilTarget===n;
                      return(
                        <Btn onClick={()=>setZuteilTarget(selected?"":n)}><Av name={n} size={20} bg={selected?GN:"#bbb"}/> <div className="cc-flex-1"> <div style={{fontSize:14,fontWeight:selected?700:400,color:selected?GN:BK}}> {n}{n===meinName&&<span style={{fontSize:14,color:GN,marginLeft:5}}>(ich)</span>} </div> {gruppe&&<div style={{fontSize:14,color:"var(--sub)",marginTop:1}}>{gruppe}</div>} </div> {selected&&<span style={{fontSize:14,color:GN,flexShrink:0}}>✓</span>}</Btn>
                      );
                    })}
                  </div>
                );
              })()}
              <Row align="flex-start">
                <Btn small onClick={handleZuteilen} disabled={!zuteilTarget}>Zuteilen</Btn>
                <Btn small onClick={()=>{setShowZuteilen(false);setZuteilTarget("");setZuteilSearch("");}}>Abbrechen</Btn>
              </Row>
            </div>
          )}
        </div>
      ):(
        <div style={{marginTop:10}}>
          <Btn small>Besetzt</Btn>
        </div>
      )}

      {/* Funktionär/Admin: Freigabe-Anfrage mit Begründung bestätigen */}
      {canFreigeben&&anfragePending&&(
        <div style={{marginTop:8,padding:"9px 12px",background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{fontSize:14,color:AM,fontWeight:700,marginBottom:2}}>Freigabe-Anfrage von {anfrageData?.name}</div>
              <div className="cc-text-sm">Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
            <Btn variant="primary" color={AM} small onClick={()=>onFreigeben(schicht.id,null)}>Freigeben ✓</Btn>
          </div>
        </div>
      )}
      {/* Admin/Funktionär: jemanden direkt austragen */}
      {canFreigeben&&!ichDrin&&helfer.length>0&&(
        <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
          {helfer.map((h,i)=>(
            <Btn small onClick={()=>onFreigeben(schicht.id,h)}>{h} ✕</Btn>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/* Einzelne Schicht-Zeile im "Mein Einsatz"-Tab - mit eigenem Freigabe-Formular */
function MeinSchichtEintrag({schicht,anfragePending,anfrageData,meinName,onÜbertragen,onFreigeben}){
  const [showAnfrageForm,setShowAnfrageForm]=useState(false);
  const [begruendung,setBegruendung]=useState("");
  const [showTransfer,setShowTransfer]=useState(false);
  const [transferTarget,setTransferTarget]=useState("");
  const [sent,setSent]=useState(false);

  const handleSenden=()=>{
    if(!begruendung.trim()) return;
    onFreigeben(schicht.id,meinName,begruendung.trim());
    setShowAnfrageForm(false);
    setBegruendung("");
    setSent(true);
    setTimeout(()=>setSent(false),3000);
  };

  const handleÜbertragen=()=>{
    if(!transferTarget.trim()) return;
    onÜbertragen(schicht.id,meinName,transferTarget.trim());
    setShowTransfer(false);
    setTransferTarget("");
  };

  return(
    <div style={{background:"var(--surface)",border:`${anfragePending?"1.5px":"0.5px"} solid ${anfragePending?"#F59E0B":GB}`,borderRadius:10,overflow:"hidden",borderTop:`4px solid ${schicht.eventColor||AM}`}}>
      {/* Event-Label */}
      <div style={{padding:"14px 18px",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text)",letterSpacing:-0.2}}>{schicht.eventName}</div>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span>{schicht.einsatzName}</span>
            {schicht.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzDate}</span></>}
            {schicht.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzOrt}</span></>}
          </div>
        </div>
        <div className="cc-shrink-0">
          {anfragePending
            ?<Chip text="⏳ Freigabe ausstehend" color={AM}/>
            :<Chip text="Geplant ⏳" color={AM}/>
          }
        </div>
      </div>
      <div style={{padding:"10px 14px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>{schicht.label}</div>
        </div>
      </div>

      {/* Bestätigung nach Absenden */}
      {sent&&<div style={{fontSize:14,color:GN,fontWeight:600,marginBottom:6}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>}

      {/* Ausstehende Anfrage: Begründung anzeigen */}
      {anfragePending&&(
        <div style={{fontSize:14,color:AM,background:"var(--surface)",borderRadius:6,padding:"6px 9px",border:`0.5px solid ${AM}40`}}>
          <span style={{fontWeight:700}}>Begründung:</span> <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em><br/>
          <span style={{color:"var(--sub)",marginTop:3,display:"block"}}>Wartet auf Freigabe durch Funktionär/Admin.</span>
        </div>
      )}

      {/* Aktionen (nur wenn keine Anfrage pending) */}
      {!anfragePending&&!sent&&(
        <div>
          {!showAnfrageForm&&!showTransfer&&(
            <Row align="flex-start">
              <Btn small onClick={()=>setShowTransfer(true)}>⇄ Übertragen</Btn>
              <Btn small onClick={()=>setShowAnfrageForm(true)}>↩ Freigabe anfragen</Btn>
            </Row>
          )}

          {/* Freigabe-Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={begruendung}
                onChange={e=>setBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:FONT}}
              />
              <Row align="flex-start">
                <Btn small onClick={handleSenden} disabled={!begruendung.trim()}>Anfrage senden</Btn>
                <Btn small onClick={()=>{setShowAnfrageForm(false);setBegruendung("");}}>Abbrechen</Btn>
              </Row>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${BL}`,borderRadius:8}}>
              <div style={{fontSize:14,fontWeight:600,color:BL,marginBottom:6}}>Schicht übertragen an:</div>
              <select value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} style={{width:"100%",padding:"5px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,marginBottom:7}}>
                <option value="">- Person auswählen -</option>
                {ALLE_HELFER_NAMEN.filter(n=>n!==meinName).map(n=>(
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <Row align="flex-start">
                <Btn small onClick={handleÜbertragen} disabled={!transferTarget}>Übertragen</Btn>
                <Btn small onClick={()=>{setShowTransfer(false);setTransferTarget("");}}>Abbrechen</Btn>
              </Row>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function HelferModul({teamOnly,role,meineTeams=[],account,kannSchreiben,kannVerwalten}){
  const isMobile=useIsMobile();
  const [helperTab,setHelperTab]=useState(teamOnly?"team":"browse");
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [filterOffen,setFilterOffen]=useState(false);
  const [browseSearch,setBrowseSearch]=useState("");
  const [schichtenState,setSchichtenState]=useState({});
  const [collapsedTeamEvents,setCollapsedTeamEvents]=useState({});
  const toggleTeamCollapse=(id)=>setCollapsedTeamEvents(prev=>({...prev,[id]:!prev[id]}));
  const [collapsedEvents,setCollapsedEvents]=useState(()=>Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true])));
  const toggleCollapse=(id)=>setCollapsedEvents(prev=>{
    const allCollapsed=Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true]));
    return prev[id]?{...allCollapsed,[id]:false}:{...allCollapsed};
  });
  const [collapsedEinsaetze,setCollapsedEinsaetze]=useState({});
  const toggleEinsatz=(id)=>setCollapsedEinsaetze(prev=>({...prev,[id]:!prev[id]}));
  const [bemerkungState,setBemerkungState]=useState({}); /* einsatzId/schichtId → text */
  const [editingBemerkung,setEditingBemerkung]=useState(null);
  const [bemerkungDraft,setBemerkungDraft]=useState("");
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("helfer_notes");if(r)setBemerkungState(JSON.parse(r.value));}catch(e){}})();
  },[]);
  const saveBemerkung=(id,text)=>{
    const next={...bemerkungState,[id]:text};
    setBemerkungState(next);
    window.storage.set("helfer_notes",JSON.stringify(next));
    setEditingBemerkung(null);
  };
  const schichtenRef=useRef({});


  /* Load from storage on mount */
  useEffect(()=>{
    (async()=>{
      try{
        const res=await window.storage.get("helfer_schichten");
        if(res){const d=JSON.parse(res.value);setSchichtenState(d);schichtenRef.current=d;}
      }catch(e){}
      try{
        const res=await window.storage.get("helfer_freigabe");
        if(res) setFreigabeAnfragen(JSON.parse(res.value));
      }catch(e){}
    })();
  },[]);

  const saveSchichten=(updater)=>{
    setSchichtenState(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      schichtenRef.current=next;
      window.storage.set("helfer_schichten",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };
  const [expandedMember,setExpandedMember]=useState(null);
  const [filterStatus,setFilterStatus]=useState("alle");
  const [search,setSearch]=useState("");
  const [showNewForm,setShowNewForm]=useState(false);
  const [gruppenState,setGruppenState]=useState({}); /* einsatzId → gruppen[] override */
  const [editingGruppen,setEditingGruppen]=useState(null); /* einsatzId being edited */
  const [newEinsatzGruppen,setNewEinsatzGruppen]=useState(["Alle"]);

  const canEdit=["administrator","administration","funktionaer","trainer"].includes(role);
  const canFreigeben=["administrator","administration","funktionaer"].includes(role);
  const canErstellen=["administrator","administration","funktionaer"].includes(role);
  const canZuteilen=role==="trainer";
  const isTrainer=role==="trainer";
  /* Trainer sieht im Controlling nur sein Team */
  const meinTeam=meineTeams?.[0]||"Cc-Junioren";
  /* Team-Mitglieder die der Trainer zuteilen kann: er selbst + seine Spieler */
  const meinName=getHelperName(role,account);
  /* Eltern können sich selbst oder ihre Kinder eintragen */
  const elternPersonen=role==="eltern"&&account?.kinder?.length>0
    ? [meinName,...(account.kinder.map(k=>k.name))]
    : null;
  const [aktivePerson,setAktivePerson]=useState(meinName);
  const aktiverName=elternPersonen?aktivePerson:meinName;

  const teamMitglieder=[meinName,...HELPERS.filter(h=>h.gruppe===meinTeam||h.gruppe.includes(meinTeam)).map(h=>h.name)];

  const [freigabeAnfragen,setFreigabeAnfragen]=useState({});

  const saveFreigabe=(fn)=>{
    setFreigabeAnfragen(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      window.storage.set("helfer_freigabe",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };

  const getBase=(prev,sid)=>{
    for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
      const s=e.schichten.find(s=>s.id===sid);
      if(s) return prev[sid]??[...s.helfer];
    }
    return [];
  };

  const onEintragen=(sid,person)=>{
    const target=person||meinName;
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      if(base.includes(target)) return prev;
      return{...prev,[sid]:[...base,target]};
    });
  };

  /* Freigabe: canFreigeben=direkt austragen, sonst Anfrage mit Begründung stellen */
  const onFreigeben=(sid,person,begruendung)=>{
    if(canFreigeben){
      /* Funktionär/Admin trägt direkt aus */
      const target=person||meinName;
      saveSchichten(prev=>({...prev,[sid]:getBase(prev,sid).filter(h=>h!==target)}));
      saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
    } else {
      /* Andere Rollen: Anfrage mit Begründung speichern */
      saveFreigabe(prev=>({...prev,[sid]:{name:meinName,begruendung:begruendung||""}}));
    }
  };

  /* Übertragen: alten Helfer raus, neuen rein */
  const onÜbertragen=(sid,von,an)=>{
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      return{...prev,[sid]:[...base.filter(h=>h!==von),an]};
    });
    saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
  };

  /* Controlling-Berechnungen */
  const mitgliederCalc=HELPERS.map(m=>{
    const geplant=m.schichten.filter(sid=>{
      const h=schichtenState[sid];
      if(h) return h.includes(m.name);
      for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
        const s=e.schichten.find(s=>s.id===sid);
        if(s) return s.helfer.includes(m.name);
      }
      return false;
    }).length;
    const offen=Math.max(0,m.soll-m.geleistet-geplant);
    let status="Erfüllt";
    if(m.soll===0) status="Befreit";
    else if(m.geleistet>=m.soll) status="Erfüllt";
    else if(m.geleistet+geplant>=m.soll) status="Geplant erfüllt";
    else status="Offen";
    return{...m,geplant,offen,status};
  });

  /* Statistiken über alle Events */
  const allSchichten=HELPER_EVENTS.flatMap(ev=>ev.einsaetze.flatMap(e=>e.schichten));
  const totalBelegt=allSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
  const totalOffen=allSchichten.length-totalBelegt;

  /* Gruppen/Teams der aktuellen Rolle - unterstützt mehrere Teams (Eltern mit 2 Kindern) */
  const meineGruppen=[...new Set([
    ...meineTeams,
    ...meineTeams.map(t=>t+" Eltern"),
    ...(meineTeams.length===0&&role==="trainer"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="spieler"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="eltern"?["Cc-Junioren Eltern"]:[]),
  ].filter(Boolean))];
  const meinGruppe=meineGruppen[0]||null;

  const TABS= teamOnly ? [
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
  ] : [
    {key:"browse",  label:"≡ Offene Einsätze"},
    {key:"mein",    label:"Meine Einsätze"},
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
    ...(canErstellen?[{key:"erstellen",label:"+ Einsatz erfassen"}]:[]),
  ];

  /* Meine Schichten */
  const meineSchichten=[];
  for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze) for(const s of e.schichten){
    const h=schichtenState[s.id]??s.helfer;
    if(h.includes(aktiverName)) meineSchichten.push({...s,helfer:h,einsatzName:e.name,einsatzDate:e.date,einsatzOrt:e.location,eventName:ev.name,eventColor:ev.color});
  }
  const mich=mitgliederCalc.find(m=>m.name===aktiverName)||{soll:2,geleistet:1,geplant:meineSchichten.length,offen:0,status:"Geplant erfüllt"};

  /* Status-Farben */
  const SC={
    "Erfüllt":        {c:GN, bg:"#ECFDF5"},
    "Geplant erfüllt":{c:AM, bg:"#FFFBEB"},
    "Offen":          {c:R,  bg:RL},
    "Befreit":        {c:"#888",bg:"#f5f5f5"},
  };

  return(
    <div>
      {/* Seitentitel */}
      {!teamOnly&&(
        <Between style={{marginBottom:18}}>
          <H1>Helfereinsätze</H1>
          {canErstellen&&<Btn variant="primary" color="#F3F4F6" onClick={()=>{setHelperTab("erstellen");setShowNewForm(true);}}>+ Event erstellen</Btn>}
        </Between>
      )}

      {/* KPI-Leiste - nur für Admin/Administration/Funktionär */}
      {canFreigeben&&(
      <div className="cc-grid-stats cc-mb-16">
        <Stat label="Mitglieder" value={HELPERS.length}/>
        <Stat label="Soll erfüllt" value={mitgliederCalc.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length} color={GN}/>
        <Stat label="Noch offen" value={mitgliederCalc.filter(m=>m.status==="Offen").length} color={R}/>
        <Stat label="Offene Schichten" value={totalOffen} color={AM} sub={`von ${allSchichten.length} total`}/>
      </div>
      )}

      {/* Sub-Tabs */}
      <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:3,marginBottom:18,width:"fit-content"}}>
        {TABS.map(t=>(
          <Btn onClick={()=>setHelperTab(t.key)}>{t.label}</Btn>
        ))}
      </div>

      {/* -- TAB: BROWSE - alle Events auf einer Seite -- */}
      {/* Eltern: Anmelden als Switcher */}
      {elternPersonen&&(
        <div style={{display:"flex",gap:8,marginBottom:14,padding:"10px 12px",background:"var(--surface2)",borderRadius:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginRight:2}}>Anmelden als:</span>
          {elternPersonen.map((p,i)=>{
            const active=aktivePerson===p;
            return(
              <Btn onClick={()=>setAktivePerson(p)}>{i===0?`${p} (Elternteil)`:p}</Btn>
            );
          })}
        </div>
      )}
      {helperTab==="browse"&&(
        <div>
          {/* Filterleiste */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {/* Suchfeld */}
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input
                value={browseSearch}
                onChange={e=>setBrowseSearch(e.target.value)}
                placeholder="Einsatz oder Schicht suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${browseSearch?ACCENT:GB}`,borderRadius:20,fontSize:14,outline:"none",width:"100%",maxWidth:210,background:"var(--surface)"}}
              />
              {browseSearch&&(
                <Btn variant="ghost" onClick={()=>setBrowseSearch("")}>×</Btn>
              )}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            {/* Event-Filter als Dropdown */}
            <select value={selectedEvent||""} onChange={e=>setSelectedEvent(e.target.value?Number(e.target.value):null)}
              style={{padding:"5px 12px",border:`0.5px solid ${selectedEvent?ACCENT:GB}`,borderRadius:20,fontSize:14,color:"var(--text)",background:selectedEvent?"var(--cc-hover)":"#fff",cursor:"pointer",outline:"none",fontWeight:selectedEvent?700:400}}>
              <option value="">Alle Events</option>
              {HELPER_EVENTS.map(ev=>(
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <div style={{width:"1px",height:22,background:GB,margin:"0 2px"}}/>
            {/* Schichten-Filter */}
            <Btn onClick={()=>setFilterOffen(false)}>Alle Schichten</Btn>
            <Btn onClick={()=>setFilterOffen(true)}>Nur offen</Btn>
          </div>

          {/* Alle Events nacheinander */}
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).map(ev=>{
              const q=browseSearch.toLowerCase();

              /* Einsätze filtern: Suche in Event-Name, Einsatz-Name, Ort, Schicht-Label */
              const einsaetzeVisible=ev.einsaetze.map(e=>({
                ...e,
                schichtenVisible: e.schichten.filter(s=>{
                  const matchSearch=!q
                    ||ev.name.toLowerCase().includes(q)
                    ||e.name.toLowerCase().includes(q)
                    ||e.location.toLowerCase().includes(q)
                    ||s.label.toLowerCase().includes(q)
                    ||s.helfer.some(h=>h.toLowerCase().includes(q));
                  const matchOffen=!filterOffen||(schichtenState[s.id]??s.helfer).length<s.max;
                  return matchSearch&&matchOffen;
                }),
              })).filter(e=>e.schichtenVisible.length>0);

              /* Event ausblenden wenn Suche nichts trifft */
              if(q&&!ev.name.toLowerCase().includes(q)&&einsaetzeVisible.length===0) return null;

              /* Statistik für dieses Event */
              const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
              const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
              const evOffen=evSchichten.length-evBelegt;
              const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;

              const isCollapsed=!!collapsedEvents[ev.id];
              return(
                <div key={ev.id} style={{borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"0.5px solid var(--border)"}}>
                  {/* Event-Header-Banner */}
                <div onClick={()=>toggleCollapse(ev.id)} style={{background:isCollapsed?"#fff":GR,padding:"18px 20px",color:"var(--text)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)",borderLeft:`5px solid ${ev.color||BK}`}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:"var(--text)"}}>
                        {ev.name}
                        <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                      </div>
                      <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span>{""+ev.date}</span>
                        <span style={{opacity:0.4}}>{"|"}</span>
                        <span>{""+ev.loc}</span>
                      </div>
                    </div>
                    <Row align="flex-start">
                      {(()=>{
                        const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                        const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                        const offenPlätze=totalPlätze-belegtPlätze;
                        return[
                          {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                          {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                        ].map((s,i)=>(
                          <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                            <div style={{fontSize:21,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                            <div style={{fontSize:14,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                          </div>
                        ));
                      })()}
                    </Row>
                  </div>

                  {/* Einsätze */}
                  {!isCollapsed&&<div style={{background:"var(--surface)"}}>
                    {einsaetzeVisible.length===0?(
                      <div style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14,background:"var(--surface2)"}}>Keine offenen Schichten in diesem Event.</div>
                    ):einsaetzeVisible.map((einsatz,ei)=>{
                      const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                      const eOffen=einsatz.schichten.length-eBelegt;
                      const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                      const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                      return(
                        <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                          {/* Einsatz-Zeile */}
                          <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",cursor:"pointer",userSelect:"none"}}>
                            <Row gap={12}>
                              <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                              <div>
                                <div style={{fontWeight:700,fontSize:14,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:14,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                  {einsatz.name}
                                </div>
                                <div style={{fontSize:14,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
                                  <span>{""+einsatz.time+" Uhr"}</span>
                                  <span style={{color:"var(--border)"}}>{"|"}</span>
                                  <span>{""+einsatz.location}</span>
                                </div>
                                {bemerkungState[`e${einsatz.id}`]&&(
                                  <div style={{fontSize:14,color:AM,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                                    <span><TI n="edit"/></span><span style={{fontStyle:"italic"}}>{bemerkungState[`e${einsatz.id}`]}</span>
                                  </div>
                                )}
                              </div>
                            </Row>
                            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                              {/* Gruppen - editierbar für Admin/Funktionär */}
                              {editingGruppen===einsatz.id?(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                                  {HELPER_GRUPPEN.map(g=>{
                                    const cur=gruppenState[einsatz.id]||einsatz.gruppen;
                                    const checked=cur.includes(g);
                                    return(
                                      <label key={g} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:14,padding:"5px 12px",borderRadius:20,background:checked?"var(--cc-hover)":"#fff",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                                        <input type="checkbox" checked={checked} onChange={()=>setGruppenState(prev=>{const cur=prev[einsatz.id]||einsatz.gruppen;return {...prev,[einsatz.id]:checked?cur.filter(x=>x!==g):[...cur,g]};})} style={{display:"none"}}/>
                                        {g}
                                      </label>
                                    );
                                  })}
                                  <Btn onClick={e=>{e.stopPropagation();setEditingGruppen(null);}}>✓ Fertig</Btn>
                                </div>
                              ):(
                                <>
                                  {(gruppenState[einsatz.id]||einsatz.gruppen).map((g,gi)=><Chip key={gi} text={g} color="#6B7280"/>)}
                                  {canEdit&&<Btn onClick={e=>{e.stopPropagation();setEditingGruppen(einsatz.id);}}><TI n="edit"/></Btn>}
                                </>
                              )}
                              {/* Bemerkung Edit */}
                              {canEdit&&(editingBemerkung===`e${einsatz.id}`?(
                                <div onClick={e=>e.stopPropagation()} className="cc-row">
                                  <input autoFocus value={bemerkungDraft} onChange={e=>setBemerkungDraft(e.target.value)}
                                    placeholder="Bemerkung…"
                                    style={{padding:"3px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,outline:"none",width:160}}/>
                                  <Btn small onClick={()=>saveBemerkung(`e${einsatz.id}`,bemerkungDraft)}>✓</Btn>
                                  <Btn small onClick={()=>setEditingBemerkung(null)}>✕</Btn>
                                </div>
                              ):(
                                <Btn onClick={e=>{e.stopPropagation();setEditingBemerkung(`e${einsatz.id}`);setBemerkungDraft(bemerkungState[`e${einsatz.id}`]||"");}}><TI n="edit"/></Btn>
                              ))}
                              {(()=>{
                                const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                const offenPlätze=totalPlätze-belegtPlätze;
                                return(
                                  <span style={{fontSize:14,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                    {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Schichten-Grid */}
                          {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:16,padding:"16px",background:"var(--surface)"}}>
                            {einsatz.schichtenVisible.map(s=>(
                              <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={bemerkungState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                            ))}
                          </div>}
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
            {/* Keine Treffer */}
            {browseSearch&&HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).every(ev=>{
              const q=browseSearch.toLowerCase();
              if(ev.name.toLowerCase().includes(q)) return false;
              return ev.einsaetze.every(e=>
                !e.name.toLowerCase().includes(q)&&
                !e.location.toLowerCase().includes(q)&&
                e.schichten.every(s=>!s.label.toLowerCase().includes(q)&&!s.helfer.some(h=>h.toLowerCase().includes(q)))
              );
            })&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)"}}>
                Keine Einsätze oder Schichten gefunden für <strong style={{color:"var(--text)"}}>„{browseSearch}"</strong>
                <br/><Btn onClick={()=>setBrowseSearch("")}>Suche zurücksetzen</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- TAB: MEIN EINSATZ -- */}
      {helperTab==="mein"&&(
        <div>
          {/* Status-Kacheln */}
          <div className="cc-grid-stats cc-mb-20">
            {[{l:"Soll",v:mich.soll,c:BK,bg:"#fff"},{l:"Geleistet",v:mich.geleistet,c:GN,bg:"#F0FDF4"},{l:"Geplant",v:mich.geplant,c:AM,bg:"#FFFBEB"},{l:"Offen",v:mich.offen,c:mich.offen>0?R:"#aaa",bg:mich.offen>0?"#FEF2F2":"#fff"}].map((s,i)=>(
              <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Status-Banner */}
          <div style={{padding:"10px 16px",borderRadius:10,marginBottom:18,background:mich.status==="Erfüllt"?"#F0FDF4":mich.status==="Geplant erfüllt"?"#FFFBEB":mich.status==="Befreit"?"#F3F4F6":"#FEF2F2",border:`0.5px solid ${mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#ccc":R}`}}>
            <div style={{fontWeight:700,fontSize:14,color:mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#888":R}}>
              {mich.status==="Erfüllt"&&"✓ Soll erfüllt - Danke für deinen Einsatz!"}
              {mich.status==="Geplant erfüllt"&&"⏳ Geplant erfüllt - Schichten noch ausstehend"}
              {mich.status==="Offen"&&`${mich.offen} Einsatz${mich.offen>1?"ätze":""} noch offen`}
              {mich.status==="Befreit"&&"Du bist von Helfereinsätzen befreit"}
            </div>
          </div>
          {(()=>{
            const today="2026-05-23";
            const parseDate=(d)=>{
              if(!d) return "";
              const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
              const parts=clean.split(".");
              if(parts.length===3) return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
              return "";
            };
            const geleistet=meineSchichten.filter(s=>parseDate(s.einsatzDate)<today&&parseDate(s.einsatzDate)!=="");
            const geplant=meineSchichten.filter(s=>parseDate(s.einsatzDate)>=today||parseDate(s.einsatzDate)==="");
            return(
              <>
                {geplant.length>0&&(
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"var(--surface)",color:AM,fontSize:14,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #FDE68A`}}>⏳ Geplant</span>
                      <span className="cc-text-sm">{geplant.length+" Schicht"+(geplant.length!==1?"en":"")}</span>
                    </div>
                    <Col>
                      {geplant.map((s,i)=>{
                        const anfrageData=(freigabeAnfragen||{})[s.id];
                        const anfragePending=anfrageData?.name===meinName;
                        return <MeinSchichtEintrag key={i} schicht={s} anfragePending={anfragePending} anfrageData={anfrageData} meinName={aktiverName} onÜbertragen={onÜbertragen} onFreigeben={onFreigeben}/>;
                      })}
                    </Col>
                  </div>
                )}
                {geleistet.length>0&&(
                  <div className="cc-mb-16">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"var(--surface)",color:GN,fontSize:14,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #BBF7D0`}}>✓ Geleistet</span>
                      <span className="cc-text-sm">{geleistet.length+" Schicht"+(geleistet.length!==1?"en":"")}</span>
                    </div>
                    <Col>
                      {geleistet.map((s,i)=>(
                        <div key={i} style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:10,overflow:"hidden",borderTop:`4px solid ${s.eventColor||"#64748B"}`,opacity:0.85}}>
                          <div style={{padding:"14px 18px",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:"var(--text)",letterSpacing:-0.2}}>{s.eventName}</div>
                              <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                <span>{s.einsatzName}</span>
                                {s.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzDate}</span></>}
                                {s.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzOrt}</span></>}
                              </div>
                            </div>
                            <span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN,flexShrink:0}}>✓ Geleistet</span>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            <div style={{fontWeight:600,fontSize:14}}>{s.label}</div>
                            <div style={{fontSize:14,color:"var(--sub)",marginTop:2}}>{""+s.einsatzDate+(s.einsatzOrt?" · "+s.einsatzOrt:"")}</div>
                          </div>
                        </div>
                      ))}
                    </Col>
                  </div>
                )}
                {meineSchichten.length===0&&<InfoBox text="Noch keine Schichten eingetragen." color="#aaa"/>}
              </>
            );
          })()}
          {mich.status==="Offen"&&meineSchichten.length===0&&<InfoBox text={`Noch ${mich.offen} Einsatz${mich.offen>1?"ätze":""} offen. Unter "Offene Einsätze" eine Schicht übernehmen.`} color={R}/>}
        </div>
      )}

      {/* -- TAB: MEINEM TEAM ZUGEWIESEN -- */}
      {helperTab==="team"&&meinGruppe&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:16,fontSize:14}}>
            <span style={{fontSize:14}}><TI n="users"/></span>
            <span>Einsätze für deine Teams: {meineGruppen.map((g,i)=><strong key={i}>{i>0?" · ":""}{g}</strong>)}</span>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {(()=>{
              /* Alle Einsätze sammeln die für meinGruppe oder "Alle" freigegeben sind */
              const teamEinsaetze=[];
              for(const ev of HELPER_EVENTS){
                const passende=ev.einsaetze.filter(e=>
                  meineGruppen.some(g=>e.gruppen.includes(g))&&!e.gruppen.includes("Alle")
                );
                if(passende.length>0) teamEinsaetze.push({...ev,einsaetze:passende});
              }

              if(teamEinsaetze.length===0) return(
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)"}}>
                  Keine Einsätze für dein Team ({meinGruppe}) zugewiesen.
                </div>
              );

              return teamEinsaetze.map(ev=>{
                const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
                const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                const evOffen=evSchichten.length-evBelegt;
                const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;
                const isTeamCollapsed=!!collapsedTeamEvents[ev.id];
                return(
                  <div key={ev.id} style={{borderRadius:14,overflow:"hidden",border:"0.5px solid var(--border)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    {/* Event-Banner */}
                    <div onClick={()=>toggleTeamCollapse(ev.id)} style={{background:isTeamCollapsed?"#fff":GR,borderTop:`4px solid ${ev.color}`,padding:"18px 20px",color:"var(--text)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)"}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:"var(--text)"}}>
                          {ev.name}
                          <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isTeamCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                        </div>
                        <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span>{""+ev.date}</span>
                          <span style={{opacity:0.4}}>{"|"}</span>
                          <span>{""+ev.loc}</span>
                        </div>
                      </div>
                      <Row align="flex-start">
                        {(()=>{
                          const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                          const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                          const offenPlätze=totalPlätze-belegtPlätze;
                          return[
                            {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                            {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                          ].map((s,i)=>(
                            <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                              <div style={{fontSize:21,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                              <div style={{fontSize:14,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                            </div>
                          ));
                        })()}
                      </Row>
                    </div>

                    {/* Einsätze */}
                    {!isTeamCollapsed&&<div style={{borderTop:"0.5px solid var(--border)",overflow:"hidden"}}>
                      {ev.einsaetze.map((einsatz,ei)=>{
                        const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                        const eOffen=einsatz.schichten.length-eBelegt;
                        const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                        const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                        return(
                          <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                            <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",cursor:"pointer",userSelect:"none"}}>
                              <Row gap={12}>
                                <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                                <div>
                                  <div style={{fontWeight:700,fontSize:14,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:14,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                    {einsatz.name}
                                  </div>
                                  <div style={{fontSize:14,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
                                    <span>{""+einsatz.time+" Uhr"}</span>
                                    <span style={{color:"var(--border)"}}>{"|"}</span>
                                    <span>{""+einsatz.location}</span>
                                  </div>
                                </div>
                              </Row>
                              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                                {einsatz.gruppen.map((g,gi)=>(
                                  <Chip key={gi} text={g} color={g===meinGruppe?ev.color:"var(--sub)"} bg={g===meinGruppe?ev.color+"18":"#F3F4F6"}/>
                                ))}
                                {(()=>{
                                  const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                  const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                  const offenPlätze=totalPlätze-belegtPlätze;
                                  return(
                                    <span style={{fontSize:14,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                      {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:16,padding:"16px",background:"var(--surface)"}}>
                              {einsatz.schichten.map(s=>(
                                <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={bemerkungState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                              ))}
                            </div>}
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* -- TAB: CONTROLLING -- */}
      {helperTab==="controlling"&&canEdit&&(
        <div>
          {/* Team-Filter Hinweis für Trainer */}
          {isTrainer&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:14,fontSize:14}}>
              <span style={{fontSize:14}}><TI n="eye"/></span>
              <span>Du siehst nur Mitglieder deines Teams: <strong>Cc-Junioren</strong></span>
            </div>
          )}

          {/* Stat-Kacheln */}
          {(()=>{
            const relevant=isTrainer?mitgliederCalc.filter(m=>m.gruppe===meinTeam||m.gruppe.includes(meinTeam)):mitgliederCalc;
            const erfuellt=relevant.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length;
            const offen=relevant.filter(m=>m.status==="Offen").length;
            const befreit=relevant.filter(m=>m.status==="Befreit").length;
            return(
              <div className="cc-grid-stats cc-mb-20">
                {[{l:"Erfüllt",v:erfuellt,c:GN,bg:"#F0FDF4"},{l:"Offen",v:offen,c:AM,bg:"#FFFBEB"},{l:"Befreit",v:befreit,c:BK,bg:"#fff"}].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                    <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Suche + Filter */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center",width:"100%",rowGap:6}}>
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mitglied suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${search?ACCENT:GB}`,borderRadius:20,fontSize:14,outline:"none",width:"100%",maxWidth:190,background:"var(--surface)"}}/>
              {search&&<Btn variant="ghost" onClick={()=>setSearch("")}>×</Btn>}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["alle","Offen","Geplant erfüllt","Erfüllt","Befreit"].map(f=>(
                <Btn onClick={()=>setFilterStatus(f)}>{f==="alle"?"Alle":f}</Btn>
              ))}
            </div>
            {!isTrainer&&(
              <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                <Btn small>Export CSV</Btn>
                <Btn small>Export Excel</Btn>
              </div>
            )}
          </div>

          <Card style={{padding:0,overflowX:"auto"}}>
            <div className="cc-table-wrap"><table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Mitglied","Gruppe","Soll","Geleistet","Geplant","Offen","Status",""].map((h,i)=>(
                    <th className="cc-th" key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mitgliederCalc
                  .filter(m=>!isTrainer||(m.gruppe===meinTeam||m.gruppe.includes(meinTeam)))
                  .filter(m=>filterStatus==="alle"||m.status===filterStatus)
                  .filter(m=>m.name.toLowerCase().includes(search.toLowerCase()))
                  .map((m,i)=>(
                  <>
                    <tr key={m.id} onClick={()=>setExpandedMember(expandedMember===m.id?null:m.id)}
                      style={{borderTop:"0.5px solid var(--border)",background:expandedMember===m.id?"var(--cc-hover)":"#fff",cursor:"pointer"}}
                      className="hov-row">
                      <td className="cc-td" style={{padding:"9px 12px"}}>
                        <Row>
                          <Av name={m.name} size={22} bg={SC[m.status]?.c||"#6B7280"}/>
                          <span style={{fontWeight:600}}>{m.name}</span>
                        </Row>
                      </td>
                      <td className="cc-td" style={{padding:"9px 12px"}}><Chip text={m.gruppe} color="#6B7280"/></td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",fontWeight:700}}>{m.soll}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:GN,fontWeight:600}}>{m.geleistet}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:AM,fontWeight:600}}>{m.geplant}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:m.offen>0?R:"#aaa",fontWeight:m.offen>0?700:400}}>{m.offen}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center"}}><Chip text={m.status} color={SC[m.status]?.c||"#888"} bg={SC[m.status]?.bg}/></td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:"var(--sub)",fontSize:14}}>{expandedMember===m.id?"▲":"▼"}</td>
                    </tr>
                    {expandedMember===m.id&&(
                      <tr key={`d${m.id}`} style={{borderTop:"0.5px solid var(--border)"}}>
                        <td colSpan={8} style={{padding:"10px 20px 14px",background:"var(--surface2)"}}>
                          {m.schichten.length===0?(
                            <span className="cc-text-sm">Keine Schichten übernommen.</span>
                          ):(
                            <div className="cc-grid-cards cc-mb-20" style={{gap:8,marginBottom:10}}>
                              {m.schichten.map((sid,si)=>{
                                const anfrage=freigabeAnfragen[sid];
                                for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
                                  const s=e.schichten.find(s=>s.id===sid);
                                  if(s){
                                    const d=e.date||"";
                                    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
                                    const parts=clean.split(".");
                                    const iso=parts.length===3?`${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`:"";
                                    const past=iso<"2026-05-23"&&iso!=="";
                                    const statusBadge=anfrage
                                      ?<span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:AM,border:`0.5px solid #FDE68A`}}>⏳ Freigabe ausstehend</span>
                                      :past
                                        ?<span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN}}>✓ Geleistet</span>
                                        :<span style={{fontSize:14,padding:"2px 4px",color:AM}}>⏳</span>;
                                    return(
                                      <div key={sid} style={{borderRadius:10,overflow:"hidden",border:`0.5px solid ${anfrage?AM:GB}`,background:anfrage?"#FFFBEB":"#fff",borderTop:`3px solid ${ev.color||"#64748B"}`}}>
                                        {/* Header */}
                                        <div style={{padding:"8px 12px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                          <div>
                                            <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{ev.name}</div>
                                            <div style={{fontSize:14,color:"var(--sub)",marginTop:1}}>{e.name}</div>
                                          </div>
                                          {statusBadge}
                                        </div>
                                        {/* Body */}
                                        <div style={{padding:"7px 12px"}}>
                                          <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{s.label}</div>
                                          <div style={{fontSize:14,color:"var(--sub)",marginTop:2,display:"flex",gap:8}}>
                                            <span>{""+e.date}</span>
                                            {e.location&&<><span style={{opacity:0.3}}>|</span><span>{""+e.location}</span></>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {/* Trainer: nur Schichten ansehen, keine Admin-Aktionen */}
                          {!isTrainer&&(
                            <Row align="flex-start">
                              <Btn small variant="primary" color="#F3F4F6">Erinnerung senden</Btn>
                              <Btn small>Sollwert anpassen</Btn>
                              <Btn small>Als befreit markieren</Btn>
                            </Row>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table></div>
          </Card>
        </div>
      )}

      {/* -- TAB: ERSTELLEN -- */}
      {helperTab==="erstellen"&&canErstellen&&(
        <Card>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Neuen Einsatz erfassen</div>
          <div className="cc-grid-cards cc-mb-20" style={{gap:12}}>
            {[
              {l:"Event",            type:"select",opts:["Grümpelturnier 2026","Generalversammlung 2026","+ Neuer Event…"]},
              {l:"Einsatzname",      type:"text",  ph:"z.B. Grill"},
              {l:"Datum",            type:"date"},
              {l:"Zeit",             type:"text",  ph:"10:00-14:00"},
              {l:"Ort",              type:"text",  ph:"z.B. Grillstand"},
              {l:"Freigabe Gruppen", type:"gruppen"},
            ].map((f,i)=>(
              <div key={i}>
                <label style={{fontSize:14,color:"var(--sub)",display:"block",marginBottom:4}}>{f.l}</label>
                {f.type==="gruppen"?(
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>
                    {HELPER_GRUPPEN.map(g=>{
                      const checked=newEinsatzGruppen.includes(g);
                      return(
                        <label key={g} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,padding:"3px 8px",borderRadius:20,background:checked?"var(--cc-hover)":"#F3F4F6",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                          <input type="checkbox" checked={checked} onChange={()=>setNewEinsatzGruppen(prev=>checked?prev.filter(x=>x!==g):[...prev,g])} style={{display:"none"}}/>
                          {g}
                        </label>
                      );
                    })}
                  </div>
                ):f.type==="select"?(
                  <select style={{width:"100%",padding:"7px 9px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14}}>
                    {f.opts?.map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <Input type={f.type||"text"} placeholder={f.ph} style={{fontSize:14,boxSizing:"border-box"}}/>
                )}
              </div>
            ))}
          </div>
          <div className="cc-mt-16">
            <div style={{fontWeight:600,fontSize:14,marginBottom:8}}>Schichten</div>
            {[1,2,3].map(n=>(
              <div key={n} style={{display:"flex",gap:8,marginBottom:7,alignItems:"center"}}>
                <input placeholder={`Schicht ${n}: z.B. Grill 10:00-14:00`} style={{flex:1,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14}}/>
                <input type="number" placeholder="Max" style={{width:55,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14}}/>
                <span className="cc-text-sm">Plätze</span>
              </div>
            ))}
            <Btn variant="ghost">+ Schicht hinzufügen</Btn>
          </div>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <Btn variant="primary" color="#F3F4F6">Einsatz erstellen</Btn>
            <Btn onClick={()=>setHelperTab("browse")}>Abbrechen</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function HelpersList({teamOnly,role,meineTeams=[],account,kannSchreiben,kannVerwalten}){
  const isMobile=useIsMobile();
  const [helperTab,setHelperTab]=useState(teamOnly?"team":"browse");
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [filterOffen,setFilterOffen]=useState(false);
  const [browseSearch,setBrowseSearch]=useState("");
  const [schichtenState,setSchichtenState]=useState({});
  const [collapsedTeamEvents,setCollapsedTeamEvents]=useState({});
  const toggleTeamCollapse=(id)=>setCollapsedTeamEvents(prev=>({...prev,[id]:!prev[id]}));
  const [collapsedEvents,setCollapsedEvents]=useState(()=>Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true])));
  const toggleCollapse=(id)=>setCollapsedEvents(prev=>{
    const allCollapsed=Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true]));
    return prev[id]?{...allCollapsed,[id]:false}:{...allCollapsed};
  });
  const [collapsedEinsaetze,setCollapsedEinsaetze]=useState({});
  const toggleEinsatz=(id)=>setCollapsedEinsaetze(prev=>({...prev,[id]:!prev[id]}));
  const [bemerkungState,setBemerkungState]=useState({}); /* einsatzId/schichtId → text */
  const [editingBemerkung,setEditingBemerkung]=useState(null);
  const [bemerkungDraft,setBemerkungDraft]=useState("");
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("helfer_notes");if(r)setBemerkungState(JSON.parse(r.value));}catch(e){}})();
  },[]);
  const saveBemerkung=(id,text)=>{
    const next={...bemerkungState,[id]:text};
    setBemerkungState(next);
    window.storage.set("helfer_notes",JSON.stringify(next));
    setEditingBemerkung(null);
  };
  const schichtenRef=useRef({});


  /* Load from storage on mount */
  useEffect(()=>{
    (async()=>{
      try{
        const res=await window.storage.get("helfer_schichten");
        if(res){const d=JSON.parse(res.value);setSchichtenState(d);schichtenRef.current=d;}
      }catch(e){}
      try{
        const res=await window.storage.get("helfer_freigabe");
        if(res) setFreigabeAnfragen(JSON.parse(res.value));
      }catch(e){}
    })();
  },[]);

  const saveSchichten=(updater)=>{
    setSchichtenState(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      schichtenRef.current=next;
      window.storage.set("helfer_schichten",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };
  const [expandedMember,setExpandedMember]=useState(null);
  const [filterStatus,setFilterStatus]=useState("alle");
  const [search,setSearch]=useState("");
  const [showNewForm,setShowNewForm]=useState(false);
  const [gruppenState,setGruppenState]=useState({}); /* einsatzId → gruppen[] override */
  const [editingGruppen,setEditingGruppen]=useState(null); /* einsatzId being edited */
  const [newEinsatzGruppen,setNewEinsatzGruppen]=useState(["Alle"]);

  const canEdit=["administrator","administration","funktionaer","trainer"].includes(role);
  const canFreigeben=["administrator","administration","funktionaer"].includes(role);
  const canErstellen=["administrator","administration","funktionaer"].includes(role);
  const canZuteilen=role==="trainer";
  const isTrainer=role==="trainer";
  /* Trainer sieht im Controlling nur sein Team */
  const meinTeam=meineTeams?.[0]||"Cc-Junioren";
  /* Team-Mitglieder die der Trainer zuteilen kann: er selbst + seine Spieler */
  const meinName=getHelperName(role,account);
  /* Eltern können sich selbst oder ihre Kinder eintragen */
  const elternPersonen=role==="eltern"&&account?.kinder?.length>0
    ? [meinName,...(account.kinder.map(k=>k.name))]
    : null;
  const [aktivePerson,setAktivePerson]=useState(meinName);
  const aktiverName=elternPersonen?aktivePerson:meinName;

  const teamMitglieder=[meinName,...HELPERS.filter(h=>h.gruppe===meinTeam||h.gruppe.includes(meinTeam)).map(h=>h.name)];

  const [freigabeAnfragen,setFreigabeAnfragen]=useState({});

  const saveFreigabe=(fn)=>{
    setFreigabeAnfragen(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      window.storage.set("helfer_freigabe",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };

  const getBase=(prev,sid)=>{
    for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
      const s=e.schichten.find(s=>s.id===sid);
      if(s) return prev[sid]??[...s.helfer];
    }
    return [];
  };

  const onEintragen=(sid,person)=>{
    const target=person||meinName;
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      if(base.includes(target)) return prev;
      return{...prev,[sid]:[...base,target]};
    });
  };

  /* Freigabe: canFreigeben=direkt austragen, sonst Anfrage mit Begründung stellen */
  const onFreigeben=(sid,person,begruendung)=>{
    if(canFreigeben){
      /* Funktionär/Admin trägt direkt aus */
      const target=person||meinName;
      saveSchichten(prev=>({...prev,[sid]:getBase(prev,sid).filter(h=>h!==target)}));
      saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
    } else {
      /* Andere Rollen: Anfrage mit Begründung speichern */
      saveFreigabe(prev=>({...prev,[sid]:{name:meinName,begruendung:begruendung||""}}));
    }
  };

  /* Übertragen: alten Helfer raus, neuen rein */
  const onÜbertragen=(sid,von,an)=>{
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      return{...prev,[sid]:[...base.filter(h=>h!==von),an]};
    });
    saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
  };

  /* Controlling-Berechnungen */
  const mitgliederCalc=HELPERS.map(m=>{
    const geplant=m.schichten.filter(sid=>{
      const h=schichtenState[sid];
      if(h) return h.includes(m.name);
      for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
        const s=e.schichten.find(s=>s.id===sid);
        if(s) return s.helfer.includes(m.name);
      }
      return false;
    }).length;
    const offen=Math.max(0,m.soll-m.geleistet-geplant);
    let status="Erfüllt";
    if(m.soll===0) status="Befreit";
    else if(m.geleistet>=m.soll) status="Erfüllt";
    else if(m.geleistet+geplant>=m.soll) status="Geplant erfüllt";
    else status="Offen";
    return{...m,geplant,offen,status};
  });

  /* Statistiken über alle Events */
  const allSchichten=HELPER_EVENTS.flatMap(ev=>ev.einsaetze.flatMap(e=>e.schichten));
  const totalBelegt=allSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
  const totalOffen=allSchichten.length-totalBelegt;

  /* Gruppen/Teams der aktuellen Rolle - unterstützt mehrere Teams (Eltern mit 2 Kindern) */
  const meineGruppen=[...new Set([
    ...meineTeams,
    ...meineTeams.map(t=>t+" Eltern"),
    ...(meineTeams.length===0&&role==="trainer"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="spieler"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="eltern"?["Cc-Junioren Eltern"]:[]),
  ].filter(Boolean))];
  const meinGruppe=meineGruppen[0]||null;

  const TABS= teamOnly ? [
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
  ] : [
    {key:"browse",  label:"≡ Offene Einsätze"},
    {key:"mein",    label:"Meine Einsätze"},
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
    ...(canErstellen?[{key:"erstellen",label:"+ Einsatz erfassen"}]:[]),
  ];

  /* Meine Schichten */
  const meineSchichten=[];
  for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze) for(const s of e.schichten){
    const h=schichtenState[s.id]??s.helfer;
    if(h.includes(aktiverName)) meineSchichten.push({...s,helfer:h,einsatzName:e.name,einsatzDate:e.date,einsatzOrt:e.location,eventName:ev.name,eventColor:ev.color});
  }
  const mich=mitgliederCalc.find(m=>m.name===aktiverName)||{soll:2,geleistet:1,geplant:meineSchichten.length,offen:0,status:"Geplant erfüllt"};

  /* Status-Farben */
  const SC={
    "Erfüllt":        {c:GN, bg:"#ECFDF5"},
    "Geplant erfüllt":{c:AM, bg:"#FFFBEB"},
    "Offen":          {c:R,  bg:RL},
    "Befreit":        {c:"#888",bg:"#f5f5f5"},
  };

  return(
    <div>
      {/* Seitentitel */}
      {!teamOnly&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Helfereinsätze</h1>
          {canErstellen&&<Btn variant="primary" color="#F3F4F6" onClick={()=>{setHelperTab("erstellen");setShowNewForm(true);}}>+ Event erstellen</Btn>}
        </div>
      )}

      {/* KPI-Leiste - nur für Admin/Administration/Funktionär */}
      {canFreigeben&&(
      <div className="cc-grid-stats cc-mb-16">
        <Stat label="Mitglieder" value={HELPERS.length}/>
        <Stat label="Soll erfüllt" value={mitgliederCalc.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length} color={GN}/>
        <Stat label="Noch offen" value={mitgliederCalc.filter(m=>m.status==="Offen").length} color={R}/>
        <Stat label="Offene Schichten" value={totalOffen} color={AM} sub={`von ${allSchichten.length} total`}/>
      </div>
      )}

      {/* Sub-Tabs */}
      <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:3,marginBottom:18,width:"fit-content"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setHelperTab(t.key)} style={{padding:"8px 14px",border:"none",borderRadius:8,background:helperTab===t.key?"#fff":"transparent",color:helperTab===t.key?BK:"#999",fontWeight:helperTab===t.key?700:400,cursor:"pointer",fontSize:14,boxShadow:helperTab===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none",whiteSpace:"nowrap"}}>{t.label}</button>
        ))}
      </div>

      {/* -- TAB: BROWSE - alle Events auf einer Seite -- */}
      {/* Eltern: Anmelden als Switcher */}
      {elternPersonen&&(
        <div style={{display:"flex",gap:8,marginBottom:14,padding:"10px 12px",background:"var(--surface2)",borderRadius:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginRight:2}}>Anmelden als:</span>
          {elternPersonen.map((p,i)=>{
            const active=aktivePerson===p;
            return(
              <button key={i} onClick={()=>setAktivePerson(p)}
                style={{padding:"6px 14px",borderRadius:20,border:`0.5px solid ${active?ACCENT:GB}`,background:active?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:14,fontWeight:active?700:400,cursor:"pointer"}}>
                {i===0?`${p} (Elternteil)`:p}
              </button>
            );
          })}
        </div>
      )}
      {helperTab==="browse"&&(
        <div>
          {/* Filterleiste */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {/* Suchfeld */}
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input
                value={browseSearch}
                onChange={e=>setBrowseSearch(e.target.value)}
                placeholder="Einsatz oder Schicht suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${browseSearch?ACCENT:GB}`,borderRadius:20,fontSize:14,outline:"none",width:"100%",maxWidth:210,background:"var(--surface)"}}
              />
              {browseSearch&&(
                <button onClick={()=>setBrowseSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--sub)",lineHeight:1}}>×</button>
              )}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            {/* Event-Filter als Dropdown */}
            <select value={selectedEvent||""} onChange={e=>setSelectedEvent(e.target.value?Number(e.target.value):null)}
              style={{padding:"5px 12px",border:`0.5px solid ${selectedEvent?ACCENT:GB}`,borderRadius:20,fontSize:14,color:"var(--text)",background:selectedEvent?"var(--cc-hover)":"#fff",cursor:"pointer",outline:"none",fontWeight:selectedEvent?700:400}}>
              <option value="">Alle Events</option>
              {HELPER_EVENTS.map(ev=>(
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <div style={{width:"1px",height:22,background:GB,margin:"0 2px"}}/>
            {/* Schichten-Filter */}
            <button onClick={()=>setFilterOffen(false)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${!filterOffen?ACCENT:GB}`,background:!filterOffen?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:14,cursor:"pointer",fontWeight:!filterOffen?700:400}}>Alle Schichten</button>
            <button onClick={()=>setFilterOffen(true)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${filterOffen?ACCENT:GB}`,background:filterOffen?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:14,cursor:"pointer",fontWeight:filterOffen?700:400}}>Nur offen</button>
          </div>

          {/* Alle Events nacheinander */}
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).map(ev=>{
              const q=browseSearch.toLowerCase();

              /* Einsätze filtern: Suche in Event-Name, Einsatz-Name, Ort, Schicht-Label */
              const einsaetzeVisible=ev.einsaetze.map(e=>({
                ...e,
                schichtenVisible: e.schichten.filter(s=>{
                  const matchSearch=!q
                    ||ev.name.toLowerCase().includes(q)
                    ||e.name.toLowerCase().includes(q)
                    ||e.location.toLowerCase().includes(q)
                    ||s.label.toLowerCase().includes(q)
                    ||s.helfer.some(h=>h.toLowerCase().includes(q));
                  const matchOffen=!filterOffen||(schichtenState[s.id]??s.helfer).length<s.max;
                  return matchSearch&&matchOffen;
                }),
              })).filter(e=>e.schichtenVisible.length>0);

              /* Event ausblenden wenn Suche nichts trifft */
              if(q&&!ev.name.toLowerCase().includes(q)&&einsaetzeVisible.length===0) return null;

              /* Statistik für dieses Event */
              const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
              const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
              const evOffen=evSchichten.length-evBelegt;
              const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;

              const isCollapsed=!!collapsedEvents[ev.id];
              return(
                <div key={ev.id} style={{borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"0.5px solid var(--border)"}}>
                  {/* Event-Header-Banner */}
                <div onClick={()=>toggleCollapse(ev.id)} style={{background:isCollapsed?"#fff":GR,padding:"18px 20px",color:"var(--text)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)",borderLeft:`5px solid ${ev.color||BK}`}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:"var(--text)"}}>
                        {ev.name}
                        <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                      </div>
                      <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span>{""+ev.date}</span>
                        <span style={{opacity:0.4}}>{"|"}</span>
                        <span>{""+ev.loc}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {(()=>{
                        const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                        const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                        const offenPlätze=totalPlätze-belegtPlätze;
                        return[
                          {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                          {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                        ].map((s,i)=>(
                          <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                            <div style={{fontSize:21,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                            <div style={{fontSize:14,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Einsätze */}
                  {!isCollapsed&&<div style={{background:"var(--surface)"}}>
                    {einsaetzeVisible.length===0?(
                      <div style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14,background:"var(--surface2)"}}>Keine offenen Schichten in diesem Event.</div>
                    ):einsaetzeVisible.map((einsatz,ei)=>{
                      const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                      const eOffen=einsatz.schichten.length-eBelegt;
                      const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                      const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                      return(
                        <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                          {/* Einsatz-Zeile */}
                          <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",cursor:"pointer",userSelect:"none"}}>
                            <div className="cc-row cc-gap-12">
                              <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                              <div>
                                <div style={{fontWeight:700,fontSize:14,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:14,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                  {einsatz.name}
                                </div>
                                <div style={{fontSize:14,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
                                  <span>{""+einsatz.time+" Uhr"}</span>
                                  <span style={{color:"var(--border)"}}>{"|"}</span>
                                  <span>{""+einsatz.location}</span>
                                </div>
                                {bemerkungState[`e${einsatz.id}`]&&(
                                  <div style={{fontSize:14,color:AM,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                                    <span><TI n="edit"/></span><span style={{fontStyle:"italic"}}>{bemerkungState[`e${einsatz.id}`]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                              {/* Gruppen - editierbar für Admin/Funktionär */}
                              {editingGruppen===einsatz.id?(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                                  {HELPER_GRUPPEN.map(g=>{
                                    const cur=gruppenState[einsatz.id]||einsatz.gruppen;
                                    const checked=cur.includes(g);
                                    return(
                                      <label key={g} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:14,padding:"5px 12px",borderRadius:20,background:checked?"var(--cc-hover)":"#fff",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                                        <input type="checkbox" checked={checked} onChange={()=>setGruppenState(prev=>{const cur=prev[einsatz.id]||einsatz.gruppen;return {...prev,[einsatz.id]:checked?cur.filter(x=>x!==g):[...cur,g]};})} style={{display:"none"}}/>
                                        {g}
                                      </label>
                                    );
                                  })}
                                  <button onClick={e=>{e.stopPropagation();setEditingGruppen(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:14,fontWeight:600,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,cursor:"pointer"}}>✓ Fertig</button>
                                </div>
                              ):(
                                <>
                                  {(gruppenState[einsatz.id]||einsatz.gruppen).map((g,gi)=><Chip key={gi} text={g} color="#6B7280"/>)}
                                  {canEdit&&<button onClick={e=>{e.stopPropagation();setEditingGruppen(einsatz.id);}} style={{padding:"5px 12px",borderRadius:20,fontSize:14,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}><TI n="edit"/></button>}
                                </>
                              )}
                              {/* Bemerkung Edit */}
                              {canEdit&&(editingBemerkung===`e${einsatz.id}`?(
                                <div onClick={e=>e.stopPropagation()} className="cc-row">
                                  <input autoFocus value={bemerkungDraft} onChange={e=>setBemerkungDraft(e.target.value)}
                                    placeholder="Bemerkung…"
                                    style={{padding:"3px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,outline:"none",width:160}}/>
                                  <button onClick={()=>saveBemerkung(`e${einsatz.id}`,bemerkungDraft)} style={{padding:"4px 10px",borderRadius:6,fontSize:14,fontWeight:600,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,cursor:"pointer"}}>✓</button>
                                  <button onClick={()=>setEditingBemerkung(null)} style={{padding:"4px 10px",borderRadius:6,fontSize:14,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}>✕</button>
                                </div>
                              ):(
                                <button onClick={e=>{e.stopPropagation();setEditingBemerkung(`e${einsatz.id}`);setBemerkungDraft(bemerkungState[`e${einsatz.id}`]||"");}}
                                  style={{padding:"5px 12px",borderRadius:20,fontSize:14,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}><TI n="edit"/></button>
                              ))}
                              {(()=>{
                                const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                const offenPlätze=totalPlätze-belegtPlätze;
                                return(
                                  <span style={{fontSize:14,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                    {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Schichten-Grid */}
                          {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:16,padding:"16px",background:"var(--surface)"}}>
                            {einsatz.schichtenVisible.map(s=>(
                              <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={bemerkungState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                            ))}
                          </div>}
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
            {/* Keine Treffer */}
            {browseSearch&&HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).every(ev=>{
              const q=browseSearch.toLowerCase();
              if(ev.name.toLowerCase().includes(q)) return false;
              return ev.einsaetze.every(e=>
                !e.name.toLowerCase().includes(q)&&
                !e.location.toLowerCase().includes(q)&&
                e.schichten.every(s=>!s.label.toLowerCase().includes(q)&&!s.helfer.some(h=>h.toLowerCase().includes(q)))
              );
            })&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)"}}>
                Keine Einsätze oder Schichten gefunden für <strong style={{color:"var(--text)"}}>„{browseSearch}"</strong>
                <br/><button onClick={()=>setBrowseSearch("")} style={{marginTop:10,padding:"5px 12px",borderRadius:20,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>Suche zurücksetzen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- TAB: MEIN EINSATZ -- */}
      {helperTab==="mein"&&(
        <div>
          {/* Status-Kacheln */}
          <div className="cc-grid-stats cc-mb-20">
            {[{l:"Soll",v:mich.soll,c:BK,bg:"#fff"},{l:"Geleistet",v:mich.geleistet,c:GN,bg:"#F0FDF4"},{l:"Geplant",v:mich.geplant,c:AM,bg:"#FFFBEB"},{l:"Offen",v:mich.offen,c:mich.offen>0?R:"#aaa",bg:mich.offen>0?"#FEF2F2":"#fff"}].map((s,i)=>(
              <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Status-Banner */}
          <div style={{padding:"10px 16px",borderRadius:10,marginBottom:18,background:mich.status==="Erfüllt"?"#F0FDF4":mich.status==="Geplant erfüllt"?"#FFFBEB":mich.status==="Befreit"?"#F3F4F6":"#FEF2F2",border:`0.5px solid ${mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#ccc":R}`}}>
            <div style={{fontWeight:700,fontSize:14,color:mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#888":R}}>
              {mich.status==="Erfüllt"&&"✓ Soll erfüllt - Danke für deinen Einsatz!"}
              {mich.status==="Geplant erfüllt"&&"⏳ Geplant erfüllt - Schichten noch ausstehend"}
              {mich.status==="Offen"&&`${mich.offen} Einsatz${mich.offen>1?"ätze":""} noch offen`}
              {mich.status==="Befreit"&&"Du bist von Helfereinsätzen befreit"}
            </div>
          </div>
          {(()=>{
            const today="2026-05-23";
            const parseDate=(d)=>{
              if(!d) return "";
              const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
              const parts=clean.split(".");
              if(parts.length===3) return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
              return "";
            };
            const geleistet=meineSchichten.filter(s=>parseDate(s.einsatzDate)<today&&parseDate(s.einsatzDate)!=="");
            const geplant=meineSchichten.filter(s=>parseDate(s.einsatzDate)>=today||parseDate(s.einsatzDate)==="");
            return(
              <>
                {geplant.length>0&&(
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"var(--surface)",color:AM,fontSize:14,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #FDE68A`}}>⏳ Geplant</span>
                      <span className="cc-text-sm">{geplant.length+" Schicht"+(geplant.length!==1?"en":"")}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {geplant.map((s,i)=>{
                        const anfrageData=(freigabeAnfragen||{})[s.id];
                        const anfragePending=anfrageData?.name===meinName;
                        return <MeinSchichtEintrag key={i} schicht={s} anfragePending={anfragePending} anfrageData={anfrageData} meinName={aktiverName} onÜbertragen={onÜbertragen} onFreigeben={onFreigeben}/>;
                      })}
                    </div>
                  </div>
                )}
                {geleistet.length>0&&(
                  <div className="cc-mb-16">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"var(--surface)",color:GN,fontSize:14,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #BBF7D0`}}>✓ Geleistet</span>
                      <span className="cc-text-sm">{geleistet.length+" Schicht"+(geleistet.length!==1?"en":"")}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {geleistet.map((s,i)=>(
                        <div key={i} style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:10,overflow:"hidden",borderTop:`4px solid ${s.eventColor||"#64748B"}`,opacity:0.85}}>
                          <div style={{padding:"14px 18px",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:"var(--text)",letterSpacing:-0.2}}>{s.eventName}</div>
                              <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                <span>{s.einsatzName}</span>
                                {s.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzDate}</span></>}
                                {s.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzOrt}</span></>}
                              </div>
                            </div>
                            <span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN,flexShrink:0}}>✓ Geleistet</span>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            <div style={{fontWeight:600,fontSize:14}}>{s.label}</div>
                            <div style={{fontSize:14,color:"var(--sub)",marginTop:2}}>{""+s.einsatzDate+(s.einsatzOrt?" · "+s.einsatzOrt:"")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {meineSchichten.length===0&&<InfoBox text="Noch keine Schichten eingetragen." color="#aaa"/>}
              </>
            );
          })()}
          {mich.status==="Offen"&&meineSchichten.length===0&&<InfoBox text={`Noch ${mich.offen} Einsatz${mich.offen>1?"ätze":""} offen. Unter "Offene Einsätze" eine Schicht übernehmen.`} color={R}/>}
        </div>
      )}

      {/* -- TAB: MEINEM TEAM ZUGEWIESEN -- */}
      {helperTab==="team"&&meinGruppe&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:16,fontSize:14}}>
            <span style={{fontSize:14}}><TI n="users"/></span>
            <span>Einsätze für deine Teams: {meineGruppen.map((g,i)=><strong key={i}>{i>0?" · ":""}{g}</strong>)}</span>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {(()=>{
              /* Alle Einsätze sammeln die für meinGruppe oder "Alle" freigegeben sind */
              const teamEinsaetze=[];
              for(const ev of HELPER_EVENTS){
                const passende=ev.einsaetze.filter(e=>
                  meineGruppen.some(g=>e.gruppen.includes(g))&&!e.gruppen.includes("Alle")
                );
                if(passende.length>0) teamEinsaetze.push({...ev,einsaetze:passende});
              }

              if(teamEinsaetze.length===0) return(
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)"}}>
                  Keine Einsätze für dein Team ({meinGruppe}) zugewiesen.
                </div>
              );

              return teamEinsaetze.map(ev=>{
                const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
                const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                const evOffen=evSchichten.length-evBelegt;
                const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;
                const isTeamCollapsed=!!collapsedTeamEvents[ev.id];
                return(
                  <div key={ev.id} style={{borderRadius:14,overflow:"hidden",border:"0.5px solid var(--border)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    {/* Event-Banner */}
                    <div onClick={()=>toggleTeamCollapse(ev.id)} style={{background:isTeamCollapsed?"#fff":GR,borderTop:`4px solid ${ev.color}`,padding:"18px 20px",color:"var(--text)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)"}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:"var(--text)"}}>
                          {ev.name}
                          <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isTeamCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                        </div>
                        <div style={{fontSize:14,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span>{""+ev.date}</span>
                          <span style={{opacity:0.4}}>{"|"}</span>
                          <span>{""+ev.loc}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {(()=>{
                          const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                          const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                          const offenPlätze=totalPlätze-belegtPlätze;
                          return[
                            {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                            {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                          ].map((s,i)=>(
                            <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                              <div style={{fontSize:21,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                              <div style={{fontSize:14,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Einsätze */}
                    {!isTeamCollapsed&&<div style={{borderTop:"0.5px solid var(--border)",overflow:"hidden"}}>
                      {ev.einsaetze.map((einsatz,ei)=>{
                        const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                        const eOffen=einsatz.schichten.length-eBelegt;
                        const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                        const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                        return(
                          <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                            <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",cursor:"pointer",userSelect:"none"}}>
                              <div className="cc-row cc-gap-12">
                                <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                                <div>
                                  <div style={{fontWeight:700,fontSize:14,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:14,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                    {einsatz.name}
                                  </div>
                                  <div style={{fontSize:14,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
                                    <span>{""+einsatz.time+" Uhr"}</span>
                                    <span style={{color:"var(--border)"}}>{"|"}</span>
                                    <span>{""+einsatz.location}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                                {einsatz.gruppen.map((g,gi)=>(
                                  <Chip key={gi} text={g} color={g===meinGruppe?ev.color:"var(--sub)"} bg={g===meinGruppe?ev.color+"18":"#F3F4F6"}/>
                                ))}
                                {(()=>{
                                  const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                  const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                  const offenPlätze=totalPlätze-belegtPlätze;
                                  return(
                                    <span style={{fontSize:14,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                      {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:16,padding:"16px",background:"var(--surface)"}}>
                              {einsatz.schichten.map(s=>(
                                <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={bemerkungState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                              ))}
                            </div>}
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* -- TAB: CONTROLLING -- */}
      {helperTab==="controlling"&&canEdit&&(
        <div>
          {/* Team-Filter Hinweis für Trainer */}
          {isTrainer&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:14,fontSize:14}}>
              <span style={{fontSize:14}}><TI n="eye"/></span>
              <span>Du siehst nur Mitglieder deines Teams: <strong>Cc-Junioren</strong></span>
            </div>
          )}

          {/* Stat-Kacheln */}
          {(()=>{
            const relevant=isTrainer?mitgliederCalc.filter(m=>m.gruppe===meinTeam||m.gruppe.includes(meinTeam)):mitgliederCalc;
            const erfuellt=relevant.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length;
            const offen=relevant.filter(m=>m.status==="Offen").length;
            const befreit=relevant.filter(m=>m.status==="Befreit").length;
            return(
              <div className="cc-grid-stats cc-mb-20">
                {[{l:"Erfüllt",v:erfuellt,c:GN,bg:"#F0FDF4"},{l:"Offen",v:offen,c:AM,bg:"#FFFBEB"},{l:"Befreit",v:befreit,c:BK,bg:"#fff"}].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                    <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Suche + Filter */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center",width:"100%",rowGap:6}}>
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mitglied suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${search?ACCENT:GB}`,borderRadius:20,fontSize:14,outline:"none",width:"100%",maxWidth:190,background:"var(--surface)"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--sub)",lineHeight:1}}>×</button>}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["alle","Offen","Geplant erfüllt","Erfüllt","Befreit"].map(f=>(
                <button key={f} onClick={()=>setFilterStatus(f)} style={{padding:"5px 12px",border:`0.5px solid ${filterStatus===f?ACCENT:GB}`,borderRadius:20,background:filterStatus===f?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:14,cursor:"pointer",fontWeight:filterStatus===f?700:400}}>{f==="alle"?"Alle":f}</button>
              ))}
            </div>
            {!isTrainer&&(
              <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                <Btn small>Export CSV</Btn>
                <Btn small>Export Excel</Btn>
              </div>
            )}
          </div>

          <Card style={{padding:0,overflowX:"auto"}}>
            <div className="cc-table-wrap"><table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Mitglied","Gruppe","Soll","Geleistet","Geplant","Offen","Status",""].map((h,i)=>(
                    <th className="cc-th" key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mitgliederCalc
                  .filter(m=>!isTrainer||(m.gruppe===meinTeam||m.gruppe.includes(meinTeam)))
                  .filter(m=>filterStatus==="alle"||m.status===filterStatus)
                  .filter(m=>m.name.toLowerCase().includes(search.toLowerCase()))
                  .map((m,i)=>(
                  <>
                    <tr key={m.id} onClick={()=>setExpandedMember(expandedMember===m.id?null:m.id)}
                      style={{borderTop:"0.5px solid var(--border)",background:expandedMember===m.id?"var(--cc-hover)":"#fff",cursor:"pointer"}}
                      className="hov-row">
                      <td className="cc-td" style={{padding:"9px 12px"}}>
                        <div className="cc-row">
                          <Av name={m.name} size={22} bg={SC[m.status]?.c||"#6B7280"}/>
                          <span style={{fontWeight:600}}>{m.name}</span>
                        </div>
                      </td>
                      <td className="cc-td" style={{padding:"9px 12px"}}><Chip text={m.gruppe} color="#6B7280"/></td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",fontWeight:700}}>{m.soll}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:GN,fontWeight:600}}>{m.geleistet}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:AM,fontWeight:600}}>{m.geplant}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:m.offen>0?R:"#aaa",fontWeight:m.offen>0?700:400}}>{m.offen}</td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center"}}><Chip text={m.status} color={SC[m.status]?.c||"#888"} bg={SC[m.status]?.bg}/></td>
                      <td className="cc-td" style={{padding:"9px 12px",textAlign:"center",color:"var(--sub)",fontSize:14}}>{expandedMember===m.id?"▲":"▼"}</td>
                    </tr>
                    {expandedMember===m.id&&(
                      <tr key={`d${m.id}`} style={{borderTop:"0.5px solid var(--border)"}}>
                        <td colSpan={8} style={{padding:"10px 20px 14px",background:"var(--surface2)"}}>
                          {m.schichten.length===0?(
                            <span className="cc-text-sm">Keine Schichten übernommen.</span>
                          ):(
                            <div className="cc-grid-cards cc-mb-20" style={{gap:8,marginBottom:10}}>
                              {m.schichten.map((sid,si)=>{
                                const anfrage=freigabeAnfragen[sid];
                                for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
                                  const s=e.schichten.find(s=>s.id===sid);
                                  if(s){
                                    const d=e.date||"";
                                    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
                                    const parts=clean.split(".");
                                    const iso=parts.length===3?`${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`:"";
                                    const past=iso<"2026-05-23"&&iso!=="";
                                    const statusBadge=anfrage
                                      ?<span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:AM,border:`0.5px solid #FDE68A`}}>⏳ Freigabe ausstehend</span>
                                      :past
                                        ?<span style={{fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN}}>✓ Geleistet</span>
                                        :<span style={{fontSize:14,padding:"2px 4px",color:AM}}>⏳</span>;
                                    return(
                                      <div key={sid} style={{borderRadius:10,overflow:"hidden",border:`0.5px solid ${anfrage?AM:GB}`,background:anfrage?"#FFFBEB":"#fff",borderTop:`3px solid ${ev.color||"#64748B"}`}}>
                                        {/* Header */}
                                        <div style={{padding:"8px 12px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                          <div>
                                            <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{ev.name}</div>
                                            <div style={{fontSize:14,color:"var(--sub)",marginTop:1}}>{e.name}</div>
                                          </div>
                                          {statusBadge}
                                        </div>
                                        {/* Body */}
                                        <div style={{padding:"7px 12px"}}>
                                          <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{s.label}</div>
                                          <div style={{fontSize:14,color:"var(--sub)",marginTop:2,display:"flex",gap:8}}>
                                            <span>{""+e.date}</span>
                                            {e.location&&<><span style={{opacity:0.3}}>|</span><span>{""+e.location}</span></>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {/* Trainer: nur Schichten ansehen, keine Admin-Aktionen */}
                          {!isTrainer&&(
                            <div style={{display:"flex",gap:8}}>
                              <Btn small variant="primary" color="#F3F4F6">Erinnerung senden</Btn>
                              <Btn small>Sollwert anpassen</Btn>
                              <Btn small>Als befreit markieren</Btn>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table></div>
          </Card>
        </div>
      )}

      {/* -- TAB: ERSTELLEN -- */}
      {helperTab==="erstellen"&&canErstellen&&(
        <Card>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Neuen Einsatz erfassen</div>
          <div className="cc-grid-cards cc-mb-20" style={{gap:12}}>
            {[
              {l:"Event",            type:"select",opts:["Grümpelturnier 2026","Generalversammlung 2026","+ Neuer Event…"]},
              {l:"Einsatzname",      type:"text",  ph:"z.B. Grill"},
              {l:"Datum",            type:"date"},
              {l:"Zeit",             type:"text",  ph:"10:00-14:00"},
              {l:"Ort",              type:"text",  ph:"z.B. Grillstand"},
              {l:"Freigabe Gruppen", type:"gruppen"},
            ].map((f,i)=>(
              <div key={i}>
                <label style={{fontSize:14,color:"var(--sub)",display:"block",marginBottom:4}}>{f.l}</label>
                {f.type==="gruppen"?(
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>
                    {HELPER_GRUPPEN.map(g=>{
                      const checked=newEinsatzGruppen.includes(g);
                      return(
                        <label key={g} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,padding:"3px 8px",borderRadius:20,background:checked?"var(--cc-hover)":"#F3F4F6",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                          <input type="checkbox" checked={checked} onChange={()=>setNewEinsatzGruppen(prev=>checked?prev.filter(x=>x!==g):[...prev,g])} style={{display:"none"}}/>
                          {g}
                        </label>
                      );
                    })}
                  </div>
                ):f.type==="select"?(
                  <select style={{width:"100%",padding:"7px 9px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14}}>
                    {f.opts?.map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <input type={f.type||"text"} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
                )}
              </div>
            ))}
          </div>
          <div className="cc-mt-16">
            <div style={{fontWeight:600,fontSize:14,marginBottom:8}}>Schichten</div>
            {[1,2,3].map(n=>(
              <div key={n} style={{display:"flex",gap:8,marginBottom:7,alignItems:"center"}}>
                <input placeholder={`Schicht ${n}: z.B. Grill 10:00-14:00`} style={{flex:1,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14}}/>
                <input type="number" placeholder="Max" style={{width:55,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14}}/>
                <span className="cc-text-sm">Plätze</span>
              </div>
            ))}
            <button style={{fontSize:14,color:BL,background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0}}>+ Schicht hinzufügen</button>
          </div>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <Btn variant="primary" color="#F3F4F6">Einsatz erstellen</Btn>
            <Btn onClick={()=>setHelperTab("browse")}>Abbrechen</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function RolleChip({rolle}){
  const colors={
    "Spieler":     {c:"#22C55E",bg:"#F0FDF4"},
    "Trainer":     {c:"#F97316",bg:"#FFF7ED"},
    "Assistent/in":{c:"#F97316",bg:"#FFF7ED"},
    "Goalietrainer":{c:"#F97316",bg:"#FFF7ED"},
    "Vorstand":    {c:"#8B5CF6",bg:"#F5F3FF"},
    "Kassier":     {c:"#8B5CF6",bg:"#F5F3FF"},
    "Materialwart":{c:"#3B82F6",bg:"#EFF6FF"},
    "Platzwart":   {c:"#3B82F6",bg:"#EFF6FF"},
    "Schiedsrichter":{c:"#EC4899",bg:"#FDF2F8"},
    "Elternteil":  {c:"#06B6D4",bg:"#ECFEFF"},
    "Ehrenmitglied":{c:"#f8de09",bg:"#FFFBEB"},
    "Passivmitglied":{c:"#9CA3AF",bg:"#F9FAFB"},
    "Gönner":      {c:"#9CA3AF",bg:"#F9FAFB"},
  };
  const s=colors[rolle]||{c:"#9CA3AF",bg:"#F9FAFB"};
  return <Chip text={rolle||"-"} color={s.c} bg={s.bg}/>;
}






/* Alle möglichen Übergabe-Empfänger (alle Helfer ausser dem aktuellen) */
function kannHelferEinsatzErstellen(role, typ, team, meineTeams=[]){
  if(role==="administrator"||role==="administration"||role==="funktionaer") return true;
  if(role==="trainer") return typ==="team"&&(meineTeams||[]).includes(team);
  return false;
}

export { HelferModul, HelpersList , kannHelferEinsatzErstellen};
