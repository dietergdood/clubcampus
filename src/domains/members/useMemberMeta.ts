/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/useMemberMeta.ts
   Hook für berechnete Mitglieder-Metadaten
   Wiederverwendbar in MitgliederModul, KaderModul etc.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { FunktionMitGruppe } from "../../shared/person/types.ts";
import type { KaderRolle, PortalRolle } from "../../types.ts";

/* Verengung von PortalRolle — Name und Beschriftung, mehr braucht die UI
   nicht. Nicht mit den Kaderrollen verwechseln (KaderRolleMitTrainerFlag). */
export type PortalRolleOption = Pick<PortalRolle, "name" | "label">;

/* Verengung von KaderRolle: hier zaehlt nur, ob es eine Trainerrolle ist.
   Eigener Name, weil memberMapper eine andere Verengung derselben Tabelle
   fuehrt (mit label statt ist_trainer) — gleiche Namen waeren verwechselbar. */
export type KaderRolleMitTrainerFlag = Pick<KaderRolle, "name"> & {
  ist_trainer?: boolean | null;
};

export function useMemberMeta(
  dbPortalRollen: PortalRolleOption[] = [],
  dbKaderRollen: KaderRolleMitTrainerFlag[] = [],
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
