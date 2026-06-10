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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"9px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span style={{fontSize:14,color:"var(--sub)",flexShrink:0,minWidth:120}}>{label}</span>
      <span style={{fontSize:14,fontWeight:600,color:blue?BL:mono?"#666":BK,textAlign:"right",wordBreak:"break-word",fontFamily:mono?"monospace":"inherit"}}>{value||"-"}</span>
    </div>
  );

  const NrRow=()=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span style={{fontSize:14,color:"var(--sub)",flexShrink:0,minWidth:120}}>{"Rückennummer"}</span>
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
          {canEdit&&<span className="cc-text-sm"><TI n="edit"/></span>}
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
          <div className="cc-flex-1">
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
    ?<span style={{marginLeft:4,fontSize:11}}>{sortDir==="asc"?"▲":"▼"}</span>
    :<span style={{marginLeft:4,fontSize:11,opacity:0.25}}>↕</span>;

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Detail-Modal ── */
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const eltern=raw.eltern||[];
    const fv=getFieldVisibility(role);
    const tab=selectedMember?._tab||"info";
    const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
    const canEdit=role==="administrator"||role==="administration";
    const [portalLoading,setPortalLoading]=useState(false);
    const [benutzer,setBenutzer]=useState(null);
    const [portalMsg,setPortalMsg]=useState(null);
    const [linkEmail,setLinkEmail]=useState(raw.email||"");

    const age=raw.geburtsdatum?Math.floor((new Date()-new Date(raw.geburtsdatum))/31557600000):null;
    const initials=m.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

    useEffect(()=>{
      if(tab==="portal"&&sb&&raw.id){
        setPortalLoading(true);
        sb.from("benutzer").select("*").eq("mitglied_id",raw.id).maybeSingle()
          .then(({data})=>{setBenutzer(data);setPortalLoading(false);});
      }
    },[tab,raw.id]);

    async function handleLink(){
      if(!sb||!linkEmail) return;
      setPortalLoading(true); setPortalMsg(null);
      const {data:existing}=await sb.from("benutzer").select("id,email").eq("email",linkEmail).maybeSingle();
      if(existing){
        await sb.from("mitglieder").update({hat_portal_zugang:true}).eq("id",raw.id);
        await sb.from("benutzer").update({mitglied_id:raw.id}).eq("id",existing.id);
        setPortalMsg({ok:true,text:"Verknüpft ✓"});
        if(onReload) onReload();
      } else {
        setPortalMsg({ok:false,text:"Kein Benutzer mit dieser E-Mail gefunden."});
      }
      setPortalLoading(false);
    }

    async function handleUnlink(){
      if(!sb) return;
      await sb.from("mitglieder").update({hat_portal_zugang:false}).eq("id",raw.id);
      await sb.from("benutzer").update({mitglied_id:null}).eq("mitglied_id",raw.id);
      setBenutzer(null); setPortalMsg({ok:true,text:"Verknüpfung aufgehoben"});
      if(onReload) onReload();
    }

    return(
      <div>
        {/* Hero Header */}
        <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
          <div style={{height:6,background:"var(--cc-accent,#FFBF00)"}}/>
          <div className="cc-row" style={{padding:"24px 28px",alignItems:"flex-start",gap:20,flexWrap:"wrap"}}>
            {/* Avatar */}
            <div style={{width:80,height:80,borderRadius:16,background:"var(--avatar-bg,var(--cc-accent,#FFBF00))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:"var(--cc-avatar-text,#000)",flexShrink:0,position:"relative"}}>
              {initials}
              {raw.rueckennr&&<div className="cc-profile-nr">#{raw.rueckennr}</div>}
            </div>
            {/* Meta */}
            <div style={{flex:1,minWidth:0}}>
              <Btn variant="ghost" small onClick={onClose} style={{marginLeft:-8,marginBottom:4}}><TI n="arrow-left"/>Zurück</Btn>
              <h1 className="cc-profile-name">{m.name}</h1>
              <div className="cc-row" style={{flexWrap:"wrap",gap:6}}>
                <Chip text={m.role} color={R}/>
                {raw.position&&<Chip text={raw.position} color={BL}/>}
                <Chip text={m.type} color={"#7C3AED"}/>
                <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                {m.hat_portal_zugang&&<span className="cc-badge cc-badge-success"><TI n="circle-check" size={11}/> Portal</span>}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="cc-row" style={{gap:20,flexShrink:0,alignItems:"flex-start"}}>
              {m.team&&<div style={{textAlign:"center"}}>
                <div className="cc-label" style={{marginBottom:2}}>Team</div>
                <div className="cc-text-bold">{m.team}</div>
              </div>}
              {age&&<div style={{textAlign:"center"}}>
                <div className="cc-label" style={{marginBottom:2}}>Alter</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--text)",lineHeight:1}}>{age}</div>
              </div>}
            </div>
          </div>
          {/* Tabs mit cc-seg */}
          <div style={{borderTop:"0.5px solid var(--border)",padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
            {[
              {key:"info",    label:"Profil",     icon:"user"},
              {key:"eltern",  label:`Eltern (${eltern.length})`,icon:"heart"},
              ...(canEdit?[{key:"portal",label:"Portal-Zugang",icon:"key"}]:[]),
              {key:"stats",   label:"Statistik",  icon:"chart-bar",soon:true},
              {key:"comments",label:"Kommentare", icon:"message",  soon:true},
              {key:"ratings", label:"Bewertungen",icon:"star",     soon:true},
            ].map(t=>(
              <button key={t.key} onClick={()=>!t.soon&&setTab(t.key)}
                style={{padding:"12px 16px",border:"none",background:"none",
                  cursor:t.soon?"default":"pointer",fontFamily:"inherit",
                  fontSize:13,fontWeight:tab===t.key?600:400,
                  color:tab===t.key?"var(--text)":t.soon?"var(--border)":"var(--sub)",
                  borderBottom:tab===t.key?"2px solid var(--cc-accent,#FFBF00)":"2px solid transparent",
                  display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",transition:"color 0.1s"}}>
                <TI n={t.icon} size={14}/>{t.label}
                {t.soon&&<span style={{fontSize:9,background:"var(--surface2)",color:"var(--sub)",padding:"1px 5px",borderRadius:8,marginLeft:2}}>bald</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Tab: Profil */}
        {tab==="info"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Personalien */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
              {[
                {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
                {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
                ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum||"-"},{l:"Alter",v:age?age+" Jahre":"-"}]:[]),
                {l:"Nationalität", v:raw.nationalitaet||"-"},
                {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":"-"},
              ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </Card>
            {/* Kontakt */}
            {fv.showEmail||fv.showTelefon||fv.showAdresse?(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
                {[
                  ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||"-"}]:[]),
                  ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||"-"}]:[]),
                  ...(fv.showAdresse?[
                    {l:"Strasse",v:raw.strasse||"-"},
                    {l:"PLZ/Ort",v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
                  ]:[]),
                ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </Card>
            ):null}
            {/* Vereinsdaten */}
            <Card>
              <div className="cc-section-title"><TI n="shirt" size={14}/> Vereinsdaten</div>
              {[
                {l:"Mitgliedtyp",  v:m.type},
                {l:"Funktion",     v:m.role},
                {l:"Team(s)",      v:m.team},
                {l:"Position",     v:raw.position||"-"},
                {l:"Rückennummer", v:raw.rueckennr?`#${raw.rueckennr}`:"-"},
                ...(fv.showPass?[{l:"Spielerpass",v:raw.spielerpass||"-"}]:[]),
                ...(fv.showPass?[{l:"J+S Nr.",    v:raw.js_nr||"-"}]:[]),
                ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
              ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </Card>
            {/* Notizen */}
            {fv.showNotizen&&raw.notizen&&(
              <Card>
                <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
                <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>{raw.notizen}</div>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Eltern */}
        {tab==="eltern"&&(
          <div className="cc-col cc-gap-8">
            {eltern.length===0&&<div className="cc-empty">Keine Elternkontakte erfasst.</div>}
            {eltern.map((e,i)=>{
              const name=e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
              const tel=e.telefon||e.tel;
              return(
                <Card key={i}>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <Av name={name} size={48}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <div className="cc-text-bold" style={{fontSize:15}}>{name}</div>
                        {e.beziehung&&<span className="cc-badge cc-badge-neutral"><TI n="users" size={10}/> {e.beziehung}</span>}
                        {e.benutzer_id
                          ?<span className="cc-badge cc-badge-success"><TI n="circle-check" size={10}/> Portal verknüpft</span>
                          :<span className="cc-badge cc-badge-neutral" style={{color:"var(--sub)"}}>Nicht verknüpft</span>
                        }
                      </div>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        {e.email&&(
                          <a href={`mailto:${e.email}`} className="cc-contact-link">
                            <TI n="mail" size={13}/>{e.email}
                          </a>
                        )}
                        {tel&&(
                          <a href={`tel:${tel}`} className="cc-contact-link-muted">
                            <TI n="phone" size={13}/>{tel}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab: Portal-Zugang */}
        {tab==="portal"&&canEdit&&(
          <div className="cc-col cc-gap-12">
            <Card>
              <div className="cc-between cc-mb-12">
                <div className="cc-text-bold" style={{fontSize:15}}>Portal-Zugang</div>
                <Chip text={raw.hat_portal_zugang?"Aktiv":"Kein Zugang"} color={raw.hat_portal_zugang?GN:R} bg={raw.hat_portal_zugang?"#ECFDF5":RL}/>
              </div>
              {raw.hat_portal_zugang&&benutzer&&(
                <div className="cc-col cc-gap-8 cc-mb-12">
                  {[
                    {l:"E-Mail",   v:benutzer.email||"-"},
                    {l:"Rolle",    v:benutzer.role||"-"},
                    {l:"Erstellt", v:benutzer.created_at?new Date(benutzer.created_at).toLocaleDateString("de-CH"):"-"},
                  ].map((r,i)=>(
                    <div key={i} className="cc-info-row">
                      <span className="cc-info-key">{r.l}</span>
                      <span className="cc-info-val">{r.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"}`} style={{marginBottom:12}}>{portalMsg.text}</div>}
              {raw.hat_portal_zugang
                ?<button className="cc-btn-danger cc-w-full" onClick={handleUnlink}>Verknüpfung aufheben</button>
                :(
                  <div className="cc-col cc-gap-8">
                    <label className="cc-label">E-Mail des Benutzers</label>
                    <input className="cc-input" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="email@example.com"/>
                    <button className="cc-btn-success cc-w-full" onClick={handleLink} disabled={!linkEmail||portalLoading}>
                      {portalLoading?"Wird verknüpft…":"Mit Portal verknüpfen"}
                    </button>
                  </div>
                )
              }
            </Card>
            {/* Eltern Portal-Status */}
            {eltern.length>0&&(
              <Card>
                <div className="cc-text-bold cc-mb-12">Eltern Portal-Status</div>
                {eltern.map((e,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{e.name||`${e.vorname} ${e.nachname}`}</span>
                    <span>{e.benutzer_id
                      ?<span className="cc-badge cc-badge-success"><TI n="circle-check" size={10}/> Verknüpft</span>
                      :<span className="cc-badge cc-badge-neutral">Nicht verknüpft</span>
                    }</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Platzhalter Tabs */}
        {(tab==="stats"||tab==="comments"||tab==="ratings")&&(
          <div className="cc-empty" style={{padding:60}}>
            <TI n="hourglass" size={32} style={{color:"var(--border)",display:"block",margin:"0 auto 12px"}}/>
            Kommt bald
          </div>
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-page-hdr">
        <h1 style={{fontSize:21,fontWeight:800,margin:0,color:"var(--text)"}}>Mitglieder</h1>
        {canExport&&<Row align="flex-start"><Btn>Export CSV</Btn><Btn>Export Excel</Btn></Row>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats cc-mb-20">
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
        <div className="cc-table-wrap"><table className="cc-table">
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {COLS.map(c=>(
                <th className="cc-th" key={c.key} onClick={()=>handleSort(c.key)}
                  style={{cursor:"pointer",userSelect:"none"}}
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
                    <td colSpan={6} style={{padding:"10px 13px 6px",background:"var(--surface2)",
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span style={{fontWeight:400,opacity:0.6}}>({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    style={{borderTop:"0.5px solid var(--border)",cursor:"pointer"}}>
                    <td className="cc-td" style={{padding:"9px 13px"}}>
                      <Row>
                        <Av name={m.name} size={28}/>
                        <span style={{fontWeight:600,color:"var(--text)"}}>{m.name}</span>
                      </Row>
                    </td>
                    <td className="cc-td" style={{padding:"9px 13px"}}><RolleChip rolle={m.role}/></td>
                    <td className="cc-td" style={{padding:"9px 13px",color:"var(--sub)"}}>{m.team}</td>
                    <td className="cc-td" style={{padding:"9px 13px"}}><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td" style={{padding:"9px 13px",color:"var(--sub)"}}>{m.location}</td>
                    <td className="cc-td" style={{padding:"9px 13px"}}>
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table></div>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

function MembersView({role,dbMitglieder=[],kannSchreiben,kannVerwalten}){
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
    ?<span style={{marginLeft:4,fontSize:11}}>{sortDir==="asc"?"▲":"▼"}</span>
    :<span style={{marginLeft:4,fontSize:11,opacity:0.25}}>↕</span>;

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Detail-Modal ── */
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const eltern=raw.eltern||[];
    const fv=getFieldVisibility(role);
    const tab=selectedMember?._tab||"info";
    const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
    const canEdit=role==="administrator"||role==="administration";
    const [portalLoading,setPortalLoading]=useState(false);
    const [benutzer,setBenutzer]=useState(null);
    const [portalMsg,setPortalMsg]=useState(null);
    const [linkEmail,setLinkEmail]=useState(raw.email||"");

    const age=raw.geburtsdatum?Math.floor((new Date()-new Date(raw.geburtsdatum))/31557600000):null;
    const initials=m.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

    useEffect(()=>{
      if(tab==="portal"&&sb&&raw.id){
        setPortalLoading(true);
        sb.from("benutzer").select("*").eq("mitglied_id",raw.id).maybeSingle()
          .then(({data})=>{setBenutzer(data);setPortalLoading(false);});
      }
    },[tab,raw.id]);

    async function handleLink(){
      if(!sb||!linkEmail) return;
      setPortalLoading(true); setPortalMsg(null);
      const {data:existing}=await sb.from("benutzer").select("id,email").eq("email",linkEmail).maybeSingle();
      if(existing){
        await sb.from("mitglieder").update({hat_portal_zugang:true}).eq("id",raw.id);
        await sb.from("benutzer").update({mitglied_id:raw.id}).eq("id",existing.id);
        setPortalMsg({ok:true,text:"Verknüpft ✓"});
        if(onReload) onReload();
      } else {
        setPortalMsg({ok:false,text:"Kein Benutzer mit dieser E-Mail gefunden."});
      }
      setPortalLoading(false);
    }

    async function handleUnlink(){
      if(!sb) return;
      await sb.from("mitglieder").update({hat_portal_zugang:false}).eq("id",raw.id);
      await sb.from("benutzer").update({mitglied_id:null}).eq("mitglied_id",raw.id);
      setBenutzer(null); setPortalMsg({ok:true,text:"Verknüpfung aufgehoben"});
      if(onReload) onReload();
    }

    return(
      <div>
        {/* Hero Header */}
        <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
          <div style={{height:6,background:"var(--cc-accent,#FFBF00)"}}/>
          <div className="cc-row" style={{padding:"24px 28px",alignItems:"flex-start",gap:20,flexWrap:"wrap"}}>
            {/* Avatar */}
            <div style={{width:80,height:80,borderRadius:16,background:"var(--avatar-bg,var(--cc-accent,#FFBF00))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:"var(--cc-avatar-text,#000)",flexShrink:0,position:"relative"}}>
              {initials}
              {raw.rueckennr&&<div className="cc-profile-nr">#{raw.rueckennr}</div>}
            </div>
            {/* Meta */}
            <div style={{flex:1,minWidth:0}}>
              <Btn variant="ghost" small onClick={onClose} style={{marginLeft:-8,marginBottom:4}}><TI n="arrow-left"/>Zurück</Btn>
              <h1 className="cc-profile-name">{m.name}</h1>
              <div className="cc-row" style={{flexWrap:"wrap",gap:6}}>
                <Chip text={m.role} color={R}/>
                {raw.position&&<Chip text={raw.position} color={BL}/>}
                <Chip text={m.type} color={"#7C3AED"}/>
                <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                {m.hat_portal_zugang&&<span className="cc-badge cc-badge-success"><TI n="circle-check" size={11}/> Portal</span>}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="cc-row" style={{gap:20,flexShrink:0,alignItems:"flex-start"}}>
              {m.team&&<div style={{textAlign:"center"}}>
                <div className="cc-label" style={{marginBottom:2}}>Team</div>
                <div className="cc-text-bold">{m.team}</div>
              </div>}
              {age&&<div style={{textAlign:"center"}}>
                <div className="cc-label" style={{marginBottom:2}}>Alter</div>
                <div style={{fontSize:22,fontWeight:700,color:"var(--text)",lineHeight:1}}>{age}</div>
              </div>}
            </div>
          </div>
          {/* Tabs mit cc-seg */}
          <div style={{borderTop:"0.5px solid var(--border)",padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
            {[
              {key:"info",    label:"Profil",     icon:"user"},
              {key:"eltern",  label:`Eltern (${eltern.length})`,icon:"heart"},
              ...(canEdit?[{key:"portal",label:"Portal-Zugang",icon:"key"}]:[]),
              {key:"stats",   label:"Statistik",  icon:"chart-bar",soon:true},
              {key:"comments",label:"Kommentare", icon:"message",  soon:true},
              {key:"ratings", label:"Bewertungen",icon:"star",     soon:true},
            ].map(t=>(
              <button key={t.key} onClick={()=>!t.soon&&setTab(t.key)}
                style={{padding:"12px 16px",border:"none",background:"none",
                  cursor:t.soon?"default":"pointer",fontFamily:"inherit",
                  fontSize:13,fontWeight:tab===t.key?600:400,
                  color:tab===t.key?"var(--text)":t.soon?"var(--border)":"var(--sub)",
                  borderBottom:tab===t.key?"2px solid var(--cc-accent,#FFBF00)":"2px solid transparent",
                  display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",transition:"color 0.1s"}}>
                <TI n={t.icon} size={14}/>{t.label}
                {t.soon&&<span style={{fontSize:9,background:"var(--surface2)",color:"var(--sub)",padding:"1px 5px",borderRadius:8,marginLeft:2}}>bald</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Tab: Profil */}
        {tab==="info"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Personalien */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
              {[
                {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
                {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
                ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum||"-"},{l:"Alter",v:age?age+" Jahre":"-"}]:[]),
                {l:"Nationalität", v:raw.nationalitaet||"-"},
                {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":"-"},
              ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </Card>
            {/* Kontakt */}
            {fv.showEmail||fv.showTelefon||fv.showAdresse?(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
                {[
                  ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||"-"}]:[]),
                  ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||"-"}]:[]),
                  ...(fv.showAdresse?[
                    {l:"Strasse",v:raw.strasse||"-"},
                    {l:"PLZ/Ort",v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
                  ]:[]),
                ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </Card>
            ):null}
            {/* Vereinsdaten */}
            <Card>
              <div className="cc-section-title"><TI n="shirt" size={14}/> Vereinsdaten</div>
              {[
                {l:"Mitgliedtyp",  v:m.type},
                {l:"Funktion",     v:m.role},
                {l:"Team(s)",      v:m.team},
                {l:"Position",     v:raw.position||"-"},
                {l:"Rückennummer", v:raw.rueckennr?`#${raw.rueckennr}`:"-"},
                ...(fv.showPass?[{l:"Spielerpass",v:raw.spielerpass||"-"}]:[]),
                ...(fv.showPass?[{l:"J+S Nr.",    v:raw.js_nr||"-"}]:[]),
                ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
              ].filter(r=>r.v&&r.v!=="-").map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </Card>
            {/* Notizen */}
            {fv.showNotizen&&raw.notizen&&(
              <Card>
                <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
                <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6}}>{raw.notizen}</div>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Eltern */}
        {tab==="eltern"&&(
          <div className="cc-col cc-gap-8">
            {eltern.length===0&&<div className="cc-empty">Keine Elternkontakte erfasst.</div>}
            {eltern.map((e,i)=>{
              const name=e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
              const tel=e.telefon||e.tel;
              return(
                <Card key={i}>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <Av name={name} size={48}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <div className="cc-text-bold" style={{fontSize:15}}>{name}</div>
                        {e.beziehung&&<span className="cc-badge cc-badge-neutral"><TI n="users" size={10}/> {e.beziehung}</span>}
                        {e.benutzer_id
                          ?<span className="cc-badge cc-badge-success"><TI n="circle-check" size={10}/> Portal verknüpft</span>
                          :<span className="cc-badge cc-badge-neutral" style={{color:"var(--sub)"}}>Nicht verknüpft</span>
                        }
                      </div>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        {e.email&&(
                          <a href={`mailto:${e.email}`} className="cc-contact-link">
                            <TI n="mail" size={13}/>{e.email}
                          </a>
                        )}
                        {tel&&(
                          <a href={`tel:${tel}`} className="cc-contact-link-muted">
                            <TI n="phone" size={13}/>{tel}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab: Portal-Zugang */}
        {tab==="portal"&&canEdit&&(
          <div className="cc-col cc-gap-12">
            <Card>
              <div className="cc-between cc-mb-12">
                <div className="cc-text-bold" style={{fontSize:15}}>Portal-Zugang</div>
                <Chip text={raw.hat_portal_zugang?"Aktiv":"Kein Zugang"} color={raw.hat_portal_zugang?GN:R} bg={raw.hat_portal_zugang?"#ECFDF5":RL}/>
              </div>
              {raw.hat_portal_zugang&&benutzer&&(
                <div className="cc-col cc-gap-8 cc-mb-12">
                  {[
                    {l:"E-Mail",   v:benutzer.email||"-"},
                    {l:"Rolle",    v:benutzer.role||"-"},
                    {l:"Erstellt", v:benutzer.created_at?new Date(benutzer.created_at).toLocaleDateString("de-CH"):"-"},
                  ].map((r,i)=>(
                    <div key={i} className="cc-info-row">
                      <span className="cc-info-key">{r.l}</span>
                      <span className="cc-info-val">{r.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"}`} style={{marginBottom:12}}>{portalMsg.text}</div>}
              {raw.hat_portal_zugang
                ?<button className="cc-btn-danger cc-w-full" onClick={handleUnlink}>Verknüpfung aufheben</button>
                :(
                  <div className="cc-col cc-gap-8">
                    <label className="cc-label">E-Mail des Benutzers</label>
                    <input className="cc-input" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="email@example.com"/>
                    <button className="cc-btn-success cc-w-full" onClick={handleLink} disabled={!linkEmail||portalLoading}>
                      {portalLoading?"Wird verknüpft…":"Mit Portal verknüpfen"}
                    </button>
                  </div>
                )
              }
            </Card>
            {/* Eltern Portal-Status */}
            {eltern.length>0&&(
              <Card>
                <div className="cc-text-bold cc-mb-12">Eltern Portal-Status</div>
                {eltern.map((e,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{e.name||`${e.vorname} ${e.nachname}`}</span>
                    <span>{e.benutzer_id
                      ?<span className="cc-badge cc-badge-success"><TI n="circle-check" size={10}/> Verknüpft</span>
                      :<span className="cc-badge cc-badge-neutral">Nicht verknüpft</span>
                    }</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Platzhalter Tabs */}
        {(tab==="stats"||tab==="comments"||tab==="ratings")&&(
          <div className="cc-empty" style={{padding:60}}>
            <TI n="hourglass" size={32} style={{color:"var(--border)",display:"block",margin:"0 auto 12px"}}/>
            Kommt bald
          </div>
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-page-hdr">
        <h1 style={{fontSize:21,fontWeight:800,margin:0,color:"var(--text)"}}>Mitglieder</h1>
        {canExport&&<div style={{display:"flex",gap:8}}><Btn>Export CSV</Btn><Btn>Export Excel</Btn></div>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats cc-mb-20">
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
              style={{padding:"4px 12px",borderRadius:20,border:"1px solid var(--border)",
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
                style={{padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)",
                  background:"none",color:R,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                × zurücksetzen
              </button>
            )}
          </div>
        );
      })()}
      {/* Tabelle */}
      <Card style={{padding:0,overflowX:"auto"}}>
        <div className="cc-table-wrap"><table className="cc-table">
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {COLS.map(c=>(
                <th className="cc-th" key={c.key} onClick={()=>handleSort(c.key)}
                  style={{cursor:"pointer",userSelect:"none"}}
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
                    <td colSpan={6} style={{padding:"10px 13px 6px",background:"var(--surface2)",
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span style={{fontWeight:400,opacity:0.6}}>({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    style={{borderTop:"0.5px solid var(--border)",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td className="cc-td" style={{padding:"9px 13px"}}>
                      <div className="cc-row">
                        <Av name={m.name} size={28}/>
                        <span style={{fontWeight:600,color:"var(--text)"}}>{m.name}</span>
                      </div>
                    </td>
                    <td className="cc-td" style={{padding:"9px 13px"}}><RolleChip rolle={m.role}/></td>
                    <td className="cc-td" style={{padding:"9px 13px",color:"var(--sub)"}}>{m.team}</td>
                    <td className="cc-td" style={{padding:"9px 13px"}}><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td" style={{padding:"9px 13px",color:"var(--sub)"}}>{m.location}</td>
                    <td className="cc-td" style={{padding:"9px 13px"}}>
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table></div>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

export { MembersView };
export default MitgliederModul;
