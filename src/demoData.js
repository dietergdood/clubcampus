/* ═══════════════════════════════════════════════════════════════
   ClubCampus Demo-Daten — demoData.js
   ⚠️  TEMPORÄR — wird gelöscht sobald Supabase-Anbindung fertig
   Ersetzen durch echte DB-Queries pro Modul
   ═══════════════════════════════════════════════════════════════ */

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
   p2Last:"",   p2First:"",  p2Email:"",   p2Tel:""}
]
/* Computed name field for backward compat */
ROSTER.forEach((p,i)=>{ p.name=`${p.firstName} ${p.lastName}`; p.address=`${p.street}, ${p.plz} ${p.city}`; p.parent=`${p.p1First} ${p.p1Last} / ${p.p1Tel}`; p.gruppe=p.teams[0]; if(!p.rueckennr) p.rueckennr=null; });

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
  {id:7,team:"1. Mannschaft Herren",date:"Sa 03.05.",time:"15:00",opponent:"FC Horgen",home:true,venue:"Sportanlage Aabach, Herrliberg",venueAddr:"Aabachstrasse 10, 8704 Herrliberg",comp:"1. Liga",liga:"1. Liga",spielNr:"2026-1MH-1007",status:"Gespielt",result:"1:0",htResult:"1:2",att:11,schiedsrichter:"Lukas Benz",delegierter:"-",notes:"",treffpunkt:"14:30 Sportanlage Aabach",stats:null}
]

const TABLES={
  "Cc-Junioren":[
  {rank:1,team:"FC Küsnacht",   sp:12,s:9,u:2,n:1,tore:"34:12",diff:22, pts:29,me:false},
  {rank:2,team:"FC Herrliberg", sp:12,s:8,u:2,n:2,tore:"28:14",diff:14, pts:26,me:true},
  {rank:3,team:"SC Männedorf",  sp:12,s:6,u:3,n:3,tore:"24:18",diff:6,  pts:21,me:false}
]};
/* Fallback for routes without team context */

const ATT_EVENTS=[];
/* Initial Zusagen/Absagen pro Ereignis und Spieler-ID
   status: "zu"|"ab"|"fraglich"|null  */

const ATT_INITIAL=(()=>{
  const init = {};
  return init;
})();

const ATT_LOG=[];

const GANTT=[];

const TRAININGSPLAETZE_DEFAULT = [
  {id:"hauptplatz_a", name:"Hauptplatz A",       active:true,  halfn:["Hüttliseite","Rappiseite"]},
  {id:"nebenplatz_b", name:"Nebenplatz B",        active:true,  halfn:["Bergseite","Seeseite"]},
  {id:"platz_c",      name:"Platz C",             active:true,  halfn:[]},
  {id:"halle",        name:"Turnhalle (Winter)",  active:false, halfn:[]},
  {id:"erlenbach",    name:"Platz Erlenbach",     active:false, halfn:[]},
];
// Runtime array — loaded from localStorage or default

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
    id:1,name:"Grümpelturnier 2026",date:"Sa 14.06.2026 - So 15.06.2026",loc:"Sportanlage Aabach",color:"var(--sub)",
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
    id:2,name:"Generalversammlung 2026",date:"Mi 25.06.2026",loc:"Mehrzweckhalle Herrliberg",color:"var(--sub)",
    einsaetze:[
      {id:201,name:"Empfang",date:"Mi 25.06.2026",time:"18:00-19:00",ort:"Eingang",gruppen:["Vorstand"],
       schichten:[{id:2001,label:"Empfang 18:00-19:00 Uhr",max:2,helfer:["Laura Imhof","Luca Meier"]}]},
      {id:202,name:"Apéro-Service",date:"Mi 25.06.2026",time:"20:30-22:00",ort:"Foyer",gruppen:["Alle"],
       schichten:[{id:2002,label:"Apéro 20:30-22:00 Uhr",max:4,helfer:["Anna Meier","Beat Keller"]}]},
    ]
  },
  {
    id:3,name:"Saisonstart-Apéro 2026",date:"Sa 05.04.2026",loc:"Vereinslokal Herrliberg",color:"var(--sub)",
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
    {team:"Cc-Junioren",start:16,end:18,day:"Sa",type:"Heim",color:"#C8102E"},
    {team:"A-Junioren",start:17,end:19.5,day:"Mi",type:"Heim",color:"#059669"},
  ]},
  {name:"Garderobe 2",assignments:[
    {team:"FC Küsnacht",start:16,end:18,day:"Sa",type:"Gast",color:"var(--sub)"},
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

const TEAMS_DATA_FALLBACK={
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
  /* dbTeams Array → Lookup-Objekt {name: {liga, saison, count}} */
  
const FUNKTIONEN = [
  "Spieler",
  "Trainer",
  "Assistent/in",
  "Goalietrainer",
  "Vorstand",
  "Kassier",
  "Materialwart",
  "Platzwart",
  "Schiedsrichter",
  "Elternteil",
  "Ehrenmitglied",
  "Passivmitglied",
  "Gönner",
  "Sonstige",
];

/* ── MITGLIEDTYPEN ─────────────────────────────────────────── */

const MITGLIEDTYPEN = [
  "Aktivmitglied",
  "Passivmitglied",
  "Ehrenmitglied",
  "Freimitglied",
  "Gönner",
];

export { ROSTER, USER_ACCOUNTS, SCHEDULE, TABLES, ATT_EVENTS, ATT_INITIAL, ATT_LOG, GANTT, TRAININGSPLAETZE_DEFAULT, EVENTS, POLLS, HELPER_GRUPPEN, HELPER_EVENTS, HELPERS, BUSES, MATERIAL, LOCKERS, MEDIA, MEMBERS, WIKI, NEWS, PSTATS, INITIAL_PLAENE, FUNKTIONEN, MITGLIEDTYPEN };
