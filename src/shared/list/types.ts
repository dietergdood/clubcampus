/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/types.ts
   Gemeinsame Typen von ListView, useListView, Toolbar, ColMenu
   und exportUtils. Diese Schnittstelle war bisher nur implizit —
   sie lief über ~30 Props durch fünf Dateien.
   ═══════════════════════════════════════════════════════════════ */
import type { ReactNode } from "react";
import type { RangeFilterPayload, RangeValue } from "./RangeFilter.tsx";

/* Zeilen sind modulspezifisch (Mitglieder, Kader, Helfer …) und werden
   über col.key dynamisch gelesen — daher offener Record. */
export type ListRow = Record<string, unknown>;

/* ── Spalten ─────────────────────────────────────────────────── */
export interface ColDef {
  key: string;
  label: string;
  /* Teil der Standardauswahl, wenn defaultCols nicht gesetzt ist */
  default?: boolean;
  /* Nicht in der Spaltenauswahl anbieten (z.B. nur für den Export) */
  hidden?: boolean;
  /* Kann nicht ausgeblendet oder verschoben werden */
  alwaysOn?: boolean;
}

export interface ColGroup {
  group: string;
  cols: ColDef[];
}

/* ── Filter ──────────────────────────────────────────────────── */
export type FilterDefType = "range" | "divider" | "or-divider" | "und-divider";

export interface FilterDef {
  key: string;
  label?: string;
  /* Auswahlwerte; bei buildFilterDefs aus den Daten erzeugt */
  vals?: string[];
  type?: FilterDefType;
  /* nur bei type "range" */
  min?: number;
  max?: number;
  suffix?: string;
  /* Alternative Wertquelle für buildFilterDefs */
  flatMap?: (row: ListRow) => (string | null | undefined)[];
}

/* Mehrfachauswahl (string[]) oder Zahlenbereich (RangeValue) */
export type FilterValue = string[] | RangeValue;
export type FilterVals = Record<string, FilterValue | undefined>;

/* Ein Filterwert wird gesetzt (key,val,active) oder ein Range gemeldet
   ("__range", payload) bzw. alles zurückgesetzt ("__reset"). */
export type FilterChangeHandler = (key: string, val?: string | RangeFilterPayload, active?: boolean) => void;

/* ── Sortierung ──────────────────────────────────────────────── */
export type SortDir = "asc" | "desc";

/* Eine Sortierebene. Mehrere Ebenen werden der Reihe nach angewendet:
   sortDefs[0] ist die primäre, sortDefs[1] die sekundäre Ebene usw. */
export interface SortDef {
  key: string;
  dir: SortDir;
}

/* Alles, was das Sortier-Panel braucht — als ein Bündel, damit die
   Toolbar nicht sieben Einzel-Props durchreichen muss. */
export interface SortControls {
  sortDefs: SortDef[];
  /* Spalten, die als Ebene angeboten werden */
  colDefs: ColDef[];
  onAddLevel: (key: string) => void;
  onRemoveLevel: (key: string) => void;
  onDirChange: (key: string, dir: SortDir) => void;
  /* fromKey wird an die Position von toKey verschoben */
  onMoveLevel: (fromKey: string, toKey: string) => void;
  onReset: () => void;
}

/* ── Gruppierung ─────────────────────────────────────────────── */
export interface GroupOption {
  val: string;
  label: string;
}

/* Kontext, in dem eine Zelle gerendert wird. subType/subKey sind gesetzt,
   wenn innerhalb einer Team- oder Gruppen-Ebene weiter gruppiert wird. */
export interface GroupContext {
  type: string;
  key: string | null;
  subType?: string;
  subKey?: string;
}

export interface ListGroup<T extends ListRow = ListRow> {
  key: string;
  label: string;
  type: string;
  members: T[] | null;
  children: ListGroup<T>[] | null;
}

/* ── Mehr-Menü ───────────────────────────────────────────────── */
export interface MoreItem {
  label: string;
  icon?: string;
  onClick?: () => void;
  onDelete?: () => void;
  danger?: boolean;
  hidden?: boolean;
  /* Abschnittsüberschrift statt klickbarer Eintrag */
  header?: boolean;
  /* Aufklappbarer Inhalt statt einer Aktion (Desktop-Mehr-Menü) */
  subPanel?: ReactNode;
}

export type MoreEntry = MoreItem | "sep";

/* ── Gespeicherte Ansichten ──────────────────────────────────── */
/* Vordefinierte Ansicht, im Modul hinterlegt (SAVED_VIEWS) */
export interface StandardView {
  label: string;
  cols: string[];
}

export type SavedViews = Record<string, StandardView>;

/* ── Export ──────────────────────────────────────────────────── */
export type ExportFormat = "csv" | "csv-gruppen" | "excel-sheets";

export interface ExportFormatOption {
  format: ExportFormat;
  label: string;
  icon?: string;
}

export type GetCellValue<T extends ListRow = ListRow> = (col: ColDef, row: T, groupCtx: GroupContext) => string;

/* ── Bulk-Aktionen ───────────────────────────────────────────── */
export interface ListBulkAction {
  label: string;
  icon?: string;
  danger?: boolean;
  requiresSelection?: boolean;
  onClick: (selected: Set<RowId>) => void;
}

/* ── Render-Callbacks ────────────────────────────────────────── */
export type RenderCell<T extends ListRow = ListRow> = (col: ColDef, row: T, ctx: GroupContext, filterVals: FilterVals) => ReactNode;
export type RenderMobile<T extends ListRow = ListRow> = (row: T) => ReactNode;
/* Zeilen-IDs landen in gespeicherten Ansichten (zeilenreihenfolge) und
   müssen deshalb JSON-fähig sein. */
export type RowId = string | number;
export type GetRowId<T extends ListRow = ListRow> = (row: T) => RowId;
