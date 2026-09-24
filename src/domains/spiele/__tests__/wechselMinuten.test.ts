/* ══════════════════════════════════════════════════════════════════════
   Minuten aus dem Verlauf — und die Grenzen, die sie tragbar machen
   25.09.2026

   ⚠ ⚠  DIESE DATEI HAELT DREI ZUSAGEN, NICHT EINE FUNKTION.

   Die Ableitung selbst ist der kleinere Teil. Was sie ueberhaupt
   erlaubt, sind die drei Bedingungen aus CLAUDE.md — und jede davon
   haengt hier an einem Fall, der rot wird, wenn sie faellt:

     1 · nur in der Anzeige, nie in `spiel_aufstellung`
     2 · eigenes Merkmal und eigener Zaehler
     3 · echte Minuten werden nie ueberschrieben

   > eine Zeile, die wir uns selbst ableiten, waere von einer gelieferten
   > nicht mehr zu unterscheiden — und genau diese Ununterscheidbarkeit
   > ist der teuerste Fehler in diesem Papier.  (Didi, 11.09.2026)
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  leiteWechselMinutenAb, findeAufstellungszeile, ableitungsSchluessel,
  zaehleWechselWiderspruch, baueAufstellung, leereAufstellungZahlen,
  TYP_WECHSEL,
  type AufstellungQuelle, type AufstellungZaehlung,
} from "../wpNutzlast.ts";
import { verbandsLinkSpiel } from "../../sfv/verbandslink.ts";
import { verbandsLinkSpiel as ausAdresse } from "../../sfv/verbandsadresse.ts";

/* ── Attrappen ────────────────────────────────────────────────────────
   ⚠ Die drei Minutenfelder werden IMMER ausdruecklich gesetzt. Eine
   Attrappe, die sie erbt, prueft die Vorgabe und nicht die Form — und
   die Form ist hier genau der Gegenstand. */
const zeile = (ueber: Partial<AufstellungQuelle> = {}): AufstellungQuelle => ({
  ist_eigener: true, sfv_person_id: null, name: null,
  rueckennr: 1, position_name: null,
  von_minute: 1, bis_minute: 90, spielzeit: 90,
  rolle_zuweisung_id: 0, ...ueber,
});

/** Platzhalter „stand von Anfang an auf dem Feld" — `1/X/X`. */
const feld = (nr: number, ende = 90, eigen = true) =>
  zeile({ rueckennr: nr, ist_eigener: eigen,
          von_minute: 1, bis_minute: ende, spielzeit: ende });

/** Platzhalter „Bank" — `0/0/0`. ⚠ Null ist nicht `null`. */
const bank = (nr: number, eigen = true) =>
  zeile({ rueckennr: nr, ist_eigener: eigen,
          von_minute: 0, bis_minute: 0, spielzeit: 0 });

const w = (minute: number, raus: number | null, rein: number | null, eigen = true) => ({
  typ_id: TYP_WECHSEL, ist_eigener: eigen, minute, zusatzminute: null,
  rueckennr: raus, ein_rueckennr: rein,
});

/** Die Standardlage: Startelf 7 und 9, Bank 14 und 20, Spielende 90. */
const PLATZHALTER = [feld(7), feld(9), bank(14), bank(20)];

describe("leiteWechselMinutenAb — der Grundfall", () => {
  it("der Ausgewechselte bekommt die Minute des Wechsels als bis_minute", () => {
    const a = leiteWechselMinutenAb([w(63, 7, 14)], PLATZHALTER);
    expect(a.grund).toBeNull();
    expect(a.je_zeile.get(ableitungsSchluessel(true, 7)))
      .toEqual({ von: 1, bis: 63, rolle: "start" });
  });

  it("der Eingewechselte bekommt von_minute, das Spielende und die Rolle", () => {
    const a = leiteWechselMinutenAb([w(63, 7, 14)], PLATZHALTER);
    expect(a.je_zeile.get(ableitungsSchluessel(true, 14)))
      .toEqual({ von: 63, bis: 90, rolle: "eingewechselt" });
  });

  it("wer nicht gewechselt wurde, bekommt gar nichts", () => {
    /* ⚠ Nicht „bekommt dieselben Werte": er steht NICHT in der Karte, und
       damit traegt seine Zeile spaeter `minuten_abgeleitet: false`. */
    const a = leiteWechselMinutenAb([w(63, 7, 14)], PLATZHALTER);
    expect([...a.je_zeile.keys()].sort()).toEqual(["e:14", "e:7"]);
  });

  it("⚠ das SPIELENDE wird gelesen, nicht angenommen — 80 bei Junioren", () => {
    /* Eine harte 90 waere bei 226 gemessenen `1/80/80`-Zeilen
       (CLAUDE.md, 10.09.2026) in jedem Juniorenspiel falsch. */
    const jugend = [feld(7, 80), feld(9, 80), bank(14, true)];
    const a = leiteWechselMinutenAb([w(55, 7, 14)], jugend);
    expect(a.je_zeile.get("e:14")).toEqual({ von: 55, bis: 80, rolle: "eingewechselt" });
  });

  it("mehrere Wechsel werden chronologisch abgearbeitet", () => {
    const a = leiteWechselMinutenAb([w(70, 9, 20), w(46, 7, 14)], PLATZHALTER);
    expect(a.grund).toBeNull();
    expect(a.je_zeile.get("e:14")).toEqual({ von: 46, bis: 90, rolle: "eingewechselt" });
    expect(a.je_zeile.get("e:20")).toEqual({ von: 70, bis: 90, rolle: "eingewechselt" });
    expect(a.je_zeile.get("e:9")).toEqual({ von: 1, bis: 70, rolle: "start" });
  });
});

describe("leiteWechselMinutenAb — der Stand wandert mit", () => {
  it("⚠ wer in der 46. kommt und in der 70. geht, behält seine Kommminute", () => {
    /* ⚠ ⚠  DER GRUND FUER DIE ZUSTANDSFUEHRUNG. Seine Zeile traegt als
       Platzhalter `0/0/0` — eine Pruefung gegen die ROHE Zeile haette ihn
       in der 70. auf der Bank gesehen und einen Widerspruch gemeldet, den
       es nicht gibt. */
    const a = leiteWechselMinutenAb([w(46, 7, 14), w(70, 14, 20)], PLATZHALTER);
    expect(a.grund).toBeNull();
    expect(a.je_zeile.get("e:14"))
      .toEqual({ von: 46, bis: 70, rolle: "eingewechselt" });
  });

  it("und der zweite Eingewechselte bekommt trotzdem das Spielende", () => {
    const a = leiteWechselMinutenAb([w(46, 7, 14), w(70, 14, 20)], PLATZHALTER);
    expect(a.je_zeile.get("e:20")).toEqual({ von: 70, bis: 90, rolle: "eingewechselt" });
  });
});

describe("⚠⚠ die Widerspruchsprüfung verwirft das GANZE Spiel", () => {
  /* ── Der belegte Fall ───────────────────────────────────────────────
     FC Herrliberg 2 – FC Hinwil 1, 12.09.2026. Schon der Spielbericht des
     Verbands zeigt „Robin Jeriha ersetzt durch James Schmid" in der 49. —
     Jeriha steht auf der Bank (und trifft in der 90.+3), Schmid in der
     Startelf. Das Matchblatt ist verkehrt erfasst; unsere Felder geben es
     getreu wieder.

     Wer daraus Minuten ableitet, schreibt den Fehler des Verbands auf eine
     oeffentliche Seite — und macht ihn dabei unkenntlich. */
  const JERIHA = 7;   // Bank
  const SCHMID = 9;   // Startelf
  const hinwil = [feld(SCHMID), feld(11), bank(JERIHA), bank(20)];

  it("ein verdrehtes Matchblatt wird nicht abgeleitet", () => {
    const a = leiteWechselMinutenAb([w(49, JERIHA, SCHMID)], hinwil);
    expect(a.grund).toBe("widerspruch");
  });

  it("⚠ und es wird auch nichts GEDREHT — die Karte bleibt leer", () => {
    /* Die naheliegende „Korrektur" waere, die zwei zu tauschen. Sie waere
       eine Erfindung: wir wissen nicht, wer wirklich kam und wer ging. */
    const a = leiteWechselMinutenAb([w(49, JERIHA, SCHMID)], hinwil);
    expect([...a.je_zeile.keys()]).toEqual([]);
  });

  it("der Befund nennt Minute und Rückennummer — und KEINEN Namen", () => {
    const a = leiteWechselMinutenAb([w(49, JERIHA, SCHMID)], hinwil);
    expect(a.widerspruch).toBe(
      "Wechsel in der 49. (eigen): Nr. 7 soll vom Feld, "
      + "die Aufstellung fuehrt ihn auf der Bank",
    );
  });

  it("⚠ NUR der Ausgewechselte ist falsch — und das genügt", () => {
    /* ⚠ ⚠  DIESER FALL IST DURCH EINE GEGENPROBE ENTSTANDEN, nicht durch
       Nachdenken. Der Hinwil-Fall darueber verletzt BEIDE Haelften der
       Pruefung: Jeriha steht auf der Bank UND Schmid auf dem Feld. Nimmt
       man die erste Haelfte heraus, faengt die zweite ihn weiterhin — und
       die Datei blieb bis auf den Meldungstext gruen.

       Hier geht Nr. 14 vom Feld, obwohl sie auf der Bank sitzt; Nr. 20
       kommt von der Bank, und das ist in Ordnung. Nur die ERSTE Haelfte
       kann das melden. */
    const a = leiteWechselMinutenAb([w(63, 14, 20)], PLATZHALTER);
    expect(a.grund).toBe("widerspruch");
    expect(a.je_zeile.size).toBe(0);
  });

  it("der umgekehrte Fall: der Eingewechselte steht schon auf dem Feld", () => {
    /* Nr. 20 ist auf der Bank und geht — das ist in Ordnung? Nein: 20
       steht auf der Bank, also kann sie nicht vom Feld. Hier statt dessen
       ein sauberer Rausgang und ein Reinkommen von jemandem, der schon
       spielt. */
    const a = leiteWechselMinutenAb([w(60, 7, 9)], PLATZHALTER);
    expect(a.grund).toBe("widerspruch");
    expect(a.widerspruch).toBe(
      "Wechsel in der 60. (eigen): Nr. 9 soll von der Bank, "
      + "die Aufstellung fuehrt ihn auf dem Feld",
    );
  });

  it("⚠ KEINE TEILABLEITUNG — ein guter Wechsel vor einem schlechten zählt nicht", () => {
    /* Der erste Wechsel ist einwandfrei und wuerde zwei Zeilen fuellen.
       Der zweite widerspricht. Beide fallen. */
    const a = leiteWechselMinutenAb(
      [w(46, 7, 14), w(60, 20, 9)], PLATZHALTER,
    );
    expect(a.grund).toBe("widerspruch");
    expect(a.je_zeile.size).toBe(0);
  });

  it("derselbe Spieler kann nicht zweimal eingewechselt werden", () => {
    const a = leiteWechselMinutenAb([w(46, 7, 14), w(70, 9, 14)], PLATZHALTER);
    expect(a.grund).toBe("widerspruch");
  });

  it("⚠⚠ wer ausgewechselt wurde, kommt nicht zurück", () => {
    /* ⚠ ⚠  DER GRUND FUER DEN DRITTEN ZUSTAND. Mit nur „Feld" und „Bank"
       waere Nr. 14 nach der Auswechslung wieder „auf der Bank" — und die
       zweite Einwechslung haette anstandslos gegriffen. Uebrig bliebe
       eine plausibel aussehende Zeile, die nur den zweiten Aufenthalt
       zeigt, und der erste waere spurlos weg. */
    const a = leiteWechselMinutenAb(
      [w(46, 7, 14), w(60, 14, 20), w(75, 9, 14)], PLATZHALTER,
    );
    expect(a.grund).toBe("widerspruch");
    expect(a.widerspruch).toBe(
      "Wechsel in der 75. (eigen): Nr. 14 soll von der Bank, "
      + "die Aufstellung fuehrt ihn als bereits ausgewechselt",
    );
  });

  it("⚠ niemand ersetzt sich selbst", () => {
    /* Derselbe dritte Zustand faengt auch das: die 7 geht vom Feld
       (→ `raus`) und soll im selben Wechsel von der Bank kommen. Mit zwei
       Zustaenden waere sie nach dem ersten Schritt „Bank" gewesen und der
       zweite haette gepasst. */
    const a = leiteWechselMinutenAb([w(63, 7, 7)], PLATZHALTER);
    expect(a.grund).toBe("widerspruch");
    expect(a.je_zeile.size).toBe(0);
  });
});

describe("⚠⚠ echte Minuten werden nie überschrieben", () => {
  it("eine einzige echte Zeile schaltet die ganze Seite ab", () => {
    /* `1/63/62` ist kein Platzhalter: bis und spielzeit gehen auseinander.
       Also hat der Verband hier gemessen — und was er misst, gilt. */
    const echt = [feld(7), zeile({ rueckennr: 9, von_minute: 1, bis_minute: 63, spielzeit: 62 }),
                  bank(14)];
    const a = leiteWechselMinutenAb([w(63, 9, 14)], echt);
    expect(a.grund).toBe("keine_platzhalter");
    expect(a.je_zeile.size).toBe(0);
  });

  it('ein echter Eintrag „eingewechselt“ schaltet die Seite ab', () => {
    const echt = [feld(7), bank(9),
                  zeile({ rueckennr: 14, von_minute: 63, bis_minute: 90, spielzeit: 27 })];
    const a = leiteWechselMinutenAb([w(63, 7, 14)], echt);
    expect(a.grund).toBe("keine_platzhalter");
  });

  it("ohne Wechsel im Verlauf wird nichts abgeleitet", () => {
    const a = leiteWechselMinutenAb([], PLATZHALTER);
    expect(a.grund).toBe("kein_wechsel");
    expect(a.je_zeile.size).toBe(0);
  });

  it("ein Wechsel ohne Minute trägt nichts bei", () => {
    /* ⚠ Er kann nichts beitragen: die Minute IST der abgeleitete Wert. */
    const a = leiteWechselMinutenAb([w(63, 7, 14)].map((x) => ({ ...x, minute: null })),
      PLATZHALTER);
    expect(a.grund).toBe("kein_wechsel");
  });
});

describe("⚠ ohne ablesbares Spielende wird nichts abgeleitet", () => {
  it("keine einzige 1/X/X-Zeile — dann fehlt die Spieldauer", () => {
    const a = leiteWechselMinutenAb([w(63, 14, 20)], [bank(14), bank(20)]);
    expect(a.grund).toBe("kein_spielende");
  });

  it("⚠ zwei verschiedene Spieldauern sind kein Kandidat, sondern keiner", () => {
    /* Dieselbe Regel wie in `baueNummernBruecke()`: bei zwei Kandidaten
       gar keiner. Eine Wahl zwischen 90 und 80 waere geraten. */
    const a = leiteWechselMinutenAb([w(63, 7, 14)], [feld(7, 90), feld(9, 80), bank(14)]);
    expect(a.grund).toBe("kein_spielende");
  });

  it('der Grund ist NICHT „keine_platzhalter“ — das sind zwei Befunde', () => {
    /* „Platzhalter, aber keine Spieldauer" ist ein Befund ueber die
       Quelle; „echte Minuten" ist der Normalfall. Wer sie zusammenzaehlt,
       verliert den seltenen. */
    const a = leiteWechselMinutenAb([w(63, 14, 20)], [bank(14), bank(20)]);
    expect(a.grund).not.toBe("keine_platzhalter");
  });
});

describe("⚠ eine fehlende Zeile ist KEIN Widerspruch", () => {
  it("sie wird gezählt und verwirft das Spiel nicht", () => {
    /* Gemessen am 11.09.2026: `/events` kennt Spieler, die `/players`
       nicht listet — fuenf Faelle in vier Spielen, alle auf der
       Ausgewechselten-Seite. Ein ganzes Spiel dafuer zu verwerfen hiesse,
       eine bekannte Luecke der Quelle wie einen Befund zu behandeln. */
    const a = leiteWechselMinutenAb([w(63, 99, 14)], PLATZHALTER);
    expect(a.grund).toBeNull();
    expect(a.ohne_zeile).toBe(1);
    expect(a.je_zeile.get("e:14")).toEqual({ von: 63, bis: 90, rolle: "eingewechselt" });
  });

  it("⚠ eine doppelte Nummer gilt als fehlend, nicht als erster Treffer", () => {
    /* Bei zwei eigenen Mannschaften gegeneinander stehen beide Kader unter
       derselben `spiel_id` — dann gibt es die 7 zweimal. Ein Stand, der
       raet, laesst einen Wechsel plausibel aussehen, der es nicht ist. */
    const doppelt = [feld(7), feld(7), bank(14)];
    const a = leiteWechselMinutenAb([w(63, 7, 14)], doppelt);
    expect(a.ohne_zeile).toBe(1);
    expect(a.je_zeile.has("e:7")).toBe(false);
  });
});

describe("⚠⚠ die Seiten sind zwei unabhängige Lagen", () => {
  const beide = [feld(7), bank(14), feld(7, 90, false), bank(14, false)];

  it("ein Wechsel des Gegners trifft nur Gegnerzeilen", () => {
    /* ⚠ Dieselbe Grenze wie bei der Nummern-Bruecke, und dort hat ihr
       Fehlen am 11.09.2026 unsere Namen auf die Gegnerseite gesetzt. Die
       7 gibt es hier auf BEIDEN Seiten. */
    const a = leiteWechselMinutenAb([w(63, 7, 14, false)], beide);
    expect([...a.je_zeile.keys()].sort()).toEqual(["f:14", "f:7"]);
  });

  it("eine Seite mit echten Minuten schaltet die andere NICHT ab", () => {
    const gemischt = [
      feld(7), bank(14),
      zeile({ rueckennr: 3, ist_eigener: false, von_minute: 63, bis_minute: 90, spielzeit: 27 }),
      feld(5, 90, false),
    ];
    const a = leiteWechselMinutenAb([w(63, 7, 14)], gemischt);
    expect(a.grund).toBeNull();
    expect(a.je_zeile.get("e:14")).toEqual({ von: 63, bis: 90, rolle: "eingewechselt" });
  });

  it("⚠ und ein Widerspruch auf der ECHTEN Seite verwirft nichts", () => {
    /* Eine Seite mit echten Minuten, die dem Verlauf widerspricht, zaehlt
       `zaehleWechselWiderspruch()`. Dafuer die andere Seite zu bestrafen
       hiesse, sie fuer einen Befund haften zu lassen, der sie nichts
       angeht. */
    const gemischt = [
      feld(7), bank(14),
      zeile({ rueckennr: 3, ist_eigener: false, von_minute: 63, bis_minute: 90, spielzeit: 27 }),
      feld(5, 90, false),
    ];
    const a = leiteWechselMinutenAb([w(63, 7, 14), w(70, 5, 3, false)], gemischt);
    expect(a.grund).toBeNull();
    expect(a.je_zeile.get("e:7")).toEqual({ von: 1, bis: 63, rolle: "start" });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Das Merkmal an der Zeile — Bedingung 2 aus CLAUDE.md
   ══════════════════════════════════════════════════════════════════════ */
describe("⚠⚠ baueAufstellung weist abgeleitete Zeilen als solche aus", () => {
  const keine = new Map<string, AufstellungZaehlung>();
  const keineNamen = new Map<number, string>();

  const bauen = (zeilen: AufstellungQuelle[], ereignisse: ReturnType<typeof w>[]) => {
    const zahlen = leereAufstellungZahlen();
    const a = leiteWechselMinutenAb(ereignisse, zeilen);
    const gebaut = baueAufstellung(zeilen, keine, true, keineNamen, zahlen, a.je_zeile);
    return { zahlen, gebaut, a };
  };

  it("die abgeleitete Zeile trägt minuten_abgeleitet und die neue Rolle", () => {
    const { gebaut } = bauen(PLATZHALTER, [w(63, 7, 14)]);
    const rein = gebaut.find((x) => x.nummer === 14)!;
    expect(rein).toMatchObject({
      rolle: "eingewechselt", von_minute: 63, bis_minute: 90,
      minuten_abgeleitet: true,
    });
  });

  it("⚠ spielzeit steht auf null, nicht auf der gelieferten 0", () => {
    /* Sie wird ausdruecklich NICHT gerechnet: die Rechnung des Verbands
       ist uneinig (1/90/90 → 90, aber 40/80/40 → 40). Eine 0 neben
       `von 63 / bis 90` waere ein Widerspruch in derselben Zeile. */
    const { gebaut } = bauen(PLATZHALTER, [w(63, 7, 14)]);
    expect(gebaut.find((x) => x.nummer === 14)!.spielzeit).toBeNull();
  });

  it("der Ausgewechselte behält die Rolle start und bekommt sein Ende", () => {
    const { gebaut } = bauen(PLATZHALTER, [w(63, 7, 14)]);
    expect(gebaut.find((x) => x.nummer === 7)).toMatchObject({
      rolle: "start", von_minute: 1, bis_minute: 63, minuten_abgeleitet: true,
    });
  });

  it("⚠ jede unberührte Zeile trägt false — nie undefined", () => {
    /* Ein fehlendes Feld hiesse „nicht gefragt", und das ist etwas
       anderes als „vom Verband". */
    const { gebaut } = bauen(PLATZHALTER, [w(63, 7, 14)]);
    const unberuehrt = gebaut.find((x) => x.nummer === 9)!;
    expect(unberuehrt.minuten_abgeleitet).toBe(false);
    expect(unberuehrt).toMatchObject({ von_minute: 1, bis_minute: 90, spielzeit: 90 });
  });

  it("⚠ der Zähler steht immer da — auch als Null", () => {
    const ohne = bauen(PLATZHALTER, []);
    expect(ohne.zahlen.minuten_abgeleitet).toBe(0);
    const mit = bauen(PLATZHALTER, [w(63, 7, 14)]);
    expect(mit.zahlen.minuten_abgeleitet).toBe(2);
  });

  it("⚠ die Zähler der QUELLE bleiben an der Quelle hängen", () => {
    /* `rollen` beschreibt, was der Verband geliefert hat. Sie auf die
       abgeleiteten Werte umzustellen hiesse, den Befund mit der Reparatur
       zu loeschen — dieselbe Regel wie bei `unplausibel` nach
       `korrigiereMinuten()`. */
    const { zahlen } = bauen(PLATZHALTER, [w(63, 7, 14)]);
    expect(zahlen.rollen).toEqual({ start: 2, eingewechselt: 0, nicht_eingesetzt: 2 });
  });

  it("ein verworfenes Spiel liefert keine einzige abgeleitete Zeile", () => {
    const hinwil = [feld(9), feld(11), bank(7), bank(20)];
    const { gebaut, zahlen } = bauen(hinwil, [w(49, 7, 9)]);
    expect(zahlen.minuten_abgeleitet).toBe(0);
    expect(gebaut.every((x) => x.minuten_abgeleitet === false)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Der gemeinsame Nachschlag — eine Regel, zwei Leser
   ══════════════════════════════════════════════════════════════════════ */
describe("findeAufstellungszeile", () => {
  it("findet die Zeile derselben Seite", () => {
    const t = findeAufstellungszeile([feld(7), feld(7, 90, false)], true, 7);
    expect(t?.ist_eigener).toBe(true);
  });

  it("⚠ bei zwei Kandidaten derselben Seite gar keiner", () => {
    expect(findeAufstellungszeile([feld(7), feld(7)], true, 7)).toBeNull();
  });

  it("ohne Nummer gibt es nichts nachzuschlagen", () => {
    expect(findeAufstellungszeile([feld(7)], true, null)).toBeNull();
  });
});

describe("⚠ zaehleWechselWiderspruch folgt derselben Regel", () => {
  /* ⚠ ⚠  HIER STAND EIN `.find()`, und das nimmt den ERSTEN von zweien:
     bei einer doppelten Nummer wurde ein Widerspruch gegen
     moeglicherweise die falsche Person gezaehlt. Seit dem 25.09.2026
     benutzen beide Stellen denselben Nachschlag. */
  const wechsel = [{ typ_id: TYP_WECHSEL, subtyp_id: null,
                     ist_eigener: true, ein_rueckennr: 7 }];

  it("eine eindeutige Zeile wird weiterhin gezählt", () => {
    const z = zaehleWechselWiderspruch(wechsel, [feld(7), bank(14)]);
    expect(z.eigen_als_start).toBe(1);
  });

  it("⚠ eine doppelte Nummer wird NICHT gezählt", () => {
    const z = zaehleWechselWiderspruch(wechsel, [feld(7), feld(7)]);
    expect(z.eigen_als_start).toBe(0);
  });

  it("die Zahlen bleiben nach Seite und Muster getrennt", () => {
    const z = zaehleWechselWiderspruch(wechsel, [bank(7)]);
    expect(z).toEqual({
      eigen_als_start: 0, eigen_als_nicht_eingesetzt: 1,
      fremd_als_start: 0, fremd_als_nicht_eingesetzt: 0,
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Der Link zum Spielbericht

   ⚠ Er liegt in `src/domains/sfv/verbandslink.ts` — der EINEN Stelle fuer
   Verbandsadressen. Geprueft wird er hier, weil die Meldung der
   verworfenen Spiele ihn braucht und sonst niemand.
   ══════════════════════════════════════════════════════════════════════ */
describe("verbandsLinkSpiel", () => {
  it("baut die Adresse des Spielberichts über tg", () => {
    expect(verbandsLinkSpiel(4393132)).toBe(
      "https://matchcenter.fvrz.ch/default.aspx"
      + "?lng=1&cxxlnus=1&v=253&a=tg&tg=4393132&bn=0",
    );
  });

  it("⚠ v=253 ist die ANSICHT und kommt nicht aus vereine", () => {
    /* In `verbandsLinkTeam()` traegt derselbe Buchstabe die ClubId (1516).
       Wer die eine Adresse aus der anderen ableitet, baut einen Link auf
       einen fremden Verein. */
    expect(verbandsLinkSpiel(4393132)).toContain("v=253");
    expect(verbandsLinkSpiel(4393132)).not.toContain("oid=");
  });

  it("⚠⚠ es ist EINE Fassung, keine Kopie", () => {
    /* ⚠ Der Spielbericht liegt in `verbandsadresse.ts`, weil eine Edge
       Function `verbandslink.ts` nicht anfassen kann: die importiert
       `Tables` aus `src/types.ts`, und `deno check` bricht daran mit
       `TS2503 Cannot find namespace 'React'` ab (gemessen 25.09.2026).

       `verbandslink.ts` reicht dieselbe Funktion weiter. Waere es eine
       zweite Fassung, liefen die beiden auseinander — und genau das ist
       der Fehler, den dieses Projekt am haeufigsten bezahlt. Der Fall
       haelt fest, dass es DASSELBE Funktionsobjekt ist. */
    expect(verbandsLinkSpiel).toBe(ausAdresse);
  });

  it("ohne Match-Id kein halber Link", () => {
    expect(verbandsLinkSpiel(null)).toBeNull();
    expect(verbandsLinkSpiel(undefined)).toBeNull();
    expect(verbandsLinkSpiel("")).toBeNull();
    /* ⚠ `Number(0)` ist endlich — eine fehlende Angabe darf nicht zur
       Zahl Null werden und `tg=0` ergeben. */
    expect(verbandsLinkSpiel(0)).toBeNull();
  });
});
