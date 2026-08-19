/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/sfv/sfvService.ts
   SFV Club API: Teamliste holen und Zuordnung speichern.

   Die Teamliste kommt NICHT aus der Datenbank, sondern bei jedem
   Öffnen frisch aus der Edge Function `sfv-sync`. Grund: sie ist der
   Massstab, gegen den die gespeicherte Zuordnung geprüft wird. Läge
   sie gespiegelt in der DB, prüfte man die Kopie gegen sich selbst.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb, Team } from "../../types.ts";

/* Eine Zeile aus /api/team/list, auf das reduziert, was die Zuordnung
   braucht. Enthält keine Personendaten — der Endpunkt liefert keine. */
export interface SfvTeam {
  sfv_team_id: number;
  name: string;
  voller_name: string;
  liga_id: number | null;
  liga_name: string;
  division: string;
  aktiv: boolean;
}

export interface SfvTeamAntwort {
  saison: { id: number; name: string };
  teams: SfvTeam[];
}

/* Eine Zeile der Zuordnungsansicht: ein SFV-Team und das ClubCampus-Team,
   das darauf zeigt (oder keines). */
export interface ZuordnungZeile {
  sfv: SfvTeam;
  team: Team | null;
}

export interface Zuordnung {
  zeilen: ZuordnungZeile[];
  /* ClubCampus-Teams, die eine sfv_team_id tragen, welche in der aktuellen
     Saisonliste nicht mehr vorkommt. Entsteht, wenn ein Team aufgelöst wird
     oder eine neue SFV-Id bekommt. Sie dürfen in der Auswahl nicht als
     „frei" erscheinen, sonst überschreibt man eine Zuordnung, ohne es zu
     merken. */
  veraltet: Team[];
  /* Noch gar nicht zugeordnete ClubCampus-Teams. */
  offen: Team[];
}

/* ── Reine Logik, ohne sb — damit prüfbar ────────────────────────── */
export function baueZuordnung(sfvTeams: SfvTeam[], teams: Team[]): Zuordnung {
  const bekannt = new Set(sfvTeams.map((s) => s.sfv_team_id));
  const nachSfvId = new Map<number, Team>();
  for (const t of teams) {
    const id = (t as Team & { sfv_team_id?: number | null }).sfv_team_id;
    if (id != null) nachSfvId.set(Number(id), t);
  }

  const zeilen = sfvTeams.map((sfv) => ({ sfv, team: nachSfvId.get(sfv.sfv_team_id) ?? null }));

  const veraltet: Team[] = [];
  const offen: Team[] = [];
  for (const t of teams) {
    const id = (t as Team & { sfv_team_id?: number | null }).sfv_team_id;
    if (id == null) offen.push(t);
    else if (!bekannt.has(Number(id))) veraltet.push(t);
  }
  return { zeilen, veraltet, offen };
}

/* Welche ClubCampus-Teams stehen für ein bestimmtes SFV-Team zur Auswahl?
   Alle, die noch keine Zuordnung haben — plus das bereits zugeordnete, damit
   es in seinem eigenen Auswahlfeld sichtbar bleibt. Verwaiste bleiben
   draussen: sie hängen an einer anderen, wenn auch toten Id. */
export function auswahlFuer(zuordnung: Zuordnung, sfvTeamId: number): Team[] {
  const eigenes = zuordnung.zeilen.find((z) => z.sfv.sfv_team_id === sfvTeamId)?.team;
  return eigenes ? [eigenes, ...zuordnung.offen] : zuordnung.offen;
}

/* ── Zugriffe ────────────────────────────────────────────────────── */

/** Teamliste der laufenden Saison über die Edge Function. */
export async function fetchSfvTeams(sb: Sb): Promise<{ daten: SfvTeamAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "teams" } });
  if (error) return { daten: null, fehler: data?.fehler || error.message || "Abruf fehlgeschlagen" };
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  if (!data?.teams) return { daten: null, fehler: "Antwort ohne Teamliste" };
  return { daten: data as SfvTeamAntwort, fehler: null };
}

/** Zuordnung setzen oder (mit sfv = null) lösen.
    Kein verein_id nötig: update ist davon nicht betroffen, die Spalte steht. */
export async function setzeTeamZuordnung(sb: Sb, teamId: number, sfv: SfvTeam | null): Promise<string | null> {
  if (!sb) return "Keine Verbindung";
  const felder = sfv
    ? { sfv_team_id: sfv.sfv_team_id, sfv_liga_id: sfv.liga_id, sfv_liga_name: sfv.liga_name, sfv_division: sfv.division }
    : { sfv_team_id: null, sfv_liga_id: null, sfv_liga_name: null, sfv_division: null };

  const { error } = await sb.from("teams").update(felder).eq("id", teamId);
  if (!error) return null;
  /* teams_verein_sfv_team_key: ein SFV-Team kann nicht an zwei Teams hängen. */
  if (error.code === "23505") return "Dieses SFV-Team ist bereits einem anderen Team zugeordnet.";
  return error.message || "Speichern fehlgeschlagen";
}

/** Ergebnis eines Laufs, wie index.ts es zurückgibt. Bewusst locker
    typisiert: die Zusammensetzung steht in sync.ts und wächst dort. */
export interface SyncAntwort {
  laeufe?: Array<Record<string, unknown>>;
  hinweis?: string;
  fehler?: string;
}

/**
 * Einen Sync-Lauf von Hand anstossen.
 *
 * Läuft über den Admin-JWT-Pfad der Edge Function — der ignoriert
 * `auto_sync` (das filtert nur den Zeitplan) und bearbeitet genau den
 * eigenen Verein. So lässt sich ein Lauf gezielt auslösen, während der
 * stündliche Auftrag abgeschaltet ist.
 *
 * ⚠ Die Antwort kommt direkt zurück, nicht nur nach `api_sync_log` — wer
 * von Hand anstösst, will sehen, was herauskam, und nicht nachschlagen.
 */
export async function starteSync(
  sb: Sb, nur?: "spielplan" | "rangliste",
): Promise<{ daten: SyncAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", {
    body: nur ? { aktion: "sync", nur } : { aktion: "sync" },
  });
  if (error) return { daten: null, fehler: data?.fehler || error.message || "Lauf fehlgeschlagen" };
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  return { daten: data as SyncAntwort, fehler: null };
}
