/* ═══════════════════════════════════════════════════════════════
   Was ein Elternteil an seinem Kind ändern darf

   `personen_update_kind` (21.08.2026) erlaubt die ZEILE. RLS kennt
   keine Spalten — die Feldsperre sitzt in `kindService` und ist
   eine ALLOWLIST: aufgezählt wird, was durchkommt.

   Eine Denylist wäre nur so gut wie die Fantasie dessen, der sie
   geschrieben hat. Am 19.08.2026 hat genau das die Klarnamen von
   32 Spielern durch die SFV-Schwärzung gelassen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSb, pgError } from "./_mockSb.ts";
import { updateKindDurchElternteil, updateEigenePerson, elternDuerfen, ELTERN_DUERFEN } from "../kindService.ts";
import { PERSON_FELDER } from "../../person/personService.ts";

afterEach(() => vi.restoreAllMocks());

/* Ein Schreibvorgang, der ankommt: `update ... .select("id")` gibt die
   geschriebene Zeile zurueck. Eine LEERE Liste heisst „RLS hat nicht
   getroffen" — deshalb steht hier eine Liste und kein Objekt. */
const sbOk = () => makeSb({ "personen.update": { data: [{ id: "k-1" }] } });

describe("die Allowlist", () => {
  it("lässt durch, was der Elternteil pflegen soll", () => {
    for (const f of ["ahv_nr", "geburtsdatum", "strasse", "plz", "ort", "kanton", "telefon"]) {
      expect(elternDuerfen(f)).toBe(true);
    }
  });

  it("⚠ sperrt funktionen, email und verein_id", () => {
    /* funktionen sind Vereinsämter — niemand vergibt sich selbst eines.
       email ist der Login-Name des Kindes. verein_id steht gar nicht erst in
       PERSON_FELDER und ist damit doppelt gesperrt. */
    for (const f of ["funktionen", "email", "verein_id", "profil_geprueft_at", "foto_url", "land"]) {
      expect(elternDuerfen(f)).toBe(false);
    }
  });

  it("schreibt nur die erlaubten Felder und meldet den Rest", () => {
    /* „Meldet" ist der Punkt: ein still verschluckter Wert sähe für den
       Elternteil aus wie ein gespeicherter, der nicht ankommt. */
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sb = sbOk();
    return updateKindDurchElternteil(sb as never, "k-1", {
      ahv_nr: "756.1234.5678.97", funktionen: ["Kassier"], email: "kind@example.ch",
    }).then(erg => {
      expect(erg.ok).toBe(true);
      expect(erg.abgewiesen.sort()).toEqual(["email", "funktionen"]);
      const payload = sb.find("personen", "update")!.payload;
      expect(payload.ahv_nr).toBe("756.1234.5678.97");
      expect(payload).not.toHaveProperty("funktionen");
      expect(payload).not.toHaveProperty("email");
      expect(spy).toHaveBeenCalled();
    });
  });

  it("jeder Eintrag ist ein echtes Personenfeld", () => {
    /* Ein Tippfehler in der Liste wäre ein Feld, das nie ankommt — und
       niemand suchte den Grund in einer Liste, die richtig aussieht. */
    for (const f of ELTERN_DUERFEN) {
      expect(PERSON_FELDER as readonly string[]).toContain(f);
    }
  });

  it("kein Mitgliedschaftsfeld ist erlaubt", () => {
    /* Der Elternteil pflegt die PERSON seines Kindes, nicht die
       MITGLIEDSCHAFT — deshalb gibt es auch kein mitglieder_update_kind. */
    for (const f of ["mitgliedtyp", "spielerpass", "js_nr", "fairgate_id", "aktiv", "eintrittsdatum"]) {
      expect(elternDuerfen(f)).toBe(false);
    }
  });
});

describe("profil_geprueft_at geht einen eigenen Weg", () => {
  it("wird ohne bestaetigen NICHT geschrieben", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sb = sbOk();
    return updateKindDurchElternteil(sb as never, "k-1", {
      ahv_nr: "756", profil_geprueft_at: "2020-01-01",
    }).then(() => {
      expect(sb.find("personen", "update")!.payload).not.toHaveProperty("profil_geprueft_at");
      expect(spy).toHaveBeenCalled();
    });
  });

  it("mit bestaetigen bekommt es einen frischen Zeitstempel", async () => {
    /* Als eigener Parameter und nicht als Feld unter Feldern: sonst könnte
       wer das Formular erweitert die Bestätigung versehentlich mitschreiben. */
    const sb = sbOk();
    await updateKindDurchElternteil(sb as never, "k-1", { ahv_nr: "756" }, true);
    expect(sb.find("personen", "update")!.payload.profil_geprueft_at).toBeTruthy();
  });
});

describe("⚠ ein fehlgeschlagener Schreibvorgang meldet KEINEN Erfolg", () => {
  it("bei einem Datenbankfehler", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sb = makeSb({ "personen.update": { error: pgError("keine Rechte", "42501") } });
    const erg = await updateKindDurchElternteil(sb as never, "k-1", { ahv_nr: "756" });
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  it("⚠ und wenn RLS die Zeile gar nicht trifft", async () => {
    /* Der gefährlichste Fall: RLS liefert KEINEN Fehler, sondern ein update
       über null Zeilen. Ohne Gegenlesen stünde hier ein „Alles bestätigt ✓"
       ohne Deckung — genau das, was diese Kette fünfmal hatte. */
    const sb = makeSb({ "personen.update": { data: [] } });
    const erg = await updateKindDurchElternteil(sb as never, "fremd", { ahv_nr: "756" });
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toContain("Verknüpfung");
  });

  it("⚠ lesbar ist nicht schreibbar — der Fall, den die alte Pruefung durchliess", async () => {
    /* Bis zum 23.08.2026 las diese Kette nach dem Schreiben mit einer ZWEITEN
       Abfrage nach, ob die Zeile da ist. Lesen und Schreiben haengen aber an
       verschiedenen Policies: `personen_select_priv` ist weit,
       `personen_update_kind` eng. Eine Zeile, die man SEHEN aber nicht
       AENDERN darf, kam damit als Erfolg zurueck.

       Die Attrappe stellt genau das nach: das Gegenlesen wuerde die Zeile
       finden (`personen.select`), das Schreiben hat aber keine getroffen. */
    const sb = makeSb({
      "personen.update": { data: [] },
      "personen.select": { data: { id: "k-1" } },
    });
    const erg = await updateKindDurchElternteil(sb as never, "k-1", { ahv_nr: "756" });
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toContain("Verknüpfung");
  });

  it("ohne erlaubtes Feld wird gar nicht geschrieben", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sb = sbOk();
    const erg = await updateKindDurchElternteil(sb as never, "k-1", { funktionen: ["X"] });
    expect(erg.ok).toBe(true);
    expect(erg.abgewiesen).toEqual(["funktionen"]);
    expect(sb.opsOn("personen")).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════
   Die eigene Person — dieselbe Allowlist (21.08.2026)

   Was jemand an sich selbst pflegen darf, ist dasselbe wie das,
   was ein Elternteil am Kind pflegt. Den Unterschied macht nicht
   dieser Code, sondern die Policy: `personen_update_self` trifft
   die eigene Zeile, `personen_update_kind` die des Kindes.

   Zwei Funktionen mit einem Rumpf, damit an der Aufrufstelle
   steht, WESSEN Zeile gemeint ist.
   ═══════════════════════════════════════════════════════════════ */
describe("updateEigenePerson", () => {
  it("schreibt dieselben Felder und sperrt dieselben", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sb = makeSb({ "personen.update": { data: [{ id: "p-1" }] } });
    const erg = await updateEigenePerson(sb as never, "p-1", {
      telefon: "079 000 00 00", email: "neu@example.ch", funktionen: ["Kassier"],
    });
    expect(erg.ok).toBe(true);
    expect(erg.abgewiesen.sort()).toEqual(["email", "funktionen"]);
    const payload = sb.find("personen", "update")!.payload;
    expect(payload.telefon).toBe("079 000 00 00");
    expect(payload).not.toHaveProperty("email");
    expect(spy).toHaveBeenCalled();
  });

  it("`bestaetigen` setzt profil_geprueft_at — das Formular kann es nicht", async () => {
    /* Es steht NICHT in der Allowlist: sonst waere die Bestaetigung ein Feld
       unter Feldern, und wer das Formular um eine Zeile erweitert, koennte
       sie versehentlich mitschreiben. */
    const sb = makeSb({ "personen.update": { data: [{ id: "p-1" }] } });
    await updateEigenePerson(sb as never, "p-1", { telefon: "079" }, true);
    expect(sb.find("personen", "update")!.payload).toHaveProperty("profil_geprueft_at");

    const sb2 = makeSb({ "personen.update": { data: [{ id: "p-1" }] } });
    await updateEigenePerson(sb2 as never, "p-1", { profil_geprueft_at: "2026-01-01" });
    expect(sb2.find("personen", "update")).toBeUndefined();
  });

  it("⚠ meldet einen anderen Ort als der Kind-Pfad", async () => {
    /* Die Meldung ist das Einzige, was der Betroffene je zu sehen bekommt.
       „Verknuepfung zum Kind" waere fuer die eigene Zeile die falsche
       Auskunft und schickte ihn an einen Ort, den es hier nicht gibt —
       derselbe Fehler wie der „Kontakt-Tab" im Portal-Tab. */
    const sb = makeSb({ "personen.update": { data: [] } });
    const erg = await updateEigenePerson(sb as never, "fremd", { telefon: "079" });
    expect(erg.ok).toBe(false);
    expect(erg.fehler).toContain("deinem Konto");
    expect(erg.fehler).not.toContain("Kind");
  });
});
