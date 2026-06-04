/* ═══════════════════════════════════════════════════════════════
   ClubCampus PlatzhalterModul — PlatzhalterModul.jsx
   Placeholder-Ansichten (werden durch echte Module ersetzt)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, ACCENT20, GN, R, RL, BL, AM, BK, GR, GB } from "./constants";
import { TI } from "./icons.jsx";
import { useIsMobile, useTheme, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, Av } from "./theme.jsx";
import { BUSES, MATERIAL, LOCKERS, MEDIA, WIKI, NEWS, MEMBERS } from "./demoData.js";

function BusesView({role,kannSchreiben,kannVerwalten}){
  const [showForm,setShowForm]=useState(false);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Vereinsbusse</h1>
        <Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(!showForm)}>+ Reservation</Btn>
      </div>
      <InfoBox text="First-come-First-served · Keine Freigabe nötig · Alle Reservationen sichtbar · Nur eigene bearbeitbar" color={BL}/>
      {showForm&&(
        <Card style={{marginTop:14,background:"var(--surface)",border:`0.5px solid ${AM}`}}>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Neue Reservation</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Bus</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13}}><option>Bus A (9-Plätzer)</option><option>Bus B (15-Plätzer)</option></select></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Datum</label><br/><input type="date" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13}}/></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Zeit</label><br/><input type="text" placeholder="09:00-14:00" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13}}/></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:13,color:"var(--sub)"}}>Zweck</label><br/><input type="text" placeholder="z.B. Auswärtsspiel vs. FC Küsnacht" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13,boxSizing:"border-box"}}/></div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(false)}>Reservieren</Btn><Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn></div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginTop:14}}>
        {BUSES.map((bus,i)=>(
          <Card key={i}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:12,display:"flex",justifyContent:"space-between"}}>{bus.name}<Chip text={`${bus.reservations.length} Res.`} color={BL}/></div>
            {bus.reservations.map((r,j)=>(
              <div key={j} style={{padding:"9px 0",borderBottom:j<bus.reservations.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:600,fontSize:13}}>{r.date} · {r.time+" Uhr"}</span>
                  <Chip text="Reserviert" color={BL} bg="#EFF6FF"/>
                </div>
                <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>{r.purpose}</div>
                <div style={{fontSize:13,color:"var(--sub)"}}>von {r.by} · {r.team}</div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MaterialView(){
  const [showForm,setShowForm]=useState(false);
  const TC={Bestellung:BL,Defekt:R,Tenüs:GN,Mangel:AM};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Material</h1>
        <Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(!showForm)}>+ Anfrage stellen</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,background:"var(--surface)",border:`0.5px solid ${BL}`}}>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Neue Materialanfrage</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Art</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13}}>{["Bestellung","Ersatzmaterial","Tenüs","Mangel","Defekt","Verlust","Neue Anforderung"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Team</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13}}><option>Cc-Junioren</option><option>D-Junioren</option></select></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:13,color:"var(--sub)"}}>Beschreibung</label><br/><input type="text" placeholder="z.B. Neue Bälle Grösse 4" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:7,fontSize:13,boxSizing:"border-box"}}/></div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(false)}>Einreichen</Btn><Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn></div>
        </Card>
      )}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {["Team","Art","Material","von","Datum","Status"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATERIAL.map((m,i)=>(
              <tr key={m.id} style={{borderTop:"0.5px solid var(--border)"}}>
                <td style={{padding:"9px 13px"}}><Chip text={m.team} color={R}/></td>
                <td style={{padding:"9px 13px"}}><Chip text={m.type} color={TC[m.type]||"#888"} bg={(TC[m.type]||"#888")+"18"}/></td>
                <td style={{padding:"9px 13px",fontWeight:600}}>{m.item}</td>
                <td style={{padding:"9px 13px",color:"var(--sub)"}}>{m.by}</td>
                <td style={{padding:"9px 13px",color:"var(--sub)"}}>{m.date}</td>
                <td style={{padding:"9px 13px"}}><Chip text={m.status} color={m.status==="Erledigt"?GN:m.status==="In Bearbeitung"?BL:AM} bg={m.status==="Erledigt"?"#ECFDF5":m.status==="In Bearbeitung"?"#EFF6FF":"#FFFBEB"}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   TEAMS VERWALTUNG (Admin)
══════════════════════════════════════════ */

function LockersView(){
  const START=7,END=22,H=24;
  const fmt=v=>v%1===0?`${v}:00`:Math.floor(v)+":30";
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Garderobenplan</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Gantt-Ansicht · 07:00-22:00 Uhr</p>
      <Card style={{padding:0,overflowX:"auto"}}>
        <div style={{minWidth:600}}>
          <div style={{display:"grid",gridTemplateColumns:"110px 1fr",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
            <div style={{padding:"9px 12px",fontWeight:700,fontSize:13,color:"var(--sub)"}}>Garderobe</div>
            <div style={{padding:"9px 12px",fontSize:13,color:"var(--sub)",borderLeft:`0.5px solid ${GB}`,position:"relative",height:28}}>
              {[7,9,11,13,15,17,19,21].map((h,i)=>(
                <span key={i} style={{position:"absolute",left:`${(h-START)/(END-START)*100}%`,transform:"translateX(-50%)"}}>{h}:00</span>
              ))}
            </div>
          </div>
          {LOCKERS.map((lr,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"110px 1fr",borderBottom:i<LOCKERS.length-1?`0.5px solid ${GB}`:"none",minHeight:H*2+12}}>
              <div style={{padding:"8px 12px",fontSize:13,fontWeight:600,borderRight:`0.5px solid ${GB}`,display:"flex",alignItems:"center",background:"var(--surface2)"}}>{lr.name}</div>
              <div style={{position:"relative",height:H*2+12}}>
                {lr.assignments.map((a,j)=>{
                  const left=(a.start-START)/(END-START)*100, width=(a.end-a.start)/(END-START)*100;
                  return(
                    <div key={j} title={`${a.team} · ${fmt(a.start)}-${fmt(a.end)}`} style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:j*(H+4)+4,height:H,background:a.color,borderRadius:5,padding:"3px 7px",overflow:"hidden",cursor:"help"}}>
                      <div style={{color:"#fff",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{a.team} ({a.type})</div>
                      <div style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>{fmt(a.start)}-{fmt(a.end)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MediaView(){
  const SC={Eingereicht:AM,"In Prüfung":BL,Freigegeben:GN,Veröffentlicht:"#7C3AED",Archiviert:"#888"};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Medien &amp; Berichte</h1>
        <Btn variant="primary" color="#F3F4F6">+ Beitrag einreichen</Btn>
      </div>
      {MEDIA.map((m,i)=>(
        <Card key={i} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                <Chip text={m.cat} color={R}/>
                {m.area.map((a,j)=><Chip key={j} text={a} color={BL} bg="#EFF6FF"/>)}
              </div>
              <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700}}>{m.title}</h3>
              <div style={{fontSize:13,color:"var(--sub)"}}>{m.team} · {m.date} · {m.author}</div>
            </div>
            <Chip text={m.status} color={SC[m.status]||"#888"} bg={(SC[m.status]||"#888")+"18"}/>
          </div>
        </Card>
      ))}
    </div>
  );
}

function WikiView(){
  const CC={Trainer:R,Vereinsbus:BL,Spieltag:GN,"J+S":AM,Helfereinsatz:"#7C3AED",Kommunikation:"#888"};
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Wiki</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {WIKI.map((a,i)=>(
          <Card key={i} style={{cursor:"pointer"}}>
            <Chip text={a.cat} color={CC[a.cat]||"#888"} bg={(CC[a.cat]||"#888")+"18"}/>
            <h3 style={{margin:"6px 0 3px",fontSize:14,fontWeight:700}}>{a.title}</h3>
            <div style={{fontSize:13,color:"var(--sub)"}}>Aktualisiert {a.updated}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DocsView(){
  const docs=[
    {name:"Trainerhandbuch 2026",       type:"PDF", size:"2.4 MB",updated:"01.01.2026",area:"Trainer"},
    {name:"Spielordnung SFV",           type:"PDF", size:"1.1 MB",updated:"15.03.2026",area:"Regeln"},
    {name:"Anmeldeformular Turniere",   type:"DOCX",size:"0.3 MB",updated:"10.04.2026",area:"Formulare"},
    {name:"J+S Kursunterlagen",         type:"PDF", size:"5.2 MB",updated:"01.09.2024",area:"J+S"},
    {name:"Nutzungsregeln Vereinsbusse",type:"PDF", size:"0.2 MB",updated:"15.03.2026",area:"Vereinsbus"},
  ];
  const TC={PDF:R,DOCX:BL,XLSX:GN};
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Dokumente</h1>
      <Card style={{padding:0}}>
        {docs.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<docs.length-1?`0.5px solid ${GB}`:"none"}}>
            <div style={{width:34,height:34,borderRadius:8,background:(TC[d.type]||"#888")+"20",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:13,fontWeight:800,color:TC[d.type]||"#888"}}>{d.type}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{d.size} · {d.updated}</div>
            </div>
            <Chip text={d.area} color="#666" bg="#f5f5f5"/>
            <Btn>↓ Download</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

function NewsView({role,meineTeams,kannVerwalten}){
  const canCreate=kannVerwalten?kannVerwalten("media"):(["trainer","administrator","administration","funktionaer"].includes(role));

  /* Determine which targets are visible for this role/team */
  const myTeams=meineTeams||["Cc-Junioren"];
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isTrainer=role==="trainer";

  const JUNIOREN_TEAMS=["Cc-Junioren","A-Junioren","Ba-Junioren","Bb-Junioren","Ca-Junioren","Da-Junioren","Db-Junioren","C-Juniorinnen","F-Juniorinnen","E-Juniorinnen","D-Juniorinnen"];
  const hasJunioren=myTeams.some(t=>JUNIOREN_TEAMS.includes(t));

  const isVisible=(n)=>{
    if(isAdmin) return true;
    if(n.target==="Alle") return true;
    if(myTeams.includes(n.target)) return true;
    if(n.target==="Junioren"&&hasJunioren) return true;
    if(isTrainer) return myTeams.some(t=>n.target===t)||n.target==="Junioren"&&hasJunioren;
    return false;
  };

  const visible=NEWS.filter(isVisible);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>News &amp; Kommunikation</h1>
        {canCreate&&<Btn variant="primary" color="#F3F4F6">+ Beitrag</Btn>}
      </div>
      {visible.map((n,i)=>(
        <Card key={i} style={{marginBottom:12}}>
          <div style={{display:"flex",gap:7,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <Chip text={n.target} color={R}/>
            <Chip text={n.channel} color={BL} bg="#EFF6FF"/>
            <span style={{fontSize:13,color:"var(--sub)"}}>{n.date} · {n.author}</span>
          </div>
          <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:700}}>{n.title}</h3>
          <p style={{margin:0,fontSize:13,color:"var(--sub)",lineHeight:1.65}}>{n.content}</p>
        </Card>
      ))}
    </div>
  );
}

function AttendanceCentral(){
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Zentrale Anwesenheitsstatistik</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Ø Alle Teams" value="75%" color={GN}/>
        <Stat label="Ø Trainings" value="72%" color={BL}/>
        <Stat label="Ø Spiele"    value="90%" color={R}/>
        <Stat label="Teams total" value="8"   color={BK}/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {["Team","Ø Total","Ø Training","Ø Spiele","Spieler"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:i>0?"center":"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {t:"Cc-Junioren",tot:77,tr:74,sp:92,n:18},
              {t:"D-Junioren",tot:82,tr:80,sp:90,n:14},
              {t:"A-Junioren",tot:71,tr:68,sp:88,n:16},
              {t:"A-Junioren",tot:68,tr:65,sp:85,n:15},
              {t:"Aktive 1",  tot:75,tr:72,sp:90,n:22},
            ].map((r,i)=>(
              <tr key={i} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{r.t}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:700,color:r.tot>=75?GN:r.tot>=65?AM:R}}>{r.tot}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"var(--sub)"}}>{r.tr}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"var(--sub)"}}>{r.sp}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"var(--sub)"}}>{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* -- TRAININGSPLÄTZE VERWALTUNG -- */

function ProfileModal({open,onClose,account,role,sb,onNameUpdated,onLogout}){
  const rc=getRole(role).color;
  const userName=account?.name||USER_ACCOUNTS[role]?.name||getRole(role)?.label||"Benutzer";
  const userEmail=account?.email||"demo@fcherrliberg.ch";
  const userId=account?.id||null;
  const initials=userName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

  const [tab,setTab]=useState("konto");
  // Konto-Bearbeitung
  const [editName,setEditName]=useState(false);
  const [nameDraft,setNameDraft]=useState(userName);
  const [nameStatus,setNameStatus]=useState(null); // null | "loading" | "ok" | "error"
  const [nameMsg,setNameMsg]=useState("");
  // Passwort
  const [pwForm,setPwForm]=useState({current:"",next:"",repeat:""});
  const [pwStatus,setPwStatus]=useState(null);
  const [pwMsg,setPwMsg]=useState("");

  if(!open) return null;

  /* ── Name in DB speichern ─────────────────────── */
  async function handleSaveName(){
    const n=nameDraft.trim();
    if(!n){setNameStatus("error");setNameMsg("Name darf nicht leer sein.");return;}
    setNameStatus("loading");
    try{
      if(sb && userId){
        const {error}=await sb.from("benutzer").update({name:n}).eq("id",userId);
        if(error) throw error;
        /* Auch in Supabase Auth Metadaten */
        await sb.auth.updateUser({data:{full_name:n}});
      }
      setNameStatus("ok");setNameMsg("Name gespeichert.");
      setEditName(false);
      if(onNameUpdated) onNameUpdated(n);
      setTimeout(()=>setNameStatus(null),2500);
    }catch(err){
      setNameStatus("error");setNameMsg(err.message||"Fehler beim Speichern.");
    }
  }

  /* ── Passwort ändern ──────────────────────────── */
  async function handlePwChange(e){
    e.preventDefault();
    if(pwForm.next.length<8){setPwStatus("error");setPwMsg("Mindestens 8 Zeichen.");return;}
    if(pwForm.next!==pwForm.repeat){setPwStatus("error");setPwMsg("Passwörter stimmen nicht überein.");return;}
    setPwStatus("loading");
    try{
      if(sb){
        const{error}=await sb.auth.updateUser({password:pwForm.next});
        if(error) throw error;
      }
      setPwStatus("ok");setPwMsg("Passwort erfolgreich geändert.");
      setPwForm({current:"",next:"",repeat:""});
    }catch(err){
      setPwStatus("error");setPwMsg(err.message||"Fehler beim Ändern.");
    }
  }

  const inputStyle={width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:9,
    fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",
    boxSizing:"border-box",outline:"none"};

  const StatusBox=({status,msg})=>status==="ok"?(
    <div style={{padding:"10px 14px",background:"var(--surface)",border:"1px solid "+GN,borderRadius:9,fontSize:13,color:GN,fontWeight:600,marginTop:4}}>{msg}</div>
  ):status==="error"?(
    <div style={{padding:"10px 14px",background:RL,border:"1px solid "+R,borderRadius:9,fontSize:13,color:R,fontWeight:600,marginTop:4}}>{msg}</div>
  ):null;

  return(
    <ModalOrSheet open={open} onClose={onClose} maxWidth={500}>
      {/* Header */}
      <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:ACCENT,display:"flex",alignItems:"center",
            justifyContent:"center",color:"var(--text)",fontWeight:800,fontSize:17,flexShrink:0}}>
            {initials}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"var(--text)",letterSpacing:-0.2}}>{userName}</div>
            <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{userEmail}</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",
          color:"var(--sub)",lineHeight:1,padding:4,borderRadius:6}}>×</button>
      </div>

      {/* Tabs */}
      <div style={{padding:"14px 20px 0"}}>
        <Tabs tabs={[{key:"konto",label:"Konto"},{key:"passwort",label:"Passwort"}]} active={tab} setActive={setTab}/>
      </div>

      {/* Content */}
      <div style={{overflowY:"auto",flex:1,padding:"4px 20px 20px"}}>
        {tab==="konto"&&(
          <div style={{display:"flex",flexDirection:"column",gap:0}}>

            {/* Name – editierbar */}
            <div style={{padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:editName?8:0}}>
                <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>Name</span>
                {!editName&&(
                  <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{userName}</span>
                )}
              </div>
              {editName&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input value={nameDraft} onChange={e=>setNameDraft(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")handleSaveName();if(e.key==="Escape")setEditName(false);}}
                    style={{...inputStyle}} autoFocus placeholder="Vor- und Nachname"/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={handleSaveName} disabled={nameStatus==="loading"}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN}
                      style={{flex:1,padding:"9px",borderRadius:9,background:BTN,color:BTN_TXT,border:"none",
                        fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT,
                        opacity:nameStatus==="loading"?0.6:1}}>
                      {nameStatus==="loading"?"Speichern…":"Speichern"}
                    </button>
                    <button onClick={()=>{setEditName(false);setNameStatus(null);}}
                      style={{padding:"9px 16px",borderRadius:9,background:"var(--surface2)",
                        color:"var(--sub)",border:"1px solid var(--border)",fontSize:13,cursor:"pointer",fontFamily:FONT}}>
                      Abbrechen
                    </button>
                  </div>
                  <StatusBox status={nameStatus} msg={nameMsg}/>
                </div>
              )}
            </div>

            {/* E-Mail – read only */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>E-Mail</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--text)",textAlign:"right"}}>{userEmail}</span>
            </div>

            {/* Rolle */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>Rolle</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{getRole(role).label}</span>
            </div>

            {/* Mitglied */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0"}}>
              <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>Verein</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{getVereinsnameStatic()}</span>
            </div>

            {/* Rollen-Badge */}
            <div style={{marginTop:8,padding:14,background:getRole(role).bg||"var(--surface2)",borderRadius:10,border:`1px solid ${rc}30`}}>
              <div style={{fontSize:11,color:"var(--sub)",marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Portal-Zugriffsrolle</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:rc,flexShrink:0}}/>
                <span style={{fontSize:14,color:rc,fontWeight:700}}>{getRole(role).label}</span>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",lineHeight:1.5}}>{getRole(role).desc||""}</div>
            </div>

            {nameStatus==="ok"&&!editName&&<StatusBox status="ok" msg={nameMsg}/>}

            {/* Erscheinungsbild / Dark Mode */}
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--border)"}}>
              <div style={{fontSize:11,color:"var(--sub)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Erscheinungsbild</div>
              <DarkModeRow/>
            </div>

            {/* Abmelden */}
            {onLogout&&(
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--border)"}}>
                <button onClick={onLogout} style={{
                  width:"100%",padding:"11px",borderRadius:10,
                  background:"transparent",color:R,border:"1px solid "+R,
                  fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  transition:"background 0.15s"
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=RL}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <TI n="logout" size={15}/> Abmelden
                </button>
              </div>
            )}
          </div>
        )}

        {tab==="passwort"&&(
          <form onSubmit={handlePwChange} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>Aktuelles Passwort</div>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
                style={inputStyle} autoComplete="current-password"/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>Neues Passwort</div>
              <input type="password" placeholder="Mindestens 8 Zeichen" value={pwForm.next}
                onChange={e=>setPwForm(p=>({...p,next:e.target.value}))}
                style={inputStyle} autoComplete="new-password"/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>Passwort bestätigen</div>
              <input type="password" placeholder="Wiederholen" value={pwForm.repeat}
                onChange={e=>setPwForm(p=>({...p,repeat:e.target.value}))}
                style={inputStyle} autoComplete="new-password"/>
            </div>
            <StatusBox status={pwStatus} msg={pwMsg}/>
            <button type="submit" disabled={pwStatus==="loading"}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN}
              style={{padding:"11px",borderRadius:10,background:BTN,color:BTN_TXT,border:"none",
                fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,
                opacity:pwStatus==="loading"?0.6:1,transition:"opacity 0.2s"}}>
              {pwStatus==="loading"?"Wird gespeichert…":"Passwort ändern"}
            </button>
            {!sb&&<div style={{fontSize:12,color:"var(--sub)",textAlign:"center",marginTop:4}}>Demo-Modus: Änderungen werden nicht gespeichert.</div>}
          </form>
        )}
      </div>
    </ModalOrSheet>
  );
}

/* ── Feld-Sichtbarkeit gemäss Rolle (revDSG) ──────────────────
   Bestimmt welche Felder in der Mitgliederliste sichtbar sind.
──────────────────────────────────────────────────────────── */

function ProfileView({role,myRosterId,account}){
  const isEltern=role==="eltern";
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const name=isEltern?(account?.name||"Anna Meier"):(player?`${player.firstName} ${player.lastName}`:"Luca Meier");
  const kinder=account?.kinder||[];
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>{isEltern?"Profil / Daten prüfen":"Mein Profil"}</h1>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card>
          <STitle>Persönliche Daten</STitle>
          {[
            {l:"Name",v:name},
            {l:"Geburtsdatum",v:player?.dob||"-"},
            {l:"Adresse",v:player?.address||"-"},
            {l:"E-Mail",v:player?.email||"-"},
            {l:"Telefon",v:player?.tel||"-"},
          ].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<4?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13,color:"var(--sub)"}}>{x.l}</span>
              <span style={{fontSize:13,fontWeight:500}}>{x.v}</span>
            </div>
          ))}
          <div style={{marginTop:12}}><Btn variant="primary" color="#F3F4F6">Daten aktualisieren</Btn></div>
        </Card>
        {isEltern&&kinder.map((kind,ki)=>{
          const kindPlayer=ROSTER.find(p=>p.name===kind.name||p.id===kind.rosterId);
          const kp=kindPlayer||{};
          const rows=[
            {l:"Name",              v:`${kp.firstName||""} ${kp.lastName||""}`.trim()||kind.name,     ok:!!(kp.firstName&&kp.lastName)},
            {l:"Team",              v:kind.team,                                                        ok:true},
            {l:"Geburtsdatum",      v:kp.dob||"-",                                                     ok:!!kp.dob},
            {l:"Nationalität",      v:kp.nat||"-",                                                     ok:!!kp.nat},
            {l:"AHV-Nummer",        v:kp.ahv||"-",                                                     ok:!!kp.ahv},
            {l:"Spielerpass",       v:kp.pass||"-",                                                    ok:!!kp.pass},
            {l:"Strasse",           v:kp.street||"-",                                                  ok:!!kp.street},
            {l:"PLZ / Ort",         v:kp.plz&&kp.city?`${kp.plz} ${kp.city}`:"-",                   ok:!!(kp.plz&&kp.city)},
            {l:"E-Mail",            v:kp.email||"-",                                                   ok:!!kp.email},
            {l:"Telefon",           v:kp.tel||"-",                                                     ok:!!kp.tel},
            {l:"Elternteil 1",      v:kp.p1First?`${kp.p1First} ${kp.p1Last}`:"-",                  ok:!!(kp.p1First&&kp.p1Last)},
            {l:"E-Mail Elternteil 1",v:kp.p1Email||"-",                                               ok:!!kp.p1Email},
            {l:"Tel. Elternteil 1", v:kp.p1Tel||"-",                                                  ok:!!kp.p1Tel},
            {l:"Elternteil 2",      v:kp.p2First?`${kp.p2First} ${kp.p2Last}`:"-",                  ok:!!(kp.p2First&&kp.p2Last)},
            {l:"E-Mail Elternteil 2",v:kp.p2Email||"-",                                               ok:!!kp.p2Email},
            {l:"Tel. Elternteil 2", v:kp.p2Tel||"-",                                                  ok:!!kp.p2Tel},
          ];
          const allOk=rows.every(r=>r.ok);
          return(
            <Card key={ki}>
              <STitle action={<Chip text={allOk?"✓ Vollständig":"Prüfung fällig"} color={allOk?GN:AM} bg={allOk?"#ECFDF5":"#FFFBEB"}/>}>
                {kind.name.split(" ")[0]} - Daten prüfen
              </STitle>
              {!allOk&&<InfoBox text="Halbjährliche Datenprüfung fällig. Bitte alle Felder bestätigen oder korrigieren." color={AM}/>}
              <div style={{marginTop:8}}>
                {rows.map((x,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<rows.length-1?`0.5px solid ${GB}`:"none"}}>
                    <div style={{minWidth:140}}>
                      <div style={{fontSize:13,color:"var(--sub)"}}>{x.l}</div>
                      <div style={{fontSize:13,fontWeight:500,color:"var(--text)",marginTop:1,wordBreak:"break-all"}}>{x.v}</div>
                    </div>
                    <Chip text={x.ok?"✓ OK":"Prüfen"} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14}}><Btn variant="primary" color={GN}>Daten bestätigen</Btn></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* -- Geteilte Views -- */

function DarkModeRow(){
  const {dark,toggle}=useTheme();
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{dark?"Dunkel":"Hell"}</div>
        <div style={{fontSize:12,color:"var(--sub)",marginTop:1}}>Farbschema des Portals</div>
      </div>
      <button onClick={toggle} style={{
        position:"relative",width:48,height:26,borderRadius:13,border:"none",
        background:dark?ACCENT:"var(--border)",cursor:"pointer",
        transition:"background 0.25s",flexShrink:0,padding:0,
        WebkitTapHighlightColor:"transparent"
      }}>
        <div style={{
          position:"absolute",top:3,left:dark?22:3,width:20,height:20,
          borderRadius:"50%",background:dark?"#111":"#fff",
          boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
          transition:"left 0.2s cubic-bezier(0.34,1.2,0.64,1)"
        }}/>
      </button>
    </div>
  );
}

export { BusesView, MaterialView, LockersView, MediaView, WikiView, DocsView, NewsView, AttendanceCentral, ProfileModal, ProfileView, DarkModeRow };
