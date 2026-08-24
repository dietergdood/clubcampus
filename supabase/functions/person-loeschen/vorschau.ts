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

/**
 * Was aus einem Kind wird, dessen Elternteil geloescht wird.
 *
 * ⚠ EINE ZAHL IST KEINE FOLGE. Die Aufstellung sagt
 * `Verknuepfungen zu Kindern 1` — sie sagt NICHT, ob das Kind danach noch
 * einen Elternteil hat. Beide Faelle sehen in der Zahl gleich aus, und der
 * Unterschied ist der ganze Punkt: „eine von zwei Verknuepfungen faellt" ist
 * Alltag, „das Kind bleibt ohne Elternteil" ist ein Grund, innezuhalten.
 *
 * Gefragt am 23.08.2026 von Didi, bevor der erste scharfe Lauf lief — und die
 * Vorschau konnte es damals nicht beantworten.
 */
export interface KindFolge {
  mitglied_id: number;
  name: string;
  /** Wie viele Elternteile das Kind NACH dem Loeschen noch hat. */
  verbleibende_eltern: number;
  /** War der fallende Eintrag der Hauptkontakt? Dann fehlt danach einer. */
  war_hauptkontakt: boolean;
  /**
   * Braucht dieses Kind ueberhaupt einen Elternkontakt?
   *
   * ⚠ HIER STEHT DIE ENTSCHEIDUNG, NICHT IHR ROHSTOFF. Es waere naheliegend,
   * `mitgliedtyp` zurueckzugeben und die Maske nachschlagen zu lassen, ob dieser
   * Typ `hauptkontakt_pflicht` hat. Das waere eine ZWEITE Rechnung neben der,
   * die hier schon laeuft — und zwei Stellen, die dieselbe Frage beantworten,
   * laufen still auseinander. (Im Projekt heute dreimal belegt: Portalrolle,
   * Pflichtfelder, Portal-Zugang.)
   *
   * Die Function laeuft mit `service_role` und sieht `mitgliedtypen`
   * vollstaendig; die Maske sieht es je nach Rolle nicht. Die Entscheidung
   * gehoert deshalb ohnehin hierher.
   *
   * Zwei Bedingungen, beide gemessen am 25.08.2026:
   *   · Die Mitgliedschaft ist AKTIV. Bei einem ausgetretenen Kind ist „ohne
   *     Kontakt" kein Problem, sondern das Ziel — sonst verlangte die Regel
   *     einen Erreichbaren fuer jemanden, der den Verein verlassen hat. Im
   *     Bestand betrifft das zwei Kinder (Andrea Furrer, Andrea Frei), beide
   *     mit genau einem Elternteil: ohne diese Bedingung waeren deren
   *     Elternteile DAUERHAFT unloeschbar.
   *   · Der Mitgliedtyp hat `hauptkontakt_pflicht`. Das ist das MERKMAL, nicht
   *     der Name — `ilike 'junior%'` haelt nur, bis jemand umbenennt oder einen
   *     zweiten Jugendtyp anlegt.
   *
   * 390 von 399 Verknuepfungen erfuellen beides.
   */
  braucht_kontakt: boolean;
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
  /** Was aus den Kindern wird. Leer, wenn die Person keine hat. */
  kinder: KindFolge[];
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
  kinder: KindFolge[] = [],
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
    kinder,
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
  /* ⚠ DIE KINDER GEHOEREN IN DEN ABDRUCK, und zwar mit der Zahl der
     VERBLEIBENDEN Elternteile — nicht bloss mit ihrer Anzahl. Der Fall, auf
     den es ankommt: die Vorschau sagt „Stefan behaelt einen Elternteil", und
     zwischen Vorschau und Loeschen wird der andere entfernt. Die Zahl der
     Kinder aendert sich dabei NICHT; die Folge kippt von „eine von zwei" auf
     „bleibt ohne". Ohne diese Zeile liefe der Loeschvorgang durch. */
  const kinder = [...v.kinder]
    .sort((a, b) => a.mitglied_id - b.mitglied_id)
    /* ⚠ `braucht_kontakt` GEHOERT MIT IN DEN ABDRUCK. Es entscheidet, ob die
       Sperre greift, und es kann zwischen Vorschau und Loeschen kippen — das
       Kind tritt aus, oder jemand nimmt dem Mitgliedtyp die Kontaktpflicht.
       Beides aendert die Zahl der Eltern NICHT. Ohne diese Stelle liefe eine
       Loeschung durch, die die Vorschau noch gesperrt hatte, und umgekehrt. */
    .map(k => `${k.mitglied_id}:${k.verbleibende_eltern}:${k.braucht_kontakt ? 1 : 0}`).join(",");

  return [
    `person=${v.person.id}`,
    `mitgliedschaften=${v.person.aktive_mitgliedschaften}`,
    `konto=${v.person.hat_konto ? 1 : 0}`,
    `kinder=${kinder}`,
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
