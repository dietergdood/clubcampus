/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberUtils.js
   Gemeinsame Helpers für MitgliederModul und Unterkomponenten
import { Chip } from "../../theme.jsx";
   ═══════════════════════════════════════════════════════════════ */
const LAENDER=[
  {c:"CH",n:"Schweiz"},{c:"DE",n:"Deutschland"},{c:"AT",n:"Österreich"},
  {c:"IT",n:"Italien"},{c:"FR",n:"Frankreich"},{c:"PT",n:"Portugal"},
  {c:"ES",n:"Spanien"},{c:"TR",n:"Türkei"},{c:"XK",n:"Kosovo"},
  {c:"RS",n:"Serbien"},{c:"HR",n:"Kroatien"},{c:"BA",n:"Bosnien-Herzegowina"},
  {c:"MK",n:"Nordmazedonien"},{c:"AL",n:"Albanien"},{c:"ME",n:"Montenegro"},
  {c:"SI",n:"Slowenien"},{c:"SK",n:"Slowakei"},{c:"CZ",n:"Tschechien"},
  {c:"PL",n:"Polen"},{c:"RO",n:"Rumänien"},{c:"HU",n:"Ungarn"},
  {c:"BG",n:"Bulgarien"},{c:"GR",n:"Griechenland"},{c:"NL",n:"Niederlande"},
  {c:"BE",n:"Belgien"},{c:"LU",n:"Luxemburg"},{c:"GB",n:"Grossbritannien"},
  {c:"IE",n:"Irland"},{c:"DK",n:"Dänemark"},{c:"SE",n:"Schweden"},
  {c:"NO",n:"Norwegen"},{c:"FI",n:"Finnland"},{c:"IS",n:"Island"},
  {c:"RU",n:"Russland"},{c:"UA",n:"Ukraine"},{c:"BY",n:"Belarus"},
  {c:"LT",n:"Litauen"},{c:"LV",n:"Lettland"},{c:"EE",n:"Estland"},
  {c:"MD",n:"Moldau"},{c:"GE",n:"Georgien"},{c:"AM",n:"Armenien"},
  {c:"AZ",n:"Aserbaidschan"},{c:"KZ",n:"Kasachstan"},{c:"US",n:"USA"},
  {c:"CA",n:"Kanada"},{c:"MX",n:"Mexiko"},{c:"BR",n:"Brasilien"},
  {c:"AR",n:"Argentinien"},{c:"CO",n:"Kolumbien"},{c:"CL",n:"Chile"},
  {c:"PE",n:"Peru"},{c:"UY",n:"Uruguay"},{c:"PY",n:"Paraguay"},
  {c:"BO",n:"Bolivien"},{c:"VE",n:"Venezuela"},{c:"EC",n:"Ecuador"},
  {c:"MA",n:"Marokko"},{c:"DZ",n:"Algerien"},{c:"TN",n:"Tunesien"},
  {c:"EG",n:"Ägypten"},{c:"NG",n:"Nigeria"},{c:"GH",n:"Ghana"},
  {c:"SN",n:"Senegal"},{c:"CM",n:"Kamerun"},{c:"CI",n:"Elfenbeinküste"},
  {c:"ZA",n:"Südafrika"},{c:"KE",n:"Kenia"},{c:"ET",n:"Äthiopien"},
  {c:"TZ",n:"Tansania"},{c:"UG",n:"Uganda"},{c:"AO",n:"Angola"},
  {c:"CD",n:"DR Kongo"},{c:"IR",n:"Iran"},{c:"IQ",n:"Irak"},
  {c:"SY",n:"Syrien"},{c:"LB",n:"Libanon"},{c:"JO",n:"Jordanien"},
  {c:"SA",n:"Saudi-Arabien"},{c:"AE",n:"Vereinigte Arab. Emirate"},
  {c:"IL",n:"Israel"},{c:"PS",n:"Palästina"},{c:"AF",n:"Afghanistan"},
  {c:"PK",n:"Pakistan"},{c:"IN",n:"Indien"},{c:"BD",n:"Bangladesch"},
  {c:"LK",n:"Sri Lanka"},{c:"NP",n:"Nepal"},{c:"CN",n:"China"},
  {c:"JP",n:"Japan"},{c:"KR",n:"Südkorea"},{c:"VN",n:"Vietnam"},
  {c:"TH",n:"Thailand"},{c:"PH",n:"Philippinen"},{c:"ID",n:"Indonesien"},
  {c:"MY",n:"Malaysia"},{c:"SG",n:"Singapur"},{c:"AU",n:"Australien"},
  {c:"NZ",n:"Neuseeland"},{c:"LI",n:"Liechtenstein"},{c:"MC",n:"Monaco"},
  {c:"SM",n:"San Marino"},{c:"MT",n:"Malta"},{c:"CY",n:"Zypern"},
].sort((a,b)=>a.n.localeCompare(b.n,"de"));

// Flagge aus ISO2-Code (Emoji)
// Ländername aus ISO2-Code
function getLandName(code){
  if(!code) return null;
  return LAENDER.find(l=>l.c===code.toUpperCase())?.n||code;
}

const ROLES = {
  administrator: {
    label:"Administrator", color:"var(--text)", bg:"#F5F5F5", icon:"settings",
    desc:"Vollzugriff: alle Module, Systemeinstellungen, Benutzerverwaltung",
    level:7
  },
  vorstand: {
    label:"Vorstand", color:"var(--text)", bg:"#F5F5F5", icon:"scale",
    desc:"Strategische Übersicht: alle Teams, Mitglieder lesen, Auswertungen — kein System, kein AHV",
    level:6
  },
  administration: {
    label:"Administration", color:"var(--text)", bg:"#F5F5F5", icon:"briefcase",
    desc:"Vereinsbüro: Stammdaten, Mitglieder, alle Teams, Exporte — kein System",
    level:5
  },
  funktionaer: {
    label:"Funktionär", color:"var(--text)", bg:"#F5F5F5", icon:"heart-handshake",
    desc:"Module + Teams gemäss zugewiesener Gruppe/Funktion",
    level:4
  },
  trainer: {
    label:"Trainer", color:"var(--text)", bg:"#F5F5F5", icon:"ball-football",
    desc:"Eigene Teams: Kader, Trainings, Anwesenheiten",
    level:3
  },
  spieler: {
    label:"Spieler", color:"var(--text)", bg:"#F5F5F5", icon:"target",
    desc:"Eigenes Team lesen: Spielplan, Termine, Helfereinsätze",
    level:2
  },
  eltern: {
    label:"Eltern", color:"var(--text)", bg:"#F5F5F5", icon:"user",
    desc:"Nur eigene Kinder: Termine, Anwesenheit, Abstimmungen",
    level:1
  },
};


/* ── Hilfsfunktionen ── */
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* -- DATA -- */

function RolleChip({rolle}){
  const colors={
    "Spieler":     {c:"#22C55E",bg:"#F0FDF4"},
    "Trainer":     {c:"#F97316",bg:"#FFF7ED"},
    "Assistent/in":{c:"#F97316",bg:"#FFF7ED"},
    "Goalietrainer":{c:"#F97316",bg:"#FFF7ED"},
    "Vorstand":    {c:"#8B5CF6",bg:"#F5F3FF"},
    "Kassier":     {c:"#8B5CF6",bg:"#F5F3FF"},
    "Materialwart":{c:"#3B82F6",bg:"#EFF6FF"},
    "Platzwart":   {c:"#3B82F6",bg:"#EFF6FF"},
    "Schiedsrichter":{c:"#EC4899",bg:"#FDF2F8"},
    "Elternteil":  {c:"#06B6D4",bg:"#ECFEFF"},
    "Ehrenmitglied":{c:"#f8de09",bg:"#FFFBEB"},
    "Passivmitglied":{c:"#9CA3AF",bg:"#F9FAFB"},
  };
  const s=colors[rolle]||{c:"#9CA3AF",bg:"#F9FAFB"};
  return <Chip text={rolle||"-"} color={s.c} bg={s.bg}/>;
}

function getFieldVisibility(role){
  const lvl = ROLES[role]?.level||0;
  return {
    showAhv:       lvl>=5 && role==="administration" || role==="administrator",
    showGebdat:    lvl>=3,   // ab trainer
    showAdresse:   lvl>=5,   // ab administration
    showTelefon:   lvl>=3,   // ab trainer
    showEmail:     lvl>=2,   // ab spieler (eigene)
    showPass:      lvl>=3,   // ab trainer
    showFairgateId:lvl>=5,   // ab administration
    showNotizen:   lvl>=5,   // ab administration
  };
}


export { LAENDER, getLandName, RolleChip, getFieldVisibility };
