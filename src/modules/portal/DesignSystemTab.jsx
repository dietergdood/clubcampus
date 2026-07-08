/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/DesignSystemTab.jsx
   Living Style Guide — zeigt alle aktiven CSS-Variablen und
   UI-Komponenten live mit dem aktuellen Theme
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { TI } from "../../icons.jsx";

/* Helper: liest CSS-Variable live aus dem DOM */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* Farbswatch + Variablenname + Wert */
function TokenRow({ name, desc }) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(cssVar(name)); }, [name]);
  const isColor = val.startsWith("#") || val.startsWith("rgb") || val.startsWith("rgba");
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", borderRadius:8, border:"0.5px solid var(--border)", background:"var(--surface)" }}>
      {isColor && (
        <div style={{ width:28, height:28, borderRadius:6, background:val, border:"0.5px solid var(--border)", flexShrink:0 }}/>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontFamily:"monospace", fontWeight:600, color:"var(--text)" }}>{name}</div>
        {desc && <div style={{ fontSize:10, color:"var(--sub)", marginTop:1 }}>{desc}</div>}
      </div>
      <div style={{ fontSize:10, fontFamily:"monospace", color:"var(--sub)", flexShrink:0, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--sub)", marginBottom:10, paddingBottom:6, borderBottom:"0.5px solid var(--border)" }}>{title}</div>
      {children}
    </div>
  );
}

function TokenGrid({ tokens }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:6 }}>
      {tokens.map(t => <TokenRow key={t.name} {...t}/>)}
    </div>
  );
}

export function DesignSystemTab({ loading, isMobile, mobileKachel, tab }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tab === "designsystem") setTick(t => t + 1);
  }, [tab]);

  if (loading || (isMobile && mobileKachel === null)) return null;
  if (tab !== "designsystem") return null;

  return (
    <div style={{ display:"contents" }}>
      {!loading && (!isMobile || mobileKachel !== null) && tab === "designsystem" && (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

          {/* Vereinsfarben */}
          <Section title="Vereinsfarben">
            <TokenGrid tokens={[
              { name:"--cc-accent",    desc:"Hauptfarbe" },
              { name:"--cc-accent2",   desc:"Sekundärfarbe" },
              { name:"--cc-hover",     desc:"Hover-Tinting" },
              { name:"--cc-accent-25", desc:"25% Transparenz" },
              { name:"--cc-accent-20", desc:"20% Transparenz" },
              { name:"--cc-accent-15", desc:"15% Transparenz" },
              { name:"--cc-accent-12", desc:"12% Transparenz" },
              { name:"--cc-accent-10", desc:"10% Transparenz" },
              { name:"--cc-accent-5",  desc:"5% Transparenz" },
            ]}/>
          </Section>

          {/* Navigation */}
          <Section title="Navigation">
            <TokenGrid tokens={[
              { name:"--nav",       desc:"Nav Hintergrund" },
              { name:"--nav-t",     desc:"Nav Text" },
              { name:"--nav-a",     desc:"Nav Akzent (aktiv)" },
              { name:"--nav-hover", desc:"Nav Hover" },
            ]}/>
          </Section>

          {/* Buttons */}
          <Section title="Buttons">
            <TokenGrid tokens={[
              { name:"--btn-primary",      desc:"Primär-Button Hintergrund" },
              { name:"--btn-primary-text", desc:"Primär-Button Text" },
              { name:"--btn-hover",        desc:"Primär-Button Hover" },
            ]}/>
          </Section>

          {/* Surfaces */}
          <Section title="Surfaces (Dark/Light Mode)">
            <TokenGrid tokens={[
              { name:"--bg",       desc:"Seitenhintergrund" },
              { name:"--surface",  desc:"Card-Hintergrund" },
              { name:"--surface2", desc:"Erhöhte Fläche" },
              { name:"--text",     desc:"Haupttext" },
              { name:"--sub",      desc:"Sekundärtext" },
              { name:"--border",   desc:"Trennlinie" },
            ]}/>
          </Section>

          {/* Avatar */}
          <Section title="Avatar">
            <TokenGrid tokens={[
              { name:"--avatar-bg",       desc:"Avatar Hintergrund" },
              { name:"--cc-avatar-text",  desc:"Avatar Text" },
            ]}/>
          </Section>

          {/* UI-Komponenten Vorschau */}
          <Section title="Buttons">
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <button className="cc-btn-primary" style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"var(--btn-primary)", color:"var(--btn-primary-text)", fontSize:13, fontWeight:600, cursor:"pointer" }}>Primär</button>
              <button className="cc-btn-outline">Outline</button>
              <button className="cc-icon-btn"><TI n="settings" size={14}/></button>
              <button style={{ padding:"8px 16px", borderRadius:8, border:"0.5px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:13, cursor:"pointer" }}>Sekundär</button>
              <button style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#FEF2F2", color:"#C8102E", fontSize:13, fontWeight:600, cursor:"pointer" }}>Gefahr</button>
            </div>
          </Section>

          <Section title="Chips und Badges">
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <span className="cc-chip-toggle cc-chip-active">Aktiv</span>
              <span className="cc-chip-toggle">Inaktiv</span>
              <span style={{ padding:"2px 10px", borderRadius:20, background:"var(--cc-accent)", color:"var(--btn-primary-text)", fontSize:11, fontWeight:600 }}>Vereinsfarbe</span>
              <span style={{ padding:"2px 10px", borderRadius:20, background:"#ECFDF5", color:"#15803D", fontSize:11, fontWeight:600 }}>Aktiv</span>
              <span style={{ padding:"2px 10px", borderRadius:20, background:"#FEF2F2", color:"#C8102E", fontSize:11, fontWeight:600 }}>Inaktiv</span>
              <span style={{ padding:"2px 10px", borderRadius:20, background:"#FEF3C7", color:"#B45309", fontSize:11, fontWeight:600 }}>Warnung</span>
            </div>
          </Section>

          <Section title="Tabs / Segmente">
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div className="cc-seg" style={{ maxWidth:320 }}>
                <button className="cc-seg-item cc-seg-active">Profil</button>
                <button className="cc-seg-item">Kader</button>
                <button className="cc-seg-item">Eltern</button>
              </div>
              <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)" }}>
                {["Übersicht","Mitglieder","Kader","Termine"].map((t,i) => (
                  <button key={t} style={{ padding:"8px 16px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:i===0?700:400, color:i===0?"var(--text)":"var(--sub)", borderBottom:i===0?"2px solid var(--cc-accent)":"2px solid transparent", marginBottom:-1 }}>{t}</button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Inputs">
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:400 }}>
              <input className="cc-input" placeholder="Text-Input…"/>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--sub)" }}><TI n="search" size={14}/></span>
                <input className="cc-input" style={{ paddingLeft:32 }} placeholder="Suchen…"/>
              </div>
              <select className="cc-input">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </Section>

          <Section title="Tabelle">
            <div style={{ border:"0.5px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["Name","Rolle","Status"].map(h => (
                      <th key={h} className="cc-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Adrian Bürgi","Trainer/in","Aktiv"],
                    ["Anna Koch","Spieler/in","Aktiv"],
                    ["Beat Müller","Elternteil","Inaktiv"],
                  ].map((row,i) => (
                    <tr key={i} className="cc-tr">
                      <td className="cc-td" style={{ fontWeight:500 }}>{row[0]}</td>
                      <td className="cc-td" style={{ color:"var(--sub)" }}>{row[1]}</td>
                      <td className="cc-td">
                        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600, background:row[2]==="Aktiv"?"#ECFDF5":"#FEF2F2", color:row[2]==="Aktiv"?"#15803D":"#C8102E" }}>{row[2]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Avatare">
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              {[24,32,40,52].map(s => (
                <div key={s} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ width:s, height:s, borderRadius:"50%", background:"var(--avatar-bg,var(--cc-accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:s*0.35, fontWeight:700, color:"var(--cc-avatar-text,var(--btn-primary-text))" }}>AB</div>
                  <div style={{ fontSize:10, color:"var(--sub)" }}>{s}px</div>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--avatar-bg,var(--cc-accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"var(--cc-avatar-text,var(--btn-primary-text))", border:"2px solid var(--cc-accent)" }}>AB</div>
                <div style={{ fontSize:10, color:"var(--sub)" }}>mit Border</div>
              </div>
            </div>
          </Section>

          <Section title="Karten">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>Mitglieder</div>
                <div style={{ fontSize:22, fontWeight:700, color:"var(--text)" }}>142</div>
              </div>
              <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>Teams</div>
                <div style={{ fontSize:22, fontWeight:700, color:"var(--text)" }}>8</div>
              </div>
              <div style={{ background:"var(--cc-hover)", border:"0.5px solid var(--cc-accent)", borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>Akzent-Card</div>
                <div style={{ fontSize:22, fontWeight:700, color:"var(--text)" }}>24</div>
              </div>
            </div>
          </Section>

          <Section title="Trenner und Zustände">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div className="cc-divider"/>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ padding:"8px 12px", borderRadius:8, background:"#ECFDF5", border:"0.5px solid #BBF7D0", color:"#15803D", fontSize:13 }}><TI n="check" size={14}/> Erfolgreich gespeichert</div>
                <div style={{ padding:"8px 12px", borderRadius:8, background:"#FEF3C7", border:"0.5px solid #FDE68A", color:"#B45309", fontSize:13 }}><TI n="alert-triangle" size={14}/> Achtung</div>
                <div style={{ padding:"8px 12px", borderRadius:8, background:"#FEF2F2", border:"0.5px solid #FECACA", color:"#C8102E", fontSize:13 }}><TI n="x" size={14}/> Fehler</div>
              </div>
            </div>
          </Section>

        </div>
      )}
    </div>
  );
}
