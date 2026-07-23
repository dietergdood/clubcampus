/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberListCell.jsx
   renderCell für MitgliederModul ListView
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.jsx";
import { Av, PortalBadge, DpBadge } from "../../theme.jsx";

export function makeMemberRenderCell({ portalFunktionen, TRAINER_KEYS, ROLLE_LABEL, teamsPopover, setTeamsPopover, expandedTeams, setExpandedTeams, setSelectedMember }) {
  function renderCell(col,m,groupContext={type:"none",key:null},filterVals={}){
    const gc=groupContext;
    switch(col.key){
      case "name": return <td key="name" className="cc-members-td"><div className="cc-row cc-gap-8">{m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-sm cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}/>:<span className="cc-clickable" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}><Av name={m.name||"?"} size={26}/></span>}<span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();setSelectedMember({...m,_tab:"info"});}}>{m.name}</span></div></td>;
      case "mitgliedschaft": return <td key="mitgliedschaft" className="cc-members-td cc-members-td-mitglied">{m.mitgliedschaft||"—"}</td>;
      case "rollen": {
        const portalRaw=m.role&&m.role!=="-"?m.role:null;
        const portalLabel=portalRaw?(ROLLE_LABEL[portalRaw]||portalRaw):null;
        const roleClass=!portalRaw?"":
          (portalRaw==="administrator"||portalRaw==="administration")?"cc-role-chip-admin":
          portalRaw==="trainer"?"cc-role-chip-trainer":
          (portalRaw==="spieler"||portalRaw==="spielerin")?"cc-role-chip-spieler":
          (portalRaw==="funktionaer"||portalRaw==="funktionär")?"cc-role-chip-funktionaer":
          portalRaw==="eltern"?"cc-role-chip-eltern":"";
        return <td key="rollen" className="cc-members-td">
          {portalLabel
            ?<span className={`cc-role-chip cc-role-chip-sm ${roleClass}`}>{portalLabel}</span>
            :<span className="cc-members-td-sub">—</span>}
        </td>;
      }
      case "teams": {
        if(gc.type==="gruppe") return <td key="teams" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsToShow=gc.type==="team"?(m.teams||[]).filter(t=>(t?.name||t)===gc.key):(m.teams||[]);
        return <td key="teams" className="cc-members-td" onClick={e=>e.stopPropagation()}>{teamsToShow.length>0?(<span className="cc-row cc-gap-4 cc-flex-wrap">{teamsToShow.slice(0,1).map((t,i)=><span key={i} className="cc-team-chip">{t?.kurz||t?.name||t}</span>)}{teamsToShow.length>1&&<button className="cc-ml-more cc-ml-more-btn" onClick={e=>{e.stopPropagation();setTeamsPopover(teamsPopover?.id===m.id?null:{id:m.id,teams:teamsToShow,x:e.clientX,y:e.clientY});}}>+{teamsToShow.length-1}</button>}</span>):"—"}</td>;
      }
      case "datenpruefung": return <td key="datenpruefung" className="cc-members-td"><DpBadge val={m.datenpruefung}/></td>;
      case "portal": return <td key="portal" className="cc-members-td"><PortalBadge val={m.portal}/></td>;
      case "email": return <td key="email" className="cc-members-td cc-members-td-sub">{m.email||"—"}</td>;
      case "telefon": return <td key="telefon" className="cc-members-td cc-members-td-sub">{m.telefon||"—"}</td>;
      case "geburtsdatum": return <td key="geburtsdatum" className="cc-members-td cc-members-td-sub">{m.geburtsdatum?new Date(m.geburtsdatum).toLocaleDateString("de-CH"):"—"}</td>;
      case "alter": return <td key="alter" className="cc-members-td cc-members-td-sub">{m.alter||"—"}</td>;
      case "geschlecht": return <td key="geschlecht" className="cc-members-td cc-members-td-sub">{m.geschlecht==="m"?"Männlich":m.geschlecht==="w"?"Weiblich":m.geschlecht||"—"}</td>;
      case "nationalitaet": return <td key="nationalitaet" className="cc-members-td cc-members-td-sub">{m.nationalitaet||"—"}</td>;
      case "nationalitaet2": return <td key="nationalitaet2" className="cc-members-td cc-members-td-sub">{m.nationalitaet2||"—"}</td>;
      case "ort": return <td key="ort" className="cc-members-td cc-members-td-sub">{m.ort||"—"}</td>;
      case "spielerpass": return <td key="spielerpass" className="cc-members-td cc-members-td-sub">{m.spielerpass||"—"}</td>;
      case "fairgate_id": return <td key="fairgate_id" className="cc-members-td cc-members-td-sub">{m.fairgate_id||"—"}</td>;
      case "js_nr": return <td key="js_nr" className="cc-members-td cc-members-td-sub">{m.js_nr||"—"}</td>;
      case "eintritt": return <td key="eintritt" className="cc-members-td cc-members-td-sub">{m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"—"}</td>;
      case "nachname": return <td key="nachname" className="cc-members-td cc-members-td-sub">{m.nachname||"—"}</td>;
      case "vorname": return <td key="vorname" className="cc-members-td cc-members-td-sub">{m.vorname||"—"}</td>;
      case "heimatort": return <td key="heimatort" className="cc-members-td cc-members-td-sub">{m.heimatort||"—"}</td>;
      case "ahv_nr": return <td key="ahv_nr" className="cc-members-td cc-members-td-sub">{m.ahv_nr||"—"}</td>;
      case "strasse": return <td key="strasse" className="cc-members-td cc-members-td-sub">{m.strasse||"—"}</td>;
      case "teams_rollen": {
        if(gc.type==="gruppe") return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        const teamsFilter=filterVals["teams"]||[];
        const kaderFilter=filterVals["kaderrollen"]||[];
        // Bei Kaderrolle-Gruppierung: nur Einträge mit dieser Rolle
        if(gc.type==="kaderrolle"){
          const eFiltered=(m.kader_eintraege||[]).map(e=>({...e,rollen:e.rollen.filter(r=>r===gc.key)})).filter(e=>e.rollen.length>0);
          if(eFiltered.length===0) return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
          return <td key="teams_rollen" className="cc-members-td">
            <div className="cc-col cc-gap-4">
              {eFiltered.slice(0,3).map((e,i)=>(
                <div key={i} className="cc-teams-rollen-row">
                  <span className="cc-teams-rollen-team">{e.team?.kurz||e.team?.name||"—"}</span>
                  <span className="cc-teams-rollen-sep">·</span>
                  {e.rollen.map((r,ri)=><span key={ri} className="cc-teams-rollen-rolle">{r}</span>)}
                </div>
              ))}
            </div>
          </td>;
        }
        // Bei Team+Kaderrolle Mehrfachgruppierung: Team-Kontext + Kaderrolle als Subkontext
        const rolleFilter=gc.subType==="kaderrolle"?[gc.subKey]:(kaderFilter.length>0?kaderFilter:null);
        const eintraege=(m.kader_eintraege||[]).filter(e=>{
          const teamMatch=gc.type==="team"?e.team?.name===gc.key:(teamsFilter.length===0||teamsFilter.includes(e.team?.name));
          const rolleMatch=rolleFilter?e.rollen.some(r=>rolleFilter.includes(r)):true;
          return teamMatch&&rolleMatch;
        }).sort((a,b)=>{
          const aIsTrainer=a.rollen.some(r=>TRAINER_KEYS.includes(r));
          const bIsTrainer=b.rollen.some(r=>TRAINER_KEYS.includes(r));
          return aIsTrainer===bIsTrainer?0:aIsTrainer?-1:1;
        });
        if(eintraege.length===0) return <td key="teams_rollen" className="cc-members-td cc-members-td-sub">—</td>;
        const isExpanded=expandedTeams.has(m.id);
        const visibleE=isExpanded?eintraege:eintraege.slice(0,2);
        const restE=eintraege.length-2;
        return <td key="teams_rollen" className="cc-members-td">
          <div className="cc-col cc-gap-4">
            {visibleE.map((e,i)=>{
              const rollenToShow=rolleFilter?e.rollen.filter(r=>rolleFilter.includes(r)):e.rollen;
              return(
                <div key={i} className="cc-teams-rollen-row">
                  <span className="cc-teams-rollen-team">{e.team?.kurz||e.team?.name||"—"}</span>
                  {rollenToShow.length>0&&<>
                    <span className="cc-teams-rollen-sep">·</span>
                    {rollenToShow.map((r,ri)=>(
                      <span key={ri} className="cc-teams-rollen-rolle">{r}{ri<rollenToShow.length-1?", ":""}</span>
                    ))}
                  </>}
                </div>
              );
            })}
            {restE>0&&(
              <button className="cc-teams-rollen-more"
                onClick={e=>{e.stopPropagation();setExpandedTeams(prev=>{const n=new Set(prev);n.has(m.id)?n.delete(m.id):n.add(m.id);return n;})}}>
                {isExpanded
                  ? <><TI n="chevron-up" size={10}/>weniger</>
                  : <><TI n="chevron-down" size={10}/>+{restE} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      case "funktionen_gruppen": {
        if(gc.type==="team") return <td key="funktionen_gruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const paare=(gc.type==="funktion"
          ?(m.funktionen||[]).filter(f=>f===gc.key)
          :(m.funktionen||[])).map(f=>{
          const pf=portalFunktionen.find(x=>x.name===f);
          return {funktion:f, gruppe:pf?.portal_gruppen?.name||null};
        }).filter(p=>{
          if(gc.type==="funktion") return true;
          if(gc.type==="gruppe") return p.gruppe===gc.key;
          return gruppenFilter.length===0||gruppenFilter.includes(p.gruppe);
        });
        if(paare.length===0) return <td key="funktionen_gruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const isFExpanded=expandedTeams.has("f_"+m.id);
        const visible=isFExpanded?paare:paare.slice(0,2);
        const rest=paare.length-2;
        return <td key="funktionen_gruppen" className="cc-members-td">
          <div className="cc-col cc-gap-4">
            {visible.map((p,i)=>(
              <div key={i} className="cc-teams-rollen-row">
                {p.gruppe&&<span className="cc-teams-rollen-team">{p.gruppe}</span>}
                {p.gruppe&&p.funktion&&<span className="cc-teams-rollen-sep">·</span>}
                <span className="cc-teams-rollen-rolle">{p.funktion}</span>
              </div>
            ))}
            {rest>0&&(
              <button className="cc-teams-rollen-more"
                onClick={e=>{e.stopPropagation();setExpandedTeams(prev=>{const n=new Set(prev);n.has("f_"+m.id)?n.delete("f_"+m.id):n.add("f_"+m.id);return n;})}}>
                {isFExpanded
                  ? <><TI n="chevron-up" size={10}/>weniger</>
                  : <><TI n="chevron-down" size={10}/>+{rest} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      case "funktionen": {
        if(gc.type==="team") return <td key="funktionen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const funktionenToShow=gc.type==="gruppe"
          ?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return pf?.portal_gruppen?.name===gc.key;})
          :(gruppenFilter.length>0?(m.funktionen||[]).filter(f=>{const pf=portalFunktionen.find(x=>x.name===f);return gruppenFilter.includes(pf?.portal_gruppen?.name);}):(m.funktionen||[]));
        return <td key="funktionen" className="cc-members-td cc-members-td-sub">{funktionenToShow.join(", ")||"—"}</td>;
      }
      case "kaderrollen": {
        if(gc.type==="gruppe") return <td key="kaderrollen" className="cc-members-td cc-members-td-sub">—</td>;
        const kaderFilter=filterVals["kaderrollen"]||[];
        const rollenToShow=gc.type==="team"
          ?( kaderFilter.length>0?(m.kader_rollen_raw||[]).filter(r=>kaderFilter.includes(r)):(m.kader_rollen_raw||[]) )
          :(m.kader_rollen_raw||[]);
        return <td key="kaderrollen" className="cc-members-td">{rollenToShow.length===0?"—":rollenToShow.map((r,i)=>{const isT=TRAINER_KEYS.some(k=>k===r);return <span key={i} className={`cc-role-chip cc-role-chip-sm${isT?" cc-role-chip-trainer":""}`}>{r}</span>;})}</td>;
      }
      case "funktionsgruppen": {
        if(gc.type==="team") return <td key="funktionsgruppen" className="cc-members-td cc-members-td-sub">—</td>;
        const gruppenFilter=filterVals["funktionsgruppen"]||[];
        const gruppenToShow=gc.type==="gruppe"
          ?[(gc.key)]
          :(gruppenFilter.length>0?(m.funktionsgruppen||[]).filter(g=>gruppenFilter.includes(g)):(m.funktionsgruppen||[]));
        return <td key="funktionsgruppen" className="cc-members-td">{gruppenToShow.length===0?"—":gruppenToShow.map((g,i)=>{const pf=portalFunktionen.find(f=>f.portal_gruppen?.name===g);const farbe=pf?.portal_gruppen?.farbe;return <span key={i} className="cc-funk-gruppe-badge" style={farbe?{background:farbe+"20",color:farbe,borderColor:farbe+"40"}:{}}>{g}</span>;})}</td>;
      }
      default: return <td key={col.key} className="cc-members-td cc-members-td-sub">{m[col.key]||"—"}</td>;
    }
  }
  return renderCell;
}
