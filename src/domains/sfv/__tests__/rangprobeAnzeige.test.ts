/* ═══════════════════════════════════════════════════════════════
   deuteRangprobe — die drei Lagen, und keine sieht wie eine andere aus.

   ⚠ ANLASS, 14.09.2026. `gruppen_ohne_spiele` meldete 0, während auf
   sieben Teamseiten die Tabelle nachhinkte. Die Zahl war nicht
   falsch — sie beantwortete eine andere Frage: „führt der Verband
   den Stand dieser Gruppe überhaupt?" statt „hinkt UNSERE Zeile
   nach?".

   > Eine Zahl ohne Bezugsgrösse ist ein Artefakt. „0 Gruppen ohne
   > Spiele" kann heissen „alle Gruppen haben Spiele" oder „keine
   > Gruppe wurde geprüft." (Theme-Chat, 14.09.2026)
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { deuteRangprobe } from "../rangprobeAnzeige.ts";

/* ⚠ Die Zahlen sind ERFUNDEN und runde Werte. In einer Attrappe ist
   das richtig — sie ist eine Vorgabe, keine Behauptung. Sie soll aber
   nicht die echte Messreihe abschreiben: der nächste Leser hielte sie
   sonst für einen Stand. */
const BASIS = {
  gruppen_gesamt: 20, zeilen_gesamt: 240, zeilen_je_gruppe: 12,
  zeilen_ohne_gruppennummer: 0, gruppen_ohne_spiele: 0, gruppen: [],
};
const zus = (t: string[]) => t.join(" | ");

describe("die eigene Zeile steht VOR der Gruppenzahl", () => {
  it("meldet nachhinkende eigene Mannschaften, obwohl keine Gruppe leer ist", () => {
    /* ⚠ ⚠ DER FALL, DER DEN UMBAU AUSGELÖST HAT. Keine Gruppe steht
       ganz auf null — und zwei unserer Mannschaften doch. Vorher war
       die Antwort auf beides „0". */
    const t = deuteRangprobe({
      ...BASIS,
      eigene_erkennbar: true, eigene_zeilen_gesamt: 20,
      eigene_ohne_spiele: 2, eigene_ohne_zahl: 0,
      eigene: [
        { team: "Senioren 40+", liga: "Senioren 40+", anzahl_spiele: 0,
          bestand_spiele: 0, gespielt_laut_spielplan: 2 },
        { team: "FC Herrliberg 3", liga: "5. Liga", anzahl_spiele: 0,
          bestand_spiele: 0, gespielt_laut_spielplan: 1 },
        { team: "FC Herrliberg 1", liga: "3. Liga", anzahl_spiele: 4,
          bestand_spiele: 4, gespielt_laut_spielplan: 4 },
      ],
    });
    expect(zus(t)).toMatch(/⚠ 2 von 20 eigenen Mannschaften stehen auf null Spielen/);
    /* Namentlich, nicht nur gezählt — sonst sucht jemand 20 Zeilen durch. */
    /* ⚠ DREI ZAHLEN NEBENEINANDER — eine allein zeigt immer auf die
       andere Seite. */
    expect(zus(t)).toMatch(/Senioren 40\+ · Senioren 40\+ — frisch 0 · bei uns \d/);
    /* Auch die gesunde erscheint: eine Liste, die nur Befunde zeigt,
       lässt offen, ob überhaupt gemessen wurde. */
    expect(zus(t)).toMatch(/FC Herrliberg 1 · 3\. Liga — frisch 4/);
  });

  it("die eigene Aussage steht VOR der Gruppenaussage", () => {
    /* ⚠ Die Reihenfolge ist der Punkt, nicht bloss Geschmack: die
       Kopfzahl „0 Gruppen ohne Spiele" hat am 14.09.2026 das Detail
       daneben erstickt. Wer zuerst eine Beruhigung liest, liest nicht
       weiter. */
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 20,
      eigene_ohne_spiele: 2, eigene_ohne_zahl: 0, eigene: [],
    });
    const eig = t.findIndex(z => /eigenen Mannschaften/.test(z));
    const gru = t.findIndex(z => /JEDE Mannschaft auf null/.test(z));
    expect(eig).toBeGreaterThanOrEqual(0);
    expect(gru).toBeGreaterThan(eig);
  });

  it("die Gruppenzahl nennt ihren eigenen Zuschnitt", () => {
    /* Eine Prüfung, die ihren Zuschnitt nennt, kann nicht für mehr
       genommen werden, als sie ist. */
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 20,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, eigene: [],
    });
    expect(zus(t)).toMatch(/sagt nichts darüber, ob wir nachhinken/);
  });
});

describe("drei Lagen, drei Sätze", () => {
  it("ohne Clubnummer: NICHT als „0 ohne Spiele\"", () => {
    /* ⚠ Ohne `vereine.sfv_club_nummer` kann die Probe unsere Zeilen
       gar nicht finden. Eine Null wäre hier die glatte Lüge — genau
       die Einebnung, die am 11.09.2026 drei Nullen für 129 Personen
       stehen liess. */
    const t = deuteRangprobe({ ...BASIS, eigene_erkennbar: false });
    expect(zus(t)).toMatch(/NICHT erkennbar/);
    expect(zus(t)).not.toMatch(/eigenen Mannschaften stehen auf null/);
    expect(zus(t)).not.toMatch(/0 davon auf null Spielen/);
  });

  it("aeltere Function: nicht gemeldet, nicht null", () => {
    const t = deuteRangprobe(BASIS);
    expect(zus(t)).toMatch(/nicht gemeldet — die Edge Function ist älter/);
    expect(zus(t)).not.toMatch(/0 davon auf null Spielen/);
  });

  it("alles in Ordnung: die Null steht da, mit Bezugsgroesse", () => {
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 20,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, eigene: [],
    });
    expect(zus(t)).toMatch(/20 eigene Mannschaften in der Tabelle, 0 davon auf null/);
  });

  it("keine Spielzahl ist nicht null Spiele", () => {
    /* ⚠ `null` heisst „der Verband nennt keine Zahl", `0` heisst
       „null Spiele". Die zwei zusammenzuwerfen wäre der Fehler,
       gegen den der ganze Umbau gebaut ist. */
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 20,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 3,
      eigene: [{ team: "Ea-Junioren", liga: "Junioren E", anzahl_spiele: null,
                 bestand_spiele: null, gespielt_laut_spielplan: 0 }],
    });
    expect(zus(t)).toMatch(/3 eigene Zeilen ohne jede Spielzahl/);
    expect(zus(t)).toMatch(/Ea-Junioren · Junioren E — frisch keine Spielzahl/);
  });
});

describe("die Gegenprobe zum Gruppenschluessel bleibt", () => {
  it("meldet einen kollabierten Schluessel", () => {
    /* 232 / 8 ist keine Tabelle — so ist die dreiteilige erste Fassung
       der Probe aufgefallen. */
    const t = deuteRangprobe({ ...BASIS, zeilen_je_gruppe: 29 });
    expect(zus(t)).toMatch(/29 Mannschaften je Gruppe — das ist keine Tabelle/);
  });

  it("und schweigt nicht, wenn er traegt", () => {
    expect(zus(deuteRangprobe(BASIS))).toMatch(/12 je Gruppe — in der Grösse einer Tabelle/);
  });

  it("kuerzt die eigenen nicht still", () => {
    /* Was weggelassen wird, wird GENANNT. Eine stille Kürzung liest
       sich wie Vollständigkeit. */
    const viele = Array.from({ length: 21 }, (_, i) =>
      ({ team: `T${i}`, liga: "L", anzahl_spiele: 4 }));
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 21,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, eigene: viele,
    });
    expect(zus(t)).toMatch(/… und 13 weitere \(siehe Rohantwort\)/);
  });
});

describe("welche Seite hinkt — die Frage vom 14.09.2026", () => {
  /* ⚠ ⚠ DIE ZWEI LAGEN SAHEN VORHER GLEICH AUS. „Die Tabelle zeigt 3"
     konnte heissen, der Verband führe den alten Stand — oder unsere
     Zwischenspeicherung sei alt. Erst der frische Abruf NEBEN dem
     Bestand trennt sie, und die Probe ist die einzige Stelle, an der
     beide Zahlen gleichzeitig vorliegen. */
  const mit = (ueber: Record<string, unknown>) => deuteRangprobe({
    ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 1,
    eigene_ohne_spiele: 0, eigene_ohne_zahl: 0,
    bestand_hinkt: 0, verband_hinkt: 0, eigene: [], ...ueber,
  });

  it("unser Bestand ist alt — ein Sync genuegt", () => {
    const t = mit({ bestand_hinkt: 7, eigene: [
      { team: "FC Herrliberg 1", liga: "2. Liga", anzahl_spiele: 4,
        bestand_spiele: 3, gespielt_laut_spielplan: 4 },
    ] });
    expect(zus(t)).toMatch(/7 Mannschaften: UNSER Bestand ist älter/);
    expect(zus(t)).not.toMatch(/der VERBAND führt in seiner Tabelle weniger/);
    /* Die drei Zahlen nebeneinander machen es nachvollziehbar. */
    expect(zus(t)).toMatch(/frisch 4 · bei uns 3 · Spielplan 4/);
  });

  it("der Verband rechnet seine Tabelle nicht nach", () => {
    const t = mit({ verband_hinkt: 2, eigene: [
      { team: "Senioren 40+", liga: "Senioren 40+", anzahl_spiele: 0,
        bestand_spiele: 0, gespielt_laut_spielplan: 2 },
    ] });
    expect(zus(t)).toMatch(/2 Mannschaften: der VERBAND führt in seiner Tabelle weniger/);
    expect(zus(t)).not.toMatch(/UNSER Bestand ist älter/);
  });

  it("beide zugleich — dann stehen beide Sätze da", () => {
    /* Die Kombination ist selbst eine Auskunft; eine Auswahl daraus
       wäre eine Deutung, die die Probe nicht treffen darf. */
    const t = mit({ bestand_hinkt: 1, verband_hinkt: 3 });
    expect(zus(t)).toMatch(/UNSER Bestand ist älter/);
    expect(zus(t)).toMatch(/der VERBAND führt in seiner Tabelle weniger/);
  });

  it("einig heisst einig, und es steht da", () => {
    /* ⚠ Auch der gute Fall bekommt einen Satz. „Nichts gemeldet" und
       „geprüft und in Ordnung" dürfen nicht gleich aussehen. */
    expect(zus(mit({}))).toMatch(/sind sich einig/);
  });

  it("aeltere Function: nicht gemessen, nicht einig", () => {
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 1,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, eigene: [],
    });
    expect(zus(t)).toMatch(/Welche Seite nachhinkt: nicht gemessen/);
    expect(zus(t)).not.toMatch(/sind sich einig/);
  });

  it("keine Zeile bei uns ist nicht null Spiele", () => {
    /* ⚠ `bestand_spiele: null` heisst „wir haben dazu keine Zeile" —
       eine fehlende Gruppe, nicht ein Rückstand. */
    const t = mit({ eigene: [
      { team: "Ea-Junioren", liga: "Junioren E", anzahl_spiele: 3,
        bestand_spiele: null, gespielt_laut_spielplan: 3 },
    ] });
    expect(zus(t)).toMatch(/frisch 3 · bei uns keine Zeile · Spielplan 3/);
  });
});

describe("Vollstaendigkeit der Lieferung", () => {
  const mitTeams = (ueber: Record<string, unknown>) => deuteRangprobe({
    ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 1,
    eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, bestand_hinkt: 0,
    verband_hinkt: 0, eigene: [], teams_mit_nummer_gesamt: 21, ...ueber,
  });

  it("meldet Mannschaften ohne Tabellenzeile namentlich", () => {
    const t = mitTeams({ teams_ohne_tabellenzeile: ["Ea-Junioren (38310)"] });
    expect(zus(t)).toMatch(/1 von 21 zugeordneten Mannschaften stehen in KEINER Tabelle/);
    expect(zus(t)).toMatch(/Ea-Junioren \(38310\)/);
  });

  it("der gute Fall steht ebenfalls da", () => {
    const t = mitTeams({ teams_ohne_tabellenzeile: [] });
    expect(zus(t)).toMatch(/Alle 21 zugeordneten Mannschaften stehen in einer Tabelle/);
  });

  it("aeltere Function: nicht gemessen", () => {
    expect(zus(mitTeams({}))).toMatch(/Vollständigkeit: nicht gemessen/);
  });

  it("kuerzt nicht still", () => {
    const viele = Array.from({ length: 12 }, (_, i) => `T${i} (${i})`);
    const t = mitTeams({ teams_ohne_tabellenzeile: viele });
    expect(zus(t)).toMatch(/… und 4 weitere \(siehe Rohantwort\)/);
  });
});

describe("war der Ranglisten-Block uebersprungen?", () => {
  /* ⚠ Abfrage 5 als stehende Auskunft statt als einmaliges SQL. Der
     Block lag bis zum 14.09.2026 hinter vier Würfen des Spielplans;
     lief einer, wurde keine Zeile geschrieben — und nichts sagte es. */
  const mit = (ueber: Record<string, unknown>) => deuteRangprobe({
    ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 1,
    eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, bestand_hinkt: 0,
    verband_hinkt: 0, eigene: [], ...ueber,
  });

  it("meldet einen uebersprungenen Block", () => {
    expect(zus(mit({ ranglisten_rueckstand_minuten: 4000 })))
      .toMatch(/⚠ Der Ranglisten-Stand ist 4000 Minuten älter.*übersprungen/);
  });

  it("der gute Fall steht ebenfalls da", () => {
    /* ⚠ Auch die Null bekommt einen Satz. „Nichts gemeldet" und
       „geprüft und in Ordnung" dürfen nicht gleich aussehen. */
    expect(zus(mit({ ranglisten_rueckstand_minuten: 3 })))
      .toMatch(/3 Minuten älter als der letzte ok-Lauf — der Block läuft/);
  });

  it("unterscheidet drei Lagen, nicht zwei", () => {
    /* `undefined` = alte Function · `null` = kein ok-Lauf vorhanden ·
       Zahl = gemessen. Keine davon darf wie eine andere aussehen. */
    expect(zus(mit({}))).toMatch(/nicht gemeldet — die Edge Function/);
    expect(zus(mit({ ranglisten_rueckstand_minuten: null })))
      .toMatch(/nicht feststellbar — es gibt keinen abgeschlossenen ok-Lauf/);
    expect(zus(mit({ ranglisten_rueckstand_minuten: null })))
      .not.toMatch(/der Block läuft/);
  });
});

describe("die Aufschluesselung loest eine Abweichung auf", () => {
  /* ⚠ ⚠ DER ERSTE ECHTE TREFFER DER GEGENPROBE, 14.09.2026: Juniorinnen C,
     Verband 3, unser Zähler 2. Zwei Befunde sehen gleich aus — ein Forfait,
     das unser Filter auslässt, oder ein Spiel, das uns fehlt. Nur der zweite
     ist einer. */
  const mit = (zeile: Record<string, unknown>) => deuteRangprobe({
    ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 1,
    eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, bestand_hinkt: 0,
    verband_hinkt: 0, eigene: [{
      team: "Juniorinnen C b", liga: "Juniorinnen C",
      anzahl_spiele: 3, bestand_spiele: 3, gespielt_laut_spielplan: 2, ...zeile,
    }],
  });

  it("nennt die Status im Klartext, wenn die Zahlen abweichen", () => {
    const t = zus(mit({ spielplan_nach_status: { "2": 2, "3": 1 } }));
    expect(t).toMatch(/Verband 3, unser Zähler 2 — im Spielplan:/);
    expect(t).toMatch(/2× Status 2 \(ausgetragen\)/);
    expect(t).toMatch(/1× Status 3 \(forfait\)/);
  });

  it('trennt „unser Filter“ von „uns fehlt ein Spiel“', () => {
    /* ⚠ Der Satz, der die zwei Befunde trennt. Ohne ihn schliesst der
       Leser selbst — und die Hälfte der Fehlschlüsse dieser Woche entstand
       genau so. */
    expect(zus(mit({ spielplan_nach_status: { "2": 2, "3": 1 } })))
      .toMatch(/Andere Status dabei — sie zählen für die Tabelle des Verbands/);
    expect(zus(mit({ spielplan_nach_status: { "2": 2 } })))
      .toMatch(/Nur Status 2 — dann fehlt uns wirklich ein Spiel/);
  });

  it("schweigt, wenn die Zahlen uebereinstimmen", () => {
    /* ⚠ Die Aufschlüsselung ist eine Diagnose, kein Dauerrauschen. Bei 21
       Mannschaften stünde sie sonst 21-mal da und würde nach dem dritten
       Mal überlesen. */
    const t = zus(mit({ gespielt_laut_spielplan: 3, spielplan_nach_status: { "2": 3 } }));
    expect(t).not.toMatch(/im Spielplan:/);
  });

  it("schweigt, wenn die aeltere Function sie nicht schickt", () => {
    /* Ohne Aufschlüsselung keine halbe Auskunft — sonst stünde da eine
       Abweichung ohne jeden Anhaltspunkt. */
    expect(zus(mit({}))).not.toMatch(/im Spielplan:/);
  });
});

describe("welche Lesart geht auf — und die Schwelle steht vorher fest", () => {
  /* ⚠ ⚠ HIER STANDEN ZWEI FÄLLE, DIE „18 von 21" FESTHIELTEN. Die
     Formulierung war irreführend: eine Mannschaft ohne Forfait erfüllt
     BEIDE Lesarten und kann nichts trennen. „21 von 21" liest sich wie
     eine grosse Stichprobe und ist grösstenteils Rauschen — am
     14.09.2026 unterschied genau EINE von 21 Zeilen.

     Sie sind ersetzt, nicht angepasst: das alte Verhalten war messbar
     irreführend, und ein Test, der es festhält, bewacht etwas Falsches. */
  const mit = (ent: Array<Record<string, unknown>>) => deuteRangprobe({
    ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 21,
    eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, bestand_hinkt: 0,
    verband_hinkt: 0, eigene: [], treffer_grundmenge: 21,
    treffer_nur_status2: 18, treffer_mit_forfait: 21, entscheidend: ent,
  });
  const Z = (team: string, passt: string) =>
    ({ team, verband: 3, eng: 2, weit: 3, passt });

  it("nennt die UNTERSCHEIDENDE Menge, nicht die Gesamtzahl", () => {
    const t = zus(mit([Z("Juniorinnen C b", "weit")]));
    expect(t).toMatch(/1 von 21 Zeilen unterscheiden/);
    /* ⚠ Die alte, irreführende Formulierung darf nicht zurückkommen. */
    expect(t).not.toMatch(/21 von 21 mit Status 2 und 3/);
  });

  it("nennt sie NAMENTLICH — dieselbe über zehn Läufe ist n=1", () => {
    expect(zus(mit([Z("Juniorinnen C b", "weit")])))
      .toMatch(/Juniorinnen C b — Verband 3, eng 2, weit 3 → weit/);
  });

  it("sagt, dass ein Lauf ohne Forfait nichts beiträgt", () => {
    const t = zus(mit([]));
    expect(t).toMatch(/keine der 21 Zeilen unterscheidet/);
    expect(t).toMatch(/Dieser Lauf trägt nichts bei/);
  });

  it("EIN Gegenbeispiel widerlegt — die Schwelle ist asymmetrisch", () => {
    /* ⚠ Ob ein Forfait zählt, ist eine REGEL, keine verrauschte Grösse.
       Ein Gegenbeispiel genügt; drei Bestätigungen braucht es. */
    expect(zus(mit([Z("A", "eng")]))).toMatch(/⚠ WIDERLEGT/);
  });

  it("beides zugleich ist ein eigener Befund, kein Patt", () => {
    expect(zus(mit([Z("A", "weit"), Z("B", "eng")])))
      .toMatch(/⚠ WIDERSPRÜCHLICH — dann taugt kein Filter/);
  });

  it("keine der beiden Lesarten geht auf — das ist ein dritter Fall", () => {
    expect(zus(mit([Z("A", "keine")])))
      .toMatch(/Keine der beiden Lesarten geht auf/);
  });

  it("unter drei Mannschaften ist die Schwelle NICHT erreicht", () => {
    const t = zus(mit([Z("A", "weit"), Z("B", "weit")]));
    expect(t).toMatch(/erst 2 von 3 Mannschaften/);
    expect(t).not.toMatch(/Schwelle erreicht/);
  });

  it("ab drei meldet sie die Schwelle — mit dem Vorbehalt", () => {
    const t = zus(mit([Z("A", "weit"), Z("B", "weit"), Z("C", "weit")]));
    expect(t).toMatch(/Schwelle erreicht, WENN es drei VERSCHIEDENE Mannschaften sind/);
  });

  it("schweigt bei einer aelteren Function", () => {
    const t = deuteRangprobe({
      ...BASIS, eigene_erkennbar: true, eigene_zeilen_gesamt: 21,
      eigene_ohne_spiele: 0, eigene_ohne_zahl: 0, bestand_hinkt: 0,
      verband_hinkt: 0, eigene: [],
    });
    expect(zus(t)).not.toMatch(/Lesart Forfait:/);
  });
});
