/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/ListView.jsx
   Zentrale generische Listen-/Tabellenkomponente
   State + Logic → useListView.js
   ═══════════════════════════════════════════════════════════════ */
import { Fragment } from "react";
import { Card, Toolbar, ColMenuButton, BulkBar, useIsMobile, ModalOrSheet, ModalTitle, Btn, EmptyState } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { useListView } from "./useListView.js";

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
  // External filter control
  externalSetFilter,
  // Export
  exportFn,
  exportFormats = [],
  // Admin
  isAdmin = false,
  // Empty state
  emptyIcon = "list",
  emptyTitle = "Noch keine Einträge",
  emptySubtitle = "Füge den ersten Eintrag hinzu, um loszulegen.",
}) {
  const isMobile = useIsMobile();

  const {
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
    saveOpen, setSaveOpen,
    saveName, setSaveName,
    saveGeteilt, setSaveGeteilt,
    saving,
    mobileFilterOpen,
    mobileGroupOpen,
    filtered, sorted, groups, hasGroup, COLS, moreItems,
    handleSort,
    handleFilterChange,
    handleColDrop,
    toggleSelectRow,
    toggleSelectAll,
    saveView,
  } = useListView({
    rows, colDefs, defaultCols, savedViews,
    filterFn, sortFn, buildGroupsFn,
    filterDefs, groupOptions, groupOptionsMore, multiGroup,
    getRowId, sb, account, vereinId, viewTyp,
    selectable, moreActions, exportFn, exportFormats,
    isAdmin, isMobile, externalSetFilter,
  });

  const SortIcon = ({ col }) => sortCol === col
    ? <span className="cc-sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
    : <span className="cc-sort-hover-icon">↕</span>;

  // ── Gruppen Tabelle rendern ───────────────────────────────────
  function renderGroupsTable(groups, depth = 0, levelKey = null, parentCtx = {type:"none",key:null}) {
    const currentLevelKey = levelKey || (Array.isArray(groupBy) ? groupBy[depth] : groupBy) || "none";
    return groups.map(({ key, label, type, members, children }) => {
      if (!children && (!members || members.length === 0)) return null;
      const currentCtx = { type: type || "none", key };
      const effectiveCtx = (type==="team"||type==="gruppe")
        ? currentCtx
        : (parentCtx.type==="team"||parentCtx.type==="gruppe")
          ? { ...parentCtx, subType: type, subKey: key }
          : currentCtx;
      const groupManualOrder = manualOrder[key];
      const orderedMembers = groupManualOrder?.length
        ? [...(members||[])].sort((a, b) => {
            const ai = groupManualOrder.indexOf(getRowId(a));
            const bi = groupManualOrder.indexOf(getRowId(b));
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1; if (bi === -1) return -1;
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
            ? renderGroupsTable(children, depth + 1, Array.isArray(groupBy) ? groupBy[depth + 1] : null, effectiveCtx)
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
                    {COLS.map(col => renderCell
                      ? renderCell(col, row, effectiveCtx, filterVals)
                      : <td key={col.key} className="cc-members-td cc-members-td-sub">{String(row[col.key] ?? "—")}</td>
                    )}
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
          total={sorted.length}
          onSelectAll={toggleSelectAll}
          actions={bulkActions.map(a => ({ ...a, onClick: () => a.onClick(selected) }))}
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
      />

      {/* Alle ein/ausklappen */}
      {hasGroup && !isMobile && (
        <div className="cc-expand-all-bar">
          <button className="cc-expand-all-btn" onClick={() => setCollapsedGroups(new Set(groups.map(g => g.key)))}>
            <TI n="chevrons-up" size={11}/> alle einklappen
          </button>
          <span className="cc-expand-all-sep">·</span>
          <button className="cc-expand-all-btn" onClick={() => setCollapsedGroups(new Set())}>
            <TI n="chevrons-down" size={11}/> alle ausklappen
          </button>
        </div>
      )}

      {/* Tabelle */}
      <Card className="cc-card-table" flush>
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle}/>
        ) : filtered.length === 0 ? (
          <EmptyState icon="filter-off" title="Keine Einträge gefunden" subtitle="Passe die Filter an oder setze sie zurück." action="Filter zurücksetzen" onAction={() => setFilterVals({})}/>
        ) : isMobile && renderMobile ? (
          <div>{groups.map(({ key, label, members }) => (
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
                    <div className={`cc-col-menu-check${selected.size === sorted.length && sorted.length > 0 ? " cc-col-menu-check-on" : ""}`} onClick={toggleSelectAll}>
                      {selected.size === sorted.length && sorted.length > 0 && <TI n="check" size={10} />}
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
          {isAdmin && (
            <label className="cc-row cc-gap-8" style={{cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={saveGeteilt} onChange={e => setSaveGeteilt(e.target.checked)}/>
              Für alle Benutzer freigeben
            </label>
          )}
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
