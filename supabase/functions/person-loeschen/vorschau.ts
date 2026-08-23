// ClubCampus — supabase/functions/person-loeschen/vorschau.ts
//
// Was beim Loeschen einer Person geschieht — als ZAHLEN, bevor es geschieht.
//
// ⚠ WARUM DIE VORSCHAU HIER LIEGT UND NICHT IM PORTAL. Eine Vorschau, die der
//   Browser rechnet, sieht nur, was RLS ihm zeigt. Das Loeschen laeuft mit
//   `service_role` und sieht alles. Eine Vorschau, die „3 Zeilen" sagt,
//   waehrend 7 fallen, ist SCHLIMMER als keine — sie erzeugt Zutrauen, das
//   nicht gedeckt ist. Beide brauchen dieselbe Sicht, also dieselbe Stelle.
//
// ⚠ UND SIE IST DIE GRUNDLAGE DES FINGERABDRUCKS. Der Loeschvorgang rechnet
//   sie NEU und vergleicht; weichen die Zahlen ab, hat sich seit der Vorschau
//   etwas geaendert und es wird nicht geloescht. Deshalb muss sie
//   deterministisch sein: dieselbe Person, derselbe Bestand, dieselben Zahlen.

/** Eine Zeile der Vorschau. */
export interface Posten {
  tabelle: string;
  anzahl: number;
  /** Eingerueckt darstellen — haengt an der Mitgliedschaft, nicht an der Person. */
  unter?: string;
}

export interface Vorschau {
  person: {
    id: string;
    name: string;
    email: string | null;
    aktive_mitgliedschaften: number;
    hat_konto: boolean;
  };
  /** Faellt mit — die Person ist der Gegenstand dieser Zeilen. */
  faellt: Posten[];
  /** Bleibt, aber ohne Verweis auf die Person (SET NULL). */
  anonym: Posten[];
  /** Haelt das Loeschen auf. Leer = loeschbar. */
  blockiert: Posten[];
  /**
   * ⚠ TABELLEN, DIE DIE VORSCHAU NICHT PRUEFEN KANN.
   *
   * Vier Tabellen fuehren `mitglied_id` als `uuid`, waehrend `mitglieder.id`
   * ein `bigint` ist — ein Join ist unmoeglich, ein Fremdschluessel existiert
   * nicht. Beim Loeschen bliebe dort eine Waise stehen, ohne dass sich etwas
   * beschwert.
   *
   * ⚠ SIE STEHEN AUF DEM SCHIRM, AUCH WENN SIE LEER SIND. Es ist der einzige
   * Punkt, an dem die Vorschau etwas NICHT weiss — und was sie nicht weiss,
   * gehoert sichtbar, nicht in eine Fussnote. (Entscheidung Didi, 23.08.2026.)
   */
  nicht_pruefbar: string[];
  /** Wie viele Tabellen geprueft wurden und leer waren. */
  geprueft_leer: number;
  /** Zahl je Tabelle — die Grundlage des Fingerabdrucks. */
  zahlen: Record<string, number>;
}

/**
 * Tabellen, die `mitglied_id` als `uuid` fuehren, ohne Fremdschluessel.
 * Stand 23.08.2026, alle leer. Siehe CLAUDE.md → „`mitglied_id` ist in VIER
 * Tabellen der falsche Typ — und das ist auch ein Löschproblem".
 */
export const NICHT_PRUEFBAR = [
  "abstimmung_antworten",
  "aufgebote",
  "bus_anmeldungen",
  "material_ausleihen",
] as const;

/**
 * Die Zahlen zu einer Vorschau formen — die Darstellung, nicht die Messung.
 *
 * ⚠ NULLZEILEN WERDEN AUSGEBLENDET, ABER GEZAEHLT. Eine Vorschau mit drei
 * Zeilen sieht sonst aus wie eine, die nur drei Tabellen kennt. Deshalb
 * `geprueft_leer` — „12 weitere Tabellen geprueft, alle leer" ist eine
 * Aussage, stilles Weglassen ist keine. (Entscheidung Didi, 23.08.2026.)
 */
export function formeVorschau(
  person: Vorschau["person"],
  zahlen: Record<string, number>,
  einteilung: { faellt: string[]; anonym: string[]; blockiert: string[] },
  unter: Record<string, string> = {},
): Vorschau {
  const nimm = (keys: string[]): Posten[] =>
    keys
      .filter(k => (zahlen[k] ?? 0) > 0)
      .map(k => ({ tabelle: k, anzahl: zahlen[k], ...(unter[k] ? { unter: unter[k] } : {}) }));

  const alle = [...einteilung.faellt, ...einteilung.anonym, ...einteilung.blockiert];
  const leer = alle.filter(k => (zahlen[k] ?? 0) === 0).length;

  return {
    person,
    faellt: nimm(einteilung.faellt),
    anonym: nimm(einteilung.anonym),
    blockiert: nimm(einteilung.blockiert),
    nicht_pruefbar: [...NICHT_PRUEFBAR],
    geprueft_leer: leer,
    zahlen,
  };
}

/**
 * Der Fingerabdruck — die Grundlage der Signatur.
 *
 * ⚠ ER IST KEINE PRUEFSUMME UEBER DIE DARSTELLUNG, sondern ueber die
 * TATSACHEN: wer, in welchem Verein, mit welchen Zahlen. Aendert sich eine
 * davon zwischen Vorschau und Loeschen, weicht er ab — und genau das ist der
 * Zweck.
 *
 * ⚠ SORTIERT. Die Reihenfolge der Schluessel in einem JS-Objekt ist zwar
 * definiert, haengt aber an der Einfuegereihenfolge; eine Umstellung im Code
 * wuerde sonst jeden offenen Fingerabdruck ungueltig machen, ohne dass sich
 * etwas an den Daten geaendert haette.
 */
export function fingerabdruckDaten(v: Vorschau): string {
  const zahlen = Object.keys(v.zahlen).sort()
    .map(k => `${k}=${v.zahlen[k]}`).join(";");
  return [
    `person=${v.person.id}`,
    `mitgliedschaften=${v.person.aktive_mitgliedschaften}`,
    `konto=${v.person.hat_konto ? 1 : 0}`,
    zahlen,
  ].join("|");
}

/**
 * Was sich seit der Vorschau geaendert hat — in Worten, nicht als „Hash
 * stimmt nicht".
 *
 * ⚠ OHNE DIESE FUNKTION KLICKT DER ADMIN AUF VORSCHAU UND WIEDER AUF
 * LOESCHEN, ohne hinzusehen. Eine Abbruchmeldung, die den Grund nicht nennt,
 * erzieht dazu, sie wegzuklicken. (Anforderung Didi, 23.08.2026.)
 */
export function nenneUnterschiede(alt: string, neu: string): string[] {
  const lies = (s: string): Record<string, string> => {
    const raus: Record<string, string> = {};
    for (const teil of s.split(/[|;]/)) {
      const [k, w] = teil.split("=");
      if (k) raus[k] = w ?? "";
    }
    return raus;
  };
  const a = lies(alt), b = lies(neu);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const raus: string[] = [];
  for (const k of keys) {
    if (a[k] === b[k]) continue;
    raus.push(`${k}: ${a[k] ?? "—"} → ${b[k] ?? "—"}`);
  }
  return raus;
}
