/* ═══════════════════════════════════════════════════════════════
   ClubCampus — MitgliederModul.jsx
   State, Logik und Koordination — Render via MembersView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useMemo } from "react";
import { GN, AM, BL } from "../constants.js";
import { TI } from "../icons.jsx";
import { Av, Card, Stat, PortalBadge, DpBadge,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         useConfirm, ConfirmDialog,
         Tabs, STitle, Between, Sub, Label, Select, Empty, InfoBox } from "../theme.jsx";
import { archiviereMitglied, deleteMitglied, fetchArchiv, fetchArchivCount, fetchMitglied, fetchAlleElternkontakte } from "../domains/members/memberService.js";
import { SAVED_VIEWS, COL_GROUPS, ALL_COLS, GROUP_OPTIONS, GROUP_OPTIONS_MORE } from "./members/memberConstants.js";
import { mapMembers, filterMembers, sortMembers, buildGroups, exportData as exportDataUtil } from "./members/memberDataUtils.js";
import { ArchivView } from "./members/ArchivView.jsx";
import { MemberKPIs } from "./members/MemberKPIs.jsx";
import { makeMemberRenderCell } from "./members/MemberListCell.jsx";
import { useMemberMeta } from "../domains/members/useMemberMeta.js";
import { ElternListView } from "./members/ElternListView.jsx";
import { ListView } from "../shared/list/ListView.jsx";
import { MemberDetail } from "./members/MemberDetail.jsx";
import { NeuesMitgliedModal } from "./members/NeuesMitgliedModal.jsx";
import { fetchMitgliedtypPflichtfelder } from "../domains/members/memberService.js";

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null,vereinId=null}){
  const isMobile=useIsMobile();
  const [confirm,confirmDialog]=useConfirm();
  const [teamsPopover,setTeamsPopover]=useState(null);
  const [expandedTeams,setExpandedTeams]=useState(new Set());
  const [portalFunktionen,setPortalFunktionen]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
  const [showNeuesMitglied,setShowNeuesMitglied]=useState(false);
  const [dbPflichtfelder,setDbPflichtfelder]=useState([]);


  const [archivTab,setArchivTab]=useState(false);
  const [elternTab,setElternTab]=useState(false);
  const [archivData,setArchivData]=useState([]);
  const [archivLoaded,setArchivLoaded]=useState(false);
  const [archivCount,setArchivCount]=useState(null);
  const [elternCount,setElternCount]=useState(null);

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

  const { ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap } = useMemberMeta(dbPortalRollen, dbKaderRollen, portalFunktionen);
  const allMembers=mapMembers(dbMitglieder,dbPortalRollen,dbKaderRollen).map(m=>({
    ...m,
    funktionsgruppen:[...new Set((m.funktionen||[]).map(f=>funktionenGruppenMap[f]).filter(Boolean))],
  }));

  const filterRef = useRef(null);
  function exportData(rows, cols, groups, format){ exportDataUtil(rows, cols, format, groups); }



  useEffect(()=>{
    if(!sb||!account?.id) return;
    if(portalFunktionen.length===0)
      sb.from("portal_funktionen").select("id,name,portal_gruppen(name,farbe)").order("name")
        .then(({data})=>setPortalFunktionen(data||[]));
    fetchMitgliedtypPflichtfelder(sb).then(data=>setDbPflichtfelder(data));
  },[account?.id]);


  async function handleBulkDelete(selected){
    if(!sb||!selected||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder löschen?`,message:"Diese Aktion kann nicht rükgängig gemacht werden (DSGVO).",danger:true,confirmLabel:"Löschen"});if(!ok) return;
    const ids=[...selected];
    for(const id of ids) await deleteMitglied(sb,id);
    if(onReload) onReload();
  }
  async function handleBulkDeactivate(selected){
    if(!sb||!selected||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok) return;
    const ids=[...selected];
    const deaktiviertVon=account?.name||account?.email||"Administrator";
    await archiviereMitglied(sb,ids,deaktiviertVon);
    if(onUpdatePortalZugang) await Promise.all(ids.map(id=>onUpdatePortalZugang(id,false)));
    refreshArchivCount();
    setArchivLoaded(false);
    if(onReload) onReload();
  }





  useEffect(()=>{
    if(!sb) return;
    fetchArchivCount(sb).then(count=>setArchivCount(count));
  },[sb,archivLoaded]);
  useEffect(()=>{
    if(!sb||!vereinId) return;
    fetchAlleElternkontakte(sb,vereinId).then(data=>setElternCount(data.length));
  },[sb,vereinId]);
  useEffect(()=>{
    if(!sb||!archivTab||archivLoaded) return;
    fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
  },[sb,archivTab,archivLoaded]);

  /* Filter */
  /* computed values are in MembersView */
  /* ── Render ── */

  const JAHRGANG_MIN=useMemo(()=>{const jgs=allMembers.map(m=>m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null).filter(Boolean);return jgs.length?Math.min(...jgs):1940;},[allMembers]);
  const JAHRGANG_MAX=useMemo(()=>{const jgs=allMembers.map(m=>m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null).filter(Boolean);return jgs.length?Math.max(...jgs):new Date().getFullYear();},[allMembers]);
  const ALTER_MAX=useMemo(()=>{const alters=allMembers.map(m=>m.alter).filter(v=>v!=null);return alters.length?Math.max(...alters):90;},[allMembers]);

  const FILTER_DEFS=useMemo(()=>[
    {key:"__und_1",         type:"und-divider"},
    {key:"mitgliedschaft",  label:"Mitgliedschaft",  vals:[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(Boolean))]},
    {key:"geschlecht",      label:"Geschlecht",      vals:["Männlich","Weiblich","Divers"]},
    {key:"teams",           label:"Teams",           vals:[...new Set(allMembers.flatMap(m=>(m.teams||[]).map(t=>t?.name||t)).filter(Boolean))].sort()},
    {key:"__or_divider",    type:"or-divider"},
    {key:"kaderrollen",     label:"Kaderrollen",     vals:[...new Set(allMembers.flatMap(m=>(m.kader_rollen_raw||[])).filter(Boolean))].sort()},
    {key:"funktionen",      label:"Funktion",        vals:[...new Set(allMembers.flatMap(m=>m.funktionen||[]).filter(Boolean))].sort()},
    {key:"funktionsgruppen",label:"Funktionsgruppe", vals:[...new Set(allMembers.flatMap(m=>m.funktionsgruppen||[]).filter(Boolean))].sort()},
    {key:"__und_2",         type:"und-divider"},
    {key:"wohnort",         label:"Wohnort",         vals:[...new Set(allMembers.map(m=>m.wohnort).filter(Boolean))].sort()},
    {key:"jahrgang",        label:"Jahrgang",        type:"range", min:JAHRGANG_MIN, max:JAHRGANG_MAX},
    {key:"alter",           label:"Alter",           type:"range", min:0, max:ALTER_MAX, suffix:" J."},
    {key:"rollen",          label:"Portalrollen",    vals:[...new Set(allMembers.map(m=>m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null).filter(Boolean))].sort()},
    {key:"portal",          label:"Portal-Zugang",   vals:[...new Set(allMembers.map(m=>m.portal).filter(Boolean))]},
    {key:"datenpruefung",   label:"Datenprüfung",    vals:[...new Set(allMembers.map(m=>m.datenpruefung).filter(Boolean))]},
  ],[allMembers,ROLLE_LABEL,JAHRGANG_MIN,JAHRGANG_MAX,ALTER_MAX]);


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




  /* Portal-Zugang Zelle */
  const renderCell = makeMemberRenderCell({ portalFunktionen, TRAINER_KEYS, ROLLE_LABEL, teamsPopover, setTeamsPopover, expandedTeams, setExpandedTeams, setSelectedMember });

  return(
    <>{confirmDialog}
      <NeuesMitgliedModal
        open={showNeuesMitglied}
        onClose={()=>setShowNeuesMitglied(false)}
        sb={sb}
        dbMitgliedtypen={dbMitgliedtypen}
        dbPortalRollen={dbPortalRollen}
        dbPflichtfelder={dbPflichtfelder}
        vereinId={vereinId}
        account={account}
        onSuccess={()=>{ if(onReload) onReload(); }}
      />
    <div className="cc-page-wide">
      {/* Header + Tabs */}
      <div className="cc-page-hdr">
        <div className="cc-row cc-gap-0">
          <h1 className="cc-page-title cc-page-title-mr">Mitglieder</h1>
          {(role==="administrator"||role==="administration")&&(
            <div className="cc-ml-tabs-bar">
              <button className={`cc-ml-tab${!archivTab&&!elternTab?" cc-ml-tab-active":""}`} onClick={()=>{setArchivTab(false);setElternTab(false);}}>
                Aktive <span className="cc-ml-tab-count">{(allMembers||[]).length}</span>
              </button>
              <button className={`cc-ml-tab${archivTab?" cc-ml-tab-active":""}`} onClick={()=>{
                setArchivTab(true);setElternTab(false);
                if(!archivLoaded&&sb){
                  fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
                }
              }}>
                Archiv {archivCount!==null&&<span className="cc-ml-tab-count">{archivCount}</span>}
              </button>
              <button className={`cc-ml-tab${elternTab?" cc-ml-tab-active":""}`} onClick={()=>{setElternTab(true);setArchivTab(false);}}>
                Eltern {elternCount!==null&&<span className="cc-ml-tab-count">{elternCount}</span>}
              </button>
            </div>
          )}
        </div>

      </div>

      {elternTab?(
        <ElternListView sb={sb} vereinId={vereinId} account={account} isAdmin={role==="administrator"||role==="administration"}/>
      ):archivTab?(
        <ArchivView archivData={archivData} setArchivData={setArchivData} archivLoaded={archivLoaded} sb={sb} onUpdatePortalZugang={onUpdatePortalZugang} onReload={()=>{setArchivLoaded(false);if(onReload)onReload();}} onOpenMember={async m=>{
          if(!sb) return;
          const data=await fetchMitglied(sb,m.id);
          if(data) setSelectedMember({...data,name:`${data.vorname||""} ${data.nachname||""}`.trim()||"?",_tab:"info",_readonly:true});
        }}/>
      ):(
      <>
      <MemberKPIs allMembers={allMembers} dbMitgliedtypen={dbMitgliedtypen} onFilter={vals=>filterRef.current&&filterRef.current(vals)}/>


      {/* Gespeicherte Ansichten - nur Desktop */}

      <ListView
        emptyIcon="users"
        emptyTitle="Noch keine Mitglieder"
        emptySubtitle="Füge das erste Mitglied hinzu, um loszulegen."
        rows={allMembers}
        filterFn={(rows,search,filterVals)=>filterMembers(rows,search,filterVals,ROLLE_LABEL)}
        sortFn={sortMembers}
        buildGroupsFn={(rows,groupBy,groupOrder,filterVals)=>buildGroups(rows,groupBy,ROLLE_LABEL,{...filterVals,__portalFunktionen:portalFunktionen},null,groupOrder)}
        colDefs={ALL_COLS}
        colGroups={COL_GROUPS}
        defaultCols={SAVED_VIEWS.standard.cols}
        savedViews={SAVED_VIEWS}
        filterDefs={FILTER_DEFS}
        groupOptions={GROUP_OPTIONS}
        groupOptionsMore={GROUP_OPTIONS_MORE}
        multiGroup
        renderCell={(col,m,gc,filterVals)=>renderCell(col,m,gc,filterVals)}
        renderMobile={m=>(
          <div key={m.id} className="cc-members-item" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
            {m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>:<Av name={m.name||"?"} size={38}/>}
            <div className="cc-members-item-body">
              <div className="cc-members-item-name">{m.name}</div>
              <div className="cc-members-item-sub">{m.mitgliedschaft||""}{m.role&&m.role!=="-"?" · "+(ROLLE_LABEL[m.role]||m.role):""}</div>
            </div>
            <div className="cc-members-item-right"><TI n="chevron-right" size={14} className="cc-members-item-chevron"/></div>
          </div>
        )}
        sb={sb}
        account={account}
        vereinId={vereinId}
        viewTyp="mitglieder"
        isAdmin={role==="administrator"||role==="administration"}
        selectable
        bulkActions={[
          {icon:"archive",  label:"Archivieren", onClick:handleBulkDeactivate},
          {icon:"trash",    label:"Löschen (DSGVO)", onClick:handleBulkDelete, danger:true, requiresSelection:true},
        ]}
        exportFn={canExport ? exportData : undefined}
        exportFormats={canExport ? [
          {label:"Liste als CSV (flach)",                format:"csv"},
          {label:"Liste als CSV (mit Gruppen)",          format:"csv-gruppen"},
          {label:"Liste als Excel (pro Gruppe ein Sheet)",format:"excel-sheets", icon:"table"},
        ] : []}
        externalSetFilter={filterRef}
        footerLabel={(f,t)=>`${f} von ${t} Mitgliedern`}
        moreActions={kannVerwalten("members") ? [
          "sep",
          { icon:"user-plus", label:"Mitglied hinzufügen", onClick:()=>setShowNeuesMitglied(true) },
        ] : []}
      />
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