/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/DatenpruefungTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         Toolbar, ColMenuButton, SortHeader, useConfirm, ConfirmDialog } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../../constants.js";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.js";
import { currentSeason } from "../../domains/season/seasonUtils.js";
import { MemberHero, FotoUpload } from "./MemberHero.jsx";
import { LAENDER, getLandName, getFieldVisibility, RolleChip } from "./memberUtils.jsx";

export function DatenpruefungTab({raw,tab,canEdit,sb,kannVerwalten,onReload,onProfilGeprueft}) {
  return (
    <div style={{display:'contents'}}>
      {tab==="datenpruefung"&&(
        <div className="cc-col cc-gap-16">
          <Card>
            <div className="cc-between cc-mb-12">
              <div>
                <div className="cc-text-bold cc-text-lg">Profil-Status</div>
                <div className="cc-text-sm cc-mt-4">
                  {raw.profil_geprueft_at
                    ?`Zuletzt geprüft am ${new Date(raw.profil_geprueft_at).toLocaleDateString("de-CH")}`
                    :"Noch nie geprüft"}
                </div>
              </div>
              <Chip
                text={raw.profil_geprueft_at?"Geprüft":"Ausstehend"}
                color={raw.profil_geprueft_at?GN:AM}
                bg={raw.profil_geprueft_at?"#ECFDF5":"#FFFBEB"}
              />
            </div>
            <div className="cc-info-grid">
              {[
                {l:"Vorname",      ok:!!raw.vorname},
                {l:"Nachname",     ok:!!raw.nachname},
                {l:"Geburtsdatum", ok:!!raw.geburtsdatum},
                {l:"Nationalität", ok:!!raw.nationalitaet},
                {l:"Adresse",      ok:!!(raw.strasse&&raw.plz&&raw.ort)},
                {l:"E-Mail",       ok:!!raw.email},
                {l:"Telefon",      ok:!!raw.telefon},
              ].map((f,i)=>(
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{f.l}</span>
                  <span>{f.ok
                    ?<span className="cc-badge cc-badge-success"><TI n="check" size={10}/> OK</span>
                    :<span className="cc-badge cc-badge-warning">Fehlt</span>
                  }</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="cc-text-bold cc-mb-4">Datenprüfung anfordern</div>
            <div className="cc-text-sm cc-mb-12">Das Mitglied wird beim nächsten Login aufgefordert, seine Daten zu prüfen und zu bestätigen.</div>
            <button className="cc-btn-ghost cc-w-full" onClick={async()=>{
              if(!sb) return;
              await sb.from("mitglieder").update({profil_geprueft_at:null}).eq("id",raw.id);
              setPortalMsg({ok:true,text:"Datenprüfung angefordert ✓"});
              if(onReload) setTimeout(onReload,500);
            }}>
              <TI n="refresh"/> Datenprüfung anfordern
            </button>
            {portalMsg&&<div className={`cc-badge ${portalMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{portalMsg.text}</div>}
          </Card>
        </div>
      )}

      {/* Platzhalter Tabs */}
    </div>
  );
}
