/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "./constants.js";
import { TI } from "./icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile, useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect } from "./theme.jsx";
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
import MemberDetail from "./MemberDetailModul.jsx";
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
function ArchivView({archivData,archivLoaded,sb,account,onUpdatePortalZugang=null,onReload,onOpenMember}){
  const isMobile=useIsMobile();
  const [archivSearch,setArchivSearch]=useState("");
  const [archivFilter,setArchivFilter]=useState("alle");
  const [archivFilterOpen,setArchivFilterOpen]=useState(false);

  async function reaktivieren(e,id,name){
    e.stopPropagation();
    if(!sb||!window.confirm(`${name} reaktivieren?`)) return;
    await sb.from("mitglieder").update({aktiv:true,deaktiviert_am:null,deaktiviert_von:null}).eq("id",id);
    if(onUpdatePortalZugang) await onUpdatePortalZugang(id,true);
    if(onReload) onReload();
  }

  async function loeschen(e,id,name){
    e.stopPropagation();
    if(!sb||!window.confirm(`${name} unwiderruflich löschen (DSGVO)?`)) return;
    await sb.from("mitglieder").delete().eq("id",id);
    if(onReload) onReload();
  }

  const typen=["alle",...new Set(archivData.map(m=>m.mitgliedtyp).filter(Boolean))];

  const filtered=archivData.filter(m=>{
    const name=`${m.vorname||""} ${m.nachname||""}`.toLowerCase();
    if(archivSearch&&!name.includes(archivSearch.toLowerCase())) return false;
    if(archivFilter!=="alle"&&m.mitgliedtyp!==archivFilter) return false;
    return true;
  });

  return(
    <div>
      <div className="cc-info-box cc-info-box-warn cc-mb-16">
        <TI n="info-circle" size={15}/>
        Archivierte Mitglieder — Daten sind noch vorhanden und können reaktiviert werden.
      </div>
      <div className="cc-ml-toolbar cc-mb-16">
        <div className="cc-ml-srch">
          <TI n="search" size={15} className="cc-input-icon"/>
          <input value={archivSearch} onChange={e=>setArchivSearch(e.target.value)} placeholder="Suchen…"/>
        </div>
        <div className="cc-ml-dropdown-wrap">
          <button className={`cc-ml-btn${archivFilter!=="alle"?" cc-active":""}`} onClick={()=>setArchivFilterOpen(o=>!o)}>
            <TI n="filter" size={15}/>
            {!isMobile&&(archivFilter==="alle"?"Mitgliedschaft":archivFilter)}
            {archivFilter!=="alle"&&<span className="cc-ml-filter-dot"/>}
          </button>
          {archivFilterOpen&&(
            isMobile?(
              <div className="cc-mehr-sheet-overlay" onClick={()=>setArchivFilterOpen(false)}>
                <div className="cc-mehr-sheet-backdrop"/>
                <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                  <div className="cc-mehr-sheet-handle"/>
                  <div className="cc-mehr-sheet-title">Mitgliedschaft</div>
                  {typen.map(t=>(
                    <div key={t} className="cc-mehr-sheet-item"
                      style={{fontWeight:archivFilter===t?600:400,color:archivFilter===t?"var(--cc-accent,#FFBF00)":"var(--text)"}}
                      onMouseDown={e=>{e.stopPropagation();setArchivFilter(t);setArchivFilterOpen(false);}}>
                      {archivFilter===t&&<TI n="check" size={14}/>}
                      {t==="alle"?"Alle Mitgliedschaften":t}
                    </div>
                  ))}
                </div>
              </div>
            ):(
              <div className="cc-ml-dropdown">
                <div className="cc-col-menu-hdr">Mitgliedschaft</div>
                {typen.map(t=>(
                  <div key={t} className="cc-col-menu-item" onClick={()=>{setArchivFilter(t);setArchivFilterOpen(false);}}>
                    <div className={`cc-col-menu-check${archivFilter===t?" cc-col-menu-check-on":""}`}>
                      {archivFilter===t&&<TI n="check" size={10}/>}
                    </div>
                    {t==="alle"?"Alle Mitgliedschaften":t}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
      {!archivLoaded&&<div className="cc-empty">Wird geladen…</div>}
      {archivLoaded&&filtered.length===0&&<div className="cc-empty">Keine archivierten Mitglieder gefunden.</div>}
      {archivLoaded&&filtered.length>0&&(
        <Card flush>
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner">
            <table className="cc-members-table">
              <thead>
                <tr>
                  <th className="cc-members-th">Name</th>
                  <th className="cc-members-th">Mitgliedschaft</th>
                  <th className="cc-members-th">Archiviert am</th>
                  <th className="cc-members-th">Archiviert von</th>
                  <th className="cc-members-th"/>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m=>(
                  <tr key={m.id} className="cc-members-tr" onClick={()=>onOpenMember&&onOpenMember(m)}>
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
              </tbody>
            </table>
          </div></div>
          <div className="cc-archiv-footer">
            {filtered.length} von {archivData.length} archivierten Mitgliedern
          </div>
        </Card>
      )}
    </div>
  );
}
function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null}){
  const isMobile=useIsMobile();
  const [search,setSearch]=useState("");
  const [sortCol,setSortCol]=useState("name");
  const [sortDir,setSortDir]=useState("asc");
  const [groupBy,setGroupBy]=useState("none");
  const [filterVals,setFilterVals]=useState({});
  const [filterOpen,setFilterOpen]=useState(false);
  const [groupOpen,setGroupOpen]=useState(false);
  const [colMenuOpen,setColMenuOpen]=useState(false);
  const [savedView,setSavedView]=useState("standard");
  const [dragCol,setDragCol]=useState(null);
  const [dragOverCol,setDragOverCol]=useState(null);
  const [colDragSrc,setColDragSrc]=useState(null);
  const [colDragOver,setColDragOver]=useState(null);
  const [teamsPopover,setTeamsPopover]=useState(null);
  const [pageSize,setPageSize]=useState(50);
  const [exportOpen,setExportOpen]=useState(false);
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
      {key:"geburtsdatum",  label:"Geburtsdatum",   default:false},
      {key:"alter",         label:"Alter",          default:false},
      {key:"geschlecht",    label:"Geschlecht",     default:false},
      {key:"nationalitaet", label:"Nationalitat",   default:false},
      {key:"ort",           label:"Wohnort",        default:false},
      {key:"email",         label:"E-Mail",         default:false},
      {key:"telefon",       label:"Telefon",        default:false},
    ]},
    {group:"Verein", cols:[
      {key:"mitgliedschaft",label:"Mitgliedschaft", default:true},
      {key:"rollen",        label:"Rollen",         default:true},
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
      {key:"position",      label:"Position",       default:false},
      {key:"rueckennr",     label:"Trikotnummer",   default:false},
    ]},
  ];
  const ALL_COLS=COL_GROUPS.flatMap(g=>g.cols);
  const [visibleCols,setVisibleCols]=useState(()=>SAVED_VIEWS.standard.cols);
  const colMenuRef=useRef(null);
  useEffect(()=>{
    function h(e){if(colMenuRef.current&&!colMenuRef.current.contains(e.target))setColMenuOpen(false);}
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  const COLS=ALL_COLS.filter(c=>visibleCols.includes(c.key));
  const GROUP_OPTIONS=[
    {val:"none",          label:"Keine Gruppierung"},
    {val:"rollen",        label:"Nach Rolle"},
    {val:"teams",         label:"Nach Team"},
    {val:"mitgliedschaft",label:"Nach Mitgliedschaft"},
    {val:"datenpruefung", label:"Nach Datenpruefung"},
    {val:"portal",        label:"Nach Portal-Zugang"},
  ];
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
    if(!window.confirm(`Wirklich ${selected.size} Mitglieder unwiderruflich löschen? Diese Aktion kann nicht rükgängig gemacht werden.`)) return;
    const ids=[...selected];
    await sb.from("mitglieder").delete().in("id",ids);
    setSelected(new Set());
    setSelectMode(false);
    if(onReload) onReload();
  }
  async function handleBulkDeactivate(){
    if(!sb||selected.size===0) return;
    if(!window.confirm(`${selected.size} Mitglieder archivieren?`)) return;
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
  function handleColDragOver(e,key){ e.preventDefault(); setDragOverCol(key); }
  function handleColDrop(targetKey){
    if(!dragCol||dragCol===targetKey) return;
    setVisibleCols(prev=>{
      const cols=[...prev];
      const fromIdx=cols.indexOf(dragCol);
      const toIdx=cols.indexOf(targetKey);
      if(fromIdx<0||toIdx<0) return cols;
      cols.splice(fromIdx,1);
      cols.splice(toIdx,0,dragCol);
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
  if(groupBy==="none"){
    groups=[{key:"",members:paged}];
  }else{
    const map={};
    paged.forEach(m=>{
      const vals=Array.isArray(m[groupBy])?m[groupBy]:[m[groupBy]||"-"];
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

// MembersView = MitgliederModul (mit sb/onReload/navToMember Props)
const MembersView = MitgliederModul;

export { MembersView };
export default MitgliederModul;
