/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/loeschService.ts

   Der Weg zur Edge Function `person-loeschen`.

   ⚠ DIE VORSCHAU WIRD NICHT HIER GERECHNET, und das ist Absicht.
   Eine Vorschau, die der Browser rechnet, sieht nur, was RLS ihm
   zeigt; das Löschen läuft mit `service_role` und sieht alles. Eine
   Vorschau, die „3 Zeilen" sagt, während 7 fallen, ist SCHLIMMER als
   keine — sie erzeugt Zutrauen ohne Deckung.

   Diese Datei reicht also durch und rechnet nichts nach.
   ═══════════════════════════════════════════════════════════════ */
import { fingerabdruckDaten } from "../../../supabase/functions/person-loeschen/vorschau.ts";
import type { Vorschau, Posten } from "../../../supabase/functions/person-loeschen/vorschau.ts";
import type { Sb } from "../../types.ts";

export type { Vorschau, Posten };

export interface VorschauAntwort {
  vorschau: Vorschau;
  /** HMAC über die Tatsachen, signiert von der Function. Wandert unverändert
      zurück; der Browser kann ihn weder lesen noch nachrechnen. */
  abdruck: string;
  gueltig_bis: string;
}

export interface LoeschAntwort {
  geloescht: boolean;
  zahlen: Record<string, number>;
  /** Was die Vorschau nicht prüfen konnte, konnte auch der Lauf nicht
      aufräumen — genannt, nicht verschwiegen. */
  nicht_geprueft: string[];
}

/** Ein Fehler der Function, mit dem Status und — falls die Zahlen abwichen —
    den Unterschieden im Klartext. */
export interface LoeschFehler {
  fehler: string;
  unterschiede?: string[];
}

function istFehler(x: unknown): x is LoeschFehler {
  return !!x && typeof x === "object" && "fehler" in x;
}

async function rufe(sb: Sb, body: Record<string, unknown>): Promise<unknown> {
  if (!sb) return { fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("person-loeschen", { body });

  /* ⚠ Bei einem Status ausserhalb 2xx liefert `functions.invoke` `data = null`
     und einen `FunctionsHttpError`, dessen `message` nur „non-2xx status code"
     lautet — der eigentliche Text steht im RUMPF. Ohne das Auslesen sähe der
     Admin „Edge Function returned a non-2xx status code" statt der Meldung,
     die ihm sagt, was sich geändert hat. */
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const rumpf = await ctx.json();
        if (istFehler(rumpf)) return rumpf;
      } catch { /* kein JSON im Rumpf — dann bleibt die allgemeine Meldung */ }
    }
    return { fehler: error.message || "Der Aufruf ist fehlgeschlagen." };
  }
  return data;
}

/**
 * Was beim Löschen dieser Person geschähe — als Zahlen, bevor es geschieht.
 * Schreibt nichts.
 */
export async function holeLoeschVorschau(
  sb: Sb, personId: string,
): Promise<VorschauAntwort | LoeschFehler> {
  const raus = await rufe(sb, { aktion: "vorschau", person_id: personId });
  if (istFehler(raus)) return raus;
  return raus as VorschauAntwort;
}

/**
 * Löschen — nur mit dem Abdruck aus der Vorschau.
 *
 * ⚠ `zahlen_alt` GEHT MIT, obwohl die Function ohne es auskäme. Der Abdruck
 * allein sagt nur, DASS etwas abweicht; die Function kann die Zahlen von
 * damals nicht aus ihm zurückrechnen. Erst mit dieser Angabe nennt die
 * Abbruchmeldung, WAS sich geändert hat — und ohne das klickt der Admin auf
 * Vorschau und wieder auf Löschen, ohne hinzusehen.
 */
export async function loeschePerson(
  sb: Sb, personId: string, vorschau: Vorschau, abdruck: string,
  anlass: "selbstauskunft" | "verwaltung" = "verwaltung",
): Promise<LoeschAntwort | LoeschFehler> {
  const raus = await rufe(sb, {
    aktion: "loeschen", person_id: personId, abdruck, anlass,
    zahlen_alt: fingerabdruckDaten(vorschau),
  });
  if (istFehler(raus)) return raus;
  return raus as LoeschAntwort;
}

export function istLoeschFehler(x: unknown): x is LoeschFehler {
  return istFehler(x);
}
