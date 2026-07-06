/* ================================================================
   ClubCampus MemberDetailModul — MemberDetailModul.jsx
   Mitglied-Detailansicht (Profil, Hero, Tabs, Eltern, Notizen)
   ================================================================ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile, useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect } from "./theme.jsx";

function getLandName(code){
  if(!code) return null;
  return LAENDER.find(l=>l.c===code.toUpperCase())?.n||code;
}

const ROLES = {
  administrator: {
    label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings",
    desc:"Vollzugriff: alle Module, Systemeinstellungen, Benutzerverwaltung",
    level:7
  },
  vorstand: {
    label:"Vorstand", color:"var(--text)", bg:"#F5F5F5", icon:"scale",
    desc:"Strategische Übersicht: alle Teams, Mitglieder lesen, Auswertungen — kein System, kein AHV",
    level:6
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


/* ── Hilfsfunktionen ── */
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* -- DATA -- */

function getFieldVisibility(role){
  const lvl = ROLES[role]?.level||0;
  return {
    showAhv:       lvl>=5 && role==="administration" || role==="administrator",
    showGebdat:    lvl>=3,   // ab trainer
    showAdresse:   lvl>=5,   // ab administration
    showTelefon:   lvl>=3,   // ab trainer
    showEmail:     lvl>=2,   // ab spieler (eigene)
    showPass:      lvl>=3,   // ab trainer
    showFairgateId:lvl>=5,   // ab administration
    showNotizen:   lvl>=5,   // ab administration
  };
}

/* ── MemberHero: Hero-Header mit Edit-Modal ── */

function elternAvColor(beziehung){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}

function MemberHero({m,raw,initials,age,canEdit,canDelete=false,sb,onReload,onClose,onReaktiviert=null,onRefreshCount=null,account=null,onUpdatePortalZugang=null,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null}){
  const isMobile=useIsMobile();
  const [heroMenuOpen,setHeroMenuOpen]=useState(false);
  const heroMenuRef=useRef(null);
  useEffect(()=>{
    function close(e){if(heroMenuRef.current&&!heroMenuRef.current.contains(e.target))setHeroMenuOpen(false);}
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);
  const [editOpen,setEditOpen]=useState(false);
  const [editForm,setEditForm]=useState({...raw});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);
  const fotoInputRef=useRef(null);
  const [fotoOverlay,setFotoOverlay]=useState(false);

  async function handleHeroFotoUpload(e){
    const file=e.target.files?.[0];
    if(!file) return;
    const ext=file.name.split(".").pop();
    const path=`${raw.id}/foto.${ext}`;
    await sb.storage.from("mitglieder-fotos").upload(path,file,{upsert:true});
    const {data}=sb.storage.from("mitglieder-fotos").getPublicUrl(path);
    await sb.from("mitglieder").update({foto_url:data.publicUrl+"?t="+Date.now()}).eq("id",raw.id);
    if(onReload) onReload();
  }

  const MITGLIEDTYPEN=dbMitgliedtypen.length>0
    ?dbMitgliedtypen.map(t=>t.name)
    :["Aktivmitglied","Juniormitglied","Funktionär","Passivmitglied","Ehrenmitglied","Freimitglied"];

  useEffect(()=>{
    if(sb&&editOpen){
      // Benutzer-Rolle laden
      sb.from("benutzer").select("id,role").eq("mitglied_id",raw.id).maybeSingle()
        .then(({data})=>{
          if(data) setEditForm(f=>({...f,rolle:data.role||raw.rolle||"",_benutzer_id:data.id}));
          else setEditForm(f=>({...f,rolle:raw.rolle||""}));
        });
    }
  },[editOpen]);

  async function deleteMitglied(){
    if(!sb||!window.confirm(`${m.name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    await sb.from("mitglieder").update({aktiv:false}).eq("id",raw.id);
    if(onClose) onClose();
    if(onReload) onReload();
  }

  async function saveEdit(){
    if(!sb) return;
    setEditSaving(true); setEditMsg(null);
    const {error}=await sb.from("mitglieder").update({
      vorname:editForm.vorname||null, nachname:editForm.nachname||null,
      geburtsdatum:editForm.geburtsdatum||null, geschlecht:editForm.geschlecht||null,
      nationalitaet:editForm.nationalitaet||null, heimatort:editForm.heimatort||null,
      ahv_nr:editForm.ahv_nr||null, telefon:editForm.telefon||null,
      email:editForm.email||null, strasse:editForm.strasse||null,
      plz:editForm.plz||null, ort:editForm.ort||null, kanton:editForm.kanton||null,
      mitgliedtyp:editForm.mitgliedtyp||null, funktionen:editForm.funktionen||[],
      spielerpass:editForm.spielerpass||null, js_nr:editForm.js_nr||null,
      fairgate_id:editForm.fairgate_id||null, notizen:editForm.notizen||null,
      updated_at:new Date().toISOString(),
    }).eq("id",raw.id);
    // Rolle speichern: immer in mitglieder.rolle, zusätzlich in benutzer.role falls verknüpft
    if(!error){
      await sb.from("mitglieder").update({rolle:editForm.rolle||null}).eq("id",raw.id);
      if(editForm.rolle&&editForm._benutzer_id){
        await sb.from("benutzer").update({role:editForm.rolle}).eq("id",editForm._benutzer_id);
      }
    }
    if(error){ setEditMsg({ok:false,text:error.message}); }
    else{
      setEditMsg({ok:true,text:"Gespeichert ✓"});
      setTimeout(()=>{setEditOpen(false);setEditMsg(null);if(onReload)onReload();},600);
    }
    setEditSaving(false);
  }

  const mitgliedtyp=raw.mitgliedtyp||m.type;

  return(
    <>
      <div className="cc-member-hero">
        <div className="cc-member-hero-banner">
          <button className="cc-hero-banner-btn" onClick={onClose}><TI n="arrow-left" size={16}/></button>
          <div className="cc-hero-av-wrap">
            <div className="cc-member-hero-av" style={{cursor:canEdit?"pointer":"default"}}
              onClick={()=>canEdit&&(raw.foto_url?setFotoOverlay(true):fotoInputRef.current?.click())}>
              {raw.foto_url
                ?<img src={raw.foto_url} className="cc-hero-av-img" alt=""/>
                :<span className="cc-hero-av-initials">{initials}</span>
              }
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
                      await sb.from("mitglieder").update({foto_url:null}).eq("id",raw.id);
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
                const ROLLE_LABEL=dbPortalRollen.length>0
                  ?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label]))
                  :{administrator:"Administrator",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Elternteil",mitglied:"Mitglied",supporter:"Supporter"};
                const TRAINER_ROLLEN=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
                const hatTrainerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN.includes(r)));
                const hatSpielerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>!TRAINER_ROLLEN.includes(r)));
                const chips=[];
                if(mitgliedtyp) chips.push({label:mitgliedtyp,type:"type"});
                
                if(hatTrainerKader) chips.push({label:ROLLE_LABEL["trainer"]||"Trainer",type:"rolle"});
                if(hatSpielerKader) chips.push({label:ROLLE_LABEL["spieler"]||"Spieler/in",type:"rolle"});
                if(benutzer?.role==="funktionaer") chips.push({label:ROLLE_LABEL["funktionaer"]||"Funktionär",type:"rolle"});
                if(benutzer?.role&&["administrator","administration"].includes(benutzer.role))
                  chips.push({label:ROLLE_LABEL[benutzer.role]||benutzer.role,type:"rolle"});
                const MAX=isMobile?2:chips.length;
                const visible=chips.slice(0,MAX);
                const hidden=chips.length-MAX;
                return(
                  <>
                    {visible.map((c,i)=>(
                      <span key={i} className={`cc-hero-chip${c.type==="type"?" cc-hero-chip-primary":c.type==="age"?" cc-hero-chip-age":""}`}>{c.label}</span>
                    ))}
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
              <div ref={heroMenuRef} style={{position:"relative"}}>
                <button className="cc-hero-banner-btn" onMouseDown={e=>e.stopPropagation()}
                  onClick={e=>{e.stopPropagation();setHeroMenuOpen(o=>!o);}}>
                  <TI n="dots-vertical" size={16}/>
                </button>
                {heroMenuOpen&&(
                  <div className="cc-menu" style={{position:"absolute",top:"calc(100% + 4px)",right:0,left:"auto",zIndex:100}}>
                    {canEdit&&(
                      <button className="cc-menu-item" onClick={()=>{setHeroMenuOpen(false);setEditForm({...raw});setEditOpen(true);}}>
                        <TI n="edit" size={13}/> Bearbeiten
                      </button>
                    )}
                    {canEdit&&raw.aktiv!==false&&(
                      <button className="cc-menu-item" onClick={async()=>{setHeroMenuOpen(false);if(window.confirm(`${m.name} archivieren?`)){const n=account?.name||account?.email||"Administrator";await sb.from("mitglieder").update({aktiv:false,deaktiviert_am:new Date().toISOString(),deaktiviert_von:n}).eq("id",raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,false);if(onReload)onReload(raw.id);if(onRefreshCount)onRefreshCount();}}}>
                        <TI n="archive" size={13}/> Archivieren
                      </button>
                    )}
                    {raw.aktiv===false&&(
                      <>
                        <button className="cc-menu-item" onClick={async()=>{setHeroMenuOpen(false);if(window.confirm(`${m.name} reaktivieren?`)){await sb.from("mitglieder").update({aktiv:true,deaktiviert_am:null,deaktiviert_von:null}).eq("id",raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(raw.id);else if(onReload)onReload(raw.id);}}}>
                          <TI n="user-check" size={13}/> Reaktivieren
                        </button>
                        <div className="cc-menu-sep"/>
                      </>
                    )}
                    <button className="cc-menu-item cc-menu-item-danger" onClick={()=>{setHeroMenuOpen(false);deleteMitglied();}}>
                      <TI n="trash" size={13}/> Löschen
                    </button>
                  </div>
                )}
              </div>
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
                {k:"nationalitaet",l:"Nationalität",isLaender:true},
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
                  {(dbPortalRollen.length>0?dbPortalRollen:[{name:"administrator",label:"Administrator"},{name:"administration",label:"Verwaltung"},{name:"funktionaer",label:"Funktionär"},{name:"trainer",label:"Trainer"},{name:"spieler",label:"Spieler"},{name:"eltern",label:"Eltern"},{name:"mitglied",label:"Mitglied"},{name:"supporter",label:"Supporter"}]).map(r=>(
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

/* ── FotoUpload: Foto in Personalien-Card ── */

function FotoUpload({raw,canUpload,sb,onReload}){
  const [uploading,setUploading]=useState(false);
  const [msg,setMsg]=useState(null);
  const inputRef=useRef(null);

  async function handleUpload(e){
    const file=e.target.files?.[0];
    if(!file||!sb) return;
    if(file.size>2*1024*1024){ setMsg({ok:false,text:"Max. 2MB"}); return; }
    setUploading(true); setMsg(null);
    try{
      const ext=file.name.split(".").pop().toLowerCase();
      const path=`${raw.id}/foto.${ext}`;
      const {error:upErr}=await sb.storage.from("mitglieder-fotos").upload(path,file,{upsert:true});
      if(upErr) throw upErr;
      const {data}=sb.storage.from("mitglieder-fotos").getPublicUrl(path);
      const {error:dbErr}=await sb.from("mitglieder").update({foto_url:data.publicUrl+"?t="+Date.now()}).eq("id",raw.id);
      if(dbErr) throw dbErr;
      setMsg({ok:true,text:"Foto gespeichert ✓"});
      setTimeout(()=>{setMsg(null);if(onReload)onReload();},800);
    }catch(e){ setMsg({ok:false,text:e.message}); }
    setUploading(false);
  }

  async function handleDelete(){
    if(!sb||!window.confirm("Foto wirklich löschen?")) return;
    await sb.from("mitglieder").update({foto_url:null}).eq("id",raw.id);
    if(onReload) onReload();
  }

  if(!raw.foto_url&&!canUpload) return null;

  return(
    <div className="cc-foto-row">
      {raw.foto_url?(
        <img src={raw.foto_url} className="cc-foto-img" alt="Foto"/>
      ):(
        <div className="cc-foto-placeholder"><TI n="photo" size={24}/></div>
      )}
      <div className="cc-col cc-gap-8">
        <div className="cc-text-bold">{raw.vorname} {raw.nachname}</div>
        {canUpload&&(
          <div className="cc-row cc-gap-8">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-hidden" onChange={handleUpload}/>
            <Btn small onClick={()=>inputRef.current?.click()} disabled={uploading}>
              <TI n="upload" size={12}/> {raw.foto_url?"Ändern":"Foto hochladen"}
            </Btn>
            {raw.foto_url&&<Btn small onClick={handleDelete}><TI n="trash" size={12}/></Btn>}
          </div>
        )}
        {msg&&<div className={`cc-badge ${msg.ok?"cc-badge-success":"cc-badge-danger"}`}>{msg.text}</div>}
        {uploading&&<div className="cc-text-sm">Wird hochgeladen…</div>}
      </div>
    </div>
  );
}

/* -- Kaderliste mit Feldsichtbarkeit -- */

/* ── Eltern Portal-Verknüpfungs-Zeile ── */

function ElternPortalSection({e,sb,onReload}){
  const [lMsg,setLMsg]=useState(null);
  const [lLoading,setLLoading]=useState(false);
  async function link(){
    if(!sb||!e.email) return;
    setLLoading(true); setLMsg(null);
    const {data:bu}=await sb.from("benutzer").select("id").eq("email",e.email).maybeSingle();
    if(bu){
      await sb.from("elternkontakte").update({benutzer_id:bu.id}).eq("id",e.id);
      setLMsg({ok:true,text:"Zugang eingerichtet ✓"});
      if(onReload) onReload();
    } else { setLMsg({ok:false,text:"Kein Konto für "+e.email+" gefunden"}); }
    setLLoading(false);
  }
  async function unlink(){
    if(!sb) return;
    await sb.from("elternkontakte").update({benutzer_id:null}).eq("id",e.id);
    if(onReload) onReload();
  }
  return(
    <div className="cc-eltern-portal-row">
      <div>
        <div className="cc-text-bold cc-text-sm">Portal-Zugang</div>
        <div className={e.benutzer_id?"cc-status-active":"cc-status-inactive"}>
          {e.benutzer_id?"Aktiv":"Kein Zugang"}
        </div>
      </div>
      <div className="cc-col cc-gap-6 cc-items-end">
        {lMsg&&<div className={`cc-badge ${lMsg.ok?"cc-badge-success":"cc-badge-danger"}`}>{lMsg.text}</div>}
        {e.benutzer_id
          ?<button className="cc-btn-danger" onClick={unlink}>Zugang entfernen</button>
          :<button className="cc-btn-success" onClick={link} disabled={!e.email||lLoading}>
            {lLoading?"…":"Zugang einrichten"}
          </button>
        }
      </div>
    </div>
  );
}

/* Avatar-Farbe nach Beziehung */

function ElternTab({eltern,canEdit,raw,sb,onReload,setElternLoaded}){
  const [editEltern,setEditEltern]=useState(null);
  const [elternMsg,setElternMsg]=useState(null);
  const [elternSaving,setElternSaving]=useState(false);

  async function saveEltern(){
    if(!sb) return;
    setElternSaving(true); setElternMsg(null);
    try{
      const d=editEltern.data;
      if(editEltern.mode==="new"){
        const {error}=await sb.from("elternkontakte").insert({
          mitglied_id:raw.id,
          vorname:d.vorname||null, nachname:d.nachname||null,
          name:d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||null,
          email:d.email||null, telefon:d.telefon||null,
          beziehung:d.beziehung||null,
        });
        if(error) throw error;
      } else {
        const {error}=await sb.from("elternkontakte").update({
          vorname:d.vorname||null, nachname:d.nachname||null,
          name:d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||null,
          email:d.email||null, telefon:d.telefon||null,
          beziehung:d.beziehung||null,
        }).eq("id",d.id);
        if(error) throw error;
      }
      setElternMsg({ok:true,text:"Gespeichert ✓"});
      setTimeout(()=>{setEditEltern(null);setElternMsg(null);if(onReload)onReload();},800);
    }catch(e){setElternMsg({ok:false,text:e.message});}
    setElternSaving(false);
  }

  async function deleteEltern(id){
    if(!sb||!window.confirm("Elternkontakt wirklich löschen?")) return;
    await sb.from("elternkontakte").delete().eq("id",id);
    if(onReload) onReload();
  }

  return(
    <div className="cc-col cc-gap-8">
      {canEdit&&!editEltern&&(
        <div className="cc-between">
          <div className="cc-text-sm">{eltern.length} Elternkontakt{eltern.length!==1?"e":""}</div>
          <Btn small onClick={()=>setEditEltern({mode:"new",data:{mitglied_id:raw.id}})}>
            <TI n="plus"/> Hinzufügen
          </Btn>
        </div>
      )}
      {eltern.length===0&&<div className="cc-empty">Keine Elternkontakte erfasst.</div>}
      {eltern.map((e,i)=>{
        const name=e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
        const tel=e.telefon||e.tel;
        const ac=elternAvColor(e.beziehung);
        return(
          <Card key={i}>
            <div className="cc-row cc-gap-12 cc-items-center">
              <div className="cc-eltern-av" style={{background:ac.bg,color:ac.text}}>
                {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div className="cc-flex-1 cc-col cc-gap-5">
                <div className="cc-text-bold cc-text-lg">{name}</div>
                <div className="cc-row cc-gap-8 cc-flex-wrap">
                  {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                  {e.benutzer_id
                    ?<span className="cc-status-active">Portal: Aktiv</span>
                    :<span className="cc-status-inactive">Portal: Inaktiv</span>
                  }
                  {e.hauptkontakt&&<span className="cc-status-hauptkontakt">★ Hauptkontakt</span>}
                </div>
                {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                {tel&&<a href={`tel:${tel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{tel}</a>}
              </div>
              {canEdit&&(
                <DropMenu items={[
                  {label:"Bearbeiten", icon:"edit", onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
                  {label:e.hauptkontakt?"Hauptkontakt entfernen":"Als Hauptkontakt setzen", icon:"user", onClick:async()=>{
                    if(!sb) return;
                    if(!e.hauptkontakt){
                      await sb.from("elternkontakte").update({hauptkontakt:false}).eq("mitglied_id",raw.id);
                      await sb.from("elternkontakte").update({hauptkontakt:true}).eq("id",e.id);
                    } else {
                      await sb.from("elternkontakte").update({hauptkontakt:false}).eq("id",e.id);
                    }
                    sb.from("elternkontakte").select("*").eq("mitglied_id",raw.id)
                      .then(({data})=>setElternLoaded(data||[]));
                  }},
                  "sep",
                  {label:"Löschen", icon:"trash", danger:true, onClick:()=>deleteEltern(e.id)},
                ]}/>
              )}
            </div>
          </Card>
        );
      })}
      {editEltern&&(
        <ModalOrSheet open={true} onClose={()=>{setEditEltern(null);setElternMsg(null);}} maxWidth={480}>
          <div className="cc-modal-hdr">
            <div className="cc-modal-title">{editEltern.mode==="new"?"Neuer Elternkontakt":"Elternkontakt bearbeiten"}</div>
            <Btn variant="ghost" small onClick={()=>setEditEltern(null)}><TI n="x" size={14}/></Btn>
          </div>
          <div className="cc-modal-body">
            <div className="cc-form-row">
              <div className="cc-form-section-title" data-label="Personalien"/>
              {[
                {k:"vorname",   l:"Vorname"},
                {k:"nachname",  l:"Nachname"},
                {k:"beziehung", l:"Beziehung", opts:["Mutter","Vater","Elternteil","Grossmutter","Grossvater","Vormund"]},
                {k:"email",     l:"E-Mail",    type:"email"},
                {k:"telefon",   l:"Telefon",   type:"tel"},
              ].map(({k,l,type="text",opts})=>(
                <div key={k} className={k==="email"||k==="telefon"?"cc-form-full":""}>
                  <label className="cc-label">{l}</label>
                  {opts
                    ?<select className="cc-input" value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))}>\n                      <option value="">– wählen –</option>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    :<input className="cc-input" type={type} value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))} placeholder={l}/>
                  }
                </div>
              ))}
            </div>
            {editEltern.mode==="edit"&&<ElternPortalSection e={editEltern.data} sb={sb} onReload={onReload}/>}
            {elternMsg&&<div className={`cc-badge ${elternMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{elternMsg.text}</div>}
          </div>
          <div className="cc-modal-ftr">
            <Btn onClick={()=>setEditEltern(null)}>Abbrechen</Btn>
            <Btn variant="primary" onClick={saveEltern} disabled={elternSaving}>
              {elternSaving?"Speichert…":"Speichern"}
            </Btn>
          </div>
        </ModalOrSheet>
      )}
    </div>
  );
}

function NotizenVerlauf({mitgliedId,canEdit,sb,dbUser}){
  const [notizen,setNotizen]=useState(null);
  const [newText,setNewText]=useState("");
  const [adding,setAdding]=useState(false);
  const [editId,setEditId]=useState(null);
  const [editText,setEditText]=useState("");
  const [editSaving,setEditSaving]=useState(false);

  useEffect(()=>{
    if(!sb||!mitgliedId) return;
    sb.from("mitglieder_notizen").select("*")
      .eq("mitglied_id",mitgliedId).order("created_at",{ascending:false})
      .then(({data})=>setNotizen(data||[]));
  },[mitgliedId]);

  async function addNotiz(){
    if(!newText.trim()||!sb) return;
    setAdding(true);
    const autorName=dbUser?.name||dbUser?.email||"Unbekannt";
    await sb.from("mitglieder_notizen").insert({
      mitglied_id:mitgliedId, text:newText.trim(),
      autor_id:dbUser?.id||null, autor_name:autorName,
    });
    const {data:fresh}=await sb.from("mitglieder_notizen").select("*")
      .eq("mitglied_id",mitgliedId).order("created_at",{ascending:false});
    setNotizen(fresh||[]);
    setNewText(""); setAdding(false);
  }

  async function saveEdit(id){
    if(!editText.trim()||!sb) return;
    setEditSaving(true);
    await sb.from("mitglieder_notizen").update({text:editText.trim(),updated_at:new Date().toISOString()}).eq("id",id);
    setNotizen(prev=>prev.map(n=>n.id===id?{...n,text:editText.trim()}:n));
    setEditId(null); setEditSaving(false);
  }

  async function deleteNotiz(id){
    if(!sb||!window.confirm("Notiz wirklich löschen?")) return;
    await sb.from("mitglieder_notizen").delete().eq("id",id);
    setNotizen(prev=>prev.filter(n=>n.id!==id));
  }

  function formatDate(ts){
    const d=new Date(ts);
    const now=new Date();
    const diff=now-d;
    if(diff<86400000&&d.getDate()===now.getDate()) return `heute, ${d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"})}`;
    if(diff<172800000) return "gestern";
    return d.toLocaleDateString("de-CH");
  }

  function initials(name){
    return (name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  }

  if(notizen===null) return <div className="cc-text-sm cc-text-sub">Lade…</div>;

  return(
    <div className="cc-notiz-list">
      {notizen.length===0&&!canEdit&&(
        <div className="cc-text-sm cc-text-sub cc-empty-italic">Keine Notizen vorhanden.</div>
      )}
      {notizen.map(n=>(
        <div key={n.id} className="cc-notiz-entry">
          <div className="cc-notiz-av">{initials(n.autor_name)}</div>
          <div className="cc-flex-1">
            <div className="cc-notiz-meta">
              <span className="cc-notiz-author">{n.autor_name||"Unbekannt"}</span>
              <span className="cc-notiz-dot"/>
              <span>{formatDate(n.created_at)}</span>
              {n.updated_at!==n.created_at&&<><span className="cc-notiz-dot"/><span className="cc-text-xs cc-text-sub">bearbeitet</span></>}
            </div>
            {editId===n.id?(
              <div className="cc-col cc-gap-6">
                <textarea className="cc-input cc-textarea cc-notiz-edit-area" rows={3} value={editText}
                  onChange={e=>setEditText(e.target.value)} autoFocus/>
                <div className="cc-row cc-gap-6">
                  <Btn variant="primary" onClick={()=>saveEdit(n.id)} disabled={editSaving}>{editSaving?"Speichert…":"Speichern"}</Btn>
                  <Btn onClick={()=>setEditId(null)}>Abbrechen</Btn>
                </div>
              </div>
            ):(
              <div className="cc-notiz-text">{n.text}</div>
            )}
          </div>
          {canEdit&&editId!==n.id&&(
            <DropMenu items={[
              {label:"Bearbeiten",icon:"edit",onClick:()=>{setEditId(n.id);setEditText(n.text);}},
              "sep",
              {label:"Löschen",icon:"trash",danger:true,onClick:()=>deleteNotiz(n.id)},
            ]}/>
          )}
        </div>
      ))}
      {canEdit&&(
        newText!==""?(
          <div className="cc-notiz-input-wrap">
            <div className="cc-notiz-av cc-notiz-av-me">{initials(dbUser?.name||dbUser?.email)}</div>
            <div className="cc-flex-1 cc-col cc-gap-6">
              <textarea className="cc-input cc-textarea" rows={3} value={newText}
                onChange={e=>setNewText(e.target.value)} autoFocus placeholder="Neue Notiz hinzufügen…"/>
              <div className="cc-row cc-gap-8 cc-justify-end">
                <Btn onClick={()=>setNewText("")}>Abbrechen</Btn>
                <Btn variant="primary" onClick={addNotiz} disabled={adding||!newText.trim()}>
                  {adding?"Wird gespeichert…":"Hinzufügen"}
                </Btn>
              </div>
            </div>
          </div>
        ):(
          <button className="cc-team-add-btn" onClick={()=>setNewText(" ")} style={{marginTop:notizen.length>0?8:0}}>
            <TI n="plus" size={14}/> Neue Notiz
          </button>
        )
      )}
    </div>
  );
}

function MemberDetail({
m, onClose, onNavToTeam=null, onReaktiviert=null,
/* MitgliederModul scope */
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
      saison:"2025/26",
    },{onConflict:"team_id,mitglied_id,saison"});
    const {data}=await sb.from("kader").select("*, teams(id,name,kurzname)").eq("mitglied_id",raw.id).eq("aktiv",true);
    if(data) setTeamDetails(data);
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
    if(!sb||!window.confirm("Mitglied aus diesem Team entfernen?")) return;
    await sb.from("kader").update({aktiv:false}).eq("id",kaderId);
    setTeamDetails(prev=>prev.filter(k=>k.id!==kaderId));
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
      // Kader-Einträge der Person laden → Rolle ableiten
      const ROLLE_MAP={
        ...Object.fromEntries(dbKaderRollen.map(r=>[r.name,r.ist_trainer?"trainer":"spieler"])),
      };
      const PRIORITAET=["administrator","administration","funktionaer","trainer","spieler","eltern"];
      const {data:kaderData}=await sb.from("kader")
        .select("rollen").eq("mitglied_id",raw.id).eq("aktiv",true);
      const {data:mitgliedtypData}=await sb.from("mitgliedtypen")
        .select("standard_rolle").eq("name",raw.mitgliedtyp||"").maybeSingle();
      const TRAINER_ROLLEN_SET=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
      // Rollenableitung: Kader > Mitgliedtyp (spieler/trainer) > Vereinsfunktionen > Mitgliedtyp-Rest > Supporter
      let neueRolle="supporter";
      if(kaderData&&kaderData.length>0){
        const hatTrainer=kaderData.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN_SET.includes(r)));
        if(hatTrainer) neueRolle="trainer";
        else{
          const alleRollen=kaderData.flatMap(k=>(k.rollen||[]).map(r=>ROLLE_MAP[r]).filter(Boolean));
          const hoechste=PRIORITAET.find(p=>alleRollen.includes(p));
          if(hoechste) neueRolle=hoechste;
        }
      } else if(mitgliedtypData?.standard_rolle&&["spieler","trainer"].includes(mitgliedtypData.standard_rolle)){
        neueRolle=mitgliedtypData.standard_rolle;
      } else if((raw.funktionen||[]).length>0){
        neueRolle="funktionaer";
      } else if(mitgliedtypData?.standard_rolle){
        neueRolle=mitgliedtypData.standard_rolle;
      }
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
        benutzer={benutzer} teamDetails={teamDetails} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
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
      <div className="cc-member-stats">
        <StatusTile label="Mitgliedschaft"   value={raw.mitgliedtyp||"—"}                                                    icon="id-badge-2"    semantic="neutral"/>
        <StatusTile label="Datenprüfung"  value={raw.geprueft?"Geprüft":"Ausstehend"}                                        icon={raw.geprueft?"shield-check":"alert-circle"} semantic={raw.geprueft?"ok":"warn"}
          action={!raw.geprueft&&canEdit?{label:"Prüfung starten",onClick:()=>setTab("datenpruefung")}:null}/>
        <StatusTile label="Portal-Zugang" value={raw.hat_portal_zugang?(isMobile?"OK":"Eingerichtet"):(isMobile?"Fehlt":"Nicht eingerichtet")} icon="key" semantic={raw.hat_portal_zugang?"ok":"warn"}
          action={!raw.hat_portal_zugang&&canEdit?{label:"Zugang erstellen",onClick:()=>setTab("portal")}:null}/>
        <StatusTile label="Fairgate"      value={raw.fairgate_id?(isMobile?"Sync":"Synchronisiert"):"—"}                     icon="refresh"       semantic={raw.fairgate_id?"ok":"neutral"}/>
      </div>

      {/* Tab: Profil */}
      {tab==="info"&&(
        <div className="cc-grid-2">
          {/* Personalien */}
          <Card>
            <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
            {[
              ...(age?[{l:"Alter",v:`${age} Jahre`}]:[]),
              ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum?new Date(raw.geburtsdatum).toLocaleDateString("de-CH"):null}]:[]),
              {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":raw.geschlecht||null},
              {l:"Nationalität", v:raw.nationalitaet||null, flag:raw.nationalitaet?raw.nationalitaet.toUpperCase():null, flagName:raw.nationalitaet?getLandName(raw.nationalitaet):null},
              {l:"Heimatort",    v:raw.heimatort||null},
              ...(fv.showAhv?[{l:"AHV-Nr.",v:raw.ahv_nr||null,masked:true}]:[]),
            ].filter(r=>canEdit||r.v).map((r,i)=>(
              <div key={i} className="cc-info-row">
                <span className="cc-info-key">{r.l}</span>
                {r.flag?(
                  <span className="cc-info-val cc-row cc-gap-6">
                    <span className="cc-land-badge">{r.flag}</span>
                    <span>{r.flagName}</span>
                  </span>
                ):(
                  r.masked&&r.v
                  ?<span className="cc-ahv-mask">••• •• ••••</span>
                  :<span className={r.v?"cc-info-val":"cc-info-val-empty"}>{r.v||"—"}</span>
                )}
              </div>
            ))}
          </Card>

          {/* Kontakt + Hauptkontakt */}
          {(fv.showEmail||fv.showTelefon||fv.showAdresse)&&(()=>{
            const hk=brauchtEltern(raw.mitgliedtyp)?eltern.find(e=>e.hauptkontakt):null;
            const hkName=hk?(hk.name||`${hk.vorname||""} ${hk.nachname||""}`.trim()||"?"):null;
            const hkTel=hk?(hk.telefon||hk.tel):null;
            return(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
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
                {/* Hauptkontakt als Mini-Karte */}
                {hk&&(
                  <>
                    <span className="cc-hk-sub-label"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
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
                    <span className="cc-hk-sub-label"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
                    <div className="cc-warn-box"><TI n="alert-triangle" size={14}/> Kein Hauptkontakt — bitte im Tab "Eltern" festlegen</div>
                  </>
                )}
              </Card>
            );
          })()}

          {/* Teams */}
          <Card>
            <div className="cc-section-title"><TI n="users" size={14}/> Teams</div>
            {teamDetails===null&&<div className="cc-text-sm cc-text-sub">Lade…</div>}
            {teamDetails!==null&&teamDetails.length===0&&(
              <div className="cc-text-sm cc-text-sub">Keinem Team zugewiesen.</div>
            )}
            {(teamDetails||[]).map((k,i)=>(
              <div key={i} className="cc-team-position-row">
                <div className="cc-list-item-icon"><TI n="ball-football" size={13}/></div>
                <div className="cc-text-bold cc-flex-1">{k.teams?.name||"—"}</div>
                <div className="cc-row cc-gap-4 cc-flex-wrap">
                  {(k.rollen||["Spieler/in"]).map((r,ri)=>{
                    const isTrainer=dbKaderRollen.some(kr=>kr.name===r&&kr.ist_trainer);
                    return <span key={ri} className={isTrainer?"cc-role-chip cc-role-chip-trainer":"cc-role-chip"}>{r}</span>;
                  })}
                </div>
                <DropMenu items={[
                  {label:"Zum Team", icon:"arrow-right", onClick:()=>{
                    if(typeof onNavToTeam==="function") onNavToTeam(k.team_id);
                  }},
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
                    <div className="cc-text-bold cc-flex-1">{f}</div>
                    {gruppe&&(
                      <span className="cc-funk-gruppe-badge" style={funkObj?.portal_gruppen?.farbe?{background:funkObj.portal_gruppen.farbe+"20",color:funkObj.portal_gruppen.farbe,borderColor:funkObj.portal_gruppen.farbe+"40"}:{}}>{gruppe}</span>
                    )}
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

          {/* Vereinsdaten */}
          <Card className="cc-card-full">
            <div className="cc-section-title"><TI n="building-community" size={14}/> Vereinsdaten</div>
            <div className="cc-detail-grid-2">
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
                  <input className="cc-input" placeholder="Suchen…" value={teamAssignRolleSearch||""}
                    onChange={e=>setTeamAssignRolleSearch(e.target.value)}
                    className="cc-search-input"/>
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
                      <input className="cc-input" placeholder="Suchen…" value={editTeamRolleSearch||""}
                        onChange={e=>setEditTeamRolleSearch(e.target.value)}
                        className="cc-search-input"/>
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
              <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
              <NotizenVerlauf mitgliedId={raw.id} canEdit={canEdit} sb={sb} dbUser={account}/>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Eltern */}
      {tab==="eltern"&&<ElternTab eltern={eltern} canEdit={canEdit} raw={raw} sb={sb} onReload={onReload} setElternLoaded={setElternLoaded}/>}

      {/* Tab: Portal-Zugang */}

      {tab==="portal"&&(
        <div className="cc-col cc-gap-16">
          <Card>
            <div className="cc-between cc-mb-12">
              <div className="cc-text-bold cc-text-lg">Portal-Zugang</div>
              <Chip text={raw.hat_portal_zugang?"Aktiv":"Kein Zugang"} color={raw.hat_portal_zugang?GN:R} bg={raw.hat_portal_zugang?"#ECFDF5":RL}/>
            </div>
            {raw.hat_portal_zugang&&benutzer&&(
              <div className="cc-col cc-gap-8 cc-mb-12">
                {[
                  {l:"E-Mail",   v:benutzer.email||"-"},
                  {l:"Rolle",    v:benutzer.role||"-"},
                  {l:"Erstellt", v:benutzer.created_at?new Date(benutzer.created_at).toLocaleDateString("de-CH"):"-"},
                ].map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </div>
            )}
            {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mb-12`}>{portalMsg.text}</div>}
            {raw.hat_portal_zugang
              ?<button className="cc-btn-danger cc-w-full" onClick={handleUnlink}>Verknüpfung aufheben</button>
              :(
                <div className="cc-col cc-gap-8">
                  <label className="cc-label">E-Mail des Benutzers</label>
                  <input className="cc-input" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="email@example.com"/>
                  <button className="cc-btn-success cc-w-full" onClick={handleLink} disabled={!linkEmail||portalLoading}>
                    {portalLoading?"Wird verknüpft…":"Mit Portal verknüpfen"}
                  </button>
                </div>
              )
            }
          </Card>
          {/* Datenprüfung */}

        </div>
      )}

      {/* Tab: Datenprüfung */}
      {tab==="datenpruefung"&&(
        <div className="cc-col cc-gap-16">
          <Card>
            <div className="cc-between cc-mb-12">
              <div>
                <div className="cc-text-bold cc-text-lg">Profil-Status</div>
                <div className="cc-text-sm cc-mt-4">
                  {raw.profil_geprueft_at
                    ?`Zuletzt geprüft am ${new Date(raw.profil_geprueft_at).toLocaleDateString("de-CH")}`
                    :"Noch nie geprüft"}
                </div>
              </div>
              <Chip
                text={raw.profil_geprueft_at?"Geprüft":"Ausstehend"}
                color={raw.profil_geprueft_at?GN:AM}
                bg={raw.profil_geprueft_at?"#ECFDF5":"#FFFBEB"}
              />
            </div>
            <div className="cc-col cc-gap-8">
              {[
                {l:"Vorname",      ok:!!raw.vorname},
                {l:"Nachname",     ok:!!raw.nachname},
                {l:"Geburtsdatum", ok:!!raw.geburtsdatum},
                {l:"Nationalität", ok:!!raw.nationalitaet},
                {l:"Adresse",      ok:!!(raw.strasse&&raw.plz&&raw.ort)},
                {l:"E-Mail",       ok:!!raw.email},
                {l:"Telefon",      ok:!!raw.telefon},
              ].map((f,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{f.l}</span>
                  <span>{f.ok
                    ?<span className="cc-badge cc-badge-success"><TI n="check" size={10}/> OK</span>
                    :<span className="cc-badge cc-badge-warning">Fehlt</span>
                  }</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="cc-text-bold cc-mb-4">Datenprüfung anfordern</div>
            <div className="cc-text-sm cc-mb-12">Das Mitglied wird beim nächsten Login aufgefordert, seine Daten zu prüfen und zu bestätigen.</div>
            <button className="cc-btn-ghost cc-w-full" onClick={async()=>{
              if(!sb) return;
              await sb.from("mitglieder").update({profil_geprueft_at:null}).eq("id",raw.id);
              setPortalMsg({ok:true,text:"Datenprüfung angefordert ✓"});
              if(onReload) setTimeout(onReload,500);
            }}>
              <TI n="refresh"/> Datenprüfung anfordern
            </button>
            {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{portalMsg.text}</div>}
          </Card>
        </div>
      )}

      {/* Platzhalter Tabs */}
      {(tab==="stats"||tab==="comments"||tab==="ratings")&&(
        <div className="cc-empty cc-empty-lg">
          <TI n="hourglass" size={32} className="cc-empty-icon"/>
          Kommt bald
        </div>
      )}
    </div>
  );
};

if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)} onNavToTeam={onNavToTeam} onReaktiviert={(id)=>{setArchivLoaded(false);if(id)reloadMember(id);}}/>;

/* KPI helpers */
const totalCount=allMembers.length;
const portalAktiv=allMembers.filter(m=>m.hat_portal_zugang).length;
const dpOffen=allMembers.filter(m=>m.datenpruefung!=="Geprueft").length;
const ohneTeam=allMembers.filter(m=>m.teams.length===0).length;
/* Mitgliedschaft-Aufschluesselung - dynamisch */
const trainerCount=allMembers.filter(m=>m.rollen.some(r=>r.toLowerCase().includes("trainer"))).length;
const funktionaerCount=allMembers.filter(m=>m.rollen.some(r=>r.toLowerCase().includes("funktion"))).length;
const mitgliedTypen=dbMitgliedtypen.length>0
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
  if(b.key==="__trainer") setFilterVals(prev=>({...prev,rollen:["Trainer/in"]}));
  else if(b.key==="__funktionaer") setFilterVals(prev=>({...prev,rollen:["Funktionär"]}));
  else setFilterVals(prev=>({...prev,mitgliedschaft:[b.key]}));
  setBreakdownOpen(false);
}

/* Portal-Zugang Zelle */
function PortalBadge({val}){
  if(val==="Aktiv") return <span className="cc-ml-badge cc-ml-badge-ok">Aktiv</span>;
  return <span className="cc-ml-badge cc-ml-badge-muted">Fehlt</span>;
}
/* Datenpruefung Zelle */
function DpBadge({val}){
  if(val==="Geprueft") return <span className="cc-ml-badge cc-ml-badge-ok">Geprüft</span>;
  if(val==="Ausstehend") return <span className="cc-ml-badge cc-ml-badge-warn">Ausstehend</span>;
  return <span className="cc-ml-badge cc-ml-badge-err">{val||"Unbekannt"}</span>;
}

return(
  <div className="cc-page-wide">
    {/* Header + Tabs */}
    <div className="cc-page-hdr">
      <div className="cc-row cc-gap-0">
        <h1 className="cc-page-title cc-page-title-mr">Mitglieder</h1>
        {(role==="administrator"||role==="administration")&&(
          <div className="cc-ml-tabs-bar">
            <button className={`cc-ml-tab${!archivTab?" cc-ml-tab-active":""}`} onClick={()=>setArchivTab(false)}>
              Aktive <span className="cc-ml-tab-count">{allMembers.length}</span>
            </button>
            <button className={`cc-ml-tab${archivTab?" cc-ml-tab-active":""}`} onClick={()=>{
              setArchivTab(true);
              if(!archivLoaded&&sb){
                sb.from("mitglieder").select("id,vorname,nachname,mitgliedtyp,deaktiviert_am,deaktiviert_von").eq("aktiv",false).order("deaktiviert_am",{ascending:false})
                  .then(({data})=>{setArchivData(data||[]);setArchivLoaded(true);});
              }
            }}>
              Archiv {archivCount!==null&&<span className="cc-ml-tab-count">{archivCount}</span>}
            </button>
          </div>
        )}
      </div>

    </div>

    {archivTab?(
      <ArchivView archivData={archivData} archivLoaded={archivLoaded} sb={sb} account={account} onUpdatePortalZugang={onUpdatePortalZugang} onReload={()=>{setArchivLoaded(false);if(onReload)onReload();}} onOpenMember={async m=>{
        if(!sb) return;
        const {data}=await sb.from("mitglieder").select("*").eq("id",m.id).single();
        if(data) setSelectedMember({...data,name:`${data.vorname||""} ${data.nachname||""}`.trim()||"?",_tab:"info",_readonly:true});
      }}/>
    ):(
    <>
    {/* KPI */}
    <div className="cc-grid-stats cc-mb-8">
      <Stat label="Mitglieder" value={totalCount} color={BL}/>
      <Stat label="Portal aktiv" value={portalAktiv} color={GN}/>
      <Stat label="Prüfung offen" value={dpOffen} color={AM}/>
      <Stat label="Ohne Team" value={ohneTeam} color={AM}/>
    </div>
    {/* Aufschluesselung */}
    <div className="cc-kpi-breakdown cc-mb-20">
      <button className="cc-kpi-breakdown-toggle" onClick={()=>setBreakdownOpen(o=>!o)}>
        <span className="cc-text-sm cc-text-sub">Mitgliedschaft Aufschlüsselung</span>
        <TI n={breakdownOpen?"chevron-up":"chevron-down"} size={13} className="cc-text-sub"/>
      </button>
      {breakdownOpen&&(
        <div className="cc-kpi-breakdown-body">
          {BREAKDOWN.map(b=>(
            <button key={b.key} className={`cc-kpi-tile cc-kpi-tile-${b.color}`} onClick={()=>bdFilter(b)}>
              <span className="cc-kpi-tile-label">{b.label}</span>
              <span className="cc-kpi-tile-value">{bdCount(b)}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Gespeicherte Ansichten - nur Desktop */}
    {!isMobile&&<div className="cc-ml-views">
      {Object.entries(SAVED_VIEWS).map(([k,v])=>(
        <button key={k}
          className={`cc-ml-view-btn${savedView===k?" cc-ml-view-btn-active":""}`}
          onClick={()=>applyView(k)}
        >{v.label}</button>
      ))}
      {customViews.map(v=>(
        <div key={v.id} className="cc-ml-view-custom">
          <button
            className={`cc-ml-view-btn${savedView==="custom_"+v.id?" cc-ml-view-btn-active":""}`}
            onClick={()=>applyCustomView(v)}
          >{v.name}</button>
          <button className="cc-ml-view-del" onClick={()=>deleteCustomView(v.id)} title="Löschen">
            <TI n="x" size={10}/>
          </button>
        </div>
      ))}
      {saveViewOpen?(
        <div className="cc-ml-view-save-form">
          <input
            className="cc-ml-view-save-input"
            placeholder="Name der Ansicht…"
            value={saveViewName}
            onChange={e=>setSaveViewName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&saveCurrentView()}
            autoFocus
          />
          <Btn small variant="primary" onClick={saveCurrentView} disabled={savingView||!saveViewName.trim()}>
            {savingView?"...":"Speichern"}
          </Btn>
          <Btn small onClick={()=>{setSaveViewOpen(false);setSaveViewName("");}}>
            <TI n="x" size={12}/>
          </Btn>
        </div>
      ):(
        <button className="cc-ml-view-btn cc-ml-view-btn-add" onClick={()=>setSaveViewOpen(true)}>
          <TI n="plus" size={12}/> Ansicht speichern
        </button>
      )}
    </div>}

    {/* Toolbar */}
    <div className="cc-ml-toolbar">
      <div className="cc-ml-srch">
        <TI n="search" size={15} className="cc-input-icon"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen nach Name, Team, Rolle…"/>
      </div>

      {/* Filter */}
      <div className="cc-ml-dropdown-wrap">
        <button className={`cc-ml-btn${Object.values(filterVals).some(v=>v&&v.length>0)?" cc-active":""}`}
          onClick={()=>{setFilterOpen(o=>!o);setGroupOpen(false);setColMenuOpen(false);}}>
          <TI n="filter" size={15}/>
          {!isMobile&&"Filter"}
          {Object.values(filterVals).some(v=>v&&v.length>0)&&<span className="cc-ml-filter-dot"/>}
        </button>
        {filterOpen&&(
          isMobile?(
            <div className="cc-mehr-sheet-overlay" onClick={()=>setFilterOpen(false)}>
              <div className="cc-mehr-sheet-backdrop"/>
              <div className="cc-mehr-sheet-box cc-filter-sheet-box" onClick={e=>e.stopPropagation()}>
                <div className="cc-mehr-sheet-handle"/>
                <div className="cc-mehr-sheet-title">Filter</div>
                {FILTER_DEFS.map(({key,label,vals})=>(
                  <div key={key}>
                    <div className="cc-ml-dropdown-section-lbl" style={{padding:"8px 0 4px"}}>{label}</div>
                    {vals.sort().map(v=>{
                      const active=(filterVals[key]||[]).includes(v);
                      return(
                        <div key={v} className="cc-mehr-sheet-item" style={{borderBottom:"none",padding:"10px 0"}}
                          onMouseDown={e=>{e.stopPropagation();setFilterVals(prev=>({...prev,[key]:active?(prev[key]||[]).filter(x=>x!==v):[...(prev[key]||[]),v]}));}}>
                          <div className={`cc-col-menu-check${active?" cc-col-menu-check-on":""}`}>{active&&<TI n="check" size={10}/>}</div>
                          {v}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="cc-ml-dropdown-footer" style={{padding:"12px 0 0"}}>
                  <button className="cc-ml-dropdown-clear" onMouseDown={()=>setFilterVals({})}>Zurücksetzen</button>
                  <button className="cc-ml-dropdown-apply" onMouseDown={()=>setFilterOpen(false)}>Fertig</button>
                </div>
              </div>
            </div>
          ):(
            <div className="cc-ml-dropdown cc-ml-filter-dropdown">
              <div className="cc-col-menu-hdr">Filter</div>
              {FILTER_DEFS.map(({key,label,vals})=>(
                <div key={key}>
                  <div className="cc-ml-dropdown-section-lbl">{label}</div>
                  {vals.sort().map(v=>{
                    const active=(filterVals[key]||[]).includes(v);
                    return(
                      <div key={v} className="cc-col-menu-item" onClick={()=>setFilterVals(prev=>({
                        ...prev,
                        [key]:active?(prev[key]||[]).filter(x=>x!==v):[...(prev[key]||[]),v]
                      }))}>
                        <div className={`cc-col-menu-check${active?" cc-col-menu-check-on":""}`}>
                          {active&&<TI n="check" size={10}/>}
                        </div>
                        {v}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="cc-ml-dropdown-footer">
                <button className="cc-ml-dropdown-clear" onClick={()=>setFilterVals({})}>Zurücksetzen</button>
                <button className="cc-ml-dropdown-apply" onClick={()=>setFilterOpen(false)}>Fertig</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Gruppieren */}
      <div className="cc-ml-dropdown-wrap">
        <button className={`cc-ml-btn${groupBy!=="none"?" cc-active":""}`}
          onClick={()=>{setGroupOpen(o=>!o);setFilterOpen(false);setColMenuOpen(false);}}>
          <TI n="layout-rows" size={15}/>
          {!isMobile&&"Gruppieren"}
        </button>
        {groupOpen&&(
          isMobile?(
            <div className="cc-mehr-sheet-overlay" onClick={()=>setGroupOpen(false)}>
              <div className="cc-mehr-sheet-backdrop"/>
              <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                <div className="cc-mehr-sheet-handle"/>
                <div className="cc-mehr-sheet-title">Gruppieren nach</div>
                {GROUP_OPTIONS.map(o=>(
                  <div key={o.val}
                    className="cc-mehr-sheet-item"
                    style={{borderBottom:"0.5px solid var(--border)",fontWeight:groupBy===o.val?600:400,color:groupBy===o.val?"var(--cc-accent,#FFBF00)":"var(--text)"}}
                    onMouseDown={e=>{e.stopPropagation();setGroupBy(o.val);setGroupOpen(false);}}>
                    {groupBy===o.val&&<TI n="check" size={14}/>}
                    {o.label}
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div className="cc-ml-dropdown cc-ml-group-dropdown">
              <div className="cc-col-menu-hdr">Gruppieren nach</div>
              {GROUP_OPTIONS.map(o=>(
                <div key={o.val} className="cc-col-menu-item" onClick={()=>{setGroupBy(o.val);setGroupOpen(false);}}>
                  <div className={`cc-col-menu-check${groupBy===o.val?" cc-col-menu-check-on":""}`}>
                    {groupBy===o.val&&<TI n="check" size={10}/>}
                  </div>
                  {o.label}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Export */}
      {canExport&&(
        <div className="cc-ml-dropdown-wrap">
          <button className={`cc-ml-btn${exportOpen?" cc-active":""}`}
            onClick={()=>{setExportOpen(o=>!o);setFilterOpen(false);setGroupOpen(false);setColMenuOpen(false);}}>
            <TI n="download" size={15}/>
            {!isMobile&&"Export"}
          </button>
          {exportOpen&&(
            <div className="cc-ml-dropdown" style={{right:0,left:"auto",minWidth:130}}>
              <div className="cc-col-menu-hdr">Export</div>
              <div className="cc-col-menu-item" onClick={()=>setExportOpen(false)}><TI n="file-text" size={14}/> CSV</div>
              <div className="cc-col-menu-item" onClick={()=>setExportOpen(false)}><TI n="table" size={14}/> Excel</div>
            </div>
          )}
        </div>
      )}

      {/* Auswaehlen - nur Desktop */}
      {!isMobile&&(
        <button className={`cc-ml-btn${selectMode?" cc-active":""}`} onClick={toggleSelectMode}>
          <TI n="checkbox" size={15}/>
          {selectMode?"Modus aktiv":"Auswählen"}
        </button>
      )}

      {/* Spalten - nur Desktop */}
      {!isMobile&&<div className="cc-ml-dropdown-wrap" ref={colMenuRef}>
        <button className={`cc-ml-btn${colMenuOpen?" cc-active":""}`}
          onClick={()=>{setColMenuOpen(o=>!o);setFilterOpen(false);setGroupOpen(false);}}>
          <TI n="layout-columns" size={15}/>
          {!isMobile&&"Spalten"}
        </button>
        {colMenuOpen&&(
          <div className="cc-col-menu-dropdown cc-col-menu-dropdown-wide">
            <div className="cc-col-menu-hdr">Aktive Spalten <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span></div>
            {visibleCols.map((key,idx)=>{
              const col=ALL_COLS.find(c=>c.key===key);
              if(!col) return null;
              return(
                <div key={key}
                  className={`cc-col-menu-item cc-col-menu-item-active${colDragOver===key&&colDragSrc!==key?" cc-col-menu-item-dragover":""}`}
                  draggable={!col.alwaysOn}
                  onDragStart={e=>{e.dataTransfer.effectAllowed="move";setColDragSrc(key);}}
                  onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";setColDragOver(key);}}
                  onDrop={e=>{
                    e.preventDefault();
                    if(!colDragSrc||colDragSrc===key) return;
                    setVisibleCols(prev=>{
                      const cols=[...prev];
                      const from=cols.indexOf(colDragSrc);
                      const to=cols.indexOf(key);
                      if(from<0||to<0) return cols;
                      cols.splice(from,1);
                      cols.splice(to,0,colDragSrc);
                      return cols;
                    });
                    setColDragSrc(null); setColDragOver(null);
                  }}
                  onDragEnd={()=>{setColDragSrc(null);setColDragOver(null);}}
                  onClick={e=>{
                    e.stopPropagation();
                    if(col.alwaysOn) return;
                    setVisibleCols(prev=>prev.length>1?prev.filter(k=>k!==key):prev);
                  }}
                >
                  {!col.alwaysOn&&<TI n="grip-vertical" size={13} className="cc-col-drag-handle cc-col-menu-icon-drag"/>}
                  {col.alwaysOn&&<TI n="lock" size={11} className="cc-col-menu-icon-lock"/>}
                  <span className="cc-flex-1" style={{fontSize:13}}>{col.label}</span>
                  {!col.alwaysOn&&<TI n="x" size={11} style={{opacity:0.4}}/>}
                </div>
              );
            })}
            <div className="cc-col-menu-hdr cc-col-menu-hdr-mt">Inaktive Spalten</div>
            {COL_GROUPS.map(({group,cols})=>{
              const inactive=cols.filter(c=>!visibleCols.includes(c.key)&&!c.alwaysOn);
              if(inactive.length===0) return null;
              return(
                <div key={group}>
                  <div className="cc-ml-dropdown-section-lbl">{group}</div>
                  {inactive.map(c=>(
                    <div key={c.key} className="cc-col-menu-item"
                      onClick={e=>{e.stopPropagation();setVisibleCols(prev=>[...prev,c.key]);}}>
                      <div className="cc-col-menu-check"/>
                      <span className="cc-flex-1" style={{fontSize:13}}>{c.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>}
    </div>

    {/* Aktive Filter Chips */}
    {Object.entries(filterVals).some(([,v])=>v&&v.length>0)&&(
      <div className="cc-ml-chips">
        {Object.entries(filterVals).flatMap(([k,vals])=>(vals||[]).map(v=>(
          <div key={k+v} className="cc-ml-chip" onClick={()=>setFilterVals(prev=>({...prev,[k]:(prev[k]||[]).filter(x=>x!==v)}))}>
            {v} <span className="cc-ml-chip-x">×</span>
          </div>
        )))}
        <div className="cc-ml-chip cc-text-sub" onClick={()=>setFilterVals({})}>Alle zur�cksetzen ×</div>
      </div>
    )}

    {/* Selektionsleiste */}
    {selectMode&&!isMobile&&(
      <div className="cc-sel-bar">
        <div className="cc-col-menu-check cc-col-menu-check-on cc-sel-all" onClick={toggleSelectAll}>
          <TI n={selected.size===paged.length?"check":"minus"} size={10}/>
        </div>
        <span className="cc-sel-bar-info">{selected.size} ausgewählt</span>
        <button className="cc-ml-btn" onClick={()=>{}}><TI n="download" size={14}/> Export</button>
        <button className="cc-ml-btn" onClick={handleBulkDeactivate}><TI n="archive" size={14}/> Archivieren</button>
        <button className="cc-ml-btn cc-ml-btn-danger" onClick={handleBulkDelete}><TI n="trash" size={14}/> Löschen (DSGVO)</button>
        <button className="cc-btn-ghost" onClick={()=>{setSelected(new Set());setSelectMode(false);}}><TI n="x" size={13}/> Abbrechen</button>
      </div>
    )}

    {/* Liste / Tabelle */}
    <Card className="cc-card-table" flush>
      {filtered.length===0&&<div className="cc-empty">Keine Mitglieder gefunden.</div>}
      {filtered.length>0&&(isMobile?(
        <div>
          {groups.map(({key,members})=>(
            <div key={key}>
              {groupBy!=="none"&&<div className="cc-members-list-group-hdr">{key} <span className="cc-text-muted">({members.length})</span></div>}
              {members.map(m=>(
                <div key={m.id} className="cc-members-item" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
                  {m.foto_url
                    ?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>
                    :<Av name={m.name||"?"} size={38}/>
                  }
                  <div className="cc-members-item-meta">
                    <div className="cc-members-item-name">{m.name}</div>
                    <div className="cc-members-item-sub">
                      {m.mitgliedschaft!=="-"?m.mitgliedschaft:""}
                    </div>
                    {m.rollen.length>0&&(
                      <div className="cc-members-item-chips">
                        {m.rollen.slice(0,2).map((r,i)=>{
                          const rawR=(m.kader_rollen_raw||[])[i]||"";
                          const isT=TRAINER_KEYS.some(k=>rawR===k)||r.toLowerCase().includes("trainer");
                          return <span key={i} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`}>{r}</span>;
                        })}
                        {m.rollen.length>2&&<span className="cc-ml-more">+{m.rollen.length-2}</span>}
                      </div>
                    )}
                  </div>
                  <div className="cc-members-item-right">
                    <TI n="chevron-right" size={14} className="cc-members-item-chevron"/>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ):(
        <div className="cc-table-wrap"><div className="cc-table-wrap-inner"><table className="cc-members-table">
          <thead>
            <tr>
              {selectMode&&<th className="cc-members-cb-col">
                <div className={`cc-col-menu-check${selected.size===paged.length&&paged.length>0?" cc-col-menu-check-on":""}`} onClick={toggleSelectAll}>
                  {selected.size===paged.length&&paged.length>0&&<TI n="check" size={10}/>}
                </div>
              </th>}
              {COLS.map(col=>(
                <th key={col.key}
                  className={`cc-members-th${dragCol&&dragCol!==col.key?" cc-members-th-drop-target":""}${dragCol===col.key?" cc-members-th-dragging":""}`}
                  onClick={()=>{
                    if(dragCol){
                      if(dragCol!==col.key) handleColDrop(col.key);
                      else handleColDragEnd();
                    } else {
                      handleSort(col.key);
                    }
                  }}
                >
                  <span className="cc-members-th-inner">
                    {col.key!=="name"&&(
                      <span
                        className={`cc-col-drag-handle${dragCol===col.key?" cc-col-drag-handle-active":""}`}
                        onClick={e=>{e.stopPropagation();dragCol===col.key?handleColDragEnd():handleColDragStart(col.key);}}
                        title={dragCol===col.key?"Verschieben abbrechen":"Spalte verschieben"}
                        aria-hidden="true"
                      ><TI n="grip-vertical" size={11}/></span>
                    )}
                    <span style={{cursor:dragCol?"crosshair":"pointer"}}>{col.label}{!dragCol&&<SortIcon col={col.key}/>}</span>
                  </span>
                </th>
              ))}
              <th className="cc-members-th cc-members-th-actions"/>
            </tr>
          </thead>
          <tbody>
            {groups.map(({key,members})=>(
              <Fragment key={key}>
                {groupBy!=="none"&&(
                  <tr className="cc-members-group-hdr"><td colSpan={COLS.length+1}>{key} <span className="cc-text-muted">({members.length})</span></td></tr>
                )}
                {members.map(m=>(
                  <tr key={m.id} className={`cc-members-tr${selected.has(m.id)?" cc-members-tr-selected":""}`}
                    onClick={()=>selectMode?toggleSelectRow(m.id):setSelectedMember({...m,_tab:"info"})}>
                    {selectMode&&<td className="cc-members-cb-col" onClick={e=>e.stopPropagation()}>
                      <div className={`cc-col-menu-check${selected.has(m.id)?" cc-col-menu-check-on":""}`} onClick={()=>toggleSelectRow(m.id)}>
                        {selected.has(m.id)&&<TI n="check" size={10}/>}
                      </div>
                    </td>}
                    {COLS.map(col=>{
                      switch(col.key){
                        case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm"/>:<Av name={m.name||"?"} size={26}/>}<span className="cc-text-bold">{m.name}</span></div></td>;
                        case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-sub">{m.mitgliedschaft||"—"}</td>;
                        case "rollen": return <td key="rollen" className="cc-members-td">{m.rollen.length>0?m.rollen.map((r,i)=>{const rawR=(m.kader_rollen_raw||[])[i]||"";const isT=TRAINER_KEYS.some(k=>rawR===k)||r.toLowerCase().includes("trainer");return <span key={i} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`} style={{marginRight:3}}>{r}</span>;}):(<span className="cc-members-td-sub">—</span>)}</td>;
                        case "teams": return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{m.teams.length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{m.teams.slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{m.teams.length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:m.teams,x:e.clientX,y:e.clientY});}}>+{m.teams.length-1}</button>}</span>):"—"}</td>;
                        case "datenpruefung": return <td key="datenpruefung" className="cc-members-td"><DpBadge val={m.datenpruefung}/></td>;
                        case "portal": return <td key="portal" className="cc-members-td"><PortalBadge val={m.portal}/></td>;
                        case "email": return <td key="email" className="cc-members-td cc-members-td-sub">{m.email||"—"}</td>;
                        case "telefon": return <td key="telefon" className="cc-members-td cc-members-td-sub">{m.telefon||"—"}</td>;
                        case "geburtsdatum": return <td key="geburtsdatum" className="cc-members-td cc-members-td-sub">{m.geburtsdatum?new Date(m.geburtsdatum).toLocaleDateString("de-CH"):"—"}</td>;
                        case "alter": return <td key="alter" className="cc-members-td cc-members-td-sub">{m.alter||"—"}</td>;
                        case "geschlecht": return <td key="geschlecht" className="cc-members-td cc-members-td-sub">{m.geschlecht||"—"}</td>;
                        case "nationalitaet": return <td key="nationalitaet" className="cc-members-td cc-members-td-sub">{m.nationalitaet||"—"}</td>;
                        case "ort": return <td key="ort" className="cc-members-td cc-members-td-sub">{m.ort||"—"}</td>;
                        case "spielerpass": return <td key="spielerpass" className="cc-members-td cc-members-td-sub">{m.spielerpass||"—"}</td>;
                        case "fairgate_id": return <td key="fairgate_id" className="cc-members-td cc-members-td-sub">{m.fairgate_id||"—"}</td>;
                        case "js_nr": return <td key="js_nr" className="cc-members-td cc-members-td-sub">{m.js_nr||"—"}</td>;
                        case "eintritt": return <td key="eintritt" className="cc-members-td cc-members-td-sub">{m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"—"}</td>;
                        case "position": return <td key="position" className="cc-members-td cc-members-td-sub">{m.position||"—"}</td>;
                        case "rueckennr": return <td key="rueckennr" className="cc-members-td cc-members-td-sub">{m.rueckennr||"—"}</td>;
                        default: return <td key={col.key} className="cc-members-td cc-members-td-sub">—</td>;
                      }
                    })}
                    <td className="cc-members-td cc-members-td-actions"/>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table></div></div>
      ))}
    {hasMore&&!isMobile&&(
      <div style={{textAlign:"center",padding:"16px 0"}}>
        <Btn onClick={()=>setPageSize(p=>p+50)}>
          <TI n="chevron-down" size={14}/> Weitere {Math.min(50,sorted.length-pageSize)} laden
        </Btn>
        <span style={{marginLeft:12,fontSize:12,color:"var(--sub)"}}>{pageSize} von {sorted.length} angezeigt</span>
      </div>
    )}

    </Card>

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
              <div key={i} className="cc-mehr-sheet-item" style={{borderBottom:i<teamsPopover.teams.length-1?"0.5px solid var(--border)":"none"}}>
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
);
}

export default MemberDetail;
