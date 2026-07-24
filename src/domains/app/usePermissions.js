/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/usePermissions.js
   App-Level Zugriffstufen-Hilfsfunktionen
   ═══════════════════════════════════════════════════════════════ */
import { getEffektiveStufeForFunktionaer } from "../../modules/NavigationModul.jsx";

const APP_ZUGRIFF_DEFAULT = {
  administrator:  { _all: "verwalten" },
  administration: { _all: "verwalten", dashboard: "lesen" },
  funktionaer:    { _all: "lesen" },
  trainer:        { _all: "lesen", team: "verwalten", training: "verwalten", events: "verwalten", attendance_central: "schreiben", helpers: "verwalten", buses: "schreiben", material: "schreiben", media: "schreiben", wiki: "schreiben", members: "schreiben", schedule: "lesen" },
  spieler:        { _all: "lesen", events: "schreiben", helpers: "schreiben", buses: "schreiben" },
  eltern:         { _all: "lesen", events: "schreiben", helpers: "schreiben", schedule: "lesen" },
  supporter:      { _all: "lesen", helpers: "schreiben" },
};

export function usePermissions({ role, moduleRechte, zugriffStufen, dbFunktionen }) {
  function getZugriff(modulKey) {
    if (role === "funktionaer") {
      return getEffektiveStufeForFunktionaer(dbFunktionen, modulKey);
    }
    const effR = moduleRechte || {};
    const hatZugriff = effR[role]
      ? effR[role].includes(modulKey)
      : (APP_ZUGRIFF_DEFAULT[role]?.[modulKey] || APP_ZUGRIFF_DEFAULT[role]?._all || "lesen") !== "none";
    if (!hatZugriff) return null;
    const zs = typeof zugriffStufen !== "undefined" ? zugriffStufen : null;
    return zs?.[role]?.[modulKey] || APP_ZUGRIFF_DEFAULT[role]?.[modulKey] || APP_ZUGRIFF_DEFAULT[role]?._all || "lesen";
  }

  const kannLesen    = (mod) => !!getZugriff(mod);
  const kannSchreiben = (mod) => ["schreiben", "verwalten"].includes(getZugriff(mod));
  const kannVerwalten = (mod) => getZugriff(mod) === "verwalten";

  return { getZugriff, kannLesen, kannSchreiben, kannVerwalten };
}
