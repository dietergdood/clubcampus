/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/ApiTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate, InfoBox} from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function ApiTab({supabase,loading,isMobile,mobileKachel,felder,apiVerbindungen,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
          <div style={{height:16}}/>
          <div className="cc-grid-cards" style={{gap:14}}>
            {(apiVerbindungen.length>0?apiVerbindungen:Object.entries(API_INFOS).map(([key,info])=>({key,label:key,active:false,konfiguriert:false,sync_status:"deaktiviert",...info}))).map(api=>{
              const info=API_INFOS[api.key]||{};
              const statusColor=api.sync_status==="ok"?GN:api.sync_status==="fehler"?R:api.sync_status==="ausstehend"?AM:"#aaa";
              const statusBg=api.sync_status==="ok"?"#ECFDF5":api.sync_status==="fehler"?RL:api.sync_status==="ausstehend"?"#FFFBEB":"#f5f5f3";
              return(
                <Card key={api.key}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <Row>
                      <TI n="plug" style={{fontSize:18,color:api.active?BK:"#ccc"}}/>
                      <span style={{fontWeight:700,fontSize:14}}>{api.label||api.key}</span>
                    </Row>
                    <Chip text={api.sync_status||"deaktiviert"} color={statusColor} bg={statusBg}/>
                  </div>
                  <p style={{fontSize:14,color:"var(--sub)",margin:"0 0 10px",lineHeight:1.5}}>{info.description||"Externe API-Verbindung"}</p>
                  {info.felder&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginBottom:4}}>Synchronisierte Daten:</div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:"var(--sub)",padding:"2px 0"}}>
                          <TI n="check" style={{fontSize:14,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {api.letzter_sync&&(
                    <div style={{fontSize:14,color:"var(--sub)",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                    </div>
                  )}
                  <Row align="flex-start">
                    {api.active&&<Btn sm variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    <Btn sm variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>
                  </Row>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT-LOGS ── */}
    </div>
  );
}
