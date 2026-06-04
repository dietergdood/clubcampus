/* ═══════════════════════════════════════════════════════════════
   ClubCampus KaderModul — KaderModul.jsx
   Team-Kader Ansicht mit Spielerliste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, ACCENT20, GN, R, BL, BK, GB } from "./constants";
import { TI } from "./icons.jsx";
import { useIsMobile, InfoBox, Card, Chip, Stat, Av } from "./theme.jsx";
import { ROSTER } from "./demoData.js";

/* ── Hilfskonstanten ── */
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};

function KaderModul({role,team,initialSelected=null,teamRosterData=null}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const [search,setSearch]=useState("");
  /* teamRosterData aus DB wenn vorhanden, sonst ROSTER Fallback */
  const baseRoster=teamRosterData||(team?ROSTER.filter(p=>(p.teams||[]).includes(team)):ROSTER);
  const initPlayer=typeof initialSelected==="number"?baseRoster.find(p=>p.id===initialSelected)||null:initialSelected;
  const [selected,setSelected]=useState(initPlayer);
  const [positions,setPositions]=useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.pos])));
  const [rueckennrn,setRueckennrn]=useState(()=>Object.fromEntries(baseRoster.map(p=>[p.id,p.rueckennr||""])));
  const [editingPos,setEditingPos]=useState(null);
  const [editingNr,setEditingNr]=useState(null);

  /* Load persisted numbers on mount */
  const [nrLoaded,setNrLoaded]=useState(false);
  if(!nrLoaded){
    setNrLoaded(true);
    (async()=>{
      try{
        const res=await window.storage.get("rueckennrn");
        if(res){
          const d=JSON.parse(res.value);
          Object.assign(NR_CACHE.data,d);
          setRueckennrn(prev=>({...prev,...d}));
        }
      }catch(e){}
    })();
  }

  const saveNr=(newNrn)=>{
    setRueckennrn(newNrn);
    Object.assign(NR_CACHE.data,newNrn);
    window.storage.set("rueckennrn",JSON.stringify(newNrn)).catch(()=>{});
  };
  const canEditPos=role==="trainer"||role==="administrator"||role==="administration";
  const POSITION_GROUPS=[
    {label:"Torwart",     options:["TW"]},
    {label:"Verteidiger", options:["V","IV","RV","LV"]},
    {label:"Mittelfeld",  options:["MF","DM","ZM","LM","RM"]},
    {label:"Sturm",       options:["ST"]},
  ];
  /* Filter by search */
  const teamRoster=baseRoster;
  const filtered=teamRoster.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  /* Sorting */
  const [sortKey,setSortKey]=useState("name");
  const [sortDir,setSortDir]=useState(1); /* 1=asc, -1=desc */
  const [groupByFunktion,setGroupByFunktion]=useState(true);
  const [showExport,setShowExport]=useState(false);
  const EXPORT_ROLES=["trainer","funktionaer","vorstand","administration","administrator"];
  const canExport=EXPORT_ROLES.includes(role);
  const [exportFields,setExportFields]=useState(["name","role","pos","nr"]);

  const handleSort=(key)=>{
    if(sortKey===key) setSortDir(d=>d*-1);
    else{setSortKey(key);setSortDir(1);}
  };

  const f=[...filtered].sort((a,b)=>{
    let va,vb;
    if(sortKey==="name"){
      va=String((a.lastName||"")+(a.firstName||"")||a.name||"");
      vb=String((b.lastName||"")+(b.firstName||"")||b.name||"");
      return String(va||'').localeCompare(String(vb||''))*sortDir;
    }
    if(sortKey==="pos"){
      va=positions[a.id]||""; vb=positions[b.id]||"";
      return String(va||'').localeCompare(String(vb||''))*sortDir;
    }
    if(sortKey==="nr"){
      va=rueckennrn[a.id]?parseInt(rueckennrn[a.id]):9999;
      vb=rueckennrn[b.id]?parseInt(rueckennrn[b.id]):9999;
      return (va-vb)*sortDir;
    }
    return 0;
  });

  /* Gruppierung nach Funktion */
  const FUNKTION_ORDER=["Trainer/in","Co-Trainer/in","Assistent/in","Goalietrainer/in","Masseur/in","Admin","TW","V","IV","RV","LV","DM","ZM","MF","LM","RM","ST"];
  const normFunktion=(s)=>{
    if(!s) return "-";
    const l=s.toLowerCase();
    if(l.includes("goalietrain")||l.includes("goalitrain")) return "Goalietrainer/in";
    if(l.includes("co-train")||l.includes("co train")||l.includes("cotrainer")) return "Co-Trainer/in";
    if(l.includes("assistent")||l.includes("assistenz")) return "Assistent/in";
    if(l.includes("masseur")||l.includes("physiother")) return "Masseur/in";
    if(l.includes("admin")||l.includes("sekretär")||l.includes("aktuarin")) return "Admin";
    if(l.includes("train")) return "Trainer/in";
    return s;
  };
  const getFunktionLabel=(p)=>normFunktion(p.role||positions[p.id])||"-";
  const grouped=groupByFunktion
    ?Object.entries(f.reduce((acc,p)=>{
        const key=getFunktionLabel(p)||"Spieler";
        if(!acc[key]) acc[key]=[];
        acc[key].push(p);
        return acc;
      },{}))
      .sort(([a],[b])=>{
        const ia=FUNKTION_ORDER.indexOf(a); const ib=FUNKTION_ORDER.indexOf(b);
        if(ia>=0&&ib>=0) return ia-ib;
        if(ia>=0) return -1; if(ib>=0) return 1;
        return String(a||"").localeCompare(String(b||""));
      })
      .map(([key,items])=>({key,items}))
    :[{key:null,items:f}];

  const SortIcon=({col})=>{
    if(sortKey!==col) return <span style={{color:"var(--sub)",fontSize:13,marginLeft:3}}>{"↕"}</span>;
    return <span style={{color:R,fontSize:13,marginLeft:3}}>{sortDir===1?<TI n="upload"/>:"↓"}</span>;
  };

  const COL_DEF_ALL=[
    {key:"name",    label:"Name / Vorname", always:true},
    {key:"role",    label:"Funktion",       always:true},
    {key:"pos",     label:"Position",       always:true},
    {key:"nr",      label:"Nr.",            always:true},
    {key:"dob",     label:"Geburtsdatum",   field:"dob"},
    {key:"email",   label:"E-Mail",         field:"email"},
    {key:"tel",     label:"Telefon",        field:"tel"},
    {key:"pass",    label:"Spielerpass",    field:"pass"},
    {key:"js",      label:"J+S Nr.",        field:"js"},
    {key:"ahv",     label:"AHV-Nummer",     field:"ahv"},
    {key:"fairgate",label:"Fairgate-ID",    field:"fairgate"},
  ];
  const SIMPLE_ROLES=["trainer","spieler","eltern"];
  const isSimpleView=SIMPLE_ROLES.includes(role);
  const COL_DEF=isSimpleView
    ?COL_DEF_ALL.filter(c=>["name","role","pos","nr"].includes(c.key))
    :COL_DEF_ALL;
  const cols=COL_DEF.filter(c=>c.always||vis.includes(c.field));

  return(
    <div>
      {selected&&<MitgliedDetail person={selected} role={role} onClose={()=>setSelected(null)} nr={rueckennrn[selected.id]} onUpdateNr={v=>saveNr({...rueckennrn,[selected.id]:v})}/>}
      {/* Export Modal */}
      {showExport&&(
        <div onClick={()=>setShowExport(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:16,padding:24,width:340,maxWidth:"90vw",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Kaderliste exportieren</div>
            <div style={{fontSize:13,color:"var(--sub)",marginBottom:16}}>Felder auswählen die exportiert werden sollen</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {COL_DEF_ALL.map(c=>(
                <label key={c.key} style={{display:"flex",alignItems:"center",gap:12,padding:"6px 10px",borderRadius:8,background:"var(--surface2)",cursor:"pointer"}}>
                  <input type="checkbox" checked={exportFields.includes(c.key)}
                    onChange={e=>setExportFields(prev=>e.target.checked?[...prev,c.key]:prev.filter(k=>k!==c.key))}
                    style={{width:16,height:16,accentColor:BK,cursor:"pointer"}}/>
                  <span style={{fontSize:13,color:"var(--text)"}}>{c.label}</span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                const fields=COL_DEF_ALL.filter(c=>exportFields.includes(c.key));
                const header=fields.map(c=>c.label).join(";");
                const rows=f.map(p=>{
                  return fields.map(c=>{
                    if(c.key==="name") return `${p.lastName||""} ${p.firstName||""}`.trim()||p.name||"";
                    if(c.key==="role") return p.role||"Spieler/in";
                    if(c.key==="pos") return positions[p.id]||"";
                    if(c.key==="nr") return rueckennrn[p.id]||"";
                    return p[c.field]||p[c.key]||"";
                  }).join(";");
                }).join("\n");
                const csv=`${header}\n${rows}`;
                const a=document.createElement("a");
                a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
                a.download=`Kader_${team||"Export"}_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                setShowExport(false);
              }} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                CSV herunterladen
              </button>
              <button onClick={()=>setShowExport(false)} style={{padding:"9px 16px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",fontSize:13,cursor:"pointer",fontFamily:FONT,color:"var(--sub)"}}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen…" style={{padding:"7px 12px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:13,outline:"none",width:200}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {canExport&&(
              <button onClick={()=>setShowExport(true)} style={{
                display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,
                border:"1px solid var(--border)",background:"transparent",
                color:"var(--sub)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT
              }}>
                <TI n="file-download" size={15} style={{color:GN}}/>Export
              </button>
            )}
          <button onClick={()=>setGroupByFunktion(g=>!g)} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,
            border:`1px solid ${groupByFunktion?BK:"var(--border)"}`,
            background:groupByFunktion?BK+"15":"transparent",
            color:groupByFunktion?BK:"var(--sub)",fontSize:13,fontWeight:600,
            cursor:"pointer",fontFamily:FONT
          }}>
            <TI n="layout-list" size={13}/>Gruppieren
          </button>
          <InfoBox text={`${f.length} Mitglieder`} color={BL}/>
        </div>
      </div>
      {isMobile?(
        <Card style={{padding:0}}>
          {groupByFunktion
            ? grouped.flatMap(({key,items})=>[
                key&&<div key={`grp-${key}`} style={{
                  padding:"8px 16px 5px",
                  fontSize:11,fontWeight:700,color:"var(--sub)",
                  textTransform:"uppercase",letterSpacing:0.6,
                  background:"var(--surface2)",
                  borderTop:"0.5px solid var(--border)"
                }}>{key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span></div>,
                ...items.map((p,i)=>(
                  <div key={p.id} onClick={()=>setSelected(p)}
                    style={{display:"flex",alignItems:"center",gap:16,padding:"14px 16px",borderTop:`0.5px solid ${GB}`,cursor:"pointer",background:"var(--surface)"}}
                    className="hov-row">
                    <Av name={p.name} size={32} bg={ACCENT20}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{p.lastName} {p.firstName}</div>
                      <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        {positions[p.id]&&<span style={{background:"var(--surface2)",color:"var(--sub)",padding:"2px 8px",borderRadius:20}}>{positions[p.id]}</span>}
                        {rueckennrn[p.id]&&<span style={{color:"var(--sub)"}}>Nr. {rueckennrn[p.id]}</span>}
                      </div>
                    </div>
                    <span style={{color:"var(--sub)",fontSize:18}}>›</span>
                  </div>
                ))
              ]).filter(Boolean)
            : filtered.map((p,i)=>(
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{display:"flex",alignItems:"center",gap:16,padding:"16px",borderTop:i>0?`0.5px solid ${GB}`:"none",cursor:"pointer",background:"var(--surface)"}}
                  className="hov-row">
                  <Av name={p.name} size={32} bg={ACCENT20}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{p.lastName} {p.firstName}</div>
                    <div style={{fontSize:13,color:"var(--sub)",marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      {positions[p.id]&&<span style={{background:"var(--surface2)",color:"var(--sub)",padding:"2px 9px",borderRadius:20}}>{positions[p.id]}</span>}
                      {rueckennrn[p.id]&&<span style={{color:"var(--sub)"}}>Nr. {rueckennrn[p.id]}</span>}
                      {p.role&&<span style={{background:"#7C3AED18",color:"#7C3AED",padding:"2px 9px",borderRadius:20}}>{p.role}</span>}
                    </div>
                  </div>
                  <span style={{color:"var(--sub)",fontSize:18}}>›</span>
                </div>
              ))
          }
        </Card>
      ):(
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:"var(--surface2)"}}>
              {cols.map((c,i)=>{
                const sortable=["name","pos","nr"].includes(c.key);
                return(
                  <th key={i}
                    onClick={sortable?()=>handleSort(c.key):undefined}
                    style={{padding:"9px 13px",textAlign:"left",fontWeight:sortable&&sortKey===c.key?800:600,color:"var(--sub)",fontSize:13,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap",cursor:sortable?"pointer":"default",userSelect:"none"}}>
                    {c.label}{sortable&&<SortIcon col={c.key}/>}
                  </th>
                );
              })}
              <th style={{padding:"9px 13px",width:32}}/>
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const spieler=f.filter(p=>!p.role);
              const trainer=f.filter(p=>p.role);
              const renderRow=(p,i,bg)=>(
              <tr
                key={p.id}
                onClick={()=>setSelected(p)}
                className="hov-row"
                style={{borderTop:"0.5px solid var(--border)",background:bg,cursor:"pointer"}}>
                {cols.map((c,j)=>{
                  if(c.key==="role") return(
                    <td key={j} style={{padding:"9px 13px"}}>
                      {p.role
                        ?<span style={{fontSize:11,background:"#7C3AED18",color:"#7C3AED",fontWeight:700,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap"}}>{p.role}</span>
                        :<span style={{fontSize:13,color:"var(--sub)"}}>Spieler/in</span>
                      }
                    </td>
                  );
                  if(c.key==="nr") return(
                    <td key={j} style={{padding:"9px 10px",width:44,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingNr===p.id?(
                        <input
                          autoFocus
                          type="number"
                          min="1" max="99"
                          value={rueckennrn[p.id]}
                          onChange={e=>saveNr({...rueckennrn,[p.id]:e.target.value})}
                          onBlur={()=>setEditingNr(null)}
                          onKeyDown={e=>{if(e.key==="Enter")setEditingNr(null);}}
                          style={{width:38,padding:"3px 5px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:700,textAlign:"center",color:R,outline:"none"}}
                        />
                      ):(
                        <div onClick={canEditPos?()=>setEditingNr(p.id):undefined}
                          title={canEditPos?"Rückennr. bearbeiten":undefined}
                          style={{cursor:canEditPos?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                          {rueckennrn[p.id]
                            ?<span style={{fontSize:13,fontWeight:600,color:"var(--sub)"}}>{rueckennrn[p.id]}</span>
                            :<span style={{fontSize:13,color:"var(--sub)"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:13,color:"var(--sub)"}}><TI n="edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="name") return(
                    <td key={j} style={{padding:"9px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av name={p.name} size={26} bg={ACCENT20}/>
                        <div>
                          <div style={{fontWeight:600,whiteSpace:"nowrap",color:"var(--sub)"}}>{p.lastName} {p.firstName}</div>
                          {p.role&&<span style={{fontSize:13,background:"#7C3AED18",color:"#7C3AED",fontWeight:700,padding:"1px 5px",borderRadius:8}}>{p.role}</span>}
                          {!p.role&&p.teams&&p.teams.length>1&&(
                            <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                              {p.teams.map((t,i)=><span key={i} style={{fontSize:13,background:i===0?R+"15":"#EFF6FF",color:i===0?R:BL,fontWeight:600,padding:"1px 5px",borderRadius:8}}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                  if(c.key==="pos") return(
                    <td key={j} style={{padding:"9px 13px"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingPos===p.id?(
                        <select
                          autoFocus
                          value={positions[p.id]||""}
                          onChange={e=>{setPositions(prev=>({...prev,[p.id]:e.target.value}));setEditingPos(null);}}
                          onBlur={()=>setEditingPos(null)}
                          style={{padding:"4px 10px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:600,color:R,background:"var(--surface)",cursor:"pointer",outline:"none"}}>
                          <option value="">- keine -</option>
                          {POSITION_GROUPS.map(g=>(
                            <optgroup key={g.label} label={g.label}>
                              {g.options.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      ):(
                        <div
                          onClick={canEditPos?()=>setEditingPos(p.id):undefined}
                          title={canEditPos?"Position bearbeiten":undefined}
                          style={{display:"inline-flex",alignItems:"center",gap:4,cursor:canEditPos?"pointer":"default"}}>
                          {positions[p.id]
                            ?<Chip text={positions[p.id]} color="#555" bg="#F3F4F6"/>
                            :<span style={{fontSize:13,color:"var(--sub)",fontStyle:"italic"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:13,color:"var(--sub)"}}><TI n="edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="ahv")     return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13}}>••••••••••</td>;
                  if(c.key==="address") return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13,whiteSpace:"nowrap"}}>{p.street}, {p.plz} {p.city}</td>;
                  if(c.key==="parent")  return <td key={j} style={{padding:"9px 13px",color:"var(--sub)",fontSize:13,whiteSpace:"nowrap"}}>{p.p1First} {p.p1Last}</td>;
                  return <td key={j} style={{padding:"9px 13px",color:c.field==="email"?BL:"#555",fontSize:13,whiteSpace:"nowrap"}}>{p[c.field]||"-"}</td>;
                })}
                <td style={{padding:"9px 13px",textAlign:"right",color:"var(--sub)",fontSize:13}}>›</td>
              </tr>
              );
              const ROLLE_ORDER=["Trainer","Assistent/in","Coach","Admin"];
              const trainerSorted=[...trainer].sort((a,b)=>{
                const ia=ROLLE_ORDER.indexOf(a.role||"");
                const ib=ROLLE_ORDER.indexOf(b.role||"");
                const ra=ia===-1?99:ia;
                const rb=ib===-1?99:ib;
                return ra!==rb?ra-rb:String(a.lastName||'').localeCompare(String(b.lastName||''));
              });
              return groupByFunktion
                ? grouped.flatMap(({key,items})=>[
                    key&&<tr key={`grp-${key}`}>
                      <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.6}}>
                          {key} <span style={{fontWeight:400,opacity:0.6}}>({items.length})</span>
                        </span>
                      </td>
                    </tr>,
                    ...items.map((p,i)=>renderRow(p,i,i%2===0?"var(--surface)":"var(--surface2)")),
                  ]).filter(Boolean)
                : [
                    trainer.length>0&&(
                      <tr key="trainer-divider">
                        <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Trainer &amp; Staff</span>
                        </td>
                      </tr>
                    ),
                    ...trainerSorted.map((p,i)=>renderRow(p,i,"#fafaf8")),
                    spieler.length>0&&(
                      <tr key="spieler-divider">
                        <td colSpan={cols.length+1} style={{padding:"6px 13px",background:"var(--surface2)",borderTop:"0.5px solid var(--border)"}}>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>Spieler</span>
                        </td>
                      </tr>
                    ),
                    ...spieler.map((p,i)=>renderRow(p,i,i%2===0?"var(--surface)":"var(--surface2)")),
                  ];
            })()}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}

/* -- TRAININGSPLAN STATE (localStorage) -- */
/* == TRAININGSPLAN DATA == */

/* TrainingsModul via ./TrainingsModul.jsx */

export default KaderModul;
