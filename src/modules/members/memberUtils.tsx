/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberUtils.tsx
   Mitglieder-spezifische Helpers
   ═══════════════════════════════════════════════════════════════ */
import { FELD_REGISTRY, istSichtbar } from "../../domains/members/feldkonfig.ts";
import type { FeldModus } from "../../domains/members/feldkonfig.ts";
import type { FieldVisibility, Sichtbarkeit } from "../../shared/person/types.ts";

interface RoleInfo {
  label: string;
  level: number;
}

const ROLES: Record<string, RoleInfo> = {
  administrator: { label:"Administrator", level:7 },
  vorstand:      { label:"Vorstand",      level:6 },
  administration:{ label:"Administration",level:5 },
  funktionaer:   { label:"Funktionär",    level:4 },
  trainer:       { label:"Trainer",       level:3 },
  spieler:       { label:"Spieler",       level:2 },
  eltern:        { label:"Eltern",        level:1 },
};

/**
 * Wer darf welches Feld bei ANDEREN sehen. `role` ist die Rolle des
 * BETRACHTERS, nicht die des angezeigten Mitglieds.
 *
 * Bleibt bewusst bestehen. Sie beantwortet eine andere Frage als die
 * Mitgliedtyp-Konfiguration (`domains/members/feldkonfig.ts`): dort geht
 * es darum, was es bei diesem Mitgliedtyp überhaupt GIBT, hier darum,
 * wer es sehen darf. Die Rollen-Sichtbarkeit bekommt später eine eigene
 * Seite — sie wartet auf die Gruppenrechte, weil eine Matrix auf
 * Rollennamen sonst eine Rollenleiter zementiert, die nicht passt
 * (`docs/auftrag_rls_gruppenrechte.md`).
 */
export function getFieldVisibility(role: string): FieldVisibility {
  const lvl = ROLES[role]?.level || 0;
  return {
    /* AHV nur fuer die Verwaltungsrollen. (Frueher `lvl>=5 && role===
       "administration" || role==="administrator"` — der lvl-Teil war
       redundant, da nur administration lvl 5 hat; Ergebnis unveraendert.) */
    showAhv:        role === "administration" || role === "administrator",
    showGebdat:     lvl >= 3,
    showAdresse:    lvl >= 5,
    showTelefon:    lvl >= 3,
    showEmail:      lvl >= 2,
    showPass:       lvl >= 3,
    showFairgateId: lvl >= 5,
    showNotizen:    lvl >= 5,
  };
}

/* Welcher Rollen-Schalter für welchen Registry-Schlüssel gilt. Was hier
   nicht steht, ist von der Rolle nicht eingeschränkt — Name, Geschlecht,
   Nationalität, Heimatort, Mitgliedtyp, Eintritt, Teams, Funktionen und
   die Tabs waren es noch nie.

   Drei Schalter waren bisher DOPPELT belegt: `showPass`, `showFairgateId`
   und `showNotizen` regelten zugleich, wer es sehen darf UND ob es das
   Feld bei diesem Mitglied überhaupt gibt. Die zweite Bedeutung hat jetzt
   „Gibt es nicht"; hier bleibt nur der Rollen-Anteil. */
const ROLLEN_SCHALTER: Record<string, keyof FieldVisibility> = {
  geburtsdatum: "showGebdat",
  ahv_nr:       "showAhv",
  email:        "showEmail",
  telefon:      "showTelefon",
  strasse:      "showAdresse",
  plz:          "showAdresse",
  ort:          "showAdresse",
  kanton:       "showAdresse",
  spielerpass:  "showPass",
  js_nr:        "showPass",
  fairgate_id:  "showFairgateId",
  notizen:      "showNotizen",
};

/**
 * Die endgültige Sichtbarkeit je Schlüssel: Mitgliedtyp-Konfiguration UND
 * Rolle des Betrachters.
 *
 * ⚠ Die Reihenfolge ist die Aussage. **„Gibt es nicht" gewinnt gegen jede
 * Rolle, auch gegen die Verwaltung** — sonst wäre der Wert nicht das, was
 * sein Name sagt. Die Gegenrichtung bleibt bestehen: ein Trainer sieht die
 * AHV-Nummer weiterhin nicht, auch wenn sie beim Mitgliedtyp freiwillig ist.
 */
export function getSichtbarkeit(
  role: string,
  konfig: Record<string, FeldModus>,
): Sichtbarkeit {
  const fv = getFieldVisibility(role);
  const sicht: Sichtbarkeit = {};
  for (const e of FELD_REGISTRY) {
    const schalter = ROLLEN_SCHALTER[e.schluessel];
    const darfRolle = schalter ? fv[schalter] : true;
    sicht[e.schluessel] = istSichtbar(konfig, e.schluessel) && darfRolle;
  }
  return sicht;
}
