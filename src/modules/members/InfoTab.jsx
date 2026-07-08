/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/InfoTab.jsx
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
import { LAENDER, getLandName, getFieldVisibility, RolleChip } from "./memberUtils.jsx";
import { NotizenVerlauf } from "./NotizenVerlauf.jsx";

export function InfoTab({raw,tab,canEdit,sb,role,account,dbMitglieder,dbMitgliedtypen,dbPortalRollen,dbKaderRollen,kannVerwalten,onReload,onNavToTeam,onClose,brauchtEltern,TRAINER_KEYS,ROLLE_LABEL,editField,setEditField,editVal,setEditVal,saving,setSaving,ahvVisible,setAhvVisible,showTeamAssign,setShowTeamAssign,teamAssignForm,setTeamAssignForm,teamAssignSearch,setTeamAssignSearch,teamAssignRolleSearch,setTeamAssignRolleSearch,editTeamIdx,setEditTeamIdx,editTeamForm,setEditTeamForm,editTeamRolleSearch,setEditTeamRolleSearch,showFunkAssign,setShowFunkAssign,funkSearch,setFunkSearch,funkSelected,setFunkSelected,roleEditOpen,setRoleEditOpen,notizenCount,setNotizenCount,teamsPopover,setTeamsPopover,setTab}) {
  const isMobile = useIsMobile();
  const [confirm,confirmDialog] = useConfirm();

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


  return (
    <div style={{display:'contents'}}>  
      {tab==="info"&&(
      <div className="cc-member-stats">
        <StatusTile label="Mitgliedschaft"   value={raw.mitgliedtyp||"—"}                                                    icon="id-badge-2"    semantic="neutral"/>
        <StatusTile label="Datenprüfung"  value={raw.geprueft?"Geprüft":"Ausstehend"}                                        icon={raw.geprueft?"shield-check":"alert-circle"} semantic={raw.geprueft?"ok":"warn"}
          action={!raw.geprueft&&canEdit?{label:"Prüfung starten",onClick:()=>setTab("datenpruefung")}:null}/>
        <StatusTile label="Portal-Zugang" value={raw.hat_portal_zugang?(isMobile?"OK":"Eingerichtet"):(isMobile?"Fehlt":"Nicht eingerichtet")} icon="key" semantic={raw.hat_portal_zugang?"ok":"warn"}
          action={!raw.hat_portal_zugang&&canEdit?{label:"Zugang erstellen",onClick:()=>setTab("portal")}:null}/>
        <StatusTile label="Fairgate"      value={raw.fairgate_id?(isMobile?"Sync":"Synchronisiert"):"—"}                     icon="refresh"       semantic={raw.fairgate_id?"ok":"neutral"}/>
      </div>
      )}

      {/* Tab: Profil */}
      {tab==="info"&&(
        <div className="cc-grid-2">
          {/* Personalien */}
          <Card>
            <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
            <div className="cc-info-grid">
            {[
              {l:"Nachname",     v:raw.nachname||null},
              {l:"Vorname",      v:raw.vorname||null},
              ...(age?[{l:"Alter",v:`${age} Jahre`}]:[]),
              ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum?new Date(raw.geburtsdatum).toLocaleDateString("de-CH"):null}]:[]),
              {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":raw.geschlecht||null},
              {l:"Nationalität", v:raw.nationalitaet||null, flag:raw.nationalitaet?raw.nationalitaet.toUpperCase():null, flagName:raw.nationalitaet?getLandName(raw.nationalitaet):null, flag2:raw.nationalitaet2?raw.nationalitaet2.toUpperCase():null, flagName2:raw.nationalitaet2?getLandName(raw.nationalitaet2):null},
              {l:"Heimatort",    v:raw.heimatort||null},
              ...(fv.showAhv?[{l:"AHV-Nr.",v:raw.ahv_nr||null,masked:true}]:[]),
            ].filter(r=>canEdit||r.v).map((r,i)=>(
              <div key={i} className="cc-info-row">
                <span className="cc-info-key">{r.l}</span>
                {r.flag?(
                  <span className="cc-info-val cc-row cc-gap-6" style={{flexWrap:"wrap"}}>
                    <span className="cc-row cc-gap-4"><span className="cc-land-badge">{r.flag}</span><span>{r.flagName}</span></span>
                    {r.flag2&&<><span style={{color:"var(--sub)"}}>·</span><span className="cc-row cc-gap-4"><span className="cc-land-badge">{r.flag2}</span><span>{r.flagName2}</span></span></>}
                  </span>
                ):(
                  r.masked&&r.v
                  ?<span className="cc-ahv-row">
                    {ahvVisible
                      ?<span className="cc-info-val">{r.v}</span>
                      :<span className="cc-ahv-mask">••• •• ••••</span>
                    }
                    <button className="cc-ahv-toggle" onClick={()=>setAhvVisible(v=>!v)} title={ahvVisible?"Verbergen":"Anzeigen"}>
                      <TI n={ahvVisible?"eye-off":"eye"} size={14}/>
                    </button>
                  </span>
                  :<span className={r.v?"cc-info-val":"cc-info-val-empty"}>{r.v||"—"}</span>
                )}
              </div>
            ))}
            </div>
          </Card>

          {/* Kontakt + Hauptkontakt */}
          {(fv.showEmail||fv.showTelefon||fv.showAdresse)&&(()=>{
            const hk=brauchtEltern(raw.mitgliedtyp)?eltern.find(e=>e.hauptkontakt):null;
            const hkName=hk?(hk.name||`${hk.vorname||""} ${hk.nachname||""}`.trim()||"?"):null;
            const hkTel=hk?(hk.telefon||hk.tel):null;
            return(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
                <div className="cc-info-grid">
                {[
                  ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||null, link:`mailto:${raw.email}`}]:[]),
                  ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||null}]:[]),
                  ...(fv.showAdresse?[
                    {l:"Strasse",v:raw.strasse||null},
                    {l:"PLZ/Ort",v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:null},
                  ]:[]),
                ].filter(r=>canEdit||r.v).map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className={r.v?"cc-info-val":"cc-info-val-empty"} style={r.link?{color:"var(--cc-blue,#0369a1)"}:{}}>{r.v||"—"}</span>
                  </div>
                ))}
                </div>
                {/* Hauptkontakt als Mini-Karte */}
                {hk&&(
                  <>
                    <div className="cc-hk-sub-label">
                      <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
                      <button className="cc-hk-tab-link" onClick={()=>setTab("eltern")}>
                        Eltern ({eltern.length}) <TI n="chevron-right" size={12}/>
                      </button>
                    </div>
                    <div className="cc-hk-card">
                      <Av name={hkName} size="md" bg="rgba(255,191,0,0.15)"/>
                      <div className="cc-hk-content">
                        <div className="cc-text-bold">{hkName}</div>
                        <div className="cc-text-sm cc-text-sub">{hk.beziehung||"—"}</div>
                        {hk.email&&<div className="cc-text-sm cc-contact-link">{hk.email}</div>}
                        {hkTel&&<div className="cc-text-sm cc-text-sub">{hkTel}</div>}
                      </div>
                    </div>
                  </>
                )}
                {brauchtEltern(raw.mitgliedtyp)&&!hk&&(
                  <>
                    <div className="cc-hk-sub-label">
                      <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
                      <button className="cc-hk-tab-link" onClick={()=>setTab("eltern")}>
                        Eltern ({eltern.length}) <TI n="chevron-right" size={12}/>
                      </button>
                    </div>
                    <div className="cc-warn-box"><TI n="alert-triangle" size={14}/> Kein Hauptkontakt — bitte im Tab "Eltern" festlegen</div>
                  </>
                )}
              </Card>
            );
          })()}

          {/* Vereinsdaten */}
          <Card className="cc-card-full">
            <div className="cc-section-title"><TI n="building-community" size={14}/> Vereinsdaten</div>
            <div className="cc-info-grid">
              {[
                ...(fv.showPass?[{l:"Spielerpass",v:raw.spielerpass||null},{l:"J+S Nr.",v:raw.js_nr||null}]:[]),
                ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||null}]:[]),
                {l:"Eintritt", v:raw.eintrittsdatum?new Date(raw.eintrittsdatum).toLocaleDateString("de-CH"):null},
              ].filter(r=>canEdit||r.v).map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className={r.v?"cc-info-val":"cc-info-val-empty"}>{r.v||"—"}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Teams */}
          <Card>
            <div className="cc-section-title"><TI n="users" size={14}/> Teams</div>
            {teamDetails===null&&<div className="cc-text-sm cc-text-sub">Lade…</div>}
            {teamDetails!==null&&teamDetails.length===0&&(
              <div className="cc-text-sm cc-text-sub">Keinem Team zugewiesen.</div>
            )}
            {(teamDetails||[]).map((k,i)=>(
              <div key={i} className={`cc-team-position-row${isMobile&&onNavToTeam?" cc-team-position-row-mobile":""}`}
                onClick={isMobile&&onNavToTeam?()=>onNavToTeam(k.team_id):undefined}
              >
                <div className="cc-list-item-icon"><TI n="ball-football" size={13}/></div>
                <div className="cc-team-position-body">
                  {!isMobile&&onNavToTeam
                    ?<span className="cc-team-position-name-link" onClick={e=>{e.stopPropagation();onNavToTeam(k.team_id);}}>{k.teams?.name||"—"}</span>
                    :<div className="cc-team-position-name">{k.teams?.name||"—"}</div>
                  }
                  {(k.rollen||["Spieler/in"]).length>0&&(
                    <div className="cc-team-position-chips">
                      {[...(k.rollen||["Spieler/in"])].sort((a,b)=>{
                        const aT=dbKaderRollen.some(kr=>kr.name===a&&kr.ist_trainer);
                        const bT=dbKaderRollen.some(kr=>kr.name===b&&kr.ist_trainer);
                        return aT===bT?0:aT?-1:1;
                      }).map((r,ri)=>{
                        const isTrainer=dbKaderRollen.some(kr=>kr.name===r&&kr.ist_trainer);
                        return <span key={ri} className={isTrainer?"cc-role-chip cc-role-chip-trainer":"cc-role-chip"}>{r}</span>;
                      })}
                    </div>
                  )}
                </div>
                <DropMenu items={[
                  ...(canEdit?[
                    {label:"Bearbeiten", icon:"edit", onClick:()=>{setEditTeamForm({funktionen:k.rollen||[],rueckennr:k.rueckennr||"",position:k.position||""});setEditTeam(k);}},
                    "sep",
                    {label:"Entfernen", icon:"trash", danger:true, onClick:()=>removeFromTeam(k.id)},
                  ]:[]),
                ]}/>
              </div>
            ))}
            {canEdit&&(
              <button className="cc-team-add-btn" onClick={()=>setShowTeamAssign(true)}>
                <TI n="plus" size={14}/> Team zuweisen
              </button>
            )}
          </Card>

          {/* Vereinsfunktionen */}
          {(true)&&(
            <Card>
              <div className="cc-section-title"><TI n="briefcase" size={14}/> Vereinsfunktionen</div>
              {(raw.funktionen||[]).length===0&&(
                <div className="cc-text-sm cc-text-sub">Keine Vereinsfunktionen.</div>
              )}
              {(raw.funktionen||[]).map((f,i)=>{
                const funkObj=assignFunktionen.find(x=>x.name===f);
                const gruppe=funkObj?.portal_gruppen?.name||null;
                return(
                  <div key={i} className="cc-team-position-row">
                    <div className="cc-list-item-icon"><TI n="briefcase" size={13}/></div>
                    <div className="cc-team-position-body">
                      <div className="cc-team-position-name">{f}</div>
                      {gruppe&&(
                        <div className="cc-team-position-chips">
                          <span className="cc-funk-gruppe-badge" style={funkObj?.portal_gruppen?.farbe?{background:funkObj.portal_gruppen.farbe+"20",color:funkObj.portal_gruppen.farbe,borderColor:funkObj.portal_gruppen.farbe+"40"}:{}}>{gruppe}</span>
                        </div>
                      )}
                    </div>
                    {canEdit&&(
                      <DropMenu items={[
                        {label:"Entfernen", icon:"trash", danger:true, hidden:!canDelete, onClick:async()=>{
                          const next=(raw.funktionen||[]).filter(x=>x!==f);
                          await sb.from("mitglieder").update({funktionen:next}).eq("id",raw.id);
                          if(onReload) onReload();
                        }},
                      ]}/>
                    )}
                  </div>
                );
              })}
              {canEdit&&(
                <button className="cc-team-add-btn" onClick={()=>setShowFunkAssign(true)}>
                  <TI n="plus" size={14}/> Funktion hinzufügen
                </button>
              )}
            </Card>
          )}

          {/* Funktion hinzufügen Modal */}
          <ModalOrSheet open={showFunkAssign} onClose={()=>setShowFunkAssign(false)} maxWidth={420}>
            <div className="cc-modal-hdr">
              <ModalTitle>Funktion hinzufügen</ModalTitle>
              <button className="cc-icon-btn" onClick={()=>setShowFunkAssign(false)}><TI n="x" size={14}/></button>
            </div>
            <div className="cc-modal-body cc-col">
              <input className="cc-input" placeholder="Suchen…" value={funkSearch}
                onChange={e=>setFunkSearch(e.target.value)} autoFocus/>
              <div className="cc-list-scroll">
                {(()=>{
                  const filtered=assignFunktionen.filter(f=>
                    !funkSearch||f.name.toLowerCase().includes(funkSearch.toLowerCase())||
                    (f.portal_gruppen?.name||"").toLowerCase().includes(funkSearch.toLowerCase())
                  );
                  const groups=[...new Set(filtered.map(f=>f.portal_gruppen?.name||"Weitere"))];
                  return groups.map(g=>(
                    <div key={g}>
                      <div className="cc-hk-sub-label">{g}</div>
                      {filtered.filter(f=>(f.portal_gruppen?.name||"Weitere")===g).map(f=>{
                        const on=funkSelected.includes(f.name);
                        return(
                          <div key={f.id} className="cc-multiselect-item"
                            onClick={()=>setFunkSelected(prev=>on?prev.filter(x=>x!==f.name):[...prev,f.name])}>
                            <div className={on?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                              {on&&<TI n="check" size={10} className="cc-check-icon"/>}
                            </div>
                            <span>{f.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="cc-modal-ftr">
              <Btn onClick={()=>setShowFunkAssign(false)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={saveFunktionen}>Speichern</Btn>
            </div>
          </ModalOrSheet>

          {/* Team zuweisen Modal */}
          <ModalOrSheet open={showTeamAssign} onClose={()=>setShowTeamAssign(false)} maxWidth={560}>
            <div className="cc-modal-hdr">
              <ModalTitle>Team zuweisen</ModalTitle>
              <button className="cc-icon-btn" onClick={()=>setShowTeamAssign(false)}><TI n="x" size={14}/></button>
            </div>
            <div className="cc-modal-body cc-col">
              <div>
                <label className="cc-label">Team</label>
                <select className="cc-input" value={teamAssignForm.team_id} onChange={e=>setTeamAssignForm(p=>({...p,team_id:e.target.value}))}>
                  <option value="">– wählen –</option>
                  {allTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="cc-label">Rolle im Team</label>
                <div className="cc-search-input-wrap">
                  <span className="cc-search-input-icon">
                    <TI n="search" size={14}/>
                  </span>
                  <input className="cc-search-input" placeholder="Suchen…" value={teamAssignRolleSearch||""}
                    onChange={e=>setTeamAssignRolleSearch(e.target.value)}/>
                </div>
                <div className="cc-role-list-wrap">
                  {dbKaderRollen.filter(r=>!(teamAssignRolleSearch)||r.name.toLowerCase().includes((teamAssignRolleSearch||"").toLowerCase())).map(r=>{
                    const sel=(teamAssignForm.funktionen||[]).includes(r.name);
                    return(
                      <div key={r.name} className={`cc-role-list-item${sel?" cc-role-list-item-selected":""}`}
                        onClick={()=>setTeamAssignForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==r.name):[...(p.funktionen||[]),r.name]}))}>
                        <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                          {sel&&<TI n="check" size={10} className="cc-check-icon"/>}
                        </div>
                        <span className="cc-role-name">{r.name}</span>
                        {r.ist_trainer&&<span className="cc-trainer-badge">Trainer</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            <div className="cc-modal-ftr">
              <Btn onClick={()=>setShowTeamAssign(false)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={assignTeam} disabled={!teamAssignForm.team_id||teamAssignSaving}>
                {teamAssignSaving?"Wird zugewiesen…":"Zuweisen"}
              </Btn>
            </div>
          </ModalOrSheet>

          {/* Edit Team Modal */}
          <ModalOrSheet open={!!editTeam} onClose={()=>{setEditTeam(null);setEditTeamFunkOpen(false);}} maxWidth={560}>
            {editTeam&&(
              <>
                <div className="cc-modal-hdr">
                  <div>
                    <ModalTitle>{editTeam.teams?.name||"Team"} bearbeiten</ModalTitle>
                    <div className="cc-text-sm cc-text-sub">Saison 2025/26</div>
                  </div>
                  <button className="cc-icon-btn" onClick={()=>{setEditTeam(null);setEditTeamFunkOpen(false);}}><TI n="x" size={14}/></button>
                </div>
                <div className="cc-modal-body cc-col">
                  <div>
                    <label className="cc-label">Rolle im Team</label>
                    <div className="cc-search-input-wrap">
                      <span className="cc-search-input-icon">
                        <TI n="search" size={14}/>
                      </span>
                      <input className="cc-search-input" placeholder="Suchen…" value={editTeamRolleSearch||""}
                        onChange={e=>setEditTeamRolleSearch(e.target.value)}/>
                    </div>
                    <div className="cc-role-list-wrap">
                      {dbKaderRollen.filter(r=>!(editTeamRolleSearch)||r.name.toLowerCase().includes((editTeamRolleSearch||"").toLowerCase())).map(r=>{
                        const sel=(editTeamForm.funktionen||[]).includes(r.name);
                        return(
                          <div key={r.name} className={`cc-role-list-item${sel?" cc-role-list-item-selected":""}`}
                            onClick={()=>setEditTeamForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==r.name):[...(p.funktionen||[]),r.name]}))}>
                            <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                              {sel&&<TI n="check" size={10} className="cc-check-icon"/>}
                            </div>
                            <span className="cc-role-name">{r.name}</span>
                            {r.ist_trainer&&<span className="cc-trainer-badge">Trainer</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
                <div className="cc-modal-ftr">
                  <Btn onClick={()=>{setEditTeam(null);setEditTeamFunkOpen(false);}}>Abbrechen</Btn>
                  <Btn variant="primary" onClick={saveEditTeam} disabled={editTeamSaving}>
                    {editTeamSaving?"Speichert…":"Speichern"}
                  </Btn>
                </div>
              </>
            )}
          </ModalOrSheet>

          {/* Notizen */}
          {fv.showNotizen&&(
            <Card className="cc-card-full">
              <div className="cc-section-title">
                <TI n="notes" size={14}/> Notizen
                {notizenCount>0&&<span className="cc-notiz-count-badge">{notizenCount}</span>}
              </div>
              <NotizenVerlauf mitgliedId={raw.id} canEdit={canEdit} sb={sb} dbUser={account} onCount={setNotizenCount}/>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Eltern */}
    </div>
  );
}
