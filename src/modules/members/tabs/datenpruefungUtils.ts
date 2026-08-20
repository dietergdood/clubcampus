import { KANTONE } from "../../../domains/person/personUtils.ts";
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/datenpruefungUtils.ts
   Gemeinsame Konstanten für DatenpruefungSpieler + DatenpruefungEltern
   ═══════════════════════════════════════════════════════════════ */

/* Abgeleitet, nicht wiederholt: die Liste steht in
   `domains/person/personUtils.ts`. Der Alias bleibt, damit die drei
   bestehenden Aufrufstellen unveraendert weiterlaufen. */
export const KANTON_OPTS: readonly string[] = KANTONE;
