/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.jsx
   Eltern-Liste mit Kind+Team Anzeige, Fold-out, Filter, Gruppierung
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Av, useConfirm, useIsMobile } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { fetchAlleElternkontakte, deleteElternkontakt } from "../../domains/members/memberService.js";
import { ListView } from "../../shared/list/ListView.jsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.js";

function getKinderMitTeams(alleKinder) {
  return (alleKinder||[]).map(k => {
    const m = k.mitglieder;
    const name = m ? `${m.vorname||""} ${m.nachname||""}`.trim() : "?";
    const teams = (m?.kader||[])
      .filter(ka => ka.aktiv)
      .map(ka => ka.teams?.kurzname||ka.teams?.name)
      .filter(Boolean);
    return { name, teams, mitglied_id: k.mitglied_id };
  });
}

function mapEltern(raw) {
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

const COL_DEFS = [
  { key:"name",      label:"Name",      default:true, alwaysOn:true },
  { key:"beziehung", label:"Beziehung", default:true },
  { key:"email",     label:"E-Mail",    default:true },
  { key:"telefon",   label:"Telefon",   default:true },
  { key:"kind_name", label:"Kind",      default:true },
  { key:"portal",    label:"Portal",    default:true },
];

const COL_GROUPS = [{ group:"Elternkontakt", cols:COL_DEFS }];

const GROUP_OPTIONS = [
  { val:"teams",     label:"Team"       },
  { val:"beziehung", label:"Beziehung"  },
  { val:"portal",    label:"Portal"     },
];

function makeElternRenderCell({ expandedKinder, setExpandedKinder }) {
  return function renderElternCell(col, e) {
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
        const isExp = expandedKinder.has(e.id);
        const visible = isExp ? e.kinder : e.kinder.slice(0, 2);
        const rest = e.kinder.length - 2;
        return <td key="kind_name" className="cc-members-td" onClick={ev=>ev.stopPropagation()}>
          <div className="cc-col cc-gap-4">
            {visible.map((k,i) => (
              <div key={i} className="cc-teams-rollen-row">
                <span className="cc-teams-rollen-team">{k.name}</span>
                {k.teams.length>0&&<>
                  <span className="cc-teams-rollen-sep">·</span>
                  <span className="cc-teams-rollen-rolle">{k.teams.join(", ")}</span>
                </>}
              </div>
            ))}
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

export function ElternListView({ sb, vereinId, account, isAdmin = false }) {
  const [rows, setRows] = useState([]);
  const [confirm, confirmDialog] = useConfirm();
  const [expandedKinder, setExpandedKinder] = useState(new Set());

  useEffect(() => {
    if (!sb || !vereinId) return;
    fetchAlleElternkontakte(sb, vereinId).then(data => setRows(mapEltern(data)));
  }, [sb, vereinId]);

  // Für Gruppierung nach Teams: Zeile pro Team expandieren
  const expandedRows = rows.flatMap(e =>
    e.teams.length > 0
      ? e.teams.map(t => ({ ...e, _groupKey: t }))
      : [{ ...e, _groupKey: "—" }]
  );

  const filterDefs = buildFilterDefs(rows, [
    { key:"beziehung", label:"Beziehung" },
    { key:"portal",    label:"Portal", vals:["Aktiv","Kein Zugang"] },
  ]);

  const renderCell = makeElternRenderCell({ expandedKinder, setExpandedKinder });

  async function loeschen(selected) {
    if (!selected?.size) return;
    const namen = [...selected].map(id => rows.find(r => r.id === id)?.name).filter(Boolean);
    const ok = await confirm({ title:`${selected.size} Elternkontakte löschen?`, message:`Gelöscht werden: ${namen.join(", ")}`, danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteElternkontakt(sb, id);
    setRows(prev => prev.filter(r => !selected.has(r.id)));
  }

  return (
    <>
      {confirmDialog}
      <ListView
        emptyIcon="heart"
        emptyTitle="Noch keine Elternkontakte"
        emptySubtitle="Elternkontakte werden beim Mitglied erfasst."
        rows={rows}
        colDefs={COL_DEFS}
        colGroups={COL_GROUPS}
        filterDefs={filterDefs}
        groupOptions={GROUP_OPTIONS}
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
