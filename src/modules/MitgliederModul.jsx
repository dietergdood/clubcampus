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
  const allMembers=mapMembers(dbMitglieder,dbPortalRollen,dbKaderRollen);

  const [visibleCols,setVisibleCols]=useState(()=>SAVED_VIEWS.standard.cols);
  const COLS=visibleCols.map(k=>ALL_COLS.find(c=>c.key===k)).filter(Boolean);
  function exportData(format){ exportDataUtil(filtered,COLS,format); }

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
    fetchAnsichten(sb,account.id).then(data=>setCustomViews(data));
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
  ],[allMembers,ROLLE_LABEL]);

  const filtered=useMemo(()=>filterMembers(allMembers,search,filterVals,ROLLE_LABEL),[allMembers,search,filterVals,ROLLE_LABEL]);

  const sorted=useMemo(()=>sortMembers(filtered,sortCol,sortDir),[filtered,sortCol,sortDir]);

  const paged=sorted;
  const hasMore=false;
  const groups=useMemo(()=>buildGroups(paged,groupBy,ROLLE_LABEL),[paged,groupBy,ROLLE_LABEL]);

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

  return(
    <>{confirmDialog}
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
      <div className="cc-grid-stats cc-mb-8">
        <Stat label="Mitglieder" value={totalCount} color={BL}/>
        <Stat label="Portal aktiv" value={portalAktiv} color={GN}/>
        <Stat label="Prüfung offen" value={dpOffen} color={AM}/>
        <Stat label="Ohne Team" value={ohneTeam} color={AM}/>
      </div>
      {/* Aufschluesselung */}
      <div className="cc-kpi-breakdown cc-mb-20">
        <button className="cc-kpi-breakdown-toggle" onClick={()=>setBreakdownOpen(o=>!o)}>
          <span className="cc-text-sm cc-text-sub">Mitgliedschaft Aufschlüsselung</span>
          <TI n={breakdownOpen?"chevron-up":"chevron-down"} size={13} className="cc-text-sub"/>
        </button>
        {breakdownOpen&&(
          <div className="cc-kpi-breakdown-body">
            {BREAKDOWN.map(b=>(
              <button key={b.key} className={`cc-kpi-tile cc-kpi-tile-${b.color}`} onClick={()=>bdFilter(b)}>
                <span className="cc-kpi-tile-label">{b.label}</span>
                <span className="cc-kpi-tile-value">{bdCount(b)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gespeicherte Ansichten - nur Desktop */}
      {!isMobile&&<div className="cc-ml-views">
        {Object.entries(SAVED_VIEWS).map(([k,v])=>(
          <button key={k}
            className={`cc-ml-view-btn${savedView===k?" cc-ml-view-btn-active":""}`}
            onClick={()=>applyView(k)}
          >{v.label}</button>
        ))}
        {customViews.map(v=>(
          <div key={v.id} className={`cc-ml-view-custom${savedView==="custom_"+v.id?" cc-ml-view-custom-active":""}`}>
            <button
              className={`cc-ml-view-btn${savedView==="custom_"+v.id?" cc-ml-view-btn-active":""}`}
              onClick={()=>applyCustomView(v)}
            >{v.name}</button>
            {savedView==="custom_"+v.id&&(
              <button className="cc-ml-view-del-active" onClick={()=>deleteCustomView(v.id)} title="Löschen">
                <TI n="x" size={11}/>
              </button>
            )}
          </div>
        ))}
        {saveViewOpen?(
          <div className="cc-ml-view-save-form">
            <input
              className="cc-ml-view-save-input"
              placeholder="Name der Ansicht…"
              value={saveViewName}
              onChange={e=>setSaveViewName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveCurrentView()}
              autoFocus
            />
            <Btn small variant="primary" onClick={saveCurrentView} disabled={savingView||!saveViewName.trim()}>
              {savingView?"...":"Speichern"}
            </Btn>
            <Btn small onClick={()=>{setSaveViewOpen(false);setSaveViewName("");}}>
              <TI n="x" size={12}/>
            </Btn>
          </div>
        ):(
          <button className="cc-ml-view-btn cc-ml-view-btn-add" onClick={()=>setSaveViewOpen(true)}>
            <TI n="plus" size={12}/> Ansicht speichern
          </button>
        )}
      </div>}

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
            {groups.map(({key,members})=>(
              <div key={key}>
                {groupBy!=="none"&&<div className="cc-members-list-group-hdr">{key} <span className="cc-text-muted">{(members||[]).length}</span></div>}
                {members.map(m=>(
                  <div key={m.id} className="cc-members-item" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
                    {m.foto_url
                      ?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>
                      :<Av name={m.name||"?"} size={38}/>
                    }
                    <div className="cc-members-item-meta">
                      <div className="cc-members-item-name">{m.name}</div>
                      <div className="cc-members-item-sub">
                        {m.mitgliedschaft!=="-"?m.mitgliedschaft:""}
                      </div>
                      {(m.rollen||[]).length>0&&(()=>{
                        const portalRaw=m.role&&m.role!=="-"?m.role:null;
                        const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;
                        const portalIsTrainer=portalRaw==="trainer";
                        const kaderWithMeta=(m.rollen||[]).map((r,i)=>{const rawR=(m.kader_rollen_raw||[])[i]||"";const isT=TRAINER_KEYS.some(k=>rawR===k);return{label:r,rawR,isT};}).filter(({label,isT})=>{if(label===portalLabel)return false;if(portalIsTrainer&&isT)return false;return true;});
                        const all=[...(portalLabel?[{label:portalLabel,isT:portalIsTrainer}]:[]),...kaderWithMeta];
                        return (all||[]).length>0?(
                          <div className="cc-members-item-chips">
                            {all.slice(0,2).map((c,i)=>(
                              <span key={i} className={`cc-role-chip cc-role-chip-sm${c.isT?" cc-role-chip-trainer":""}`}>{c.label}</span>
                            ))}
                            {(all||[]).length>2&&<span className="cc-ml-more">+{(all||[]).length-2}</span>}
                          </div>
                        ):null;
                      })()}
                    </div>
                    <div className="cc-members-item-right">
                      <TI n="chevron-right" size={14} className="cc-members-item-chevron"/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
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
                      {col.key!=="name"&&(
                        <span
                          className={`cc-col-drag-handle${dragCol===col.key?" cc-col-drag-handle-active":""}`}
                          onClick={e=>{e.stopPropagation();dragCol===col.key?handleColDragEnd():handleColDragStart(col.key);}}
                          title={dragCol===col.key?"Verschieben abbrechen":"Spalte verschieben"}
                          aria-hidden="true"
                        ><TI n="grip-vertical" size={11}/></span>
                      )}
                      <span>{col.label}<SortIcon col={col.key}/></span>
                    </span>
                  </th>
                ))}
                <th className="cc-members-th cc-members-th-actions"/>
              </tr>
            </thead>
            <tbody>
              {groups.map(({key,members})=>(
                <Fragment key={key}>
                  {groupBy!=="none"&&(
                    <tr className="cc-members-group-hdr"><td colSpan={COLS.length+1}>{key} <span className="cc-text-muted">{(members||[]).length}</span></td></tr>
                  )}
                  {members.map(m=>(
                    <tr key={m.id} className={`cc-members-tr${selected.has(m.id)?" cc-members-tr-selected":""}`}
                      onClick={()=>selectMode?toggleSelectRow(m.id):null}>
                      {selectMode&&<td className="cc-members-cb-col" onClick={e=>e.stopPropagation()}>
                        <div className={`cc-col-menu-check${selected.has(m.id)?" cc-col-menu-check-on":""}`} onClick={()=>toggleSelectRow(m.id)}>
                          {selected.has(m.id)&&<TI n="check" size={10}/>}
                        </div>
                      </td>}
                      {COLS.map(col=>{
                        switch(col.key){
                          case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}/>:<span className="cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}><Av name={m.name||"?"} size={26}/></span>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
                          case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-sub">{m.mitgliedschaft||"—"}</td>;
                          case "rollen": return <td key="rollen" className="cc-members-td">{(()=>{const portalRaw=m.role&&m.role!=="-"?m.role:null;const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;const portalIsTrainer=portalRaw==="trainer";const kaderWithMeta=(m.rollen||[]).map((r,i)=>{const rawR=(m.kader_rollen_raw||[])[i]||"";const isT=TRAINER_KEYS.some(k=>rawR===k);return{label:r,rawR,isT};}).filter(({label,isT})=>{if(label===portalLabel) return false;if(portalIsTrainer&&isT) return false;return true;});const all=[...(portalLabel?[{label:portalLabel,isT:portalIsTrainer}]:[]),...kaderWithMeta];return (all||[]).length>0?all.map((c,i)=><span key={i} className={`cc-role-chip cc-role-chip-sm${c.isT?" cc-role-chip-trainer":""}`} >{c.label}</span>):(<span className="cc-members-td-sub">—</span>);})()}</td>;
                          case "teams": return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{(m.teams||[]).length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{(m.teams||[]).slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{(m.teams||[]).length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:(m.teams||[]),x:e.clientX,y:e.clientY});}}>+{(m.teams||[]).length-1}</button>}</span>):"—"}</td>;
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
                          case "strasse": return <td key="strasse" className="cc-members-td cc-members-td-sub">{m.strasse||"—"}</td>;
                          case "heimatort": return <td key="heimatort" className="cc-members-td cc-members-td-sub">{m.heimatort||"—"}</td>;
                          case "ahv_nr": return <td key="ahv_nr" className="cc-members-td cc-members-td-sub">{m.ahv_nr?"••• •• ••••":"—"}</td>;
                          case "vorname": return <td key="vorname" className="cc-members-td cc-members-td-sub">{m.vorname||"—"}</td>;
                          case "nachname": return <td key="nachname" className="cc-members-td cc-members-td-sub">{m.nachname||"—"}</td>;
                          case "funktionen": return <td key="funktionen" className="cc-members-td cc-members-td-sub">{(m.funktionen||[]).join(", ")||"—"}</td>;
                          default: return <td key={col.key} className="cc-members-td cc-members-td-sub">—</td>;
                        }
                      })}
                      <td className="cc-members-td cc-members-td-actions"/>
                    </tr>
                  ))}
                </Fragment>
              ))}
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