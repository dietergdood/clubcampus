/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.jsx
   Globale Elternkontakte-Liste im MitgliederModul
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { Av, Card, Toolbar, SortHeader, useIsMobile } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { fetchAlleElternkontakte } from "../../domains/members/memberService.js";
import { mapEltern, filterEltern, sortEltern } from "./memberDataUtils.js";

const COL_DEFS = [
  { key:"name",       label:"Name",        default:true,  alwaysOn:true },
  { key:"beziehung",  label:"Beziehung",   default:true  },
  { key:"email",      label:"E-Mail",      default:true  },
  { key:"telefon",    label:"Telefon",     default:true  },
  { key:"kind_name",  label:"Kind",        default:true  },
  { key:"kind_teams", label:"Teams (Kind)",default:false },
  { key:"portal",     label:"Portal",      default:true  },
];

const COL_GROUPS = [
  { group:"Elternkontakt", cols: COL_DEFS },
];

const FILTER_DEFS_BASE = [
  { key:"beziehung", label:"Beziehung", vals:["Mutter","Vater","Grossmutter","Grossvater","Andere"] },
  { key:"portal",    label:"Portal",    vals:["Aktiv","Kein Zugang"] },
];

export function ElternListView({ sb, vereinId, kannVerwalten }) {
  const isMobile = useIsMobile();
  const [rawData,    setRawData]    = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterVals, setFilterVals] = useState({});
  const [sortCol,    setSortCol]    = useState("name");
  const [sortDir,    setSortDir]    = useState("asc");
  const [visibleCols,setVisibleCols]= useState(COL_DEFS.filter(c=>c.default).map(c=>c.key));

  useEffect(()=>{
    if(!sb||!vereinId||loaded) return;
    fetchAlleElternkontakte(sb, vereinId).then(data=>{
      setRawData(mapEltern(data));
      setLoaded(true);
    });
  },[sb,vereinId,loaded]);

  const allEltern = rawData;

  // Filter-Definitionen dynamisch
  const FILTER_DEFS = useMemo(()=>[
    ...FILTER_DEFS_BASE,
    { key:"kind_teams", label:"Team (Kind)", vals:[...new Set(allEltern.flatMap(e=>e.kind_teams).filter(Boolean))].sort() },
  ],[allEltern]);

  // Filter anwenden
  const filtered = useMemo(()=>{
    let result = filterEltern(allEltern, search);
    Object.entries(filterVals).forEach(([k,vals])=>{
      if(!vals||!Array.isArray(vals)||vals.length===0) return;
      if(k==="kind_teams"){
        result = result.filter(e=>e.kind_teams.some(t=>vals.includes(t)));
      } else {
        result = result.filter(e=>vals.includes(e[k]));
      }
    });
    return result;
  },[allEltern, search, filterVals]);

  const sorted = useMemo(()=>sortEltern(filtered, sortCol, sortDir),[filtered, sortCol, sortDir]);

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

  function exportCSV(){
    const cols = visibleCols.map(k=>COL_DEFS.find(c=>c.key===k)).filter(Boolean);
    const header = cols.map(c=>c.label).join(";");
    const rows = sorted.map(e=>cols.map(c=>{
      const v=e[c.key];
      return Array.isArray(v)?v.join(", "):(v||"");
    }).join(";"));
    const csv = [header,...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="eltern.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const COLS = visibleCols.map(k=>COL_DEFS.find(c=>c.key===k)).filter(Boolean);

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
      case "kind_teams":
        return <td key="kind_teams" className="cc-members-td cc-members-td-sub">
          {e.kind_teams.length>0?e.kind_teams.join(", "):"—"}
        </td>;
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

  const activeFilterCount = Object.values(filterVals).filter(v=>Array.isArray(v)&&v.length>0).length;

  return (
    <>
      <Toolbar
        search={search} onSearch={setSearch}
        filterDefs={FILTER_DEFS}
        filterVals={filterVals}
        onFilterChange={handleFilterChange}
        moreItems={[
          {header:true, label:"Export"},
          {icon:"file-text", label:"E-Mail-Liste als CSV", onClick:exportCSV},
        ]}
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
                    <th key={col.key} className="cc-members-th"
                      onClick={()=>handleSort(col.key)}>
                      <span className="cc-members-th-inner">
                        <span>{col.label}<SortIcon col={col.key}/></span>
                      </span>
                    </th>
                  ))}
                  <th className="cc-members-th cc-members-th-actions"/>
                </tr>
              </thead>
              <tbody>
                {sorted.map(e=>(
                  <tr key={e.id} className="cc-members-tr">
                    {COLS.map(col=>renderCell(col,e))}
                    <td className="cc-members-td cc-members-td-actions"/>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}
        <div className="cc-archiv-footer">{sorted.length} von {allEltern.length} Elternkontakten</div>
      </Card>
    </>
  );
}
