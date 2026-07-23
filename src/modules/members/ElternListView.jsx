/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.jsx
   Eltern-Tab — nutzt zentrale ListView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Av, useConfirm, ConfirmDialog } from "../../theme.jsx";
import { fetchAlleElternkontakte, deleteElternkontakt } from "../../domains/members/memberService.js";
import { mapEltern, filterEltern, sortEltern } from "./memberDataUtils.js";
import { ListView } from "../../shared/list/ListView.jsx";
import { exportListData } from "../../shared/list/exportUtils.js";

const COL_DEFS = [
  { key:"name",      label:"Name",      default:true, alwaysOn:true },
  { key:"beziehung", label:"Beziehung", default:true  },
  { key:"email",     label:"E-Mail",    default:true  },
  { key:"telefon",   label:"Telefon",   default:true  },
  { key:"kind_name", label:"Kind",      default:true  },
  { key:"portal",    label:"Portal",    default:true  },
];

const COL_GROUPS = [{ group:"Elternkontakt", cols:COL_DEFS }];

const GROUP_OPTIONS = [
  { val:"kind_name",  label:"Kind"      },
  { val:"beziehung",  label:"Beziehung" },
  { val:"portal",     label:"Portal"    },
];

function filterElternFn(rows, search, filterVals) {
  let result = filterEltern(rows, search);
  Object.entries(filterVals).forEach(([k, vals]) => {
    if (!vals || !Array.isArray(vals) || vals.length === 0) return;
    result = result.filter(e => vals.includes(e[k]));
  });
  return result;
}

function buildElternGroups(rows, groupBy, groupOrder) {
  const levels = Array.isArray(groupBy) ? groupBy : [groupBy];
  const firstLevel = levels[0] || "none";
  const restLevels = levels.slice(1);
  if (!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];
  const map = {};
  rows.forEach(e => {
    const k = e[firstLevel] || "—";
    if (!map[k]) map[k] = [];
    map[k].push(e);
  });
  const orderForLevel = groupOrder?.[firstLevel];
  let entries = Object.entries(map);
  if (orderForLevel?.length) {
    entries = entries.sort(([a],[b]) => {
      const ai = orderForLevel.indexOf(a), bi = orderForLevel.indexOf(b);
      if (ai === -1 && bi === -1) return String(a).localeCompare(String(b));
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    entries = entries.sort(([a],[b]) => String(a).localeCompare(String(b), "de"));
  }
  return entries.map(([k, members]) => ({
    key: k, label: k, type: "none", members,
    children: restLevels.length > 0 && restLevels[0] !== "none"
      ? buildElternGroups(members, restLevels, groupOrder)
      : null,
  }));
}

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

export function ElternListView({ sb, vereinId, account }) {
  const [rows, setRows] = useState([]);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    if (!sb || !vereinId) return;
    fetchAlleElternkontakte(sb, vereinId).then(data => setRows(mapEltern(data)));
  }, [sb, vereinId]);

  async function loeschen(selected) {
    if (!selected?.size) return;
    const kinder = [...selected].map(id => rows.find(r => r.id === id)?.kind_name).filter(Boolean);
    const kinderText = kinder.length > 0 ? `\n\nBetroffene Kinder: ${kinder.join(", ")}` : "";
    const ok = await confirm({ title:`${selected.size} Elternkontakte löschen?`, message:`Die Elternkontakte werden auch beim verknüpften Kind entfernt.${kinderText}`, danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteElternkontakt(sb, id);
    setRows(prev => prev.filter(r => !selected.has(r.id)));
  }

  const filterDefs = [
    { key:"beziehung", label:"Beziehung", vals:[...new Set(rows.map(e=>e.beziehung).filter(Boolean))].sort() },
    { key:"portal",    label:"Portal",    vals:["Aktiv","Kein Zugang"] },
  ];

  function exportCSV(rows, cols, groups, format) {
    exportListData(rows, cols, groups, format, { filename:"eltern", sheetName:"Eltern" });
  }

  return (
    <>
      {confirmDialog}
      <ListView
        rows={rows}
        filterFn={filterElternFn}
        sortFn={sortEltern}
        buildGroupsFn={buildElternGroups}
        colDefs={COL_DEFS}
        colGroups={COL_GROUPS}
        filterDefs={filterDefs}
        groupOptions={GROUP_OPTIONS}
        renderCell={renderElternCell}
        sb={sb}
        account={account}
        vereinId={vereinId}
        viewTyp="eltern"
        selectable
        bulkActions={[
          { icon:"trash", label:"Löschen", danger:true, requiresSelection:true, onClick:loeschen },
        ]}
        footerLabel={(f,t) => `${f} von ${t} Elternkontakten`}
        exportFn={exportCSV}
        exportFormats={[
          {label:"E-Mail-Liste als CSV (flach)",        format:"csv"},
          {label:"E-Mail-Liste als CSV (mit Gruppen)",  format:"csv-gruppen"},
          {label:"Excel (pro Gruppe ein Sheet)",         format:"excel-sheets", icon:"table"},
        ]}
      />
    </>
  );
}
