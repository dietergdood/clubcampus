/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/DesignSystemTab.jsx
   Living Style Guide — alle UI-Komponenten mit echtem Theme
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from "react";
import { Btn, Card, Chip, Stat, Av, Tabs, STitle, Row, Col, Between, Sub, Label,
         H1, H2, Input, Select, Textarea, SectionLabel, Empty, DropMenu,
         Toolbar, ColMenuButton, BulkBar, SortHeader, InfoBox, ModalOrSheet,
         ModalTitle, useConfirm, ConfirmDialog, StatusTile } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { GN, R, RL, BL, AM, BK, GB } from "../../constants.js";

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function TokenRow({ name, desc, tick }) {
  const [val, setVal] = useState(() => cssVar(name));
  useEffect(() => { setVal(cssVar(name)); }, [name, tick]);
  const isColor = val.startsWith("#") || val.startsWith("rgb");
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)"}}>
      {isColor && <div style={{width:26,height:26,borderRadius:6,background:val,border:"0.5px solid var(--border)",flexShrink:0}}/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontFamily:"monospace",fontWeight:600,color:"var(--text)"}}>{name}</div>
        {desc && <div style={{fontSize:10,color:"var(--sub)"}}>{desc}</div>}
      </div>
      <div style={{fontSize:10,fontFamily:"monospace",color:"var(--sub)",flexShrink:0,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val||"—"}</div>
    </div>
  );
}

function Sec({title, children, action}) {
  return (
    <div style={{marginBottom:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingBottom:6,borderBottom:"0.5px solid var(--border)"}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--sub)"}}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

const DEMO_MEMBERS = [
  {id:1, name:"Adrian Bürgi",   rolle:"Trainer/in",  aktiv:true,  team:"FCH 1"},
  {id:2, name:"Anna Koch",      rolle:"Spieler/in",  aktiv:true,  team:"FCH 2"},
  {id:3, name:"Beat Müller",    rolle:"Elternteil",  aktiv:false, team:"Ba"},
  {id:4, name:"Claudia Meier",  rolle:"Funktionär",  aktiv:true,  team:"FCH 1"},
  {id:5, name:"David Steiner",  rolle:"Spieler/in",  aktiv:true,  team:"FCH 2"},
];

const ALL_COLS = [
  {key:"name",  label:"Name"},
  {key:"rolle", label:"Rolle"},
  {key:"team",  label:"Team"},
  {key:"aktiv", label:"Status"},
];

export function DesignSystemTab({loading, isMobile, mobileKachel, tab}) {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState(["name","rolle","team","aktiv"]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("liste");
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    if (tab !== "designsystem") return;
    const observer = new MutationObserver(() => setTick(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [tab]);

  if (loading || (isMobile && mobileKachel === null) || tab !== "designsystem") return null;

  const filtered = DEMO_MEMBERS
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortDir==="asc" ? a[sortKey]?.localeCompare?.(b[sortKey])||0 : b[sortKey]?.localeCompare?.(a[sortKey])||0);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div style={{display:"contents"}}>
      {/* CSS Variablen */}
      <Sec title="Aktive CSS-Variablen" action={<button className="cc-btn-outline" onClick={()=>setTick(t=>t+1)} style={{fontSize:11}}><TI n="refresh" size={12}/> Aktualisieren</button>}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:6}}>
          {[
            {name:"--cc-accent",    desc:"Vereinsfarbe 1"},
            {name:"--cc-accent2",   desc:"Vereinsfarbe 2"},
            {name:"--cc-hover",     desc:"Hover-Tinting"},
            {name:"--nav",          desc:"Nav Hintergrund"},
            {name:"--nav-t",        desc:"Nav Text"},
            {name:"--nav-a",        desc:"Nav Akzent"},
            {name:"--btn-primary",  desc:"Button Hintergrund"},
            {name:"--btn-primary-text", desc:"Button Text"},
            {name:"--bg",           desc:"Seitenhintergrund"},
            {name:"--surface",      desc:"Card"},
            {name:"--surface2",     desc:"Erhöhte Fläche"},
            {name:"--text",         desc:"Haupttext"},
            {name:"--sub",          desc:"Sekundärtext"},
            {name:"--border",       desc:"Trennlinie"},
          ].map(t => <TokenRow key={t.name} {...t} tick={tick}/>)}
        </div>
      </Sec>

      {/* Typografie */}
      <Sec title="Typografie">
        <Col gap={8}>
          <H1>H1 Seitentitel</H1>
          <H2>H2 Abschnittstitel</H2>
          <STitle>Section Title</STitle>
          <div style={{fontSize:14,color:"var(--text)"}}>Body Text — 14px Standard</div>
          <Sub>Sekundärtext — var(--sub)</Sub>
          <Label>Label / Feldbezeichnung</Label>
          <div style={{fontSize:11,color:"var(--sub)"}}>Klein — 11px für Badges, Meta</div>
        </Col>
      </Sec>

      {/* Buttons */}
      <Sec title="Buttons">
        <Row gap={8} style={{flexWrap:"wrap",alignItems:"center"}}>
          <Btn>Primär</Btn>
          <Btn color="var(--surface2)" textColor="var(--text)" style={{border:"0.5px solid var(--border)"}}>Sekundär</Btn>
          <Btn color={R} textColor="#fff">Gefahr</Btn>
          <Btn color={GN} textColor="#fff">Erfolg</Btn>
          <button className="cc-btn-outline"><TI n="download" size={13}/> Export</button>
          <button className="cc-icon-btn"><TI n="settings" size={14}/></button>
          <button className="cc-icon-btn"><TI n="edit" size={14}/></button>
          <button className="cc-icon-btn"><TI n="trash" size={14}/></button>
        </Row>
      </Sec>

      {/* Chips & Badges */}
      <Sec title="Chips und Badges">
        <Row gap={8} style={{flexWrap:"wrap",alignItems:"center"}}>
          <span className="cc-chip-toggle cc-chip-active">Aktiv</span>
          <span className="cc-chip-toggle">Inaktiv</span>
          <Chip text="Aktiv" color={GN} bg="#ECFDF5"/>
          <Chip text="Inaktiv" color={R} bg="#FEF2F2"/>
          <Chip text="Warnung" color={AM} bg="#FEF3C7"/>
          <Chip text="Info" color={BL} bg="#EFF6FF"/>
          <Chip text="Vereinsfarbe" color="var(--btn-primary-text)" bg="var(--cc-accent)"/>
        </Row>
      </Sec>

      {/* DropMenu */}
      <Sec title="DropMenu">
        <Row gap={12} style={{alignItems:"flex-start"}}>
          <DropMenu
            trigger={<button className="cc-btn-outline"><TI n="dots-vertical" size={14}/> Aktionen</button>}
            items={[
              {icon:"edit", label:"Bearbeiten", onClick:()=>{}},
              {icon:"download", label:"Exportieren", onClick:()=>{}},
              "sep",
              {icon:"trash", label:"Löschen", onClick:()=>{}, danger:true},
            ]}
          />
          <InfoBox text="DropMenu wird auf Mobile automatisch zum Bottom Sheet." color={BL}/>
        </Row>
      </Sec>

      {/* Tabs */}
      <Sec title="Tabs und Segmente">
        <Col gap={16}>
          <Tabs
            tabs={[{key:"liste",label:"Liste"},{key:"kacheln",label:"Kacheln"},{key:"export",label:"Export"}]}
            active={activeTab}
            onChange={setActiveTab}
          />
          <div className="cc-seg" style={{maxWidth:300}}>
            <button className="cc-seg-item cc-seg-active">Aktiv</button>
            <button className="cc-seg-item">Archiv</button>
            <button className="cc-seg-item">Alle</button>
          </div>
        </Col>
      </Sec>

      {/* Inputs */}
      <Sec title="Inputs">
        <Col gap={8} style={{maxWidth:400}}>
          <Input placeholder="Text-Input…"/>
          <Input placeholder="Suchen…" icon={<TI n="search" size={14}/>}/>
          <Select>
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </Select>
          <Textarea placeholder="Mehrzeiliger Text…" rows={3}/>
        </Col>
      </Sec>

      {/* Toolbar */}
      <Sec title="Toolbar (Suche, Filter, Gruppieren, Spalten)">
        <Toolbar
          search={search}
          onSearch={setSearch}
          filterDefs={[
            {key:"rolle",  label:"Rolle",  vals:["Trainer/in","Spieler/in","Elternteil","Funktionär"]},
            {key:"team",   label:"Team",   vals:["FCH 1","FCH 2","Ba"]},
            {key:"aktiv",  label:"Status", vals:["Aktiv","Inaktiv"]},
          ]}
          filterVals={{}}
          onFilterChange={()=>{}}
          groupOptions={[
            {key:"none",  label:"Keine Gruppierung"},
            {key:"rolle", label:"Nach Rolle"},
            {key:"team",  label:"Nach Team"},
          ]}
          groupBy="none"
          onGroupChange={()=>{}}
          colMenu={
            <ColMenuButton
              allCols={ALL_COLS}
              visibleCols={visibleCols}
              onChangeVisible={setVisibleCols}
            />
          }
          moreItems={[
            {icon:"download", label:"CSV exportieren", onClick:()=>{}},
            {icon:"file-spreadsheet", label:"Excel exportieren", onClick:()=>{}},
          ]}
        />
      </Sec>

      {/* BulkBar */}
      <Sec title="BulkBar (Mehrfachauswahl)">
        <BulkBar
          count={3}
          onClear={()=>setSelected([])}
          actions={[
            {icon:"archive", label:"Archivieren", onClick:()=>{}},
            {icon:"download", label:"Exportieren", onClick:()=>{}},
          ]}
        />
      </Sec>

      {/* Tabelle mit SortHeader */}
      <Sec title="Tabelle mit SortHeader">
        <div style={{border:"0.5px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{width:36,padding:"8px 12px",background:"var(--surface2)",borderBottom:"2px solid var(--cc-accent)"}}>
                  <input type="checkbox" onChange={e=>setSelected(e.target.checked?filtered.map(m=>m.id):[])} checked={selected.length===filtered.length&&filtered.length>0}/>
                </th>
                {ALL_COLS.filter(c=>visibleCols.includes(c.key)).map(c=>(
                  <SortHeader key={c.key} label={c.label} sortKey={c.key} currentSort={sortKey} dir={sortDir} onSort={toggleSort}/>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} className="cc-tr" onClick={()=>setSelected(s=>s.includes(m.id)?s.filter(x=>x!==m.id):[...s,m.id])} style={{background:selected.includes(m.id)?"var(--cc-hover)":undefined}}>
                  <td className="cc-td"><input type="checkbox" checked={selected.includes(m.id)} onChange={()=>{}}/></td>
                  {visibleCols.includes("name") && <td className="cc-td"><Row gap={8} style={{alignItems:"center"}}><Av name={m.name} size={26}/><span style={{fontWeight:500}}>{m.name}</span></Row></td>}
                  {visibleCols.includes("rolle") && <td className="cc-td"><Sub>{m.rolle}</Sub></td>}
                  {visibleCols.includes("team") && <td className="cc-td"><Chip text={m.team} color={BL} bg="#EFF6FF"/></td>}
                  {visibleCols.includes("aktiv") && <td className="cc-td"><Chip text={m.aktiv?"Aktiv":"Inaktiv"} color={m.aktiv?GN:R} bg={m.aktiv?"#ECFDF5":"#FEF2F2"}/></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.length>0&&<div style={{marginTop:8}}><BulkBar count={selected.length} onClear={()=>setSelected([])} actions={[{icon:"archive",label:"Archivieren",onClick:()=>{}},{icon:"download",label:"Exportieren",onClick:()=>{}}]}/></div>}
      </Sec>

      {/* Cards & Stats */}
      <Sec title="Cards und Stats">
        <Row gap={10} style={{flexWrap:"wrap"}}>
          <Stat label="Mitglieder" value={142}/>
          <Stat label="Teams" value={8}/>
          <Stat label="Aktiv" value={134} color={GN}/>
          <Stat label="Inaktiv" value={8} color={R}/>
        </Row>
        <div style={{marginTop:12}}>
          <Card>
            <Between>
              <STitle>Beispiel-Card</STitle>
              <button className="cc-icon-btn"><TI n="dots-vertical" size={14}/></button>
            </Between>
            <Sub style={{marginTop:4}}>Cards verwenden var(--surface) als Hintergrund.</Sub>
          </Card>
        </div>
      </Sec>

      {/* StatusTile */}
      <Sec title="Status-Tiles">
        <Row gap={8} style={{flexWrap:"wrap"}}>
          <StatusTile label="Aktiv" value="Ja" icon="check" semantic="ok"/>
          <StatusTile label="Portal" value="Verknüpft" icon="link" semantic="ok"/>
          <StatusTile label="Rolle" value="Trainer" icon="ball-football" semantic="neutral"/>
          <StatusTile label="Zahlung" value="Ausstehend" icon="alert-triangle" semantic="warn"/>
          <StatusTile label="Gesperrt" value="Ja" icon="lock" semantic="danger"/>
        </Row>
      </Sec>

      {/* Avatar */}
      <Sec title="Avatare">
        <Row gap={16} style={{alignItems:"flex-end",flexWrap:"wrap"}}>
          {[24,32,40,52].map(s=>(
            <Col key={s} gap={6} style={{alignItems:"center"}}>
              <Av name="Adrian Bürgi" size={s}/>
              <Sub>{s}px</Sub>
            </Col>
          ))}
          <Col gap={6} style={{alignItems:"center"}}>
            <Av name="Anna Koch" size={40} style={{border:"2px solid var(--cc-accent)"}}/>
            <Sub>mit Border</Sub>
          </Col>
        </Row>
      </Sec>

      {/* Modal */}
      <Sec title="Modal / Sheet">
        <Row gap={8}>
          <Btn onClick={()=>setShowModal(true)}>Modal öffnen</Btn>
          <InfoBox text="Auf Mobile wird automatisch ein Bottom Sheet angezeigt." color={BL}/>
        </Row>
        <ModalOrSheet open={showModal} onClose={()=>setShowModal(false)} title="Beispiel-Modal">
          <ModalTitle>Beispiel-Modal</ModalTitle>
          <Col gap={12} style={{padding:"16px 20px"}}>
            <Input placeholder="Name…"/>
            <Select><option>Option 1</option><option>Option 2</option></Select>
            <Row gap={8}>
              <Btn onClick={()=>setShowModal(false)}>Speichern</Btn>
              <button className="cc-btn-outline" onClick={()=>setShowModal(false)}>Abbrechen</button>
            </Row>
          </Col>
        </ModalOrSheet>
      </Sec>

      {/* ConfirmDialog */}
      <Sec title="ConfirmDialog">
        <Row gap={8}>
          <Btn color={R} textColor="#fff" onClick={async()=>{
            const ok=await confirm({title:"Wirklich löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});
            if(ok) alert("Gelöscht!");
          }}>Löschen mit Bestätigung</Btn>
          <InfoBox text="Ersetzt window.confirm() überall im Portal." color={BL}/>
        </Row>
        {confirmDialog}
      </Sec>

      {/* InfoBox */}
      <Sec title="InfoBox">
        <Col gap={8}>
          <InfoBox text="Info-Hinweis — für neutrale Informationen." color={BL}/>
          <InfoBox text="Erfolgs-Meldung — Aktion erfolgreich." color={GN}/>
          <InfoBox text="Warnung — bitte prüfen." color={AM}/>
          <InfoBox text="Fehler — Aktion fehlgeschlagen." color={R}/>
        </Col>
      </Sec>

      {/* Empty State */}
      <Sec title="Empty State">
        <Empty icon="users" text="Keine Mitglieder gefunden" sub="Passe den Suchbegriff an oder füge neue Mitglieder hinzu."/>
      </Sec>

    </div>
  );
}
