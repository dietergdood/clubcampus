/* ═══════════════════════════════════════════════════════════════
   ClubCampus PortalverwaltungModul — PortalverwaltungModul.jsx
   Portalverwaltung: Module, Berechtigungen, Benutzer, Aussehen
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT, ACCENT2, ACCENT20, GN, R, RL, BL, AM, BK, GR, GB } from "./constants";
import { TI } from "./icons.jsx";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, LOGO_B64, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip } from "./theme.jsx";

/* ── Geteilte Konstanten ── */
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
const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
function maxStufe(a, b){
  if(!a) return b; if(!b) return a;
  return STUFE_RANG[a]>STUFE_RANG[b]?a:b;
}

function TeamModuleMatrix({supabase,setSaveMsg}){
  const sb=supabase;
  const isMobile=useIsMobile();
  const [expandedTeam,setExpandedTeam]=useState(null);
  const [teams,setTeams]=useState([]);
  const [moduleMap,setModuleMap]=useState({}); // {team_id: [modul,...]}
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [filterHaupt,setFilterHaupt]=useState("alle");

  const TEAM_MODS=[
    {key:"roster",            label:"Kader",       icon:"users"},
    {key:"training",          label:"Training",    icon:"clock"},
    {key:"spielplan",         label:"Spielplan",   icon:"flag"},
    {key:"events",            label:"Termine",     icon:"calendar"},
    {key:"attendance_central",label:"Anwesenheit", icon:"chart-bar"},
    {key:"helpers",           label:"Helfer",      icon:"heart-handshake"},
    {key:"polls",             label:"Abstimmungen",icon:"speakerphone"},
    {key:"stats",             label:"Statistik",   icon:"chart-line"},
    {key:"media",             label:"Medien",      icon:"photo"},
    {key:"news",              label:"News",        icon:"news"},
    {key:"wiki",              label:"Wiki",        icon:"book"},
    {key:"docs",              label:"Dokumente",   icon:"file-text"},
    {key:"nachrichten",       label:"Nachrichten", icon:"message"},
  ];

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        if(sb){
          const[tR,tmR]=await Promise.all([
            sb.from("teams").select("id,name,hauptbereich,kurzname").eq("aktiv",true).order("hauptbereich").order("name"),
            sb.from("team_module").select("team_id,modul,aktiv"),
          ]);
          if(tR.data) setTeams(tR.data);
          if(tmR.data){
            const m={};
            tmR.data.forEach(r=>{
              if(!m[r.team_id]) m[r.team_id]=[];
              if(r.aktiv!==false) m[r.team_id].push(r.modul);
            });
            setModuleMap(m);
          }
        }
      }catch(e){ console.warn("[FCH] TeamModuleMatrix:", e.message); }
      setLoading(false);
    })();
  },[]);

  async function toggleTeamModul(teamId, modul, forceAktiv=null){
    const cur=moduleMap[teamId]||TEAM_MODS.map(m=>m.key);
    const isOn=cur.includes(modul);
    const nextOn=forceAktiv!==null?forceAktiv:!isOn;
    const neu={...moduleMap,[teamId]:nextOn?[...new Set([...cur,modul])]:cur.filter(m=>m!==modul)};
    setModuleMap(neu);
    if(sb){
      await sb.from("team_module").upsert({team_id:teamId,modul,aktiv:nextOn},{onConflict:"team_id,modul"});
    }
  }

  async function applyToAll(modul, aktiv){
    if(!sb) return;
    setSaving(true);
    const rows=teams.map(t=>({team_id:t.id,modul,aktiv}));
    await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
    const neu={...moduleMap};
    teams.forEach(t=>{
      const cur=neu[t.id]||TEAM_MODS.map(m=>m.key);
      neu[t.id]=aktiv?[...new Set([...cur,modul])]:cur.filter(m=>m!==modul);
    });
    setModuleMap(neu);
    setSaving(false);
    setSaveMsg(`${TEAM_MODS.find(m=>m.key===modul)?.label||modul} für alle Teams ${aktiv?"aktiviert":"deaktiviert"}`);
    setTimeout(()=>setSaveMsg(""),2000);
  }

  if(loading) return <div style={{padding:20,color:"var(--sub)",fontSize:13}}>Lade Team-Module…</div>;

  const hauptbereiche=["alle",...[...new Set(teams.map(t=>t.hauptbereich).filter(Boolean))]];
  const filtered=filterHaupt==="alle"?teams:teams.filter(t=>t.hauptbereich===filterHaupt);

  const HB_COLORS={"Aktivfussball":"#3B82F6","Juniorenfussball":"#22C55E","Mädchenfussball":"#EC4899","Senioren":"#F97316","Freizeitfussball":"#8B5CF6"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16}}>
        <InfoBox text="Klick auf ein Icon aktiviert/deaktiviert das Modul pro Team. Spalten-Buttons setzen ein Modul für alle gefilterten Teams." color={BL}/>
        {saving&&<span style={{fontSize:13,color:"var(--sub)"}}>Speichert…</span>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {hauptbereiche.map(h=>{
          const col=HB_COLORS[h]||BK;
          const isActive=filterHaupt===h;
          return(
            <button key={h} onClick={()=>setFilterHaupt(h)} style={{
              padding:"5px 14px",borderRadius:20,fontFamily:FONT,fontSize:13,cursor:"pointer",
              fontWeight:isActive?700:400,transition:"all 0.12s",
              border:`1.5px solid ${isActive?col:"var(--border)"}`,
              background:isActive?col+"15":"transparent",color:isActive?col:"var(--sub)"
            }}>{h==="alle"?"Alle":h}</button>
          );
        })}
      </div>
      {isMobile?(
        /* Mobile: ausklappbare Team-Liste */
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(t=>{
            const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
            const isOpen=expandedTeam===t.id;
            const aktiveCount=TEAM_MODS.filter(m=>aktive.includes(m.key)).length;
            return(
              <div key={t.id} style={{borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",overflow:"hidden"}}>
                {/* Team Header */}
                <div onClick={()=>setExpandedTeam(isOpen?null:t.id)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{width:4,height:36,borderRadius:2,background:HB_COLORS[t.hauptbereich]||"var(--border)",flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{t.name}</div>
                    <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{aktiveCount}/{TEAM_MODS.length} Module aktiv</div>
                  </div>
                  <TI n={isOpen?"chevron-up":"chevron-down"} size={16} style={{color:"var(--sub)",flexShrink:0}}/>
                </div>
                {/* Expandierte Module */}
                {isOpen&&(
                  <div style={{borderTop:"1px solid var(--border)",padding:"12px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {TEAM_MODS.map(m=>{
                      const isOn=aktive.includes(m.key);
                      return(
                        <div key={m.key} onClick={()=>toggleTeamModul(t.id,m.key)}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",
                            background:isOn?GN+"12":"var(--surface2)",border:`1px solid ${isOn?GN:"var(--border)"}`}}>
                          <div style={{width:18,height:18,borderRadius:4,background:isOn?GN:"transparent",border:`1.5px solid ${isOn?GN:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {isOn&&<TI n="check" size={11} style={{color:"#fff"}}/>}
                          </div>
                          <span style={{fontSize:13,fontWeight:isOn?600:400,color:isOn?"var(--text)":"var(--sub)"}}>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ):(
        /* Desktop: Tabelle */
        <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
              <th style={{padding:"10px 16px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4,minWidth:180,position:"sticky",left:0,background:"var(--surface2)",zIndex:2}}>
                Team <span style={{fontWeight:400,opacity:0.6}}>({filtered.length})</span>
              </th>
              {TEAM_MODS.map(m=>(
                <th key={m.key} style={{padding:"10px 4px",textAlign:"center",minWidth:56}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <div style={{width:32,height:32,borderRadius:8,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <TI n={m.icon||"circle"} size={16} style={{color:"var(--sub)"}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--sub)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,maxWidth:50,textAlign:"center",lineHeight:1.2}}>{m.label}</span>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>applyToAll(m.key,true)} title={`Alle: ${m.label} ein`}
                        style={{width:18,height:18,borderRadius:4,border:"none",background:GN,color:"#fff",cursor:"pointer",fontFamily:FONT,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</button>
                      <button onClick={()=>applyToAll(m.key,false)} title={`Alle: ${m.label} aus`}
                        style={{width:18,height:18,borderRadius:4,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer",fontFamily:FONT,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✗</button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const rows=[];
              let lastHB=null;
              filtered.forEach((t,i)=>{
                if(filterHaupt==="alle"&&t.hauptbereich!==lastHB){
                  lastHB=t.hauptbereich;
                  const col=HB_COLORS[t.hauptbereich]||"var(--sub)";
                  rows.push(
                    <tr key={`hb-${t.hauptbereich}`}>
                      <td colSpan={TEAM_MODS.length+1} style={{padding:"6px 16px 4px",fontSize:11,fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:i>0?"1px solid var(--border)":"none"}}>
                        {t.hauptbereich||"Weitere"}
                      </td>
                    </tr>
                  );
                }
                const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
                const allAktiv=TEAM_MODS.every(m=>aktive.includes(m.key));
                rows.push(
                  <tr key={t.id} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"transparent":"var(--surface2)"}}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--hover,rgba(0,0,0,0.04))"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"var(--surface2)"}>
                    <td style={{padding:"8px 16px",fontWeight:600,color:"var(--text)",position:"sticky",left:0,background:"var(--surface)",fontSize:13,zIndex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:3,height:20,borderRadius:2,background:HB_COLORS[t.hauptbereich]||"var(--border)",flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                          {t.kurzname&&t.kurzname!==t.name&&<div style={{fontSize:11,color:"var(--sub)"}}>{t.kurzname}</div>}
                        </div>
                        <div onClick={()=>TEAM_MODS.forEach(m=>toggleTeamModul(t.id,m.key,!allAktiv))}
                          title={allAktiv?"Alle deaktivieren":"Alle aktivieren"}
                          style={{width:30,height:18,borderRadius:8,cursor:"pointer",
                            background:allAktiv?GN:"var(--border)",
                            position:"relative",transition:"background 0.15s",flexShrink:0}}>
                          <div style={{position:"absolute",top:2,left:allAktiv?14:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                        </div>
                      </div>
                    </td>
                    {TEAM_MODS.map(m=>{
                      const isOn=aktive.includes(m.key);
                      return(
                        <td key={m.key} style={{textAlign:"center",padding:"6px 4px"}}>
                          <div onClick={()=>toggleTeamModul(t.id,m.key)}
                            title={`${t.name}: ${m.label} ${isOn?"deaktivieren":"aktivieren"}`}
                            style={{width:30,height:18,borderRadius:8,margin:"0 auto",cursor:"pointer",
                              background:isOn?GN:"var(--border)",
                              position:"relative",transition:"background 0.15s",flexShrink:0}}>
                            <div style={{position:"absolute",top:2,left:isOn?14:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              });
              return rows;
            })()}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}

function PortalverwaltungView({initialTab="module",moduleAktiv={},setModuleAktiv,moduleRechte,setModuleRechte,sb:supabase,appTheme,setAppTheme,applyThemeCss:applyTheme,vereinId}){
  const isMobile=useIsMobile();
  const [tab,setTab]=useState(isMobile?"overview":(initialTab||"module"));
  const [module,setModule]=useState([]);
  const [moduleConfig,setModuleConfig]=useState({});
  const [moduleBerechtigungen,setModuleBerechtigungen]=useState({});
  const [felder,setFelder]=useState([]);
  const [apiVerbindungen,setApiVerbindungen]=useState([]);
  const [auditLogs,setAuditLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saveMsg,setSaveMsg]=useState("");
  const [expandedModul,setExpandedModul]=useState(null);
  const [benutzerListe,setBenutzerListe]=useState([]);
  /* Gruppen & Funktionen */
  const [gruppen,setGruppen]=useState([]);
  const [funktionen,setFunktionen]=useState([]);
  const [selectedGruppe,setSelectedGruppe]=useState(null);
  const [showGruppeForm,setShowGruppeForm]=useState(false);
  const [showFunktionForm,setShowFunktionForm]=useState(false);
  const [editGruppe,setEditGruppe]=useState(null);
  const [editFunktion,setEditFunktion]=useState(null);
  const [gruppeForm,setGruppeForm]=useState({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{}});
  const [funktionForm,setFunktionForm]=useState({name:"",beschreibung:"",gruppe_id:"",module_override:[],teams:[],filter:{},stufe_override:{}});
  /* Module & Rechte View-Toggle */
  const [moduleViewMode,setModuleViewMode]=useState("modul");
  const [moduleDirty,setModuleDirty]=useState(false);

  /* ── Aussehen / Theme ── */
  const theme=appTheme||THEME_DEFAULT_STATIC;
  const themeRef=useRef(theme);
  themeRef.current=theme;
  const setTheme=(updater)=>{
    const newTheme=typeof updater==="function"?updater(theme):updater;
    setAppTheme(newTheme);
  };
  const [themeDirty,setThemeDirty]=useState(false);

  function updateTheme(key,val){
    const updated={...themeRef.current,[key]:val};
    themeRef.current=updated;
    setAppTheme(updated);
    /* CSS sofort anwenden via applyThemeCss */
    if(applyTheme) applyTheme(updated);
    setThemeDirty(true);
  }
  function saveTheme(){
    try{
      /* CSS sofort anwenden */
      const r=document.documentElement.style;
      const td={...THEME_DEFAULT_STATIC,...themeRef.current};
      r.setProperty("--cc-accent",    td.vereinsfarbe1||"#FFBF00");
      r.setProperty("--cc-accent2",   td.vereinsfarbe2||"#000000");
      r.setProperty("--cc-hover",     hexToRgba(td.vereinsfarbe1||"#FFBF00",0.19));
      r.setProperty("--cc-accent-20", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.12));
      r.setProperty("--cc-accent-15", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.09));
      r.setProperty("--cc-accent-12", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.07));
      r.setProperty("--nav",          td.navBg||"#000000");
      r.setProperty("--nav-t",        td.navText||"#FFFFFF");
      r.setProperty("--nav-a",        td.navAccent||"#FFBF00");
      r.setProperty("--nav-hover",    td.navHover||"#1A1A1A");
      r.setProperty("--btn-primary",  td.btnPrimary||"#FFBF00");
      r.setProperty("--btn-primary-text",td.btnPrimaryText||"#000000");
      r.setProperty("--btn-hover",    darkenHex(td.btnPrimary||"#FFBF00"));
      /* React State + localStorage */
      const themeToSave={...td};
      setAppTheme(themeToSave);
      if(applyTheme) applyTheme(themeToSave);
      try{localStorage.setItem("cc-theme",JSON.stringify(themeToSave));}catch{}
      /* Supabase → vereine.theme */
      if(supabase){
        const vId=vereinId;
        if(!vId) return setSaveMsg("Fehler: Verein nicht geladen");
        supabase.from("vereine")
          .update({theme:themeToSave})
          .eq("id",vId)
          .then(({error:e})=>{
            if(e) setSaveMsg("Fehler: "+e.message);
            else setSaveMsg("Theme gespeichert ✓");
            setTimeout(()=>setSaveMsg(""),2500);
          });
      } else {
        setSaveMsg("Lokal gespeichert");
        setTimeout(()=>setSaveMsg(""),2000);
      }
      setThemeDirty(false);
    }catch(err){
      console.error("[saveTheme]",err);
      setSaveMsg("Fehler: "+err.message);
      setTimeout(()=>setSaveMsg(""),4000);
    }
  }
  /* moduleAktiv + moduleRechte kommen als Props von App */

  const TABS=[
    {key:"module",      label:"Module & Rechte",      icon:"layout-grid"},
    {key:"gruppen",     label:"Gruppen & Funktionen",  icon:"sitemap"},
    {key:"teammodule",  label:"Team-Module",           icon:"wappen"},
    {key:"users",       label:"Benutzer & Rollen",     icon:"users"},
    {key:"aussehen",    label:"Aussehen",               icon:"palette"},
    {key:"feldvis",     label:"Feldsichtbarkeit",       icon:"eye"},
    {key:"api",         label:"API-Verbindungen",       icon:"plug"},
    {key:"audit",       label:"Audit-Logs",             icon:"clipboard-list"},
  ];

  /* Mobile: 4 Kacheln die Tabs zusammenfassen */
  const MOBILE_KACHELN=[
    {key:"berechtigungen", label:"Berechtigungen", icon:"shield-lock",    color:"#3B82F6", tabs:["module","gruppen","teammodule","feldvis"]},
    {key:"benutzer",       label:"Benutzer",        icon:"users",          color:"#10B981", tabs:["users"]},
    {key:"aussehen",       label:"Erscheinungsbild",icon:"palette",        color:"#F59E0B", tabs:["aussehen"]},
    {key:"system",         label:"System",          icon:"settings",       color:"#6366F1", tabs:["api","audit"]},
  ];

  const ROLLEN=["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"];
  const ROLLEN_LABELS={administrator:"Admin",vorstand:"Vorstand",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Eltern"};
  const KATEGORIEN=["kern","sport","kommunikation","betrieb","verwaltung","admin"];
  const KAT_LABELS={kern:"Kern",sport:"Sport",kommunikation:"Kommunikation",betrieb:"Betrieb",verwaltung:"Verwaltung",admin:"Systemverwaltung"};

  const API_INFOS={
    fairgate:   {description:"Mitglieder, Gruppen, Stammdaten automatisch synchronisieren",felder:["Personen & Adressen","Kontaktdaten","Elternkontakte","Teams & Gruppen","Spielerpassdaten","J+S Nummern"]},
    football_ch:{description:"Spielpläne, Resultate und Ranglisten von Football.ch importieren",felder:["Spielplan","Resultate","Ranglisten","Teaminfos"]},
    fvrz:       {description:"Spielplan und Tabelle vom FVRZ (Fussballverband Region Zürich)",felder:["Spielplan","Tabelle","Resultate","Spielernummern"]},
    clubdesk:   {description:"Mitgliederdaten und Vereinsverwaltung aus ClubDesk synchronisieren",felder:["Mitglieder","Adressen","Mitgliedschaften","Beiträge"]},
    sfa:        {description:"Spielerdaten und Lizenzen von Swiss Football Association",felder:["Spielerlizenzen","Transferdaten","Sperren"]},
  };

  /* ── Alle Module als Fallback ── */
  const ALLE_MODULE=[
    {key:"dashboard",  label:"Dashboard",         icon:"layout-dashboard", kat:"kern",          pflicht:true},
    {key:"members",    label:"Mitglieder",         icon:"users",            kat:"verwaltung"},
    {key:"team",       label:"Teams",              icon:"ball-football",    kat:"sport"},
    {key:"training",   label:"Trainingsplan",      icon:"calendar",         kat:"sport"},
    {key:"schedule",   label:"Spielplan/FVRZ",     icon:"flag",             kat:"sport"},
    {key:"attendance_central",label:"Anwesenheitsstatistik",icon:"chart-bar",kat:"sport"},
    {key:"events",     label:"Termine",            icon:"calendar-event",   kat:"sport"},
    {key:"helpers",    label:"Helfereinsätze",     icon:"heart-handshake",  kat:"betrieb"},
    {key:"buses",      label:"Vereinsbusse",       icon:"bus",              kat:"betrieb"},
    {key:"material",   label:"Material",           icon:"package",          kat:"betrieb"},
    {key:"lockers",    label:"Garderoben",         icon:"door-exit",        kat:"betrieb"},
    {key:"media",      label:"Medien & Berichte",  icon:"speakerphone",     kat:"kommunikation"},
    {key:"nachrichten",label:"Nachrichten",        icon:"message",          kat:"kommunikation"},
    {key:"news",       label:"News",               icon:"news",             kat:"kommunikation"},
    {key:"wiki",       label:"Wiki",               icon:"book",             kat:"kommunikation"},
    {key:"docs",       label:"Dokumente",          icon:"file-text",        kat:"kommunikation"},
    {key:"portal",     label:"Portalverwaltung",   icon:"settings",         kat:"admin",         pflicht:true},
  ];

  const ROLLEN_MODULE_DEFAULT={
    administrator:   ALLE_MODULE.map(m=>m.key),
    vorstand:        ["dashboard","members","team","training","schedule","attendance_central","events","helpers","buses","material","nachrichten","media","news","wiki","docs"],
    administration:  ["dashboard","members","team","training","schedule","attendance_central","events","helpers","buses","material","lockers","nachrichten","media","news","wiki","docs","portal"],
    funktionaer:     ["dashboard"],
    trainer:         ["dashboard","team","training","events","helpers","buses","material","lockers","nachrichten","news","wiki","docs"],
    spieler:         ["dashboard","team","events","helpers","nachrichten","docs","news"],
    eltern:          ["dashboard","team","events","helpers","nachrichten","docs","news"],
  };

  /* Modul-Aktionen für Detail-Ansicht */
  const MODUL_AKTIONEN={
    dashboard:  [{label:"Übersicht ansehen",wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"}],
    team:       [
      {label:"Team + Kader ansehen",          wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Position / Nummer ändern",      wer:["administrator","administration","trainer"],min:"schreiben",   spez:"Trainer: nur eigene Spieler"},
      {label:"Spieler hinzufügen / entfernen",wer:["administrator","administration"],         min:"verwalten"},
      {label:"Team erstellen / bearbeiten",   wer:["administrator","administration"],         min:"verwalten"},
      {label:"Trainer zuweisen",              wer:["administrator","administration"],         min:"verwalten"},
    ],
    members:    [
      {label:"Name, Tel, E-Mail sehen",           wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Basis-Felder bearbeiten",           wer:["administrator","administration","trainer"],min:"schreiben",spez:"Trainer: nur eigene Spieler"},
      {label:"AHV, Bankdaten sehen",              wer:["administrator","administration"],         min:"verwalten"},
      {label:"Neue Mitglieder, Export, löschen",  wer:["administrator","administration"],         min:"verwalten"},
    ],
    training:   [
      {label:"Trainings ansehen",              wer:["administrator","vorstand","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Training absagen",               wer:["administrator","administration","trainer"],min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Training erstellen / bearbeiten",wer:["administrator","administration","trainer"],min:"verwalten",  spez:"Trainer: nur eigene Teams"},
      {label:"Vorlagen verwalten",             wer:["administrator","administration"],min:"verwalten"},
    ],
    schedule:   [
      {label:"Spielplan + Tabelle ansehen",wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Daten ändern",               wer:[],                                              min:"verwalten",  note:"Nur via FVRZ-Sync"},
    ],
    attendance_central:[
      {label:"Eigene Statistik sehen",           wer:["administrator","vorstand","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Anwesenheiten eintragen / ändern", wer:["administrator","administration","trainer"],min:"schreiben", spez:"Trainer: nur eigene Spieler"},
      {label:"Alle Teams auswerten, exportieren",wer:["administrator","administration"],         min:"verwalten"},
    ],
    events:     [
      {label:"Termine ansehen",                           wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                           wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinsanlass erstellen / bearbeiten",      wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsanlass absagen / löschen",           wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Event erstellen / bearbeiten",         wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Team-Event absagen / löschen",              wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Spiel-Termin bearbeiten (Treffpunkt etc.)", wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams", note:"Auto-generiert via Spielplan"},
    ],
    helpers:    [
      {label:"Einsätze ansehen",                  wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                   wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinseinsatz erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Einsatz erstellen / verwalten", wer:["administrator","trainer"],               min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Zuteilungen verwalten",              wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    buses:      [
      {label:"Fahrten + Belegung ansehen",   wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Platz reservieren / abmelden", wer:["administrator","administration","trainer","spieler"],min:"schreiben"},
      {label:"Fahrten erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    material:   [
      {label:"Inventar ansehen",              wer:["administrator","vorstand","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Ausleihe beantragen",           wer:["administrator","administration","trainer"], min:"schreiben"},
      {label:"Ausleihen genehmigen",          wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Inventar + Bestände verwalten", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    lockers:    [
      {label:"Eigene Zuteilung ansehen", wer:["administrator","vorstand","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Zuteilungen verwalten",    wer:["administrator","administration"],min:"verwalten"},
    ],
    news:       [
      {label:"Artikel lesen",                    wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Vereinsnews erstellen / bearbeiten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsnews publizieren / löschen", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    wiki:       [
      {label:"Artikel lesen",                      wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Artikel bearbeiten",                 wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Artikel erstellen, löschen, Kategorien",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    docs:       [
      {label:"Herunterladen",                  wer:["administrator","vorstand","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Hochladen, löschen",             wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Ordner / Kategorien verwalten",  wer:["administrator","administration"],             min:"verwalten"},
    ],
    media:      [
      {label:"Anschauen",                           wer:["administrator","vorstand","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Fotos hochladen",                     wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Team-Matchbericht schreiben",         wer:["administrator","trainer"],               min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Vereinsbericht schreiben",            wer:["administrator","administration","funktionaer"],min:"schreiben"},
      {label:"Publizieren, Alben verwalten",        wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    portal:     [{label:"Benutzer, Module, Berechtigungen",wer:["administrator","administration"],min:"verwalten"}],
  };

  /* Standard-Stufen pro Rolle (nur für Module mit Zugriff) */
  const ZUGRIFF_DEFAULT={
    administrator:  {_all:"verwalten"},
    vorstand:       {_all:"lesen"},
    administration: {
      _all:"verwalten",
      dashboard:"lesen",
    },
    funktionaer:    {_all:"lesen"},
    trainer:        {
      _all:"lesen",
      team:"verwalten",
      training:"verwalten",
      events:"verwalten",
      schedule:"lesen",            // Spielplan = nur anzeigen, Interaktion via Termine
      attendance_central:"schreiben",
      helpers:"verwalten",
      buses:"schreiben",
      material:"schreiben",
      media:"schreiben",
      wiki:"schreiben",
      members:"schreiben",
    },
    spieler:        {
      _all:"lesen",
      events:"schreiben",          // An-/Abmelden (inkl. auto-generierte Spiel-Termine)
      helpers:"schreiben",
      buses:"schreiben",
      schedule:"lesen",
    },
    eltern:         {
      _all:"lesen",
      events:"schreiben",
      helpers:"schreiben",
      schedule:"lesen",
    },
  };

  const ZUGRIFF_LABELS={"lesen":"Lesen","schreiben":"Schreiben","verwalten":"Verwalten"};
  const ZUGRIFF_COLORS={"lesen":"#3B82F6","schreiben":"#F97316","verwalten":"#22C55E"};
  const ZUGRIFF_ICONS= {"lesen":"eye","schreiben":"edit","verwalten":"settings"};
  const ZUGRIFF_ORDER=["lesen","schreiben","verwalten"];

  /* Effektive Zugriffsstufe: custom oder Default */
  const [zugriffStufen,setZugriffStufen]=useState(()=>{
    try{const s=localStorage.getItem("cc-zugriff-stufen");return s?JSON.parse(s):null;}catch{return null;}
  });
  const effZugriff=zugriffStufen||ZUGRIFF_DEFAULT;

  function getZugriff(rolle,modulKey){
    if(!effRechte[rolle]?.includes(modulKey)) return null;
    return effZugriff[rolle]?.[modulKey]||effZugriff[rolle]?._all||"lesen";
  }

  function setZugriffStufe(rolle,modulKey,stufe){
    setZugriffStufen(prev=>{
      const base=prev||ZUGRIFF_DEFAULT;
      const neu={...base,[rolle]:{...(base[rolle]||{}),[modulKey]:stufe}};
      try{localStorage.setItem("cc-zugriff-stufen",JSON.stringify(neu));}catch{}
      return neu;
    });
  }

  function cycleZugriff(rolle,modulKey){
    const cur=getZugriff(rolle,modulKey)||"lesen";
    const idx=ZUGRIFF_ORDER.indexOf(cur);
    if(idx===ZUGRIFF_ORDER.length-1){
      /* Letzter Schritt: Zugriff entfernen + Stufe zurücksetzen */
      toggleModulRolle(modulKey,rolle);
      setZugriffStufen(prev=>{
        if(!prev) return prev;
        const neu={...prev};
        if(neu[rolle]){
          const r={...neu[rolle]};
          delete r[modulKey];
          neu[rolle]=r;
        }
        try{localStorage.setItem("cc-zugriff-stufen",JSON.stringify(neu));}catch{}
        return neu;
      });
    } else {
      const next=ZUGRIFF_ORDER[idx+1];
      setZugriffStufe(rolle,modulKey,next);
      setModuleDirty(true); setSaveMsg("Ungespeichert");
    }
  }

  useEffect(function(){
    (async function(){
      setLoading(true);
      try{
        if(supabase){
          const [apiR,audR,benuR,gruppenR,funktionenR,mcR,mrR]=await Promise.all([
            supabase.from("api_verbindungen").select("*").order("sort_order"),
            supabase.from("api_sync_log").select("*,api_verbindungen(label)").order("gestartet_am",{ascending:false}).limit(50),
            supabase.from("benutzer").select("id,name,email,role").order("name"),
            supabase.from("portal_gruppen").select("*").order("name"),
            supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe,module,modul_stufen), stufe_override").order("name"),
            supabase.from("module_config").select("*"),
            supabase.from("modul_rechte").select("*"),
          ]);
          if(apiR.data) setApiVerbindungen(apiR.data);
          if(audR.data) setAuditLogs(audR.data);
          if(benuR.data&&benuR.data.length>0){
            /* Funktionen separat laden */
            const{data:bfData}=await supabase.from("benutzer_funktionen")
              .select("benutzer_id, portal_funktionen(id,name,portal_gruppen(name,farbe))");
            const bfMap={};
            (bfData||[]).forEach(bf=>{
              if(!bfMap[bf.benutzer_id]) bfMap[bf.benutzer_id]=[];
              if(bf.portal_funktionen) bfMap[bf.benutzer_id].push(bf.portal_funktionen);
            });
            setBenutzerListe(benuR.data.map(b=>({...b,funktionen:bfMap[b.id]||[]})));
          } else if(benuR.error){
            console.warn("[FCH] benutzer laden:", benuR.error.message);
          }
          if(gruppenR.data) setGruppen(gruppenR.data);
          if(funktionenR.data) setFunktionen(funktionenR.data);
          /* module_config → moduleAktiv State */
          if(mcR.data&&mcR.data.length>0&&setModuleAktiv){
            const ma={};
            mcR.data.forEach(r=>{ma[r.modul]=r.aktiv!==false;});
            setModuleAktiv(ma);
            try{localStorage.setItem("cc-module-aktiv",JSON.stringify(ma));}catch{}
          }
          /* modul_rechte → moduleRechte State */
          if(mrR.data&&mrR.data.length>0&&setModuleRechte){
            const mr={};
            const zs={};
            mrR.data.forEach(r=>{
              if(!mr[r.rolle]) mr[r.rolle]=[];
              if(r.hat_zugriff){
                mr[r.rolle].push(r.modul);
                if(r.stufe&&r.stufe!=="lesen"){
                  if(!zs[r.rolle]) zs[r.rolle]={};
                  zs[r.rolle][r.modul]=r.stufe;
                }
              }
            });
            setModuleRechte(mr);
            try{localStorage.setItem("cc-module-rechte",JSON.stringify(mr));}catch{}
            if(Object.keys(zs).length>0){
              setZugriffStufen(zs);
              try{localStorage.setItem("cc-zugriff-stufen",JSON.stringify(zs));}catch{}
            }
          }
        }
      }catch(e){console.warn("[FCH] Portalverwaltung laden:",e.message);}
      setLoading(false);
    })();
  },[]);

  async function toggleModulAktiv(modulId,aktiv){
    if(!supabase) return;
    await supabase.from("module_config").upsert({modul_id:modulId,active,updated_by:supabase.auth.getUser?.()?.id});
    setModuleConfig(prev=>({...prev,[modulId]:{...prev[modulId],aktiv}}));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleBerechtigung(modulId,rolle,feld,wert){
    if(!supabase) return;
    const curr=moduleBerechtigungen[modulId]?.[rolle]||{};
    const update={modul_id:modulId,rolle,...curr,[feld]:wert};
    await supabase.from("module_berechtigungen").upsert(update);
    setModuleBerechtigungen(prev=>({
      ...prev,
      [modulId]:{...prev[modulId],[rolle]:{...curr,[feld]:wert}}
    }));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleFeld(feldKey,rolle,sichtbar){
    if(!supabase) return;
    await supabase.from("feldsichtbarkeit").upsert({feld_key:feldKey,role,sichtbar},{onConflict:"feld_key,role"});
    setFelder(prev=>prev.map(f=>f.feld_key===feldKey&&f.role===rolle?{...f,sichtbar}:f));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function updateBenutzerRolle(id,role){
    if(!supabase) return;
    await supabase.from("benutzer").update({role}).eq("id",id);
    setBenutzerListe(prev=>prev.map(b=>b.id===id?{...b,role}:b));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  function toggleModulGlobal(key){
    if(!setModuleAktiv) return;
    setModuleAktiv(prev=>{
      const neu={...prev,[key]:prev[key]===false?true:false};
      try{localStorage.setItem("cc-module-aktiv",JSON.stringify(neu));}catch{}
      /* In Supabase speichern */
      if(supabase) supabase.from("module_config")
        .upsert({modul:key,aktiv:neu[key]!==false},{onConflict:"modul"})
        .then(({error})=>{ if(error) console.warn("[FCH] module_config:", error.message); });
      return neu;
    });
    setModuleDirty(true); setSaveMsg("Ungespeichert");
  }

  function toggleModulRolle(modulKey, rolle){
    if(!setModuleRechte) return;
    setModuleRechte(prev=>{
      const base=prev||ROLLEN_MODULE_DEFAULT;
      const cur=base[rolle]||[];
      const hasIt=cur.includes(modulKey);
      const neu={...base,[rolle]:hasIt?cur.filter(m=>m!==modulKey):[...cur,modulKey]};
      try{localStorage.setItem("cc-module-rechte",JSON.stringify(neu));}catch{}
      return neu;
    });
    setModuleDirty(true); setSaveMsg("Ungespeichert");
  }

  /* Effektive Rechte: editierte oder Default */
  const effRechte=moduleRechte||ROLLEN_MODULE_DEFAULT;

  const moduleNachKat=KATEGORIEN.reduce(function(acc,k){
    acc[k]=module.filter(m=>m.category===k);
    return acc;
  },{});

  const felderNachKey={};
  felder.forEach(f=>{
    if(!felderNachKey[f.feld_key]) felderNachKey[f.feld_key]={label:f.feld_label||f.feld_key,rollen:{}};
    felderNachKey[f.feld_key].rollen[f.role]=f.sichtbar;
  });

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Portalverwaltung</h1>
          <div style={{fontSize:13,color:"var(--sub)",marginTop:3}}>Module, Benutzer, API-Verbindungen und Einstellungen</div>
        </div>
        {saveMsg&&<Chip text={saveMsg} color={saveMsg==="Ungespeichert"?R:GN} bg={saveMsg==="Ungespeichert"?RL:"#ECFDF5"}/>}
      </div>

      {/* Mobile: Kacheln — Desktop: Tabs */}
      {isMobile?(
        tab==="overview"?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {MOBILE_KACHELN.map(k=>(
              <button key={k.key} onClick={()=>setTab(k.tabs[0])} style={{
                padding:"20px 16px",borderRadius:14,border:"1px solid var(--border)",
                background:"var(--surface)",cursor:"pointer",textAlign:"left",
                display:"flex",flexDirection:"column",gap:12,fontFamily:FONT
              }}>
                <div style={{width:40,height:40,borderRadius:10,background:k.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <TI n={k.icon} size={20} style={{color:k.color}}/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{k.label}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>{k.tabs.length} {k.tabs.length===1?"Bereich":"Bereiche"}</div>
              </button>
            ))}
          </div>
        ):(
          <div style={{marginBottom:16}}>
            <button onClick={()=>setTab("overview")} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",background:"none",border:"none",cursor:"pointer",color:"var(--sub)",fontSize:13,fontFamily:FONT}}>
              <TI n="arrow-left" size={14}/> Übersicht
            </button>
            <div style={{display:"flex",gap:4,marginTop:8,overflowX:"auto",borderBottom:"1px solid var(--border)",paddingBottom:0,scrollbarWidth:"none"}}>
              {TABS.filter(t=>MOBILE_KACHELN.find(k=>k.tabs.includes(t.key)&&k.tabs.includes(tab))).map(t=>(
                <button key={t.key} onClick={()=>setTab(t.key)} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"7px 12px",whiteSpace:"nowrap",
                  background:"none",border:"none",borderBottom:tab===t.key?`2px solid ${BK}`:"2px solid transparent",
                  cursor:"pointer",fontSize:13,fontWeight:tab===t.key?700:400,
                  color:tab===t.key?BK:"var(--sub)",borderRadius:0,marginBottom:-1,fontFamily:FONT
                }}>
                  <TI n={t.icon} size={13}/>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )
      ):(
        /* Desktop: zweistufige Navigation */
        <div style={{marginBottom:20}}>
          {/* Ebene 1: Hauptkategorien */}
          <div style={{display:"flex",gap:4,borderBottom:"1px solid var(--border)",marginBottom:0}}>
            {MOBILE_KACHELN.map(k=>{
              const isActive=k.tabs.includes(tab);
              return(
                <button key={k.key} onClick={()=>setTab(k.tabs[0])} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"10px 16px",whiteSpace:"nowrap",
                  background:"none",border:"none",borderBottom:isActive?`2px solid ${BK}`:"2px solid transparent",
                  cursor:"pointer",fontSize:13,fontWeight:isActive?700:400,
                  color:isActive?BK:"var(--sub)",borderRadius:0,marginBottom:-1,fontFamily:FONT
                }}>
                  <TI n={k.icon} size={14} style={{color:isActive?k.color:"var(--sub)"}}/>
                  {k.label}
                </button>
              );
            })}
          </div>
          {/* Ebene 2: Unterkategorien */}
          {MOBILE_KACHELN.filter(k=>k.tabs.includes(tab)).map(k=>(
            k.tabs.length>1&&(
              <div key={k.key} style={{display:"flex",gap:4,borderBottom:"1px solid var(--border)",paddingTop:4,overflowX:"auto",scrollbarWidth:"none"}}>
                {TABS.filter(t=>k.tabs.includes(t.key)).map(t=>(
                  <button key={t.key} onClick={()=>setTab(t.key)} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"6px 12px",whiteSpace:"nowrap",
                    background:tab===t.key?"var(--surface2)":"none",border:"none",
                    borderBottom:tab===t.key?`2px solid ${k.color}`:"2px solid transparent",
                    cursor:"pointer",fontSize:13,fontWeight:tab===t.key?600:400,
                    color:tab===t.key?"var(--text)":"var(--sub)",borderRadius:0,marginBottom:-1,fontFamily:FONT
                  }}>
                    <TI n={t.icon} size={12}/>
                    {t.label}
                  </button>
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {loading&&<div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:13}}>Wird geladen…</div>}

      {/* ── TAB: MODULE & RECHTE ── */}
      {!loading&&tab==="module"&&(
        <div>
          {/* Header: InfoBox + Legende + Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <InfoBox text="Klick auf ein Modul-Name öffnet die Detail-Aktionen. Klick auf eine Stufe ändert die Berechtigung." color={BL}/>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
              {/* Legende */}
              {ZUGRIFF_ORDER.map(s=>(
                <span key={s} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:ZUGRIFF_COLORS[s]+"20",border:`1px solid ${ZUGRIFF_COLORS[s]}40`}}>
                  <TI n={ZUGRIFF_ICONS[s]} size={11} style={{color:ZUGRIFF_COLORS[s]}}/>
                  <span style={{fontSize:11,fontWeight:600,color:ZUGRIFF_COLORS[s]}}>{ZUGRIFF_LABELS[s]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* View-Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            {/* nach Modul / nach Rolle */}
            <div style={{display:"flex",border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
              {["modul","rolle"].map(v=>(
                <button key={v} onClick={()=>setModuleViewMode(v)} style={{
                  padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",
                  border:"none",fontFamily:FONT,transition:"all .15s",
                  background:moduleViewMode===v?BK:"transparent",
                  color:moduleViewMode===v?"#fff":"var(--sub)"
                }}>{v==="modul"?"nach Modul":"nach Rolle"}</button>
              ))}
            </div>
            {moduleDirty&&(
              <>
                <button onClick={async()=>{
                  if(supabase&&moduleRechte){
                    const rows=[];
                    Object.entries(moduleRechte).forEach(([rolle,module])=>{
                      ALLE_MODULE.forEach(m=>{
                        const hatZugriff=(module||[]).includes(m.key);
                        const stufe=hatZugriff?(zugriffStufen?.[rolle]?.[m.key]||effZugriff[rolle]?.[m.key]||effZugriff[rolle]?._all||"lesen"):"lesen";
                        rows.push({modul:m.key,rolle,hat_zugriff:hatZugriff,stufe});
                      });
                    });
                    const{error}=await supabase.from("modul_rechte").upsert(rows,{onConflict:"modul,rolle"});
                    if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                  }
                  try{localStorage.setItem("cc-module-rechte",JSON.stringify(moduleRechte));
                      if(zugriffStufen) localStorage.setItem("cc-zugriff-stufen",JSON.stringify(zugriffStufen));}catch{}
                  setModuleDirty(false); setSaveMsg("Gespeichert");setTimeout(()=>setSaveMsg(""),2000);
                }} style={{padding:"7px 14px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Speichern
                </button>
                <button onClick={()=>{setModuleRechte(null);setZugriffStufen(null);setModuleDirty(false);try{localStorage.removeItem("cc-module-rechte");localStorage.removeItem("cc-zugriff-stufen");}catch{}setSaveMsg("Verworfen");setTimeout(()=>setSaveMsg(""),2000);}}
                  style={{padding:"8px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Verwerfen
                </button>
              </>
            )}
          </div>

          {/* ── ANSICHT: NACH MODUL ── */}
          {moduleViewMode==="modul"&&(()=>{
            return(
              <Card style={{padding:0,overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                  <thead>
                    <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                      <th style={{padding:"9px 14px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.5,minWidth:180,position:"sticky",left:0,background:"var(--surface2)",zIndex:2}}>Modul</th>
                      {ROLLEN.map(r=>(
                        <th key={r} style={{textAlign:"center",padding:"9px 8px",fontWeight:700,
                          color:r==="administrator"?"var(--sub)":ROLES[r]?.color||"var(--sub)",
                          fontSize:11,minWidth:90,
                          background:r==="administrator"?"var(--surface2)":"transparent"
                        }}>{ROLLEN_LABELS[r]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["kern","sport","betrieb","kommunikation","verwaltung","admin"].map(kat=>{
                      const mods=ALLE_MODULE.filter(m=>m.kat===kat);
                      if(!mods.length) return null;
                      const KAT_LABELS={kern:"Kern",sport:"Sport",betrieb:"Betrieb",kommunikation:"Kommunikation",verwaltung:"Verwaltung",admin:"Systemverwaltung"};
                      return([
                        <tr key={"kat-"+kat}>
                          <td colSpan={ROLLEN.length+1} style={{padding:"6px 14px 4px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:"1px solid var(--border)"}}>{KAT_LABELS[kat]}</td>
                        </tr>,
                        ...mods.map(m=>{
                          const isAktiv=moduleAktiv[m.key]!==false;
                          const isPflicht=!!m.pflicht;
                          const isExpanded=expandedModul===m.key;
                          return([
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)",opacity:isAktiv?1:0.35,background:isPflicht?"#FFFBEB":"transparent"}}>
                              <td style={{padding:"0",position:"sticky",left:0,background:isPflicht?"#FFFBEB":isExpanded?"var(--surface2)":"var(--surface)",zIndex:1}}>
                                <div onClick={()=>setExpandedModul(isExpanded?null:m.key)}
                                  style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer"}}>
                                  <div onClick={e=>{e.stopPropagation();if(!isPflicht)toggleModulGlobal(m.key);}}
                                    title={isPflicht?"Pflichtmodul":isAktiv?"Deaktivieren":"Aktivieren"}
                                    style={{width:26,height:15,borderRadius:8,flexShrink:0,background:isPflicht?"#F59E0B":isAktiv?GN:"var(--border)",cursor:isPflicht?"not-allowed":"pointer",position:"relative",transition:"background 0.2s"}}>
                                    <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"var(--surface)",transition:"left 0.15s",left:isAktiv||isPflicht?13:2}}/>
                                  </div>
                                  <TI n={m.icon} size={13} style={{color:isPflicht?"#B45309":"var(--sub)",flexShrink:0}}/>
                                  <span style={{fontWeight:600,color:isPflicht?"#B45309":isExpanded?"var(--text)":"var(--text)",fontSize:13}}>{m.name||m.label}</span>
                                  {isPflicht&&<span style={{fontSize:11,padding:"1px 5px",borderRadius:4,background:"#FEF3C7",color:"#B45309",fontWeight:600}}>Pflicht</span>}
                                  <TI n={isExpanded?"chevron-up":"chevron-down"} size={11} style={{color:"var(--sub)",marginLeft:"auto"}}/>
                                </div>
                              </td>
                              {ROLLEN.map(r=>{
                                const isAdmin=r==="administrator";
                                const stufe=isAdmin?"verwalten":getZugriff(r,m.key);
                                const hasAccess=isAktiv&&(isAdmin||effRechte[r]?.includes(m.key));
                                const isEdited=moduleRechte&&(moduleRechte[r]?.includes(m.key))!==(ROLLEN_MODULE_DEFAULT[r]?.includes(m.key));
                                return(
                                  <td key={r} style={{textAlign:"center",padding:"7px 6px",background:isAdmin?"var(--surface2)":"transparent"}}>
                                    {r==="funktionaer"
                                      ?<span style={{fontSize:11,color:"var(--sub)",fontStyle:"italic"}}>via Gruppe</span>
                                      :(()=>{
                                        const sc=stufe?ZUGRIFF_COLORS[stufe]:"var(--border)";
                                        return(
                                          <div onClick={isAdmin?undefined:()=>{
                                            if(!isAktiv) return;
                                            if(hasAccess) cycleZugriff(r,m.key);
                                            else toggleModulRolle(m.key,r);
                                          }}
                                            title={isAdmin?"Administrator – immer vollen Zugriff":
                                              !isAktiv?"Modul inaktiv":
                                              hasAccess?(stufe==="verwalten"?`${ROLLEN_LABELS[r]}: Verwalten → klicken zum Entfernen`:`${ROLLEN_LABELS[r]}: ${ZUGRIFF_LABELS[stufe||"lesen"]} → klicken für nächste Stufe`):
                                              `${ROLLEN_LABELS[r]}: kein Zugriff → klicken für Lesen`}
                                            style={{
                                              width:hasAccess?80:22,height:24,borderRadius:6,margin:"0 auto",
                                              background:isAdmin?"var(--surface2)":hasAccess?sc+"20":"transparent",
                                              border:`${isEdited&&!isAdmin?"2px":"1px"} solid ${isAdmin?"var(--border)":hasAccess?sc:"var(--border)"}`,
                                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                                              cursor:isAdmin||!isAktiv?"not-allowed":"pointer",
                                              transition:"all 0.15s",opacity:!isAktiv?0.3:1,
                                              padding:hasAccess?"0 6px":"0"
                                            }}
                                            onMouseEnter={e=>{if(!isAdmin&&isAktiv&&!hasAccess)e.currentTarget.style.transform="scale(1.1)";}}
                                            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                                          >
                                            {hasAccess&&<><TI n={ZUGRIFF_ICONS[stufe||"lesen"]} size={11} style={{color:isAdmin?"var(--sub)":sc}}/><span style={{fontSize:11,fontWeight:600,color:isAdmin?"var(--sub)":sc}}>{ZUGRIFF_LABELS[stufe||"lesen"]}</span></>}
                                          </div>
                                        );
                                      })()
                                    }
                                  </td>
                                );
                              })}
                            </tr>,
                            isExpanded&&(
                              <tr key={m.key+"-detail"} style={{borderTop:"0.5px solid var(--border)"}}>
                                <td colSpan={ROLLEN.length+1} style={{padding:"10px 14px",background:"var(--surface2)"}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{flex:1}}>Aktionen</span>
                                    <span style={{minWidth:80,textAlign:"right"}}>Minimalstufe</span>
                                  </div>
                                  {(MODUL_AKTIONEN[m.key]||[]).map((a,ai)=>(
                                    <div key={ai} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"6px 0",borderTop:ai>0?"0.5px solid var(--border)":"none"}}>
                                      <div style={{flex:1}}>
                                        <span style={{fontSize:13,color:"var(--text)"}}>{a.label}</span>
                                        {a.spez&&<div style={{fontSize:11,color:"var(--sub)",marginTop:2,fontStyle:"italic"}}>{a.spez}</div>}
                                        {a.note&&<div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>ℹ {a.note}</div>}
                                      </div>
                                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:ZUGRIFF_COLORS[a.min]+"20",color:ZUGRIFF_COLORS[a.min],fontWeight:600,flexShrink:0}}>{ZUGRIFF_LABELS[a.min]}</span>
                                    </div>
                                  ))}
                                  {!MODUL_AKTIONEN[m.key]&&<span style={{fontSize:13,color:"var(--sub)"}}>Keine Detail-Aktionen definiert.</span>}
                                </td>
                              </tr>
                            )
                          ]);
                        })
                      ]);
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })()}

          {/* ── ANSICHT: NACH ROLLE ── */}
          {moduleViewMode==="rolle"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {ROLLEN.filter(r=>r!=="funktionaer").map(role=>{
                const zugMods=ALLE_MODULE.filter(m=>effRechte[role]?.includes(m.key)&&moduleAktiv[m.key]!==false);
                if(!zugMods.length) return null;
                const roleInfo=ROLES[role]||{};
                return(
                  <Card key={role} style={{padding:0,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:roleInfo.color||"#888",flexShrink:0}}/>
                      <span style={{fontWeight:600,fontSize:14,color:roleInfo.color||"var(--text)"}}>{ROLLEN_LABELS[role]}</span>
                      <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>{zugMods.length} Module</span>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead>
                        <tr style={{background:"var(--surface2)"}}>
                          <th style={{padding:"7px 14px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.5}}>Modul</th>
                          <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.5,width:90}}>Stufe</th>
                          <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.5}}>Kann</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zugMods.map((m,i)=>{
                          const stufe=getZugriff(role,m.key)||"lesen";
                          const kann=(MODUL_AKTIONEN[m.key]||[]).filter(a=>a.wer.includes(role)).map(a=>a.label);
                          const sc=ZUGRIFF_COLORS[stufe];
                          return(
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)"}}>
                              <td style={{padding:"8px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <TI n={m.icon} size={13} style={{color:"var(--sub)"}}/>
                                  <span style={{fontWeight:600,fontSize:13}}>{m.name||m.label}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px"}}>
                                <div onClick={()=>{const aktiv=moduleAktiv[m.key]!==false;if(aktiv&&role!=="administrator")cycleZugriff(role,m.key);}}
                                  style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:sc+"20",border:`1px solid ${sc}50`,cursor:"pointer"}}>
                                  <TI n={ZUGRIFF_ICONS[stufe]} size={11} style={{color:sc}}/>
                                  <span style={{fontSize:11,fontWeight:600,color:sc}}>{ZUGRIFF_LABELS[stufe]}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px",fontSize:11,color:"var(--sub)"}}>{kann.length?kann.join(" · "):"Nur ansehen"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                );
              })}

              {/* Funktionär: via Gruppen */}
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:ROLES["funktionaer"]?.color||"#8B5CF6",flexShrink:0}}/>
                  <span style={{fontWeight:600,fontSize:14,color:ROLES["funktionaer"]?.color||"#8B5CF6"}}>Funktionär</span>
                  <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>Module via Gruppen & Funktionen</span>
                </div>
                <div style={{padding:"12px 16px"}}>
                  <InfoBox text="Funktionäre erhalten keinen fixen Modulzugang. Stattdessen werden ihnen Gruppen zugewiesen, welche die erlaubten Module definieren. Die Einschränkung auf bestimmte Teams oder Filter erfolgt über Funktionen innerhalb der Gruppe." color={BL}/>
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                    {(gruppen.length>0?gruppen:[
                      {name:"Vereinsleben & Events",farbe:"#8B5CF6",module:["events","helpers","members","news","docs"]},
                      {name:"Betrieb & Infrastruktur",farbe:"#3B82F6",module:["material","buses","lockers","docs"]},
                      {name:"Kommunikation & Medien", farbe:"#22C55E",module:["media","wiki","news","docs"]},
                      {name:"Stufenleitende",          farbe:"#F97316",module:["team","training","events","attendance_central","members","helpers"]},
                      {name:"Schiedsrichterwesen",     farbe:"#06B6D4",module:["schedule","training","docs"]},
                    ]).map(g=>(
                      <div key={g.name} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:g.farbe,flexShrink:0}}/>
                        <span style={{fontWeight:600,fontSize:13,flex:1}}>{g.name}</span>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(g.module||[]).map(mk=>{
                            const mod=ALLE_MODULE.find(m=>m.key===mk);
                            return mod?<span key={mk} style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:g.farbe+"15",color:g.farbe}}>{mod.name||mod.label}</span>:null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:"var(--sub)"}}>
                    Gruppen und Module konfigurierst du unter <strong>Gruppen & Funktionen</strong>.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: GRUPPEN & FUNKTIONEN ── */}
      {!loading&&tab==="gruppen"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:20}}>
            <InfoBox text="Gruppen bündeln Module für Funktionäre. Funktionen schränken innerhalb einer Gruppe ein (Teams, Filter)." color={BL}/>
            <button onClick={()=>{setEditGruppe(null);setGruppeForm({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{}});setShowGruppeForm(true);}}
              style={{padding:"7px 14px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>
              + Neue Gruppe
            </button>
          </div>

          {/* Gruppen als Grid-Cards + expandierbare Funktionen */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(320px,1fr))",gap:12,marginBottom:selectedGruppe?16:0}}>
          {(gruppen.length>0?gruppen:[
            {id:1,name:"Vereinsleben & Events",farbe:"#8B5CF6",beschreibung:"Anlässe, Helfereinsätze, Mitgliederliste",module:["events","helpers","members","news","docs"]},
            {id:2,name:"Betrieb & Infrastruktur",farbe:"#3B82F6",beschreibung:"Material, Busse, Garderoben",module:["material","buses","lockers","docs"]},
            {id:3,name:"Kommunikation & Medien",farbe:"#22C55E",beschreibung:"Website, Social Media, Wiki, News",module:["media","wiki","news","docs"]},
            {id:4,name:"Stufenleitende",farbe:"#F97316",beschreibung:"Teams und Kader der zugewiesenen Stufe",module:["team","training","events","attendance_central","members","helpers"]},
            {id:5,name:"Schiedsrichterwesen",farbe:"#06B6D4",beschreibung:"Spielplan, Koordination",module:["schedule","training","docs"]},
          ]).map(g=>{
            const gFunktionen=funktionen.filter(f=>f.gruppe_id===g.id||f.portal_gruppen?.id===g.id);
            const isOpen=selectedGruppe?.id===g.id;
            const moduleLabels=(g.module||[]).map(k=>ALLE_MODULE.find(m=>m.key===k)?.label||k);
            return(
              <div key={g.id} style={{
                borderRadius:14,border:`1.5px solid ${isOpen?g.farbe:"var(--border)"}`,
                overflow:"hidden",
                background:isOpen?g.farbe+"08":"var(--surface)",
                transition:"all 0.15s"
              }}>
                {/* Gruppen-Header */}
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  {/* Farbstreifen */}
                  <div style={{width:4,alignSelf:"stretch",background:g.farbe,flexShrink:0}}/>
                  <div onClick={()=>setSelectedGruppe(isOpen?null:g)}
                    style={{flex:1,padding:"14px 16px",cursor:"pointer",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{g.name}</span>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:g.farbe+"20",color:g.farbe,fontWeight:600}}>
                        {gFunktionen.length} Funktion{gFunktionen.length!==1?"en":""}
                      </span>
                    </div>
                    {g.beschreibung&&<div style={{fontSize:13,color:"var(--sub)",marginBottom:6}}>{g.beschreibung}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {moduleLabels.map(ml=>(
                        <span key={ml} style={{fontSize:11,padding:"2px 9px",borderRadius:8,background:g.farbe+"15",color:g.farbe}}>{ml}</span>
                      ))}
                    </div>
                  </div>
                  {/* Aktionen */}
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 14px",flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();setEditGruppe(g);setGruppeForm({name:g.name,beschreibung:g.beschreibung||"",module:g.module||[],farbe:g.farbe||"#8B5CF6",modul_stufen:g.modul_stufen||{}});setShowGruppeForm(true);}}
                      style={{width:30,height:30,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)"}}>
                      <TI n="edit" size={13}/>
                    </button>
                    <div onClick={()=>setSelectedGruppe(isOpen?null:g)} style={{cursor:"pointer",color:"var(--sub)",padding:4}}>
                      <TI n={isOpen?"chevron-up":"chevron-down"} size={16}/>
                    </div>
                  </div>
                </div>

                {/* Expandierte Funktionen */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${g.farbe}30`,background:"var(--surface2)"}}>
                    {/* Funktionen-Header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px 6px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6}}>
                        Funktionen
                      </div>
                      <button onClick={()=>{setEditFunktion(null);setFunktionForm({name:"",beschreibung:"",gruppe_id:g.id,module_override:[],teams:[],filter:{}});setShowFunktionForm(true);}}
                        style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${g.farbe}`,background:g.farbe+"15",color:g.farbe,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                        + Funktion hinzufügen
                      </button>
                    </div>

                    {/* Funktionen-Grid */}
                    <div style={{padding:"6px 12px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
                      {gFunktionen.length===0&&(
                        <div style={{gridColumn:"1/-1",padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:13,border:"1px dashed var(--border)",borderRadius:10}}>
                          Noch keine Funktionen — klicke «+ Funktion hinzufügen»
                        </div>
                      )}
                      {gFunktionen.map(f=>(
                        <div key={f.id} style={{
                          background:"var(--surface)",borderRadius:10,
                          border:"1px solid var(--border)",padding:"11px 13px"
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <span style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>{f.name}</span>
                            <button onClick={()=>{setEditFunktion(f);setFunktionForm({name:f.name,beschreibung:f.beschreibung||"",gruppe_id:f.gruppe_id||g.id,module_override:f.module_override||[],teams:f.teams||[],filter:f.filter||{}});setShowFunktionForm(true);}}
                              style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)",flexShrink:0}}>
                              <TI n="edit" size={12}/>
                            </button>
                          </div>
                          {f.beschreibung&&<div style={{fontSize:11,color:"var(--sub)",marginBottom:6}}>{f.beschreibung}</div>}
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {f.module_override?.length>0
                              ?f.module_override.map(m=>{const ml=ALLE_MODULE.find(x=>x.key===m);return(
                                <span key={m} style={{fontSize:11,padding:"1px 7px",borderRadius:6,background:"#3B82F615",color:"#3B82F6"}}>
                                  <TI n="arrow-narrow-right" size={9}/> {ml?.label||m}
                                </span>
                              );})
                              :<span style={{fontSize:11,color:"var(--sub)",fontStyle:"italic"}}>alle Gruppen-Module</span>
                            }
                            {f.teams?.length>0&&(
                              <span style={{fontSize:11,padding:"1px 7px",borderRadius:6,background:"#F9731615",color:"#F97316"}}>
                                {f.teams.length} Team{f.teams.length!==1?"s":""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Gruppe bearbeiten Modal */}
          <ModalOrSheet open={showGruppeForm} onClose={()=>{setShowGruppeForm(false);setEditGruppe(null);}} maxWidth={500}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:gruppeForm.farbe}}/>
                  <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"var(--text)"}}>{editGruppe?"Gruppe bearbeiten":"Neue Gruppe"}</h2>
                </div>
                <button onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:16}}>
                {editGruppe?"Module und Name anpassen.":"Neue Gruppe mit Modulzugang erstellen."}
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
              {/* Name + Farbe */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end"}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Gruppenname *</label>
                  <input value={gruppeForm.name} onChange={e=>setGruppeForm(p=>({...p,name:e.target.value}))}
                    placeholder="z.B. Vereinsleben & Events" autoFocus
                    style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Farbe</label>
                  <div style={{display:"flex",gap:8}}>
                    {["#8B5CF6","#3B82F6","#22C55E","#F97316","#06B6D4","#EF4444","#F59E0B","#EC4899"].map(c=>(
                      <div key={c} onClick={()=>setGruppeForm(p=>({...p,farbe:c}))}
                        style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",
                          border:`3px solid ${gruppeForm.farbe===c?"var(--text)":"transparent"}`,
                          transition:"border 0.1s"}}/>
                    ))}
                  </div>
                </div>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={gruppeForm.beschreibung||""} onChange={e=>setGruppeForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Wofür ist diese Gruppe?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Module */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"block"}}>
                  Module & Zugriffstufen <span style={{fontWeight:400,fontSize:11}}>— {(gruppeForm.module||[]).length} ausgewählt</span>
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {ALLE_MODULE.filter(m=>m.key!=="dashboard"&&m.key!=="portal").map(m=>{
                    const sel=(gruppeForm.module||[]).includes(m.key);
                    const stufe=(gruppeForm.modul_stufen||{})[m.key]||"lesen";
                    const STUFEN=["lesen","schreiben","verwalten"];
                    return(
                      <div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?gruppeForm.farbe:"var(--border)"}`,background:sel?gruppeForm.farbe+"08":"transparent"}}>
                        {/* Modul aktivieren */}
                        <button onClick={()=>setGruppeForm(p=>{
                          const cur=p.module||[];
                          const newMods=sel?cur.filter(x=>x!==m.key):[...cur,m.key];
                          const newStufen={...p.modul_stufen};
                          if(!sel) newStufen[m.key]="lesen";
                          return{...p,module:newMods,modul_stufen:newStufen};
                        })} style={{display:"flex",alignItems:"center",gap:8,flex:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",fontFamily:FONT}}>
                          <TI n={m.icon} size={13} style={{color:sel?gruppeForm.farbe:"var(--sub)",flexShrink:0}}/>
                          <span style={{fontSize:13,color:sel?gruppeForm.farbe:"var(--sub)",fontWeight:sel?600:400}}>{m.label}</span>
                        </button>
                        {/* Stufen-Toggle (nur wenn aktiv) */}
                        {sel&&(
                          <div style={{display:"flex",gap:4,flexShrink:0}}>
                            {STUFEN.map(s=>(
                              <button key={s} onClick={()=>setGruppeForm(p=>({...p,modul_stufen:{...p.modul_stufen,[m.key]:s}}))}
                                style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${stufe===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:stufe===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:stufe===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:11,fontWeight:stufe===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                                {ZUGRIFF_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:12,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!gruppeForm.name.trim()) return;
                  const payload={name:gruppeForm.name.trim(),beschreibung:gruppeForm.beschreibung||"",module:gruppeForm.module||[],farbe:gruppeForm.farbe||"#8B5CF6",modul_stufen:gruppeForm.modul_stufen||{},aktiv:true};
                  if(supabase){
                    if(editGruppe?.id){
                      const{error}=await supabase.from("portal_gruppen").update(payload).eq("id",editGruppe.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{error}=await supabase.from("portal_gruppen").insert(payload);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_gruppen").select("*").order("name");
                    if(fresh) setGruppen(fresh);
                  } else {
                    if(editGruppe){
                      setGruppen(prev=>{
                        const updated=prev.map(g=>g.id===editGruppe.id?{...g,...payload}:g);
                        return updated.length>0?updated:[{id:editGruppe.id,...payload}];
                      });
                      if(selectedGruppe?.id===editGruppe.id) setSelectedGruppe(g=>({...g,...payload}));
                    } else {
                      setGruppen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowGruppeForm(false); setEditGruppe(null);
                  setSaveMsg(editGruppe?"Gruppe gespeichert":"Gruppe erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"12px 20px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editGruppe?"Änderungen speichern":"Gruppe erstellen"}
                </button>
                <Btn onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>

          {/* Funktion bearbeiten Modal */}
          <ModalOrSheet open={showFunktionForm} onClose={()=>{setShowFunktionForm(false);setEditFunktion(null);}} maxWidth={520}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div>
                  <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"var(--text)"}}>{editFunktion?"Funktion bearbeiten":"Neue Funktion"}</h2>
                  {selectedGruppe&&<div style={{fontSize:13,color:selectedGruppe.farbe,fontWeight:600,marginTop:2}}>in {selectedGruppe.name}</div>}
                </div>
                <button onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}} style={{background:"none",border:"none",fontSize:21,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:16}}>
                Einschränkungen innerhalb der Gruppe — leer = alles der Gruppe sichtbar.
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
              {/* Name */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Name *</label>
                <input value={funktionForm.name} onChange={e=>setFunktionForm(p=>({...p,name:e.target.value}))}
                  placeholder="z.B. Chef Anlässe" autoFocus
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={funktionForm.beschreibung||""} onChange={e=>setFunktionForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Was macht diese Funktion?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Module einschränken + Stufe überschreiben */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>
                  Module & Stufen-Override
                  <span style={{fontWeight:400,marginLeft:6,fontSize:11,color:"var(--sub)"}}>
                    Gruppen-Stufe überschreiben (nur höher)
                  </span>
                </label>
                <InfoBox text="Leer lassen = alle Module der Gruppe mit Gruppen-Stufe. Override = nur für ausgewählte Module die Stufe erhöhen." color={BL}/>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                  {(selectedGruppe?.module||ALLE_MODULE.filter(m=>m.key!=="dashboard").map(m=>m.key)).map(mk=>{
                    const m=ALLE_MODULE.find(x=>x.key===mk)||{key:mk,label:mk,icon:"circle"};
                    const gruppeStufe=(selectedGruppe?.modul_stufen||{})[mk]||"lesen";
                    const override=(funktionForm.stufe_override||{})[mk];
                    const STUFEN=["lesen","schreiben","verwalten"];
                    const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
                    return(
                      <div key={mk} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <TI n={m.icon||"circle"} size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                        <span style={{flex:1,fontSize:13,color:"var(--text)"}}>{m.label}</span>
                        {/* Gruppen-Default als Referenz */}
                        <span style={{fontSize:11,color:"var(--sub)",padding:"2px 6px",borderRadius:4,background:"var(--surface2)"}}>Gruppe: {gruppeStufe}</span>
                        {/* Override Buttons (nur höhere Stufen) */}
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>setFunktionForm(p=>{const ns={...p.stufe_override};delete ns[mk];return{...p,stufe_override:ns};})}
                            style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${!override?"#000":"var(--border)"}`,background:!override?"#00000010":"transparent",color:!override?"var(--text)":"var(--sub)",fontSize:11,cursor:"pointer",fontFamily:FONT}}>
                            Standard
                          </button>
                          {STUFEN.filter(s=>STUFE_RANG[s]>STUFE_RANG[gruppeStufe]).map(s=>(
                            <button key={s} onClick={()=>setFunktionForm(p=>({...p,stufe_override:{...p.stufe_override,[mk]:s}}))}
                              style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${override===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:override===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:override===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:11,fontWeight:override===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                              {ZUGRIFF_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:12,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!funktionForm.name.trim()) return;
                  const payload={
                    name:funktionForm.name.trim(),
                    beschreibung:funktionForm.beschreibung||"",
                    gruppe_id:funktionForm.gruppe_id||selectedGruppe?.id,
                    module_override:funktionForm.module_override||[],
                    stufe_override:funktionForm.stufe_override||{},
                    teams:funktionForm.teams||[],
                    filter:funktionForm.filter||{},
                    aktiv:true
                  };
                  if(supabase){
                    if(editFunktion?.id){
                      const{error}=await supabase.from("portal_funktionen").update(payload).eq("id",editFunktion.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{error}=await supabase.from("portal_funktionen").insert(payload);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe)").order("name");
                    if(fresh) setFunktionen(fresh);
                  } else {
                    if(editFunktion){
                      setFunktionen(prev=>prev.map(f=>f.id===editFunktion.id?{...f,...payload}:f));
                    } else {
                      setFunktionen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowFunktionForm(false); setEditFunktion(null);
                  setSaveMsg(editFunktion?"Funktion gespeichert":"Funktion erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"12px 20px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editFunktion?"Änderungen speichern":"Funktion erstellen"}
                </button>
                <Btn onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>
        </div>
      )}

      {/* ── TAB: TEAM-MODULE ── */}
      {!loading&&tab==="teammodule"&&(()=>{
        const TEAM_MODS=[
          {key:"roster",    label:"Kader"},
          {key:"training",  label:"Training"},
          {key:"spielplan", label:"Spielplan"},
          {key:"events",    label:"Termine"},
          {key:"attendance_central",label:"Anwesenheit"},
          {key:"helpers",   label:"Helfer"},
          {key:"polls",     label:"Abstimmungen"},
          {key:"stats",     label:"Statistik"},
          {key:"media",     label:"Medien"},
          {key:"news",      label:"News"},
          {key:"wiki",      label:"Wiki"},
          {key:"docs",      label:"Dokumente"},
        ];
        /* Lokaler State für Änderungen */
        return(
          <TeamModuleMatrix supabase={supabase} setSaveMsg={setSaveMsg}/>
        );
      })()}

      {/* ── TAB: BENUTZER & ROLLEN ── */}
      {!loading&&tab==="users"&&(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{fontSize:13,color:"var(--sub)"}}>{benutzerListe.length} Benutzer</div>
            <Btn variant="primary" color={BK} onClick={()=>{}}>+ Benutzer einladen</Btn>
          </div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4}}>Name</th>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4}}>E-Mail</th>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4}}>Portal-Rolle</th>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4}}>Funktionen</th>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:0.4}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {benutzerListe.length===0&&(
                  <tr><td colSpan={5} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:13}}>Keine Benutzer gefunden</td></tr>
                )}
                {benutzerListe.map((b,i)=>(
                  <tr key={b.id} style={{borderTop:"0.5px solid var(--border)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600,color:"var(--text)"}}>{b.name||"—"}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>{b.email}</td>
                    <td style={{padding:"9px 13px"}}>
                      <select value={b.role||"spieler"} onChange={e=>updateBenutzerRolle(b.id,e.target.value)}
                        style={{padding:"8px 14px",border:"1px solid var(--border)",borderRadius:8,fontSize:13,background:"var(--surface)",color:ROLES[b.role]?.color||"var(--text)",fontFamily:FONT,cursor:"pointer"}}>
                        {ROLLEN.map(r=><option key={r} value={r}>{ROLLEN_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      {/* Funktionen anzeigen + zuweisen */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                        {(b.funktionen||[]).map(f=>(
                          <span key={f.id} style={{
                            fontSize:11,padding:"2px 8px",borderRadius:8,
                            background:"#8B5CF615",color:"#7C3AED",
                            display:"flex",alignItems:"center",gap:4
                          }}>
                            {f.name}
                            <button onClick={async()=>{
                              if(supabase) await supabase.from("benutzer_funktionen").delete().match({benutzer_id:b.id,funktion_id:f.id});
                              setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:(u.funktionen||[]).filter(x=>x.id!==f.id)}:u));
                            }} style={{background:"none",border:"none",cursor:"pointer",color:"#7C3AED",padding:0,lineHeight:1,fontSize:13}}>×</button>
                          </span>
                        ))}
                        {/* Funktion hinzufügen */}
                        <select
                          value=""
                          onChange={async e=>{
                            const fid=Number(e.target.value);
                            if(!fid) return;
                            const fn=funktionen.find(f=>f.id===fid);
                            if(!fn) return;
                            if(supabase){
                              const{error}=await supabase.from("benutzer_funktionen").upsert({benutzer_id:b.id,funktion_id:fid},{onConflict:"benutzer_id,funktion_id"});
                              if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                            }
                            setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:[...(u.funktionen||[]),fn]}:u));
                            setSaveMsg("Funktion zugewiesen");setTimeout(()=>setSaveMsg(""),2000);
                          }}
                          style={{padding:"3px 6px",border:"1px dashed var(--border)",borderRadius:6,fontSize:11,background:"transparent",color:"var(--sub)",cursor:"pointer",fontFamily:FONT}}>
                          <option value="">+ Funktion</option>
                          {funktionen.filter(f=>!(b.funktionen||[]).find(x=>x.id===f.id)).map(f=>(
                            <option key={f.id} value={f.id}>{f.portal_gruppen?.name?`${f.portal_gruppen.name} · `:""}{f.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      <Chip text={b.aktiv!==false?"Aktiv":"Inaktiv"} color={b.aktiv!==false?GN:R} bg={b.aktiv!==false?"#ECFDF5":RL}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
      {!loading&&tab==="feldvis"&&(
        <div>
          <InfoBox text="Steuert welche Mitglieder-Felder pro Rolle sichtbar sind. Änderungen wirken sofort." color={BL}/>
          <div style={{height:12}}/>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>Feld</th>
                  {ROLLEN.map((r,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{ROLLEN_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(felderNachKey).map(([key,data],i)=>(
                  <tr key={key} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{data.label}</td>
                    {ROLLEN.map(rolle=>{
                      const sichtbar=data.rollen[rolle]||false;
                      const isAdmin=rolle==="administrator";
                      return(
                        <td key={rolle} style={{padding:"9px 13px",textAlign:"center"}}>
                          <div onClick={isAdmin?undefined:()=>toggleFeld(key,rolle,!sichtbar)}
                            style={{width:20,height:20,borderRadius:4,background:sichtbar?GN:"#e5e7eb",cursor:isAdmin?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",border:`1px solid ${sichtbar?"#16a34a":"#d1d5db"}`}}>
                            {sichtbar&&<TI n="check" style={{fontSize:13,color:"#fff"}}/>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Object.keys(felderNachKey).length===0&&(
                  <tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"var(--sub)",fontSize:13}}>
                    Noch keine Felder konfiguriert — SQL-Schema importieren
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: API-VERBINDUNGEN ── */}
      {/* ── TAB: AUSSEHEN ── */}
      {!loading&&tab==="aussehen"&&(
        <div style={{maxWidth:600}}>
          <InfoBox text="Farben und Branding des Portals anpassen. Änderungen werden sofort in der Vorschau angezeigt und nach dem Speichern live übernommen." color={BL}/>

          {/* Vorschau */}
          <Card style={{marginTop:14,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vorschau</div>
            <div style={{padding:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
              {/* Mini-Navbar */}
              <div style={{background:theme.navBg,borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:12,minWidth:180}}>
                <div style={{width:32,height:32,borderRadius:8,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  <img src={theme.logo||LOGO_B64} style={{width:32,height:32,objectFit:"cover",display:"block"}} alt="Logo"/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:theme.navText,lineHeight:1.2,letterSpacing:-0.2}}>{theme.vereinsname||"Mein Verein"}</div>
                  <div style={{fontSize:11,color:theme.navAccent||theme.vereinsfarbe1,letterSpacing:0.5,textTransform:"uppercase",fontWeight:600,marginTop:1}}>{"ClubCampus"}</div>
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:theme.btnPrimary,color:theme.btnPrimaryText,fontSize:13,fontWeight:600,cursor:"default"}}>Speichern</button>
                <span style={{padding:"4px 10px",borderRadius:20,background:theme.vereinsfarbe1,color:theme.vereinsfarbe2,fontSize:11,fontWeight:700}}>Aktiv</span>
                <div style={{width:32,height:32,borderRadius:"50%",background:theme.vereinsfarbe1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:13,fontWeight:700,color:theme.vereinsfarbe2}}>DG</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Vereinsname */}
          <Card style={{marginTop:12,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <TI n="building-community" size={18} style={{color:"var(--sub)",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>Vereinsname</div>
                <input value={theme.vereinsname||""} onChange={e=>updateTheme("vereinsname",e.target.value)}
                  style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13,background:"var(--surface)",color:"var(--text)",outline:"none",fontFamily:FONT}}/>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:3}}>Wird unter dem Portal-Logo angezeigt</div>
              </div>
            </div>
          </Card>

          {/* Vereinslogo */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vereinslogo</div>
            <div style={{padding:16,display:"flex",alignItems:"center",gap:16}}>
              {/* Aktuelles Logo */}
              <div style={{width:72,height:72,borderRadius:14,border:"0.5px solid var(--border)",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                {theme.logo
                  ?<img src={theme.logo} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="Logo"/>
                  :<TI n="photo" size={28} style={{color:"var(--sub)"}}/>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>Logo hochladen</div>
                <div style={{fontSize:11,color:"var(--sub)",marginBottom:10}}>SVG oder PNG, empfohlen mind. 200×200px</div>
                <div style={{display:"flex",gap:8}}>
                  <label style={{
                    display:"inline-flex",alignItems:"center",gap:8,padding:"7px 14px",
                    borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",
                    color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer"
                  }}>
                    <TI n="upload" size={13}/>Datei wählen
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const file=e.target.files?.[0];
                      if(!file) return;
                      const reader=new FileReader();
                      reader.onload=ev=>{
                        /* Logo auf max 256x256px komprimieren */
                        const img=new Image();
                        img.onload=()=>{
                          const MAX=256;
                          const canvas=document.createElement("canvas");
                          const ratio=Math.min(MAX/img.width,MAX/img.height,1);
                          canvas.width=Math.round(img.width*ratio);
                          canvas.height=Math.round(img.height*ratio);
                          canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
                          updateTheme("logo",canvas.toDataURL("image/png",0.85));
                        };
                        img.src=ev.target.result;
                      };
                      reader.readAsDataURL(file);
                    }}/>
                  </label>
                  {theme.logo&&(
                    <button onClick={()=>updateTheme("logo",null)} style={{
                      padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",
                      background:"transparent",color:"var(--sub)",fontSize:13,cursor:"pointer",fontFamily:FONT
                    }}>
                      <TI n="trash" size={13}/> Entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Farb-Einstellungen */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            {[
              {key:"vereinsfarbe1",  label:"Vereinsfarbe",              hint:"Hauptfarbe des Vereins — für Badges, Highlights, aktive Elemente"},
              {key:"vereinsfarbe2",  label:"Text auf Vereinsfarbe",    hint:"Muss auf der Vereinsfarbe gut lesbar sein"},

              {key:"navBg",          label:"Menü Hintergrund",          hint:"Hintergrundfarbe der Navigationsleiste"},
              {key:"navText",        label:"Menü Text",                 hint:"Farbe der inaktiven Menüpunkte"},
              {key:"navHover",       label:"Menü Hover",                hint:"Farbe beim Überfahren eines Menüpunkts"},
              {key:"navAccent",      label:"Menü Aktiv Hintergrund",    hint:"Standard: Vereinsfarbe — bei Bedarf anpassen"},
              {key:"navAccentText",  label:"Menü Aktiv Text",           hint:"Standard: Text auf Vereinsfarbe — bei Bedarf anpassen"},

              {key:"avatarBg",       label:"Avatar Hintergrund",        hint:"Standard: Vereinsfarbe"},
              {key:"avatarText",     label:"Avatar Text",               hint:"Standard: Text auf Vereinsfarbe"},

              {key:"btnPrimary",     label:"Button Hintergrund",        hint:"Hintergrundfarbe für Haupt-Buttons"},
              {key:"btnPrimaryText", label:"Button Text",               hint:"Textfarbe für Haupt-Buttons"},
            ].map((item,i)=>(
              <div key={item.key} style={{display:"flex",alignItems:"center",gap:16,padding:"12px 16px",borderTop:i>0?"0.5px solid var(--border)":"none"}}>
                <input type="color" value={theme[item.key]||(item.key==="navAccent"||item.key==="avatarBg"?theme.vereinsfarbe1:item.key==="navAccentText"||item.key==="avatarText"?theme.vereinsfarbe2||"#000000":"#000000")||"#000000"} onChange={e=>updateTheme(item.key,e.target.value)}
                  style={{width:36,height:36,borderRadius:8,border:"0.5px solid var(--border)",padding:2,cursor:"pointer",background:"none"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{item.label}</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{item.hint}</div>
                </div>
                <code style={{fontSize:11,color:"var(--sub)",background:"var(--surface2)",padding:"2px 7px",borderRadius:4}}>{theme[item.key]||(["navAccent","navAccentText","avatarBg","avatarText"].includes(item.key)?"auto":"")}</code>
                <button onClick={()=>updateTheme(item.key,["navAccent","navAccentText","avatarBg","avatarText"].includes(item.key)?null:THEME_DEFAULT_STATIC[item.key])} title="Zurücksetzen"
                  style={{background:"none",border:"none",cursor:"pointer",color:"var(--sub)",padding:4}}>
                  <TI n="refresh" size={14}/>
                </button>
              </div>
            ))}
          </Card>

          {/* Speichern */}
          <div style={{display:"flex",gap:12,marginTop:16}}>
            <button onClick={saveTheme}
              onMouseEnter={e=>e.currentTarget.style.background="var(--btn-hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=BTN} style={{
              padding:"9px 24px",borderRadius:10,border:"none",
              background:BTN,color:BTN_TXT,transition:"background 0.15s",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT
            }}>Speichern & anwenden</button>
            <button onClick={()=>{const t=THEME_DEFAULT_STATIC;setAppTheme(t);setThemeDirty(false);if(applyTheme)applyTheme(t);if(supabase){if(vereinId)supabase.from("vereine").update({theme:t}).eq("id",vereinId).then(({error:e})=>{setSaveMsg(e?"Fehler: "+e.message:"Standard gespeichert ✓");setTimeout(()=>setSaveMsg(""),2500);});}}} style={{
              padding:"9px 16px",borderRadius:10,border:"1px solid var(--border)",
              background:"transparent",color:"var(--sub)",fontSize:13,cursor:"pointer",fontFamily:FONT
            }}>ClubCampus-Farben</button>
          </div>
        </div>
      )}

      {!loading&&tab==="api"&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
          <div style={{height:16}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
            {(apiVerbindungen.length>0?apiVerbindungen:Object.entries(API_INFOS).map(([key,info])=>({key,label:key,active:false,konfiguriert:false,sync_status:"deaktiviert",...info}))).map(api=>{
              const info=API_INFOS[api.key]||{};
              const statusColor=api.sync_status==="ok"?GN:api.sync_status==="fehler"?R:api.sync_status==="ausstehend"?AM:"#aaa";
              const statusBg=api.sync_status==="ok"?"#ECFDF5":api.sync_status==="fehler"?RL:api.sync_status==="ausstehend"?"#FFFBEB":"#f5f5f3";
              return(
                <Card key={api.key}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <TI n="plug" style={{fontSize:18,color:api.active?BK:"#ccc"}}/>
                      <span style={{fontWeight:700,fontSize:14}}>{api.label||api.key}</span>
                    </div>
                    <Chip text={api.sync_status||"deaktiviert"} color={statusColor} bg={statusBg}/>
                  </div>
                  <p style={{fontSize:13,color:"var(--sub)",margin:"0 0 10px",lineHeight:1.5}}>{info.description||"Externe API-Verbindung"}</p>
                  {info.felder&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginBottom:4}}>Synchronisierte Daten:</div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--sub)",padding:"2px 0"}}>
                          <TI n="check" style={{fontSize:13,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {api.letzter_sync&&(
                    <div style={{fontSize:13,color:"var(--sub)",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    {api.active&&<Btn sm variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    <Btn sm variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT-LOGS ── */}
      {!loading&&tab==="audit"&&(
        <div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Zeit","API / System","Status","Neu","Aktualisiert","Fehler","Details"].map((h,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.length===0&&(
                  <tr><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:13}}>Noch keine Sync-Logs vorhanden</td></tr>
                )}
                {auditLogs.map((log,i)=>(
                  <tr key={log.id} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",color:"var(--sub)",whiteSpace:"nowrap",fontSize:13}}>
                      {log.gestartet_am?new Date(log.gestartet_am).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"}):"—"}
                    </td>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{log.api_verbindungen?.label||"System"}</td>
                    <td style={{padding:"9px 13px"}}><Chip text={log.status||"—"} color={log.status==="ok"?GN:log.status==="fehler"?R:AM} bg={log.status==="ok"?"#ECFDF5":log.status==="fehler"?RL:"#FFFBEB"}/></td>
                    <td style={{padding:"9px 13px",color:GN,fontWeight:600}}>{log.datensaetze_neu||0}</td>
                    <td style={{padding:"9px 13px",color:BL,fontWeight:600}}>{log.datensaetze_aktualisiert||0}</td>
                    <td style={{padding:"9px 13px",color:log.datensaetze_fehler>0?R:"#aaa",fontWeight:600}}>{log.datensaetze_fehler||0}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:13,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.meldung||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

export { TeamModuleMatrix, PortalverwaltungView };
