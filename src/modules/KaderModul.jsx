/* ═══════════════════════════════════════════════════════════════
   ClubCampus KaderModul — KaderModul.jsx
   Team-Kader Ansicht mit Spielerliste
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT20, GN, R, BL, BK, GB } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, Card, Chip, Av, Row, Between, Col, SectionLabel, Btn, Input , avColor} from "./theme.jsx";
import { ROSTER } from "./demoData.js";

const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

const NR_CACHE = {data: Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};

const POSITION_GROUPS = [
  {label:"Torwart",     options:["TW"]},
  {label:"Verteidiger", options:["V","IV","RV","LV"]},
  {label:"Mittelfeld",  options:["MF","DM","ZM","LM","RM"]},
  {label:"Sturm",       options:["ST"]},
];

const FUNKTION_ORDER = ["Trainer/in","Co-Trainer/in","Assistent/in","Goalietrainer/in","Masseur/in","Admin","TW","V","IV","RV","LV","DM","ZM","MF","LM","RM","ST"];

const COL_DEF_ALL = [
  {key:"name",     label:"Name / Vorname", always:true},
  {key:"role",     label:"Funktion",       always:true},
  {key:"pos",      label:"Position",       always:true},
  {key:"nr",       label:"Nr.",            always:true},
  {key:"dob",      label:"Geburtsdatum",   field:"dob"},
  {key:"email",    label:"E-Mail",         field:"email"},
  {key:"tel",      label:"Telefon",        field:"tel"},
  {key:"pass",     label:"Spielerpass",    field:"pass"},
  {key:"js",       label:"J+S Nr.",        field:"js"},
  {key:"ahv",      label:"AHV-Nummer",     field:"ahv"},
  {key:"fairgate", label:"Fairgate-ID",    field:"fairgate"},
];

function normFunktion(s){
  if(!s) return "-";
  const l = s.toLowerCase();
  if(l.includes("goalietrain")||l.includes("goalitrain")) return "Goalietrainer/in";
  if(l.includes("co-train")||l.includes("co train")||l.includes("cotrainer")) return "Co-Trainer/in";
  if(l.includes("assistent")||l.includes("assistenz")) return "Assistent/in";
  if(l.includes("masseur")||l.includes("physiother")) return "Masseur/in";
  if(l.includes("admin")||l.includes("sekretär")||l.includes("aktuarin")) return "Admin";
  if(l.includes("train")) return "Trainer/in";
  return s;
}

/* ── Gruppen-Header Zeile ── */
function GruppenHeader({label, count, colSpan}){
  return(
    <tr>
      <td colSpan={colSpan} style={{padding:"6px 14px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
        <Row gap={6}>
          <span className="cc-section-hdr">{label}</span>
          <span style={{fontSize:11,color:"var(--sub)",fontWeight:400,opacity:0.7}}>({count})</span>
        </Row>
      </td>
    </tr>
  );
}

/* ── Positions-Badge ── */
function PosBadge({pos}){
  if(!pos) return <span style={{fontSize:13,color:"var(--sub)"}}>-</span>;
  return <span style={{fontSize:12,fontWeight:700,color:"var(--sub)",background:"var(--surface2)",padding:"2px 8px",borderRadius:6}}>{pos}</span>;
}

/* ── Funktions-Badge ── */
function FunktionBadge({role}){
  if(!role) return <span style={{fontSize:13,color:"var(--sub)"}}>Spieler/in</span>;
  return <span style={{fontSize:11,fontWeight:700,background:"#7C3AED18",color:"#7C3AED",padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap"}}>{role}</span>;
}

function KaderModul({role, team, initialSelected=null, teamRosterData=null}){
  const isMobile = useIsMobile();
  const vis = FIELD_VIS[role]||[];
  const canEdit = ["trainer","administrator","administration"].includes(role);
  const canExport = ["trainer","funktionaer","vorstand","administration","administrator"].includes(role);
  const isSimple = ["trainer","spieler","eltern"].includes(role);

  const baseRoster = teamRosterData||(team ? ROSTER.filter(p=>(p.teams||[]).includes(team)) : ROSTER);
  const initPlayer = typeof initialSelected==="number" ? baseRoster.find(p=>p.id===initialSelected)||null : initialSelected;

  const [selected,   setSelected]   = useState(initPlayer);
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState("name");
  const [sortDir,    setSortDir]    = useState(1);
  const [groupBy,    setGroupBy]    = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [editingNr,  setEditingNr]  = useState(null);
  const [exportFields, setExportFields] = useState(["name","role","pos","nr"]);
  const [positions,  setPositions]  = useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.pos])));
  const [rueckennrn, setRueckennrn] = useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.rueckennr||""])));
  const [nrLoaded,   setNrLoaded]   = useState(false);

  if(!nrLoaded){
    setNrLoaded(true);
    (async()=>{
      try{
        const res = await window.storage.get("rueckennrn");
        if(res){ const d=JSON.parse(res.value); Object.assign(NR_CACHE.data,d); setRueckennrn(p=>({...p,...d})); }
      }catch(e){}
    })();
  }

  const saveNr = (newNrn) => {
    setRueckennrn(newNrn);
    Object.assign(NR_CACHE.data, newNrn);
    window.storage.set("rueckennrn", JSON.stringify(newNrn)).catch(()=>{});
  };

  const handleSort = (key) => {
    if(sortKey===key) setSortDir(d=>d*-1);
    else { setSortKey(key); setSortDir(1); }
  };

  const cols = (isSimple ? COL_DEF_ALL.filter(c=>["name","role","pos","nr"].includes(c.key)) : COL_DEF_ALL)
    .filter(c=>c.always||vis.includes(c.field));

  const filtered = [...baseRoster]
    .filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sortKey==="name"){
        const va=String((a.lastName||"")+(a.firstName||"")||a.name||"");
        const vb=String((b.lastName||"")+(b.firstName||"")||b.name||"");
        return va.localeCompare(vb)*sortDir;
      }
      if(sortKey==="pos"){ return String(positions[a.id]||"").localeCompare(String(positions[b.id]||""))*sortDir; }
      if(sortKey==="nr"){
        const va=rueckennrn[a.id]?parseInt(rueckennrn[a.id]):9999;
        const vb=rueckennrn[b.id]?parseInt(rueckennrn[b.id]):9999;
        return (va-vb)*sortDir;
      }
      return 0;
    });

  const grouped = groupBy
    ? Object.entries(filtered.reduce((acc,p)=>{
        const key = normFunktion(p.role||positions[p.id])||"Spieler/in";
        if(!acc[key]) acc[key]=[];
        acc[key].push(p); return acc;
      },{}))
      .sort(([a],[b])=>{
        const ia=FUNKTION_ORDER.indexOf(a), ib=FUNKTION_ORDER.indexOf(b);
        if(ia>=0&&ib>=0) return ia-ib;
        if(ia>=0) return -1; if(ib>=0) return 1;
        return a.localeCompare(b);
      })
      .map(([key,items])=>({key,items}))
    : [{key:null, items:filtered}];

  const SortIcon = ({col}) => sortKey===col
    ? <TI n={sortDir===1?"arrow-up":"arrow-down"} size={13} style={{marginLeft:3,color:R}}/>
    : <TI n="arrows-sort" size={13} style={{marginLeft:3,color:"var(--sub)",opacity:0.5}}/>;

  /* ── Export Modal ── */
  const handleExport = () => {
    const fields = COL_DEF_ALL.filter(c=>exportFields.includes(c.key));
    const header = fields.map(c=>c.label).join(";");
    const rows = filtered.map(p=>fields.map(c=>{
      if(c.key==="name") return `${p.lastName||""} ${p.firstName||""}`.trim()||p.name;
      if(c.key==="nr")   return rueckennrn[p.id]||"-";
      if(c.key==="pos")  return positions[p.id]||"-";
      if(c.key==="role") return p.role||"Spieler/in";
      return p[c.field]||"-";
    }).join(";")).join("\n");
    const csv = `${header}\n${rows}`;
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = `Kader_${team||"Export"}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setShowExport(false);
  };

  /* ── Mobile Zeile ── */
  const MobileRow = ({p}) => (
    <div onClick={()=>setSelected(p)}
      style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
        borderTop:"0.5px solid var(--border)",cursor:"pointer",background:"var(--surface)"}}>
      <Av name={p.name} size={32} bg={ACCENT20}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:14,color:"var(--text)",marginBottom:3}}>
          {p.lastName} {p.firstName}
        </div>
        <Row gap={6} wrap>
          {positions[p.id]&&<PosBadge pos={positions[p.id]}/>}
          {rueckennrn[p.id]&&<span style={{fontSize:12,color:"var(--sub)"}}>Nr. {rueckennrn[p.id]}</span>}
          {p.role&&<FunktionBadge role={p.role}/>}
          {!p.role&&p.teams&&p.teams.length>1&&p.teams.map((t,i)=>(
            <span key={i} style={{fontSize:12,fontWeight:600,background:i===0?R+"15":"#EFF6FF",color:i===0?R:BL,padding:"2px 6px",borderRadius:6}}>{t}</span>
          ))}
        </Row>
      </div>
      <TI n="chevron-right" size={16} style={{color:"var(--sub)",flexShrink:0}}/>
    </div>
  );

  /* ── Desktop Zeile ── */
  const DesktopRow = ({p}) => (
    <tr onClick={()=>setSelected(p)} className="hov-row"
      style={{borderTop:"0.5px solid var(--border)",cursor:"pointer"}}>
      {cols.map((c,j)=>{
        /* Name */
        if(c.key==="name") return(
          <td key={j} style={{padding:"10px 14px"}}>
            <Row gap={10}>
              <Av name={p.name} size={28} bg={ACCENT20}/>
              <Col gap={2}>
                <span style={{fontWeight:600,fontSize:13,color:"var(--text)",whiteSpace:"nowrap"}}>
                  {p.lastName} {p.firstName}
                </span>
                {!p.role&&p.teams&&p.teams.length>1&&(
                  <Row gap={4} wrap>
                    {p.teams.map((t,i)=>(
                      <span key={i} style={{fontSize:11,fontWeight:600,background:i===0?R+"15":"#EFF6FF",color:i===0?R:BL,padding:"1px 6px",borderRadius:6}}>{t}</span>
                    ))}
                  </Row>
                )}
              </Col>
            </Row>
          </td>
        );
        /* Funktion */
        if(c.key==="role") return(
          <td key={j} style={{padding:"10px 14px"}}>
            <FunktionBadge role={p.role}/>
          </td>
        );
        /* Position */
        if(c.key==="pos") return(
          <td key={j} style={{padding:"10px 14px"}} onClick={e=>e.stopPropagation()}>
            {canEdit&&editingPos===p.id?(
              <select autoFocus value={positions[p.id]||""}
                onChange={e=>{setPositions(prev=>({...prev,[p.id]:e.target.value}));setEditingPos(null);}}
                onBlur={()=>setEditingPos(null)}
                style={{padding:"3px 8px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,
                  fontWeight:600,color:R,background:"var(--surface)",outline:"none"}}>
                <option value="">- keine -</option>
                {POSITION_GROUPS.map(g=>(
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                  </optgroup>
                ))}
              </select>
            ):(
              <Row gap={6} style={{cursor:canEdit?"pointer":"default"}}
                onClick={canEdit?()=>setEditingPos(p.id):undefined}>
                <PosBadge pos={positions[p.id]}/>
                {canEdit&&<TI n="edit" size={13} style={{color:"var(--sub)",opacity:0.5}}/>}
              </Row>
            )}
          </td>
        );
        /* Nummer */
        if(c.key==="nr") return(
          <td key={j} style={{padding:"10px 14px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            {canEdit&&editingNr===p.id?(
              <input autoFocus type="number" min="1" max="99"
                value={rueckennrn[p.id]}
                onChange={e=>saveNr({...rueckennrn,[p.id]:e.target.value})}
                onBlur={()=>setEditingNr(null)}
                onKeyDown={e=>{if(e.key==="Enter")setEditingNr(null);}}
                style={{width:42,padding:"3px 6px",border:`1.5px solid ${R}`,borderRadius:6,
                  fontSize:13,fontWeight:700,textAlign:"center",color:R,outline:"none"}}/>
            ):(
              <Row gap={4} justify="center" style={{cursor:canEdit?"pointer":"default"}}
                onClick={canEdit?()=>setEditingNr(p.id):undefined}>
                <span style={{fontSize:13,fontWeight:600,color:"var(--sub)"}}>
                  {rueckennrn[p.id]||"-"}
                </span>
                {canEdit&&<TI n="edit" size={13} style={{color:"var(--sub)",opacity:0.5}}/>}
              </Row>
            )}
          </td>
        );
        /* AHV */
        if(c.key==="ahv") return <td key={j} style={{padding:"10px 14px",color:"var(--sub)",fontSize:13}}>••••••••</td>;
        /* Default */
        return <td key={j} style={{padding:"10px 14px",color:c.field==="email"?BL:"var(--sub)",fontSize:13,whiteSpace:"nowrap"}}>{p[c.field]||"-"}</td>;
      })}
      <td style={{padding:"10px 14px",textAlign:"right"}}>
        <TI n="chevron-right" size={16} style={{color:"var(--sub)"}}/>
      </td>
    </tr>
  );

  return(
    <div>
      {/* Mitglied-Detail Modal */}
      {selected&&(
        <div onClick={()=>setSelected(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"var(--surface)",borderRadius:"16px 16px 0 0",padding:20,
              width:"100%",maxWidth:540,maxHeight:"80vh",overflowY:"auto"}}>
            <Between style={{marginBottom:16}}>
              <Row gap={12}>
                <Av name={selected.name} size={44} bg={ACCENT20}/>
                <Col gap={2}>
                  <span style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>
                    {selected.lastName} {selected.firstName}
                  </span>
                  <FunktionBadge role={selected.role}/>
                </Col>
              </Row>
              <Btn variant="ghost" onClick={()=>setSelected(null)} style={{color:"var(--sub)",fontSize:20}}>×</Btn>
            </Between>
            <Col gap={8}>
              {selected.dob&&vis.includes("dob")&&(
                <Row gap={8}>
                  <span style={{fontSize:13,color:"var(--sub)",minWidth:100}}>Geburtsdatum</span>
                  <span style={{fontSize:13,color:"var(--text)"}}>{selected.dob}</span>
                </Row>
              )}
              {selected.email&&vis.includes("email")&&(
                <Row gap={8}>
                  <span style={{fontSize:13,color:"var(--sub)",minWidth:100}}>E-Mail</span>
                  <span style={{fontSize:13,color:BL}}>{selected.email}</span>
                </Row>
              )}
              {selected.tel&&vis.includes("tel")&&(
                <Row gap={8}>
                  <span style={{fontSize:13,color:"var(--sub)",minWidth:100}}>Telefon</span>
                  <span style={{fontSize:13,color:"var(--text)"}}>{selected.tel}</span>
                </Row>
              )}
            </Col>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport&&(
        <div onClick={()=>setShowExport(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"var(--surface)",borderRadius:16,padding:24,
              width:320,maxWidth:"90vw",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
            <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:700,color:"var(--text)"}}>Kaderliste exportieren</h2>
            <p style={{margin:"0 0 16px",fontSize:13,color:"var(--sub)"}}>Felder auswählen die exportiert werden sollen</p>
            <Col gap={6} style={{marginBottom:20}}>
              {COL_DEF_ALL.map(c=>(
                <label key={c.key}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"6px 10px",
                    borderRadius:8,background:"var(--surface2)",cursor:"pointer"}}>
                  <input type="checkbox" checked={exportFields.includes(c.key)}
                    onChange={e=>setExportFields(prev=>e.target.checked?[...prev,c.key]:prev.filter(k=>k!==c.key))}
                    style={{width:16,height:16,accentColor:BK,cursor:"pointer"}}/>
                  <span style={{fontSize:13,color:"var(--text)"}}>{c.label}</span>
                </label>
              ))}
            </Col>
            <Row gap={8}>
              <Btn variant="primary" color={BK} onClick={handleExport}>Exportieren</Btn>
              <Btn onClick={()=>setShowExport(false)}>Abbrechen</Btn>
            </Row>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Between style={{marginBottom:12,flexWrap:"wrap",gap:8}}>
        <Input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Spieler suchen…" style={{width:200}}/>
        <Row gap={8}>
          {canExport&&(
            <Btn onClick={()=>setShowExport(true)}>
              <Row gap={6}><TI n="file-download" size={14} style={{color:GN}}/>Export</Row>
            </Btn>
          )}
          <Btn onClick={()=>setGroupBy(g=>!g)}
            style={groupBy?{background:BK+"12",borderColor:BK,color:BK}:{}}>
            <Row gap={6}><TI n="layout-list" size={14}/>Gruppieren</Row>
          </Btn>
          <span style={{fontSize:13,color:"var(--sub)",padding:"6px 10px",
            background:"var(--surface2)",borderRadius:8,fontWeight:600}}>
            {filtered.length} Mitglieder
          </span>
        </Row>
      </Between>

      {/* Mobile */}
      {isMobile?(
        <div style={{background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)",overflow:"hidden"}}>
          {grouped.flatMap(({key,items})=>[
            key&&(
              <div key={`h-${key}`}
                style={{padding:"7px 16px",background:"var(--surface2)",
                  borderTop:"0.5px solid var(--border)"}}>
                <Row gap={6}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--sub)",
                    textTransform:"uppercase",letterSpacing:0.6}}>{key}</span>
                  <span style={{fontSize:11,color:"var(--sub)",opacity:0.7}}>({items.length})</span>
                </Row>
              </div>
            ),
            ...items.map(p=><MobileRow key={p.id} p={p}/>),
          ]).filter(Boolean)}
          {filtered.length===0&&(
            <div style={{padding:32,textAlign:"center",color:"var(--sub)",fontSize:13}}>
              Keine Spieler gefunden
            </div>
          )}
        </div>
      ):(
        /* Desktop Tabelle */
        <div style={{background:"var(--surface)",borderRadius:12,
          border:"0.5px solid var(--border)",overflow:"hidden",overflowX:"auto"}}>
          <table className="cc-table">
            <thead>
              <tr style={{background:"var(--surface2)"}}>
                {cols.map((c,i)=>{
                  const sortable = ["name","pos","nr"].includes(c.key);
                  return(
                    <th key={i} onClick={sortable?()=>handleSort(c.key):undefined}
                      style={{padding:"9px 14px",textAlign:"left",fontWeight:600,
                        color:"var(--sub)",fontSize:11,textTransform:"uppercase",
                        letterSpacing:0.5,whiteSpace:"nowrap",
                        cursor:sortable?"pointer":"default",userSelect:"none"}}>
                      <Row gap={4}>{c.label}{sortable&&<SortIcon col={c.key}/>}</Row>
                    </th>
                  );
                })}
                <th style={{width:32}}/>
              </tr>
            </thead>
            <tbody>
              {grouped.flatMap(({key,items})=>[
                key&&<GruppenHeader key={`h-${key}`} label={key} count={items.length} colSpan={cols.length+1}/>,
                ...items.map(p=><DesktopRow key={p.id} p={p}/>),
              ]).filter(Boolean)}
              {filtered.length===0&&(
                <tr><td colSpan={cols.length+1}
                  style={{padding:32,textAlign:"center",color:"var(--sub)",fontSize:13}}>
                  Keine Spieler gefunden
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getNr(id){
  try{
    const s=localStorage.getItem("rueckennrn");
    if(s){const d=JSON.parse(s);if(d[id]) return d[id];}
  }catch{}
  return "";
}

export default KaderModul;
