/* ═══════════════════════════════════════════════════════════════
   ClubCampus TeamsVerwaltungModul — TeamsVerwaltungModul.jsx
   Team-Verwaltung für Administratoren
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, ACCENT20, GN, R, RL, BL, AM, BK } from "./constants";
import { TI } from "./icons.jsx";
import { useIsMobile, ModalOrSheet, Btn, Chip , Av, Stat, Col, Row, ModalTitle} from "./theme.jsx";
import { MEMBERS, ROSTER } from "./demoData.js";

/* ── Hilfsfunktionen & Konstanten ── */
function PersonPicker({value,onChange,placeholder="Person suchen…",style={}}){
  const [q,setQ]=useState(value||"");
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{ setQ(value||""); },[value]);
  useEffect(()=>{
    const fn=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[]);

  const suggestions=q.length>0
    ? MEMBERS.filter(m=>m.name.toLowerCase().includes(q.toLowerCase())).slice(0,8)
    : MEMBERS.filter(m=>m.role==="Trainer"||m.role==="Vorstand").slice(0,8);

  function select(name){ setQ(name); onChange(name); setOpen(false); }

  return(
    <div ref={ref} style={{position:"relative",...style}}>
      <input
        value={q}
        onChange={e=>{ setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder}
        style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,
          fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",
          boxSizing:"border-box",outline:"none"}}
      />
      {open&&suggestions.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,
          boxShadow:"0 4px 16px rgba(0,0,0,0.12)",overflow:"hidden"}}>
          {suggestions.map(m=>(
            <Btn variant="ghost"><Av name={m.name} size={26} bg="var(--surface2)"/> <div> <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{m.name}</div> <div style={{fontSize:11,color:"var(--sub)"}}>{m.role}{m.team&&m.team!=="-"?" · "+m.team:""}</div> </div></Btn>
          ))}
        </div>
      )}
    </div>
  );
}

function SkelCard(){
  return(
    <div className="cc-card" style={{borderRadius:14,padding:"20px 22px",border:"0.5px solid"}}>
      <Skel h={10} w="38%" br={4} mb={14}/>
      <Skel h={30} w="55%" br={6} mb={8}/>
      <Skel h={10} w="72%" br={4}/>
    </div>
  );
}

const TEAM_HIERARCHY={
  "Aktivfussball":{
    "Aktive Herren":  ["Aktive Herren"],
    "Aktive Frauen":  ["Aktive Frauen"],
  },
  "Juniorenfussball":{
    "Junioren A":["Junioren A"],
    "Junioren B":["Junioren B"],
    "Junioren C":["Junioren C"],
    "Junioren D":["Junioren D-9","Junioren D-7"],
  },
  "Kinderfussball Junioren":{
    "Junioren E":["Junioren E"],
    "Junioren F":["Junioren F"],
    "Junioren G":["Junioren G"],
  },
  "Juniorinnenfussball":{
    "Juniorinnen B / FF-21":["Juniorinnen FF-21"],
    "Juniorinnen C / FF-17":["Juniorinnen FF-17"],
    "Juniorinnen D / FF-14":["Juniorinnen FF-14 9v9","Juniorinnen FF-14 7v7","Juniorinnen FF-14"],
  },
  "Kinderfussball Juniorinnen":{
    "Juniorinnen E / FF-11":["Juniorinnen FF-11"],
    "Juniorinnen F / FF-9": ["Juniorinnen FF-9"],
    "Juniorinnen G / FF-7": ["Juniorinnen FF-7"],
  },
  "Seniorenfussball":{
    "Senioren 30+":["Senioren 30+"],
    "Senioren 40+":["Senioren 40+"],
    "Senioren 50+":["Senioren 50+"],
    "Senioren 60+":["Senioren 60+"],
  },
};

function TeamsVerwaltungModul({sb,dbTeams=[],setDbTeams,dbStufen=[],setDbStufen,setCustomBack,TeamViewComponent=null}){
  const EMPTY={stufe_id:null,stufe_ebene1:"",stufe_ebene2:"",stufe_ebene3_id:null,hauptbereich:"Juniorenfussball",vereinsstufe:"Junioren C",verbandskategorie:"",name:"",kurzname:"",stufenleitung:"",liga:"",saison:"2024/25",haupttrainer:[],co_trainers:[],staff:[],aktiv:true,beschreibung:""};
  const FALLBACK=[
    /* Aktivfussball – Aktive Herren */
    {id:1, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"1. Mannschaft",    kurzname:"FCH 1",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"1. Liga",           saison:"2024/25",haupttrainer:["Hans Muster"],  co_trainers:[],staff:[],aktiv:true},
    {id:2, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"2. Mannschaft",    kurzname:"FCH 2",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"2. Liga",           saison:"2024/25",haupttrainer:["Peter Meier"], co_trainers:[],staff:[],aktiv:true},
    {id:3, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"3. Mannschaft",    kurzname:"FCH 3",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"3. Liga",           saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:4, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"4. Mannschaft",    kurzname:"FCH 4",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"4. Liga",           saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Aktivfussball – Aktive Frauen */
    {id:5, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Frauen",        verbandskategorie:"Aktive Frauen",       name:"1. Mannschaft - Frauen",kurzname:"Frauen 1",stufenleitung:"Stufenleitung Aktive Frauen",liga:"Frauen 2. Liga",    saison:"2024/25",haupttrainer:["Anna Koch"],   co_trainers:[],staff:[],aktiv:true},
    /* Juniorenfussball */
    {id:6, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren A",           verbandskategorie:"Junioren A",          name:"A-Junioren",       kurzname:"A",        stufenleitung:"Stufenleitung Junioren A",      liga:"U16 Liga A",        saison:"2024/25",haupttrainer:["Beat Huber"],  co_trainers:[],staff:[],aktiv:true},
    {id:7, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Ba-Junioren",      kurzname:"Ba",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga A",        saison:"2024/25",haupttrainer:["Marc Rüegg"],  co_trainers:[],staff:[],aktiv:true},
    {id:8, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Bb-Junioren",      kurzname:"Bb",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga B",        saison:"2024/25",haupttrainer:["Simon Baur"],  co_trainers:[],staff:[],aktiv:true},
    {id:9, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Bc-Junioren",      kurzname:"Bc",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga C",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:10,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Ca-Junioren",      kurzname:"Ca",       stufenleitung:"Stufenleitung Junioren C",      liga:"U13 Liga A",        saison:"2024/25",haupttrainer:["Leo Frei"],    co_trainers:[],staff:[],aktiv:true},
    {id:11,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Cb-Junioren",      kurzname:"Cb",       stufenleitung:"Stufenleitung Junioren C",      liga:"U13 Liga B",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:12,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Cc-Junioren",      kurzname:"Cc",       stufenleitung:"Stufenleitung Junioren C",      liga:"U12 Liga A",        saison:"2024/25",haupttrainer:["Daniel Vogel"],co_trainers:["Urs Berger"],staff:[],aktiv:true},
    {id:13,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-9",        name:"Da-Junioren",      kurzname:"Da",       stufenleitung:"Stufenleitung Junioren D",      liga:"U11 Liga A",        saison:"2024/25",haupttrainer:["Reto Müller"], co_trainers:[],staff:[],aktiv:true},
    {id:14,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-9",        name:"Db-Junioren",      kurzname:"Db",       stufenleitung:"Stufenleitung Junioren D",      liga:"U11 Liga B",        saison:"2024/25",haupttrainer:["Sandro Kalt"], co_trainers:[],staff:[],aktiv:true},
    {id:15,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"Dc-Junioren",      kurzname:"Dc",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:16,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"Dd-Junioren",      kurzname:"Dd",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:17,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"De-Junioren",      kurzname:"De",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Kinderfussball Junioren */
    {id:18,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ea-Junioren",      kurzname:"Ea",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:19,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Eb-Junioren",      kurzname:"Eb",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:20,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ec-Junioren",      kurzname:"Ec",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:21,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ed-Junioren",      kurzname:"Ed",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:22,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"E-Pool",           kurzname:"E-Pool",   stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:23,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren F",           verbandskategorie:"Junioren F",          name:"F1-Junioren",      kurzname:"F1",       stufenleitung:"Stufenleitung Junioren F",      liga:"U8",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:24,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren F",           verbandskategorie:"Junioren F",          name:"F2-Junioren",      kurzname:"F2",       stufenleitung:"Stufenleitung Junioren F",      liga:"U8",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:25,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren G",           verbandskategorie:"Junioren G",          name:"G1-Junioren",      kurzname:"G1",       stufenleitung:"Stufenleitung Junioren G",      liga:"U7",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:26,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren G",           verbandskategorie:"Junioren G",          name:"G2-Junioren",      kurzname:"G2",       stufenleitung:"Stufenleitung Junioren G",      liga:"U7",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Juniorinnenfussball */
    {id:27,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"Ba-Juniorinnen",   kurzname:"Ba-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:["Eva Steiner"], co_trainers:[],staff:[],aktiv:true},
    {id:28,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"Bb-Juniorinnen",   kurzname:"Bb-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:29,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"B-Juniorinnen",    kurzname:"B-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:30,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"Ca-Juniorinnen",   kurzname:"Ca-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:31,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"Cb-Juniorinnen",   kurzname:"Cb-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:32,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"C-Juniorinnen",    kurzname:"C-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:["Nina Wirth"],  co_trainers:[],staff:[],aktiv:true},
    {id:33,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14 9v9",name:"Da-Juniorinnen",  kurzname:"Da-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:34,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14 7v7",name:"Db-Juniorinnen",  kurzname:"Db-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:35,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14",   name:"D-Juniorinnen",    kurzname:"D-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Kinderfussball Juniorinnen */
    {id:36,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen E / FF-11",verbandskategorie:"Juniorinnen FF-11",name:"E-Juniorinnen",   kurzname:"E-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U9 Mädchen",        saison:"2024/25",haupttrainer:["Lea Bucher"],  co_trainers:[],staff:[],aktiv:true},
    {id:37,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen F / FF-9", verbandskategorie:"Juniorinnen FF-9", name:"F-Juniorinnen",   kurzname:"F-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U8 Mädchen",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:38,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen G / FF-7", verbandskategorie:"Juniorinnen FF-7", name:"G-Juniorinnen",   kurzname:"G-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U7 Mädchen",        saison:"2024/25",haupttrainer:["Sara Lüscher"],co_trainers:[],staff:[],aktiv:true},
    /* Seniorenfussball */
    {id:39,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 30+",         verbandskategorie:"Senioren 30+",        name:"Senioren 30+",     kurzname:"30+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:40,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 40+",         verbandskategorie:"Senioren 40+",        name:"Senioren 40+",     kurzname:"40+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:41,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 50+",         verbandskategorie:"Senioren 50+",        name:"Senioren 50+",     kurzname:"50+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:42,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 60+",         verbandskategorie:"Senioren 60+",        name:"Senioren 60+",     kurzname:"60+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
  ];
  const [localTeams,setLocalTeams]=useState(FALLBACK);
  /* Nutze dbTeams wenn geladen, sonst localTeams */
  const teams = dbTeams.length>0 ? dbTeams : localTeams;
  const setTeams = dbTeams.length>0
    ? (fn)=>{ const next=typeof fn==="function"?fn(dbTeams):fn; if(setDbTeams) setDbTeams(next); }
    : setLocalTeams;

  /* Stufen-Helfer: aus DB oder TEAM_HIERARCHY als Fallback */
  const stufen1 = dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===1).sort((a,b)=>a.sortorder-b.sortorder)
    : Object.keys(TEAM_HIERARCHY).map((n,i)=>({id:n,name:n,ebene:1,sortorder:i}));
  const getStufen2=(e1id)=> dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===2&&s.parent_id===e1id).sort((a,b)=>a.sortorder-b.sortorder)
    : Object.keys(TEAM_HIERARCHY[e1id]||{}).map((n,i)=>({id:n,name:n,ebene:2,sortorder:i,stufenleitung:""}));
  const getStufen3=(e2id)=> dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===3&&s.parent_id===e2id).sort((a,b)=>a.sortorder-b.sortorder)
    : (()=>{
        for(const [hb,vs] of Object.entries(TEAM_HIERARCHY)){
          for(const [vs2,cats] of Object.entries(vs)){
            if(vs2===e2id) return cats.map((n,i)=>({id:n,name:n,ebene:3,sortorder:i}));
          }
        }
        return [];
      })();
  /* Stufe-ID → Pfad-Objekte {e1,e2,e3} */
  function getStufePath(team){
    if(dbStufen.length>0 && team.stufe_id){
      const e3=dbStufen.find(s=>s.id===team.stufe_id);
      const e2=e3?dbStufen.find(s=>s.id===e3.parent_id):null;
      const e1=e2?dbStufen.find(s=>s.id===e2.parent_id):null;
      return{e1:e1?.name||"",e2:e2?.name||"",e3:e3?.name||"",e2stufenleitung:e2?.stufenleitung||""};
    }
    return{e1:team.hauptbereich||"",e2:team.vereinsstufe||team.kategorie||"",e3:team.verbandskategorie||"",e2stufenleitung:team.stufenleitung||""};
  }
  /* Stufenauswahl im Formular: lokaler State für kaskadierende Dropdowns */
  const getE1fromForm=()=>form.stufe_ebene1||(dbStufen.length===0?form.hauptbereich:"");
  const getE2fromForm=()=>form.stufe_ebene2||(dbStufen.length===0?form.vereinsstufe:"");
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [filterVals,setFilterVals]=useState([]);
  const [sortCol,setSortCol]=useState("hauptbereich");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("hauptbereich");
  const [viewMode,setViewMode]=useState("grid");
  const [openMenuId,setOpenMenuId]=useState(null);
  const isMobile=useIsMobile();
  const [formTab,setFormTab]=useState("info");
  const [showForm,setShowForm]=useState(false);
  const [editTeam,setEditTeam]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [showSaison,setShowSaison]=useState(false);
  const [saisonDraft,setSaisonDraft]=useState("2025/26");
  const [selectedTeam,setSelectedTeam]=useState(null);

  /* Teams kommen via dbTeams Prop aus App (dort geladen) */

  if(selectedTeam){
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <span style={{fontWeight:800,fontSize:18,color:"var(--text)",letterSpacing:-0.3}}>{selectedTeam.name}</span>
          {selectedTeam.kategorie&&<Chip text={selectedTeam.kategorie} color={BL}/>}
        </div>
        <TeamViewComponent role="trainer" trainerTeams={[selectedTeam.name]} setActive={()=>{}} myRosterId={null} account={null} dbTeams={dbTeams}/>
      </div>
    );
  }

  /* Supabase: Speichern */
  async function handleSave(){
    if(!form.name.trim()){setMsg({type:"error",text:"Name ist Pflichtfeld."});return;}
    setSaving(true); setMsg(null);
    try{
      if(sb){
        if(editTeam){
          const saveData={...form};if(form.stufe_id) saveData.stufe_id=form.stufe_id;const{error}=await sb.from("teams").update({...saveData,updated_at:new Date().toISOString()}).eq("id",editTeam.id);
          if(error) throw error;
          setTeams(ts=>ts.map(t=>t.id===editTeam.id?{...t,...form}:t));
          /* team_module speichern falls geändert */
          if(form.module_aktiv&&editTeam.id){
            const ALL_MODS=["team","training","events","spielplan","attendance_central","helpers","roster","polls","stats","media","news","wiki","docs"];
            const rows=ALL_MODS.map(m=>({team_id:editTeam.id,modul:m,aktiv:(form.module_aktiv||[]).includes(m)}));
            await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
          }
        }else{
          const saveData={...form};if(form.stufe_id) saveData.stufe_id=form.stufe_id;const{data,error}=await sb.from("teams").insert({...saveData,created_at:new Date().toISOString()}).select().single();
          if(error) throw error;
          setTeams(ts=>[...ts,data]);
          /* team_module für neues Team */
          if(data?.id){
            const ALL_MODS=["team","training","events","spielplan","attendance_central","helpers","roster","polls","stats","media","news","wiki","docs"];
            const rows=ALL_MODS.map(m=>({team_id:data.id,modul:m,aktiv:(form.module_aktiv||ALL_MODS).includes(m)}));
            await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
          }
        }
      }else{
        if(editTeam){
          setTeams(ts=>ts.map(t=>t.id===editTeam.id?{...t,...form}:t));
        }else{
          setTeams(ts=>[...ts,{...form,id:Date.now()}]);
        }
      }
      setMsg({type:"ok",text:editTeam?"Team gespeichert.":"Team erstellt."});
      setTimeout(()=>{setShowForm(false);setMsg(null);},900);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler beim Speichern."});
    }
    setSaving(false);
  }

  /* Supabase: Löschen */
  async function handleDelete(team){
    setSaving(true);
    try{
      if(sb){
        const{error}=await sb.from("teams").delete().eq("id",team.id);
        if(error) throw error;
      }
      setTeams(ts=>ts.filter(t=>t.id!==team.id));
      setDeleteConfirm(null);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler beim Löschen."});
    }
    setSaving(false);
  }

  /* Aktiv/Inaktiv toggeln */
  async function toggleAktiv(team){
    const neu=!team.aktiv;
    try{
      if(sb) await sb.from("teams").update({aktiv:neu}).eq("id",team.id);
      setTeams(ts=>ts.map(t=>t.id===team.id?{...t,aktiv:neu}:t));
    }catch(e){}
  }

  function openNeu(){setForm(EMPTY);setEditTeam(null);setMsg(null);setShowForm(true);}
  function openEdit(t){
    const ht=t.haupttrainer||(t.trainer?[t.trainer]:[]);
    const co=t.co_trainers||(t.trainer2?[t.trainer2]:[]);
    const path=getStufePath(t);
    const e3=t.stufe_id?dbStufen.find(s=>s.id===t.stufe_id):null;
    const e2=e3?dbStufen.find(s=>s.id===e3.parent_id):null;
    setForm({
      stufe_id:t.stufe_id||null,
      stufe_ebene1:e2?(dbStufen.find(s=>s.id===e2.parent_id)?.id||""):"",
      stufe_ebene2:e2?.id||"",
      hauptbereich:path.e1||"Juniorenfussball",
      vereinsstufe:path.e2||"",
      verbandskategorie:path.e3||"",
      name:t.name||"",kurzname:t.kurzname||"",stufenleitung:path.e2stufenleitung||"",
      liga:t.liga||"",saison:t.saison||"2024/25",
      haupttrainer:ht,co_trainers:co,staff:t.staff||[],
      aktiv:t.aktiv!==false,beschreibung:t.beschreibung||""
    });setEditTeam(t);setMsg(null);setShowForm(true);}

  /* Saison für alle Teams setzen */
  async function handleSaisonAlle(){
    const s=saisonDraft.trim();
    if(!s) return;
    setSaving(true);
    try{
      if(sb){
        const{error}=await sb.from("teams").update({saison:s,updated_at:new Date().toISOString()}).neq("id",0);
        if(error) throw error;
      }
      setTeams(ts=>ts.map(t=>({...t,saison:s})));
      setShowSaison(false);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler."});
    }
    setSaving(false);
  }

  const GROUP_OPTS=[
    {val:"none",        label:"Keine Gruppierung"},
    {val:"hauptbereich",label:"Hauptbereich"},
    {val:"vereinsstufe",label:"Vereinsstufe"},
    {val:"verbandskategorie",label:"Verbandskategorie"},
  ];
  const SORT_OPTS=[
    {val:"hauptbereich",label:"Hauptbereich"},
    {val:"vereinsstufe",label:"Vereinsstufe"},
    {val:"name",        label:"Teamname"},
    {val:"kurzname",    label:"Kurzname"},
    {val:"liga",        label:"Liga"},
  ];
  /* Alle Werte für den aktiven groupBy */
  const filterOptions=groupBy!=="none"
    ? [...new Set(teams.map(t=>t[groupBy]||"-").filter(Boolean))].sort()
    : [];

  const filtered=teams.filter(t=>{
    const matchSearch=!search||
      t.name?.toLowerCase().includes(search.toLowerCase())||
      (t.haupttrainer||[]).join(" ").toLowerCase().includes(search.toLowerCase())||
      t.kurzname?.toLowerCase().includes(search.toLowerCase());
    const matchFilter=filterVals.length===0||filterVals.includes(t[groupBy]||"-");
    return matchSearch&&matchFilter;
  });

  const sorted=[...filtered].sort((a,b)=>{
    const av=String(a[sortCol]??""); const bv=String(b[sortCol]??"");
    return sortDir==="asc"?String(av||"").localeCompare(String(bv||"")):String(bv||"").localeCompare(String(av||""));
  });

  /* Gruppierung anwenden */
  const groupedTeams=groupBy==="none"
    ?[{key:"",items:sorted}]
    :Object.entries(
        sorted.reduce((acc,t)=>{
          const k=t[groupBy]||"-";
          if(!acc[k]) acc[k]=[];
          acc[k].push(t);
          return acc;
        },{})
      ).sort(([a],[b])=>String(a||'').localeCompare(String(b||''))).map(([key,items])=>({key,items}));

  const inputStyle={width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"};
  const labelStyle={fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:0.5};

  const KAT_COLORS={"Aktivfussball":BL,"Juniorenfussball":R,"Kinderfussball Junioren":"#F97316","Juniorinnenfussball":"#EC4899","Kinderfussball Juniorinnen":"#DB2777","Seniorenfussball":AM};

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 4px",color:"var(--text)"}}>Teams</h1>
          <div style={{fontSize:13,color:"var(--sub)"}}>{teams.filter(t=>t.aktiv!==false).length} aktive Teams · {teams.filter(t=>t.aktiv===false).length} inaktiv</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* View Toggle */}
          <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
            {["list","grid"].map(m=>(
              <Btn onClick={()=>setViewMode(m)}><TI n={m==="list"?"layout-dashboard":"layout-grid"} size={14}/></Btn>
            ))}
          </div>
          {/* Dreipunkt-Menü */}
          <div style={{position:"relative"}}>
            <Btn onClick={()=>setOpenMenuId(openMenuId==="header"?null:"header")} style={{ width:36,height:36 }}><TI n="dots-vertical" size={15}/></Btn>
            {openMenuId==="header"&&(
              <div style={{position:"absolute",right:0,top:40,zIndex:200,
                background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
                minWidth:180,overflow:"hidden"}}>
                <Btn variant="ghost" onClick={()=>{setSaisonDraft(teams[0]?.saison||"2025/26");setShowSaison(true);setOpenMenuId(null);}}><TI n="calendar" size={14} style={{color:"var(--sub)",flexShrink:0}}/>Saison wechseln</Btn>
                <div style={{height:1,background:"var(--border)",margin:"0 12px"}}/>
                <Btn variant="ghost" onClick={()=>{openNeu();setOpenMenuId(null);}}><TI n="edit" size={14} style={{color:"var(--sub)",flexShrink:0}}/>+ Neues Team</Btn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saison-Modal */}
      <ModalOrSheet open={showSaison} onClose={()=>setShowSaison(false)} maxWidth={380}>
        <div style={{padding:"24px 20px"}}>
          <h2 style={{margin:"0 0 6px",fontSize:16,fontWeight:700,color:"var(--text)"}}>Saison wechseln</h2>
          <p style={{margin:"0 0 18px",fontSize:13,color:"var(--sub)"}}>Die neue Saison wird für <strong>alle {teams.length} Teams</strong> gleichzeitig gesetzt.</p>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:0.5}}>Neue Saison</label>
            <input value={saisonDraft} onChange={e=>setSaisonDraft(e.target.value)}
              placeholder="z.B. 2025/26" autoFocus
              style={{width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <Row gap={12} align="flex-start">
            <Btn variant="primary" color={BTN} onClick={handleSaisonAlle} disabled={saving||!saisonDraft.trim()}>{saving?"Wird gesetzt…":"Für alle übernehmen"}</Btn>
            <Btn onClick={()=>setShowSaison(false)}>Abbrechen</Btn>
          </Row>
          {!sb&&<div style={{fontSize:13,color:"var(--sub)",textAlign:"center",marginTop:10}}>Demo: nur lokal.</div>}
        </div>
      </ModalOrSheet>

      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:8,marginBottom:filterOptions.length?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Team, Trainer, Kurzname…"
          style={{flex:1,minWidth:180,...inputStyle}}/>
        {/* Gruppieren nach */}
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,width:"auto",minWidth:160,flex:"0 0 auto"}}>
          {GROUP_OPTS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        {/* Sortieren nach */}
        <Row gap={4} align="flex-start">
          <select value={sortCol} onChange={e=>setSortCol(e.target.value)}
            style={{...inputStyle,width:"auto",minWidth:130,flex:"0 0 auto"}}>
            {SORT_OPTS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <Btn onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")}>{sortDir==="asc"?"↑":"↓"}</Btn>
        </Row>
      </div>
      {/* Filter-Chips */}
      {filterOptions.length>0&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
          <Btn small onClick={()=>setFilterVals([])}>Alle</Btn>
          {filterOptions.map(v=>{
            const active=filterVals.includes(v);
            const c=KAT_COLORS[v]||(active?BK:"var(--sub)");
            return(
              <Btn small onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}>{active&&<span style={{fontSize:11}}>✓</span>}{v} <span style={{opacity:0.55,fontWeight:400}}>{teams.filter(t=>(t[groupBy]||"-")===v).length}</span></Btn>
            );
          })}
          {filterVals.length>0&&(
            <Btn variant="ghost" small onClick={()=>setFilterVals([])}>× zurücksetzen</Btn>
          )}
        </div>
      )}

      {/* Teams Liste */}
      {loading?(
        <Col gap={12}>
          {[1,2,3].map(i=><SkelCard key={i}/>)}
        </Col>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {groupedTeams.map(({key,items})=>(
            <div key={key||"all"}>
              {groupBy!=="none"&&key&&(
                <div style={{padding:"10px 4px 6px",fontWeight:700,fontSize:13,color:"var(--sub)",
                  textTransform:"uppercase",letterSpacing:0.7,marginTop:8,
                  borderBottom:"1px solid var(--border)",marginBottom:8}}>
                  {key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span>
                </div>
              )}
              <div style={viewMode==="grid"
                ?{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:groupBy!=="none"?16:8}
                :{display:"flex",flexDirection:"column",gap:8,marginBottom:groupBy!=="none"?16:8}}>
                {items.map(team=>{
            const katColor=KAT_COLORS[team.hauptbereich]||KAT_COLORS[team.kategorie]||BL;
            const isInaktiv=team.aktiv===false;
            const sp=getStufePath(team);
            const spielerCount=ROSTER.filter(p=>(p.teams||[]).includes(team.name)).length;
            const haupttrainerArr=team.haupttrainer||(team.trainer?[team.trainer]:[]);const coArr=team.co_trainers||(team.trainer2?[team.trainer2]:[]);const staffArr=team.staff||[];const trainerCount=haupttrainerArr.length+coArr.length;
            const menuOpen=openMenuId===team.id;
            const openMenu=()=>setOpenMenuId(menuOpen?null:team.id);
            const closeMenu=()=>setOpenMenuId(null);
            return(
              <div key={team.id} className="cc-card" style={{borderRadius:12,border:"0.5px solid",padding:"14px 16px",opacity:isInaktiv?0.55:1,transition:"opacity 0.2s",position:"relative",cursor:viewMode==="grid"?"pointer":"default"}} onClick={viewMode==="grid"?()=>{setSelectedTeam(team);
          try{window.history.pushState({page:"team",teamDetail:true},"","#team-detail");}catch{}
          setCustomBack&&setCustomBack(()=>()=>{setSelectedTeam(null);setCustomBack&&setCustomBack(null);try{window.history.back();}catch{}});}:undefined}>
                {viewMode==="grid"?(
                  /* ── KACHEL-LAYOUT ── */
                  <Col gap={12}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                      <Row gap={12}>
                        <div style={{width:40,height:40,borderRadius:10,background:katColor+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <TI n="ball-football" size={18} style={{color:katColor}}/>
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{team.name}</div>
                          {team.kurzname&&<span style={{fontSize:11,fontWeight:700,color:katColor}}>{team.kurzname}</span>}
                        </div>
                      </Row>
                      {/* 3-Dot Menu */}
                      <div style={{position:"relative"}}>
                        <Btn onClick={openMenu} style={{ width:28,height:28 }}><TI n="dots-vertical" size={13}/></Btn>
                        {menuOpen&&(
                          <div style={{position:"absolute",right:0,top:32,zIndex:100,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:140,overflow:"hidden"}}>
                            {[
                              {icon:"edit", label:"Bearbeiten",color:"var(--text)", fn:()=>{openEdit(team);closeMenu();}},
                              {icon:"trash",label:"Löschen",   color:R,  fn:()=>{setDeleteConfirm(team);closeMenu();}},
                            ].map(a=>(
                              <Btn variant="ghost" onClick={a.fn}><TI n={a.icon} size={13}/>{a.label}</Btn>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize:13,color:"var(--sub)",display:"flex",flexDirection:"column",gap:4}}>
                      <span>{sp.e1}{sp.e2?" · "+sp.e2:""}</span>
                      {team.liga&&<span>{team.liga}</span>}
                      <div style={{display:"flex",gap:12,marginTop:4}}>
                        <span><TI n="users" size={11}/> {spielerCount}</span>
                        <span><TI n="user" size={11}/> {trainerCount}</span>
                        {isInaktiv&&<Chip text="Inaktiv" color="#9ca3af"/>}
                      </div>
                    </div>
                  </Col>
                ):(
                  /* ── LISTEN-LAYOUT ── */
                  <Row gap={12}>
                    <div style={{width:42,height:42,borderRadius:10,background:katColor+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <TI n="ball-football" size={18} style={{color:katColor}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{team.name}</span>
                        {team.kurzname&&<span style={{fontSize:11,fontWeight:700,color:katColor,background:katColor+"15",padding:"2px 7px",borderRadius:6}}>{team.kurzname}</span>}
                        {isInaktiv&&<Chip text="Inaktiv" color="#9ca3af"/>}
                      </div>
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:4,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                        {sp.e1&&<span style={{fontWeight:600}}>{sp.e1}</span>}
                        {sp.e2&&<span>· {sp.e2}</span>}
                        {team.liga&&<span>· {team.liga}</span>}
                        {team.saison&&<span>{team.saison}</span>}
                        <span style={{display:"flex",alignItems:"center",gap:4}}><TI n="users" size={11}/> {spielerCount} Spieler</span>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><TI n="user" size={11}/> {trainerCount} Trainer</span>
                      </div>
                    </div>
                    {/* Aktionen: 3-Dot auf Mobile, Buttons auf Desktop */}
                    {isMobile?(
                      <div style={{position:"relative",flexShrink:0}}>
                        <Btn onClick={openMenu} style={{ width:34,height:34 }}><TI n="dots-vertical" size={14}/></Btn>
                        {menuOpen&&(
                          <div style={{position:"absolute",right:0,top:38,zIndex:100,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",minWidth:150,overflow:"hidden"}}>
                            {[
                              {icon:"edit", label:"Bearbeiten",color:"var(--text)", fn:()=>{openEdit(team);closeMenu();}},
                              {icon:"trash",label:"Löschen",   color:R,  fn:()=>{setDeleteConfirm(team);closeMenu();}},
                            ].map(a=>(
                              <Btn variant="ghost" onClick={a.fn}><TI n={a.icon} size={14}/>{a.label}</Btn>
                            ))}
                          </div>
                        )}
                      </div>
                    ):(
                      <div style={{display:"flex",gap:8,flexShrink:0}}>

                        <Btn onClick={()=>openEdit(team)} title="Bearbeiten" style={{ width:32,height:32 }}><TI n="edit" size={14}/></Btn>
                        <Btn variant="primary" color={RL} onClick={()=>setDeleteConfirm(team)} title="Löschen" style={{ width:32,height:32 }}><TI n="trash" size={14}/></Btn>
                      </div>
                    )}
                  </Row>
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
          {sorted.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:13}}>
              Keine Teams gefunden.
            </div>
          )}
        </div>
      )}

      {/* Team erstellen / bearbeiten Modal */}
      <ModalOrSheet open={showForm} onClose={()=>setShowForm(false)} maxWidth={520}>
        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <ModalTitle>{editTeam?"Team bearbeiten":"Neues Team"}</ModalTitle>
          <Btn variant="ghost" onClick={()=>setShowForm(false)} style={{fontSize:20,padding:"4px 6px",color:"var(--sub)"}}>×</Btn>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {editTeam&&(
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              {["info","module"].map(t=>(
                <Btn onClick={()=>setFormTab(t)}>{t==="info"?"Team-Info":"Module"}</Btn>
              ))}
            </div>
          )}
          {/* Ebene 1 */}
          <div>
            <label style={labelStyle}>Hauptbereich (Ebene 1)</label>
            <select value={dbStufen.length>0?form.stufe_ebene1:form.hauptbereich}
              onChange={e=>{
                if(dbStufen.length>0) setForm(p=>({...p,stufe_ebene1:Number(e.target.value)||e.target.value,stufe_ebene2:"",stufe_id:null}));
                else setForm(p=>({...p,hauptbereich:e.target.value,vereinsstufe:"",verbandskategorie:""}));
              }} style={inputStyle}>
              <option value="">— wählen —</option>
              {stufen1.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Ebene 2 + 3 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Vereinsstufe (Ebene 2)</label>
              <select value={dbStufen.length>0?form.stufe_ebene2:form.vereinsstufe}
                onChange={e=>{
                  if(dbStufen.length>0){
                    const s2=dbStufen.find(s=>s.id===(Number(e.target.value)||e.target.value));
                    setForm(p=>({...p,stufe_ebene2:Number(e.target.value)||e.target.value,stufe_id:null,stufenleitung:s2?.stufenleitung||p.stufenleitung}));
                  }else setForm(p=>({...p,vereinsstufe:e.target.value,verbandskategorie:""}));
                }} style={inputStyle}>
                <option value="">— wählen —</option>
                {getStufen2(dbStufen.length>0?form.stufe_ebene1:form.hauptbereich).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Verbandskategorie (Ebene 3)</label>
              <select value={dbStufen.length>0?form.stufe_id:form.verbandskategorie}
                onChange={e=>{
                  if(dbStufen.length>0) setForm(p=>({...p,stufe_id:Number(e.target.value)||e.target.value||null}));
                  else setForm(p=>({...p,verbandskategorie:e.target.value}));
                }} style={inputStyle}>
                <option value="">— wählen —</option>
                {getStufen3(dbStufen.length>0?form.stufe_ebene2:form.vereinsstufe).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* Ebene 4: Teamname + Kurzname */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Teamname (Ebene 4) *</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="z.B. Cc-Junioren" style={inputStyle} autoFocus/>
            </div>
            <div>
              <label style={labelStyle}>Kurzname</label>
              <input value={form.kurzname} onChange={e=>setForm(p=>({...p,kurzname:e.target.value}))}
                placeholder="z.B. Cc" style={inputStyle}/>
            </div>
          </div>
          {/* Stufenleitung + Liga */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Stufenleitung</label>
              <input value={form.stufenleitung} onChange={e=>setForm(p=>({...p,stufenleitung:e.target.value}))}
                placeholder="z.B. Stufenleitung Junioren C" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Liga / Wettbewerb</label>
              <input value={form.liga} onChange={e=>setForm(p=>({...p,liga:e.target.value}))}
                placeholder="z.B. U13 Liga A" style={inputStyle}/>
            </div>
          </div>
          {/* Saison + Status */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Saison</label>
              <input value={form.saison} onChange={e=>setForm(p=>({...p,saison:e.target.value}))}
                placeholder="2024/25" style={inputStyle}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={labelStyle}>Status</label>
              <div style={{display:"flex",alignItems:"center",gap:12,height:38}}>
                <Btn onClick={()=>setForm(p=>({...p,aktiv:!p.aktiv}))}><div style={{position:"absolute",top:3,left:form.aktiv?21:3,width:18,height:18,borderRadius:"50%",background:form.aktiv?"#111":"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/></Btn>
                <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{form.aktiv?"Aktiv":"Inaktiv"}</span>
              </div>
            </div>
          </div>
          {/* Staff Arrays */}
          {[
            {key:"haupttrainer",label:"Trainer/in",  placeholder:"Person suchen…"},
            {key:"co_trainers", label:"Assistent/in",placeholder:"Person suchen…"},
            {key:"staff",       label:"Weiterer Staff",placeholder:"Name / Funktion suchen…"},
          ].map(({key,label,placeholder})=>(
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <Col>
                {(form[key]||[]).map((val,i)=>(
                  <div key={i} style={{display:"flex",gap:8}}>
                    <PersonPicker
                      value={val}
                      onChange={v=>setForm(p=>({...p,[key]:p[key].map((x,j)=>j===i?v:x)}))}
                      placeholder={placeholder}
                      style={{flex:1}}/>
                    <Btn onClick={()=>setForm(p=>({...p,[key]:p[key].filter((_,j)=>j!==i)}))} style={{ width:36,height:38 }}>×</Btn>
                  </div>
                ))}
                <Btn variant="ghost" onClick={()=>setForm(p=>({...p,[key]:[...(p[key]||[]),""]}))}>+ {label} hinzufügen</Btn>
              </Col>
            </div>
          ))}
          {/* Beschreibung */}
          <div>
            <label style={labelStyle}>Beschreibung (optional)</label>
            <textarea value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))}
              placeholder="Zusätzliche Infos zum Team…" rows={3}
              style={{...inputStyle,resize:"vertical"}}/>
          </div>
          {/* Status-Meldung */}
          {msg&&(
            <div style={{padding:"10px 14px",borderRadius:8,fontSize:13,fontWeight:600,
              background:msg.type==="ok"?"#ECFDF5":RL,
              color:msg.type==="ok"?GN:R,
              border:"1px solid "+(msg.type==="ok"?GN:R)}}>
              {msg.text}
            </div>
          )}
          {/* Modul-Tab: nur bei bestehenden Teams */}
          {editTeam&&formTab==="module"&&(
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:12}}>
                Module ein/ausschalten für dieses Team. Trainer sehen nur aktive Module.
              </div>
              {[
                {key:"team",        label:"Kader"},
                {key:"training",    label:"Trainingsplan"},
                {key:"events",      label:"Termine / Anwesenheit"},
                {key:"spielplan",   label:"Spielplan & Tabelle"},
                {key:"attendance_central",label:"Anwesenheitsstatistik"},
                {key:"helpers",     label:"Helfereinsätze"},
                {key:"roster",      label:"Kaderliste"},
                {key:"polls",       label:"Abstimmungen"},
                {key:"stats",       label:"Statistik"},
                {key:"media",       label:"Medien & Berichte"},
                {key:"news",        label:"News"},
                {key:"wiki",        label:"Wiki"},
                {key:"docs",        label:"Dokumente"},
              ].map(mod=>{
                const isActive=(form.module_aktiv||editTeam.module_aktiv||[]).includes(mod.key);
                return(
                  <div key={mod.key} onClick={()=>setForm(p=>{
                    const cur=p.module_aktiv||editTeam.module_aktiv||[];
                    return{...p,module_aktiv:isActive?cur.filter(m=>m!==mod.key):[...cur,mod.key]};
                  })} style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"9px 12px",borderRadius:8,marginBottom:6,cursor:"pointer",
                    background:isActive?"var(--surface2)":"transparent",
                    border:"1px solid "+(isActive?"var(--border)":"transparent")
                  }}>
                    <span style={{fontSize:13,color:"var(--text)"}}>{mod.label}</span>
                    <div style={{
                      width:36,height:20,borderRadius:10,transition:"background 0.2s",
                      background:isActive?BK:"var(--border)",position:"relative"
                    }}>
                      <div style={{
                        position:"absolute",top:3,width:14,height:14,borderRadius:"50%",
                        background:"var(--surface)",transition:"left 0.2s",
                        left:isActive?19:3
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Buttons */}
          <Row gap={12} align="flex-start">
            <Btn variant="primary" color={BTN} onClick={handleSave} disabled={saving}>{saving?"Speichern…":editTeam?"Änderungen speichern":"Team erstellen"}</Btn>
            <Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn>
          </Row>
          {!sb&&<div style={{fontSize:13,color:"var(--sub)",textAlign:"center"}}>Demo-Modus: Änderungen nicht persistent.</div>}
        </div>
      </ModalOrSheet>

      {/* Löschen bestätigen */}
      <ModalOrSheet open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} maxWidth={420}>
        <div style={{padding:"24px 20px",textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:RL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <TI n="trash" size={22} style={{color:R}}/>
          </div>
          <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:8}}>Team löschen?</div>
          <div style={{fontSize:13,color:"var(--sub)",marginBottom:20}}>
            <strong style={{color:"var(--text)"}}>{deleteConfirm?.name}</strong> wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
          </div>
          <Row gap={12} align="flex-start">
            <Btn variant="primary" color={R} onClick={()=>handleDelete(deleteConfirm)} disabled={saving}>{saving?"Löschen…":"Ja, löschen"}</Btn>
            <Btn onClick={()=>setDeleteConfirm(null)}>Abbrechen</Btn>
          </Row>
        </div>
      </ModalOrSheet>
    </div>
  );
}

function TeamsAdminView({sb,dbTeams=[],setDbTeams,dbStufen=[],setDbStufen,setCustomBack,TeamViewComponent=null}){
  const EMPTY={stufe_id:null,stufe_ebene1:"",stufe_ebene2:"",stufe_ebene3_id:null,hauptbereich:"Juniorenfussball",vereinsstufe:"Junioren C",verbandskategorie:"",name:"",kurzname:"",stufenleitung:"",liga:"",saison:"2024/25",haupttrainer:[],co_trainers:[],staff:[],aktiv:true,beschreibung:""};
  const FALLBACK=[
    /* Aktivfussball – Aktive Herren */
    {id:1, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"1. Mannschaft",    kurzname:"FCH 1",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"1. Liga",           saison:"2024/25",haupttrainer:["Hans Muster"],  co_trainers:[],staff:[],aktiv:true},
    {id:2, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"2. Mannschaft",    kurzname:"FCH 2",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"2. Liga",           saison:"2024/25",haupttrainer:["Peter Meier"], co_trainers:[],staff:[],aktiv:true},
    {id:3, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"3. Mannschaft",    kurzname:"FCH 3",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"3. Liga",           saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:4, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Herren",        verbandskategorie:"Aktive Herren",       name:"4. Mannschaft",    kurzname:"FCH 4",    stufenleitung:"Stufenleitung Aktive Herren",   liga:"4. Liga",           saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Aktivfussball – Aktive Frauen */
    {id:5, hauptbereich:"Aktivfussball",          vereinsstufe:"Aktive Frauen",        verbandskategorie:"Aktive Frauen",       name:"1. Mannschaft - Frauen",kurzname:"Frauen 1",stufenleitung:"Stufenleitung Aktive Frauen",liga:"Frauen 2. Liga",    saison:"2024/25",haupttrainer:["Anna Koch"],   co_trainers:[],staff:[],aktiv:true},
    /* Juniorenfussball */
    {id:6, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren A",           verbandskategorie:"Junioren A",          name:"A-Junioren",       kurzname:"A",        stufenleitung:"Stufenleitung Junioren A",      liga:"U16 Liga A",        saison:"2024/25",haupttrainer:["Beat Huber"],  co_trainers:[],staff:[],aktiv:true},
    {id:7, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Ba-Junioren",      kurzname:"Ba",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga A",        saison:"2024/25",haupttrainer:["Marc Rüegg"],  co_trainers:[],staff:[],aktiv:true},
    {id:8, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Bb-Junioren",      kurzname:"Bb",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga B",        saison:"2024/25",haupttrainer:["Simon Baur"],  co_trainers:[],staff:[],aktiv:true},
    {id:9, hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren B",           verbandskategorie:"Junioren B",          name:"Bc-Junioren",      kurzname:"Bc",       stufenleitung:"Stufenleitung Junioren B",      liga:"U15 Liga C",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:10,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Ca-Junioren",      kurzname:"Ca",       stufenleitung:"Stufenleitung Junioren C",      liga:"U13 Liga A",        saison:"2024/25",haupttrainer:["Leo Frei"],    co_trainers:[],staff:[],aktiv:true},
    {id:11,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Cb-Junioren",      kurzname:"Cb",       stufenleitung:"Stufenleitung Junioren C",      liga:"U13 Liga B",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:12,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren C",           verbandskategorie:"Junioren C",          name:"Cc-Junioren",      kurzname:"Cc",       stufenleitung:"Stufenleitung Junioren C",      liga:"U12 Liga A",        saison:"2024/25",haupttrainer:["Daniel Vogel"],co_trainers:["Urs Berger"],staff:[],aktiv:true},
    {id:13,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-9",        name:"Da-Junioren",      kurzname:"Da",       stufenleitung:"Stufenleitung Junioren D",      liga:"U11 Liga A",        saison:"2024/25",haupttrainer:["Reto Müller"], co_trainers:[],staff:[],aktiv:true},
    {id:14,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-9",        name:"Db-Junioren",      kurzname:"Db",       stufenleitung:"Stufenleitung Junioren D",      liga:"U11 Liga B",        saison:"2024/25",haupttrainer:["Sandro Kalt"], co_trainers:[],staff:[],aktiv:true},
    {id:15,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"Dc-Junioren",      kurzname:"Dc",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:16,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"Dd-Junioren",      kurzname:"Dd",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:17,hauptbereich:"Juniorenfussball",       vereinsstufe:"Junioren D",           verbandskategorie:"Junioren D-7",        name:"De-Junioren",      kurzname:"De",       stufenleitung:"Stufenleitung Junioren D",      liga:"U10 Liga",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Kinderfussball Junioren */
    {id:18,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ea-Junioren",      kurzname:"Ea",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:19,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Eb-Junioren",      kurzname:"Eb",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:20,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ec-Junioren",      kurzname:"Ec",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:21,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"Ed-Junioren",      kurzname:"Ed",       stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:22,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren E",           verbandskategorie:"Junioren E",          name:"E-Pool",           kurzname:"E-Pool",   stufenleitung:"Stufenleitung Junioren E",      liga:"U9",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:23,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren F",           verbandskategorie:"Junioren F",          name:"F1-Junioren",      kurzname:"F1",       stufenleitung:"Stufenleitung Junioren F",      liga:"U8",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:24,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren F",           verbandskategorie:"Junioren F",          name:"F2-Junioren",      kurzname:"F2",       stufenleitung:"Stufenleitung Junioren F",      liga:"U8",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:25,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren G",           verbandskategorie:"Junioren G",          name:"G1-Junioren",      kurzname:"G1",       stufenleitung:"Stufenleitung Junioren G",      liga:"U7",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:26,hauptbereich:"Kinderfussball Junioren",vereinsstufe:"Junioren G",           verbandskategorie:"Junioren G",          name:"G2-Junioren",      kurzname:"G2",       stufenleitung:"Stufenleitung Junioren G",      liga:"U7",                saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Juniorinnenfussball */
    {id:27,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"Ba-Juniorinnen",   kurzname:"Ba-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:["Eva Steiner"], co_trainers:[],staff:[],aktiv:true},
    {id:28,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"Bb-Juniorinnen",   kurzname:"Bb-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:29,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen B / FF-21",verbandskategorie:"Juniorinnen FF-21",   name:"B-Juniorinnen",    kurzname:"B-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U15 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:30,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"Ca-Juniorinnen",   kurzname:"Ca-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:31,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"Cb-Juniorinnen",   kurzname:"Cb-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:32,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen C / FF-17",verbandskategorie:"Juniorinnen FF-17",   name:"C-Juniorinnen",    kurzname:"C-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U13 Mädchen",       saison:"2024/25",haupttrainer:["Nina Wirth"],  co_trainers:[],staff:[],aktiv:true},
    {id:33,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14 9v9",name:"Da-Juniorinnen",  kurzname:"Da-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:34,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14 7v7",name:"Db-Juniorinnen",  kurzname:"Db-Girls", stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:35,hauptbereich:"Juniorinnenfussball",    vereinsstufe:"Juniorinnen D / FF-14",verbandskategorie:"Juniorinnen FF-14",   name:"D-Juniorinnen",    kurzname:"D-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U11 Mädchen",       saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    /* Kinderfussball Juniorinnen */
    {id:36,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen E / FF-11",verbandskategorie:"Juniorinnen FF-11",name:"E-Juniorinnen",   kurzname:"E-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U9 Mädchen",        saison:"2024/25",haupttrainer:["Lea Bucher"],  co_trainers:[],staff:[],aktiv:true},
    {id:37,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen F / FF-9", verbandskategorie:"Juniorinnen FF-9", name:"F-Juniorinnen",   kurzname:"F-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U8 Mädchen",        saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:38,hauptbereich:"Kinderfussball Juniorinnen",vereinsstufe:"Juniorinnen G / FF-7", verbandskategorie:"Juniorinnen FF-7", name:"G-Juniorinnen",   kurzname:"G-Girls",  stufenleitung:"Stufenleitung Juniorinnen",     liga:"U7 Mädchen",        saison:"2024/25",haupttrainer:["Sara Lüscher"],co_trainers:[],staff:[],aktiv:true},
    /* Seniorenfussball */
    {id:39,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 30+",         verbandskategorie:"Senioren 30+",        name:"Senioren 30+",     kurzname:"30+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:40,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 40+",         verbandskategorie:"Senioren 40+",        name:"Senioren 40+",     kurzname:"40+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:41,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 50+",         verbandskategorie:"Senioren 50+",        name:"Senioren 50+",     kurzname:"50+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
    {id:42,hauptbereich:"Seniorenfussball",       vereinsstufe:"Senioren 60+",         verbandskategorie:"Senioren 60+",        name:"Senioren 60+",     kurzname:"60+",      stufenleitung:"Stufenleitung Senioren",        liga:"Senioren",          saison:"2024/25",haupttrainer:[],             co_trainers:[],staff:[],aktiv:true},
  ];
  const [localTeams,setLocalTeams]=useState(FALLBACK);
  /* Nutze dbTeams wenn geladen, sonst localTeams */
  const teams = dbTeams.length>0 ? dbTeams : localTeams;
  const setTeams = dbTeams.length>0
    ? (fn)=>{ const next=typeof fn==="function"?fn(dbTeams):fn; if(setDbTeams) setDbTeams(next); }
    : setLocalTeams;

  /* Stufen-Helfer: aus DB oder TEAM_HIERARCHY als Fallback */
  const stufen1 = dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===1).sort((a,b)=>a.sortorder-b.sortorder)
    : Object.keys(TEAM_HIERARCHY).map((n,i)=>({id:n,name:n,ebene:1,sortorder:i}));
  const getStufen2=(e1id)=> dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===2&&s.parent_id===e1id).sort((a,b)=>a.sortorder-b.sortorder)
    : Object.keys(TEAM_HIERARCHY[e1id]||{}).map((n,i)=>({id:n,name:n,ebene:2,sortorder:i,stufenleitung:""}));
  const getStufen3=(e2id)=> dbStufen.length>0
    ? dbStufen.filter(s=>s.ebene===3&&s.parent_id===e2id).sort((a,b)=>a.sortorder-b.sortorder)
    : (()=>{
        for(const [hb,vs] of Object.entries(TEAM_HIERARCHY)){
          for(const [vs2,cats] of Object.entries(vs)){
            if(vs2===e2id) return cats.map((n,i)=>({id:n,name:n,ebene:3,sortorder:i}));
          }
        }
        return [];
      })();
  /* Stufe-ID → Pfad-Objekte {e1,e2,e3} */
  function getStufePath(team){
    if(dbStufen.length>0 && team.stufe_id){
      const e3=dbStufen.find(s=>s.id===team.stufe_id);
      const e2=e3?dbStufen.find(s=>s.id===e3.parent_id):null;
      const e1=e2?dbStufen.find(s=>s.id===e2.parent_id):null;
      return{e1:e1?.name||"",e2:e2?.name||"",e3:e3?.name||"",e2stufenleitung:e2?.stufenleitung||""};
    }
    return{e1:team.hauptbereich||"",e2:team.vereinsstufe||team.kategorie||"",e3:team.verbandskategorie||"",e2stufenleitung:team.stufenleitung||""};
  }
  /* Stufenauswahl im Formular: lokaler State für kaskadierende Dropdowns */
  const getE1fromForm=()=>form.stufe_ebene1||(dbStufen.length===0?form.hauptbereich:"");
  const getE2fromForm=()=>form.stufe_ebene2||(dbStufen.length===0?form.vereinsstufe:"");
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [filterVals,setFilterVals]=useState([]);
  const [sortCol,setSortCol]=useState("hauptbereich");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("hauptbereich");
  const [viewMode,setViewMode]=useState("grid");
  const [openMenuId,setOpenMenuId]=useState(null);
  const isMobile=useIsMobile();
  const [formTab,setFormTab]=useState("info");
  const [showForm,setShowForm]=useState(false);
  const [editTeam,setEditTeam]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [showSaison,setShowSaison]=useState(false);
  const [saisonDraft,setSaisonDraft]=useState("2025/26");
  const [selectedTeam,setSelectedTeam]=useState(null);

  /* Teams kommen via dbTeams Prop aus App (dort geladen) */

  if(selectedTeam){
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <span style={{fontWeight:800,fontSize:18,color:"var(--text)",letterSpacing:-0.3}}>{selectedTeam.name}</span>
          {selectedTeam.kategorie&&<Chip text={selectedTeam.kategorie} color={BL}/>}
        </div>
        {TeamViewComponent && <TeamViewComponent role="trainer" trainerTeams={[selectedTeam.name]} setActive={()=>{}} myRosterId={null} account={null} dbTeams={dbTeams}/>}
      </div>
    );
  }

  /* Supabase: Speichern */
  async function handleSave(){
    if(!form.name.trim()){setMsg({type:"error",text:"Name ist Pflichtfeld."});return;}
    setSaving(true); setMsg(null);
    try{
      if(sb){
        if(editTeam){
          const saveData={...form};if(form.stufe_id) saveData.stufe_id=form.stufe_id;const{error}=await sb.from("teams").update({...saveData,updated_at:new Date().toISOString()}).eq("id",editTeam.id);
          if(error) throw error;
          setTeams(ts=>ts.map(t=>t.id===editTeam.id?{...t,...form}:t));
          /* team_module speichern falls geändert */
          if(form.module_aktiv&&editTeam.id){
            const ALL_MODS=["team","training","events","spielplan","attendance_central","helpers","roster","polls","stats","media","news","wiki","docs"];
            const rows=ALL_MODS.map(m=>({team_id:editTeam.id,modul:m,aktiv:(form.module_aktiv||[]).includes(m)}));
            await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
          }
        }else{
          const saveData={...form};if(form.stufe_id) saveData.stufe_id=form.stufe_id;const{data,error}=await sb.from("teams").insert({...saveData,created_at:new Date().toISOString()}).select().single();
          if(error) throw error;
          setTeams(ts=>[...ts,data]);
          /* team_module für neues Team */
          if(data?.id){
            const ALL_MODS=["team","training","events","spielplan","attendance_central","helpers","roster","polls","stats","media","news","wiki","docs"];
            const rows=ALL_MODS.map(m=>({team_id:data.id,modul:m,aktiv:(form.module_aktiv||ALL_MODS).includes(m)}));
            await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
          }
        }
      }else{
        if(editTeam){
          setTeams(ts=>ts.map(t=>t.id===editTeam.id?{...t,...form}:t));
        }else{
          setTeams(ts=>[...ts,{...form,id:Date.now()}]);
        }
      }
      setMsg({type:"ok",text:editTeam?"Team gespeichert.":"Team erstellt."});
      setTimeout(()=>{setShowForm(false);setMsg(null);},900);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler beim Speichern."});
    }
    setSaving(false);
  }

  /* Supabase: Löschen */
  async function handleDelete(team){
    setSaving(true);
    try{
      if(sb){
        const{error}=await sb.from("teams").delete().eq("id",team.id);
        if(error) throw error;
      }
      setTeams(ts=>ts.filter(t=>t.id!==team.id));
      setDeleteConfirm(null);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler beim Löschen."});
    }
    setSaving(false);
  }

  /* Aktiv/Inaktiv toggeln */
  async function toggleAktiv(team){
    const neu=!team.aktiv;
    try{
      if(sb) await sb.from("teams").update({aktiv:neu}).eq("id",team.id);
      setTeams(ts=>ts.map(t=>t.id===team.id?{...t,aktiv:neu}:t));
    }catch(e){}
  }

  function openNeu(){setForm(EMPTY);setEditTeam(null);setMsg(null);setShowForm(true);}
  function openEdit(t){
    const ht=t.haupttrainer||(t.trainer?[t.trainer]:[]);
    const co=t.co_trainers||(t.trainer2?[t.trainer2]:[]);
    const path=getStufePath(t);
    const e3=t.stufe_id?dbStufen.find(s=>s.id===t.stufe_id):null;
    const e2=e3?dbStufen.find(s=>s.id===e3.parent_id):null;
    setForm({
      stufe_id:t.stufe_id||null,
      stufe_ebene1:e2?(dbStufen.find(s=>s.id===e2.parent_id)?.id||""):"",
      stufe_ebene2:e2?.id||"",
      hauptbereich:path.e1||"Juniorenfussball",
      vereinsstufe:path.e2||"",
      verbandskategorie:path.e3||"",
      name:t.name||"",kurzname:t.kurzname||"",stufenleitung:path.e2stufenleitung||"",
      liga:t.liga||"",saison:t.saison||"2024/25",
      haupttrainer:ht,co_trainers:co,staff:t.staff||[],
      aktiv:t.aktiv!==false,beschreibung:t.beschreibung||""
    });setEditTeam(t);setMsg(null);setShowForm(true);}

  /* Saison für alle Teams setzen */
  async function handleSaisonAlle(){
    const s=saisonDraft.trim();
    if(!s) return;
    setSaving(true);
    try{
      if(sb){
        const{error}=await sb.from("teams").update({saison:s,updated_at:new Date().toISOString()}).neq("id",0);
        if(error) throw error;
      }
      setTeams(ts=>ts.map(t=>({...t,saison:s})));
      setShowSaison(false);
    }catch(e){
      setMsg({type:"error",text:e.message||"Fehler."});
    }
    setSaving(false);
  }

  const GROUP_OPTS=[
    {val:"none",        label:"Keine Gruppierung"},
    {val:"hauptbereich",label:"Hauptbereich"},
    {val:"vereinsstufe",label:"Vereinsstufe"},
    {val:"verbandskategorie",label:"Verbandskategorie"},
  ];
  const SORT_OPTS=[
    {val:"hauptbereich",label:"Hauptbereich"},
    {val:"vereinsstufe",label:"Vereinsstufe"},
    {val:"name",        label:"Teamname"},
    {val:"kurzname",    label:"Kurzname"},
    {val:"liga",        label:"Liga"},
  ];
  /* Alle Werte für den aktiven groupBy */
  const filterOptions=groupBy!=="none"
    ? [...new Set(teams.map(t=>t[groupBy]||"-").filter(Boolean))].sort()
    : [];

  const filtered=teams.filter(t=>{
    const matchSearch=!search||
      t.name?.toLowerCase().includes(search.toLowerCase())||
      (t.haupttrainer||[]).join(" ").toLowerCase().includes(search.toLowerCase())||
      t.kurzname?.toLowerCase().includes(search.toLowerCase());
    const matchFilter=filterVals.length===0||filterVals.includes(t[groupBy]||"-");
    return matchSearch&&matchFilter;
  });

  const sorted=[...filtered].sort((a,b)=>{
    const av=String(a[sortCol]??""); const bv=String(b[sortCol]??"");
    return sortDir==="asc"?String(av||"").localeCompare(String(bv||"")):String(bv||"").localeCompare(String(av||""));
  });

  /* Gruppierung anwenden */
  const groupedTeams=groupBy==="none"
    ?[{key:"",items:sorted}]
    :Object.entries(
        sorted.reduce((acc,t)=>{
          const k=t[groupBy]||"-";
          if(!acc[k]) acc[k]=[];
          acc[k].push(t);
          return acc;
        },{})
      ).sort(([a],[b])=>String(a||'').localeCompare(String(b||''))).map(([key,items])=>({key,items}));

  const inputStyle={width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"};
  const labelStyle={fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:0.5};

  const KAT_COLORS={"Aktivfussball":BL,"Juniorenfussball":R,"Kinderfussball Junioren":"#F97316","Juniorinnenfussball":"#EC4899","Kinderfussball Juniorinnen":"#DB2777","Seniorenfussball":AM};

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 4px",color:"var(--text)"}}>Teams</h1>
          <div style={{fontSize:13,color:"var(--sub)"}}>{teams.filter(t=>t.aktiv!==false).length} aktive Teams · {teams.filter(t=>t.aktiv===false).length} inaktiv</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* View Toggle */}
          <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
            {["list","grid"].map(m=>(
              <button key={m} onClick={()=>setViewMode(m)} style={{
                padding:"7px 11px",border:"none",cursor:"pointer",fontFamily:FONT,
                background:viewMode===m?BK:"var(--surface2)",
                color:viewMode===m?"#fff":"var(--sub)",transition:"all 0.15s"
              }}>
                <TI n={m==="list"?"layout-dashboard":"layout-grid"} size={14}/>
              </button>
            ))}
          </div>
          {/* Dreipunkt-Menü */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setOpenMenuId(openMenuId==="header"?null:"header")} style={{
              width:36,height:36,borderRadius:8,border:"1px solid var(--border)",
              background:"var(--surface2)",cursor:"pointer",display:"flex",
              alignItems:"center",justifyContent:"center",color:"var(--sub)"
            }}>
              <TI n="dots-vertical" size={15}/>
            </button>
            {openMenuId==="header"&&(
              <div style={{position:"absolute",right:0,top:40,zIndex:200,
                background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
                minWidth:180,overflow:"hidden"}}>
                <button onClick={()=>{setSaisonDraft(teams[0]?.saison||"2025/26");setShowSaison(true);setOpenMenuId(null);}}
                  style={{width:"100%",padding:"11px 16px",border:"none",background:"none",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:12,fontFamily:FONT,fontSize:13,color:"var(--text)",textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <TI n="calendar" size={14} style={{color:"var(--sub)",flexShrink:0}}/>Saison wechseln
                </button>
                <div style={{height:1,background:"var(--border)",margin:"0 12px"}}/>
                <button onClick={()=>{openNeu();setOpenMenuId(null);}}
                  style={{width:"100%",padding:"11px 16px",border:"none",background:"none",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:12,fontFamily:FONT,fontSize:13,color:"var(--text)",textAlign:"left",fontWeight:600}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <TI n="edit" size={14} style={{color:"var(--sub)",flexShrink:0}}/>+ Neues Team
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saison-Modal */}
      <ModalOrSheet open={showSaison} onClose={()=>setShowSaison(false)} maxWidth={380}>
        <div style={{padding:"24px 20px"}}>
          <h2 style={{margin:"0 0 6px",fontSize:16,fontWeight:700,color:"var(--text)"}}>Saison wechseln</h2>
          <p style={{margin:"0 0 18px",fontSize:13,color:"var(--sub)"}}>Die neue Saison wird für <strong>alle {teams.length} Teams</strong> gleichzeitig gesetzt.</p>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:0.5}}>Neue Saison</label>
            <input value={saisonDraft} onChange={e=>setSaisonDraft(e.target.value)}
              placeholder="z.B. 2025/26" autoFocus
              style={{width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={handleSaisonAlle} disabled={saving||!saisonDraft.trim()}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN} style={{
              flex:1,padding:"11px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",
              fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,
              opacity:saving||!saisonDraft.trim()?0.5:1
            }}>
              {saving?"Wird gesetzt…":"Für alle übernehmen"}
            </button>
            <Btn onClick={()=>setShowSaison(false)}>Abbrechen</Btn>
          </div>
          {!sb&&<div style={{fontSize:13,color:"var(--sub)",textAlign:"center",marginTop:10}}>Demo: nur lokal.</div>}
        </div>
      </ModalOrSheet>

      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:8,marginBottom:filterOptions.length?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Team, Trainer, Kurzname…"
          style={{flex:1,minWidth:180,...inputStyle}}/>
        {/* Gruppieren nach */}
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,width:"auto",minWidth:160,flex:"0 0 auto"}}>
          {GROUP_OPTS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        {/* Sortieren nach */}
        <div style={{display:"flex",gap:4}}>
          <select value={sortCol} onChange={e=>setSortCol(e.target.value)}
            style={{...inputStyle,width:"auto",minWidth:130,flex:"0 0 auto"}}>
            {SORT_OPTS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")}
            style={{padding:"9px 11px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",fontSize:13,color:"var(--sub)",fontFamily:FONT,flexShrink:0}}>
            {sortDir==="asc"?"↑":"↓"}
          </button>
        </div>
      </div>
      {/* Filter-Chips */}
      {filterOptions.length>0&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
          <button onClick={()=>setFilterVals([])}
            style={{padding:"4px 12px",borderRadius:20,border:"1px solid var(--border)",
              background:filterVals.length===0?BK:"var(--surface)",
              color:filterVals.length===0?"#fff":"var(--sub)",
              fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>
            Alle
          </button>
          {filterOptions.map(v=>{
            const active=filterVals.includes(v);
            const c=KAT_COLORS[v]||(active?BK:"var(--sub)");
            return(
              <button key={v} onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}
                style={{padding:"4px 12px",borderRadius:20,fontFamily:FONT,fontSize:13,fontWeight:600,cursor:"pointer",
                  transition:"all 0.15s",display:"flex",alignItems:"center",gap:4,
                  border:"1px solid "+(active?c:"var(--border)"),
                  background:active?c+"18":"var(--surface)",
                  color:active?c:"var(--sub)"}}>
                {active&&<span style={{fontSize:11}}>✓</span>}{v}
                <span style={{opacity:0.55,fontWeight:400}}>{teams.filter(t=>(t[groupBy]||"-")===v).length}</span>
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
      )}

      {/* Teams Liste */}
      {loading?(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[1,2,3].map(i=><SkelCard key={i}/>)}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {groupedTeams.map(({key,items})=>(
            <div key={key||"all"}>
              {groupBy!=="none"&&key&&(
                <div style={{padding:"10px 4px 6px",fontWeight:700,fontSize:13,color:"var(--sub)",
                  textTransform:"uppercase",letterSpacing:0.7,marginTop:8,
                  borderBottom:"1px solid var(--border)",marginBottom:8}}>
                  {key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span>
                </div>
              )}
              <div style={viewMode==="grid"
                ?{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:groupBy!=="none"?16:8}
                :{display:"flex",flexDirection:"column",gap:8,marginBottom:groupBy!=="none"?16:8}}>
                {items.map(team=>{
            const katColor=KAT_COLORS[team.hauptbereich]||KAT_COLORS[team.kategorie]||BL;
            const isInaktiv=team.aktiv===false;
            const sp=getStufePath(team);
            const spielerCount=ROSTER.filter(p=>(p.teams||[]).includes(team.name)).length;
            const haupttrainerArr=team.haupttrainer||(team.trainer?[team.trainer]:[]);const coArr=team.co_trainers||(team.trainer2?[team.trainer2]:[]);const staffArr=team.staff||[];const trainerCount=haupttrainerArr.length+coArr.length;
            const menuOpen=openMenuId===team.id;
            const openMenu=()=>setOpenMenuId(menuOpen?null:team.id);
            const closeMenu=()=>setOpenMenuId(null);
            return(
              <div key={team.id} className="cc-card" style={{borderRadius:12,border:"0.5px solid",padding:"14px 16px",opacity:isInaktiv?0.55:1,transition:"opacity 0.2s",position:"relative",cursor:viewMode==="grid"?"pointer":"default"}} onClick={viewMode==="grid"?()=>{setSelectedTeam(team);
          try{window.history.pushState({page:"team",teamDetail:true},"","#team-detail");}catch{}
          setCustomBack&&setCustomBack(()=>()=>{setSelectedTeam(null);setCustomBack&&setCustomBack(null);try{window.history.back();}catch{}});}:undefined}>
                {viewMode==="grid"?(
                  /* ── KACHEL-LAYOUT ── */
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:katColor+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <TI n="ball-football" size={18} style={{color:katColor}}/>
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{team.name}</div>
                          {team.kurzname&&<span style={{fontSize:11,fontWeight:700,color:katColor}}>{team.kurzname}</span>}
                        </div>
                      </div>
                      {/* 3-Dot Menu */}
                      <div style={{position:"relative"}}>
                        <button onClick={openMenu} style={{width:28,height:28,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)",flexShrink:0}}>
                          <TI n="dots-vertical" size={13}/>
                        </button>
                        {menuOpen&&(
                          <div style={{position:"absolute",right:0,top:32,zIndex:100,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:140,overflow:"hidden"}}>
                            {[
                              {icon:"edit", label:"Bearbeiten",color:"var(--text)", fn:()=>{openEdit(team);closeMenu();}},
                              {icon:"trash",label:"Löschen",   color:R,  fn:()=>{setDeleteConfirm(team);closeMenu();}},
                            ].map(a=>(
                              <button key={a.label} onClick={a.fn} style={{width:"100%",padding:"9px 14px",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:FONT,fontSize:13,color:a.color,textAlign:"left"}}
                                onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                                onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                <TI n={a.icon} size={13}/>{a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize:13,color:"var(--sub)",display:"flex",flexDirection:"column",gap:4}}>
                      <span>{sp.e1}{sp.e2?" · "+sp.e2:""}</span>
                      {team.liga&&<span>{team.liga}</span>}
                      <div style={{display:"flex",gap:12,marginTop:4}}>
                        <span><TI n="users" size={11}/> {spielerCount}</span>
                        <span><TI n="user" size={11}/> {trainerCount}</span>
                        {isInaktiv&&<Chip text="Inaktiv" color="#9ca3af"/>}
                      </div>
                    </div>
                  </div>
                ):(
                  /* ── LISTEN-LAYOUT ── */
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:42,height:42,borderRadius:10,background:katColor+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <TI n="ball-football" size={18} style={{color:katColor}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{team.name}</span>
                        {team.kurzname&&<span style={{fontSize:11,fontWeight:700,color:katColor,background:katColor+"15",padding:"2px 7px",borderRadius:6}}>{team.kurzname}</span>}
                        {isInaktiv&&<Chip text="Inaktiv" color="#9ca3af"/>}
                      </div>
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:4,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                        {sp.e1&&<span style={{fontWeight:600}}>{sp.e1}</span>}
                        {sp.e2&&<span>· {sp.e2}</span>}
                        {team.liga&&<span>· {team.liga}</span>}
                        {team.saison&&<span>{team.saison}</span>}
                        <span style={{display:"flex",alignItems:"center",gap:4}}><TI n="users" size={11}/> {spielerCount} Spieler</span>
                        <span style={{display:"flex",alignItems:"center",gap:4}}><TI n="user" size={11}/> {trainerCount} Trainer</span>
                      </div>
                    </div>
                    {/* Aktionen: 3-Dot auf Mobile, Buttons auf Desktop */}
                    {isMobile?(
                      <div style={{position:"relative",flexShrink:0}}>
                        <button onClick={openMenu} style={{width:34,height:34,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)"}}>
                          <TI n="dots-vertical" size={14}/>
                        </button>
                        {menuOpen&&(
                          <div style={{position:"absolute",right:0,top:38,zIndex:100,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",minWidth:150,overflow:"hidden"}}>
                            {[
                              {icon:"edit", label:"Bearbeiten",color:"var(--text)", fn:()=>{openEdit(team);closeMenu();}},
                              {icon:"trash",label:"Löschen",   color:R,  fn:()=>{setDeleteConfirm(team);closeMenu();}},
                            ].map(a=>(
                              <button key={a.label} onClick={a.fn} style={{width:"100%",padding:"10px 16px",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:FONT,fontSize:13,color:a.color,textAlign:"left"}}
                                onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                                onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                <TI n={a.icon} size={14}/>{a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ):(
                      <div style={{display:"flex",gap:8,flexShrink:0}}>

                        <button onClick={()=>openEdit(team)} title="Bearbeiten"
                          style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)"}}>
                          <TI n="edit" size={14}/>
                        </button>
                        <button onClick={()=>setDeleteConfirm(team)} title="Löschen"
                          style={{width:32,height:32,borderRadius:8,border:"1px solid "+R+"40",background:RL,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:R}}>
                          <TI n="trash" size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
          {sorted.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"var(--sub)",fontSize:13}}>
              Keine Teams gefunden.
            </div>
          )}
        </div>
      )}

      {/* Team erstellen / bearbeiten Modal */}
      <ModalOrSheet open={showForm} onClose={()=>setShowForm(false)} maxWidth={520}>
        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"var(--text)"}}>{editTeam?"Team bearbeiten":"Neues Team"}</h2>
          <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {editTeam&&(
            <div style={{display:"flex",gap:4,marginBottom:4}}>
              {["info","module"].map(t=>(
                <button key={t} onClick={()=>setFormTab(t)} style={{
                  padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:FONT,
                  fontSize:13,fontWeight:600,
                  background:formTab===t?"var(--text)":"var(--surface2)",
                  color:formTab===t?"var(--surface)":"var(--sub)"
                }}>{t==="info"?"Team-Info":"Module"}</button>
              ))}
            </div>
          )}
          {/* Ebene 1 */}
          <div>
            <label style={labelStyle}>Hauptbereich (Ebene 1)</label>
            <select value={dbStufen.length>0?form.stufe_ebene1:form.hauptbereich}
              onChange={e=>{
                if(dbStufen.length>0) setForm(p=>({...p,stufe_ebene1:Number(e.target.value)||e.target.value,stufe_ebene2:"",stufe_id:null}));
                else setForm(p=>({...p,hauptbereich:e.target.value,vereinsstufe:"",verbandskategorie:""}));
              }} style={inputStyle}>
              <option value="">— wählen —</option>
              {stufen1.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Ebene 2 + 3 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Vereinsstufe (Ebene 2)</label>
              <select value={dbStufen.length>0?form.stufe_ebene2:form.vereinsstufe}
                onChange={e=>{
                  if(dbStufen.length>0){
                    const s2=dbStufen.find(s=>s.id===(Number(e.target.value)||e.target.value));
                    setForm(p=>({...p,stufe_ebene2:Number(e.target.value)||e.target.value,stufe_id:null,stufenleitung:s2?.stufenleitung||p.stufenleitung}));
                  }else setForm(p=>({...p,vereinsstufe:e.target.value,verbandskategorie:""}));
                }} style={inputStyle}>
                <option value="">— wählen —</option>
                {getStufen2(dbStufen.length>0?form.stufe_ebene1:form.hauptbereich).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Verbandskategorie (Ebene 3)</label>
              <select value={dbStufen.length>0?form.stufe_id:form.verbandskategorie}
                onChange={e=>{
                  if(dbStufen.length>0) setForm(p=>({...p,stufe_id:Number(e.target.value)||e.target.value||null}));
                  else setForm(p=>({...p,verbandskategorie:e.target.value}));
                }} style={inputStyle}>
                <option value="">— wählen —</option>
                {getStufen3(dbStufen.length>0?form.stufe_ebene2:form.vereinsstufe).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* Ebene 4: Teamname + Kurzname */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Teamname (Ebene 4) *</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="z.B. Cc-Junioren" style={inputStyle} autoFocus/>
            </div>
            <div>
              <label style={labelStyle}>Kurzname</label>
              <input value={form.kurzname} onChange={e=>setForm(p=>({...p,kurzname:e.target.value}))}
                placeholder="z.B. Cc" style={inputStyle}/>
            </div>
          </div>
          {/* Stufenleitung + Liga */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Stufenleitung</label>
              <input value={form.stufenleitung} onChange={e=>setForm(p=>({...p,stufenleitung:e.target.value}))}
                placeholder="z.B. Stufenleitung Junioren C" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Liga / Wettbewerb</label>
              <input value={form.liga} onChange={e=>setForm(p=>({...p,liga:e.target.value}))}
                placeholder="z.B. U13 Liga A" style={inputStyle}/>
            </div>
          </div>
          {/* Saison + Status */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle}>Saison</label>
              <input value={form.saison} onChange={e=>setForm(p=>({...p,saison:e.target.value}))}
                placeholder="2024/25" style={inputStyle}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={labelStyle}>Status</label>
              <div style={{display:"flex",alignItems:"center",gap:12,height:38}}>
                <button onClick={()=>setForm(p=>({...p,aktiv:!p.aktiv}))} style={{
                  position:"relative",width:44,height:24,borderRadius:12,border:"none",
                  background:form.aktiv?ACCENT:"var(--border)",cursor:"pointer",padding:0,flexShrink:0,
                  transition:"background 0.2s"
                }}>
                  <div style={{position:"absolute",top:3,left:form.aktiv?21:3,width:18,height:18,borderRadius:"50%",background:form.aktiv?"#111":"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/>
                </button>
                <span style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{form.aktiv?"Aktiv":"Inaktiv"}</span>
              </div>
            </div>
          </div>
          {/* Staff Arrays */}
          {[
            {key:"haupttrainer",label:"Trainer/in",  placeholder:"Person suchen…"},
            {key:"co_trainers", label:"Assistent/in",placeholder:"Person suchen…"},
            {key:"staff",       label:"Weiterer Staff",placeholder:"Name / Funktion suchen…"},
          ].map(({key,label,placeholder})=>(
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(form[key]||[]).map((val,i)=>(
                  <div key={i} style={{display:"flex",gap:8}}>
                    <PersonPicker
                      value={val}
                      onChange={v=>setForm(p=>({...p,[key]:p[key].map((x,j)=>j===i?v:x)}))}
                      placeholder={placeholder}
                      style={{flex:1}}/>
                    <button onClick={()=>setForm(p=>({...p,[key]:p[key].filter((_,j)=>j!==i)}))}
                      style={{width:36,height:38,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",color:R,flexShrink:0,fontSize:16}}>×</button>
                  </div>
                ))}
                <button onClick={()=>setForm(p=>({...p,[key]:[...(p[key]||[]),""]}))}
                  style={{padding:"7px 14px",borderRadius:8,border:"1px dashed var(--border)",background:"none",cursor:"pointer",fontSize:13,color:"var(--sub)",fontFamily:FONT,textAlign:"left"}}>
                  + {label} hinzufügen
                </button>
              </div>
            </div>
          ))}
          {/* Beschreibung */}
          <div>
            <label style={labelStyle}>Beschreibung (optional)</label>
            <textarea value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))}
              placeholder="Zusätzliche Infos zum Team…" rows={3}
              style={{...inputStyle,resize:"vertical"}}/>
          </div>
          {/* Status-Meldung */}
          {msg&&(
            <div style={{padding:"10px 14px",borderRadius:8,fontSize:13,fontWeight:600,
              background:msg.type==="ok"?"#ECFDF5":RL,
              color:msg.type==="ok"?GN:R,
              border:"1px solid "+(msg.type==="ok"?GN:R)}}>
              {msg.text}
            </div>
          )}
          {/* Modul-Tab: nur bei bestehenden Teams */}
          {editTeam&&formTab==="module"&&(
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:12}}>
                Module ein/ausschalten für dieses Team. Trainer sehen nur aktive Module.
              </div>
              {[
                {key:"team",        label:"Kader"},
                {key:"training",    label:"Trainingsplan"},
                {key:"events",      label:"Termine / Anwesenheit"},
                {key:"spielplan",   label:"Spielplan & Tabelle"},
                {key:"attendance_central",label:"Anwesenheitsstatistik"},
                {key:"helpers",     label:"Helfereinsätze"},
                {key:"roster",      label:"Kaderliste"},
                {key:"polls",       label:"Abstimmungen"},
                {key:"stats",       label:"Statistik"},
                {key:"media",       label:"Medien & Berichte"},
                {key:"news",        label:"News"},
                {key:"wiki",        label:"Wiki"},
                {key:"docs",        label:"Dokumente"},
              ].map(mod=>{
                const isActive=(form.module_aktiv||editTeam.module_aktiv||[]).includes(mod.key);
                return(
                  <div key={mod.key} onClick={()=>setForm(p=>{
                    const cur=p.module_aktiv||editTeam.module_aktiv||[];
                    return{...p,module_aktiv:isActive?cur.filter(m=>m!==mod.key):[...cur,mod.key]};
                  })} style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"9px 12px",borderRadius:8,marginBottom:6,cursor:"pointer",
                    background:isActive?"var(--surface2)":"transparent",
                    border:"1px solid "+(isActive?"var(--border)":"transparent")
                  }}>
                    <span style={{fontSize:13,color:"var(--text)"}}>{mod.label}</span>
                    <div style={{
                      width:36,height:20,borderRadius:10,transition:"background 0.2s",
                      background:isActive?BK:"var(--border)",position:"relative"
                    }}>
                      <div style={{
                        position:"absolute",top:3,width:14,height:14,borderRadius:"50%",
                        background:"var(--surface)",transition:"left 0.2s",
                        left:isActive?19:3
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Buttons */}
          <div style={{display:"flex",gap:12}}>
            <button onClick={handleSave} disabled={saving}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN} style={{
              flex:1,padding:"12px 20px",borderRadius:10,background:BTN,color:BTN_TXT,border:"none",
              fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,
              opacity:saving?0.6:1,transition:"background 0.15s, opacity 0.2s"
            }}>
              {saving?"Speichern…":editTeam?"Änderungen speichern":"Team erstellen"}
            </button>
            <Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn>
          </div>
          {!sb&&<div style={{fontSize:13,color:"var(--sub)",textAlign:"center"}}>Demo-Modus: Änderungen nicht persistent.</div>}
        </div>
      </ModalOrSheet>

      {/* Löschen bestätigen */}
      <ModalOrSheet open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} maxWidth={420}>
        <div style={{padding:"24px 20px",textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:RL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <TI n="trash" size={22} style={{color:R}}/>
          </div>
          <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:8}}>Team löschen?</div>
          <div style={{fontSize:13,color:"var(--sub)",marginBottom:20}}>
            <strong style={{color:"var(--text)"}}>{deleteConfirm?.name}</strong> wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
          </div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>handleDelete(deleteConfirm)} disabled={saving}
              style={{flex:1,padding:"8px 14px",borderRadius:10,background:R,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,opacity:saving?0.6:1}}>
              {saving?"Löschen…":"Ja, löschen"}
            </button>
            <Btn onClick={()=>setDeleteConfirm(null)}>Abbrechen</Btn>
          </div>
        </div>
      </ModalOrSheet>
    </div>
  );
}

export { TeamsVerwaltungModul, TeamsAdminView };
