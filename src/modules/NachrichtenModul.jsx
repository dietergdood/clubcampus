/* ═══════════════════════════════════════════════════════════════
   ClubCampus NachrichtenModul — NachrichtenModul.jsx
   Broadcast & Diskussions-Modul
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, GN, BL, R, RL } from "../constants.ts";
import { TI } from "../icons.jsx";
import { ModalOrSheet, ModalTitle, Row, useIsMobile, Btn } from "../theme.jsx";

const S_LABEL={fontSize:12,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5};

function NachrichtenModul({sb,role,account,dbTeams=[],gruppen=[],teamFilter=null,kannSchreiben=false,kannVerwalten=false}){
  const isMobile=useIsMobile();
  const [nachrichten,setNachrichten]=useState([]);
  const [selected,setSelected]=useState(null);
  const [antworten,setAntworten]=useState([]);
  const [dateien,setDateien]=useState([]);
  const [loading,setLoading]=useState(true);
  const [antwortText,setAntwortText]=useState("");
  const [sending,setSending]=useState(false);
  const [showNeu,setShowNeu]=useState(false);
  const [tab,setTab]=useState("alle");
  const [filter,setFilter]=useState(null);
  const [showThread,setShowThread]=useState(false);
  const [ungelesen,setUngelesen]=useState({});
  const [neuForm,setNeuForm]=useState({titel:"",inhalt:"",typ:"broadcast",empfaenger_typ:"rolle",empfaenger_rolle:"",empfaenger_gruppe_id:null,empfaenger_team:""});

  const ROLLEN_OPTS=[
    {value:"alle",label:"Alle Mitglieder"},
    {value:"vorstand",label:"Vorstand"},
    {value:"administration",label:"Administration"},
    {value:"trainer",label:"Alle Trainer"},
    {value:"spieler",label:"Alle Spieler"},
    {value:"eltern",label:"Alle Eltern"},
    {value:"funktionaer",label:"Alle Funktionäre"},
  ];

  const kannSenden=kannSchreiben||kannVerwalten;

  async function loadNachrichten(){
    if(!sb){setLoading(false);return;}
    setLoading(true);
    try{
      let q=sb.from("nachrichten").select("*").order("erstellt_am",{ascending:false});
      if(teamFilter) q=q.eq("empfaenger_team",teamFilter);
      const{data}=await q;
      if(data) setNachrichten(data);
      const{data:gel}=await sb.from("nachrichten_gelesen").select("nachricht_id").eq("user_id",account?.id||"");
      if(gel){const g={};gel.forEach(r=>{g[r.nachricht_id]=true;});setUngelesen(g);}
    }catch(e){console.warn(e);}
    setLoading(false);
  }

  async function loadAntworten(id){
    if(!sb) return;
    try{
      const{data}=await sb.from("nachrichten_antworten").select("*").eq("nachricht_id",id).order("erstellt_am");
      if(data) setAntworten(data);
      const{data:df}=await sb.from("nachrichten_dateien").select("*").eq("nachricht_id",id);
      if(df) setDateien(df);
      await sb.from("nachrichten_gelesen").upsert({nachricht_id:id,user_id:account?.id||""},{onConflict:"nachricht_id,user_id"});
      setUngelesen(prev=>({...prev,[id]:true}));
    }catch(e){console.warn(e);}
  }

  async function sendAntwort(){
    if(!antwortText.trim()) return;
    setSending(true);
    try{
      const row={nachricht_id:selected.id,inhalt:antwortText,autor_name:account?.name||role,autor_id:account?.id||""};
      if(sb){const{data}=await sb.from("nachrichten_antworten").insert(row).select().single();if(data)setAntworten(a=>[...a,data]);}
      else setAntworten(a=>[...a,{...row,id:Date.now(),erstellt_am:new Date().toISOString()}]);
      setAntwortText("");
    }catch(e){console.warn(e);}
    setSending(false);
  }

  async function sendNachricht(){
    if(!neuForm.titel.trim()||!neuForm.inhalt.trim()) return;
    setSending(true);
    try{
      const row={...neuForm,autor_name:account?.name||role,autor_id:account?.id||"",erstellt_am:new Date().toISOString()};
      if(sb){const{data}=await sb.from("nachrichten").insert(row).select().single();if(data)setNachrichten(n=>[data,...n]);}
      else setNachrichten(n=>[{...row,id:Date.now()},...n]);
      setShowNeu(false);
      setNeuForm({titel:"",inhalt:"",typ:"broadcast",empfaenger_typ:"rolle",empfaenger_rolle:"",empfaenger_gruppe_id:null,empfaenger_team:""});
    }catch(e){console.warn(e);}
    setSending(false);
  }

  useEffect(()=>{loadNachrichten();},[sb,teamFilter]);

  function getEmpfLabel(n){
    if(n.empfaenger_rolle) return ROLLEN_OPTS.find(r=>r.value===n.empfaenger_rolle)?.label||n.empfaenger_rolle;
    if(n.empfaenger_team) return n.empfaenger_team;
    if(n.empfaenger_gruppe_id) return gruppen.find(g=>g.id===n.empfaenger_gruppe_id)?.name||"Gruppe";
    return "Alle";
  }

  function fmtTime(ts){
    if(!ts) return "";
    const d=new Date(ts);const h=new Date();
    if(d.toDateString()===h.toDateString()) return d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
    return d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"});
  }

  function initials(name){return (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();}
  const AV_COLORS=["#E1F5EE","#EEEDFE","#E6F1FB","#FAEEDA","#EAF3DE"];
  const AV_TEXT=["#085041","#3C3489","#0C447C","#633806","#27500A"];
  function avC(name){const i=(name||"").charCodeAt(0)%5;return{bg:AV_COLORS[i],txt:AV_TEXT[i]};}

  const filtered=nachrichten.filter(n=>{
    if(tab==="gesendet"&&n.autor_id!==account?.id) return false;
    if(tab==="ungelesen"&&ungelesen[n.id]) return false;
    if(filter&&n.typ!==filter) return false;
    return true;
  });

  const ungelesenCount=nachrichten.filter(n=>!ungelesen[n.id]).length;

  /* ── Thread ── */
  function renderThread(){
    if(!selected) return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12}}>
        <div style={{width:56,height:56,borderRadius:16,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <TI n="message-2" size={26} style={{color:"var(--border)"}}/>
        </div>
        <div style={{fontSize:14,color:"var(--sub)",fontWeight:500}}>Nachricht auswählen</div>
        <div style={{fontSize:12,color:"var(--border)"}}>Klicke links auf eine Nachricht</div>
      </div>
    );
    const av=avC(selected.autor_name);
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        {/* Thread Header */}
        <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border)",flexShrink:0,background:"var(--surface)"}}>
          {isMobile&&(
            <Btn variant="ghost" onClick={()=>{setShowThread(false);setSelected(null);}} style={{marginBottom:10}}>
              <TI n="arrow-left" size={14}/> Zurück
            </Btn>
          )}
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:av.txt,flexShrink:0}}>
              {initials(selected.autor_name)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{selected.titel}</span>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600,
                  background:selected.typ==="broadcast"?"#DBEAFE":"#DCFCE7",
                  color:selected.typ==="broadcast"?"#1D4ED8":"#166534"}}>
                  {selected.typ==="broadcast"?"📢 Broadcast":"💬 Diskussion"}
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{selected.autor_name}</span>
                <span style={{fontSize:12,color:"var(--sub)"}}>→</span>
                <span style={{fontSize:12,color:"var(--sub)",background:"var(--surface2)",padding:"2px 8px",borderRadius:6}}>{getEmpfLabel(selected)}</span>
                <span style={{fontSize:11,color:"var(--sub)"}}>{fmtTime(selected.erstellt_am)}</span>
              </div>
            </div>
            {kannVerwalten&&(
              <button onClick={async()=>{if(!window.confirm("Nachricht löschen?"))return;await sb.from("nachrichten").delete().eq("id",selected.id);setSelected(null);setAntworten([]);loadNachrichten();}}
                className="cc-icon-btn" style={{flexShrink:0}}>
                <TI n="trash" size={14} style={{color:R}}/>
              </button>
            )}
          </div>
        </div>
        {/* Thread Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          <p style={{fontSize:14,color:"var(--text)",lineHeight:1.75,margin:"0 0 20px",whiteSpace:"pre-wrap"}}>{selected.inhalt}</p>
          {dateien.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
              {dateien.map(d=>(
                <a key={d.id} href={d.datei_url} target="_blank" rel="noreferrer"
                  style={{padding:"7px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,color:"var(--sub)",display:"flex",alignItems:"center",gap:8,textDecoration:"none",background:"var(--surface2)"}}>
                  <TI n="paperclip" size={13}/>{d.datei_name}
                </a>
              ))}
            </div>
          )}
          {antworten.length>0&&(
            <div>
              <div className="cc-section-hdr">
                <div style={{flex:1,height:1,background:"var(--border)"}}/>
                {antworten.length} {antworten.length===1?"Antwort":"Antworten"}
                <div style={{flex:1,height:1,background:"var(--border)"}}/>
              </div>
              {antworten.map(a=>{
                const aav=avC(a.autor_name);
                return(
                  <div key={a.id} style={{display:"flex",gap:10,marginBottom:12}}>
                    <div style={{width:30,height:30,borderRadius:8,background:aav.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:aav.txt,flexShrink:0}}>
                      {initials(a.autor_name)}
                    </div>
                    <div style={{flex:1,background:"var(--surface2)",borderRadius:10,padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <span style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{a.autor_name}</span>
                        <span style={{fontSize:11,color:"var(--sub)"}}>{fmtTime(a.erstellt_am)}</span>
                        {kannVerwalten&&(
                          <button onClick={async()=>{await sb.from("nachrichten_antworten").delete().eq("id",a.id);loadAntworten(selected.id);}}
                            className="cc-icon-btn" style={{width:22,height:22,marginLeft:"auto"}}>
                            <TI n="trash" size={11} style={{color:"var(--sub)"}}/>
                          </button>
                        )}
                      </div>
                      <p style={{fontSize:14,color:"var(--text)",margin:0,lineHeight:1.6}}>{a.inhalt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Reply Box */}
        <div style={{padding:"12px 16px",borderTop:"0.5px solid var(--border)",display:"flex",gap:8,alignItems:"center",flexShrink:0,background:"var(--surface)"}}>
          <div style={{width:28,height:28,borderRadius:8,background:avC(account?.name||role).bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:avC(account?.name||role).txt,flexShrink:0}}>
            {initials(account?.name||role)}
          </div>
          <input value={antwortText} onChange={e=>setAntwortText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAntwort();}}}
            placeholder="Antworten…"
            className="cc-input" style={{flex:1}}/>
          <button onClick={sendAntwort} disabled={!antwortText.trim()||sending}
            style={{width:36,height:36,borderRadius:10,background:ACCENT,border:"none",cursor:antwortText.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",opacity:antwortText.trim()?1:0.4,transition:"opacity 0.15s",flexShrink:0}}>
            <TI n="send" size={15} style={{color:ACCENT2}}/>
          </button>
        </div>
      </div>
    );
  }

  /* ── Liste ── */
  function renderListe(){
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        {/* List Header */}
        <div style={{padding:"14px 16px",borderBottom:"0.5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:15,fontWeight:800,color:"var(--text)",letterSpacing:-0.3}}>Nachrichten</span>
            {ungelesenCount>0&&(
              <span style={{background:ACCENT,color:ACCENT2,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,minWidth:18,textAlign:"center"}}>
                {ungelesenCount}
              </span>
            )}
          </div>
          {kannSenden&&(
            <button onClick={()=>setShowNeu(true)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"none",background:ACCENT,color:ACCENT2,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
              <TI n="plus" size={13}/> Neu
            </button>
          )}
        </div>
        {/* Tabs */}
        <div style={{padding:"8px 12px",borderBottom:"0.5px solid var(--border)",flexShrink:0}}>
          <div className="cc-seg">
            {["alle","ungelesen","gesendet"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} className={"cc-seg-item"+(tab===t?" cc-seg-active":"")}>
                {t==="alle"?"Alle":t==="ungelesen"?"Ungelesen":"Gesendet"}
              </button>
            ))}
          </div>
        </div>
        {/* Filter Chips */}
        <div style={{padding:"8px 12px",borderBottom:"0.5px solid var(--border)",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
          {[null,"broadcast","diskussion"].map(f=>(
            <button key={f||"all"} onClick={()=>setFilter(filter===f?null:f)}
              className={"cc-chip-toggle"+(filter===f?" cc-chip-active":"")}>
              {f===null?"Alle":f==="broadcast"?"📢 Broadcast":"💬 Diskussion"}
            </button>
          ))}
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?(
            <div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:14}}>Wird geladen…</div>
          ):filtered.length===0?(
            <div style={{padding:40,textAlign:"center"}}>
              <div style={{width:48,height:48,borderRadius:14,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <TI n="inbox" size={22} style={{color:"var(--border)"}}/>
              </div>
              <div style={{fontSize:14,color:"var(--sub)",fontWeight:500}}>Keine Nachrichten</div>
            </div>
          ):filtered.map(n=>{
            const isSelected=selected?.id===n.id;
            const isUngelesen=!ungelesen[n.id];
            const av=avC(n.autor_name);
            return(
              <div key={n.id} onClick={()=>{setSelected(n);loadAntworten(n.id);if(isMobile)setShowThread(true);}}
                style={{padding:"12px 14px",borderBottom:"0.5px solid var(--border)",cursor:"pointer",
                  background:isSelected?"var(--surface2)":"transparent",
                  borderLeft:`3px solid ${isSelected?ACCENT:"transparent"}`,
                  transition:"background 0.1s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:10,background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:av.txt,flexShrink:0,position:"relative"}}>
                    {initials(n.autor_name)}
                    {isUngelesen&&<div className="cc-unread-dot" style={{background:ACCENT}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:isUngelesen?700:500,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{n.titel}</span>
                      <span style={{fontSize:11,color:"var(--sub)",flexShrink:0}}>{fmtTime(n.erstellt_am)}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{n.autor_name} → {getEmpfLabel(n)}</span>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,fontWeight:600,flexShrink:0,
                        background:n.typ==="broadcast"?"#DBEAFE":"#DCFCE7",
                        color:n.typ==="broadcast"?"#1D4ED8":"#166534"}}>
                        {n.typ==="broadcast"?"BC":"DK"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return(
    <div>
      {/* Neue Nachricht Modal */}
      <ModalOrSheet open={showNeu} onClose={()=>setShowNeu(false)} maxWidth={520}>
        <div style={{padding:"20px 20px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <ModalTitle>Neue Nachricht</ModalTitle>
            <button onClick={()=>setShowNeu(false)} className="cc-icon-btn"><TI n="x" size={14}/></button>
          </div>
        </div>
        <div style={{padding:"0 20px 20px",overflowY:"auto"}}>
          {/* Typ */}
          <div style={{marginBottom:14}}>
            <label style={S_LABEL}>Typ</label>
            <div style={{display:"flex",gap:8}}>
              {["broadcast","diskussion"].map(t=>(
                <button key={t} onClick={()=>setNeuForm(f=>({...f,typ:t}))}
                  style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${neuForm.typ===t?ACCENT:"var(--border)"}`,
                    background:neuForm.typ===t?ACCENT+"15":"var(--surface2)",
                    cursor:"pointer",fontFamily:FONT,fontSize:14,fontWeight:600,
                    color:neuForm.typ===t?"var(--text)":"var(--sub)",transition:"all 0.15s"}}>
                  {t==="broadcast"?"📢 Broadcast":"💬 Diskussion"}
                </button>
              ))}
            </div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:6}}>{neuForm.typ==="broadcast"?"Nur Absender sieht Antworten der anderen":"Alle sehen alle Antworten"}</div>
          </div>
          {/* Empfänger */}
          <div style={{marginBottom:14}}>
            <label style={S_LABEL}>Empfänger</label>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              {["rolle","gruppe","team"].map(t=>(
                <button key={t} onClick={()=>setNeuForm(f=>({...f,empfaenger_typ:t}))}
                  style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${neuForm.empfaenger_typ===t?"var(--text)":"var(--border)"}`,
                    background:neuForm.empfaenger_typ===t?"var(--text)":"transparent",
                    color:neuForm.empfaenger_typ===t?"var(--bg)":"var(--sub)",
                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>
                  {t==="rolle"?"Rolle":t==="gruppe"?"Gruppe":"Team"}
                </button>
              ))}
            </div>
            {neuForm.empfaenger_typ==="rolle"&&(
              <select value={neuForm.empfaenger_rolle} onChange={e=>setNeuForm(f=>({...f,empfaenger_rolle:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:FONT,outline:"none"}}>
                <option value="">Empfänger wählen…</option>
                {ROLLEN_OPTS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            {neuForm.empfaenger_typ==="gruppe"&&(
              <select value={neuForm.empfaenger_gruppe_id||""} onChange={e=>setNeuForm(f=>({...f,empfaenger_gruppe_id:e.target.value?parseInt(e.target.value):null}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:FONT,outline:"none"}}>
                <option value="">Gruppe wählen…</option>
                {gruppen.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            {neuForm.empfaenger_typ==="team"&&(
              <select value={neuForm.empfaenger_team} onChange={e=>setNeuForm(f=>({...f,empfaenger_team:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:FONT,outline:"none"}}>
                <option value="">Team wählen…</option>
                {dbTeams.map(t=><option key={t.id||t.name} value={t.name}>{t.name}</option>)}
              </select>
            )}
          </div>
          {/* Betreff */}
          <div style={{marginBottom:12}}>
            <label style={S_LABEL}>Betreff</label>
            <input value={neuForm.titel} onChange={e=>setNeuForm(f=>({...f,titel:e.target.value}))}
              placeholder="z.B. Neuer Trainingsplan"
              className="cc-input"/>
          </div>
          {/* Nachricht */}
          <div style={{marginBottom:18}}>
            <label style={S_LABEL}>Nachricht</label>
            <textarea value={neuForm.inhalt} onChange={e=>setNeuForm(f=>({...f,inhalt:e.target.value}))}
              placeholder="Deine Nachricht…" rows={5}
              className="cc-input" style={{resize:"vertical"}}/>
          </div>
          <button onClick={sendNachricht} disabled={!neuForm.titel.trim()||!neuForm.inhalt.trim()||sending}
            style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:ACCENT,color:ACCENT2,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,opacity:(!neuForm.titel.trim()||!neuForm.inhalt.trim()||sending)?0.5:1,transition:"opacity 0.15s"}}>
            {sending?"Wird gesendet…":"Nachricht senden"}
          </button>
        </div>
      </ModalOrSheet>

      {isMobile?(
        showThread&&selected?renderThread():renderListe()
      ):(
        <div style={{display:"grid",gridTemplateColumns:"320px 1fr",border:"0.5px solid var(--border)",borderRadius:14,overflow:"hidden",minHeight:"calc(100vh - 120px)",background:"var(--surface)"}}>
          <div style={{borderRight:"0.5px solid var(--border)",background:"var(--surface)"}}>{renderListe()}</div>
          <div style={{background:"var(--bg)"}}>{renderThread()}</div>
        </div>
      )}
    </div>
  );
}

export default NachrichtenModul;
