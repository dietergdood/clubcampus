/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/AussehenTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function AussehenTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,theme,updateTheme,saveTheme,themeDirty,setThemeDirty,vereinId,applyTheme,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="aussehen"&&(
        <div style={{maxWidth:600}}>
          <InfoBox text="Farben und Branding des Portals anpassen. Änderungen werden sofort in der Vorschau angezeigt und nach dem Speichern live übernommen." color={BL}/>

          {/* Vorschau */}
          <Card style={{marginTop:14,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vorschau</div>
            <div style={{padding:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
              {/* Mini-Navbar */}
              <div style={{background:theme.navBg,borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,minWidth:180}}>
                <div style={{width:32,height:32,borderRadius:8,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  <img src={theme.logo||LOGO_B64} style={{width:32,height:32,objectFit:"cover",display:"block"}} alt="Logo"/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:theme.navText,lineHeight:1.2,letterSpacing:-0.2}}>{theme.vereinsname||"Mein Verein"}</div>
                  <div style={{fontSize:9,color:theme.navAccent||theme.vereinsfarbe1,letterSpacing:0.5,textTransform:"uppercase",fontWeight:600,marginTop:1}}>{"ClubCampus"}</div>
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button style={{padding:"7px 16px",borderRadius:8,border:"none",background:theme.btnPrimary,color:theme.btnPrimaryText,fontSize:12,fontWeight:600,cursor:"default"}}>Speichern</button>
                <span style={{padding:"4px 10px",borderRadius:20,background:theme.vereinsfarbe1,color:theme.vereinsfarbe2,fontSize:11,fontWeight:700}}>Aktiv</span>
                <div style={{width:32,height:32,borderRadius:"50%",background:theme.vereinsfarbe1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:theme.vereinsfarbe2}}>DG</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Vereinsname */}
          <Card style={{marginTop:12,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <TI n="building-community" size={18} style={{color:"var(--sub)",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--text)",marginBottom:4}}>Vereinsname</div>
                <input value={theme.vereinsname||""} onChange={e=>updateTheme("vereinsname",e.target.value)}
                  style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",outline:"none",fontFamily:FONT}}/>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:3}}>Wird unter dem Portal-Logo angezeigt</div>
              </div>
            </div>
          </Card>

          {/* Vereinslogo */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid var(--border)"}}>Vereinslogo</div>
            <div style={{padding:16,display:"flex",alignItems:"center",gap:16}}>
              {/* Aktuelles Logo */}
              <div style={{width:72,height:72,borderRadius:14,border:"0.5px solid var(--border)",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                {theme.logo
                  ?<img src={theme.logo} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="Logo"/>
                  :<TI n="photo" size={28} style={{color:"var(--sub)"}}/>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--text)",marginBottom:6}}>Logo hochladen</div>
                <div style={{fontSize:11,color:"var(--sub)",marginBottom:10}}>SVG oder PNG, empfohlen mind. 200×200px</div>
                <Row align="flex-start">
                  <label style={{
                    display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",
                    borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",
                    color:"var(--sub)",fontSize:12,fontWeight:600,cursor:"pointer"
                  }}>
                    <TI n="upload" size={13}/>Datei wählen
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const file=e.target.files?.[0];
                      if(!file) return;
                      const reader=new FileReader();
                      reader.onload=ev=>{updateTheme("logo",ev.target.result);};
                      reader.readAsDataURL(file);
                    }}/>
                  </label>
                  {theme.logo&&(
                    <Btn onClick={()=>updateTheme("logo",null)}>
                      <Row gap={6}><TI n="trash" size={13}/>Entfernen</Row>
                    </Btn>
                  )}
                </Row>
              </div>
            </div>
          </Card>

          {/* Farb-Einstellungen */}
          <Card style={{marginTop:12,padding:0,overflow:"hidden"}}>
            {[
              {key:"vereinsfarbe1",  label:"Vereinsfarbe",              hint:"Hauptfarbe des Vereins — für Badges, Highlights, aktive Elemente"},
              {key:"vereinsfarbe2",  label:"Text auf Vereinsfarbe",    hint:"Muss auf der Vereinsfarbe gut lesbar sein"},

              {key:"navBg",          label:"Menü Hintergrund",          hint:"Hintergrundfarbe der Navigationsleiste"},
              {key:"navText",        label:"Menü Text",                 hint:"Farbe der inaktiven Menüpunkte"},
              {key:"navHover",       label:"Menü Hover",                hint:"Farbe beim Überfahren eines Menüpunkts"},
              {key:"navAccent",      label:"Menü Aktiv Hintergrund",    hint:"Standard: Vereinsfarbe — bei Bedarf anpassen"},
              {key:"navAccentText",  label:"Menü Aktiv Text",           hint:"Standard: Text auf Vereinsfarbe — bei Bedarf anpassen"},

              {key:"avatarBg",       label:"Avatar Hintergrund",        hint:"Standard: Vereinsfarbe"},
              {key:"avatarText",     label:"Avatar Text",               hint:"Standard: Text auf Vereinsfarbe"},

              {key:"btnPrimary",     label:"Button Hintergrund",        hint:"Hintergrundfarbe für Haupt-Buttons"},
              {key:"btnPrimaryText", label:"Button Text",               hint:"Textfarbe für Haupt-Buttons"},
            ].map((item,i)=>(
              <div key={item.key} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderTop:i>0?"0.5px solid var(--border)":"none"}}>
                <input type="color" value={theme[item.key]||(item.key==="navAccent"||item.key==="avatarBg"?theme.vereinsfarbe1:item.key==="navAccentText"||item.key==="avatarText"?theme.vereinsfarbe2||"#000000":"#000000")||"#000000"} onChange={e=>updateTheme(item.key,e.target.value)}
                  style={{width:36,height:36,borderRadius:8,border:"0.5px solid var(--border)",padding:2,cursor:"pointer",background:"none"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{item.label}</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{item.hint}</div>
                </div>
                <code style={{fontSize:11,color:"var(--sub)",background:"var(--surface2)",padding:"2px 7px",borderRadius:5}}>{theme[item.key]||(["navAccent","navAccentText","avatarBg","avatarText"].includes(item.key)?"auto":"")}</code>
                <Btn variant="ghost" onClick={()=>{
                  const autoKeys=["navAccent","navAccentText","avatarBg","avatarText"];
                  updateTheme(item.key, autoKeys.includes(item.key)?null:(THEME_DEFAULT_STATIC[item.key]??null));
                }} title="Zurücksetzen" style={{padding:4}}>
                  <TI n="refresh" size={14}/>
                </Btn>
              </div>
            ))}
          </Card>

          {/* Speichern */}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn variant="primary" onClick={saveTheme} style={{padding:"9px 24px",fontSize:14,fontWeight:700}}>
              Speichern & anwenden
            </Btn>
            <Btn onClick={()=>{
              setAppTheme(THEME_DEFAULT_STATIC);
              setThemeDirty(false);
              if(applyTheme) applyTheme(THEME_DEFAULT_STATIC);
              try{localStorage.setItem("cc-theme",JSON.stringify(THEME_DEFAULT_STATIC));}catch{}
              if(supabase){
                const q=vereinId
                  ?supabase.from("vereine").update({theme:THEME_DEFAULT_STATIC}).eq("id",vereinId)
                  :supabase.from("vereine").update({theme:THEME_DEFAULT_STATIC});
                q.then(({error:e})=>{setSaveMsg(e?"Fehler: "+e.message:"Standard gespeichert ✓");setTimeout(()=>setSaveMsg(""),2500);});
              }
            }}>
              Standard wiederherstellen
            </Btn>
          </div>
        </div>
      )}

    </div>
  );
}
