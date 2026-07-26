/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/useMemberMeta.ts
   Hook für berechnete Mitglieder-Metadaten
   Wiederverwendbar in MitgliederModul, KaderModul etc.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { FunktionMitGruppe } from "../../shared/person/types.ts";

export interface PortalRolleOption {
  name: string;
  label: string;
}

export interface KaderRolleOption {
  name: string;
  ist_trainer?: boolean | null;
}

export function useMemberMeta(
  dbPortalRollen: PortalRolleOption[] = [],
  dbKaderRollen: KaderRolleOption[] = [],
  portalFunktionen: FunktionMitGruppe[] = [],
) {
  const ROLLE_LABEL = useMemo<Record<string, string>>(() => Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name, r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]), [dbPortalRollen]);

  const TRAINER_KEYS = useMemo<string[]>(() =>
    dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name),
  [dbKaderRollen]);

  const funktionenGruppenMap = useMemo<Record<string, string | null>>(() =>
    Object.fromEntries((portalFunktionen||[]).map(f=>[f.name, f.portal_gruppen?.name||null])),
  [portalFunktionen]);

  return { ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap };
}
