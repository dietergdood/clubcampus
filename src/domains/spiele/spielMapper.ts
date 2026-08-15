/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/spielMapper.ts
   DB → UI, reine Abbildung ohne sb.

   Die Anzeige wird nicht umgeschrieben, die Daten werden in ihre
   Form gebracht — dasselbe Vorgehen wie bei memberMapper. `SpielDetail`
   liest neunzehn Felder in camelCase; diese Datei liefert sie.
   ═══════════════════════════════════════════════════════════════ */
import type { Tables } from "../../database.types.ts";

export type SpielZeile = Tables<"spiele">;
export type RanglisteZeile = Tables<"ranglisten">;

/* SFV-Kennzahlen, die die Anzeige braucht. Der Klartext steht daneben in
   status/wettbewerb, gefiltert wird über die Zahl — sie ist sprachfest. */
const TYP_TRAININGSSPIEL = 3;
const STATUS_AUSGETRAGEN = 2;
const STATUS_VERSCHOBEN = 6;
const STATUS_FINDET_NICHT_STATT = 10;

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export interface SpielUi {
  id: string;
  team: string;
  /* Anzeige: "Sa 24.05." */
  date: string;
  /* Sortierung und Vergleich: "2026-05-24". Früher wurde dafür der
     Anzeigetext zurückgerechnet und fest "2026-" davorgeklebt — in der
     nächsten Saison hätte das falsch sortiert. */
  iso: string;
  time: string;
  opponent: string;
  home: boolean;
  venue: string;
  venueAddr: string;
  comp: string;
  liga: string;
  spielNr: string;
  status: string;
  result: string | null;
  htResult: string | null;
  att: number | null;
  schiedsrichter: string;
  delegierter: string;
  notes: string;
  treffpunkt: string;
  /* Es gibt keine Tabelle für Aufstellungen, Tore und Karten — das ist das
     Matchdaten-Modul und nicht Teil dieses Auftrags. */
  stats: null;
  trainingsspiel: boolean;
  abgesagt: boolean;
  verschoben: boolean;
}

/** Die SFV-Saison ist nach dem Endjahr benannt: 2027 = 1.7.2026 bis 30.6.2027. */
export function aktuelleSfvSaison(jetzt: Date = new Date()): number {
  return jetzt.getMonth() + 1 >= 7 ? jetzt.getFullYear() + 1 : jetzt.getFullYear();
}

/** Zeitraum einer SFV-Saison als ISO-Daten. */
export function saisonZeitraum(saison: number): { von: string; bis: string } {
  return { von: `${saison - 1}-07-01`, bis: `${saison}-06-30` };
}

export function formatDatum(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = String(d.getDate()).padStart(2, "0");
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  return `${WOCHENTAGE[d.getDay()]} ${tag}.${monat}.`;
}

export function mapSpiel(z: SpielZeile): SpielUi {
  const iso = String(z.date ?? "");
  const abgesagt = z.sfv_status === STATUS_FINDET_NICHT_STATT
    || /abgesagt|findet nicht statt/i.test(z.status ?? "");
  return {
    id: z.id,
    team: z.team ?? "",
    date: iso ? formatDatum(iso) : "",
    iso,
    time: (z.zeit ?? "").slice(0, 5),
    opponent: z.gegner ?? "",
    home: z.heimspiel !== false,
    venue: z.venue ?? "",
    venueAddr: z.venue_addr ?? "",
    comp: z.wettbewerb ?? "",
    liga: z.liga ?? "",
    spielNr: z.spiel_nr ?? "",
    status: z.status ?? "",
    /* resultat steht nur bei ausgetragenen Spielen; alle anderen führt der
       SFV auf 0:0. Der Sync schreibt deshalb NULL — hier wird nichts
       nachgeholfen. */
    result: z.resultat ?? null,
    htResult: z.ht_resultat ?? null,
    att: z.zuschauer ?? null,
    schiedsrichter: z.schiedsrichter ?? "",
    delegierter: z.delegierter ?? "",
    notes: z.notes ?? "",
    treffpunkt: z.treffpunkt ?? "",
    stats: null,
    trainingsspiel: z.sfv_spiel_typ === TYP_TRAININGSSPIEL,
    abgesagt,
    verschoben: z.sfv_status === STATUS_VERSCHOBEN,
  };
}

/** Gespielte zuerst, dann kommende — beide nach Datum. */
export function sortiereSpiele(spiele: SpielUi[]): SpielUi[] {
  const nachDatum = (a: SpielUi, b: SpielUi) => a.iso.localeCompare(b.iso) || a.time.localeCompare(b.time);
  return [
    ...spiele.filter((g) => g.result).sort(nachDatum),
    ...spiele.filter((g) => !g.result).sort(nachDatum),
  ];
}

/* ── Rangliste ──────────────────────────────────────────────────── */

export interface TabellenZeile {
  rank: number;
  team: string;
  sp: number;
  s: number;
  u: number;
  n: number;
  tore: string;
  diff: number;
  pts: number;
  me: boolean;
}

/* Was der Bezug zur Rangliste von einem Team braucht — mehr nicht.
   Bewusst strukturell und locker gehalten: die Aufrufer reichen teils den
   vollen `Team`-Typ, teils die schmale `TeamRow` aus TeamModul (Altbestand,
   die dort noch von Hand geschrieben ist). Ein `Pick<Team, …>` würde die
   zweite Form abweisen, ohne dass jemand etwas gewinnt. */
export type TeamZuordnung = { name?: string | null; sfv_team_id?: number | null };

/** Die SFV-Nummer eines Teams anhand seines Namens in ClubCampus.
    An drei Stellen gebraucht (Spielplan-Tabelle, Team-Übersicht,
    Trainer-Dashboard) — deshalb hier und nicht dreimal dort. */
export function sfvTeamIdFuer(teams: TeamZuordnung[], teamName?: string | null): number | null {
  if (!teamName) return null;
  const treffer = teams.find((t) => t.name === teamName);
  return treffer?.sfv_team_id != null ? Number(treffer.sfv_team_id) : null;
}

const gruppenSchluessel = (z: RanglisteZeile) =>
  `${z.sfv_liga_id}|${z.sfv_division_id}|${z.sfv_gruppe_id}`;

/** Die Zeilen der Gruppe, in der dieses SFV-Team steht — nach Rang sortiert.
    Ohne Zuordnung gibt es keine Tabelle: über den Namen zu suchen ginge
    schief, fünf SFV-Teams des FCH heissen gleich. */
export function gruppeFuerTeam(zeilen: RanglisteZeile[], sfvTeamId: number | null): RanglisteZeile[] {
  if (sfvTeamId == null) return [];
  const eigene = zeilen.find((z) => Number(z.sfv_team_id) === Number(sfvTeamId));
  if (!eigene) return [];
  const schluessel = gruppenSchluessel(eigene);
  return zeilen
    .filter((z) => gruppenSchluessel(z) === schluessel)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
}

/** `me` kommt aus der Zuordnung, nicht aus dem Namen und nicht aus der
    Vereinsnummer — die steht bei uns nirgends. */
export function mapRangliste(zeilen: RanglisteZeile[], sfvTeamId: number | null): TabellenZeile[] {
  return zeilen.map((z) => ({
    rank: z.position ?? 0,
    team: z.team_name ?? "",
    sp: z.anzahl_spiele ?? 0,
    s: z.siege ?? 0,
    u: z.unentschieden ?? 0,
    n: z.niederlagen ?? 0,
    tore: `${z.tore ?? 0}:${z.gegentore ?? 0}`,
    diff: (z.tore ?? 0) - (z.gegentore ?? 0),
    pts: z.punkte ?? 0,
    me: sfvTeamId != null && Number(z.sfv_team_id) === Number(sfvTeamId),
  }));
}
