/* ══════════════════════════════════════════════════════════════════════
   Die Schlüssel einer echten Rohantwort — ungefiltert, ohne Werte

   ⚠ ANLASS (10.09.2026). Ich hatte gemeldet, die SFV-Schnittstelle führe
   kein Bildfeld — gefunden über die Swagger-Datei. Didis Einwand:

     > Ein Schema ist ein Dokument, keine Antwort. `playDayName`
     > verhielt sich auch anders, als es beschrieben war.

   Und er hat recht: `playDayName` heisst „Spieltagsname" und liefert den
   Wochentag. Eine Suche im Dokument beantwortet nicht, was die Leitung
   bringt.

   ⚠ NUR SCHLÜSSEL, NIE WERTE. `Object.keys()`, nirgends
   `Object.entries()`. Der Spielplan führt zwar keine Personendaten —
   aber ein Werte-Ausgang wäre wieder ein Ausgang, den jemand prüfen
   muss, und genau so sind am 21.08.2026 903 Klarnamen ins Protokoll
   gelangt.

   ⚠ UND UNGEFILTERT. Keine Auswahl „was nach Logo aussieht" — genau das
   Filtern hat den Befund erzeugt, der angezweifelt wird. Die Liste kommt
   roh; die Deutung macht ein Mensch.

   ⚠ ERSTES OBJEKT **UND** VEREINIGUNG ÜBER ALLE. JSON-Objekte einer
   Liste können verschiedene Schlüssel haben; ein Feld, das nur bei
   manchen Teams gesetzt ist, fiele durch eine Stichprobe von einem.
   Beide Zahlen nebeneinander sagen ausserdem, OB sie auseinandergehen —
   und das ist selbst eine Auskunft.
   ══════════════════════════════════════════════════════════════════════ */

export interface SchluesselBefund {
  /** Wie viele Objekte die Antwort führte. */
  anzahl: number;
  /** Die Schlüssel des ERSTEN Objekts, in seiner Reihenfolge. */
  erstes: string[];
  /** Alle Schlüssel, die in irgendeinem Objekt vorkommen. */
  alle: string[];
  /**
   * ⚠ Schlüssel, die NICHT in jedem Objekt stehen. Sie sind der
   * interessante Teil: ein Feld, das nur manchmal kommt, ist genau das,
   * was eine Stichprobe übersieht und ein Schema nicht verrät.
   */
  nicht_ueberall: string[];
  /**
   * Verschachtelte Objekte, je Pfad die Schlüssel — etwa `teams[]`.
   * Auch hier nur Namen.
   */
  verschachtelt: Record<string, string[]>;
}

const LEER: SchluesselBefund = {
  anzahl: 0, erstes: [], alle: [], nicht_ueberall: [], verschachtelt: {},
};

function istObjekt(w: unknown): w is Record<string, unknown> {
  return typeof w === "object" && w !== null && !Array.isArray(w);
}

/**
 * Die Schlüssel einer Antwortliste.
 *
 * @param roh Die Antwort, wie sie kam — eine Liste von Objekten.
 */
export function schluesselVon(roh: unknown): SchluesselBefund {
  const liste = Array.isArray(roh) ? roh : (istObjekt(roh) ? [roh] : []);
  if (!liste.length) return { ...LEER };

  const alle = new Set<string>();
  const zaehler = new Map<string, number>();
  const verschachtelt: Record<string, string[]> = {};

  for (const o of liste) {
    if (!istObjekt(o)) continue;
    for (const k of Object.keys(o)) {
      alle.add(k);
      zaehler.set(k, (zaehler.get(k) ?? 0) + 1);

      /* ⚠ Eine Ebene tief, nicht beliebig: mehr braucht die Frage nicht,
         und jede weitere Ebene ist eine weitere Stelle, an der aus
         Versehen ein Wert mitreist. */
      const v = o[k];
      if (istObjekt(v)) {
        verschachtelt[`${k}{}`] = Object.keys(v);
      } else if (Array.isArray(v) && v.length && istObjekt(v[0])) {
        verschachtelt[`${k}[]`] = Object.keys(v[0] as Record<string, unknown>);
      }
    }
  }

  const erstesObj = liste.find(istObjekt);
  const n = liste.filter(istObjekt).length;

  return {
    anzahl: n,
    erstes: erstesObj ? Object.keys(erstesObj) : [],
    alle: [...alle].sort(),
    nicht_ueberall: [...alle].filter((k) => (zaehler.get(k) ?? 0) < n).sort(),
    verschachtelt,
  };
}

/**
 * Der Satz, der aus dem Befund folgt — für die eine Frage, wegen der es
 * die Probe gibt.
 *
 * ⚠ Er DEUTET nicht, er zeigt: er nennt die Schlüssel, die überhaupt in
 * Frage kämen, und sagt ausdrücklich, wenn keiner passt. Die Antwort
 * „kein Bildfeld" ist damit nicht mehr aus einem Dokument abgeleitet,
 * sondern aus der Leitung gelesen.
 */
export function suchtBildfeld(b: SchluesselBefund): string {
  const KANDIDAT = /logo|picture|image|emblem|wappen|url|crest|badge/i;
  const treffer = [
    ...b.alle.filter((k) => KANDIDAT.test(k)),
    ...Object.entries(b.verschachtelt)
      .flatMap(([pfad, ks]) => ks.filter((k) => KANDIDAT.test(k)).map((k) => `${pfad}.${k}`)),
  ];
  if (!b.anzahl) {
    return "Die Antwort war leer — die Probe sagt nichts. Nicht als Befund lesen.";
  }
  if (!treffer.length) {
    return `Kein Schlüssel mit logo/picture/image/emblem/url in ${b.anzahl} Objekt(en). `
      + "Jetzt an der Antwort gemessen, nicht aus dem Schema abgeleitet.";
  }
  return `Treffer: ${treffer.join(", ")}. Der Wert steht hier NICHT — `
    + "wer ihn sehen will, holt ihn gezielt.";
}

/**
 * Die Feldnamen einer unbekannten Struktur — **beliebig tief, als Pfade.**
 *
 * ⚠ ⚠  ANLASS, 14.09.2026. `/api/common/ids` antwortete mit **einem** Objekt
 * und **einem** Feldnamen: `sfv_ids`. Ein Endpunkt, dessen Zusammenfassung
 * „return json with all relevant ids" lautet und der ein Feld zurückgibt,
 * ist selbst auffällig — und `schluesselVon()` sieht bewusst nur eine Ebene.
 *
 * > Dieselbe Form wie der Unterfeld-Melder, der nur die oberste Ebene
 * > prüfte: eine Prüfung, die nicht tief genug schaut, meldet „ein Feld"
 * > und meint „ein Feld, in dem alles steckt".
 *
 * ── WARUM DAS HIER ERLAUBT IST UND IN `schluesselVon()` NICHT ──────────
 *
 * Dort steht: *„jede weitere Ebene ist eine weitere Stelle, an der aus
 * Versehen ein Wert mitreist."* Das bleibt richtig — und diese Funktion
 * gibt **niemals einen Wert** heraus, nur `Object.keys()`. Ein Wert kann
 * hier gar nicht mitreisen, weil keiner angefasst wird.
 *
 * ⚠ Die Tiefe ist trotzdem gedeckelt. Nicht aus Vorsicht vor Werten,
 * sondern gegen eine Struktur, die sich selbst enthält — und weil eine
 * Ausgabe, die niemand mehr liest, so nutzlos ist wie keine.
 *
 * ⚠ Und ein Feldname KANN etwas verraten (`sfv_person_id` sagt, dass
 * Personennummern darin stehen). Das ist hier erwünscht: genau danach wird
 * gesucht. Werte bleiben aussen vor.
 */
export function schluesselTief(
  roh: unknown, maxTiefe = 4,
): Record<string, string[]> {
  const raus: Record<string, string[]> = {};

  const gehe = (wert: unknown, pfad: string, tiefe: number): void => {
    if (tiefe > maxTiefe) {
      /* ⚠ Der Abbruch wird GEMELDET, nicht verschwiegen. Sonst sähe eine
         gekappte Struktur aus wie eine flache. */
      raus[`${pfad} …`] = ["(tiefer nicht gelesen)"];
      return;
    }
    if (Array.isArray(wert)) {
      /* ⚠ Nur das erste Element: bei tausend Einträgen sind die Feldnamen
         dieselben, und tausendmal dasselbe ist keine Auskunft. Die LÄNGE
         steht daneben, weil „eine Liste" und „eine Liste mit 340 Einträgen"
         zwei verschiedene Auskünfte sind. */
      raus[`${pfad}[] (${wert.length})`] = wert.length && istObjekt(wert[0])
        ? Object.keys(wert[0] as Record<string, unknown>)
        : [`(${wert.length ? typeof wert[0] : "leer"})`];
      if (wert.length && istObjekt(wert[0])) gehe(wert[0], `${pfad}[]`, tiefe + 1);
      return;
    }
    if (!istObjekt(wert)) return;
    const o = wert as Record<string, unknown>;
    raus[pfad || "(Wurzel)"] = Object.keys(o);
    for (const k of Object.keys(o)) gehe(o[k], pfad ? `${pfad}.${k}` : k, tiefe + 1);
  };

  gehe(roh, "", 0);
  return raus;
}
