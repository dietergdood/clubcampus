/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberConstants.js
   Konstanten für MitgliederModul
   ═══════════════════════════════════════════════════════════════ */

export const ROLES = {
  administrator: { label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings", level:7 },
  vorstand:      { label:"Vorstand",      color:"var(--text)", bg:"#F5F5F5", icon:"scale",    level:6 },
  administration:{ label:"Administration",color:"var(--text)", bg:"#F5F5F5", icon:"briefcase",level:5 },
  funktionaer:   { label:"Funktionär",   color:"var(--text)", bg:"#F5F5F5", icon:"heart-handshake", level:4 },
  trainer:       { label:"Trainer",       color:"var(--text)", bg:"#F5F5F5", icon:"ball-football",  level:3 },
  spieler:       { label:"Spieler",       color:"var(--text)", bg:"#F5F5F5", icon:"target",  level:2 },
  eltern:        { label:"Eltern",        color:"var(--text)", bg:"#F5F5F5", icon:"user",    level:1 },
};

export const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

export const SAVED_VIEWS = {
  standard:      { label:"Standard",   cols:["name","mitgliedschaft","rollen","teams","portal","datenpruefung"] },
  administration:{ label:"Verwaltung", cols:["name","email","telefon","ort","mitgliedschaft","datenpruefung"] },
};

export const COL_GROUPS = [
  {group:"Personendaten", cols:[
    {key:"name",          label:"Name",           default:true,  alwaysOn:true},
    {key:"nachname",      label:"Nachname",       default:false},
    {key:"vorname",       label:"Vorname",        default:false},
    {key:"geburtsdatum",  label:"Geburtsdatum",   default:false},
    {key:"alter",         label:"Alter",          default:false},
    {key:"geschlecht",    label:"Geschlecht",     default:false},
    {key:"nationalitaet", label:"Nationalität",  default:false},
    {key:"nationalitaet2",label:"Nationalität 2", default:false},
    {key:"heimatort",     label:"Heimatort",      default:false},
    {key:"ahv_nr",        label:"AHV-Nr.",        default:false},
  ]},
  {group:"Kontakt", cols:[
    {key:"email",         label:"E-Mail",         default:false},
    {key:"telefon",       label:"Telefon",        default:false},
    {key:"strasse",       label:"Strasse",        default:false},
    {key:"ort",           label:"PLZ/Ort",        default:false},
  ]},
  {group:"Verein", cols:[
    {key:"mitgliedschaft",label:"Mitgliedschaft", default:true},
    {key:"rollen",        label:"Rollen",         default:true},
    {key:"funktionen",    label:"Vereinsfunktionen", default:false},
    {key:"funktionsgruppen", label:"Funktionsgruppe",  default:false},
    {key:"eintritt",      label:"Eintritt",       default:false},
    {key:"spielerpass",   label:"Spielerpass",    default:false},
    {key:"fairgate_id",   label:"Fairgate-ID",    default:false},
    {key:"js_nr",         label:"J+S Nr.",        default:false},
  ]},
  {group:"Portal", cols:[
    {key:"portal",        label:"Portal-Zugang",  default:true},
    {key:"datenpruefung", label:"Datenpruefung",  default:true},
  ]},
  {group:"Sport", cols:[
    {key:"teams",         label:"Teams",          default:true},
  ]},
];

export const ALL_COLS = COL_GROUPS.flatMap(g => g.cols);

// Einzelne Gruppierungs-Optionen (für jede Ebene)
export const GROUP_OPTIONS = [
  {val:"none",              label:"Keine Gruppierung"},
  {val:"mitgliedschaft",    label:"Mitgliedschaft"},
  {val:"rollen",            label:"Rolle"},
  {val:"teams",             label:"Team"},
  {val:"portal",            label:"Portal-Zugang"},
  {val:"datenpruefung",     label:"Datenprüfung"},
  {val:"funktionsgruppen",  label:"Funktionsgruppe"},
  {val:"__teams_funktionen",label:"Team & Funktionsgruppe"},
];

export const GROUP_OPTIONS_MORE = [
  {val:"geschlecht",      label:"Geschlecht"},
  {val:"nationalitaet",   label:"Nationalität"},
  {val:"ort",             label:"Wohnort"},
  {val:"__jahrgang",      label:"Jahrgang"},
  {val:"__eintrittsjahr", label:"Eintrittsjahr"},
];
