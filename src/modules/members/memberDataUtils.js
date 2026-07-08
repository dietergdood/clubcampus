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
      rollen:[...rollenSet], kader_rollen_raw:m.kader_rollen||[],
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
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||fVals.length===0) continue;
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!fVals.includes(portalLabel)) return false;
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

export function getGroupKey(m, g, ROLLE_LABEL) {
  if(g==="__jahrgang"){ if(!m.geburtsdatum) return "Unbekannt"; return String(new Date(m.geburtsdatum).getFullYear()); }
  if(g==="__eintrittsjahr"){ if(!m.eintritt) return "Unbekannt"; return String(new Date(m.eintritt).getFullYear()); }
  if(g==="teams"){ return (m.teams||[]).length>0?(m.teams||[]).map(t=>t?.name||t):["Kein Team"]; }
  if(g==="rollen"){ const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null; return portalLabel||"Keine Rolle"; }
  return null;
}

export function buildGroups(paged, groupBy, ROLLE_LABEL) {
  if(groupBy==="none") return [{key:"",members:paged}];
  const map={};
  paged.forEach(m=>{
    const computed=getGroupKey(m,groupBy,ROLLE_LABEL);
    const vals=computed!==null?(Array.isArray(computed)?computed:[computed]):Array.isArray(m[groupBy])?m[groupBy].map(t=>t?.name||t||"-"):[m[groupBy]||"-"];
    vals.forEach(k=>{ if(!map[k]) map[k]=[]; map[k].push(m); });
  });
  return Object.entries(map).sort(([a],[b])=>String(a||"").localeCompare(String(b||""))).map(([k,members])=>({key:k,members}));
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
