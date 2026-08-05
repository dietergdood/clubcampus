/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/elternService.test.ts
   Unit-Tests elternService nach Etappe 3: Elternkontakte haengen an
   `personen`, verknuepft ueber `eltern_kinder.person_id`.

   Schwerpunkte: Zusammenfuehren ueber die E-Mail, Elternteile ohne
   E-Mail, der Geschwisterfall (eine Person, zwei Verknuepfungen) und
   dass eine Person nie mit einer Verknuepfung mitgeloescht wird.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import {
  insertElternkontakt, updateElternkontakt, linkKind, unlinkKind, setHauptkontakt,
  entkoppleKind, entferneElternVerknuepfung, loeschePersonWennVerwaist,
  fasseBeziehungZusammen,
} from "../elternService.ts";

const BASIS = { vorname: "Erika", nachname: "Kontakt", email: "e@k.ch" };

/* Person wird nicht gefunden -> Insert liefert die neue Id. */
const NEUE_PERSON = {
  "personen.select": { data: null },
  "personen.insert": { data: { id: "p-neu" }, error: null },
};

describe("insertElternkontakt — Person anlegen", () => {
  it("legt die Person an und verknuepft sie ueber person_id", async () => {
    const sb = makeSb(NEUE_PERSON);
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");

    expect(res).toBeNull();
    expect(sb.find("personen", "insert")!.payload).toEqual(
      expect.objectContaining({ vorname: "Erika", nachname: "Kontakt", email: "e@k.ch", verein_id: "verein-1" }),
    );
    expect(sb.find("eltern_kinder", "insert")!.payload).toEqual({
      person_id: "p-neu", mitglied_id: 7, verein_id: "verein-1", hauptkontakt: false, beziehung: null,
    });
  });

  it("schreibt kein eltern_id mehr — die Altspalte ist seit Etappe 3 nullable", async () => {
    const sb = makeSb(NEUE_PERSON);
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");
    expect(sb.find("eltern_kinder", "insert")!.payload).not.toHaveProperty("eltern_id");
  });

  it("fasst elternkontakte nicht mehr an", async () => {
    const sb = makeSb(NEUE_PERSON);
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");
    expect(sb.opsOn("elternkontakte")).toHaveLength(0);
  });

  it("beziehung geht an die Verknuepfung, nicht an die Person", async () => {
    const sb = makeSb(NEUE_PERSON);
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7, beziehung: "Mutter" }, "verein-1");

    expect(sb.find("personen", "insert")!.payload).not.toHaveProperty("beziehung");
    expect(sb.find("eltern_kinder", "insert")!.payload.beziehung).toBe("Mutter");
  });

  it("hauptkontakt faellt auf false zurueck, wenn nicht gesetzt", async () => {
    const sb = makeSb(NEUE_PERSON);
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");
    expect(sb.find("eltern_kinder", "insert")!.payload.hauptkontakt).toBe(false);
  });
});

describe("insertElternkontakt — Zusammenfuehren ueber die E-Mail", () => {
  it("verknuepft eine bestehende Person, statt sie doppelt anzulegen", async () => {
    /* Der Vater ist bereits Aktivmitglied — seit Etappe 2a dieselbe
       Zeile in `personen`. Er darf kein zweites Mal entstehen. */
    const sb = makeSb({ "personen.select": { data: { id: "p-vorhanden" } } });
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");

    expect(res).toBeNull();
    expect(sb.find("personen", "insert")).toBeUndefined();
    expect(sb.find("eltern_kinder", "insert")!.payload.person_id).toBe("p-vorhanden");
  });

  it("sucht per verein_id + ilike auf der E-Mail", async () => {
    const sb = makeSb({ "personen.select": { data: { id: "p-vorhanden" } } });
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");

    expect(sb.find("personen", "select")!.filters).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["verein_id", "verein-1"] },
        { method: "ilike", args: ["email", "e@k.ch"] },
      ]),
    );
  });

  it("ueberschreibt die Daten der gefundenen Person nicht", async () => {
    const sb = makeSb({ "personen.select": { data: { id: "p-vorhanden" } } });
    await insertElternkontakt(sb as any, { ...BASIS, telefon: "079", mitglied_id: 7 }, "verein-1");
    expect(sb.find("personen", "update")).toBeUndefined();
  });

  it("Geschwisterfall: zweites Kind ergibt eine zweite Verknuepfung, keine zweite Person", async () => {
    const sb = makeSb({ "personen.select": { data: { id: "p-odermatt" } } });
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");
    await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 8 }, "verein-1");

    expect(sb.opsOn("personen").filter(c => c.op === "insert")).toHaveLength(0);
    const links = sb.opsOn("eltern_kinder").filter(c => c.op === "insert");
    expect(links).toHaveLength(2);
    expect(links.map(l => l.payload.mitglied_id)).toEqual([7, 8]);
    expect(new Set(links.map(l => l.payload.person_id))).toEqual(new Set(["p-odermatt"]));
  });
});

describe("insertElternkontakt — ohne E-Mail", () => {
  it("legt immer neu an und sucht gar nicht erst", async () => {
    /* Ein Leerwert darf nicht zusammenfuehren, sonst wuerden alle
       Elternteile ohne E-Mail zu einer Person verschmelzen. */
    const sb = makeSb({ "personen.insert": { data: { id: "p-oma" }, error: null } });
    const res = await insertElternkontakt(
      sb as any, { vorname: "Rosmarie", nachname: "Steiner", telefon: "079", mitglied_id: 7 }, "verein-1",
    );

    expect(res).toBeNull();
    expect(sb.find("personen", "select")).toBeUndefined();
    expect(sb.find("personen", "insert")!.payload.email).toBeNull();
    expect(sb.find("eltern_kinder", "insert")!.payload.person_id).toBe("p-oma");
  });

  it("zwei Elternteile ohne E-Mail werden zwei Personen", async () => {
    const sb = makeSb({ "personen.insert": { data: { id: "p-1" }, error: null } });
    await insertElternkontakt(sb as any, { vorname: "A", nachname: "X", mitglied_id: 7 }, "verein-1");
    await insertElternkontakt(sb as any, { vorname: "B", nachname: "Y", mitglied_id: 8 }, "verein-1");
    expect(sb.opsOn("personen").filter(c => c.op === "insert")).toHaveLength(2);
  });

  it("leere E-Mail wird zu null, nicht zu ''", async () => {
    const sb = makeSb({ "personen.insert": { data: { id: "p-1" }, error: null } });
    await insertElternkontakt(sb as any, { vorname: "A", nachname: "X", email: "   ", mitglied_id: 7 }, "verein-1");
    expect(sb.find("personen", "select")).toBeUndefined();
    expect(sb.find("personen", "insert")!.payload.email).toBeNull();
  });
});

describe("insertElternkontakt — Fehlerpfade", () => {
  it("reicht einen Fehler beim personen-Insert durch, ohne zu verknuepfen", async () => {
    const err = pgError("insert fail");
    const sb = makeSb({ "personen.select": { data: null }, "personen.insert": { data: null, error: err } });
    expect(await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1")).toBe(err);
    expect(sb.opsOn("eltern_kinder")).toHaveLength(0);
  });

  it("uebersetzt 23505 in eine lesbare Meldung", async () => {
    /* Roh durchgereicht landet der Code hoechstens in einer saveMsg und
       der Benutzer sieht nichts (CLAUDE.md → Bekannte Defekte). */
    const sb = makeSb({
      "personen.select": { data: null },
      "personen.insert": { data: null, error: pgError("duplicate key", "23505") },
    });
    const res = await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1");
    expect(res!.message).toBe("Diese E-Mail ist bereits vergeben.");
    expect(res!.code).toBe("23505");
  });

  it("reicht einen Fehler beim Verknuepfen durch", async () => {
    const linkErr = pgError("link fail");
    const sb = makeSb({ ...NEUE_PERSON, "eltern_kinder.insert": { error: linkErr } });
    expect(await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 7 }, "verein-1")).toBe(linkErr);
  });

  it("ohne mitglied_id (0) wird die Person angelegt, aber nicht verknuepft", async () => {
    const sb = makeSb(NEUE_PERSON);
    expect(await insertElternkontakt(sb as any, { ...BASIS, mitglied_id: 0 }, "verein-1")).toBeNull();
    expect(sb.opsOn("eltern_kinder")).toHaveLength(0);
  });
});

describe("updateElternkontakt", () => {
  it("schreibt Personenfelder nach personen", async () => {
    const sb = makeSb();
    await updateElternkontakt(sb as any, "p-1", { vorname: "Erika", telefon: "079" });

    const rec = sb.find("personen", "update")!;
    expect(rec.payload).toEqual({ vorname: "Erika", telefon: "079" });
    expect(rec.filters).toEqual([{ method: "eq", args: ["id", "p-1"] }]);
    expect(sb.opsOn("eltern_kinder")).toHaveLength(0);
  });

  it("schreibt beziehung an die genannte Verknuepfung", async () => {
    const sb = makeSb();
    await updateElternkontakt(sb as any, "p-1", { beziehung: "Stiefmutter" }, 7);

    const rec = sb.find("eltern_kinder", "update")!;
    expect(rec.payload).toEqual({ beziehung: "Stiefmutter" });
    expect(rec.filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
    expect(sb.opsOn("personen")).toHaveLength(0);
  });

  it("ohne mitgliedId gilt die beziehung fuer alle Kinder dieser Person", async () => {
    const sb = makeSb();
    await updateElternkontakt(sb as any, "p-1", { beziehung: "Mutter" });
    expect(sb.find("eltern_kinder", "update")!.filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
    ]);
  });

  it("uebersetzt 23505 beim Personen-Update", async () => {
    const sb = makeSb({ "personen.update": { error: pgError("dup", "23505") } });
    const res = await updateElternkontakt(sb as any, "p-1", { email: "a@b.ch" });
    expect(res!.message).toBe("Diese E-Mail ist bereits vergeben.");
  });
});

describe("linkKind", () => {
  it("upsert mit person_id und dem onConflict-Schluessel des Unique-Index", async () => {
    const sb = makeSb();
    await linkKind(sb as any, "p-1", 7, "verein-1", true);

    const rec = sb.find("eltern_kinder", "upsert")!;
    expect(rec.payload).toEqual({
      person_id: "p-1", mitglied_id: 7, verein_id: "verein-1", hauptkontakt: true, beziehung: null,
    });
    /* Stimmt die Spaltenliste nicht mit eltern_kinder_person_mitglied_key
       ueberein, scheitert jeder Upsert. */
    expect(rec.upsertOptions).toEqual({ onConflict: "verein_id,person_id,mitglied_id" });
  });

  it("hauptkontakt default false", async () => {
    const sb = makeSb();
    await linkKind(sb as any, "p-1", 7, "verein-1");
    expect(sb.find("eltern_kinder", "upsert")!.payload.hauptkontakt).toBe(false);
  });

  it("reicht den Fehler durch", async () => {
    const err = pgError();
    const sb = makeSb({ "eltern_kinder.upsert": { error: err } });
    expect(await linkKind(sb as any, "p-1", 7, "verein-1")).toBe(err);
  });
});

describe("unlinkKind", () => {
  it("loescht ueber person_id + mitglied_id und meldet Rest + Kind-Status", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 2 },
      "mitglieder.select": { data: { aktiv: true } },
    });
    const res = await unlinkKind(sb as any, "p-1", 7);

    expect(sb.find("eltern_kinder", "delete")!.filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
    expect(res).toEqual({ verbleibendeKinder: 2, kindNochAktiv: true });
  });

  it("count null -> 0, Kind nicht gefunden -> kindNochAktiv false", async () => {
    const sb = makeSb({ "eltern_kinder.select": { count: null }, "mitglieder.select": { data: null } });
    expect(await unlinkKind(sb as any, "p-1", 7)).toEqual({ verbleibendeKinder: 0, kindNochAktiv: false });
  });
});

describe("loeschePersonWennVerwaist", () => {
  it("loescht die Person, wenn nichts mehr an ihr haengt", async () => {
    const sb = makeSb();
    expect(await loeschePersonWennVerwaist(sb as any, "p-1")).toBe(true);
    expect(sb.find("personen", "delete")!.filters).toEqual([{ method: "eq", args: ["id", "p-1"] }]);
  });

  it("laesst sie stehen, solange eine Mitgliedschaft daran haengt", async () => {
    /* Seit Etappe 2a ist der Vater, der selbst Aktivmitglied ist,
       DIESELBE Zeile in `personen`. */
    const sb = makeSb({ "mitglieder.select": { count: 1 } });
    expect(await loeschePersonWennVerwaist(sb as any, "p-1")).toBe(false);
    expect(sb.find("personen", "delete")).toBeUndefined();
  });

  it("laesst sie stehen, solange eine Verknuepfung daran haengt", async () => {
    const sb = makeSb({ "eltern_kinder.select": { count: 1 } });
    expect(await loeschePersonWennVerwaist(sb as any, "p-1")).toBe(false);
  });

  it("laesst sie stehen, solange ein Benutzerkonto daran haengt", async () => {
    const sb = makeSb({ "benutzer.select": { count: 1 } });
    expect(await loeschePersonWennVerwaist(sb as any, "p-1")).toBe(false);
  });

  it("laesst sie im Zweifel stehen, wenn eine Zaehlung fehlschlaegt", async () => {
    const sb = makeSb({ "mitglieder.select": { error: pgError("kein Leserecht") } });
    expect(await loeschePersonWennVerwaist(sb as any, "p-1")).toBe(false);
  });
});

describe("entferneElternVerknuepfung", () => {
  it("trennt alle Verknuepfungen der Person", async () => {
    const sb = makeSb({ "mitglieder.select": { count: 1 } });
    expect(await entferneElternVerknuepfung(sb as any, "p-1")).toBeNull();
    expect(sb.find("eltern_kinder", "delete")!.filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
    ]);
  });

  it("trennt mit mitgliedId nur die eine Verknuepfung", async () => {
    const sb = makeSb({ "mitglieder.select": { count: 1 } });
    await entferneElternVerknuepfung(sb as any, "p-1", 7);
    expect(sb.find("eltern_kinder", "delete")!.filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
  });

  it("loescht die Person nicht, wenn sie noch Mitglied ist", async () => {
    const sb = makeSb({ "mitglieder.select": { count: 1 } });
    await entferneElternVerknuepfung(sb as any, "p-1");
    expect(sb.find("personen", "delete")).toBeUndefined();
  });
});

describe("entkoppleKind", () => {
  it("bei weiteren Kindern bleibt alles stehen", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 1 },
      "mitglieder.select": { data: { aktiv: true }, count: 1 },
    });
    expect(await entkoppleKind(sb as any, "p-1", 7)).toBe("verknuepft");
    expect(sb.find("personen", "delete")).toBeUndefined();
  });

  it("letztes Kind noch im Verein -> Supporter, ohne Schreiben nach elternkontakte", async () => {
    /* Der Supporter-Status haengt seit Etappe 3 nur noch am Konto;
       ein Mitgliedtyp dafuer kommt in Etappe 5. */
    const sb = makeSb({
      "eltern_kinder.select": { count: 0 },
      "mitglieder.select": { data: { aktiv: true } },
    });
    expect(await entkoppleKind(sb as any, "p-1", 7, "user-1")).toBe("supporter");
    expect(sb.opsOn("elternkontakte")).toHaveLength(0);
    expect(sb.find("benutzer", "update")!.payload).toEqual({ role: "supporter" });
    expect(sb.find("personen", "delete")).toBeUndefined();
  });

  it("Supporter ohne Konto: die Person bleibt trotzdem stehen", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 0 },
      "mitglieder.select": { data: { aktiv: true } },
    });
    expect(await entkoppleKind(sb as any, "p-1", 7)).toBe("supporter");
    expect(sb.find("personen", "delete")).toBeUndefined();
    expect(sb.find("benutzer", "update")).toBeUndefined();
  });

  it("Kind hat den Verein verlassen -> verwaiste Person wird geloescht", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 0 },
      "mitglieder.select": { data: { aktiv: false }, count: 0 },
    });
    expect(await entkoppleKind(sb as any, "p-1", 7)).toBe("geloescht");
    expect(sb.find("personen", "delete")).toBeDefined();
  });

  it("Kind hat den Verein verlassen, Elternteil ist selbst Mitglied -> Person bleibt", async () => {
    const sb = makeSb({
      "eltern_kinder.select": { count: 0 },
      "mitglieder.select": { data: { aktiv: false }, count: 1 },
    });
    expect(await entkoppleKind(sb as any, "p-1", 7)).toBe("geloescht");
    expect(sb.find("personen", "delete")).toBeUndefined();
  });
});

describe("setHauptkontakt", () => {
  it("setzt erst alle Kontakte des Kindes auf false, dann den Zielkontakt auf true", async () => {
    const sb = makeSb();
    await setHauptkontakt(sb as any, 7, "p-1");

    const recs = sb.opsOn("eltern_kinder");
    expect(recs).toHaveLength(2);
    expect(recs[0].payload).toEqual({ hauptkontakt: false });
    expect(recs[0].filters).toEqual([{ method: "eq", args: ["mitglied_id", 7] }]);
    expect(recs[1].payload).toEqual({ hauptkontakt: true });
    expect(recs[1].filters).toEqual([
      { method: "eq", args: ["person_id", "p-1"] },
      { method: "eq", args: ["mitglied_id", 7] },
    ]);
  });
});

describe("fasseBeziehungZusammen", () => {
  it("fasst mehrere Werte kommagetrennt zusammen", () => {
    expect(fasseBeziehungZusammen(["Mutter", "Stiefmutter"])).toBe("Mutter, Stiefmutter");
  });

  it("entfernt Doppelungen — der Normalfall bleibt einwertig", () => {
    expect(fasseBeziehungZusammen(["Mutter", "Mutter"])).toBe("Mutter");
  });

  it("ignoriert leere Werte und liefert null, wenn nichts uebrig bleibt", () => {
    expect(fasseBeziehungZusammen([null, "", "  ", undefined])).toBeNull();
  });
});
