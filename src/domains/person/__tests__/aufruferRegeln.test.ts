/* ═══════════════════════════════════════════════════════════════
   Wer darf eine Edge Function aufrufen

   ⚠ DER ANLASS. `invite-user` prüfte bis zum 23.08.2026, DASS ein
   `Authorization`-Header da ist — nicht, wer dahintersteht. Bei
   Supabase steht dort im Normalfall der publishable key, und der
   liegt im JavaScript-Bündel jeder Seite. Gemessen: ein Aufruf mit
   blossem `sb_publishable_…` kam bis in die Rumpfprüfung.

   Die Regeln liegen jetzt an EINER Stelle
   (`supabase/functions/_shared/aufruferRegeln.ts`) und werden von
   hier direkt importiert — dieselbe Datei, die im Betrieb läuft,
   nicht eine Abschrift.

   ⚠ Zwei der Fälle prüfen `null === null`. Das ist keine Spitzfindigkeit:
   beide Vergleiche wären ohne die ausdrückliche Abweisung WAHR, und
   beide Male ginge die Prüfung in die falsche Richtung auf.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import {
  pruefeAdmin, pruefeVerein, pruefeNichtSelbst,
} from "../../../../supabase/functions/_shared/aufruferRegeln.ts";
import type { Aufrufer } from "../../../../supabase/functions/_shared/aufruferRegeln.ts";

const ADMIN: Aufrufer = {
  id: "u-1", person_id: "p-1", verein_id: "v-1", ist_admin: true, aktiv: true,
};

describe("pruefeAdmin", () => {
  it("lässt einen aktiven Administrator durch", () => {
    expect(pruefeAdmin(ADMIN)).toBeNull();
  });

  it("weist ein deaktiviertes Konto ab, auch mit Adminrecht", () => {
    const raus = pruefeAdmin({ ...ADMIN, aktiv: false });
    expect(raus).toEqual({ fehler: "Kein aktives Konto", status: 403 });
  });

  it("⚠ weist jeden Nicht-Admin ab — das war die offene Lücke", () => {
    const raus = pruefeAdmin({ ...ADMIN, ist_admin: false });
    expect(raus?.status).toBe(403);
    expect(raus?.fehler).toBe("Nur Administratoren");
  });

  it("prüft zuerst das Konto, dann das Recht", () => {
    /* Ein deaktivierter Admin soll „Kein aktives Konto" hören, nicht
       „Nur Administratoren" — sonst sucht er das Recht statt die Sperre. */
    expect(pruefeAdmin({ ...ADMIN, aktiv: false, ist_admin: true })?.fehler)
      .toBe("Kein aktives Konto");
  });
});

describe("pruefeVerein", () => {
  it("lässt den eigenen Verein durch", () => {
    expect(pruefeVerein(ADMIN, "v-1")).toBeNull();
  });

  it("⚠ weist einen fremden Verein ab — die Function kennt keine RLS", () => {
    const raus = pruefeVerein(ADMIN, "v-2");
    expect(raus).toEqual({
      fehler: "Diese Person gehört zu einem anderen Verein.", status: 403,
    });
  });

  it("⚠ ein fehlender Verein ist KEIN Treffer", () => {
    /* `null === null` wäre wahr. Ohne die ausdrückliche Abweisung käme eine
       Zeile ohne `verein_id` durch jede Mandantenprüfung. */
    expect(pruefeVerein({ ...ADMIN, verein_id: null as never }, null)?.status).toBe(404);
    expect(pruefeVerein(ADMIN, null)?.status).toBe(404);
    expect(pruefeVerein(ADMIN, undefined)?.status).toBe(404);
    expect(pruefeVerein(ADMIN, "")?.status).toBe(404);
  });
});

describe("pruefeNichtSelbst", () => {
  it("⚠ hält den Aufrufer von der eigenen Person ab", () => {
    const raus = pruefeNichtSelbst(ADMIN, "p-1", "löschen");
    expect(raus?.status).toBe(400);
    expect(raus?.fehler).toBe("Das eigene Konto lässt sich hier nicht löschen.");
  });

  it("nennt die Handlung im Text, statt einen festen Satz zu führen", () => {
    expect(pruefeNichtSelbst(ADMIN, "p-1", "einladen")?.fehler)
      .toBe("Das eigene Konto lässt sich hier nicht einladen.");
  });

  it("lässt eine andere Person durch", () => {
    expect(pruefeNichtSelbst(ADMIN, "p-2", "löschen")).toBeNull();
  });

  it("⚠ ein Aufrufer OHNE Person ist nicht „dieselbe Person\"", () => {
    /* Auch hier wäre `null === null` wahr — ein Konto ohne verknüpfte Person
       käme sonst an keine einzige Person mehr heran. */
    expect(pruefeNichtSelbst({ ...ADMIN, person_id: null }, "p-1", "löschen")).toBeNull();
  });
});
