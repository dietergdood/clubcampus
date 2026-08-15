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
import { LoginScreen } from "./modules/LoginScreen.tsx";
import { useAppData, useDbUser, useDbTeams } from "./domains/app/useAppData.js";
import { getPermissions } from "./domains/app/getPermissions.ts";
import { getProfilCheck } from "./domains/app/getProfilCheck.ts";
import { NAV_TARGET } from "./modules/appConstants.js";
import { SideNav, TopBar, MobileNav, getNavForRole, ProfileModal, getVereinsnameStatic } from "./modules/NavigationModul.tsx";
import { Dashboard } from "./modules/DashboardModul.tsx";
import { TeamView } from "./modules/TeamModul.tsx";
import { TermineModul, SpielplanModul, TableTab } from "./modules/TermineModul.tsx";
import { TrainingsplanModul } from "./modules/TrainingsplanModul.tsx";
import { TeamsVerwaltungModul } from "./modules/TeamsVerwaltungModul.tsx";
import { MembersView } from "./modules/MitgliederModul.tsx";
import KaderModul from "./modules/KaderModul.tsx";
import { HelferModul, HelpersList } from "./modules/HelferModul.tsx";
import NachrichtenModul from "./modules/NachrichtenModul.tsx";
import { PortalverwaltungView } from "./modules/PortalverwaltungModul.tsx";
import { BusesView, MaterialView, LockersView, MediaView, WikiView, DocsView, NewsView, AttendanceCentral } from "./modules/PlatzhalterModul.tsx";
import { DatenpruefungMitglied } from "./modules/members/tabs/DatenpruefungMitglied.tsx";
import { DatenpruefungEltern } from "./modules/members/tabs/DatenpruefungEltern.tsx";
import { fetchKinderVollstaendigFuerElternteil } from "./domains/members/elternService.ts";
import { fetchPerson } from "./domains/person/personService.ts";
import { fetchMitglied, fetchMitgliedtypPflichtfelder, fetchRollePflichtfelder } from "./domains/members/memberService.ts";
import type { RollePflichtfeld } from "./domains/members/pflichtfelder.ts";
import type {
  Account, AppTheme, DbUser, Mitglied, Mitgliedtyp, MitgliedtypPflichtfeld, ModuleAktiv, ModuleRechte,
  PortalFunktion, PortalRolle, Rolle, Sb, Team, TeamRollenMap, Tenant,
} from "./types.ts";

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
  supabaseClient: Sb;
  slug: string | null;
}

/* ── APP ROOT ── */
function Portal({supabaseClient, slug}: PortalProps){
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
  /* Pflichtfeld-Matrizen — Quelle der Datenprüfung. Solange sie leer sind
     (Ladezustand), verlangt getProfilCheck nichts. */
  const [dbTypPflichtfelder,setDbTypPflichtfelder]=useState<MitgliedtypPflichtfeld[]>([]);
  const [dbRollePflichtfelder,setDbRollePflichtfelder]=useState<RollePflichtfeld[]>([]);
  /* Die eigene Person. Seit Etappe 4 stehen Vorname, Nachname und Telefon
     dort und nicht mehr an `benutzer`. Wird für die Datenprüfung eines
     Elternteils gebraucht, der keine Mitgliedschaft hat. */
  const [eigenePerson,setEigenePerson]=useState<{vorname:string|null;nachname:string|null;telefon:string|null}|null>(null);
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
  const [elternDaten,setElternDaten]=useState<{elternkontakt:any;kinder:Mitglied[]}|null>(null);
  const [meinMitgliedDaten,setMeinMitgliedDaten]=useState<Mitglied|null>(null);
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
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadDbMitgliedtypen(); loadDbPortalRollen(); loadDbKaderRollen(); loadDbFunktionen(session?.user?.id); loadModuleConfig(); loadPflichtfelder(); loadTheme(); }
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange(function(_,session){
      setSession(session||null);
      if(session){ loadDbUser(session.user.id, session.user.email); loadDbTeams(); loadDbStufen(); loadDbMitglieder(); loadDbMitgliedtypen(); loadDbPortalRollen(); loadDbKaderRollen(); loadPflichtfelder(); loadTheme(); }
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
  } = useAppData({ sb, slug, setAppTheme, setModuleAktiv, setModuleRechte, setDbStufen,
    setDbFunktionen, setDbMitglieder, setDbMitgliedtypen, setDbPortalRollen, setDbKaderRollen,
    setSession, setDbUser, setTenant, setError });

  /* Pflichtfeld-Matrizen. Bewusst hier und nicht in useAppData: sie werden
     nur von der Datenprüfung gelesen, nicht von den Modulen. */
  async function loadPflichtfelder(){
    if(!sb) return;
    const [typ, rolle] = await Promise.all([
      fetchMitgliedtypPflichtfelder(sb),
      fetchRollePflichtfelder(sb),
    ]);
    setDbTypPflichtfelder(typ as MitgliedtypPflichtfeld[]);
    setDbRollePflichtfelder(rolle as RollePflichtfeld[]);
  }

  /* Eigene Person nachladen, sobald der Benutzer bekannt ist. */
  useEffect(()=>{
    const pid=dbUser?.person_id;
    if(!sb||!pid){ setEigenePerson(null); return; }
    let abgebrochen=false;
    sb.from("personen").select("vorname,nachname,telefon").eq("id",pid).maybeSingle()
      .then(({data})=>{ if(!abgebrochen) setEigenePerson(data ?? null); });
    return ()=>{ abgebrochen=true; };
  },[sb,dbUser?.person_id]);

  async function handleLogout(){
    await _handleLogout();
    setActive("dashboard");
  }

  /* Eltern-Daten für DatenpruefungEltern laden.
     Seit Etappe 3 haengt der Portal-Zugang an `benutzer.person_id`, und
     die Kontaktdaten stehen in `personen` — nicht mehr in
     `elternkontakte.benutzer_id`. Ohne person_id gibt es nichts zu
     laden (Konto ohne zugeordnete Person). */
  useEffect(()=>{
    if(!sb||!dbUser||dbUser.role!=="eltern"||elternDaten) return;
    if(!dbUser.person_id) return;
    (async()=>{
      const person = await fetchPerson(sb, dbUser.person_id!);
      if(!person) return;
      const kinder = await fetchKinderVollstaendigFuerElternteil(sb, person.id);
      setElternDaten({ elternkontakt: person, kinder: kinder as unknown as Mitglied[] });
    })();
  },[dbUser?.id, dbUser?.role, dbUser?.person_id]);

  /* Eigenes Mitglied laden (für Spieler/Trainer — RLS erlaubt select_self) */
  useEffect(()=>{
    if(!sb||!dbUser?.mitglied_id||meinMitgliedDaten) return;
    fetchMitglied(sb, dbUser.mitglied_id).then(data => {
      if(data) setMeinMitgliedDaten(data as unknown as Mitglied);
    });
  },[dbUser?.mitglied_id]);


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
    return <LoginScreen sb={sb} onLogin={(s: Session)=>setSession(s)} appTheme={appTheme} vereinId={tenant?.id||null}/>;
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
  const trainerTeams = trainerTeamIds.map(id=>dbTeams.find(t=>t.id===id)?.name).filter((n): n is string => !!n);
  const spielerTeam = meineTeamIds.map(id=>dbTeams.find(t=>t.id===id)?.name).filter((n): n is string => !!n);
  const meineTeams = role==="administrator"||role==="administration"
    ? dbTeams.map(t=>t.name).filter((n): n is string => !!n)
    : role==="trainer"
      ? trainerTeams.length>0 ? trainerTeams : spielerTeam
      : kinder.length>0 ? [...new Set(kinder.map(k=>k.team).filter((t): t is string => !!t))]
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
    .filter(n=>!!n.key&&isModuleVisible(n.key));

  /* ── App-Level Zugriffstufen-Hilfsfunktionen ── */
  const { kannSchreiben, kannVerwalten } = getPermissions({
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
      case "team":              return role==="administrator"||role==="administration"?<TeamsVerwaltungModul sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef} dbMitglieder={dbMitglieder} TeamViewComponent={TeamView} KaderModulComponent={KaderModul} TrainingsplanModulComponent={TrainingsplanModul} TermineModulComponent={TermineModul} SpielplanModulComponent={SpielplanModul} TableTabComponent={TableTab} HelferModulComponent={HelferModul} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)} vereinId={tenant?.id}/>:<TeamView role={role} trainerTeams={trainerTeams} teamRollen={teamRollen} setActive={setActive} myRosterId={myRosterId} account={account} sb={sb} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder} KaderModul={KaderModul} TrainingsplanModul={TrainingsplanModul} TermineModul={TermineModul} SpielplanModul={SpielplanModul} TableTab={TableTab} HelferModul={HelferModul} onSelectMember={(m: {id?: number; mitglied_id?: number})=>{setNavToMember(m.id||m.mitglied_id||null);setActivePersist("members");}} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)} vereinId={tenant?.id}/>;
      case "members":           return <MembersView role={role} account={account} dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} onReload={loadDbMitglieder} onUpdatePortalZugang={updatePortalZugang} navToMember={navToMember} onNavToMemberDone={()=>setNavToMember(null)} onNavToTeam={teamId=>{setNavToTeam(teamId);setActivePersist("team");}} vereinId={tenant?.id}/>;
      case "users":             return <PortalverwaltungView initialTab="users" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "mitglieder_config": return <PortalverwaltungView initialTab="mitglieder_config" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "portal":            return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbPortalRollen={dbPortalRollen} onReloadRollen={loadDbPortalRollen} dbKaderRollen={dbKaderRollen} onReloadKaderRollen={loadDbKaderRollen} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "training":          return <TrainingsplanModul role={role} team={role==="trainer"?meineTeams?.[0]:undefined} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} dbTeams={dbTeams} vereinId={tenant?.id}/>;
      case "schedule":          return <SpielplanModul role={role} sb={sb} vereinId={tenant?.id}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:14,color:"var(--sub)",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><TermineModul sb={sb} vereinId={tenant?.id} role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} onNavigateToSpiel={(spiel: unknown)=>{navTarget.tab="spielplan";navTarget.selectedSpiel=spiel;setActive("team");}}/></div>;
      case "helpers":           return <HelpersList role={role} meineTeams={meineTeams} account={account} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "buses":             return <BusesView role={role} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}/>;
      case "material":          return <MaterialView/>;
      case "lockers":           return <LockersView/>;
      case "media":             return <MediaView/>;
      case "nachrichten":       return <NachrichtenModul sb={sb} role={role} account={account} dbTeams={dbTeams} gruppen={dbFunktionen.map(f=>f.portal_gruppen).filter((g): g is NonNullable<typeof g> => !!g)} kannSchreiben={kannSchreiben("nachrichten")} kannVerwalten={kannVerwalten("nachrichten")} vereinId={tenant?.id}/>;
      case "news":              return <NewsView role={role} meineTeams={meineTeams}/>;
      case "wiki":              return <WikiView/>;
      case "docs":              return <DocsView/>;
      case "exports":           return <PortalverwaltungView initialTab="api" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "sync":              return <PortalverwaltungView initialTab="api" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "audit":             return <PortalverwaltungView initialTab="audit" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      case "datacheck":         return <PortalverwaltungView initialTab="module" moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv} moduleRechte={moduleRechte} setModuleRechte={setModuleRechte} sb={sb} appTheme={appTheme} setAppTheme={setAppTheme} applyThemeCss={applyThemeCss} vereinId={tenant?.id} dbTeams={dbTeams} setDbTeams={setDbTeams}/>;
      /* vereinId war hier ein undefinierter Bezeichner und lief zur Laufzeit
         in einen ReferenceError, sobald der Profil-Tab geöffnet wurde. */
      case "profile": {
        if(role === "eltern" && elternDaten) {
          return <DatenpruefungEltern
            raw={meinMitgliedDaten || dbMitglieder.find(m => m.id === dbUser?.mitglied_id) || dbMitglieder[0]}
            sb={sb}
            elternkontakt={elternDaten.elternkontakt}
            kinder={elternDaten.kinder}
            setPortalMsg={()=>{}}
            onReload={()=>{ setElternDaten(null); setMeinMitgliedDaten(null); loadDbMitglieder(); setProfilOverlayDismissed(false); }}
          />;
        }
        const meinMitglied = meinMitgliedDaten || dbMitglieder.find(m => m.id === dbUser?.mitglied_id) || null;
        if (!meinMitglied) return <div className="cc-empty-state"><div className="cc-text-sub">Profil wird geladen…</div></div>;
        return <DatenpruefungMitglied raw={meinMitglied} sb={sb} setPortalMsg={()=>{}} onReload={()=>{setMeinMitgliedDaten(null);loadDbMitglieder();setProfilOverlayDismissed(false);}}/>;
      }
      default:                  return <Dashboard role={role} setActive={setActive}/>;
    }
  };

  const { getProfilFehlend, sollProfilPruefen, markiereProfilGeprueft } = getProfilCheck({
    sb, dbUser, role, dbMitglieder, setDbUser, eigenePerson,
    typMatrix: dbTypPflichtfelder, rolleMatrix: dbRollePflichtfelder,
  });

  return(
    <ThemeCtx.Provider value={{dark,toggle:toggleDark}}>
      <div data-theme={dark?"dark":"light"} style={{display:"flex",minHeight:"100dvh",background:"var(--bg)",fontFamily:FONT,WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",color:"var(--text)",transition:"background 0.25s,color 0.25s"}}>
        {/* Profil-Pflicht Modal */}
        {(()=>{
          if(!session||role==="administrator"||role==="administration") return null;
          if(!sollProfilPruefen()||profilOverlayDismissed) return null;
          const meinMitglied = meinMitgliedDaten || dbMitglieder.find(m => m.id === dbUser?.mitglied_id) || null;
          if (!meinMitglied) return null;
          const onReload = () => { setProfilOverlayDismissed(true); setElternDaten(null); setMeinMitgliedDaten(null); loadDbMitglieder(); };
          return(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:20,overflowY:"auto"}}>
              <div style={{background:"var(--surface)",borderRadius:16,padding:24,maxWidth:560,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",margin:"auto"}}>
                {role === "eltern" && elternDaten
                  ? <DatenpruefungEltern
                      raw={meinMitglied}
                      sb={sb}
                      elternkontakt={elternDaten.elternkontakt}
                      kinder={elternDaten.kinder}
                      setPortalMsg={()=>{}}
                      onReload={onReload}
                    />
                  : <DatenpruefungMitglied
                      raw={meinMitglied}
                      sb={sb}
                      setPortalMsg={()=>{}}
                      onReload={onReload}
                    />
                }
                <button onClick={handleLogout}
                  style={{width:"100%",marginTop:12,padding:"10px",borderRadius:10,border:"0.5px solid var(--border)",background:"none",color:"var(--sub)",fontSize:13,cursor:"pointer"}}>
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
