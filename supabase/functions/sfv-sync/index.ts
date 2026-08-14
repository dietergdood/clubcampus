// ClubCampus — supabase/functions/sfv-sync/index.ts
//
// Zugang zur SFV Club API. Laeuft auf dem Server, weil die Zugangsdaten
// nirgends in den Browser duerfen (siehe docs/auftrag_sfv_api.md).
//
// AKTIONEN
//   teams   liefert die Teams des Vereins fuer die laufende Saison.
//           Liest nur. Schreibt in KEINE Tabelle und legt KEINEN
//           Log-Eintrag an — es ist kein Sync, sondern die Vorlage fuer
//           die Zuordnung in der Portalverwaltung.
//
// Spaeter kommen hier `spielplan` und `rangliste` dazu. Sie liegen
// bewusst in derselben Funktion: die SFV-API kennt pro Anwendung genau
// EINEN gueltigen Token, ein zweiter POST /api/token macht den ersten
// sofort ungueltig (am 13.08.2026 gemessen). Zwei Funktionen, die
// unabhaengig Token holen, wuerden einander abschiessen.
//
// GEHEIMNISSE. Kommen aus den Supabase-Secrets, nie aus einer Datei:
//   npx supabase secrets set SFV_APPLICATION_KEY=… SFV_APPLICATION_PASS=… SFV_CLUB_ID=1516
// Werden vom SFV neu vergeben, ist das der einzige Ort, der zu aendern ist.
// Die Adresse steht NICHT hier, sondern in api_verbindungen.api_url —
// damit Staging und Produktion ohne Codeaenderung umschaltbar sind.
//
// NICHTS INS LOG. In dieser Datei steht bewusst kein einziges console.*.
// Ein console.log(response) beim Fehlersuchen ist schnell getippt, und
// Supabase-Logs sind lesbar. Fehler gehen als Text an den Aufrufer, ohne
// Antwortkoerper des SFV und ohne Token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (koerper: unknown, status = 200) =>
  new Response(JSON.stringify(koerper), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* Die SFV-Saison ist nach dem Endjahr benannt: 2027 = Saison 2026/2027,
   sie laeuft vom 1.7.2026 bis 30.6.2027. Bestaetigt gegen /api/common/ids,
   nicht angenommen. */
function saisonAusDatum(jetzt: Date): number {
  return jetzt.getUTCMonth() + 1 >= 7 ? jetzt.getUTCFullYear() + 1 : jetzt.getUTCFullYear();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ fehler: "Nicht autorisiert" }, 401);

  let aktion = "";
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
  } catch {
    return json({ fehler: "Ungueltiger Aufruf" }, 400);
  }
  if (aktion !== "teams") return json({ fehler: `Unbekannte Aktion: ${aktion}` }, 400);

  /* Client MIT dem Token des Aufrufers — dadurch greift RLS, und die
     Abfrage auf api_verbindungen liefert von selbst nur den Verein des
     Aufrufers. Kein verein_id im Aufruf, kein Verwechslungsrisiko. */
  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  /* Rechte aus derselben Quelle wie die Policies, nicht nachgebaut. */
  const { data: istAdmin, error: rechteFehler } = await sb.rpc("is_admin");
  if (rechteFehler) return json({ fehler: "Rechte nicht pruefbar" }, 403);
  if (!istAdmin) return json({ fehler: "Nur fuer Administratoren" }, 403);

  const { data: verbindung } = await sb
    .from("api_verbindungen")
    .select("api_url")
    .eq("key", "football_ch")
    .maybeSingle();

  const basis = (verbindung?.api_url || "").replace(/\/+$/, "");
  if (!basis) return json({ fehler: "Kein Anschluss football_ch eingerichtet (api_verbindungen.api_url fehlt)" }, 400);

  const key = Deno.env.get("SFV_APPLICATION_KEY");
  const pass = Deno.env.get("SFV_APPLICATION_PASS");
  /* TODO Mandantenfaehigkeit: die ClubID gehoert an den Verein, nicht an
     die Anwendung. Solange nur FCH angeschlossen ist, steht sie im Secret;
     beim zweiten Verein braucht api_verbindungen eine eigene Spalte. */
  const clubId = Deno.env.get("SFV_CLUB_ID");
  if (!key || !pass || !clubId) return json({ fehler: "Zugangsdaten nicht gesetzt (npx supabase secrets set …)" }, 500);

  /* ── Token ── genau einer pro Aufruf, siehe Kopf ── */
  let token = "";
  try {
    const antwort = await fetch(`${basis}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationKey: key, applicationPass: pass }),
    });
    if (!antwort.ok) return json({ fehler: `SFV lehnt die Zugangsdaten ab (HTTP ${antwort.status})` }, 502);
    token = (await antwort.text()).trim().replace(/^"|"$/g, "");
  } catch {
    return json({ fehler: "SFV nicht erreichbar" }, 502);
  }
  if (!token) return json({ fehler: "SFV liefert keinen Token" }, 502);

  const hole = async (pfad: string) => {
    const antwort = await fetch(`${basis}${pfad}`, {
      headers: { "X-User-Token": token, "X-User-Language": "1", Accept: "application/json" },
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const text = await antwort.text();
    let daten = JSON.parse(text);
    /* /api/common/ids liefert einen JSON-String, der JSON enthaelt. */
    if (typeof daten === "string") daten = JSON.parse(daten);
    return daten;
  };

  try {
    /* Saison: aus dem Datum abgeleitet, aber gegen die Liste des SFV
       geprueft. Steht sie nicht darin, gewinnt die hoechste bekannte —
       geraten wird nicht. */
    const ids = await hole(`/api/common/ids?ClubId=${clubId}&Language=1`);
    const saisons: Array<{ id: number; name: string }> = ids?.sfv_ids?.seasons ?? [];
    const gewuenscht = saisonAusDatum(new Date());
    const saison =
      saisons.find((s) => s.id === gewuenscht) ??
      saisons.slice().sort((a, b) => b.id - a.id)[0];
    if (!saison) return json({ fehler: "SFV liefert keine Saisonliste" }, 502);

    const roh = await hole(`/api/team/list?SeasonId=${saison.id}&ClubId=${clubId}&Language=1`);
    if (!Array.isArray(roh)) return json({ fehler: "SFV liefert keine Teamliste" }, 502);

    /* Nur die Felder, die die Zuordnung braucht. team/list fuehrt keine
       Personendaten — weder Namen noch Geburtsdaten noch Kontakte. Was
       hier nicht steht, verlaesst die Funktion auch nicht. */
    const teams = roh.map((t: Record<string, unknown>) => ({
      sfv_team_id: t.teamId as number,
      name: (t.teamName as string) ?? "",
      voller_name: (t.teamFullname as string) ?? "",
      liga_id: (t.teamLeagueId as number) ?? null,
      liga_name: (t.teamLeagueName as string) ?? "",
      division: (t.teamDivisionName as string) ?? "",
      aktiv: (t.isTeamActive as boolean) ?? true,
    }));

    return json({ saison: { id: saison.id, name: saison.name }, teams });
  } catch {
    return json({ fehler: "SFV-Abfrage fehlgeschlagen" }, 502);
  }
});
