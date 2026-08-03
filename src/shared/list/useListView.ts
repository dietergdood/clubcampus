/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/useListView.ts
   State + Logic Hook für ListView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { fetchAnsichten, insertAnsicht, deleteAnsicht } from "../../domains/members/memberService.ts";
import { sortiereMehrstufig } from "./sortUtils.ts";
import type { Account, Ansicht, Sb } from "../../types.ts";
import type {
  ColDef, ExportFormat, ExportFormatOption, FilterDef, FilterVals, FilterValue,
  GetRowId, GroupOption, ListGroup, ListRow, MoreEntry, RowId, SavedViews,
  SortDef, SortDir,
} from "./types.ts";
import type { RangeFilterPayload } from "./RangeFilter.tsx";

export interface UseListViewProps<T extends ListRow = ListRow> {
  rows: T[];
  colDefs: ColDef[];
  defaultCols?: string[];
  savedViews?: SavedViews | null;
  filterFn?: (rows: T[], search: string, filterVals: FilterVals) => T[];
  sortFn?: (rows: T[], sortCol: string, sortDir: "asc" | "desc") => T[];
  buildGroupsFn?: (rows: T[], groupBy: string[], groupOrder: Record<string, string[]>, filterVals: FilterVals) => ListGroup<T>[];
  filterDefs: FilterDef[];
  groupOptions: GroupOption[];
  groupOptionsMore: GroupOption[];
  multiGroup: boolean;
  getRowId: GetRowId<T>;
  sb: Sb;
  account?: Account | null;
  vereinId?: string | null;
  viewTyp: string;
  selectable: boolean;
  moreActions: MoreEntry[];
  exportFn?: (rows: T[], cols: ColDef[], groups: ListGroup<T>[], format: ExportFormat) => void;
  exportFormats: ExportFormatOption[];
  isAdmin: boolean;
  isMobile: boolean;
  externalSetFilter?: { current: ((vals: FilterVals) => void) | null } | null;
}

/* Zwischenstand beim Ziehen von Gruppen bzw. Zeilen */
interface DragGroupState { key: string; levelKey: string }
interface DragRowState { id: RowId; groupKey: string }

export function useListView<T extends ListRow = ListRow>({
  rows,
  colDefs,
  defaultCols,
  savedViews,
  filterFn,
  sortFn,
  buildGroupsFn,
  filterDefs,
  groupOptions,
  groupOptionsMore,
  multiGroup,
  getRowId,
  sb,
  account,
  vereinId,
  viewTyp,
  selectable,
  moreActions,
  exportFn,
  exportFormats,
  isAdmin,
  isMobile,
  externalSetFilter,
}: UseListViewProps<T>) {
  const initialCols = defaultCols || colDefs.filter(c => c.default).map(c => c.key);
  /* Ausgangssortierung: erste Spalte aufsteigend — wie vor der
     Mehrstufigkeit, nur als einelementige Ebenenliste. */
  const initialSortDefs = (): SortDef[] => [{ key: colDefs[0]?.key || "", dir: "asc" }];

  // ── State ────────────────────────────────────────────────────
  const [visibleCols,      setVisibleCols]      = useState<string[]>(initialCols);
  const [search,           setSearch]           = useState("");
  const [filterVals,       setFilterVals]       = useState<FilterVals>({});
  const [sortDefs,         setSortDefs]         = useState<SortDef[]>([{ key: colDefs[0]?.key || "", dir: "asc" }]);
  const [groupBy,          setGroupBy]          = useState<string[]>(["none"]);
  const [groupOrder,       setGroupOrder]       = useState<Record<string, string[]>>({});
  const [manualOrder,      setManualOrder]      = useState<Record<string, RowId[]>>({});
  const [collapsedGroups,  setCollapsedGroups]  = useState<Set<string>>(new Set());
  const [dragGroup,        setDragGroup]        = useState<DragGroupState | null>(null);
  const [dragOverGroup,    setDragOverGroup]    = useState<string | null>(null);
  const [dragRow,          setDragRow]          = useState<DragRowState | null>(null);
  const [dragOverRow,      setDragOverRow]      = useState<RowId | null>(null);
  const [dragCol,          setDragCol]          = useState<string | null>(null);
  const [dragOverCol,      setDragOverCol]      = useState<string | null>(null);
  const [selected,         setSelected]         = useState<Set<RowId>>(new Set());
  const [selectMode,       setSelectMode]       = useState(false);
  const [customViews,      setCustomViews]      = useState<Ansicht[]>([]);
  const [savedView,        setSavedView]        = useState<string | null>(savedViews ? Object.keys(savedViews)[0] : null);
  const [saveOpen,         setSaveOpen]         = useState(false);
  const [saveName,         setSaveName]         = useState("");
  const [saveGeteilt,      setSaveGeteilt]      = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(0);
  const [mobileGroupOpen,  setMobileGroupOpen]  = useState(0);

  // ── Ansichten laden ─────────────────────────────────────────
  useEffect(() => {
    if (!sb || !account?.id) return;
    fetchAnsichten(sb, account.id, viewTyp).then(setCustomViews);
  }, [sb, account?.id, viewTyp]);

  // ── External filter ─────────────────────────────────────────
  useEffect(() => {
    if (externalSetFilter) externalSetFilter.current = (vals) => setFilterVals(prev => ({...prev, ...vals}));
  }, [externalSetFilter]);

  // ── Sortierte/gruppierte Spalten sichtbar machen ─────────────
  /* Nach einer Spalte zu sortieren oder zu gruppieren, die man nicht
     sieht, ist nicht nachvollziehbar — die Liste ordnet sich dann nach
     einem unsichtbaren Kriterium. Fehlende Spalten werden deshalb
     hinten angehaengt. Gruppierschluessel ohne eigene Spalte
     (z.B. __teams_funktionen) werden uebersprungen, ebenso hidden-
     Spalten, die sich gar nicht einblenden lassen. */
  useEffect(() => {
    const gebraucht = [
      ...sortDefs.map(d => d.key),
      ...(Array.isArray(groupBy) ? groupBy : [groupBy]),
    ].filter(k => k && k !== "none" && colDefs.some(c => c.key === k && !c.hidden));
    if (gebraucht.length === 0) return;
    setVisibleCols(prev => {
      const fehlend = gebraucht.filter(k => !prev.includes(k));
      /* prev unveraendert zurueckgeben, sonst rendert der Effekt endlos */
      return fehlend.length > 0 ? [...prev, ...fehlend] : prev;
    });
  }, [sortDefs, groupBy, colDefs]);

  // ── Ansichten anwenden ───────────────────────────────────────
  function applyStandardView(key: string) {
    if (!savedViews?.[key]) return;
    setSavedView(key);
    setVisibleCols(savedViews[key].cols);
    setFilterVals({});
    setGroupBy(["none"]);
    setGroupOrder({});
    setManualOrder({});
    setSortDefs(initialSortDefs());
  }

  function applyCustomView(v: Ansicht) {
    setSavedView("custom_" + v.id);
    setVisibleCols(v.spalten || initialCols);
    setFilterVals(v.filter || {});
    setGroupBy(Array.isArray(v.gruppierung) ? v.gruppierung : [v.gruppierung || "none"]);
    setGroupOrder(v.gruppenreihenfolge || {});
    setManualOrder(v.zeilenreihenfolge || {});
    /* Ansichten aus der Zeit vor der Spalte sortierung haben null/[] —
       dann bleibt es bei der Ausgangssortierung. */
    setSortDefs(v.sortierung?.length ? v.sortierung : initialSortDefs());
  }

  async function saveView() {
    /* vereinId gehoert in den Guard: mitglieder_ansichten.verein_id ist NOT NULL,
       ohne den Wert wuerde das Insert erst in der DB scheitern. */
    if (!saveName.trim() || !sb || !account?.id || !vereinId) return;
    setSaving(true);
    const data = await insertAnsicht(sb, {
      benutzer_id:        account.id,
      name:               saveName.trim(),
      spalten:            visibleCols,
      filter:             filterVals,
      gruppierung:        Array.isArray(groupBy) ? groupBy : [groupBy],
      gruppenreihenfolge: groupOrder,
      zeilenreihenfolge:  manualOrder,
      sortierung:         sortDefs,
      typ:                viewTyp,
      geteilt:            saveGeteilt,
    }, vereinId);
    if (data) setCustomViews(prev => [...prev, data]);
    setSaveName(""); setSaveGeteilt(false); setSaveOpen(false); setSaving(false);
  }

  async function deleteView(id: string, ownerId: string | null) {
    if (!sb) return;
    if (ownerId !== account?.id && !isAdmin) return;
    await deleteAnsicht(sb, id);
    setCustomViews(prev => prev.filter(v => v.id !== id));
    if (savedView === "custom_" + id) {
      setSavedView(savedViews ? Object.keys(savedViews)[0] : null);
      setVisibleCols(initialCols);
      setFilterVals({});
      setGroupBy(["none"]);
      setGroupOrder({});
      setManualOrder({});
      setSortDefs(initialSortDefs());
    }
  }

  // ── Sort ─────────────────────────────────────────────────────
  /* Erste Ebene — was der Rest der App (SortIcon, Export, Legacy-Props)
     als "die" Sortierung sieht. */
  const sortCol = sortDefs[0]?.key ?? "";
  const sortDir: SortDir = sortDefs[0]?.dir ?? "asc";

  /* Klick auf einen Spalten-Header.
       ohne Shift → einstufig sortieren; nochmal dieselbe Spalte kippt die Richtung
       mit Shift  → Spalte als weitere Ebene anhaengen bzw. deren Richtung kippen */
  function handleSort(key: string, addLevel = false) {
    setManualOrder({});
    setSortDefs(prev => {
      if (!addLevel) {
        const istPrimaer = prev.length === 1 && prev[0]?.key === key;
        return [{ key, dir: istPrimaer && prev[0].dir === "asc" ? "desc" : "asc" }];
      }
      const idx = prev.findIndex(d => d.key === key);
      if (idx === -1) return [...prev, { key, dir: "asc" }];
      return prev.map((d, i) => i === idx ? { ...d, dir: d.dir === "asc" ? "desc" : "asc" } : d);
    });
  }

  /* Ebene entfernen. Die letzte Ebene faellt auf die Ausgangssortierung
     zurueck — eine Liste ganz ohne Ordnung waere fuer den Nutzer nur
     verwirrend (die Zeilen behielten die Reihenfolge des Filters). */
  function removeSortLevel(key: string) {
    setManualOrder({});
    setSortDefs(prev => {
      const next = prev.filter(d => d.key !== key);
      return next.length > 0 ? next : initialSortDefs();
    });
  }

  function setSortLevelDir(key: string, dir: SortDir) {
    setManualOrder({});
    setSortDefs(prev => prev.map(d => d.key === key ? { ...d, dir } : d));
  }

  /* Ebene verschieben — Desktop per Drag&Drop, Mobile per ↑/↓.
     Ueber Keys statt Indizes, damit das Panel keine Positionen aus einer
     gefilterten Liste zurueckrechnen muss. */
  function moveSortLevel(fromKey: string, toKey: string) {
    setManualOrder({});
    setSortDefs(prev => {
      const from = prev.findIndex(d => d.key === fromKey);
      const to = prev.findIndex(d => d.key === toKey);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function resetSort() {
    setManualOrder({});
    setSortDefs(initialSortDefs());
  }

  // ── Filter ───────────────────────────────────────────────────
  function handleFilterChange(key: string, val?: string | RangeFilterPayload, active?: boolean) {
    if (key === "__reset") { setFilterVals({}); return; }
    /* typeof-Prüfung statt Cast: narrowt die Union auf RangeFilterPayload */
    if (key === "__range" && val && typeof val === "object") {
      const { rangeKey, von, bis } = val;
      if (von == null && bis == null) {
        setFilterVals(prev => { const n = { ...prev }; delete n[rangeKey]; return n; });
      } else {
        setFilterVals(prev => ({ ...prev, [rangeKey]: { von, bis } }));
      }
      return;
    }
    setFilterVals(prev => {
      const cur = prev[key];
      const list: string[] = Array.isArray(cur) ? cur : [];
      return { ...prev, [key]: active ? [...list, String(val)] : list.filter(v => v !== val) };
    });
  }

  // ── Spalten Drag ─────────────────────────────────────────────
  function handleColDrop(targetKey: string, dragKey?: string | null) {
    const from = dragKey || dragCol;
    if (!from || from === targetKey) return;
    setVisibleCols(prev => {
      const cols = [...prev];
      const fi = cols.indexOf(from), ti = cols.indexOf(targetKey);
      if (fi < 0 || ti < 0) return cols;
      cols.splice(fi, 1); cols.splice(ti, 0, from);
      return cols;
    });
    setDragCol(null); setDragOverCol(null);
  }

  // ── Selektierung ─────────────────────────────────────────────
  function toggleSelectRow(id: RowId) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // ── Daten Pipeline ───────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filterFn) return filterFn(rows, search, filterVals);
    return rows.filter(row => {
      if (search) {
        const q = search.toLowerCase();
        const name = String(row.name || row.label || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      for (const [k, vals] of Object.entries(filterVals)) {
        /* Array.isArray schliesst Range-Filter aus. Ohne diese Prüfung lief
           die Standard-Pipeline bei einem gesetzten Range-Filter in
           vals.includes(...) und damit in einen TypeError. */
        if (!vals || !Array.isArray(vals) || vals.length === 0) continue;
        const v = row[k];
        if (Array.isArray(v)) { if (!v.some(x => vals.includes(x))) return false; }
        else if (typeof v !== "string" || !vals.includes(v)) return false;
      }
      return true;
    });
  }, [rows, search, filterVals, filterFn]);

  const sorted = useMemo(
    () => sortiereMehrstufig(filtered, sortDefs, sortFn),
    [filtered, sortDefs, sortFn],
  );

  const hasGroup = Array.isArray(groupBy) ? groupBy.some(g => g && g !== "none") : groupBy !== "none";

  const groups: ListGroup<T>[] = useMemo(() => {
    if (!hasGroup) return [{ key: "__all", label: "", type: "none", members: sorted, children: null }];
    if (buildGroupsFn) return buildGroupsFn(sorted, groupBy, groupOrder, filterVals);
    function buildDefault(rows: T[], levels: string[], groupOrder: Record<string, string[]>): ListGroup<T>[] {
      const firstLevel = levels[0] || "none";
      const restLevels = levels.slice(1);
      if (!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];
      const map: Record<string, T[]> = {};
      rows.forEach(r => { const k = String(r[firstLevel] ?? "—"); if (!map[k]) map[k] = []; map[k].push(r); });
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
          ? buildDefault(members, restLevels, groupOrder)
          : null,
      }));
    }
    return buildDefault(sorted, Array.isArray(groupBy) ? groupBy : [groupBy], groupOrder);
  }, [sorted, groupBy, groupOrder, hasGroup, buildGroupsFn, filterVals]);

  // ── moreItems ────────────────────────────────────────────────
  const COLS = visibleCols.map(k => colDefs.find(c => c.key === k)).filter((c): c is ColDef => !!c);

  const moreItems: MoreEntry[] = [
    ...moreActions,
    ...(moreActions.length > 0 && !isMobile ? ["sep" as const] : []),
    ...(!isMobile && selectable ? [{ header: true, label: "Aktionen" }] : []),
    ...(!isMobile && selectable ? [{ icon: "checkbox", label: selectMode ? "Auswahlmodus beenden" : "Auswählen", onClick: () => { setSelectMode(m => { if (m) setSelected(new Set()); return !m; }); } }] : []),
    { header: true, label: "Ansichten" },
    ...(savedViews ? Object.entries(savedViews).map(([key, v]) => ({
      icon: savedView === key ? "check" : "layout",
      label: v.label,
      onClick: () => applyStandardView(key),
    })) : []),
    ...customViews.filter(v => v.benutzer_id === account?.id).map(v => ({
      icon: savedView === "custom_" + v.id ? "check" : "layout",
      label: v.name,
      onClick: () => applyCustomView(v),
      onDelete: () => deleteView(v.id, v.benutzer_id),
    })),
    ...(customViews.filter(v => v.geteilt && v.benutzer_id !== account?.id).length > 0 ? [
      { header: true, label: "Geteilte Ansichten" },
      ...customViews.filter(v => v.geteilt && v.benutzer_id !== account?.id).map(v => ({
        icon: savedView === "custom_" + v.id ? "check" : "layout",
        label: v.name,
        onClick: () => applyCustomView(v),
        onDelete: isAdmin ? () => deleteView(v.id, v.benutzer_id) : undefined,
      })),
    ] : []),
    { icon: "device-floppy", label: "Als neue Ansicht speichern", onClick: () => setSaveOpen(true) },
    ...(exportFn && exportFormats.length > 0 ? [
      "sep" as const,
      { header: true, label: "Export" },
      ...exportFormats.map(f => ({
        icon: f.icon || "file-text",
        label: f.label,
        onClick: () => exportFn(sorted, COLS, groups, f.format),
      })),
    ] : []),
  ];

  return {
    // State
    visibleCols, setVisibleCols,
    search, setSearch,
    filterVals, setFilterVals,
    sortDefs, setSortDefs,
    sortCol, sortDir,
    groupBy, setGroupBy,
    groupOrder, setGroupOrder,
    manualOrder, setManualOrder,
    collapsedGroups, setCollapsedGroups,
    dragGroup, setDragGroup,
    dragOverGroup, setDragOverGroup,
    dragRow, setDragRow,
    dragOverRow, setDragOverRow,
    dragCol, setDragCol,
    dragOverCol, setDragOverCol,
    selected, setSelected,
    selectMode, setSelectMode,
    customViews,
    savedView,
    saveOpen, setSaveOpen,
    saveName, setSaveName,
    saveGeteilt, setSaveGeteilt,
    saving,
    mobileFilterOpen, setMobileFilterOpen,
    mobileGroupOpen, setMobileGroupOpen,
    // Computed
    filtered, sorted, groups, hasGroup, COLS, moreItems,
    // Handlers
    handleSort,
    removeSortLevel,
    setSortLevelDir,
    moveSortLevel,
    resetSort,
    handleFilterChange,
    handleColDrop,
    toggleSelectRow,
    toggleSelectAll: () => setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(r => getRowId(r)))),
    saveView,
    deleteView,
    applyStandardView,
    applyCustomView,
  };
}
