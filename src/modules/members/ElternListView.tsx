/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.tsx
   Eltern-Liste mit Kind+Team Anzeige, Fold-out, Filter, Gruppierung
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { useConfirm } from "../../theme.ts";
import { fetchAlleElternkontakte, deleteElternkontakt } from "../../domains/members/memberService.ts";
import { ListView } from "../../shared/list/ListView.tsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.ts";
import { ElternkontaktModal } from "./ElternkontaktModal.tsx";
import { KindSucheModal } from "./KindSucheModal.tsx";
import type { ElternFormular } from "./ElternkontaktModal.tsx";
import type { ColDef, ColGroup, GroupOption, RowId } from "../../shared/list/types.ts";
import type { Account, Sb } from "../../types.ts";
import { mapEltern, buildElternGroups, makeElternRenderCell } from "./elternListUtils.tsx";
import type { ElternRow } from "./elternListUtils.tsx";

const COL_DEFS: ColDef[] = [
  { key:"name",      label:"Name",      default:true, alwaysOn:true },
  /* Getrennte Namensfelder — standardmässig aus, weil "Name" sie zusammenfasst.
     Für Sortierung und Export nach Nachname trotzdem nützlich. */
  { key:"vorname",   label:"Vorname",   default:false },
  { key:"nachname",  label:"Nachname",  default:false },
  { key:"beziehung", label:"Beziehung", default:true },
  { key:"email",     label:"E-Mail",    default:true },
  { key:"telefon",   label:"Telefon",   default:true },
  { key:"kind_name", label:"Kind",      default:true },
  { key:"portal",    label:"Portal",    default:true },
];

const COL_GROUPS: ColGroup[] = [{ group:"Elternkontakt", cols:COL_DEFS }];

const GROUP_OPTIONS: GroupOption[] = [
  { val:"kind_name", label:"Kind"       },
  { val:"teams",     label:"Team"       },
  { val:"beziehung", label:"Beziehung"  },
  { val:"portal",    label:"Portal"     },
];

interface ElternListViewProps {
  sb: Sb;
  vereinId: string | null;
  account?: Account | null;
  isAdmin?: boolean;
  onNavToMember?: ((id: number) => void) | null;
  /* Mitgliedtypen mit hauptkontakt_pflicht — bestimmen, wer als Kind
     verknuepft werden kann. Kommt aus der Portalverwaltung. */
  pflichtTypen?: string[];
}

export function ElternListView({
  sb, vereinId, account, isAdmin = false,
  onNavToMember = null, pflichtTypen = [],
}: ElternListViewProps) {
  const [rows, setRows] = useState<ElternRow[]>([]);
  const [confirm, confirmDialog] = useConfirm();
  const [expandedKinder, setExpandedKinder] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<ElternFormular | null>(null);
  const [kindSuche, setKindSuche] = useState(false);
  const [neuesKind, setNeuesKind] = useState<number | null>(null);
  const geaendertVon = account?.name || account?.email || "Administrator";

  async function reload() {
    if (!sb || !vereinId) return;
    const data = await fetchAlleElternkontakte(sb, vereinId);
    setRows(mapEltern(data));
  }

  useEffect(() => {
    if (!sb || !vereinId) return;
    fetchAlleElternkontakte(sb, vereinId).then(data => setRows(mapEltern(data)));
  }, [sb, vereinId]);

  const alleTeams = [...new Set(rows.flatMap(r => r.teams))].sort();

  const filterDefs = buildFilterDefs(rows, [
    { key:"beziehung", label:"Beziehung" },
    { key:"portal",    label:"Portal", vals:["Aktiv","Kein Zugang"] },
    { key:"teams",     label:"Team",   vals:alleTeams },
  ]);

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

  const oeffneKontakt = (row: ElternRow) => setEdit({
    id:          String(row.id),
    vorname:     row.vorname,
    nachname:    row.nachname,
    email:       row.email,
    telefon:     row.telefon,
    beziehung:   row.beziehung,
    benutzer_id: row.benutzer_id,
  });

  const renderCell = makeElternRenderCell({ expandedKinder, setExpandedKinder, onNavToMember, onEditKontakt: oeffneKontakt });

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
          let result = filterEltern(elternRows, search);
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
        selectable={isAdmin}
        bulkActions={isAdmin ? [
          { icon:"trash", label:"Löschen", danger:true, requiresSelection:true, onClick:loeschen },
        ] : []}
        footerLabel={(f,t) => `${f} von ${t} Elternkontakten`}
        exportFn={(rows,cols,groups,format) => exportListData(rows,cols,groups,format,{filename:"eltern",sheetName:"Eltern"})}
        exportFormats={[
          {label:"E-Mail-Liste als CSV (flach)",        format:"csv"},
          {label:"E-Mail-Liste als CSV (mit Gruppen)",  format:"csv-gruppen"},
          {label:"Excel (pro Gruppe ein Sheet)",         format:"excel-sheets", icon:"table"},
        ]}
      />

      {edit && (
        <ElternkontaktModal
          mode="edit"
          data={edit}
          canEdit={isAdmin}
          sb={sb}
          vereinId={vereinId}
          geaendertVon={geaendertVon}
          onKindHinzufuegen={() => setKindSuche(true)}
          neuesKind={neuesKind}
          onKindVerknuepft={() => setNeuesKind(null)}
          onClose={() => { setEdit(null); setNeuesKind(null); }}
          onSaved={reload}
        />
      )}

      {kindSuche && (
        <KindSucheModal
          open={kindSuche}
          onClose={() => setKindSuche(false)}
          sb={sb}
          vereinId={vereinId}
          pflichtTypen={pflichtTypen}
          bereitsVerknuepft={edit?.id ? (rows.find(r => String(r.id) === edit.id)?.kinder || []).map(k => k.mitglied_id) : []}
          onGewaehlt={id => setNeuesKind(id)}
        />
      )}
    </>
  );
}
