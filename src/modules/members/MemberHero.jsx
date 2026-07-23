/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberHero.jsx
   Hero-Header des Mitglied-Detailbereichs
   Kein Edit-Modal mehr — alle Felder inline editierbar in InfoTab
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef } from "react";
import { Btn, useIsMobile, DropMenu, useConfirm } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { updateMitgliedFoto, deleteMitgliedFoto, deleteMitglied, archiviereMitglied, reaktiviereMitglied, logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.js";

function MemberHero({m,raw,initials,canEdit,canDelete=false,sb,onReload,onClose,onReaktiviert=null,onRefreshCount=null,account=null,onUpdatePortalZugang=null,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null,vereinId=null}){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const fotoInputRef=useRef(null);
  const [fotoOverlay,setFotoOverlay]=useState(false);

  async function handleHeroFotoUpload(e){
    const file=e.target.files?.[0];
    if(!file) return;
    await updateMitgliedFoto(sb, raw.id, file);
    if(onReload) onReload(raw.id);
  }

  async function handleLoeschen(){
    const ok=await confirm({title:`${m.name} löschen?`,message:"Diese Aktion kann nicht rückgängig gemacht werden.",danger:true,confirmLabel:"Löschen"});
    if(!sb||!ok) return;
    await deleteMitglied(sb, raw.id);
    if(onClose) onClose();
    if(onReload) onReload(raw.id);
  }

  return(
    <>{confirmDialog}
      <div className="cc-member-hero">
        <div className="cc-member-hero-banner">
          <button className="cc-hero-banner-btn" onClick={onClose}><TI n="arrow-left" size={16}/></button>
          <div className="cc-hero-av-wrap">
            <div className={`cc-member-hero-av cc-hero-av-hoverable${canEdit?" cc-cursor-pointer":""}`}
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
                ...(canEdit&&raw.aktiv!==false?[{icon:"archive",label:"Archivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok)return;const n=account?.name||account?.email||"Administrator";if(vereinId) await logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ARCHIVIERT,"Mitglied archiviert",null,null,n);await archiviereMitglied(sb, [raw.id], n);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,false);if(onReload)onReload(raw.id);if(onRefreshCount)onRefreshCount();}}]:[]),
                ...(raw.aktiv===false?["sep",{icon:"user-check",label:"Reaktivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!ok)return;const n=account?.name||account?.email||"Administrator";if(vereinId) await logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.REAKTIVIERT,"Mitglied reaktiviert",null,null,n);await reaktiviereMitglied(sb, raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(raw.id);else if(onReload)onReload(raw.id);}}]:[]),
                "sep",
                {icon:"trash",label:"Löschen",danger:true,onClick:handleLoeschen},
              ]}/></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { MemberHero };
