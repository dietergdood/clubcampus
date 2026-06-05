/* ═══════════════════════════════════════════════════════════════
   ClubCampus TeamModul — TeamModul.jsx
   Team-Ansicht: Übersicht, Kader, Training, Spielplan etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { ACCENT, ACCENT2, ACCENT20, AM, BK, BL, BTN_COLOR as BTN, BTN_TXT, FONT, GB, GN, GR, R, RL, STATUS_BG, STATUS_CLR } from "./constants.js";
import { TI } from "./icons.jsx";
import { useIsMobile, InfoBox, Btn, Card, Chip, Av, Tabs, STitle , Between, Col, H1, Row, avColor, Stat} from "./theme.jsx";
import { ATT_EVENTS, ATT_INITIAL, EVENTS, NEWS, POLLS, ROSTER, TABLES } from "./demoData.js";

/* ── Hilfsfunktionen ── */
/* STitle via ./theme.jsx */

function kannHelferEinsatzErstellen(role, typ, team, meineTeams=[]){
  if(role==="administrator"||role==="administration"||role==="funktionaer") return true;
  if(role==="trainer") return typ==="team"&&(meineTeams||[]).includes(team);
  return false;
}

const NAV_TARGET={tab:null,filter:null,kindTeam:null,openEvId:null,selectedSpiel:null};

function TeamView({role,trainerTeams=["Cc-Junioren"],setActive,myRosterId,account,dbTeams=[],isModuleVisible,dbMitglieder=[],sb=null,KaderModul:KaderModulProp,TrainingsplanModul:TrainingsplanModulProp,TermineModul:TermineModulProp,SpielplanModul:SpielplanModulProp,TableTab:TableTabProp,HelferModul:HelferModulProp}){
  const isMobile=useIsMobile();
  /* Modul-Sichtbarkeit: Props oder Fallback alles sichtbar */
  const moduleOk=(modul)=>!isModuleVisible||isModuleVisible(modul)||!modul;

  /* Mitglieder für ein Team: aus DB wenn vorhanden, sonst ROSTER Fallback */
  const getMitgliederForTeam=(teamName)=>{
    if(dbMitglieder.length>0){
      return dbMitglieder
        .filter(m=>(m.teams||[]).includes(teamName)&&m.aktiv!==false)
        .map(m=>({
          id:        m.id,
          name:      `${m.vorname} ${m.nachname}`,
          firstName: m.vorname||"",
          lastName:  m.nachname||"",
          pos:       m.position||"-",
          rueckennr: "",
          dob:       m.geburtsdatum||"",
          nat:       m.nationalitaet||"CH",
          pass:      m.spielerpass||"",
          js:        m.js_nr||"",
          teams:     m.teams||[],
          role:      m.funktion||"",
          email:     m.email||"",
          tel:       m.telefon||"",
          eltern:    m.eltern||[],
          fairgate:  m.fairgate_id||"",
          ahv:       m.ahv_nr||"",
          street:    m.strasse||"",
          plz:       m.plz||"",
          city:      m.ort||"",
        }));
    }
    return ROSTER.filter(p=>(p.teams||[]).includes(teamName));
  };
  const [responses,setResponses]=useState(ATT_INITIAL);
  useEffect(()=>{
    (async()=>{
      try{
        const r=await window.storage.get("att_responses");
        if(r){
          const stored=JSON.parse(r.value);
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

  /* Teams-Daten: aus Supabase wenn vorhanden, sonst hardcoded Fallback */
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
  const TEAMS_DATA=dbTeams.length>0
    ? Object.fromEntries(dbTeams.map(t=>([t.name,{liga:t.liga||"",season:t.saison||"2024/25",count:ROSTER.filter(p=>(p.teams||[]).includes(t.name)).length||16}])))
    : TEAMS_DATA_FALLBACK;

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
  const teamInfo=TEAMS_DATA[activeTeam]||{count:0,liga:"",season:"2024/25"};
  const actualCount=dbMitglieder.length>0
    ? dbMitglieder.filter(p=>(p.teams||[]).includes(activeTeam)&&p.aktiv!==false).length
    : ROSTER.filter(p=>(p.teams||[]).includes(activeTeam)).length||teamInfo.count;

  const TABS_ALL=[
    {key:"overview",  label:"Übersicht",    short:"Übersicht", icon:"layout-dashboard"},
    {key:"roster",    label:"Kader",        short:"Kader",     icon:"users",            modul:"roster",   teamOnly:true},
    {key:"attendance",label:"Termine",      short:"Termine",   icon:"calendar",         modul:"events"},
    {key:"training",  label:"Trainingsplan",short:"Trainingsplan",  icon:"clock",            modul:"training"},
    {key:"spielplan", label:"Spielplan & Tabelle",short:"Spiele",icon:"flag",           modul:"spielplan",teamOnly:true},
    {key:"polls",     label:"Abstimmungen", short:"Polls",     icon:"speakerphone",     modul:"polls",    teamOnly:true},
    {key:"helpers",   label:"Helfereinsätze",short:"Helfer",   icon:"heart-handshake",  modul:"helpers"},
    {key:"stats",     label:"Statistik",    short:"Stats",     icon:"chart-bar",        modul:"stats",    teamOnly:true},
  ];
  const TABS_LIMITED=[
    {key:"overview",  label:"Übersicht",    short:"Übersicht", icon:"layout-dashboard"},
    {key:"roster",    label:"Kader",        short:"Kader",     icon:"users",            modul:"roster",   teamOnly:true},
    {key:"attendance",label:"Termine",      short:"Termine",   icon:"calendar",         modul:"events"},
    {key:"spielplan", label:"Spielplan & Tabelle",short:"Spiele",icon:"flag",           modul:"spielplan",teamOnly:true},
    {key:"polls",     label:"Abstimmungen", short:"Polls",     icon:"speakerphone",     modul:"polls",    teamOnly:true},
    {key:"helpers",   label:"Helfereinsätze",short:"Helfer",   icon:"heart-handshake",  modul:"helpers"},
  ];

  /* Aktives Team-Objekt aus dbTeams → module_aktiv */
  const activeTeamObj=dbTeams.find(t=>t.name===activeTeam)||null;
  const teamModuleAktiv=activeTeamObj?.module_aktiv||null; // null = alle aktiv

  /* Tabs filtern:
     - teamOnly=true → nur team_module prüfen (nicht modul_rechte)
     - teamOnly=false/undefined → portal-Modul: moduleOk + team_module */
  const filterTabs=(tabList)=>tabList.filter(t=>{
    if(!t.modul) return true;
    const inTeamModule=!teamModuleAktiv||teamModuleAktiv.includes(t.modul);
    if(t.teamOnly) return inTeamModule;
    return moduleOk(t.modul)&&inTeamModule;
  });
  const tabs=filterTabs(limited?TABS_LIMITED:TABS_ALL);
  const [tab,setTab]=useState(()=>{const t=NAV_TARGET.tab||"overview";NAV_TARGET.tab=null;return t;});
  const [showMehrTab,setShowMehrTab]=useState(false);
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
      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:hasMultiTeams?10:isMobile?14:18}}>
        <div style={{width:6,height:isMobile?36:44,borderRadius:3,background:ACCENT,flexShrink:0,marginTop:2}}/>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontSize:isMobile?17:21,fontWeight:800,margin:0,letterSpacing:-0.3,whiteSpace:isMobile?"nowrap":"normal",overflow:"hidden",textOverflow:"ellipsis"}}>
            {isEltern?`${kinderNames}${activeKind?.team?" · "+activeKind.team:""}`:`${activeTeam}`}
          </h1>
          <p style={{color:"var(--sub)",margin:"2px 0 0",fontSize:12,display:"flex",flexWrap:"wrap",gap:"0 8px"}}>
            {isEltern&&<span>Elternzugang</span>}
            <span>{actualCount} Spieler</span>
            <span>Saison {teamInfo.season}</span>
            <span>{teamInfo.liga}</span>
          </p>
        </div>
      </div>

      {/* Kind-Selektor (nur wenn Eltern mehrere Kinder haben) */}
      {hasMultiKinder&&(
        <div style={{display:"flex",gap:8,marginBottom:18,padding:"12px 14px",background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",flexWrap:"wrap",alignItems:"center"}}>
          <span className="cc-section-hdr" style={{marginRight:4,borderBottom:"none",padding:0}}>Kind:</span>
          {kinder.map((k,i)=>{
            const active=activeKind?.name===k.name;
            const cnt=ROSTER.filter(p=>(p.teams||[]).includes(k.team)&&!p.role).length;
            const info=TEAMS_DATA[k.team]||{liga:"",season:""};
            return(
              <Btn onClick={()=>handleKindSwitch(k)}><div style={{width:22,height:22,borderRadius:"50%",background:active?"rgba(0,0,0,0.1)":GR,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"var(--text)",flexShrink:0}}> {k.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} </div> <div style={{textAlign:"left"}}> <div style={{fontSize:14,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>{k.name.split(" ")[0]}</div> <div style={{fontSize:14,color:"rgba(0,0,0,0.5)"}}>{k.team} · {info.liga}</div> </div></Btn>
            );
          })}
        </div>
      )}

      {/* Team-Selektor (Trainer) */}
      {hasMultiTeams&&(
        <div style={{marginBottom:14,background:"var(--surface)",borderRadius:12,border:"0.5px solid var(--border)",overflow:"hidden"}}>
          <div className="cc-section-hdr" style={{padding:"8px 10px",marginBottom:0}}>Team wechseln</div>
          <div style={{display:"flex",gap:6,padding:"10px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
            {trainerTeams.map(team=>{
              const info=TEAMS_DATA[team]||{count:18,liga:"Liga A"};
              const isActive=activeTeam===team;
              const cnt=ROSTER.filter(p=>(p.teams||[]).includes(team)).length||info.count;
              return(
                <Btn onClick={()=>handleTeamSwitch(team)}><div style={{width:28,height:28,borderRadius:"50%",background:isActive?ACCENT:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:isActive?"#111":"var(--sub)",flexShrink:0}}> {team.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} </div> <div style={{textAlign:"left",minWidth:0}}> <div style={{fontSize:14,fontWeight:700,color:"var(--text)",whiteSpace:"nowrap"}}>{team}</div> <div style={{fontSize:11,color:"var(--sub)"}}>{cnt} · {info.liga}</div> </div></Btn>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB-BAR: Desktop = scroll, Mobile = 4 Icons + Mehr ── */}
      {isMobile?(()=>{
        /* Primär-Tabs pro Rolle */
        const PRIMARY_KEYS={
          spieler:       ["overview","roster","attendance","spielplan"],
          eltern:        ["overview","roster","attendance","spielplan"],
          trainer:       ["overview","roster","attendance","spielplan"],
          administrator: ["overview","roster","attendance","spielplan"],
          administration:["overview","roster","attendance","spielplan"],
          vorstand:      ["overview","roster","attendance","spielplan"],
          funktionaer:   ["overview","roster","attendance","spielplan"],
        };
        const primKeys=new Set(PRIMARY_KEYS[role]||["overview","roster","attendance","spielplan"]);
        const primTabs=tabs.filter(t=>primKeys.has(t.key));
        const mehrTabs=tabs.filter(t=>!primKeys.has(t.key));
        const mehrActive=mehrTabs.some(t=>t.key===tab);
        return(
          <>
            {/* Bottom-Sheet Mehr */}
            {showMehrTab&&(
              <div onClick={()=>setShowMehrTab(false)}
                style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                <div onClick={e=>e.stopPropagation()}
                  style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:"8px 0 calc(env(safe-area-inset-bottom) + 80px)"}}>
                  <div style={{width:36,height:4,borderRadius:2,background:"var(--border)",margin:"4px auto 12px"}}/>
                  <div className="cc-section-hdr" style={{padding:"0 8px 6px",borderBottom:"none",marginBottom:0}}>Weitere Tabs</div>
                  {mehrTabs.map(t=>(
                    <Btn onClick={()=>{setTab(t.key);setShowMehrTab(false);}}><div style={{width:40,height:40,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center", background:tab===t.key?ACCENT:"var(--surface2)",flexShrink:0}}> <TI n={t.icon||"circle"} size={19} style={{color:tab===t.key?"#111":"var(--sub)"}}/> </div> <span style={{fontSize:15,fontWeight:tab===t.key?600:400,color:tab===t.key?"var(--text)":"var(--sub)"}}>{t.label}</span> {tab===t.key&&<TI n="check" size={16} style={{color:ACCENT,marginLeft:"auto"}}/>}</Btn>
                  ))}
                </div>
              </div>
            )}
            {/* Tab-Leiste */}
            <div style={{display:"flex",background:"var(--surface)",borderRadius:14,marginBottom:12,border:"0.5px solid var(--border)",overflow:"hidden"}}>
              {primTabs.map(t=>{
                const isActive=tab===t.key;
                return(
                  <Btn variant="ghost" onClick={()=>{setTab(t.key);setShowMehrTab(false);}}><TI n={t.icon||"circle"} size={20} style={{color:isActive?ACCENT:"var(--sub)"}}/> <span style={{fontSize:10,color:isActive?ACCENT:"var(--sub)",fontWeight:isActive?700:400}}>{t.short||t.label}</span></Btn>
                );
              })}
              {mehrTabs.length>0&&(
                <Btn variant="ghost" onClick={()=>setShowMehrTab(v=>!v)}><TI n="dots" size={20} style={{color:mehrActive||showMehrTab?ACCENT:"var(--sub)"}}/> <span style={{fontSize:10,color:mehrActive||showMehrTab?ACCENT:"var(--sub)",fontWeight:mehrActive||showMehrTab?700:400}}>Mehr</span></Btn>
              )}
            </div>
          </>
        );
      })():(
        <Tabs tabs={tabs} active={tab} setActive={setTab}/>
      )}
      {tab==="overview"&&<TeamOverview role={role} team={activeTeam} setTab={setTab} setAttFilter={setAttFilter} responses={responses} setRosterInitial={setRosterInitial}/>}
      {tab==="roster"&&<KaderModulProp role={role} team={activeTeam} initialSelected={rosterInitial} teamRosterData={getMitgliederForTeam(activeTeam)}/>}
      {tab==="training"&&!limited&&<TrainingsplanModulProp team={activeTeam} sb={sb} dbTeams={dbTeams}/>}
      {tab==="spielplan"&&(
        <div className="cc-flex-center" style={{flexDirection:"column",gap:20,alignItems:"stretch"}}>
          <div>
            <div className="cc-section-hdr">Spielplan</div>
            <SpielplanModulProp role={role} team={activeTeam} initialSelected={selectedSpiel}/>
          </div>
          <div>
            <div className="cc-section-hdr">Tabelle</div>
            <TableTabProp team={activeTeam}/>
          </div>
        </div>
      )}
      {tab==="attendance"&&<TermineModulProp role={role} team={activeTeam} setActive={setActive} myRosterId={isEltern&&activeKind?.rosterId?activeKind.rosterId:myRosterId} onNavigateToSpiel={(spiel)=>{setSelectedSpiel(spiel);setTab("spielplan");}} initialFilter={attFilter} responses={responses} allTeams={trainerTeams.length>1?trainerTeams:undefined} onResponseChange={(r)=>{
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
      {tab==="helpers"&&<HelferModulProp teamOnly role={role} account={account} meineTeams={[activeTeam]}/>}
      {tab==="stats"&&!limited&&<StatsTab team={activeTeam}/>}
    </div>
  );
}

function TeamOverview({role,team,setTab,setAttFilter,responses=ATT_INITIAL,setRosterInitial}){
  const isMobile=useIsMobile();
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
    <div className="cc-grid-cards" style={{gridTemplateColumns:isMobile?"1fr":undefined}}>
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
              <div className="cc-grid-stats-sm" style={{marginBottom:14}}>
                <Stat label="Spieler im Kader" value={spieler.length} semantic="neutral"/>
                <Stat label="Trainer & Staff"  value={trainer.length} semantic="neutral"/>
                {myRow&&(
                  <Stat label="Tabellenrang"
                    value={myRow.rank+"."}
                    sub={tableData.length+" Teams · "+myRow.pts+" Punkte"}
                    semantic="neutral"
                    style={{cursor:setTab?"pointer":"default"}}
                    onClick={setTab?()=>setTab("spielplan"):undefined}
                  />
                )}
              </div>
              {trainer.length>0&&(
                <div>
                  <div className="cc-section-hdr">Trainer &amp; Staff</div>
                  <div className="cc-list">
                    {trainer.map((t,i)=>(
                      <div key={i} onClick={setTab&&setRosterInitial?()=>{setRosterInitial(t.id);setTab("roster");}:undefined}
                        className="cc-list-row" style={{cursor:setTab?"pointer":"default"}}>
                        <Av name={`${t.firstName} ${t.lastName}`} size="sm"/>
                        <div>
                          <div className="cc-list-name">{t.firstName} {t.lastName}</div>
                          <div className="cc-detail-label" style={{minWidth:"auto"}}>{t.role}</div>
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
            <div className="cc-grid-stats-sm">
              {[
                {l:"Total",              v:fmt(calcPct(pastEvs)),           c:col(calcPct(pastEvs))},
                {l:"Trainings",          v:fmt(calcPct(trainEvs)),          c:col(calcPct(trainEvs))},
                {l:"Spiele",             v:fmt(calcPct(spielEvs)),          c:col(calcPct(spielEvs))},
                {l:"Letzte 5",           v:fmt(calcPct(trainEvs.slice(-5))),c:col(calcPct(trainEvs.slice(-5)))},
              ].map((s,i)=>(
                <Stat key={i} label={s.l} value={s.v} color={s.c}/>
              ))}
            </div>
          );
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["training","spiele"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<button className="cc-btn-outline" onClick={()=>{setAttFilter&&setAttFilter(["training","spiele"]);setTab("attendance");}}>Alle <TI n="chevron-right" size={13}/></button>}>Spielplan &amp; Training</STitle>
        {(()=>{
          const shown=spielplan.slice(0,4);
          return(<>
            {shown.length===0&&<div className="cc-empty" style={{padding:"8px 0"}}>Keine anstehenden Spiele oder Trainings.</div>}
            {shown.map((e,i)=>(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<shown.length-1?`0.5px solid ${GB}`:"none"}}>
                <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="cc-list-name cc-truncate">
                    {e.opponent?"vs. "+e.opponent:e.type==="Training"?"Training · "+e.team:e.title||e.type}
                  </div>
                  <div style={{color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
                    <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                    <span style={{color:"var(--border)"}}>·</span>
                    <span>{e.time+" Uhr"}</span>
                    <span style={{color:"var(--border)"}}>·</span>
                    <span>{e.location}</span>
                  </div>
                </div>
                <span style={{fontSize:14,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0}}>{e.type}</span>
              </div>
            ))}
          </>);
        })()}
      </Card>
      <Card style={{cursor:setTab?"pointer":"default"}} onClick={setTab?()=>{setAttFilter&&setAttFilter(["team-event","vereinsanlass"]);setTab("attendance");}:undefined}>
        <STitle action={setTab&&<button className="cc-btn-outline" onClick={()=>{setAttFilter&&setAttFilter(["team-event","vereinsanlass"]);setTab("attendance");}}>Alle <TI n="chevron-right" size={13}/></button>}>Vereinsanlässe &amp; Team-Events</STitle>
        {termine.length===0&&<div className="cc-empty" style={{padding:"8px 0"}}>Keine anstehenden Anlässe.</div>}
        {termine.map((e,i)=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<termine.length-1?`0.5px solid ${GB}`:"none"}}>
            <div style={{width:3,height:32,borderRadius:2,background:accentFor(e),flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div className="cc-list-name cc-truncate">{e.title||e.type}</div>
              <div style={{color:"var(--sub)",display:"flex",alignItems:"center",gap:8}}>
                <span>{e.date}{e.endDate?" - "+e.endDate:""}</span>
                <span style={{color:"var(--border)"}}>·</span>
                <span>{e.time+" Uhr"}</span>
                <span style={{color:"var(--border)"}}>·</span>
                <span>{e.location}</span>
              </div>
            </div>
            <span style={{fontSize:14,fontWeight:700,padding:"2px 7px",borderRadius:20,background:accentFor(e)+"18",color:accentFor(e),flexShrink:0,whiteSpace:"nowrap"}}>{e.subtype||e.type}</span>
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
              "Bb-Junioren":        "Trainingsplan für Juni hängt im Materialraum. Neuer Assistent/in ab Juni. Teamfoto beim nächsten Heimspiel.",
              "D-Juniorinnen":      "Schnuppertraining für Neue am Sa 07.06. Neues Trainingsmaterial eingetroffen. Turnier in Herrliberg am 21.06.",
              "E-Juniorinnen":      "Spielfest am Sa 14.06. - bitte bis Fr 06.06. anmelden. Neue Bälle im Materialraum.",
              "F-Juniorinnen":      "Elternabend Do 05.06. um 18:30. Trikots für neue Spielerinnen bestellt. Nächstes Spielfest am 21.06.",
              "C-Juniorinnen":      "Trainingslager geplant für Juli - Details folgen. Neues Tenü ab Di im Materialraum. Turnier am 14.06.",
              "A-Junioren":         "Konditionstraining ab nächster Woche. Neue Taktikbesprechung Mi 28.05. nach Training. Auswärtsspiel Sa 31.05.",
            };
            const text=NEWS[myTeam]||"Keine aktuellen Teamnews.";
            return <p style={{margin:0,color:"var(--text)",lineHeight:1.65}}>{text}</p>;
          })()}
        </Card>
      )}
    </div>
  );
}

/* -- Mitglied-Detailansicht (Modal) -- */
/* MitgliederModul via ./MitgliederModul.jsx */

/* KaderModul via ./KaderModul.jsx */

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
                <h3 className="cc-list-name" style={{marginBottom:4}}>{p.title}</h3>
                <Chip text={p.target} color={BL}/>
                {" "}<Chip text={p.closed?"Geschlossen":"Offen"} color={p.closed?"#888":GN} bg={p.closed?"#f5f5f5":"#ECFDF5"}/>
              </div>
              <span className="cc-detail-label" style={{minWidth:"auto"}}>{p.votes.reduce((a,b)=>a+b,0)} Stimmen</span>
            </div>
            {p.options.map((opt,j)=>{
              const tot=p.votes.reduce((a,b)=>a+b,0);
              const pct=tot?Math.round(p.votes[j]/tot*100):0;
              const my=votes[i]===j;
              return(
                <div key={j} onClick={()=>!p.closed&&setVotes(v=>({...v,[i]:j}))} style={{marginBottom:7,cursor:p.closed?"default":"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:2}}>
                    <span style={{fontWeight:my?700:400}}>{opt}{my?" ✓":""}</span>
                    <span style={{color:"var(--sub)",fontWeight:600}}>{pct}%</span>
                  </div>
                  <div style={{height:6,background:GB,borderRadius:4}}>
                    <div style={{height:"100%",width:`${pct}%`,background:my?R:BL,borderRadius:4}}/>
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
  if(stats.length===0) return <Card><div className="cc-empty">Keine Spielerstatistiken verfügbar.</div></Card>;
  return(
    <Card style={{padding:0,overflowX:"auto"}}>      <table className="cc-table">
        <thead>
          <tr className="cc-tr" style={{background:"var(--bg)"}}>
            {["Spieler","Spiele","Tore","Assists","Gelb","Rot"].map((h,i)=>(
              <th key={i} className={i>0?"cc-th cc-th-center":"cc-th"}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((p,i)=>(
            <tr key={i} className="cc-tr">
              <td className="cc-td">
                <Row><Av name={p.name} size="sm"/><span className="cc-list-name">{p.name}</span></Row>
              </td>
              <td className="cc-td" style={{textAlign:"center"}}>{p.sp}</td>
              <td className="cc-td" style={{textAlign:"center",fontWeight:p.tore>=5?700:400,color:p.tore>=5?R:BK}}>{p.tore}</td>
              <td className="cc-td" style={{textAlign:"center"}}>{p.assists}</td>
              <td className="cc-td" style={{textAlign:"center"}}>{p.gelb>0?<span style={{background:"#FCD34D",color:"#78350F",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:14}}>{p.gelb}</span>:"-"}</td>
              <td className="cc-td" style={{textAlign:"center"}}>{p.rot>0?<span style={{background:R,color:"#fff",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:14}}>{p.rot}</span>:"-"}</td>
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
/* Vereinsfunktion → farbiger Chip */
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
    if(c==="-") return{color:"var(--sub)",bg:"#fafafa"};
    return{color:AM,bg:"#FFFBEB"};
  };
  return(
    <div>
      <H1 mb={8}>Feldsichtbarkeit</H1>
      <p className="cc-detail-label" style={{minWidth:"auto",marginBottom:18}}>Konfigurierbar pro Rolle (Kap. 6.1)</p>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table className="cc-table">
          <thead>
            <tr className="cc-tr" style={{background:"var(--bg)"}}>
              <th className="cc-th">Feld</th>
              {["Spieler","Eltern","Trainer","Funktionäre","Administration","Administrator"].map((h,i)=>(
                <th key={i} className="cc-th cc-th-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f,i)=>(
              <tr key={i} className="cc-tr">
                <td className="cc-td" style={{fontWeight:600}}>{f.name}</td>
                {["spieler","eltern","trainer","funktionaer","administration","administrator"].map((r,j)=>{
                  const v=f[r];const s=rc(v);
                  return <td key={j} className="cc-td" style={{textAlign:"center"}}><Chip text={v} color={s.color} bg={s.bg}/></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PORTALVERWALTUNG — Zentrales Admin-Cockpit
   Tabs: Module & Rechte | Benutzer & Rollen | Feldsichtbarkeit |
         API-Verbindungen | Audit-Logs
   ══════════════════════════════════════════════════════════════════ */
/* PortalverwaltungModul via ./PortalverwaltungModul.jsx */

function ProfileView({role,myRosterId,account}){
  const isEltern=role==="eltern";
  const player=ROSTER.find(p=>p.id===(myRosterId||1))||ROSTER.find(p=>p.id===1);
  const name=isEltern?(account?.name||"Anna Meier"):(player?`${player.firstName} ${player.lastName}`:"Luca Meier");
  const kinder=account?.kinder||[];
  return(
    <div>
      <H1 mb={18}>{isEltern?"Profil / Daten prüfen":"Mein Profil"}</H1>
      <Col gap={16}>
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
              <span style={{color:"var(--sub)"}}>{x.l}</span>
              <span className="cc-list-name">{x.v}</span>
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
                      <div style={{color:"var(--sub)"}}>{x.l}</div>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginTop:1,wordBreak:"break-all"}}>{x.v}</div>
                    </div>
                    <Chip text={x.ok?"✓ OK":"Prüfen"} color={x.ok?GN:R} bg={x.ok?"#ECFDF5":RL}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14}}><Btn variant="primary" color={GN}>Daten bestätigen</Btn></div>
            </Card>
          );
        })}
      </Col>
    </div>
  );
}

/* -- Geteilte Views -- */
function EventsList({teamOnly,role}){
  const isAdmin=["administrator","administration","funktionaer"].includes(role);
  const isTrainer=role==="trainer";
  const canCreate=kannVerwalten?kannVerwalten("helpers"):kannHelferEinsatzErstellen(role,"team",null,meineTeams||[]);
  const [showForm,setShowForm]=useState(false);
  const [newEvent,setNewEvent]=useState({title:"",type:isTrainer?"Team-Event":"Team-Event",date:"",time:"",loc:"",rsvp:true});

  /* Trainer sieht nur Team-Events bei teamOnly */
  const list=teamOnly?EVENTS.filter(e=>e.type==="Team-Event"):isTrainer?EVENTS:EVENTS;

  const typeOptions=isTrainer?["Team-Event"]:["Team-Event","Vereinsanlass"];

  return(
    <div>
      {!teamOnly&&(
        <Between style={{marginBottom:18}}>
          <H1>Termine</H1>
          {canCreate&&<Btn variant="primary" color="#F3F4F6" onClick={()=>setShowForm(v=>!v)}>{"+ "+( isTrainer?"Team-Event erstellen":"Anlass erstellen")}</Btn>}
        </Between>
      )}
      {isTrainer&&!teamOnly&&(
        <InfoBox text="Als Trainer kannst du Team-Events erstellen. Vereinsanlässe werden durch Administration oder Vorstand eröffnet." color={BL}/>
      )}

      {/* Erstellungsformular */}
      {showForm&&canCreate&&(
        <div style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:16,marginTop:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{"Neuer "+(isTrainer?"Team-Event":"Anlass")}</div>
          <div className="cc-grid-form">
            <div>
              <label className="cc-label">Titel</label>
              <input value={newEvent.title} onChange={e=>setNewEvent(p=>({...p,title:e.target.value}))}
                placeholder="Titel des Anlasses" style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label className="cc-label">Typ</label>
              <select value={newEvent.type} onChange={e=>setNewEvent(p=>({...p,type:e.target.value}))}
                className="cc-input">
                {typeOptions.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="cc-label">Datum</label>
              <input type="date" value={newEvent.date} onChange={e=>setNewEvent(p=>({...p,date:e.target.value}))}
                className="cc-input"/>
            </div>
            <div>
              <label className="cc-label">Uhrzeit</label>
              <input type="time" value={newEvent.time} onChange={e=>setNewEvent(p=>({...p,time:e.target.value}))}
                className="cc-input"/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label className="cc-label">Ort</label>
              <input value={newEvent.loc} onChange={e=>setNewEvent(p=>({...p,loc:e.target.value}))}
                placeholder="Vereinslokal, Mehrzweckhalle…" style={{width:"100%",padding:"6px 10px",border:"0.5px solid var(--border)",borderRadius:6,fontSize:14,boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <input type="checkbox" id="rsvp-chk" checked={newEvent.rsvp} onChange={e=>setNewEvent(p=>({...p,rsvp:e.target.checked}))} style={{cursor:"pointer"}}/>
            <label htmlFor="rsvp-chk" style={{fontSize:14,cursor:"pointer"}}>Rückmeldung erforderlich</label>
          </div>
          <Row align="flex-start">
            <Btn variant="primary" color="#F3F4F6">Erstellen</Btn>
            <Btn onClick={()=>setShowForm(false)}>Abbrechen</Btn>
          </Row>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:teamOnly?0:14}}>
        {list.map((e,i)=>{
          const accentColor=e.type==="Team-Event"?BL:e.type==="Vereinsanlass"?"#7C3AED":R;
          return(
            <div key={i} style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:12,overflow:"hidden",display:"flex",marginBottom:10}}>
              {/* Left accent bar */}
              <div style={{width:4,background:accentColor,flexShrink:0}}/>
              {/* Content */}
              <div style={{flex:1,padding:"14px 16px",minWidth:0}}>
                {/* Type + RSVP badge row */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{background:accentColor+"18",color:accentColor,fontSize:14,fontWeight:700,padding:"2px 8px",borderRadius:20,border:`0.5px solid ${accentColor}30`}}>
                    {e.type}
                  </span>
                  {e.rsvp&&(
                    <span style={{fontSize:14,fontWeight:600,color:AM,background:"var(--surface)",border:"0.5px solid #FDE68A",padding:"2px 8px",borderRadius:20}}>
                      {"Rückmeldung erforderlich"}
                    </span>
                  )}
                  {e.rsvp&&e.res&&(
                    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:14,color:GN,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:GN,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{"✓"}</span>
                        {e.res.y}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:14,color:R,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:R,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{"✕"}</span>
                        {e.res.n}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:14,color:AM,fontWeight:700}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:STATUS_BG.warn,border:`1.5px solid ${AM}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,color:AM,fontWeight:800}}>{"?"}</span>
                        {e.res.o}
                      </span>
                    </div>
                  )}
                </div>
                {/* Title */}
                <div className="cc-list-name" style={{marginBottom:7}}>{e.title}</div>
                {/* Meta */}
                <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",fontSize:14,color:"var(--sub)"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="calendar"/></span>{e.date}{e.endDate?" - "+e.endDate:""}
                  </span>
                  <span style={{color:"var(--border)",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="clock"/></span>{e.time+" Uhr"}
                  </span>
                  <span style={{color:"var(--border)",margin:"0 8px"}}>{"|"}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span><TI n="map-pin"/></span>{e.loc}
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

/* HelferModul via ./HelferModul.jsx */

export { TeamView, TeamOverview, EventsList };
