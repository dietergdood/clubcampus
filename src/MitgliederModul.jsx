/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, Row, SectionLabel, Stat, Tabs, useIsMobile, avColor, LandSelect, DropMenu } from "./theme.jsx";
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
    "Gönner":      {c:"#9CA3AF",bg:"#F9FAFB"},
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
function MemberHero({m,raw,initials,age,canEdit,sb,onReload,onClose,statusColor,statusBg}){
  const [editOpen,setEditOpen]=useState(false);
  const [editForm,setEditForm]=useState({...raw});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);

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
      mitgliedtyp:editForm.mitgliedtyp||null, funktion:editForm.funktion||null,
      spielerpass:editForm.spielerpass||null, js_nr:editForm.js_nr||null,
      fairgate_id:editForm.fairgate_id||null, notizen:editForm.notizen||null,
      updated_at:new Date().toISOString(),
    }).eq("id",raw.id);
    if(error){ setEditMsg({ok:false,text:error.message}); }
    else{
      setEditMsg({ok:true,text:"Gespeichert ✓"});
      setTimeout(()=>{setEditOpen(false);setEditMsg(null);if(onReload)onReload();},600);
    }
    setEditSaving(false);
  }

  const rollen=[];
  const teams=raw.teams||[m.team].filter(Boolean);
  const mitgliedtyp=raw.mitgliedtyp||m.type;
  if(mitgliedtyp) rollen.push({rolle:mitgliedtyp, teams:teams});
  if(raw.funktion&&raw.funktion!==mitgliedtyp) rollen.push({rolle:raw.funktion, teams:[]});

  return(
    <>
      <Card flush>
        <div className="cc-hero-stripe"/>
        <div className="cc-hero-body">
          <Btn variant="ghost" small onClick={onClose} className="cc-hero-back"><TI n="arrow-left" size={16}/></Btn>
          <div className="cc-hero-meta">
            <h1 className="cc-profile-name">{m.name}</h1>
            <div className="cc-hero-sub">
              {rollen.map((r,i)=>(
                <span key={i}>
                  {i>0&&<span className="cc-hero-sep">·</span>}
                  <span className="cc-hero-role">{r.rolle}</span>
                  {r.teams.length>0&&<span> {r.teams.join(", ")}</span>}
                </span>
              ))}
            </div>
            <div className="cc-chip-row">
              {raw.position&&<Chip text={raw.position} color={BL}/>}
              <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
              {m.hat_portal_zugang&&<span className="cc-badge cc-badge-success"><TI n="circle-check" size={11}/> Portal</span>}
            </div>
          </div>
          {canEdit&&(
            <Btn small onClick={()=>{setEditForm({...raw});setEditOpen(true);}}>
              <TI n="edit" size={13}/> Bearbeiten
            </Btn>
          )}
        </div>
      </Card>
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
              {[
                {k:"mitgliedtyp", l:"Mitgliedtyp", opts:["Spieler","Trainer","Assistent/in","Goalietrainer","Vorstand","Kassier","Materialwart","Platzwart","Schiedsrichter","Passivmitglied","Ehrenmitglied","Gönner"]},
                {k:"funktion",    l:"Funktion"},
                {k:"spielerpass", l:"Spielerpass"},
                {k:"js_nr",       l:"J+S Nr."},
                {k:"fairgate_id", l:"Fairgate-ID"},
              ].map(({k,l,opts})=>(
                <div key={k}>
                  <label className="cc-label">{l}</label>
                  {opts
                    ?<select className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}>
                      <option value="">–</option>
                      {(typeof opts[0]==="string"?opts.map(o=>({v:o,l:o})):opts).map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    :<input className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
                  }
                </div>
              ))}
              {/* Notizen */}
              <div className="cc-form-full">
                <label className="cc-label">Notizen</label>
                <textarea className="cc-input cc-textarea" rows={3} value={editForm.notizen||""} onChange={e=>setEditForm(f=>({...f,notizen:e.target.value}))} placeholder="Notizen…"/>
              </div>
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
        <div className="cc-text-bold" style={{fontSize:13}}>Portal-Zugang</div>
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

function MitgliederModul({role,dbMitglieder=[],kannSchreiben,kannVerwalten}){
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
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
      }))
    :MEMBERS;

  const COLS=[
    {key:"name",   label:"Mitglied"},
    {key:"role",   label:"Rolle"},
    {key:"team",   label:"Team"},
    {key:"type",   label:"Mitgliedtyp"},
    {key:"location",label:"Wohnort"},
    {key:"status", label:"Datenstatus"},
  ];
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
    &&(filterVals.length===0||filterVals.includes(m[groupBy]||"-"))
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
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const fv=getFieldVisibility(role);
    const tab=selectedMember?._tab||"info";
    const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
    const canEdit=kannVerwalten("members");
    const [portalLoading,setPortalLoading]=useState(false);
    const [benutzer,setBenutzer]=useState(null);
    const [portalMsg,setPortalMsg]=useState(null);
    const [linkEmail,setLinkEmail]=useState(raw.email||"");
    const [teamDetails,setTeamDetails]=useState(null);
    const [elternLoaded,setElternLoaded]=useState(null);
    const eltern=elternLoaded!==null?elternLoaded:(raw.eltern||[]);

    useEffect(()=>{
      if(tab==="eltern"&&sb&&raw.id&&elternLoaded===null){
        sb.from("elternkontakte").select("*").eq("mitglied_id",raw.id)
          .then(({data})=>setElternLoaded(data||[]));
      }
    },[tab,raw.id]);

    useEffect(()=>{
      if(tab==="info"&&sb&&raw.id&&teamDetails===null){
        sb.from("mitglieder_team_details")
          .select("*")
          .eq("mitglied_id",raw.id)
          .then(({data})=>setTeamDetails(data||[]));
      }
    },[tab,raw.id]);

    const age=raw.geburtsdatum?Math.floor((new Date()-new Date(raw.geburtsdatum))/31557600000):null;
    const initials=m.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

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
      const {data:existing}=await sb.from("benutzer").select("id,email").eq("email",linkEmail).maybeSingle();
      if(existing){
        await sb.from("mitglieder").update({hat_portal_zugang:true}).eq("id",raw.id);
        await sb.from("benutzer").update({mitglied_id:raw.id}).eq("id",existing.id);
        setPortalMsg({ok:true,text:"Verknüpft ✓"});
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
      <div className="cc-col cc-gap-16">
        {/* Hero Header */}
        <MemberHero m={m} raw={raw} initials={initials} age={age} canEdit={canEdit}
          sb={sb} onReload={onReload} onClose={onClose}
          statusColor={statusColor} statusBg={statusBg}
        />
        {/* Tabs ausserhalb Hero */}
        <Tabs
          tabs={[
            {key:"info",    label:"Profil",      icon:"user",    short:"Profil"},
            {key:"eltern",  label:`Eltern (${eltern.length})`, icon:"heart", short:"Eltern"},
            ...(canEdit?[{key:"portal",       label:"Portal-Zugang", icon:"key",          short:"Portal"}]:[]),
            ...(canEdit?[{key:"datenpruefung",label:"Datenprüfung",  icon:"shield-check", short:"Daten"}]:[]),
            {key:"stats",   label:"Statistik",   icon:"chart-bar",short:"Stats",  soon:true},
            {key:"comments",label:"Kommentare",  icon:"message",  short:"Komm.",  soon:true},
            {key:"ratings", label:"Bewertungen", icon:"star",     short:"Bewert.",soon:true},
          ]}
          active={tab}
          setActive={t=>!(["stats","comments","ratings"].includes(t))&&setTab(t)}
          mb={0}
        />

        {/* Tab: Profil */}
        {tab==="info"&&(
          <div className="cc-grid-2">
            {/* Personalien */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
              {/* Foto */}
              <FotoUpload raw={raw} canUpload={kannSchreiben("members")} sb={sb} onReload={onReload}/>
              {[
                {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
                {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
                ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum||"-"},{l:"Alter",v:age?age+" Jahre":"-"}]:[]),
                {l:"Nationalität", v:raw.nationalitaet||"-", flag:raw.nationalitaet?raw.nationalitaet.toUpperCase():null, flagName:raw.nationalitaet?getLandName(raw.nationalitaet):null},
                {l:"Heimatort",    v:raw.heimatort||"-"},
                {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":"-"},
                ...(fv.showAhv?[{l:"AHV-Nr.",v:raw.ahv_nr||"-"}]:[]),
              ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  {r.flag?(
                    <span className="cc-info-val cc-row cc-gap-6">
                      <span className="cc-land-badge">{r.flag}</span>
                      <span>{r.flagName}</span>
                    </span>
                  ):(
                    <span className={r.v&&r.v!=="-"?"cc-info-val":"cc-info-val cc-text-sub"}>{r.v&&r.v!=="-"?r.v:"—"}</span>
                  )}
                </div>
              ))}
            </Card>
            {/* Kontakt */}
            {fv.showEmail||fv.showTelefon||fv.showAdresse?(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
                {[
                  ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||"-"}]:[]),
                  ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||"-"}]:[]),
                  ...(fv.showAdresse?[
                    {l:"Strasse",v:raw.strasse||"-"},
                    {l:"PLZ/Ort",v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
                  ]:[]),
                ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </Card>
            ):null}
            {/* Vereinsdaten */}
            <Card>
              <div className="cc-section-title"><TI n="shirt" size={14}/> Vereinsdaten</div>
              {[
                {l:"Mitgliedtyp",  v:raw.mitgliedtyp||m.type},
                {l:"Funktion",     v:raw.funktion||m.role},
                ...(fv.showPass?[{l:"Spielerpass",v:raw.spielerpass||"-"}]:[]),
                ...(fv.showPass?[{l:"J+S Nr.",    v:raw.js_nr||"-"}]:[]),
                ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
              ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  {r.flag?(
                    <span className="cc-info-val cc-row cc-gap-6">
                      <span className="cc-land-badge">{r.flag}</span>
                      <span>{r.flagName}</span>
                    </span>
                  ):(
                    <span className={r.v&&r.v!=="-"?"cc-info-val":"cc-info-val cc-text-sub"}>{r.v&&r.v!=="-"?r.v:"—"}</span>
                  )}
                </div>
              ))}
            </Card>
            {/* Teams & Positionen */}
            <Card>
              <div className="cc-section-title"><TI n="users" size={14}/> Teams</div>
              {(raw.teams||[]).length===0&&<div className="cc-text-sm cc-text-sub">Keinem Team zugewiesen.</div>}
              {(raw.teams||[]).map((teamName,i)=>{
                const detail=(teamDetails||[]).find(d=>d.team_name===teamName)||{};
                const nr=detail.rueckennr||raw.rueckennr||null;
                const pos=detail.position||raw.position||null;
                return(
                  <div key={i} className="cc-team-position-row">
                    <div className={nr?"cc-team-nr":"cc-team-nr cc-team-nr-empty"}>
                      {nr||"—"}
                    </div>
                    <div className="cc-flex-1">
                      <div className="cc-text-bold">{teamName}</div>
                      <div className="cc-text-sm">{pos||"—"}</div>
                    </div>
                  </div>
                );
              })}
            </Card>
            {/* Notizen */}
            {fv.showNotizen&&(
              <Card>
                <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
                {raw.notizen
                  ?<div className="cc-text-body">{raw.notizen}</div>
                  :<div className="cc-text-sm cc-text-sub">Keine Notizen.</div>
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
                      <div className="cc-flex-1">
                        <div className="cc-mb-2"><div className="cc-text-bold cc-text-lg">{name}</div></div>
                        <div className="cc-row cc-gap-8 cc-mb-4 cc-flex-wrap">
                          {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                          {e.benutzer_id
                            ?<span className="cc-status-active">Portal: Aktiv</span>
                            :<span className="cc-status-inactive">Portal: Inaktiv</span>
                          }
                        </div>
                        <div className="cc-col cc-gap-2">
                          {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                          {tel&&<a href={`tel:${tel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{tel}</a>}
                        </div>
                      </div>
                      {canEdit&&(
                        <DropMenu items={[
                          {label:"Bearbeiten", icon:"edit",  onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
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
              {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"}`} className="cc-mb-12">{portalMsg.text}</div>}
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
            <TI n="hourglass" size={32} style={{color:"var(--border)",display:"block",margin:"0 auto 12px"}}/>
            Kommt bald
          </div>
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

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
      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:12,marginBottom:groupBy!=="none"?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Suchen nach Name, Rolle, Team…"
          style={{...inputStyle,flex:1,minWidth:180}}/>
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,minWidth:170}}>
          {GROUP_OPTIONS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>
      {/* Gruppen-Filter Chips */}
      {groupBy!=="none"&&(()=>{
        const vals=[...new Set(MEMBERS.map(m=>m[groupBy]||"-"))].sort();
        return(
          <div className="cc-row cc-gap-8 cc-mb-14 cc-filter-row">
            <Btn small onClick={()=>setFilterVals([])}>Alle</Btn>
            {vals.map(v=>{
              const active=filterVals.includes(v);
              return(
                <Btn small onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}>{active&&<span className="cc-text-xs">✓</span>} {v} <span className="cc-text-muted"> {allMembers.filter(m=>(m[groupBy]||"-")===v).length} </span></Btn>
              );
            })}
            {filterVals.length>0&&(
              <Btn variant="ghost" small onClick={()=>setFilterVals([])}>× zurücksetzen</Btn>
            )}
          </div>
        );
      })()}
      {/* Tabelle */}
      <Card className="cc-card-table">
        <div className="cc-table-wrap"><table className="cc-table">
          <thead>
            <tr className="cc-surface2">
              {COLS.map(c=>(
                <th className="cc-th" key={c.key} onClick={()=>handleSort(c.key)}
                  className="cc-clickable"
                  onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--sub)"}>
                  {c.label}<SortIcon col={c.key}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({key,members})=>(
              <>
                {groupBy!=="none"&&(
                  <tr key={"g-"+key}>
                    <td colSpan={6} className="cc-td cc-section-label" style={{
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span className="cc-text-muted">({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    className="cc-tr">
                    <td className="cc-td" className="cc-td">
                      <Row>
                        <Av name={m.name} size={28}/>
                        <span className="cc-text-bold">{m.name}</span>
                      </Row>
                    </td>
                    <td className="cc-td" className="cc-td"><RolleChip rolle={m.role}/></td>
                    <td className="cc-td" className="cc-td" style={{color:"var(--sub)"}}>{m.team}</td>
                    <td className="cc-td" className="cc-td"><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td" className="cc-td" style={{color:"var(--sub)"}}>{m.location}</td>
                    <td className="cc-td" className="cc-td">
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table></div>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

function MembersView({role,dbMitglieder=[],kannSchreiben,kannVerwalten,sb=null,onReload,navToMember=null,onNavToMemberDone=null}){
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);

  // Direkte Navigation vom Kader-Modul
  useEffect(()=>{
    if(navToMember&&dbMitglieder.length>0){
      const m=dbMitglieder.find(x=>x.id===navToMember);
      if(m) setSelectedMember({
        id:m.id,
        name:`${m.vorname||""} ${m.nachname||""}`.trim(),
        role:m.funktion||m.rolle||"-",
        type:m.mitgliedtyp||"-",
        status:m.datenstatus||"-",
        team:(m.teams||[])[0]||"-",
        hat_portal_zugang:m.hat_portal_zugang,
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
      }))
    :MEMBERS;

  const COLS=[
    {key:"name",   label:"Mitglied"},
    {key:"role",   label:"Rolle"},
    {key:"team",   label:"Team"},
    {key:"type",   label:"Mitgliedtyp"},
    {key:"location",label:"Wohnort"},
    {key:"status", label:"Datenstatus"},
  ];
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
    &&(filterVals.length===0||filterVals.includes(m[groupBy]||"-"))
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
  const MemberDetail=({m,onClose})=>{
    const raw=dbMitglieder.find(d=>d.id===m.id)||{};
    const fv=getFieldVisibility(role);
    const tab=selectedMember?._tab||"info";
    const setTab=t=>setSelectedMember(prev=>({...prev,_tab:t}));
    const canEdit=kannVerwalten("members");
    const [portalLoading,setPortalLoading]=useState(false);
    const [benutzer,setBenutzer]=useState(null);
    const [portalMsg,setPortalMsg]=useState(null);
    const [linkEmail,setLinkEmail]=useState(raw.email||"");
    const [teamDetails,setTeamDetails]=useState(null);
    const [elternLoaded,setElternLoaded]=useState(null);
    const eltern=elternLoaded!==null?elternLoaded:(raw.eltern||[]);

    useEffect(()=>{
      if(tab==="eltern"&&sb&&raw.id&&elternLoaded===null){
        sb.from("elternkontakte").select("*").eq("mitglied_id",raw.id)
          .then(({data})=>setElternLoaded(data||[]));
      }
    },[tab,raw.id]);

    useEffect(()=>{
      if(tab==="info"&&sb&&raw.id&&teamDetails===null){
        sb.from("mitglieder_team_details")
          .select("*")
          .eq("mitglied_id",raw.id)
          .then(({data})=>setTeamDetails(data||[]));
      }
    },[tab,raw.id]);

    const age=raw.geburtsdatum?Math.floor((new Date()-new Date(raw.geburtsdatum))/31557600000):null;
    const initials=m.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

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
      const {data:existing}=await sb.from("benutzer").select("id,email").eq("email",linkEmail).maybeSingle();
      if(existing){
        await sb.from("mitglieder").update({hat_portal_zugang:true}).eq("id",raw.id);
        await sb.from("benutzer").update({mitglied_id:raw.id}).eq("id",existing.id);
        setPortalMsg({ok:true,text:"Verknüpft ✓"});
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
      <div className="cc-col cc-gap-16">
        {/* Hero Header */}
        <MemberHero m={m} raw={raw} initials={initials} age={age} canEdit={canEdit}
          sb={sb} onReload={onReload} onClose={onClose}
          statusColor={statusColor} statusBg={statusBg}
        />
        {/* Tabs ausserhalb Hero */}
        <Tabs
          tabs={[
            {key:"info",    label:"Profil",      icon:"user",    short:"Profil"},
            {key:"eltern",  label:`Eltern (${eltern.length})`, icon:"heart", short:"Eltern"},
            ...(canEdit?[{key:"portal",       label:"Portal-Zugang", icon:"key",          short:"Portal"}]:[]),
            ...(canEdit?[{key:"datenpruefung",label:"Datenprüfung",  icon:"shield-check", short:"Daten"}]:[]),
            {key:"stats",   label:"Statistik",   icon:"chart-bar",short:"Stats",  soon:true},
            {key:"comments",label:"Kommentare",  icon:"message",  short:"Komm.",  soon:true},
            {key:"ratings", label:"Bewertungen", icon:"star",     short:"Bewert.",soon:true},
          ]}
          active={tab}
          setActive={t=>!(["stats","comments","ratings"].includes(t))&&setTab(t)}
          mb={0}
        />

        {/* Tab: Profil */}
        {tab==="info"&&(
          <div className="cc-grid-2">
            {/* Personalien */}
            <Card>
              <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
              {/* Foto */}
              <FotoUpload raw={raw} canUpload={kannSchreiben("members")} sb={sb} onReload={onReload}/>
              {[
                {l:"Vorname",      v:raw.vorname||m.name.split(" ")[0]},
                {l:"Nachname",     v:raw.nachname||m.name.split(" ").slice(1).join(" ")},
                ...(fv.showGebdat?[{l:"Geburtsdatum",v:raw.geburtsdatum||"-"},{l:"Alter",v:age?age+" Jahre":"-"}]:[]),
                {l:"Nationalität", v:raw.nationalitaet||"-", flag:raw.nationalitaet?raw.nationalitaet.toUpperCase():null, flagName:raw.nationalitaet?getLandName(raw.nationalitaet):null},
                {l:"Heimatort",    v:raw.heimatort||"-"},
                {l:"Geschlecht",   v:raw.geschlecht==="m"?"Männlich":raw.geschlecht==="w"?"Weiblich":"-"},
                ...(fv.showAhv?[{l:"AHV-Nr.",v:raw.ahv_nr||"-"}]:[]),
              ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  {r.flag?(
                    <span className="cc-info-val cc-row cc-gap-6">
                      <span className="cc-land-badge">{r.flag}</span>
                      <span>{r.flagName}</span>
                    </span>
                  ):(
                    <span className={r.v&&r.v!=="-"?"cc-info-val":"cc-info-val cc-text-sub"}>{r.v&&r.v!=="-"?r.v:"—"}</span>
                  )}
                </div>
              ))}
            </Card>
            {/* Kontakt */}
            {fv.showEmail||fv.showTelefon||fv.showAdresse?(
              <Card>
                <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
                {[
                  ...(fv.showEmail  ?[{l:"E-Mail",  v:raw.email||"-"}]:[]),
                  ...(fv.showTelefon?[{l:"Telefon", v:raw.telefon||"-"}]:[]),
                  ...(fv.showAdresse?[
                    {l:"Strasse",v:raw.strasse||"-"},
                    {l:"PLZ/Ort",v:raw.plz&&raw.ort?`${raw.plz} ${raw.ort}`:"-"},
                  ]:[]),
                ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </Card>
            ):null}
            {/* Vereinsdaten */}
            <Card>
              <div className="cc-section-title"><TI n="shirt" size={14}/> Vereinsdaten</div>
              {[
                {l:"Mitgliedtyp",  v:raw.mitgliedtyp||m.type},
                {l:"Funktion",     v:raw.funktion||m.role},
                ...(fv.showPass?[{l:"Spielerpass",v:raw.spielerpass||"-"}]:[]),
                ...(fv.showPass?[{l:"J+S Nr.",    v:raw.js_nr||"-"}]:[]),
                ...(fv.showFairgateId?[{l:"Fairgate-ID",v:raw.fairgate_id||"-"}]:[]),
              ].filter(r=>canEdit||(r.v&&r.v!=="-")).map((r,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  {r.flag?(
                    <span className="cc-info-val cc-row cc-gap-6">
                      <span className="cc-land-badge">{r.flag}</span>
                      <span>{r.flagName}</span>
                    </span>
                  ):(
                    <span className={r.v&&r.v!=="-"?"cc-info-val":"cc-info-val cc-text-sub"}>{r.v&&r.v!=="-"?r.v:"—"}</span>
                  )}
                </div>
              ))}
            </Card>
            {/* Teams & Positionen */}
            <Card>
              <div className="cc-section-title"><TI n="users" size={14}/> Teams</div>
              {(raw.teams||[]).length===0&&<div className="cc-text-sm cc-text-sub">Keinem Team zugewiesen.</div>}
              {(raw.teams||[]).map((teamName,i)=>{
                const detail=(teamDetails||[]).find(d=>d.team_name===teamName)||{};
                const nr=detail.rueckennr||raw.rueckennr||null;
                const pos=detail.position||raw.position||null;
                return(
                  <div key={i} className="cc-team-position-row">
                    <div className={nr?"cc-team-nr":"cc-team-nr cc-team-nr-empty"}>
                      {nr||"—"}
                    </div>
                    <div className="cc-flex-1">
                      <div className="cc-text-bold">{teamName}</div>
                      <div className="cc-text-sm">{pos||"—"}</div>
                    </div>
                  </div>
                );
              })}
            </Card>
            {/* Notizen */}
            {fv.showNotizen&&(
              <Card>
                <div className="cc-section-title"><TI n="notes" size={14}/> Notizen</div>
                {raw.notizen
                  ?<div className="cc-text-body">{raw.notizen}</div>
                  :<div className="cc-text-sm cc-text-sub">Keine Notizen.</div>
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
                      <div className="cc-flex-1">
                        <div className="cc-mb-2"><div className="cc-text-bold cc-text-lg">{name}</div></div>
                        <div className="cc-row cc-gap-8 cc-mb-4 cc-flex-wrap">
                          {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                          {e.benutzer_id
                            ?<span className="cc-status-active">Portal: Aktiv</span>
                            :<span className="cc-status-inactive">Portal: Inaktiv</span>
                          }
                        </div>
                        <div className="cc-col cc-gap-2">
                          {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                          {tel&&<a href={`tel:${tel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{tel}</a>}
                        </div>
                      </div>
                      {canEdit&&(
                        <DropMenu items={[
                          {label:"Bearbeiten", icon:"edit",  onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
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
              {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"}`} className="cc-mb-12">{portalMsg.text}</div>}
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
            <TI n="hourglass" size={32} style={{color:"var(--border)",display:"block",margin:"0 auto 12px"}}/>
            Kommt bald
          </div>
        )}
      </div>
    );
  };

  if(selectedMember) return <MemberDetail m={selectedMember} onClose={()=>setSelectedMember(null)}/>;

  return(
    <div>
      {/* Header */}
      <div className="cc-page-hdr">
        <h1 className="cc-page-title">Mitglieder</h1>
        {canExport&&<div className="cc-row cc-gap-8"><Btn>Export CSV</Btn><Btn>Export Excel</Btn></div>}
      </div>
      {/* Stats */}
      <div className="cc-grid-stats cc-mb-20">
        <Stat label="Total" value={allMembers.length} color={BL}/>
        <Stat label="Trainer" value={allMembers.filter(m=>m.role==="Trainer").length} color={R}/>
        <Stat label="Aktivmitglieder" value={allMembers.filter(m=>m.type==="Aktivmitglied").length} color={GN}/>
        <Stat label="Datenprüfung fällig" value={allMembers.filter(m=>m.status!=="Vollständig").length} color={AM}/>
      </div>
      {/* Filter-Zeile */}
      <div style={{display:"flex",gap:12,marginBottom:groupBy!=="none"?8:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Suchen nach Name, Rolle, Team…"
          style={{...inputStyle,flex:1,minWidth:180}}/>
        <select value={groupBy} onChange={e=>{setGroupBy(e.target.value);setFilterVals([]);}}
          style={{...inputStyle,minWidth:170}}>
          {GROUP_OPTIONS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>
      {/* Gruppen-Filter Chips */}
      {groupBy!=="none"&&(()=>{
        const vals=[...new Set(MEMBERS.map(m=>m[groupBy]||"-"))].sort();
        return(
          <div className="cc-row cc-gap-8 cc-mb-14 cc-filter-row">
            <button onClick={()=>setFilterVals([])}
              className="cc-filter-pill" style={{
                background:filterVals.length===0?BK:"var(--surface)",
                color:filterVals.length===0?"#fff":"var(--sub)",
                fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>
              Alle
            </button>
            {vals.map(v=>{
              const active=filterVals.includes(v);
              return(
                <button key={v} onClick={()=>setFilterVals(prev=>active?prev.filter(x=>x!==v):[...prev,v])}
                  className="cc-filter-pill" style={{
                    border:"1px solid "+(active?BK:"var(--border)"),
                    background:active?BK:"var(--surface)",
                    color:active?"#fff":"var(--sub)",
                    fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s",
                    display:"flex",alignItems:"center",gap:8}}>
                  {active&&<span className="cc-text-xs">✓</span>}
                  {v}
                  <span className="cc-text-muted">
                    {allMembers.filter(m=>(m[groupBy]||"-")===v).length}
                  </span>
                </button>
              );
            })}
            {filterVals.length>0&&(
              <button onClick={()=>setFilterVals([])}
                className="cc-filter-pill" style={{
                  background:"none",color:R,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                × zurücksetzen
              </button>
            )}
          </div>
        );
      })()}
      {/* Tabelle */}
      <Card className="cc-card-table">
        <div className="cc-table-wrap"><table className="cc-table">
          <thead>
            <tr className="cc-surface2">
              {COLS.map(c=>(
                <th className="cc-th" key={c.key} onClick={()=>handleSort(c.key)}
                  className="cc-clickable"
                  onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--sub)"}>
                  {c.label}<SortIcon col={c.key}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({key,members})=>(
              <>
                {groupBy!=="none"&&(
                  <tr key={"g-"+key}>
                    <td colSpan={6} className="cc-td cc-section-label" style={{
                      fontWeight:700,fontSize:14,color:"var(--sub)",textTransform:"uppercase",
                      letterSpacing:0.6,borderTop:"1px solid var(--border)"}}>
                      {key} <span className="cc-text-muted">({members.length})</span>
                    </td>
                  </tr>
                )}
                {members.map((m,i)=>(
                  <tr key={m.id} onClick={()=>setSelectedMember({...m,_tab:"info"})}
                    className="cc-tr"
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td className="cc-td" className="cc-td">
                      <div className="cc-row">
                        <Av name={m.name} size={28}/>
                        <span className="cc-text-bold">{m.name}</span>
                      </div>
                    </td>
                    <td className="cc-td" className="cc-td"><RolleChip rolle={m.role}/></td>
                    <td className="cc-td" className="cc-td" style={{color:"var(--sub)"}}>{m.team}</td>
                    <td className="cc-td" className="cc-td"><Chip text={m.type} color={BL}/></td>
                    <td className="cc-td" className="cc-td" style={{color:"var(--sub)"}}>{m.location}</td>
                    <td className="cc-td" className="cc-td">
                      <Chip text={m.status} color={statusColor(m.status)} bg={statusBg(m.status)}/>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table></div>
        {filtered.length===0&&(
          <div className="cc-empty">
            Keine Mitglieder gefunden.
          </div>
        )}
      </Card>
    </div>
  );
}

export { MembersView };
export default MitgliederModul;
