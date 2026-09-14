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
import {
  fasseWechselProbe, deuteWechselProbe, fasseCupProbe, deuteCupProbe,
} from "../../../src/domains/sfv/wechselProbe.ts";
import { waehleNachtragSpiele, deuteNachtrag } from "../../../src/domains/sfv/ereignisNachtrag.ts";
import { schluesselVon, schluesselTief, suchtBildfeld }
  from "../../../src/domains/sfv/rohschluessel.ts";
import {
  LAUF_LAEUFT, LAUF_FEHLER, AKTION_SYNC, AKTION_NAMEN, AKTION_WECHSELNACHTRAG,
} from "../../../src/domains/sfv/protokollStatus.ts";
import { bildeEreignis } from "./matchdaten.ts";
import {
  holeToken, holeSaison, holeTeams, holeTeamsRoh, holeSpielplan, holeEreignisse,
  holeBank, holeRangliste, holeGemeinsameIds, versucheRoh,
} from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import { laufeSync, bildeSpiel } from "./sync.ts";
import { schneideAufFeldhoheit } from "../../../src/domains/sfv/feldhoheit.ts";
import { fuersProtokoll, fuerZeitplanAntwort, namenFuersProtokoll } from "./ergebnisTypen.ts";
import { laufeNamen } from "./namenLauf.ts";
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
/* ⚠ Obergrenze je Lauf, weil jeder Abruf einer beim Verband ist. Der
   Rest bleibt offen und wird GEMELDET — keine stille Kuerzung. */
const NACHTRAG_HOECHSTENS = 40;
const SPERRE_MINUTEN = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  let aktion = "", nur: string | null = null;
  /* ⚠ Nur die Aktion und `nur` werden gelesen; `teamNummer` kam am
     14.09.2026 fuer `nummernprobe` dazu. Aufgezaehlt statt durchgereicht —
     ein Rumpf, den jemand blind weitergibt, ist ein Ausgang mehr. */
  let teamNummer: number | null = null;
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
    nur = body?.nur ? String(body.nur) : null;
    teamNummer = body?.team === undefined ? null : Number(body.team);
  } catch {
    return json({ fehler: "Ungültiger Aufruf" }, 400);
  }
  /* ⚠ Die gueltigen Aktionen aufgezaehlt, damit die Meldung sie nennen
     kann — dieselbe Regel wie in wp-export. */
  const AKTIONEN = [
  "teams", "sync", "namen", "teamprobe", "wechselprobe", "wechselnachtrag", "cupprobe",
  "rohschluessel", "vertragsprobe", "rangprobe", "nummernprobe",
];
  if (!AKTIONEN.includes(aktion)) {
    return json({ fehler: `Unbekannte Aktion: ${aktion}`, gueltig: AKTIONEN }, 400);
  }
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
    if (rechteFehler) return json({ fehler: "Rechte nicht prüfbar" }, 403);
    if (!istAdmin) return json({ fehler: "Nur für Administratoren" }, 403);
  }
  if (perZeitplan && aktion === "teams") return json({ fehler: "teams nur mit Anmeldung" }, 403);
  /* ⚠ `namen` NIE ueber den Zeitplan. Zwei Gruende, und beide zaehlen:
     die Antwort traegt Klarnamen, und die Antwort eines Cron-Laufs legt
     pg_net in `net._http_response.content` ab — ein Speicher, den niemand
     im Blick hat. Ausserdem nuetzen Namen nur einem Browser. */
  if (perZeitplan && aktion === "namen") return json({ fehler: "namen nur mit Anmeldung" }, 403);
  /* ⚠ Dieselbe Sperre wie bei `namen`: der Zeitplan hat keinen Menschen,
     der das Ergebnis liest, und ein Nachtrag ohne Leser ist ein Lauf, der
     stillschweigend beim Verband abfragt. */
  if (perZeitplan && aktion === "wechselnachtrag") {
    return json({ fehler: "wechselnachtrag nur mit Anmeldung" }, 403);
  }
  /* ⚠ Auch diese nur mit Anmeldung: eine Auskunft ohne Leser ist ein
     Abruf beim Verband fuer nichts. */
  if (perZeitplan && aktion === "rohschluessel") {
    return json({ fehler: "rohschluessel nur mit Anmeldung" }, 403);
  }

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
    if (!eigene.length) return json({ fehler: "Kein Anschluss für diesen Verein" }, 404);
  }

  const zugangFuer = (api_url: string): SfvZugang => ({
    basis: (api_url || "").replace(/\/+$/, ""), key, pass, clubId,
  });

  /* ── Aktion teamprobe: WARUM liefert /api/team/list nur einen Teil? ──
     ⚠ EINE MESSUNG, KEIN BETRIEB. Sie schreibt nichts, protokolliert
     nichts und aendert am stuendlichen Lauf nichts. Anlass ist der Befund
     vom 10.09.2026: die Verbandsseite fuehrt 34 Mannschaften mit
     Spielplan, `/api/team/list` gibt 21 heraus.

     Drei Fragen auf einmal:
       A  bringt ein Zusatzfilter mehr? (MatchType 1/6/8 — Meisterschaft,
          Turnier, Mini-Turniere; die Spieltypen der jungen Jahrgaenge)
       B  gibt es die Teams anderswo? (der Spielplan fuehrt teamAId/teamBId)
       C  und wenn beides nichts bringt: dann gibt es den Weg nicht, und
          niemand muss weitersuchen.

     ⚠ Die Antwort nennt Zahlen UND die Differenzmenge — eine Zahl allein
     sagt nicht, WELCHE Mannschaft fehlt. */
  /* ── Aktion wechselprobe: WER ist bei einem Wechsel wer? ────────────
     Liest, schreibt nichts. Sie beantwortet genau eine Frage: schickt der
     Verband zum Ersatzspieler eine Kennung, einen Namen, oder nur eine
     Nummer? Gemessen von Didi am 10.09.2026: `ein_sfv_person_id` ist bei
     allen 176 Wechseln leer, waehrend die Verbandsseite beide Namen
     zeigt — also steht die Auskunft woanders in der Antwort.

     ⚠ SIE GIBT KEINE NAMEN ZURUECK, nur ob einer da ist. Eine Probe, die
     mehr herausgibt als ihre Frage verlangt, ist der Anfang des naechsten
     Protokoll-Funds — siehe die 903 Klarnamen vom 21.08.2026. */
  /* ── Aktion wechselnachtrag: die Kennung des Ersatzspielers nachziehen ──
     Holt NUR die Ereignisse und schreibt sie ueber dieselbe Funktion wie
     der Sync. Faesst `matchdaten_geholt_am` nicht an — das Feld sagt,
     wann ein Spiel VOLLSTAENDIG geholt wurde, und ein Nachtrag darf das
     nicht behaupten. */
  if (aktion === "wechselnachtrag") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);

    /* Laufsperre wie beim Sync: die SFV-API kennt pro Anwendung genau EIN
       gueltiges Token. Ein `POST /api/token` des Syncs mitten in unseren
       Abrufen wuerde unseres entwerten. */
    const grenzeW = new Date(Date.now() - SPERRE_MINUTEN * 60_000).toISOString();
    const { data: gesperrt } = await db.from("api_verbindungen")
      .update({ sync_laeuft_seit: new Date().toISOString() })
      .eq("id", v.id)
      .or(`sync_laeuft_seit.is.null,sync_laeuft_seit.lt.${grenzeW}`)
      .select("id");
    if (!gesperrt?.length) return json({ fehler: "Ein Lauf ist bereits unterwegs" }, 409);

    /* ⚠ ER SCHREIBT — also protokolliert er. Bis zum 10.09.2026 tat er
       weder das eine noch das andere sichtbar: er aenderte
       spiel_ereignisse und hinterliess KEINE Zeile. Ein Lauf, von dem man
       hinterher nicht weiss, ob er stattfand, ist derselbe blinde Fleck
       wie ein Fehlschlag ohne Spur.

       ⚠ Die Leseproben (teamprobe, cupprobe, wechselprobe, rohschluessel)
       protokollieren weiterhin NICHT, und das ist kein Versehen: sie
       aendern nichts. Eine Zeile je Auskunft waere Rauschen in einer
       Tabelle, die von Aenderungen handelt. */
    const { data: logZeile } = await db.from("api_sync_log").insert({
      verbindung_id: v.id, verein_id: v.verein_id, aktion: AKTION_WECHSELNACHTRAG,
      status: LAUF_LAEUFT, gestartet_am: new Date().toISOString(),
    }).select("id").single();

    try {
      const { data: verein, error: vErr } = await db.from("vereine")
        .select("sfv_club_nummer").eq("id", v.verein_id).maybeSingle();
      if (vErr) throw new Error(`Verein nicht lesbar: ${vErr.message}`);
      const clubNr = (verein?.sfv_club_nummer as number | null) ?? null;
      if (clubNr === null) {
        return json({ fehler: "vereine.sfv_club_nummer fehlt — ohne sie ist eigen/fremd nicht zu trennen" }, 400);
      }

      /* Die offenen Zeilen: eigener Wechsel ohne Kennung des Ersatzes.
         ⚠ `error` lesen — eine leere Liste saehe sonst aus wie „nichts
         offen" und der Lauf meldete Erfolg, ohne etwas getan zu haben. */
      const { data: offen, error: oErr } = await db.from("spiel_ereignisse")
        .select("spiel_id, spiele(sfv_match_id)")
        .eq("verein_id", v.verein_id)
        .eq("typ_id", 2)
        .eq("ist_eigener", true)
        .is("ein_sfv_person_id", null);
      if (oErr) throw new Error(`Wechselzeilen nicht lesbar: ${oErr.message}`);

      const zeilen = ((offen ?? []) as unknown as
        { spiel_id: string; spiele: { sfv_match_id: number | null } | null }[])
        .map((z) => ({ spiel_id: z.spiel_id, sfv_match_id: z.spiele?.sfv_match_id ?? null }));
      const wahl = waehleNachtragSpiele(zeilen, NACHTRAG_HOECHSTENS);

      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const jetzt = new Date().toISOString();

      let abgefragt = 0;
      let fehlgeschlagen = 0;
      let geschrieben = 0;

      /* Die spiel_id je sfv_match_id — der Upsert braucht sie. */
      const zuSpiel = new Map<number, string>();
      for (const z of zeilen) {
        if (z.sfv_match_id != null) zuSpiel.set(Number(z.sfv_match_id), z.spiel_id);
      }

      for (const matchId of wahl.matchIds) {
        const spielId = zuSpiel.get(matchId);
        if (!spielId) continue;
        try {
          const roh = await holeEreignisse(zugang, token, matchId);
          const neu = roh
            .map((e) => bildeEreignis(e, clubNr, v.verein_id, spielId, jetzt))
            .filter((z): z is NonNullable<typeof z> => z !== null);
          abgefragt++;
          if (!neu.length) continue;
          const { data: rueck, error: uErr } = await db.from("spiel_ereignisse")
            .upsert(neu, { onConflict: "verein_id,sfv_event_id" })
            .select("id");
          if (uErr) throw new Error(uErr.message);
          geschrieben += (rueck ?? []).length;
        } catch (e) {
          fehlgeschlagen++;
          void (e instanceof Error ? e.message : String(e));
        }
      }

      /* ⚠ Nach dem Schreiben ERNEUT zaehlen, nicht rechnen. Eine Differenz
         aus zwei Zahlen behauptet, der Upsert habe getan, was er sollte —
         und genau das ist die offene Frage dieses Laufs. */
      const { count: danach, error: nErr } = await db.from("spiel_ereignisse")
        .select("id", { count: "exact", head: true })
        .eq("verein_id", v.verein_id).eq("typ_id", 2).eq("ist_eigener", true)
        .is("ein_sfv_person_id", null);
      if (nErr) throw new Error(`Gegenzählung fehlgeschlagen: ${nErr.message}`);

      const erg = {
        spiele_abgefragt: abgefragt,
        spiele_fehlgeschlagen: fehlgeschlagen,
        ereignisse_geschrieben: geschrieben,
        offen_gesamt: wahl.offen_gesamt,
        offen_danach: danach ?? 0,
        ohne_match_id: wahl.ohne_match_id,
      };
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(),
          status: erg.spiele_fehlgeschlagen ? "warnung" : "ok",
          meldung: deuteNachtrag(erg),
          datensaetze_aktualisiert: erg.ereignisse_geschrieben,
          datensaetze_fehler: erg.spiele_fehlgeschlagen,
          /* ⚠ Aufgezaehlt, nicht `...erg`. Das Ergebnis traegt heute nur
             Zahlen — aber ein Spread ist ein Ausgang, der jedes kuenftige
             Feld mitnimmt, und genau so sind 903 Klarnamen ins Protokoll
             gelangt. */
          details: {
            spiele_abgefragt: erg.spiele_abgefragt,
            ereignisse_geschrieben: erg.ereignisse_geschrieben,
            offen_gesamt: erg.offen_gesamt,
            offen_danach: erg.offen_danach,
            ohne_match_id: erg.ohne_match_id,
          },
        }).eq("id", logZeile.id);
      }
      return json({ ...erg, deutung: deuteNachtrag(erg) });
    } catch (e) {
      const meldung = e instanceof Error ? e.message : String(e);
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(), status: LAUF_FEHLER,
          meldung, datensaetze_fehler: 1,
        }).eq("id", logZeile.id);
      }
      return json({ fehler: meldung }, 502);
    } finally {
      await db.from("api_verbindungen").update({ sync_laeuft_seit: null }).eq("id", v.id);
    }
  }

  /* ── Aktion cupprobe: was traegt ein Spiel OHNE Gruppennamen? ────────
     Ein Abruf des Klub-Spielplans, liest, schreibt nichts. Sie beantwortet
     die Frage, die vor einer Spalte steht: enthaelt `playDayName` bei
     einem Cupspiel „1. Runde", oder steht dort nur eine Zahl?

     ⚠ Sie gibt hier die WERTE zurueck, anders als die Wechselprobe. Der
     Unterschied ist die Sache: dort ging es um Personennamen, hier um
     „1. Runde" gegen „3" — und das ist ohne den Wert nicht zu beantworten.
     Der Spielplan-Endpunkt fuehrt ueberhaupt keine Personendaten. */
  /* ── Aktion vertragsprobe: haelt sync_felder gegen den Code? ─────────

     ⚠ ANLASS, und er hat den stuendlichen Lauf zum Stillstand gebracht:
     eine Migration trug `ht_resultat` in `sync_felder->spiele->sfv` ein.
     Der Spielplan-Durchgang kann es nicht berechnen — er bekommt vom
     Verband keine Halbzeit —, also warf `fehlend` bei JEDEM Lauf, und
     der Sync stand, bis der Vertrag berichtigt war.

     **Die Pruefung gab es also schon; sie lief nur zur Laufzeit.** Diese
     Aktion zieht sie nach vorne: vor der Migration statt danach.

     ⚠ KEIN API-AUFRUF, KEIN TOKEN, KEIN SCHREIBEN. `bildeSpiel()` baut
     ein Objektliteral mit fester Schluesselmenge — welche Werte
     drinstehen, haengt von den Daten ab, WELCHE FELDER es gibt nicht.
     Eine erfundene Zeile genuegt deshalb, und sie kostet nichts.

     ⚠ SIE PRUEFT DEN SPIELPLAN-DURCHGANG, MEHR NICHT. Die zwei anderen
     Schreibstellen in `spiele` (Halbzeit, Schiedsrichter/Laufmarke)
     gehen an der Feldhoheit vorbei — was dort geschrieben wird, sieht
     sie nicht. Das steht in ihrer Antwort, damit niemand ein gruenes
     Ergebnis fuer mehr nimmt, als es ist. */
  if (aktion === "vertragsprobe") {
    const v = eigene[0];
    const sf = (v.sync_felder as any)?.spiele ?? {};
    const erlaubt = [...(sf.sfv ?? []), ...(sf.abgeleitet ?? [])] as string[];

    /* Eine erfundene Zeile — nur die Felder, die bildeSpiel() liest.
       Beide Mannschaften „eigen", damit kein Zweig frueh aussteigt. */
    const gebaut = bildeSpiel(
      {
        teamAId: 1, teamBId: 2, teamNameA: "A", teamNameB: "B",
        matchId: 1, matchNumber: 1, matchDate: "2026-01-01T12:00:00",
        matchState: 2, scoreTeamA: 1, scoreTeamB: 0,
      } as any,
      new Set([1]), new Map([[1, "A"]]), new Date().toISOString(),
    );
    if (!gebaut) {
      return json({ fehler: "bildeSpiel hat nichts gebaut — die Probe ist unbrauchbar" }, 500);
    }
    const { fehlend, nicht_erlaubt } = schneideAufFeldhoheit(erlaubt, gebaut.zeile);

    return json({
      hinweis: "Liest nur. Kein API-Aufruf, kein Schreiben.",
      /* ⚠ Beide Zahlen immer, auch als Null — eine Zahl, die nur im
         schlechten Fall erscheint, verlangt eine Deutung. */
      fehlend,
      nicht_erlaubt,
      wuerde_werfen: fehlend.length > 0,
      erlaubt_anzahl: erlaubt.length,
      berechnet_anzahl: Object.keys(gebaut.zeile).length,
      listen: {
        sfv: (sf.sfv ?? []).length,
        abgeleitet: (sf.abgeleitet ?? []).length,
        verein: (sf.verein ?? []).length,
        sfv_matchdaten: (sf.sfv_matchdaten ?? []).length,
      },
      /* ⚠ Der Zuschnitt gehoert in die Antwort, nicht in die Doku: eine
         Pruefung, die ihre eigene Grenze nennt, kann nicht fuer mehr
         genommen werden, als sie ist. */
      geprueft: "nur der Spielplan-Durchgang (sfv + abgeleitet).",
      ungeprueft: "sfv_matchdaten und alles, was die Matchdaten-Tueren "
        + "schreiben — sie gehen an schneideAufFeldhoheit vorbei.",
    });
  }

  /* ── Aktion rohschluessel: was bringt die Leitung wirklich? ──────────
     Zwei Abrufe, liest, schreibt nichts. Sie beantwortet EINE Frage, an
     der ein Widerspruch haengt: meine Suche in der Swagger-Datei sagt
     „kein Bildfeld", eine Beobachtung sagt „eine logoUrl kommt mit".

     ⚠ NUR SCHLUESSEL, NIE WERTE — Object.keys(), nirgends entries().
     Siehe rohschluessel.ts. */
  if (aktion === "rohschluessel") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());

      const teams = schluesselVon(await holeTeamsRoh(zugang, token, saison.id));
      const spielplanRoh = await holeSpielplan(zugang, token, saison.id);
      const spiele = schluesselVon(spielplanRoh);

      /* ⚠ ⚠  `/api/common/ids` — DIE EINE OFFENE FRAGE VOM 14.09.2026.
         Kein anderer Endpunkt der Spezifikation fuehrt eine
         Mannschaftsnummer; dieser verlangt ClubId und sagt ueber seine
         Antwortform nichts. Nur ein Aufruf beantwortet das.

         ⚠ Er steht in EINEM try: scheitert er, ist der Rest der Leseprobe
         weiterhin brauchbar. Ein Wurf hier naehme mit, was ihn nichts
         angeht — derselbe Befund wie beim Ranglisten-Block. */
      let gemeinsameIds: Record<string, unknown>;
      try {
        const roh = await holeGemeinsameIds(zugang, token);
        /* ⚠ Die Spezifikation sagt `type: "string"`. Ist es wirklich eine
           Zeichenkette, steckt das JSON doppelt kodiert darin — dann einmal
           auspacken. Und die FORM wird gemeldet: „kein Objekt" und „ein
           Objekt in einer Zeichenkette" saehen sonst gleich aus. */
        let form = Array.isArray(roh) ? "Liste"
          : typeof roh === "string" ? "Zeichenkette"
          : roh && typeof roh === "object" ? "Objekt" : typeof roh;
        let wert: unknown = roh;
        if (typeof roh === "string") {
          try { wert = JSON.parse(roh); form = "Zeichenkette mit JSON darin"; }
          catch { form = "Zeichenkette, kein JSON"; }
        }
        gemeinsameIds = {
          gefragt: true, form,
          schluessel: schluesselVon(wert),
          /* ⚠ ⚠  TIEF, UND NUR HIER. `schluesselVon()` sieht eine Ebene —
             und dieser Endpunkt antwortete mit EINEM Feld namens `sfv_ids`.
             Ein Endpunkt, der „alle relevanten Ids" verspricht und ein Feld
             liefert, ist selbst auffaellig: das Feld ist vermutlich die
             ganze Struktur. Nur Feldnamen, nie Werte. */
          tief: schluesselTief(wert),
          /* ⚠ Die Frage, um die es geht — direkt beantwortet statt aus der
             Schluesselliste erschlossen. Sie sucht NUR nach Namen, nie nach
             Werten. */
          nennt_teamnummern: JSON.stringify(schluesselVon(wert))
            .toLowerCase().includes("team"),
        };
      } catch (e) {
        /* ⚠ Gebunden und benannt. Ein 404 hier ist selbst eine Auskunft:
           der Endpunkt steht in der Spezifikation und antwortet nicht. */
        gemeinsameIds = {
          gefragt: true,
          gescheitert: e instanceof Error ? e.message : String(e),
        };
      }

      /* ⚠ ⚠  DRITTER ABRUF: DIE BANK — zweiter Anlauf am 10.09.2026.

         Der erste antwortete mit HTTP 406 Not Acceptable. Zwei Ursachen
         kamen in Frage, und beide sind hier ausgeschlossen statt geraten:

         1 · DAS FALSCHE SPIEL. Der erste Anlauf nahm das LETZTE Spiel des
             Spielplans — also eines in der Zukunft. Ein nicht
             ausgetragenes Spiel hat keine Bank. Jetzt wird ein Spiel
             genommen, in dem NACHWEISLICH gewechselt wurde: eines mit
             einer Wechselzeile in `spiel_ereignisse`. Wo eine
             Auswechslung protokolliert ist, muss es eine Bank geben.

         2 · DER ANTWORTTYP. `Accept: application/json` ist derselbe wie
             bei `/players` und `/events`, die laufen — und die
             Swagger-Datei nennt fuer alle drei dieselben drei Typen.
             Trotzdem wird der zweite Versuch mit einem Accept gemacht, das jeden
             Typ zulaesst: ein
             Schema ist keine Antwort, heute zum dritten Mal.

         ⚠ BEIDE VERSUCHE WERDEN GEMELDET, mit Spiel und Status. Ein
         einzelnes „ging nicht" liesse offen, WORAN es lag — und genau
         diese Ununterscheidbarkeit hat heute schon dreimal in die falsche
         Richtung geschickt. */
      const { data: wechselSpiel } = await db.from("spiel_ereignisse")
        .select("spiele(sfv_match_id)")
        .eq("verein_id", v.verein_id)
        .eq("typ_id", 2)
        .eq("ist_eigener", true)
        .not("ein_sfv_person_id", "is", null)
        .limit(1)
        .maybeSingle();
      const ausWechsel = Number(
        (wechselSpiel as { spiele?: { sfv_match_id?: number } } | null)?.spiele?.sfv_match_id,
      );
      /* Rueckfall auf das erste Spiel des Plans, falls es keine
         Wechselzeile gibt — das erste ist eher ausgetragen als das letzte. */
      const mitId = spielplanRoh
        .map((sp) => Number((sp as Record<string, unknown>).matchId))
        .filter((n) => Number.isFinite(n) && n > 0);
      const probeSpiel = Number.isFinite(ausWechsel) && ausWechsel > 0
        ? ausWechsel
        : (mitId.length ? mitId[0] : 0);

      let bank: unknown = null;
      const bankVersuche: Array<{ accept: string; ergebnis: string }> = [];
      if (probeSpiel) {
        for (const accept of ["application/json", "*/*"]) {
          try {
            bank = schluesselVon(await holeBank(zugang, token, probeSpiel, accept));
            bankVersuche.push({ accept, ergebnis: "ok" });
            break;
          } catch (e) {
            bankVersuche.push({ accept, ergebnis: e instanceof Error ? e.message : String(e) });
          }
        }
      }

      return json({
        hinweis: "Leseprobe. Nur Feldnamen, keine Werte. Es wird nichts gespeichert.",
        saison: { id: saison.id, name: saison.name },
        team_liste: teams,
        spielplan: spiele,
        bank_spiel: probeSpiel,
        bank_spiel_aus: Number.isFinite(ausWechsel) && ausWechsel > 0
          ? "Spiel mit protokolliertem Wechsel" : "erstes Spiel des Plans",
        bank: bank,
        bank_versuche: bankVersuche,
        gemeinsame_ids: gemeinsameIds,
        bildfeld_team: suchtBildfeld(teams),
        bildfeld_spielplan: suchtBildfeld(spiele),
      });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  if (aktion === "cupprobe") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());
      const roh = await holeSpielplan(zugang, token, saison.id);
      const befund = fasseCupProbe(roh as unknown as Record<string, unknown>[]);
      return json({
        hinweis: "Leseprobe. Es wird nichts gespeichert.",
        saison: { id: saison.id, name: saison.name },
        ...befund,
        deutung: deuteCupProbe(befund),
      });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  if (aktion === "wechselprobe") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);

      /* Spiele mit Matchdaten, die juengsten zuerst — dort ist die
         Wahrscheinlichkeit am hoechsten, ueberhaupt einen Wechsel zu
         treffen. `error` lesen: eine leere Liste saehe sonst aus wie
         „keine Spiele" statt wie „Abfrage gescheitert". */
      const { data: spiele, error: sErr } = await db.from("spiele")
        .select("sfv_match_id")
        .eq("verein_id", v.verein_id)
        .not("matchdaten_geholt_am", "is", null)
        .order("date", { ascending: false })
        .limit(12);
      if (sErr) throw new Error(`Spiele nicht lesbar: ${sErr.message}`);

      const roh: Record<string, unknown>[] = [];
      let abgefragt = 0;
      let fehler = 0;
      for (const sp of spiele ?? []) {
        const mid = Number(sp.sfv_match_id);
        if (!Number.isFinite(mid)) continue;
        try {
          roh.push(...await holeEreignisse(zugang, token, mid));
          abgefragt++;
        } catch (e) {
          fehler++;
          void (e instanceof Error ? e.message : String(e));
        }
      }

      /* ⚠ Die Clubnummer aus `vereine`, nicht aus einer Konstante und nicht
         aus der ClubId — das sind drei verschiedene Zahlen (CLAUDE.md).
         Fehlt sie, gilt niemand als eigen, und die Probe meldete null
         eigene Wechsel: ein Ausfall in der Verkleidung einer Datenlage.
         Deshalb hier ein eigener Fehler statt einer stillen Null. */
      const { data: verein, error: vErr } = await db.from("vereine")
        .select("sfv_club_nummer").eq("id", v.verein_id).maybeSingle();
      if (vErr) throw new Error(`Verein nicht lesbar: ${vErr.message}`);
      const clubNr = (verein?.sfv_club_nummer as number | null) ?? null;
      if (clubNr === null) {
        return json({ fehler: "vereine.sfv_club_nummer fehlt — ohne sie ist eigen/fremd nicht zu trennen" }, 400);
      }

      const befund = fasseWechselProbe(roh, clubNr);
      return json({
        hinweis: "Leseprobe. Es wird nichts gespeichert und keine Namen zurückgegeben.",
        spiele_abgefragt: abgefragt,
        spiele_fehlgeschlagen: fehler,
        ereignisse_gesamt: roh.length,
        ...befund,
        deutung: deuteWechselProbe(befund),
      });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     rangprobe — was der Verband HEUTE je Gruppe liefert. Liest nur.

     ⚠ ⚠  ANLASS, 13.09.2026: bei fuenf Gruppen fehlen Spiele vom 9. bis
     12.09. im gelieferten Tabellenstand, am deutlichsten Senioren 40+
     Meister Gruppe 1 — dort stehen 0 Spiele, obwohl am 9.9. und 11.9.
     gespielt wurde.

     Die Frage ist nicht „welche Zahl steht bei uns", sondern „welche
     liefert der Verband". Ohne diese Probe ist ein Stand, den er selbst
     nicht fuehrt, von einem nicht unterscheidbar, den wir verlieren —
     dieselbe Familie wie die Spiele ohne Verlauf.

     ⚠ Sie ist eine LESEPROBE: kein Upsert, kein Protokolleintrag. Aus
     demselben Grund wie teamprobe und cupprobe — eine Zeile je Auskunft
     waere Rauschen in einer Tabelle, die von Aenderungen handelt.

     ⚠ Keine Personendaten: eine Ligatabelle nennt Mannschaften, keine
     Menschen. Ausgegeben wird trotzdem nur, was die Frage braucht —
     Allowlist, nicht Spread. Ein neues Feld der Gegenseite reiste sonst
     beim naechsten Mal still mit.
     ═══════════════════════════════════════════════════════════════════ */
  if (aktion === "rangprobe") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());
      const roh = await holeRangliste(zugang, token, saison.id);

      /* ⚠ ⚠  UNSERE CLUBNUMMER — der Grund, warum diese Probe ueberhaupt
         umgebaut wurde. `club_nummer` steht an JEDER Ranglistenzeile
         (`sync.ts:150`), also sind unsere eigenen Zeilen ohne jeden Join
         erkennbar. Ohne sie misst die Probe nur Gruppen, und **eine Gruppe
         interessiert uns nur insoweit, als wir darin stehen.** */
      const { data: verein, error: vFehler } = await db.from("vereine")
        .select("sfv_club_nummer").eq("id", v.verein_id).maybeSingle();
      if (vFehler) return json({ fehler: `vereine nicht lesbar: ${vFehler.message}` }, 500);
      const unsere = (verein?.sfv_club_nummer as number | null) ?? null;

      /* Je Gruppe zusammenfassen. Der Schluessel ist derselbe wie im Sync
         (`gruppenSchluessel`) — eine zweite Bildung liefe auseinander. */
      const gruppen = new Map<string, {
        liga: string; division: string; gruppe: string;
        zeilen: number; spiele_min: number | null; spiele_max: number | null;
        spiele_null: number;
      }>();

      for (const r of roh) {
        /* ⚠ ⚠  VIERTEILIG, WIE DER SCHLUESSEL IN DER DATENBANK — und die
           erste Fassung war dreiteilig, ohne Saison. Sie meldete **8
           Gruppen bei 232 Zeilen**, also 29 Mannschaften je Tabelle, was
           keine Liga hat.

           Der Empfaenger ist am 09.09.2026 fuer genau diesen Fehler
           berichtigt worden: eine Gruppe ist beim Verband vierteilig, und
           die Gruppennummer allein ist NICHT eindeutig. Ich habe ihn drei
           Tage spaeter in der Leseprobe wiederholt.

           ⚠ Die Zahl war der einzige Hinweis: 232 / 8 ist keine Tabelle.
           **Eine Gruppenzahl, die nicht zur Zeilenzahl passt, ist ein
           Befund ueber den Schluessel, nicht ueber die Daten.** */
        const k = `${saison.id}|${r.leagueId ?? 0}|${r.divisionId ?? 0}|${r.groupId ?? 0}`;
        const m = Number(r.matches);
        const g = gruppen.get(k) ?? {
          liga: String(r.leagueName ?? ""),
          division: String(r.divisionName ?? ""),
          gruppe: String(r.groupName ?? ""),
          zeilen: 0, spiele_min: null, spiele_max: null, spiele_null: 0,
        };
        g.zeilen += 1;
        if (Number.isFinite(m)) {
          g.spiele_min = g.spiele_min === null ? m : Math.min(g.spiele_min, m);
          g.spiele_max = g.spiele_max === null ? m : Math.max(g.spiele_max, m);
          if (m === 0) g.spiele_null += 1;
        }
        gruppen.set(k, g);
      }

      const liste = [...gruppen.entries()]
        .map(([schluessel, g]) => ({ schluessel, ...g }))
        /* ⚠ Die auffaelligen zuerst: eine Gruppe, in der JEDE Mannschaft
           null Spiele hat, ist der gemeldete Fall. */
        .sort((a, b) => (b.spiele_null - a.spiele_null)
          || a.liga.localeCompare(b.liga));

      /* ⚠ ⚠  WIE VIELE ZEILEN GAR KEINE GRUPPENNUMMER TRAGEN. `sfv_gruppe_id`
         hat `DEFAULT 0`, und `(r.groupId as number) ?? 0` macht aus einer
         fehlenden Angabe eine Null — **ein fehlender Wert und die Zahl Null
         sehen danach gleich aus.** Steht hier eine hohe Zahl, ruht unsere
         Gruppenidentitaet auf Liga und Division allein, und „Gruppe" ist
         als Begriff verloren. */
      const ohneGruppennummer = roh.filter((r) => {
        const g = Number(r.groupId);
        return !Number.isFinite(g) || g === 0;
      }).length;

      /* ⚠ ⚠  DIE ZEILE, NICHT DIE GRUPPE. `gruppen_ohne_spiele` zaehlt
         Gruppen, in denen JEDE Mannschaft null Spiele hat — und meldete
         deshalb 0, waehrend sieben unserer Mannschaften nachhinkten: in
         „Senioren 40+" haben dreizehn Gegner Spiele und wir keine, also
         ist die Gruppe nicht leer.

         **Die Zahl war nicht falsch, sie beantwortete eine andere Frage.**
         Sie sagt „fuehrt der Verband den Stand dieser Gruppe ueberhaupt?";
         gefragt war „hinkt UNSERE Zeile nach?".

         ⚠ ⚠ UND DIE AUSKUNFT LAG SCHON IN DER ANTWORT: `spiele_min` stand
         bei diesen Gruppen auf 0. Niemand hat es gelesen, weil die
         Kopfzahl daneben „0 Gruppen ohne Spiele" sagte. **Eine Kopfzahl,
         die beruhigt, erstickt das Detail neben sich** — die Umkehrung von
         „berechnet, geliefert, nicht gezeigt": gezeigt, aber neben einer
         Zahl, die sagt, es sei nichts zu sehen. */
      /* ⚠ ⚠  WAR DER RANGLISTEN-BLOCK UEBERSPRUNGEN? — Abfrage 5 als
         stehende Auskunft statt als einmaliges SQL.

         `ranglisten.stand_vom` wird bei JEDEM Ranglisten-Schreibvorgang auf
         `jetzt` gesetzt. Liegt der neueste Stand deutlich vor dem letzten
         Lauf, der auf `ok` endete, hat der Block nicht geschrieben — und bis
         zum 14.09.2026 war genau das moeglich, weil er hinter vier Wuerfen
         des Spielplans lag.

         ⚠ Die Zahl steht IMMER da, auch als Null. „0 Minuten Rueckstand"
         ist die Auskunft, dass der Block laeuft; sie fehlt, wenn nur der
         schlechte Fall angezeigt wird.

         ⚠ `null` heisst NICHT GEMESSEN und ist von „0" zu unterscheiden:
         ohne einen `ok`-Lauf im Protokoll gibt es nichts, wogegen man halten
         koennte. */
      const { data: letzterOk, error: lFehler } = await db.from("api_sync_log")
        .select("beendet_am").eq("verein_id", v.verein_id).eq("status", "ok")
        .not("beendet_am", "is", null)
        .order("beendet_am", { ascending: false }).limit(1).maybeSingle();
      if (lFehler) return json({ fehler: `api_sync_log nicht lesbar: ${lFehler.message}` }, 500);

      const { data: neuesterStand, error: nFehler } = await db.from("ranglisten")
        .select("stand_vom").eq("verein_id", v.verein_id)
        .order("stand_vom", { ascending: false }).limit(1).maybeSingle();
      if (nFehler) return json({ fehler: `ranglisten nicht lesbar: ${nFehler.message}` }, 500);

      const okZeit = letzterOk?.beendet_am ? Date.parse(String(letzterOk.beendet_am)) : null;
      const standZeit = neuesterStand?.stand_vom
        ? Date.parse(String(neuesterStand.stand_vom)) : null;
      const rueckstandMinuten = (okZeit !== null && standZeit !== null)
        ? Math.round((okZeit - standZeit) / 60000) : null;

      /* ⚠ Unsere zugeordneten Mannschaften — fuer die Vollstaendigkeitsfrage.
         `error` gelesen: eine leere Liste meldete sonst „keine Mannschaft
         ohne Zeile" und waere die glatte Beruhigung. */
      const { data: teamZeilen, error: tFehler } = await db.from("teams")
        .select("name, sfv_team_id").eq("verein_id", v.verein_id)
        .not("sfv_team_id", "is", null);
      if (tFehler) return json({ fehler: `teams nicht lesbar: ${tFehler.message}` }, 500);
      const teamsMitNummer = (teamZeilen ?? [])
        .map((t) => ({ name: String(t.name ?? ""), id: Number(t.sfv_team_id) }))
        .filter((t) => Number.isFinite(t.id));

      /* ══ DER KOPF-AN-KOPF-VERGLEICH ═══════════════════════════════════
         ⚠ ⚠  DREI ZAHLEN JE EIGENER ZEILE, und erst zusammen trennen sie die
         zwei Lagen, die von aussen gleich aussehen:

         | frisch | unser Bestand | heisst |
         |---|---|---|
         |   3    |      3        | der VERBAND fuehrt den alten Stand |
         |   4    |      3        | UNSERE Zwischenspeicherung hinkt nach |

         Ohne den frischen Abruf daneben ist beides „die Tabelle zeigt 3",
         und genau diese Ununterscheidbarkeit hat den Befund vom 14.09.2026
         erzeugt. Die Probe hat den Abruf ohnehin in der Hand — sie ist die
         einzige Stelle, an der beide Zahlen gleichzeitig vorliegen.

         ⚠ Die dritte Zahl ist die Gegenprobe von AUSSEN: wie viele
         Meisterschaftsspiele dieser Mannschaft stehen bei uns als
         ausgetragen? Sie kommt aus einem anderen Endpunkt desselben
         Absenders. Weichen Tabelle und Spielplan ab, widerspricht der
         Verband sich selbst — dieselbe Familie wie der Halbzeitstand gegen
         die Ereignisliste.

         ⚠ ⚠ SIE IST EINE NAEHERUNG, und das gehoert in die Antwort statt in
         diesen Kommentar: `matches` zaehlt die Spiele DIESER Gruppe, unser
         Filter zaehlt Spieltyp 1 und Status 2. Ein Derby steht bei uns als
         EINE Zeile (siehe `erg.derbys`) und waere unterzaehlt. Eine
         Abweichung ist deshalb eine FRAGE, kein Befund. */
      const { data: unsBestand, error: bFehler } = await db.from("ranglisten")
        .select("sfv_team_id, anzahl_spiele, stand_vom")
        .eq("verein_id", v.verein_id);
      if (bFehler) return json({ fehler: `ranglisten nicht lesbar: ${bFehler.message}` }, 500);
      const bestandJeTeam = new Map<number, { spiele: number | null; stand: string | null }>();
      for (const b of unsBestand ?? []) {
        const t = Number(b.sfv_team_id);
        if (Number.isFinite(t)) {
          bestandJeTeam.set(t, {
            spiele: b.anzahl_spiele === null ? null : Number(b.anzahl_spiele),
            stand: (b.stand_vom as string | null) ?? null,
          });
        }
      }

      /* ⚠ `error` LESEN. Eine leere Liste hier saehe aus wie „keine Spiele
         ausgetragen" und meldete jede Mannschaft als nachhinkend — ein
         Fehlalarm, der wie ein Befund aussieht. Genau so ist am 10.09.2026
         die Teamprobe danebengegangen. */
      const { data: gespielt, error: sFehler } = await db.from("spiele")
        .select("sfv_team_id, sfv_status")
        .eq("verein_id", v.verein_id).eq("sfv_spiel_typ", 1);
      if (sFehler) return json({ fehler: `spiele nicht lesbar: ${sFehler.message}` }, 500);
      const gespieltJeTeam = new Map<number, number>();
      /* Dieselbe Menge, aber Status 2 UND 3 — siehe unten. */
      const mitForfaitJeTeam = new Map<number, number>();
      /* ⚠ ⚠  DIE AUFSCHLUESSELUNG NACH STATUS, und sie ist der eigentliche
         Zusatz. `gespielt_laut_spielplan` zaehlt nur Status 2 — aber der
         Verband fuehrt ZWOELF, und mehrere davon zaehlen fuer seine Tabelle
         mit: 3 forfait, 4 „Null zu Null", 5 abgebrochen, 8/9 nicht gespielt.

         **Mein Zaehler unterzaehlt also systematisch**, sobald ein Spiel
         einen dieser Status traegt — und beim ersten echten Treffer der
         Gegenprobe (Juniorinnen C, 14.09.2026: Verband 3, Spielplan 2) ist
         genau das der erste Kandidat.

         ⚠ DER FILTER WIRD NICHT AUF EINE VERMUTUNG GEAENDERT. Ob Status 3
         fuer die Tabelle zaehlt, ist eine Annahme; die Aufschluesselung
         MISST es. Steht bei einer abweichenden Zeile `{"2":2,"3":1}`, ist
         die Frage beantwortet — steht dort `{"2":2}`, fehlt uns wirklich
         ein Spiel. */
      const statusJeTeam = new Map<number, Record<string, number>>();
      for (const g of gespielt ?? []) {
        const t = Number(g.sfv_team_id);
        if (!Number.isFinite(t)) continue;
        const st = String(g.sfv_status ?? "null");
        const bisher = statusJeTeam.get(t) ?? {};
        bisher[st] = (bisher[st] ?? 0) + 1;
        statusJeTeam.set(t, bisher);
        if (Number(g.sfv_status) === 2) {
          gespieltJeTeam.set(t, (gespieltJeTeam.get(t) ?? 0) + 1);
        }
        /* ⚠ ⚠  DIE ZWEITE ZAEHLUNG, UND SIE ERSETZT DIE ERSTE NICHT.
           Beim ersten Treffer der Gegenprobe (Juniorinnen C, 14.09.2026)
           ging 2× Status 2 + 1× Forfait genau auf die 3 des Verbands auf.
           **Das ist EINE Mannschaft.** Aus n=1 eine Regel zu machen ist
           derselbe Fehlschluss, der in dieser Woche dreimal passiert ist.

           Also wird nicht entschieden, sondern gezaehlt: beide Lesarten
           laufen nebeneinander, und `treffer_*` unten sagt nach JEDEM Lauf,
           welche ueber alle 21 Mannschaften aufgeht. Nach einem Lauf ist
           n=21, nach zehn n=210 — und die Frage beantwortet sich, statt
           entschieden zu werden. */
        if (Number(g.sfv_status) === 2 || Number(g.sfv_status) === 3) {
          mitForfaitJeTeam.set(t, (mitForfaitJeTeam.get(t) ?? 0) + 1);
        }
      }

      const eigene = unsere === null ? [] : roh
        .filter((r) => Number(r.clubNumber) === unsere)
        .map((r) => ({
          liga: String(r.leagueName ?? ""),
          gruppe: String(r.groupName ?? ""),
          team: String(r.teamName ?? ""),
          sfv_team_id: Number(r.teamId) || null,
          /* `null` heisst „der Verband nennt keine Zahl", `0` heisst „null
             Spiele". Die zwei duerfen nicht dieselbe Anzeige bekommen. */
          anzahl_spiele: Number.isFinite(Number(r.matches)) ? Number(r.matches) : null,
          punkte: Number.isFinite(Number(r.points)) ? Number(r.points) : null,
          /* ⚠ `undefined` kann hier nicht entstehen: fehlt die Mannschaft in
             unserem Bestand, ist es `null` — „wir haben dazu keine Zeile",
             was etwas anderes ist als „null Spiele". */
          bestand_spiele: bestandJeTeam.get(Number(r.teamId) || -1)?.spiele ?? null,
          bestand_stand_vom: bestandJeTeam.get(Number(r.teamId) || -1)?.stand ?? null,
          gespielt_laut_spielplan: gespieltJeTeam.get(Number(r.teamId) || -1) ?? 0,
          /* ⚠ Alle Status dieser Mannschaft, nicht nur der gezaehlte —
             sonst ist „2 statt 3" nicht aufzuloesen. */
          spielplan_nach_status: statusJeTeam.get(Number(r.teamId) || -1) ?? {},
          /* ⚠ Die zweite Lesart, nicht der Ersatz fuer die erste. */
          gespielt_mit_forfait: mitForfaitJeTeam.get(Number(r.teamId) || -1) ?? 0,
        }))
        .sort((a, b) => (a.anzahl_spiele ?? -1) - (b.anzahl_spiele ?? -1)
          || a.liga.localeCompare(b.liga));

      /* ⚠ Ueber die NUMMER, nicht den Namen — siehe die Begruendung an
         `teams_ohne_tabellenzeile`. Und namentlich, nicht nur gezaehlt: bei
         acht Mannschaften ohne Tabelle sucht sonst jemand 21 durch. */
      const inTabelle = new Set(roh.map((r) => Number(r.teamId)).filter(Number.isFinite));
      const teamsOhneZeile = teamsMitNummer
        .filter((t) => !inTabelle.has(t.id))
        .map((t) => `${t.name} (${t.id})`);

      return json({
        hinweis: "Leseprobe. Fragt den Verband, schreibt nichts.",
        saison: saison.id,
        gruppen_gesamt: gruppen.size,
        zeilen_gesamt: roh.length,
        /* ⚠ Immer da, auch als Null. Und die Bezugsgroesse steht daneben:
           „87" allein sagt nicht, ob das viel ist. */
        zeilen_ohne_gruppennummer: ohneGruppennummer,
        /* ⚠ Die Gegenprobe zur Gruppenzahl: Zeilen je Gruppe. Liegt der
           Wert weit ueber einer Tabellengroesse, kollabiert der Schluessel
           — genau so ist die dreiteilige erste Fassung aufgefallen. */
        zeilen_je_gruppe: gruppen.size > 0
          ? Math.round((roh.length / gruppen.size) * 10) / 10 : 0,
        /* ⚠ ⚠  DIE ZAHL, DIE DIE FRAGE ENTSCHEIDET. Liefert der Verband
           hier 0, fuehrt er den Stand nicht — dann bilden wir ihn korrekt
           ab, und die Luecke liegt bei ihm. Liefert er eine Zahl und bei
           uns steht 0, liegt es an uns. */
        /* ⚠ ⚠  DIESE ZAHL BEANTWORTET NICHT, OB WIR NACHHINKEN. Sie zaehlt
           Gruppen, in denen JEDE Mannschaft null Spiele hat — eine Aussage
           ueber den Verband, nicht ueber uns. Der Satz daneben steht
           deshalb IN der Antwort und nicht bloss hier im Kommentar: **eine
           Prüfung, die ihren eigenen Zuschnitt nennt, kann nicht für mehr
           genommen werden, als sie ist.** */
        gruppen_ohne_spiele: liste.filter((g) => g.zeilen === g.spiele_null).length,
        gruppen_ohne_spiele_heisst:
          "Gruppen, in denen JEDE Mannschaft null Spiele hat — sagt NICHTS darüber,"
          + " ob unsere eigene Zeile nachhinkt. Dafür ist eigene_ohne_spiele da.",
        /* ⚠ Die Bezugsgroesse gehoert in DIESELBE Zeile wie die Zahl.
           „0 ohne Spiele" laesst offen, ob alle Zeilen Spiele haben oder ob
           keine geprueft wurde. (Regel des Theme-Chats, 14.09.2026.) */
        eigene_zeilen_gesamt: eigene.length,
        eigene_ohne_spiele: eigene.filter((e) => e.anzahl_spiele === 0).length,
        eigene_ohne_zahl: eigene.filter((e) => e.anzahl_spiele === null).length,
        /* ⚠ ⚠  DIE ZWEI ZAHLEN, DIE DIE FRAGE VOM 14.09.2026 TRENNEN.
           Beide zaehlen dieselben Zeilen, aber gegen etwas Verschiedenes —
           und weil sie sich gegenseitig ausschliessen koennen, ist eine
           Kombination aus beiden selbst eine Auskunft:

           | bestand_hinkt | verband_hinkt | heisst |
           |---|---|---|
           | 0 | 0 | alles einig |
           | >0 | 0 | **unsere** Zwischenspeicherung ist alt — ein Sync genuegt |
           | 0 | >0 | der **Verband** rechnet seine Tabelle nicht nach |
           | >0 | >0 | beides, und dann zuerst unseres | */
        bestand_hinkt: eigene.filter((e) =>
          e.bestand_spiele !== null && e.anzahl_spiele !== null
          && e.bestand_spiele < e.anzahl_spiele).length,
        /* ⚠ ⚠  WELCHE LESART GEHT AUF? Zwei Zaehler ueber DIESELBEN Zeilen,
           und die Zahl, die naeher an `eigene_zeilen_gesamt` liegt, ist die
           richtige — ueber alle Mannschaften, nicht ueber eine.

           ⚠ Gezaehlt werden nur Zeilen, bei denen der Verband ueberhaupt eine
           Spielzahl nennt; `null` ist keine Uebereinstimmung und auch keine
           Abweichung. Eine Zeile ohne Zahl in eine der beiden Toepfe zu
           werfen hiesse, eine fehlende Angabe als Beleg zu zaehlen.

           ⚠ UND DER FILTER WIRD DAVON NICHT ANGEFASST. Diese Zahlen sind die
           Messung, nicht die Entscheidung. Sie gehoert Didi, und sie faellt,
           wenn die Reihe ueber mehrere Laeufe eindeutig ist. */
        treffer_nur_status2: eigene.filter((e) =>
          e.anzahl_spiele !== null && e.anzahl_spiele === e.gespielt_laut_spielplan).length,
        treffer_mit_forfait: eigene.filter((e) =>
          e.anzahl_spiele !== null && e.anzahl_spiele === e.gespielt_mit_forfait).length,
        treffer_grundmenge: eigene.filter((e) => e.anzahl_spiele !== null).length,
        /* ⚠ ⚠  DIE UNTERSCHEIDENDE MENGE — und sie ist die einzige, die
           etwas beitraegt. Eine Mannschaft ohne Forfait erfuellt BEIDE
           Lesarten; sie geht in `treffer_*` ein und kann nichts trennen.
           „21 von 21" liest sich wie eine grosse Stichprobe und ist
           groesstenteils Rauschen.

           **Unterscheidend ist eine Zeile nur, wenn die zwei Zaehlungen
           verschieden sind** — also wenn die Mannschaft mindestens ein
           Forfait hat. Am 14.09.2026 war das genau EINE von 21.

           ⚠ UND SIE WERDEN NAMENTLICH GENANNT, nicht nur gezaehlt. Ueber
           mehrere Laeufe ist dieselbe Mannschaft dieselbe Beobachtung —
           zehn Abrufe desselben Forfaits sind n=1, nicht n=10. Nur die
           NAMEN sagen, ob eine neue dazugekommen ist. */
        entscheidend: eigene
          .filter((e) => e.anzahl_spiele !== null
            && e.gespielt_laut_spielplan !== e.gespielt_mit_forfait)
          .map((e) => ({
            team: e.team,
            verband: e.anzahl_spiele,
            eng: e.gespielt_laut_spielplan,
            weit: e.gespielt_mit_forfait,
            /* Welche Lesart trifft — oder keine, und das waere der Befund. */
            passt: e.anzahl_spiele === e.gespielt_mit_forfait ? "weit"
              : e.anzahl_spiele === e.gespielt_laut_spielplan ? "eng" : "keine",
          })),
        verband_hinkt: eigene.filter((e) =>
          e.anzahl_spiele !== null && e.anzahl_spiele < e.gespielt_laut_spielplan).length,
        /* ⚠ Was der Vergleich NICHT weiss, steht IN der Antwort. Eine
           Pruefung, die ihren Zuschnitt nennt, kann nicht fuer mehr genommen
           werden, als sie ist. */
        vergleich_naeherung:
          "`gespielt_laut_spielplan` zählt NUR Status 2 (ausgetragen) und"
          + " Spieltyp 1. Der Verband führt zwölf Status, und mehrere zählen"
          + " für seine Tabelle mit — 3 forfait, 4 Null-zu-Null, 5 abgebrochen,"
          + " 8/9 nicht gespielt. Steht die Zeile höher als unser Zähler, sagt"
          + " `spielplan_nach_status`, ob es daran liegt. Dazu: ein Derby steht"
          + " bei uns als EINE Zeile und wäre unterzählt. Eine Abweichung ist"
          + " eine Frage, kein Befund.",
        /* ⚠ ⚠  DIE VOLLSTAENDIGKEIT DER LIEFERUNG — die Regel, die Didi dem
           Theme-Chat zugesagt hat.

           Gefragt: kommt zu JEDER Mannschaft, die wir kennen, eine
           Tabellenzeile? Eine Gruppe, die der Verband nicht mehr liefert,
           faellt im Sync heraus (`nicht_mehr_geliefert`) — und auf der
           Website bliebe eine Tabelle stehen oder verschwaende, ohne dass
           etwas fehlschlaegt.

           ⚠ Verglichen wird ueber `sfv_team_id`, NIE ueber den Namen. Die
           Verbandsseite und ClubCampus benennen dieselbe Mannschaft
           verschieden — am 10.09.2026 ergab ein Namensvergleich 13 fehlende
           statt 8, und fuenf davon waren Schreibweisen. */
        /* ⚠ ⚠  WAR DER BLOCK UEBERSPRUNGEN? Drei Felder, und `null` heisst
           bei allen dreien „nicht feststellbar", nicht „0". */
        ranglisten_stand_vom: neuesterStand?.stand_vom ?? null,
        letzter_ok_lauf: letzterOk?.beendet_am ?? null,
        ranglisten_rueckstand_minuten: rueckstandMinuten,
        teams_ohne_tabellenzeile: teamsOhneZeile,
        teams_mit_nummer_gesamt: teamsMitNummer.length,
        /* ⚠ `null` heisst NICHT GEMESSEN: ohne `vereine.sfv_club_nummer`
           kann diese Probe unsere Zeilen gar nicht finden, und dann waere
           „0 ohne Spiele" die glatte Luege. */
        eigene_erkennbar: unsere !== null,
        eigene: eigene,
        /* ⚠ Alle Gruppen, nicht nur die auffaelligen: eine Liste, die nur
           Befunde zeigt, laesst offen, ob ueberhaupt gemessen wurde. */
        gruppen: liste,
      });
    } catch (e) {
      /* ⚠ Gebunden und benannt. Ein leerer catch machte aus dem Ausfall
         eine Datenlage — „der Verband fuehrt keine Tabelle" saehe dann
         aus wie „der Abruf ist gescheitert". */
      return json({ fehler: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     nummernprobe — antwortet die Schnittstelle auf eine Mannschaftsnummer,
     die sie von sich aus nicht nennt?

     ⚠ ⚠  ANLASS, 14.09.2026. Didi hat die Teamseite einer Turniermannschaft
     beim Verband aufgerufen: `t=38315`, dieselbe Vereinskennung 1516. **Die
     Mannschaften ohne Rangliste HABEN also eine Teamnummer**, und sie liegt
     im selben Bereich wie unsere (38301–38312) — kein anderer Nummernkreis,
     sie steht schlicht nicht in der Liste.

     > **Eine Liste, die eine Mannschaft nicht nennt, muss sie nicht
     > ablehnen.** Das sind zwei verschiedene Dinge, und gemessen war bisher
     > nur das erste.

     ⚠ DREI PFADE NEHMEN EINE `TeamId` ENTGEGEN — und wir setzen sie bei
     keinem: `/api/team/list`, `/api/club/schedule`, `/api/club/ranking`.
     Dazu `/api/team/picture/{teamId}` im Pfad. Ein Filter, den niemand
     setzt, kann etwas ausschliessen; einer, den man setzen muesste, etwas
     einschliessen.

     ⚠ SIE WIRFT NICHT. Ein 404 ist hier eine Antwort und kein Fehler — und
     ein Wurf haette nur die ersten Pfade gemessen. Jeder Pfad bekommt eine
     Zeile, auch der, der nichts liefert.

     ⚠ UND DER SUCHRAUM WIRD GENANNT. „Fuenfzehn Pfade geprueft, vier nehmen
     eine Nummer, einer antwortet" ist ein Befund; „nichts gefunden" waere
     keiner.
     ══════════════════════════════════════════════════════════════════════ */
  if (aktion === "nummernprobe") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    /* ⚠ Die Nummer kommt aus dem Aufruf, mit 38315 als Vorgabe — damit ist
       die Probe fuer JEDE Nummer brauchbar und nicht nur fuer diese eine. */
    const nummer = teamNummer ?? 38315;
    if (!Number.isFinite(nummer) || nummer <= 0) {
      return json({ fehler: "team muss eine positive Zahl sein" }, 400);
    }
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());
      const basis = `SeasonId=${saison.id}&ClubId=${zugang.clubId}&Language=1`;

      /* ⚠ Streng seriell mit DEMSELBEN Token: die SFV-API kennt je Anwendung
         genau ein gueltiges — parallel liefe einer dem anderen davon. */
      /* ⚠ ⚠  WAS DER WEG BEANTWORTEN SOLL — je Weg mitgefuehrt, nicht
         hinterher erschlossen. Am 14.09.2026 zaehlte `wege_mit_daten` jede
         Antwort, die kein Fehler war: darunter die UNVERAENDERTE Teamliste
         (21 Eintraege, der Parameter wurde ignoriert) und ein BILD. Die
         Schlusszeile meldete „2 Wege antworten mit Daten — das loest das
         Problem", waehrend jede Zeile darueber das Gegenteil sagte.

         > Eine Zusammenfassung, die dem Detail darunter widerspricht, wird
         > zuerst gelesen — und sie ist gefaehrlicher als gar keine.

         Die Frage war nie „antwortet der Endpunkt?", sondern **„liefert er
         Spielplanzeilen fuer DIESE Mannschaft?"**. Dieselbe Form wie
         `gruppen_ohne_spiele` und `nicht_in_teamliste`: die Zahl misst
         genau, was sie sagt, und die Frage dahinter war eine andere. */
      const versuche: Array<Record<string, unknown>> = [];
      const pfade: Array<[string, string]> = [
        ["team/list mit TeamId", `/api/team/list?${basis}&TeamId=${nummer}`],
        ["club/schedule mit TeamId", `/api/club/schedule?${basis}&TeamId=${nummer}`],
        ["club/ranking mit TeamId", `/api/club/ranking?${basis}&TeamId=${nummer}`],
        ["team/picture", `/api/team/picture/${nummer}`],
        /* ⚠ ⚠  DER SPIELPLAN JE SPIELTYP — und diese Luecke ist alt.
           `teamprobe` fragt seit dem 10.09.2026 die TEAMLISTE je MatchType
           (1, 6, 8). Den SPIELPLAN je MatchType hat nie jemand gefragt.

           Die Stammdaten fuehren 6 „Turnier" und 8 „Mini-Turniere"; das
           Datenmodell des Verbands kennt sie also. In `Schedule` gibt es
           aber nur zwei Mannschaftsplaetze — ein Turnier mit vier Teams
           passt nicht hinein, es sei denn, er loest es in Paarungen auf.
           Diese zwei Aufrufe sagen, ob er das tut. */
        ["club/schedule MatchType 6 (Turnier)", `/api/club/schedule?${basis}&MatchType=6`],
        ["club/schedule MatchType 8 (Mini)", `/api/club/schedule?${basis}&MatchType=8`],
        /* ⚠ Und derselbe Typ mit der Nummer zusammen — falls der Filter nur
           in Kombination greift. */
        ["club/schedule Typ 6 + TeamId", `/api/club/schedule?${basis}&MatchType=6&TeamId=${nummer}`],
        /* ⚠ ⚠  GIBT ES EIN VORGABE-ZEITFENSTER? Die gefaehrlichste der zehn
           ungenutzten Filter-Fragen, und niemand hat sie gestellt.

           `/api/club/schedule` nimmt dreizehn Parameter; wir setzen drei.
           Ein Filter, den man NICHT setzt, bedeutet normalerweise „nicht
           filtern" — aber `DateFrom`/`DateUntil` koennten eine VORGABE
           haben. Dann faehrt jeder Lauf gegen ein Fenster, das niemand
           gewaehlt hat, und aeltere oder spaetere Spiele fehlen still.

           Dieser Aufruf spannt das Fenster ueber die ganze Saison. Kommen
           mehr als die 270 zurueck, gibt es eine Vorgabe — und das waere
           ein Befund weit ueber die Turnierfrage hinaus. */
        ["club/schedule ganze Saison (Datumsfenster)",
          `/api/club/schedule?${basis}&DateFrom=2026-07-01&DateUntil=2027-06-30`],
      ];
      /* Die Laenge der UNGEFILTERTEN Teamliste — gegen sie wird geprueft,
         ob ein `TeamId`-Parameter ueberhaupt gewirkt hat. */
      const listeRoh = await holeTeamsRoh(zugang, token, saison.id);
      const inListe = listeRoh.some((t) => Number(t.teamId) === nummer);

      for (const [name, pfad] of pfade) {
        const r = await versucheRoh(zugang, token, pfad);
        const liste = Array.isArray(r.roh) ? r.roh as Record<string, unknown>[] : null;
        /* ⚠ NENNT DIE ANTWORT DIE GESUCHTE NUMMER? Ein Endpunkt, der auf
           `TeamId=38315` die unveraenderte Liste zurueckgibt, hat den
           Parameter IGNORIERT — und „21 Eintraege" ist dann keine Auskunft
           ueber 38315, sondern ueber niemanden. */
        const nenntNummer = liste !== null && liste.some((o) =>
          Number(o.teamId) === nummer || Number(o.teamAId) === nummer
          || Number(o.teamBId) === nummer);
        /* ⚠ Der Verdacht „Parameter ignoriert" wird BENANNT, nicht
           stillschweigend als Fehlschlag gewertet. Er ist selbst ein
           Befund ueber die Schnittstelle. */
        const ignoriert = liste !== null && liste.length === listeRoh.length
          && !nenntNummer && pfad.includes("TeamId=");
        versuche.push({
          weg: name, pfad: r.pfad, status: r.status, ausgang: r.ausgang,
          nennt_gesuchte_nummer: liste === null ? null : nenntNummer,
          parameter_offenbar_ignoriert: ignoriert,
          /* ⚠ Nur `Schedule`-Zeilen sind ein Spielplan. Ein Bild ist keiner,
             eine Teamliste auch nicht — und genau das hat die alte Zahl
             zusammengeworfen. */
          traegt_spielplanzeilen: liste !== null && nenntNummer
            && liste.some((o) => o.matchId !== undefined),
          /* ⚠ Nur Feldnamen, nie Werte — dieselbe Regel wie in
             `rohschluessel`. Eine Antwort mit Daten ist der Befund; WAS
             darin steht, ist die naechste Frage und nicht diese. */
          schluessel: r.roh === undefined ? null : schluesselVon(r.roh),
        });
      }

      /* ══ DIE ZWEI GRUNDMESSUNGEN, die den Befund kippen koennen ══════════
         ⚠ Steht die Nummer im ROHEN Spielplan, ist es ein FILTERproblem und
         der Befund von heute Abend faellt. Steht sie nicht in der Teamliste
         und nicht im Spielplan, bleibt es ein Quellenproblem — aber die
         gezielte Abfrage oben kann es trotzdem aufloesen. */
      const planRoh = await holeSpielplan(zugang, token, saison.id);
      const imPlan = planRoh.filter((r) => {
        const o = r as Record<string, unknown>;
        return Number(o.teamAId) === nummer || Number(o.teamBId) === nummer;
      });

      return json({
        hinweis: "Leseprobe. Fragt den Verband, schreibt nichts.",
        gesucht: nummer,
        saison: { id: saison.id, name: saison.name },
        /* ⚠ DER SUCHRAUM, damit „nichts gefunden" nicht mit „nicht gesucht"
           verwechselt wird. */
        suchraum: {
          pfade_in_der_spezifikation: 15,
          /* ⚠ Drei nehmen eine `TeamId` als Filter (`team/list`,
             `club/schedule`, `club/ranking`), einer im Pfad
             (`team/picture`). Die uebrigen elf nehmen entweder eine
             MATCH-Nummer oder eine KLUB-Nummer — keine Mannschaft. */
          pfade_mit_teamnummer: 4,
          versuche_gesamt: pfade.length,
          begriffe_geprueft:
            "tournament 0x, turnier 0x, junior 0x, training 0x, festival 0x, "
            + "mini 0x — die Spezifikation kennt keinen Turnierbegriff "
            + "(19 Schemata, am 14.09.2026 gemessen)",
          pfade_versucht: versuche.length,
        },
        steht_in_teamliste: inListe,
        teamliste_gesamt: listeRoh.length,
        zeilen_im_rohen_spielplan: imPlan.length,
        spielplan_gesamt: planRoh.length,
        /* ⚠ ⚠  Die Gegenprobe zum Zeitfenster: liefert der Aufruf MIT
           ausdruecklichem Datumsbereich mehr Zeilen als der ohne, hat der
           Endpunkt eine Vorgabe, die wir nie gewaehlt haben. */
        spielplan_mit_datumsfenster: (() => {
          const v = versuche.find((x) => String(x.weg ?? "").includes("Datumsfenster"));
          const a = String(v?.ausgang ?? "");
          const m = /^(\d+) Eintrag/.exec(a);
          return m ? Number(m[1]) : null;
        })(),
        versuche,
        /* ⚠ ⚠  DIE EINE ZAHL, UND SIE ZAEHLT JETZT, WAS SIE MEINT.
           Vorher hiess sie `wege_mit_daten` und zaehlte jede Antwort, die
           kein Fehler war — darunter die unveraenderte Teamliste und ein
           Bild. Die Frage war nie „antwortet der Endpunkt?". */
        wege_mit_spielplanzeilen: versuche.filter((x) => x.traegt_spielplanzeilen).length,
        /* ⚠ Getrennt gezaehlt, weil es eine ANDERE Auskunft ist: ein
           Endpunkt, der die Nummer ueberhaupt kennt, ohne einen Spielplan
           zu liefern. `team/picture/38315` antwortet mit einem Bild — das
           belegt, dass die Nummer beim Verband existiert, und sonst
           nichts. */
        wege_die_die_nummer_kennen: versuche.filter((x) =>
          x.nennt_gesuchte_nummer === true
          || (x.weg === "team/picture" && typeof x.ausgang === "string"
              && !x.ausgang.startsWith("HTTP"))).length,
        /* ⚠ Und wie oft ein Filter offenbar wirkungslos blieb — selbst ein
           Befund ueber die Schnittstelle, nicht bloss ein Fehlschlag. */
        wege_mit_ignoriertem_parameter: versuche.filter((x) =>
          x.parameter_offenbar_ignoriert).length,
      });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  if (aktion === "teamprobe") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);
    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const saison = await holeSaison(zugang, token, new Date());

      const nummern = (liste: Record<string, unknown>[]) =>
        new Set(liste.map((t) => Number(t.teamId)).filter((n) => Number.isFinite(n)));

      const ohneFilter = await holeTeamsRoh(zugang, token, saison.id);
      const basis = nummern(ohneFilter);

      /* ⚠ ⚠  DIE DREI MENGEN NEBENEINANDER — sie werden sonst aus drei
         Quellen zitiert und treiben auseinander. Am 14.09.2026 standen im
         Gespraech „21 von 21", „21 von 34" und „31 Teamseiten, davon 21 mit
         Nummer" nebeneinander, und keiner wusste mehr, welche 21 gemeint
         war.

         **Eine Zahl, die man nicht selbst gemessen hat, wird mit ihrer
         Quelle zitiert — oder gar nicht.** Hier kommen alle drei aus
         DEMSELBEN Lauf, und damit ist die Frage „sind es dieselben?"
         beantwortbar statt vermutbar.

         ⚠ `error` gelesen: eine leere Liste saehe aus wie „keine
         Mannschaften" und machte jede folgende Zahl zur Behauptung. */
      const { data: teamZeilen, error: tFehler } = await db.from("teams")
        .select("name, sfv_team_id, aktiv").eq("verein_id", v.verein_id);
      if (tFehler) return json({ fehler: `teams nicht lesbar: ${tFehler.message}` }, 500);
      const alleTeams = teamZeilen ?? [];
      const mitNummer = alleTeams.filter((t) => t.sfv_team_id != null);
      const nummernBeiUns = new Set(mitNummer.map((t) => Number(t.sfv_team_id)));

      const mengen = {
        teams_tabelle_gesamt: alleTeams.length,
        /* ⚠ `aktiv` getrennt: eine ausgelaufene Mannschaft ohne Nummer ist
           kein Befund, eine aktive schon. */
        teams_tabelle_aktiv: alleTeams.filter((t) => t.aktiv !== false).length,
        teams_mit_sfv_nummer: mitNummer.length,
        teams_ohne_sfv_nummer: alleTeams.length - mitNummer.length,
        /* Namentlich — genau die koennen keinen Spielplan haben, weil
           `bildeSpiel()` ueber die Nummer filtert. */
        ohne_nummer_namen: alleTeams
          .filter((t) => t.sfv_team_id == null)
          .map((t) => String(t.name ?? "")),
        teamliste_des_verbands: basis.size,
        /* ⚠ Die Schnittmenge sagt, ob es DIESELBEN sind — zwei gleich
           grosse Mengen sind nicht dieselbe Menge. */
        unsere_nummern_die_die_liste_kennt:
          [...nummernBeiUns].filter((n) => basis.has(n)).length,
        unsere_nummern_die_die_liste_NICHT_kennt:
          [...nummernBeiUns].filter((n) => !basis.has(n)).length,
      };

      /* ⚠ Je Spieltyp EIN Aufruf. Scheitert einer, wird er als Fehler
         ausgewiesen — nicht als leere Liste. Ein Endpunkt, der nichts
         liefert, muss von einem unterschieden werden, der nicht gefragt
         wurde; genau diese Verwechslung hat am 10.09.2026 die Suche in
         die falsche Richtung geschickt. */
      const jeSpieltyp: Record<string, unknown> = {};
      for (const [name, typ] of [["meisterschaft", 1], ["turnier", 6], ["mini_turniere", 8]] as const) {
        try {
          const l = await holeTeamsRoh(zugang, token, saison.id, { MatchType: typ });
          const s = nummern(l);
          jeSpieltyp[name] = {
            gefragt: true, anzahl: s.size,
            zusaetzlich: [...s].filter((n) => !basis.has(n)),
          };
        } catch (e) {
          jeSpieltyp[name] = {
            gefragt: true, gescheitert: e instanceof Error ? e.message : String(e),
          };
        }
      }

      /* B — der Spielplan fuehrt beide Mannschaften je Spiel. */
      let ausSpielplan: Record<string, unknown>;
      try {
        const spiele = await holeSpielplan(zugang, token, saison.id);
        const imPlan = new Set<number>();
        for (const s of spiele) {
          for (const k of ["teamAId", "teamBId"]) {
            const n = Number((s as Record<string, unknown>)[k]);
            if (Number.isFinite(n)) imPlan.add(n);
          }
        }
        /* ⚠ ⚠  JE SPIELTYP, UND MIT EINEM DISKRIMINATOR OHNE NAMEN.
           14.09.2026, Frage: kommen die Turniere der Junioren E ueberhaupt
           an? Elf von einundzwanzig Mannschaften spielen in Turnierform.

           `nicht_in_teamliste` darunter ist fuer diese Frage STUMPF: unter
           den unbekannten Nummern steht jeder Gegner, und das sind
           hunderte. **Eine Zahl, die die gesuchte Menge nicht von einer
           viel groesseren trennt, beantwortet die Frage nicht** — dieselbe
           Form wie `gruppen_ohne_spiele`.

           ⚠ DER DISKRIMINATOR: `/api/club/schedule` ist ein KLUB-Spielplan
           (`ClubId` im Aufruf). In jeder Zeile ist damit eine Seite unsere.
           Ist KEINE der beiden Nummern in der Teamliste, dann ist unsere
           eigene Mannschaft eine, die die Liste nicht kennt — also genau
           eine ohne Rangliste. Kein Namensvergleich noetig; am 10.09.2026
           ergab ein Namensvergleich 13 statt 8, und fuenf davon waren
           Schreibweisen.

           ⚠ DIE PRAEMISSE IST EINE ANNAHME, und sie wird mitgeliefert:
           `beide_bekannt + eine_bekannt + keine_bekannt === zeilen`. Ist
           `eine_bekannt` nicht die grosse Mehrheit, stimmt die Praemisse
           nicht, und `keine_bekannt` bedeutet etwas anderes.

           ⚠ UND `keine_bekannt` IST GENAU DIE MENGE, DIE `bildeSpiel()`
           VERWIRFT (`if (!aIstUns && !bIstUns) return null`). Steht dort
           bei Typ 6 oder 8 eine Zahl, kommen die Turniere an und wir werfen
           sie weg — ein FILTERproblem. Steht ueberall 0, liefert der Verband
           sie nicht — ein QUELLENproblem. Davon haengt alles Weitere ab. */
        const jeTyp = new Map<string, {
          typ: number | null; name: string; zeilen: number;
          beide_bekannt: number; eine_bekannt: number; keine_bekannt: number;
          beispiele: string[];
        }>();
        for (const r of spiele) {
          const o = r as Record<string, unknown>;
          const k = String(o.matchType ?? "null");
          const g = jeTyp.get(k) ?? {
            typ: Number.isFinite(Number(o.matchType)) ? Number(o.matchType) : null,
            name: String(o.matchTypeName ?? ""), zeilen: 0,
            beide_bekannt: 0, eine_bekannt: 0, keine_bekannt: 0, beispiele: [],
          };
          g.zeilen += 1;
          const a = basis.has(Number(o.teamAId)), b = basis.has(Number(o.teamBId));
          if (a && b) g.beide_bekannt += 1;
          else if (a || b) g.eine_bekannt += 1;
          else {
            g.keine_bekannt += 1;
            /* ⚠ Hoechstens drei, und die Namen stehen NUR hier — als
               Anhaltspunkt fuer einen Menschen, nicht als Vergleichsmerkmal.
               Ohne sie waere „7 Zeilen" nicht nachzusehen. */
            if (g.beispiele.length < 3) {
              g.beispiele.push(`${String(o.teamNameA ?? "?")} (${Number(o.teamAId)})`
                + ` vs ${String(o.teamNameB ?? "?")} (${Number(o.teamBId)})`
                + ` am ${String(o.matchDate ?? "?").slice(0, 10)}`);
            }
          }
          jeTyp.set(k, g);
        }

        ausSpielplan = {
          gefragt: true, spiele: spiele.length, teamnummern_im_plan: imPlan.size,
          /* ⚠ Darunter sind auch GEGNER. Die Zahl allein beweist nichts —
             sie zeigt nur, ob im Spielplan Nummern stehen, die die
             Teamliste nicht kennt. */
          nicht_in_teamliste: [...imPlan].filter((n) => !basis.has(n)).length,
          /* ⚠ `zeilen_je_spieltyp`, NICHT `je_spieltyp` — das gibt es in
             derselben Antwort schon eine Ebene hoeher und meint die
             TEAMLISTE je Spieltyp. Zwei Felder gleichen Namens mit
             verschiedener Bedeutung sind die Falle, die dieses Papier an
             einem Dutzend Stellen fuehrt. */
          zeilen_je_spieltyp: [...jeTyp.values()].sort((x, y) => y.zeilen - x.zeilen),
          /* ⚠ Die eine Zahl, die die Frage entscheidet — ueber alle Typen. */
          zeilen_ohne_bekannte_mannschaft:
            [...jeTyp.values()].reduce((n, g) => n + g.keine_bekannt, 0),
          aufteilung_stimmt: [...jeTyp.values()].every((g) =>
            g.beide_bekannt + g.eine_bekannt + g.keine_bekannt === g.zeilen),
        };
      } catch (e) {
        ausSpielplan = { gefragt: true, gescheitert: e instanceof Error ? e.message : String(e) };
      }

      return json({
        hinweis: "Messung. Schreibt nichts, protokolliert nichts.",
        saison,
        mengen,
        ohne_filter: {
          anzahl: basis.size,
          teams: ohneFilter.map((t) => ({
            teamId: t.teamId, name: t.teamName, liga: t.teamLeagueName,
            ligaId: t.teamLeagueId, aktiv: t.isTeamActive,
          })),
        },
        je_spieltyp: jeSpieltyp,
        aus_spielplan: ausSpielplan,
      });
    } catch (e) {
      return json({ fehler: e instanceof Error ? e.message : "SFV-Abfrage fehlgeschlagen" }, 502);
    }
  }

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

  /* ── Aktion namen: Klarnamen der offenen Spieler nachtragen ──────────
     Liest, schreibt nichts. Beansprucht trotzdem die Laufsperre — nicht
     wegen der Daten, sondern wegen des TOKENS: die SFV-API kennt pro
     Anwendung genau ein gueltiges, und ein gleichzeitiger Sync wuerde
     unseres mitten in den Abrufen entwerten.

     ⚠ NEBENWIRKUNG, die spaeter wie ein Fehler aussieht: solange diese
     Aktion laeuft, ueberspringt der stuendliche Lauf sich selbst mit „Ein
     Lauf ist bereits unterwegs" und holt eine Stunde spaeter nach. Das ist
     der richtige Tausch — ein ausgefallener Lauf ist harmlos, ein
     entwertetes Token nicht. */
  if (aktion === "namen") {
    const v = eigene[0];
    if (!v.api_url) return json({ fehler: "api_verbindungen.api_url fehlt" }, 400);

    const grenzeN = new Date(Date.now() - SPERRE_MINUTEN * 60_000).toISOString();
    const { data: beanspruchtN } = await db
      .from("api_verbindungen")
      .update({ sync_laeuft_seit: new Date().toISOString() })
      .eq("id", v.id)
      .or(`sync_laeuft_seit.is.null,sync_laeuft_seit.lt.${grenzeN}`)
      .select("id");
    if (!beanspruchtN?.length) {
      return json({ fehler: "Ein Lauf ist bereits unterwegs — bitte in einer Minute erneut." }, 409);
    }

    /* ⚠ ⚠  DIE ZEILE ZUERST, NICHT ZULETZT (10.09.2026).
       Bis dahin schrieb diese Aktion EINEN insert am Ende. Wirft sie
       vorher — und sie ruft die SFV-API —, stand nichts da, und
       „gescheitert" sah aus wie „nichts zu tun". Der Sync machte es
       schon richtig; die zwei waren ohne Grund verschieden.

       `aktion` steht dabei: eine Zeile mit `status: ok` und ohne
       `details.spiele` war bisher nicht deutbar — war es ein Lauf ohne
       Spiele, oder einer, der welche suchte und keine fand? */
    const { data: logZeile } = await db.from("api_sync_log").insert({
      verbindung_id: v.id, verein_id: v.verein_id, aktion: AKTION_NAMEN,
      status: LAUF_LAEUFT, gestartet_am: new Date().toISOString(),
    }).select("id").single();

    try {
      const zugang = zugangFuer(v.api_url);
      const token = await holeToken(zugang);
      const { data: verein } = await db.from("vereine")
        .select("sfv_club_nummer").eq("id", v.verein_id).maybeSingle();
      const erg = await laufeNamen(
        db, v as never, zugang, token,
        (verein?.sfv_club_nummer as number | null) ?? null,
      );

      /* ⚠ EIGENE ALLOWLIST, nicht `fuersProtokoll()`. Es ist ein anderes
         Objekt, und genau diese Verwechslung hat am 21.08.2026 903
         Klarnamen ins Protokoll geschrieben. Hier stehen drei Zahlen. */
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(),
          status: erg.fehler ? "warnung" : "ok",
          meldung: `Namen nachgetragen: ${erg.namen_gefunden} von ${erg.offen_gesamt} offenen Spielern aus ${erg.spiele_abgefragt} Spiel(en)`,
          details: namenFuersProtokoll(erg),
        }).eq("id", logZeile.id);
      }

      /* ⚠ `letzter_sync` und `sync_meldung` bleiben unberuehrt. Das ist kein
         Sync; die Kachel duerfte danach nicht behaupten, sie haette Daten
         geholt. */
      protokoll(`namen/${v.verein_id}`, `${erg.spiele_abgefragt} Spiel(e), ${erg.namen_gefunden} Name(n), ${erg.fehler} Fehler`);
      return json({
        namen: erg.namen,
        spiele_abgefragt: erg.spiele_abgefragt,
        namen_gefunden: erg.namen_gefunden,
        offen_gesamt: erg.offen_gesamt,
        fehler: erg.fehler,
        /* ⚠ Die Zahl gehoert in die ANTWORT, nicht nur ins Protokoll: sie
           beantwortet die ungemessene Form von `birthDate`, und wer den Lauf
           ausloest, ist der, der sie sehen muss. */
        jahrgang_unlesbar: erg.jahrgang_unlesbar,
      });
    } catch (e) {
      const meldung = protokollFehler(`namen/${v.verein_id}`, e);
      /* ⚠ DIESELBE Zeile auf `fehler`, nicht eine zweite. Zwei Zeilen je
         Lauf liessen sich auseinanderlesen, ein unvollstaendiger Lauf
         nicht — dieselbe Entscheidung wie beim Loeschprotokoll. */
      if (logZeile) {
        await db.from("api_sync_log").update({
          beendet_am: new Date().toISOString(), status: LAUF_FEHLER,
          meldung, datensaetze_fehler: 1,
        }).eq("id", logZeile.id);
      }
      return json({ fehler: meldung }, 502);
    } finally {
      await db.from("api_verbindungen").update({ sync_laeuft_seit: null }).eq("id", v.id);
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
      verbindung_id: v.id, verein_id: v.verein_id, aktion: AKTION_SYNC,
      status: LAUF_LAEUFT, gestartet_am: new Date().toISOString(),
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
          beendet_am: new Date().toISOString(), status: LAUF_FEHLER, meldung, datensaetze_fehler: 1,
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
