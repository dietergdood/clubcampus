import { spalte, personGruppe } from "../../shared/person/personSpalten.ts";
import type { ColDef, ColGroup } from "../../shared/list/types.ts";
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberConstants.ts
   Konstanten für MitgliederModul
   ═══════════════════════════════════════════════════════════════ */

/* SUPPORTER_TYP stand hier bis zum 19.08.2026: ein Vergleich gegen den
   Namen "Supporter", mit dem MitgliederModul die Liste trennte und InfoTab
   drei Bereiche ausblendete. Der Name war der Schluessel — beim zweiten
   Verein, der seinen Typ anders nennt, griff er nicht mehr.

   Ersetzt durch zwei strukturelle Merkmale: die Listentrennung laeuft ueber
   `mitgliedtypen.zaehlt_als_mitgliedschaft`, die Bereiche im Profil ueber
   die Mitgliedtyp-Konfiguration (domains/members/feldkonfig.ts). */

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
  standard:      { label:"Standard",   cols:["name","mitgliedschaft","rollen","teams_rollen","funktionen_gruppen","portal","datenpruefung"] },
  administration:{ label:"Verwaltung", cols:["name","email","telefon","ort","mitgliedschaft","datenpruefung"] },
};

/* ⚠ DIE 20 PERSONENSPALTEN KOMMEN AUS `shared/person/personSpalten.ts`.
   Dort stehen Schluessel und Beschriftung — die IDENTITAET —, damit die
   Eltern-, Supporter- und Archivliste dieselben verwenden statt eigene zu
   erfinden. Die VORGABEN (`default`, `hidden`, `alwaysOn`) bleiben hier:
   sie sind je Liste verschieden.

   ⚠ DIE 8 UEBRIGEN HAENGEN AN EINER MITGLIEDSCHAFT und stehen deshalb hier
   und nirgends sonst: mitgliedschaft, eintritt, spielerpass, fairgate_id
   und js_nr direkt in `mitglieder`, teams_rollen/teams/kaderrollen ueber
   `kader.mitglied_id`. Ein Supporter hat sie nicht — nicht leer, sondern gar
   nicht.

   ⚠ REIHENFOLGE UND SCHLUESSEL SIND UNVERAENDERT. `mitglieder_ansichten.
   spalten` speichert die Schluessel als Text; ein umbenannter verschwindet
   STILL aus jeder gespeicherten Ansicht. `memberConstants.test.ts` haelt
   alle 28 namentlich fest. */
const M = (key: string, label: string, flags: Partial<ColDef> = {}): ColDef =>
  ({ key, label, ...flags });

export const COL_GROUPS: ColGroup[] = [
  personGruppe("Personendaten",
    ["name","nachname","vorname","geburtsdatum","alter","geschlecht",
     "nationalitaet","nationalitaet2","heimatort","ahv_nr"],
    { default:false },
    { name: { default:true, alwaysOn:true } }),
  personGruppe("Kontakt", ["email","telefon","strasse","ort"], { default:false }),
  {group:"Verein", cols:[
    M("mitgliedschaft","Mitgliedschaft", {default:true}),
    spalte("rollen", {default:true}),
    M("eintritt","Eintritt",             {default:false}),
    M("spielerpass","Spielerpass",       {default:false}),
    M("fairgate_id","Fairgate-ID",       {default:false}),
    M("js_nr","J+S Nr.",                 {default:false}),
  ]},
  personGruppe("Portal", ["portal","datenpruefung"], { default:true }),
  {group:"Sport", cols:[
    M("teams_rollen","Teams & Kaderrollen", {default:true}),
    spalte("funktionen_gruppen",            {default:true}),
    M("teams","Teams",                      {default:false, hidden:true}),
    M("kaderrollen","Kaderrolle",           {default:false, hidden:true}),
    spalte("funktionen",                    {default:false, hidden:true}),
    spalte("funktionsgruppen",              {default:false, hidden:true}),
  ]},
];

export const ALL_COLS = COL_GROUPS.flatMap(g => g.cols);

// Einzelne Gruppierungs-Optionen (für jede Ebene)
export const GROUP_OPTIONS = [
  {val:"mitgliedschaft",    label:"Mitgliedschaft"},
  {val:"rollen",            label:"Portalrolle"},
  {val:"teams",             label:"Team"},
  {val:"kaderrollen",       label:"Kaderrolle"},
  {val:"funktionsgruppen",  label:"Funktionsgruppe"},
  {val:"funktionen",        label:"Vereinsfunktion"},
  {val:"__teams_funktionen",label:"Team & Funktionsgruppe"},
];

export const GROUP_OPTIONS_MORE = [
  {val:"portal",          label:"Portal-Zugang"},
  {val:"datenpruefung",   label:"Datenprüfung"},
  {val:"geschlecht",      label:"Geschlecht"},
  {val:"nationalitaet",   label:"Nationalität"},
  {val:"ort",             label:"Wohnort"},
  {val:"__jahrgang",      label:"Jahrgang"},
  {val:"__eintrittsjahr", label:"Eintrittsjahr"},
];
