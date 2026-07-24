/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonSelector.jsx
   Personen-Suche + Auswahl — für Kader, Helfer, Nachrichten etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { PersonSummary } from "./PersonSummary.jsx";
import { TI } from "../../icons.jsx";
import { vollname } from "../../domains/person/personUtils.ts";

/**
 * @param {Array}    persons     - Liste von Person-Objekten
 * @param {function} onSelect    - Callback wenn Person ausgewählt
 * @param {string}   placeholder - Placeholder-Text
 * @param {function} filter      - Optionaler Filter (person) => bool
 */
export function PersonSelector({
  persons = [],
  onSelect,
  placeholder = "Person suchen…",
  filter,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = persons
    .filter(p => filter ? filter(p) : true)
    .filter(p => vollname(p).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function select(person) {
    onSelect(person);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="cc-input cc-row cc-gap-6" style={{ padding: "8px 10px" }}>
        <TI n="search" size={14} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)" }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sub)", padding: 0 }}>
            <TI n="x" size={14} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="cc-dropdown-menu" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, maxHeight: 280, overflowY: "auto" }}>
          {filtered.map(p => (
            <div key={p.id} className="cc-dropdown-item" onClick={() => select(p)} style={{ padding: "8px 12px", cursor: "pointer" }}>
              <PersonSummary person={p} subtitle={p.mitgliedtyp || p.rolle || ""} avatarSize={28} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PersonSelector;
