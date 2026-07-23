/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.jsx
   Globale Elternkontakte-Liste im MitgliederModul
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { Av, Card, Toolbar, useIsMobile, ModalOrSheet, ModalTitle, Input } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { fetchAlleElternkontakte, fetchAnsichten, insertAnsicht, deleteAnsicht } from "../../domains/members/memberService.js";
import { mapEltern, filterEltern, sortEltern } from "./memberDataUtils.js";

const COL_DEFS = [
  { key:"name",      label:"Name",      default:true, alwaysOn:true },
  { key:"beziehung", label:"Beziehung", default:true  },
  { key:"email",     label:"E-Mail",    default:true  },
  { key:"telefon",   label:"Telefon",   default:true  },
  { key:"kind_name", label:"Kind",      default:true  },
  { key:"portal",    label:"Portal",    default:true  },
];

const COL_GROUPS = [{ group:"Elternkontakt", cols:COL_DEFS }];

const GROUP_OPTIONS = [
  { val:"kind_name",  label:"Kind"        },
  { val:"beziehung",  label:"Beziehung"   },
  { val:"portal",     label:"Portal"      },
];

export function ElternListView({ sb, vereinId, account, kannVerwalten }) {
  const isMobile = useIsMobile();
  const [rawData,     setRawData]     = useState([]);
  const [loaded,      setLoaded]      = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterVals,  setFilterVals]  = useState({});
  const [sortCol,     setSortCol]     = useState("name");
  const [sortDir,     setSortDir]     = useState("asc");
  const [visibleCols, setVisibleCols] = useState(COL_DEFS.filter(c=>c.default).map(c=>c.key));
  const [groupBy,     setGroupBy]     = useState(["none"]);
  const [customViews, setCustomViews] = useState([]);
  const [savedView,   setSavedView]   = useState(null);
  const [saveOpen,    setSaveOpen]    = useState(false);
  const [saveName,    setSaveName]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  useEffect(()=>{
    if(!sb||!vereinId||loaded) return;
    fetchAlleElternkontakte(sb, vereinId).then(data=>{
      setRawData(mapEltern(data));
      setLoaded(true);
    });
  },[sb,vereinId,loaded]);

  useEffect(()=>{
    if(!sb||!account?.id) return;
    fetchAnsichten(sb, account.id, "eltern").then(setCustomViews);
  },[sb,account?.id]);

  const allEltern = rawData;

  const FILTER_DEFS = useMemo(()=>[
    { key:"beziehung", label:"Beziehung", vals:[...new Set(allEltern.map(e=>e.beziehung).filter(Boolean))].sort() },
    { key:"portal",    label:"Portal",    vals:["Aktiv","Kein Zugang"] },
  ],[allEltern]);

  const filtered = useMemo(()=>{
    let result = filterEltern(allEltern, search);
    Object.entries(filterVals).forEach(([k,vals])=>{
      if(!vals||!Array.isArray(vals)||vals.length===0) return;
      result = result.filter(e=>vals.includes(e[k]));
    });
    return result;
  },[allEltern, search, filterVals]);

  const sorted = useMemo(()=>sortEltern(filtered, sortCol, sortDir),[filtered, sortCol, sortDir]);

  const hasGroup = Array.isArray(groupBy)?groupBy.some(g=>g&&g!=="none"):groupBy!=="none";

  // Gruppierung bauen
  const groups = useMemo(()=>{
    if(!hasGroup) return [{key:"__all",label:"",members:sorted}];
    const gKey = Array.isArray(groupBy)?groupBy[0]:groupBy;
    const map = {};
    sorted.forEach(e=>{
      const k = e[gKey]||"—";
      if(!map[k]) map[k]=[];
      map[k].push(e);
    });
    return Object.entries(map).sort(([a],[b])=>String(a).localeCompare(String(b),"de"))
      .map(([k,members])=>({key:k,label:k,members}));
  },[sorted, groupBy, hasGroup]);

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }

  function handleFilterChange(key,val,active){
    if(key==="__reset"){ setFilterVals({}); return; }
    setFilterVals(prev=>{
      const cur=prev[key]||[];
      return {...prev,[key]:active?[...cur,val]:cur.filter(v=>v!==val)};
    });
  }

  function applyCustomView(v){
    setSavedView("custom_"+v.id);
    setVisibleCols(v.spalten||COL_DEFS.filter(c=>c.default).map(c=>c.key));
    setFilterVals(v.filter||{});
    setGroupBy(Array.isArray(v.gruppierung)?v.gruppierung:[v.gruppierung||"none"]);
  }

  async function saveView(){
    if(!saveName.trim()||!sb||!account?.id) return;
    setSaving(true);
    const data = await insertAnsicht(sb,{
      benutzer_id: account.id,
      verein_id:   vereinId,
      name:        saveName.trim(),
      spalten:     visibleCols,
      filter:      filterVals,
      gruppierung: Array.isArray(groupBy)?groupBy:[groupBy],
      typ:         "eltern",
    });
    if(data) setCustomViews(prev=>[...prev,data]);
    setSaveName(""); setSaveOpen(false); setSaving(false);
  }

  async function deleteView(id){
    if(!sb) return;
    await deleteAnsicht(sb,id);
    setCustomViews(prev=>prev.filter(v=>v.id!==id));
    if(savedView==="custom_"+id){ setSavedView(null); }
  }

  function exportCSV(){
    const cols = visibleCols.map(k=>COL_DEFS.find(c=>c.key===k)).filter(Boolean);
    const header = cols.map(c=>c.label).join(";");
    const rows = sorted.map(e=>cols.map(c=>String(e[c.key]||"")).join(";"));
    const csv = [header,...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="eltern.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const COLS = visibleCols.map(k=>COL_DEFS.find(c=>c.key===k)).filter(Boolean);
  const activeFilterCount = Object.values(filterVals).filter(v=>Array.isArray(v)&&v.length>0).length;

  const SortIcon = ({col})=>sortCol===col
    ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
    :<span className="cc-sort-hover-icon">↕</span>;

  function renderCell(col, e){
    switch(col.key){
      case "name":
        return <td key="name" className="cc-members-td">
          <div className="cc-row cc-gap-8">
            <Av name={e.name||"?"} size={26}/>
            <span className="cc-text-bold">{e.name}</span>
          </div>
        </td>;
      case "beziehung":
        return <td key="beziehung" className="cc-members-td cc-members-td-sub">{e.beziehung||"—"}</td>;
      case "email":
        return <td key="email" className="cc-members-td cc-members-td-sub">{e.email||"—"}</td>;
      case "telefon":
        return <td key="telefon" className="cc-members-td cc-members-td-sub">{e.telefon||"—"}</td>;
      case "kind_name":
        return <td key="kind_name" className="cc-members-td cc-members-td-sub">{e.kind_name||"—"}</td>;
      case "portal":
        return <td key="portal" className="cc-members-td">
          {e.benutzer_id
            ?<span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>
            :<span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>
          }
        </td>;
      default:
        return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(e[col.key]||"—")}</td>;
    }
  }

  const moreItems = [
    {header:true, label:"Ansichten"},
    ...customViews.map(v=>({
      label: v.name,
      icon: savedView==="custom_"+v.id?"check":"layout-list",
      onClick: ()=>applyCustomView(v),
      onDelete: ()=>deleteView(v.id),
    })),
    {icon:"device-floppy", label:"Als neue Ansicht speichern", onClick:()=>setSaveOpen(true)},
    "sep",
    {header:true, label:"Export"},
    {icon:"file-text", label:"E-Mail-Liste als CSV", onClick:exportCSV},
  ];

  return (
    <>
      <Toolbar
        search={search} onSearch={setSearch}
        filterDefs={FILTER_DEFS}
        filterVals={filterVals}
        onFilterChange={handleFilterChange}
        groupOptions={GROUP_OPTIONS}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        colMenu={!isMobile&&<span/>}
        moreItems={moreItems}
      />

      <Card className="cc-card-table" flush>
        {!loaded?(
          <div className="cc-empty">Elternkontakte werden geladen…</div>
        ):sorted.length===0?(
          <div className="cc-empty">Keine Elternkontakte gefunden.</div>
        ):(
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner">
            <table className="cc-members-table">
              <thead>
                <tr>
                  {COLS.map(col=>(
                    <th key={col.key} className="cc-members-th" onClick={()=>handleSort(col.key)}>
                      <span className="cc-members-th-inner">
                        <span>{col.label}<SortIcon col={col.key}/></span>
                      </span>
                    </th>
                  ))}
                  <th className="cc-members-th cc-members-th-actions"/>
                </tr>
              </thead>
              <tbody>
                {groups.map(({key,label,members})=>(
                  <>
                    {hasGroup&&(
                      <tr key={"hdr_"+key} className="cc-members-group-hdr"
                        onClick={()=>setCollapsedGroups(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;})}>
                        <td colSpan={COLS.length+1}>
                          <div className="cc-members-group-hdr-inner">
                            <TI n={collapsedGroups.has(key)?"chevron-right":"chevron-down"} size={14} className="cc-members-group-hdr-chevron"/>
                            <span className="cc-members-group-hdr-name">{label}</span>
                            <span className="cc-members-group-hdr-count">{members.length}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!collapsedGroups.has(key)&&members.map(e=>(
                      <tr key={e.id} className="cc-members-tr">
                        {COLS.map(col=>renderCell(col,e))}
                        <td className="cc-members-td cc-members-td-actions"/>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div></div>
        )}
        <div className="cc-archiv-footer">{sorted.length} von {allEltern.length} Elternkontakten</div>
      </Card>

      {/* Ansicht speichern Modal */}
      <ModalOrSheet open={saveOpen} onClose={()=>{setSaveOpen(false);setSaveName("");}} maxWidth={380}>
        <ModalTitle>Ansicht speichern</ModalTitle>
        <div className="cc-col cc-gap-12" style={{padding:"0 0 8px"}}>
          <Input value={saveName} onChange={e=>setSaveName(e.target.value)}
            placeholder="Name der Ansicht" autoFocus
            onKeyDown={e=>e.key==="Enter"&&saveView()}/>
          <button className="cc-btn-primary" onClick={saveView} disabled={saving||!saveName.trim()}>
            {saving?"Speichern…":"Speichern"}
          </button>
        </div>
      </ModalOrSheet>
    </>
  );
}
