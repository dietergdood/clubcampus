/* ═══════════════════════════════════════════════════════════════
   ClubCampus — MitgliederModul.jsx
   State, Logik und Koordination — Render via MembersView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../constants.js";
import { TI } from "../icons.jsx";
import { useIsMobile, useConfirm } from "../theme.jsx";
import { ableitUndSaveRolle } from "../domains/roles/roleUtils.js";
import { currentSeason } from "../domains/season/seasonUtils.js";
import { LAENDER, getLandName, RolleChip, getFieldVisibility } from "./members/memberUtils.jsx";
import { ROLES, FIELD_VIS, SAVED_VIEWS, COL_GROUPS, ALL_COLS, GROUP_OPTIONS, GROUP_OPTIONS_MORE } from "./members/memberConstants.js";
import { MembersView } from "./members/MembersView.jsx";
import { MemberDetail } from "./members/MemberDetail.jsx";
import { ArchivView } from "./members/ArchivView.jsx";

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null}){
  const isMobile=useIsMobile();
  const [confirm,confirmDialog]=useConfirm();
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
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
  const [saveViewOpen,setSaveViewOpen]=useState(false);
  const [saveViewName,setSaveViewName]=useState("");
  const [savingView,setSavingView]=useState(false);
  const [selectedMember,setSelectedMember]=useState(null);
  const [breakdownOpen,setBreakdownOpen]=useState(false);
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
  const allMembers=dbMitglieder.map(m=>{
    /* Rollen ableiten */
    const rollenSet=new Set();
    (m.kader_rollen||[]).forEach(r=>rollenSet.add(ROLLE_LABEL[r]||r));
    if(rollenSet.size===0&&m.rolle&&m.rolle!=="-") rollenSet.add(ROLLE_LABEL[m.rolle]||m.rolle);
    /* Portal-Zugang */
    const portalStatus=m.hat_portal_zugang?"Aktiv":"Nicht eingerichtet";
    /* Datenpruefung */
    const dpStatus=(!m.datenstatus||m.datenstatus==="Vollstandig"||m.datenstatus==="Vollständig"||m.datenstatus==="geprüft"||m.datenstatus==="Geprueft")&&m.geprueft===true?"Geprueft":m.geprueft===false||!m.geprueft?"Ausstehend":m.datenstatus||"Ausstehend";
    return{
      id:m.id,
      name:(`${m.vorname||""} ${m.nachname||""}`).trim()||"?",
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-",
      type:m.mitgliedtyp||"-",
      rollen:[...rollenSet],
      kader_rollen_raw:m.kader_rollen||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus,
      status:m.datenstatus||"Ausstehend",
      portal:portalStatus,
      hat_portal_zugang:m.hat_portal_zugang,
      ort:m.ort||"-",
      location:m.ort||"-",
      email:m.email,
      telefon:m.telefon,
      geburtsdatum:m.geburtsdatum,
      alter:m.geburtsdatum?Math.floor((Date.now()-new Date(m.geburtsdatum))/(365.25*24*3600*1000)):null,
      geschlecht:m.geschlecht||null,
      nationalitaet:m.nationalitaet||"-",
      nationalitaet2:m.nationalitaet2||null,
      position:m.position,
      fairgate_id:m.fairgate_id,
      js_nr:m.js_nr,
      spielerpass:m.spielerpass,
      eintritt:m.eintrittsdatum,
      rueckennr:m.rueckennr,
      foto_url:m.foto_url||null,
      funktionen:m.funktionen||[],
      strasse:m.strasse,
      heimatort:m.heimatort,
      ahv_nr:m.ahv_nr,
    };
  });

  /* Gespeicherte Ansichten */
  const SAVED_VIEWS={
    standard:      {label:"Standard",       cols:["name","mitgliedschaft","rollen","teams","portal","datenpruefung"]},
    administration:{label:"Verwaltung",     cols:["name","email","telefon","ort","mitgliedschaft","datenpruefung"]},
  };

  /* Spaltendefinitionen */
  const COL_GROUPS=[
    {group:"Personendaten", cols:[
      {key:"name",          label:"Name",           default:true, alwaysOn:true},
      {key:"nachname",      label:"Nachname",       default:false},
      {key:"vorname",       label:"Vorname",        default:false},
      {key:"geburtsdatum",  label:"Geburtsdatum",   default:false},
      {key:"alter",         label:"Alter",          default:false},
      {key:"geschlecht",    label:"Geschlecht",     default:false},
      {key:"nationalitaet", label:"Nationalität",  default:false},
      {key:"nationalitaet2", label:"Nationalität 2", default:false},
      {key:"heimatort",     label:"Heimatort",      default:false},
      {key:"ahv_nr",        label:"AHV-Nr.",        default:false},
    ]},
    {group:"Kontakt", cols:[
      {key:"email",         label:"E-Mail",         default:false},
      {key:"telefon",       label:"Telefon",        default:false},
      {key:"strasse",       label:"Strasse",        default:false},
      {key:"ort",           label:"PLZ/Ort",        default:false},
    ]},
    {group:"Verein", cols:[
      {key:"mitgliedschaft",label:"Mitgliedschaft", default:true},
      {key:"rollen",        label:"Rollen",         default:true},
      {key:"funktionen",    label:"Vereinsfunktionen",default:false},
      {key:"eintritt",      label:"Eintritt",       default:false},
      {key:"spielerpass",   label:"Spielerpass",    default:false},
      {key:"fairgate_id",   label:"Fairgate-ID",    default:false},
      {key:"js_nr",         label:"J+S Nr.",        default:false},
    ]},
    {group:"Portal", cols:[
      {key:"portal",        label:"Portal-Zugang",  default:true},
      {key:"datenpruefung", label:"Datenpruefung",  default:true},
    ]},
    {group:"Sport", cols:[
      {key:"teams",         label:"Teams",          default:true},
    ]},
  ];
  const ALL_COLS=COL_GROUPS.flatMap(g=>g.cols);
  const [visibleCols,setVisibleCols]=useState(()=>SAVED_VIEWS.standard.cols);
  const COLS=visibleCols.map(k=>ALL_COLS.find(c=>c.key===k)).filter(Boolean);
  const GROUP_OPTIONS=[
    {val:"none",           label:"Keine Gruppierung"},
    {val:"mitgliedschaft", label:"Nach Mitgliedschaft"},
    {val:"rollen",         label:"Nach Rolle"},
    {val:"teams",          label:"Nach Team"},
    {val:"portal",         label:"Nach Portal-Zugang"},
    {val:"datenpruefung",  label:"Nach Datenprüfung"},
  ];
  const GROUP_OPTIONS_MORE=[
    {val:"geschlecht",     label:"Nach Geschlecht"},
    {val:"nationalitaet",  label:"Nach Nationalität"},
    {val:"ort",            label:"Nach Wohnort"},
    {val:"__jahrgang",     label:"Nach Jahrgang"},
    {val:"__eintrittsjahr",label:"Nach Eintrittsjahr"},
  ];
  function exportData(format){
    const exportCols=COLS.filter(c=>c.key!=="name").map(c=>c.key);
    const headers=["Name",...COLS.filter(c=>c.key!=="name").map(c=>c.label)];
    const rows=filtered.map(m=>[
      m.name,
      ...exportCols.map(k=>{
        if(k==="rollen") return (m.rollen||[]).join(", ");
        if(k==="teams") return (m.teams||[]).map(t=>t.name||t).join(", ");
        if(k==="funktionen") return (m.funktionen||[]).join(", ");
        if(k==="nationalitaet") return m.nationalitaet&&m.nationalitaet!=="-"?m.nationalitaet:"";
        if(k==="nationalitaet2") return m.nationalitaet2||"";
        if(k==="eintritt") return m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"";
        if(k==="portal") return m.hat_portal_zugang?"Aktiv":"Kein Zugang";
        if(k==="datenpruefung") return m.profil_geprueft_at?"Geprüft":"Ausstehend";
        return m[k]!=null?String(m[k]):"";
      })
    ]);
    if(format==="csv"){
      const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,"\"\"")}"` ).join(";")).join("\r\n");
      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="mitglieder.csv";a.click();URL.revokeObjectURL(url);
    } else {
      const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Mitglieder");
      XLSX.writeFile(wb,"mitglieder.xlsx");
    }
  }

  function applyView(viewKey){
    setSavedView(viewKey);
    setVisibleCols(SAVED_VIEWS[viewKey]?.cols||SAVED_VIEWS.standard.cols);
    setFilterVals({});
  }

  function applyCustomView(v){
    setSavedView("custom_"+v.id);
    setVisibleCols(v.spalten||SAVED_VIEWS.standard.cols);
    setFilterVals(v.filter||{});
    setGroupBy(v.gruppierung||"none");
  }

  useEffect(()=>{
    if(!sb||!account?.id) return;
    sb.from("mitglieder_ansichten")
      .select("*").eq("benutzer_id",account.id)
      .order("created_at",{ascending:true})
      .then(({data})=>setCustomViews(data||[]));
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
    await sb.from("mitglieder").delete().in("id",ids);
    setSelected(new Set());
    setSelectMode(false);
    if(onReload) onReload();
  }
  async function handleBulkDeactivate(){
    if(!sb||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok) return;
    const ids=[...selected];
    const deaktiviertVon=account?.name||account?.email||"Administrator";
    await sb.from("mitglieder").update({aktiv:false,deaktiviert_am:new Date().toISOString(),deaktiviert_von:deaktiviertVon}).in("id",ids);
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
    const {data}=await sb.from("mitglieder_ansichten").insert({
      benutzer_id:account.id,
      name:saveViewName.trim(),
      spalten:visibleCols,
      filter:filterVals,
      gruppierung:groupBy,
    }).select().single();
    if(data) setCustomViews(prev=>[...prev,data]);
    setSaveViewName("");
    setSaveViewOpen(false);
    setSavingView(false);
  }

  async function deleteCustomView(id){
    if(!sb) return;
    await sb.from("mitglieder_ansichten").delete().eq("id",id);
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
    sb.from("mitglieder").select("id",{count:"exact",head:true}).eq("aktiv",false)
      .then(({count})=>setArchivCount(count||0));
  },[sb,archivLoaded]);

  /* Filter */
  const FILTER_DEFS=[
    {key:"mitgliedschaft", label:"Mitgliedschaft", vals:[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(Boolean))]},
    {key:"rollen", label:"Rollen", vals:[...new Set(allMembers.map(m=>m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null).filter(Boolean))].sort()},
    {key:"datenpruefung",  label:"Datenpruefung",  vals:[...new Set(allMembers.map(m=>m.datenpruefung).filter(Boolean))]},
    {key:"portal",         label:"Portal-Zugang",  vals:[...new Set(allMembers.map(m=>m.portal).filter(Boolean))]},
    {key:"teams",          label:"Teams",          vals:[...new Set(allMembers.flatMap(m=>m.teams.map(t=>t?.name||t)).filter(Boolean))].sort()},
  ];

  const filtered=allMembers.filter(m=>{
    if(search){
      const terms=search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack=[
        m.name,m.mitgliedschaft,
        ...m.rollen,
        ...m.teams.map(t=>t?.name||t||""),
        ...m.teams.map(t=>t?.kurz||""),
        m.email||"",
      ].join(" ").toLowerCase();
      if(!terms.every(t=>haystack.includes(t))) return false;
    }
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||fVals.length===0) continue;
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!fVals.includes(portalLabel)) return false;
        continue;
      }
      const raw=m[fKey];
      const mVal=Array.isArray(raw)
        ?raw.map(v=>v?.name||v)
        :[raw?.name||raw];
      if(!mVal.some(v=>fVals.includes(v))) return false;
    }
    return true;
  });

  const sorted=[...filtered].sort((a,b)=>{
    const getVal=m=>{const v=m[sortCol];if(Array.isArray(v)){const f=v[0];return f?.name||f||"";}return String(v??"");};
    const av=getVal(a);
    const bv=getVal(b);
    return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
  });

  const paged=sorted;
  const hasMore=false;
  let groups=[];
  function getGroupKey(m,g){
    if(g==="__jahrgang"){
      if(!m.geburtsdatum) return "Unbekannt";
      return String(new Date(m.geburtsdatum).getFullYear());
    }
    if(g==="__eintrittsjahr"){
      if(!m.eintritt) return "Unbekannt";
      return String(new Date(m.eintritt).getFullYear());
    }
    if(g==="teams"){
      return m.teams&&m.teams.length>0?m.teams.map(t=>t?.name||t):["Kein Team"];
    }
    if(g==="rollen"){
      const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
      return portalLabel||"Keine Rolle";
    }
    return null;
  }

  if(groupBy==="none"){
    groups=[{key:"",members:paged}];
  }else{
    const map={};
    paged.forEach(m=>{
      const computed=getGroupKey(m,groupBy);
      const vals=computed!==null?(Array.isArray(computed)?computed:[computed]):Array.isArray(m[groupBy])?m[groupBy].map(t=>t?.name||t||"-"):[m[groupBy]||"-"];
      vals.forEach(k=>{
        if(!map[k]) map[k]=[];
        map[k].push(m);
      });
    });
    groups=Object.entries(map).sort(([a],[b])=>String(a||"").localeCompare(String(b||""))).map(([k,members])=>({key:k,members}));
  }

  const dpColor=s=>s==="Geprueft"?GN:s==="Ausstehend"?AM:R;
  const SortIcon=({col})=>sortCol===col
    ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
    :<span className="cc-sort-arrow cc-text-muted">↕</span>;

  /* ── Detail-Modal ── */
  async function refreshArchivCount(){
    if(!sb) return;
    const {count}=await sb.from("mitglieder").select("id",{count:"exact",head:true}).eq("aktiv",false);
    setArchivCount(count||0);
  }

  async function reloadMember(id){
    if(!sb) return;
    const {data}=await sb.from("mitglieder").select("*").eq("id",id).single();
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
    />
  );


  /* ── Render ── */
  return (
    <MembersView
      role={role} account={account} allMembers={allMembers}
      dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen}
      dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
      kannSchreiben={kannSchreiben} kannVerwalten={kannVerwalten}
      sb={sb} onReload={onReload} onUpdatePortalZugang={onUpdatePortalZugang}
      onNavToTeam={onNavToTeam}
      search={search} setSearch={setSearch}
      sortCol={sortCol} setSortCol={setSortCol}
      sortDir={sortDir} setSortDir={setSortDir}
      groupBy={groupBy} setGroupBy={setGroupBy}
      filterVals={filterVals} setFilterVals={setFilterVals}
      savedView={savedView} setSavedView={setSavedView}
      visibleCols={visibleCols} setVisibleCols={setVisibleCols}
      dragCol={dragCol} setDragCol={setDragCol}
      dragOverCol={dragOverCol} setDragOverCol={setDragOverCol}
      pageSize={pageSize} setPageSize={setPageSize}
      selectMode={selectMode} setSelectMode={setSelectMode}
      selected={selected} setSelected={setSelected}
      customViews={customViews} setCustomViews={setCustomViews}
      saveViewOpen={saveViewOpen} setSaveViewOpen={setSaveViewOpen}
      saveViewName={saveViewName} setSaveViewName={setSaveViewName}
      savingView={savingView} setSavingView={setSavingView}
      selectedMember={selectedMember} setSelectedMember={setSelectedMember}
      breakdownOpen={breakdownOpen} setBreakdownOpen={setBreakdownOpen}
      archivTab={archivTab} setArchivTab={setArchivTab}
      archivData={archivData} setArchivData={setArchivData}
      archivLoaded={archivLoaded} setArchivLoaded={setArchivLoaded}
      archivCount={archivCount} setArchivCount={setArchivCount}
      confirm={confirm} confirmDialog={confirmDialog}
      ROLLE_LABEL={ROLLE_LABEL} TRAINER_KEYS={TRAINER_KEYS}
      reloadMember={reloadMember} refreshArchivCount={refreshArchivCount}
      brauchtEltern={brauchtEltern}
      exportData={exportData} applyView={applyView} applyCustomView={applyCustomView}
      handleBulkDelete={handleBulkDelete} handleBulkDeactivate={handleBulkDeactivate}
      saveCurrentView={saveCurrentView} deleteCustomView={deleteCustomView}
      handleSort={handleSort}
      handleColDragStart={handleColDragStart} handleColDragOver={handleColDragOver}
      handleColDrop={handleColDrop} handleColDragEnd={handleColDragEnd}
    />
  );
}

export { MitgliederModul };
