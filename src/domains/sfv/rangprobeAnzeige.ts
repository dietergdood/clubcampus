/* ═══════════════════════════════════════════════════════════════════
   Die Deutung der Antwort von `aktion: "rangprobe"`.

   ⚠ ⚠  WARUM SIE HIER STEHT UND NICHT IN DER KACHEL. Dieselbe
   Begründung wie bei `deuteBestand()`: eine Entscheidung, die man nicht
   gegen eine erfundene Antwort halten kann, ist nur zu belegen, indem
   man sie ausführt. Die Kachel bräuchte dafür einen jsdom-Lauf — und
   genau die flackern unter Last.

   ⚠ ⚠  DER ANLASS, 14.09.2026. `gruppen_ohne_spiele` meldete **0**,
   während auf sieben Teamseiten die Tabelle nachhinkte: FC Herrliberg 1
   kennt drei Spiele bei vier gespielten, Senioren 40+ null bei zwei.

   **Die Zahl war nicht falsch.** Sie zählt Gruppen, in denen JEDE
   Mannschaft auf null steht — in „Senioren 40+" haben dreizehn Gegner
   Spiele und wir keine, also ist die Gruppe nicht leer. Sie beantwortet
   „führt der Verband den Stand dieser Gruppe überhaupt?"; gefragt war
   „hinkt UNSERE Zeile nach?".

   > **Eine Zahl ohne Bezugsgrösse ist ein Artefakt. „0 Gruppen ohne
   > Spiele" kann heissen „alle Gruppen haben Spiele" oder „keine Gruppe
   > wurde geprüft."** (Theme-Chat, 14.09.2026)

   ⚠ ⚠  UND DIE AUSKUNFT LAG SCHON IN DER ANTWORT: `spiele_min` stand bei
   diesen Gruppen auf 0. Niemand hat es gelesen, weil die Kopfzahl
   daneben sagte, es sei nichts zu sehen. **Eine Kopfzahl, die beruhigt,
   erstickt das Detail neben sich** — die Umkehrung von „berechnet,
   geliefert, nicht gezeigt": gezeigt, aber neben einer Beruhigung.

   Deshalb steht die eigene Zeile jetzt VOR der Gruppenzahl, und die
   Gruppenzahl nennt ihren eigenen Zuschnitt.
   ═══════════════════════════════════════════════════════════════════ */

/** Eine eigene Ranglistenzeile, wie `rangprobe` sie meldet. */
export interface EigeneRangzeile {
  liga?: unknown;
  gruppe?: unknown;
  team?: unknown;
  anzahl_spiele?: unknown;
  punkte?: unknown;
}

/** Wie viele eigene Zeilen namentlich erscheinen, bevor gekürzt wird. */
const ZEIGE = 8;

/**
 * ⚠ DREI LAGEN, NICHT ZWEI — und keine davon darf wie eine andere
 * aussehen:
 *
 * | | heisst |
 * |---|---|
 * | `eigene_erkennbar === false` | `vereine.sfv_club_nummer` ist leer — die Probe kann unsere Zeilen gar nicht finden |
 * | `eigene_zeilen_gesamt` fehlt | die Edge Function ist älter als der 14.09.2026 — **nicht gefragt** |
 * | `eigene_ohne_spiele === 0` | gefragt, und alle tragen Spiele |
 *
 * Die erste als „0 ohne Spiele" auszugeben wäre die glatte Lüge; genau
 * diese Einebnung hat am 11.09.2026 drei Nullen für 129 Personen stehen
 * lassen.
 */
export function deuteRangprobe(d: Record<string, unknown>): string[] {
  const z = (k: string) => Number(d[k] ?? 0);
  const gruppenGes = z("gruppen_gesamt");
  const zeilenGes = z("zeilen_gesamt");
  const jeGruppe = z("zeilen_je_gruppe");
  const ohneNr = z("zeilen_ohne_gruppennummer");

  const zeilen: string[] = [
    `${gruppenGes} Gruppen beim Verband · ${zeilenGes} Zeilen · ${jeGruppe} je Gruppe`,
    /* ⚠ ⚠ DIE GEGENPROBE ZUM SCHLÜSSEL. Eine Tabelle hat zehn bis
       vierzehn Mannschaften. Liegt der Wert weit darüber, kollabiert die
       Gruppenkennung — und die Gruppenzahl ist dann ein Befund über den
       Schlüssel, nicht über die Daten. Genau so ist die dreiteilige erste
       Fassung aufgefallen: 232 / 8 ist keine Tabelle. */
    jeGruppe > 20
      ? `⚠ ${jeGruppe} Mannschaften je Gruppe — das ist keine Tabelle. `
        + "Die Gruppenkennung kollabiert; die Gruppenzahl sagt nichts."
      : `${jeGruppe} je Gruppe — in der Grösse einer Tabelle, der Schlüssel trägt`,
    ohneNr === 0
      ? "0 Zeilen ohne Gruppennummer"
      : `⚠ ${ohneNr} von ${zeilenGes} Zeilen ohne Gruppennummer — `
        + "dort ruht die Gruppenidentität auf Liga und Division allein",
  ];

  /* ══ UNSERE EIGENEN ZEILEN — die Zahl, die die Frage beantwortet ══ */
  const eigene = (d.eigene ?? []) as EigeneRangzeile[];
  if (d.eigene_erkennbar === false) {
    zeilen.push("⚠ Unsere eigenen Zeilen sind NICHT erkennbar — "
      + "vereine.sfv_club_nummer ist leer. Alles Folgende gilt nur für Gruppen.");
  } else if (d.eigene_zeilen_gesamt === undefined) {
    zeilen.push("Unsere eigenen Zeilen: nicht gemeldet — die Edge Function ist älter "
      + "als der 14.09.2026. Die Gruppenzahl darunter sagt nichts über uns.");
  } else {
    const ges = z("eigene_zeilen_gesamt");
    const ohne = z("eigene_ohne_spiele");
    const ohneZahl = z("eigene_ohne_zahl");
    zeilen.push(ohne === 0
      ? `${ges} eigene Mannschaften in der Tabelle, 0 davon auf null Spielen`
      : `⚠ ${ohne} von ${ges} eigenen Mannschaften stehen auf null Spielen — `
        + "beim VERBAND, nicht bei uns. Seine Tabelle hinkt seiner eigenen Quelle nach.");
    /* ⚠ `null` heisst „der Verband nennt keine Zahl", `0` heisst „null
       Spiele". Die zwei zusammenzuwerfen wäre genau der Fehler, gegen den
       die ganze Umstellung gebaut ist. */
    if (ohneZahl > 0) {
      zeilen.push(`   ⚠ ${ohneZahl} eigene Zeilen ohne jede Spielzahl — `
        + "das ist nicht dasselbe wie null Spiele");
    }
    /* ⚠ Die eigenen namentlich, auch die gesunden. Eine Liste, die nur
       Befunde zeigt, lässt offen, ob überhaupt gemessen wurde — und die
       Reihenfolge ist aufsteigend, also stehen die nachhinkenden oben. */
    for (const e of eigene.slice(0, ZEIGE)) {
      const n = e.anzahl_spiele;
      zeilen.push(`   ${String(e.team ?? "")} · ${String(e.liga ?? "")} — `
        + (n === null || n === undefined ? "keine Spielzahl" : `${Number(n)} Spiele`));
    }
    /* ⚠ Was weggelassen wird, wird GENANNT. Eine stille Kürzung liest
       sich wie Vollständigkeit. */
    if (eigene.length > ZEIGE) {
      zeilen.push(`   … und ${eigene.length - ZEIGE} weitere (siehe Rohantwort)`);
    }
  }

  /* ══ Erst jetzt die Gruppenzahl, und sie nennt ihren Zuschnitt ══ */
  const ohneGr = z("gruppen_ohne_spiele");
  zeilen.push(ohneGr === 0
    ? `0 von ${gruppenGes} Gruppen, in denen JEDE Mannschaft auf null steht `
      + "— diese Zahl sagt nichts darüber, ob wir nachhinken"
    : `⚠ ${ohneGr} von ${gruppenGes} Gruppen ohne Spiele — dort führt der VERBAND `
      + "keinen Stand. Wir bilden ihn korrekt ab; dieselbe Lage wie bei den "
      + "Spielen ohne Verlauf.");

  const gruppen = (d.gruppen ?? []) as Record<string, unknown>[];
  for (const g of gruppen.filter((x) => Number(x.zeilen) === Number(x.spiele_null))) {
    zeilen.push(`   ⚠ ${String(g.liga ?? "")} · ${String(g.gruppe ?? "")} — `
      + `${Number(g.zeilen)} Mannschaften, alle auf 0 Spielen`);
  }
  return zeilen;
}
