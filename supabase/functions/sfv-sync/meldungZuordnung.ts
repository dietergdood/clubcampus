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
import { alleSeiten } from "../../../src/domains/db/alleSeiten.ts";

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

  /* ⚠ ⚠  SEITENWEISE SEIT DEM 23.09.2026 — und fuer `spiel_aufstellung` ist
     es KEINE Vorsorge: die Tabelle stand am 11.09.2026 bei 2282 Zeilen.
     Ungepagt las diese Meldung also seit jeher ein knappes Drittel und
     rechnete auf dem Rest.

     ⚠ Und der Fehler ging in die STILLE Richtung: wer aus der gekuerzten
     Menge fiel, tauchte in `frueheste` nicht auf und galt als „nicht neu".
     Die Meldung blieb aus — und eine ausbleibende Meldung ist von „es gibt
     nichts zu melden" nicht zu unterscheiden. Genau dafuer gibt es sie.

     ⚠ `verein_id` begrenzt nicht (bei einem Mandanten auf 100 %),
     `erstmals_gesehen` ist kein Filter. Sortiert wird ueber `id`, den
     Primaerschluessel — `sfv_person_id` kommt mehrfach vor und waere als
     Seitenschluessel nicht eindeutig. */
  let zuordnungRoh: { sfv_person_id: number }[];
  let zeilen: { sfv_person_id: number; erstmals_gesehen: string }[];
  try {
    zuordnungRoh = await alleSeiten<{ sfv_person_id: number }>(
      (von, bis) => db.from("sfv_zuordnung").select("sfv_person_id")
        .eq("verein_id", vereinId).order("id").range(von, bis),
      () => db.from("sfv_zuordnung").select("id", { count: "exact", head: true })
        .eq("verein_id", vereinId),
      "Zuordnungen",
    );
    zeilen = await alleSeiten<{ sfv_person_id: number; erstmals_gesehen: string }>(
      (von, bis) => db.from("spiel_aufstellung")
        .select("sfv_person_id, erstmals_gesehen").eq("verein_id", vereinId)
        .order("id").range(von, bis),
      () => db.from("spiel_aufstellung").select("id", { count: "exact", head: true })
        .eq("verein_id", vereinId),
      "Aufstellung",
    );
  } catch (e) {
    /* ⚠ `0` IST HIER DER BESTEHENDE VERTRAG — die Funktion gab schon vorher
       bei `zErr`/`aErr` eine Null zurueck, und der Aufrufer zaehlt sie als
       `nachzug_meldungen`. Gebunden statt geworfen, weil ein Wurf den
       ganzen Matchdaten-Lauf abbraeche: die Meldung ist ein Anbau, und ein
       Anbau darf den Bau nicht mitnehmen.
       ⚠ Aber NICHT stumm: die Meldung geht ins Protokoll, sonst saehe ein
       Lesefehler genauso aus wie „niemand ist neu offen". */
    console.error("meldeNeueUnzugeordnete:", e instanceof Error ? e.message : String(e));
    return 0;
  }
  const zugeordnet = new Set(zuordnungRoh.map((z) => Number(z.sfv_person_id)));

  /* Fruehstes Auftreten je Spieler. Ein Spieler mit einer alten UND einer
     neuen Zeile ist NICHT neu — er hat nur wieder gespielt. */
  const frueheste = new Map<number, string>();
  for (const z of zeilen) {
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

  /* ⚠ SEITENWEISE — Vorsorge. Heute eine Handvoll Admins; die drei Filter
     begrenzen inhaltlich stark, aber keiner davon ist eine Einzel-Id, und
     `ist_admin`/`aktiv` sind Kennzeichen, keine Schluessel. Faellt hier
     jemand heraus, bekommt genau er die Meldung nie — und merkt es nicht,
     weil eine nicht zugestellte Meldung nirgends auftaucht. */
  let admins: { id: string }[];
  try {
    admins = await alleSeiten<{ id: string }>(
      (von, bis) => db.from("benutzer").select("id")
        .eq("verein_id", vereinId).eq("ist_admin", true).eq("aktiv", true)
        .order("id").range(von, bis),
      () => db.from("benutzer").select("id", { count: "exact", head: true })
        .eq("verein_id", vereinId).eq("ist_admin", true).eq("aktiv", true),
      "Administratoren",
    );
  } catch (e) {
    console.error("meldeNeueUnzugeordnete (admins):",
      e instanceof Error ? e.message : String(e));
    return 0;
  }
  if (!admins.length) return 0;

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
