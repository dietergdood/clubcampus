/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberGrouping.ts
   Gruppierungslogik für MitgliederModul ListView

   NICHT ÄNDERN ohne alle 10 Gruppierungsszenarien zu testen!
   Siehe ARCHITECTURE.md → "Bekannte Fallgruben bei MitgliederModul"

   ── Ablauf bei Mehrfachgruppierung ["teams", "kaderrollen"] ──

   buildGroups(paged, ["teams","kaderrollen"], ...)
     │
     ├─ Ebene 1: getGroupKey(m, "teams", ...)
     │    → ["1. Mannschaft", "A-Junioren"] (Mitglied in 2 Teams)
     │
     └─ Ebene 2 (rekursiv): buildGroups(members, ["kaderrollen"], ...,
                              filterVals = { __parentTeam: "1. Mannschaft" })
          → getGroupKey sieht __parentTeam → nur Rollen in diesem Team

   Kontext-Weitergabe via filterVals:
     __parentTeam       → kaderrollen nur in diesem Team
     __parentGruppe     → funktionen nur in dieser Gruppe
     __portalFunktionen → für Funktions-Gruppen-Zuordnung
   ═══════════════════════════════════════════════════════════════ */
import { memberFeld } from "./memberMapper.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { ListGroup } from "../../shared/list/types.ts";

/* Jetzt direkt die generische ListGroup — moeglich, seit MemberRow ein
   Type-Alias ist und damit die ListRow-Constraint erfuellt. */
export type MemberGroup = ListGroup<MemberRow>;

/* Ein Gruppenschlüssel — entweder blosser Text oder Text mit Typ.
   Der Typ landet später in GroupContext.type. */
export interface GroupKey {
  key: string;
  type: string;
}

export type GroupKeyResult = string | GroupKey;

/* Die internen Kontextschlüssel liegen im selben Objekt wie die normalen
   Filterwerte, tragen aber andere Typen — daher eigene Beschreibung. */
export interface GroupFilterVals {
  [key: string]: unknown;
  __parentTeam?: string;
  __parentGruppe?: string;
  __portalFunktionen?: { name: string; portal_gruppen?: { name?: string | null } | null }[];
}

function alsListe(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function teamName(t: unknown): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  if (typeof t === "object") {
    for (const [k, v] of Object.entries(t)) if (k === "name" && typeof v === "string") return v;
  }
  return "";
}

export function getGroupKey(
  m: MemberRow,
  g: string,
  ROLLE_LABEL: Record<string, string>,
  filterVals: GroupFilterVals = {},
): GroupKeyResult[] {
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
    const teamsFilter=alsListe(filterVals["teams"]);
    const kaderFilter=alsListe(filterVals["kaderrollen"]);
    let allTeams=(m.teams||[]).map(t=>teamName(t));
    if(teamsFilter.length>0) allTeams=allTeams.filter(t=>teamsFilter.includes(t));
    if(kaderFilter.length>0){
      allTeams=allTeams.filter(tName=>{
        const eintraege=(m.kader_eintraege||[]).filter(e=>e.team?.name===tName);
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
    const gruppenFilter=alsListe(filterVals["funktionsgruppen"]);
    const allGruppen=m.funktionsgruppen||[];
    const filtered=gruppenFilter.length>0?allGruppen.filter(x=>gruppenFilter.includes(x)):allGruppen;
    return filtered.length>0?filtered.map(x=>({key:x,type:"gruppe"})):[{key:"Keine Funktionsgruppe",type:"gruppe"}];
  }

  // ── Teams & Funktionsgruppen kombiniert ──────────────────────
  // Zeigt Teams (mit Kaderrolle-Filter) und Funktionsgruppen nebeneinander
  if(g==="__teams_funktionen"){
    const teamsFilter=alsListe(filterVals["teams"]);
    const gruppenFilter=alsListe(filterVals["funktionsgruppen"]);
    const kaderFilter=alsListe(filterVals["kaderrollen"]);
    let teams=(m.teams||[]).map(t=>teamName(t));
    if(teamsFilter.length>0) teams=teams.filter(t=>teamsFilter.includes(t));
    if(kaderFilter.length>0){
      teams=teams.filter(tName=>{
        const eintraege=(m.kader_eintraege||[]).filter(e=>e.team?.name===tName);
        return eintraege.some(e=>e.rollen.some(r=>kaderFilter.includes(r)));
      });
    }
    const gruppen=(m.funktionsgruppen||[])
      .filter(x=>gruppenFilter.length===0||gruppenFilter.includes(x))
      .map(x=>({key:x,type:"gruppe"}));
    const teamsMapped=teams.map(t=>({key:t,type:"team"}));
    return [...gruppen,...teamsMapped].length>0?[...gruppen,...teamsMapped]:[{key:"Keine Zuordnung",type:"none"}];
  }

  // ── Fallback: direkter Feldwert ──────────────────────────────
  const v=memberFeld(m,g);
  if(Array.isArray(v)){
    const namen=v.map(t=>teamName(t)||"-").filter(Boolean);
    return namen.length>0?namen:["-"];
  }
  return [String(v||"-")];
}

export function buildGroups(
  paged: MemberRow[],
  groupBy: string | string[],
  ROLLE_LABEL: Record<string, string>,
  filterVals: GroupFilterVals = {},
  _parentGroup: { type: string; key: string } | null = null,
  groupOrder: Record<string, string[]> = {},
): MemberGroup[] {
  const levels=Array.isArray(groupBy)?groupBy:[groupBy];
  const firstLevel=levels[0]||"none";
  const restLevels=levels.slice(1);

  if(firstLevel==="none") return [{key:"",label:"",type:"none",members:paged,children:null}];

  // Mitglieder auf Gruppen aufteilen
  const map: Record<string, MemberRow[]>={};
  const meta: Record<string, string>={};
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
