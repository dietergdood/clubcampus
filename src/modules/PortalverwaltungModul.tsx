/* ═══════════════════════════════════════════════════════════════
   ClubCampus — PortalverwaltungModul.tsx
   Portalverwaltung: Module, Berechtigungen, Benutzer, Aussehen
   State-Container + zweistufige Navigation; die einzelnen Tabs liegen
   unter modules/portal/.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { BK, GN, R, RL } from "../constants.ts";
import { TI } from "../icons.tsx";
import { Chip, H1, THEME_DEFAULT_STATIC, darkenHex, hexToRgba, useIsMobile, useConfirm } from "../theme.ts";
import { ModuleRechteTab } from "./portal/ModuleRechteTab.tsx";
import { GruppenTab } from "./portal/GruppenTab.tsx";
import type { Gruppe, Funktion, GruppeFormular, FunktionFormular } from "./portal/GruppenTab.tsx";
import { TeamModuleTab } from "./portal/TeamModuleTab.tsx";
import { FeldvisTab } from "./portal/FeldvisTab.tsx";
import type { FeldSichtbarkeit } from "./portal/FeldvisTab.tsx";
import { UsersTab } from "./portal/UsersTab.tsx";
import type { BenutzerZeile, BenutzerFunktion } from "./portal/UsersTab.tsx";
import { MitgliederKonfigTab } from "./portal/MitgliederKonfigTab.tsx";
import type { MitgliedtypZeile, MitgliedtypFormular } from "./portal/MitgliederKonfigTab.tsx";
import { fetchFeldkonfig } from "../domains/members/feldkonfigService.ts";
import type { FeldkonfigZeile } from "../domains/members/feldkonfig.ts";
import { RollenTab } from "./portal/RollenTab.tsx";
import type { RollenFormular } from "./portal/RollenTab.tsx";
import { KaderRollenTab } from "./portal/KaderRollenTab.tsx";
import type { KaderRolleZeile, KaderRolleFormular } from "./portal/KaderRollenTab.tsx";
import { AussehenTab } from "./portal/AussehenTab.tsx";
import { ApiTab } from "./portal/ApiTab.tsx";
import type { ApiVerbindung } from "./portal/ApiTab.tsx";
import { AuditTab } from "./portal/AuditTab.tsx";
import type { SyncLog } from "./portal/AuditTab.tsx";
import { DesignSystemTab } from "./portal/DesignSystemTab.tsx";
import { ZUGRIFF_ORDER, ZUGRIFF_DEFAULT, ROLLEN_MODULE_DEFAULT } from "./portal/portalUtils.ts";
import type { ZugriffDefaultMap } from "./portal/portalUtils.ts";
import type { AppTheme, Mitglied, ModuleAktiv, ModuleRechte, PortalRolle, Sb, SetState, Team, Zugriffstufe } from "../types.ts";
import type { KaderRolleDb } from "../domains/roles/roleUtils.ts";

type ZugriffStufenMap = Record<string, Record<string, Zugriffstufe>>;

/* Zeile aus feldsichtbarkeit — feld_label liefert das Anzeige-Label */
interface Feld {
  feld_key: string;
  feld_label?: string | null;
  role: string;
  sichtbar: boolean | null;
}

interface PvTeam {
  id: number;
  name: string;
  kurzname?: string | null;
}

interface GruppeTeam {
  gruppe_id: number | null;
  team_id: number | null;
}

/* Ein Unter-Tab innerhalb einer Navigationskategorie */
interface KatTab {
  key: string;
  label: string;
  icon: string;
}

interface KatNav {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  tabs: KatTab[];
}

interface PortalverwaltungViewProps {
  initialTab?: string;
  moduleAktiv?: ModuleAktiv;
  setModuleAktiv?: SetState<ModuleAktiv>;
  moduleRechte?: ModuleRechte | null;
  setModuleRechte?: SetState<ModuleRechte | null>;
  sb?: Sb;
  appTheme?: AppTheme | null;
  setAppTheme: SetState<AppTheme>;
  applyThemeCss?: ((theme: AppTheme) => void) | null;
  vereinId?: string | null;
  /* Fuer die SFV-Spieler-Warteschlange im API-Tab. */
  dbMitglieder?: Mitglied[];
  benutzerId?: string | null;
  dbPortalRollen?: PortalRolle[];
  onReloadRollen?: (() => void) | null;
  dbKaderRollen?: KaderRolleDb[];
  onReloadKaderRollen?: (() => void) | null;
  /* Nur für die SFV-Team-Zuordnung im API-Tab. Kommt aus clubcampus,
     damit modules/portal nicht auf modules/teams zugreifen muss. */
  dbTeams?: Team[];
  setDbTeams?: ((f: (prev: Team[]) => Team[]) => void) | null;
}

function PortalverwaltungView(props: PortalverwaltungViewProps){
  const {initialTab="module",moduleAktiv={},setModuleAktiv,moduleRechte,setModuleRechte,sb:supabase=null,appTheme,setAppTheme,applyThemeCss:applyTheme,vereinId,dbMitglieder=[],benutzerId=null,dbPortalRollen:externalRollen=[],onReloadRollen,dbKaderRollen:externalKaderRollen=[],onReloadKaderRollen,dbTeams=[],setDbTeams} = props;
  const [confirm,confirmDialog]=useConfirm();
  const [tab,setTab]=useState(initialTab);
  const [dbPortalRollen,setDbPortalRollen]=useState<PortalRolle[]>(externalRollen);
  useEffect(()=>{if(externalRollen.length>0)setDbPortalRollen(externalRollen);},[externalRollen]);
  /* externalKaderRollen ist KaderRolleDb[] (Rollen-Ableitung, ohne id); die
     kader_rollen-Zeilen tragen aber id, und die Tabelle wird beim Laden mit
     genau diesen überschrieben. Deshalb intern als KaderRolleZeile geführt. */
  const [dbKaderRollen,setDbKaderRollen]=useState<KaderRolleZeile[]>(externalKaderRollen as unknown as KaderRolleZeile[]);
  useEffect(()=>{if(externalKaderRollen.length>0)setDbKaderRollen(externalKaderRollen as unknown as KaderRolleZeile[]);},[externalKaderRollen]);
  const [kaderRolleForm,setKaderRolleForm]=useState<KaderRolleFormular>({name:"",ist_trainer:false,sort_order:50});
  const [editKaderRolle,setEditKaderRolle]=useState<KaderRolleZeile|null>(null);
  const [showKaderRolleForm,setShowKaderRolleForm]=useState(false);
  const [rollenForm,setRollenForm]=useState<RollenFormular>({name:"",label:"",prioritaet:50});
  const [editRolle,setEditRolle]=useState<PortalRolle|null>(null);
  const [showRolleForm,setShowRolleForm]=useState(false);

  async function saveKaderRolle(){
    if(!kaderRolleForm.name.trim()) return;
    const payload={name:kaderRolleForm.name.trim(),ist_trainer:!!kaderRolleForm.ist_trainer,sort_order:Number(kaderRolleForm.sort_order)||50,aktiv:true};
    if(supabase){
      if(editKaderRolle?.id){
        await supabase.from("kader_rollen").update(payload).eq("id",editKaderRolle.id);
      } else if(vereinId){
        await supabase.from("kader_rollen").insert({...payload,verein_id:vereinId});
      }
      const{data}=await supabase.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order");
      if(data){setDbKaderRollen(data);if(onReloadKaderRollen)onReloadKaderRollen();}
    }
    setShowKaderRolleForm(false);setEditKaderRolle(null);setKaderRolleForm({name:"",ist_trainer:false,sort_order:50});
  }

  async function deleteKaderRolle(id: number){
    const ok=await confirm({title:"Kader-Rolle löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
    if(!supabase||!ok) return;
    await supabase.from("kader_rollen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order");
    if(data){setDbKaderRollen(data);if(onReloadKaderRollen)onReloadKaderRollen();}
  }

  async function saveRolle(){
    if(!rollenForm.name.trim()||!rollenForm.label.trim()) return;
    const payload={name:rollenForm.name.trim(),label:rollenForm.label.trim(),prioritaet:Number(rollenForm.prioritaet)||50,aktiv:true};
    if(supabase){
      if(editRolle?.id){
        await supabase.from("portal_rollen").update(payload).eq("id",editRolle.id);
      } else if(vereinId){
        await supabase.from("portal_rollen").insert({...payload,verein_id:vereinId});
      }
      const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
      if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
    }
    setShowRolleForm(false);setEditRolle(null);setRollenForm({name:"",label:"",prioritaet:50});
  }

  async function deleteRolle(id: number){
    const ok=await confirm({title:"Rolle löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
    if(!supabase||!ok) return;
    await supabase.from("portal_rollen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
    if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
  }

  const [felder,setFelder]=useState<Feld[]>([]);
  const [apiVerbindungen,setApiVerbindungen]=useState<ApiVerbindung[]>([]);
  const [auditLogs,setAuditLogs]=useState<SyncLog[]>([]);
  const [loading,setLoading]=useState(true);
  const [saveMsg,setSaveMsg]=useState("");
  const [expandedModul,setExpandedModul]=useState<string|null>(null);
  const [benutzerListe,setBenutzerListe]=useState<BenutzerZeile[]>([]);
  /* Gruppen & Funktionen */
  const [gruppen,setGruppen]=useState<Gruppe[]>([]);
  const [funktionen,setFunktionen]=useState<Funktion[]>([]);
  const [pvTeams,setPvTeams]=useState<PvTeam[]>([]);
  const [gruppenTeams,setGruppenTeams]=useState<GruppeTeam[]>([]);
  /* Die neue Feldkonfiguration (mitgliedtyp_feldkonfig). Steht neben den
     beiden alten Matrizen, bis Schritt 4 des Auftrags sie abloest. */
  const [feldkonfig,setFeldkonfig]=useState<FeldkonfigZeile[]>([]);
  const [dbMitgliedtypen,setDbMitgliedtypen]=useState<MitgliedtypZeile[]>([]);
  const [showMitgliedtypForm,setShowMitgliedtypForm]=useState(false);
  const [editMitgliedtyp,setEditMitgliedtyp]=useState<MitgliedtypZeile|null>(null);
  const [mitgliedtypForm,setMitgliedtypForm]=useState<MitgliedtypFormular>({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
  const [selectedGruppe,setSelectedGruppe]=useState<Gruppe|null>(null);
  const [showGruppeForm,setShowGruppeForm]=useState(false);
  const [showFunktionForm,setShowFunktionForm]=useState(false);
  const [editGruppe,setEditGruppe]=useState<Gruppe|null>(null);
  const [editFunktion,setEditFunktion]=useState<Funktion|null>(null);
  const [gruppeForm,setGruppeForm]=useState<GruppeFormular>({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{},teams:[]});
  const [funktionForm,setFunktionForm]=useState<FunktionFormular>({name:"",beschreibung:"",gruppe_id:"",module_override:[],teams:[],filter:{},stufe_override:{}});
  /* Module & Rechte View-Toggle */
  const [moduleViewMode,setModuleViewMode]=useState("modul");
  const [moduleDirty,setModuleDirty]=useState(false);

  /* ── Aussehen / Theme ── */
  const theme=appTheme||THEME_DEFAULT_STATIC;
  const themeRef=useRef(theme);
  themeRef.current=theme;
  const [themeDirty,setThemeDirty]=useState(false);

  function updateTheme(key: keyof AppTheme,val: string|null){
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
      r.setProperty("--cc-accent",    td.vereinsfarbe1||"#FEC604");
      r.setProperty("--cc-accent2",   td.vereinsfarbe2||"#000000");
      r.setProperty("--cc-hover",     hexToRgba(td.vereinsfarbe1||"#FEC604",0.19));
      r.setProperty("--cc-accent-25", hexToRgba(td.vereinsfarbe1||"#FEC604",0.25));
      r.setProperty("--cc-accent-20", hexToRgba(td.vereinsfarbe1||"#FEC604",0.12));
      r.setProperty("--cc-accent-15", hexToRgba(td.vereinsfarbe1||"#FEC604",0.09));
      r.setProperty("--cc-accent-12", hexToRgba(td.vereinsfarbe1||"#FEC604",0.07));
      r.setProperty("--cc-accent-10", hexToRgba(td.vereinsfarbe1||"#FEC604",0.10));
      r.setProperty("--cc-accent-5",  hexToRgba(td.vereinsfarbe1||"#FEC604",0.05));
      r.setProperty("--nav",          td.navBg||"#000000");
      r.setProperty("--nav-t",        td.navText||"#FFFFFF");
      r.setProperty("--nav-a",        td.navAccent||"#FEC604");
      r.setProperty("--nav-hover",    td.navHover||"#1A1A1A");
      r.setProperty("--btn-primary",  td.btnPrimary||"#FEC604");
      r.setProperty("--btn-primary-text",td.btnPrimaryText||"#000000");
      r.setProperty("--btn-hover",    darkenHex(td.btnPrimary||"#FEC604"));
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
      setSaveMsg("Fehler: "+(err instanceof Error?err.message:String(err)));
      setTimeout(()=>setSaveMsg(""),4000);
    }
  }
  /* moduleAktiv + moduleRechte kommen als Props von App */

  const KATEGORIEN_NAV: KatNav[]=[
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
        {key:"api",          label:"API-Verbindungen", icon:"plug"},
        {key:"audit",        label:"Audit-Logs",       icon:"clipboard-list"},
        {key:"designsystem", label:"Design-System",    icon:"palette"},
      ]
    },
  ];
  /* Aktive Kategorie aus Tab ableiten */
  const getKatForTab=(t: string)=>KATEGORIEN_NAV.find(k=>k.tabs.some(x=>x.key===t))||KATEGORIEN_NAV[0];
  const [aktiveKat, setAktiveKat]=useState(()=>getKatForTab(initialTab).key);
  const [mobileKachel, setMobileKachel]=useState<string|null>(null); // null = Landingseite
  const isMobile=useIsMobile();

  const ROLLEN=dbPortalRollen.length>0?dbPortalRollen.map(r=>r.name):["administrator","administration","funktionaer","trainer","spieler","eltern","mitglied","supporter"];
  const ROLLEN_LABELS: Record<string,string>={administrator:"Admin",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Eltern",mitglied:"Mitglied",supporter:"Supporter"};


  /* Effektive Zugriffsstufe: custom oder Default */
  const [zugriffStufen,setZugriffStufen]=useState<ZugriffStufenMap|null>(()=>{
    try{const s=localStorage.getItem("fch-zugriff-stufen");return s?JSON.parse(s):null;}catch{return null;}
  });
  const effZugriff: Record<string, ZugriffDefaultMap>=zugriffStufen||ZUGRIFF_DEFAULT;

  function getZugriff(rolle: string,modulKey: string): Zugriffstufe|null {
    if(!effRechte[rolle]?.includes(modulKey)) return null;
    return (effZugriff[rolle]?.[modulKey]||effZugriff[rolle]?._all||"lesen") as Zugriffstufe;
  }

  function setZugriffStufe(rolle: string,modulKey: string,stufe: Zugriffstufe){
    setZugriffStufen(prev=>{
      const base=prev||ZUGRIFF_DEFAULT;
      const neu: ZugriffStufenMap={...base,[rolle]:{...(base[rolle]||{}),[modulKey]:stufe}};
      try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(neu));}catch{}
      return neu;
    });
  }

  function cycleZugriff(rolle: string,modulKey: string){
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
            /* aktiv fehlte in der Auswahl — die Status-Spalte im Benutzer-Tab
               las ein Feld, das nie geladen wurde, und stand daher immer
               auf "Aktiv". Die App pflegt aktiv (siehe updatePortalZugang),
               die gleichnamige Spalte active ist Altlast. */
            supabase.from("benutzer").select("id,name,email,role,aktiv,ist_admin").order("name"),
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
            const bfMap: Record<string, BenutzerFunktion[]>={};
            (bfData||[]).forEach(bf=>{
              if(!bfMap[bf.benutzer_id]) bfMap[bf.benutzer_id]=[];
              if(bf.portal_funktionen) bfMap[bf.benutzer_id].push(bf.portal_funktionen);
            });
            setBenutzerListe(benuR.data.map(b=>({...b,funktionen:bfMap[b.id]||[]})));
          } else if(benuR.error){
            console.warn("[FCH] benutzer laden:", benuR.error.message);
          }
          if(gruppenR.data) setGruppen(gruppenR.data as unknown as Gruppe[]);
          if(funktionenR.data) setFunktionen(funktionenR.data as unknown as Funktion[]);
          if(teamsR.data) setPvTeams(teamsR.data);
          if(gtR.data) setGruppenTeams(gtR.data);
          // Feldkonfiguration laden
          setFeldkonfig(await fetchFeldkonfig(supabase));
          const{data:mtData}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
          if(mtData) setDbMitgliedtypen(mtData);
          /* module_config → moduleAktiv State */
          if(mcR.data&&mcR.data.length>0&&setModuleAktiv){
            const ma: ModuleAktiv={};
            mcR.data.forEach(r=>{ma[r.modul]=r.aktiv!==false;});
            setModuleAktiv(ma);
            try{localStorage.setItem("fch-module-aktiv",JSON.stringify(ma));}catch{}
          }
          /* modul_rechte → moduleRechte State */
          if(mrR.data&&mrR.data.length>0&&setModuleRechte){
            const mr: ModuleRechte={};
            const zs: ZugriffStufenMap={};
            mrR.data.forEach(r=>{
              if(!mr[r.rolle]) mr[r.rolle]=[];
              if(r.hat_zugriff){
                mr[r.rolle].push(r.modul);
                if(r.stufe&&r.stufe!=="lesen"){
                  if(!zs[r.rolle]) zs[r.rolle]={};
                  zs[r.rolle][r.modul]=r.stufe as Zugriffstufe;
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
      }catch(e){console.warn("[FCH] Portalverwaltung laden:",e instanceof Error?e.message:e);}
      setLoading(false);
    })();
  },[]);

  async function toggleFeld(feldKey: string,rolle: string,sichtbar: boolean){
    /* verein_id ist in feldsichtbarkeit NOT NULL, feld_label ebenso — beides
       fehlte hier. (feldsichtbarkeit wird aktuell nie geladen, felder bleibt
       leer, daher ist die Toggle-UI ohnehin unerreichbar — aber der Pfad ist
       jetzt wenigstens korrekt.)
       Zudem: die Kurzschreibweise `role` griff früher auf einen Bezeichner
       zu, den es hier nicht gibt — der Parameter heisst `rolle`. */
    if(!supabase||!vereinId) return;
    const feldLabel=felder.find(f=>f.feld_key===feldKey)?.feld_label||feldKey;
    await supabase.from("feldsichtbarkeit").upsert({feld_key:feldKey,role:rolle,sichtbar,feld_label:feldLabel,verein_id:vereinId},{onConflict:"verein_id,feld_key,role"});
    setFelder(prev=>prev.map(f=>f.feld_key===feldKey&&f.role===rolle?{...f,sichtbar}:f));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function updateBenutzerRolle(id: string,role: string){
    if(!supabase) return;
    await supabase.from("benutzer").update({role}).eq("id",id);
    // mitglieder.rolle synchron halten
    const {data:b}=await supabase.from("benutzer").select("mitglied_id").eq("id",id).maybeSingle();
    if(b?.mitglied_id) await supabase.from("mitglieder").update({rolle:role}).eq("id",b.mitglied_id);
    setBenutzerListe(prev=>prev.map(u=>u.id===id?{...u,role}:u));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  /* Adminstatus setzen oder entziehen. Er ist ein Kennzeichen und kein
     Rollenwert — deshalb eine eigene Funktion und nicht updateBenutzerRolle.

     Zwei Sperren, weil sich ein Verein sonst aussperrt und niemand mehr in
     die Portalverwaltung kommt:
       (1) Man kann sich den eigenen Status nicht wegnehmen.
       (2) Der letzte Admin eines Vereins bleibt. */
  async function toggleAdmin(id: string, next: boolean){
    if(!supabase) return;
    if(!next){
      const {data:{user}}=await supabase.auth.getUser();
      if(user?.id===id){
        setSaveMsg("Du kannst dir den Adminstatus nicht selbst entziehen");
        setTimeout(()=>setSaveMsg(""),3000); return;
      }
      const andere=benutzerListe.filter(u=>u.ist_admin&&u.id!==id).length;
      if(andere===0){
        setSaveMsg("Das ist der letzte Administrator — er kann nicht entfernt werden");
        setTimeout(()=>setSaveMsg(""),3000); return;
      }
      const ok=await confirm({
        title:"Adminstatus entziehen?",
        message:"Die Person verliert den Zugang zur Portalverwaltung. Ihre übrigen Rollen bleiben bestehen.",
        confirmLabel:"Entziehen",
      });
      if(!ok) return;
    }
    await supabase.from("benutzer").update({ ist_admin: next }).eq("id",id);
    setBenutzerListe(prev=>prev.map(u=>u.id===id?{...u,ist_admin:next}:u));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  function toggleModulGlobal(key: string){
    if(!setModuleAktiv) return;
    setModuleAktiv(prev=>{
      const neu={...prev,[key]:prev[key]===false?true:false};
      try{localStorage.setItem("fch-module-aktiv",JSON.stringify(neu));}catch{}
      /* In Supabase speichern — verein_id ist in module_config NOT NULL und
         fehlte hier, das Upsert-Insert fiel durch. */
      if(supabase&&vereinId) supabase.from("module_config")
        .upsert({modul:key,aktiv:neu[key]!==false,verein_id:vereinId},{onConflict:"verein_id,modul"})
        .then(({error})=>{ if(error) console.warn("[FCH] module_config:", error.message); });
      return neu;
    });
    setModuleDirty(true); setSaveMsg("Ungespeichert");
  }

  function toggleModulRolle(modulKey: string, rolle: string){
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
  const effRechte: Record<string,string[]>=moduleRechte||ROLLEN_MODULE_DEFAULT;

  const felderNachKey: Record<string, FeldSichtbarkeit>={};
  felder.forEach(f=>{
    if(!felderNachKey[f.feld_key]) felderNachKey[f.feld_key]={label:f.feld_label||f.feld_key,rollen:{}};
    felderNachKey[f.feld_key].rollen[f.role]=!!f.sichtbar;
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
            <button key={k.key} onClick={()=>{setMobileKachel(k.key);if(k.tabs[0])setTab(k.tabs[0].key);setAktiveKat(k.key);}}
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
              <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:16,overflowX:"auto",minWidth:0,scrollbarWidth:"none" as const,WebkitOverflowScrolling:"touch" as const}}>
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
          {/* ⚠ Scrollen statt Abschneiden — siehe `.cc-ml-tabs-bar` in cc.css.
              `overflowX` erzeugt den Scroll, `minWidth:0` erlaubt der Leiste
              im Flex-Elternteil ueberhaupt erst zu schrumpfen. Die Kinder
              tragen `whiteSpace:"nowrap"` schon. */}
          <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:0,overflowX:"auto",minWidth:0,scrollbarWidth:"none" as const,WebkitOverflowScrolling:"touch" as const}}>
            {KATEGORIEN_NAV.map(k=>{
              const isAktiv=k.key===aktiveKat;
              return(
                <button key={k.key} onClick={()=>{setAktiveKat(k.key);if(k.tabs[0])setTab(k.tabs[0].key);}}
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
                paddingLeft:8,background:"var(--surface2)",overflowX:"auto",minWidth:0,scrollbarWidth:"none" as const,WebkitOverflowScrolling:"touch" as const}}>
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

      {/* ── TAB COMPONENTS ── */}
      <ModuleRechteTab
          supabase={supabase} loading={loading} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          moduleAktiv={moduleAktiv}
          moduleRechte={moduleRechte??null} setModuleRechte={setModuleRechte??(()=>{})}
          expandedModul={expandedModul} setExpandedModul={setExpandedModul}
          moduleViewMode={moduleViewMode} setModuleViewMode={setModuleViewMode}
          moduleDirty={moduleDirty} setModuleDirty={setModuleDirty}
          effRechte={effRechte}
          getZugriff={getZugriff} cycleZugriff={cycleZugriff}
          toggleModulGlobal={toggleModulGlobal} ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} gruppen={gruppen} zugriffStufen={zugriffStufen} setZugriffStufen={setZugriffStufen} effZugriff={effZugriff} toggleModulRolle={toggleModulRolle} tab={tab} vereinId={vereinId??null}
        />
      <GruppenTab
          supabase={supabase} loading={loading} setSaveMsg={setSaveMsg} vereinId={vereinId??null}
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
          supabase={supabase} loading={loading} setSaveMsg={setSaveMsg} isMobile={isMobile} mobileKachel={mobileKachel} tab={tab} vereinId={vereinId??null}
        />
      <FeldvisTab
          loading={loading}
          isMobile={isMobile} mobileKachel={mobileKachel} toggleFeld={toggleFeld} ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} felderNachKey={felderNachKey} tab={tab}
        />
      <UsersTab
          supabase={supabase} loading={loading} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          benutzerListe={benutzerListe} setBenutzerListe={setBenutzerListe}
          updateBenutzerRolle={updateBenutzerRolle} toggleAdmin={toggleAdmin}
          ROLLEN={ROLLEN} ROLLEN_LABELS={ROLLEN_LABELS} funktionen={funktionen} tab={tab}
          vereinId={vereinId??null}
        />
      <MitgliederKonfigTab
          supabase={supabase} loading={loading}
          isMobile={isMobile} mobileKachel={mobileKachel}
          dbMitgliedtypen={dbMitgliedtypen} setDbMitgliedtypen={setDbMitgliedtypen}
          feldkonfig={feldkonfig} setFeldkonfig={setFeldkonfig}
          showMitgliedtypForm={showMitgliedtypForm} setShowMitgliedtypForm={setShowMitgliedtypForm}
          editMitgliedtyp={editMitgliedtyp} setEditMitgliedtyp={setEditMitgliedtyp}
          mitgliedtypForm={mitgliedtypForm} setMitgliedtypForm={setMitgliedtypForm}
          tab={tab} vereinId={vereinId??null}
        />
      <RollenTab
          loading={loading}
          isMobile={isMobile} mobileKachel={mobileKachel}
          dbPortalRollen={dbPortalRollen} rollenForm={rollenForm} setRollenForm={setRollenForm}
          editRolle={editRolle} setEditRolle={setEditRolle}
          showRolleForm={showRolleForm} setShowRolleForm={setShowRolleForm}
          saveRolle={saveRolle} deleteRolle={deleteRolle} tab={tab}
        />
      <KaderRollenTab
          loading={loading}
          isMobile={isMobile} mobileKachel={mobileKachel}
          dbKaderRollen={dbKaderRollen} kaderRolleForm={kaderRolleForm} setKaderRolleForm={setKaderRolleForm}
          editKaderRolle={editKaderRolle} setEditKaderRolle={setEditKaderRolle}
          showKaderRolleForm={showKaderRolleForm} setShowKaderRolleForm={setShowKaderRolleForm}
          saveKaderRolle={saveKaderRolle} deleteKaderRolle={deleteKaderRolle} tab={tab}
        />
      <AussehenTab
          supabase={supabase} loading={loading} setSaveMsg={setSaveMsg}
          isMobile={isMobile} mobileKachel={mobileKachel}
          theme={theme} updateTheme={updateTheme} saveTheme={saveTheme}
          setThemeDirty={setThemeDirty} setAppTheme={setAppTheme}
          vereinId={vereinId??null} applyTheme={applyTheme} tab={tab}
        />
      <ApiTab
          loading={loading} isMobile={isMobile} mobileKachel={mobileKachel}
          apiVerbindungen={apiVerbindungen} tab={tab}
          sb={supabase} dbTeams={dbTeams} setDbTeams={setDbTeams}
          vereinId={vereinId ?? null} benutzerId={benutzerId} dbMitglieder={dbMitglieder}
          onReload={async()=>{
            if(!supabase) return;
            const {data}=await supabase.from("api_verbindungen").select("*").order("sort_order");
            if(data) setApiVerbindungen(data as unknown as ApiVerbindung[]);
          }}
        />
      <AuditTab
          loading={loading} isMobile={isMobile} mobileKachel={mobileKachel}
          auditLogs={auditLogs} tab={tab}
        />
      <DesignSystemTab
          loading={loading} isMobile={isMobile} mobileKachel={mobileKachel}
          tab={tab}
        />

      {confirmDialog}
    </div>
  );
}

export { PortalverwaltungView };
