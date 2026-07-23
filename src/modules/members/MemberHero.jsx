/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberHero.jsx
   Hero-Header des Mitglied-Detailbereichs
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet, useIsMobile, LandSelect, DropMenu, useConfirm } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { ROLLE_LABEL } from "../../domains/roles/roleUtils.js";
import { LAENDER } from "./memberUtils.jsx";
import { updateMitglied, updateMitgliedRolle, updateMitgliedFoto, deleteMitgliedFoto, deleteMitglied, archiviereMitglied, reaktiviereMitglied, fetchBenutzerByMitglied } from "../../domains/members/memberService.js";
function MemberHero({m,raw,initials,age,canEdit,canDelete=false,sb,onReload,onClose,onReaktiviert=null,onRefreshCount=null,account=null,onUpdatePortalZugang=null,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null}){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const [editOpen,setEditOpen]=useState(false);
  const [editForm,setEditForm]=useState({...raw});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);
  const fotoInputRef=useRef(null);
  const [fotoOverlay,setFotoOverlay]=useState(false);

  async function handleHeroFotoUpload(e){
    const file=e.target.files?.[0];
    if(!file) return;
    await updateMitgliedFoto(sb, raw.id, file);
    if(onReload) onReload(raw.id);
  }

  const MITGLIEDTYPEN=(dbMitgliedtypen||[]).length>0
    ?dbMitgliedtypen.map(t=>t.name)
    :["Aktivmitglied","Juniormitglied","Funktionär","Passivmitglied","Ehrenmitglied","Freimitglied"];

  useEffect(()=>{
    if(sb&&editOpen){
      fetchBenutzerByMitglied(sb, raw.id).then(data=>{
        if(data) setEditForm(f=>({...f,rolle:data.role||raw.rolle||"",_benutzer_id:data.id}));
        else setEditForm(f=>({...f,rolle:raw.rolle||""}));
      });
    }
  },[editOpen]);

  async function deleteMitglied(){
    const ok=await confirm({title:`${m.name} löschen?`,message:"Diese Aktion kann nicht rückgängig gemacht werden.",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await deleteMitglied(sb, raw.id);
    if(onClose) onClose();
    if(onReload) onReload(raw.id);
  }

  async function saveEdit(){
    if(!sb) return;
    setEditSaving(true); setEditMsg(null);
    const ok = await updateMitglied(sb, raw.id, {
      vorname:editForm.vorname||null, nachname:editForm.nachname||null,
      geburtsdatum:editForm.geburtsdatum||null, geschlecht:editForm.geschlecht||null,
      nationalitaet:editForm.nationalitaet||null, nationalitaet2:editForm.nationalitaet2||null, heimatort:editForm.heimatort||null,
      ahv_nr:editForm.ahv_nr||null, telefon:editForm.telefon||null,
      email:editForm.email||null, strasse:editForm.strasse||null,
      plz:editForm.plz||null, ort:editForm.ort||null, kanton:editForm.kanton||null,
      mitgliedtyp:editForm.mitgliedtyp||null, funktionen:editForm.funktionen||[],
      spielerpass:editForm.spielerpass||null, js_nr:editForm.js_nr||null,
      fairgate_id:editForm.fairgate_id||null, notizen:editForm.notizen||null,
    });
    if(ok) await updateMitgliedRolle(sb, raw.id, editForm.rolle, editForm._benutzer_id);
    if(!ok){ setEditMsg({ok:false,text:"Fehler beim Speichern"}); }
    else{
      setEditMsg({ok:true,text:"Gespeichert ✓"});
      setTimeout(()=>{setEditOpen(false);setEditMsg(null);if(onReload)onReload(raw.id);},600);
    }
    setEditSaving(false);
  }

  const mitgliedtyp=raw.mitgliedtyp||m.type;

  return(
    <>{confirmDialog}
      <div className="cc-member-hero">
        <div className="cc-member-hero-banner">
          <button className="cc-hero-banner-btn" onClick={onClose}><TI n="arrow-left" size={16}/></button>
          <div className="cc-hero-av-wrap">
            <div className="cc-member-hero-av cc-hero-av-hoverable" style={{cursor:canEdit?"pointer":"default"}}
              onClick={()=>canEdit&&(raw.foto_url?setFotoOverlay(true):fotoInputRef.current?.click())}>
              {raw.foto_url
                ?<img src={raw.foto_url} className="cc-hero-av-img" alt=""/>
                :<span className="cc-hero-av-initials">{initials}</span>
              }
              {canEdit&&!raw.foto_url&&(
                <div className="cc-hero-av-cam-overlay"><TI n="camera" size={18}/></div>
              )}
            </div>
            {canEdit&&(
              <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-hidden" onChange={handleHeroFotoUpload}/>
            )}
            {fotoOverlay&&raw.foto_url&&(
              <div className="cc-foto-overlay" onMouseDown={()=>setFotoOverlay(false)}>
                <div className="cc-foto-overlay-box" onMouseDown={e=>e.stopPropagation()}>
                  <img src={raw.foto_url} className="cc-foto-overlay-img" alt=""/>
                  <div className="cc-foto-overlay-actions">
                    <Btn onClick={()=>{setFotoOverlay(false);fotoInputRef.current?.click();}}>
                      <TI n="camera" size={14}/> Ändern
                    </Btn>
                    <Btn variant="danger" onClick={async()=>{
                      await deleteMitgliedFoto(sb, raw.id);
                      setFotoOverlay(false);
                      if(onReload) onReload();
                    }}>
                      <TI n="trash" size={14}/> Löschen
                    </Btn>
                    <button className="cc-foto-overlay-close" onMouseDown={()=>setFotoOverlay(false)}>
                      <TI n="x" size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="cc-member-hero-info">
            <h1 className="cc-page-title cc-member-hero-name">{m.name}</h1>
            <div className="cc-hero-chips">
              {(()=>{
                const ROLLE_LABEL=(dbPortalRollen||[]).length>0
                  ?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label]))
                  :{administrator:"Administrator",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Elternteil",mitglied:"Mitglied",supporter:"Supporter"};
                const TRAINER_ROLLEN=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
                const hatTrainerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN.includes(r)));
                const hatSpielerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>!TRAINER_ROLLEN.includes(r)));
                const portalRolle=(benutzer?.role||raw.rolle||null);
                const portalRolleClean=portalRolle&&portalRolle!=="-"?portalRolle:null;
                const chips=[];
                if(portalRolleClean) chips.push({label:ROLLE_LABEL[portalRolleClean]||portalRolleClean,type:"portal"});
                if(hatTrainerKader&&portalRolleClean!=="trainer") chips.push({label:ROLLE_LABEL["trainer"]||"Trainer",type:"kader"});
                if(hatSpielerKader&&portalRolleClean!=="spieler") chips.push({label:ROLLE_LABEL["spieler"]||"Spieler/in",type:"kader"});
                const MAX=isMobile?2:(chips||[]).length;
                const visible=chips.slice(0,MAX);
                const hidden=(chips||[]).length-MAX;
                return(
                  <>
                    {visible.map((c,i)=>(<span key={i} className={c.type==="portal"?"cc-hero-chip cc-hero-chip-primary":"cc-hero-chip"}>{c.label}</span>))}
                    {hidden>0&&<span className="cc-hero-chip">+{hidden}</span>}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="cc-hero-banner-actions">
            <div className="cc-hero-status-strip">
              {raw.aktiv!==false&&<span className="cc-hero-status-pill cc-hero-status-pill-ok"><TI n="circle-check" size={11}/>Aktiv</span>}
              {raw.aktiv===false&&<span className="cc-hero-status-pill cc-hero-status-pill-err"><TI n="user-off" size={11}/>Inaktiv</span>}
              {raw.fairgate_id&&<span className="cc-hero-status-pill"><TI n="refresh" size={11}/>Fairgate OK</span>}
              {!raw.geprueft&&<span className="cc-hero-status-pill cc-hero-status-pill-warn"><TI n="alert-triangle" size={11}/>Prüfung offen</span>}
            </div>
            {(canEdit||canDelete)&&(
              <div className="cc-hero-menu-trigger"><DropMenu items={[
                ...(canEdit?[{icon:"edit",label:"Bearbeiten",onClick:()=>{setEditForm({...raw});setEditOpen(true);}}]:[]),
                ...(canEdit&&raw.aktiv!==false?[{icon:"archive",label:"Archivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok)return;const n=account?.name||account?.email||"Administrator";await archiviereMitglied(sb, [raw.id], n);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,false);if(onReload)onReload(raw.id);if(onRefreshCount)onRefreshCount();}}]:[]),
                ...(raw.aktiv===false?["sep",{icon:"user-check",label:"Reaktivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!ok)return;await reaktiviereMitglied(sb, raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(raw.id);else if(onReload)onReload(raw.id);}}]:[]),
                "sep",
                {icon:"trash",label:"Löschen",danger:true,onClick:()=>deleteMitglied()},
              ]}/></div>
            )}
          </div>
        </div>

      </div>
      {editOpen&&(
        <ModalOrSheet open={true} onClose={()=>setEditOpen(false)} maxWidth={560}>
          <div className="cc-modal-hdr">
            <div className="cc-modal-title">{m.name} bearbeiten</div>
            <Btn variant="ghost" small onClick={()=>setEditOpen(false)}><TI n="x" size={14}/></Btn>
          </div>
          <div className="cc-modal-body">
            <div className="cc-form-row">
              {/* Personalien */}
              <div className="cc-form-section-title" data-label="Personalien"/>
              {[
                {k:"vorname",      l:"Vorname"},
                {k:"nachname",     l:"Nachname"},
                {k:"geburtsdatum", l:"Geburtsdatum", type:"date"},
                {k:"geschlecht",   l:"Geschlecht",   opts:[{v:"m",l:"Männlich"},{v:"w",l:"Weiblich"}]},
                {k:"nationalitaet", l:"Nationalität",  isLaender:true},
                {k:"nationalitaet2",l:"Nationalität 2",isLaender:true},
                {k:"heimatort",    l:"Heimatort"},
                {k:"ahv_nr",       l:"AHV-Nr."},
              ].map(({k,l,type="text",opts,isLaender})=>(
                <div key={k}>
                  <label className="cc-label">{l}</label>
                  {isLaender?(
                    <LandSelect value={editForm[k]||""} onChange={v=>setEditForm(f=>({...f,[k]:v}))} laender={LAENDER}/>
                  ):opts?(
                    <select className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}>
                      <option value="">–</option>
                      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ):(
                    <input className="cc-input" type={type} value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
                  )}
                </div>
              ))}
              {/* Kontakt */}
              <div className="cc-form-section-title cc-form-full" data-label="Kontakt"/>
              {[
                {k:"email",   l:"E-Mail",  type:"email", full:true},
                {k:"telefon", l:"Telefon", type:"tel"},
                {k:"strasse", l:"Strasse", full:true},
                {k:"plz",     l:"PLZ"},
                {k:"ort",     l:"Ort"},
                {k:"kanton",  l:"Kanton"},
              ].map(({k,l,type="text",full})=>(
                <div key={k} className={full?"cc-form-full":""}>
                  <label className="cc-label">{l}</label>
                  <input className="cc-input" type={type} value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
                </div>
              ))}
              {/* Vereinsdaten */}
              <div className="cc-form-section-title cc-form-full" data-label="Vereinsdaten"/>
              {/* Mitgliedtyp Single-Select */}
              <div>
                <label className="cc-label">Mitgliedtyp</label>
                <select className="cc-input" value={editForm.mitgliedtyp||""} onChange={e=>setEditForm(f=>({...f,mitgliedtyp:e.target.value}))}>
                  <option value="">– wählen –</option>
                  {MITGLIEDTYPEN.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Portal-Rolle — immer sichtbar */}
              <div>
                <label className="cc-label">Portal-Rolle</label>
                <select className="cc-input" value={editForm.rolle||""} onChange={e=>setEditForm(f=>({...f,rolle:e.target.value}))}>
                  <option value="">– keine –</option>
                  {((dbPortalRollen||[]).length>0?dbPortalRollen:[{name:"administrator",label:"Administrator"},{name:"administration",label:"Verwaltung"},{name:"funktionaer",label:"Funktionär"},{name:"trainer",label:"Trainer"},{name:"spieler",label:"Spieler"},{name:"eltern",label:"Eltern"},{name:"mitglied",label:"Mitglied"},{name:"supporter",label:"Supporter"}]).map(r=>(
                    <option key={r.name} value={r.name}>{r.label}</option>
                  ))}
                </select>
              </div>

              {[
                {k:"spielerpass", l:"Spielerpass"},
                {k:"js_nr",       l:"J+S Nr."},
                {k:"fairgate_id", l:"Fairgate-ID"},
              ].map(({k,l})=>(
                <div key={k}>
                  <label className="cc-label">{l}</label>
                  <input className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
                </div>
              ))}

            </div>
            {editMsg&&<div className={`cc-badge ${editMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{editMsg.text}</div>}
          </div>
          <div className="cc-modal-ftr">
            <Btn onClick={()=>setEditOpen(false)}>Abbrechen</Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={editSaving}>
              {editSaving?"Speichert…":"Speichern"}
            </Btn>
          </div>
        </ModalOrSheet>
      )}
    </>
  );
}

export { MemberHero };
