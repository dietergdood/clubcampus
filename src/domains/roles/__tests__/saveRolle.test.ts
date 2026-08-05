import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveRolle } from "../roleUtils.ts";

/* Supabase-Attrappe. Merkt sich, was auf welche Tabelle geschrieben wurde. */
function baueSb(benutzer: Record<string, unknown> | null) {
  const updates: { tabelle: string; werte: Record<string, unknown> }[] = [];
  const sb = {
    from(tabelle: string) {
      return {
        update(werte: Record<string, unknown>) {
          updates.push({ tabelle, werte });
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
        select() {
          return {
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: benutzer }) }),
          };
        },
      };
    },
  };
  return { sb: sb as never, updates };
}

/* Ohne .at(-1) — das tsconfig-Ziel liegt unter ES2022. */
const letzterAn = (updates: { tabelle: string; werte: Record<string, unknown> }[], t: string) => {
  const treffer = updates.filter(u => u.tabelle === t);
  return treffer.length ? treffer[treffer.length - 1].werte : undefined;
};

beforeEach(() => vi.clearAllMocks());

describe("saveRolle", () => {
  it("schreibt die abgeleitete Rolle, wenn kein Adminstatus gesetzt ist", async () => {
    const { sb, updates } = baueSb({ id: "u1", ist_admin: false, rollen: [] });
    await saveRolle(sb, 42, "trainer");
    expect(letzterAn(updates, "mitglieder")).toEqual({ rolle: "trainer" });
    expect(letzterAn(updates, "benutzer")?.role).toBe("trainer");
  });

  it("überschreibt den Adminstatus NICHT", async () => {
    /* Der eigentliche Defekt: Ein Admin, der auch Juniorentrainer ist, wurde
       beim nächsten Kader-Eintrag stillschweigend zum Trainer — ableitRolle()
       kennt 'administrator' gar nicht. */
    const { sb, updates } = baueSb({ id: "u1", ist_admin: true, rollen: ["administrator"] });
    await saveRolle(sb, 42, "trainer");
    expect(letzterAn(updates, "benutzer")?.role).toBe("administrator");
  });

  it("führt beide Rollen nebeneinander, damit der Rollenwechsler sie anbietet", async () => {
    const { sb, updates } = baueSb({ id: "u1", ist_admin: true, rollen: ["administrator"] });
    await saveRolle(sb, 42, "trainer");
    const rollen = letzterAn(updates, "benutzer")?.rollen as string[];
    expect(rollen).toContain("administrator");
    expect(rollen).toContain("trainer");
  });

  it("nimmt 'administrator' aus rollen[], wenn das Kennzeichen weg ist", async () => {
    /* Sonst böte der Rollenwechsler eine Rolle an, die der Benutzer nicht
       mehr hat. */
    const { sb, updates } = baueSb({ id: "u1", ist_admin: false, rollen: ["administrator", "trainer"] });
    await saveRolle(sb, 42, "spieler");
    const rollen = letzterAn(updates, "benutzer")?.rollen as string[];
    expect(rollen).not.toContain("administrator");
    expect(rollen).toContain("spieler");
  });

  it("schreibt mitglieder.rolle immer mit dem abgeleiteten Wert", async () => {
    /* Auch beim Admin: mitglieder.rolle ist die fachliche Rolle im Verein,
       der Adminstatus hängt am Benutzerkonto. */
    const { sb, updates } = baueSb({ id: "u1", ist_admin: true, rollen: [] });
    await saveRolle(sb, 42, "trainer");
    expect(letzterAn(updates, "mitglieder")).toEqual({ rolle: "trainer" });
  });

  it("tut nichts ohne Mitglieds-Id", async () => {
    const { sb, updates } = baueSb(null);
    await saveRolle(sb, 0, "trainer");
    expect(updates).toHaveLength(0);
  });

  it("schreibt nichts an benutzer, wenn es zum Mitglied keinen gibt", async () => {
    const { sb, updates } = baueSb(null);
    await saveRolle(sb, 42, "trainer");
    expect(letzterAn(updates, "mitglieder")).toEqual({ rolle: "trainer" });
    expect(letzterAn(updates, "benutzer")).toBeUndefined();
  });
});
