/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/protokollAllowlist.test.ts

   Was von einem Lauf nach `api_sync_log.details` geschrieben wird.

   ⚠ ANLASS. Am 21.08.2026 bekam das Ergebnisobjekt ein Feld
   (`offene_namen`), das ausdrücklich NICHT gespeichert werden
   sollte — und wurde gespeichert, weil `details: erg` das ganze
   Objekt schrieb. 903 Klarnamen in sieben Läufen, ohne dass etwas
   fehlschlug. Ein neues Feld erbt jeden Ausgang des Objekts.

   ⚠ DIE ATTRAPPE IST TYPISIERT. `LaufErgebnis` steht als Typ am
   Fixture, nicht als abgeschriebene Form: eine erfundene Spalte
   ist damit ein Compilerfehler, und ein neues Feld im echten Typ
   fällt hier auf, statt still durchzureisen. Eine Attrappe, die
   die Form abschreibt, prüft die Abschrift.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  fuersProtokoll, fuerZeitplanAntwort, zaehleOhneZuordnung, zaehleOhneZuordnungGetrennt,
  findeTeamsOhneSpiele, saisonWechsel, namenFuersProtokoll, aufteilungAufstellung,
} from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";
import type { LaufErgebnis, NamenErgebnis }
  from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";

const LAUF: LaufErgebnis = {
  status: "ok",
  meldung: "Matchdaten 10 Spiel(e)",
  spiele: { neu: 1, aktualisiert: 2, ohne_team: 0, nicht_mehr_geliefert: 0 },
  ranglisten: { geschrieben: 4, entfernt: 0, gruppen: 1, gelaufen: true },
  blockfehler: [],
  verwaiste_zuordnungen: 0,
  sfv_teams_ohne_zuordnung: 0,
  sfv_teams_ohne_zuordnung_aktiv: 0,
  teams_ohne_spiele: { anzahl: 0, teams: [], meldepflichtig: false },
  derbys: 1,
  saison: { id: 2026, name: "2026/27" },
  logos: { geholt: 3, fehlt: 1 },
  matchdaten: {
    spiele_geholt: 10, aufstellung_zeilen: 156, ereignisse_zeilen: 42,
    eigene_unzugeordnet: 177, zuordnungen_gesamt: 0,
    namen_geschrieben: 42,
    aufstellung_fremd: 11, gegner_doppel: 0, eigen_doppel: 0, paesse_geschrieben: 0,
    /* ⚠ ⚠  BERICHTIGT AM 23.09.2026 — UND DIESE ZEILEN SIND DER BELEG
       FUER EINEN ZWEI WOCHEN ALTEN FEHLER.

       Hier stand `aufstellung_geliefert: 169` mit dem Kommentar „die
       Aufteilung geht auf: 156 + 11 + 2 + 0 + 0 = 169“. Sie ging auf —
       gegen die FALSCHE Formel. `fremd_unveraendert: 11` steht zwei
       Zeilen tiefer und wurde nicht mitgezaehlt.

       **Der Testfall hat damit die falsche Formel zementiert.** Er war
       gruen, waehrend die Aufteilung in JEDEM echten Lauf nicht aufging
       (25 von 25 gemessen) — weil die Attrappe zu ihr passte. Genau die
       Familie „eine Attrappe, die die Form abschreibt, prueft die
       Abschrift“, und die Regel darueber: ein Test, der den Ist-Zustand
       festhaelt, obwohl der falsch ist, faellt ausgerechnet dann um, wenn
       jemand ihn behebt.

       Jetzt: 156 + 11 + 11 + 2 + 0 + 0 + 0 = 180. */
    aufstellung_geliefert: 180, eigen_ohne_person: 2, fremd_ohne_nummer: 0,
    verband_hat_korrigiert: 5, fremd_unveraendert: 11,
    verlauf_unveraendert: 22,
    kandidaten_neu: 0, kandidaten_fenster: 8, kandidaten_alt: 2,
    kandidaten_gesamt: 50, aelteste_holung_stunden: 25,
    halbzeit: { da: 3, fehlt: 0, leer: 1, ohne_halbzeit: 2 },
    pass_konflikte: ["Mitglied 633: zwei Passnummern"],
    nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
  },
};

describe("fuersProtokoll", () => {
  it("nennt unter matchdaten genau die erlaubten Schluessel", () => {
    /* ⚠ DIE DURABLE PROBE. `offene_namen` gibt es im Lauf-Ergebnis nicht
       mehr — es zu verbieten waere jetzt eine Pruefung gegen etwas, das
       nicht existiert. Was bleibt, ist die Frage, die den Vorfall
       verhindert haette: kommt hier etwas an, das niemand aufgezaehlt hat?
       Ein neues Feld in MatchdatenErgebnis macht diesen Fall rot. */
    const md = fuersProtokoll(LAUF).matchdaten as Record<string, unknown>;
    expect(Object.keys(md).sort()).toEqual([
      "aelteste_holung_stunden",
      "aufstellung_aufteilung_stimmt",
      "aufstellung_fremd", "aufstellung_geliefert", "aufstellung_zeilen",
      "eigen_doppel", "eigen_ohne_person", "eigene_unzugeordnet", "ereignisse_zeilen",
      "fehler", "fehlermeldungen", "fremd_ohne_nummer", "fremd_unveraendert",
      "gegner_doppel", "halbzeit",
      "kandidaten_alt", "kandidaten_fenster", "kandidaten_gesamt", "kandidaten_neu",
      "nachzug_meldungen", "namen_geschrieben",
      "paesse_geschrieben", "pass_konflikte",
      "spiele_geholt", "verband_hat_korrigiert", "verlauf_unveraendert",
      "zuordnungen_gesamt",
    ]);
  });

  it("die Aufstellungszahlen gehen auf — geliefert = geschrieben + verworfen", () => {
    /* ⚠ ⚠ DIE SELBSTPROBE, und sie ist der Grund für die drei neuen Zahlen.
       Am 11.09.2026 trugen vier Spiele 8 bis 10 eigene Zeilen, eines bei
       21 Ereignissen — und es war NICHT zu sagen, ob der Verband weniger
       lieferte oder `bildeAufstellung` sie verwarf, weil das Verwerfen
       niemand zählte.

       Gehen die Zahlen auseinander, misst eine der Stellen etwas anderes
       als die andere. Eine einzelne Zahl kann das nicht melden. */
    /* ⚠ ⚠  DIE FUNKTION, NICHT DIE FORMEL ABGESCHRIEBEN — und genau
       daran ist es gescheitert. Hier stand die Summe als Ausdruck, ohne
       `fremd_unveraendert`. Eine abgeschriebene Formel prueft die
       Abschrift; sie kann nicht auffallen, wenn das Original sich
       aendert.

       `aufteilungAufstellung()` ist dieselbe Rechnung, die auch ins
       Protokoll geht. Weicht sie ab, ist dieser Fall rot. */
    const md = fuersProtokoll(LAUF).matchdaten as Record<string, unknown>;
    const a = aufteilungAufstellung(md);
    expect(
      a.stimmt,
      `geliefert ${a.geliefert}, Summe ${a.summe}, Differenz ${a.fehlend}`,
    ).toBe(true);
    /* ⚠ Und die Zahl, die im Protokoll steht, muss dieselbe sein — sonst
       rechnet die Antwort etwas anderes als dieser Fall. */
    expect(md.aufstellung_aufteilung_stimmt).toBe(true);
  });

  it("behaelt die Zahlen, die das Protokoll braucht", () => {
    const md = fuersProtokoll(LAUF).matchdaten as Record<string, unknown>;
    expect(md.spiele_geholt).toBe(10);
    expect(md.aufstellung_zeilen).toBe(156);
    expect(md.eigene_unzugeordnet).toBe(177);
    expect(md.pass_konflikte).toEqual(["Mitglied 633: zwei Passnummern"]);
  });

  it("nennt auf oberster Ebene genau die erlaubten Schluessel", () => {
    /* Aufgezaehlt, nicht gezaehlt: kaeme ein Feld dazu, waere die Liste
       hier rot und nicht nur die Laenge. */
    expect(Object.keys(fuersProtokoll(LAUF)).sort()).toEqual([
      "derbys", "logos", "matchdaten", "meldung", "ranglisten",
      "saison", "sfv_teams_ohne_zuordnung", "sfv_teams_ohne_zuordnung_aktiv",
      "spiele", "status", "teams_ohne_spiele",
      "verwaiste_zuordnungen",
    ]);
    /* ⚠ `blockfehler` steht hier NICHT, weil die Attrappe keinen
       hat — der Fall darunter hält fest, dass es erscheint, sobald
       einer da ist. */
  });

  it("laesst saison und logos weg, wenn der Lauf sie nicht hatte", () => {
    const ohne: LaufErgebnis = { ...LAUF, saison: undefined, logos: undefined, matchdaten: undefined };
    const r = fuersProtokoll(ohne);
    expect(r).not.toHaveProperty("saison");
    expect(r).not.toHaveProperty("logos");
    expect(r).not.toHaveProperty("matchdaten");
  });
});

describe("fuerZeitplanAntwort", () => {
  it("gibt dem Zeitplan dieselbe Auswahl — seine Antwort landet in net._http_response", () => {
    expect(fuerZeitplanAntwort(LAUF)).toEqual(fuersProtokoll(LAUF));
  });
});

/* ═══════════════════════════════════════════════════════════════
   Die zwei Richtungen der Zuordnung

   ⚠ Sie sehen fast gleich aus und meinen Gegenteiliges. Bis zum
   10.09.2026 gab es nur eine — und es war die, die seltener
   vorkommt.
   ═══════════════════════════════════════════════════════════════ */
describe("zaehleOhneZuordnung", () => {
  it("zaehlt Mannschaften des Verbands, die uns fehlen", () => {
    /* 34 beim Verband, 21 zugeordnet — die Lage vom 10.09.2026. */
    const verband = Array.from({ length: 34 }, (_, i) => 38300 + i);
    const unsere = verband.slice(0, 21);
    expect(zaehleOhneZuordnung(verband, unsere)).toBe(13);
  });

  it("ist 0, wenn jede Mannschaft des Verbands zugeordnet ist", () => {
    expect(zaehleOhneZuordnung([1, 2, 3], [3, 2, 1])).toBe(0);
  });

  it("zaehlt die Gegenrichtung NICHT mit", () => {
    /* Eine Nummer bei uns, die der Verband nicht kennt, ist
       `verwaiste_zuordnungen` — nicht diese Zahl. Wer beide
       verwechselt, sucht beim Wegfall nach einem Zugang. */
    expect(zaehleOhneZuordnung([1, 2], [1, 2, 999])).toBe(0);
  });

  it("vergleicht ueber die Zahl, nicht ueber die Schreibweise", () => {
    /* `teams.sfv_team_id` kommt als bigint aus PostgREST und kann als
       Zeichenkette ankommen. Ein Vergleich ueber `===` haette dann jede
       Mannschaft als unzugeordnet gemeldet. */
    expect(zaehleOhneZuordnung([38309], ["38309" as unknown as number])).toBe(0);
  });

  it("bei leerer Verbandsliste ist nichts offen", () => {
    expect(zaehleOhneZuordnung([], [1, 2, 3])).toBe(0);
  });
});

describe("zaehleOhneZuordnungGetrennt — aktiv von aufgeloest trennen", () => {
  const T = (id: number, aktiv?: boolean) => ({ sfv_team_id: id, aktiv });

  it("zaehlt aufgeloeste Mannschaften nicht zu den behebbaren", () => {
    /* ⚠ Ohne diese Trennung meldete der Zaehler dauerhaft eine Zahl, die
       niemand senken kann — und ein Pruefmittel, das immer anschlaegt,
       wird ueberlesen. */
    const erg = zaehleOhneZuordnungGetrennt(
      [T(1, true), T(2, false), T(3, true)], [1],
    );
    expect(erg).toEqual({ offen_gesamt: 2, offen_aktiv: 1 });
  });

  it("haelt ein fehlendes Kennzeichen fuer aktiv", () => {
    /* Wie sfvApi.ts: `isTeamActive ?? true`. Ein unbekannter Zustand darf
       keine Mannschaft unsichtbar machen. */
    expect(zaehleOhneZuordnungGetrennt([T(7)], []).offen_aktiv).toBe(1);
  });

  it("zaehlt zugeordnete gar nicht, auch nicht als gesamt", () => {
    expect(zaehleOhneZuordnungGetrennt([T(1, false)], [1]))
      .toEqual({ offen_gesamt: 0, offen_aktiv: 0 });
  });
});

describe("findeTeamsOhneSpiele — ein Befund, keine Datenlage", () => {
  const T = (id: number, name: string) => ({ sfv_team_id: id, name });

  it("nennt die Mannschaft namentlich, nicht nur ihre Zahl", () => {
    /* Eine Zahl schickt niemanden irgendwohin. */
    const e = findeTeamsOhneSpiele([T(38309, "Ca-Junioren"), T(38313, "Ea-Junioren")], [38309], 12);
    expect(e.anzahl).toBe(1);
    expect(e.teams).toEqual(["Ea-Junioren (38313)"]);
    expect(e.meldepflichtig).toBe(true);
  });

  it("schweigt, wenn jede zugeordnete Mannschaft Spiele hat", () => {
    const e = findeTeamsOhneSpiele([T(1, "A"), T(2, "B")], [1, 2], 20);
    expect(e).toEqual({ anzahl: 0, teams: [], meldepflichtig: false });
  });

  it("⚠ schlaegt NICHT an, wenn der ganze Lauf keine Spiele hatte", () => {
    /* Vor dem ersten Spieltag hat keine Mannschaft Spiele. Eine Meldung,
       die jeden Juli fuer alle anschlaegt, wird im August nicht mehr
       gelesen — dieselbe Abstumpfung wie bei den 758 Lint-Warnungen.
       Gezaehlt wird trotzdem: die Zahl steht im Protokoll, nur ohne
       Alarm. */
    const e = findeTeamsOhneSpiele([T(1, "A"), T(2, "B")], [], 0);
    expect(e.anzahl).toBe(2);
    expect(e.meldepflichtig).toBe(false);
  });

  it("vergleicht ueber die Zahl, nicht ueber die Schreibweise", () => {
    /* sfv_team_id kommt als bigint und kann als Zeichenkette ankommen. */
    const e = findeTeamsOhneSpiele([T(38309, "Ca")], ["38309" as unknown as number], 5);
    expect(e.anzahl).toBe(0);
  });

  it("der Fall, fuer den sie gebaut ist: 13 auf einen Schlag", () => {
    /* Kippen die teamIds beim Saisonwechsel, hat KEINE der 13 mehr Spiele
       — waehrend der Lauf insgesamt welche bringt. Genau dann meldet sie. */
    const dreizehn = Array.from({ length: 13 }, (_, i) => T(70000 + i, `Team ${i}`));
    const e = findeTeamsOhneSpiele([...dreizehn, T(38301, "Erste")], [38301], 30);
    expect(e.anzahl).toBe(13);
    expect(e.meldepflichtig).toBe(true);
  });
});

describe("saisonWechsel — einmalig ohne Merker", () => {
  it("meldet den Wechsel", () => {
    expect(saisonWechsel(2027, 2028)).toEqual({ gewechselt: true, von: 2027, nach: 2028 });
  });

  it("⚠ schweigt beim naechsten Lauf von selbst", () => {
    /* Der Kern des Entwurfs: verglichen wird gegen den VORIGEN Lauf. Beim
       zweiten Lauf ist der vorige schon der neue — kein Merker, kein
       „schon gemeldet"-Kennzeichen, nichts, das veralten koennte. */
    expect(saisonWechsel(2028, 2028).gewechselt).toBe(false);
  });

  it("⚠ ein ERSTER Lauf ueberhaupt ist kein Wechsel", () => {
    /* Sonst begruesste jede neue Installation ein Ereignis, das nicht
       stattgefunden hat. */
    expect(saisonWechsel(null, 2027).gewechselt).toBe(false);
    expect(saisonWechsel(undefined, 2027).gewechselt).toBe(false);
    expect(saisonWechsel(Number.NaN, 2027).gewechselt).toBe(false);
  });
});

describe("Die Namen im Protokoll — die Zahl, nie die Namen", () => {
  it("laesst namen_geschrieben durch", () => {
    const p = fuersProtokoll(LAUF) as Record<string, Record<string, unknown>>;
    expect(p.matchdaten.namen_geschrieben).toBe(42);
  });

  it("⚠ und traegt kein Feld, das einen Namen enthalten koennte", () => {
    /* Der Fund vom 21.08.2026: `offene_namen` reiste ueber `details: erg`
       nach api_sync_log — 903 Klarnamen in sieben Laeufen. Die Allowlist
       ist die Gegenmassnahme, und diese Zeile haelt sie fest. */
    const roh = JSON.stringify(fuersProtokoll(LAUF));
    expect(roh).not.toMatch(/name["']?\s*:\s*["'][A-Z]/);
    expect(roh).not.toContain("offene_namen");
  });
});

/* ═══════════════════════════════════════════════════════════════
   Die Aktion `namen` — dieselbe Frage, ein anderes Objekt.

   ⚠ ANLASS, 13.09.2026. `fuersProtokoll` hatte seit dem 22.08.2026
   eine durable Probe, `namenFuersProtokoll` **keine** — und genau
   dieses Objekt trägt die Klarnamen, wegen derer es die erste
   überhaupt gibt.

   Aufgefallen ist es beim Erweitern, nicht beim Prüfen: das Feld
   `jahrgang` sollte dazukommen, und die Frage „welcher Ausgang ist
   gedeckt?" hatte hier keine Antwort.

   **Geschützt war der Ausgang, den der Autor im Blick hatte** —
   dieselbe Form wie der Vorfall selbst, nur eine Ebene höher.
   ═══════════════════════════════════════════════════════════════ */
describe("namenFuersProtokoll", () => {
  /* ⚠ TYPISIERT, wie LAUF darüber. Ein neues Feld in NamenErgebnis
     ist damit hier sichtbar, und eine erfundene Spalte wäre ein
     Compilerfehler statt einer grünen Abschrift. */
  const NAMEN: NamenErgebnis = {
    spiele_abgefragt: 3,
    namen_gefunden: 2,
    namen_geschrieben: 2,
    fehler: 0,
    offen_gesamt: 177,
    jahrgang_unlesbar: 1,
    namen: [
      /* ⚠ `name` ist der ABGELEITETE Wert, `vorname`/`nachname` sind die
         Quelle — so, wie `bildeOffeneNamen` es baut. Eine Attrappe, in der
         die drei nicht zusammenpassen, prueft eine Form, die es nie gibt. */
      { sfv_person_id: 500, name: "Anna Beispiel", vorname: "Anna", nachname: "Beispiel",
        rueckennr: 9, sfv_team_id: 38309, jahrgang: 2011 },
      { sfv_person_id: 501, name: "Bruno Muster", vorname: "Bruno", nachname: "Muster",
        rueckennr: null, sfv_team_id: 38309, jahrgang: null },
    ],
  };

  it("nennt genau fuenf Zahlen und nichts sonst", () => {
    /* ⚠ DIE DURABLE PROBE, und sie hat am 13.09.2026 ihren ersten
       Fund gemacht: `jahrgang_unlesbar` kam dazu, und dieser Fall
       wurde rot. Er war eine Stunde alt.

       ⚠ Die ZAHL darf ins Protokoll, der Jahrgang nicht — der Fall
       darunter haelt die andere Haelfte. */
    expect(Object.keys(namenFuersProtokoll(NAMEN)).sort()).toEqual([
      "fehler", "jahrgang_unlesbar",
      "namen_gefunden", "namen_geschrieben", "spiele_abgefragt",
    ]);
  });

  it("schreibt weder Namen noch Jahrgang ins Protokoll", () => {
    /* Positiv formuliert: die Attrappe TRÄGT beides, also kann der
       Fall nur grün sein, weil die Allowlist sie weglässt — nicht,
       weil nichts da war. Eine Prüfung an einem leeren Objekt hätte
       nichts geprüft. */
    const roh = JSON.stringify(namenFuersProtokoll(NAMEN));
    expect(roh).not.toContain("Anna Beispiel");
    expect(roh).not.toContain("Bruno Muster");
    expect(roh).not.toContain("2011");
    /* ⚠ Genau `"jahrgang":`, nicht bloss „jahrgang" — `jahrgang_unlesbar`
       DARF hier stehen und enthaelt das Wort. Meine erste Fassung dieser
       Zeile war zu weit gefasst und hat den eigenen Zaehler verboten;
       eine negativ formulierte Erwartung trifft, was gleich AUSSIEHT. */
    expect(roh).not.toMatch(/"jahrgang"\s*:/);
    expect(roh).not.toMatch(/"namen"\s*:/);
  });

  it("nennt die Zahl der gefundenen Namen — die darf ins Protokoll", () => {
    /* Die Gegenrichtung: eine Allowlist, die alles wegliesse, wäre
       genauso falsch. Der Lauf muss im Protokoll auffindbar bleiben. */
    expect(namenFuersProtokoll(NAMEN).namen_gefunden).toBe(2);
  });
});

/* ═══════════════════════════════════════════════════════════════
   blockfehler — ein Fehler, der nicht mehr mitnimmt, was ihn
   nichts angeht.

   ⚠ ANLASS, 14.09.2026. Der Ranglisten-Block lag hinter vier
   Würfen des Spielplans — Teams nicht lesbar, `sync_felder` leer,
   `sync_felder` nennt Unberechnetes, Spiele speichern gescheitert.
   Jeder davon ist für den Spielplan richtig und für die Rangliste
   gegenstandslos: sie kennt weder `namen` noch die Feldhoheit.

   Auf der Website stand dann eine Tabelle, die einen Spieltag
   nachhinkte — und nichts sagte, dass sie gar nicht geschrieben
   wurde.
   ═══════════════════════════════════════════════════════════════ */
describe("blockfehler und ranglisten.gelaufen", () => {
  it("steht NICHT im Protokoll, wenn es keinen gibt", () => {
    /* ⚠ Eine leere Liste, die jedes Mal dasteht, wird nicht
       gelesen — und dann fällt der eine Fall auch nicht auf. */
    expect(fuersProtokoll(LAUF)).not.toHaveProperty("blockfehler");
  });

  it("steht im Protokoll, sobald ein Block gescheitert ist", () => {
    /* ⚠ Der Ausgang ist GEWOLLT und deshalb aufgezählt: ein Block,
       der gescheitert ist, muss von einem übersprungenen zu
       unterscheiden sein. */
    const mit: LaufErgebnis = { ...LAUF, blockfehler: ["Rangliste: 42703"] };
    expect(fuersProtokoll(mit).blockfehler).toEqual(["Rangliste: 42703"]);
  });

  it("`gelaufen` reist mit — sonst heisst 0 Zeilen zweierlei", () => {
    /* ⚠ Bis zum 14.09.2026 hiess `geschrieben: 0` sowohl „nichts
       geliefert" als auch „nie gelaufen". Ohne das Kennzeichen ist
       im Protokoll nicht zu sehen, welches von beiden. */
    const nie: LaufErgebnis = {
      ...LAUF,
      ranglisten: { geschrieben: 0, entfernt: 0, gruppen: 0, gelaufen: false },
    };
    const r = fuersProtokoll(nie).ranglisten as Record<string, unknown>;
    expect(r.gelaufen).toBe(false);
    expect(r.geschrieben).toBe(0);
  });
});
