/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/AuditTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function AuditTab({loading,isMobile,mobileKachel,auditLogs,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="audit"&&(
        <div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table className="cc-table">
              <thead>
                <tr style={{background:"var(--surface2)"}}>
                  {["Zeit","API / System","Status","Neu","Aktualisiert","Fehler","Details"].map((h,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"var(--sub)",fontSize:14,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.length===0&&(
                  <tr className="cc-tr"><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"var(--sub)",fontSize:14}}>Noch keine Sync-Logs vorhanden</td></tr>
                )}
                {auditLogs.map((log,i)=>(
                  <tr key={log.id} style={{borderTop:"0.5px solid var(--border)",background:i%2===0?"var(--surface)":"var(--surface2)"}}>
                    <td style={{padding:"9px 13px",color:"var(--sub)",whiteSpace:"nowrap",fontSize:14}}>
                      {log.gestartet_am?new Date(log.gestartet_am).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"}):"—"}
                    </td>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{log.api_verbindungen?.label||"System"}</td>
                    <td style={{padding:"9px 13px"}}><Chip text={log.status||"—"} color={log.status==="ok"?GN:log.status==="fehler"?R:AM} bg={log.status==="ok"?"#ECFDF5":log.status==="fehler"?RL:"#FFFBEB"}/></td>
                    <td style={{padding:"9px 13px",color:GN,fontWeight:600}}>{log.datensaetze_neu||0}</td>
                    <td style={{padding:"9px 13px",color:BL,fontWeight:600}}>{log.datensaetze_aktualisiert||0}</td>
                    <td style={{padding:"9px 13px",color:log.datensaetze_fehler>0?R:"#aaa",fontWeight:600}}>{log.datensaetze_fehler||0}</td>
                    <td style={{padding:"9px 13px",color:"var(--sub)",fontSize:14,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.meldung||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}


      {/* ── TAB: DESIGN-TOKENS ── */}
    </div>
  );
}
