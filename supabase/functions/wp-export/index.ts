// ClubCampus — supabase/functions/wp-export/index.ts
//
// Der Export nach WordPress. Laeuft auf dem Server, weil der Zugang zur
// Website nirgends in den Browser darf.
//
// AKTIONEN
//   probe    Liest alles und gibt zurueck, WAS GESENDET WUERDE. Schickt
//            nichts. Schreibt keine Zeile, weder hier noch dort.
//   export   (Etappe 4 — hier noch nicht gebaut)
//
// ⚠ WARUM `probe` ZUERST, UND ALLEIN
//   Der Export schickt Namen von Junioren auf eine oeffentliche Website.
//   Am 19.08.2026 ist eine Denylist gegen die SFV-Matchdaten aufgeflogen,
//   die 32 Klarnamen durchgelassen haette — gefangen wurde es nur, weil
//   die Datei zuerst in den Scratchpad geschrieben und dort GEGENGELESEN
//   wurde. Das ist der Lauf, den man einmal von Hand liest.
//
// ⚠ WO DAS DENKEN LIEGT — und es liegt bewusst nicht hier
//   Jede Uebersetzung zwischen ClubCampus und dem Theme steht in
//   `src/domains/spiele/wpNutzlast.ts`: Resultat zerlegen, Zustand
//   abbilden, Verlauf bauen. Diese Datei liest und schickt.
//
//   Der Grund ist die Pruefbarkeit: `tsc` liest eine Edge Function nicht
//   (der esm.sh-Import allein erzeugt 21 Fehler), und vitest kann sie
//   nicht importieren. Was hier entschieden wuerde, pruefte niemand.
//   30 Testfaelle decken die Uebersetzung ab; diese Datei traegt keine.
//
// GEHEIMNISSE. Aus den Supabase-Secrets, nie aus einer Datei:
//   WP_BASIS_URL   https://dev.fcherrliberg.ch/wp-json
//   WP_BENUTZER    clubcampus-export
//   WP_APP_PASSWORT
//   WP_SYNC_KEY    (Etappe 6, fuer den Zeitplan)
//
// ⚠ Die ADRESSE steht ebenfalls im Secret und NICHT in
//   api_verbindungen.api_url — anders als beim SFV. Ein Wechsel von dev
//   auf die Produktion soll ein `secrets set` sein und sonst nichts; zwei
//   Orte fuer eine Aussage laufen auseinander. Siehe
//   docs/plan_wordpress_spieldaten.md §4.2.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mischeEreignisse, hatVerlauf } from "../../../src/domains/spiele/matchdatenAnzeige.ts";
import type { EreignisZeile } from "../../../src/domains/spiele/matchdatenAnzeige.ts";
import { bildeSpiel } from "../../../src/domains/spiele/wpNutzlast.ts";
import type { WpSpiel, SpielQuelle } from "../../../src/domains/spiele/wpNutzlast.ts";
import { protokoll, protokollFehler } from "../sfv-sync/protokoll.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-key",
};

const json = (koerper: unknown, status = 200) =>
  new Response(JSON.stringify(koerper), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ⚠ Wieviele Spiele die Probe hoechstens zurueckgibt. Nicht aus
   Sparsamkeit: die Antwort geht an einen Browser und soll LESBAR sein —
   sie ist zum Gegenlesen da. Der scharfe Lauf kennt diese Grenze nicht.
   Was gekuerzt wurde, steht in der Antwort; eine stille Kuerzung waere
   genau der Fehler, den sie finden soll. */
const PROBE_HOECHSTENS = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  let aktion = "";
  let nurTeam: string | null = null;
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
    nurTeam = body?.nur_team ? String(body.nur_team) : null;
  } catch {
    return json({ fehler: "Ungültiger Aufruf" }, 400);
  }

  /* ⚠ `export` ist bewusst noch nicht da. Ein Platzhalter, der 200 und
     „noch nicht gebaut" zurueckgibt, waere schlimmer als ein Fehler: der
     Zeitplan haette dann einen gruenen Lauf ohne Wirkung. */
  if (aktion !== "probe") {
    return json({ fehler: `Unbekannte Aktion: ${aktion || "(leer)"} — heute gibt es nur "probe"` }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const authHeader = req.headers.get("Authorization");

  /* ⚠ Nur mit Anmeldung, nie ueber den Zeitplan. Die Antwort traegt
     Klarnamen, sobald jemand zugeordnet ist — und die Antwort eines
     Cron-Laufs legt pg_net in net._http_response.content ab, einem
     Speicher, den niemand im Blick hat. Dieselbe Regel wie bei der
     Aktion `namen` des SFV-Sync. */
  if (!authHeader) return json({ fehler: "Nicht autorisiert" }, 401);

  const alsAufrufer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: istAdmin, error: rechteFehler } = await alsAufrufer.rpc("is_admin");
  if (rechteFehler) return json({ fehler: "Rechte nicht prüfbar" }, 403);
  if (!istAdmin) return json({ fehler: "Nur für Administratoren" }, 403);

  const { data: meinVerein } = await alsAufrufer.rpc("get_my_verein_id");
  if (!meinVerein) return json({ fehler: "Kein Verein für diesen Aufrufer" }, 403);
  const vereinId = String(meinVerein);

  /* Lesen ueber die Service Role: die Probe soll denselben Datenstand
     sehen wie der spaetere Lauf ueber den Zeitplan, nicht den durch RLS
     gefilterten. Der Verein kommt aus get_my_verein_id, nicht aus dem
     Aufruf — der waere faelschbar. */
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const erg = await laufeProbe(db, vereinId, nurTeam);
    protokoll(`wp-export/probe/${vereinId}`,
      `${erg.spiele.length} Spiel(e), ${erg.zusammenfassung.verlauf_zeilen} Verlaufszeilen`);
    return json(erg);
  } catch (e) {
    const meldung = protokollFehler(`wp-export/probe/${vereinId}`, e);
    return json({ fehler: meldung }, 502);
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   DIE PROBE
   ═══════════════════════════════════════════════════════════════════════ */

/* ⚠ Der Client wird strukturell beschrieben statt als `any`. `createClient`
   liefert unter Deno eine andere generische Auspraegung als
   `ReturnType<typeof createClient>`, und die beiden sind nicht zuweisbar —
   ein `any` waere die bequeme Antwort und naehme jeder Abfrage darunter die
   Pruefung. Die Ergebnisse sind stattdessen einzeln annotiert. */
type DbLeser = { from: (tabelle: string) => any };

interface VereinZeile { name: string | null; slug: string | null }
interface TeamZeile { id: number; name: string; sfv_team_id: number | null }
type SpielZeile = SpielQuelle & { id: string; sfv_team_id: number | null };
interface ZuordnungZeile {
  sfv_person_id: number;
  mitglieder: { personen: { vorname: string | null; nachname: string | null } | null } | null;
}

interface ProbeErgebnis {
  hinweis: string;
  zusammenfassung: Record<string, unknown>;
  teams: unknown[];
  spiele: WpSpiel[];
  gekuerzt: number;
}

async function laufeProbe(
  db: DbLeser, vereinId: string, nurTeam: string | null,
): Promise<ProbeErgebnis> {

  /* ── Verein ──────────────────────────────────────────────────────── */
  const vRes = await db.from("vereine").select("name, slug").eq("id", vereinId).maybeSingle();
  if (vRes.error) throw new Error(`Verein nicht lesbar: ${vRes.error.message}`);
  const unserKlub = (vRes.data as VereinZeile | null)?.name ?? "";

  /* ── Teams ───────────────────────────────────────────────────────── */
  const tRes = await db.from("teams").select("id, name, sfv_team_id")
    .eq("verein_id", vereinId).not("sfv_team_id", "is", null);
  if (tRes.error) throw new Error(`Teams nicht lesbar: ${tRes.error.message}`);
  const teams = (tRes.data ?? []) as TeamZeile[];

  /* ⚠ Die WordPress-Beitrags-Id des Teams kennt die Probe NICHT — sie
     spricht nicht mit WordPress. `fch_team` bleibt deshalb 0, und das ist
     kein Fehler, sondern die Grenze dieser Aktion: was der scharfe Lauf
     dort einsetzt, kommt aus der Zuordnung sfv_id ↔ Beitrag, und die
     liegt drueben. Beim Gegenlesen ist die 0 der Hinweis darauf. */
  const teamListe = teams.map((t) => ({
    clubcampus_id: t.id,
    name: t.name,
    sfv_team_id: String(t.sfv_team_id),
  }));

  const erlaubt = new Set(
    nurTeam ? [nurTeam] : teamListe.map((t) => t.sfv_team_id),
  );

  /* ── Spiele ──────────────────────────────────────────────────────── */
  const sRes = await db.from("spiele")
    .select("id, sfv_match_id, sfv_spiel_nr, date, zeit, gegner, heimspiel, venue, "
      + "wettbewerb, sfv_gruppe, sfv_status, resultat, ht_resultat, sfv_team_id")
    .eq("verein_id", vereinId)
    .not("sfv_match_id", "is", null)
    .order("date");
  if (sRes.error) throw new Error(`Spiele nicht lesbar: ${sRes.error.message}`);
  const spiele = (sRes.data ?? []) as SpielZeile[];

  const eigene = spiele.filter((s) => erlaubt.has(String(s.sfv_team_id)));

  /* ── Ereignisse, in einem Zug ────────────────────────────────────── */
  const spielIds = eigene.map((s) => String(s.id));
  const eRes = spielIds.length
    ? await db.from("spiel_ereignisse").select("*").in("spiel_id", spielIds)
    : { data: [], error: null };
  if (eRes.error) throw new Error(`Ereignisse nicht lesbar: ${eRes.error.message}`);

  const proSpiel = new Map<string, EreignisZeile[]>();
  for (const z of (eRes.data ?? []) as (EreignisZeile & { spiel_id: string })[]) {
    const liste = proSpiel.get(z.spiel_id) ?? [];
    liste.push(z);
    proSpiel.set(z.spiel_id, liste);
  }

  /* ── Namen ───────────────────────────────────────────────────────── */
  /* ⚠ Heute leer: sfv_zuordnung hat null Zeilen (29.08.2026). Dann steht
     im Verlauf ueberall „Nr. 9" statt eines Namens — und genau das ist der
     Zustand, in dem der erste scharfe Lauf stattfinden wuerde. Die Zahl
     steht deshalb in der Zusammenfassung: sie ist die Antwort auf die
     Frage, ob auf der Website Klarnamen erscheinen. */
  const zRes = await db.from("sfv_zuordnung")
    .select("sfv_person_id, mitglieder(personen(vorname, nachname))")
    .eq("verein_id", vereinId);
  if (zRes.error) throw new Error(`Zuordnung nicht lesbar: ${zRes.error.message}`);

  const namen = new Map<number, string>();
  for (const z of (zRes.data ?? []) as ZuordnungZeile[]) {
    const p = z.mitglieder?.personen;
    if (!p) continue;
    const voll = `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim();
    if (voll) namen.set(Number(z.sfv_person_id), voll);
  }

  /* ── Bauen ───────────────────────────────────────────────────────── */
  const gebaut: WpSpiel[] = [];
  let ohneVerlauf = 0;
  let ohneSchluessel = 0;
  let zurueckgehalten = 0;

  for (const s of eigene) {
    const roh = proSpiel.get(String(s.id)) ?? [];
    const ereignisse = mischeEreignisse(roh);
    if (!hatVerlauf(roh)) ohneVerlauf++;

    /* ⚠ Der Team-Beitrag ist hier unbekannt (siehe oben) — 0 als Platzhalter. */
    const spiel = bildeSpiel(s, 0, ereignisse, namen, unserKlub);
    if (!spiel) { ohneSchluessel++; continue; }
    if (!spiel.publizieren) zurueckgehalten++;
    gebaut.push(spiel);
  }

  const verlaufZeilen = gebaut.reduce((n, s) => n + s.verlauf.length, 0);
  const mitNamen = gebaut.reduce(
    (n, s) => n + s.verlauf.filter((z) => /^[^N]|^N(?!r\. )/.test(z.text)).length, 0);

  return {
    hinweis: "PROBE — es wurde nichts gesendet und nichts geschrieben. "
      + "fch_team steht auf 0, weil diese Aktion nicht mit WordPress spricht.",
    zusammenfassung: {
      teams_zugeordnet: teamListe.length,
      spiele_gesamt: spiele.length,
      spiele_im_satz: eigene.length,
      spiele_gebaut: gebaut.length,
      ohne_sfv_match_id: ohneSchluessel,
      ohne_verlauf: ohneVerlauf,
      nicht_zu_veroeffentlichen: zurueckgehalten,
      verlauf_zeilen: verlaufZeilen,
      /* ⚠ Die Zahl, auf die es beim Gegenlesen ankommt. */
      zuordnungen: namen.size,
      verlaufszeilen_mit_klarnamen: mitNamen,
    },
    teams: teamListe,
    spiele: gebaut.slice(0, PROBE_HOECHSTENS),
    gekuerzt: Math.max(0, gebaut.length - PROBE_HOECHSTENS),
  };
}
