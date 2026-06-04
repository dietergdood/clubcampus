import { useState, useEffect, useRef, createContext, useContext } from "react";
import { FONT, BP_MOBILE, BP_TABLET, BTN_COLOR as BTN, BTN_TXT, BTN_HOV, ACCENT, ACCENT2, ACCENT20, ACCENT15, ACCENT12, GN, R, RL, BL, AM, BK, GR, GB } from "./constants";
import { TI, TI_PATHS } from "./icons.jsx";
import { LOGO_B64, ThemeCtx, useTheme, PWA_CSS, hexToRgba, darkenHex, THEME_DEFAULT_STATIC, useBreakpoint, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip } from "./theme.jsx";
import NachrichtenModul from "./NachrichtenModul.jsx";
import { TeamModuleMatrix, PortalverwaltungView } from "./PortalverwaltungModul.jsx";
import { SlotModal, SpielDetail, TermineModul, SpielplanModul } from "./TermineModul.jsx";

/* -- SUPABASE wird als Prop von App.jsx übergeben (kein Import hier) -- */

/* -- Farben & Konstanten via ./constants.js -- */

/* ── TEAM-HIERARCHIE (Baumstruktur) ── */
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



/* ── PWA THEME SYSTEM ── */

/* ── Globales CSS (wird per useEffect injiziert) ── */
if(typeof window!=="undefined"&&!window.storage){
  window.storage={
    get:async(k)=>{const v=localStorage.getItem(k);return v?{value:v}:null;},
    set:async(k,v)=>{localStorage.setItem(k,v);return{key:k,value:v};},
    delete:async(k)=>{localStorage.removeItem(k);return{key:k,deleted:true};},
    list:async(prefix="")=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix));return{keys};},
  };
}

/* Icons via ./icons.js */

/* useBreakpoint, useIsMobile via ./hooks.js */

/* ── SPLASH SCREEN ── */

/* ── SKELETON LOADER ── */
function Skel({h=14,w="100%",br=6,mb=0,style={}}){
  return <div style={{height:h,width:w,borderRadius:br,marginBottom:mb,background:"linear-gradient(90deg,var(--border) 25%,var(--surface2) 50%,var(--border) 75%)",backgroundSize:"200% 100%",animation:"cc-shimmer 1.5s infinite",...style}}/>;
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
function SkelList({rows=4}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {Array.from({length:rows},(_,i)=>(
        <div key={i} className="cc-card" style={{borderRadius:12,padding:"14px 18px",border:"0.5px solid",display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:"var(--border)",animation:"cc-shimmer 1.5s infinite",flexShrink:0}}/>
          <div style={{flex:1}}><Skel h={11} w="60%" br={4} mb={7}/><Skel h={9} w="40%" br={4}/></div>
        </div>
      ))}
    </div>
  );
}

/* Reusable Modal/BottomSheet - desktop: centered modal, mobile: slides up from bottom */
/* ── PERSON PICKER ── */
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
            <button key={m.id} onMouseDown={()=>select(m.name)} style={{
              width:"100%",padding:"9px 14px",border:"none",background:"none",
              cursor:"pointer",display:"flex",alignItems:"center",gap:12,
              textAlign:"left",fontFamily:FONT
            }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <Av name={m.name} size={26} bg="var(--surface2)"/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{m.name}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>{m.role}{m.team&&m.team!=="-"?" · "+m.team:""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ModalOrSheet via ./hooks.jsx */

function getVereinsnameStatic(){
  try{const t=localStorage.getItem("cc-theme");return t?(JSON.parse(t).vereinsname||"ClubCampus"):"ClubCampus";}catch{return "ClubCampus";}
}
/* Hex → rgba() für Hover-Farben */

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

/* ── VEREINSFUNKTIONEN (organisatorisch) ───────────────────────
   Was jemand im Verein IST – unabhängig vom Portal-Zugang.
   Gespeichert in mitglieder.funktion
───────────────────────────────────────────────────────────── */
const FUNKTIONEN = [
  "Spieler",
  "Trainer",
  "Assistent/in",
  "Goalietrainer",
  "Vorstand",
  "Kassier",
  "Materialwart",
  "Platzwart",
  "Schiedsrichter",
  "Elternteil",
  "Ehrenmitglied",
  "Passivmitglied",
  "Gönner",
  "Sonstige",
];

/* ── MITGLIEDTYPEN ─────────────────────────────────────────── */
const MITGLIEDTYPEN = [
  "Aktivmitglied",
  "Passivmitglied",
  "Ehrenmitglied",
  "Freimitglied",
  "Gönner",
];

/* -- SAFE ROLES LOOKUP -- */
/* ── Termintyp-Berechtigungen ──────────────────────────
   typ: "vereinsanlass" | "team_event" | "spiel" | "training"
   meineTeams: Array mit Teamnamen des Benutzers
─────────────────────────────────────────────────────── */
function kannTerminLesen(role){ return true; /* alle sehen Termine */ }

function kannTerminAnmelden(role){
  return ["administrator","administration","funktionaer","trainer","spieler","eltern"].includes(role);
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

function kannTerminBearbeiten(role, typ, team, meineTeams=[]){
  return kannTerminErstellen(role, typ, team, meineTeams);
}

function kannTerminAbsagen(role, typ, team, meineTeams=[]){
  return kannTerminErstellen(role, typ, team, meineTeams);
}

function kannHelferEinsatzErstellen(role, typ, team, meineTeams=[]){
  if(role==="administrator"||role==="administration"||role==="funktionaer") return true;
  if(role==="trainer") return typ==="team"&&(meineTeams||[]).includes(team);
  return false;
}

function getTerminTypLabel(typ){
  return {vereinsanlass:"Vereinsanlass",team_event:"Team-Event",spiel:"Spiel",training:"Training"}[typ]||typ||"Termin";
}

/* ── Funktionär: effektive Zugriffstufe berechnen ─────
   Gruppe = Default-Stufe, Funktion = Override (höher gewinnt)
─────────────────────────────────────────────────────── */
const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};

function maxStufe(a, b){
  if(!a) return b; if(!b) return a;
  return STUFE_RANG[a]>STUFE_RANG[b]?a:b;
}

function getEffektiveStufeForFunktionaer(dbFunktionen, modulKey){
  let best=null;
  (dbFunktionen||[]).forEach(f=>{
    /* Gruppen-Default */
    const gs=f.portal_gruppen?.modul_stufen?.[modulKey]||f.gruppe_modul_stufen?.[modulKey];
    if(gs) best=maxStufe(best,gs);
    /* Funktions-Override */
    const fo=f.stufe_override?.[modulKey];
    if(fo) best=maxStufe(best,fo);
  });
  return best; /* null = kein Zugriff */
}

function getModuleForFunktionaer(dbFunktionen){
  const mods=new Set();
  (dbFunktionen||[]).forEach(f=>{
    /* Module aus Gruppe */
    (f.portal_gruppen?.module||f.gruppe_module||[]).forEach(m=>mods.add(m));
    /* module_override überschreibt (Einschränkung) */
    if(f.module_override?.length>0){
      /* nur die override-Module behalten */
    }
  });
  return[...mods];
}

function getRole(role){
  const norm=(role||"spieler").toLowerCase()
    .replace("ä","ae").replace("ö","oe").replace("ü","ue")
    .replace("funktionär","funktionaer");
  return ROLES[norm]||ROLES.spieler;
}


/* -- NAV PRO ROLLE (gemäss Kap. 27) -- */
const NAV_BY_ROLE = {
  administrator: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"members",            icon:"users",            label:"Mitglieder"},
    {key:"team",               icon:"wappen",           label:"Teams"},
    {key:"training",           icon:"calendar",         label:"Trainingsplan"},
    {key:"schedule",           icon:"flag",             label:"Spielplan/FVRZ"},
    {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheitsstatistik"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"package",          label:"Material"},
    {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
    {key:"media",              icon:"speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"book",             label:"Wiki"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
    {key:"portal",             icon:"settings",         label:"Portalverwaltung"},
  ],
  vorstand: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"members",            icon:"users",            label:"Mitglieder"},
    {key:"team",               icon:"wappen",           label:"Teams"},
    {key:"training",           icon:"calendar",         label:"Trainingsplan"},
    {key:"schedule",           icon:"flag",             label:"Spielplan"},
    {key:"attendance_central", icon:"chart-bar",        label:"Auswertungen"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"package",          label:"Material"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"media",              icon:"speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"book",             label:"Wiki"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
  ],
  administration: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"members",            icon:"users",            label:"Mitglieder"},
    {key:"team",               icon:"wappen",           label:"Teams"},
    {key:"training",           icon:"calendar",         label:"Trainingsplan"},
    {key:"schedule",           icon:"flag",             label:"Spielplan"},
    {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheitsstatistik"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"package",          label:"Material"},
    {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"media",              icon:"speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"book",             label:"Wiki"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
    {key:"portal",             icon:"settings",         label:"Portalverwaltung"},
  ],
  funktionaer: [
    /* Basis-Navigation — wird durch dbGruppen erweitert (siehe getNavForRole) */
    {key:"dashboard",    icon:"layout-dashboard", label:"Home"},
    {key:"nachrichten",  icon:"message",          label:"Nachrichten"},
  ],
  trainer: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"team",               icon:"wappen",           label:"Mein Team"},
    {key:"training",           icon:"calendar",         label:"Trainingsplan"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"package",          label:"Material"},
    {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
    {key:"media",              icon:"speakerphone",     label:"Medien & Berichte"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"wiki",               icon:"book",             label:"Wiki"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
  ],
  spieler: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"team",               icon:"wappen",           label:"Mein Team"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
    {key:"profile",            icon:"user",             label:"Mein Profil"},
  ],
  eltern: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"team",               icon:"wappen",           label:"Mein Kind"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"docs",               icon:"file-text",        label:"Dokumente"},
    {key:"profile",            icon:"user",             label:"Profil / Daten prüfen"},
  ],
};

/* ── MOBILE NAV: max 4 Haupt-Tabs + «Mehr» ──────────────
   Desktop: volle NAV_BY_ROLE Sidebar
   Mobile:  4 wichtigste + Mehr-Button (Bottom Sheet)
─────────────────────────────────────────────────────── */
const MOBILE_NAV_BY_ROLE = {
  administrator: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"members",            icon:"users",            label:"Mitglieder"},
      {key:"team",               icon:"wappen",           label:"Teams"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"portal",             icon:"settings",         label:"Portal"},
    ],
    mehr: [
      {key:"training",           icon:"calendar",         label:"Trainingsplan"},
      {key:"schedule",           icon:"flag",             label:"Spielplan"},
      {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheit"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
      {key:"buses",              icon:"bus",              label:"Busse"},
      {key:"material",           icon:"package",          label:"Material"},
      {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
      {key:"news",               icon:"news",             label:"News"},
      {key:"media",              icon:"speakerphone",     label:"Medien"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
  vorstand: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"team",               icon:"wappen",           label:"Teams"},
      {key:"members",            icon:"users",            label:"Mitglieder"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
    ],
    mehr: [
      {key:"training",           icon:"calendar",         label:"Trainingsplan"},
      {key:"schedule",           icon:"flag",             label:"Spielplan"},
      {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheit"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
      {key:"buses",              icon:"bus",              label:"Busse"},
      {key:"material",           icon:"package",          label:"Material"},
      {key:"news",               icon:"news",             label:"News"},
      {key:"media",              icon:"speakerphone",     label:"Medien"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
  administration: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"members",            icon:"users",            label:"Mitglieder"},
      {key:"team",               icon:"wappen",           label:"Teams"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"portal",             icon:"settings",         label:"Portal"},
    ],
    mehr: [
      {key:"training",           icon:"calendar",         label:"Trainingsplan"},
      {key:"schedule",           icon:"flag",             label:"Spielplan"},
      {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheit"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
      {key:"buses",              icon:"bus",              label:"Busse"},
      {key:"material",           icon:"package",          label:"Material"},
      {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
      {key:"news",               icon:"news",             label:"News"},
      {key:"media",              icon:"speakerphone",     label:"Medien"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
  funktionaer: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfer"},
      {key:"news",               icon:"news",             label:"News"},
    ],
    mehr: [
      {key:"material",           icon:"package",          label:"Material"},
      {key:"buses",              icon:"bus",              label:"Busse"},
      {key:"media",              icon:"speakerphone",     label:"Medien"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
  trainer: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"team",               icon:"wappen",           label:"Mein Team"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"attendance_central", icon:"chart-bar",        label:"Stats"},
    ],
    mehr: [
      {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
      {key:"material",           icon:"package",          label:"Material"},
      {key:"media",              icon:"speakerphone",     label:"Medien"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"news",               icon:"news",             label:"News"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
  spieler: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"team",               icon:"wappen",           label:"Mein Team"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfer"},
    ],
    mehr: [
      {key:"news",               icon:"news",             label:"News"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
      {key:"buses",              icon:"bus",              label:"Busse"},
    ],
  },
  eltern: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"team",               icon:"wappen",           label:"Mein Kind"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfer"},
    ],
    mehr: [
      {key:"news",               icon:"news",             label:"News"},
      {key:"wiki",               icon:"book",             label:"Wiki"},
      {key:"docs",               icon:"file-text",        label:"Dokumente"},
    ],
  },
};

/* Global nav target - allows Dashboard to set initial tab on TeamView */
const NAV_TARGET={tab:null,filter:null,kindTeam:null,openEvId:null,selectedSpiel:null};
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* -- DATA -- */
const ROSTER=[
  {id:1,
   lastName:"Meier",     firstName:"Luca",   pos:"ST", dob:"12.03.2012", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.1234.5678.90", pass:"A-1234", js:"JS-4421", fairgate:"FG-10042",
   street:"Seestrasse 12", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.meier@mail.com", tel:"+41 79 123 45 67",
   teams:["Cc-Junioren"],
   p1Last:"Meier",   p1First:"Anna",  p1Email:"a.meier@mail.com",   p1Tel:"+41 79 888 11 22",
   p2Last:"Meier",   p2First:"Peter", p2Email:"p.meier@mail.com",   p2Tel:"+41 79 888 11 23"},
  {id:2,
   lastName:"Keller",    firstName:"Noah",   pos:"ZM", dob:"05.07.2012", nat:"CH", heimatort:"Meilen",
   ahv:"756.2345.6789.01", pass:"A-2345", js:"JS-4422", fairgate:"FG-10043",
   street:"Bergweg 3",    plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"n.keller@mail.com", tel:"+41 79 234 56 78",
   teams:["Cc-Junioren","A-Junioren"],
   p1Last:"Keller",  p1First:"Beat",  p1Email:"b.keller@mail.com",  p1Tel:"+41 79 777 22 33",
   p2Last:"Keller",  p2First:"Rita",  p2Email:"r.keller@mail.com",  p2Tel:"+41 79 777 22 34"},
  {id:3,
   lastName:"Bauer",     firstName:"Finn",   pos:"RM", dob:"22.11.2011", nat:"DE", heimatort:"Meilen",
   ahv:"756.3456.7890.12", pass:"A-3456", js:"JS-4423", fairgate:"FG-10044",
   street:"Dorfstrasse 7",plz:"8706", city:"Meilen",     canton:"ZH", country:"Schweiz",
   email:"f.bauer@mail.com", tel:"+41 79 345 67 89",
   teams:["Cc-Junioren"],
   p1Last:"Bauer",   p1First:"Petra", p1Email:"p.bauer@mail.com",   p1Tel:"+41 79 666 33 44",
   p2Last:"Bauer",   p2First:"Klaus", p2Email:"k.bauer@mail.com",   p2Tel:"+41 79 666 33 45"},
  {id:4,
   lastName:"Wolf",      firstName:"Elias",  pos:"TW", dob:"08.01.2012", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.4567.8901.23", pass:"A-4567", js:"JS-4424", fairgate:"FG-10045",
   street:"Rebgasse 5",   plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"e.wolf@mail.com", tel:"+41 79 456 78 90",
   teams:["Cc-Junioren"],
   p1Last:"Wolf",    p1First:"Kurt",  p1Email:"k.wolf@mail.com",    p1Tel:"+41 79 555 44 55",
   p2Last:"Wolf",    p2First:"Sonja", p2Email:"s.wolf@mail.com",    p2Tel:"+41 79 555 44 56"},
  {id:5,
   lastName:"Schmid",    firstName:"Jan",    pos:"IV", dob:"30.06.2012", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.5678.9012.34", pass:"A-5678", js:"JS-4425", fairgate:"FG-10046",
   street:"Hauptstrasse 18",plz:"8706", city:"Meilen",  canton:"ZH", country:"Schweiz",
   email:"j.schmid@mail.com", tel:"+41 79 567 89 01",
   teams:["Cc-Junioren"],
   p1Last:"Schmid",  p1First:"Monika",p1Email:"m.schmid@mail.com",  p1Tel:"+41 79 444 55 66",
   p2Last:"Schmid",  p2First:"Thomas",p2Email:"t.schmid@mail.com",  p2Tel:"+41 79 444 55 67"},
  {id:6,
   lastName:"Fischer",   firstName:"Leon",   pos:"IV", dob:"14.09.2011", nat:"AT", heimatort:"Wien",
   ahv:"756.6789.0123.45", pass:"A-6789", js:"JS-4426", fairgate:"FG-10047",
   street:"Im Grund 2",   plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.fischer@mail.com", tel:"+41 79 678 90 12",
   teams:["Cc-Junioren","A-Junioren"],
   p1Last:"Fischer", p1First:"Hans",  p1Email:"h.fischer@mail.com", p1Tel:"+41 79 333 66 77",
   p2Last:"Fischer", p2First:"Gabi",  p2Email:"g.fischer@mail.com", p2Tel:"+41 79 333 66 78"},
  {id:7,
   lastName:"Keller",     firstName:"Tim",   pos:"V", dob:"08.04.1999", nat:"CH", heimatort:"Feldbach",
   ahv:"756.4582.4811.74", pass:"A-1434", js:"", fairgate:"FG-10007",
   street:"Lindenstrasse 6", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"t.keller@mail.com", tel:"+41 79 704 64 14",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:8,
   lastName:"Graf",     firstName:"Sebastian",   pos:"RM", dob:"08.07.2003", nat:"CH", heimatort:"Feldbach",
   ahv:"756.5552.3547.37", pass:"A-6514", js:"", fairgate:"FG-10008",
   street:"Widenstrasse 1", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"s.graf@mail.com", tel:"+41 79 877 30 99",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""}
]
/* Computed name field for backward compat */
ROSTER.forEach((p,i)=>{ p.name=`${p.firstName} ${p.lastName}`; p.address=`${p.street}, ${p.plz} ${p.city}`; p.parent=`${p.p1First} ${p.p1Last} / ${p.p1Tel}`; p.gruppe=p.teams[0]; if(!p.rueckennr) p.rueckennr=null; });

/* -- BENUTZERKONTEN mit Mehrfach-Rollen (Szenario 2 + 3) -- */
const USER_ACCOUNTS={
  trainer:    {name:"Thomas Müller",  rollen:["trainer"],   primaryRole:"trainer",  kinder:[],trainerTeams:["Cc-Junioren"]},
  spieler:    {name:"Luca Meier",     rollen:["spieler"],   primaryRole:"spieler",  kinder:[]},
  eltern:     {name:"Anna Meier",     rollen:["eltern"],    primaryRole:"eltern",   kinder:[{name:"Luca Meier",team:"Cc-Junioren",rosterId:1},{name:"Nina Meier",team:"E-Juniorinnen",rosterId:152}]},
  /* Szenario 2: Thomas Müller = Trainer + Spieler + Vater */
  multi_trainer:{name:"Thomas Müller",rollen:["trainer","spieler","eltern"],primaryRole:"trainer",kinder:[{name:"Lukas Müller",team:"Cc-Junioren"}],trainerTeams:["Cc-Junioren","A-Junioren"]},
  /* Szenario 3: Beat Keller = Elternteil zweier Kinder */
  multi_eltern: {name:"Beat Keller",  rollen:["eltern"],   primaryRole:"eltern",   kinder:[{name:"Noah Keller",team:"Cc-Junioren",rosterId:2},{name:"Sara Keller",team:"D-Juniorinnen",rosterId:211}]},
  administrator:{name:"Admin System", rollen:["administrator"],primaryRole:"administrator",kinder:[]},
  administration:{name:"Sandra Berger",rollen:["administration"],primaryRole:"administration",kinder:[]},
  funktionaer:  {name:"Beat Zimmermann",rollen:["funktionaer"],primaryRole:"funktionaer",kinder:[]},
  /* -- Weitere Trainer -- */
  trainer_herren:   {name:"Stefan Bauer",     rollen:["trainer","spieler"],primaryRole:"trainer",  kinder:[],trainerTeams:["1. Mannschaft Herren","2. Mannschaft Herren"],rosterId:202,team:"1. Mannschaft Herren"},
  trainer_frauen:   {name:"Sandra Zimmermann",rollen:["trainer"],primaryRole:"trainer",  kinder:[],trainerTeams:["1. Mannschaft Frauen"],rosterId:203},
  trainer_ca:       {name:"Markus Weber",     rollen:["trainer"],primaryRole:"trainer",  kinder:[],trainerTeams:["Ca-Junioren","Cc-Junioren"],rosterId:204},
  /* -- Weitere Spieler -- */
  spieler_herren:   {name:"Tim Keller",       rollen:["spieler"],primaryRole:"spieler",  kinder:[],rosterId:7,  team:"1. Mannschaft Herren"},
  spieler_frauen:   {name:"Laura Keller",     rollen:["spieler"],primaryRole:"spieler",  kinder:[],rosterId:37, team:"1. Mannschaft Frauen"},
  spieler_da:       {name:"Michael Brunschweiger",rollen:["spieler"],primaryRole:"spieler",kinder:[],rosterId:100,team:"Da-Junioren"},
  /* -- Weitere Eltern -- */
  eltern_herren:    {name:"Marianne Keller",  rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Tim Keller",team:"1. Mannschaft Herren",rosterId:7}]},
  eltern_ca:        {name:"Petra Weber",      rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Jonas Weber",team:"Ca-Junioren",rosterId:80}]},
  eltern_multi:     {name:"Claudia Brunner",  rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Simon Brunner",team:"Da-Junioren",rosterId:101},{name:"Lena Brunner",team:"Bb-Junioren",rosterId:66}]},
};

const SCHEDULE=[
  {team:"Cc-Junioren",id:1,date:"Sa 24.05.",time:"10:00",opponent:"FC Küsnacht",  home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Ostschweizer Cup", liga:"U12 Cup",    spielNr:"2026-CUP-0814", status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Beat Zimmermann",  delegierter:"-", notes:"",                   treffpunkt:"09:15 Sportanlage Aabach", stats:null},
  {team:"Cc-Junioren",id:2,date:"Mi 28.05.",time:"17:30",opponent:"SC Männedorf", home:false,venue:"Sportplatz Männedorf",              venueAddr:"Seefeldstrasse 4, 8708 Männedorf",  comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-1023",  status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Thomas Huber",     delegierter:"-", notes:"Auswärtsspiel - Parkplatz beim Sportplatz nutzen", treffpunkt:"16:45 Bahnhof Meilen", stats:null},
  {team:"Cc-Junioren",id:3,date:"Sa 07.06.",time:"09:30",opponent:"FC Rapperswil",home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-1089",  status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Sandra Meier",     delegierter:"-", notes:"",                   treffpunkt:"09:00 Sportanlage Aabach", stats:null},
  {team:"Cc-Junioren",id:4,date:"Sa 17.05.",time:"10:00",opponent:"FC Thalwil",   home:false,venue:"Sportplatz Thalwil",                venueAddr:"Dorfstrasse 22, 8800 Thalwil",      comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-0987",  status:"Gespielt",   result:"2:1",htResult:"1:0",att:16, schiedsrichter:"Marco Frei",       delegierter:"-", notes:"",                   treffpunkt:"09:15 Sportanlage Aabach",
    stats:{
      kader:[1,2,3,4,5,6],
      tore:[{spieler:"Luca Meier",min:23,eigentor:false},{spieler:"Finn Bauer",min:61,eigentor:false}],
      assists:[{spieler:"Noah Keller",min:23},{spieler:"Luca Meier",min:61}],
      karten:[{spieler:"Leon Fischer",min:44,type:"gelb"}],
      wechsel:[{raus:"Jan Schmid",rein:"Elias Wolf",min:50}],
    }},
  {team:"Cc-Junioren",id:5,date:"Mi 14.05.",time:"17:30",opponent:"SC Wädenswil", home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-0944",  status:"Gespielt",   result:"1:1",htResult:"0:1",att:15, schiedsrichter:"Lukas Benz",       delegierter:"-", notes:"",                   treffpunkt:"17:00 Sportanlage Aabach",
    stats:{
      kader:[1,2,4,5,6],
      tore:[{spieler:"Luca Meier",min:78,eigentor:false}],
      assists:[{spieler:"Noah Keller",min:78}],
      karten:[],
      wechsel:[{raus:"Leon Fischer",rein:"Jan Schmid",min:55}],
    }},
  {id:7,team:"1. Mannschaft Herren",date:"Sa 03.05.",time:"15:00",opponent:"FC Horgen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1007",status:"Gespielt",result:"1:0",htResult:"1:2",att:11,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"14:30 Sportanlage Aabach",stats:null}
]
const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};
(async()=>{
  try{
    const res=await window.storage.get("rueckennrn");
    if(res){const d=JSON.parse(res.value);Object.assign(NR_CACHE.data,d);}
  }catch(e){}
})();
function getNr(id){return NR_CACHE.data[id]||"";}

const TABLES={
  "Cc-Junioren":[
  {rank:1,team:"FC Küsnacht",   sp:12,s:9,u:2,n:1,tore:"34:12",diff:22, pts:29,me:false},
  {rank:2,team:getVereinsnameStatic(), sp:12,s:8,u:2,n:2,tore:"28:14",diff:14, pts:26,me:true},
  {rank:3,team:"SC Männedorf",  sp:12,s:6,u:3,n:3,tore:"24:18",diff:6,  pts:21,me:false}
]};
/* Fallback for routes without team context */
const TABLE=TABLES["Cc-Junioren"]
const ATT_EVENTS=[];
/* Initial Zusagen/Absagen pro Ereignis und Spieler-ID
   status: "zu"|"ab"|"fraglich"|null  */
const ATT_INITIAL=(()=>{
  const init = {};
  return init;
})();
const ATT_LOG=[];

const GANTT=[];

/* -- TRAININGSPLÄTZE -- */
const TRAININGSPLAETZE_DEFAULT = [
  {id:"hauptplatz_a", name:"Hauptplatz A",       active:true,  halfn:["Hüttliseite","Rappiseite"]},
  {id:"nebenplatz_b", name:"Nebenplatz B",        active:true,  halfn:["Bergseite","Seeseite"]},
  {id:"platz_c",      name:"Platz C",             active:true,  halfn:[]},
  {id:"halle",        name:"Turnhalle (Winter)",  active:false, halfn:[]},
  {id:"erlenbach",    name:"Platz Erlenbach",     active:false, halfn:[]},
];
// Runtime array — loaded from localStorage or default
const TRAININGSPLAETZE = TRAININGSPLAETZE_DEFAULT.slice();

const EVENTS=[
  {id:1,date:"10.06.2026",time:"19:00",title:"Elternabend Cc-Junioren",type:"Team-Event",rsvp:true, res:{y:11,n:2,o:5},loc:"Vereinslokal"},
  {id:2,date:"14.06.2026",time:"09:00",title:"Grümpelturnier 2026",   type:"Vereinsanlass",     rsvp:false,loc:"Sportanlage Aabach"},
  {id:3,date:"20.06.2026",time:"18:30",title:"Saisonabschluss C-Jun.",type:"Team-Event",rsvp:true, res:{y:14,n:1,o:3},loc:"Vereinslokal"},
  {id:4,date:"25.06.2026",time:"19:30",title:"Generalversammlung",    type:"Vereinsanlass",     rsvp:true, res:{y:42,n:8,o:15},loc:"Mehrzweckhalle"},
];

const POLLS=[
  {id:1,title:"Treffpunkt Auswärtsspiel Sa 24.05.",options:["Sportanlage 08:30","Bahnhof Meilen 09:00","Direkt am Spielort"],votes:[5,8,2],closed:false,target:"Spieler & Eltern"},
  {id:2,title:"Trainingsort nächste Woche",         options:["Platz A","Platz B","Egal"],                                    votes:[6,3,4],closed:true, target:"Spieler"},
];

const HELPER_GRUPPEN=["Alle","Trainer","Spieler","Eltern","Cc-Junioren Eltern","D-Junioren Eltern","Vorstand","Funktionäre","Administration"];
const HELPER_EVENTS=[
  {
    id:1,name:"Grümpelturnier 2026",date:"Sa 14.06.2026 - So 15.06.2026",loc:"Sportanlage Aabach",color:"var(--sub)",
    einsaetze:[
      {id:101,name:"Aufbau",    date:"Fr 13.06.2026",time:"14:00-18:00",ort:"Sportanlage",gruppen:["Alle"],
       schichten:[{id:1001,label:"Aufbau 14:00-18:00 Uhr",max:5,helfer:["Thomas Müller","Daniel Huber","Laura Imhof","Luca Meier","Tim Keller"]}]},
      {id:102,name:"Grill",     date:"Sa 14.06.2026",time:"10:00-22:00",ort:"Grillstand",gruppen:["Alle"],
       schichten:[
         {id:1002,label:"Grill 10:00-14:00 Uhr",max:3,helfer:["Anna Meier","Beat Keller","Laura Keller"]},
         {id:1003,label:"Grill 14:00-18:00 Uhr",max:3,helfer:["Petra Bauer","Stefan Bauer"]},
         {id:1004,label:"Grill 18:00-22:00 Uhr",max:3,helfer:[]},
       ]},
      {id:103,name:"Getränkeausgabe",date:"Sa 14.06.2026",time:"10:00-22:00",ort:"Bar",gruppen:["Alle"],
       schichten:[
         {id:1005,label:"Bar 10:00-14:00 Uhr",max:4,helfer:["Kurt Wolf","Monika Schmid"]},
         {id:1006,label:"Bar 14:00-18:00 Uhr",max:4,helfer:["Hans Fischer"]},
         {id:1007,label:"Bar 18:00-22:00 Uhr",max:4,helfer:[]},
       ]},
      {id:104,name:"Turnierbüro",date:"Sa 14.06.2026",time:"09:00-18:00",ort:"Sekretariat",gruppen:["Funktionäre","Administration"],
       schichten:[
         {id:1008,label:"Büro 09:00-13:00 Uhr",max:2,helfer:["Sandra Berger"]},
         {id:1009,label:"Büro 13:00-18:00 Uhr",max:2,helfer:[]},
       ]},
      {id:105,name:"Schiedsrichter",date:"Sa 14.06.2026",time:"09:00-18:00",ort:"Spielfelder",gruppen:["Cc-Junioren Eltern","D-Junioren Eltern"],
       schichten:[
         {id:1010,label:"SR 09:00-13:00 Feld 1 Uhr",max:2,helfer:["Peter Müller"]},
         {id:1011,label:"SR 13:00-18:00 Feld 1 Uhr",max:2,helfer:[]},
         {id:1012,label:"SR 09:00-13:00 Feld 2 Uhr",max:2,helfer:[]},
         {id:1013,label:"SR 13:00-18:00 Feld 2 Uhr",max:2,helfer:[]},
       ]},
      {id:106,name:"Abbau",date:"So 15.06.2026",time:"17:00-20:00",ort:"Sportanlage",gruppen:["Alle"],
       schichten:[{id:1014,label:"Abbau 17:00-20:00 Uhr",max:6,helfer:["Thomas Müller","Daniel Huber","Markus Weber","Sandra Zimmermann"]}]},
    ]
  },
  {
    id:2,name:"Generalversammlung 2026",date:"Mi 25.06.2026",loc:"Mehrzweckhalle Herrliberg",color:"var(--sub)",
    einsaetze:[
      {id:201,name:"Empfang",date:"Mi 25.06.2026",time:"18:00-19:00",ort:"Eingang",gruppen:["Vorstand"],
       schichten:[{id:2001,label:"Empfang 18:00-19:00 Uhr",max:2,helfer:["Laura Imhof","Luca Meier"]}]},
      {id:202,name:"Apéro-Service",date:"Mi 25.06.2026",time:"20:30-22:00",ort:"Foyer",gruppen:["Alle"],
       schichten:[{id:2002,label:"Apéro 20:30-22:00 Uhr",max:4,helfer:["Anna Meier","Beat Keller"]}]},
    ]
  },
  {
    id:3,name:"Saisonstart-Apéro 2026",date:"Sa 05.04.2026",loc:"Vereinslokal Herrliberg",color:"var(--sub)",
    einsaetze:[
      {id:301,name:"Apéro-Service",date:"05.04.2026",time:"17:00-19:00",ort:"Vereinslokal",gruppen:["Alle"],
       schichten:[
         {id:3001,label:"Service 17:00-19:00 Uhr",max:4,helfer:["Anna Meier","Kurt Wolf","Monika Schmid"]},
       ]},
    ]
  },
];

const HELPERS=[
  {id:1, name:"Thomas Müller", gruppe:"Trainer",           soll:2,geleistet:1,schichten:[1001,1014]},
  {id:2, name:"Daniel Huber",  gruppe:"Trainer",           soll:2,geleistet:0,schichten:[1001,1014]},
  {id:3, name:"Laura Imhof",   gruppe:"Vorstand",          soll:1,geleistet:0,schichten:[1008]},
  {id:4, name:"Anna Meier",    gruppe:"Cc-Junioren Eltern", soll:2,geleistet:1,schichten:[1002,2002]},
  {id:5, name:"Beat Keller",   gruppe:"Cc-Junioren Eltern", soll:2,geleistet:0,schichten:[1002,2002]},
  {id:6, name:"Petra Bauer",   gruppe:"Cc-Junioren Eltern", soll:2,geleistet:0,schichten:[1003]},
  {id:7, name:"Kurt Wolf",     gruppe:"Cc-Junioren Eltern", soll:2,geleistet:1,schichten:[1005]},
  {id:8, name:"Monika Schmid", gruppe:"Cc-Junioren Eltern", soll:2,geleistet:2,schichten:[1005]},
  {id:9, name:"Hans Fischer",  gruppe:"D-Junioren Eltern", soll:2,geleistet:0,schichten:[1006]},
  {id:10,name:"Peter Müller",  gruppe:"D-Junioren Eltern", soll:2,geleistet:0,schichten:[1010]},
  {id:11,name:"Sandra Berger", gruppe:"Administration",    soll:1,geleistet:0,schichten:[1008]},
  {id:12,name:"Noah Beispiel",    gruppe:"Cc-Junioren Eltern", soll:3,geleistet:2,schichten:[]},
  {id:13,name:"Luca Test",        gruppe:"Trainer",            soll:0,geleistet:0,schichten:[]},
  /* Test-Accounts */
  {id:14,name:"Luca Meier",       gruppe:"Cc-Junioren",        soll:2,geleistet:1,schichten:[1001,2001]},
  {id:15,name:"Tim Keller",       gruppe:"1. Mannschaft Herren",soll:2,geleistet:0,schichten:[1001]},
  {id:16,name:"Laura Keller",     gruppe:"1. Mannschaft Frauen",soll:2,geleistet:0,schichten:[1002]},
  {id:17,name:"Stefan Bauer",     gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1003]},
  {id:18,name:"Markus Weber",     gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1014]},
  {id:19,name:"Sandra Zimmermann",gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1014]},
  {id:20,name:"Marianne Keller",  gruppe:"1. Mannschaft Herren",soll:2,geleistet:1,schichten:[1002]},
  {id:21,name:"Petra Weber",      gruppe:"Ca-Junioren Eltern", soll:2,geleistet:0,schichten:[1003]},
  {id:22,name:"Claudia Brunner",  gruppe:"Da-Junioren Eltern", soll:2,geleistet:0,schichten:[1005]},
];

const BUSES=[
  {id:1,name:"Bus A (9-Plätzer)",reservations:[
    {date:"Sa 24.05.",time:"09:00-14:00",by:"Thomas Müller",team:"Cc-Junioren",purpose:"Auswärtsspiel FC Küsnacht"},
    {date:"Mi 28.05.",time:"16:30-19:30",by:"Daniel Huber", team:"D-Junioren",purpose:"Auswärtsspiel SC Männedorf"},
  ]},
  {id:2,name:"Bus B (15-Plätzer)",reservations:[
    {date:"Sa 07.06.",time:"08:00-14:00",by:"Sabine Koch",team:"A-Junioren",purpose:"Turnierfahrt Rapperswil"},
  ]},
];

const MATERIAL=[
  {id:1,team:"Cc-Junioren",type:"Bestellung", item:"Neue Bälle (Grösse 4)",     by:"Thomas Müller",date:"20.05.2026",status:"In Bearbeitung"},
  {id:2,team:"D-Junioren",type:"Defekt",     item:"Kaputte Torpumpe",           by:"Daniel Huber", date:"18.05.2026",status:"Erledigt"},
  {id:3,team:"Cc-Junioren",type:"Tenüs",      item:"Tenüs Grösse 140 (3×)",     by:"Thomas Müller",date:"15.05.2026",status:"Offen"},
  {id:4,team:"A-Junioren",type:"Mangel",     item:"Zu wenig Leibchen",          by:"Marco Senn",   date:"12.05.2026",status:"Offen"},
];

const LOCKERS=[
  {name:"Garderobe 1",assignments:[
    {team:"Cc-Junioren",start:16,end:18,day:"Sa",type:"Heim",color:R},
    {team:"A-Junioren",start:17,end:19.5,day:"Mi",type:"Heim",color:GN},
  ]},
  {name:"Garderobe 2",assignments:[
    {team:"FC Küsnacht",start:16,end:18,day:"Sa",type:"Gast",color:"var(--sub)"},
  ]},
  {name:"Garderobe 3",assignments:[
    {team:"Aktive 1",start:19,end:21,day:"Do",type:"Heim",color:"#7C3AED"},
  ]},
];

const MEDIA=[
  {id:1,title:"Matchbericht - Sieg vs. FC Thalwil 2:1",cat:"Matchbericht",  team:"Cc-Junioren",date:"18.05.2026",area:["Webseite","Instagram"],status:"Eingereicht",  author:"Thomas Müller"},
  {id:2,title:"Fotos Trainingscamp",                    cat:"Foto",          team:"A-Junioren",date:"05.05.2026",area:["Webseite"],            status:"Freigegeben",  author:"Laura Imhof"},
  {id:3,title:"Vereinsfest Erfolgsmeldung",             cat:"Vereinsanlass", team:"Verein",    date:"01.05.2026",area:["Webseite","Newsletter"],status:"Veröffentlicht",author:getVereinsnameStatic()},
];

const MEMBERS=[
  {id:1,name:"Thomas Müller",role:"Trainer",team:"Cc-Junioren",type:"Aktivmitglied",ort:"Herrliberg",status:"Vollständig"},
  {id:2,name:"Daniel Huber", role:"Trainer",team:"D-Junioren",type:"Aktivmitglied",ort:"Meilen",    status:"Vollständig"},
  {id:3,name:"Laura Imhof",  role:"Vorstand",team:"-",         type:"Aktivmitglied",ort:"Herrliberg",status:"Vollständig"},
  {id:4,name:"Anna Meier",   role:"Eltern",  team:"Cc-Junioren",type:"Passivmitglied",ort:"Herrliberg",status:"Prüfung fällig"},
  {id:5,name:"Beat Keller",  role:"Eltern",  team:"Cc-Junioren",type:"Passivmitglied",ort:"Meilen",   status:"Vollständig"},
  {id:6,name:"Marco Senn",   role:"Materialwart",team:"-",     type:"Funktionär",   ort:"Herrliberg",status:"Vollständig"},
  {id:7,name:"Sabine Koch",  role:"Trainer", team:"A-Junioren",type:"Aktivmitglied",ort:"Küsnacht",  status:"Sync-Fehler"},
];

const WIKI=[
  {title:"Trainerhandbuch - Einführung",     cat:"Trainer",       updated:"01.01.2026"},
  {title:"Nutzungsregeln Vereinsbusse",      cat:"Vereinsbus",    updated:"15.03.2026"},
  {title:"Garderobenprozesse am Spieltag",   cat:"Spieltag",      updated:"01.02.2026"},
  {title:"J+S-Informationen für Trainer",    cat:"J+S",           updated:"01.09.2024"},
  {title:"Helfereinsätze - Ablauf & Regeln", cat:"Helfereinsatz", updated:"10.04.2026"},
  {title:"Kommunikationsregeln im Verein",   cat:"Kommunikation", updated:"01.01.2026"},
];

const NEWS=[
  {id:1,title:"Einladung Elternabend Cc-Junioren",date:"20.05.2026",author:"Thomas Müller",target:"Cc-Junioren",channel:"Portal-Nachricht",content:"Wir laden alle Eltern herzlich zum Elternabend am 10. Juni 2026 ein. Rückmeldung bis 05. Juni."},
  {id:2,title:"Grümpelturnier - Helfer gesucht!", date:"18.05.2026",author:getVereinsnameStatic(), target:"Alle",      channel:"E-Mail + Portal", content:"Am 14./15. Juni findet unser Grümpelturnier statt. Bitte über das Helfermodul anmelden."},
  {id:3,title:"Neue Tenüs für Juniorenteams",    date:"15.05.2026",author:"Administration",target:"Junioren",  channel:"Portal-Nachricht",content:"Die neuen Tenüs sind eingetroffen. Abholen ab Dienstag, alte Tenüs mitbringen."},

  {id:5,title:"Vorbereitung Derby vs. FC Küsnacht",date:"02.05.2026",author:"Marco Weber",target:"1. Mannschaft Herren",channel:"Portal-Nachricht",content:"Dieses Wochenende empfangen wir den FC Küsnacht zum Saisonderby. Aufstellung und Treffpunkt wie gewohnt, bitte pünktlich erscheinen."},
  {id:6,title:"Saisonauftakt gelingt: 3:0 gegen FC Uster",date:"05.05.2026",author:"Marco Weber",target:"1. Mannschaft Herren",channel:"Portal-Nachricht",content:"Ein starker Start in die neue Saison! Mit einem überzeugenden 3:0 gegen FC Uster zeigten wir von Beginn weg gute Leistungen. Weiter so!"},
  {id:7,title:"Neuer Trainer ab Sommer 2026",date:"10.05.2026",author:getVereinsnameStatic(),target:"Alle",channel:"Portal-Nachricht",content:"Wir freuen uns, bekannt zu geben, dass Marco Weber ab Sommer 2026 die 2. Mannschaft übernimmt. Herzlich willkommen!"},
  {id:8,title:"Trainingsabend mit Videoanalyse",date:"14.05.2026",author:"Daniel Huber",target:"2. Mannschaft Herren",channel:"Portal-Nachricht",content:"Am kommenden Mittwoch analysieren wir die letzten beiden Spiele per Video. Bitte alle pünktlich um 18:45 in der Kabine."},
  {id:9,title:"Einladung Saisonabschlussessen",date:"16.05.2026",author:"Sabine Koch",target:"1. Mannschaft Frauen",channel:"Portal-Nachricht",content:"Das Saisonabschlussessen findet am 28. Juni im Vereinslokal statt. Bitte bis 15. Juni anmelden."},
  {id:10,title:"Zwei Neuzugänge bei den Frauen",date:"08.05.2026",author:getVereinsnameStatic(),target:"Alle",channel:"Portal-Nachricht",content:"Wir heissen Lara Zimmermann und Mia Brunner herzlich willkommen im Team der 1. Mannschaft Frauen!"},
  {id:11,title:"Talentförderung: Auswahl Kantonalverband",date:"19.05.2026",author:"Lukas Frei",target:"Ba-Junioren",channel:"Portal-Nachricht",content:"Herzliche Gratulation an Nico Moser und Tim Gerber, die in das Kantonalverbands-Sichtungstraining eingeladen wurden!"},
  {id:12,title:"Trainingslager Juni - Anmeldung offen",date:"12.05.2026",author:"Lukas Frei",target:"Ba-Junioren",channel:"Portal-Nachricht",content:"Das Trainingslager findet vom 20.-22. Juni statt. Anmeldung bis 01. Juni über das Portal. Kosten: CHF 80.-"},
  {id:13,title:"Sieg im Lokalderby gegen SC Männedorf",date:"11.05.2026",author:"Patrick Schmid",target:"Bb-Junioren",channel:"Portal-Nachricht",content:"Mit einem knappen aber verdienten 2:1 im Derby konnten wir drei wichtige Punkte holen. Grosses Lob ans gesamte Team!"},
  {id:14,title:"Elternabend - Thema Spielphilosophie",date:"17.05.2026",author:"Andrea Bauer",target:"Ca-Junioren",channel:"Portal-Nachricht",content:"Einladung zum Elternabend am 5. Juni um 19:30 Uhr im Vereinslokal. Hauptthema: Spielphilosophie und Entwicklungsziele."},
  {id:15,title:"Neue Trainingsbälle eingetroffen",date:"13.05.2026",author:"Administration",target:"Alle",channel:"Portal-Nachricht",content:"Die bestellten Trainingsbälle sind eingetroffen. Bitte beim ersten Training abholen und die alten mitbringen."},
  {id:16,title:"Turniereinladung Hombrechtikon Cup",date:"09.05.2026",author:"Stefan Keller",target:"Db-Junioren",channel:"Portal-Nachricht",content:"Wir haben eine Einladung zum Hombrechtikon Cup erhalten. Teilnahme am 21. Juni. Anmeldung bis 26. Mai nötig."},
  {id:17,title:"Erste Mannschaftsfotos geschossen",date:"20.05.2026",author:"Sabine Koch",target:"C-Juniorinnen",channel:"Portal-Nachricht",content:"Am letzten Samstag wurden die offiziellen Mannschaftsfotos aufgenommen. Bilder folgen in den nächsten Tagen im Medienbereich."},
  {id:18,title:"Freude am Fussball - Bericht Saison",date:"21.05.2026",author:"Marco Weber",target:"F-Juniorinnen",channel:"Portal-Nachricht",content:"Was für eine tolle Saison mit unseren Kleinsten! 12 begeisterte Spielerinnen, viele neue Freundschaften und jede Menge Spass."},
];

const PSTATS=[
  {name:"Luca Meier",  sp:11,tore:7,assists:3,gelb:1,rot:0},
  {name:"Noah Keller", sp:12,tore:4,assists:6,gelb:2,rot:0},
  {name:"Finn Bauer",  sp:10,tore:6,assists:2,gelb:0,rot:0},
  {name:"Elias Wolf",  sp:12,tore:0,assists:0,gelb:0,rot:0},
  {name:"Jan Schmid",  sp:11,tore:2,assists:4,gelb:0,rot:0},
  {name:"Leon Fischer",sp:8, tore:1,assists:1,gelb:3,rot:1},
];

/* ==========================================
   KLEINE HILFKOMPONENTEN
========================================== */
function Av({name="",init,size=34,bg="var(--surface2)",useTheme=false}){
  const themeAvatarBg=bg===ACCENT?"var(--avatar-bg)":bg;
  const textColor=bg===ACCENT?"var(--avatar-text)":bg==="rgba(255,255,255,0.3)"?ACCENT2:bg===ACCENT20||bg==="var(--surface2)"||bg==="var(--border)"||bg==="#e5e5e5"?"var(--sub)":"#fff";
  // init kann ein Icon-Name sein (z.B. "settings") oder Initialen
  const isIcon = init && TI_PATHS[init];
  const l = isIcon ? null : (init||name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase());
  return <div style={{width:size,height:size,borderRadius:"50%",background:themeAvatarBg,display:"flex",alignItems:"center",justifyContent:"center",color:textColor,fontWeight:700,fontSize:size*0.35,flexShrink:0}}>
    {isIcon ? <TI n={init} size={size*0.55} style={{color:textColor}}/> : l}
  </div>;
}
/* Chip via ./hooks.jsx */

function Stat({label,value,sub,color=BK,icon}){
  return(
    <div className="cc-card" style={{borderRadius:12,padding:"18px 20px",flex:1,minWidth:0,border:"0.5px solid"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{fontSize:13,color:"var(--sub)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>{label}</div>
        {icon&&<div style={{width:28,height:28,borderRadius:6,background:color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}><TI n={icon} size={14} style={{color}}/></div>}
      </div>
      <div style={{fontSize:24,fontWeight:800,color,lineHeight:1,marginBottom:5}}>{value}</div>
      {sub&&<div style={{fontSize:13,color:"var(--sub)",fontWeight:400}}>{sub}</div>}
    </div>
  );
}
/* Card via ./hooks.jsx */

function STitle({children,action}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{margin:0,fontSize:14,fontWeight:700,letterSpacing:-0.2,color:"var(--text)"}}>{children}</h2>
      {action}
    </div>
  );
}
/* Btn via ./hooks.jsx */

function Tabs({tabs,active,setActive}){
  const isMobile=useIsMobile();
  return(
    <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:3,marginBottom:18,overflowX:"auto",flexWrap:"nowrap",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>setActive(t.key)} style={{
          padding:isMobile?"7px 10px":"7px 12px",border:"none",borderRadius:6,
          background:active===t.key?"var(--surface)":"transparent",
          color:active===t.key?"var(--text)":"var(--sub)",
          fontWeight:active===t.key?700:400,cursor:"pointer",fontSize:13,
          boxShadow:active===t.key?"0 1px 4px rgba(0,0,0,0.1)":"none",
          whiteSpace:"nowrap",fontFamily:FONT,minHeight:36,transition:"all 0.15s",
          display:"flex",alignItems:"center",gap:8,WebkitTapHighlightColor:"transparent"
        }}>
          {isMobile&&t.icon&&<TI n={t.icon} size={13} style={{flexShrink:0}}/>}
          {isMobile&&t.short?t.short:t.label}
        </button>
      ))}
    </div>
  );
}
/* InfoBox via ./hooks.jsx */

function RoleSwitcher({account,activeSubRole,setActiveSubRole,onRoleChange}){
  const isMobile=useIsMobile();
  const [open,setOpen]=useState(false);
  const currentRole=activeSubRole||account.primaryRole;
  const cur=ROLES[currentRole];
  const hasMultiRoles=account.rollen.length>1;
  return(
    <>
      <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,border:`1.5px solid ${cur.color}`,background:cur.color+"12",cursor:"pointer"}}>
        <span style={{fontSize:14}}>{cur.icon}</span>
        <span style={{fontSize:13,fontWeight:700,color:cur.color}}>{cur.label}</span>
        {hasMultiRoles&&<span style={{fontSize:13,background:cur.color,color:"#fff",padding:"1px 5px",borderRadius:10,marginLeft:2}}>{account.rollen.length}</span>}
        <span style={{fontSize:13,color:cur.color,opacity:0.7}}>▾</span>
      </button>
      {open&&(
        <div onClick={()=>setOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",overflowY:"auto"}:{padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:800}}>Konto &amp; Rolle wechseln</h2>
                <p style={{margin:"3px 0 0",fontSize:13,color:"var(--sub)"}}>Teste die App aus verschiedenen Perspektiven</p>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
            </div>

            {/* Konten mit Mehrfach-Rollen */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length>1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Konten mit Mehrfach-Rollen</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length>1).map(([key,a])=>{
                    const isActive=account===a;
                    return(
                      <div key={key} style={{border:`1.5px solid ${isActive?R:GB}`,borderRadius:10,padding:"10px 14px",background:isActive?R+"08":"#fafaf8"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:R,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>
                            {a.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div style={{fontWeight:700,fontSize:13}}>{a.name}</div>
                            <div style={{fontSize:13,color:"var(--sub)"}}>{a.kinder.length>0?`${a.kinder.length} Kind${a.kinder.length>1?"er":""}: ${a.kinder.map(k=>k.name).join(", ")}`:"Kein Kind"}</div>
                          </div>
                          {isActive&&<span style={{marginLeft:"auto",fontSize:13,color:R,fontWeight:700}}>AKTIVES KONTO</span>}
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {a.rollen.map(r=>{
                            const rd=ROLES[r];
                            const isActiveSub=(isActive&&(activeSubRole||a.primaryRole)===r);
                            return(
                              <button key={r} onClick={()=>{onRoleChange(key);setActiveSubRole(r);setOpen(false);}}
                                style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:20,border:`1.5px solid ${isActiveSub?rd.color:GB}`,background:isActiveSub?rd.color+"15":"#fff",cursor:"pointer",fontSize:13,fontWeight:isActiveSub?700:400,color:isActiveSub?rd.color:"var(--text)"}}>
                                <span>{rd.icon}</span>{rd.label}
                                {isActiveSub&&<span style={{fontSize:13,color:rd.color}}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eltern mit Kindern */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rollen.length===1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Eltern-Zugänge</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rollen.length===1).map(([key,a])=>{
                    const rd=ROLES[a.primaryRole];
                    const isActive=account===a;
                    return(
                      <button key={key} onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}
                        style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${isActive?rd.color:GB}`,background:isActive?rd.color+"12":"#fafaf8",cursor:"pointer",textAlign:"left",minWidth:200}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                          <span style={{fontSize:16}}>{rd.icon}</span>
                          <span style={{fontWeight:700,fontSize:13,color:isActive?rd.color:"var(--text)"}}>{a.name}</span>
                        </div>
                        {a.kinder.map((k,i)=>(
                          <div key={i} style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
                            <span style={{color:GN}}>►</span> {k.name} <span style={{color:"var(--sub)"}}>({k.team})</span>
                          </div>
                        ))}
                        {isActive&&<div style={{marginTop:5,fontSize:13,color:rd.color,fontWeight:700}}>AKTIV</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Rollen */}
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Standard-Rollen (Demo)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length===1&&a.kinder.length===0).map(([key,a])=>{
                  const rd=ROLES[a.primaryRole];
                  const isActive=account===a&&!activeSubRole;
                  const teamLabel=a.trainerTeams?a.trainerTeams[0]:a.team||null;
                  return(
                    <button key={key} onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}
                      style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${isActive?rd.color:GB}`,background:isActive?rd.color+"12":"#fafaf8",cursor:"pointer",textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:18}}>{rd.icon}</span>
                        <span style={{fontWeight:700,fontSize:13,color:isActive?rd.color:"var(--text)"}}>{a.name}</span>
                        {isActive&&<span style={{marginLeft:"auto",fontSize:13,color:rd.color,fontWeight:700}}>AKTIV</span>}
                      </div>
                      <div style={{fontSize:13,color:rd.color,fontWeight:600,marginBottom:2}}>{rd.label}</div>
                      {teamLabel&&<div style={{fontSize:13,color:"var(--sub)"}}>{teamLabel}</div>}
                      {!teamLabel&&<p style={{margin:0,fontSize:13,color:"var(--sub)"}}>{rd.desc}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      )}
    </>
  );
}

/* ==========================================
   LAYOUT
========================================== */
function SideNav({role,active,setActive,account,sb,onNameUpdated,onLogout,appTheme}){
  const nav=NAV_BY_ROLE[role]||[];
  const rc=getRole(role).color;
  const userName=account?.name||USER_ACCOUNTS[role]?.name||getRole(role)?.label||"Benutzer";
  const [showProfile,setShowProfile]=useState(false);
  const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem("cc-nav-collapsed")==="1";}catch{return false;}});
  const toggleCollapse=()=>setCollapsed(c=>{const n=!c;try{localStorage.setItem("cc-nav-collapsed",n?"1":"0");}catch{}return n;});
  const W=collapsed?64:216;
  return(
    <nav style={{width:W,minWidth:W,background:"var(--nav)",minHeight:"100dvh",display:"flex",flexDirection:"column",flexShrink:0,borderRight:"1px solid var(--nav-b)",transition:"width 0.22s cubic-bezier(0.4,0,0.2,1),min-width 0.22s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden"}}>
      {/* Logo Header */}
      <div style={{padding:"18px 10px 15px",borderBottom:"1px solid var(--nav-b)",display:"flex",alignItems:"center",gap:collapsed?0:11,justifyContent:collapsed?"center":"flex-start",overflow:"hidden"}}>
        <div style={{width:44,height:44,minWidth:44,borderRadius:12,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
          <img src={appTheme?.logo||LOGO_B64} style={{width:44,height:44,objectFit:"cover",display:"block"}} alt="Logo"/>
        </div>
        {!collapsed&&(
          <div style={{minWidth:0,overflow:"hidden"}}>
            <div style={{color:"var(--nav-t)",fontWeight:800,fontSize:13,lineHeight:1.25,letterSpacing:-0.2,wordBreak:"break-word",overflowWrap:"break-word"}}>{appTheme?.vereinsname||getVereinsnameStatic()}</div>
            <div style={{color:"var(--nav-a)",fontSize:11,letterSpacing:0.6,marginTop:2,textTransform:"uppercase",fontWeight:600}}>{"ClubCampus"}</div>
          </div>
        )}
      </div>
      {/* Nav items */}
      <div style={{flex:1,padding:"10px 8px",overflowY:"auto",overflowX:"hidden"}}>
        {nav.map(n=>(
          <button key={n.key} onClick={()=>setActive(n.key)} title={collapsed?n.label:undefined} style={{
            width:"100%",display:"flex",alignItems:"center",gap:collapsed?0:11,
            padding:collapsed?"10px 0":"10px 12px",borderRadius:8,border:"none",
            background:active===n.key?"var(--nav-a)":"transparent",
            color:active===n.key?"var(--nav-accent-text)":"var(--nav-t)",
            cursor:"pointer",fontSize:13.5,fontWeight:active===n.key?600:400,
            textAlign:"left",marginBottom:2,letterSpacing:0.1,
            transition:"background 0.15s,color 0.15s",
            fontFamily:FONT,WebkitTapHighlightColor:"transparent",minHeight:44,
            justifyContent:collapsed?"center":"flex-start"
          }}
            onMouseEnter={e=>{if(active!==n.key)e.currentTarget.style.background="var(--nav-hover)";}}
            onMouseLeave={e=>{if(active!==n.key)e.currentTarget.style.background="transparent";}}>
            <TI n={n.icon||"circle"} size={collapsed?18:15} style={{flexShrink:0,opacity:active===n.key?1:0.65}}/>
            {!collapsed&&n.label}
          </button>
        ))}
      </div>

      {/* Trennlinie */}
      <div style={{height:1,background:"var(--nav-b)",margin:"0 12px"}}/>

      {/* User footer – klickbar → Profil */}
      <button onClick={()=>setShowProfile(true)} title={collapsed?userName:undefined} style={{
        padding:collapsed?"12px 0":"14px 12px",
        background:"none",border:"none",cursor:"pointer",textAlign:"left",
        width:"100%",transition:"background 0.15s",
        WebkitTapHighlightColor:"transparent",
        display:"flex",flexDirection:collapsed?"column":"column",alignItems:collapsed?"center":"stretch"
      }}
        onMouseEnter={e=>{if(e.currentTarget.dataset.active!=="1")e.currentTarget.style.background="var(--nav-hover)"}}
        onMouseLeave={e=>{if(e.currentTarget.dataset.active!=="1")e.currentTarget.style.background="none"}}>
        {!collapsed&&<div style={{fontSize:11,color:"var(--nav-t)",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:9,paddingLeft:2}}>Angemeldet als</div>}
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
          <Av size={32} bg={ACCENT} name={userName}/>
          {!collapsed&&(
            <div style={{minWidth:0,flex:1}}>
              <div style={{color:"var(--nav-a)",fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:0.1}}>{userName}</div>
              <div style={{marginTop:3,fontSize:11,color:"var(--sub)",fontWeight:600,letterSpacing:0.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
              <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:rc,flexShrink:0}}/>
              {getRole(role).label}
            </div>
            </div>
          )}
          {!collapsed&&<TI n="chevron-right" size={13} style={{color:"var(--nav-t)",opacity:0.5,flexShrink:0}}/>}
        </div>
      </button>

      {/* Einklappen-Button */}
      <button onClick={toggleCollapse} title={collapsed?"Menü ausklappen":"Menü einklappen"} style={{
        padding:"10px 0",background:"none",border:"none",cursor:"pointer",
        borderTop:"1px solid var(--nav-b)",
        display:"flex",alignItems:"center",justifyContent:"center",
        color:"var(--nav-t)",transition:"background 0.15s, color 0.15s",
        WebkitTapHighlightColor:"transparent",width:"100%"
      }}
        onMouseEnter={e=>{e.currentTarget.style.background="var(--nav-hover)";e.currentTarget.style.color="var(--nav-a)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="var(--nav-t)";}}>
        <TI n={collapsed?"chevrons-right":"chevrons-left"} size={16}/>
      </button>

      <ProfileModal open={showProfile} onClose={()=>setShowProfile(false)} account={account} role={role} sb={sb} onNameUpdated={onNameUpdated} onLogout={onLogout}/>
    </nav>
  );
}

function TopBar({role,active,setActive,onRoleChange,account,activeSubRole,setActiveSubRole,onLogout,isMobile,onOpenProfile,onBack,appTheme}){
  const acc=account||USER_ACCOUNTS[role]||{name:getRole(role).label,rollen:[role],primaryRole:role,kinder:[]};
  const {dark,toggle}=useTheme();
  const initials=(acc.name||"U").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const nav=NAV_BY_ROLE[role]||[];
  const pageLabel=nav.find(n=>n.key===active)?.label||active;
  const isHome=active==="dashboard";
  return(
    <div className="cc-topbar" style={{height:52,borderBottom:"1px solid",display:"flex",alignItems:"center",padding:"0 14px 0 12px",justifyContent:"space-between",flexShrink:0,gap:8,fontFamily:FONT,position:isMobile?"sticky":"relative",top:isMobile?0:"auto",zIndex:isMobile?50:"auto"}}>
      {/* Links */}
      {isMobile?(
        isHome?(
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{width:30,height:30,borderRadius:8,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <img src={appTheme?.logo||LOGO_B64} style={{width:30,height:30,objectFit:"cover",display:"block"}} alt="Logo"/>
            </div>
            <span style={{fontWeight:800,fontSize:14,color:"var(--text)",letterSpacing:-0.3}}>{appTheme?.vereinsname||getVereinsnameStatic()}</span>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,minWidth:0}}>
            <button onClick={()=>onBack?onBack():setActive("dashboard")} style={{
              width:36,height:36,borderRadius:8,background:"none",border:"none",
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",color:"var(--text)",flexShrink:0,
              WebkitTapHighlightColor:"transparent"
            }}>
              <TI n="chevron-left" size={22}/>
            </button>
            <span style={{fontWeight:700,fontSize:16,color:"var(--text)",letterSpacing:-0.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pageLabel}</span>
          </div>
        )
      ):(
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:8,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <img src={appTheme?.logo||LOGO_B64} style={{width:30,height:30,objectFit:"cover",display:"block"}} alt="Logo"/>
          </div>
          <span style={{fontWeight:800,fontSize:14,color:"var(--text)",letterSpacing:-0.3}}>{appTheme?.vereinsname||"ClubCampus"}</span>
        </div>
      )}
      {/* Rechts */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        {/* Dark Toggle – nur Desktop */}
        {!isMobile&&(
          <button onClick={toggle} title={dark?"Hell-Modus":"Dunkel-Modus"} style={{
            display:"flex",alignItems:"center",gap:8,
            padding:"5px 10px 5px 7px",borderRadius:20,
            border:"1px solid var(--border)",background:dark?ACCENT:"var(--surface2)",
            cursor:"pointer",transition:"background 0.25s,border-color 0.25s",
            flexShrink:0,minHeight:34
          }}>
            <div style={{width:22,height:22,borderRadius:"50%",background:dark?"#111":"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.25s",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>
              <TI n={dark?"sun":"moon"} size={12} style={{color:dark?ACCENT:"var(--sub)"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:dark?"#111":"var(--sub)",whiteSpace:"nowrap",fontFamily:FONT}}>{dark?"Hell":"Dunkel"}</span>
          </button>
        )}
        {!isMobile&&!onLogout&&<RoleSwitcher account={acc} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole||((r)=>{})} onRoleChange={onRoleChange}/>}
        {!isMobile&&!onLogout&&<Chip text="DEMO" color="#999" bg="var(--surface2)"/>}
        {!isMobile&&onLogout&&<button onClick={onLogout} style={{padding:"8px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer",fontWeight:600,minHeight:36}}>Abmelden</button>}
        {/* Profil-Avatar – nur Mobile */}
        {isMobile&&(
          <button onClick={onOpenProfile} style={{
            width:34,height:34,borderRadius:"50%",background:"var(--surface)",border:"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:"var(--sub)",fontWeight:700,fontSize:13,
            cursor:"pointer",flexShrink:0,WebkitTapHighlightColor:"transparent",
            fontFamily:FONT,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"
          }}>
            {initials}
          </button>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   DASHBOARDS (je nach Rolle)
========================================== */
function Dashboard({role,setActive,account,meineTeams,myRosterId}){
  if(role==="administrator")  return <DashboardAdmin setActive={setActive} account={account}/>;
  if(role==="administration") return <DashboardAdministration setActive={setActive} account={account}/>;
  if(role==="funktionaer")    return <DashboardFunktionaer setActive={setActive} account={account}/>;
  if(role==="trainer")        return <DashboardTrainer setActive={setActive} account={account} trainerTeams={meineTeams} myRosterId={myRosterId}/>;
  if(role==="spieler")        return <DashboardSpieler account={account} meineTeams={meineTeams} myRosterId={myRosterId} setActive={setActive}/>;
  if(role==="eltern")         return <DashboardEltern account={account} meineTeams={meineTeams} setActive={setActive}/>;
  return null;
}

function DashboardAdmin({setActive,account}){
  const isMobile=useIsMobile();
  const vorname=(account?.name||"Administrator").split(" ")[0];
  return(
    <div>
      <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",color:"var(--text)"}}>Hallo, {vorname}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px",fontWeight:400}}>ClubCampus – Systemübersicht</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,180px),1fr))",gap:12,marginBottom:24}}>
        <Stat label="Mitglieder total" value="187" sub="Fairgate synchronisiert" color="#7C3AED" icon="users"/>
        <Stat label="Aktive Benutzer" value="134" sub="in den letzten 30 Tagen" color={BL} icon="user"/>
        <Stat label="Sync-Fehler" value="2" sub="Fairgate / FVRZ" color={R} icon="refresh"/>
        <Stat label="Offene Datenprüfungen" value="12" sub="Mitglieder fällig" color={AM} icon="clipboard-list"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Systemstatus</STitle>
          {[
            {label:"Fairgate-Sync",     status:"OK",     last:"vor 2h",       ok:true},
            {label:"FVRZ-Sync",         status:"Fehler", last:"vor 4h",       ok:false},
            {label:"E-Mail-Versand",    status:"OK",     last:"vor 30min",    ok:true},
            {label:"Push-Benachricht.", status:"OK",     last:"active",        ok:true},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13,fontWeight:600}}>{s.label}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,color:"var(--sub)"}}>{s.last}</span>
                <Chip text={s.status} color={s.ok?GN:R} bg={s.ok?"#ECFDF5":RL}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Benutzer &amp; Rollen</STitle>
          {[
            {r:"Administrator",n:2},{r:"Administration",n:3},{r:"Trainer",n:8},
            {r:"Funktionäre/Vorstand",n:6},{r:"Spieler",n:112},{r:"Eltern",n:56},
          ].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<5?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.r}</span>
              <span style={{fontWeight:700,fontSize:13}}>{x.n}</span>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Sync-Konflikte</STitle>
          {[
            {field:"E-Mail-Adresse",member:"Noah Beispiel", conflict:"Portal ↔ Fairgate"},
            {field:"Adresse",       member:"Sara Huber",     conflict:"Fairgate ↔ Portal"},
          ].map((c,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<1?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{c.member} · {c.field}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{c.conflict}</div>
            </div>
          ))}
          <InfoBox text="2 Konflikte müssen manuell aufgelöst werden." color={R}/>
        </Card>
        <Card>
          <STitle>Letzte Audit-Einträge</STitle>
          {[
            {action:"Export Mitgliederliste",user:"Sandra Berger",time:"14:22"},
            {action:"Fairgate-Sync manuell", user:"Admin User",  time:"12:00"},
            {action:"Rolle geändert",         user:"Admin User",  time:"10:45"},
          ].map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.action}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{a.user} · {a.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardAdministration({setActive,account}){
  const isMobile=useIsMobile();
  return(
    <div>
      <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",color:"var(--text)"}}>Hallo, {(account?.name||"Nutzer").split(" ")[0]}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px"}}>ClubCampus – Übersicht</p>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Administration · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Mitglieder total" value="187" color={BL}/>
        <Stat label="Datenprüfung fällig" value="12" color={R} sub="halbjährliche Prüfung"/>
        <Stat label="Sync-Fehler" value="2" color={AM}/>
        <Stat label="Offene Materialanfragen" value="3" color={BK}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle action={<button onClick={()=>setActive("members")} style={{fontSize:13,color:BL,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Alle →</button>}>Datenprüfstatus</STitle>
          {[{label:"Vollständig",n:162,c:GN},{label:"Prüfung fällig",n:12,c:AM},{label:"Unvollständig",n:8,c:R},{label:"Sync-Fehler",n:5,c:"#888"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.label}</span>
              <Chip text={x.n} color={x.c} bg={x.c+"18"}/>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Fairgate &amp; FVRZ Sync</STitle>
          {[{s:"Fairgate-Import",ok:true,last:"vor 2h"},{s:"FVRZ-Spielplan",ok:false,last:"Fehler"},{s:"Rückschreiben",ok:true,last:"vor 6h"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.s}</span>
              <Chip text={x.ok?"OK":x.last} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
            </div>
          ))}
          <InfoBox text="FVRZ-Sync: Verbindungsfehler. Manuelle Überprüfung erforderlich." color={R}/>
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71},{t:"Aktive 1",pct:68}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{x.t}</span>
                <span style={{fontSize:13,fontWeight:700,color:x.pct>=75?GN:x.pct>=65?AM:R}}>{x.pct}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${x.pct}%`,background:x.pct>=75?GN:x.pct>=65?AM:R,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Termine · Rückmeldungen</STitle>
          {EVENTS.filter(e=>e.rsvp).map((e,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<EVENTS.filter(x=>x.rsvp).length-1?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{e.title}</div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <Chip text={`✓ ${e.res?.y}`} color={GN} bg="#ECFDF5"/>
                <Chip text={`✕ ${e.res?.n}`} color={R} bg={RL}/>
                <Chip text={`? ${e.res?.o}`} color={AM} bg="#FFFBEB"/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardFunktionaer({setActive,account}){
  const isMobile=useIsMobile();
  return(
    <div>
      <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",color:"var(--text)"}}>Hallo, {(account?.name||"Nutzer").split(" ")[0]}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px"}}>ClubCampus – Übersicht</p>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Funktionär / Vorstand · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Offene Rückmeldungen" value="22" color={R}/>
        <Stat label="Helfer-Soll erfüllt" value="61%" color={AM}/>
        <Stat label="Vereinsbusse heute" value="1" color={BL} sub="Bus A reserviert"/>
        <Stat label="Offene Materialanfragen" value="3" color={BK}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Kommende Vereinsanlässe</STitle>
          {EVENTS.map((e,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<EVENTS.length-1?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,fontSize:13}}>{e.title}</span>
                <Chip text={e.type==="Vereinsanlass"?"Verein":"Team"} color={e.type==="Vereinsanlass"?R:BL}/>
              </div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{x.t}</span>
                <span style={{fontSize:13,fontWeight:700,color:x.pct>=75?GN:AM}}>{x.pct}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${x.pct}%`,background:x.pct>=75?GN:AM,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Helfereinsätze Übersicht</STitle>
          {HELPERS.slice(0,5).map((h,i)=>{
            const geplant=h.schichten.length;
            const offen=Math.max(0,h.soll-h.geleistet-geplant);
            let status="Erfüllt";
            if(h.soll===0) status="Befreit";
            else if(h.geleistet>=h.soll) status="Erfüllt";
            else if(h.geleistet+geplant>=h.soll) status="Geplant erfüllt";
            else status="Offen";
            return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<4?`0.5px solid ${GB}`:"none"}}>
                <span style={{fontSize:13}}>{h.name}</span>
                <Chip text={status} color={["Erfüllt","Geplant erfüllt"].includes(status)?GN:status==="Befreit"?"#888":R} bg={["Erfüllt","Geplant erfüllt"].includes(status)?"#ECFDF5":status==="Befreit"?"#f5f5f5":RL}/>
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Vereinsbus-Reservationen</STitle>
          {BUSES.flatMap(b=>b.reservations.map(r=>({...r,bus:b.name}))).map((r,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{r.date} · {r.time+" Uhr"}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{r.bus} · {r.purpose}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardTrainer({setActive,account,trainerTeams=[],myRosterId}){
  const isMobile=useIsMobile();
  const trainer=ROSTER.find(p=>p.id===(myRosterId||200))||ROSTER.find(p=>p.id===200);
  const firstName=trainer?.firstName||account?.name?.split(" ")[0]||"Trainer";
  const team=trainerTeams[0]||"Cc-Junioren";
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";};

  /* Nächstes Training und Spiel */
  const upcoming=ATT_EVENTS.filter(e=>e.team===team&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)));
  const nextTrain=upcoming.find(e=>e.type==="Training");
  const nextSpiel=upcoming.find(e=>e.type==="Spiel");

  /* Tabellenrang */
  const tableData=TABLES[team]||[];
  const myRow=tableData.find(r=>r.me);

  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Guten Morgen, {firstName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Trainer · {trainerTeams.join(" & ")} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Nächstes Training" value={nextTrain?nextTrain.date.replace(/^\w+\s/,""):"-"} sub={nextTrain?`${nextTrain.time} Uhr · ${nextTrain.location}`:"Kein Training"} color={GN}/>
        <Stat label="Nächstes Spiel"    value={nextSpiel?nextSpiel.date.replace(/^\w+\s/,""):"-"} sub={nextSpiel?`${nextSpiel.time} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel"} color={BL}/>
        <Stat label="Ø Anwesenheit"     value="77%"      sub="letzte 5 Trainings"   color={GN}/>
        <Stat label="Tabellenrang"      value={myRow?myRow.rank+".":"-"} sub={myRow?TABLES[team]?.length+" Teams · "+myRow.pts+" Punkte":"Keine Tabelle"} color={BL}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle action={<Chip text={upcoming.filter(e=>e.rsvp!==false).length+" offen"} color={R}/>}>Fehlende Rückmeldungen</STitle>
          {upcoming.filter(e=>e.rsvp!==false).slice(0,3).map((x,i,arr)=>{
            const teamPids=ROSTER.filter(p=>(p.teams||[]).includes(team)&&!p.role).map(p=>p.id);
            const missing=teamPids.filter(pid=>!ATT_INITIAL[x.id]?.[pid]?.status).length;
            return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<arr.length-1?`0.5px solid ${GB}`:"none"}}>
                <span style={{fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</span>
                {missing>0&&<Chip text={`${missing} fehlen`} color={AM} bg="#FEF3C7"/>}
                {missing===0&&<Chip text="✓ Vollständig" color={GN} bg="#ECFDF5"/>}
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Anwesenheit letzte Anlässe</STitle>
          {ATT_LOG.slice(0,3).map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{a.date} <Chip text={a.type} color={a.type==="Spiel"?BL:GN}/></span>
                <span style={{fontSize:13,fontWeight:800,color:R}}>{Math.round(a.present.length/(a.present.length+a.absent.length)*100)}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${a.present.length/(a.present.length+a.absent.length)*100}%`,background:R,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Helfereinsätze · Grümpelturnier</STitle>
          {HELPER_EVENTS[0].einsaetze.slice(0,3).map((e,i)=>{
            const s=e.schichten[0]; const filled=s.helfer.length, max=s.max;
            return(
              <div key={i} style={{marginBottom:i<2?10:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                  <span style={{fontWeight:600}}>{e.name} <span style={{color:"var(--sub)"}}>{e.time+" Uhr"}</span></span>
                  <span style={{color:filled<max?R:GN,fontWeight:700}}>{filled}/{max}</span>
                </div>
                <div style={{height:5,background:GB,borderRadius:4}}>
                  <div style={{height:"100%",width:`${filled/max*100}%`,background:filled<max?R:GN,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Offene Abstimmungen</STitle>
          {POLLS.filter(p=>!p.closed).map((p,i)=>(
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{fontWeight:600,fontSize:13}}>{p.title}</div>
              <Chip text={p.target} color={BL}/>
            </div>
          ))}
          <div style={{padding:"8px 0",borderTop:"0.5px solid var(--border)",marginTop:6}}>
            <div style={{fontWeight:600,fontSize:13}}>Vereinsbus reserviert ✓</div>
            <div style={{fontSize:13,color:"var(--sub)"}}>Bus A · Sa 24.05. · 09:00-14:00</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardSpieler({account,meineTeams,myRosterId,setActive}){
  const isMobile=useIsMobile();
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const firstName=player?.firstName||account?.name?.split(" ")[0]||"Spieler";
  const team=meineTeams?.[0]||player?.teams?.[0]||"Cc-Junioren";
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";};
  const parseDate2=(d)=>{const m=(d||"").match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:"";};

  /* Load persisted schichtenState */
  const [schichtenState,setSchichtenState]=useState({});
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{
      try{const res=await window.storage.get("helfer_schichten");if(res)setSchichtenState(JSON.parse(res.value));}catch(e){}
      try{const res=await window.storage.get("aufgebot_state");if(res)setAufgebotState(JSON.parse(res.value));}catch(e){}
    })();
  },[]);

  /* Anwesenheitsquote */
  const myId=myRosterId||1;
  const rsvpEvs=ATT_EVENTS.filter(e=>(e.team===team||e.team==="Alle")&&e.rsvp!==false&&e.type==="Training");
  const pastEvs=rsvpEvs.filter(e=>parseD(e.date)<today);
  const zuCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[myId]?.status==="zu").length;
  const attPct=pastEvs.length?Math.round(zuCount/pastEvs.length*100):null;
  const attColor=attPct===null?"#aaa":attPct>=80?GN:attPct>=60?AM:R;

  /* Nächster Termin */
  const nextEv=ATT_EVENTS.filter(e=>(e.team===team||e.subtype==="Vereinsanlass")&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
  const nextVal=nextEv?nextEv.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim()+" "+nextEv.time.split(":")[0]+":"+nextEv.time.split(":")[1]:"-";
  const nextSub=nextEv?(nextEv.opponent?"vs. "+nextEv.opponent:nextEv.title||nextEv.type):"Keine Termine";

  /* Helfereinsätze - kombiniert statische + dynamische Daten */
  const meinName=player?`${player.firstName} ${player.lastName}`:(account?.name||"");
  const helperRecord=HELPERS.find(h=>h.name===meinName);
  const meineSchichtenMitDatum=HELPER_EVENTS.flatMap(ev=>
    ev.einsaetze.flatMap(e=>
      (e.schichten||[]).filter(s=>{
        const helfer=schichtenState[s.id]??s.helfer;
        return helfer.includes(meinName);
      }).map(s=>({...s,einsatzDate:e.date||"",einsatzName:ev.name||"",ort:e.location||""}))
    )
  );
  const helferSoll=helperRecord?.soll??meineSchichtenMitDatum.length;
  const helferGeleistet=helperRecord?.geleistet??meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)<today).length;
  const helferOffen=Math.max(0,helferSoll-helferGeleistet);

  /* Nächstes Aufgebot */
  const nextAufgebot=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today&&(aufgebotState[e.id]||[]).includes(myId))
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

  /* Nächstes Spiel */
  const nextSpiel=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today)
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
  const nextSpielImAufgebot=nextSpiel&&(aufgebotState[nextSpiel?.id]||[]).includes(myId);
  const nextSpielAufgebotStatus=nextSpiel
    ?(nextSpielImAufgebot?"Im Aufgebot":"Noch kein Aufgebot")
    :"Kein Spiel geplant";

  /* Nächstes Training */
  const nextTraining=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)>=today)
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Hallo, {firstName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Spieler · {team} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={pastEvs.length?zuCount+"/"+pastEvs.length+" Trainings":"Noch keine vergangenen"} color={attColor}/>
        <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} color={GN}/>
        <Stat label="Nächstes Spiel" value={nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextSpiel?`${(nextSpiel.time||"").slice(0,5)} Uhr · ${nextSpielAufgebotStatus}`:nextSpielAufgebotStatus} color={nextSpielImAufgebot?"#4F46E5":nextSpiel?BL:"#aaa"}/>
        <Stat label="Helfereinsätze" value={helferSoll>0?helferGeleistet+"/"+helferSoll:"-"} sub={helferSoll>0?"Geleistet / Soll":"Keine Einsätze"} color={helferSoll>0?(helferOffen===0?GN:AM):"#aaa"}/>
      </div>
      {/* Aufgebot-Banner */}
      {nextAufgebot&&(
        <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.openEvId=nextAufgebot.id;setActive("team");}:undefined}
          style={{background:"var(--surface)",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
          <span style={{fontSize:24}}><TI n="ball-football"/></span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14,color:"var(--cc-accent)"}}>Du bist im Aufgebot!</div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
              {`vs. ${nextAufgebot.opponent} · ${nextAufgebot.date} · ${nextAufgebot.time} Uhr`}
            </div>
            {nextAufgebot.treffpunkt&&<div style={{fontSize:13,color:"var(--sub)",marginTop:3}}><TI n="target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebot.treffpunkt}</div>}
          </div>
          <Chip text="Aufgebot" color="#4F46E5" bg="#EEF2FF"/>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Meine nächsten Termine</STitle>
          {(()=>{
            const upcoming=ATT_EVENTS.filter(e=>(e.team===team||e.subtype==="Vereinsanlass")&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date))).slice(0,3);
            if(upcoming.length===0) return <div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Termine.</div>;
            return upcoming.map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{t.opponent?"vs. "+t.opponent:t.type==="Training"?"Training · "+t.team:t.title||t.type}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{t.date} · {t.time+" Uhr"}</div>
                </div>
                <Chip text={t.subtype||t.type} color={t.type==="Spiel"?BL:t.subtype==="Team-Event"?AM:GN}/>
              </div>
            ));
          })()}
        </Card>
        <Card>
          <STitle>Offene Anwesenheitsmeldungen</STitle>
          {(()=>{
            const open=ATT_EVENTS.filter(e=>(e.team===team||e.team==="Alle")&&e.rsvp!==false&&parseD(e.date)>=today&&(!ATT_INITIAL[e.id]?.[myRosterId]?.status)).slice(0,3);
            if(open.length===0) return <div style={{fontSize:13,color:GN,fontWeight:600}}>✓ Alle Termine beantwortet</div>;
            return open.map((x,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:i<open.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{fontWeight:600,fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</div>
                <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Rückmeldung ausstehend</div>
              </div>
            ));
          })()}
        </Card>
        <Card>
          <STitle>Offene Abstimmungen</STitle>
          {POLLS.filter(p=>!p.closed).map((p,i)=>(
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{p.title}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {p.options.map((opt,j)=>(
                  <button key={j} style={{padding:"4px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,cursor:"pointer",background:"var(--surface2)"}}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Meine Helfereinsätze</STitle>
          {(()=>{
            const geplant=meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)>=today).length;
            return(
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface2)",borderRadius:10,marginBottom:14}}>
                <div style={{fontSize:24,fontWeight:800,color:helferOffen===0&&helferSoll>0?GN:helferSoll>0?AM:"#aaa",lineHeight:1}}>
                  {helferSoll>0?helferGeleistet+"/"+helferSoll:"-"}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Geleistet / Soll</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{geplant>0?geplant+" ausstehend":helferOffen===0&&helferSoll>0?"Alle erfüllt ✓":"Keine Einsätze"}</div>
                </div>
              </div>
            );
          })()}
          {meineSchichtenMitDatum.length===0&&<div style={{fontSize:13,color:"var(--sub)",marginBottom:8}}>Keine Helfereinsätze zugeteilt.</div>}
          {meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)>=today).map((s,i)=>(
            <div key={i} style={{padding:"9px 11px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{s.einsatzName||""}</div>
                  <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>{""+s.einsatzDate+" · "+(s.location||"")}</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:AM,border:`0.5px solid ${AM}`,flexShrink:0}}>Ausstehend</span>
              </div>
            </div>
          ))}
          <InfoBox text="Datenprüfung: Deine Stammdaten wurden zuletzt vor 7 Monaten geprüft. Bitte überprüfen." color={AM}/>
        </Card>
      </div>
    </div>
  );
}

function DashboardEltern({account,meineTeams,setActive}){
  const isMobile=useIsMobile();
  const parentName=account?.name?.split(" ")[0]||"Elternteil";
  /* Stufen-Checks */
  const darfAnmelden=kannSchreiben?kannSchreiben("events"):true;
  const darfVerwalten=kannVerwalten?kannVerwalten("events"):isTrainer||isAdmin;
  const kinder=account?.kinder||[];
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:""};
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("aufgebot_state");if(r)setAufgebotState(JSON.parse(r.value));}catch(e){}})();
  },[]);

  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Hallo, {parentName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Elternteil · {kinder.map(k=>k.name.split(" ")[0]).join(" & ")} · Freitag, 23. Mai 2026</p>

      {kinder.map((kind,ki)=>{
        const team=kind.team||"Cc-Junioren";
        const rosterId=kind.rosterId||1;
        const vorname=kind.name.split(" ")[0];

        /* Anwesenheit - nur Trainings */
        const pastEvs=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)<today);
        const zuCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[rosterId]?.status==="zu").length;
        const abCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[rosterId]?.status==="ab").length;
        const attTotal=zuCount+abCount;
        const attPct=attTotal?Math.round(zuCount/attTotal*100):null;
        const attColor=attPct===null?"#aaa":attPct>=80?GN:attPct>=60?AM:R;

        /* Nächste 4 Trainings & Spiele */
        const upcoming=ATT_EVENTS
          .filter(e=>e.team===team&&(e.type==="Training"||e.type==="Spiel")&&parseD(e.date)>=today)
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))
          .slice(0,4);

        /* Team-Events & Vereinsanlässe */
        const anlaesse=ATT_EVENTS
          .filter(e=>(e.team===team||e.team==="Alle")&&e.type==="Veranstaltung"&&parseD(e.date)>=today)
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))
          .slice(0,4);

        const nextAufgebotSpiel=ATT_EVENTS
          .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today&&(aufgebotState[e.id]||[]).includes(rosterId))
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

        const accentFor=(e)=>e.type==="Spiel"?BL:e.subtype==="Vereinsanlass"?"#7C3AED":e.type==="Veranstaltung"?AM:GN;

        return(
          <div key={ki} style={{marginBottom:24}}>
            {/* Kind-Header */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:6,height:28,borderRadius:4,background:ACCENT,flexShrink:0}}/>
              <h2 style={{margin:0,fontSize:16,fontWeight:800}}>{vorname} <span style={{fontSize:13,color:"var(--sub)",fontWeight:600}}>· {team}</span></h2>
            </div>

            {/* Stat-Kacheln */}
            {(()=>{
              const nextSpiel=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              const nextTraining=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              return(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:14}}>
                  <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={attTotal?zuCount+"/"+attTotal+" Trainings":"Noch keine"} color={attColor}/>
                  <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} color={GN}/>
                  {(()=>{
                    const imAufgebot=nextSpiel&&(aufgebotState[nextSpiel.id]||[]).includes(rosterId);
                    return(
                      <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:14,padding:"16px 18px",flex:1,minWidth:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:4,position:"relative"}}>
                        <div style={{fontSize:13,color:"var(--sub)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Nächstes Spiel</div>
                        <div style={{fontSize:24,fontWeight:800,color:BL,lineHeight:1}}>{nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"}</div>
                        <div style={{fontSize:13,color:"var(--sub)",fontWeight:600}}>{nextSpiel?`${nextSpiel.time.slice(0,5)} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel geplant"}</div>
                        {imAufgebot&&<span style={{position:"absolute",bottom:10,right:12,fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"var(--surface)",color:"var(--cc-accent)",border:"0.5px solid #818CF840"}}><TI n="ball-football" style={{marginRight:4}}/> Im Aufgebot</span>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Aufgebot-Banner */}
            {nextAufgebotSpiel&&(
              <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;NAV_TARGET.openEvId=nextAufgebotSpiel.id;setActive("team");}:undefined}
                style={{background:"var(--surface)",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
                <span style={{fontSize:24}}><TI n="ball-football"/></span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"var(--cc-accent)"}}>{vorname} ist im Aufgebot!</div>
                  <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
                    {`vs. ${nextAufgebotSpiel.opponent} · ${nextAufgebotSpiel.date} · ${nextAufgebotSpiel.time} Uhr`}
                  </div>
                  {nextAufgebotSpiel.treffpunkt&&<div style={{fontSize:13,color:"var(--sub)",marginTop:3}}><TI n="target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebotSpiel.treffpunkt}</div>}
                </div>
                <div style={{background:"#4F46E5",color:"#fff",fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:20}}>Aufgebot</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {/* Nächste 4 Trainings & Spiele */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Trainings & Spiele</STitle>
                {upcoming.length===0&&<div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Trainings oder Spiele.</div>}
                {upcoming.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>
                        {e.type==="Training"?`Training · ${team}`:e.opponent?"vs. "+e.opponent:e.title||e.type}
                      </div>
                      <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time} Uhr · {e.location}</div>
                    </div>
                    <Chip text={e.type} color={accentFor(e)}/>
                  </div>
                ))}
              </Card>

              {/* Team-Events & Vereinsanlässe */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["team-event","vereinsanlass"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Team-Events & Anlässe</STitle>
                {anlaesse.length===0&&<div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Anlässe.</div>}
                {anlaesse.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<anlaesse.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>{e.title||e.type}</div>
                      <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time} Uhr · {e.location}</div>
                    </div>
                    <Chip text={e.subtype||e.type} color={accentFor(e)}/>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        );
      })}

    </div>
  );
}

/* ==========================================
   MEIN TEAM (rollenabhängig)
========================================== */
function TeamView({role,trainerTeams=["Cc-Junioren"],setActive,myRosterId,account,dbTeams=[],isModuleVisible,dbMitglieder=[]}){
  const isMobile=useIsMobile();
  /* Modul-Sichtbarkeit: Props oder Fallback alles sichtbar */
  const moduleOk=(modul)=>!isModuleVisible||isModuleVisible(modul)||!modul;

  /* Mitglieder für ein Team: aus DB wenn vorhanden, sonst ROSTER Fallback */
  const getMitgliederForTeam=(teamName)=>{
    if(dbMitglieder.length>0){
      return dbMitglieder
        .filter(m=>(m.teams||[]).includes(teamName)&&m.aktiv!==false)
        .map(m=>({
          id:        m.id,
          name:      `${m.vorname} ${m.nachname}`,
          firstName: m.vorname||"",
          lastName:  m.nachname||"",
          pos:       m.position||"-",
          rueckennr: "",
          dob:       m.geburtsdatum||"",
          nat:       m.nationalitaet||"CH",
          pass:      m.spielerpass||"",
          js:        m.js_nr||"",
          teams:     m.teams||[],
          role:      m.funktion||"",
          email:     m.email||"",
          tel:       m.telefon||"",
          eltern:    m.eltern||[],
          fairgate:  m.fairgate_id||"",
          ahv:       m.ahv_nr||"",
          street:    m.strasse||"",
          plz:       m.plz||"",
          city:      m.ort||"",
        }));
    }
    return ROSTER.filter(p=>(p.teams||[]).includes(teamName));
  };
  const [responses,setResponses]=useState(ATT_INITIAL);
  useEffect(()=>{
    (async()=>{
      try{
        const r=await window.storage.get("att_responses");
        if(r){
          const stored=JSON.parse(r.value);
          const merged={...ATT_INITIAL};
          Object.keys(stored).forEach(evId=>{
            merged[evId]={...ATT_INITIAL[evId],...stored[evId]};
          });
          setResponses(merged);
        }
      }catch(e){}
    })();
  },[]);
  const isSpieler=role==="spieler";
  const isEltern=role==="eltern";
  const isTrainer=role==="trainer";
  const limited=isSpieler||isEltern;
  const hasMultiTeams=trainerTeams.length>1;

  /* Teams-Daten: aus Supabase wenn vorhanden, sonst hardcoded Fallback */
  const TEAMS_DATA_FALLBACK={
    "Cc-Junioren":           {count:18,liga:"U12 Liga A",   season:"2024/25"},
    "Ca-Junioren":           {count:16,liga:"U13 Liga A",   season:"2024/25"},
    "A-Junioren":            {count:16,liga:"U16 Liga A",   season:"2024/25"},
    "1. Mannschaft Herren":  {count:20,liga:"1. Liga",      season:"2024/25"},
    "2. Mannschaft Herren":  {count:18,liga:"3. Liga",      season:"2024/25"},
    "1. Mannschaft Frauen":  {count:16,liga:"Frauen 2. Liga",season:"2024/25"},
    "Da-Junioren":           {count:14,liga:"U13 Liga A",   season:"2024/25"},
    "Db-Junioren":           {count:14,liga:"U13 Liga B",   season:"2024/25"},
    "Ba-Junioren":           {count:15,liga:"U15 Liga A",   season:"2024/25"},
    "Bb-Junioren":           {count:14,liga:"U15 Liga B",   season:"2024/25"},
    "D-Juniorinnen":         {count:14,liga:"U11 Mädchen",  season:"2024/25"},
    "E-Juniorinnen":         {count:12,liga:"U10 Mädchen",  season:"2024/25"},
    "F-Juniorinnen":         {count:12,liga:"U9 Mädchen",   season:"2024/25"},
    "C-Juniorinnen":         {count:14,liga:"U13 Mädchen",  season:"2024/25"},
  };
  /* dbTeams Array → Lookup-Objekt {name: {liga, saison, count}} */
  const TEAMS_DATA=dbTeams.length>0
    ? Object.fromEntries(dbTeams.map(t=>([t.name,{liga:t.liga||"",season:t.saison||"2024/25",count:ROSTER.filter(p=>(p.teams||[]).includes(t.name)).length||16}])))
    : TEAMS_DATA_FALLBACK;

  const kinder=account?.kinder||[];
  const hasMultiKinder=isEltern&&kinder.length>1;
  const [activeKind,setActiveKind]=useState(kinder[0]||null);

  const [activeTeam,setActiveTeam]=useState(
    isEltern&&kinder[0]?.team ? kinder[0].team : trainerTeams[0]||"Cc-Junioren"
  );

  /* When eltern switches child, update activeTeam too */
  const handleKindSwitch=(kind)=>{
    setActiveKind(kind);
    if(kind.team) setActiveTeam(kind.team);
    setTab("overview");
  };

  const playerName=myRosterId?ROSTER.find(p=>p.id===myRosterId)?.firstName||"Spieler":"Spieler";
  const kinderNames=activeKind?activeKind.name.split(" ")[0]:(kinder.map(k=>k.name.split(" ")[0]).join(" & ")||playerName);
  const [selectedSpiel,setSelectedSpiel]=useState(null);
  const teamInfo=TEAMS_DATA[activeTeam]||{count:ROSTER.filter(p=>(p.teams||[]).includes(activeTeam)).length,liga:"Liga A",season:"2024/25"};
  const actualCount=ROSTER.filter(p=>(p.teams||[]).includes(activeTeam)).length||teamInfo.count;

  const TABS_ALL=[
    {key:"overview",  label:"Übersicht",    short:"Übersicht", icon:"layout-dashboard"},
    {key:"roster",    label:"Kader",        short:"Kader",     icon:"users",            modul:"roster",   teamOnly:true},
    {key:"attendance",label:"Termine",      short:"Termine",   icon:"calendar",         modul:"events"},
    {key:"training",  label:"Trainingsplan",short:"Trainingsplan",  icon:"clock",            modul:"training"},
    {key:"spielplan", label:"Spielplan & Tabelle",short:"Spiele",icon:"flag",           modul:"spielplan",teamOnly:true},
    {key:"polls",     label:"Abstimmungen", short:"Polls",     icon:"speakerphone",     modul:"polls",    teamOnly:true},
    {key:"helpers",   label:"Helfereinsätze",short:"Helfer",   icon:"heart-handshake",  modul:"helpers"},
    {key:"stats",     label:"Statistik",    short:"Stats",     icon:"chart-bar",        modul:"stats",    teamOnly:true},
    {key:"nachrichten",label:"Nachrichten",  short:"Chat",      icon:"message",          modul:"nachrichten"},
  ];
  const TABS_LIMITED=[
    {key:"overview",  label:"Übersicht",    short:"Übersicht", icon:"layout-dashboard"},
    {key:"roster",    label:"Kader",        short:"Kader",     icon:"users",            modul:"roster",   teamOnly:true},
    {key:"attendance",label:"Termine",      short:"Termine",   icon:"calendar",         modul:"events"},
    {key:"spielplan", label:"Spielplan & Tabelle",short:"Spiele",icon:"flag",           modul:"spielplan",teamOnly:true},
    {key:"polls",     label:"Abstimmungen", short:"Polls",     icon:"speakerphone",     modul:"polls",    teamOnly:true},
    {key:"helpers",   label:"Helfereinsätze",short:"Helfer",   icon:"heart-handshake",  modul:"helpers"},
    {key:"nachrichten",label:"Nachrichten",  short:"Chat",      icon:"message",          modul:"nachrichten"},
  ];

  /* Aktives Team-Objekt aus dbTeams → module_aktiv */
  const activeTeamObj=dbTeams.find(t=>t.name===activeTeam)||null;
  const teamModuleAktiv=activeTeamObj?.module_aktiv||null; // null = alle aktiv

  /* Tabs filtern:
     - teamOnly=true → nur team_module prüfen (nicht modul_rechte)
     - teamOnly=false/undefined → portal-Modul: moduleOk + team_module */
  const filterTabs=(tabList)=>tabList.filter(t=>{
    if(!t.modul) return true;
    const inTeamModule=!teamModuleAktiv||teamModuleAktiv.includes(t.modul);
    if(t.teamOnly) return inTeamModule;
    return moduleOk(t.modul)&&inTeamModule;
  });
  const tabs=filterTabs(limited?TABS_LIMITED:TABS_ALL);
  const [tab,setTab]=useState(()=>{const t=NAV_TARGET.tab||"overview";NAV_TARGET.tab=null;return t;});
  const [showMehrTab,setShowMehrTab]=useState(false);
  const [attFilter,setAttFilter]=useState(()=>{const f=NAV_TARGET.filter||[];NAV_TARGET.filter=null;return f;});
  const [rosterInitial,setRosterInitial]=useState(null);
  /* If NAV_TARGET specified a kindTeam, set activeKind accordingly */
  useEffect(()=>{
    if(NAV_TARGET.kindTeam){
      const kt=NAV_TARGET.kindTeam;NAV_TARGET.kindTeam=null;
      const k=kinder.find(c=>c.team===kt);
      if(k){setActiveKind(k);setActiveTeam(k.team);}
    }
  },[]);

  /* Reset tab when switching teams */
  const handleTeamSwitch=(team)=>{
    setActiveTeam(team);
    setTab("overview");
  };

  const title=isEltern?`Mein Kind - ${kinderNames}`:`Mein Team - ${activeTeam}`;

  return(
    <div>
      {/* Team-Header */}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:hasMultiTeams?10:isMobile?14:18}}>
        <div style={{width:6,height:isMobile?36:44,borderRadius:4,background:ACCENT,flexShrink:0,marginTop:2}}/>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontSize:isMobile?17:21,fontWeight:800,margin:0,letterSpacing:-0.3,whiteSpace:isMobile?"nowrap":"normal",overflow:"hidden",textOverflow:"ellipsis"}}>
            {isEltern?`${kinderNames}${activeKind?.team?" · "+activeKind.team:""}`:`${activeTeam}`}
          </h1>
          <p style={{color:"var(--sub)",margin:"2px 0 0",fontSize:13,display:"flex",flexWrap:"wrap",gap:"0 8px"}}>
            {isEltern&&<span>Elternzugang</span>}
            <span>{actualCount} Spieler</span>
            <span>Saison {teamInfo.season}</span>
            <span>{teamInfo.liga}</span>
          </p>
        </div>
      </div>

      {/* Kind-Selektor (nur wenn Eltern mehrere Kinder haben) */}
      {hasMultiKinder&&(
        <div style={{display:"flex",gap:8,marginBottom:18,padding:"12px 14px",background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginRight:4}}>Kind:</span>
          {kinder.map((k,i)=>{
            const active=activeKind?.name===k.name;
            const cnt=ROSTER.filter(p=>(p.teams||[]).includes(k.team)&&!p.role).length;
            const info=TEAMS_DATA[k.team]||{liga:"",season:""};
            return(
              <button key={i} onClick={()=>handleKindSwitch(k)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:10,
                  border:`1.5px solid ${active?ACCENT:GB}`,
                  background:active?"var(--cc-hover)":"#fff",cursor:"pointer",transition:"all 0.12s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:active?"rgba(0,0,0,0.1)":GR,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"var(--text)",flexShrink:0}}>
                  {k.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>{k.name.split(" ")[0]}</div>
                  <div style={{fontSize:13,color:"rgba(0,0,0,0.5)"}}>{k.team} · {info.liga}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Team-Selektor (Trainer) */}
      {hasMultiTeams&&(
        <div style={{marginBottom:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)",overflow:"hidden"}}>
          <div style={{padding:"8px 10px",fontSize:11,color:"var(--sub)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"0.5px solid var(--border)"}}>Team wechseln</div>
          <div style={{display:"flex",gap:8,padding:"10px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
            {trainerTeams.map(team=>{
              const info=TEAMS_DATA[team]||{count:18,liga:"Liga A"};
              const isActive=activeTeam===team;
              const cnt=ROSTER.filter(p=>(p.teams||[]).includes(team)).length||info.count;
              return(
                <button key={team} onClick={()=>handleTeamSwitch(team)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"8px 12px":"7px 14px",
                    borderRadius:10,border:`1.5px solid ${isActive?ACCENT:"var(--border)"}`,
                    background:isActive?ACCENT20:"transparent",
                    cursor:"pointer",transition:"all 0.15s",flexShrink:0,
                    WebkitTapHighlightColor:"transparent",minHeight:44}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:isActive?ACCENT:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:isActive?"#111":"var(--sub)",flexShrink:0}}>
                    {team.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{textAlign:"left",minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>{team}</div>
                    <div style={{fontSize:11,color:"var(--sub)"}}>{cnt} · {info.liga}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB-BAR: Desktop = scroll, Mobile = 4 Icons + Mehr ── */}
      {isMobile?(()=>{
        /* Primär-Tabs pro Rolle */
        const PRIMARY_KEYS={
          spieler:       ["overview","roster","attendance","spielplan"],
          eltern:        ["overview","roster","attendance","spielplan"],
          trainer:       ["overview","roster","attendance","spielplan"],
          administrator: ["overview","roster","attendance","spielplan"],
          administration:["overview","roster","attendance","spielplan"],
          vorstand:      ["overview","roster","attendance","spielplan"],
          funktionaer:   ["overview","roster","attendance","spielplan"],
        };
        const primKeys=new Set(PRIMARY_KEYS[role]||["overview","roster","attendance","spielplan"]);
        const primTabs=tabs.filter(t=>primKeys.has(t.key));
        const mehrTabs=tabs.filter(t=>!primKeys.has(t.key));
        const mehrActive=mehrTabs.some(t=>t.key===tab);
        return(
          <>
            {/* Bottom-Sheet Mehr */}
            {showMehrTab&&(
              <div onClick={()=>setShowMehrTab(false)}
                style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                <div onClick={e=>e.stopPropagation()}
                  style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:"8px 0 calc(env(safe-area-inset-bottom) + 80px)"}}>
                  <div style={{width:36,height:4,borderRadius:2,background:"var(--border)",margin:"4px auto 12px"}}/>
                  <div style={{padding:"0 8px 6px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Weitere Tabs</div>
                  {mehrTabs.map(t=>(
                    <button key={t.key} onClick={()=>{setTab(t.key);setShowMehrTab(false);}}
                      style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"12px 16px",
                        background:tab===t.key?ACCENT12:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                      <div style={{width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
                        background:tab===t.key?ACCENT:"var(--surface2)",flexShrink:0}}>
                        <TI n={t.icon||"circle"} size={19} style={{color:tab===t.key?"#111":"var(--sub)"}}/>
                      </div>
                      <span style={{fontSize:14,fontWeight:tab===t.key?600:400,color:tab===t.key?"var(--text)":"var(--sub)"}}>{t.label}</span>
                      {tab===t.key&&<TI n="check" size={16} style={{color:ACCENT,marginLeft:"auto"}}/>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Tab-Leiste */}
            <div style={{display:"flex",background:"var(--surface)",borderRadius:14,marginBottom:12,border:"0.5px solid var(--border)",overflow:"hidden"}}>
              {primTabs.map(t=>{
                const isActive=tab===t.key;
                return(
                  <button key={t.key} onClick={()=>{setTab(t.key);setShowMehrTab(false);}}
                    style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px 6px",
                      gap:4,background:"none",border:"none",cursor:"pointer",
                      borderBottom:isActive?`2.5px solid ${ACCENT}`:"2.5px solid transparent",
                      fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                    <TI n={t.icon||"circle"} size={20} style={{color:isActive?ACCENT:"var(--sub)"}}/>
                    <span style={{fontSize:11,color:isActive?ACCENT:"var(--sub)",fontWeight:isActive?700:400}}>{t.short||t.label}</span>
                  </button>
                );
              })}
              {mehrTabs.length>0&&(
                <button onClick={()=>setShowMehrTab(v=>!v)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px 6px",
                    gap:4,background:"none",border:"none",cursor:"pointer",
                    borderBottom:mehrActive||showMehrTab?`2.5px solid ${ACCENT}`:"2.5px solid transparent",
                    fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                  <TI n="dots" size={20} style={{color:mehrActive||showMehrTab?ACCENT:"var(--sub)"}}/>
                  <span style={{fontSize:11,color:mehrActive||showMehrTab?ACCENT:"var(--sub)",fontWeight:mehrActive||showMehrTab?700:400}}>Mehr</span>
                </button>
              )}
            </div>
          </>
        );
      })():(
        <Tabs tabs={tabs} active={tab} setActive={setTab}/>
      )}
      {tab==="overview"&&<TeamOverview role={role} team={activeTeam} setTab={setTab} setAttFilter={setAttFilter} responses={responses} setRosterInitial={setRosterInitial}/>}
      {tab==="roster"&&<RosterTab role={role} team={activeTeam} initialSelected={rosterInitial} teamRosterData={getMitgliederForTeam(activeTeam)}/>}
      {tab==="training"&&!limited&&<TrainingGantt team={activeTeam} sb={sb}/>}
      {tab==="spielplan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Spielplan</div>
            <SpielplanModul role={role} team={activeTeam} initialSelected={selectedSpiel}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Tabelle</div>
            <TableTab team={activeTeam}/>
          </div>
        </div>
      )}
      {tab==="attendance"&&<TermineModul role={role} team={activeTeam} setActive={setActive} myRosterId={isEltern&&activeKind?.rosterId?activeKind.rosterId:myRosterId} onNavigateToSpiel={(spiel)=>{setSelectedSpiel(spiel);setTab("spielplan");}} initialFilter={attFilter} responses={responses} allTeams={trainerTeams.length>1?trainerTeams:undefined} onResponseChange={(r)=>{
        const merged={...responses};
        Object.keys(r).forEach(evId=>{merged[evId]={...responses[evId],...r[evId]};});
        setResponses(merged);
        /* Save only delta */
        const delta={};
        Object.keys(merged).forEach(evId=>{
          Object.keys(merged[evId]||{}).forEach(pid=>{
            const cur=merged[evId]?.[pid]?.status;
            const init=ATT_INITIAL[evId]?.[pid]?.status;
            if(cur!==init){if(!delta[evId])delta[evId]={};delta[evId][pid]=merged[evId][pid];}
          });
        });
        window.storage.set("att_responses",JSON.stringify(delta)).catch(()=>{});
      }}/>}
      {tab==="events"&&<EventsList teamOnly role={role}/>}
      {tab==="polls"&&<PollsTab role={role}/>}
      {tab==="helpers"&&<HelpersList teamOnly role={role} account={account} meineTeams={[activeTeam]}/>}
      {tab==="stats"&&!limited&&<StatsTab team={activeTeam}/>}
      {tab==="nachrichten"&&<NachrichtenModul sb={sb} role={role} account={account} dbTeams={dbTeams} gruppen={[]} teamFilter={activeTeam} kannSchreiben={moduleOk("nachrichten")} kannVerwalten={false}/>}
    </div>
  );
}

function TeamOverview({role,team,setTab,setAttFilter,responses=ATT_INITIAL,setRosterInitial}){
  const isMobile=useIsMobile();
  const isEltern=role==="eltern";
  const today="2026-05-23";
  const parseEvDate=(d)=>{
    if(!d) return "";
    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const parts=clean.split(".");
    if(parts.length>=2) return `2026-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    return "";
  };
  const myTeam=team||"Cc-Junioren";
  const upcoming=ATT_EVENTS
    .filter(e=>e.team===myTeam||e.team==="Alle")
    .filter(e=>parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)))
    .slice(0,8);

  const spielplan=ATT_EVENTS
    .filter(e=>e.team===myTeam&&(e.type==="Training"||e.type==="Spiel")&&parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)));
  const allTermine=ATT_EVENTS
    .filter(e=>e.type==="Veranstaltung"&&(e.team===myTeam||e.team==="Alle"))
    .filter(e=>parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)))
    .slice(0,4);
  const accentFor=(e)=>e.type==="Spiel"?BL:e.subtype==="Vereinsanlass"?"#7C3AED":e.type==="Veranstaltung"?AM:GN;

  const termine=allTermine;

  return(
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
      {/* Team Übersicht */}
      <Card>
        <STitle>Info</STitle>
        {(()=>{
          const spieler=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&!p.role);
          const trainer=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&p.role);
          const pos=[...new Set(spieler.map(p=>p.pos).filter(Boolean))];
          const tableData=TABLES[myTeam]||[];
          const myRow=tableData.find(r=>r.me);
          return(
            <div>
              <div style={{display:"flex",gap:12,marginBottom:14}}>
                {[
                  {l:"Spieler im Kader", v:spieler.length, c:BK},
                  {l:"Trainer & Staff",  v:trainer.length, c:BK},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--surface2)",borderRadius:8,padding:"12px 4px"}}>
                    <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                    <div style={{fontSize:13,color:"var(--sub)",marginTop:4,lineHeight:1.3,textAlign:"center"}}>{s.l}</div>
                  </div>
                ))}
                {myRow&&(
                  <div onClick={setTab?()=>setTab("spielplan"):undefined}
                    style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--surface2)",borderRadius:8,padding:"12px 4px",cursor:setTab?"pointer":"default",transition:"background 0.1s"}}
                    onMouseEnter={e=>setTab&&(e.currentTarget.style.background=GB)}
                    onMouseLeave={e=>setTab&&(e.currentTarget.style.background=GR)}>
                    <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4,textAlign:"center"}}>Tabellenrang</div>
                    <div style={{fontSize:24,fontWeight:800,color:BL,lineHeight:1}}>{myRow.rank}.</div>
                    <div style={{fontSize:13,color:"var(--sub)",marginTop:4,textAlign:"center"}}>{tableData.length} Teams · {myRow.pts} Punkte</div>
                  </div>
                )}
              </div>
              {trainer.length>0&&(
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Trainer &amp; Staff</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {trainer.map((t,i)=>(
                    <div key={i} onClick={setTab&&setRosterInitial?()=>{setRosterInitial(t.id);setTab("roster");}:undefined}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--surface2)",borderRadius:8,cursor:setTab?"pointer":"default",transition:"background 0.1s"}}
                      onMouseEnter={e=>setTab&&(e.currentTarget.style.background=GB)}
                      onMouseLeave={e=>setTab&&(e.currentTarget.style.background=GR)}>
                      <Av name={`${t.firstName} ${t.lastName}`} size={26} bg={R}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{t.firstName} {t.lastName}</div>
                        <div style={{fontSize:13,color:"var(--sub)"}}>{t.role}</div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Card>
      <Card>
        <STitle>{isEltern?"Anwesenheit Team":"Anwesenheit Team"}</STitle>
        {(()=>{
          /* Only team-specific past Training + Spiel events */
          const pastEvs=ATT_EVENTS
            .filter(e=>e.team===myTeam&&(e.type==="Training"||e.type==="Spiel"))
            .filter(e=>parseEvDate(e.date)<today);
          const trainEvs=pastEvs.filter(e=>e.type==="Training");
          const spielEvs=pastEvs.filter(e=>e.type==="Spiel");
          /* Use same player slice as ATT_INITIAL */
          const pids=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&!p.role).map(p=>p.id).slice(0,12);
          /* Only count "zu", "ab", "unentschuldigt" - null/fraglich excluded */
          const calcPct=(evs)=>{
            if(!evs.length) return null;
            if(!pids.length){
              /* No roster: use seed-based synthetic data */
              let zu=0,total=0;
              evs.forEach(ev=>{
                for(let i=0;i<10;i++){const seed=(ev.id*37+i*13)%100;total++;if(seed<75)zu++;}
              });
              return total?Math.round(zu/total*100):null;
            }
            let zu=0,ab=0;
            evs.forEach(ev=>pids.forEach(pid=>{
              const s=responses[ev.id]?.[pid]?.status||ATT_INITIAL[ev.id]?.[pid]?.status;
              if(s==="zu") zu++;
              else if(s==="ab"||s==="unentschuldigt") ab++;
            }));
            const total=zu+ab;
            return total?Math.round(zu/total*100):null;
          };
          const col=(v)=>v===null?"#aaa":v>=80?GN:v>=60?AM:R;
          const fmt=(v)=>v===null?"-":v+"%";
          return(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {l:"Total",              v:fmt(calcPct(pastEvs)),           c:col(calcPct(pastEvs))},
                {l:"Trainings",          v:fmt(calcPct(trainEvs)),          c:col(calcPct(trainEvs))},
                {l:"Spiele",             v:fmt(calcPct(spielEvs)),          c:col(calcPct(spielEvs))},
                {l:"Letzte 5 Trainings", v:fmt(calcPct(trainEvs.slice(-5))),c:col(calcPct(trainEvs.slice(-5)))},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",background:"var(--surface2)",borderRadius:8,padding:"10px 4px"}}>
                  <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Ø Anwesenheit</div>
                  <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.3,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["training","spiele"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle anzeigen →</span>}>Spielplan &amp; Training</STitle>
        {(()=>{
          const shown=spielplan.slice(0,4);
          return(<>
            {shown.length===0&&<div style={{fontSize:13,color:"var(--sub)",padding:"8px 0"}}>Keine anstehenden Spiele oder Trainings.</div>}
            {shown.map((e,i)=>(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<shown.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {e.opponent?"vs. "+e.opponent:e.type==="Training"?"Training · "+e.team:e.title||e.type}
                  </div>
                  <div style={{fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
                    <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                    <span style={{color:"var(--border)"}}>·</span>
                    <span>{e.time+" Uhr"}</span>
                    <span style={{color:"var(--border)"}}>·</span>
                    <span>{e.location}</span>
                  </div>
                </div>
                <span style={{fontSize:13,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0}}>{e.type}</span>
              </div>
            ))}
          </>);
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["team-event","vereinsanlass"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle anzeigen →</span>}>Vereinsanlässe &amp; Team-Events</STitle>
        {termine.length===0&&<div style={{fontSize:13,color:"var(--sub)",padding:"8px 0"}}>Keine anstehenden Anlässe.</div>}
        {termine.map((e,i)=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<termine.length-1?`0.5px solid ${GB}`:"none"}}>
            <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis"}}>{e.title||e.type}</div>
              <div style={{fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
                <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                <span style={{color:"var(--border)"}}>·</span>
                <span>{e.time+" Uhr"}</span>
                <span style={{color:"var(--border)"}}>·</span>
                <span>{e.location}</span>
              </div>
            </div>
            <span style={{fontSize:13,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0,whiteSpace:"nowrap"}}>{e.subtype||e.type}</span>
          </div>
        ))}
      </Card>
      {(role==="trainer"||role==="administrator"||role==="administration")&&(
        <Card>
          <STitle>Teamnews</STitle>
          {(()=>{
            const NEWS={
              "Cc-Junioren":        "Neues Tenü ab Di im Materialraum. Elternabend 10.06. - Rückmeldung bis 05.06. Vereinsbus für Auswärtsspiel Sa 07.06. reserviert.",
              "Ca-Junioren":        "Trainingslager 20.-22.06. - Anmeldung bis 05.06. Neue Leibchen liegen im Materialraum bereit. Auswärtsspiel Sa 31.05. - Treffpunkt 14:15 Bahnhof.",
              "1. Mannschaft Herren":"Saisonabschluss Fr 12.06. im Vereinslokal. Neuer Torwart ab nächster Woche im Training. Auswärtsfahrt Sa 07.06. - Bus um 13:30 ab Sportanlage.",
              "2. Mannschaft Herren":"Trainingsverschiebung: Di 27.05. auf Mi 28.05. Materialraum ab Fr zugänglich. Anwesenheitspflicht für Spiel Sa 31.05.",
              "1. Mannschaft Frauen":"Neue Trainingszeiten ab Juni: Di 19:30 und Do 19:30. Teamfoto Fr 06.06. vor dem Training. Vereinsbus für Auswärtsspiel gebucht.",
              "Da-Junioren":        "Elternabend Mi 04.06. um 19:00 Uhr. Neue Spielschuhe im Materialraum. Turnier in Küsnacht Sa 14.06.",
              "Db-Junioren":        "Training fällt aus am Fr 30.05. (Feiertag). Nachholtraining Di 03.06. Neue Leibchen verteilt.",
              "Ba-Junioren":        "Konditionstest nächsten Di. Elterninformation zum Trainingslager verschickt. Auswärtsspiel Sa 24.05. - Abfahrt 13:30.",
              "Bb-Junioren":        "Trainingsplan für Juni hängt im Materialraum. Neuer Assistent/in ab Juni. Teamfoto beim nächsten Heimspiel.",
              "D-Juniorinnen":      "Schnuppertraining für Neue am Sa 07.06. Neues Trainingsmaterial eingetroffen. Turnier in Herrliberg am 21.06.",
              "E-Juniorinnen":      "Spielfest am Sa 14.06. - bitte bis Fr 06.06. anmelden. Neue Bälle im Materialraum.",
              "F-Juniorinnen":      "Elternabend Do 05.06. um 18:30. Trikots für neue Spielerinnen bestellt. Nächstes Spielfest am 21.06.",
              "C-Juniorinnen":      "Trainingslager geplant für Juli - Details folgen. Neues Tenü ab Di im Materialraum. Turnier am 14.06.",
              "A-Junioren":         "Konditionstraining ab nächster Woche. Neue Taktikbesprechung Mi 28.05. nach Training. Auswärtsspiel Sa 31.05.",
            };
            const text=NEWS[myTeam]||"Keine aktuellen Teamnews.";
            return <p style={{margin:0,fontSize:13,color:"var(--sub)",lineHeight:1.65}}>{text}</p>;
          })()}
        </Card>
      )}
    </div>
  );
}

/* -- Mitglied-Detailansicht (Modal) -- */
function MitgliedDetail({person,role,onClose,nr,onUpdateNr}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const can=(field)=>vis.includes(field);
  const canEdit=["trainer","administrator","administration"].includes(role);
  const [editingNr,setEditingNr]=useState(false);
  const [nrVal,setNrVal]=useState(nr||"");

  const Row=({label,value,mono,blue})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"9px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span style={{fontSize:13,color:"var(--sub)",flexShrink:0,minWidth:120}}>{label}</span>
      <span style={{fontSize:13,fontWeight:600,color:blue?BL:mono?"#666":BK,textAlign:"right",wordBreak:"break-word",fontFamily:mono?"monospace":"inherit"}}>{value||"-"}</span>
    </div>
  );

  const NrRow=()=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:"0.5px solid var(--border)",gap:12}}>
      <span style={{fontSize:13,color:"var(--sub)",flexShrink:0,minWidth:120}}>{"Rückennummer"}</span>
      {canEdit&&editingNr?(
        <input autoFocus type="number" min="1" max="99" value={nrVal}
          onChange={e=>setNrVal(e.target.value)}
          onBlur={()=>{setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}
          onKeyDown={e=>{if(e.key==="Enter"){setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}}
          style={{width:60,padding:"3px 7px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:700,textAlign:"right",color:R,outline:"none"}}
        />
      ):(
        <div onClick={canEdit?()=>setEditingNr(true):undefined}
          style={{display:"flex",alignItems:"center",gap:8,cursor:canEdit?"pointer":"default"}}>
          <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{nrVal||"-"}</span>
          {canEdit&&<span style={{fontSize:13,color:"var(--sub)"}}><TI n="edit"/></span>}
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
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:13,marginTop:4,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <Chip text={person.pos||"-"} color="#fff" bg="rgba(255,255,255,0.25)"/>
              {(person.teams||["Cc-Junioren"]).map((t,i)=>(
                <span key={i} style={{color:"rgba(255,255,255,0.85)",fontSize:13}}>{i>0&&<span style={{opacity:0.5,margin:"0 3px"}}>·</span>}{t}</span>
              ))}
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>Saison 2024/25</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",color:"#fff",fontSize:21,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}>×</button>
        </div>

        <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:16}}>

          {/* PERSONALIEN */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Personalien</div>
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
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Adresse</div>
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
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Kommunikation Persönlich</div>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                {can("email")&&<Row label="E-Mail"  value={person.email} blue/>}
                {can("tel")  &&<Row label="Telefon" value={person.tel}/>}
              </div>
            </div>
          )}

          {/* ERZIEHUNGSBERECHTIGTE PERSON 1 */}
          {can("parent1")&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Erziehungsberechtigte Person 1</div>
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
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Erziehungsberechtigte Person 2</div>
              <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
                <Row label="Name"    value={person.p2Last}/>
                <Row label="Vorname" value={person.p2First}/>
                <Row label="E-Mail"  value={person.p2Email} blue/>
                <Row label="Telefon" value={person.p2Tel}/>
              </div>
            </div>
          )}

          {/* Rollenhinweis */}
          <div style={{padding:"8px 12px",background:"var(--surface)",borderRadius:8,fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
            <span><TI n="eye"/></span>
            <span>Feldsichtbarkeit gemäss Rolle: <strong>{getRole(role).label}</strong></span>
          </div>
        </div>
      </div>
      </div>
  );
}

/* -- Kaderliste mit Feldsichtbarkeit -- */
function RosterTab({role,team,initialSelected=null,teamRosterData=null}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const [search,setSearch]=useState("");
  /* teamRosterData aus DB wenn vorhanden, sonst ROSTER Fallback */
  const baseRoster=teamRosterData||(team?ROSTER.filter(p=>(p.teams||[]).includes(team)):ROSTER);
  const initPlayer=typeof initialSelected==="number"?baseRoster.find(p=>p.id===initialSelected)||null:initialSelected;
  const [selected,setSelected]=useState(initPlayer);
  const [positions,setPositions]=useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.pos])));
  const [rueckennrn,setRueckennrn]=useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.rueckennr||""])));
  const [editingPos,setEditingPos]=useState(null);
  const [editingNr,setEditingNr]=useState(null);

  /* Load persisted numbers on mount */
  const [nrLoaded,setNrLoaded]=useState(false);
  if(!nrLoaded){
    setNrLoaded(true);
    (async()=>{
      try{
        const res=await window.storage.get("rueckennrn");
        if(res){
          const d=JSON.parse(res.value);
          Object.assign(NR_CACHE.data,d);
          setRueckennrn(prev=>({...prev,...d}));
        }
      }catch(e){}
    })();
  }

  const saveNr=(newNrn)=>{
    setRueckennrn(newNrn);
    Object.assign(NR_CACHE.data,newNrn);
    window.storage.set("rueckennrn",JSON.stringify(newNrn)).catch(()=>{});
  };
  const canEditPos=role==="trainer"||role==="administrator"||role==="administration";
  const POSITION_GROUPS=[
    {label:"Torwart",     options:["TW"]},
    {label:"Verteidiger", options:["V","IV","RV","LV"]},
    {label:"Mittelfeld",  options:["MF","DM","ZM","LM","RM"]},
    {label:"Sturm",       options:["ST"]},
  ];
  /* Filter by search */
  const teamRoster=baseRoster;
  const filtered=teamRoster.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  /* Sorting */
  const [sortKey,setSortKey]=useState("name");
  const [sortDir,setSortDir]=useState(1); /* 1=asc, -1=desc */
  const [groupByFunktion,setGroupByFunktion]=useState(true);
  const [showExport,setShowExport]=useState(false);
  const EXPORT_ROLES=["trainer","funktionaer","vorstand","administration","administrator"];
  const canExport=EXPORT_ROLES.includes(role);
  const [exportFields,setExportFields]=useState(["name","role","pos","nr"]);

  const handleSort=(key)=>{
    if(sortKey===key) setSortDir(d=>d*-1);
    else{setSortKey(key);setSortDir(1);}
  };

  const f=[...filtered].sort((a,b)=>{
    let va,vb;
    if(sortKey==="name"){
      va=String((a.lastName||"")+(a.firstName||"")||a.name||"");
      vb=String((b.lastName||"")+(b.firstName||"")||b.name||"");
      return String(va||'').localeCompare(String(vb||''))*sortDir;
    }
    if(sortKey==="pos"){
      va=positions[a.id]||""; vb=positions[b.id]||"";
      return String(va||'').localeCompare(String(vb||''))*sortDir;
    }
    if(sortKey==="nr"){
      va=rueckennrn[a.id]?parseInt(rueckennrn[a.id]):9999;
      vb=rueckennrn[b.id]?parseInt(rueckennrn[b.id]):9999;
      return (va-vb)*sortDir;
    }
    return 0;
  });

  /* Gruppierung nach Funktion */
  const FUNKTION_ORDER=["Trainer/in","Co-Trainer/in","Assistent/in","Goalietrainer/in","Masseur/in","Admin","TW","V","IV","RV","LV","DM","ZM","MF","LM","RM","ST"];
  const normFunktion=(s)=>{
    if(!s) return "-";
    const l=s.toLowerCase();
    if(l.includes("goalietrain")||l.includes("goalitrain")) return "Goalietrainer/in";
    if(l.includes("co-train")||l.includes("co train")||l.includes("cotrainer")) return "Co-Trainer/in";
    if(l.includes("assistent")||l.includes("assistenz")) return "Assistent/in";
    if(l.includes("masseur")||l.includes("physiother")) return "Masseur/in";
    if(l.includes("admin")||l.includes("sekretär")||l.includes("aktuarin")) return "Admin";
    if(l.includes("train")) return "Trainer/in";
    return s;
  };
  const getFunktionLabel=(p)=>normFunktion(p.role||positions[p.id])||"-";
  const grouped=groupByFunktion
    ?Object.entries(f.reduce((acc,p)=>{
        const key=getFunktionLabel(p)||"Spieler";
        if(!acc[key]) acc[key]=[];
        acc[key].push(p);
        return acc;
      },{}))
      .sort(([a],[b])=>{
        const ia=FUNKTION_ORDER.indexOf(a); const ib=FUNKTION_ORDER.indexOf(b);
        if(ia>=0&&ib>=0) return ia-ib;
        if(ia>=0) return -1; if(ib>=0) return 1;
        return String(a||"").localeCompare(String(b||""));
      })
      .map(([key,items])=>({key,items}))
    :[{key:null,items:f}];

  const SortIcon=({col})=>{
    if(sortKey!==col) return <span style={{color:"var(--sub)",fontSize:13,marginLeft:3}}>{"↕"}</span>;
    return <span style={{color:R,fontSize:13,marginLeft:3}}>{sortDir===1?<TI n="upload"/>:"↓"}</span>;
  };

  const COL_DEF_ALL=[
    {key:"name",    label:"Name / Vorname", always:true},
    {key:"role",    label:"Funktion",       always:true},
    {key:"pos",     label:"Position",       always:true},
    {key:"nr",      label:"Nr.",            always:true},
    {key:"dob",     label:"Geburtsdatum",   field:"dob"},
    {key:"email",   label:"E-Mail",         field:"email"},
    {key:"tel",     label:"Telefon",        field:"tel"},
    {key:"pass",    label:"Spielerpass",    field:"pass"},
    {key:"js",      label:"J+S Nr.",        field:"js"},
    {key:"ahv",     label:"AHV-Nummer",     field:"ahv"},
    {key:"fairgate",label:"Fairgate-ID",    field:"fairgate"},
  ];
  const SIMPLE_ROLES=["trainer","spieler","eltern"];
  const isSimpleView=SIMPLE_ROLES.includes(role);
  const COL_DEF=isSimpleView
    ?COL_DEF_ALL.filter(c=>["name","role","pos","nr"].includes(c.key))
    :COL_DEF_ALL;
  const cols=COL_DEF.filter(c=>c.always||vis.includes(c.field));

  return(
    <div>
      {selected&&<MitgliedDetail person={selected} role={role} onClose={()=>setSelected(null)} nr={rueckennrn[selected.id]} onUpdateNr={v=>saveNr({...rueckennrn,[selected.id]:v})}/>}
      {/* Export Modal */}
      {showExport&&(
        <div onClick={()=>setShowExport(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:16,padding:24,width:340,maxWidth:"90vw",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Kaderliste exportieren</div>
            <div style={{fontSize:13,color:"var(--sub)",marginBottom:16}}>Felder auswählen die exportiert werden sollen</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {COL_DEF_ALL.map(c=>(
                <label key={c.key} style={{display:"flex",alignItems:"center",gap:12,padding:"6px 10px",borderRadius:8,background:"var(--surface2)",cursor:"pointer"}}>
                  <input type="checkbox" checked={exportFields.includes(c.key)}
                    onChange={e=>setExportFields(prev=>e.target.checked?[...prev,c.key]:prev.filter(k=>k!==c.key))}
                    style={{width:16,height:16,accentColor:BK,cursor:"pointer"}}/>
                  <span style={{fontSize:13,color:"var(--text)"}}>{c.label}</span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                const fields=COL_DEF_ALL.filter(c=>exportFields.includes(c.key));
                const header=fields.map(c=>c.label).join(";");
                const rows=f.map(p=>{
                  return fields.map(c=>{
                    if(c.key==="name") return `${p.lastName||""} ${p.firstName||""}`.trim()||p.name||"";
                    if(c.key==="role") return p.role||"Spieler/in";
                    if(c.key==="pos") return positions[p.id]||"";
                    if(c.key==="nr") return rueckennrn[p.id]||"";
                    return p[c.field]||p[c.key]||"";
                  }).join(";");
                }).join("\n");
                const csv=`${header}\n${rows}`;
                const a=document.createElement("a");
                a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
                a.download=`Kader_${team||"Export"}_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                setShowExport(false);
              }} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                CSV herunterladen
              </button>
              <button onClick={()=>setShowExport(false)} style={{padding:"9px 16px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",fontSize:13,cursor:"pointer",fontFamily:FONT,color:"var(--sub)"}}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen…" style={{padding:"7px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13,outline:"none",width:200}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {canExport&&(
              <button onClick={()=>setShowExport(true)} style={{
                display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,
                border:"1px solid var(--border)",background:"transparent",
                color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT
              }}>
                <TI n="file-download" size={15} style={{color:GN}}/>Export
              </button>
            )}
          <button onClick={()=>setGroupByFunktion(g=>!g)} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,
            border:`1px solid ${groupByFunktion?BK:"var(--border)"}`,
            background:groupByFunktion?BK+"15":"transparent",
            color:groupByFunktion?BK:"var(--sub)",fontSize:13,fontWeight:600,
            cursor:"pointer",fontFamily:FONT
          }}>
            <TI n="layout-list" size={13}/>Gruppieren
          </button>
          <InfoBox text={`${f.length} Mitglieder`} color={BL}/>
        </div>
      </div>
      {isMobile?(
        <Card style={{padding:0}}>
          {groupByFunktion
            ? grouped.flatMap(({key,items})=>[
                key&&<div key={`grp-${key}`} style={{
                  padding:"8px 16px 5px",
                  fontSize:11,fontWeight:700,color:"var(--sub)",
                  textTransform:"uppercase",letterSpacing:0.6,
                  background:"var(--surface2)",
                  borderTop:"0.5px solid var(--border)"
                }}>{key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span></div>,
                ...items.map((p,i)=>(
                  <div key={p.id} onClick={()=>setSelected(p)}
                    style={{display:"flex",alignItems:"center",gap:16,padding:"14px 16px",borderTop:`0.5px solid ${GB}`,cursor:"pointer",background:"var(--surface)"}}
                    className="hov-row">
                    <Av name={p.name} size={32} bg={ACCENT20}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{p.lastName} {p.firstName}</div>
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        {positions[p.id]&&<span style={{background:"var(--surface2)",color:"var(--sub)",padding:"2px 8px",borderRadius:20}}>{positions[p.id]}</span>}
                        {rueckennrn[p.id]&&<span style={{color:"var(--sub)"}}>Nr. {rueckennrn[p.id]}</span>}
                      </div>
                    </div>
                    <span style={{color:"var(--sub)",fontSize:18}}>›</span>
                  </div>
                ))
              ]).filter(Boolean)
            : filtered.map((p,i)=>(
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"16px",borderTop:i>0?`0.5px solid ${GB}`:"none",cursor:"pointer",background:"var(--surface)"}}
                  className="hov-row">
                  <Av name={p.name} size={32} bg={ACCENT20}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{p.lastName} {p.firstName}</div>
                    <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      {positions[p.id]&&<span style={{background:"var(--surface2)",color:"var(--sub)",padding:"2px 9px",borderRadius:20}}>{positions[p.id]}</span>}
                      {rueckennrn[p.id]&&<span style={{color:"var(--sub)"}}>Nr. {rueckennrn[p.id]}</span>}
                      {p.role&&<span style={{background:"#7C3AED18",color:"#7C3AED",padding:"2px 9px",borderRadius:20}}>{p.role}</span>}
                    </div>
                  </div>
                  <span style={{color:"var(--sub)",fontSize:18}}>›</span>
                </div>
              ))
          }
        </Card>
      ):(
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {cols.map((c,i)=>{
                const sortable=["name","pos","nr"].includes(c.key);
                return(
                  <th key={i}
                    onClick={sortable?()=>handleSort(c.key):undefined}
                    style={{padding:"9px 13px",textAlign:"left",fontWeight:sortable&&sortKey===c.key?800:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap",cursor:sortable?"pointer":"default",userSelect:"none"}}>
                    {c.label}{sortable&&<SortIcon col={c.key}/>}
                  </th>
                );
              })}
              <th style={{padding:"9px 13px",width:32}}/>
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const spieler=f.filter(p=>!p.role);
              const trainer=f.filter(p=>p.role);
              const renderRow=(p,i,bg)=>(
              <tr
                key={p.id}
                onClick={()=>setSelected(p)}
                className="hov-row"
                style={{borderTop:"0.5px solid var(--border)",background:bg,cursor:"pointer"}}>
                {cols.map((c,j)=>{
                  if(c.key==="role") return(
                    <td key={j} style={{padding:"9px 13px"}}>
                      {p.role
                        ?<span style={{fontSize:11,background:"#7C3AED18",color:"#7C3AED",fontWeight:700,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap"}}>{p.role}</span>
                        :<span style={{fontSize:13,color:"var(--sub)"}}>Spieler/in</span>
                      }
                    </td>
                  );
                  if(c.key==="nr") return(
                    <td key={j} style={{padding:"9px 10px",width:44,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingNr===p.id?(
                        <input
                          autoFocus
                          type="number"
                          min="1" max="99"
                          value={rueckennrn[p.id]}
                          onChange={e=>saveNr({...rueckennrn,[p.id]:e.target.value})}
                          onBlur={()=>setEditingNr(null)}
                          onKeyDown={e=>{if(e.key==="Enter")setEditingNr(null);}}
                          style={{width:38,padding:"3px 5px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:700,textAlign:"center",color:R,outline:"none"}}
                        />
                      ):(
                        <div onClick={canEditPos?()=>setEditingNr(p.id):undefined}
                          title={canEditPos?"Rückennr. bearbeiten":undefined}
                          style={{cursor:canEditPos?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                          {rueckennrn[p.id]
                            ?<span style={{fontSize:13,fontWeight:600,color:"var(--sub)"}}>{rueckennrn[p.id]}</span>
                            :<span style={{fontSize:13,color:"var(--sub)"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:13,color:"var(--sub)"}}><TI n="edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="name") return(
                    <td key={j} style={{padding:"9px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av name={p.name} size={26} bg={ACCENT20}/>
                        <div>
                          <div style={{fontWeight:600,whiteSpace:"nowrap",color:"var(--sub)"}}>{p.lastName} {p.firstName}</div>
                          {p.role&&<span style={{fontSize:13,background:"#7C3AED18",color:"#7C3AED",fontWeight:700,padding:"1px 5px",borderRadius:8}}>{p.role}</span>}
                          {!p.role&&p.teams&&p.teams.length>1&&(
                            <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                              {p.teams.map((t,i)=><span key={i} style={{fontSize:13,background:i===0?R+"15":"#EFF6FF",color:i===0?R:BL,fontWeight:600,padding:"1px 5px",borderRadius:8}}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                  if(c.key==="pos") return(
                    <td key={j} style={{padding:"9px 13px"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingPos===p.id?(
                        <select
                          autoFocus
                          value={positions[p.id]||""}
                          onChange={e=>{setPositions(prev=>({...prev,[p.id]:e.target.value}));setEditingPos(null);}}
                          onBlur={()=>setEditingPos(null)}
                          style={{padding:"4px 10px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:600,color:R,background:"var(--surface)",cursor:"pointer",outline:"none"}}>
                          <option value="">- keine -</option>
                          {POSITION_GROUPS.map(g=>(
                            <optgroup key={g.label} label={g.label}>
                              {g.options.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      ):(
                        <div
                          onClick={canEditPos?()=>setEditingPos(p.id):undefined}
                          title={canEditPos?"Position bearbeiten":undefined}
                          style={{display:"inline-flex",alignItems:"center",gap:4,cursor:canEditPos?"pointer":"default"}}>
                          {positions[p.id]
                            ?<Chip text={positions[p.id]} color="#555" bg="#F3F4F6"/>
                            :<span style={{fontSize:13,color:"var(--sub)",fontStyle:"italic"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:13,color:"var(--sub)"}}><TI n="edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="ahv")     return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>••••••••••</td>;
                  if(c.key==="address") return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13,whiteSpace:"nowrap"}}>{p.street}, {p.plz} {p.city}</td>;
                  if(c.key==="parent")  return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13,whiteSpace:"nowrap"}}>{p.p1First} {p.p1Last}</td>;
                  return <td key={j} style={{padding:"9px 13px",color:c.field==="email"?BL:"#555",fontSize:13,whiteSpace:"nowrap"}}>{p[c.field]||"-"}</td>;
                })}
                <td style={{padding:"9px 13px",textAlign:"right",color:"var(--sub)",fontSize:13}}>›</td>
              </tr>
              );
              const ROLLE_ORDER=["Trainer","Assistent/in","Coach","Admin"];
              const trainerSorted=[...trainer].sort((a,b)=>{
                const ia=ROLLE_ORDER.indexOf(a.role||"");
                const ib=ROLLE_ORDER.indexOf(b.role||"");
                const ra=ia===-1?99:ia;
                const rb=ib===-1?99:ib;
                return ra!==rb?ra-rb:String(a.lastName||'').localeCompare(String(b.lastName||''));
              });
              return groupByFunktion
                ? grouped.flatMap(({key,items})=>[
                    key&&<tr key={`grp-${key}`}>
                      <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6}}>
                          {key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span>
                        </span>
                      </td>
                    </tr>,
                    ...items.map((p,i)=>renderRow(p,i,i%2===0?"var(--surface)":"var(--surface2)")),
                  ]).filter(Boolean)
                : [
                    trainer.length>0&&(
                      <tr key="trainer-divider">
                        <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Trainer &amp; Staff</span>
                        </td>
                      </tr>
                    ),
                    ...trainerSorted.map((p,i)=>renderRow(p,i,"#fafaf8")),
                    spieler.length>0&&(
                      <tr key="spieler-divider">
                        <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Spieler</span>
                        </td>
                      </tr>
                    ),
                    ...spieler.map((p,i)=>renderRow(p,i,i%2===0?"var(--surface)":"var(--surface2)")),
                  ];
            })()}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}

/* -- TRAININGSPLAN STATE (localStorage) -- */
/* == TRAININGSPLAN DATA == */
const INITIAL_PLAENE = [
  {
    id: "plan_1",
    name: "Trainingsplan Saison 2025/26",
    valid_from: "2025-08-01",
    valid_until: "2026-06-30",
    active: true,
    slots: GANTT.flatMap((d,di) => d.slots.map((s,si) => ({
      id: "slot_"+di+"_"+si,
      weekday: d.day,
      team: s.team,
      start: s.start,
      end: s.end,
      ort: s.field,
      end_ort: "",
      half: "",
      end_half: "",
      wechsel_zeit: "",
      color: s.color,
    })))
  }
];

/* == PLATZ-GANTT == */
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
    <div ref={containerRef} style={{width:"100%", overflowX:"auto", WebkitOverflowScrolling:"touch", fontFamily:FONT, fontSize:13}}>
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
                <div style={{fontSize:13, fontWeight:700, letterSpacing:0.5, color:isToday?"#4F46E5":hasSlots?BK:"#888580", textTransform:"uppercase"}}>{day}</div>
                <div style={{fontSize:13, marginTop:1, color:isToday?"#6366F1":"#6B7280", fontWeight:isToday?600:400}}>{fmtDate(d)}</div>
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
                  <div style={{fontSize:13, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
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
                  <div style={{fontSize:13, fontWeight:600, color:"var(--sub)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.3}}>{col.half||""}</div>
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
                  {isHour && <span style={{fontSize:13, color:"var(--sub)", fontWeight:600, letterSpacing:-0.3}}>{fmtT15(t)}</span>}
                  {!isHour && <span style={{fontSize:13, color:"#D1D5DB", fontWeight:400}}>{fmtT15(t)}</span>}
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
                              <div style={{color:"#fff", fontWeight:700, fontSize:13, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.2}}>{s.team}</div>
                              {h>28 && <div style={{color:"rgba(255,255,255,0.82)", fontSize:13, letterSpacing:0.1}}>{fmtT15(b.start)}-{fmtT15(b.end)}</div>}
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
function TrainingGantt({team: teamProp, role, kannSchreiben, kannVerwalten, sb:supabase}){
  const START = 7, END = 22, H = 52;
  const isMobile = useIsMobile();
  const canEdit = role==="administrator"||role==="administration";

  const [plaene, setPlaene] = useState(INITIAL_PLAENE);
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
            // Fallback: localStorage
            const r = await window.storage.get("trainingsPlaene");
            if(r) setPlaene(JSON.parse(r.value));
          }
          // Ausnahmen laden
          const {data: ausnahmenData} = await supabase.from("trainingsplan_ausnahmen").select("*");
          if(ausnahmenData){
            const ausnahmenMap = {};
            ausnahmenData.forEach(function(a){
              const key = a.week_nr_key;
              if(!ausnahmenMap[key]) ausnahmenMap[key] = [];
              ausnahmenMap[key].push({
                id: a.id,
                slot_id: a.slot_id,
                type: a.type,
                datum: a.date,
                kw_key: a.week_nr_key,
                neue_start_zeit: a.neue_start_zeit,
                neue_end_zeit: a.neue_end_zeit,
                neues_ort: a.neues_ort,
                neue_half: a.neue_half,
                grund: a.grund||"",
              });
            });
            setAusnahmen(ausnahmenMap);
          }
        } else {
          // Kein Supabase — localStorage
          const r = await window.storage.get("trainingsPlaene");
          if(r) setPlaene(JSON.parse(r.value));
          const a = await window.storage.get("trainingsAusnahmen");
          if(a) setAusnahmen(JSON.parse(a.value));
        }
        const tn = await window.storage.get("trainer_benachrichtigungen");
        if(tn){ const alle=JSON.parse(tn.value); setTrainerNachrichten(alle.filter(function(n){return !n.gelesen;})); }
      }catch(e){ console.warn("[FCH] Trainingsplan laden Fehler:", e.message); }
    })();
  },[]);

  async function savePlaene(p){
    setPlaene(p);
    if(supabase){
      try{
        for(const plan of p){
          await supabase.from("trainingsplan_vorlagen").upsert({
            id: plan.id,
            name: plan.name,
            valid_from: plan.valid_from,
            valid_until: plan.valid_until,
            active: plan.active,
          });
          if(plan.slots){
            for(const s of plan.slots){
              await supabase.from("trainingsplan_slots").upsert({
                id: s.id,
                template_id: s.template_id||plan.id,
                weekday: s.weekday,
                team: s.team,
                start_zeit: s.start,
                end_zeit: s.end,
                location: s.location,
                end_ort: s.end_ort||null,
                half: s.half||null,
                end_haelfte: s.end_half||null,
                wechsel_zeit: s.wechsel_zeit||null,
                color: s.color||null,
              });
            }
          }
        }
      }catch(e){ console.warn("[FCH] savePlaene Fehler:", e.message); }
    } else {
      window.storage.set("trainingsPlaene", JSON.stringify(p));
    }
  }

  async function saveAusnahmen(a){
    setAusnahmen(a);
    if(supabase){
      try{
        // Alle Ausnahmen als flache Liste
        const alle = Object.values(a).flat();
        for(const ausnahme of alle){
          await supabase.from("trainingsplan_ausnahmen").upsert({
            id: ausnahme.id,
            slot_id: ausnahme.slot_id||null,
            type: ausnahme.type,
            week_nr: ausnahme.week_nr,
            year: ausnahme.year,
            neue_start_zeit: ausnahme.neue_start_zeit||null,
            neue_end_zeit: ausnahme.neue_end_zeit||null,
            neuer_ort: ausnahme.neues_ort||null,
            neue_haelfte: ausnahme.neue_half||null,
            grund: ausnahme.grund||null,
          });
        }
      }catch(e){ console.warn("[FCH] saveAusnahmen Fehler:", e.message); }
    } else {
      window.storage.set("trainingsAusnahmen", JSON.stringify(a));
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

  const FCH_TEAMS = [
    "1. Mannschaft","2. Mannschaft","3. Mannschaft","4. Mannschaft",
    "Ältere Junioren A","Ältere Junioren B",
    "Cc-Junioren","Dc-Junioren","Ec-Junioren","Fc-Junioren",
    "Gc-Junioren","Hc-Junioren","Ic-Junioren",
    "Frauen","Mädchen",
  ];
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
        if(oa) return Object.assign({},s,{ort:oa.neuer_ort,isOrtGeaendert:true});
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
    }
    setShowAusnahmeModal(false);
  }

  function handleAusnahmeRemove(ausnahme){
    const next = Object.assign({},ausnahmen);
    next[kwKey] = (ausnahmen[kwKey]||[]).filter(function(a){ return a!==ausnahme; });
    saveAusnahmen(next);
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
      <button onClick={onClick} style={{padding:small?"4px 10px":"6px 14px", borderRadius:20, border:"1px solid "+(danger?R:active?BK:GB), background:danger?RL:active?BK:"#fff", color:danger?R:active?"#fff":"#555", fontSize:13, fontWeight:active?600:400, cursor:"pointer", whiteSpace:"nowrap"}}>{children}</button>
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
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere einen Plan als Vorlage fur eine neue Version.</div>
              {plaene.map(function(p){
                const isAktiv = p.id===aktiverPlan;
                const slotCount = (p.slots||[]).length;
                return(
                  <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"12px 14px",background:isAktiv?"#EFF6FF":"#fff"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <div style={{fontWeight:700,fontSize:14,color:isAktiv?BL:BK}}>{p.name}</div>
                          {isAktiv&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                          {p.active&&!isAktiv&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN,fontWeight:600}}>Aktiviert</span>}
                        </div>
                        <div style={{fontSize:13,color:"var(--sub)"}}>
                          {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                          {" bis "}
                          {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                          {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        {!isAktiv&&(
                          <button onClick={function(){handlePlanAktivieren(p.id);}}
                            style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                            Aktivieren
                          </button>
                        )}
                        <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);setShowPlanVerwaltung(false);}} title="Bearbeiten"
                          style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                        <button onClick={function(){handlePlanDuplizieren(p);}} title="Duplizieren"
                          style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                        {plaene.length>1&&!isAktiv&&(
                          <button onClick={function(){if(window.confirm("Plan \""+p.name+"\" loeschen?")){handlePlanLoeschen(p.id);}}} title="Loeschen"
                            style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={function(){setEditPlan(null);setShowPlanEditor(true);setShowPlanVerwaltung(false);}}
                style={{padding:"10px",borderRadius:10,border:"1.5px dashed "+GB,background:"transparent",color:"var(--sub)",fontSize:13,cursor:"pointer",textAlign:"center",marginTop:4}}>
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
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:isActive?"#fff":"transparent",color:isActive?BK:"#888",fontWeight:isActive?700:400,fontSize:13,cursor:"pointer",boxShadow:isActive?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
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
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere ihn als Vorlage fur eine neue Version.</div>
          {plaene.map(function(p){
            const isAktiv = p.id===aktiverPlan;
            const slotCount = (p.slots||[]).length;
            return(
              <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"14px 16px",background:isAktiv?"#EFF6FF":"#fff"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{fontWeight:700,fontSize:14,color:isAktiv?BL:BK}}>{p.name}</div>
                      {isAktiv&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                    </div>
                    <div style={{fontSize:13,color:"var(--sub)"}}>
                      {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                      {" bis "}
                      {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                      {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                    </div>
                  </div>
                  {canEdit&&(
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      {!isAktiv&&<button onClick={function(){handlePlanAktivieren(p.id);}} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:13,fontWeight:600,cursor:"pointer"}}>Aktivieren</button>}
                      <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                      <button onClick={function(){handlePlanDuplizieren(p);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                      {plaene.length>1&&!isAktiv&&<button onClick={function(){if(window.confirm("Plan loeschen?")){handlePlanLoeschen(p.id);}}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>}
                    </div>
                  )}
                </div>
                {isAktiv&&<button onClick={function(){setTrainungsTab("gantt");}} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid "+BL+"40",background:"transparent",color:BL,fontSize:13,cursor:"pointer"}}>Zum GANTT →</button>}
                {!isAktiv&&canEdit&&(
                  <button onClick={function(){setVorschauPlan(p.id);setTrainungsTab("gantt");}}
                    style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid #FDE68A",background:"var(--surface)",color:"#92400E",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    Vorschau im GANTT →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === Tab: Platze === */}
      {trainingsTab==="plaetze"&&<PlaetzeView/>}

      {/* === Tab: GANTT === */}
      {trainingsTab==="gantt"&&(
      <div>

      {/* Ausserhalb Gültigkeitsspanne */}
      {!planGueltigDieseWoche&&(
        <div style={{padding:"10px 14px",background:"var(--surface2)",border:"1px solid #D1D5DB",borderRadius:10,marginBottom:12,fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
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
            <span style={{fontSize:13,fontWeight:700,color:"#92400E"}}>Vorschau: </span>
            <span style={{fontSize:13,color:"#92400E"}}>{plan.name}</span>
            <span style={{fontSize:13,color:"#B45309",marginLeft:8}}>Nicht der aktive Plan</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){handlePlanAktivieren(vorschauPlan);setVorschauPlan(null);}}
              style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid "+BL,background:"var(--surface)",color:BL,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Jetzt aktivieren
            </button>
            <button onClick={function(){setVorschauPlan(null);}}
              style={{padding:"8px 14px",borderRadius:8,border:"0.5px solid #FDE68A",background:"var(--surface)",color:"#92400E",fontSize:13,cursor:"pointer"}}>
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
              {isVorschau&&<span style={{fontSize:13,background:"#FDE68A",color:"#92400E",padding:"2px 7px",borderRadius:20,marginRight:7,fontWeight:600}}>Vorschau</span>}
              {plan?plan.name:"Trainingsplan"}
            </div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
              {plan&&plan.valid_from?"Gueltig: "+fmtDate(new Date(plan.valid_from))+" - "+(plan.valid_until?fmtDate(new Date(plan.valid_until)):"unbegrenzt"):""}
            </div>
          </div>
          {canEdit && (
            <Btn2 small onClick={function(){setEditSlot(null);setShowSlotModal(true);}}>+ Training</Btn2>
          )}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===0?6:d-1;}); }
              else { setKwOffset(function(o){return o-1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14}}>&#8249;</button>
            <div style={{textAlign:"center",minWidth:130}}>
              {ansicht==="woche" ? (
                <>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>KW {kw}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{fmtDate(dayDates[0])} - {fmtDate(dayDates[6])}.{dayDates[6].getFullYear()}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{DAYS[selectedDay]}, {fmtDate(dayDates[selectedDay])}.{dayDates[selectedDay].getFullYear()}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>KW {kw}</div>
                </>
              )}
            </div>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===6?0:d+1;}); }
              else { setKwOffset(function(o){return o+1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:14}}>&#8250;</button>
            {kwOffset!==0 && <button onClick={function(){setKwOffset(0);setSelectedDay(0);}} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>Heute</button>}
          </div>
          {ansicht==="tag" && (
            <div style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {DAYS.map(function(d,i){
                const isToday = dayDates[i].toDateString()===today.toDateString();
                const isSelected = selectedDay===i;
                return(
                  <button key={i} onClick={function(){setSelectedDay(i);}}
                    style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(isSelected?BK:isToday?"#6366F1":GB),background:isSelected?BK:isToday?"#EEF2FF":"#fff",color:isSelected?"#fff":isToday?"#4F46E5":"#555",fontSize:13,fontWeight:isSelected?700:400,cursor:"pointer",flexShrink:0}}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          {kwAusnahmen.length>0 && (
            <span style={{fontSize:13,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"var(--surface)",color:"#D97706",border:"1px solid #FED7AA"}}>
              {kwAusnahmen.length} Ausnahme{kwAusnahmen.length>1?"n":""}
            </span>
          )}
          {/* Team-Filter Dropdown */}
          <select value={teamFilter} onChange={function(e){setTeamFilter(e.target.value);}}
            style={{padding:"8px 14px",borderRadius:8,border:"1px solid "+GB,background:"var(--surface)",fontSize:13,outline:"none",cursor:"pointer",maxWidth:180}}>
            <option value="alle">Alle Mannschaften</option>
            {alleTeams.map(function(t){
              return <option key={t} value={t}>{t}</option>;
            })}
          </select>
          <div style={{flex:1}}/>
          {/* Ansicht-Toggle */}
          <div style={{display:"flex",background:"var(--surface2)",borderRadius:20,padding:3,gap:4}}>
            {[{v:"woche",l:"Woche"},{v:"tag",l:"Tag"}].map(function(a){
              return(
                <button key={a.v} onClick={function(){setAnsicht(a.v);}}
                  style={{padding:"5px 12px",borderRadius:20,border:"none",background:ansicht===a.v?"#fff":"transparent",color:ansicht===a.v?BK:"#999",fontWeight:ansicht===a.v?600:400,fontSize:13,cursor:"pointer",boxShadow:ansicht===a.v?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
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
            <div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:13,color:"var(--sub)"}}>
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
            <span style={{fontSize:13,fontWeight:700,color:BL}}>Training dauerhaft aus dem Plan entfernt</span>
            <button onClick={async function(){
              try{
                const nr = await window.storage.get("trainer_benachrichtigungen");
                if(nr){ const alle=JSON.parse(nr.value).map(function(n){return Object.assign({},n,{gelesen:true});}); await window.storage.set("trainer_benachrichtigungen",JSON.stringify(alle)); setTrainerNachrichten([]); }
              }catch(e){}
            }} style={{fontSize:13,padding:"5px 12px",borderRadius:20,border:"1px solid #2563EB40",background:"var(--surface)",color:BL,cursor:"pointer"}}>Gelesen</button>
          </div>
        </div>
      )}

      {/* Trainer-Absagen Banner */}
      {trainerAbsagen.length>0 && (
        <div style={{marginTop:12,border:"1px solid "+R+"40",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:RL,padding:"10px 14px",borderBottom:"1px solid "+R+"20"}}>
            <span style={{fontSize:13,fontWeight:700,color:R}}>{trainerAbsagen.length} Training{trainerAbsagen.length>1?"s":""} diese Woche vom Trainer abgesagt</span>
          </div>
          {trainerAbsagen.map(function(a,i){
            const slot=(plan?plan.slots||[]:[]||[]).find(function(s){return s.id===a.slot_id;});
            return (
              <div key={i} style={{padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<trainerAbsagen.length-1?"0.5px solid "+GB:"none",background:"var(--surface)"}}>
                <div>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{a.team}</span>
                  <span style={{fontSize:13,color:"var(--sub)",marginLeft:8}}>{a.weekday}{slot?" "+fmtTime(slot.start)+"-"+fmtTime(slot.end)+" Uhr":""}</span>
                </div>
                <span style={{fontSize:13,padding:"2px 8px",borderRadius:20,background:RL,color:R,fontWeight:600}}>Abgesagt</span>
              </div>
            );
          })}
          <div style={{padding:"8px 14px",background:"#FFF5F5"}}>
            <span style={{fontSize:13,color:"var(--sub)"}}>Administration wurde automatisch benachrichtigt</span>
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
                <div style={{fontSize:13,fontWeight:700,color:R,marginBottom:2}}>Training wird dauerhaft aus dem Plan entfernt</div>
                <div style={{fontSize:13,color:"var(--sub)"}}>{deleteSlot.team} - {deleteSlot.weekday} {fmtTime(deleteSlot.start)}-{fmtTime(deleteSlot.end)} Uhr</div>
              </div>
              {deleteSlot.zukunftigeEvents.length>0 ? (
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Welche Termine absagen?</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set(s.zukunftigeEvents.map(function(e){return e.id;}))});});}} style={{fontSize:13,padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer"}}>Alle</button>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set()});});}} style={{fontSize:13,padding:"5px 12px",borderRadius:20,border:"1px solid "+GB,background:"var(--surface)",cursor:"pointer"}}>Keine</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
                    {deleteSlot.zukunftigeEvents.map(function(e){
                      const selected = deleteSlot.selectedEvIds.has(e.id);
                      return (
                        <div key={e.id} onClick={function(){setDeleteSlot(function(s){const next=new Set(s.selectedEvIds);selected?next.delete(e.id):next.add(e.id);return Object.assign({},s,{selectedEvIds:next});});}} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:8,border:"1px solid "+(selected?R:GB),background:selected?RL:"#fff",cursor:"pointer"}}>
                          <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(selected?R:"#ccc"),background:selected?R:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {selected && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>v</span>}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{e.date}</div>
                            <div style={{fontSize:13,color:"var(--sub)"}}>{e.time} Uhr</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{padding:"12px",background:"var(--surface2)",borderRadius:8,fontSize:13,color:"var(--sub)"}}>Keine zukuenftigen Termine vorhanden.</div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){handleSlotDeleteConfirm(deleteSlot,deleteSlot.selectedEvIds);}} style={{flex:1,padding:"8px 14px",borderRadius:10,border:"none",background:R,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  Training loeschen{deleteSlot.selectedEvIds.size>0?" & "+deleteSlot.selectedEvIds.size+" Termin"+(deleteSlot.selectedEvIds.size>1?"e":"")+" absagen":""}
                </button>
                <button onClick={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} style={{padding:"10px 18px",borderRadius:10,border:"1px solid "+GB,background:"var(--surface)",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
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


/* -- Slot-Bearbeitungs-Modal -- */
/* TermineModul via ./TermineModul.jsx */

function PollsTab({role}){
  const canCreate=role==="trainer"||role==="administrator"||role==="administration";
  const [votes,setVotes]=useState({});
  return(
    <div>
      {canCreate&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
          <Btn variant="primary" color="#F3F4F6">+ Abstimmung erstellen</Btn>
        </div>
      )}
      {!canCreate&&<InfoBox text="Spieler und Eltern können an Abstimmungen teilnehmen, aber keine erstellen." color={BL}/>}
      <div style={{marginTop:14}}>
        {POLLS.map((p,i)=>(
          <Card key={i} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700}}>{p.title}</h3>
                <Chip text={p.target} color={BL}/>
                {" "}<Chip text={p.closed?"Geschlossen":"Offen"} color={p.closed?"#888":GN} bg={p.closed?"#f5f5f5":"#ECFDF5"}/>
              </div>
              <span style={{fontSize:13,color:"var(--sub)"}}>{p.votes.reduce((a,b)=>a+b,0)} Stimmen</span>
            </div>
            {p.options.map((opt,j)=>{
              const tot=p.votes.reduce((a,b)=>a+b,0);
              const pct=tot?Math.round(p.votes[j]/tot*100):0;
              const my=votes[i]===j;
              return(
                <div key={j} onClick={()=>!p.closed&&setVotes(v=>({...v,[i]:j}))} style={{marginBottom:7,cursor:p.closed?"default":"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2}}>
                    <span style={{fontWeight:my?700:400}}>{opt}{my?" ✓":""}</span>
                    <span style={{color:"var(--sub)",fontWeight:600}}>{pct}%</span>
                  </div>
                  <div style={{height:6,background:GB,borderRadius:4}}>
                    <div style={{height:"100%",width:`${pct}%`,background:my?R:BL,borderRadius:4}}/>
                  </div>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatsTab({team="Cc-Junioren"}){
  /* Generate per-team stats from ROSTER + seeded random */
  const seed=(str)=>str.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const rnd=(n,min,max)=>{let s=seed(n+team);s=((s*1664525+1013904223)&0xFFFFFFFF)>>>0;return min+Math.floor((s/0xFFFFFFFF)*(max-min+1));};
  const players=ROSTER.filter(p=>(p.teams||[]).includes(team)&&!p.role);
  const stats=players.map(p=>{
    const nm=`${p.firstName} ${p.lastName}`;
    return{name:nm,sp:rnd(nm+"sp",6,14),tore:rnd(nm+"t",0,9),assists:rnd(nm+"a",0,7),gelb:rnd(nm+"g",0,3),rot:rnd(nm+"r",0,1)};
  }).sort((a,b)=>b.tore-a.tore);
  if(stats.length===0) return <Card><div style={{textAlign:"center",color:"var(--sub)",padding:20}}>Keine Spielerstatistiken verfügbar.</div></Card>;
  return(
    <Card style={{padding:0,overflowX:"auto"}}>      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:"var(--surface2)"}}>
            {["Spieler","Spiele","Tore","Assists","Gelb","Rot"].map((h,i)=>(
              <th key={i} style={{padding:"9px 13px",textAlign:i>0?"center":"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((p,i)=>(
            <tr key={i} style={{borderTop:"0.5px solid var(--border)"}}>
              <td style={{padding:"9px 13px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><Av name={p.name} size={26} bg={R}/><span style={{fontWeight:600}}>{p.name}</span></div>
              </td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.sp}</td>
              <td style={{padding:"9px 13px",textAlign:"center",fontWeight:p.tore>=5?700:400,color:p.tore>=5?R:BK}}>{p.tore}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.assists}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.gelb>0?<span style={{background:"#FCD34D",color:"#78350F",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:13}}>{p.gelb}</span>:"-"}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.rot>0?<span style={{background:R,color:"#fff",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:13}}>{p.rot}</span>:"-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ==========================================
   ADMIN-EXKLUSIVE VIEWS
========================================== */
/* Vereinsfunktion → farbiger Chip */
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

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Detail-Modal ── */
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const eltern=raw.eltern||[];
    const fv=getFieldVisibility(role);
    const rows=[
      {l:"Vorname",     v:raw.vorname||m.name.split(" ")[0]},
      {l:"Nachname",    v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
      ...(fv.showGebdat ?[{l:"Geburtsdatum",v:raw.geburtsdatum||"-"}]:[]),
      {l:"Nationalität",v:raw.nationalitaet||"-"},
      ...(fv.showAdresse?[{l:"Adresse",v:raw.strasse?`${raw.strasse}, ${raw.plz} ${raw.ort}`:m.location||"-"}]:[]),
      ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||"-"}]:[]),
      ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||"-"}]:[]),
      {l:"Rolle",       v:m.role},
      {l:"Team(s)",     v:m.team},
      {l:"Mitgliedtyp", v:m.type},
      {l:"Position",    v:raw.position||"-"},
      ...(fv.showPass   ?[{l:"Spielerpass",v:raw.spielerpass||"-"}]:[]),
      ...(fv.showAhv    ?[{l:"AHV-Nr.",    v:raw.ahv_nr||"-"}]:[]),
      ...(fv.showPass   ?[{l:"J+S Nr.",    v:raw.js_nr||"-"}]:[]),
      ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
      ...(fv.showNotizen?[{l:"Notizen",    v:raw.notizen||"-"}]:[]),
    ];
    return(
      <ModalOrSheet open={true} onClose={onClose} maxWidth={540}>
        <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av name={m.name} size={44} bg={R}/>
            <div>
              <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{m.name}</div>
              <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                <Chip text={m.role} color={R}/>
                <Chip text={m.type} color={BL} bg="#EFF6FF"/>
                <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 20px 20px"}}>
          <Tabs tabs={[{key:"info",label:"Infos"},{key:"eltern",label:`Eltern (${eltern.length})`}]} active={selectedMember?._tab||"info"} setActive={t=>setSelectedMember(prev=>({...prev,_tab:t}))}/>
          {(selectedMember?._tab||"info")==="info"&&(
            <div>
              {rows.filter(r=>r.v&&r.v!=="-").map((r,i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<arr.length-1?"1px solid var(--border)":"none",gap:12}}>
                  <span style={{fontSize:13,color:"var(--sub)",minWidth:110,flexShrink:0}}>{r.l}</span>
                  <span style={{fontSize:13,color:"var(--text)",fontWeight:600,textAlign:"right"}}>{r.v}</span>
                </div>
              ))}
              {m.hat_portal_zugang&&(
                <div style={{marginTop:14,padding:"10px 14px",background:"var(--surface)",borderRadius:8,border:"1px solid "+GN,fontSize:13,color:GN,fontWeight:600}}>
                  ✓ Hat Portal-Zugang
                </div>
              )}
            </div>
          )}
          {(selectedMember?._tab||"info")==="eltern"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {eltern.length===0&&<div style={{color:"var(--sub)",fontSize:13,textAlign:"center",padding:24}}>Keine Elternkontakte erfasst.</div>}
              {eltern.map((e,i)=>(
                <div key={i} className="cc-card" style={{borderRadius:12,border:"0.5px solid",padding:"14px 16px"}}>
                  <div style={{fontWeight:600,fontSize:14,color:"var(--text)",marginBottom:8}}>{e.vorname} {e.nachname}</div>
                  {e.email&&<div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>✉ {e.email}</div>}
                  {e.telefon&&<div style={{fontSize:13,color:"var(--sub)"}}>📞 {e.telefon}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalOrSheet>
    );
  };

  return(
    <div>
      {selectedMember&&<MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>}
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0,color:"var(--text)"}}>Mitglieder</h1>
        {canExport&&<div style={{display:"flex",gap:8}}><Btn>Export CSV</Btn><Btn>Export Excel</Btn></div>}
      </div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
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
                fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>
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
                    fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s",
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
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {COLS.map(c=>(
                <th key={c.key} onClick={()=>handleSort(c.key)}
                  style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",
                    fontSize:13,textTransform:"uppercase",letterSpacing:0.4,cursor:"pointer",
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
                    <td colSpan={6} style={{padding:"10px 13px 6px",background:"var(--surface2)",
                      fontWeight:700,fontSize:13,color:"var(--sub)",textTransform:"uppercase",
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
                    <td style={{padding:"9px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av name={m.name} size={28} bg={R}/>
                        <span style={{fontWeight:600,color:"var(--text)"}}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{padding:"9px 13px"}}><RolleChip rolle={m.role}/></td>
                    <td style={{padding:"9px 13px",color:"var(--sub)"}}>{m.team}</td>
                    <td style={{padding:"9px 13px"}}><Chip text={m.type} color={BL} bg="#EFF6FF"/></td>
                    <td style={{padding:"9px 13px",color:"var(--sub)"}}>{m.location}</td>
                    <td style={{padding:"9px 13px"}}>
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div style={{padding:"32px",textAlign:"center",color:"var(--sub)",fontSize:13}}>
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

function FieldVisView(){
  const fields=[
    {name:"Profilbild",       spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Name / Vorname",   spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Geburtsdatum",     spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Adresse",          spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"E-Mail / Telefon", spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Spielerpass",      spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Nationalität",     spieler:"-", eltern:"-", trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Elternkontakte",   spieler:"-", eltern:"Eigene Kinder",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"J+S Nummer",       spieler:"-", eltern:"-", trainer:"Je nach Recht",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"AHV-Nummer",       spieler:"-", eltern:"-", trainer:"-",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Fairgate-ID/Sync", spieler:"-", eltern:"-", trainer:"-",funktionaer:"-",administration:"✓",administrator:"✓"},
  ];
  const rc=c=>{
    if(c==="✓") return{color:GN,bg:"#ECFDF5"};
    if(c==="-") return{color:"var(--sub)",bg:"#fafafa"};
    return{color:AM,bg:"#FFFBEB"};
  };
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 8px"}}>Feldsichtbarkeit</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Konfigurierbar pro Rolle (Kap. 6.1)</p>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>Feld</th>
              {["Spieler","Eltern","Trainer","Funktionäre","Administration","Administrator"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f,i)=>(
              <tr key={i} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{f.name}</td>
                {["spieler","eltern","trainer","funktionaer","administration","administrator"].map((r,j)=>{
                  const v=f[r];const s=rc(v);
                  return <td key={j} style={{padding:"9px 13px",textAlign:"center"}}><Chip text={v} color={s.color} bg={s.bg}/></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SyncView(){ return <PortalverwaltungView initialTab="api"/>; }
function AuditView(){ return <PortalverwaltungView initialTab="audit"/>; }

/* ══════════════════════════════════════════════════════════════════
   PORTALVERWALTUNG — Zentrales Admin-Cockpit
   Tabs: Module & Rechte | Benutzer & Rollen | Feldsichtbarkeit |
         API-Verbindungen | Audit-Logs
   ══════════════════════════════════════════════════════════════════ */
/* PortalverwaltungModul via ./PortalverwaltungModul.jsx */

function ProfileView({role,myRosterId,account}){
  const isEltern=role==="eltern";
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const name=isEltern?(account?.name||"Anna Meier"):(player?`${player.firstName} ${player.lastName}`:"Luca Meier");
  const kinder=account?.kinder||[];
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>{isEltern?"Profil / Daten prüfen":"Mein Profil"}</h1>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
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
              <span style={{fontSize:13,fontWeight:600}}>{x.v}</span>
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
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginTop:1,wordBreak:"break-all"}}>{x.v}</div>
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
function EventsList({teamOnly,role}){
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isTrainer=role==="trainer";
  const canCreate=kannVerwalten?kannVerwalten("helpers"):kannHelferEinsatzErstellen(role,"team",null,meineTeams||[]);
  const [showForm,setShowForm]=useState(false);
  const [newEvent,setNewEvent]=useState({title:"",type:isTrainer?"Team-Event":"Team-Event",date:"",time:"",loc:"",rsvp:true});

  /* Trainer sieht nur Team-Events bei teamOnly */
  const list=teamOnly?EVENTS.filter(e=>e.type==="Team-Event"):isTrainer?EVENTS:EVENTS;

  const typeOptions=isTrainer?["Team-Event"]:["Team-Event","Vereinsanlass"];

  return(
    <div>
      {!teamOnly&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Termine</h1>
          {canCreate&&<Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(v=>!v)}>{"+ "+( isTrainer?"Team-Event erstellen":"Anlass erstellen")}</Btn>}
        </div>
      )}
      {isTrainer&&!teamOnly&&(
        <InfoBox text="Als Trainer kannst du Team-Events erstellen. Vereinsanlässe werden durch Administration oder Vorstand eröffnet." color={BL}/>
      )}

      {/* Erstellungsformular */}
      {showForm&&canCreate&&(
        <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:16,marginTop:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{"Neuer "+(isTrainer?"Team-Event":"Anlass")}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Titel</div>
              <input value={newEvent.title} onChange={e=>setNewEvent(p=>({...p,title:e.target.value}))}
                placeholder="Titel des Anlasses" style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Typ</div>
              <select value={newEvent.type} onChange={e=>setNewEvent(p=>({...p,type:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}>
                {typeOptions.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Datum</div>
              <input type="date" value={newEvent.date} onChange={e=>setNewEvent(p=>({...p,date:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/>
            </div>
            <div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Uhrzeit</div>
              <input type="time" value={newEvent.time} onChange={e=>setNewEvent(p=>({...p,time:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Ort</div>
              <input value={newEvent.loc} onChange={e=>setNewEvent(p=>({...p,loc:e.target.value}))}
                placeholder="Vereinslokal, Mehrzweckhalle…" style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <input type="checkbox" id="rsvp-chk" checked={newEvent.rsvp} onChange={e=>setNewEvent(p=>({...p,rsvp:e.target.checked}))} style={{cursor:"pointer"}}/>
            <label htmlFor="rsvp-chk" style={{fontSize:13,cursor:"pointer"}}>Rückmeldung erforderlich</label>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="primary" color="#F3F4F6">Erstellen</Btn>
            <Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:teamOnly?0:14}}>
        {list.map((e,i)=>{
          const accentColor=e.type==="Team-Event"?BL:e.type==="Vereinsanlass"?"#7C3AED":R;
          return(
            <div key={i} style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,overflow:"hidden",display:"flex",marginBottom:10}}>
              {/* Left accent bar */}
              <div style={{width:4,background:accentColor,flexShrink:0}}/>
              {/* Content */}
              <div style={{flex:1,padding:"14px 16px",minWidth:0}}>
                {/* Type + RSVP badge row */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{background:accentColor+"18",color:accentColor,fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,border:`0.5px solid ${accentColor}30`}}>
                    {e.type}
                  </span>
                  {e.rsvp&&(
                    <span style={{fontSize:13,fontWeight:600,color:AM,background:"var(--surface)",border:"0.5px solid #FDE68A",padding:"2px 8px",borderRadius:20}}>
                      {"Rückmeldung erforderlich"}
                    </span>
                  )}
                  {e.rsvp&&e.res&&(
                    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:13,color:GN,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:GN,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{"✓"}</span>
                        {e.res.y}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:13,color:R,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:R,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{"✕"}</span>
                        {e.res.n}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:13,color:AM,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:"#FEF3C7",border:`1.5px solid ${AM}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,color:AM,fontWeight:800}}>{"?"}</span>
                        {e.res.o}
                      </span>
                    </div>
                  )}
                </div>
                {/* Title */}
                <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:7}}>{e.title}</div>
                {/* Meta */}
                <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",fontSize:13,color:"var(--sub)"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="calendar"/></span>{e.date}{e.endDate?" - "+e.endDate:""}
                  </span>
                  <span style={{color:"var(--border)",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="clock"/></span>{e.time+" Uhr"}
                  </span>
                  <span style={{color:"var(--border)",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="map-pin"/></span>{e.loc}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -- Helfereinsätze: helfereinsatz.ch-Style -- */

function getHelperName(role,account){
  if(account?.name) return account.name;
  if(role==="spieler") return "Luca Meier";
  if(role==="eltern")  return "Anna Meier";
  if(role==="trainer") return "Thomas Müller";
  return "Sandra Berger";
}

/* Alle möglichen Übergabe-Empfänger (alle Helfer ausser dem aktuellen) */
const ALLE_HELFER_NAMEN = HELPERS.map(h=>h.name);

function BemerkungEdit({notes,onSave}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(notes||"");
  if(editing) return(
    <div style={{display:"flex",gap:4,marginTop:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Bemerkung…"
        style={{padding:"2px 7px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,outline:"none",width:130}}
        onKeyDown={e=>{if(e.key==="Enter"){onSave(draft);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
      <button onClick={()=>{onSave(draft);setEditing(false);}} style={{padding:"1px 6px",borderRadius:6,fontSize:13,fontWeight:600,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,cursor:"pointer"}}>✓</button>
      <button onClick={()=>setEditing(false)} style={{padding:"1px 6px",borderRadius:6,fontSize:13,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}>✕</button>
    </div>
  );
  return <button onClick={e=>{e.stopPropagation();setEditing(true);setDraft(notes||"");}} style={{marginTop:3,fontSize:13,color:"var(--sub)",background:"none",border:"none",cursor:"pointer",padding:0}}><TI n="edit" style={{marginRight:3}}/> Bemerkung</button>;
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
            <div style={{fontWeight:700,fontSize:13,color:"var(--text)",lineHeight:1.2}}>{schicht.label}</div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
              <span><TI n="map-pin"/></span><span>{einsatz.location}</span>
            </div>
            {notes&&<div style={{fontSize:13,color:AM,marginTop:3,fontStyle:"italic"}}><TI n="edit" style={{marginRight:3}}/> {notes}</div>}
            {canEdit&&onSaveBemerkung&&<BemerkungEdit notes={notes} onSave={onSaveBemerkung}/>}
          </div>
          <span style={{fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:20,background:statusBg,color:statusColor,flexShrink:0,whiteSpace:"nowrap"}}>
            {statusText}
          </span>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{height:6,background:"var(--surface2)",borderRadius:4,marginBottom:10}}>
          <div style={{height:"100%",width:`${pct}%`,background:voll?GN:filled>0?AM:R,borderRadius:4}}/>
        </div>

        {/* Plätze Zähler */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:ichDrin||!voll?10:0}}>
          <button onClick={()=>setShowHelfer(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:0,fontSize:13,color:"var(--sub)"}}>
            <span style={{fontSize:13,display:"inline-block",transform:showHelfer?"rotate(90deg)":"none"}}>▶</span>
            <span><strong style={{color:"var(--text)"}}>{filled}</strong> / {max} belegt</span>
          </button>
          {ichDrin&&<span style={{fontSize:13,color:GN,fontWeight:700}}>Du dabei ✓</span>}
        </div>

        {showHelfer&&(
          <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
            {helfer.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:h===meinName?"#DCFCE7":"#F3F4F6",borderRadius:6,padding:"4px 8px"}}>
                <Av name={h} size={16} bg={h===meinName?GN:"#9CA3AF"}/>
                <span style={{fontSize:13,fontWeight:h===meinName?700:500,color:h===meinName?GN:"#374151",flex:1}}>{h}</span>
                {h===meinName&&<span style={{fontSize:13,color:GN}}>Du</span>}
              </div>
            ))}
            {Array.from({length:max-filled},(_,i)=>(
              <div key={`f${i}`} style={{display:"flex",alignItems:"center",gap:8,background:"var(--surface)",border:"1px dashed #D1D5DB",borderRadius:6,padding:"4px 8px"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#E5E7EB",flexShrink:0}}/>
                <span style={{fontSize:13,color:"var(--sub)"}}>Freier Platz</span>
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
              <button onClick={()=>setShowTransfer(true)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:`0.5px solid #0891B2`,background:"var(--surface)",color:"#0891B2"}}>
                ⇄ Übertragen
              </button>
              <button onClick={()=>setShowAnfrageForm(true)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:`0.5px solid ${AM}`,background:"var(--surface)",color:AM}}>
                ↩ Freigabe anfragen
              </button>
            </div>
          )}

          {/* Bestätigung nach Absenden */}
          {showAnfrageOk&&(
            <div style={{fontSize:13,color:GN,fontWeight:600,padding:"3px 0"}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>
          )}

          {/* Ausstehende Anfrage */}
          {anfragePending&&!showAnfrageOk&&(
            <div style={{background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontSize:13,color:AM,fontWeight:700,marginBottom:3}}>⏳ Freigabe ausstehend</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
          )}

          {/* Freigabe-Anfrage Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"10px 12px",background:"var(--surface)",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={anfrageBegruendung}
                onChange={e=>setAnfrageBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:FONT}}
              />
              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={handleAnfrageSenden}
                  disabled={!anfrageBegruendung.trim()}
                  style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:anfrageBegruendung.trim()?"pointer":"default",border:"none",background:anfrageBegruendung.trim()?AM:"#ccc",color:"#fff"}}>
                  Anfrage senden
                </button>
                <button onClick={()=>{setShowAnfrageForm(false);setAnfrageBegruendung("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)"}}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid #0891B2`,borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:600,color:"#0891B2",marginBottom:6}}>Schicht an wen übertragen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setTransferTarget("");}}
                  placeholder="Person suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?"#0891B2":GB}`,borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<button onClick={()=>{setZuteilSearch("");setTransferTarget("");}} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--sub)",lineHeight:1}}>×</button>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const kandidaten=ALLE_HELFER_NAMEN.filter(n=>n!==meinName&&!helfer.includes(n));
                const gefiltert=kandidaten.filter(n=>!zuteilSearch||n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:13,color:"var(--sub)",padding:"4px 0",marginBottom:7}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const h=HELPERS.find(m=>m.name===n);
                      const info=h?.gruppe||h?.role||"";
                      const selected=transferTarget===n;
                      return(
                        <button key={n} onClick={()=>setTransferTarget(selected?"":n)}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,border:`0.5px solid ${selected?"#0891B2":GB}`,background:selected?"#ECFEFF":"#fff",cursor:"pointer",textAlign:"left"}}>
                          <Av name={n} size={20} bg={selected?"#0891B2":"#9CA3AF"}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:selected?700:400,color:selected?"#0891B2":"#374151"}}>{n}</div>
                            {info&&<div style={{fontSize:13,color:"var(--sub)"}}>{info}</div>}
                          </div>
                          {selected&&<span style={{fontSize:13,color:"#0891B2",flexShrink:0}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleÜbertragen} disabled={!transferTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:transferTarget?"pointer":"default",border:"none",background:transferTarget?"#0891B2":"#ccc",color:"#fff"}}>Übertragen</button>
                <button onClick={()=>{setShowTransfer(false);setTransferTarget("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      ):!voll?(
        <div>
          {/* Trainer: Zuteilungs-Dropdown */}
          {canZuteilen&&!showZuteilen&&(
            <button onClick={()=>setShowZuteilen(true)} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:"var(--surface2)",color:"var(--text)"}}>
              + Zuteilen
            </button>
          )}
          {/* Standard Eintragen für alle anderen */}
          {!canZuteilen&&(
            <button onClick={()=>onEintragen(schicht.id,meinName)} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:"var(--surface2)",color:"var(--text)"}}>
              ✓ Eintragen
            </button>
          )}
          {/* Zuteilungs-Formular */}
          {canZuteilen&&showZuteilen&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${GN}`,borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:600,color:GN,marginBottom:6}}>Wen zuteilen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setZuteilTarget("");}}
                  placeholder="Name suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?GN:GB}`,borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<button onClick={()=>{setZuteilSearch("");setZuteilTarget("");}} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--sub)",lineHeight:1}}>×</button>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const gefiltert=zuteilKandidaten.filter(n=>n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:13,color:"var(--sub)",padding:"4px 0"}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const gruppe=HELPERS.find(m=>m.name===n)?.gruppe||"";
                      const selected=zuteilTarget===n;
                      return(
                        <button key={n} onClick={()=>setZuteilTarget(selected?"":n)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,border:`0.5px solid ${selected?GN:GB}`,background:selected?GN+"18":"#fff",cursor:"pointer",textAlign:"left",width:"100%"}}>
                          <Av name={n} size={20} bg={selected?GN:"#bbb"}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:selected?700:400,color:selected?GN:BK}}>
                              {n}{n===meinName&&<span style={{fontSize:13,color:GN,marginLeft:5}}>(ich)</span>}
                            </div>
                            {gruppe&&<div style={{fontSize:13,color:"var(--sub)",marginTop:1}}>{gruppe}</div>}
                          </div>
                          {selected&&<span style={{fontSize:13,color:GN,flexShrink:0}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleZuteilen} disabled={!zuteilTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:zuteilTarget?"pointer":"default",border:"none",background:zuteilTarget?GN:"#ccc",color:"#fff"}}>Zuteilen</button>
                <button onClick={()=>{setShowZuteilen(false);setZuteilTarget("");setZuteilSearch("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      ):(
        <div style={{marginTop:10}}>
          <button disabled style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"default",border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--sub)"}}>Besetzt</button>
        </div>
      )}

      {/* Funktionär/Admin: Freigabe-Anfrage mit Begründung bestätigen */}
      {canFreigeben&&anfragePending&&(
        <div style={{marginTop:8,padding:"9px 12px",background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{fontSize:13,color:AM,fontWeight:700,marginBottom:2}}>Freigabe-Anfrage von {anfrageData?.name}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
            <button onClick={()=>onFreigeben(schicht.id,null)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",border:"none",background:AM,color:"#fff",flexShrink:0}}>Freigeben ✓</button>
          </div>
        </div>
      )}
      {/* Admin/Funktionär: jemanden direkt austragen */}
      {canFreigeben&&!ichDrin&&helfer.length>0&&(
        <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
          {helfer.map((h,i)=>(
            <button key={i} onClick={()=>onFreigeben(schicht.id,h)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:`0.5px solid ${R}`,background:"var(--surface)",color:R}}>
              {h} ✕
            </button>
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
          <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span>{schicht.einsatzName}</span>
            {schicht.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzDate}</span></>}
            {schicht.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzOrt}</span></>}
          </div>
        </div>
        <div style={{flexShrink:0}}>
          {anfragePending
            ?<Chip text="⏳ Freigabe ausstehend" color={AM} bg="#FFFBEB"/>
            :<Chip text="Geplant ⏳" color={AM} bg="#FFFBEB"/>
          }
        </div>
      </div>
      <div style={{padding:"10px 14px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:13}}>{schicht.label}</div>
        </div>
      </div>

      {/* Bestätigung nach Absenden */}
      {sent&&<div style={{fontSize:13,color:GN,fontWeight:600,marginBottom:6}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>}

      {/* Ausstehende Anfrage: Begründung anzeigen */}
      {anfragePending&&(
        <div style={{fontSize:13,color:AM,background:"var(--surface)",borderRadius:6,padding:"6px 9px",border:`0.5px solid ${AM}40`}}>
          <span style={{fontWeight:700}}>Begründung:</span> <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em><br/>
          <span style={{color:"var(--sub)",marginTop:3,display:"block"}}>Wartet auf Freigabe durch Funktionär/Admin.</span>
        </div>
      )}

      {/* Aktionen (nur wenn keine Anfrage pending) */}
      {!anfragePending&&!sent&&(
        <div>
          {!showAnfrageForm&&!showTransfer&&(
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowTransfer(true)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:`0.5px solid #0891B2`,background:"var(--surface)",color:"#0891B2"}}>
                ⇄ Übertragen
              </button>
              <button onClick={()=>setShowAnfrageForm(true)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:`0.5px solid ${AM}`,background:"var(--surface)",color:AM}}>
                ↩ Freigabe anfragen
              </button>
            </div>
          )}

          {/* Freigabe-Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={begruendung}
                onChange={e=>setBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:FONT}}
              />
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleSenden} disabled={!begruendung.trim()} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:begruendung.trim()?"pointer":"default",border:"none",background:begruendung.trim()?AM:"#ccc",color:"#fff"}}>
                  Anfrage senden
                </button>
                <button onClick={()=>{setShowAnfrageForm(false);setBegruendung("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)"}}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"var(--surface)",border:`0.5px solid ${BL}`,borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:600,color:BL,marginBottom:6}}>Schicht übertragen an:</div>
              <select value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} style={{width:"100%",padding:"5px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,marginBottom:7}}>
                <option value="">- Person auswählen -</option>
                {ALLE_HELFER_NAMEN.filter(n=>n!==meinName).map(n=>(
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleÜbertragen} disabled={!transferTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:13,fontWeight:600,cursor:transferTarget?"pointer":"default",border:"none",background:transferTarget?"#0891B2":"#ccc",color:"#fff"}}>Übertragen</button>
                <button onClick={()=>{setShowTransfer(false);setTransferTarget("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:13,cursor:"pointer",border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12,marginBottom:16}}>
        <Stat label="Mitglieder" value={HELPERS.length}/>
        <Stat label="Soll erfüllt" value={mitgliederCalc.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length} color={GN}/>
        <Stat label="Noch offen" value={mitgliederCalc.filter(m=>m.status==="Offen").length} color={R}/>
        <Stat label="Offene Schichten" value={totalOffen} color={AM} sub={`von ${allSchichten.length} total`}/>
      </div>
      )}

      {/* Sub-Tabs */}
      <div style={{display:"flex",gap:4,background:"var(--surface2)",borderRadius:10,padding:3,marginBottom:18,width:"fit-content"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setHelperTab(t.key)} style={{padding:"8px 14px",border:"none",borderRadius:8,background:helperTab===t.key?"#fff":"transparent",color:helperTab===t.key?BK:"#999",fontWeight:helperTab===t.key?700:400,cursor:"pointer",fontSize:13,boxShadow:helperTab===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none",whiteSpace:"nowrap"}}>{t.label}</button>
        ))}
      </div>

      {/* -- TAB: BROWSE - alle Events auf einer Seite -- */}
      {/* Eltern: Anmelden als Switcher */}
      {elternPersonen&&(
        <div style={{display:"flex",gap:8,marginBottom:14,padding:"10px 12px",background:"var(--surface2)",borderRadius:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginRight:2}}>Anmelden als:</span>
          {elternPersonen.map((p,i)=>{
            const active=aktivePerson===p;
            return(
              <button key={i} onClick={()=>setAktivePerson(p)}
                style={{padding:"6px 14px",borderRadius:20,border:`0.5px solid ${active?ACCENT:GB}`,background:active?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:13,fontWeight:active?700:400,cursor:"pointer"}}>
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
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input
                value={browseSearch}
                onChange={e=>setBrowseSearch(e.target.value)}
                placeholder="Einsatz oder Schicht suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${browseSearch?ACCENT:GB}`,borderRadius:20,fontSize:13,outline:"none",width:"100%",maxWidth:210,background:"var(--surface)"}}
              />
              {browseSearch&&(
                <button onClick={()=>setBrowseSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--sub)",lineHeight:1}}>×</button>
              )}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            {/* Event-Filter als Dropdown */}
            <select value={selectedEvent||""} onChange={e=>setSelectedEvent(e.target.value?Number(e.target.value):null)}
              style={{padding:"5px 12px",border:`0.5px solid ${selectedEvent?ACCENT:GB}`,borderRadius:20,fontSize:13,color:"var(--text)",background:selectedEvent?"var(--cc-hover)":"#fff",cursor:"pointer",outline:"none",fontWeight:selectedEvent?700:400}}>
              <option value="">Alle Events</option>
              {HELPER_EVENTS.map(ev=>(
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <div style={{width:"1px",height:22,background:GB,margin:"0 2px"}}/>
            {/* Schichten-Filter */}
            <button onClick={()=>setFilterOffen(false)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${!filterOffen?ACCENT:GB}`,background:!filterOffen?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:13,cursor:"pointer",fontWeight:!filterOffen?700:400}}>Alle Schichten</button>
            <button onClick={()=>setFilterOffen(true)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${filterOffen?ACCENT:GB}`,background:filterOffen?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:13,cursor:"pointer",fontWeight:filterOffen?700:400}}>Nur offen</button>
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
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
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
                            <div style={{fontSize:13,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Einsätze */}
                  {!isCollapsed&&<div style={{background:"var(--surface)"}}>
                    {einsaetzeVisible.length===0?(
                      <div style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:13,background:"var(--surface2)"}}>Keine offenen Schichten in diesem Event.</div>
                    ):einsaetzeVisible.map((einsatz,ei)=>{
                      const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                      const eOffen=einsatz.schichten.length-eBelegt;
                      const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                      const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                      return(
                        <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                          {/* Einsatz-Zeile */}
                          <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",cursor:"pointer",userSelect:"none"}}>
                            <div style={{display:"flex",alignItems:"center",gap:12}}>
                              <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                              <div>
                                <div style={{fontWeight:700,fontSize:13,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:13,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                  {einsatz.name}
                                </div>
                                <div style={{fontSize:13,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
                                  <span>{""+einsatz.time+" Uhr"}</span>
                                  <span style={{color:"var(--border)"}}>{"|"}</span>
                                  <span>{""+einsatz.location}</span>
                                </div>
                                {bemerkungState[`e${einsatz.id}`]&&(
                                  <div style={{fontSize:13,color:AM,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
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
                                      <label key={g} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:13,padding:"5px 12px",borderRadius:20,background:checked?"var(--cc-hover)":"#fff",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                                        <input type="checkbox" checked={checked} onChange={()=>setGruppenState(prev=>{const cur=prev[einsatz.id]||einsatz.gruppen;return {...prev,[einsatz.id]:checked?cur.filter(x=>x!==g):[...cur,g]};})} style={{display:"none"}}/>
                                        {g}
                                      </label>
                                    );
                                  })}
                                  <button onClick={e=>{e.stopPropagation();setEditingGruppen(null);}} style={{padding:"5px 12px",borderRadius:20,fontSize:13,fontWeight:600,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,cursor:"pointer"}}>✓ Fertig</button>
                                </div>
                              ):(
                                <>
                                  {(gruppenState[einsatz.id]||einsatz.gruppen).map((g,gi)=><Chip key={gi} text={g} color="#6B7280" bg="#F3F4F6"/>)}
                                  {canEdit&&<button onClick={e=>{e.stopPropagation();setEditingGruppen(einsatz.id);}} style={{padding:"5px 12px",borderRadius:20,fontSize:13,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}><TI n="edit"/></button>}
                                </>
                              )}
                              {/* Bemerkung Edit */}
                              {canEdit&&(editingBemerkung===`e${einsatz.id}`?(
                                <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:8,alignItems:"center"}}>
                                  <input autoFocus value={bemerkungDraft} onChange={e=>setBemerkungDraft(e.target.value)}
                                    placeholder="Bemerkung…"
                                    style={{padding:"3px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,outline:"none",width:160}}/>
                                  <button onClick={()=>saveBemerkung(`e${einsatz.id}`,bemerkungDraft)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,fontWeight:600,border:`0.5px solid ${GN}`,background:"var(--surface)",color:GN,cursor:"pointer"}}>✓</button>
                                  <button onClick={()=>setEditingBemerkung(null)} style={{padding:"4px 10px",borderRadius:6,fontSize:13,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}>✕</button>
                                </div>
                              ):(
                                <button onClick={e=>{e.stopPropagation();setEditingBemerkung(`e${einsatz.id}`);setBemerkungDraft(bemerkungState[`e${einsatz.id}`]||"");}}
                                  style={{padding:"5px 12px",borderRadius:20,fontSize:13,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer"}}><TI n="edit"/></button>
                              ))}
                              {(()=>{
                                const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                const offenPlätze=totalPlätze-belegtPlätze;
                                return(
                                  <span style={{fontSize:13,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
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
                <br/><button onClick={()=>setBrowseSearch("")} style={{marginTop:10,padding:"5px 12px",borderRadius:20,border:"0.5px solid var(--border)",background:"var(--surface)",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>Suche zurücksetzen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- TAB: MEIN EINSATZ -- */}
      {helperTab==="mein"&&(
        <div>
          {/* Status-Kacheln */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
            {[{l:"Soll",v:mich.soll,c:BK,bg:"#fff"},{l:"Geleistet",v:mich.geleistet,c:GN,bg:"#F0FDF4"},{l:"Geplant",v:mich.geplant,c:AM,bg:"#FFFBEB"},{l:"Offen",v:mich.offen,c:mich.offen>0?R:"#aaa",bg:mich.offen>0?"#FEF2F2":"#fff"}].map((s,i)=>(
              <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Status-Banner */}
          <div style={{padding:"10px 16px",borderRadius:10,marginBottom:18,background:mich.status==="Erfüllt"?"#F0FDF4":mich.status==="Geplant erfüllt"?"#FFFBEB":mich.status==="Befreit"?"#F3F4F6":"#FEF2F2",border:`0.5px solid ${mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#ccc":R}`}}>
            <div style={{fontWeight:700,fontSize:13,color:mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#888":R}}>
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
                      <span style={{background:"var(--surface)",color:AM,fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #FDE68A`}}>⏳ Geplant</span>
                      <span style={{color:"var(--sub)",fontSize:13}}>{geplant.length+" Schicht"+(geplant.length!==1?"en":"")}</span>
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
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"var(--surface)",color:GN,fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #BBF7D0`}}>✓ Geleistet</span>
                      <span style={{color:"var(--sub)",fontSize:13}}>{geleistet.length+" Schicht"+(geleistet.length!==1?"en":"")}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {geleistet.map((s,i)=>(
                        <div key={i} style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:10,overflow:"hidden",borderTop:`4px solid ${s.eventColor||"#64748B"}`,opacity:0.85}}>
                          <div style={{padding:"14px 18px",background:"var(--surface)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:"var(--text)",letterSpacing:-0.2}}>{s.eventName}</div>
                              <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                <span>{s.einsatzName}</span>
                                {s.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzDate}</span></>}
                                {s.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzOrt}</span></>}
                              </div>
                            </div>
                            <span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN,flexShrink:0}}>✓ Geleistet</span>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            <div style={{fontWeight:600,fontSize:13}}>{s.label}</div>
                            <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>{""+s.einsatzDate+(s.einsatzOrt?" · "+s.einsatzOrt:"")}</div>
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
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:16,fontSize:13}}>
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
                        <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
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
                              <div style={{fontSize:13,color:"var(--sub)",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
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
                              <div style={{display:"flex",alignItems:"center",gap:12}}>
                                <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                                <div>
                                  <div style={{fontWeight:700,fontSize:13,color:"var(--text)",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:13,color:"var(--sub)",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                    {einsatz.name}
                                  </div>
                                  <div style={{fontSize:13,color:"var(--sub)",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
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
                                    <span style={{fontSize:13,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
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
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"var(--surface2)",border:"0.5px solid var(--border)",borderRadius:8,marginBottom:14,fontSize:13}}>
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
                {[{l:"Erfüllt",v:erfuellt,c:GN,bg:"#F0FDF4"},{l:"Offen",v:offen,c:AM,bg:"#FFFBEB"},{l:"Befreit",v:befreit,c:BK,bg:"#fff"}].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:"0.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                    <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Suche + Filter */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center",width:"100%",rowGap:6}}>
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--sub)",pointerEvents:"none"}}><TI n="search"/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mitglied suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${search?ACCENT:GB}`,borderRadius:20,fontSize:13,outline:"none",width:"100%",maxWidth:190,background:"var(--surface)"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--sub)",lineHeight:1}}>×</button>}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["alle","Offen","Geplant erfüllt","Erfüllt","Befreit"].map(f=>(
                <button key={f} onClick={()=>setFilterStatus(f)} style={{padding:"5px 12px",border:`0.5px solid ${filterStatus===f?ACCENT:GB}`,borderRadius:20,background:filterStatus===f?"var(--cc-hover)":"#fff",color:"var(--text)",fontSize:13,cursor:"pointer",fontWeight:filterStatus===f?700:400}}>{f==="alle"?"Alle":f}</button>
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
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Mitglied","Gruppe","Soll","Geleistet","Geplant","Offen","Status",""].map((h,i)=>(
                    <th key={i} style={{padding:"9px 12px",textAlign:i>1?"center":"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
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
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <Av name={m.name} size={22} bg={SC[m.status]?.c||"#6B7280"}/>
                          <span style={{fontWeight:600}}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{padding:"9px 12px"}}><Chip text={m.gruppe} color="#6B7280" bg="#F3F4F6"/></td>
                      <td style={{padding:"9px 12px",textAlign:"center",fontWeight:700}}>{m.soll}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:GN,fontWeight:600}}>{m.geleistet}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:AM,fontWeight:600}}>{m.geplant}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:m.offen>0?R:"#aaa",fontWeight:m.offen>0?700:400}}>{m.offen}</td>
                      <td style={{padding:"9px 12px",textAlign:"center"}}><Chip text={m.status} color={SC[m.status]?.c||"#888"} bg={SC[m.status]?.bg}/></td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:"var(--sub)",fontSize:13}}>{expandedMember===m.id?"▲":"▼"}</td>
                    </tr>
                    {expandedMember===m.id&&(
                      <tr key={`d${m.id}`} style={{borderTop:"0.5px solid var(--border)"}}>
                        <td colSpan={8} style={{padding:"10px 20px 14px",background:"var(--surface2)"}}>
                          {m.schichten.length===0?(
                            <span style={{fontSize:13,color:"var(--sub)"}}>Keine Schichten übernommen.</span>
                          ):(
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8,marginBottom:10}}>
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
                                      ?<span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:AM,border:`0.5px solid #FDE68A`}}>⏳ Freigabe ausstehend</span>
                                      :past
                                        ?<span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:GN}}>✓ Geleistet</span>
                                        :<span style={{fontSize:13,padding:"2px 4px",color:AM}}>⏳</span>;
                                    return(
                                      <div key={sid} style={{borderRadius:10,overflow:"hidden",border:`0.5px solid ${anfrage?AM:GB}`,background:anfrage?"#FFFBEB":"#fff",borderTop:`3px solid ${ev.color||"#64748B"}`}}>
                                        {/* Header */}
                                        <div style={{padding:"8px 12px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                          <div>
                                            <div style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{ev.name}</div>
                                            <div style={{fontSize:13,color:"var(--sub)",marginTop:1}}>{e.name}</div>
                                          </div>
                                          {statusBadge}
                                        </div>
                                        {/* Body */}
                                        <div style={{padding:"7px 12px"}}>
                                          <div style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>{s.label}</div>
                                          <div style={{fontSize:13,color:"var(--sub)",marginTop:2,display:"flex",gap:8}}>
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
            </table>
          </Card>
        </div>
      )}

      {/* -- TAB: ERSTELLEN -- */}
      {helperTab==="erstellen"&&canErstellen&&(
        <Card>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Neuen Einsatz erfassen</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
            {[
              {l:"Event",            type:"select",opts:["Grümpelturnier 2026","Generalversammlung 2026","+ Neuer Event…"]},
              {l:"Einsatzname",      type:"text",  ph:"z.B. Grill"},
              {l:"Datum",            type:"date"},
              {l:"Zeit",             type:"text",  ph:"10:00-14:00"},
              {l:"Ort",              type:"text",  ph:"z.B. Grillstand"},
              {l:"Freigabe Gruppen", type:"gruppen"},
            ].map((f,i)=>(
              <div key={i}>
                <label style={{fontSize:13,color:"var(--sub)",display:"block",marginBottom:4}}>{f.l}</label>
                {f.type==="gruppen"?(
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>
                    {HELPER_GRUPPEN.map(g=>{
                      const checked=newEinsatzGruppen.includes(g);
                      return(
                        <label key={g} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,padding:"3px 8px",borderRadius:20,background:checked?"var(--cc-hover)":"#F3F4F6",border:`0.5px solid ${checked?ACCENT:GB}`,fontWeight:checked?700:400}}>
                          <input type="checkbox" checked={checked} onChange={()=>setNewEinsatzGruppen(prev=>checked?prev.filter(x=>x!==g):[...prev,g])} style={{display:"none"}}/>
                          {g}
                        </label>
                      );
                    })}
                  </div>
                ):f.type==="select"?(
                  <select style={{width:"100%",padding:"7px 9px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13}}>
                    {f.opts?.map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <input type={f.type||"text"} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13,boxSizing:"border-box"}}/>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:16}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>Schichten</div>
            {[1,2,3].map(n=>(
              <div key={n} style={{display:"flex",gap:8,marginBottom:7,alignItems:"center"}}>
                <input placeholder={`Schicht ${n}: z.B. Grill 10:00-14:00`} style={{flex:1,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/>
                <input type="number" placeholder="Max" style={{width:55,padding:"6px 9px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/>
                <span style={{fontSize:13,color:"var(--sub)"}}>Plätze</span>
              </div>
            ))}
            <button style={{fontSize:13,color:BL,background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0}}>+ Schicht hinzufügen</button>
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

function BusesView({role,kannSchreiben,kannVerwalten}){
  const isMobile=useIsMobile();
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Bus</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}><option>Bus A (9-Plätzer)</option><option>Bus B (15-Plätzer)</option></select></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Datum</label><br/><input type="date" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Zeit</label><br/><input type="text" placeholder="09:00-14:00" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}/></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:13,color:"var(--sub)"}}>Zweck</label><br/><input type="text" placeholder="z.B. Auswärtsspiel vs. FC Küsnacht" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box"}}/></div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(false)}>Reservieren</Btn><Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn></div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginTop:14}}>
        {BUSES.map((bus,i)=>(
          <Card key={i}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,display:"flex",justifyContent:"space-between"}}>{bus.name}<Chip text={`${bus.reservations.length} Res.`} color={BL}/></div>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Art</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}>{["Bestellung","Ersatzmaterial","Tenüs","Mangel","Defekt","Verlust","Neue Anforderung"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{fontSize:13,color:"var(--sub)"}}>Team</label><br/><select style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13}}><option>Cc-Junioren</option><option>D-Junioren</option></select></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:13,color:"var(--sub)"}}>Beschreibung</label><br/><input type="text" placeholder="z.B. Neue Bälle Grösse 4" style={{width:"100%",padding:"6px 8px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:13,boxSizing:"border-box"}}/></div>
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
function TeamsAdminView({sb,dbTeams=[],setDbTeams,dbStufen=[],setDbStufen,setCustomBack}){
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
        <TeamView role="trainer" trainerTeams={[selectedTeam.name]} setActive={()=>{}} myRosterId={null} account={null} dbTeams={dbTeams}/>
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
                    <div key={j} title={`${a.team} · ${fmt(a.start)}-${fmt(a.end)}`} style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:j*(H+4)+4,height:H,background:a.color,borderRadius:4,padding:"3px 7px",overflow:"hidden",cursor:"help"}}>
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
              <div style={{display:"flex",gap:8,marginBottom:5,flexWrap:"wrap"}}>
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
          <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <Chip text={n.target} color={R}/>
            <Chip text={n.channel} color={BL} bg="#EFF6FF"/>
            <span style={{fontSize:13,color:"var(--sub)"}}>{n.date} · {n.author}</span>
          </div>
          <h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700}}>{n.title}</h3>
          <p style={{margin:0,fontSize:13,color:"var(--sub)",lineHeight:1.65}}>{n.content}</p>
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
function PlaetzeView(){
  const [plaetze, setPlaetze] = useState(TRAININGSPLAETZE_DEFAULT.map(p=>Object.assign({},p)));
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHaelften, setEditHaelften] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHaelften, setNewHaelften] = useState("");

  useEffect(function(){
    (async function(){
      try{
        const r=await window.storage.get("trainingsplaetze_custom");
        if(r) setPlaetze(JSON.parse(r.value));
      }catch(e){}
    })();
  },[]);

  function save(p){
    setPlaetze(p);
    window.storage.set("trainingsplaetze_custom", JSON.stringify(p));
    TRAININGSPLAETZE.length=0;
    p.forEach(function(x){ TRAININGSPLAETZE.push(x); });
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
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 4px"}}>Trainingsplätze</h1>
          <p style={{fontSize:13,color:"var(--sub)",margin:0}}>Plätze verwalten, Hälften konfigurieren, aktivieren/deaktivieren</p>
        </div>
        <button onClick={function(){setShowAdd(true);}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN}
          style={{padding:"10px 18px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          + Platz
        </button>
      </div>

      {/* Aktiv */}
      <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,paddingLeft:2}}>Aktive Plätze</div>
      <div style={{background:"var(--surface)",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        {plaetze.filter(function(p){return p.active;}).length===0&&(
          <div style={{padding:"16px",textAlign:"center",color:"var(--sub)",fontSize:13}}>Keine aktiven Plätze</div>
        )}
        {plaetze.map(function(p,i){
          if(!p.active) return null;
          return(
            <div key={p.id} style={{borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
              {editId===p.id ? (
                <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                  <input value={editName} onChange={function(e){setEditName(e.target.value);}} autoFocus
                    placeholder="Platzname"
                    style={{padding:"7px 10px",border:"1.5px solid "+BL,borderRadius:8,fontSize:13,outline:"none"}}/>
                  <div>
                    <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Hälften (kommagetrennt, z.B. <em>Hüttliseite, Rappiseite</em>)</div>
                    <input value={editHaelften} onChange={function(e){setEditHaelften(e.target.value);}}
                      placeholder="leer = keine Hälften"
                      style={{width:"100%",padding:"7px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={function(){handleRename(p.id);}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN}
                      style={{flex:1,padding:"10px 18px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer"}}>Speichern</button>
                    <button onClick={function(){setEditId(null);setEditName("");setEditHaelften("");}}
                      style={{padding:"8px 14px",borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                    <button onClick={function(){moveUp(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===0}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:4,background:"var(--surface)",cursor:"pointer",fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                    <button onClick={function(){moveDown(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===plaetze.filter(function(x){return x.active;}).length-1}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:4,background:"var(--surface)",cursor:"pointer",fontSize:13,color:"var(--sub)",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:GN,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:1}}>{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button onClick={function(){setEditId(p.id);setEditName(p.name);setEditHaelften((p.halfn||[]).join(", "));}} title="Bearbeiten"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="edit"/></button>
                    <button onClick={function(){handleToggle(p.id);}} title="Deaktivieren"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"var(--surface)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                    </button>
                    <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inaktiv */}
      {plaetze.some(function(p){return !p.active;})&&(
        <>
          <div style={{fontSize:13,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,paddingLeft:2}}>Inaktive Plätze</div>
          <div style={{background:"var(--surface)",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16,opacity:0.7}}>
            {plaetze.map(function(p,i){
              if(p.active) return null;
              return(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:"#ccc",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"var(--sub)"}}>{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div style={{fontSize:13,color:"var(--sub)"}}>{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <button onClick={function(){handleToggle(p.id);}} title="Aktivieren"
                    style={{padding:"5px 12px",borderRadius:20,border:"0.5px solid "+GN,background:"var(--surface)",color:GN,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    Aktivieren
                  </button>
                  <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                    style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="trash"/></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Neuer Platz */}
      {showAdd&&(
        <div style={{background:"var(--surface)",border:"1.5px solid "+BL,borderRadius:12,padding:"16px",display:"flex",flexDirection:"column",gap:12,marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:14}}>Neuer Platz</div>
          <input value={newName} onChange={function(e){setNewName(e.target.value);}} autoFocus
            placeholder="z.B. Platz Erlenbach"
            style={{padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none"}}/>
          <div>
            <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Hälften (optional, kommagetrennt)</div>
            <input value={newHaelften} onChange={function(e){setNewHaelften(e.target.value);}}
              placeholder="z.B. Nordseite, Südseite"
              style={{width:"100%",padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleAdd}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN}
              style={{flex:1,padding:"10px 18px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Hinzufügen
            </button>
            <button onClick={function(){setShowAdd(false);setNewName("");setNewHaelften("");}}
              style={{padding:"8px 14px",borderRadius:8,border:"0.5px solid "+GB,background:"var(--surface)",fontSize:13,cursor:"pointer"}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div style={{fontSize:13,color:"var(--sub)"}}>
        Inaktive Plätze erscheinen nicht in Dropdowns. Hälften mit Komma trennen.
      </div>
    </div>
  );
}

function DataCheckView(){
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Datenprüfung</h1>
      <InfoBox text="12 Mitglieder haben ihre Stammdaten seit über 6 Monaten nicht geprüft. Erinnerungen wurden versendet." color={AM}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,margin:"16px 0"}}>
        <Stat label="Prüfung fällig" value="12" color={AM}/>
        <Stat label="Unvollständig"  value="8"  color={R}/>
        <Stat label="Sync-Fehler"    value="5"  color="#888"/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {["Mitglied","Problem","Zuletzt geprüft","Aktion"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {n:"Anna Meier",   p:"Prüfung fällig",  d:"Nov 2024"},
              {n:"Sara Huber",   p:"Adresse unvollst.",d:"Jan 2026"},
              {n:"Sabine Koch",  p:"Sync-Fehler",      d:"Dez 2024"},
              {n:"Beat Keller",  p:"Prüfung fällig",   d:"Okt 2024"},
            ].map((r,i)=>(
              <tr key={i} style={{borderTop:"0.5px solid var(--border)"}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{r.n}</td>
                <td style={{padding:"9px 13px"}}><Chip text={r.p} color={r.p.includes("Sync")?R:AM} bg={r.p.includes("Sync")?RL:"#FFFBEB"}/></td>
                <td style={{padding:"9px 13px",color:"var(--sub)"}}>{r.d}</td>
                <td style={{padding:"9px 13px"}}><Btn small>Erinnerung</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}


/* ==========================================
   PROFIL MODAL
========================================== */
/* ── DARK MODE ROW (für ProfileModal) ── */
function DarkModeRow(){
  const {dark,toggle}=useTheme();
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{dark?"Dunkel":"Hell"}</div>
        <div style={{fontSize:13,color:"var(--sub)",marginTop:1}}>Farbschema des Portals</div>
      </div>
      <button onClick={toggle} style={{
        position:"relative",width:48,height:26,borderRadius:12,border:"none",
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

  const inputStyle={width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:8,
    fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",
    boxSizing:"border-box",outline:"none"};

  const StatusBox=({status,msg})=>status==="ok"?(
    <div style={{padding:"10px 14px",background:"var(--surface)",border:"1px solid "+GN,borderRadius:8,fontSize:13,color:GN,fontWeight:600,marginTop:4}}>{msg}</div>
  ):status==="error"?(
    <div style={{padding:"10px 14px",background:RL,border:"1px solid "+R,borderRadius:8,fontSize:13,color:R,fontWeight:600,marginTop:4}}>{msg}</div>
  ):null;

  return(
    <ModalOrSheet open={open} onClose={onClose} maxWidth={500}>
      {/* Header */}
      <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:ACCENT,display:"flex",alignItems:"center",
            justifyContent:"center",color:"var(--text)",fontWeight:800,fontSize:16,flexShrink:0}}>
            {initials}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)",letterSpacing:-0.2}}>{userName}</div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>{userEmail}</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",
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
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{userName}</span>
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
                      style={{flex:1,padding:"9px",borderRadius:8,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",
                        fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT,
                        opacity:nameStatus==="loading"?0.6:1}}>
                      {nameStatus==="loading"?"Speichern…":"Speichern"}
                    </button>
                    <button onClick={()=>{setEditName(false);setNameStatus(null);}}
                      style={{padding:"9px 16px",borderRadius:8,background:"var(--surface2)",
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
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)",textAlign:"right"}}>{userEmail}</span>
            </div>

            {/* Rolle */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>Rolle</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{getRole(role).label}</span>
            </div>

            {/* Mitglied */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0"}}>
              <span style={{fontSize:13,color:"var(--sub)",minWidth:90}}>Verein</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{getVereinsnameStatic()}</span>
            </div>

            {/* Rollen-Badge */}
            <div style={{marginTop:8,padding:14,background:getRole(role).bg||"var(--surface2)",borderRadius:10,border:`1px solid ${rc}30`}}>
              <div style={{fontSize:11,color:"var(--sub)",marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Portal-Zugriffsrolle</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:rc,flexShrink:0}}/>
                <span style={{fontSize:14,color:rc,fontWeight:700}}>{getRole(role).label}</span>
              </div>
              <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.5}}>{getRole(role).desc||""}</div>
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
          <form onSubmit={handlePwChange} style={{display:"flex",flexDirection:"column",gap:16}}>
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
              style={{padding:"12px 20px",borderRadius:10,background:BTN,color:BTN_TXT,border:"none",
                fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT,
                opacity:pwStatus==="loading"?0.6:1,transition:"background 0.15s, opacity 0.2s"}}>
              {pwStatus==="loading"?"Wird gespeichert…":"Passwort ändern"}
            </button>
            {!sb&&<div style={{fontSize:13,color:"var(--sub)",textAlign:"center",marginTop:4}}>Demo-Modus: Änderungen werden nicht gespeichert.</div>}
          </form>
        )}
      </div>
    </ModalOrSheet>
  );
}

/* ── Feld-Sichtbarkeit gemäss Rolle (revDSG) ──────────────────
   Bestimmt welche Felder in der Mitgliederliste sichtbar sind.
──────────────────────────────────────────────────────────── */
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

/* ── Dynamische Navigation für funktionaer/stufenleitung ─────
   Baut die Nav-Items aus den zugewiesenen Gruppen auf.
   Alle anderen Rollen nutzen NAV_BY_ROLE direkt.
──────────────────────────────────────────────────────────── */
const ALL_NAV_ITEMS=[
  {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
  {key:"members",            icon:"users",            label:"Mitglieder"},
  {key:"team",               icon:"ball-football",    label:"Meine Stufe"},
  {key:"training",           icon:"calendar",         label:"Trainingsplan"},
  {key:"schedule",           icon:"flag",             label:"Spielplan"},
  {key:"attendance_central", icon:"chart-bar",        label:"Anwesenheiten"},
  {key:"news",               icon:"news",             label:"News"},
  {key:"events",             icon:"calendar-event",   label:"Termine"},
  {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
  {key:"buses",              icon:"bus",              label:"Vereinsbusse"},
  {key:"material",           icon:"package",          label:"Material"},
  {key:"lockers",            icon:"door-exit",        label:"Garderoben"},
  {key:"media",              icon:"speakerphone",     label:"Medien & Berichte"},
  {key:"wiki",               icon:"book",             label:"Wiki"},
  {key:"docs",               icon:"file-text",        label:"Dokumente"},
  {key:"portal",             icon:"settings",         label:"Portalverwaltung"},
];

function getNavForRole(role, funktionen=[]){
  if(role!=="funktionaer") return NAV_BY_ROLE[role]||NAV_BY_ROLE.spieler;
  /* Vereinte Module aus allen zugewiesenen Funktionen (via Gruppe + override) */
  const allModule=new Set(["dashboard"]);
  funktionen.filter(f=>f?.aktiv!==false).forEach(f=>{
    const gruppe=f.portal_gruppen||f.gruppe||{};
    const baseModule=f.module_override?.length>0 ? f.module_override : (gruppe.module||[]);
    baseModule.forEach(m=>allModule.add(m));
  });
  return ALL_NAV_ITEMS.filter(n=>allModule.has(n.key));
}

/* Vereinte Teams aus allen Funktionen */
function getTeamsFromFunktionen(funktionen=[]){
  const all=new Set();
  funktionen.filter(f=>f?.aktiv!==false).forEach(f=>(f.teams||[]).forEach(t=>all.add(t)));
  return [...all];
}

/* Rückwärtskompatibilität */
function getTeamsFromGruppen(gruppen=[]){ return getTeamsFromFunktionen(gruppen); }

/* ==========================================
   APP ROOT
========================================== */
function MobileNav({role,active,setActive,account,sb,onNameUpdated,onLogout,effectiveNav}){
  const mobileNav=MOBILE_NAV_BY_ROLE[role]||{tabs:[],mehr:[]};
  const rc=getRole(role).color;
  const userName=account?.name||USER_ACCOUNTS[role]?.name||getRole(role)?.label||"U";
  const initials=userName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const [showProfile,setShowProfile]=useState(false);
  const [showMehr,setShowMehr]=useState(false);

  /* Nur sichtbare Module anzeigen (Modul-Filter aus effectiveNav) */
  const visKeys=new Set((effectiveNav||[]).map(n=>n.key));
  const tabs=mobileNav.tabs.filter(t=>visKeys.has(t.key)||t.key==="dashboard");
  const mehr=mobileNav.mehr.filter(t=>visKeys.has(t.key));

  /* Mehr-Tab ist aktiv wenn aktueller Bereich in mehr-Liste ist */
  const mehrActive=mehr.some(m=>m.key===active);

  return(
    <>
      {/* Mehr Bottom Sheet */}
      {showMehr&&(
        <div onClick={()=>setShowMehr(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:"8px 0 calc(env(safe-area-inset-bottom) + 8px)",maxHeight:"70vh",overflowY:"auto"}}>
            {/* Handle */}
            <div style={{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"4px auto 12px"}}/>
            <div style={{padding:"0 8px 4px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Weitere Module</div>
            {mehr.map(m=>(
              <button key={m.key} onClick={()=>{setActive(m.key);setShowMehr(false);}}
                style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"12px 16px",
                  background:active===m.key?ACCENT20:"none",border:"none",cursor:"pointer",
                  fontFamily:"inherit",textAlign:"left"}}>
                <div style={{width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
                  background:active===m.key?ACCENT:"var(--surface2)",flexShrink:0}}>
                  <TI n={m.icon||"circle"} size={19} style={{color:active===m.key?"#111":"var(--sub)"}}/>
                </div>
                <span style={{fontSize:14,fontWeight:active===m.key?600:400,color:active===m.key?"var(--text)":"var(--sub)"}}>{m.label}</span>
                {active===m.key&&<TI n="check" size={16} style={{color:ACCENT,marginLeft:"auto"}}/>}
              </button>
            ))}
            {/* Profil */}
            <div style={{margin:"8px 16px 0",paddingTop:12,borderTop:"0.5px solid var(--border)"}}>
              <button onClick={()=>{setShowProfile(true);setShowMehr(false);}}
                style={{display:"flex",alignItems:"center",gap:16,width:"100%",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:rc,display:"flex",alignItems:"center",
                  justifyContent:"center",color:rc===ACCENT?"#111":"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                  {initials}
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{userName}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{getRole(role)?.label||role}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--nav)",borderTop:"1px solid var(--nav-b)",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex"}}>
          {tabs.map(n=>{
            const isActive=active===n.key&&!mehrActive;
            return(
              <button key={n.key} onClick={()=>{setActive(n.key);setShowMehr(false);}} style={{
                flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                padding:"8px 0 5px",background:"none",border:"none",cursor:"pointer",
                minHeight:56,WebkitTapHighlightColor:"transparent",gap:4
              }}>
                <TI n={n.icon||"circle"} size={22} style={{color:isActive?"var(--nav-a)":"var(--nav-t)",transition:"color 0.15s"}}/>
                <span style={{fontSize:11,color:isActive?"var(--nav-a)":"var(--nav-t)",fontWeight:isActive?600:400,transition:"color 0.15s"}}>{n.label}</span>
              </button>
            );
          })}
          {/* Mehr-Button */}
          {mehr.length>0&&(
            <button onClick={()=>setShowMehr(v=>!v)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"8px 0 5px",background:"none",border:"none",cursor:"pointer",
              minHeight:56,WebkitTapHighlightColor:"transparent",gap:4
            }}>
              <TI n="dots" size={22} style={{color:mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)",transition:"color 0.15s"}}/>
              <span style={{fontSize:11,color:mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)",fontWeight:mehrActive||showMehr?600:400,transition:"color 0.15s"}}>Mehr</span>
            </button>
          )}
        </div>
      </nav>
      <ProfileModal open={showProfile} onClose={()=>setShowProfile(false)} account={account} role={role} sb={sb} onNameUpdated={onNameUpdated} onLogout={onLogout}/>
    </>
  );
}

/* ── LOGIN SCREEN ─────────────────────────────────────── */
function LoginScreen({onLogin, sb, appTheme}){
  const isMobile=useIsMobile();
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [resetSent,setResetSent]=useState(false);
  const [showReset,setShowReset]=useState(false);

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {data,error:err}=await sb.auth.signInWithPassword({email,password:pw});
      if(err) throw err;
      onLogin(data.session);
    }catch(err){
      setError(err.message==="Invalid login credentials"
        ?"E-Mail oder Passwort falsch."
        :err.message||"Fehler beim Einloggen.");
    }
    setLoading(false);
  }

  async function handleReset(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {error:err}=await sb.auth.resetPasswordForEmail(email,{
        redirectTo: window.location.origin
      });
      if(err) throw err;
      setResetSent(true);
    }catch(err){
      setError(err.message||"Fehler beim Senden.");
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,WebkitFontSmoothing:"antialiased",color:"var(--text)"}}>
      <div style={{width:"100%",maxWidth:400,padding:"0 20px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:"transparent",borderRadius:16,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,overflow:"hidden"}}><img src={appTheme?.logo||LOGO_B64} style={{width:64,height:64,objectFit:"cover",display:"block"}} alt="Logo"/></div>
          <div style={{fontWeight:800,fontSize:21,color:"var(--text)",marginTop:4}}>{appTheme?.vereinsname||getVereinsnameStatic()}</div>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3,fontWeight:600}}>{"ClubCampus"}</div>
        </div>

        <div style={{background:"var(--surface)",borderRadius:16,padding:28,boxShadow:"var(--card-shadow)",border:"1px solid var(--border)"}}>
          {!showReset ? (
            <>
              <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:20}}>Anmelden</div>
              <form onSubmit={handleLogin}>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:5}}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                    placeholder="name@mail.ch" autoComplete="email"/>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:5}}>Passwort</label>
                  <div style={{position:"relative"}}>
                    <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} required
                      style={{width:"100%",padding:"10px 40px 10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                      placeholder="••••••••" autoComplete="current-password"/>
                    <button type="button" onClick={()=>setShowPw(p=>!p)}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--sub)",padding:4,display:"flex",alignItems:"center"}}>
                      <TI n={showPw?"eye-off":"eye"} size={16}/>
                    </button>
                  </div>
                </div>
                {error&&<div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird angemeldet…":"Anmelden"}
                </button>
              </form>
              <button onClick={()=>{setShowReset(true);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:13,cursor:"pointer",textAlign:"center"}}>
                Passwort vergessen?
              </button>
            </>
          ) : (
            <>
              <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:6}}>Passwort zurücksetzen</div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:20}}>Wir senden dir einen Link per E-Mail.</div>
              {resetSent ? (
                <div style={{fontSize:13,color:GN,background:"var(--surface)",padding:"12px",borderRadius:8,textAlign:"center"}}>
                  E-Mail gesendet! Bitte prüfe dein Postfach.
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:13,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:5}}>E-Mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                      placeholder="name@mail.ch"/>
                  </div>
                  {error&&<div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                  <button type="submit" disabled={loading}
                    style={{width:"100%",padding:"8px 14px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    {loading?"Wird gesendet…":"Link senden"}
                  </button>
                </form>
              )}
              <button onClick={()=>{setShowReset(false);setResetSent(false);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:13,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NachrichtenModul — Broadcast & Diskussions-Modul
   ══════════════════════════════════════════════════════════════════ */
/* NachrichtenModul via ./NachrichtenModul.jsx */

function Portal({supabaseClient}){
  const sbRef = useRef(supabaseClient||supabase||null);
  const sb = sbRef.current;
  const [session,setSession]=useState(sb ? undefined : null);
  const [dbUser,setDbUser]=useState(null);
  const [dbTeams,setDbTeams]=useState([]);
  const [dbStufen,setDbStufen]=useState([]);
  const [dbMitglieder,setDbMitglieder]=useState([]);
  const [dbFunktionen,setDbFunktionen]=useState([]); // portal_funktionen des eingeloggten Benutzers
  /* Globale Modul-Konfiguration (aus Portalverwaltung) */
  const [moduleAktiv,setModuleAktiv]=useState(()=>{
    try{const s=localStorage.getItem("cc-module-aktiv");return s?JSON.parse(s):{};}catch{return {};}
  });
  const [moduleRechte,setModuleRechte]=useState(()=>{
    try{const s=localStorage.getItem("cc-module-rechte");return s?JSON.parse(s):null;}catch{return null;}
  });
  const [accountKey,setAccountKey]=useState("trainer");
  const [activeSubRole,setActiveSubRole]=useState(null);
  const [active,setActive]=useState(()=>{
    try{
      const hash=window.location.hash.replace("#","");
      if(hash) return hash;
      return sessionStorage.getItem("cc-active")||"dashboard";
    }catch{return "dashboard";}
  });
  const setActivePersist=(key)=>{
    try{
      sessionStorage.setItem("cc-active",key);
      window.history.pushState({page:key},"","#"+key);
    }catch{}
    setActive(key);
    setCustomBack(null);
  };
  const {isMobile,isTablet}=useBreakpoint();
  const [mobileProfileOpen,setMobileProfileOpen]=useState(false);
  const [customBack,setCustomBack]=useState(null);
  const customBackRef=useRef(null);
  const setCustomBackAndRef=(fn)=>{customBackRef.current=fn||null;setCustomBack(fn);};

  /* Browser Zurück/Vor via popstate */
  useEffect(()=>{
    const onPop=(e)=>{
      /* Sub-Navigation offen (z.B. Team-Detail): zurück zur Übersicht */
      if(customBackRef.current){
        customBackRef.current();
        customBackRef.current=null;
        setCustomBack(null);
        return;
      }
      const key=e.state?.page||(window.location.hash.replace("#","")||"dashboard");
      setActive(key);
      try{sessionStorage.setItem("cc-active",key);}catch{}
    };
    window.addEventListener("popstate",onPop);
    /* Initialen Hash-State setzen damit der erste Zurück-Schritt funktioniert */
    try{
      const cur=window.location.hash.replace("#","")||"dashboard";
      if(!window.history.state?.page){
        window.history.replaceState({page:cur},"","#"+cur);
      }
    }catch{}
    return()=>window.removeEventListener("popstate",onPop);
  },[]);
  /* ── Dark Mode ── */
  const [dark,setDark]=useState(()=>{
    try{const s=localStorage.getItem("cc-dark");return s?JSON.parse(s):window.matchMedia("(prefers-color-scheme: dark)").matches;}catch{return false;}
  });
  const toggleDark=()=>setDark(d=>{const n=!d;try{localStorage.setItem("cc-dark",n);}catch{}return n;});

  /* ── App-Level Theme State ── */
  const [appTheme,setAppTheme]=useState(()=>{
    try{const s=localStorage.getItem("cc-theme");return s?{...THEME_DEFAULT_STATIC,...JSON.parse(s)}:THEME_DEFAULT_STATIC;}catch{return THEME_DEFAULT_STATIC;}
  });

  /* ── Tenant State ── */
  const [tenant,setTenant]=useState(null); // {slug, name, theme}

  /* Tenant aus Supabase laden */
  async function loadTenant(){
    if(!sb) return;
    try{
      /* Theme aus vereine laden - kein Login nötig (public read) */
      const{data,error}=await sb.from("vereine").select("id,name,theme").single();
      if(error||!data) return;
      setTenant(data);
      const t={...THEME_DEFAULT_STATIC,...(data.theme||{})};
      setAppTheme(t);
      applyThemeCss(t);
      /* localStorage aktualisieren */
      try{localStorage.setItem("cc-theme",JSON.stringify(t));}catch{}
    }catch(e){console.warn("[CC] loadTenant:",e.message);}
  }

  /* ── Inter Font + PWA Globals ── */
  useEffect(()=>{
    if(!document.getElementById("inter-font")){
      const l=document.createElement("link");l.id="inter-font";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    if(!document.getElementById("cc-pwa-css")){
      const s=document.createElement("style");s.id="cc-pwa-css";s.textContent=PWA_CSS;
      document.head.appendChild(s);
    }
    let m=document.querySelector("meta[name=viewport]");
    if(!m){m=document.createElement("meta");m.name="viewport";document.head.appendChild(m);}
    m.content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=yes";
    /* PWA Standalone – Adressleiste ausblenden */
    const setMeta=(n,v)=>{let t=document.querySelector(`meta[name="${n}"]`);if(!t){t=document.createElement("meta");t.name=n;document.head.appendChild(t);}t.content=v;};
    setMeta("apple-mobile-web-app-capable","yes");
    setMeta("apple-mobile-web-app-status-bar-style","black-translucent");
    setMeta("mobile-web-app-capable","yes");
    setMeta("apple-mobile-web-app-title",appTheme?.vereinsname||getVereinsnameStatic());
    /* manifest.json link – falls noch nicht vorhanden */
    if(!document.querySelector("link[rel=manifest]")){
      const lm=document.createElement("link");lm.rel="manifest";lm.href="/manifest.json";
      document.head.appendChild(lm);
    }
    let th=document.querySelector("meta[name=theme-color]");
    if(!th){th=document.createElement("meta");th.name="theme-color";document.head.appendChild(th);}
    th.content=dark?"#0a0a0c":"#141414";
  },[dark]);

  /* Theme beim Start laden - erst localStorage, dann Supabase */
  useEffect(()=>{
    /* 1. Sofort localStorage anwenden (schnell, kein Flicker) */
    try{
      const s=localStorage.getItem("cc-theme");
      if(s) applyThemeCss({...THEME_DEFAULT_STATIC,...JSON.parse(s)});
      else applyThemeCss(THEME_DEFAULT_STATIC);
    }catch{
      applyThemeCss(THEME_DEFAULT_STATIC);
    }
    /* 2. Supabase laden (überschreibt localStorage mit aktuellen Werten) */
    loadTenant();
  },[]);

  // Auth-Session beim Start prüfen
  useEffect(()=>{
    if(!sb){ setSession(null); return; }
    sb.auth.getSession().then(({data:{session}})=>{
      setSession(session||null);
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadDbFunktionen(session?.user?.id); loadModuleConfig(); loadTheme(); }
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange(function(_,session){
      setSession(session||null);
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadTheme(); }
      else setDbUser(null);
    });

    /* Realtime: Theme-Änderungen sofort übernehmen */
    let themeSub=null;
    try{
      themeSub=sb.channel("theme-changes")
        .on("postgres_changes",{event:"UPDATE",schema:"public",table:"vereine"},
          payload=>{
            const t={...THEME_DEFAULT_STATIC,...(payload.new?.theme||{})};
            setAppTheme(t);
            applyThemeCss(t);
            try{localStorage.setItem("cc-theme",JSON.stringify(t));}catch{}
          })
        .subscribe();
    }catch{}

    return function(){ subscription.unsubscribe(); if(themeSub) sb.removeChannel(themeSub); };
  },[]);

  async function loadDbUser(uid, email){
    try {
      const {data, error} = await sb.from("benutzer").select("*").eq("id",uid).single();
      if(data){
        setDbUser(data);
      } else {
        console.warn("[FCH] benutzer nicht gefunden:", error?.message);
        setDbUser({id:uid, email:email||"", role:"administrator", teams:[], name:email||"Benutzer"});
      }
    } catch(e) {
      console.warn("[FCH] loadDbUser error:", e.message);
      setDbUser({id:uid, email:email||"", role:"administrator", teams:[], name:email||"Benutzer"});
    }
  }

  async function loadDbTeams(){
    if(!sb) return;
    try{
      const{data}=await sb.from("teams").select("*, team_module(modul,aktiv)").eq("aktiv",true).order("hauptbereich").order("name");
      if(data&&data.length>0) setDbTeams(data.map(t=>({
        ...t,
        module_aktiv:(t.team_module||[]).filter(m=>m.aktiv).map(m=>m.modul)
      })));
    }catch(e){ console.warn("[FCH] loadDbTeams:", e.message); }
  }

  /* ── Theme aus Supabase laden ── */
  async function loadTheme(){
    if(!sb) return;
    try{
      const{data,error}=await sb.from("vereine").select("theme").single();
      if(error||!data) return;
      const saved=data.theme||{};
      const t={...THEME_DEFAULT_STATIC,...saved};
      setAppTheme(t);
      applyThemeCss(t);
      try{localStorage.setItem("cc-theme",JSON.stringify(t));}catch{}
    }catch(e){
      console.warn("[CC] loadTheme:",e.message);
    }
  }

  function applyThemeCss(t){
    /* Inject style tag to override [data-theme] CSS rules */
    let s=document.getElementById("cc-theme-vars");
    if(!s){s=document.createElement("style");s.id="cc-theme-vars";document.head.appendChild(s);}
    const nav=t.navBg||"#000000";
    const navT=t.navText||"#FFFFFF";
    const navA=t.navAccent||t.vereinsfarbe1||"#FFBF00";
    const navAT=t.navAccentText||t.vereinsfarbe2||"#000000";
    const avBg=t.avatarBg||t.vereinsfarbe1||"#FFBF00";
    const avTxt=t.avatarText||t.vereinsfarbe2||"#000000";
    const navH=t.navHover||"#1A1A1A";
    const acc=t.vereinsfarbe1||"#FFBF00";
    const acc2=t.vereinsfarbe2||"#000000";
    const btn=t.btnPrimary||"#FFBF00";
    const btnT=t.btnPrimaryText||"#000000";
    const btnHov=darkenHex(t.btnPrimary||"#FFBF00");
    s.textContent=`:root,[data-theme],[data-theme=dark],[data-theme=light]{
      --cc-accent:${acc}!important;
      --cc-accent2:${acc2}!important;
      --cc-hover:${hexToRgba(acc,0.19)}!important;
      --cc-accent-20:${hexToRgba(acc,0.12)}!important;
      --cc-accent-15:${hexToRgba(acc,0.09)}!important;
      --cc-accent-12:${hexToRgba(acc,0.07)}!important;
      --nav:${nav}!important;
      --nav-t:${navT}!important;
      --nav-a:${navA}!important;
      --nav-accent-text:${navAT}!important;
      --avatar-bg:${avBg}!important;
      --avatar-text:${avTxt}!important;
      --nav-b:color-mix(in srgb,${nav} 80%,white 20%)!important;
      --nav-hover:${navH}!important;
      --btn-primary:${btn}!important;
      --btn-primary-text:${btnT}!important;
      --btn-hover:${btnHov}!important;
    }
    .cc-btn-primary:hover{background:var(--btn-hover)!important;transition:background 0.15s;}`;
  }

  async function loadModuleConfig(){
    if(!sb) return;
    try{
      const[mcR,mrR]=await Promise.all([
        sb.from("module_config").select("modul,aktiv"),
        sb.from("modul_rechte").select("modul,rolle,hat_zugriff,stufe"),
      ]);
      if(mcR.data&&mcR.data.length>0){
        const ma={};
        mcR.data.forEach(r=>{ma[r.modul]=r.aktiv!==false;});
        setModuleAktiv(ma);
        try{localStorage.setItem("cc-module-aktiv",JSON.stringify(ma));}catch{}
      }
      if(mrR.data&&mrR.data.length>0){
        const mr={};
        mrR.data.forEach(r=>{
          if(!mr[r.rolle]) mr[r.rolle]=[];
          if(r.hat_zugriff) mr[r.rolle].push(r.modul);
        });
        setModuleRechte(mr);
        try{localStorage.setItem("cc-module-rechte",JSON.stringify(mr));}catch{}
      }
    }catch(e){ console.warn("[FCH] loadModuleConfig:", e.message); }
  }

  async function loadDbStufen(){
    if(!sb) return;
    try{
      const{data}=await sb.from("team_stufen").select("*").order("ebene").order("sortorder");
      if(data&&data.length>0) setDbStufen(data);
    }catch(e){ console.warn("[FCH] loadDbStufen:", e.message); }
  }

  async function loadDbFunktionen(uid){
    if(!sb||!uid) return;
    try{
      const{data}=await sb.from("benutzer_funktionen")
        .select("funktion_id, portal_funktionen(*, portal_gruppen(*))")
        .eq("benutzer_id",uid);
      if(data) setDbFunktionen(data.map(d=>d.portal_funktionen).filter(Boolean));
    }catch(e){ console.warn("[FCH] loadDbFunktionen:", e.message); }
  }

  async function loadDbMitglieder(){
    if(!sb) return;
    try{
      const{data}=await sb.from("mitglieder").select("*").eq("aktiv",true).order("nachname").order("vorname");
      if(data&&data.length>0) setDbMitglieder(data);
    }catch(e){ console.warn("[FCH] loadDbMitglieder:", e.message); }
  }

  async function handleLogout(){
    if(sb) await sb.auth.signOut();
    setSession(null); setDbUser(null); setActive("dashboard");
  }

  // Lade-Screen (initial oder während dbUser lädt nach Login)
  if(session===undefined){
    return(
      <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:16,overflow:"hidden",display:"inline-flex",marginBottom:12}}>
            <img src={appTheme?.logo||LOGO_B64} style={{width:64,height:64,objectFit:"cover"}} alt="Logo"/>
          </div>
          <div style={{fontSize:13,color:"var(--sub)"}}>Wird geladen…</div>
        </div>
      </div>
    );
  }

  // Login-Screen wenn nicht eingeloggt (oder kein Supabase)
  if(sb && !session){
    return <LoginScreen sb={sb} onLogin={s=>setSession(s)} appTheme={appTheme}/>;
  }

  // Rolle aus DB-User oder Demo-Fallback
  const effectiveAccountKey = dbUser ? "db_user" : accountKey;
  const dbAccount = dbUser ? {
    name: dbUser.name||dbUser.email||"Benutzer",
    rollen: [dbUser.role||"spieler"],
    primaryRole: dbUser.role||"spieler",
    kinder: [],
    teams: dbUser.teams||[],
    email: dbUser.email||"",
  } : null;

  const account = dbAccount || USER_ACCOUNTS[accountKey] || USER_ACCOUNTS.trainer;
  const rawRole = activeSubRole || account.primaryRole || "spieler";
  const role = rawRole.toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue");
  const kinder = account.kinder||[];
  const spielerTeam = account.teams?.length>0 ? account.teams : [];
  const trainerTeams = account.teams||["Cc-Junioren"];
  const meineTeams = role==="trainer"
    ? trainerTeams
    : kinder.length>0 ? [...new Set(kinder.map(k=>k.team))]
    : spielerTeam.length>0 ? spielerTeam : ["Cc-Junioren"];
  const myRosterId = account.rosterId||(role==="spieler"?1:role==="eltern"?1:role==="trainer"?200:null);
  /* Dynamische Navigation (funktionaer/stufenleitung aus Gruppen) */
  /* Modul-Sichtbarkeit prüfen: global + pro Rolle */
  const isModuleVisible=(key)=>{
    if(key==="dashboard") return true;
    if(role==="administrator") return true; // Admin sieht immer alles
    if(moduleAktiv[key]===false) return false; // global deaktiviert
    /* Nur blocken wenn Rolle explizit konfiguriert UND mehr als 3 Module hat
       (verhindert dass neue Module geblockt werden weil localStorage alt ist) */
    if(moduleRechte&&moduleRechte[role]!==undefined&&moduleRechte[role].length>3&&!moduleRechte[role].includes(key)) return false;
    return true;
  };

  const effectiveNav = getNavForRole(role, dbFunktionen)
    .filter(n=>isModuleVisible(n.key));

  /* ── App-Level Zugriffstufen-Hilfsfunktionen ── */
  const APP_ZUGRIFF_DEFAULT={
    administrator:  {_all:"verwalten"},
    vorstand:       {_all:"lesen"},
    administration: {_all:"verwalten",dashboard:"lesen"},
    funktionaer:    {_all:"lesen"},
    trainer:        {_all:"lesen",team:"verwalten",training:"verwalten",events:"verwalten",attendance_central:"schreiben",helpers:"verwalten",buses:"schreiben",material:"schreiben",media:"schreiben",wiki:"schreiben",members:"schreiben",schedule:"lesen"},
    spieler:        {_all:"lesen",events:"schreiben",helpers:"schreiben",buses:"schreiben"},
    eltern:         {_all:"lesen",events:"schreiben",helpers:"schreiben",schedule:"lesen"},
  };

  function getZugriff(modulKey){
    /* Funktionäre: Stufe via Gruppen & Funktionen */
    if(role==="funktionaer"){
      return getEffektiveStufeForFunktionaer(dbFunktionen, modulKey);
    }
    const effR=moduleRechte||{};
    const hatZugriff=effR[role]?effR[role].includes(modulKey):(APP_ZUGRIFF_DEFAULT[role]?.[modulKey]||APP_ZUGRIFF_DEFAULT[role]?._all||"lesen")!=="none";
    if(!hatZugriff) return null;
    const zs=typeof zugriffStufen!=="undefined"?zugriffStufen:null;
    return zs?.[role]?.[modulKey]||APP_ZUGRIFF_DEFAULT[role]?.[modulKey]||APP_ZUGRIFF_DEFAULT[role]?._all||"lesen";
  }

  const kannLesen   =(mod)=>!!getZugriff(mod);
  const kannSchreiben=(mod)=>["schreiben","verwalten"].includes(getZugriff(mod));
  const kannVerwalten=(mod)=>getZugriff(mod)==="verwalten";

  const handleAccountChange=(key)=>{
    setAccountKey(key);
    setActiveSubRole(null);
    setActive("dashboard");
  };

  const getView=()=>{
    if(!isModuleVisible(active)) return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
    switch(active){
      case "dashboard":         return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
      case "team":              return role==="administrator"||role==="administration"?<TeamsAdminView sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef}/>:<TeamView role={role} trainerTeams={trainerTeams} setActive={setActive} myRosterId={myRosterId} account={account} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder}/>;
      case "members":           return <MembersView role={role} dbMitglieder={dbMitglieder} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "users":             return <PortalverwaltungView initialTab="users" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "portal":            return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "training":          return <TrainingGantt role={role} team={role==="trainer"?meineTeams?.[0]:undefined} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb}/>;
      case "schedule":          return <SpielplanModul role={role}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:13,color:"var(--sub)",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><TermineModul role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} onNavigateToSpiel={(spiel)=>{NAV_TARGET.tab="spielplan";NAV_TARGET.selectedSpiel=spiel;setActive("team");}}/></div>;
      case "helpers":           return <HelpersList role={role} meineTeams={meineTeams} account={account} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "buses":             return <BusesView role={role} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "material":          return <MaterialView/>;
      case "lockers":           return <LockersView/>;
      case "media":             return <MediaView/>;
      case "nachrichten":       return <NachrichtenModul sb={sb} role={role} account={account} dbTeams={dbTeams} gruppen={dbFunktionen.map(f=>f.portal_gruppen).filter(Boolean)} kannSchreiben={kannSchreiben("nachrichten")} kannVerwalten={kannVerwalten("nachrichten")}/>;
      case "news":              return <NewsView role={role} meineTeams={meineTeams}/>;
      case "wiki":              return <WikiView/>;
      case "docs":              return <DocsView/>;
      case "exports":           return <PortalverwaltungView initialTab="api" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "sync":              return <PortalverwaltungView initialTab="api" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "audit":             return <PortalverwaltungView initialTab="audit" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "datacheck":         return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "profile":           return <ProfileView role={role} myRosterId={myRosterId} account={account}/>;
      default:                  return <Dashboard role={role} setActive={setActive}/>;
    }
  };

  return(
    <ThemeCtx.Provider value={{dark,toggle:toggleDark}}>
      <div data-theme={dark?"dark":"light"} style={{display:"flex",minHeight:"100dvh",background:"var(--bg)",fontFamily:FONT,WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",color:"var(--text)",transition:"background 0.25s,color 0.25s"}}>
        {!isMobile&&<SideNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} appTheme={appTheme}/>}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {isMobile&&<TopBar role={role} active={active} setActive={setActivePersist}
            account={account} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole}
            onRoleChange={(key)=>handleAccountChange(key)} isMobile={isMobile}
            onLogout={sb&&session ? handleLogout : undefined}
            onOpenProfile={()=>setMobileProfileOpen(true)}
            onBack={customBack} appTheme={appTheme}/>}
          <main key={active} className="cc-page" style={{flex:1,padding:isMobile?"16px 14px calc(90px + env(safe-area-inset-bottom, 0px))":isTablet?"20px 24px 28px":"32px 36px 32px",overflowY:"auto",overflowX:"hidden",maxWidth:isMobile?"100%":1200,margin:"0 auto",width:"100%"}}>{getView()}</main>
          {isMobile&&<MobileNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} effectiveNav={effectiveNav}/>}
        </div>
      </div>
      {isMobile&&<ProfileModal open={mobileProfileOpen} onClose={()=>setMobileProfileOpen(false)} account={account} role={role} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined}/>}
    </ThemeCtx.Provider>
  );
}

export default Portal;
