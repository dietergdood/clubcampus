/* ═══════════════════════════════════════════════════════════════
   ClubCampus NachrichtenModul — NachrichtenModul.jsx
   Broadcast & Diskussions-Modul
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2 } from "./constants";
import { TI } from "./icons.jsx";
import { useIsMobile, ModalOrSheet } from "./theme.jsx";

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
      if(gel){const m={};gel.forEach(g=>{m[g.nachricht_id]=true;});setUngelesen(m);}
    }catch(e){console.warn("[CC] loadNachrichten:",e.message);}
    setLoading(false);
  }

  async function loadAntworten(nid){
    if(!sb||!nid) return;
    const{data}=await sb.from("nachrichten_antworten").select("*").eq("nachricht_id",nid).order("erstellt_am");
    if(data) setAntworten(data);
    const{data:df}=await sb.from("nachrichten_dateien").select("*").eq("nachricht_id",nid);
    if(df) setDateien(df);
    await sb.from("nachrichten_gelesen").upsert({nachricht_id:nid,user_id:account?.id||""},{onConflict:"nachricht_id,user_id"});
    setUngelesen(u=>({...u,[nid]:true}));
  }

  async function sendAntwort(){
    if(!antwortText.trim()||!selected||!sb) return;
    setSending(true);
    await sb.from("nachrichten_antworten").insert({nachricht_id:selected.id,autor_id:account?.id||null,autor_name:account?.name||"Unbekannt",inhalt:antwortText.trim()});
    setAntwortText("");
    loadAntworten(selected.id);
    setSending(false);
  }

  async function sendNachricht(){
    if(!neuForm.titel.trim()||!neuForm.inhalt.trim()||!sb) return;
    setSending(true);
    await sb.from("nachrichten").insert({
      titel:neuForm.titel.trim(),inhalt:neuForm.inhalt.trim(),typ:neuForm.typ,
      autor_id:account?.id||null,autor_name:account?.name||"Unbekannt",
      empfaenger_typ:neuForm.empfaenger_typ,
      empfaenger_rolle:neuForm.empfaenger_typ==="rolle"?neuForm.empfaenger_rolle:null,
      empfaenger_gruppe_id:neuForm.empfaenger_typ==="gruppe"?neuForm.empfaenger_gruppe_id:null,
      empfaenger_team:neuForm.empfaenger_typ==="team"?neuForm.empfaenger_team:(teamFilter||null),
    });
    setShowNeu(false);
    setNeuForm({titel:"",inhalt:"",typ:"broadcast",empfaenger_typ:"rolle",empfaenger_rolle:"",empfaenger_gruppe_id:null,empfaenger_team:""});
    loadNachrichten();
    setSending(false);
  }

  useEffect(()=>{loadNachrichten();},[teamFilter]);

  useEffect(()=>{
    if(!sb) return;
    const sub=sb.channel("nachrichten-rt-"+Math.random())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"nachrichten_antworten"},
        p=>{if(selected&&p.new.nachricht_id===selected.id) loadAntworten(selected.id);})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"nachrichten"},
        ()=>loadNachrichten())
      .subscribe();
    return()=>{sb.removeChannel(sub);};
  },[selected?.id]);

  const filtered=nachrichten.filter(n=>{
    if(tab==="gesendet") return n.autor_id===account?.id;
    if(tab==="ungelesen") return !ungelesen[n.id];
    return true;
  }).filter(n=>{
    if(!filter) return true;
    if(filter==="broadcast") return n.typ==="broadcast";
    if(filter==="diskussion") return n.typ==="diskussion";
    return n.empfaenger_rolle===filter||n.empfaenger_team===filter;
  });

  function getGruppe(n){
    const d=new Date(n.erstellt_am);
    const heute=new Date();
    const gestern=new Date(heute);gestern.setDate(heute.getDate()-1);
    const woche=new Date(heute);woche.setDate(heute.getDate()-7);
    let datum=d>woche?(d.toDateString()===gestern.toDateString()?"Gestern":d.toDateString()===heute.toDateString()?"Heute":"Diese Woche"):"Älter";
    return datum+" · "+(n.typ==="broadcast"?"Broadcast":"Diskussion");
  }

  const grouped=[];let lastGrp=null;
  filtered.forEach(n=>{
    const grp=getGruppe(n);
    if(grp!==lastGrp){grouped.push({type:"header",label:grp});lastGrp=grp;}
    grouped.push({type:"item",n});
  });

  function getEmpfLabel(n){
    if(n.empfaenger_typ==="rolle") return ROLLEN_OPTS.find(r=>r.value===n.empfaenger_rolle)?.label||n.empfaenger_rolle||"";
    if(n.empfaenger_typ==="team") return n.empfaenger_team||"";
    if(n.empfaenger_typ==="gruppe"){const g=gruppen.find(g=>g.id===n.empfaenger_gruppe_id);return g?.name||"Gruppe";}
    return "";
  }

  function fmtTime(ts){
    const d=new Date(ts);const h=new Date();
    if(d.toDateString()===h.toDateString()) return d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
    return d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"});
  }

  function initials(name){return (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();}
  const AV_COLORS=["#E1F5EE","#EEEDFE","#E6F1FB","#FAEEDA","#EAF3DE"];
  const AV_TEXT=["#085041","#3C3489","#0C447C","#633806","#27500A"];
  function avC(name){const i=(name||"").charCodeAt(0)%5;return{bg:AV_COLORS[i],txt:AV_TEXT[i]};}

  /* ── Thread ── */
  function renderThread(){
    if(!selected) return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--sub)",fontSize:13}}>
        <div style={{textAlign:"center"}}>
          <TI n="message" size={32} style={{opacity:0.3,marginBottom:8}}/>
          <div>Nachricht auswählen</div>
        </div>
      </div>
    );
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{padding:"12px 18px",borderBottom:"0.5px solid var(--border)",flexShrink:0}}>
          {isMobile&&(
            <button onClick={()=>{setShowThread(false);setSelected(null);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--sub)",padding:"0 0 8px",display:"flex",alignItems:"center",gap:4,fontSize:13,fontFamily:FONT}}>
              <TI n="arrow-left" size={14}/> Zurück
            </button>
          )}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
            <h2 style={{margin:0,fontSize:14,fontWeight:700,color:"var(--text)"}}>{selected.titel}</h2>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:selected.typ==="broadcast"?"#E6F1FB":"#E1F5EE",color:selected.typ==="broadcast"?"#0C447C":"#085041",fontWeight:600,flexShrink:0}}>{selected.typ==="broadcast"?"Broadcast":"Diskussion"}</span>
                  {kannVerwalten&&(
                    <button onClick={async()=>{
                      if(!window.confirm("Nachricht löschen?")) return;
                      await sb.from("nachrichten").delete().eq("id",selected.id);
                      setSelected(null);setAntworten([]);loadNachrichten();
                    }} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",padding:4,display:"flex",alignItems:"center",marginLeft:"auto"}}>
                      <TI n="trash" size={14}/>
                    </button>
                  )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"var(--sub)"}}>{selected.autor_name}</span>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,border:"0.5px solid var(--border)",color:"var(--sub)"}}>{getEmpfLabel(selected)}</span>
            <span style={{fontSize:13,color:"var(--sub)"}}>{fmtTime(selected.erstellt_am)}</span>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
          <p style={{fontSize:14,color:"var(--text)",lineHeight:1.65,margin:"0 0 14px",whiteSpace:"pre-wrap"}}>{selected.inhalt}</p>
          {dateien.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
              {dateien.map(d=>(
                <a key={d.id} href={d.datei_url} target="_blank" rel="noreferrer"
                  style={{padding:"7px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
                  <TI n="paperclip" size={13}/>{d.datei_name}
                </a>
              ))}
            </div>
          )}
          {antworten.length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
                {antworten.length} {antworten.length===1?"Antwort":"Antworten"}
              </div>
              {antworten.map(a=>{
                const av=avC(a.autor_name);
                return(
                  <div key={a.id} style={{background:"var(--surface2)",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:av.txt,flexShrink:0}}>{initials(a.autor_name)}</div>
                      <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{a.autor_name}</span>
                      <span style={{fontSize:11,color:"var(--sub)"}}>{fmtTime(a.erstellt_am)}</span>
                    </div>
                    <p style={{fontSize:13,color:"var(--text)",margin:0,lineHeight:1.5}}>{a.inhalt}</p>
                    {kannVerwalten&&(
                      <button onClick={async()=>{
                        await sb.from("nachrichten_antworten").delete().eq("id",a.id);
                        loadAntworten(selected.id);
                      }} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",padding:"2px 0",fontSize:11,fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}>
                        <TI n="trash" size={11}/>Löschen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{padding:"10px 18px",borderTop:"0.5px solid var(--border)",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <input value={antwortText} onChange={e=>setAntwortText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAntwort();}}}
            placeholder="Antworten..." style={{flex:1,padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT,outline:"none"}}/>
          <button onClick={sendAntwort} disabled={!antwortText.trim()||sending}
            style={{padding:"10px 18px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,cursor:"pointer",fontFamily:FONT,fontSize:13,fontWeight:600,opacity:antwortText.trim()?1:0.5}}>
            <TI n="send" size={14}/>
          </button>
        </div>
      </div>
    );
  }

  /* ── Liste ── */
  function renderListe(){
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{padding:"12px 14px",borderBottom:"0.5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>Nachrichten</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {nachrichten.filter(n=>!ungelesen[n.id]).length>0&&(
              <span style={{background:"#E24B4A",color:"#fff",fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:10}}>
                {nachrichten.filter(n=>!ungelesen[n.id]).length}
              </span>
            )}
            {kannSenden&&(
              <button onClick={()=>setShowNeu(true)}
                style={{padding:"7px 14px",fontSize:13,background:BTN,color:BTN_TXT,border:"none",borderRadius:8,cursor:"pointer",fontFamily:FONT,fontWeight:600}}>
                + Neu
              </button>
            )}
          </div>
        </div>
        <div style={{display:"flex",padding:"0 14px",borderBottom:"0.5px solid var(--border)",overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
          {["alle","gesendet","ungelesen"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:"8px 12px",fontSize:13,border:"none",background:"none",cursor:"pointer",color:tab===t?"var(--text)":"var(--sub)",borderBottom:tab===t?"2px solid var(--text)":"2px solid transparent",fontFamily:FONT,fontWeight:tab===t?600:400,whiteSpace:"nowrap"}}>
              {t==="alle"?"Alle":t==="gesendet"?"Gesendet":"Ungelesen"}
            </button>
          ))}
        </div>
        <div style={{padding:"8px 14px",borderBottom:"0.5px solid var(--border)",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
          {[null,"broadcast","diskussion","trainer","eltern"].map(f=>(
            <button key={f||"alle"} onClick={()=>setFilter(filter===f?null:f)}
              style={{padding:"5px 12px",fontSize:11,borderRadius:20,border:`0.5px solid ${filter===f?"transparent":"var(--border)"}`,background:filter===f?ACCENT:"transparent",color:filter===f?ACCENT2:"var(--sub)",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>
              {f===null?"Alle":f==="broadcast"?"Broadcast":f==="diskussion"?"Diskussion":f==="trainer"?"Trainer":"Eltern"}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {loading?(
            <div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:13}}>Wird geladen…</div>
          ):grouped.length===0?(
            <div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:13}}>Keine Nachrichten</div>
          ):grouped.map((item,i)=>{
            if(item.type==="header") return(
              <div key={i} style={{padding:"5px 14px",fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                {item.label}
              </div>
            );
            const n=item.n;
            const isSelected=selected?.id===n.id;
            const isUngelesen=!ungelesen[n.id];
            return(
              <div key={n.id} onClick={()=>{setSelected(n);loadAntworten(n.id);if(isMobile)setShowThread(true);}}
                style={{padding:"10px 14px",borderBottom:"0.5px solid var(--border)",cursor:"pointer",background:isSelected?"var(--surface2)":"transparent",borderLeft:isSelected?"2px solid "+ACCENT:"2px solid transparent",transition:"background 0.1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                    {isUngelesen&&<div style={{width:7,height:7,borderRadius:"50%",background:ACCENT,flexShrink:0}}/>}
                    <span style={{fontSize:13,fontWeight:isUngelesen?700:500,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.titel}</span>
                  </div>
                  <span style={{fontSize:11,color:"var(--sub)",flexShrink:0,marginLeft:6}}>{fmtTime(n.erstellt_am)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,border:"0.5px solid var(--border)",color:"var(--sub)"}}>{getEmpfLabel(n)}</span>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:n.typ==="broadcast"?"#E6F1FB":"#E1F5EE",color:n.typ==="broadcast"?"#0C447C":"#085041"}}>{n.typ==="broadcast"?"Broadcast":"Diskussion"}</span>
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
      <ModalOrSheet open={showNeu} onClose={()=>setShowNeu(false)} maxWidth={520}>
        <div style={{padding:"20px 20px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"var(--text)"}}>Neue Nachricht</h2>
            <button onClick={()=>setShowNeu(false)} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
          </div>
        </div>
        <div style={{padding:"0 20px 20px",overflowY:"auto"}}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:6}}>Typ</label>
            <div style={{display:"flex",gap:8}}>
              {["broadcast","diskussion"].map(t=>(
                <button key={t} onClick={()=>setNeuForm(f=>({...f,typ:t}))}
                  style={{flex:1,padding:"8px 14px",borderRadius:8,border:`1.5px solid ${neuForm.typ===t?BTN:"var(--border)"}`,background:neuForm.typ===t?BTN+"15":"transparent",color:"var(--text)",cursor:"pointer",fontSize:13,fontFamily:FONT,fontWeight:neuForm.typ===t?600:400}}>
                  {t==="broadcast"?"📢 Broadcast":"💬 Diskussion"}
                </button>
              ))}
            </div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:5}}>{neuForm.typ==="broadcast"?"Nur Absender sieht Antworten der anderen":"Alle sehen alle Antworten"}</div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:6}}>Empfänger</label>
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              {["rolle","gruppe","team"].map(t=>(
                <button key={t} onClick={()=>setNeuForm(f=>({...f,empfaenger_typ:t}))}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${neuForm.empfaenger_typ===t?BTN:"var(--border)"}`,background:neuForm.empfaenger_typ===t?BTN+"15":"transparent",color:"var(--text)",cursor:"pointer",fontSize:13,fontFamily:FONT}}>
                  {t==="rolle"?"Nach Rolle":t==="gruppe"?"Nach Gruppe":"Team"}
                </button>
              ))}
            </div>
            {neuForm.empfaenger_typ==="rolle"&&(
              <select value={neuForm.empfaenger_rolle} onChange={e=>setNeuForm(f=>({...f,empfaenger_rolle:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT}}>
                <option value="">Empfänger wählen...</option>
                {ROLLEN_OPTS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            {neuForm.empfaenger_typ==="gruppe"&&(
              <select value={neuForm.empfaenger_gruppe_id||""} onChange={e=>setNeuForm(f=>({...f,empfaenger_gruppe_id:e.target.value?parseInt(e.target.value):null}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT}}>
                <option value="">Gruppe wählen...</option>
                {gruppen.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            {neuForm.empfaenger_typ==="team"&&(
              <select value={neuForm.empfaenger_team} onChange={e=>setNeuForm(f=>({...f,empfaenger_team:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT}}>
                <option value="">Team wählen...</option>
                {dbTeams.map(t=><option key={t.id||t.name} value={t.name}>{t.name}</option>)}
              </select>
            )}
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:6}}>Betreff</label>
            <input value={neuForm.titel} onChange={e=>setNeuForm(f=>({...f,titel:e.target.value}))}
              placeholder="z.B. Neuer Trainingsplan" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT,boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:6}}>Nachricht</label>
            <textarea value={neuForm.inhalt} onChange={e=>setNeuForm(f=>({...f,inhalt:e.target.value}))}
              placeholder="Deine Nachricht..." rows={5}
              style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT,boxSizing:"border-box",outline:"none",resize:"vertical"}}/>
          </div>
          <button onClick={sendNachricht} disabled={!neuForm.titel.trim()||!neuForm.inhalt.trim()||sending}
            style={{width:"100%",padding:"12px 20px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT,opacity:neuForm.titel.trim()&&neuForm.inhalt.trim()?1:0.5}}>
            {sending?"Wird gesendet…":"Senden"}
          </button>
        </div>
      </ModalOrSheet>
      {isMobile?(
        showThread&&selected?renderThread():renderListe()
      ):(
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",border:"0.5px solid var(--border)",borderRadius:14,overflow:"hidden",minHeight:600}}>
          <div style={{borderRight:"0.5px solid var(--border)"}}>{renderListe()}</div>
          <div>{renderThread()}</div>
        </div>
      )}
    </div>
  );
}

export default NachrichtenModul;
