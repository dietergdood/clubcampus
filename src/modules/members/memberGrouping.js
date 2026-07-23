/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberGrouping.js
   Gruppierungslogik für MitgliederModul ListView

   NICHT ÄNDERN ohne alle 10 Gruppierungsszenarien zu testen!
   Siehe ARCHITECTURE.md → "Bekannte Fallgruben bei MitgliederModul"

   getGroupKey: Gibt Gruppenschlüssel(s) eines Mitglieds zurück.
     Immer ein ARRAY — ein Mitglied kann in mehreren Gruppen erscheinen.
     type: "team"|"gruppe"|"kaderrolle"|"funktion"|"none"

   buildGroups: Baut rekursive Gruppenstruktur für ListView auf.
     Mehrfachgruppierung via Array: ["teams", "kaderrollen"]
     Kontext-Weitergabe via filterVals:
       __parentTeam    → kaderrollen nur in diesem Team
       __parentGruppe  → funktionen nur in dieser Gruppe
       __portalFunktionen → für Funktions-Gruppen-Zuordnung
   ═══════════════════════════════════════════════════════════════ */

export function getGroupKey(m, g, ROLLE_LABEL, filterVals={}) {
  // ── Jahrgangs-Gruppierung ────────────────────────────────────
  if(g==="__jahrgang"){
    if(!m.geburtsdatum) return ["Unbekannt"];
    return [String(new Date(m.geburtsdatum).getFullYear())];
  }
  if(g==="__eintrittsjahr"){
    if(!m.eintritt) return ["Unbekannt"];
    return [String(new Date(m.eintritt).getFullYear())];
  }

  // ── Teams ────────────────────────────────────────────────────
  // Wenn Kaderrolle-Filter aktiv: nur Teams zeigen wo diese Rolle zutrifft
  if(g==="teams"){
    const teamsFilter=filterVals["teams"]||[];
    const kaderFilter=filterVals["kaderrollen"]||[];
    let allTeams=(m.teams||[]).map(t=>t?.name||t);
    if(teamsFilter.length>0) allTeams=allTeams.filter(t=>teamsFilter.includes(t));
    if(kaderFilter.length>0){
      allTeams=allTeams.filter(teamName=>{
        const eintraege=(m.kader_eintraege||[]).filter(e=>e.team?.name===teamName);
        return eintraege.some(e=>e.rollen.some(r=>kaderFilter.includes(r)));
      });
    }
    return allTeams.length>0?allTeams.map(t=>({key:t,type:"team"})):[{key:"Kein Team",type:"team"}];
  }

  // ── Portalrollen ─────────────────────────────────────────────
  if(g==="rollen"){
    const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
    return [portalLabel||"Keine Rolle"];
  }

  // ── Kaderrollen ──────────────────────────────────────────────
  // Bei Mehrfachgruppierung Team→Kaderrolle: nur Rollen im übergeordneten Team
  if(g==="kaderrollen"){
    const parentTeam=filterVals.__parentTeam;
    if(parentTeam){
      const eintraege=(m.kader_eintraege||[]).filter(e=>e.team?.name===parentTeam);
      const rollen=[...new Set(eintraege.flatMap(e=>e.rollen))];
      return rollen.length>0?rollen.map(r=>({key:r,type:"kaderrolle"})):[{key:"Keine Kaderrolle",type:"kaderrolle"}];
    }
    return (m.kader_rollen_raw||[]).length>0
      ?m.kader_rollen_raw.map(r=>({key:r,type:"kaderrolle"}))
      :[{key:"Keine Kaderrolle",type:"kaderrolle"}];
  }

  // ── Vereinsfunktionen ─────────────────────────────────────────
  // Bei Mehrfachgruppierung Gruppe→Funktion: nur Funktionen der übergeordneten Gruppe
  if(g==="funktionen"){
    const allFunk=m.funktionen||[];
    if(filterVals.__parentGruppe){
      const pgName=filterVals.__parentGruppe;
      const filtered=allFunk.filter(f=>{
        const pf=(filterVals.__portalFunktionen||[]).find(x=>x.name===f);
        return pf?.portal_gruppen?.name===pgName;
      });
      return filtered.length>0?filtered.map(f=>({key:f,type:"funktion"})):[{key:"Keine Vereinsfunktion",type:"funktion"}];
    }
    return allFunk.length>0?allFunk.map(f=>({key:f,type:"funktion"})):[{key:"Keine Vereinsfunktion",type:"funktion"}];
  }

  // ── Funktionsgruppen ─────────────────────────────────────────
  if(g==="funktionsgruppen"){
    const gruppenFilter=filterVals["funktionsgruppen"]||[];
    const allGruppen=m.funktionsgruppen||[];
    const filtered=gruppenFilter.length>0?allGruppen.filter(g=>gruppenFilter.includes(g)):allGruppen;
    return filtered.length>0?filtered.map(g=>({key:g,type:"gruppe"})):[{key:"Keine Funktionsgruppe",type:"gruppe"}];
  }

  // ── Teams & Funktionsgruppen kombiniert ──────────────────────
  // Zeigt Teams (mit Kaderrolle-Filter) und Funktionsgruppen nebeneinander
  if(g==="__teams_funktionen"){
    const teamsFilter=filterVals["teams"]||[];
    const gruppenFilter=filterVals["funktionsgruppen"]||[];
    const kaderFilter=filterVals["kaderrollen"]||[];
    let teams=(m.teams||[]).map(t=>t?.name||t);
    if(teamsFilter.length>0) teams=teams.filter(t=>teamsFilter.includes(t));
    if(kaderFilter.length>0){
      teams=teams.filter(teamName=>{
        const eintraege=(m.kader_eintraege||[]).filter(e=>e.team?.name===teamName);
        return eintraege.some(e=>e.rollen.some(r=>kaderFilter.includes(r)));
      });
    }
    const gruppen=(m.funktionsgruppen||[])
      .filter(g=>gruppenFilter.length===0||gruppenFilter.includes(g))
      .map(g=>({key:g,type:"gruppe"}));
    const teamsMapped=teams.map(t=>({key:t,type:"team"}));
    return [...gruppen,...teamsMapped].length>0?[...gruppen,...teamsMapped]:[{key:"Keine Zuordnung",type:"none"}];
  }

  // ── Fallback: direkter Feldwert ──────────────────────────────
  const v=m[g];
  if(Array.isArray(v)) return v.map(t=>t?.name||t||"-").filter(Boolean).length>0?v.map(t=>t?.name||t||"-").filter(Boolean):["-"];
  return [String(v||"-")];
}

export function buildGroups(paged, groupBy, ROLLE_LABEL, filterVals={}, parentGroup=null, groupOrder={}) {
  const levels=Array.isArray(groupBy)?groupBy:[groupBy];
  const firstLevel=levels[0]||"none";
  const restLevels=levels.slice(1);

  if(firstLevel==="none") return [{key:"",label:"",type:"none",members:paged,children:null}];

  // Mitglieder auf Gruppen aufteilen
  const map={};
  const meta={};
  paged.forEach(m=>{
    const keys=getGroupKey(m,firstLevel,ROLLE_LABEL,filterVals);
    keys.forEach(k=>{
      const keyStr=typeof k==="object"?k.key:k;
      const keyType=typeof k==="object"?k.type:"default";
      if(!map[keyStr]) { map[keyStr]=[]; meta[keyStr]=keyType; }
      map[keyStr].push(m);
    });
  });

  // Sortierung: custom groupOrder wenn vorhanden, sonst alphabetisch
  let entries=Object.entries(map);
  const orderForLevel=groupOrder[firstLevel];
  if(orderForLevel&&orderForLevel.length>0){
    entries=entries.sort(([a],[b])=>{
      const ai=orderForLevel.indexOf(a);
      const bi=orderForLevel.indexOf(b);
      if(ai===-1&&bi===-1) return String(a).localeCompare(String(b));
      if(ai===-1) return 1;
      if(bi===-1) return -1;
      return ai-bi;
    });
  } else {
    entries=entries.sort(([a],[b])=>String(a).localeCompare(String(b)));
  }

  return entries.map(([k,members])=>({
    key:k,
    label:k,
    type:meta[k]||"default",
    members,
    // Rekursiv: nächste Gruppierungsebene mit angepasstem filterVals-Kontext
    children:restLevels.length>0&&restLevels[0]!=="none"
      ?buildGroups(members,restLevels,ROLLE_LABEL,
          (meta[k]==="gruppe")?{...filterVals,__parentGruppe:k}:
          (meta[k]==="team")?{...filterVals,__parentTeam:k}:
          filterVals,
          {type:meta[k]||"default",key:k},
          groupOrder)
      :null,
  }));
}
