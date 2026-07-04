/* ═══════════════════════════════════════════════════════════════
   ClubCampus KaderModul — Supabase-Version
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { GN, R, BL } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, Av, Row, Between, Col, Btn, Input, ModalOrSheet, ModalTitle, Card } from "./theme.jsx";

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

const FUNKTION_OPTIONS = ["Trainer/in","Co-Trainer/in","Assistenz","Goalietrainer/in","Masseur/in","Spieler/in"];
const FUNKTION_ORDER   = ["Trainer/in","Co-Trainer/in","Assistenz","Goalietrainer/in","Masseur/in","Spieler/in"];

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

  // Mitglied hinzufügen
  const [addSearch,   setAddSearch]   = useState("");
  const [allMitglieder, setAllMitglieder] = useState([]);
  const [addForm,     setAddForm]     = useState({mitglied_id:null,rueckennr:"",position:"",funktion:"Spieler/in"});
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

  // Mitglied entfernen
  async function removeMitglied(kaderId){
    if(!sb||!window.confirm("Mitglied aus dem Kader entfernen?")) return;
    await sb.from("kader").update({aktiv:false}).eq("id",kaderId);
    setKader(prev=>prev.filter(k=>k.id!==kaderId));
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
      funktion:addForm.funktion||"Spieler/in",
      aktiv:true,
      saison,
    },{onConflict:"team_id,mitglied_id,saison"});
    if(!error){ await loadKader(); setShowAdd(false); setAddForm({mitglied_id:null,rueckennr:"",position:"",funktion:"Spieler/in"}); setAddSearch(""); }
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
        const key=k.funktion||"Spieler/in";
        if(!acc[key]) acc[key]=[];
        acc[key].push(k); return acc;
      },{}))
      .sort(([a],[b])=>{
        const ia=FUNKTION_ORDER.indexOf(a), ib=FUNKTION_ORDER.indexOf(b);
        if(ia>=0&&ib>=0) return ia-ib;
        if(ia>=0) return -1; if(ib>=0) return 1;
        return a.localeCompare(b);
      }).map(([key,items])=>({key,items}))
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
        if(c.key==="funktion") return k.funktion||"-";
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
    return(
      <div onClick={()=>onSelectMember?onSelectMember({...m,name:`${m.vorname||""} ${m.nachname||""}`.trim(),id:m.id}):setSelected(k)} className="cc-list-row">
        <Av name={`${m.vorname||""} ${m.nachname||""}`} size="md" bg="var(--cc-hover,rgba(255,191,0,0.19))"/>
        <div style={{flex:1,minWidth:0}}>
          <div className="cc-list-name">{name}</div>
          <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{k.funktion||"Spieler/in"}</div>
        </div>
        {/* Position */}
        <div onClick={e=>e.stopPropagation()} style={{minWidth:48,textAlign:"center"}}>
          {canEdit&&editingPos===k.id?(
            <select autoFocus value={k.position||""}
              onChange={e=>{updateKaderField(k.id,"position",e.target.value);setEditingPos(null);}}
              onBlur={()=>setEditingPos(null)}
              className="cc-input" style={{width:64,padding:"3px 6px",fontSize:12}}>
              <option value="">-</option>
              {POSITION_GROUPS.map(g=>(
                <optgroup key={g.label} label={g.label}>
                  {g.options.map(o=><option key={o} value={o}>{o}</option>)}
                </optgroup>
              ))}
            </select>
          ):(
            <span onClick={canEdit?()=>setEditingPos(k.id):undefined}
              className="cc-chip-toggle" style={{cursor:canEdit?"pointer":"default",fontSize:11,padding:"2px 8px"}}>
              {k.position||"-"}
            </span>
          )}
        </div>
        {/* Nr */}
        <div onClick={e=>e.stopPropagation()} style={{minWidth:40,textAlign:"right"}}>
          {canEdit&&editingNr===k.id?(
            <input autoFocus type="number" min="1" max="99"
              value={k.rueckennr||""}
              onChange={e=>updateKaderField(k.id,"rueckennr",e.target.value)}
              onBlur={()=>setEditingNr(null)}
              onKeyDown={e=>{if(e.key==="Enter")setEditingNr(null);}}
              className="cc-input" style={{width:52,textAlign:"center",padding:"3px 6px",fontSize:12}}/>
          ):(
            <span onClick={canEdit?()=>setEditingNr(k.id):undefined}
              style={{fontSize:12,fontWeight:600,color:"var(--sub)",cursor:canEdit?"pointer":"default",
                padding:"2px 6px",borderRadius:6,background:"var(--surface2)"}}>
              {k.rueckennr||"-"}
            </span>
          )}
        </div>
        {canEdit&&(
          <div onClick={e=>{e.stopPropagation();removeMitglied(k.id);}} style={{padding:"0 4px",cursor:"pointer",color:"var(--sub)"}}>
            <TI n="trash" size={13}/>
          </div>
        )}
        <TI n="chevron-right" size={14} style={{color:"var(--sub)",flexShrink:0}}/>
      </div>
    );
  };

  return(
    <div>
      {/* Detail Modal */}
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
                    <span style={{fontSize:12,color:"var(--sub)"}}>{selected.funktion||"Spieler/in"} · Nr. {selected.rueckennr||"—"}</span>
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
                <label className="cc-label">Funktion</label>
                <select className="cc-input" value={addForm.funktion} onChange={e=>setAddForm(p=>({...p,funktion:e.target.value}))}>
                  {FUNKTION_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
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
      )}
    </div>
  );
}

export default KaderModul;
