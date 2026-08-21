// ClubCampus — supabase/functions/sfv-sync/index.ts
//
// Zugang zur SFV Club API. Laeuft auf dem Server, weil die Zugangsdaten
// nirgends in den Browser duerfen (siehe docs/auftrag_sfv_api.md).
//
// AKTIONEN
//   teams   Teams des Vereins fuer die laufende Saison. Liest nur, schreibt
//           in KEINE Tabelle, legt KEINEN Log-Eintrag an. Vorlage fuer die
//           Zuordnung in der Portalverwaltung.
//   sync    Spielplan und Rangliste holen und abgleichen. Optional
//           {nur:"spielplan"|"rangliste"} fuer gezielte Laeufe von Hand.
//           Beides in EINEM Lauf, unter EINEM Token, mit EINEM Log-Eintrag —
//           zwei getrennte Aktionen wuerden sich gegenseitig den Token
//           entwerten (die API kennt pro Anwendung genau einen).
//
// ZWEI WEGE HEREIN
//   1. Admin-JWT      — Aufruf aus dem Portal. RLS bestimmt den Verein.
//   2. X-Sync-Key     — der Zeitplan (pg_cron) hat kein JWT. Der Header wird
//                       gegen das Secret SFV_SYNC_KEY geprueft; dieser Weg
//                       bearbeitet alle Anschluesse mit auto_sync = true.
//   Der Service-Role-Key taugt als Ausweis NICHT: is_admin() liest
//   auth.uid(), das dabei leer ist.
//
// GEHEIMNISSE. Aus den Supabase-Secrets, nie aus einer Datei:
//   npx supabase secrets set SFV_APPLICATION_KEY=… SFV_APPLICATION_PASS=… \
//                            SFV_CLUB_ID=1516 SFV_SYNC_KEY=…
// Werden sie vom SFV neu vergeben, ist das der einzige Ort, der zu aendern
// ist. Die Adresse steht NICHT hier, sondern in api_verbindungen.api_url.
//
// NICHTS INS LOG AUSSER FEHLERN. Die Regel war gegen Zugangsdaten gerichtet
// und hat dabei auch die Fehler verschluckt: am 20.08.2026 scheiterte ein
// Lauf mit non-2xx, und die Logs zeigten nur "booted" und "shutdown".
// Seither laeuft jede Ausgabe durch protokoll.ts, das Token,
// Verbindungszeichenketten und Schluessel-Wert-Paare schwaerzt. Direktes
// console.* bleibt in diesem Ordner verboten.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { holeToken, holeSaison, holeTeams } from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import { laufeSync } from "./sync.ts";
import { fuersProtokoll, fuerZeitplanAntwort } from "./ergebnisTypen.ts";
import { protokoll, protokollFehler } from "./protokoll.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-key",
};

const json = (koerper: unknown, status = 200) =>
  new Response(JSON.stringify(koerper), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* 15 Minuten. Ein Lauf dauert Sekunden; laenger heisst abgestuerzt, und die
   Sperre darf den naechsten Lauf nicht dauerhaft blockieren. */
const SPERRE_MINUTEN = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  let aktion = "", nur: string | null = null;
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
    nur = body?.nur ? String(body.nur) : null;
  } catch {
    return json({ fehler: "Ungueltiger Aufruf" }, 400);
  }
  if (aktion !== "teams" && aktion !== "sync") return json({ fehler: `Unbekannte Aktion: ${aktion}` }, 400);
  if (nur && nur !== "spielplan" && nur !== "rangliste") return json({ fehler: `Unbekanntes nur: ${nur}` }, 400);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const authHeader = req.headers.get("Authorization");
  const syncKey = req.headers.get("X-Sync-Key");
  const erwarteterSyncKey = Deno.env.get("SFV_SYNC_KEY");

  const perZeitplan = Boolean(syncKey && erwarteterSyncKey && syncKey === erwarteterSyncKey);
  if (!perZeitplan) {
    if (!authHeader) return json({ fehler: "Nicht autorisiert" }, 401);
    /* Client MIT dem Token des Aufrufers: RLS greift, und die Rechte kommen
       aus derselben Quelle wie die Policies statt nachgebaut zu werden. */
    const alsAufrufer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: istAdmin, error: rechteFehler } = await alsAufrufer.rpc("is_admin");
    if (rechteFehler) return json({ fehler: "Rechte nicht pruefbar" }, 403);
    if (!istAdmin) return json({ fehler: "Nur fuer Administratoren" }, 403);
  }
  if (perZeitplan && aktion === "teams") return json({ fehler: "teams nur mit Anmeldung" }, 403);

  /* Schreiben laeuft ueber die Service Role: der Zeitplan hat keinen
     Benutzer, und RLS haette dabei niemanden zu pruefen. Der Verein kommt
     nicht aus dem Aufruf, sondern aus api_verbindungen. */
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  const key = Deno.env.get("SFV_APPLICATION_KEY");
  const pass = Deno.env.get("SFV_APPLICATION_PASS");
  /* TODO Mandantenfaehigkeit: die ClubID gehoert an den Verein, nicht an die
     Anwendung. Solange nur FCH angeschlossen ist, steht sie im Secret; beim
     zweiten Verein braucht api_verbindungen eine eigene Spalte. */
  const clubId = Deno.env.get("SFV_CLUB_ID");
  if (!key || !pass || !clubId) return json({ fehler: "Zugangsdaten nicht gesetzt (npx supabase secrets set …)" }, 500);

  /* ── Welche Anschluesse ── */
  let frage = db.from("api_verbindungen")
    .select("id,verein_id,api_url,sync_felder,auto_sync").eq("key", "football_ch");
  if (perZeitplan) frage = frage.eq("auto_sync", true);
  const { data: verbindungen, error: vFehler } = await frage;
  if (vFehler) return json({ fehler: "Anschluesse nicht lesbar" }, 500);
  if (!verbindungen?.length) {
    return json(perZeitplan
      ? { hinweis: "Kein Anschluss mit auto_sync = true", laeufe: [] }
      : { fehler: "Kein Anschluss football_ch eingerichtet" }, perZeitplan ? 200 : 400);
  }

  /* Beim Aufruf aus dem Portal nur der eigene Verein. get_my_verein_id()
     statt einer verein_id aus dem Aufruf — die waere faelschbar. */
  let eigene = verbindungen;
  if (!perZeitplan) {
    const alsAufrufer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: meinVerein } = await alsAufrufer.rpc("get_my_verein_id");
    eigene = verbindungen.filter((v) => v.verein_id === meinVerein);
    if (!eigene.length) return json({ fehler: "Kein Anschluss fuer diesen Verein" }, 404);
  }

  const zugangFuer = (api_url: string): SfvZugang => ({
    basis: (api_url || "").replace(/\/+$/, ""), key, pass, clubId,
  });

  /* ── Aktion teams: lesen, nichts schreiben, nichts protokollieren ── */
  if (aktion === "teams") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());
      const teams = await holeTeams(zugang, token, saison.id);
      return json({ saison, teams });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : "SFV-Abfrage fehlgeschlagen" }, 502);
    }
  }

  /* ── Aktion sync ── */
  const laeufe: unknown[] = [];
  for (const v of eigene) {
    if (!v.api_url) { laeufe.push({ verein_id: v.verein_id, status: "fehler", meldung: "api_verbindungen.api_url fehlt" }); continue; }

    /* Laufsperre in EINEM Statement beanspruchen. Pruefen und danach setzen
       waeren zwei Schritte, und dazwischen passt ein zweiter Lauf — der dann
       den Token des ersten entwertet. */
    const grenze = new Date(Date.now() - SPERRE_MINUTEN * 60_000).toISOString();
    const { data: beansprucht } = await db
      .from("api_verbindungen")
      .update({ sync_laeuft_seit: new Date().toISOString() })
      .eq("id", v.id)
      .or(`sync_laeuft_seit.is.null,sync_laeuft_seit.lt.${grenze}`)
      .select("id");
    if (!beansprucht?.length) {
      laeufe.push({ verein_id: v.verein_id, status: "uebersprungen", meldung: "Ein Lauf ist bereits unterwegs" });
      continue;
    }

    const { data: logZeile } = await db.from("api_sync_log").insert({
      verbindung_id: v.id, verein_id: v.verein_id, status: "laeuft", gestartet_am: new Date().toISOString(),
    }).select("id").single();

    try {
      const erg = await laufeSync(db, v as never, zugangFuer(v.api_url), nur, null);
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(), status: erg.status, meldung: erg.meldung,
          datensaetze_neu: erg.spiele.neu, datensaetze_aktualisiert: erg.spiele.aktualisiert,
          datensaetze_fehler: 0, details: fuersProtokoll(erg),
        }).eq("id", logZeile.id);
      }
      await db.from("api_verbindungen").update({
        letzter_sync: new Date().toISOString(), sync_status: erg.status, sync_meldung: erg.meldung,
      }).eq("id", v.id);
      /* Eine Zeile pro Lauf, auch wenn er gelingt: sonst sieht man in den
         Logs nur "booted"/"shutdown" und weiss nicht, ob ueberhaupt etwas
         passiert ist. Die Meldung enthaelt Zahlen und Feldnamen, keine
         Zugangsdaten — und laeuft trotzdem durch die Schwaerzung. */
      protokoll(`lauf/${v.verein_id}`, `${erg.status}: ${erg.meldung}`);
      /* ⚠ ZWEI EMPFAENGER, ZWEI FORMEN. Der Browser bekommt das ganze
         Ergebnis samt `offene_namen`; der Zeitplan bekommt es ohne, weil
         seine Antwort bei pg_net in `net._http_response` liegen bleibt.
         Siehe fuerZeitplanAntwort() in sync.ts. */
      laeufe.push(perZeitplan
        ? { verein_id: v.verein_id, ...fuerZeitplanAntwort(erg) }
        : { verein_id: v.verein_id, ...erg });
    } catch (e) {
      const meldung = protokollFehler(`lauf/${v.verein_id}`, e);
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(), status: "fehler", meldung, datensaetze_fehler: 1,
        }).eq("id", logZeile.id);
      }
      await db.from("api_verbindungen").update({ sync_status: "fehler", sync_meldung: meldung }).eq("id", v.id);
      laeufe.push({ verein_id: v.verein_id, status: "fehler", meldung });
    } finally {
      /* Sperre IMMER loesen — sonst blockiert ein Fehlschlag 15 Minuten. */
      await db.from("api_verbindungen").update({ sync_laeuft_seit: null }).eq("id", v.id);
    }
  }

  const einFehler = laeufe.some((l) => (l as { status?: string }).status === "fehler");
  return json({ laeufe }, einFehler ? 502 : 200);
});
