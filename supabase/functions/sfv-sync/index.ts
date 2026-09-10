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
import { schluesselVon, suchtBildfeld } from "../../../src/domains/sfv/rohschluessel.ts";
import {
  LAUF_LAEUFT, LAUF_FEHLER, AKTION_SYNC, AKTION_NAMEN, AKTION_WECHSELNACHTRAG,
} from "../../../src/domains/sfv/protokollStatus.ts";
import { bildeEreignis } from "./matchdaten.ts";
import {
  holeToken, holeSaison, holeTeams, holeTeamsRoh, holeSpielplan, holeEreignisse,
  holeBank,
} from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import { laufeSync, bildeSpiel } from "./sync.ts";
import { schneideAufFeldhoheit } from "../../../src/domains/sfv/feldhoheit.ts";
import { fuersProtokoll, fuerZeitplanAntwort } from "./ergebnisTypen.ts";
import { laufeNamen, namenFuersProtokoll } from "./namenLauf.ts";
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
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
    nur = body?.nur ? String(body.nur) : null;
  } catch {
    return json({ fehler: "Ungültiger Aufruf" }, 400);
  }
  /* ⚠ Die gueltigen Aktionen aufgezaehlt, damit die Meldung sie nennen
     kann — dieselbe Regel wie in wp-export. */
  const AKTIONEN = [
  "teams", "sync", "namen", "teamprobe", "wechselprobe", "wechselnachtrag", "cupprobe",
  "rohschluessel", "vertragsprobe",
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
        ausSpielplan = {
          gefragt: true, spiele: spiele.length, teamnummern_im_plan: imPlan.size,
          /* ⚠ Darunter sind auch GEGNER. Die Zahl allein beweist nichts —
             sie zeigt nur, ob im Spielplan Nummern stehen, die die
             Teamliste nicht kennt. */
          nicht_in_teamliste: [...imPlan].filter((n) => !basis.has(n)).length,
        };
      } catch (e) {
        ausSpielplan = { gefragt: true, gescheitert: e instanceof Error ? e.message : String(e) };
      }

      return json({
        hinweis: "Messung. Schreibt nichts, protokolliert nichts.",
        saison,
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
