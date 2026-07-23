/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ArchivView.jsx
   Archiv-Tab — nutzt zentrale ListView
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Av, useConfirm, EmptyState } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { reaktiviereMitglied, deleteMitglied } from "../../domains/members/memberService.js";
import { ListView } from "../../shared/list/ListView.jsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.js";

const COL_DEFS = [
  { key:"name",           label:"Name",          default:true, alwaysOn:true },
  { key:"mitgliedtyp",    label:"Mitgliedschaft", default:true },
  { key:"deaktiviert_am", label:"Archiviert am",  default:true },
  { key:"deaktiviert_von",label:"Archiviert von", default:true },
  { key:"actions",        label:"",               default:true, alwaysOn:true },
];

const COL_GROUPS = [{ group:"Archiv", cols:COL_DEFS.filter(c=>c.key!=="actions") }];

const GROUP_OPTIONS = [
  { val:"mitgliedtyp",     label:"Mitgliedschaft"     },
  { val:"deaktiviert_von", label:"Archiviert von"     },
  { val:"deaktiviert_am",  label:"Archiviert im Jahr" },
];

function mapArchivRow(m) {
  return {
    id:                 m.id,
    name:               `${m.vorname||""} ${m.nachname||""}`.trim(),
    mitgliedtyp:        m.mitgliedtyp||"—",
    deaktiviert_am:     m.deaktiviert_am ? String(new Date(m.deaktiviert_am).getFullYear()) : "—",
    deaktiviert_am_fmt: m.deaktiviert_am ? new Date(m.deaktiviert_am).toLocaleDateString("de-CH") : "—",
    deaktiviert_von:    m.deaktiviert_von||"—",
    _raw:               m,
  };
}

// buildGroupsFn nur für deaktiviert_am (Jahr) nötig — Rest via Default
function buildArchivGroups(rows, groupBy, groupOrder, filterVals) {
  const levels = Array.isArray(groupBy) ? groupBy : [groupBy];
  const firstLevel = levels[0] || "none";
  const restLevels = levels.slice(1);
  if (!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];
  const map = {};
  rows.forEach(r => {
    const k = firstLevel === "deaktiviert_am" ? r.deaktiviert_am : (r[firstLevel] || "—");
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  const orderForLevel = groupOrder?.[firstLevel];
  let entries = Object.entries(map);
  if (orderForLevel?.length) {
    entries = entries.sort(([a],[b]) => {
      const ai = orderForLevel.indexOf(a), bi = orderForLevel.indexOf(b);
      if (ai === -1 && bi === -1) return String(a).localeCompare(String(b), "de");
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    entries = entries.sort(([a],[b]) => String(a).localeCompare(String(b), "de"));
  }
  return entries.map(([k, members]) => ({
    key: k, label: k, type: "none", members,
    children: restLevels.length > 0 && restLevels[0] !== "none"
      ? buildArchivGroups(members, restLevels, groupOrder)
      : null,
  }));
}

export function ArchivView({ archivData, setArchivData, archivLoaded, sb, onUpdatePortalZugang, onReload, onOpenMember }) {
  const [confirm, confirmDialog] = useConfirm();
  const rows = (archivData || []).map(mapArchivRow);

  async function reaktivieren(selected) {
    if (!selected?.size) return;
    const ok = await confirm({ title:`${selected.size} Mitglieder reaktivieren?`, confirmLabel:"Reaktivieren" });
    if (!sb || !ok) return;
    for (const id of selected) {
      await reaktiviereMitglied(sb, id);
      if (onUpdatePortalZugang) await onUpdatePortalZugang(id, true);
    }
    setArchivData(prev => prev.filter(m => !selected.has(m.id)));
    if (onReload) onReload();
  }

  async function loeschen(selected) {
    if (!selected?.size) return;
    const ok = await confirm({ title:`${selected.size} Mitglieder löschen?`, message:"Diese Aktion ist unwiderruflich (DSGVO).", danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteMitglied(sb, id);
    setArchivData(prev => prev.filter(m => !selected.has(m.id)));
    if (onReload) onReload();
  }

  const filterDefs = buildFilterDefs(rows, [
    { key:"mitgliedtyp",     label:"Mitgliedschaft" },
    { key:"deaktiviert_von", label:"Archiviert von" },
  ]);

  function renderCell(col, m) {
    switch(col.key) {
      case "name":
        return <td key="name" className="cc-members-td">
          <div className="cc-row cc-gap-8">
            <Av name={m.name||"?"} size={26}/>
            <span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();onOpenMember&&onOpenMember(m._raw);}}>{m.name}</span>
          </div>
        </td>;
      case "deaktiviert_am":
        return <td key="deaktiviert_am" className="cc-members-td cc-members-td-sub">{m.deaktiviert_am_fmt}</td>;
      case "actions":
        return <td key="actions" className="cc-members-td cc-text-right">
          <div className="cc-row cc-gap-6" onClick={e=>e.stopPropagation()}>
            <Btn small onClick={()=>reaktivieren(new Set([m.id]))}><TI n="user-check" size={13}/> Reaktivieren</Btn>
            <Btn small variant="danger" onClick={()=>loeschen(new Set([m.id]))}><TI n="trash" size={13}/></Btn>
          </div>
        </td>;
      default:
        return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(m[col.key]||"—")}</td>;
    }
  }

  return (
    <>
      {confirmDialog}
      <div className="cc-info-box cc-info-box-warn cc-mb-16">
        <TI n="info-circle" size={15}/> Archivierte Mitglieder — Daten sind noch vorhanden und können reaktiviert werden.
      </div>
      {!archivLoaded ? (
        <EmptyState icon="loader" title="Wird geladen…"/>
      ) : (
        <ListView
          rows={rows}
          buildGroupsFn={buildArchivGroups}
          colDefs={COL_DEFS}
          colGroups={COL_GROUPS}
          defaultCols={COL_DEFS.map(c=>c.key)}
          filterDefs={filterDefs}
          groupOptions={GROUP_OPTIONS}
          renderCell={renderCell}
          selectable
          bulkActions={[
            { icon:"user-check", label:"Reaktivieren", requiresSelection:true, onClick:reaktivieren },
            { icon:"trash", label:"Löschen (DSGVO)", danger:true, requiresSelection:true, onClick:loeschen },
          ]}
          exportFn={(rows,cols,groups,format) => exportListData(rows,cols,groups,format,{
            filename:"archiv", sheetName:"Archiv",
            getCellValue:(col,row) => col.key==="deaktiviert_am" ? row.deaktiviert_am_fmt : col.key==="actions" ? "" : String(row[col.key]||""),
          })}
          exportFormats={[
            {label:"Als CSV (flach)",        format:"csv"},
            {label:"Als CSV (mit Gruppen)",  format:"csv-gruppen"},
            {label:"Excel (pro Gruppe)",     format:"excel-sheets", icon:"table"},
          ]}
          footerLabel={(f,t) => `${f} von ${t} archivierten Mitgliedern`}
        />
      )}
    </>
  );
}
