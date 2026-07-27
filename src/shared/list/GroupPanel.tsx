/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/GroupPanel.tsx
   Panel für die Mehrfach-Gruppierung

   Aus Toolbar.tsx herausgelöst, Gegenstück zu SortPanel.tsx:
     Desktop — Dropdown mit Drag&Drop-Reihenfolge
     Mobile  — Bottom-Sheet-Inhalt mit Ebenen-Picker
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { TI } from "../../icons.tsx";
import type { GroupOption } from "./types.ts";

export interface GroupPanelProps {
  groupOptions: GroupOption[];
  groupOptionsMore: GroupOption[];
  groupBy: string | string[];
  multiGroup: boolean;
  onGroupChange: ((groupBy: string | string[]) => void) | null;
  onDone: () => void;
  mobile?: boolean;
}

/* Auf Mobile war die Ebenenzahl schon immer gedeckelt, auf Desktop nicht —
   Verhalten unverändert übernommen. */
const MAX_EBENEN_MOBILE = 3;

/* Erklärt eine Option, die zwei Personenkreise zusammenzieht und deshalb
   nicht selbsterklärend ist. */
const INFO_OPTION = "__teams_funktionen";

export function GroupPanel({
  groupOptions, groupOptionsMore, groupBy, multiGroup, onGroupChange, onDone, mobile = false,
}: GroupPanelProps) {
  const [dragGroup, setDragGroup] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  /* Index der Ebene, für die gerade eine Spalte gewählt wird */
  const [picker, setPicker] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const groupByArr = Array.isArray(groupBy) ? groupBy : [groupBy];
  const aktive = groupByArr.filter(g => g && g !== "none");
  const alleOptionen = [...groupOptions, ...groupOptionsMore];
  const optionFuer = (val: string) => alleOptionen.find(o => o.val === val);
  const istAktiv = (val: string) => groupByArr.includes(val);
  const vorschau = aktive.map(v => optionFuer(v)?.label).filter(Boolean).join(" › ");

  function toggleGroup(val: string) {
    if (!onGroupChange) return;
    if (!multiGroup) { onGroupChange(val === "none" ? "none" : val); return; }
    if (val === "none") { onGroupChange(["none"]); return; }
    if (aktive.includes(val)) {
      const rest = aktive.filter(g => g !== val);
      onGroupChange(rest.length > 0 ? rest : ["none"]);
    } else {
      onGroupChange([...aktive, val]);
    }
  }

  function reset() {
    setPicker(null);
    onGroupChange && onGroupChange(["none"]);
  }

  /* ── Mobile ─────────────────────────────────────────────────── */
  if (mobile) {
    return (
      <>
        {aktive.map((val, idx) => {
          const opt = optionFuer(val);
          if (!opt) return null;
          return (
            <div key={val} className="cc-group-mobile-level"
              onMouseDown={e => { e.stopPropagation(); setPicker(idx); }}>
              <div className="cc-group-mobile-dot">{idx + 1}</div>
              <span className="cc-group-mobile-lbl cc-level-lbl">{opt.label}</span>
              <button className="cc-level-remove-btn cc-level-remove-btn-lg"
                aria-label="Ebene entfernen"
                onMouseDown={e => { e.stopPropagation(); toggleGroup(val); }}>×</button>
            </div>
          );
        })}

        {aktive.length < MAX_EBENEN_MOBILE && (
          <div className="cc-group-mobile-level" style={{ opacity: 0.5 }}
            onMouseDown={e => { e.stopPropagation(); setPicker(aktive.length); }}>
            <div className="cc-group-mobile-dot-empty"><TI n="plus" size={10} /></div>
            <span className="cc-group-mobile-lbl-empty">Ebene hinzufügen</span>
            <TI n="chevron-right" size={14} style={{ color: "var(--sub)" }} />
          </div>
        )}

        {picker !== null && (
          <div className="cc-level-picker">
            <div className="cc-level-picker-hdr">Ebene {picker + 1} wählen</div>
            {alleOptionen.filter(o => !istAktiv(o.val)).map(o => (
              <div key={o.val} className="cc-filter-mobile-item"
                onMouseDown={e => {
                  e.stopPropagation();
                  const naechste = [...aktive];
                  naechste.splice(picker, 0, o.val);
                  onGroupChange && onGroupChange(naechste);
                  setPicker(null);
                }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                <TI n="chevron-right" size={13} style={{ color: "var(--sub)" }} />
              </div>
            ))}
            <div className="cc-filter-mobile-footer">
              <button className="cc-ml-dropdown-clear"
                onMouseDown={e => { e.stopPropagation(); setPicker(null); }}>Abbrechen</button>
            </div>
          </div>
        )}

        {istAktiv(INFO_OPTION) && (
          <div className="cc-level-info">
            Zeigt Trainer und Funktionäre in einer gemeinsamen Liste — ideal für Kontaktlisten oder Vereinsverzeichnisse.
          </div>
        )}

        {aktive.length > 0 && <div className="cc-group-preview">{vorschau}</div>}

        {aktive.length > 0 && (
          <div className="cc-filter-mobile-footer">
            <button className="cc-ml-dropdown-clear"
              onMouseDown={e => { e.stopPropagation(); reset(); }}>Alle zurücksetzen</button>
          </div>
        )}
      </>
    );
  }

  /* ── Desktop ────────────────────────────────────────────────── */
  const inaktivHaupt = groupOptions.filter(o => !istAktiv(o.val));
  const inaktivWeitere = groupOptionsMore.filter(o => !istAktiv(o.val));

  return (
    <>
      <div className="cc-filter-footer">
        <button className="cc-ml-dropdown-clear" onClick={() => { reset(); onDone(); }}>Zurücksetzen</button>
        <button className="cc-ml-dropdown-apply" onClick={onDone}>Fertig</button>
      </div>

      {aktive.length > 0 && (
        <>
          <div className="cc-ml-dropdown-section-lbl">
            Aktiv <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span>
          </div>
          {aktive.map((val, idx) => {
            const opt = optionFuer(val);
            if (!opt) return null;
            return (
              <div key={val}
                className={`cc-group-drag-item${dragOverGroup === val ? " cc-drag-over" : ""}`}
                draggable
                onDragStart={() => setDragGroup(val)}
                onDragOver={e => { e.preventDefault(); setDragOverGroup(val); }}
                onDrop={e => {
                  e.preventDefault();
                  if (dragGroup && dragGroup !== val) {
                    const next = [...aktive];
                    const from = next.indexOf(dragGroup), to = next.indexOf(val);
                    if (from !== -1 && to !== -1) {
                      next.splice(from, 1); next.splice(to, 0, dragGroup);
                      onGroupChange && onGroupChange(next);
                    }
                  }
                  setDragGroup(null); setDragOverGroup(null);
                }}
                onDragEnd={() => { setDragGroup(null); setDragOverGroup(null); }}>
                <TI n="grip-vertical" size={14} className="cc-group-drag-handle" />
                <div className="cc-group-drag-nr">{idx + 1}</div>
                <span style={{ flex: 1, fontSize: 13 }}>{opt.label}</span>
                <button className="cc-level-remove-btn"
                  aria-label="Ebene entfernen"
                  onClick={e => { e.stopPropagation(); toggleGroup(val); }}>×</button>
              </div>
            );
          })}
        </>
      )}

      <div className="cc-ml-dropdown-section-lbl">Hinzufügen</div>
      {inaktivHaupt.map(o => (
        <div key={o.val} className="cc-group-inactive-item" onClick={() => toggleGroup(o.val)}>
          <TI n="plus" size={12} />
          {o.label}
          {o.val === INFO_OPTION && <TI n="info-circle" size={12} style={{ marginLeft: "auto", color: "var(--sub)" }} />}
        </div>
      ))}

      {inaktivWeitere.length > 0 && (
        <>
          <div className="cc-group-inactive-item cc-text-sub" style={{ fontWeight: 500 }}
            onClick={() => setMoreOpen(o => !o)}>
            <TI n={moreOpen ? "chevron-up" : "chevron-down"} size={12} />
            Weitere ({inaktivWeitere.length})
          </div>
          {moreOpen && inaktivWeitere.map(o => (
            <div key={o.val} className="cc-group-inactive-item" onClick={() => toggleGroup(o.val)}>
              <TI n="plus" size={12} />
              {o.label}
            </div>
          ))}
        </>
      )}

      {aktive.length > 0 && <div className="cc-level-preview">{vorschau}</div>}
    </>
  );
}
