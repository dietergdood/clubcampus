/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/permissions/funktionaerStufen.ts
   Effektive Zugriffstufe eines Funktionärs pro Modul.

   Reine Logik ohne UI/React — lag früher in modules/NavigationModul,
   wurde aber von domains/app/usePermissions genutzt (Schichten-
   Inversion domains -> modules). Hier in die Domain-Schicht gezogen;
   NavigationModul re-importiert bei Bedarf von hier (Modul -> Domain
   ist erlaubt).
   ═══════════════════════════════════════════════════════════════ */
import type { Zugriffstufe } from '../../types.js';

/* Vereinsfunktion für die Stufenlogik — defensiv, da manche Felder
   (portal_gruppen.default_stufe, modul_stufen) je nach Quelle fehlen. */
export interface FunktionaerFunktion {
  module_override?: string[] | null;
  modul_stufen?: Record<string, string> | null;
  stufe_override?: Record<string, string> | null;
  portal_gruppen?: {
    module?: string[] | null;
    modul_stufen?: Record<string, string> | null;
    default_stufe?: string;
  } | null;
}

const STUFE_RANG: Record<string, number> = { lesen: 1, schreiben: 2, verwalten: 3 };

export function maxStufe(a: Zugriffstufe | null, b: Zugriffstufe | null): Zugriffstufe | null {
  if (!a) return b;
  if (!b) return a;
  return STUFE_RANG[a] >= STUFE_RANG[b] ? a : b;
}

export function getEffektiveStufeForFunktionaer(dbFunktionen: FunktionaerFunktion[], modulKey: string): Zugriffstufe | null {
  if (!dbFunktionen || dbFunktionen.length === 0) return null;
  let best: Zugriffstufe | null = null;
  dbFunktionen.forEach(f => {
    const override = f.stufe_override?.[modulKey];
    const gruppenStufe = f.portal_gruppen?.modul_stufen?.[modulKey] || f.modul_stufen?.[modulKey];
    const module = (f.module_override?.length || 0) > 0 ? f.module_override! : (f.portal_gruppen?.module || []);
    if (module.includes(modulKey)) {
      const stufe = (override || gruppenStufe || f.portal_gruppen?.default_stufe || 'lesen') as Zugriffstufe;
      best = maxStufe(best, stufe);
    }
  });
  return best;
}
