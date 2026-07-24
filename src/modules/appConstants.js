/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/appConstants.js
   App-Level Konstanten (bis Supabase-Migration abgeschlossen)
   ═══════════════════════════════════════════════════════════════ */
import { GANTT } from "../demoData.js";

/* ── Team-Hierarchie (Baumstruktur für TeamsVerwaltung) ── */
export const TEAM_HIERARCHY = {
  "Aktivfussball": {
    "Aktive Herren":  ["Aktive Herren"],
    "Aktive Frauen":  ["Aktive Frauen"],
  },
  "Juniorenfussball": {
    "Junioren A": ["Junioren A"],
    "Junioren B": ["Junioren B"],
    "Junioren C": ["Junioren C"],
    "Junioren D": ["Junioren D-9","Junioren D-7"],
  },
  "Kinderfussball Junioren": {
    "Junioren E": ["Junioren E"],
    "Junioren F": ["Junioren F"],
    "Junioren G": ["Junioren G"],
  },
  "Juniorinnenfussball": {
    "Juniorinnen B / FF-21": ["Juniorinnen FF-21"],
    "Juniorinnen C / FF-17": ["Juniorinnen FF-17"],
    "Juniorinnen D / FF-14": ["Juniorinnen FF-14 9v9","Juniorinnen FF-14 7v7","Juniorinnen FF-14"],
  },
  "Kinderfussball Juniorinnen": {
    "Juniorinnen E / FF-11": ["Juniorinnen FF-11"],
    "Juniorinnen F / FF-9":  ["Juniorinnen FF-9"],
    "Juniorinnen G / FF-7":  ["Juniorinnen FF-7"],
  },
  "Seniorenfussball": {
    "Senioren 30+": ["Senioren 30+"],
    "Senioren 40+": ["Senioren 40+"],
    "Senioren 50+": ["Senioren 50+"],
    "Senioren 60+": ["Senioren 60+"],
  },
};

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
