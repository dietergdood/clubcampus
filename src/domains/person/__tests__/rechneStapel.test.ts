/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/__tests__/rechneStapel.test.ts

   Die Regel der Sammellöschung: ein Kind ohne Kontakt zu
   hinterlassen ist nicht erlaubt.

   ⚠ ZWEI ENTSCHEIDUNGEN WERDEN HIER FESTGEHALTEN, und beide sind an
   einer Messung entstanden, nicht am Nachdenken:

   1. Die Folgen werden über den STAPEL gerechnet, nicht pro Person.
      Lea Brunner hat zwei Elternteile; stehen beide im Stapel, sagt
      JEDE Einzelvorschau „behält 1" und keine warnt. Genau das kann
      eine Sammelaktion, was n Einzellöschungen nicht können — und
      genau deshalb wurde der Zuschnitt nicht verkleinert.

   2. Die Regel gilt nur, wo ein Kontakt gebraucht wird
      (`braucht_kontakt`: aktive Mitgliedschaft UND ein Mitgliedtyp
      mit `hauptkontakt_pflicht`). Bei einem ausgetretenen Kind ist
      „ohne Kontakt" das Ziel, nicht das Problem. Im Bestand hängen
      daran zwei Kinder, deren Elternteile sonst DAUERHAFT unlöschbar
      wären.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { rechneStapel } from "../loeschService.ts";
import type { StapelEintrag } from "../loeschService.ts";
import type { Vorschau, KindFolge } from "../../../../supabase/functions/person-loeschen/vorschau.ts";

/** Eine Vorschau, wie sie die Edge Function liefert — nur das Nötige. */
function vorschau(name: string, kinder: KindFolge[], blockiert: Vorschau["blockiert"] = []): Vorschau {
  return {
    person: { id: `p-${name}`, name, email: null, aktive_mitgliedschaften: 0, hat_konto: false },
    faellt: [{ tabelle: "eltern_kinder_als_elternteil", anzahl: kinder.length }],
    anonym: [], blockiert,
    kinder,
    geprueft_leer: 0, nicht_pruefbar: [], zahlen: {},
  } as unknown as Vorschau;
}

function eintrag(name: string, kinder: KindFolge[], blockiert: Vorschau["blockiert"] = []): StapelEintrag {
  return { personId: `p-${name}`, name, vorschau: vorschau(name, kinder, blockiert), abdruck: "x" };
}

/** Ein Kind, wie die Einzelvorschau es sieht: `verbleibende_eltern` = gesamt − 1. */
const kind = (id: number, name: string, verbleibend: number, opt: Partial<KindFolge> = {}): KindFolge => ({
  mitglied_id: id, name, verbleibende_eltern: verbleibend,
  war_hauptkontakt: false, braucht_kontakt: true, ...opt,
});

describe("rechneStapel — die Nettorechnung über den Stapel", () => {
  it("⚠ zwei Elternteile desselben Kindes: jede Einzelvorschau sagt behaelt 1, der Stapel sagt 0", () => {
    /* Der gemessene Fall (Lea Brunner, 25.08.2026). Ohne diese Rechnung
       liefe die Löschung durch, weil KEINE der beiden Vorschauen etwas sieht. */
    const b = rechneStapel([
      eintrag("Petra", [kind(1, "Lea Brunner", 1)]),
      eintrag("Reto",  [kind(1, "Lea Brunner", 1)]),
    ]);

    expect(b.kinder).toHaveLength(1);
    expect(b.kinder[0].verbleibende_eltern).toBe(0);
    expect(b.kinder[0].im_stapel).toBe(2);
    expect(b.ohneKontakt.map(k => k.name)).toEqual(["Lea Brunner"]);
    /* BEIDE Elternteile sind gesperrt — nicht nur der zweite. */
    expect(b.gesperrt.map(g => g.eintrag.name).sort()).toEqual(["Petra", "Reto"]);
    expect(b.loeschbar).toEqual([]);
  });

  it("vier Elternteile, einer im Stapel: das Kind erscheint NICHT im Auftrag", () => {
    /* Adrian Bürgi, dieselbe Messung. Die Gegenrichtung: ein fallender
       Elternteil ist kein Grund, wenn drei bleiben. */
    const b = rechneStapel([eintrag("Marco", [kind(2, "Adrian Bürgi", 3)])]);
    expect(b.ohneKontakt).toEqual([]);
    expect(b.gesperrt).toEqual([]);
    expect(b.loeschbar.map(e => e.name)).toEqual(["Marco"]);
  });

  it("⚠ EIN Kontakt für das Kind entsperrt BEIDE Elternteile — deshalb nach Kind gruppiert", () => {
    /* Nach Person gruppiert stünde derselbe Auftrag zweimal da. */
    const b = rechneStapel([
      eintrag("Petra", [kind(1, "Lea Brunner", 1)]),
      eintrag("Reto",  [kind(1, "Lea Brunner", 1)]),
    ]);
    expect(b.ohneKontakt).toHaveLength(1);
    expect(b.ohneKontakt[0].eltern.map(e => e.name).sort()).toEqual(["Petra", "Reto"]);
  });
});

describe("⚠ Die Regel gilt nur, wo ein Kontakt gebraucht wird", () => {
  it("ein AUSGETRETENES Kind sperrt nicht — sonst wäre sein Elternteil dauerhaft unlöschbar", () => {
    /* Andrea Furrer und Andrea Frei im Bestand: ausgetreten, je ein
       Elternteil. „Ohne Kontakt" ist dort das Ziel. */
    const b = rechneStapel([
      eintrag("Patrick", [kind(3, "Andrea Furrer", 0, { braucht_kontakt: false })]),
    ]);
    expect(b.kinder[0].verbleibende_eltern).toBe(0);   // die Folge steht trotzdem da
    expect(b.ohneKontakt).toEqual([]);                  // aber sie sperrt nicht
    expect(b.loeschbar.map(e => e.name)).toEqual(["Patrick"]);
  });

  it("⚠ `verbleibende_eltern === 0` allein genügt NICHT — beide Bedingungen zählen", () => {
    /* Gegenprobe zum Fall darüber: dieselbe Zahl, anderes Merkmal, andere
       Entscheidung. Ohne diesen Fall liesse sich die zweite Bedingung
       entfernen, ohne dass etwas rot wird. */
    const ohne = rechneStapel([eintrag("A", [kind(4, "K", 0, { braucht_kontakt: false })])]);
    const mit  = rechneStapel([eintrag("A", [kind(4, "K", 0, { braucht_kontakt: true })])]);
    expect(ohne.gesperrt).toEqual([]);
    expect(mit.gesperrt).toHaveLength(1);
  });
});

describe("⚠ Gesperrt heisst gesperrt — ein Trotzdem gibt es nicht", () => {
  it("blockierte Personen fallen VOR dem Lauf heraus, mit Grund", () => {
    /* Ein Abbruch mitten im Lauf, den die Vorschau schon kannte, ist der
       schlechteste von allen. */
    const b = rechneStapel([
      eintrag("Autor", [], [{ tabelle: "nachrichten", anzahl: 3 }]),
    ]);
    expect(b.loeschbar).toEqual([]);
    expect(b.gesperrt[0].grund.art).toBe("blockiert");
    expect(b.gesperrt[0].grund).toMatchObject({ text: "nachrichten (3)" });
  });

  it("eine fehlgeschlagene Vorschau sperrt ebenfalls — sie wird nicht übergangen", () => {
    const b = rechneStapel([{ personId: "p-X", name: "X", fehler: "Nicht lesbar" }]);
    expect(b.loeschbar).toEqual([]);
    expect(b.gesperrt[0].grund.art).toBe("unlesbar");
  });

  it("⚠ rechneStapel nimmt KEINE Ausnahmeliste entgegen", () => {
    /* Der zweite Entwurf (24.08.2026) hatte ein `dazugenommen: Set<string>`,
       mit dem sich die Sperre pro Person aufheben liess. Er ist an der
       Messung gescheitert: wenn fast jeder Stapel bei „0 löschbar" landet,
       wird „Trotzdem" zur Routine. Dieser Fall hält fest, dass der Parameter
       nicht zurückkommt — sonst schleicht sich die weiche Sperre wieder ein. */
    expect(rechneStapel.length).toBe(1);
  });
});

describe("Zeilen und Reihenfolge", () => {
  it("zählt nur die Zeilen der LÖSCHBAREN, nicht der gesperrten", () => {
    const b = rechneStapel([
      eintrag("Frei",     [kind(9, "Grosses Kind", 2)]),          // löschbar, 1 Zeile
      eintrag("Gesperrt", [kind(1, "Lea Brunner", 0)]),           // gesperrt
    ]);
    expect(b.loeschbar.map(e => e.name)).toEqual(["Frei"]);
    expect(b.zeilen).toBe(1);
  });
});
