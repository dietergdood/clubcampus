import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  bildeAufstellung, bildeEreignis, istEigener, istKorrekturUeberfluessig,
  leseHalbzeit, waehleKandidaten, NACHZUG_TAGE, bildeOffeneNamen,
} from "../../../../supabase/functions/sfv-sync/matchdaten.ts";
import type { KorrekturZeile } from "../../../../supabase/functions/sfv-sync/matchdaten.ts";

const UNSERE = 11057;   // FCH, aus vereine.sfv_club_nummer
const FREMD  = 11030;   // FC Kuesnacht, aus dem Beispielspiel 4308382
const JETZT  = "2026-08-19T12:00:00.000Z";

/* Ein gegnerisches Ereignis, wie der SFV es liefert — mit allem, was NICHT
   gespeichert werden darf. Die Werte sind erfunden, die Schluessel echt
   (docs/sfv/matchdaten_struktur.json). */
const FREMDES_TOR = {
  eventId: 29633777, clubNumber: FREMD, teamId: 37931, teamName: "FC Kuesnacht a",
  eventTypeId: 1, eventTypeName: "Tor", eventSubTypeId: 0, eventSubTypeName: "-",
  minute: 50, additionalMinute: 0,
  personId: 1462762, personName: "Max Muster", birthDate: "2001-03-04",
  passportNumber: 987654, jerseyNumber: 7,
  substitutePlayerId: 1111, substitutePlayerName: "Anna Beispiel",
  substitutePlayerJerseyNumber: 12, substitutePlayerBirthDate: "2004-01-01",
  substitutePlayerPassportNumber: 55555,
};

const EIGENES_TOR = {
  ...FREMDES_TOR, eventId: 29633776, clubNumber: UNSERE,
  teamId: 38309, teamName: "FC Herrliberg a", minute: 11,
  personId: 1135383, jerseyNumber: 13,
};

describe("istEigener", () => {
  it("trennt ueber die clubNumber", () => {
    expect(istEigener(UNSERE, UNSERE)).toBe(true);
    expect(istEigener(FREMD, UNSERE)).toBe(false);
  });

  it("haelt niemanden fuer eigen, solange die clubNumber fehlt", () => {
    /* Ohne vereine.sfv_club_nummer duerfte der Sync NIEMANDEN als eigen
       einstufen — sonst landeten fremde Personendaten in unseren Zeilen. */
    expect(istEigener(UNSERE, null)).toBe(false);
    expect(istEigener(null, UNSERE)).toBe(false);
    expect(istEigener(undefined, UNSERE)).toBe(false);
  });

  it("verwechselt die ClubId nicht mit der clubNumber", () => {
    expect(istEigener(1516, UNSERE)).toBe(false);
  });
});

describe("Anonymitaet — erstes Netz: die Allowlist beim Uebernehmen", () => {
  it("uebernimmt von einem fremden Spieler nur den Vereinsnamen", () => {
    const z = bildeEreignis(FREMDES_TOR, UNSERE, "v1", "s1", JETZT)!;
    expect(z.ist_eigener).toBe(false);
    expect(z.gegner_club_name).toBe("FC Kuesnacht a");
    expect(z.sfv_person_id).toBeNull();
    expect(z.rueckennr).toBeNull();
    expect(z.ein_sfv_person_id).toBeNull();
    expect(z.ein_rueckennr).toBeNull();
  });

  it("laesst kein personenbezogenes Feld durch — auch kein unbekanntes", () => {
    /* Der Kern der Allowlist: die Funktion liest die Felder einzeln, statt
       das Objekt zu filtern. Was der SFV sonst liefert, kommt gar nicht erst
       an. Der Test prueft das ueber die Schluessel des Ergebnisses, nicht
       ueber eine Liste verbotener Namen — sonst pruefte er dieselbe
       Fantasie, die eine Denylist so unzuverlaessig macht. */
    const erlaubt = new Set([
      "verein_id", "spiel_id", "herkunft", "sfv_event_id", "typ_id", "typ",
      "subtyp_id", "subtyp", "minute", "zusatzminute", "ist_eigener",
      "sfv_team_id", "gegner_club_name", "sfv_person_id", "rueckennr",
      "ein_sfv_person_id", "ein_rueckennr", "zuletzt_synchronisiert",
    ]);
    const mitUeberraschung = { ...FREMDES_TOR, neuesFeldVomSfv: "Hans Meier", nationality: "CH" };
    const z = bildeEreignis(mitUeberraschung, UNSERE, "v1", "s1", JETZT)!;
    for (const k of Object.keys(z)) expect(erlaubt.has(k)).toBe(true);
    expect(JSON.stringify(z)).not.toContain("Max Muster");
    expect(JSON.stringify(z)).not.toContain("Hans Meier");
    expect(JSON.stringify(z)).not.toContain("987654");
  });

  it("uebernimmt bei einem eigenen Spieler die Person, aber nie Name oder Pass", () => {
    const z = bildeEreignis(EIGENES_TOR, UNSERE, "v1", "s1", JETZT)!;
    expect(z.ist_eigener).toBe(true);
    expect(z.sfv_person_id).toBe(1135383);
    expect(z.rueckennr).toBe(13);
    expect(z.gegner_club_name).toBeNull();
    expect(JSON.stringify(z)).not.toContain("Max Muster");
    expect(JSON.stringify(z)).not.toContain("2001-03-04");
  });

  it("speichert von einem fremden Spieler gar keine Aufstellungszeile", () => {
    expect(bildeAufstellung({ ...FREMDES_TOR, teamId: 37931 }, UNSERE, "v1", "s1", JETZT)).toBeNull();
  });

  it("laesst eine eigene Aufstellungszeile ohne personId fallen", () => {
    /* Nicht wiedererkennbar heisst nie zuordenbar — dann lieber keine Zeile
       als eine, die ewig in der Warteschlange steht. */
    const ohne = { clubNumber: UNSERE, jerseyNumber: 9, personId: null };
    expect(bildeAufstellung(ohne, UNSERE, "v1", "s1", JETZT)).toBeNull();
  });

  it("nimmt in die Aufstellung nur Nummer, Position und Minuten", () => {
    const roh = {
      clubNumber: UNSERE, personId: 1254213, playerId: 1469133, teamId: 38309,
      jerseyNumber: 17, positionId: 48, positionName: "Mittelfeld linksinnen",
      playFromMinute: 1, playUntilMinute: 90, totalPlayTime: 90,
      firstname: "Adrian", name: "Schmid", secondName: "S.", gender: 1,
      birthDate: "1999-09-09", passportNumber: 123456,
    };
    const z = bildeAufstellung(roh, UNSERE, "v1", "s1", JETZT)!;
    expect(Object.keys(z).sort()).toEqual([
      "bis_minute", "position_id", "position_name", "rueckennr", "sfv_person_id",
      "sfv_team_id", "spiel_id", "spielzeit", "verein_id", "von_minute",
      "zuletzt_synchronisiert",
    ]);
    expect(JSON.stringify(z)).not.toContain("Adrian");
    expect(JSON.stringify(z)).not.toContain("Schmid");
  });
});

describe("Anonymitaet — zweites Netz: der CHECK-Constraint", () => {
  /* Die Allowlist koennte jemand aufweichen; deshalb prueft die Datenbank
     dasselbe ein zweites Mal. Dieser Test kommt ohne Datenbank aus: er
     stellt sicher, dass der Constraint im Schema-Dump steht. Faellt er
     jemandem zum Opfer, faellt es hier auf statt beim naechsten Vorfall. */
  const schema = readFileSync("supabase/schema.sql", "utf8");

  it("steht als CHECK auf spiel_ereignisse im Schema", () => {
    expect(schema).toContain("spiel_ereignisse_fremde_anonym_check");
  });

  it("erzwingt bei fremden Zeilen alle vier Personenfelder auf NULL", () => {
    const zeile = schema.split("\n").find((l) => l.includes("spiel_ereignisse_fremde_anonym_check")) ?? "";
    for (const feld of ["sfv_person_id", "rueckennr", "ein_sfv_person_id", "ein_rueckennr"]) {
      expect(zeile).toContain(feld);
    }
    expect(zeile).toContain("ist_eigener");
  });

  it("trennt die beiden Schichten", () => {
    expect(schema).toContain("spiel_ereignisse_schicht_check");
  });
});

describe("Nachzug — vergleicht nur die geaenderten Felder", () => {
  /* Ausgangslage: der SFV schrieb Spieler 111 als Torschuetzen, der Verein
     hat auf 222 korrigiert. Angefasst wurde NUR sfv_person_id. */
  const korrektur: KorrekturZeile = {
    id: "k1",
    ersetzt_ereignis_id: "e1",
    geaenderte_felder: ["sfv_person_id"],
    verworfen_am: null,
    sfv_person_id: 222,
    minute: 34,
  };

  it("meldet nichts, wenn der SFV eine NEBENSAECHLICHKEIT aendert", () => {
    /* Der Verband verschiebt die Minute von 34 auf 36 und laesst den
       Torschuetzen bei 111. Unsere Korrektur ist unveraendert noetig — eine
       Meldung waere Rauschen, und Rauschen entwertet die echten. */
    const sfv = { sfv_person_id: 111, minute: 36 };
    expect(istKorrekturUeberfluessig(korrektur, sfv)).toBe(false);
  });

  it("meldet, wenn der SFV auf denselben Wert nachzieht", () => {
    const sfv = { sfv_person_id: 222, minute: 34 };
    expect(istKorrekturUeberfluessig(korrektur, sfv)).toBe(true);
  });

  it("meldet auch dann, wenn nebenbei etwas anderes abweicht", () => {
    /* Entscheidend ist allein das angefasste Feld. Die Minute steht in
       geaenderte_felder nicht — zu ihr hat die Korrektur nichts gesagt. */
    const sfv = { sfv_person_id: 222, minute: 99 };
    expect(istKorrekturUeberfluessig(korrektur, sfv)).toBe(true);
  });

  it("vergleicht Zahl und Text nicht ueber ihre Schreibweise", () => {
    expect(istKorrekturUeberfluessig(korrektur, { sfv_person_id: "222" })).toBe(true);
  });

  it("meldet nie bei einem nachgetragenen Assist", () => {
    /* Eine Vereins-Zeile ohne Gegenstueck hat nichts, womit sie verglichen
       werden koennte. */
    const assist: KorrekturZeile = {
      id: "k2", ersetzt_ereignis_id: null, geaenderte_felder: null,
      verworfen_am: null, sfv_person_id: 333,
    };
    expect(istKorrekturUeberfluessig(assist, { sfv_person_id: 333 })).toBe(false);
  });

  it("meldet nicht mehr, wenn die Korrektur verworfen wurde", () => {
    expect(istKorrekturUeberfluessig(
      { ...korrektur, verworfen_am: "2026-08-19T10:00:00Z" }, { sfv_person_id: 222 },
    )).toBe(false);
  });

  it("meldet nicht, wenn die SFV-Zeile verschwunden ist", () => {
    expect(istKorrekturUeberfluessig(korrektur, null)).toBe(false);
  });
});

describe("waehleKandidaten", () => {
  const jetzt = new Date("2026-08-19T12:00:00Z");
  const s = (id: string, date: string, geholt: string | null, matchId: number | null = 1) =>
    ({ id, date, matchdaten_geholt_am: geholt, sfv_match_id: matchId });

  it("nimmt neue Spiele vor Wiederholungen", () => {
    /* Ein fehlender Spielbericht faellt auf, eine um eine Stunde verzoegerte
       Korrektur nicht. */
    const gewaehlt = waehleKandidaten([
      s("alt", "2026-08-17", "2026-08-17T20:00:00Z"),
      s("neu", "2026-08-16", null),
    ], jetzt, 10);
    expect(gewaehlt.map((x) => x.id)).toEqual(["neu", "alt"]);
  });

  it("haelt die Obergrenze ein", () => {
    const viele = Array.from({ length: 25 }, (_, i) => s(`n${i}`, "2026-08-18", null));
    expect(waehleKandidaten(viele, jetzt, 10)).toHaveLength(10);
  });

  it("holt ein bereits geholtes Spiel nur in der Woche danach nach", () => {
    const gewaehlt = waehleKandidaten([
      s("frisch", "2026-08-15", "2026-08-15T20:00:00Z"),
      s("laengst", "2026-06-01", "2026-06-01T20:00:00Z"),
    ], jetzt, 10);
    expect(gewaehlt.map((x) => x.id)).toEqual(["frisch"]);
  });

  it("nimmt ein Spiel genau am Rand der Frist noch mit", () => {
    const rand = new Date(jetzt.getTime() - NACHZUG_TAGE * 24 * 60 * 60 * 1000);
    const gewaehlt = waehleKandidaten(
      [s("rand", rand.toISOString().slice(0, 10), "2026-08-12T20:00:00Z")], jetzt, 10,
    );
    expect(gewaehlt).toHaveLength(1);
  });

  it("laesst Spiele ohne sfv_match_id liegen", () => {
    /* Turniere und interne Spiele haben keine — fuer sie gibt es beim SFV
       nichts zu holen. */
    expect(waehleKandidaten([s("intern", "2026-08-18", null, null)], jetzt, 10)).toHaveLength(0);
  });

  it("nimmt innerhalb einer Gruppe das juengste zuerst", () => {
    const gewaehlt = waehleKandidaten([
      s("aelter", "2026-08-10", null),
      s("juenger", "2026-08-18", null),
    ], jetzt, 10);
    expect(gewaehlt.map((x) => x.id)).toEqual(["juenger", "aelter"]);
  });
});

describe("leseHalbzeit", () => {
  it("liest den Stand aus intermediateResults", () => {
    /* Echte Form aus Spiel 4308382. */
    expect(leseHalbzeit({
      intermediateResults: [
        { scoreTeamA: 0, scoreTeamB: 1, resultTypeId: 1, resultTypeName: "Halbzeit" },
      ],
    })).toBe("0:1");
  });

  it("uebergeht andere Zwischenstaende", () => {
    expect(leseHalbzeit({
      intermediateResults: [
        { scoreTeamA: 2, scoreTeamB: 2, resultTypeName: "Verlaengerung" },
        { scoreTeamA: 1, scoreTeamB: 0, resultTypeName: "Halbzeit" },
      ],
    })).toBe("1:0");
  });

  it("liefert null, wenn es keine Halbzeit gibt", () => {
    expect(leseHalbzeit({ intermediateResults: [] })).toBeNull();
    expect(leseHalbzeit({})).toBeNull();
  });
});

/* ── Namen der offenen eigenen Spieler ────────────────────────────────────
   Die Feldnamen sind hier die Prüfung: `firstname`/`name` heissen beim SFV
   so, und `secondName` bleibt bewusst draussen. Ein Test, der nur zählt,
   bliebe grün, wenn die Funktion den falschen Schlüssel läse. */
describe("bildeOffeneNamen", () => {
  const SPIELER = (ueber: Record<string, unknown>) => ({
    clubNumber: UNSERE, personId: 500, firstname: "Adrian", name: "Schmid",
    secondName: "Karl", jerseyNumber: 9, teamId: 38309, ...ueber,
  });

  it("nennt Vor- und Nachname des eigenen Spielers, ohne zweiten Vornamen", () => {
    const r = bildeOffeneNamen([SPIELER({})], UNSERE, new Set());
    expect(r).toEqual([{ sfv_person_id: 500, name: "Adrian Schmid", rueckennr: 9, sfv_team_id: 38309 }]);
  });

  it("laesst GEGNER weg — auch wenn der Verband ihren Namen mitliefert", () => {
    const gegner = SPIELER({ clubNumber: FREMD, personId: 900, name: "Gegner" });
    const r = bildeOffeneNamen([gegner], UNSERE, new Set());
    expect(r).toEqual([]);
  });

  it("laesst bereits zugeordnete weg", () => {
    expect(bildeOffeneNamen([SPIELER({})], UNSERE, new Set([500]))).toEqual([]);
  });

  it("nennt jeden Spieler einmal, auch bei mehreren Einsaetzen", () => {
    const r = bildeOffeneNamen([SPIELER({}), SPIELER({ jerseyNumber: 11 })], UNSERE, new Set());
    expect(r.map(x => x.name)).toEqual(["Adrian Schmid"]);
  });

  it("sortiert nach Name", () => {
    const r = bildeOffeneNamen(
      [SPIELER({ personId: 1, name: "Zwicky" }), SPIELER({ personId: 2, name: "Aebi" })],
      UNSERE, new Set());
    expect(r.map(x => x.name)).toEqual(["Adrian Aebi", "Adrian Zwicky"]);
  });

  it("laesst eine Zeile ohne Namen weg, statt eine leere anzuzeigen", () => {
    const ohne = SPIELER({ firstname: null, name: null });
    expect(bildeOffeneNamen([ohne], UNSERE, new Set())).toEqual([]);
  });

  it("ohne clubNumber gilt niemand als eigen — wie bei bildeAufstellung", () => {
    expect(bildeOffeneNamen([SPIELER({})], null, new Set())).toEqual([]);
  });
});
