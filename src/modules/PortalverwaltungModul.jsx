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
import { TeamModuleMatrix } from "./portal/TeamModuleMatrix.jsx";
import { ZUGRIFF_ORDER, ZUGRIFF_LABELS, ZUGRIFF_COLORS, ZUGRIFF_ICONS, ZUGRIFF_DEFAULT, ALLE_MODULE, ROLLEN_MODULE_DEFAULT, MODUL_AKTIONEN, KAT_LABELS, KATEGORIEN, API_INFOS } from "./portal/portalUtils.js";

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

  async function saveMitgliedtyp(){
    if(!mitgliedtypForm.name.trim()) return;
    const payload={name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true};
    if(supabase){
      if(editMitgliedtyp?.id){
        await supabase.from("mitgliedtypen").update(payload).eq("id",editMitgliedtyp.id);
      } else {
        const maxSort=Math.max(0,...dbMitgliedtypen.map(t=>t.sort_order||0));
        await supabase.from("mitgliedtypen").insert({...payload,sort_order:maxSort+1});
      }
      const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
      if(data) setDbMitgliedtypen(data);
    }
    setShowMitgliedtypForm(false); setEditMitgliedtyp(null);
    setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
  }

  async function deleteMitgliedtyp(id){
    const ok=await confirm({title:"Mitgliedtyp löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
    if(!supabase||!ok) return;
    await supabase.from("mitgliedtypen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
    if(data) setDbMitgliedtypen(data);
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
          toggleModulGlobal={toggleModulGlobal} toggleBerechtigung={toggleBerechtigung} ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} tab={tab}
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
          isMobile={isMobile} mobileKachel={mobileKachel} toggleFeld={toggleFeld} ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} tab={tab}
        />
      <UsersTab
          supabase={supabase} loading={loading} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          benutzerListe={benutzerListe} setBenutzerListe={setBenutzerListe}
          dbPortalRollen={dbPortalRollen} updateBenutzerRolle={updateBenutzerRolle} ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} tab={tab}
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
