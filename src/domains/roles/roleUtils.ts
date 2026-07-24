/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/roles/roleUtils.ts
   Rollen-Ableitung — eine Wahrheit für alle Module
   ═══════════════════════════════════════════════════════════════ */
import type { Sb, Rolle } from '../../types.js';

export interface KaderRolleDb {
  name: string;
  ist_trainer: boolean;
  label?: string;
  aktiv?: boolean;
  sort_order?: number;
}

/** Priorität der Portal-Rollen (höchste zuerst) */
export const ROLLE_PRIORITAET: Rolle[] = [
  'administrator',
  'administration',
  'funktionaer',
  'trainer',
  'spieler',
  'eltern',
  'supporter',
];

/** Label-Mapping für Rollen */
export const ROLLE_LABEL: Record<Rolle, string> = {
  administrator:  'Administrator',
  administration: 'Verwaltung',
  funktionaer:    'Funktionär',
  trainer:        'Trainer/in',
  spieler:        'Spieler/in',
  eltern:         'Elternteil',
  supporter:      'Unterstützer',
};

export async function ableitRolle(
  sb: Sb,
  mitgliedId: number,
  dbKaderRollen: KaderRolleDb[] = [],
  mitgliedtyp: string | null = null,
  funktionen: unknown[] = []
): Promise<Rolle> {
  if (!sb || !mitgliedId) return 'supporter';

  const TRAINER_ROLLEN = dbKaderRollen
    .filter(r => r.ist_trainer)
    .map(r => r.name);

  const { data: kaderData } = await sb
    .from('kader')
    .select('rollen')
    .eq('mitglied_id', mitgliedId)
    .eq('aktiv', true);

  if (kaderData && kaderData.length > 0) {
    /* kader.rollen ist in der DB nullable — || [] fängt das ab.
       Keine Inline-Annotation mehr: der generierte Typ ist genauer. */
    const alleRollenNamen: string[] = kaderData.flatMap(k => k.rollen || []);
    const hatTrainer = alleRollenNamen.some(r => TRAINER_ROLLEN.includes(r));
    if (hatTrainer) return 'trainer';

    const kaderRollenMapped: Rolle[] = alleRollenNamen.map(r => {
      const kr = dbKaderRollen.find(k => k.name === r);
      return kr?.ist_trainer ? 'trainer' : 'spieler';
    });
    const hoechste = ROLLE_PRIORITAET.find(p => kaderRollenMapped.includes(p));
    if (hoechste) return hoechste;
  }

  if (mitgliedtyp) {
    const { data: typData } = await sb
      .from('mitgliedtypen')
      .select('standard_rolle')
      .eq('name', mitgliedtyp)
      .maybeSingle();

    const stdRolle = typData?.standard_rolle;
    /* Vergleich statt includes(): narrowt stdRolle auf die Rolle-Union */
    if (stdRolle === 'spieler' || stdRolle === 'trainer') return stdRolle;
    if (funktionen && funktionen.length > 0) return 'funktionaer';
    /* portal_rollen ist pro Verein konfigurierbar, standard_rolle daher ein
       freier String. Der Wert wird unverändert durchgereicht (bisheriges
       Verhalten); er muss nicht zwingend in der Rolle-Union enthalten sein. */
    if (stdRolle) return stdRolle as Rolle;
  }

  if (funktionen && funktionen.length > 0) return 'funktionaer';
  return 'supporter';
}

export async function saveRolle(sb: Sb, mitgliedId: number, neueRolle: Rolle): Promise<void> {
  if (!sb || !mitgliedId) return;
  await sb.from('mitglieder').update({ rolle: neueRolle }).eq('id', mitgliedId);
  const { data: benutzer } = await sb
    .from('benutzer')
    .select('id')
    .eq('mitglied_id', mitgliedId)
    .maybeSingle();
  if (benutzer?.id) {
    await sb.from('benutzer').update({ role: neueRolle }).eq('id', benutzer.id);
  }
}

export async function ableitUndSaveRolle(
  sb: Sb,
  mitgliedId: number,
  dbKaderRollen: KaderRolleDb[],
  mitgliedtyp: string | null,
  funktionen: unknown[]
): Promise<Rolle> {
  const neueRolle = await ableitRolle(sb, mitgliedId, dbKaderRollen, mitgliedtyp, funktionen);
  await saveRolle(sb, mitgliedId, neueRolle);
  return neueRolle;
}
