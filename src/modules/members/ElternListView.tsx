/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.tsx
   Eltern-Liste mit Kind+Team Anzeige, Fold-out, Filter, Gruppierung
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Av, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { fetchAlleElternkontakte, deleteElternkontakt } from "../../domains/members/memberService.ts";
import { ListView } from "../../shared/list/ListView.tsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.ts";
import type { ColDef, ColGroup, GroupContext, GroupOption, ListGroup, ListRow, RowId } from "../../shared/list/types.ts";
import type { Account, Sb, SetState } from "../../types.ts";

/* Direkt aus der Service-Rückgabe abgeleitet */
type ElternkontaktRoh = Awaited<ReturnType<typeof fetchAlleElternkontakte>>[number];
type KindVerknuepfung = ElternkontaktRoh["_alle_kinder"][number];

interface KindTeamRolle {
  team: string;
  rolle: string;
}

interface KindMitTeams {
  name: string;
  teams: string[];
  teamRollen: KindTeamRolle[];
  mitglied_id: number;
}

function getKinderMitTeams(alleKinder: KindVerknuepfung[]): KindMitTeams[] {
  return (alleKinder||[]).map(k => {
    const m = k.mitglieder;
    const name = m ? `${m.vorname||""} ${m.nachname||""}`.trim() : "?";
    const kaderArr = Array.isArray(m?.kader) ? m.kader : (m?.kader ? [m.kader] : []);
    const teamRollen: KindTeamRolle[] = kaderArr
      .filter(ka => ka.aktiv === true)
      .map(ka => {
        const tArr = Array.isArray(ka.teams) ? ka.teams : (ka.teams ? [ka.teams] : []);
        const t = tArr[0] as {kurzname?: string | null; name?: string} | undefined;
        const team = t?.kurzname || t?.name || "";
        const rollen = Array.isArray(ka.rollen) ? ka.rollen as string[] : (ka.rollen ? [String(ka.rollen)] : []);
        const rolle = rollen[0] || "";
        return { team, rolle };
      })
      .filter((tr: KindTeamRolle) => Boolean(tr.team));
    const teams = teamRollen.map(tr => tr.team);
    return { name, teams, teamRollen, mitglied_id: k.mitglied_id };
  });
}

function mapEltern(raw: ElternkontaktRoh[] | null | undefined) {
  return (raw||[]).map(e => {
    const kinder = getKinderMitTeams(e._alle_kinder||[]);
    const alleTeams = [...new Set(kinder.flatMap(k => k.teams))];
    return {
      id:          e.id,
      mitglied_id: e.mitglied_id,
      name:        `${e.vorname||""} ${e.nachname||""}`.trim()||e.name||"—",
      vorname:     e.vorname||"",
      nachname:    e.nachname||"",
      email:       e.email||"",
      telefon:     e.telefon||"",
      beziehung:   e.beziehung||"",
      portal:      e.benutzer_id?"Aktiv":"Kein Zugang",
      benutzer_id: e.benutzer_id||null,
      hauptkontakt:e.hauptkontakt||false,
      kind_id:     kinder[0]?.mitglied_id||null,
      kind_name:   kinder.map(k=>k.name).join(", ")||"—",
      kinder,
      teams:       alleTeams,
    };
  });
}

/* Schnitt mit ListRow liefert die Index-Signatur, die ListView
   (T extends ListRow) verlangt und renderCell für e[col.key] braucht. */
type ElternRow = ListRow & ReturnType<typeof mapEltern>[number];

const COL_DEFS: ColDef[] = [
  { key:"name",      label:"Name",      default:true, alwaysOn:true },
  { key:"beziehung", label:"Beziehung", default:true },
  { key:"email",     label:"E-Mail",    default:true },
  { key:"telefon",   label:"Telefon",   default:true },
  { key:"kind_name", label:"Kind",      default:true },
  { key:"portal",    label:"Portal",    default:true },
];

const COL_GROUPS: ColGroup[] = [{ group:"Elternkontakt", cols:COL_DEFS }];

const GROUP_OPTIONS: GroupOption[] = [
  { val:"teams",     label:"Team"       },
  { val:"beziehung", label:"Beziehung"  },
  { val:"portal",    label:"Portal"     },
];

function buildElternGroups(rows: ElternRow[], groupBy: string[] | string, groupOrder: Record<string, string[]>): ListGroup<ElternRow>[] {
  const firstLevel = Array.isArray(groupBy) ? groupBy[0] : groupBy;
  if(!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];

  const map: Record<string, ElternRow[]> = {};
  rows.forEach(r => {
    const val = r[firstLevel];
    const keys = Array.isArray(val) && val.length > 0 ? val.map(v => String(v)) : [String(val ?? "—")];
    keys.forEach(k => {
      if(!map[k]) map[k] = [];
      if(!map[k].find(x => x.id === r.id)) map[k].push(r);
    });
  });

  const groupType = firstLevel === "teams" ? "team" : "none";
  const allKeys = Object.keys(map).sort((a,b) => String(a).localeCompare(String(b), "de"));
  const orderedKeys = groupOrder[firstLevel]
    ? [...groupOrder[firstLevel].filter(k => allKeys.includes(k)), ...allKeys.filter(k => !groupOrder[firstLevel].includes(k))]
    : allKeys;

  return orderedKeys.map(k => ({ key:k, label:k, type:groupType, members:map[k], children:null }));
}

interface ElternRenderCellDeps {
  expandedKinder: Set<string>;
  setExpandedKinder: SetState<Set<string>>;
  onNavToMember?: ((id: number) => void) | null;
}

function makeElternRenderCell({ expandedKinder, setExpandedKinder, onNavToMember }: ElternRenderCellDeps) {
  return function renderElternCell(col: ColDef, e: ElternRow, groupCtx?: GroupContext) {
    switch(col.key) {
      case "name":
        return <td key="name" className="cc-members-td">
          <div className="cc-row cc-gap-8">
            <Av name={e.name||"?"} size={26}/>
            <span className="cc-text-bold">{e.name}</span>
          </div>
        </td>;
      case "portal":
        return <td key="portal" className="cc-members-td">
          {e.benutzer_id
            ?<span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>
            :<span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>
          }
        </td>;
      case "kind_name": {
        const teamGruppe = groupCtx?.type === "team" ? groupCtx.key : null;
        const kinder = teamGruppe
          ? e.kinder.filter(k => k.teams.includes(teamGruppe))
          : e.kinder;
        const isExp = expandedKinder.has(e.id);
        const visible = isExp ? kinder : kinder.slice(0, 2);
        const rest = kinder.length - 2;
        return <td key="kind_name" className="cc-members-td" onClick={ev=>ev.stopPropagation()}>
          <div className="cc-col cc-gap-4">
            {visible.map((k,i) => {
              const teamRollen = teamGruppe
                ? k.teamRollen.filter(tr => tr.team === teamGruppe)
                : k.teamRollen;
              return (
                <div key={i} className="cc-teams-rollen-row">
                  {onNavToMember
                    ? <button className="cc-eltern-kind-link" onClick={ev=>{ev.stopPropagation();onNavToMember(k.mitglied_id);}}>{k.name}</button>
                    : <span className="cc-teams-rollen-team">{k.name}</span>
                  }
                  {teamRollen.map((tr, j) => (
                    <span key={j}>
                      <span className="cc-teams-rollen-sep">·</span>
                      <span className="cc-teams-rollen-rolle">
                        {tr.team}{tr.rolle && <span className="cc-teams-rollen-klammer"> ({tr.rolle})</span>}
                      </span>
                    </span>
                  ))}
                </div>
              );
            })}
            {rest>0&&(
              <button className="cc-teams-rollen-more" onClick={ev=>{
                ev.stopPropagation();
                setExpandedKinder(prev=>{const n=new Set(prev);n.has(e.id)?n.delete(e.id):n.add(e.id);return n;});
              }}>
                {isExp
                  ?<><TI n="chevron-up" size={10}/>weniger</>
                  :<><TI n="chevron-down" size={10}/>+{rest} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      default:
        return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(e[col.key]||"—")}</td>;
    }
  };
}

interface ElternListViewProps {
  sb: Sb;
  vereinId: string | null;
  account?: Account | null;
  isAdmin?: boolean;
  onNavToMember?: ((id: number) => void) | null;
}

export function ElternListView({ sb, vereinId, account, isAdmin = false, onNavToMember = null }: ElternListViewProps) {
  const [rows, setRows] = useState<ElternRow[]>([]);
  const [confirm, confirmDialog] = useConfirm();
  const [expandedKinder, setExpandedKinder] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sb || !vereinId) return;
    fetchAlleElternkontakte(sb, vereinId).then(data => setRows(mapEltern(data)));
  }, [sb, vereinId]);

  /* Alle Teams aus Kinder-Verknüpfungen für Filter-Dropdown */
  const alleTeams = [...new Set(rows.flatMap(r => r.teams))].sort();

  const filterDefs = buildFilterDefs(rows, [
    { key:"beziehung", label:"Beziehung" },
    { key:"portal",    label:"Portal", vals:["Aktiv","Kein Zugang"] },
    { key:"teams",     label:"Team",   vals:alleTeams },
  ]);

  /* Volltext-Suche: Name, E-Mail, Telefon, Kind-Namen, Teams */
  function filterEltern(elternRows: ElternRow[], search: string): ElternRow[] {
    if (!search) return elternRows;
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return elternRows.filter(e => {
      const haystack = [
        e.name, e.vorname, e.nachname,
        e.email, e.telefon, e.beziehung,
        e.kind_name,
        ...e.kinder.map(k => k.name),
        ...e.teams,
      ].join(" ").toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }

  const renderCell = makeElternRenderCell({ expandedKinder, setExpandedKinder, onNavToMember });

  async function loeschen(selected: Set<RowId>) {
    if (!selected?.size) return;
    const namen = [...selected].map(id => rows.find(r => r.id === id)?.name).filter(Boolean);
    const ok = await confirm({ title:`${selected.size} Elternkontakte löschen?`, message:`Gelöscht werden: ${namen.join(", ")}`, danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteElternkontakt(sb, String(id));
    setRows(prev => prev.filter(r => !selected.has(r.id)));
  }

  return (
    <>
      {confirmDialog}
      <ListView<ElternRow>
        emptyIcon="heart"
        emptyTitle="Noch keine Elternkontakte"
        emptySubtitle="Elternkontakte werden beim Mitglied erfasst."
        rows={rows}
        filterFn={(elternRows, search, filterVals) => {
          /* Volltext-Suche */
          let result = filterEltern(elternRows, search);
          /* Team-Filter */
          const teamVals: string[] = Array.isArray(filterVals["teams"]) ? filterVals["teams"] : [];
          if (teamVals.length > 0) {
            result = result.filter(r => r.teams.some(t => teamVals.includes(t)));
          }
          return result;
        }}
        colDefs={COL_DEFS}
        colGroups={COL_GROUPS}
        filterDefs={filterDefs}
        groupOptions={GROUP_OPTIONS}
        buildGroupsFn={buildElternGroups}
        renderCell={renderCell}
        sb={sb}
        account={account}
        vereinId={vereinId}
        viewTyp="eltern"
        isAdmin={isAdmin}
        selectable
        bulkActions={[
          { icon:"trash", label:"Löschen", danger:true, requiresSelection:true, onClick:loeschen },
        ]}
        footerLabel={(f,t) => `${f} von ${t} Elternkontakten`}
        exportFn={(rows,cols,groups,format) => exportListData(rows,cols,groups,format,{filename:"eltern",sheetName:"Eltern"})}
        exportFormats={[
          {label:"E-Mail-Liste als CSV (flach)",        format:"csv"},
          {label:"E-Mail-Liste als CSV (mit Gruppen)",  format:"csv-gruppen"},
          {label:"Excel (pro Gruppe ein Sheet)",         format:"excel-sheets", icon:"table"},
        ]}
      />
    </>
  );
}
