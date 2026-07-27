/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/SortPanel.tsx
   Panel für die Stufensortierung (Multi-Level-Sort)

   Aufbau bewusst parallel zu GroupPanel.tsx:
     Desktop — Dropdown mit Drag&Drop-Reihenfolge
     Mobile  — Bottom-Sheet-Inhalt mit ↑/↓ statt Drag&Drop
               (HTML5-draggable greift auf Touch nicht)
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { TI } from "../../icons.tsx";
import type { ColDef, SortControls, SortDef, SortDir } from "./types.ts";

export interface SortPanelProps extends SortControls {
  onDone: () => void;
  mobile?: boolean;
}

/* Mehr Ebenen sind technisch möglich, werden aber unübersichtlich —
   dieselbe Grenze wie bei der Gruppierung. */
const MAX_EBENEN = 3;

function labelFuer(colDefs: ColDef[], key: string): string {
  return colDefs.find(c => c.key === key)?.label || key;
}

/* "Name A→Z › Team Z→A" — zeigt die Wirkung der Ebenen in einer Zeile */
function vorschau(sortDefs: SortDef[], colDefs: ColDef[]): string {
  return sortDefs
    .filter(d => d.key)
    .map(d => `${labelFuer(colDefs, d.key)} ${d.dir === "asc" ? "A→Z" : "Z→A"}`)
    .join(" › ");
}

interface DirToggleProps {
  dir: SortDir;
  onChange: (dir: SortDir) => void;
}

function DirToggle({ dir, onChange }: DirToggleProps) {
  return (
    <button
      className="cc-sort-dir-toggle"
      title={dir === "asc" ? "Aufsteigend — klicken für absteigend" : "Absteigend — klicken für aufsteigend"}
      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onChange(dir === "asc" ? "desc" : "asc"); }}>
      {dir === "asc" ? "A→Z" : "Z→A"}
    </button>
  );
}

export function SortPanel({
  sortDefs, colDefs, onAddLevel, onRemoveLevel, onDirChange, onMoveLevel, onReset, onDone, mobile = false,
}: SortPanelProps) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [pickerOffen, setPickerOffen] = useState(false);

  const aktive = sortDefs.filter(d => d.key);
  const verfuegbar = colDefs.filter(c => !c.hidden && !aktive.some(d => d.key === c.key));
  const kannHinzufuegen = aktive.length < MAX_EBENEN && verfuegbar.length > 0;

  /* ── Mobile ─────────────────────────────────────────────────── */
  if (mobile) {
    return (
      <>
        {aktive.map((def, idx) => (
          <div key={def.key} className="cc-group-mobile-level">
            <div className="cc-group-mobile-dot">{idx + 1}</div>
            <span className="cc-group-mobile-lbl cc-level-lbl">{labelFuer(colDefs, def.key)}</span>
            <DirToggle dir={def.dir} onChange={dir => onDirChange(def.key, dir)} />
            <button
              className="cc-sort-move-btn"
              disabled={idx === 0}
              aria-label="Ebene nach oben"
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onMoveLevel(def.key, aktive[idx - 1].key); }}>
              <TI n="arrow-up" size={15} />
            </button>
            <button
              className="cc-sort-move-btn"
              disabled={idx === aktive.length - 1}
              aria-label="Ebene nach unten"
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onMoveLevel(def.key, aktive[idx + 1].key); }}>
              <TI n="arrow-down" size={15} />
            </button>
            <button
              className="cc-level-remove-btn"
              aria-label="Ebene entfernen"
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onRemoveLevel(def.key); }}>×</button>
          </div>
        ))}

        {kannHinzufuegen && (
          <div className="cc-group-mobile-level" style={{ opacity: 0.5 }}
            onMouseDown={e => { e.stopPropagation(); setPickerOffen(o => !o); }}>
            <div className="cc-group-mobile-dot-empty"><TI n="plus" size={10} /></div>
            <span className="cc-group-mobile-lbl-empty">Ebene hinzufügen</span>
            <TI n={pickerOffen ? "chevron-down" : "chevron-right"} size={14} style={{ color: "var(--sub)" }} />
          </div>
        )}

        {pickerOffen && kannHinzufuegen && (
          <div className="cc-level-picker">
            <div className="cc-level-picker-hdr">Ebene {aktive.length + 1} wählen</div>
            {verfuegbar.map(c => (
              <div key={c.key} className="cc-filter-mobile-item"
                onMouseDown={e => { e.stopPropagation(); onAddLevel(c.key); setPickerOffen(false); }}>
                <span style={{ flex: 1 }}>{c.label}</span>
                <TI n="chevron-right" size={13} style={{ color: "var(--sub)" }} />
              </div>
            ))}
            <div className="cc-filter-mobile-footer">
              <button className="cc-ml-dropdown-clear"
                onMouseDown={e => { e.stopPropagation(); setPickerOffen(false); }}>Abbrechen</button>
            </div>
          </div>
        )}

        {aktive.length > 0 && <div className="cc-group-preview">{vorschau(aktive, colDefs)}</div>}

        <div className="cc-filter-mobile-footer">
          <button className="cc-ml-dropdown-clear"
            onMouseDown={e => { e.stopPropagation(); setPickerOffen(false); onReset(); }}>Zurücksetzen</button>
        </div>
      </>
    );
  }

  /* ── Desktop ────────────────────────────────────────────────── */
  return (
    <>
      <div className="cc-filter-footer">
        <button className="cc-ml-dropdown-clear" onClick={() => { onReset(); onDone(); }}>Zurücksetzen</button>
        <button className="cc-ml-dropdown-apply" onClick={onDone}>Fertig</button>
      </div>

      {aktive.length > 0 && (
        <>
          <div className="cc-ml-dropdown-section-lbl">
            Ebenen <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span>
          </div>
          {aktive.map((def, idx) => (
            <div key={def.key}
              className={`cc-group-drag-item${dragOverKey === def.key ? " cc-drag-over" : ""}`}
              draggable
              onDragStart={() => setDragKey(def.key)}
              onDragOver={e => { e.preventDefault(); setDragOverKey(def.key); }}
              onDrop={e => {
                e.preventDefault();
                if (dragKey && dragKey !== def.key) onMoveLevel(dragKey, def.key);
                setDragKey(null); setDragOverKey(null);
              }}
              onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}>
              <TI n="grip-vertical" size={14} className="cc-group-drag-handle" />
              <div className="cc-group-drag-nr">{idx + 1}</div>
              <span style={{ flex: 1, fontSize: 13 }}>{labelFuer(colDefs, def.key)}</span>
              <DirToggle dir={def.dir} onChange={dir => onDirChange(def.key, dir)} />
              <button className="cc-level-remove-btn"
                aria-label="Ebene entfernen"
                onClick={e => { e.stopPropagation(); onRemoveLevel(def.key); }}>×</button>
            </div>
          ))}
        </>
      )}

      {kannHinzufuegen && (
        <>
          <div className="cc-ml-dropdown-section-lbl">Hinzufügen</div>
          <div className="cc-sort-add-list">
            {verfuegbar.map(c => (
              <div key={c.key} className="cc-group-inactive-item" onClick={() => onAddLevel(c.key)}>
                <TI n="plus" size={12} />
                {c.label}
              </div>
            ))}
          </div>
        </>
      )}

      {aktive.length > 0 && (
        <div className="cc-level-preview">
          {vorschau(aktive, colDefs)}
          <div className="cc-sort-hint">Tipp: Shift+Klick auf einen Spaltentitel fügt eine Ebene hinzu.</div>
        </div>
      )}
    </>
  );
}
