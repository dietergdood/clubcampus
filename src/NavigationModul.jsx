/* ═══════════════════════════════════════════════════════════════
   ClubCampus NavigationModul — NavigationModul.jsx
   SideNav, TopBar, MobileNav, RoleSwitcher
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, ACCENT20, GN, R, RL, BL, AM, BK, GB } from "./constants.js";
import { TI, TI_PATHS } from "./icons.jsx";
import { LOGO_B64, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, Av, Tabs , useTheme, Between, Col, H1, Row, avColor} from "./theme.jsx";
import { USER_ACCOUNTS } from "./demoData.js";

/* ── Navigationsdaten & Hilfsfunktionen ── */
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
  supporter: [
    {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
    {key:"news",               icon:"news",             label:"News"},
    {key:"events",             icon:"calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"heart-handshake",  label:"Helfereinsätze"},
    {key:"nachrichten",        icon:"message",          label:"Nachrichten"},
    {key:"profile",            icon:"user",             label:"Mein Profil"},
  ],
};

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
  supporter: {
    tabs: [
      {key:"dashboard",          icon:"layout-dashboard", label:"Home"},
      {key:"events",             icon:"calendar-event",   label:"Termine"},
      {key:"helpers",            icon:"heart-handshake",  label:"Helfer"},
      {key:"news",               icon:"news",             label:"News"},
    ],
    mehr: [],
  },
};

const ROLES = {
  administrator: {
    label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings",
    desc:"Vollzugriff: alle Module, Systemeinstellungen, Benutzerverwaltung",
    level:7
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

function getRole(role){
  const norm=(role||"spieler").toLowerCase()
    .replace("ä","ae").replace("ö","oe").replace("ü","ue")
    .replace("funktionär","funktionaer");
  return ROLES[norm]||ROLES.spieler;
}

function getVereinsnameStatic(){
  try{const t=localStorage.getItem("cc-theme");return t?(JSON.parse(t).vereinsname||"ClubCampus"):"ClubCampus";}catch{return "ClubCampus";}
}

function RoleSwitcher({account,activeSubRole,setActiveSubRole,onRoleChange}){
  const isMobile=useIsMobile();
  const [open,setOpen]=useState(false);
  const currentRole=activeSubRole||account.primaryRole;
  const cur=ROLES[currentRole];
  const hasMultiRoles=account.rollen.length>1;
  return(
    <>
      <Btn onClick={()=>setOpen(true)}><span style={{fontSize:14}}>{cur.icon}</span> <span style={{fontSize:14,fontWeight:700,color:cur.color}}>{cur.label}</span> {hasMultiRoles&&<span style={{fontSize:14,background:cur.color,color:"#fff",padding:"1px 5px",borderRadius:10,marginLeft:2}}>{account.rollen.length}</span>} <span style={{fontSize:14,color:cur.color,opacity:0.7}}>▾</span></Btn>
      {open&&(
        <div onClick={()=>setOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"var(--surface)",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",overflowY:"auto"}:{padding:24}}>
            <Between style={{marginBottom:18}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:800}}>Konto &amp; Rolle wechseln</h2>
                <p style={{margin:"3px 0 0",fontSize:14,color:"var(--sub)"}}>Teste die App aus verschiedenen Perspektiven</p>
              </div>
              <Btn variant="ghost" onClick={()=>setOpen(false)} style={{fontSize:20,padding:"4px 6px",color:"var(--sub)"}}>×</Btn>
            </Between>

            {/* Konten mit Mehrfach-Rollen */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length>1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Konten mit Mehrfach-Rollen</div>
                <Col>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length>1).map(([key,a])=>{
                    const isActive=account===a;
                    return(
                      <div key={key} style={{border:`1.5px solid ${isActive?R:GB}`,borderRadius:10,padding:"10px 14px",background:isActive?R+"08":"#fafaf8"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:R,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                            {a.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div style={{fontWeight:700,fontSize:14}}>{a.name}</div>
                            <div style={{fontSize:14,color:"var(--sub)"}}>{a.kinder.length>0?`${a.kinder.length} Kind${a.kinder.length>1?"er":""}: ${a.kinder.map(k=>k.name).join(", ")}`:"Kein Kind"}</div>
                          </div>
                          {isActive&&<span style={{marginLeft:"auto",fontSize:14,color:R,fontWeight:700}}>AKTIVES KONTO</span>}
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {a.rollen.map(r=>{
                            const rd=ROLES[r];
                            const isActiveSub=(isActive&&(activeSubRole||a.primaryRole)===r);
                            return(
                              <Btn onClick={()=>{onRoleChange(key);setActiveSubRole(r);setOpen(false);}}><span>{rd.icon}</span>{rd.label} {isActiveSub&&<span style={{fontSize:14,color:rd.color}}>✓</span>}</Btn>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </Col>
              </div>
            )}

            {/* Eltern mit Kindern */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rollen.length===1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Eltern-Zugänge</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rollen.length===1).map(([key,a])=>{
                    const rd=ROLES[a.primaryRole];
                    const isActive=account===a;
                    return(
                      <Btn onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}> <span style={{fontSize:16}}>{rd.icon}</span> <span style={{fontWeight:700,fontSize:14,color:isActive?rd.color:"var(--text)"}}>{a.name}</span> </div> {a.kinder.map((k,i)=>( <div key={i} style={{fontSize:14,color:"var(--sub)",marginTop:2}}> <span style={{color:GN}}>►</span> {k.name} <span style={{color:"var(--sub)"}}>({k.team})</span> </div> ))} {isActive&&<div style={{marginTop:5,fontSize:14,color:rd.color,fontWeight:700}}>AKTIV</div>}</Btn>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Rollen */}
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Standard-Rollen (Demo)</div>
              <div className="cc-grid-2" style={{gap:8}}>
                {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rollen.length===1&&a.kinder.length===0).map(([key,a])=>{
                  const rd=ROLES[a.primaryRole];
                  const isActive=account===a&&!activeSubRole;
                  const teamLabel=a.trainerTeams?a.trainerTeams[0]:a.team||null;
                  return(
                    <Btn onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}> <span style={{fontSize:18}}>{rd.icon}</span> <span style={{fontWeight:700,fontSize:14,color:isActive?rd.color:"var(--text)"}}>{a.name}</span> {isActive&&<span style={{marginLeft:"auto",fontSize:14,color:rd.color,fontWeight:700}}>AKTIV</span>} </div> <div style={{fontSize:14,color:rd.color,fontWeight:600,marginBottom:2}}>{rd.label}</div> {teamLabel&&<div style={{fontSize:14,color:"var(--sub)"}}>{teamLabel}</div>} {!teamLabel&&<p style={{margin:0,fontSize:14,color:"var(--sub)"}}>{rd.desc}</p>}</Btn>
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
    <nav style={{width:W,minWidth:W,background:"var(--nav)",height:"100dvh",position:"sticky",top:0,display:"flex",flexDirection:"column",flexShrink:0,borderRight:"1px solid var(--nav-b)",transition:"width 0.22s cubic-bezier(0.4,0,0.2,1),min-width 0.22s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden"}}>
      {/* Logo Header */}
      <div style={{padding:"18px 10px 15px",borderBottom:"1px solid var(--nav-b)",display:"flex",alignItems:"center",gap:collapsed?0:11,justifyContent:collapsed?"center":"flex-start",overflow:"hidden"}}>
        <div style={{width:44,height:44,minWidth:44,borderRadius:12,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
          <img src={appTheme?.logo||LOGO_B64} style={{width:44,height:44,objectFit:"cover",display:"block"}} alt="Logo"/>
        </div>
        {!collapsed&&(
          <div style={{minWidth:0,overflow:"hidden"}}>
            <div style={{color:"var(--nav-t)",fontWeight:800,fontSize:14,lineHeight:1.25,letterSpacing:-0.2,wordBreak:"break-word",overflowWrap:"break-word"}}>{appTheme?.vereinsname||getVereinsnameStatic()}</div>
            <div style={{color:"var(--nav-a)",fontSize:11,letterSpacing:0.6,marginTop:2,textTransform:"uppercase",fontWeight:600}}>{"ClubCampus"}</div>
          </div>
        )}
      </div>
      {/* Nav items */}
      <div style={{flex:1,padding:"10px 8px",overflowY:"auto",overflowX:"hidden"}}>
        {nav.map(n=>(
          <button key={n.key} onClick={()=>setActive(n.key)} title={collapsed?n.label:undefined}
            className={`cc-nav-item${active===n.key?" cc-nav-active":""}`}
            style={{
            width:"100%",display:"flex",alignItems:"center",gap:collapsed?0:11,
            padding:collapsed?"10px 0":"10px 12px",borderRadius:9,border:"none",
            background:active===n.key?"var(--nav-a)":"transparent",
            color:active===n.key?"var(--nav-accent-text)":"var(--nav-t)",
            cursor:"pointer",fontSize:13.5,fontWeight:active===n.key?600:400,
            textAlign:"left",marginBottom:2,letterSpacing:0.1,
            transition:"background 0.15s",fontFamily:"inherit",
            justifyContent:collapsed?"center":"flex-start",
          }}>
            <TI n={n.icon||"circle"} size={collapsed?18:15} style={{flexShrink:0,opacity:active===n.key?1:0.65}}/>
            {!collapsed&&<span>{n.label}</span>}
          </button>
        ))}
      </div>

      {/* Trennlinie */}
      <div style={{height:1,background:"var(--nav-b)",margin:"0 12px"}}/>

      {/* User footer – klickbar → Profil */}
      <button className="cc-nav-item" onClick={()=>setShowProfile(true)} style={{
        width:"100%",border:"none",background:"transparent",cursor:"pointer",
        padding:collapsed?"12px 8px":"12px",textAlign:"left",fontFamily:"inherit",
        transition:"background 0.15s",borderRadius:0,
      }}>
        {!collapsed&&<div style={{fontSize:11,color:"var(--nav-t)",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:9,paddingLeft:2}}>Angemeldet als</div>}
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
          <Av size={32} bg="var(--avatar-bg,var(--cc-accent,#FFBF00))" name={userName}/>
          {!collapsed&&(
            <div style={{minWidth:0,flex:1}}>
              <div style={{color:"var(--nav-a)",fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:0.1}}>{userName}</div>
              <div style={{marginTop:3,fontSize:11,color:"var(--nav-t)",opacity:0.6,fontWeight:600,letterSpacing:0.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:rc,flexShrink:0}}/>
                {getRole(role).label}
              </div>
            </div>
          )}
          {!collapsed&&<TI n="chevron-right" size={13} style={{color:"var(--nav-t)",opacity:0.5,flexShrink:0}}/>}
        </div>
      </button>

      {/* Einklappen-Button */}
      <button className="cc-nav-item" onClick={toggleCollapse} style={{
        width:"100%",border:"none",background:"transparent",cursor:"pointer",
        padding:"10px",display:"flex",justifyContent:"center",alignItems:"center",
        fontFamily:"inherit",transition:"background 0.15s",borderRadius:0,
      }}>
        <TI n={collapsed?"chevrons-right":"chevrons-left"} size={16} style={{color:"var(--nav-t)",opacity:0.6}}/>
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
            <Btn variant="ghost" onClick={()=>onBack?onBack():setActive("dashboard")} style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}><TI n="chevron-left" size={22}/></Btn>
            <span style={{fontWeight:700,fontSize:16,color:"var(--text)",letterSpacing:-0.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1}}>{pageLabel}</span>
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
          <Btn onClick={toggle}><div style={{width:22,height:22,borderRadius:"50%",background:dark?"#111":"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.25s",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}> <TI n={dark?"sun":"moon"} size={12} style={{color:dark?ACCENT:"var(--sub)"}}/> </div> <span style={{fontSize:14,fontWeight:600,color:dark?"#111":"var(--sub)",whiteSpace:"nowrap",fontFamily:FONT}}>{dark?"Hell":"Dunkel"}</span></Btn>
        )}
        {!isMobile&&!onLogout&&<RoleSwitcher account={acc} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole||((r)=>{})} onRoleChange={onRoleChange}/>}
        {!isMobile&&!onLogout&&<Chip text="DEMO" color="#999" bg="var(--surface2)"/>}
        {!isMobile&&onLogout&&<Btn onClick={onLogout}>Abmelden</Btn>}
      </div>
    </div>
  );
}

/* ==========================================
   DASHBOARDS (je nach Rolle)
========================================== */
/* Dashboard via ./DashboardModul.jsx */

/* DashboardAdmin via ./DashboardModul.jsx */

/* DashboardAdministration via ./DashboardModul.jsx */

/* DashboardFunktionaer via ./DashboardModul.jsx */

/* DashboardTrainer via ./DashboardModul.jsx */

/* DashboardSpieler via ./DashboardModul.jsx */

/* DashboardEltern via ./DashboardModul.jsx */

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
                style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 16px",
                  background:active===m.key?ACCENT20:"none",border:"none",cursor:"pointer",
                  fontFamily:"inherit",textAlign:"left"}}>
                <div style={{width:40,height:40,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",
                  background:active===m.key?ACCENT:"var(--surface2)",flexShrink:0}}>
                  <TI n={m.icon||"circle"} size={19} style={{color:active===m.key?"#111":"var(--sub)"}}/>
                </div>
                <span style={{fontSize:15,fontWeight:active===m.key?600:400,color:active===m.key?"var(--text)":"var(--sub)"}}>{m.label}</span>
                {active===m.key&&<TI n="check" size={16} style={{color:ACCENT,marginLeft:"auto"}}/>}
              </button>
            ))}
            {/* Profil */}
            <div style={{margin:"8px 16px 0",paddingTop:12,borderTop:"0.5px solid var(--border)"}}>
              <button onClick={()=>{setShowProfile(true);setShowMehr(false);}}
                style={{display:"flex",alignItems:"center",gap:14,width:"100%",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:rc,display:"flex",alignItems:"center",
                  justifyContent:"center",color:rc===ACCENT?"#111":"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                  {initials}
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{userName}</div>
                  <div style={{fontSize:12,color:"var(--sub)"}}>{getRole(role)?.label||role}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--nav)",borderTop:"1px solid var(--nav-b)",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex"}}>
          {tabs.map(n=>(
            <button key={n.key} onClick={()=>{setActive(n.key);setShowMehr(false);}} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"6px 0 4px",background:"none",border:"none",cursor:"pointer",
              minHeight:56,WebkitTapHighlightColor:"transparent",position:"relative",gap:0
            }}>
              {active===n.key&&!mehrActive&&<span style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:3,borderRadius:"0 0 3px 3px",background:"var(--nav-a)"}}/>}
              <TI n={n.icon||"circle"} size={22} style={{color:active===n.key&&!mehrActive?"var(--nav-a)":"var(--nav-t)",marginBottom:2}}/>
              <span style={{fontSize:10,color:active===n.key&&!mehrActive?"var(--nav-a)":"var(--nav-t)",fontWeight:active===n.key&&!mehrActive?600:400}}>{n.label}</span>
            </button>
          ))}
          {/* Mehr-Button (nur wenn mehr-Einträge vorhanden) */}
          {mehr.length>0&&(
            <button onClick={()=>setShowMehr(v=>!v)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"6px 0 4px",background:"none",border:"none",cursor:"pointer",
              minHeight:56,WebkitTapHighlightColor:"transparent",position:"relative",gap:0
            }}>
              {(mehrActive||showMehr)&&<span style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:3,borderRadius:"0 0 3px 3px",background:"var(--nav-a)"}}/>}
              <svg width="22" height="22" viewBox="0 0 19 19" fill="none" style={{marginBottom:2}}>
                <circle cx="4" cy="9.5" r="1.8" fill={mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)"}/>
                <circle cx="9.5" cy="9.5" r="1.8" fill={mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)"}/>
                <circle cx="15" cy="9.5" r="1.8" fill={mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)"}/>
              </svg>
              <span style={{fontSize:10,color:mehrActive||showMehr?"var(--nav-a)":"var(--nav-t)",fontWeight:mehrActive||showMehr?600:400}}>Mehr</span>
            </button>
          )}
        </div>
      </nav>
      <ProfileModal open={showProfile} onClose={()=>setShowProfile(false)} account={account} role={role} sb={sb} onNameUpdated={onNameUpdated} onLogout={onLogout}/>
    </>
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

  const inputStyle={width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:9,
    fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",
    boxSizing:"border-box",outline:"none"};

  const StatusBox=({status,msg})=>status==="ok"?(
    <div style={{padding:"10px 14px",background:"var(--surface)",border:"1px solid "+GN,borderRadius:9,fontSize:14,color:GN,fontWeight:600,marginTop:4}}>{msg}</div>
  ):status==="error"?(
    <div style={{padding:"10px 14px",background:RL,border:"1px solid "+R,borderRadius:9,fontSize:14,color:R,fontWeight:600,marginTop:4}}>{msg}</div>
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
        <Btn variant="ghost" onClick={onClose}>×</Btn>
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
                <span style={{fontSize:14,color:"var(--sub)",minWidth:90}}>Name</span>
                {!editName&&(
                  <span style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{userName}</span>
                )}
              </div>
              {editName&&(
                <Col>
                  <input value={nameDraft} onChange={e=>setNameDraft(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")handleSaveName();if(e.key==="Escape")setEditName(false);}}
                    style={{...inputStyle}} autoFocus placeholder="Vor- und Nachname"/>
                  <Row align="flex-start">
                    <Btn variant="primary" color={BTN} onClick={handleSaveName} disabled={nameStatus==="loading"}>{nameStatus==="loading"?"Speichern…":"Speichern"}</Btn>
                    <Btn onClick={()=>{setEditName(false);setNameStatus(null);}}>Abbrechen</Btn>
                  </Row>
                  <StatusBox status={nameStatus} msg={nameMsg}/>
                </Col>
              )}
            </div>

            {/* E-Mail – read only */}
            <div className="cc-info-row">
              <span className="cc-info-key">E-Mail</span>
              <span className="cc-info-val">{userEmail}</span>
            </div>

            {/* Rolle */}
            <div className="cc-info-row">
              <span className="cc-info-key">Portal-Rolle</span>
              <span className="cc-info-val" style={{color:rc}}>{getRole(role).label}</span>
            </div>

            {/* Verein */}
            <div className="cc-info-row">
              <span className="cc-info-key">Verein</span>
              <span className="cc-info-val">{getVereinsnameStatic()}</span>
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
                <Btn variant="ghost" onClick={onLogout}><TI n="logout" size={15}/> Abmelden</Btn>
              </div>
            )}
          </div>
        )}

        {tab==="passwort"&&(
          <form onSubmit={handlePwChange} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:6}}>Aktuelles Passwort</div>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
                style={inputStyle} autoComplete="current-password"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:6}}>Neues Passwort</div>
              <input type="password" placeholder="Mindestens 8 Zeichen" value={pwForm.next}
                onChange={e=>setPwForm(p=>({...p,next:e.target.value}))}
                style={inputStyle} autoComplete="new-password"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:6}}>Passwort bestätigen</div>
              <input type="password" placeholder="Wiederholen" value={pwForm.repeat}
                onChange={e=>setPwForm(p=>({...p,repeat:e.target.value}))}
                style={inputStyle} autoComplete="new-password"/>
            </div>
            <StatusBox status={pwStatus} msg={pwMsg}/>
            <Btn variant="primary" color={BTN} disabled={pwStatus==="loading"} type="submit">{pwStatus==="loading"?"Wird gespeichert…":"Passwort ändern"}</Btn>
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

const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};

function maxStufe(a, b){
  if(!a) return b; if(!b) return a;
  return STUFE_RANG[a]>=STUFE_RANG[b]?a:b;
}

function getEffektiveStufeForFunktionaer(dbFunktionen, modulKey){
  if(!dbFunktionen||dbFunktionen.length===0) return null;
  let best=null;
  dbFunktionen.forEach(f=>{
    const override=f.stufe_override?.[modulKey];
    const gruppenStufe=f.portal_gruppen?.modul_stufen?.[modulKey]||f.modul_stufen?.[modulKey];
    const module=f.module_override?.length>0?f.module_override:(f.portal_gruppen?.module||[]);
    if(module.includes(modulKey)){
      const stufe=override||gruppenStufe||f.portal_gruppen?.default_stufe||"lesen";
      best=maxStufe(best,stufe);
    }
  });
  return best;
}

function getModuleForFunktionaer(dbFunktionen){
  const all=new Set();
  (dbFunktionen||[]).forEach(f=>{
    const mods=f.module_override?.length>0?f.module_override:(f.portal_gruppen?.module||[]);
    mods.forEach(m=>all.add(m));
  });
  return [...all];
}

function DarkModeRow(){
  const {dark,toggle}=useTheme();
  return(
    <Between>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{dark?"Dunkel":"Hell"}</div>
        <div style={{fontSize:12,color:"var(--sub)",marginTop:1}}>Farbschema des Portals</div>
      </div>
      <button onClick={toggle} className={"cc-toggle cc-toggle-dark"+(dark?" cc-toggle-on":"")}>
        <div className={"cc-toggle-knob"+(dark?" cc-toggle-knob-on":"")}>
          <TI n={dark?"sun":"moon"} size={11} style={{color:dark?"#111":"var(--sub)"}}/>
        </div>
      </button>
    </Between>
  );
}
export { SideNav, TopBar, MobileNav, RoleSwitcher, getNavForRole, getRole, NAV_BY_ROLE, ProfileModal, getVereinsnameStatic, maxStufe, getEffektiveStufeForFunktionaer, getModuleForFunktionaer };
