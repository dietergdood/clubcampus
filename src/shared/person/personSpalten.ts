/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/personSpalten.ts

   Die Spalten, die einer PERSON gehören — für jede Liste, die
   Personen zeigt: Mitglieder, Eltern, Supporter, Archiv.

   ⚠ WARUM ES DIESE DATEI GIBT. Von den 28 Spalten der Mitgliederliste
   hängen nur 8 an einer MITGLIEDSCHAFT (Mitgliedtyp, Eintritt,
   Spielerpass, Fairgate-ID, J+S-Nr. direkt in `mitglieder`; Teams,
   Kaderrolle und „Teams & Kaderrollen" über `kader.mitglied_id`).
   Die anderen 20 gelten für JEDE Person — auch für einen Supporter, der
   nie Mitglied war. Sie in jeder Liste neu zu deklarieren hiesse,
   dieselbe Sache dreimal zu pflegen; die Elternliste hat genau das
   getan und deshalb acht eigene Spalten statt zwanzig geerbter.

   ⚠ HIER STEHEN NUR SCHLUESSEL UND BESCHRIFTUNG — die IDENTITAET der
   Spalte. `default`, `hidden` und `alwaysOn` bleiben bei der Liste:
   „Mitgliedschaft" ist in der Mitgliederliste vorgegeben und im
   Supporter-Tab gar nicht vorhanden, „Portal-Zugang" ist überall dabei.
   Wer die Vorgaben hierher zöge, müsste sie für den Sonderfall wieder
   überschreiben — und hätte zwei Orte statt einem.

   ⚠ DIE SCHLUESSEL SIND NICHT FREI AENDERBAR. `mitglieder_ansichten.
   spalten` speichert sie als Text. Wird einer umbenannt, verliert
   jede gespeicherte Ansicht diese Spalte — STILL: eine Spalte ohne
   Definition wird beim Rendern übersprungen, ohne Fehler und ohne
   Meldung. Die Ansicht sieht danach aus, als hätte der Nutzer sie so
   angelegt. Deshalb hält `memberConstants.test.ts` die 28 Schlüssel
   der Mitgliederliste namentlich fest.
   ═══════════════════════════════════════════════════════════════ */
import type { ColDef, ColGroup } from "../list/types.ts";

/**
 * Schlüssel → Beschriftung, für alles, was an der Person hängt.
 *
 * Die Reihenfolge ist die der Mitgliederliste und damit die gewohnte;
 * wer eine andere braucht, zählt seine Schlüssel selbst auf.
 */
export const PERSON_SPALTEN = {
  /* Personendaten */
  name:            "Name",
  nachname:        "Nachname",
  vorname:         "Vorname",
  geburtsdatum:    "Geburtsdatum",
  alter:           "Alter",
  geschlecht:      "Geschlecht",
  nationalitaet:   "Nationalität",
  nationalitaet2:  "Nationalität 2",
  heimatort:       "Heimatort",
  ahv_nr:          "AHV-Nr.",
  /* Kontakt */
  email:           "E-Mail",
  telefon:         "Telefon",
  strasse:         "Strasse",
  ort:             "PLZ/Ort",
  /* Zugang — hängt seit Etappe 4 an `benutzer.person_id`, nicht am Mitglied */
  rollen:          "Portalrolle",
  portal:          "Portal-Zugang",
  /* ⚠ Ohne Umlaut, und das bleibt so: der Schlüssel heisst `datenpruefung`,
     die Beschriftung ist seit jeher „Datenpruefung". Sie hier zu verschönern
     wäre eine sichtbare Änderung ohne Auftrag. */
  datenpruefung:   "Datenpruefung",
  /* Vereinsfunktionen — `personen.funktionen`, nicht `mitglieder.funktionen`
     (siehe PERSON_FELDER). Nicht zu verwechseln mit Kaderrollen. */
  funktionen_gruppen: "Funktionen",
  funktionen:      "Vereinsfunktionen",
  funktionsgruppen: "Funktionsgruppe",
} as const;

export type PersonSpalteKey = keyof typeof PERSON_SPALTEN;

/** Ist dieser Schlüssel eine Personenspalte? */
export function istPersonSpalte(key: string): key is PersonSpalteKey {
  return key in PERSON_SPALTEN;
}

/**
 * Eine Spaltendefinition aus dem Katalog, mit den Vorgaben DIESER Liste.
 *
 * `spalte("ort", { default: true })` — die Beschriftung kommt aus dem
 * Katalog, alles andere von der Liste.
 */
export function spalte(
  key: PersonSpalteKey, flags: Omit<ColDef, "key" | "label"> = {},
): ColDef {
  return { key, label: PERSON_SPALTEN[key], ...flags };
}

/** Mehrere auf einmal, mit gemeinsamen Vorgaben. */
export function spalten(
  keys: readonly PersonSpalteKey[], flags: Omit<ColDef, "key" | "label"> = {},
): ColDef[] {
  return keys.map(k => spalte(k, flags));
}

/**
 * Eine Spaltengruppe für die Auswahl im Spalten-Panel.
 *
 * `flagsProKey` überschreibt die gemeinsamen Vorgaben für einzelne
 * Schlüssel — so bleibt „Name" `alwaysOn`, während der Rest es nicht ist.
 */
export function personGruppe(
  group: string,
  keys: readonly PersonSpalteKey[],
  flags: Omit<ColDef, "key" | "label"> = {},
  flagsProKey: Partial<Record<PersonSpalteKey, Omit<ColDef, "key" | "label">>> = {},
): ColGroup {
  return { group, cols: keys.map(k => spalte(k, { ...flags, ...flagsProKey[k] })) };
}
