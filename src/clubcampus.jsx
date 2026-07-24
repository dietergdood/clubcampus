import { useState, useEffect, useRef } from "react";
import { FONT, BP_MOBILE, BP_TABLET, BTN_COLOR as BTN, BTN_TXT, BTN_HOV, ACCENT, ACCENT2, ACCENT20, ACCENT15, ACCENT12, GN, R, RL, BL, AM, BK, GR } from "./constants.js";
import { TI, TI_PATHS } from "./icons.jsx";
import { LOGO_B64, ThemeCtx, useTheme, hexToRgba, darkenHex, contrastColor, THEME_DEFAULT_STATIC, useBreakpoint, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, Av, Tabs, STitle, avColor} from "./theme.jsx";
import { ROSTER, USER_ACCOUNTS, SCHEDULE, GANTT, MEMBERS, FUNKTIONEN} from "./demoData.js";
import { ROLLE_PRIORITAET } from "./domains/roles/roleUtils.js";
import { Skel, SkelCard, SkelList } from "./shared/ui/Skeleton.jsx";
import { LoginScreen } from "./modules/LoginScreen.jsx";
import { useAppData, useTenant, useDbUser, useDbTeams } from "./domains/app/useAppData.js";
import { usePermissions } from "./domains/app/usePermissions.js";
import { useProfilCheck } from "./domains/app/useProfilCheck.js";
import { TEAM_HIERARCHY, NAV_TARGET, FIELD_VIS, INITIAL_PLAENE } from "./modules/appConstants.js";
import { SideNav, TopBar, MobileNav, RoleSwitcher, getNavForRole, getRole, NAV_BY_ROLE, ProfileModal, getVereinsnameStatic, maxStufe, getEffektiveStufeForFunktionaer, getModuleForFunktionaer } from "./modules/NavigationModul.jsx";
import { Dashboard, DashboardAdmin, DashboardAdministration, DashboardFunktionaer, DashboardTrainer, DashboardSpieler, DashboardEltern } from "./modules/DashboardModul.jsx";
import { TeamView, TeamOverview, EventsList } from "./modules/TeamModul.jsx";
import { SlotModal, SpielDetail, TermineModul, SpielplanModul, TableTab } from "./modules/TermineModul.jsx";
import { TrainingsplanModul, PlaetzeView } from "./modules/TrainingsplanModul.jsx";
import { TeamsVerwaltungModul } from "./modules/TeamsVerwaltungModul.jsx";
import MitgliederModul, { MembersView } from "./modules/MitgliederModul.jsx";
import KaderModul from "./modules/KaderModul.jsx";
import { HelferModul, HelpersList } from "./modules/HelferModul.jsx";
import NachrichtenModul from "./modules/NachrichtenModul.jsx";
import { TeamModuleMatrix, PortalverwaltungView } from "./modules/PortalverwaltungModul.jsx";
import { BusesView, MaterialView, LockersView, MediaView, WikiView, DocsView, NewsView, AttendanceCentral, ProfileView, DarkModeRow, DataCheckView, getTeamsFromFunktionen, getTeamsFromGruppen } from "./modules/PlatzhalterModul.jsx";



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
          fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",
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
              <Av name={m.name} size={26}/>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{m.name}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>{m.role}{m.team&&m.team!=="-"?" · "+m.team:""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



/* -- SUPABASE wird als Prop von App.jsx übergeben (kein Import hier) -- */

/* -- Farben & Konstanten via ./constants.js -- */

/* ── TEAM-HIERARCHIE (Baumstruktur) ── */

/* == PLATZ-GANTT == */


/* ==========================================
   ADMIN-EXKLUSIVE VIEWS
========================================== */
/* Vereinsfunktion → farbiger Chip */





/* ==========================================
   PROFIL MODAL
========================================== */
/* ── DARK MODE ROW (für ProfileModal) ── */

/* ── APP ROOT ── */
function Portal({supabaseClient}){
  const sbRef = useRef(supabaseClient||supabase||null);
  const sb = sbRef.current;
  const [session,setSession]=useState(sb ? undefined : null);
  const [dbUser,setDbUser]=useState(null);
  const [navToMember,setNavToMember]=useState(null); // mitglied_id für direkte Navigation
  const [navToTeam,setNavToTeam]=useState(null);     // team_id für direkte Navigation
  const [dbTeams,setDbTeams]=useState([]);
  const [dbStufen,setDbStufen]=useState([]);
  const [dbMitglieder,setDbMitglieder]=useState([]);
  const [dbFunktionen,setDbFunktionen]=useState([]); // portal_funktionen des eingeloggten Benutzers
  const [dbMitgliedtypen,setDbMitgliedtypen]=useState([]);
  const [dbPortalRollen,setDbPortalRollen]=useState([]);
  const [dbKaderRollen,setDbKaderRollen]=useState([]);
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
  const [profilOverlayDismissed,setProfilOverlayDismissed]=useState(false);
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

  /* ── Inter Font + PWA Globals ── */
  useEffect(()=>{
    if(!document.getElementById("inter-font")){
      const l=document.createElement("link");l.id="inter-font";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(l);
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
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadDbMitgliedtypen(); loadDbPortalRollen(); loadDbKaderRollen(); loadDbFunktionen(session?.user?.id); loadModuleConfig(); loadTheme(); }
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange(function(_,session){
      setSession(session||null);
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadDbMitgliedtypen(); loadDbPortalRollen(); loadDbKaderRollen(); loadTheme(); }
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

  const [teamRollen,setTeamRollen]=useState({}); // {team_id: ["spieler"|"trainer"|...]}
  const [error, setError] = useState(null);
  const { loadDbUser } = useDbUser({ sb, setDbUser, setTeamRollen, setError, ROLLE_PRIORITAET });
  const { loadDbTeams } = useDbTeams({ sb, setDbTeams });

  /* ── Theme aus Supabase laden ── */
  const {
    loadTheme, applyThemeCss, loadModuleConfig,
    loadDbStufen, loadDbFunktionen, updatePortalZugang,
    loadDbMitglieder, loadDbMitgliedtypen,
    loadDbPortalRollen, loadDbKaderRollen,
    handleLogout: _handleLogout,
  } = useAppData({ sb, setAppTheme, setModuleAktiv, setModuleRechte, setDbStufen,
    setDbFunktionen, setDbMitglieder, setDbMitgliedtypen, setDbPortalRollen, setDbKaderRollen,
    setSession, setDbUser });

  async function handleLogout(){
    await _handleLogout();
    setActive("dashboard");
  }


  // Fehler-Screen (z.B. deaktivierter Benutzer)
  if(error){
    return(
      <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{maxWidth:400,textAlign:"center"}}>
          <div style={{fontSize:14,color:"var(--sub)",marginBottom:16}}>{error}</div>
          <button onClick={()=>{ setError(null); setSession(null); }} style={{padding:"8px 20px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:14,cursor:"pointer"}}>
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  // Lade-Screen (initial oder während dbUser lädt nach Login)
  if(session===undefined){
    return(
      <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:16,overflow:"hidden",display:"inline-flex",marginBottom:12}}>
            <img src={appTheme?.logo||'/logo.png'} style={{width:64,height:64,objectFit:"cover"}} alt="Logo"/>
          </div>
          <div className="cc-text-sm">Wird geladen…</div>
        </div>
      </div>
    );
  }

  // Login-Screen wenn nicht eingeloggt (oder kein Supabase)
  if(sb && !session){
    return <LoginScreen sb={sb} onLogin={s=>setSession(s)} appTheme={appTheme}/>;
  }

  // Kein Portal-Zugang
  if(dbUser && dbUser.role === "__kein_zugang"){
    return(
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24}}>
        <div style={{maxWidth:400,textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 8px",color:"var(--text)"}}>Kein Portal-Zugang</h2>
          <p style={{fontSize:14,color:"var(--sub)",margin:"0 0 24px",lineHeight:1.5}}>
            Dein Konto ({dbUser.email}) hat keinen aktiven Portal-Zugang.<br/>
            Bitte wende dich an den Vereinsadministrator.
          </p>
          <button
            onClick={async()=>{ await sb.auth.signOut(); setSession(null); setDbUser(null); }}
            style={{padding:"10px 24px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:14,cursor:"pointer"}}
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // Rolle aus DB-User oder Demo-Fallback
  const effectiveAccountKey = dbUser ? "db_user" : accountKey;
  const dbAccount = dbUser ? {
    id: dbUser.id,
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

  // Teams aus Kader ableiten
  const meineTeamIds = Object.keys(teamRollen).map(Number);
  const trainerTeamIds = meineTeamIds.filter(id=>["trainer"].includes(teamRollen[id]));
  const trainerTeams = trainerTeamIds.map(id=>dbTeams.find(t=>t.id===id)?.name).filter(Boolean);
  const spielerTeam = meineTeamIds.map(id=>dbTeams.find(t=>t.id===id)?.name).filter(Boolean);
  const meineTeams = role==="administrator"||role==="administration"
    ? dbTeams.map(t=>t.name)
    : role==="trainer"
      ? trainerTeams.length>0 ? trainerTeams : spielerTeam
      : kinder.length>0 ? [...new Set(kinder.map(k=>k.team))]
      : spielerTeam;
  const myRosterId = account.rosterId||(role==="spieler"?1:role==="eltern"?1:role==="trainer"?200:null);
  /* Dynamische Navigation (funktionaer/stufenleitung aus Gruppen) */
  /* Modul-Sichtbarkeit prüfen: global + pro Rolle */
  const isModuleVisible=(key)=>{
    if(key==="dashboard") return true;
    if(key==="profile") return true; // Profil immer sichtbar
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
  const { getZugriff, kannLesen, kannSchreiben, kannVerwalten } = usePermissions({
    role, moduleRechte, zugriffStufen: null, dbFunktionen,
  });

  const handleAccountChange=(key)=>{
    setAccountKey(key);
    setActiveSubRole(null);
    setActive("dashboard");
  };

  const getView=()=>{
    if(!isModuleVisible(active)) return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
    switch(active){
      case "dashboard":         return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
      case "team":              return role==="administrator"||role==="administration"?<TeamsVerwaltungModul sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef} dbMitglieder={dbMitglieder} TeamViewComponent={TeamView} KaderModulComponent={KaderModul} TrainingsplanModulComponent={TrainingsplanModul} TermineModulComponent={TermineModul} SpielplanModulComponent={SpielplanModul} TableTabComponent={TableTab} HelferModulComponent={HelferModul} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>:<TeamView role={role} trainerTeams={trainerTeams} teamRollen={teamRollen} setActive={setActive} myRosterId={myRosterId} account={account} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder} KaderModul={KaderModul} TrainingsplanModul={TrainingsplanModul} TermineModul={TermineModul} SpielplanModul={SpielplanModul} TableTab={TableTab} HelferModul={HelferModul} onSelectMember={m=>{setNavToMember(m.id||m.mitglied_id);setActivePersist("members");}} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>;
      case "members":           return <MembersView role={role} account={account} dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} onReload={loadDbMitglieder} onUpdatePortalZugang={updatePortalZugang} navToMember={navToMember} onNavToMemberDone={()=>setNavToMember(null)} onNavToTeam={teamId=>{setNavToTeam(teamId);setActivePersist("team");}} vereinId={tenant?.id}/>;
      case "users":             return <PortalverwaltungView initialTab="users" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "mitglieder_config": return <PortalverwaltungView initialTab="mitglieder_config" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "portal":            return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbPortalRollen={dbPortalRollen} onReloadRollen={loadDbPortalRollen} dbKaderRollen={dbKaderRollen} onReloadKaderRollen={loadDbKaderRollen}/>;
      case "training":          return <TrainingsplanModul role={role} team={role==="trainer"?meineTeams?.[0]:undefined} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} dbTeams={dbTeams}/>;
      case "schedule":          return <SpielplanModul role={role}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:14,color:"var(--sub)",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><TermineModul role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} onNavigateToSpiel={(spiel)=>{NAV_TARGET.tab="spielplan";NAV_TARGET.selectedSpiel=spiel;setActive("team");}}/></div>;
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
      case "profile":           return <ProfileView role={role} myRosterId={myRosterId} account={account} sb={sb} dbUser={dbUser} dbMitglieder={dbMitglieder} vereinId={vereinId} onReload={()=>{loadDbMitglieder();setProfilOverlayDismissed(false);}} onProfilGeprueft={markiereProfilGeprueft}/>;
      default:                  return <Dashboard role={role} setActive={setActive}/>;
    }
  };

  const { getProfilFehlend, sollProfilPruefen, markiereProfilGeprueft } = useProfilCheck({
    sb, dbUser, role, dbMitglieder, setDbUser,
  });

  return(
    <ThemeCtx.Provider value={{dark,toggle:toggleDark}}>
      <div data-theme={dark?"dark":"light"} style={{display:"flex",minHeight:"100dvh",background:"var(--bg)",fontFamily:FONT,WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",color:"var(--text)",transition:"background 0.25s,color 0.25s"}}>
        {/* Profil-Pflicht Modal */}
        {(()=>{
          if(!session||role==="administrator"||role==="administration") return null;
          if(!sollProfilPruefen()||profilOverlayDismissed) return null;
          const fehlend=getProfilFehlend();
          const LABELS={"vorname":"Vorname","nachname":"Nachname","geburtsdatum":"Geburtsdatum","telefon":"Handynummer","email":"E-Mail"};
          return(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:"var(--surface)",borderRadius:16,padding:32,maxWidth:480,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="26" fill="var(--cc-accent,#FEC604)" fillOpacity="0.15"/>
                    <path d="M18 16h4.5a3.5 3.5 0 0 1 7 0H34a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" stroke="var(--cc-accent,#FEC604)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M22 16a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1H22v-1z" fill="var(--cc-accent,#FEC604)" fillOpacity="0.5"/>
                    <path d="M21 25h10M21 30h7" stroke="var(--cc-accent,#FEC604)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                {fehlend.length>0?(
                  <>
                    <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 8px",textAlign:"center"}}>Profil vervollständigen</h2>
                    <p style={{fontSize:14,color:"var(--sub)",textAlign:"center",marginBottom:20,lineHeight:1.6}}>
                      Bitte fülle die fehlenden Pflichtfelder aus bevor du das Portal nutzen kannst.
                    </p>
                    <div style={{background:"var(--surface2)",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
                      <div className="cc-label" style={{marginBottom:8}}>Fehlende Angaben</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {fehlend.map(f=>(
                          <span key={f} style={{fontSize:13,padding:"3px 10px",borderRadius:20,background:"#FEF3C7",color:"#92400E",fontWeight:500}}>
                            {LABELS[f]||f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={()=>{setProfilOverlayDismissed(true);setActivePersist("profile");}}
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"var(--cc-accent,#FEC604)",color:"var(--text)",fontWeight:700,fontSize:15,cursor:"pointer"}}>
                      Jetzt ausfüllen →
                    </button>
                  </>
                ):(
                  <>
                    <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 8px",textAlign:"center"}}>Daten prüfen</h2>
                    <p style={{fontSize:14,color:"var(--sub)",textAlign:"center",marginBottom:20,lineHeight:1.6}}>
                      {!dbUser?.profil_geprueft_at
                        ?"Bitte prüfe deine Daten beim ersten Login einmal kurz."
                        :"Es ist Zeit deine Daten zu prüfen (alle 6 Monate)."}
                    </p>
                    <button onClick={()=>setActivePersist("profile")}
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"var(--cc-accent,#FEC604)",color:"var(--text)",fontWeight:700,fontSize:15,cursor:"pointer"}}>
                      Daten jetzt prüfen →
                    </button>
                    <button onClick={markiereProfilGeprueft}
                      style={{width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"0.5px solid var(--border)",background:"none",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                      Alles korrekt — weiter
                    </button>
                  </>
                )}
                <button onClick={handleLogout}
                  style={{width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"0.5px solid var(--border)",background:"none",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
                  Abmelden
                </button>
              </div>
            </div>
          );
        })()}
        {!isMobile&&<SideNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} appTheme={appTheme}/>}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {isMobile&&<TopBar role={role} active={active} setActive={setActivePersist}
            account={account} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole}
            onRoleChange={(key)=>handleAccountChange(key)} isMobile={isMobile}
            onLogout={sb&&session ? handleLogout : undefined}
            onOpenProfile={()=>setMobileProfileOpen(true)}
            onBack={customBack} appTheme={appTheme}/>}
          <main key={active} className="cc-page" style={{flex:1,overflowY:"auto",overflowX:"hidden"}}><div className="cc-page-shell" style={{padding:isMobile?"16px 12px calc(90px + env(safe-area-inset-bottom, 0px))":isTablet?"20px 20px 28px":"28px 40px",minHeight:"100%"}}>{getView()}</div></main>
          {isMobile&&<MobileNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} effectiveNav={effectiveNav}/>}
        </div>
      </div>
      {isMobile&&<ProfileModal open={mobileProfileOpen} onClose={()=>setMobileProfileOpen(false)} account={account} role={role} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined}/>}
    </ThemeCtx.Provider>
  );
}

export default Portal;
