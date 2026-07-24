/* ═══════════════════════════════════════════════════════════════
   ClubCampus — clubcampus.tsx
   Root-Komponente, Datenlader und Router in einem
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import type { Session } from "@supabase/supabase-js";
import { FONT } from "./constants.ts";
import { ThemeCtx, THEME_DEFAULT_STATIC, useBreakpoint } from "./theme.ts";
import { USER_ACCOUNTS } from "./demoData.js";
import { ROLLE_PRIORITAET } from "./domains/roles/roleUtils.ts";
import type { KaderRolleDb } from "./domains/roles/roleUtils.ts";
import { LoginScreen as LoginScreenJs } from "./modules/LoginScreen.jsx";
import { useAppData, useDbUser, useDbTeams } from "./domains/app/useAppData.js";
import { usePermissions } from "./domains/app/usePermissions.ts";
import { useProfilCheck } from "./domains/app/useProfilCheck.ts";
import { NAV_TARGET } from "./modules/appConstants.js";
import { SideNav as SideNavJs, TopBar as TopBarJs, MobileNav as MobileNavJs, getNavForRole, ProfileModal as ProfileModalJs, getVereinsnameStatic } from "./modules/NavigationModul.jsx";
import { Dashboard as DashboardJs } from "./modules/DashboardModul.jsx";
import { TeamView as TeamViewJs } from "./modules/TeamModul.jsx";
import { TermineModul as TermineModulJs, SpielplanModul as SpielplanModulJs, TableTab } from "./modules/TermineModul.jsx";
import { TrainingsplanModul as TrainingsplanModulJs } from "./modules/TrainingsplanModul.jsx";
import { TeamsVerwaltungModul as TeamsVerwaltungModulJs } from "./modules/TeamsVerwaltungModul.jsx";
import { MembersView } from "./modules/MitgliederModul.tsx";
import KaderModul from "./modules/KaderModul.jsx";
import { HelferModul, HelpersList as HelpersListJs } from "./modules/HelferModul.jsx";
import NachrichtenModulJs from "./modules/NachrichtenModul.jsx";
import { PortalverwaltungView as PortalverwaltungViewJs } from "./modules/PortalverwaltungModul.jsx";
import { BusesView as BusesViewJs, MaterialView as MaterialViewJs, LockersView as LockersViewJs, MediaView as MediaViewJs, WikiView as WikiViewJs, DocsView as DocsViewJs, NewsView as NewsViewJs, AttendanceCentral as AttendanceCentralJs, ProfileView as ProfileViewJs } from "./modules/PlatzhalterModul.jsx";
import type {
  Account, AppTheme, DbUser, Mitglied, Mitgliedtyp, ModuleAktiv, ModuleRechte,
  PortalFunktion, PortalRolle, Rolle, Sb, Team, TeamRollenMap, Tenant,
} from "./types.ts";

/* ── Brücke zu den noch nicht migrierten JS-Modulen ───────────────
   TypeScript leitet die Prop-Typen von JavaScript-Komponenten aus deren
   Default-Werten ab: `sb=null` wird zu Typ `null`, `dbTeams=[]` zu
   `never[]`. Korrekte Werte werden dadurch abgelehnt, und Parameter ohne
   Default gelten als Pflichtprops. Bis die Module migriert sind, werden
   sie hier als Komponenten mit freien Props geführt — das entspricht dem
   heutigen Stand, denn geprüft wurden ihre Props als JS ohnehin nie.
   Jede Zeile verschwindet mit der Migration des jeweiligen Moduls.
   MembersView fehlt bewusst: es ist bereits TypeScript und wird geprüft. */
type JsComponent = (props: Record<string, unknown>) => ReactElement | null;

const LoginScreen           = LoginScreenJs           as unknown as JsComponent;
const SideNav               = SideNavJs               as unknown as JsComponent;
const TopBar                = TopBarJs                as unknown as JsComponent;
const MobileNav             = MobileNavJs             as unknown as JsComponent;
const ProfileModal          = ProfileModalJs          as unknown as JsComponent;
const Dashboard             = DashboardJs             as unknown as JsComponent;
const TeamView              = TeamViewJs              as unknown as JsComponent;
const TermineModul          = TermineModulJs          as unknown as JsComponent;
const SpielplanModul        = SpielplanModulJs        as unknown as JsComponent;
const TrainingsplanModul    = TrainingsplanModulJs    as unknown as JsComponent;
const TeamsVerwaltungModul  = TeamsVerwaltungModulJs  as unknown as JsComponent;
const HelpersList           = HelpersListJs           as unknown as JsComponent;
const NachrichtenModul      = NachrichtenModulJs      as unknown as JsComponent;
const PortalverwaltungView  = PortalverwaltungViewJs  as unknown as JsComponent;
const BusesView             = BusesViewJs             as unknown as JsComponent;
const MaterialView          = MaterialViewJs          as unknown as JsComponent;
const LockersView           = LockersViewJs           as unknown as JsComponent;
const MediaView             = MediaViewJs             as unknown as JsComponent;
const WikiView              = WikiViewJs              as unknown as JsComponent;
const DocsView              = DocsViewJs              as unknown as JsComponent;
const NewsView              = NewsViewJs              as unknown as JsComponent;
const AttendanceCentral     = AttendanceCentralJs     as unknown as JsComponent;
const ProfileView           = ProfileViewJs           as unknown as JsComponent;

/* Ebenfalls noch JS: TS liest die Initialwerte (null) als Typ. */
const navTarget = NAV_TARGET as { tab: string|null; selectedSpiel: unknown };
/* ⚠ Die Demo-Accounts aus demoData erfüllen Account nicht: ihnen fehlen id
   und teams, dafür tragen manche ein trainerTeams. Sie greifen nur, wenn
   kein DB-Benutzer geladen ist (also ohne Supabase). Bewusst über unknown
   gecastet — der Fallback verschwindet mit demoData. */
const demoAccounts = USER_ACCOUNTS as unknown as Record<string, Account|undefined>;

/* Nachwuchsstufen — geladen von loadDbStufen, nur durchgereicht */
interface Stufe {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface PortalProps {
  /* Von App.jsx erzeugt; null, wenn die Env-Variablen fehlen */
  supabaseClient: Sb;
}

/* ── APP ROOT ── */
function Portal({supabaseClient}: PortalProps){
  /* Früher stand hier `supabaseClient||supabase||null`. Ein globales
     `supabase` gibt es nicht — sobald supabaseClient null war (fehlende
     Env-Variablen), lief die Zeile in einen ReferenceError statt den
     Login-Screen zu zeigen. */
  const sbRef = useRef<Sb>(supabaseClient||null);
  const sb = sbRef.current;
  const [session,setSession]=useState<Session|null|undefined>(sb ? undefined : null);
  const [dbUser,setDbUser]=useState<DbUser|null>(null);
  const [navToMember,setNavToMember]=useState<number|null>(null); // mitglied_id für direkte Navigation
  const [navToTeam,setNavToTeam]=useState<number|null>(null);     // team_id für direkte Navigation
  const [dbTeams,setDbTeams]=useState<Team[]>([]);
  const [dbStufen,setDbStufen]=useState<Stufe[]>([]);
  const [dbMitglieder,setDbMitglieder]=useState<Mitglied[]>([]);
  const [dbFunktionen,setDbFunktionen]=useState<PortalFunktion[]>([]); // portal_funktionen des eingeloggten Benutzers
  const [dbMitgliedtypen,setDbMitgliedtypen]=useState<Mitgliedtyp[]>([]);
  const [dbPortalRollen,setDbPortalRollen]=useState<PortalRolle[]>([]);
  const [dbKaderRollen,setDbKaderRollen]=useState<KaderRolleDb[]>([]);
  /* Globale Modul-Konfiguration (aus Portalverwaltung) */
  const [moduleAktiv,setModuleAktiv]=useState<ModuleAktiv>(()=>{
    try{const s=localStorage.getItem("cc-module-aktiv");return s?JSON.parse(s):{};}catch{return {};}
  });
  const [moduleRechte,setModuleRechte]=useState<ModuleRechte|null>(()=>{
    try{const s=localStorage.getItem("cc-module-rechte");return s?JSON.parse(s):null;}catch{return null;}
  });
  const [accountKey,setAccountKey]=useState("trainer");
  const [activeSubRole,setActiveSubRole]=useState<string|null>(null);
  const [active,setActive]=useState(()=>{
    try{
      const hash=window.location.hash.replace("#","");
      if(hash) return hash;
      return sessionStorage.getItem("cc-active")||"dashboard";
    }catch{return "dashboard";}
  });
  const setActivePersist=(key: string)=>{
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
  const [customBack,setCustomBack]=useState<(()=>void)|null>(null);
  const customBackRef=useRef<(()=>void)|null>(null);
  const setCustomBackAndRef=(fn: (()=>void)|null)=>{customBackRef.current=fn||null;setCustomBack(fn);};

  /* Browser Zurück/Vor via popstate */
  useEffect(()=>{
    const onPop=(e: PopStateEvent)=>{
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
  const toggleDark=()=>setDark((d: boolean)=>{const n=!d;try{localStorage.setItem("cc-dark",JSON.stringify(n));}catch{}return n;});

  /* ── App-Level Theme State ── */
  const [appTheme,setAppTheme]=useState<AppTheme>(()=>{
    try{const s=localStorage.getItem("cc-theme");return s?{...THEME_DEFAULT_STATIC,...JSON.parse(s)}:THEME_DEFAULT_STATIC;}catch{return THEME_DEFAULT_STATIC;}
  });

  /* ── Tenant State ── */
  const [tenant,setTenant]=useState<Tenant|null>(null); // {slug, name, theme}

  /* ── Inter Font + PWA Globals ── */
  useEffect(()=>{
    if(!document.getElementById("inter-font")){
      const l=document.createElement("link");l.id="inter-font";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    let m=document.querySelector<HTMLMetaElement>("meta[name=viewport]");
    if(!m){m=document.createElement("meta");m.name="viewport";document.head.appendChild(m);}
    m.content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=yes";
    /* PWA Standalone – Adressleiste ausblenden */
    const setMeta=(n: string,v: string)=>{let t=document.querySelector<HTMLMetaElement>(`meta[name="${n}"]`);if(!t){t=document.createElement("meta");t.name=n;document.head.appendChild(t);}t.content=v;};
    setMeta("apple-mobile-web-app-capable","yes");
    setMeta("apple-mobile-web-app-status-bar-style","black-translucent");
    setMeta("mobile-web-app-capable","yes");
    setMeta("apple-mobile-web-app-title",appTheme?.vereinsname||getVereinsnameStatic());
    /* manifest.json link – falls noch nicht vorhanden */
    if(!document.querySelector("link[rel=manifest]")){
      const lm=document.createElement("link");lm.rel="manifest";lm.href="/manifest.json";
      document.head.appendChild(lm);
    }
    let th=document.querySelector<HTMLMetaElement>("meta[name=theme-color]");
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
    let themeSub: ReturnType<typeof sb.channel>|null=null;
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

  /* Höchste Kaderrolle je Team — eine Rolle pro Team, kein Array
     (der frühere Kommentar behauptete das Gegenteil). */
  const [teamRollen,setTeamRollen]=useState<TeamRollenMap>({});
  const [error, setError] = useState<string|null>(null);
  const { loadDbUser } = useDbUser({ sb, setDbUser, setTeamRollen, setError, ROLLE_PRIORITAET });
  const { loadDbTeams } = useDbTeams({ sb, setDbTeams });

  /* ── Theme aus Supabase laden ── */
  const {
    loadTheme, applyThemeCss, loadModuleConfig, loadTenant,
    loadDbStufen, loadDbFunktionen, updatePortalZugang,
    loadDbMitglieder, loadDbMitgliedtypen,
    loadDbPortalRollen, loadDbKaderRollen,
    handleLogout: _handleLogout,
  } = useAppData({ sb, setAppTheme, setModuleAktiv, setModuleRechte, setDbStufen,
    setDbFunktionen, setDbMitglieder, setDbMitgliedtypen, setDbPortalRollen, setDbKaderRollen,
    setSession, setDbUser, setTenant });

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
    return <LoginScreen sb={sb} onLogin={(s: Session)=>setSession(s)} appTheme={appTheme}/>;
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
            onClick={async()=>{ if(sb) await sb.auth.signOut(); setSession(null); setDbUser(null); }}
            style={{padding:"10px 24px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:14,cursor:"pointer"}}
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // Rolle aus DB-User oder Demo-Fallback
  const dbAccount: Account|null = dbUser ? {
    id: dbUser.id,
    /* role ist hier nie '__kein_zugang' — der Fall ist oben abgefangen */
    name: dbUser.name||dbUser.email||"Benutzer",
    rollen: [(dbUser.role as Rolle)||"spieler"],
    primaryRole: (dbUser.role as Rolle)||"spieler",
    kinder: [],
    teams: dbUser.teams||[],
    email: dbUser.email||"",
  } : null;

  const account: Account = dbAccount || demoAccounts[accountKey] || demoAccounts.trainer!;
  const rawRole = activeSubRole || account.primaryRole || "spieler";
  /* Umlaute normalisieren (funktionär → funktionaer). Der Wert kann auch ein
     in portal_rollen frei angelegter Schlüssel sein und damit ausserhalb der
     Rolle-Union liegen — die Leser behandeln unbekannte Schlüssel wie eine
     Rolle ohne Sonderrechte. */
  const role = rawRole.toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue") as Rolle;
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
  const isModuleVisible=(key: string)=>{
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
    .filter((n: {key: string})=>isModuleVisible(n.key));

  /* ── App-Level Zugriffstufen-Hilfsfunktionen ── */
  const { kannSchreiben, kannVerwalten } = usePermissions({
    role, moduleRechte, zugriffStufen: null, dbFunktionen,
  });

  const handleAccountChange=(key: string)=>{
    setAccountKey(key);
    setActiveSubRole(null);
    setActive("dashboard");
  };

  const getView=()=>{
    if(!isModuleVisible(active)) return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
    switch(active){
      case "dashboard":         return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
      case "team":              return role==="administrator"||role==="administration"?<TeamsVerwaltungModul sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef} dbMitglieder={dbMitglieder} TeamViewComponent={TeamView} KaderModulComponent={KaderModul} TrainingsplanModulComponent={TrainingsplanModul} TermineModulComponent={TermineModul} SpielplanModulComponent={SpielplanModul} TableTabComponent={TableTab} HelferModulComponent={HelferModul} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>:<TeamView role={role} trainerTeams={trainerTeams} teamRollen={teamRollen} setActive={setActive} myRosterId={myRosterId} account={account} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder} KaderModul={KaderModul} TrainingsplanModul={TrainingsplanModul} TermineModul={TermineModul} SpielplanModul={SpielplanModul} TableTab={TableTab} HelferModul={HelferModul} onSelectMember={(m: {id?: number; mitglied_id?: number})=>{setNavToMember(m.id||m.mitglied_id||null);setActivePersist("members");}} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>;
      case "members":           return <MembersView role={role} account={account} dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} onReload={loadDbMitglieder} onUpdatePortalZugang={updatePortalZugang} navToMember={navToMember} onNavToMemberDone={()=>setNavToMember(null)} onNavToTeam={teamId=>{setNavToTeam(teamId);setActivePersist("team");}} vereinId={tenant?.id}/>;
      case "users":             return <PortalverwaltungView initialTab="users" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "mitglieder_config": return <PortalverwaltungView initialTab="mitglieder_config" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id}/>;
      case "portal":            return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbPortalRollen={dbPortalRollen} onReloadRollen={loadDbPortalRollen} dbKaderRollen={dbKaderRollen} onReloadKaderRollen={loadDbKaderRollen}/>;
      case "training":          return <TrainingsplanModul role={role} team={role==="trainer"?meineTeams?.[0]:undefined} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} dbTeams={dbTeams}/>;
      case "schedule":          return <SpielplanModul role={role}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:14,color:"var(--sub)",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><TermineModul role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} onNavigateToSpiel={(spiel: unknown)=>{navTarget.tab="spielplan";navTarget.selectedSpiel=spiel;setActive("team");}}/></div>;
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
      /* vereinId war hier ein undefinierter Bezeichner und lief zur Laufzeit
         in einen ReferenceError, sobald der Profil-Tab geöffnet wurde. */
      case "profile":           return <ProfileView role={role} myRosterId={myRosterId} account={account} sb={sb} dbUser={dbUser} dbMitglieder={dbMitglieder} vereinId={tenant?.id} onReload={()=>{loadDbMitglieder();setProfilOverlayDismissed(false);}} onProfilGeprueft={markiereProfilGeprueft}/>;
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
          const LABELS: Record<string,string>={"vorname":"Vorname","nachname":"Nachname","geburtsdatum":"Geburtsdatum","telefon":"Handynummer","email":"E-Mail"};
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
        {!isMobile&&<SideNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={(n: string)=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} appTheme={appTheme}/>}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {isMobile&&<TopBar role={role} active={active} setActive={setActivePersist}
            account={account} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole}
            onRoleChange={(key: string)=>handleAccountChange(key)} isMobile={isMobile}
            onLogout={sb&&session ? handleLogout : undefined}
            onOpenProfile={()=>setMobileProfileOpen(true)}
            onBack={customBack} appTheme={appTheme}/>}
          <main key={active} className="cc-page" style={{flex:1,overflowY:"auto",overflowX:"hidden"}}><div className="cc-page-shell" style={{padding:isMobile?"16px 12px calc(90px + env(safe-area-inset-bottom, 0px))":isTablet?"20px 20px 28px":"28px 40px",minHeight:"100%"}}>{getView()}</div></main>
          {isMobile&&<MobileNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={(n: string)=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} effectiveNav={effectiveNav}/>}
        </div>
      </div>
      {isMobile&&<ProfileModal open={mobileProfileOpen} onClose={()=>setMobileProfileOpen(false)} account={account} role={role} sb={sb} onNameUpdated={(n: string)=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined}/>}
    </ThemeCtx.Provider>
  );
}

export default Portal;
