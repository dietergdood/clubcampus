/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberExportUtils.js
   Mitglieder-spezifische Export-Logik

   exportData(filtered, COLS, format, groups)
     format: "csv" | "csv-gruppen" | "excel-sheets"
     Besonderheit: teams_rollen/funktionen_gruppen werden bei flachem
     CSV in separate Spalten expandiert (Teams+Kaderrollen / Gruppe+Funktion)

   exportCellValue(k, m, groupContext)
     Formatiert einzelne Zellwerte kontext-sensitiv:
     Bei type="team" → nur Eintraege dieses Teams
     Bei type="gruppe" → nur Eintraege dieser Gruppe
   ═══════════════════════════════════════════════════════════════ */
import * as XLSX from "xlsx";
import { csvDownload } from "../../shared/list/exportUtils.js";

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
    const fns=gc.type==="gruppe"?(m.funktionen||[]):(m.funktionen||[]);
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
    const flatCols=expandCols(COLS);
    const headers=["Name",...flatCols.filter(c=>c.key!=="name").map(c=>c.label)];
    const rows=filtered.map(m=>getExportRows(m,flatCols,{type:"none",key:null}));
    csvDownload([headers,...rows],"mitglieder.csv");

  } else if(format==="csv-gruppen") {
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
