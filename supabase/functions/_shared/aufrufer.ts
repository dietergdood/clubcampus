// ClubCampus — supabase/functions/_shared/aufrufer.ts
//
// Wer ruft da an? — die eine Stelle, an der eine Edge Function ihren Aufrufer
// auflöst.
//
// ⚠ WARUM DAS HIER LIEGT UND NICHT ZWEIMAL. `person-loeschen` und
//   `invite-user` brauchen dieselbe Prüfung. Zweimal geschrieben laufen sie
//   auseinander — und zwar in der Richtung, die niemand bemerkt: eine der
//   beiden bleibt beim nächsten Mal stehen, und dass sie weniger prüft als
//   die andere, meldet nichts.
//
// ⚠ EIN `Authorization`-HEADER IST KEINE ANMELDUNG. Genau das war der Defekt
//   in `invite-user`: sie prüfte, DASS ein Header da ist. Bei Supabase steht
//   dort im Normalfall der **publishable key** — der liegt im
//   JavaScript-Bündel jeder Seite und ist öffentlich. Gemessen am 23.08.2026
//   gegen die laufende Function: ein Aufruf mit blossem `sb_publishable_…`
//   kam bis in die Rumpfprüfung („E-Mail fehlt", 400). Der Gateway-Schalter
//   `verify_jwt` fängt das NICHT ab: er prüft die Gültigkeit des Schlüssels,
//   nicht, ob ein Mensch dahintersteht.
//
//   Deshalb wird der Token hier AUFGELÖST statt gezählt. Ein publishable key
//   ergibt dabei keinen Benutzer.
//
// Die Regeln, was der aufgelöste Aufrufer dann darf, stehen getrennt in
// `aufruferRegeln.ts` — ohne `esm.sh`-Import, damit die Prüfkette des Portals
// sie lesen kann.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Aufrufer, Abweisung } from "./aufruferRegeln.ts";

export * from "./aufruferRegeln.ts";

/**
 * Den Aufrufer aus dem `Authorization`-Header auflösen.
 *
 * ⚠ MIT DEM SERVICE-ROLE-CLIENT, nicht mit einem zweiten Client auf den
 * anon-Schlüssel. `getUser(token)` prüft den mitgegebenen Token beim
 * Auth-Server; ein eigener Client dafür bräuchte `SUPABASE_ANON_KEY`, und den
 * gibt es im neuen Schlüsselformat nicht mehr zwingend. Eine Rechteprüfung,
 * die an einer optionalen Umgebungsvariable hängt, fällt irgendwann still aus.
 */
export async function holeAufrufer(
  req: Request, db: SupabaseClient,
): Promise<{ aufrufer: Aufrufer } | Abweisung> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { fehler: "Nicht angemeldet", status: 401 };

  const { data: auth, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth?.user) return { fehler: "Nicht angemeldet", status: 401 };

  /* ⚠ `benutzer.id` IST die Auth-Id — es gibt keine Spalte `auth_user_id`.
     Ich hatte sie angenommen; gemessen am 23.08.2026 gegen das Schema und
     gegen `useDbUser`, das mit `.eq("id", uid)` aus der Sitzung liest. */
  const { data, error } = await db.from("benutzer")
    .select("id, person_id, verein_id, ist_admin, aktiv")
    .eq("id", auth.user.id).maybeSingle();

  /* ⚠ `error` wird gelesen und NICHT auf „kein Konto" abgebildet. Ein
     Lesefehler ist keine Aussage über die Berechtigung; wer ihn als
     „nicht berechtigt" durchgehen lässt, sieht bei einem Ausfall eine
     Rechtemeldung und sucht an der falschen Stelle. */
  if (error) return { fehler: "Aufrufer nicht lesbar", status: 500 };
  if (!data) return { fehler: "Kein Konto in diesem Portal", status: 403 };

  return {
    aufrufer: {
      id: data.id as string,
      person_id: (data.person_id as string | null) ?? null,
      verein_id: data.verein_id as string,
      ist_admin: data.ist_admin === true,
      aktiv: data.aktiv !== false,
    },
  };
}
