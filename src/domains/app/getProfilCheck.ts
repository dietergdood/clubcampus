/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/getProfilCheck.ts
   Profil-Vollständigkeit und Prüfung. Kein React-Hook (ruft intern
   keine Hooks) — bewusst ohne use-Präfix.

   Was fehlt, entscheidet seit 05.08.2026 die Pflichtfeld-Matrix aus
   der Portalverwaltung, nicht mehr eine hier verdrahtete Liste. Vorher
   prüfte diese Datei Vorname, Nachname, Geburtsdatum und „Telefon oder
   E-Mail" — die Adresse gar nicht. Ein Verein konnte sie also als
   Pflicht konfigurieren, ohne dass es je eine Wirkung hatte.

   Anders als beim Anlegen zählen hier AUCH die Zusatzfelder der Rolle:
   der Spieler steht inzwischen im Kader, seine Rolle ist bekannt.
   ═══════════════════════════════════════════════════════════════ */
import {
  IMMER_PFLICHT,
  getEffektivePflichtfelder,
  type RollePflichtfeld,
} from '../members/pflichtfelder.ts';
import { FELD_LABEL } from '../members/memberService.ts';
import type { Sb, DbUser, Mitglied, MitgliedtypPflichtfeld, Rolle, SetState } from '../../types.js';

interface GetProfilCheckProps {
  sb: Sb;
  dbUser: DbUser | null;
  role: Rolle;
  dbMitglieder: Mitglied[];
  setDbUser: SetState<DbUser | null>;
  /** Die eigene Person. Seit Etappe 4 stehen Vorname, Nachname und Telefon
      dort und nicht mehr an `benutzer` — die Spalten sind gestrichen. */
  eigenePerson?: { vorname?: string | null; nachname?: string | null; telefon?: string | null } | null;
  /** Matrix aus der Portalverwaltung. Fehlt sie, wird nichts verlangt —
      bewusst: ein leerer Ladezustand darf keinen Hinweis auslösen. */
  typMatrix?: MitgliedtypPflichtfeld[];
  rolleMatrix?: RollePflichtfeld[];
}

/* Feldwert eines Mitglieds — leer zählt als fehlend. `Mitglied` ist breit
   typisiert, der Zugriff über einen Schlüssel deshalb bewusst nachsichtig. */
function istLeer(raw: Partial<Mitglied>, feld: string): boolean {
  const wert = (raw as Record<string, unknown>)[feld];
  if (wert === null || wert === undefined) return true;
  if (typeof wert === 'string') return wert.trim() === '';
  if (Array.isArray(wert)) return wert.length === 0;
  return false;
}

export function getProfilCheck({
  sb, dbUser, role, dbMitglieder, setDbUser,
  eigenePerson = null, typMatrix = [], rolleMatrix = [],
}: GetProfilCheckProps) {

  /* Fehlende Pflichtfelder eines Mitglieds, als Feld-Labels. */
  function fehlendeFelder(raw: Partial<Mitglied>): string[] {
    const fehlend: string[] = [];

    for (const feld of IMMER_PFLICHT) {
      if (istLeer(raw, feld)) fehlend.push(FELD_LABEL[feld] || feld);
    }

    const pflicht = getEffektivePflichtfelder({
      mitgliedtyp: raw.mitgliedtyp,
      rolle: raw.rolle,
      typMatrix,
      rolleMatrix,
    });
    for (const feld of pflicht) {
      if (istLeer(raw, feld)) fehlend.push(FELD_LABEL[feld] || feld);
    }
    return fehlend;
  }

  function getProfilFehlend(): string[] {
    if (!dbUser) return [];
    const isEltern = role === 'eltern' && !dbMitglieder.find(m => m.id === dbUser.mitglied_id);

    if (isEltern) {
      /* Der Elternteil selbst hat keine Mitgliedschaft und damit keinen
         Mitgliedtyp — für ihn gibt es keine Matrix, deshalb ein fester Satz.

         Gelesen wird seit Etappe 4 die PERSON: `benutzer.vorname`,
         `nachname` und `telefon` sind gestrichen, die Angaben stehen an
         `personen`. Fehlt die Person (Ladezustand), wird nichts verlangt —
         ein leerer Zustand darf keinen Hinweis auslösen. */
      const fehlend: string[] = [];
      if (eigenePerson) {
        if (!eigenePerson.vorname?.trim())  fehlend.push(FELD_LABEL.vorname);
        if (!eigenePerson.nachname?.trim()) fehlend.push(FELD_LABEL.nachname);
        if (!eigenePerson.telefon?.trim())  fehlend.push(FELD_LABEL.telefon);
      }

      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      /* Die Kinder sind Mitglieder — für sie greift die Matrix ihres
         Mitgliedtyps, statt wie früher pauschal Geburtsdatum,
         Nationalität und Adresse zu verlangen. */
      kinder.forEach(kind => {
        for (const label of fehlendeFelder(kind)) {
          fehlend.push(`${kind.vorname}: ${label}`);
        }
      });
      return fehlend;
    }

    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id);
    if (!raw) return [];
    return fehlendeFelder(raw);
  }

  function sollProfilPruefen(): boolean {
    if (!dbUser || role === 'administrator' || role === 'administration') return false;
    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id) || null;
    const sechsMonate = new Date();
    sechsMonate.setMonth(sechsMonate.getMonth() - 6);
    const eigenesGeprueft = raw?.profil_geprueft_at || dbUser.profil_geprueft_at;
    if (!eigenesGeprueft) return true;
    if (new Date(eigenesGeprueft) < sechsMonate) return true;
    if (role === 'eltern') {
      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      for (const kind of kinder) {
        if (!kind.profil_geprueft_at) return true;
        if (new Date(kind.profil_geprueft_at) < sechsMonate) return true;
      }
    }
    return false;
  }

  async function markiereProfilGeprueft(): Promise<void> {
    if (!sb || !dbUser) return;
    const now = new Date().toISOString();
    await sb.from('benutzer').update({ profil_geprueft_at: now }).eq('id', dbUser.id);
    if (role === 'eltern') {
      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      for (const kind of kinder) {
        await sb.from('mitglieder').update({ profil_geprueft_at: now }).eq('id', kind.id);
      }
    }
    setDbUser(u => u ? { ...u, profil_geprueft_at: now } : u);
  }

  return { getProfilFehlend, sollProfilPruefen, markiereProfilGeprueft };
}
