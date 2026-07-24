/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/types.ts
   Gemeinsame Typen der Person*-Komponenten
   ═══════════════════════════════════════════════════════════════ */

/* Die Anzeige-Komponenten bekommen mal ein normalisiertes Person-Objekt
   (domains/person/personTypes), mal eine rohe mitglieder-Zeile. Beide
   Formen erfüllen diese lockere Schnittstelle. */
export interface PersonAnzeige {
  id?: number | string;
  name?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  /* normalisiert bzw. Spaltenname aus der Tabelle */
  fotoUrl?: string | null;
  foto_url?: string | null;
  mitgliedtyp?: string | null;
  rolle?: string | null;
}

/* Sichtbarkeit einzelner Felder je nach Rolle —
   erzeugt von getFieldVisibility (modules/members/memberUtils). */
export interface FieldVisibility {
  showAhv: boolean;
  showGebdat: boolean;
  showAdresse: boolean;
  showTelefon: boolean;
  showEmail: boolean;
  showPass: boolean;
  showFairgateId: boolean;
  showNotizen: boolean;
}

/* Vereinsfunktion mit optionaler Gruppe (portal_funktionen + portal_gruppen) */
export interface FunktionMitGruppe {
  id?: string;
  name: string;
  portal_gruppen?: {
    name?: string | null;
    farbe?: string | null;
  } | null;
}
