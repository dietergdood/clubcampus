/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberDetail.jsx
   Detailansicht — State, Navigation, Tab-Routing
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         Toolbar, ColMenuButton, SortHeader, useConfirm, ConfirmDialog } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../../constants.js";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.js";
import { currentSeason } from "../../domains/season/seasonUtils.js";
import { MemberHero, FotoUpload } from "./MemberHero.jsx";
import { ElternTab } from "./ElternTab.jsx";
import { LAENDER, getLandName, getFieldVisibility, RolleChip } from "./memberUtils.jsx";
import { NotizenVerlauf } from "./NotizenVerlauf.jsx";
import { InfoTab } from "./InfoTab.jsx";
import { PortalTab } from "./PortalTab.jsx";
import { DatenpruefungTab } from "./DatenpruefungTab.jsx";

function MemberDetail({
m, onClose, onNavToTeam=null, onReaktiviert=null,
sb, role, account,
dbMitglieder=[], dbMitgliedtypen=[], dbPortalRollen=[], dbKaderRollen=[],
kannVerwalten, onReload, onUpdatePortalZugang=null,
setSelectedMember, selectedMember,
reloadMember, refreshArchivCount, brauchtEltern,
}){
  const dbRaw=dbMitglieder.find(d=>d.id===m.id)||{};
  const raw={...dbRaw,...Object.fromEntries(Object.entries(m).filter(([k,v])=>v!==undefined&&v!==null||!dbRaw[k]))};
  const fv=getFieldVisibility(role);
  const tab=selectedMember?._tab||"info";
  const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
  const canEdit=kannVerwalten("members")&&!m._readonly;
  const canDelete=kannVerwalten("members");
  const TRAINER_KEYS=(dbKaderRollen||[]).filter(r=>r.ist_trainer).map(r=>r.name);
  const ROLLE_LABEL=Object.fromEntries([
    ...(dbPortalRollen||[]).map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
  const isMobile=useIsMobile();
  const [portalLoading,setPortalLoading]=useState(false);
  const [benutzer,setBenutzer]=useState(null);
  const [mehrOpen,setMehrOpen]=useState(false);
  const mehrRef=useRef(null);
  useEffect(()=>{
    if(!mehrOpen) return;
    const handler=(e)=>{if(mehrRef.current&&!mehrRef.current.contains(e.target))setMehrOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[mehrOpen]);
  const [portalMsg,setPortalMsg]=useState(null);
  const [ahvVisible,setAhvVisible]=useState(false);
  const [notizenCount,setNotizenCount]=useState(null);
  const [linkEmail,setLinkEmail]=useState(raw.email||"");
  const [teamDetails,setTeamDetails]=useState(null);
  const [showTeamAssign,setShowTeamAssign]=useState(false);
  const [allTeams,setAllTeams]=useState([]);
  const [assignFunktionen,setAssignFunktionen]=useState([]);
  const [showFunkAssign,setShowFunkAssign]=useState(false);
  const [funkSearch,setFunkSearch]=useState("");
  const [funkSelected,setFunkSelected]=useState([]);
  const [teamAssignForm,setTeamAssignForm]=useState({team_id:"",funktionen:["Spieler/in"],rueckennr:"",position:""});
  const [teamFunkOpen,setTeamFunkOpen]=useState(false);
  const [teamAssignSaving,setTeamAssignSaving]=useState(false);
  const [editTeam,setEditTeam]=useState(null);
  const [editTeamForm,setEditTeamForm]=useState({funktionen:[],rueckennr:"",position:""});
  const [editTeamFunkOpen,setEditTeamFunkOpen]=useState(false);
  const [teamAssignRolleSearch,setTeamAssignRolleSearch]=useState("");
  const [editTeamRolleSearch,setEditTeamRolleSearch]=useState("");
  const [editTeamSaving,setEditTeamSaving]=useState(false);
  const [elternLoaded,setElternLoaded]=useState(null);
  const eltern=elternLoaded!==null?elternLoaded:(raw.eltern||[]);

  useEffect(()=>{
    if((tab==="eltern"||(tab==="info"&&brauchtEltern(raw.mitgliedtyp)))&&sb&&raw.id&&elternLoaded===null){
      sb.from("elternkontakte").select("*").eq("mitglied_id",raw.id)
        .then(({data})=>setElternLoaded(data||[]));
    }
  },[tab,raw.id]);

  useEffect(()=>{
    if(sb&&raw.id&&teamDetails===null){
      sb.from("kader")
        .select("*, teams(id,name,kurzname)")
        .eq("mitglied_id",raw.id).eq("aktiv",true)
        .then(({data})=>setTeamDetails(data||[]));
    }
  },[raw.id]);

  useEffect(()=>{
    if(showTeamAssign&&sb){
      if(allTeams.length===0)
        sb.from("teams").select("id,name,kurzname").eq("aktiv",true).order("name")
          .then(({data})=>setAllTeams(data||[]));
      if(assignFunktionen.length===0)
        sb.from("portal_funktionen").select("id,name,portal_gruppen(name)").order("name")
          .then(({data})=>setAssignFunktionen(data||[]));
    }
  },[showTeamAssign]);

  useEffect(()=>{
    if(sb&&assignFunktionen.length===0){
      sb.from("portal_funktionen").select("id,name,portal_gruppen(name,farbe)").order("name")
        .then(({data})=>setAssignFunktionen(data||[]));
    }
  },[raw.id]);

  useEffect(()=>{
    if(showFunkAssign){
      setFunkSelected(raw.funktionen||[]);
      setFunkSearch("");
    }
  },[showFunkAssign]);

  async function ableitRolle(){
    if(!sb||!raw.id) return;
    const neueRolle=await ableitUndSaveRolle(sb,raw.id,dbKaderRollen,raw.mitgliedtyp,raw.funktionen);
    setBenutzer(prev=>prev?{...prev,role:neueRolle}:{role:neueRolle});
    if(onReload) onReload();
  }

  async function assignTeam(){
    if(!sb||!teamAssignForm.team_id) return;
    setTeamAssignSaving(true);
    await sb.from("kader").upsert({
      team_id:parseInt(teamAssignForm.team_id),
      mitglied_id:raw.id,
      rollen:teamAssignForm.funktionen||["Spieler/in"],
      rueckennr:teamAssignForm.rueckennr||null,
      position:teamAssignForm.position||null,
      aktiv:true,
      saison:currentSeason(),
    },{onConflict:"team_id,mitglied_id,saison"});
    const {data}=await sb.from("kader").select("*, teams(id,name,kurzname)").eq("mitglied_id",raw.id).eq("aktiv",true);
    if(data) setTeamDetails(data);
    await ableitRolle();
    setShowTeamAssign(false);
    setTeamAssignForm({team_id:"",funktionen:["Spieler/in"],rueckennr:"",position:""});
    setTeamFunkOpen(false);
    setTeamAssignSaving(false);
  }

  async function saveFunktionen(){
    if(!sb) return;
    await sb.from("mitglieder").update({funktionen:funkSelected}).eq("id",raw.id);
    setShowFunkAssign(false);
    if(onReload) onReload();
  }

  async function removeFromTeam(kaderId){
    const ok=await confirm({title:"Aus Team entfernen?",confirmLabel:"Entfernen"});if(!sb||!ok) return;
    await sb.from("kader").update({aktiv:false}).eq("id",kaderId);
    setTeamDetails(prev=>prev.filter(k=>k.id!==kaderId));
    await ableitRolle();
  }

  async function saveEditTeam(){
    if(!sb||!editTeam) return;
    setEditTeamSaving(true);
    await sb.from("kader").update({
      rollen:editTeamForm.funktionen||[],
      rueckennr:editTeamForm.rueckennr||null,
      position:editTeamForm.position||null,
    }).eq("id",editTeam.id);
    setTeamDetails(prev=>prev.map(k=>k.id===editTeam.id
      ?{...k,rollen:editTeamForm.funktionen,rueckennr:editTeamForm.rueckennr,position:editTeamForm.position}
      :k
    ));
    await ableitRolle();
    setEditTeam(null);
    setEditTeamFunkOpen(false);
    setEditTeamSaving(false);
  }
  const age=raw.geburtsdatum?Math.floor((new Date()-new Date(raw.geburtsdatum))/31557600000):null;
  const initials=(m.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

  useEffect(()=>{
    if(sb&&raw.id&&benutzer===null){
      sb.from("benutzer").select("*").eq("mitglied_id",raw.id).maybeSingle()
        .then(({data})=>setBenutzer(data));
    }
  },[raw.id]);

  useEffect(()=>{
    if(tab==="portal"&&sb&&raw.id){
      setPortalLoading(true);
      sb.from("benutzer").select("*").eq("mitglied_id",raw.id).maybeSingle()
        .then(({data})=>{setBenutzer(data);setPortalLoading(false);});
    }
  },[tab,raw.id]);

  async function handleLink(){
    if(!sb||!linkEmail) return;
    setPortalLoading(true); setPortalMsg(null);
    const {data:existing}=await sb.from("benutzer").select("id,email,role").eq("email",linkEmail).maybeSingle();
    if(existing){
      const neueRolle=await ableitUndSaveRolle(sb,raw.id,dbKaderRollen,raw.mitgliedtyp,raw.funktionen);
      await sb.from("mitglieder").update({hat_portal_zugang:true}).eq("id",raw.id);
      await sb.from("benutzer").update({mitglied_id:raw.id, role:neueRolle}).eq("id",existing.id);
      setPortalMsg({ok:true,text:`Verknüpft ✓ — Rolle: ${neueRolle}`});
      if(onReload) onReload();
    } else {
      setPortalMsg({ok:false,text:"Kein Benutzer mit dieser E-Mail gefunden."});
    }
    setPortalLoading(false);
  }

  async function handleUnlink(){
    if(!sb) return;
    await sb.from("mitglieder").update({hat_portal_zugang:false}).eq("id",raw.id);
    await sb.from("benutzer").update({mitglied_id:null}).eq("mitglied_id",raw.id);
    setBenutzer(null); setPortalMsg({ok:true,text:"Verknüpfung aufgehoben"});
    if(onReload) onReload();
  }

  return(
    <div className="cc-col cc-gap-12 cc-member-detail-wrap">
      {/* Hero Header */}
      <MemberHero m={m} raw={raw} initials={initials} age={age} canEdit={canEdit} canDelete={canDelete}
        sb={sb} onReload={(id)=>id?reloadMember(id):onReload()} onClose={onClose} onReaktiviert={onReaktiviert} onRefreshCount={refreshArchivCount}
        account={account} onUpdatePortalZugang={onUpdatePortalZugang}
        dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
        benutzer={benutzer} teamDetails={teamDetails}
      />
      {(()=>{
        const allTabs=[
          {key:"info",           label:"Profil",          icon:"user"},
          {key:"eltern",         label:`Eltern (${eltern.length})`, icon:"heart"},
          {key:"stats",          label:"Statistik",       icon:"chart-bar"},
          {key:"helpers",        label:"Helfereinsätze",   icon:"heart-handshake"},
          {key:"entwicklung",    label:"Entwicklung",     icon:"trending-up"},
          {key:"portal",       label:"Portal-Zugang", icon:"key"},
          {key:"datenpruefung",label:"Datenprüfung",  icon:"shield-check"},
        ];
        const MOBILE_VISIBLE=3;
        const visibleTabs=isMobile?allTabs.slice(0,MOBILE_VISIBLE):allTabs;
        const moreTabs=isMobile?allTabs.slice(MOBILE_VISIBLE):[];
        const moreActive=moreTabs.some(t=>t.key===tab);
        return(
          <div className="cc-member-tabs">
            {visibleTabs.map(t=>(
              <button key={t.key}
                className={`cc-member-tab${tab===t.key?" cc-member-tab-active":""}`}
                onClick={()=>setTab(t.key)}
              >
                {t.icon&&<TI n={t.icon} size={13}/>}
                {t.label}
              </button>
            ))}
            {moreTabs.length>0&&(
              <>
                <div ref={mehrRef} className="cc-mehr-btn-wrap">
                  <button
                    className={`cc-member-tab${moreActive?" cc-member-tab-active":""}`}
                    onClick={()=>setMehrOpen(o=>!o)}
                  >
                    <TI n="dots" size={13}/>
                    {"Mehr"}
                  </button>
                  {mehrOpen&&!isMobile&&(
                    <div className="cc-mehr-dropdown">
                      {moreTabs.map(t=>(
                        <button key={t.key} className={`cc-mehr-item${tab===t.key?" cc-mehr-item-active":""}`}
                          onClick={()=>{setTab(t.key);setMehrOpen(false);}}
                        >
                          {t.icon&&<TI n={t.icon} size={14}/>}
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {isMobile&&mehrOpen&&(
                  <div className="cc-mehr-sheet-overlay">
                    <div className="cc-mehr-sheet-backdrop" onMouseDown={()=>setMehrOpen(false)}/>
                    <div className="cc-mehr-sheet-box">
                      <div className="cc-mehr-sheet-handle"/>
                      <div className="cc-mehr-sheet-title">Weitere Tabs</div>
                      {moreTabs.map(t=>(
                        <button key={t.key}
                          className={`cc-mehr-sheet-item${tab===t.key?" cc-mehr-sheet-item-active":""}`}
                          onMouseDown={(e)=>{e.stopPropagation();setTab(t.key);setMehrOpen(false);}}
                        >
                          {t.icon&&<TI n={t.icon} size={18}/>}
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}
      {tab==="info"&&(
        <InfoTab
          raw={raw} tab={tab} canEdit={canEdit} sb={sb} role={role} account={account}
          dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen}
          dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
          kannVerwalten={kannVerwalten} onReload={onReload} onNavToTeam={onNavToTeam}
          onClose={onClose} brauchtEltern={brauchtEltern}
          TRAINER_KEYS={TRAINER_KEYS} ROLLE_LABEL={ROLLE_LABEL}
          editField={editField} setEditField={setEditField}
          editVal={editVal} setEditVal={setEditVal}
          saving={saving} setSaving={setSaving}
          ahvVisible={ahvVisible} setAhvVisible={setAhvVisible}
          showTeamAssign={showTeamAssign} setShowTeamAssign={setShowTeamAssign}
          teamAssignForm={teamAssignForm} setTeamAssignForm={setTeamAssignForm}
          teamAssignSearch={teamAssignSearch} setTeamAssignSearch={setTeamAssignSearch}
          teamAssignRolleSearch={teamAssignRolleSearch} setTeamAssignRolleSearch={setTeamAssignRolleSearch}
          editTeamIdx={editTeamIdx} setEditTeamIdx={setEditTeamIdx}
          editTeamForm={editTeamForm} setEditTeamForm={setEditTeamForm}
          editTeamRolleSearch={editTeamRolleSearch} setEditTeamRolleSearch={setEditTeamRolleSearch}
          showFunkAssign={showFunkAssign} setShowFunkAssign={setShowFunkAssign}
          funkSearch={funkSearch} setFunkSearch={setFunkSearch}
          funkSelected={funkSelected} setFunkSelected={setFunkSelected}
          roleEditOpen={roleEditOpen} setRoleEditOpen={setRoleEditOpen}
          notizenCount={notizenCount} setNotizenCount={setNotizenCount}
          teamsPopover={teamsPopover} setTeamsPopover={setTeamsPopover}
          setTab={setTab}
        />
      )}
      {tab==="eltern"&&<ElternTab eltern={eltern} canEdit={canEdit} raw={raw} sb={sb} onReload={onReload} setElternLoaded={setElternLoaded}/>}
      {tab==="portal"&&(
        <PortalTab
          raw={raw} tab={tab} canEdit={canEdit} sb={sb} role={role} account={account}
          dbPortalRollen={dbPortalRollen} kannVerwalten={kannVerwalten}
          onReload={onReload} onUpdatePortalZugang={onUpdatePortalZugang}
          portalData={portalData} setPortalData={setPortalData}
          portalLoading={portalLoading} setPortalLoading={setPortalLoading}
        />
      )}
      {tab==="datenpruefung"&&(
        <DatenpruefungTab
          raw={raw} tab={tab} canEdit={canEdit} sb={sb}
          kannVerwalten={kannVerwalten} onReload={onReload}
          onProfilGeprueft={onProfilGeprueft}
        />
      )}
      {(tab==="stats"||tab==="comments"||tab==="ratings")&&(
        <div className="cc-empty cc-empty-lg">
          <TI n="hourglass" size={32} className="cc-empty-icon"/>
          Kommt bald
        </div>
      )}
    </div>
  );
}


export { MemberDetail };
