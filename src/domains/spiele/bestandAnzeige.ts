/* ═══════════════════════════════════════════════════════════════════
   Die Deutung der Antwort von `aktion: "bestand"`.

   ⚠ ⚠  WARUM SIE HIER STEHT UND NICHT IN DER KACHEL. Am 11.09.2026
   zeigte die Karte `0 Personen · 0 mit Verbandsnummer · 0 ohne`, waehrend
   drueben 129 standen. Die Ursache war eine Zeile in der Deutung — und sie
   liess sich nicht pruefen, weil die Funktion in einer Komponente stand.

   **Eine Entscheidung, die man nicht gegen eine erfundene Antwort halten
   kann, ist nur zu belegen, indem man sie ausfuehrt.** Deshalb liegt sie
   jetzt hier, mit Testfaellen fuer alle drei Zustaende.
   ═══════════════════════════════════════════════════════════════════ */

import { deuteAbgleich } from "./personenAbgleich.ts";
import type { AbgleichErgebnis } from "./personenAbgleich.ts";
export function deuteBestand(d: Record<string, unknown>): string[] {
  const z = (k: string) => Number(d[k] ?? 0);
  const zeilen = [
    `${z("gesamt")} Spiel-Beiträge stehen drüben (aus dem Abgleich)`,
    `${z("handbeitraege")} weitere von Hand angelegt — die fasst der Abgleich nie an`,
  ];
  /* ⚠ IMMER, AUCH ALS NULL. Ein fehlender Wert ist keine Auskunft —
     „keiner ohne Stempel" und „nicht gemessen" sähen sonst gleich aus. */
  zeilen.push(z("ohne_laufstempel") === 0
    ? "Alle tragen einen Laufstempel — jeder stammt aus einem Export"
    : `${z("ohne_laufstempel")} ohne Laufstempel, davon ${z("ohne_laufstempel_sichtbar")} öffentlich sichtbar`);
  /* ⚠ ⚠ PERSONEN — seit 0.9.18 die Hälfte, für die der Knopf gebaut
     wurde. Bis dahin zeigte er 270 Spiele und musste dazuschreiben,
     dass er Personen gar nicht kennt.

     ⚠ `vorhanden: false` heisst „den Beitragstyp gibt es dort nicht"
     und ist KEINE Null — sonst liest sich eine fehlende Einrichtung
     wie ein leerer Bestand. */
  /* ⚠ ⚠ DREI ZUSTAENDE, NICHT ZWEI — und der dritte hat mich am
     11.09.2026 selbst erwischt, in der Stunde, in der ich ueber genau
     diesen Fehler geschrieben habe.

       Schluessel FEHLT       die Fassung drueben kennt die Frage nicht
       vorhanden === false    den Beitragstyp gibt es dort nicht
       sonst                  die Zahlen

     Die erste Fassung prueste nur `vorhanden === false`. Bei einer
     aelteren Gegenstelle ist das Feld `undefined` — und fiel damit in
     den Zahlen-Zweig, der brav `0 · 0 · 0` schrieb.

     **Ich hatte `vorhanden` eingebaut, damit „gibt es nicht" nicht wie
     „leer" aussieht — und dann einen DRITTEN Zustand in denselben Topf
     fallen lassen.** Eine Unterscheidung mit zwei Aesten deckt keine
     drei Faelle, egal wie sorgfaeltig die zwei benannt sind. */
  if (!("personen" in d)) {
    zeilen.push("⚠ Diese Antwort kennt Personen und Teams nicht — drüben läuft eine "
      + "Fassung vor 0.9.18. Es ist KEINE Null, sondern eine nicht gestellte Frage.");
  } else {
    const pers = (d.personen ?? {}) as Record<string, unknown>;
    if (pers.vorhanden === false) {
      zeilen.push("⚠ Den Beitragstyp fch_person gibt es drüben nicht — nicht gezählt, nicht leer.");
    } else {
      const g = Number(pers.gesamt ?? 0), mn = Number(pers.mit_nummer ?? 0);
      const on = Number(pers.ohne_nummer ?? 0);
      zeilen.push(`${g} Personen stehen drüben · ${mn} mit Verbandsnummer · ${on} ohne`);
      /* ⚠ Die Zahl, die zählt, bekommt ihre Bedeutung daneben. */
      if (on > 0) {
        zeilen.push(`⚠ Die ${on} ohne Nummer sind über die Nummer nie erreichbar — `
          + "sie bleiben auf dem Stand ihres CSV-Imports.");
      }
    }
    const tm = (d.teams ?? {}) as Record<string, unknown>;
    zeilen.push(`${Number(tm.gesamt ?? 0)} Teams · ${Number(tm.mit_sfv_id ?? 0)} mit SFV-Nummer`
      + ` · ${Number(tm.ohne_sfv_id ?? 0)} ohne`
      + (Number(tm.sfv_id_doppelt ?? 0) > 0
         ? ` · ⚠ ${Number(tm.sfv_id_doppelt)} mit doppelter Nummer` : ""));
  }
  /* ⚠ ⚠ DIE FÜNF GRUPPEN — sie stehen nur da, wenn BEIDE Seiten sie
     liefern können: der Empfänger ab 0.9.20 (`merkmale`) und unsere
     Seite mit den Kandidaten.

     Fehlt `abgleich`, ist das KEINE Null, sondern eine nicht gestellte
     Frage — und die Karte sagt, welche Hälfte fehlt. Zum vierten Mal
     an zwei Tagen dieselbe Unterscheidung. */
  if (d.abgleich) {
    for (const zeile of deuteAbgleich(d.abgleich as AbgleichErgebnis)) zeilen.push(zeile);
  } else if ("personen" in d) {
    zeilen.push("⚠ Keine Vorschau auf den Personenlauf — die Antwort trägt keine "
      + "Vergleichsmerkmale. Drüben läuft eine Fassung vor 0.9.20.");
  }

  /* ⚠ ⚠ UNSERE EIGENE FASSUNG ZUERST. Zweimal an zwei Tagen wurde aus
     einer Meldung über die Gegenstelle geschlossen, während die eigene
     Änderung gar nicht deployt war.

     **Wer eine Herkunftsangabe verlangt, schuldet sie selbst.**

     Fehlt sie, ist die Function älter als der 12.09.2026 — und dann ist
     jede Aussage dieser Karte über drüben wertlos, weil die Felder
     unterwegs verworfen werden. Der Satz sagt das. */
  zeilen.push(d.function_fassung
    ? `Unsere Function: Fassung ${String(d.function_fassung)}`
    : "⚠ ⚠ Unsere Function nennt keine Fassung — sie ist nicht deployt. "
      + "Alles darüber sagt nichts über drüben: die Felder werden unterwegs verworfen.");

  /* ⚠ WER GEANTWORTET HAT — steht seit 0.9.19 in der Antwort selbst.
     Fehlt es, ist die Gegenstelle aelter als 0.9.19, und auch DAS ist
     eine Auskunft. */
  zeilen.push(d.version
    ? `Geantwortet hat ${String(d.empfaenger ?? "?")} ${String(d.version)}`
    : "⚠ Die Antwort nennt keine Fassung — drüben läuft etwas vor 0.9.19.");
  return zeilen;
}

