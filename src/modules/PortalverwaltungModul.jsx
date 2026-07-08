/* ═══════════════════════════════════════════════════════════════
   ClubCampus PortalverwaltungModul — PortalverwaltungModul.jsx
   Portalverwaltung: Module, Berechtigungen, Benutzer, Aussehen
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { ACCENT, ACCENT2, ACCENT20, AM, BK, BL, BTN_COLOR as BTN, BTN_TXT, FONT, GB, GN, GR, R, RL, STATUS_BG, STATUS_CLR } from "../constants.js";
import { TI } from "../icons.jsx";
import { Btn, Card, Chip, Col, H1, H2, InfoBox, Input, LOGO_B64, ModalOrSheet, ModalTitle, Row, STitle, SectionLabel, Select, Stat, Sub, Av, Tabs, Label, THEME_DEFAULT_STATIC, darkenHex, hexToRgba, useIsMobile, avColor, useConfirm, ConfirmDialog } from "../theme.jsx";
import { ModuleRechteTab } from "./portal/ModuleRechteTab.jsx";
import { GruppenTab } from "./portal/GruppenTab.jsx";
import { TeamModuleTab } from "./portal/TeamModuleTab.jsx";
import { FeldvisTab } from "./portal/FeldvisTab.jsx";
import { UsersTab } from "./portal/UsersTab.jsx";
import { MitgliederKonfigTab } from "./portal/MitgliederKonfigTab.jsx";
import { RollenTab } from "./portal/RollenTab.jsx";
import { KaderRollenTab } from "./portal/KaderRollenTab.jsx";
import { AussehenTab } from "./portal/AussehenTab.jsx";
import { ApiTab } from "./portal/ApiTab.jsx";
import { AuditTab } from "./portal/AuditTab.jsx";

/* ── Geteilte Konstanten ── */
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
const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
function maxStufe(a, b){
  if(!a) return b; if(!b) return a;
  return STUFE_RANG[a]>STUFE_RANG[b]?a:b;
}
function TeamModuleMatrix({supabase,setSaveMsg}){
  const sb=supabase||window.__sb;
  const [teams,setTeams]=useState([]);
  const [moduleMap,setModuleMap]=useState({}); // {team_id: [modul,...]}
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [filterHaupt,setFilterHaupt]=useState("alle");
  const [expandedTeam,setExpandedTeam]=useState(null);
  const isMob=useIsMobile();

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

  if(loading) return <div style={{padding:20,color:"var(--sub)",fontSize:14}}>Lade Team-Module…</div>;

  const hauptbereiche=["alle",...[...new Set(teams.map(t=>t.hauptbereich).filter(Boolean))]];
  const filtered=filterHaupt==="alle"?teams:teams.filter(t=>t.hauptbereich===filterHaupt);
  const HB_COLORS={"Aktivfussball":"#3B82F6","Juniorenfussball":"#22C55E","Mädchenfussball":"#EC4899","Senioren":"#F97316","Freizeitfussball":"#8B5CF6"};

  /* ── Filter-Chips (beide Views) ── */
  const FilterChips=()=>(
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {hauptbereiche.map(h=>{
        const col=HB_COLORS[h]||BK;
        const isActive=filterHaupt===h;
        return(
          <button key={h} onClick={()=>setFilterHaupt(h)} style={{
            padding:"5px 14px",borderRadius:20,fontFamily:FONT,fontSize:12,cursor:"pointer",
            fontWeight:isActive?700:400,border:`1.5px solid ${isActive?col:"var(--border)"}`,
            background:isActive?col+"15":"transparent",color:isActive?col:"var(--sub)"
          }}>{h==="alle"?"Alle":h}</button>
        );
      })}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16}}>
        <InfoBox text="Klick auf ein Icon aktiviert/deaktiviert das Modul pro Team. Spalten-Buttons setzen ein Modul für alle gefilterten Teams." color={BL}/>
        {saving&&<span style={{fontSize:12,color:"var(--sub)"}}>Speichert…</span>}
      </div>
      <FilterChips/>

      {isMob?(
        /* ── MOBILE: ausklappbare Teams ── */
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(t=>{
            const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
            const isOpen=expandedTeam===t.id;
            const activeCount=TEAM_MODS.filter(m=>aktive.includes(m.key)).length;
            const col=HB_COLORS[t.hauptbereich]||"var(--border)";
            return(
              <div key={t.id} style={{borderRadius:10,border:`1px solid ${isOpen?col:"var(--border)"}`,overflow:"hidden",background:"var(--surface)"}}>
                {/* Header */}
                <div onClick={()=>setExpandedTeam(isOpen?null:t.id)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{width:4,alignSelf:"stretch",background:col,borderRadius:2,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{t.name}</div>
                    <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>
                      {activeCount} / {TEAM_MODS.length} Module aktiv
                    </div>
                  </div>
                  <TI n={isOpen?"chevron-up":"chevron-down"} size={16} style={{color:"var(--sub)",flexShrink:0}}/>
                </div>
                {/* Module Toggles */}
                {isOpen&&(
                  <div style={{borderTop:"0.5px solid var(--border)",padding:"12px 14px",
                    display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {TEAM_MODS.map(m=>{
                      const isOn=aktive.includes(m.key);
                      return(
                        <div key={m.key} onClick={()=>toggleTeamModul(t.id,m.key)}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                            borderRadius:8,border:`1px solid ${isOn?GN:"var(--border)"}`,
                            background:isOn?GN+"10":"var(--surface2)",cursor:"pointer"}}>
                          <TI n={m.icon||"circle"} size={15} style={{color:isOn?GN:"var(--sub)",flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:isOn?600:400,color:isOn?"var(--text)":"var(--sub)",flex:1}}>{m.label}</span>
                          {isOn&&<TI n="check" size={12} style={{color:GN,flexShrink:0}}/>}
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
        /* ── DESKTOP: Tabelle ── */
        <Card style={{padding:0,overflowX:"auto"}}>
          <table className="cc-table">
            <thead>
              <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                <th className="cc-th">
                  Team <span style={{fontWeight:400,opacity:0.6}}>({filtered.length})</span>
                </th>
                {TEAM_MODS.map(m=>(
                  <th key={m.key} style={{padding:"8px 4px",textAlign:"center",minWidth:54}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <TI n={m.icon||"circle"} size={15} style={{color:"var(--sub)"}}/>
                      <span style={{fontSize:9,color:"var(--sub)",fontWeight:400,textTransform:"uppercase",letterSpacing:0.3}}>{m.label}</span>
                      <div style={{display:"flex",gap:2}}>
                        <button onClick={()=>applyToAll(m.key,true)} title={`Alle: ${m.label} ein`}
                          style={{width:16,height:16,borderRadius:3,border:"1px solid "+GN,background:GN+"20",color:GN,cursor:"pointer",fontFamily:FONT,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</button>
                        <button onClick={()=>applyToAll(m.key,false)} title={`Alle: ${m.label} aus`}
                          style={{width:16,height:16,borderRadius:3,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer",fontFamily:FONT,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✗</button>
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
                        <td colSpan={TEAM_MODS.length+1} style={{padding:"6px 16px 4px",fontSize:10,fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:i>0?"1px solid var(--border)":"none"}}>
                          {t.hauptbereich||"Weitere"}
                        </td>
                      </tr>
                    );
                  }
                  const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
                  const allAktiv=TEAM_MODS.every(m=>aktive.includes(m.key));
                  rows.push(
                    <tr key={t.id} style={{borderTop:"0.5px solid var(--border)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"8px 16px",fontWeight:500,color:"var(--text)",position:"sticky",left:0,background:"var(--surface)",fontSize:14,zIndex:1}}>
                        <Row>
                          <div style={{width:3,height:20,borderRadius:2,background:HB_COLORS[t.hauptbereich]||"var(--border)",flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                            {t.kurzname&&t.kurzname!==t.name&&<div style={{fontSize:10,color:"var(--sub)"}}>{t.kurzname}</div>}
                          </div>
                          <div onClick={()=>TEAM_MODS.forEach(m=>toggleTeamModul(t.id,m.key,!allAktiv))}
                            title={allAktiv?"Alle deaktivieren":"Alle aktivieren"}
                            style={{width:20,height:20,borderRadius:5,border:`1.5px solid ${allAktiv?GN:"var(--border)"}`,background:allAktiv?GN+"20":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {allAktiv&&<TI n="check" size={11} style={{color:GN}}/>}
                          </div>
                        </Row>
                      </td>
                      {TEAM_MODS.map(m=>{
                        const isOn=aktive.includes(m.key);
                        return(
                          <td key={m.key} style={{textAlign:"center",padding:"6px 4px"}}>
                            <div onClick={()=>toggleTeamModul(t.id,m.key)}
                              title={`${t.name}: ${m.label} ${isOn?"deaktivieren":"aktivieren"}`}
                              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.15)"}
                              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                              style={{width:28,height:28,borderRadius:7,margin:"0 auto",cursor:"pointer",background:isOn?GN+"20":"transparent",border:`1.5px solid ${isOn?GN:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}>
                              {isOn?<TI n="check" size={13} style={{color:GN}}/>:<span style={{color:"var(--border)",fontSize:12}}>–</span>}
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

function PortalverwaltungView(props){
  const {initialTab="module",moduleAktiv={},setModuleAktiv,moduleRechte,setModuleRechte,sb:supabase,appTheme,setAppTheme,applyThemeCss:applyTheme,vereinId,dbPortalRollen:externalRollen=[],onReloadRollen,dbKaderRollen:externalKaderRollen=[],onReloadKaderRollen} = props;
  const [confirm,confirmDialog]=useConfirm();
  const [tab,setTab]=useState(initialTab);
  const [dbPortalRollen,setDbPortalRollen]=useState(externalRollen);
  useEffect(()=>{if(externalRollen.length>0)setDbPortalRollen(externalRollen);},[externalRollen]);
  const [dbKaderRollen,setDbKaderRollen]=useState(externalKaderRollen);
  useEffect(()=>{if(externalKaderRollen.length>0)setDbKaderRollen(externalKaderRollen);},[externalKaderRollen]);
  const [kaderRolleForm,setKaderRolleForm]=useState({name:"",ist_trainer:false,sort_order:50});
  const [editKaderRolle,setEditKaderRolle]=useState(null);
  const [showKaderRolleForm,setShowKaderRolleForm]=useState(false);
  const [rollenForm,setRollenForm]=useState({name:"",label:"",prioritaet:50});
  const [editRolle,setEditRolle]=useState(null);
  const [showRolleForm,setShowRolleForm]=useState(false);
  const [module,setModule]=useState([]);

  async function saveKaderRolle(){
    if(!kaderRolleForm.name.trim()) return;
    const payload={name:kaderRolleForm.name.trim(),ist_trainer:!!kaderRolleForm.ist_trainer,sort_order:parseInt(kaderRolleForm.sort_order)||50,aktiv:true};
    if(supabase){
      if(editKaderRolle?.id){
        await supabase.from("kader_rollen").update(payload).eq("id",editKaderRolle.id);
      } else {
        await supabase.from("kader_rollen").insert(payload);
      }
      const{data}=await supabase.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order");
      if(data){setDbKaderRollen(data);if(onReloadKaderRollen)onReloadKaderRollen();}
    }
    setShowKaderRolleForm(false);setEditKaderRolle(null);setKaderRolleForm({name:"",ist_trainer:false,sort_order:50});
  }

  async function deleteKaderRolle(id){
    const ok=await confirm({title:"Kader-Rolle löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
    if(!supabase||!ok) return;
    await supabase.from("kader_rollen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order");
    if(data){setDbKaderRollen(data);if(onReloadKaderRollen)onReloadKaderRollen();}
  }

  async function saveRolle(){
    if(!rollenForm.name.trim()||!rollenForm.label.trim()) return;
    const payload={name:rollenForm.name.trim(),label:rollenForm.label.trim(),prioritaet:parseInt(rollenForm.prioritaet)||50,aktiv:true};
    if(supabase){
      if(editRolle?.id){
        await supabase.from("portal_rollen").update(payload).eq("id",editRolle.id);
      } else {
        await supabase.from("portal_rollen").insert(payload);
      }
      const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
      if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
    }
    setShowRolleForm(false);setEditRolle(null);setRollenForm({name:"",label:"",prioritaet:50});
  }

  async function deleteRolle(id){
    const ok=await confirm({title:"Rolle löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
    if(!supabase||!ok) return;
    await supabase.from("portal_rollen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
    if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
  }
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
  const [pvTeams,setPvTeams]=useState([]);
  const [gruppenTeams,setGruppenTeams]=useState([]);
  const [rollePflichtfelder,setRollePflichtfelder]=useState([]);
  const [mitgliedtypPflichtfelder,setMitgliedtypPflichtfelder]=useState([]);
  const [dbMitgliedtypen,setDbMitgliedtypen]=useState([]);
  const [showMitgliedtypForm,setShowMitgliedtypForm]=useState(false);
  const [editMitgliedtyp,setEditMitgliedtyp]=useState(null);
  const [mitgliedtypForm,setMitgliedtypForm]=useState({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""}); // portal_gruppen_teams
  const [selectedGruppe,setSelectedGruppe]=useState(null);
  const [showGruppeForm,setShowGruppeForm]=useState(false);
  const [showFunktionForm,setShowFunktionForm]=useState(false);
  const [editGruppe,setEditGruppe]=useState(null);
  const [editFunktion,setEditFunktion]=useState(null);
  const [gruppeForm,setGruppeForm]=useState({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{},teams:[]});
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
      r.setProperty("--cc-accent-25", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.25));
      r.setProperty("--cc-accent-20", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.12));
      r.setProperty("--cc-accent-15", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.09));
      r.setProperty("--cc-accent-12", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.07));
      r.setProperty("--cc-accent-10", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.10));
      r.setProperty("--cc-accent-5",  hexToRgba(td.vereinsfarbe1||"#FFBF00",0.05));
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
        const q = vereinId
          ? supabase.from("vereine").update({theme:themeToSave}).eq("id",vereinId)
          : supabase.from("vereine").update({theme:themeToSave});
        q.then(({error:e})=>{
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

  const KATEGORIEN_NAV=[
    {
      key:"berechtigungen", label:"Berechtigungen", icon:"shield-lock", color:"#3B82F6", bg:"#EFF6FF",
      tabs:[
        {key:"module",     label:"Module & Rechte",     icon:"layout-grid"},
        {key:"gruppen",    label:"Gruppen & Funktionen", icon:"sitemap"},
        {key:"teammodule", label:"Team-Module",          icon:"ball-football"},
        {key:"feldvis",    label:"Feldsichtbarkeit",     icon:"eye"},
      ]
    },
    {
      key:"benutzer", label:"Benutzer & Rollen", icon:"users", color:"#16A34A", bg:"#ECFDF5",
      tabs:[
        {key:"users",       label:"Benutzer & Rollen",         icon:"users"},
        {key:"mitglieder_config", label:"Mitglieder-Konfiguration", icon:"id-badge"},
        {key:"rollen", label:"Portal-Rollen", icon:"shield"},
        {key:"kader_rollen", label:"Kader-Rollen", icon:"users"},
      ]
    },
    {
      key:"erscheinungsbild", label:"Erscheinungsbild", icon:"palette", color:"#F59E0B", bg:"#FFFBEB",
      tabs:[
        {key:"aussehen", label:"Aussehen", icon:"palette"},
      ]
    },
    {
      key:"system", label:"System", icon:"settings", color:"#7C3AED", bg:"#F5F3FF",
      tabs:[
        {key:"api",   label:"API-Verbindungen", icon:"plug"},
        {key:"audit", label:"Audit-Logs",       icon:"clipboard-list"},
      ]
    },
    {
      key:"design", label:"Design-System", icon:"layout-2", color:"#EC4899", bg:"#FDF2F8",
      tabs:[
      ]
    },
  ];
  /* Aktive Kategorie aus Tab ableiten */
  const getKatForTab=(t)=>KATEGORIEN_NAV.find(k=>k.tabs.some(x=>x.key===t))||KATEGORIEN_NAV[0];
  const [aktiveKat, setAktiveKat]=useState(()=>getKatForTab(initialTab).key);
  const [mobileKachel, setMobileKachel]=useState(null); // null = Landingseite
  const isMobile=useIsMobile();

  const ROLLEN=dbPortalRollen.length>0?dbPortalRollen.map(r=>r.name):["administrator","administration","funktionaer","trainer","spieler","eltern","mitglied","supporter"];
  const ROLLEN_LABELS={administrator:"Admin",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Eltern",supporter:"Supporter"};
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
    {key:"news",       label:"News",               icon:"news",             kat:"kommunikation"},
    {key:"wiki",       label:"Wiki",               icon:"book",             kat:"kommunikation"},
    {key:"docs",       label:"Dokumente",          icon:"file-text",        kat:"kommunikation"},
    {key:"portal",     label:"Portalverwaltung",   icon:"settings",         kat:"admin",         pflicht:true},
  ];

  const ROLLEN_MODULE_DEFAULT={
    administrator:   ALLE_MODULE.map(m=>m.key),
    administration:  ["dashboard","members","team","training","schedule","attendance_central","events","helpers","buses","material","lockers","media","news","wiki","docs","portal"],
    funktionaer:     ["dashboard"],
    trainer:         ["dashboard","team","training","events","helpers","buses","material","lockers","news","wiki","docs"],
    spieler:         ["dashboard","team","events","helpers","docs","news"],
    eltern:          ["dashboard","team","events","helpers","docs","news"],
    supporter:       ["dashboard","events","helpers","news"],
  };

  /* Modul-Aktionen für Detail-Ansicht */
  const MODUL_AKTIONEN={
    dashboard:  [{label:"Übersicht ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"}],
    team:       [
      {label:"Team + Kader ansehen",          wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Position / Nummer ändern",      wer:["administrator","administration","trainer"],min:"schreiben",   spez:"Trainer: nur eigene Spieler"},
      {label:"Spieler hinzufügen / entfernen",wer:["administrator","administration"],         min:"verwalten"},
      {label:"Team erstellen / bearbeiten",   wer:["administrator","administration"],         min:"verwalten"},
      {label:"Trainer zuweisen",              wer:["administrator","administration"],         min:"verwalten"},
    ],
    members:    [
      {label:"Name, Tel, E-Mail sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Basis-Felder bearbeiten",           wer:["administrator","administration","trainer"],min:"schreiben",spez:"Trainer: nur eigene Spieler"},
      {label:"AHV, Bankdaten sehen",              wer:["administrator","administration"],         min:"verwalten"},
      {label:"Neue Mitglieder, Export, löschen",  wer:["administrator","administration"],         min:"verwalten"},
    ],
    training:   [
      {label:"Trainings ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Training absagen",               wer:["administrator","administration","trainer"],min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Training erstellen / bearbeiten",wer:["administrator","administration","trainer"],min:"verwalten",  spez:"Trainer: nur eigene Teams"},
      {label:"Vorlagen verwalten",             wer:["administrator","administration"],min:"verwalten"},
    ],
    schedule:   [
      {label:"Spielplan + Tabelle ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Daten ändern",               wer:[],                                              min:"verwalten",  note:"Nur via FVRZ-Sync"},
    ],
    attendance_central:[
      {label:"Eigene Statistik sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Anwesenheiten eintragen / ändern", wer:["administrator","administration","trainer"],min:"schreiben", spez:"Trainer: nur eigene Spieler"},
      {label:"Alle Teams auswerten, exportieren",wer:["administrator","administration"],         min:"verwalten"},
    ],
    events:     [
      {label:"Termine ansehen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                           wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinsanlass erstellen / bearbeiten",      wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsanlass absagen / löschen",           wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Event erstellen / bearbeiten",         wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Team-Event absagen / löschen",              wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Spiel-Termin bearbeiten (Treffpunkt etc.)", wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams", note:"Auto-generiert via Spielplan"},
    ],
    helpers:    [
      {label:"Einsätze ansehen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                   wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinseinsatz erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Einsatz erstellen / verwalten", wer:["administrator","trainer"],               min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Zuteilungen verwalten",              wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    buses:      [
      {label:"Fahrten + Belegung ansehen",   wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Platz reservieren / abmelden", wer:["administrator","administration","trainer","spieler"],min:"schreiben"},
      {label:"Fahrten erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    material:   [
      {label:"Inventar ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Ausleihe beantragen",           wer:["administrator","administration","trainer"], min:"schreiben"},
      {label:"Ausleihen genehmigen",          wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Inventar + Bestände verwalten", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    lockers:    [
      {label:"Eigene Zuteilung ansehen", wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Zuteilungen verwalten",    wer:["administrator","administration"],min:"verwalten"},
    ],
    news:       [
      {label:"Artikel lesen",                    wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Vereinsnews erstellen / bearbeiten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsnews publizieren / löschen", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    wiki:       [
      {label:"Artikel lesen",                      wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Artikel bearbeiten",                 wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Artikel erstellen, löschen, Kategorien",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    docs:       [
      {label:"Herunterladen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Hochladen, löschen",             wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Ordner / Kategorien verwalten",  wer:["administrator","administration"],             min:"verwalten"},
    ],
    media:      [
      {label:"Anschauen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
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
    supporter:      {
      _all:"lesen",
      helpers:"schreiben",
    },
  };

  const ZUGRIFF_LABELS={"lesen":"Lesen","schreiben":"Schreiben","verwalten":"Verwalten"};
  const ZUGRIFF_COLORS={"lesen":"#3B82F6","schreiben":"#F97316","verwalten":"#22C55E"};
  const ZUGRIFF_ICONS= {"lesen":"eye","schreiben":"edit","verwalten":"settings"};
  const ZUGRIFF_ORDER=["lesen","schreiben","verwalten"];

  /* Effektive Zugriffsstufe: custom oder Default */
  const [zugriffStufen,setZugriffStufen]=useState(()=>{
    try{const s=localStorage.getItem("fch-zugriff-stufen");return s?JSON.parse(s):null;}catch{return null;}
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
      try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(neu));}catch{}
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
        try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(neu));}catch{}
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
          const [apiR,audR,benuR,gruppenR,funktionenR,mcR,mrR,teamsR,gtR]=await Promise.all([
            supabase.from("api_verbindungen").select("*").order("sort_order"),
            supabase.from("api_sync_log").select("*,api_verbindungen(label)").order("gestartet_am",{ascending:false}).limit(50),
            supabase.from("benutzer").select("id,name,email,role").order("name"),
            supabase.from("portal_gruppen").select("*").order("name"),
            supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe,module,modul_stufen), stufe_override").order("name"),
            supabase.from("module_config").select("*"),
            supabase.from("modul_rechte").select("*"),
            supabase.from("teams").select("id,name,hauptbereich,kurzname").eq("aktiv",true).order("hauptbereich").order("name"),
            supabase.from("portal_gruppen_teams").select("*"),
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
          if(teamsR.data) setPvTeams(teamsR.data);
          if(gtR.data) setGruppenTeams(gtR.data);
          // Pflichtfelder laden
          const [rpfR,mtpfR]=await Promise.all([
            supabase.from("rolle_pflichtfelder").select("*"),
            supabase.from("mitgliedtyp_pflichtfelder").select("*"),
          ]);
          if(rpfR.data) setRollePflichtfelder(rpfR.data);
          if(mtpfR.data) setMitgliedtypPflichtfelder(mtpfR.data);
          const{data:mtData}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
          if(mtData) setDbMitgliedtypen(mtData);
          /* module_config → moduleAktiv State */
          if(mcR.data&&mcR.data.length>0&&setModuleAktiv){
            const ma={};
            mcR.data.forEach(r=>{ma[r.modul]=r.aktiv!==false;});
            setModuleAktiv(ma);
            try{localStorage.setItem("fch-module-aktiv",JSON.stringify(ma));}catch{}
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
            try{localStorage.setItem("fch-module-rechte",JSON.stringify(mr));}catch{}
            if(Object.keys(zs).length>0){
              setZugriffStufen(zs);
              try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(zs));}catch{}
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
    // mitglieder.rolle synchron halten
    const {data:b}=await supabase.from("benutzer").select("mitglied_id").eq("id",id).maybeSingle();
    if(b?.mitglied_id) await supabase.from("mitglieder").update({rolle:role}).eq("id",b.mitglied_id);
    setBenutzerListe(prev=>prev.map(b=>b.id===id?{...b,role}:b));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  function toggleModulGlobal(key){
    if(!setModuleAktiv) return;
    setModuleAktiv(prev=>{
      const neu={...prev,[key]:prev[key]===false?true:false};
      try{localStorage.setItem("fch-module-aktiv",JSON.stringify(neu));}catch{}
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
      try{localStorage.setItem("fch-module-rechte",JSON.stringify(neu));}catch{}
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
          <H1>Portalverwaltung</H1>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3}}>Module, Benutzer, API-Verbindungen und Einstellungen</div>
        </div>
        {saveMsg&&<Chip text={saveMsg} color={saveMsg==="Ungespeichert"?R:GN} bg={saveMsg==="Ungespeichert"?RL:"#ECFDF5"}/>}
      </div>

      {/* ── MOBILE: Kacheln oder Unternavigation ── */}
      {isMobile&&mobileKachel===null&&(
        <div className="cc-grid-form">
          {KATEGORIEN_NAV.map(k=>(
            <button key={k.key} onClick={()=>{setMobileKachel(k.key);setTab(k.tabs[0].key);setAktiveKat(k.key);}}
              style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,
                padding:"16px",borderRadius:12,border:"0.5px solid var(--border)",
                background:"var(--surface)",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
              <div style={{width:40,height:40,borderRadius:10,background:k.bg,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <TI n={k.icon} size={20} style={{color:k.color}}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{k.label}</div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{k.tabs.length} Bereiche</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {isMobile&&mobileKachel!==null&&(()=>{
        const kat=KATEGORIEN_NAV.find(k=>k.key===mobileKachel)||KATEGORIEN_NAV[0];
        return(
          <div style={{marginBottom:16}}>
            <button onClick={()=>setMobileKachel(null)}
              style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",
                cursor:"pointer",color:"var(--sub)",fontSize:14,padding:"0 0 12px",fontFamily:"inherit"}}>
              <TI n="arrow-left" size={14}/>Übersicht
            </button>
            {kat.tabs.length>1&&(
              <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:16}}>
                {kat.tabs.map(t=>(
                  <button key={t.key} onClick={()=>setTab(t.key)}
                    style={{padding:"7px 12px",background:"none",border:"none",
                      borderBottom:tab===t.key?"2px solid "+BK:"2px solid transparent",
                      cursor:"pointer",fontSize:12,fontWeight:tab===t.key?700:400,
                      color:tab===t.key?BK:"var(--sub)",marginBottom:-1,fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── DESKTOP: Zweistufige Navigation ── */}
      {!isMobile&&(
        <div style={{marginBottom:20}}>
          {/* Ebene 1: Hauptkategorien */}
          <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:0}}>
            {KATEGORIEN_NAV.map(k=>{
              const isAktiv=k.key===aktiveKat;
              return(
                <button key={k.key} onClick={()=>{setAktiveKat(k.key);setTab(k.tabs[0].key);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",
                    background:isAktiv?k.bg:"none",border:"none",
                    borderBottom:isAktiv?"2px solid "+k.color:"2px solid transparent",
                    cursor:"pointer",fontSize:14,fontWeight:isAktiv?700:400,
                    color:isAktiv?k.color:"var(--sub)",marginBottom:-1,fontFamily:"inherit",
                    borderRadius:"6px 6px 0 0",whiteSpace:"nowrap"}}>
                  <TI n={k.icon} size={15} style={{color:isAktiv?k.color:"var(--sub)"}}/>
                  {k.label}
                </button>
              );
            })}
          </div>
          {/* Ebene 2: Unterkategorien (nur wenn >1 Tab in Kategorie) */}
          {(()=>{
            const kat=KATEGORIEN_NAV.find(k=>k.key===aktiveKat)||KATEGORIEN_NAV[0];
            if(kat.tabs.length<=1) return null;
            return(
              <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",
                paddingLeft:8,background:"var(--surface2)"}}>
                {kat.tabs.map(t=>(
                  <button key={t.key} onClick={()=>setTab(t.key)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",
                      background:"none",border:"none",
                      borderBottom:tab===t.key?"2px solid "+BK:"2px solid transparent",
                      cursor:"pointer",fontSize:12,fontWeight:tab===t.key?600:400,
                      color:tab===t.key?BK:"var(--sub)",marginBottom:-1,fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    <TI n={t.icon} size={13}/>
                    {t.label}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {loading&&(!isMobile||mobileKachel!==null)&&<div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:14}}>Wird geladen…</div>}

      {/* ── TAB: MODULE & RECHTE ── */}

      {/* ── TAB COMPONENTS ── */}
      <ModuleRechteTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          module={module} moduleAktiv={moduleAktiv} setModuleAktiv={setModuleAktiv}
          moduleRechte={moduleRechte} setModuleRechte={setModuleRechte}
          moduleConfig={moduleConfig} moduleBerechtigungen={moduleBerechtigungen}
          expandedModul={expandedModul} setExpandedModul={setExpandedModul}
          moduleViewMode={moduleViewMode} setModuleViewMode={setModuleViewMode}
          moduleDirty={moduleDirty} setModuleDirty={setModuleDirty}
          ALLE_MODULE={ALLE_MODULE} effRechte={effRechte}
          getZugriff={getZugriff} setZugriffStufe={setZugriffStufe} cycleZugriff={cycleZugriff}
          toggleModulGlobal={toggleModulGlobal} toggleBerechtigung={toggleBerechtigung} tab={tab}
        />
      <GruppenTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          gruppen={gruppen} setGruppen={setGruppen} funktionen={funktionen} setFunktionen={setFunktionen}
          pvTeams={pvTeams} gruppenTeams={gruppenTeams} setGruppenTeams={setGruppenTeams}
          selectedGruppe={selectedGruppe} setSelectedGruppe={setSelectedGruppe}
          showGruppeForm={showGruppeForm} setShowGruppeForm={setShowGruppeForm}
          showFunktionForm={showFunktionForm} setShowFunktionForm={setShowFunktionForm}
          editGruppe={editGruppe} setEditGruppe={setEditGruppe}
          editFunktion={editFunktion} setEditFunktion={setEditFunktion}
          gruppeForm={gruppeForm} setGruppeForm={setGruppeForm}
          funktionForm={funktionForm} setFunktionForm={setFunktionForm} tab={tab}
        />
      <TeamModuleTab
          supabase={supabase} loading={loading} isMobile={isMobile} mobileKachel={mobileKachel} tab={tab}
        />
      <FeldvisTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel} toggleFeld={toggleFeld} tab={tab}
        />
      <UsersTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          benutzerListe={benutzerListe} setBenutzerListe={setBenutzerListe}
          dbPortalRollen={dbPortalRollen} updateBenutzerRolle={updateBenutzerRolle} tab={tab}
        />
      <MitgliederKonfigTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel} confirm={confirm}
          dbMitgliedtypen={dbMitgliedtypen} setDbMitgliedtypen={setDbMitgliedtypen}
          dbPortalRollen={dbPortalRollen} funktionen={funktionen}
          rollePflichtfelder={rollePflichtfelder} setRollePflichtfelder={setRollePflichtfelder}
          mitgliedtypPflichtfelder={mitgliedtypPflichtfelder} setMitgliedtypPflichtfelder={setMitgliedtypPflichtfelder}
          showMitgliedtypForm={showMitgliedtypForm} setShowMitgliedtypForm={setShowMitgliedtypForm}
          editMitgliedtyp={editMitgliedtyp} setEditMitgliedtyp={setEditMitgliedtyp}
          mitgliedtypForm={mitgliedtypForm} setMitgliedtypForm={setMitgliedtypForm}
          saveMitgliedtyp={saveMitgliedtyp} deleteMitgliedtyp={deleteMitgliedtyp} tab={tab}
        />
      <RollenTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel} confirm={confirm}
          dbPortalRollen={dbPortalRollen} rollenForm={rollenForm} setRollenForm={setRollenForm}
          editRolle={editRolle} setEditRolle={setEditRolle}
          showRolleForm={showRolleForm} setShowRolleForm={setShowRolleForm}
          saveRolle={saveRolle} deleteRolle={deleteRolle} tab={tab}
        />
      <KaderRollenTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel} confirm={confirm}
          dbKaderRollen={dbKaderRollen} kaderRolleForm={kaderRolleForm} setKaderRolleForm={setKaderRolleForm}
          editKaderRolle={editKaderRolle} setEditKaderRolle={setEditKaderRolle}
          showKaderRolleForm={showKaderRolleForm} setShowKaderRolleForm={setShowKaderRolleForm}
          saveKaderRolle={saveKaderRolle} deleteKaderRolle={deleteKaderRolle} tab={tab}
        />
      <AussehenTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          theme={theme} updateTheme={updateTheme} saveTheme={saveTheme}
          themeDirty={themeDirty} setThemeDirty={setThemeDirty}
          vereinId={vereinId} applyTheme={applyTheme} tab={tab}
        />
      <ApiTab
          supabase={supabase} loading={loading} isMobile={isMobile} mobileKachel={mobileKachel}
          felder={felder} apiVerbindungen={apiVerbindungen} tab={tab}
        />
      <AuditTab
          loading={loading} isMobile={isMobile} mobileKachel={mobileKachel}
          auditLogs={auditLogs} tab={tab}
        />

      {/* ── DESIGN TOKENS TABS (inline) ── */}

      {/* ── TAB: DESIGN-SYSTEM ── */}
      {confirmDialog}
    </div>
  );
}

export { TeamModuleMatrix, PortalverwaltungView };
