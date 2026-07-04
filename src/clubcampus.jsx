import { useState, useEffect, useRef, createContext, useContext } from "react";
import { FONT, BP_MOBILE, BP_TABLET, BTN_COLOR as BTN, BTN_TXT, BTN_HOV, ACCENT, ACCENT2, ACCENT20, ACCENT15, ACCENT12, GN, R, RL, BL, AM, BK, GR, GB } from "./constants.js";
import { TI, TI_PATHS } from "./icons.jsx";
import { LOGO_B64, ThemeCtx, useTheme, PWA_CSS, hexToRgba, darkenHex, THEME_DEFAULT_STATIC, useBreakpoint, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, Av, Tabs, STitle , avColor} from "./theme.jsx";
import { ROSTER, USER_ACCOUNTS, SCHEDULE, GANTT , MEMBERS, FUNKTIONEN} from "./demoData.js";
import { SideNav, TopBar, MobileNav, RoleSwitcher, getNavForRole, getRole, NAV_BY_ROLE, ProfileModal, getVereinsnameStatic, maxStufe, getEffektiveStufeForFunktionaer, getModuleForFunktionaer } from "./NavigationModul.jsx";
import { Dashboard, DashboardAdmin, DashboardAdministration, DashboardFunktionaer, DashboardTrainer, DashboardSpieler, DashboardEltern } from "./DashboardModul.jsx";
import { TeamView, TeamOverview, EventsList } from "./TeamModul.jsx";
import { SlotModal, SpielDetail, TermineModul, SpielplanModul, TableTab } from "./TermineModul.jsx";
import { TrainingsplanModul, PlaetzeView } from "./TrainingsplanModul.jsx";
import { TeamsVerwaltungModul } from "./TeamsVerwaltungModul.jsx";
import MitgliederModul, { MembersView } from "./MitgliederModul.jsx";
import KaderModul from "./KaderModul.jsx";
import { HelferModul, HelpersList } from "./HelferModul.jsx";
import NachrichtenModul from "./NachrichtenModul.jsx";
import { TeamModuleMatrix, PortalverwaltungView } from "./PortalverwaltungModul.jsx";
import { BusesView, MaterialView, LockersView, MediaView, WikiView, DocsView, NewsView, AttendanceCentral, ProfileView, DarkModeRow, DataCheckView, getTeamsFromFunktionen, getTeamsFromGruppen } from "./PlatzhalterModul.jsx";


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
          <div className="cc-flex-1"><Skel h={11} w="60%" br={4} mb={7}/><Skel h={9} w="40%" br={4}/></div>
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

/* ── Shared navigation target (cross-module) ── */
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
const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};
(async()=>{
  try{
    const res=await window.storage.get("rueckennrn");
    if(res){const d=JSON.parse(res.value);Object.assign(NR_CACHE.data,d);}
  }catch(e){}
})();


















/* ==========================================
   KLEINE HILFKOMPONENTEN
========================================== */
/* ==========================================
   ROLLEN-SWITCHER MODAL
========================================== */
/* ==========================================
   LAYOUT
========================================== */
/* ==========================================
   MEIN TEAM (rollenabhängig)
========================================== */

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


/* ==========================================
   ADMIN-EXKLUSIVE VIEWS
========================================== */
/* Vereinsfunktion → farbiger Chip */





/* ==========================================
   PROFIL MODAL
========================================== */
/* ── DARK MODE ROW (für ProfileModal) ── */

/* ==========================================
   APP ROOT
========================================== */
function LoginScreen({onLogin, sb, appTheme}){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [mode,setMode]=useState("login"); // "login" | "register" | "reset"
  const [resetSent,setResetSent]=useState(false);
  const [regDone,setRegDone]=useState(false);

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {data,error:err}=await sb.auth.signInWithPassword({email,password:pw});
      if(err) throw err;
      onLogin(data.session);
    }catch(err){
      setError(err.message==="Invalid login credentials"?"E-Mail oder Passwort falsch.":err.message||"Fehler beim Einloggen.");
    }
    setLoading(false);
  }

  async function handleRegister(e){
    e.preventDefault();
    if(pw!==pw2){ setError("Passwörter stimmen nicht überein."); return; }
    if(pw.length<6){ setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    setLoading(true); setError("");
    try{
      console.log("[FCH] Registrierung prüfe E-Mail:", email, "sb:", !!sb);
      const [{data:m, error:mErr},{data:ek, error:ekErr}] = await Promise.all([
        sb.from("mitglieder").select("id,vorname,nachname").eq("email",email).eq("aktiv",true).limit(1),
        sb.from("elternkontakte").select("id,name").eq("email",email).limit(1),
      ]);
      console.log("[FCH] mitglieder:", m, mErr, "elternkontakte:", ek, ekErr);
      const istBekannt = (m&&m.length>0) || (ek&&ek.length>0);
      if(!istBekannt){
        setError("Diese E-Mail ist nicht im System hinterlegt. Bitte wende dich an deinen Verein.");
        setLoading(false);
        return;
      }
      const dbName = m?.[0] ? `${m[0].vorname} ${m[0].nachname}`.trim()
        : ek?.[0] ? ek[0].name||email.split("@")[0]
        : email.split("@")[0];
      const {data,error:err}=await sb.auth.signUp({email, password:pw, options:{data:{name:dbName}}});
      console.log("[FCH] signUp result:", data, err);
      if(err) throw err;
      // Auto-Verknüpfung nach Registrierung
      if(data.user){
        const uid=data.user.id;
        // Benutzer-Eintrag kurz warten (Trigger braucht einen Moment)
        await new Promise(r=>setTimeout(r,1000));
        const {data:bu}=await sb.from("benutzer").select("id").eq("id",uid).maybeSingle();
        if(bu){
          // Mitglied verknüpfen
          if(m?.[0]) await sb.from("benutzer").update({mitglied_id:m[0].id}).eq("id",uid);
          // Elternkontakt verknüpfen
          if(ek?.[0]) await sb.from("elternkontakte").update({benutzer_id:uid}).eq("id",ek[0].id);
        }
      }
      if(data.session){ onLogin(data.session); } else { setRegDone(true); }
    }catch(err){ setError(err.message||"Fehler bei der Registrierung."); }
    setLoading(false);
  }

  async function handleReset(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {error:err}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
      if(err) throw err;
      setResetSent(true);
    }catch(err){ setError(err.message||"Fehler beim Senden."); }
    setLoading(false);
  }

  const S_INPUT={width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box",background:"var(--surface2)",color:"var(--text)"};
  const S_LABEL={fontSize:14,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:5};

  return(
    <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,WebkitFontSmoothing:"antialiased",color:"var(--text)"}}>
      <div style={{width:"100%",maxWidth:400,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:16,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,overflow:"hidden"}}>
            <img src={appTheme?.logo||LOGO_B64} style={{width:64,height:64,objectFit:"cover"}} alt="Logo"/>
          </div>
          <div style={{fontWeight:800,fontSize:21,color:"var(--text)",marginTop:4}}>{appTheme?.vereinsname||getVereinsnameStatic()}</div>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3,fontWeight:600}}>ClubCampus</div>
        </div>
        <div style={{background:"var(--surface)",borderRadius:16,padding:28,boxShadow:"var(--card-shadow)",border:"1px solid var(--border)"}}>

          {/* LOGIN */}
          {mode==="login"&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>Anmelden</div>
              <form onSubmit={handleLogin}>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch" autoComplete="email"/>
                </div>
                <div className="cc-mb-20">
                  <label style={S_LABEL}>Passwort</label>
                  <div style={{position:"relative"}}>
                    <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} required
                      style={{...S_INPUT,paddingRight:40}} placeholder="••••••••" autoComplete="current-password"/>
                    <button type="button" onClick={()=>setShowPw(p=>!p)}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--sub)",padding:4,display:"flex",alignItems:"center"}}>
                      <TI n={showPw?"eye-off":"eye"} size={16}/>
                    </button>
                  </div>
                </div>
                {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird angemeldet…":"Anmelden"}
                </button>
              </form>
              <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
                <button onClick={()=>{setMode("reset");setError("");}}
                  style={{background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>
                  Passwort vergessen?
                </button>
                <div style={{width:"100%",height:"0.5px",background:"var(--border)"}}/>
                <div className="cc-text-sm">Noch kein Konto?</div>
                <button onClick={()=>{setMode("register");setError("");setPw("");}}
                  style={{width:"100%",padding:"10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                  Registrieren
                </button>
              </div>
            </>
          )}

          {/* REGISTRIEREN */}
          {mode==="register"&&!regDone&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Konto erstellen</div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:20,lineHeight:1.5}}>
                Verwende die E-Mail-Adresse die der Verein bei dir hinterlegt hat. Nur bekannte E-Mail-Adressen können sich registrieren.
              </div>
              <form onSubmit={handleRegister}>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch" autoComplete="email"/>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>Passwort</label>
                  <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required style={S_INPUT} placeholder="Mindestens 6 Zeichen" autoComplete="new-password"/>
                </div>
                <div className="cc-mb-20">
                  <label style={S_LABEL}>Passwort bestätigen</label>
                  <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required style={S_INPUT} placeholder="••••••••" autoComplete="new-password"/>
                </div>
                {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird registriert…":"Konto erstellen"}
                </button>
              </form>
              <button onClick={()=>{setMode("login");setError("");setPw("");setPw2("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}

          {/* REGISTRIERUNG ERFOLGREICH */}
          {mode==="register"&&regDone&&(
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:40,marginBottom:16}}>📧</div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Fast geschafft!</div>
              <div style={{fontSize:14,color:"var(--sub)",lineHeight:1.6,marginBottom:20}}>
                Bestätigungs-E-Mail an <strong>{email}</strong> gesendet. Klicke auf den Link um dein Konto zu aktivieren.
              </div>
              <button onClick={()=>{setMode("login");setRegDone(false);setPw("");setPw2("");}}
                style={{width:"100%",padding:"10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Zum Login
              </button>
            </div>
          )}

          {/* PASSWORT RESET */}
          {mode==="reset"&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Passwort zurücksetzen</div>
              <div style={{fontSize:14,color:"var(--sub)",marginBottom:20}}>Wir senden dir einen Link per E-Mail.</div>
              {resetSent?(
                <div style={{fontSize:14,color:GN,background:"#ECFDF5",padding:"12px",borderRadius:8,textAlign:"center"}}>
                  E-Mail gesendet! Bitte prüfe dein Postfach.
                </div>
              ):(
                <form onSubmit={handleReset}>
                  <div style={{marginBottom:14}}>
                    <label style={S_LABEL}>E-Mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch"/>
                  </div>
                  {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                  <button type="submit" disabled={loading}
                    style={{width:"100%",padding:"8px 14px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    {loading?"Wird gesendet…":"Link senden"}
                  </button>
                </form>
              )}
              <button onClick={()=>{setMode("login");setResetSent(false);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

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

  async function loadDbUser(uid, email){
    try {
      const {data, error} = await sb.from("benutzer").select("*").eq("id",uid).single();
      if(data){
        setDbUser(data);
        // Kader-Einträge laden für Team-Rollen
        if(data.mitglied_id){
          const {data:kaderData}=await sb.from("kader")
            .select("team_id, rollen")
            .eq("mitglied_id", data.mitglied_id)
            .eq("aktiv", true);
          if(kaderData){
            const ROLLE_MAP={
              "Spieler/in":"spieler","Trainer/in":"trainer","Co-Trainer/in":"trainer",
              "Goalietrainer/in":"trainer","Assistenz":"funktionaer","Masseur/in":"funktionaer",
            };
            const PRIORITAET=["administrator","administration","funktionaer","trainer","spieler","eltern","supporter"];
            const map={};
            kaderData.forEach(k=>{
              const portalRollen=(k.rollen||[]).map(r=>ROLLE_MAP[r]).filter(Boolean);
              const hoechste=PRIORITAET.find(p=>portalRollen.includes(p))||"spieler";
              map[k.team_id]=hoechste;
            });
            setTeamRollen(map);
            // Höchste Rolle über alle Teams → benutzer.role updaten
            const alleRollen=Object.values(map);
            const hoechsteGlobal=PRIORITAET.find(p=>alleRollen.includes(p));
            if(hoechsteGlobal&&hoechsteGlobal!==data.role){
              await sb.from("benutzer").update({role:hoechsteGlobal}).eq("id",uid);
              setDbUser(prev=>({...prev,role:hoechsteGlobal}));
            }
          }
        }
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
      const{data,error}=await sb.from("teams").select("*").eq("aktiv",true).order("hauptbereich").order("name");
      if(error) console.warn("[FCH] loadDbTeams error:", error.message);
      if(data&&data.length>0){
        // module_teams optional laden
        let mods=[];
        try{
          const{data:modData}=await sb.from("team_module").select("*");
          mods=modData||[];
        }catch(e){}
        setDbTeams(data.map(t=>({
          ...t,
          module_aktiv:mods.filter(m=>m.team_id===t.id&&m.aktiv).map(m=>m.modul)
        })));
      }
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
      --cc-accent-25:${hexToRgba(acc,0.25)}!important;
      --cc-accent-20:${hexToRgba(acc,0.12)}!important;
      --cc-accent-15:${hexToRgba(acc,0.09)}!important;
      --cc-accent-12:${hexToRgba(acc,0.07)}!important;
      --cc-accent-10:${hexToRgba(acc,0.10)}!important;
      --cc-accent-5:${hexToRgba(acc,0.05)}!important;
      --nav:${nav}!important;
      --nav-t:${navT}!important;
      --nav-a:${navA}!important;
      --nav-accent-text:${navAT}!important;
      --avatar-bg:${avBg}!important;
      --cc-avatar-text:${avTxt}!important;
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

  async function loadDbMitgliedtypen(){
    if(!sb) return;
    try{
      const{data}=await sb.from("mitgliedtypen").select("*").eq("aktiv",true).order("sort_order");
      if(data) setDbMitgliedtypen(data);
    }catch(e){ console.warn("[FCH] loadDbMitgliedtypen:", e.message); }
  }

  async function loadDbPortalRollen(){
    if(!sb) return;
    try{
      const{data}=await sb.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
      if(data) setDbPortalRollen(data);
    }catch(e){ console.warn("[FCH] loadDbPortalRollen:", e.message); }
  }

  async function loadDbKaderRollen(){
    if(!sb) return;
    try{
      const{data}=await sb.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order");
      if(data) setDbKaderRollen(data);
    }catch(e){ console.warn("[FCH] loadDbKaderRollen:", e.message); }
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
          <div className="cc-text-sm">Wird geladen…</div>
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
  const APP_ZUGRIFF_DEFAULT={
    administrator:  {_all:"verwalten"},
    administration: {_all:"verwalten",dashboard:"lesen"},
    funktionaer:    {_all:"lesen"},
    trainer:        {_all:"lesen",team:"verwalten",training:"verwalten",events:"verwalten",attendance_central:"schreiben",helpers:"verwalten",buses:"schreiben",material:"schreiben",media:"schreiben",wiki:"schreiben",members:"schreiben",schedule:"lesen"},
    spieler:        {_all:"lesen",events:"schreiben",helpers:"schreiben",buses:"schreiben"},
    eltern:         {_all:"lesen",events:"schreiben",helpers:"schreiben",schedule:"lesen"},
    supporter:      {_all:"lesen",helpers:"schreiben"},
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
      case "team":              return role==="administrator"||role==="administration"?<TeamsVerwaltungModul sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} dbStufen={dbStufen} setDbStufen={setDbStufen} setCustomBack={setCustomBackAndRef} dbMitglieder={dbMitglieder} TeamViewComponent={TeamView} KaderModulComponent={KaderModul} TrainingsplanModulComponent={TrainingsplanModul} TermineModulComponent={TermineModul} SpielplanModulComponent={SpielplanModul} TableTabComponent={TableTab} HelferModulComponent={HelferModul} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>:<TeamView role={role} trainerTeams={trainerTeams} teamRollen={teamRollen} setActive={setActive} myRosterId={myRosterId} account={account} dbTeams={dbTeams} isModuleVisible={isModuleVisible} dbMitglieder={dbMitglieder} KaderModul={KaderModul} TrainingsplanModul={TrainingsplanModul} TermineModul={TermineModul} SpielplanModul={SpielplanModul} TableTab={TableTab} HelferModul={HelferModul} onSelectMember={m=>{setNavToMember(m.id||m.mitglied_id);setActivePersist("members");}} navToTeam={navToTeam} onNavToTeamDone={()=>setNavToTeam(null)}/>;
      case "members":           return <MembersView role={role} dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen} kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten} sb={sb} onReload={loadDbMitglieder} navToMember={navToMember} onNavToMemberDone={()=>setNavToMember(null)} onNavToTeam={teamId=>{setNavToTeam(teamId);setActivePersist("team");}}/>;
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
      case "profile":           return <ProfileView role={role} myRosterId={myRosterId} account={account} sb={sb} dbUser={dbUser} dbMitglieder={dbMitglieder} onReload={()=>{loadDbMitglieder();setProfilOverlayDismissed(false);}} onProfilGeprueft={markiereProfilGeprueft}/>;
      default:                  return <Dashboard role={role} setActive={setActive}/>;
    }
  };

  function getProfilFehlend(){
    if(!dbUser) return [];
    const isEltern=role==="eltern"&&!dbMitglieder.find(m=>m.id===dbUser.mitglied_id);
    if(isEltern){
      const fehlend=[];
      // Eigene Daten
      if(!dbUser.vorname) fehlend.push("vorname");
      if(!dbUser.nachname) fehlend.push("nachname");
      if(!dbUser.telefon) fehlend.push("telefon");
      // Kinder-Daten: alle verknüpften Kinder prüfen
      const kinder=dbMitglieder.filter(m=>
        (m.eltern||[]).some(e=>e.benutzer_id===dbUser.id)
      );
      kinder.forEach(kind=>{
        if(!kind.geburtsdatum) fehlend.push(`${kind.vorname}: Geburtsdatum`);
        if(!kind.nationalitaet) fehlend.push(`${kind.vorname}: Nationalität`);
        if(!kind.strasse) fehlend.push(`${kind.vorname}: Adresse`);
      });
      return fehlend;
    }
    const raw=dbMitglieder.find(m=>m.id===dbUser.mitglied_id)||{};
    const isPassiv=["Passivmitglied","Ehrenmitglied","Gönner"].includes(raw.mitgliedtyp);
    const fehlend=[];
    if(!raw.vorname) fehlend.push("vorname");
    if(!raw.nachname) fehlend.push("nachname");
    if(!isPassiv&&!raw.geburtsdatum) fehlend.push("geburtsdatum");
    if(!raw.telefon&&!raw.email) fehlend.push("telefon");
    return fehlend;
  }

  function sollProfilPruefen(){
    if(!dbUser||role==="administrator"||role==="administration") return false;
    const raw=dbMitglieder.find(m=>m.id===dbUser.mitglied_id)||null;
    const sechsMonate=new Date();
    sechsMonate.setMonth(sechsMonate.getMonth()-6);

    // Eigenes geprueft_at (aus mitglieder oder benutzer)
    const eigenesGeprueft=raw?.profil_geprueft_at||dbUser.profil_geprueft_at;
    if(!eigenesGeprueft) return true;
    if(new Date(eigenesGeprueft)<sechsMonate) return true;

    // Für Eltern: auch Kinder prüfen
    if(role==="eltern"){
      const kinder=dbMitglieder.filter(m=>
        (m.eltern||[]).some(e=>e.benutzer_id===dbUser.id)
      );
      for(const kind of kinder){
        if(!kind.profil_geprueft_at) return true;
        if(new Date(kind.profil_geprueft_at)<sechsMonate) return true;
      }
    }

    return false;
  }

  async function markiereProfilGeprueft(){
    if(!sb||!dbUser) return;
    const now=new Date().toISOString();
    // Eigenes benutzer-Eintrag
    await sb.from("benutzer").update({profil_geprueft_at:now}).eq("id",dbUser.id);
    // Für Eltern: alle Kinder ebenfalls markieren
    if(role==="eltern"){
      const kinder=dbMitglieder.filter(m=>
        (m.eltern||[]).some(e=>e.benutzer_id===dbUser.id)
      );
      for(const kind of kinder){
        await sb.from("mitglieder").update({profil_geprueft_at:now}).eq("id",kind.id);
      }
    }
    setDbUser(u=>u?{...u,profil_geprueft_at:now}:u);
  }

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
                    <circle cx="26" cy="26" r="26" fill="var(--cc-accent,#FFBF00)" fillOpacity="0.15"/>
                    <path d="M18 16h4.5a3.5 3.5 0 0 1 7 0H34a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z" stroke="var(--cc-accent,#FFBF00)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M22 16a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1H22v-1z" fill="var(--cc-accent,#FFBF00)" fillOpacity="0.5"/>
                    <path d="M21 25h10M21 30h7" stroke="var(--cc-accent,#FFBF00)" strokeWidth="2" strokeLinecap="round"/>
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
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"var(--cc-accent,#FFBF00)",color:"var(--text)",fontWeight:700,fontSize:15,cursor:"pointer"}}>
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
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"var(--cc-accent,#FFBF00)",color:"var(--text)",fontWeight:700,fontSize:15,cursor:"pointer"}}>
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
          <main key={active} className="cc-page" style={{flex:1,overflowY:"auto",overflowX:"hidden"}}><div style={{maxWidth:1600,margin:"0 auto",padding:isMobile?"16px 12px calc(90px + env(safe-area-inset-bottom, 0px))":isTablet?"20px 24px 28px":"32px 48px",minHeight:"100%"}}>{getView()}</div></main>
          {isMobile&&<MobileNav role={role} active={active} setActive={setActivePersist} account={account} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined} effectiveNav={effectiveNav}/>}
        </div>
      </div>
      {isMobile&&<ProfileModal open={mobileProfileOpen} onClose={()=>setMobileProfileOpen(false)} account={account} role={role} sb={sb} onNameUpdated={n=>setDbUser(u=>u?{...u,name:n}:u)} onLogout={sb&&session?handleLogout:undefined}/>}
    </ThemeCtx.Provider>
  );
}

export default Portal;
