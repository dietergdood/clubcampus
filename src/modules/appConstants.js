/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/appConstants.js
   App-Level Konstanten (bis Supabase-Migration abgeschlossen)
   ═══════════════════════════════════════════════════════════════ */
import { GANTT } from "../demoData.js";

/* ── Shared Navigation Target (cross-module Seiteneffekt) ── */
export const NAV_TARGET = { tab: null, filter: null, kindTeam: null, openEvId: null, selectedSpiel: null };

/* ── Feld-Sichtbarkeit pro Rolle ── */
export const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* ── Trainingsplan Demo-Daten (bis Supabase-Migration) ── */
export const INITIAL_PLAENE = [
  {
    id: "plan_1",
    name: "Trainingsplan Saison 2025/26",
    valid_from: "2025-08-01",
    valid_until: "2026-06-30",
    active: true,
    slots: GANTT.flatMap((d, di) => d.slots.map((s, si) => ({
      id: "slot_" + di + "_" + si,
      weekday: d.day,
      team: s.team,
      start: s.start,
      end: s.end,
      ort: s.field,
      end_ort: "",
      half: "",
      end_half: "",
      wechsel_zeit: "",
      color: s.color,
    })))
  }
];
