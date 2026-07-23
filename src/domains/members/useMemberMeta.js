/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/useMemberMeta.js
   Hook für berechnete Mitglieder-Metadaten
   Wiederverwendbar in MitgliederModul, KaderModul etc.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from "react";

export function useMemberMeta(dbPortalRollen=[], dbKaderRollen=[], portalFunktionen=[]) {
  const ROLLE_LABEL = useMemo(() => Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name, r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]), [dbPortalRollen]);

  const TRAINER_KEYS = useMemo(() =>
    dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name),
  [dbKaderRollen]);

  const funktionenGruppenMap = useMemo(() =>
    Object.fromEntries((portalFunktionen||[]).map(f=>[f.name, f.portal_gruppen?.name||null])),
  [portalFunktionen]);

  return { ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap };
}
