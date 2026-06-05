/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, Row, SectionLabel, Stat, Tabs, useIsMobile , avColor} from "./theme.jsx";
import { MEMBERS } from "./demoData.js";
import { getRole } from "./NavigationModul.jsx";

const ROLES = {
  administrator: {
    label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings",
    desc:"Vollzugriff: alle Module, Systemeinstellungen, Benutzerverwaltung",
    level:7
  },
  vorstand: {
    label:"Vorstand", color:"var(--text)", bg:"#F5F5F5", icon:"scale",
    desc:"Strategische Übersicht: alle Teams, Mitglieder lesen, Auswertungen — kein System, kein AHV",
    level:6
  },
  administration: {
    label:"Administration", color:"var(--text)", bg:"#F5F5F5", icon:"briefcase",
    desc:"Vereinsbüro: Stammdaten, Mitglieder, alle Teams, Exporte — kein System",
    level:5
  },
  funktionaer: {
    label:"Funktionär", color:"var(--text)", bg:"#F5F5F5", icon:"heart-handshake",
    desc:"Module + Teams gemäss zugewiesener Gruppe/Funktion",
    level:4
  },
  trainer: {
    label:"Trainer", color:"var(--text)", bg:"#F5F5F5", icon:"ball-football",
    desc:"Eigene Teams: Kader, Trainings, Anwesenheiten",
    level:3
  },
  spieler: {
    label:"Spieler", color:"var(--text)", bg:"#F5F5F5", icon:"target",
    desc:"Eigenes Team lesen: Spielplan, Termine, Helfereinsätze",
    level:2
  },
  eltern: {
    label:"Eltern", color:"var(--text)", bg:"#F5F5F5", icon:"user",
    desc:"Nur eigene Kinder: Termine, Anwesenheit, Abstimmungen",
    level:1
  },
};


/* ── Hilfsfunktionen ── */
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* -- DATA -- */

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

function getFieldVisibility(role){
  const lvl = ROLES[role]?.level||0;
  return {
    showAhv:       lvl>=5 && role==="administration" || role==="administrator",
    showGebdat:    lvl>=3,   // ab trainer
    showAdresse:   lvl>=5,   // ab administration
    showTelefon:   lvl>=3,   // ab trainer
    showEmail:     lvl>=2,   // ab spieler (eigene)
    showPass:      lvl>=3,   // ab trainer
    showFairgateId:lvl>=5,   // ab administration
    showNotizen:   lvl>=5,   // ab administration
  };
}

function MitgliedDetail({person,role,onClose,nr,onUpdateNr}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const can=(field)=>vis.includes(field);
  const canEdit=["trainer","administrator","administration"].includes(role);
  const [editingNr,setEditingNr]=useState(false);
  const [nrVal,setNrVal]=useState(nr||"");

  const Row=({label,value,mono,blue})=>(
    <div className="cc-list-row" style={{alignItems:"flex-start",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span className="cc-detail-label" style={{flexShrink:0,minWidth:120}}>{label}</span>
      <span style={{fontSize:14,fontWeight:600,color:blue?BL:mono?"#666":BK,textAlign:"right",wordBreak:"break-word",fontFamily:mono?"monospace":"inherit"}}>{value||"-"}</span>
    </div>
  );

  const NrRow=()=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span className="cc-detail-label" style={{flexShrink:0,minWidth:120}}>{"Rückennummer"}</span>
      {canEdit&&editingNr?(
        <input autoFocus type="number" min="1" max="99" value={nrVal}
          onChange={e=>setNrVal(e.target.value)}
          onBlur={()=>{setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}
          onKeyDown={e=>{if(e.key==="Enter"){setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}}
          style={{width:60,padding:"3px 7px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:14,fontWeight:700,textAlign:"right",color:R,outline:"none"}}
        />
      ):(
        <div onClick={canEdit?()=>setEditingNr(true):undefined}
          style={{display:"flex",alignItems:"center",gap:8,cursor:canEdit?"pointer":"default"}}>
          <span style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{nrVal||"-"}</span>
          {canEdit&&<span style={{fontSize:14,color:"var(--sub)"}}><TI n="edit"/></span>}
        </div>
      )}
    </div>
  );

  return(
    <div onClick={onClose} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"var(--surface)",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:R,borderRadius:"16px 16px 0 0",padding:"20px 22px",display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:1}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>
            {(person.firstName[0]||"")+(person.lastName[0]||"")}
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:18,lineHeight:1.2}}>{person.firstName} {person.lastName}</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:14,marginTop:4,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <Chip text={person.pos||"-"} color="#fff" bg="rgba(255,255,255,0.25)"/>
              {(person.teams||["Cc-Junioren"]).map((t,i)=>(
                <span key={i} style={{color:"rgba(255,255,255,0.85)",fontSize:14}}>{i>0&&<span style={{opacity:0.5,margin:"0 3px"}}>·</span>}{t}</span>
              ))}
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:14}}>Saison 2024/25</span>
            </div>
          </div>
          <Btn onClick={onClose} style={{ width:32,height:32 }}>×</Btn>
        </div>

        <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:16}}>

          {/* PERSONALIEN */}
          <div>
            <SectionLabel>Personalien</SectionLabel>
            <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
              <Row label="Name"          value={person.lastName}/>
              <Row label="Vorname"       value={person.firstName}/>
              <Row label="Team(s)"       value={(person.teams||["Cc-Junioren"]).join(" · ")}/>
              {can("dob")      &&<Row label="Geburtsdatum"      value={person.dob}/>}
              {can("nat")      &&<Row label="Nationalität"       value={person.nat}/>}
              {can("heimatort")&&<Row label="Heimatort / Geburtsort" value={person.heimatort}/>}
              {can("ahv")      &&<Row label="AHV-Nummer"        value="••••••••••" mono/>}
              {can("pass")     &&<Row label="Spielerpass"        value={person.pass}/>}
              {can("js")       &&<Row label="J+S Nummer"         value={person.js}/>}
              {can("fairgate") &&<Row label="Fairgate-ID"        value={person.fairgate} mono/>}
            </div>
          </div>

          {/* ADRESSE */}
          {(can("street")||can("plz")||can("city")||can("canton")||can("country"))&&(
            <div>
              <SectionLabel>Adresse</SectionLabel>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                {can("street") &&<Row label="Strasse"  value={person.street}/>}
                {can("plz")    &&<Row label="PLZ"      value={person.plz}/>}
                {can("city")   &&<Row label="Ort"      value={person.city}/>}
                {can("canton") &&<Row label="Kanton"   value={person.canton}/>}
                {can("country")&&<Row label="Land"     value={person.country}/>}
              </div>
            </div>
          )}

          {/* KOMMUNIKATION PERSÖNLICH */}
          {(can("email")||can("tel"))&&(
            <div>
              <SectionLabel>Kommunikation Persönlich</SectionLabel>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                {can("email")&&<Row label="E-Mail"  value={person.email} blue/>}
                {can("tel")  &&<Row label="Telefon" value={person.tel}/>}
              </div>
            </div>
          )}

          {/* ERZIEHUNGSBERECHTIGTE PERSON 1 */}
          {can("parent1")&&(
            <div>
              <SectionLabel>Erziehungsberechtigte Person 1</SectionLabel>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                <Row label="Name"    value={person.p1Last}/>
                <Row label="Vorname" value={person.p1First}/>
                <Row label="E-Mail"  value={person.p1Email} blue/>
                <Row label="Telefon" value={person.p1Tel}/>
              </div>
            </div>
          )}

          {/* ERZIEHUNGSBERECHTIGTE PERSON 2 */}
          {can("parent2")&&(
            <div>
              <SectionLabel>Erziehungsberechtigte Person 2</SectionLabel>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                <Row label="Name"    value={person.p2Last}/>
                <Row label="Vorname" value={person.p2First}/>
                <Row label="E-Mail"  value={person.p2Email} blue/>
                <Row label="Telefon" value={person.p2Tel}/>
              </div>
            </div>
          )}

          {/* Rollenhinweis */}
          <div style={{padding:"8px 12px",background:"var(--surface)",borderRadius:8,fontSize:14,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
            <span><TI n="eye"/></span>
            <span>Feldsichtbarkeit gemäss Rolle: <strong>{getRole(role).label}</strong></span>
          </div>
        </div>
      </div>
      </div>
  );
}

/* -- Kaderliste mit Feldsichtbarkeit -- */

function MitgliederModul({role,dbMitglieder=[],kannSchreiben,kannVerwalten}){
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
  const canExport=role==="administrator"||role==="administration";

  /* Mitglieder: aus Supabase wenn geladen, sonst MEMBERS Fallback */
  const allMembers=dbMitglieder.length>0
    ?dbMitglieder.map(m=>({
        id:m.id,
        name:`${m.vorname} ${m.nachname}`,
        vorname:m.vorname, nachname:m.nachname,
        role:m.rolle||"-",
        team:(m.teams||[]).join(", ")||"-",
        type:m.mitgliedtyp||"-",
        location:m.ort||"-",
        status:m.datenstatus||"Vollständig",
        email:m.email, telefon:m.telefon,
        geburtsdatum:m.geburtsdatum, position:m.position,
        fairgate_id:m.fairgate_id,
        hat_portal_zugang:m.hat_portal_zugang,
      }))
    :MEMBERS;

  const COLS=[
    {key:"name",   label:"Mitglied"},
    {key:"role",   label:"Rolle"},
    {key:"team",   label:"Team"},
    {key:"type",   label:"Mitgliedtyp"},
    {key:"location",label:"Wohnort"},
    {key:"status", label:"Datenstatus"},
  ];
  const GROUP_OPTIONS=[
    {val:"none",  label:"Keine Gruppierung"},
    {val:"role",  label:"Nach Rolle"},
    {val:"team",  label:"Nach Team"},
    {val:"type",  label:"Nach Mitgliedtyp"},
    {val:"status",label:"Nach Datenstatus"},
  ];

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }

  const filtered=allMembers.filter(m=>
    (!search||m.name.toLowerCase().includes(search.toLowerCase())||
    m.role.toLowerCase().includes(search.toLowerCase())||
    m.team.toLowerCase().includes(search.toLowerCase()))
    &&(filterVals.length===0||filterVals.includes(m[groupBy]||"-"))
  );

  const sorted=[...filtered].sort((a,b)=>{
    const av=String(a[sortCol]??""); const bv=String(b[sortCol]??"");
    return sortDir==="asc"?String(av||'').localeCompare(String(bv||'')):String(bv||'').localeCompare(String(av||''));
  });

  /* Gruppierung */
  let groups=[];
  if(groupBy==="none"){
    groups=[{key:"",members:sorted}];
  }else{
    const map={};
    sorted.forEach(m=>{
      const k=m[groupBy]||"-";
      if(!map[k]) map[k]=[];
      map[k].push(m);
    });
    groups=Object.entries(map).sort(([a],[b])=>String(a||'').localeCompare(String(b||''))).map(([k,members])=>({key:k,members}));
  }

  const statusColor=s=>s==="Vollständig"?GN:s==="Prüfung fällig"?AM:R;
  const statusBg=s=>s==="Vollständig"?"#ECFDF5":s==="Prüfung fällig"?"#FFFBEB":RL;
  const SortIcon=({col})=>sortCol===col
    ?<span style={{marginLeft:4,fontSize:11,color:"var(--sub)"}}>{sortDir==="asc"?"▲":"▼"}</span>
    :<span style={{marginLeft:4,fontSize:11,opacity:0.25}}>↕</span>;

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Detail-Modal ── */
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>String(d.id)===String(m.id))||{};
    const eltern=raw.eltern||[];
    const fv=getFieldVisibility(role);
    const rows=[
      {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
      {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
      ...(fv.showGebdat ?[{l:"Geburtsdatum", v:raw.geburtsdatum||"-"}]:[]),
      {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":raw.geschlecht||"-"},
      {l:"Nationalität", v:raw.nationalitaet||"-"},
      {l:"Heimatort",    v:raw.heimatort||"-"},
      ...(fv.showAdresse?[
        {l:"Strasse",    v:raw.strasse||"-"},
        {l:"PLZ / Ort",  v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
        {l:"Kanton",     v:raw.kanton||"-"},
        {l:"Land",       v:raw.land||"-"},
      ]:[]),
      ...(fv.showEmail  ?[{l:"E-Mail",       v:raw.email||"-"}]:[]),
      ...(fv.showTelefon?[{l:"Telefon",      v:raw.telefon||"-"}]:[]),
      {l:"Funktion",     v:raw.funktion||"-"},
      {l:"Team(s)",      v:(raw.teams||[]).join(", ")||m.team||"-"},
      {l:"Mitgliedtyp",  v:raw.mitgliedtyp||m.type||"-"},
      {l:"Position",     v:raw.position||"-"},
      ...(fv.showPass   ?[{l:"Spielerpass",  v:raw.spielerpass||"-"}]:[]),
      ...(fv.showAhv    ?[{l:"AHV-Nr.",      v:raw.ahv_nr||"-"}]:[]),
      ...(fv.showPass   ?[{l:"J+S Nr.",      v:raw.js_nr||"-"}]:[]),
      ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
      {l:"Datenstatus",  v:raw.datenstatus||"-"},
      ...(fv.showNotizen?[{l:"Notizen",      v:raw.notizen||"-"}]:[]),
    ];
    return(
      <div>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <Btn onClick={onClose}><TI n="arrow-left"/> Zurück</Btn>
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
            <Av name={m.name} size={44}/>
            <div>
              <div style={{fontWeight:700,fontSize:18,color:"var(--text)"}}>{m.name}</div>
              <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                <Chip text={m.role} color={R}/>
                <Chip text={m.type} color={BL}/>
                <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
              </div>
            </div>
          </div>
        </div>
        <Tabs tabs={[{key:"info",label:"Infos"},{key:"eltern",label:`Eltern (${eltern.length})`}]} active={selectedMember?._tab||"info"} setActive={t=>setSelectedMember(prev=>({...prev,_tab:t}))}/>
        {(selectedMember?._tab||"info")==="info"&&(
          <Card style={{marginTop:12}}>
            {rows.filter(r=>role==="administrator"||role==="administration"?true:(r.v&&r.v!=="-")).map((r,i,arr)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<arr.length-1?"0.5px solid var(--border)":"none",gap:12}}>
                <span className="cc-detail-label" style={{minWidth:130,flexShrink:0}}>{r.l}</span>
                <span style={{fontSize:14,color:r.v==="-"?"var(--sub)":"var(--text)",fontWeight:r.v==="-"?400:600,textAlign:"right"}}>{r.v}</span>
              </div>
            ))}
            {m.hat_portal_zugang&&(
              <div style={{marginTop:12,padding:"10px 14px",background:"var(--surface2)",borderRadius:8,border:"1px solid "+GN,fontSize:14,color:GN,fontWeight:600}}>
                ✓ Hat Portal-Zugang
              </div>
            )}
          </Card>
        )}
        {(selectedMember?._tab||"info")==="eltern"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
            {eltern.length===0&&<div className="cc-empty">Keine Elternkontakte erfasst.</div>}
            {eltern.map((e,i)=>(
              <Card key={i}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>{e.vorname} {e.nachname}{e.beziehung?` (${e.beziehung})`:""}</div>
                {e.email&&<div style={{fontSize:13,color:"var(--sub)",marginBottom:3}}>✉ {e.email}</div>}
                {e.telefon&&<div style={{fontSize:13,color:"var(--sub)"}}>📞 {e.telefon}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-flex-center" style={{justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <h1>Mitglieder</h1>
        {canExport&&<Row align="flex-start"><Btn>Export CSV</Btn><Btn>Export Excel</Btn></Row>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats" style={{marginBottom:20}}>
        <Stat label="Total" value={allMembers.length} color={BL}/>
        <Stat label="Trainer" value={allMembers.filter(m=>m.role==="Trainer").length} color={R}/>
        <Stat label="Aktivmitglieder" value={allMembers.filter(m=>m.type==="Aktivmitglied").length} color={GN}/>
        <Stat label="Datenprüfung fällig" value={allMembers.filter(m=>m.status!=="Vollständig").length} color={AM}/>
      </div>
      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:12,marginBottom:groupBy!=="none"?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Suchen nach Name, Rolle, Team…"
          style={{...inputStyle,flex:1,minWidth:180}}/>
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,minWidth:170}}>
          {GROUP_OPTIONS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>
      {/* Gruppen-Filter Chips */}
      {groupBy!=="none"&&(()=>{
        const vals=[...new Set(MEMBERS.map(m=>m[groupBy]||"-"))].sort();
        return(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
            <Btn small onClick={()=>setFilterVals([])}>Alle</Btn>
            {vals.map(v=>{
              const active=filterVals.includes(v);
              return(
                <Btn small onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}>{active&&<span style={{fontSize:11}}>✓</span>} {v} <span style={{opacity:0.55,fontWeight:400}}> {allMembers.filter(m=>(m[groupBy]||"-")===v).length} </span></Btn>
              );
            })}
            {filterVals.length>0&&(
              <Btn variant="ghost" small onClick={()=>setFilterVals([])}>× zurücksetzen</Btn>
            )}
          </div>
        );
      })()}
      {/* Tabelle */}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table className="cc-table">
          <thead>
            <tr>
              {COLS.map(c=>(
                <th key={c.key} onClick={()=>handleSort(c.key)}
                  style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",
                    fontSize:14,textTransform:"uppercase",letterSpacing:0.4,cursor:"pointer",
                    userSelect:"none",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--sub)"}>
                  {c.label}<SortIcon col={c.key}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({key,members})=>(
              <>
                {groupBy!=="none"&&(
                  <tr key={"g-"+key}>
                    <td colSpan={6} className="cc-section-hdr" style={{
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span style={{opacity:0.6,fontWeight:400}}>({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    className="cc-tr">
                    <td className="cc-td">
                      <Row>
                        <Av name={m.name} size={28}/>
                        <span className="cc-list-name">{m.name}</span>
                      </Row>
                    </td>
                    <td className="cc-td"><RolleChip rolle={m.role}/></td>
                    <td className="cc-td cc-detail-label">{m.team}</td>
                    <td className="cc-td"><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td cc-detail-label">{m.location}</td>
                    <td className="cc-td">
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Portal-Zugang Tab — Mitglied + Eltern verknüpfen ── */
function PortalZugangTab({raw,eltern,canEdit,sb,benutzer,portalLoading,togglePortalZugang,onReload}){
  const [elternBenutzer,setElternBenutzer]=useState({});
  const [linkLoading,setLinkLoading]=useState({});
  const [linkMsg,setLinkMsg]=useState({});
  const [editEmail,setEditEmail]=useState({});   // {eltern-email: neueEmail}
  const [emailEditing,setEmailEditing]=useState({}); // {eltern-email: true/false}

  useEffect(()=>{
    if(!sb||eltern.length===0) return;
    (async()=>{
      for(const e of eltern){
        if(!e.email) continue;
        try{
          const {data:buArr2}=await sb.from("benutzer").select("id,email,role,active,name,created_at").eq("email",e.email).limit(1);
          const data=buArr2?.[0]||null;
          // Auch via benutzer_id suchen falls E-Mail nicht übereinstimmt
          if(data){ setElternBenutzer(prev=>({...prev,[e.email]:data})); }
          else if(e.benutzer_id){
            const {data:buArr3}=await sb.from("benutzer").select("id,email,role,active,name,created_at").eq("id",e.benutzer_id).limit(1);
            const data3=buArr3?.[0]||null;
            if(data3) setElternBenutzer(prev=>({...prev,[e.email]:data3}));
          }
        }catch(_){}
      }
    })();
  },[eltern,sb]);

  async function linkEltern(e){
    if(!sb||!canEdit) return;
    setLinkLoading(prev=>({...prev,[e.email]:true}));
    setLinkMsg(prev=>({...prev,[e.email]:null}));
    try{
      const {data:buArr3}=await sb.from("benutzer").select("id,role,active").eq("email",e.email).limit(1);
      const bu=buArr3?.[0]||null; const buErr=null;
      if(!bu){ setLinkMsg(prev=>({...prev,[e.email]:{ok:false,text:"Kein Konto gefunden. Elternteil muss sich zuerst registrieren."}})); setLinkLoading(prev=>({...prev,[e.email]:false})); return; }
      const {error}=await sb.from("elternkontakte").update({benutzer_id:bu.id}).eq("mitglied_id",raw.id).eq("email",e.email);
      if(error) throw error;
      if(!bu.role||bu.role==="spieler") await sb.from("benutzer").update({role:"eltern"}).eq("id",bu.id);
      setElternBenutzer(prev=>({...prev,[e.email]:{...bu,role:"eltern"}}));
      // Lokal benutzer_id setzen damit isLinked sofort stimmt
      e.benutzer_id=bu.id;
      setLinkMsg(prev=>({...prev,[e.email]:{ok:true,text:"Erfolgreich verknüpft ✓"}}));
      if(onReload) onReload();
    }catch(err){ setLinkMsg(prev=>({...prev,[e.email]:{ok:false,text:err.message}})); }
    setLinkLoading(prev=>({...prev,[e.email]:false}));
  }

  async function unlinkEltern(e){
    if(!sb||!canEdit) return;
    setLinkLoading(prev=>({...prev,[e.email]:true}));
    try{
      await sb.from("elternkontakte").update({benutzer_id:null}).eq("mitglied_id",raw.id).eq("email",e.email);
      e.benutzer_id=null;
      setElternBenutzer(prev=>{const n={...prev};delete n[e.email];return n;});
      setLinkMsg(prev=>({...prev,[e.email]:{ok:true,text:"Verknüpfung aufgehoben"}}));
    }catch(err){ setLinkMsg(prev=>({...prev,[e.email]:{ok:false,text:err.message}})); }
    setLinkLoading(prev=>({...prev,[e.email]:false}));
  }

  async function updateElternEmail(e, neueEmail){
    if(!sb||!canEdit||!neueEmail.trim()) return;
    setLinkLoading(prev=>({...prev,[e.email]:true}));
    try{
      console.log("[FCH] updateElternEmail:", {
        alteEmail: e.email,
        neueEmail: neueEmail.trim(),
        mitglied_id: raw.id,
        typ: typeof raw.id,
        canEdit,
        sbOk: !!sb,
      });
      const {data:checkData, error:checkErr} = await sb.from("elternkontakte")
        .select("id,email,mitglied_id")
        .eq("mitglied_id", raw.id)
        .limit(5);
      console.log("[FCH] elternkontakte check:", checkData, checkErr);

      const {error}=await sb.from("elternkontakte")
        .update({email:neueEmail.trim()})
        .eq("mitglied_id",raw.id)
        .eq("email",e.email);
      if(error){ console.error("[FCH] elternkontakte update error:", error); throw error; }
      // Prüfen ob Konto mit neuer E-Mail existiert
      const {data:buArr4}=await sb.from("benutzer").select("id,email,role,active").eq("email",neueEmail.trim()).limit(1);
      const bu=buArr4?.[0]||null;
      if(bu){
        // Direkt verknüpfen
        await sb.from("elternkontakte").update({benutzer_id:bu.id}).eq("mitglied_id",raw.id).eq("email",neueEmail.trim());
        if(!bu.role||bu.role==="spieler") await sb.from("benutzer").update({role:"eltern"}).eq("id",bu.id);
        setElternBenutzer(prev=>({...prev,[neueEmail.trim()]:{...bu,role:"eltern"}}));
        setLinkMsg(prev=>({...prev,[e.email]:{ok:true,text:"E-Mail aktualisiert und Konto verknüpft ✓"}}));
      } else {
        setLinkMsg(prev=>({...prev,[e.email]:{ok:true,text:"E-Mail aktualisiert. Konto noch nicht gefunden — Elternteil muss sich mit neuer E-Mail registrieren."}}));
      }
      setEmailEditing(prev=>({...prev,[e.email]:false}));
      if(onReload) onReload();
    }catch(err){ setLinkMsg(prev=>({...prev,[e.email]:{ok:false,text:err.message}})); }
    setLinkLoading(prev=>({...prev,[e.email]:false}));
  }

  return(
    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:12}}>

      {/* Mitglied Portal-Zugang */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div className="cc-list-name">Mitglied — Portal-Zugang</div>
          <Chip text={raw.hat_portal_zugang?"Aktiv":"Kein Zugang"} color={raw.hat_portal_zugang?GN:R} bg={raw.hat_portal_zugang?"#ECFDF5":RL}/>
        </div>
        {canEdit&&(
          <button onClick={togglePortalZugang}
            style={{width:"100%",padding:"10px",borderRadius:8,border:`0.5px solid ${raw.hat_portal_zugang?R:GN}`,background:"var(--surface)",color:raw.hat_portal_zugang?R:GN,fontSize:14,cursor:"pointer",fontWeight:500}}>
            {raw.hat_portal_zugang?"Portal-Zugang deaktivieren":"Portal-Zugang aktivieren"}
          </button>
        )}
        {portalLoading&&<div className="cc-empty" style={{padding:"8px 0"}}>Wird geladen…</div>}
        {!portalLoading&&benutzer&&(
          <div style={{marginTop:12}}>
            <div className="cc-section-hdr" style={{marginBottom:8}}>Benutzer-Konto</div>
            {[
              {l:"E-Mail",   v:benutzer.email||"-"},
              {l:"Rolle",    v:benutzer.role||"-"},
              {l:"Aktiv",    v:benutzer.active?"Ja":"Nein"},
              {l:"Erstellt", v:benutzer.created_at?new Date(benutzer.created_at).toLocaleDateString("de-CH"):"-"},
            ].map((r,i)=>(
              <div key={i} className="cc-list-row" style={{justifyContent:"space-between"}}>
                <span className="cc-detail-label">{r.l}</span>
                <span style={{fontWeight:600}}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
        {!portalLoading&&!benutzer&&raw.hat_portal_zugang&&(
          <div className="cc-empty" style={{marginTop:8,padding:12}}>
            Kein Benutzer-Konto — Mitglied hat sich noch nicht registriert.
          </div>
        )}
      </Card>

      {/* Eltern verknüpfen */}
      {eltern.length>0&&(
        <Card>
          <div className="cc-section-hdr" style={{marginBottom:8}}>Eltern verknüpfen</div>
          <div className="cc-detail-label" style={{marginBottom:14,lineHeight:1.5}}>
            Elternteile müssen sich zuerst selbst registrieren. Danach kannst du hier die Verknüpfung setzen — sie sehen dann das Kind im Portal.
          </div>
          {eltern.map((e,i)=>{
            const bu=elternBenutzer[e.email];
            const isLinked=!!e.benutzer_id; // nur auf DB-Wert basieren
            const loading=linkLoading[e.email];
            const msg=linkMsg[e.email];
            return(
              <div key={i} style={{padding:"14px 0",borderTop:i>0?"0.5px solid var(--border)":undefined}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:8}}>
                  <div>
                    <div className="cc-list-name">{e.vorname||e.name||""} {e.nachname||""}{e.beziehung?` (${e.beziehung})`:""}</div>
                    <div className="cc-detail-label">{e.email||"Keine E-Mail erfasst"}</div>
                  </div>
                  <Chip text={isLinked?"Verknüpft":"Nicht verknüpft"} color={isLinked?GN:"#9CA3AF"} bg={isLinked?"#ECFDF5":"var(--surface2)"}/>
                </div>
                {bu&&(
                  <div style={{display:"flex",gap:16,fontSize:13,marginBottom:8}}>
                    <span><span className="cc-detail-label">Rolle: </span><strong>{bu.role||"-"}</strong></span>
                    <span><span className="cc-detail-label">Aktiv: </span><strong>{bu.active?"Ja":"Nein"}</strong></span>
                  </div>
                )}
                {!bu&&e.benutzer_id&&(
                  <div style={{fontSize:13,color:"var(--sub)",marginBottom:8}}>✓ Verknüpft (Konto-Details werden geladen…)</div>
                )}
                {msg&&(
                  <div style={{padding:"6px 10px",borderRadius:6,background:msg.ok?"#ECFDF5":RL,color:msg.ok?GN:R,fontSize:13,marginBottom:8}}>
                    {msg.text}
                  </div>
                )}
                {canEdit&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {/* E-Mail bearbeiten wenn kein Konto gefunden */}
                    {!isLinked&&e.email&&(
                      emailEditing[e.email]?(
                        <div style={{display:"flex",gap:6}}>
                          <input
                            value={editEmail[e.email]??e.email}
                            onChange={ev=>setEditEmail(prev=>({...prev,[e.email]:ev.target.value}))}
                            placeholder="Neue E-Mail eingeben"
                            style={{flex:1,padding:"7px 10px",border:`0.5px solid var(--border)`,borderRadius:8,fontSize:13,outline:"none",background:"var(--surface)",color:"var(--text)"}}
                          />
                          <button onClick={()=>updateElternEmail(e, editEmail[e.email]||e.email)} disabled={loading}
                            style={{padding:"7px 12px",borderRadius:8,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,fontSize:13,cursor:"pointer",fontWeight:500}}>
                            {loading?"…":"✓"}
                          </button>
                          <button onClick={()=>setEmailEditing(prev=>({...prev,[e.email]:false}))}
                            style={{padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                            ✕
                          </button>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:6}}>
                          {e.email&&<button onClick={()=>linkEltern(e)} disabled={loading}
                            style={{flex:1,padding:"8px",borderRadius:8,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,fontSize:13,cursor:"pointer",fontWeight:500}}>
                            {loading?"Verknüpfe…":"↔ Mit Konto verknüpfen"}
                          </button>}
                          <button onClick={()=>setEmailEditing(prev=>({...prev,[e.email]:true}))}
                            style={{padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}
                            title="Andere E-Mail verwenden">
                            <TI n="mail"/> Andere E-Mail
                          </button>
                        </div>
                      )
                    )}
                    {isLinked&&(
                      <button onClick={()=>unlinkEltern(e)} disabled={loading}
                        style={{padding:"8px 14px",borderRadius:8,border:`0.5px solid ${R}`,background:"var(--surface)",color:R,fontSize:13,cursor:"pointer"}}>
                        {loading?"…":"Verknüpfung aufheben"}
                      </button>
                    )}
                    {!e.email&&(
                      emailEditing["_new_"+raw.id]?(
                        <div style={{display:"flex",gap:6}}>
                          <input
                            value={editEmail["_new_"+raw.id]||""}
                            onChange={ev=>setEditEmail(prev=>({...prev,["_new_"+raw.id]:ev.target.value}))}
                            placeholder="E-Mail des Elternteils"
                            style={{flex:1,padding:"7px 10px",border:`0.5px solid var(--border)`,borderRadius:8,fontSize:13,outline:"none",background:"var(--surface)",color:"var(--text)"}}
                          />
                          <button onClick={()=>updateElternEmail(e, editEmail["_new_"+raw.id]||"")} disabled={loading}
                            style={{padding:"7px 12px",borderRadius:8,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,fontSize:13,cursor:"pointer",fontWeight:500}}>
                            {loading?"…":"✓"}
                          </button>
                          <button onClick={()=>setEmailEditing(prev=>({...prev,["_new_"+raw.id]:false}))}
                            style={{padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                            ✕
                          </button>
                        </div>
                      ):(
                        <button onClick={()=>setEmailEditing(prev=>({...prev,["_new_"+raw.id]:true}))}
                          style={{padding:"8px",borderRadius:8,border:`0.5px solid ${AM}`,background:"var(--surface)",color:AM,fontSize:13,cursor:"pointer"}}>
                          <TI n="mail-plus"/> E-Mail erfassen & verknüpfen
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {eltern.length===0&&(
        <Card><div className="cc-empty">Keine Elternkontakte erfasst.</div></Card>
      )}
    </div>
  );
}

function MembersView({role,dbMitglieder=[],kannSchreiben,kannVerwalten,sb=null,onReload}){
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
  const canExport=role==="administrator"||role==="administration";

  /* Mitglieder: aus Supabase wenn geladen, sonst MEMBERS Fallback */
  const allMembers=dbMitglieder.length>0
    ?dbMitglieder.map(m=>({
        id:m.id,
        name:`${m.vorname} ${m.nachname}`,
        vorname:m.vorname, nachname:m.nachname,
        role:m.rolle||"-",
        team:(m.teams||[]).join(", ")||"-",
        type:m.mitgliedtyp||"-",
        location:m.ort||"-",
        status:m.datenstatus||"Vollständig",
        email:m.email, telefon:m.telefon,
        geburtsdatum:m.geburtsdatum, position:m.position,
        fairgate_id:m.fairgate_id,
        hat_portal_zugang:m.hat_portal_zugang,
      }))
    :MEMBERS;

  const COLS=[
    {key:"name",   label:"Mitglied"},
    {key:"role",   label:"Rolle"},
    {key:"team",   label:"Team"},
    {key:"type",   label:"Mitgliedtyp"},
    {key:"location",label:"Wohnort"},
    {key:"status", label:"Datenstatus"},
  ];
  const GROUP_OPTIONS=[
    {val:"none",  label:"Keine Gruppierung"},
    {val:"role",  label:"Nach Rolle"},
    {val:"team",  label:"Nach Team"},
    {val:"type",  label:"Nach Mitgliedtyp"},
    {val:"status",label:"Nach Datenstatus"},
  ];

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }

  const filtered=allMembers.filter(m=>
    (!search||m.name.toLowerCase().includes(search.toLowerCase())||
    m.role.toLowerCase().includes(search.toLowerCase())||
    m.team.toLowerCase().includes(search.toLowerCase()))
    &&(filterVals.length===0||filterVals.includes(m[groupBy]||"-"))
  );

  const sorted=[...filtered].sort((a,b)=>{
    const av=String(a[sortCol]??""); const bv=String(b[sortCol]??"");
    return sortDir==="asc"?String(av||'').localeCompare(String(bv||'')):String(bv||'').localeCompare(String(av||''));
  });

  /* Gruppierung */
  let groups=[];
  if(groupBy==="none"){
    groups=[{key:"",members:sorted}];
  }else{
    const map={};
    sorted.forEach(m=>{
      const k=m[groupBy]||"-";
      if(!map[k]) map[k]=[];
      map[k].push(m);
    });
    groups=Object.entries(map).sort(([a],[b])=>String(a||'').localeCompare(String(b||''))).map(([k,members])=>({key:k,members}));
  }

  const statusColor=s=>s==="Vollständig"?GN:s==="Prüfung fällig"?AM:R;
  const statusBg=s=>s==="Vollständig"?"#ECFDF5":s==="Prüfung fällig"?"#FFFBEB":RL;
  const SortIcon=({col})=>sortCol===col
    ?<span style={{marginLeft:4,fontSize:11,color:"var(--sub)"}}>{sortDir==="asc"?"▲":"▼"}</span>
    :<span style={{marginLeft:4,fontSize:11,opacity:0.25}}>↕</span>;

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Mitglied-Detailseite (volle Breite, kein Modal) ── */
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>String(d.id)===String(m.id))||{};
    const eltern=raw.eltern||[];
    const fv=getFieldVisibility(role);
    const canEdit=role==="administrator"||role==="administration";
    const [activeTab,setActiveTab]=useState("info");
    const [editMode,setEditMode]=useState(false);
    const [form,setForm]=useState({...raw});
    const [saving,setSaving]=useState(false);
    const [saveMsg,setSaveMsg]=useState(null);
    // Anwesenheiten
    const [anwesenheiten,setAnwesenheiten]=useState(null);
    const [anwLoading,setAnwLoading]=useState(false);
    // Dokumente
    const [dokumente,setDokumente]=useState(null);
    // Portal
    const [benutzer,setBenutzer]=useState(null);
    const [portalLoading,setPortalLoading]=useState(false);

    async function loadAnwesenheiten(){
      if(anwesenheiten||anwLoading||!sb) return;
      setAnwLoading(true);
      try{
        const {data}=await sb.from("anwesenheiten").select("*").eq("mitglied_id",raw.id).order("updated_at",{ascending:false}).limit(50);
        setAnwesenheiten(data||[]);
      }catch(e){ setAnwesenheiten([]); }
      setAnwLoading(false);
    }

    async function loadPortal(){
      if(benutzer!==null||portalLoading||!sb) return;
      setPortalLoading(true);
      try{
        const {data:buArr}=await sb.from("benutzer").select("*").eq("mitglied_id",raw.id).limit(1);
        const data=buArr?.[0]||null;
        setBenutzer(data||null);
      }catch(e){ setBenutzer(null); }
      setPortalLoading(false);
    }

    async function togglePortalZugang(){
      if(!sb||!canEdit) return;
      const neu=!raw.hat_portal_zugang;
      await sb.from("mitglieder").update({hat_portal_zugang:neu}).eq("id",raw.id);
      if(onReload) onReload();
    }

    useEffect(()=>{
      if(activeTab==="anwesenheit") loadAnwesenheiten();
      if(activeTab==="portal") loadPortal();
    },[activeTab]);
    const S_LABEL={fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4};
    const S_INPUT={width:"100%",padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",outline:"none",boxSizing:"border-box"};

    async function handleSave(){
      if(!kannSchreiben("members")) return;
      setSaving(true); setSaveMsg(null);
      try{
        const update={
          vorname:form.vorname, nachname:form.nachname,
          geburtsdatum:form.geburtsdatum||null,
          geschlecht:form.geschlecht||null,
          nationalitaet:form.nationalitaet||null,
          heimatort:form.heimatort||null,
          strasse:form.strasse||null, plz:form.plz||null,
          ort:form.ort||null, kanton:form.kanton||null, land:form.land||null,
          email:form.email||null, telefon:form.telefon||null,
          mitgliedtyp:form.mitgliedtyp||null, funktion:form.funktion||null,
          position:form.position||null, spielerpass:form.spielerpass||null,
          ahv_nr:form.ahv_nr||null, js_nr:form.js_nr||null,
          datenstatus:form.datenstatus||null, notizen:form.notizen||null,
          updated_at:new Date().toISOString(),
        };
        if(sb){
          const {error}=await sb.from("mitglieder").update(update).eq("id",raw.id);
          if(error){ console.error("[FCH] mitglieder update error:", error); throw error; }
          if(onReload) onReload();
          setSaveMsg({ok:true, text:"Gespeichert ✓"});
          setEditMode(false);
        } else {
          throw new Error("Keine Supabase-Verbindung");
        }
      }catch(e){ setSaveMsg({ok:false, text:e.message}); }
      setSaving(false);
    }

    const rows=[
      {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
      {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
      ...(fv.showGebdat ?[{l:"Geburtsdatum", v:raw.geburtsdatum||"-"}]:[]),
      {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":raw.geschlecht||"-"},
      {l:"Nationalität", v:raw.nationalitaet||"-"},
      {l:"Heimatort",    v:raw.heimatort||"-"},
      ...(fv.showAdresse?[
        {l:"Strasse",    v:raw.strasse||"-"},
        {l:"PLZ / Ort",  v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
        {l:"Kanton",     v:raw.kanton||"-"},
        {l:"Land",       v:raw.land||"-"},
      ]:[]),
      ...(fv.showEmail  ?[{l:"E-Mail",       v:raw.email||"-"}]:[]),
      ...(fv.showTelefon?[{l:"Telefon",      v:raw.telefon||"-"}]:[]),
      {l:"Funktion",     v:raw.funktion||"-"},
      {l:"Team(s)",      v:(raw.teams||[]).join(", ")||m.team||"-"},
      {l:"Mitgliedtyp",  v:raw.mitgliedtyp||m.type||"-"},
      {l:"Position",     v:raw.position||"-"},
      ...(fv.showPass   ?[{l:"Spielerpass",  v:raw.spielerpass||"-"}]:[]),
      ...(fv.showAhv    ?[{l:"AHV-Nr.",      v:raw.ahv_nr||"-"}]:[]),
      ...(fv.showPass   ?[{l:"J+S Nr.",      v:raw.js_nr||"-"}]:[]),
      ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
      {l:"Datenstatus",  v:raw.datenstatus||"-"},
      ...(fv.showNotizen?[{l:"Notizen",      v:raw.notizen||"-"}]:[]),
    ];
    const F=({lbl,fkey,type="text",opts})=>(
      <div>
        <span className="cc-label">{lbl}</span>
        {opts
          ?<select value={form[fkey]||""} onChange={e=>setForm(f=>({...f,[fkey]:e.target.value}))} style={S_INPUT}>
            <option value="">–</option>
            {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
          </select>
          :<input type={type} value={form[fkey]||""} onChange={e=>setForm(f=>({...f,[fkey]:e.target.value}))} style={S_INPUT}/>
        }
      </div>
    );
    const TABS=[
      {key:"info",       label:"Stammdaten"},
      {key:"eltern",     label:`Eltern (${eltern.length})`},
      {key:"teams",      label:"Kader / Teams"},
      {key:"anwesenheit",label:"Anwesenheiten"},
      {key:"statistiken",label:"Statistiken"},
      {key:"dokumente",  label:"Dokumente"},
      {key:"portal",     label:"Portal-Zugang"},
    ];

    // Felder in Sektionen gruppieren
    const sektionen=[
      {titel:"Personalien", felder:["Vorname","Nachname","Geburtsdatum","Geschlecht","Nationalität","Heimatort"]},
      {titel:"Adresse",     felder:["Strasse","PLZ / Ort","Kanton","Land"]},
      {titel:"Kontakt",     felder:["E-Mail","Telefon"]},
      {titel:"Vereinsdaten",felder:["Funktion","Team(s)","Mitgliedtyp","Position"]},
      {titel:"Lizenzen",    felder:["Spielerpass","AHV-Nr.","J+S Nr.","Fairgate-ID"]},
      {titel:"Status",      felder:["Datenstatus","Notizen"]},
    ];
    return(
      <div>
        {/* Header Card */}
        <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:14,padding:"20px 24px",marginBottom:16,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <Av name={m.name} size={56}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:22,color:"var(--text)",marginBottom:6}}>{m.name}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {raw.funktion&&<Chip text={raw.funktion} color={BL}/>}
              {raw.mitgliedtyp&&<Chip text={raw.mitgliedtyp} color="#6B7280" bg="var(--surface2)"/>}
              <Chip text={raw.datenstatus||"ausstehend"} color={statusColor(m.status)} bg={statusBg(m.status)}/>
              {(raw.teams||[]).map(t=><span key={t} className="cc-chip-toggle" style={{cursor:"default",fontSize:12,padding:"2px 8px"}}>{t}</span>)}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            <Btn onClick={onClose}><TI n="arrow-left"/> Zurück</Btn>
            {canEdit&&!editMode&&activeTab==="info"&&(
              <Btn onClick={()=>setEditMode(true)} style={{fontSize:13,background:BTN,color:BTN_TXT,border:"none"}}><TI n="edit"/> Bearbeiten</Btn>
            )}
          </div>
        </div>

        <Tabs tabs={TABS} active={activeTab} setActive={t=>{setActiveTab(t);setEditMode(false);}}/>

        {/* TAB: Stammdaten */}
        {activeTab==="info"&&!editMode&&(
          <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>
            {sektionen.map(sek=>{
              const sFelder=rows.filter(r=>sek.felder.includes(r.l)&&(canEdit||(r.v&&r.v!=="-")));
              if(sFelder.length===0) return null;
              return(
                <div key={sek.titel} className="cc-list">
                  <div className="cc-section-hdr">{sek.titel}</div>
                  <div className="cc-grid-form" style={{gap:0}}>
                    {sFelder.map((r,i)=>(
                      <div key={i} style={{padding:"11px 16px",borderBottom:"0.5px solid var(--border)",borderRight:i%2===0&&i<sFelder.length-1?"0.5px solid var(--border)":"none"}}>
                        <div className="cc-label" style={{marginBottom:3}}>{r.l}</div>
                        <div style={{fontSize:14,fontWeight:r.v==="-"?400:600,color:r.v==="-"?"var(--sub)":"var(--text)"}}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {saveMsg&&<div style={{padding:"8px 12px",borderRadius:8,background:saveMsg.ok?"#ECFDF5":RL,color:saveMsg.ok?GN:R,fontSize:13}}>{saveMsg.text}</div>}
          </div>
        )}

        {/* TAB: Stammdaten EDIT */}
        {activeTab==="info"&&editMode&&(
          <Card style={{marginTop:12}}>
            <div className="cc-grid-form">
              <F lbl="Vorname" fkey="vorname"/>
              <F lbl="Nachname" fkey="nachname"/>
              <F lbl="Geburtsdatum" fkey="geburtsdatum" type="date"/>
              <F lbl="Geschlecht" fkey="geschlecht" opts={[{v:"m",l:"Männlich"},{v:"w",l:"Weiblich"}]}/>
              <F lbl="Nationalität" fkey="nationalitaet"/>
              <F lbl="Heimatort" fkey="heimatort"/>
              <F lbl="Strasse" fkey="strasse"/>
              <F lbl="PLZ" fkey="plz"/>
              <F lbl="Ort" fkey="ort"/>
              <F lbl="Kanton" fkey="kanton"/>
              <F lbl="Land" fkey="land"/>
              <F lbl="E-Mail" fkey="email" type="email"/>
              <F lbl="Telefon" fkey="telefon"/>
              <F lbl="Mitgliedtyp" fkey="mitgliedtyp" opts={["Spieler","Trainer","Funktionär","Passivmitglied","Ehrenmitglied","Gönner"]}/>
              <F lbl="Funktion" fkey="funktion"/>
              <F lbl="Position" fkey="position"/>
              <F lbl="Spielerpass" fkey="spielerpass"/>
              <F lbl="AHV-Nr." fkey="ahv_nr"/>
              <F lbl="J+S Nr." fkey="js_nr"/>
              <F lbl="Datenstatus" fkey="datenstatus" opts={["Vollständig","Prüfung fällig","Unvollständig"]}/>
            </div>
            <div style={{marginTop:10}}>
              <span className="cc-label">Notizen</span>
              <textarea value={form.notizen||""} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))}
                style={{...S_INPUT,minHeight:70,resize:"vertical",width:"100%",boxSizing:"border-box",marginTop:4}}/>
            </div>
            {saveMsg&&<div style={{marginTop:8,padding:"8px 12px",borderRadius:8,background:saveMsg.ok?"#ECFDF5":RL,color:saveMsg.ok?GN:R,fontSize:13}}>{saveMsg.text}</div>}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>{setEditMode(false);setForm({...raw});setSaveMsg(null);}}
                style={{padding:"9px 18px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>
                Abbrechen
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                {saving?"Speichert…":"Speichern"}
              </button>
            </div>
          </Card>
        )}

        {/* TAB: Eltern */}
        {activeTab==="eltern"&&(
          <div style={{marginTop:12}}>
            {eltern.length===0?(
              <div className="cc-empty">Keine Elternkontakte erfasst.</div>
            ):(
              <div className="cc-list">
                {eltern.map((e,i)=>(
                  <div key={i} className="cc-list-row" style={{flexDirection:"column",alignItems:"flex-start",gap:4,cursor:"default"}}>
                    <div className="cc-list-name">{e.vorname} {e.nachname}{e.beziehung?` · ${e.beziehung}`:""}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {e.email&&<span className="cc-detail-label">✉ {e.email}</span>}
                      {e.telefon&&<span className="cc-detail-label">📞 {e.telefon}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Kader / Teams */}
        {activeTab==="teams"&&(
          <div style={{marginTop:12}}>
            {(raw.teams||[]).length===0?(
              <div className="cc-empty">Keine Team-Zuteilung.</div>
            ):(
              <div className="cc-list">
                <div className="cc-section-hdr">Zugeteilte Teams</div>
                {(raw.teams||[]).map((t,i)=>(
                  <div key={i} className="cc-list-row" style={{justifyContent:"space-between"}}>
                    <span className="cc-list-name">{t}</span>
                    <Chip text={raw.funktion||"Spieler"} color={BL}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Anwesenheiten */}
        {activeTab==="anwesenheit"&&(
          <div style={{marginTop:12}}>
            {anwLoading&&<div className="cc-empty">Wird geladen…</div>}
            {!anwLoading&&anwesenheiten===null&&!sb&&(
              <div className="cc-empty">Supabase nicht verfügbar.</div>
            )}
            {!anwLoading&&anwesenheiten!==null&&(
              anwesenheiten.length===0?(
                <div className="cc-empty">Keine Anwesenheiten erfasst.</div>
              ):(
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <div>
                      <span className="cc-detail-label">Total Einträge: </span>
                      <span style={{fontWeight:600,color:"var(--text)"}}>{anwesenheiten.length}</span>
                    </div>
                    <div style={{display:"flex",gap:16,fontSize:13}}>
                      <span style={{color:GN}}>✓ Anwesend: {anwesenheiten.filter(a=>a.status==="zu").length}</span>
                      <span style={{color:R}}>✗ Abwesend: {anwesenheiten.filter(a=>a.status==="ab").length}</span>
                    </div>
                  </div>
                  {anwesenheiten.slice(0,20).map((a,i)=>(
                    <div key={i} className="cc-list-row" style={{justifyContent:"space-between",borderTop:"0.5px solid var(--border)",borderBottom:"none"}}>
                      <div>
                        <div className="cc-list-name">{a.event_type||"Termin"}</div>
                        <div className="cc-detail-label">{a.updated_at?.split("T")[0]||"-"}</div>
                      </div>
                      <Chip
                        text={a.status==="zu"?"Anwesend":a.status==="ab"?"Abwesend":"Offen"}
                        color={a.status==="zu"?GN:a.status==="ab"?R:AM}
                      />
                    </div>
                  ))}
                  {anwesenheiten.length>20&&<div className="cc-empty" style={{padding:"8px 0"}}>+{anwesenheiten.length-20} weitere</div>}
                </Card>
              )
            )}
          </div>
        )}

        {/* TAB: Statistiken */}
        {activeTab==="statistiken"&&(
          <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:12}}>
            <div className="cc-grid-stats">
              <Stat label="Teams" value={(raw.teams||[]).length} semantic="info"/>
              <Stat label="Anwesenheiten" value={anwesenheiten?.length??"-"} semantic="neutral"/>
              <Stat label="Quote" value={anwesenheiten?Math.round((anwesenheiten.filter(a=>a.status==="zu").length/Math.max(anwesenheiten.length,1))*100)+"%":"-"} semantic="success"/>
            </div>
            <Card>
              <div className="cc-label" style={{marginBottom:8}}>Mitglied seit</div>
              <div className="cc-detail-label">{raw.created_at?new Date(raw.created_at).toLocaleDateString("de-CH"):"-"}</div>
            </Card>
          </div>
        )}

        {/* TAB: Dokumente */}
        {activeTab==="dokumente"&&(
          <Card style={{marginTop:12}}>
            <div className="cc-empty">
              Dokumentenverwaltung noch nicht verbunden.<br/>
              <span className="cc-detail-label">Dokumente können über das Dokumente-Modul verwaltet werden.</span>
            </div>
            {raw.notizen&&(
              <div className="cc-card" style={{marginTop:12,padding:"12px 14px"}}>
                <div className="cc-section-hdr" style={{marginBottom:6}}>Notizen</div>
                <div>{raw.notizen}</div>
              </div>
            )}
          </Card>
        )}

        {/* TAB: Portal-Zugang */}
        {activeTab==="portal"&&(
          <PortalZugangTab
            raw={raw} eltern={eltern} canEdit={canEdit} sb={sb}
            benutzer={benutzer} portalLoading={portalLoading}
            togglePortalZugang={togglePortalZugang}
            onReload={()=>{ if(onReload) onReload(); loadPortal(); }}
          />
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-flex-center" style={{justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <h1>Mitglieder</h1>
        {canExport&&<div style={{display:"flex",gap:8}}><Btn>Export CSV</Btn><Btn>Export Excel</Btn></div>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats" style={{marginBottom:20}}>
        <Stat label="Total" value={allMembers.length} color={BL}/>
        <Stat label="Trainer" value={allMembers.filter(m=>m.role==="Trainer").length} color={R}/>
        <Stat label="Aktivmitglieder" value={allMembers.filter(m=>m.type==="Aktivmitglied").length} color={GN}/>
        <Stat label="Datenprüfung fällig" value={allMembers.filter(m=>m.status!=="Vollständig").length} color={AM}/>
      </div>
      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:12,marginBottom:groupBy!=="none"?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Suchen nach Name, Rolle, Team…"
          style={{...inputStyle,flex:1,minWidth:180}}/>
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,minWidth:170}}>
          {GROUP_OPTIONS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>
      {/* Gruppen-Filter Chips */}
      {groupBy!=="none"&&(()=>{
        const vals=[...new Set(MEMBERS.map(m=>m[groupBy]||"-"))].sort();
        return(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
            <button onClick={()=>setFilterVals([])}
              className="cc-chip-toggle" style={{
                background:filterVals.length===0?BK:"var(--surface)",
                color:filterVals.length===0?"#fff":"var(--sub)",
                fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>
              Alle
            </button>
            {vals.map(v=>{
              const active=filterVals.includes(v);
              return(
                <button key={v} onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}
                  style={{padding:"4px 12px",borderRadius:20,
                    border:"1px solid "+(active?BK:"var(--border)"),
                    background:active?BK:"var(--surface)",
                    color:active?"#fff":"var(--sub)",
                    fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s",
                    display:"flex",alignItems:"center",gap:8}}>
                  {active&&<span style={{fontSize:11}}>✓</span>}
                  {v}
                  <span style={{opacity:0.55,fontWeight:400}}>
                    {allMembers.filter(m=>(m[groupBy]||"-")===v).length}
                  </span>
                </button>
              );
            })}
            {filterVals.length>0&&(
              <button onClick={()=>setFilterVals([])}
                className="cc-chip-toggle" style={{
                  background:"none",color:R,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                × zurücksetzen
              </button>
            )}
          </div>
        );
      })()}
      {/* Tabelle */}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table className="cc-table">
          <thead>
            <tr>
              {COLS.map(c=>(
                <th key={c.key} onClick={()=>handleSort(c.key)}
                  style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",
                    fontSize:14,textTransform:"uppercase",letterSpacing:0.4,cursor:"pointer",
                    userSelect:"none",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--sub)"}>
                  {c.label}<SortIcon col={c.key}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({key,members})=>(
              <>
                {groupBy!=="none"&&(
                  <tr key={"g-"+key}>
                    <td colSpan={6} className="cc-section-hdr" style={{
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span style={{opacity:0.6,fontWeight:400}}>({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    className="cc-tr"
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td className="cc-td">
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av name={m.name} size={28}/>
                        <span className="cc-list-name">{m.name}</span>
                      </div>
                    </td>
                    <td className="cc-td"><RolleChip rolle={m.role}/></td>
                    <td className="cc-td cc-detail-label">{m.team}</td>
                    <td className="cc-td"><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td cc-detail-label">{m.location}</td>
                    <td className="cc-td">
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── ProfilView — eigenes Profil bearbeiten ── */
function ProfilView({role, dbUser, dbMitglieder=[], sb, onReload}){
  const PASSIV=["Passivmitglied","Ehrenmitglied","Gönner"];
  const istEltern = role==="eltern";
  const mitglied = dbMitglieder.find(m=>m.email===dbUser?.email)||null;

  // Pflichtfelder je nach Typ
  const PFLICHT_AKTIV=["vorname","nachname","geburtsdatum","geschlecht","nationalitaet","strasse","plz","ort","kanton","land","email","telefon"];
  const PFLICHT_PASSIV=["vorname","nachname","geburtsdatum","geschlecht","strasse","plz","ort","telefon"];
  const PFLICHT_ELTERN=["vorname","nachname","telefon"];

  const pflichtFelder = istEltern ? PFLICHT_ELTERN
    : PASSIV.includes(mitglied?.mitgliedtyp) ? PFLICHT_PASSIV
    : PFLICHT_AKTIV;

  const FELD_LABELS={
    vorname:"Vorname",nachname:"Nachname",geburtsdatum:"Geburtsdatum",
    geschlecht:"Geschlecht",nationalitaet:"Nationalität",heimatort:"Heimatort",
    strasse:"Strasse",plz:"PLZ",ort:"Ort",kanton:"Kanton",land:"Land",
    email:"E-Mail",telefon:"Handynummer",
  };

  const initialForm = istEltern
    ? {vorname:dbUser?.vorname||"",nachname:dbUser?.nachname||"",telefon:dbUser?.telefon||""}
    : {
        vorname:mitglied?.vorname||"",nachname:mitglied?.nachname||"",
        geburtsdatum:mitglied?.geburtsdatum||"",geschlecht:mitglied?.geschlecht||"",
        nationalitaet:mitglied?.nationalitaet||"",heimatort:mitglied?.heimatort||"",
        strasse:mitglied?.strasse||"",plz:mitglied?.plz||"",ort:mitglied?.ort||"",
        kanton:mitglied?.kanton||"",land:mitglied?.land||"CH",
        email:mitglied?.email||"",telefon:mitglied?.telefon||"",
      };

  const [form,setForm]=useState(initialForm);
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);

  // Felder einmalig laden wenn dbMitglieder verfügbar
  useEffect(()=>{
    if(loaded) return; // nie überschreiben wenn User bereits tippt
    const m=dbMitglieder.find(x=>x.email===dbUser?.email)||null;
    if(!m&&!istEltern) return;
    setForm(istEltern
      ?{vorname:dbUser?.vorname||"",nachname:dbUser?.nachname||"",telefon:dbUser?.telefon||""}
      :{
        vorname:m?.vorname||"",nachname:m?.nachname||"",
        geburtsdatum:m?.geburtsdatum||"",geschlecht:m?.geschlecht||"",
        nationalitaet:m?.nationalitaet||"",heimatort:m?.heimatort||"",
        strasse:m?.strasse||"",plz:m?.plz||"",ort:m?.ort||"",
        kanton:m?.kanton||"",land:m?.land||"CH",
        email:m?.email||"",telefon:m?.telefon||"",
      }
    );
    setLoaded(true);
  },[dbMitglieder, dbUser]);

  const fehlend = pflichtFelder.filter(f=>!form[f]||String(form[f]).trim()==="");
  const istVollstaendig = fehlend.length===0;

  async function handleSave(){
    if(!sb) return;
    setSaving(true); setMsg(null);
    try{
      if(istEltern){
        // Elternteil → benutzer Tabelle updaten
        const {error}=await sb.from("benutzer").update({
          vorname:form.vorname,nachname:form.nachname,telefon:form.telefon,
          name:`${form.vorname} ${form.nachname}`.trim(),
        }).eq("id",dbUser.id);
        if(error) throw error;
      } else {
        // Mitglied → mitglieder Tabelle updaten
        if(!mitglied) throw new Error("Mitglied nicht gefunden");
        const {error}=await sb.from("mitglieder").update({
          ...form, updated_at:new Date().toISOString(),
        }).eq("id",mitglied.id);
        if(error) throw error;
      }
      setMsg({ok:true,text:"Profil gespeichert ✓"});
      setLoaded(false); // erlaubt useEffect die frischen DB-Daten zu laden
      if(onReload) onReload();
    }catch(e){ setMsg({ok:false,text:e.message}); }
    setSaving(false);
  }

  const S_INPUT={width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:"inherit",boxSizing:"border-box"};
  const F=({fkey,type="text",opts})=>{
    const isPflicht=pflichtFelder.includes(fkey);
    const isEmpty=!form[fkey]||String(form[fkey]).trim()==="";
    return(
      <div>
        <label className="cc-label" style={{color:isPflicht&&isEmpty?"#DC2626":undefined}}>
          {FELD_LABELS[fkey]||fkey}{isPflicht&&<span style={{color:"#DC2626"}}> *</span>}
        </label>
        {opts
          ?<select value={form[fkey]||""} onChange={e=>setForm(f=>({...f,[fkey]:e.target.value}))}
              style={{...S_INPUT,borderColor:isPflicht&&isEmpty?"#DC2626":undefined}}>
              <option value="">– bitte wählen –</option>
              {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
            </select>
          :<input type={type} value={form[fkey]||""} onChange={e=>setForm(f=>({...f,[fkey]:e.target.value}))}
              style={{...S_INPUT,borderColor:isPflicht&&isEmpty?"#DC2626":undefined}}/>
        }
      </div>
    );
  };

  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Mein Profil</h1>
      <p className="cc-detail-label" style={{marginBottom:20}}>
        {istVollstaendig
          ? "✓ Alle Pflichtfelder ausgefüllt"
          : `${fehlend.length} Pflichtfeld${fehlend.length>1?"er":""} fehlen: ${fehlend.map(f=>FELD_LABELS[f]||f).join(", ")}`}
      </p>

      {!istVollstaendig&&(
        <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:14,color:"#92400E"}}>
          ⚠️ Bitte fülle alle Pflichtfelder aus damit dein Profil vollständig ist.
        </div>
      )}

      <Card>
        {istEltern?(
          <div className="cc-grid-form" style={{gap:12}}>
            <F fkey="vorname"/>
            <F fkey="nachname"/>
            <div style={{gridColumn:"1/-1"}}><F fkey="telefon" type="tel"/></div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div className="cc-section-hdr" style={{marginBottom:10}}>Personalien</div>
              <div className="cc-grid-form" style={{gap:10}}>
                <F fkey="vorname"/>
                <F fkey="nachname"/>
                <F fkey="geburtsdatum" type="date"/>
                <F fkey="geschlecht" opts={[{v:"m",l:"Männlich"},{v:"w",l:"Weiblich"}]}/>
                <F fkey="nationalitaet"/>
                <F fkey="heimatort"/>
              </div>
            </div>
            <div>
              <div className="cc-section-hdr" style={{marginBottom:10}}>Adresse</div>
              <div className="cc-grid-form" style={{gap:10}}>
                <div style={{gridColumn:"1/-1"}}><F fkey="strasse"/></div>
                <F fkey="plz"/>
                <F fkey="ort"/>
                <F fkey="kanton"/>
                <F fkey="land"/>
              </div>
            </div>
            <div>
              <div className="cc-section-hdr" style={{marginBottom:10}}>Kontakt</div>
              <div className="cc-grid-form" style={{gap:10}}>
                <F fkey="email" type="email"/>
                <F fkey="telefon" type="tel"/>
              </div>
            </div>
          </div>
        )}

        {msg&&<div style={{marginTop:14,padding:"8px 12px",borderRadius:8,background:msg.ok?"#ECFDF5":"#FEF2F2",color:msg.ok?"#16A34A":"#DC2626",fontSize:13}}>{msg.text}</div>}

        <div style={{marginTop:16,display:"flex",gap:8}}>
          <button onClick={handleSave} disabled={saving||fehlend.length===0&&!msg}
            style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"var(--cc-accent,#FFBF00)",color:"var(--text)",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.7:1}}>
            {saving?"Speichert…":"Speichern"}
          </button>
        </div>
      </Card>
    </div>
  );
}

export { MembersView, ProfilView };
export default MitgliederModul;
