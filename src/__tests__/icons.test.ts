/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/icons.test.ts
   Wacht darüber, dass jeder im Code verwendete Icon-Name existiert.

   Hintergrund: TI rendert bei unbekanntem Namen einen leeren
   Platzhalter in der richtigen Grösse. Das Layout bleibt heil, man
   sieht schlicht nichts — so blieben zehn fehlende Icons lange
   unbemerkt. TI warnt deshalb zusätzlich in der Entwicklung; dieser
   Test greift auch in der CI.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TI_PATHS } from "../icons.tsx";

/* Relativ zur Testdatei, nicht zum Startverzeichnis — so ist der Test
   unabhängig davon, von wo npm test aufgerufen wird. */
const SRC = join(import.meta.dirname, "..");

/* Werte, die das Suchmuster trifft, ohne Icons zu sein: Flexbox-
   Ausrichtungen, Zahlen, Rundungen. */
const KEINE_ICONS = new Set([
  "-", "1", "center", "start", "end",
  "flex-start", "flex-end", "space-between", "round",
]);

function quelldateien(dir: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(dir)) {
    const pfad = join(dir, eintrag);
    if (statSync(pfad).isDirectory()) {
      if (eintrag !== "__tests__") quelldateien(pfad, treffer);
    } else if (/\.tsx?$/.test(eintrag) && eintrag !== "icons.tsx") {
      treffer.push(pfad);
    }
  }
  return treffer;
}

/* Erfasst n="…", icon="…" und icon:"…" — die drei Schreibweisen, mit
   denen im Projekt Icons benannt werden. */
function verwendeteIcons(): Map<string, Set<string>> {
  const gefunden = new Map<string, Set<string>>();
  for (const datei of quelldateien(SRC)) {
    const inhalt = readFileSync(datei, "utf8");
    for (const [, name] of inhalt.matchAll(/(?:n=|icon:|icon=)"([a-z0-9-]+)"/g)) {
      if (KEINE_ICONS.has(name)) continue;
      if (!gefunden.has(name)) gefunden.set(name, new Set());
      gefunden.get(name)!.add(datei.replace(SRC + "/", ""));
    }
  }
  return gefunden;
}

describe("Icon-Set", () => {
  it("kennt jeden Namen, der im Code verwendet wird", () => {
    const fehlend: string[] = [];
    for (const [name, orte] of verwendeteIcons()) {
      if (!(name in TI_PATHS)) {
        fehlend.push(`${name} → ${[...orte].sort().join(", ")}`);
      }
    }
    expect(fehlend, `Fehlende Icons in src/icons.tsx:\n${fehlend.join("\n")}`).toEqual([]);
  });

  it("liefert für jedes Icon mindestens ein SVG-Element", () => {
    /* Das Set nutzt path, circle, line, polyline und rect. */
    for (const [name, pfad] of Object.entries(TI_PATHS)) {
      expect(pfad, `Icon "${name}" hat kein SVG-Element`).toMatch(/<(path|circle|line|polyline|rect)\b/);
    }
  });
});
