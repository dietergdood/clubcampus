// ClubCampus — supabase/functions/wp-export/index.ts
//
// Der Export nach WordPress. Laeuft auf dem Server, weil der Zugang zur
// Website nirgends in den Browser darf.
//
// AKTIONEN
//   probe    Liest alles und gibt zurueck, WAS GESENDET WUERDE. Schickt
//            nichts. Schreibt keine Zeile, weder hier noch dort.
//   export   Schickt, was die Probe zeigen wuerde. Schreibt in WordPress
//            und protokolliert in api_sync_log. Seit dem 09.09.2026
//            (Etappe 5) ALLE Mannschaften; `nur_team` schraenkt auf eine
//            ein, ist aber nicht mehr Pflicht. EIN POST JE MANNSCHAFT —
//            der Grund steht bei sendeAnWordpress(). Ganz zuletzt gehen
//            die Ranglisten hinaus, und nur fuer Mannschaften, deren
//            Spiele angekommen sind.
//   ranglisten  Nur die Tabellen, ohne Spiele-Lauf. Zum Pruefen.
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
//   WP_SCHLUESSEL  ⚠ DERSELBE WERT wie FCH_CLUBCAMPUS_SCHLUESSEL in der
//                  wp-config.php der Website. Der Empfaenger vergleicht ihn
//                  zeitkonstant (hash_equals) gegen den Kopf X-FCH-Schluessel.
//
//   ⚠ WP_BENUTZER und WP_APP_PASSWORT sind am 09.09.2026 entfallen. Sie
//     trugen eine Anmeldung als BENUTZER, und die beantwortete die falsche
//     Frage: `edit_posts` heisst „darf dieser Mensch Beitraege bearbeiten",
//     gefragt ist „kommt das von ClubCampus". Damit konnte jeder angemeldete
//     Redakteur Resultate und Ranglisten schreiben. Der Kopfname ist ein
//     Vertrag — wer ihn hier aendert, aendert ihn drueben mit.
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
import {
  bildeSpiel, zaehleVerlaufNamen, hatDoppelabstand,
  baueAufstellung, leereAufstellungZahlen, sammleMarken,
} from "../../../src/domains/spiele/wpNutzlast.ts";
/* ⚠ Der Zeitraum ist RECHNUNG, keine Zusage — er gehoert dorthin, wo tsc
   und vitest ihn lesen koennen. Diese Datei importiert von esm.sh und wird
   von beiden nicht geprueft; eine Strukturpruefung auf den Quelltext taugt
   fuer „sie schreibt nicht", nicht fuer „sie filtert richtig". */
import { waehleZeitraum, fassBestandZusammen } from "../../../src/domains/spiele/wpBestand.ts";
import type { BestandZeile } from "../../../src/domains/spiele/wpBestand.ts";
import type { WpSpiel, SpielQuelle, AufstellungQuelle } from "../../../src/domains/spiele/wpNutzlast.ts";
/* ⚠ Der Zuschnitt des scharfen Laufs — welche Teile hinausgehen, was
   zusammengezaehlt wird, was ins Protokoll darf — liegt aus demselben
   Grund dort und nicht hier. Ab Etappe 5 trifft er die gefaehrlichste
   Entscheidung des Exports: den Abgleichbereich. */
import {
  teileNachTeam, ohneTeamnummer, fasseLauf, laufMeldung, fuersProtokoll,
} from "../../../src/domains/spiele/wpLauf.ts";
import type { TeilErgebnis, WpAntwort } from "../../../src/domains/spiele/wpLauf.ts";
/* Die Ranglisten: Form und Gewicht. Dieselbe Begruendung wie oben — was
   entscheidet, gehoert dorthin, wo tsc und vitest es lesen. */
import { baueGruppen, wiegeGruppen, beurteileBestand } from "../../../src/domains/spiele/wpRangliste.ts";
import type { RanglisteZeile, WpRangGruppe } from "../../../src/domains/spiele/wpRangliste.ts";
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
const AKTIONEN = ["probe", "export", "bestand", "status", "ranglisten"];

/* ⚠ 30 Minuten, und die Zahl ist NICHT geraten — sie ist die Antwort auf
   „wie lange kann ein Lauf hoechstens dauern, bevor Stillstand die
   wahrscheinlichere Erklaerung ist". Ab Etappe 5 sind es 21 POST statt
   einem; beim SFV-Sync stehen dafuer 15 Minuten, dort dauert ein Lauf
   Sekunden.

   ⚠ Sie ist eine Schwelle, und Schwellen sind nie durch einen Test
   gedeckt (CLAUDE.md). Sobald der erste volle Lauf gemessen ist, gehoert
   sie dagegen gehalten: `details.dauer_ms` steht seit dem 09.09.2026 im
   Protokoll, damit diese Zahl eine Messung bekommt statt einer Meinung. */
const SPERRE_MINUTEN = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  let aktion = "";
  let nurTeam: string | null = null;
  /* Optional, nur fuer `bestand`. Fehlen sie, kommt der Beginn aus dem
     ersten Protokolleintrag — siehe holeBestand(). */
  let von: string | null = null;
  let bis: string | null = null;
  try {
    const body = await req.json();
    aktion = String(body?.aktion || "");
    nurTeam = body?.nur_team ? String(body.nur_team) : null;
    von = body?.von ? String(body.von) : null;
    bis = body?.bis ? String(body.bis) : null;
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
    /* ⚠ VOR `laufeProbe`, und das ist kein Ordnungsdetail: `bestand` fragt
       ausschliesslich die WEBSITE, was dort liegt. Wuerde es zuerst den
       ClubCampus-Bestand aufbauen, haenge die Auskunft ueber die Website an
       einem Lauf ueber unsere Spiele — und ein Fehler dort machte die
       Bestandsliste unerreichbar, ausgerechnet wenn man sie braucht. */
    if (aktion === "bestand") {
      return json(await holeBestand(db, vereinId, { von, bis }));
    }
    /* ⚠ Vor allem anderen, und ohne Datenbank: sie beantwortet die Frage
       „steht auf der Website überhaupt etwas vom Export?" — auch dann noch,
       wenn der Rest klemmt. */
    if (aktion === "status") {
      return json(await holeStatus());
    }

    /* ⚠ EIGENSTAENDIG, damit sie sich ohne einen Spiele-Lauf pruefen
       laesst. Im scharfen Lauf steht sie NICHT hier, sondern hinter der
       letzten Mannschaft — siehe dort. */
    if (aktion === "ranglisten") {
      return json(await sendeRanglisten(db, vereinId, nurTeam, null));
    }

    const erg = await laufeProbe(db, vereinId, nurTeam);

    if (aktion === "probe") {
      protokoll(`wp-export/probe/${vereinId}`,
        `${erg.alle.length} Spiel(e), ${erg.zusammenfassung.verlauf_zeilen} Verlaufszeilen`);
      return json(erg);
    }

    /* ⚠ DIE SPERRE IST AM 09.09.2026 GEFALLEN — bewusst, nicht aus
       Versehen. Bis Etappe 4 stand hier ein 400 fuer `export` ohne
       `nur_team`: der erste scharfe Lauf sollte eine Mannschaft treffen,
       keine einundzwanzig, und wer den Parameter vergisst, sollte nicht
       versehentlich alles schreiben.

       Etappe 4 ist durch (14 Spiele, Daten gegengelesen), also faellt sie.
       `nur_team` bleibt gueltig und bleibt die Abkuerzung fuer einen Lauf
       ueber genau eine Mannschaft — es ist jetzt eine Einschraenkung und
       keine Pflicht mehr.

       ⚠ Was NICHT faellt: der Abgleichbereich. Er kommt weiterhin aus den
       gelieferten Spielen, nicht aus dem Aufruf — siehe teileNachTeam(). */
    const lauf = await sendeAnWordpress(db, vereinId, erg);

    /* ⚠ ⚠  DIE RANGLISTE GEHT ZULETZT, UND ZWAR NUR FUER MANNSCHAFTEN,
       DEREN SPIELE ANGEKOMMEN SIND.  ⚠ ⚠

       Didi, 09.09.2026: „eine Rangliste, die Spiele beschreibt, die nicht
       angekommen sind, ist schlechter als keine." Sie steht auf der
       Teamseite unter dem Spielplan; zeigt sie neun Spiele und darueber
       stehen sechs, widerspricht die Seite sich selbst — und der Leser
       glaubt der Tabelle, weil sie nach Verband aussieht.

       Der Zuschnitt folgt derselben Regel wie der Abgleichbereich der
       Spiele: er kommt aus dem, was TATSAECHLICH gesendet wurde, nicht aus
       dem Aufruf. Eine gescheiterte Mannschaft bekommt keine Rangliste —
       ihre alte bleibt stehen, und das ist der ehrlichere Zustand.

       ⚠ Und sie kann den Spiele-Lauf nicht mehr rot faerben: der ist zu
       diesem Zeitpunkt protokolliert und abgeschlossen. Ihr eigenes
       Ergebnis steht daneben, nicht darin. */
    const gesendeteTeams = new Set(
      (lauf.je_team ?? [])
        .filter((t: { fehler: string | null }) => !t.fehler)
        .map((t: { team: string }) => t.team),
    );
    const rang = gesendeteTeams.size
      ? await sendeRanglisten(db, vereinId, nurTeam, gesendeteTeams)
      : { uebersprungen: "Keine Mannschaft gesendet — ohne Spiele keine Rangliste." };

    return json({ ...lauf, ranglisten: rang });
  } catch (e) {
    const meldung = protokollFehler(`wp-export/${aktion}/${vereinId}`, e);
    return json({ fehler: meldung }, 502);
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   DER SCHARFE LAUF
   ═══════════════════════════════════════════════════════════════════════ */

async function sendeAnWordpress(
  db: DbLeser, vereinId: string, erg: ProbeErgebnis,
) {
  const basis = (Deno.env.get("WP_BASIS_URL") ?? "").replace(/\/+$/, "");
  const schluessel = Deno.env.get("WP_SCHLUESSEL") ?? "";
  if (!basis || !schluessel) {
    throw new Error("WP_BASIS_URL oder WP_SCHLUESSEL nicht gesetzt");
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
  const teile = teileNachTeam(alle);
  const heimatlos = ohneTeamnummer(alle);

  const beginn = new Date().toISOString();
  const beginnMs = Date.now();

  const vRes = await db.from("api_verbindungen")
    .select("id").eq("verein_id", vereinId).eq("key", "wordpress").maybeSingle();
  const verbindungId = (vRes.data as { id: string } | null)?.id ?? null;

  /* ⚠ ZWEI LAEUFE ZUGLEICH SIND DER EINE FALL, DEN MAN NICHT
     NACHVOLLZIEHEN KANN — beide schreiben dieselben Beitraege, und der
     Rueckzug des einen sieht die Lieferung des anderen nicht. Der Knopf
     sperrt sich selbst, aber nicht den zweiten Browser und nicht den
     Zeitplan (Etappe 6).

     Beanspruchen in EINEM Statement: pruefen und danach setzen waeren
     zwei Schritte, und dazwischen passt der zweite Lauf. Wortgleich zum
     SFV-Sync, nur mit einer laengeren Frist. */
  if (verbindungId) {
    const grenze = new Date(Date.now() - SPERRE_MINUTEN * 60_000).toISOString();
    const { data: beansprucht } = await db.from("api_verbindungen")
      .update({ sync_laeuft_seit: beginn })
      .eq("id", verbindungId)
      .or(`sync_laeuft_seit.is.null,sync_laeuft_seit.lt.${grenze}`)
      .select("id");
    if (!beansprucht?.length) {
      /* Kein Fehler, sondern die Sperre — und die Meldung sagt das auch so. */
      return {
        ziel: host, status: "uebersprungen",
        fehler: "Ein Export ist bereits unterwegs. Die Sperre löst sich spätestens "
          + `nach ${SPERRE_MINUTEN} Minuten.`,
      };
    }
  }

  /* ⚠ DER LAUF SAGT, DASS ER LAEUFT — sonst steht bis zum Ende NIRGENDS
     etwas, und „dauert noch" ist von „haengt" nicht zu unterscheiden.
     Bei einem POST war das gleichgueltig; bei 21 seriellen ist es die
     Frage, die man waehrenddessen stellt.

     Die Zeile wird nach JEDER Mannschaft fortgeschrieben (`meldung`), und
     am Ende bekommt sie ihr Ergebnis. Eine zweite Zeile waere falsch: ein
     Lauf ist ein Vorgang, kein Paar. Gleiche Bauform wie sfv-sync. */
  let logId: string | null = null;
  if (verbindungId) {
    const { data: logZeile } = await db.from("api_sync_log").insert({
      verbindung_id: verbindungId, verein_id: vereinId, status: "laeuft",
      gestartet_am: beginn,
      meldung: `${host} · 0 von ${teile.length} Mannschaft(en)`,
    }).select("id").single();
    logId = (logZeile as { id: string } | null)?.id ?? null;
  }

  /* ⚠ EIN POST JE MANNSCHAFT, SERIELL. Zwei Gruende, und der zweite ist
     der wichtigere:

     1. PHP hat ein Zeitlimit. Etappe 4 waren 14 Spiele; alle Mannschaften
        sind rund 270, jedes mit ACF-Feldern und einem Repeater. Ein Lauf,
        der mittendrin abbricht, antwortet KEIN JSON — dann steht die
        Haelfte auf der Website und nichts davon im Protokoll.
     2. Der Abgleichbereich ist je Teil so gross wie der Teil selbst. Ein
        Abbruch bei Mannschaft 7 laesst die Mannschaften 8 bis 21
        unberuehrt, statt sie halb geschrieben zu hinterlassen.

     ⚠ SERIELL, nicht parallel: WordPress schreibt Beitraege, und
     gleichzeitige Laeufe auf denselben Bestand sind genau die Art
     Wettlauf, den niemand nachvollziehen kann. Es ist ein stuendlicher
     Auftrag, keine Interaktion — Dauer ist hier billig. */
  const ergebnisse: TeilErgebnis[] = [];
  try {
    for (const teil of teile) {
      /* ⚠ GEMESSEN, NICHT GESCHAETZT. „Wie lange dauern 21 serielle POST"
         war am 09.09.2026 eine Frage, auf die niemand eine Zahl hatte —
         und eine geschaetzte waere im Protokoll von einer gemessenen nicht
         zu unterscheiden gewesen. Seither steht die Dauer je Mannschaft im
         Ergebnis, und der erste volle Lauf beantwortet die Frage fuer alle
         weiteren. */
      const teilBeginn = Date.now();
      try {
        const wp = await sendeTeil(basis, schluessel, beginn, teil.sfv_team_id, teil.spiele);
        ergebnisse.push({
          sfv_team_id: teil.sfv_team_id, gesendet: teil.spiele.length, wp, fehler: null,
          dauer_ms: Date.now() - teilBeginn,
        });
      } catch (e) {
        /* ⚠ GEBUNDEN UND WEITERGELAUFEN, nicht verschluckt und nicht
           abgebrochen. Ein leerer catch machte aus dem Ausfall eine
           Datenlage; ein Abbruch machte aus einem Ausfall bei Mannschaft 3
           achtzehn ungeschriebene Mannschaften. Gezaehlt wird er in
           fasseLauf(), und er hebt den Lauf auf Status `fehler`. */
        ergebnisse.push({
          sfv_team_id: teil.sfv_team_id,
          gesendet: teil.spiele.length,
          wp: null,
          fehler: e instanceof Error ? e.message : String(e),
          dauer_ms: Date.now() - teilBeginn,
        });
      }

      /* Fortschritt fortschreiben. Ein Schreibvorgang je Mannschaft — der
         Preis fuer eine Frage, die sonst gar nicht zu beantworten ist. */
      if (logId) {
        await db.from("api_sync_log").update({
          meldung: `${host} · ${ergebnisse.length} von ${teile.length} Mannschaft(en) · `
            + `${Math.round((Date.now() - beginnMs) / 1000)} s`,
        }).eq("id", logId);
      }
    }
  } finally {
    /* ⚠ Sperre IMMER loesen, auch wenn etwas darueber wirft — sonst
       blockiert ein Fehlschlag den naechsten Lauf eine halbe Stunde. */
    if (verbindungId) {
      await db.from("api_verbindungen").update({ sync_laeuft_seit: null }).eq("id", verbindungId);
    }
  }

  const dauerMs = Date.now() - beginnMs;
  const { status, zahlen } = fasseLauf(ergebnisse);
  if (heimatlos.length) {
    zahlen.fehler.push(`${heimatlos.length} Spiel(e) ohne SFV-Teamnummer, nicht gesendet: `
      + heimatlos.slice(0, 10).join(", "));
  }
  const meldung = laufMeldung(host, zahlen, dauerMs);

  if (verbindungId && logId) {
    await db.from("api_sync_log").update({
      status,
      beendet_am: new Date().toISOString(),
      datensaetze_neu: zahlen.neu,
      datensaetze_aktualisiert: zahlen.aktualisiert,
      datensaetze_fehler: zahlen.fehler.length,
      meldung,
      details: fuersProtokoll(host, zahlen, ergebnisse, dauerMs),
    }).eq("id", logId);

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
    status,
    dauer_ms: dauerMs,
    /* ⚠ Was GEBAUT wurde und was GESENDET wurde, getrennt. Sie sind
       gleich, solange jedes Spiel eine Teamnummer traegt — und wenn nicht,
       ist die Differenz genau der Befund. Eine Zahl fuer beides koennte
       ihn nicht zeigen. */
    gebaut: alle.length,
    gesendet: zahlen.spiele_gesendet,
    ohne_teamnummer: heimatlos,
    zahlen,
    je_team: ergebnisse.map((t) => ({
      team: t.sfv_team_id, gesendet: t.gesendet, dauer_ms: t.dauer_ms,
      wordpress: t.wp, fehler: t.fehler,
    })),
    protokolliert: Boolean(verbindungId),
    zusammenfassung: erg.zusammenfassung,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   DIE RANGLISTEN
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Die Tabellen der eigenen Gruppen an WordPress.
 *
 * ⚠ EIN POST FUER ALLE GRUPPEN, anders als bei den Spielen. Der Grund ist
 * derselbe, nur andersherum: drueben landet alles in EINER Option
 * (`fch_cc_ranglisten`), und zwei Aufrufe wuerden dieselbe Option zweimal
 * lesen und zweimal schreiben — ein Wettlauf mit sich selbst. Ein Aufruf
 * mit 60–80 KB ist ausserdem nichts gegen 21 Beitragslaeufe.
 *
 * @param nurTeams `null` = alle eigenen Mannschaften. Sonst genau die,
 *                 deren Spiele in diesem Lauf angekommen sind.
 */
async function sendeRanglisten(
  db: DbLeser, vereinId: string, nurTeam: string | null, nurTeams: Set<string> | null,
) {
  const basis = (Deno.env.get("WP_BASIS_URL") ?? "").replace(/\/+$/, "");
  const schluessel = Deno.env.get("WP_SCHLUESSEL") ?? "";
  if (!basis || !schluessel) {
    throw new Error("WP_BASIS_URL oder WP_SCHLUESSEL nicht gesetzt");
  }
  const host = new URL(basis).host;

  const tRes = await db.from("teams").select("sfv_team_id")
    .eq("verein_id", vereinId).not("sfv_team_id", "is", null);
  if (tRes.error) throw new Error(`Teams nicht lesbar: ${tRes.error.message}`);

  let unsere = new Set<string>(
    ((tRes.data ?? []) as { sfv_team_id: number }[]).map((t) => String(t.sfv_team_id)),
  );
  if (nurTeam) unsere = new Set([...unsere].filter((t) => t === nurTeam));
  if (nurTeams) unsere = new Set([...unsere].filter((t) => nurTeams.has(t)));
  if (!unsere.size) {
    return { ziel: host, uebersprungen: "Keine zugeordnete Mannschaft — nichts zu senden." };
  }

  const rRes = await db.from("ranglisten")
    .select("sfv_saison_id, sfv_saison_name, sfv_liga_id, sfv_liga_name, sfv_division_id, sfv_division_name, "
      + "sfv_gruppe_id, sfv_gruppe, sfv_team_id, team_name, position, anzahl_spiele, "
      + "siege, unentschieden, niederlagen, tore, gegentore, punkte, fairplay_punkte, stand_vom")
    .eq("verein_id", vereinId);
  if (rRes.error) throw new Error(`Ranglisten nicht lesbar: ${rRes.error.message}`);

  const gruppen: WpRangGruppe[] = baueGruppen((rRes.data ?? []) as RanglisteZeile[], unsere);
  const gewicht = wiegeGruppen(gruppen);

  if (!gruppen.length) {
    /* ⚠ Ein leeres `gruppen: []` waere kein Nichts: der Empfaenger ersetzt
       nur gelieferte Gruppen, also passierte drueben tatsaechlich nichts —
       aber der Lauf saehe aus, als haette er etwas getan. Lieber gar nicht
       senden und es sagen. */
    return {
      ziel: host, gesendet: false, ...gewicht,
      uebersprungen: `Keine Rangliste zu ${unsere.size} Mannschaft(en) in der Datenbank.`,
    };
  }

  const antwort = await fetch(`${basis}/clubcampus/v1/ranglisten`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-FCH-Schluessel": schluessel },
    body: JSON.stringify({ gruppen }),
  });
  const text = await antwort.text();
  let wp: WpAntwort;
  try {
    wp = JSON.parse(text);
  } catch {
    throw new Error(`WordPress antwortete kein JSON (${antwort.status}): ${text.slice(0, 200)}`);
  }
  if (!antwort.ok) {
    throw new Error(`WordPress ${antwort.status}: ${JSON.stringify(wp).slice(0, 300)}`);
  }

  const geschrieben = Number(wp.gruppen_geschrieben ?? 0);
  const gesamt = Number(wp.gruppen_gesamt ?? 0);

  return {
    ziel: host,
    gesendet: true,
    ...gewicht,
    geschrieben,
    /* ⚠ DIE ZAHL, DIE DAS WACHSTUM ZEIGT. Der Empfaenger entfernt nie eine
       Gruppe (richtig: ein halber Ausfall darf nichts wegraeumen), also
       bleibt jede Gruppe einer vergangenen Saison fuer immer liegen. Nicht
       eine Byte-Schwelle meldet das, sondern dieser Vergleich. */
    im_bestand: gesamt,
    ...beurteileBestand(geschrieben, gesamt),
  };
}


/**
 * Ein Teil: die Spiele EINER Mannschaft an WordPress.
 *
 * ⚠ `teams` traegt genau diese eine Mannschaft — sie ist der
 * Abgleichbereich, und weiter darf das Aufraeumen drueben nicht reichen.
 */
async function sendeTeil(
  basis: string, schluessel: string, lauf: string, team: string, spiele: WpSpiel[],
): Promise<WpAntwort> {
  const antwort = await fetch(`${basis}/clubcampus/v1/spiele`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      /* Gemeinsames Geheimnis. Es steht nur im Secret und kommt in kein
         Protokoll. */
      "X-FCH-Schluessel": schluessel,
    },
    body: JSON.stringify({ lauf, teams: [team], spiele }),
  });

  const text = await antwort.text();
  let wp: WpAntwort;
  try {
    wp = JSON.parse(text);
  } catch {
    /* ⚠ Kein JSON heisst fast immer: eine HTML-Fehlerseite, ein
       Wartungsmodus, eine Basic-Auth-Abfrage davor — oder, ab Etappe 5
       der naechstliegende Fall, ein PHP-Zeitlimit. Der Anfang des Textes
       sagt mehr als „ungueltige Antwort". */
    throw new Error(`WordPress antwortete kein JSON (${antwort.status}): ${text.slice(0, 200)}`);
  }
  if (!antwort.ok) {
    throw new Error(`WordPress ${antwort.status}: ${JSON.stringify(wp).slice(0, 300)}`);
  }
  return wp;
}


/* ═══════════════════════════════════════════════════════════════════
   DER BESTAND — ZEIGEN, NICHT LOESCHEN
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Was auf der Website liegt — Beitrag für Beitrag, ohne etwas zu ändern.
 *
 * ⚠ GET, keine Sammelaktion, kein Loeschen. Entschieden wird pro Zeile im
 *   WordPress-Backend; jede Zeile bringt ihre `bearbeiten_url` mit.
 *   (Vorgabe Didi, 07.09.2026: „Kein Knopf, der zwanzig Beitraege auf
 *   einmal wegraeumt — das ist dieselbe Aktion wie «Person loeschen», nur
 *   auf fremdem Boden.")
 *
 * ⚠ SIE SCHREIBT AUCH NICHT NACH `api_sync_log`. Ein Nachsehen ist kein
 *   Lauf; stuende es im Protokoll, verschoebe es `letzter_sync` und die
 *   Kachel meldete einen Export, den es nicht gab. Dieselbe Trennung wie
 *   zwischen `probe` und `export`.
 */
async function holeBestand(
  db: DbLeser, vereinId: string, vorgabe: { von: string | null; bis: string | null },
) {
  const basis = (Deno.env.get("WP_BASIS_URL") ?? "").replace(/\/+$/, "");
  const schluessel = Deno.env.get("WP_SCHLUESSEL") ?? "";
  if (!basis || !schluessel) {
    throw new Error("WP_BASIS_URL oder WP_SCHLUESSEL nicht gesetzt");
  }
  const host = new URL(basis).host;

  const antwort = await fetch(`${basis}/clubcampus/v1/bestand`, {
    headers: { "X-FCH-Schluessel": schluessel },
  });
  const text = await antwort.text();
  let wp: Record<string, unknown>;
  try {
    wp = JSON.parse(text);
  } catch {
    throw new Error(`WordPress antwortete kein JSON (${antwort.status}): ${text.slice(0, 200)}`);
  }
  if (!antwort.ok) {
    throw new Error(`WordPress ${antwort.status}: ${JSON.stringify(wp).slice(0, 300)}`);
  }

  const zeilen = (wp.beitraege as BestandZeile[] | undefined) ?? [];

  /* ⚠ DER BEGINN WIRD GELESEN, NICHT GESCHRIEBEN.
     Didi, 07.09.2026: den Anfang des Exports nicht als Datum in den Code
     schreiben, sondern aus dem ersten Protokolleintrag nehmen. Ein Datum im
     Code behauptet etwas ueber einen Zeitpunkt, den der Code nicht kennt —
     und veraltet, ohne dass etwas fehlschlaegt.

     ⚠ `error` wird gelesen. Ein verschluckter Fehler ergaebe hier `null`,
     also „kein Lauf protokolliert", also einen offenen Zeitraum — die
     Vorbelegung fiele lautlos weg und die Liste saehe bloss laenger aus.
     Genau das Muster, das in diesem Projekt zwei Wochen gekostet hat. */
  const vRes = await db.from("api_verbindungen")
    .select("id").eq("verein_id", vereinId).eq("key", "wordpress").maybeSingle();
  if (vRes.error) throw new Error(`api_verbindungen nicht lesbar: ${vRes.error.message}`);
  const verbindungId = (vRes.data as { id: string } | null)?.id ?? null;

  let ersterLauf: string | null = null;
  if (verbindungId) {
    const lRes = await db.from("api_sync_log")
      .select("gestartet_am").eq("verbindung_id", verbindungId)
      .order("gestartet_am", { ascending: true }).limit(1).maybeSingle();
    if (lRes.error) throw new Error(`api_sync_log nicht lesbar: ${lRes.error.message}`);
    ersterLauf = (lRes.data as { gestartet_am: string } | null)?.gestartet_am ?? null;
  }

  const zeitraum = waehleZeitraum(vorgabe, ersterLauf);
  const erg = fassBestandZusammen(zeilen, zeitraum, ersterLauf);

  return {
    ziel: host,
    hinweis:
      "Nachsehen, nicht schreiben. Es wurde nichts geändert und nichts protokolliert."
      + " Entschieden wird pro Beitrag im WordPress-Backend (bearbeiten_url).",
    /* ⚠ Der erste Lauf steht DANEBEN, nicht nur als Vorbelegung versteckt.
       Wer den Zeitraum beurteilen will, muss sehen, woher seine Grenze
       kommt. */
    erster_lauf: ersterLauf,
    ...erg,
    /* ⚠ Die Gegenprobe auf die Besitzregel. Steigt sie, hat der Export
       einen Handbeitrag uebernommen — was er nicht darf. Sie steht
       AUSSERHALB des Zeitraums: ein Handbeitrag hat mit dem Export nichts
       zu tun und darf durch keinen Filter verschwinden. */
    handbeitraege: Number(wp.handbeitraege ?? 0),
    /* ⚠ Was WordPress selbst gezaehlt hat — gegen unsere Zeilenzahl zu
       halten. Gehen sie auseinander, hat eine der beiden Seiten etwas
       weggelassen. */
    gesamt_laut_wordpress: Number(wp.gesamt ?? 0),
    seiten_einig: zeilen.length === Number(wp.gesamt ?? 0),
  };
}


/**
 * Was WordPress selbst über seinen Bestand sagt — ohne etwas zu ändern.
 *
 * ⚠ SIE BRAUCHT DIE NEUE PLUGIN-FASSUNG NICHT. `/clubcampus/v1/status` ist
 *   seit der ersten Fassung installiert; `bestand` wäre die reichere
 *   Auskunft, liegt aber noch im anderen Repository.
 *
 * ⚠ DIE ZAHL, AUF DIE ES ANKOMMT, IST `spiele_abgleich`.
 *
 *   `spiele_gesamt` zählt nur veröffentlichte Beiträge — ein zurückgezogener
 *   oder als Entwurf angelegter käme darin nicht vor, und genau danach
 *   sucht man, wenn Beiträge „fehlen".
 *
 *   `spiele_abgleich` zählt über `cc_abgleich_kandidaten()`, also über das
 *   BESITZMERKMAL `sfv_match_id` und über die Status publish, draft,
 *   pending und private. Steht dort 0, hat der Export auf dieser Website
 *   noch nie einen Beitrag angelegt — in keinem Status.
 *
 * ⚠ Und sie nennt den Ziel-Host. Wer „ich sehe die Beiträge nicht" sagt,
 *   muss zuerst wissen, ob er auf dieselbe Installation sieht.
 */
async function holeStatus() {
  const basis = (Deno.env.get("WP_BASIS_URL") ?? "").replace(/\/+$/, "");
  const schluessel = Deno.env.get("WP_SCHLUESSEL") ?? "";
  if (!basis || !schluessel) {
    throw new Error("WP_BASIS_URL oder WP_SCHLUESSEL nicht gesetzt");
  }
  const host = new URL(basis).host;

  const antwort = await fetch(`${basis}/clubcampus/v1/status`, {
    headers: { "X-FCH-Schluessel": schluessel },
  });
  const text = await antwort.text();
  let wp: Record<string, unknown>;
  try {
    wp = JSON.parse(text);
  } catch {
    throw new Error(`WordPress antwortete kein JSON (${antwort.status}): ${text.slice(0, 200)}`);
  }

  /* Aufgezählt, nicht durchgereicht — dieselbe Regel wie überall sonst. */
  return {
    ziel: host,
    hinweis: "Nachsehen, nicht schreiben. Nichts geändert, nichts protokolliert.",
    bereit: wp.bereit === true,
    fehlt: (wp.fehlt as string[] | undefined) ?? [],
    /* ⚠ WER ANTWORTET HIER — seit dem 09.09.2026, und aus einem Befund:
       Etappe 4 hat drei Anlaeufe gebraucht, und zwei davon scheiterten
       daran, dass die falsche Datei antwortete oder gar keine. Beides sah
       aus wie „diese Mannschaft hat kein Team mit dieser sfv_id".

       Fehlen die Felder, ist die Gegenstelle aelter als diese Fassung —
       das ist selbst eine Auskunft und deshalb "—" statt weglassen. */
    empfaenger: String(wp.empfaenger ?? "— antwortet ohne Namen, also aeltere Fassung"),
    version: String(wp.version ?? "—"),
    /* ⚠ Die Antwort auf den dritten Anlauf: der Schluessel, an dem die
       Team-Zuordnung haengt, und ob ueberhaupt eine besteht.

       ⚠ `wp_`-Praefix seit dem 10.09.2026, und es ist kein Zierrat: die
       Zahlen zaehlen WORDPRESS-Beitraege. Ohne das Praefix wurden sie an
       einem Abend zweimal fuer ClubCampus-Teams gehalten. Wieviele Teams
       ClubCampus fuehrt, steht in `probe.teams`, nicht hier. */
    meta_schluessel: String(wp.meta_schluessel ?? "—"),
    wp_teams: Number(wp.wp_teams ?? 0),
    wp_teams_mit_sfv_id: Number(wp.wp_teams_mit_sfv_id ?? 0),
    wp_teams_sfv_id_doppelt: Number(wp.wp_teams_sfv_id_doppelt ?? 0),
    /* Nur veröffentlichte. */
    spiele_veroeffentlicht: Number(wp.spiele_gesamt ?? 0),
    /* ⚠ Die entscheidende Zahl: Beiträge mit sfv_match_id, ALLE Status. */
    spiele_des_exports: Number(wp.spiele_abgleich ?? 0),
    als_benutzer: String(wp.benutzer ?? ""),
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
/* ⚠ `sfv_gegner_team_id` steht hier und nicht in `SpielQuelle`: es geht in
   keine Nutzlast, es wird nur GEZAEHLT (wie viele fremde Wappen ein
   Bestand waeren). Was die Nutzlast traegt, gehoert in SpielQuelle — die
   zwei Mengen auseinanderzuhalten ist der Grund, warum hier ueberhaupt
   ein eigener Typ steht. */
type SpielZeile = SpielQuelle & {
  id: string;
  sfv_team_id: number | null;
  sfv_gegner_team_id: number | null;
};
interface ZuordnungZeile {
  sfv_person_id: number;
  mitglieder: { personen: { vorname: string | null; nachname: string | null } | null } | null;
}

interface ProbeErgebnis {
  hinweis: string;
  zusammenfassung: Record<string, unknown>;
  teams: unknown[];
  /** ⚠ Die Aufteilung des scharfen Laufs — ein POST je Zeile, und jede
      Zeile ist ein Abgleichbereich. Aus derselben Funktion wie dort. */
  je_team: { sfv_team_id: string; name: string; spiele: number }[];
  /** Zugeordnete Mannschaften ohne Spiele in diesem Lauf. Sie bekommen
      keinen POST — Absicht, deshalb benannt. */
  ohne_spiele: string[];
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

  /* ⚠ `nur_team` IST DIE SFV-TEAMNUMMER, NICHT DER NAME — und bis zum
     07.09.2026 pruefte das niemand.

     Wer „Cc-Junioren" statt „38309" schickt, bekam einen Lauf, der brav
     durchlief und NICHTS tat: `erlaubt` enthielt den Namen, kein Spiel
     traf, `eigene` war leer, und WordPress meldete die Mannschaft unter
     `ohne_team` zurueck. Ergebnis: 0 neu, 0 aktualisiert, Status
     „warnung" — und das sieht genauso aus wie „diese Mannschaft hat keine
     Spiele". Wieder ein AUSFALL IN DER VERKLEIDUNG EINER DATENLAGE.

     ⚠ Harmlos war nur der Rueckzug: das Plugin bildet seinen
     Abgleichbereich aus `teamKarte[sfv]`, und ein Name loest dort auf
     nichts auf. Ein Tippfehler konnte also nichts abraeumen. Verlassen
     sollte man sich darauf nicht — die Sperre liegt drueben, der Fehler
     hier.

     Die Meldung ZAEHLT DIE GUELTIGEN WERTE AUF, statt nur abzulehnen —
     dieselbe Regel wie bei `AKTIONEN` weiter oben: eine Meldung, die die
     gueltige Antwort kennt und nicht nennt, kostet eine Rueckfrage. */
  if (nurTeam && !teamListe.some((t) => t.sfv_team_id === nurTeam)) {
    const gueltig = teamListe
      .map((t) => `${t.sfv_team_id} (${t.name})`)
      .sort();
    throw new Error(
      `Unbekanntes nur_team: ${nurTeam} — erwartet wird die SFV-Teamnummer, `
      + `nicht der Mannschaftsname. Gültig: ${gueltig.join(", ") || "(keine Mannschaft zugeordnet)"}`,
    );
  }

  const erlaubt = new Set(
    nurTeam ? [nurTeam] : teamListe.map((t) => t.sfv_team_id),
  );

  /* ── Spiele ──────────────────────────────────────────────────────── */
  const sRes = await db.from("spiele")
    .select("id, sfv_match_id, sfv_spiel_nr, date, zeit, gegner, heimspiel, venue, "
      + "wettbewerb, liga, sfv_gruppe, sfv_status, resultat, ht_resultat, "
      + "sfv_team_id, sfv_gegner_team_id")
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

  /* ── Aufstellung, in einem Zug ───────────────────────────────────── */
  /* ⚠ `select("*")` waere hier bequem und falsch: die Tabelle traegt
     Spalten, die nicht auf die Website gehoeren, und ein neues Feld
     reiste beim naechsten Mal stillschweigend mit. Genannt wird, was
     gebraucht wird — dieselbe Regel wie bei jeder Allowlist. */
  const aRes = spielIds.length
    ? await db.from("spiel_aufstellung")
        .select("spiel_id, ist_eigener, sfv_person_id, name, rueckennr,"
          + " position_name, von_minute, bis_minute, spielzeit, rolle_zuweisung_id")
        .in("spiel_id", spielIds)
    : { data: [], error: null };
  /* ⚠ `error` lesen, nicht nur `data`: eine gescheiterte Abfrage saehe
     sonst aus wie „es gibt keine Aufstellung" — und auf der Website
     fehlte sie kommentarlos. */
  if (aRes.error) throw new Error(`Aufstellung nicht lesbar: ${aRes.error.message}`);

  const aufProSpiel = new Map<string, AufstellungQuelle[]>();
  for (const z of (aRes.data ?? []) as (AufstellungQuelle & { spiel_id: string })[]) {
    const liste = aufProSpiel.get(z.spiel_id) ?? [];
    liste.push(z);
    aufProSpiel.set(z.spiel_id, liste);
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

  /* ══════════════════════════════════════════════════════════════════
     DIE RUECKFALLKETTE: zugeordnet → SFV-Name → Rueckennummer

     ⚠ `beschreibeWer()` wird dafuer NICHT angefasst. Es nimmt eine Map;
     die Kette entsteht allein aus der REIHENFOLGE, in der hier gefuellt
     wird — erst der Rueckfall, dann die Zuordnungen darueber. Wer
     zugeordnet ist, gewinnt.

     ⚠ ZWEI MENGEN BLEIBEN GETRENNT, obwohl eine Map genuegen wuerde.
     Der Zaehler unten braucht sie einzeln: mischte man sie hier und
     zaehlte gegen die Mischung, meldete `zeilen_mit_eigenem_namen` bei
     308 SFV-Namen und 0 Zuordnungen dreistellige Werte — und saehe aus
     wie ein Erfolg der Zuordnungsarbeit, die nicht stattgefunden hat.
     ══════════════════════════════════════════════════════════════════ */
  const sfvNamen = new Map<number, string>();
  const nRes = await db.from("sfv_personen")
    .select("sfv_person_id, name").eq("verein_id", vereinId);
  /* ⚠ `error` lesen, nicht nur `data`: eine gescheiterte Abfrage saehe
     sonst aus wie „es gibt keine Namen" — und auf der Website stuende
     ueberall „Nr. 13", ohne dass etwas fehlschlaegt. */
  if (nRes.error) throw new Error(`SFV-Namen nicht lesbar: ${nRes.error.message}`);
  for (const z of (nRes.data ?? []) as { sfv_person_id: number; name: string }[]) {
    const n = String(z.name ?? "").trim();
    if (n) sfvNamen.set(Number(z.sfv_person_id), n);
  }

  const zugeordnet = new Map<number, string>();
  for (const z of (zRes.data ?? []) as ZuordnungZeile[]) {
    const p = z.mitglieder?.personen;
    if (!p) continue;
    const voll = `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim();
    if (voll) zugeordnet.set(Number(z.sfv_person_id), voll);
  }

  /* Erst der Rueckfall, dann die Wahrheit darueber. */
  const namen = new Map<number, string>([...sfvNamen, ...zugeordnet]);

  /* ── Bauen ───────────────────────────────────────────────────────── */
  const gebaut: WpSpiel[] = [];
  let ohneVerlauf = 0;
  let ohneSchluessel = 0;
  let zurueckgehalten = 0;
  /* ⚠ Sichtbar machen, was wir an fremdem Text aendern. Steigt die Zahl,
     hat der Verband seine Schreibweise geaendert — und das soll auffallen,
     nicht verschwinden. */
  let rundeMitDoppelabstand = 0;
  let ohneLiga = 0;
  /* ⚠ WIE VIELE FREMDE WAPPEN EIN BESTAND WAERE — die Frage vor der
     Entscheidung, ob Gegner-Logos an die Website gehen. Aus den ohnehin
     geladenen Spielen gezaehlt, kein zusaetzlicher Abruf.

     ⚠ Es sind TEAMS, nicht Vereine. `sfv_team_logos` ist nach
     `sfv_team_id` geschluesselt, obwohl das Bild dem Verein gehoert —
     die Zahl der Vereine ist deutlich kleiner. Wer sie verwechselt,
     schaetzt den Pflegeaufwand zu hoch. */
  const gegnerTeams = new Set<number>();
  let cupOhneRunde = 0;
  /* ⚠ SIEBEN ZAHLEN, JEDE IMMER — auch als Null. Eine Zahl, die nur im
     schlechten Fall erscheint, verlangt vom Leser eine Deutung, und die
     Deutung einer Abwesenheit ist geraten. Am 10.09.2026 achtmal an einem
     Tag passiert. */
  const aufZahlen = leereAufstellungZahlen();
  let spieleMitAufstellung = 0;
  const namensZaehlung = {
    mit_eigenem_namen: 0, mit_sfv_namen: 0, mit_rueckennummer: 0, mit_gegnername: 0,
    zeilen_mit_zweitem_namen: 0,
    zeilen_ohne_ersatzkennung: 0, zeilen_ohne_ersatzname: 0,
  };

  for (const s of eigene) {
    const roh = proSpiel.get(String(s.id)) ?? [];
    const ereignisse = mischeEreignisse(roh);
    if (!hatVerlauf(roh)) ohneVerlauf++;

    const spiel = bildeSpiel(s, String(s.sfv_team_id ?? ""), ereignisse, namen, unserKlub);
    if (!spiel) { ohneSchluessel++; continue; }
    if (!spiel.publizieren) zurueckgehalten++;
    /* ⚠ NICHT bereinigt, nur gezaehlt (Entscheidung Didi, 10.09.2026):
       fremde Daten stillschweigend zu putzen versteckt den Fehler. Was
       bleibt, ist die Zahl — aendert der Verband seine Schreibweise,
       faellt es hier auf. */
    if (hatDoppelabstand(s.sfv_gruppe as string | null)) rundeMitDoppelabstand++;
    /* ⚠ Die Antwort auf „ist `liga` immer gefuellt?" — die Frage, an der
       haengt, ob das leere `sfv_liga_name` drueben die kleinere Sorge ist. */
    if (!String(s.liga ?? "").trim()) ohneLiga++;
    const gid = Number(s.sfv_gegner_team_id);
    if (Number.isFinite(gid) && gid > 0) gegnerTeams.add(gid);
    /* ⚠ Cupspiele tragen keinen Gruppennamen — gemeldet 10.09.2026,
       13 von 13. Gezaehlt, nicht behoben: der Wert entsteht beim Verband,
       und was dort stattdessen steht, ist noch nicht gemessen. */
    if (spiel.runde === "" && (s.wettbewerb ?? "").toString().toLowerCase().includes("cup")) {
      cupOhneRunde++;
    }
    /* ⚠ DER AUFRUFER, DER BIS ZUM 10.09.2026 GEFEHLT HAT. `rolleAus`,
       `sammleMarken`, `markeSchluessel` und `spielerAnzeige` waren
       gebaut, geprueft und tot — deshalb hat den vierten Rollenwert eine
       SQL-Abfrage gefunden und nicht die Meldung, die dafuer gebaut war. */
    const aufZeilen = aufProSpiel.get(String(s.id)) ?? [];
    if (aufZeilen.length) {
      spieleMitAufstellung++;
      const marken = sammleMarken(ereignisse);
      spiel.aufstellung = baueAufstellung(
        aufZeilen, marken.je_spieler, spiel.heim_auswaerts === "heim",
        namen, aufZahlen,
      );
    }
    gebaut.push(spiel);

    /* ⚠ Gezaehlt wird die ENTSCHEIDUNG, nicht der fertige Text. Die erste
       Fassung las den Ausgabetext („beginnt nicht mit Nr. ") und meldete
       431 statt 0, weil jede Gegnerzeile einen Vereinsnamen traegt.
       Siehe zaehleVerlaufNamen(). */
    const z = zaehleVerlaufNamen(ereignisse, zugeordnet, sfvNamen);
    namensZaehlung.mit_eigenem_namen += z.mit_eigenem_namen;
    namensZaehlung.mit_sfv_namen += z.mit_sfv_namen;
    namensZaehlung.mit_rueckennummer += z.mit_rueckennummer;
    namensZaehlung.mit_gegnername += z.mit_gegnername;
    namensZaehlung.zeilen_mit_zweitem_namen += z.zeilen_mit_zweitem_namen;
    namensZaehlung.zeilen_ohne_ersatzkennung += z.zeilen_ohne_ersatzkennung;
    namensZaehlung.zeilen_ohne_ersatzname += z.zeilen_ohne_ersatzname;
  }

  const verlaufZeilen = gebaut.reduce((n, s) => n + s.verlauf.length, 0);

  /* ⚠ Die Gegenprobe im Ergebnis, nicht nur im Test: gehen Summe und
     Zeilenzahl auseinander, misst eine der beiden Funktionen etwas
     anderes als die andere — und dann ist die Zahl unbrauchbar, egal wie
     plausibel sie aussieht. */
  const summe = namensZaehlung.mit_eigenem_namen + namensZaehlung.mit_sfv_namen
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

      /* ── Die Aufstellung ──────────────────────────────────────────
         ⚠ ALLE ACHT STEHEN IMMER DA, auch als Null. Eine Zahl, die nur
         im schlechten Fall erscheint, verlangt eine Deutung, und die
         Deutung einer Abwesenheit ist geraten — am 10.09.2026 achtmal
         an einem Tag passiert, zuletzt mit `gegner_doppel`, das gesucht
         und nicht gefunden wurde. */
      spiele_mit_aufstellung: spieleMitAufstellung,
      aufstellung_zeilen_eigen: aufZahlen.zeilen_eigen,
      aufstellung_zeilen_fremd: aufZahlen.zeilen_fremd,
      /* Eigene Zeilen, die als „Nr. 18" erscheinen. Gegnerzeilen zaehlen
         hier NICHT mit — bei ihnen ist der fehlende Name eine
         Entscheidung, keine Luecke. */
      aufstellung_ohne_namen: aufZahlen.ohne_namen,
      /* ⚠ Die Zuweisung des Verbands gegen die Minuten. Vorhersage aus
         der Messung vom 10.09.2026: mindestens 37. Weicht der Wert stark
         ab, ist die Ableitungsregel falsch und nicht die Quelle. */
      aufstellung_widerspruch: aufZahlen.widerspruch,
      /* ⚠ Bleibt gezaehlt, AUCH wenn korrigiert wurde. Die Korrektur
         macht den Befund unsichtbar, nicht ungeschehen. Heute: 1. */
      aufstellung_unplausibel: aufZahlen.unplausibel,
      aufstellung_korrigiert: aufZahlen.korrigiert,
      aufstellung_ohne_minuten: aufZahlen.ohne_minuten,
      aufstellung_unbekannte_rollen: aufZahlen.unbekannte_rollen,
      nicht_zu_veroeffentlichen: zurueckgehalten,
      verlauf_zeilen: verlaufZeilen,
      runde_mit_doppelabstand: rundeMitDoppelabstand,
      ohne_liga: ohneLiga,
      cup_ohne_runde: cupOhneRunde,
      /* ⚠ ZWEI SORTEN NAME, GETRENNT AUSGEWIESEN (seit 10.09.2026).
         Bis dahin gab es nur eine, und `zeilen_mit_personenname` war die
         Zahl, an der man ablas, ob Klarnamen hinausgehen. Seit die
         SFV-Namen gespeichert werden, beantwortet EINE Zahl die Frage
         nicht mehr:

           zeilen_mit_eigenem_namen   unsere Schreibweise — der Sollzustand
           zeilen_mit_sfv_namen       der Rueckfall — hoch, solange die
                                      Zuordnung nicht gemacht ist

         Beide zusammen sind „ein Mensch wird beim Namen genannt". Die
         erste allein sagt, wie weit die Zuordnungsarbeit ist. */
      zuordnungen: zugeordnet.size,
      sfv_namen: sfvNamen.size,
      zeilen_mit_eigenem_namen: namensZaehlung.mit_eigenem_namen,
      zeilen_mit_sfv_namen: namensZaehlung.mit_sfv_namen,
      zeilen_mit_rueckennummer: namensZaehlung.mit_rueckennummer,
      zeilen_mit_gegnername: namensZaehlung.mit_gegnername,
      /* ⚠ AUSSERHALB DER AUFTEILUNG — geht nicht in `zaehlung_stimmt` ein.
         Eine Wechselzeile nennt zwei Menschen; die vier Zahlen darüber
         teilen ZEILEN auf. Siehe NamensZaehlung. */
      zeilen_mit_zweitem_namen: namensZaehlung.zeilen_mit_zweitem_namen,
      /* ⚠ Getrennt, weil sie an verschiedene Stellen schicken:
         ohne_ersatzkennung → aktion "wechselnachtrag"
         ohne_ersatzname    → aktion "namen" */
      wechsel_ohne_ersatzkennung: namensZaehlung.zeilen_ohne_ersatzkennung,
      wechsel_ohne_ersatzname: namensZaehlung.zeilen_ohne_ersatzname,
      /* ⚠ TEAMS, nicht Vereine — siehe oben. */
      gegner_teams_verschieden: gegnerTeams.size,
      zaehlung_stimmt: summe === verlaufZeilen,
    },
    teams: teamListe,
    /* ⚠ DIE AUFTEILUNG IST AB ETAPPE 5 DER GEGENSTAND DER VORSCHAU, nicht
       mehr nur die Spielzahl. Der scharfe Lauf besteht aus genau diesen
       Teilen — ein POST je Zeile —, und jede Zeile ist zugleich ein
       Abgleichbereich: was hier steht, darf drueben aufgeraeumt werden.

       Sie kommt aus DERSELBEN Funktion wie der scharfe Lauf. Zwei
       Rechnungen fuer dieselbe Aufteilung waeren genau der Fehler, den
       eine Vorschau verhindern soll: sie zeigte dann etwas anderes, als
       gesendet wird. */
    je_team: teileNachTeam(gebaut).map((t) => ({
      sfv_team_id: t.sfv_team_id,
      name: teamListe.find((x) => x.sfv_team_id === t.sfv_team_id)?.name ?? "—",
      spiele: t.spiele.length,
    })),
    /* Mannschaften MIT Zuordnung, aber OHNE Spiele in diesem Lauf. Sie
       bekommen keinen POST und koennen deshalb nichts verlieren — das ist
       Absicht (Plan §13.2), und weil es Absicht ist, wird es genannt. */
    ohne_spiele: teamListe
      .filter((t) => !gebaut.some((s) => s.sfv_team_id === t.sfv_team_id))
      .map((t) => `${t.sfv_team_id} (${t.name})`),
    spiele: gebaut.slice(0, PROBE_HOECHSTENS),
    gekuerzt: Math.max(0, gebaut.length - PROBE_HOECHSTENS),
    alle: gebaut,
  };
}
