import { useState, useEffect, useRef } from "react";

/* -- SUPABASE wird als Prop von App.jsx übergeben (kein Import hier) -- */
let supabase = null; // wird via setSupabaseClient() gesetzt

/* -- FARBEN -- */
const R="#C8102E",RL="#FEF2F2",BK="#1A1A1A",GR="#F5F5F3",GB="#E0DED8",BL="#2563EB",GN="#059669",AM="#D97706";
/* localStorage polyfill voor window.storage */
if(typeof window!=="undefined"&&!window.storage){
  window.storage={
    get:async(k)=>{const v=localStorage.getItem(k);return v?{value:v}:null;},
    set:async(k,v)=>{localStorage.setItem(k,v);return{key:k,value:v};},
    delete:async(k)=>{localStorage.removeItem(k);return{key:k,deleted:true};},
    list:async(prefix="")=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix));return{keys};},
  };
}

function useIsMobile(){const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1200);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w<680;}

/* Reusable Modal/BottomSheet - desktop: centered modal, mobile: slides up from bottom */
function ModalOrSheet({open,onClose,children,maxWidth=660}){
  const isMobile=useIsMobile();
  if(!open) return null;
  if(isMobile) return(
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}}/>
      {/* Sheet */}
      <div style={{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#D1D5DB"}}/>
        </div>
        <div style={{overflowY:"auto",flex:1,WebkitOverflowScrolling:"touch"}}>
          {children}
        </div>
      </div>
    </div>
  );
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:"100%",maxWidth,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
        {children}
      </div>
    </div>
  );
}

/* -- ROLLEN-DEFINITIONEN -- */
const ROLES = {
  administrator: { label:"Administrator",    color:"#f8de09", icon:"ti-settings", desc:"Vollzugriff auf alle Module, Einstellungen und Systemfunktionen" },
  administration:{ label:"Administration",   color:"#f8de09", icon:"ti-briefcase", desc:"Stammdaten, Datenqualität, Garderoben, Auswertungen, Exporte" },
  funktionaer:   { label:"Funktionär/Vorstand", color:"#f8de09", icon:"≡", desc:"Teams, Auswertungen, Vereinsbusse, Material gemäss Aufschaltung" },
  trainer:       { label:"Trainer",          color:"#f8de09", icon:"ti-ball-football", desc:"Eigene Teams, Trainings, Anwesenheiten, Material, Vereinsbus" },
  spieler:       { label:"Spieler",          color:"#f8de09", icon:"▶", desc:"Eigenes Team, Spielplan, Tabelle, Anwesenheit, Helfereinsätze" },
  eltern:        { label:"Eltern",           color:"#f8de09", icon:"ti-user", desc:"Daten der Kinder, Termine, Abstimmungen, Helfereinsätze" },
};
/* -- SAFE ROLES LOOKUP -- */
function getRole(role){
  // Normalize: funktionär -> funktionaer etc.
  const norm = (role||"spieler").toLowerCase()
    .replace("ä","ae").replace("ö","oe").replace("ü","ue");
  return ROLES[norm] || getRole(role) || ROLES.spieler;
}


/* -- NAV PRO ROLLE (gemäss Kap. 27) -- */
const NAV_BY_ROLE = {
  administrator: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"members",            icon:"ti-users",            label:"Mitglieder"},
    {key:"team",               icon:"ti-ball-football",    label:"Teams"},
    {key:"training",           icon:"ti-calendar",         label:"Trainingsplan"},
    {key:"schedule",           icon:"ti-flag",             label:"Spielplan/FVRZ"},
    {key:"attendance_central", icon:"ti-chart-bar",        label:"Anwesenheitsstatistik"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"ti-bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"ti-package",          label:"Material"},
    {key:"lockers",            icon:"ti-door-exit",        label:"Garderoben"},
    {key:"media",              icon:"ti-speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"ti-book",             label:"Wiki"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
    {key:"portal",             icon:"ti-settings",         label:"Portalverwaltung"},
  ],
  administration: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"members",            icon:"ti-users",            label:"Mitglieder"},
    {key:"team",               icon:"ti-ball-football",    label:"Teams"},
    {key:"training",           icon:"ti-calendar",         label:"Trainingsplan"},
    {key:"schedule",           icon:"ti-flag",             label:"Spielplan"},
    {key:"attendance_central", icon:"ti-chart-bar",        label:"Anwesenheitsstatistik"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"ti-bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"ti-package",          label:"Material"},
    {key:"lockers",            icon:"ti-door-exit",        label:"Garderoben"},
    {key:"media",              icon:"ti-speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"ti-book",             label:"Wiki"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
    {key:"portal",             icon:"ti-settings",         label:"Portalverwaltung"},
  ],
  funktionaer: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"members",            icon:"ti-users",            label:"Mitglieder"},
    {key:"team",               icon:"ti-ball-football",    label:"Teams"},
    {key:"training",           icon:"ti-calendar",         label:"Trainingsplan"},
    {key:"attendance_central", icon:"ti-chart-bar",        label:"Anwesenheitsstatistik"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"ti-bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"ti-package",          label:"Material"},
    {key:"lockers",            icon:"ti-door-exit",        label:"Garderoben"},
    {key:"media",              icon:"ti-speakerphone",     label:"Medien & Berichte"},
    {key:"wiki",               icon:"ti-book",             label:"Wiki"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
  ],
  trainer: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"team",               icon:"ti-ball-football",    label:"Mein Team"},
    {key:"training",           icon:"ti-calendar",         label:"Trainingsplan"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"buses",              icon:"ti-bus",              label:"Vereinsbusse"},
    {key:"material",           icon:"ti-package",          label:"Material"},
    {key:"lockers",            icon:"ti-door-exit",        label:"Garderoben"},
    {key:"media",              icon:"ti-speakerphone",     label:"Medien & Berichte"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"wiki",               icon:"ti-book",             label:"Wiki"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
  ],
  spieler: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"team",               icon:"ti-ball-football",    label:"Mein Team"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
    {key:"profile",            icon:"ti-user",             label:"Mein Profil"},
  ],
  eltern: [
    {key:"dashboard",          icon:"ti-layout-dashboard", label:"Home"},
    {key:"news",               icon:"ti-news",             label:"News"},
    {key:"team",               icon:"ti-ball-football",    label:"Mein Kind"},
    {key:"events",             icon:"ti-calendar-event",   label:"Termine"},
    {key:"helpers",            icon:"ti-heart-handshake",  label:"Helfereinsätze"},
    {key:"docs",               icon:"ti-file-text",        label:"Dokumente"},
    {key:"profile",            icon:"ti-user",             label:"Profil / Daten prüfen"},
  ],
};

/* -- FELDSICHTBARKEIT (Kap. 6.1) -- */
/* Global nav target - allows Dashboard to set initial tab on TeamView */
const NAV_TARGET={tab:null,filter:null,kindTeam:null,openEvId:null,selectedSpiel:null};
const FIELD_VIS = {
  administrator: ["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","pass","parent1","parent2","js","fairgate"],
  administration:["dob","nat","heimatort","ahv","pass","street","plz","city","canton","country","email","tel","parent1","parent2","js","fairgate"],
  funktionaer:   ["dob","pass","street","plz","city","email","tel"],
  trainer:       ["dob","nat","heimatort","pass","street","plz","city","email","tel","parent1","parent2"],
  spieler:       ["dob","pass","street","plz","city","email","tel"],
  eltern:        ["dob","pass","street","plz","city","email","tel"],
};

/* -- DATA -- */
const ROSTER=[
  {id:1,
   lastName:"Meier",     firstName:"Luca",   pos:"ST", dob:"12.03.2012", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.1234.5678.90", pass:"A-1234", js:"JS-4421", fairgate:"FG-10042",
   street:"Seestrasse 12", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.meier@mail.com", tel:"+41 79 123 45 67",
   teams:["Cc-Junioren"],
   p1Last:"Meier",   p1First:"Anna",  p1Email:"a.meier@mail.com",   p1Tel:"+41 79 888 11 22",
   p2Last:"Meier",   p2First:"Peter", p2Email:"p.meier@mail.com",   p2Tel:"+41 79 888 11 23"},
  {id:2,
   lastName:"Keller",    firstName:"Noah",   pos:"ZM", dob:"05.07.2012", nat:"CH", heimatort:"Meilen",
   ahv:"756.2345.6789.01", pass:"A-2345", js:"JS-4422", fairgate:"FG-10043",
   street:"Bergweg 3",    plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"n.keller@mail.com", tel:"+41 79 234 56 78",
   teams:["Cc-Junioren","A-Junioren"],
   p1Last:"Keller",  p1First:"Beat",  p1Email:"b.keller@mail.com",  p1Tel:"+41 79 777 22 33",
   p2Last:"Keller",  p2First:"Rita",  p2Email:"r.keller@mail.com",  p2Tel:"+41 79 777 22 34"},
  {id:3,
   lastName:"Bauer",     firstName:"Finn",   pos:"RM", dob:"22.11.2011", nat:"DE", heimatort:"Meilen",
   ahv:"756.3456.7890.12", pass:"A-3456", js:"JS-4423", fairgate:"FG-10044",
   street:"Dorfstrasse 7",plz:"8706", city:"Meilen",     canton:"ZH", country:"Schweiz",
   email:"f.bauer@mail.com", tel:"+41 79 345 67 89",
   teams:["Cc-Junioren"],
   p1Last:"Bauer",   p1First:"Petra", p1Email:"p.bauer@mail.com",   p1Tel:"+41 79 666 33 44",
   p2Last:"Bauer",   p2First:"Klaus", p2Email:"k.bauer@mail.com",   p2Tel:"+41 79 666 33 45"},
  {id:4,
   lastName:"Wolf",      firstName:"Elias",  pos:"TW", dob:"08.01.2012", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.4567.8901.23", pass:"A-4567", js:"JS-4424", fairgate:"FG-10045",
   street:"Rebgasse 5",   plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"e.wolf@mail.com", tel:"+41 79 456 78 90",
   teams:["Cc-Junioren"],
   p1Last:"Wolf",    p1First:"Kurt",  p1Email:"k.wolf@mail.com",    p1Tel:"+41 79 555 44 55",
   p2Last:"Wolf",    p2First:"Sonja", p2Email:"s.wolf@mail.com",    p2Tel:"+41 79 555 44 56"},
  {id:5,
   lastName:"Schmid",    firstName:"Jan",    pos:"IV", dob:"30.06.2012", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.5678.9012.34", pass:"A-5678", js:"JS-4425", fairgate:"FG-10046",
   street:"Hauptstrasse 18",plz:"8706", city:"Meilen",  canton:"ZH", country:"Schweiz",
   email:"j.schmid@mail.com", tel:"+41 79 567 89 01",
   teams:["Cc-Junioren"],
   p1Last:"Schmid",  p1First:"Monika",p1Email:"m.schmid@mail.com",  p1Tel:"+41 79 444 55 66",
   p2Last:"Schmid",  p2First:"Thomas",p2Email:"t.schmid@mail.com",  p2Tel:"+41 79 444 55 67"},
  {id:6,
   lastName:"Fischer",   firstName:"Leon",   pos:"IV", dob:"14.09.2011", nat:"AT", heimatort:"Wien",
   ahv:"756.6789.0123.45", pass:"A-6789", js:"JS-4426", fairgate:"FG-10047",
   street:"Im Grund 2",   plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.fischer@mail.com", tel:"+41 79 678 90 12",
   teams:["Cc-Junioren","A-Junioren"],
   p1Last:"Fischer", p1First:"Hans",  p1Email:"h.fischer@mail.com", p1Tel:"+41 79 333 66 77",
   p2Last:"Fischer", p2First:"Gabi",  p2Email:"g.fischer@mail.com", p2Tel:"+41 79 333 66 78"},
  {id:7,
   lastName:"Keller",     firstName:"Tim",   pos:"V", dob:"08.04.1999", nat:"CH", heimatort:"Feldbach",
   ahv:"756.4582.4811.74", pass:"A-1434", js:"", fairgate:"FG-10007",
   street:"Lindenstrasse 6", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"t.keller@mail.com", tel:"+41 79 704 64 14",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:8,
   lastName:"Graf",     firstName:"Sebastian",   pos:"RM", dob:"08.07.2003", nat:"CH", heimatort:"Feldbach",
   ahv:"756.5552.3547.37", pass:"A-6514", js:"", fairgate:"FG-10008",
   street:"Widenstrasse 1", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"s.graf@mail.com", tel:"+41 79 877 30 99",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:9,
   lastName:"Weber",     firstName:"Nico",   pos:"RM", dob:"28.06.1996", nat:"CH", heimatort:"Uetikon",
   ahv:"756.2291.5803.90", pass:"A-6925", js:"", fairgate:"FG-10009",
   street:"Widenstrasse 3", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"n.weber@mail.com", tel:"+41 79 847 68 78",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:10,
   lastName:"Graf",     firstName:"Alexander",   pos:"LV", dob:"22.01.1996", nat:"CH", heimatort:"Feldbach",
   ahv:"756.6977.3664.57", pass:"A-6820", js:"", fairgate:"FG-10010",
   street:"Dorfstrasse 15", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"a.graf@mail.com", tel:"+41 79 987 22 58",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:11,
   lastName:"Güntert",     firstName:"Kevin",   pos:"LM", dob:"21.10.1996", nat:"CH", heimatort:"Stäfa",
   ahv:"756.6313.1916.39", pass:"A-1525", js:"", fairgate:"FG-10011",
   street:"Schulstrasse 11", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"k.güntert@mail.com", tel:"+41 79 573 58 44",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:12,
   lastName:"Suter",     firstName:"David",   pos:"MF", dob:"19.04.1996", nat:"ES", heimatort:"Stäfa",
   ahv:"756.3287.5040.81", pass:"A-9830", js:"", fairgate:"FG-10012",
   street:"Kirchgasse 32", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"d.suter@mail.com", tel:"+41 79 505 92 68",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:13,
   lastName:"Gloor",     firstName:"Stefan",   pos:"RV", dob:"13.10.2001", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.3621.7916.86", pass:"A-2040", js:"", fairgate:"FG-10013",
   street:"Rebgasse 33", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"s.gloor@mail.com", tel:"+41 79 605 21 16",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:14,
   lastName:"Künzli",     firstName:"Raphael",   pos:"TW", dob:"09.09.2002", nat:"DE", heimatort:"Erlenbach",
   ahv:"756.5808.8123.30", pass:"A-8433", js:"", fairgate:"FG-10014",
   street:"Hauptstrasse 35", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"r.künzli@mail.com", tel:"+41 79 868 44 92",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:15,
   lastName:"Wirz",     firstName:"Luca",   pos:"LM", dob:"25.09.1999", nat:"CH", heimatort:"Feldbach",
   ahv:"756.3504.7126.30", pass:"A-9837", js:"", fairgate:"FG-10015",
   street:"Hauptstrasse 20", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"l.wirz@mail.com", tel:"+41 79 961 91 74",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:16,
   lastName:"Müller",     firstName:"Christian",   pos:"MF", dob:"01.08.2000", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.8962.2133.78", pass:"A-3060", js:"", fairgate:"FG-10016",
   street:"Rietstrasse 16", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"c.müller@mail.com", tel:"+41 79 159 40 82",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:17,
   lastName:"Güntert",     firstName:"Sven",   pos:"RM", dob:"09.03.2003", nat:"DE", heimatort:"Zollikon",
   ahv:"756.7118.8177.76", pass:"A-8397", js:"", fairgate:"FG-10017",
   street:"Forchstrasse 14", plz:"8702", city:"Zollikon", canton:"ZH", country:"Schweiz",
   email:"s.güntert@mail.com", tel:"+41 79 652 98 35",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:18,
   lastName:"Steiner",     firstName:"Tim",   pos:"LM", dob:"01.06.1996", nat:"AT", heimatort:"Männedorf",
   ahv:"756.2104.1514.52", pass:"A-2160", js:"", fairgate:"FG-10018",
   street:"Schulstrasse 38", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"t.steiner@mail.com", tel:"+41 79 325 10 19",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:19,
   lastName:"Steiner",     firstName:"Dominik",   pos:"RM", dob:"18.04.2002", nat:"CH", heimatort:"Stäfa",
   ahv:"756.2588.8062.55", pass:"A-7939", js:"", fairgate:"FG-10019",
   street:"Mühleweg 16", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"d.steiner@mail.com", tel:"+41 79 903 70 62",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:20,
   lastName:"Aebischer",     firstName:"Dario",   pos:"V", dob:"21.11.1995", nat:"IT", heimatort:"Seegräben",
   ahv:"756.4116.9786.67", pass:"A-3296", js:"", fairgate:"FG-10020",
   street:"Bergweg 26", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"d.aebischer@mail.com", tel:"+41 79 845 53 23",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:21,
   lastName:"Koch",     firstName:"Noel",   pos:"ZM", dob:"28.04.2002", nat:"CH", heimatort:"Stäfa",
   ahv:"756.4872.3724.62", pass:"A-8956", js:"", fairgate:"FG-10021",
   street:"Lindenstrasse 7", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"n.koch@mail.com", tel:"+41 79 151 93 79",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:22,
   lastName:"Roth",     firstName:"Philipp",   pos:"TW", dob:"06.01.2001", nat:"CH", heimatort:"Seegräben",
   ahv:"756.8973.3536.34", pass:"A-5861", js:"", fairgate:"FG-10022",
   street:"Winkelstrasse 17", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"p.roth@mail.com", tel:"+41 79 902 68 46",
   teams:["1. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:23,
   lastName:"Fischer",     firstName:"Kevin",   pos:"MF", dob:"02.09.2004", nat:"ES", heimatort:"Erlenbach",
   ahv:"756.1931.9320.20", pass:"A-4044", js:"", fairgate:"FG-10023",
   street:"Bergweg 4", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"k.fischer@mail.com", tel:"+41 79 698 71 74",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:24,
   lastName:"Lehmann",     firstName:"Jan",   pos:"RM", dob:"13.04.2003", nat:"CH", heimatort:"Meilen",
   ahv:"756.9565.6183.43", pass:"A-4346", js:"", fairgate:"FG-10024",
   street:"Schulstrasse 38", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"j.lehmann@mail.com", tel:"+41 79 708 15 89",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:25,
   lastName:"Steiner",     firstName:"David",   pos:"LV", dob:"22.03.1999", nat:"IT", heimatort:"Stäfa",
   ahv:"756.2638.2200.78", pass:"A-4492", js:"", fairgate:"FG-10025",
   street:"Rosenweg 21", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"d.steiner@mail.com", tel:"+41 79 869 19 11",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:26,
   lastName:"Moser",     firstName:"Dominik",   pos:"MF", dob:"03.06.2007", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.1128.5905.94", pass:"A-2697", js:"", fairgate:"FG-10026",
   street:"Rietstrasse 11", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"d.moser@mail.com", tel:"+41 79 548 79 48",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:27,
   lastName:"Moser",     firstName:"Sven",   pos:"IV", dob:"24.02.2007", nat:"DE", heimatort:"Meilen",
   ahv:"756.9280.9004.42", pass:"A-1832", js:"", fairgate:"FG-10027",
   street:"Widenstrasse 19", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"s.moser@mail.com", tel:"+41 79 719 36 53",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:28,
   lastName:"Odermatt",     firstName:"Leon",   pos:"MF", dob:"02.05.2006", nat:"CH", heimatort:"Uetikon",
   ahv:"756.1158.2832.19", pass:"A-3442", js:"", fairgate:"FG-10028",
   street:"Rebgasse 17", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"l.odermatt@mail.com", tel:"+41 79 265 66 80",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:29,
   lastName:"Meier",     firstName:"Thomas",   pos:"DM", dob:"18.10.1998", nat:"CH", heimatort:"Seegräben",
   ahv:"756.5088.2684.55", pass:"A-7658", js:"", fairgate:"FG-10029",
   street:"Rebgasse 3", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"t.meier@mail.com", tel:"+41 79 415 56 15",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:30,
   lastName:"Gloor",     firstName:"Felix",   pos:"IV", dob:"28.04.2007", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.3608.2771.58", pass:"A-1634", js:"", fairgate:"FG-10030",
   street:"Forchstrasse 2", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"f.gloor@mail.com", tel:"+41 79 283 52 62",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:31,
   lastName:"Zimmermann",     firstName:"Philipp",   pos:"RV", dob:"12.08.2006", nat:"CH", heimatort:"Männedorf",
   ahv:"756.2137.5573.54", pass:"A-9346", js:"", fairgate:"FG-10031",
   street:"Schulstrasse 2", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"p.zimmermann@mail.com", tel:"+41 79 775 34 61",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:32,
   lastName:"Herrmann",     firstName:"Cedric",   pos:"LV", dob:"01.06.2001", nat:"CH", heimatort:"Seegräben",
   ahv:"756.6663.6139.65", pass:"A-9379", js:"", fairgate:"FG-10032",
   street:"Im Grund 38", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"c.herrmann@mail.com", tel:"+41 79 371 14 23",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:33,
   lastName:"Künzli",     firstName:"Tim",   pos:"DM", dob:"02.05.1996", nat:"ES", heimatort:"Erlenbach",
   ahv:"756.8066.2146.95", pass:"A-6409", js:"", fairgate:"FG-10033",
   street:"Seestrasse 34", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"t.künzli@mail.com", tel:"+41 79 925 78 97",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:34,
   lastName:"Brunner",     firstName:"Felix",   pos:"LM", dob:"24.02.2006", nat:"CH", heimatort:"Uerikon",
   ahv:"756.3085.4143.63", pass:"A-7211", js:"", fairgate:"FG-10034",
   street:"Rietstrasse 27", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"f.brunner@mail.com", tel:"+41 79 434 61 99",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:35,
   lastName:"Stadler",     firstName:"Simon",   pos:"TW", dob:"18.07.1997", nat:"FR", heimatort:"Erlenbach",
   ahv:"756.8618.8238.66", pass:"A-4501", js:"", fairgate:"FG-10035",
   street:"Rietstrasse 19", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"s.stadler@mail.com", tel:"+41 79 315 65 84",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:36,
   lastName:"Zbinden",     firstName:"Dominik",   pos:"V", dob:"06.12.2007", nat:"IT", heimatort:"Oetwil",
   ahv:"756.4848.6085.38", pass:"A-4262", js:"", fairgate:"FG-10036",
   street:"Rietstrasse 33", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"d.zbinden@mail.com", tel:"+41 79 779 91 89",
   teams:["2. Mannschaft Herren"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:37,
   lastName:"Keller",     firstName:"Laura",   pos:"V", dob:"20.08.1995", nat:"FR", heimatort:"Herrliberg",
   ahv:"756.7547.4997.28", pass:"A-1090", js:"", fairgate:"FG-10037",
   street:"Rosenweg 27", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.keller@mail.com", tel:"+41 79 744 83 34",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:38,
   lastName:"Brunschweiger",     firstName:"Lisa",   pos:"LM", dob:"26.03.1995", nat:"ES", heimatort:"Uetikon",
   ahv:"756.8612.9702.81", pass:"A-6198", js:"", fairgate:"FG-10038",
   street:"Rosenweg 4", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"l.brunschweiger@mail.com", tel:"+41 79 670 41 25",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:39,
   lastName:"Stadler",     firstName:"Petra",   pos:"LM", dob:"14.09.2003", nat:"FR", heimatort:"Seegräben",
   ahv:"756.5543.9540.72", pass:"A-4919", js:"", fairgate:"FG-10039",
   street:"Rosenweg 11", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"p.stadler@mail.com", tel:"+41 79 861 70 67",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:40,
   lastName:"Nydegger",     firstName:"Hannah",   pos:"MF", dob:"08.05.2003", nat:"CH", heimatort:"Meilen",
   ahv:"756.3503.4505.18", pass:"A-7797", js:"", fairgate:"FG-10040",
   street:"Oberdorfstrasse 35", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"h.nydegger@mail.com", tel:"+41 79 182 27 29",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:41,
   lastName:"Wenger",     firstName:"Barbara",   pos:"DM", dob:"02.07.1999", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.1096.6763.48", pass:"A-7389", js:"", fairgate:"FG-10041",
   street:"Winkelstrasse 38", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"b.wenger@mail.com", tel:"+41 79 812 12 83",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:42,
   lastName:"Loosli",     firstName:"Barbara",   pos:"RV", dob:"26.09.2003", nat:"AT", heimatort:"Feldbach",
   ahv:"756.6507.7624.31", pass:"A-8657", js:"", fairgate:"FG-10042",
   street:"Mühleweg 15", plz:"8714", city:"Feldbach", canton:"ZH", country:"Schweiz",
   email:"b.loosli@mail.com", tel:"+41 79 379 65 72",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:43,
   lastName:"Stadler",     firstName:"Julia",   pos:"ST", dob:"19.07.1992", nat:"AT", heimatort:"Küsnacht",
   ahv:"756.1823.5262.58", pass:"A-6363", js:"", fairgate:"FG-10043",
   street:"Seestrasse 6", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"j.stadler@mail.com", tel:"+41 79 758 64 27",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:44,
   lastName:"Aebischer",     firstName:"Nathalie",   pos:"DM", dob:"09.07.1997", nat:"PT", heimatort:"Hombrechtikon",
   ahv:"756.4673.2124.93", pass:"A-1659", js:"", fairgate:"FG-10044",
   street:"Widenstrasse 6", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"n.aebischer@mail.com", tel:"+41 79 581 12 79",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:45,
   lastName:"Steiner",     firstName:"Emma",   pos:"RV", dob:"20.01.2005", nat:"CH", heimatort:"Männedorf",
   ahv:"756.5198.7043.31", pass:"A-2876", js:"", fairgate:"FG-10045",
   street:"Rebgasse 31", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"e.steiner@mail.com", tel:"+41 79 785 24 82",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:46,
   lastName:"Bucher",     firstName:"Sandra",   pos:"ST", dob:"10.01.2001", nat:"AT", heimatort:"Meilen",
   ahv:"756.2669.5941.97", pass:"A-2983", js:"", fairgate:"FG-10046",
   street:"Winkelstrasse 26", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"s.bucher@mail.com", tel:"+41 79 832 35 19",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:47,
   lastName:"Meier",     firstName:"Jasmin",   pos:"V", dob:"22.07.2000", nat:"CH", heimatort:"Hombrechtikon",
   ahv:"756.6934.8532.29", pass:"A-8135", js:"", fairgate:"FG-10047",
   street:"Gartenstrasse 22", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"j.meier@mail.com", tel:"+41 79 112 63 72",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:48,
   lastName:"Wirz",     firstName:"Nicole",   pos:"LM", dob:"20.05.2002", nat:"PT", heimatort:"Küsnacht",
   ahv:"756.2419.5569.67", pass:"A-4995", js:"", fairgate:"FG-10048",
   street:"Mühleweg 30", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"n.wirz@mail.com", tel:"+41 79 546 85 44",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:49,
   lastName:"Fuchs",     firstName:"Manuela",   pos:"ZM", dob:"11.07.2002", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.5581.5526.81", pass:"A-1166", js:"", fairgate:"FG-10049",
   street:"Oberdorfstrasse 12", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"m.fuchs@mail.com", tel:"+41 79 599 37 55",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:50,
   lastName:"Graf",     firstName:"Noëlle",   pos:"LM", dob:"14.12.1995", nat:"CH", heimatort:"Meilen",
   ahv:"756.5820.4630.61", pass:"A-4986", js:"", fairgate:"FG-10050",
   street:"Schulstrasse 31", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"n.graf@mail.com", tel:"+41 79 761 72 67",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:51,
   lastName:"Güntert",     firstName:"Vera",   pos:"MF", dob:"18.08.1997", nat:"DE", heimatort:"Erlenbach",
   ahv:"756.6023.5118.39", pass:"A-2976", js:"", fairgate:"FG-10051",
   street:"Forchstrasse 36", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"v.güntert@mail.com", tel:"+41 79 438 55 99",
   teams:["1. Mannschaft Frauen"],
   p1Last:"",   p1First:"",  p1Email:"",   p1Tel:"",
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""},
  {id:52,
   lastName:"Brunner",     firstName:"Patrick",   pos:"ZM", dob:"07.04.2009", nat:"ES", heimatort:"Meilen",
   ahv:"756.4180.5853.39", pass:"A-6912", js:"JS-4367", fairgate:"FG-10052",
   street:"Widenstrasse 38", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"p.brunner@mail.com", tel:"+41 79 878 77 86",
   teams:["Ba-Junioren"],
   p1Last:"Brunner",   p1First:"Andreas",  p1Email:"a.brunner@mail.com",   p1Tel:"+41 79 409 11 78",
   p2Last:"Brunner",   p2First:"Lisa",  p2Email:"l.brunner@mail.com",   p2Tel:"+41 79 229 45 15"},
  {id:53,
   lastName:"Portmann",     firstName:"Elias",   pos:"ZM", dob:"28.11.2009", nat:"PT", heimatort:"Stäfa",
   ahv:"756.6582.4020.16", pass:"A-5136", js:"JS-5927", fairgate:"FG-10053",
   street:"Hauptstrasse 1", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"e.portmann@mail.com", tel:"+41 79 687 46 70",
   teams:["Ba-Junioren"],
   p1Last:"Portmann",   p1First:"Philipp",  p1Email:"p.portmann@mail.com",   p1Tel:"+41 79 982 71 24",
   p2Last:"Portmann",   p2First:"Petra",  p2Email:"p.portmann@mail.com",   p2Tel:"+41 79 941 18 61"},
  {id:54,
   lastName:"Schmid",     firstName:"Julian",   pos:"RM", dob:"05.03.2009", nat:"PT", heimatort:"Erlenbach",
   ahv:"756.4697.9561.58", pass:"A-8381", js:"JS-5860", fairgate:"FG-10054",
   street:"Rietstrasse 6", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"j.schmid@mail.com", tel:"+41 79 354 25 81",
   teams:["Ba-Junioren"],
   p1Last:"Schmid",   p1First:"Dario",  p1Email:"d.schmid@mail.com",   p1Tel:"+41 79 553 48 85",
   p2Last:"Schmid",   p2First:"Nadine",  p2Email:"n.schmid@mail.com",   p2Tel:"+41 79 539 49 82"},
  {id:55,
   lastName:"Fischer",     firstName:"Felix",   pos:"LV", dob:"21.04.2009", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.1043.7693.67", pass:"A-8699", js:"JS-4596", fairgate:"FG-10055",
   street:"Dorfstrasse 11", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"f.fischer@mail.com", tel:"+41 79 345 32 80",
   teams:["Ba-Junioren"],
   p1Last:"Fischer",   p1First:"Jan",  p1Email:"j.fischer@mail.com",   p1Tel:"+41 79 133 39 46",
   p2Last:"Fischer",   p2First:"Sandra",  p2Email:"s.fischer@mail.com",   p2Tel:"+41 79 823 46 99"},
  {id:56,
   lastName:"Schmid",     firstName:"Joel",   pos:"ST", dob:"26.05.2009", nat:"PT", heimatort:"Uerikon",
   ahv:"756.3330.2169.17", pass:"A-3718", js:"JS-5623", fairgate:"FG-10056",
   street:"Kirchgasse 28", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"j.schmid@mail.com", tel:"+41 79 217 79 38",
   teams:["Ba-Junioren"],
   p1Last:"Schmid",   p1First:"Marco",  p1Email:"m.schmid@mail.com",   p1Tel:"+41 79 414 86 82",
   p2Last:"Schmid",   p2First:"Hannah",  p2Email:"h.schmid@mail.com",   p2Tel:"+41 79 395 66 25"},
  {id:57,
   lastName:"Egli",     firstName:"Joel",   pos:"ZM", dob:"17.05.2010", nat:"DE", heimatort:"Stäfa",
   ahv:"756.5102.1423.21", pass:"A-4750", js:"JS-5969", fairgate:"FG-10057",
   street:"Rosenweg 6", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"j.egli@mail.com", tel:"+41 79 712 15 65",
   teams:["Ba-Junioren"],
   p1Last:"Egli",   p1First:"David",  p1Email:"d.egli@mail.com",   p1Tel:"+41 79 790 83 85",
   p2Last:"Egli",   p2First:"Nadine",  p2Email:"n.egli@mail.com",   p2Tel:"+41 79 121 96 44"},
  {id:58,
   lastName:"Meier",     firstName:"Alexander",   pos:"ZM", dob:"17.08.2009", nat:"IT", heimatort:"Oetwil",
   ahv:"756.8700.6700.62", pass:"A-6460", js:"JS-4657", fairgate:"FG-10058",
   street:"Widenstrasse 12", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"a.meier@mail.com", tel:"+41 79 699 65 91",
   teams:["Ba-Junioren"],
   p1Last:"Meier",   p1First:"Julian",  p1Email:"j.meier@mail.com",   p1Tel:"+41 79 786 23 30",
   p2Last:"Meier",   p2First:"Sarah",  p2Email:"s.meier@mail.com",   p2Tel:"+41 79 437 62 98"},
  {id:59,
   lastName:"Frei",     firstName:"Julian",   pos:"V", dob:"02.09.2010", nat:"CH", heimatort:"Uerikon",
   ahv:"756.9889.8569.62", pass:"A-1888", js:"JS-4384", fairgate:"FG-10059",
   street:"Oberdorfstrasse 17", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"j.frei@mail.com", tel:"+41 79 431 24 61",
   teams:["Ba-Junioren"],
   p1Last:"Frei",   p1First:"Dominik",  p1Email:"d.frei@mail.com",   p1Tel:"+41 79 630 56 89",
   p2Last:"Frei",   p2First:"Lara",  p2Email:"l.frei@mail.com",   p2Tel:"+41 79 874 73 90"},
  {id:60,
   lastName:"Haas",     firstName:"Leandro",   pos:"LV", dob:"18.05.2009", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.3594.6091.80", pass:"A-1224", js:"JS-5131", fairgate:"FG-10060",
   street:"Rosenweg 32", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.haas@mail.com", tel:"+41 79 224 13 90",
   teams:["Ba-Junioren"],
   p1Last:"Haas",   p1First:"Jonas",  p1Email:"j.haas@mail.com",   p1Tel:"+41 79 517 21 38",
   p2Last:"Haas",   p2First:"Alina",  p2Email:"a.haas@mail.com",   p2Tel:"+41 79 961 24 69"},
  {id:61,
   lastName:"Leutenegger",     firstName:"Tim",   pos:"LM", dob:"23.08.2009", nat:"CH", heimatort:"Seegräben",
   ahv:"756.3369.7284.34", pass:"A-9327", js:"JS-5528", fairgate:"FG-10061",
   street:"Widenstrasse 27", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"t.leutenegger@mail.com", tel:"+41 79 954 71 70",
   teams:["Ba-Junioren"],
   p1Last:"Leutenegger",   p1First:"Michael",  p1Email:"m.leutenegger@mail.com",   p1Tel:"+41 79 239 18 45",
   p2Last:"Leutenegger",   p2First:"Manuela",  p2Email:"m.leutenegger@mail.com",   p2Tel:"+41 79 891 63 53"},
  {id:62,
   lastName:"Lüthy",     firstName:"Dominik",   pos:"RM", dob:"24.05.2009", nat:"CH", heimatort:"Seegräben",
   ahv:"756.9903.7180.68", pass:"A-6272", js:"JS-5780", fairgate:"FG-10062",
   street:"Mühleweg 10", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"d.lüthy@mail.com", tel:"+41 79 557 78 71",
   teams:["Ba-Junioren"],
   p1Last:"Lüthy",   p1First:"Oliver",  p1Email:"o.lüthy@mail.com",   p1Tel:"+41 79 293 99 40",
   p2Last:"Lüthy",   p2First:"Sabrina",  p2Email:"s.lüthy@mail.com",   p2Tel:"+41 79 685 59 39"},
  {id:63,
   lastName:"Meier",     firstName:"Dario",   pos:"DM", dob:"26.12.2010", nat:"CH", heimatort:"Hombrechtikon",
   ahv:"756.2644.8213.22", pass:"A-9617", js:"JS-5864", fairgate:"FG-10063",
   street:"Rebgasse 32", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"d.meier@mail.com", tel:"+41 79 137 26 74",
   teams:["Ba-Junioren"],
   p1Last:"Meier",   p1First:"Maximilian",  p1Email:"m.meier@mail.com",   p1Tel:"+41 79 567 11 28",
   p2Last:"Meier",   p2First:"Sabrina",  p2Email:"s.meier@mail.com",   p2Tel:"+41 79 519 93 29"},
  {id:64,
   lastName:"Zbinden",     firstName:"Jan",   pos:"DM", dob:"20.06.2010", nat:"ES", heimatort:"Oetwil",
   ahv:"756.8994.9864.14", pass:"A-2121", js:"JS-4480", fairgate:"FG-10064",
   street:"Dorfstrasse 22", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"j.zbinden@mail.com", tel:"+41 79 972 96 78",
   teams:["Ba-Junioren"],
   p1Last:"Zbinden",   p1First:"Raphael",  p1Email:"r.zbinden@mail.com",   p1Tel:"+41 79 746 97 46",
   p2Last:"Zbinden",   p2First:"Monika",  p2Email:"m.zbinden@mail.com",   p2Tel:"+41 79 332 21 65"},
  {id:65,
   lastName:"Haas",     firstName:"Nico",   pos:"LV", dob:"06.08.2009", nat:"ES", heimatort:"Uerikon",
   ahv:"756.8056.3385.41", pass:"A-9702", js:"JS-4843", fairgate:"FG-10065",
   street:"Seestrasse 3", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"n.haas@mail.com", tel:"+41 79 432 17 47",
   teams:["Ba-Junioren"],
   p1Last:"Haas",   p1First:"Oliver",  p1Email:"o.haas@mail.com",   p1Tel:"+41 79 679 97 33",
   p2Last:"Haas",   p2First:"Silvia",  p2Email:"s.haas@mail.com",   p2Tel:"+41 79 274 32 20"},
  {id:66,
   lastName:"Künzli",     firstName:"Felix",   pos:"RV", dob:"19.08.2009", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.5712.9955.30", pass:"A-2210", js:"JS-4904", fairgate:"FG-10066",
   street:"Rosenweg 17", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"f.künzli@mail.com", tel:"+41 79 570 42 95",
   teams:["Bb-Junioren"],
   p1Last:"Künzli",   p1First:"Luca",  p1Email:"l.künzli@mail.com",   p1Tel:"+41 79 453 85 48",
   p2Last:"Künzli",   p2First:"Manuela",  p2Email:"m.künzli@mail.com",   p2Tel:"+41 79 754 64 98"},
  {id:67,
   lastName:"Aebischer",     firstName:"Stefan",   pos:"ZM", dob:"13.04.2010", nat:"FR", heimatort:"Seegräben",
   ahv:"756.5837.1359.94", pass:"A-7484", js:"JS-4562", fairgate:"FG-10067",
   street:"Hauptstrasse 16", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"s.aebischer@mail.com", tel:"+41 79 490 83 55",
   teams:["Bb-Junioren"],
   p1Last:"Aebischer",   p1First:"Alexander",  p1Email:"a.aebischer@mail.com",   p1Tel:"+41 79 108 82 97",
   p2Last:"Aebischer",   p2First:"Klara",  p2Email:"k.aebischer@mail.com",   p2Tel:"+41 79 896 16 87"},
  {id:68,
   lastName:"Lehmann",     firstName:"Tobias",   pos:"RM", dob:"21.04.2010", nat:"CH", heimatort:"Oetwil",
   ahv:"756.8222.1546.84", pass:"A-6977", js:"JS-5499", fairgate:"FG-10068",
   street:"Widenstrasse 9", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"t.lehmann@mail.com", tel:"+41 79 743 22 90",
   teams:["Bb-Junioren"],
   p1Last:"Lehmann",   p1First:"Finn",  p1Email:"f.lehmann@mail.com",   p1Tel:"+41 79 234 21 47",
   p2Last:"Lehmann",   p2First:"Vera",  p2Email:"v.lehmann@mail.com",   p2Tel:"+41 79 434 63 32"},
  {id:69,
   lastName:"Bauer",     firstName:"Patrick",   pos:"IV", dob:"17.09.2010", nat:"CH", heimatort:"Oetwil",
   ahv:"756.2233.3306.38", pass:"A-7511", js:"JS-5980", fairgate:"FG-10069",
   street:"Widenstrasse 31", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"p.bauer@mail.com", tel:"+41 79 925 47 53",
   teams:["Bb-Junioren"],
   p1Last:"Bauer",   p1First:"Tim",  p1Email:"t.bauer@mail.com",   p1Tel:"+41 79 966 81 56",
   p2Last:"Bauer",   p2First:"Manuela",  p2Email:"m.bauer@mail.com",   p2Tel:"+41 79 192 60 11"},
  {id:70,
   lastName:"Loosli",     firstName:"Stefan",   pos:"ST", dob:"22.06.2010", nat:"ES", heimatort:"Meilen",
   ahv:"756.8724.1410.89", pass:"A-6374", js:"JS-5874", fairgate:"FG-10070",
   street:"Widenstrasse 38", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"s.loosli@mail.com", tel:"+41 79 490 91 57",
   teams:["Bb-Junioren"],
   p1Last:"Loosli",   p1First:"Nico",  p1Email:"n.loosli@mail.com",   p1Tel:"+41 79 724 38 92",
   p2Last:"Loosli",   p2First:"Celine",  p2Email:"c.loosli@mail.com",   p2Tel:"+41 79 164 91 69"},
  {id:71,
   lastName:"Leutenegger",     firstName:"Lukas",   pos:"LV", dob:"02.03.2009", nat:"CH", heimatort:"Uetikon",
   ahv:"756.8432.7078.95", pass:"A-9850", js:"JS-4858", fairgate:"FG-10071",
   street:"Mühleweg 8", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"l.leutenegger@mail.com", tel:"+41 79 199 40 78",
   teams:["Bb-Junioren"],
   p1Last:"Leutenegger",   p1First:"Sven",  p1Email:"s.leutenegger@mail.com",   p1Tel:"+41 79 701 29 63",
   p2Last:"Leutenegger",   p2First:"Kathrin",  p2Email:"k.leutenegger@mail.com",   p2Tel:"+41 79 770 22 72"},
  {id:72,
   lastName:"Baumann",     firstName:"Felix",   pos:"ZM", dob:"12.12.2009", nat:"CH", heimatort:"Stäfa",
   ahv:"756.6876.1992.60", pass:"A-5520", js:"JS-4388", fairgate:"FG-10072",
   street:"Rosenweg 16", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"f.baumann@mail.com", tel:"+41 79 975 56 22",
   teams:["Bb-Junioren"],
   p1Last:"Baumann",   p1First:"Florian",  p1Email:"f.baumann@mail.com",   p1Tel:"+41 79 225 68 21",
   p2Last:"Baumann",   p2First:"Livia",  p2Email:"l.baumann@mail.com",   p2Tel:"+41 79 778 37 92"},
  {id:73,
   lastName:"Keller",     firstName:"Jonas",   pos:"RM", dob:"05.04.2010", nat:"PT", heimatort:"Herrliberg",
   ahv:"756.4817.6383.28", pass:"A-1046", js:"JS-4567", fairgate:"FG-10073",
   street:"Kirchgasse 5", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"j.keller@mail.com", tel:"+41 79 949 80 36",
   teams:["Bb-Junioren"],
   p1Last:"Keller",   p1First:"Maximilian",  p1Email:"m.keller@mail.com",   p1Tel:"+41 79 979 28 26",
   p2Last:"Keller",   p2First:"Nathalie",  p2Email:"n.keller@mail.com",   p2Tel:"+41 79 653 42 32"},
  {id:74,
   lastName:"Güntert",     firstName:"Tim",   pos:"RV", dob:"01.03.2009", nat:"CH", heimatort:"Seegräben",
   ahv:"756.9619.2862.18", pass:"A-8802", js:"JS-4918", fairgate:"FG-10074",
   street:"Oberdorfstrasse 2", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"t.güntert@mail.com", tel:"+41 79 278 43 16",
   teams:["Bb-Junioren"],
   p1Last:"Güntert",   p1First:"Sven",  p1Email:"s.güntert@mail.com",   p1Tel:"+41 79 896 56 75",
   p2Last:"Güntert",   p2First:"Barbara",  p2Email:"b.güntert@mail.com",   p2Tel:"+41 79 707 23 67"},
  {id:75,
   lastName:"Zimmermann",     firstName:"Dominik",   pos:"ST", dob:"26.12.2009", nat:"FR", heimatort:"Erlenbach",
   ahv:"756.7580.7984.97", pass:"A-2768", js:"JS-5004", fairgate:"FG-10075",
   street:"Gartenstrasse 20", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"d.zimmermann@mail.com", tel:"+41 79 569 92 13",
   teams:["Bb-Junioren"],
   p1Last:"Zimmermann",   p1First:"Elias",  p1Email:"e.zimmermann@mail.com",   p1Tel:"+41 79 829 66 19",
   p2Last:"Zimmermann",   p2First:"Isabelle",  p2Email:"i.zimmermann@mail.com",   p2Tel:"+41 79 182 51 87"},
  {id:76,
   lastName:"Schmid",     firstName:"Marco",   pos:"LM", dob:"21.10.2010", nat:"AT", heimatort:"Küsnacht",
   ahv:"756.8048.2624.99", pass:"A-2874", js:"JS-5746", fairgate:"FG-10076",
   street:"Oberdorfstrasse 25", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"m.schmid@mail.com", tel:"+41 79 711 77 47",
   teams:["Bb-Junioren"],
   p1Last:"Schmid",   p1First:"Joel",  p1Email:"j.schmid@mail.com",   p1Tel:"+41 79 770 93 80",
   p2Last:"Schmid",   p2First:"Amélie",  p2Email:"a.schmid@mail.com",   p2Tel:"+41 79 838 37 65"},
  {id:77,
   lastName:"Zimmermann",     firstName:"Leandro",   pos:"V", dob:"13.08.2010", nat:"CH", heimatort:"Uetikon",
   ahv:"756.8770.2099.21", pass:"A-2398", js:"JS-4190", fairgate:"FG-10077",
   street:"Oberdorfstrasse 28", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"l.zimmermann@mail.com", tel:"+41 79 420 95 42",
   teams:["Bb-Junioren"],
   p1Last:"Zimmermann",   p1First:"Florian",  p1Email:"f.zimmermann@mail.com",   p1Tel:"+41 79 542 22 57",
   p2Last:"Zimmermann",   p2First:"Laura",  p2Email:"l.zimmermann@mail.com",   p2Tel:"+41 79 931 26 81"},
  {id:78,
   lastName:"Hofmann",     firstName:"Elias",   pos:"MF", dob:"04.11.2010", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.9313.4485.29", pass:"A-8900", js:"JS-4459", fairgate:"FG-10078",
   street:"Forchstrasse 4", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"e.hofmann@mail.com", tel:"+41 79 394 86 49",
   teams:["Bb-Junioren"],
   p1Last:"Hofmann",   p1First:"Oliver",  p1Email:"o.hofmann@mail.com",   p1Tel:"+41 79 967 23 54",
   p2Last:"Hofmann",   p2First:"Lisa",  p2Email:"l.hofmann@mail.com",   p2Tel:"+41 79 965 81 57"},
  {id:79,
   lastName:"Haas",     firstName:"Tim",   pos:"RM", dob:"28.07.2009", nat:"DE", heimatort:"Stäfa",
   ahv:"756.3955.5477.99", pass:"A-6062", js:"JS-5887", fairgate:"FG-10079",
   street:"Lindenstrasse 2", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"t.haas@mail.com", tel:"+41 79 723 94 98",
   teams:["Bb-Junioren"],
   p1Last:"Haas",   p1First:"Daniel",  p1Email:"d.haas@mail.com",   p1Tel:"+41 79 447 54 10",
   p2Last:"Haas",   p2First:"Emma",  p2Email:"e.haas@mail.com",   p2Tel:"+41 79 285 28 82"},
  {id:80,
   lastName:"Schmid",     firstName:"Cedric",   pos:"RV", dob:"24.02.2010", nat:"DE", heimatort:"Küsnacht",
   ahv:"756.6314.2391.16", pass:"A-3549", js:"JS-4322", fairgate:"FG-10080",
   street:"Winkelstrasse 27", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"c.schmid@mail.com", tel:"+41 79 564 53 30",
   teams:["Ca-Junioren"],
   p1Last:"Schmid",   p1First:"Florian",  p1Email:"f.schmid@mail.com",   p1Tel:"+41 79 872 89 16",
   p2Last:"Schmid",   p2First:"Vera",  p2Email:"v.schmid@mail.com",   p2Tel:"+41 79 790 20 44"},
  {id:81,
   lastName:"Güntert",     firstName:"Leandro",   pos:"LV", dob:"15.10.2011", nat:"CH", heimatort:"Uetikon",
   ahv:"756.8972.9633.95", pass:"A-6053", js:"JS-4093", fairgate:"FG-10081",
   street:"Kirchgasse 33", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"l.güntert@mail.com", tel:"+41 79 216 54 65",
   teams:["Ca-Junioren"],
   p1Last:"Güntert",   p1First:"Tim",  p1Email:"t.güntert@mail.com",   p1Tel:"+41 79 325 60 86",
   p2Last:"Güntert",   p2First:"Klara",  p2Email:"k.güntert@mail.com",   p2Tel:"+41 79 156 10 36"},
  {id:82,
   lastName:"Roth",     firstName:"Lukas",   pos:"V", dob:"10.05.2010", nat:"CH", heimatort:"Oetwil",
   ahv:"756.9725.4770.74", pass:"A-6802", js:"JS-4147", fairgate:"FG-10082",
   street:"Seestrasse 32", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"l.roth@mail.com", tel:"+41 79 864 65 32",
   teams:["Ca-Junioren"],
   p1Last:"Roth",   p1First:"Sven",  p1Email:"s.roth@mail.com",   p1Tel:"+41 79 506 15 65",
   p2Last:"Roth",   p2First:"Kathrin",  p2Email:"k.roth@mail.com",   p2Tel:"+41 79 119 68 19"},
  {id:83,
   lastName:"Fuchs",     firstName:"David",   pos:"LV", dob:"21.12.2011", nat:"CH", heimatort:"Uetikon",
   ahv:"756.6928.2443.65", pass:"A-2734", js:"JS-4498", fairgate:"FG-10083",
   street:"Hauptstrasse 26", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"d.fuchs@mail.com", tel:"+41 79 121 51 31",
   teams:["Ca-Junioren"],
   p1Last:"Fuchs",   p1First:"Felix",  p1Email:"f.fuchs@mail.com",   p1Tel:"+41 79 546 85 61",
   p2Last:"Fuchs",   p2First:"Manuela",  p2Email:"m.fuchs@mail.com",   p2Tel:"+41 79 636 20 60"},
  {id:84,
   lastName:"Gloor",     firstName:"Lukas",   pos:"V", dob:"25.06.2010", nat:"CH", heimatort:"Hombrechtikon",
   ahv:"756.3419.4871.23", pass:"A-3399", js:"JS-4524", fairgate:"FG-10084",
   street:"Gartenstrasse 8", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"l.gloor@mail.com", tel:"+41 79 643 75 34",
   teams:["Ca-Junioren"],
   p1Last:"Gloor",   p1First:"Oliver",  p1Email:"o.gloor@mail.com",   p1Tel:"+41 79 302 32 87",
   p2Last:"Gloor",   p2First:"Denise",  p2Email:"d.gloor@mail.com",   p2Tel:"+41 79 256 93 19"},
  {id:85,
   lastName:"Brunschweiger",     firstName:"Simon",   pos:"RM", dob:"25.08.2011", nat:"AT", heimatort:"Uerikon",
   ahv:"756.3473.8205.18", pass:"A-8682", js:"JS-4905", fairgate:"FG-10085",
   street:"Rosenweg 37", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"s.brunschweiger@mail.com", tel:"+41 79 758 91 89",
   teams:["Ca-Junioren"],
   p1Last:"Brunschweiger",   p1First:"David",  p1Email:"d.brunschweiger@mail.com",   p1Tel:"+41 79 746 48 45",
   p2Last:"Brunschweiger",   p2First:"Monika",  p2Email:"m.brunschweiger@mail.com",   p2Tel:"+41 79 705 17 55"},
  {id:86,
   lastName:"Schmid",     firstName:"Dominik",   pos:"MF", dob:"02.08.2011", nat:"CH", heimatort:"Stäfa",
   ahv:"756.7299.8581.84", pass:"A-1672", js:"JS-4921", fairgate:"FG-10086",
   street:"Rietstrasse 5", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"d.schmid@mail.com", tel:"+41 79 760 21 88",
   teams:["Ca-Junioren"],
   p1Last:"Schmid",   p1First:"Jonas",  p1Email:"j.schmid@mail.com",   p1Tel:"+41 79 929 83 93",
   p2Last:"Schmid",   p2First:"Amélie",  p2Email:"a.schmid@mail.com",   p2Tel:"+41 79 292 51 87"},
  {id:87,
   lastName:"Nyffeler",     firstName:"Philipp",   pos:"MF", dob:"04.08.2010", nat:"PT", heimatort:"Küsnacht",
   ahv:"756.8199.9586.76", pass:"A-3600", js:"JS-4745", fairgate:"FG-10087",
   street:"Dorfstrasse 33", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"p.nyffeler@mail.com", tel:"+41 79 761 32 15",
   teams:["Ca-Junioren"],
   p1Last:"Nyffeler",   p1First:"Michael",  p1Email:"m.nyffeler@mail.com",   p1Tel:"+41 79 481 46 59",
   p2Last:"Nyffeler",   p2First:"Petra",  p2Email:"p.nyffeler@mail.com",   p2Tel:"+41 79 518 53 96"},
  {id:88,
   lastName:"Fischer",     firstName:"Jonas",   pos:"LM", dob:"11.02.2011", nat:"CH", heimatort:"Oetwil",
   ahv:"756.2335.3317.54", pass:"A-6082", js:"JS-5981", fairgate:"FG-10088",
   street:"Winkelstrasse 19", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"j.fischer@mail.com", tel:"+41 79 358 94 87",
   teams:["Ca-Junioren"],
   p1Last:"Fischer",   p1First:"Marco",  p1Email:"m.fischer@mail.com",   p1Tel:"+41 79 771 99 94",
   p2Last:"Fischer",   p2First:"Sabrina",  p2Email:"s.fischer@mail.com",   p2Tel:"+41 79 501 26 86"},
  {id:89,
   lastName:"Bucher",     firstName:"Leon",   pos:"IV", dob:"26.11.2011", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.1298.6940.49", pass:"A-3953", js:"JS-5947", fairgate:"FG-10089",
   street:"Gartenstrasse 6", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"l.bucher@mail.com", tel:"+41 79 761 95 64",
   teams:["Ca-Junioren"],
   p1Last:"Bucher",   p1First:"Dominik",  p1Email:"d.bucher@mail.com",   p1Tel:"+41 79 319 53 72",
   p2Last:"Bucher",   p2First:"Silvia",  p2Email:"s.bucher@mail.com",   p2Tel:"+41 79 296 38 27"},
  {id:90,
   lastName:"Huber",     firstName:"Andreas",   pos:"RM", dob:"11.11.2010", nat:"PT", heimatort:"Küsnacht",
   ahv:"756.3712.8170.15", pass:"A-7731", js:"JS-4746", fairgate:"FG-10090",
   street:"Rebgasse 39", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"a.huber@mail.com", tel:"+41 79 485 29 30",
   teams:["Ca-Junioren"],
   p1Last:"Huber",   p1First:"Simon",  p1Email:"s.huber@mail.com",   p1Tel:"+41 79 792 40 66",
   p2Last:"Huber",   p2First:"Corinne",  p2Email:"c.huber@mail.com",   p2Tel:"+41 79 725 46 67"},
  {id:91,
   lastName:"Loosli",     firstName:"Tobias",   pos:"MF", dob:"27.08.2011", nat:"CH", heimatort:"Männedorf",
   ahv:"756.7859.3655.35", pass:"A-3267", js:"JS-5787", fairgate:"FG-10091",
   street:"Rosenweg 30", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"t.loosli@mail.com", tel:"+41 79 887 46 58",
   teams:["Ca-Junioren"],
   p1Last:"Loosli",   p1First:"Dominik",  p1Email:"d.loosli@mail.com",   p1Tel:"+41 79 356 16 92",
   p2Last:"Loosli",   p2First:"Noëlle",  p2Email:"n.loosli@mail.com",   p2Tel:"+41 79 592 57 80"},
  {id:92,
   lastName:"Mettler",     firstName:"Nico",   pos:"IV", dob:"03.05.2012", nat:"PT", heimatort:"Seegräben",
   ahv:"756.8391.6727.13", pass:"A-7797", js:"JS-4109", fairgate:"FG-10092",
   street:"Widenstrasse 29", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"n.mettler@mail.com", tel:"+41 79 625 28 65",
   teams:["Da-Junioren"],
   p1Last:"Mettler",   p1First:"Leon",  p1Email:"l.mettler@mail.com",   p1Tel:"+41 79 505 74 57",
   p2Last:"Mettler",   p2First:"Celine",  p2Email:"c.mettler@mail.com",   p2Tel:"+41 79 341 59 20"},
  {id:93,
   lastName:"Zimmermann",     firstName:"Florian",   pos:"ST", dob:"27.02.2013", nat:"ES", heimatort:"Herrliberg",
   ahv:"756.8685.8349.88", pass:"A-1086", js:"JS-5855", fairgate:"FG-10093",
   street:"Oberdorfstrasse 10", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"f.zimmermann@mail.com", tel:"+41 79 240 14 46",
   teams:["Da-Junioren"],
   p1Last:"Zimmermann",   p1First:"Philipp",  p1Email:"p.zimmermann@mail.com",   p1Tel:"+41 79 181 12 42",
   p2Last:"Zimmermann",   p2First:"Julia",  p2Email:"j.zimmermann@mail.com",   p2Tel:"+41 79 320 29 80"},
  {id:94,
   lastName:"Schärer",     firstName:"Jonas",   pos:"V", dob:"08.05.2012", nat:"CH", heimatort:"Uetikon",
   ahv:"756.2816.9189.86", pass:"A-9782", js:"JS-4033", fairgate:"FG-10094",
   street:"Bergweg 16", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"j.schärer@mail.com", tel:"+41 79 529 91 89",
   teams:["Da-Junioren"],
   p1Last:"Schärer",   p1First:"Joel",  p1Email:"j.schärer@mail.com",   p1Tel:"+41 79 747 75 83",
   p2Last:"Schärer",   p2First:"Leonie",  p2Email:"l.schärer@mail.com",   p2Tel:"+41 79 347 28 47"},
  {id:95,
   lastName:"Müller",     firstName:"Noel",   pos:"IV", dob:"19.04.2013", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.9316.1333.59", pass:"A-8702", js:"JS-4089", fairgate:"FG-10095",
   street:"Dorfstrasse 34", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"n.müller@mail.com", tel:"+41 79 469 18 77",
   teams:["Da-Junioren"],
   p1Last:"Müller",   p1First:"Thomas",  p1Email:"t.müller@mail.com",   p1Tel:"+41 79 750 59 57",
   p2Last:"Müller",   p2First:"Amélie",  p2Email:"a.müller@mail.com",   p2Tel:"+41 79 359 12 55"},
  {id:96,
   lastName:"Maurer",     firstName:"Jan",   pos:"MF", dob:"24.10.2012", nat:"PT", heimatort:"Männedorf",
   ahv:"756.8840.3986.27", pass:"A-2033", js:"JS-5466", fairgate:"FG-10096",
   street:"Rebgasse 3", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"j.maurer@mail.com", tel:"+41 79 460 79 53",
   teams:["Da-Junioren"],
   p1Last:"Maurer",   p1First:"Simon",  p1Email:"s.maurer@mail.com",   p1Tel:"+41 79 894 68 14",
   p2Last:"Maurer",   p2First:"Manuela",  p2Email:"m.maurer@mail.com",   p2Tel:"+41 79 400 35 15"},
  {id:97,
   lastName:"Meier",     firstName:"Patrick",   pos:"LM", dob:"13.09.2013", nat:"FR", heimatort:"Hombrechtikon",
   ahv:"756.1783.6438.44", pass:"A-3039", js:"JS-5637", fairgate:"FG-10097",
   street:"Mühleweg 17", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"p.meier@mail.com", tel:"+41 79 137 92 34",
   teams:["Da-Junioren"],
   p1Last:"Meier",   p1First:"Andreas",  p1Email:"a.meier@mail.com",   p1Tel:"+41 79 476 65 61",
   p2Last:"Meier",   p2First:"Denise",  p2Email:"d.meier@mail.com",   p2Tel:"+41 79 861 66 59"},
  {id:98,
   lastName:"Koch",     firstName:"Marc",   pos:"LV", dob:"26.06.2013", nat:"DE", heimatort:"Zollikon",
   ahv:"756.5813.6262.23", pass:"A-2311", js:"JS-4671", fairgate:"FG-10098",
   street:"Dorfstrasse 28", plz:"8702", city:"Zollikon", canton:"ZH", country:"Schweiz",
   email:"m.koch@mail.com", tel:"+41 79 180 65 87",
   teams:["Da-Junioren"],
   p1Last:"Koch",   p1First:"Simon",  p1Email:"s.koch@mail.com",   p1Tel:"+41 79 776 47 49",
   p2Last:"Koch",   p2First:"Livia",  p2Email:"l.koch@mail.com",   p2Tel:"+41 79 556 87 64"},
  {id:99,
   lastName:"Egli",     firstName:"Fabian",   pos:"MF", dob:"02.08.2013", nat:"ES", heimatort:"Zollikon",
   ahv:"756.9406.3621.13", pass:"A-3339", js:"JS-5738", fairgate:"FG-10099",
   street:"Forchstrasse 18", plz:"8702", city:"Zollikon", canton:"ZH", country:"Schweiz",
   email:"f.egli@mail.com", tel:"+41 79 754 17 19",
   teams:["Da-Junioren"],
   p1Last:"Egli",   p1First:"Cedric",  p1Email:"c.egli@mail.com",   p1Tel:"+41 79 722 96 66",
   p2Last:"Egli",   p2First:"Silvia",  p2Email:"s.egli@mail.com",   p2Tel:"+41 79 135 26 18"},
  {id:100,
   lastName:"Brunschweiger",     firstName:"Michael",   pos:"TW", dob:"13.06.2013", nat:"AT", heimatort:"Uerikon",
   ahv:"756.3255.9674.56", pass:"A-7521", js:"JS-4643", fairgate:"FG-10100",
   street:"Rebgasse 29", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"m.brunschweiger@mail.com", tel:"+41 79 479 57 66",
   teams:["Da-Junioren"],
   p1Last:"Brunschweiger",   p1First:"Jan",  p1Email:"j.brunschweiger@mail.com",   p1Tel:"+41 79 765 45 41",
   p2Last:"Brunschweiger",   p2First:"Jasmin",  p2Email:"j.brunschweiger@mail.com",   p2Tel:"+41 79 216 13 33"},
  {id:101,
   lastName:"Schärer",     firstName:"Julian",   pos:"ZM", dob:"25.05.2012", nat:"CH", heimatort:"Uetikon",
   ahv:"756.3223.2213.67", pass:"A-3828", js:"JS-5840", fairgate:"FG-10101",
   street:"Kirchgasse 40", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"j.schärer@mail.com", tel:"+41 79 392 98 72",
   teams:["Da-Junioren"],
   p1Last:"Schärer",   p1First:"Patrick",  p1Email:"p.schärer@mail.com",   p1Tel:"+41 79 830 66 21",
   p2Last:"Schärer",   p2First:"Anna",  p2Email:"a.schärer@mail.com",   p2Tel:"+41 79 929 97 50"},
  {id:102,
   lastName:"Mettler",     firstName:"Oliver",   pos:"ST", dob:"28.05.2013", nat:"CH", heimatort:"Meilen",
   ahv:"756.4878.9094.13", pass:"A-6912", js:"JS-5134", fairgate:"FG-10102",
   street:"Im Grund 24", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"o.mettler@mail.com", tel:"+41 79 620 38 25",
   teams:["Da-Junioren"],
   p1Last:"Mettler",   p1First:"Patrick",  p1Email:"p.mettler@mail.com",   p1Tel:"+41 79 686 57 69",
   p2Last:"Mettler",   p2First:"Julia",  p2Email:"j.mettler@mail.com",   p2Tel:"+41 79 922 80 26"},
  {id:103,
   lastName:"Weber",     firstName:"Felix",   pos:"ZM", dob:"23.07.2013", nat:"ES", heimatort:"Meilen",
   ahv:"756.6194.2215.67", pass:"A-8632", js:"JS-5392", fairgate:"FG-10103",
   street:"Gartenstrasse 27", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"f.weber@mail.com", tel:"+41 79 887 62 83",
   teams:["Da-Junioren"],
   p1Last:"Weber",   p1First:"Jan",  p1Email:"j.weber@mail.com",   p1Tel:"+41 79 629 54 26",
   p2Last:"Weber",   p2First:"Julia",  p2Email:"j.weber@mail.com",   p2Tel:"+41 79 999 80 91"},
  {id:104,
   lastName:"Koch",     firstName:"Maximilian",   pos:"TW", dob:"17.07.2012", nat:"FR", heimatort:"Oetwil",
   ahv:"756.4694.6669.76", pass:"A-5653", js:"JS-5732", fairgate:"FG-10104",
   street:"Hauptstrasse 34", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"m.koch@mail.com", tel:"+41 79 256 48 31",
   teams:["Da-Junioren"],
   p1Last:"Koch",   p1First:"Fabian",  p1Email:"f.koch@mail.com",   p1Tel:"+41 79 180 42 35",
   p2Last:"Koch",   p2First:"Monika",  p2Email:"m.koch@mail.com",   p2Tel:"+41 79 750 80 45"},
  {id:105,
   lastName:"Odermatt",     firstName:"Sven",   pos:"RM", dob:"21.09.2012", nat:"CH", heimatort:"Stäfa",
   ahv:"756.1674.1464.20", pass:"A-1744", js:"JS-5942", fairgate:"FG-10105",
   street:"Rebgasse 11", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"s.odermatt@mail.com", tel:"+41 79 774 89 87",
   teams:["Da-Junioren"],
   p1Last:"Odermatt",   p1First:"Marc",  p1Email:"m.odermatt@mail.com",   p1Tel:"+41 79 756 83 43",
   p2Last:"Odermatt",   p2First:"Jasmin",  p2Email:"j.odermatt@mail.com",   p2Tel:"+41 79 766 36 83"},
  {id:106,
   lastName:"Stadler",     firstName:"Dario",   pos:"LV", dob:"21.08.2012", nat:"DE", heimatort:"Uerikon",
   ahv:"756.2195.1981.30", pass:"A-8202", js:"JS-4851", fairgate:"FG-10106",
   street:"Rietstrasse 31", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"d.stadler@mail.com", tel:"+41 79 350 97 61",
   teams:["Db-Junioren"],
   p1Last:"Stadler",   p1First:"Lukas",  p1Email:"l.stadler@mail.com",   p1Tel:"+41 79 595 69 36",
   p2Last:"Stadler",   p2First:"Manuela",  p2Email:"m.stadler@mail.com",   p2Tel:"+41 79 448 87 28"},
  {id:107,
   lastName:"Mettler",     firstName:"David",   pos:"MF", dob:"05.07.2013", nat:"PT", heimatort:"Hombrechtikon",
   ahv:"756.5382.8366.41", pass:"A-3308", js:"JS-4198", fairgate:"FG-10107",
   street:"Gartenstrasse 36", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"d.mettler@mail.com", tel:"+41 79 208 50 40",
   teams:["Db-Junioren"],
   p1Last:"Mettler",   p1First:"Joel",  p1Email:"j.mettler@mail.com",   p1Tel:"+41 79 151 47 59",
   p2Last:"Mettler",   p2First:"Anna",  p2Email:"a.mettler@mail.com",   p2Tel:"+41 79 984 88 63"},
  {id:108,
   lastName:"Berger",     firstName:"Michael",   pos:"RV", dob:"24.10.2013", nat:"CH", heimatort:"Seegräben",
   ahv:"756.1379.2475.60", pass:"A-9281", js:"JS-4936", fairgate:"FG-10108",
   street:"Im Grund 32", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"m.berger@mail.com", tel:"+41 79 627 69 73",
   teams:["Db-Junioren"],
   p1Last:"Berger",   p1First:"Lukas",  p1Email:"l.berger@mail.com",   p1Tel:"+41 79 346 37 84",
   p2Last:"Berger",   p2First:"Zoé",  p2Email:"z.berger@mail.com",   p2Tel:"+41 79 461 16 16"},
  {id:109,
   lastName:"Flückiger",     firstName:"Andreas",   pos:"V", dob:"18.05.2013", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.7563.1838.82", pass:"A-4189", js:"JS-4742", fairgate:"FG-10109",
   street:"Forchstrasse 9", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"a.flückiger@mail.com", tel:"+41 79 370 56 61",
   teams:["Db-Junioren"],
   p1Last:"Flückiger",   p1First:"Florian",  p1Email:"f.flückiger@mail.com",   p1Tel:"+41 79 666 46 19",
   p2Last:"Flückiger",   p2First:"Mia",  p2Email:"m.flückiger@mail.com",   p2Tel:"+41 79 495 74 67"},
  {id:110,
   lastName:"Lüthy",     firstName:"Sebastian",   pos:"MF", dob:"04.03.2012", nat:"CH", heimatort:"Seegräben",
   ahv:"756.7576.9193.15", pass:"A-1742", js:"JS-4079", fairgate:"FG-10110",
   street:"Oberdorfstrasse 36", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"s.lüthy@mail.com", tel:"+41 79 474 28 35",
   teams:["Db-Junioren"],
   p1Last:"Lüthy",   p1First:"Jonas",  p1Email:"j.lüthy@mail.com",   p1Tel:"+41 79 240 52 70",
   p2Last:"Lüthy",   p2First:"Amélie",  p2Email:"a.lüthy@mail.com",   p2Tel:"+41 79 631 68 29"},
  {id:111,
   lastName:"Nyffeler",     firstName:"Jonas",   pos:"DM", dob:"11.10.2013", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.5911.8780.12", pass:"A-7035", js:"JS-4678", fairgate:"FG-10111",
   street:"Rietstrasse 38", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"j.nyffeler@mail.com", tel:"+41 79 444 74 75",
   teams:["Db-Junioren"],
   p1Last:"Nyffeler",   p1First:"Thomas",  p1Email:"t.nyffeler@mail.com",   p1Tel:"+41 79 789 24 63",
   p2Last:"Nyffeler",   p2First:"Zoé",  p2Email:"z.nyffeler@mail.com",   p2Tel:"+41 79 697 49 98"},
  {id:112,
   lastName:"Lehmann",     firstName:"Noah",   pos:"RM", dob:"26.11.2013", nat:"PT", heimatort:"Zollikon",
   ahv:"756.7229.3421.97", pass:"A-4968", js:"JS-4064", fairgate:"FG-10112",
   street:"Schulstrasse 4", plz:"8702", city:"Zollikon", canton:"ZH", country:"Schweiz",
   email:"n.lehmann@mail.com", tel:"+41 79 697 71 31",
   teams:["Db-Junioren"],
   p1Last:"Lehmann",   p1First:"Christian",  p1Email:"c.lehmann@mail.com",   p1Tel:"+41 79 686 99 24",
   p2Last:"Lehmann",   p2First:"Corinne",  p2Email:"c.lehmann@mail.com",   p2Tel:"+41 79 295 12 66"},
  {id:113,
   lastName:"Baumann",     firstName:"David",   pos:"LM", dob:"07.12.2013", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.6325.8837.77", pass:"A-7173", js:"JS-4642", fairgate:"FG-10113",
   street:"Mühleweg 4", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"d.baumann@mail.com", tel:"+41 79 822 27 76",
   teams:["Db-Junioren"],
   p1Last:"Baumann",   p1First:"Kevin",  p1Email:"k.baumann@mail.com",   p1Tel:"+41 79 277 68 78",
   p2Last:"Baumann",   p2First:"Selina",  p2Email:"s.baumann@mail.com",   p2Tel:"+41 79 450 79 55"},
  {id:114,
   lastName:"Stadler",     firstName:"Stefan",   pos:"LV", dob:"09.04.2012", nat:"DE", heimatort:"Zollikon",
   ahv:"756.8861.6714.81", pass:"A-5480", js:"JS-4589", fairgate:"FG-10114",
   street:"Schulstrasse 20", plz:"8702", city:"Zollikon", canton:"ZH", country:"Schweiz",
   email:"s.stadler@mail.com", tel:"+41 79 889 46 36",
   teams:["Db-Junioren"],
   p1Last:"Stadler",   p1First:"Julian",  p1Email:"j.stadler@mail.com",   p1Tel:"+41 79 224 83 96",
   p2Last:"Stadler",   p2First:"Monika",  p2Email:"m.stadler@mail.com",   p2Tel:"+41 79 656 58 60"},
  {id:115,
   lastName:"Brunschweiger",     firstName:"Oliver",   pos:"V", dob:"02.05.2012", nat:"CH", heimatort:"Oetwil",
   ahv:"756.9824.5442.81", pass:"A-5450", js:"JS-4281", fairgate:"FG-10115",
   street:"Zürichstrasse 29", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"o.brunschweiger@mail.com", tel:"+41 79 771 42 71",
   teams:["Db-Junioren"],
   p1Last:"Brunschweiger",   p1First:"Kevin",  p1Email:"k.brunschweiger@mail.com",   p1Tel:"+41 79 211 88 85",
   p2Last:"Brunschweiger",   p2First:"Vanessa",  p2Email:"v.brunschweiger@mail.com",   p2Tel:"+41 79 345 41 16"},
  {id:116,
   lastName:"Zimmermann",     firstName:"Christian",   pos:"MF", dob:"04.01.2012", nat:"CH", heimatort:"Uerikon",
   ahv:"756.7666.8793.71", pass:"A-4267", js:"JS-5548", fairgate:"FG-10116",
   street:"Mühleweg 7", plz:"8713", city:"Uerikon", canton:"ZH", country:"Schweiz",
   email:"c.zimmermann@mail.com", tel:"+41 79 797 27 10",
   teams:["Db-Junioren"],
   p1Last:"Zimmermann",   p1First:"Sebastian",  p1Email:"s.zimmermann@mail.com",   p1Tel:"+41 79 394 51 46",
   p2Last:"Zimmermann",   p2First:"Sandra",  p2Email:"s.zimmermann@mail.com",   p2Tel:"+41 79 761 17 21"},
  {id:117,
   lastName:"Zimmermann",     firstName:"Alexander",   pos:"IV", dob:"14.03.2012", nat:"FR", heimatort:"Küsnacht",
   ahv:"756.1151.5888.82", pass:"A-2758", js:"JS-5901", fairgate:"FG-10117",
   street:"Bergweg 26", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"a.zimmermann@mail.com", tel:"+41 79 906 73 33",
   teams:["Db-Junioren"],
   p1Last:"Zimmermann",   p1First:"Andreas",  p1Email:"a.zimmermann@mail.com",   p1Tel:"+41 79 443 46 68",
   p2Last:"Zimmermann",   p2First:"Mia",  p2Email:"m.zimmermann@mail.com",   p2Tel:"+41 79 756 79 77"},
  {id:118,
   lastName:"Bauer",     firstName:"Julian",   pos:"V", dob:"07.05.2013", nat:"PT", heimatort:"Seegräben",
   ahv:"756.1230.6523.47", pass:"A-4164", js:"JS-4359", fairgate:"FG-10118",
   street:"Oberdorfstrasse 11", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"j.bauer@mail.com", tel:"+41 79 848 68 92",
   teams:["Db-Junioren"],
   p1Last:"Bauer",   p1First:"Stefan",  p1Email:"s.bauer@mail.com",   p1Tel:"+41 79 725 91 61",
   p2Last:"Bauer",   p2First:"Nicole",  p2Email:"n.bauer@mail.com",   p2Tel:"+41 79 946 64 75"},
  {id:119,
   lastName:"Weber",     firstName:"Monika",   pos:"MF", dob:"05.03.2010", nat:"CH", heimatort:"Uetikon",
   ahv:"756.6400.5947.84", pass:"A-1187", js:"JS-4535", fairgate:"FG-10119",
   street:"Schulstrasse 1", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"m.weber@mail.com", tel:"+41 79 367 59 40",
   teams:["C-Juniorinnen"],
   p1Last:"Weber",   p1First:"Petra",  p1Email:"p.weber@mail.com",   p1Tel:"+41 79 769 56 98",
   p2Last:"Weber",   p2First:"Daniel",  p2Email:"d.weber@mail.com",   p2Tel:"+41 79 341 17 95"},
  {id:120,
   lastName:"Aebischer",     firstName:"Anna",   pos:"LV", dob:"22.07.2010", nat:"DE", heimatort:"Stäfa",
   ahv:"756.8834.3509.68", pass:"A-7121", js:"JS-4851", fairgate:"FG-10120",
   street:"Hauptstrasse 19", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"a.aebischer@mail.com", tel:"+41 79 476 88 38",
   teams:["C-Juniorinnen"],
   p1Last:"Aebischer",   p1First:"Celine",  p1Email:"c.aebischer@mail.com",   p1Tel:"+41 79 818 80 70",
   p2Last:"Aebischer",   p2First:"Sven",  p2Email:"s.aebischer@mail.com",   p2Tel:"+41 79 875 78 95"},
  {id:121,
   lastName:"Haas",     firstName:"Nathalie",   pos:"MF", dob:"15.09.2010", nat:"DE", heimatort:"Männedorf",
   ahv:"756.9792.3455.31", pass:"A-6375", js:"JS-5749", fairgate:"FG-10121",
   street:"Dorfstrasse 37", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"n.haas@mail.com", tel:"+41 79 214 17 80",
   teams:["C-Juniorinnen"],
   p1Last:"Haas",   p1First:"Amélie",  p1Email:"a.haas@mail.com",   p1Tel:"+41 79 632 66 24",
   p2Last:"Haas",   p2First:"Patrick",  p2Email:"p.haas@mail.com",   p2Tel:"+41 79 796 36 84"},
  {id:122,
   lastName:"Weber",     firstName:"Zoé",   pos:"LM", dob:"15.01.2011", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.1356.7487.42", pass:"A-1049", js:"JS-5527", fairgate:"FG-10122",
   street:"Forchstrasse 30", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"z.weber@mail.com", tel:"+41 79 677 17 81",
   teams:["C-Juniorinnen"],
   p1Last:"Weber",   p1First:"Manuela",  p1Email:"m.weber@mail.com",   p1Tel:"+41 79 323 84 19",
   p2Last:"Weber",   p2First:"Lukas",  p2Email:"l.weber@mail.com",   p2Tel:"+41 79 146 64 54"},
  {id:123,
   lastName:"Loosli",     firstName:"Leonie",   pos:"DM", dob:"02.08.2010", nat:"CH", heimatort:"Herrliberg",
   ahv:"756.7266.8348.58", pass:"A-7154", js:"JS-4164", fairgate:"FG-10123",
   street:"Im Grund 9", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"l.loosli@mail.com", tel:"+41 79 884 92 92",
   teams:["C-Juniorinnen"],
   p1Last:"Loosli",   p1First:"Barbara",  p1Email:"b.loosli@mail.com",   p1Tel:"+41 79 799 94 79",
   p2Last:"Loosli",   p2First:"Florian",  p2Email:"f.loosli@mail.com",   p2Tel:"+41 79 236 93 54"},
  {id:124,
   lastName:"Koch",     firstName:"Anna",   pos:"RV", dob:"05.09.2011", nat:"ES", heimatort:"Küsnacht",
   ahv:"756.9715.7214.39", pass:"A-5055", js:"JS-4943", fairgate:"FG-10124",
   street:"Seestrasse 2", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"a.koch@mail.com", tel:"+41 79 405 69 96",
   teams:["C-Juniorinnen"],
   p1Last:"Koch",   p1First:"Livia",  p1Email:"l.koch@mail.com",   p1Tel:"+41 79 454 29 45",
   p2Last:"Koch",   p2First:"Noel",  p2Email:"n.koch@mail.com",   p2Tel:"+41 79 293 24 14"},
  {id:125,
   lastName:"Stadler",     firstName:"Barbara",   pos:"V", dob:"07.04.2010", nat:"CH", heimatort:"Oetwil",
   ahv:"756.7590.8191.39", pass:"A-9843", js:"JS-4444", fairgate:"FG-10125",
   street:"Bergweg 29", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"b.stadler@mail.com", tel:"+41 79 712 96 16",
   teams:["C-Juniorinnen"],
   p1Last:"Stadler",   p1First:"Alina",  p1Email:"a.stadler@mail.com",   p1Tel:"+41 79 872 17 27",
   p2Last:"Stadler",   p2First:"Finn",  p2Email:"f.stadler@mail.com",   p2Tel:"+41 79 615 47 39"},
  {id:126,
   lastName:"Brunner",     firstName:"Jasmin",   pos:"ST", dob:"10.04.2011", nat:"CH", heimatort:"Erlenbach",
   ahv:"756.3869.7999.81", pass:"A-9120", js:"JS-4096", fairgate:"FG-10126",
   street:"Gartenstrasse 15", plz:"8703", city:"Erlenbach", canton:"ZH", country:"Schweiz",
   email:"j.brunner@mail.com", tel:"+41 79 523 48 45",
   teams:["C-Juniorinnen"],
   p1Last:"Brunner",   p1First:"Sofia",  p1Email:"s.brunner@mail.com",   p1Tel:"+41 79 452 92 95",
   p2Last:"Brunner",   p2First:"Sebastian",  p2Email:"s.brunner@mail.com",   p2Tel:"+41 79 490 77 50"},
  {id:127,
   lastName:"Baumann",     firstName:"Barbara",   pos:"LM", dob:"06.07.2011", nat:"PT", heimatort:"Küsnacht",
   ahv:"756.1944.7761.63", pass:"A-9683", js:"JS-4274", fairgate:"FG-10127",
   street:"Mühleweg 16", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"b.baumann@mail.com", tel:"+41 79 969 38 48",
   teams:["C-Juniorinnen"],
   p1Last:"Baumann",   p1First:"Laura",  p1Email:"l.baumann@mail.com",   p1Tel:"+41 79 497 41 42",
   p2Last:"Baumann",   p2First:"Joel",  p2Email:"j.baumann@mail.com",   p2Tel:"+41 79 308 52 92"},
  {id:128,
   lastName:"Nydegger",     firstName:"Sarah",   pos:"RV", dob:"18.02.2011", nat:"ES", heimatort:"Seegräben",
   ahv:"756.2192.4082.85", pass:"A-4555", js:"JS-4981", fairgate:"FG-10128",
   street:"Bergweg 18", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"s.nydegger@mail.com", tel:"+41 79 486 96 87",
   teams:["C-Juniorinnen"],
   p1Last:"Nydegger",   p1First:"Nadine",  p1Email:"n.nydegger@mail.com",   p1Tel:"+41 79 313 52 48",
   p2Last:"Nydegger",   p2First:"Finn",  p2Email:"f.nydegger@mail.com",   p2Tel:"+41 79 115 37 34"},
  {id:129,
   lastName:"Gloor",     firstName:"Anna",   pos:"RV", dob:"23.04.2011", nat:"AT", heimatort:"Oetwil",
   ahv:"756.9743.6886.49", pass:"A-5285", js:"JS-4736", fairgate:"FG-10129",
   street:"Winkelstrasse 16", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"a.gloor@mail.com", tel:"+41 79 665 51 46",
   teams:["C-Juniorinnen"],
   p1Last:"Gloor",   p1First:"Kathrin",  p1Email:"k.gloor@mail.com",   p1Tel:"+41 79 625 73 69",
   p2Last:"Gloor",   p2First:"Joel",  p2Email:"j.gloor@mail.com",   p2Tel:"+41 79 200 70 50"},
  {id:130,
   lastName:"Gerber",     firstName:"Nathalie",   pos:"RV", dob:"19.01.2011", nat:"FR", heimatort:"Hombrechtikon",
   ahv:"756.5836.3497.35", pass:"A-6404", js:"JS-4471", fairgate:"FG-10130",
   street:"Rebgasse 2", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"n.gerber@mail.com", tel:"+41 79 367 80 84",
   teams:["C-Juniorinnen"],
   p1Last:"Gerber",   p1First:"Miriam",  p1Email:"m.gerber@mail.com",   p1Tel:"+41 79 488 82 41",
   p2Last:"Gerber",   p2First:"Dario",  p2Email:"d.gerber@mail.com",   p2Tel:"+41 79 611 80 93"},
  {id:131,
   lastName:"Moser",     firstName:"Sabrina",   pos:"ZM", dob:"21.12.2011", nat:"ES", heimatort:"Oetwil",
   ahv:"756.9000.4015.79", pass:"A-1962", js:"JS-5073", fairgate:"FG-10131",
   street:"Rosenweg 11", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"s.moser@mail.com", tel:"+41 79 850 55 31",
   teams:["C-Juniorinnen"],
   p1Last:"Moser",   p1First:"Julia",  p1Email:"j.moser@mail.com",   p1Tel:"+41 79 134 19 95",
   p2Last:"Moser",   p2First:"Thomas",  p2Email:"t.moser@mail.com",   p2Tel:"+41 79 149 10 62"},
  {id:132,
   lastName:"Odermatt",     firstName:"Julia",   pos:"RV", dob:"05.12.2017", nat:"CH", heimatort:"Männedorf",
   ahv:"756.8993.1257.10", pass:"A-9719", js:"JS-5129", fairgate:"FG-10132",
   street:"Gartenstrasse 30", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"j.odermatt@mail.com", tel:"+41 79 482 17 89",
   teams:["F-Juniorinnen"],
   p1Last:"Odermatt",   p1First:"Corinne",  p1Email:"c.odermatt@mail.com",   p1Tel:"+41 79 521 11 12",
   p2Last:"Odermatt",   p2First:"Philipp",  p2Email:"p.odermatt@mail.com",   p2Tel:"+41 79 642 45 78"},
  {id:133,
   lastName:"Keller",     firstName:"Klara",   pos:"LM", dob:"04.03.2018", nat:"CH", heimatort:"Küsnacht",
   ahv:"756.5379.7502.20", pass:"A-7112", js:"JS-5964", fairgate:"FG-10133",
   street:"Rebgasse 16", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"k.keller@mail.com", tel:"+41 79 296 89 77",
   teams:["F-Juniorinnen"],
   p1Last:"Keller",   p1First:"Lea",  p1Email:"l.keller@mail.com",   p1Tel:"+41 79 515 68 82",
   p2Last:"Keller",   p2First:"Oliver",  p2Email:"o.keller@mail.com",   p2Tel:"+41 79 349 99 38"},
  {id:134,
   lastName:"Herrmann",     firstName:"Vera",   pos:"TW", dob:"28.11.2017", nat:"IT", heimatort:"Seegräben",
   ahv:"756.1154.3807.20", pass:"A-9189", js:"JS-5731", fairgate:"FG-10134",
   street:"Dorfstrasse 26", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"v.herrmann@mail.com", tel:"+41 79 488 58 80",
   teams:["F-Juniorinnen"],
   p1Last:"Herrmann",   p1First:"Isabelle",  p1Email:"i.herrmann@mail.com",   p1Tel:"+41 79 544 92 52",
   p2Last:"Herrmann",   p2First:"Elias",  p2Email:"e.herrmann@mail.com",   p2Tel:"+41 79 679 22 77"},
  {id:135,
   lastName:"Zimmermann",     firstName:"Mia",   pos:"ST", dob:"02.05.2018", nat:"CH", heimatort:"Männedorf",
   ahv:"756.1256.4394.85", pass:"A-3362", js:"JS-5540", fairgate:"FG-10135",
   street:"Widenstrasse 35", plz:"8708", city:"Männedorf", canton:"ZH", country:"Schweiz",
   email:"m.zimmermann@mail.com", tel:"+41 79 677 94 14",
   teams:["F-Juniorinnen"],
   p1Last:"Zimmermann",   p1First:"Nicole",  p1Email:"n.zimmermann@mail.com",   p1Tel:"+41 79 940 60 19",
   p2Last:"Zimmermann",   p2First:"David",  p2Email:"d.zimmermann@mail.com",   p2Tel:"+41 79 406 30 82"},
  {id:136,
   lastName:"Fuchs",     firstName:"Alina",   pos:"DM", dob:"18.11.2018", nat:"CH", heimatort:"Seegräben",
   ahv:"756.4803.2245.53", pass:"A-7499", js:"JS-5984", fairgate:"FG-10136",
   street:"Rebgasse 6", plz:"8607", city:"Seegräben", canton:"ZH", country:"Schweiz",
   email:"a.fuchs@mail.com", tel:"+41 79 612 54 16",
   teams:["F-Juniorinnen"],
   p1Last:"Fuchs",   p1First:"Lisa",  p1Email:"l.fuchs@mail.com",   p1Tel:"+41 79 892 51 13",
   p2Last:"Fuchs",   p2First:"Noel",  p2Email:"n.fuchs@mail.com",   p2Tel:"+41 79 749 44 67"},
  {id:137,
   lastName:"Zimmermann",     firstName:"Zoé",   pos:"RM", dob:"06.07.2018", nat:"IT", heimatort:"Hombrechtikon",
   ahv:"756.2344.5390.29", pass:"A-7225", js:"JS-5457", fairgate:"FG-10137",
   street:"Winkelstrasse 6", plz:"8634", city:"Hombrechtikon", canton:"ZH", country:"Schweiz",
   email:"z.zimmermann@mail.com", tel:"+41 79 890 89 47",
   teams:["F-Juniorinnen"],
   p1Last:"Zimmermann",   p1First:"Alina",  p1Email:"a.zimmermann@mail.com",   p1Tel:"+41 79 902 91 29",
   p2Last:"Zimmermann",   p2First:"Jan",  p2Email:"j.zimmermann@mail.com",   p2Tel:"+41 79 857 59 50"},
  {id:138,
   lastName:"Huber",     firstName:"Silvia",   pos:"LV", dob:"15.05.2017", nat:"CH", heimatort:"Meilen",
   ahv:"756.9395.7685.23", pass:"A-1430", js:"JS-4183", fairgate:"FG-10138",
   street:"Hauptstrasse 9", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"s.huber@mail.com", tel:"+41 79 189 33 65",
   teams:["F-Juniorinnen"],
   p1Last:"Huber",   p1First:"Petra",  p1Email:"p.huber@mail.com",   p1Tel:"+41 79 462 80 21",
   p2Last:"Huber",   p2First:"Sebastian",  p2Email:"s.huber@mail.com",   p2Tel:"+41 79 711 86 51"},
  {id:139,
   lastName:"Müller",     firstName:"Kathrin",   pos:"LM", dob:"25.07.2018", nat:"CH", heimatort:"Stäfa",
   ahv:"756.3274.5405.48", pass:"A-5397", js:"JS-5009", fairgate:"FG-10139",
   street:"Schulstrasse 37", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"k.müller@mail.com", tel:"+41 79 633 31 97",
   teams:["F-Juniorinnen"],
   p1Last:"Müller",   p1First:"Kathrin",  p1Email:"k.müller@mail.com",   p1Tel:"+41 79 249 18 31",
   p2Last:"Müller",   p2First:"Fabian",  p2Email:"f.müller@mail.com",   p2Tel:"+41 79 545 45 63"},
  {id:140,
   lastName:"Zbinden",     firstName:"Vera",   pos:"ST", dob:"09.06.2017", nat:"CH", heimatort:"Oetwil",
   ahv:"756.5991.1110.60", pass:"A-6443", js:"JS-5723", fairgate:"FG-10140",
   street:"Mühleweg 39", plz:"8618", city:"Oetwil", canton:"ZH", country:"Schweiz",
   email:"v.zbinden@mail.com", tel:"+41 79 731 35 68",
   teams:["F-Juniorinnen"],
   p1Last:"Zbinden",   p1First:"Lisa",  p1Email:"l.zbinden@mail.com",   p1Tel:"+41 79 735 58 52",
   p2Last:"Zbinden",   p2First:"Sven",  p2Email:"s.zbinden@mail.com",   p2Tel:"+41 79 550 52 65"},
  {id:141,
   lastName:"Bauer",     firstName:"Nadine",   pos:"ZM", dob:"23.10.2018", nat:"CH", heimatort:"Stäfa",
   ahv:"756.4971.6339.58", pass:"A-5592", js:"JS-5672", fairgate:"FG-10141",
   street:"Oberdorfstrasse 12", plz:"8712", city:"Stäfa", canton:"ZH", country:"Schweiz",
   email:"n.bauer@mail.com", tel:"+41 79 507 50 47",
   teams:["F-Juniorinnen"],
   p1Last:"Bauer",   p1First:"Zoé",  p1Email:"z.bauer@mail.com",   p1Tel:"+41 79 904 60 56",
   p2Last:"Bauer",   p2First:"Alexander",  p2Email:"a.bauer@mail.com",   p2Tel:"+41 79 216 82 35"},
  {id:142,
   lastName:"Loosli",     firstName:"Miriam",   pos:"RV", dob:"15.12.2017", nat:"ES", heimatort:"Küsnacht",
   ahv:"756.3280.5961.40", pass:"A-5139", js:"JS-5348", fairgate:"FG-10142",
   street:"Rosenweg 19", plz:"8700", city:"Küsnacht", canton:"ZH", country:"Schweiz",
   email:"m.loosli@mail.com", tel:"+41 79 951 98 18",
   teams:["F-Juniorinnen"],
   p1Last:"Loosli",   p1First:"Barbara",  p1Email:"b.loosli@mail.com",   p1Tel:"+41 79 257 64 58",
   p2Last:"Loosli",   p2First:"Julian",  p2Email:"j.loosli@mail.com",   p2Tel:"+41 79 175 67 86"},
  {id:143,
   lastName:"Hofmann",     firstName:"Isabelle",   pos:"MF", dob:"02.09.2018", nat:"PT", heimatort:"Uetikon",
   ahv:"756.3725.1725.82", pass:"A-7547", js:"JS-5980", fairgate:"FG-10143",
   street:"Lindenstrasse 39", plz:"8707", city:"Uetikon", canton:"ZH", country:"Schweiz",
   email:"i.hofmann@mail.com", tel:"+41 79 753 20 23",
   teams:["F-Juniorinnen"],
   p1Last:"Hofmann",   p1First:"Alina",  p1Email:"a.hofmann@mail.com",   p1Tel:"+41 79 870 52 65",
   p2Last:"Hofmann",   p2First:"Oliver",  p2Email:"o.hofmann@mail.com",   p2Tel:"+41 79 208 11 22"},
  /* -- E-Juniorinnen -- */
  {id:150,lastName:"Baumann",  firstName:"Lara",    pos:"MF",dob:"14.03.2016",nat:"CH",heimatort:"Herrliberg",  ahv:"756.1001.0001.01",pass:"A-3001",js:"JS-7001",fairgate:"FG-10150",street:"Seestrasse 12",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"l.baumann@mail.com",tel:"+41 79 501 00 01",teams:["E-Juniorinnen"],p1Last:"Baumann",p1First:"Petra",p1Email:"p.baumann@mail.com",p1Tel:"+41 79 502 00 02",p2Last:"Baumann",p2First:"Rolf",p2Email:"r.baumann@mail.com",p2Tel:"+41 79 503 00 03"},
  {id:151,lastName:"Steiner",  firstName:"Mia",     pos:"ST",dob:"02.07.2016",nat:"CH",heimatort:"Meilen",       ahv:"756.1001.0002.02",pass:"A-3002",js:"JS-7002",fairgate:"FG-10151",street:"Bergweg 4",plz:"8706",city:"Feldmeilen",canton:"ZH",country:"Schweiz",email:"m.steiner@mail.com",tel:"+41 79 511 00 11",teams:["E-Juniorinnen"],p1Last:"Steiner",p1First:"Claudia",p1Email:"c.steiner@mail.com",p1Tel:"+41 79 512 00 12",p2Last:"Steiner",p2First:"Marco",p2Email:"m.steiner2@mail.com",p2Tel:"+41 79 513 00 13"},
  {id:152,lastName:"Keller",   firstName:"Nina",    pos:"LV",dob:"19.09.2016",nat:"CH",heimatort:"Küsnacht",     ahv:"756.1001.0003.03",pass:"A-3003",js:"JS-7003",fairgate:"FG-10152",street:"Hauptstrasse 8",plz:"8700",city:"Küsnacht",canton:"ZH",country:"Schweiz",email:"n.keller@mail.com",tel:"+41 79 521 00 21",teams:["E-Juniorinnen"],p1Last:"Keller",p1First:"Sabine",p1Email:"s.keller@mail.com",p1Tel:"+41 79 522 00 22",p2Last:"Keller",p2First:"Andreas",p2Email:"a.keller@mail.com",p2Tel:"+41 79 523 00 23"},
  {id:153,lastName:"Weber",    firstName:"Lia",     pos:"RV",dob:"28.11.2015",nat:"CH",heimatort:"Herrliberg",  ahv:"756.1001.0004.04",pass:"A-3004",js:"JS-7004",fairgate:"FG-10153",street:"Riedweg 3",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"l.weber@mail.com",tel:"+41 79 531 00 31",teams:["E-Juniorinnen"],p1Last:"Weber",p1First:"Anja",p1Email:"a.weber@mail.com",p1Tel:"+41 79 532 00 32",p2Last:"Weber",p2First:"Urs",p2Email:"u.weber@mail.com",p2Tel:"+41 79 533 00 33"},
  {id:154,lastName:"Müller",   firstName:"Emma",    pos:"TW",dob:"05.04.2016",nat:"CH",heimatort:"Stäfa",        ahv:"756.1001.0005.05",pass:"A-3005",js:"JS-7005",fairgate:"FG-10154",street:"Dorfstrasse 16",plz:"8712",city:"Stäfa",canton:"ZH",country:"Schweiz",email:"e.mueller@mail.com",tel:"+41 79 541 00 41",teams:["E-Juniorinnen"],p1Last:"Müller",p1First:"Karin",p1Email:"k.mueller@mail.com",p1Tel:"+41 79 542 00 42",p2Last:"Müller",p2First:"Beat",p2Email:"b.mueller@mail.com",p2Tel:"+41 79 543 00 43"},
  {id:155,lastName:"Fischer",  firstName:"Leonie",  pos:"MF",dob:"22.06.2016",nat:"CH",heimatort:"Männedorf",    ahv:"756.1001.0006.06",pass:"A-3006",js:"JS-7006",fairgate:"FG-10155",street:"Schulweg 7",plz:"8708",city:"Männedorf",canton:"ZH",country:"Schweiz",email:"le.fischer@mail.com",tel:"+41 79 551 00 51",teams:["E-Juniorinnen"],p1Last:"Fischer",p1First:"Monika",p1Email:"mo.fischer@mail.com",p1Tel:"+41 79 552 00 52",p2Last:"Fischer",p2First:"Stefan",p2Email:"st.fischer@mail.com",p2Tel:"+41 79 553 00 53"},
  {id:156,lastName:"Brunner",  firstName:"Chiara",  pos:"LA",dob:"11.01.2016",nat:"IT",heimatort:"Zollikon",     ahv:"756.1001.0007.07",pass:"A-3007",js:"JS-7007",fairgate:"FG-10156",street:"Seeblick 2",plz:"8702",city:"Zollikon",canton:"ZH",country:"Schweiz",email:"c.brunner2@mail.com",tel:"+41 79 561 00 61",teams:["E-Juniorinnen"],p1Last:"Brunner",p1First:"Maria",p1Email:"ma.brunner@mail.com",p1Tel:"+41 79 562 00 62",p2Last:"Brunner",p2First:"Luca",p2Email:"lu.brunner@mail.com",p2Tel:"+41 79 563 00 63"},
  {id:157,lastName:"Schmid",   firstName:"Jana",    pos:"RM",dob:"30.08.2016",nat:"CH",heimatort:"Uetikon",      ahv:"756.1001.0008.08",pass:"A-3008",js:"JS-7008",fairgate:"FG-10157",street:"Kirchgasse 9",plz:"8707",city:"Uetikon",canton:"ZH",country:"Schweiz",email:"j.schmid2@mail.com",tel:"+41 79 571 00 71",teams:["E-Juniorinnen"],p1Last:"Schmid",p1First:"Eva",p1Email:"e.schmid@mail.com",p1Tel:"+41 79 572 00 72",p2Last:"Schmid",p2First:"Peter",p2Email:"p.schmid@mail.com",p2Tel:"+41 79 573 00 73"},
  {id:158,lastName:"Meier",    firstName:"Alina",   pos:"MF",dob:"17.05.2015",nat:"CH",heimatort:"Herrliberg",  ahv:"756.1001.0009.09",pass:"A-3009",js:"JS-7009",fairgate:"FG-10158",street:"Blumenweg 1",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"al.meier@mail.com",tel:"+41 79 581 00 81",teams:["E-Juniorinnen"],p1Last:"Meier",p1First:"Daniela",p1Email:"d.meier@mail.com",p1Tel:"+41 79 582 00 82",p2Last:"Meier",p2First:"Thomas",p2Email:"t.meier@mail.com",p2Tel:"+41 79 583 00 83"},
  {id:159,lastName:"Huber",    firstName:"Sina",    pos:"ZM",dob:"08.10.2015",nat:"CH",heimatort:"Meilen",       ahv:"756.1001.0010.10",pass:"A-3010",js:"JS-7010",fairgate:"FG-10159",street:"Lindenweg 5",plz:"8706",city:"Feldmeilen",canton:"ZH",country:"Schweiz",email:"s.huber2@mail.com",tel:"+41 79 591 00 91",teams:["E-Juniorinnen"],p1Last:"Huber",p1First:"Sandra",p1Email:"sa.huber@mail.com",p1Tel:"+41 79 592 00 92",p2Last:"Huber",p2First:"Markus",p2Email:"ma.huber@mail.com",p2Tel:"+41 79 593 00 93"},
  {id:160,lastName:"Zimmermann",firstName:"Lena",   pos:"LA",dob:"14.12.2015",nat:"DE",heimatort:"Küsnacht",     ahv:"756.1001.0011.11",pass:"A-3011",js:"JS-7011",fairgate:"FG-10160",street:"Waldweg 13",plz:"8700",city:"Küsnacht",canton:"ZH",country:"Schweiz",email:"le.zimmermann@mail.com",tel:"+41 79 601 00 01",teams:["E-Juniorinnen"],p1Last:"Zimmermann",p1First:"Nicole",p1Email:"ni.zimmermann@mail.com",p1Tel:"+41 79 602 00 02",p2Last:"Zimmermann",p2First:"Klaus",p2Email:"kl.zimmermann@mail.com",p2Tel:"+41 79 603 00 03"},
  {id:161,lastName:"Bauer",    firstName:"Sophie",  pos:"ST",dob:"25.03.2016",nat:"CH",heimatort:"Herrliberg",  ahv:"756.1001.0012.12",pass:"A-3012",js:"JS-7012",fairgate:"FG-10161",street:"Gartenstrasse 6",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"so.bauer@mail.com",tel:"+41 79 611 00 11",teams:["E-Juniorinnen"],p1Last:"Bauer",p1First:"Andrea",p1Email:"an.bauer@mail.com",p1Tel:"+41 79 612 00 12",p2Last:"Bauer",p2First:"Martin",p2Email:"ma.bauer@mail.com",p2Tel:"+41 79 613 00 13"},
  /* -- Trainer -- */
  {id:200, lastName:"Müller",  firstName:"Thomas",  pos:"-", dob:"15.03.1985", nat:"CH", heimatort:"Herrliberg",
   ahv:"", pass:"", js:"", fairgate:"",
   street:"Seestrasse 45", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"t.mueller@fch.ch", tel:"+41 79 600 11 22",
   teams:["Cc-Junioren"], rolle:"Trainer",
   p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:201, lastName:"Huber",   firstName:"Daniel",  pos:"-", dob:"22.07.1982", nat:"CH", heimatort:"Meilen",
   ahv:"", pass:"", js:"", fairgate:"",
   street:"Bergweg 8", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"d.huber@fch.ch", tel:"+41 79 600 33 44",
   teams:["Cc-Junioren"], rolle:"Co-Trainer",
   p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:202, lastName:"Bauer",   firstName:"Stefan",  pos:"-", dob:"10.06.1978", nat:"CH", heimatort:"Herrliberg",
   ahv:"", pass:"", js:"", fairgate:"",
   street:"Dorfstrasse 12", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"s.bauer@fch.ch", tel:"+41 79 600 55 66",
   teams:["1. Mannschaft Herren"], rolle:"Trainer",
   p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:203, lastName:"Zimmermann", firstName:"Sandra", pos:"-", dob:"03.09.1983", nat:"CH", heimatort:"Meilen",
   ahv:"", pass:"", js:"", fairgate:"",
   street:"Seefeldweg 3", plz:"8706", city:"Meilen", canton:"ZH", country:"Schweiz",
   email:"s.zimmermann@fch.ch", tel:"+41 79 600 77 88",
   teams:["1. Mannschaft Frauen"], rolle:"Trainerin",
   p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:204, lastName:"Weber",  firstName:"Markus",  pos:"-", dob:"25.04.1980", nat:"CH", heimatort:"Herrliberg",
   ahv:"", pass:"", js:"", fairgate:"",
   street:"Bergstrasse 7", plz:"8704", city:"Herrliberg", canton:"ZH", country:"Schweiz",
   email:"m.weber@fch.ch", tel:"+41 79 600 99 00",
   teams:["Ca-Junioren"], rolle:"Trainer",
   p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:220,lastName:"Roth",      firstName:"Patrick", pos:"-",dob:"12.04.1985",nat:"CH",heimatort:"Herrliberg",ahv:"",pass:"",js:"",fairgate:"",street:"Bergstrasse 3",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"p.roth@fch.ch",tel:"+41 79 700 22 01",teams:["2. Mannschaft Herren"],rolle:"Trainer",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:221,lastName:"Brunner",   firstName:"Andrea",  pos:"-",dob:"08.09.1982",nat:"CH",heimatort:"Küsnacht",  ahv:"",pass:"",js:"",fairgate:"",street:"Seeweg 7",    plz:"8700",city:"Küsnacht",  canton:"ZH",country:"Schweiz",email:"a.brunner@fch.ch",tel:"+41 79 700 22 02",teams:["Da-Junioren"],   rolle:"Trainer",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:222,lastName:"Meier",     firstName:"Simon",   pos:"-",dob:"14.06.1988",nat:"CH",heimatort:"Meilen",    ahv:"",pass:"",js:"",fairgate:"",street:"Dorfweg 12",   plz:"8706",city:"Feldmeilen",canton:"ZH",country:"Schweiz",email:"s.meier@fch.ch",  tel:"+41 79 700 22 03",teams:["Db-Junioren"],   rolle:"Trainer",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:223,lastName:"Keller",    firstName:"Stefan",  pos:"-",dob:"22.03.1979",nat:"CH",heimatort:"Stäfa",     ahv:"",pass:"",js:"",fairgate:"",street:"Hauptgasse 5", plz:"8712",city:"Stäfa",     canton:"ZH",country:"Schweiz",email:"st.keller@fch.ch",tel:"+41 79 700 22 04",teams:["Ba-Junioren"],   rolle:"Trainer",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:224,lastName:"Hofer",     firstName:"Nicole",  pos:"-",dob:"17.11.1984",nat:"CH",heimatort:"Herrliberg",ahv:"",pass:"",js:"",fairgate:"",street:"Wiesenweg 9",  plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"n.hofer@fch.ch",  tel:"+41 79 700 22 05",teams:["Bb-Junioren"],   rolle:"Trainerin",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:225,lastName:"Bär",       firstName:"Jonas",   pos:"-",dob:"05.07.1981",nat:"CH",heimatort:"Zollikon",  ahv:"",pass:"",js:"",fairgate:"",street:"Kirchweg 3",   plz:"8702",city:"Zollikon",  canton:"ZH",country:"Schweiz",email:"j.baer@fch.ch",   tel:"+41 79 700 22 06",teams:["A-Junioren"],    rolle:"Trainer",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:226,lastName:"Frei",      firstName:"Sabine",  pos:"-",dob:"29.01.1986",nat:"CH",heimatort:"Männedorf", ahv:"",pass:"",js:"",fairgate:"",street:"Lindenweg 4",  plz:"8708",city:"Männedorf", canton:"ZH",country:"Schweiz",email:"s.frei@fch.ch",    tel:"+41 79 700 22 07",teams:["C-Juniorinnen"], rolle:"Trainerin",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:227,lastName:"Gut",       firstName:"Miriam",  pos:"-",dob:"03.05.1990",nat:"CH",heimatort:"Herrliberg",ahv:"",pass:"",js:"",fairgate:"",street:"Gartenweg 6",  plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"m.gut@fch.ch",     tel:"+41 79 700 22 08",teams:["D-Juniorinnen"], rolle:"Trainerin",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:228,lastName:"Lüscher",   firstName:"Tanja",   pos:"-",dob:"18.08.1987",nat:"CH",heimatort:"Küsnacht",  ahv:"",pass:"",js:"",fairgate:"",street:"Seeblick 11",  plz:"8700",city:"Küsnacht",  canton:"ZH",country:"Schweiz",email:"t.luescher@fch.ch",tel:"+41 79 700 22 09",teams:["E-Juniorinnen"], rolle:"Trainerin",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  {id:229,lastName:"Sommer",    firstName:"Laura",   pos:"-",dob:"11.02.1992",nat:"CH",heimatort:"Meilen",    ahv:"",pass:"",js:"",fairgate:"",street:"Rosenweg 2",   plz:"8706",city:"Feldmeilen",canton:"ZH",country:"Schweiz",email:"l.sommer@fch.ch",  tel:"+41 79 700 22 10",teams:["F-Juniorinnen"], rolle:"Trainerin",p1Last:"",p1First:"",p1Email:"",p1Tel:"",p2Last:"",p2First:"",p2Email:"",p2Tel:""},
  /* D-Juniorinnen */
  {id:210,lastName:"Brunner",  firstName:"Lena",    pos:"MF",dob:"12.03.2013",nat:"CH",heimatort:"Herrliberg",ahv:"756.1234.5678.01",pass:"A-2101",js:"JS-6001",fairgate:"FG-10210",street:"Seestrasse 4",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"l.brunner@mail.com",tel:"+41 79 100 10 10",teams:["D-Juniorinnen"],p1Last:"Brunner",p1First:"Claudia",p1Email:"c.brunner@mail.com",p1Tel:"+41 79 200 20 20",p2Last:"Brunner",p2First:"Marc",p2Email:"m.brunner@mail.com",p2Tel:"+41 79 300 30 30"},
  {id:211,lastName:"Keller",   firstName:"Sara",    pos:"ST",dob:"05.07.2013",nat:"CH",heimatort:"Meilen",ahv:"756.2345.6789.02",pass:"A-2102",js:"JS-6002",fairgate:"FG-10211",street:"Dorfstrasse 8",plz:"8706",city:"Feldmeilen",canton:"ZH",country:"Schweiz",email:"s.keller@mail.com",tel:"+41 79 111 11 11",teams:["D-Juniorinnen"],p1Last:"Keller",p1First:"Beat",p1Email:"b.keller@mail.com",p1Tel:"+41 79 222 22 22",p2Last:"Keller",p2First:"Ursula",p2Email:"u.keller@mail.com",p2Tel:"+41 79 333 33 33"},
  {id:212,lastName:"Müller",   firstName:"Sophie",  pos:"LV",dob:"18.01.2014",nat:"CH",heimatort:"Küsnacht",ahv:"756.3456.7890.03",pass:"A-2103",js:"JS-6003",fairgate:"FG-10212",street:"Bergweg 12",plz:"8700",city:"Küsnacht",canton:"ZH",country:"Schweiz",email:"s.mueller@mail.com",tel:"+41 79 121 21 21",teams:["D-Juniorinnen"],p1Last:"Müller",p1First:"Peter",p1Email:"p.mueller@mail.com",p1Tel:"+41 79 232 32 32",p2Last:"Müller",p2First:"Irene",p2Email:"i.mueller@mail.com",p2Tel:"+41 79 343 43 43"},
  {id:213,lastName:"Schneider",firstName:"Lea",     pos:"RV",dob:"30.04.2013",nat:"CH",heimatort:"Herrliberg",ahv:"756.4567.8901.04",pass:"A-2104",js:"JS-6004",fairgate:"FG-10213",street:"Wiesenweg 3",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"l.schneider@mail.com",tel:"+41 79 131 31 31",teams:["D-Juniorinnen"],p1Last:"Schneider",p1First:"Hans",p1Email:"h.schneider@mail.com",p1Tel:"+41 79 242 42 42",p2Last:"Schneider",p2First:"Monika",p2Email:"m.schneider@mail.com",p2Tel:"+41 79 353 53 53"},
  {id:214,lastName:"Fischer",  firstName:"Mia",     pos:"ZM",dob:"22.09.2013",nat:"CH",heimatort:"Zollikon",ahv:"756.5678.9012.05",pass:"A-2105",js:"JS-6005",fairgate:"FG-10214",street:"Hauptstrasse 21",plz:"8702",city:"Zollikon",canton:"ZH",country:"Schweiz",email:"m.fischer@mail.com",tel:"+41 79 141 41 41",teams:["D-Juniorinnen"],p1Last:"Fischer",p1First:"Kurt",p1Email:"k.fischer@mail.com",p1Tel:"+41 79 252 52 52",p2Last:"Fischer",p2First:"Sandra",p2Email:"s.fischer@mail.com",p2Tel:"+41 79 363 63 63"},
  {id:215,lastName:"Meyer",    firstName:"Anna",    pos:"TW",dob:"14.06.2014",nat:"CH",heimatort:"Männedorf",ahv:"756.6789.0123.06",pass:"A-2106",js:"JS-6006",fairgate:"FG-10215",street:"Kirchgasse 5",plz:"8708",city:"Männedorf",canton:"ZH",country:"Schweiz",email:"a.meyer@mail.com",tel:"+41 79 151 51 51",teams:["D-Juniorinnen"],p1Last:"Meyer",p1First:"Thomas",p1Email:"t.meyer@mail.com",p1Tel:"+41 79 262 62 62",p2Last:"Meyer",p2First:"Lisa",p2Email:"l.meyer@mail.com",p2Tel:"+41 79 373 73 73"},
  {id:216,lastName:"Huber",    firstName:"Julia",   pos:"MF",dob:"08.11.2013",nat:"CH",heimatort:"Herrliberg",ahv:"756.7890.1234.07",pass:"A-2107",js:"JS-6007",fairgate:"FG-10216",street:"Riedstrasse 9",plz:"8704",city:"Herrliberg",canton:"ZH",country:"Schweiz",email:"j.huber@mail.com",tel:"+41 79 161 61 61",teams:["D-Juniorinnen"],p1Last:"Huber",p1First:"Daniel",p1Email:"d.huber@mail.com",p1Tel:"+41 79 272 72 72",p2Last:"Huber",p2First:"Franziska",p2Email:"f.huber@mail.com",p2Tel:"+41 79 383 83 83"},
  {id:217,lastName:"Zimmermann",firstName:"Nora",   pos:"LA",dob:"26.02.2014",nat:"CH",heimatort:"Stäfa",ahv:"756.8901.2345.08",pass:"A-2108",js:"JS-6008",fairgate:"FG-10217",street:"Seeblickweg 2",plz:"8712",city:"Stäfa",canton:"ZH",country:"Schweiz",email:"n.zimmermann@mail.com",tel:"+41 79 171 71 71",teams:["D-Juniorinnen"],p1Last:"Zimmermann",p1First:"Rolf",p1Email:"r.zimmermann@mail.com",p1Tel:"+41 79 282 82 82",p2Last:"Zimmermann",p2First:"Eva",p2Email:"e.zimmermann@mail.com",p2Tel:"+41 79 393 93 93"}
];
/* Computed name field for backward compat */
ROSTER.forEach((p,i)=>{ p.name=`${p.firstName} ${p.lastName}`; p.address=`${p.street}, ${p.plz} ${p.city}`; p.parent=`${p.p1First} ${p.p1Last} / ${p.p1Tel}`; p.gruppe=p.teams[0]; if(!p.rueckennr) p.rueckennr=null; });

/* -- BENUTZERKONTEN mit Mehrfach-Rollen (Szenario 2 + 3) -- */
const USER_ACCOUNTS={
  trainer:    {name:"Thomas Müller",  rollen:["trainer"],   primaryRole:"trainer",  kinder:[],trainerTeams:["Cc-Junioren"]},
  spieler:    {name:"Luca Meier",     rollen:["spieler"],   primaryRole:"spieler",  kinder:[]},
  eltern:     {name:"Anna Meier",     rollen:["eltern"],    primaryRole:"eltern",   kinder:[{name:"Luca Meier",team:"Cc-Junioren",rosterId:1},{name:"Nina Meier",team:"E-Juniorinnen",rosterId:152}]},
  /* Szenario 2: Thomas Müller = Trainer + Spieler + Vater */
  multi_trainer:{name:"Thomas Müller",rollen:["trainer","spieler","eltern"],primaryRole:"trainer",kinder:[{name:"Lukas Müller",team:"Cc-Junioren"}],trainerTeams:["Cc-Junioren","A-Junioren"]},
  /* Szenario 3: Beat Keller = Elternteil zweier Kinder */
  multi_eltern: {name:"Beat Keller",  rollen:["eltern"],   primaryRole:"eltern",   kinder:[{name:"Noah Keller",team:"Cc-Junioren",rosterId:2},{name:"Sara Keller",team:"D-Juniorinnen",rosterId:211}]},
  administrator:{name:"Admin System", rollen:["administrator"],primaryRole:"administrator",kinder:[]},
  administration:{name:"Sandra Berger",rollen:["administration"],primaryRole:"administration",kinder:[]},
  funktionaer:  {name:"Beat Zimmermann",rollen:["funktionaer"],primaryRole:"funktionaer",kinder:[]},
  /* -- Weitere Trainer -- */
  trainer_herren:   {name:"Stefan Bauer",     rollen:["trainer","spieler"],primaryRole:"trainer",  kinder:[],trainerTeams:["1. Mannschaft Herren","2. Mannschaft Herren"],rosterId:202,team:"1. Mannschaft Herren"},
  trainer_frauen:   {name:"Sandra Zimmermann",rollen:["trainer"],primaryRole:"trainer",  kinder:[],trainerTeams:["1. Mannschaft Frauen"],rosterId:203},
  trainer_ca:       {name:"Markus Weber",     rollen:["trainer"],primaryRole:"trainer",  kinder:[],trainerTeams:["Ca-Junioren","Cc-Junioren"],rosterId:204},
  /* -- Weitere Spieler -- */
  spieler_herren:   {name:"Tim Keller",       rollen:["spieler"],primaryRole:"spieler",  kinder:[],rosterId:7,  team:"1. Mannschaft Herren"},
  spieler_frauen:   {name:"Laura Keller",     rollen:["spieler"],primaryRole:"spieler",  kinder:[],rosterId:37, team:"1. Mannschaft Frauen"},
  spieler_da:       {name:"Michael Brunschweiger",rollen:["spieler"],primaryRole:"spieler",kinder:[],rosterId:100,team:"Da-Junioren"},
  /* -- Weitere Eltern -- */
  eltern_herren:    {name:"Marianne Keller",  rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Tim Keller",team:"1. Mannschaft Herren",rosterId:7}]},
  eltern_ca:        {name:"Petra Weber",      rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Jonas Weber",team:"Ca-Junioren",rosterId:80}]},
  eltern_multi:     {name:"Claudia Brunner",  rollen:["eltern"], primaryRole:"eltern",   kinder:[{name:"Simon Brunner",team:"Da-Junioren",rosterId:101},{name:"Lena Brunner",team:"Bb-Junioren",rosterId:66}]},
};

const SCHEDULE=[
  {team:"Cc-Junioren",id:1,date:"Sa 24.05.",time:"10:00",opponent:"FC Küsnacht",  home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Ostschweizer Cup", liga:"U12 Cup",    spielNr:"2026-CUP-0814", status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Beat Zimmermann",  delegierter:"-", notes:"",                   treffpunkt:"09:15 Sportanlage Aabach", stats:null},
  {team:"Cc-Junioren",id:2,date:"Mi 28.05.",time:"17:30",opponent:"SC Männedorf", home:false,venue:"Sportplatz Männedorf",              venueAddr:"Seefeldstrasse 4, 8708 Männedorf",  comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-1023",  status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Thomas Huber",     delegierter:"-", notes:"Auswärtsspiel - Parkplatz beim Sportplatz nutzen", treffpunkt:"16:45 Bahnhof Meilen", stats:null},
  {team:"Cc-Junioren",id:3,date:"Sa 07.06.",time:"09:30",opponent:"FC Rapperswil",home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-1089",  status:"Angesetzt",  result:null, htResult:null, att:null,  schiedsrichter:"Sandra Meier",     delegierter:"-", notes:"",                   treffpunkt:"09:00 Sportanlage Aabach", stats:null},
  {team:"Cc-Junioren",id:4,date:"Sa 17.05.",time:"10:00",opponent:"FC Thalwil",   home:false,venue:"Sportplatz Thalwil",                venueAddr:"Dorfstrasse 22, 8800 Thalwil",      comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-0987",  status:"Gespielt",   result:"2:1",htResult:"1:0",att:16, schiedsrichter:"Marco Frei",       delegierter:"-", notes:"",                   treffpunkt:"09:15 Sportanlage Aabach",
    stats:{
      kader:[1,2,3,4,5,6],
      tore:[{spieler:"Luca Meier",min:23,eigentor:false},{spieler:"Finn Bauer",min:61,eigentor:false}],
      assists:[{spieler:"Noah Keller",min:23},{spieler:"Luca Meier",min:61}],
      karten:[{spieler:"Leon Fischer",min:44,type:"gelb"}],
      wechsel:[{raus:"Jan Schmid",rein:"Elias Wolf",min:50}],
    }},
  {team:"Cc-Junioren",id:5,date:"Mi 14.05.",time:"17:30",opponent:"SC Wädenswil", home:true, venue:"Sportanlage Aabach, Herrliberg",   venueAddr:"Aabachstrasse 10, 8704 Herrliberg", comp:"U12 Liga A",          liga:"U12 Liga A", spielNr:"2026-LA-0944",  status:"Gespielt",   result:"1:1",htResult:"0:1",att:15, schiedsrichter:"Lukas Benz",       delegierter:"-", notes:"",                   treffpunkt:"17:00 Sportanlage Aabach",
    stats:{
      kader:[1,2,4,5,6],
      tore:[{spieler:"Luca Meier",min:78,eigentor:false}],
      assists:[{spieler:"Noah Keller",min:78}],
      karten:[],
      wechsel:[{raus:"Leon Fischer",rein:"Jan Schmid",min:55}],
    }},
,
  {id:7,team:"1. Mannschaft Herren",date:"Sa 03.05.",time:"15:00",opponent:"FC Horgen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1007",status:"Gespielt",result:"1:0",htResult:"1:2",att:11,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"14:30 Sportanlage Aabach",stats:null},
  {id:8,team:"1. Mannschaft Herren",date:"Mi 07.05.",time:"17:00",opponent:"FC Rüti",home:false,venue:"Sportplatz Rüti",venueAddr:"Rütistrasse 6, 8630 Rüti",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1008",status:"Gespielt",result:"3:2",htResult:"1:1",att:18,schiedsrichter:"Nadine Schmid",delegierter:"-",notes:"",treffpunkt:"16:15 Bahnhof Herrliberg",stats:null},
  {id:9,team:"1. Mannschaft Herren",date:"Sa 10.05.",time:"15:00",opponent:"SC Wädenswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1009",status:"Gespielt",result:"2:1",htResult:"2:1",att:17,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"14:30 Sportanlage Aabach",stats:null},
  {id:10,team:"1. Mannschaft Herren",date:"Sa 24.05.",time:"15:00",opponent:"FC Rapperswil",home:false,venue:"Sportanlage Grünfeld, Rapperswil",venueAddr:"Grünfeldweg 3, 8640 Rapperswil",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1010",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"14:15 Bahnhof Herrliberg",stats:null},
  {id:11,team:"1. Mannschaft Herren",date:"Mi 28.05.",time:"17:00",opponent:"SC Männedorf",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1011",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Oliver Frei",delegierter:"-",notes:"",treffpunkt:"16:30 Sportanlage Aabach",stats:null},
  {id:12,team:"1. Mannschaft Herren",date:"Sa 31.05.",time:"15:00",opponent:"FC Uster",home:false,venue:"Sportplatz Buchholz, Uster",venueAddr:"Buchholzstrasse 10, 8610 Uster",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1012",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Oliver Frei",delegierter:"-",notes:"",treffpunkt:"14:15 Bahnhof Herrliberg",stats:null},
  {id:13,team:"1. Mannschaft Herren",date:"Sa 07.06.",time:"15:00",opponent:"FC Adliswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1013",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"14:30 Sportanlage Aabach",stats:null},
  {id:14,team:"2. Mannschaft Herren",date:"Sa 03.05.",time:"14:00",opponent:"FC Uster",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1014",status:"Gespielt",result:"2:1",htResult:"0:1",att:18,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"13:30 Sportanlage Aabach",stats:null},
  {id:15,team:"2. Mannschaft Herren",date:"Mi 07.05.",time:"17:00",opponent:"FC Horgen",home:false,venue:"Sportanlage Langacker, Horgen",venueAddr:"Langackerstrasse 8, 8810 Horgen",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1015",status:"Gespielt",result:"1:2",htResult:"0:0",att:16,schiedsrichter:"Beat Zimmermann",delegierter:"-",notes:"",treffpunkt:"16:15 Bahnhof Herrliberg",stats:null},
  {id:16,team:"2. Mannschaft Herren",date:"Sa 10.05.",time:"14:00",opponent:"SC Wädenswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1016",status:"Gespielt",result:"2:0",htResult:"2:1",att:10,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"13:30 Sportanlage Aabach",stats:null},
  {id:17,team:"2. Mannschaft Herren",date:"Sa 24.05.",time:"14:00",opponent:"SC Männedorf",home:false,venue:"Sportplatz Männedorf",venueAddr:"Seefeldstrasse 4, 8708 Männedorf",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1017",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"13:15 Bahnhof Herrliberg",stats:null},
  {id:18,team:"2. Mannschaft Herren",date:"Mi 28.05.",time:"17:00",opponent:"SC Embrach",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1018",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Stefan Vogel",delegierter:"-",notes:"",treffpunkt:"16:30 Sportanlage Aabach",stats:null},
  {id:19,team:"2. Mannschaft Herren",date:"Sa 31.05.",time:"14:00",opponent:"FC Adliswil",home:false,venue:"Sportanlage Adliswil",venueAddr:"Sportstrasse 2, 8134 Adliswil",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1019",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Nadine Schmid",delegierter:"-",notes:"",treffpunkt:"13:15 Bahnhof Herrliberg",stats:null},
  {id:20,team:"2. Mannschaft Herren",date:"Sa 07.06.",time:"14:00",opponent:"FC Thalwil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"3. Liga",liga:"3. Liga",spielNr:"2026-2MH-1020",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"13:30 Sportanlage Aabach",stats:null},
  {id:21,team:"1. Mannschaft Frauen",date:"Sa 03.05.",time:"14:00",opponent:"SC Wädenswil Frauen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1021",status:"Gespielt",result:"1:1",htResult:"2:0",att:13,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"13:30 Sportanlage Aabach",stats:null},
  {id:22,team:"1. Mannschaft Frauen",date:"Mi 07.05.",time:"19:00",opponent:"FC Uster Frauen",home:false,venue:"Sportplatz Buchholz, Uster",venueAddr:"Buchholzstrasse 10, 8610 Uster",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1022",status:"Gespielt",result:"3:2",htResult:"1:2",att:17,schiedsrichter:"Oliver Frei",delegierter:"-",notes:"",treffpunkt:"18:15 Bahnhof Herrliberg",stats:null},
  {id:23,team:"1. Mannschaft Frauen",date:"Sa 10.05.",time:"14:00",opponent:"SC Männedorf Frauen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1023",status:"Gespielt",result:"1:0",htResult:"2:1",att:12,schiedsrichter:"Beat Zimmermann",delegierter:"-",notes:"",treffpunkt:"13:30 Sportanlage Aabach",stats:null},
  {id:24,team:"1. Mannschaft Frauen",date:"Sa 24.05.",time:"14:00",opponent:"FC Thalwil Frauen",home:false,venue:"Sportplatz Thalwil",venueAddr:"Dorfstrasse 22, 8800 Thalwil",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1024",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"13:15 Bahnhof Herrliberg",stats:null},
  {id:25,team:"1. Mannschaft Frauen",date:"Mi 28.05.",time:"19:00",opponent:"FC Horgen Frauen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1025",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Beat Zimmermann",delegierter:"-",notes:"",treffpunkt:"18:30 Sportanlage Aabach",stats:null},
  {id:26,team:"1. Mannschaft Frauen",date:"Sa 31.05.",time:"14:00",opponent:"FC Küsnacht Frauen",home:false,venue:"Sportplatz Goldbach, Küsnacht",venueAddr:"Goldbachstrasse 12, 8700 Küsnacht",comp:"1. Liga Frauen",liga:"1. Liga Frauen",spielNr:"2026-1MF-1026",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"13:15 Bahnhof Herrliberg",stats:null},
  {id:27,team:"Ba-Junioren",date:"Sa 03.05.",time:"10:00",opponent:"FC Uster",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1027",status:"Gespielt",result:"2:0",htResult:"2:1",att:10,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:28,team:"Ba-Junioren",date:"Mi 07.05.",time:"17:30",opponent:"FC Stäfa",home:false,venue:"Sportanlage Stäfa",venueAddr:"Seestrasse 40, 8712 Stäfa",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1028",status:"Gespielt",result:"1:1",htResult:"2:0",att:18,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"16:45 Bahnhof Herrliberg",stats:null},
  {id:29,team:"Ba-Junioren",date:"Sa 10.05.",time:"10:00",opponent:"FC Küsnacht",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1029",status:"Gespielt",result:"4:1",htResult:"1:2",att:10,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:30,team:"Ba-Junioren",date:"Sa 24.05.",time:"10:00",opponent:"SC Männedorf",home:false,venue:"Sportplatz Männedorf",venueAddr:"Seefeldstrasse 4, 8708 Männedorf",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1030",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Patrick Gross",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:31,team:"Ba-Junioren",date:"Mi 28.05.",time:"17:30",opponent:"FC Hombrechtikon",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1031",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"17:00 Sportanlage Aabach",stats:null},
  {id:32,team:"Ba-Junioren",date:"Sa 31.05.",time:"10:00",opponent:"FC Thalwil",home:false,venue:"Sportplatz Thalwil",venueAddr:"Dorfstrasse 22, 8800 Thalwil",comp:"U16 Liga A",liga:"U16 Liga A",spielNr:"2026-BAJ-1032",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Nadine Schmid",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:33,team:"Bb-Junioren",date:"Sa 03.05.",time:"10:00",opponent:"FC Thalwil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1033",status:"Gespielt",result:"1:0",htResult:"0:1",att:12,schiedsrichter:"Oliver Frei",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:34,team:"Bb-Junioren",date:"Mi 07.05.",time:"17:30",opponent:"FC Horgen",home:false,venue:"Sportanlage Langacker, Horgen",venueAddr:"Langackerstrasse 8, 8810 Horgen",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1034",status:"Gespielt",result:"0:0",htResult:"1:0",att:11,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"16:45 Bahnhof Herrliberg",stats:null},
  {id:35,team:"Bb-Junioren",date:"Sa 10.05.",time:"10:00",opponent:"FC Wädenswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1035",status:"Gespielt",result:"1:0",htResult:"0:0",att:12,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:36,team:"Bb-Junioren",date:"Sa 24.05.",time:"10:00",opponent:"FC Adliswil",home:false,venue:"Sportanlage Adliswil",venueAddr:"Sportstrasse 2, 8134 Adliswil",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1036",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:37,team:"Bb-Junioren",date:"Mi 28.05.",time:"17:30",opponent:"SC Embrach",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1037",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"17:00 Sportanlage Aabach",stats:null},
  {id:38,team:"Bb-Junioren",date:"Sa 31.05.",time:"10:00",opponent:"SC Männedorf",home:false,venue:"Sportplatz Männedorf",venueAddr:"Seefeldstrasse 4, 8708 Männedorf",comp:"U16 Liga B",liga:"U16 Liga B",spielNr:"2026-BBJ-1038",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:39,team:"Ca-Junioren",date:"Sa 03.05.",time:"10:00",opponent:"SC Wädenswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1039",status:"Gespielt",result:"1:3",htResult:"1:2",att:15,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:40,team:"Ca-Junioren",date:"Mi 07.05.",time:"17:00",opponent:"FC Rapperswil",home:false,venue:"Sportanlage Grünfeld, Rapperswil",venueAddr:"Grünfeldweg 3, 8640 Rapperswil",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1040",status:"Gespielt",result:"2:3",htResult:"1:0",att:18,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"16:15 Bahnhof Herrliberg",stats:null},
  {id:41,team:"Ca-Junioren",date:"Sa 10.05.",time:"10:00",opponent:"FC Thalwil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1041",status:"Gespielt",result:"3:0",htResult:"2:1",att:10,schiedsrichter:"Stefan Vogel",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:42,team:"Ca-Junioren",date:"Sa 24.05.",time:"10:00",opponent:"FC Küsnacht",home:false,venue:"Sportplatz Goldbach, Küsnacht",venueAddr:"Goldbachstrasse 12, 8700 Küsnacht",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1042",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:43,team:"Ca-Junioren",date:"Mi 28.05.",time:"17:00",opponent:"SC Männedorf",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1043",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"16:30 Sportanlage Aabach",stats:null},
  {id:44,team:"Ca-Junioren",date:"Sa 31.05.",time:"10:00",opponent:"FC Uster",home:false,venue:"Sportplatz Buchholz, Uster",venueAddr:"Buchholzstrasse 10, 8610 Uster",comp:"U15 Liga A",liga:"U15 Liga A",spielNr:"2026-CAJ-1044",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:45,team:"Da-Junioren",date:"Sa 03.05.",time:"10:00",opponent:"FC Thalwil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1045",status:"Gespielt",result:"1:0",htResult:"1:0",att:15,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:46,team:"Da-Junioren",date:"Mi 07.05.",time:"17:00",opponent:"FC Uster",home:false,venue:"Sportplatz Buchholz, Uster",venueAddr:"Buchholzstrasse 10, 8610 Uster",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1046",status:"Gespielt",result:"4:2",htResult:"1:1",att:13,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"16:15 Bahnhof Herrliberg",stats:null},
  {id:47,team:"Da-Junioren",date:"Sa 10.05.",time:"10:00",opponent:"FC Stäfa",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1047",status:"Gespielt",result:"1:3",htResult:"0:1",att:13,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:48,team:"Da-Junioren",date:"Sa 24.05.",time:"10:00",opponent:"SC Männedorf",home:false,venue:"Sportplatz Männedorf",venueAddr:"Seefeldstrasse 4, 8708 Männedorf",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1048",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:49,team:"Da-Junioren",date:"Mi 28.05.",time:"17:00",opponent:"FC Hombrechtikon",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1049",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Stefan Vogel",delegierter:"-",notes:"",treffpunkt:"16:30 Sportanlage Aabach",stats:null},
  {id:50,team:"Da-Junioren",date:"Sa 31.05.",time:"10:00",opponent:"FC Küsnacht",home:false,venue:"Sportplatz Goldbach, Küsnacht",venueAddr:"Goldbachstrasse 12, 8700 Küsnacht",comp:"U13 Liga A",liga:"U13 Liga A",spielNr:"2026-DAJ-1050",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:51,team:"Db-Junioren",date:"Sa 03.05.",time:"10:00",opponent:"FC Uster",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1051",status:"Gespielt",result:"1:2",htResult:"1:1",att:14,schiedsrichter:"Thomas Huber",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:52,team:"Db-Junioren",date:"Mi 07.05.",time:"17:00",opponent:"FC Wädenswil",home:false,venue:"Sportanlage Eidmatt, Wädenswil",venueAddr:"Eidmattstrasse 5, 8820 Wädenswil",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1052",status:"Gespielt",result:"0:1",htResult:"0:0",att:15,schiedsrichter:"Patrick Gross",delegierter:"-",notes:"",treffpunkt:"16:15 Bahnhof Herrliberg",stats:null},
  {id:53,team:"Db-Junioren",date:"Sa 10.05.",time:"10:00",opponent:"FC Adliswil",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1053",status:"Gespielt",result:"0:1",htResult:"2:0",att:14,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:54,team:"Db-Junioren",date:"Sa 24.05.",time:"10:00",opponent:"FC Rüti",home:false,venue:"Sportplatz Rüti",venueAddr:"Rütistrasse 6, 8630 Rüti",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1054",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:55,team:"Db-Junioren",date:"Mi 28.05.",time:"17:00",opponent:"SC Embrach",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1055",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"16:30 Sportanlage Aabach",stats:null},
  {id:56,team:"Db-Junioren",date:"Sa 31.05.",time:"10:00",opponent:"FC Horgen",home:false,venue:"Sportanlage Langacker, Horgen",venueAddr:"Langackerstrasse 8, 8810 Horgen",comp:"U13 Liga B",liga:"U13 Liga B",spielNr:"2026-DBJ-1056",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Oliver Frei",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:57,team:"C-Juniorinnen",date:"Sa 03.05.",time:"10:00",opponent:"SC Männedorf Mädchen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Mädchen A",liga:"U15 Mädchen A",spielNr:"2026-CJI-1057",status:"Gespielt",result:"0:0",htResult:"0:0",att:13,schiedsrichter:"Stefan Vogel",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:58,team:"C-Juniorinnen",date:"Mi 07.05.",time:"16:00",opponent:"FC Thalwil Mädchen",home:false,venue:"Sportplatz Thalwil",venueAddr:"Dorfstrasse 22, 8800 Thalwil",comp:"U15 Mädchen A",liga:"U15 Mädchen A",spielNr:"2026-CJI-1058",status:"Gespielt",result:"3:0",htResult:"0:1",att:15,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"15:15 Bahnhof Herrliberg",stats:null},
  {id:59,team:"C-Juniorinnen",date:"Sa 10.05.",time:"10:00",opponent:"FC Stäfa Mädchen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Mädchen A",liga:"U15 Mädchen A",spielNr:"2026-CJI-1059",status:"Gespielt",result:"1:3",htResult:"2:0",att:12,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:60,team:"C-Juniorinnen",date:"Sa 24.05.",time:"10:00",opponent:"FC Uster Mädchen",home:false,venue:"Sportplatz Buchholz, Uster",venueAddr:"Buchholzstrasse 10, 8610 Uster",comp:"U15 Mädchen A",liga:"U15 Mädchen A",spielNr:"2026-CJI-1060",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:61,team:"C-Juniorinnen",date:"Mi 28.05.",time:"16:00",opponent:"FC Küsnacht Mädchen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U15 Mädchen A",liga:"U15 Mädchen A",spielNr:"2026-CJI-1061",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"15:30 Sportanlage Aabach",stats:null},
  {id:62,team:"F-Juniorinnen",date:"Sa 03.05.",time:"10:00",opponent:"FC Hombrechtikon",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U9 Mädchen",liga:"U9 Mädchen",spielNr:"2026-FJI-1062",status:"Gespielt",result:"2:1",htResult:"2:1",att:18,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:63,team:"F-Juniorinnen",date:"Mi 07.05.",time:"16:00",opponent:"FC Stäfa",home:false,venue:"Sportanlage Stäfa",venueAddr:"Seestrasse 40, 8712 Stäfa",comp:"U9 Mädchen",liga:"U9 Mädchen",spielNr:"2026-FJI-1063",status:"Gespielt",result:"3:0",htResult:"2:1",att:14,schiedsrichter:"Sandra Meier",delegierter:"-",notes:"",treffpunkt:"15:15 Bahnhof Herrliberg",stats:null},
  {id:64,team:"F-Juniorinnen",date:"Sa 10.05.",time:"10:00",opponent:"FC Uetikon",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U9 Mädchen",liga:"U9 Mädchen",spielNr:"2026-FJI-1064",status:"Gespielt",result:"0:1",htResult:"1:2",att:17,schiedsrichter:"Marco Frei",delegierter:"-",notes:"",treffpunkt:"09:30 Sportanlage Aabach",stats:null},
  {id:65,team:"F-Juniorinnen",date:"Sa 24.05.",time:"10:00",opponent:"SC Männedorf",home:false,venue:"Sportplatz Männedorf",venueAddr:"Seefeldstrasse 4, 8708 Männedorf",comp:"U9 Mädchen",liga:"U9 Mädchen",spielNr:"2026-FJI-1065",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"09:15 Bahnhof Herrliberg",stats:null},
  {id:66,team:"F-Juniorinnen",date:"Mi 28.05.",time:"16:00",opponent:"FC Küsnacht",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"U9 Mädchen",liga:"U9 Mädchen",spielNr:"2026-FJI-1066",status:"Angesetzt",result:null,htResult:null,att:null,schiedsrichter:"Andrea Keller",delegierter:"-",notes:"",treffpunkt:"15:30 Sportanlage Aabach",stats:null},
];

/* -- GLOBAL Rückennummern-Cache (wird aus Storage geladen) -- */
const NR_CACHE={data:Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""]))};
(async()=>{
  try{
    const res=await window.storage.get("rueckennrn");
    if(res){const d=JSON.parse(res.value);Object.assign(NR_CACHE.data,d);}
  }catch(e){}
})();
function getNr(id){return NR_CACHE.data[id]||"";}

const TABLES={
  "Cc-Junioren":[
    {rank:1,team:"FC Küsnacht",   sp:12,s:9,u:2,n:1,tore:"34:12",diff:22, pts:29,me:false},
    {rank:2,team:"FC Herrliberg", sp:12,s:8,u:2,n:2,tore:"28:14",diff:14, pts:26,me:true},
    {rank:3,team:"SC Männedorf",  sp:12,s:6,u:3,n:3,tore:"24:18",diff:6,  pts:21,me:false},
    {rank:4,team:"FC Thalwil",    sp:12,s:5,u:2,n:5,tore:"20:24",diff:-4, pts:17,me:false},
    {rank:5,team:"SC Wädenswil",  sp:12,s:3,u:3,n:6,tore:"16:28",diff:-12,pts:12,me:false},
    {rank:6,team:"FC Rapperswil", sp:12,s:1,u:2,n:9,tore:"10:36",diff:-26,pts:5, me:false},
  ],
  "1. Mannschaft Herren":[
    {rank:1,team:"FC Küsnacht",   sp:18,s:14,u:2,n:2,tore:"48:18",diff:30,pts:44,me:false},
    {rank:2,team:"SC Männedorf",  sp:18,s:11,u:3,n:4,tore:"38:22",diff:16,pts:36,me:false},
    {rank:3,team:"FC Herrliberg", sp:18,s:10,u:4,n:4,tore:"35:24",diff:11,pts:34,me:true},
    {rank:4,team:"FC Thalwil",    sp:18,s:9, u:2,n:7,tore:"30:28",diff:2, pts:29,me:false},
    {rank:5,team:"SC Wädenswil",  sp:18,s:7, u:4,n:7,tore:"28:32",diff:-4,pts:25,me:false},
    {rank:6,team:"FC Uster",      sp:18,s:5, u:3,n:10,tore:"22:40",diff:-18,pts:18,me:false},
    {rank:7,team:"FC Horgen",     sp:18,s:4, u:2,n:12,tore:"18:44",diff:-26,pts:14,me:false},
    {rank:8,team:"FC Rüti",       sp:18,s:2, u:2,n:14,tore:"12:53",diff:-41,pts:8, me:false},
  ],
  "2. Mannschaft Herren":[
    {rank:1,team:"FC Adliswil",   sp:16,s:12,u:1,n:3,tore:"42:16",diff:26,pts:37,me:false},
    {rank:2,team:"FC Herrliberg", sp:16,s:10,u:2,n:4,tore:"35:20",diff:15,pts:32,me:true},
    {rank:3,team:"SC Embrach",    sp:16,s:9, u:2,n:5,tore:"32:24",diff:8, pts:29,me:false},
    {rank:4,team:"SC Männedorf",  sp:16,s:8, u:3,n:5,tore:"28:26",diff:2, pts:27,me:false},
    {rank:5,team:"FC Thalwil",    sp:16,s:6, u:3,n:7,tore:"24:30",diff:-6,pts:21,me:false},
    {rank:6,team:"FC Wädenswil",  sp:16,s:4, u:2,n:10,tore:"18:38",diff:-20,pts:14,me:false},
    {rank:7,team:"FC Uster",      sp:16,s:2, u:1,n:13,tore:"12:46",diff:-34,pts:7, me:false},
  ],
  "1. Mannschaft Frauen":[
    {rank:1,team:"FC Uster",      sp:14,s:11,u:2,n:1,tore:"40:12",diff:28,pts:35,me:false},
    {rank:2,team:"FC Herrliberg", sp:14,s:9, u:3,n:2,tore:"34:18",diff:16,pts:30,me:true},
    {rank:3,team:"FC Thalwil",    sp:14,s:8, u:2,n:4,tore:"28:22",diff:6, pts:26,me:false},
    {rank:4,team:"SC Männedorf",  sp:14,s:6, u:3,n:5,tore:"24:26",diff:-2,pts:21,me:false},
    {rank:5,team:"SC Wädenswil",  sp:14,s:4, u:2,n:8,tore:"18:34",diff:-16,pts:14,me:false},
    {rank:6,team:"FC Horgen",     sp:14,s:2, u:0,n:12,tore:"10:42",diff:-32,pts:6, me:false},
  ],
  "Ba-Junioren":[
    {rank:1,team:"FC Küsnacht",   sp:10,s:8,u:1,n:1,tore:"28:10",diff:18,pts:25,me:false},
    {rank:2,team:"FC Stäfa",      sp:10,s:7,u:2,n:1,tore:"24:12",diff:12,pts:23,me:false},
    {rank:3,team:"FC Herrliberg", sp:10,s:6,u:1,n:3,tore:"22:16",diff:6, pts:19,me:true},
    {rank:4,team:"SC Männedorf",  sp:10,s:4,u:2,n:4,tore:"16:18",diff:-2,pts:14,me:false},
    {rank:5,team:"FC Hombrechtikon",sp:10,s:2,u:2,n:6,tore:"12:26",diff:-14,pts:8,me:false},
    {rank:6,team:"FC Uster",      sp:10,s:1,u:0,n:9,tore:"8:28", diff:-20,pts:3, me:false},
  ],
  "Bb-Junioren":[
    {rank:1,team:"FC Herrliberg", sp:10,s:7,u:2,n:1,tore:"26:12",diff:14,pts:23,me:true},
    {rank:2,team:"FC Horgen",     sp:10,s:7,u:1,n:2,tore:"25:14",diff:11,pts:22,me:false},
    {rank:3,team:"SC Männedorf",  sp:10,s:5,u:3,n:2,tore:"20:16",diff:4, pts:18,me:false},
    {rank:4,team:"FC Adliswil",   sp:10,s:4,u:1,n:5,tore:"16:20",diff:-4,pts:13,me:false},
    {rank:5,team:"FC Wädenswil",  sp:10,s:2,u:2,n:6,tore:"12:24",diff:-12,pts:8,me:false},
    {rank:6,team:"FC Rüti",       sp:10,s:1,u:1,n:8,tore:"8:30", diff:-22,pts:4, me:false},
  ],
  "Ca-Junioren":[
    {rank:1,team:"FC Thalwil",    sp:10,s:8,u:1,n:1,tore:"30:10",diff:20,pts:25,me:false},
    {rank:2,team:"FC Herrliberg", sp:10,s:7,u:2,n:1,tore:"26:12",diff:14,pts:23,me:true},
    {rank:3,team:"FC Küsnacht",   sp:10,s:5,u:2,n:3,tore:"20:16",diff:4, pts:17,me:false},
    {rank:4,team:"SC Wädenswil",  sp:10,s:4,u:1,n:5,tore:"16:22",diff:-6,pts:13,me:false},
    {rank:5,team:"FC Rapperswil", sp:10,s:2,u:2,n:6,tore:"12:26",diff:-14,pts:8,me:false},
    {rank:6,team:"FC Uster",      sp:10,s:0,u:2,n:8,tore:"6:30", diff:-24,pts:2, me:false},
  ],
  "Da-Junioren":[
    {rank:1,team:"FC Herrliberg", sp:10,s:8,u:1,n:1,tore:"32:10",diff:22,pts:25,me:true},
    {rank:2,team:"FC Stäfa",      sp:10,s:7,u:2,n:1,tore:"28:14",diff:14,pts:23,me:false},
    {rank:3,team:"FC Küsnacht",   sp:10,s:5,u:3,n:2,tore:"22:18",diff:4, pts:18,me:false},
    {rank:4,team:"SC Männedorf",  sp:10,s:4,u:1,n:5,tore:"16:22",diff:-6,pts:13,me:false},
    {rank:5,team:"FC Hombrechtikon",sp:10,s:2,u:1,n:7,tore:"10:28",diff:-18,pts:7,me:false},
    {rank:6,team:"FC Uster",      sp:10,s:1,u:0,n:9,tore:"8:34", diff:-26,pts:3, me:false},
  ],
  "Db-Junioren":[
    {rank:1,team:"SC Männedorf",  sp:10,s:8,u:2,n:0,tore:"30:8", diff:22,pts:26,me:false},
    {rank:2,team:"FC Herrliberg", sp:10,s:7,u:1,n:2,tore:"26:14",diff:12,pts:22,me:true},
    {rank:3,team:"FC Horgen",     sp:10,s:5,u:2,n:3,tore:"20:18",diff:2, pts:17,me:false},
    {rank:4,team:"FC Adliswil",   sp:10,s:4,u:1,n:5,tore:"16:22",diff:-6,pts:13,me:false},
    {rank:5,team:"SC Embrach",    sp:10,s:2,u:2,n:6,tore:"12:26",diff:-14,pts:8,me:false},
    {rank:6,team:"FC Rüti",       sp:10,s:0,u:0,n:10,tore:"4:40",diff:-36,pts:0, me:false},
  ],
  "C-Juniorinnen":[
    {rank:1,team:"FC Uster",      sp:10,s:9,u:0,n:1,tore:"34:8", diff:26,pts:27,me:false},
    {rank:2,team:"FC Küsnacht",   sp:10,s:7,u:2,n:1,tore:"26:12",diff:14,pts:23,me:false},
    {rank:3,team:"FC Herrliberg", sp:10,s:6,u:2,n:2,tore:"22:14",diff:8, pts:20,me:true},
    {rank:4,team:"SC Männedorf",  sp:10,s:4,u:2,n:4,tore:"16:18",diff:-2,pts:14,me:false},
    {rank:5,team:"FC Stäfa",      sp:10,s:2,u:1,n:7,tore:"10:26",diff:-16,pts:7,me:false},
    {rank:6,team:"FC Thalwil",    sp:10,s:0,u:1,n:9,tore:"6:36", diff:-30,pts:1, me:false},
  ],
  "F-Juniorinnen":[
    {rank:1,team:"FC Stäfa",      sp:8,s:7,u:0,n:1,tore:"24:6", diff:18,pts:21,me:false},
    {rank:2,team:"FC Herrliberg", sp:8,s:6,u:1,n:1,tore:"20:8", diff:12,pts:19,me:true},
    {rank:3,team:"FC Küsnacht",   sp:8,s:4,u:2,n:2,tore:"16:12",diff:4, pts:14,me:false},
    {rank:4,team:"SC Männedorf",  sp:8,s:3,u:1,n:4,tore:"12:16",diff:-4,pts:10,me:false},
    {rank:5,team:"FC Hombrechtikon",sp:8,s:1,u:1,n:6,tore:"6:22",diff:-16,pts:4,me:false},
    {rank:6,team:"FC Uetikon",    sp:8,s:0,u:1,n:7,tore:"4:28", diff:-24,pts:1, me:false},
  ],
  "D-Juniorinnen":[
    {rank:1,team:"FC Küsnacht Mädchen", sp:8,s:7,u:0,n:1,tore:"22:7", diff:15,pts:21,me:false},
    {rank:2,team:"FC Herrliberg",       sp:8,s:5,u:1,n:2,tore:"18:10",diff:8, pts:16,me:true},
    {rank:3,team:"SC Wädenswil Mädchen",sp:8,s:4,u:2,n:2,tore:"14:12",diff:2, pts:14,me:false},
    {rank:4,team:"FC Zollikon Mädchen", sp:8,s:3,u:1,n:4,tore:"11:15",diff:-4,pts:10,me:false},
    {rank:5,team:"FC Uster Mädchen",    sp:8,s:1,u:2,n:5,tore:"8:18", diff:-10,pts:5,me:false},
    {rank:6,team:"FC Männedorf Mädchen",sp:8,s:0,u:2,n:6,tore:"5:24", diff:-19,pts:2,me:false},
  ],
  "E-Juniorinnen":[
    {rank:1,team:"FC Stäfa Mädchen",    sp:6,s:5,u:1,n:0,tore:"18:5", diff:13,pts:16,me:false},
    {rank:2,team:"FC Herrliberg",       sp:6,s:4,u:0,n:2,tore:"14:9", diff:5, pts:12,me:true},
    {rank:3,team:"SC Männedorf Mädchen",sp:6,s:3,u:1,n:2,tore:"12:10",diff:2, pts:10,me:false},
    {rank:4,team:"FC Küsnacht Mädchen", sp:6,s:2,u:1,n:3,tore:"9:13", diff:-4,pts:7, me:false},
    {rank:5,team:"FC Meilen Mädchen",   sp:6,s:1,u:1,n:4,tore:"7:16", diff:-9,pts:4, me:false},
    {rank:6,team:"FC Uetikon Mädchen",  sp:6,s:0,u:0,n:6,tore:"3:22", diff:-19,pts:0,me:false},
  ],
};
/* Fallback for routes without team context */
const TABLE=TABLES["Cc-Junioren"];

const ATT_EVENTS=[];
/* Initial Zusagen/Absagen pro Ereignis und Spieler-ID
   status: "zu"|"ab"|"fraglich"|null  */
const ATT_INITIAL=(()=>{
  const init = {};
  return init;
})();
const ATT_LOG=[];

const GANTT=[];

/* -- TRAININGSPLÄTZE -- */
const TRAININGSPLAETZE_DEFAULT = [
  {id:"hauptplatz_a", name:"Hauptplatz A",       active:true,  halfn:["Hüttliseite","Rappiseite"]},
  {id:"nebenplatz_b", name:"Nebenplatz B",        active:true,  halfn:["Bergseite","Seeseite"]},
  {id:"platz_c",      name:"Platz C",             active:true,  halfn:[]},
  {id:"halle",        name:"Turnhalle (Winter)",  active:false, halfn:[]},
  {id:"erlenbach",    name:"Platz Erlenbach",     active:false, halfn:[]},
];
// Runtime array — loaded from localStorage or default
const TRAININGSPLAETZE = TRAININGSPLAETZE_DEFAULT.slice();

const EVENTS=[
  {id:1,date:"10.06.2026",time:"19:00",title:"Elternabend Cc-Junioren",type:"Team-Event",rsvp:true, res:{y:11,n:2,o:5},loc:"Vereinslokal"},
  {id:2,date:"14.06.2026",time:"09:00",title:"Grümpelturnier 2026",   type:"Vereinsanlass",     rsvp:false,loc:"Sportanlage Aabach"},
  {id:3,date:"20.06.2026",time:"18:30",title:"Saisonabschluss C-Jun.",type:"Team-Event",rsvp:true, res:{y:14,n:1,o:3},loc:"Vereinslokal"},
  {id:4,date:"25.06.2026",time:"19:30",title:"Generalversammlung",    type:"Vereinsanlass",     rsvp:true, res:{y:42,n:8,o:15},loc:"Mehrzweckhalle"},
];

const POLLS=[
  {id:1,title:"Treffpunkt Auswärtsspiel Sa 24.05.",options:["Sportanlage 08:30","Bahnhof Meilen 09:00","Direkt am Spielort"],votes:[5,8,2],closed:false,target:"Spieler & Eltern"},
  {id:2,title:"Trainingsort nächste Woche",         options:["Platz A","Platz B","Egal"],                                    votes:[6,3,4],closed:true, target:"Spieler"},
];

const HELPER_GRUPPEN=["Alle","Trainer","Spieler","Eltern","Cc-Junioren Eltern","D-Junioren Eltern","Vorstand","Funktionäre","Administration"];
const HELPER_EVENTS=[
  {
    id:1,name:"Grümpelturnier 2026",date:"Sa 14.06.2026 - So 15.06.2026",loc:"Sportanlage Aabach",color:"#64748B",
    einsaetze:[
      {id:101,name:"Aufbau",    date:"Fr 13.06.2026",time:"14:00-18:00",ort:"Sportanlage",gruppen:["Alle"],
       schichten:[{id:1001,label:"Aufbau 14:00-18:00 Uhr",max:5,helfer:["Thomas Müller","Daniel Huber","Laura Imhof","Luca Meier","Tim Keller"]}]},
      {id:102,name:"Grill",     date:"Sa 14.06.2026",time:"10:00-22:00",ort:"Grillstand",gruppen:["Alle"],
       schichten:[
         {id:1002,label:"Grill 10:00-14:00 Uhr",max:3,helfer:["Anna Meier","Beat Keller","Laura Keller"]},
         {id:1003,label:"Grill 14:00-18:00 Uhr",max:3,helfer:["Petra Bauer","Stefan Bauer"]},
         {id:1004,label:"Grill 18:00-22:00 Uhr",max:3,helfer:[]},
       ]},
      {id:103,name:"Getränkeausgabe",date:"Sa 14.06.2026",time:"10:00-22:00",ort:"Bar",gruppen:["Alle"],
       schichten:[
         {id:1005,label:"Bar 10:00-14:00 Uhr",max:4,helfer:["Kurt Wolf","Monika Schmid"]},
         {id:1006,label:"Bar 14:00-18:00 Uhr",max:4,helfer:["Hans Fischer"]},
         {id:1007,label:"Bar 18:00-22:00 Uhr",max:4,helfer:[]},
       ]},
      {id:104,name:"Turnierbüro",date:"Sa 14.06.2026",time:"09:00-18:00",ort:"Sekretariat",gruppen:["Funktionäre","Administration"],
       schichten:[
         {id:1008,label:"Büro 09:00-13:00 Uhr",max:2,helfer:["Sandra Berger"]},
         {id:1009,label:"Büro 13:00-18:00 Uhr",max:2,helfer:[]},
       ]},
      {id:105,name:"Schiedsrichter",date:"Sa 14.06.2026",time:"09:00-18:00",ort:"Spielfelder",gruppen:["Cc-Junioren Eltern","D-Junioren Eltern"],
       schichten:[
         {id:1010,label:"SR 09:00-13:00 Feld 1 Uhr",max:2,helfer:["Peter Müller"]},
         {id:1011,label:"SR 13:00-18:00 Feld 1 Uhr",max:2,helfer:[]},
         {id:1012,label:"SR 09:00-13:00 Feld 2 Uhr",max:2,helfer:[]},
         {id:1013,label:"SR 13:00-18:00 Feld 2 Uhr",max:2,helfer:[]},
       ]},
      {id:106,name:"Abbau",date:"So 15.06.2026",time:"17:00-20:00",ort:"Sportanlage",gruppen:["Alle"],
       schichten:[{id:1014,label:"Abbau 17:00-20:00 Uhr",max:6,helfer:["Thomas Müller","Daniel Huber","Markus Weber","Sandra Zimmermann"]}]},
    ]
  },
  {
    id:2,name:"Generalversammlung 2026",date:"Mi 25.06.2026",loc:"Mehrzweckhalle Herrliberg",color:"#64748B",
    einsaetze:[
      {id:201,name:"Empfang",date:"Mi 25.06.2026",time:"18:00-19:00",ort:"Eingang",gruppen:["Vorstand"],
       schichten:[{id:2001,label:"Empfang 18:00-19:00 Uhr",max:2,helfer:["Laura Imhof","Luca Meier"]}]},
      {id:202,name:"Apéro-Service",date:"Mi 25.06.2026",time:"20:30-22:00",ort:"Foyer",gruppen:["Alle"],
       schichten:[{id:2002,label:"Apéro 20:30-22:00 Uhr",max:4,helfer:["Anna Meier","Beat Keller"]}]},
    ]
  },
  {
    id:3,name:"Saisonstart-Apéro 2026",date:"Sa 05.04.2026",loc:"Vereinslokal Herrliberg",color:"#64748B",
    einsaetze:[
      {id:301,name:"Apéro-Service",date:"05.04.2026",time:"17:00-19:00",ort:"Vereinslokal",gruppen:["Alle"],
       schichten:[
         {id:3001,label:"Service 17:00-19:00 Uhr",max:4,helfer:["Anna Meier","Kurt Wolf","Monika Schmid"]},
       ]},
    ]
  },
];

const HELPERS=[
  {id:1, name:"Thomas Müller", gruppe:"Trainer",           soll:2,geleistet:1,schichten:[1001,1014]},
  {id:2, name:"Daniel Huber",  gruppe:"Trainer",           soll:2,geleistet:0,schichten:[1001,1014]},
  {id:3, name:"Laura Imhof",   gruppe:"Vorstand",          soll:1,geleistet:0,schichten:[1008]},
  {id:4, name:"Anna Meier",    gruppe:"Cc-Junioren Eltern", soll:2,geleistet:1,schichten:[1002,2002]},
  {id:5, name:"Beat Keller",   gruppe:"Cc-Junioren Eltern", soll:2,geleistet:0,schichten:[1002,2002]},
  {id:6, name:"Petra Bauer",   gruppe:"Cc-Junioren Eltern", soll:2,geleistet:0,schichten:[1003]},
  {id:7, name:"Kurt Wolf",     gruppe:"Cc-Junioren Eltern", soll:2,geleistet:1,schichten:[1005]},
  {id:8, name:"Monika Schmid", gruppe:"Cc-Junioren Eltern", soll:2,geleistet:2,schichten:[1005]},
  {id:9, name:"Hans Fischer",  gruppe:"D-Junioren Eltern", soll:2,geleistet:0,schichten:[1006]},
  {id:10,name:"Peter Müller",  gruppe:"D-Junioren Eltern", soll:2,geleistet:0,schichten:[1010]},
  {id:11,name:"Sandra Berger", gruppe:"Administration",    soll:1,geleistet:0,schichten:[1008]},
  {id:12,name:"Noah Beispiel",    gruppe:"Cc-Junioren Eltern", soll:3,geleistet:2,schichten:[]},
  {id:13,name:"Luca Test",        gruppe:"Trainer",            soll:0,geleistet:0,schichten:[]},
  /* Test-Accounts */
  {id:14,name:"Luca Meier",       gruppe:"Cc-Junioren",        soll:2,geleistet:1,schichten:[1001,2001]},
  {id:15,name:"Tim Keller",       gruppe:"1. Mannschaft Herren",soll:2,geleistet:0,schichten:[1001]},
  {id:16,name:"Laura Keller",     gruppe:"1. Mannschaft Frauen",soll:2,geleistet:0,schichten:[1002]},
  {id:17,name:"Stefan Bauer",     gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1003]},
  {id:18,name:"Markus Weber",     gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1014]},
  {id:19,name:"Sandra Zimmermann",gruppe:"Trainer",            soll:2,geleistet:0,schichten:[1014]},
  {id:20,name:"Marianne Keller",  gruppe:"1. Mannschaft Herren",soll:2,geleistet:1,schichten:[1002]},
  {id:21,name:"Petra Weber",      gruppe:"Ca-Junioren Eltern", soll:2,geleistet:0,schichten:[1003]},
  {id:22,name:"Claudia Brunner",  gruppe:"Da-Junioren Eltern", soll:2,geleistet:0,schichten:[1005]},
];

const BUSES=[
  {id:1,name:"Bus A (9-Plätzer)",reservations:[
    {date:"Sa 24.05.",time:"09:00-14:00",by:"Thomas Müller",team:"Cc-Junioren",purpose:"Auswärtsspiel FC Küsnacht"},
    {date:"Mi 28.05.",time:"16:30-19:30",by:"Daniel Huber", team:"D-Junioren",purpose:"Auswärtsspiel SC Männedorf"},
  ]},
  {id:2,name:"Bus B (15-Plätzer)",reservations:[
    {date:"Sa 07.06.",time:"08:00-14:00",by:"Sabine Koch",team:"A-Junioren",purpose:"Turnierfahrt Rapperswil"},
  ]},
];

const MATERIAL=[
  {id:1,team:"Cc-Junioren",type:"Bestellung", item:"Neue Bälle (Grösse 4)",     by:"Thomas Müller",date:"20.05.2026",status:"In Bearbeitung"},
  {id:2,team:"D-Junioren",type:"Defekt",     item:"Kaputte Torpumpe",           by:"Daniel Huber", date:"18.05.2026",status:"Erledigt"},
  {id:3,team:"Cc-Junioren",type:"Tenüs",      item:"Tenüs Grösse 140 (3×)",     by:"Thomas Müller",date:"15.05.2026",status:"Offen"},
  {id:4,team:"A-Junioren",type:"Mangel",     item:"Zu wenig Leibchen",          by:"Marco Senn",   date:"12.05.2026",status:"Offen"},
];

const LOCKERS=[
  {name:"Garderobe 1",assignments:[
    {team:"Cc-Junioren",start:16,end:18,day:"Sa",type:"Heim",color:R},
    {team:"A-Junioren",start:17,end:19.5,day:"Mi",type:"Heim",color:GN},
  ]},
  {name:"Garderobe 2",assignments:[
    {team:"FC Küsnacht",start:16,end:18,day:"Sa",type:"Gast",color:"#888"},
  ]},
  {name:"Garderobe 3",assignments:[
    {team:"Aktive 1",start:19,end:21,day:"Do",type:"Heim",color:"#7C3AED"},
  ]},
];

const MEDIA=[
  {id:1,title:"Matchbericht - Sieg vs. FC Thalwil 2:1",cat:"Matchbericht",  team:"Cc-Junioren",date:"18.05.2026",area:["Webseite","Instagram"],status:"Eingereicht",  author:"Thomas Müller"},
  {id:2,title:"Fotos Trainingscamp",                    cat:"Foto",          team:"A-Junioren",date:"05.05.2026",area:["Webseite"],            status:"Freigegeben",  author:"Laura Imhof"},
  {id:3,title:"Vereinsfest Erfolgsmeldung",             cat:"Vereinsanlass", team:"Verein",    date:"01.05.2026",area:["Webseite","Newsletter"],status:"Veröffentlicht",author:"FC Herrliberg"},
];

const MEMBERS=[
  {id:1,name:"Thomas Müller",role:"Trainer",team:"Cc-Junioren",type:"Aktivmitglied",ort:"Herrliberg",status:"Vollständig"},
  {id:2,name:"Daniel Huber", role:"Trainer",team:"D-Junioren",type:"Aktivmitglied",ort:"Meilen",    status:"Vollständig"},
  {id:3,name:"Laura Imhof",  role:"Vorstand",team:"-",         type:"Aktivmitglied",ort:"Herrliberg",status:"Vollständig"},
  {id:4,name:"Anna Meier",   role:"Eltern",  team:"Cc-Junioren",type:"Passivmitglied",ort:"Herrliberg",status:"Prüfung fällig"},
  {id:5,name:"Beat Keller",  role:"Eltern",  team:"Cc-Junioren",type:"Passivmitglied",ort:"Meilen",   status:"Vollständig"},
  {id:6,name:"Marco Senn",   role:"Materialwart",team:"-",     type:"Funktionär",   ort:"Herrliberg",status:"Vollständig"},
  {id:7,name:"Sabine Koch",  role:"Trainer", team:"A-Junioren",type:"Aktivmitglied",ort:"Küsnacht",  status:"Sync-Fehler"},
];

const WIKI=[
  {title:"Trainerhandbuch - Einführung",     cat:"Trainer",       updated:"01.01.2026"},
  {title:"Nutzungsregeln Vereinsbusse",      cat:"Vereinsbus",    updated:"15.03.2026"},
  {title:"Garderobenprozesse am Spieltag",   cat:"Spieltag",      updated:"01.02.2026"},
  {title:"J+S-Informationen für Trainer",    cat:"J+S",           updated:"01.09.2024"},
  {title:"Helfereinsätze - Ablauf & Regeln", cat:"Helfereinsatz", updated:"10.04.2026"},
  {title:"Kommunikationsregeln im Verein",   cat:"Kommunikation", updated:"01.01.2026"},
];

const NEWS=[
  {id:1,title:"Einladung Elternabend Cc-Junioren",date:"20.05.2026",author:"Thomas Müller",target:"Cc-Junioren",channel:"Portal-Nachricht",content:"Wir laden alle Eltern herzlich zum Elternabend am 10. Juni 2026 ein. Rückmeldung bis 05. Juni."},
  {id:2,title:"Grümpelturnier - Helfer gesucht!", date:"18.05.2026",author:"FC Herrliberg", target:"Alle",      channel:"E-Mail + Portal", content:"Am 14./15. Juni findet unser Grümpelturnier statt. Bitte über das Helfermodul anmelden."},
  {id:3,title:"Neue Tenüs für Juniorenteams",    date:"15.05.2026",author:"Administration",target:"Junioren",  channel:"Portal-Nachricht",content:"Die neuen Tenüs sind eingetroffen. Abholen ab Dienstag, alte Tenüs mitbringen."},

  {id:5,title:"Vorbereitung Derby vs. FC Küsnacht",date:"02.05.2026",author:"Marco Weber",target:"1. Mannschaft Herren",channel:"Portal-Nachricht",content:"Dieses Wochenende empfangen wir den FC Küsnacht zum Saisonderby. Aufstellung und Treffpunkt wie gewohnt, bitte pünktlich erscheinen."},
  {id:6,title:"Saisonauftakt gelingt: 3:0 gegen FC Uster",date:"05.05.2026",author:"Marco Weber",target:"1. Mannschaft Herren",channel:"Portal-Nachricht",content:"Ein starker Start in die neue Saison! Mit einem überzeugenden 3:0 gegen FC Uster zeigten wir von Beginn weg gute Leistungen. Weiter so!"},
  {id:7,title:"Neuer Trainer ab Sommer 2026",date:"10.05.2026",author:"FC Herrliberg",target:"Alle",channel:"Portal-Nachricht",content:"Wir freuen uns, bekannt zu geben, dass Marco Weber ab Sommer 2026 die 2. Mannschaft übernimmt. Herzlich willkommen!"},
  {id:8,title:"Trainingsabend mit Videoanalyse",date:"14.05.2026",author:"Daniel Huber",target:"2. Mannschaft Herren",channel:"Portal-Nachricht",content:"Am kommenden Mittwoch analysieren wir die letzten beiden Spiele per Video. Bitte alle pünktlich um 18:45 in der Kabine."},
  {id:9,title:"Einladung Saisonabschlussessen",date:"16.05.2026",author:"Sabine Koch",target:"1. Mannschaft Frauen",channel:"Portal-Nachricht",content:"Das Saisonabschlussessen findet am 28. Juni im Vereinslokal statt. Bitte bis 15. Juni anmelden."},
  {id:10,title:"Zwei Neuzugänge bei den Frauen",date:"08.05.2026",author:"FC Herrliberg",target:"Alle",channel:"Portal-Nachricht",content:"Wir heissen Lara Zimmermann und Mia Brunner herzlich willkommen im Team der 1. Mannschaft Frauen!"},
  {id:11,title:"Talentförderung: Auswahl Kantonalverband",date:"19.05.2026",author:"Lukas Frei",target:"Ba-Junioren",channel:"Portal-Nachricht",content:"Herzliche Gratulation an Nico Moser und Tim Gerber, die in das Kantonalverbands-Sichtungstraining eingeladen wurden!"},
  {id:12,title:"Trainingslager Juni - Anmeldung offen",date:"12.05.2026",author:"Lukas Frei",target:"Ba-Junioren",channel:"Portal-Nachricht",content:"Das Trainingslager findet vom 20.-22. Juni statt. Anmeldung bis 01. Juni über das Portal. Kosten: CHF 80.-"},
  {id:13,title:"Sieg im Lokalderby gegen SC Männedorf",date:"11.05.2026",author:"Patrick Schmid",target:"Bb-Junioren",channel:"Portal-Nachricht",content:"Mit einem knappen aber verdienten 2:1 im Derby konnten wir drei wichtige Punkte holen. Grosses Lob ans gesamte Team!"},
  {id:14,title:"Elternabend - Thema Spielphilosophie",date:"17.05.2026",author:"Andrea Bauer",target:"Ca-Junioren",channel:"Portal-Nachricht",content:"Einladung zum Elternabend am 5. Juni um 19:30 Uhr im Vereinslokal. Hauptthema: Spielphilosophie und Entwicklungsziele."},
  {id:15,title:"Neue Trainingsbälle eingetroffen",date:"13.05.2026",author:"Administration",target:"Alle",channel:"Portal-Nachricht",content:"Die bestellten Trainingsbälle sind eingetroffen. Bitte beim ersten Training abholen und die alten mitbringen."},
  {id:16,title:"Turniereinladung Hombrechtikon Cup",date:"09.05.2026",author:"Stefan Keller",target:"Db-Junioren",channel:"Portal-Nachricht",content:"Wir haben eine Einladung zum Hombrechtikon Cup erhalten. Teilnahme am 21. Juni. Anmeldung bis 26. Mai nötig."},
  {id:17,title:"Erste Mannschaftsfotos geschossen",date:"20.05.2026",author:"Sabine Koch",target:"C-Juniorinnen",channel:"Portal-Nachricht",content:"Am letzten Samstag wurden die offiziellen Mannschaftsfotos aufgenommen. Bilder folgen in den nächsten Tagen im Medienbereich."},
  {id:18,title:"Freude am Fussball - Bericht Saison",date:"21.05.2026",author:"Marco Weber",target:"F-Juniorinnen",channel:"Portal-Nachricht",content:"Was für eine tolle Saison mit unseren Kleinsten! 12 begeisterte Spielerinnen, viele neue Freundschaften und jede Menge Spass."},
];

const PSTATS=[
  {name:"Luca Meier",  sp:11,tore:7,assists:3,gelb:1,rot:0},
  {name:"Noah Keller", sp:12,tore:4,assists:6,gelb:2,rot:0},
  {name:"Finn Bauer",  sp:10,tore:6,assists:2,gelb:0,rot:0},
  {name:"Elias Wolf",  sp:12,tore:0,assists:0,gelb:0,rot:0},
  {name:"Jan Schmid",  sp:11,tore:2,assists:4,gelb:0,rot:0},
  {name:"Leon Fischer",sp:8, tore:1,assists:1,gelb:3,rot:1},
];

/* ==========================================
   KLEINE HILFKOMPONENTEN
========================================== */
function Av({name="",init,size=34,bg="#f8de09"}){
  const l=init||name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const textColor=bg==="#f8de09"||bg==="rgba(255,255,255,0.3)"?"#F3F4F6":"#fff";
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",color:textColor,fontWeight:700,fontSize:size*0.35,flexShrink:0}}>{l}</div>;
}
function Chip({text,color=R,bg}){
  return <span style={{background:bg||color+"15",color,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.2,border:`0.5px solid ${color}25`}}>{text}</span>;
}
function Stat({label,value,sub,color=BK}){
  return(
    <div style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:14,padding:"18px 20px",flex:1,minWidth:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:10,color:"#999",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color,lineHeight:1,marginBottom:6}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#aaa",fontWeight:500}}>{sub}</div>}
    </div>
  );
}
function Card({children,style={},onClick}){
  return <div onClick={onClick} style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:14,padding:"20px 22px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",...style}}>{children}</div>;
}
function STitle({children,action}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{margin:0,fontSize:14,fontWeight:700,letterSpacing:-0.1}}>{children}</h2>
      {action}
    </div>
  );
}
function Btn({children,onClick,variant="outline",color=BK,small,style={}}){
  const p=small?"4px 11px":"7px 15px";
  if(variant==="primary"){const lightBg=color==="#F3F4F6"||color==="#F3F4F6"||color==="#f8de09";return <button onClick={onClick} style={{padding:p,borderRadius:8,fontSize:small?11:13,fontWeight:600,cursor:"pointer",border:lightBg?`0.5px solid ${GB}`:"none",background:color,color:lightBg?"#374151":"#fff",transition:"opacity 0.1s",...style}} onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;}
  return <button onClick={onClick} style={{padding:p,borderRadius:8,fontSize:small?11:13,fontWeight:600,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:BK,transition:"background 0.1s",...style}} onMouseEnter={e=>e.currentTarget.style.background=GR} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{children}</button>;
}
function Tabs({tabs,active,setActive}){
  return(
    <div style={{display:"flex",gap:1,background:GR,borderRadius:10,padding:3,marginBottom:18,overflowX:"auto",flexWrap:"nowrap"}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>setActive(t.key)} style={{padding:"6px 10px",border:"none",borderRadius:7,background:active===t.key?"#fff":"transparent",color:active===t.key?BK:"#999",fontWeight:active===t.key?700:400,cursor:"pointer",fontSize:12,boxShadow:active===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none",whiteSpace:"nowrap"}}>{t.label}</button>
      ))}
    </div>
  );
}
function InfoBox({text,color=BL}){
  return <div style={{padding:"10px 14px",background:color+"0D",borderRadius:10,fontSize:12,color:"#444",marginTop:14,borderLeft:`3px solid ${color}`,lineHeight:1.5}}>{text}</div>;
}

/* ==========================================
   ROLLEN-SWITCHER MODAL
========================================== */
function RoleSwitcher({account,activeSubRole,setActiveSubRole,onRoleChange}){
  const isMobile=useIsMobile();
  const [open,setOpen]=useState(false);
  const currentRole=activeSubRole||account.primaryRole;
  const cur=ROLES[currentRole];
  const hasMultiRoles=account.rolen.length>1;
  return(
    <>
      <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${cur.color}`,background:cur.color+"12",cursor:"pointer"}}>
        <span style={{fontSize:15}}>{cur.icon}</span>
        <span style={{fontSize:13,fontWeight:700,color:cur.color}}>{cur.label}</span>
        {hasMultiRoles&&<span style={{fontSize:10,background:cur.color,color:"#fff",padding:"1px 5px",borderRadius:10,marginLeft:2}}>{account.rolen.length}</span>}
        <span style={{fontSize:11,color:cur.color,opacity:0.7}}>▾</span>
      </button>
      {open&&(
        <div onClick={()=>setOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",overflowY:"auto"}:{padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:800}}>Konto & Rolle wechseln</h2>
                <p style={{margin:"3px 0 0",fontSize:13,color:"#888"}}>Teste die App aus verschiedenen Perspektiven</p>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888",lineHeight:1}}>×</button>
            </div>

            {/* Konten mit Mehrfach-Rollen */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rolen.length>1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Konten mit Mehrfach-Rollen</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rolen.length>1).map(([key,a])=>{
                    const isActive=account===a;
                    return(
                      <div key={key} style={{border:`1.5px solid ${isActive?R:GB}`,borderRadius:10,padding:"10px 14px",background:isActive?R+"08":"#fafaf8"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:R,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>
                            {a.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div style={{fontWeight:700,fontSize:13}}>{a.name}</div>
                            <div style={{fontSize:11,color:"#888"}}>{a.kinder.length>0?`${a.kinder.length} Kind${a.kinder.length>1?"er":""}: ${a.kinder.map(k=>k.name).join(", ")}`:"Kein Kind"}</div>
                          </div>
                          {isActive&&<span style={{marginLeft:"auto",fontSize:10,color:R,fontWeight:700}}>AKTIVES KONTO</span>}
                        </div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {a.rolen.map(r=>{
                            const rd=ROLES[r];
                            const isActiveSub=(isActive&&(activeSubRole||a.primaryRole)===r);
                            return(
                              <button key={r} onClick={()=>{onRoleChange(key);setActiveSubRole(r);setOpen(false);}}
                                style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:`1.5px solid ${isActiveSub?rd.color:GB}`,background:isActiveSub?rd.color+"15":"#fff",cursor:"pointer",fontSize:11,fontWeight:isActiveSub?700:400,color:isActiveSub?rd.color:BK}}>
                                <span>{rd.icon}</span>{rd.label}
                                {isActiveSub&&<span style={{fontSize:9,color:rd.color}}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eltern mit Kindern */}
            {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rolen.length===1).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Eltern-Zugänge</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.kinder.length>0&&a.rolen.length===1).map(([key,a])=>{
                    const rd=ROLES[a.primaryRole];
                    const isActive=account===a;
                    return(
                      <button key={key} onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}
                        style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${isActive?rd.color:GB}`,background:isActive?rd.color+"12":"#fafaf8",cursor:"pointer",textAlign:"left",minWidth:200}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                          <span style={{fontSize:16}}>{rd.icon}</span>
                          <span style={{fontWeight:700,fontSize:13,color:isActive?rd.color:BK}}>{a.name}</span>
                        </div>
                        {a.kinder.map((k,i)=>(
                          <div key={i} style={{fontSize:11,color:"#888",marginTop:2}}>
                            <span style={{color:GN}}>►</span> {k.name} <span style={{color:"#bbb"}}>({k.team})</span>
                          </div>
                        ))}
                        {isActive&&<div style={{marginTop:5,fontSize:10,color:rd.color,fontWeight:700}}>AKTIV</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Rollen */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Standard-Rollen (Demo)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {Object.entries(USER_ACCOUNTS).filter(([,a])=>a.rolen.length===1&&a.kinder.length===0).map(([key,a])=>{
                  const rd=ROLES[a.primaryRole];
                  const isActive=account===a&&!activeSubRole;
                  const teamLabel=a.trainerTeams?a.trainerTeams[0]:a.team||null;
                  return(
                    <button key={key} onClick={()=>{onRoleChange(key);setActiveSubRole(null);setOpen(false);}}
                      style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${isActive?rd.color:GB}`,background:isActive?rd.color+"12":"#fafaf8",cursor:"pointer",textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:18}}>{rd.icon}</span>
                        <span style={{fontWeight:700,fontSize:13,color:isActive?rd.color:BK}}>{a.name}</span>
                        {isActive&&<span style={{marginLeft:"auto",fontSize:10,color:rd.color,fontWeight:700}}>AKTIV</span>}
                      </div>
                      <div style={{fontSize:11,color:rd.color,fontWeight:600,marginBottom:2}}>{rd.label}</div>
                      {teamLabel&&<div style={{fontSize:10,color:"#aaa"}}>{teamLabel}</div>}
                      {!teamLabel&&<p style={{margin:0,fontSize:10,color:"#aaa"}}>{rd.desc}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      )}
    </>
  );
}

/* ==========================================
   LAYOUT
========================================== */
function SideNav({role,active,setActive,account}){
  const nav=NAV_BY_ROLE[role]||[];
  const rc=getRole(role).color;
  return(
    <nav style={{width:200,background:BK,minHeight:"100vh",display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"20px 14px 16px",borderBottom:"1px solid #252525",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <img src="data:image/png;base64,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" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt="FC Herrliberg Logo"/>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:13}}>FC Herrliberg</div>
            <div style={{color:"#666",fontSize:10}}>Vereinsportal</div>
          </div>
        </div>
      </div>
      <div style={{flex:1,padding:"4px 8px",overflowY:"auto"}}>
        {nav.map(n=>(
          <button key={n.key} onClick={()=>setActive(n.key)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:8,border:"none",background:active===n.key?"#f8de09":"transparent",color:active===n.key?"#1A1A1A":"#888",cursor:"pointer",fontSize:12.5,fontWeight:active===n.key?700:400,textAlign:"left",marginBottom:1}}>
            <i className={n.icon||"ti-circle"} style={{fontSize:15,width:18,textAlign:"center"}}/>{n.label}
          </button>
        ))}
      </div>
      <div style={{padding:"8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,background:"#222"}}>
          <Av size={28} bg={getRole(role).color} name={getRole(role).label} init={getRole(role).icon}/>
          <div>
            <div style={{color:"#fff",fontSize:12,fontWeight:600}}>{
              account?.name||USER_ACCOUNTS[role]?.name||getRole(role)?.label||"Benutzer"
            }</div>
            <div style={{color:"#666",fontSize:10}}>{getRole(role).label}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function TopBar({role,active,setActive,onRoleChange,account,activeSubRole,setActiveSubRole,onLogout}){
  const nav=NAV_BY_ROLE[role]||[];
  const label=nav.find(n=>n.key===active)?.label||active;
  const rc=getRole(role).color;
  const acc=account||USER_ACCOUNTS[role]||{name:getRole(role).label,rollen:[role],primaryRole:role,kinder:[]};
  return(
    <div style={{height:54,background:"#fff",borderBottom:`0.5px solid ${GB}`,display:"flex",alignItems:"center",padding:"0 20px",justifyContent:"space-between",flexShrink:0,gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <span style={{fontSize:13,color:"#bbb",fontWeight:500,letterSpacing:0.2}}><span style={{color:rc,fontWeight:800,fontSize:13}}>FCH</span><span style={{margin:"0 6px",color:"#ddd"}}>/</span>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        {!onLogout && <RoleSwitcher account={acc} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole||((r)=>{})} onRoleChange={onRoleChange}/>}
        {!onLogout && <Chip text="DEMO" color="#888" bg="#f0f0ee"/>}
        {onLogout && <span style={{fontSize:12,color:"#888"}}>{acc.name||acc.email}</span>}
        {onLogout && <button onClick={onLogout} style={{padding:"4px 12px",borderRadius:20,border:"0.5px solid "+GB,background:"#fff",color:"#555",fontSize:11,cursor:"pointer"}}>Abmelden</button>}
      </div>
    </div>
  );
}

/* ==========================================
   DASHBOARDS (je nach Rolle)
========================================== */
function Dashboard({role,setActive,account,meineTeams,myRosterId}){
  if(role==="administrator")  return <DashboardAdmin setActive={setActive}/>;
  if(role==="administration") return <DashboardAdministration setActive={setActive}/>;
  if(role==="funktionaer")    return <DashboardFunktionaer setActive={setActive}/>;
  if(role==="trainer")        return <DashboardTrainer setActive={setActive} account={account} trainerTeams={meineTeams} myRosterId={myRosterId}/>;
  if(role==="spieler")        return <DashboardSpieler account={account} meineTeams={meineTeams} myRosterId={myRosterId} setActive={setActive}/>;
  if(role==="eltern")         return <DashboardEltern account={account} meineTeams={meineTeams} setActive={setActive}/>;
  return null;
}

function DashboardAdmin({setActive}){
  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>System-Dashboard</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Administrator · Vollzugriff</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Mitglieder total" value="187" sub="Fairgate synchronisiert" color="#7C3AED"/>
        <Stat label="Aktive Benutzer" value="134" sub="in den letzten 30 Tagen" color={BL}/>
        <Stat label="Sync-Fehler" value="2" sub="Fairgate / FVRZ" color={R}/>
        <Stat label="Offene Datenprüfungen" value="12" sub="Mitglieder fällig" color={AM}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        <Card>
          <STitle>Systemstatus</STitle>
          {[
            {label:"Fairgate-Sync",     status:"OK",     last:"vor 2h",       ok:true},
            {label:"FVRZ-Sync",         status:"Fehler", last:"vor 4h",       ok:false},
            {label:"E-Mail-Versand",    status:"OK",     last:"vor 30min",    ok:true},
            {label:"Push-Benachricht.", status:"OK",     last:"active",        ok:true},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13,fontWeight:500}}>{s.label}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:"#aaa"}}>{s.last}</span>
                <Chip text={s.status} color={s.ok?GN:R} bg={s.ok?"#ECFDF5":RL}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Benutzer & Rollen</STitle>
          {[
            {r:"Administrator",n:2},{r:"Administration",n:3},{r:"Trainer",n:8},
            {r:"Funktionäre/Vorstand",n:6},{r:"Spieler",n:112},{r:"Eltern",n:56},
          ].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<5?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.r}</span>
              <span style={{fontWeight:700,fontSize:13}}>{x.n}</span>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Sync-Konflikte</STitle>
          {[
            {field:"E-Mail-Adresse",member:"Noah Beispiel", conflict:"Portal ↔ Fairgate"},
            {field:"Adresse",       member:"Sara Huber",     conflict:"Fairgate ↔ Portal"},
          ].map((c,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<1?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{c.member} · {c.field}</div>
              <div style={{fontSize:11,color:"#888"}}>{c.conflict}</div>
            </div>
          ))}
          <InfoBox text="2 Konflikte müssen manuell aufgelöst werden." color={R}/>
        </Card>
        <Card>
          <STitle>Letzte Audit-Einträge</STitle>
          {[
            {action:"Export Mitgliederliste",user:"Sandra Berger",time:"14:22"},
            {action:"Fairgate-Sync manuell", user:"Admin User",  time:"12:00"},
            {action:"Rolle geändert",         user:"Admin User",  time:"10:45"},
          ].map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontSize:13,fontWeight:500}}>{a.action}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{a.user} · {a.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardAdministration({setActive}){
  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Guten Tag, Sandra</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Administration · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Mitglieder total" value="187" color={BL}/>
        <Stat label="Datenprüfung fällig" value="12" color={R} sub="halbjährliche Prüfung"/>
        <Stat label="Sync-Fehler" value="2" color={AM}/>
        <Stat label="Offene Materialanfragen" value="3" color={BK}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        <Card>
          <STitle action={<button onClick={()=>setActive("members")} style={{fontSize:12,color:BL,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Alle →</button>}>Datenprüfstatus</STitle>
          {[{label:"Vollständig",n:162,c:GN},{label:"Prüfung fällig",n:12,c:AM},{label:"Unvollständig",n:8,c:R},{label:"Sync-Fehler",n:5,c:"#888"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.label}</span>
              <Chip text={x.n} color={x.c} bg={x.c+"18"}/>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Fairgate & FVRZ Sync</STitle>
          {[{s:"Fairgate-Import",ok:true,last:"vor 2h"},{s:"FVRZ-Spielplan",ok:false,last:"Fehler"},{s:"Rückschreiben",ok:true,last:"vor 6h"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.s}</span>
              <Chip text={x.ok?"OK":x.last} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
            </div>
          ))}
          <InfoBox text="FVRZ-Sync: Verbindungsfehler. Manuelle Überprüfung erforderlich." color={R}/>
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71},{t:"Aktive 1",pct:68}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:500}}>{x.t}</span>
                <span style={{fontSize:13,fontWeight:700,color:x.pct>=75?GN:x.pct>=65?AM:R}}>{x.pct}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${x.pct}%`,background:x.pct>=75?GN:x.pct>=65?AM:R,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Termine · Rückmeldungen</STitle>
          {EVENTS.filter(e=>e.rsvp).map((e,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<EVENTS.filter(x=>x.rsvp).length-1?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{e.title}</div>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <Chip text={`✓ ${e.res?.y}`} color={GN} bg="#ECFDF5"/>
                <Chip text={`✕ ${e.res?.n}`} color={R} bg={RL}/>
                <Chip text={`? ${e.res?.o}`} color={AM} bg="#FFFBEB"/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardFunktionaer(){
  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Guten Tag, Bruno</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Funktionär / Vorstand · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Offene Rückmeldungen" value="22" color={R}/>
        <Stat label="Helfer-Soll erfüllt" value="61%" color={AM}/>
        <Stat label="Vereinsbusse heute" value="1" color={BL} sub="Bus A reserviert"/>
        <Stat label="Offene Materialanfragen" value="3" color={BK}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        <Card>
          <STitle>Kommende Vereinsanlässe</STitle>
          {EVENTS.map((e,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<EVENTS.length-1?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,fontSize:13}}>{e.title}</span>
                <Chip text={e.type==="Vereinsanlass"?"Verein":"Team"} color={e.type==="Vereinsanlass"?R:BL}/>
              </div>
              <div style={{fontSize:11,color:"#888"}}>{e.date} · {e.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:500}}>{x.t}</span>
                <span style={{fontSize:13,fontWeight:700,color:x.pct>=75?GN:AM}}>{x.pct}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${x.pct}%`,background:x.pct>=75?GN:AM,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Helfereinsätze Übersicht</STitle>
          {HELPERS.slice(0,5).map((h,i)=>{
            const geplant=h.schichten.length;
            const offen=Math.max(0,h.soll-h.geleistet-geplant);
            let status="Erfüllt";
            if(h.soll===0) status="Befreit";
            else if(h.geleistet>=h.soll) status="Erfüllt";
            else if(h.geleistet+geplant>=h.soll) status="Geplant erfüllt";
            else status="Offen";
            return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<4?`0.5px solid ${GB}`:"none"}}>
                <span style={{fontSize:13}}>{h.name}</span>
                <Chip text={status} color={["Erfüllt","Geplant erfüllt"].includes(status)?GN:status==="Befreit"?"#888":R} bg={["Erfüllt","Geplant erfüllt"].includes(status)?"#ECFDF5":status==="Befreit"?"#f5f5f5":RL}/>
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Vereinsbus-Reservationen</STitle>
          {BUSES.flatMap(b=>b.reservations.map(r=>({...r,bus:b.name}))).map((r,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontWeight:600,fontSize:13}}>{r.date} · {r.time+" Uhr"}</div>
              <div style={{fontSize:11,color:"#888"}}>{r.bus} · {r.purpose}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardTrainer({setActive,account,trainerTeams=[],myRosterId}){
  const isMobile=useIsMobile();
  const trainer=ROSTER.find(p=>p.id===(myRosterId||200))||ROSTER.find(p=>p.id===200);
  const firstName=trainer?.firstName||account?.name?.split(" ")[0]||"Trainer";
  const team=trainerTeams[0]||"Cc-Junioren";
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";};

  /* Nächstes Training und Spiel */
  const upcoming=ATT_EVENTS.filter(e=>e.team===team&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)));
  const nextTrain=upcoming.find(e=>e.type==="Training");
  const nextSpiel=upcoming.find(e=>e.type==="Spiel");

  /* Tabellenrang */
  const tableData=TABLES[team]||[];
  const myRow=tableData.find(r=>r.me);

  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Guten Morgen, {firstName}</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Trainer · {trainerTeams.join(" & ")} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Nächstes Training" value={nextTrain?nextTrain.date.replace(/^\w+\s/,""):"-"} sub={nextTrain?`${nextTrain.time} Uhr · ${nextTrain.location}`:"Kein Training"} color={GN}/>
        <Stat label="Nächstes Spiel"    value={nextSpiel?nextSpiel.date.replace(/^\w+\s/,""):"-"} sub={nextSpiel?`${nextSpiel.time} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel"} color={BL}/>
        <Stat label="Ø Anwesenheit"     value="77%"      sub="letzte 5 Trainings"   color={GN}/>
        <Stat label="Tabellenrang"      value={myRow?myRow.rank+".":"-"} sub={myRow?TABLES[team]?.length+" Teams · "+myRow.pts+" Punkte":"Keine Tabelle"} color={BL}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        <Card>
          <STitle action={<Chip text={upcoming.filter(e=>e.rsvp!==false).length+" offen"} color={R}/>}>Fehlende Rückmeldungen</STitle>
          {upcoming.filter(e=>e.rsvp!==false).slice(0,3).map((x,i,arr)=>{
            const teamPids=ROSTER.filter(p=>(p.teams||[]).includes(team)&&!p.role).map(p=>p.id);
            const missing=teamPids.filter(pid=>!ATT_INITIAL[x.id]?.[pid]?.status).length;
            return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<arr.length-1?`0.5px solid ${GB}`:"none"}}>
                <span style={{fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</span>
                {missing>0&&<Chip text={`${missing} fehlen`} color={AM} bg="#FEF3C7"/>}
                {missing===0&&<Chip text="✓ Vollständig" color={GN} bg="#ECFDF5"/>}
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Anwesenheit letzte Anlässe</STitle>
          {ATT_LOG.slice(0,3).map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:600}}>{a.date} <Chip text={a.type} color={a.type==="Spiel"?BL:GN}/></span>
                <span style={{fontSize:13,fontWeight:800,color:R}}>{Math.round(a.present.length/(a.present.length+a.absent.length)*100)}%</span>
              </div>
              <div style={{height:4,background:GB,borderRadius:2}}>
                <div style={{height:"100%",width:`${a.present.length/(a.present.length+a.absent.length)*100}%`,background:R,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Helfereinsätze · Grümpelturnier</STitle>
          {HELPER_EVENTS[0].einsaetze.slice(0,3).map((e,i)=>{
            const s=e.schichten[0]; const filled=s.helfer.length, max=s.max;
            return(
              <div key={i} style={{marginBottom:i<2?10:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:500}}>{e.name} <span style={{color:"#aaa"}}>{e.time+" Uhr"}</span></span>
                  <span style={{color:filled<max?R:GN,fontWeight:700}}>{filled}/{max}</span>
                </div>
                <div style={{height:5,background:GB,borderRadius:3}}>
                  <div style={{height:"100%",width:`${filled/max*100}%`,background:filled<max?R:GN,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Offene Abstimmungen</STitle>
          {POLLS.filter(p=>!p.closed).map((p,i)=>(
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{fontWeight:600,fontSize:13}}>{p.title}</div>
              <Chip text={p.target} color={BL}/>
            </div>
          ))}
          <div style={{padding:"8px 0",borderTop:`0.5px solid ${GB}`,marginTop:6}}>
            <div style={{fontWeight:600,fontSize:13}}>Vereinsbus reserviert ✓</div>
            <div style={{fontSize:11,color:"#888"}}>Bus A · Sa 24.05. · 09:00-14:00</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardSpieler({account,meineTeams,myRosterId,setActive}){
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const firstName=player?.firstName||account?.name?.split(" ")[0]||"Spieler";
  const team=meineTeams?.[0]||player?.teams?.[0]||"Cc-Junioren";
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";};
  const parseDate2=(d)=>{const m=(d||"").match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:"";};

  /* Load persisted schichtenState */
  const [schichtenState,setSchichtenState]=useState({});
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{
      try{const res=await window.storage.get("helfer_schichten");if(res)setSchichtenState(JSON.parse(res.value));}catch(e){}
      try{const res=await window.storage.get("aufgebot_state");if(res)setAufgebotState(JSON.parse(res.value));}catch(e){}
    })();
  },[]);

  /* Anwesenheitsquote */
  const myId=myRosterId||1;
  const rsvpEvs=ATT_EVENTS.filter(e=>(e.team===team||e.team==="Alle")&&e.rsvp!==false&&e.type==="Training");
  const pastEvs=rsvpEvs.filter(e=>parseD(e.date)<today);
  const zuCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[myId]?.status==="zu").length;
  const attPct=pastEvs.length?Math.round(zuCount/pastEvs.length*100):null;
  const attColor=attPct===null?"#aaa":attPct>=80?GN:attPct>=60?AM:R;

  /* Nächster Termin */
  const nextEv=ATT_EVENTS.filter(e=>(e.team===team||e.subtype==="Vereinsanlass")&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
  const nextVal=nextEv?nextEv.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim()+" "+nextEv.time.split(":")[0]+":"+nextEv.time.split(":")[1]:"-";
  const nextSub=nextEv?(nextEv.opponent?"vs. "+nextEv.opponent:nextEv.title||nextEv.type):"Keine Termine";

  /* Helfereinsätze - kombiniert statische + dynamische Daten */
  const meinName=player?`${player.firstName} ${player.lastName}`:(account?.name||"");
  const helperRecord=HELPERS.find(h=>h.name===meinName);
  const meineSchichtenMitDatum=HELPER_EVENTS.flatMap(ev=>
    ev.einsaetze.flatMap(e=>
      (e.schichten||[]).filter(s=>{
        const helfer=schichtenState[s.id]??s.helfer;
        return helfer.includes(meinName);
      }).map(s=>({...s,einsatzDate:e.date||"",einsatzName:ev.name||"",ort:e.location||""}))
    )
  );
  const helferSoll=helperRecord?.soll??meineSchichtenMitDatum.length;
  const helferGeleistet=helperRecord?.geleistet??meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)<today).length;
  const helferOffen=Math.max(0,helferSoll-helferGeleistet);

  /* Nächstes Aufgebot */
  const nextAufgebot=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today&&(aufgebotState[e.id]||[]).includes(myId))
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

  /* Nächstes Spiel */
  const nextSpiel=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today)
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
  const nextSpielImAufgebot=nextSpiel&&(aufgebotState[nextSpiel?.id]||[]).includes(myId);
  const nextSpielAufgebotStatus=nextSpiel
    ?(nextSpielImAufgebot?"Im Aufgebot":"Noch kein Aufgebot")
    :"Kein Spiel geplant";

  /* Nächstes Training */
  const nextTraining=ATT_EVENTS
    .filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)>=today)
    .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Hallo, {firstName}</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Spieler · {team} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={pastEvs.length?zuCount+"/"+pastEvs.length+" Trainings":"Noch keine vergangenen"} color={attColor}/>
        <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} color={GN}/>
        <Stat label="Nächstes Spiel" value={nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextSpiel?`${(nextSpiel.time||"").slice(0,5)} Uhr · ${nextSpielAufgebotStatus}`:nextSpielAufgebotStatus} color={nextSpielImAufgebot?"#4F46E5":nextSpiel?BL:"#aaa"}/>
        <Stat label="Helfereinsätze" value={helferSoll>0?helferGeleistet+"/"+helferSoll:"-"} sub={helferSoll>0?"Geleistet / Soll":"Keine Einsätze"} color={helferSoll>0?(helferOffen===0?GN:AM):"#aaa"}/>
      </div>
      {/* Aufgebot-Banner */}
      {nextAufgebot&&(
        <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.openEvId=nextAufgebot.id;setActive("team");}:undefined}
          style={{background:"#EEF2FF",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
          <span style={{fontSize:24}}><i className="ti-ball-football"/></span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14,color:"#4F46E5"}}>Du bist im Aufgebot!</div>
            <div style={{fontSize:13,color:"#6366F1",marginTop:2}}>
              {`vs. ${nextAufgebot.opponent} · ${nextAufgebot.date} · ${nextAufgebot.time} Uhr`}
            </div>
            {nextAufgebot.treffpunkt&&<div style={{fontSize:11,color:"#818CF8",marginTop:3}}><i className="ti-target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebot.treffpunkt}</div>}
          </div>
          <Chip text="Aufgebot" color="#4F46E5" bg="#EEF2FF"/>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        <Card>
          <STitle>Meine nächsten Termine</STitle>
          {(()=>{
            const upcoming=ATT_EVENTS.filter(e=>(e.team===team||e.subtype==="Vereinsanlass")&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date))).slice(0,3);
            if(upcoming.length===0) return <div style={{fontSize:12,color:"#aaa"}}>Keine anstehenden Termine.</div>;
            return upcoming.map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{t.opponent?"vs. "+t.opponent:t.type==="Training"?"Training · "+t.team:t.title||t.type}</div>
                  <div style={{fontSize:11,color:"#888"}}>{t.date} · {t.time+" Uhr"}</div>
                </div>
                <Chip text={t.subtype||t.type} color={t.type==="Spiel"?BL:t.subtype==="Team-Event"?AM:GN}/>
              </div>
            ));
          })()}
        </Card>
        <Card>
          <STitle>Offene Anwesenheitsmeldungen</STitle>
          {(()=>{
            const open=ATT_EVENTS.filter(e=>(e.team===team||e.team==="Alle")&&e.rsvp!==false&&parseD(e.date)>=today&&(!ATT_INITIAL[e.id]?.[myRosterId]?.status)).slice(0,3);
            if(open.length===0) return <div style={{fontSize:12,color:GN,fontWeight:600}}>✓ Alle Termine beantwortet</div>;
            return open.map((x,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:i<open.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{fontWeight:600,fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</div>
                <div style={{fontSize:11,color:"#888",marginBottom:4}}>Rückmeldung ausstehend</div>
              </div>
            ));
          })()}
        </Card>
        <Card>
          <STitle>Offene Abstimmungen</STitle>
          {POLLS.filter(p=>!p.closed).map((p,i)=>(
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{p.title}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {p.options.map((opt,j)=>(
                  <button key={j} style={{padding:"4px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:12,cursor:"pointer",background:"#fafaf8"}}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Meine Helfereinsätze</STitle>
          {(()=>{
            const geplant=meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)>=today).length;
            return(
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:GR,borderRadius:10,marginBottom:14}}>
                <div style={{fontSize:26,fontWeight:800,color:helferOffen===0&&helferSoll>0?GN:helferSoll>0?AM:"#aaa",lineHeight:1}}>
                  {helferSoll>0?helferGeleistet+"/"+helferSoll:"-"}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:BK}}>Geleistet / Soll</div>
                  <div style={{fontSize:11,color:"#888"}}>{geplant>0?geplant+" ausstehend":helferOffen===0&&helferSoll>0?"Alle erfüllt ✓":"Keine Einsätze"}</div>
                </div>
              </div>
            );
          })()}
          {meineSchichtenMitDatum.length===0&&<div style={{fontSize:12,color:"#aaa",marginBottom:8}}>Keine Helfereinsätze zugeteilt.</div>}
          {meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)>=today).map((s,i)=>(
            <div key={i} style={{padding:"9px 11px",borderRadius:9,border:`0.5px solid ${GB}`,background:"#fff",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:12,color:BK,marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:11,color:"#888"}}>{s.einsatzName||""}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{""+s.einsatzDate+" · "+(s.location||"")}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#FFF7ED",color:AM,border:`0.5px solid ${AM}`,flexShrink:0}}>Ausstehend</span>
              </div>
            </div>
          ))}
          <InfoBox text="Datenprüfung: Deine Stammdaten wurden zuletzt vor 7 Monaten geprüft. Bitte überprüfen." color={AM}/>
        </Card>
      </div>
    </div>
  );
}

function DashboardEltern({account,meineTeams,setActive}){
  const parentName=account?.name?.split(" ")[0]||"Elternteil";
  const kinder=account?.kinder||[];
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:""};
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("aufgebot_state");if(r)setAufgebotState(JSON.parse(r.value));}catch(e){}})();
  },[]);

  return(
    <div>
      <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Hallo, {parentName}</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Elternteil · {kinder.map(k=>k.name.split(" ")[0]).join(" & ")} · Freitag, 23. Mai 2026</p>

      {kinder.map((kind,ki)=>{
        const team=kind.team||"Cc-Junioren";
        const rosterId=kind.rosterId||1;
        const vorname=kind.name.split(" ")[0];

        /* Anwesenheit - nur Trainings */
        const pastEvs=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)<today);
        const zuCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[rosterId]?.status==="zu").length;
        const abCount=pastEvs.filter(e=>ATT_INITIAL[e.id]?.[rosterId]?.status==="ab").length;
        const attTotal=zuCount+abCount;
        const attPct=attTotal?Math.round(zuCount/attTotal*100):null;
        const attColor=attPct===null?"#aaa":attPct>=80?GN:attPct>=60?AM:R;

        /* Nächste 4 Trainings & Spiele */
        const upcoming=ATT_EVENTS
          .filter(e=>e.team===team&&(e.type==="Training"||e.type==="Spiel")&&parseD(e.date)>=today)
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))
          .slice(0,4);

        /* Team-Events & Vereinsanlässe */
        const anlaesse=ATT_EVENTS
          .filter(e=>(e.team===team||e.team==="Alle")&&e.type==="Veranstaltung"&&parseD(e.date)>=today)
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))
          .slice(0,4);

        const nextAufgebotSpiel=ATT_EVENTS
          .filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today&&(aufgebotState[e.id]||[]).includes(rosterId))
          .sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];

        const accentFor=(e)=>e.type==="Spiel"?BL:e.subtype==="Vereinsanlass"?"#7C3AED":e.type==="Veranstaltung"?AM:GN;

        return(
          <div key={ki} style={{marginBottom:24}}>
            {/* Kind-Header */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:6,height:28,borderRadius:3,background:"#f8de09",flexShrink:0}}/>
              <h2 style={{margin:0,fontSize:16,fontWeight:800}}>{vorname} <span style={{fontSize:12,color:"#aaa",fontWeight:500}}>· {team}</span></h2>
            </div>

            {/* Stat-Kacheln */}
            {(()=>{
              const nextSpiel=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              const nextTraining=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              return(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>
                  <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={attTotal?zuCount+"/"+attTotal+" Trainings":"Noch keine"} color={attColor}/>
                  <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} color={GN}/>
                  {(()=>{
                    const imAufgebot=nextSpiel&&(aufgebotState[nextSpiel.id]||[]).includes(rosterId);
                    return(
                      <div style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:14,padding:"16px 18px",flex:1,minWidth:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:4,position:"relative"}}>
                        <div style={{fontSize:10,color:"#999",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Nächstes Spiel</div>
                        <div style={{fontSize:26,fontWeight:800,color:BL,lineHeight:1}}>{nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"}</div>
                        <div style={{fontSize:11,color:"#aaa",fontWeight:500}}>{nextSpiel?`${nextSpiel.time.slice(0,5)} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel geplant"}</div>
                        {imAufgebot&&<span style={{position:"absolute",bottom:10,right:12,fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#EEF2FF",color:"#4F46E5",border:"0.5px solid #818CF840"}}><i className="ti-ball-football" style={{marginRight:4}}/> Im Aufgebot</span>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Aufgebot-Banner */}
            {nextAufgebotSpiel&&(
              <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;NAV_TARGET.openEvId=nextAufgebotSpiel.id;setActive("team");}:undefined}
                style={{background:"#EEF2FF",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
                <span style={{fontSize:24}}><i className="ti-ball-football"/></span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#4F46E5"}}>{vorname} ist im Aufgebot!</div>
                  <div style={{fontSize:12,color:"#6366F1",marginTop:2}}>
                    {`vs. ${nextAufgebotSpiel.opponent} · ${nextAufgebotSpiel.date} · ${nextAufgebotSpiel.time} Uhr`}
                  </div>
                  {nextAufgebotSpiel.treffpunkt&&<div style={{fontSize:11,color:"#818CF8",marginTop:3}}><i className="ti-target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebotSpiel.treffpunkt}</div>}
                </div>
                <div style={{background:"#4F46E5",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20}}>Aufgebot</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {/* Nächste 4 Trainings & Spiele */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:11,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Trainings & Spiele</STitle>
                {upcoming.length===0&&<div style={{fontSize:12,color:"#aaa"}}>Keine anstehenden Trainings oder Spiele.</div>}
                {upcoming.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>
                        {e.type==="Training"?`Training · ${team}`:e.opponent?"vs. "+e.opponent:e.title||e.type}
                      </div>
                      <div style={{fontSize:11,color:"#888"}}>{e.date} · {e.time} Uhr · {e.location}</div>
                    </div>
                    <Chip text={e.type} color={accentFor(e)}/>
                  </div>
                ))}
              </Card>

              {/* Team-Events & Vereinsanlässe */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["team-event","vereinsanlass"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:11,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Team-Events & Anlässe</STitle>
                {anlaesse.length===0&&<div style={{fontSize:12,color:"#aaa"}}>Keine anstehenden Anlässe.</div>}
                {anlaesse.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<anlaesse.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>{e.title||e.type}</div>
                      <div style={{fontSize:11,color:"#888"}}>{e.date} · {e.time} Uhr · {e.location}</div>
                    </div>
                    <Chip text={e.subtype||e.type} color={accentFor(e)}/>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        );
      })}

    </div>
  );
}

/* ==========================================
   MEIN TEAM (rollenabhängig)
========================================== */
function TeamView({role,trainerTeams=["Cc-Junioren"],setActive,myRosterId,account}){
  const [responses,setResponses]=useState(ATT_INITIAL);
  useEffect(()=>{
    (async()=>{
      try{
        const r=await window.storage.get("att_responses");
        if(r){
          const stored=JSON.parse(r.value);
          /* Deep merge: keep ATT_INITIAL as base, overlay stored values per event per player */
          const merged={...ATT_INITIAL};
          Object.keys(stored).forEach(evId=>{
            merged[evId]={...ATT_INITIAL[evId],...stored[evId]};
          });
          setResponses(merged);
        }
      }catch(e){}
    })();
  },[]);
  const isSpieler=role==="spieler";
  const isEltern=role==="eltern";
  const isTrainer=role==="trainer";
  const limited=isSpieler||isEltern;
  const hasMultiTeams=trainerTeams.length>1;

  const TEAMS_DATA={
    "Cc-Junioren":           {count:18,liga:"U12 Liga A",   season:"2024/25"},
    "Ca-Junioren":           {count:16,liga:"U13 Liga A",   season:"2024/25"},
    "A-Junioren":            {count:16,liga:"U16 Liga A",   season:"2024/25"},
    "1. Mannschaft Herren":  {count:20,liga:"1. Liga",      season:"2024/25"},
    "2. Mannschaft Herren":  {count:18,liga:"3. Liga",      season:"2024/25"},
    "1. Mannschaft Frauen":  {count:16,liga:"Frauen 2. Liga",season:"2024/25"},
    "Da-Junioren":           {count:14,liga:"U13 Liga A",   season:"2024/25"},
    "Db-Junioren":           {count:14,liga:"U13 Liga B",   season:"2024/25"},
    "Ba-Junioren":           {count:15,liga:"U15 Liga A",   season:"2024/25"},
    "Bb-Junioren":           {count:14,liga:"U15 Liga B",   season:"2024/25"},
    "D-Juniorinnen":         {count:14,liga:"U11 Mädchen",  season:"2024/25"},
    "E-Juniorinnen":         {count:12,liga:"U10 Mädchen",  season:"2024/25"},
    "F-Juniorinnen":         {count:12,liga:"U9 Mädchen",   season:"2024/25"},
    "C-Juniorinnen":         {count:14,liga:"U13 Mädchen",  season:"2024/25"},
  };

  const kinder=account?.kinder||[];
  const hasMultiKinder=isEltern&&kinder.length>1;
  const [activeKind,setActiveKind]=useState(kinder[0]||null);

  const [activeTeam,setActiveTeam]=useState(
    isEltern&&kinder[0]?.team ? kinder[0].team : trainerTeams[0]||"Cc-Junioren"
  );

  /* When eltern switches child, update activeTeam too */
  const handleKindSwitch=(kind)=>{
    setActiveKind(kind);
    if(kind.team) setActiveTeam(kind.team);
    setTab("overview");
  };

  const playerName=myRosterId?ROSTER.find(p=>p.id===myRosterId)?.firstName||"Spieler":"Spieler";
  const kinderNames=activeKind?activeKind.name.split(" ")[0]:(kinder.map(k=>k.name.split(" ")[0]).join(" & ")||playerName);
  const [selectedSpiel,setSelectedSpiel]=useState(null);
  const teamInfo=TEAMS_DATA[activeTeam]||{count:ROSTER.filter(p=>(p.teams||[]).includes(activeTeam)).length,liga:"Liga A",season:"2024/25"};
  const actualCount=ROSTER.filter(p=>(p.teams||[]).includes(activeTeam)).length||teamInfo.count;

  const TABS_ALL=[
    {key:"overview",label:"Übersicht"},{key:"roster",label:"Kader"},
    {key:"attendance",label:"Termine"},{key:"training",label:"Trainingsplan"},
    {key:"spielplan",label:"Spielplan & Tabelle"},
    {key:"polls",label:"Abstimmungen"},
    {key:"helpers",label:"Helfereinsätze"},{key:"stats",label:"Statistik"},
  ];
  const TABS_LIMITED=[
    {key:"overview",label:"Übersicht"},{key:"roster",label:"Kader"},
    {key:"attendance",label:"Termine"},{key:"spielplan",label:"Spielplan & Tabelle"},
    {key:"polls",label:"Abstimmungen"},{key:"helpers",label:"Helfereinsätze"},
  ];
  const tabs=limited?TABS_LIMITED:TABS_ALL;
  const [tab,setTab]=useState(()=>{const t=NAV_TARGET.tab||"overview";NAV_TARGET.tab=null;return t;});
  const [attFilter,setAttFilter]=useState(()=>{const f=NAV_TARGET.filter||[];NAV_TARGET.filter=null;return f;});
  const [rosterInitial,setRosterInitial]=useState(null);
  /* If NAV_TARGET specified a kindTeam, set activeKind accordingly */
  useEffect(()=>{
    if(NAV_TARGET.kindTeam){
      const kt=NAV_TARGET.kindTeam;NAV_TARGET.kindTeam=null;
      const k=kinder.find(c=>c.team===kt);
      if(k){setActiveKind(k);setActiveTeam(k.team);}
    }
  },[]);

  /* Reset tab when switching teams */
  const handleTeamSwitch=(team)=>{
    setActiveTeam(team);
    setTab("overview");
  };

  const title=isEltern?`Mein Kind - ${kinderNames}`:`Mein Team - ${activeTeam}`;

  return(
    <div>
      {/* Team-Header */}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:hasMultiTeams?12:18}}>
        <div style={{width:8,height:42,borderRadius:4,background:"#f8de09",flexShrink:0,marginTop:2}}/>
        <div style={{flex:1}}>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>{isEltern?`Mein Kind - ${kinderNames}${activeKind?.team?" · "+activeKind.team:""}`:`Mein Team - ${activeTeam}`}</h1>
          <p style={{color:"#888",margin:0,fontSize:12}}>
            {isEltern?"Elternzugang · ":""}
            {actualCount} Spieler · Saison {teamInfo.season} · {teamInfo.liga}
          </p>
        </div>
      </div>

      {/* Kind-Selektor (nur wenn Eltern mehrere Kinder haben) */}
      {hasMultiKinder&&(
        <div style={{display:"flex",gap:8,marginBottom:18,padding:"12px 14px",background:"#fff",borderRadius:12,border:`0.5px solid ${GB}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginRight:4}}>Kind:</span>
          {kinder.map((k,i)=>{
            const active=activeKind?.name===k.name;
            const cnt=ROSTER.filter(p=>(p.teams||[]).includes(k.team)&&!p.role).length;
            const info=TEAMS_DATA[k.team]||{liga:"",season:""};
            return(
              <button key={i} onClick={()=>handleKindSwitch(k)}
                style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:10,
                  border:`1.5px solid ${active?"#f8de09":GB}`,
                  background:active?"#f8de0930":"#fff",cursor:"pointer",transition:"all 0.12s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:active?"rgba(0,0,0,0.1)":GR,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:BK,flexShrink:0}}>
                  {k.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:BK,whiteSpace:"nowrap"}}>{k.name.split(" ")[0]}</div>
                  <div style={{fontSize:10,color:"rgba(0,0,0,0.5)"}}>{k.team} · {info.liga}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Team-Selektor (Trainer) */}
      {hasMultiTeams&&(
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",padding:"12px 14px",background:"#fff",borderRadius:12,border:`0.5px solid ${GB}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <span style={{fontSize:11,color:"#aaa",fontWeight:600,alignSelf:"center",marginRight:4,textTransform:"uppercase",letterSpacing:0.5}}>Team:</span>
          {trainerTeams.map(team=>{
            const info=TEAMS_DATA[team]||{count:18,liga:"Liga A"};
            const isActive=activeTeam===team;
            const cnt=ROSTER.filter(p=>(p.teams||[]).includes(team)).length||info.count;
            return(
              <button key={team} onClick={()=>handleTeamSwitch(team)}
                style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:10,
                  border:`0.5px solid ${isActive?"#f8de09":GB}`,
                  background:isActive?"#f8de0930":"#fff",
                  cursor:"pointer",transition:"all 0.12s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:isActive?"rgba(0,0,0,0.1)":GR,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:isActive?BK:"#888",flexShrink:0}}>
                  {team.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:isActive?BK:BK,whiteSpace:"nowrap"}}>{team}</div>
                  <div style={{fontSize:10,color:isActive?"rgba(0,0,0,0.5)":"#aaa"}}>{cnt} Spieler · {info.liga}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Tabs tabs={tabs} active={tab} setActive={setTab}/>
      {tab==="overview"&&<TeamOverview role={role} team={activeTeam} setTab={setTab} setAttFilter={setAttFilter} responses={responses} setRosterInitial={setRosterInitial}/>}
      {tab==="roster"&&<RosterTab role={role} team={activeTeam} initialSelected={rosterInitial}/>}
      {tab==="training"&&!limited&&<TrainingGantt team={activeTeam}/>}
      {tab==="spielplan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Spielplan</div>
            <ScheduleTab role={role} team={activeTeam} initialSelected={selectedSpiel}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Tabelle</div>
            <TableTab team={activeTeam}/>
          </div>
        </div>
      )}
      {tab==="attendance"&&<AttendanceTab role={role} team={activeTeam} setActive={setActive} myRosterId={isEltern&&activeKind?.rosterId?activeKind.rosterId:myRosterId} onNavigateToSpiel={(spiel)=>{setSelectedSpiel(spiel);setTab("spielplan");}} initialFilter={attFilter} responses={responses} allTeams={trainerTeams.length>1?trainerTeams:undefined} onResponseChange={(r)=>{
        const merged={...responses};
        Object.keys(r).forEach(evId=>{merged[evId]={...responses[evId],...r[evId]};});
        setResponses(merged);
        /* Save only delta */
        const delta={};
        Object.keys(merged).forEach(evId=>{
          Object.keys(merged[evId]||{}).forEach(pid=>{
            const cur=merged[evId]?.[pid]?.status;
            const init=ATT_INITIAL[evId]?.[pid]?.status;
            if(cur!==init){if(!delta[evId])delta[evId]={};delta[evId][pid]=merged[evId][pid];}
          });
        });
        window.storage.set("att_responses",JSON.stringify(delta)).catch(()=>{});
      }}/>}
      {tab==="events"&&<EventsList teamOnly role={role}/>}
      {tab==="polls"&&<PollsTab role={role}/>}
      {tab==="helpers"&&<HelpersList teamOnly role={role} account={account} meineTeams={[activeTeam]}/>}
      {tab==="stats"&&!limited&&<StatsTab team={activeTeam}/>}
    </div>
  );
}

function TeamOverview({role,team,setTab,setAttFilter,responses=ATT_INITIAL,setRosterInitial}){
  const isEltern=role==="eltern";
  const today="2026-05-23";
  const parseEvDate=(d)=>{
    if(!d) return "";
    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const parts=clean.split(".");
    if(parts.length>=2) return `2026-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    return "";
  };
  const myTeam=team||"Cc-Junioren";
  const upcoming=ATT_EVENTS
    .filter(e=>e.team===myTeam||e.team==="Alle")
    .filter(e=>parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)))
    .slice(0,8);

  const spielplan=ATT_EVENTS
    .filter(e=>e.team===myTeam&&(e.type==="Training"||e.type==="Spiel")&&parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)));
  const allTermine=ATT_EVENTS
    .filter(e=>e.type==="Veranstaltung"&&(e.team===myTeam||e.team==="Alle"))
    .filter(e=>parseEvDate(e.date)>=today)
    .sort((a,b)=>parseEvDate(a.date).localeCompare(parseEvDate(b.date)))
    .slice(0,4);
  const accentFor=(e)=>e.type==="Spiel"?BL:e.subtype==="Vereinsanlass"?"#7C3AED":e.type==="Veranstaltung"?AM:GN;

  const termine=allTermine;

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
      {/* Team Übersicht */}
      <Card>
        <STitle>Info</STitle>
        {(()=>{
          const spieler=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&!p.role);
          const trainer=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&p.role);
          const pos=[...new Set(spieler.map(p=>p.pos).filter(Boolean))];
          const tableData=TABLES[myTeam]||[];
          const myRow=tableData.find(r=>r.me);
          return(
            <div>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                {[
                  {l:"Spieler im Kader", v:spieler.length, c:BK},
                  {l:"Trainer & Staff",  v:trainer.length, c:BK},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:GR,borderRadius:8,padding:"12px 4px"}}>
                    <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:4,lineHeight:1.3,textAlign:"center"}}>{s.l}</div>
                  </div>
                ))}
                {myRow&&(
                  <div onClick={setTab?()=>setTab("spielplan"):undefined}
                    style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:GR,borderRadius:8,padding:"12px 4px",cursor:setTab?"pointer":"default",transition:"background 0.1s"}}
                    onMouseEnter={e=>setTab&&(e.currentTarget.style.background=GB)}
                    onMouseLeave={e=>setTab&&(e.currentTarget.style.background=GR)}>
                    <div style={{fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4,textAlign:"center"}}>Tabellenrang</div>
                    <div style={{fontSize:26,fontWeight:800,color:BL,lineHeight:1}}>{myRow.rank}.</div>
                    <div style={{fontSize:10,color:"#888",marginTop:4,textAlign:"center"}}>{tableData.length} Teams · {myRow.pts} Punkte</div>
                  </div>
                )}
              </div>
              {trainer.length>0&&(
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Trainer & Staff</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {trainer.map((t,i)=>(
                    <div key={i} onClick={setTab&&setRosterInitial?()=>{setRosterInitial(t.id);setTab("roster");}:undefined}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",background:GR,borderRadius:9,cursor:setTab?"pointer":"default",transition:"background 0.1s"}}
                      onMouseEnter={e=>setTab&&(e.currentTarget.style.background=GB)}
                      onMouseLeave={e=>setTab&&(e.currentTarget.style.background=GR)}>
                      <Av name={`${t.firstName} ${t.lastName}`} size={26} bg={R}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:12}}>{t.firstName} {t.lastName}</div>
                        <div style={{fontSize:10,color:"#888"}}>{t.role}</div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Card>
      <Card>
        <STitle>{isEltern?"Anwesenheit Team":"Anwesenheit Team"}</STitle>
        {(()=>{
          /* Only team-specific past Training + Spiel events */
          const pastEvs=ATT_EVENTS
            .filter(e=>e.team===myTeam&&(e.type==="Training"||e.type==="Spiel"))
            .filter(e=>parseEvDate(e.date)<today);
          const trainEvs=pastEvs.filter(e=>e.type==="Training");
          const spielEvs=pastEvs.filter(e=>e.type==="Spiel");
          /* Use same player slice as ATT_INITIAL */
          const pids=ROSTER.filter(p=>(p.teams||[]).includes(myTeam)&&!p.role).map(p=>p.id).slice(0,12);
          /* Only count "zu", "ab", "unentschuldigt" - null/fraglich excluded */
          const calcPct=(evs)=>{
            if(!evs.length) return null;
            if(!pids.length){
              /* No roster: use seed-based synthetic data */
              let zu=0,total=0;
              evs.forEach(ev=>{
                for(let i=0;i<10;i++){const seed=(ev.id*37+i*13)%100;total++;if(seed<75)zu++;}
              });
              return total?Math.round(zu/total*100):null;
            }
            let zu=0,ab=0;
            evs.forEach(ev=>pids.forEach(pid=>{
              const s=responses[ev.id]?.[pid]?.status||ATT_INITIAL[ev.id]?.[pid]?.status;
              if(s==="zu") zu++;
              else if(s==="ab"||s==="unentschuldigt") ab++;
            }));
            const total=zu+ab;
            return total?Math.round(zu/total*100):null;
          };
          const col=(v)=>v===null?"#aaa":v>=80?GN:v>=60?AM:R;
          const fmt=(v)=>v===null?"-":v+"%";
          return(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {l:"Total",              v:fmt(calcPct(pastEvs)),           c:col(calcPct(pastEvs))},
                {l:"Trainings",          v:fmt(calcPct(trainEvs)),          c:col(calcPct(trainEvs))},
                {l:"Spiele",             v:fmt(calcPct(spielEvs)),          c:col(calcPct(spielEvs))},
                {l:"Letzte 5 Trainings", v:fmt(calcPct(trainEvs.slice(-5))),c:col(calcPct(trainEvs.slice(-5)))},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",background:GR,borderRadius:8,padding:"10px 4px"}}>
                  <div style={{fontSize:9,color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Ø Anwesenheit</div>
                  <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#888",lineHeight:1.3,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["training","spiele"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<span style={{fontSize:11,color:BL,fontWeight:600}}>Alle anzeigen →</span>}>Spielplan & Training</STitle>
        {(()=>{
          const shown=spielplan.slice(0,4);
          return(<>
            {shown.length===0&&<div style={{fontSize:12,color:"#aaa",padding:"8px 0"}}>Keine anstehenden Spiele oder Trainings.</div>}
            {shown.map((e,i)=>(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<shown.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:BK,overflow:"hidden",textOverflow:"ellipsis"}}>
                    {e.opponent?"vs. "+e.opponent:e.type==="Training"?"Training · "+e.team:e.title||e.type}
                  </div>
                  <div style={{fontSize:11,color:"#888",display:"flex",alignItems:"center",gap:6}}>
                    <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                    <span style={{color:"#ddd"}}>·</span>
                    <span>{e.time+" Uhr"}</span>
                    <span style={{color:"#ddd"}}>·</span>
                    <span>{e.location}</span>
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0}}>{e.type}</span>
              </div>
            ))}
          </>);
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["team-event","vereinsanlass"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<span style={{fontSize:11,color:BL,fontWeight:600}}>Alle anzeigen →</span>}>Vereinsanlässe & Team-Events</STitle>
        {termine.length===0&&<div style={{fontSize:12,color:"#aaa",padding:"8px 0"}}>Keine anstehenden Anlässe.</div>}
        {termine.map((e,i)=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<termine.length-1?`0.5px solid ${GB}`:"none"}}>
            <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:BK,overflow:"hidden",textOverflow:"ellipsis"}}>{e.title||e.type}</div>
              <div style={{fontSize:11,color:"#888",display:"flex",alignItems:"center",gap:6}}>
                <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                <span style={{color:"#ddd"}}>·</span>
                <span>{e.time+" Uhr"}</span>
                <span style={{color:"#ddd"}}>·</span>
                <span>{e.location}</span>
              </div>
            </div>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0,whiteSpace:"nowrap"}}>{e.subtype||e.type}</span>
          </div>
        ))}
      </Card>
      {(role==="trainer"||role==="administrator"||role==="administration")&&(
        <Card>
          <STitle>Teamnews</STitle>
          {(()=>{
            const NEWS={
              "Cc-Junioren":        "Neues Tenü ab Di im Materialraum. Elternabend 10.06. - Rückmeldung bis 05.06. Vereinsbus für Auswärtsspiel Sa 07.06. reserviert.",
              "Ca-Junioren":        "Trainingslager 20.-22.06. - Anmeldung bis 05.06. Neue Leibchen liegen im Materialraum bereit. Auswärtsspiel Sa 31.05. - Treffpunkt 14:15 Bahnhof.",
              "1. Mannschaft Herren":"Saisonabschluss Fr 12.06. im Vereinslokal. Neuer Torwart ab nächster Woche im Training. Auswärtsfahrt Sa 07.06. - Bus um 13:30 ab Sportanlage.",
              "2. Mannschaft Herren":"Trainingsverschiebung: Di 27.05. auf Mi 28.05. Materialraum ab Fr zugänglich. Anwesenheitspflicht für Spiel Sa 31.05.",
              "1. Mannschaft Frauen":"Neue Trainingszeiten ab Juni: Di 19:30 und Do 19:30. Teamfoto Fr 06.06. vor dem Training. Vereinsbus für Auswärtsspiel gebucht.",
              "Da-Junioren":        "Elternabend Mi 04.06. um 19:00 Uhr. Neue Spielschuhe im Materialraum. Turnier in Küsnacht Sa 14.06.",
              "Db-Junioren":        "Training fällt aus am Fr 30.05. (Feiertag). Nachholtraining Di 03.06. Neue Leibchen verteilt.",
              "Ba-Junioren":        "Konditionstest nächsten Di. Elterninformation zum Trainingslager verschickt. Auswärtsspiel Sa 24.05. - Abfahrt 13:30.",
              "Bb-Junioren":        "Trainingsplan für Juni hängt im Materialraum. Neuer Co-Trainer ab Juni. Teamfoto beim nächsten Heimspiel.",
              "D-Juniorinnen":      "Schnuppertraining für Neue am Sa 07.06. Neues Trainingsmaterial eingetroffen. Turnier in Herrliberg am 21.06.",
              "E-Juniorinnen":      "Spielfest am Sa 14.06. - bitte bis Fr 06.06. anmelden. Neue Bälle im Materialraum.",
              "F-Juniorinnen":      "Elternabend Do 05.06. um 18:30. Trikots für neue Spielerinnen bestellt. Nächstes Spielfest am 21.06.",
              "C-Juniorinnen":      "Trainingslager geplant für Juli - Details folgen. Neues Tenü ab Di im Materialraum. Turnier am 14.06.",
              "A-Junioren":         "Konditionstraining ab nächster Woche. Neue Taktikbesprechung Mi 28.05. nach Training. Auswärtsspiel Sa 31.05.",
            };
            const text=NEWS[myTeam]||"Keine aktuellen Teamnews.";
            return <p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.65}}>{text}</p>;
          })()}
        </Card>
      )}
    </div>
  );
}

/* -- Mitglied-Detailansicht (Modal) -- */
function MitgliedDetail({person,role,onClose,nr,onUpdateNr}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const can=(field)=>vis.includes(field);
  const canEdit=["trainer","administrator","administration"].includes(role);
  const [editingNr,setEditingNr]=useState(false);
  const [nrVal,setNrVal]=useState(nr||"");

  const Row=({label,value,mono,blue})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"9px 14px",borderBottom:`0.5px solid ${GB}`,gap:12}}>
      <span style={{fontSize:12,color:"#888",flexShrink:0,minWidth:120}}>{label}</span>
      <span style={{fontSize:13,fontWeight:500,color:blue?BL:mono?"#666":BK,textAlign:"right",wordBreak:"break-word",fontFamily:mono?"monospace":"inherit"}}>{value||"-"}</span>
    </div>
  );

  const NrRow=()=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:`0.5px solid ${GB}`,gap:12}}>
      <span style={{fontSize:12,color:"#888",flexShrink:0,minWidth:120}}>{"Rückennummer"}</span>
      {canEdit&&editingNr?(
        <input autoFocus type="number" min="1" max="99" value={nrVal}
          onChange={e=>setNrVal(e.target.value)}
          onBlur={()=>{setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}
          onKeyDown={e=>{if(e.key==="Enter"){setEditingNr(false);if(onUpdateNr)onUpdateNr(nrVal);}}}
          style={{width:60,padding:"3px 7px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:13,fontWeight:700,textAlign:"right",color:R,outline:"none"}}
        />
      ):(
        <div onClick={canEdit?()=>setEditingNr(true):undefined}
          style={{display:"flex",alignItems:"center",gap:5,cursor:canEdit?"pointer":"default"}}>
          <span style={{fontSize:13,fontWeight:500,color:BK}}>{nrVal||"-"}</span>
          {canEdit&&<span style={{fontSize:10,color:"#ccc"}}><i className="ti-edit"/></span>}
        </div>
      )}
    </div>
  );

  return(
    <div onClick={onClose} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"#fff",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:R,borderRadius:"16px 16px 0 0",padding:"20px 22px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:1}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>
            {(person.firstName[0]||"")+(person.lastName[0]||"")}
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:18,lineHeight:1.2}}>{person.firstName} {person.lastName}</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:4,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <Chip text={person.pos||"-"} color="#fff" bg="rgba(255,255,255,0.25)"/>
              {(person.teams||["Cc-Junioren"]).map((t,i)=>(
                <span key={i} style={{color:"rgba(255,255,255,0.85)",fontSize:11}}>{i>0&&<span style={{opacity:0.5,margin:"0 3px"}}>·</span>}{t}</span>
              ))}
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Saison 2024/25</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}>×</button>
        </div>

        <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:18}}>

          {/* PERSONALIEN */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Personalien</div>
            <div style={{background:GR,borderRadius:10,overflow:"hidden"}}>
              <Row label="Name"          value={person.lastName}/>
              <Row label="Vorname"       value={person.firstName}/>
              <Row label="Team(s)"       value={(person.teams||["Cc-Junioren"]).join(" · ")}/>
              {can("dob")      &&<Row label="Geburtsdatum"      value={person.dob}/>}
              {can("nat")      &&<Row label="Nationalität"       value={person.nat}/>}
              {can("heimatort")&&<Row label="Heimatort / Geburtsort" value={person.heimatort}/>}
              {can("ahv")      &&<Row label="AHV-Nummer"        value="••••••••••" mono/>}
              {can("pass")     &&<Row label="Spielerpass"        value={person.pass}/>}
              {can("js")       &&<Row label="J+S Nummer"         value={person.js}/>}
              {can("fairgate") &&<Row label="Fairgate-ID"        value={person.fairgate} mono/>}
            </div>
          </div>

          {/* ADRESSE */}
          {(can("street")||can("plz")||can("city")||can("canton")||can("country"))&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Adresse</div>
              <div style={{background:GR,borderRadius:10,overflow:"hidden"}}>
                {can("street") &&<Row label="Strasse"  value={person.street}/>}
                {can("plz")    &&<Row label="PLZ"      value={person.plz}/>}
                {can("city")   &&<Row label="Ort"      value={person.city}/>}
                {can("canton") &&<Row label="Kanton"   value={person.canton}/>}
                {can("country")&&<Row label="Land"     value={person.country}/>}
              </div>
            </div>
          )}

          {/* KOMMUNIKATION PERSÖNLICH */}
          {(can("email")||can("tel"))&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Kommunikation Persönlich</div>
              <div style={{background:GR,borderRadius:10,overflow:"hidden"}}>
                {can("email")&&<Row label="E-Mail"  value={person.email} blue/>}
                {can("tel")  &&<Row label="Telefon" value={person.tel}/>}
              </div>
            </div>
          )}

          {/* ERZIEHUNGSBERECHTIGTE PERSON 1 */}
          {can("parent1")&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Erziehungsberechtigte Person 1</div>
              <div style={{background:GR,borderRadius:10,overflow:"hidden"}}>
                <Row label="Name"    value={person.p1Last}/>
                <Row label="Vorname" value={person.p1First}/>
                <Row label="E-Mail"  value={person.p1Email} blue/>
                <Row label="Telefon" value={person.p1Tel}/>
              </div>
            </div>
          )}

          {/* ERZIEHUNGSBERECHTIGTE PERSON 2 */}
          {can("parent2")&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Erziehungsberechtigte Person 2</div>
              <div style={{background:GR,borderRadius:10,overflow:"hidden"}}>
                <Row label="Name"    value={person.p2Last}/>
                <Row label="Vorname" value={person.p2First}/>
                <Row label="E-Mail"  value={person.p2Email} blue/>
                <Row label="Telefon" value={person.p2Tel}/>
              </div>
            </div>
          )}

          {/* Rollenhinweis */}
          <div style={{padding:"8px 12px",background:"#EFF6FF",borderRadius:8,fontSize:11,color:"#666",display:"flex",alignItems:"center",gap:6}}>
            <span><i className="ti-eye"/></span>
            <span>Feldsichtbarkeit gemäss Rolle: <strong>{getRole(role).label}</strong></span>
          </div>
        </div>
      </div>
      </div>
  );
}

/* -- Kaderliste mit Feldsichtbarkeit -- */
function RosterTab({role,team,initialSelected=null}){
  const isMobile=useIsMobile();
  const vis=FIELD_VIS[role]||[];
  const [search,setSearch]=useState("");
  const initPlayer=typeof initialSelected==="number"?ROSTER.find(p=>p.id===initialSelected)||null:initialSelected;
  const [selected,setSelected]=useState(initPlayer);
  const [positions,setPositions]=useState(()=>Object.fromEntries(ROSTER.map(p=>[p.id,p.pos])));
  const [rueckennrn,setRueckennrn]=useState(()=>Object.fromEntries(ROSTER.map(p=>[p.id,p.rueckennr||""])));
  const [editingPos,setEditingPos]=useState(null);
  const [editingNr,setEditingNr]=useState(null);

  /* Load persisted numbers on mount */
  const [nrLoaded,setNrLoaded]=useState(false);
  if(!nrLoaded){
    setNrLoaded(true);
    (async()=>{
      try{
        const res=await window.storage.get("rueckennrn");
        if(res){
          const d=JSON.parse(res.value);
          Object.assign(NR_CACHE.data,d);
          setRueckennrn(prev=>({...prev,...d}));
        }
      }catch(e){}
    })();
  }

  const saveNr=(newNrn)=>{
    setRueckennrn(newNrn);
    Object.assign(NR_CACHE.data,newNrn);
    window.storage.set("rueckennrn",JSON.stringify(newNrn)).catch(()=>{});
  };
  const canEditPos=role==="trainer"||role==="administrator"||role==="administration";
  const POSITION_GROUPS=[
    {label:"Torwart",     options:["TW"]},
    {label:"Verteidiger", options:["V","IV","RV","LV"]},
    {label:"Mittelfeld",  options:["MF","DM","ZM","LM","RM"]},
    {label:"Sturm",       options:["ST"]},
  ];
  /* Filter by team if provided, then by search */
  const teamRoster=team ? ROSTER.filter(p=>(p.teams||[]).includes(team)) : ROSTER;
  const filtered=teamRoster.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  /* Sorting */
  const [sortKey,setSortKey]=useState("name");
  const [sortDir,setSortDir]=useState(1); /* 1=asc, -1=desc */

  const handleSort=(key)=>{
    if(sortKey===key) setSortDir(d=>d*-1);
    else{setSortKey(key);setSortDir(1);}
  };

  const f=[...filtered].sort((a,b)=>{
    let va,vb;
    if(sortKey==="name"){
      va=a.lastName+a.firstName; vb=b.lastName+b.firstName;
      return va.localeCompare(vb)*sortDir;
    }
    if(sortKey==="pos"){
      va=positions[a.id]||""; vb=positions[b.id]||"";
      return va.localeCompare(vb)*sortDir;
    }
    if(sortKey==="nr"){
      va=rueckennrn[a.id]?parseInt(rueckennrn[a.id]):9999;
      vb=rueckennrn[b.id]?parseInt(rueckennrn[b.id]):9999;
      return (va-vb)*sortDir;
    }
    return 0;
  });

  const SortIcon=({col})=>{
    if(sortKey!==col) return <span style={{color:"#ccc",fontSize:9,marginLeft:3}}>{"↕"}</span>;
    return <span style={{color:R,fontSize:9,marginLeft:3}}>{sortDir===1?<i className="ti-upload"/>:"↓"}</span>;
  };

  const COL_DEF=[
    {key:"name",    label:"Name / Vorname", always:true},
    {key:"pos",     label:"Position",       always:true},
    {key:"nr",      label:"Nr.",            always:true},
    {key:"dob",     label:"Geburtsdatum",   field:"dob"},
    {key:"email",   label:"E-Mail",         field:"email"},
    {key:"tel",     label:"Telefon",        field:"tel"},
    {key:"pass",    label:"Spielerpass",    field:"pass"},
    {key:"js",      label:"J+S Nr.",        field:"js"},
    {key:"ahv",     label:"AHV-Nummer",     field:"ahv"},
    {key:"fairgate",label:"Fairgate-ID",    field:"fairgate"},
  ];
  const cols=COL_DEF.filter(c=>c.always||vis.includes(c.field));

  return(
    <div>
      {selected&&<MitgliedDetail person={selected} role={role} onClose={()=>setSelected(null)} nr={rueckennrn[selected.id]} onUpdateNr={v=>saveNr({...rueckennrn,[selected.id]:v})}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Spieler suchen…" style={{padding:"7px 12px",border:`0.5px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none",width:220}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <InfoBox text={`Sichtbar: ${cols.length} von ${COL_DEF.length} Feldern (Rolle: ${getRole(role).label})`} color={getRole(role).color}/>
        </div>
      </div>
      {isMobile?(
        <Card style={{padding:0}}>
          {filtered.map((p,i)=>(
            <div key={p.id} onClick={()=>setSelected(p)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"16px",borderTop:i>0?`0.5px solid ${GB}`:"none",cursor:"pointer",background:"#fff"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f8de0930"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <Av name={p.name} size={44} bg={p.role?"#7C3AED":"#9CA3AF"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:16,color:"#374151"}}>{p.lastName} {p.firstName}</div>
                <div style={{fontSize:13,color:"#888",marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {positions[p.id]&&<span style={{background:"#F3F4F6",color:"#555",padding:"2px 9px",borderRadius:20}}>{positions[p.id]}</span>}
                  {rueckennrn[p.id]&&<span style={{color:"#aaa"}}>Nr. {rueckennrn[p.id]}</span>}
                  {p.role&&<span style={{background:"#7C3AED18",color:"#7C3AED",padding:"2px 9px",borderRadius:20}}>{p.role}</span>}
                </div>
              </div>
              <span style={{color:"#ccc",fontSize:18}}>›</span>
            </div>
          ))}
        </Card>
      ):(
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:GR}}>
              {cols.map((c,i)=>{
                const sortable=["name","pos","nr"].includes(c.key);
                return(
                  <th key={i}
                    onClick={sortable?()=>handleSort(c.key):undefined}
                    style={{padding:"9px 13px",textAlign:"left",fontWeight:sortable&&sortKey===c.key?800:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap",cursor:sortable?"pointer":"default",userSelect:"none"}}>
                    {c.label}{sortable&&<SortIcon col={c.key}/>}
                  </th>
                );
              })}
              <th style={{padding:"9px 13px",width:32}}/>
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const spieler=f.filter(p=>!p.role);
              const trainer=f.filter(p=>p.role);
              const renderRow=(p,i,bg)=>(
              <tr
                key={p.id}
                onClick={()=>setSelected(p)}
                style={{borderTop:`0.5px solid ${GB}`,background:bg,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8de0930"}
                onMouseLeave={e=>e.currentTarget.style.background=bg}>
                {cols.map((c,j)=>{
                  if(c.key==="nr") return(
                    <td key={j} style={{padding:"9px 10px",width:44,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingNr===p.id?(
                        <input
                          autoFocus
                          type="number"
                          min="1" max="99"
                          value={rueckennrn[p.id]}
                          onChange={e=>saveNr({...rueckennrn,[p.id]:e.target.value})}
                          onBlur={()=>setEditingNr(null)}
                          onKeyDown={e=>{if(e.key==="Enter")setEditingNr(null);}}
                          style={{width:38,padding:"3px 5px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:12,fontWeight:700,textAlign:"center",color:R,outline:"none"}}
                        />
                      ):(
                        <div onClick={canEditPos?()=>setEditingNr(p.id):undefined}
                          title={canEditPos?"Rückennr. bearbeiten":undefined}
                          style={{cursor:canEditPos?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                          {rueckennrn[p.id]
                            ?<span style={{fontSize:12,fontWeight:600,color:"#555"}}>{rueckennrn[p.id]}</span>
                            :<span style={{fontSize:11,color:"#ccc"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:9,color:"#ccc"}}><i className="ti-edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="name") return(
                    <td key={j} style={{padding:"9px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <Av name={p.name} size={26} bg={p.role?"#7C3AED":R}/>
                        <div>
                          <div style={{fontWeight:600,whiteSpace:"nowrap",color:"#555"}}>{p.lastName} {p.firstName}</div>
                          {p.role&&<span style={{fontSize:9,background:"#7C3AED18",color:"#7C3AED",fontWeight:700,padding:"1px 5px",borderRadius:8}}>{p.role}</span>}
                          {!p.role&&p.teams&&p.teams.length>1&&(
                            <div style={{display:"flex",gap:3,marginTop:2,flexWrap:"wrap"}}>
                              {p.teams.map((t,i)=><span key={i} style={{fontSize:9,background:i===0?R+"15":"#EFF6FF",color:i===0?R:BL,fontWeight:600,padding:"1px 5px",borderRadius:8}}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                  if(c.key==="pos") return(
                    <td key={j} style={{padding:"9px 13px"}} onClick={e=>e.stopPropagation()}>
                      {canEditPos&&editingPos===p.id?(
                        <select
                          autoFocus
                          value={positions[p.id]||""}
                          onChange={e=>{setPositions(prev=>({...prev,[p.id]:e.target.value}));setEditingPos(null);}}
                          onBlur={()=>setEditingPos(null)}
                          style={{padding:"3px 6px",border:`1.5px solid ${R}`,borderRadius:6,fontSize:12,fontWeight:600,color:R,background:"#fff",cursor:"pointer",outline:"none"}}>
                          <option value="">- keine -</option>
                          {POSITION_GROUPS.map(g=>(
                            <optgroup key={g.label} label={g.label}>
                              {g.options.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      ):(
                        <div
                          onClick={canEditPos?()=>setEditingPos(p.id):undefined}
                          title={canEditPos?"Position bearbeiten":undefined}
                          style={{display:"inline-flex",alignItems:"center",gap:4,cursor:canEditPos?"pointer":"default"}}>
                          {positions[p.id]
                            ?<Chip text={positions[p.id]} color="#555" bg="#F3F4F6"/>
                            :<span style={{fontSize:11,color:"#ccc",fontStyle:"italic"}}>-</span>
                          }
                          {canEditPos&&<span style={{fontSize:10,color:"#ccc"}}><i className="ti-edit"/></span>}
                        </div>
                      )}
                    </td>
                  );
                  if(c.key==="ahv")     return <td key={j} style={{padding:"9px 13px",color:"#888",fontSize:11}}>••••••••••</td>;
                  if(c.key==="address") return <td key={j} style={{padding:"9px 13px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{p.street}, {p.plz} {p.city}</td>;
                  if(c.key==="parent")  return <td key={j} style={{padding:"9px 13px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{p.p1First} {p.p1Last}</td>;
                  return <td key={j} style={{padding:"9px 13px",color:c.field==="email"?BL:"#555",fontSize:11,whiteSpace:"nowrap"}}>{p[c.field]||"-"}</td>;
                })}
                <td style={{padding:"9px 13px",textAlign:"right",color:"#ccc",fontSize:13}}>›</td>
              </tr>
              );
              const ROLLE_ORDER=["Trainer","Co-Trainer","Coach","Admin"];
              const trainerSorted=[...trainer].sort((a,b)=>{
                const ia=ROLLE_ORDER.indexOf(a.role||"");
                const ib=ROLLE_ORDER.indexOf(b.role||"");
                const ra=ia===-1?99:ia;
                const rb=ib===-1?99:ib;
                return ra!==rb?ra-rb:a.lastName.localeCompare(b.lastName);
              });
              return[
                trainer.length>0&&(
                  <tr key="trainer-divider">
                    <td colSpan={cols.length+1} style={{padding:"6px 13px",background:GR,borderTop:`0.5px solid ${GB}`}}>
                      <span style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5}}>Trainer & Staff</span>
                    </td>
                  </tr>
                ),
                ...trainerSorted.map((p,i)=>renderRow(p,i,"#fafaf8")),
                spieler.length>0&&(
                  <tr key="spieler-divider">
                    <td colSpan={cols.length+1} style={{padding:"6px 13px",background:GR,borderTop:`0.5px solid ${GB}`}}>
                      <span style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5}}>Spieler</span>
                    </td>
                  </tr>
                ),
                ...spieler.map((p,i)=>renderRow(p,i,i%2===0?"#fff":"#fafaf8")),
              ];
            })()}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}

/* -- TRAININGSPLAN STATE (localStorage) -- */
/* == TRAININGSPLAN DATA == */
const INITIAL_PLAENE = [
  {
    id: "plan_1",
    name: "Trainingsplan Saison 2025/26",
    valid_from: "2025-08-01",
    valid_until: "2026-06-30",
    active: true,
    slots: GANTT.flatMap((d,di) => d.slots.map((s,si) => ({
      id: "slot_"+di+"_"+si,
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

/* == PLATZ-GANTT == */
function PlatzGantt({plan,wochenSlots,dayDates,DAYS,dagIndexes,today,displayStart,displayEnd,teamFilter,TEAM_COLORS,canEdit,onClickSlot,onNewSlot,GB,GR,BK,BL}){
  const aktivePlaetze = TRAININGSPLAETZE.filter(function(p){return p.active;});
  const idxMap = dagIndexes || DAYS.map(function(_,i){return i;});
  const alleCols = aktivePlaetze.reduce(function(acc,p){
    const halfn = p.halfn||[];
    if(halfn.length > 0){
      halfn.forEach(function(h){ acc.push({platz:p, half:h, key:p.id+"_"+h}); });
    } else {
      acc.push({platz:p, half:null, key:p.id});
    }
    return acc;
  },[]);

  const totalCols = alleCols.length;
  // In Tagesansicht breitere Spalten
  const timeW = 64;
  const nDays = DAYS.length;
  const nCols = nDays * totalCols;
  const minColW = DAYS.length === 1 ? 100 : 52;
  const maxColW = DAYS.length === 1 ? 200 : 120;
  const [containerW, setContainerW] = useState(800);
  const containerRef = useRef(null);
  useEffect(function(){
    function measure(){
      if(containerRef.current){
        setContainerW(containerRef.current.offsetWidth - timeW - 4);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return function(){ window.removeEventListener("resize", measure); };
  }, []);
  const fitsColW = Math.floor(containerW / nCols);
  const colW = Math.max(minColW, Math.min(maxColW, fitsColW));
  const dayW = totalCols * colW;
  const H15 = 18;

  const slots15 = [];
  for(let h=displayStart; h<displayEnd; h++){
    slots15.push(h, h+0.25, h+0.5, h+0.75);
  }

  function fmtT15(v){
    const hh = String(Math.floor(v)).padStart(2,"0");
    const mm = String(Math.round((v%1)*60)).padStart(2,"0");
    return hh+":"+mm;
  }

  function fmtDate(d){
    return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0");
  }

  return (
    <div ref={containerRef} style={{width:"100%", overflowX:"auto", WebkitOverflowScrolling:"touch", fontFamily:"inherit", fontSize:11}}>
      <div style={{minWidth: timeW + nDays*dayW}}>

        {/* Headers */}
        <div style={{display:"flex", background:"#fff", borderBottom:"1.5px solid #D1CFC8", height:44, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid #E5E3DC", height:"100%"}}/>
          {DAYS.map(function(day,di){
            const d = dayDates[idxMap[di]];
            const isToday = d.toDateString()===today.toDateString();
            const hasSlots = (wochenSlots[idxMap[di]]||[]).length > 0;
            return (
              <div key={di} style={{width:dayW, flexShrink:0, borderRight:"1.5px solid #C8C5BC", background:isToday?"#EEF2FF":"transparent", textAlign:"center", padding:"4px", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                <div style={{fontSize:11, fontWeight:700, letterSpacing:0.5, color:isToday?"#4F46E5":hasSlots?BK:"#888580", textTransform:"uppercase"}}>{day}</div>
                <div style={{fontSize:10, marginTop:1, color:isToday?"#6366F1":"#6B7280", fontWeight:isToday?600:400}}>{fmtDate(d)}</div>
              </div>
            );
          })}
        </div>

        {/* Platz-Namen */}
        <div style={{display:"flex", background:"#F7F6F2", borderBottom:"0.5px solid #DDD9CF", height:22, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid #E5E3DC", height:"100%"}}/>
          {DAYS.map(function(_,di){
            const isToday = dayDates[idxMap[di]].toDateString()===today.toDateString();
            return aktivePlaetze.map(function(p,pi){
              const spanCols = (p.halfn||[]).length||1;
              const isLast = pi===aktivePlaetze.length-1;
              return (
                <div key={di+"_"+p.id} style={{width:spanCols*colW, flexShrink:0, borderRight:isLast?"1.5px solid #C8C5BC":"1px solid #DDD9CF", background:isToday?"#E8ECFF":"transparent", textAlign:"center", padding:"2px 3px", height:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <div style={{fontSize:11, fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
                </div>
              );
            });
          })}
        </div>

        {/* Hälften */}
        <div style={{display:"flex", background:"#F2F1ED", borderBottom:"1.5px solid #C8C5BC", height:18, boxSizing:"border-box", alignItems:"center"}}>
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid #E5E3DC", height:"100%"}}/>
          {DAYS.map(function(_,di){
            const isToday = dayDates[idxMap[di]].toDateString()===today.toDateString();
            return alleCols.map(function(col,ci){
              const isLast = ci===alleCols.length-1;
              return (
                <div key={di+"_"+col.key} style={{width:colW, flexShrink:0, borderRight:isLast?"1.5px solid #C8C5BC":"0.5px solid #DDD9CF", background:isToday?"#DDE1F8":"transparent", textAlign:"center", padding:"1px 2px", height:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <div style={{fontSize:10, fontWeight:500, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.3}}>{col.half||""}</div>
                </div>
              );
            });
          })}
        </div>

        {/* Grid */}
        <div style={{display:"flex"}}>

          {/* Zeitachse */}
          <div style={{width:timeW, flexShrink:0, borderRight:"1px solid #E5E3DC", background:"#FAFAF8"}}>
            {slots15.map(function(t,i){
              const isHour = t%1===0;
              const isHalf = Math.round((t%1)*60)===30;
              return (
                <div key={t} style={{
                  height:H15,
                  borderTop:i>0?"0.5px solid "+(isHour?"#D1CFC8":isHalf?"#E8E6DF":"#F0EFEB"):"none",
                  boxSizing:"border-box",
                  display:"flex", alignItems:"flex-start", justifyContent:"flex-end",
                  paddingRight:5, paddingTop:1
                }}>
                  {isHour && <span style={{fontSize:11, color:"#9CA3AF", fontWeight:600, letterSpacing:-0.3}}>{fmtT15(t)}</span>}
                  {!isHour && <span style={{fontSize:10, color:"#D1D5DB", fontWeight:400}}>{fmtT15(t)}</span>}
                </div>
              );
            })}
          </div>

          {/* 7 Tage */}
          {DAYS.map(function(day,di){
            const realDi = idxMap[di];
            const isToday = dayDates[realDi].toDateString()===today.toDateString();
            const daySlots = (wochenSlots[realDi]||[]).filter(function(s){ return teamFilter==="alle"||s.team===teamFilter; });
            const totalH = H15*slots15.length;

            return (
              <div key={di} style={{display:"flex", borderRight:"1.5px solid #C8C5BC", background:isToday?"#F8F9FF":"transparent"}}>
                {alleCols.map(function(col,ci){
                  const platzHaelften = col.platz.halfn||[];
                  const hasHaelften = platzHaelften.length > 0;
                  const isFirstHaelfte = hasHaelften && col.half===platzHaelften[0];
                  const numHaelften = platzHaelften.length||1;

                  const colSlots = daySlots.filter(function(s){
                    if(!hasHaelften){
                      return s.location===col.platz.name || (s.end_ort&&s.end_ort===col.platz.name);
                    }
                    var p1platz = s.location;
                    var p2platz = s.end_ort||s.location;
                    var p1h = s.half;
                    var p2h = s.end_half;
                    if(!s.wechsel_zeit){
                      if(col.platz.name!==p1platz) return false;
                      if(!p1h) return true;
                      return p1h===col.half;
                    }
                    var p1here = col.platz.name===p1platz && (!p1h ? true : p1h===col.half);
                    var p2here = col.platz.name===p2platz && (!p2h ? true : p2h===col.half);
                    return p1here || p2here;
                  });

                  return (
                    <div key={col.key}
                      style={{width:colW, flexShrink:0, position:"relative", height:totalH, borderRight:ci<alleCols.length-1?"0.5px solid #E8E6DF":"none", cursor:canEdit?"crosshair":"default"}}
                      onClick={canEdit ? function(e){
                        if(e.target !== e.currentTarget) return;
                        var rect = e.currentTarget.getBoundingClientRect();
                        var relY = e.clientY - rect.top;
                        var rawTime = displayStart + relY / (H15*4);
                        var snapped = Math.round(rawTime*4)/4;
                        snapped = Math.max(displayStart, Math.min(displayEnd-1, snapped));
                        onNewSlot({
                          weekday: DAYS[di],
                          start: snapped,
                          end: Math.min(snapped+1.5, displayEnd),
                          ort: col.platz.name,
                          half: col.half||"",
                        });
                      } : undefined}>
                      {slots15.map(function(t,i){
                        const isHour = t%1===0;
                        const isHalf = Math.round((t%1)*60)===30;
                        return (
                          <div key={t} style={{position:"absolute", top:i*H15, left:0, right:0, height:H15, borderTop:i>0?"0.5px solid "+(isHour?"#D1CFC8":isHalf?"#E8E6DF":"#F2F1ED"):"none", pointerEvents:"none"}}/>
                        );
                      })}
                      {colSlots.map(function(s,si){
                        const col2 = s.color||TEAM_COLORS[s.team]||BL;
                        var blocks = [];
                        if(!s.wechsel_zeit){
                          var isFullP = hasHaelften&&!s.half;
                          if(isFullP && !isFirstHaelfte){ /* skip */ }
                          else {
                            var sr = (isFullP && isFirstHaelfte) ? -(numHaelften-1)*colW-1 : 1;
                            blocks.push({start:s.start, end:s.end, right:sr});
                          }
                        } else {
                          var p1platz = s.location;
                          var p2platz = s.end_ort||s.location;
                          var p1h = s.half;
                          var p2h = s.end_half;
                          var p1here = col.platz.name===p1platz && (!p1h ? true : p1h===col.half);
                          var p2here = col.platz.name===p2platz && (!p2h ? true : p2h===col.half);
                          if(p1here){
                            var isFullP1 = hasHaelften&&!p1h&&col.platz.name===p1platz;
                            var sr1 = (isFullP1 && isFirstHaelfte) ? -(numHaelften-1)*colW-1 : 1;
                            if(!isFullP1 || isFirstHaelfte){
                              blocks.push({start:s.start, end:s.wechsel_zeit, right:sr1});
                            }
                          }
                          if(p2here){
                            var isFullP2 = hasHaelften&&!p2h&&col.platz.name===p2platz;
                            var otherPlatz = col.platz.name===p2platz;
                            var p2Cols = otherPlatz ? (p2platz===p1platz ? numHaelften : (TRAININGSPLAETZE.find(function(pp){return pp.name===p2platz;})||{}).halfn?.length||1) : 1;
                            var sr2 = (isFullP2 && (isFirstHaelfte||!hasHaelften)) ? -(p2Cols-1)*colW-1 : 1;
                            if(!isFullP2 || isFirstHaelfte || !hasHaelften){
                              blocks.push({start:s.wechsel_zeit, end:s.end, right:sr2});
                            }
                          }
                        }
                        return blocks.map(function(b,bi){
                          var top = (b.start-displayStart)*H15*4;
                          var h = (b.end-b.start)*H15*4-2;
                          return (
                            <div key={si+"_"+bi} onClick={function(){onClickSlot(s);}} title={s.team+" "+fmtT15(b.start)+"-"+fmtT15(b.end)}
                              style={{
                                position:"absolute", top:top+1, left:2, right:b.right<1?b.right:2,
                                height:Math.max(h,14),
                                background:col2,
                                borderRadius:4,
                                borderLeft:"3px solid rgba(255,255,255,0.35)",
                                padding:"2px 4px",
                                overflow:"hidden", cursor:"pointer",
                                zIndex:b.right<1?2:1,
                                boxSizing:"border-box",
                                boxShadow:"0 1px 3px rgba(0,0,0,0.18)"
                              }}>
                              <div style={{color:"#fff", fontWeight:700, fontSize:9, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:0.2}}>{s.team}</div>
                              {h>28 && <div style={{color:"rgba(255,255,255,0.82)", fontSize:8, letterSpacing:0.1}}>{fmtT15(b.start)}-{fmtT15(b.end)}</div>}
                            </div>
                          );
                        });
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}
function TrainingGantt({team: teamProp, role}){
  const START = 7, END = 22, H = 52;
  const isMobile = useIsMobile();
  const canEdit = role==="administrator"||role==="administration";

  const [plaene, setPlaene] = useState(INITIAL_PLAENE);
  const [aktiverPlan, setAktiverPlan] = useState("plan_1");
  const [vorschauPlan, setVorschauPlan] = useState(null); // null = aktiver Plan, sonst Plan-ID
  const [teamFilter, setTeamFilter] = useState(teamProp||"alle");
  const [kwOffset, setKwOffset] = useState(0);
  const [ausnahmen, setAusnahmen] = useState({});
  const [ganttMode, setGanttMode] = useState("tag");
  const [editSlot, setEditSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showAusnahmeModal, setShowAusnahmeModal] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSlot, setDeleteSlot] = useState(null);
  const [trainerNachrichten, setTrainerNachrichten] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [newSlotPrefill, setNewSlotPrefill] = useState(null);
  const [showPlanVerwaltung, setShowPlanVerwaltung] = useState(false);
  const [trainingsTab, setTrainungsTab] = useState("gantt");
  const [ansicht, setAnsicht] = useState("woche"); // "woche" | "tag"
  const [selectedDay, setSelectedDay] = useState(0); // 0=Mo..6=So

  useEffect(function(){
    (async function(){
      try{
        // Supabase laden
        if(supabase){
          // Pläne laden
          const {data: plaeneData} = await supabase.from("trainingsplan_vorlagen").select("*").order("valid_from");
          if(plaeneData && plaeneData.length > 0){
            // Slots pro Plan laden
            const {data: slotsData} = await supabase.from("trainingsplan_slots").select("*");
            const slots = slotsData || [];
            const plaeneMitSlots = plaeneData.map(function(p){
              return {
                ...p,
                slots: slots.filter(function(s){ return s.template_id === p.id; }).map(function(s){
                  return {
                    id: s.id,
                    weekday: s.weekday,
                    team: s.team,
                    start: s.start_zeit,
                    end: s.end_zeit,
                    ort: s.location,
                    end_ort: s.end_ort||"",
                    half: s.half||"",
                    end_half: s.end_half||"",
                    wechsel_zeit: s.wechsel_zeit||"",
                    color: s.color||"",
                  };
                }),
              };
            });
            setPlaene(plaeneMitSlots);
            // Aktiven Plan setzen
            const aktiver = plaeneMitSlots.find(function(p){ return p.active; });
            if(aktiver) setAktiverPlan(aktiver.id);
          } else {
            // Fallback: localStorage
            const r = await window.storage.get("trainingsPlaene");
            if(r) setPlaene(JSON.parse(r.value));
          }
          // Ausnahmen laden
          const {data: ausnahmenData} = await supabase.from("trainingsplan_ausnahmen").select("*");
          if(ausnahmenData){
            const ausnahmenMap = {};
            ausnahmenData.forEach(function(a){
              const key = a.week_nr_key;
              if(!ausnahmenMap[key]) ausnahmenMap[key] = [];
              ausnahmenMap[key].push({
                id: a.id,
                slot_id: a.slot_id,
                type: a.type,
                datum: a.date,
                kw_key: a.week_nr_key,
                neue_start_zeit: a.neue_start_zeit,
                neue_end_zeit: a.neue_end_zeit,
                neues_ort: a.neues_ort,
                neue_half: a.neue_half,
                grund: a.grund||"",
              });
            });
            setAusnahmen(ausnahmenMap);
          }
        } else {
          // Kein Supabase — localStorage
          const r = await window.storage.get("trainingsPlaene");
          if(r) setPlaene(JSON.parse(r.value));
          const a = await window.storage.get("trainingsAusnahmen");
          if(a) setAusnahmen(JSON.parse(a.value));
        }
        const tn = await window.storage.get("trainer_benachrichtigungen");
        if(tn){ const alle=JSON.parse(tn.value); setTrainerNachrichten(alle.filter(function(n){return !n.gelesen;})); }
      }catch(e){ console.warn("[FCH] Trainingsplan laden Fehler:", e.message); }
    })();
  },[]);

  async function savePlaene(p){
    setPlaene(p);
    if(supabase){
      try{
        for(const plan of p){
          await supabase.from("trainingsplan_vorlagen").upsert({
            id: plan.id,
            name: plan.name,
            valid_from: plan.valid_from,
            valid_until: plan.valid_until,
            active: plan.active,
          });
          if(plan.slots){
            for(const s of plan.slots){
              await supabase.from("trainingsplan_slots").upsert({
                id: s.id,
                template_id: plan.id,
                weekday: s.weekday,
                team: s.team,
                start_zeit: s.start,
                end_zeit: s.end,
                ort: s.location,
                end_ort: s.end_ort||null,
                half: s.half||null,
                end_half: s.end_half||null,
                wechsel_zeit: s.wechsel_zeit||null,
                farbe: s.color||null,
              });
            }
          }
        }
      }catch(e){ console.warn("[FCH] savePlaene Fehler:", e.message); }
    } else {
      window.storage.set("trainingsPlaene", JSON.stringify(p));
    }
  }

  async function saveAusnahmen(a){
    setAusnahmen(a);
    if(supabase){
      try{
        // Alle Ausnahmen als flache Liste
        const alle = Object.values(a).flat();
        for(const ausnahme of alle){
          await supabase.from("trainingsplan_ausnahmen").upsert({
            id: ausnahme.id,
            slot_id: ausnahme.slot_id||null,
            type: ausnahme.type,
            datum: ausnahme.date||null,
            kw_key: ausnahme.week_nr_key,
            neue_start_zeit: ausnahme.neue_start_zeit||null,
            neue_end_zeit: ausnahme.neue_end_zeit||null,
            neues_ort: ausnahme.neues_ort||null,
            neue_half: ausnahme.neue_half||null,
            grund: ausnahme.grund||null,
          });
        }
      }catch(e){ console.warn("[FCH] saveAusnahmen Fehler:", e.message); }
    } else {
      window.storage.set("trainingsAusnahmen", JSON.stringify(a));
    }
  }

  const today = new Date(2026,4,24);
  function getMonday(d){ const day=d.getDay(); const diff=d.getDate()-day+(day===0?-6:1); return new Date(new Date(d).setDate(diff)); }
  const monday = new Date(getMonday(new Date(today)));
  monday.setDate(monday.getDate() + kwOffset*7);
  const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
  const dayDates = DAYS.map(function(_,i){ const d=new Date(monday); d.setDate(d.getDate()+i); return d; });
  function getKW(d){ const jan4=new Date(d.getFullYear(),0,4); const diff=d-jan4; return Math.ceil((diff/86400000+jan4.getDay()+1)/7); }
  const kw = getKW(monday);
  function fmtDate(d){ return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0"); }
  function fmtTime(v){ return String(Math.floor(v)).padStart(2,"0")+":"+(v%1===0?"00":"30"); }

  const angezeigterPlanId = vorschauPlan || aktiverPlan;
  const plan = plaene.find(function(p){return p.id===angezeigterPlanId;})||plaene[0];
  const isVorschau = vorschauPlan && vorschauPlan!==aktiverPlan;
  const kwKey = monday.getFullYear()+"_"+kw;
  const kwAusnahmen = ausnahmen[kwKey]||[];

  const FCH_TEAMS = [
    "1. Mannschaft","2. Mannschaft","3. Mannschaft","4. Mannschaft",
    "Ältere Junioren A","Ältere Junioren B",
    "Cc-Junioren","Dc-Junioren","Ec-Junioren","Fc-Junioren",
    "Gc-Junioren","Hc-Junioren","Ic-Junioren",
    "Frauen","Mädchen",
  ];
  const alleTeams = Array.from(new Set([
    ...FCH_TEAMS,
    ...(plan?.slots||[]).map(function(s){return s.team;})
  ])).sort();
  const TEAM_COLORS = {};
  (plan?.slots||[]).forEach(function(s){ TEAM_COLORS[s.team]=s.color; });

  // Prüfe ob die aktuelle Woche innerhalb der Plan-Gültigkeit liegt
  const wocheStart = monday;
  const wocheEnd = new Date(monday); wocheEnd.setDate(wocheEnd.getDate()+6);
  const planGueltigAb  = plan?.valid_from  ? new Date(plan.valid_from)  : null;
  const planGueltigBis = plan?.valid_until ? new Date(plan.valid_until) : null;
  // Plan gilt diese Woche wenn: wocheEnd >= valid_from UND (kein valid_until ODER wocheStart <= valid_until)
  const planGueltigDieseWoche =
    (!planGueltigAb  || wocheEnd   >= planGueltigAb) &&
    (!planGueltigBis || wocheStart <= planGueltigBis);

  const wochenSlots = DAYS.map(function(day){
    if(!planGueltigDieseWoche) return [];
    const basis = (plan?.slots||[])
      .filter(function(s){ return s.weekday===day; })
      .filter(function(s){
        // Gilt dieser Slot ab dieser KW?
        if(!s.valid_from_week) return true;
        const [cy,ck] = kwKey.split("_").map(Number);
        const [gy,gk] = s.valid_from_week.split("_").map(Number);
        return cy>gy || (cy===gy && ck>=gk);
      })
      .filter(function(s){ return !kwAusnahmen.some(function(a){ return a.type==="absage"&&a.slot_id===s.id; }); })
      .map(function(s){
        const va = kwAusnahmen.find(function(a){ return a.type==="verschiebung"&&a.slot_id===s.id; });
        const oa = kwAusnahmen.find(function(a){ return a.type==="location"&&a.slot_id===s.id; });
        if(va) return Object.assign({},s,{start:va.neue_start,end:va.neue_end,isVerschoben:true});
        if(oa) return Object.assign({},s,{ort:oa.neuer_ort,isOrtGeaendert:true});
        return s;
      });
    const zusatz = kwAusnahmen
      .filter(function(a){ return a.type==="zusatz"&&a.weekday===day; })
      .map(function(a){ return Object.assign({},a,{isZusatz:true}); });
    return basis.concat(zusatz);
  });

  const DEFAULT_START = 14.5; // 14:30 Uhr
  const DEFAULT_END   = 22;   // 22:00 Uhr
  const allStarts = wochenSlots.reduce(function(acc,ss){ return acc.concat(ss.map(function(s){return s.start;})); },[]);
  const allEnds   = wochenSlots.reduce(function(acc,ss){ return acc.concat(ss.map(function(s){return s.end;})); },[]);
  const minStart  = allStarts.length ? Math.min.apply(null,allStarts) : DEFAULT_START;
  const maxEnd    = allEnds.length   ? Math.max.apply(null,allEnds)   : DEFAULT_END;
  // Nur früher als Standard wenn ein Slot wirklich früher startet
  const displayStart = minStart < DEFAULT_START ? Math.max(7, Math.floor(minStart)) : DEFAULT_START;
  // Mindestens bis DEFAULT_END, sonst bis zum Ende des letzten Slots (aufgerundet)
  const displayEnd = Math.max(DEFAULT_END, Math.ceil(maxEnd));
  const trainerAbsagen = kwAusnahmen.filter(function(a){ return a.type==="absage"&&a.von_termin; });

  function handleSlotSave(slot){
    const cleanSlot = Object.assign({},slot);
    delete cleanSlot.nurDieseWoche;

    if(slot.nurDieseWoche){
      if(editSlot&&editSlot.id){
        // Edit existing: save as Ausnahme for this week
        const ausnahme = {
          type: "verschiebung",
          slot_id: editSlot.id,
          weekday: slot.weekday||editSlot.weekday,
          team: slot.team||editSlot.team,
          neue_start: slot.start,
          neue_end: slot.end,
          neuer_ort: slot.location,
          von_termin: false,
        };
        const next = Object.assign({},ausnahmen);
        next[kwKey] = (ausnahmen[kwKey]||[])
          .filter(function(a){ return !(a.slot_id===editSlot.id&&a.type==="verschiebung"); })
          .concat([ausnahme]);
        saveAusnahmen(next);
      } else {
        // New slot: save as zusatz Ausnahme for selected week only
        const targetKwKey = slot.selectedKwKey||kwKey;
        const zusatz = Object.assign({},cleanSlot,{
          type: "zusatz",
          weekday: cleanSlot.weekday,
          isZusatz: true,
          id: "zusatz_"+Date.now(),
        });
        const next = Object.assign({},ausnahmen);
        next[targetKwKey] = (ausnahmen[targetKwKey]||[]).concat([zusatz]);
        saveAusnahmen(next);
      }
    } else {
      // Save permanently — ab der gewählten KW (valid_from)
      delete cleanSlot.selectedKwKey;
      const gueltigAb = slot.selectedKwKey || null; // kwKey format: "2026_21"
      const updated = plaene.map(function(p){
        if(p.id!==angezeigterPlanId) return p;
        return Object.assign({},p,{slots: editSlot&&editSlot.id
          ? p.slots.map(function(s){ return s.id===editSlot.id?Object.assign({},s,cleanSlot):s; })
          : p.slots.concat([Object.assign({},cleanSlot,{id:"slot_"+Date.now(), valid_from_week:gueltigAb})])
        });
      });
      savePlaene(updated);
    }
    setShowSlotModal(false);
    setEditSlot(null);
  }

  function handleSlotDeleteInit(slotId){
    const slot = (plan?.slots||[]).find(function(s){ return s.id===slotId; });
    if(!slot) return;
    const td = new Date(2026,4,24);
    const zukunftigeEvents = ATT_EVENTS.filter(function(e){
      if(e.type!=="Training"||e.team!==slot.team) return false;
      const parts = e.date.split(" ");
      const dm = parts.length>1?parts[1]:parts[0];
      const dparts = dm.split(".");
      const evDate = new Date((parseInt(dparts[2])||2026),parseInt(dparts[1])-1,parseInt(dparts[0]));
      return evDate>=td;
    });
    setDeleteSlot(Object.assign({},slot,{zukunftigeEvents:zukunftigeEvents, selectedEvIds:new Set()}));
    setShowDeleteDialog(true);
    setShowSlotModal(false);
  }

  async function handleSlotDeleteConfirm(slot, selectedEvIds){
    const updated = plaene.map(function(p){
      if(p.id!==angezeigterPlanId) return p;
      return Object.assign({},p,{slots:p.slots.filter(function(s){ return s.id!==slot.id; })});
    });
    savePlaene(updated);
    // Slot aus Supabase löschen
    if(supabase && slot.id){
      try{
        await supabase.from("trainingsplan_slots").delete().eq("id", slot.id);
      }catch(e){ console.warn("[FCH] Slot löschen Fehler:", e.message); }
    }
    if(selectedEvIds.size>0){
      try{
        const cr = await window.storage.get("cancelled_events");
        const cancelled = cr?JSON.parse(cr.value):{};
        selectedEvIds.forEach(function(id){ cancelled[id]=true; });
        await window.storage.set("cancelled_events",JSON.stringify(cancelled));
      }catch(e){}
    }
    setShowDeleteDialog(false);
    setDeleteSlot(null);
    setEditSlot(null);
  }

  function handleAusnahmeSave(ausnahme, fuerAlleWochen){
    if(fuerAlleWochen){
      if(ausnahme.type==="absage"){ handleSlotDeleteInit(ausnahme.slot_id); }
      else if(ausnahme.type==="verschiebung"){
        const updated = plaene.map(function(p){
          if(p.id!==angezeigterPlanId) return p;
          return Object.assign({},p,{slots:p.slots.map(function(s){ return s.id===ausnahme.slot_id?Object.assign({},s,{start:ausnahme.neue_start,end:ausnahme.neue_end}):s; })});
        });
        savePlaene(updated);
      } else if(ausnahme.type==="location"){
        const updated = plaene.map(function(p){
          if(p.id!==angezeigterPlanId) return p;
          return Object.assign({},p,{slots:p.slots.map(function(s){ return s.id===ausnahme.slot_id?Object.assign({},s,{ort:ausnahme.neuer_ort}):s; })});
        });
        savePlaene(updated);
      }
    } else {
      const next = Object.assign({},ausnahmen);
      next[kwKey] = (ausnahmen[kwKey]||[]).filter(function(a){ return !(a.slot_id===ausnahme.slot_id&&a.type===ausnahme.type); }).concat([ausnahme]);
      saveAusnahmen(next);
    }
    setShowAusnahmeModal(false);
  }

  function handleAusnahmeRemove(ausnahme){
    const next = Object.assign({},ausnahmen);
    next[kwKey] = (ausnahmen[kwKey]||[]).filter(function(a){ return a!==ausnahme; });
    saveAusnahmen(next);
  }

  function handlePlanSave(planData){
    if(editPlan&&editPlan.id){
      savePlaene(plaene.map(function(p){ return p.id===editPlan.id?Object.assign({},p,planData):p; }));
    } else {
      const newPlan = Object.assign({},planData,{id:"plan_"+Date.now(),slots:[]});
      savePlaene(plaene.concat([newPlan]));
      setAktiverPlan(newPlan.id);
    }
    setShowPlanEditor(false);
    setEditPlan(null);
  }

  function handlePlanDuplizieren(plan){
    const copy = Object.assign({},plan,{
      id:"plan_"+Date.now(),
      name:plan.name+" (Kopie)",
      active:false,
      slots:(plan.slots||[]).map(function(s){ return Object.assign({},s,{id:"slot_"+Date.now()+Math.random()}); }),
    });
    savePlaene(plaene.concat([copy]));
  }

  function handlePlanAktivieren(id){
    savePlaene(plaene.map(function(p){ return Object.assign({},p,{active:p.id===id}); }));
    setAktiverPlan(id);
  }

  function handlePlanLoeschen(id){
    if(plaene.length<=1){ alert("Mindestens ein Plan muss vorhanden sein."); return; }
    const next = plaene.filter(function(p){ return p.id!==id; });
    savePlaene(next);
    if(aktiverPlan===id) setAktiverPlan(next[0].id);
  }

  function handleDragStart(e, s){
    if(!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({slotId:s.id, duration:s.end-s.start, offsetY:e.clientY-rect.top});
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("slotId", s.id);
  }

  function handleDrop(e, day){
    e.preventDefault();
    if(!dragState) return;
    const slotId = e.dataTransfer.getData("slotId");
    const s = (plan?.slots||[]).find(function(x){ return x.id===slotId; });
    if(!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top - dragState.offsetY;
    const rawTime = displayStart + relY / H;
    const newStart = Math.max(displayStart, Math.min(displayEnd-dragState.duration, Math.round(rawTime*4)/4));
    const newEnd = newStart + dragState.duration;
    const updated = plaene.map(function(p){
      if(p.id!==angezeigterPlanId) return p;
      return Object.assign({},p,{slots:p.slots.map(function(x){ return x.id===slotId?Object.assign({},x,{weekday:day,start:newStart,end:newEnd}):x; })});
    });
    savePlaene(updated);
    setDragState(null);
  }

  function Btn2({children, onClick, active, small, danger}){
    return (
      <button onClick={onClick} style={{padding:small?"4px 10px":"6px 14px", borderRadius:20, border:"1px solid "+(danger?R:active?BK:GB), background:danger?RL:active?BK:"#fff", color:danger?R:active?"#fff":"#555", fontSize:12, fontWeight:active?600:400, cursor:"pointer", whiteSpace:"nowrap"}}>{children}</button>
    );
  }

  return (
    <div>
      {/* Plan-Verwaltung Overlay */}
      {showPlanVerwaltung&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:3000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:60,paddingBottom:20,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:16,padding:"0 0 16px",maxWidth:540,width:"100%",margin:"0 16px",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid "+GB}}>
              <div style={{fontWeight:700,fontSize:16}}>Trainingsplan-Versionen</div>
              <button onClick={function(){setShowPlanVerwaltung(false);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888",lineHeight:1}}>x</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:12,color:"#888",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere einen Plan als Vorlage fur eine neue Version.</div>
              {plaene.map(function(p){
                const isAktiv = p.id===aktiverPlan;
                const slotCount = (p.slots||[]).length;
                return(
                  <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"12px 14px",background:isAktiv?"#EFF6FF":"#fff"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <div style={{fontWeight:700,fontSize:14,color:isAktiv?BL:BK}}>{p.name}</div>
                          {isAktiv&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                          {p.active&&!isAktiv&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"#ECFDF5",color:GN,fontWeight:600}}>Aktiviert</span>}
                        </div>
                        <div style={{fontSize:11,color:"#888"}}>
                          {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                          {" bis "}
                          {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                          {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        {!isAktiv&&(
                          <button onClick={function(){handlePlanAktivieren(p.id);}}
                            style={{padding:"5px 10px",borderRadius:8,border:"1.5px solid "+BL,background:"#EFF6FF",color:BL,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                            Aktivieren
                          </button>
                        )}
                        <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);setShowPlanVerwaltung(false);}} title="Bearbeiten"
                          style={{width:28,height:28,borderRadius:7,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-edit"/></button>
                        <button onClick={function(){handlePlanDuplizieren(p);}} title="Duplizieren"
                          style={{width:28,height:28,borderRadius:7,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                        {plaene.length>1&&!isAktiv&&(
                          <button onClick={function(){if(window.confirm("Plan \""+p.name+"\" loeschen?")){handlePlanLoeschen(p.id);}}} title="Loeschen"
                            style={{width:28,height:28,borderRadius:7,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-trash"/></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={function(){setEditPlan(null);setShowPlanEditor(true);setShowPlanVerwaltung(false);}}
                style={{padding:"10px",borderRadius:10,border:"1.5px dashed "+GB,background:"transparent",color:"#888",fontSize:13,cursor:"pointer",textAlign:"center",marginTop:4}}>
                + Neuen Plan erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Tab-Navigation === */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",background:GR,borderRadius:10,padding:3,gap:2}}>
          {[{v:"gantt",l:"GANTT"},{v:"plaetze",l:"Plätze",adminOnly:true},{v:"plaene",l:"Pläne",adminOnly:true}].map(function(t){
            if(t.adminOnly&&!canEdit) return null;
            var isActive = trainingsTab===t.v;
            return(
              <button key={t.v} onClick={function(){setTrainungsTab(t.v);}}
                style={{padding:"6px 14px",borderRadius:8,border:"none",background:isActive?"#fff":"transparent",color:isActive?BK:"#888",fontWeight:isActive?700:400,fontSize:13,cursor:"pointer",boxShadow:isActive?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
                {t.l}
              </button>
            );
          })}
        </div>
        {trainingsTab==="gantt"&&canEdit&&(
          <Btn2 small onClick={function(){setEditSlot(null);setShowSlotModal(true);}}>+ Training</Btn2>
        )}
        {trainingsTab==="plaene"&&canEdit&&(
          <Btn2 small onClick={function(){setEditPlan(null);setShowPlanEditor(true);}}>+ Neuer Plan</Btn2>
        )}
      </div>

      {/* === Tab: Plane === */}
      {trainingsTab==="plaene"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:12,color:"#888",marginBottom:4}}>Aktiviere einen Plan um ihn im GANTT anzuzeigen. Dupliziere ihn als Vorlage fur eine neue Version.</div>
          {plaene.map(function(p){
            const isAktiv = p.id===aktiverPlan;
            const slotCount = (p.slots||[]).length;
            return(
              <div key={p.id} style={{border:"1.5px solid "+(isAktiv?BL:GB),borderRadius:12,padding:"14px 16px",background:isAktiv?"#EFF6FF":"#fff"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{fontWeight:700,fontSize:15,color:isAktiv?BL:BK}}>{p.name}</div>
                      {isAktiv&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:BL,color:"#fff",fontWeight:600}}>Aktiv</span>}
                    </div>
                    <div style={{fontSize:12,color:"#888"}}>
                      {p.valid_from?p.valid_from.split("-").reverse().join("."):"–"}
                      {" bis "}
                      {p.valid_until?p.valid_until.split("-").reverse().join("."):"unbegrenzt"}
                      {" · "+slotCount+" Training"+(slotCount===1?"":"s")}
                    </div>
                  </div>
                  {canEdit&&(
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {!isAktiv&&<button onClick={function(){handlePlanAktivieren(p.id);}} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+BL,background:"#EFF6FF",color:BL,fontSize:12,fontWeight:600,cursor:"pointer"}}>Aktivieren</button>}
                      <button onClick={function(){setEditPlan(p);setShowPlanEditor(true);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-edit"/></button>
                      <button onClick={function(){handlePlanDuplizieren(p);}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>≡</button>
                      {plaene.length>1&&!isAktiv&&<button onClick={function(){if(window.confirm("Plan loeschen?")){handlePlanLoeschen(p.id);}}} style={{width:30,height:30,borderRadius:8,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-trash"/></button>}
                    </div>
                  )}
                </div>
                {isAktiv&&<button onClick={function(){setTrainungsTab("gantt");}} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid "+BL+"40",background:"transparent",color:BL,fontSize:12,cursor:"pointer"}}>Zum GANTT →</button>}
                {!isAktiv&&canEdit&&(
                  <button onClick={function(){setVorschauPlan(p.id);setTrainungsTab("gantt");}}
                    style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1px solid #FDE68A",background:"#FFFBEB",color:"#92400E",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    Vorschau im GANTT →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === Tab: Platze === */}
      {trainingsTab==="plaetze"&&<PlaetzeView/>}

      {/* === Tab: GANTT === */}
      {trainingsTab==="gantt"&&(
      <div>

      {/* Ausserhalb Gültigkeitsspanne */}
      {!planGueltigDieseWoche&&(
        <div style={{padding:"10px 14px",background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:10,marginBottom:12,fontSize:12,color:"#6B7280",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>&#128197;</span>
          <span>
            Diese Woche liegt ausserhalb der Gültigkeitsspanne des Plans
            {planGueltigAb&&<strong style={{color:"#374151"}}> ({plan.valid_from&&plan.valid_from.split("-").reverse().join(".")} – {plan.valid_until?plan.valid_until.split("-").reverse().join("."):"unbegrenzt"})</strong>}.
            Keine Trainings angezeigt.
          </span>
        </div>
      )}
      {isVorschau&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 14px",background:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:10,marginBottom:12}}>
          <div>
            <span style={{fontSize:12,fontWeight:700,color:"#92400E"}}>Vorschau: </span>
            <span style={{fontSize:12,color:"#92400E"}}>{plan.name}</span>
            <span style={{fontSize:11,color:"#B45309",marginLeft:8}}>Nicht der aktive Plan</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={function(){handlePlanAktivieren(vorschauPlan);setVorschauPlan(null);}}
              style={{padding:"5px 12px",borderRadius:8,border:"1.5px solid "+BL,background:"#EFF6FF",color:BL,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Jetzt aktivieren
            </button>
            <button onClick={function(){setVorschauPlan(null);}}
              style={{padding:"5px 10px",borderRadius:8,border:"0.5px solid #FDE68A",background:"#fff",color:"#92400E",fontSize:12,cursor:"pointer"}}>
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:isVorschau?"#92400E":BK}}>
              {isVorschau&&<span style={{fontSize:11,background:"#FDE68A",color:"#92400E",padding:"2px 7px",borderRadius:20,marginRight:7,fontWeight:600}}>Vorschau</span>}
              {plan?plan.name:"Trainingsplan"}
            </div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>
              {plan&&plan.valid_from?"Gueltig: "+fmtDate(new Date(plan.valid_from))+" - "+(plan.valid_until?fmtDate(new Date(plan.valid_until)):"unbegrenzt"):""}
            </div>
          </div>
          {canEdit && (
            <Btn2 small onClick={function(){setEditSlot(null);setShowSlotModal(true);}}>+ Training</Btn2>
          )}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===0?6:d-1;}); }
              else { setKwOffset(function(o){return o-1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"#fff",cursor:"pointer",fontSize:14}}>&#8249;</button>
            <div style={{textAlign:"center",minWidth:130}}>
              {ansicht==="woche" ? (
                <>
                  <div style={{fontSize:12,fontWeight:700,color:BK}}>KW {kw}</div>
                  <div style={{fontSize:10,color:"#888"}}>{fmtDate(dayDates[0])} - {fmtDate(dayDates[6])}.{dayDates[6].getFullYear()}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:12,fontWeight:700,color:BK}}>{DAYS[selectedDay]}, {fmtDate(dayDates[selectedDay])}.{dayDates[selectedDay].getFullYear()}</div>
                  <div style={{fontSize:10,color:"#888"}}>KW {kw}</div>
                </>
              )}
            </div>
            <button onClick={function(){
              if(ansicht==="tag"){ setSelectedDay(function(d){return d===6?0:d+1;}); }
              else { setKwOffset(function(o){return o+1;}); }
            }} style={{width:28,height:28,borderRadius:"50%",border:"1px solid "+GB,background:"#fff",cursor:"pointer",fontSize:14}}>&#8250;</button>
            {kwOffset!==0 && <button onClick={function(){setKwOffset(0);setSelectedDay(0);}} style={{padding:"4px 12px",borderRadius:20,border:"1px solid "+GB,background:"#fff",color:"#555",fontSize:11,cursor:"pointer"}}>Heute</button>}
          </div>
          {ansicht==="tag" && (
            <div style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {DAYS.map(function(d,i){
                const isToday = dayDates[i].toDateString()===today.toDateString();
                const isSelected = selectedDay===i;
                return(
                  <button key={i} onClick={function(){setSelectedDay(i);}}
                    style={{padding:"3px 10px",borderRadius:20,border:"1.5px solid "+(isSelected?BK:isToday?"#6366F1":GB),background:isSelected?BK:isToday?"#EEF2FF":"#fff",color:isSelected?"#fff":isToday?"#4F46E5":"#555",fontSize:11,fontWeight:isSelected?700:400,cursor:"pointer",flexShrink:0}}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          {kwAusnahmen.length>0 && (
            <span style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"#FFF7ED",color:"#D97706",border:"1px solid #FED7AA"}}>
              {kwAusnahmen.length} Ausnahme{kwAusnahmen.length>1?"n":""}
            </span>
          )}
          {/* Team-Filter Dropdown */}
          <select value={teamFilter} onChange={function(e){setTeamFilter(e.target.value);}}
            style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+GB,background:"#fff",fontSize:12,outline:"none",cursor:"pointer",maxWidth:180}}>
            <option value="alle">Alle Mannschaften</option>
            {alleTeams.map(function(t){
              return <option key={t} value={t}>{t}</option>;
            })}
          </select>
          <div style={{flex:1}}/>
          {/* Ansicht-Toggle */}
          <div style={{display:"flex",background:GR,borderRadius:20,padding:3,gap:2}}>
            {[{v:"woche",l:"Woche"},{v:"tag",l:"Tag"}].map(function(a){
              return(
                <button key={a.v} onClick={function(){setAnsicht(a.v);}}
                  style={{padding:"3px 12px",borderRadius:20,border:"none",background:ansicht===a.v?"#fff":"transparent",color:ansicht===a.v?BK:"#999",fontWeight:ansicht===a.v?600:400,fontSize:12,cursor:"pointer",boxShadow:ansicht===a.v?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                  {a.l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt Grid */}
      <div style={{background:"#fff",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden"}}>
          <PlatzGantt
            wochenSlots={ansicht==="tag" ? wochenSlots.map(function(ss,i){ return i===selectedDay?ss:[]; }) : wochenSlots}
            dayDates={dayDates}
            DAYS={ansicht==="tag" ? [DAYS[selectedDay]] : DAYS}
            dagIndexes={ansicht==="tag" ? [selectedDay] : DAYS.map(function(_,i){return i;})}
            today={today}
            displayStart={displayStart}
            displayEnd={displayEnd}
            teamFilter={teamFilter}
            TEAM_COLORS={TEAM_COLORS}
            canEdit={canEdit}
            onClickSlot={function(s){ if(canEdit){setEditSlot(s);setShowSlotModal(true);}}}
            onNewSlot={canEdit ? function(prefill){
              setEditSlot(null);
              setNewSlotPrefill(prefill);
              setShowSlotModal(true);
            } : undefined}
            GB={GB} GR={GR} BK={BK} BL={BL}
          />
      </div>

      {/* Legende */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
        {alleTeams.filter(function(t){return teamFilter==="alle"||t===teamFilter;}).map(function(t){
          return (
            <div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#666"}}>
              <div style={{width:10,height:10,borderRadius:3,background:TEAM_COLORS[t]||BL}}/>
              {t}
            </div>
          );
        })}
      </div>

      {/* Trainer-Benachrichtigungen */}
      {trainerNachrichten.filter(function(n){return n.type==="training_geloescht";}).length>0 && (
        <div style={{marginTop:12,border:"1px solid #2563EB40",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:"#EFF6FF",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <span style={{fontSize:12,fontWeight:700,color:BL}}>Training dauerhaft aus dem Plan entfernt</span>
            <button onClick={async function(){
              try{
                const nr = await window.storage.get("trainer_benachrichtigungen");
                if(nr){ const alle=JSON.parse(nr.value).map(function(n){return Object.assign({},n,{gelesen:true});}); await window.storage.set("trainer_benachrichtigungen",JSON.stringify(alle)); setTrainerNachrichten([]); }
              }catch(e){}
            }} style={{fontSize:10,padding:"3px 10px",borderRadius:20,border:"1px solid #2563EB40",background:"#fff",color:BL,cursor:"pointer"}}>Gelesen</button>
          </div>
        </div>
      )}

      {/* Trainer-Absagen Banner */}
      {trainerAbsagen.length>0 && (
        <div style={{marginTop:12,border:"1px solid "+R+"40",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:RL,padding:"10px 14px",borderBottom:"1px solid "+R+"20"}}>
            <span style={{fontSize:12,fontWeight:700,color:R}}>{trainerAbsagen.length} Training{trainerAbsagen.length>1?"s":""} diese Woche vom Trainer abgesagt</span>
          </div>
          {trainerAbsagen.map(function(a,i){
            const slot=(plan?plan.slots||[]:[]||[]).find(function(s){return s.id===a.slot_id;});
            return (
              <div key={i} style={{padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<trainerAbsagen.length-1?"0.5px solid "+GB:"none",background:"#fff"}}>
                <div>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{a.team}</span>
                  <span style={{fontSize:11,color:"#888",marginLeft:8}}>{a.weekday}{slot?" "+fmtTime(slot.start)+"-"+fmtTime(slot.end)+" Uhr":""}</span>
                </div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:RL,color:R,fontWeight:600}}>Abgesagt</span>
              </div>
            );
          })}
          <div style={{padding:"8px 14px",background:"#FFF5F5"}}>
            <span style={{fontSize:10,color:"#888"}}>Administration wurde automatisch benachrichtigt</span>
          </div>
        </div>
      )}

      {/* Losch-Dialog */}
      {showDeleteDialog&&deleteSlot && (
        <ModalOrSheet open onClose={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} maxWidth={480}>
          <div style={{padding:"0 0 8px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:"0.5px solid "+GB}}>
              <div style={{fontWeight:700,fontSize:15}}>Training loeschen</div>
              <button onClick={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888"}}>x</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"12px",background:RL,borderRadius:8,border:"1px solid "+R+"30"}}>
                <div style={{fontSize:13,fontWeight:700,color:R,marginBottom:2}}>Training wird dauerhaft aus dem Plan entfernt</div>
                <div style={{fontSize:11,color:"#666"}}>{deleteSlot.team} - {deleteSlot.weekday} {fmtTime(deleteSlot.start)}-{fmtTime(deleteSlot.end)} Uhr</div>
              </div>
              {deleteSlot.zukunftigeEvents.length>0 ? (
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Welche Termine absagen?</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set(s.zukunftigeEvents.map(function(e){return e.id;}))});});}} style={{fontSize:11,padding:"4px 10px",borderRadius:20,border:"1px solid "+GB,background:"#fff",cursor:"pointer"}}>Alle</button>
                    <button onClick={function(){setDeleteSlot(function(s){return Object.assign({},s,{selectedEvIds:new Set()});});}} style={{fontSize:11,padding:"4px 10px",borderRadius:20,border:"1px solid "+GB,background:"#fff",cursor:"pointer"}}>Keine</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
                    {deleteSlot.zukunftigeEvents.map(function(e){
                      const selected = deleteSlot.selectedEvIds.has(e.id);
                      return (
                        <div key={e.id} onClick={function(){setDeleteSlot(function(s){const next=new Set(s.selectedEvIds);selected?next.delete(e.id):next.add(e.id);return Object.assign({},s,{selectedEvIds:next});});}} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,border:"1px solid "+(selected?R:GB),background:selected?RL:"#fff",cursor:"pointer"}}>
                          <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(selected?R:"#ccc"),background:selected?R:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {selected && <span style={{color:"#fff",fontSize:10,fontWeight:700}}>v</span>}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:500,color:BK}}>{e.date}</div>
                            <div style={{fontSize:11,color:"#888"}}>{e.time} Uhr</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{padding:"12px",background:GR,borderRadius:8,fontSize:12,color:"#888"}}>Keine zukuenftigen Termine vorhanden.</div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){handleSlotDeleteConfirm(deleteSlot,deleteSlot.selectedEvIds);}} style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:R,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  Training loeschen{deleteSlot.selectedEvIds.size>0?" & "+deleteSlot.selectedEvIds.size+" Termin"+(deleteSlot.selectedEvIds.size>1?"e":"")+" absagen":""}
                </button>
                <button onClick={function(){setShowDeleteDialog(false);setDeleteSlot(null);}} style={{padding:"11px 16px",borderRadius:10,border:"1px solid "+GB,background:"#fff",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
              </div>
            </div>
          </div>
        </ModalOrSheet>
      )}

      {/* Slot-Modal */}
      {showSlotModal&&canEdit && (
        <SlotModal
          slot={editSlot}
          prefill={newSlotPrefill}
          plan={plan}
          teams={alleTeams}
          kwKey={kwKey}
          kw={kw}
          monday={monday}
          ausnahmen={kwAusnahmen}
          onSave={handleSlotSave}
          onDelete={editSlot?function(){handleSlotDeleteInit(editSlot.id);}:null}
          onAusnahme={function(a,forAll){handleAusnahmeSave(a,forAll);}}
          onClose={function(){setShowSlotModal(false);setEditSlot(null);setNewSlotPrefill(null);}}
        />
      )}

      {/* Plan-Editor */}
      {showPlanEditor&&canEdit && (
        <PlanEditorModal
          plan={editPlan}
          plaene={plaene}
          onSave={handlePlanSave}
          onClose={function(){setShowPlanEditor(false);setEditPlan(null);}}
        />
      )}
    </div>
    )}

    </div>
  );
}


/* -- Slot-Bearbeitungs-Modal -- */
function SlotModal({slot, prefill, plan, teams, kwKey, kw, monday, ausnahmen, onSave, onDelete, onAusnahme, onClose}){
  const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
  const TEAM_COLORS_MAP={};
  (plan?.slots||[]).forEach(s=>{TEAM_COLORS_MAP[s.team]=s.color;});
  const isEdit=!!slot?.id;
  const isZusatz=slot?.isZusatz;

  // Build list of next 20 KWs from current week
  const baseMonday = monday ? new Date(monday) : new Date(2026,4,18);
  function getKWLabel(offset){
    const d = new Date(baseMonday);
    d.setDate(d.getDate() + offset*7);
    function getKW(dt){ const j=new Date(dt.getFullYear(),0,4); return Math.ceil(((dt-j)/86400000+j.getDay()+1)/7); }
    const kwNum = getKW(d);
    const dd = String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0");
    const de = new Date(d); de.setDate(de.getDate()+6);
    const de2 = String(de.getDate()).padStart(2,"0")+"."+String(de.getMonth()+1).padStart(2,"0");
    return {offset, kwNum, label:"KW "+kwNum+" ("+dd+"–"+de2+")", key:d.getFullYear()+"_"+kwNum};
  }
  const kwOptions = Array.from({length:20},function(_,i){ return getKWLabel(i); });
  const [selectedKwOffset, setSelectedKwOffset] = useState(0);
  const selectedKw = kwOptions[selectedKwOffset];

  const [form, setForm] = useState({
    weekday: slot?.weekday||(prefill?.weekday)||"Mo",
    team: slot?.team||teams[0]||"",
    start: slot?.start||(prefill?.start)||17,
    end: slot?.end||(prefill?.end)||18.5,
    ort: slot?.location||(prefill?.location)||"",
    half: slot?.half||(prefill?.half)||"",
    wechsel_zeit: slot?.wechsel_zeit||"",
    end_ort: slot?.end_ort||"",
    end_half: slot?.end_half||"",
    color: slot?.color||TEAM_COLORS_MAP[slot?.team||""]||BL,
  });
  const [ausnahmeMode, setAusnahmeMode] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [ausnahmeTyp, setAusnahmeTyp] = useState("absage");
  const [fuerAlleWochen, setFuerAlleWochen] = useState(false);
  const [verschiebungStart, setVerschiebungStart] = useState(slot?.start||17);
  const [verschiebungEnd, setVerschiebungEnd] = useState(slot?.end||18.5);
  const [verschiebungOrt, setVerschiebungOrt] = useState(slot?.location||"");
  const [verschiebungGrund, setVerschiebungGrund] = useState("");

  const TIMES = Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5);
  const fmtT = v=>`${Math.floor(v).toString().padStart(2,"0")}:${v%1===0?"00":"30"}`;

  const COLORS = ["#C8102E","#2563EB","#059669","#7C3AED","#0891B2","#D97706","#64748B","#DB2777"];

  return(
    <ModalOrSheet open onClose={onClose} maxWidth={480}>
      <div style={{padding:"0 0 8px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:`0.5px solid ${GB}`}}>
          <div style={{fontWeight:700,fontSize:15}}>{isEdit?(isZusatz?"Zusatztraining":"Training bearbeiten"):"Training hinzufügen"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888",lineHeight:1}}>×</button>
        </div>

        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {!ausnahmeMode?(
            <>
              {/* Kalenderwoche - nur bei neuen Trainings */}
              {!isEdit&&(
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Kalenderwoche</div>
                  <select value={selectedKwOffset} onChange={e=>setSelectedKwOffset(parseInt(e.target.value))}
                    style={{width:"100%",padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none"}}>
                    {kwOptions.map(function(o){
                      return <option key={o.offset} value={o.offset}>{o.label}{o.offset===0?" (diese Woche)":""}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Wochentag */}
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Wochentag</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {DAYS.map(d=>(
                    <button key={d} onClick={()=>setForm(f=>({...f,weekday:d}))}
                      style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${form.weekday===d?BK:GB}`,background:form.weekday===d?BK:"#fff",color:form.weekday===d?"#fff":"#555",fontSize:12,cursor:"pointer"}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team */}
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Team</div>
                <select value={form.team} onChange={e=>setForm(f=>({...f,team:e.target.value,color:TEAM_COLORS_MAP[e.target.value]||f.color}))}
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                  {teams.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Zeit */}
              <div style={{display:"flex",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Von</div>
                  <select value={form.start} onChange={e=>setForm(f=>({...f,start:parseFloat(e.target.value)}))}
                    style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                    {TIMES.map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Bis</div>
                  <select value={form.end} onChange={e=>setForm(f=>({...f,end:parseFloat(e.target.value)}))}
                    style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                    {TIMES.filter(t=>t>form.start).map(t=><option key={t} value={t}>{fmtT(t)}</option>)}
                  </select>
                </div>
              </div>

              {/* Platzeinteilung */}

                  <div style={{background:"#F8F8F6",borderRadius:8,padding:"12px",display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:0.5}}>Platzeinteilung</div>

                    {/* Phase 1 */}
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",border:`0.5px solid ${GB}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:10}}>
                        Phase 1
                        <span style={{fontWeight:400,color:"#aaa",marginLeft:6}}>
                          {fmtT(form.start)} – {form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}
                        </span>
                      </div>

                      {/* Platz Phase 1 */}
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:10,color:"#999",marginBottom:4}}>Platz</div>
                        <select value={form.location} onChange={e=>setForm(f=>({...f,ort:e.target.value,half:""}))}
                          style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${form.location?GB:R+"80"}`,borderRadius:8,fontSize:12,outline:"none"}}>
                          <option value="" disabled>– Platz wählen –</option>
                          {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Seite Phase 1 */}
                      {form.location&&(TRAININGSPLAETZE.find(p=>p.name===form.location)?.halfn||[]).length>0&&(
                        <div>
                          <div style={{fontSize:10,color:"#999",marginBottom:4}}>Seite</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <button onClick={()=>setForm(f=>({...f,half:""}))}
                              style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${!form.half?BK:GB}`,background:!form.half?BK:"#fff",color:!form.half?"#fff":"#555",fontSize:11,cursor:"pointer"}}>
                              Ganzer Platz
                            </button>
                            {(TRAININGSPLAETZE.find(p=>p.name===form.location)?.halfn||[]).map(h=>(
                              <button key={h} onClick={()=>setForm(f=>({...f,half:h}))}
                                style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${form.half===h?BL:GB}`,background:form.half===h?BL:"#fff",color:form.half===h?"#fff":"#555",fontSize:11,cursor:"pointer"}}>
                                {h}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wechsel-Zeitpunkt */}
                    {form.location&&(
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontSize:11,color:"#888",flexShrink:0}}>Wechsel um:</div>
                        <select value={form.wechsel_zeit} onChange={e=>setForm(f=>({...f,wechsel_zeit:e.target.value?parseFloat(e.target.value):"",end_ort:"",end_half:""}))}
                          style={{flex:1,padding:"7px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:12,outline:"none"}}>
                          <option value="">– kein Wechsel –</option>
                          {Array.from({length:(form.end-form.start)*4},(_,i)=>form.start+i*0.25+0.25).filter(t=>t<form.end).map(t=>(
                            <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{Math.round((t%1)*60).toString().padStart(2,"0")} Uhr</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Phase 2 */}
                    {form.location&&form.wechsel_zeit&&(
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",border:`0.5px solid ${GB}`}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:10}}>
                          Phase 2
                          <span style={{fontWeight:400,color:"#aaa",marginLeft:6}}>
                            {fmtT(form.wechsel_zeit)} – {fmtT(form.end)}
                          </span>
                        </div>

                        {/* Platz Phase 2 */}
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:10,color:"#999",marginBottom:4}}>Platz</div>
                          <select value={form.end_ort} onChange={e=>setForm(f=>({...f,end_ort:e.target.value,end_half:""}))}
                            style={{width:"100%",padding:"7px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:12,outline:"none"}}>
                            <option value="">– gleich wie Phase 1 ({form.location}) –</option>
                            {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Seite Phase 2 */}
                        {(TRAININGSPLAETZE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).length>0&&(
                          <div>
                            <div style={{fontSize:10,color:"#999",marginBottom:4}}>Seite</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              <button onClick={()=>setForm(f=>({...f,end_half:""}))}
                                style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${!form.end_half?BK:GB}`,background:!form.end_half?BK:"#fff",color:!form.end_half?"#fff":"#555",fontSize:11,cursor:"pointer"}}>
                                Ganzer Platz
                              </button>
                              {(TRAININGSPLAETZE.find(p=>p.name===(form.end_ort||form.location))?.halfn||[]).map(h=>(
                                <button key={h} onClick={()=>setForm(f=>({...f,end_half:h}))}
                                  style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${form.end_half===h?BL:GB}`,background:form.end_half===h?BL:"#fff",color:form.end_half===h?"#fff":"#555",fontSize:11,cursor:"pointer"}}>
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Zusammenfassung */}
                    {form.location&&(
                      <div style={{fontSize:11,color:"#555",padding:"8px 10px",background:"#EEF2FF",borderRadius:6,lineHeight:1.7}}>
                        <div>
                          <strong>{fmtT(form.start)}–{form.wechsel_zeit?fmtT(form.wechsel_zeit):fmtT(form.end)}</strong>
                          {" "}{form.location}{form.half?" / "+form.half:" / Ganzer Platz"}
                        </div>
                        {form.wechsel_zeit&&(
                          <div>
                            <strong>{fmtT(form.wechsel_zeit)}–{fmtT(form.end)}</strong>
                            {" "}{form.end_ort||form.location}{form.end_half?" / "+form.end_half:" / Ganzer Platz"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

              {/* Farbe */}
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Farbe</div>
                <div style={{display:"flex",gap:8}}>
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #1A1A1A":"2px solid transparent",cursor:"pointer"}}/>
                  ))}
                </div>
              </div>

              {/* Aktionen */}
              {showSaveDialog ? (
                <div style={{background:"#F8F8F6",borderRadius:10,padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:BK,marginBottom:2}}>{isEdit?"Änderung übernehmen für:":"Training gilt:"}</div>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:true, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"10px",borderRadius:10,border:`1.5px solid ${BL}`,background:"#EFF6FF",color:BL,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Nur diese Woche</div>
                    <div style={{fontSize:11,fontWeight:400,color:"#555",marginTop:2}}>{isEdit?"Wird als Ausnahme gespeichert":"Einmaliger Zusatztermin"}</div>
                  </button>
                  <button onClick={()=>{ onSave(Object.assign({},form,{nurDieseWoche:false, selectedKwKey:selectedKw.key})); setShowSaveDialog(false); }}
                    style={{padding:"10px",borderRadius:10,border:`1.5px solid ${BK}`,background:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                    <div style={{fontWeight:700}}>Dauerhaft (neuer Standard)</div>
                    <div style={{fontSize:11,fontWeight:400,color:"rgba(255,255,255,0.7)",marginTop:2}}>
                      {isEdit?"Gilt fur alle zukunftigen Wochen":"Ab "+selectedKw.label+" bis Ende des Trainingsplans"}
                    </div>
                  </button>
                  <button onClick={()=>setShowSaveDialog(false)}
                    style={{padding:"8px",borderRadius:10,border:`1px solid ${GB}`,background:"#fff",color:"#888",fontSize:12,cursor:"pointer"}}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={()=>{ if(!form.location){alert("Bitte einen Platz auswählen.");return;} setShowSaveDialog(true); }}
                    style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:form.location?BK:"#ccc",color:"#fff",fontSize:13,fontWeight:600,cursor:form.location?"pointer":"not-allowed"}}>
                    {isEdit?"Speichern":"Hinzufügen"}
                  </button>
                </div>
              )}

              {isEdit&&!isZusatz&&(
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setAusnahmeMode(true)}
                    style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${GB}`,background:"#fff",color:"#555",fontSize:12,cursor:"pointer"}}>
                    <i className="ti-bolt"/> Ausnahme diese Woche
                  </button>
                  <button onClick={onDelete}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${R}`,background:RL,color:R,fontSize:12,cursor:"pointer"}}>
                    Löschen
                  </button>
                </div>
              )}
            </>
          ):(
            /* Ausnahme-Modus */
            <>
              <div style={{padding:"10px 12px",background:"#FFF7ED",borderRadius:8,border:"1px solid #FED7AA",fontSize:12,color:"#92400E"}}>
                <strong>{slot?.team} · {slot?.weekday}</strong> - Ausnahme für diese Woche (oder als neuer Standard).
              </div>

              {/* Typ-Auswahl */}
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Typ</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[{v:"absage",l:"Absagen",icon:"✕"},{v:"verschiebung",l:"Verschieben",icon:"⏰"},{v:"location",l:"Ort ändern",icon:"ti-map-pin"}].map(t=>(
                    <button key={t.v} onClick={()=>setAusnahmeTyp(t.v)}
                      style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${ausnahmeTyp===t.v?(t.v==="absage"?R:BL):GB}`,background:ausnahmeTyp===t.v?(t.v==="absage"?RL:"#EFF6FF"):"#fff",color:ausnahmeTyp===t.v?(t.v==="absage"?R:BL):"#555",fontSize:12,cursor:"pointer",minWidth:80}}>
                      {t.icon} {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verschiebung: neue Zeit */}
              {ausnahmeTyp==="verschiebung"&&(
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Neue Zeit von</div>
                    <select value={verschiebungStart} onChange={e=>setVerschiebungStart(parseFloat(e.target.value))}
                      style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                      {Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5).map(t=>(
                        <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{t%1===0?"00":"30"}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Bis</div>
                    <select value={verschiebungEnd} onChange={e=>setVerschiebungEnd(parseFloat(e.target.value))}
                      style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                      {Array.from({length:(22-7)*2+1},(_,i)=>7+i*0.5).filter(t=>t>verschiebungStart).map(t=>(
                        <option key={t} value={t}>{Math.floor(t).toString().padStart(2,"0")}:{t%1===0?"00":"30"}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Ort ändern */}
              {ausnahmeTyp==="location"&&(
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Neuer Platz</div>
                  <select value={verschiebungOrt} onChange={e=>setVerschiebungOrt(e.target.value)}
                    style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}>
                    <option value="" disabled>- Platz wählen (Pflichtfeld) -</option>
                    {TRAININGSPLAETZE.filter(p=>p.active).map(p=>(
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Begründung */}
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Begründung <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span></div>
                <input value={verschiebungGrund} onChange={e=>setVerschiebungGrund(e.target.value)}
                  placeholder="z.B. Platz für Spiel benötigt"
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>

              {/* Als Standard */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:GR,borderRadius:8}}>
                <input type="checkbox" id="fuerAlle" checked={fuerAlleWochen} onChange={e=>setFuerAlleWochen(e.target.checked)}
                  style={{width:16,height:16,cursor:"pointer"}}/>
                <label htmlFor="fuerAlle" style={{fontSize:12,cursor:"pointer"}}>
                  Als neuer Standard übernehmen (alle zukünftigen Wochen)
                </label>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onAusnahme({
                  type:ausnahmeTyp,
                  slot_id:slot.id,
                  weekday:slot.weekday,
                  team:slot.team,
                  ...(ausnahmeTyp==="verschiebung"?{neue_start:verschiebungStart,neue_end:verschiebungEnd}:{}),
                  ...(ausnahmeTyp==="location"?{neuer_ort:verschiebungOrt}:{}),
                  begruendung:verschiebungGrund,
                },fuerAlleWochen)}
                  style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:ausnahmeTyp==="absage"?R:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {ausnahmeTyp==="absage"?"Absagen":ausnahmeTyp==="verschiebung"?"Verschieben":"Ort ändern"}
                </button>
                <button onClick={()=>setAusnahmeMode(false)}
                  style={{padding:"11px 16px",borderRadius:10,border:`1px solid ${GB}`,background:"#fff",fontSize:13,cursor:"pointer"}}>
                  Zurück
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalOrSheet>
  );
}

/* -- Plan-Editor-Modal -- */
function PlanEditorModal({plan, plaene, onSave, onClose}){
  const [form, setForm] = useState({
    name: plan?.name||"Neuer Trainingsplan",
    valid_from: plan?.valid_from||new Date().toISOString().split("T")[0],
    valid_until: plan?.valid_until||"",
    active: plan?.active??true,
  });

  return(
    <ModalOrSheet open onClose={onClose} maxWidth={480}>
      <div style={{padding:"0 0 8px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 12px",borderBottom:`0.5px solid ${GB}`}}>
          <div style={{fontWeight:700,fontSize:15}}>{plan?.id?"Plan bearbeiten":"Neuer Plan"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888"}}>×</button>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Name</div>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Gültig ab</div>
              <input type="date" value={form.valid_from} onChange={e=>setForm(f=>({...f,valid_from:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Gültig bis</div>
              <input type="date" value={form.valid_until} onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",border:`1px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:GR,borderRadius:8}}>
            <input type="checkbox" id="planAktiv" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}
              style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="planAktiv" style={{fontSize:12,cursor:"pointer"}}>Plan aktiv (erscheint bei Teams als Termine)</label>
          </div>
          <button onClick={()=>onSave(form)}
            style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Speichern
          </button>
        </div>
      </div>
    </ModalOrSheet>
  );
}

/* -- Spiel-Detailansicht Modal (FVRZ-Stil) -- */
/* -- Spiel-Detailansicht Modal (FVRZ-Stil) -- */
function SpielDetail({spiel,onClose,canEdit,motmAll:motmAllProp,setMotmAll:setMotmAllProp}){
  const isMobile=useIsMobile();
  const played=!!spiel.result;
  const [activeTab,setActiveTab]=useState("info");

  /* motmVotes from parent - persists across modal open/close */
  const motmAll=motmAllProp||{};
  const setMotmAll=setMotmAllProp||(()=>{});
  const myVoterKey="current_user";
  const myVotes=new Set(Object.entries(motmAll[spiel?.id]||{}).filter(([k,v])=>k===myVoterKey).map(([k,v])=>v));
  const myVote=null; /* kept for compat */
  const voteCounts=(roster)=>{
    const gameVotes=motmAll[spiel?.id]||{};
    return roster.reduce((acc,p)=>{
      acc[p.id]=Object.values(gameVotes).filter(v=>v===p.id).length;
      return acc;
    },{});
  };
  const castVote=(pid)=>{
    setMotmAll(prev=>{
      const gameVotes={...(prev[spiel.id]||{})};
      /* Each voter gets a unique key per voted player */
      const voteKey=myVoterKey+"_"+pid;
      if(gameVotes[voteKey]) delete gameVotes[voteKey];
      else gameVotes[voteKey]=pid;
      return {...prev,[spiel.id]:gameVotes};
    });
  };
  const isVotedFor=(pid)=>{
    const gameVotes=motmAll[spiel?.id]||{};
    return !!gameVotes[myVoterKey+"_"+pid];
  };
  const [stats,setStats]=useState(()=>{
    const base=spiel.stats||{kader:[],tore:[],assists:[],karten:[],wechsel:[]};
    return base;
  });

  /* Load aufgebotState and auto-populate kader if empty */
  useEffect(()=>{
    if(stats.kader.length>0) return;
    (async()=>{
      try{
        const r=await window.storage.get("aufgebot_state");
        if(r){
          const aufgebotState=JSON.parse(r.value);
          const attEv=ATT_EVENTS.find(e=>e.date===spiel.date&&e.type==="Spiel"&&
            (e.opponent===spiel.opponent||e.team===spiel.team));
          if(attEv){
            const aufgebotIds=(aufgebotState[attEv.id]||[]).filter(id=>
              ROSTER.find(p=>p.id===id&&(p.teams||[]).includes(spiel.team||"")&&!p.role)
            );
            if(aufgebotIds.length>0) setStats(s=>({...s,kader:aufgebotIds}));
          }
        }
      }catch(e){}
    })();
  },[]);
  const [editMode,setEditMode]=useState(false);
  const [newTor,setNewTor]=useState({spieler:"",min:"",kaderName:""});
  const [newAssist,setNewAssist]=useState({spieler:"",min:""});
  const [newKarte,setNewKarte]=useState({spieler:"",min:"",type:"gelb"});
  const [newWechsel,setNewWechsel]=useState({raus:"",rein:"",min:""});

  const teamRosterNames=ROSTER.filter(p=>(p.teams||[]).includes(spiel.team||"")).map(p=>p.name);
  const spielerNamen=teamRosterNames.length>0?teamRosterNames:ROSTER.map(p=>p.name);
  const kaderNamen=stats.kader.map(id=>ROSTER.find(p=>p.id===id)?.name).filter(Boolean);

  const KARTEN_STYLE={
    "gelb":     {bg:"#FCD34D",color:"#78350F",label:"Gelb"},
    "gelb-rot": {bg:"#F97316",color:"#fff",  label:"Gelb-Rot"},
    "rot":      {bg:"#C8102E",color:"#fff",  label:"Rot"},
  };

  const ST=({children})=>(<div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.6,margin:"12px 0 6px"}}>{children}</div>);
  const IR=({label,value})=>(<div style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderBottom:`0.5px solid ${GB}`,gap:12}}><span style={{fontSize:12,color:"#888",flexShrink:0,minWidth:130}}>{label}</span><span style={{fontSize:13,fontWeight:500,textAlign:"right"}}>{value||"-"}</span></div>);
  const EZ=({icon,text,min,onDelete})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`0.5px solid ${GB}`}}>
      <span style={{fontSize:11,color:"#aaa",minWidth:28,fontWeight:600,flexShrink:0}}>{icon}</span>
      <span style={{flex:1,fontSize:12}}>{text}</span>
      {min&&<span style={{fontSize:11,color:"#aaa",flexShrink:0}}>{min}{"'"}</span>}
      {editMode&&onDelete&&<button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:"0 2px"}}>{"x"}</button>}
    </div>
  );
  const AR=({children,onAdd})=>(<div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap",alignItems:"center"}}>{children}<button onClick={onAdd} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,border:`0.5px solid ${GB}`,background:"#fff",color:BK,cursor:"pointer"}}>+ Add</button></div>);
  const SS=({value,onChange,options,placeholder,style={}})=>(<select value={value} onChange={e=>onChange(e.target.value)} style={{padding:"3px 6px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:11,outline:"none",...style}}><option value="">{placeholder||"-"}</option>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select>);
  const MI=({value,onChange})=>(<input type="number" min="1" max="90" placeholder="Min" value={value} onChange={e=>onChange(e.target.value)} style={{width:46,padding:"3px 6px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:11,outline:"none"}}/>);

  return(
    <div onClick={onClose} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"#fff",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:"#EFF6FF",borderRadius:"20px 20px 0 0",padding:"20px 22px 0",position:"sticky",top:0,zIndex:1}}>
          {/* Top row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{color:"rgba(0,0,0,0.45)",fontSize:10,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:4}}>{spiel.comp}</div>
              <div style={{color:"#1a1a1a",fontWeight:900,fontSize:18,lineHeight:1.15}}>FC Herrliberg</div>
              <div style={{color:"rgba(0,0,0,0.55)",fontSize:11,marginTop:1}}>vs. {spiel.opponent}</div>
            </div>
            {played?(
              <div style={{display:"none"}}/>
            ):(
              <div style={{display:"none"}}/>
            )}
            <button onClick={onClose} style={{background:"rgba(0,0,0,0.1)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"#F3F4F6",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
          </div>
          {/* Meta strip */}
          <div style={{display:"flex",gap:14,paddingBottom:14,fontSize:11,color:"rgba(0,0,0,0.55)"}}>
            <span><i className="ti-calendar" style={{marginRight:3}}/> {spiel.date}</span>
            <span><i className="ti-clock" style={{marginRight:3}}/> {spiel.time} Uhr</span>
            <span>{spiel.home?"Heim":"Auswärts"}</span>
            {spiel.att&&<span><i className="ti-users" style={{marginRight:3}}/> {spiel.att} Spieler</span>}
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginTop:-1}}>
            {[{key:"info",label:"Spielinfo"},{key:"stats",label:played?"Statistik":"Startaufstellung"},...(played?[{key:"motm",label:"Player of the Match"}]:[])].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{padding:"8px 14px",border:"none",borderRadius:"10px 10px 0 0",background:activeTab===t.key?"#fff":"transparent",color:activeTab===t.key?BK:"rgba(0,0,0,0.5)",fontWeight:activeTab===t.key?700:500,cursor:"pointer",fontSize:12,transition:"all 0.1s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"18px 22px"}}>
          {/* -- Spielinfo -- */}
          {activeTab==="info"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>

              {/* Ergebnis-Banner für gespielte Spiele */}
              {played&&(
                <div style={{background:"linear-gradient(135deg,#3B82F6 0%,#60A5FA 100%)",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>Endergebnis</div>
                    <div style={{fontSize:34,fontWeight:900,color:"#fff",letterSpacing:3,lineHeight:1}}>{spiel.result}</div>
                    {spiel.htResult&&<div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>Halbzeit: {spiel.htResult}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{spiel.home?"Heimspiel":"Auswärtsspiel"}</div>
                    {spiel.att&&<div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}><i className="ti-users" style={{marginRight:3}}/> {spiel.att} Spieler</div>}
                    <div style={{marginTop:8}}><span style={{background:spiel.result?.split(":")[0]>spiel.result?.split(":")[1]?"#16A34A":spiel.result?.split(":")[0]===spiel.result?.split(":")[1]?"#F3F4F6":"#DC2626",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{spiel.result?.split(":")[0]>spiel.result?.split(":")[1]?"Sieg":spiel.result?.split(":")[0]===spiel.result?.split(":")[1]?"Unentschieden":"Niederlage"}</span></div>
                  </div>
                </div>
              )}

              {/* Ort & Treffpunkt */}
              <div style={{display:"grid",gridTemplateColumns:spiel.treffpunkt?"1fr 1fr":"1fr",gap:10}}>
                <div style={{background:GR,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:20}}><i className="ti-map-pin"/></span>
                  <div>
                    <div style={{fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Spielort</div>
                    <div style={{fontWeight:700,fontSize:13,color:BK}}>{spiel.venue}</div>
                    <div style={{fontSize:11,color:"#888"}}>{spiel.venueAddr}</div>
                  </div>
                </div>
                {spiel.treffpunkt&&(
                  <div style={{background:"#EFF6FF",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,border:"0.5px solid #DBEAFE"}}>
                    <span style={{fontSize:20}}><i className="ti-target"/></span>
                    <div>
                      <div style={{fontSize:10,color:BL,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Treffpunkt</div>
                      <div style={{fontWeight:700,fontSize:13,color:BK}}>{spiel.treffpunkt}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spielinfos kompakt */}
              <div style={{background:GR,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>Wettbewerb</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{spiel.comp}</span>
                </div>
                <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>Spielnummer</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK,fontFamily:"monospace"}}>{spiel.spielNr}</span>
                </div>
                <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>Datum & Zeit</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{spiel.date} · {spiel.time} Uhr</span>
                </div>
                <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>Heim / Gast</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{spiel.home?"FC Herrliberg":"FC Herrliberg"} <span style={{color:"#aaa",fontWeight:400}}>vs.</span> {spiel.opponent}</span>
                </div>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>Status</span>
                  <span style={{background:"#ECFDF5",color:"#065F46",fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{spiel.status}</span>
                </div>
              </div>

              {/* Offizielle */}
              <div style={{background:GR,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}><i className="ti-scale"/> Schiedsrichter</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{spiel.schiedsrichter||"-"}</span>
                </div>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>≡ Delegierter</span>
                  <span style={{fontSize:12,fontWeight:600,color:BK}}>{spiel.delegierter||"-"}</span>
                </div>
              </div>

              {spiel.notes&&<div style={{background:"#FFFBEB",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400E",border:"0.5px solid #FDE68A",display:"flex",gap:8,alignItems:"flex-start"}}><span>⚠</span><span>{spiel.notes}</span></div>}
              <div style={{padding:"8px 12px",background:"#F0F9FF",borderRadius:8,fontSize:11,color:BL,display:"flex",gap:6,alignItems:"center"}}><span><i className="ti-refresh"/></span><span>Synchronisiert mit <strong>fvrz.ch</strong> · {spiel.spielNr}</span></div>
            </div>
          )}

          {/* -- Statistik -- */}
          {activeTab==="stats"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,color:"#aaa"}}>Manuell erfasst · nicht von FVRZ</div>
                {canEdit&&<button onClick={()=>setEditMode(v=>!v)} style={{padding:"4px 11px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",border:`0.5px solid ${editMode?GN:GB}`,background:editMode?"#F0FDF4":"#fff",color:editMode?GN:BL}}>{editMode?"Fertig ✓":"Bearbeiten"}</button>}
              </div>

              <ST>Kader ({stats.kader.length} Spieler · {stats.kader.length-(stats.ersatz||[]).length} Start · {(stats.ersatz||[]).filter(id=>stats.kader.includes(id)).length} Ersatz)</ST>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:4}}>
                {[...stats.kader]
                  .map(id=>ROSTER.find(r=>r.id===id))
                  .filter(Boolean)
                  .sort((a,b)=>{
                    const na=getNr(a.id)?parseInt(getNr(a.id)):null;
                    const nb=getNr(b.id)?parseInt(getNr(b.id)):null;
                    if(na!==null&&nb!==null) return na-nb;
                    if(na!==null) return -1;
                    if(nb!==null) return 1;
                    return a.lastName.localeCompare(b.lastName);
                  })
                  .map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,background:GR,borderRadius:7,padding:"5px 10px"}}>
                      <span style={{fontSize:12,fontWeight:700,color:getNr(p.id)?R:"#ccc",minWidth:22,textAlign:"right"}}>{getNr(p.id)||"-"}</span>
                      <Av name={p.name} size={20} bg={(stats.ersatz||[]).includes(p.id)?"#9CA3AF":"#16A34A"}/>
                      <span style={{fontSize:12,fontWeight:500,flex:1}}>{p.firstName} {p.lastName}</span>
                      {/* Start / Ersatz toggle */}
                      {canEdit?(
                        <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:`0.5px solid ${GB}`,flexShrink:0}}>
                          <button onClick={()=>setStats(s=>({...s,ersatz:(s.ersatz||[]).filter(x=>x!==p.id)}))}
                            style={{padding:"2px 7px",fontSize:10,fontWeight:700,border:"none",cursor:"pointer",background:!(stats.ersatz||[]).includes(p.id)?"#16A34A":"#fff",color:!(stats.ersatz||[]).includes(p.id)?"#fff":"#888"}}>
                            Start
                          </button>
                          <button onClick={()=>setStats(s=>({...s,ersatz:[...(s.ersatz||[]).filter(x=>x!==p.id),p.id]}))}
                            style={{padding:"2px 7px",fontSize:10,fontWeight:700,border:"none",borderLeft:`0.5px solid ${GB}`,cursor:"pointer",background:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#fff",color:(stats.ersatz||[]).includes(p.id)?"#fff":"#888"}}>
                            Ersatz
                          </button>
                        </div>
                      ):(
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,background:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#DCFCE7",color:(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#16A34A",border:`0.5px solid ${(stats.ersatz||[]).includes(p.id)?"#F3F4F6":"#16A34A60"}`,flexShrink:0}}>
                          {(stats.ersatz||[]).includes(p.id)?"Ersatz":"Start"}
                        </span>
                      )}
                      {editMode&&<button onClick={()=>setStats(s=>({...s,kader:s.kader.filter(x=>x!==p.id)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:"0 2px"}}>{"x"}</button>}
                    </div>
                  ))
                }
              </div>
              {editMode&&<AR onAdd={()=>{const p=ROSTER.find(r=>r.name===newTor.kaderName);if(p&&!stats.kader.includes(p.id))setStats(s=>({...s,kader:[...s.kader,p.id]}));setNewTor(t=>({...t,kaderName:""}));}}><SS value={newTor.kaderName||""} onChange={v=>setNewTor(t=>({...t,kaderName:v}))} options={spielerNamen.filter(n=>!kaderNamen.includes(n))} placeholder="Spieler auswählen"/></AR>}

              {!played&&<div style={{padding:"10px 12px",background:"#EFF6FF",borderRadius:8,fontSize:12,color:BL,marginTop:8}}>≡ Startaufstellung - Tore, Assists und Karten können nach dem Spiel erfasst werden.</div>}

              {played&&<><ST>Tore ({stats.tore.length})</ST>
              {stats.tore.length===0&&!editMode&&<div style={{fontSize:12,color:"#aaa",marginBottom:4}}>Keine Tore erfasst.</div>}
              {stats.tore.map((t,i)=>(
                <EZ key={i} icon="Tor" text={t.eigentor?t.spieler+" (Eigentor)":t.spieler} min={t.min} onDelete={()=>setStats(s=>({...s,tore:s.tore.filter((_,j)=>j!==i)}))}/>
              ))}
              {editMode&&<AR onAdd={()=>{if(!newTor.spieler)return;setStats(s=>({...s,tore:[...s.tore,{spieler:newTor.spieler,min:newTor.min||"",eigentor:false}]}));setNewTor(t=>({...t,spieler:"",min:""}));}}><SS value={newTor.spieler} onChange={v=>setNewTor(t=>({...t,spieler:v}))} options={spielerNamen} placeholder="Torschütze"/><MI value={newTor.min} onChange={v=>setNewTor(t=>({...t,min:v}))}/></AR>}

              <ST>Assists ({stats.assists.length})</ST>
              {stats.assists.length===0&&!editMode&&<div style={{fontSize:12,color:"#aaa",marginBottom:4}}>Keine Assists erfasst.</div>}
              {stats.assists.map((a,i)=>(
                <EZ key={i} icon="Ass" text={a.spieler} min={a.min} onDelete={()=>setStats(s=>({...s,assists:s.assists.filter((_,j)=>j!==i)}))}/>
              ))}
              {editMode&&<AR onAdd={()=>{if(!newAssist.spieler)return;setStats(s=>({...s,assists:[...s.assists,{spieler:newAssist.spieler,min:newAssist.min||""}]}));setNewAssist({spieler:"",min:""});}}><SS value={newAssist.spieler} onChange={v=>setNewAssist(a=>({...a,spieler:v}))} options={spielerNamen} placeholder="Spieler"/><MI value={newAssist.min} onChange={v=>setNewAssist(a=>({...a,min:v}))}/></AR>}

              <ST>Karten ({stats.karten.length})</ST>
              {stats.karten.length===0&&!editMode&&<div style={{fontSize:12,color:"#aaa",marginBottom:4}}>Keine Karten erfasst.</div>}
              {stats.karten.map((k,i)=>{
                const ks=KARTEN_STYLE[k.type]||KARTEN_STYLE["gelb"];
                const karteBadge=<span style={{background:ks.bg,color:ks.color,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3}}>{ks.label}</span>;
                return <EZ key={i} icon={karteBadge} text={k.spieler} min={k.min} onDelete={()=>setStats(s=>({...s,karten:s.karten.filter((_,j)=>j!==i)}))}/>;
              })}
              {editMode&&<AR onAdd={()=>{if(!newKarte.spieler)return;setStats(s=>({...s,karten:[...s.karten,{spieler:newKarte.spieler,min:newKarte.min||"",type:newKarte.type}]}));setNewKarte({spieler:"",min:"",type:"gelb"});}}><SS value={newKarte.spieler} onChange={v=>setNewKarte(k=>({...k,spieler:v}))} options={spielerNamen} placeholder="Spieler"/><SS value={newKarte.type} onChange={v=>setNewKarte(k=>({...k,type:v}))} options={[{value:"gelb",label:"Gelb"},{value:"gelb-rot",label:"Gelb-Rot"},{value:"rot",label:"Rot"}]}/><MI value={newKarte.min} onChange={v=>setNewKarte(k=>({...k,min:v}))}/></AR>}

              <ST>Ein-/Auswechslungen ({stats.wechsel.length})</ST>
              {stats.wechsel.length===0&&!editMode&&<div style={{fontSize:12,color:"#aaa",marginBottom:4}}>Keine Wechsel erfasst.</div>}
              {stats.wechsel.map((w,i)=>{
                const wText=(
                  <span style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{color:R}}>{"Raus: "+w.raus}</span>
                    <span style={{color:"#aaa"}}>{"/"}</span>
                    <span style={{color:GN}}>{"Rein: "+w.rein}</span>
                  </span>
                );
                return <EZ key={i} icon="Wec" text={wText} min={w.min} onDelete={()=>setStats(s=>({...s,wechsel:s.wechsel.filter((_,j)=>j!==i)}))}/>;
              })}
              {editMode&&<AR onAdd={()=>{if(!newWechsel.raus||!newWechsel.rein)return;setStats(s=>({...s,wechsel:[...s.wechsel,{raus:newWechsel.raus,rein:newWechsel.rein,min:newWechsel.min||""}]}));setNewWechsel({raus:"",rein:"",min:""});}}><SS value={newWechsel.raus} onChange={v=>setNewWechsel(w=>({...w,raus:v}))} options={spielerNamen} placeholder="Raus"/><SS value={newWechsel.rein} onChange={v=>setNewWechsel(w=>({...w,rein:v}))} options={spielerNamen} placeholder="Rein"/><MI value={newWechsel.min} onChange={v=>setNewWechsel(w=>({...w,min:v}))}/></AR>}

              <div style={{marginTop:12,padding:"7px 11px",background:GR,borderRadius:8,fontSize:10,color:"#888"}}>Manuell durch Trainer erfasst · nicht Teil der FVRZ-Synchronisation</div>
              </>}
            </div>
          )}

          {/* -- Player of the Match -- */}
          {activeTab==="motm"&&played&&(()=>{
            const roster=ROSTER.filter(p=>(p.teams||[]).includes(spiel.team)&&!p.role);
            const counts=voteCounts(roster);
            const maxV=Math.max(0,...roster.map(p=>counts[p.id]||0));
            const sorted=[...roster].sort((x,y)=>(counts[y.id]||0)-(counts[x.id]||0));

            /* Build top-3 rank groups */
            const topGroups=[];
            let rank=1,idx=0;
            while(idx<sorted.length&&rank<=3){
              const vv=counts[sorted[idx].id]||0;
              if(vv===0) break;
              const grp=sorted.filter(pl=>counts[pl.id]===vv);
              topGroups.push({rank,votes:vv,players:grp});
              idx+=grp.length;
              rank+=grp.length;
            }
            const medals=["①","②","③"];
            const gradients=["linear-gradient(135deg,#FEF3C7,#FDE68A)","linear-gradient(135deg,#F3F4F6,#E5E7EB)","linear-gradient(135deg,#FEF9EE,#FDE68A80)"];
            const borders=[AM,"#9CA3AF","#D97706"];

            return(
              <div>
                {/* Podium */}
                <div style={{marginBottom:16}}>
                  {topGroups.length===0&&<div style={{fontSize:13,color:"#aaa",padding:"12px",background:GR,borderRadius:8,textAlign:"center",marginBottom:12}}>Noch keine Stimmen abgegeben</div>}
                  {topGroups.map((grp,gi)=>(
                    <div key={gi} style={{background:gradients[gi],border:`1px solid ${borders[gi]}`,borderRadius:10,padding:"11px 16px",marginBottom:6}}>
                      <div style={{fontSize:10,fontWeight:700,color:borders[gi],textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{medals[gi]} Platz {grp.rank}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {grp.players.map(pl=>(
                            <div key={pl.id} style={{display:"flex",alignItems:"center",gap:6}}>
                              <Av name={pl.name} size={24} bg={gi===0?AM:"#9CA3AF"}/>
                              <span style={{fontWeight:700,fontSize:14,color:BK}}>{pl.firstName} {pl.lastName}</span>
                            </div>
                          ))}
                        </div>
                        <span style={{fontSize:12,color:borders[gi],fontWeight:600}}>{grp.votes} {grp.votes===1?"Stimme":"Stimmen"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Voting list */}
                <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Abstimmen</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {roster.map(pl=>{
                    const vv=counts[pl.id]||0;
                    const isVoted=isVotedFor(pl.id);
                    const barPct=maxV>0?Math.round(vv/maxV*100):0;
                    return(
                      <div key={pl.id} onClick={()=>castVote(pl.id)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1.5px solid ${isVoted?AM:GB}`,background:isVoted?"#FFFBEB":"#fff",cursor:"pointer"}}>
                        <Av name={pl.name} size={28} bg={isVoted?AM:R}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <span style={{fontWeight:isVoted?700:500,fontSize:13}}>{pl.firstName} {pl.lastName}</span>
                            <span style={{fontSize:11,fontWeight:700,color:isVoted?AM:"#aaa"}}>{vv>0?vv+(vv===1?" Stimme":" Stimmen"):""}</span>
                          </div>
                          <div style={{height:4,background:"#F3F4F6",borderRadius:2}}>
                            <div style={{height:"100%",width:barPct+"%",background:isVoted?AM:"#F3F4F6",borderRadius:2}}/>
                          </div>
                        </div>
                        {isVoted&&<span style={{fontSize:16}}>⭐</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:12,padding:"7px 11px",background:GR,borderRadius:8,fontSize:10,color:"#888"}}>Jeder Spieler kann einmal abstimmen · Ergebnis nach Spielschluss sichtbar</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}



function ScheduleTab({role,team,initialSelected}){
  const isMobile=useIsMobile();
  const [selected,setSelected]=useState(initialSelected||null);
  const canEdit=["trainer","administrator","administration"].includes(role);
  const parseGDate=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";}
  useEffect(()=>{
    if(NAV_TARGET.selectedSpiel){
      setSelected(NAV_TARGET.selectedSpiel);
      NAV_TARGET.selectedSpiel=null;
    }
  },[]);
  const allGames=team ? SCHEDULE.filter(g=>g.team===team) : SCHEDULE;
  const playedGames=allGames.filter(g=>g.result).sort((a,b)=>parseGDate(a.date).localeCompare(parseGDate(b.date)));
  const upcomingGames=allGames.filter(g=>!g.result).sort((a,b)=>parseGDate(a.date).localeCompare(parseGDate(b.date)));
  const games=[...playedGames,...upcomingGames];
  const [motmAll,setMotmAll]=useState({
    4:{"demo_voter1":1,"demo_voter2":2,"demo_voter3":2,"demo_voter4":5},
    5:{"demo_voter1":2,"demo_voter2":1,"demo_voter3":3},
  });
  return(
    <>
      {selected&&<SpielDetail spiel={selected} onClose={()=>setSelected(null)} canEdit={canEdit} motmAll={motmAll} setMotmAll={setMotmAll}/>}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:GR}}>
              {["Datum","Zeit","Gegner","H/A","Ort","Wettbewerb","Resultat",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((g,i)=>(
              <tr
                key={g.id}
                onClick={()=>setSelected(g)}
                style={{borderTop:`0.5px solid ${GB}`,background:g.result?"#fafaf8":"#fff",cursor:"pointer",transition:"background 0.1s",height:isMobile?52:40}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8de0930"}
                onMouseLeave={e=>e.currentTarget.style.background=g.result?"#fafaf8":"#fff"}>
                <td style={{padding:"11px 13px",fontWeight:600,whiteSpace:"nowrap"}}>{g.date}</td>
                {!isMobile&&<td style={{padding:"9px 13px"}}>{g.time+" Uhr"}</td>}
                <td style={{padding:"9px 13px",fontWeight:600}}>{g.opponent}</td>
                <td style={{padding:"9px 13px"}}><Chip text={g.home?"H":"A"} color={g.home?"#16A34A":"#6B7280"}/></td>
                {!isMobile&&<><td style={{padding:"9px 13px",color:"#777",fontSize:11}}>{g.venue.split(",")[0]}</td>
                <td style={{padding:"9px 13px",color:"#888",fontSize:11}}>{g.comp}</td></>}
                <td style={{padding:"9px 13px"}}>{g.result?<span style={{fontWeight:600,fontSize:13,color:BK}}>{g.result}{g.htResult&&<span style={{fontWeight:400,fontSize:11,color:"#aaa",marginLeft:5}}>({g.htResult})</span>}</span>:<Chip text="Ausstehend" color="#999" bg="#f5f5f5"/>}</td>
                <td style={{padding:"9px 13px",color:"#ccc",fontSize:13}}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function TableTab({team}){
  const rows=TABLES[team]||TABLE;

  return(
    <div>

      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:GR}}>
              {["#","Mannschaft","Sp","S","U","N","Tore","+/-","Pts"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:i>1?"center":"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{borderTop:`0.5px solid ${GB}`,background:r.me?"#f8de0920":i%2===0?"#fff":"#fafaf8"}}>
                <td style={{padding:"9px 13px",fontWeight:700,color:"#666"}}>{r.rank}</td>
                <td style={{padding:"9px 13px",fontWeight:r.me?700:400,color:r.me?BK:BK}}>
                  {r.team}
                  {r.me&&<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#f8de09",marginLeft:6,verticalAlign:"middle"}}/>}
                </td>
                {[r.sp,r.s,r.u,r.n].map((v,j)=><td key={j} style={{padding:"9px 13px",textAlign:"center",color:"#555"}}>{v}</td>)}
                <td style={{padding:"9px 13px",textAlign:"center",color:"#555"}}>{r.tore}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:r.diff>0?GN:r.diff<0?R:"#555"}}>{r.diff>0?"+":""}{r.diff}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:800}}>{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AttendanceTab({role,team,setActive,onNavigateToSpiel,myRosterId:myRosterIdProp,initialFilter="alle",responses:responsesProp,onResponseChange,allTeams,account}){
  const isMobile=useIsMobile();
  const isTrainer=["trainer"].includes(role);
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isSpieler=role==="spieler";
  const isEltern=role==="eltern";
  const kinder=account?.kinder||[];
  const hasMultiKinder=isEltern&&kinder.length>1;
  const [activeKind,setActiveKind]=useState(kinder[0]||null);
  const hasMultiTeams=(allTeams&&allTeams.length>1)||(isEltern&&hasMultiKinder);
  const [selectedTeam,setSelectedTeam]=useState("alle");
  useEffect(()=>{setSelectedTeam("alle");},[allTeams?.join(",")]);
  /* Dynamic myId: for eltern use child matching selected team */
  const myId=(()=>{
    if(hasMultiKinder&&allTeams){
      const matchingKind=selectedTeam!=="alle"?kinder.find(k=>k.team===selectedTeam):kinder[0];
      return matchingKind?.rosterId||myRosterIdProp||1;
    }
    return myRosterIdProp||(isSpieler?1:isEltern?1:isTrainer?200:null);
  })();

  /* Events: if allTeams provided show all teams, filtered by selectedTeam or active child */
  const teamEvents=(()=>{
    /* Eltern with multiple kids + allTeams → show all kids' events */
    if(hasMultiKinder&&allTeams&&allTeams.length>0){
      const teams=selectedTeam==="alle"?allTeams:[selectedTeam];
      return ATT_EVENTS.filter(e=>teams.some(t=>e.team===t)||e.subtype==="Vereinsanlass");
    }
    /* Multi-team (trainer) */
    if(allTeams&&allTeams.length>0){
      const teams=selectedTeam==="alle"?allTeams:[selectedTeam];
      return ATT_EVENTS.filter(e=>teams.some(t=>e.team===t)||e.subtype==="Vereinsanlass");
    }
    return team?ATT_EVENTS.filter(e=>e.team===team||e.subtype==="Vereinsanlass"):ATT_EVENTS;
  })();
  const activeTeamForRoster=selectedTeam!=="alle"?selectedTeam:(allTeams?.[0]||team);
  const teamRoster=activeTeamForRoster?ROSTER.filter(p=>(p.teams||[]).includes(activeTeamForRoster)):ROSTER.filter(p=>(p.teams||[]).includes("Cc-Junioren"));

  const [responsesLocal,setResponsesLocal]=useState(ATT_INITIAL);
  const responses=responsesProp||responsesLocal;
  const setResponses=(r)=>{
    if(onResponseChange) onResponseChange(r);
    else setResponsesLocal(r);
  };
  const [selEvent,setSelEvent]=useState(teamEvents[0]?.id||1);
  const [modalOpen,setModalOpen]=useState(()=>{
    if(NAV_TARGET.openEvId){const id=NAV_TARGET.openEvId;NAV_TARGET.openEvId=null;setSelEvent(id);return true;}
    return false;
  });
  const [activeFilters,setActiveFilters]=useState(()=>{
    if(Array.isArray(initialFilter)) return new Set(initialFilter);
    return new Set(initialFilter==="alle"||!initialFilter?[]:[ initialFilter]);
  });
  useEffect(()=>{
    if(Array.isArray(initialFilter)) setActiveFilters(new Set(initialFilter));
    else setActiveFilters(new Set(initialFilter==="alle"||!initialFilter?[]:[ initialFilter]));
  },[initialFilter]);
  const toggleFilter=(f)=>{
    if(f==="alle"){setActiveFilters(new Set());return;}
    setActiveFilters(prev=>{
      const next=new Set(prev);
      next.has(f)?next.delete(f):next.add(f);
      return next;
    });
  };
  const isFilterActive=(f)=>f==="alle"?activeFilters.size===0:activeFilters.has(f);
  const [timeFilter,setTimeFilter]=useState("kommend");
  const [showMoreEvents,setShowMoreEvents]=useState(false);
  const [cancelledEvents,setCancelledEvents]=useState({});
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("aufgebot_state");if(r)setAufgebotState(JSON.parse(r.value));}catch(e){}
    })();
  },[]);
  const toggleAufgebot=(evId,pid)=>{
    setAufgebotState(prev=>{
      const evList=prev[evId]||[];
      const next=evList.includes(pid)?evList.filter(x=>x!==pid):[...evList,pid];
      const updated={...prev,[evId]:next};
      window.storage.set("aufgebot_state",JSON.stringify(updated)).catch(()=>{});
      return updated;
    });
  };
  const isInAufgebot=(evId,pid)=>(aufgebotState[evId]||[]).includes(pid);
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("cancelled_events");if(r)setCancelledEvents(JSON.parse(r.value));}catch(e){}}
    )();
  },[]);
  const toggleCancel=(evId)=>{
    setCancelledEvents(prev=>{
      const next={...prev,[evId]:!prev[evId]};
      window.storage.set("cancelled_events",JSON.stringify(next)).catch(()=>{});

      // Sync mit GANTT: Training-Event → Ausnahme in trainingsAusnahmen schreiben
      const ev=ATT_EVENTS.find(e=>e.id===evId&&e.type==="Training");
      if(ev){
        (async()=>{
          try{
            // KW berechnen
            const [wd,dm]=ev.date.split(" ");
            const [day,mon,yr]=(dm||ev.date).split(".").map(Number);
            const evDate=new Date(yr||2026,mon-1,day);
            const jan4=new Date(evDate.getFullYear(),0,4);
            const kw=Math.ceil(((evDate-jan4)/86400000+jan4.getDay()+1)/7);
            const kwKey=`${evDate.getFullYear()}_${kw}`;

            // Passenden GANTT-Slot finden
            const WOCHENTAGE=["So","Mo","Di","Mi","Do","Fr","Sa"];
            const weekday=WOCHENTAGE[evDate.getDay()];
            const r=await window.storage.get("trainingsPlaene");
            if(r){
              const plaene=JSON.parse(r.value);
              const aktiverPlan=plaene.find(p=>p.active)||plaene[0];
              const matchSlot=aktiverPlan?.slots?.find(s=>
                s.weekday===weekday&&s.team===ev.team
              );
              if(matchSlot){
                const ar=await window.storage.get("trainingsAusnahmen");
                const ausnahmen=ar?JSON.parse(ar.value):{};
                const kwAusnahmen=ausnahmen[kwKey]||[];
                const isCancelling=!prev[evId]; // next state
                let newKwAusnahmen;
                if(isCancelling){
                  // Absage hinzufügen
                  newKwAusnahmen=[
                    ...week_nrAusnahmen.filter(a=>!(a.slot_id===matchSlot.id&&a.type==="absage")),
                    {type:"absage",slot_id:matchSlot.id,weekday,team:ev.team,evId,von_termin:true}
                  ];
                } else {
                  // Absage rückgängig
                  newKwAusnahmen=kwAusnahmen.filter(a=>!(a.slot_id===matchSlot.id&&a.type==="absage"&&a.von_termin));
                }
                await window.storage.set("trainingsAusnahmen",JSON.stringify({...ausnahmen,[kwKey]:newKwAusnahmen}));

                // Benachrichtigung für Administration
                if(isCancelling){
                  const nr=await window.storage.get("admin_benachrichtigungen");
                  const bestehende=nr?JSON.parse(nr.value):[];
                  const neue=[...bestehende,{
                    id:Date.now(),
                    type:"training_absage",
                    titel:`Training abgesagt: ${ev.team}`,
                    inhalt:`${weekday} ${ev.date} · ${ev.time} Uhr · abgesagt vom Trainer`,
                    team:ev.team,
                    datum:ev.date,
                    gelesen:false,
                    created_at:new Date().toISOString(),
                  }];
                  await window.storage.set("admin_benachrichtigungen",JSON.stringify(neue));
                }
              }
            }
          }catch(e){}
        })();
      }
      return next;
    });
  };
  const [showNoteFor,setShowNoteFor]=useState(null);
  const [attLoaded,setAttLoaded]=useState(false);

  /* Load persisted responses on mount */
  if(!attLoaded){
    setAttLoaded(true);
    (async()=>{
      try{
        const res=await window.storage.get("att_responses");
        if(res){
          const stored=JSON.parse(res.value);
          const merged={...ATT_INITIAL};
          Object.keys(stored).forEach(evId=>{merged[evId]={...ATT_INITIAL[evId],...stored[evId]};});
          setResponses(merged);
        }
      }catch(e){}
    })();
  }

  const saveResp=(newResp)=>{
    setResponses(newResp);
    /* Only persist user-changed entries (delta vs ATT_INITIAL) */
    const delta={};
    Object.keys(newResp).forEach(evId=>{
      Object.keys(newResp[evId]||{}).forEach(pid=>{
        const cur=newResp[evId]?.[pid]?.status;
        const init=ATT_INITIAL[evId]?.[pid]?.status;
        if(cur!==init){
          if(!delta[evId]) delta[evId]={};
          delta[evId][pid]=newResp[evId][pid];
        }
      });
    });
    window.storage.set("att_responses",JSON.stringify(delta)).catch(()=>{});
  };

  const parseEvDate2=(d)=>{
    if(!d) return "";
    const c=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const p=c.split(".");
    return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:"";
  };
  const TODAY="2026-05-23";
  const isPast=(ev)=>parseEvDate2(ev.date)<TODAY;

  const getResp=(evId,pid)=>{
    const stored=responses[evId]?.[pid];
    if(stored?.status) return stored;
    const ev=ATT_EVENTS.find(e=>e.id===evId);
    if(ev?.type==="Training") return {status:"zu",note:""};
    return {status:null,note:""};
  };

  const setResp=(evId,pid,status,note)=>{
    const updated={
      ...responses,
      [evId]:{...responses[evId],[pid]:{status,note:note!==undefined?note:(responses[evId]?.[pid]?.note||"")}}
    };
    saveResp(updated);
  };

  const evCounts=(ev)=>{
    const pids=teamRoster.map(p=>p.id);
    return{
      zu:      pids.filter(id=>getResp(ev.id,id).status==="zu").length,
      ab:      pids.filter(id=>getResp(ev.id,id).status==="ab").length,
      unent:   pids.filter(id=>getResp(ev.id,id).status==="unentschuldigt").length,
      aufgebot:pids.filter(id=>isInAufgebot(ev.id,id)).length,
      frag:    pids.filter(id=>getResp(ev.id,id).status==="fraglich").length,
      offen:   pids.filter(id=>!getResp(ev.id,id).status).length,
      total:   pids.length,
    };
  };

  const STATUS_CFG={
    "zu":             {label:"Zusage",        color:GN,    bg:"#ECFDF5", icon:"✓"},
    "ab":             {label:"Absage",         color:R,     bg:RL,        icon:"✕"},
    "unentschuldigt": {label:"Unentschuldigt", color:AM, bg:"#FFF7ED", icon:"!"},
    "fraglich":       {label:"Fraglich",       color:AM,    bg:"#FFFBEB", icon:"?"},
    "aufgebot":       {label:"Aufgebot",     color:"#4F46E5",bg:"#EEF2FF",icon:"ti-ball-football"},
    null:             {label:"Ausstehend",     color:"#888",bg:"#f5f5f5", icon:"-"},
  };

  const parseEvDate=(d)=>{
    if(!d) return "";
    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
    const parts=clean.split(".");
    if(parts.length>=2) return `2026-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    return "";
  };
  const filteredEvents=teamEvents
    .filter(e=>timeFilter==="alle"||(timeFilter==="kommend"&&!isPast(e))||(timeFilter==="vergangen"&&isPast(e)))
    .filter(e=>{
      if(activeFilters.size===0) return true;
      if(activeFilters.has("training")&&e.type==="Training") return true;
      if(activeFilters.has("spiele")&&e.type==="Spiel") return true;
      if(activeFilters.has("team-event")&&e.type==="Veranstaltung"&&e.subtype==="Team-Event") return true;
      if(activeFilters.has("vereinsanlass")&&e.type==="Veranstaltung"&&e.subtype==="Vereinsanlass") return true;
      return false;
    })
    .sort((a,b)=>{
      const da=parseEvDate(a.date), db=parseEvDate(b.date);
      return timeFilter==="vergangen"?db.localeCompare(da):da.localeCompare(db);
    });
  const selEv=teamEvents.find(e=>e.id===selEvent)||teamEvents[0];

  /* Modal state - shared between trainer and spieler/eltern views */
  const [editingDeadline,setEditingDeadline]=useState(false);
  const [deadlines,setDeadlines]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,e.deadline||""])));
  const [autoReminder,setAutoReminder]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,true])));
  const [reminderTimes,setReminderTimes]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,"3h"])));
  const REMINDER_OPTIONS=[
    {v:"30m",l:"30 Min. vorher"},
    {v:"1h", l:"1 Std. vorher"},
    {v:"2h", l:"2 Std. vorher"},
    {v:"3h", l:"3 Std. vorher"},
    {v:"6h", l:"6 Std. vorher"},
    {v:"12h",l:"12 Std. vorher"},
    {v:"24h",l:"1 Tag vorher"},
    {v:"48h",l:"2 Tage vorher"},
  ];

  const getReminderTime=(dl)=>{
    if(!dl) return null;
    try{
      const parts=dl.split(",");
      const datePart=parts[0].trim();
      const timePart=(parts[1]||"").trim();
      if(!timePart) return null;
      const [h,m]=timePart.split(":").map(Number);
      let rh=h-3;
      const rday=rh<0?"Vortag":"";
      if(rh<0) rh+=24;
      return `${datePart}${rday?" ("+rday+")":""}, ${String(rh).padStart(2,"0")}:${String(m).padStart(2,"0")} Uhr`;
    }catch(e){return null;}
  };

  const openEvent=(id)=>{setSelEvent(id);setModalOpen(true);setEditingDeadline(false);};

  /* Trainer notes per event */
  const [trainerNotes,setTrainerNotes]=useState({});
  const [editingNote,setEditingNote]=useState(false);
  const [besammlungen,setBesammlungen]=useState(()=>Object.fromEntries(ATT_EVENTS.map(e=>[e.id,
    e.treffpunkt?{date:e.date||"",time:(e.treffpunkt.match(/^\d{2}:\d{2}/)||[""])[0],ort:e.treffpunkt.replace(/^\d{2}:\d{2}\s*/,"")}:
    {date:"",time:"",ort:""}
  ])));
  const [editingBesammlung,setEditingBesammlung]=useState(false);
  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("trainer_notes");if(r)setTrainerNotes(JSON.parse(r.value));}catch(e){}
      try{const r=await window.storage.get("besammlungen");if(r)setBesammlungen(prev=>({...prev,...JSON.parse(r.value)}));}catch(e){}
    })();
  },[]);
  const saveTrainerNote=(evId,text)=>{
    const updated={...trainerNotes,[evId]:text};
    setTrainerNotes(updated);
    window.storage.set("trainer_notes",JSON.stringify(updated)).catch(()=>{});
  };
  const saveBesammlung=(evId,field,value)=>{
    const updated={...besammlungen,[evId]:{...(besammlungen[evId]||{}),date:"",time:"",ort:"",...besammlungen[evId],[field]:value}};
    setBesammlungen(updated);
    window.storage.set("besammlungen",JSON.stringify(updated)).catch(()=>{});
  };

  const canEditEvent=(ev)=>{
    if(!ev) return false;
    if(["administrator","administration"].includes(role)) return true;
    if(role==="trainer"&&ev.subtype==="Vereinsanlass") return false;
    return isTrainer||isAdmin;
  };

  /* Spieler/Eltern: gleiche Kartenansicht wie Trainer */
  if(!isTrainer&&myId){
    return(
      <div>
        {/* Modal auch für Spieler/Eltern */}
        {modalOpen&&selEv&&(
          <div onClick={()=>setModalOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"#fff",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
              {/* Header */}
              {(()=>{
                const hBg=selEv.type==="Spiel"?"#EFF6FF":selEv.subtype==="Vereinsanlass"?"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)":selEv.type==="Veranstaltung"?`linear-gradient(135deg,${AM} 0%,#b45309 100%)`:"#F0FDF4";
                const hLight=selEv.type==="Spiel"||selEv.type==="Training";
                const hTxt=hLight?"#1a1a1a":"#fff";
                const hTxtSub=hLight?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.75)";
                const hBtn=hLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.18)";
                return(
                  <div style={{background:hBg,borderRadius:"20px 20px 0 0",padding:"20px 22px",color:"#fff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <span style={{background:hBtn,color:hTxt,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,textTransform:"uppercase",letterSpacing:0.6}}>{selEv.subtype||selEv.type}</span>
                      <button onClick={()=>setModalOpen(false)} style={{background:hBtn,border:"none",borderRadius:"50%",width:30,height:30,color:hTxt,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                    <div style={{fontWeight:900,fontSize:22,lineHeight:1.2,marginBottom:12,color:hTxt}}>
                      {selEv.opponent?"vs. "+selEv.opponent:selEv.type==="Training"?"Training":selEv.title||selEv.type}
                    </div>
                    {/* Info Pills */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><i className="ti-calendar" style={{marginRight:3}}/> {selEv.date}{selEv.endDate?" - "+selEv.endDate:""}</span>
                      <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><i className="ti-clock" style={{marginRight:3}}/> {selEv.time} Uhr</span>
                      <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><i className="ti-map-pin" style={{marginRight:3}}/> {selEv.location}</span>
                      {selEv.treffpunkt&&<span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><i className="ti-target" style={{marginRight:3}}/> {selEv.treffpunkt}</span>}
                    </div>
                  </div>
                );
              })()}
              {/* Beschreibung */}
              {selEv.description&&(
                <div style={{padding:"14px 20px",borderBottom:`0.5px solid ${GB}`,display:"flex",gap:10,background:"#F9FAFB"}}>
                  <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
                  <p style={{margin:0,fontSize:13,color:"#444",lineHeight:1.65}}>{selEv.description}</p>
                </div>
              )}
              {/* Weitere Informationen */}
              {(trainerNotes[selEv.id]||besammlungen[selEv.id])&&(
                <div style={{padding:"14px 20px",borderBottom:`0.5px solid ${GB}`,background:"#fff"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>≡ Weitere Informationen</div>
                  {besammlungen[selEv.id]&&(besammlungen[selEv.id].time||besammlungen[selEv.id].location)&&(
                    <div style={{marginBottom:trainerNotes[selEv.id]?8:0}}>
                      <div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:2}}><i className="ti-target" style={{marginRight:3}}/> Treffpunkt</div>
                      <div style={{fontSize:13,color:BK,fontWeight:500}}>
                        {besammlungen[selEv.id].date&&<span style={{marginRight:8}}><i className="ti-calendar" style={{marginRight:3}}/> {besammlungen[selEv.id].date}</span>}
                        {besammlungen[selEv.id].time&&<span style={{marginRight:8}}><i className="ti-clock" style={{marginRight:3}}/> {besammlungen[selEv.id].time} Uhr</span>}
                        {besammlungen[selEv.id].location&&<span><i className="ti-target" style={{marginRight:3}}/> {besammlungen[selEv.id].location}</span>}
                      </div>
                    </div>
                  )}
                  {trainerNotes[selEv.id]&&(
                    <div>
                      <div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:2}}><i className="ti-edit" style={{marginRight:3}}/> Bemerkungen</div>
                      <p style={{margin:0,fontSize:13,color:"#1a3a2a",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{trainerNotes[selEv.id]}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Zum Spielplan Link bei Spielen */}
              {selEv.type==="Spiel"&&onNavigateToSpiel&&(
                <div style={{padding:"10px 20px",background:"#EFF6FF",borderBottom:`0.5px solid #DBEAFE`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:BL,fontWeight:500}}><i className="ti-ball-football" style={{marginRight:4}}/> Dieses Spiel im Spielplan ansehen</span>
                  <button onClick={()=>{const match=SCHEDULE.find(g=>g.date===selEv.date&&g.opponent===selEv.opponent);setModalOpen(false);if(match)onNavigateToSpiel(match);}}
                    style={{fontSize:11,fontWeight:700,color:BL,background:"#fff",border:`1px solid ${BL}`,borderRadius:20,padding:"3px 12px",cursor:"pointer"}}>
                    Zum Spielplan →
                  </button>
                </div>
              )}
              {/* Eigene RSVP */}
              {selEv.rsvp!==false&&(
                <div style={{padding:"14px 20px"}}>
                  {/* Aufgebot-Banner für Spieler/Eltern */}
                  {!isTrainer&&!isAdmin&&isInAufgebot(selEv.id,myId)&&(
                    <div style={{background:"#EEF2FF",border:"1.5px solid #818CF8",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:18}}><i className="ti-ball-football"/></span>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"#4F46E5"}}>Du bist im Aufgebot!</div>
                        <div style={{fontSize:11,color:"#6366F1",marginTop:2}}>
                          {selEv.treffpunkt?`Treffpunkt: ${selEv.treffpunkt}`:"Treffpunkt folgt"}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Aufgebotene Mitspieler */}
                  {!isTrainer&&!isAdmin&&selEv.type==="Spiel"&&(()=>{
                    const ichSelbst=teamRoster.find(p=>p.id===myId);
                    const mitspieler=teamRoster.filter(p=>p.id!==myId&&isInAufgebot(selEv.id,p.id));
                    const alleAufgebotene=[...(isInAufgebot(selEv.id,myId)&&ichSelbst?[{...ichSelbst,ich:true}]:[]),...mitspieler];
                    if(alleAufgebotene.length===0) return null;
                    return(
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Aufgebot ({alleAufgebotene.length})</div>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {alleAufgebotene.map(p=>(
                            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:p.ich?"#4F46E5":"#EEF2FF",borderRadius:8}}>
                              <Av name={p.name} size={26} bg={p.ich?"rgba(255,255,255,0.3)":"#6366F1"}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:700,color:p.ich?"#fff":"#4F46E5"}}>{p.firstName} {p.lastName}{p.ich?" (Du)":""}</div>
                                {p.pos&&p.pos!=="-"&&<div style={{fontSize:10,color:p.ich?"rgba(255,255,255,0.7)":"#818CF8"}}>{p.pos}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Meine Rückmeldung</div>
                  <div style={{display:"flex",gap:10}}>
                    {["zu","ab"].map(s=>{
                      const resp=getResp(selEv.id,myId);
                      const active=resp.status===s;
                      return(
                        <button key={s} onClick={()=>setResp(selEv.id,myId,active?null:s)}
                          style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${active?(s==="zu"?GN:R):GB}`,background:active?(s==="zu"?"#ECFDF5":RL):"#fff",color:active?(s==="zu"?GN:R):"#888",fontWeight:active?700:400,fontSize:13,cursor:"pointer"}}>
                          {s==="zu"?"✓ Zusagen":"✕ Absagen"}
                        </button>
                      );
                    })}
                  </div>
                  {getResp(selEv.id,myId).status==="ab"&&(
                    <textarea value={getResp(selEv.id,myId).note||""} onChange={e=>setResp(selEv.id,myId,"ab",e.target.value)}
                      placeholder="Begründung (optional)…" rows={2}
                      style={{width:"100%",marginTop:8,padding:"6px 9px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Statistik-Header */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>
          {(()=>{
            const rsvpEvs=teamEvents.filter(e=>!(e.subtype==="Vereinsanlass"&&e.rsvp===false));
            const spielTrainEvs=rsvpEvs.filter(e=>e.type==="Training"||e.type==="Spiel");

            /* Vergangene Events → Anwesenheitsquote */
            const pastST=spielTrainEvs.filter(e=>isPast(e));
            const pastZu=pastST.filter(e=>getResp(e.id,myId).status==="zu").length;
            const pastPct=pastST.length?Math.round(pastZu/pastST.length*100):null;

            /* Trainings */
            const pastTrain=spielTrainEvs.filter(e=>e.type==="Training"&&isPast(e));
            const pastTrainZu=pastTrain.filter(e=>getResp(e.id,myId).status==="zu").length;
            const trainPct=pastTrain.length?Math.round(pastTrainZu/pastTrain.length*100):null;

            /* Spiele */
            const pastSpiele=spielTrainEvs.filter(e=>e.type==="Spiel"&&isPast(e));
            const pastSpieleZu=pastSpiele.filter(e=>getResp(e.id,myId).status==="zu").length;
            const spielPct=pastSpiele.length?Math.round(pastSpieleZu/pastSpiele.length*100):null;

            const fmt=(pct,zu,total,label)=>pct!==null?[pct+"%",zu+"/"+total+" "+label]:["-","Noch keine "+label];
            const col=(pct)=>pct===null?"#aaa":pct>=80?GN:pct>=60?AM:R;

            const [tv,ts]=fmt(pastPct,pastZu,pastST.length,"Spiele & Trainings");
            const [trv,trs]=fmt(trainPct,pastTrainZu,pastTrain.length,"Trainings");
            const [spv,sps]=fmt(spielPct,pastSpieleZu,pastSpiele.length,"Spiele");
            return[
              <Stat key="t"  label="Anwesenheit Total" value={tv}  sub={ts}  color={col(pastPct)}/>,
              <Stat key="tr" label="Trainings"          value={trv} sub={trs} color={col(trainPct)}/>,
              <Stat key="sp" label="Spiele"             value={spv} sub={sps} color={col(spielPct)}/>,
            ];
          })()}
        </div>

        {/* Team-Filter (nur wenn mehrere Teams) */}
        {hasMultiTeams&&(
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#aaa",fontWeight:600,alignSelf:"center",marginRight:2}}>{isEltern?"Kind:":"Team:"}</span>
            {["alle",...allTeams].map(t=>{
              const active=selectedTeam===t;
              const kind=isEltern?kinder.find(k=>k.team===t):null;
              const label=t==="alle"?(isEltern?"Alle Kinder":"Alle Teams"):kind?`${kind.name.split(" ")[0]} · ${t}`:t;
              return(
                <button key={t} onClick={()=>setSelectedTeam(t)}
                  style={{padding:"4px 12px",borderRadius:20,border:`0.5px solid ${active?"#f8de09":GB}`,background:active?"#f8de0930":"#fff",color:BK,fontSize:11,fontWeight:active?700:400,cursor:"pointer"}}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {/* Filter */}
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,marginBottom:14}}>
          {/* Typ-Pills scrollbar */}
          <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",flex:1,minWidth:0}}>
            {[
              {k:"alle",l:"Alle"},
              {k:"training",l:"Trainings"},
              {k:"spiele",l:"Spiele"},
              {k:"team-event",l:"Teamevents"},
              {k:"vereinsanlass",l:"Vereinsanlass"},
            ].map(f=>{
              const active=isFilterActive(f.k);
              return(
                <button key={f.k} onClick={()=>toggleFilter(f.k)}
                  style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${active?"#1A1A1A":GB}`,background:active?"#1A1A1A":"transparent",color:active?"#fff":"#666",fontSize:13,fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
                  {f.l}
                </button>
              );
            })}
          </div>
          {/* Zeit-Toggle - eigene Zeile auf Mobile durch flex-basis 100% */}
          <button onClick={()=>setTimeFilter(p=>p==="kommend"?"vergangen":"kommend")}
            style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:20,border:`1px solid ${GB}`,background:"#F5F5F3",color:"#555",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,flexBasis:"100%",transition:"all 0.15s"}}>
            <span style={{fontSize:10,opacity:0.6}}>{"▾"}</span>
            <span>{timeFilter==="kommend"?"Vergangene Termine":"Kommende Termine"}</span>
          </button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(showMoreEvents?filteredEvents:filteredEvents.slice(0,5)).map(ev=>{
            const resp=getResp(ev.id,myId);
            const past=isPast(ev);
            const accentColor=ev.type==="Spiel"?BL:ev.subtype==="Vereinsanlass"?"#7C3AED":ev.type==="Veranstaltung"?AM:GN;
            const dateParts=ev.date.split(" ");
            const weekday=dateParts[0]||"";
            const dayMonth=dateParts[1]||ev.date;
            const MONTHS=["","Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
            const dayNum=dayMonth.split(".")[0];
            const monNum=parseInt(dayMonth.split(".")[1])||0;
            const monName=MONTHS[monNum]||"";
            const isZu=resp.status==="zu";
            const isAb=resp.status==="ab";
            const isCancelled=!!cancelledEvents[ev.id];
            const canCancel=isTrainer&&!past&&(ev.type==="Training"||ev.subtype==="Team-Event");
            const showRsvp=!past&&!canCancel&&!(ev.subtype==="Vereinsanlass"&&ev.rsvp===false);
            const inAufgebot=!past&&isInAufgebot(ev.id,myId);

            return(
              <div key={ev.id}
                onMouseEnter={e=>e.currentTarget.style.background=isCancelled?"#FFF5F5":"#FAFAF8"}
                onMouseLeave={e=>e.currentTarget.style.background=isCancelled?"#FFF5F5":"#fff"}
                style={{
                background:isCancelled?"#FFF5F5":"#fff",
                border:`0.5px solid ${GB}`,
                borderRadius:14,
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                opacity:past?0.65:1,
              }}>
                {/* Haupt-Inhalt */}
                <div onClick={()=>openEvent(ev.id)} style={{flex:1,padding:"12px 14px",minWidth:0,display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
                  {/* Datum-Block */}
                  <div style={{width:62,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#F3F3F1",borderRadius:10,padding:"8px 6px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{weekday}</div>
                    <div style={{fontSize:19,fontWeight:700,color:"#1A1A1A",lineHeight:1}}>{dayNum}</div>
                    <div style={{fontSize:10,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{monName}</div>
                  </div>
                  {/* Text */}
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <div style={{fontWeight:600,fontSize:14,color:isCancelled?"#aaa":"#1A1A1A",textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.opponent?"vs. "+ev.opponent:ev.type==="Training"?"Training · "+ev.team:ev.title||ev.type}
                      </div>
                      <span style={{background:accentColor+"18",color:accentColor,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,flexShrink:0}}>
                        {ev.subtype||ev.type}
                      </span>
                      {isCancelled&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:RL,color:R,flexShrink:0}}>⚠ Abgesagt</span>}
                      {inAufgebot&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#EEF2FF",color:"#4F46E5",flexShrink:0}}><i className="ti-ball-football" style={{marginRight:3}}/> Aufgebot</span>}
                      {past&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:isZu?"#ECFDF5":isAb?RL:"#F3F4F6",color:isZu?GN:isAb?R:"#aaa",flexShrink:0}}>{isZu?"✓ Anwesend":isAb?"✕ Abwesend":"-"}</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"2px 6px",fontSize:11,color:"#888"}}>
                      <span><i className="ti-clock" style={{marginRight:3}}/> {ev.time} Uhr</span>
                      {ev.type==="Spiel"&&ev.treffpunkt&&(<>
                        <span style={{color:"#ddd"}}>·</span>
                        <span><i className="ti-target" style={{marginRight:3}}/> <span style={{fontWeight:600,color:"#666"}}>Treffpunkt: </span>{ev.treffpunkt}</span>
                      </>)}
                    </div>
                  </div>
                </div>

                {/* RSVP-Buttons - segmentierter Toggle */}
                {showRsvp&&(
                  <div style={{padding:"10px 12px",borderTop:`0.5px solid ${GB}`}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",background:"#F3F3F1",borderRadius:10,padding:3,gap:2}}>
                      <button onClick={()=>setResp(ev.id,myId,isZu?null:"zu")}
                        style={{flex:1,padding:"9px 8px",border:"none",borderRadius:8,background:isZu?"#16A34A":"transparent",color:isZu?"#fff":(!isZu&&!isAb)?"#888":"#bbb",fontSize:12,fontWeight:isZu?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <span style={{fontSize:14}}>▲</span>
                        <span>{isZu?"Zugesagt":"Zusagen"}</span>
                      </button>
                      <div style={{width:1,background:GB,flexShrink:0,margin:"4px 0"}}/>
                      <button onClick={()=>setResp(ev.id,myId,isAb?null:"ab")}
                        style={{flex:1,padding:"9px 8px",border:"none",borderRadius:8,background:isAb?"#DC2626":"transparent",color:isAb?"#fff":(!isZu&&!isAb)?"#888":"#bbb",fontSize:12,fontWeight:isAb?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <span style={{fontSize:14}}>▽</span>
                        <span>{isAb?"Abgesagt":"Absagen"}</span>
                      </button>
                    </div>
                  </div>
                )}
                {showRsvp&&isAb&&(
                  <div style={{borderTop:`0.5px solid ${GB}`,padding:"8px 12px"}} onClick={e=>e.stopPropagation()}>
                    <textarea value={resp.note} onChange={e=>setResp(ev.id,myId,"ab",e.target.value)}
                      placeholder="Begründung (optional)…" rows={2}
                      style={{width:"100%",padding:"6px 9px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:11,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  </div>
                )}
                {canCancel&&(
                  <div style={{borderTop:`0.5px solid ${GB}`,display:"flex",justifyContent:"flex-end",padding:"8px 12px"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>toggleCancel(ev.id)}
                      style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${isCancelled?R:GB}`,background:isCancelled?RL:"transparent",color:isCancelled?R:"#bbb",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {isCancelled?"↩ Rückgängig":"✕ Absagen"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredEvents.length>5&&(
            <button onClick={()=>setShowMoreEvents(p=>!p)}
              style={{padding:'12px 0',borderRadius:12,border:`0.5px solid ${GB}`,background:'#fff',color:'#555',fontSize:13,fontWeight:600,cursor:'pointer',width:'100%'}}>
              {showMoreEvents?`↑ Weniger anzeigen`:`+ ${filteredEvents.length-5} weitere anzeigen`}
            </button>
          )}
        </div>
      </div>
    );
  }

  return(
    <div>
      {/* Modal */}
      {modalOpen&&selEv&&(
        <div onClick={()=>setModalOpen(false)} style={isMobile?{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={isMobile?{position:"relative",background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"0 -4px 32px rgba(0,0,0,0.18)"}:{background:"#fff",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
            {/* Modal Header */}
            {(()=>{
              const hBg=selEv.type==="Spiel"?"#EFF6FF":selEv.subtype==="Vereinsanlass"?"linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)":selEv.type==="Veranstaltung"?`linear-gradient(135deg,${AM} 0%,#b45309 100%)`:"#F0FDF4";
                const hLight=selEv.type==="Spiel"||selEv.type==="Training";
                const hTxt=hLight?"#1a1a1a":"#fff";
                const hTxtSub=hLight?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.75)";
                const hBtn=hLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.18)";
              return(
                <div style={{background:hBg,borderRadius:"20px 20px 0 0",padding:"20px 22px",overflow:"hidden"}}>
                  {cancelledEvents[selEv.id]&&(
                    <div style={{background:hBtn,borderRadius:10,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,border:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{fontSize:16}}>⚠</span>
                      <span style={{color:hTxt,fontWeight:700,fontSize:13}}>Dieser Termin wurde abgesagt</span>
                      {isTrainer&&<button onClick={()=>toggleCancel(selEv.id)} style={{marginLeft:"auto",fontSize:11,padding:"3px 10px",borderRadius:20,border:"0.5px solid rgba(255,255,255,0.4)",background:"transparent",color:"#fff",cursor:"pointer",fontWeight:600}}>↩ Rückgängig</button>}
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <span style={{background:hBtn,color:hTxt,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:0.8,textTransform:"uppercase"}}>
                      {selEv.subtype||selEv.type}
                    </span>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
                      {isTrainer&&!isPast(selEv)&&(selEv.type==="Training"||selEv.subtype==="Team-Event")&&(
                        <button onClick={()=>toggleCancel(selEv.id)}
                          style={{display:"flex",alignItems:"center",gap:5,background:cancelledEvents[selEv.id]?hBtn:hBtn,border:"0.5px solid rgba(0,0,0,0.15)",borderRadius:20,padding:"4px 12px",cursor:"pointer",color:hTxt,fontSize:11,fontWeight:700}}>
                          {cancelledEvents[selEv.id]?"↩ Reaktivieren":"✕ Training absagen"}
                        </button>
                      )}
                      <button onClick={()=>setModalOpen(false)}
                        style={{background:hBtn,border:"none",borderRadius:"50%",width:30,height:30,color:hTxt,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  </div>
                  <div style={{color:hTxt,fontWeight:900,fontSize:22,lineHeight:1.15,marginBottom:12,letterSpacing:-0.3}}>
                    {selEv.opponent?"vs. "+selEv.opponent:selEv.type==="Training"?"Training":selEv.title||selEv.type}
                  </div>
                  {/* Info Pills */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                    <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20}}><i className="ti-calendar" style={{marginRight:3}}/> {selEv.date}{selEv.endDate?" - "+selEv.endDate:""}</span>
                    <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20}}><i className="ti-clock" style={{marginRight:3}}/> {selEv.time} Uhr</span>
                    <span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20}}><i className="ti-map-pin" style={{marginRight:3}}/> {selEv.location}</span>
                    {(()=>{const b=besammlungen[selEv.id]||{};const t=b.time||"";const o=b.location||selEv.treffpunkt||"";return (t||o)?<span style={{background:hBtn,color:hTxt,fontSize:11,padding:"4px 10px",borderRadius:20}}><i className="ti-target" style={{marginRight:3}}/> {t?t+" Uhr":""}{t&&o?" · ":""}{o}</span>:null;})()}
                  </div>
                  {/* Deadline & Erinnerung - für alle editierbaren Events */}
                  {canEditEvent(selEv)&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",paddingTop:10,borderTop:"0.5px solid rgba(0,0,0,0.1)"}}>
                      <span style={{color:hTxtSub,fontSize:10,fontWeight:700,letterSpacing:0.5}}>⏰ DEADLINE</span>
                      {editingDeadline?(
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input type="date"
                            defaultValue={(()=>{const d=deadlines[selEv.id];if(!d)return"";try{const p=d.split(",")[0].trim().replace(/^\S+\s+/,"").split(".");return `2026-${p[1]?.padStart(2,"0")}-${p[0]?.padStart(2,"0")}`;}catch(e){return "";}})()}
                            onBlur={e=>{const d=e.target.value;if(d){const[y,m,day]=d.split("-");const days=["So","Mo","Di","Mi","Do","Fr","Sa"];const wd=days[new Date(d).getDay()];const time=(deadlines[selEv.id]||"").split(",")[1]?.trim()||"18:00";setDeadlines(prev=>({...prev,[selEv.id]:`${wd} ${day}.${m}.${y}, ${time}`}));}setEditingDeadline(false);}}
                            style={{background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.2)",borderRadius:6,padding:"3px 8px",color:hTxt,fontSize:11,outline:"none",colorScheme:"dark"}} autoFocus/>
                          <input type="time"
                            defaultValue={(deadlines[selEv.id]||"").split(",")[1]?.trim()||"18:00"}
                            onBlur={e=>{const t=e.target.value;if(t){const curDate=(deadlines[selEv.id]||"").split(",")[0].trim();setDeadlines(prev=>({...prev,[selEv.id]:`${curDate}, ${t}`}));}}}
                            style={{background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.2)",borderRadius:6,padding:"3px 8px",color:hTxt,fontSize:11,outline:"none",colorScheme:"dark",width:80}}/>
                          <button onClick={()=>setEditingDeadline(false)}
                            style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:20,padding:"3px 10px",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:600}}>✓</button>
                        </div>
                      ):(
                        <span onClick={()=>setEditingDeadline(true)}
                          style={{color:hTxt,fontWeight:600,fontSize:11,cursor:"pointer",background:hBtn,padding:"3px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}>
                          {deadlines[selEv.id]||"Setzen"}{deadlines[selEv.id]?" Uhr":""}
                        </span>
                      )}
                      <button onClick={()=>setAutoReminder(prev=>({...prev,[selEv.id]:!prev[selEv.id]}))}
                        style={{display:"flex",alignItems:"center",gap:5,background:hBtn,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:20,padding:"4px 10px",cursor:"pointer",color:hTxt,fontSize:10}}>
                        <span style={{width:22,height:12,borderRadius:6,background:autoReminder[selEv.id]?(hLight?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.85)"):"rgba(0,0,0,0.15)",position:"relative",display:"inline-block",flexShrink:0}}>
                          <span style={{position:"absolute",top:2,left:autoReminder[selEv.id]?11:2,width:8,height:8,borderRadius:"50%",background:autoReminder[selEv.id]?GN:(hLight?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.4)")}}/>
                        </span>
                        <span style={{opacity:autoReminder[selEv.id]?1:0.5,color:hTxt}}>
                          {autoReminder[selEv.id]?"◬ Erinnerung":"Keine Erinnerung"}
                        </span>
                      </button>
                      {autoReminder[selEv.id]&&(
                        <select value={reminderTimes[selEv.id]||"3h"}
                          onChange={e=>setReminderTimes(prev=>({...prev,[selEv.id]:e.target.value}))}
                          style={{background:hBtn,border:"0.5px solid rgba(0,0,0,0.15)",borderRadius:20,padding:"4px 10px",color:hTxt,fontSize:10,cursor:"pointer",outline:"none"}}>
                          {REMINDER_OPTIONS.map(o=><option key={o.v} value={o.v} style={{color:BK,background:"#fff"}}>{o.l}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Beschreibung für Vereinsanlass/Team-Event */}
            {selEv.description&&(
              <div style={{padding:"14px 20px",background:"#F9FAFB",borderBottom:`0.5px solid ${GB}`,display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>ℹ️</span>
                <p style={{margin:0,fontSize:13,color:"#444",lineHeight:1.7}}>{selEv.description}</p>
              </div>
            )}
            {/* Weitere Informationen */}
            <div style={{padding:"14px 20px",borderBottom:`0.5px solid ${GB}`,background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5}}>≡ Weitere Informationen</div>
                {canEditEvent(selEv)&&(
                  <button onClick={()=>setEditingNote(v=>!v)}
                    style={{fontSize:11,fontWeight:600,color:editingNote?R:BL,background:"transparent",border:"none",cursor:"pointer",padding:"2px 6px"}}>
                    {editingNote?"Fertig ✓":"Bearbeiten"}
                  </button>
                )}
              </div>
              {/* Besammlung */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:6}}><i className="ti-target" style={{marginRight:3}}/> Treffpunkt</div>
                {editingNote&&canEditEvent(selEv)?(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Datum</div>
                        <input type="date" value={(()=>{const d=besammlungen[selEv.id]?.date||selEv.date||"";const c=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1]?.padStart(2,"0")}-${p[0]?.padStart(2,"0")}`:"";})()}
                          onChange={e=>{const v=e.target.value;if(v){const[y,m,d]=v.split("-");const days=["So","Mo","Di","Mi","Do","Fr","Sa"];const wd=days[new Date(v).getDay()];saveBesammlung(selEv.id,"date",`${wd} ${d}.${m}.`);}}}
                          style={{width:"100%",padding:"7px 8px",border:`1px solid ${GB}`,borderRadius:7,fontSize:12,boxSizing:"border-box",outline:"none"}}/>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Uhrzeit</div>
                        <input type="time" value={besammlungen[selEv.id]?.time||""}
                          onChange={e=>saveBesammlung(selEv.id,"time",e.target.value)}
                          style={{width:"100%",padding:"7px 8px",border:`1px solid ${GB}`,borderRadius:7,fontSize:12,boxSizing:"border-box",outline:"none"}}/>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Ort</div>
                      <input value={besammlungen[selEv.id]?.location||""} onChange={e=>saveBesammlung(selEv.id,"location",e.target.value)}
                        placeholder="z.B. Sportanlage Aabach, Parkplatz Bahnhof…"
                        style={{width:"100%",padding:"7px 8px",border:`1px solid ${GB}`,borderRadius:7,fontSize:12,boxSizing:"border-box",outline:"none"}}/>
                    </div>
                  </div>
                ):(()=>{
                  const b=besammlungen[selEv.id]||{};
                  const hasData=b.time||b.location||b.date;
                  return hasData?(
                    <div style={{fontSize:13,color:BK}}>
                      {b.date&&<span style={{marginRight:8}}><i className="ti-calendar" style={{marginRight:3}}/> {b.date}</span>}
                      {b.time&&<span style={{marginRight:8}}><i className="ti-clock" style={{marginRight:3}}/> {b.time} Uhr</span>}
                      {b.location&&<span><i className="ti-map-pin" style={{marginRight:3}}/> {b.location}</span>}
                    </div>
                  ):<div style={{fontSize:12,color:"#ccc",fontStyle:"italic"}}>Noch nicht gesetzt</div>;
                })()}
              </div>
              {/* Notizen */}
              <div>
                <div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:4}}><i className="ti-edit" style={{marginRight:3}}/> Bemerkungen</div>
                {editingNote&&canEditEvent(selEv)?(
                  <textarea value={trainerNotes[selEv.id]||""} onChange={e=>saveTrainerNote(selEv.id,e.target.value)}
                    placeholder="Bemerkungen, Taktik-Hinweise, Infos für Spieler und Eltern…" rows={3}
                    style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${GN}`,borderRadius:10,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6,outline:"none",color:BK}}/>
                ):trainerNotes[selEv.id]?(
                  <p style={{margin:0,fontSize:13,color:"#1a3a2a",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{trainerNotes[selEv.id]}</p>
                ):(
                  canEditEvent(selEv)&&<div style={{fontSize:12,color:"#ccc",fontStyle:"italic"}}>Noch keine Notizen.</div>
                )}
              </div>
            </div>
            {/* Zum Spielplan Link bei Spielen */}
            {selEv.type==="Spiel"&&onNavigateToSpiel&&(
              <div style={{padding:"10px 20px",background:"#EFF6FF",borderBottom:`0.5px solid #DBEAFE`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:BL,fontWeight:500}}><i className="ti-ball-football" style={{marginRight:4}}/> Dieses Spiel im Spielplan ansehen</span>
                <button onClick={()=>{const match=SCHEDULE.find(g=>g.date===selEv.date&&g.opponent===selEv.opponent);setModalOpen(false);if(match)onNavigateToSpiel(match);}}
                  style={{fontSize:11,fontWeight:700,color:BL,background:"#fff",border:`1px solid ${BL}`,borderRadius:20,padding:"3px 12px",cursor:"pointer"}}>
                  Zum Spielplan →
                </button>
              </div>
            )}
            {/* Readonly banner for trainer on Vereinsanlass with RSVP */}
            {(isTrainer||isAdmin)&&!canEditEvent(selEv)&&selEv.rsvp!==false&&(
              <div style={{padding:"8px 16px",background:"#FFF7ED",borderBottom:`0.5px solid #FED7AA`,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>
                <span>{"ℹ️"}</span>
                <span>Vereinsanlass - nur Administratoren können Anwesenheiten bearbeiten. Du siehst die Übersicht als Lesezugriff.</span>
              </div>
            )}
            {/* Stats + Spieler-Liste nur wenn RSVP aktiv und Trainer/Admin */}
            {selEv.rsvp!==false&&(isTrainer||isAdmin)&&(
            <>
            {/* Stats */}
            {(()=>{
              const c=evCounts(selEv);
              const items=[{v:c.zu,l:"Zusagen",c:GN,bg:"#ECFDF5"},{v:c.ab,l:"Absagen",c:R,bg:RL},{v:c.unent,l:"Unentschuldigt",c:AM,bg:"#FFF7ED"},{v:c.offen,l:"Ausstehend",c:"#aaa",bg:GR}];
              return(
                <div style={{display:"flex",gap:8,padding:"14px 20px",borderBottom:`0.5px solid ${GB}`,background:"#fff"}}>
                  {items.map(s=>(
                    <div key={s.l} style={{flex:1,background:s.bg,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`0.5px solid ${s.c}20`}}>
                      <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                      <div style={{fontSize:10,color:s.c,fontWeight:600,marginTop:3,opacity:0.8}}>{s.l}</div>
                    </div>
                  ))}
                  {c.aufgebot>0&&(
                    <div style={{flex:1,background:"#EEF2FF",borderRadius:10,padding:"10px 8px",textAlign:"center",border:"0.5px solid #818CF820"}}>
                      <div style={{fontSize:26,fontWeight:800,color:"#6366F1",lineHeight:1}}>{c.aufgebot}</div>
                      <div style={{fontSize:10,color:"#6366F1",fontWeight:600,marginTop:3,opacity:0.8}}>Aufgebot</div>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Spieler-Liste */}
            <div style={{padding:"0 0 4px"}}>
              <div style={{padding:"8px 20px 4px",background:GR,borderBottom:`0.5px solid ${GB}`}}>
                <div style={{display:"grid",gridTemplateColumns:`1fr auto auto${selEv.type==="Spiel"?" auto":""}`,fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:0.5,gap:"0 16px"}}>
                  <span>Spieler</span><span style={{textAlign:"center"}}>Status</span><span style={{minWidth:80,textAlign:"left"}}>Begründung</span>{selEv.type==="Spiel"&&<span style={{textAlign:"center",color:"#4F46E5"}}><i className="ti-ball-football"/></span>}
                </div>
              </div>
              {teamRoster.map((p,i)=>{
                const resp=getResp(selEv.id,p.id);
                const editingNote=showNoteFor===p.id;
                const statusColor=resp.status==="zu"?GN:resp.status==="ab"?R:resp.status==="unentschuldigt"?AM:resp.status==="fraglich"?AM:"#F3F4F6";
                return(
                  <div key={p.id} style={{display:"grid",gridTemplateColumns:`1fr auto auto${selEv.type==="Spiel"?" auto":""}`,alignItems:"center",gap:"0 16px",padding:"8px 20px",borderBottom:`0.5px solid ${GB}`,background:resp.status==="zu"?"#F9FFFB":resp.status==="ab"?"#FFF9F9":resp.status==="unentschuldigt"?"#FFF7ED":"#fff"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:4,height:28,borderRadius:2,background:statusColor,flexShrink:0}}/>
                      <Av name={p.name} size={28} bg={resp.status==="zu"?GN:resp.status==="ab"?R:resp.status==="unentschuldigt"?AM:resp.status==="fraglich"?AM:"#D1D5DB"}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{p.firstName} {p.lastName}</div>
                        {getNr(p.id)&&<div style={{fontSize:10,color:"#aaa"}}>{"#"+getNr(p.id)}</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                      {(canEditEvent(selEv)?(selEv.type==="Spiel"?["zu","ab","unentschuldigt"]:selEv.type==="Veranstaltung"?["zu","ab"]:["zu","ab","unentschuldigt"]):[]).map(s=>{
                        const cfg=STATUS_CFG[s];
                        const active=resp.status===s;
                        return(
                          <button key={s} onClick={()=>{setResp(selEv.id,p.id,s);if(s==="ab")setShowNoteFor(p.id);else setShowNoteFor(null);}}
                            title={cfg.label}
                            style={{width:s==="aufgebot"?32:26,height:s==="aufgebot"?32:26,borderRadius:"50%",border:`1.5px solid ${active?cfg.color:"#F3F4F6"}`,background:active?cfg.color:"#fff",color:active?"#fff":"#ccc",fontSize:s==="aufgebot"?13:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {cfg.icon}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{minWidth:80}}>
                      {editingNote?(
                        <textarea value={resp.note} onChange={e=>setResp(selEv.id,p.id,"ab",e.target.value)}
                          readOnly={!canEditEvent(selEv)}
                          onBlur={()=>setShowNoteFor(null)}
                          placeholder="Begründung…" rows={2} autoFocus
                          style={{width:"100%",padding:"3px 6px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:11,resize:"none",fontFamily:"inherit"}}/>
                      ):(
                        <span style={{fontSize:11,color:resp.note?"#555":"#ccc",fontStyle:resp.note?"normal":"italic"}}>{resp.note||"-"}</span>
                      )}
                    </div>
                    {selEv.type==="Spiel"&&(
                      <button onClick={()=>toggleAufgebot(selEv.id,p.id)} title="Im Aufgebot"
                        style={{width:30,height:30,borderRadius:"50%",border:`1.5px solid ${isInAufgebot(selEv.id,p.id)?"#4F46E5":"#F3F4F6"}`,background:isInAufgebot(selEv.id,p.id)?"#4F46E5":"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <i className="ti-ball-football"/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            </>
            )}
          </div>
          </div>
      )}

      {/* Ereignisliste */}

      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",flex:1,minWidth:0}}>
          {["alle","training","spiele","team-event","vereinsanlass"].map(f=>{
            const active=isFilterActive(f);
            return(
              <button key={f} onClick={()=>toggleFilter(f)}
                style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${active?"#1A1A1A":GB}`,background:active?"#1A1A1A":"transparent",color:active?"#fff":"#666",fontSize:13,fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
                {f==="alle"?"Alle":f==="training"?"Trainings":f==="spiele"?"Spiele":f==="team-event"?"Teamevents":"Vereinsanlass"}
              </button>
            );
          })}
        </div>
        <button onClick={()=>setTimeFilter(p=>p==="kommend"?"vergangen":"kommend")}
          style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",borderRadius:20,border:`1px solid ${GB}`,background:"#F5F5F3",color:"#555",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,flexBasis:"100%",transition:"all 0.15s"}}>
          <span style={{fontSize:10,opacity:0.6}}>{"▾"}</span>
          <span>{timeFilter==="kommend"?"Vergangene Termine":"Kommende Termine"}</span>
        </button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(showMoreEvents?filteredEvents:filteredEvents.slice(0,5)).map(ev=>{
          const c=evCounts(ev);
          const noRsvp=ev.subtype==="Vereinsanlass"&&ev.rsvp===false;
          const isCancelled=!!cancelledEvents[ev.id];
          const canCancel=isTrainer&&!isPast(ev)&&(ev.type==="Training"||ev.subtype==="Team-Event");
          const accentColor=ev.type==="Spiel"?BL:ev.subtype==="Vereinsanlass"?"#7C3AED":ev.type==="Veranstaltung"?AM:GN;
          const dateParts=ev.date.split(" ");
          const weekday=dateParts[0]||"";
          const dayMonth=dateParts[1]||ev.date;
          const MONTHS=["","Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          const dayNum=dayMonth.split(".")[0];
          const monNum=parseInt(dayMonth.split(".")[1])||0;
          const monName=MONTHS[monNum]||dayMonth.split(".")[1];
          const isSpiel=ev.type==="Spiel";
          const isVerein=ev.subtype==="Vereinsanlass";
          const isVeranst=ev.type==="Veranstaltung"&&!isVerein;
          const needsRichCard=isSpiel||isVerein||isVeranst;
          const headerBg=isSpiel?"#1a3a2a":isVerein?"#4C1D95":"#78350F";
          return(
            <div key={ev.id}
              style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:14,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",opacity:isCancelled?0.7:1}}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF8"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>

              {needsRichCard?(
                /* -- SPIEL / ANLASS: dunkler Header -- */
                <>
                  <div onClick={()=>openEvent(ev.id)} style={{background:headerBg,padding:"12px 14px",display:"flex",alignItems:"center",gap:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:56,paddingRight:14}}>
                      <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.6}}>{weekday}</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#fff",lineHeight:1.1}}>{dayNum}.</div>
                      <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.4}}>{monName}</div>
                    </div>
                    <div style={{width:1,alignSelf:"stretch",background:"rgba(255,255,255,0.15)",marginRight:14,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:15,color:"#fff",lineHeight:1.25,textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.opponent?"vs. "+ev.opponent:ev.title||ev.type}
                      </div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>
                        {isSpiel?(ev.home?"Heimspiel":"Auswärtsspiel"):ev.subtype||ev.type}
                        {isCancelled&&" · ⚠ Abgesagt"}
                      </div>
                    </div>
                  </div>
                  <div onClick={()=>openEvent(ev.id)} style={{display:"flex",borderBottom:`0.5px solid ${GB}`}}>
                    {[
                      {label:"Treffen",time:ev.treffpunkt?(ev.treffpunkt.match(/\d{2}:\d{2}/)||[""])[0]||"-":"-"},
                      {label:"Beginn", time:ev.time||"-"},
                      {label:"Ende",   time:ev.endTime||"-"},
                    ].map((t,i,arr)=>(
                      <div key={i} style={{flex:1,padding:"12px 8px",borderRight:i<arr.length-1?`0.5px solid ${GB}`:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:0.8}}>{t.label}</div>
                        <div style={{fontSize:19,fontWeight:700,color:"#1A1A1A",lineHeight:1}}>{t.time}</div>
                      </div>
                    ))}
                  </div>
                </>
              ):(
                /* -- TRAINING / STANDARD: schlank wie Bild 2 -- */
                <div onClick={()=>openEvent(ev.id)} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:58,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#F3F3F1",borderRadius:10,padding:"8px 6px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{weekday}</div>
                    <div style={{fontSize:19,fontWeight:700,color:"#1A1A1A",lineHeight:1}}>{dayNum}</div>
                    <div style={{fontSize:10,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{monName}</div>
                  </div>
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <div style={{fontWeight:600,fontSize:14,color:isCancelled?"#aaa":"#1A1A1A",textDecoration:isCancelled?"line-through":"none"}}>
                        {ev.type==="Training"?"Training · "+ev.team:ev.title||ev.type}
                      </div>
                      <span style={{background:accentColor+"18",color:accentColor,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,flexShrink:0}}>
                        {ev.subtype||ev.type}
                      </span>
                      {isCancelled&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:RL,color:R}}>⚠ Abgesagt</span>}
                    </div>
                    <div style={{fontSize:11,color:"#888"}}><i className="ti-clock" style={{marginRight:3}}/> {ev.time} Uhr</div>
                  </div>
                </div>
              )}

              {/* Stat-Blöcke - immer, Aufgebot nur bei Spielen */}
              {!noRsvp&&(
                <div style={{display:"flex",borderTop:`0.5px solid ${GB}`,borderBottom:`0.5px solid ${GB}`}} onClick={e=>e.stopPropagation()}>
                  {[
                    {label:"Zusagen",  value:c.zu,    color:"#16A34A"},
                    {label:"Absagen",  value:c.ab,    color:R},
                    {label:"Unentsch.",value:c.unent, color:"#D97706"},
                    {label:"Offen",    value:c.offen, color:"#999"},
                    ...(isSpiel?[{label:"Aufgebot",value:c.aufgebot,color:"#4F46E5"}]:[]),
                  ].map((s,i,arr)=>(
                    <div key={i} style={{flex:1,padding:"9px 2px",borderRight:i<arr.length-1?`0.5px solid ${GB}`:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:15,fontWeight:700,color:s.value>0?s.color:"#ddd",lineHeight:1}}>{s.value}</div>
                      <div style={{fontSize:9,color:s.value>0?s.color:"#ccc",marginTop:3,textTransform:"uppercase",letterSpacing:0.3,fontWeight:600,opacity:0.8}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* RSVP-Toggle */}
              {!isAdmin&&!noRsvp&&myId&&(()=>{
                const resp=getResp(ev.id,myId);
                const isZu=resp.status==="zu";
                const isAb=resp.status==="ab";
                const none=!isZu&&!isAb;
                return(
                  <div style={{padding:"10px 12px",background:"#fff"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",background:"#F3F3F1",borderRadius:10,padding:3,gap:2}}>
                      <button onClick={()=>setResp(ev.id,myId,isZu?null:"zu")}
                        style={{flex:1,padding:"9px 8px",border:"none",borderRadius:8,background:isZu?"#16A34A":"transparent",color:isZu?"#fff":none?"#888":"#bbb",fontSize:12,fontWeight:isZu?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <span style={{fontSize:14}}>▲</span>
                        <span>{isZu?"Zugesagt":"Zusagen"}</span>
                      </button>
                      <div style={{width:1,background:GB,flexShrink:0,margin:"4px 0"}}/>
                      <button onClick={()=>setResp(ev.id,myId,isAb?null:"ab")}
                        style={{flex:1,padding:"9px 8px",border:"none",borderRadius:8,background:isAb?"#DC2626":"transparent",color:isAb?"#fff":none?"#888":"#bbb",fontSize:12,fontWeight:isAb?700:400,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <span style={{fontSize:14}}>▽</span>
                        <span>{isAb?"Abgesagt":"Absagen"}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {filteredEvents.length>5&&(
          <button onClick={()=>setShowMoreEvents(p=>!p)}
            style={{padding:"8px 0",borderRadius:10,border:`0.5px solid ${GB}`,background:"#fff",color:"#888",fontSize:12,fontWeight:600,cursor:"pointer",width:"100%"}}>
            {showMoreEvents?`↑ Weniger anzeigen`:`+ ${filteredEvents.length-5} weitere anzeigen`}
          </button>
        )}
      </div>
    </div>
  );
}

function PollsTab({role}){
  const canCreate=role==="trainer"||role==="administrator"||role==="administration";
  const [votes,setVotes]=useState({});
  return(
    <div>
      {canCreate&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
          <Btn variant="primary" color="#F3F4F6">+ Abstimmung erstellen</Btn>
        </div>
      )}
      {!canCreate&&<InfoBox text="Spieler und Eltern können an Abstimmungen teilnehmen, aber keine erstellen." color={BL}/>}
      <div style={{marginTop:14}}>
        {POLLS.map((p,i)=>(
          <Card key={i} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:700}}>{p.title}</h3>
                <Chip text={p.target} color={BL}/>
                {" "}<Chip text={p.closed?"Geschlossen":"Offen"} color={p.closed?"#888":GN} bg={p.closed?"#f5f5f5":"#ECFDF5"}/>
              </div>
              <span style={{fontSize:12,color:"#aaa"}}>{p.votes.reduce((a,b)=>a+b,0)} Stimmen</span>
            </div>
            {p.options.map((opt,j)=>{
              const tot=p.votes.reduce((a,b)=>a+b,0);
              const pct=tot?Math.round(p.votes[j]/tot*100):0;
              const my=votes[i]===j;
              return(
                <div key={j} onClick={()=>!p.closed&&setVotes(v=>({...v,[i]:j}))} style={{marginBottom:7,cursor:p.closed?"default":"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2}}>
                    <span style={{fontWeight:my?700:400}}>{opt}{my?" ✓":""}</span>
                    <span style={{color:"#888",fontWeight:600}}>{pct}%</span>
                  </div>
                  <div style={{height:6,background:GB,borderRadius:3}}>
                    <div style={{height:"100%",width:`${pct}%`,background:my?R:BL,borderRadius:3}}/>
                  </div>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatsTab({team="Cc-Junioren"}){
  /* Generate per-team stats from ROSTER + seeded random */
  const seed=(str)=>str.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const rnd=(n,min,max)=>{let s=seed(n+team);s=((s*1664525+1013904223)&0xFFFFFFFF)>>>0;return min+Math.floor((s/0xFFFFFFFF)*(max-min+1));};
  const players=ROSTER.filter(p=>(p.teams||[]).includes(team)&&!p.role);
  const stats=players.map(p=>{
    const nm=`${p.firstName} ${p.lastName}`;
    return{name:nm,sp:rnd(nm+"sp",6,14),tore:rnd(nm+"t",0,9),assists:rnd(nm+"a",0,7),gelb:rnd(nm+"g",0,3),rot:rnd(nm+"r",0,1)};
  }).sort((a,b)=>b.tore-a.tore);
  if(stats.length===0) return <Card><div style={{textAlign:"center",color:"#aaa",padding:20}}>Keine Spielerstatistiken verfügbar.</div></Card>;
  return(
    <Card style={{padding:0,overflowX:"auto"}}>      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:GR}}>
            {["Spieler","Spiele","Tore","Assists","Gelb","Rot"].map((h,i)=>(
              <th key={i} style={{padding:"9px 13px",textAlign:i>0?"center":"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((p,i)=>(
            <tr key={i} style={{borderTop:`0.5px solid ${GB}`}}>
              <td style={{padding:"9px 13px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><Av name={p.name} size={26} bg={R}/><span style={{fontWeight:600}}>{p.name}</span></div>
              </td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.sp}</td>
              <td style={{padding:"9px 13px",textAlign:"center",fontWeight:p.tore>=5?700:400,color:p.tore>=5?R:BK}}>{p.tore}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.assists}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.gelb>0?<span style={{background:"#FCD34D",color:"#78350F",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:12}}>{p.gelb}</span>:"-"}</td>
              <td style={{padding:"9px 13px",textAlign:"center"}}>{p.rot>0?<span style={{background:R,color:"#fff",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:12}}>{p.rot}</span>:"-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ==========================================
   ADMIN-EXKLUSIVE VIEWS
========================================== */
function MembersView({role}){
  const [search,setSearch]=useState("");
  const f=MEMBERS.filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
  const canExport=role==="administrator"||role==="administration";
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Mitglieder</h1>
        {canExport&&<div style={{display:"flex",gap:8}}><Btn>Export CSV</Btn><Btn>Export Excel</Btn></div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Total" value="187" color={BL}/>
        <Stat label="Trainer" value="8" color={R}/>
        <Stat label="Junioren" value="112" color={GN}/>
        <Stat label="Datenprüfung fällig" value="12" color={AM}/>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mitglied suchen…" style={{flex:1,padding:"7px 12px",border:`0.5px solid ${GB}`,borderRadius:8,fontSize:13,outline:"none"}}/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:GR}}>
              {["Mitglied","Rolle","Team","Mitgliedtyp","Wohnort","Datenstatus"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.map((m,i)=>(
              <tr key={m.id} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                <td style={{padding:"9px 13px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Av name={m.name} size={28} bg={R}/>
                    <span style={{fontWeight:600}}>{m.name}</span>
                  </div>
                </td>
                <td style={{padding:"9px 13px"}}><Chip text={m.role} color={R}/></td>
                <td style={{padding:"9px 13px",color:"#555"}}>{m.team}</td>
                <td style={{padding:"9px 13px"}}><Chip text={m.type} color={BL} bg="#EFF6FF"/></td>
                <td style={{padding:"9px 13px",color:"#555"}}>{m.location}</td>
                <td style={{padding:"9px 13px"}}>
                  <Chip text={m.status} color={m.status==="Vollständig"?GN:m.status==="Prüfung fällig"?AM:R} bg={m.status==="Vollständig"?"#ECFDF5":m.status==="Prüfung fällig"?"#FFFBEB":RL}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function FieldVisView(){
  const fields=[
    {name:"Profilbild",       spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Name / Vorname",   spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Geburtsdatum",     spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"✓",administration:"✓",administrator:"✓"},
    {name:"Adresse",          spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"E-Mail / Telefon", spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Spielerpass",      spieler:"✓",eltern:"✓",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Nationalität",     spieler:"-", eltern:"-", trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Elternkontakte",   spieler:"-", eltern:"Eigene Kinder",trainer:"✓",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"J+S Nummer",       spieler:"-", eltern:"-", trainer:"Je nach Recht",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"AHV-Nummer",       spieler:"-", eltern:"-", trainer:"-",funktionaer:"Je nach Recht",administration:"✓",administrator:"✓"},
    {name:"Fairgate-ID/Sync", spieler:"-", eltern:"-", trainer:"-",funktionaer:"-",administration:"✓",administrator:"✓"},
  ];
  const rc=c=>{
    if(c==="✓") return{color:GN,bg:"#ECFDF5"};
    if(c==="-") return{color:"#ccc",bg:"#fafafa"};
    return{color:AM,bg:"#FFFBEB"};
  };
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 8px"}}>Feldsichtbarkeit</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Konfigurierbar pro Rolle (Kap. 6.1)</p>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead>
            <tr style={{background:GR}}>
              <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>Feld</th>
              {["Spieler","Eltern","Trainer","Funktionäre","Administration","Administrator"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f,i)=>(
              <tr key={i} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{f.name}</td>
                {["spieler","eltern","trainer","funktionaer","administration","administrator"].map((r,j)=>{
                  const v=f[r];const s=rc(v);
                  return <td key={j} style={{padding:"9px 13px",textAlign:"center"}}><Chip text={v} color={s.color} bg={s.bg}/></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SyncView(){ return <PortalverwaltungView initialTab="api"/>; }
function AuditView(){ return <PortalverwaltungView initialTab="audit"/>; }

/* ══════════════════════════════════════════════════════════════════
   PORTALVERWALTUNG — Zentrales Admin-Cockpit
   Tabs: Module & Rechte | Benutzer & Rollen | Feldsichtbarkeit |
         API-Verbindungen | Audit-Logs
   ══════════════════════════════════════════════════════════════════ */
function PortalverwaltungView({initialTab="module"}){
  const [tab,setTab]=useState(initialTab);
  const [module,setModule]=useState([]);
  const [moduleConfig,setModuleConfig]=useState({});
  const [moduleBerechtigungen,setModuleBerechtigungen]=useState({});
  const [felder,setFelder]=useState([]);
  const [apiVerbindungen,setApiVerbindungen]=useState([]);
  const [auditLogs,setAuditLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saveMsg,setSaveMsg]=useState("");
  const [expandedModul,setExpandedModul]=useState(null);
  const [benutzerListe,setBenutzerListe]=useState([]);

  const TABS=[
    {key:"module",    label:"Module & Rechte",   icon:"ti-layout-grid"},
    {key:"users",     label:"Benutzer & Rollen", icon:"ti-users"},
    {key:"feldvis",   label:"Feldsichtbarkeit",  icon:"ti-eye"},
    {key:"api",       label:"API-Verbindungen",  icon:"ti-plug"},
    {key:"audit",     label:"Audit-Logs",        icon:"ti-clipboard-list"},
  ];

  const ROLLEN=["administrator","administration","funktionaer","trainer","spieler","eltern"];
  const ROLLEN_LABELS={administrator:"Admin",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Eltern"};
  const KATEGORIEN=["kern","sport","kommunikation","betrieb","verwaltung","admin"];
  const KAT_LABELS={kern:"Kern",sport:"Sport",kommunikation:"Kommunikation",betrieb:"Betrieb",verwaltung:"Verwaltung",admin:"Systemverwaltung"};

  const API_INFOS={
    fairgate:   {description:"Mitglieder, Gruppen, Stammdaten automatisch synchronisieren",felder:["Personen & Adressen","Kontaktdaten","Elternkontakte","Teams & Gruppen","Spielerpassdaten","J+S Nummern"]},
    football_ch:{description:"Spielpläne, Resultate und Ranglisten von Football.ch importieren",felder:["Spielplan","Resultate","Ranglisten","Teaminfos"]},
    fvrz:       {description:"Spielplan und Tabelle vom FVRZ (Fussballverband Region Zürich)",felder:["Spielplan","Tabelle","Resultate","Spielernummern"]},
    clubdesk:   {description:"Mitgliederdaten und Vereinsverwaltung aus ClubDesk synchronisieren",felder:["Mitglieder","Adressen","Mitgliedschaften","Beiträge"]},
    sfa:        {description:"Spielerdaten und Lizenzen von Swiss Football Association",felder:["Spielerlizenzen","Transferdaten","Sperren"]},
  };

  useEffect(function(){
    (async function(){
      setLoading(true);
      try{
        if(supabase){
          const [modR,cfgR,bercR,feldR,apiR,audR,benuR]=await Promise.all([
            supabase.from("module").select("*").order("sort_order"),
            supabase.from("module_config").select("*"),
            supabase.from("module_berechtigungen").select("*"),
            supabase.from("feldsichtbarkeit").select("*"),
            supabase.from("api_verbindungen").select("*").order("sort_order"),
            supabase.from("api_sync_log").select("*,api_verbindungen(label)").order("gestartet_am",{ascending:false}).limit(50),
            supabase.from("benutzer").select("id,name,email,role,active").order("name"),
          ]);
          if(modR.data) setModule(modR.data);
          if(cfgR.data){const c={};cfgR.data.forEach(r=>{c[r.modul_id]=r;});setModuleConfig(c);}
          if(bercR.data){
            const b={};
            bercR.data.forEach(r=>{
              if(!b[r.modul_id]) b[r.modul_id]={};
              b[r.modul_id][r.role]=r;
            });
            setModuleBerechtigungen(b);
          }
          if(feldR.data) setFelder(feldR.data);
          if(apiR.data) setApiVerbindungen(apiR.data);
          if(audR.data) setAuditLogs(audR.data);
          if(benuR.data) setBenutzerListe(benuR.data);
        }
      }catch(e){console.warn("[FCH] Portalverwaltung laden:",e.message);}
      setLoading(false);
    })();
  },[]);

  async function toggleModulAktiv(modulId,aktiv){
    if(!supabase) return;
    await supabase.from("module_config").upsert({modul_id:modulId,active,updated_by:supabase.auth.getUser?.()?.id});
    setModuleConfig(prev=>({...prev,[modulId]:{...prev[modulId],aktiv}}));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleBerechtigung(modulId,rolle,feld,wert){
    if(!supabase) return;
    const curr=moduleBerechtigungen[modulId]?.[rolle]||{};
    const update={modul_id:modulId,rolle,...curr,[feld]:wert};
    await supabase.from("module_berechtigungen").upsert(update);
    setModuleBerechtigungen(prev=>({
      ...prev,
      [modulId]:{...prev[modulId],[rolle]:{...curr,[feld]:wert}}
    }));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function toggleFeld(feldKey,rolle,sichtbar){
    if(!supabase) return;
    await supabase.from("feldsichtbarkeit").upsert({feld_key:feldKey,role,sichtbar},{onConflict:"feld_key,role"});
    setFelder(prev=>prev.map(f=>f.feld_key===feldKey&&f.role===rolle?{...f,sichtbar}:f));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  async function updateBenutzerRolle(id,role){
    if(!supabase) return;
    await supabase.from("benutzer").update({role}).eq("id",id);
    setBenutzerListe(prev=>prev.map(b=>b.id===id?{...b,role}:b));
    setSaveMsg("Gespeichert"); setTimeout(()=>setSaveMsg(""),2000);
  }

  const moduleNachKat=KATEGORIEN.reduce(function(acc,k){
    acc[k]=module.filter(m=>m.category===k);
    return acc;
  },{});

  const felderNachKey={};
  felder.forEach(f=>{
    if(!felderNachKey[f.feld_key]) felderNachKey[f.feld_key]={label:f.feld_label||f.feld_key,rollen:{}};
    felderNachKey[f.feld_key].rolen[f.role]=f.sichtbar;
  });

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Portalverwaltung</h1>
          <div style={{fontSize:12,color:"#888",marginTop:3}}>Module, Benutzer, API-Verbindungen und Einstellungen</div>
        </div>
        {saveMsg&&<Chip text={saveMsg} color={GN} bg="#ECFDF5"/>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1px solid ${GB}`,paddingBottom:0}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
            background:"none",border:"none",borderBottom:tab===t.key?`2px solid #1A1A1A`:"2px solid transparent",
            cursor:"pointer",fontSize:13,fontWeight:tab===t.key?700:400,
            color:tab===t.key?BK:"#888",borderRadius:0,marginBottom:-1,
          }}>
            <i className={t.icon} style={{fontSize:14}}/>
            {t.label}
          </button>
        ))}
      </div>

      {loading&&<div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>Wird geladen…</div>}

      {/* ── TAB: MODULE & RECHTE ── */}
      {!loading&&tab==="module"&&(
        <div>
          <InfoBox text="Module ein/aus schaltet das Modul für den ganzen Verein. Berechtigungen steuern wer lesen, schreiben oder verwalten darf." color={BL}/>
          <div style={{height:16}}/>
          {KATEGORIEN.filter(k=>moduleNachKat[k]?.length>0).map(kat=>(
            <div key={kat} style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>{KAT_LABELS[kat]}</div>
              <Card style={{padding:0}}>
                {moduleNachKat[kat].map((m,i)=>{
                  const cfg=moduleConfig[m.id];
                  const aktiv=cfg?.active!==false;
                  const berc=moduleBerechtigungen[m.id]||{};
                  const expanded=expandedModul===m.id;
                  return(
                    <div key={m.id} style={{borderTop:i>0?`0.5px solid ${GB}`:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer"}}
                        onClick={()=>setExpandedModul(expanded?null:m.id)}>
                        <i className={m.icon||"ti-circle"} style={{fontSize:16,color:aktiv?BK:"#ccc",width:20,textAlign:"center"}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:aktiv?BK:"#aaa"}}>{m.label}</div>
                          <div style={{fontSize:11,color:"#999"}}>{m.description}</div>
                        </div>
                        {/* Toggle aktiv */}
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,color:"#888"}}>{aktiv?"Aktiv":"Inaktiv"}</span>
                          <div onClick={function(e){e.stopPropagation();toggleModulAktiv(m.id,!aktiv);}}
                            style={{width:36,height:20,borderRadius:10,background:aktiv?"#22c55e":"#d1d5db",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                            <div style={{position:"absolute",top:2,left:aktiv?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                          </div>
                          <i className={expanded?"ti-chevron-up":"ti-chevron-down"} style={{fontSize:13,color:"#888"}}/>
                        </div>
                      </div>
                      {/* Expandierte Berechtigungen */}
                      {expanded&&(
                        <div style={{background:"#fafaf8",borderTop:`0.5px solid ${GB}`,padding:"12px 16px"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Berechtigungen pro Rolle</div>
                          <div style={{overflowX:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                              <thead>
                                <tr>
                                  <th style={{textAlign:"left",padding:"4px 8px",color:"#888",fontWeight:600,fontSize:11}}>Rolle</th>
                                  <th style={{textAlign:"center",padding:"4px 8px",color:"#888",fontWeight:600,fontSize:11}}>Lesen</th>
                                  <th style={{textAlign:"center",padding:"4px 8px",color:"#888",fontWeight:600,fontSize:11}}>Schreiben</th>
                                  <th style={{textAlign:"center",padding:"4px 8px",color:"#888",fontWeight:600,fontSize:11}}>Verwalten</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ROLLEN.map(rolle=>{
                                  const b=berc[rolle]||{};
                                  const isAdmin=rolle==="administrator";
                                  return(
                                    <tr key={rolle} style={{borderTop:`0.5px solid ${GB}`}}>
                                      <td style={{padding:"6px 8px",fontWeight:600,fontSize:12}}>{ROLLEN_LABELS[rolle]}</td>
                                      {["kann_lesen","kann_schreiben","kann_verwalten"].map(feld=>{
                                        const val=isAdmin?true:(b[feld]||false);
                                        return(
                                          <td key={feld} style={{textAlign:"center",padding:"6px 8px"}}>
                                            <div onClick={isAdmin?undefined:()=>toggleBerechtigung(m.id,rolle,feld,!val)}
                                              style={{width:20,height:20,borderRadius:4,background:val?GN:"#e5e7eb",cursor:isAdmin?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",border:`1px solid ${val?"#16a34a":"#d1d5db"}`}}>
                                              {val&&<i className="ti-check" style={{fontSize:11,color:"#fff"}}/>}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: BENUTZER & ROLLEN ── */}
      {!loading&&tab==="users"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,color:"#888"}}>{benutzerListe.length} Benutzer</div>
            <Btn variant="primary" color={BK} onClick={()=>{}}>+ Benutzer einladen</Btn>
          </div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:GR}}>
                  {["Name","E-Mail","Rolle","Status","Aktion"].map((h,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benutzerListe.length===0&&(
                  <tr><td colSpan={5} style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:13}}>Keine Benutzer gefunden</td></tr>
                )}
                {benutzerListe.map((b,i)=>(
                  <tr key={b.id} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{b.name||"—"}</td>
                    <td style={{padding:"9px 13px",color:"#555",fontSize:12}}>{b.email}</td>
                    <td style={{padding:"9px 13px"}}>
                      <select value={b.role||"spieler"} onChange={e=>updateBenutzerRolle(b.id,e.target.value)}
                        style={{padding:"4px 8px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:12,background:"#fff"}}>
                        {ROLLEN.map(r=><option key={r} value={r}>{ROLLEN_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      <Chip text={b.active?"Aktiv":"Inaktiv"} color={b.active?GN:R} bg={b.active?"#ECFDF5":RL}/>
                    </td>
                    <td style={{padding:"9px 13px"}}>
                      <button style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,padding:"2px 6px"}}>
                        <i className="ti-edit" style={{fontSize:14}}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
      {!loading&&tab==="feldvis"&&(
        <div>
          <InfoBox text="Steuert welche Mitglieder-Felder pro Rolle sichtbar sind. Änderungen wirken sofort." color={BL}/>
          <div style={{height:12}}/>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
              <thead>
                <tr style={{background:GR}}>
                  <th style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>Feld</th>
                  {ROLLEN.map((r,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"center",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{ROLLEN_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(felderNachKey).map(([key,data],i)=>(
                  <tr key={key} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{data.label}</td>
                    {ROLLEN.map(rolle=>{
                      const sichtbar=data.rolen[rolle]||false;
                      const isAdmin=rolle==="administrator";
                      return(
                        <td key={rolle} style={{padding:"9px 13px",textAlign:"center"}}>
                          <div onClick={isAdmin?undefined:()=>toggleFeld(key,rolle,!sichtbar)}
                            style={{width:20,height:20,borderRadius:4,background:sichtbar?GN:"#e5e7eb",cursor:isAdmin?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",border:`1px solid ${sichtbar?"#16a34a":"#d1d5db"}`}}>
                            {sichtbar&&<i className="ti-check" style={{fontSize:11,color:"#fff"}}/>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Object.keys(felderNachKey).length===0&&(
                  <tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"#aaa",fontSize:13}}>
                    Noch keine Felder konfiguriert — SQL-Schema importieren
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── TAB: API-VERBINDUNGEN ── */}
      {!loading&&tab==="api"&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
          <div style={{height:16}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {(apiVerbindungen.length>0?apiVerbindungen:Object.entries(API_INFOS).map(([key,info])=>({key,label:key,active:false,konfiguriert:false,sync_status:"deaktiviert",...info}))).map(api=>{
              const info=API_INFOS[api.key]||{};
              const statusColor=api.sync_status==="ok"?GN:api.sync_status==="fehler"?R:api.sync_status==="ausstehend"?AM:"#aaa";
              const statusBg=api.sync_status==="ok"?"#ECFDF5":api.sync_status==="fehler"?RL:api.sync_status==="ausstehend"?"#FFFBEB":"#f5f5f3";
              return(
                <Card key={api.key}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <i className="ti-plug" style={{fontSize:18,color:api.active?BK:"#ccc"}}/>
                      <span style={{fontWeight:700,fontSize:14}}>{api.label||api.key}</span>
                    </div>
                    <Chip text={api.sync_status||"deaktiviert"} color={statusColor} bg={statusBg}/>
                  </div>
                  <p style={{fontSize:12,color:"#666",margin:"0 0 10px",lineHeight:1.5}}>{info.description||"Externe API-Verbindung"}</p>
                  {info.felder&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:4}}>Synchronisierte Daten:</div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#555",padding:"2px 0"}}>
                          <i className="ti-check" style={{fontSize:11,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {api.letzter_sync&&(
                    <div style={{fontSize:11,color:"#888",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    {api.active&&<Btn sm variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    <Btn sm variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT-LOGS ── */}
      {!loading&&tab==="audit"&&(
        <div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:GR}}>
                  {["Zeit","API / System","Status","Neu","Aktualisiert","Fehler","Details"].map((h,i)=>(
                    <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.length===0&&(
                  <tr><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:13}}>Noch keine Sync-Logs vorhanden</td></tr>
                )}
                {auditLogs.map((log,i)=>(
                  <tr key={log.id} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                    <td style={{padding:"9px 13px",color:"#888",whiteSpace:"nowrap",fontSize:12}}>
                      {log.gestartet_am?new Date(log.gestartet_am).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"}):"—"}
                    </td>
                    <td style={{padding:"9px 13px",fontWeight:600}}>{log.api_verbindungen?.label||"System"}</td>
                    <td style={{padding:"9px 13px"}}><Chip text={log.status||"—"} color={log.status==="ok"?GN:log.status==="fehler"?R:AM} bg={log.status==="ok"?"#ECFDF5":log.status==="fehler"?RL:"#FFFBEB"}/></td>
                    <td style={{padding:"9px 13px",color:GN,fontWeight:600}}>{log.datensaetze_neu||0}</td>
                    <td style={{padding:"9px 13px",color:BL,fontWeight:600}}>{log.datensaetze_aktualisiert||0}</td>
                    <td style={{padding:"9px 13px",color:log.datensaetze_fehler>0?R:"#aaa",fontWeight:600}}>{log.datensaetze_fehler||0}</td>
                    <td style={{padding:"9px 13px",color:"#555",fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.meldung||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProfileView({role,myRosterId,account}){
  const isEltern=role==="eltern";
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const name=isEltern?(account?.name||"Anna Meier"):(player?`${player.firstName} ${player.lastName}`:"Luca Meier");
  const kinder=account?.kinder||[];
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>{isEltern?"Profil / Daten prüfen":"Mein Profil"}</h1>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card>
          <STitle>Persönliche Daten</STitle>
          {[
            {l:"Name",v:name},
            {l:"Geburtsdatum",v:player?.dob||"-"},
            {l:"Adresse",v:player?.address||"-"},
            {l:"E-Mail",v:player?.email||"-"},
            {l:"Telefon",v:player?.tel||"-"},
          ].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<4?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:12,color:"#888"}}>{x.l}</span>
              <span style={{fontSize:13,fontWeight:500}}>{x.v}</span>
            </div>
          ))}
          <div style={{marginTop:12}}><Btn variant="primary" color="#F3F4F6">Daten aktualisieren</Btn></div>
        </Card>
        {isEltern&&kinder.map((kind,ki)=>{
          const kindPlayer=ROSTER.find(p=>p.name===kind.name||p.id===kind.rosterId);
          const kp=kindPlayer||{};
          const rows=[
            {l:"Name",              v:`${kp.firstName||""} ${kp.lastName||""}`.trim()||kind.name,     ok:!!(kp.firstName&&kp.lastName)},
            {l:"Team",              v:kind.team,                                                        ok:true},
            {l:"Geburtsdatum",      v:kp.dob||"-",                                                     ok:!!kp.dob},
            {l:"Nationalität",      v:kp.nat||"-",                                                     ok:!!kp.nat},
            {l:"AHV-Nummer",        v:kp.ahv||"-",                                                     ok:!!kp.ahv},
            {l:"Spielerpass",       v:kp.pass||"-",                                                    ok:!!kp.pass},
            {l:"Strasse",           v:kp.street||"-",                                                  ok:!!kp.street},
            {l:"PLZ / Ort",         v:kp.plz&&kp.city?`${kp.plz} ${kp.city}`:"-",                   ok:!!(kp.plz&&kp.city)},
            {l:"E-Mail",            v:kp.email||"-",                                                   ok:!!kp.email},
            {l:"Telefon",           v:kp.tel||"-",                                                     ok:!!kp.tel},
            {l:"Elternteil 1",      v:kp.p1First?`${kp.p1First} ${kp.p1Last}`:"-",                  ok:!!(kp.p1First&&kp.p1Last)},
            {l:"E-Mail Elternteil 1",v:kp.p1Email||"-",                                               ok:!!kp.p1Email},
            {l:"Tel. Elternteil 1", v:kp.p1Tel||"-",                                                  ok:!!kp.p1Tel},
            {l:"Elternteil 2",      v:kp.p2First?`${kp.p2First} ${kp.p2Last}`:"-",                  ok:!!(kp.p2First&&kp.p2Last)},
            {l:"E-Mail Elternteil 2",v:kp.p2Email||"-",                                               ok:!!kp.p2Email},
            {l:"Tel. Elternteil 2", v:kp.p2Tel||"-",                                                  ok:!!kp.p2Tel},
          ];
          const allOk=rows.every(r=>r.ok);
          return(
            <Card key={ki}>
              <STitle action={<Chip text={allOk?"✓ Vollständig":"Prüfung fällig"} color={allOk?GN:AM} bg={allOk?"#ECFDF5":"#FFFBEB"}/>}>
                {kind.name.split(" ")[0]} - Daten prüfen
              </STitle>
              {!allOk&&<InfoBox text="Halbjährliche Datenprüfung fällig. Bitte alle Felder bestätigen oder korrigieren." color={AM}/>}
              <div style={{marginTop:8}}>
                {rows.map((x,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<rows.length-1?`0.5px solid ${GB}`:"none"}}>
                    <div style={{minWidth:140}}>
                      <div style={{fontSize:11,color:"#888"}}>{x.l}</div>
                      <div style={{fontSize:12,fontWeight:500,color:BK,marginTop:1,wordBreak:"break-all"}}>{x.v}</div>
                    </div>
                    <Chip text={x.ok?"✓ OK":"Prüfen"} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14}}><Btn variant="primary" color={GN}>Daten bestätigen</Btn></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* -- Geteilte Views -- */
function EventsList({teamOnly,role}){
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isTrainer=role==="trainer";
  const canCreate=isTrainer||isAdmin;
  const [showForm,setShowForm]=useState(false);
  const [newEvent,setNewEvent]=useState({title:"",type:isTrainer?"Team-Event":"Team-Event",date:"",time:"",loc:"",rsvp:true});

  /* Trainer sieht nur Team-Events bei teamOnly */
  const list=teamOnly?EVENTS.filter(e=>e.type==="Team-Event"):isTrainer?EVENTS:EVENTS;

  const typeOptions=isTrainer?["Team-Event"]:["Team-Event","Vereinsanlass"];

  return(
    <div>
      {!teamOnly&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Termine</h1>
          {canCreate&&<Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(v=>!v)}>{"+ "+( isTrainer?"Team-Event erstellen":"Anlass erstellen")}</Btn>}
        </div>
      )}
      {isTrainer&&!teamOnly&&(
        <InfoBox text="Als Trainer kannst du Team-Events erstellen. Vereinsanlässe werden durch Administration oder Vorstand eröffnet." color={BL}/>
      )}

      {/* Erstellungsformular */}
      {showForm&&canCreate&&(
        <div style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:12,padding:"16px 18px",marginBottom:16,marginTop:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{"Neuer "+(isTrainer?"Team-Event":"Anlass")}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Titel</div>
              <input value={newEvent.title} onChange={e=>setNewEvent(p=>({...p,title:e.target.value}))}
                placeholder="Titel des Anlasses" style={{width:"100%",padding:"6px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Typ</div>
              <select value={newEvent.type} onChange={e=>setNewEvent(p=>({...p,type:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}>
                {typeOptions.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Datum</div>
              <input type="date" value={newEvent.date} onChange={e=>setNewEvent(p=>({...p,date:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Uhrzeit</div>
              <input type="time" value={newEvent.time} onChange={e=>setNewEvent(p=>({...p,time:e.target.value}))}
                style={{width:"100%",padding:"6px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Ort</div>
              <input value={newEvent.loc} onChange={e=>setNewEvent(p=>({...p,loc:e.target.value}))}
                placeholder="Vereinslokal, Mehrzweckhalle…" style={{width:"100%",padding:"6px 10px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13,boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <input type="checkbox" id="rsvp-chk" checked={newEvent.rsvp} onChange={e=>setNewEvent(p=>({...p,rsvp:e.target.checked}))} style={{cursor:"pointer"}}/>
            <label htmlFor="rsvp-chk" style={{fontSize:13,cursor:"pointer"}}>Rückmeldung erforderlich</label>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="primary" color="#F3F4F6">Erstellen</Btn>
            <Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:teamOnly?0:14}}>
        {list.map((e,i)=>{
          const accentColor=e.type==="Team-Event"?BL:e.type==="Vereinsanlass"?"#7C3AED":R;
          return(
            <div key={i} style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:12,overflow:"hidden",display:"flex",marginBottom:10}}>
              {/* Left accent bar */}
              <div style={{width:4,background:accentColor,flexShrink:0}}/>
              {/* Content */}
              <div style={{flex:1,padding:"14px 16px",minWidth:0}}>
                {/* Type + RSVP badge row */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                  <span style={{background:accentColor+"18",color:accentColor,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:`0.5px solid ${accentColor}30`}}>
                    {e.type}
                  </span>
                  {e.rsvp&&(
                    <span style={{fontSize:10,fontWeight:600,color:AM,background:"#F9FAFB",border:"0.5px solid #FDE68A",padding:"2px 8px",borderRadius:20}}>
                      {"Rückmeldung erforderlich"}
                    </span>
                  )}
                  {e.rsvp&&e.res&&(
                    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:GN,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:GN,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{"✓"}</span>
                        {e.res.y}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:R,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:R,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{"✕"}</span>
                        {e.res.n}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:AM,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:"#FEF3C7",border:`1.5px solid ${AM}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,color:AM,fontWeight:800}}>{"?"}</span>
                        {e.res.o}
                      </span>
                    </div>
                  )}
                </div>
                {/* Title */}
                <div style={{fontWeight:700,fontSize:15,color:BK,marginBottom:7}}>{e.title}</div>
                {/* Meta */}
                <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",fontSize:12,color:"#666"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><i className="ti-calendar"/></span>{e.date}{e.endDate?" - "+e.endDate:""}
                  </span>
                  <span style={{color:"#ddd",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><i className="ti-clock"/></span>{e.time+" Uhr"}
                  </span>
                  <span style={{color:"#ddd",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><i className="ti-map-pin"/></span>{e.loc}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -- Helfereinsätze: helfereinsatz.ch-Style -- */

function getHelperName(role,account){
  if(account?.name) return account.name;
  if(role==="spieler") return "Luca Meier";
  if(role==="eltern")  return "Anna Meier";
  if(role==="trainer") return "Thomas Müller";
  return "Sandra Berger";
}

/* Alle möglichen Übergabe-Empfänger (alle Helfer ausser dem aktuellen) */
const ALLE_HELFER_NAMEN = HELPERS.map(h=>h.name);

function BemerkungEdit({notes,onSave}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(notes||"");
  if(editing) return(
    <div style={{display:"flex",gap:4,marginTop:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Bemerkung…"
        style={{padding:"2px 7px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:10,outline:"none",width:130}}
        onKeyDown={e=>{if(e.key==="Enter"){onSave(draft);setEditing(false);}if(e.key==="Escape")setEditing(false);}}/>
      <button onClick={()=>{onSave(draft);setEditing(false);}} style={{padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:600,border:`0.5px solid ${GN}`,background:"#F0FDF4",color:GN,cursor:"pointer"}}>✓</button>
      <button onClick={()=>setEditing(false)} style={{padding:"1px 6px",borderRadius:6,fontSize:10,border:`0.5px solid ${GB}`,background:"#fff",color:"#888",cursor:"pointer"}}>✕</button>
    </div>
  );
  return <button onClick={e=>{e.stopPropagation();setEditing(true);setDraft(notes||"");}} style={{marginTop:3,fontSize:9,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}><i className="ti-edit" style={{marginRight:3}}/> Bemerkung</button>;
}

function SchichtKarte({schicht,einsatz,meinName,canEdit,canFreigeben,canZuteilen,teamMitglieder,schichtenState,onEintragen,onFreigeben,onÜbertragen,freigabeAnfragen,notes,onSaveBemerkung}){
  const helfer=schichtenState[schicht.id]??schicht.helfer;
  const filled=helfer.length, max=schicht.max;
  const pct=Math.round(filled/max*100);
  const voll=filled>=max;
  const ichDrin=helfer.includes(meinName);
  const anfrageData=(freigabeAnfragen||{})[schicht.id];
  const anfragePending=anfrageData?.name===meinName;

  const [showTransfer,setShowTransfer]=useState(false);
  const [transferTarget,setTransferTarget]=useState("");
  const [showAnfrageForm,setShowAnfrageForm]=useState(false);
  const [anfrageBegruendung,setAnfrageBegruendung]=useState("");
  const [showAnfrageOk,setShowAnfrageOk]=useState(false);
  const [showZuteilen,setShowZuteilen]=useState(false);
  const [zuteilTarget,setZuteilTarget]=useState("");
  const [zuteilSearch,setZuteilSearch]=useState("");
  const [showHelfer,setShowHelfer]=useState(false);

  let sc=GN,sb="#ECFDF5",st=`${filled}/${max} belegt`;
  if(voll){sc="#888";sb="#f5f5f5";st="Besetzt";}
  else if(filled===0){sc=R;sb=RL;st="Offen";}
  else{sc=AM;sb="#FFFBEB";}

  const handleÜbertragen=()=>{
    if(!transferTarget) return;
    onÜbertragen(schicht.id, meinName, transferTarget);
    setShowTransfer(false);
    setTransferTarget("");
  };

  const handleAnfrageSenden=()=>{
    if(!anfrageBegruendung.trim()) return;
    onFreigeben(schicht.id, meinName, anfrageBegruendung.trim());
    setShowAnfrageForm(false);
    setAnfrageBegruendung("");
    setShowAnfrageOk(true);
    setTimeout(()=>setShowAnfrageOk(false), 3000);
  };

  const handleZuteilen=()=>{
    if(!zuteilTarget) return;
    onEintragen(schicht.id,zuteilTarget);
    setShowZuteilen(false);
    setZuteilTarget("");
    setZuteilSearch("");
  };

  const zuteilKandidaten=(teamMitglieder||[]).filter(n=>!helfer.includes(n));

  const statusColor=anfragePending?AM:voll?GN:filled>0?AM:R;
  const statusBg=anfragePending?"#FFFBEB":voll?"#ECFDF5":filled>0?"#FFFBEB":"#FEF2F2";
  const statusText=anfragePending?"⏳ Angefragt":`${filled}/${max}`;

  return(
    <div style={{border:`1px solid ${ichDrin?GN+"60":anfragePending?AM+"60":voll?"#e5e7eb":"#e5e7eb"}`,borderRadius:12,overflow:"hidden",background:ichDrin?"#F0FDF4":anfragePending?"#FFFBEB":voll?"#FAFAF8":"#fff"}}>
      {/* Colored top strip */}
      <div style={{height:3,background:voll?GN:filled>0?AM:R}}/>
      <div style={{padding:"14px 16px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,marginBottom:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,color:BK,lineHeight:1.2}}>{schicht.label}</div>
            <div style={{fontSize:10,color:"#888",marginTop:3,display:"flex",alignItems:"center",gap:3}}>
              <span><i className="ti-map-pin"/></span><span>{einsatz.location}</span>
            </div>
            {notes&&<div style={{fontSize:10,color:AM,marginTop:3,fontStyle:"italic"}}><i className="ti-edit" style={{marginRight:3}}/> {notes}</div>}
            {canEdit&&onSaveBemerkung&&<BemerkungEdit notes={notes} onSave={onSaveBemerkung}/>}
          </div>
          <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:statusBg,color:statusColor,flexShrink:0,whiteSpace:"nowrap"}}>
            {statusText}
          </span>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{height:6,background:"#F3F4F6",borderRadius:3,marginBottom:10}}>
          <div style={{height:"100%",width:`${pct}%`,background:voll?GN:filled>0?AM:R,borderRadius:3}}/>
        </div>

        {/* Plätze Zähler */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:ichDrin||!voll?10:0}}>
          <button onClick={()=>setShowHelfer(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:0,fontSize:11,color:"#6B7280"}}>
            <span style={{fontSize:8,display:"inline-block",transform:showHelfer?"rotate(90deg)":"none"}}>▶</span>
            <span><strong style={{color:BK}}>{filled}</strong> / {max} belegt</span>
          </button>
          {ichDrin&&<span style={{fontSize:10,color:GN,fontWeight:700}}>Du dabei ✓</span>}
        </div>

        {showHelfer&&(
          <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:3}}>
            {helfer.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:h===meinName?"#DCFCE7":"#F3F4F6",borderRadius:7,padding:"4px 8px"}}>
                <Av name={h} size={16} bg={h===meinName?GN:"#9CA3AF"}/>
                <span style={{fontSize:11,fontWeight:h===meinName?700:500,color:h===meinName?GN:"#374151",flex:1}}>{h}</span>
                {h===meinName&&<span style={{fontSize:9,color:GN}}>Du</span>}
              </div>
            ))}
            {Array.from({length:max-filled},(_,i)=>(
              <div key={`f${i}`} style={{display:"flex",alignItems:"center",gap:6,background:"#FAFAFA",border:"1px dashed #D1D5DB",borderRadius:7,padding:"4px 8px"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#E5E7EB",flexShrink:0}}/>
                <span style={{fontSize:11,color:"#9CA3AF"}}>Freier Platz</span>
              </div>
            ))}
          </div>
        )}

      {/* Aktionsbereich */}
      {ichDrin?(
        <div>
          {/* Haupt-Buttons (solange kein Formular offen und keine Anfrage pending) */}
          {!showTransfer&&!showAnfrageForm&&!anfragePending&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button onClick={()=>setShowTransfer(true)} style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:`0.5px solid #0891B2`,background:"#ECFEFF",color:"#0891B2"}}>
                ⇄ Übertragen
              </button>
              <button onClick={()=>setShowAnfrageForm(true)} style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:`0.5px solid ${AM}`,background:"#FFFBEB",color:AM}}>
                ↩ Freigabe anfragen
              </button>
            </div>
          )}

          {/* Bestätigung nach Absenden */}
          {showAnfrageOk&&(
            <div style={{fontSize:11,color:GN,fontWeight:600,padding:"3px 0"}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>
          )}

          {/* Ausstehende Anfrage */}
          {anfragePending&&!showAnfrageOk&&(
            <div style={{background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontSize:11,color:AM,fontWeight:700,marginBottom:3}}>⏳ Freigabe ausstehend</div>
              <div style={{fontSize:11,color:"#666"}}>Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
          )}

          {/* Freigabe-Anfrage Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"10px 12px",background:"#F9FAFB",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={anfrageBegruendung}
                onChange={e=>setAnfrageBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:12,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:"inherit"}}
              />
              <div style={{display:"flex",gap:5}}>
                <button
                  onClick={handleAnfrageSenden}
                  disabled={!anfrageBegruendung.trim()}
                  style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:600,cursor:anfrageBegruendung.trim()?"pointer":"default",border:"none",background:anfrageBegruendung.trim()?AM:"#ccc",color:"#fff"}}>
                  Anfrage senden
                </button>
                <button onClick={()=>{setShowAnfrageForm(false);setAnfrageBegruendung("");}} style={{padding:"4px 11px",borderRadius:6,fontSize:11,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:"#888"}}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"#ECFEFF",border:`0.5px solid #0891B2`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:600,color:"#0891B2",marginBottom:6}}>Schicht an wen übertragen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa",pointerEvents:"none"}}><i className="ti-search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setTransferTarget("");}}
                  placeholder="Person suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?"#0891B2":GB}`,borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<button onClick={()=>{setZuteilSearch("");setTransferTarget("");}} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",lineHeight:1}}>×</button>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const kandidaten=ALLE_HELFER_NAMEN.filter(n=>n!==meinName&&!helfer.includes(n));
                const gefiltert=kandidaten.filter(n=>!zuteilSearch||n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:11,color:"#aaa",padding:"4px 0",marginBottom:7}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:3,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const h=HELPERS.find(m=>m.name===n);
                      const info=h?.gruppe||h?.role||"";
                      const selected=transferTarget===n;
                      return(
                        <button key={n} onClick={()=>setTransferTarget(selected?"":n)}
                          style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:6,border:`0.5px solid ${selected?"#0891B2":GB}`,background:selected?"#ECFEFF":"#fff",cursor:"pointer",textAlign:"left"}}>
                          <Av name={n} size={20} bg={selected?"#0891B2":"#9CA3AF"}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:selected?700:400,color:selected?"#0891B2":"#374151"}}>{n}</div>
                            {info&&<div style={{fontSize:10,color:"#aaa"}}>{info}</div>}
                          </div>
                          {selected&&<span style={{fontSize:11,color:"#0891B2",flexShrink:0}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:5}}>
                <button onClick={handleÜbertragen} disabled={!transferTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:600,cursor:transferTarget?"pointer":"default",border:"none",background:transferTarget?"#0891B2":"#ccc",color:"#fff"}}>Übertragen</button>
                <button onClick={()=>{setShowTransfer(false);setTransferTarget("");}} style={{padding:"4px 11px",borderRadius:6,fontSize:11,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:"#888"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      ):!voll?(
        <div>
          {/* Trainer: Zuteilungs-Dropdown */}
          {canZuteilen&&!showZuteilen&&(
            <button onClick={()=>setShowZuteilen(true)} style={{padding:"4px 11px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"#F3F4F6",color:"#374151"}}>
              + Zuteilen
            </button>
          )}
          {/* Standard Eintragen für alle anderen */}
          {!canZuteilen&&(
            <button onClick={()=>onEintragen(schicht.id,meinName)} style={{padding:"4px 11px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"#F3F4F6",color:"#374151"}}>
              ✓ Eintragen
            </button>
          )}
          {/* Zuteilungs-Formular */}
          {canZuteilen&&showZuteilen&&(
            <div style={{padding:"9px 11px",background:"#fff",border:`0.5px solid ${GN}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:600,color:GN,marginBottom:6}}>Wen zuteilen?</div>
              {/* Suchfeld */}
              <div style={{position:"relative",marginBottom:6}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa",pointerEvents:"none"}}><i className="ti-search"/></span>
                <input
                  value={zuteilSearch}
                  onChange={e=>{setZuteilSearch(e.target.value);setZuteilTarget("");}}
                  placeholder="Name suchen…"
                  style={{width:"100%",padding:"5px 8px 5px 26px",border:`0.5px solid ${zuteilSearch?GN:GB}`,borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box"}}
                />
                {zuteilSearch&&<button onClick={()=>{setZuteilSearch("");setZuteilTarget("");}} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",lineHeight:1}}>×</button>}
              </div>
              {/* Gefilterte Liste */}
              {(()=>{
                const gefiltert=zuteilKandidaten.filter(n=>n.toLowerCase().includes(zuteilSearch.toLowerCase()));
                if(gefiltert.length===0) return <div style={{fontSize:11,color:"#aaa",padding:"4px 0"}}>Keine Treffer.</div>;
                return(
                  <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:3,marginBottom:7}}>
                    {gefiltert.map(n=>{
                      const gruppe=HELPERS.find(m=>m.name===n)?.gruppe||"";
                      const selected=zuteilTarget===n;
                      return(
                        <button key={n} onClick={()=>setZuteilTarget(selected?"":n)} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:6,border:`0.5px solid ${selected?GN:GB}`,background:selected?GN+"18":"#fff",cursor:"pointer",textAlign:"left",width:"100%"}}>
                          <Av name={n} size={20} bg={selected?GN:"#bbb"}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:selected?700:400,color:selected?GN:BK}}>
                              {n}{n===meinName&&<span style={{fontSize:10,color:GN,marginLeft:5}}>(ich)</span>}
                            </div>
                            {gruppe&&<div style={{fontSize:10,color:"#aaa",marginTop:1}}>{gruppe}</div>}
                          </div>
                          {selected&&<span style={{fontSize:11,color:GN,flexShrink:0}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:5}}>
                <button onClick={handleZuteilen} disabled={!zuteilTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:600,cursor:zuteilTarget?"pointer":"default",border:"none",background:zuteilTarget?GN:"#ccc",color:"#fff"}}>Zuteilen</button>
                <button onClick={()=>{setShowZuteilen(false);setZuteilTarget("");setZuteilSearch("");}} style={{padding:"4px 11px",borderRadius:6,fontSize:11,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:"#888"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      ):(
        <div style={{marginTop:10}}>
          <button disabled style={{padding:"4px 11px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"default",border:`0.5px solid ${GB}`,background:"#F3F4F6",color:"#9CA3AF"}}>Besetzt</button>
        </div>
      )}

      {/* Funktionär/Admin: Freigabe-Anfrage mit Begründung bestätigen */}
      {canFreigeben&&anfragePending&&(
        <div style={{marginTop:8,padding:"9px 12px",background:AM+"12",border:`0.5px solid ${AM}`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{fontSize:11,color:AM,fontWeight:700,marginBottom:2}}>Freigabe-Anfrage von {anfrageData?.name}</div>
              <div style={{fontSize:11,color:"#666"}}>Begründung: <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em></div>
            </div>
            <button onClick={()=>onFreigeben(schicht.id,null)} style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:AM,color:"#fff",flexShrink:0}}>Freigeben ✓</button>
          </div>
        </div>
      )}
      {/* Admin/Funktionär: jemanden direkt austragen */}
      {canFreigeben&&!ichDrin&&helfer.length>0&&(
        <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
          {helfer.map((h,i)=>(
            <button key={i} onClick={()=>onFreigeben(schicht.id,h)} style={{padding:"2px 8px",borderRadius:6,fontSize:10,cursor:"pointer",border:`0.5px solid ${R}`,background:"#fff",color:R}}>
              {h} ✕
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/* Einzelne Schicht-Zeile im "Mein Einsatz"-Tab - mit eigenem Freigabe-Formular */
function MeinSchichtEintrag({schicht,anfragePending,anfrageData,meinName,onÜbertragen,onFreigeben}){
  const [showAnfrageForm,setShowAnfrageForm]=useState(false);
  const [begruendung,setBegruendung]=useState("");
  const [showTransfer,setShowTransfer]=useState(false);
  const [transferTarget,setTransferTarget]=useState("");
  const [sent,setSent]=useState(false);

  const handleSenden=()=>{
    if(!begruendung.trim()) return;
    onFreigeben(schicht.id,meinName,begruendung.trim());
    setShowAnfrageForm(false);
    setBegruendung("");
    setSent(true);
    setTimeout(()=>setSent(false),3000);
  };

  const handleÜbertragen=()=>{
    if(!transferTarget.trim()) return;
    onÜbertragen(schicht.id,meinName,transferTarget.trim());
    setShowTransfer(false);
    setTransferTarget("");
  };

  return(
    <div style={{background:"#fff",border:`${anfragePending?"1.5px":"0.5px"} solid ${anfragePending?"#F59E0B":GB}`,borderRadius:10,overflow:"hidden",borderTop:`4px solid ${schicht.eventColor||AM}`}}>
      {/* Event-Label */}
      <div style={{padding:"14px 18px",background:"#fff",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:BK,letterSpacing:-0.2}}>{schicht.eventName}</div>
          <div style={{fontSize:12,color:"#888",marginTop:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span>{schicht.einsatzName}</span>
            {schicht.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzDate}</span></>}
            {schicht.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+schicht.einsatzOrt}</span></>}
          </div>
        </div>
        <div style={{flexShrink:0}}>
          {anfragePending
            ?<Chip text="⏳ Freigabe ausstehend" color={AM} bg="#FFFBEB"/>
            :<Chip text="Geplant ⏳" color={AM} bg="#FFFBEB"/>
          }
        </div>
      </div>
      <div style={{padding:"10px 14px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:13}}>{schicht.label}</div>
        </div>
      </div>

      {/* Bestätigung nach Absenden */}
      {sent&&<div style={{fontSize:11,color:GN,fontWeight:600,marginBottom:6}}>✓ Anfrage gesendet - wird von Funktionär/Admin geprüft.</div>}

      {/* Ausstehende Anfrage: Begründung anzeigen */}
      {anfragePending&&(
        <div style={{fontSize:11,color:AM,background:"#FFFBEB",borderRadius:6,padding:"6px 9px",border:`0.5px solid ${AM}40`}}>
          <span style={{fontWeight:700}}>Begründung:</span> <em>{"\"" + (anfrageData?.begruendung||"") + "\""}</em><br/>
          <span style={{color:"#888",marginTop:3,display:"block"}}>Wartet auf Freigabe durch Funktionär/Admin.</span>
        </div>
      )}

      {/* Aktionen (nur wenn keine Anfrage pending) */}
      {!anfragePending&&!sent&&(
        <div>
          {!showAnfrageForm&&!showTransfer&&(
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowTransfer(true)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",border:`0.5px solid #0891B2`,background:"#ECFEFF",color:"#0891B2"}}>
                ⇄ Übertragen
              </button>
              <button onClick={()=>setShowAnfrageForm(true)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",border:`0.5px solid ${AM}`,background:"#FFFBEB",color:AM}}>
                ↩ Freigabe anfragen
              </button>
            </div>
          )}

          {/* Freigabe-Formular */}
          {showAnfrageForm&&(
            <div style={{padding:"9px 11px",background:"#FFFBEB",border:`0.5px solid ${AM}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:AM,marginBottom:6}}>Grund für die Freigabe-Anfrage</div>
              <textarea
                value={begruendung}
                onChange={e=>setBegruendung(e.target.value)}
                placeholder="z.B. Terminkonflikt, Krankheit, familiärer Grund …"
                rows={3}
                style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:12,resize:"vertical",boxSizing:"border-box",marginBottom:7,fontFamily:"inherit"}}
              />
              <div style={{display:"flex",gap:5}}>
                <button onClick={handleSenden} disabled={!begruendung.trim()} style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:600,cursor:begruendung.trim()?"pointer":"default",border:"none",background:begruendung.trim()?AM:"#ccc",color:"#fff"}}>
                  Anfrage senden
                </button>
                <button onClick={()=>{setShowAnfrageForm(false);setBegruendung("");}} style={{padding:"4px 11px",borderRadius:6,fontSize:11,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:"#888"}}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Übertragung-Formular */}
          {showTransfer&&(
            <div style={{padding:"9px 11px",background:"#EFF6FF",border:`0.5px solid ${BL}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:600,color:BL,marginBottom:6}}>Schicht übertragen an:</div>
              <select value={transferTarget} onChange={e=>setTransferTarget(e.target.value)} style={{width:"100%",padding:"5px 8px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:12,marginBottom:7}}>
                <option value="">- Person auswählen -</option>
                {ALLE_HELFER_NAMEN.filter(n=>n!==meinName).map(n=>(
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <div style={{display:"flex",gap:5}}>
                <button onClick={handleÜbertragen} disabled={!transferTarget} style={{padding:"4px 11px",borderRadius:6,fontSize:11,fontWeight:600,cursor:transferTarget?"pointer":"default",border:"none",background:transferTarget?"#0891B2":"#ccc",color:"#fff"}}>Übertragen</button>
                <button onClick={()=>{setShowTransfer(false);setTransferTarget("");}} style={{padding:"4px 11px",borderRadius:6,fontSize:11,cursor:"pointer",border:`0.5px solid ${GB}`,background:"#fff",color:"#888"}}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function HelpersList({teamOnly,role,meineTeams=[],account}){
  const isMobile=useIsMobile();
  const [helperTab,setHelperTab]=useState(teamOnly?"team":"browse");
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [filterOffen,setFilterOffen]=useState(false);
  const [browseSearch,setBrowseSearch]=useState("");
  const [schichtenState,setSchichtenState]=useState({});
  const [collapsedTeamEvents,setCollapsedTeamEvents]=useState({});
  const toggleTeamCollapse=(id)=>setCollapsedTeamEvents(prev=>({...prev,[id]:!prev[id]}));
  const [collapsedEvents,setCollapsedEvents]=useState(()=>Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true])));
  const toggleCollapse=(id)=>setCollapsedEvents(prev=>{
    const allCollapsed=Object.fromEntries(HELPER_EVENTS.map(ev=>[ev.id,true]));
    return prev[id]?{...allCollapsed,[id]:false}:{...allCollapsed};
  });
  const [collapsedEinsaetze,setCollapsedEinsaetze]=useState({});
  const toggleEinsatz=(id)=>setCollapsedEinsaetze(prev=>({...prev,[id]:!prev[id]}));
  const [notesState,setBemerkungState]=useState({}); /* einsatzId/schichtId → text */
  const [editingBemerkung,setEditingBemerkung]=useState(null);
  const [notesDraft,setBemerkungDraft]=useState("");
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("helfer_notesen");if(r)setBemerkungState(JSON.parse(r.value));}catch(e){}})();
  },[]);
  const saveBemerkung=(id,text)=>{
    const next={...notesState,[id]:text};
    setBemerkungState(next);
    window.storage.set("helfer_notesen",JSON.stringify(next));
    setEditingBemerkung(null);
  };
  const schichtenRef=useRef({});


  /* Load from storage on mount */
  useEffect(()=>{
    (async()=>{
      try{
        const res=await window.storage.get("helfer_schichten");
        if(res){const d=JSON.parse(res.value);setSchichtenState(d);schichtenRef.current=d;}
      }catch(e){}
      try{
        const res=await window.storage.get("helfer_freigabe");
        if(res) setFreigabeAnfragen(JSON.parse(res.value));
      }catch(e){}
    })();
  },[]);

  const saveSchichten=(updater)=>{
    setSchichtenState(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      schichtenRef.current=next;
      window.storage.set("helfer_schichten",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };
  const [expandedMember,setExpandedMember]=useState(null);
  const [filterStatus,setFilterStatus]=useState("alle");
  const [search,setSearch]=useState("");
  const [showNewForm,setShowNewForm]=useState(false);
  const [gruppenState,setGruppenState]=useState({}); /* einsatzId → gruppen[] override */
  const [editingGruppen,setEditingGruppen]=useState(null); /* einsatzId being edited */
  const [newEinsatzGruppen,setNewEinsatzGruppen]=useState(["Alle"]);

  const canEdit=["administrator","administration","funktionaer","trainer"].includes(role);
  const canFreigeben=["administrator","administration","funktionaer"].includes(role);
  const canErstellen=["administrator","administration","funktionaer"].includes(role);
  const canZuteilen=role==="trainer";
  const isTrainer=role==="trainer";
  /* Trainer sieht im Controlling nur sein Team */
  const meinTeam=meineTeams?.[0]||"Cc-Junioren";
  /* Team-Mitglieder die der Trainer zuteilen kann: er selbst + seine Spieler */
  const meinName=getHelperName(role,account);
  /* Eltern können sich selbst oder ihre Kinder eintragen */
  const elternPersonen=role==="eltern"&&account?.kinder?.length>0
    ? [meinName,...(account.kinder.map(k=>k.name))]
    : null;
  const [aktivePerson,setAktivePerson]=useState(meinName);
  const aktiverName=elternPersonen?aktivePerson:meinName;

  const teamMitglieder=[meinName,...HELPERS.filter(h=>h.gruppe===meinTeam||h.gruppe.includes(meinTeam)).map(h=>h.name)];

  const [freigabeAnfragen,setFreigabeAnfragen]=useState({});

  const saveFreigabe=(fn)=>{
    setFreigabeAnfragen(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      window.storage.set("helfer_freigabe",JSON.stringify(next)).catch(()=>{});
      return next;
    });
  };

  const getBase=(prev,sid)=>{
    for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
      const s=e.schichten.find(s=>s.id===sid);
      if(s) return prev[sid]??[...s.helfer];
    }
    return [];
  };

  const onEintragen=(sid,person)=>{
    const target=person||meinName;
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      if(base.includes(target)) return prev;
      return{...prev,[sid]:[...base,target]};
    });
  };

  /* Freigabe: canFreigeben=direkt austragen, sonst Anfrage mit Begründung stellen */
  const onFreigeben=(sid,person,begruendung)=>{
    if(canFreigeben){
      /* Funktionär/Admin trägt direkt aus */
      const target=person||meinName;
      saveSchichten(prev=>({...prev,[sid]:getBase(prev,sid).filter(h=>h!==target)}));
      saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
    } else {
      /* Andere Rollen: Anfrage mit Begründung speichern */
      saveFreigabe(prev=>({...prev,[sid]:{name:meinName,begruendung:begruendung||""}}));
    }
  };

  /* Übertragen: alten Helfer raus, neuen rein */
  const onÜbertragen=(sid,von,an)=>{
    saveSchichten(prev=>{
      const base=getBase(prev,sid);
      return{...prev,[sid]:[...base.filter(h=>h!==von),an]};
    });
    saveFreigabe(prev=>{const n={...prev};delete n[sid];return n;});
  };

  /* Controlling-Berechnungen */
  const mitgliederCalc=HELPERS.map(m=>{
    const geplant=m.schichten.filter(sid=>{
      const h=schichtenState[sid];
      if(h) return h.includes(m.name);
      for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
        const s=e.schichten.find(s=>s.id===sid);
        if(s) return s.helfer.includes(m.name);
      }
      return false;
    }).length;
    const offen=Math.max(0,m.soll-m.geleistet-geplant);
    let status="Erfüllt";
    if(m.soll===0) status="Befreit";
    else if(m.geleistet>=m.soll) status="Erfüllt";
    else if(m.geleistet+geplant>=m.soll) status="Geplant erfüllt";
    else status="Offen";
    return{...m,geplant,offen,status};
  });

  /* Statistiken über alle Events */
  const allSchichten=HELPER_EVENTS.flatMap(ev=>ev.einsaetze.flatMap(e=>e.schichten));
  const totalBelegt=allSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
  const totalOffen=allSchichten.length-totalBelegt;

  /* Gruppen/Teams der aktuellen Rolle - unterstützt mehrere Teams (Eltern mit 2 Kindern) */
  const meineGruppen=[...new Set([
    ...meineTeams,
    ...meineTeams.map(t=>t+" Eltern"),
    ...(meineTeams.length===0&&role==="trainer"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="spieler"?["Cc-Junioren"]:[]),
    ...(meineTeams.length===0&&role==="eltern"?["Cc-Junioren Eltern"]:[]),
  ].filter(Boolean))];
  const meinGruppe=meineGruppen[0]||null;

  const TABS= teamOnly ? [
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
  ] : [
    {key:"browse",  label:"≡ Offene Einsätze"},
    {key:"mein",    label:"Meine Einsätze"},
    ...(meinGruppe?[{key:"team",label:"Meinem Team zugewiesen"}]:[]),
    ...(canEdit?[{key:"controlling",label:"Controlling"}]:[]),
    ...(canErstellen?[{key:"erstellen",label:"+ Einsatz erfassen"}]:[]),
  ];

  /* Meine Schichten */
  const meineSchichten=[];
  for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze) for(const s of e.schichten){
    const h=schichtenState[s.id]??s.helfer;
    if(h.includes(aktiverName)) meineSchichten.push({...s,helfer:h,einsatzName:e.name,einsatzDate:e.date,einsatzOrt:e.location,eventName:ev.name,eventColor:ev.color});
  }
  const mich=mitgliederCalc.find(m=>m.name===aktiverName)||{soll:2,geleistet:1,geplant:meineSchichten.length,offen:0,status:"Geplant erfüllt"};

  /* Status-Farben */
  const SC={
    "Erfüllt":        {c:GN, bg:"#ECFDF5"},
    "Geplant erfüllt":{c:AM, bg:"#FFFBEB"},
    "Offen":          {c:R,  bg:RL},
    "Befreit":        {c:"#888",bg:"#f5f5f5"},
  };

  return(
    <div>
      {/* Seitentitel */}
      {!teamOnly&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Helfereinsätze</h1>
          {canErstellen&&<Btn variant="primary" color="#F3F4F6" onClick={()=>{setHelperTab("erstellen");setShowNewForm(true);}}>+ Event erstellen</Btn>}
        </div>
      )}

      {/* KPI-Leiste - nur für Admin/Administration/Funktionär */}
      {canFreigeben&&(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        <Stat label="Mitglieder" value={HELPERS.length}/>
        <Stat label="Soll erfüllt" value={mitgliederCalc.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length} color={GN}/>
        <Stat label="Noch offen" value={mitgliederCalc.filter(m=>m.status==="Offen").length} color={R}/>
        <Stat label="Offene Schichten" value={totalOffen} color={AM} sub={`von ${allSchichten.length} total`}/>
      </div>
      )}

      {/* Sub-Tabs */}
      <div style={{display:"flex",gap:2,background:GR,borderRadius:10,padding:3,marginBottom:18,width:"fit-content"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setHelperTab(t.key)} style={{padding:"7px 14px",border:"none",borderRadius:8,background:helperTab===t.key?"#fff":"transparent",color:helperTab===t.key?BK:"#999",fontWeight:helperTab===t.key?700:400,cursor:"pointer",fontSize:12.5,boxShadow:helperTab===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none",whiteSpace:"nowrap"}}>{t.label}</button>
        ))}
      </div>

      {/* -- TAB: BROWSE - alle Events auf einer Seite -- */}
      {/* Eltern: Anmelden als Switcher */}
      {elternPersonen&&(
        <div style={{display:"flex",gap:6,marginBottom:14,padding:"10px 12px",background:GR,borderRadius:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:"#aaa",fontWeight:600,marginRight:2}}>Anmelden als:</span>
          {elternPersonen.map((p,i)=>{
            const active=aktivePerson===p;
            return(
              <button key={i} onClick={()=>setAktivePerson(p)}
                style={{padding:"6px 14px",borderRadius:20,border:`0.5px solid ${active?"#f8de09":GB}`,background:active?"#f8de0930":"#fff",color:BK,fontSize:12,fontWeight:active?700:400,cursor:"pointer"}}>
                {i===0?`${p} (Elternteil)`:p}
              </button>
            );
          })}
        </div>
      )}
      {helperTab==="browse"&&(
        <div>
          {/* Filterleiste */}
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {/* Suchfeld */}
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#aaa",pointerEvents:"none"}}><i className="ti-search"/></span>
              <input
                value={browseSearch}
                onChange={e=>setBrowseSearch(e.target.value)}
                placeholder="Einsatz oder Schicht suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${browseSearch?"#f8de09":GB}`,borderRadius:20,fontSize:12,outline:"none",width:"100%",maxWidth:210,background:"#fff"}}
              />
              {browseSearch&&(
                <button onClick={()=>setBrowseSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",lineHeight:1}}>×</button>
              )}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            {/* Event-Filter als Dropdown */}
            <select value={selectedEvent||""} onChange={e=>setSelectedEvent(e.target.value?Number(e.target.value):null)}
              style={{padding:"5px 10px",border:`0.5px solid ${selectedEvent?"#f8de09":GB}`,borderRadius:20,fontSize:12,color:BK,background:selectedEvent?"#f8de0930":"#fff",cursor:"pointer",outline:"none",fontWeight:selectedEvent?700:400}}>
              <option value="">Alle Events</option>
              {HELPER_EVENTS.map(ev=>(
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <div style={{width:"1px",height:22,background:GB,margin:"0 2px"}}/>
            {/* Schichten-Filter */}
            <button onClick={()=>setFilterOffen(false)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${!filterOffen?"#f8de09":GB}`,background:!filterOffen?"#f8de0930":"#fff",color:BK,fontSize:13,cursor:"pointer",fontWeight:!filterOffen?700:400}}>Alle Schichten</button>
            <button onClick={()=>setFilterOffen(true)} style={{padding:"8px 16px",borderRadius:20,border:`0.5px solid ${filterOffen?"#f8de09":GB}`,background:filterOffen?"#f8de0930":"#fff",color:BK,fontSize:13,cursor:"pointer",fontWeight:filterOffen?700:400}}>Nur offen</button>
          </div>

          {/* Alle Events nacheinander */}
          <div style={{display:"flex",flexDirection:"column",gap:22}}>
            {HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).map(ev=>{
              const q=browseSearch.toLowerCase();

              /* Einsätze filtern: Suche in Event-Name, Einsatz-Name, Ort, Schicht-Label */
              const einsaetzeVisible=ev.einsaetze.map(e=>({
                ...e,
                schichtenVisible: e.schichten.filter(s=>{
                  const matchSearch=!q
                    ||ev.name.toLowerCase().includes(q)
                    ||e.name.toLowerCase().includes(q)
                    ||e.location.toLowerCase().includes(q)
                    ||s.label.toLowerCase().includes(q)
                    ||s.helfer.some(h=>h.toLowerCase().includes(q));
                  const matchOffen=!filterOffen||(schichtenState[s.id]??s.helfer).length<s.max;
                  return matchSearch&&matchOffen;
                }),
              })).filter(e=>e.schichtenVisible.length>0);

              /* Event ausblenden wenn Suche nichts trifft */
              if(q&&!ev.name.toLowerCase().includes(q)&&einsaetzeVisible.length===0) return null;

              /* Statistik für dieses Event */
              const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
              const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
              const evOffen=evSchichten.length-evBelegt;
              const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;

              const isCollapsed=!!collapsedEvents[ev.id];
              return(
                <div key={ev.id} style={{borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:`0.5px solid ${GB}`}}>
                  {/* Event-Header-Banner */}
                <div onClick={()=>toggleCollapse(ev.id)} style={{background:isCollapsed?"#fff":GR,padding:"18px 20px",color:BK,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,cursor:"pointer",userSelect:"none",borderBottom:`0.5px solid ${GB}`,borderLeft:`5px solid ${ev.color||BK}`}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:BK}}>
                        {ev.name}
                        <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                      </div>
                      <div style={{fontSize:12,color:"#888",marginTop:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span>{""+ev.date}</span>
                        <span style={{opacity:0.4}}>{"|"}</span>
                        <span>{""+ev.loc}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {(()=>{
                        const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                        const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                        const offenPlätze=totalPlätze-belegtPlätze;
                        return[
                          {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                          {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                        ].map((s,i)=>(
                          <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                            <div style={{fontSize:22,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                            <div style={{fontSize:9,color:"#888",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Einsätze */}
                  {!isCollapsed&&<div style={{background:"#fff"}}>
                    {einsaetzeVisible.length===0?(
                      <div style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:13,background:"#fafaf8"}}>Keine offenen Schichten in diesem Event.</div>
                    ):einsaetzeVisible.map((einsatz,ei)=>{
                      const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                      const eOffen=einsatz.schichten.length-eBelegt;
                      const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                      const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                      return(
                        <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                          {/* Einsatz-Zeile */}
                          <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#FAFAFA",borderBottom:`0.5px solid ${GB}`,cursor:"pointer",userSelect:"none"}}>
                            <div style={{display:"flex",alignItems:"center",gap:12}}>
                              <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                              <div>
                                <div style={{fontWeight:700,fontSize:13,color:BK,display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:8,color:"#aaa",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                  {einsatz.name}
                                </div>
                                <div style={{fontSize:11,color:"#888",marginTop:1,display:"flex",alignItems:"center",gap:6}}>
                                  <span>{""+einsatz.time+" Uhr"}</span>
                                  <span style={{color:"#ddd"}}>{"|"}</span>
                                  <span>{""+einsatz.location}</span>
                                </div>
                                {notesState[`e${einsatz.id}`]&&(
                                  <div style={{fontSize:10,color:AM,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                                    <span><i className="ti-edit"/></span><span style={{fontStyle:"italic"}}>{notesState[`e${einsatz.id}`]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                              {/* Gruppen - editierbar für Admin/Funktionär */}
                              {editingGruppen===einsatz.id?(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                                  {HELPER_GRUPPEN.map(g=>{
                                    const cur=gruppenState[einsatz.id]||einsatz.gruppen;
                                    const checked=cur.includes(g);
                                    return(
                                      <label key={g} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11,padding:"2px 8px",borderRadius:20,background:checked?"#f8de0930":"#fff",border:`0.5px solid ${checked?"#f8de09":GB}`,fontWeight:checked?700:400}}>
                                        <input type="checkbox" checked={checked} onChange={()=>setGruppenState(prev=>{const cur=prev[einsatz.id]||einsatz.gruppen;return {...prev,[einsatz.id]:checked?cur.filter(x=>x!==g):[...cur,g]};})} style={{display:"none"}}/>
                                        {g}
                                      </label>
                                    );
                                  })}
                                  <button onClick={e=>{e.stopPropagation();setEditingGruppen(null);}} style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,border:`0.5px solid ${GN}`,background:"#F0FDF4",color:GN,cursor:"pointer"}}>✓ Fertig</button>
                                </div>
                              ):(
                                <>
                                  {(gruppenState[einsatz.id]||einsatz.gruppen).map((g,gi)=><Chip key={gi} text={g} color="#6B7280" bg="#F3F4F6"/>)}
                                  {canEdit&&<button onClick={e=>{e.stopPropagation();setEditingGruppen(einsatz.id);}} style={{padding:"2px 8px",borderRadius:20,fontSize:10,border:`0.5px solid ${GB}`,background:"#fff",color:"#888",cursor:"pointer"}}><i className="ti-edit"/></button>}
                                </>
                              )}
                              {/* Bemerkung Edit */}
                              {canEdit&&(editingBemerkung===`e${einsatz.id}`?(
                                <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:5,alignItems:"center"}}>
                                  <input autoFocus value={notesDraft} onChange={e=>setBemerkungDraft(e.target.value)}
                                    placeholder="Bemerkung…"
                                    style={{padding:"3px 8px",border:`0.5px solid ${GB}`,borderRadius:6,fontSize:11,outline:"none",width:160}}/>
                                  <button onClick={()=>saveBemerkung(`e${einsatz.id}`,notesDraft)} style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600,border:`0.5px solid ${GN}`,background:"#F0FDF4",color:GN,cursor:"pointer"}}>✓</button>
                                  <button onClick={()=>setEditingBemerkung(null)} style={{padding:"2px 8px",borderRadius:6,fontSize:11,border:`0.5px solid ${GB}`,background:"#fff",color:"#888",cursor:"pointer"}}>✕</button>
                                </div>
                              ):(
                                <button onClick={e=>{e.stopPropagation();setEditingBemerkung(`e${einsatz.id}`);setBemerkungDraft(notesState[`e${einsatz.id}`]||"");}}
                                  style={{padding:"2px 8px",borderRadius:20,fontSize:10,border:`0.5px solid ${GB}`,background:"#fff",color:"#888",cursor:"pointer"}}><i className="ti-edit"/></button>
                              ))}
                              {(()=>{
                                const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                const offenPlätze=totalPlätze-belegtPlätze;
                                return(
                                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                    {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Schichten-Grid */}
                          {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:14,padding:"16px",background:"#fff"}}>
                            {einsatz.schichtenVisible.map(s=>(
                              <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={notesState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                            ))}
                          </div>}
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
            {/* Keine Treffer */}
            {browseSearch&&HELPER_EVENTS.filter(ev=>!selectedEvent||ev.id===selectedEvent).every(ev=>{
              const q=browseSearch.toLowerCase();
              if(ev.name.toLowerCase().includes(q)) return false;
              return ev.einsaetze.every(e=>
                !e.name.toLowerCase().includes(q)&&
                !e.location.toLowerCase().includes(q)&&
                e.schichten.every(s=>!s.label.toLowerCase().includes(q)&&!s.helfer.some(h=>h.toLowerCase().includes(q)))
              );
            })&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:"#aaa",fontSize:14,background:"#fff",borderRadius:12,border:`0.5px solid ${GB}`}}>
                Keine Einsätze oder Schichten gefunden für <strong style={{color:BK}}>„{browseSearch}"</strong>
                <br/><button onClick={()=>setBrowseSearch("")} style={{marginTop:10,padding:"5px 14px",borderRadius:20,border:`0.5px solid ${GB}`,background:"#fff",color:"#555",fontSize:12,cursor:"pointer"}}>Suche zurücksetzen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- TAB: MEIN EINSATZ -- */}
      {helperTab==="mein"&&(
        <div>
          {/* Status-Kacheln */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
            {[{l:"Soll",v:mich.soll,c:BK,bg:"#fff"},{l:"Geleistet",v:mich.geleistet,c:GN,bg:"#F0FDF4"},{l:"Geplant",v:mich.geplant,c:AM,bg:"#FFFBEB"},{l:"Offen",v:mich.offen,c:mich.offen>0?R:"#aaa",bg:mich.offen>0?"#FEF2F2":"#fff"}].map((s,i)=>(
              <div key={i} style={{background:s.bg,border:`0.5px solid ${GB}`,borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                <div style={{fontSize:10,color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Status-Banner */}
          <div style={{padding:"10px 16px",borderRadius:10,marginBottom:18,background:mich.status==="Erfüllt"?"#F0FDF4":mich.status==="Geplant erfüllt"?"#FFFBEB":mich.status==="Befreit"?"#F3F4F6":"#FEF2F2",border:`0.5px solid ${mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#ccc":R}`}}>
            <div style={{fontWeight:700,fontSize:13,color:mich.status==="Erfüllt"?GN:mich.status==="Geplant erfüllt"?AM:mich.status==="Befreit"?"#888":R}}>
              {mich.status==="Erfüllt"&&"✓ Soll erfüllt - Danke für deinen Einsatz!"}
              {mich.status==="Geplant erfüllt"&&"⏳ Geplant erfüllt - Schichten noch ausstehend"}
              {mich.status==="Offen"&&`${mich.offen} Einsatz${mich.offen>1?"ätze":""} noch offen`}
              {mich.status==="Befreit"&&"Du bist von Helfereinsätzen befreit"}
            </div>
          </div>
          {(()=>{
            const today="2026-05-23";
            const parseDate=(d)=>{
              if(!d) return "";
              const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
              const parts=clean.split(".");
              if(parts.length===3) return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
              return "";
            };
            const geleistet=meineSchichten.filter(s=>parseDate(s.einsatzDate)<today&&parseDate(s.einsatzDate)!=="");
            const geplant=meineSchichten.filter(s=>parseDate(s.einsatzDate)>=today||parseDate(s.einsatzDate)==="");
            return(
              <>
                {geplant.length>0&&(
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"#FFFBEB",color:AM,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #FDE68A`}}>⏳ Geplant</span>
                      <span style={{color:"#aaa",fontSize:12}}>{geplant.length+" Schicht"+(geplant.length!==1?"en":"")}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {geplant.map((s,i)=>{
                        const anfrageData=(freigabeAnfragen||{})[s.id];
                        const anfragePending=anfrageData?.name===meinName;
                        return <MeinSchichtEintrag key={i} schicht={s} anfragePending={anfragePending} anfrageData={anfrageData} meinName={aktiverName} onÜbertragen={onÜbertragen} onFreigeben={onFreigeben}/>;
                      })}
                    </div>
                  </div>
                )}
                {geleistet.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{background:"#ECFDF5",color:GN,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`0.5px solid #BBF7D0`}}>✓ Geleistet</span>
                      <span style={{color:"#aaa",fontSize:12}}>{geleistet.length+" Schicht"+(geleistet.length!==1?"en":"")}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {geleistet.map((s,i)=>(
                        <div key={i} style={{background:"#fff",border:`0.5px solid ${GB}`,borderRadius:10,overflow:"hidden",borderTop:`4px solid ${s.eventColor||"#64748B"}`,opacity:0.85}}>
                          <div style={{padding:"14px 18px",background:"#fff",borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:BK,letterSpacing:-0.2}}>{s.eventName}</div>
                              <div style={{fontSize:12,color:"#888",marginTop:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <span>{s.einsatzName}</span>
                                {s.einsatzDate&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzDate}</span></>}
                                {s.einsatzOrt&&<><span style={{opacity:0.4}}>{"|"}</span><span>{""+s.einsatzOrt}</span></>}
                              </div>
                            </div>
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#ECFDF5",color:GN,flexShrink:0}}>✓ Geleistet</span>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            <div style={{fontWeight:600,fontSize:13}}>{s.label}</div>
                            <div style={{fontSize:11,color:"#888",marginTop:2}}>{""+s.einsatzDate+(s.einsatzOrt?" · "+s.einsatzOrt:"")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {meineSchichten.length===0&&<InfoBox text="Noch keine Schichten eingetragen." color="#aaa"/>}
              </>
            );
          })()}
          {mich.status==="Offen"&&meineSchichten.length===0&&<InfoBox text={`Noch ${mich.offen} Einsatz${mich.offen>1?"ätze":""} offen. Unter "Offene Einsätze" eine Schicht übernehmen.`} color={R}/>}
        </div>
      )}

      {/* -- TAB: MEINEM TEAM ZUGEWIESEN -- */}
      {helperTab==="team"&&meinGruppe&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"#F3F4F6",border:`0.5px solid ${GB}`,borderRadius:9,marginBottom:16,fontSize:13}}>
            <span style={{fontSize:15}}><i className="ti-users"/></span>
            <span>Einsätze für deine Teams: {meineGruppen.map((g,i)=><strong key={i}>{i>0?" · ":""}{g}</strong>)}</span>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:22}}>
            {(()=>{
              /* Alle Einsätze sammeln die für meinGruppe oder "Alle" freigegeben sind */
              const teamEinsaetze=[];
              for(const ev of HELPER_EVENTS){
                const passende=ev.einsaetze.filter(e=>
                  meineGruppen.some(g=>e.gruppen.includes(g))&&!e.gruppen.includes("Alle")
                );
                if(passende.length>0) teamEinsaetze.push({...ev,einsaetze:passende});
              }

              if(teamEinsaetze.length===0) return(
                <div style={{textAlign:"center",padding:"40px 20px",color:"#aaa",fontSize:14,background:"#fff",borderRadius:12,border:`0.5px solid ${GB}`}}>
                  Keine Einsätze für dein Team ({meinGruppe}) zugewiesen.
                </div>
              );

              return teamEinsaetze.map(ev=>{
                const evSchichten=ev.einsaetze.flatMap(e=>e.schichten);
                const evBelegt=evSchichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                const evOffen=evSchichten.length-evBelegt;
                const evHelfer=[...new Set(evSchichten.flatMap(s=>schichtenState[s.id]??s.helfer))].length;
                const isTeamCollapsed=!!collapsedTeamEvents[ev.id];
                return(
                  <div key={ev.id} style={{borderRadius:14,overflow:"hidden",border:`0.5px solid ${GB}`,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    {/* Event-Banner */}
                    <div onClick={()=>toggleTeamCollapse(ev.id)} style={{background:isTeamCollapsed?"#fff":GR,borderTop:`4px solid ${ev.color}`,padding:"18px 20px",color:BK,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,cursor:"pointer",userSelect:"none",borderBottom:`0.5px solid ${GB}`}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,letterSpacing:-0.2,display:"flex",alignItems:"center",gap:8,color:BK}}>
                          {ev.name}
                          <span style={{fontSize:14,opacity:0.4,transition:"transform 0.2s",display:"inline-block",transform:isTeamCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>{"▾"}</span>
                        </div>
                        <div style={{fontSize:12,color:"#888",marginTop:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span>{""+ev.date}</span>
                          <span style={{opacity:0.4}}>{"|"}</span>
                          <span>{""+ev.loc}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {(()=>{
                          const totalPlätze=evSchichten.reduce((s,sc)=>s+sc.max,0);
                          const belegtPlätze=evSchichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                          const offenPlätze=totalPlätze-belegtPlätze;
                          return[
                            {l:"Schichten total",v:totalPlätze,bg:"rgba(255,255,255,0.6)",border:"rgba(0,0,0,0.08)",tc:BK},
                            {l:"Schichten offen",v:offenPlätze,bg:offenPlätze>0?"#FFFBEB":"rgba(255,255,255,0.6)",border:offenPlätze>0?"#FDE68A":"rgba(0,0,0,0.08)",tc:offenPlätze>0?AM:GN},
                          ].map((s,i)=>(
                            <div key={i} style={{background:s.bg,border:`0.5px solid ${s.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:64}}>
                              <div style={{fontSize:22,fontWeight:800,lineHeight:1,color:s.tc}}>{s.v}</div>
                              <div style={{fontSize:9,color:"#888",marginTop:3,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>{s.l}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Einsätze */}
                    {!isTeamCollapsed&&<div style={{borderTop:`0.5px solid ${GB}`,overflow:"hidden"}}>
                      {ev.einsaetze.map((einsatz,ei)=>{
                        const eBelegt=einsatz.schichten.filter(s=>(schichtenState[s.id]??s.helfer).length>=s.max).length;
                        const eOffen=einsatz.schichten.length-eBelegt;
                        const eTotalHelfer=einsatz.schichten.reduce((sum,s)=>(schichtenState[s.id]??s.helfer).length+sum,0);
                        const eBarColor=eOffen===0?GN:eTotalHelfer===0?R:AM;
                        return(
                          <div key={einsatz.id} style={{borderTop:ei>0?`0.5px solid ${GB}`:"none"}}>
                            <div onClick={()=>toggleEinsatz(einsatz.id)} style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#FAFAFA",borderBottom:`0.5px solid ${GB}`,cursor:"pointer",userSelect:"none"}}>
                              <div style={{display:"flex",alignItems:"center",gap:12}}>
                                <div style={{width:3,height:32,borderRadius:2,background:eBarColor,flexShrink:0}}/>
                                <div>
                                  <div style={{fontWeight:700,fontSize:13,color:BK,display:"flex",alignItems:"center",gap:6}}>
                                    <span style={{fontSize:8,color:"#aaa",display:"inline-block",transform:collapsedEinsaetze[einsatz.id]?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.15s"}}>▶</span>
                                    {einsatz.name}
                                  </div>
                                  <div style={{fontSize:11,color:"#888",marginTop:1,display:"flex",alignItems:"center",gap:6}}>
                                    <span>{""+einsatz.time+" Uhr"}</span>
                                    <span style={{color:"#ddd"}}>{"|"}</span>
                                    <span>{""+einsatz.location}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                                {einsatz.gruppen.map((g,gi)=>(
                                  <Chip key={gi} text={g} color={g===meinGruppe?ev.color:"#6B7280"} bg={g===meinGruppe?ev.color+"18":"#F3F4F6"}/>
                                ))}
                                {(()=>{
                                  const totalPlätze=einsatz.schichten.reduce((s,sc)=>s+sc.max,0);
                                  const belegtPlätze=einsatz.schichten.reduce((s,sc)=>s+(schichtenState[sc.id]??sc.helfer).length,0);
                                  const offenPlätze=totalPlätze-belegtPlätze;
                                  return(
                                    <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:offenPlätze===0?"#ECFDF5":belegtPlätze===0?RL:"#FFFBEB",color:offenPlätze===0?GN:belegtPlätze===0?R:AM}}>
                                      {offenPlätze===0?"✓ Alle besetzt":`${offenPlätze} / ${totalPlätze} offen`}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            {!collapsedEinsaetze[einsatz.id]&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:14,padding:"16px",background:"#fff"}}>
                              {einsatz.schichten.map(s=>(
                                <SchichtKarte key={s.id} schicht={s} einsatz={einsatz} meinName={aktiverName} canEdit={canEdit} canFreigeben={canFreigeben} canZuteilen={canZuteilen} teamMitglieder={teamMitglieder} schichtenState={schichtenState} onEintragen={onEintragen} onFreigeben={onFreigeben} onÜbertragen={onÜbertragen} freigabeAnfragen={freigabeAnfragen} notes={notesState[`s${s.id}`]} onSaveBemerkung={(txt)=>saveBemerkung(`s${s.id}`,txt)}/>
                              ))}
                            </div>}
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* -- TAB: CONTROLLING -- */}
      {helperTab==="controlling"&&canEdit&&(
        <div>
          {/* Team-Filter Hinweis für Trainer */}
          {isTrainer&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"#F3F4F6",border:`0.5px solid ${GB}`,borderRadius:9,marginBottom:14,fontSize:13}}>
              <span style={{fontSize:15}}><i className="ti-eye"/></span>
              <span>Du siehst nur Mitglieder deines Teams: <strong>Cc-Junioren</strong></span>
            </div>
          )}

          {/* Stat-Kacheln */}
          {(()=>{
            const relevant=isTrainer?mitgliederCalc.filter(m=>m.gruppe===meinTeam||m.gruppe.includes(meinTeam)):mitgliederCalc;
            const erfuellt=relevant.filter(m=>["Erfüllt","Geplant erfüllt"].includes(m.status)).length;
            const offen=relevant.filter(m=>m.status==="Offen").length;
            const befreit=relevant.filter(m=>m.status==="Befreit").length;
            return(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
                {[{l:"Erfüllt",v:erfuellt,c:GN,bg:"#F0FDF4"},{l:"Offen",v:offen,c:AM,bg:"#FFFBEB"},{l:"Befreit",v:befreit,c:BK,bg:"#fff"}].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:`0.5px solid ${GB}`,borderRadius:14,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                    <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:10,color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{s.l}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Suche + Filter */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center",width:"100%",rowGap:6}}>
            <div style={{position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#aaa",pointerEvents:"none"}}><i className="ti-search"/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mitglied suchen…"
                style={{padding:"6px 10px 6px 28px",border:`0.5px solid ${search?"#f8de09":GB}`,borderRadius:20,fontSize:12,outline:"none",width:"100%",maxWidth:190,background:"#fff"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",lineHeight:1}}>×</button>}
            </div>
            <div style={{width:"1px",height:22,background:GB}}/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["alle","Offen","Geplant erfüllt","Erfüllt","Befreit"].map(f=>(
                <button key={f} onClick={()=>setFilterStatus(f)} style={{padding:"5px 12px",border:`0.5px solid ${filterStatus===f?"#f8de09":GB}`,borderRadius:20,background:filterStatus===f?"#f8de0930":"#fff",color:BK,fontSize:12,cursor:"pointer",fontWeight:filterStatus===f?700:400}}>{f==="alle"?"Alle":f}</button>
              ))}
            </div>
            {!isTrainer&&(
              <div style={{marginLeft:"auto",display:"flex",gap:7}}>
                <Btn small>Export CSV</Btn>
                <Btn small>Export Excel</Btn>
              </div>
            )}
          </div>

          <Card style={{padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:GR}}>
                  {["Mitglied","Gruppe","Soll","Geleistet","Geplant","Offen","Status",""].map((h,i)=>(
                    <th key={i} style={{padding:"9px 12px",textAlign:i>1?"center":"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mitgliederCalc
                  .filter(m=>!isTrainer||(m.gruppe===meinTeam||m.gruppe.includes(meinTeam)))
                  .filter(m=>filterStatus==="alle"||m.status===filterStatus)
                  .filter(m=>m.name.toLowerCase().includes(search.toLowerCase()))
                  .map((m,i)=>(
                  <>
                    <tr key={m.id} onClick={()=>setExpandedMember(expandedMember===m.id?null:m.id)}
                      style={{borderTop:`0.5px solid ${GB}`,background:expandedMember===m.id?"#f8de0930":"#fff",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8de0930"}
                      onMouseLeave={e=>e.currentTarget.style.background=expandedMember===m.id?"#f8de0930":"#fff"}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <Av name={m.name} size={22} bg={SC[m.status]?.c||"#6B7280"}/>
                          <span style={{fontWeight:600}}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{padding:"9px 12px"}}><Chip text={m.gruppe} color="#6B7280" bg="#F3F4F6"/></td>
                      <td style={{padding:"9px 12px",textAlign:"center",fontWeight:700}}>{m.soll}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:GN,fontWeight:600}}>{m.geleistet}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:AM,fontWeight:600}}>{m.geplant}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:m.offen>0?R:"#aaa",fontWeight:m.offen>0?700:400}}>{m.offen}</td>
                      <td style={{padding:"9px 12px",textAlign:"center"}}><Chip text={m.status} color={SC[m.status]?.c||"#888"} bg={SC[m.status]?.bg}/></td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:"#bbb",fontSize:11}}>{expandedMember===m.id?"▲":"▼"}</td>
                    </tr>
                    {expandedMember===m.id&&(
                      <tr key={`d${m.id}`} style={{borderTop:`0.5px solid ${GB}`}}>
                        <td colSpan={8} style={{padding:"10px 20px 14px",background:"#fafaf8"}}>
                          {m.schichten.length===0?(
                            <span style={{fontSize:12,color:"#aaa"}}>Keine Schichten übernommen.</span>
                          ):(
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8,marginBottom:10}}>
                              {m.schichten.map((sid,si)=>{
                                const anfrage=freigabeAnfragen[sid];
                                for(const ev of HELPER_EVENTS) for(const e of ev.einsaetze){
                                  const s=e.schichten.find(s=>s.id===sid);
                                  if(s){
                                    const d=e.date||"";
                                    const clean=d.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();
                                    const parts=clean.split(".");
                                    const iso=parts.length===3?`${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`:"";
                                    const past=iso<"2026-05-23"&&iso!=="";
                                    const statusBadge=anfrage
                                      ?<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#FFFBEB",color:AM,border:`0.5px solid #FDE68A`}}>⏳ Freigabe ausstehend</span>
                                      :past
                                        ?<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#ECFDF5",color:GN}}>✓ Geleistet</span>
                                        :<span style={{fontSize:12,padding:"2px 4px",color:AM}}>⏳</span>;
                                    return(
                                      <div key={sid} style={{borderRadius:10,overflow:"hidden",border:`0.5px solid ${anfrage?AM:GB}`,background:anfrage?"#FFFBEB":"#fff",borderTop:`3px solid ${ev.color||"#64748B"}`}}>
                                        {/* Header */}
                                        <div style={{padding:"8px 12px",background:GR,borderBottom:`0.5px solid ${GB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                          <div>
                                            <div style={{fontWeight:700,fontSize:12,color:BK}}>{ev.name}</div>
                                            <div style={{fontSize:11,color:"#888",marginTop:1}}>{e.name}</div>
                                          </div>
                                          {statusBadge}
                                        </div>
                                        {/* Body */}
                                        <div style={{padding:"7px 12px"}}>
                                          <div style={{fontWeight:600,fontSize:12,color:BK}}>{s.label}</div>
                                          <div style={{fontSize:11,color:"#888",marginTop:2,display:"flex",gap:8}}>
                                            <span>{""+e.date}</span>
                                            {e.location&&<><span style={{opacity:0.3}}>|</span><span>{""+e.location}</span></>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {/* Trainer: nur Schichten ansehen, keine Admin-Aktionen */}
                          {!isTrainer&&(
                            <div style={{display:"flex",gap:7}}>
                              <Btn small variant="primary" color="#F3F4F6">Erinnerung senden</Btn>
                              <Btn small>Sollwert anpassen</Btn>
                              <Btn small>Als befreit markieren</Btn>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* -- TAB: ERSTELLEN -- */}
      {helperTab==="erstellen"&&canErstellen&&(
        <Card>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Neuen Einsatz erfassen</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
            {[
              {l:"Event",            type:"select",opts:["Grümpelturnier 2026","Generalversammlung 2026","+ Neuer Event…"]},
              {l:"Einsatzname",      type:"text",  ph:"z.B. Grill"},
              {l:"Datum",            type:"date"},
              {l:"Zeit",             type:"text",  ph:"10:00-14:00"},
              {l:"Ort",              type:"text",  ph:"z.B. Grillstand"},
              {l:"Freigabe Gruppen", type:"gruppen"},
            ].map((f,i)=>(
              <div key={i}>
                <label style={{fontSize:11,color:"#888",display:"block",marginBottom:4}}>{f.l}</label>
                {f.type==="gruppen"?(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px",border:`0.5px solid ${GB}`,borderRadius:8,background:"#fff"}}>
                    {HELPER_GRUPPEN.map(g=>{
                      const checked=newEinsatzGruppen.includes(g);
                      return(
                        <label key={g} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,padding:"3px 8px",borderRadius:20,background:checked?"#f8de0930":"#F3F4F6",border:`0.5px solid ${checked?"#f8de09":GB}`,fontWeight:checked?700:400}}>
                          <input type="checkbox" checked={checked} onChange={()=>setNewEinsatzGruppen(prev=>checked?prev.filter(x=>x!==g):[...prev,g])} style={{display:"none"}}/>
                          {g}
                        </label>
                      );
                    })}
                  </div>
                ):f.type==="select"?(
                  <select style={{width:"100%",padding:"7px 9px",border:`0.5px solid ${GB}`,borderRadius:8,fontSize:13}}>
                    {f.opts?.map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <input type={f.type||"text"} placeholder={f.ph} style={{width:"100%",padding:"7px 9px",border:`0.5px solid ${GB}`,borderRadius:8,fontSize:13,boxSizing:"border-box"}}/>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:16}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>Schichten</div>
            {[1,2,3].map(n=>(
              <div key={n} style={{display:"flex",gap:8,marginBottom:7,alignItems:"center"}}>
                <input placeholder={`Schicht ${n}: z.B. Grill 10:00-14:00`} style={{flex:1,padding:"6px 9px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:12}}/>
                <input type="number" placeholder="Max" style={{width:55,padding:"6px 9px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:12}}/>
                <span style={{fontSize:11,color:"#aaa"}}>Plätze</span>
              </div>
            ))}
            <button style={{fontSize:12,color:BL,background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0}}>+ Schicht hinzufügen</button>
          </div>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <Btn variant="primary" color="#F3F4F6">Einsatz erstellen</Btn>
            <Btn onClick={()=>setHelperTab("browse")}>Abbrechen</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function BusesView(){
  const [showForm,setShowForm]=useState(false);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Vereinsbusse</h1>
        <Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(!showForm)}>+ Reservation</Btn>
      </div>
      <InfoBox text="First-come-First-served · Keine Freigabe nötig · Alle Reservationen sichtbar · Nur eigene bearbeitbar" color={BL}/>
      {showForm&&(
        <Card style={{marginTop:14,background:"#F9FAFB",border:`0.5px solid ${AM}`}}>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Neue Reservation</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={{fontSize:11,color:"#888"}}>Bus</label><br/><select style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}><option>Bus A (9-Plätzer)</option><option>Bus B (15-Plätzer)</option></select></div>
            <div><label style={{fontSize:11,color:"#888"}}>Datum</label><br/><input type="date" style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}/></div>
            <div><label style={{fontSize:11,color:"#888"}}>Zeit</label><br/><input type="text" placeholder="09:00-14:00" style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}/></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:11,color:"#888"}}>Zweck</label><br/><input type="text" placeholder="z.B. Auswärtsspiel vs. FC Küsnacht" style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13,boxSizing:"border-box"}}/></div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(false)}>Reservieren</Btn><Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn></div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginTop:14}}>
        {BUSES.map((bus,i)=>(
          <Card key={i}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:12,display:"flex",justifyContent:"space-between"}}>{bus.name}<Chip text={`${bus.reservations.length} Res.`} color={BL}/></div>
            {bus.reservations.map((r,j)=>(
              <div key={j} style={{padding:"9px 0",borderBottom:j<bus.reservations.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:600,fontSize:13}}>{r.date} · {r.time+" Uhr"}</span>
                  <Chip text="Reserviert" color={BL} bg="#EFF6FF"/>
                </div>
                <div style={{fontSize:12,color:"#555",marginTop:2}}>{r.purpose}</div>
                <div style={{fontSize:11,color:"#aaa"}}>von {r.by} · {r.team}</div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MaterialView(){
  const [showForm,setShowForm]=useState(false);
  const TC={Bestellung:BL,Defekt:R,Tenüs:GN,Mangel:AM};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Material</h1>
        <Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(!showForm)}>+ Anfrage stellen</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,background:"#EFF6FF",border:`0.5px solid ${BL}`}}>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Neue Materialanfrage</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{fontSize:11,color:"#888"}}>Art</label><br/><select style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}>{["Bestellung","Ersatzmaterial","Tenüs","Mangel","Defekt","Verlust","Neue Anforderung"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{fontSize:11,color:"#888"}}>Team</label><br/><select style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13}}><option>Cc-Junioren</option><option>D-Junioren</option></select></div>
          </div>
          <div style={{marginTop:10}}><label style={{fontSize:11,color:"#888"}}>Beschreibung</label><br/><input type="text" placeholder="z.B. Neue Bälle Grösse 4" style={{width:"100%",padding:"6px 8px",border:`0.5px solid ${GB}`,borderRadius:7,fontSize:13,boxSizing:"border-box"}}/></div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(false)}>Einreichen</Btn><Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn></div>
        </Card>
      )}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:GR}}>
              {["Team","Art","Material","von","Datum","Status"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATERIAL.map((m,i)=>(
              <tr key={m.id} style={{borderTop:`0.5px solid ${GB}`}}>
                <td style={{padding:"9px 13px"}}><Chip text={m.team} color={R}/></td>
                <td style={{padding:"9px 13px"}}><Chip text={m.type} color={TC[m.type]||"#888"} bg={(TC[m.type]||"#888")+"18"}/></td>
                <td style={{padding:"9px 13px",fontWeight:600}}>{m.item}</td>
                <td style={{padding:"9px 13px",color:"#555"}}>{m.by}</td>
                <td style={{padding:"9px 13px",color:"#888"}}>{m.date}</td>
                <td style={{padding:"9px 13px"}}><Chip text={m.status} color={m.status==="Erledigt"?GN:m.status==="In Bearbeitung"?BL:AM} bg={m.status==="Erledigt"?"#ECFDF5":m.status==="In Bearbeitung"?"#EFF6FF":"#FFFBEB"}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function LockersView(){
  const START=7,END=22,H=24;
  const fmt=v=>v%1===0?`${v}:00`:Math.floor(v)+":30";
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px"}}>Garderobenplan</h1>
      <p style={{color:"#888",fontSize:13,margin:"0 0 18px"}}>Gantt-Ansicht · 07:00-22:00 Uhr</p>
      <Card style={{padding:0,overflowX:"auto"}}>
        <div style={{minWidth:600}}>
          <div style={{display:"grid",gridTemplateColumns:"110px 1fr",background:GR,borderBottom:`0.5px solid ${GB}`}}>
            <div style={{padding:"9px 12px",fontWeight:700,fontSize:11,color:"#777"}}>Garderobe</div>
            <div style={{padding:"9px 12px",fontSize:9,color:"#bbb",borderLeft:`0.5px solid ${GB}`,position:"relative",height:28}}>
              {[7,9,11,13,15,17,19,21].map((h,i)=>(
                <span key={i} style={{position:"absolute",left:`${(h-START)/(END-START)*100}%`,transform:"translateX(-50%)"}}>{h}:00</span>
              ))}
            </div>
          </div>
          {LOCKERS.map((lr,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"110px 1fr",borderBottom:i<LOCKERS.length-1?`0.5px solid ${GB}`:"none",minHeight:H*2+12}}>
              <div style={{padding:"8px 12px",fontSize:12,fontWeight:600,borderRight:`0.5px solid ${GB}`,display:"flex",alignItems:"center",background:"#fafaf8"}}>{lr.name}</div>
              <div style={{position:"relative",height:H*2+12}}>
                {lr.assignments.map((a,j)=>{
                  const left=(a.start-START)/(END-START)*100, width=(a.end-a.start)/(END-START)*100;
                  return(
                    <div key={j} title={`${a.team} · ${fmt(a.start)}-${fmt(a.end)}`} style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:j*(H+4)+4,height:H,background:a.color,borderRadius:5,padding:"3px 7px",overflow:"hidden",cursor:"help"}}>
                      <div style={{color:"#fff",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{a.team} ({a.type})</div>
                      <div style={{color:"rgba(255,255,255,0.8)",fontSize:9}}>{fmt(a.start)}-{fmt(a.end)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MediaView(){
  const SC={Eingereicht:AM,"In Prüfung":BL,Freigegeben:GN,Veröffentlicht:"#7C3AED",Archiviert:"#888"};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>Medien & Berichte</h1>
        <Btn variant="primary" color="#F3F4F6">+ Beitrag einreichen</Btn>
      </div>
      {MEDIA.map((m,i)=>(
        <Card key={i} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                <Chip text={m.cat} color={R}/>
                {m.area.map((a,j)=><Chip key={j} text={a} color={BL} bg="#EFF6FF"/>)}
              </div>
              <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700}}>{m.title}</h3>
              <div style={{fontSize:12,color:"#888"}}>{m.team} · {m.date} · {m.author}</div>
            </div>
            <Chip text={m.status} color={SC[m.status]||"#888"} bg={(SC[m.status]||"#888")+"18"}/>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NewsView({role,meineTeams}){
  const canCreate=["trainer","administrator","administration","funktionaer"].includes(role);

  /* Determine which targets are visible for this role/team */
  const myTeams=meineTeams||["Cc-Junioren"];
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isTrainer=role==="trainer";

  const JUNIOREN_TEAMS=["Cc-Junioren","A-Junioren","Ba-Junioren","Bb-Junioren","Ca-Junioren","Da-Junioren","Db-Junioren","C-Juniorinnen","F-Juniorinnen","E-Juniorinnen","D-Juniorinnen"];
  const hasJunioren=myTeams.some(t=>JUNIOREN_TEAMS.includes(t));

  const isVisible=(n)=>{
    if(isAdmin) return true;
    if(n.target==="Alle") return true;
    if(myTeams.includes(n.target)) return true;
    if(n.target==="Junioren"&&hasJunioren) return true;
    if(isTrainer) return myTeams.some(t=>n.target===t)||n.target==="Junioren"&&hasJunioren;
    return false;
  };

  const visible=NEWS.filter(isVisible);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:21,fontWeight:800,margin:0}}>News & Kommunikation</h1>
        {canCreate&&<Btn variant="primary" color="#F3F4F6">+ Beitrag</Btn>}
      </div>
      {visible.map((n,i)=>(
        <Card key={i} style={{marginBottom:12}}>
          <div style={{display:"flex",gap:7,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <Chip text={n.target} color={R}/>
            <Chip text={n.channel} color={BL} bg="#EFF6FF"/>
            <span style={{fontSize:11,color:"#aaa"}}>{n.date} · {n.author}</span>
          </div>
          <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:700}}>{n.title}</h3>
          <p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.65}}>{n.content}</p>
        </Card>
      ))}
    </div>
  );
}

function WikiView(){
  const CC={Trainer:R,Vereinsbus:BL,Spieltag:GN,"J+S":AM,Helfereinsatz:"#7C3AED",Kommunikation:"#888"};
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Wiki</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {WIKI.map((a,i)=>(
          <Card key={i} style={{cursor:"pointer"}}>
            <Chip text={a.cat} color={CC[a.cat]||"#888"} bg={(CC[a.cat]||"#888")+"18"}/>
            <h3 style={{margin:"6px 0 3px",fontSize:14,fontWeight:700}}>{a.title}</h3>
            <div style={{fontSize:11,color:"#aaa"}}>Aktualisiert {a.updated}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DocsView(){
  const docs=[
    {name:"Trainerhandbuch 2026",       type:"PDF", size:"2.4 MB",updated:"01.01.2026",area:"Trainer"},
    {name:"Spielordnung SFV",           type:"PDF", size:"1.1 MB",updated:"15.03.2026",area:"Regeln"},
    {name:"Anmeldeformular Turniere",   type:"DOCX",size:"0.3 MB",updated:"10.04.2026",area:"Formulare"},
    {name:"J+S Kursunterlagen",         type:"PDF", size:"5.2 MB",updated:"01.09.2024",area:"J+S"},
    {name:"Nutzungsregeln Vereinsbusse",type:"PDF", size:"0.2 MB",updated:"15.03.2026",area:"Vereinsbus"},
  ];
  const TC={PDF:R,DOCX:BL,XLSX:GN};
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Dokumente</h1>
      <Card style={{padding:0}}>
        {docs.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<docs.length-1?`0.5px solid ${GB}`:"none"}}>
            <div style={{width:34,height:34,borderRadius:8,background:(TC[d.type]||"#888")+"20",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:9,fontWeight:800,color:TC[d.type]||"#888"}}>{d.type}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{d.size} · {d.updated}</div>
            </div>
            <Chip text={d.area} color="#666" bg="#f5f5f5"/>
            <Btn>↓ Download</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AttendanceCentral(){
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Zentrale Anwesenheitsstatistik</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Ø Alle Teams" value="75%" color={GN}/>
        <Stat label="Ø Trainings" value="72%" color={BL}/>
        <Stat label="Ø Spiele"    value="90%" color={R}/>
        <Stat label="Teams total" value="8"   color={BK}/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:GR}}>
              {["Team","Ø Total","Ø Training","Ø Spiele","Spieler"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:i>0?"center":"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {t:"Cc-Junioren",tot:77,tr:74,sp:92,n:18},
              {t:"D-Junioren",tot:82,tr:80,sp:90,n:14},
              {t:"A-Junioren",tot:71,tr:68,sp:88,n:16},
              {t:"A-Junioren",tot:68,tr:65,sp:85,n:15},
              {t:"Aktive 1",  tot:75,tr:72,sp:90,n:22},
            ].map((r,i)=>(
              <tr key={i} style={{borderTop:`0.5px solid ${GB}`,background:i%2===0?"#fff":"#fafaf8"}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{r.t}</td>
                <td style={{padding:"9px 13px",textAlign:"center",fontWeight:700,color:r.tot>=75?GN:r.tot>=65?AM:R}}>{r.tot}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"#555"}}>{r.tr}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"#555"}}>{r.sp}%</td>
                <td style={{padding:"9px 13px",textAlign:"center",color:"#888"}}>{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* -- TRAININGSPLÄTZE VERWALTUNG -- */
function PlaetzeView(){
  const [plaetze, setPlaetze] = useState(TRAININGSPLAETZE_DEFAULT.map(p=>Object.assign({},p)));
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHaelften, setEditHaelften] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHaelften, setNewHaelften] = useState("");

  useEffect(function(){
    (async function(){
      try{
        const r=await window.storage.get("trainingsplaetze_custom");
        if(r) setPlaetze(JSON.parse(r.value));
      }catch(e){}
    })();
  },[]);

  function save(p){
    setPlaetze(p);
    window.storage.set("trainingsplaetze_custom", JSON.stringify(p));
    TRAININGSPLAETZE.length=0;
    p.forEach(function(x){ TRAININGSPLAETZE.push(x); });
  }

  function parseHaelften(str){
    return str.split(",").map(function(s){ return s.trim(); }).filter(Boolean);
  }

  function handleAdd(){
    if(!newName.trim()) return;
    const h = parseHaelften(newHaelften);
    save(plaetze.concat([{id:"platz_"+Date.now(), name:newName.trim(), active:true, halfn:h}]));
    setNewName(""); setNewHaelften(""); setShowAdd(false);
  }

  function handleRename(id){
    if(!editName.trim()) return;
    const h = parseHaelften(editHaelften);
    save(plaetze.map(function(p){ return p.id===id?Object.assign({},p,{name:editName.trim(),halfn:h}):p; }));
    setEditId(null); setEditName(""); setEditHaelften("");
  }

  function handleToggle(id){
    save(plaetze.map(function(p){ return p.id===id?Object.assign({},p,{active:!p.active}):p; }));
  }

  function handleDelete(id){
    if(!window.confirm("Platz wirklich löschen?")) return;
    save(plaetze.filter(function(p){ return p.id!==id; }));
  }

  function moveUp(i){
    if(i===0) return;
    const next=plaetze.slice();
    const tmp=next[i-1]; next[i-1]=next[i]; next[i]=tmp;
    save(next);
  }

  function moveDown(i){
    if(i===plaetze.length-1) return;
    const next=plaetze.slice();
    const tmp=next[i]; next[i]=next[i+1]; next[i+1]=tmp;
    save(next);
  }

  return(
    <div style={{maxWidth:560}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 4px"}}>Trainingsplätze</h1>
          <p style={{fontSize:13,color:"#888",margin:0}}>Plätze verwalten, Hälften konfigurieren, aktivieren/deaktivieren</p>
        </div>
        <button onClick={function(){setShowAdd(true);}}
          style={{padding:"8px 16px",borderRadius:10,border:"none",background:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          + Platz
        </button>
      </div>

      {/* Aktiv */}
      <div style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,paddingLeft:2}}>Aktive Plätze</div>
      <div style={{background:"#fff",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        {plaetze.filter(function(p){return p.active;}).length===0&&(
          <div style={{padding:"16px",textAlign:"center",color:"#aaa",fontSize:13}}>Keine aktiven Plätze</div>
        )}
        {plaetze.map(function(p,i){
          if(!p.active) return null;
          return(
            <div key={p.id} style={{borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
              {editId===p.id ? (
                <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                  <input value={editName} onChange={function(e){setEditName(e.target.value);}} autoFocus
                    placeholder="Platzname"
                    style={{padding:"7px 10px",border:"1.5px solid "+BL,borderRadius:8,fontSize:13,outline:"none"}}/>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:4}}>Hälften (kommagetrennt, z.B. <em>Hüttliseite, Rappiseite</em>)</div>
                    <input value={editHaelften} onChange={function(e){setEditHaelften(e.target.value);}}
                      placeholder="leer = keine Hälften"
                      style={{width:"100%",padding:"7px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={function(){handleRename(p.id);}}
                      style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:BK,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Speichern</button>
                    <button onClick={function(){setEditId(null);setEditName("");setEditHaelften("");}}
                      style={{padding:"7px 12px",borderRadius:8,border:"0.5px solid "+GB,background:"#fff",fontSize:12,cursor:"pointer"}}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                    <button onClick={function(){moveUp(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===0}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:3,background:"#fff",cursor:"pointer",fontSize:9,color:"#666",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                    <button onClick={function(){moveDown(i);}} disabled={plaetze.filter(function(x){return x.active;}).indexOf(p)===plaetze.filter(function(x){return x.active;}).length-1}
                      style={{width:18,height:18,border:"0.5px solid "+GB,borderRadius:3,background:"#fff",cursor:"pointer",fontSize:9,color:"#666",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:GN,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:BK}}>{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <button onClick={function(){setEditId(p.id);setEditName(p.name);setEditHaelften((p.halfn||[]).join(", "));}} title="Bearbeiten"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-edit"/></button>
                    <button onClick={function(){handleToggle(p.id);}} title="Deaktivieren"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+GB,background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                    </button>
                    <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                      style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-trash"/></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inaktiv */}
      {plaetze.some(function(p){return !p.active;})&&(
        <>
          <div style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,paddingLeft:2}}>Inaktive Plätze</div>
          <div style={{background:"#fff",border:"0.5px solid "+GB,borderRadius:12,overflow:"hidden",marginBottom:16,opacity:0.7}}>
            {plaetze.map(function(p,i){
              if(p.active) return null;
              return(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<plaetze.length-1?"0.5px solid "+GB:"none"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:"#ccc",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#888"}}>{p.name}</div>
                    {p.halfn&&p.halfn.length>0&&(
                      <div style={{fontSize:10,color:"#bbb"}}>{p.halfn.join("  ·  ")}</div>
                    )}
                  </div>
                  <button onClick={function(){handleToggle(p.id);}} title="Aktivieren"
                    style={{padding:"4px 10px",borderRadius:20,border:"0.5px solid "+GN,background:"#ECFDF5",color:GN,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    Aktivieren
                  </button>
                  <button onClick={function(){handleDelete(p.id);}} title="Löschen"
                    style={{width:28,height:28,borderRadius:6,border:"0.5px solid "+R+"30",background:RL,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti-trash"/></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Neuer Platz */}
      {showAdd&&(
        <div style={{background:"#fff",border:"1.5px solid "+BL,borderRadius:12,padding:"16px",display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:14}}>Neuer Platz</div>
          <input value={newName} onChange={function(e){setNewName(e.target.value);}} autoFocus
            placeholder="z.B. Platz Erlenbach"
            style={{padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:13,outline:"none"}}/>
          <div>
            <div style={{fontSize:10,color:"#888",marginBottom:4}}>Hälften (optional, kommagetrennt)</div>
            <input value={newHaelften} onChange={function(e){setNewHaelften(e.target.value);}}
              placeholder="z.B. Nordseite, Südseite"
              style={{width:"100%",padding:"8px 10px",border:"1px solid "+GB,borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleAdd}
              style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:BK,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Hinzufügen
            </button>
            <button onClick={function(){setShowAdd(false);setNewName("");setNewHaelften("");}}
              style={{padding:"9px 14px",borderRadius:8,border:"0.5px solid "+GB,background:"#fff",fontSize:13,cursor:"pointer"}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div style={{fontSize:11,color:"#aaa"}}>
        Inaktive Plätze erscheinen nicht in Dropdowns. Hälften mit Komma trennen.
      </div>
    </div>
  );
}

function DataCheckView(){
  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 18px"}}>Datenprüfung</h1>
      <InfoBox text="12 Mitglieder haben ihre Stammdaten seit über 6 Monaten nicht geprüft. Erinnerungen wurden versendet." color={AM}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,margin:"16px 0"}}>
        <Stat label="Prüfung fällig" value="12" color={AM}/>
        <Stat label="Unvollständig"  value="8"  color={R}/>
        <Stat label="Sync-Fehler"    value="5"  color="#888"/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:GR}}>
              {["Mitglied","Problem","Zuletzt geprüft","Aktion"].map((h,i)=>(
                <th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:600,color:"#777",fontSize:10,textTransform:"uppercase",letterSpacing:0.4}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {n:"Anna Meier",   p:"Prüfung fällig",  d:"Nov 2024"},
              {n:"Sara Huber",   p:"Adresse unvollst.",d:"Jan 2026"},
              {n:"Sabine Koch",  p:"Sync-Fehler",      d:"Dez 2024"},
              {n:"Beat Keller",  p:"Prüfung fällig",   d:"Okt 2024"},
            ].map((r,i)=>(
              <tr key={i} style={{borderTop:`0.5px solid ${GB}`}}>
                <td style={{padding:"9px 13px",fontWeight:600}}>{r.n}</td>
                <td style={{padding:"9px 13px"}}><Chip text={r.p} color={r.p.includes("Sync")?R:AM} bg={r.p.includes("Sync")?RL:"#FFFBEB"}/></td>
                <td style={{padding:"9px 13px",color:"#888"}}>{r.d}</td>
                <td style={{padding:"9px 13px"}}><Btn small>Erinnerung</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ==========================================
   APP ROOT
========================================== */
function MobileNav({role,active,setActive}){
  const nav=NAV_BY_ROLE[role]||[];
  return(
    <nav style={{position:"fixed",bottom:0,left:0,right:0,background:BK,borderTop:"1px solid #252525",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -4px 20px rgba(0,0,0,0.3)"}}>
      <div style={{display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        {nav.map(n=>(
          <button key={n.key} onClick={()=>setActive(n.key)}
            style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 14px",background:"none",border:"none",cursor:"pointer",gap:3,minWidth:72}}>
            <i className={n.icon||"ti-circle"} style={{fontSize:22}}/>
            <span style={{fontSize:10,color:active===n.key?"#f8de09":"#666",fontWeight:active===n.key?700:400,whiteSpace:"nowrap"}}>{n.label}</span>
            {active===n.key&&<span style={{width:4,height:4,borderRadius:"50%",background:"#f8de09",marginTop:1}}/>}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ── LOGIN SCREEN ─────────────────────────────────────── */
function LoginScreen({onLogin, sb}){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [resetSent,setResetSent]=useState(false);
  const [showReset,setShowReset]=useState(false);

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {data,error:err}=await sb.auth.signInWithPassword({email,password:pw});
      if(err) throw err;
      onLogin(data.session);
    }catch(err){
      setError(err.message==="Invalid login credentials"
        ?"E-Mail oder Passwort falsch."
        :err.message||"Fehler beim Einloggen.");
    }
    setLoading(false);
  }

  async function handleReset(e){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {error:err}=await sb.auth.resetPasswordForEmail(email,{
        redirectTo: window.location.origin
      });
      if(err) throw err;
      setResetSent(true);
    }catch(err){
      setError(err.message||"Fehler beim Senden.");
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100vh",background:GR,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:400,padding:"0 20px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:"#f8de09",borderRadius:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:12}}><i className="ti-ball-football"/></div>
          <div style={{fontWeight:800,fontSize:22,color:BK}}>FC Herrliberg</div>
          <div style={{fontSize:13,color:"#888",marginTop:2}}>Vereinsportal</div>
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:28,boxShadow:"0 2px 16px rgba(0,0,0,0.08)"}}>
          {!showReset ? (
            <>
              <div style={{fontWeight:700,fontSize:16,color:BK,marginBottom:20}}>Anmelden</div>
              <form onSubmit={handleLogin}>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5}}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                    placeholder="name@fcherrliberg.ch" autoComplete="email"/>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5}}>Passwort</label>
                  <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                    placeholder="••••••••" autoComplete="current-password"/>
                </div>
                {error&&<div style={{fontSize:12,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:"#f8de09",color:BK,fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird angemeldet…":"Anmelden"}
                </button>
              </form>
              <button onClick={()=>{setShowReset(true);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",textAlign:"center"}}>
                Passwort vergessen?
              </button>
            </>
          ) : (
            <>
              <div style={{fontWeight:700,fontSize:16,color:BK,marginBottom:6}}>Passwort zurücksetzen</div>
              <div style={{fontSize:12,color:"#888",marginBottom:20}}>Wir senden dir einen Link per E-Mail.</div>
              {resetSent ? (
                <div style={{fontSize:13,color:GN,background:"#ECFDF5",padding:"12px",borderRadius:8,textAlign:"center"}}>
                  E-Mail gesendet! Bitte prüfe dein Postfach.
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5}}>E-Mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box"}}
                      placeholder="name@fcherrliberg.ch"/>
                  </div>
                  {error&&<div style={{fontSize:12,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                  <button type="submit" disabled={loading}
                    style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:"#f8de09",color:BK,fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    {loading?"Wird gesendet…":"Link senden"}
                  </button>
                </form>
              )}
              <button onClick={()=>{setShowReset(false);setResetSent(false);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Portal({supabaseClient}){
  const sbRef = useRef(supabaseClient||supabase||null);
  const sb = sbRef.current;
  const [session,setSession]=useState(sb ? undefined : null); // null wenn kein Supabase
  const [dbUser,setDbUser]=useState(null);
  const [accountKey,setAccountKey]=useState("trainer");
  const [activeSubRole,setActiveSubRole]=useState(null);
  const [active,setActive]=useState("dashboard");
  const isMobile=useIsMobile(); // MUSS vor allen Early Returns stehen
  // Auth-Session beim Start prüfen
  useEffect(()=>{
    if(!sb){ setSession(null); return; }
    sb.auth.getSession().then(({data:{session}})=>{
      setSession(session||null);
      if(session) loadDbUser(session.user.id, session.user.email);
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange(function(_,session){
      setSession(session||null);
      if(session) loadDbUser(session.user.id, session.user.email);
      else setDbUser(null);
    });
    return function(){ subscription.unsubscribe(); };
  },[]);

  async function loadDbUser(uid, email){
    try {
      const {data, error} = await sb.from("benutzer").select("*").eq("id",uid).single();
      if(data){
        setDbUser(data);
      } else {
        // Kein Eintrag oder RLS-Fehler → Fallback
        console.warn("[FCH] benutzer nicht gefunden:", error?.message);
        setDbUser({id:uid, email:email||"", role:"administrator", teams:[], name:email||"Benutzer"});
      }
    } catch(e) {
      console.warn("[FCH] loadDbUser error:", e.message);
      setDbUser({id:uid, email:email||"", role:"administrator", teams:[], name:email||"Benutzer"});
    }
  }

  async function handleLogout(){
    if(supabase) await sb.auth.signOut();
    setSession(null); setDbUser(null); setActive("dashboard");
  }

  // Lade-Screen (initial oder während dbUser lädt nach Login)
  if(session===undefined){
    return(
      <div style={{minHeight:"100vh",background:GR,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:48,height:48,background:"#f8de09",borderRadius:12,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:12}}><i className="ti-ball-football"/></div>
          <div style={{fontSize:13,color:"#888"}}>Wird geladen…</div>
        </div>
      </div>
    );
  }

  // Login-Screen wenn nicht eingeloggt (oder kein Supabase)
  if(sb && !session){
    return <LoginScreen sb={sb} onLogin={s=>setSession(s)}/>;
  }

  // Rolle aus DB-User oder Demo-Fallback
  const effectiveAccountKey = dbUser ? "db_user" : accountKey;
  const dbAccount = dbUser ? {
    name: dbUser.name||dbUser.email||"Benutzer",
    rollen: [dbUser.role||"spieler"],
    primaryRole: dbUser.role||"spieler",
    kinder: [],
    teams: dbUser.teams||[],
    email: dbUser.email||"",
  } : null;

  const account = dbAccount || USER_ACCOUNTS[accountKey] || USER_ACCOUNTS.trainer;
  const rawRole = activeSubRole || account.primaryRole || "spieler";
  // Normalisiere Rolle (DB hat evtl. "funktionär" mit Umlaut)
  const role = rawRole.toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue");
  const kinder = account.kinder||[];
  const spielerTeam = account.teams?.length>0 ? account.teams : [];
  const trainerTeams = account.teams||["Cc-Junioren"];
  const meineTeams = role==="trainer"
    ? trainerTeams
    : kinder.length>0 ? [...new Set(kinder.map(k=>k.team))]
    : spielerTeam.length>0 ? spielerTeam : ["Cc-Junioren"];
  const myRosterId = account.rosterId||(role==="spieler"?1:role==="eltern"?1:role==="trainer"?200:null);

  const handleAccountChange=(key)=>{
    setAccountKey(key);
    setActiveSubRole(null);
    setActive("dashboard");
  };

  const getView=()=>{
    const na=NAV_BY_ROLE[role]||[];
    if(!na.find(n=>n.key===active)) return <Dashboard role={role} setActive={setActive}/>;
    switch(active){
      case "dashboard":         return <Dashboard role={role} setActive={setActive} account={account} meineTeams={meineTeams} myRosterId={myRosterId}/>;
      case "team":              return <TeamView role={role} trainerTeams={trainerTeams} setActive={setActive} myRosterId={myRosterId} account={account}/>;
      case "members":           return <MembersView role={role}/>;
      case "users":             return <PortalverwaltungView initialTab="users"/>;
      case "fieldvis":          return <PortalverwaltungView initialTab="feldvis"/>;
      case "portal":            return <PortalverwaltungView initialTab="module"/>;
      case "training":          return <TrainingGantt role={role} team={role==="trainer"?meineTeams?.[0]:undefined}/>;
      case "schedule":          return <ScheduleTab role={role}/>;
      case "attendance_central":return <AttendanceCentral/>;
      case "events":            return <div style={{maxWidth:900}}><h1 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Termine</h1><p style={{fontSize:13,color:"#888",margin:"0 0 18px"}}>Bitte alle notwendigen Termine zu- oder absagen.</p><AttendanceTab role={role} team={meineTeams?.[0]||"Cc-Junioren"} allTeams={meineTeams} myRosterId={myRosterId} account={account} setActive={setActive} onNavigateToSpiel={(spiel)=>{NAV_TARGET.tab="spielplan";NAV_TARGET.selectedSpiel=spiel;setActive("team");}}/></div>;
      case "helpers":           return <HelpersList role={role} meineTeams={meineTeams} account={account}/>;
      case "buses":             return <BusesView/>;
      case "material":          return <MaterialView/>;
      case "lockers":           return <LockersView/>;
      case "media":             return <MediaView/>;
      case "news":              return <NewsView role={role} meineTeams={meineTeams}/>;
      case "wiki":              return <WikiView/>;
      case "docs":              return <DocsView/>;
      case "exports":           return <PortalverwaltungView initialTab="api"/>;
      case "sync":              return <PortalverwaltungView initialTab="api"/>;
      case "audit":             return <PortalverwaltungView initialTab="audit"/>;
      case "datacheck":         return <PortalverwaltungView initialTab="module"/>;
      case "profile":           return <ProfileView role={role} myRosterId={myRosterId} account={account}/>;
      default:                  return <Dashboard role={role} setActive={setActive}/>;
    }
  };

  return(
    <div style={{display:"flex",minHeight:"100vh",background:GR,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      {!isMobile&&<SideNav role={role} active={active} setActive={setActive} account={account}/>}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <TopBar role={role} active={active} setActive={setActive}
          account={account} activeSubRole={activeSubRole} setActiveSubRole={setActiveSubRole}
          onRoleChange={(key)=>handleAccountChange(key)} isMobile={isMobile}
          onLogout={sb&&session ? handleLogout : undefined}/>
        <main style={{flex:1,padding:isMobile?"16px 14px 90px":"28px 32px 28px",overflowY:"auto",overflowX:"hidden",maxWidth:isMobile?"100%":1300,margin:"0 auto",width:"100%"}}>{getView()}</main>
        {isMobile&&<MobileNav role={role} active={active} setActive={setActive}/>}
      </div>
    </div>
  );
}
