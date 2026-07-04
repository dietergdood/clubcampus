/* ═══════════════════════════════════════════════════════════════
   ClubCampus KaderModul — Supabase-Version
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { GN, R, BL } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, Av, Row, Between, Col, Btn, Input, ModalOrSheet, ModalTitle, Card, DropMenu } from "./theme.jsx";

const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","email","tel","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","email","tel","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

const POSITION_GROUPS = [
  {label:"Torwart",     options:["TW"]},
  {label:"Verteidiger", options:["V","IV","RV","LV"]},
  {label:"Mittelfeld",  options:["MF","DM","ZM","LM","RM"]},
  {label:"Sturm",       options:["ST"]},
];


const COL_DEF_ALL = [
  {key:"name",     label:"Name / Vorname", always:true},
  {key:"funktion", label:"Funktion",       always:true},
  {key:"pos",      label:"Position",       always:true},
  {key:"nr",       label:"Nr.",            always:true},
  {key:"dob",      label:"Geburtsdatum",   field:"dob"},
  {key:"email",    label:"E-Mail",         field:"email"},
  {key:"tel",      label:"Telefon",        field:"tel"},
  {key:"pass",     label:"Spielerpass",    field:"pass"},
  {key:"js",       label:"J+S Nr.",        field:"js"},
  {key:"ahv",      label:"AHV-Nummer",     field:"ahv"},
  {key:"fairgate", label:"Fairgate-ID",    field:"fairgate"},
];

function KaderModul({role, team, sb=null, onSelectMember=null}){
  const isMobile = useIsMobile();
  const vis = FIELD_VIS[role]||[];
  const canEdit = ["trainer","administrator","administration"].includes(role);
  const canExport = ["trainer","funktionaer","administration","administrator"].includes(role);

  const [kader,       setKader]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [groupBy,     setGroupBy]     = useState(true);
  const [showExport,  setShowExport]  = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [exportFields,setExportFields]= useState(["name","funktion","pos","nr"]);
  const [editingPos,  setEditingPos]  = useState(null);
  const [editingNr,   setEditingNr]   = useState(null);
  const [editKader,   setEditKader]   = useState(null); // Kader-Eintrag bearbeiten
  const [editForm,    setEditForm]    = useState({funktionen:[],rueckennr:"",position:""});
  const [editSaving,  setEditSaving]  = useState(false);
  const [editFunkOpen,setEditFunkOpen]= useState(false);
  const [sheetKader,  setSheetKader]  = useState(null); // Mobile Bottom Sheet

  // Mitglied hinzufügen
  const [addSearch,   setAddSearch]   = useState("");
  const [allMitglieder, setAllMitglieder] = useState([]);
  const [addForm,     setAddForm]     = useState({mitglied_id:null,rueckennr:"",position:"",funktionen:["Spieler/in"]});
  const [addFunkOpen, setAddFunkOpen]  = useState(false);
  const [addSaving,   setAddSaving]   = useState(false);

  const teamObj = typeof team === "object" ? team : null;
  const teamId  = teamObj?.id || null;
  const teamName= teamObj?.name || team || "";
  const saison  = "2025/26";

  // Kader laden
  async function loadKader(){
    if(!sb||!teamId){ setLoading(false); return; }
    setLoading(true);
    const {data}=await sb.from("kader")
      .select("*, mitglieder(id,vorname,nachname,geburtsdatum,nationalitaet,heimatort,ahv_nr,telefon,email,strasse,plz,ort,kanton,spielerpass,js_nr,fairgate_id)")
      .eq("team_id",teamId).eq("aktiv",true).eq("saison",saison).order("rueckennr");
    if(data) setKader(data);
    setLoading(false);
  }

  useEffect(()=>{ loadKader(); },[teamId]);

  // Alle Mitglieder für Hinzufügen laden
  useEffect(()=>{
    if(showAdd&&sb&&allMitglieder.length===0){
      sb.from("mitglieder").select("id,vorname,nachname,mitgliedtyp").eq("aktiv",true).order("nachname")
        .then(({data})=>setAllMitglieder(data||[]));
    }
  },[showAdd]);

  // Kader-Eintrag updaten (Nr oder Position)
  async function updateKaderField(kaderId, field, value){
    if(!sb) return;
    await sb.from("kader").update({[field]:value}).eq("id",kaderId);
    setKader(prev=>prev.map(k=>k.id===kaderId?{...k,[field]:value}:k));
  }

  const ROLLE_MAP={"Spieler/in":"spieler","Trainer/in":"trainer","Co-Trainer/in":"trainer","Goalietrainer/in":"trainer","Assistenz":"funktionaer","Masseur/in":"funktionaer"};
  const [dbRollenPrio,setDbRollenPrio]=useState([]);
  const [dbKaderRollenData,setDbKaderRollenData]=useState([]);
  useEffect(()=>{
    if(sb){
      sb.from("portal_rollen").select("name,prioritaet").eq("aktiv",true).order("prioritaet")
        .then(({data})=>{if(data)setDbRollenPrio(data.map(r=>r.name));});
      sb.from("kader_rollen").select("*").eq("aktiv",true).order("sort_order")
        .then(({data})=>{if(data)setDbKaderRollenData(data);});
    }
  },[]);
  const PRIORITAET=dbRollenPrio;

  async function updateBenutzerRolle(mitgliedId){
    if(!sb||!mitgliedId) return;
    const {data:benutzer}=await sb.from("benutzer").select("id,role").eq("mitglied_id",mitgliedId).maybeSingle();
    if(!benutzer) return;
    // Nur administrator/administration nicht automatisch überschreiben
    if(["administrator","administration"].includes(benutzer.role)) return;
    const {data:mitglied}=await sb.from("mitglieder").select("funktionen,mitgliedtyp").eq("id",mitgliedId).maybeSingle();
    const alleKader=await sb.from("kader").select("rollen").eq("mitglied_id",mitgliedId).eq("aktiv",true);
    const TRAINER_ROLLEN_SET=(dbKaderRollenData||[]).filter(r=>r.ist_trainer).map(r=>r.name);
    let neueRolle="supporter";
    if(alleKader.data&&alleKader.data.length>0){
      const hatTrainer=alleKader.data.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN_SET.includes(r)));
      if(hatTrainer) neueRolle="trainer";
      else{
        const alleRollen=alleKader.data.flatMap(k=>(k.rollen||[]).map(r=>ROLLE_MAP[r]).filter(Boolean));
        const hoechste=PRIORITAET.find(p=>alleRollen.includes(p));
        if(hoechste) neueRolle=hoechste;
      }
    } else if(mitglied?.mitgliedtyp){
      const {data:typData}=await sb.from("mitgliedtypen").select("standard_rolle").eq("name",mitglied.mitgliedtyp).maybeSingle();
      if(typData?.standard_rolle&&["spieler","trainer"].includes(typData.standard_rolle)){
        neueRolle=typData.standard_rolle;
      } else if((mitglied?.funktionen||[]).length>0){
        neueRolle="funktionaer";
      } else if(typData?.standard_rolle){
        neueRolle=typData.standard_rolle;
      }
    } else if((mitglied?.funktionen||[]).length>0){
      neueRolle="funktionaer";
    }
    if(neueRolle!==benutzer.role) await sb.from("benutzer").update({role:neueRolle}).eq("id",benutzer.id);
  }

  // Kader-Eintrag bearbeiten
  async function saveEditKader(){
    if(!sb||!editKader) return;
    setEditSaving(true);
    await sb.from("kader").update({
      rollen:editForm.funktionen||[],
      rueckennr:editForm.rueckennr||null,
      position:editForm.position||null,
    }).eq("id",editKader.id);
    setKader(prev=>prev.map(k=>k.id===editKader.id?{...k,rollen:editForm.funktionen,rueckennr:editForm.rueckennr,position:editForm.position}:k));
    // Rolle neu berechnen
    await updateBenutzerRolle(editKader.mitglied_id);
    setEditKader(null);
    setEditFunkOpen(false);
    setEditSaving(false);
  }

  function openEdit(k){
    setEditForm({funktionen:k.rollen||[],rueckennr:k.rueckennr||"",position:k.position||""});
    setEditKader(k);
  }

  // Mitglied entfernen
  async function removeMitglied(kaderId){
    if(!sb||!window.confirm("Mitglied aus dem Kader entfernen?")) return;
    const kaderEintrag=kader.find(k=>k.id===kaderId);
    await sb.from("kader").update({aktiv:false}).eq("id",kaderId);
    setKader(prev=>prev.filter(k=>k.id!==kaderId));
    // Rolle neu berechnen nach Entfernen
    if(kaderEintrag?.mitglied_id) await updateBenutzerRolle(kaderEintrag.mitglied_id);
  }

  // Mitglied hinzufügen
  async function addMitglied(){
    if(!sb||!addForm.mitglied_id||!teamId) return;
    setAddSaving(true);
    const {error}=await sb.from("kader").upsert({
      team_id:teamId,
      mitglied_id:addForm.mitglied_id,
      rueckennr:addForm.rueckennr||null,
      position:addForm.position||null,
      rollen:addForm.funktionen||["Spieler/in"],
      aktiv:true,
      saison,
    },{onConflict:"team_id,mitglied_id,saison"});
    if(!error){
      await loadKader();
      // Rolle neu berechnen
      await updateBenutzerRolle(addForm.mitglied_id);
      setShowAdd(false);
      setAddForm({mitglied_id:null,rueckennr:"",position:"",funktionen:["Spieler/in"]});
      setAddFunkOpen(false);
      setAddSearch("");
    }
    setAddSaving(false);
  }

  // Mitglieder die schon im Kader sind filtern
  const kaderMitgliedIds=new Set(kader.map(k=>k.mitglied_id));
  const filteredAdd=allMitglieder
    .filter(m=>!kaderMitgliedIds.has(m.id))
    .filter(m=>`${m.vorname} ${m.nachname}`.toLowerCase().includes(addSearch.toLowerCase()));

  // Kader filtern + gruppieren
  const filtered=kader.filter(k=>{
    const m=k.mitglieder;
    if(!m) return false;
    return `${m.vorname} ${m.nachname}`.toLowerCase().includes(search.toLowerCase());
  });

  const grouped = groupBy
    ? Object.entries(filtered.reduce((acc,k)=>{
        const key=(k.rollen&&k.rollen.length>0)?k.rollen[0]:"Spieler/in";
        if(!acc[key]) acc[key]=[];
        acc[key].push(k); return acc;
      },{}))
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([key,items])=>({key,items}))
    : [{key:null,items:filtered}];

  const handleExport=()=>{
    const fields=COL_DEF_ALL.filter(c=>exportFields.includes(c.key));
    const header=fields.map(c=>c.label).join(";");
    const rows=filtered.map(k=>{
      const m=k.mitglieder||{};
      return fields.map(c=>{
        if(c.key==="name") return `${m.nachname||""} ${m.vorname||""}`.trim();
        if(c.key==="nr")   return k.rueckennr||"-";
        if(c.key==="pos")  return k.position||"-";
        if(c.key==="funktion") return (k.rollen||[]).join(", ")||"-";
        if(c.key==="dob")  return m.geburtsdatum||"-";
        if(c.key==="email")return m.email||"-";
        if(c.key==="tel")  return m.telefon||"-";
        if(c.key==="pass") return m.spielerpass||"-";
        if(c.key==="js")   return m.js_nr||"-";
        if(c.key==="ahv")  return m.ahv_nr||"-";
        if(c.key==="fairgate") return m.fairgate_id||"-";
        return "-";
      }).join(";");
    }).join("\n");
    const csv=`${header}\n${rows}`;
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=`Kader_${teamName}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setShowExport(false);
  };

  /* ── Kader Row ── */
  const KaderRow=({k})=>{
    const m=k.mitglieder||{};
    const name=`${m.nachname||""} ${m.vorname||""}`.trim()||"?";
    const handleRowClick=()=>{
      if(isMobile) setSheetKader(k);
      else onSelectMember?onSelectMember({...m,name:`${m.vorname||""} ${m.nachname||""}`.trim(),id:m.id}):setSelected(k);
    };
    const menuItems=[
      {label:"Spieler-Detail anzeigen", icon:"user", onClick:()=>onSelectMember?onSelectMember({...m,name:`${m.vorname||""} ${m.nachname||""}`.trim(),id:m.id}):setSelected(k)},
      {label:"Kader-Eintrag bearbeiten", icon:"edit", onClick:()=>openEdit(k)},
      "sep",
      {label:"Aus Kader entfernen", icon:"trash", danger:true, onClick:()=>removeMitglied(k.id)},
    ];
    return(
      <div onClick={handleRowClick} className="cc-list-row">
        <Av name={`${m.vorname||""} ${m.nachname||""}`} size="md" bg="var(--cc-hover,rgba(255,191,0,0.19))"/>
        <div style={{flex:1,minWidth:0}}>
          <div className="cc-list-name">{name}</div>
          <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>
            {(k.rollen||["Spieler/in"]).join(" · ")}
            {k.position?` · ${k.position}`:""}
          </div>
        </div>
        <div className="cc-team-nr" style={k.rueckennr?{}:{borderStyle:"dashed",color:"var(--sub)",fontWeight:400}}>
          {k.rueckennr||"—"}
        </div>
        {canEdit&&(
          <div onClick={e=>e.stopPropagation()}>
            <DropMenu items={menuItems}/>
          </div>
        )}
        {!canEdit&&<TI n="chevron-right" size={14} style={{color:"var(--sub)",flexShrink:0}}/>}
      </div>
    );
  };

  return(
    <div>
      {/* Detail Modal */}
      {/* Edit Kader Modal */}
      <ModalOrSheet open={!!editKader} onClose={()=>setEditKader(null)} maxWidth={400}>
        {editKader&&(()=>{
          const m=editKader.mitglieder||{};
          const name=`${m.vorname||""} ${m.nachname||""}`.trim()||"?";
          return(
            <>
              <div className="cc-modal-hdr">
                <div>
                  <ModalTitle>{name} bearbeiten</ModalTitle>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{teamName} · {saison}</div>
                </div>
                <button className="cc-icon-btn" onClick={()=>setEditKader(null)}><TI n="x" size={14}/></button>
              </div>
              <div className="cc-modal-body" style={{display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label className="cc-label">Rolle im Team</label>
                  <div className="cc-multiselect">
                    <button type="button" className="cc-multiselect-trigger" onClick={()=>setEditFunkOpen(o=>!o)}>
                      <div className="cc-multiselect-chips">
                        {(editForm.funktionen||[]).length===0
                          ?<span style={{color:"var(--sub)",fontSize:13}}>– wählen –</span>
                          :(editForm.funktionen||[]).map(f=>(
                            <span key={f} className="cc-multiselect-chip">
                              {f}
                              <span className="cc-multiselect-chip-x" onMouseDown={e=>{e.stopPropagation();setEditForm(p=>({...p,funktionen:p.funktionen.filter(x=>x!==f)}));}}>×</span>
                            </span>
                          ))
                        }
                      </div>
                      <TI n={editFunkOpen?"chevron-up":"chevron-down"} size={14} style={{color:"var(--sub)",flexShrink:0}}/>
                    </button>
                    {editFunkOpen&&(
                      <div className="cc-multiselect-dropdown">
                        <div className="cc-multiselect-list">
                          {["Spieler/in","Trainer/in","Co-Trainer/in","Goalietrainer/in","Assistenz","Masseur/in"].map(f=>{
                            const sel=(editForm.funktionen||[]).includes(f);
                            return(
                              <div key={f} className="cc-multiselect-item" onClick={()=>setEditForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==f):[...(p.funktionen||[]),f]}))}>
                                <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                                  {sel&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                                </div>
                                <span>{f}</span>
                              </div>
                            );
                          })}
                        </div>
                        {(editForm.funktionen||[]).length>0&&(
                          <div className="cc-multiselect-footer">
                            <span>{editForm.funktionen.length} ausgewählt</span>
                            <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--sub)",fontFamily:"inherit"}} onClick={()=>setEditForm(p=>({...p,funktionen:[]}))}>Alle entfernen</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <div style={{width:90}}>
                    <label className="cc-label">Nr.</label>
                    <input className="cc-input" type="number" min="1" max="99" placeholder="—"
                      value={editForm.rueckennr} onChange={e=>setEditForm(p=>({...p,rueckennr:e.target.value}))}/>
                  </div>
                  <div style={{flex:1}}>
                    <label className="cc-label">Position</label>
                    <select className="cc-input" value={editForm.position} onChange={e=>setEditForm(p=>({...p,position:e.target.value}))}>
                      <option value="">—</option>
                      {POSITION_GROUPS.map(g=>(
                        <optgroup key={g.label} label={g.label}>
                          {g.options.map(o=><option key={o} value={o}>{o}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="cc-modal-ftr">
                <Btn onClick={()=>setEditKader(null)}>Abbrechen</Btn>
                <Btn variant="primary" onClick={saveEditKader} disabled={editSaving}>
                  {editSaving?"Speichert…":"Speichern"}
                </Btn>
              </div>
            </>
          );
        })()}
      </ModalOrSheet>

      {/* Mobile Bottom Sheet */}
      <ModalOrSheet open={!!sheetKader} onClose={()=>setSheetKader(null)} maxWidth={400}>
        {sheetKader&&(()=>{
          const m=sheetKader.mitglieder||{};
          const name=`${m.vorname||""} ${m.nachname||""}`.trim()||"?";
          return(
            <>
              <div className="cc-modal-hdr">
                <ModalTitle>{name}</ModalTitle>
                <button className="cc-icon-btn" onClick={()=>setSheetKader(null)}><TI n="x" size={14}/></button>
              </div>
              <div className="cc-modal-body" style={{display:"flex",flexDirection:"column",gap:0,padding:0}}>
                {[
                  {label:"Spieler-Detail anzeigen", icon:"user", onClick:()=>{setSheetKader(null);onSelectMember?onSelectMember({...m,name,id:m.id}):setSelected(sheetKader);}},
                  ...(canEdit?[
                    {label:"Kader-Eintrag bearbeiten", icon:"edit", onClick:()=>{setSheetKader(null);openEdit(sheetKader);}},
                    {label:"Aus Kader entfernen", icon:"trash", danger:true, onClick:()=>{setSheetKader(null);removeMitglied(sheetKader.id);}},
                  ]:[]),
                ].map((item,i)=>(
                  <button key={i} onClick={item.onClick}
                    className={`cc-menu-item${item.danger?" cc-menu-item-danger":""}`}
                    style={{padding:"14px 20px",fontSize:14,borderBottom:"0.5px solid var(--border)"}}>
                    <TI n={item.icon} size={16}/>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          );
        })()}
      </ModalOrSheet>
      <ModalOrSheet open={!!selected} onClose={()=>setSelected(null)} maxWidth={540}>
        {selected&&(()=>{
          const m=selected.mitglieder||{};
          const name=`${m.vorname||""} ${m.nachname||""}`.trim()||"?";
          return(
            <>
              <div className="cc-modal-hdr">
                <Row gap={12}>
                  <Av name={name} size="lg" bg="var(--cc-hover,rgba(255,191,0,0.19))"/>
                  <Col gap={2}>
                    <span style={{fontWeight:600,fontSize:16,color:"var(--text)"}}>{name}</span>
                    <span style={{fontSize:12,color:"var(--sub)"}}>{(selected.rollen||["Spieler/in"]).join(" · ")} · Nr. {selected.rueckennr||"—"}</span>
                  </Col>
                </Row>
                <button className="cc-icon-btn" onClick={()=>setSelected(null)}><TI n="x" size={14}/></button>
              </div>
              <div className="cc-modal-body">
                {[
                  {label:"Geburtsdatum", value:m.geburtsdatum, field:"dob"},
                  {label:"E-Mail",       value:m.email,        field:"email",   color:BL},
                  {label:"Telefon",      value:m.telefon,      field:"tel"},
                  {label:"Spielerpass",  value:m.spielerpass,  field:"pass"},
                  {label:"J+S Nr.",      value:m.js_nr,        field:"js"},
                  {label:"AHV-Nr.",      value:m.ahv_nr,       field:"ahv"},
                  {label:"Fairgate-ID",  value:m.fairgate_id,  field:"fairgate"},
                ].filter(r=>r.value&&vis.includes(r.field)).map(r=>(
                  <Row key={r.field} gap={8}>
                    <span className="cc-detail-label">{r.label}</span>
                    <span style={{fontSize:14,color:r.color||"var(--text)"}}>{r.value}</span>
                  </Row>
                ))}
              </div>
            </>
          );
        })()}
      </ModalOrSheet>

      {/* Mitglied hinzufügen Modal */}
      <ModalOrSheet open={showAdd} onClose={()=>{setShowAdd(false);setAddSearch("");}} maxWidth={440}>
        <div className="cc-modal-hdr">
          <ModalTitle>Mitglied zum Kader hinzufügen</ModalTitle>
          <button className="cc-icon-btn" onClick={()=>setShowAdd(false)}><TI n="x" size={14}/></button>
        </div>
        <div className="cc-modal-body" style={{display:"flex",flexDirection:"column",gap:14}}>
          <input className="cc-input" placeholder="Mitglied suchen…" value={addSearch} onChange={e=>setAddSearch(e.target.value)} autoFocus/>
          <div style={{maxHeight:180,overflowY:"auto",border:"0.5px solid var(--border)",borderRadius:8}}>
            {filteredAdd.length===0&&<div style={{padding:12,fontSize:13,color:"var(--sub)",textAlign:"center"}}>Keine Mitglieder gefunden</div>}
            {filteredAdd.map(m=>(
              <div key={m.id} onClick={()=>setAddForm(p=>({...p,mitglied_id:m.id}))}
                style={{padding:"8px 12px",fontSize:13,cursor:"pointer",background:addForm.mitglied_id===m.id?"var(--cc-hover,rgba(255,191,0,0.15))":"transparent",display:"flex",alignItems:"center",gap:8,borderBottom:"0.5px solid var(--border)"}}>
                <div style={{width:16,height:16,borderRadius:4,border:`0.5px solid ${addForm.mitglied_id===m.id?"#22c55e":"var(--border)"}`,background:addForm.mitglied_id===m.id?"#ECFDF5":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {addForm.mitglied_id===m.id&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                </div>
                <span>{m.nachname} {m.vorname}</span>
                {m.mitgliedtyp&&<span style={{fontSize:11,color:"var(--sub)",marginLeft:"auto"}}>{m.mitgliedtyp}</span>}
              </div>
            ))}
          </div>
          {addForm.mitglied_id&&(
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <label className="cc-label">Rolle im Team</label>
                <div className="cc-multiselect">
                  <button type="button" className="cc-multiselect-trigger" onClick={()=>setAddFunkOpen(o=>!o)}>
                    <div className="cc-multiselect-chips">
                      {(addForm.funktionen||[]).length===0
                        ?<span style={{color:"var(--sub)",fontSize:13}}>– wählen –</span>
                        :(addForm.funktionen||[]).map(f=>(
                          <span key={f} className="cc-multiselect-chip">
                            {f}
                            <span className="cc-multiselect-chip-x" onMouseDown={e=>{e.stopPropagation();setAddForm(p=>({...p,funktionen:p.funktionen.filter(x=>x!==f)}));}}>×</span>
                          </span>
                        ))
                      }
                    </div>
                    <TI n={addFunkOpen?"chevron-up":"chevron-down"} size={14} style={{color:"var(--sub)",flexShrink:0}}/>
                  </button>
                  {addFunkOpen&&(
                    <div className="cc-multiselect-dropdown">
                      <div className="cc-multiselect-list">
                        {["Spieler/in","Trainer/in","Co-Trainer/in","Goalietrainer/in","Assistenz","Masseur/in"].map(f=>{
                          const sel=(addForm.funktionen||[]).includes(f);
                          return(
                            <div key={f} className="cc-multiselect-item" onClick={()=>setAddForm(p=>({...p,funktionen:sel?p.funktionen.filter(x=>x!==f):[...(p.funktionen||[]),f]}))}>
                              <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                                {sel&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                              </div>
                              <span>{f}</span>
                            </div>
                          );
                        })}
                      </div>
                      {(addForm.funktionen||[]).length>0&&(
                        <div className="cc-multiselect-footer">
                          <span>{(addForm.funktionen||[]).length} ausgewählt</span>
                          <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--sub)",fontFamily:"inherit"}} onClick={()=>setAddForm(p=>({...p,funktionen:[]}))}>Alle entfernen</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{width:80}}>
                <label className="cc-label">Nr.</label>
                <input className="cc-input" type="number" min="1" max="99" placeholder="—" value={addForm.rueckennr} onChange={e=>setAddForm(p=>({...p,rueckennr:e.target.value}))}/>
              </div>
              <div style={{width:90}}>
                <label className="cc-label">Position</label>
                <select className="cc-input" value={addForm.position} onChange={e=>setAddForm(p=>({...p,position:e.target.value}))}>
                  <option value="">—</option>
                  {POSITION_GROUPS.map(g=>(
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map(o=><option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="cc-modal-ftr">
          <Btn onClick={()=>{setShowAdd(false);setAddSearch("");}}>Abbrechen</Btn>
          <Btn variant="primary" onClick={addMitglied} disabled={!addForm.mitglied_id||addSaving}>
            {addSaving?"Wird hinzugefügt…":"Hinzufügen"}
          </Btn>
        </div>
      </ModalOrSheet>

      {/* Export Modal */}
      <ModalOrSheet open={showExport} onClose={()=>setShowExport(false)} maxWidth={360}>
        <div className="cc-modal-hdr">
          <ModalTitle>Kaderliste exportieren</ModalTitle>
          <button className="cc-icon-btn" onClick={()=>setShowExport(false)}><TI n="x" size={14}/></button>
        </div>
        <div className="cc-modal-body">
          <p style={{fontSize:14,color:"var(--sub)"}}>Felder auswählen die exportiert werden sollen</p>
          <Col gap={6}>
            {COL_DEF_ALL.map(c=>(
              <label key={c.key} className="cc-check-row">
                <input type="checkbox" checked={exportFields.includes(c.key)}
                  onChange={e=>setExportFields(prev=>e.target.checked?[...prev,c.key]:prev.filter(k=>k!==c.key))}
                  style={{width:16,height:16,accentColor:"var(--text)",cursor:"pointer"}}/>
                <span style={{fontSize:14,color:"var(--text)"}}>{c.label}</span>
              </label>
            ))}
          </Col>
        </div>
        <div className="cc-modal-ftr">
          <Btn onClick={()=>setShowExport(false)}>Abbrechen</Btn>
          <Btn variant="primary" onClick={handleExport}>Exportieren</Btn>
        </div>
      </ModalOrSheet>

      {/* Toolbar */}
      <Between style={{marginBottom:12,flexWrap:"wrap",gap:8}}>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen…" style={{width:200}}/>
        <Row gap={8}>
          {canEdit&&(
            <Btn onClick={()=>setShowAdd(true)}>
              <TI n="user-plus" size={14}/> Hinzufügen
            </Btn>
          )}
          {canExport&&(
            <Btn onClick={()=>setShowExport(true)}>
              <TI n="file-download" size={14}/> Export
            </Btn>
          )}
          <Btn onClick={()=>setGroupBy(g=>!g)} style={groupBy?{background:"var(--text)",color:"var(--bg)"}:{}}>
            <TI n="layout-list" size={14}/> Gruppieren
          </Btn>
          <span className="cc-chip-toggle" style={{cursor:"default",fontWeight:600}}>
            {filtered.length} Mitglieder
          </span>
        </Row>
      </Between>

      {/* Liste */}
      {loading?(
        <div style={{padding:24,textAlign:"center",color:"var(--sub)",fontSize:13}}>Lade Kader…</div>
      ):(
        <div className="cc-table-wrap">
          <div className="cc-table-wrap-inner">
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 52px 24px"+(canEdit?" 24px":""),
            padding:"8px 14px",background:"var(--bg)",borderBottom:"1px solid var(--border)"}}>
            <span className="cc-label" style={{marginBottom:0}}>Spieler</span>
            <span className="cc-label" style={{marginBottom:0,textAlign:"center"}}>Pos</span>
            <span className="cc-label" style={{marginBottom:0,textAlign:"right"}}>Nr.</span>
            <span/>
            {canEdit&&<span/>}
          </div>
          {grouped.flatMap(({key,items})=>[
            key&&(
              <div key={`h-${key}`} className="cc-section-hdr" style={{padding:"6px 14px",margin:0}}>
                {key}<span className="cc-count">({items.length})</span>
              </div>
            ),
            ...items.map(k=><KaderRow key={k.id} k={k}/>),
          ]).filter(Boolean)}
          {filtered.length===0&&!loading&&(
            <div className="cc-empty">{kader.length===0?"Noch keine Kadermitglieder. Mitglied hinzufügen ↑":"Keine Spieler gefunden"}</div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KaderModul;
