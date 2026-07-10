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
    const portalStatus=m.hat_portal_zugang?"Aktiv":(m.hat_benutzer?"Deaktiviert":"Kein Zugang");
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
      portal:portalStatus, hat_portal_zugang:m.hat_portal_zugang, hat_benutzer:m.hat_benutzer,
      ort:m.ort||"-", location:m.ort||"-", plz:m.plz||null,
      wohnort:m.plz&&m.ort?`${m.plz} ${m.ort}`:(m.ort||null),
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
    // Teams mit ODER verknüpfen (separat)
    const teamsVals=filterVals["teams"]||[];
    if(teamsVals.length>0){
      const inTeam=(m.teams||[]).map(t=>t?.name||t).some(t=>teamsVals.includes(t));
      if(!inTeam) return false;
    }
    // Kaderrollen + Vereinsfunktionen + Funktionsgruppen mit ODER verknüpfen
    const kaderVals=filterVals["kaderrollen"]||[];
    const funktionenVals=filterVals["funktionen"]||[];
    const gruppenVals=filterVals["funktionsgruppen"]||[];
    if(kaderVals.length>0||funktionenVals.length>0||gruppenVals.length>0){
      const inKader=kaderVals.length>0&&(m.kader_rollen_raw||[]).some(r=>kaderVals.includes(r));
      const inFunktion=funktionenVals.length>0&&(m.funktionen||[]).some(f=>funktionenVals.includes(f));
      const inGruppe=gruppenVals.length>0&&(m.funktionsgruppen||[]).some(g=>gruppenVals.includes(g));
      if(!inKader&&!inFunktion&&!inGruppe) return false;
    }
    // Alle anderen Filter mit UND
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||(Array.isArray(fVals)&&fVals.length===0)) continue;
      if(typeof fVals==="object"&&!Array.isArray(fVals)&&fKey!=="jahrgang"&&fKey!=="alter") continue;
      if(fKey==="teams"||fKey==="funktionsgruppen"||fKey==="kaderrollen"||fKey==="funktionen") continue;
      if(fKey==="jahrgang"){
        const {von,bis}=fVals||{};
        if(von==null&&bis==null) continue;
        const jg=m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null;
        if(!jg) return false;
        if(von!=null&&jg<von) return false;
        if(bis!=null&&jg>bis) return false;
        continue;
      }
      if(fKey==="alter"){
        const {von,bis}=fVals||{};
        if(von==null&&bis==null) continue;
        if(m.alter==null) return false;
        if(von!=null&&m.alter<von) return false;
        if(bis!=null&&m.alter>bis) return false;
        continue;
      }
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
      if(fKey==="geschlecht"){
        const GESCH_MAP={"m":"Männlich","w":"Weiblich","d":"Divers"};
        const label=GESCH_MAP[m.geschlecht]||m.geschlecht||null;
        if(!label||!fVals.includes(label)) return false;
        continue;
      }
      const raw=m[fKey];
      const mVal=Array.isArray(raw)?raw.map(v=>v?.name||v):[raw?.name||raw];
      if(!mVal.some(v=>fVals.includes(v))) return false;
    }
    return true;
  });
}

export function sortMembers(filtered, sortCol, sortDir, manualOrder=[]) {
  if(manualOrder.length>0){
    const orderMap=new Map(manualOrder.map((id,i)=>[id,i]));
    return [...filtered].sort((a,b)=>{
      const ai=orderMap.has(a.id)?orderMap.get(a.id):Infinity;
      const bi=orderMap.has(b.id)?orderMap.get(b.id):Infinity;
      return ai-bi;
    });
  }
  return [...filtered].sort((a,b)=>{
    const getVal=m=>{
      if(sortCol==="name") return `${m.vorname||""} ${m.nachname||""}`.trim().toLowerCase();
      if(sortCol==="teams_rollen"||sortCol==="teams"){
        const t=(m.teams||[])[0];
        return String(t?.name||t||"").toLowerCase();
      }
      if(sortCol==="funktionen_gruppen"||sortCol==="funktionsgruppen"){
        return String((m.funktionsgruppen||[])[0]||"").toLowerCase();
      }
      if(sortCol==="funktionen"){
        return String((m.funktionen||[])[0]||"").toLowerCase();
      }
      if(sortCol==="kaderrollen"){
        return String((m.kader_rollen_raw||[])[0]||"").toLowerCase();
      }
      if(sortCol==="rollen") return String(m.role||"").toLowerCase();
      const v=m[sortCol];
      if(v==null||v==="-") return "";
      if(Array.isArray(v)){
        const first=v[0];
        return String(first?.name||first||"").toLowerCase();
      }
      return String(v).toLowerCase();
    };
    const av=getVal(a), bv=getVal(b);
    if(av===""&&bv!=="") return 1;
    if(bv===""&&av!=="") return -1;
    return sortDir==="asc"?av.localeCompare(bv,"de"):bv.localeCompare(av,"de");
  });
}

export function getGroupKey(m, g, ROLLE_LABEL, filterVals={}) {
  if(g==="__jahrgang"){ if(!m.geburtsdatum) return ["Unbekannt"]; return [String(new Date(m.geburtsdatum).getFullYear())]; }
  if(g==="__eintrittsjahr"){ if(!m.eintritt) return ["Unbekannt"]; return [String(new Date(m.eintritt).getFullYear())]; }
  if(g==="teams"){
    const teamsFilter=filterVals["teams"]||[];
    const allTeams=(m.teams||[]).map(t=>t?.name||t);
    const filtered=teamsFilter.length>0?allTeams.filter(t=>teamsFilter.includes(t)):allTeams;
    return filtered.length>0?filtered.map(t=>({key:t,type:"team"})):[{key:"Kein Team",type:"team"}];
  }
  if(g==="rollen"){ const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null; return [portalLabel||"Keine Rolle"]; }
  if(g==="kaderrollen"){ return (m.kader_rollen_raw||[]).length>0?m.kader_rollen_raw.map(r=>({key:r,type:"kaderrolle"})):[{key:"Keine Kaderrolle",type:"kaderrolle"}]; }
  if(g==="funktionen"){
    const allFunk=m.funktionen||[];
    // Wenn parent eine Funktionsgruppe ist, nur Funktionen dieser Gruppe zeigen
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
  if(g==="funktionsgruppen"){
    const gruppenFilter=filterVals["funktionsgruppen"]||[];
    const allGruppen=m.funktionsgruppen||[];
    const filtered=gruppenFilter.length>0?allGruppen.filter(g=>gruppenFilter.includes(g)):allGruppen;
    return filtered.length>0?filtered.map(g=>({key:g,type:"gruppe"})):[{key:"Keine Funktionsgruppe",type:"gruppe"}];
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

export function buildGroups(paged, groupBy, ROLLE_LABEL, filterVals={}, parentGroup=null, groupOrder={}) {
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
  } else if(firstLevel==="__teams_funktionen"){
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
      ?buildGroups(members,restLevels,ROLLE_LABEL,
          (meta[k]==="gruppe")?{...filterVals,__parentGruppe:k}:filterVals,
          {type:meta[k]||"default",key:k},
          groupOrder)
      :null,
  }));
}

// Helper: Zellwert für Export
function exportCellValue(k, m, groupContext={type:"none",key:null}) {
  const gc=groupContext;
  if(k==="rollen") return (m.rollen||[]).join(", ");
  if(k==="teams"){
    const teams=gc.type==="team"?(m.teams||[]).filter(t=>(t?.name||t)===gc.key):(m.teams||[]);
    return teams.map(t=>t?.name||t).join(", ");
  }
  if(k==="kaderrollen"){
    if(gc.type==="gruppe") return "";
    const eintraege=gc.type==="team"?(m.kader_eintraege||[]).filter(e=>e.team?.name===gc.key):(m.kader_eintraege||[]);
    return eintraege.flatMap(e=>e.rollen).join(", ");
  }
  if(k==="teams_rollen"){
    const eintraege=gc.type==="gruppe"?[]:(gc.type==="team"?(m.kader_eintraege||[]).filter(e=>e.team?.name===gc.key):(m.kader_eintraege||[]));
    return eintraege.map(e=>`${e.team?.kurz||e.team?.name}: ${e.rollen.join(", ")}`).join(" | ");
  }
  if(k==="funktionen"){
    if(gc.type==="team") return "";
    const fns=gc.type==="gruppe"?(m.funktionen||[]).filter(f=>{return true;}):(m.funktionen||[]);
    return fns.join(", ");
  }
  if(k==="funktionsgruppen"){
    if(gc.type==="team") return "";
    const gruppen=gc.type==="gruppe"?[gc.key]:(m.funktionsgruppen||[]);
    return gruppen.join(", ");
  }
  if(k==="funktionen_gruppen"){
    if(gc.type==="team") return "";
    const paare=(m.funktionen||[]).map(f=>({f,g:null}));
    return paare.map(p=>p.g?`${p.g}: ${p.f}`:p.f).join(" | ");
  }
  if(k==="nationalitaet") return m.nationalitaet&&m.nationalitaet!=="-"?m.nationalitaet:"";
  if(k==="nationalitaet2") return m.nationalitaet2||"";
  if(k==="eintritt") return m.eintritt?new Date(m.eintritt).toLocaleDateString("de-CH"):"";
  if(k==="portal") return m.hat_portal_zugang?"Aktiv":"Kein Zugang";
  if(k==="datenpruefung") return m.profil_geprueft_at?"Geprüft":"Ausstehend";
  return m[k]!=null?String(m[k]):"";
}

function getExportRows(m, COLS, gc) {
  const exportCols=COLS.filter(c=>c.key!=="name").map(c=>c.key);
  return [m.name,...exportCols.map(k=>exportCellValue(k,m,gc))];
}

function csvDownload(data, filename) {
  const rows=data.map(r=>r.map(v=>'"'+String(v||"").replace(/"/g,'""')+'"').join(";"));
  const csv="\uFEFF"+rows.join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

export function exportData(filtered, COLS, format, groups=null) {
  // Bei flachem CSV: teams_rollen und funktionen_gruppen in separate Spalten expandieren
  function expandCols(cols){
    const expanded=[];
    for(const c of cols){
      if(c.key==="teams_rollen"){
        expanded.push({key:"teams",label:"Teams"},{key:"kaderrollen",label:"Kaderrollen"});
      } else if(c.key==="funktionen_gruppen"){
        expanded.push({key:"funktionsgruppen",label:"Funktionsgruppe"},{key:"funktionen",label:"Vereinsfunktionen"});
      } else {
        expanded.push(c);
      }
    }
    return expanded;
  }
  const hasGroups=groups&&groups.length>0&&groups[0].key!=="";

  if(format==="csv") {
    // Flacher CSV — expandierte Spalten
    const flatCols=expandCols(COLS);
    const headers=["Name",...flatCols.filter(c=>c.key!=="name").map(c=>c.label)];
    const rows=filtered.map(m=>getExportRows(m,flatCols,{type:"none",key:null}));
    csvDownload([headers,...rows],"mitglieder.csv");

  } else if(format==="csv-gruppen") {
    // CSV mit Gruppen — kombinierte Spalten behalten
    const headers=["Name",...COLS.filter(c=>c.key!=="name").map(c=>c.label)];
    if(!hasGroups){
      const rows=filtered.map(m=>getExportRows(m,COLS,{type:"none",key:null}));
      csvDownload([headers,...rows],"mitglieder-gruppen.csv");
      return;
    }
    const allRows=[headers];
    function addGroups(grps){
      grps.forEach(({key,label,type,members,children})=>{
        allRows.push([label||key,...new Array(headers.length-1).fill("")]);
        if(children) addGroups(children);
        else {
          const gc=type!=="none"?{type,key}:{type:"none",key:null};
          members.forEach(m=>allRows.push(getExportRows(m,COLS,gc)));
        }
        allRows.push(new Array(headers.length).fill(""));
      });
    }
    addGroups(groups);
    csvDownload(allRows,"mitglieder-gruppen.csv");

  } else if(format==="excel-sheets") {
    // Excel — expandierte Spalten für bessere Weiterverarbeitung
    const flatCols=expandCols(COLS);
    const headers=["Name",...flatCols.filter(c=>c.key!=="name").map(c=>c.label)];
    const wb=XLSX.utils.book_new();
    if(!hasGroups){
      const rows=filtered.map(m=>getExportRows(m,flatCols,{type:"none",key:null}));
      const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
      XLSX.utils.book_append_sheet(wb,ws,"Mitglieder");
    } else {
      function addSheets(grps){
        grps.forEach(({key,label,type,members,children})=>{
          if(children){ addSheets(children); return; }
          const gc=type!=="none"?{type,key}:{type:"none",key:null};
          const rows=members.map(m=>getExportRows(m,flatCols,gc));
          const sheetName=(label||key||"Gruppe").slice(0,31).replace(/[\/\*\?\[\]\:]/g,"");
          const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
          XLSX.utils.book_append_sheet(wb,ws,sheetName);
        });
      }
      addSheets(groups);
    }
    XLSX.writeFile(wb,"mitglieder.xlsx");
  }
}
