// ClubCampus — supabase/functions/invite-user/index.ts
//
// Eine Einladung in den Portal-Zugang verschicken (Supabase Auth Admin API).
// Aufgerufen, wenn eine Person Zugang bekommen soll, aber noch kein Konto hat.
//
// ⚠ REPARATUR VOM 23.08.2026 — WAS VORHER OFFENSTAND.
//
//   Die Function prüfte, DASS ein `Authorization`-Header da ist. Nicht, wer
//   dahintersteht. Bei Supabase steht dort im Normalfall der **publishable
//   key**, und der liegt im JavaScript-Bündel jeder Seite — er ist
//   öffentlich, das ist sein Zweck.
//
//   Gemessen, nicht vermutet: ein Aufruf mit blossem `sb_publishable_…`,
//   ohne jede Anmeldung, kam bis in die Rumpfprüfung („E-Mail fehlt", 400).
//   Der Gateway-Schalter `verify_jwt` fängt das nicht ab — er prüft die
//   Gültigkeit des Schlüssels, nicht, ob ein Mensch dahintersteht.
//
//   Damit konnte jeder, der die Seite aufruft, Einladungs-E-Mails **im Namen
//   des Vereins an beliebige Adressen** verschicken. Die Mail kommt vom
//   Auth-Server des Projekts, trägt Absender und Aussehen des Portals und
//   enthält einen gültigen Anmeldelink.
//
// ⚠ ZWEITER AUSGANG, DERSELBE FEHLER: `redirect_url` kam aus dem Aufruf und
//   landete als Link IN DER MAIL. Eine Einladung, deren Ziel der Aufrufer
//   bestimmt, ist eine Weiterleitung mit dem Briefkopf des Vereins. Das Ziel
//   wird jetzt aus dem Slug des Vereins gebaut, serverseitig.
//
//   Muster: Erlaubtes aufzählen, nicht Verbotenes — dieselbe Regel wie bei
//   Fremddaten. Der Aufrufer nennt eine PERSON, nicht eine Adresse und nicht
//   ein Ziel.
//
// ⚠ DRITTER FUND: `listUsers()` liefert ohne Angabe nur die erste Seite
//   (50 Konten). Die Prüfung „gibt es das Konto schon?" hätte ab dem
//   51. Konto still `false` ergeben. Heute sind es fünf — die Lücke wäre
//   also erst dann aufgefallen, wenn das Portal zu wachsen beginnt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { holeAufrufer, pruefeAdmin, pruefeVerein } from "../_shared/aufrufer.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

/**
 * Wohin die Einladung führt. Kommt NICHT aus dem Aufruf.
 *
 * ⚠ GEMESSEN AM 23.08.2026, nicht abgeschrieben: `clubcampus.app` antwortet
 * mit 308 auf `www.clubcampus.app`, und DAS ist das Portal. Die alte
 * Rückfallanschrift `https://clubcampus.app` hätte also einen Umweg in den
 * Mail-Link gelegt — und ein Umleitungssprung in einer Anmelde-Mail ist
 * genau das, was strenge Mailprogramme abschneiden.
 *
 * ⚠ Und README Zeile 208 ist überholt: dort steht, `clubcampus.app` zeige
 * NICHT auf dieses Deployment und man müsse die `vercel.app`-Adresse nehmen.
 * Die zeigt heute 404; die Domain ist inzwischen verbunden.
 *
 * ⚠ DAS ZIEL MUSS IN DER SUPABASE-REDIRECT-ALLOWLIST STEHEN (Auth →
 * URL Configuration). Steht es nicht drin, verschickt Supabase die Einladung
 * trotzdem — mit der Site-URL statt des Ziels. Kein Fehler, keine Meldung,
 * nur ein Link, der woanders landet.
 */
const BASIS = Deno.env.get("PORTAL_BASIS_URL") ?? "https://www.clubcampus.app";

/**
 * Gibt es zu dieser Adresse schon ein Anmeldekonto?
 *
 * ⚠ SEITENWEISE. `listUsers()` ohne Angabe liefert 50 Konten; alles darüber
 * fiele stillschweigend durch die Prüfung. Die Obergrenze ist ein Riegel
 * gegen eine Endlosschleife, kein Mengenlimit — sie wird gemeldet, statt
 * ein „nein" vorzutäuschen.
 */
async function kontoVorhanden(db: SupabaseClient, email: string): Promise<boolean | "unklar"> {
  const gesucht = email.trim().toLowerCase();
  for (let seite = 1; seite <= 20; seite++) {
    const { data, error } = await db.auth.admin.listUsers({ page: seite, perPage: 1000 });
    if (error) return "unklar";
    const users = data?.users ?? [];
    if (users.some(u => (u.email ?? "").toLowerCase() === gesucht)) return true;
    if (users.length < 1000) return false;
  }
  return "unklar";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const auf = await holeAufrufer(req, db);
  if (!("aufrufer" in auf)) return json({ error: auf.fehler }, auf.status);
  const aufrufer = auf.aufrufer;

  const nichtAdmin = pruefeAdmin(aufrufer);
  if (nichtAdmin) return json({ error: nichtAdmin.fehler }, nichtAdmin.status);

  let body: { person_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Kein gültiger Aufruf" }, 400); }

  const personId = String(body.person_id ?? "");
  if (!personId) return json({ error: "person_id fehlt" }, 400);

  /* ⚠ DIE ADRESSE KOMMT AUS DER DATENBANK, nicht aus dem Aufruf. Genau das
     macht die Vereinsprüfung darunter wirksam: eine mitgeschickte E-Mail
     liesse sich nicht gegen einen Verein halten. */
  const { data: person, error: pErr } = await db.from("personen")
    .select("id, vorname, nachname, email, verein_id").eq("id", personId).maybeSingle();
  if (pErr) return json({ error: "Person nicht lesbar" }, 500);
  if (!person) return json({ error: "Person nicht gefunden" }, 404);

  const fremd = pruefeVerein(aufrufer, person.verein_id as string | null);
  if (fremd) return json({ error: fremd.fehler }, fremd.status);

  const email = ((person.email as string | null) ?? "").trim();
  if (!email) {
    return json({ error: "Diese Person hat keine E-Mail-Adresse. Bitte zuerst im Profil erfassen." }, 400);
  }

  const vorhanden = await kontoVorhanden(db, email);
  if (vorhanden === "unklar") {
    return json({ error: "Die bestehenden Konten liessen sich nicht prüfen — es wurde nichts verschickt." }, 500);
  }
  if (vorhanden) {
    return json({ error: "Ein Konto mit dieser E-Mail existiert bereits. Bitte direkt verknüpfen." }, 409);
  }

  /* Das Ziel aus dem Verein, nicht aus dem Aufruf. */
  const { data: verein } = await db.from("vereine")
    .select("slug").eq("id", aufrufer.verein_id).maybeSingle();
  const ziel = `${BASIS}/${(verein?.slug as string | null) ?? ""}`;

  const { error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: ziel });
  if (error) return json({ error: error.message }, 500);

  /* ⚠ EINE EINLADUNG IST EIN VORGANG NACH AUSSEN und gehört protokolliert —
     sichtbar und nachvollziehbar statt unsichtbar und bequem. Ohne die
     Adresse: was hier steht, steht dauerhaft. */
  const { error: logErr } = await db.from("audit_log").insert({
    verein_id: aufrufer.verein_id,
    benutzer_id: aufrufer.id,
    aktion: "einladung_gesendet",
    tabelle: "personen",
    datensatz_id: personId,
  });
  /* Das Protokoll kommt hier NACH der Handlung — anders als beim Löschen,
     wo es vorher kommen muss, weil es hinterher niemanden mehr gibt. Ein
     Fehlschlag darf die bereits verschickte Mail nicht zu einem Fehler
     machen, wird aber gemeldet statt verschluckt. */
  if (logErr) console.error("invite-user: Protokoll fehlgeschlagen:", logErr.message);

  return json({ ok: true, email, protokolliert: !logErr });
});
