/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/TeamModuleMatrix.jsx
   Team-Modul-Matrix Komponente
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Btn, Card, Chip, useIsMobile, InfoBox, Col, Row, Stat} from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { GN, BL, GB, BK, FONT} from "../../constants.ts";

function maxStufe(a, b){
  if(!a) return b; if(!b) return a;
  return STUFE_RANG[a]>STUFE_RANG[b]?a:b;
}
function TeamModuleMatrix({supabase,setSaveMsg}){
  const sb=supabase||window.__sb;
  const [teams,setTeams]=useState([]);
  const [moduleMap,setModuleMap]=useState({}); // {team_id: [modul,...]}
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [filterHaupt,setFilterHaupt]=useState("alle");
  const [expandedTeam,setExpandedTeam]=useState(null);
  const isMob=useIsMobile();

  const TEAM_MODS=[
    {key:"roster",            label:"Kader",       icon:"users"},
    {key:"training",          label:"Training",    icon:"clock"},
    {key:"spielplan",         label:"Spielplan",   icon:"flag"},
    {key:"events",            label:"Termine",     icon:"calendar"},
    {key:"attendance_central",label:"Anwesenheit", icon:"chart-bar"},
    {key:"helpers",           label:"Helfer",      icon:"heart-handshake"},
    {key:"polls",             label:"Abstimmungen",icon:"speakerphone"},
    {key:"stats",             label:"Statistik",   icon:"chart-line"},
    {key:"media",             label:"Medien",      icon:"photo"},
    {key:"news",              label:"News",        icon:"news"},
    {key:"wiki",              label:"Wiki",        icon:"book"},
    {key:"docs",              label:"Dokumente",   icon:"file-text"},
  ];

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        if(sb){
          const[tR,tmR]=await Promise.all([
            sb.from("teams").select("id,name,hauptbereich,kurzname").eq("aktiv",true).order("hauptbereich").order("name"),
            sb.from("team_module").select("team_id,modul,aktiv"),
          ]);
          if(tR.data) setTeams(tR.data);
          if(tmR.data){
            const m={};
            tmR.data.forEach(r=>{
              if(!m[r.team_id]) m[r.team_id]=[];
              if(r.aktiv!==false) m[r.team_id].push(r.modul);
            });
            setModuleMap(m);
          }
        }
      }catch(e){ console.warn("[FCH] TeamModuleMatrix:", e.message); }
      setLoading(false);
    })();
  },[]);

  async function toggleTeamModul(teamId, modul, forceAktiv=null){
    const cur=moduleMap[teamId]||TEAM_MODS.map(m=>m.key);
    const isOn=cur.includes(modul);
    const nextOn=forceAktiv!==null?forceAktiv:!isOn;
    const neu={...moduleMap,[teamId]:nextOn?[...new Set([...cur,modul])]:cur.filter(m=>m!==modul)};
    setModuleMap(neu);
    if(sb){
      await sb.from("team_module").upsert({team_id:teamId,modul,aktiv:nextOn},{onConflict:"team_id,modul"});
    }
  }

  async function applyToAll(modul, aktiv){
    if(!sb) return;
    setSaving(true);
    const rows=teams.map(t=>({team_id:t.id,modul,aktiv}));
    await sb.from("team_module").upsert(rows,{onConflict:"team_id,modul"});
    const neu={...moduleMap};
    teams.forEach(t=>{
      const cur=neu[t.id]||TEAM_MODS.map(m=>m.key);
      neu[t.id]=aktiv?[...new Set([...cur,modul])]:cur.filter(m=>m!==modul);
    });
    setModuleMap(neu);
    setSaving(false);
    setSaveMsg(`${TEAM_MODS.find(m=>m.key===modul)?.label||modul} für alle Teams ${aktiv?"aktiviert":"deaktiviert"}`);
    setTimeout(()=>setSaveMsg(""),2000);
  }

  if(loading) return <div style={{padding:20,color:"var(--sub)",fontSize:14}}>Lade Team-Module…</div>;

  const hauptbereiche=["alle",...[...new Set(teams.map(t=>t.hauptbereich).filter(Boolean))]];
  const filtered=filterHaupt==="alle"?teams:teams.filter(t=>t.hauptbereich===filterHaupt);
  const HB_COLORS={"Aktivfussball":"#3B82F6","Juniorenfussball":"#22C55E","Mädchenfussball":"#EC4899","Senioren":"#F97316","Freizeitfussball":"#8B5CF6"};

  /* ── Filter-Chips (beide Views) ── */
  const FilterChips=()=>(
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {hauptbereiche.map(h=>{
        const col=HB_COLORS[h]||BK;
        const isActive=filterHaupt===h;
        return(
          <button key={h} onClick={()=>setFilterHaupt(h)} style={{
            padding:"5px 14px",borderRadius:20,fontFamily:FONT,fontSize:12,cursor:"pointer",
            fontWeight:isActive?700:400,border:`1.5px solid ${isActive?col:"var(--border)"}`,
            background:isActive?col+"15":"transparent",color:isActive?col:"var(--sub)"
          }}>{h==="alle"?"Alle":h}</button>
        );
      })}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16}}>
        <InfoBox text="Klick auf ein Icon aktiviert/deaktiviert das Modul pro Team. Spalten-Buttons setzen ein Modul für alle gefilterten Teams." color={BL}/>
        {saving&&<span style={{fontSize:12,color:"var(--sub)"}}>Speichert…</span>}
      </div>
      <FilterChips/>

      {isMob?(
        /* ── MOBILE: ausklappbare Teams ── */
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(t=>{
            const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
            const isOpen=expandedTeam===t.id;
            const activeCount=TEAM_MODS.filter(m=>aktive.includes(m.key)).length;
            const col=HB_COLORS[t.hauptbereich]||"var(--border)";
            return(
              <div key={t.id} style={{borderRadius:10,border:`1px solid ${isOpen?col:"var(--border)"}`,overflow:"hidden",background:"var(--surface)"}}>
                {/* Header */}
                <div onClick={()=>setExpandedTeam(isOpen?null:t.id)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{width:4,alignSelf:"stretch",background:col,borderRadius:2,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{t.name}</div>
                    <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>
                      {activeCount} / {TEAM_MODS.length} Module aktiv
                    </div>
                  </div>
                  <TI n={isOpen?"chevron-up":"chevron-down"} size={16} style={{color:"var(--sub)",flexShrink:0}}/>
                </div>
                {/* Module Toggles */}
                {isOpen&&(
                  <div style={{borderTop:"0.5px solid var(--border)",padding:"12px 14px",
                    display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {TEAM_MODS.map(m=>{
                      const isOn=aktive.includes(m.key);
                      return(
                        <div key={m.key} onClick={()=>toggleTeamModul(t.id,m.key)}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                            borderRadius:8,border:`1px solid ${isOn?GN:"var(--border)"}`,
                            background:isOn?GN+"10":"var(--surface2)",cursor:"pointer"}}>
                          <TI n={m.icon||"circle"} size={15} style={{color:isOn?GN:"var(--sub)",flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:isOn?600:400,color:isOn?"var(--text)":"var(--sub)",flex:1}}>{m.label}</span>
                          {isOn&&<TI n="check" size={12} style={{color:GN,flexShrink:0}}/>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ):(
        /* ── DESKTOP: Tabelle ── */
        <Card style={{padding:0,overflowX:"auto"}}>
          <table className="cc-table">
            <thead>
              <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                <th className="cc-th">
                  Team <span style={{fontWeight:400,opacity:0.6}}>({filtered.length})</span>
                </th>
                {TEAM_MODS.map(m=>(
                  <th key={m.key} style={{padding:"8px 4px",textAlign:"center",minWidth:54}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <TI n={m.icon||"circle"} size={15} style={{color:"var(--sub)"}}/>
                      <span style={{fontSize:9,color:"var(--sub)",fontWeight:400,textTransform:"uppercase",letterSpacing:0.3}}>{m.label}</span>
                      <div style={{display:"flex",gap:2}}>
                        <button onClick={()=>applyToAll(m.key,true)} title={`Alle: ${m.label} ein`}
                          style={{width:16,height:16,borderRadius:3,border:"1px solid "+GN,background:GN+"20",color:GN,cursor:"pointer",fontFamily:FONT,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</button>
                        <button onClick={()=>applyToAll(m.key,false)} title={`Alle: ${m.label} aus`}
                          style={{width:16,height:16,borderRadius:3,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--sub)",cursor:"pointer",fontFamily:FONT,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✗</button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(()=>{
                const rows=[];
                let lastHB=null;
                filtered.forEach((t,i)=>{
                  if(filterHaupt==="alle"&&t.hauptbereich!==lastHB){
                    lastHB=t.hauptbereich;
                    const col=HB_COLORS[t.hauptbereich]||"var(--sub)";
                    rows.push(
                      <tr key={`hb-${t.hauptbereich}`}>
                        <td colSpan={TEAM_MODS.length+1} style={{padding:"6px 16px 4px",fontSize:10,fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:i>0?"1px solid var(--border)":"none"}}>
                          {t.hauptbereich||"Weitere"}
                        </td>
                      </tr>
                    );
                  }
                  const aktive=moduleMap[t.id]||TEAM_MODS.map(m=>m.key);
                  const allAktiv=TEAM_MODS.every(m=>aktive.includes(m.key));
                  rows.push(
                    <tr key={t.id} style={{borderTop:"0.5px solid var(--border)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"8px 16px",fontWeight:500,color:"var(--text)",position:"sticky",left:0,background:"var(--surface)",fontSize:14,zIndex:1}}>
                        <Row>
                          <div style={{width:3,height:20,borderRadius:2,background:HB_COLORS[t.hauptbereich]||"var(--border)",flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                            {t.kurzname&&t.kurzname!==t.name&&<div style={{fontSize:10,color:"var(--sub)"}}>{t.kurzname}</div>}
                          </div>
                          <div onClick={()=>TEAM_MODS.forEach(m=>toggleTeamModul(t.id,m.key,!allAktiv))}
                            title={allAktiv?"Alle deaktivieren":"Alle aktivieren"}
                            style={{width:20,height:20,borderRadius:5,border:`1.5px solid ${allAktiv?GN:"var(--border)"}`,background:allAktiv?GN+"20":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {allAktiv&&<TI n="check" size={11} style={{color:GN}}/>}
                          </div>
                        </Row>
                      </td>
                      {TEAM_MODS.map(m=>{
                        const isOn=aktive.includes(m.key);
                        return(
                          <td key={m.key} style={{textAlign:"center",padding:"6px 4px"}}>
                            <div onClick={()=>toggleTeamModul(t.id,m.key)}
                              title={`${t.name}: ${m.label} ${isOn?"deaktivieren":"aktivieren"}`}
                              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.15)"}
                              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                              style={{width:28,height:28,borderRadius:7,margin:"0 auto",cursor:"pointer",background:isOn?GN+"20":"transparent",border:`1.5px solid ${isOn?GN:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}>
                              {isOn?<TI n="check" size={13} style={{color:GN}}/>:<span style={{color:"var(--border)",fontSize:12}}>–</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
                return rows;
              })()}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}


export { TeamModuleMatrix };
