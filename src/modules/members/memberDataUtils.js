/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberDataUtils.js
   Datentransformation und Filterlogik für MitgliederModul
   ═══════════════════════════════════════════════════════════════ */
import * as XLSX from "xlsx";

/* Rohe DB-Mitglieder in UI-Objekte transformieren */
export function mapMembers(dbMitglieder, dbPortalRollen, dbKaderRollen) {
  const ROLLE_LABEL = Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
  return dbMitglieder.map(m => {
    const rollenSet=new Set();
    (m.kader_rollen||[]).forEach(r=>rollenSet.add(ROLLE_LABEL[r]||r));
    if(rollenSet.size===0&&m.rolle&&m.rolle!=="-") rollenSet.add(ROLLE_LABEL[m.rolle]||m.rolle);
    const portalStatus=m.hat_portal_zugang?"Aktiv":"Nicht eingerichtet";
    const dpStatus=(!m.datenstatus||m.datenstatus==="Vollstandig"||m.datenstatus==="Vollständig"||m.datenstatus==="geprüft"||m.datenstatus==="Geprueft")&&m.geprueft===true?"Geprueft":m.geprueft===false||!m.geprueft?"Ausstehend":m.datenstatus||"Ausstehend";
    return {
      id:m.id,
      name:(`${m.vorname||""} ${m.nachname||""}`).trim()||"?",
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-", type:m.mitgliedtyp||"-",
      rollen:[...rollenSet], kader_rollen_raw:m.kader_rollen||[], kader_eintraege:m.kader_eintraege||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus, status:m.datenstatus||"Ausstehend",
      portal:portalStatus, hat_portal_zugang:m.hat_portal_zugang,
      ort:m.ort||"-", location:m.ort||"-",
      email:m.email, telefon:m.telefon, geburtsdatum:m.geburtsdatum,
      alter:m.geburtsdatum?Math.floor((Date.now()-new Date(m.geburtsdatum))/(365.25*24*3600*1000)):null,
      geschlecht:m.geschlecht||null,
      nationalitaet:m.nationalitaet||"-", nationalitaet2:m.nationalitaet2||null,
      position:m.position, fairgate_id:m.fairgate_id, js_nr:m.js_nr,
      spielerpass:m.spielerpass, eintritt:m.eintrittsdatum, rueckennr:m.rueckennr,
      foto_url:m.foto_url||null, funktionen:m.funktionen||[],
      strasse:m.strasse, heimatort:m.heimatort, ahv_nr:m.ahv_nr,
    };
  });
}

export function filterMembers(allMembers, search, filterVals, ROLLE_LABEL) {
  return allMembers.filter(m => {
    if(search){
      const terms=search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack=[
        m.name,m.mitgliedschaft,
        ...(m.rollen||[]),
        ...(m.teams||[]).map(t=>t?.name||t||""),
        ...(m.teams||[]).map(t=>t?.kurz||""),
        m.email||"",
      ].join(" ").toLowerCase();
      if(!terms.every(t=>haystack.includes(t))) return false;
    }
    // Teams + Funktionsgruppen mit ODER verknüpfen
    const teamsVals=filterVals["teams"]||[];
    const gruppenVals=filterVals["funktionsgruppen"]||[];
    if(teamsVals.length>0||gruppenVals.length>0){
      const inTeam=teamsVals.length>0&&(m.teams||[]).map(t=>t?.name||t).some(t=>teamsVals.includes(t));
      const inGruppe=gruppenVals.length>0&&(m.funktionsgruppen||[]).some(g=>gruppenVals.includes(g));
      if(!inTeam&&!inGruppe) return false;
    }
    // Alle anderen Filter mit UND
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||fVals.length===0) continue;
      if(fKey==="teams"||fKey==="funktionsgruppen") continue;
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!fVals.includes(portalLabel)) return false;
        continue;
      }
      if(fKey==="kaderrollen"){
        const kaderRollen=m.kader_rollen_raw||[];
        if(!kaderRollen.some(r=>fVals.includes(r))) return false;
        continue;
      }
      const raw=m[fKey];
      const mVal=Array.isArray(raw)?raw.map(v=>v?.name||v):[raw?.name||raw];
      if(!mVal.some(v=>fVals.includes(v))) return false;
    }
    return true;
  });
}

export function sortMembers(filtered, sortCol, sortDir) {
  return [...filtered].sort((a,b)=>{
    const getVal=m=>{const v=m[sortCol];if(Array.isArray(v)){const f=v[0];return f?.name||f||"";}return String(v??"");};
    const av=getVal(a), bv=getVal(b);
    return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
  });
}

export function getGroupKey(m, g, ROLLE_LABEL, filterVals={}) {
  if(g==="__jahrgang"){ if(!m.geburtsdatum) return ["Unbekannt"]; return [String(new Date(m.geburtsdatum).getFullYear())]; }
  if(g==="__eintrittsjahr"){ if(!m.eintritt) return ["Unbekannt"]; return [String(new Date(m.eintritt).getFullYear())]; }
  if(g==="teams"){
    const teamsFilter=filterVals["teams"]||[];
    const allTeams=(m.teams||[]).map(t=>t?.name||t);
    const filtered=teamsFilter.length>0?allTeams.filter(t=>teamsFilter.includes(t)):allTeams;
    return filtered.length>0?filtered:["Kein Team"];
  }
  if(g==="rollen"){ const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null; return [portalLabel||"Keine Rolle"]; }
  if(g==="kaderrollen"){ return (m.kader_rollen_raw||[]).length>0?m.kader_rollen_raw:["Keine Kaderrolle"]; }
  if(g==="funktionen"){ return (m.funktionen||[]).length>0?m.funktionen:["Keine Vereinsfunktion"]; }
  if(g==="funktionsgruppen"){
    const gruppenFilter=filterVals["funktionsgruppen"]||[];
    const allGruppen=m.funktionsgruppen||[];
    const filtered=gruppenFilter.length>0?allGruppen.filter(g=>gruppenFilter.includes(g)):allGruppen;
    return filtered.length>0?filtered:["Keine Funktionsgruppe"];
  }
  if(g==="__teams_funktionen"){
    const teamsFilter=filterVals["teams"]||[];
    const gruppenFilter=filterVals["funktionsgruppen"]||[];
    const teams=(m.teams||[])
      .map(t=>t?.name||t)
      .filter(t=>teamsFilter.length===0||teamsFilter.includes(t))
      .map(t=>({key:t,type:"team"}));
    const gruppen=(m.funktionsgruppen||[])
      .filter(g=>gruppenFilter.length===0||gruppenFilter.includes(g))
      .map(g=>({key:g,type:"gruppe"}));
    return [...gruppen,...teams].length>0?[...gruppen,...teams]:[{key:"Keine Zuordnung",type:"none"}];
  }
  const v=m[g];
  if(Array.isArray(v)) return v.map(t=>t?.name||t||"-").filter(Boolean).length>0?v.map(t=>t?.name||t||"-").filter(Boolean):["-"];
  return [String(v||"-")];
}

export function buildGroups(paged, groupBy, ROLLE_LABEL, filterVals={}) {
  // groupBy kann String oder Array sein
  const levels=Array.isArray(groupBy)?groupBy:[groupBy];
  const firstLevel=levels[0]||"none";
  const restLevels=levels.slice(1);

  if(firstLevel==="none") return [{key:"",label:"",type:"none",members:paged,children:null}];

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

  // Sortierung: für __teams_funktionen erst Gruppen dann Teams
  let entries=Object.entries(map);
  if(firstLevel==="__teams_funktionen"){
    entries=entries.sort(([a],[b])=>{
      const aIsTeam=meta[a]==="team"; const bIsTeam=meta[b]==="team";
      if(aIsTeam!==bIsTeam) return aIsTeam?1:-1;
      return String(a).localeCompare(String(b));
    });
  } else {
    entries=entries.sort(([a],[b])=>String(a).localeCompare(String(b)));
  }

  return entries.map(([k,members])=>({
    key:k,
    label:k,
    type:meta[k]||"default",
    members,
    children:restLevels.length>0&&restLevels[0]!=="none"
      ?buildGroups(members,restLevels,ROLLE_LABEL)
      :null,
  }));
}

export function exportData(filtered, COLS, format) {
  const exportCols=COLS.filter(c=>c.key!=="name").map(c=>c.key);
  const headers=["Name",...COLS.filter(c=>c.key!=="name").map(c=>c.label)];
  const rows=filtered.map(m=>[
    m.name,
    ...exportCols.map(k=>{
      if(k==="rollen") return (m.rollen||[]).join(", ");
      if(k==="teams") return (m.teams||[]).map(t=>t.name||t).join(", ");
      if(k==="funktionen") return (m.funktionen||[]).join(", ");
      if(k==="funktionsgruppen") return (m.funktionsgruppen||[]).join(", ");
      if(k==="nationalitaet") return m.nationalitaet&&m.nationalitaet!=="-"?m.nationalitaet:"";
      if(k==="nationalitaet2") return m.nationalitaet2||"";
      if(k==="eintritt") return m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"";
      if(k==="portal") return m.hat_portal_zugang?"Aktiv":"Kein Zugang";
      if(k==="datenpruefung") return m.profil_geprueft_at?"Geprüft":"Ausstehend";
      return m[k]!=null?String(m[k]):"";
    })
  ]);
  if(format==="csv"){
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(";")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="mitglieder.csv";a.click();URL.revokeObjectURL(url);
  } else {
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Mitglieder");
    XLSX.writeFile(wb,"mitglieder.xlsx");
  }
}
