/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/DesignSystemTab.tsx
   Living Style Guide — alle UI-Komponenten mit echtem Theme

   ⚠ Beim Migrieren wurden etliche veraltete Props korrigiert, die die
   heutigen Komponenten nicht mehr kennen (als JS wurden sie stillschweigend
   verworfen und die Vorschauen waren teils kaputt): Btn.textColor,
   DropMenu.trigger, Input.icon, Tabs.onChange→setActive,
   SortHeader.sortKey/currentSort/dir→col/sortCol/sortDir,
   ColMenuButton.allCols/onChangeVisible→colGroups/onVisibleColsChange,
   BulkBar.onClear→onCancel, Toolbar.groupOptions {key}→{val}.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { Btn, Card, Chip, Stat, Av, Tabs, STitle, Row, Col, Between, Sub, Label,
         H1, H2, Input, Select, Textarea, SectionLabel, Empty, DropMenu,
         Toolbar, ColMenuButton, BulkBar, SortHeader, InfoBox, ModalOrSheet,
         ModalTitle, useConfirm, StatusTile,
         COMPONENT_REGISTRY } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { GN, R, BL, AM } from "../../constants.ts";
import type { FilterVals } from "../../shared/list/types.ts";

type SortDir = "asc" | "desc";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface TokenRowProps {
  name: string;
  desc?: string;
  tick: number;
}

function TokenRow({ name, desc, tick }: TokenRowProps) {
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

interface SecProps {
  title: string;
  children: ReactNode;
  action?: ReactElement;
}

function Sec({title, children, action}: SecProps) {
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

interface TableMember {
  id: number;
  name: string;
  rolle: string;
  aktiv: boolean;
  team: string;
}

/* Für die grosse Tabellen-Demo — mit aktiv+team, passend zu ALL_COLS.
   Früher hiess diese Liste ebenfalls DEMO_MEMBERS und wurde von der
   gleichnamigen Liste in der Komponente verdeckt, wodurch die Tabelle nur
   drei Zeilen (alle "Inaktiv") zeigte. Eindeutiger Name behebt das. */
const TABLE_MEMBERS: TableMember[] = [
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

interface DesignSystemTabProps {
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
}

export function DesignSystemTab({loading, isMobile, mobileKachel, tab}: DesignSystemTabProps) {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState(["name","rolle","team","aktiv"]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("liste");
  const [confirm, confirmDialog] = useConfirm();
  const [openPreviews, setOpenPreviews] = useState<Record<string, boolean>>({});
  const [demoSearch, setDemoSearch] = useState("");
  const [demoFilter, setDemoFilter] = useState<FilterVals>({});
  const [demoGroup, setDemoGroup] = useState("none");
  const [demoCols, setDemoCols] = useState(["name","rolle","team"]);
  const [demoModal, setDemoModal] = useState(false);
  const [demoSort, setDemoSort] = useState<{col:string;dir:SortDir}>({col:"name",dir:"asc"});
  const [demoTabActive, setDemoTabActive] = useState("liste");

  const DEMO_COLS = [{key:"name",label:"Name"},{key:"rolle",label:"Rolle"},{key:"team",label:"Team"}];
  const DEMO_MEMBERS = [
    {id:1,name:"Adrian Bürgi",rolle:"Trainer/in",team:"FCH 1"},
    {id:2,name:"Anna Koch",rolle:"Spieler/in",team:"FCH 2"},
    {id:3,name:"Beat Müller",rolle:"Elternteil",team:"Ba"},
  ];

  const DEMO_MAP: Record<string, () => ReactElement> = {
    "Toolbar": ()=>(
      <Toolbar search={demoSearch} onSearch={setDemoSearch}
        filterDefs={[{key:"rolle",label:"Rolle",vals:["Trainer/in","Spieler/in"]},{key:"team",label:"Team",vals:["FCH 1","FCH 2"]}]}
        filterVals={demoFilter} onFilterChange={(k,v)=>setDemoFilter(p=>({...p,[k]:Array.isArray(v)?v:v==null?undefined:[String(v)]}))}
        groupOptions={[{val:"none",label:"Keine"},{val:"rolle",label:"Nach Rolle"},{val:"team",label:"Nach Team"}]}
        groupBy={demoGroup} onGroupChange={g=>setDemoGroup(Array.isArray(g)?g[0]||"none":g)}
        colMenu={<ColMenuButton colGroups={[{group:"Demo",cols:DEMO_COLS}]} visibleCols={demoCols} onVisibleColsChange={setDemoCols}/>}
        moreItems={[{icon:"download",label:"CSV exportieren",onClick:()=>{}}]}
      />
    ),
    "ColMenuButton": ()=>(
      <Row gap={8}><ColMenuButton colGroups={[{group:"Demo",cols:DEMO_COLS}]} visibleCols={demoCols} onVisibleColsChange={setDemoCols}/><Sub>Spalten ein-/ausblenden + sortieren</Sub></Row>
    ),
    "BulkBar": ()=>(
      <BulkBar count={2} onCancel={()=>{}} actions={[{icon:"archive",label:"Archivieren",onClick:()=>{}},{icon:"download",label:"Exportieren",onClick:()=>{}}]}/>
    ),
    "SortHeader": ()=>(
      <div style={{border:"0.5px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            {DEMO_COLS.map(c=><SortHeader key={c.key} label={c.label} col={c.key} sortCol={demoSort.col} sortDir={demoSort.dir} onSort={k=>setDemoSort(s=>({col:k,dir:s.col===k&&s.dir==="asc"?"desc":"asc"}))}/>)}
          </tr></thead>
          <tbody>{DEMO_MEMBERS.map(m=><tr key={m.id} className="cc-tr"><td className="cc-td" style={{fontWeight:500}}>{m.name}</td><td className="cc-td">{m.rolle}</td><td className="cc-td">{m.team}</td></tr>)}</tbody>
        </table>
      </div>
    ),
    "DropMenu": ()=>(
      <Row gap={12}>
        <DropMenu items={[{icon:"edit",label:"Bearbeiten",onClick:()=>{}},{icon:"download",label:"Exportieren",onClick:()=>{}},"sep",{icon:"trash",label:"Löschen",onClick:()=>{},danger:true}]}/>
        <Sub>Auf Mobile → Bottom Sheet</Sub>
      </Row>
    ),
    "Tabs": ()=>(
      <Col gap={12}>
        <Tabs tabs={[{key:"liste",label:"Liste"},{key:"kacheln",label:"Kacheln"},{key:"export",label:"Export"}]} active={demoTabActive} setActive={setDemoTabActive}/>
        <div className="cc-seg" style={{maxWidth:260}}>
          <button className="cc-seg-item cc-seg-active">Aktiv</button>
          <button className="cc-seg-item">Archiv</button>
          <button className="cc-seg-item">Alle</button>
        </div>
      </Col>
    ),
    "ModalOrSheet": ()=>(
      <Row gap={8}>
        <Btn onClick={()=>setDemoModal(true)}>Modal öffnen</Btn>
        <ModalOrSheet open={demoModal} onClose={()=>setDemoModal(false)}>
          <ModalTitle>Beispiel-Modal</ModalTitle>
          <Col gap={12} style={{padding:"16px 20px"}}>
            <Input placeholder="Name…"/>
            <Row gap={8}><Btn onClick={()=>setDemoModal(false)}>Speichern</Btn><button className="cc-btn-outline" onClick={()=>setDemoModal(false)}>Abbrechen</button></Row>
          </Col>
        </ModalOrSheet>
      </Row>
    ),
    "ConfirmDialog + useConfirm": ()=>(
      <Btn onClick={async()=>{await confirm({title:"Wirklich löschen?",message:"Diese Aktion kann nicht rückgängig gemacht werden.",confirmLabel:"Löschen"});}}>Löschen mit Bestätigung testen</Btn>
    ),
    "InfoBox": ()=>(
      <Col gap={6}>
        <InfoBox text="Info-Hinweis — für neutrale Informationen." color="#3B82F6"/>
        <InfoBox text="Erfolgs-Meldung — Aktion erfolgreich." color="#22C55E"/>
        <InfoBox text="Warnung — bitte prüfen." color="#F97316"/>
        <InfoBox text="Fehler — Aktion fehlgeschlagen." color="#E24B4A"/>
      </Col>
    ),
    "StatusTile": ()=>(
      <Row gap={8} wrap>
        <StatusTile label="Aktiv" value="Ja" icon="check" semantic="ok"/>
        <StatusTile label="Portal" value="Verknüpft" icon="link" semantic="ok"/>
        <StatusTile label="Rolle" value="Trainer" icon="ball-football" semantic="neutral"/>
        <StatusTile label="Zahlung" value="Ausstehend" icon="alert-triangle" semantic="warn"/>
        <StatusTile label="Gesperrt" value="Ja" icon="lock" semantic="danger"/>
      </Row>
    ),
    "Empty": ()=>(
      <Empty icon="users" text="Keine Mitglieder gefunden" sub="Passe den Suchbegriff an."/>
    ),
    "Btn": ()=>(
      <Row gap={8} wrap>
        <Btn>Primär</Btn>
        <Btn color="var(--surface2)" style={{border:"0.5px solid var(--border)"}}>Sekundär</Btn>
        <Btn color="#E24B4A">Gefahr</Btn>
        <Btn color="#22C55E">Erfolg</Btn>
        <button className="cc-btn-outline"><TI n="download" size={13}/> Export</button>
        <button className="cc-icon-btn"><TI n="settings" size={14}/></button>
        <button className="cc-icon-btn"><TI n="edit" size={14}/></button>
      </Row>
    ),
    "Card": ()=>(
      <Card>
        <Between><STitle>Beispiel-Card</STitle><button className="cc-icon-btn"><TI n="dots-vertical" size={14}/></button></Between>
        <Sub style={{marginTop:4}}>Inhalt einer Card-Komponente mit Border und leichtem Schatten.</Sub>
      </Card>
    ),
    "Chip": ()=>(
      <Row gap={6} wrap>
        <Chip text="Aktiv" color="#15803D" bg="#ECFDF5"/>
        <Chip text="Inaktiv" color="#C8102E" bg="#FEF2F2"/>
        <Chip text="Warnung" color="#B45309" bg="#FEF3C7"/>
        <Chip text="Info" color="#1D4ED8" bg="#EFF6FF"/>
        <Chip text="Vereinsfarbe" color="var(--btn-primary-text)" bg="var(--cc-accent)"/>
        <span className="cc-chip-toggle cc-chip-active">Toggle aktiv</span>
        <span className="cc-chip-toggle">Toggle inaktiv</span>
      </Row>
    ),
    "Stat": ()=>(
      <Row gap={8} wrap>
        <Stat label="Mitglieder" value={142}/>
        <Stat label="Teams" value={8}/>
        <Stat label="Aktiv" value={134} color="#22C55E"/>
        <Stat label="Inaktiv" value={8} color="#E24B4A"/>
      </Row>
    ),
    "Av": ()=>(
      <Row gap={16} align="flex-end" wrap>
        {[24,32,40,52].map(s=>(
          <Col key={s} gap={4} style={{alignItems:"center"}}>
            <Av name="Adrian Bürgi" size={s}/>
            <Sub>{s}px</Sub>
          </Col>
        ))}
        <Col gap={4} style={{alignItems:"center"}}>
          <div style={{borderRadius:"50%",border:"2px solid var(--cc-accent)",display:"inline-flex"}}><Av name="Anna Koch" size={40}/></div>
          <Sub>Border</Sub>
        </Col>
      </Row>
    ),
    "Row / Col / Between": ()=>(
      <Col gap={8}>
        <Row gap={8} style={{background:"var(--surface2)",padding:8,borderRadius:6}}>
          <div style={{background:"var(--cc-accent)",width:24,height:24,borderRadius:4}}/>
          <Sub>Row: horizontal, gap=8</Sub>
        </Row>
        <Col gap={4} style={{background:"var(--surface2)",padding:8,borderRadius:6}}>
          <div style={{background:"var(--cc-accent)",width:"100%",height:6,borderRadius:3}}/>
          <div style={{background:"var(--cc-accent)",width:"60%",height:6,borderRadius:3}}/>
          <Sub>Col: vertikal, gap=4</Sub>
        </Col>
        <Between style={{background:"var(--surface2)",padding:8,borderRadius:6}}>
          <Sub>Links</Sub><Sub>Rechts (Between)</Sub>
        </Between>
      </Col>
    ),
    "H1 / H2 / STitle / Sub / Label": ()=>(
      <Col gap={6}>
        <H1>H1 Seitentitel</H1>
        <H2>H2 Abschnittstitel</H2>
        <STitle>Section Title</STitle>
        <Sub>Sekundärtext — var(--sub)</Sub>
        <Label>Feldbezeichnung</Label>
        <div style={{fontSize:14,color:"var(--text)"}}>Body Text 14px</div>
        <div style={{fontSize:11,color:"var(--sub)"}}>Klein 11px — Badges, Meta</div>
      </Col>
    ),
    "Input / Select / Textarea": ()=>(
      <Col gap={8} style={{maxWidth:340}}>
        <Input placeholder="Text-Input…"/>
        <Input placeholder="Mit Suche…"/>
        <Select><option>Option 1</option><option>Option 2</option></Select>
        <Textarea placeholder="Mehrzeiliger Text…" rows={2}/>
      </Col>
    ),
    "FunktionenMultiSelect": ()=>(
      <div style={{fontSize:13,color:"var(--sub)",padding:"8px 12px",border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>Benötigt Vereinsfunktionen aus Supabase</div>
    ),
    "LandSelect": ()=>(
      <div style={{fontSize:13,color:"var(--sub)",padding:"8px 12px",border:"0.5px solid var(--border)",borderRadius:8,background:"var(--surface)"}}>Benötigt Länderliste (LAENDER aus memberUtils)</div>
    ),
  };

  useEffect(() => {
    if (tab !== "designsystem") return;
    const observer = new MutationObserver(() => setTick(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [tab]);

  if (loading || (isMobile && mobileKachel === null) || tab !== "designsystem") return null;

  const filtered = TABLE_MEMBERS
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const av = String(a[sortKey as keyof TableMember] ?? "");
      const bv = String(b[sortKey as keyof TableMember] ?? "");
      return sortDir==="asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  function toggleSort(key: string) {
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
          ].map(t => <TokenRow key={t.name} name={t.name} desc={t.desc} tick={tick}/>)}
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
        <Row gap={8} wrap>
          <Btn>Primär</Btn>
          <Btn color="var(--surface2)" style={{border:"0.5px solid var(--border)"}}>Sekundär</Btn>
          <Btn color={R}>Gefahr</Btn>
          <Btn color={GN}>Erfolg</Btn>
          <button className="cc-btn-outline"><TI n="download" size={13}/> Export</button>
          <button className="cc-icon-btn"><TI n="settings" size={14}/></button>
          <button className="cc-icon-btn"><TI n="edit" size={14}/></button>
          <button className="cc-icon-btn"><TI n="trash" size={14}/></button>
        </Row>
      </Sec>

      {/* Chips & Badges */}
      <Sec title="Chips und Badges">
        <Row gap={8} wrap>
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
        <Row gap={12} align="flex-start">
          <DropMenu
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
            setActive={setActiveTab}
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
          <Input placeholder="Suchen…"/>
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
            {val:"none",  label:"Keine Gruppierung"},
            {val:"rolle", label:"Nach Rolle"},
            {val:"team",  label:"Nach Team"},
          ]}
          groupBy="none"
          onGroupChange={()=>{}}
          colMenu={
            <ColMenuButton
              colGroups={[{group:"Mitglieder",cols:ALL_COLS}]}
              visibleCols={visibleCols}
              onVisibleColsChange={setVisibleCols}
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
          onCancel={()=>setSelected([])}
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
                  <SortHeader key={c.key} label={c.label} col={c.key} sortCol={sortKey} sortDir={sortDir} onSort={toggleSort}/>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m=>(
                <tr key={m.id} className="cc-tr" onClick={()=>setSelected(s=>s.includes(m.id)?s.filter(x=>x!==m.id):[...s,m.id])} style={{background:selected.includes(m.id)?"var(--cc-hover)":undefined}}>
                  <td className="cc-td"><input type="checkbox" checked={selected.includes(m.id)} onChange={()=>{}}/></td>
                  {visibleCols.includes("name") && <td className="cc-td"><Row gap={8}><Av name={m.name} size={26}/><span style={{fontWeight:500}}>{m.name}</span></Row></td>}
                  {visibleCols.includes("rolle") && <td className="cc-td"><Sub>{m.rolle}</Sub></td>}
                  {visibleCols.includes("team") && <td className="cc-td"><Chip text={m.team} color={BL} bg="#EFF6FF"/></td>}
                  {visibleCols.includes("aktiv") && <td className="cc-td"><Chip text={m.aktiv?"Aktiv":"Inaktiv"} color={m.aktiv?GN:R} bg={m.aktiv?"#ECFDF5":"#FEF2F2"}/></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.length>0&&<div style={{marginTop:8}}><BulkBar count={selected.length} onCancel={()=>setSelected([])} actions={[{icon:"archive",label:"Archivieren",onClick:()=>{}},{icon:"download",label:"Exportieren",onClick:()=>{}}]}/></div>}
      </Sec>

      {/* Cards & Stats */}
      <Sec title="Cards und Stats">
        <Row gap={10} wrap>
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
        <Row gap={8} wrap>
          <StatusTile label="Aktiv" value="Ja" icon="check" semantic="ok"/>
          <StatusTile label="Portal" value="Verknüpft" icon="link" semantic="ok"/>
          <StatusTile label="Rolle" value="Trainer" icon="ball-football" semantic="neutral"/>
          <StatusTile label="Zahlung" value="Ausstehend" icon="alert-triangle" semantic="warn"/>
          <StatusTile label="Gesperrt" value="Ja" icon="lock" semantic="danger"/>
        </Row>
      </Sec>

      {/* Avatar */}
      <Sec title="Avatare">
        <Row gap={16} align="flex-end" wrap>
          {[24,32,40,52].map(s=>(
            <Col key={s} gap={6} style={{alignItems:"center"}}>
              <Av name="Adrian Bürgi" size={s}/>
              <Sub>{s}px</Sub>
            </Col>
          ))}
          <Col gap={6} style={{alignItems:"center"}}>
            <div style={{borderRadius:"50%",border:"2px solid var(--cc-accent)",display:"inline-flex"}}><Av name="Anna Koch" size={40}/></div>
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
        <ModalOrSheet open={showModal} onClose={()=>setShowModal(false)}>
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
          <Btn color={R} onClick={async()=>{
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

      {/* Komponenten-Registry */}
      <Sec title={`Alle Komponenten (${COMPONENT_REGISTRY.length})`} action={<span style={{fontSize:11,color:"var(--sub)"}}>Klick zum Aufklappen</span>}>
        {["Listen","Navigation","Overlays","Feedback","Basics","Layout","Formulare"].map(cat => {
          const comps = COMPONENT_REGISTRY.filter(c => c.category === cat);
          if (!comps.length) return null;
          return (
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>{cat}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {comps.map(c => {
                  const isOpen = openPreviews[c.name];
                  const DemoFn = DEMO_MAP[c.name];
                  return (
                    <div key={c.name} style={{borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",overflow:"hidden"}}>
                      <div
                        style={{padding:"10px 14px",cursor:"pointer",userSelect:"none"}}
                        onClick={()=>setOpenPreviews(p=>({...p,[c.name]:!p[c.name]}))}
                      >
                        <Between>
                          <Row gap={8}>
                            <TI n={isOpen?"chevron-down":"chevron-right"} size={12} style={{color:"var(--sub)",flexShrink:0}}/>
                            <div style={{fontWeight:600,fontSize:13,color:"var(--text)",fontFamily:"monospace"}}>{c.name}</div>
                          </Row>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {c.usedIn.map(u=>(
                              <span key={u} style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--surface2)",color:"var(--sub)",border:"0.5px solid var(--border)"}}>{u}</span>
                            ))}
                          </div>
                        </Between>
                        <div style={{fontSize:12,color:"var(--sub)",marginTop:4,marginLeft:20}}>{c.desc}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,marginLeft:20}}>
                          {c.props.map(p=>(
                            <code key={p} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"var(--cc-accent-5,rgba(255,191,0,0.05))",border:"0.5px solid var(--cc-accent-10,rgba(255,191,0,0.1))",color:"var(--text)"}}>{p}</code>
                          ))}
                        </div>
                      </div>
                      {isOpen && DemoFn && (
                        <div style={{padding:"14px 16px",borderTop:"0.5px solid var(--border)",background:"var(--bg)"}}>
                          <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--sub)",marginBottom:10}}>Vorschau</div>
                          {DemoFn()}
                        </div>
                      )}
                      {isOpen && !DemoFn && (
                        <div style={{padding:"14px 16px",borderTop:"0.5px solid var(--border)",background:"var(--bg)",fontSize:12,color:"var(--sub)"}}>Keine Vorschau verfügbar</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Sec>

    </div>
  );
}
