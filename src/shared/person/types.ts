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

/* Endgültige Sichtbarkeit je Feld-Schlüssel: Mitgliedtyp-Konfiguration
   UND Rolle des Betrachters, verknüpft von getSichtbarkeit()
   (modules/members/memberUtils). Die Schlüssel sind die der Registry
   in domains/members/feldkonfig.ts — `geburtsdatum`, `ahv_nr`, `teams`, …

   Bewusst ein Record und keine Liste benannter Flags: die Registry wächst,
   und ein zweites Vokabular (`showGebdat` neben `geburtsdatum`) hat sich
   als Quelle von Missverständnissen erwiesen — drei der acht alten Flags
   bedeuteten zwei verschiedene Dinge gleichzeitig. */
export type Sichtbarkeit = Record<string, boolean>;

/* Nur der Rollen-Anteil — erzeugt von getFieldVisibility. Beantwortet
   "wer sieht was bei ANDEREN" und wird von getSichtbarkeit mit der
   Mitgliedtyp-Konfiguration verknüpft. Nicht direkt in Komponenten
   verwenden. */
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
  /* portal_funktionen.id ist bigint — war hier faelschlich string */
  id?: number;
  name: string;
  portal_gruppen?: {
    name?: string | null;
    farbe?: string | null;
  } | null;
}
