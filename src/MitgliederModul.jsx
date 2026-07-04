/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import React from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, SectionLabel, Stat, StatusTile, Tabs, useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect } from "./theme.jsx";
import { MEMBERS } from "./demoData.js";
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
function MemberHero({m,raw,initials,age,canEdit,sb,onReload,onClose,statusColor,statusBg,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null}){
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
  const [portalFunktionen,setPortalFunktionen]=useState([]);
  const fotoInputRef=useRef(null);

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
      if(portalFunktionen.length===0){
        sb.from("portal_funktionen").select("id,name,portal_gruppen(name,farbe)").order("name")
          .then(({data})=>setPortalFunktionen(data||[]));
      }
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
            <div className="cc-member-hero-av">
              {raw.foto_url
                ?<img src={raw.foto_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                :<span className="cc-hero-av-initials">{initials}</span>
              }
            </div>
            {canEdit&&(
              <>
                <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-hidden" onChange={handleHeroFotoUpload}/>
                <button className="cc-hero-av-edit" onClick={()=>fotoInputRef.current?.click()} title="Foto ändern">
                  <TI n="camera" size={11}/>
                </button>
              </>
            )}
          </div>
          <div className="cc-member-hero-info">
            <h1 className="cc-page-title" style={{margin:0}}>{m.name}</h1>
            <div className="cc-hero-chips">
              {(()=>{
                const ROLLE_LABEL=dbPortalRollen.length>0
                  ?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label]))
                  :{administrator:"Administrator",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Elternteil",mitglied:"Mitglied",supporter:"Supporter"};
                const TRAINER_ROLLEN=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
                const hatTrainerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN.includes(r)));
                const hatSpielerKader=teamDetails&&teamDetails.length>0&&!hatTrainerKader;
                const hatFunktionen=(raw.funktionen||[]).length>0;
                const chips=[];
                if(mitgliedtyp) chips.push({label:mitgliedtyp,type:"type"});
                
                if(hatTrainerKader) chips.push({label:ROLLE_LABEL["trainer"]||"Trainer",type:"rolle"});
                if(hatSpielerKader) chips.push({label:ROLLE_LABEL["spieler"]||"Spieler",type:"rolle"});
                if(hatFunktionen) chips.push({label:ROLLE_LABEL["funktionaer"]||"Funktionär",type:"rolle"});
                if(benutzer?.role&&["administrator","administration"].includes(benutzer.role))
                  chips.push({label:ROLLE_LABEL[benutzer.role]||benutzer.role,type:"rolle"});
                return chips.map((c,i)=>(
                  <span key={i} className={`cc-hero-chip${c.type==="age"?" cc-hero-chip-age":""}`}>{c.label}</span>
                ));
              })()}
            </div>
          </div>
          <div className="cc-hero-banner-actions">
            {canEdit&&(
              <div ref={heroMenuRef} style={{position:"relative"}}>
                <button className="cc-hero-banner-btn" onMouseDown={e=>e.stopPropagation()}
                  onClick={e=>{e.stopPropagation();setHeroMenuOpen(o=>!o);}}>
                  <TI n="dots-vertical" size={16}/>
                </button>
                {heroMenuOpen&&(
                  <div className="cc-menu" style={{position:"absolute",top:"calc(100% + 4px)",right:0,left:"auto",zIndex:100}}>
                    <button className="cc-menu-item" onClick={()=>{setHeroMenuOpen(false);setEditForm({...raw});setEditOpen(true);}}>
                      <TI n="edit" size={13}/> Bearbeiten
                    </button>
                    <div className="cc-menu-sep"/>
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
function elternAvColor(beziehung){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}

function MitgliederModul({role,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,navToMember=null,onNavToMemberDone=null,onNavToTeam=null}){
  const isMobile=useIsMobile();
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState([]);
  const [filterOpen,setFilterOpen]=useState(false);
  const [groupOpen,setGroupOpen]=useState(false);
  const [selectedMember,setSelectedMember]=useState(null);

  // Direkte Navigation vom Kader-Modul
  useEffect(()=>{
    if(navToMember&&dbMitglieder.length>0){
      const m=dbMitglieder.find(x=>x.id===navToMember);
      if(m) setSelectedMember({
        id:m.id,
        name:`${m.vorname||""} ${m.nachname||""}`.trim(),
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

  /* Mitglieder: aus Supabase wenn geladen, sonst MEMBERS Fallback */
  const allMembers=dbMitglieder.length>0
    ?dbMitglieder.map(m=>({
        id:m.id,
        name:`${m.vorname} ${m.nachname}`,
        vorname:m.vorname, nachname:m.nachname,
        role:m.rolle||"-",
        team:(m.teams||[]).join(", ")||"-",
        type:m.mitgliedtyp||"-",
        location:m.ort||"-",
        status:m.datenstatus||"Vollständig",
        email:m.email, telefon:m.telefon,
        geburtsdatum:m.geburtsdatum, position:m.position,
        fairgate_id:m.fairgate_id,
        hat_portal_zugang:m.hat_portal_zugang,
        foto_url:m.foto_url||null,
        mitgliedtyp:m.mitgliedtyp||"-",
        funktionen:m.funktionen||[],
      }))
    :MEMBERS;

  const ALL_COLS=[
    {key:"name",        label:"Name",         default:true},
    {key:"type",        label:"Mitgliedtyp",  default:true},
    {key:"role",        label:"Rolle",        default:true},
    {key:"status",      label:"Status",       default:true},
    {key:"team",        label:"Team",         default:true},
    {key:"location",    label:"Wohnort",      default:false},
    {key:"spielerpass", label:"Spielerpass",  default:false},
    {key:"fairgate_id", label:"Fairgate-ID",  default:false},
    {key:"geburtsdatum",label:"Geburtsdatum", default:false},
  ];
  const [visibleCols,setVisibleCols]=useState(()=>ALL_COLS.filter(c=>c.default).map(c=>c.key));
  const [colMenuOpen,setColMenuOpen]=useState(false);
  const colMenuRef=useRef(null);
  useEffect(()=>{
    function h(e){if(colMenuRef.current&&!colMenuRef.current.contains(e.target))setColMenuOpen(false);}
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  const COLS=ALL_COLS.filter(c=>visibleCols.includes(c.key));
  const GROUP_OPTIONS=[
    {val:"none",  label:"Keine Gruppierung"},
    {val:"role",  label:"Nach Rolle"},
    {val:"team",  label:"Nach Team"},
    {val:"type",  label:"Nach Mitgliedtyp"},
    {val:"status",label:"Nach Datenstatus"},
  ];

  function handleSort(key){
    if(sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else{ setSortCol(key); setSortDir("asc"); }
  }

  const filtered=allMembers.filter(m=>
    (!search||m.name.toLowerCase().includes(search.toLowerCase())||
    m.role.toLowerCase().includes(search.toLowerCase())||
    m.team.toLowerCase().includes(search.toLowerCase()))
    &&(filterVals.length===0||(
      filterVals.includes(m[groupBy]||"-")
    ))
  );

  const sorted=[...filtered].sort((a,b)=>{
    const av=String(a[sortCol]??""); const bv=String(b[sortCol]??"");
    return sortDir==="asc"?String(av||'').localeCompare(String(bv||'')):String(bv||'').localeCompare(String(av||''));
  });

  /* Gruppierung */
  let groups=[];
  if(groupBy==="none"){
    groups=[{key:"",members:sorted}];
  }else{
    const map={};
    sorted.forEach(m=>{
      const k=m[groupBy]||"-";
      if(!map[k]) map[k]=[];
      map[k].push(m);
    });
    groups=Object.entries(map).sort(([a],[b])=>String(a||'').localeCompare(String(b||''))).map(([k,members])=>({key:k,members}));
  }

  const statusColor=s=>s==="Vollständig"?GN:s==="Prüfung fällig"?AM:R;
  const statusBg=s=>s==="Vollständig"?"#ECFDF5":s==="Prüfung fällig"?"#FFFBEB":RL;
  const SortIcon=({col})=>sortCol===col
    ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
    :<span className="cc-sort-arrow cc-text-muted">↕</span>;

  const inputStyle={padding:"7px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:14,outline:"none",background:"var(--surface2)",color:"var(--text)",fontFamily:FONT};

  /* ── Detail-Modal ── */
  const MemberDetail=({m,onClose,onNavToTeam=null})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const fv=getFieldVisibility(role);
    const tab=selectedMember?._tab||"info";
    const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
    const canEdit=kannVerwalten("members");
    const isMobile=useIsMobile();
    const [portalLoading,setPortalLoading]=useState(false);
    const [benutzer,setBenutzer]=useState(null);
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
      if((tab==="eltern"||(tab==="info"&&raw.mitgliedtyp==="Juniormitglied"))&&sb&&raw.id&&elternLoaded===null){
        sb.from("elternkontakte").select("*").eq("mitglied_id",raw.id)
          .then(({data})=>setElternLoaded(data||[]));
      }
    },[tab,raw.id]);

    useEffect(()=>{
      if(tab==="info"&&sb&&raw.id&&teamDetails===null){
        sb.from("kader")
          .select("*, teams(id,name,kurzname)")
          .eq("mitglied_id",raw.id).eq("aktiv",true)
          .then(({data})=>setTeamDetails(data||[]));
      }
    },[tab,raw.id]);

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
    const initials=m.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

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
        <MemberHero m={m} raw={raw} initials={initials} age={age} canEdit={canEdit}
          sb={sb} onReload={onReload} onClose={onClose}
          statusColor={statusColor} statusBg={statusBg}
          dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
          benutzer={benutzer} teamDetails={teamDetails} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
        />
        {/* Stats */}
        {/* Tabs */}
        <Tabs
          tabs={[
            {key:"info",    label:"Profil",      icon:"user",    short:"Profil"},
            {key:"eltern",  label:`Eltern (${eltern.length})`, icon:"heart", short:"Eltern"},
            ...(canEdit?[{key:"portal",       label:"Portal-Zugang", icon:"key",          short:"Portal"}]:[]),
            ...(canEdit?[{key:"datenpruefung",label:"Datenprüfung",  icon:"shield-check", short:"Daten"}]:[]),
            {key:"stats",   label:"Statistik",   icon:"chart-bar",short:"Stats",  soon:true},
            {key:"comments",label:"Kommentare",  icon:"message",  short:"Komm.",  soon:true},
          ]}
          active={tab}
          setActive={t=>!(["stats","comments"].includes(t))&&setTab(t)}
          mb={0}
        />
        <div className="cc-member-stats">
          <StatusTile label="Mitgliedtyp"   value={raw.mitgliedtyp||"—"}                                                    icon="id-badge-2"    semantic="neutral"/>
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
              const hk=raw.mitgliedtyp==="Juniormitglied"?eltern.find(e=>e.hauptkontakt):null;
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
                      <span className="cc-hk-sub-label">Hauptkontakt</span>
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
                  {raw.mitgliedtyp==="Juniormitglied"&&!hk&&(
                    <>
                      <span className="cc-hk-sub-label">Hauptkontakt</span>
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
                  <div className={k.rueckennr?"cc-team-nr":"cc-team-nr cc-team-nr-empty"}>
                    {k.rueckennr||"—"}
                  </div>
                  <div className="cc-flex-1">
                    <div className="cc-text-bold">{k.teams?.name||"—"}</div>
                    <div className="cc-row cc-gap-4 cc-flex-wrap" style={{marginTop:4}}>
                      {(k.rollen||["Spieler/in"]).map((r,ri)=>(
                        <span key={ri} className="cc-role-chip">{r}</span>
                      ))}
                      {k.position&&<span className="cc-pos-chip">{k.position}</span>}
                    </div>
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
            {((raw.funktionen||[]).length>0||canEdit)&&(
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
                      <div className="cc-flex-1">
                        <div className="cc-text-bold">{f}</div>
                        {gruppe&&(
                          <div className="cc-row cc-gap-5" style={{marginTop:3}}>
                            <span className="cc-funk-gruppe-badge" style={funkObj?.portal_gruppen?.farbe?{background:funkObj.portal_gruppen.farbe+"20",color:funkObj.portal_gruppen.farbe,borderColor:funkObj.portal_gruppen.farbe+"40"}:{}}>{gruppe}</span>
                          </div>
                        )}
                      </div>
                      {canEdit&&(
                        <DropMenu items={[
                          {label:"Entfernen", icon:"trash", danger:true, onClick:async()=>{
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
                <div style={{maxHeight:320,overflowY:"auto"}}>
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
                                {on&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
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
            <Card style={{gridColumn:"1/-1"}}>
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
                  <div style={{position:"relative",marginBottom:6}}>
                    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--sub)",pointerEvents:"none",display:"flex"}}>
                      <TI n="search" size={14}/>
                    </span>
                    <input className="cc-input" placeholder="Suchen…" value={teamAssignRolleSearch||""}
                      onChange={e=>setTeamAssignRolleSearch(e.target.value)}
                      style={{paddingLeft:34,width:"100%"}}/>
                  </div>
                  <div style={{border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden",maxHeight:220,overflowY:"auto"}}>
                    {dbKaderRollen.filter(r=>!(teamAssignRolleSearch)||r.name.toLowerCase().includes((teamAssignRolleSearch||"").toLowerCase())).map(r=>{
                      const sel=(teamAssignForm.funktionen||[]).includes(r.name);
                      return(
                        <div key={r.name} className={`cc-role-list-item${sel?" cc-role-list-item-selected":""}`}
                          onClick={()=>setTeamAssignForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==r.name):[...(p.funktionen||[]),r.name]}))}>
                          <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                            {sel&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                          </div>
                          <span style={{fontSize:13,flex:1}}>{r.name}</span>
                          {r.ist_trainer&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:"#FEF3C7",color:"#B45309"}}>Trainer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="cc-row cc-gap-10">
                  <div className="cc-form-nr">
                    <label className="cc-label">Nr.</label>
                    <input className="cc-input" type="number" min="1" max="99" placeholder="—"
                      value={teamAssignForm.rueckennr} onChange={e=>setTeamAssignForm(p=>({...p,rueckennr:e.target.value}))}/>
                  </div>
                  <div style={{flex:1}}>
                    <label className="cc-label">Position</label>
                    <select className="cc-input" value={teamAssignForm.position} onChange={e=>setTeamAssignForm(p=>({...p,position:e.target.value}))}>
                      <option value="">—</option>
                      <optgroup label="Torwart"><option value="TW">TW</option></optgroup>
                      <optgroup label="Verteidiger">{["V","IV","RV","LV"].map(p=><option key={p} value={p}>{p}</option>)}</optgroup>
                      <optgroup label="Mittelfeld">{["MF","DM","ZM","LM","RM"].map(p=><option key={p} value={p}>{p}</option>)}</optgroup>
                      <optgroup label="Sturm"><option value="ST">ST</option></optgroup>
                    </select>
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
                      <div style={{position:"relative",marginBottom:6}}>
                        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--sub)",pointerEvents:"none",display:"flex"}}>
                          <TI n="search" size={14}/>
                        </span>
                        <input className="cc-input" placeholder="Suchen…" value={editTeamRolleSearch||""}
                          onChange={e=>setEditTeamRolleSearch(e.target.value)}
                          style={{paddingLeft:34,width:"100%"}}/>
                      </div>
                      <div style={{border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden",maxHeight:220,overflowY:"auto"}}>
                        {dbKaderRollen.filter(r=>!(editTeamRolleSearch)||r.name.toLowerCase().includes((editTeamRolleSearch||"").toLowerCase())).map(r=>{
                          const sel=(editTeamForm.funktionen||[]).includes(r.name);
                          return(
                            <div key={r.name} className={`cc-role-list-item${sel?" cc-role-list-item-selected":""}`}
                              onClick={()=>setEditTeamForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==r.name):[...(p.funktionen||[]),r.name]}))}>
                              <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                                {sel&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                              </div>
                              <span style={{fontSize:13,flex:1}}>{r.name}</span>
                              {r.ist_trainer&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:"#FEF3C7",color:"#B45309"}}>Trainer</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="cc-row cc-gap-10">
                      <div className="cc-form-nr">
                        <label className="cc-label">Nr.</label>
                        <input className="cc-input" type="number" min="1" max="99" placeholder="—"
                          value={editTeamForm.rueckennr} onChange={e=>setEditTeamForm(p=>({...p,rueckennr:e.target.value}))}/>
                      </div>
                      <div style={{flex:1}}>
                        <label className="cc-label">Position</label>
                        <select className="cc-input" value={editTeamForm.position} onChange={e=>setEditTeamForm(p=>({...p,position:e.target.value}))}>
                          <option value="">—</option>
                          <optgroup label="Torwart"><option value="TW">TW</option></optgroup>
                          <optgroup label="Verteidiger">{["V","IV","RV","LV"].map(p=><option key={p} value={p}>{p}</option>)}</optgroup>
                          <optgroup label="Mittelfeld">{["MF","DM","ZM","LM","RM"].map(p=><option key={p} value={p}>{p}</option>)}</optgroup>
                          <optgroup label="Sturm"><option value="ST">ST</option></optgroup>
                        </select>
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
              <Card style={{gridColumn:"1/-1"}}>
                <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
                {raw.notizen
                  ?<div className="cc-text-body">{raw.notizen}</div>
                  :<div className="cc-text-sm cc-text-sub" style={{fontStyle:"italic"}}>Keine Notizen vorhanden.</div>
                }
              </Card>
            )}
          </div>
        )}

        {/* Tab: Eltern */}
        {tab==="eltern"&&(()=>{
          const [editEltern,setEditEltern]=useState(null); // {mode:"edit"|"new", data:{}}
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

          const ElternForm=({data,onChange})=>(
            <div className="cc-form-row cc-mt-12">
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
                    ?<select className="cc-input" value={data[k]||""} onChange={e=>onChange({...data,[k]:e.target.value})}>
                      <option value="">– wählen –</option>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    :<input className="cc-input" type={type} value={data[k]||""} onChange={e=>onChange({...data,[k]:e.target.value})} placeholder={l}/>
                  }
                </div>
              ))}
            </div>
          );

          return(
            <div className="cc-col cc-gap-8">
              {/* Header mit Hinzufügen */}
              {canEdit&&!editEltern&&(
                <div className="cc-between">
                  <div className="cc-text-sm">{eltern.length} Elternkontakt{eltern.length!==1?"e":""}</div>
                  <Btn small onClick={()=>setEditEltern({mode:"new",data:{mitglied_id:raw.id}})}>
                    <TI n="plus"/> Hinzufügen
                  </Btn>
                </div>
              )}

              {/* Eltern Liste */}
              {eltern.length===0&&<div className="cc-empty">Keine Elternkontakte erfasst.</div>}
              {eltern.map((e,i)=>{
                const name=e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
                const tel=e.telefon||e.tel;
                return(
                  <Card key={i}>
                    <div className="cc-row cc-gap-12 cc-items-center">
                      {(()=>{const ac=elternAvColor(e.beziehung);return(
                        <div className="cc-eltern-av" style={{background:ac.bg,color:ac.text}}>
                          {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                      );})()}
                      <div className="cc-flex-1 cc-col cc-gap-5">
                        <div className="cc-text-bold cc-text-lg">{name}</div>
                        <div className="cc-row cc-gap-8 cc-flex-wrap">
                          {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                          {e.benutzer_id
                            ?<span className="cc-status-active">● Portal: Aktiv</span>
                            :<span className="cc-status-inactive">● Portal: Inaktiv</span>
                          }
                          {e.hauptkontakt&&<span className="cc-status-hauptkontakt">★ Hauptkontakt</span>}
                        </div>
                        {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                        {tel&&<a href={`tel:${tel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{tel}</a>}
                      </div>
                      {canEdit&&(
                        <DropMenu items={[
                          {label:"Bearbeiten", icon:"edit",  onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
                          {label:e.hauptkontakt?"Hauptkontakt entfernen":"Als Hauptkontakt setzen", icon:"user", onClick:async()=>{
                            if(!sb) return;
                            // Erst alle auf false, dann diesen auf true (oder toggle)
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
                          {label:"Löschen",    icon:"trash", danger:true, onClick:()=>deleteEltern(e.id)},
                        ]}/>
                      )}
                    </div>
                  </Card>
                );
              })}

              {/* Modal für Neu/Bearbeiten */}
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
                            ?<select className="cc-input" value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))}>
                              <option value="">– wählen –</option>
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
        })()}


        {/* Tab: Portal-Zugang */}
        {tab==="portal"&&canEdit&&(
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
        {tab==="datenpruefung"&&canEdit&&(
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

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)} onNavToTeam={onNavToTeam}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-page-hdr">
        <h1 className="cc-page-title">Mitglieder</h1>
        {canExport&&<Row align="flex-start"><Btn>Export CSV</Btn><Btn>Export Excel</Btn></Row>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats cc-mb-20">
        <Stat label="Total" value={allMembers.length} color={BL}/>
        <Stat label="Trainer" value={allMembers.filter(m=>m.role==="Trainer").length} color={R}/>
        <Stat label="Aktivmitglieder" value={allMembers.filter(m=>m.type==="Aktivmitglied").length} color={GN}/>
        <Stat label="Datenprüfung fällig" value={allMembers.filter(m=>m.status!=="Vollständig").length} color={AM}/>
      </div>
      {/* Toolbar */}
      <div className="cc-ml-toolbar">
        <div className="cc-ml-srch">
          <TI n="search" size={15} className="cc-input-icon"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen nach Name, Team, Rolle…"/>
        </div>
        {/* Filter Button + Dropdown */}
        <div className="cc-ml-dropdown-wrap">
          <button className={`cc-ml-btn${filterVals.length>0?" cc-active":""}`} onClick={()=>{setFilterOpen(o=>!o);setGroupOpen(false)}}>
            <TI n="filter" size={15}/>
            {!isMobile&&"Filter"}
            {filterVals.length>0&&<span className="cc-ml-filter-dot"/>}
          </button>
          {filterOpen&&(
            <div className="cc-ml-dropdown cc-ml-filter-dropdown">
              <div className="cc-col-menu-hdr">Filter</div>
              {[
                {label:"Rolle", vals:[...new Set(allMembers.map(m=>m.role).filter(Boolean))]},
                {label:"Status", vals:[...new Set(allMembers.map(m=>m.status).filter(Boolean))]},
                {label:"Mitgliedtyp", vals:[...new Set(allMembers.map(m=>m.mitgliedtyp||m.type).filter(Boolean))]},
              ].map(({label,vals})=>(
                <div key={label}>
                  <div className="cc-ml-dropdown-section-lbl">{label}</div>
                  {vals.sort().map(v=>(
                    <div key={v} className="cc-col-menu-item" onClick={()=>setFilterVals(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v])}>
                      <div className={`cc-col-menu-check${filterVals.includes(v)?" cc-col-menu-check-on":""}`}>
                        {filterVals.includes(v)&&<TI n="check" size={10}/>}
                      </div>
                      {v}
                    </div>
                  ))}
                </div>
              ))}
              <div className="cc-ml-dropdown-footer">
                <button className="cc-ml-dropdown-clear" onClick={()=>setFilterVals([])}>Zurücksetzen</button>
                <button className="cc-ml-dropdown-apply" onClick={()=>setFilterOpen(false)}>Fertig</button>
              </div>
            </div>
          )}
        </div>
        {/* Gruppieren Button + Dropdown */}
        <div className="cc-ml-dropdown-wrap">
          <button className={`cc-ml-btn${groupBy!=="none"?" cc-active":""}`} onClick={()=>{setGroupOpen(o=>!o);setFilterOpen(false)}}>
            <TI n="layout-rows" size={15}/>
            {!isMobile&&"Gruppieren"}
          </button>
          {groupOpen&&(
            <div className="cc-ml-dropdown cc-ml-group-dropdown">
              <div className="cc-col-menu-hdr">Gruppieren nach</div>
              {GROUP_OPTIONS.map(o=>(
                <div key={o.val} className="cc-col-menu-item" onClick={()=>{setGroupBy(o.val);setFilterVals([]);setGroupOpen(false)}}>
                  <div className={`cc-col-menu-check${groupBy===o.val?" cc-col-menu-check-on":""}`}>
                    {groupBy===o.val&&<TI n="check" size={10}/>}
                  </div>
                  {o.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Aktive Filter Chips */}
      {filterVals.length>0&&(
        <div className="cc-ml-chips">
          {filterVals.map(v=>(
            <div key={v} className="cc-ml-chip" onClick={()=>setFilterVals(prev=>prev.filter(x=>x!==v))}>
              {v} <span className="cc-ml-chip-x">×</span>
            </div>
          ))}
          <div className="cc-ml-chip cc-text-sub" onClick={()=>setFilterVals([])}>
            Alle zurücksetzen ×
          </div>
        </div>
      )}
      {/* Liste / Tabelle */}
      <Card className="cc-card-table" flush>
        {filtered.length===0&&<div className="cc-empty">Keine Mitglieder gefunden.</div>}
        {filtered.length>0&&(isMobile?(
          /* Mobile: C-style iOS Liste */
          <div>
            {groups.map(({key,members})=>(
              <div key={key}>
                {groupBy!=="none"&&<div className="cc-members-list-group-hdr">{key} <span className="cc-text-muted">({members.length})</span></div>}
                {members.map(m=>(
                  <div key={m.id} className="cc-members-item" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
                    {m.foto_url
                      ?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>
                      :<Av name={m.name} size={42}/>
                    }
                    <div className="cc-members-item-meta">
                      <div className="cc-members-item-name">{m.name}</div>
                      <div className="cc-members-item-sub">
                        {m.role&&m.role!=="-"?m.role:m.type}
                        {m.team&&m.team!=="-"?" · "+m.team.split(", ")[0]:""}
                      </div>
                    </div>
                    <div className="cc-members-item-right">
                      {m.team&&m.team.split(", ").length>1&&(
                        <span className="cc-members-item-more">+{m.team.split(", ").length-1}</span>
                      )}
                      <span className={`cc-members-dot ${m.status==="Vollständig"||m.status==="geprüft"?"cc-members-dot-ok":m.status==="ausstehend"?"cc-members-dot-warn":"cc-members-dot-err"}`}/>
                      <TI n="chevron-right" size={14} className="cc-members-item-chevron"/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ):(
          /* Desktop: A-style kompakte Tabelle */
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner"><table className="cc-members-table">
            <thead>
              <tr>
                {COLS.map((col,i)=>(
                  <th key={col.key} className="cc-members-th" onClick={()=>handleSort(col.key)}>
                    {i===COLS.length-1?(
                      <div className="cc-members-th-last">
                        <span>{col.label}<span className="cc-sort-arrow">{sortCol===col.key?(sortDir==="asc"?"▲":"▼"):"↕"}</span></span>
                        <div className="cc-col-menu-wrap" ref={colMenuRef}>
                          <button className={`cc-col-icon-btn${colMenuOpen?" cc-col-menu-check-on":""}`}
                            onClick={e=>{e.stopPropagation();setColMenuOpen(o=>!o)}}
                            title="Spalten auswählen">
                            <TI n="layout-columns" size={14}/>
                          </button>
                          {colMenuOpen&&(
                            <div className="cc-col-menu-dropdown">
                              <div className="cc-col-menu-hdr">Spalten anzeigen</div>
                              {ALL_COLS.map(c=>(
                                <div key={c.key} className="cc-col-menu-item" onClick={e=>{e.stopPropagation();setVisibleCols(prev=>
                                  prev.includes(c.key)?prev.length>1?prev.filter(k=>k!==c.key):prev:[...prev,c.key]
                                )}}>
                                  <div className={`cc-col-menu-check${visibleCols.includes(c.key)?" cc-col-menu-check-on":""}`}>
                                    {visibleCols.includes(c.key)&&<TI n="check" size={10}/>}
                                  </div>
                                  {c.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ):(
                      <span>{col.label}<span className="cc-sort-arrow">{sortCol===col.key?(sortDir==="asc"?"▲":"▼"):"↕"}</span></span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(({key,members})=>(
                <React.Fragment key={key}>
                  {groupBy!=="none"&&(
                    <tr className="cc-members-group-hdr"><td colSpan={COLS.length}>{key} <span className="cc-text-muted">({members.length})</span></td></tr>
                  )}
                  {members.map(m=>(
                    <tr key={m.id} className="cc-members-tr" onClick={()=>setSelectedMember({...m,_tab:"info"})}>
                      {visibleCols.includes("name")&&<td className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm"/>:<Av name={m.name} size={26}/>}<span className="cc-text-bold">{m.name}</span></div></td>}
                      {visibleCols.includes("type")&&<td className="cc-members-td cc-members-td-sub">{m.type||"—"}</td>}
                      {visibleCols.includes("role")&&<td className="cc-members-td"><RolleChip rolle={m.role}/></td>}
                      {visibleCols.includes("status")&&<td className="cc-members-td">
                        <span className="cc-members-dot" style={{background:statusColor(m.status)}}/>
                        <span className="cc-members-td-sub">{m.status}</span>
                      </td>}
                      {visibleCols.includes("team")&&<td className="cc-members-td cc-members-td-sub">{m.team||"—"}</td>}
                      {visibleCols.includes("location")&&<td className="cc-members-td cc-members-td-sub">{m.location||"—"}</td>}
                      {visibleCols.includes("spielerpass")&&<td className="cc-members-td cc-members-td-sub">{m.spielerpass||"—"}</td>}
                      {visibleCols.includes("fairgate_id")&&<td className="cc-members-td cc-members-td-sub">{m.fairgate_id||"—"}</td>}
                      {visibleCols.includes("geburtsdatum")&&<td className="cc-members-td cc-members-td-sub">{m.geburtsdatum?new Date(m.geburtsdatum).toLocaleDateString("de-CH"):"—"}</td>}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table></div></div>
        ))}
      </Card>
    </div>
  );
}

// MembersView = MitgliederModul (mit sb/onReload/navToMember Props)
const MembersView = MitgliederModul;

export { MembersView };
export default MitgliederModul;
