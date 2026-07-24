/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/usePermissions.ts
   App-Level Zugriffstufen-Hilfsfunktionen
   ═══════════════════════════════════════════════════════════════ */
import { getEffektiveStufeForFunktionaer } from '../../modules/NavigationModul.jsx';
import type { Rolle, Zugriffstufe, PortalFunktion, ModuleRechte } from '../../types.js';

type ZugriffMap = Record<string, Zugriffstufe | 'none'> & { _all?: Zugriffstufe | 'none' };
type AppZugriffDefault = Partial<Record<Rolle, ZugriffMap>>;

const APP_ZUGRIFF_DEFAULT: AppZugriffDefault = {
  administrator:  { _all: 'verwalten' },
  administration: { _all: 'verwalten', dashboard: 'lesen' },
  funktionaer:    { _all: 'lesen' },
  trainer:        { _all: 'lesen', team: 'verwalten', training: 'verwalten', events: 'verwalten', attendance_central: 'schreiben', helpers: 'verwalten', buses: 'schreiben', material: 'schreiben', media: 'schreiben', wiki: 'schreiben', members: 'schreiben', schedule: 'lesen' },
  spieler:        { _all: 'lesen', events: 'schreiben', helpers: 'schreiben', buses: 'schreiben' },
  eltern:         { _all: 'lesen', events: 'schreiben', helpers: 'schreiben', schedule: 'lesen' },
  supporter:      { _all: 'lesen', helpers: 'schreiben' },
};

interface UsePermissionsProps {
  role: Rolle;
  moduleRechte: ModuleRechte | null;
  zugriffStufen: Record<string, Record<string, Zugriffstufe>> | null;
  dbFunktionen: PortalFunktion[];
}

export function usePermissions({ role, moduleRechte, zugriffStufen, dbFunktionen }: UsePermissionsProps) {
  function getZugriff(modulKey: string): Zugriffstufe | null {
    if (role === 'funktionaer') {
      return getEffektiveStufeForFunktionaer(dbFunktionen, modulKey) as Zugriffstufe | null;
    }
    const effR = moduleRechte || {};
    const defaultMap = APP_ZUGRIFF_DEFAULT[role];
    const hatZugriff = effR[role]
      ? effR[role].includes(modulKey)
      : (defaultMap?.[modulKey] || defaultMap?._all || 'lesen') !== 'none';
    if (!hatZugriff) return null;
    return (zugriffStufen?.[role]?.[modulKey] || defaultMap?.[modulKey] || defaultMap?._all || 'lesen') as Zugriffstufe;
  }

  const kannLesen    = (mod: string): boolean => !!getZugriff(mod);
  const kannSchreiben = (mod: string): boolean => ['schreiben', 'verwalten'].includes(getZugriff(mod) ?? '');
  const kannVerwalten = (mod: string): boolean => getZugriff(mod) === 'verwalten';

  return { getZugriff, kannLesen, kannSchreiben, kannVerwalten };
}
