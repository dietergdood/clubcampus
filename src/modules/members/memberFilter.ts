/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberFilter.ts
   Filter- und Sortierlogik für MitgliederModul

   filterMembers: Kombiniert UND/ODER-Logik:
     - Teams: ODER
     - Kaderrollen + Funktionen + Funktionsgruppen: ODER (untereinander)
     - Alle anderen Filter: UND
     - Jahrgang + Alter: Range-Filter (UND)
   ═══════════════════════════════════════════════════════════════ */
import { memberFeld } from "./memberMapper.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { FilterVals } from "../../shared/list/types.ts";
import type { RowId } from "../../shared/list/types.ts";

/* Teams liegen mal als Objekt, mal als blosser Name vor */
type TeamRef = { name?: string | null; kurz?: string | null } | string | null | undefined;

function teamName(t: TeamRef): string {
  if (!t) return "";
  return typeof t === "string" ? t : (t.name || "");
}

/* Entspricht dem früheren `v?.name || v`: bei Objekten die name-Eigenschaft,
   sonst der Wert selbst. Ohne Cast, weil der Feldzugriff unknown liefert. */
function wertName(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    for (const [k, val] of Object.entries(v)) if (k === "name" && typeof val === "string") return val;
    return "";
  }
  return String(v);
}

/* Auswahlliste eines Filters (Bereichsfilter liefern kein Array) */
export function alsListe(v: FilterVals[string]): string[] {
  return Array.isArray(v) ? v : [];
}

/* Bereichsgrenzen eines Range-Filters */
function alsBereich(v: FilterVals[string]): { von?: number | null; bis?: number | null } {
  return v && !Array.isArray(v) ? v : {};
}

export function filterMembers(
  allMembers: MemberRow[],
  search: string,
  filterVals: FilterVals,
  ROLLE_LABEL: Record<string, string>,
): MemberRow[] {
  return allMembers.filter(m => {
    // Volltext-Suche: alle Terme müssen im Haystack vorkommen
    if(search){
      const terms=search.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack=[
        m.name, m.vorname, m.nachname,
        m.mitgliedschaft,
        ...(m.rollen||[]),
        ...(m.teams||[]).map(t=>teamName(t)),
        ...(m.teams||[]).map(t=>(typeof t==="string"?"":t?.kurz||"")),
        m.email||"",
        m.telefon||"",
        m.strasse||"",
        m.plz||"",
        m.ort||"",
        m.wohnort||"",
        m.heimatort||"",
        m.nationalitaet||"",
        m.nationalitaet2||"",
        m.position||"",
        m.fairgate_id||"",
        m.js_nr||"",
        m.spielerpass||"",
        ...(m.funktionen||[]),
        ...(m.funktionsgruppen||[]),
      ].join(" ").toLowerCase();
      if(!terms.every(t=>haystack.includes(t))) return false;
    }

    // Teams: ODER-verknüpft (separat von den anderen ODER-Filtern)
    const teamsVals=alsListe(filterVals["teams"]);
    if(teamsVals.length>0){
      const inTeam=(m.teams||[]).map(t=>teamName(t)).some(t=>teamsVals.includes(t));
      if(!inTeam) return false;
    }

    // Kaderrollen + Vereinsfunktionen + Funktionsgruppen: ODER untereinander
    const kaderVals=alsListe(filterVals["kaderrollen"]);
    const funktionenVals=alsListe(filterVals["funktionen"]);
    const gruppenVals=alsListe(filterVals["funktionsgruppen"]);
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
        const {von,bis}=alsBereich(fVals);
        if(von==null&&bis==null) continue;
        const jg=m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null;
        if(!jg) return false;
        if(von!=null&&jg<von) return false;
        if(bis!=null&&jg>bis) return false;
        continue;
      }

      // Alter Range-Filter
      if(fKey==="alter"){
        const {von,bis}=alsBereich(fVals);
        if(von==null&&bis==null) continue;
        if(m.alter==null) return false;
        if(von!=null&&m.alter<von) return false;
        if(bis!=null&&m.alter>bis) return false;
        continue;
      }

      const werte=alsListe(fVals);

      // Portalrollen: Label-Vergleich
      if(fKey==="rollen"){
        const portalLabel=m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null;
        if(!portalLabel||!werte.includes(portalLabel)) return false;
        continue;
      }

      // Kaderrollen: bereits oben behandelt
      if(fKey==="kaderrollen") continue;

      // Geschlecht: Code → Label
      if(fKey==="geschlecht"){
        const GESCH_MAP: Record<string,string>={"m":"Männlich","w":"Weiblich","d":"Divers"};
        const label=(m.geschlecht?GESCH_MAP[m.geschlecht]:null)||m.geschlecht||null;
        if(!label||!werte.includes(label)) return false;
        continue;
      }

      // Standard-Filter: direkter Wertvergleich
      const raw=memberFeld(m,fKey);
      const mVal=Array.isArray(raw)?raw.map(v=>wertName(v)):[wertName(raw)];
      if(!mVal.some(v=>werte.includes(v))) return false;
    }
    return true;
  });
}

/* Status-Spalten haben eine fachliche Reihenfolge, die nicht der
   alphabetischen entspricht: "Geprueft" gehoert vor "Ausstehend", nicht
   dahinter. Der Rang wird dem Wert als Praefix vorangestellt
   ("0_geprueft" < "1_ausstehend"), damit der normale localeCompare
   greift. Werte ausserhalb der Tabelle bekommen Rang 9 und landen am
   Ende — aber vor dem Leerwert-Handling, weil sie nicht leer sind. */
const STATUS_RANG: Record<string, Record<string, number>> = {
  datenpruefung: { "Geprueft": 0, "Ausstehend": 1 },
  portal:        { "Aktiv": 0, "Deaktiviert": 1, "Kein Zugang": 2 },
};

export function sortMembers(
  filtered: MemberRow[],
  sortCol: string,
  sortDir: "asc" | "desc",
  manualOrder: RowId[] = [],
): MemberRow[] {
  // Manuelle Reihenfolge (Drag & Drop) hat Vorrang
  if(manualOrder.length>0){
    const orderMap=new Map(manualOrder.map((id,i)=>[id,i]));
    return [...filtered].sort((a,b)=>{
      const ai=orderMap.has(a.id)?orderMap.get(a.id)!:Infinity;
      const bi=orderMap.has(b.id)?orderMap.get(b.id)!:Infinity;
      return ai-bi;
    });
  }

  return [...filtered].sort((a,b)=>{
    const getVal=(m: MemberRow): string=>{
      // Status-Spalten: fachliche statt alphabetischer Reihenfolge
      const rangTabelle=STATUS_RANG[sortCol];
      if(rangTabelle){
        const roh=String(memberFeld(m,sortCol)??"");
        return `${rangTabelle[roh]??9}_${roh.toLowerCase()}`;
      }
      // Spezielle Sortierschlüssel für zusammengesetzte Spalten
      if(sortCol==="name") return `${m.vorname||""} ${m.nachname||""}`.trim().toLowerCase();
      if(sortCol==="teams_rollen"||sortCol==="teams"){
        const t=(m.teams||[])[0];
        return teamName(t).toLowerCase();
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
      const v=memberFeld(m,sortCol);
      if(v==null||v==="-") return "";
      if(Array.isArray(v)){
        return wertName(v[0]).toLowerCase();
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
