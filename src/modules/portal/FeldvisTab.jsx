/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/FeldvisTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate, InfoBox} from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function FeldvisTab({supabase,loading,saveMsg,setSaveMsg,isMobile,mobileKachel,toggleFeld,tab,ROLLEN,ROLLEN_LABELS}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="feldvis"&&(
        <div>
          <InfoBox text="Steuert welche Mitglieder-Felder pro Rolle sichtbar sind. Änderungen wirken sofort." color={BL}/>
          <div style={{height:12}}/>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  <th className="cc-th">Feld</th>
                  {ROLLEN.map((r,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"var(--sub)",fontSize:14,textTransform:"uppercase",letterSpacing:0.4}}>{ROLLEN_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(felderNachKey).map(([key,data],i)=>(
                  <tr key={key} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{data.label}</td>
                    {ROLLEN.map(rolle=>{
                      const sichtbar=data.rollen[rolle]||false;
                      const isAdmin=rolle==="administrator";
                      return(
                        <td key={rolle} style={{padding:"9px 13px",textAlign:"center"}}>
                          <div onClick={isAdmin?undefined:()=>toggleFeld(key,rolle,!sichtbar)}
                            style={{width:20,height:20,borderRadius:4,background:sichtbar?GN:"#e5e7eb",cursor:isAdmin?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",border:`1px solid ${sichtbar?"#16a34a":"#d1d5db"}`}}>
                            {sichtbar&&<TI n="check" style={{fontSize:14,color:"#fff"}}/>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Object.keys(felderNachKey).length===0&&(
                  <tr className="cc-tr"><td colSpan={7} style={{padding:20,textAlign:"center",color:"var(--sub)",fontSize:14}}>
                    Noch keine Felder konfiguriert — SQL-Schema importieren
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: API-VERBINDUNGEN ── */}
      {/* ── TAB: AUSSEHEN ── */}
    </div>
  );
}
