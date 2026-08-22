/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/getPermissions.ts
   App-Level Zugriffstufen-Hilfsfunktionen. Kein React-Hook (ruft
   intern keine Hooks) — bewusst ohne use-Präfix, damit die
   rules-of-hooks-Regel nicht fälschlich anschlägt.
   ═══════════════════════════════════════════════════════════════ */
import { getEffektiveStufeForFunktionaer } from '../permissions/funktionaerStufen.js';
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
  /* Vereinsmitglied ohne sportliche Funktion. Wie supporter, aber mit
     Vereinsunterlagen und Spielplan: Statuten und GV-Papiere gehoeren den
     MITGLIEDERN, und ein Supporter ist keines. Nicht weil er aussen stuende —
     `helpers: 'schreiben'` hat er wie ein Mitglied, und Mithelfen ist gerade
     das, was ihn ausmacht —, sondern weil ihm die Mitgliedschaft fehlt. */
  mitglied:       { _all: 'lesen', helpers: 'schreiben' },
  supporter:      { _all: 'lesen', helpers: 'schreiben' },
};

interface GetPermissionsProps {
  role: Rolle;
  moduleRechte: ModuleRechte | null;
  zugriffStufen: Record<string, Record<string, Zugriffstufe>> | null;
  dbFunktionen: PortalFunktion[];
}

export function getPermissions({ role, moduleRechte, zugriffStufen, dbFunktionen }: GetPermissionsProps) {
  function getZugriff(modulKey: string): Zugriffstufe | null {
    if (role === 'funktionaer') {
      return getEffektiveStufeForFunktionaer(dbFunktionen, modulKey);
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
