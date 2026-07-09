/* ═══════════════════════════════════════════════════════════════
   ClubCampus — MitgliederModul.jsx
   State, Logik und Koordination — Render via MembersView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../constants.js";
import { TI } from "../icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         Toolbar, ColMenuButton, BulkBar, SortHeader, useConfirm, ConfirmDialog,
         Tabs, STitle, Between, Sub, Label, Select, Empty, InfoBox } from "../theme.jsx";
import { ableitUndSaveRolle } from "../domains/roles/roleUtils.js";
import { fetchAnsichten, insertAnsicht, deleteAnsicht, archiviereMitglied, deleteMitglied, fetchArchiv, fetchArchivCount, fetchMitglied } from "../domains/members/memberService.js";
import { currentSeason } from "../domains/season/seasonUtils.js";
import { LAENDER, getLandName, RolleChip, getFieldVisibility } from "./members/memberUtils.jsx";
import { ROLES, FIELD_VIS, SAVED_VIEWS, COL_GROUPS, ALL_COLS, GROUP_OPTIONS, GROUP_OPTIONS_MORE } from "./members/memberConstants.js";
import { mapMembers, filterMembers, sortMembers, buildGroups, exportData as exportDataUtil } from "./members/memberDataUtils.js";
import { ArchivView } from "./members/ArchivView.jsx";
import { MemberDetail } from "./members/MemberDetail.jsx";

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null,vereinId=null}){
  const isMobile=useIsMobile();
  const [confirm,confirmDialog]=useConfirm();
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState(["none"]);
  const [filterVals,setFilterVals]=useState({});
  const [savedView,setSavedView]=useState("standard");
  const [dragCol,setDragCol]=useState(null);
  const [dragOverCol,setDragOverCol]=useState(null);
  const [colDragSrc,setColDragSrc]=useState(null);
  const [colDragOver,setColDragOver]=useState(null);
  const [teamsPopover,setTeamsPopover]=useState(null);
  const [pageSize,setPageSize]=useState(50);
  const [selectMode,setSelectMode]=useState(false);
  const [selected,setSelected]=useState(new Set());
  const [customViews,setCustomViews]=useState([]);
  const [portalFunktionen,setPortalFunktionen]=useState([]);
  const [saveViewOpen,setSaveViewOpen]=useState(false);
  const [saveViewName,setSaveViewName]=useState("");
  const [savingView,setSavingView]=useState(false);
  const [selectedMember,setSelectedMember]=useState(null);
  const [breakdownOpen,setBreakdownOpen]=useState(false);
  const breakdownRef=useRef(null);
  useEffect(()=>{
    if(!breakdownOpen||isMobile) return;
    const h=e=>{if(breakdownRef.current&&!breakdownRef.current.contains(e.target))setBreakdownOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[breakdownOpen,isMobile]);
  const [archivTab,setArchivTab]=useState(false);
  const [archivData,setArchivData]=useState([]);
  const [archivLoaded,setArchivLoaded]=useState(false);
  const [archivCount,setArchivCount]=useState(null);

  // Direkte Navigation vom Kader-Modul
  useEffect(()=>{
    if(navToMember&&dbMitglieder.length>0){
      const m=dbMitglieder.find(x=>x.id===navToMember);
      if(m) setSelectedMember({
        id:m.id,
        name:(`${m.vorname||""} ${m.nachname||""}`).trim()||"?",
        role:m.rolle||"-",
        type:m.mitgliedtyp||"-",
        status:m.datenstatus||"-",
        team:(m.teams||[])[0]||"-",
        hat_portal_zugang:m.hat_portal_zugang,
        _tab:"info",
      });
      if(onNavToMemberDone) onNavToMemberDone();
    }
  },[navToMember,dbMitglieder]);
  const canExport=role==="administrator"||role==="administration";

  const TRAINER_KEYS=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
  const ROLLE_LABEL=Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
  const funktionenGruppenMap=Object.fromEntries(
    (portalFunktionen||[]).map(f=>[f.name,f.portal_gruppen?.name||null])
  );
  const allMembers=mapMembers(dbMitglieder,dbPortalRollen,dbKaderRollen).map(m=>({
    ...m,
    funktionsgruppen:[...new Set((m.funktionen||[]).map(f=>funktionenGruppenMap[f]).filter(Boolean))],
  }));

  const [visibleCols,setVisibleCols]=useState(()=>SAVED_VIEWS.standard.cols);
  const COLS=visibleCols.map(k=>ALL_COLS.find(c=>c.key===k)).filter(Boolean);
  function exportData(format){ exportDataUtil(filtered,COLS,format); }

  function applyView(viewKey){
    setSavedView(viewKey);
    setVisibleCols(SAVED_VIEWS[viewKey]?.cols||SAVED_VIEWS.standard.cols);
    setFilterVals({});
    setGroupBy(["none"]);
  }

  function applyCustomView(v){
    setSavedView("custom_"+v.id);
    setVisibleCols(v.spalten||SAVED_VIEWS.standard.cols);
    setFilterVals(v.filter||{});
    setGroupBy(Array.isArray(v.gruppierung)?v.gruppierung:[v.gruppierung||"none"]);
  }

  useEffect(()=>{
    if(!sb||!account?.id) return;
    fetchAnsichten(sb,account.id).then(data=>setCustomViews(data));
    if(portalFunktionen.length===0)
      sb.from("portal_funktionen").select("id,name,portal_gruppen(name,farbe)").order("name")
        .then(({data})=>setPortalFunktionen(data||[]));
  },[account?.id]);

  function toggleSelectMode(){
    setSelectMode(m=>{
      if(m) setSelected(new Set());
      return !m;
    });
  }
  function toggleSelectRow(id){
    setSelected(prev=>{
      const s=new Set(prev);
      s.has(id)?s.delete(id):s.add(id);
      return s;
    });
  }
  function toggleSelectAll(){
    setSelected(prev=>prev.size===paged.length?new Set():new Set(paged.map(m=>m.id)));
  }
  async function handleBulkDelete(){
    if(!sb||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder löschen?`,message:"Diese Aktion kann nicht rükgängig gemacht werden (DSGVO).",danger:true,confirmLabel:"Löschen"});if(!ok) return;
    const ids=[...selected];
    for(const id of ids) await deleteMitglied(sb,id);
    setSelected(new Set());
    setSelectMode(false);
    if(onReload) onReload();
  }
  async function handleBulkDeactivate(){
    if(!sb||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok) return;
    const ids=[...selected];
    const deaktiviertVon=account?.name||account?.email||"Administrator";
    await archiviereMitglied(sb,ids,deaktiviertVon);
    if(onUpdatePortalZugang) await Promise.all(ids.map(id=>onUpdatePortalZugang(id,false)));
    refreshArchivCount();
    setSelected(new Set());
    setSelectMode(false);
    setArchivLoaded(false);
    if(onReload) onReload();
  }
  function handleColDragStart(key){ setDragCol(key); }
  function handleColDragOver(key){ setDragOverCol(key); }
  function handleColDrop(targetKey, dragKey){
    const from=dragKey||dragCol;
    if(!from||from===targetKey) return;
    setVisibleCols(prev=>{
      const cols=[...prev];
      const fromIdx=cols.indexOf(from);
      const toIdx=cols.indexOf(targetKey);
      if(fromIdx<0||toIdx<0) return cols;
      cols.splice(fromIdx,1);
      cols.splice(toIdx,0,from);
      return cols;
    });
    setDragCol(null);
    setDragOverCol(null);
  }
  function handleColDragEnd(){ setDragCol(null); setDragOverCol(null); }

  async function saveCurrentView(){
    if(!saveViewName.trim()||!sb||!account?.id) return;
    setSavingView(true);
    const data=await insertAnsicht(sb,{
      benutzer_id:account.id,
      verein_id:vereinId,
      name:saveViewName.trim(),
      spalten:visibleCols,
      filter:filterVals,
      gruppierung:Array.isArray(groupBy)?groupBy:[groupBy],
    });
    if(data) setCustomViews(prev=>[...prev,data]);
    setSaveViewName("");
    setSaveViewOpen(false);
    setSavingView(false);
  }

  async function deleteCustomView(id){
    if(!sb) return;
    await deleteAnsicht(sb,id);
    setCustomViews(prev=>prev.filter(v=>v.id!==id));
    if(savedView==="custom_"+id) applyView("standard");
  }

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }
  useEffect(()=>setPageSize(50),[search,filterVals,groupBy,sortCol,sortDir]);
  useEffect(()=>{
    if(!sb) return;
    fetchArchivCount(sb).then(count=>setArchivCount(count));
  },[sb,archivLoaded]);
  useEffect(()=>{
    if(!sb||!archivTab||archivLoaded) return;
    fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
  },[sb,archivTab,archivLoaded]);

  /* Filter */
  /* computed values are in MembersView */
  /* ── Render ── */

  const FILTER_DEFS=useMemo(()=>[
    {key:"mitgliedschaft", label:"Mitgliedschaft", vals:[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(Boolean))]},
    {key:"rollen", label:"Rollen", vals:[...new Set(allMembers.map(m=>m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null).filter(Boolean))].sort()},
    {key:"datenpruefung",  label:"Datenpruefung",  vals:[...new Set(allMembers.map(m=>m.datenpruefung).filter(Boolean))]},
    {key:"portal",         label:"Portal-Zugang",  vals:[...new Set(allMembers.map(m=>m.portal).filter(Boolean))]},
    {key:"teams",          label:"Teams",          vals:[...new Set(allMembers.flatMap(m=>(m.teams||[]).map(t=>t?.name||t)).filter(Boolean))].sort()},
    {key:"funktionsgruppen",label:"Funktionsgruppe", vals:[...new Set(allMembers.flatMap(m=>m.funktionsgruppen||[]).filter(Boolean))].sort()},
    {key:"kaderrollen",     label:"Kaderrolle",       vals:[...new Set(allMembers.flatMap(m=>(m.kader_rollen_raw||[])).filter(Boolean))].sort()},
  ],[allMembers,ROLLE_LABEL]);

  const filtered=useMemo(()=>filterMembers(allMembers,search,filterVals,ROLLE_LABEL),[allMembers,search,filterVals,ROLLE_LABEL]);

  const sorted=useMemo(()=>sortMembers(filtered,sortCol,sortDir),[filtered,sortCol,sortDir]);

  const paged=sorted;
  const hasMore=false;
  const groups=useMemo(()=>buildGroups(paged,groupBy,ROLLE_LABEL,filterVals),[paged,groupBy,ROLLE_LABEL,filterVals]);
  const hasGroup=Array.isArray(groupBy)?groupBy.some(g=>g&&g!=="none"):groupBy!=="none";

  const dpColor=s=>s==="Geprueft"?GN:s==="Ausstehend"?AM:R;
  const SortIcon=({col})=>sortCol===col
    ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
    :<span className="cc-sort-arrow cc-text-muted">↕</span>;

  /* ── Detail-Modal ── */
  async function refreshArchivCount(){
    if(!sb) return;
    fetchArchivCount(sb).then(count=>setArchivCount(count));
  }

  async function reloadMember(id){
    if(!sb) return;
    const data=await fetchMitglied(sb,id);
    if(data) setSelectedMember(prev=>({...prev,...data}));
    if(onReload) onReload();
  }

  const brauchtEltern=(mitgliedtyp)=>
    dbMitgliedtypen.some(t=>t.name===mitgliedtyp&&t.hauptkontakt_pflicht);



  if(selectedMember) return (
    <MemberDetail
      m={selectedMember} onClose={()=>setSelectedMember(null)} onNavToTeam={onNavToTeam}
      onReaktiviert={(id)=>{setArchivLoaded(false);if(id)reloadMember(id);}}
      sb={sb} role={role} account={account}
      dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen}
      dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
      kannVerwalten={kannVerwalten} onReload={onReload} onUpdatePortalZugang={onUpdatePortalZugang}
      setSelectedMember={setSelectedMember} selectedMember={selectedMember}
      reloadMember={reloadMember} refreshArchivCount={refreshArchivCount} brauchtEltern={brauchtEltern}
      vereinId={vereinId}
    />
  );




  /* KPI helpers */
  const totalCount=allMembers.length;
  const portalAktiv=allMembers.filter(m=>m.hat_portal_zugang).length;
  const dpOffen=allMembers.filter(m=>m.datenpruefung!=="Geprueft").length;
  const ohneTeam=allMembers.filter(m=>(m.teams||[]).length===0).length;
  /* Mitgliedschaft-Aufschluesselung - dynamisch */
  const trainerCount=allMembers.filter(m=>(m.rollen||[]).some(r=>r.toLowerCase().includes("trainer"))).length;
  const funktionaerCount=allMembers.filter(m=>(m.rollen||[]).some(r=>r.toLowerCase().includes("funktion"))).length;
  const mitgliedTypen=(dbMitgliedtypen||[]).length>0
    ?dbMitgliedtypen.map(t=>t.name)
    :[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(v=>v&&v!=="-"))].sort();
  const BREAKDOWN=[
    ...mitgliedTypen.map(typ=>({label:typ,key:typ,color:"muted"})),
    {label:"Trainer/innen",     key:"__trainer",     color:"trainer"},
    {label:"Funktionär/innen", key:"__funktionaer",color:"trainer"},
  ];
  function bdCount(b){
    if(b.key==="__trainer") return trainerCount;
    if(b.key==="__funktionaer") return funktionaerCount;
    return allMembers.filter(m=>m.mitgliedschaft===b.key).length;
  }
  function bdFilter(b){
    if(b.key==="__trainer") setFilterVals(prev=>({...prev,rollen:["Trainer/in"]}));
    else if(b.key==="__funktionaer") setFilterVals(prev=>({...prev,rollen:["Funktionär"]}));
    else setFilterVals(prev=>({...prev,mitgliedschaft:[b.key]}));
    setBreakdownOpen(false);
  }

  /* Portal-Zugang Zelle */
  function PortalBadge({val}){
    if(val==="Aktiv") return <span className="cc-ml-badge cc-ml-badge-ok">Aktiv</span>;
    return <span className="cc-ml-badge cc-ml-badge-muted">Fehlt</span>;
  }
  /* Datenpruefung Zelle */
  function DpBadge({val}){
    if(val==="Geprueft") return <span className="cc-ml-badge cc-ml-badge-ok">Geprüft</span>;
    if(val==="Ausstehend") return <span className="cc-ml-badge cc-ml-badge-warn">Ausstehend</span>;
    return <span className="cc-ml-badge cc-ml-badge-err">{val||"Unbekannt"}</span>;
  }

  // Zellen-Rendering (wiederverwendbar)
  function renderCell(col,m,groupContext={type:"none",key:null}){
    const gc=groupContext;
    switch(col.key){
      case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}/>:<span className="cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}><Av name={m.name||"?"} size={26}/></span>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
      case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-sub">{m.mitgliedschaft||"—"}</td>;
      case "rollen": return <td key="rollen" className="cc-members-td">{(()=>{const portalRaw=m.role&&m.role!=="-"?m.role:null;const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;const portalIsTrainer=portalRaw==="trainer";const kaderWithMeta=(m.rollen||[]).map((r,i)=>{const rawR=(m.kader_rollen_raw||[])[i]||"";const isT=TRAINER_KEYS.some(k=>rawR===k);return{label:r,rawR,isT};}).filter(({label,isT})=>{if(label===portalLabel) return false;if(portalIsTrainer&&isT) return false;return true;});const all=[...(portalLabel?[{label:portalLabel,isT:portalIsTrainer}]:[]),...kaderWithMeta];return (all||[]).length>0?all.map((c,i)=><span key={i} className={`cc-role-chip cc-role-chip-sm${c.isT?" cc-role-chip-trainer":""}`}>{c.label}</span>):(<span className="cc-members-td-sub">—</span>);})()}</td>;
      case "teams": {
        if(gc.type==="gruppe") return <td key="teams" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsToShow=gc.type==="team"?(m.teams||[]).filter(t=>(t?.name||t)===gc.key):(m.teams||[]);
        return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{teamsToShow.length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{teamsToShow.slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{teamsToShow.length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:teamsToShow,x:e.clientX,y:e.clientY});}}>+{teamsToShow.length-1}</button>}</span>):"—"}</td>;
      }
      case "datenpruefung": return <td key="datenpruefung" className="cc-members-td"><DpBadge val={m.datenpruefung}/></td>;
      case "portal": return <td key="portal" className="cc-members-td"><PortalBadge val={m.portal}/></td>;
      case "email": return <td key="email" className="cc-members-td cc-members-td-sub">{m.email||"—"}</td>;
      case "telefon": return <td key="telefon" className="cc-members-td cc-members-td-sub">{m.telefon||"—"}</td>;
      case "geburtsdatum": return <td key="geburtsdatum" className="cc-members-td cc-members-td-sub">{m.geburtsdatum?new Date(m.geburtsdatum).toLocaleDateString("de-CH"):"—"}</td>;
      case "alter": return <td key="alter" className="cc-members-td cc-members-td-sub">{m.alter||"—"}</td>;
      case "geschlecht": return <td key="geschlecht" className="cc-members-td cc-members-td-sub">{m.geschlecht==="m"?"Männlich":m.geschlecht==="w"?"Weiblich":m.geschlecht||"—"}</td>;
      case "nationalitaet": return <td key="nationalitaet" className="cc-members-td cc-members-td-sub">{m.nationalitaet||"—"}</td>;
      case "nationalitaet2": return <td key="nationalitaet2" className="cc-members-td cc-members-td-sub">{m.nationalitaet2||"—"}</td>;
      case "ort": return <td key="ort" className="cc-members-td cc-members-td-sub">{m.ort||"—"}</td>;
      case "spielerpass": return <td key="spielerpass" className="cc-members-td cc-members-td-sub">{m.spielerpass||"—"}</td>;
      case "fairgate_id": return <td key="fairgate_id" className="cc-members-td cc-members-td-sub">{m.fairgate_id||"—"}</td>;
      case "js_nr": return <td key="js_nr" className="cc-members-td cc-members-td-sub">{m.js_nr||"—"}</td>;
      case "eintritt": return <td key="eintritt" className="cc-members-td cc-members-td-sub">{m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"—"}</td>;
      case "nachname": return <td key="nachname" className="cc-members-td cc-members-td-sub">{m.nachname||"—"}</td>;
      case "vorname": return <td key="vorname" className="cc-members-td cc-members-td-sub">{m.vorname||"—"}</td>;
      case "heimatort": return <td key="heimatort" className="cc-members-td cc-members-td-sub">{m.heimatort||"—"}</td>;
      case "ahv_nr": return <td key="ahv_nr" className="cc-members-td cc-members-td-sub">{m.ahv_nr||"—"}</td>;
      case "strasse": return <td key="strasse" className="cc-members-td cc-members-td-sub">{m.strasse||"—"}</td>;
      case "teams_rollen": {
        // Kombinierte Teams & Rollen Spalte
        if(gc.type==="gruppe") return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsFilter=filterVals["teams"]||[];
        const kaderFilter=filterVals["kaderrollen"]||[];
        const teams=gc.type==="team"
          ?(m.teams||[]).filter(t=>(t?.name||t)===gc.key)
          :(teamsFilter.length>0?(m.teams||[]).filter(t=>teamsFilter.includes(t?.name||t)):(m.teams||[]));
        if(teams.length===0) return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        return <td key="teams_rollen" className="cc-members-td">
          <div className="cc-col cc-gap-4">
            {teams.map((t,i)=>{
              const teamName=t?.name||t;
              const teamKurzname=t?.kurzname||t?.kurz||teamName;
              // Kaderrollen für dieses Team
              const teamRollen=(m.kader_rollen_raw||[]).filter((_,j)=>{
                const teamRef=(m.teams||[])[j];
                return (teamRef?.name||teamRef)===teamName;
              });
              const rollenToShow=kaderFilter.length>0?teamRollen.filter(r=>kaderFilter.includes(r)):teamRollen;
              if(gc.type==="team"&&rollenToShow.length===0&&kaderFilter.length>0) return null;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span className="cc-team-chip" style={{minWidth:36,textAlign:"center",flexShrink:0}}>{teamKurzname}</span>
                  <span style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {rollenToShow.length>0?rollenToShow.map((r,ri)=>{
                      const isT=TRAINER_KEYS.some(k=>k===r);
                      return <span key={ri} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`}>{r}</span>;
                    }):<span className="cc-members-td-sub" style={{fontSize:11}}>—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </td>;
      }
      case "funktionen": {
        if(gc.type==="team") return <td key="funktionen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const funktionenToShow=gc.type==="gruppe"
          ?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return pf?.portal_gruppen?.name===gc.key;})
          :(gruppenFilter.length>0?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return gruppenFilter.includes(pf?.portal_gruppen?.name);}):(m.funktionen||[]));
        return <td key="funktionen" className="cc-members-td cc-members-td-sub">{funktionenToShow.join(", ")||"—"}</td>;
      }
      case "kaderrollen": {
        if(gc.type==="gruppe") return <td key="kaderrollen" className="cc-members-td cc-members-td-sub">—</td>;
        const kaderFilter=filterVals["kaderrollen"]||[];
        const rollenToShow=gc.type==="team"
          ?( kaderFilter.length>0?(m.kader_rollen_raw||[]).filter(r=>kaderFilter.includes(r)):(m.kader_rollen_raw||[]) )
          :(m.kader_rollen_raw||[]);
        return <td key="kaderrollen" className="cc-members-td">{rollenToShow.length===0?"—":rollenToShow.map((r,i)=>{const isT=TRAINER_KEYS.some(k=>k===r);return <span key={i} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`}>{r}</span>;})}</td>;
      }
      case "funktionsgruppen": {
        if(gc.type==="team") return <td key="funktionsgruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const gruppenToShow=gc.type==="gruppe"
          ?[(gc.key)]
          :(gruppenFilter.length>0?(m.funktionsgruppen||[]).filter(g=>gruppenFilter.includes(g)):(m.funktionsgruppen||[]));
        return <td key="funktionsgruppen" className="cc-members-td">{gruppenToShow.length===0?"—":gruppenToShow.map((g,i)=>{const pf=portalFunktionen.find(f=>f.portal_gruppen?.name===g);const farbe=pf?.portal_gruppen?.farbe;return <span key={i} className="cc-funk-gruppe-badge" style={farbe?{background:farbe+"20",color:farbe,borderColor:farbe+"40"}:{}}>{g}</span>;})}</td>;
      }
      default: return <td key={col.key} className="cc-members-td cc-members-td-sub">{m[col.key]||"—"}</td>;
    }
  }

  // Rekursive Gruppen-Rendering Hilfsfunktion
  function renderGroupsMobile(groups, depth=0){
    return groups.map(({key,label,type,members,children})=>(
      <div key={key}>
        {hasGroup&&(
          <div className={`cc-members-list-group-hdr${depth>0?" cc-members-list-group-hdr-sub":""}`} style={depth>0?{paddingLeft:depth*16+12}:{}}>
            {type==="team"&&<TI n="ball-football" size={11}/>}
            {type==="gruppe"&&<TI n="briefcase" size={11}/>}
            {label} <span className="cc-text-muted">{members.length}</span>
          </div>
        )}
        {children?renderGroupsMobile(children,depth+1):members.map(m=>(
          <div key={m.id} className="cc-members-item" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
            {m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>:<Av name={m.name||"?"} size={38}/>}
            <div className="cc-members-item-body">
              <div className="cc-members-item-name">{m.name}</div>
              <div className="cc-members-item-sub">{m.mitgliedschaft||""}{m.role&&m.role!=="-"?" · "+(ROLLE_LABEL[m.role]||m.role):""}</div>
            </div>
            <div className="cc-members-item-right"><TI n="chevron-right" size={14} className="cc-members-item-chevron"/></div>
          </div>
        ))}
      </div>
    ));
  }

  function renderGroupsTable(groups, depth=0, parentContext={type:"none",key:null}){
    return groups.map(({key,label,type,members,children})=>{
      const groupContext=type!=="none"?{type,key}:parentContext;
      return(
        <Fragment key={key}>
          {hasGroup&&(
            <tr className={`cc-members-group-hdr${depth>0?" cc-members-group-hdr-sub":""}`}>
              <td colSpan={COLS.length+1} style={depth>0?{paddingLeft:depth*16+14}:{}}>
                {type==="team"&&<TI n="ball-football" size={11}/>}
                {type==="gruppe"&&<TI n="briefcase" size={11}/>}
                {label} <span className="cc-text-muted">{members.length}</span>
              </td>
            </tr>
          )}
          {children?renderGroupsTable(children,depth+1,groupContext):members.map(m=>(
            <tr key={m.id} className={`cc-members-tr${selected.has(m.id)?" cc-members-tr-selected":""}`}
              onClick={()=>selectMode?toggleSelectRow(m.id):null}>
              {selectMode&&<td className="cc-members-cb-col" onClick={e=>e.stopPropagation()}>
                <div className={`cc-col-menu-check${selected.has(m.id)?" cc-col-menu-check-on":""}`} onClick={()=>toggleSelectRow(m.id)}>
                  {selected.has(m.id)&&<TI n="check" size={10}/>}
                </div>
              </td>}
              {COLS.map(col=>renderCell(col,m,groupContext))}
              <td className="cc-members-td cc-members-td-actions"/>
            </tr>
          ))}
        </Fragment>
      );
    });
  }

  return(
    <>{confirmDialog}
    {/* Ansicht speichern Modal */}
    <ModalOrSheet open={saveViewOpen} onClose={()=>{setSaveViewOpen(false);setSaveViewName("");}} maxWidth={380}>
      <div className="cc-modal-hdr">
        <ModalTitle>Als neue Ansicht speichern</ModalTitle>
        <button className="cc-icon-btn" onClick={()=>{setSaveViewOpen(false);setSaveViewName("");}}><TI n="x" size={14}/></button>
      </div>
      <div className="cc-modal-body cc-col cc-gap-8">
        <input
          className="cc-input"
          placeholder="Name der Ansicht…"
          value={saveViewName}
          onChange={e=>setSaveViewName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&saveCurrentView()}
          autoFocus
        />
      </div>
      <div className="cc-modal-ftr">
        <Btn onClick={()=>{setSaveViewOpen(false);setSaveViewName("");}}>Abbrechen</Btn>
        <Btn variant="primary" onClick={saveCurrentView} disabled={savingView||!saveViewName.trim()}>
          {savingView?"Speichert…":"Speichern"}
        </Btn>
      </div>
    </ModalOrSheet>
    <div className="cc-page-wide">
      {/* Header + Tabs */}
      <div className="cc-page-hdr">
        <div className="cc-row cc-gap-0">
          <h1 className="cc-page-title cc-page-title-mr">Mitglieder</h1>
          {(role==="administrator"||role==="administration")&&(
            <div className="cc-ml-tabs-bar">
              <button className={`cc-ml-tab${!archivTab?" cc-ml-tab-active":""}`} onClick={()=>setArchivTab(false)}>
                Aktive <span className="cc-ml-tab-count">{(allMembers||[]).length}</span>
              </button>
              <button className={`cc-ml-tab${archivTab?" cc-ml-tab-active":""}`} onClick={()=>{
                setArchivTab(true);
                if(!archivLoaded&&sb){
                  fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
                }
              }}>
                Archiv {archivCount!==null&&<span className="cc-ml-tab-count">{archivCount}</span>}
              </button>
            </div>
          )}
        </div>

      </div>

      {archivTab?(
        <ArchivView archivData={archivData} setArchivData={setArchivData} archivLoaded={archivLoaded} sb={sb} account={account} onUpdatePortalZugang={onUpdatePortalZugang} onReload={()=>{setArchivLoaded(false);if(onReload)onReload();}} onOpenMember={async m=>{
          if(!sb) return;
          const data=await fetchMitglied(sb,m.id);
          if(data) setSelectedMember({...data,name:`${data.vorname||""} ${data.nachname||""}`.trim()||"?",_tab:"info",_readonly:true});
        }}/>
      ):(
      <>
      {/* KPI */}
      <div className="cc-grid-stats cc-mb-20">
        {/* Mitglieder Card mit Aufschlüsselung */}
        <div ref={breakdownRef} style={{position:"relative"}}>
          <Stat label="Mitglieder" value={totalCount} color={BL}
            onClick={()=>setBreakdownOpen(o=>!o)}
          />
          {breakdownOpen&&(
            isMobile?(
              <div className="cc-mehr-sheet-overlay" onClick={()=>setBreakdownOpen(false)}>
                <div className="cc-mehr-sheet-backdrop"/>
                <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                  <div className="cc-mehr-sheet-handle"/>
                  <div className="cc-mehr-sheet-title">Aufschlüsselung</div>
                  {BREAKDOWN.map(b=>(
                    <button key={b.key} className="cc-mehr-sheet-item" onMouseDown={e=>{e.stopPropagation();setBreakdownOpen(false);bdFilter(b);}}>
                      <span style={{flex:1}}>{b.label}</span>
                      <span style={{fontWeight:500}}>{bdCount(b)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div className="cc-breakdown-popover">
                <div className="cc-breakdown-popover-title">Aufschlüsselung</div>
                {BREAKDOWN.map(b=>(
                  <button key={b.key} className="cc-breakdown-popover-item" onClick={()=>{setBreakdownOpen(false);bdFilter(b);}}>
                    <span>{b.label}</span>
                    <span style={{fontWeight:500}}>{bdCount(b)}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
        <Stat label="Portal aktiv" value={portalAktiv} color={GN}/>
        <Stat label="Prüfung offen" value={dpOffen} color={AM}/>
        <Stat label="Ohne Team" value={ohneTeam} color={AM}/>
      </div>

      {/* Gespeicherte Ansichten - nur Desktop */}


      {/* Toolbar */}
      <Toolbar
        search={search} onSearch={setSearch}
        filterDefs={FILTER_DEFS}
        filterVals={filterVals}
        onFilterChange={(key,val,active)=>{
          if(key==="__reset"){setFilterVals({});return;}
          setFilterVals(prev=>({
            ...prev,
            [key]:active?[...(prev[key]||[]),val]:(prev[key]||[]).filter(x=>x!==val)
          }));
        }}
        groupOptions={GROUP_OPTIONS} groupOptionsMore={GROUP_OPTIONS_MORE}
        groupBy={groupBy} onGroupChange={setGroupBy}
        multiGroup
        moreItems={[
          {header:true,label:"Aktionen"},
          {icon:"checkbox",label:selectMode?"Auswahlmodus beenden":"Mitglieder auswählen",onClick:toggleSelectMode},
          ...(!isMobile?[{
            icon:"table",label:"Spalten",
            subPanel:(
              <ColMenuButton
                colGroups={COL_GROUPS}
                visibleCols={visibleCols}
                onVisibleColsChange={setVisibleCols}
                dragCol={dragCol}
                dragOverCol={dragOverCol}
                onDragStart={handleColDragStart}
                onDragOver={handleColDragOver}
                onDrop={handleColDrop}
                onDragEnd={handleColDragEnd}
                inline
              />
            ),
          }]:[]),
          "sep",
          {header:true,label:"Ansichten"},
          ...Object.entries(SAVED_VIEWS).map(([k,v])=>({
            icon:savedView===k?"check":"layout",
            label:v.label,
            onClick:()=>applyView(k),
          })),
          ...customViews.map(v=>({
            icon:savedView==="custom_"+v.id?"check":"layout",
            label:v.name,
            onClick:()=>applyCustomView(v),
            onDelete:()=>deleteCustomView(v.id),
          })),
          "sep",
          {icon:"device-floppy",label:"Als neue Ansicht speichern",onClick:()=>setSaveViewOpen(true)},
          ...(canExport?[
            "sep",
            {header:true,label:"Export"},
            {icon:"file-text",label:"Liste als CSV exportieren",onClick:()=>exportData("csv")},
            {icon:"table",label:"Liste als Excel exportieren",onClick:()=>exportData("excel")},
          ]:[]),
        ]}
      />

      {/* Selektionsleiste */}
      {!isMobile&&(
        <BulkBar
          show={selectMode}
          count={selected.size}
          total={(paged||[]).length}
          onSelectAll={toggleSelectAll}
          actions={[
            {icon:"download", label:"Auswahl als CSV", onClick:()=>exportData("csv")},
            {icon:"archive",  label:"Archivieren", onClick:handleBulkDeactivate},
            {icon:"trash",    label:"Löschen (DSGVO)", onClick:handleBulkDelete, danger:true, requiresSelection:true},
          ]}
          onCancel={()=>{setSelected(new Set());setSelectMode(false);}}
        />
      )}

      {/* Liste / Tabelle */}
      <Card className="cc-card-table" flush>
        {(filtered||[]).length===0&&<div className="cc-empty">Keine Mitglieder gefunden.</div>}
        {(filtered||[]).length>0&&(isMobile?(
          <div>
            {renderGroupsMobile(groups)}
          </div>
        ):(
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner"><table className="cc-members-table">
            <thead>
              <tr>
                {selectMode&&<th className="cc-members-cb-col">
                  <div className={`cc-col-menu-check${selected.size===paged.length&&paged.length>0?" cc-col-menu-check-on":""}`} onClick={toggleSelectAll}>
                    {selected.size===paged.length&&paged.length>0&&<TI n="check" size={10}/>}
                  </div>
                </th>}
                {COLS.map(col=>(
                  <th key={col.key}
                    className={`cc-members-th${dragCol&&dragCol!==col.key?" cc-members-th-drop-target":""}${dragCol===col.key?" cc-members-th-dragging":""}`}
                    onClick={()=>{
                      if(dragCol){
                        if(dragCol!==col.key) handleColDrop(col.key);
                        else handleColDragEnd();
                      } else {
                        handleSort(col.key);
                      }
                    }}
                  >
                    <span className="cc-members-th-inner">

                      <span>{col.label}<SortIcon col={col.key}/></span>
                    </span>
                  </th>
                ))}
                <th className="cc-members-th cc-members-th-actions"/>
              </tr>
            </thead>
            <tbody>
              {renderGroupsTable(groups)}
            </tbody>
          </table></div></div>
        ))}
      {hasMore&&!isMobile&&(
        <div className="cc-text-center cc-py-16">
          <Btn onClick={()=>setPageSize(p=>p+50)}>
            <TI n="chevron-down" size={14}/> Weitere {Math.min(50,sorted.length-pageSize)} laden
          </Btn>
          <span className="cc-text-xs cc-ml-12">{pageSize} von {sorted.length} angezeigt</span>
        </div>
      )}

      </Card>

      </>
      )}

      {/* Teams Popover / Sheet */}
      {teamsPopover&&(
        isMobile?(
          <div className="cc-mehr-sheet-overlay" onClick={()=>setTeamsPopover(null)}>
            <div className="cc-mehr-sheet-backdrop"/>
            <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
              <div className="cc-mehr-sheet-handle"/>
              <div className="cc-mehr-sheet-title">Teams</div>
              {teamsPopover.teams.map((t,i)=>(
                <div key={i} className="cc-mehr-sheet-item">
                  <TI n="ball-football" size={16}/>
                  {t?.kurz||t?.name||t}
                </div>
              ))}
            </div>
          </div>
        ):(
          <div className="cc-teams-popover" style={{top:teamsPopover.y+8,left:teamsPopover.x}}>
            <div className="cc-teams-popover-backdrop" onClick={()=>setTeamsPopover(null)}/>
            <div className="cc-teams-popover-box">
              {teamsPopover.teams.map((t,i)=>(
                <div key={i} className="cc-teams-popover-item">
                  <TI n="ball-football" size={13}/>
                  {t?.kurz||t?.name||t}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  </>
  );
}

export { MitgliederModul };
export const MembersView = MitgliederModul;
export default MitgliederModul;