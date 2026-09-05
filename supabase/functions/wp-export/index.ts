// ClubCampus — supabase/functions/wp-export/index.ts
//
// Der Export nach WordPress. Laeuft auf dem Server, weil der Zugang zur
// Website nirgends in den Browser darf.
//
// AKTIONEN
//   probe    Liest alles und gibt zurueck, WAS GESENDET WUERDE. Schickt
//            nichts. Schreibt keine Zeile, weder hier noch dort.
//   export   Schickt, was die Probe zeigen wuerde. Schreibt in WordPress
//            und protokolliert in api_sync_log.
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
import { bildeSpiel, zaehleVerlaufNamen } from "../../../src/domains/spiele/wpNutzlast.ts";
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

/** Die gueltigen Aktionen — eine Liste, aus der die Pruefung UND die
    Fehlermeldung lesen. Zwei Orte koennten auseinanderlaufen. */
const AKTIONEN = ["probe", "export"];

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
  if (!AKTIONEN.includes(aktion)) {
    /* ⚠ Die gueltigen Aktionen stehen MIT in der Meldung, und beide kommen
       aus derselben Liste — sie koennen also nicht auseinanderlaufen.

       Am 05.09.2026 stand hier eine Meldung ohne diese Haelfte: beim
       Ergaenzen von `export` habe ich das `— heute gibt es nur "probe"`
       entfernt, weil es mit zwei Aktionen nicht mehr passte. Die Meldung
       kannte die Antwort danach immer noch und nannte sie nicht mehr — und
       ein Aufruf mit `spiele` (dem WordPress-ROUTENPFAD, nicht der Aktion)
       kostete eine Rueckfrage, die die Maschine haette beantworten koennen.

       Eine Meldung zu verallgemeinern heisst nicht, sie zu leeren. */
    return json({
      fehler: `Unbekannte Aktion: ${aktion || "(leer)"}`,
      gueltig: AKTIONEN,
    }, 400);
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

    if (aktion === "probe") {
      protokoll(`wp-export/probe/${vereinId}`,
        `${erg.alle.length} Spiel(e), ${erg.zusammenfassung.verlauf_zeilen} Verlaufszeilen`);
      return json(erg);
    }

    /* ⚠ `export` OHNE `nur_team` gibt es nicht. Der erste scharfe Lauf soll
       eine Mannschaft treffen, keine einundzwanzig — und wer den Parameter
       vergisst, soll nicht versehentlich alles schreiben. Die Sperre faellt
       in Etappe 5 bewusst, nicht aus Versehen. */
    if (!nurTeam) {
      return json({ fehler: "export verlangt nur_team — Etappe 4 läuft je Mannschaft" }, 400);
    }

    return json(await sendeAnWordpress(db, vereinId, nurTeam, erg));
  } catch (e) {
    const meldung = protokollFehler(`wp-export/${aktion}/${vereinId}`, e);
    return json({ fehler: meldung }, 502);
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   DER SCHARFE LAUF
   ═══════════════════════════════════════════════════════════════════════ */

async function sendeAnWordpress(
  db: DbLeser, vereinId: string, nurTeam: string, erg: ProbeErgebnis,
) {
  const basis = (Deno.env.get("WP_BASIS_URL") ?? "").replace(/\/+$/, "");
  const benutzer = Deno.env.get("WP_BENUTZER") ?? "";
  const passwort = Deno.env.get("WP_APP_PASSWORT") ?? "";
  if (!basis || !benutzer || !passwort) {
    throw new Error("WP_BASIS_URL, WP_BENUTZER oder WP_APP_PASSWORT nicht gesetzt");
  }

  /* ⚠ Der Ziel-Host wird MITGESCHRIEBEN, nicht als Konfiguration abgelegt.
     Die Adresse steht im Secret und nirgends sonst (Plan §4.2); was hier in
     die Meldung geht, ist eine Beobachtung ueber einen Lauf, der
     stattgefunden hat — und die kann nach einem Wechsel nicht falsch sein. */
  const host = new URL(basis).host;

  /* ⚠ `erg.alle`, NICHT `erg.spiele`. Die Probe kuerzt auf 25 Zeilen, damit
     ein Mensch sie lesen kann. Erbte der scharfe Lauf diese Grenze, schriebe
     er stillschweigend ein Viertel und meldete Erfolg — genau die stille
     Kuerzung, gegen die die Grenze selbst gebaut ist. */
  const alle = erg.alle;

  const beginn = new Date().toISOString();
  const antwort = await fetch(`${basis}/clubcampus/v1/spiele`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      /* Anwendungspasswort als Basic-Auth. Es steht nur im Secret und
         kommt in kein Protokoll. */
      Authorization: "Basic " + btoa(`${benutzer}:${passwort}`),
    },
    body: JSON.stringify({ lauf: beginn, teams: [nurTeam], spiele: alle }),
  });

  const text = await antwort.text();
  let wp: Record<string, unknown>;
  try {
    wp = JSON.parse(text);
  } catch {
    /* ⚠ Kein JSON heisst fast immer: eine HTML-Fehlerseite, ein
       Wartungsmodus oder eine Basic-Auth-Abfrage davor. Der Anfang des
       Textes sagt mehr als „ungueltige Antwort". */
    throw new Error(`WordPress antwortete kein JSON (${antwort.status}): ${text.slice(0, 200)}`);
  }
  if (!antwort.ok) {
    throw new Error(`WordPress ${antwort.status}: ${JSON.stringify(wp).slice(0, 300)}`);
  }

  const laenge = (k: string) => ((wp[k] as unknown[] | undefined) ?? []).length;
  const status = (laenge("fehler") || laenge("ohne_team") || laenge("doppelte_teams"))
    ? "warnung" : "ok";

  const meldung = `${host} · ${wp.neu ?? 0} neu, ${wp.aktualisiert ?? 0} aktualisiert, `
    + `${wp.zurueckgezogen ?? 0} zurückgezogen, ${wp.verlauf_zeilen ?? 0} Verlaufszeilen`;

  const vRes = await db.from("api_verbindungen")
    .select("id").eq("verein_id", vereinId).eq("key", "wordpress").maybeSingle();
  const verbindungId = (vRes.data as { id: string } | null)?.id ?? null;

  if (verbindungId) {
    await db.from("api_sync_log").insert({
      verbindung_id: verbindungId, verein_id: vereinId, status,
      gestartet_am: beginn, beendet_am: new Date().toISOString(),
      datensaetze_neu: Number(wp.neu ?? 0),
      datensaetze_aktualisiert: Number(wp.aktualisiert ?? 0),
      datensaetze_fehler: laenge("fehler"),
      meldung,
      details: fuersProtokoll(host, nurTeam, alle.length, wp),
    });

    /* `letzter_sync` und `sync_status` im SELBEN update — der Waechter
       prueft das Paar, und zwei getrennte Schreibvorgaenge koennten
       auseinanderlaufen. */
    await db.from("api_verbindungen").update({
      letzter_sync: new Date().toISOString(),
      sync_status: status,
      sync_meldung: meldung,
    }).eq("id", verbindungId);
  }

  return {
    ziel: host,
    gesendet: alle.length,
    wordpress: wp,
    protokolliert: Boolean(verbindungId),
    zusammenfassung: erg.zusammenfassung,
  };
}

/**
 * Was ins Protokoll darf — Zahlen und Beitrags-Ids, keine Texte.
 *
 * ⚠ EIGENE ALLOWLIST, nicht das Objekt durchreichen. Die Antwort des
 * Plugins traegt bei Dubletten den abgeleiteten Beitragstitel („Team —
 * Gegner"). Der ist hier harmlos, aber die Regel ist es nicht: am
 * 21.08.2026 sind 903 Klarnamen ins Protokoll geraten, weil ein Objekt
 * gespreadet wurde. Was gespeichert wird, wird aufgezaehlt.
 *
 * Der Titel steht in der Antwort an den Browser, wo ihn ein Mensch liest
 * und niemand ablegt.
 */
function fuersProtokoll(
  host: string, team: string, gesendet: number, wp: Record<string, unknown>,
): Record<string, unknown> {
  const dubletten = (wp.moegliche_dubletten as Record<string, unknown>[] | undefined) ?? [];
  return {
    ziel_host: host,
    team,
    gesendet,
    neu: Number(wp.neu ?? 0),
    aktualisiert: Number(wp.aktualisiert ?? 0),
    zurueckgezogen: Number(wp.zurueckgezogen ?? 0),
    uebersprungen: Number(wp.uebersprungen ?? 0),
    verlauf_zeilen: Number(wp.verlauf_zeilen ?? 0),
    ohne_team: (wp.ohne_team as string[] | undefined) ?? [],
    doppelte_teams: (wp.doppelte_teams as string[] | undefined) ?? [],
    moegliche_dubletten: dubletten.map((d) => ({ neu: d.neu, von_hand: d.von_hand })),
    fehler: (wp.fehler as string[] | undefined) ?? [],
  };
}


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
  /** Gekuerzt auf PROBE_HOECHSTENS — zum Lesen durch einen Menschen. */
  spiele: WpSpiel[];
  gekuerzt: number;
  /** ⚠ Der vollstaendige Satz. Der scharfe Lauf nimmt DIESEN, nie `spiele`. */
  alle: WpSpiel[];
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

  /* ⚠ Die Nutzlast traegt die SFV-Teamnummer, nicht die WordPress-
     Beitrags-Id — aufgeloest wird drueben, wo die Zuordnung liegt. Damit
     zeigt die Probe genau das, was auch gesendet wird; es gibt keinen
     Platzhalter mehr, den jemand beim Gegenlesen erklaeren muesste. */
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
  const namensZaehlung = { mit_personenname: 0, mit_rueckennummer: 0, mit_gegnername: 0 };

  for (const s of eigene) {
    const roh = proSpiel.get(String(s.id)) ?? [];
    const ereignisse = mischeEreignisse(roh);
    if (!hatVerlauf(roh)) ohneVerlauf++;

    const spiel = bildeSpiel(s, String(s.sfv_team_id ?? ""), ereignisse, namen, unserKlub);
    if (!spiel) { ohneSchluessel++; continue; }
    if (!spiel.publizieren) zurueckgehalten++;
    gebaut.push(spiel);

    /* ⚠ Gezaehlt wird die ENTSCHEIDUNG, nicht der fertige Text. Die erste
       Fassung las den Ausgabetext („beginnt nicht mit Nr. ") und meldete
       431 statt 0, weil jede Gegnerzeile einen Vereinsnamen traegt.
       Siehe zaehleVerlaufNamen(). */
    const z = zaehleVerlaufNamen(ereignisse, namen);
    namensZaehlung.mit_personenname += z.mit_personenname;
    namensZaehlung.mit_rueckennummer += z.mit_rueckennummer;
    namensZaehlung.mit_gegnername += z.mit_gegnername;
  }

  const verlaufZeilen = gebaut.reduce((n, s) => n + s.verlauf.length, 0);

  /* ⚠ Die Gegenprobe im Ergebnis, nicht nur im Test: gehen Summe und
     Zeilenzahl auseinander, misst eine der beiden Funktionen etwas
     anderes als die andere — und dann ist die Zahl unbrauchbar, egal wie
     plausibel sie aussieht. */
  const summe = namensZaehlung.mit_personenname
    + namensZaehlung.mit_rueckennummer + namensZaehlung.mit_gegnername;

  return {
    hinweis: "Vorschau. Bei aktion=probe wird nichts gesendet und nichts geschrieben.",
    zusammenfassung: {
      teams_zugeordnet: teamListe.length,
      spiele_gesamt: spiele.length,
      spiele_im_satz: eigene.length,
      spiele_gebaut: gebaut.length,
      ohne_sfv_match_id: ohneSchluessel,
      ohne_verlauf: ohneVerlauf,
      nicht_zu_veroeffentlichen: zurueckgehalten,
      verlauf_zeilen: verlaufZeilen,
      /* ⚠ Die Zahl, auf die es beim Gegenlesen ankommt: wie viele Zeilen
         nennen einen MENSCHEN beim Namen. Solange `zuordnungen` 0 ist,
         muss auch sie 0 sein — und wenn nicht, ist das der Befund. */
      zuordnungen: namen.size,
      zeilen_mit_personenname: namensZaehlung.mit_personenname,
      zeilen_mit_rueckennummer: namensZaehlung.mit_rueckennummer,
      zeilen_mit_gegnername: namensZaehlung.mit_gegnername,
      zaehlung_stimmt: summe === verlaufZeilen,
    },
    teams: teamListe,
    spiele: gebaut.slice(0, PROBE_HOECHSTENS),
    gekuerzt: Math.max(0, gebaut.length - PROBE_HOECHSTENS),
    alle: gebaut,
  };
}
