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
  /** Vier Ziffern, für die Liste der Ohne-Treffer. Kein Datum. */
  jahrgang?: string | null;
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
  /**
   * Die `ohne_treffer` einzeln — **als Hash und Jahrgang, nie als Name.**
   *
   * ⚠ ⚠  DIE GEGENSEITE KANN DAMIT ARBEITEN, OHNE DASS EIN NAME REIST.
   *       Sie hält ihre eigenen 129 gegen diese Hashes und sieht, wer
   *       schon dasteht — das ist genau der Zweck, und dafür genügt
   *       Gleichheit.
   *
   * ⚠ ⚠  WAS SIE NICHT KANN: eine SCHREIBWEISE erkennen. `Lea` und `Léa`
   *       ergeben verschiedene Hashes, und kein Mensch sieht es ihnen an.
   *       **Wer Beinahe-Treffer von Hand finden will, braucht Klartext —
   *       und das ist eine Entscheidung über Personendaten, keine
   *       technische.** Sie steht bewusst offen.
   */
  ohne_treffer_liste: { name_hash: string | null; jahrgang: string | null }[];
  /**
   * Die `personen_ohne_uns` einzeln, ebenso — damit die Gegenseite sie
   * einordnen kann, statt sie nur zu zählen.
   */
  ohne_uns_liste: { sfv_person_id: string | null; name_hash: string | null }[];
  /** Erst gesetzt, wenn die Gegenrichtung eingeordnet wurde. */
  einordnung?: Einordnung;
  /**
   * Wie viele Personen **drüben** je Achse überhaupt etwas tragen.
   *
   * ⚠ ⚠ OHNE DIESE ZAHLEN IST EINE NULL NICHT ZU DEUTEN. `treffer_email: 0`
   * heisst entweder „niemand passt" oder „die Achse trägt nichts" — und das
   * sind zwei völlig verschiedene Auskünfte.
   *
   * Gemessen am 12.09.2026: der Empfänger las `email` statt `mail` und ein
   * `geburtsdatum`, das es an einer Person nicht gibt. **`email_hash` und
   * `name_hash` waren damit für jede Person `null`, seit 0.9.20** — zwei von
   * drei Achsen trugen nichts, und niemand konnte es der Antwort ansehen.
   *
   * ⚠ Die Folge reichte weiter als die zwei Achsen: weil zwei Nullen aus
   * einer kaputten Quelle kamen, geriet auch `treffer_sfv = 0` in Zweifel —
   * obwohl DIESE Achse den richtigen Feldnamen las. **Eine unglaubwürdige
   * Zahl zieht die richtigen neben sich mit hinein.**
   *
   * > **Nicht feststellbar ist nicht dasselbe wie nichts gefunden.**
   *
   * ⚠ `null`, wenn die Gegenseite älter als 0.9.24 ist — nicht `{}`. Eine
   * nicht gestellte Frage ist keine Null. Dieselbe Regel wie bei
   * `halbzeit_nicht_pruefbar` und bei `acf_kennt`.
   */
  drueben_nutzbar?: Record<string, number> | null;
  /**
   * Wie viele Personen drüben insgesamt stehen — die **Bezugsgrösse**.
   *
   * ⚠ Ohne sie ist `drueben_nutzbar` nur eine zweite nackte Zahl. „40" und
   * „40 von 129" sind zwei verschiedene Auskünfte, und die erste ist keine.
   */
  drueben_gesamt: number;
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
/**
 * Die Verbandsnummer auf Ziffern reduziert — **auf beiden Seiten**.
 *
 * ⚠ ⚠  ANLASS, 12.09.2026, Frage des Theme-Chats: bei einem Textvergleich
 *       sind `1143801` und `1 143 801` zwei Werte. Unsere Seite liest die
 *       Nummer aus einer `integer`-Spalte — dort kann nichts Krummes
 *       stehen. **Seine kommt aus einem Postmeta**, also aus etwas, das
 *       jemand getippt haben kann.
 *
 * ⚠  Der Empfaenger `trim()`t bereits; das faengt Leerraum aussen, nicht
 *    innen. Und ein Tausendertrennzeichen steht innen.
 *
 * ⚠  NUR ZIFFERN, und das ist hier ungefaehrlich: eine Verbandsnummer ist
 *    eine ganze Zahl. Bei einem Wert, der Buchstaben tragen KANN, waere
 *    dieselbe Reduktion ein Zusammenwerfen — dort gaelte das Gegenteil.
 *
 * ⚠  Leer heisst `null`, nicht `""`: eine Nummer, die nur aus Trennzeichen
 *    besteht, ist keine Nummer. Zwei leere Zeichenketten wuerden sonst
 *    aufeinander treffen und als Treffer zaehlen.
 */
export function nurZiffern(roh: string | number | null | undefined): string | null {
  if (roh === null || roh === undefined) return null;
  const z = String(roh).replace(/[^0-9]/g, "");
  return z === "" ? null : z;
}

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
  /* ⚠ Beide Seiten durch dieselbe Reduktion — sonst trennt eine
     Schreibweise, was dieselbe Nummer ist. */
  const nummern = new Set(
    drueben.map((d) => nurZiffern(d.sfv_person_id)).filter((x): x is string => !!x),
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
    drueben_gesamt: drueben.length,
    ohne_treffer_liste: [], ohne_uns_liste: [],
  };

  /* ⚠ Was hier getroffen wurde, wird von der Gegenrichtung abgezogen —
     sonst zählte dieselbe Person drüben als „kennen wir nicht". */
  const getroffen = new Set<string>();
  const merke = (s: string | null | undefined) => { if (s) getroffen.add(s); };

  for (const p of unsere) {
    /* 1 · Nummer. Ein Schlüssel schlägt jede Schreibweise. */
    const nr = nurZiffern(p.sfv_person_id);
    if (nr !== null && nummern.has(nr)) {
      erg.treffer_sfv += 1;
      merke(nr);
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
    /* ⚠ Hash und Jahrgang, kein Name — siehe den Typ oben. */
    erg.ohne_treffer_liste.push({ name_hash: p.name_hash, jahrgang: p.jahrgang ?? null });
  }

  /* ⚠ Die Gegenrichtung — der stille Rest, der auseinanderläuft. Eine
     Person drüben, die keines unserer Merkmale trägt, bleibt auf dem Stand
     ihres CSV-Imports stehen, und niemand merkt es. */
  for (const d of drueben) {
    const dnr = nurZiffern(d.sfv_person_id);
    const bekannt = (dnr !== null && getroffen.has(dnr))
      || (d.email_hash && getroffen.has(d.email_hash))
      || (d.name_hash && getroffen.has(d.name_hash));
    if (!bekannt) {
      erg.personen_ohne_uns += 1;
      erg.ohne_uns_liste.push({ sfv_person_id: dnr, name_hash: d.name_hash });
    }
  }

  return erg;
}

/**
 * Die `personen_ohne_uns` einordnen: gefiltert oder übersehen?
 *
 * ⚠ ⚠  DIESE ZAHL BESCHÄFTIGT MEHR ALS DIE NEUEN DATENSÄTZE, und zu
 *       Recht: **sie laufen dauerhaft auseinander.** Ein neuer Datensatz
 *       ist einmal falsch; eine Person, die drüben steht und von keinem
 *       Lauf mehr erreicht wird, altert für immer.
 *
 * ⚠  VERGLICHEN WIRD ÜBER NAMENSSCHLÜSSEL UND JAHRGANG, nicht über die
 *    Nummer. Bei null Treffern über die Nummer taugt sie dafür nicht —
 *    ein Schlüssel, der nirgends passt, ordnet nichts ein.
 *
 * Drei Gruppen, und nur die dritte ist ein Befund:
 *
 *   gefiltert    kennen wir, bewusst nicht gesendet (Eltern, Passive)
 *   uebersehen   ⚠ kennen wir, und der Filter hat sie nicht erfasst
 *   fremd        kennen wir gar nicht — von Hand drüben angelegt
 *
 * ⚠  `uebersehen` ist die Gruppe, für die der Aufrufer zurückgehalten
 *    wird. Steht sie auf 0, ist der Filter vollständig.
 */
export interface Einordnung {
  gefiltert: number;
  uebersehen: number;
  fremd: number;
  /** Die Übersehenen einzeln — Hash und Jahrgang, nie ein Name. */
  uebersehen_liste: { name_hash: string | null }[];
}

export function ordneEin(
  ohneUns: { name_hash: string | null }[],
  /** Alle Personen, die wir kennen und NICHT senden — mit ihrem Hash. */
  gefilterteHashes: Set<string>,
  /** Und die, die wir senden — für den Fall, dass einer doppelt zählt. */
  gesendeteHashes: Set<string>,
): Einordnung {
  const erg: Einordnung = { gefiltert: 0, uebersehen: 0, fremd: 0, uebersehen_liste: [] };
  for (const d of ohneUns) {
    const h = d.name_hash;
    /* ⚠ Ohne Hash ist keine Einordnung möglich — das ist `fremd`, aber
       aus einem anderen Grund: wir wissen es nicht, statt es zu wissen.
       Die Zahl wirft beides zusammen; die Liste der Übersehenen nicht. */
    if (!h) { erg.fremd += 1; continue; }
    if (gefilterteHashes.has(h)) { erg.gefiltert += 1; continue; }
    if (gesendeteHashes.has(h)) {
      /* ⚠ Gesendet UND als `ohne uns` gezählt: das wäre ein Widerspruch
         in unserer eigenen Rechnung. Er zählt als übersehen und fällt
         damit auf — eine Zahl, die nicht stimmen kann, soll sichtbar
         sein statt weggerundet. */
      erg.uebersehen += 1;
      erg.uebersehen_liste.push({ name_hash: h });
      continue;
    }
    erg.fremd += 1;
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
  /* ⚠ ⚠  „40 VON 129 MIT E-MAIL-HASH" IST EINE AUSKUNFT, „40 TREFFER" EIN
     SCHLUSS DARAUS. (Didi, 12.09.2026.)

     Am 12.09.2026 waren drüben ALLE Hashes `null` — zwei falsche
     Feldnamen —, und die fünf Zahlen sahen trotzdem wie eine Messung aus.
     Die Aufteilung ging auf, die Rechnung war richtig, und niemand konnte
     der Null ansehen, dass die Achse gar nichts trug.

     ⚠ Die Bezugsgrösse steht deshalb NEBEN der Trefferzahl und nicht
     darunter: wer „0 über die E-Mail" liest und drei Zeilen weiter „0 von
     129 tragen einen Hash", hat schon geschlossen.

     ⚠ Und `null` heisst „nicht feststellbar", nicht „0 von 0". Eine
     Gegenseite vor 0.9.24 liefert die Angabe nicht — das ist eine andere
     Aussage als eine leere Achse, und sie wird auch anders gesagt. */
  const nutzbar = e.drueben_nutzbar;
  const auskunft = (schluessel: string): string => {
    if (!nutzbar) return " (wie viele drüben einen Hash tragen: nicht gemeldet)";
    const n = nutzbar[schluessel] ?? 0;
    return n === 0
      ? ` — ⚠ drüben trägt KEINE von ${e.drueben_gesamt} Personen dieses Merkmal,`
        + " die Null sagt hier nichts über Treffer"
      : ` (drüben tragen ${n} von ${e.drueben_gesamt} dieses Merkmal)`;
  };

  const zeilen = [
    `${e.gesendet} Personen würden gesendet`,
    `${e.treffer_sfv} über die Verbandsnummer gefunden${auskunft("sfv_person_id")}`,
    `${e.treffer_email} über die E-Mail${auskunft("email_hash")}`,
    `${e.treffer_name} über Name plus Jahrgang${auskunft("name_hash")}`,
  ];
  zeilen.push(e.ohne_treffer === 0
    ? "0 fallen durch alle drei — es entstehen keine neuen Datensätze"
    : `⚠ ${e.ohne_treffer} fallen durch alle drei — so viele Datensätze entstehen NEU`);
  zeilen.push(e.personen_ohne_uns === 0
    ? "0 stehen drüben und nicht in dieser Sendung"
    : `⚠ ${e.personen_ohne_uns} stehen drüben und nicht in dieser Sendung — `
      + "sie bleiben auf ihrem Stand und laufen auseinander");
  /* ⚠ ⚠ DIE EINORDNUNG DER GEGENRICHTUNG — sie beschäftigt mehr als die
     neuen Datensätze, weil diese Personen DAUERHAFT auseinanderlaufen. */
  if (e.einordnung) {
    const ein = e.einordnung;
    zeilen.push(`   davon ${ein.gefiltert} bewusst gefiltert · ${ein.fremd} kennen wir nicht`);
    zeilen.push(ein.uebersehen === 0
      ? "   0 übersehen — der Filter ist vollständig"
      : `   ⚠ ${ein.uebersehen} ÜBERSEHEN — die müssten wir senden und tun es nicht`);
  }
  /* ⚠ Die Listen stehen in der Antwort, nicht in der Karte: sie sind für
     die Gegenseite gedacht, nicht für den Blick. Die Karte sagt nur,
     dass es sie gibt — sonst liest sie niemand und niemand weiss davon. */
  /* ⚠ ⚠ `?? []` IST HIER KEINE BEQUEMLICHKEIT, SONDERN DER FALL.
     Die Listen kamen am 12.09.2026 dazu. Eine Antwort einer aelteren
     Function traegt sie nicht — und `undefined.length` wirft, statt die
     Karte anzuzeigen. **Ein neues Feld, und der Leser nimmt an, dass es
     da ist**: derselbe Fehler wie heute schon viermal, nur diesmal laut
     statt still. Gefangen hat es ein Testfall, dessen Attrappe noch die
     alte Form hatte. */
  const ohneTreffer = e.ohne_treffer_liste ?? [];
  if (ohneTreffer.length > 0) {
    zeilen.push(`Die ${ohneTreffer.length} stehen als Hash und Jahrgang `
      + "in der Rohantwort — ohne Namen, zum Gegenhalten drüben.");
  }
  /* ⚠ DIE GEGENPROBE STEHT IN DER ANTWORT, NICHT NUR IM TEST. Eine
     Aufteilung, die aufgehen muss, prüft sich selbst. */
  if (summe !== e.gesendet) {
    zeilen.push(`⚠ ⚠ Die Aufteilung geht nicht auf: ${summe} statt ${e.gesendet}. `
      + "Die Vorschau misst etwas anderes als sie meldet — nicht darauf verlassen.");
  }
  return zeilen;
}
