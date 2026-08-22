/* ═══════════════════════════════════════════════════════════════
   beendeMitgliedschaft — der Austritt

   ⚠ DIESE FUNKTION HATTE BIS ZUM 22.08.2026 KEINEN EINZIGEN TEST.
   Genau deshalb konnte der Defekt stehen: „Supporter" beim Austritt
   machte NIEMANDEN zum Supporter, weil die Zeile in
   `personenart_pro_person` nie geschrieben wurde — im ganzen
   Quelltext gab es keinen Schreiber. Es schlug nichts fehl, kein
   Test wurde rot, und drei Stellen gaben drei verschiedene
   Antworten auf dieselbe Frage.

   Die Fälle hier nennen deshalb TABELLEN UND FELDNAMEN, nicht
   Längen: eine Prüfung auf „ein Aufruf mehr" bestünde auch dann,
   wenn der Aufruf etwas anderes schriebe.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb } from "./_mockSb.ts";
import { beendeMitgliedschaft, bleibtMitglied, entferneAustrittsart } from "../supporterService.ts";
import { archiviereMitglied, beendeVerknuepfungen } from "../memberService.ts";

afterEach(() => vi.restoreAllMocks());

/** Der Normalfall: ein Verein mit eingestellter Austritts-Art. */
const MIT_ZIEL = {
  "vereine.select": { data: { austritt_art_id: "art-1" } },
  "personenarten.select": { data: { id: "art-1", name: "Ehemalige", standard_rolle: "supporter" } },
  "kader.select": { data: [] },
};

describe("bleibtMitglied — die eine Frage, an der alles hängt", () => {
  it("trennt Typwechsel von Austritt", () => {
    expect(bleibtMitglied({ art: "typwechsel", mitgliedtyp: "Ehrenmitglied" })).toBe(true);
    expect(bleibtMitglied({ art: "beenden" })).toBe(false);
    expect(bleibtMitglied({ art: "archiv" })).toBe(false);
  });
});

describe("beendeMitgliedschaft — die Art nach dem Austritt", () => {
  it("⚠ schreibt die eingestellte Art nach personenart_pro_person", async () => {
    /* DER FALL, DER GEFEHLT HAT. Ohne diese Zeile sagt der Supporter-Tab
       „kein Supporter", der Chip im Profil gar nichts und die Portalrolle
       „supporter" — drei Antworten auf eine Frage. */
    const sb = makeSb(MIT_ZIEL);
    const { ok } = await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" },
      personId: "p-1", am: "2026-08-22",
    });
    expect(ok).toBe(true);
    const rec = sb.find("personenart_pro_person", "upsert");
    expect(rec).toBeTruthy();
    expect(rec!.payload).toEqual({
      verein_id: "v-1", person_id: "p-1", art_id: "art-1",
    });
  });

  it("nennt die Art im Hinweis, damit der Bediener sie sieht", async () => {
    const sb = makeSb(MIT_ZIEL);
    const { hinweise } = await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" }, personId: "p-1",
    });
    expect(hinweise.join(" ")).toContain("Ehemalige");
  });

  it("⚠ schreibt KEINE Art beim Archiv — sonst stünde die Person an zwei Orten", async () => {
    const sb = makeSb(MIT_ZIEL);
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "archiv" }, personId: "p-1",
    });
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
  });

  it("ohne eingestelltes Ziel sagt es das, statt still nichts zu tun", async () => {
    const sb = makeSb({ "vereine.select": { data: { austritt_art_id: null } }, "kader.select": { data: [] } });
    const { ok, hinweise } = await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" }, personId: "p-1",
    });
    expect(ok).toBe(true);
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
    /* Der Ort gehört in den Text — sonst sucht jemand in der Datenbank
       nach einer Einstellung, die er nicht findet. */
    expect(hinweise.join(" ")).toContain("Portalverwaltung");
  });

  it("schlägt die Person nach, wenn der Aufrufer sie nicht mitgibt", async () => {
    const sb = makeSb({ ...MIT_ZIEL, "mitglieder.select": { data: { person_id: "p-9" } } });
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" },
    });
    expect(sb.find("personenart_pro_person", "upsert")!.payload).toEqual(
      expect.objectContaining({ person_id: "p-9" }));
  });
});

describe("beendeMitgliedschaft — die Portalrolle", () => {
  it("⚠ nimmt die Rolle aus der ART, nicht aus einer festen Zeichenkette", async () => {
    /* Bis zum 22.08.2026 stand hier `role: "supporter"` fest im Code —
       richtig, solange das Ziel Supporter hiess, und falsch in dem Moment,
       in dem jemand „Ehemalige" einstellt. */
    const sb = makeSb({
      ...MIT_ZIEL,
      "personenarten.select": { data: { id: "art-1", name: "Ehemalige", standard_rolle: "mitglied" } },
    });
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" },
      personId: "p-1", benutzerId: "b-1",
    });
    expect(sb.find("benutzer", "update")!.payload).toEqual({
      mitglied_id: null, role: "mitglied",
    });
  });

  it("⚠ lässt die Rolle STEHEN, wenn die Art keine nennt", async () => {
    /* Sie zu leeren wäre schlechter als eine ungenaue: eine Person ohne
       Rolle kommt an gar nichts mehr. */
    const sb = makeSb({
      ...MIT_ZIEL,
      "personenarten.select": { data: { id: "art-1", name: "Ehemalige", standard_rolle: null } },
    });
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" },
      personId: "p-1", benutzerId: "b-1",
    });
    const rec = sb.find("benutzer", "update")!;
    expect(rec.payload).toEqual({ mitglied_id: null });
    expect(rec.payload).not.toHaveProperty("role");
  });
});

describe("beendeMitgliedschaft — Typwechsel ist kein Austritt", () => {
  it("setzt nur den Typ und lässt die Mitgliedschaft aktiv", async () => {
    const sb = makeSb({});
    const { ok, hinweise } = await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1",
      ziel: { art: "typwechsel", mitgliedtyp: "Pausenmitglied" },
    });
    expect(ok).toBe(true);
    const rec = sb.find("mitglieder", "update")!;
    expect(rec.payload).toEqual(expect.objectContaining({ mitgliedtyp: "Pausenmitglied" }));
    expect(rec.payload).not.toHaveProperty("aktiv");
    expect(hinweise.join(" ")).toContain("Pausenmitglied");
  });

  it("⚠ beendet KEINE Kadereinträge und schreibt keine Art", async () => {
    const sb = makeSb({});
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1",
      ziel: { art: "typwechsel", mitgliedtyp: "Ehrenmitglied" },
    });
    expect(sb.opsOn("kader")).toHaveLength(0);
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
  });

  it("nimmt den Typ aus dem Aufruf — nicht aus einer Liste im Code", async () => {
    /* „Pausenmitglied" war vor dem 22.08.2026 gar nicht wählbar: die
       Auswahl kannte nur Ehren- und Aktivmitglied, beide fest verdrahtet.
       Dieser Fall hält fest, dass jeder Typ durchgeht. */
    const sb = makeSb({});
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1",
      ziel: { art: "typwechsel", mitgliedtyp: "Freimitglied" },
    });
    expect(sb.find("mitglieder", "update")!.payload).toEqual(
      expect.objectContaining({ mitgliedtyp: "Freimitglied" }));
  });
});

describe("entferneAustrittsart — die Gegenrichtung", () => {
  it("⚠ entfernt genau die eingestellte Art — sonst trüge ein Rückkehrer für immer die alte", async () => {
    const sb = makeSb({ "vereine.select": { data: { austritt_art_id: "art-1" } } });
    const fehler = await entferneAustrittsart(sb as never, "p-1", "v-1");
    expect(fehler).toBeNull();
    const rec = sb.find("personenart_pro_person", "delete")!;
    /* Die Filter nennen: ein `delete` ohne art_id löschte ALLE Arten der
       Person — auch die, die jemand von Hand vergeben hat. */
    const args = rec.filters.filter(f => f.method === "eq").map(f => f.args);
    expect(args).toEqual(expect.arrayContaining([
      ["verein_id", "v-1"], ["person_id", "p-1"], ["art_id", "art-1"],
    ]));
  });

  it("tut nichts, wenn der Verein kein Ziel eingestellt hat", async () => {
    const sb = makeSb({ "vereine.select": { data: { austritt_art_id: null } } });
    expect(await entferneAustrittsart(sb as never, "p-1", "v-1")).toBeNull();
    expect(sb.opsOn("personenart_pro_person")).toHaveLength(0);
  });
});

/* ── Archiv: die zwei Wege tun dasselbe ───────────────────────────────────
   ⚠ Bis zum 22.08.2026 taten sie FUENF verschiedene Dinge, und in zweien
   war der haertere der mildere: der Knopf liess die Person im Kader, der
   Austritt liess ihr Konto laufen. Entschieden am 22.08.2026 (Didi): der
   Austritt ist der vollstaendige Weg, der Knopf bleibt als Abkuerzung —
   aber er tut dasselbe. Uebrig bleiben zwei gewollte Unterschiede: das
   Datum (Knopf heute, Austritt waehlbar) und wer geklickt hat. */
describe("Archiv — Knopf und Austritt", () => {
  /* Ein Verein, in dem Kader, Konto und Amt existieren. */
  const MIT_ALLEM = {
    "kader.select": { data: [{ id: "k-1" }] },
    "mitglieder.select": { data: [{ person_id: "p-1" }] },
    "benutzer.select": { data: [{ id: "b-1" }] },
    "benutzer_funktionen.update": { count: 2 },
  };

  it("⚠ der KNOPF beendet jetzt auch die Kadereinträge", async () => {
    /* Vorher blieben sie aktiv — ein archivierter Mensch stand weiter in
       der Aufstellung seines Teams. */
    const sb = makeSb(MIT_ALLEM);
    await archiviereMitglied(sb as never, [42], "Admin");
    expect(sb.find("kader", "update")!.payload).toEqual({ aktiv: false });
  });

  it("⚠ der KNOPF beendet jetzt auch die Ämter", async () => {
    const sb = makeSb(MIT_ALLEM);
    await archiviereMitglied(sb as never, [42], "Admin");
    const rec = sb.find("benutzer_funktionen", "update")!;
    expect(Object.keys(rec.payload)).toEqual(["bis"]);
  });

  it("⚠ der AUSTRITT ins Archiv deaktiviert jetzt das Konto", async () => {
    /* DER ERNSTERE TEIL. Vorher blieb ein ausgetretenes Mitglied
       angemeldet; gesperrt wird der Login allein durch `benutzer.aktiv`.
       Dass es niemanden traf, lag an der Datenlage — keines der drei hatte
       ein Konto. Das ist keine Absicherung. */
    const sb = makeSb(MIT_ALLEM);
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "archiv" },
      personId: "p-1", benutzerId: "b-1", am: "2026-08-22",
    });
    const konto = sb.opsOn("benutzer").find(r => r.op === "update");
    expect(konto?.payload).toEqual({ aktiv: false });
  });

  it("⚠ beim Beenden MIT Weiterführung bleibt das Konto aktiv", async () => {
    /* Die Gegenprobe, und sie ist die wichtigere: hier ist der Zugang der
       Zweck. Ohne diesen Fall könnte jemand `beendeVerknuepfungen()` auf
       beide Zweige legen und alle Supporter aussperren. */
    const sb = makeSb({
      ...MIT_ALLEM,
      "vereine.select": { data: { austritt_art_id: "art-1" } },
      "personenarten.select": { data: { id: "art-1", name: "Ehemalige", standard_rolle: "supporter" } },
    });
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "beenden" },
      personId: "p-1", benutzerId: "b-1",
    });
    const kontoUpdates = sb.opsOn("benutzer").filter(r => r.op === "update");
    for (const rec of kontoUpdates) expect(rec.payload).not.toHaveProperty("aktiv");
  });

  it("⚠ hält fest, WER beendet hat — auf beiden Wegen", async () => {
    const sb = makeSb(MIT_ALLEM);
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "archiv" },
      personId: "p-1", am: "2026-08-22", deaktiviertVon: "Didi",
    });
    expect(sb.find("mitglieder", "update")!.payload).toEqual(
      expect.objectContaining({ aktiv: false, deaktiviert_von: "Didi" }));
  });

  it("das Datum bleibt der Unterschied: der Austritt ist rückdatierbar", async () => {
    const sb = makeSb(MIT_ALLEM);
    await beendeMitgliedschaft(sb as never, {
      mitgliedId: 42, vereinId: "v-1", ziel: { art: "archiv" },
      personId: "p-1", am: "2026-07-01",
    });
    expect(String(sb.find("mitglieder", "update")!.payload.deaktiviert_am)).toContain("2026-07-01");
  });
});

/* ── Wer noch ein Kind im Verein hat, behält seinen Zugang ────────────────
   ⚠ EIN FEHLER, DEN ICH SELBST GEBAUT HABE. Diese Bedingung stand seit
   Etappe 3 in `updatePortalZugang()`. Beim Bündeln der zwei Archiv-Wege am
   22.08.2026 habe ich sie übergangen — `beendeVerknuepfungen()` schaltete
   bedingungslos ab.

   Wirkung: ein Elternteil, das SELBST Mitglied ist, hätte mit dem Ende
   seiner Mitgliedschaft auch den Zugang zu den Daten seines noch aktiven
   Kindes verloren. Kein Fehler, keine Meldung — nur ein Login, der nicht
   mehr geht.

   Das ist der Preis von zwei Stellen mit derselben Aufgabe: sie sind nicht
   gleich, und beim Vereinheitlichen gewinnt die ärmere. */
describe("beendeVerknuepfungen — der Portal-Zugang", () => {
  const BASIS = {
    "kader.select": { data: [] },
    "mitglieder.select": { data: [{ person_id: "p-1" }] },
    "benutzer.select": { data: [{ id: "b-1", person_id: "p-1" }] },
  };

  it("schaltet das Konto ab, wenn kein Kind mehr im Verein ist", async () => {
    const sb = makeSb({ ...BASIS, "eltern_kinder.select": { data: [] } });
    const hinweise = await beendeVerknuepfungen(sb as never, [42], "2026-08-22");
    const upd = sb.opsOn("benutzer").find(r => r.op === "update");
    expect(upd?.payload).toEqual({ aktiv: false });
    expect(hinweise.join(" ")).toContain("deaktiviert");
  });

  it("⚠ lässt es AKTIV, wenn noch ein anderes Kind im Verein ist", async () => {
    const sb = makeSb({ ...BASIS, "eltern_kinder.select": { data: [
      { person_id: "p-1", mitglied_id: 99, mitglieder: { aktiv: true } },
    ] } });
    const hinweise = await beendeVerknuepfungen(sb as never, [42], "2026-08-22");
    expect(sb.opsOn("benutzer").find(r => r.op === "update")).toBeUndefined();
    expect(hinweise.join(" ")).toContain("bleiben bestehen");
  });

  it("⚠ das Kind, das GERADE beendet wird, zählt nicht als Grund zu bleiben", async () => {
    /* Sonst behielte jedes Elternteil seinen Zugang, weil die eigene Zeile
       noch als aktiv gelesen wird. */
    const sb = makeSb({ ...BASIS, "eltern_kinder.select": { data: [
      { person_id: "p-1", mitglied_id: 42, mitglieder: { aktiv: true } },
    ] } });
    await beendeVerknuepfungen(sb as never, [42], "2026-08-22");
    expect(sb.opsOn("benutzer").find(r => r.op === "update")?.payload).toEqual({ aktiv: false });
  });

  it("ein Kind mit BEENDETER Mitgliedschaft ist kein Grund zu bleiben", async () => {
    const sb = makeSb({ ...BASIS, "eltern_kinder.select": { data: [
      { person_id: "p-1", mitglied_id: 99, mitglieder: { aktiv: false } },
    ] } });
    await beendeVerknuepfungen(sb as never, [42], "2026-08-22");
    expect(sb.opsOn("benutzer").find(r => r.op === "update")?.payload).toEqual({ aktiv: false });
  });
});
