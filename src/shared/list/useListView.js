/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/useListView.js
   State + Logic Hook für ListView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { fetchAnsichten, insertAnsicht, deleteAnsicht } from "../../domains/members/memberService.js";

export function useListView({
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
}) {
  const initialCols = defaultCols || colDefs.filter(c => c.default).map(c => c.key);

  // ── State ────────────────────────────────────────────────────
  const [visibleCols,      setVisibleCols]      = useState(initialCols);
  const [search,           setSearch]           = useState("");
  const [filterVals,       setFilterVals]       = useState({});
  const [sortCol,          setSortCol]          = useState(colDefs[0]?.key || "");
  const [sortDir,          setSortDir]          = useState("asc");
  const [groupBy,          setGroupBy]          = useState(["none"]);
  const [groupOrder,       setGroupOrder]       = useState({});
  const [manualOrder,      setManualOrder]      = useState({});
  const [collapsedGroups,  setCollapsedGroups]  = useState(new Set());
  const [dragGroup,        setDragGroup]        = useState(null);
  const [dragOverGroup,    setDragOverGroup]    = useState(null);
  const [dragRow,          setDragRow]          = useState(null);
  const [dragOverRow,      setDragOverRow]      = useState(null);
  const [dragCol,          setDragCol]          = useState(null);
  const [dragOverCol,      setDragOverCol]      = useState(null);
  const [selected,         setSelected]         = useState(new Set());
  const [selectMode,       setSelectMode]       = useState(false);
  const [customViews,      setCustomViews]      = useState([]);
  const [savedView,        setSavedView]        = useState(savedViews ? Object.keys(savedViews)[0] : null);
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

  // ── Ansichten anwenden ───────────────────────────────────────
  function applyStandardView(key) {
    if (!savedViews?.[key]) return;
    setSavedView(key);
    setVisibleCols(savedViews[key].cols);
    setFilterVals({});
    setGroupBy(["none"]);
    setGroupOrder({});
    setManualOrder({});
  }

  function applyCustomView(v) {
    setSavedView("custom_" + v.id);
    setVisibleCols(v.spalten || initialCols);
    setFilterVals(v.filter || {});
    setGroupBy(Array.isArray(v.gruppierung) ? v.gruppierung : [v.gruppierung || "none"]);
    setGroupOrder(v.gruppenreihenfolge || {});
    setManualOrder(v.zeilenreihenfolge || {});
  }

  async function saveView() {
    if (!saveName.trim() || !sb || !account?.id) return;
    setSaving(true);
    const data = await insertAnsicht(sb, {
      benutzer_id:        account.id,
      verein_id:          vereinId,
      name:               saveName.trim(),
      spalten:            visibleCols,
      filter:             filterVals,
      gruppierung:        Array.isArray(groupBy) ? groupBy : [groupBy],
      gruppenreihenfolge: groupOrder,
      zeilenreihenfolge:  manualOrder,
      typ:                viewTyp,
      geteilt:            saveGeteilt,
    });
    if (data) setCustomViews(prev => [...prev, data]);
    setSaveName(""); setSaveGeteilt(false); setSaveOpen(false); setSaving(false);
  }

  async function deleteView(id, ownerId) {
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
    }
  }

  // ── Sort ─────────────────────────────────────────────────────
  function handleSort(key) {
    setManualOrder({});
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  }

  // ── Filter ───────────────────────────────────────────────────
  function handleFilterChange(key, val, active) {
    if (key === "__reset") { setFilterVals({}); return; }
    if (key === "__range") {
      const { rangeKey, von, bis } = val;
      if (von == null && bis == null) {
        setFilterVals(prev => { const n = { ...prev }; delete n[rangeKey]; return n; });
      } else {
        setFilterVals(prev => ({ ...prev, [rangeKey]: { von, bis } }));
      }
      return;
    }
    setFilterVals(prev => {
      const cur = prev[key] || [];
      return { ...prev, [key]: active ? [...cur, val] : cur.filter(v => v !== val) };
    });
  }

  // ── Spalten Drag ─────────────────────────────────────────────
  function handleColDrop(targetKey, dragKey) {
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
  function toggleSelectRow(id) {
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
        if (!vals || vals.length === 0) continue;
        const v = row[k];
        if (Array.isArray(v)) { if (!v.some(x => vals.includes(x))) return false; }
        else if (!vals.includes(v)) return false;
      }
      return true;
    });
  }, [rows, search, filterVals, filterFn]);

  const sorted = useMemo(() => {
    if (sortFn) return sortFn(filtered, sortCol, sortDir);
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? "");
      const bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv, "de") : bv.localeCompare(av, "de");
    });
  }, [filtered, sortCol, sortDir, sortFn]);

  const hasGroup = Array.isArray(groupBy) ? groupBy.some(g => g && g !== "none") : groupBy !== "none";

  const groups = useMemo(() => {
    if (!hasGroup) return [{ key: "__all", label: "", type: "none", members: sorted, children: null }];
    if (buildGroupsFn) return buildGroupsFn(sorted, groupBy, groupOrder, filterVals);
    function buildDefault(rows, levels, groupOrder) {
      const firstLevel = levels[0] || "none";
      const restLevels = levels.slice(1);
      if (!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];
      const map = {};
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
  const COLS = visibleCols.map(k => colDefs.find(c => c.key === k)).filter(Boolean);

  const moreItems = [
    ...moreActions,
    ...(moreActions.length > 0 && !isMobile ? ["sep"] : []),
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
      "sep",
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
