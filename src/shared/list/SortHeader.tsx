/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/SortHeader.tsx
   Sortierbarer Tabellen-Header + Ebenen-Indikator (SortBadge)

   Einstufig (sortCol/sortDir) und mehrstufig (sortDefs) laufen beide
   hier durch: SortBadge zeigt bei einer Ebene den gewohnten Pfeil und
   ab zwei Ebenen nummerierte Badges. ListView nutzt SortBadge direkt,
   damit es keine zweite Pfeil-Logik gibt.
   ═══════════════════════════════════════════════════════════════ */
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { SortDef, SortDir } from "./types.ts";

/* Frueher hier definiert — bleibt als Re-Export, damit bestehende
   Importe (DesignSystemTab, theme.ts) nicht brechen. */
export type { SortDir };

/* sortCol/sortDir in eine Ebenenliste ueberfuehren. Aufrufer, die schon
   sortDefs haben, reichen sie direkt durch. */
export function alsSortDefs(sortDefs?: SortDef[] | null, sortCol?: string | null, sortDir: SortDir = "asc"): SortDef[] {
  if (sortDefs?.length) return sortDefs;
  return sortCol ? [{ key: sortCol, dir: sortDir }] : [];
}

interface SortBadgeProps {
  col: string;
  sortDefs: SortDef[];
  /* Gesetzt → das Badge bekommt ein × zum Entfernen der Ebene */
  onRemove?: ((col: string) => void) | null;
}

/* Indikator einer Spalte: nichts/↕ wenn unsortiert, Pfeil bei einer
   einzigen Ebene, nummeriertes Badge sobald mehrstufig sortiert wird. */
export function SortBadge({ col, sortDefs, onRemove = null }: SortBadgeProps) {
  const idx = sortDefs.findIndex(d => d.key === col);
  if (idx === -1) return <span className="cc-sort-hover-icon">↕</span>;

  const pfeil = sortDefs[idx].dir === "asc" ? "▲" : "▼";
  if (sortDefs.length < 2) return <span className="cc-sort-arrow">{pfeil}</span>;

  return (
    <span className={`cc-sort-badge${idx > 0 ? " cc-sort-badge-sub" : ""}`} title={`Sortierebene ${idx + 1}`}>
      <span className="cc-sort-badge-nr">{idx + 1}</span>
      {pfeil}
      {onRemove && (
        <span
          className="cc-sort-badge-x"
          role="button"
          aria-label={`Sortierebene ${idx + 1} entfernen`}
          onClick={e => { e.stopPropagation(); onRemove(col); }}>×</span>
      )}
    </span>
  );
}

interface SortHeaderProps {
  label?: ReactNode;
  col: string;
  /* Einstufig — weiterhin unterstuetzt (DesignSystemTab) */
  sortCol?: string | null;
  sortDir?: SortDir;
  /* Mehrstufig — hat Vorrang vor sortCol/sortDir */
  sortDefs?: SortDef[] | null;
  /* addLevel kommt aus dem Shift-Zustand des Klicks */
  onSort: (col: string, addLevel?: boolean) => void;
  onRemoveSort?: ((col: string) => void) | null;
  style?: CSSProperties;
  className?: string;
}

export function SortHeader({
  label, col, sortCol, sortDir = "asc", sortDefs, onSort, onRemoveSort = null,
  style = {}, className = "cc-members-th",
}: SortHeaderProps) {
  const defs = alsSortDefs(sortDefs, sortCol, sortDir);
  const active = defs.some(d => d.key === col);
  return (
    <th
      className={`${className}${active ? " cc-members-th-sorted" : ""}`}
      style={{ cursor: "pointer", ...style }}
      title="Klick sortiert, Shift+Klick fügt eine Sortierebene hinzu"
      onClick={(e: MouseEvent) => onSort(col, e.shiftKey)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <SortBadge col={col} sortDefs={defs} onRemove={onRemoveSort} />
      </span>
    </th>
  );
}
