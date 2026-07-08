/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/PortalTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import {Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         Toolbar, ColMenuButton, SortHeader} from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../../constants.js";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.js";
import { currentSeason } from "../../domains/season/seasonUtils.js";
import { MemberHero, FotoUpload } from "./MemberHero.jsx";
import { LAENDER, getLandName, getFieldVisibility, RolleChip } from "./memberUtils.jsx";

export function PortalTab({raw,tab,canEdit,sb,role,account,dbPortalRollen,kannVerwalten,onReload,onUpdatePortalZugang,portalData,setPortalData,portalLoading,setPortalLoading,benutzer,setBenutzer,linkEmail,setLinkEmail,portalMsg,setPortalMsg,handleLink,handleUnlink}) {
  return (
    <div style={{display:'contents'}}>
      {tab==="portal"&&(
        <div className="cc-col cc-gap-16">
          <Card>
            <div className="cc-between cc-mb-12">
              <div className="cc-text-bold cc-text-lg">Portal-Zugang</div>
              <Chip text={raw.hat_portal_zugang?"Aktiv":"Kein Zugang"} color={raw.hat_portal_zugang?GN:R} bg={raw.hat_portal_zugang?"#ECFDF5":RL}/>
            </div>
            {raw.hat_portal_zugang&&benutzer&&(
              <div className="cc-info-grid cc-mb-12">
                {[
                  {l:"E-Mail",   v:benutzer.email||"-"},
                  {l:"Rolle",    v:benutzer.role||"-"},
                  {l:"Erstellt", v:benutzer.created_at?new Date(benutzer.created_at).toLocaleDateString("de-CH"):"-"},
                ].map((r,i)=>(
                  <div key={i} className="cc-info-row">
                    <span className="cc-info-key">{r.l}</span>
                    <span className="cc-info-val">{r.v}</span>
                  </div>
                ))}
              </div>
            )}
            {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mb-12`}>{portalMsg.text}</div>}
            {raw.hat_portal_zugang
              ?<button className="cc-btn-danger cc-w-full" onClick={handleUnlink}>Verknüpfung aufheben</button>
              :(
                <div className="cc-col cc-gap-8">
                  <label className="cc-label">E-Mail des Benutzers</label>
                  <input className="cc-input" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="email@example.com"/>
                  <button className="cc-btn-success cc-w-full" onClick={handleLink} disabled={!linkEmail||portalLoading}>
                    {portalLoading?"Wird verknüpft…":"Mit Portal verknüpfen"}
                  </button>
                </div>
              )
            }
          </Card>
          {/* Datenprüfung */}

        </div>
      )}

      {/* Tab: Datenprüfung */}
    </div>
  );
}
