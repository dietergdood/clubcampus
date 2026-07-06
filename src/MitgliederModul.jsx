/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile, useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect, Toolbar, ColMenuButton, BulkBar, SortHeader, useConfirm } from "./theme.jsx";
import { getRole } from "./NavigationModul.jsx";

/* ── Länderliste ISO2 → {name, flag} ── */
const LAENDER=[
  {c:"CH",n:"Schweiz"},{c:"DE",n:"Deutschland"},{c:"AT",n:"Österreich"},
  {c:"IT",n:"Italien"},{c:"FR",n:"Frankreich"},{c:"PT",n:"Portugal"},
  {c:"ES",n:"Spanien"},{c:"TR",n:"Türkei"},{c:"XK",n:"Kosovo"},
  {c:"RS",n:"Serbien"},{c:"HR",n:"Kroatien"},{c:"BA",n:"Bosnien-Herzegowina"},
  {c:"MK",n:"Nordmazedonien"},{c:"AL",n:"Albanien"},{c:"ME",n:"Montenegro"},
  {c:"SI",n:"Slowenien"},{c:"SK",n:"Slowakei"},{c:"CZ",n:"Tschechien"},
  {c:"PL",n:"Polen"},{c:"RO",n:"Rumänien"},{c:"HU",n:"Ungarn"},
  {c:"BG",n:"Bulgarien"},{c:"GR",n:"Griechenland"},{c:"NL",n:"Niederlande"},
  {c:"BE",n:"Belgien"},{c:"LU",n:"Luxemburg"},{c:"GB",n:"Grossbritannien"},
  {c:"IE",n:"Irland"},{c:"DK",n:"Dänemark"},{c:"SE",n:"Schweden"},
  {c:"NO",n:"Norwegen"},{c:"FI",n:"Finnland"},{c:"IS",n:"Island"},
  {c:"RU",n:"Russland"},{c:"UA",n:"Ukraine"},{c:"BY",n:"Belarus"},
  {c:"LT",n:"Litauen"},{c:"LV",n:"Lettland"},{c:"EE",n:"Estland"},
  {c:"MD",n:"Moldau"},{c:"GE",n:"Georgien"},{c:"AM",n:"Armenien"},
  {c:"AZ",n:"Aserbaidschan"},{c:"KZ",n:"Kasachstan"},{c:"US",n:"USA"},
  {c:"CA",n:"Kanada"},{c:"MX",n:"Mexiko"},{c:"BR",n:"Brasilien"},
  {c:"AR",n:"Argentinien"},{c:"CO",n:"Kolumbien"},{c:"CL",n:"Chile"},
  {c:"PE",n:"Peru"},{c:"UY",n:"Uruguay"},{c:"PY",n:"Paraguay"},
  {c:"BO",n:"Bolivien"},{c:"VE",n:"Venezuela"},{c:"EC",n:"Ecuador"},
  {c:"MA",n:"Marokko"},{c:"DZ",n:"Algerien"},{c:"TN",n:"Tunesien"},
  {c:"EG",n:"Ägypten"},{c:"NG",n:"Nigeria"},{c:"GH",n:"Ghana"},
  {c:"SN",n:"Senegal"},{c:"CM",n:"Kamerun"},{c:"CI",n:"Elfenbeinküste"},
  {c:"ZA",n:"Südafrika"},{c:"KE",n:"Kenia"},{c:"ET",n:"Äthiopien"},
  {c:"TZ",n:"Tansania"},{c:"UG",n:"Uganda"},{c:"AO",n:"Angola"},
  {c:"CD",n:"DR Kongo"},{c:"IR",n:"Iran"},{c:"IQ",n:"Irak"},
  {c:"SY",n:"Syrien"},{c:"LB",n:"Libanon"},{c:"JO",n:"Jordanien"},
  {c:"SA",n:"Saudi-Arabien"},{c:"AE",n:"Vereinigte Arab. Emirate"},
  {c:"IL",n:"Israel"},{c:"PS",n:"Palästina"},{c:"AF",n:"Afghanistan"},
  {c:"PK",n:"Pakistan"},{c:"IN",n:"Indien"},{c:"BD",n:"Bangladesch"},
  {c:"LK",n:"Sri Lanka"},{c:"NP",n:"Nepal"},{c:"CN",n:"China"},
  {c:"JP",n:"Japan"},{c:"KR",n:"Südkorea"},{c:"VN",n:"Vietnam"},
  {c:"TH",n:"Thailand"},{c:"PH",n:"Philippinen"},{c:"ID",n:"Indonesien"},
  {c:"MY",n:"Malaysia"},{c:"SG",n:"Singapur"},{c:"AU",n:"Australien"},
  {c:"NZ",n:"Neuseeland"},{c:"LI",n:"Liechtenstein"},{c:"MC",n:"Monaco"},
  {c:"SM",n:"San Marino"},{c:"MT",n:"Malta"},{c:"CY",n:"Zypern"},
].sort((a,b)=>a.n.localeCompare(b.n,"de"));

// Flagge aus ISO2-Code (Emoji)
// Ländername aus ISO2-Code
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

function RolleChip({rolle}){
  const colors={
    "Spieler":     {c:"#22C55E",bg:"#F0FDF4"},
    "Trainer":     {c:"#F97316",bg:"#FFF7ED"},
    "Assistent/in":{c:"#F97316",bg:"#FFF7ED"},
    "Goalietrainer":{c:"#F97316",bg:"#FFF7ED"},
    "Vorstand":    {c:"#8B5CF6",bg:"#F5F3FF"},
    "Kassier":     {c:"#8B5CF6",bg:"#F5F3FF"},
    "Materialwart":{c:"#3B82F6",bg:"#EFF6FF"},
    "Platzwart":   {c:"#3B82F6",bg:"#EFF6FF"},
    "Schiedsrichter":{c:"#EC4899",bg:"#FDF2F8"},
    "Elternteil":  {c:"#06B6D4",bg:"#ECFEFF"},
    "Ehrenmitglied":{c:"#f8de09",bg:"#FFFBEB"},
    "Passivmitglied":{c:"#9CA3AF",bg:"#F9FAFB"},
  };
  const s=colors[rolle]||{c:"#9CA3AF",bg:"#F9FAFB"};
  return <Chip text={rolle||"-"} color={s.c} bg={s.bg}/>;
}

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
    const ok=await confirm({title:`${m.name} löschen?`,message:"Diese Aktion kann nicht rückgängig gemacht werden.",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
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
    <>{confirmDialog}
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
                    {visible.map((c,i)=>(<span key={i} className="cc-hero-chip cc-hero-chip-primary">{c.label}</span>))}
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
                ...(canEdit&&raw.aktiv!==false?[{icon:"archive",label:"Archivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok)return;const n=account?.name||account?.email||"Administrator";await sb.from("mitglieder").update({aktiv:false,deaktiviert_am:new Date().toISOString(),deaktiviert_von:n}).eq("id",raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,false);if(onReload)onReload(raw.id);if(onRefreshCount)onRefreshCount();}}]:[]),
                ...(raw.aktiv===false?["sep",{icon:"user-check",label:"Reaktivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!ok)return;await sb.from("mitglieder").update({aktiv:true,deaktiviert_am:null,deaktiviert_von:null}).eq("id",raw.id);if(onUpdatePortalZugang)await onUpdatePortalZugang(raw.id,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(raw.id);else if(onReload)onReload(raw.id);}}]:[]),
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
    const ok=await confirm({title:"Foto löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
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
    const ok=await confirm({title:"Elternkontakt löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
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


function elternAvColor(beziehung){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}

function ArchivView({archivData,archivLoaded,sb,account,onUpdatePortalZugang=null,onReload,onOpenMember}){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const [archivSearch,setArchivSearch]=useState("");
  const [archivFilterVals,setArchivFilterVals]=useState({});
  const [archivGroupBy,setArchivGroupBy]=useState("none");
  const [archivSortCol,setArchivSortCol]=useState("deaktiviert_am");
  const [archivSortDir,setArchivSortDir]=useState("desc");
  const [archivSelectMode,setArchivSelectMode]=useState(false);
  const [archivSelected,setArchivSelected]=useState([]);

  async function reaktivieren(e,id,name){
    e.stopPropagation();
    const ok=await confirm({title:`${name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!sb||!ok) return;
    await sb.from("mitglieder").update({aktiv:true,deaktiviert_am:null,deaktiviert_von:null}).eq("id",id);
    if(onUpdatePortalZugang) await onUpdatePortalZugang(id,true);
    if(onReload) onReload();
  }

  async function loeschen(e,id,name){
    e.stopPropagation();
    const ok=await confirm({title:`${name} löschen (DSGVO)?`,message:"Diese Aktion ist unwiderruflich.",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await sb.from("mitglieder").delete().eq("id",id);
    if(onReload) onReload();
  }

  const ARCHIV_FILTER_DEFS=[
    {key:"mitgliedtyp", label:"Mitgliedschaft", vals:[...new Set(archivData.map(m=>m.mitgliedtyp).filter(Boolean))].sort()},
    {key:"deaktiviert_von", label:"Archiviert von", vals:[...new Set(archivData.map(m=>m.deaktiviert_von).filter(Boolean))].sort()},
  ];
  const ARCHIV_GROUP_OPTIONS=[
    {val:"none",           label:"Keine Gruppierung"},
    {val:"mitgliedtyp",    label:"Nach Mitgliedschaft"},
    {val:"deaktiviert_von",label:"Nach Archiviert von"},
    {val:"__archiviertjahr",label:"Nach Archiviert im Jahr"},
  ];
  const ARCHIV_SORT_OPTIONS=[
    {val:"nachname",       label:"Name"},
    {val:"mitgliedtyp",    label:"Mitgliedschaft"},
    {val:"deaktiviert_am", label:"Archiviert am"},
    {val:"deaktiviert_von",label:"Archiviert von"},
  ];
  const hasActiveFilter=Object.values(archivFilterVals).some(v=>v&&v.length>0);

  const filtered=archivData.filter(m=>{
    const name=`${m.vorname||""} ${m.nachname||""}`.toLowerCase();
    if(archivSearch&&!name.includes(archivSearch.toLowerCase())) return false;
    for(const [k,vals] of Object.entries(archivFilterVals)){
      if(!vals||vals.length===0) continue;
      if(!vals.includes(m[k])) return false;
    }
    return true;
  }).sort((a,b)=>{
    const av=a[archivSortCol]||"";
    const bv=b[archivSortCol]||"";
    const cmp=String(av).localeCompare(String(bv));
    return archivSortDir==="asc"?cmp:-cmp;
  });

  function getArchivGroupKey(m){
    if(archivGroupBy==="__archiviertjahr") return m.deaktiviert_am?String(new Date(m.deaktiviert_am).getFullYear()):"Unbekannt";
    return m[archivGroupBy]||"-";
  }
  const archivGroups=archivGroupBy==="none"
    ?[{key:"",members:filtered}]
    :Object.entries(filtered.reduce((acc,m)=>{
        const k=getArchivGroupKey(m);
        if(!acc[k]) acc[k]=[];
        acc[k].push(m);
        return acc;
      },{})).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([k,members])=>({key:k,members}));

  return(
    <>{confirmDialog}
    <div>
      <div className="cc-info-box cc-info-box-warn cc-mb-16">
        <TI n="info-circle" size={15}/>
        Archivierte Mitglieder — Daten sind noch vorhanden und können reaktiviert werden.
      </div>
      <Toolbar
        search={archivSearch} onSearch={setArchivSearch}
        filterDefs={ARCHIV_FILTER_DEFS}
        filterVals={archivFilterVals}
        onFilterChange={(key,val,active)=>{
          if(key==="__reset"){setArchivFilterVals({});return;}
          setArchivFilterVals(prev=>({
            ...prev,
            [key]:active?[...(prev[key]||[]),val]:(prev[key]||[]).filter(x=>x!==val)
          }));
        }}
        groupOptions={ARCHIV_GROUP_OPTIONS}
        groupBy={archivGroupBy} onGroupChange={setArchivGroupBy}
        moreItems={[
          {header:true,label:"Aktionen"},
          {icon:"checkbox",label:archivSelectMode?"Auswahl beenden":"Mehrere auswählen",onClick:()=>{setArchivSelectMode(o=>!o);setArchivSelected([]);} },
        ]}
      />
      <BulkBar
        show={archivSelectMode}
        count={archivSelected.length}
        total={filtered.length}
        onSelectAll={()=>setArchivSelected(archivSelected.length===filtered.length?[]:filtered.map(m=>m.id))}
        actions={[
          {icon:"user-check", label:"Reaktivieren", requiresSelection:true, onClick:async()=>{
            if(!archivSelected.length) return;const ok=await confirm({title:`${archivSelected.length} Mitglieder reaktivieren?`,confirmLabel:"Reaktivieren"});if(!sb||!ok) return;
            for(const id of archivSelected){
              await sb.from("mitglieder").update({aktiv:true,deaktiviert_am:null,deaktiviert_von:null}).eq("id",id);
              if(onUpdatePortalZugang) await onUpdatePortalZugang(id,true);
            }
            setArchivSelected([]);setArchivSelectMode(false);if(onReload)onReload();
          }},
          {icon:"trash", label:"Löschen (DSGVO)", danger:true, requiresSelection:true, onClick:async()=>{
            if(!archivSelected.length) return;const ok=await confirm({title:`${archivSelected.length} Mitglieder löschen?`,message:"Diese Aktion ist unwiderruflich (DSGVO).",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
            for(const id of archivSelected) await sb.from("mitglieder").delete().eq("id",id);
            setArchivSelected([]);setArchivSelectMode(false);if(onReload)onReload();
          }},
        ]}
        onCancel={()=>{setArchivSelected([]);setArchivSelectMode(false);}}
      />
      {hasActiveFilter&&(
        <div className="cc-ml-chips cc-mb-16">
          {Object.entries(archivFilterVals).flatMap(([k,vals])=>(vals||[]).map(v=>(
            <div key={k+v} className="cc-ml-chip" onClick={()=>setArchivFilterVals(prev=>({...prev,[k]:(prev[k]||[]).filter(x=>x!==v)}))}
            >{v} <span className="cc-ml-chip-x">×</span></div>
          )))}
          <div className="cc-ml-chip cc-text-sub" onClick={()=>setArchivFilterVals({})}>Alle löschen</div>
        </div>
      )}
      {!archivLoaded&&<div className="cc-empty">Wird geladen…</div>}
      {archivLoaded&&filtered.length===0&&<div className="cc-empty">Keine archivierten Mitglieder gefunden.</div>}
      {archivLoaded&&filtered.length>0&&(
        <Card flush>
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner">
            <table className="cc-members-table">
              <thead>
                <tr>
                  {archivSelectMode&&<th className="cc-members-th" style={{width:36}}><input type="checkbox" onChange={e=>setArchivSelected(e.target.checked?filtered.map(m=>m.id):[])}/></th>}
                  {[["nachname","Name"],["mitgliedtyp","Mitgliedschaft"],["deaktiviert_am","Archiviert am"],["deaktiviert_von","Archiviert von"]].map(([col,lbl])=>(
                    <SortHeader key={col} col={col} label={lbl} sortCol={archivSortCol} sortDir={archivSortDir}
                      onSort={col=>{if(archivSortCol===col)setArchivSortDir(d=>d==="asc"?"desc":"asc");else{setArchivSortCol(col);setArchivSortDir("asc");}}}/>
                  ))}
                  <th className="cc-members-th"/>
                </tr>
              </thead>
              <tbody>
                {archivGroups.map(({key,members})=>(
                  <Fragment key={key}>
                    {archivGroupBy!=="none"&&(
                      <tr><td colSpan={5} className="cc-members-list-group-hdr">{key} <span className="cc-text-muted">({members.length})</span></td></tr>
                    )}
                    {members.map(m=>(
                  <tr key={m.id} className="cc-members-tr" onClick={()=>!archivSelectMode&&onOpenMember&&onOpenMember(m)}>
                      {archivSelectMode&&<td className="cc-members-td" style={{width:36}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={archivSelected.includes(m.id)} onChange={e=>setArchivSelected(prev=>e.target.checked?[...prev,m.id]:prev.filter(id=>id!==m.id))}/></td>}
                    <td className="cc-members-td">
                      <div className="cc-row cc-gap-8">
                        <Av name={`${m.vorname||""} ${m.nachname||""}`} size={26}/>
                        <span className="cc-text-bold">{m.vorname} {m.nachname}</span>
                      </div>
                    </td>
                    <td className="cc-members-td cc-members-td-sub">{m.mitgliedtyp||"—"}</td>
                    <td className="cc-members-td cc-members-td-sub">
                      {m.deaktiviert_am?new Date(m.deaktiviert_am).toLocaleDateString("de-CH"):"—"}
                    </td>
                    <td className="cc-members-td cc-members-td-sub">{m.deaktiviert_von||"—"}</td>
                    <td className="cc-members-td" style={{textAlign:"right"}}>
                      <div className="cc-row cc-gap-6" onClick={e=>e.stopPropagation()}>
                        <Btn small onClick={e=>reaktivieren(e,m.id,`${m.vorname} ${m.nachname}`)}>
                          <TI n="user-check" size={13}/> Reaktivieren
                        </Btn>
                        <Btn small variant="danger" onClick={e=>loeschen(e,m.id,`${m.vorname} ${m.nachname}`)}>
                          <TI n="trash" size={13}/>
                        </Btn>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div></div>
          <div className="cc-archiv-footer">
            {filtered.length} von {archivData.length} archivierten Mitgliedern
          </div>
        </Card>
      )}
    </div>
  </>
  );
}


function NotizenVerlauf({mitgliedId,canEdit,sb,dbUser,onCount}){
  const [confirm,confirmDialog]=useConfirm();
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
      .then(({data})=>{const d=data||[];setNotizen(d);if(onCount)onCount(d.length);});
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
    const d=fresh||[];setNotizen(d);if(onCount)onCount(d.length);
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
    const ok=await confirm({title:"Notiz löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await sb.from("mitglieder_notizen").delete().eq("id",id);
    setNotizen(prev=>{const d=prev.filter(n=>n.id!==id);if(onCount)onCount(d.length);return d;});
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
    <>{confirmDialog}
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
  </>
  );
}


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
    const ok=await confirm({title:"Aus Team entfernen?",confirmLabel:"Entfernen"});if(!sb||!ok) return;
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
              <div key={i} className="cc-team-position-row">
                <div className="cc-list-item-icon"><TI n="ball-football" size={13}/></div>
                <div className="cc-team-position-body">
                  <div className="cc-team-position-name">{k.teams?.name||"—"}</div>
                  {(k.rollen||["Spieler/in"]).length>0&&(
                    <div className="cc-team-position-chips">
                      {(k.rollen||["Spieler/in"]).map((r,ri)=>{
                        const isTrainer=dbKaderRollen.some(kr=>kr.name===r&&kr.ist_trainer);
                        return <span key={ri} className={isTrainer?"cc-role-chip cc-role-chip-trainer":"cc-role-chip"}>{r}</span>;
                      })}
                    </div>
                  )}
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
              <div className="cc-info-grid cc-mb-12">
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
            <div className="cc-info-grid">
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
}

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null}){
  const isMobile=useIsMobile();
  const [confirm,confirmDialog]=useConfirm();
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState({});
  const [savedView,setSavedView]=useState("standard");
  const [dragCol,setDragCol]=useState(null);
  const [dragOverCol,setDragOverCol]=useState(null);
  const [colDragSrc,setColDragSrc]=useState(null);
  const [colDragOver,setColDragOver]=useState(null);
  const [teamsPopover,setTeamsPopover]=useState(null);
  const [pageSize,setPageSize]=useState(50);
  const [selectMode,setSelectMode]=useState(false);
  const [selected,setSelected]=useState(new Set());
  const [customViews,setCustomViews]=useState([]);
  const [saveViewOpen,setSaveViewOpen]=useState(false);
  const [saveViewName,setSaveViewName]=useState("");
  const [savingView,setSavingView]=useState(false);
  const [selectedMember,setSelectedMember]=useState(null);
  const [breakdownOpen,setBreakdownOpen]=useState(false);
  const [archivTab,setArchivTab]=useState(false);
  const [archivData,setArchivData]=useState([]);
  const [archivLoaded,setArchivLoaded]=useState(false);
  const [archivCount,setArchivCount]=useState(null);

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
  const allMembers=dbMitglieder.map(m=>{
    /* Rollen ableiten */
    const rollenSet=new Set();
    (m.kader_rollen||[]).forEach(r=>rollenSet.add(ROLLE_LABEL[r]||r));
    if(rollenSet.size===0&&m.rolle&&m.rolle!=="-") rollenSet.add(ROLLE_LABEL[m.rolle]||m.rolle);
    /* Portal-Zugang */
    const portalStatus=m.hat_portal_zugang?"Aktiv":"Nicht eingerichtet";
    /* Datenpruefung */
    const dpStatus=(!m.datenstatus||m.datenstatus==="Vollstandig"||m.datenstatus==="Vollständig"||m.datenstatus==="geprüft"||m.datenstatus==="Geprueft")&&m.geprueft===true?"Geprueft":m.geprueft===false||!m.geprueft?"Ausstehend":m.datenstatus||"Ausstehend";
    return{
      id:m.id,
      name:(`${m.vorname||""} ${m.nachname||""}`).trim()||"?",
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-",
      type:m.mitgliedtyp||"-",
      rollen:[...rollenSet],
      kader_rollen_raw:m.kader_rollen||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus,
      status:m.datenstatus||"Ausstehend",
      portal:portalStatus,
      hat_portal_zugang:m.hat_portal_zugang,
      ort:m.ort||"-",
      location:m.ort||"-",
      email:m.email,
      telefon:m.telefon,
      geburtsdatum:m.geburtsdatum,
      alter:m.geburtsdatum?Math.floor((Date.now()-new Date(m.geburtsdatum))/(365.25*24*3600*1000)):null,
      geschlecht:m.geschlecht==="m"?"Männlich":m.geschlecht==="w"?"Weiblich":m.geschlecht||"-",
      nationalitaet:m.nationalitaet||"-",
      position:m.position,
      fairgate_id:m.fairgate_id,
      js_nr:m.js_nr,
      spielerpass:m.spielerpass,
      eintritt:m.eintrittsdatum,
      rueckennr:m.rueckennr,
      foto_url:m.foto_url||null,
      funktionen:m.funktionen||[],
      strasse:m.strasse,
      heimatort:m.heimatort,
      ahv_nr:m.ahv_nr,
    };
  });

  /* Gespeicherte Ansichten */
  const SAVED_VIEWS={
    standard:      {label:"Standard",       cols:["name","mitgliedschaft","rollen","teams","portal","datenpruefung"]},
    administration:{label:"Verwaltung",     cols:["name","email","telefon","ort","mitgliedschaft","datenpruefung"]},
  };

  /* Spaltendefinitionen */
  const COL_GROUPS=[
    {group:"Personendaten", cols:[
      {key:"name",          label:"Name",           default:true, alwaysOn:true},
      {key:"nachname",      label:"Nachname",       default:false},
      {key:"vorname",       label:"Vorname",        default:false},
      {key:"geburtsdatum",  label:"Geburtsdatum",   default:false},
      {key:"alter",         label:"Alter",          default:false},
      {key:"geschlecht",    label:"Geschlecht",     default:false},
      {key:"nationalitaet", label:"Nationalität",  default:false},
      {key:"heimatort",     label:"Heimatort",      default:false},
      {key:"ahv_nr",        label:"AHV-Nr.",        default:false},
    ]},
    {group:"Kontakt", cols:[
      {key:"email",         label:"E-Mail",         default:false},
      {key:"telefon",       label:"Telefon",        default:false},
      {key:"strasse",       label:"Strasse",        default:false},
      {key:"ort",           label:"PLZ/Ort",        default:false},
    ]},
    {group:"Verein", cols:[
      {key:"mitgliedschaft",label:"Mitgliedschaft", default:true},
      {key:"rollen",        label:"Rollen",         default:true},
      {key:"funktionen",    label:"Vereinsfunktionen",default:false},
      {key:"eintritt",      label:"Eintritt",       default:false},
      {key:"spielerpass",   label:"Spielerpass",    default:false},
      {key:"fairgate_id",   label:"Fairgate-ID",    default:false},
      {key:"js_nr",         label:"J+S Nr.",        default:false},
    ]},
    {group:"Portal", cols:[
      {key:"portal",        label:"Portal-Zugang",  default:true},
      {key:"datenpruefung", label:"Datenpruefung",  default:true},
    ]},
    {group:"Sport", cols:[
      {key:"teams",         label:"Teams",          default:true},
    ]},
  ];
  const ALL_COLS=COL_GROUPS.flatMap(g=>g.cols);
  const [visibleCols,setVisibleCols]=useState(()=>SAVED_VIEWS.standard.cols);
  const COLS=visibleCols.map(k=>ALL_COLS.find(c=>c.key===k)).filter(Boolean);
  const GROUP_OPTIONS=[
    {val:"none",           label:"Keine Gruppierung"},
    {val:"mitgliedschaft", label:"Nach Mitgliedschaft"},
    {val:"rollen",         label:"Nach Rolle"},
    {val:"teams",          label:"Nach Team"},
    {val:"portal",         label:"Nach Portal-Zugang"},
    {val:"datenpruefung",  label:"Nach Datenprüfung"},
  ];
  const GROUP_OPTIONS_MORE=[
    {val:"geschlecht",     label:"Nach Geschlecht"},
    {val:"nationalitaet",  label:"Nach Nationalität"},
    {val:"ort",            label:"Nach Wohnort"},
    {val:"__jahrgang",     label:"Nach Jahrgang"},
    {val:"__eintrittsjahr",label:"Nach Eintrittsjahr"},
  ];
  function exportData(format){
    const exportCols=COLS.filter(c=>c.key!=="name").map(c=>c.key);
    const headers=["Name",...COLS.filter(c=>c.key!=="name").map(c=>c.label)];
    const rows=filtered.map(m=>[
      m.name,
      ...exportCols.map(k=>{
        if(k==="rollen") return (m.rollen||[]).join(", ");
        if(k==="teams") return (m.teams||[]).map(t=>t.name||t).join(", ");
        if(k==="funktionen") return (m.funktionen||[]).join(", ");
        if(k==="geburtsdatum") return m.geburtsdatum?new Date(m.geburtsdatum).toLocaleDateString("de-CH"):"";
        if(k==="eintritt") return m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"";
        if(k==="portal") return m.hat_portal_zugang?"Aktiv":"Kein Zugang";
        if(k==="datenpruefung") return m.profil_geprueft_at?"Geprüft":"Ausstehend";
        return m[k]!=null?String(m[k]):"";
      })
    ]);
    if(format==="csv"){
      const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,"\"\"")}"` ).join(";")).join("\r\n");
      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="mitglieder.csv";a.click();URL.revokeObjectURL(url);
    } else {
      const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Mitglieder");
      XLSX.writeFile(wb,"mitglieder.xlsx");
    }
  }

  function applyView(viewKey){
    setSavedView(viewKey);
    setVisibleCols(SAVED_VIEWS[viewKey]?.cols||SAVED_VIEWS.standard.cols);
    setFilterVals({});
  }

  function applyCustomView(v){
    setSavedView("custom_"+v.id);
    setVisibleCols(v.spalten||SAVED_VIEWS.standard.cols);
    setFilterVals(v.filter||{});
    setGroupBy(v.gruppierung||"none");
  }

  useEffect(()=>{
    if(!sb||!account?.id) return;
    sb.from("mitglieder_ansichten")
      .select("*").eq("benutzer_id",account.id)
      .order("created_at",{ascending:true})
      .then(({data})=>setCustomViews(data||[]));
  },[account?.id]);

  function toggleSelectMode(){
    setSelectMode(m=>{
      if(m) setSelected(new Set());
      return !m;
    });
  }
  function toggleSelectRow(id){
    setSelected(prev=>{
      const s=new Set(prev);
      s.has(id)?s.delete(id):s.add(id);
      return s;
    });
  }
  function toggleSelectAll(){
    setSelected(prev=>prev.size===paged.length?new Set():new Set(paged.map(m=>m.id)));
  }
  async function handleBulkDelete(){
    if(!sb||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder löschen?`,message:"Diese Aktion kann nicht rükgängig gemacht werden (DSGVO).",danger:true,confirmLabel:"Löschen"});if(!ok) return;
    const ids=[...selected];
    await sb.from("mitglieder").delete().in("id",ids);
    setSelected(new Set());
    setSelectMode(false);
    if(onReload) onReload();
  }
  async function handleBulkDeactivate(){
    if(!sb||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok) return;
    const ids=[...selected];
    const deaktiviertVon=account?.name||account?.email||"Administrator";
    await sb.from("mitglieder").update({aktiv:false,deaktiviert_am:new Date().toISOString(),deaktiviert_von:deaktiviertVon}).in("id",ids);
    if(onUpdatePortalZugang) await Promise.all(ids.map(id=>onUpdatePortalZugang(id,false)));
    refreshArchivCount();
    setSelected(new Set());
    setSelectMode(false);
    setArchivLoaded(false);
    if(onReload) onReload();
  }
  function handleColDragStart(key){ setDragCol(key); }
  function handleColDragOver(key){ setDragOverCol(key); }
  function handleColDrop(targetKey, dragKey){
    const from=dragKey||dragCol;
    if(!from||from===targetKey) return;
    setVisibleCols(prev=>{
      const cols=[...prev];
      const fromIdx=cols.indexOf(from);
      const toIdx=cols.indexOf(targetKey);
      if(fromIdx<0||toIdx<0) return cols;
      cols.splice(fromIdx,1);
      cols.splice(toIdx,0,from);
      return cols;
    });
    setDragCol(null);
    setDragOverCol(null);
  }
  function handleColDragEnd(){ setDragCol(null); setDragOverCol(null); }

  async function saveCurrentView(){
    if(!saveViewName.trim()||!sb||!account?.id) return;
    setSavingView(true);
    const {data}=await sb.from("mitglieder_ansichten").insert({
      benutzer_id:account.id,
      name:saveViewName.trim(),
      spalten:visibleCols,
      filter:filterVals,
      gruppierung:groupBy,
    }).select().single();
    if(data) setCustomViews(prev=>[...prev,data]);
    setSaveViewName("");
    setSaveViewOpen(false);
    setSavingView(false);
  }

  async function deleteCustomView(id){
    if(!sb) return;
    await sb.from("mitglieder_ansichten").delete().eq("id",id);
    setCustomViews(prev=>prev.filter(v=>v.id!==id));
    if(savedView==="custom_"+id) applyView("standard");
  }

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }
  useEffect(()=>setPageSize(50),[search,filterVals,groupBy,sortCol,sortDir]);
  useEffect(()=>{
    if(!sb) return;
    sb.from("mitglieder").select("id",{count:"exact",head:true}).eq("aktiv",false)
      .then(({count})=>setArchivCount(count||0));
  },[sb,archivLoaded]);

  /* Filter */
  const FILTER_DEFS=[
    {key:"mitgliedschaft", label:"Mitgliedschaft", vals:[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(Boolean))]},
    {key:"rollen",         label:"Rollen",         vals:[...new Set(allMembers.flatMap(m=>m.rollen).filter(Boolean))]},
    {key:"datenpruefung",  label:"Datenpruefung",  vals:[...new Set(allMembers.map(m=>m.datenpruefung).filter(Boolean))]},
    {key:"portal",         label:"Portal-Zugang",  vals:[...new Set(allMembers.map(m=>m.portal).filter(Boolean))]},
    {key:"teams",          label:"Teams",          vals:[...new Set(allMembers.flatMap(m=>m.teams.map(t=>t?.name||t)).filter(Boolean))].sort()},
  ];

  const filtered=allMembers.filter(m=>{
    if(search){
      const terms=search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack=[
        m.name,m.mitgliedschaft,
        ...m.rollen,
        ...m.teams.map(t=>t?.name||t||""),
        ...m.teams.map(t=>t?.kurz||""),
        m.email||"",
      ].join(" ").toLowerCase();
      if(!terms.every(t=>haystack.includes(t))) return false;
    }
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||fVals.length===0) continue;
      const raw=m[fKey];
      const mVal=Array.isArray(raw)
        ?raw.map(v=>v?.name||v)
        :[raw?.name||raw];
      if(!mVal.some(v=>fVals.includes(v))) return false;
    }
    return true;
  });

  const sorted=[...filtered].sort((a,b)=>{
    const getVal=m=>{const v=m[sortCol];if(Array.isArray(v)){const f=v[0];return f?.name||f||"";}return String(v??"");};
    const av=getVal(a);
    const bv=getVal(b);
    return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
  });

  const paged=sorted;
  const hasMore=false;
  let groups=[];
  function getGroupKey(m,g){
    if(g==="__jahrgang"){
      if(!m.geburtsdatum) return "Unbekannt";
      return String(new Date(m.geburtsdatum).getFullYear());
    }
    if(g==="__eintrittsjahr"){
      if(!m.eintritt) return "Unbekannt";
      return String(new Date(m.eintritt).getFullYear());
    }
    return null;
  }

  if(groupBy==="none"){
    groups=[{key:"",members:paged}];
  }else{
    const map={};
    paged.forEach(m=>{
      const computed=getGroupKey(m,groupBy);
      const vals=computed!==null?[computed]:Array.isArray(m[groupBy])?m[groupBy]:[m[groupBy]||"-"];
      vals.forEach(k=>{
        if(!map[k]) map[k]=[];
        map[k].push(m);
      });
    });
    groups=Object.entries(map).sort(([a],[b])=>String(a||"").localeCompare(String(b||""))).map(([k,members])=>({key:k,members}));
  }

  const dpColor=s=>s==="Geprueft"?GN:s==="Ausstehend"?AM:R;
  const SortIcon=({col})=>sortCol===col
    ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
    :<span className="cc-sort-arrow cc-text-muted">↕</span>;

  /* ── Detail-Modal ── */
  async function refreshArchivCount(){
    if(!sb) return;
    const {count}=await sb.from("mitglieder").select("id",{count:"exact",head:true}).eq("aktiv",false);
    setArchivCount(count||0);
  }

  async function reloadMember(id){
    if(!sb) return;
    const {data}=await sb.from("mitglieder").select("*").eq("id",id).single();
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
    />
  );

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
    <>{confirmDialog}
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
          <div key={v.id} className={`cc-ml-view-custom${savedView==="custom_"+v.id?" cc-ml-view-custom-active":""}`}>
            <button
              className={`cc-ml-view-btn${savedView==="custom_"+v.id?" cc-ml-view-btn-active":""}`}
              onClick={()=>applyCustomView(v)}
            >{v.name}</button>
            {savedView==="custom_"+v.id&&(
              <button className="cc-ml-view-del-active" onClick={()=>deleteCustomView(v.id)} title="Löschen">
                <TI n="x" size={11}/>
              </button>
            )}
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
      <Toolbar
        search={search} onSearch={setSearch}
        filterDefs={FILTER_DEFS}
        filterVals={filterVals}
        onFilterChange={(key,val,active)=>{
          if(key==="__reset"){setFilterVals({});return;}
          setFilterVals(prev=>({
            ...prev,
            [key]:active?[...(prev[key]||[]),val]:(prev[key]||[]).filter(x=>x!==val)
          }));
        }}
        groupOptions={GROUP_OPTIONS} groupOptionsMore={GROUP_OPTIONS_MORE}
        groupBy={groupBy} onGroupChange={setGroupBy}
        moreItems={[
          {header:true,label:"Aktionen"},
          {icon:"checkbox",label:selectMode?"Auswahlmodus beenden":"Mitglieder auswählen",onClick:toggleSelectMode},
          ...(!isMobile?[{
            icon:"table",label:"Spalten",
            subPanel:(
              <ColMenuButton
                colGroups={COL_GROUPS}
                visibleCols={visibleCols}
                onVisibleColsChange={setVisibleCols}
                dragCol={dragCol}
                dragOverCol={dragOverCol}
                onDragStart={handleColDragStart}
                onDragOver={handleColDragOver}
                onDrop={handleColDrop}
                onDragEnd={handleColDragEnd}
                inline
              />
            ),
          }]:[]),
          ...(canExport?[
            "sep",
            {header:true,label:"Export"},
            {icon:"file-text",label:"Liste als CSV exportieren",onClick:()=>exportData("csv")},
            {icon:"table",label:"Liste als Excel exportieren",onClick:()=>exportData("excel")},
          ]:[]),
        ]}
      />

      {/* Selektionsleiste */}
      {!isMobile&&(
        <BulkBar
          show={selectMode}
          count={selected.size}
          total={paged.length}
          onSelectAll={toggleSelectAll}
          actions={[
            {icon:"download", label:"Auswahl als CSV", onClick:()=>exportData("csv")},
            {icon:"archive",  label:"Archivieren", onClick:handleBulkDeactivate},
            {icon:"trash",    label:"Löschen (DSGVO)", onClick:handleBulkDelete, danger:true, requiresSelection:true},
          ]}
          onCancel={()=>{setSelected(new Set());setSelectMode(false);}}
        />
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
                      onClick={()=>selectMode?toggleSelectRow(m.id):null}>
                      {selectMode&&<td className="cc-members-cb-col" onClick={e=>e.stopPropagation()}>
                        <div className={`cc-col-menu-check${selected.has(m.id)?" cc-col-menu-check-on":""}`} onClick={()=>toggleSelectRow(m.id)}>
                          {selected.has(m.id)&&<TI n="check" size={10}/>}
                        </div>
                      </td>}
                      {COLS.map(col=>{
                        switch(col.key){
                          case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm"/>:<Av name={m.name||"?"} size={26}/>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
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
                          case "strasse": return <td key="strasse" className="cc-members-td cc-members-td-sub">{m.strasse||"—"}</td>;
                          case "heimatort": return <td key="heimatort" className="cc-members-td cc-members-td-sub">{m.heimatort||"—"}</td>;
                          case "ahv_nr": return <td key="ahv_nr" className="cc-members-td cc-members-td-sub">{m.ahv_nr?"••• •• ••••":"—"}</td>;
                          case "vorname": return <td key="vorname" className="cc-members-td cc-members-td-sub">{m.vorname||"—"}</td>;
                          case "nachname": return <td key="nachname" className="cc-members-td cc-members-td-sub">{m.nachname||"—"}</td>;
                          case "funktionen": return <td key="funktionen" className="cc-members-td cc-members-td-sub">{(m.funktionen||[]).join(", ")||"—"}</td>;
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
  </>
  );
}

// MembersView = MitgliederModul (mit sb/onReload/navToMember Props)
const MembersView = MitgliederModul;

export { MembersView };
export default MitgliederModul;
