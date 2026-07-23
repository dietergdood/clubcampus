/* ═══════════════════════════════════════════════════════════════
   ClubCampus — MitgliederModul.jsx
   State, Logik und Koordination — Render via MembersView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useMemo } from "react";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../constants.js";
import { TI } from "../icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         useConfirm, ConfirmDialog,
         Tabs, STitle, Between, Sub, Label, Select, Empty, InfoBox } from "../theme.jsx";
import { ableitUndSaveRolle } from "../domains/roles/roleUtils.js";
import { archiviereMitglied, deleteMitglied, fetchArchiv, fetchArchivCount, fetchMitglied, fetchAlleElternkontakte } from "../domains/members/memberService.js";
import { currentSeason } from "../domains/season/seasonUtils.js";
import { LAENDER, getLandName, RolleChip, getFieldVisibility } from "./members/memberUtils.jsx";
import { ROLES, FIELD_VIS, SAVED_VIEWS, COL_GROUPS, ALL_COLS, GROUP_OPTIONS, GROUP_OPTIONS_MORE } from "./members/memberConstants.js";
import { mapMembers, filterMembers, sortMembers, buildGroups, exportData as exportDataUtil } from "./members/memberDataUtils.js";
import { ArchivView } from "./members/ArchivView.jsx";
import { ElternListView } from "./members/ElternListView.jsx";
import { ListView } from "../shared/list/ListView.jsx";
import { MemberDetail } from "./members/MemberDetail.jsx";

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null,vereinId=null}){
  const isMobile=useIsMobile();
  const [confirm,confirmDialog]=useConfirm();
  const [teamsPopover,setTeamsPopover]=useState(null);
  const [expandedTeams,setExpandedTeams]=useState(new Set());
  const [portalFunktionen,setPortalFunktionen]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
  const [breakdownOpen,setBreakdownOpen]=useState(false);
  const breakdownRef=useRef(null);
  useEffect(()=>{
    if(!breakdownOpen||isMobile) return;
    const h=e=>{if(breakdownRef.current&&!breakdownRef.current.contains(e.target))setBreakdownOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[breakdownOpen,isMobile]);


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

  const TRAINER_KEYS=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
  const ROLLE_LABEL=Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
  const funktionenGruppenMap=Object.fromEntries(
    (portalFunktionen||[]).map(f=>[f.name,f.portal_gruppen?.name||null])
  );
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

  const dpColor=s=>s==="Geprueft"?GN:s==="Ausstehend"?AM:R;

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
    const vals = b.key==="__trainer"?{rollen:["Trainer/in"]}:
                 b.key==="__funktionaer"?{rollen:["Funktionär"]}:
                 {mitgliedschaft:[b.key]};
    if(filterRef.current) filterRef.current(vals);
    setBreakdownOpen(false);
  }

  /* Portal-Zugang Zelle */
  function PortalBadge({val}){
    if(val==="Aktiv") return <span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>;
    if(val==="Deaktiviert") return <span className="cc-portal-status cc-portal-status-deaktiviert"><span className="cc-portal-dot"/> Deaktiviert</span>;
    return <span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>;
  }
  /* Datenpruefung Zelle */
  function DpBadge({val}){
    if(val==="Geprueft") return <span className="cc-dp-status cc-dp-status-ok"><span className="cc-dp-dot"/> Geprüft</span>;
    if(val==="Ausstehend") return <span className="cc-dp-status cc-dp-status-warn"><span className="cc-dp-dot"/> Ausstehend</span>;
    return <span className="cc-dp-status cc-dp-status-err"><span className="cc-dp-dot"/> {val||"Unbekannt"}</span>;
  }

  // Zellen-Rendering (wiederverwendbar)
  function renderCell(col,m,groupContext={type:"none",key:null},filterVals={}){
    const gc=groupContext;
    switch(col.key){
      case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}/>:<span className="cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}><Av name={m.name||"?"} size={26}/></span>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
      case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-mitglied">{m.mitgliedschaft||"—"}</td>;
      case "rollen": {
        const portalRaw=m.role&&m.role!=="-"?m.role:null;
        const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;
        const roleClass=!portalRaw?"":
          (portalRaw==="administrator"||portalRaw==="administration")?"cc-role-chip-admin":
          portalRaw==="trainer"?"cc-role-chip-trainer":
          (portalRaw==="spieler"||portalRaw==="spielerin")?"cc-role-chip-spieler":
          (portalRaw==="funktionaer"||portalRaw==="funktionär")?"cc-role-chip-funktionaer":
          portalRaw==="eltern"?"cc-role-chip-eltern":"";
        return <td key="rollen" className="cc-members-td">
          {portalLabel
            ?<span className={`cc-role-chip cc-role-chip-sm ${roleClass}`}>{portalLabel}</span>
            :<span className="cc-members-td-sub">—</span>}
        </td>;
      }
      case "teams": {
        if(gc.type==="gruppe") return <td key="teams" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsToShow=gc.type==="team"?(m.teams||[]).filter(t=>(t?.name||t)===gc.key):(m.teams||[]);
        return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{teamsToShow.length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{teamsToShow.slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{teamsToShow.length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:teamsToShow,x:e.clientX,y:e.clientY});}}>+{teamsToShow.length-1}</button>}</span>):"—"}</td>;
      }
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
      case "nachname": return <td key="nachname" className="cc-members-td cc-members-td-sub">{m.nachname||"—"}</td>;
      case "vorname": return <td key="vorname" className="cc-members-td cc-members-td-sub">{m.vorname||"—"}</td>;
      case "heimatort": return <td key="heimatort" className="cc-members-td cc-members-td-sub">{m.heimatort||"—"}</td>;
      case "ahv_nr": return <td key="ahv_nr" className="cc-members-td cc-members-td-sub">{m.ahv_nr||"—"}</td>;
      case "strasse": return <td key="strasse" className="cc-members-td cc-members-td-sub">{m.strasse||"—"}</td>;
      case "teams_rollen": {
        if(gc.type==="gruppe") return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsFilter=filterVals["teams"]||[];
        const kaderFilter=filterVals["kaderrollen"]||[];
        // Bei Kaderrolle-Gruppierung: nur Einträge mit dieser Rolle
        if(gc.type==="kaderrolle"){
          const eFiltered=(m.kader_eintraege||[]).map(e=>({...e,rollen:e.rollen.filter(r=>r===gc.key)})).filter(e=>e.rollen.length>0);
          if(eFiltered.length===0) return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
          return <td key="teams_rollen" className="cc-members-td">
            <div className="cc-col cc-gap-4">
              {eFiltered.slice(0,3).map((e,i)=>(
                <div key={i} className="cc-teams-rollen-row">
                  <span className="cc-teams-rollen-team">{e.team?.kurz||e.team?.name||"—"}</span>
                  <span className="cc-teams-rollen-sep">·</span>
                  {e.rollen.map((r,ri)=><span key={ri} className="cc-teams-rollen-rolle">{r}</span>)}
                </div>
              ))}
            </div>
          </td>;
        }
        // Bei Team+Kaderrolle Mehrfachgruppierung: Team-Kontext + Kaderrolle als Subkontext
        const rolleFilter=gc.subType==="kaderrolle"?[gc.subKey]:(kaderFilter.length>0?kaderFilter:null);
        const eintraege=(m.kader_eintraege||[]).filter(e=>{
          const teamMatch=gc.type==="team"?e.team?.name===gc.key:(teamsFilter.length===0||teamsFilter.includes(e.team?.name));
          const rolleMatch=rolleFilter?e.rollen.some(r=>rolleFilter.includes(r)):true;
          return teamMatch&&rolleMatch;
        }).sort((a,b)=>{
          const aIsTrainer=a.rollen.some(r=>TRAINER_KEYS.includes(r));
          const bIsTrainer=b.rollen.some(r=>TRAINER_KEYS.includes(r));
          return aIsTrainer===bIsTrainer?0:aIsTrainer?-1:1;
        });
        if(eintraege.length===0) return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        const isExpanded=expandedTeams.has(m.id);
        const visibleE=isExpanded?eintraege:eintraege.slice(0,2);
        const restE=eintraege.length-2;
        return <td key="teams_rollen" className="cc-members-td">
          <div className="cc-col cc-gap-4">
            {visibleE.map((e,i)=>{
              const rollenToShow=rolleFilter?e.rollen.filter(r=>rolleFilter.includes(r)):e.rollen;
              return(
                <div key={i} className="cc-teams-rollen-row">
                  <span className="cc-teams-rollen-team">{e.team?.kurz||e.team?.name||"—"}</span>
                  {rollenToShow.length>0&&<>
                    <span className="cc-teams-rollen-sep">·</span>
                    {rollenToShow.map((r,ri)=>(
                      <span key={ri} className="cc-teams-rollen-rolle">{r}{ri<rollenToShow.length-1?", ":""}</span>
                    ))}
                  </>}
                </div>
              );
            })}
            {restE>0&&(
              <button className="cc-teams-rollen-more" style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}
                onClick={e=>{e.stopPropagation();setExpandedTeams(prev=>{const n=new Set(prev);n.has(m.id)?n.delete(m.id):n.add(m.id);return n;})}}>
                {isExpanded
                  ? <><TI n="chevron-up" size={10}/>weniger</>
                  : <><TI n="chevron-down" size={10}/>+{restE} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      case "funktionen_gruppen": {
        if(gc.type==="team") return <td key="funktionen_gruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const paare=(gc.type==="funktion"
          ?(m.funktionen||[]).filter(f=>f===gc.key)
          :(m.funktionen||[])).map(f=>{
          const pf=portalFunktionen.find(x=>x.name===f);
          return {funktion:f, gruppe:pf?.portal_gruppen?.name||null};
        }).filter(p=>{
          if(gc.type==="funktion") return true;
          if(gc.type==="gruppe") return p.gruppe===gc.key;
          return gruppenFilter.length===0||gruppenFilter.includes(p.gruppe);
        });
        if(paare.length===0) return <td key="funktionen_gruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const isFExpanded=expandedTeams.has("f_"+m.id);
        const visible=isFExpanded?paare:paare.slice(0,2);
        const rest=paare.length-2;
        return <td key="funktionen_gruppen" className="cc-members-td">
          <div className="cc-col cc-gap-4">
            {visible.map((p,i)=>(
              <div key={i} className="cc-teams-rollen-row">
                {p.gruppe&&<span className="cc-teams-rollen-team">{p.gruppe}</span>}
                {p.gruppe&&p.funktion&&<span className="cc-teams-rollen-sep">·</span>}
                <span className="cc-teams-rollen-rolle">{p.funktion}</span>
              </div>
            ))}
            {rest>0&&(
              <button className="cc-teams-rollen-more" style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}
                onClick={e=>{e.stopPropagation();setExpandedTeams(prev=>{const n=new Set(prev);n.has("f_"+m.id)?n.delete("f_"+m.id):n.add("f_"+m.id);return n;})}}>
                {isFExpanded
                  ? <><TI n="chevron-up" size={10}/>weniger</>
                  : <><TI n="chevron-down" size={10}/>+{rest} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      case "funktionen": {
        if(gc.type==="team") return <td key="funktionen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const funktionenToShow=gc.type==="gruppe"
          ?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return pf?.portal_gruppen?.name===gc.key;})
          :(gruppenFilter.length>0?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return gruppenFilter.includes(pf?.portal_gruppen?.name);}):(m.funktionen||[]));
        return <td key="funktionen" className="cc-members-td cc-members-td-sub">{funktionenToShow.join(", ")||"—"}</td>;
      }
      case "kaderrollen": {
        if(gc.type==="gruppe") return <td key="kaderrollen" className="cc-members-td cc-members-td-sub">—</td>;
        const kaderFilter=filterVals["kaderrollen"]||[];
        const rollenToShow=gc.type==="team"
          ?( kaderFilter.length>0?(m.kader_rollen_raw||[]).filter(r=>kaderFilter.includes(r)):(m.kader_rollen_raw||[]) )
          :(m.kader_rollen_raw||[]);
        return <td key="kaderrollen" className="cc-members-td">{rollenToShow.length===0?"—":rollenToShow.map((r,i)=>{const isT=TRAINER_KEYS.some(k=>k===r);return <span key={i} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`}>{r}</span>;})}</td>;
      }
      case "funktionsgruppen": {
        if(gc.type==="team") return <td key="funktionsgruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const gruppenToShow=gc.type==="gruppe"
          ?[(gc.key)]
          :(gruppenFilter.length>0?(m.funktionsgruppen||[]).filter(g=>gruppenFilter.includes(g)):(m.funktionsgruppen||[]));
        return <td key="funktionsgruppen" className="cc-members-td">{gruppenToShow.length===0?"—":gruppenToShow.map((g,i)=>{const pf=portalFunktionen.find(f=>f.portal_gruppen?.name===g);const farbe=pf?.portal_gruppen?.farbe;return <span key={i} className="cc-funk-gruppe-badge" style={farbe?{background:farbe+"20",color:farbe,borderColor:farbe+"40"}:{}}>{g}</span>;})}</td>;
      }
      default: return <td key={col.key} className="cc-members-td cc-members-td-sub">{m[col.key]||"—"}</td>;
    }
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
      {/* KPI */}
      <div className="cc-grid-stats cc-mb-20">
        {/* Mitglieder Card mit Aufschlüsselung */}
        <div ref={breakdownRef} style={{position:"relative"}}>
          <Stat label="Mitglieder" value={totalCount} color={BL}
            onClick={()=>setBreakdownOpen(o=>!o)}
          />
          {breakdownOpen&&(
            isMobile?(
              <div className="cc-mehr-sheet-overlay" onClick={()=>setBreakdownOpen(false)}>
                <div className="cc-mehr-sheet-backdrop"/>
                <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                  <div className="cc-mehr-sheet-handle"/>
                  <div className="cc-mehr-sheet-title">Aufschlüsselung</div>
                  {BREAKDOWN.map(b=>(
                    <button key={b.key} className="cc-mehr-sheet-item" onMouseDown={e=>{e.stopPropagation();setBreakdownOpen(false);bdFilter(b);}}>
                      <span className="cc-kpi-breakdown-label">{b.label}</span>
                      <span className="cc-kpi-breakdown-value">{bdCount(b)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div className="cc-breakdown-popover">
                <div className="cc-breakdown-popover-title">Aufschlüsselung</div>
                {BREAKDOWN.map(b=>(
                  <button key={b.key} className="cc-breakdown-popover-item" onClick={()=>{setBreakdownOpen(false);bdFilter(b);}}>
                    <span>{b.label}</span>
                    <span className="cc-kpi-breakdown-value">{bdCount(b)}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
        <Stat label="Portal aktiv" value={portalAktiv} color={GN}/>
        <Stat label="Prüfung offen" value={dpOffen} color={AM}/>
        <Stat label="Ohne Team" value={ohneTeam} color={AM}/>
      </div>

      {/* Gespeicherte Ansichten - nur Desktop */}


      <ListView
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