/* ═══════════════════════════════════════════════════════════════════
   Die Vorschau auf den Personenlauf — welche der Unseren würden drüben
   gefunden, und wie viele Datensätze entstehen neu?

   ⚠ ⚠  SIE LÄUFT VOR DEM SENDEN, NICHT DANACH. Doppelte drüben sind von
   Hand zusammenzuführen; eine Zahl vorher kostet nichts.

   ⚠ ⚠  DREI EBENEN, IN DIESER REIHENFOLGE — und die Reihenfolge ist die
   Aussage, nicht die Bequemlichkeit:

     1  Verbandsnummer   ein Schlüssel
     2  E-Mail           eindeutig, aber änderbar
     3  Name + Jahrgang  eine Schreibweise

   **Wer über die Nummer trifft, wird nicht mehr über den Namen gesucht.**
   Andersherum fände eine Namensänderung dieselbe Person zweimal.

   ⚠  VERGLICHEN WIRD ÜBER HASHES, nie über Klartext — die Gegenstelle
   schickt `email_hash` und `name_hash`, nie Adresse oder Name. Ein Hash
   trifft nur bei Gleichheit und findet damit WENIGER als ein Mensch:
   `ohne_treffer` wird eher zu gross. **Von zwei Fehlerrichtungen ist das
   die bezahlbare** — wer zu viele neue Datensätze erwartet, sieht genauer
   hin; wer zu wenige erwartet, drückt.
   ═══════════════════════════════════════════════════════════════════ */

/** Ein Merkmalssatz, wie ihn `bestand` je Person drüben liefert. */
export interface DruebenMerkmal {
  sfv_person_id: string | null;
  email_hash: string | null;
  name_hash: string | null;
}

/** Eine Person von uns, so weit der Abgleich sie braucht. */
export interface UnserePerson {
  id: string;
  sfv_person_id: number | null;
  email_hash: string | null;
  name_hash: string | null;
}

export interface AbgleichErgebnis {
  gesendet: number;
  treffer_sfv: number;
  treffer_email: number;
  treffer_name: number;
  /** ⚠ Die Zahl, die zählt: so viele Datensätze entstehen neu. */
  ohne_treffer: number;
  /** Drüben vorhanden und in unserer Sendung nicht enthalten. */
  personen_ohne_uns: number;
}

/**
 * Der Namensschlüssel — **muss zeichengleich zu `cc_namensschluessel()`
 * im Empfänger sein.**
 *
 * ⚠ Sortiert, weil „Anna Meier" und „Meier Anna" derselbe Mensch sind und
 * der Beitragstitel drüben die Reihenfolge nicht garantiert.
 *
 * ⚠ ⚠ GRENZE, gemessen am 11.09.2026 gegen die PHP-Fassung: NUR ä ö ü ß
 * werden aufgelöst. Jeder andere Akzent wird WEGGEWORFEN, nicht
 * übertragen — aus „Léa O'Brien“ wird `a brien l o`.
 *
 * Beide Seiten tun dasselbe, der Vergleich trifft also weiterhin. Aber
 * „Lea“ und „Léa“ ergeben VERSCHIEDENE Schlüssel und treffen
 * einander nicht. **Das ist die sichere Richtung** — es findet weniger,
 * nie mehr, und `ohne_treffer` wird dadurch eher zu gross.
 *
 * ⚠ Laufen die beiden Fassungen auseinander, trifft kein einziger Hash
 * mehr und die Vorschau meldet lauter neue Personen. **Das ist laut, nicht
 * still** — und deshalb die richtige Bauart für eine Regel, die an zwei
 * Orten stehen muss.
 */
export function namensschluessel(roh: string): string {
  const ersetzt = roh.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  return ersetzt.replace(/[^a-z ]+/gu, " ").split(" ").filter(Boolean).sort().join(" ");
}

/**
 * Die fünf Gruppen.
 *
 * ⚠ Jede Zahl kommt zurück, auch als Null — ein fehlender Wert ist keine
 * Auskunft.
 *
 * ⚠ UND DIE AUFTEILUNG MUSS AUFGEHEN: `treffer_sfv + treffer_email +
 * treffer_name + ohne_treffer === gesendet`. Eine Aufteilung, die aufgehen
 * muss, prüft sich selbst; eine einzelne Zahl kann nur behauptet werden.
 * Der Testfall hält es fest.
 */
export function baueAbgleich(
  unsere: UnserePerson[],
  drueben: DruebenMerkmal[],
): AbgleichErgebnis {
  const nummern = new Set(
    drueben.map((d) => d.sfv_person_id).filter((x): x is string => !!x),
  );
  const mails = new Set(
    drueben.map((d) => d.email_hash).filter((x): x is string => !!x),
  );
  const namen = new Set(
    drueben.map((d) => d.name_hash).filter((x): x is string => !!x),
  );

  const erg: AbgleichErgebnis = {
    gesendet: unsere.length,
    treffer_sfv: 0, treffer_email: 0, treffer_name: 0,
    ohne_treffer: 0, personen_ohne_uns: 0,
  };

  /* ⚠ Was hier getroffen wurde, wird von der Gegenrichtung abgezogen —
     sonst zählte dieselbe Person drüben als „kennen wir nicht". */
  const getroffen = new Set<string>();
  const merke = (s: string | null | undefined) => { if (s) getroffen.add(s); };

  for (const p of unsere) {
    /* 1 · Nummer. Ein Schlüssel schlägt jede Schreibweise. */
    if (p.sfv_person_id != null && nummern.has(String(p.sfv_person_id))) {
      erg.treffer_sfv += 1;
      merke(String(p.sfv_person_id));
      continue;
    }
    /* 2 · E-Mail. */
    if (p.email_hash && mails.has(p.email_hash)) {
      erg.treffer_email += 1;
      merke(p.email_hash);
      continue;
    }
    /* 3 · Name plus Jahrgang. */
    if (p.name_hash && namen.has(p.name_hash)) {
      erg.treffer_name += 1;
      merke(p.name_hash);
      continue;
    }
    erg.ohne_treffer += 1;
  }

  /* ⚠ Die Gegenrichtung — der stille Rest, der auseinanderläuft. Eine
     Person drüben, die keines unserer Merkmale trägt, bleibt auf dem Stand
     ihres CSV-Imports stehen, und niemand merkt es. */
  for (const d of drueben) {
    const bekannt = (d.sfv_person_id && getroffen.has(d.sfv_person_id))
      || (d.email_hash && getroffen.has(d.email_hash))
      || (d.name_hash && getroffen.has(d.name_hash));
    if (!bekannt) erg.personen_ohne_uns += 1;
  }

  return erg;
}

/**
 * Die Zeilen für die Karte — Zahlen mit ihrer Bedeutung daneben.
 *
 * ⚠ „232 ohne Treffer" ist eine Zahl; „so viele Datensätze entstehen neu"
 * ist eine Auskunft. Eine Zahl ohne ihren Satz wird gelesen und nicht
 * verstanden.
 */
export function deuteAbgleich(e: AbgleichErgebnis): string[] {
  const summe = e.treffer_sfv + e.treffer_email + e.treffer_name + e.ohne_treffer;
  const zeilen = [
    `${e.gesendet} Personen würden gesendet`,
    `${e.treffer_sfv} über die Verbandsnummer gefunden`,
    `${e.treffer_email} über die E-Mail`,
    `${e.treffer_name} über Name plus Jahrgang`,
  ];
  zeilen.push(e.ohne_treffer === 0
    ? "0 fallen durch alle drei — es entstehen keine neuen Datensätze"
    : `⚠ ${e.ohne_treffer} fallen durch alle drei — so viele Datensätze entstehen NEU`);
  zeilen.push(e.personen_ohne_uns === 0
    ? "0 stehen drüben und nicht in dieser Sendung"
    : `⚠ ${e.personen_ohne_uns} stehen drüben und nicht in dieser Sendung — `
      + "sie bleiben auf ihrem Stand und laufen auseinander");
  /* ⚠ DIE GEGENPROBE STEHT IN DER ANTWORT, NICHT NUR IM TEST. Eine
     Aufteilung, die aufgehen muss, prüft sich selbst. */
  if (summe !== e.gesendet) {
    zeilen.push(`⚠ ⚠ Die Aufteilung geht nicht auf: ${summe} statt ${e.gesendet}. `
      + "Die Vorschau misst etwas anderes als sie meldet — nicht darauf verlassen.");
  }
  return zeilen;
}
