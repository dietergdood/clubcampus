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
  findeTeamsOhneSpiele, saisonWechsel,
} from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";
import type { LaufErgebnis } from "../../../../supabase/functions/sfv-sync/ergebnisTypen.ts";

const LAUF: LaufErgebnis = {
  status: "ok",
  meldung: "Matchdaten 10 Spiel(e)",
  spiele: { neu: 1, aktualisiert: 2, ohne_team: 0, nicht_mehr_geliefert: 0 },
  ranglisten: { geschrieben: 4, entfernt: 0, gruppen: 1 },
  verwaiste_zuordnungen: 0,
  sfv_teams_ohne_zuordnung: 0,
  sfv_teams_ohne_zuordnung_aktiv: 0,
  teams_ohne_spiele: { anzahl: 0, teams: [], meldepflichtig: false },
  derbys: 1,
  saison: { id: 2026, name: "2026/27" },
  logos: { geholt: 3, fehlt: 1 },
  matchdaten: {
    spiele_geholt: 10, aufstellung_zeilen: 156, ereignisse_zeilen: 42,
    eigene_unzugeordnet: 177, zuordnungen_gesamt: 0, paesse_geschrieben: 0,
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
      "aufstellung_zeilen", "eigene_unzugeordnet", "ereignisse_zeilen", "fehler",
      "fehlermeldungen", "nachzug_meldungen", "paesse_geschrieben", "pass_konflikte",
      "spiele_geholt", "zuordnungen_gesamt",
    ]);
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
