/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personService.ts
   Etappe 2b des Personen-Umbaus: die flache Fassade.

   Ab hier lesen die Services per Join über `mitglieder` und
   `personen`, liefern aber weiterhin EINE FLACHE ZEILE. Das ist
   keine Bequemlichkeit — es ist der Grund, warum der Umbau in
   Etappen möglich ist:

     - memberMapper, memberFilter, memberGrouping, memberExportUtils
       und MemberListCell bleiben unberührt.
     - Die gespeicherten Ansichten in `mitglieder_ansichten` bleiben
       gültig. Deren spalten/filter/gruppierung/sortierung sind JSONB
       mit Feld-Keys und NUTZERDATEN. Eine verschachtelte Rückgabe
       ({person:{…}}) oder umbenannte Keys würden sie still brechen:
       kein Fehler, nur eine plötzlich leere Spalte.

   `personen` IST DIE WAHRHEIT. Die gleichnamigen Spalten in
   `mitglieder` sind ab Etappe 2b Altlast: Sie werden nicht mehr
   beschrieben und verschwinden in Etappe 6. Wer sie noch liest,
   bekommt veraltete Werte.

   WARUM DIE FASSADE IN TYPESCRIPT LIEGT UND NICHT ALS SQL-SICHT:
   Sortiert und gefiltert wird im Browser (memberFilter), nicht in
   der Datenbank — die Abfrage lädt alle aktiven Mitglieder. Es
   genügt deshalb, die Zeile einmal hier flach zu machen; alles
   danach arbeitet auf flachen Objekten. Eine Sicht wäre eine zweite
   Definition derselben Form in SQL, die mitgezogen werden müsste,
   und brächte das `security_invoker`-Risiko mit (ohne diese Angabe
   umgeht eine Sicht die RLS vollständig).
   Sobald serverseitig seitenweise geladen wird — bei 900 Mitgliedern
   unnötig, bei 5000 nicht —, müsste die Datenbank sortieren und eine
   Sicht wäre klar besser. Weil die Fassade an genau dieser Stelle
   sitzt, ist der Wechsel dann billig.
   ═══════════════════════════════════════════════════════════════ */

import type { SbClient } from '../../types.ts';
import type { Tables } from '../../database.types.ts';

/* Felder, die an der Person hängen. Massgeblich für Lesen UND
   Schreiben — verteileFelder() richtet sich nach derselben Liste. */
export const PERSON_FELDER = [
  "vorname", "nachname", "email", "telefon",
  "strasse", "plz", "ort", "kanton", "land",
  "geburtsdatum", "geschlecht",
  "nationalitaet", "nationalitaet2", "heimatort",
  "ahv_nr", "foto_url", "funktionen", "profil_geprueft_at",
  /* ⚠ Muss hier stehen, sonst erreicht der Vermerk die Oberflaeche nie:
     `flacheZeile()` kopiert NUR, was in dieser Liste steht — ein Feld, das
     `personen(*)` zwar liefert, aber hier fehlt, kaeme in `raw` schlicht
     nicht an. Kein Fehler, keine Meldung, nur ein Feld, das immer leer
     aussieht. (23.08.2026.) */
  "offene_punkte",
] as const;

export type PersonFeld = (typeof PERSON_FELDER)[number];

const PERSON_FELDER_SET: ReadonlySet<string> = new Set(PERSON_FELDER);

/* Select-Ausdruck für alle Lesepfade auf `mitglieder`.
   `person_id` ist nullable, PostgREST macht daraus einen Left Join —
   `personen` kann also null sein. Das ist gewollt, siehe flacheZeile(). */
export const MITGLIED_SELECT = "*, personen(*)";

type Zeile = Record<string, unknown>;

interface JoinZeile extends Zeile {
  personen?: Zeile | null;
}

/**
 * Macht aus einer Join-Zeile eine flache Mitgliederzeile.
 *
 * Reihenfolge ist entscheidend: Erst die Mitgliedschaft, dann die
 * Personenfelder darüber — `personen` ist die Wahrheit und muss die
 * Altspalten in `mitglieder` überschreiben.
 *
 * `id` bleibt IMMER die Mitglieds-Id (bigint). Daran hängt alles:
 * kader.mitglied_id, eltern_kinder.mitglied_id, benutzer.mitglied_id,
 * die Notizen, der Verlauf und jeder Aufruf im Portal. Die Id der
 * Person kommt zusätzlich als `person_id` mit.
 */
export function flacheZeile<T extends JoinZeile>(zeile: T | null): Zeile | null {
  if (!zeile) return null;
  const { personen, ...mitgliedschaft } = zeile;
  const flach: Zeile = { ...mitgliedschaft };

  /* Fehlt die Person, bleiben die Altspalten aus `mitglieder` stehen.
     Das betrifft Mitglieder, die nach Etappe 1 angelegt wurden, als
     NeuesMitgliedModal noch keine Person erzeugt hat — sie sollen
     nicht still aus der Liste verschwinden. */
  if (personen) {
    for (const feld of PERSON_FELDER) {
      if (feld in personen) flach[feld] = personen[feld];
    }
    flach.person_id = personen.id;
  }
  return flach;
}

/** Dasselbe für eine Liste. */
export function flacheZeilen<T extends JoinZeile>(zeilen: T[] | null | undefined): Zeile[] {
  return (zeilen || []).map(z => flacheZeile(z)).filter((z): z is Zeile => z !== null);
}

export interface VerteilteFelder {
  person: Zeile;
  mitgliedschaft: Zeile;
}

/**
 * Teilt ein flaches Änderungsobjekt auf die zwei Tabellen auf.
 *
 * Die Oberflächen (InfoTab, Datenprüfung, Inline-Bearbeitung) kennen
 * nur flache Felder und sollen es auch bleiben — die Zuordnung gehört
 * hierher, nicht in fünf Formulare.
 */
export function verteileFelder(fields: Zeile): VerteilteFelder {
  const person: Zeile = {};
  const mitgliedschaft: Zeile = {};
  for (const [key, wert] of Object.entries(fields)) {
    if (PERSON_FELDER_SET.has(key)) person[key] = wert;
    else mitgliedschaft[key] = wert;
  }
  return { person, mitgliedschaft };
}

/** Trägt das Objekt überhaupt Personenfelder? */
export function hatPersonFelder(fields: Zeile): boolean {
  return Object.keys(fields).some(k => PERSON_FELDER_SET.has(k));
}

/* Eine Person direkt lesen — ohne Mitgliedschaft.

   Gebraucht seit Etappe 3 fuer Elternteile: sie haben ein Konto
   (`benutzer.person_id`), aber nicht zwingend eine Mitgliedschaft, und
   fallen deshalb durch jeden Lesepfad, der ueber `mitglieder` geht. */
/**
 * Eine Person lesen.
 *
 * ⚠ GIBT DEN FEHLER MIT ZURUECK, und das ist der Punkt. Frueher lieferte sie
 * bei einem Fehler dasselbe wie bei „nicht gefunden": `null`. Der Aufrufer in
 * `clubcampus.tsx` hatte darauf ein `if (!person) return;` — und damit wurde
 * aus einem gescheiterten Lesevorgang ein Ladezustand, der nie endet. Die
 * Oberflaeche stand auf „Profil wird geladen…", ohne Meldung, ohne Ende.
 *
 * Bei RLS ist das der Normalfall und nicht die Ausnahme: eine gesperrte Zeile
 * kommt als leeres Ergebnis, nicht als Fehler. „Nicht gefunden" und „nicht
 * gezeigt" sehen von hier aus gleich aus — beides ist `person: null`, und der
 * Aufrufer muss es aussprechen statt es zu verschweigen.
 */
export async function fetchPerson(
  sb: SbClient, personId: string,
): Promise<{ person: Tables<'personen'> | null; fehler: string | null }> {
  const { data, error } = await sb.from('personen')
    .select('*')
    .eq('id', personId)
    .maybeSingle();
  if (error) {
    console.error('fetchPerson error:', error);
    return { person: null, fehler: error.message };
  }
  return { person: data, fehler: null };
}

/* Eine Person direkt schreiben — ohne Mitgliedschaft.

   `updateMitglied()` ist der Weg fuer alle, die eine haben: es nimmt flache
   Felder entgegen, teilt sie mit `verteileFelder()` auf und findet die Person
   ueber `mitglieder.person_id`. Ein Supporter hat diesen Einstieg nicht.

   ⚠ Felder, die zur MITGLIEDSCHAFT gehoeren, werden hier nicht still
   verschluckt, sondern gemeldet. Ohne diese Pruefung landete ein
   `mitgliedtyp` im Aufruf als stiller Nulleffekt — dieselbe Sorte Fehler wie
   ein leerer catch: es sieht aus, als sei nichts zu tun gewesen. */
export async function updatePerson(
  sb: SbClient, personId: string, fields: Zeile,
): Promise<boolean> {
  const { person, mitgliedschaft } = verteileFelder(fields);

  const fremd = Object.keys(mitgliedschaft);
  if (fremd.length > 0) {
    console.error(
      `updatePerson: ${fremd.join(', ')} gehören zur Mitgliedschaft, nicht zur Person. ` +
      `Diese Person hat keine — der Aufruf wird nicht ausgeführt.`);
    return false;
  }
  if (Object.keys(person).length === 0) return true;

  const { error } = await sb.from('personen')
    .update({ ...person, updated_at: new Date().toISOString() })
    .eq('id', personId);
  if (error) console.error('updatePerson error:', error);
  return !error;
}
