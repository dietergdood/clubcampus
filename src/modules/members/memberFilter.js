/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberFilter.js
   Filter- und Sortierlogik für MitgliederModul

   filterMembers: Kombiniert UND/ODER-Logik:
     - Teams: ODER
     - Kaderrollen + Funktionen + Funktionsgruppen: ODER (untereinander)
     - Alle anderen Filter: UND
     - Jahrgang + Alter: Range-Filter (UND)
   ═══════════════════════════════════════════════════════════════ */

export function filterMembers(allMembers, search, filterVals, ROLLE_LABEL) {
  return allMembers.filter(m => {
    // Volltext-Suche: alle Terme müssen im Haystack vorkommen
    if(search){
      const terms=search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack=[
        m.name, m.mitgliedschaft,
        ...(m.rollen||[]),
        ...(m.teams||[]).map(t=>t?.name||t||""),
        ...(m.teams||[]).map(t=>t?.kurz||""),
        m.email||"",
      ].join(" ").toLowerCase();
      if(!terms.every(t=>haystack.includes(t))) return false;
    }

    // Teams: ODER-verknüpft (separat von den anderen ODER-Filtern)
    const teamsVals=filterVals["teams"]||[];
    if(teamsVals.length>0){
      const inTeam=(m.teams||[]).map(t=>t?.name||t).some(t=>teamsVals.includes(t));
      if(!inTeam) return false;
    }

    // Kaderrollen + Vereinsfunktionen + Funktionsgruppen: ODER untereinander
    const kaderVals=filterVals["kaderrollen"]||[];
    const funktionenVals=filterVals["funktionen"]||[];
    const gruppenVals=filterVals["funktionsgruppen"]||[];
    if(kaderVals.length>0||funktionenVals.length>0||gruppenVals.length>0){
      const inKader=kaderVals.length>0&&(m.kader_rollen_raw||[]).some(r=>kaderVals.includes(r));
      const inFunktion=funktionenVals.length>0&&(m.funktionen||[]).some(f=>funktionenVals.includes(f));
      const inGruppe=gruppenVals.length>0&&(m.funktionsgruppen||[]).some(g=>gruppenVals.includes(g));
      if(!inKader&&!inFunktion&&!inGruppe) return false;
    }

    // Alle anderen Filter: UND-verknüpft
    for(const [fKey,fVals] of Object.entries(filterVals)){
      if(!fVals||(Array.isArray(fVals)&&fVals.length===0)) continue;
      if(typeof fVals==="object"&&!Array.isArray(fVals)&&fKey!=="jahrgang"&&fKey!=="alter") continue;
      if(fKey==="teams"||fKey==="funktionsgruppen"||fKey==="kaderrollen"||fKey==="funktionen") continue;

      // Jahrgang Range-Filter
      if(fKey==="jahrgang"){
        const {von,bis}=fVals||{};
        if(von==null&&bis==null) continue;
        const jg=m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null;
        if(!jg) return false;
        if(von!=null&&jg<von) return false;
        if(bis!=null&&jg>bis) return false;
        continue;
      }

      // Alter Range-Filter
      if(fKey==="alter"){
        const {von,bis}=fVals||{};
        if(von==null&&bis==null) continue;
        if(m.alter==null) return false;
        if(von!=null&&m.alter<von) return false;
        if(bis!=null&&m.alter>bis) return false;
        continue;
      }

      // Portalrollen: Label-Vergleich
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!fVals.includes(portalLabel)) return false;
        continue;
      }

      // Kaderrollen: bereits oben behandelt
      if(fKey==="kaderrollen") continue;

      // Geschlecht: Code → Label
      if(fKey==="geschlecht"){
        const GESCH_MAP={"m":"Männlich","w":"Weiblich","d":"Divers"};
        const label=GESCH_MAP[m.geschlecht]||m.geschlecht||null;
        if(!label||!fVals.includes(label)) return false;
        continue;
      }

      // Standard-Filter: direkter Wertvergleich
      const raw=m[fKey];
      const mVal=Array.isArray(raw)?raw.map(v=>v?.name||v):[raw?.name||raw];
      if(!mVal.some(v=>fVals.includes(v))) return false;
    }
    return true;
  });
}

export function sortMembers(filtered, sortCol, sortDir, manualOrder=[]) {
  // Manuelle Reihenfolge (Drag & Drop) hat Vorrang
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
      // Spezielle Sortierschlüssel für zusammengesetzte Spalten
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
      // Standard: direkter Feldwert
      const v=m[sortCol];
      if(v==null||v==="-") return "";
      if(Array.isArray(v)){
        const first=v[0];
        return String(first?.name||first||"").toLowerCase();
      }
      return String(v).toLowerCase();
    };
    const av=getVal(a), bv=getVal(b);
    // Leere Werte ans Ende
    if(av===""&&bv!=="") return 1;
    if(bv===""&&av!=="") return -1;
    return sortDir==="asc"?av.localeCompare(bv,"de"):bv.localeCompare(av,"de");
  });
}
