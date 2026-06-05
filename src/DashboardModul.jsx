/* ═══════════════════════════════════════════════════════════════
   ClubCampus DashboardModul — DashboardModul.jsx
   Dashboard-Ansichten für alle Rollen
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { FONT, BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK, GB } from "./constants.js";
import { TI } from "./icons.jsx";
import { Card, Chip, H1, InfoBox, Row, STitle, Stat, useIsMobile , Btn} from "./theme.jsx";
import { ATT_EVENTS, ATT_INITIAL, ATT_LOG, BUSES, EVENTS, HELPERS, HELPER_EVENTS, POLLS, ROSTER, TABLES } from "./demoData.js";

/* ── Shared navigation target ── */
const NAV_TARGET={tab:null,filter:null,kindTeam:null,openEvId:null,selectedSpiel:null};

function Dashboard({role,setActive,account,meineTeams,myRosterId}){
  if(role==="administrator")  return <DashboardAdmin setActive={setActive} account={account}/>;
  if(role==="administration") return <DashboardAdministration setActive={setActive} account={account}/>;
  if(role==="funktionaer")    return <DashboardFunktionaer setActive={setActive} account={account}/>;
  if(role==="trainer")        return <DashboardTrainer setActive={setActive} account={account} trainerTeams={meineTeams} myRosterId={myRosterId}/>;
  if(role==="spieler")        return <DashboardSpieler account={account} meineTeams={meineTeams} myRosterId={myRosterId} setActive={setActive}/>;
  if(role==="eltern")         return <DashboardEltern account={account} meineTeams={meineTeams} setActive={setActive}/>;
  return null;
}

function DashboardAdmin({setActive,account}){
  const isMobile=useIsMobile();
  const vorname=(account?.name||"Administrator").split(" ")[0];
  return(
    <div>
      <H1 style={{fontSize:24}} mb={4}>Hallo, {vorname}</H1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px",fontWeight:400}}>ClubCampus – Systemübersicht</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:24}}>
        <Stat label="Mitglieder total" value="187" sub="Fairgate synchronisiert" semantic="primary" icon="users"/>
        <Stat label="Aktive Benutzer" value="134" sub="in den letzten 30 Tagen" semantic="info" icon="user"/>
        <Stat label="Sync-Fehler" value="2" sub="Fairgate / FVRZ" semantic="danger" icon="refresh"/>
        <Stat label="Offene Datenprüfungen" value="12" sub="Mitglieder fällig" semantic="warning" icon="clipboard-list"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Systemstatus</STitle>
          {[
            {label:"Fairgate-Sync",     status:"OK",     last:"vor 2h",       ok:true},
            {label:"FVRZ-Sync",         status:"Fehler", last:"vor 4h",       ok:false},
            {label:"E-Mail-Versand",    status:"OK",     last:"vor 30min",    ok:true},
            {label:"Push-Benachricht.", status:"OK",     last:"active",        ok:true},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13,fontWeight:600}}>{s.label}</span>
              <Row>
                <span style={{fontSize:13,color:"var(--sub)"}}>{s.last}</span>
                <Chip text={s.status} color={s.ok?GN:R} bg={s.ok?"#ECFDF5":RL}/>
              </Row>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Benutzer &amp; Rollen</STitle>
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
              <div style={{fontSize:13,color:"var(--sub)"}}>{c.conflict}</div>
            </div>
          ))}
          <InfoBox text="2 Konflikte müssen manuell aufgelöst werden." semantic="danger"/>
        </Card>
        <Card>
          <STitle>Letzte Audit-Einträge</STitle>
          {[
            {action:"Export Mitgliederliste",user:"Sandra Berger",time:"14:22"},
            {action:"Fairgate-Sync manuell", user:"Admin User",  time:"12:00"},
            {action:"Rolle geändert",         user:"Admin User",  time:"10:45"},
          ].map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.action}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{a.user} · {a.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardAdministration({setActive,account}){
  const isMobile=useIsMobile();
  return(
    <div>
      <H1 style={{fontSize:24}} mb={4}>Hallo, {(account?.name||"Nutzer").split(" ")[0]}</H1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px"}}>ClubCampus – Übersicht</p>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Administration · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Mitglieder total" value="187" semantic="info"/>
        <Stat label="Datenprüfung fällig" value="12" semantic="danger" sub="halbjährliche Prüfung"/>
        <Stat label="Sync-Fehler" value="2" semantic="warning"/>
        <Stat label="Offene Materialanfragen" value="3" semantic="neutral"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle action={<Btn variant="ghost" onClick={()=>setActive("members")}>Alle →</Btn>}>Datenprüfstatus</STitle>
          {[{label:"Vollständig",n:162,c:GN},{label:"Prüfung fällig",n:12,c:AM},{label:"Unvollständig",n:8,c:R},{label:"Sync-Fehler",n:5,c:"#888"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.label}</span>
              <Chip text={x.n} color={x.c} bg={x.c+"18"}/>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Fairgate &amp; FVRZ Sync</STitle>
          {[{s:"Fairgate-Import",ok:true,last:"vor 2h"},{s:"FVRZ-Spielplan",ok:false,last:"Fehler"},{s:"Rückschreiben",ok:true,last:"vor 6h"}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <span style={{fontSize:13}}>{x.s}</span>
              <Chip text={x.ok?"OK":x.last} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
            </div>
          ))}
          <InfoBox text="FVRZ-Sync: Verbindungsfehler. Manuelle Überprüfung erforderlich." semantic="danger"/>
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71},{t:"Aktive 1",pct:68}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<3?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{x.t}</span>
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
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <Chip text={`✓ ${e.res?.y}`} semantic="success" bg="#ECFDF5"/>
                <Chip text={`✕ ${e.res?.n}`} semantic="danger" bg={RL}/>
                <Chip text={`? ${e.res?.o}`} semantic="warning" bg="#FFFBEB"/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function DashboardFunktionaer({setActive,account}){
  const isMobile=useIsMobile();
  return(
    <div>
      <H1 style={{fontSize:24}} mb={4}>Hallo, {(account?.name||"Nutzer").split(" ")[0]}</H1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 24px"}}>ClubCampus – Übersicht</p>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Funktionär / Vorstand · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Offene Rückmeldungen" value="22" semantic="danger"/>
        <Stat label="Helfer-Soll erfüllt" value="61%" semantic="warning"/>
        <Stat label="Vereinsbusse heute" value="1" semantic="info" sub="Bus A reserviert"/>
        <Stat label="Offene Materialanfragen" value="3" semantic="neutral"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Kommende Vereinsanlässe</STitle>
          {EVENTS.map((e,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:i<EVENTS.length-1?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,fontSize:13}}>{e.title}</span>
                <Chip text={e.type==="Vereinsanlass"?"Verein":"Team"} color={e.type==="Vereinsanlass"?R:BL}/>
              </div>
              <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time+" Uhr"}</div>
            </div>
          ))}
        </Card>
        <Card>
          <STitle>Zentrale Anwesenheitsstatistik</STitle>
          {[{t:"Cc-Junioren",pct:77},{t:"D-Junioren",pct:82},{t:"A-Junioren",pct:71}].map((x,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{x.t}</span>
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
              <div style={{fontSize:13,color:"var(--sub)"}}>{r.bus} · {r.purpose}</div>
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
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Guten Morgen, {firstName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Trainer · {trainerTeams.join(" & ")} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Nächstes Training" value={nextTrain?nextTrain.date.replace(/^\w+\s/,""):"-"} sub={nextTrain?`${nextTrain.time} Uhr · ${nextTrain.location}`:"Kein Training"} semantic="success"/>
        <Stat label="Nächstes Spiel"    value={nextSpiel?nextSpiel.date.replace(/^\w+\s/,""):"-"} sub={nextSpiel?`${nextSpiel.time} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel"} semantic="info"/>
        <Stat label="Ø Anwesenheit"     value="77%"      sub="letzte 5 Trainings"   semantic="success"/>
        <Stat label="Tabellenrang"      value={myRow?myRow.rank+".":"-"} sub={myRow?TABLES[team]?.length+" Teams · "+myRow.pts+" Punkte":"Keine Tabelle"} semantic="info"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle action={<Chip text={upcoming.filter(e=>e.rsvp!==false).length+" offen"} semantic="danger"/>}>Fehlende Rückmeldungen</STitle>
          {upcoming.filter(e=>e.rsvp!==false).slice(0,3).map((x,i,arr)=>{
            const teamPids=ROSTER.filter(p=>(p.teams||[]).includes(team)&&!p.role).map(p=>p.id);
            const missing=teamPids.filter(pid=>!ATT_INITIAL[x.id]?.[pid]?.status).length;
            return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<arr.length-1?`0.5px solid ${GB}`:"none"}}>
                <span style={{fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</span>
                {missing>0&&<Chip text={`${missing} fehlen`} semantic="warning" bg="#FEF3C7"/>}
                {missing===0&&<Chip text="✓ Vollständig" semantic="success" bg="#ECFDF5"/>}
              </div>
            );
          })}
        </Card>
        <Card>
          <STitle>Anwesenheit letzte Anlässe</STitle>
          {ATT_LOG.slice(0,3).map((a,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<2?`0.5px solid ${GB}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:600}}>{a.date} <Chip text={a.type} color={a.type==="Spiel"?BL:GN}/></span>
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
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                  <span style={{fontWeight:600}}>{e.name} <span style={{color:"var(--sub)"}}>{e.time+" Uhr"}</span></span>
                  <span style={{color:filled<max?R:GN,fontWeight:700}}>{filled}/{max}</span>
                </div>
                <div style={{height:5,background:GB,borderRadius:4}}>
                  <div style={{height:"100%",width:`${filled/max*100}%`,background:filled<max?R:GN,borderRadius:4}}/>
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
              <Chip text={p.target} semantic="info"/>
            </div>
          ))}
          <div style={{padding:"8px 0",borderTop:"0.5px solid var(--border)",marginTop:6}}>
            <div style={{fontWeight:600,fontSize:13}}>Vereinsbus reserviert ✓</div>
            <div style={{fontSize:13,color:"var(--sub)"}}>Bus A · Sa 24.05. · 09:00-14:00</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardSpieler({account,meineTeams,myRosterId,setActive}){
  const isMobile=useIsMobile();
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
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Hallo, {firstName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Spieler · {team} · Freitag, 23. Mai 2026</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",gap:12,marginBottom:20}}>
        <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={pastEvs.length?zuCount+"/"+pastEvs.length+" Trainings":"Noch keine vergangenen"} color={attColor}/>
        <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} semantic="success"/>
        <Stat label="Nächstes Spiel" value={nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextSpiel?`${(nextSpiel.time||"").slice(0,5)} Uhr · ${nextSpielAufgebotStatus}`:nextSpielAufgebotStatus} color={nextSpielImAufgebot?"#4F46E5":nextSpiel?BL:"#aaa"}/>
        <Stat label="Helfereinsätze" value={helferSoll>0?helferGeleistet+"/"+helferSoll:"-"} sub={helferSoll>0?"Geleistet / Soll":"Keine Einsätze"} color={helferSoll>0?(helferOffen===0?GN:AM):"#aaa"}/>
      </div>
      {/* Aufgebot-Banner */}
      {nextAufgebot&&(
        <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.openEvId=nextAufgebot.id;setActive("team");}:undefined}
          style={{background:"var(--surface)",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
          <span style={{fontSize:24}}><TI n="ball-football"/></span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14,color:"var(--cc-accent)"}}>Du bist im Aufgebot!</div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
              {`vs. ${nextAufgebot.opponent} · ${nextAufgebot.date} · ${nextAufgebot.time} Uhr`}
            </div>
            {nextAufgebot.treffpunkt&&<div style={{fontSize:13,color:"var(--sub)",marginTop:3}}><TI n="target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebot.treffpunkt}</div>}
          </div>
          <Chip text="Aufgebot" color="#4F46E5" bg="#EEF2FF"/>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card>
          <STitle>Meine nächsten Termine</STitle>
          {(()=>{
            const upcoming=ATT_EVENTS.filter(e=>(e.team===team||e.subtype==="Vereinsanlass")&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date))).slice(0,3);
            if(upcoming.length===0) return <div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Termine.</div>;
            return upcoming.map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{t.opponent?"vs. "+t.opponent:t.type==="Training"?"Training · "+t.team:t.title||t.type}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{t.date} · {t.time+" Uhr"}</div>
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
            if(open.length===0) return <div style={{fontSize:13,color:GN,fontWeight:600}}>✓ Alle Termine beantwortet</div>;
            return open.map((x,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:i<open.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{fontWeight:600,fontSize:13}}>{x.opponent?"Spiel vs. "+x.opponent:x.title||x.type} · {x.date}</div>
                <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>Rückmeldung ausstehend</div>
              </div>
            ));
          })()}
        </Card>
        <Card>
          <STitle>Offene Abstimmungen</STitle>
          {POLLS.filter(p=>!p.closed).map((p,i)=>(
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{p.title}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {p.options.map((opt,j)=>(
                  <Btn small>{opt}</Btn>
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
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface2)",borderRadius:10,marginBottom:14}}>
                <div style={{fontSize:24,fontWeight:800,color:helferOffen===0&&helferSoll>0?GN:helferSoll>0?AM:"#aaa",lineHeight:1}}>
                  {helferSoll>0?helferGeleistet+"/"+helferSoll:"-"}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Geleistet / Soll</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{geplant>0?geplant+" ausstehend":helferOffen===0&&helferSoll>0?"Alle erfüllt ✓":"Keine Einsätze"}</div>
                </div>
              </div>
            );
          })()}
          {meineSchichtenMitDatum.length===0&&<div style={{fontSize:13,color:"var(--sub)",marginBottom:8}}>Keine Helfereinsätze zugeteilt.</div>}
          {meineSchichtenMitDatum.filter(s=>parseDate2(s.einsatzDate)>=today).map((s,i)=>(
            <div key={i} style={{padding:"9px 11px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface)",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:13,color:"var(--sub)"}}>{s.einsatzName||""}</div>
                  <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>{""+s.einsatzDate+" · "+(s.location||"")}</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"var(--surface)",color:AM,border:`0.5px solid ${AM}`,flexShrink:0}}>Ausstehend</span>
              </div>
            </div>
          ))}
          <InfoBox text="Datenprüfung: Deine Stammdaten wurden zuletzt vor 7 Monaten geprüft. Bitte überprüfen." semantic="warning"/>
        </Card>
      </div>
    </div>
  );
}

function DashboardEltern({account,meineTeams,setActive}){
  const isMobile=useIsMobile();
  const parentName=account?.name?.split(" ")[0]||"Elternteil";
  /* Stufen-Checks */
  const darfAnmelden=kannSchreiben?kannSchreiben("events"):true;
  const darfVerwalten=kannVerwalten?kannVerwalten("events"):isTrainer||isAdmin;
  const kinder=account?.kinder||[];
  const today="2026-05-23";
  const parseD=(d)=>{const c=(d||"").replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim();const p=c.split(".");return p.length>=2?`2026-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`:""};
  const [aufgebotState,setAufgebotState]=useState({});
  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get("aufgebot_state");if(r)setAufgebotState(JSON.parse(r.value));}catch(e){}})();
  },[]);

  return(
    <div>
      <h1 style={{fontSize:21,fontWeight:800,margin:"0 0 6px",color:"var(--text)",letterSpacing:-0.5}}>Hallo, {parentName}</h1>
      <p style={{color:"var(--sub)",fontSize:13,margin:"0 0 18px"}}>Elternteil · {kinder.map(k=>k.name.split(" ")[0]).join(" & ")} · Freitag, 23. Mai 2026</p>

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
              <div style={{width:6,height:28,borderRadius:4,background:ACCENT,flexShrink:0}}/>
              <h2 style={{margin:0,fontSize:16,fontWeight:800}}>{vorname} <span style={{fontSize:13,color:"var(--sub)",fontWeight:600}}>· {team}</span></h2>
            </div>

            {/* Stat-Kacheln */}
            {(()=>{
              const nextSpiel=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Spiel"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              const nextTraining=ATT_EVENTS.filter(e=>e.team===team&&e.type==="Training"&&parseD(e.date)>=today).sort((a,b)=>parseD(a.date).localeCompare(parseD(b.date)))[0];
              return(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:14}}>
                  <Stat label="Ø Anwesenheit Trainings" value={attPct!==null?attPct+"%":"-"} sub={attTotal?zuCount+"/"+attTotal+" Trainings":"Noch keine"} color={attColor}/>
                  <Stat label="Nächstes Training" value={nextTraining?nextTraining.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"} sub={nextTraining?`${nextTraining.time.slice(0,5)} Uhr · ${nextTraining.location}`:"Kein Training geplant"} semantic="success"/>
                  {(()=>{
                    const imAufgebot=nextSpiel&&(aufgebotState[nextSpiel.id]||[]).includes(rosterId);
                    return(
                      <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:14,padding:"16px 18px",flex:1,minWidth:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:4,position:"relative"}}>
                        <div style={{fontSize:13,color:"var(--sub)",fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Nächstes Spiel</div>
                        <div style={{fontSize:24,fontWeight:800,color:BL,lineHeight:1}}>{nextSpiel?nextSpiel.date.replace(/^[A-Za-zÄÖÜäöü]{2,3}\s+/,"").trim():"-"}</div>
                        <div style={{fontSize:13,color:"var(--sub)",fontWeight:600}}>{nextSpiel?`${nextSpiel.time.slice(0,5)} Uhr · vs. ${nextSpiel.opponent}`:"Kein Spiel geplant"}</div>
                        {imAufgebot&&<span style={{position:"absolute",bottom:10,right:12,fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"var(--surface)",color:"var(--cc-accent)",border:"0.5px solid #818CF840"}}><TI n="ball-football" style={{marginRight:4}}/> Im Aufgebot</span>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Aufgebot-Banner */}
            {nextAufgebotSpiel&&(
              <div onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;NAV_TARGET.openEvId=nextAufgebotSpiel.id;setActive("team");}:undefined}
                style={{background:"var(--surface)",border:"1.5px solid #818CF8",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12,cursor:setActive?"pointer":"default"}}>
                <span style={{fontSize:24}}><TI n="ball-football"/></span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"var(--cc-accent)"}}>{vorname} ist im Aufgebot!</div>
                  <div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>
                    {`vs. ${nextAufgebotSpiel.opponent} · ${nextAufgebotSpiel.date} · ${nextAufgebotSpiel.time} Uhr`}
                  </div>
                  {nextAufgebotSpiel.treffpunkt&&<div style={{fontSize:13,color:"var(--sub)",marginTop:3}}><TI n="target" style={{marginRight:3}}/> Treffpunkt: {nextAufgebotSpiel.treffpunkt}</div>}
                </div>
                <div style={{background:"#4F46E5",color:"#fff",fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:20}}>Aufgebot</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {/* Nächste 4 Trainings & Spiele */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["training","spiele"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Trainings & Spiele</STitle>
                {upcoming.length===0&&<div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Trainings oder Spiele.</div>}
                {upcoming.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<upcoming.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>
                        {e.type==="Training"?`Training · ${team}`:e.opponent?"vs. "+e.opponent:e.title||e.type}
                      </div>
                      <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time} Uhr · {e.location}</div>
                    </div>
                    <Chip text={e.type} color={accentFor(e)}/>
                  </div>
                ))}
              </Card>

              {/* Team-Events & Vereinsanlässe */}
              <Card style={{cursor:setActive?"pointer":"default"}} onClick={setActive?()=>{NAV_TARGET.tab="attendance";NAV_TARGET.filter=["team-event","vereinsanlass"];NAV_TARGET.kindTeam=team;setActive("team");}:undefined}>
                <STitle action={setActive&&<span style={{fontSize:13,color:BL,fontWeight:600}}>Alle →</span>}>{vorname} · Team-Events & Anlässe</STitle>
                {anlaesse.length===0&&<div style={{fontSize:13,color:"var(--sub)"}}>Keine anstehenden Anlässe.</div>}
                {anlaesse.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:i<anlaesse.length-1?`0.5px solid ${GB}`:"none",alignItems:"center"}}>
                    <div style={{width:3,height:30,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis"}}>{e.title||e.type}</div>
                      <div style={{fontSize:13,color:"var(--sub)"}}>{e.date} · {e.time} Uhr · {e.location}</div>
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
/* TeamModul via ./TeamModul.jsx */

export { Dashboard, DashboardAdmin, DashboardAdministration, DashboardFunktionaer, DashboardTrainer, DashboardSpieler, DashboardEltern };
