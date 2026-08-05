/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/pflichtfelder.ts

   Einzige Quelle dafür, welche Felder Pflicht sind. Vorher stand das
   an drei Stellen mit drei verschiedenen Vokabularen: in den DB-Matrizen
   (`adresse`, `vorname_nachname`), im NeuesMitgliedModal (`strasse`,
   `plz`, `ort` — plus einer fest verdrahteten Rückfallliste) und in
   getProfilCheck (komplett fest verdrahtet). Ein Mitglied konnte
   dadurch beim Anlegen gültig sein und in der Datenprüfung sofort
   unvollständig.

   Seit der Migration vom 05.08.2026 führen beide Matrizen dieselben
   feinen Feldnamen wie das Formular — es gibt keine Übersetzung mehr.

   KEINE RÜCKFALLLISTE. Was in der Matrix steht, gilt. Früher galt:
   kein Häkchen gesetzt → feste Basisliste. Damit liess sich „nichts ist
   Pflicht" gar nicht ausdrücken, und alle Häkchen wegzunehmen verlangte
   plötzlich mehr als vorher.
   ═══════════════════════════════════════════════════════════════ */
import type { MitgliedtypPflichtfeld } from "../../types.ts";

/* Ein Eintrag der Rollen-Matrix (`rolle_pflichtfelder`). */
export interface RollePflichtfeld {
  rolle: string;
  feld: string;
  pflicht: boolean | null;
  verein_id?: string | null;
}

/* Felder, die die Mitgliedtyp-Matrix in der Portalverwaltung anbietet.
   Reihenfolge = Reihenfolge der Zeilen in der Tabelle. */
export const FELDER_TYP = [
  "geburtsdatum", "geschlecht", "strasse", "plz", "ort",
  "telefon", "email", "ahv_nr", "nationalitaet", "heimatort",
] as const;

/* Zusatzfelder der Rollen-Matrix. Sie greifen NUR in der Datenprüfung,
   nicht beim Anlegen: dort steht erst die Portalrolle fest, die
   sportliche Rolle kommt später übers Kader. */
export const FELDER_ROLLE = [
  "geburtsdatum", "strasse", "plz", "ort", "telefon",
  "ahv_nr", "spielerpass", "js_nr", "fairgate_id",
] as const;

/* Immer Pflicht, unabhängig von jeder Konfiguration — in `mitglieder`
   sind beide NOT NULL. Deshalb stehen sie nicht in der Matrix: ein
   Häkchen, das sich nicht wegnehmen lässt, wäre eine Lüge in der
   Oberfläche. */
export const IMMER_PFLICHT = ["vorname", "nachname"] as const;

export interface PflichtfelderOptionen {
  mitgliedtyp: string | null | undefined;
  /** Weglassen = nur die Mitgliedtyp-Matrix (so beim Anlegen). */
  rolle?: string | null;
  typMatrix: MitgliedtypPflichtfeld[];
  rolleMatrix?: RollePflichtfeld[];
}

/**
 * Liefert die Pflichtfelder für einen Mitgliedtyp, optional ergänzt um
 * die Zusatzfelder seiner Rolle. Ohne Mitgliedtyp leer.
 *
 * `vorname`/`nachname` sind NICHT enthalten — siehe IMMER_PFLICHT.
 */
export function getEffektivePflichtfelder(
  { mitgliedtyp, rolle, typMatrix, rolleMatrix }: PflichtfelderOptionen,
): string[] {
  if (!mitgliedtyp) return [];

  const felder = new Set<string>();

  for (const p of typMatrix) {
    if (p.mitgliedtyp === mitgliedtyp && p.pflicht) felder.add(p.feld);
  }
  if (rolle && rolleMatrix) {
    for (const p of rolleMatrix) {
      if (p.rolle === rolle && p.pflicht) felder.add(p.feld);
    }
  }

  /* Feste Reihenfolge, damit die Fehlermeldung im Formular nicht von der
     Zeilenreihenfolge der Datenbank abhängt. Unbekannte Felder hinten
     anhängen statt verschlucken — sie sollen auffallen. */
  const bekannt = [...FELDER_TYP, ...FELDER_ROLLE] as readonly string[];
  return [...felder].sort((a, b) => {
    const ia = bekannt.indexOf(a), ib = bekannt.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * True, wenn für diesen Mitgliedtyp überhaupt nichts konfiguriert ist.
 * Die Portalverwaltung weist darauf hin — ohne Rückfallliste wäre sonst
 * stillschweigend nichts Pflicht.
 */
export function istMatrixLeer(
  mitgliedtyp: string,
  typMatrix: MitgliedtypPflichtfeld[],
): boolean {
  return !typMatrix.some(p => p.mitgliedtyp === mitgliedtyp && p.pflicht);
}
