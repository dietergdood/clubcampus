/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/SupporterListView.tsx

   Supporter sind KEINE Mitglieder: kein Beitrag, kein Stimmrecht
   an der GV, kein Spielbetrieb. Sie stehen technisch in
   `mitglieder` mit `mitgliedtyp = 'Supporter'` (Etappe 5, damit
   sie überhaupt auffindbar sind), gehören aber nicht in die
   Mitgliederliste — sonst stimmt der Zähler nicht, Auswertungen
   zählen sie mit, und beim Anschreiben landen sie in Gruppen, in
   die sie nicht gehören.

   Deshalb ein eigener Tab — aber DIESELBE Darstellung: Spalten,
   Zellen und Mobilansicht kommen aus denselben Bausteinen wie die
   Mitgliederliste (`ALL_COLS`, `makeMemberRenderCell`). Nur die
   Auswahl der Spalten ist eine andere: Mitgliedtyp ist für alle
   derselbe, Spielerpass, Teams und Kaderrollen gibt es bei einem
   Gönner nicht.
   ═══════════════════════════════════════════════════════════════ */
import { ListView } from "../../shared/list/ListView.tsx";
import { ALL_COLS } from "./memberConstants.ts";
import { filterMembers, sortMembers } from "./memberFilter.ts";
import { buildGroups } from "./memberGrouping.ts";
import { exportData } from "./memberExportUtils.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { ColDef, FilterDef, GroupOption, RenderCell } from "../../shared/list/types.ts";
import type { Account, Sb } from "../../types.ts";

/* Aus ALL_COLS gezogen statt neu deklariert: gleiche Keys, gleiche
   Beschriftungen, gleiche Zellen-Renderer wie in der Mitgliederliste. */
const SUPPORTER_KEYS = ["name", "email", "telefon", "ort", "eintritt", "portal"];

const COL_DEFS: ColDef[] = SUPPORTER_KEYS
  .map(k => ALL_COLS.find(c => c.key === k))
  .filter(Boolean)
  .map(c => ({ ...(c as ColDef), default: true }));

const COL_GROUPS = [{ group: "Supporter", cols: COL_DEFS }];

/* Nur die Filter und Gruppierungen, die bei einem Goenner etwas bedeuten:
   Mitgliedtyp ist fuer alle derselbe, Teams und Kaderrollen gibt es nicht. */
const FILTER_DEFS: FilterDef[] = [
  { key: "portal", label: "Portal-Zugang", vals: ["Aktiv", "Kein Zugang"] },
];

const GROUP_OPTIONS: GroupOption[] = [
  { val: "portal", label: "Portal-Zugang" },
  { val: "ort",    label: "Wohnort" },
];

interface SupporterListViewProps {
  supporter: MemberRow[];
  renderCell: RenderCell<MemberRow>;
  /** Beschriftungen der Portalrollen — dieselben wie in der Mitgliederliste. */
  rolleLabel: Record<string, string>;
  renderMobile?: (row: MemberRow) => React.ReactNode;
  sb?: Sb;
  account?: Account | null;
  vereinId?: string | null;
  isAdmin?: boolean;
  canExport?: boolean;
  onOpen?: ((row: MemberRow) => void) | null;
  /** Archivieren und Löschen — dieselben Aktionen wie in der Mitgliederliste. */
  onArchivieren?: ((selected: Set<string | number>) => void) | null;
  onLoeschen?: ((selected: Set<string | number>) => void) | null;
}

function SupporterListView({
  supporter, renderCell, rolleLabel, renderMobile, sb, account = null, vereinId = null,
  isAdmin = false, canExport = false, onOpen = null,
  onArchivieren = null, onLoeschen = null,
}: SupporterListViewProps) {
  return (
    <ListView<MemberRow>
      emptyIcon="heart-handshake"
      emptyTitle="Noch keine Supporter"
      emptySubtitle="Ein Supporter entsteht, wenn ein Elternteil sein letztes Kind verliert und der Verein den Kontakt behalten will."
      rows={supporter}
      /* Dieselben Funktionen wie die Mitgliederliste — ein Supporter IST eine
         MemberRow. Eigene Nachbauten waeren ein zweiter Ort, an dem Suche,
         Sortierung und Gruppierung auseinanderlaufen koennen. */
      filterFn={(rows, search, filterVals) => filterMembers(rows, search, filterVals, rolleLabel)}
      sortFn={sortMembers}
      buildGroupsFn={(rows, groupBy, groupOrder, filterVals) =>
        buildGroups(rows, groupBy, rolleLabel, filterVals, null, groupOrder)}
      multiGroup
      colDefs={COL_DEFS}
      colGroups={COL_GROUPS}
      defaultCols={SUPPORTER_KEYS}
      filterDefs={FILTER_DEFS}
      groupOptions={GROUP_OPTIONS}
      renderCell={renderCell}
      renderMobile={renderMobile}
      onRowClick={onOpen ?? undefined}
      sb={sb}
      account={account}
      vereinId={vereinId}
      viewTyp="supporter"
      isAdmin={isAdmin}
      /* Auswahl und Sammelaktionen wie bei den Mitgliedern. Kein
         `savedViews`: die Vorlagen „Standard" und „Verwaltung" bestehen aus
         Spalten, die es hier nicht gibt (Mitgliedschaft, Teams, Kaderrollen).
         Eigene Ansichten speichern geht trotzdem — ListView legt sie unter
         viewTyp="supporter" ab. */
      selectable={isAdmin}
      bulkActions={isAdmin ? [
        ...(onArchivieren ? [{ icon: "archive", label: "Archivieren", onClick: onArchivieren }] : []),
        ...(onLoeschen ? [{ icon: "trash", label: "Löschen (DSGVO)", onClick: onLoeschen, danger: true, requiresSelection: true }] : []),
      ] : []}
      footerLabel={(f, t) => `${f} von ${t} Supportern`}
      /* Ohne exportFormats blendet ListView den Knopf aus — exportFn allein
         genuegt nicht. Dieselben drei Formate wie in der Mitgliederliste. */
      exportFn={canExport ? ((rows, cols, groups, format) => exportData(rows, cols, format, groups)) : undefined}
      exportFormats={canExport ? [
        { label: "Liste als CSV (flach)",                 format: "csv" },
        { label: "Liste als CSV (mit Gruppen)",           format: "csv-gruppen" },
        { label: "Liste als Excel (pro Gruppe ein Sheet)", format: "excel-sheets", icon: "table" },
      ] : []}
    />
  );
}

export { SupporterListView };
