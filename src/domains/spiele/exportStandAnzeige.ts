/* ═══════════════════════════════════════════════════════════════════
   Was der Zustand des WordPress-Exports für die Kachel heisst.

   ⚠ ⚠  DER ANLASS, 24.09.2026. Die Kachel zeigte

       Letzter Sync: 23.9.2026, 23:57:00        Status: ok

   während an diesem Tag mehrere Läufe stattgefunden hatten und
   mindestens einer sein Ergebnis drüben hinterlassen hat. Sie war also
   nicht bloss veraltet — **sie hat einen veralteten Stand als «ok»
   ausgegeben.**

   > Die Kachel darf nicht «ok» zeigen, wenn der letzte vollständige Lauf
   > älter als eine Stunde ist und Änderungen warten. (Didi, 24.09.2026)

   ⚠ ⚠  WARUM DIE DEUTUNG HIER STEHT UND NICHT IN DER KACHEL. Dieselbe
   Begründung wie bei `deuteBestand()` und `deuteRangprobe()`: **eine
   Entscheidung, die man nicht gegen eine erfundene Antwort halten kann,
   ist nur zu belegen, indem man sie ausführt.** In einer Komponente
   bräuchte jeder Fall einen jsdom-Lauf — und genau die flackern unter
   Last.

   ⚠ ⚠  UND DIE DRITTE LAGE IST «NICHT FESTSTELLBAR», NICHT «OK».
   In diesem Projekt ist mehrfach eine nicht gestellte Frage als
   beruhigende Null angezeigt worden — bei `deuteBestand` («0 Personen»,
   während drüben 129 standen), bei `merkmale_nutzbar`, bei
   `gruppen_ohne_spiele`. Der Fehler ist immer derselbe:

   > Eine Auskunft, die eine unbekannte Frage mit «null» beantwortet
   > statt mit «kenne ich nicht», ist derselbe Fehler wie eine leere
   > Menge im Gut-Zweig.

   Deshalb gibt es `unbekannt` als eigene Lage, und sie sagt jedes Mal,
   WAS fehlt.
   ═══════════════════════════════════════════════════════════════════ */

import type { SemanticKey } from "../../shared/utils/colorUtils.ts";

// ⚠ Der Viertelstundentakt des Abholers, wörtlich aus
//   `cron_wp_export.sql:74`:   */15 * * * *
//   (er steht als Zeilenkommentar, weil ein `*` gefolgt von `/` jeden
//   Blockkommentar mitten im Satz beendet — beim ersten Versuch hat
//   genau das die Datei zerrissen.)
/**
 * Ab wann ein Stand «veraltet» heisst — in Minuten.
 *
 * ⚠ DIE ZAHL IST NICHT GERATEN, UND SIE IST AUCH NICHT NEU.
 *
 * Der Abholer läuft alle **15 Minuten** — gemessen, nicht geglaubt (der
 * cron-Ausdruck steht in der Zeile darüber), und er startet einen Lauf
 * genau dann, wenn `export_wartet() > 0`. Nach einer Stunde hat er
 * also **vier** Gelegenheiten gehabt. Wartet dann immer noch etwas, ist
 * das nicht mehr «noch nicht dran», sondern «er kommt nicht durch».
 *
 * ⚠ ⚠ Und es ist DIESELBE Stunde, die der Wächter benutzt
 * (`cron_sync_waechter.sql:310-314`, mit wortgleicher Begründung). Das
 * ist der eigentliche Grund für die Zahl: **zwei Stellen, die dieselbe
 * Frage verschieden beantworten, sind schlimmer als eine, die sie
 * grosszügig beantwortet.** Wer sie ändert, ändert beide — sonst meldet
 * der Wächter einen Ausfall, den die Kachel «ok» nennt.
 */
export const VERALTET_MINUTEN = 60;

/**
 * Wie lange ein Lauf stehen darf, bevor Stillstand die wahrscheinlichere
 * Erklärung ist — in Minuten.
 *
 * ⚠ Spiegelt `SPERRE_MINUTEN` in `supabase/functions/wp-export/index.ts`.
 * Die Zahl steht damit an zwei Orten, und das ist eine Doppelung, die
 * dieses Projekt sonst auflöst — nur geht es hier nicht: die Edge
 * Function importiert von `esm.sh` und ist aus dem Browser-Bündel nicht
 * erreichbar, die Richtung `src/ → functions/` ist die einzige, die es
 * gibt.
 *
 * **Deshalb hält ein Testfall die beiden Zahlen gegeneinander**
 * (`exportStandAnzeige.test.ts`) statt eines Kommentars, der eine andere
 * Stelle zusichert. Läuft eine davon weg, wird er rot.
 *
 * ⚠ ⚠  UND ER HAT DAS BEIM ERSTEN LAUF GETAN. Beim Schreiben stand hier
 * 30 — die Zahl, die seit dem 09.09.2026 galt. Die Function trug am
 * 24.09.2026 bereits **5**: das Gateway tötet jede Anfrage nach 150
 * Sekunden, ein Lauf KANN also nicht länger dauern, und eine Sperre von
 * 30 Minuten verlängerte jeden hängengebliebenen Lauf um zwei
 * Abholer-Takte. Der Fall hat die Abweichung in derselben Minute
 * gemeldet, in der sie entstanden wäre.
 */
export const SPERRE_MINUTEN = 5;

export type ExportLage =
  /** Der letzte Lauf hat gemeldet, dass er gelungen ist, und nichts hängt. */
  | "ok"
  /** Der letzte vollständige Lauf ist zu alt UND es warten Änderungen. */
  | "veraltet"
  /** Ein Lauf hat begonnen und nie aufgehört — er sperrt jeden weiteren. */
  | "haengt"
  /** Der letzte Lauf hat sich selbst als gescheitert gemeldet. */
  | "fehler"
  /** Gerade unterwegs. Kein Defekt — aber auch keine Aussage über den Stand. */
  | "laeuft"
  /**
   * Der Lauf hat etwas anderes gemeldet, als diese Funktion kennt
   * (`warnung`, `ausstehend`, `uebersprungen`, …).
   *
   * ⚠ DIESER AST IST ABSICHT UND KEIN REST. Eine Aufzählung, die einen
   * unbekannten Wert stillschweigend als «ok» behandelt, ist genau die
   * Falle, die dieses Papier an einem halben Dutzend Stellen führt —
   * eine unvollständige Liste wird für vollständig gehalten, GERADE
   * WEIL sie aufzählt. Hier reicht die Kachel den rohen Wert durch,
   * statt ihn zu deuten.
   */
  | "gemeldet"
  /** Nicht feststellbar — und die Zeilen sagen, was fehlt. */
  | "unbekannt";

export interface ExportStandEingabe {
  /** `api_verbindungen.letzter_sync` — wann ein Lauf zuletzt FERTIG wurde. */
  letzter_sync?: string | null;
  /** `api_verbindungen.sync_status` — was dieser Lauf gemeldet hat. */
  sync_status?: string | null;
  /** `api_verbindungen.sync_laeuft_seit` — die Laufsperre, `null` heisst frei. */
  sync_laeuft_seit?: string | null;
  /**
   * Was `export_wartet()` gezählt hat.
   *
   * ⚠ ⚠  `null` IST KEINE NULL. Es heisst «nicht gefragt» oder «nicht
   * lesbar» — und das ist eine ganz andere Auskunft als «es wartet
   * nichts». Wer beides zusammenwirft, zeigt eine nicht gestellte Frage
   * als Entwarnung.
   */
  wartet?: number | null;
  /** Warum `wartet` fehlt — erscheint wörtlich in der Anzeige. */
  wartet_grund?: string | null;
  /** Für Tests einsetzbar. Ohne Angabe: jetzt. */
  jetzt?: Date;
}

export interface ExportStand {
  lage: ExportLage;
  /** Was im Chip steht. */
  chip: string;
  /** Welche Farbe der Chip bekommt — aus `SEMANTIC`, keine neue Farbe. */
  semantic: SemanticKey;
  /** Die Sätze darunter. Nie leer. */
  zeilen: string[];
}

/**
 * Minuten seit einem Zeitstempel — oder `null`, wenn er fehlt oder
 * unlesbar ist.
 *
 * ⚠ Ein unlesbarer Zeitstempel ergibt `NaN`, und `NaN > 60` ist `false`.
 * Ohne `Number.isFinite` fiele er also lautlos in den Gut-Zweig — wieder
 * eine nicht beantwortbare Frage als Entwarnung.
 */
export function minutenSeit(wann: string | null | undefined, jetzt: Date): number | null {
  if (!wann) return null;
  const ms = jetzt.getTime() - new Date(wann).getTime();
  return Number.isFinite(ms) ? ms / 60_000 : null;
}

/** Eine Minutenzahl so, wie ein Mensch sie liest. */
function dauer(minuten: number): string {
  if (minuten < 90) return `${Math.round(minuten)} Minuten`;
  const stunden = minuten / 60;
  if (stunden < 48) return `${Math.round(stunden)} Stunden`;
  return `${Math.round(stunden / 24)} Tagen`;
}

/**
 * Wie viele Änderungen warten — als Satzteil, und `null` wird benannt
 * statt verschwiegen.
 */
function wartendes(e: ExportStandEingabe): string {
  if (e.wartet === null || e.wartet === undefined) {
    return `wie viele Änderungen warten, ist nicht feststellbar${e.wartet_grund ? ` (${e.wartet_grund})` : ""}`;
  }
  return e.wartet === 1 ? "1 Änderung wartet" : `${e.wartet} Änderungen warten`;
}

/**
 * Die Lage des WordPress-Exports, aus dem, was in `api_verbindungen`
 * steht — und aus `export_wartet()`, wenn es gelesen werden konnte.
 *
 * ⚠ NUR FÜR DEN EXPORT (`api_verbindungen.key = 'wordpress'`). Der
 * SFV-Sync hat einen TAKT und wird danach beurteilt («wann lief er
 * zuletzt?»), der Export hat keinen und läuft nach Bedarf («wartet
 * etwas, und wie lange schon?»). Der Wächter trennt die beiden aus
 * genau diesem Grund seit dem 11.09.2026; wer sie hier zusammenlegt,
 * baut für den einen einen Fehlalarm-Generator.
 */
export function deuteExportStand(e: ExportStandEingabe): ExportStand {
  const jetzt = e.jetzt ?? new Date();
  const seitLauf = minutenSeit(e.sync_laeuft_seit, jetzt);
  const seitSync = minutenSeit(e.letzter_sync, jetzt);

  /* ── 1 · Die Sperre zuerst ────────────────────────────────────────
     ⚠ Ein hängender Lauf erklärt alles Übrige und ist das Dringendste:
     die Sperre hält JEDEN weiteren Lauf auf, auch den, der es richten
     würde. Und `sync_status` beschreibt dann den Lauf DAVOR — also
     einen Stand, den der hängende längst überholt hat. */
  if (e.sync_laeuft_seit && seitLauf === null) {
    return {
      lage: "unbekannt",
      chip: "nicht feststellbar",
      semantic: "neutral",
      zeilen: [`⚠ Die Laufsperre trägt einen unlesbaren Zeitstempel (${e.sync_laeuft_seit}). `
        + "Ob gerade ein Lauf unterwegs ist, lässt sich damit nicht sagen."],
    };
  }
  if (seitLauf !== null && seitLauf > SPERRE_MINUTEN) {
    return {
      lage: "haengt",
      chip: "hängt",
      semantic: "danger",
      zeilen: [
        `⚠ Ein Lauf hat vor ${dauer(seitLauf)} begonnen und nie aufgehört. `
          + `Länger als ${SPERRE_MINUTEN} Minuten heisst: er ist gestorben.`,
        "Er sperrt jeden weiteren Export, bis die Sperre abläuft — auch den, "
          + "der den Rückstand aufholen würde.",
        wartendes(e) + ".",
      ],
    };
  }
  if (seitLauf !== null) {
    return {
      lage: "laeuft",
      chip: "läuft",
      semantic: "info",
      zeilen: [
        `Ein Lauf ist seit ${dauer(seitLauf)} unterwegs.`,
        /* ⚠ Über den STAND sagt das nichts — deshalb steht der letzte
           vollständige Lauf daneben und wird nicht davon verdeckt. */
        seitSync === null
          ? "Ein vollständiger Lauf ist noch nicht abgeschlossen worden."
          : `Der letzte vollständige Lauf ist ${dauer(seitSync)} her.`,
      ],
    };
  }

  /* ── 2 · Ein gemeldeter Fehler ist eine Tatsache, keine Ableitung ── */
  if (e.sync_status === "fehler") {
    return {
      lage: "fehler",
      chip: "fehler",
      semantic: "danger",
      zeilen: [
        "⚠ Der letzte Lauf hat sich selbst als gescheitert gemeldet.",
        /* ⚠ ⚠  UND DESHALB IST DIE WARTEZAHL HIER KEINE AUSKUNFT.
           `letzter_sync` wird im selben Update gesetzt wie `sync_status`
           — auch bei `fehler` (wp-export/index.ts:999-1003). Und
           `export_wartet()` rechnet gegen genau diesen Zeitstempel.
           Nach einem gescheiterten Lauf steht die Zahl also wieder nahe
           null, obwohl NICHTS angekommen ist. */
        "⚠ Dass jetzt wenig wartet, heisst hier nichts: `letzter_sync` wird "
          + "auch bei einem gescheiterten Lauf gesetzt, und die Wartezahl "
          + "rechnet dagegen. Was dieser Lauf nicht geschafft hat, zählt sie "
          + "nicht mehr mit.",
      ],
    };
  }

  /* ── 3 · Ohne Bezugspunkt gibt es keine Aussage über das Alter ───── */
  if (seitSync === null) {
    return {
      lage: "unbekannt",
      chip: "nicht feststellbar",
      semantic: "neutral",
      zeilen: [
        e.letzter_sync
          ? `⚠ «Letzter Sync» trägt einen unlesbaren Zeitstempel (${e.letzter_sync}).`
          : "⚠ Es ist noch kein Lauf abgeschlossen worden — «älter als eine Stunde» "
            + "hat damit keinen Bezugspunkt.",
        /* ⚠ Das Wartende steht trotzdem da. Es ist die Hälfte, die wir
           wissen, und ohne sie sähe «nicht feststellbar» aus wie
           «nichts los». */
        wartendes(e) + ".",
      ],
    };
  }

  /* ── 4 · Die Wartezahl fehlt → keine der beiden Antworten ─────────
     ⚠ Ohne sie lässt sich «veraltet» nicht von «ok» unterscheiden: ein
     alter Stand ist völlig in Ordnung, solange nichts wartet. Beides
     wäre geraten, also wird keines behauptet. */
  if (e.wartet === null || e.wartet === undefined) {
    return {
      lage: "unbekannt",
      chip: "nicht feststellbar",
      semantic: "neutral",
      zeilen: [
        `Der letzte vollständige Lauf ist ${dauer(seitSync)} her.`,
        `⚠ Ob Änderungen warten, ist nicht feststellbar${e.wartet_grund ? ` — ${e.wartet_grund}` : ""}. `
          + "Ohne diese Zahl ist «zu alt» von «nichts zu tun» nicht zu "
          + "unterscheiden, und es wird keines von beidem behauptet.",
      ],
    };
  }

  /* ── 5 · Die Lage, für die dieser Umbau gebaut wurde ──────────────── */
  if (e.wartet > 0 && seitSync > VERALTET_MINUTEN) {
    return {
      lage: "veraltet",
      chip: "veraltet",
      semantic: "warning",
      zeilen: [
        `⚠ ${wartendes(e)} seit über einer Stunde — der letzte vollständige `
          + `Lauf ist ${dauer(seitSync)} her.`,
        `Der Abholer läuft alle 15 Minuten und startet genau dann, wenn etwas `
          + `wartet. Nach ${VERALTET_MINUTEN} Minuten hatte er vier `
          + `Gelegenheiten — er kommt also nicht durch.`,
      ],
    };
  }

  /* ── 6 · Alles Übrige ─────────────────────────────────────────────── */
  const zeilen = [
    `Letzter vollständiger Lauf vor ${dauer(seitSync)}.`,
    /* ⚠ AUCH ALS NULL. «Es wartet nichts» ist die Auskunft, die den
       Unterschied zu «nicht nachgesehen» trägt. */
    wartendes(e) + ".",
  ];
  if (e.sync_status === "ok") return { lage: "ok", chip: "ok", semantic: "success", zeilen };
  return {
    lage: "gemeldet",
    chip: e.sync_status ?? "unbekannt",
    semantic: "neutral",
    zeilen: [
      ...zeilen,
      `Der Lauf hat «${e.sync_status ?? "nichts"}» gemeldet — unverändert `
        + "übernommen, nicht gedeutet.",
    ],
  };
}
