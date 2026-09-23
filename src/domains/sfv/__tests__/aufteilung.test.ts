/* ══════════════════════════════════════════════════════════════════════
   DIE AUFTEILUNG DER AUFSTELLUNG GEHT AUF

   ⚠ ⚠  DIESER FALL ENTSTAND AUS EINEM FEHLER, DER ZWEI WOCHEN LIEF, UND
   ER IST DER GRUND, WARUM ES IHN GIBT.

   An `aufstellung_geliefert` stand die Formel als KOMMENTAR:

     geliefert = zeilen + fremd + eigen_ohne_person + fremd_ohne_nummer
               + gegner_doppel

   Darin fehlte `fremd_unveraendert` — also der Zähler, der die
   Gegnerzeilen im NORMALFALL aufnimmt: geschrieben werden sie nur, wenn
   sie sich geändert haben (`matchdatenLauf.ts:274`). Das ist rund die
   Hälfte von `geliefert`.

   **Die Aufteilung ging damit in jedem einzelnen Lauf nicht auf — 25 von
   25 gemessen —, und niemand hat es bemerkt.** Nicht weil jemand
   weggesehen hätte, sondern weil sie nirgends ausgerechnet wurde.
   Aufgefallen ist es erst, als jemand die Formel von Hand in eine
   SQL-Abfrage schrieb.

   > Eine Aufteilung, die sich selbst prüfen soll, tut das nur, wenn
   > jemand sie rechnet.

   Dieselbe Familie wie „ein Kommentar, der eine ANDERE Stelle zusichert":
   die Formel stand in `ergebnisTypen.ts`, gezählt wurde in
   `matchdatenLauf.ts`, und nichts hielt die beiden gegeneinander.

   ── ⚠ UND EIN ZÄHLER FEHLTE GANZ ──────────────────────────────────────

   `verschmelzeAufstellung()` führt auch EIGENE Zeilen zusammen, über
   `p:${sfv_person_id}`. Der Kommentar dort sagte, dieser Zweig könne
   „nicht mehr treffen" — eine Zusicherung über eine FREMDE Quelle.
   Liefert der Verband dieselbe Person zweimal, trifft er doch, und die
   Zeile verschwände still. `eigen_doppel` zählt sie seit dem 23.09.2026.
   ══════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import { aufteilungAufstellung } from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";

/** Ein Lauf, wie ihn das Protokoll führt — erfundene, runde Zahlen. */
function lauf(ueber: Record<string, number> = {}): Record<string, unknown> {
  return {
    aufstellung_geliefert: 330,
    aufstellung_zeilen: 165,
    aufstellung_fremd: 0,
    fremd_unveraendert: 165,
    gegner_doppel: 0,
    eigen_doppel: 0,
    eigen_ohne_person: 0,
    fremd_ohne_nummer: 0,
    ...ueber,
  };
}

describe("aufteilungAufstellung — was geliefert wurde, muss irgendwo landen", () => {
  it("ein sauberer Lauf geht auf", () => {
    const a = aufteilungAufstellung(lauf());
    expect(a.stimmt).toBe(true);
    expect(a.fehlend).toBe(0);
    expect(a.summe).toBe(a.geliefert);
  });

  it("⚠ der Normalfall hat fremd = 0 und fremd_unveraendert > 0 — genau daran ist die alte Formel gescheitert", () => {
    /* 21 von 25 gemessenen Läufen sahen so aus: die Gegnerzeilen waren
       unverändert, wurden also nicht geschrieben. Wer nur `fremd` zählt,
       vermisst hier die Hälfte. */
    const a = aufteilungAufstellung(lauf());
    expect(a.stimmt).toBe(true);
    const ohneUnveraendert = 330 - 165 - 0;
    expect(ohneUnveraendert).toBe(165);   // so viel hätte die alte Formel vermisst
  });

  it("ein Lauf, in dem Gegnerzeilen geschrieben wurden, geht auch auf", () => {
    expect(aufteilungAufstellung(lauf({
      aufstellung_fremd: 13, fremd_unveraendert: 152,
    })).stimmt).toBe(true);
  });

  it("verworfene und verschmolzene Zeilen zählen mit", () => {
    expect(aufteilungAufstellung(lauf({
      fremd_unveraendert: 160,
      eigen_ohne_person: 2, fremd_ohne_nummer: 1,
      gegner_doppel: 1, eigen_doppel: 1,
    })).stimmt).toBe(true);
  });

  it("⚠ eine verschwundene Zeile fällt auf — positives `fehlend`", () => {
    const a = aufteilungAufstellung(lauf({ fremd_unveraendert: 160 }));
    expect(a.stimmt).toBe(false);
    expect(a.fehlend).toBe(5);
  });

  it("⚠ und doppelt Gezähltes ist etwas ANDERES — negatives `fehlend`", () => {
    /* Beides als Betrag auszugeben wäre bequem und falsch: „5 fehlen"
       schickt jemanden nach verlorenen Zeilen suchen, „−5" nach einem
       Zähler, der zweimal zählt. */
    const a = aufteilungAufstellung(lauf({ fremd_unveraendert: 170 }));
    expect(a.stimmt).toBe(false);
    expect(a.fehlend).toBe(-5);
  });

  it("ein fehlendes Feld zählt als 0, nicht als NaN", () => {
    /* Ein NaN in der Summe macht jede Zahl daneben unbrauchbar — die
       Antwort wäre „stimmt nicht" aus dem falschen Grund. */
    const ohne = lauf();
    delete ohne.fremd_unveraendert;
    const a = aufteilungAufstellung(ohne);
    expect(Number.isFinite(a.summe)).toBe(true);
    expect(a.stimmt).toBe(false);
  });

  it("⚠ eine leere Antwort ist kein stiller Erfolg", () => {
    /* 0 = 0 geht auf, und das ist richtig: ein Lauf ohne Spiele hat
       nichts zu verteilen. Der Fall steht hier, damit niemand ihn für
       einen Fehler hält und eine Sonderregel einbaut. */
    expect(aufteilungAufstellung({}).stimmt).toBe(true);
  });
});
