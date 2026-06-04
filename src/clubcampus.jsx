import { useState, useEffect, useRef, createContext, useContext } from "react";
import { FONT, BP_MOBILE, BP_TABLET, BTN_COLOR as BTN, BTN_TXT, BTN_HOV, ACCENT, ACCENT2, ACCENT20, ACCENT15, ACCENT12, GN, R, RL, BL, AM, BK, GR, GB } from "./constants";
import { TI, TI_PATHS } from "./icons.jsx";
import { ROSTER, USER_ACCOUNTS, SCHEDULE, TABLES, ATT_EVENTS, ATT_INITIAL, ATT_LOG, GANTT, TRAININGSPLAETZE_DEFAULT, EVENTS, POLLS, HELPER_GRUPPEN, HELPER_EVENTS, HELPERS, BUSES, MATERIAL, LOCKERS, MEDIA, MEMBERS, WIKI, NEWS, PSTATS, INITIAL_PLAENE, FUNKTIONEN, MITGLIEDTYPEN } from "./demoData.js";
import { LOGO_B64, ThemeCtx, useTheme, PWA_CSS, hexToRgba, darkenHex, THEME_DEFAULT_STATIC, useBreakpoint, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, Av } from "./theme.jsx";
import NachrichtenModul from "./NachrichtenModul.jsx";
import { TeamModuleMatrix, PortalverwaltungView } from "./PortalverwaltungModul.jsx";
import { SlotModal, SpielDetail, TermineModul, SpielplanModul, TableTab } from "./TermineModul.jsx";
import HelferModul from "./HelferModul.jsx";
import { TrainingsplanModul, PlaetzeView } from "./TrainingsplanModul.jsx";
import TeamsVerwaltungModul from "./TeamsVerwaltungModul.jsx";
import MitgliederModul from "./MitgliederModul.jsx";
import KaderModul from "./KaderModul.jsx";

/* -- SUPABASE wird als Prop von App.jsx übergeben (kein Import hier) -- */

/* -- Farben & Konstanten via ./constants.js -- */

/* ── TEAM-HIERARCHIE (Baumstruktur) ── */
/* TEAM_HIERARCHY via ./TeamsVerwaltungModul.jsx */

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
/* SkelCard via ./TeamsVerwaltungModul.jsx */

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
/* PersonPicker via ./TeamsVerwaltungModul.jsx */

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
/* FIELD_VIS via ./KaderModul.jsx */

/* -- DATA -- */

/* -- BENUTZERKONTEN mit Mehrfach-Rollen (Szenario 2 + 3) -- */


const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};
(async()=>{
  try{
    const res=await window.storage.get("rueckennrn");
    if(res){const d=JSON.parse(res.value);Object.assign(NR_CACHE.data,d);}
  }catch(e){}
})();
function getNr(id){return NR_CACHE.data[id]||"";}


const TABLE=TABLES["Cc-Junioren"]




/* -- TRAININGSPLÄTZE -- */

const TRAININGSPLAETZE = TRAININGSPLAETZE_DEFAULT.slice();














/* Av via ./theme.jsx */

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
function TeamView({role,trainerTeams=["Cc-Junioren"],setActive,myRosterId,account,dbTeams=[],isModuleVisible,dbMitglieder=[],sb=null}){
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
  ];
  const TABS_LIMITED=[
    {key:"overview",  label:"Übersicht",    short:"Übersicht", icon:"layout-dashboard"},
    {key:"roster",    label:"Kader",        short:"Kader",     icon:"users",            modul:"roster",   teamOnly:true},
    {key:"attendance",label:"Termine",      short:"Termine",   icon:"calendar",         modul:"events"},
    {key:"spielplan", label:"Spielplan & Tabelle",short:"Spiele",icon:"flag",           modul:"spielplan",teamOnly:true},
    {key:"polls",     label:"Abstimmungen", short:"Polls",     icon:"speakerphone",     modul:"polls",    teamOnly:true},
    {key:"helpers",   label:"Helfereinsätze",short:"Helfer",   icon:"heart-handshake",  modul:"helpers"},
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
      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:hasMultiTeams?10:isMobile?14:18}}>
        <div style={{width:6,height:isMobile?36:44,borderRadius:3,background:ACCENT,flexShrink:0,marginTop:2}}/>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontSize:isMobile?17:21,fontWeight:800,margin:0,letterSpacing:-0.3,whiteSpace:isMobile?"nowrap":"normal",overflow:"hidden",textOverflow:"ellipsis"}}>
            {isEltern?`${kinderNames}${activeKind?.team?" · "+activeKind.team:""}`:`${activeTeam}`}
          </h1>
          <p style={{color:"var(--sub)",margin:"2px 0 0",fontSize:12,display:"flex",flexWrap:"wrap",gap:"0 8px"}}>
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
                style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:10,
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
          <div style={{display:"flex",gap:6,padding:"10px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
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
                      style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 16px",
                        background:tab===t.key?ACCENT12:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                      <div style={{width:40,height:40,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",
                        background:tab===t.key?ACCENT:"var(--surface2)",flexShrink:0}}>
                        <TI n={t.icon||"circle"} size={19} style={{color:tab===t.key?"#111":"var(--sub)"}}/>
                      </div>
                      <span style={{fontSize:15,fontWeight:tab===t.key?600:400,color:tab===t.key?"var(--text)":"var(--sub)"}}>{t.label}</span>
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
                      gap:3,background:"none",border:"none",cursor:"pointer",
                      borderBottom:isActive?`2.5px solid ${ACCENT}`:"2.5px solid transparent",
                      fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                    <TI n={t.icon||"circle"} size={20} style={{color:isActive?ACCENT:"var(--sub)"}}/>
                    <span style={{fontSize:10,color:isActive?ACCENT:"var(--sub)",fontWeight:isActive?700:400}}>{t.short||t.label}</span>
                  </button>
                );
              })}
              {mehrTabs.length>0&&(
                <button onClick={()=>setShowMehrTab(v=>!v)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px 6px",
                    gap:3,background:"none",border:"none",cursor:"pointer",
                    borderBottom:mehrActive||showMehrTab?`2.5px solid ${ACCENT}`:"2.5px solid transparent",
                    fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                  <TI n="dots" size={20} style={{color:mehrActive||showMehrTab?ACCENT:"var(--sub)"}}/>
                  <span style={{fontSize:10,color:mehrActive||showMehrTab?ACCENT:"var(--sub)",fontWeight:mehrActive||showMehrTab?700:400}}>Mehr</span>
                </button>
              )}
            </div>
          </>
        );
      })():(
        <Tabs tabs={tabs} active={tab} setActive={setTab}/>
      )}
      {tab==="overview"&&<TeamOverview role={role} team={activeTeam} setTab={setTab} setAttFilter={setAttFilter} responses={responses} setRosterInitial={setRosterInitial}/>}
      {tab==="roster"&&<KaderModul role={role} team={activeTeam} initialSelected={rosterInitial} teamRosterData={getMitgliederForTeam(activeTeam)}/>}
      {tab==="training"&&!limited&&<TrainingsplanModul team={activeTeam} sb={sb}/>}
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
      {tab==="helpers"&&<HelferModul teamOnly role={role} account={account} meineTeams={[activeTeam]}/>}
      {tab==="stats"&&!limited&&<StatsTab team={activeTeam}/>}
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
/* MitgliederModul via ./MitgliederModul.jsx */

/* KaderModul via ./KaderModul.jsx */

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

/* HelferModul via ./HelferModul.jsx */

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
/* TeamsVerwaltungModul via ./TeamsVerwaltungModul.jsx */

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
/* PlaetzeView via ./TrainingsModul.jsx */

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
      case "team":              return role==="administrator"||role==="administration"?<TeamsVerwaltungModul sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef} TeamViewComponent={TeamView}/>:<TeamView role={role} trainerTeams={trainerTeams} setActive={setActive} myRosterId={myRosterId} account={account} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder} sb={sb}/>;
      case "members":           return <MitgliederModul role={role} dbMitglieder={dbMitglieder} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "users":             return <PortalverwaltungView initialTab="users" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "portal":            return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "training":          return <TrainingsplanModul role={role} team={role==="trainer"?meineTeams?.[0]:undefined} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb}/>;
      case "schedule":          return <SpielplanModul role={role}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:13,color:"var(--sub)",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><TermineModul role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} onNavigateToSpiel={(spiel)=>{NAV_TARGET.tab="spielplan";NAV_TARGET.selectedSpiel=spiel;setActive("team");}}/></div>;
      case "helpers":           return <HelferModul role={role} meineTeams={meineTeams} account={account} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
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
