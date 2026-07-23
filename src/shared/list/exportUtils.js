/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/exportUtils.js
   Zentrale Export-Funktion + Filter-Hilfsfunktion für alle
   ListView-basierten Module.
   ═══════════════════════════════════════════════════════════════ */
import * as XLSX from "xlsx";

/*
  buildFilterDefs(rows, fields)

  Baut FILTER_DEFS automatisch aus den Daten auf.

  fields: Array von Feld-Definitionen:
    { key, label }                    → vals aus rows[key] (distinct, sorted)
    { key, label, vals }              → fixe Werte (z.B. ["Aktiv", "Kein Zugang"])
    { key, label, type:"range", min, max, suffix } → Range-Filter
    { key, label, flatMap: fn }       → fn(row) gibt Array zurück (z.B. Teams)
    { key, type:"or-divider" }        → ODER-Trenner
    { key, type:"und-divider" }       → UND-Trenner

  Beispiel:
    buildFilterDefs(rows, [
      { key:"mitgliedschaft", label:"Mitgliedschaft" },
      { key:"__or_divider",   type:"or-divider" },
      { key:"portal",         label:"Portal", vals:["Aktiv","Kein Zugang"] },
    ])
*/
export function buildFilterDefs(rows, fields) {
  return fields.map(f => {
    if (f.type === "or-divider" || f.type === "und-divider" || f.type === "range") return f;
    if (f.vals) return f;
    if (f.flatMap) {
      return { ...f, vals: [...new Set(rows.flatMap(r => f.flatMap(r)).filter(Boolean))].sort() };
    }
    return { ...f, vals: [...new Set(rows.map(r => r[f.key]).filter(Boolean))].sort() };
  });
}

function defaultGetCellValue(col, row) {
  const v = row[col.key];
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function csvDownload(data, filename) {
  const rows = data.map(r => r.map(v => '"' + String(v || "").replace(/"/g, '""') + '"').join(";"));
  const csv = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/*
  exportListData(rows, cols, groups, format, options)

  rows    — gefilterte/sortierte Zeilen (bereits gemappt)
  cols    — sichtbare Spalten [{key, label}]
  groups  — Gruppenstruktur von buildGroupsFn
  format  — "csv" | "csv-gruppen" | "excel-sheets"
  options:
    getCellValue(col, row, groupCtx) — wie Zellwert formatiert wird
    filename   — Dateiname ohne Extension (default: "export")
    sheetName  — Excel Sheet Name wenn keine Gruppen (default: "Daten")
*/
export function exportListData(rows, cols, groups, format, options = {}) {
  const {
    getCellValue = defaultGetCellValue,
    filename = "export",
    sheetName = "Daten",
  } = options;

  const hasGroups = groups && groups.length > 0 && groups[0].key !== "__all" && groups[0].key !== "";
  const headers = cols.map(c => c.label);

  function getRow(row, groupCtx = { type: "none", key: null }) {
    return cols.map(col => getCellValue(col, row, groupCtx));
  }

  if (format === "csv") {
    // Flacher CSV — alle gefilterten Zeilen
    const csvRows = rows.map(r => getRow(r));
    csvDownload([headers, ...csvRows], `${filename}.csv`);

  } else if (format === "csv-gruppen") {
    // CSV mit Gruppenköpfen
    if (!hasGroups) {
      csvDownload([headers, ...rows.map(r => getRow(r))], `${filename}-gruppen.csv`);
      return;
    }
    const allRows = [headers];
    function addGroups(grps) {
      grps.forEach(({ key, label, type, members, children }) => {
        allRows.push([label || key, ...new Array(headers.length - 1).fill("")]);
        if (children) addGroups(children);
        else {
          const gc = type !== "none" ? { type, key } : { type: "none", key: null };
          members.forEach(r => allRows.push(getRow(r, gc)));
        }
        allRows.push(new Array(headers.length).fill(""));
      });
    }
    addGroups(groups);
    csvDownload(allRows, `${filename}-gruppen.csv`);

  } else if (format === "excel-sheets") {
    // Excel — pro Gruppe ein Sheet
    const wb = XLSX.utils.book_new();
    if (!hasGroups) {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map(r => getRow(r))]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    } else {
      function addSheets(grps) {
        grps.forEach(({ key, label, type, members, children }) => {
          if (children) { addSheets(children); return; }
          const gc = type !== "none" ? { type, key } : { type: "none", key: null };
          const sheetRows = members.map(r => getRow(r, gc));
          const name = (label || key || "Gruppe").slice(0, 31).replace(/[\/\*\?\[\]\:]/g, "");
          const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);
          XLSX.utils.book_append_sheet(wb, ws, name);
        });
      }
      addSheets(groups);
    }
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
}
