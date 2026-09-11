import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  bildeAufstellung, bildeEreignis, istEigener, istKorrekturUeberfluessig,
  leseHalbzeit, waehleKandidaten, NACHZUG_TAGE, bildeOffeneNamen,
  aeltesteHolungStunden,
  bildeSfvPerson, entdoppleSfvPersonen, verschmelzeAufstellung,
  zaehleVerbandKorrekturen, gegnerUnveraendert, verlaufUnveraendert,
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
  /* ══════════════════════════════════════════════════════════════
     ⚠ ERGAENZT AM 10.09.2026, NICHT GEDREHT.

     Hier stand „nur den Vereinsnamen" und `rueckennr` war NULL. Seit dem
     Entscheid, dem Gegner Tor- und Kartensymbole an seiner
     Aufstellungszeile zu geben, kommt die RUECKENNUMMER mit — die
     Zuordnung laeuft ueber sie.

     ⚠ DIE GRENZE VERSCHIEBT SICH NICHT, SIE WIRD GENAUER: Nummer ja,
     Person nein. Eine Personennummer ist ueber dieselbe Schnittstelle in
     einen Namen aufzuloesen; eine Rueckennummer ist eine Beschriftung
     auf einem Trikot. Der Fall prueft jetzt BEIDE Haelften.
     ══════════════════════════════════════════════════════════════ */
  it("uebernimmt von einem fremden Spieler Vereinsname und Nummer — keine Person", () => {
    const z = bildeEreignis(FREMDES_TOR, UNSERE, "v1", "s1", JETZT)!;
    expect(z.ist_eigener).toBe(false);
    expect(z.gegner_club_name).toBe("FC Kuesnacht a");
    /* neu erlaubt */
    expect(z.rueckennr).toBe(7);
    expect(z.ein_rueckennr).toBe(12);
    /* weiterhin verboten — und der CHECK sagt dasselbe noch einmal */
    expect(z.sfv_person_id).toBeNull();
    expect(z.ein_sfv_person_id).toBeNull();
    /* und kein Name, auf keinem Weg */
    const roh = JSON.stringify(z);
    expect(roh).not.toContain("Max Muster");
    expect(roh).not.toContain("Anna Beispiel");
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

  /* ══════════════════════════════════════════════════════════════
     ⚠ ⚠  GEAENDERT AM 10.09.2026 — ENTSCHEID B.

     Hier stand: „speichert von einem fremden Spieler gar keine
     Aufstellungszeile". Das gilt nicht mehr: Nummer und Position kommen
     mit, damit die Gegneraufstellung auf der Website erscheint.

     ⚠ WAS WEITERHIN GILT UND HIER GEPRUEFT WIRD: keine Person. Nicht
     „wird nicht gelesen", sondern VERBOTEN — der CHECK
     spiel_aufstellung_fremde_ohne_person erzwingt es in der Datenbank,
     und diese Zeilen halten fest, dass der Mapper gar nichts anderes
     erzeugt.

     ⚠ B IST NICHT C. C haette den Namen mitgenommen und ist abgelehnt
     (docs/plan_gegner_namen.md).
     ══════════════════════════════════════════════════════════════ */
  it("nimmt von einem fremden Spieler Nummer und Position — und keine Person", () => {
    const fremd = {
      clubNumber: FREMD, teamId: 37931, personId: 1254213,
      jerseyNumber: 17, positionId: 48, positionName: "Mittelfeld linksinnen",
      firstname: "Max", name: "Muster", personName: "Muster Max",
      birthDate: "1999-09-09", passportNumber: 123456, gender: 1,
    };
    const z = bildeAufstellung(fremd, UNSERE, "v1", "s1", JETZT)!;
    expect(z).toMatchObject({
      ist_eigener: false, rueckennr: 17, position_name: "Mittelfeld linksinnen",
      sfv_person_id: null, name: null,
    });
    /* Die zweite Haelfte: nichts davon steht in der Zeile. */
    const roh = JSON.stringify(z);
    for (const verboten of ["1254213", "Max", "Muster", "1999-09-09", "123456"]) {
      expect(roh).not.toContain(verboten);
    }
  });

  it("⚠ laesst eine fremde Zeile OHNE Nummer ganz fallen", () => {
    /* Sie haette keine Identitaet: kein Name, keine Personennummer, keine
       Nummer — von jeder anderen ununterscheidbar, und der zweite
       Schluessel (verein_id, spiel_id, sfv_team_id, rueckennr) griffe
       nicht. */
    const ohne = { clubNumber: FREMD, teamId: 37931, personId: 1, jerseyNumber: null };
    expect(bildeAufstellung(ohne, UNSERE, "v1", "s1", JETZT)).toBeNull();
  });

  it("⚠ nennt den Grund, statt lautlos null zu liefern", () => {
    /* ⚠ ⚠ ANLASS, 11.09.2026: vier Spiele trugen 8 bis 10 eigene Zeilen,
       eines davon bei 21 Ereignissen. Weniger als elf kann keine
       Mannschaft aufstellen — aber ob der Verband weniger lieferte oder
       diese Funktion sie verwarf, war NICHT ZU TRENNEN, weil das
       Verwerfen niemand zählte.

       Ein stiller Filter macht aus einem Ausfall eine Datenlage. Genau
       dieselbe Klasse wie ein leerer catch. */
    const verworfen: string[] = [];
    bildeAufstellung(
      { clubNumber: UNSERE, teamId: 38309, personId: null, jerseyNumber: 7 },
      UNSERE, "v1", "s1", JETZT, verworfen,
    );
    bildeAufstellung(
      { clubNumber: FREMD, teamId: 37931, personId: 1, jerseyNumber: null },
      UNSERE, "v1", "s1", JETZT, verworfen,
    );
    expect(verworfen).toEqual(["eigen_ohne_person", "fremd_ohne_nummer"]);
  });

  it("zählt nichts, wenn die Zeile durchkommt", () => {
    /* Die Gegenprobe: der Zähler darf nicht bei jeder Zeile anschlagen,
       sonst misst er die Menge statt der Ausfälle. */
    const verworfen: string[] = [];
    const z = bildeAufstellung(
      { clubNumber: UNSERE, teamId: 38309, personId: 500, jerseyNumber: 7 },
      UNSERE, "v1", "s1", JETZT, verworfen,
    );
    expect(z).not.toBeNull();
    expect(verworfen).toEqual([]);
  });

  it("⚠ eine EIGENE Zeile ohne Nummer bleibt dagegen bestehen", () => {
    /* Sie hat eine Identitaet — die Personennummer. Der Unterschied ist
       nicht Willkuer, sondern die Frage, ob die Zeile wiedererkennbar
       ist. */
    const ohne = { clubNumber: UNSERE, teamId: 38309, personId: 500, jerseyNumber: null };
    const z = bildeAufstellung(ohne, UNSERE, "v1", "s1", JETZT);
    expect(z).not.toBeNull();
    expect(z!.ist_eigener).toBe(true);
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
    /* ⚠ Seit 10.09.2026 kommt der NAME dazu — Entscheid, die SFV-Namen zu
       speichern. Was NICHT dazukommt, steht in derselben Antwort eine
       Zeile daneben und ist der eigentliche Gegenstand dieses Falls. */
    expect(Object.keys(z).sort()).toEqual([
      "bis_minute", "ist_eigener", "name", "position_id", "position_name",
      "rolle_zuweisung", "rolle_zuweisung_id", "rueckennr",
      "sfv_person_id", "sfv_team_id", "spiel_id", "spielzeit", "verein_id",
      "von_minute", "zuletzt_synchronisiert",
    ]);
    /* ⚠ DIE ZWEITE HAELFTE, und sie ist die wichtigere: die Allowlist
       waechst um EIN Feld und laesst die drei liegen. */
    const roh2 = JSON.stringify(z);
    expect(roh2).not.toContain("1999-09-09");   // birthDate
    expect(roh2).not.toContain("123456");       // passportNumber
    expect(z.name).toBe("Adrian Schmid");       // ohne secondName
    /* ⚠ HIER STANDEN ZWEI ZEILEN, DIE DEN NAMEN VERBOTEN — aus der Zeit
       vor dem Entscheid vom 10.09.2026, die SFV-Namen zu speichern. Sie
       haben ihn ueberlebt, weil sie in einem Fall standen, der von
       „Nummer, Position und Minuten" handelt und nicht von Namen.

       **Genau die Sorte Stelle, die eine Umkehr uebersieht** — dieselbe
       Familie wie der Knopftext „werden nicht gespeichert", nur in einem
       Test statt in der Oberflaeche. Der Unterschied: dieser hier meldet
       sich wenigstens. */
  });
});

describe("Anonymitaet — zweites Netz: der CHECK-Constraint", () => {
  /* Die Allowlist koennte jemand aufweichen; deshalb prueft die Datenbank
     dasselbe ein zweites Mal. Dieser Test kommt ohne Datenbank aus: er
     stellt sicher, dass der Constraint im Schema-Dump steht. Faellt er
     jemandem zum Opfer, faellt es hier auf statt beim naechsten Vorfall. */
  const schema = readFileSync("supabase/schema.sql", "utf8");

  /* ⚠ DIESER FALL WAR WIRKUNGSLOS, UND ZWAR GRÜN — berichtigt am 08.09.2026.

     Er suchte den NAMEN des Constraints irgendwo im Dump. Der steht dort
     zweimal: einmal als `CONSTRAINT … CHECK (…)` und einmal in einem
     `COMMENT ON TABLE`, der ihn erwähnt. **Wer den Constraint entfernt und
     den Kommentar stehen lässt, kommt hier durch** — gemessen, nicht
     vermutet: der Dump ohne die CONSTRAINT-Zeile besteht die alte Fassung.

     Ein Kommentar als Beleg für eine Zusage über die Datenbank. Dieselbe
     Familie wie die Tautologie in `zaehlung_stimmt`: eine Prüfung, die
     nicht scheitern kann, wird gelesen wie eine, die es könnte.

     Gefangen hätte es der Fall darunter — er sucht die Feldnamen und
     läuft dann auf die Kommentarzeile, in der sie fehlen. Die Zusage war
     also nie ungeschützt; dieser Fall trug nur nichts dazu bei.

     Jetzt wird die DEFINITION verlangt, nicht die Erwähnung. */
  it("steht als CHECK auf spiel_ereignisse im Schema", () => {
    const definition = schema.split("\n").filter((l) =>
      l.includes("spiel_ereignisse_fremde_anonym_check") && /CHECK\s*\(/.test(l));
    expect(definition.length,
      "Der Name kommt im Dump vor, aber nicht als CHECK-Definition — "
      + "ein COMMENT, der ihn erwähnt, ist kein Beleg.").toBe(1);
  });

  /* ══════════════════════════════════════════════════════════════
     ⚠ GEAENDERT AM 10.09.2026 — und er ist ROT GEWORDEN, wie er soll.

     Er hielt „alle VIER Personenfelder auf NULL". Seit dem Entscheid,
     dem Gegner Tor- und Kartensymbole zu geben, sind es ZWEI: die
     Rueckennummern sind frei, die Personennummern bleiben gesperrt.

     ⚠ DIESER FALL LIEST DIE ECHTE DATENBANK (ueber schema.sql) und ist
     erst rot geworden, NACHDEM die Migration lief — nicht schon beim
     Aendern des Codes. Das ist die staerkste Form: er haelt nicht, was
     jemand geschrieben hat, sondern was tatsaechlich gilt.
     ══════════════════════════════════════════════════════════════ */
  it("erzwingt bei fremden Zeilen die PERSONENNUMMERN auf NULL — die Nummer nicht", () => {
    const zeile = schema.split("\n").find((l) => l.includes("spiel_ereignisse_fremde_anonym_check")) ?? "";
    for (const feld of ["sfv_person_id", "ein_sfv_person_id", "ist_eigener"]) {
      expect(zeile).toContain(feld);
    }
    /* ⚠ Die zweite Haelfte, und sie ist die eigentliche Aussage: die
       Rueckennummer steht NICHT mehr im Verbot. Ohne diese Zeile waere
       nicht zu unterscheiden, ob sie freigegeben wurde oder ob jemand
       den CHECK versehentlich verkuerzt hat. */
    expect(zeile).not.toContain("rueckennr");
  });

  it("trennt die beiden Schichten", () => {
    /* Gemessen: dieser Name steht nur EINMAL im Dump, und zwar als
       Definition. Trotzdem dieselbe Form wie oben — ein Kommentar, der
       ihn erwähnt, könnte jederzeit dazukommen. */
    const definition = schema.split("\n").filter((l) =>
      l.includes("spiel_ereignisse_schicht_check") && /CHECK\s*\(/.test(l));
    expect(definition.length).toBe(1);
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
    const w = waehleKandidaten([
      s("alt", "2026-08-17", "2026-08-17T20:00:00Z"),
      s("neu", "2026-08-16", null),
    ], jetzt, 10);
    expect(w.spiele.map((x) => x.id)).toEqual(["neu", "alt"]);
  });

  it("haelt die Obergrenze ein", () => {
    const viele = Array.from({ length: 25 }, (_, i) => s(`n${i}`, "2026-08-18", null));
    expect(waehleKandidaten(viele, jetzt, 10).spiele).toHaveLength(10);
  });

  it("⚠⚠ holt ein laengst geholtes Spiel NACH — umgedreht am 11.09.2026", () => {
    /* ⚠ ⚠ DIESER FALL HIELT DIE GEGENTEILIGE ZUSAGE FEST und ist beim
       Umdrehen von selbst rot geworden — genau wofuer er da war. Er hiess
       „holt ein bereits geholtes Spiel NUR in der Woche danach nach".

       **Die Zusage war die Ursache eines Defekts:** 62 Spiele lagen am
       11.09.2026 zwischen den Toepfen — schon geholt, aelter als sieben
       Tage — und trugen wochenlang die Form vom Tag ihres Abrufs. Jede
       Aenderung an der Verarbeitung erreichte nur das Fenster.

       Der rollende Nachlauf nimmt das am laengsten nicht Geholte, zwei
       Plaetze je Lauf. Das Fenster behaelt seinen Vorrang. */
    const w = waehleKandidaten([
      s("frisch", "2026-08-15", "2026-08-15T20:00:00Z"),
      s("laengst", "2026-06-01", "2026-06-01T20:00:00Z"),
    ], jetzt, 10);
    expect(w.spiele.map((x) => x.id).sort()).toEqual(["frisch", "laengst"]);
    expect(w.fenster).toBe(1);
    expect(w.alt).toBe(1);
  });

  it("⚠ der Nachlauf nimmt das AELTESTE zuerst", () => {
    /* `matchdaten_geholt_am` IST die Reihenfolge und pflegt sich selbst —
       kein Zeiger, den jemand fuehren muesste. */
    const w = waehleKandidaten([
      s("mitte", "2026-06-01", "2026-07-01T20:00:00Z"),
      s("aeltest", "2026-06-01", "2026-05-01T20:00:00Z"),
      s("juengst", "2026-06-01", "2026-08-01T20:00:00Z"),
    ], jetzt, 10);
    /* ⚠ NACHLAUF_PLAETZE ist ein MINDESTMASS, keine Obergrenze: braucht
       das Fenster die Plaetze nicht, nimmt der Nachlauf sie. Die
       Reihenfolge ist das Gepruefte — das aelteste zuerst. */
    expect(w.spiele.map((x) => x.id)).toEqual(["aeltest", "mitte", "juengst"]);
    expect(w.alt).toBe(3);
  });

  it("⚠⚠ der Nachlauf bekommt seine Plaetze auch bei vollem Fenster", () => {
    /* ⚠ Der Grund fuer „garantiert" statt „was uebrig bleibt": bei einem
       Spielwochenende mit zwoelf Partien bliebe nichts uebrig, der
       Durchgang stuende still — und ein stillstehender Durchgang ist
       genau der Ausfall, den niemand bemerkt. */
    const fenster = Array.from({ length: 20 }, (_, i) =>
      s(`f${i}`, "2026-08-18", "2026-08-18T20:00:00Z"));
    const alt = Array.from({ length: 5 }, (_, i) =>
      s(`a${i}`, "2026-06-01", `2026-05-0${i + 1}T20:00:00Z`));
    const w = waehleKandidaten([...fenster, ...alt], jetzt, 12);
    expect(w.spiele).toHaveLength(12);
    expect(w.alt).toBe(2);
    expect(w.fenster).toBe(10);
  });

  it("⚠ NIE Geholtes verdraengt den Nachlauf — es ist der Rueckstand", () => {
    /* `alt` ist per Definition schon einmal geholt worden und kann warten;
       `neu` hat noch gar nichts. */
    const neu = Array.from({ length: 12 }, (_, i) => s(`n${i}`, "2026-08-18", null));
    const alt = [s("a", "2026-06-01", "2026-05-01T20:00:00Z")];
    const w = waehleKandidaten([...neu, ...alt], jetzt, 12);
    expect(w.neu).toBe(12);
    expect(w.alt).toBe(0);
  });

  it("⚠ die drei Zahlen gehen auf", () => {
    /* Eine Aufteilung, die aufgehen MUSS, prueft sich selbst. */
    const w = waehleKandidaten([
      s("neu", "2026-08-18", null),
      s("fenster", "2026-08-15", "2026-08-15T20:00:00Z"),
      s("alt", "2026-06-01", "2026-05-01T20:00:00Z"),
    ], jetzt, 12);
    expect(w.neu + w.fenster + w.alt).toBe(w.spiele.length);
  });

  it("nimmt ein Spiel genau am Rand der Frist noch mit", () => {
    const rand = new Date(jetzt.getTime() - NACHZUG_TAGE * 24 * 60 * 60 * 1000);
    const w = waehleKandidaten(
      [s("rand", rand.toISOString().slice(0, 10), "2026-08-12T20:00:00Z")], jetzt, 10,
    );
    expect(w.spiele).toHaveLength(1);
    expect(w.fenster).toBe(1);
  });

  it("laesst Spiele ohne sfv_match_id liegen", () => {
    /* Turniere und interne Spiele haben keine — fuer sie gibt es beim SFV
       nichts zu holen. */
    expect(waehleKandidaten([s("intern", "2026-08-18", null, null)], jetzt, 10)
      .spiele).toHaveLength(0);
  });

it("⚠⚠ ein AUS DEM FENSTER GEFALLENES Spiel faellt nicht durch", () => {
    /* ⚠ ⚠ DIE DRITTE LUECKE, gemessen am 11.09.2026 an einer Zahl, die
       nicht stimmen konnte: `aelteste_holung` stand bei 143 Stunden,
       obwohl 15 Stunden vorher alles frisch geholt worden war.

       Beim ersten Bau war `alt` auf „geholt UND NICHT im Fenster"
       eingeschraenkt. Das Fenster wird nach DATUM sortiert und bekommt
       nur die uebrigen Plaetze — die aeltesten Fensterspiele fallen als
       erste heraus, und die waren dann in KEINEM Topf: nicht im Fenster
       (kein Platz), nicht in `alt` (sie SIND im Fenster).

       Jetzt ist `alt` ein Sicherheitsnetz ueber alles Geholte. */
    const heute = "2026-08-19";
    const viele = Array.from({ length: 20 }, (_, i) =>
      s(`f${i}`, heute, `2026-08-19T${String(10 + (i % 10)).padStart(2, "0")}:00:00Z`));
    /* Dieses steht im Fenster und wurde am laengsten nicht geholt. */
    const vergessen = s("vergessen", "2026-08-15", "2026-08-13T01:00:00Z");
    const w = waehleKandidaten([...viele, vergessen], jetzt, 12);
    expect(w.spiele.map((x) => x.id)).toContain("vergessen");
    expect(w.alt).toBeGreaterThan(0);
  });

  it("⚠ ein Spiel wird nie zweimal geholt, auch wenn beide Toepfe es nennen", () => {
    /* Seit `alt` ueber alles Geholte geht, koennen sich die Toepfe
       ueberschneiden. Ohne Entdoppelung: vier Abrufe umsonst, und die
       drei Zahlen gingen nicht mehr auf. */
    const w = waehleKandidaten([
      s("a", "2026-08-18", "2026-08-01T10:00:00Z"),
      s("b", "2026-08-17", "2026-08-02T10:00:00Z"),
    ], jetzt, 12);
    const ids = w.spiele.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(w.neu + w.fenster + w.alt).toBe(w.spiele.length);
  });

  it("nimmt innerhalb einer Gruppe das juengste zuerst", () => {
    const w = waehleKandidaten([
      s("aelter", "2026-08-10", null),
      s("juenger", "2026-08-18", null),
    ], jetzt, 10);
    expect(w.spiele.map((x) => x.id)).toEqual(["juenger", "aelter"]);
  });
});

describe("aeltesteHolungStunden — die Zahl, die nicht luegen kann", () => {
  const jetzt = new Date("2026-09-11T12:00:00Z");
  const s = (geholt: string | null) =>
    ({ id: "x", date: "2026-08-01", matchdaten_geholt_am: geholt, sfv_match_id: 1 });

  it("rechnet die aelteste Holung in Stunden", () => {
    expect(aeltesteHolungStunden([
      s("2026-09-11T10:00:00Z"), s("2026-09-11T06:00:00Z"),
    ], jetzt)).toBe(6);
  });

  it("⚠ null heisst: noch nie geholt — das ist keine Null", () => {
    /* Der Unterschied ist die ganze Aussage: 0 hiesse „gerade eben",
       null heisst „es gibt keinen Bezugspunkt". */
    expect(aeltesteHolungStunden([s(null)], jetzt)).toBeNull();
    expect(aeltesteHolungStunden([], jetzt)).toBeNull();
  });

  it("uebergeht unbrauchbare Zeitstempel, statt NaN zu liefern", () => {
    expect(aeltesteHolungStunden([
      s("kaputt"), s("2026-09-11T06:00:00Z"),
    ], jetzt)).toBe(6);
  });
});

describe("leseHalbzeit", () => {
  const R = (typId: number, a: number, b: number) =>
    ({ resultTypeId: typId, resultTypeName: "egal", scoreTeamA: a, scoreTeamB: b });

  it("findet die Halbzeit über die ID, nicht über den Namen", () => {
    /* ⚠ Bis zum 10.09.2026 filterte sie auf resultTypeName === "Halbzeit".
       Das ist ein Filter auf eine SCHREIBWEISE — der Name ist ein
       Anzeigetext des Verbands, die ID ein Schlüssel aus den Stammdaten
       (Resultattyp 1). Hier trägt der Name absichtlich „egal". */
    const r = leseHalbzeit({ intermediateResults: [R(2, 3, 1), R(1, 2, 0)] });
    expect(r.stand).toBe("2:0");
    expect(r.zustand).toBe("da");
  });

  it("A:B in der Zählweise des Verbands, nicht „wir:sie“", () => {
    /* Wie bei `resultat`. Wer es hier dreht, dreht es nur an einer der
       beiden Stellen — und dann widersprechen sich Resultat und
       Halbzeit. */
    expect(leseHalbzeit({ intermediateResults: [R(1, 0, 3)] }).stand).toBe("0:3");
  });

  /* ── Die drei Arten von „nichts" ─────────────────────────────────────
     In der Datenbank sehen sie gleich aus: ht_resultat ist NULL. Nur
     der Zustand sagt, warum. */

  it("kein Feld heisst „fehlt“", () => {
    expect(leseHalbzeit({})).toEqual({ stand: null, zustand: "fehlt" });
    expect(leseHalbzeit({ intermediateResults: null }))
      .toEqual({ stand: null, zustand: "fehlt" });
  });

  it("eine leere Liste heisst „leer“", () => {
    expect(leseHalbzeit({ intermediateResults: [] }))
      .toEqual({ stand: null, zustand: "leer" });
  });

  it("Einträge ohne Halbzeit heissen „ohne_halbzeit“", () => {
    /* Ein Spiel, das nur den Schlussstand führt. */
    expect(leseHalbzeit({ intermediateResults: [R(2, 3, 1)] }))
      .toEqual({ stand: null, zustand: "ohne_halbzeit" });
  });

  it("„0:0“ ist ein WERT, kein Fehlen", () => {
    /* ⚠ Der Fall, an dem sich die vier Zustände beweisen: eine torlose
       erste Halbzeit ist eine Auskunft, kein fehlender Wert. Ein
       `if (!stand)` hätte sie verschluckt. */
    const r = leseHalbzeit({ intermediateResults: [R(1, 0, 0)] });
    expect(r.stand).toBe("0:0");
    expect(r.zustand).toBe("da");
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

/* ══════════════════════════════════════════════════════════════════════
   bildeSfvPerson — der Entscheid vom 22.08.2026 ist umgedreht (10.09.2026)

   Die Namen werden jetzt GESPEICHERT. Was dabei NICHT umgedreht wurde,
   ist das, was diese Faelle festhalten: Gegner bleiben anonym, und die
   Allowlist bleibt das erste Netz.
   ══════════════════════════════════════════════════════════════════════ */
describe("bildeSfvPerson", () => {
  const P = (ueber: Record<string, unknown> = {}) => ({
    clubNumber: UNSERE, personId: 500, firstname: "Adrian", name: "Schmid",
    secondName: "Karl", jerseyNumber: 9, teamId: 38309,
    /* Alles, was NICHT mitreisen darf: */
    birthDate: "2001-03-04", passportNumber: 987654, gender: "m",
    personName: "Schmid Adrian Karl",
    ...ueber,
  });

  it("nimmt genau sechs Felder — und keines der gesperrten", () => {
    const z = bildeSfvPerson(P(), UNSERE, "v-1", JETZT);
    expect(z).toEqual({
      verein_id: "v-1", sfv_person_id: 500, name: "Adrian Schmid",
      sfv_team_id: 38309, rueckennr: 9, zuletzt_gesehen: JETZT,
    });
  });

  it("⚠ GEGNER BLEIBEN ANONYM — auch nach dem umgedrehten Entscheid", () => {
    /* Der Entscheid vom 10.09.2026 handelt ausschliesslich von EIGENEN
       Spielern. Faellt diese Zeile, ist die Umdrehung zu weit gegangen. */
    expect(bildeSfvPerson(P({ clubNumber: FREMD }), UNSERE, "v-1", JETZT)).toBeNull();
  });

  it("⚠ ein zweiter Vorname reist nicht mit", () => {
    const z = bildeSfvPerson(P(), UNSERE, "v-1", JETZT);
    expect(z?.name).toBe("Adrian Schmid");
    expect(z?.name).not.toContain("Karl");
  });

  it("laesst eine Zeile ohne Namen ganz weg, statt sie leer zu schreiben", () => {
    /* `name` ist NOT NULL — und eine leere Zeile saehe in der Maske aus wie
       ein Spieler OHNE Namen statt wie einer, dessen Name fehlt. */
    expect(bildeSfvPerson(P({ firstname: null, name: null }), UNSERE, "v-1", JETZT)).toBeNull();
  });

  it("kommt ohne Rueckennummer und ohne Team aus", () => {
    const z = bildeSfvPerson(P({ jerseyNumber: null, teamId: null }), UNSERE, "v-1", JETZT);
    expect(z).toMatchObject({ rueckennr: null, sfv_team_id: null, name: "Adrian Schmid" });
  });
});

describe("entdoppleSfvPersonen", () => {
  const Z = (id: number, nr: number | null) => ({
    verein_id: "v-1", sfv_person_id: id, name: `Nr ${nr}`,
    sfv_team_id: null, rueckennr: nr, zuletzt_gesehen: JETZT,
  });

  it("⚠ derselbe Spieler in zwei Spielen ergibt EINE Zeile", () => {
    /* Ohne das scheitert der ganze Upsert-Stapel mit 21000 — nicht die
       eine Zeile, sondern alle. */
    expect(entdoppleSfvPersonen([Z(500, 9), Z(501, 4), Z(500, 13)])).toHaveLength(2);
  });

  it("behaelt den SPAETEREN Treffer — die juengste Momentaufnahme", () => {
    const r = entdoppleSfvPersonen([Z(500, 9), Z(500, 13)]);
    expect(r[0].rueckennr).toBe(13);
  });

  it("laesst eine leere Liste leer", () => {
    expect(entdoppleSfvPersonen([])).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Die Ersatzbank stand einen halben Tag (10.09.2026)

   `bildeBankZeile` und `bildeSfvPersonAusBank` samt ihren Fällen sind mit
   dem Ausbau von `/bench` gefallen. Was sie prüften, gibt es nicht mehr —
   anders als bei `nimmMitgliedschaftZurueck()`, wo eine ZUSAGE übrig
   blieb und als Strukturprüfung weiterlebt.

   ⚠ Hier bleibt eine Zusage trotzdem: **von einem fremden Spieler wird
   nichts Personenbezogenes gespeichert.** Sie hing nie an der Bank und
   steht weiter unten bei `bildeSfvPerson` und `bildeAufstellung`.

   Der Grund für den Ausbau, gemessen am 10.09.2026: `/bench` brachte 20
   Personen, die `/players` nicht hat — alle „Trainer/in", kein einziger
   Spieler.
   ══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   Die Korrektur geht NUR in die Anzeige (10.09.2026)

   `korrigiereMinuten()` dreht `54/32/-22` für die Website zu `32/54/22`.
   ⚠ In `spiel_aufstellung` muss weiter stehen, was der Verband geliefert
   hat — sonst ist später nicht mehr zu sehen, dass es einen Fehler gab,
   und ein Vergleich mit dem Matchblatt findet nichts.

   Diese Datei prüft die SCHREIBSEITE. Die Anzeigeseite steht in
   `wpNutzlast.test.ts`; erst beide zusammen halten die Zusage.
   ══════════════════════════════════════════════════════════════════════ */
describe("bildeAufstellung — verdrehte Minuten", () => {
  it("schreibt sie unverändert, wie der Verband sie liefert", () => {
    const zeile = bildeAufstellung(
      { clubNumber: UNSERE, personId: 4711, teamId: 37930, jerseyNumber: 9,
        positionId: 48, positionName: "Sturm",
        playFromMinute: 54, playUntilMinute: 32, totalPlayTime: -22 },
      UNSERE, "v", "s", JETZT,
    )!;
    expect(zeile.von_minute).toBe(54);
    expect(zeile.bis_minute).toBe(32);
    expect(zeile.spielzeit).toBe(-22);
  });
});

describe("verschmelzeAufstellung", () => {
  /* ⚠ Der EIGENE Zweig ist seit dem Ausbau von /bench tot — es gibt nur
     noch eine Quelle, und in ihr ist personId je Spiel eindeutig. Er
     bleibt geprüft, weil er die Stelle ist, an der eine zweite Quelle
     wieder andocken würde; genau dort hat am 10.09.2026 der Upsert
     abgebrochen. */
  const eigen = (personId: number) => bildeAufstellung(
    { clubNumber: UNSERE, personId, teamId: 37930, jerseyNumber: 14,
      positionId: 48, positionName: "Ersatz (S)",
      assignmentRoleId: 2, assignmentRoleName: "Ersatz",
      firstname: "Nico", name: "Beispiel" },
    UNSERE, "v", "s", JETZT,
  )!;

  it("macht aus derselben Person EINE Zeile", () => {
    expect(verschmelzeAufstellung([eigen(999001), eigen(999001)])).toHaveLength(1);
    expect(verschmelzeAufstellung([eigen(999001), eigen(999002)])).toHaveLength(2);
  });

  it("behält Nummer, Position und Zuweisung", () => {
    const [z] = verschmelzeAufstellung([eigen(999001), eigen(999001)]);
    expect(z.rueckennr).toBe(14);
    expect(z.position_name).toBe("Ersatz (S)");
    expect(z.rolle_zuweisung).toBe("Ersatz");
  });

  it("entdoppelt fremde Zeilen über Team und Nummer, nicht über die Person", () => {
    /* Fremde Zeilen tragen gar keine sfv_person_id (Entscheid B) — wer
       sie darüber entdoppelte, warf sie alle bis auf eine weg.

       ⚠ Dieser Zweig ist der lebendige: nennt der Verband zwei Gegner
       mit derselben Rückennummer, bräche der Upsert sonst mit 21000 ab
       und nähme die Ereignisse desselben Spiels mit. */
    const fremd = (nr: number, team: number) => bildeAufstellung(
      { clubNumber: FREMD, personId: 123, teamId: team,
        jerseyNumber: nr, positionId: 48, positionName: "Sturm" },
      UNSERE, "v", "s", JETZT,
    )!;
    expect(verschmelzeAufstellung([fremd(7, 1), fremd(9, 1)])).toHaveLength(2);
    /* Zwei eigene Teams gegeneinander: dieselbe Nummer, anderes Team. */
    expect(verschmelzeAufstellung([fremd(7, 1), fremd(7, 2)])).toHaveLength(2);
    /* Und derselbe Spieler zweimal bleibt einer. */
    expect(verschmelzeAufstellung([fremd(7, 1), fremd(7, 1)])).toHaveLength(1);
  });
});

describe("zaehleVerbandKorrekturen — der Verband berichtigt nachtraeglich", () => {
  /* ⚠ ⚠ ANLASS, gemessen am 11.09.2026 an Spiel 4379006 (29.08., 1:6):
     fuenf Minuten nennen in einem spaeteren Abruf eine ANDERE Person.
     51.: 1013543 → 1072172. Das ist kein Fehler bei uns — der Verband
     erlaubt, ein Matchblatt nachtraeglich zu berichtigen.

     ⚠ Ohne diesen Zaehler loeschte das Ersetzen den Beleg mit. */
  const e = (minute: number, person: number | null, extra = {}) => ({
    minute, zusatzminute: null, typ_id: 2, subtyp_id: null,
    ist_eigener: true, sfv_person_id: person, rueckennr: null, ...extra,
  });

  it("dieselbe Stelle, andere Person — eine Korrektur", () => {
    expect(zaehleVerbandKorrekturen([e(51, 1013543)], [e(51, 1072172)])).toBe(1);
  });

  it("unveraendert ist keine Korrektur", () => {
    expect(zaehleVerbandKorrekturen([e(51, 1013543)], [e(51, 1013543)])).toBe(0);
  });

  it("⚠⚠ ein DREIFACHWECHSEL in einer Minute ist keine Korrektur", () => {
    /* Der Fehler, den die erste Messabfrage gemacht hat: sie zaehlte
       „mehr als eine Person je Minute" und meldete damit jeden
       Doppelwechsel. Vier Personen in der 46., aus EINEM Abruf. */
    const dreifach = [e(46, 1), e(46, 2), e(46, 3), e(46, 4)];
    expect(zaehleVerbandKorrekturen(dreifach, dreifach)).toBe(0);
  });

  it("die Reihenfolge des Verbands ist keine Aussage", () => {
    expect(zaehleVerbandKorrekturen(
      [e(46, 1), e(46, 2)], [e(46, 2), e(46, 1)],
    )).toBe(0);
  });

  it("⚠ zwei Tore derselben Nummer in derselben Minute bleiben zwei", () => {
    /* Gemessen am 11.09.2026: Gegner Nr. 9, zwei Tore in der 69., EIN
       Abruf. Wuerde hier entdoppelt, saehe ihr Verschwinden aus wie
       „unveraendert" — und genau das darf es nicht. */
    const zwei = [
      e(69, null, { typ_id: 1, ist_eigener: false, rueckennr: 9 }),
      e(69, null, { typ_id: 1, ist_eigener: false, rueckennr: 9 }),
    ];
    const eins = [e(69, null, { typ_id: 1, ist_eigener: false, rueckennr: 9 })];
    expect(zaehleVerbandKorrekturen(zwei, zwei)).toBe(0);
    expect(zaehleVerbandKorrekturen(zwei, eins)).toBe(1);
  });

  it("⚠ eine neue Stelle ist ein Nachtrag, keine Korrektur", () => {
    /* Die Assists, die seit dem 11.09.2026 mitkommen, sind genau das —
       sie taeuschen sonst fuenfzehn Korrekturen vor. */
    expect(zaehleVerbandKorrekturen([e(51, 1)], [e(51, 1), e(60, 2)])).toBe(0);
  });

  it("⚠ eine verschwundene Stelle ebenfalls nicht", () => {
    expect(zaehleVerbandKorrekturen([e(51, 1), e(60, 2)], [e(51, 1)])).toBe(0);
  });

  it("eigene und fremde Seite sind verschiedene Stellen", () => {
    expect(zaehleVerbandKorrekturen(
      [e(51, 1)], [e(51, null, { ist_eigener: false, rueckennr: 9 })],
    )).toBe(0);
  });

  it("Gelb und Gelb-Rot in derselben Minute sind verschieden", () => {
    /* subtyp_id gehoert in die Stelle: zwei Verwarnungen gegen denselben
       Spieler sind ein Platzverweis, nicht eine Zeile. */
    const gelb = e(70, 5, { typ_id: 3 });
    const gelbrot = e(70, 5, { typ_id: 4, subtyp_id: 20 });
    expect(zaehleVerbandKorrekturen([gelb, gelbrot], [gelb, gelbrot])).toBe(0);
  });

  it("leer gegen leer ist null", () => {
    expect(zaehleVerbandKorrekturen([], [])).toBe(0);
  });
});

describe("gegnerUnveraendert — der Waechter darf nicht taub werden", () => {
  /* ⚠ ⚠ ANLASS: fremde Aufstellungszeilen gehen ueber delete + insert, und
     `stempel_zuletzt_geaendert` kann bei INSERT nichts vergleichen — es
     gibt kein `old`. Also setzt JEDES Ersetzen `zuletzt_geaendert`, daraus
     folgt `export_wartet() > 0`, daraus ein vollstaendiger Export.

     ⚠ Die teurere Haelfte ist nicht die Last: der Waechter fragt beim
     Export „wartet etwas?" — und diese Frage wird bedeutungslos, wenn
     stuendlich etwas wartet. */
  const zeile = (nr: number, extra = {}) => ({
    sfv_team_id: 37931, rueckennr: nr, position_id: 3,
    position_name: "Verteidigung", von_minute: 1, bis_minute: 90,
    spielzeit: 90, rolle_zuweisung_id: 0, rolle_zuweisung: "-",
    sfv_person_id: null, name: null, ...extra,
  });

  it("gleiche Zeilen sind unveraendert", () => {
    expect(gegnerUnveraendert([zeile(5), zeile(9)], [zeile(5), zeile(9)]))
      .toBe(true);
  });

  it("⚠ die Reihenfolge des Verbands ist keine Aenderung", () => {
    /* Sonst waere jeder zweite Lauf eine Aenderung, und die Reparatur
       waere wirkungslos — ohne dass etwas fehlschlaegt. */
    expect(gegnerUnveraendert([zeile(5), zeile(9)], [zeile(9), zeile(5)]))
      .toBe(true);
  });

  it("⚠⚠ null und undefined gelten als gleich", () => {
    /* Die Datenbank liefert `null`, ein gebautes Objekt laesst das Feld
       womoeglich weg. Ohne diese Gleichsetzung waere JEDER Lauf eine
       Aenderung — genau der Fall, den die Reparatur beheben soll. */
    const ausDb = zeile(5, { position_name: null });
    const gebaut = { ...zeile(5) } as Record<string, unknown>;
    delete gebaut.position_name;
    expect(gegnerUnveraendert([ausDb], [gebaut])).toBe(true);
  });

  it("eine geaenderte Minute ist eine Aenderung", () => {
    expect(gegnerUnveraendert([zeile(5)], [zeile(5, { von_minute: 40 })]))
      .toBe(false);
  });

  it("eine geaenderte Position ist eine Aenderung", () => {
    expect(gegnerUnveraendert([zeile(5)], [zeile(5, { position_name: "Sturm" })]))
      .toBe(false);
  });

  it("eine Zeile mehr ist eine Aenderung", () => {
    expect(gegnerUnveraendert([zeile(5)], [zeile(5), zeile(9)])).toBe(false);
  });

  it("eine Zeile weniger ebenfalls", () => {
    expect(gegnerUnveraendert([zeile(5), zeile(9)], [zeile(5)])).toBe(false);
  });

  it("eine andere Nummer ist eine Aenderung", () => {
    expect(gegnerUnveraendert([zeile(5)], [zeile(6)])).toBe(false);
  });

  it("⚠ eine andere Mannschaft bei gleicher Nummer auch", () => {
    /* Zwei eigene Teams gegeneinander: dieselbe Nummer, verschiedene
       Seiten. Der Schluessel traegt deshalb sfv_team_id. */
    expect(gegnerUnveraendert([zeile(5)], [zeile(5, { sfv_team_id: 38309 })]))
      .toBe(false);
  });

  it("leer gegen leer ist unveraendert", () => {
    expect(gegnerUnveraendert([], [])).toBe(true);
  });

  it("⚠ eine Person, die auftaucht, ist eine Aenderung", () => {
    /* sfv_person_id steht in der Vergleichsliste, obwohl der CHECK sie bei
       fremden Zeilen auf NULL zwingt. Eine Liste, die sich auf einen CHECK
       verlaesst, ist eine Zusicherung ueber eine andere Stelle. */
    expect(gegnerUnveraendert([zeile(5)], [zeile(5, { sfv_person_id: 123 })]))
      .toBe(false);
  });
});
describe("verlaufUnveraendert — die zweite von zwei identischen Stellen", () => {
  /* ⚠ ⚠ Ich hatte am 11.09.2026 nur die Gegneraufstellung repariert. Der
     Verlauf ging bis heute ueber einen Upsert (Trigger vergleicht bei
     UPDATE); das Ersetzen, das ich am selben Tag gebaut habe, hat die
     Kollision hier ERST eingefuehrt. */
  const e = (min: number, extra = {}) => ({
    typ_id: 1, typ: "Tor", subtyp_id: null, subtyp: null,
    minute: min, zusatzminute: null, ist_eigener: true,
    sfv_team_id: 38309, gegner_club_name: null,
    sfv_person_id: 500, rueckennr: 9,
    ein_sfv_person_id: null, ein_rueckennr: null, ...extra,
  });

  it("gleiche Zeilen sind unveraendert", () => {
    expect(verlaufUnveraendert([e(37), e(55)], [e(37), e(55)])).toBe(true);
  });

  it("⚠⚠ eine neue sfv_event_id allein ist KEINE Aenderung", () => {
    /* Der Kern des Befunds vom 11.09.2026: sie ist die Kennung des
       EINTRAGS beim Verband, nicht des Ereignisses. Aendert sich nur sie,
       ist es dieselbe Sache unter neuer Nummer. */
    const alt = [{ ...e(37), sfv_event_id: 30038739 }];
    const neu = [{ ...e(37), sfv_event_id: 30083863 }];
    expect(verlaufUnveraendert(alt, neu)).toBe(true);
  });

  it("eine geaenderte Person ist eine Aenderung", () => {
    expect(verlaufUnveraendert([e(51)], [e(51, { sfv_person_id: 999 })]))
      .toBe(false);
  });

  it("die Reihenfolge des Verbands ist keine Aenderung", () => {
    expect(verlaufUnveraendert([e(37), e(55)], [e(55), e(37)])).toBe(true);
  });

  it("⚠ null und undefined gelten als gleich", () => {
    const ausDb = e(37, { gegner_club_name: null });
    const gebaut = { ...e(37) } as Record<string, unknown>;
    delete gebaut.gegner_club_name;
    expect(verlaufUnveraendert([ausDb], [gebaut])).toBe(true);
  });

  it("eine Zeile mehr ist eine Aenderung", () => {
    expect(verlaufUnveraendert([e(37)], [e(37), e(55)])).toBe(false);
  });

  it("leer gegen leer ist unveraendert", () => {
    expect(verlaufUnveraendert([], [])).toBe(true);
  });
});
