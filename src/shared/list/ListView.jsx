/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/ListView.jsx
   Zentrale generische Listen-/Tabellenkomponente
   Wird genutzt von: MitgliederModul, ElternListView, und künftig
   Material, Helfer, Events etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo, Fragment } from "react";
import { Card, Toolbar, ColMenuButton, BulkBar, useIsMobile, ModalOrSheet, ModalTitle, Btn, Input } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { fetchAnsichten, insertAnsicht, deleteAnsicht } from "../../domains/members/memberService.js";

/*
  Props:
  ── Daten ──────────────────────────────────────────────────────
  rows          Array       Bereits gemappte Zeilen
  filterFn      Function    (rows, search, filterVals) => filtered
  sortFn        Function    (rows, col, dir) => sorted
  buildGroupsFn Function    (rows, groupBy, groupOrder) => groups
                            Optional — wenn null: flache Liste
  
  ── Spalten ────────────────────────────────────────────────────
  colDefs       Array       [{key, label, default, alwaysOn, hidden}]
  colGroups     Array       [{group, cols}]
  defaultCols   Array       Keys der Standard-Spalten
  savedViews    Object      {key: {label, cols}} Standard-Ansichten (optional)
  
  ── Filter + Gruppierung ───────────────────────────────────────
  filterDefs    Array       FILTER_DEFS
  groupOptions  Array       [{val, label}]
  groupOptionsMore Array    [{val, label}] (optional)
  multiGroup    Boolean     Mehrfachgruppierung (default: true)
  
  ── Render ─────────────────────────────────────────────────────
  renderCell    Function    (col, row, groupCtx) => <td>
  renderMobile  Function    (row) => <div> (optional)
  getRowId      Function    (row) => id (default: row.id)
  
  ── Ansichten (Supabase) ───────────────────────────────────────
  sb            Object      Supabase Client
  account       Object      {id, name, email}
  vereinId      String      Verein UUID
  viewTyp       String      "mitglieder" | "eltern" | "material" etc.
  
  ── Selektierung ───────────────────────────────────────────────
  selectable    Boolean     Auswahlmodus (default: false)
  bulkActions   Array       [{icon, label, onClick, danger, requiresSelection}]
  
  ── Weitere Aktionen im ··· Menü ───────────────────────────────
  moreActions   Array       zusätzliche moreItems
  
  ── Footer ─────────────────────────────────────────────────────
  footerLabel   Function    (filtered, total) => string
*/

export function ListView({
  // Daten
  rows = [],
  filterFn,
  sortFn,
  buildGroupsFn,
  // Spalten
  colDefs = [],
  colGroups = [],
  defaultCols,
  savedViews,
  // Filter + Gruppierung
  filterDefs = [],
  groupOptions = [],
  groupOptionsMore = [],
  multiGroup = true,
  // Render
  renderCell,
  renderMobile,
  getRowId = (r) => r.id,
  // Supabase / Ansichten
  sb,
  account,
  vereinId,
  viewTyp = "mitglieder",
  // Selektierung
  selectable = false,
  bulkActions = [],
  // Weitere Aktionen
  moreActions = [],
  // Footer
  footerLabel,
}) {
  const isMobile = useIsMobile();

  // ── State ────────────────────────────────────────────────────
  const initialCols = defaultCols || colDefs.filter(c => c.default).map(c => c.key);
  const [visibleCols,    setVisibleCols]    = useState(initialCols);
  const [search,         setSearch]         = useState("");
  const [filterVals,     setFilterVals]     = useState({});
  const [sortCol,        setSortCol]        = useState(colDefs[0]?.key || "");
  const [sortDir,        setSortDir]        = useState("asc");
  const [groupBy,        setGroupBy]        = useState(["none"]);
  const [groupOrder,     setGroupOrder]     = useState({});
  const [manualOrder,    setManualOrder]    = useState({});
  const [collapsedGroups,setCollapsedGroups]= useState(new Set());
  const [dragGroup,      setDragGroup]      = useState(null);
  const [dragOverGroup,  setDragOverGroup]  = useState(null);
  const [dragRow,        setDragRow]        = useState(null);
  const [dragOverRow,    setDragOverRow]    = useState(null);
  const [dragCol,        setDragCol]        = useState(null);
  const [dragOverCol,    setDragOverCol]    = useState(null);
  const [selected,       setSelected]       = useState(new Set());
  const [selectMode,     setSelectMode]     = useState(false);
  const [customViews,    setCustomViews]    = useState([]);
  const [savedView,      setSavedView]      = useState(savedViews ? Object.keys(savedViews)[0] : null);
  const [saveOpen,       setSaveOpen]       = useState(false);
  const [saveName,       setSaveName]       = useState("");
  const [saving,         setSaving]         = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(0);
  const [mobileGroupOpen,  setMobileGroupOpen]  = useState(0);

  // ── Ansichten laden ─────────────────────────────────────────
  useEffect(() => {
    if (!sb || !account?.id) return;
    fetchAnsichten(sb, account.id, viewTyp).then(setCustomViews);
  }, [sb, account?.id, viewTyp]);

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
      benutzer_id:      account.id,
      verein_id:        vereinId,
      name:             saveName.trim(),
      spalten:          visibleCols,
      filter:           filterVals,
      gruppierung:      Array.isArray(groupBy) ? groupBy : [groupBy],
      gruppenreihenfolge: groupOrder,
      zeilenreihenfolge:  manualOrder,
      typ:              viewTyp,
    });
    if (data) setCustomViews(prev => [...prev, data]);
    setSaveName(""); setSaveOpen(false); setSaving(false);
  }

  async function deleteView(id) {
    if (!sb) return;
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

  // ── Sort ────────────────────────────────────────────────────
  function handleSort(key) {
    setManualOrder({});
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  }

  // ── Filter ──────────────────────────────────────────────────
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

  // ── Spalten Drag ────────────────────────────────────────────
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

  // ── Selektierung ────────────────────────────────────────────
  function toggleSelectRow(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === paged.length ? new Set() : new Set(paged.map(r => getRowId(r))));
  }

  // ── Daten Pipeline ──────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!filterFn) return rows;
    return filterFn(rows, search, filterVals);
  }, [rows, search, filterVals, filterFn]);

  const sorted = useMemo(() => {
    if (!sortFn) return filtered;
    return sortFn(filtered, sortCol, sortDir);
  }, [filtered, sortCol, sortDir, sortFn]);

  const paged = sorted;

  const hasGroup = Array.isArray(groupBy) ? groupBy.some(g => g && g !== "none") : groupBy !== "none";

  const groups = useMemo(() => {
    if (!hasGroup || !buildGroupsFn) return [{ key: "__all", label: "", type: "none", members: paged, children: null }];
    return buildGroupsFn(paged, groupBy, groupOrder);
  }, [paged, groupBy, groupOrder, hasGroup, buildGroupsFn]);

  // ── COLS ────────────────────────────────────────────────────
  const COLS = visibleCols.map(k => colDefs.find(c => c.key === k)).filter(Boolean);

  // ── SortIcon ────────────────────────────────────────────────
  const SortIcon = ({ col }) => sortCol === col
    ? <span className="cc-sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
    : <span className="cc-sort-hover-icon">↕</span>;

  // ── moreItems ────────────────────────────────────────────────
  const activeFilterCount = Object.values(filterVals).filter(v => {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return v.von != null || v.bis != null;
    return false;
  }).length;

  const moreItems = [
    ...(hasGroup ? [
      { icon: "chevrons-up",   label: "Alle einklappen", onClick: () => setCollapsedGroups(new Set(groups.map(g => g.key))) },
      { icon: "chevrons-down", label: "Alle ausklappen", onClick: () => setCollapsedGroups(new Set()) },
      "sep",
    ] : []),
    { header: true, label: "Aktionen" },
    ...(selectable ? [{ icon: "checkbox", label: selectMode ? "Auswahlmodus beenden" : "Auswählen", onClick: () => { setSelectMode(m => { if (m) setSelected(new Set()); return !m; }); } }] : []),
    ...moreActions,
    { header: true, label: "Ansichten" },
    ...(savedViews ? Object.entries(savedViews).map(([key, v]) => ({
      icon: savedView === key ? "check" : "layout-list",
      label: v.label,
      onClick: () => applyStandardView(key),
    })) : []),
    ...customViews.map(v => ({
      icon: savedView === "custom_" + v.id ? "check" : "layout-list",
      label: v.name,
      onClick: () => applyCustomView(v),
      onDelete: () => deleteView(v.id),
    })),
    { icon: "device-floppy", label: "Als neue Ansicht speichern", onClick: () => setSaveOpen(true) },
  ];

  // ── Gruppen Tabelle rendern ───────────────────────────────────
  function renderGroupsTable(groups, depth = 0, levelKey = null) {
    const currentLevelKey = levelKey || (Array.isArray(groupBy) ? groupBy[depth] : groupBy) || "none";
    return groups.map(({ key, label, type, members, children }) => {
      if (!children && (!members || members.length === 0)) return null;
      const groupManualOrder = manualOrder[key];
      const orderedMembers = groupManualOrder && groupManualOrder.length > 0
        ? [...(members||[])].sort((a, b) => {
            const ai = groupManualOrder.indexOf(getRowId(a));
            const bi = groupManualOrder.indexOf(getRowId(b));
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          })
        : (members || []);
      const isCollapsed = collapsedGroups.has(key);
      const isDragOver = dragOverGroup === key;
      return (
        <Fragment key={key}>
          {hasGroup && (
            <tr
              className={`cc-members-group-hdr${depth > 0 ? " cc-members-group-hdr-sub" : ""}${isDragOver ? " cc-group-drag-over" : ""}`}
              onClick={() => setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
              draggable
              onDragStart={e => { e.stopPropagation(); setDragGroup({ key, levelKey: currentLevelKey }); }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverGroup(key); }}
              onDrop={e => {
                e.preventDefault(); e.stopPropagation();
                if (dragGroup && dragGroup.key !== key && dragGroup.levelKey === currentLevelKey) {
                  const currentOrder = groupOrder[currentLevelKey] || groups.map(g => g.key);
                  const from = currentOrder.indexOf(dragGroup.key);
                  const to = currentOrder.indexOf(key);
                  if (from !== -1 && to !== -1) {
                    const next = [...currentOrder];
                    next.splice(from, 1); next.splice(to, 0, dragGroup.key);
                    setGroupOrder(prev => ({ ...prev, [currentLevelKey]: next }));
                  }
                }
                setDragGroup(null); setDragOverGroup(null);
              }}
              onDragEnd={() => { setDragGroup(null); setDragOverGroup(null); }}>
              <td colSpan={COLS.length + (selectMode ? 2 : 1)}>
                <div className="cc-members-group-hdr-inner" style={depth > 0 ? { paddingLeft: depth * 16 } : {}}>
                  <TI n={isCollapsed ? "chevron-right" : "chevron-down"} size={14} className="cc-members-group-hdr-chevron" />
                  <span className="cc-members-group-hdr-name">{label}</span>
                  <span className="cc-members-group-hdr-count">{(members||[]).length}</span>
                  <TI n="grip-horizontal" size={14} className="cc-members-group-hdr-grip" />
                </div>
              </td>
            </tr>
          )}
          {!isCollapsed && (children
            ? renderGroupsTable(children, depth + 1, Array.isArray(groupBy) ? groupBy[depth + 1] : null)
            : orderedMembers.map(row => {
                const id = getRowId(row);
                return (
                  <tr key={id}
                    className={`cc-members-tr${selected.has(id) ? " cc-members-tr-selected" : ""}${hasGroup && dragOverRow === id ? " cc-group-drag-over" : ""}${hasGroup ? " cc-members-tr-draggable" : ""}`}
                    draggable={hasGroup}
                    onDragStart={hasGroup ? e => { e.stopPropagation(); setDragRow({ id, groupKey: key }); } : undefined}
                    onDragOver={hasGroup ? e => { e.preventDefault(); e.stopPropagation(); setDragOverRow(id); } : undefined}
                    onDrop={hasGroup ? e => {
                      e.preventDefault(); e.stopPropagation();
                      if (dragRow && dragRow.id !== id && dragRow.groupKey === key) {
                        const curr = manualOrder[key] || orderedMembers.map(r => getRowId(r));
                        const from = curr.indexOf(dragRow.id), to = curr.indexOf(id);
                        if (from !== -1 && to !== -1) {
                          const next = [...curr]; next.splice(from, 1); next.splice(to, 0, dragRow.id);
                          setManualOrder(prev => ({ ...prev, [key]: next }));
                        }
                      }
                      setDragRow(null); setDragOverRow(null);
                    } : undefined}
                    onDragEnd={hasGroup ? () => { setDragRow(null); setDragOverRow(null); } : undefined}>
                    {selectMode && (
                      <td className="cc-members-cb-col" onClick={e => e.stopPropagation()}>
                        <div className={`cc-col-menu-check${selected.has(id) ? " cc-col-menu-check-on" : ""}`} onClick={() => toggleSelectRow(id)}>
                          {selected.has(id) && <TI n="check" size={10} />}
                        </div>
                      </td>
                    )}
                    {COLS.map(col => renderCell ? renderCell(col, row, { type: type || "none", key }) : <td key={col.key} className="cc-members-td">{String(row[col.key] || "—")}</td>)}
                    <td className="cc-members-td cc-members-td-actions" />
                  </tr>
                );
              })
          )}
        </Fragment>
      );
    });
  }

  const footer = footerLabel
    ? footerLabel(filtered.length, rows.length)
    : `${filtered.length} von ${rows.length} Einträgen`;

  return (
    <>
      {/* Selektionsleiste */}
      {selectable && !isMobile && (
        <BulkBar
          show={selectMode}
          count={selected.size}
          total={paged.length}
          onSelectAll={toggleSelectAll}
          actions={bulkActions}
          onCancel={() => { setSelected(new Set()); setSelectMode(false); }}
        />
      )}

      {/* Toolbar */}
      <Toolbar
        search={search} onSearch={setSearch}
        filterDefs={filterDefs}
        filterVals={filterVals}
        onFilterChange={handleFilterChange}
        groupOptions={groupOptions}
        groupOptionsMore={groupOptionsMore}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        multiGroup={multiGroup}
        externalFilterOpen={mobileFilterOpen}
        externalGroupOpen={mobileGroupOpen}
        colMenu={!isMobile && (
          <ColMenuButton
            colGroups={colGroups}
            visibleCols={visibleCols}
            onVisibleColsChange={setVisibleCols}
            dragCol={dragCol}
            dragOverCol={dragOverCol}
            onDragStart={k => setDragCol(k)}
            onDragOver={k => setDragOverCol(k)}
            onDrop={handleColDrop}
            onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
          />
        )}
        moreItems={moreItems}
        right={isMobile ? undefined : undefined}
      />

      {/* Tabelle */}
      <Card className="cc-card-table" flush>
        {rows.length === 0 ? (
          <div className="cc-empty">Keine Einträge.</div>
        ) : filtered.length === 0 ? (
          <div className="cc-empty">Keine Einträge gefunden.</div>
        ) : isMobile && renderMobile ? (
          <div>{groups.map(({ key, label, members, children }) => (
            <div key={key}>
              {hasGroup && label && <div className="cc-members-list-group-hdr">{label} <span className="cc-text-muted">{members.length}</span></div>}
              {(members || []).map(row => renderMobile(row))}
            </div>
          ))}</div>
        ) : (
          <div className="cc-table-wrap"><div className="cc-table-wrap-inner">
            <table className="cc-members-table">
              <thead>
                <tr>
                  {selectMode && <th className="cc-members-th cc-members-cb-col">
                    <div className={`cc-col-menu-check${selected.size === paged.length && paged.length > 0 ? " cc-col-menu-check-on" : ""}`} onClick={toggleSelectAll}>
                      {selected.size === paged.length && paged.length > 0 && <TI n="check" size={10} />}
                    </div>
                  </th>}
                  {COLS.map(col => (
                    <th key={col.key} className="cc-members-th" onClick={() => handleSort(col.key)}>
                      <span className="cc-members-th-inner">
                        <span>{col.label}<SortIcon col={col.key} /></span>
                      </span>
                    </th>
                  ))}
                  <th className="cc-members-th cc-members-th-actions" />
                </tr>
              </thead>
              <tbody>
                {renderGroupsTable(groups)}
              </tbody>
            </table>
          </div></div>
        )}
        <div className="cc-archiv-footer">{footer}</div>
      </Card>

      {/* Ansicht speichern Modal */}
      <ModalOrSheet open={saveOpen} onClose={() => { setSaveOpen(false); setSaveName(""); }} maxWidth={380}>
        <div className="cc-modal-hdr">
          <ModalTitle>Als neue Ansicht speichern</ModalTitle>
          <button className="cc-icon-btn" onClick={() => { setSaveOpen(false); setSaveName(""); }}><TI n="x" size={14} /></button>
        </div>
        <div className="cc-modal-body cc-col cc-gap-8">
          <input
            className="cc-input"
            placeholder="Name der Ansicht…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveView()}
            autoFocus
          />
        </div>
        <div className="cc-modal-ftr">
          <Btn onClick={() => { setSaveOpen(false); setSaveName(""); }}>Abbrechen</Btn>
          <Btn variant="primary" onClick={saveView} disabled={saving || !saveName.trim()}>
            {saving ? "Speichert…" : "Speichern"}
          </Btn>
        </div>
      </ModalOrSheet>
    </>
  );
}
