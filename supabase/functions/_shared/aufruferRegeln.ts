// ClubCampus — supabase/functions/_shared/aufruferRegeln.ts
//
// Wer darf was — die Entscheidung, ohne Netz.
//
// ⚠ WARUM DIESE DATEI GETRENNT VON `aufrufer.ts` LIEGT. Das Auflösen des
//   Aufrufers braucht einen Supabase-Client, und dessen Typ kommt von
//   `esm.sh`. Eine Datei mit einem `esm.sh`-Import kann `tsc` nicht lesen und
//   Vitest nicht laden — sie wäre für die Prüfkette des Portals unerreichbar.
//
//   Die Regeln stehen deshalb hier, ohne Import. Sie sind der Teil, der eine
//   Aussage trifft, und genau der gehört geprüft. Dieselbe Trennung wie bei
//   `person-loeschen/vorschau.ts`.

export interface Aufrufer {
  /** ⚠ IST die Auth-Id — es gibt keine Spalte `auth_user_id`. */
  id: string;
  person_id: string | null;
  verein_id: string;
  ist_admin: boolean;
  aktiv: boolean;
}

/** Warum jemand nicht darf — mit dem Status, den die Antwort tragen soll. */
export interface Abweisung {
  fehler: string;
  status: number;
}

/** Aktives Konto mit Adminrecht. `null` heisst: darf. */
export function pruefeAdmin(a: Aufrufer): Abweisung | null {
  if (!a.aktiv) return { fehler: "Kein aktives Konto", status: 403 };
  if (!a.ist_admin) return { fehler: "Nur Administratoren", status: 403 };
  return null;
}

/**
 * Derselbe Verein.
 *
 * ⚠ OHNE DIESE PRÜFUNG IST MANDANTENFÄHIGKEIT AUFGEHOBEN. Eine Edge Function
 * läuft mit `service_role` und kennt keine RLS — der Admin des einen Vereins
 * greift sonst auf die Daten des anderen, und keine Policy hält ihn auf.
 *
 * ⚠ EIN FEHLENDER VEREIN IST KEIN TREFFER. `null === null` wäre wahr; die
 * Prüfung weist deshalb ausdrücklich ab, statt die Gleichheit zu vergleichen.
 */
export function pruefeVerein(a: Aufrufer, zielVereinId: string | null | undefined): Abweisung | null {
  if (!zielVereinId) return { fehler: "Ziel hat keinen Verein", status: 404 };
  if (zielVereinId !== a.verein_id) {
    return { fehler: "Diese Person gehört zu einem anderen Verein.", status: 403 };
  }
  return null;
}

/**
 * Nicht auf sich selbst anwenden.
 *
 * ⚠ EIN AUFRUFER OHNE `person_id` IST NICHT „DIESELBE PERSON". Auch hier wäre
 * `null === null` sonst wahr, und ein Konto ohne verknüpfte Person käme an
 * keine einzige Person mehr heran.
 */
export function pruefeNichtSelbst(
  a: Aufrufer, zielPersonId: string, was: string,
): Abweisung | null {
  if (a.person_id && a.person_id === zielPersonId) {
    return { fehler: `Das eigene Konto lässt sich hier nicht ${was}.`, status: 400 };
  }
  return null;
}
