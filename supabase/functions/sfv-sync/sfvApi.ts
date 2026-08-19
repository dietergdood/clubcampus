// ClubCampus — supabase/functions/sfv-sync/sfvApi.ts
// Zugriff auf die SFV Club API. Kennt die Datenbank nicht.
//
// EIN TOKEN PRO LAUF. Die API kennt pro Anwendung genau einen gueltigen
// Token; ein zweiter POST /api/token macht den ersten sofort ungueltig
// (am 13.08.2026 gemessen). Deshalb gibt holeToken() den Token zurueck und
// alle weiteren Aufrufe bekommen ihn gereicht — nie holt sich einer selbst
// einen neuen.
//
// NICHTS INS LOG. In dieser Datei steht kein console.*, und kein Fehlertext
// enthaelt den Antwortkoerper des SFV oder den Token.

export interface SfvZugang {
  basis: string;
  key: string;
  pass: string;
  clubId: string;
}

export class SfvFehler extends Error {}

export async function holeToken(z: SfvZugang): Promise<string> {
  let antwort: Response;
  try {
    antwort = await fetch(`${z.basis}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationKey: z.key, applicationPass: z.pass }),
    });
  } catch {
    throw new SfvFehler("SFV nicht erreichbar");
  }
  if (!antwort.ok) throw new SfvFehler(`SFV lehnt die Zugangsdaten ab (HTTP ${antwort.status})`);
  const token = (await antwort.text()).trim().replace(/^"|"$/g, "");
  if (!token) throw new SfvFehler("SFV liefert keinen Token");
  return token;
}

async function hole(z: SfvZugang, token: string, pfad: string): Promise<unknown> {
  let antwort: Response;
  try {
    antwort = await fetch(`${z.basis}${pfad}`, {
      headers: { "X-User-Token": token, "X-User-Language": "1", Accept: "application/json" },
    });
  } catch {
    throw new SfvFehler("SFV nicht erreichbar");
  }
  if (!antwort.ok) throw new SfvFehler(`SFV antwortet mit HTTP ${antwort.status}`);
  let daten: unknown;
  try {
    daten = JSON.parse(await antwort.text());
  } catch {
    throw new SfvFehler("SFV liefert kein JSON");
  }
  /* /api/common/ids liefert einen JSON-String, der JSON enthaelt. */
  if (typeof daten === "string") {
    try { daten = JSON.parse(daten); } catch { /* dann eben der String */ }
  }
  return daten;
}

/* Die SFV-Saison ist nach dem Endjahr benannt: 2027 = Saison 2026/2027,
   1.7.2026 bis 30.6.2027. Aus dem Datum abgeleitet, aber gegen die Liste
   des SFV geprueft — geraten wird nicht. */
export async function holeSaison(z: SfvZugang, token: string, jetzt: Date) {
  const ids = await hole(z, token, `/api/common/ids?ClubId=${z.clubId}&Language=1`) as
    { sfv_ids?: { seasons?: Array<{ id: number; name: string }> } };
  const saisons = ids?.sfv_ids?.seasons ?? [];
  if (saisons.length === 0) throw new SfvFehler("SFV liefert keine Saisonliste");
  const gewuenscht = jetzt.getUTCMonth() + 1 >= 7 ? jetzt.getUTCFullYear() + 1 : jetzt.getUTCFullYear();
  return saisons.find((s) => s.id === gewuenscht) ?? saisons.slice().sort((a, b) => b.id - a.id)[0];
}

export interface SfvTeam {
  sfv_team_id: number;
  name: string;
  voller_name: string;
  liga_id: number | null;
  liga_name: string;
  division: string;
  aktiv: boolean;
}

/* team/list fuehrt keine Personendaten — weder Namen noch Geburtsdaten noch
   Kontakte. Was hier nicht abgebildet wird, verlaesst die Funktion nicht. */
export async function holeTeams(z: SfvZugang, token: string, saisonId: number): Promise<SfvTeam[]> {
  const roh = await hole(z, token, `/api/team/list?SeasonId=${saisonId}&ClubId=${z.clubId}&Language=1`);
  if (!Array.isArray(roh)) throw new SfvFehler("SFV liefert keine Teamliste");
  return roh.map((t: Record<string, unknown>) => ({
    sfv_team_id: t.teamId as number,
    name: (t.teamName as string) ?? "",
    voller_name: (t.teamFullname as string) ?? "",
    liga_id: (t.teamLeagueId as number) ?? null,
    liga_name: (t.teamLeagueName as string) ?? "",
    division: (t.teamDivisionName as string) ?? "",
    aktiv: (t.isTeamActive as boolean) ?? true,
  }));
}

export type SfvSpiel = Record<string, unknown>;

export async function holeSpielplan(z: SfvZugang, token: string, saisonId: number): Promise<SfvSpiel[]> {
  const roh = await hole(z, token, `/api/club/schedule?SeasonId=${saisonId}&ClubId=${z.clubId}&Language=1`);
  if (!Array.isArray(roh)) throw new SfvFehler("SFV liefert keinen Spielplan");
  return roh as SfvSpiel[];
}

export type SfvRangliste = Record<string, unknown>;

export async function holeRangliste(z: SfvZugang, token: string, saisonId: number): Promise<SfvRangliste[]> {
  const roh = await hole(z, token, `/api/club/ranking?SeasonId=${saisonId}&ClubId=${z.clubId}&Language=1`);
  if (!Array.isArray(roh)) throw new SfvFehler("SFV liefert keine Rangliste");
  return roh as SfvRangliste[];
}

/* ── Matchdaten ────────────────────────────────────────────────────────────
   Drei Aufrufe pro Spiel. Nur fuer Spiele, die ausgetragen sind
   (matchState 2) — die Endpunkte liefern nur die laufende Saison, aeltere
   antworten mit 404.

   Sie geben die Rohantwort zurueck und deuten nichts: was uebernommen wird,
   entscheidet die Allowlist in matchdaten.ts. Diese Datei soll den SFV
   kennen, nicht unsere Tabellen. */
export type SfvMatch = Record<string, unknown>;

export async function holeMatch(z: SfvZugang, token: string, matchId: number): Promise<SfvMatch> {
  const roh = await hole(z, token, `/api/match/${matchId}?Language=1`);
  if (!roh || typeof roh !== "object") throw new SfvFehler("SFV liefert kein Spiel");
  return roh as SfvMatch;
}

export async function holeAufstellung(z: SfvZugang, token: string, matchId: number): Promise<SfvMatch[]> {
  const roh = await hole(z, token, `/api/match/${matchId}/players?Language=1`);
  if (!Array.isArray(roh)) throw new SfvFehler("SFV liefert keine Aufstellung");
  return roh as SfvMatch[];
}

export async function holeEreignisse(z: SfvZugang, token: string, matchId: number): Promise<SfvMatch[]> {
  const roh = await hole(z, token, `/api/match/${matchId}/events?Language=1`);
  if (!Array.isArray(roh)) throw new SfvFehler("SFV liefert keine Ereignisse");
  return roh as SfvMatch[];
}

/* Vereinswappen. Der Endpunkt liefert BASE64 als text/plain, nicht das Bild
   — deshalb text() und keine Blob-Behandlung. 404 heisst: der Verein hat
   keines hochgeladen; das ist kein Fehler und wird als solches gemeldet. */
export async function holeTeamBild(
  z: SfvZugang, token: string, teamId: number,
): Promise<string | null> {
  let antwort: Response;
  try {
    antwort = await fetch(`${z.basis}/api/team/picture/${teamId}`, {
      headers: { "X-User-Token": token, "X-User-Language": "1" },
    });
  } catch {
    throw new SfvFehler("SFV nicht erreichbar");
  }
  if (antwort.status === 404) return null;
  if (!antwort.ok) throw new SfvFehler(`SFV antwortet mit HTTP ${antwort.status}`);
  return await antwort.text();
}

/* Schiedsrichter. Ausgenommen bis 20.08.2026 — jetzt aufgenommen, aber NUR
   der Name des Hauptschiedsrichters. Was der Endpunkt sonst liefert
   (Geburtsdatum, Geschlecht, personId, Verein), wird nicht gelesen. */
export async function holeSchiedsrichter(
  z: SfvZugang, token: string, matchId: number,
): Promise<SfvMatch[]> {
  const roh = await hole(z, token, `/api/match/${matchId}/referees?Language=1`);
  return Array.isArray(roh) ? roh as SfvMatch[] : [];
}
