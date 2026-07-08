/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ArchivView.jsx
   Archiv-Tab des MitgliederModuls
   ═══════════════════════════════════════════════════════════════ */
import { useState, Fragment } from "react";
import { Btn, Row, Col, Between, Sub, Empty, useIsMobile, DropMenu, ModalOrSheet,
         ModalTitle, Input, useConfirm, ConfirmDialog, Av, BulkBar, Card, SortHeader,
         Toolbar } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { GN, R, AM, BL, BK } from "../../constants.js";
import { reaktiviereMitglied, deleteMitglied } from "../../domains/members/memberService.js";

function ArchivView({archivData,setArchivData,archivLoaded,sb,account,onUpdatePortalZugang=null,onReload,onOpenMember}){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const [archivSearch,setArchivSearch]=useState("");
  const [archivFilterVals,setArchivFilterVals]=useState({});
  const [archivGroupBy,setArchivGroupBy]=useState("none");
  const [archivSortCol,setArchivSortCol]=useState("deaktiviert_am");
  const [archivSortDir,setArchivSortDir]=useState("desc");
  const [archivSelectMode,setArchivSelectMode]=useState(false);
  const [archivSelected,setArchivSelected]=useState([]);

  async function reaktivieren(e,id,name){
    e.stopPropagation();
    const ok=await confirm({title:`${name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!sb||!ok) return;
    await reaktiviereMitglied(sb,id);
    if(onUpdatePortalZugang) await onUpdatePortalZugang(id,true);
    setArchivData(prev=>prev.filter(m=>m.id!==id));
    if(onReload) onReload();
  }

  async function loeschen(e,id,name){
    e.stopPropagation();
    const ok=await confirm({title:`${name} löschen (DSGVO)?`,message:"Diese Aktion ist unwiderruflich.",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await deleteMitglied(sb,id);
    setArchivData(prev=>prev.filter(m=>m.id!==id));
    if(onReload) onReload();
  }

  const ARCHIV_FILTER_DEFS=[
    {key:"mitgliedtyp", label:"Mitgliedschaft", vals:[...new Set(archivData.map(m=>m.mitgliedtyp).filter(Boolean))].sort()},
    {key:"deaktiviert_von", label:"Archiviert von", vals:[...new Set(archivData.map(m=>m.deaktiviert_von).filter(Boolean))].sort()},
  ];
  const ARCHIV_GROUP_OPTIONS=[
    {val:"none",           label:"Keine Gruppierung"},
    {val:"mitgliedtyp",    label:"Nach Mitgliedschaft"},
    {val:"deaktiviert_von",label:"Nach Archiviert von"},
    {val:"__archiviertjahr",label:"Nach Archiviert im Jahr"},
  ];
  const ARCHIV_SORT_OPTIONS=[
    {val:"nachname",       label:"Name"},
    {val:"mitgliedtyp",    label:"Mitgliedschaft"},
    {val:"deaktiviert_am", label:"Archiviert am"},
    {val:"deaktiviert_von",label:"Archiviert von"},
  ];
  const hasActiveFilter=Object.values(archivFilterVals).some(v=>v&&v.length>0);

  const filtered=archivData.filter(m=>{
    const name=`${m.vorname||""} ${m.nachname||""}`.toLowerCase();
    if(archivSearch&&!name.includes(archivSearch.toLowerCase())) return false;
    for(const [k,vals] of Object.entries(archivFilterVals)){
      if(!vals||vals.length===0) continue;
      if(!vals.includes(m[k])) return false;
    }
    return true;
  }).sort((a,b)=>{
    const av=a[archivSortCol]||"";
    const bv=b[archivSortCol]||"";
    const cmp=String(av).localeCompare(String(bv));
    return archivSortDir==="asc"?cmp:-cmp;
  });

  function getArchivGroupKey(m){
    if(archivGroupBy==="__archiviertjahr") return m.deaktiviert_am?String(new Date(m.deaktiviert_am).getFullYear()):"Unbekannt";
    return m[archivGroupBy]||"-";
  }
  const archivGroups=archivGroupBy==="none"
    ?[{key:"",members:filtered}]
    :Object.entries(filtered.reduce((acc,m)=>{
        const k=getArchivGroupKey(m);
        if(!acc[k]) acc[k]=[];
        acc[k].push(m);
        return acc;
      },{})).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([k,members])=>({key:k,members}));

  return(
    <>{confirmDialog}
    <div>
      <div className="cc-info-box cc-info-box-warn cc-mb-16">
        <TI n="info-circle" size={15}/>
        Archivierte Mitglieder — Daten sind noch vorhanden und können reaktiviert werden.
      </div>
      <Toolbar
        search={archivSearch} onSearch={setArchivSearch}
        filterDefs={ARCHIV_FILTER_DEFS}
        filterVals={archivFilterVals}
        onFilterChange={(key,val,active)=>{
          if(key==="__reset"){setArchivFilterVals({});return;}
          setArchivFilterVals(prev=>({
            ...prev,
            [key]:active?[...(prev[key]||[]),val]:(prev[key]||[]).filter(x=>x!==val)
          }));
        }}
        groupOptions={ARCHIV_GROUP_OPTIONS}
        groupBy={archivGroupBy} onGroupChange={setArchivGroupBy}
        moreItems={[
          {header:true,label:"Aktionen"},
          {icon:"checkbox",label:archivSelectMode?"Auswahl beenden":"Mehrere auswählen",onClick:()=>{setArchivSelectMode(o=>!o);setArchivSelected([]);} },
        ]}
      />
      <BulkBar
        show={archivSelectMode}
        count={archivSelected.length}
        total={filtered.length}
        onSelectAll={()=>setArchivSelected(archivSelected.length===filtered.length?[]:filtered.map(m=>m.id))}
        actions={[
          {icon:"user-check", label:"Reaktivieren", requiresSelection:true, onClick:async()=>{
            if(!archivSelected.length) return;const ok=await confirm({title:`${archivSelected.length} Mitglieder reaktivieren?`,confirmLabel:"Reaktivieren"});if(!sb||!ok) return;
            for(const id of archivSelected){
              await reaktiviereMitglied(sb,id);
              if(onUpdatePortalZugang) await onUpdatePortalZugang(id,true);
            }
            setArchivData(prev=>prev.filter(m=>!archivSelected.includes(m.id)));
            setArchivSelected([]);setArchivSelectMode(false);if(onReload)onReload();
          }},
          {icon:"trash", label:"Löschen (DSGVO)", danger:true, requiresSelection:true, onClick:async()=>{
            if(!archivSelected.length) return;const ok=await confirm({title:`${archivSelected.length} Mitglieder löschen?`,message:"Diese Aktion ist unwiderruflich (DSGVO).",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
            for(const id of archivSelected) await deleteMitglied(sb,id);
            setArchivSelected([]);setArchivSelectMode(false);if(onReload)onReload();
          }},
        ]}
        onCancel={()=>{setArchivSelected([]);setArchivSelectMode(false);}}
      />
      {hasActiveFilter&&(
        <div className="cc-ml-chips cc-mb-16">
          {Object.entries(archivFilterVals).flatMap(([k,vals])=>(vals||[]).map(v=>(
            <div key={k+v} className="cc-ml-chip" onClick={()=>setArchivFilterVals(prev=>({...prev,[k]:(prev[k]||[]).filter(x=>x!==v)}))}
            >{v} <span className="cc-ml-chip-x">×</span></div>
          )))}
          <div className="cc-ml-chip cc-text-sub" onClick={()=>setArchivFilterVals({})}>Alle löschen</div>
        </div>
      )}
      {!archivLoaded&&<div className="cc-empty">Wird geladen…</div>}
      {archivLoaded&&filtered.length===0&&<div className="cc-empty">Keine archivierten Mitglieder gefunden.</div>}
      {archivLoaded&&filtered.length>0&&(
        <Card flush>
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner">
            <table className="cc-members-table">
              <thead>
                <tr>
                  {archivSelectMode&&<th className="cc-members-th" style={{width:36}}><input type="checkbox" onChange={e=>setArchivSelected(e.target.checked?filtered.map(m=>m.id):[])}/></th>}
                  {[["nachname","Name"],["mitgliedtyp","Mitgliedschaft"],["deaktiviert_am","Archiviert am"],["deaktiviert_von","Archiviert von"]].map(([col,lbl])=>(
                    <SortHeader key={col} col={col} label={lbl} sortCol={archivSortCol} sortDir={archivSortDir}
                      onSort={col=>{if(archivSortCol===col)setArchivSortDir(d=>d==="asc"?"desc":"asc");else{setArchivSortCol(col);setArchivSortDir("asc");}}}/>
                  ))}
                  <th className="cc-members-th"/>
                </tr>
              </thead>
              <tbody>
                {archivGroups.map(({key,members})=>(
                  <Fragment key={key}>
                    {archivGroupBy!=="none"&&(
                      <tr><td colSpan={5} className="cc-members-list-group-hdr">{key} <span className="cc-text-muted">({members.length})</span></td></tr>
                    )}
                    {members.map(m=>(
                  <tr key={m.id} className="cc-members-tr" onClick={()=>!archivSelectMode&&onOpenMember&&onOpenMember(m)}>
                      {archivSelectMode&&<td className="cc-members-td" style={{width:36}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={archivSelected.includes(m.id)} onChange={e=>setArchivSelected(prev=>e.target.checked?[...prev,m.id]:prev.filter(id=>id!==m.id))}/></td>}
                    <td className="cc-members-td">
                      <div className="cc-row cc-gap-8">
                        <Av name={`${m.vorname||""} ${m.nachname||""}`} size={26}/>
                        <span className="cc-text-bold">{m.vorname} {m.nachname}</span>
                      </div>
                    </td>
                    <td className="cc-members-td cc-members-td-sub">{m.mitgliedtyp||"—"}</td>
                    <td className="cc-members-td cc-members-td-sub">
                      {m.deaktiviert_am?new Date(m.deaktiviert_am).toLocaleDateString("de-CH"):"—"}
                    </td>
                    <td className="cc-members-td cc-members-td-sub">{m.deaktiviert_von||"—"}</td>
                    <td className="cc-members-td" style={{textAlign:"right"}}>
                      <div className="cc-row cc-gap-6" onClick={e=>e.stopPropagation()}>
                        <Btn small onClick={e=>reaktivieren(e,m.id,`${m.vorname} ${m.nachname}`)}>
                          <TI n="user-check" size={13}/> Reaktivieren
                        </Btn>
                        <Btn small variant="danger" onClick={e=>loeschen(e,m.id,`${m.vorname} ${m.nachname}`)}>
                          <TI n="trash" size={13}/>
                        </Btn>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div></div>
          <div className="cc-archiv-footer">
            {filtered.length} von {archivData.length} archivierten Mitgliedern
          </div>
        </Card>
      )}
    </div>
  </>
  );
}



export { ArchivView };
