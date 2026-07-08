/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/TeamModuleTab.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, Fragment } from "react";
import { Btn, Card, Col, Input, ModalOrSheet, ModalTitle, Row, Select, Av, Chip, useIsMobile, DropMenu, LandSelect, FunktionenMultiSelect, Toolbar, useConfirm, ConfirmDialog, StatusTile, STitle, SectionLabel, Empty, Label, Sub, Stat, BulkBar, SortHeader, Between, H1, H2, Truncate } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB, FONT } from "../../constants.js";
import { hexToRgba, darkenHex, THEME_DEFAULT_STATIC, contrastColor } from "../../theme.jsx";

export function TeamModuleTab({supabase,loading,isMobile,mobileKachel,tab}) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="teammodule"&&(()=>{
        const TEAM_MODS=[
          {key:"roster",    label:"Kader"},
          {key:"training",  label:"Training"},
          {key:"spielplan", label:"Spielplan"},
          {key:"events",    label:"Termine"},
          {key:"attendance_central",label:"Anwesenheit"},
          {key:"helpers",   label:"Helfer"},
          {key:"polls",     label:"Abstimmungen"},
          {key:"stats",     label:"Statistik"},
          {key:"media",     label:"Medien"},
          {key:"news",      label:"News"},
          {key:"wiki",      label:"Wiki"},
          {key:"docs",      label:"Dokumente"},
        ];
        /* Lokaler State für Änderungen */
        return(
          <TeamModuleMatrix supabase={supabase} setSaveMsg={setSaveMsg}/>
        );
      })()}

      {/* ── TAB: BENUTZER & ROLLEN ── */}
    </div>
  );
}
