/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpExportService.ts

   Den WordPress-Export aus dem Portal auslösen. Bis zum 09.09.2026 ging
   das nur aus einer Konsole mit Admin-JWT.

   ⚠ WARUM ERST JETZT: `export` verlangte bis Etappe 5 ein `nur_team`,
   und die Mannschaft kann eine Kachel nicht raten. Ein Knopf, der nach
   einer SFV-Teamnummer fragt, wäre eine Bedienung für den, der sie
   ohnehin auswendig kann. (Entschieden 08.09.2026: der Knopf gehört
   dazu ab Etappe 5, mit Rückfrage.)
   ═══════════════════════════════════════════════════════════════ */
import type { SupabaseClient } from "@supabase/supabase-js";

type Sb = SupabaseClient | null;

/** Was die Function zurückgibt. Bewusst schmal getippt: gelesen wird
    ohnehin durch die Allowlist in `fasseExportZusammen()`. */
export interface ExportAntwort {
  ziel?: string;
  status?: string;
  gebaut?: number;
  gesendet?: number;
  zahlen?: Record<string, unknown>;
  je_team?: Record<string, unknown>[];
  ohne_teamnummer?: string[];
  protokolliert?: boolean;
  fehler?: string;
}

/**
 * Einen scharfen Lauf anstossen.
 *
 * ⚠ OHNE `nurTeam` TRIFFT ER ALLE MANNSCHAFTEN und schreibt auf eine
 * öffentliche Website. Der Aufrufer fragt vorher — diese Funktion tut es
 * nicht, weil eine Rückfrage in einer Service-Funktion beim zweiten
 * Aufrufer vergessen wird.
 */
export async function starteWpExport(
  sb: Sb, nurTeam?: string,
): Promise<{ daten: ExportAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("wp-export", {
    body: nurTeam ? { aktion: "export", nur_team: nurTeam } : { aktion: "export" },
  });
  if (error) {
    /* ⚠ Bei non-2xx liefert `functions.invoke` `data = null` — die
       eigentliche Meldung steckt in `error.context`, einer Response.
       Ohne dieses Auslesen stand am 20.08.2026 nur „non-2xx status" da,
       während der Grund ungelesen daneben lag. Gleiche Stelle wie in
       `sfvService.starteSync`. */
    let ausKoerper: string | null = null;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const roh = await ctx.clone().text();
        ausKoerper = JSON.parse(roh)?.fehler ?? roh.slice(0, 500);
      } catch { /* kein JSON — dann bleibt die Meldung des Clients */ }
    }
    return { daten: null, fehler: ausKoerper || error.message || "Export fehlgeschlagen" };
  }
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  return { daten: data as ExportAntwort, fehler: null };
}

/**
 * Was vom Lauf angezeigt wird — aufgezählt, nicht ausgeschlossen.
 *
 * ⚠ KEIN ROHES `JSON.stringify`. Die Antwort trägt unter `je_team` die
 * vollen WordPress-Antworten, und die führen bei Dubletten den
 * abgeleiteten Beitragstitel. Am 21.08.2026 sind 903 Klarnamen ins
 * Protokoll geraten, weil ein Objekt gespreadet wurde; auf einem Schirm
 * und in jedem Screenshot wäre es dieselbe Preisgabe.
 *
 * ⚠ Und sie nennt die GESCHEITERTEN Mannschaften zuerst. Eine
 * Erfolgsmeldung mit einer Fussnote liest niemand zu Ende.
 */
export function fasseExportZusammen(daten: ExportAntwort | null): string {
  if (!daten) return "Lauf beendet.";
  const z = (daten.zahlen ?? {}) as Record<string, number>;
  const gescheitert = ((daten.je_team ?? []) as { team?: unknown; gescheitert?: unknown }[])
    .filter((t) => t?.gescheitert)
    .map((t) => String(t.team));
  const zeilen: string[] = [];
  if (gescheitert.length) {
    zeilen.push(`⚠ ${gescheitert.length} Mannschaft(en) gescheitert: ${gescheitert.join(", ")}`);
  }
  zeilen.push(
    `${daten.ziel ?? "?"} · ${Number(z.teams_gesendet ?? 0)} Mannschaft(en) · `
    + `${Number(daten.gesendet ?? 0)} Spiel(e) gesendet`,
  );
  zeilen.push(
    `${Number(z.neu ?? 0)} neu, ${Number(z.aktualisiert ?? 0)} aktualisiert, `
    + `${Number(z.zurueckgezogen ?? 0)} zurückgezogen, `
    + `${Number(z.verlauf_zeilen ?? 0)} Verlaufszeilen`,
  );
  /* ⚠ Gebaut ≠ gesendet ist ein Befund, kein Detail: die Differenz sind
     Spiele ohne SFV-Teamnummer, die niemand auf der Website suchen wird. */
  const gebaut = Number(daten.gebaut ?? 0);
  if (gebaut && gebaut !== Number(daten.gesendet ?? 0)) {
    zeilen.push(`⚠ ${gebaut} gebaut, aber nur ${Number(daten.gesendet ?? 0)} gesendet — `
      + `${(daten.ohne_teamnummer ?? []).length} Spiel(e) ohne SFV-Teamnummer`);
  }
  if (daten.protokolliert === false) {
    zeilen.push("⚠ Nicht protokolliert — api_verbindungen hat keine Zeile «wordpress»");
  }
  /* ⚠ NUR WENN NICHT LEER — und das ist hier die Ausnahme von „jede Zahl
     steht da". Der Unterschied: eine ZAHL, deren Fehlen gedeutet werden
     muss, ist keine Auskunft; eine LISTE von Feldnamen ist im Normalfall
     leer, und „unbeachtete Felder: keine" bei jedem Lauf ist die Sorte
     Zeile, die man nach dem dritten Mal überliest. Steht hier etwas, kommt
     etwas an, das niemand schreibt. */
  const unbeachtet = (z.unbeachtete_felder ?? []) as unknown as string[];
  if (Array.isArray(unbeachtet) && unbeachtet.length) {
    zeilen.push(`⚠ Kommt an, wird nicht geschrieben: ${unbeachtet.join(", ")} — `
      + "entweder gehört das Feld in CC_FELDER, oder es soll gar nicht kommen");
  }
  return zeilen.join("\n");
}

/**
 * Was die Gegenstelle über SICH SELBST sagt.
 *
 * ⚠ ⚠  DIE AUSKUNFT, DIE AM 09.09.2026 DREI ANLAEUFE GEKOSTET HAT.
 *
 * Damals sahen drei völlig verschiedene Ausfälle gleich aus — die Datei
 * lag im falschen Ordner, eine fremde Datei trug denselben Namen, der
 * Meta-Schlüssel stimmte nicht. Alle drei meldeten sich als
 * `ohne_team: [...]`, also als Konfigurationsfrage im Backend.
 *
 * `aktion: "status"` beantwortet stattdessen: **wer** antwortet
 * (Dateiname und Version), **womit** gesucht wird (der Metaschlüssel als
 * Wert), **worauf** es trifft (Zuordnung gezählt) — und seit 0.8.0, ob
 * ACF die Feldnamen am `fch_spiel` überhaupt kennt.
 *
 * ⚠ Sie schreibt nichts. Deshalb steht sie im Portal neben „Export
 * starten" und nicht darin: ein Knopf, der nur fragt, darf nicht wie
 * einer aussehen, der schreibt.
 */
export async function holeEmpfaengerStatus(
  sb: Sb,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("wp-export", { body: { aktion: "status" } });
  if (error) {
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const roh = await ctx.clone().text();
        const j = JSON.parse(roh);
        return { daten: null, fehler: String(j?.fehler ?? roh.slice(0, 500)) };
      } catch { /* kein JSON — dann bleibt die Meldung des Clients */ }
    }
    return { daten: null, fehler: (error as { message?: string }).message ?? "Aufruf fehlgeschlagen" };
  }
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}
