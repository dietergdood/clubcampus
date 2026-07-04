/* ═══════════════════════════════════════════════════════════════
   ClubCampus PortalverwaltungModul — PortalverwaltungModul.jsx
   Portalverwaltung: Module, Berechtigungen, Benutzer, Aussehen
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { ACCENT, ACCENT2, ACCENT20, AM, BK, BL, BTN_COLOR as BTN, BTN_TXT, FONT, GB, GN, GR, R, RL, STATUS_BG, STATUS_CLR } from "./constants.js";
import { TI } from "./icons.jsx";
import { Btn, Card, Chip, Col, H1, H2, InfoBox, Input, LOGO_B64, ModalOrSheet, ModalTitle, Row, STitle, SectionLabel, Select, Stat, Sub, Av, Tabs, Label, THEME_DEFAULT_STATIC, darkenHex, hexToRgba, useIsMobile , avColor} from "./theme.jsx";
import { FUNKTIONEN } from "./demoData.js";

/* ── Geteilte Konstanten ── */
const ROLES = {
  administrator: {
    label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings",
    desc:"Vollzugriff: alle Module, Systemeinstellungen, Benutzerverwaltung",
    level:7
  },
  administration: {
    label:"Administration", color:"var(--text)", bg:"#F5F5F5", icon:"briefcase",
    desc:"Vereinsbüro: Stammdaten, Mitglieder, alle Teams, Exporte — kein System",
    level:5
  },
  funktionaer: {
    label:"Funktionär", color:"var(--text)", bg:"#F5F5F5", icon:"heart-handshake",
    desc:"Module + Teams gemäss zugewiesener Gruppe/Funktion",
    level:4
  },
  trainer: {
    label:"Trainer", color:"var(--text)", bg:"#F5F5F5", icon:"ball-football",
    desc:"Eigene Teams: Kader, Trainings, Anwesenheiten",
    level:3
  },
  spieler: {
    label:"Spieler", color:"var(--text)", bg:"#F5F5F5", icon:"target",
    desc:"Eigenes Team lesen: Spielplan, Termine, Helfereinsätze",
    level:2
  },
  eltern: {
    label:"Eltern", color:"var(--text)", bg:"#F5F5F5", icon:"user",
    desc:"Nur eigene Kinder: Termine, Anwesenheit, Abstimmungen",
    level:1
  },
};
const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
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


function DesignTokensKonfigurator({isMobile, FONT, GN, R, RL, BL, AM}){


        /* ── Token State ── */
        const DEFAULTS={
          /* Border Radius */
          rBtn:8, rInput:8, rCard:12, rBadge:20, rModal:14, rSeg:8, rChip:20, rIconBtn:8,
          /* Heights */
          hBtn:32, hInput:36, hIconBtn:32,
          /* Padding */
          padBtnH:12, padBtnV:8, padInputH:12, padInputV:9, padCard:16,
          /* Gap */
          gapSm:8, gapMd:12, gapLg:16,
          /* Font sizes */
          fsXs:10, fsSm:11, fsBase:13, fsMd:14, fsLg:16, fsXl:21,
          /* Font weights */
          fwLabel:600, fwTitle:700, fwHeader:800,
          /* Transitions */
          tFast:100, tBase:150, tSlow:200,
          /* Shadows */
          shCard:1, shDrop:2, shModal:3,
          /* Borders */
          borderWidth:'0.5px',
          /* cc-specific */
          segPad:3, segItemPad:5, chipPad:4, chipPadH:12,
          toggleW:46, toggleH:26,
          /* Tabellen */
          thPadH:10, thPadV:8, thFontSize:11, thBorderW:2,
          tdPadH:10, tdPadV:8, tdFontSize:13,
          /* Multi-Select */
          msChipFontSize:11, msTriggerPad:8, msItemPad:8,
        };

        const SHADOW_MAP={
          0:'none',
          1:'0 1px 4px rgba(0,0,0,0.06)',
          2:'0 2px 12px rgba(0,0,0,0.08)',
          3:'0 4px 20px rgba(0,0,0,0.12)',
          4:'0 8px 40px rgba(0,0,0,0.18)'
        };

        const [tok, setTok] = useState(DEFAULTS);
        const [showExport, setShowExport] = useState(false);

        function set(key, val){ setTok(t=>({...t,[key]:val})); }

        function applyLive(){
          let s=document.getElementById('cc-token-overrides');
          if(!s){s=document.createElement('style');s.id='cc-token-overrides';document.head.appendChild(s);}
          s.textContent=generateCSS(tok);
        }

        function resetTokens(){ setTok(DEFAULTS); }

        function generateCSS(t){
          return `
.cc-icon-btn{width:${t.hIconBtn}px;height:${t.hIconBtn}px;border-radius:${t.rIconBtn}px;border:${t.borderWidth} solid var(--border);}
.cc-btn-group{border-radius:${t.rBtn}px;border:${t.borderWidth} solid var(--border);}
.cc-btn-group-item{height:${t.hBtn}px;}
.cc-input{border-radius:${t.rInput}px;padding:${t.padInputV}px ${t.padInputH}px;font-size:${t.fsBase}px;border:${t.borderWidth} solid var(--border);}
.cc-seg{border-radius:${t.rSeg}px;padding:${t.segPad}px;}
.cc-seg-item{padding:${t.segItemPad}px 8px;border-radius:${t.rSeg-2}px;font-size:${t.fsSm}px;transition:all ${t.tBase}ms;}
.cc-chip-toggle{border-radius:${t.rChip}px;padding:${t.chipPad}px ${t.chipPadH}px;font-size:${t.fsSm}px;border:1.5px solid var(--border);transition:all ${t.tBase}ms;}
.cc-card{box-shadow:${SHADOW_MAP[t.shCard]};}
.cc-toggle{width:${t.toggleW}px;height:${t.toggleH}px;border-radius:${Math.round(t.toggleH/2)}px;transition:background ${t.tSlow}ms;}
.cc-toggle-knob{width:${t.toggleH-6}px;height:${t.toggleH-6}px;transition:left ${t.tSlow}ms cubic-bezier(0.34,1.2,0.64,1);}
.cc-toggle-knob-on{left:${t.toggleW-t.toggleH+3}px;}
.cc-th{padding:${t.thPadV}px ${t.thPadH}px;font-size:${t.thFontSize}px;border-bottom:${t.thBorderW}px solid var(--cc-accent,#FFBF00);}
.cc-members-th{padding:${t.thPadV}px ${t.thPadH}px;font-size:${t.thFontSize}px;border-bottom:${t.thBorderW}px solid var(--cc-accent,#FFBF00);}
.cc-td{padding:${t.tdPadV}px ${t.tdPadH}px;font-size:${t.tdFontSize}px;}
.cc-members-td{padding:${t.tdPadV}px ${t.tdPadH}px;font-size:${t.tdFontSize}px;}
.cc-multiselect-trigger{padding:${t.msTriggerPad}px 12px;}
.cc-multiselect-chip{font-size:${t.msChipFontSize}px;}
.cc-multiselect-item{padding:${t.msItemPad}px 12px;}
          `.trim();
        }

        function exportCode(t){
          return `/* Design Tokens — generiert vom ClubCampus Konfigurator */
export const RADIUS = {
  btn:     ${t.rBtn},
  input:   ${t.rInput},
  card:    ${t.rCard},
  badge:   ${t.rBadge},
  modal:   ${t.rModal},
  seg:     ${t.rSeg},
  chip:    ${t.rChip},
  iconBtn: ${t.rIconBtn},
};
export const SIZE = {
  hBtn:    ${t.hBtn},
  hInput:  ${t.hInput},
  hIconBtn:${t.hIconBtn},
};
export const PADDING = {
  btnH:    ${t.padBtnH},
  btnV:    ${t.padBtnV},
  inputH:  ${t.padInputH},
  inputV:  ${t.padInputV},
  card:    ${t.padCard},
};
export const GAP = {
  sm: ${t.gapSm},
  md: ${t.gapMd},
  lg: ${t.gapLg},
};
export const FONT_SIZE = {
  xs:   ${t.fsXs},
  sm:   ${t.fsSm},
  base: ${t.fsBase},
  md:   ${t.fsMd},
  lg:   ${t.fsLg},
  xl:   ${t.fsXl},
};
export const FONT_WEIGHT = {
  label:  ${t.fwLabel},
  title:  ${t.fwTitle},
  header: ${t.fwHeader},
};
export const TRANSITION = {
  fast: ${t.tFast},
  base: ${t.tBase},
  slow: ${t.tSlow},
};
export const SHADOW = {
  card:  '${SHADOW_MAP[t.shCard]}',
  drop:  '${SHADOW_MAP[t.shDrop]}',
  modal: '${SHADOW_MAP[t.shModal]}',
};
export const BORDER = '${t.borderWidth}';
export const TABLE = {
  thPadH:    ${t.thPadH},
  thPadV:    ${t.thPadV},
  thFontSize:${t.thFontSize},
  thBorderW: ${t.thBorderW},
  tdPadH:    ${t.tdPadH},
  tdPadV:    ${t.tdPadV},
  tdFontSize:${t.tdFontSize},
};
export const MULTISELECT = {
  chipFontSize: ${t.msChipFontSize},
  triggerPad:   ${t.msTriggerPad},
  itemPad:      ${t.msItemPad},
};`;
        }

        /* ── Slider helper ── */
        const PREVIEWS={
          rBtn:      (v)=><button style={{borderRadius:v,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:'4px 12px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Button</button>,
          rInput:    (v)=><div style={{borderRadius:v,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:'4px 10px',fontSize:11,color:'var(--sub)'}}>Input</div>,
          rCard:     (v)=><div style={{borderRadius:v,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:'6px 10px',fontSize:11,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>Card</div>,
          rBadge:    (v)=><div style={{borderRadius:v,background:'var(--text)',color:'var(--bg)',padding:'2px 8px',fontSize:10,fontWeight:600,display:'inline-block'}}>Aktiv</div>,
          rModal:    (v)=><div style={{borderRadius:v,border:'0.5px solid var(--border)',background:'var(--surface)',padding:'5px 10px',fontSize:11,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>Modal</div>,
          rSeg:      (v)=><div style={{borderRadius:v,background:'var(--surface2)',padding:3,display:'flex',gap:2}}><div style={{borderRadius:Math.max(0,v-2),background:'var(--surface)',padding:'3px 8px',fontSize:10,fontWeight:600}}>Tab 1</div><div style={{padding:'3px 8px',fontSize:10,color:'var(--sub)'}}>Tab 2</div></div>,
          rIconBtn:  (v)=><button style={{borderRadius:v,border:'0.5px solid var(--border)',background:'var(--surface2)',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>⋮</button>,
          rChip:     (v)=><div style={{borderRadius:v,border:'1.5px solid var(--border)',padding:'2px 10px',fontSize:10,fontWeight:600,color:'var(--sub)',display:'inline-block'}}>Filter</div>,
          hBtn:      (v)=><button style={{height:v,padding:'0 12px',borderRadius:tok.rBtn,border:'none',background:'var(--text)',color:'var(--bg)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Btn</button>,
          hInput:    (v)=><div style={{height:v,borderRadius:tok.rInput,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:'0 10px',display:'flex',alignItems:'center',fontSize:11,color:'var(--sub)'}}>Input</div>,
          hIconBtn:  (v)=><button style={{width:v,height:v,borderRadius:tok.rIconBtn,border:'0.5px solid var(--border)',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12}}>⋮</button>,
          padBtnH:   (v)=><button style={{borderRadius:tok.rBtn,border:'none',background:'var(--text)',color:'var(--bg)',padding:`${tok.padBtnV}px ${v}px`,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Button</button>,
          padBtnV:   (v)=><button style={{borderRadius:tok.rBtn,border:'none',background:'var(--text)',color:'var(--bg)',padding:`${v}px ${tok.padBtnH}px`,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Button</button>,
          padInputH: (v)=><div style={{borderRadius:tok.rInput,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:`${tok.padInputV}px ${v}px`,fontSize:11,color:'var(--sub)'}}>Input</div>,
          padInputV: (v)=><div style={{borderRadius:tok.rInput,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:`${v}px ${tok.padInputH}px`,fontSize:11,color:'var(--sub)'}}>Input</div>,
          padCard:   (v)=><div style={{borderRadius:tok.rCard,border:'0.5px solid var(--border)',background:'var(--surface2)',padding:v,fontSize:11,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>Card</div>,
          fsXs:      (v)=><span style={{fontSize:v,color:'var(--sub)'}}>Micro Label</span>,
          fsSm:      (v)=><span style={{fontSize:v,color:'var(--sub)'}}>Badge · Meta · Chip</span>,
          fsBase:    (v)=><span style={{fontSize:v}}>Body — Haupttext</span>,
          fsMd:      (v)=><span style={{fontSize:v,fontWeight:600}}>Subtitel</span>,
          fsLg:      (v)=><span style={{fontSize:v,fontWeight:700}}>Section Titel</span>,
          fsXl:      (v)=><span style={{fontSize:v,fontWeight:800}}>Page Header</span>,
          fwLabel:   (v)=><span style={{fontWeight:v,fontSize:tok.fsBase}}>Label Wert</span>,
          fwTitle:   (v)=><span style={{fontWeight:v,fontSize:tok.fsBase}}>Überschrift</span>,
          fwHeader:  (v)=><span style={{fontWeight:v,fontSize:tok.fsLg}}>Page Header</span>,
          tFast:     (v)=><div style={{width:24,height:24,borderRadius:4,background:'var(--cc-accent,#FFBF00)',transition:`all ${v}ms`,cursor:'pointer'}} title={v+'ms'}/>,
          tBase:     (v)=><div style={{width:24,height:24,borderRadius:4,background:'var(--text)',transition:`all ${v}ms`,cursor:'pointer'}} title={v+'ms'}/>,
          tSlow:     (v)=><div style={{width:24,height:24,borderRadius:4,background:'var(--sub)',transition:`all ${v}ms`,cursor:'pointer'}} title={v+'ms'}/>,
          shCard:    (v)=><div style={{width:40,height:24,borderRadius:tok.rCard,background:'var(--surface)',boxShadow:['none','0 1px 4px rgba(0,0,0,0.06)','0 2px 12px rgba(0,0,0,0.08)','0 4px 20px rgba(0,0,0,0.12)','0 8px 40px rgba(0,0,0,0.18)'][v]}}/>,
          shDrop:    (v)=><div style={{width:40,height:24,borderRadius:6,background:'var(--surface)',boxShadow:['none','0 1px 4px rgba(0,0,0,0.06)','0 2px 12px rgba(0,0,0,0.08)','0 4px 20px rgba(0,0,0,0.12)','0 8px 40px rgba(0,0,0,0.18)'][v]}}/>,
          shModal:   (v)=><div style={{width:40,height:24,borderRadius:8,background:'var(--surface)',boxShadow:['none','0 1px 4px rgba(0,0,0,0.06)','0 2px 12px rgba(0,0,0,0.08)','0 4px 20px rgba(0,0,0,0.12)','0 8px 40px rgba(0,0,0,0.18)'][v]}}/>,
          toggleW:   (v)=><div style={{width:v,height:tok.toggleH,borderRadius:Math.round(tok.toggleH/2),background:'var(--border)',position:'relative'}}><div style={{position:'absolute',top:3,left:3,width:tok.toggleH-6,height:tok.toggleH-6,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/></div>,
          toggleH:   (v)=><div style={{width:tok.toggleW,height:v,borderRadius:Math.round(v/2),background:'var(--border)',position:'relative'}}><div style={{position:'absolute',top:3,left:3,width:v-6,height:v-6,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/></div>,
          segPad:    (v)=><div style={{background:'var(--surface2)',borderRadius:tok.rSeg,padding:v,display:'flex',gap:2}}><div style={{background:'var(--surface)',borderRadius:tok.rSeg-2,padding:'3px 8px',fontSize:10,fontWeight:600}}>An</div><div style={{padding:'3px 8px',fontSize:10,color:'var(--sub)'}}>Aus</div></div>,
          chipPad:   (v)=><div style={{borderRadius:tok.rChip,border:'1.5px solid var(--border)',padding:`${v}px ${tok.chipPadH}px`,fontSize:10,fontWeight:600,color:'var(--sub)'}}>Chip</div>,
          chipPadH:  (v)=><div style={{borderRadius:tok.rChip,border:'1.5px solid var(--border)',padding:`${tok.chipPad}px ${v}px`,fontSize:10,fontWeight:600,color:'var(--sub)'}}>Chip</div>,
          thPadH:    (v)=><table style={{borderCollapse:'collapse'}}><thead><tr><th style={{padding:`${tok.thPadV}px ${v}px`,background:'var(--surface2)',fontSize:tok.thFontSize,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',color:'var(--sub)',borderBottom:`${tok.thBorderW}px solid var(--cc-accent,#FFBF00)`}}>Spalte</th></tr></thead></table>,
          thPadV:    (v)=><table style={{borderCollapse:'collapse'}}><thead><tr><th style={{padding:`${v}px ${tok.thPadH}px`,background:'var(--surface2)',fontSize:tok.thFontSize,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',color:'var(--sub)',borderBottom:`${tok.thBorderW}px solid var(--cc-accent,#FFBF00)`}}>Spalte</th></tr></thead></table>,
          thFontSize:(v)=><table style={{borderCollapse:'collapse'}}><thead><tr><th style={{padding:`${tok.thPadV}px ${tok.thPadH}px`,background:'var(--surface2)',fontSize:v,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',color:'var(--sub)',borderBottom:`${tok.thBorderW}px solid var(--cc-accent,#FFBF00)`}}>Spalte</th></tr></thead></table>,
          thBorderW: (v)=><table style={{borderCollapse:'collapse'}}><thead><tr><th style={{padding:`${tok.thPadV}px ${tok.thPadH}px`,background:'var(--surface2)',fontSize:tok.thFontSize,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',color:'var(--sub)',borderBottom:`${v}px solid var(--cc-accent,#FFBF00)`}}>Spalte</th></tr></thead></table>,
          tdPadH:    (v)=><table style={{borderCollapse:'collapse'}}><tbody><tr><td style={{padding:`${tok.tdPadV}px ${v}px`,borderBottom:'0.5px solid var(--border)',fontSize:tok.tdFontSize}}>Zelle</td></tr></tbody></table>,
          tdPadV:    (v)=><table style={{borderCollapse:'collapse'}}><tbody><tr><td style={{padding:`${v}px ${tok.tdPadH}px`,borderBottom:'0.5px solid var(--border)',fontSize:tok.tdFontSize}}>Zelle</td></tr></tbody></table>,
          tdFontSize:(v)=><table style={{borderCollapse:'collapse'}}><tbody><tr><td style={{padding:`${tok.tdPadV}px ${tok.tdPadH}px`,borderBottom:'0.5px solid var(--border)',fontSize:v}}>Zelle</td></tr></tbody></table>,
          msChipFontSize:(v)=><span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,fontSize:v,fontWeight:500,background:'var(--surface)',border:'0.5px solid var(--border)'}}>Chip ×</span>,
          msTriggerPad:  (v)=><div style={{padding:`${v}px 12px`,border:'0.5px solid var(--border)',borderRadius:8,background:'var(--surface2)',fontSize:13,color:'var(--sub)',display:'flex',justifyContent:'space-between'}}>+ Funktion wählen <span>▾</span></div>,
          msItemPad:     (v)=><div style={{border:'0.5px solid var(--border)',borderRadius:8,overflow:'hidden'}}><div style={{padding:`${v}px 12px`,fontSize:13,display:'flex',alignItems:'center',gap:8}}><div style={{width:14,height:14,borderRadius:3,border:'0.5px solid var(--border)'}}/> Option</div></div>,
        };

        const Slider=({label, k, min, max, step=1, unit='px', hint})=>(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border)'}}>
            <div style={{width:110,flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{label}</div>
              {hint&&<div style={{fontSize:10,color:'var(--sub)'}}>{hint}</div>}
            </div>
            <input type="range" min={min} max={max} step={step} value={tok[k]}
              onChange={e=>set(k, step===1?parseInt(e.target.value):parseFloat(e.target.value))}
              style={{flex:1,accentColor:'var(--cc-accent, #FFBF00)',height:4}}/>
            <div style={{fontFamily:'monospace',fontSize:11,color:'var(--text)',minWidth:36,textAlign:'right',background:'var(--surface2)',padding:'2px 6px',borderRadius:4}}>
              {tok[k]}{unit}
            </div>
            <div style={{width:80,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'flex-start'}}>
              {PREVIEWS[k]?PREVIEWS[k](tok[k]):null}
            </div>
          </div>
        );

        const Select2=({label, k, options, hint})=>(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'0.5px solid var(--border)'}}>
            <div style={{width:120,flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{label}</div>
              {hint&&<div style={{fontSize:10,color:'var(--sub)'}}>{hint}</div>}
            </div>
            <select value={tok[k]} onChange={e=>set(k,e.target.value)}
              style={{flex:1,padding:'5px 8px',borderRadius:6,border:'0.5px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:12,fontFamily:FONT}}>
              {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        );

        const SectionHdr=({icon, title, color='var(--sub)'})=>(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0 4px',borderBottom:'2px solid var(--border)',marginBottom:4}}>
            <TI n={icon} size={15} style={{color}}/>
            <span style={{fontSize:14,fontWeight:800,color:'var(--text)',letterSpacing:-0.2}}>{title}</span>
          </div>
        );


  return(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 380px',gap:20,alignItems:'start'}}>

            {/* ── LEFT: Controls ── */}
            <div style={{display:'flex',flexDirection:'column',gap:20}}>

              {/* Border Radius */}
              <Card style={{padding:16}}>
                <SectionHdr icon="border-radius" title="Border Radius" color="#3B82F6"/>
                <Slider label="Button" k="rBtn" min={0} max={20} hint=".cc-icon-btn, Btn"/>
                <Slider label="Input / Select" k="rInput" min={0} max={20} hint=".cc-input"/>
                <Slider label="Card" k="rCard" min={0} max={24} step={2} hint=".cc-card, Card"/>
                <Slider label="Badge / Chip" k="rBadge" min={4} max={20} hint=".cc-chip-toggle"/>
                <Slider label="Modal" k="rModal" min={8} max={24} step={2} hint="ModalOrSheet"/>
                <Slider label="Segment-Tab" k="rSeg" min={4} max={16} hint=".cc-seg"/>
                <Slider label="Icon-Button" k="rIconBtn" min={4} max={16} hint=".cc-icon-btn"/>
              </Card>

              {/* Grössen */}
              <Card style={{padding:16}}>
                <SectionHdr icon="resize" title="Grössen & Abstände" color="#16A34A"/>
                <Slider label="Button Höhe" k="hBtn" min={26} max={44} hint=".cc-btn-group-item"/>
                <Slider label="Input Höhe" k="hInput" min={30} max={48} hint=".cc-input"/>
                <Slider label="Icon-Btn Grösse" k="hIconBtn" min={24} max={44} hint=".cc-icon-btn"/>
                <Slider label="Padding Btn H" k="padBtnH" min={8} max={24} hint="Btn horizontal"/>
                <Slider label="Padding Btn V" k="padBtnV" min={4} max={16} hint="Btn vertikal"/>
                <Slider label="Padding Input H" k="padInputH" min={8} max={20} hint=".cc-input"/>
                <Slider label="Padding Input V" k="padInputV" min={6} max={16} hint=".cc-input"/>
                <Slider label="Padding Card" k="padCard" min={10} max={28} hint=".cc-card, Card"/>
                <Slider label="Gap klein" k="gapSm" min={4} max={16} step={2} hint="Flex-Gap klein"/>
                <Slider label="Gap mittel" k="gapMd" min={8} max={24} step={2} hint="Flex-Gap mittel"/>
                <Slider label="Gap gross" k="gapLg" min={12} max={32} step={4} hint="Section-Gap"/>
              </Card>

              {/* Schrift */}
              <Card style={{padding:16}}>
                <SectionHdr icon="typography" title="Typografie" color="#7C3AED"/>
                <Slider label="XS (Micro)" k="fsXs" min={9} max={12} hint="Micro-Labels"/>
                <Slider label="SM (Badge)" k="fsSm" min={10} max={13} hint=".cc-chip-toggle, Badges"/>
                <Slider label="Base (Body)" k="fsBase" min={12} max={15} hint="Haupttext, .cc-input"/>
                <Slider label="MD (Subtitel)" k="fsMd" min={13} max={16} hint="Subtitel"/>
                <Slider label="LG (Section)" k="fsLg" min={14} max={20} hint="Section-Titel"/>
                <Slider label="XL (Header)" k="fsXl" min={16} max={28} hint="Page-Header"/>
                <Slider label="Weight Label" k="fwLabel" min={400} max={700} step={100} unit="" hint="Labels, Werte"/>
                <Slider label="Weight Titel" k="fwTitle" min={600} max={800} step={100} unit="" hint="Überschriften"/>
                <Slider label="Weight Header" k="fwHeader" min={700} max={900} step={100} unit="" hint="Page-Header"/>
              </Card>

              {/* Übergänge & Schatten */}
              <Card style={{padding:16}}>
                <SectionHdr icon="activity" title="Übergänge & Schatten" color="#F59E0B"/>
                <Slider label="Transition schnell" k="tFast" min={50} max={200} step={25} unit="ms" hint="Hover BG"/>
                <Slider label="Transition normal" k="tBase" min={100} max={300} step={25} unit="ms" hint="Standard"/>
                <Slider label="Transition langsam" k="tSlow" min={150} max={400} step={25} unit="ms" hint="Animationen"/>
                <Slider label="Schatten Card" k="shCard" min={0} max={4} hint={SHADOW_MAP[tok.shCard]}/>
                <Slider label="Schatten Dropdown" k="shDrop" min={0} max={4} hint={SHADOW_MAP[tok.shDrop]}/>
                <Slider label="Schatten Modal" k="shModal" min={0} max={4} hint={SHADOW_MAP[tok.shModal]}/>
                <Select2 label="Border-Stärke" k="borderWidth"
                  options={[{v:'0px',l:'Kein Border'},{v:'0.5px',l:'0.5px (Standard)'},{v:'1px',l:'1px'},{v:'1.5px',l:'1.5px'}]}
                  hint=".cc-input, .cc-icon-btn etc."/>
              </Card>

              {/* Toggle */}
              <Card style={{padding:16}}>
                <SectionHdr icon="toggle-left" title="Toggle" color="#EC4899"/>
                <Slider label="Breite" k="toggleW" min={36} max={60} hint=".cc-toggle"/>
                <Slider label="Höhe" k="toggleH" min={20} max={34} hint=".cc-toggle"/>
              </Card>

              {/* Segment */}
              <Card style={{padding:16}}>
                <SectionHdr icon="layout-navbar" title="Segment & Chips" color="#0891B2"/>
                <Slider label="Seg. Track Padding" k="segPad" min={2} max={8} hint=".cc-seg"/>
                <Slider label="Seg. Item Padding V" k="segItemPad" min={3} max={10} hint=".cc-seg-item"/>
                <Slider label="Chip Padding V" k="chipPad" min={2} max={8} hint=".cc-chip-toggle"/>
                <Slider label="Chip Padding H" k="chipPadH" min={8} max={20} hint=".cc-chip-toggle"/>
              </Card>

              {/* Tabellen */}
              <Card style={{padding:16}}>
                <SectionHdr icon="table" title="Tabellen" color="#0F766E"/>
                <Slider label="Header Padding H" k="thPadH" min={6} max={20} hint=".cc-th"/>
                <Slider label="Header Padding V" k="thPadV" min={4} max={14} hint=".cc-th"/>
                <Slider label="Header Schrift" k="thFontSize" min={9} max={13} hint=".cc-th"/>
                <Slider label="Header Border" k="thBorderW" min={1} max={4} hint=".cc-th border-bottom"/>
                <Slider label="Zelle Padding H" k="tdPadH" min={6} max={20} hint=".cc-td"/>
                <Slider label="Zelle Padding V" k="tdPadV" min={4} max={14} hint=".cc-td"/>
                <Slider label="Zelle Schrift" k="tdFontSize" min={11} max={15} hint=".cc-td"/>
              </Card>

              {/* Multi-Select */}
              <Card style={{padding:16}}>
                <SectionHdr icon="list-check" title="Multi-Select" color="#7C3AED"/>
                <Slider label="Chip Schriftgrösse" k="msChipFontSize" min={9} max={13} hint=".cc-multiselect-chip"/>
                <Slider label="Trigger Padding V" k="msTriggerPad" min={5} max={12} hint=".cc-multiselect-trigger"/>
                <Slider label="Item Padding V" k="msItemPad" min={5} max={14} hint=".cc-multiselect-item"/>
              </Card>

            </div>

            {/* ── RIGHT: Live Preview ── */}
            <div style={{position:'sticky',top:20,display:'flex',flexDirection:'column',gap:12}}>

              {/* Action Bar */}
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Btn variant="primary" onClick={applyLive}><TI n="eye" size={13}/>Live-Vorschau</Btn>
                <Btn onClick={()=>setShowExport(e=>!e)}><TI n="code" size={13}/>{showExport?'Code ausblenden':'Code exportieren'}</Btn>
                <Btn onClick={resetTokens}><TI n="refresh" size={13}/>Reset</Btn>
                <span style={{fontSize:11,color:'var(--sub)'}}>Werte in constants.js eintragen</span>
              </div>

              {/* Preview Cards */}
              <Card style={{padding:tok.padCard,borderRadius:tok.rCard,boxShadow:SHADOW_MAP[tok.shCard]}}>
                <div style={{fontSize:tok.fsLg,fontWeight:tok.fwTitle,marginBottom:4}}>Teamverwaltung</div>
                <div style={{fontSize:tok.fsSm,color:'var(--sub)',marginBottom:12}}>FC Herrliberg · Saison 2025/26</div>
                <div style={{display:'flex',gap:tok.gapSm,flexWrap:'wrap',marginBottom:12}}>
                  <span style={{fontSize:tok.fsSm,padding:`${tok.chipPad}px ${tok.chipPadH}px`,borderRadius:tok.rBadge,background:'var(--text)',color:'var(--bg)',fontWeight:tok.fwLabel}}>Aktiv</span>
                  <span style={{fontSize:tok.fsSm,padding:`${tok.chipPad}px ${tok.chipPadH}px`,borderRadius:tok.rBadge,border:`${tok.borderWidth} solid var(--border)`,color:'var(--sub)'}}>Archiv</span>
                  <span style={{fontSize:tok.fsSm,padding:`${tok.chipPad}px ${tok.chipPadH}px`,borderRadius:tok.rBadge,background:'#DCFCE7',color:'#166534',fontWeight:tok.fwLabel}}>Aktiv</span>
                </div>
                <div style={{display:'flex',gap:tok.gapSm}}>
                  <button style={{height:tok.hBtn,padding:`0 ${tok.padBtnH}px`,borderRadius:tok.rBtn,border:'none',background:'var(--text)',color:'var(--bg)',fontSize:tok.fsBase,fontWeight:tok.fwLabel,cursor:'pointer',fontFamily:FONT}}>Speichern</button>
                  <button style={{height:tok.hBtn,padding:`0 ${tok.padBtnH}px`,borderRadius:tok.rBtn,border:`${tok.borderWidth} solid var(--border)`,background:'transparent',color:'var(--text)',fontSize:tok.fsBase,cursor:'pointer',fontFamily:FONT}}>Abbrechen</button>
                  <button style={{width:tok.hIconBtn,height:tok.hIconBtn,borderRadius:tok.rIconBtn,border:`${tok.borderWidth} solid var(--border)`,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                    <TI n="dots-vertical" size={14} style={{color:'var(--sub)'}}/>
                  </button>
                </div>
              </Card>

              <Card style={{padding:tok.padCard,borderRadius:tok.rCard,boxShadow:SHADOW_MAP[tok.shCard]}}>
                <div style={{fontSize:tok.fsBase,fontWeight:tok.fwLabel,marginBottom:tok.gapSm}}>Formular</div>
                <div style={{marginBottom:tok.gapSm}}>
                  <div style={{fontSize:tok.fsSm,fontWeight:tok.fwLabel,color:'var(--sub)',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Teamname</div>
                  <div style={{padding:`${tok.padInputV}px ${tok.padInputH}px`,borderRadius:tok.rInput,border:`${tok.borderWidth} solid var(--border)`,background:'var(--surface2)',fontSize:tok.fsBase,color:'var(--sub)'}}>z.B. 1. Mannschaft</div>
                </div>
                <div style={{background:'var(--surface2)',borderRadius:tok.rSeg,padding:tok.segPad,display:'flex',gap:2,marginBottom:tok.gapSm}}>
                  {['Alle','Ungelesen','Gesendet'].map((t,i)=>(
                    <div key={i} style={{flex:1,padding:`${tok.segItemPad}px 8px`,borderRadius:tok.rSeg-2,background:i===0?'var(--surface)':'transparent',fontSize:tok.fsSm,fontWeight:i===0?tok.fwTitle:400,color:i===0?'var(--text)':'var(--sub)',textAlign:'center',cursor:'pointer'}}>{t}</div>
                  ))}
                </div>
                <div style={{display:'flex',gap:tok.gapSm,flexWrap:'wrap'}}>
                  {['Alle','Broadcast','Diskussion'].map((t,i)=>(
                    <div key={i} style={{padding:`${tok.chipPad}px ${tok.chipPadH}px`,borderRadius:tok.rChip,border:`${i===0?'2px':'1.5px'} solid ${i===0?'var(--text)':'var(--border)'}`,background:i===0?'var(--text)':'transparent',color:i===0?'var(--bg)':'var(--sub)',fontSize:tok.fsSm,fontWeight:tok.fwLabel,cursor:'pointer'}}>{t}</div>
                  ))}
                </div>
              </Card>

              <Card style={{padding:0,borderRadius:tok.rCard,overflow:'hidden',boxShadow:SHADOW_MAP[tok.shCard]}}>
                {[
                  {init:'LM',bg:'#E6F1FB',tc:'#0C447C',name:'Luca Meier',sub:'Stürmer'},
                  {init:'NK',bg:'#EEEDFE',tc:'#3C3489',name:'Noah Keller',sub:'Mittelfeld'},
                  {init:'SB',bg:'#FAEEDA',tc:'#633806',name:'Simon Baur',sub:'Torwart'},
                ].map((p,i,a)=>(
                  <div key={i} style={{padding:`${tok.padInputV}px ${tok.padCard}px`,display:'flex',alignItems:'center',gap:tok.gapSm,borderBottom:i<a.length-1?`${tok.borderWidth} solid var(--border)`:'none'}}>
                    <div style={{width:tok.hIconBtn,height:tok.hIconBtn,borderRadius:tok.rIconBtn,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:tok.fsXs+1,fontWeight:tok.fwTitle,color:p.tc,flexShrink:0}}>{p.init}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:tok.fsBase,fontWeight:tok.fwLabel}}>{p.name}</div>
                      <div style={{fontSize:tok.fsSm,color:'var(--sub)'}}>{p.sub}</div>
                    </div>
                    <div style={{fontSize:tok.fsXs,padding:`2px 8px`,borderRadius:tok.rBadge,background:'#DCFCE7',color:'#166534',fontWeight:tok.fwLabel}}>Aktiv</div>
                  </div>
                ))}
              </Card>

              {/* Toggle Preview */}
              <Card style={{padding:tok.padCard,borderRadius:tok.rCard}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:tok.fsBase,fontWeight:tok.fwLabel}}>Dark Mode</div>
                    <div style={{fontSize:tok.fsSm,color:'var(--sub)'}}>Farbschema des Portals</div>
                  </div>
                  <div style={{width:tok.toggleW,height:tok.toggleH,borderRadius:Math.round(tok.toggleH/2),background:'var(--border)',position:'relative',cursor:'pointer'}}>
                    <div style={{position:'absolute',top:3,left:3,width:tok.toggleH-6,height:tok.toggleH-6,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>
              </Card>

              {/* Export Code */}
              {showExport&&(
                <div style={{background:'#0f0f11',borderRadius:tok.rCard,padding:14,overflowX:'auto'}}>
                  <div style={{fontSize:10,color:'#86efac',fontFamily:'monospace',marginBottom:6}}>// constants.js</div>
                  <pre style={{fontSize:10,color:'#e2e8f0',fontFamily:'monospace',whiteSpace:'pre-wrap',lineHeight:1.6,margin:0}}>{exportCode(tok)}</pre>
                </div>
              )}

            </div>
          </div>

  );
}

function PortalverwaltungView(props){
  const {initialTab="module",moduleAktiv={},setModuleAktiv,moduleRechte,setModuleRechte,sb:supabase,appTheme,setAppTheme,applyThemeCss:applyTheme,vereinId,dbPortalRollen:externalRollen=[],onReloadRollen} = props;
  const [tab,setTab]=useState(initialTab);
  const [dbPortalRollen,setDbPortalRollen]=useState(externalRollen);
  const [rollenForm,setRollenForm]=useState({name:"",label:"",prioritaet:50});
  const [editRolle,setEditRolle]=useState(null);
  const [showRolleForm,setShowRolleForm]=useState(false);
  const [module,setModule]=useState([]);

  async function saveRolle(){
    if(!rollenForm.name.trim()||!rollenForm.label.trim()) return;
    const payload={name:rollenForm.name.trim(),label:rollenForm.label.trim(),prioritaet:parseInt(rollenForm.prioritaet)||50,aktiv:true};
    if(supabase){
      if(editRolle?.id){
        await supabase.from("portal_rollen").update(payload).eq("id",editRolle.id);
      } else {
        await supabase.from("portal_rollen").insert(payload);
      }
      const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
      if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
    }
    setShowRolleForm(false);setEditRolle(null);setRollenForm({name:"",label:"",prioritaet:50});
  }

  async function deleteRolle(id){
    if(!supabase||!window.confirm("Rolle wirklich löschen?")) return;
    await supabase.from("portal_rollen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("portal_rollen").select("*").eq("aktiv",true).order("prioritaet");
    if(data){setDbPortalRollen(data);if(onReloadRollen)onReloadRollen();}
  }
  const [moduleConfig,setModuleConfig]=useState({});
  const [moduleBerechtigungen,setModuleBerechtigungen]=useState({});
  const [felder,setFelder]=useState([]);
  const [apiVerbindungen,setApiVerbindungen]=useState([]);
  const [auditLogs,setAuditLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saveMsg,setSaveMsg]=useState("");
  const [expandedModul,setExpandedModul]=useState(null);
  const [benutzerListe,setBenutzerListe]=useState([]);
  /* Gruppen & Funktionen */
  const [gruppen,setGruppen]=useState([]);
  const [funktionen,setFunktionen]=useState([]);
  const [pvTeams,setPvTeams]=useState([]);
  const [gruppenTeams,setGruppenTeams]=useState([]);
  const [rollePflichtfelder,setRollePflichtfelder]=useState([]);
  const [mitgliedtypPflichtfelder,setMitgliedtypPflichtfelder]=useState([]);
  const [dbMitgliedtypen,setDbMitgliedtypen]=useState([]);
  const [showMitgliedtypForm,setShowMitgliedtypForm]=useState(false);
  const [editMitgliedtyp,setEditMitgliedtyp]=useState(null);
  const [mitgliedtypForm,setMitgliedtypForm]=useState({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""}); // portal_gruppen_teams
  const [selectedGruppe,setSelectedGruppe]=useState(null);
  const [showGruppeForm,setShowGruppeForm]=useState(false);
  const [showFunktionForm,setShowFunktionForm]=useState(false);
  const [editGruppe,setEditGruppe]=useState(null);
  const [editFunktion,setEditFunktion]=useState(null);
  const [gruppeForm,setGruppeForm]=useState({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{},teams:[]});
  const [funktionForm,setFunktionForm]=useState({name:"",beschreibung:"",gruppe_id:"",module_override:[],teams:[],filter:{},stufe_override:{}});
  /* Module & Rechte View-Toggle */
  const [moduleViewMode,setModuleViewMode]=useState("modul");
  const [moduleDirty,setModuleDirty]=useState(false);

  /* ── Aussehen / Theme ── */
  const theme=appTheme||THEME_DEFAULT_STATIC;
  const themeRef=useRef(theme);
  themeRef.current=theme;
  const setTheme=(updater)=>{
    const newTheme=typeof updater==="function"?updater(theme):updater;
    setAppTheme(newTheme);
  };
  const [themeDirty,setThemeDirty]=useState(false);

  function updateTheme(key,val){
    const updated={...themeRef.current,[key]:val};
    themeRef.current=updated;
    setAppTheme(updated);
    /* CSS sofort anwenden via applyThemeCss */
    if(applyTheme) applyTheme(updated);
    setThemeDirty(true);
  }
  function saveTheme(){
    try{
      /* CSS sofort anwenden */
      const r=document.documentElement.style;
      const td={...THEME_DEFAULT_STATIC,...themeRef.current};
      r.setProperty("--cc-accent",    td.vereinsfarbe1||"#FFBF00");
      r.setProperty("--cc-accent2",   td.vereinsfarbe2||"#000000");
      r.setProperty("--cc-hover",     hexToRgba(td.vereinsfarbe1||"#FFBF00",0.19));
      r.setProperty("--cc-accent-20", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.12));
      r.setProperty("--cc-accent-15", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.09));
      r.setProperty("--cc-accent-12", hexToRgba(td.vereinsfarbe1||"#FFBF00",0.07));
      r.setProperty("--nav",          td.navBg||"#000000");
      r.setProperty("--nav-t",        td.navText||"#FFFFFF");
      r.setProperty("--nav-a",        td.navAccent||"#FFBF00");
      r.setProperty("--nav-hover",    td.navHover||"#1A1A1A");
      r.setProperty("--btn-primary",  td.btnPrimary||"#FFBF00");
      r.setProperty("--btn-primary-text",td.btnPrimaryText||"#000000");
      r.setProperty("--btn-hover",    darkenHex(td.btnPrimary||"#FFBF00"));
      /* React State + localStorage */
      const themeToSave={...td};
      setAppTheme(themeToSave);
      if(applyTheme) applyTheme(themeToSave);
      try{localStorage.setItem("cc-theme",JSON.stringify(themeToSave));}catch{}
      /* Supabase → vereine.theme */
      if(supabase){
        const q = vereinId
          ? supabase.from("vereine").update({theme:themeToSave}).eq("id",vereinId)
          : supabase.from("vereine").update({theme:themeToSave});
        q.then(({error:e})=>{
            if(e) setSaveMsg("Fehler: "+e.message);
            else setSaveMsg("Theme gespeichert ✓");
            setTimeout(()=>setSaveMsg(""),2500);
          });
      } else {
        setSaveMsg("Lokal gespeichert");
        setTimeout(()=>setSaveMsg(""),2000);
      }
      setThemeDirty(false);
    }catch(err){
      console.error("[saveTheme]",err);
      setSaveMsg("Fehler: "+err.message);
      setTimeout(()=>setSaveMsg(""),4000);
    }
  }
  /* moduleAktiv + moduleRechte kommen als Props von App */

  const KATEGORIEN_NAV=[
    {
      key:"berechtigungen", label:"Berechtigungen", icon:"shield-lock", color:"#3B82F6", bg:"#EFF6FF",
      tabs:[
        {key:"module",     label:"Module & Rechte",     icon:"layout-grid"},
        {key:"gruppen",    label:"Gruppen & Funktionen", icon:"sitemap"},
        {key:"teammodule", label:"Team-Module",          icon:"ball-football"},
        {key:"feldvis",    label:"Feldsichtbarkeit",     icon:"eye"},
      ]
    },
    {
      key:"benutzer", label:"Benutzer & Rollen", icon:"users", color:"#16A34A", bg:"#ECFDF5",
      tabs:[
        {key:"users",       label:"Benutzer & Rollen",         icon:"users"},
        {key:"mitglieder_config", label:"Mitglieder-Konfiguration", icon:"id-badge"},
        {key:"rollen", label:"Portal-Rollen", icon:"shield"},
      ]
    },
    {
      key:"erscheinungsbild", label:"Erscheinungsbild", icon:"palette", color:"#F59E0B", bg:"#FFFBEB",
      tabs:[
        {key:"aussehen", label:"Aussehen", icon:"palette"},
        {key:"tokens",   label:"Design-Tokens", icon:"adjustments-horizontal"},
      ]
    },
    {
      key:"system", label:"System", icon:"settings", color:"#7C3AED", bg:"#F5F3FF",
      tabs:[
        {key:"api",   label:"API-Verbindungen", icon:"plug"},
        {key:"audit", label:"Audit-Logs",       icon:"clipboard-list"},
      ]
    },
    {
      key:"design", label:"Design-System", icon:"layout-2", color:"#EC4899", bg:"#FDF2F8",
      tabs:[
        {key:"designsystem", label:"CSS-Klassen", icon:"code"},
      ]
    },
  ];
  /* Aktive Kategorie aus Tab ableiten */
  const getKatForTab=(t)=>KATEGORIEN_NAV.find(k=>k.tabs.some(x=>x.key===t))||KATEGORIEN_NAV[0];
  const [aktiveKat, setAktiveKat]=useState(()=>getKatForTab(initialTab).key);
  const [mobileKachel, setMobileKachel]=useState(null); // null = Landingseite
  const isMobile=useIsMobile();

  const ROLLEN=["administrator","administration","funktionaer","trainer","spieler","eltern","supporter"];
  const ROLLEN_LABELS={administrator:"Admin",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Eltern",supporter:"Supporter"};
  const KATEGORIEN=["kern","sport","kommunikation","betrieb","verwaltung","admin"];
  const KAT_LABELS={kern:"Kern",sport:"Sport",kommunikation:"Kommunikation",betrieb:"Betrieb",verwaltung:"Verwaltung",admin:"Systemverwaltung"};

  const API_INFOS={
    fairgate:   {description:"Mitglieder, Gruppen, Stammdaten automatisch synchronisieren",felder:["Personen & Adressen","Kontaktdaten","Elternkontakte","Teams & Gruppen","Spielerpassdaten","J+S Nummern"]},
    football_ch:{description:"Spielpläne, Resultate und Ranglisten von Football.ch importieren",felder:["Spielplan","Resultate","Ranglisten","Teaminfos"]},
    fvrz:       {description:"Spielplan und Tabelle vom FVRZ (Fussballverband Region Zürich)",felder:["Spielplan","Tabelle","Resultate","Spielernummern"]},
    clubdesk:   {description:"Mitgliederdaten und Vereinsverwaltung aus ClubDesk synchronisieren",felder:["Mitglieder","Adressen","Mitgliedschaften","Beiträge"]},
    sfa:        {description:"Spielerdaten und Lizenzen von Swiss Football Association",felder:["Spielerlizenzen","Transferdaten","Sperren"]},
  };

  /* ── Alle Module als Fallback ── */
  const ALLE_MODULE=[
    {key:"dashboard",  label:"Dashboard",         icon:"layout-dashboard", kat:"kern",          pflicht:true},
    {key:"members",    label:"Mitglieder",         icon:"users",            kat:"verwaltung"},
    {key:"team",       label:"Teams",              icon:"ball-football",    kat:"sport"},
    {key:"training",   label:"Trainingsplan",      icon:"calendar",         kat:"sport"},
    {key:"schedule",   label:"Spielplan/FVRZ",     icon:"flag",             kat:"sport"},
    {key:"attendance_central",label:"Anwesenheitsstatistik",icon:"chart-bar",kat:"sport"},
    {key:"events",     label:"Termine",            icon:"calendar-event",   kat:"sport"},
    {key:"helpers",    label:"Helfereinsätze",     icon:"heart-handshake",  kat:"betrieb"},
    {key:"buses",      label:"Vereinsbusse",       icon:"bus",              kat:"betrieb"},
    {key:"material",   label:"Material",           icon:"package",          kat:"betrieb"},
    {key:"lockers",    label:"Garderoben",         icon:"door-exit",        kat:"betrieb"},
    {key:"media",      label:"Medien & Berichte",  icon:"speakerphone",     kat:"kommunikation"},
    {key:"news",       label:"News",               icon:"news",             kat:"kommunikation"},
    {key:"wiki",       label:"Wiki",               icon:"book",             kat:"kommunikation"},
    {key:"docs",       label:"Dokumente",          icon:"file-text",        kat:"kommunikation"},
    {key:"portal",     label:"Portalverwaltung",   icon:"settings",         kat:"admin",         pflicht:true},
  ];

  const ROLLEN_MODULE_DEFAULT={
    administrator:   ALLE_MODULE.map(m=>m.key),
    administration:  ["dashboard","members","team","training","schedule","attendance_central","events","helpers","buses","material","lockers","media","news","wiki","docs","portal"],
    funktionaer:     ["dashboard"],
    trainer:         ["dashboard","team","training","events","helpers","buses","material","lockers","news","wiki","docs"],
    spieler:         ["dashboard","team","events","helpers","docs","news"],
    eltern:          ["dashboard","team","events","helpers","docs","news"],
    supporter:       ["dashboard","events","helpers","news"],
  };

  /* Modul-Aktionen für Detail-Ansicht */
  const MODUL_AKTIONEN={
    dashboard:  [{label:"Übersicht ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"}],
    team:       [
      {label:"Team + Kader ansehen",          wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Position / Nummer ändern",      wer:["administrator","administration","trainer"],min:"schreiben",   spez:"Trainer: nur eigene Spieler"},
      {label:"Spieler hinzufügen / entfernen",wer:["administrator","administration"],         min:"verwalten"},
      {label:"Team erstellen / bearbeiten",   wer:["administrator","administration"],         min:"verwalten"},
      {label:"Trainer zuweisen",              wer:["administrator","administration"],         min:"verwalten"},
    ],
    members:    [
      {label:"Name, Tel, E-Mail sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Basis-Felder bearbeiten",           wer:["administrator","administration","trainer"],min:"schreiben",spez:"Trainer: nur eigene Spieler"},
      {label:"AHV, Bankdaten sehen",              wer:["administrator","administration"],         min:"verwalten"},
      {label:"Neue Mitglieder, Export, löschen",  wer:["administrator","administration"],         min:"verwalten"},
    ],
    training:   [
      {label:"Trainings ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Training absagen",               wer:["administrator","administration","trainer"],min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Training erstellen / bearbeiten",wer:["administrator","administration","trainer"],min:"verwalten",  spez:"Trainer: nur eigene Teams"},
      {label:"Vorlagen verwalten",             wer:["administrator","administration"],min:"verwalten"},
    ],
    schedule:   [
      {label:"Spielplan + Tabelle ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Daten ändern",               wer:[],                                              min:"verwalten",  note:"Nur via FVRZ-Sync"},
    ],
    attendance_central:[
      {label:"Eigene Statistik sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Anwesenheiten eintragen / ändern", wer:["administrator","administration","trainer"],min:"schreiben", spez:"Trainer: nur eigene Spieler"},
      {label:"Alle Teams auswerten, exportieren",wer:["administrator","administration"],         min:"verwalten"},
    ],
    events:     [
      {label:"Termine ansehen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                           wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinsanlass erstellen / bearbeiten",      wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsanlass absagen / löschen",           wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Event erstellen / bearbeiten",         wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Team-Event absagen / löschen",              wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Spiel-Termin bearbeiten (Treffpunkt etc.)", wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams", note:"Auto-generiert via Spielplan"},
    ],
    helpers:    [
      {label:"Einsätze ansehen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                   wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinseinsatz erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Einsatz erstellen / verwalten", wer:["administrator","trainer"],               min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Zuteilungen verwalten",              wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    buses:      [
      {label:"Fahrten + Belegung ansehen",   wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Platz reservieren / abmelden", wer:["administrator","administration","trainer","spieler"],min:"schreiben"},
      {label:"Fahrten erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    material:   [
      {label:"Inventar ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Ausleihe beantragen",           wer:["administrator","administration","trainer"], min:"schreiben"},
      {label:"Ausleihen genehmigen",          wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Inventar + Bestände verwalten", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    lockers:    [
      {label:"Eigene Zuteilung ansehen", wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Zuteilungen verwalten",    wer:["administrator","administration"],min:"verwalten"},
    ],
    news:       [
      {label:"Artikel lesen",                    wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Vereinsnews erstellen / bearbeiten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsnews publizieren / löschen", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    wiki:       [
      {label:"Artikel lesen",                      wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Artikel bearbeiten",                 wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Artikel erstellen, löschen, Kategorien",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    docs:       [
      {label:"Herunterladen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Hochladen, löschen",             wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Ordner / Kategorien verwalten",  wer:["administrator","administration"],             min:"verwalten"},
    ],
    media:      [
      {label:"Anschauen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Fotos hochladen",                     wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Team-Matchbericht schreiben",         wer:["administrator","trainer"],               min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Vereinsbericht schreiben",            wer:["administrator","administration","funktionaer"],min:"schreiben"},
      {label:"Publizieren, Alben verwalten",        wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    portal:     [{label:"Benutzer, Module, Berechtigungen",wer:["administrator","administration"],min:"verwalten"}],
  };

  /* Standard-Stufen pro Rolle (nur für Module mit Zugriff) */
  const ZUGRIFF_DEFAULT={
    administrator:  {_all:"verwalten"},
    administration: {
      _all:"verwalten",
      dashboard:"lesen",
    },
    funktionaer:    {_all:"lesen"},
    trainer:        {
      _all:"lesen",
      team:"verwalten",
      training:"verwalten",
      events:"verwalten",
      schedule:"lesen",            // Spielplan = nur anzeigen, Interaktion via Termine
      attendance_central:"schreiben",
      helpers:"verwalten",
      buses:"schreiben",
      material:"schreiben",
      media:"schreiben",
      wiki:"schreiben",
      members:"schreiben",
    },
    spieler:        {
      _all:"lesen",
      events:"schreiben",          // An-/Abmelden (inkl. auto-generierte Spiel-Termine)
      helpers:"schreiben",
      buses:"schreiben",
      schedule:"lesen",
    },
    eltern:         {
      _all:"lesen",
      events:"schreiben",
      helpers:"schreiben",
      schedule:"lesen",
    },
    supporter:      {
      _all:"lesen",
      helpers:"schreiben",
    },
  };

  const ZUGRIFF_LABELS={"lesen":"Lesen","schreiben":"Schreiben","verwalten":"Verwalten"};
  const ZUGRIFF_COLORS={"lesen":"#3B82F6","schreiben":"#F97316","verwalten":"#22C55E"};
  const ZUGRIFF_ICONS= {"lesen":"eye","schreiben":"edit","verwalten":"settings"};
  const ZUGRIFF_ORDER=["lesen","schreiben","verwalten"];

  /* Effektive Zugriffsstufe: custom oder Default */
  const [zugriffStufen,setZugriffStufen]=useState(()=>{
    try{const s=localStorage.getItem("fch-zugriff-stufen");return s?JSON.parse(s):null;}catch{return null;}
  });
  const effZugriff=zugriffStufen||ZUGRIFF_DEFAULT;

  function getZugriff(rolle,modulKey){
    if(!effRechte[rolle]?.includes(modulKey)) return null;
    return effZugriff[rolle]?.[modulKey]||effZugriff[rolle]?._all||"lesen";
  }

  function setZugriffStufe(rolle,modulKey,stufe){
    setZugriffStufen(prev=>{
      const base=prev||ZUGRIFF_DEFAULT;
      const neu={...base,[rolle]:{...(base[rolle]||{}),[modulKey]:stufe}};
      try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(neu));}catch{}
      return neu;
    });
  }

  function cycleZugriff(rolle,modulKey){
    const cur=getZugriff(rolle,modulKey)||"lesen";
    const idx=ZUGRIFF_ORDER.indexOf(cur);
    if(idx===ZUGRIFF_ORDER.length-1){
      /* Letzter Schritt: Zugriff entfernen + Stufe zurücksetzen */
      toggleModulRolle(modulKey,rolle);
      setZugriffStufen(prev=>{
        if(!prev) return prev;
        const neu={...prev};
        if(neu[rolle]){
          const r={...neu[rolle]};
          delete r[modulKey];
          neu[rolle]=r;
        }
        try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(neu));}catch{}
        return neu;
      });
    } else {
      const next=ZUGRIFF_ORDER[idx+1];
      setZugriffStufe(rolle,modulKey,next);
      setModuleDirty(true); setSaveMsg("Ungespeichert");
    }
  }

  useEffect(function(){
    (async function(){
      setLoading(true);
      try{
        if(supabase){
          const [apiR,audR,benuR,gruppenR,funktionenR,mcR,mrR,teamsR,gtR]=await Promise.all([
            supabase.from("api_verbindungen").select("*").order("sort_order"),
            supabase.from("api_sync_log").select("*,api_verbindungen(label)").order("gestartet_am",{ascending:false}).limit(50),
            supabase.from("benutzer").select("id,name,email,role").order("name"),
            supabase.from("portal_gruppen").select("*").order("name"),
            supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe,module,modul_stufen), stufe_override").order("name"),
            supabase.from("module_config").select("*"),
            supabase.from("modul_rechte").select("*"),
            supabase.from("teams").select("id,name,hauptbereich,kurzname").eq("aktiv",true).order("hauptbereich").order("name"),
            supabase.from("portal_gruppen_teams").select("*"),
          ]);
          if(apiR.data) setApiVerbindungen(apiR.data);
          if(audR.data) setAuditLogs(audR.data);
          if(benuR.data&&benuR.data.length>0){
            /* Funktionen separat laden */
            const{data:bfData}=await supabase.from("benutzer_funktionen")
              .select("benutzer_id, portal_funktionen(id,name,portal_gruppen(name,farbe))");
            const bfMap={};
            (bfData||[]).forEach(bf=>{
              if(!bfMap[bf.benutzer_id]) bfMap[bf.benutzer_id]=[];
              if(bf.portal_funktionen) bfMap[bf.benutzer_id].push(bf.portal_funktionen);
            });
            setBenutzerListe(benuR.data.map(b=>({...b,funktionen:bfMap[b.id]||[]})));
          } else if(benuR.error){
            console.warn("[FCH] benutzer laden:", benuR.error.message);
          }
          if(gruppenR.data) setGruppen(gruppenR.data);
          if(funktionenR.data) setFunktionen(funktionenR.data);
          if(teamsR.data) setPvTeams(teamsR.data);
          if(gtR.data) setGruppenTeams(gtR.data);
          // Pflichtfelder laden
          const [rpfR,mtpfR]=await Promise.all([
            supabase.from("rolle_pflichtfelder").select("*"),
            supabase.from("mitgliedtyp_pflichtfelder").select("*"),
          ]);
          if(rpfR.data) setRollePflichtfelder(rpfR.data);
          if(mtpfR.data) setMitgliedtypPflichtfelder(mtpfR.data);
          const{data:mtData}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
          if(mtData) setDbMitgliedtypen(mtData);
          /* module_config → moduleAktiv State */
          if(mcR.data&&mcR.data.length>0&&setModuleAktiv){
            const ma={};
            mcR.data.forEach(r=>{ma[r.modul]=r.aktiv!==false;});
            setModuleAktiv(ma);
            try{localStorage.setItem("fch-module-aktiv",JSON.stringify(ma));}catch{}
          }
          /* modul_rechte → moduleRechte State */
          if(mrR.data&&mrR.data.length>0&&setModuleRechte){
            const mr={};
            const zs={};
            mrR.data.forEach(r=>{
              if(!mr[r.rolle]) mr[r.rolle]=[];
              if(r.hat_zugriff){
                mr[r.rolle].push(r.modul);
                if(r.stufe&&r.stufe!=="lesen"){
                  if(!zs[r.rolle]) zs[r.rolle]={};
                  zs[r.rolle][r.modul]=r.stufe;
                }
              }
            });
            setModuleRechte(mr);
            try{localStorage.setItem("fch-module-rechte",JSON.stringify(mr));}catch{}
            if(Object.keys(zs).length>0){
              setZugriffStufen(zs);
              try{localStorage.setItem("fch-zugriff-stufen",JSON.stringify(zs));}catch{}
            }
          }
        }
      }catch(e){console.warn("[FCH] Portalverwaltung laden:",e.message);}
      setLoading(false);
    })();
  },[]);

  async function toggleModulAktiv(modulId,aktiv){
    if(!supabase) return;
    await supabase.from("module_config").upsert({modul_id:modulId,active,updated_by:supabase.auth.getUser?.()?.id});
    setModuleConfig(prev=>({...prev,[modulId]:{...prev[modulId],aktiv}}));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleBerechtigung(modulId,rolle,feld,wert){
    if(!supabase) return;
    const curr=moduleBerechtigungen[modulId]?.[rolle]||{};
    const update={modul_id:modulId,rolle,...curr,[feld]:wert};
    await supabase.from("module_berechtigungen").upsert(update);
    setModuleBerechtigungen(prev=>({
      ...prev,
      [modulId]:{...prev[modulId],[rolle]:{...curr,[feld]:wert}}
    }));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleFeld(feldKey,rolle,sichtbar){
    if(!supabase) return;
    await supabase.from("feldsichtbarkeit").upsert({feld_key:feldKey,role,sichtbar},{onConflict:"feld_key,role"});
    setFelder(prev=>prev.map(f=>f.feld_key===feldKey&&f.role===rolle?{...f,sichtbar}:f));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function updateBenutzerRolle(id,role){
    if(!supabase) return;
    await supabase.from("benutzer").update({role}).eq("id",id);
    setBenutzerListe(prev=>prev.map(b=>b.id===id?{...b,role}:b));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  function toggleModulGlobal(key){
    if(!setModuleAktiv) return;
    setModuleAktiv(prev=>{
      const neu={...prev,[key]:prev[key]===false?true:false};
      try{localStorage.setItem("fch-module-aktiv",JSON.stringify(neu));}catch{}
      /* In Supabase speichern */
      if(supabase) supabase.from("module_config")
        .upsert({modul:key,aktiv:neu[key]!==false},{onConflict:"modul"})
        .then(({error})=>{ if(error) console.warn("[FCH] module_config:", error.message); });
      return neu;
    });
    setModuleDirty(true); setSaveMsg("Ungespeichert");
  }

  function toggleModulRolle(modulKey, rolle){
    if(!setModuleRechte) return;
    setModuleRechte(prev=>{
      const base=prev||ROLLEN_MODULE_DEFAULT;
      const cur=base[rolle]||[];
      const hasIt=cur.includes(modulKey);
      const neu={...base,[rolle]:hasIt?cur.filter(m=>m!==modulKey):[...cur,modulKey]};
      try{localStorage.setItem("fch-module-rechte",JSON.stringify(neu));}catch{}
      return neu;
    });
    setModuleDirty(true); setSaveMsg("Ungespeichert");
  }

  /* Effektive Rechte: editierte oder Default */
  const effRechte=moduleRechte||ROLLEN_MODULE_DEFAULT;

  const moduleNachKat=KATEGORIEN.reduce(function(acc,k){
    acc[k]=module.filter(m=>m.category===k);
    return acc;
  },{});

  const felderNachKey={};
  felder.forEach(f=>{
    if(!felderNachKey[f.feld_key]) felderNachKey[f.feld_key]={label:f.feld_label||f.feld_key,rollen:{}};
    felderNachKey[f.feld_key].rollen[f.role]=f.sichtbar;
  });

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <H1>Portalverwaltung</H1>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3}}>Module, Benutzer, API-Verbindungen und Einstellungen</div>
        </div>
        {saveMsg&&<Chip text={saveMsg} color={saveMsg==="Ungespeichert"?R:GN} bg={saveMsg==="Ungespeichert"?RL:"#ECFDF5"}/>}
      </div>

      {/* ── MOBILE: Kacheln oder Unternavigation ── */}
      {isMobile&&mobileKachel===null&&(
        <div className="cc-grid-form">
          {KATEGORIEN_NAV.map(k=>(
            <button key={k.key} onClick={()=>{setMobileKachel(k.key);setTab(k.tabs[0].key);setAktiveKat(k.key);}}
              style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,
                padding:"16px",borderRadius:12,border:"0.5px solid var(--border)",
                background:"var(--surface)",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
              <div style={{width:40,height:40,borderRadius:10,background:k.bg,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <TI n={k.icon} size={20} style={{color:k.color}}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{k.label}</div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{k.tabs.length} Bereiche</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {isMobile&&mobileKachel!==null&&(()=>{
        const kat=KATEGORIEN_NAV.find(k=>k.key===mobileKachel)||KATEGORIEN_NAV[0];
        return(
          <div style={{marginBottom:16}}>
            <button onClick={()=>setMobileKachel(null)}
              style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",
                cursor:"pointer",color:"var(--sub)",fontSize:14,padding:"0 0 12px",fontFamily:"inherit"}}>
              <TI n="arrow-left" size={14}/>Übersicht
            </button>
            {kat.tabs.length>1&&(
              <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:16}}>
                {kat.tabs.map(t=>(
                  <button key={t.key} onClick={()=>setTab(t.key)}
                    style={{padding:"7px 12px",background:"none",border:"none",
                      borderBottom:tab===t.key?"2px solid "+BK:"2px solid transparent",
                      cursor:"pointer",fontSize:12,fontWeight:tab===t.key?700:400,
                      color:tab===t.key?BK:"var(--sub)",marginBottom:-1,fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── DESKTOP: Zweistufige Navigation ── */}
      {!isMobile&&(
        <div style={{marginBottom:20}}>
          {/* Ebene 1: Hauptkategorien */}
          <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:0}}>
            {KATEGORIEN_NAV.map(k=>{
              const isAktiv=k.key===aktiveKat;
              return(
                <button key={k.key} onClick={()=>{setAktiveKat(k.key);setTab(k.tabs[0].key);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",
                    background:isAktiv?k.bg:"none",border:"none",
                    borderBottom:isAktiv?"2px solid "+k.color:"2px solid transparent",
                    cursor:"pointer",fontSize:14,fontWeight:isAktiv?700:400,
                    color:isAktiv?k.color:"var(--sub)",marginBottom:-1,fontFamily:"inherit",
                    borderRadius:"6px 6px 0 0",whiteSpace:"nowrap"}}>
                  <TI n={k.icon} size={15} style={{color:isAktiv?k.color:"var(--sub)"}}/>
                  {k.label}
                </button>
              );
            })}
          </div>
          {/* Ebene 2: Unterkategorien (nur wenn >1 Tab in Kategorie) */}
          {(()=>{
            const kat=KATEGORIEN_NAV.find(k=>k.key===aktiveKat)||KATEGORIEN_NAV[0];
            if(kat.tabs.length<=1) return null;
            return(
              <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",
                paddingLeft:8,background:"var(--surface2)"}}>
                {kat.tabs.map(t=>(
                  <button key={t.key} onClick={()=>setTab(t.key)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",
                      background:"none",border:"none",
                      borderBottom:tab===t.key?"2px solid "+BK:"2px solid transparent",
                      cursor:"pointer",fontSize:12,fontWeight:tab===t.key?600:400,
                      color:tab===t.key?BK:"var(--sub)",marginBottom:-1,fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    <TI n={t.icon} size={13}/>
                    {t.label}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {loading&&(!isMobile||mobileKachel!==null)&&<div style={{padding:40,textAlign:"center",color:"var(--sub)",fontSize:14}}>Wird geladen…</div>}

      {/* ── TAB: MODULE & RECHTE ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="module"&&(
        <div>
          {/* Header: InfoBox + Legende + Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <InfoBox text="Klick auf ein Modul-Name öffnet die Detail-Aktionen. Klick auf eine Stufe ändert die Berechtigung." color={BL}/>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
              {/* Legende */}
              {ZUGRIFF_ORDER.map(s=>(
                <span key={s} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:ZUGRIFF_COLORS[s]+"20",border:`1px solid ${ZUGRIFF_COLORS[s]}40`}}>
                  <TI n={ZUGRIFF_ICONS[s]} size={11} style={{color:ZUGRIFF_COLORS[s]}}/>
                  <span style={{fontSize:11,fontWeight:600,color:ZUGRIFF_COLORS[s]}}>{ZUGRIFF_LABELS[s]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* View-Toggle + Speichern */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            {/* nach Modul / nach Rolle */}
            <div style={{display:"flex",border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
              {["modul","rolle"].map(v=>(
                <button key={v} onClick={()=>setModuleViewMode(v)} style={{
                  padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",
                  border:"none",fontFamily:FONT,transition:"all .15s",
                  background:moduleViewMode===v?BK:"transparent",
                  color:moduleViewMode===v?"#fff":"var(--sub)"
                }}>{v==="modul"?"nach Modul":"nach Rolle"}</button>
              ))}
            </div>
            {moduleDirty&&(
              <>
                <button onClick={async()=>{
                  if(supabase&&moduleRechte){
                    const rows=[];
                    Object.entries(moduleRechte).forEach(([rolle,module])=>{
                      ALLE_MODULE.forEach(m=>{
                        const hatZugriff=(module||[]).includes(m.key);
                        const stufe=hatZugriff?(zugriffStufen?.[rolle]?.[m.key]||effZugriff[rolle]?.[m.key]||effZugriff[rolle]?._all||"lesen"):"lesen";
                        rows.push({modul:m.key,rolle,hat_zugriff:hatZugriff,stufe});
                      });
                    });
                    const{error}=await supabase.from("modul_rechte").upsert(rows,{onConflict:"modul,rolle"});
                    if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                  }
                  try{localStorage.setItem("fch-module-rechte",JSON.stringify(moduleRechte));
                      if(zugriffStufen) localStorage.setItem("fch-zugriff-stufen",JSON.stringify(zugriffStufen));}catch{}
                  setModuleDirty(false); setSaveMsg("Gespeichert");setTimeout(()=>setSaveMsg(""),2000);
                }} style={{padding:"5px 14px",borderRadius:9,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Speichern
                </button>
                <button onClick={()=>{setModuleRechte(null);setZugriffStufen(null);setModuleDirty(false);try{localStorage.removeItem("fch-module-rechte");localStorage.removeItem("fch-zugriff-stufen");}catch{}setSaveMsg("Verworfen");setTimeout(()=>setSaveMsg(""),2000);}}
                  style={{padding:"5px 14px",borderRadius:9,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--sub)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  Verwerfen
                </button>
              </>
            )}
          </div>

          {/* ── ANSICHT: NACH MODUL ── */}
          {moduleViewMode==="modul"&&(()=>{
            return(
              <Card style={{padding:0,overflowX:"auto"}}>
                <table className="cc-table">
                  <thead>
                    <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                      <th className="cc-th">Modul</th>
                      {ROLLEN.map(r=>(
                        <th key={r} style={{textAlign:"center",padding:"9px 8px",fontWeight:700,
                          color:r==="administrator"?"var(--sub)":ROLES[r]?.color||"var(--sub)",
                          fontSize:11,minWidth:90,
                          background:r==="administrator"?"var(--surface2)":"transparent"
                        }}>{ROLLEN_LABELS[r]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["kern","sport","betrieb","kommunikation","verwaltung","admin"].map(kat=>{
                      const mods=ALLE_MODULE.filter(m=>m.kat===kat);
                      if(!mods.length) return null;
                      const KAT_LABELS={kern:"Kern",sport:"Sport",betrieb:"Betrieb",kommunikation:"Kommunikation",verwaltung:"Verwaltung",admin:"Systemverwaltung"};
                      return([
                        <tr key={"kat-"+kat}>
                          <td colSpan={ROLLEN.length+1} style={{padding:"6px 14px 4px",fontSize:10,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.8,background:"var(--surface2)",borderTop:"1px solid var(--border)"}}>{KAT_LABELS[kat]}</td>
                        </tr>,
                        ...mods.map(m=>{
                          const isAktiv=moduleAktiv[m.key]!==false;
                          const isPflicht=!!m.pflicht;
                          const isExpanded=expandedModul===m.key;
                          return([
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)",opacity:isAktiv?1:0.35,background:isPflicht?"#FFFBEB":"transparent"}}>
                              <td style={{padding:"0",position:"sticky",left:0,background:isPflicht?"#FFFBEB":isExpanded?"var(--surface2)":"var(--surface)",zIndex:1}}>
                                <div onClick={()=>setExpandedModul(isExpanded?null:m.key)}
                                  style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer"}}>
                                  <div onClick={e=>{e.stopPropagation();if(!isPflicht)toggleModulGlobal(m.key);}}
                                    title={isPflicht?"Pflichtmodul":isAktiv?"Deaktivieren":"Aktivieren"}
                                    style={{width:26,height:15,borderRadius:8,flexShrink:0,background:isPflicht?"#F59E0B":isAktiv?GN:"var(--border)",cursor:isPflicht?"not-allowed":"pointer",position:"relative",transition:"background 0.2s"}}>
                                    <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"var(--surface)",transition:"left 0.15s",left:isAktiv||isPflicht?13:2}}/>
                                  </div>
                                  <TI n={m.icon} size={13} style={{color:isPflicht?"#B45309":"var(--sub)",flexShrink:0}}/>
                                  <span style={{fontWeight:500,color:isPflicht?"#B45309":isExpanded?"var(--text)":"var(--text)",fontSize:14}}>{m.name||m.label}</span>
                                  {isPflicht&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:5,background:STATUS_BG.warn,color:"#B45309",fontWeight:600}}>Pflicht</span>}
                                  <TI n={isExpanded?"chevron-up":"chevron-down"} size={11} style={{color:"var(--sub)",marginLeft:"auto"}}/>
                                </div>
                              </td>
                              {ROLLEN.map(r=>{
                                const isAdmin=r==="administrator";
                                const stufe=getZugriff(r,m.key);
                                const hasAccess=isAktiv&&effRechte[r]?.includes(m.key);
                                const isEdited=moduleRechte&&(moduleRechte[r]?.includes(m.key))!==(ROLLEN_MODULE_DEFAULT[r]?.includes(m.key));
                                return(
                                  <td key={r} style={{textAlign:"center",padding:"7px 6px",background:isAdmin?"var(--surface2)":"transparent"}}>
                                    {r==="funktionaer"
                                      ?<span style={{fontSize:10,color:"var(--sub)",fontStyle:"italic"}}>via Gruppe</span>
                                      :(()=>{
                                        const sc=stufe?ZUGRIFF_COLORS[stufe]:"var(--border)";
                                        return(
                                          <div onClick={isAdmin?undefined:()=>{
                                            if(!isAktiv) return;
                                            if(hasAccess) cycleZugriff(r,m.key);
                                            else toggleModulRolle(m.key,r);
                                          }}
                                            title={isAdmin?"Administrator – immer vollen Zugriff":
                                              !isAktiv?"Modul inaktiv":
                                              hasAccess?(stufe==="verwalten"?`${ROLLEN_LABELS[r]}: Verwalten → klicken zum Entfernen`:`${ROLLEN_LABELS[r]}: ${ZUGRIFF_LABELS[stufe||"lesen"]} → klicken für nächste Stufe`):
                                              `${ROLLEN_LABELS[r]}: kein Zugriff → klicken für Lesen`}
                                            style={{
                                              width:hasAccess?80:22,height:24,borderRadius:6,margin:"0 auto",
                                              background:isAdmin?"var(--surface2)":hasAccess?sc+"20":"transparent",
                                              border:`${isEdited&&!isAdmin?"2px":"1px"} solid ${isAdmin?"var(--border)":hasAccess?sc:"var(--border)"}`,
                                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                                              cursor:isAdmin||!isAktiv?"not-allowed":"pointer",
                                              transition:"all 0.15s",opacity:!isAktiv?0.3:1,
                                              padding:hasAccess?"0 6px":"0"
                                            }}
                                            onMouseEnter={e=>{if(!isAdmin&&isAktiv&&!hasAccess)e.currentTarget.style.transform="scale(1.1)";}}
                                            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                                          >
                                            {hasAccess&&<><TI n={ZUGRIFF_ICONS[stufe||"lesen"]} size={11} style={{color:isAdmin?"var(--sub)":sc}}/><span style={{fontSize:10,fontWeight:600,color:isAdmin?"var(--sub)":sc}}>{ZUGRIFF_LABELS[stufe||"lesen"]}</span></>}
                                          </div>
                                        );
                                      })()
                                    }
                                  </td>
                                );
                              })}
                            </tr>,
                            isExpanded&&(
                              <tr key={m.key+"-detail"} style={{borderTop:"0.5px solid var(--border)"}}>
                                <td colSpan={ROLLEN.length+1} style={{padding:"10px 14px",background:"var(--surface2)"}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{flex:1}}>Aktionen</span>
                                    <span style={{minWidth:80,textAlign:"right"}}>Minimalstufe</span>
                                  </div>
                                  {(MODUL_AKTIONEN[m.key]||[]).map((a,ai)=>(
                                    <div key={ai} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderTop:ai>0?"0.5px solid var(--border)":"none"}}>
                                      <div style={{flex:1}}>
                                        <span style={{fontSize:12,color:"var(--text)"}}>{a.label}</span>
                                        {a.spez&&<div style={{fontSize:10,color:"var(--sub)",marginTop:2,fontStyle:"italic"}}>{a.spez}</div>}
                                        {a.note&&<div style={{fontSize:10,color:"var(--sub)",marginTop:2}}>ℹ {a.note}</div>}
                                      </div>
                                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,background:ZUGRIFF_COLORS[a.min]+"20",color:ZUGRIFF_COLORS[a.min],fontWeight:600,flexShrink:0}}>{ZUGRIFF_LABELS[a.min]}</span>
                                    </div>
                                  ))}
                                  {!MODUL_AKTIONEN[m.key]&&<span style={{fontSize:12,color:"var(--sub)"}}>Keine Detail-Aktionen definiert.</span>}
                                </td>
                              </tr>
                            )
                          ]);
                        })
                      ]);
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })()}

          {/* ── ANSICHT: NACH ROLLE ── */}
          {moduleViewMode==="rolle"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ROLLEN.filter(r=>r!=="funktionaer").map(role=>{
                const zugMods=ALLE_MODULE.filter(m=>effRechte[role]?.includes(m.key)&&moduleAktiv[m.key]!==false);
                if(!zugMods.length) return null;
                const roleInfo=ROLES[role]||{};
                return(
                  <Card key={role} style={{padding:0,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:roleInfo.color||"#888",flexShrink:0}}/>
                      <span style={{fontWeight:600,fontSize:14,color:roleInfo.color||"var(--text)"}}>{ROLLEN_LABELS[role]}</span>
                      <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>{zugMods.length} Module</span>
                    </div>
                    <table className="cc-table">
                      <thead>
                        <tr style={{background:"var(--surface2)"}}>
                          <th className="cc-th">Modul</th>
                          <th className="cc-th">Stufe</th>
                          <th className="cc-th">Kann</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zugMods.map((m,i)=>{
                          const stufe=getZugriff(role,m.key)||"lesen";
                          const kann=(MODUL_AKTIONEN[m.key]||[]).filter(a=>a.wer.includes(role)).map(a=>a.label);
                          const sc=ZUGRIFF_COLORS[stufe];
                          return(
                            <tr key={m.key} style={{borderTop:"0.5px solid var(--border)"}}>
                              <td style={{padding:"8px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:7}}>
                                  <TI n={m.icon} size={13} style={{color:"var(--sub)"}}/>
                                  <span style={{fontWeight:500,fontSize:14}}>{m.name||m.label}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px"}}>
                                <div onClick={()=>{const aktiv=moduleAktiv[m.key]!==false;if(aktiv&&role!=="administrator")cycleZugriff(role,m.key);}}
                                  style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:sc+"20",border:`1px solid ${sc}50`,cursor:"pointer"}}>
                                  <TI n={ZUGRIFF_ICONS[stufe]} size={11} style={{color:sc}}/>
                                  <span style={{fontSize:10,fontWeight:600,color:sc}}>{ZUGRIFF_LABELS[stufe]}</span>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px",fontSize:11,color:"var(--sub)"}}>{kann.length?kann.join(" · "):"Nur ansehen"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                );
              })}

              {/* Funktionär: via Gruppen */}
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--surface2)",borderBottom:"0.5px solid var(--border)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:ROLES["funktionaer"]?.color||"#8B5CF6",flexShrink:0}}/>
                  <span style={{fontWeight:600,fontSize:14,color:ROLES["funktionaer"]?.color||"#8B5CF6"}}>Funktionär</span>
                  <span style={{fontSize:11,color:"var(--sub)",marginLeft:4}}>Module via Gruppen & Funktionen</span>
                </div>
                <div style={{padding:"12px 16px"}}>
                  <InfoBox text="Funktionäre erhalten keinen fixen Modulzugang. Stattdessen werden ihnen Gruppen zugewiesen, welche die erlaubten Module definieren. Die Einschränkung auf bestimmte Teams oder Filter erfolgt über Funktionen innerhalb der Gruppe." color={BL}/>
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
                    {(gruppen.length>0?gruppen:[
                      {name:"Vereinsleben & Events",farbe:"#8B5CF6",module:["events","helpers","members","news","docs"]},
                      {name:"Betrieb & Infrastruktur",farbe:"#3B82F6",module:["material","buses","lockers","docs"]},
                      {name:"Kommunikation & Medien", farbe:"#22C55E",module:["media","wiki","news","docs"]},
                      {name:"Stufenleitende",          farbe:"#F97316",module:["team","training","events","attendance_central","members","helpers"]},
                      {name:"Schiedsrichterwesen",     farbe:"#06B6D4",module:["schedule","training","docs"]},
                    ]).map(g=>(
                      <div key={g.name} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:g.farbe,flexShrink:0}}/>
                        <span style={{fontWeight:500,fontSize:14,flex:1}}>{g.name}</span>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(g.module||[]).map(mk=>{
                            const mod=ALLE_MODULE.find(m=>m.key===mk);
                            return mod?<span key={mk} style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:g.farbe+"15",color:g.farbe}}>{mod.name||mod.label}</span>:null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:"var(--sub)"}}>
                    Gruppen und Module konfigurierst du unter <strong>Gruppen & Funktionen</strong>.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: GRUPPEN & FUNKTIONEN ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="gruppen"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:20}}>
            <InfoBox text="Gruppen bündeln Module für Funktionäre. Funktionen schränken innerhalb einer Gruppe ein (Teams, Filter)." color={BL}/>
            <button onClick={()=>{setEditGruppe(null);setGruppeForm({name:"",beschreibung:"",module:[],farbe:"#8B5CF6",modul_stufen:{},teams:[]});setShowGruppeForm(true);}}
              style={{padding:"7px 16px",borderRadius:9,border:"none",background:BTN,color:BTN_TXT,transition:"background 0.15s",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>
              + Neue Gruppe
            </button>
          </div>

          {/* Gruppen als Grid */}
          <div className="cc-grid-cards" style={{gap:12}}>
          {(gruppen.length>0?gruppen:[
            {id:1,name:"Vereinsleben & Events",farbe:"#8B5CF6",beschreibung:"Anlässe, Helfereinsätze, Mitgliederliste",module:["events","helpers","members","news","docs"]},
            {id:2,name:"Betrieb & Infrastruktur",farbe:"#3B82F6",beschreibung:"Material, Busse, Garderoben",module:["material","buses","lockers","docs"]},
            {id:3,name:"Kommunikation & Medien",farbe:"#22C55E",beschreibung:"Website, Social Media, Wiki, News",module:["media","wiki","news","docs"]},
            {id:4,name:"Stufenleitende",farbe:"#F97316",beschreibung:"Teams und Kader der zugewiesenen Stufe",module:["team","training","events","attendance_central","members","helpers"]},
            {id:5,name:"Schiedsrichterwesen",farbe:"#06B6D4",beschreibung:"Spielplan, Koordination",module:["schedule","training","docs"]},
          ]).map(g=>{
            const gFunktionen=funktionen.filter(f=>f.gruppe_id===g.id||f.portal_gruppen?.id===g.id);
            const gTeams=gruppenTeams.filter(gt=>gt.gruppe_id===g.id).map(gt=>pvTeams.find(t=>t.id===gt.team_id)).filter(Boolean);
            const isOpen=selectedGruppe?.id===g.id;
            const moduleLabels=(g.module||[]).map(k=>ALLE_MODULE.find(m=>m.key===k)?.label||k);
            return(
              <div key={g.id} style={{
                borderRadius:14,border:`1.5px solid ${isOpen?g.farbe:"var(--border)"}`,
                overflow:"hidden",
                background:isOpen?g.farbe+"08":"var(--surface)",
                transition:"all 0.15s"
              }}>
                {/* Gruppen-Header */}
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  {/* Farbstreifen */}
                  <div style={{width:4,alignSelf:"stretch",background:g.farbe,flexShrink:0}}/>
                  <div onClick={()=>setSelectedGruppe(isOpen?null:g)}
                    style={{flex:1,padding:"14px 16px",cursor:"pointer",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{g.name}</span>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:g.farbe+"20",color:g.farbe,fontWeight:600}}>
                        {gFunktionen.length} Funktion{gFunktionen.length!==1?"en":""}
                      </span>
                      {gTeams.length>0&&(
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:"#F9731620",color:"#F97316",fontWeight:600}}>
                          {gTeams.length} Team{gTeams.length!==1?"s":""}
                        </span>
                      )}
                    </div>
                    {g.beschreibung&&<div style={{fontSize:12,color:"var(--sub)",marginBottom:6}}>{g.beschreibung}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {moduleLabels.map(ml=>(
                        <span key={ml} style={{fontSize:11,padding:"2px 9px",borderRadius:8,background:g.farbe+"15",color:g.farbe}}>{ml}</span>
                      ))}
                    </div>
                  </div>
                  {/* Aktionen */}
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();const existingTeams=gruppenTeams.filter(gt=>gt.gruppe_id===g.id).map(gt=>gt.team_id);setEditGruppe(g);setGruppeForm({name:g.name,beschreibung:g.beschreibung||"",module:g.module||[],farbe:g.farbe||"#8B5CF6",modul_stufen:g.modul_stufen||{},teams:existingTeams});setShowGruppeForm(true);}}
                      style={{width:30,height:30,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)"}}>
                      <TI n="edit" size={13}/>
                    </button>
                    <div onClick={()=>setSelectedGruppe(isOpen?null:g)} style={{cursor:"pointer",color:"var(--sub)",padding:4}}>
                      <TI n={isOpen?"chevron-up":"chevron-down"} size={16}/>
                    </div>
                  </div>
                </div>

                {/* Expandierte Funktionen */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${g.farbe}30`,background:"var(--surface2)"}}>
                    {/* Funktionen-Header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px 6px"}}>
                      <SectionLabel style={{marginBottom:0}}>
                        Funktionen
                      </SectionLabel>
                      <button onClick={()=>{setEditFunktion(null);setFunktionForm({name:"",beschreibung:"",gruppe_id:g.id,module_override:[],teams:[],filter:{}});setShowFunktionForm(true);}}
                        style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${g.farbe}`,background:g.farbe+"15",color:g.farbe,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                        + Funktion hinzufügen
                      </button>
                    </div>

                    {/* Funktionen-Grid */}
                    <div style={{padding:"6px 12px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
                      {gFunktionen.length===0&&(
                        <div style={{gridColumn:"1/-1",padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14,border:"1px dashed var(--border)",borderRadius:10}}>
                          Noch keine Funktionen — klicke «+ Funktion hinzufügen»
                        </div>
                      )}
                      {gFunktionen.map(f=>(
                        <div key={f.id} style={{
                          background:"var(--surface)",borderRadius:10,
                          border:"1px solid var(--border)",padding:"11px 13px"
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <span style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{f.name}</span>
                            <button onClick={()=>{setEditFunktion(f);setFunktionForm({name:f.name,beschreibung:f.beschreibung||"",gruppe_id:f.gruppe_id||g.id,module_override:f.module_override||[],teams:f.teams||[],filter:f.filter||{}});setShowFunktionForm(true);}}
                              style={{width:26,height:26,borderRadius:7,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sub)",flexShrink:0}}>
                              <TI n="edit" size={12}/>
                            </button>
                          </div>
                          {f.beschreibung&&<div style={{fontSize:11,color:"var(--sub)",marginBottom:6}}>{f.beschreibung}</div>}
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {f.module_override?.length>0
                              ?f.module_override.map(m=>{const ml=ALLE_MODULE.find(x=>x.key===m);return(
                                <span key={m} style={{fontSize:10,padding:"1px 7px",borderRadius:6,background:"#3B82F615",color:"#3B82F6"}}>
                                  <TI n="arrow-narrow-right" size={9}/> {ml?.label||m}
                                </span>
                              );})
                              :<span style={{fontSize:10,color:"var(--sub)",fontStyle:"italic"}}>alle Gruppen-Module</span>
                            }
                            {f.teams?.length>0&&(
                              <span style={{fontSize:10,padding:"1px 7px",borderRadius:6,background:"#F9731615",color:"#F97316"}}>
                                {f.teams.length} Team{f.teams.length!==1?"s":""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Gruppe bearbeiten Modal */}
          <ModalOrSheet open={showGruppeForm} onClose={()=>{setShowGruppeForm(false);setEditGruppe(null);}} maxWidth={500}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:gruppeForm.farbe}}/>
                  <ModalTitle>{editGruppe?"Gruppe bearbeiten":"Neue Gruppe"}</ModalTitle>
                </div>
                <button onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:16}}>
                {editGruppe?"Module und Name anpassen.":"Neue Gruppe mit Modulzugang erstellen."}
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
              {/* Name + Farbe */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Gruppenname *</label>
                  <input value={gruppeForm.name} onChange={e=>setGruppeForm(p=>({...p,name:e.target.value}))}
                    placeholder="z.B. Vereinsleben & Events" autoFocus
                    style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Farbe</label>
                  <div style={{display:"flex",gap:5}}>
                    {["#8B5CF6","#3B82F6","#22C55E","#F97316","#06B6D4","#EF4444","#F59E0B","#EC4899"].map(c=>(
                      <div key={c} onClick={()=>setGruppeForm(p=>({...p,farbe:c}))}
                        style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",
                          border:`3px solid ${gruppeForm.farbe===c?"var(--text)":"transparent"}`,
                          transition:"border 0.1s"}}/>
                    ))}
                  </div>
                </div>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={gruppeForm.beschreibung||""} onChange={e=>setGruppeForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Wofür ist diese Gruppe?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Teams */}
              {pvTeams.length>0&&(
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"block"}}>
                    Teams <span style={{fontWeight:400,fontSize:11}}>— {(gruppeForm.teams||[]).length} zugeordnet</span>
                  </label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {pvTeams.map(t=>{
                      const sel=(gruppeForm.teams||[]).includes(t.id);
                      return(
                        <button key={t.id} onClick={()=>setGruppeForm(p=>({...p,teams:sel?(p.teams||[]).filter(x=>x!==t.id):[...(p.teams||[]),t.id]}))}
                          style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${sel?gruppeForm.farbe:"var(--border)"}`,background:sel?gruppeForm.farbe+"15":"transparent",color:sel?gruppeForm.farbe:"var(--sub)",fontSize:12,fontWeight:sel?600:400,cursor:"pointer",fontFamily:FONT}}>
                          {t.kurzname||t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Module */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"block"}}>
                  Module & Zugriffstufen <span style={{fontWeight:400,fontSize:11}}>— {(gruppeForm.module||[]).length} ausgewählt</span>
                </label>
                <Col gap={4}>
                  {ALLE_MODULE.filter(m=>m.key!=="dashboard"&&m.key!=="portal").map(m=>{
                    const sel=(gruppeForm.module||[]).includes(m.key);
                    const stufe=(gruppeForm.modul_stufen||{})[m.key]||"lesen";
                    const STUFEN=["lesen","schreiben","verwalten"];
                    return(
                      <div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?gruppeForm.farbe:"var(--border)"}`,background:sel?gruppeForm.farbe+"08":"transparent"}}>
                        {/* Modul aktivieren */}
                        <button onClick={()=>setGruppeForm(p=>{
                          const cur=p.module||[];
                          const newMods=sel?cur.filter(x=>x!==m.key):[...cur,m.key];
                          const newStufen={...p.modul_stufen};
                          if(!sel) newStufen[m.key]="lesen";
                          return{...p,module:newMods,modul_stufen:newStufen};
                        })} style={{display:"flex",alignItems:"center",gap:6,flex:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",fontFamily:FONT}}>
                          <TI n={m.icon} size={13} style={{color:sel?gruppeForm.farbe:"var(--sub)",flexShrink:0}}/>
                          <span style={{fontSize:12,color:sel?gruppeForm.farbe:"var(--sub)",fontWeight:sel?600:400}}>{m.label}</span>
                        </button>
                        {/* Stufen-Toggle (nur wenn aktiv) */}
                        {sel&&(
                          <div style={{display:"flex",gap:2,flexShrink:0}}>
                            {STUFEN.map(s=>(
                              <button key={s} onClick={()=>setGruppeForm(p=>({...p,modul_stufen:{...p.modul_stufen,[m.key]:s}}))}
                                style={{padding:"2px 7px",borderRadius:5,border:`1px solid ${stufe===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:stufe===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:stufe===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:10,fontWeight:stufe===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                                {ZUGRIFF_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Col>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!gruppeForm.name.trim()) return;
                  const payload={name:gruppeForm.name.trim(),beschreibung:gruppeForm.beschreibung||"",module:gruppeForm.module||[],farbe:gruppeForm.farbe||"#8B5CF6",modul_stufen:gruppeForm.modul_stufen||{},aktiv:true};
                  if(supabase){
                    let gruppeId = editGruppe?.id;
                    if(editGruppe?.id){
                      const{error}=await supabase.from("portal_gruppen").update(payload).eq("id",editGruppe.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{data:newG,error}=await supabase.from("portal_gruppen").insert(payload).select().single();
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                      gruppeId = newG?.id;
                    }
                    // Teams speichern
                    if(gruppeId){
                      await supabase.from("portal_gruppen_teams").delete().eq("gruppe_id",gruppeId);
                      const teamRows=(gruppeForm.teams||[]).map(tid=>({gruppe_id:gruppeId,team_id:tid}));
                      if(teamRows.length>0) await supabase.from("portal_gruppen_teams").insert(teamRows);
                      const{data:freshGt}=await supabase.from("portal_gruppen_teams").select("*");
                      if(freshGt) setGruppenTeams(freshGt);
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_gruppen").select("*").order("name");
                    if(fresh) setGruppen(fresh);
                  } else {
                    if(editGruppe){
                      setGruppen(prev=>{
                        const updated=prev.map(g=>g.id===editGruppe.id?{...g,...payload}:g);
                        return updated.length>0?updated:[{id:editGruppe.id,...payload}];
                      });
                      if(selectedGruppe?.id===editGruppe.id) setSelectedGruppe(g=>({...g,...payload}));
                    } else {
                      setGruppen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowGruppeForm(false); setEditGruppe(null);
                  setSaveMsg(editGruppe?"Gruppe gespeichert":"Gruppe erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"10px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editGruppe?"Änderungen speichern":"Gruppe erstellen"}
                </button>
                <Btn onClick={()=>{setShowGruppeForm(false);setEditGruppe(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>

          {/* Funktion bearbeiten Modal */}
          <ModalOrSheet open={showFunktionForm} onClose={()=>{setShowFunktionForm(false);setEditFunktion(null);}} maxWidth={520}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div>
                  <ModalTitle>{editFunktion?"Funktion bearbeiten":"Neue Funktion"}</ModalTitle>
                  {selectedGruppe&&<div style={{fontSize:12,color:selectedGruppe.farbe,fontWeight:600,marginTop:2}}>in {selectedGruppe.name}</div>}
                </div>
                <button onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:16}}>
                Einschränkungen innerhalb der Gruppe — leer = alles der Gruppe sichtbar.
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
              {/* Name */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Name *</label>
                <input value={funktionForm.name} onChange={e=>setFunktionForm(p=>({...p,name:e.target.value}))}
                  placeholder="z.B. Chef Anlässe" autoFocus
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Beschreibung */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>Beschreibung</label>
                <input value={funktionForm.beschreibung||""} onChange={e=>setFunktionForm(p=>({...p,beschreibung:e.target.value}))}
                  placeholder="Was macht diese Funktion?"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:14,fontFamily:FONT,background:"var(--surface2)",color:"var(--text)",boxSizing:"border-box",outline:"none"}}/>
              </div>
              {/* Module einschränken + Stufe überschreiben */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"}}>
                  Module & Stufen-Override
                  <span style={{fontWeight:400,marginLeft:6,fontSize:11,color:"var(--sub)"}}>
                    Gruppen-Stufe überschreiben (nur höher)
                  </span>
                </label>
                <InfoBox text="Leer lassen = alle Module der Gruppe mit Gruppen-Stufe. Override = nur für ausgewählte Module die Stufe erhöhen." color={BL}/>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                  {(selectedGruppe?.module||ALLE_MODULE.filter(m=>m.key!=="dashboard").map(m=>m.key)).map(mk=>{
                    const m=ALLE_MODULE.find(x=>x.key===mk)||{key:mk,label:mk,icon:"circle"};
                    const gruppeStufe=(selectedGruppe?.modul_stufen||{})[mk]||"lesen";
                    const override=(funktionForm.stufe_override||{})[mk];
                    const STUFEN=["lesen","schreiben","verwalten"];
                    const STUFE_RANG={lesen:1,schreiben:2,verwalten:3};
                    return(
                      <div key={mk} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:"0.5px solid var(--border)"}}>
                        <TI n={m.icon||"circle"} size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                        <span style={{flex:1,fontSize:12,color:"var(--text)"}}>{m.label}</span>
                        {/* Gruppen-Default als Referenz */}
                        <span style={{fontSize:10,color:"var(--sub)",padding:"2px 6px",borderRadius:4,background:"var(--surface2)"}}>Gruppe: {gruppeStufe}</span>
                        {/* Override Buttons (nur höhere Stufen) */}
                        <div style={{display:"flex",gap:2}}>
                          <button onClick={()=>setFunktionForm(p=>{const ns={...p.stufe_override};delete ns[mk];return{...p,stufe_override:ns};})}
                            style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${!override?"#000":"var(--border)"}`,background:!override?"#00000010":"transparent",color:!override?"var(--text)":"var(--sub)",fontSize:9,cursor:"pointer",fontFamily:FONT}}>
                            Standard
                          </button>
                          {STUFEN.filter(s=>STUFE_RANG[s]>STUFE_RANG[gruppeStufe]).map(s=>(
                            <button key={s} onClick={()=>setFunktionForm(p=>({...p,stufe_override:{...p.stufe_override,[mk]:s}}))}
                              style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${override===s?ZUGRIFF_COLORS[s]:"var(--border)"}`,background:override===s?ZUGRIFF_COLORS[s]+"20":"transparent",color:override===s?ZUGRIFF_COLORS[s]:"var(--sub)",fontSize:10,fontWeight:override===s?700:400,cursor:"pointer",fontFamily:FONT}}>
                              {ZUGRIFF_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"1px solid var(--border)"}}>
                <button onClick={async()=>{
                  if(!funktionForm.name.trim()) return;
                  const payload={
                    name:funktionForm.name.trim(),
                    beschreibung:funktionForm.beschreibung||"",
                    gruppe_id:funktionForm.gruppe_id||selectedGruppe?.id,
                    module_override:funktionForm.module_override||[],
                    stufe_override:funktionForm.stufe_override||{},
                    teams:funktionForm.teams||[],
                    filter:funktionForm.filter||{},
                    aktiv:true
                  };
                  if(supabase){
                    if(editFunktion?.id){
                      const{error}=await supabase.from("portal_funktionen").update(payload).eq("id",editFunktion.id);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    } else {
                      const{error}=await supabase.from("portal_funktionen").insert(payload);
                      if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                    }
                    /* Immer neu laden nach Speichern */
                    const{data:fresh}=await supabase.from("portal_funktionen").select("*, portal_gruppen(name,farbe)").order("name");
                    if(fresh) setFunktionen(fresh);
                  } else {
                    if(editFunktion){
                      setFunktionen(prev=>prev.map(f=>f.id===editFunktion.id?{...f,...payload}:f));
                    } else {
                      setFunktionen(prev=>[...prev,{id:Date.now(),...payload}]);
                    }
                  }
                  setShowFunktionForm(false); setEditFunktion(null);
                  setSaveMsg(editFunktion?"Funktion gespeichert":"Funktion erstellt");
                  setTimeout(()=>setSaveMsg(""),2000);
                }} style={{flex:1,padding:"10px",borderRadius:10,background:BTN,color:BTN_TXT,transition:"background 0.15s",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editFunktion?"Änderungen speichern":"Funktion erstellen"}
                </button>
                <Btn onClick={()=>{setShowFunktionForm(false);setEditFunktion(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>
        </div>
      )}

      {/* ── TAB: TEAM-MODULE ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="teammodule"&&(()=>{
        const TEAM_MODS=[
          {key:"roster",    label:"Kader"},
          {key:"training",  label:"Training"},
          {key:"spielplan", label:"Spielplan"},
          {key:"events",    label:"Termine"},
          {key:"attendance_central",label:"Anwesenheit"},
          {key:"helpers",   label:"Helfer"},
          {key:"polls",     label:"Abstimmungen"},
          {key:"stats",     label:"Statistik"},
          {key:"media",     label:"Medien"},
          {key:"news",      label:"News"},
          {key:"wiki",      label:"Wiki"},
          {key:"docs",      label:"Dokumente"},
        ];
        /* Lokaler State für Änderungen */
        return(
          <TeamModuleMatrix supabase={supabase} setSaveMsg={setSaveMsg}/>
        );
      })()}

      {/* ── TAB: BENUTZER & ROLLEN ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="users"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,color:"var(--sub)"}}>{benutzerListe.length} Benutzer</div>
            <Btn variant="primary" onClick={()=>{}}>+ Benutzer einladen</Btn>
          </div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th className="cc-th">Name</th>
                  <th className="cc-th">E-Mail</th>
                  <th className="cc-th">Portal-Rolle</th>
                  <th className="cc-th">Funktionen</th>
                  <th className="cc-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {benutzerListe.length===0&&(
                  <tr className="cc-tr"><td colSpan={5} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14}}>Keine Benutzer gefunden</td></tr>
                )}
                {benutzerListe.map((b,i)=>(
                  <tr key={b.id} style={{borderTop:"0.5px solid var(--border)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600,color:"var(--text)"}}>{b.name||"—"}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:12}}>{b.email}</td>
                    <td style={{padding:"9px 13px"}}>
                      <select value={b.role||"spieler"} onChange={e=>updateBenutzerRolle(b.id,e.target.value)}
                        style={{padding:"5px 8px",border:"1px solid var(--border)",borderRadius:7,fontSize:12,background:"var(--surface)",color:ROLES[b.role]?.color||"var(--text)",fontFamily:FONT,cursor:"pointer"}}>
                        {ROLLEN.map(r=><option key={r} value={r}>{ROLLEN_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      {/* Funktionen anzeigen + zuweisen */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                        {(b.funktionen||[]).map(f=>(
                          <span key={f.id} style={{
                            fontSize:11,padding:"2px 8px",borderRadius:8,
                            background:"#8B5CF615",color:"#7C3AED",
                            display:"flex",alignItems:"center",gap:4
                          }}>
                            {f.name}
                            <button onClick={async()=>{
                              if(supabase) await supabase.from("benutzer_funktionen").delete().match({benutzer_id:b.id,funktion_id:f.id});
                              setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:(u.funktionen||[]).filter(x=>x.id!==f.id)}:u));
                            }} style={{background:"none",border:"none",cursor:"pointer",color:"#7C3AED",padding:0,lineHeight:1,fontSize:12}}>×</button>
                          </span>
                        ))}
                        {/* Funktion hinzufügen */}
                        <select
                          value=""
                          onChange={async e=>{
                            const fid=Number(e.target.value);
                            if(!fid) return;
                            const fn=funktionen.find(f=>f.id===fid);
                            if(!fn) return;
                            if(supabase){
                              const{error}=await supabase.from("benutzer_funktionen").upsert({benutzer_id:b.id,funktion_id:fid},{onConflict:"benutzer_id,funktion_id"});
                              if(error){setSaveMsg("Fehler: "+error.message);setTimeout(()=>setSaveMsg(""),3000);return;}
                            }
                            setBenutzerListe(prev=>prev.map(u=>u.id===b.id?{...u,funktionen:[...(u.funktionen||[]),fn]}:u));
                            setSaveMsg("Funktion zugewiesen");setTimeout(()=>setSaveMsg(""),2000);
                          }}
                          style={{padding:"3px 6px",border:"1px dashed var(--border)",borderRadius:7,fontSize:11,background:"transparent",color:"var(--sub)",cursor:"pointer",fontFamily:FONT}}>
                          <option value="">+ Funktion</option>
                          {funktionen.filter(f=>!(b.funktionen||[]).find(x=>x.id===f.id)).map(f=>(
                            <option key={f.id} value={f.id}>{f.portal_gruppen?.name?`${f.portal_gruppen.name} · `:""}{f.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      <Chip text={b.aktiv!==false?"Aktiv":"Inaktiv"} color={b.aktiv!==false?GN:R} bg={b.aktiv!==false?"#ECFDF5":RL}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: MITGLIEDER-KONFIGURATION ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="mitglieder_config"&&(()=>{
        const ROLLEN_PF=["spieler","trainer","funktionaer","eltern"];
        const ROLLEN_PF_LABELS={spieler:"Spieler",trainer:"Trainer",funktionaer:"Funktionär",eltern:"Eltern"};
        const MITGLIEDTYPEN_PF=["Aktivmitglied","Juniormitglied","Funktionär","Passivmitglied","Ehrenmitglied","Freimitglied"];
        const MITGLIEDTYPEN_SHORT={Aktivmitglied:"Aktivmitglied",Juniormitglied:"Juniormitglied",Funktionär:"Funktionär",Passivmitglied:"Passivmitglied",Ehrenmitglied:"Ehrenmitglied",Freimitglied:"Freimitglied"};
        const FELDER_ROLLE=["geburtsdatum","adresse","telefon","ahv_nr","spielerpass","js_nr","fairgate_id"];
        const FELDER_ROLLE_LABELS={geburtsdatum:"Geburtsdatum",adresse:"Adresse",telefon:"Telefon",ahv_nr:"AHV-Nr.",spielerpass:"Spielerpass",js_nr:"J+S Nr.",fairgate_id:"Fairgate-ID"};
        const FELDER_TYP=["vorname_nachname","geburtsdatum","adresse","telefon","email"];
        const FELDER_TYP_LABELS={vorname_nachname:"Vorname / Name",geburtsdatum:"Geburtsdatum",adresse:"Adresse",telefon:"Telefon",email:"E-Mail"};

        const isPflichtRolle=(rolle,feld)=>rollePflichtfelder.some(r=>r.rolle===rolle&&r.feld===feld&&r.pflicht);
        const isPflichtTyp=(typ,feld)=>mitgliedtypPflichtfelder.some(r=>r.mitgliedtyp===typ&&r.feld===feld&&r.pflicht);

        async function toggleRolle(rolle,feld,aktuell){
          if(!supabase) return;
          const neu=!aktuell;
          await supabase.from("rolle_pflichtfelder").upsert({rolle,feld,pflicht:neu},{onConflict:"rolle,feld"});
          const{data}=await supabase.from("rolle_pflichtfelder").select("*");
          if(data) setRollePflichtfelder(data);
        }

        async function toggleTyp(mitgliedtyp,feld,aktuell){
          if(!supabase) return;
          const neu=!aktuell;
          await supabase.from("mitgliedtyp_pflichtfelder").upsert({mitgliedtyp,feld,pflicht:neu},{onConflict:"mitgliedtyp,feld"});
          const{data}=await supabase.from("mitgliedtyp_pflichtfelder").select("*");
          if(data) setMitgliedtypPflichtfelder(data);
        }


        async function saveMitgliedtyp(){
          if(!mitgliedtypForm.name.trim()) return;
          const payload={name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true};
          if(supabase){
            if(editMitgliedtyp?.id){
              await supabase.from("mitgliedtypen").update(payload).eq("id",editMitgliedtyp.id);
            } else {
              const maxSort=Math.max(0,...dbMitgliedtypen.map(t=>t.sort_order||0));
              await supabase.from("mitgliedtypen").insert({...payload,sort_order:maxSort+1});
            }
            const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
            if(data) setDbMitgliedtypen(data);
          }
          setShowMitgliedtypForm(false); setEditMitgliedtyp(null);
          setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
        }

        async function deleteMitgliedtyp(id){
          if(!supabase||!window.confirm("Mitgliedtyp wirklich löschen?")) return;
          await supabase.from("mitgliedtypen").update({aktiv:false}).eq("id",id);
          const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
          if(data) setDbMitgliedtypen(data);
        }

        return(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* Mitgliedtypen verwalten */}
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="cc-section-title"><TI n="id-badge" size={14}/> Mitgliedtypen</div>
                <button onClick={()=>{setEditMitgliedtyp(null);setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});setShowMitgliedtypForm(true);}}
                  style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  + Neu
                </button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                  <th className="cc-th cc-th-center">Hauptkontakt</th>
                  <th className="cc-th" style={{textAlign:"left"}}>Beitrag</th>
                  <th className="cc-th" style={{textAlign:"left"}}>Standard-Rolle</th>
                  <th className="cc-th cc-th-center">Aktiv</th>
                  <th className="cc-th"></th>
                </tr></thead>
                <tbody>
                  {dbMitgliedtypen.map(t=>(
                    <tr key={t.id} className="cc-tr">
                      <td className="cc-td" style={{fontWeight:500}}>{t.name}</td>
                      <td className="cc-td" style={{textAlign:"center"}}>
                        {t.hauptkontakt_pflicht
                          ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#fef9c3",color:"#854d0e",fontWeight:600}}>★ Pflicht</span>
                          :<span style={{fontSize:11,color:"var(--sub)"}}>—</span>}
                      </td>
                      <td className="cc-td" style={{fontSize:12,color:"var(--sub)"}}>{t.beitragsinfo||"—"}</td>
                      <td className="cc-td"><span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{t.standard_rolle||"—"}</span></td>
                      <td className="cc-td" style={{textAlign:"center"}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:t.aktiv?"#ECFDF5":"var(--surface2)",color:t.aktiv?"#15803d":"var(--sub)",fontWeight:500}}>
                          {t.aktiv?"Aktiv":"Inaktiv"}
                        </span>
                      </td>
                      <td className="cc-td" style={{textAlign:"right"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button onClick={()=>{setEditMitgliedtyp(t);setMitgliedtypForm({name:t.name,beitragsinfo:t.beitragsinfo||"",hauptkontakt_pflicht:!!t.hauptkontakt_pflicht,standard_rolle:t.standard_rolle||""});setShowMitgliedtypForm(true);}}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}>
                            <TI n="edit" size={12}/>
                          </button>
                          <button onClick={()=>deleteMitgliedtyp(t.id)}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}>
                            <TI n="trash" size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Mitgliedtyp bearbeiten Modal */}
            <ModalOrSheet open={showMitgliedtypForm} onClose={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} maxWidth={420}>
              <div style={{padding:"20px 20px 0",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <ModalTitle>{editMitgliedtyp?"Mitgliedtyp bearbeiten":"Neuer Mitgliedtyp"}</ModalTitle>
                  <button onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
                </div>
              </div>
              <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label className="cc-label">Name *</label>
                  <input className="cc-input" value={mitgliedtypForm.name} onChange={e=>setMitgliedtypForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Aktivmitglied" autoFocus/>
                </div>
                <div>
                  <label className="cc-label">Beitragsinfo</label>
                  <input className="cc-input" value={mitgliedtypForm.beitragsinfo||""} onChange={e=>setMitgliedtypForm(p=>({...p,beitragsinfo:e.target.value}))} placeholder="z.B. Voller Beitrag CHF 150"/>
                </div>
                <div>
                  <label className="cc-label">Standard Portal-Rolle</label>
                  <select className="cc-input" value={mitgliedtypForm.standard_rolle||""} onChange={e=>setMitgliedtypForm(p=>({...p,standard_rolle:e.target.value}))}>
                    <option value="">– keine –</option>
                    {[{v:"administrator",l:"Administrator"},{v:"administration",l:"Verwaltung"},{v:"funktionaer",l:"Funktionär"},{v:"trainer",l:"Trainer"},{v:"spieler",l:"Spieler"},{v:"eltern",l:"Eltern"},{v:"mitglied",l:"Mitglied"},{v:"supporter",l:"Supporter"}].map(r=>(
                      <option key={r.v} value={r.v}>{r.l}</option>
                    ))}
                  </select>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Wird automatisch gesetzt wenn keine höhere Rolle vorliegt</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",cursor:"pointer"}}
                  onClick={()=>setMitgliedtypForm(p=>({...p,hauptkontakt_pflicht:!p.hauptkontakt_pflicht}))}>
                  <div style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${mitgliedtypForm.hauptkontakt_pflicht?"#22c55e":"var(--border)"}`,background:mitgliedtypForm.hauptkontakt_pflicht?"#ECFDF5":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {mitgliedtypForm.hauptkontakt_pflicht&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                  </div>
                  <span style={{fontSize:13}}>Hauptkontakt Pflicht</span>
                  <span style={{fontSize:12,color:"var(--sub)",marginLeft:"auto"}}>nur für Minderjährige</span>
                </div>
                <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                  <button onClick={saveMitgliedtyp} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                    {editMitgliedtyp?"Speichern":"Erstellen"}
                  </button>
                  <Btn onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}}>Abbrechen</Btn>
                </div>
              </div>
            </ModalOrSheet>

            {/* Info-Box */}
            <InfoBox color={BL} text={
              <div>
                <div style={{fontWeight:600,marginBottom:6}}>Wie funktioniert die Pflichtfelder-Logik?</div>
                <div style={{fontSize:12,lineHeight:1.6}}>
                  Der <strong>Mitgliedtyp</strong> definiert die Basis-Pflichtfelder und ob ein Hauptkontakt erforderlich ist. Hat ein Mitglied zusätzlich eine <strong>Rolle</strong> (Spieler, Trainer…), werden die Felder der Rollen-Matrix ergänzt.
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FFBF00)",fontSize:11}}>Mitgliedtyp-Matrix</span>
                  <span style={{fontSize:13}}>+</span>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--cc-accent,#FFBF00)",fontSize:11}}>Rollen-Matrix (falls Rolle vorhanden)</span>
                  <span style={{fontSize:13}}>=</span>
                  <span style={{padding:"3px 10px",borderRadius:6,border:"0.5px solid #22c55e",color:"#15803d",fontSize:11,fontWeight:600}}>Effektive Pflichtfelder</span>
                </div>
              </div>
            }/>

            {/* Matrix 1: Mitgliedtyp */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge" size={14}/> Pflichtfelder nach Mitgliedtyp</div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>Basis-Pflichtfelder — gelten immer, unabhängig von der Rolle</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th className="cc-th" style={{textAlign:"left",minWidth:160}}>Feld</th>
                    {MITGLIEDTYPEN_PF.map(t=><th key={t} className="cc-th cc-th-center">{MITGLIEDTYPEN_SHORT[t]}</th>)}
                  </tr></thead>
                  <tbody>
                    {FELDER_TYP.map(feld=>(
                      <tr key={feld} className="cc-tr">
                        <td className="cc-td">{FELDER_TYP_LABELS[feld]}</td>
                        {MITGLIEDTYPEN_PF.map(typ=>{
                          const on=isPflichtTyp(typ,feld);
                          return(
                            <td key={typ} className="cc-td" style={{textAlign:"center"}}>
                              <div onClick={()=>toggleTyp(typ,feld,on)}
                                style={{width:20,height:20,borderRadius:5,border:`0.5px solid ${on?"#22c55e":"var(--border)"}`,background:on?"#ECFDF5":"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                {on&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Matrix 2: Rolle */}
            <Card>
              <div className="cc-section-title"><TI n="shield-check" size={14}/> Zusatzfelder nach Rolle</div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>Ergänzend zur Mitgliedtyp-Matrix — nur wenn Mitglied diese Rolle hat</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th className="cc-th" style={{textAlign:"left",minWidth:160}}>Feld</th>
                    {ROLLEN_PF.map(r=><th key={r} className="cc-th cc-th-center">{ROLLEN_PF_LABELS[r]}</th>)}
                  </tr></thead>
                  <tbody>
                    {FELDER_ROLLE.map(feld=>(
                      <tr key={feld} className="cc-tr">
                        <td className="cc-td">{FELDER_ROLLE_LABELS[feld]}</td>
                        {ROLLEN_PF.map(rolle=>{
                          const on=isPflichtRolle(rolle,feld);
                          return(
                            <td key={rolle} className="cc-td" style={{textAlign:"center"}}>
                              <div onClick={()=>toggleRolle(rolle,feld,on)}
                                style={{width:20,height:20,borderRadius:5,border:`0.5px solid ${on?"#22c55e":"var(--border)"}`,background:on?"#ECFDF5":"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                {on&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="rollen"&&(()=>{
        return(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="cc-section-title"><TI n="shield" size={14}/> Portal-Rollen</div>
                <button onClick={()=>{setEditRolle(null);setRollenForm({name:"",label:"",prioritaet:50});setShowRolleForm(true);}}
                  style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                  + Neu
                </button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                  <th className="cc-th" style={{textAlign:"left"}}>Label</th>
                  <th className="cc-th cc-th-center">Priorität</th>
                  <th className="cc-th"></th>
                </tr></thead>
                <tbody>
                  {dbPortalRollen.map(r=>(
                    <tr key={r.id} className="cc-tr">
                      <td className="cc-td" style={{fontWeight:500,fontFamily:"monospace",fontSize:12}}>{r.name}</td>
                      <td className="cc-td">{r.label}</td>
                      <td className="cc-td" style={{textAlign:"center"}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{r.prioritaet}</span>
                      </td>
                      <td className="cc-td" style={{textAlign:"right"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          <button onClick={()=>{setEditRolle(r);setRollenForm({name:r.name,label:r.label,prioritaet:r.prioritaet});setShowRolleForm(true);}}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}><TI n="edit" size={12}/></button>
                          <button onClick={()=>deleteRolle(r.id)}
                            className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}><TI n="trash" size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <ModalOrSheet open={showRolleForm} onClose={()=>{setShowRolleForm(false);setEditRolle(null);}} maxWidth={400}>
              <div style={{padding:"20px 20px 0",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <ModalTitle>{editRolle?"Rolle bearbeiten":"Neue Rolle"}</ModalTitle>
                  <button onClick={()=>{setShowRolleForm(false);setEditRolle(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
                </div>
              </div>
              <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label className="cc-label">Name (intern) *</label>
                  <input className="cc-input" value={rollenForm.name} onChange={e=>setRollenForm(p=>({...p,name:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))} placeholder="z.B. schiedsrichter" autoFocus disabled={!!editRolle}/>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Kleinbuchstaben, keine Sonderzeichen. Kann nach dem Erstellen nicht mehr geändert werden.</div>
                </div>
                <div>
                  <label className="cc-label">Label (Anzeige) *</label>
                  <input className="cc-input" value={rollenForm.label} onChange={e=>setRollenForm(p=>({...p,label:e.target.value}))} placeholder="z.B. Schiedsrichter"/>
                </div>
                <div>
                  <label className="cc-label">Priorität (tiefer = höhere Berechtigung)</label>
                  <input className="cc-input" type="number" min={1} max={999} value={rollenForm.prioritaet} onChange={e=>setRollenForm(p=>({...p,prioritaet:e.target.value}))} placeholder="50"/>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Aktuell: {dbPortalRollen.map(r=>`${r.prioritaet} ${r.label}`).join(" → ")}</div>
                </div>
                <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                  <button onClick={saveRolle} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                    {editRolle?"Speichern":"Erstellen"}
                  </button>
                  <Btn onClick={()=>{setShowRolleForm(false);setEditRolle(null);}}>Abbrechen</Btn>
                </div>
              </div>
            </ModalOrSheet>
          </div>
        );
      })()}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="feldvis"&&(
        <div>
          <InfoBox text="Steuert welche Mitglieder-Felder pro Rolle sichtbar sind. Änderungen wirken sofort." color={BL}/>
          <div style={{height:12}}/>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th className="cc-th">Feld</th>
                  {ROLLEN.map((r,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"var(--sub)",fontSize:14,textTransform:"uppercase",letterSpacing:0.4}}>{ROLLEN_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(felderNachKey).map(([key,data],i)=>(
                  <tr key={key} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{data.label}</td>
                    {ROLLEN.map(rolle=>{
                      const sichtbar=data.rollen[rolle]||false;
                      const isAdmin=rolle==="administrator";
                      return(
                        <td key={rolle} style={{padding:"9px 13px",textAlign:"center"}}>
                          <div onClick={isAdmin?undefined:()=>toggleFeld(key,rolle,!sichtbar)}
                            style={{width:20,height:20,borderRadius:4,background:sichtbar?GN:"#e5e7eb",cursor:isAdmin?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",border:`1px solid ${sichtbar?"#16a34a":"#d1d5db"}`}}>
                            {sichtbar&&<TI n="check" style={{fontSize:14,color:"#fff"}}/>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Object.keys(felderNachKey).length===0&&(
                  <tr className="cc-tr"><td colSpan={7} style={{padding:20,textAlign:"center",color:"var(--sub)",fontSize:14}}>
                    Noch keine Felder konfiguriert — SQL-Schema importieren
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: API-VERBINDUNGEN ── */}
      {/* ── TAB: AUSSEHEN ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="aussehen"&&(
        <div style={{maxWidth:600}}>
          <InfoBox text="Farben und Branding des Portals anpassen. Änderungen werden sofort in der Vorschau angezeigt und nach dem Speichern live übernommen." color={BL}/>

          {/* Vorschau */}
          <Card style={{marginTop:14,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vorschau</div>
            <div style={{padding:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
              {/* Mini-Navbar */}
              <div style={{background:theme.navBg,borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,minWidth:180}}>
                <div style={{width:32,height:32,borderRadius:8,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  <img src={theme.logo||LOGO_B64} style={{width:32,height:32,objectFit:"cover",display:"block"}} alt="Logo"/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:theme.navText,lineHeight:1.2,letterSpacing:-0.2}}>{theme.vereinsname||"Mein Verein"}</div>
                  <div style={{fontSize:9,color:theme.navAccent||theme.vereinsfarbe1,letterSpacing:0.5,textTransform:"uppercase",fontWeight:600,marginTop:1}}>{"ClubCampus"}</div>
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:theme.btnPrimary,color:theme.btnPrimaryText,fontSize:12,fontWeight:600,cursor:"default"}}>Speichern</button>
                <span style={{padding:"4px 10px",borderRadius:20,background:theme.vereinsfarbe1,color:theme.vereinsfarbe2,fontSize:11,fontWeight:700}}>Aktiv</span>
                <div style={{width:32,height:32,borderRadius:"50%",background:theme.vereinsfarbe1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:theme.vereinsfarbe2}}>DG</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Vereinsname */}
          <Card style={{marginTop:12,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <TI n="building-community" size={18} style={{color:"var(--sub)",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--text)",marginBottom:4}}>Vereinsname</div>
                <input value={theme.vereinsname||""} onChange={e=>updateTheme("vereinsname",e.target.value)}
                  style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",outline:"none",fontFamily:FONT}}/>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:3}}>Wird unter dem Portal-Logo angezeigt</div>
              </div>
            </div>
          </Card>

          {/* Vereinslogo */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vereinslogo</div>
            <div style={{padding:16,display:"flex",alignItems:"center",gap:16}}>
              {/* Aktuelles Logo */}
              <div style={{width:72,height:72,borderRadius:14,border:"0.5px solid var(--border)",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                {theme.logo
                  ?<img src={theme.logo} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="Logo"/>
                  :<TI n="photo" size={28} style={{color:"var(--sub)"}}/>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--text)",marginBottom:6}}>Logo hochladen</div>
                <div style={{fontSize:11,color:"var(--sub)",marginBottom:10}}>SVG oder PNG, empfohlen mind. 200×200px</div>
                <Row align="flex-start">
                  <label style={{
                    display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",
                    borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",
                    color:"var(--sub)",fontSize:12,fontWeight:600,cursor:"pointer"
                  }}>
                    <TI n="upload" size={13}/>Datei wählen
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const file=e.target.files?.[0];
                      if(!file) return;
                      const reader=new FileReader();
                      reader.onload=ev=>{updateTheme("logo",ev.target.result);};
                      reader.readAsDataURL(file);
                    }}/>
                  </label>
                  {theme.logo&&(
                    <Btn onClick={()=>updateTheme("logo",null)}>
                      <Row gap={6}><TI n="trash" size={13}/>Entfernen</Row>
                    </Btn>
                  )}
                </Row>
              </div>
            </div>
          </Card>

          {/* Farb-Einstellungen */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            {[
              {key:"vereinsfarbe1",  label:"Vereinsfarbe",              hint:"Hauptfarbe des Vereins — für Badges, Highlights, aktive Elemente"},
              {key:"vereinsfarbe2",  label:"Text auf Vereinsfarbe",    hint:"Muss auf der Vereinsfarbe gut lesbar sein"},

              {key:"navBg",          label:"Menü Hintergrund",          hint:"Hintergrundfarbe der Navigationsleiste"},
              {key:"navText",        label:"Menü Text",                 hint:"Farbe der inaktiven Menüpunkte"},
              {key:"navHover",       label:"Menü Hover",                hint:"Farbe beim Überfahren eines Menüpunkts"},
              {key:"navAccent",      label:"Menü Aktiv Hintergrund",    hint:"Standard: Vereinsfarbe — bei Bedarf anpassen"},
              {key:"navAccentText",  label:"Menü Aktiv Text",           hint:"Standard: Text auf Vereinsfarbe — bei Bedarf anpassen"},

              {key:"avatarBg",       label:"Avatar Hintergrund",        hint:"Standard: Vereinsfarbe"},
              {key:"avatarText",     label:"Avatar Text",               hint:"Standard: Text auf Vereinsfarbe"},

              {key:"btnPrimary",     label:"Button Hintergrund",        hint:"Hintergrundfarbe für Haupt-Buttons"},
              {key:"btnPrimaryText", label:"Button Text",               hint:"Textfarbe für Haupt-Buttons"},
            ].map((item,i)=>(
              <div key={item.key} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderTop:i>0?"0.5px solid var(--border)":"none"}}>
                <input type="color" value={theme[item.key]||(item.key==="navAccent"||item.key==="avatarBg"?theme.vereinsfarbe1:item.key==="navAccentText"||item.key==="avatarText"?theme.vereinsfarbe2||"#000000":"#000000")||"#000000"} onChange={e=>updateTheme(item.key,e.target.value)}
                  style={{width:36,height:36,borderRadius:8,border:"0.5px solid var(--border)",padding:2,cursor:"pointer",background:"none"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{item.label}</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{item.hint}</div>
                </div>
                <code style={{fontSize:11,color:"var(--sub)",background:"var(--surface2)",padding:"2px 7px",borderRadius:5}}>{theme[item.key]||(["navAccent","navAccentText","avatarBg","avatarText"].includes(item.key)?"auto":"")}</code>
                <Btn variant="ghost" onClick={()=>{
                  const autoKeys=["navAccent","navAccentText","avatarBg","avatarText"];
                  updateTheme(item.key, autoKeys.includes(item.key)?null:(THEME_DEFAULT_STATIC[item.key]??null));
                }} title="Zurücksetzen" style={{padding:4}}>
                  <TI n="refresh" size={14}/>
                </Btn>
              </div>
            ))}
          </Card>

          {/* Speichern */}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn variant="primary" onClick={saveTheme} style={{padding:"9px 24px",fontSize:14,fontWeight:700}}>
              Speichern & anwenden
            </Btn>
            <Btn onClick={()=>{
              setAppTheme(THEME_DEFAULT_STATIC);
              setThemeDirty(false);
              if(applyTheme) applyTheme(THEME_DEFAULT_STATIC);
              try{localStorage.setItem("cc-theme",JSON.stringify(THEME_DEFAULT_STATIC));}catch{}
              if(supabase){
                const q=vereinId
                  ?supabase.from("vereine").update({theme:THEME_DEFAULT_STATIC}).eq("id",vereinId)
                  :supabase.from("vereine").update({theme:THEME_DEFAULT_STATIC});
                q.then(({error:e})=>{setSaveMsg(e?"Fehler: "+e.message:"Standard gespeichert ✓");setTimeout(()=>setSaveMsg(""),2500);});
              }
            }}>
              Standard wiederherstellen
            </Btn>
          </div>
        </div>
      )}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
          <div style={{height:16}}/>
          <div className="cc-grid-cards" style={{gap:14}}>
            {(apiVerbindungen.length>0?apiVerbindungen:Object.entries(API_INFOS).map(([key,info])=>({key,label:key,active:false,konfiguriert:false,sync_status:"deaktiviert",...info}))).map(api=>{
              const info=API_INFOS[api.key]||{};
              const statusColor=api.sync_status==="ok"?GN:api.sync_status==="fehler"?R:api.sync_status==="ausstehend"?AM:"#aaa";
              const statusBg=api.sync_status==="ok"?"#ECFDF5":api.sync_status==="fehler"?RL:api.sync_status==="ausstehend"?"#FFFBEB":"#f5f5f3";
              return(
                <Card key={api.key}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <Row>
                      <TI n="plug" style={{fontSize:18,color:api.active?BK:"#ccc"}}/>
                      <span style={{fontWeight:700,fontSize:14}}>{api.label||api.key}</span>
                    </Row>
                    <Chip text={api.sync_status||"deaktiviert"} color={statusColor} bg={statusBg}/>
                  </div>
                  <p style={{fontSize:14,color:"var(--sub)",margin:"0 0 10px",lineHeight:1.5}}>{info.description||"Externe API-Verbindung"}</p>
                  {info.felder&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginBottom:4}}>Synchronisierte Daten:</div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:"var(--sub)",padding:"2px 0"}}>
                          <TI n="check" style={{fontSize:14,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {api.letzter_sync&&(
                    <div style={{fontSize:14,color:"var(--sub)",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                    </div>
                  )}
                  <Row align="flex-start">
                    {api.active&&<Btn sm variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    <Btn sm variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>
                  </Row>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT-LOGS ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="audit"&&(
        <div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Zeit","API / System","Status","Neu","Aktualisiert","Fehler","Details"].map((h,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:14,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.length===0&&(
                  <tr className="cc-tr"><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14}}>Noch keine Sync-Logs vorhanden</td></tr>
                )}
                {auditLogs.map((log,i)=>(
                  <tr key={log.id} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",color:"var(--sub)",whiteSpace:"nowrap",fontSize:14}}>
                      {log.gestartet_am?new Date(log.gestartet_am).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"}):"—"}
                    </td>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{log.api_verbindungen?.label||"System"}</td>
                    <td style={{padding:"9px 13px"}}><Chip text={log.status||"—"} color={log.status==="ok"?GN:log.status==="fehler"?R:AM} bg={log.status==="ok"?"#ECFDF5":log.status==="fehler"?RL:"#FFFBEB"}/></td>
                    <td style={{padding:"9px 13px",color:GN,fontWeight:600}}>{log.datensaetze_neu||0}</td>
                    <td style={{padding:"9px 13px",color:BL,fontWeight:600}}>{log.datensaetze_aktualisiert||0}</td>
                    <td style={{padding:"9px 13px",color:log.datensaetze_fehler>0?R:"#aaa",fontWeight:600}}>{log.datensaetze_fehler||0}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:14,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.meldung||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}


      {/* ── TAB: DESIGN-TOKENS ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="tokens"&&(
        <DesignTokensKonfigurator isMobile={isMobile} FONT={FONT} GN={GN} R={R} RL={RL} BL={BL} AM={AM}/>
      )}

      {/* ── TAB: DESIGN-SYSTEM ── */}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="designsystem"&&(
        <div style={{display:"flex",flexDirection:"column",gap:32}}>

          {/* Section Helper */}
          {(()=>{
            const Section=({title,desc,children})=>(
              <div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:800,color:"var(--text)",letterSpacing:-0.3,marginBottom:4}}>{title}</div>
                  {desc&&<div style={{fontSize:14,color:"var(--sub)"}}>{desc}</div>}
                </div>
                <Card style={{padding:20}}>
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>{children}</div>
                </Card>
              </div>
            );
            const CSS_DEFS={
  "cc-btn-group": "display:flex; align-items:center; border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--surface2)",
  "cc-btn-group-active": "background:var(--text)!important; color:var(--bg)!important",
  "cc-btn-group-item": "height:32px; min-width:32px; padding:0 8px; border:none; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--sub); transition:background 0.15s,color 0.15s; flex-shrink:0",
  "cc-btn-group-sep": "width:1px; height:20px; background:var(--border); flex-shrink:0",
  "cc-card": "background:var(--surface)!important; border-color:var(--border)!important; box-shadow:var(--card-shadow)!important",
  "cc-chip-toggle": "padding:4px 12px; border-radius:20px; border:1.5px solid var(--border); background:transparent; color:var(--sub); font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap; flex-shrink:0",
  "cc-divider": "height:1px; background:var(--border); flex-shrink:0",
  "cc-flex-center": "display:flex; align-items:center; justify-content:center",
  "cc-icon-btn": "width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:var(--sub); padding:0",
  "cc-input": "width:100%; padding:9px 12px; border-radius:8px; border:0.5px solid var(--border); background:var(--surface2); color:var(--text); font-size:13px; font-family:inherit; box-sizing:border-box; outline:none",
  "cc-main": "background:var(--bg)!important",
  "cc-members-td": "padding:9px 12px; border-bottom:0.5px solid var(--border); font-size:13px; vertical-align:middle; color:var(--text)",
  "cc-members-th": "padding:8px 12px; background:var(--surface2); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:var(--sub); border-bottom:2px solid var(--cc-accent,#FFBF00)",
  "cc-members-tr": "hover: background var(--cc-hover) auf allen cc-td Kinder",
  "cc-multiselect": "position:relative; width:100%",
  "cc-multiselect-trigger": "width:100%; padding:8px 12px; border:0.5px solid var(--border); border-radius:8px; background:var(--surface2); cursor:pointer; display:flex; align-items:center; gap:8px",
  "cc-multiselect-chip": "display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:500; background:var(--surface); border:0.5px solid var(--border)",
  "cc-multiselect-dropdown": "position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--surface); border:0.5px solid var(--border); border-radius:10px; z-index:300; overflow:hidden",
  "cc-multiselect-item": "display:flex; align-items:center; gap:10px; padding:8px 12px; cursor:pointer; font-size:13px",
  "cc-page": "animation:cc-in 0.2s ease-out",
  "cc-seg": "display:flex; gap:2px; background:var(--surface2); border-radius:8px; padding:3px",
  "cc-seg-active": "background:var(--surface)!important; color:var(--text)!important; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,0.08)",
  "cc-seg-item": "flex:1; padding:5px 8px; border-radius:6px; border:none; cursor:pointer; font-size:12px; background:transparent; color:var(--sub); transition:all 0.15s; white-space:nowrap",
  "cc-shimmer": "background:linear-gradient(90deg,var(--surface2) 25%,var(--border) 50%,var(--surface2) 75%); background-size:200% 100%; animation:cc-shimmer 1.4s ease-in-out infinite",
  "cc-td": "padding:8px 10px; border-bottom:0.5px solid var(--border); vertical-align:middle; font-size:13px",
  "cc-th": "padding:8px 10px; background:var(--surface2); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:var(--sub); border-bottom:2px solid var(--cc-accent,#FFBF00)",
  "cc-th-center": "text-align:center (kombiniert mit cc-th)",
  "cc-topbar": "background:var(--bg)!important; border-color:var(--border)!important",
  "cc-tr": "hover: background var(--cc-hover); cursor:pointer",
  "cc-tr-zebra": "nth-child(even): background var(--surface2); nth-child(odd): background var(--surface)",
  "cc-truncate": "overflow:hidden; text-overflow:ellipsis; white-space:nowrap",
  "cc-unread-dot": "position:absolute; top:-2px; right:-2px; width:8px; height:8px; border-radius:50%; border:2px solid var(--surface)",
};
            const Row2=({label,children,code,usage})=>{
              const cssKey=code&&code.startsWith(".")?code.replace(/^\.([\w-]+).*/,"$1"):null;
              const cssDef=cssKey?CSS_DEFS[cssKey]:null;
              return(
                <div style={{display:"flex",alignItems:"flex-start",gap:16,padding:"14px 0",borderBottom:"0.5px solid var(--border)"}}>
                  <div style={{width:270,flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>{label}</div>
                    {code&&<code style={{fontSize:11,color:"#7C3AED",background:"#F5F3FF",padding:"2px 8px",borderRadius:4,display:"inline-block",marginBottom:6}}>{""+code}</code>}
                    {cssDef&&(
                      <div style={{background:"#0f0f11",borderRadius:6,padding:"7px 10px",marginBottom:6,overflowX:"auto"}}>
                        {cssDef.split(";").filter(Boolean).map((p,i)=>{
                          const parts=p.split(":");
                          const prop=parts[0];
                          const val=parts.slice(1).join(":");
                          return(
                            <div key={i} style={{fontSize:10,fontFamily:"monospace",whiteSpace:"nowrap"}}>
                              <span style={{color:"#7dd3fc"}}>{prop}:</span>
                              <span style={{color:"#86efac"}}>{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {usage&&usage.length>0&&usage[0]!=="—"&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
                        <span style={{fontSize:10,color:"var(--sub)"}}>in:</span>
                        {usage.map(u=>(
                          <span key={u} style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--surface2)",color:"var(--sub)",border:"0.5px solid var(--border)"}}>{u}</span>
                        ))}
                      </div>
                    )}
                    {usage&&usage[0]==="—"&&<span style={{fontSize:11,color:"var(--border)"}}>noch nicht verwendet</span>}
                  </div>
                  <div style={{flex:1,paddingTop:2}}>{children}</div>
                </div>
              );
            };
            return(
              <>
                {/* Buttons */}
                <Section title="Buttons & Icons" desc="Interaktive Elemente">
                  <Row2 label="Primär-Button" code="<Btn variant='primary'>">
                    <Btn variant="primary">Speichern</Btn>
                  </Row2>
                  <Row2 label="Ghost-Button" code="<Btn variant='ghost'>">
                    <Btn variant="ghost">Abbrechen</Btn>
                  </Row2>
                  <Row2 label="Standard-Button" code="<Btn>">
                    <Btn>Standard</Btn>
                  </Row2>
                  <Row2 label="Icon-Button" code=".cc-icon-btn" usage={["Nachrichten","TeamsVerwaltung","Portalverwaltung"]}>
                    <div style={{display:"flex",gap:8}}>
                      <button className="cc-icon-btn"><TI n="edit" size={14}/></button>
                      <button className="cc-icon-btn"><TI n="trash" size={14}/></button>
                      <button className="cc-icon-btn"><TI n="dots-vertical" size={14}/></button>
                    </div>
                  </Row2>
                  <Row2 label="Flex Center" code=".cc-flex-center" usage={["—"]}>
                    <div className="cc-flex-center" style={{width:80,height:40,border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface2)"}}>
                      <TI n="check" size={16} style={{color:GN}}/>
                    </div>
                  </Row2>
                  <Row2 label="Truncate" code=".cc-truncate" usage={["—"]}>
                    <div className="cc-truncate" style={{maxWidth:200,fontSize:14,color:"var(--text)"}}>Sehr langer Text der abgeschnitten wird wenn er zu lang ist</div>
                  </Row2>
                  <Row2 label="Divider" code=".cc-divider" usage={["Nachrichten","Portalverwaltung"]}>
                    <div style={{width:200}}><div className="cc-divider"/></div>
                  </Row2>
                  <Row2 label="Shimmer / Skeleton" code=".cc-shimmer" usage={["TeamsVerwaltung","clubcampus"]}>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div className="cc-shimmer" style={{height:12,width:140,borderRadius:6}}/>
                      <div className="cc-shimmer" style={{height:12,width:100,borderRadius:6}}/>
                    </div>
                  </Row2>
                  <Row2 label="Button-Group" code=".cc-btn-group" usage={["TeamsVerwaltung","Portalverwaltung"]}>
                    <div className="cc-btn-group">
                      <button className="cc-btn-group-item cc-btn-group-active"><TI n="layout-grid" size={14}/></button>
                      <button className="cc-btn-group-item"><TI n="layout-list" size={14}/></button>
                      <div className="cc-btn-group-sep"/>
                      <button className="cc-btn-group-item"><TI n="dots-vertical" size={14}/></button>
                    </div>
                  </Row2>
                </Section>

                {/* Navigation */}
                <Section title="Navigation & Tabs" desc="Segment-Controls und Filter">
                  <Row2 label="Segment-Tabs" code=".cc-seg / .cc-seg-item" usage={["Nachrichten","Portalverwaltung"]}>
                    <div className="cc-seg" style={{maxWidth:300}}>
                      <button className="cc-seg-item cc-seg-active">Alle</button>
                      <button className="cc-seg-item">Ungelesen</button>
                      <button className="cc-seg-item">Gesendet</button>
                    </div>
                  </Row2>
                  <Row2 label="Filter-Chips" code=".cc-chip-toggle / .cc-chip-active" usage={["Nachrichten","Portalverwaltung"]}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button className="cc-chip-toggle cc-chip-active">Alle</button>
                      <button className="cc-chip-toggle">Broadcast</button>
                      <button className="cc-chip-toggle">Diskussion</button>
                    </div>
                  </Row2>
                  <Row2 label="Tabs (Theme-Komponente)" code="<Tabs>">
                    <Tabs tabs={[{key:"a",label:"Tab 1"},{key:"b",label:"Tab 2"},{key:"c",label:"Tab 3"}]} active="a" setActive={()=>{}}/>
                  </Row2>
                </Section>

                {/* Chips & Badges */}
                <Section title="Chips & Badges" desc="Status-Anzeigen und Labels">
                  <Row2 label="Chip" code="<Chip>">
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <Chip text="Aktiv" color={GN}/>
                      <Chip text="Inaktiv" color="#9ca3af"/>
                      <Chip text="Admin" color={BL}/>
                      <Chip text="Fehler" color={R} bg={RL}/>
                    </div>
                  </Row2>
                  <Row2 label="Semantische Farben" code="semantic='success|danger|warning|info|primary|neutral'" usage={["Stat","Chip","InfoBox"]}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {["success","danger","warning","info","primary","neutral"].map(s=>(
                        <Chip key={s} text={s} semantic={s}/>
                      ))}
                    </div>
                  </Row2>
                  <Row2 label="Stat semantisch" code="<Stat semantic='...'>" usage={["Dashboard","MitgliederModul"]}>
                    <div style={{display:"flex",gap:8}}>
                      <Stat label="Aktiv" value={42} semantic="success"/>
                      <Stat label="Fehler" value={3} semantic="danger"/>
                      <Stat label="Info" value={8} semantic="info"/>
                    </div>
                  </Row2>
                  <Row2 label="Ungelesen-Dot" code=".cc-unread-dot" usage={["Nachrichten"]}>
                    <div style={{position:"relative",display:"inline-block"}}>
                      <div style={{width:34,height:34,borderRadius:10,background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#085041"}}>DG</div>
                      <div className="cc-unread-dot" style={{background:BL}}/>
                    </div>
                  </Row2>
                </Section>

                {/* Karten */}
                <Section title="Karten & Layout" desc="Container-Komponenten">
                  <Row2 label="Card" code="<Card>" usage={["Mitglieder","TeamsVerwaltung","clubcampus"]}>
                    <Card style={{padding:"12px 16px",maxWidth:200}}>
                      <div style={{fontSize:14,fontWeight:600}}>Karten-Inhalt</div>
                      <div style={{fontSize:12,color:"var(--sub)"}}>Beschreibung</div>
                    </Card>
                  </Row2>
                  <Row2 label="Stat" code="<Stat>">
                    <div style={{display:"flex",gap:8}}>
                      <Stat label="Teams" value="42" color={BL}/>
                      <Stat label="Mitglieder" value="380" color={GN}/>
                    </div>
                  </Row2>
                  <Row2 label="InfoBox" code="<InfoBox>">
                    <InfoBox text="Dies ist eine Informationsbox für Hinweise." color={BL}/>
                  </Row2>
                </Section>

                {/* Tabellen */}
                <Section title="Tabellen" desc="cc-th, cc-td, cc-tr — konsistentes Tabellendesign">
                  <Row2 label="Tabellen-Header" code=".cc-th" usage={["Mitgliederliste","Portalverwaltung","Mitglieder-Konfiguration"]}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>
                        <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                        <th className="cc-th cc-th-center">Rolle</th>
                        <th className="cc-th cc-th-center">Status</th>
                      </tr></thead>
                    </table>
                  </Row2>
                  <Row2 label="Tabellen-Zeile + Zelle" code=".cc-tr .cc-td" usage={["Mitgliederliste","Portalverwaltung"]}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <tbody>
                        <tr className="cc-tr"><td className="cc-td">Peter Müller</td><td className="cc-td">Trainer</td><td className="cc-td">Aktiv</td></tr>
                        <tr className="cc-tr"><td className="cc-td">Maria Meier</td><td className="cc-td">Spieler</td><td className="cc-td">Aktiv</td></tr>
                      </tbody>
                    </table>
                  </Row2>
                  <Row2 label="Members-Header" code=".cc-members-th" usage={["Mitgliederliste"]}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>
                        <th className="cc-members-th" style={{textAlign:"left"}}>Name</th>
                        <th className="cc-members-th" style={{textAlign:"center"}}>Team</th>
                      </tr></thead>
                    </table>
                  </Row2>
                </Section>

                {/* Multi-Select */}
                <Section title="Multi-Select Dropdown" desc="FunktionenMultiSelect — Suchfeld + Checkboxen + Chips">
                  <Row2 label="Trigger" code=".cc-multiselect-trigger" usage={["MitgliederModul"]}>
                    <div className="cc-multiselect" style={{maxWidth:340}}>
                      <button type="button" className="cc-multiselect-trigger">
                        <div className="cc-multiselect-chips">
                          <span className="cc-multiselect-chip">Materialwart <span className="cc-multiselect-chip-x">×</span></span>
                          <span className="cc-multiselect-chip">Stufenleitung Bc <span className="cc-multiselect-chip-x">×</span></span>
                        </div>
                        <TI n="chevron-down" size={14} style={{color:"var(--sub)",flexShrink:0}}/>
                      </button>
                    </div>
                  </Row2>
                  <Row2 label="Dropdown-Item" code=".cc-multiselect-item" usage={["MitgliederModul"]}>
                    <div style={{border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden",maxWidth:300}}>
                      <div className="cc-multiselect-group">Stufenleitende</div>
                      <div className="cc-multiselect-item">
                        <div className="cc-multiselect-cb-on"><TI n="check" size={10} style={{color:"#15803d"}}/></div>
                        <span>Stufenleitung Junioren B</span>
                      </div>
                      <div className="cc-multiselect-item">
                        <div className="cc-multiselect-cb"></div>
                        <span>Stufenleitung Senioren</span>
                      </div>
                    </div>
                  </Row2>
                </Section>

                {/* Formulare */}
                <Section title="Formulare & Eingaben" desc="Input-Felder und Selects">
                  <Row2 label="Input" code=".cc-input" usage={["Nachrichten","Portalverwaltung"]}>
                    <input className="cc-input" placeholder="Beispiel-Eingabe…" style={{maxWidth:280}}/>
                  </Row2>
                  <Row2 label="Textarea" code=".cc-input">
                    <textarea className="cc-input" placeholder="Mehrzeiliger Text…" rows={3} style={{maxWidth:280,resize:"vertical"}}/>
                  </Row2>
                  <Row2 label="Input (Theme)" code="<Input>">
                    <Input placeholder="Theme-Input…" style={{maxWidth:280}}/>
                  </Row2>
                  <Row2 label="Select (Theme)" code="<Select>">
                    <Select style={{maxWidth:280}}>
                      <option>Option 1</option>
                      <option>Option 2</option>
                    </Select>
                  </Row2>
                </Section>

                {/* Typografie */}
                <Section title="Typografie" desc="Überschriften und Text-Komponenten">
                  <Row2 label="H1" code="<H1>"><H1>Grosse Überschrift</H1></Row2>
                  <Row2 label="H2" code="<H2>"><H2>Mittlere Überschrift</H2></Row2>
                  <Row2 label="STitle" code="<STitle>"><STitle>Section Title</STitle></Row2>
                  <Row2 label="Sub" code="<Sub>"><Sub>Sekundärer Text / Beschreibung</Sub></Row2>
                  <Row2 label="Label" code="<Label>"><Label>Formular-Label</Label></Row2>
                  <Row2 label="SectionLabel" code="<SectionLabel>"><SectionLabel>Section Label</SectionLabel></Row2>
                </Section>

                {/* Avatar */}
                <Section title="Avatare" desc="Benutzer-Darstellungen">
                  <Row2 label="Av" code="<Av>">
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <Av name="Dieter Good" size={36}/>
                      <Av name="Thomas Müller" size={36}/>
                      <Av name="Anna Keller" size={28}/>
                      <Av name="Hans Berger" size={44}/>
                    </div>
                  </Row2>
                </Section>

                {/* CSS-Variablen */}
                <Section title="CSS-Variablen (Design-Tokens)" desc="Zentrale Farbwerte — automatisch für Dark/Light Mode">
                  {[
                    {name:"--bg",desc:"Seitenhintergrund"},
                    {name:"--surface",desc:"Karten & Panels"},
                    {name:"--surface2",desc:"Sekundäre Flächen"},
                    {name:"--border",desc:"Rahmen & Trennlinien"},
                    {name:"--text",desc:"Primärer Text"},
                    {name:"--sub",desc:"Sekundärer Text"},
                    {name:"--btn-primary",desc:"Primär-Button Farbe"},
                    {name:"--cc-accent",desc:"Vereinsfarbe 1 (aus Portalverwaltung)"},
                    {name:"--cc-accent2",desc:"Vereinsfarbe 2 (Kontrastfarbe)"},
                    {name:"--btn-hover",desc:"Vereinsfarbe 1 −12% (darkenHex) → Hover-State Primär-Button"},
                    {name:"--cc-hover",desc:"Vereinsfarbe 1 × 19% Opacity → Hover-Hintergründe"},
                    {name:"--cc-accent-20",desc:"Vereinsfarbe 1 × 12% → leichte Tönungen"},
                    {name:"--cc-accent-15",desc:"Vereinsfarbe 1 × 9% → sehr helle Tönungen"},
                    {name:"--cc-accent-12",desc:"Vereinsfarbe 1 × 7% → minimale Tönungen"},
                    {name:"--nav",desc:"Nav-Hintergrundfarbe"},
                    {name:"--nav-hover",desc:"Nav-Item Hover-Farbe"},
                    {name:"--avatar-bg",desc:"Avatar-Hintergrund"},
                  ].map(v=>(
                    <div key={v.name} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"0.5px solid var(--border)"}}>
                      <div style={{width:32,height:32,borderRadius:8,background:`var(${v.name})`,border:"0.5px solid var(--border)",flexShrink:0}}/>
                      <code style={{fontSize:12,color:"var(--text)",background:"var(--surface2)",padding:"3px 8px",borderRadius:6,width:160,flexShrink:0}}>{v.name}</code>
                      <span style={{fontSize:14,color:"var(--sub)"}}>{v.desc}</span>
                    </div>
                  ))}
                </Section>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export { TeamModuleMatrix, PortalverwaltungView };
