/**
 * Der Übergangszustand um `spiele.matchdaten_vorgemerkt_am`.
 *
 * ⚠ ⚠  ZWEI HÄLFTEN, DIE ZUSAMMENGEHÖREN — UND EINE DAVON FÄLLT LEISE WEG.
 *
 * Solange `migration_matchdaten_vormerken.sql` nicht eingespielt und
 * `npm run gen:types` nicht gelaufen ist, kennt `database.types.ts` die
 * Spalte nicht. supabase-js prüft den Update-Rumpf gegen diese Datei und
 * lehnt jede Form ab; deshalb steht in `vormerkenService.ts` eine
 * kommentierte Umdeutung.
 *
 * ⚠ Sie ist ein Übergang, kein Bau. Nach `gen:types` trägt der erzeugte
 * Typ das Feld selbst, und die Zeile ist überflüssig — **aber nichts
 * meldet das.** `as unknown as` bleibt für den Compiler bis in alle
 * Ewigkeit gültig; sie stünde still weiter da und nähme der Zuweisung
 * dauerhaft die Prüfung, die sie dann wieder hätte.
 *
 * Dieses Papier kennt den Fall: ein `||` mit totem linkem Zweig, eine
 * Rückfallliste, die niemand mehr braucht. Beide sahen nach Zierrat aus
 * und wurden zu Dauerzuständen.
 *
 * Dieser Fall koppelt die zwei Hälften: fällt die eine, muss die andere
 * mit. Er ist heute grün und wird in der Minute rot, in der die Typen
 * die Spalte kennen — mit dem Satz, was dann zu tun ist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/** Reine Prüfung, damit der Fall nicht über eine leere Menge urteilt. */
export function uebergangStimmt(typen: string, dienst: string): {
  typenKennenSpalte: boolean; umdeutungDa: boolean; stimmt: boolean;
} {
  const typenKennenSpalte = typen.includes("matchdaten_vorgemerkt_am");
  const umdeutungDa = /as unknown as TablesUpdate<"spiele">/.test(dienst);
  /* Erlaubt ist: Spalte fehlt UND Umdeutung da (heute), oder Spalte da
     UND Umdeutung weg (nach dem Einspielen). Alles andere ist der
     Zwischenzustand, den niemand aufgeräumt hat. */
  return { typenKennenSpalte, umdeutungDa, stimmt: typenKennenSpalte !== umdeutungDa };
}

describe("der Übergang um matchdaten_vorgemerkt_am", () => {
  /* ⚠ Beide Richtungen als eigene Fälle — sonst prüft die Datei nur den
     Zustand von heute und wäre morgen eine leere Menge. */
  it("ohne Spalte in den Typen gehört die Umdeutung dazu", () => {
    expect(uebergangStimmt("type X = {}", 'x as unknown as TablesUpdate<"spiele">').stimmt)
      .toBe(true);
  });

  it("mit Spalte in den Typen gehört sie weg", () => {
    expect(uebergangStimmt("matchdaten_vorgemerkt_am: string | null", "const r = felder;").stimmt)
      .toBe(true);
    expect(uebergangStimmt("matchdaten_vorgemerkt_am: string | null",
      'x as unknown as TablesUpdate<"spiele">').stimmt).toBe(false);
  });

  it("⚠ und so steht es heute im Bestand", () => {
    const stand = uebergangStimmt(
      readFileSync("src/database.types.ts", "utf8"),
      readFileSync("src/domains/spiele/vormerkenService.ts", "utf8"),
    );
    expect({ ...stand },
      stand.typenKennenSpalte
        ? "Die Migration ist eingespielt und gen:types gelaufen — die "
          + "Umdeutung in vormerkenService.ts ist jetzt überflüssig. Zeile "
          + "entfernen, `SpielVormerkUpdate` durch TablesUpdate<\"spiele\"> "
          + "ersetzen, und diese Testdatei mit."
        : "Die Typen kennen die Spalte nicht — dann MUSS die Umdeutung da "
          + "sein, sonst übersetzt vormerkenService.ts nicht.",
    ).toEqual({ ...stand, stimmt: true });
  });
});
