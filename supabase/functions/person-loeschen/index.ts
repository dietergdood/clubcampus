// ClubCampus — supabase/functions/person-loeschen/index.ts
//
// Eine Person vollstaendig loeschen (DSGVO) — mit Vorschau und Fingerabdruck.
//
// ⚠ DIES IST DAS EINZIGE STUECK IM PROJEKT OHNE ROLLBACK. Ein
//   `BEGIN … ROLLBACK`-Probelauf prueft Reihenfolge und Fremdschluessel, aber
//   er prueft NICHT, ob wir die richtige Person erwischen — er erwischt sie
//   genauso zuverlaessig wie der scharfe Lauf. Wer ihn fuer die Absicherung
//   haelt, hat keine.
//
//   Die Absicherung ist der FINGERABDRUCK, und sie baut nicht auf einen
//   Menschen:
//
//     1. `aktion: "vorschau"` misst, was faellt, und gibt einen HMAC ueber
//        Person-Id, aktive Mitgliedschaften, Konto und die Zahlen je Tabelle
//        zurueck — signiert mit `LOESCH_SIGNATUR_KEY`, mit Zeitstempel INNEN.
//     2. `aktion: "loeschen"` verlangt ihn, prueft die Signatur, prueft das
//        Alter, MISST NEU und vergleicht. Weicht etwas ab, wird nicht
//        geloescht — und die Meldung nennt WAS.
//
//   Was das abfaengt, ohne auf Sorgfalt zu bauen:
//     falsche Person      andere Id im signierten Abdruck
//     veralteter Tab      inzwischen Mitglied/Kind/Konto -> andere Zahlen
//     Doppelklick         nach dem ersten Lauf gibt es die Person nicht mehr
//     zwei Admins         der zweite bekommt einen Abbruch statt einer
//                         halben Kette
//     gefaelschter Aufruf der Abdruck ist HMAC-signiert, nicht bloss gehasht
//
// ⚠ DIE AUTORISIERUNG LIEGT IN `../_shared/aufrufer.ts` — EINE STELLE FUER
//   BEIDE FUNCTIONS. `invite-user` prueft dieselbe Sache und hat sie bis zum
//   23.08.2026 gar nicht geprueft: dort genuegte, DASS ein
//   Authorization-Header da ist, und dort steht im Normalfall der oeffentliche
//   publishable key. Zweimal geschriebene Rechtepruefungen laufen auseinander,
//   und zwar still.
//
// ⚠ UND KEIN SELBSTLOESCHEN. Wer sich selbst entfernt, nimmt dabei sein
//   eigenes Konto mit und kann den Vorgang nicht zu Ende protokollieren.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formeVorschau, fingerabdruckDaten, nenneUnterschiede, NICHT_PRUEFBAR } from "./vorschau.ts";
import type { Vorschau } from "./vorschau.ts";
import { holeAufrufer, pruefeAdmin, pruefeVerein, pruefeNichtSelbst } from "../_shared/aufrufer.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

/** Wie lange ein Fingerabdruck gilt. Die Vorschau wird unmittelbar vor der
    Handlung gelesen; wer den Bildschirm eine Stunde verlaesst, schaut noch
    einmal hin. (Entscheidung Didi, 22.08.2026.) */
const GUELTIG_MINUTEN = 10;

/* ── Die Einteilung der Tabellen ──────────────────────────────────────────
   Gemessen am 23.08.2026 aus `pg_constraint`, nicht abgeschrieben. */
const FAELLT = [
  "mitglieder", "kader", "anwesenheiten", "mitglieder_team_details", "sfv_zuordnung",
  "eltern_kinder_als_elternteil", "eltern_kinder_als_kind",
  "benutzer", "personenart_pro_person",
  "mitglieder_notizen", "mitglieder_aenderungen", "mitglieder_aktivitaeten",
];
const ANONYM = [
  "helper_zuteilungen", "team_helfer_zuteilungen",
  "spiel_ereignisse_korrigiert_von", "audit_log_benutzer_id",
];
/** Haengt an der Mitgliedschaft, nicht an der Person — eingerueckt. */
const UNTER: Record<string, string> = {
  kader: "mitglieder", anwesenheiten: "mitglieder",
  mitglieder_team_details: "mitglieder", sfv_zuordnung: "mitglieder",
  eltern_kinder_als_kind: "mitglieder",
};

async function zaehle(db: SupabaseClient, personId: string): Promise<{
  person: Vorschau["person"]; zahlen: Record<string, number>;
} | null> {
  const { data: p, error: pErr } = await db.from("personen")
    .select("id, vorname, nachname, email, verein_id").eq("id", personId).maybeSingle();
  if (pErr || !p) return null;

  const { data: mids } = await db.from("mitglieder").select("id, aktiv").eq("person_id", personId);
  const mitgliedIds = (mids ?? []).map(m => m.id as number);
  const aktive = (mids ?? []).filter(m => m.aktiv === true).length;

  const { data: bids } = await db.from("benutzer").select("id").eq("person_id", personId);
  const kontoIds = (bids ?? []).map(b => b.id as string);

  /* `head: true` — nur zaehlen, keine Daten holen. Eine Vorschau, die
     nebenbei alle Zeilen laedt, waere ein zweiter Weg, auf dem
     Personendaten die Function verlassen. */
  const n = async (t: string, spalte: string, werte: unknown[]): Promise<number> => {
    if (werte.length === 0) return 0;
    const { count, error } = await db.from(t)
      .select("*", { count: "exact", head: true }).in(spalte, werte as never[]);
    if (error) { console.error(`zaehle ${t}:`, error.message); return -1; }
    return count ?? 0;
  };

  const zahlen: Record<string, number> = {
    mitglieder: mitgliedIds.length,
    kader: await n("kader", "mitglied_id", mitgliedIds),
    anwesenheiten: await n("anwesenheiten", "mitglied_id", mitgliedIds),
    mitglieder_team_details: await n("mitglieder_team_details", "mitglied_id", mitgliedIds),
    sfv_zuordnung: await n("sfv_zuordnung", "mitglied_id", mitgliedIds),
    eltern_kinder_als_elternteil: await n("eltern_kinder", "person_id", [personId]),
    eltern_kinder_als_kind: await n("eltern_kinder", "mitglied_id", mitgliedIds),
    benutzer: kontoIds.length,
    personenart_pro_person: await n("personenart_pro_person", "person_id", [personId]),
    mitglieder_notizen: await n("mitglieder_notizen", "person_id", [personId]),
    mitglieder_aenderungen: await n("mitglieder_aenderungen", "person_id", [personId]),
    mitglieder_aktivitaeten: await n("mitglieder_aktivitaeten", "person_id", [personId]),
    helper_zuteilungen: await n("helper_zuteilungen", "person_id", [personId]),
    team_helfer_zuteilungen: await n("team_helfer_zuteilungen", "person_id", [personId]),
    spiel_ereignisse_korrigiert_von: await n("spiel_ereignisse", "korrigiert_von", kontoIds),
    audit_log_benutzer_id: await n("audit_log", "benutzer_id", kontoIds),
  };

  /* ⚠ `-1` heisst „nicht gezaehlt", nicht „null". Ein Lesefehler darf nicht
     als leere Tabelle durchgehen — sonst zeigte die Vorschau weniger an, als
     faellt, und der Fingerabdruck deckte den Irrtum auch noch ab. */
  if (Object.values(zahlen).some(v => v < 0)) return null;

  return {
    person: {
      id: p.id as string,
      name: `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim(),
      email: (p.email as string | null) ?? null,
      aktive_mitgliedschaften: aktive,
      hat_konto: kontoIds.length > 0,
    },
    zahlen,
  };
}

/* ── Signatur ─────────────────────────────────────────────────────────────
   HMAC, kein blosser Hash: ein Hash ueber oeffentliche Daten liesse sich vom
   Aufrufer selbst berechnen und waere Zierrat. Der Zeitstempel steht INNEN,
   damit auch das Alter nicht faelschbar ist. */
async function signiere(inhalt: string, geheim: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(geheim),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(inhalt));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const geheim = Deno.env.get("LOESCH_SIGNATUR_KEY");
  if (!geheim) return json({ fehler: "LOESCH_SIGNATUR_KEY nicht gesetzt" }, 500);

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  /* ⚠ DER AUFRUFER WIRD AUFGELOEST, nicht nur sein Header gezaehlt. */
  const auf = await holeAufrufer(req, db);
  if (!("aufrufer" in auf)) return json({ fehler: auf.fehler }, auf.status);
  const aufrufer = auf.aufrufer;

  const nichtAdmin = pruefeAdmin(aufrufer);
  if (nichtAdmin) return json({ fehler: nichtAdmin.fehler }, nichtAdmin.status);

  let body: { aktion?: string; person_id?: string; abdruck?: string; anlass?: string };
  try { body = await req.json(); } catch { return json({ fehler: "Kein gültiger Aufruf" }, 400); }

  const aktion = String(body.aktion ?? "");
  const personId = String(body.person_id ?? "");
  if (aktion !== "vorschau" && aktion !== "loeschen") return json({ fehler: `Unbekannte Aktion: ${aktion}` }, 400);
  if (!personId) return json({ fehler: "person_id fehlt" }, 400);

  /* ⚠ KEIN SELBSTLOESCHEN. Wer sich selbst entfernt, nimmt sein eigenes
     Konto mit und kann den Vorgang nicht zu Ende protokollieren. */
  const selbst = pruefeNichtSelbst(aufrufer, personId, "löschen");
  if (selbst) return json({ fehler: selbst.fehler }, selbst.status);

  const gemessen = await zaehle(db, personId);
  if (!gemessen) return json({ fehler: "Person nicht gefunden oder nicht vollständig lesbar" }, 404);

  /* ⚠ MANDANT. Ohne diese Pruefung koennte ein Admin des einen Vereins eine
     Person des anderen loeschen — die Function laeuft mit `service_role` und
     kennt keine RLS. */
  const { data: ziel } = await db.from("personen").select("verein_id").eq("id", personId).maybeSingle();
  const fremd = pruefeVerein(aufrufer, (ziel?.verein_id as string | null) ?? null);
  if (fremd) return json({ fehler: fremd.fehler }, fremd.status);

  const vorschau = formeVorschau(gemessen.person, gemessen.zahlen,
    { faellt: FAELLT, anonym: ANONYM, blockiert: [] }, UNTER);
  const daten = fingerabdruckDaten(vorschau);

  // ── Vorschau ────────────────────────────────────────────────────────────
  if (aktion === "vorschau") {
    const bis = Date.now() + GUELTIG_MINUTEN * 60_000;
    const abdruck = `${bis}.${await signiere(`${bis}.${daten}`, geheim)}`;
    return json({ vorschau, abdruck, gueltig_bis: new Date(bis).toISOString() });
  }

  // ── Loeschen ────────────────────────────────────────────────────────────
  const abdruck = String(body.abdruck ?? "");
  const [bisRoh, sig] = abdruck.split(".");
  const bis = Number(bisRoh);
  if (!sig || !Number.isFinite(bis)) return json({ fehler: "Kein gültiger Abdruck — bitte die Vorschau erneut öffnen." }, 400);
  if (Date.now() > bis) {
    return json({ fehler: `Die Vorschau ist älter als ${GUELTIG_MINUTEN} Minuten. Bitte erneut öffnen.` }, 409);
  }

  /* ⚠ NEU MESSEN UND VERGLEICHEN. Der signierte Abdruck sagt, was bei der
     Vorschau galt; `daten` sagt, was JETZT gilt. */
  const erwartet = await signiere(`${bis}.${daten}`, geheim);
  if (erwartet !== sig) {
    /* Um sagen zu koennen, WAS sich geaendert hat, wird der Abdruck nicht
       nur verworfen — die Vorschau von damals steckt nicht darin, aber der
       Aufrufer schickt sie mit, und was zaehlt, ist der Unterschied zum
       Jetzt. Ohne mitgeschickte Zahlen bleibt die allgemeine Meldung. */
    const alt = String((body as { zahlen_alt?: string }).zahlen_alt ?? "");
    const unterschiede = alt ? nenneUnterschiede(alt, daten) : [];
    return json({
      fehler: unterschiede.length
        ? `Seit der Vorschau hat sich etwas geändert, es wurde NICHT gelöscht: ${unterschiede.join(", ")}. Bitte die Vorschau erneut öffnen.`
        : "Seit der Vorschau hat sich etwas geändert oder der Abdruck passt nicht. Es wurde NICHT gelöscht — bitte die Vorschau erneut öffnen.",
      unterschiede,
    }, 409);
  }

  /* ⚠ DAS PROTOKOLL KOMMT VORHER. Danach gibt es niemanden mehr, ueber den
     man protokollieren koennte. Es geht nach `audit_log` — die Tabelle
     haengt nicht an `personen` und loescht sich nicht mit.

     ⚠ OHNE E-MAIL UND OHNE NAMEN (Entscheid Didi, 23.08.2026): das ist die
     Richtung, die sich umkehren laesst. Was der Verein damit NICHT kann —
     belegen, dass eine BESTIMMTE Loeschung ausgefuehrt wurde — steht im
     Auftrag als Frage an die Datenschutzstelle. */
  const { error: logErr } = await db.from("audit_log").insert({
    verein_id: aufrufer.verein_id,
    benutzer_id: aufrufer.id,
    aktion: "person_geloescht",
    tabelle: "personen",
    vorher: { zahlen: vorschau.zahlen, anlass: String(body.anlass ?? "verwaltung") },
  });
  if (logErr) {
    console.error("person-loeschen: Protokoll fehlgeschlagen:", logErr.message);
    return json({ fehler: "Das Protokoll konnte nicht geschrieben werden — es wurde NICHT gelöscht." }, 500);
  }

  /* ── Die Kette, in fester Reihenfolge ──────────────────────────────────
     Drei Fremdschluessel auf `personen` blockieren (benutzer, eltern_kinder,
     mitglieder); alles andere kaskadiert oder wird auf NULL gesetzt. */
  const { data: mids } = await db.from("mitglieder").select("id").eq("person_id", personId);
  const mitgliedIds = (mids ?? []).map(m => m.id as number);

  if (mitgliedIds.length) {
    const { error } = await db.from("eltern_kinder").delete().in("mitglied_id", mitgliedIds);
    if (error) return json({ fehler: `Eltern-Verknüpfungen (als Kind): ${error.message}` }, 500);
  }
  {
    const { error } = await db.from("eltern_kinder").delete().eq("person_id", personId);
    if (error) return json({ fehler: `Eltern-Verknüpfungen: ${error.message}` }, 500);
  }
  {
    const { error } = await db.from("mitglieder").delete().eq("person_id", personId);
    if (error) return json({ fehler: `Mitgliedschaften: ${error.message}` }, 500);
  }

  /* Konto und Auth-Konto. ⚠ Eine Zeile in `benutzer` zu loeschen entfernt
     das Auth-Konto NICHT — E-Mail und Login blieben in `auth.users` stehen
     und blockierten die Adresse fuer jede erneute Registrierung. Das ist der
     Grund, warum dieser Vorgang eine Edge Function braucht. */
  const { data: konten } = await db.from("benutzer").select("id").eq("person_id", personId);
  for (const k of konten ?? []) {
    const kontoId = k.id as string;
    const { error } = await db.from("benutzer").delete().eq("id", kontoId);
    if (error) return json({ fehler: `Portal-Konto: ${error.message}` }, 500);

    /* ⚠ DIESELBE ID. `benutzer.id` ist die Auth-Id — kein zweiter Schluessel,
       kein Nachschlagen. Ich hatte hier zuerst ein `auth_user_id` angenommen;
       waere es `undefined` geblieben, haette der Aufruf still uebersprungen:
       die `benutzer`-Zeile weg, das Auth-Konto stehen, die Adresse dauerhaft
       fuer jede erneute Registrierung blockiert — und nur eine Zeile in der
       Konsole. Genau die Sorte Ausfall, die wie eine Datenlage aussieht. */
    const { error: aFehler } = await db.auth.admin.deleteUser(kontoId);
    if (aFehler) {
      console.error("person-loeschen: auth.users:", aFehler.message);
      return json({
        fehler: `Das Portal-Konto wurde entfernt, das Anmeldekonto NICHT (${aFehler.message}). `
              + "Die E-Mail-Adresse bleibt blockiert — bitte im Supabase-Dashboard nachsehen.",
      }, 500);
    }
  }

  {
    const { error } = await db.from("personen").delete().eq("id", personId);
    if (error) return json({ fehler: `Person: ${error.message}` }, 500);
  }

  return json({
    geloescht: true,
    zahlen: vorschau.zahlen,
    /* ⚠ Genannt, nicht verschwiegen: was die Vorschau nicht pruefen konnte,
       konnte auch dieser Lauf nicht aufraeumen. */
    nicht_geprueft: [...NICHT_PRUEFBAR],
  });
});
