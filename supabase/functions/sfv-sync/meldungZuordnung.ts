// ClubCampus — supabase/functions/sfv-sync/meldungZuordnung.ts
// Meldung an die Verwaltung: NEUE Spieler ohne Zuordnung.
//
// ⚠ WARUM ES SIE GIBT. Bis zum 22.08.2026 meldete der Sync ueber Zuordnungen
//   gar nichts. `pruefeNachzug()` meldet ueberfluessige Korrekturen an
//   Spielereignissen — etwas ganz anderes —, und `zaehleUnzugeordnet()`
//   schreibt nur eine Zahl ins Protokoll und macht den Lauf ab einer Schwelle
//   zur Warnung. Wer wissen wollte, ob jemand offen ist, musste von sich aus
//   nachsehen. Genau das soll niemand muessen.
//
// ⚠ GEMELDET WIRD DER ZUWACHS, NICHT DER BESTAND. Eine Meldung „177 Spieler
//   offen" ginge nie wieder weg und waere nach einer Woche Tapete. „Neu" ist
//   deshalb: das fruehste `erstmals_gesehen` des Spielers liegt NACH
//   `api_verbindungen.zuordnung_gemeldet_am`.
//
// ⚠ DIE MARKE STAND BEI DER MIGRATION AUF `now()`. Der damalige Rueckstand
//   — am 22.08.2026 waren es 177 — ist damit DAUERHAFT stumm, auch in einem
//   Monat. Das ist der bewusste Preis dafuer, dass die Meldung etwas bedeutet.
//   Wer den Rueckstand abarbeiten will, muss es wollen; erinnert wird er
//   nicht. Die Zahl steht in der Zuordnungsmaske, sonst nirgends.
//
// ⚠ NICHT ZU VERWECHSELN MIT `UNZUGEORDNET_WARNUNG`. Die misst einen ANTEIL
//   und ist der Fruehwarner fuer den personId-Wechsel zum 1. Juli: springt
//   die Quote auf eine ganze Mannschaft, hat der Verband vermutlich die IDs
//   getauscht. Anderer Zweck, anderer Ausloeser — bleibt unberuehrt.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function meldeNeueUnzugeordnete(
  db: SupabaseClient, vereinId: string,
): Promise<number> {
  const { data: verb, error: vErr } = await db
    .from("api_verbindungen")
    .select("id, zuordnung_gemeldet_am")
    .eq("verein_id", vereinId).eq("key", "football_ch").maybeSingle();
  /* error lesen, nicht nur auf data pruefen: sonst saehe ein 42703 (Spalte
     fehlt, weil die Migration nicht lief) aus wie „kein Anschluss". */
  if (vErr || !verb) return 0;
  const marke = verb.zuordnung_gemeldet_am as string | null;
  if (!marke) return 0;

  const { data: zuordnungRoh, error: zErr } = await db
    .from("sfv_zuordnung").select("sfv_person_id").eq("verein_id", vereinId);
  if (zErr) return 0;
  const zugeordnet = new Set((zuordnungRoh ?? []).map((z) => Number(z.sfv_person_id)));

  const { data: zeilen, error: aErr } = await db
    .from("spiel_aufstellung")
    .select("sfv_person_id, erstmals_gesehen").eq("verein_id", vereinId);
  if (aErr) return 0;

  /* Fruehstes Auftreten je Spieler. Ein Spieler mit einer alten UND einer
     neuen Zeile ist NICHT neu — er hat nur wieder gespielt. */
  const frueheste = new Map<number, string>();
  for (const z of (zeilen ?? []) as unknown as
       { sfv_person_id: number; erstmals_gesehen: string }[]) {
    const id = Number(z.sfv_person_id);
    if (zugeordnet.has(id)) continue;
    const bisher = frueheste.get(id);
    if (!bisher || z.erstmals_gesehen < bisher) frueheste.set(id, z.erstmals_gesehen);
  }

  const offenGesamt = frueheste.size;
  let neu = 0;
  for (const wann of frueheste.values()) if (wann > marke) neu += 1;

  /* Die Marke rueckt IMMER vor, auch wenn nichts gemeldet wird. Sonst
     stauten sich die „neuen" so lange, bis die naechste Meldung wieder ueber
     einen Bestand statt ueber einen Zuwachs redete — also genau der Zustand,
     den die Marke verhindern soll. */
  await db.from("api_verbindungen")
    .update({ zuordnung_gemeldet_am: new Date().toISOString() }).eq("id", verb.id);

  if (neu === 0) return 0;

  /* Nur wenn keine UNGELESENE dieser Art steht. Ein Verein, der die
     Warteschlange laenger nicht anfasst, bekaeme sonst jede Woche dieselbe
     Meldung — und liest ab der dritten keine mehr. */
  const { data: offeneMeldung } = await db
    .from("benachrichtigungen").select("id")
    .eq("verein_id", vereinId).eq("referenz_typ", "sfv_zuordnung_offen")
    .eq("gelesen", false).limit(1);
  if (offeneMeldung?.length) return 0;

  const { data: admins, error: adminErr } = await db
    .from("benutzer").select("id")
    .eq("verein_id", vereinId).eq("ist_admin", true).eq("aktiv", true);
  if (adminErr || !admins?.length) return 0;

  const { error } = await db.from("benachrichtigungen").insert(
    admins.map((a) => ({
      verein_id: vereinId,
      benutzer_id: a.id as string,
      type: "hinweis",
      title: "Neue Spieler ohne Zuordnung",
      content: `${neu} Spieler aus den letzten Spielen sind noch keinem Mitglied `
             + `zugeordnet (${offenGesamt} insgesamt offen). Portalverwaltung → `
             + `API-Verbindungen → Spieler zuordnen; dort lassen sich die Namen `
             + `einmalig vom Verband holen.`,
      referenz_typ: "sfv_zuordnung_offen",
      referenz_id: null,
    })),
  );
  return error ? 0 : neu;
}
