/* ══════════════════════════════════════════════════════════════════════
   Der partielle Schluessel ist ueber PostgREST nicht erreichbar
   (10.09.2026)

   ⚠ ANLASS, gemessen an einem echten Lauf:

     Spiel 4396037: Gegneraufstellung: there is no unique or exclusion
     constraint matching the ON CONFLICT specification

   Und der Index EXISTIERT, mit genau diesen vier Spalten:

     CREATE UNIQUE INDEX spiel_aufstellung_fremd_key
       ON spiel_aufstellung (verein_id, spiel_id, sfv_team_id, rueckennr)
       WHERE ist_eigener = false AND rueckennr IS NOT NULL;

   ⚠ ⚠  DIE BEDINGUNG IST DER GRUND. Postgres leitet einen PARTIELLEN
         Index nur ab, wenn dieselbe Bedingung als index_predicate im
         ON CONFLICT steht — und PostgREST kann in `onConflict` nur
         SPALTEN nennen, kein Praedikat. Der Index passt; die Angabe
         kann ihn nicht erreichen.

   ── Warum diese Pruefung und nicht ein besserer Kommentar ─────────────
   Die naheliegende Reparatur ist, den Index unpartiell zu machen — und
   sie ist falsch: die Bedingung IST die Sperre, und ein unpartieller
   Schluessel ueber (Team, Nummer) faengt auch eigene Zeilen. Wer das in
   sechs Monaten liest, sieht einen umstaendlichen Dreischritt
   (lesen/loeschen/schreiben) neben einem einzeiligen upsert daneben und
   haelt ihn fuer einen Rest. **Ein Kommentar, der eine andere Stelle
   zusichert, ist eine Behauptung ohne Pruefung.**

   ⚠ Und `matchdatenLauf.ts` importiert von esm.sh — vitest kann die
   Datei nicht laden. Die Zusage steht deshalb am Quelltext, wie die
   Loeschketten-Pruefung.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const LAUF = "supabase/functions/sfv-sync/matchdatenLauf.ts";
const SCHEMA = "supabase/schema.sql";

/* ⚠ Als Zeichen gebaut, nicht als Escape geschrieben: ein "\n" in einem
   Regex-Literal ueberlebt den Weg durch eine Shell-Heredoc nicht — es
   landet als echter Zeilenumbruch IN der Datei und zerreisst sie.
   Heute zum wiederholten Mal passiert. */
const ZEILEN = new RegExp(String.fromCharCode(13) + "?" + String.fromCharCode(10));

describe("Gegneraufstellung — kein upsert auf den partiellen Schluessel", () => {
  it("der Index ist partiell (sonst ist diese Pruefung gegenstandslos)", () => {
    /* ⚠ Zuerst die Voraussetzung. Wird der Index eines Tages unpartiell,
       darf diese Datei nicht stillschweigend weiter etwas verbieten, das
       dann erlaubt waere — sie soll rot werden und gelesen werden. */
    const zeile = readFileSync(SCHEMA, "utf8")
      .split(ZEILEN)
      .find((z) => z.includes("spiel_aufstellung_fremd_key")
                && z.includes("CREATE UNIQUE INDEX"));
    expect(zeile, "spiel_aufstellung_fremd_key steht nicht in schema.sql").toBeTruthy();
    expect(zeile).toMatch(/WHERE/i);
  });

  it("kein onConflict nennt sfv_team_id und rueckennr", () => {
    const treffer = readFileSync(LAUF, "utf8")
      .split(ZEILEN)
      .map((z, i) => ({ zeile: i + 1, text: z.trim() }))
      .filter((z) => z.text.includes("onConflict")
                  && z.text.includes("sfv_team_id")
                  && z.text.includes("rueckennr"))
      .map((z) => `${LAUF}:${z.zeile} — ${z.text}`);
    expect(treffer).toEqual([]);
  });

  it("die Gegneraufstellung wird stattdessen ersetzt", () => {
    /* ⚠ Die Gegenrichtung, und sie ist die wichtigere: ohne sie waere der
       Fall oben auch dann gruen, wenn jemand das Schreiben ganz
       entfernte. Eine Pruefung, die nur Verbotenes zaehlt, kann nicht
       zwischen „richtig gebaut" und „gar nicht gebaut" unterscheiden. */
    const quelle = readFileSync(LAUF, "utf8");
    expect(quelle).toContain("Gegneraufstellung leeren");
    expect(quelle).toContain("erstmals_gesehen");
  });
});
