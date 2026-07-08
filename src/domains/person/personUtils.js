/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personUtils.js
   Personen-Utilities — einmal definiert, überall nutzbar
   ═══════════════════════════════════════════════════════════════ */

/** Vollständiger Name aus Vor- und Nachname */
export function vollname(m) {
  if (!m) return "?";
  const v = m.vorname || m.firstName || "";
  const n = m.nachname || m.lastName || "";
  return `${v} ${n}`.trim() || m.name || "?";
}

/** Initialen (max. 2 Buchstaben) */
export function initials(m) {
  const name = vollname(m);
  return name
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Alter berechnen aus Geburtsdatum */
export function age(geburtsdatum) {
  if (!geburtsdatum) return null;
  return Math.floor((new Date() - new Date(geburtsdatum)) / 31557600000);
}

/** Datum formatieren (Schweizer Format) */
export function formatDatum(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("de-CH");
}

/** Datum + Zeit formatieren */
export function formatDatumZeit(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Vor wie vielen Tagen/Stunden (z.B. "gestern", "vor 3 Tagen") */
export function relativTime(date) {
  if (!date) return "";
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 172800) return "gestern";
  return `vor ${Math.floor(diff / 86400)} Tagen`;
}
