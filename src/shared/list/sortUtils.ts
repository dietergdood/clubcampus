/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/sortUtils.ts
   Mehrstufige Sortierung (Stufensortierung)
   ═══════════════════════════════════════════════════════════════ */
import type { ListRow, SortDef } from "./types.ts";

export type EinstufigeSortFn<T extends ListRow> = (rows: T[], sortCol: string, sortDir: "asc" | "desc") => T[];

/* Wendet mehrere Sortierebenen an — sortDefs[0] ist die primäre.

   Der Trick bei einer modulspezifischen sortFn: Array.prototype.sort ist
   seit ES2019 stabil. Wendet man die Ebenen von hinten nach vorne an,
   bleibt die Ordnung der feineren Ebene innerhalb gleicher Werte der
   gröberen erhalten — das ergibt exakt die mehrstufige Sortierung, ohne
   dass sortFn seinen einstufigen Vertrag (rows, key, dir) ändern muss.
   Alle bestehenden sortFn-Implementierungen bleiben so unverändert.

   Ohne sortFn greift ein localeCompare-Vergleich über alle Ebenen. */
export function sortiereMehrstufig<T extends ListRow>(
  rows: T[],
  sortDefs: SortDef[],
  sortFn?: EinstufigeSortFn<T>,
): T[] {
  const defs = sortDefs.filter(d => d.key);
  if (defs.length === 0) return rows;

  if (sortFn) return defs.reduceRight((acc, d) => sortFn(acc, d.key, d.dir), rows);

  return [...rows].sort((a, b) => {
    for (const { key, dir } of defs) {
      const av = String(a[key] ?? "");
      const bv = String(b[key] ?? "");
      const cmp = dir === "asc" ? av.localeCompare(bv, "de") : bv.localeCompare(av, "de");
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}
