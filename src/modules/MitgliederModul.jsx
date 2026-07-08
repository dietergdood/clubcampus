/* ═══════════════════════════════════════════════════════════════
   ClubCampus MitgliederModul — MitgliederModul.jsx
   Mitgliederverwaltung und -liste
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../constants.js";
import { TI } from "../icons.jsx";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile, useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect, Toolbar, ColMenuButton, BulkBar, SortHeader, useConfirm } from "../theme.jsx";
import { getRole } from "./NavigationModul.jsx";
import { ableitUndSaveRolle } from "../domains/roles/roleUtils.js";
import { currentSeason } from "../domains/season/seasonUtils.js";
import { MemberDetail } from "./members/MemberDetail.jsx";

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
      geschlecht:m.geschlecht||null,
      nationalitaet:m.nationalitaet||"-",
      nationalitaet2:m.nationalitaet2||null,
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
      {key:"nationalitaet2", label:"Nationalität 2", default:false},
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
        if(k==="nationalitaet") return m.nationalitaet&&m.nationalitaet!=="-"?m.nationalitaet:"";
        if(k==="nationalitaet2") return m.nationalitaet2||"";
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
    {key:"rollen", label:"Rollen", vals:[...new Set(allMembers.map(m=>m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null).filter(Boolean))].sort()},
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
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!fVals.includes(portalLabel)) return false;
        continue;
      }
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
    if(g==="teams"){
      return m.teams&&m.teams.length>0?m.teams.map(t=>t?.name||t):["Kein Team"];
    }
    if(g==="rollen"){
      const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
      return portalLabel||"Keine Rolle";
    }
    return null;
  }

  if(groupBy==="none"){
    groups=[{key:"",members:paged}];
  }else{
    const map={};
    paged.forEach(m=>{
      const computed=getGroupKey(m,groupBy);
      const vals=computed!==null?(Array.isArray(computed)?computed:[computed]):Array.isArray(m[groupBy])?m[groupBy].map(t=>t?.name||t||"-"):[m[groupBy]||"-"];
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
                          case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm" style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}/>:<span style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}><Av name={m.name||"?"} size={26}/></span>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
                          case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-sub">{m.mitgliedschaft||"—"}</td>;
                          case "rollen": return <td key="rollen" className="cc-members-td">{(()=>{const portalRaw=m.role&&m.role!=="-"?m.role:null;const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;const portalIsTrainer=portalRaw==="trainer";const kaderWithMeta=m.rollen.map((r,i)=>{const rawR=(m.kader_rollen_raw||[])[i]||"";const isT=TRAINER_KEYS.some(k=>rawR===k);return{label:r,rawR,isT};}).filter(({label,isT})=>{if(label===portalLabel) return false;if(portalIsTrainer&&isT) return false;return true;});const all=[...(portalLabel?[{label:portalLabel,isT:portalIsTrainer}]:[]),...kaderWithMeta];return all.length>0?all.map((c,i)=><span key={i} className={`cc-role-chip cc-role-chip-sm${c.isT?" cc-role-chip-trainer":""}`} style={{marginRight:3}}>{c.label}</span>):(<span className="cc-members-td-sub">—</span>);})()}</td>;
                          case "teams": return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{m.teams.length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{m.teams.slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{m.teams.length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:m.teams,x:e.clientX,y:e.clientY});}}>+{m.teams.length-1}</button>}</span>):"—"}</td>;
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
