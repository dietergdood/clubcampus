/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.jsx
   Eltern-Tab — nutzt zentrale ListView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Av, useConfirm } from "../../theme.jsx";
import { fetchAlleElternkontakte, deleteElternkontakt } from "../../domains/members/memberService.js";
import { ListView } from "../../shared/list/ListView.jsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.js";

function mapEltern(raw) {
  return (raw||[]).map(e=>{
    const kind = e.mitglieder;
    const kindName = kind ? `${kind.vorname||""} ${kind.nachname||""}`.trim() : "—";
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
      kind_id:     kind?.id||null,
      kind_name:   kindName,
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
  { val:"kind_name",  label:"Kind"      },
  { val:"beziehung",  label:"Beziehung" },
  { val:"portal",     label:"Portal"    },
];

function renderElternCell(col, e) {
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
    default:
      return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(e[col.key]||"—")}</td>;
  }
}

export function ElternListView({ sb, vereinId, account, isAdmin = false }) {
  const [rows, setRows] = useState([]);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    if (!sb || !vereinId) return;
    fetchAlleElternkontakte(sb, vereinId).then(data => setRows(mapEltern(data)));
  }, [sb, vereinId]);

  const filterDefs = buildFilterDefs(rows, [
    { key:"beziehung", label:"Beziehung" },
    { key:"portal",    label:"Portal", vals:["Aktiv","Kein Zugang"] },
  ]);

  async function loeschen(selected) {
    if (!selected?.size) return;
    const kinder = [...selected].map(id => rows.find(r => r.id === id)?.kind_name).filter(Boolean);
    const kinderText = kinder.length > 0 ? `\n\nBetroffene Kinder: ${kinder.join(", ")}` : "";
    const ok = await confirm({ title:`${selected.size} Elternkontakte löschen?`, message:`Die Elternkontakte werden auch beim verknüpften Kind entfernt.${kinderText}`, danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteElternkontakt(sb, id);
    setRows(prev => prev.filter(r => !selected.has(r.id)));
  }

  return (
    <>
      {confirmDialog}
      <ListView
        rows={rows}
        colDefs={COL_DEFS}
        colGroups={COL_GROUPS}
        filterDefs={filterDefs}
        groupOptions={GROUP_OPTIONS}
        renderCell={renderElternCell}
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
