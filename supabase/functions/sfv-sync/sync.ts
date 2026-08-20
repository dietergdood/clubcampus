// ClubCampus — supabase/functions/sfv-sync/sync.ts
// Ein Sync-Lauf für einen Verein: Spielplan und Rangliste holen, abgleichen,
// protokollieren. Kein console.* in dieser Datei.
//
// WAS DER LAUF NIE TUT
//   - Spiele löschen. Auch nicht solche, die der SFV nicht mehr liefert:
//     ein Ausfall dort darf hier keine Daten kosten. Sie werden gezählt.
//   - Zeilen ohne sfv_match_id anfassen. Turniere und interne Spiele bleiben
//     unberührt — jede Zeile der Nutzlast trägt eine sfv_match_id, damit ist
//     es keine Regel, sondern Bauart.
//   - Vereinsfelder überschreiben. Die Spaltenliste kommt aus
//     api_verbindungen.sync_felder, nicht aus diesem Code.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  holeToken, holeSaison, holeTeams, holeSpielplan, holeRangliste, SfvFehler,
} from "./sfvApi.ts";
import { laufeMatchdaten, laufeLogos, UNZUGEORDNET_WARNUNG } from "./matchdatenLauf.ts";
import type { MatchdatenErgebnis } from "./matchdatenLauf.ts";
import type { SfvZugang, SfvTeam, SfvSpiel } from "./sfvApi.ts";

export interface LaufErgebnis {
  status: "ok" | "warnung" | "fehler";
  meldung: string;
  spiele: { neu: number; aktualisiert: number; ohne_team: number; nicht_mehr_geliefert: number };
  ranglisten: { geschrieben: number; entfernt: number; gruppen: number };
  verwaiste_zuordnungen: number;
  derbys: number;
  matchdaten?: MatchdatenErgebnis;
  logos?: { geholt: number; fehlt: number };
  saison?: { id: number; name: string };
}

interface Verbindung { id: string; verein_id: string; api_url: string; sync_felder: Record<string, unknown> }

/* Zehn Spiele pro Lauf: drei Aufrufe je Spiel, dazu die fuenf des
   Spielplans — 35 statt 5. Bei 268 Spielen und stuendlichem Lauf waere
   alles auf einmal nicht tragbar, zumal Rate Limits nicht dokumentiert
   sind. Der Rueckstand ist in zehn Stunden aufgeholt. */
const MATCHDATEN_PRO_LAUF = 10;

/* ── Feldhoheit ───────────────────────────────────────────────────────────
   Die erlaubten Spalten stehen in sync_felder. Diese Funktion schneidet die
   berechnete Zeile darauf zu — und meldet, wenn sync_felder eine Spalte
   nennt, die der Sync gar nicht berechnet. Ohne diese zweite Richtung wäre
   ein Tippfehler in der Liste ein stilles Feld, das nie geschrieben wird. */
export function schneideAufFeldhoheit(
  erlaubt: string[], berechnet: Record<string, unknown>,
): { zeile: Record<string, unknown>; fehlend: string[] } {
  const zeile: Record<string, unknown> = {};
  const fehlend: string[] = [];
  for (const feld of erlaubt) {
    if (!(feld in berechnet)) { fehlend.push(feld); continue; }
    zeile[feld] = berechnet[feld];
  }
  return { zeile, fehlend };
}

/* ── Ein Spiel abbilden ───────────────────────────────────────────────────
   Rückgabe: alle Felder, die der Sync berechnen kann. Welche davon
   geschrieben werden, entscheidet die Feldhoheit, nicht diese Funktion. */
export function bildeSpiel(
  s: SfvSpiel, eigene: Set<number>, namen: Map<number, string>, jetzt: string,
): { zeile: Record<string, unknown>; derby: boolean } | null {
  const aId = s.teamAId as number, bId = s.teamBId as number;
  const aIstUns = eigene.has(aId), bIstUns = eigene.has(bId);
  if (!aIstUns && !bIstUns) return null;

  /* Zwei eigene Teams gegeneinander: der Schlüssel (verein_id, sfv_match_id)
     lässt nur EINE Zeile zu. Das Heimteam bekommt sie. */
  const derby = aIstUns && bIstUns;
  const unsA = aIstUns;
  const unserId = unsA ? aId : bId;
  const gegnerId = unsA ? bId : aId;
  const gegnerName = (unsA ? s.teamNameB : s.teamNameA) as string;

  const datum = String(s.matchDate ?? "");
  const [tag, zeit] = datum.includes("T") ? datum.split("T") : [datum, ""];
  const status = s.matchState as number;

  return {
    derby,
    zeile: {
      /* team ist abgeleitet: aus teams.name über teams.sfv_team_id, NIE aus
         dem SFV-Namen. Ohne Zuordnung ersatzweise der SFV-Name, bis jemand
         zuordnet — die Spalte ist NOT NULL. */
      team: namen.get(unserId) ?? ((unsA ? s.teamNameA : s.teamNameB) as string) ?? "",
      date: tag || null,
      zeit: zeit ? zeit.slice(0, 8) : null,
      gegner: gegnerName ?? "",
      heimspiel: unsA,
      venue: (s.stadiumPlaygroundName as string) ?? null,
      wettbewerb: (s.matchTypeName as string) ?? null,
      liga: (s.leagueName as string) ?? null,
      status: (s.matchStateName as string) ?? null,
      /* Nur bei "ausgetragen" (2). Alle nicht ausgetragenen Spiele stehen
         beim SFV auf 0:0 — aus dem Score allein abgeleitet stünde überall
         "0:0". */
      resultat: status === 2 ? `${s.scoreTeamA}:${s.scoreTeamB}` : null,
      sfv_match_id: s.matchId as number,
      sfv_saison_id: s.seasonId as number,
      sfv_team_id: unserId,
      sfv_gegner_team_id: gegnerId,
      sfv_liga_id: (s.leagueId as number) ?? null,
      sfv_gruppe_id: (s.groupId as number) ?? null,
      sfv_gruppe: (s.groupName as string) ?? null,
      sfv_spiel_typ: (s.matchType as number) ?? null,
      sfv_status: status ?? null,
      /* Die Nummer, die der Verband auf dem Spielbericht fuehrt (511958).
         NICHT spiel_nr — die gehoert dem Verein und wird von Hand
         gepflegt (migration_sfv_spielplan.sql). */
      sfv_spiel_nr: s.matchNumber != null ? String(s.matchNumber) : null,
      sfv_stand: s,
      zuletzt_synchronisiert: jetzt,
    },
  };
}

export function bildeRanglistenZeile(r: Record<string, unknown>, vereinId: string, saisonId: number, jetzt: string) {
  return {
    verein_id: vereinId,
    sfv_saison_id: saisonId,
    sfv_liga_id: (r.leagueId as number) ?? 0,
    sfv_liga_name: (r.leagueName as string) ?? null,
    sfv_division_id: (r.divisionId as number) ?? 0,
    sfv_division_name: (r.divisionName as string) ?? null,
    sfv_gruppe_id: (r.groupId as number) ?? 0,
    sfv_gruppe: (r.groupName as string) ?? null,
    sfv_team_id: (r.teamId as number) ?? 0,
    team_name: (r.teamName as string) ?? null,
    club_nummer: (r.clubNumber as number) ?? null,
    position: (r.position as number) ?? null,
    anzahl_spiele: (r.matches as number) ?? null,
    siege: (r.wins as number) ?? null,
    unentschieden: (r.draws as number) ?? null,
    niederlagen: (r.losses as number) ?? null,
    tore: (r.goalsFor as number) ?? null,
    gegentore: (r.goalsAgainst as number) ?? null,
    punkte: (r.points as number) ?? null,
    /* penaltyPoints ist KEIN Punktabzug, sondern die Fairplay-Wertung.
       FCH hatte 2025/2026 deren 76 auf Rang 2. */
    fairplay_punkte: (r.penaltyPoints as number) ?? null,
    stand_vom: jetzt,
  };
}

const gruppenSchluessel = (z: { sfv_saison_id: number; sfv_liga_id: number; sfv_division_id: number; sfv_gruppe_id: number }) =>
  `${z.sfv_saison_id}|${z.sfv_liga_id}|${z.sfv_division_id}|${z.sfv_gruppe_id}`;

/* ── Der Lauf ─────────────────────────────────────────────────────────── */
export async function laufeSync(
  db: SupabaseClient, v: Verbindung, zugang: SfvZugang, nur: string | null, gestartetVon: string | null,
): Promise<LaufErgebnis> {
  const jetzt = new Date().toISOString();
  const erg: LaufErgebnis = {
    status: "ok", meldung: "",
    spiele: { neu: 0, aktualisiert: 0, ohne_team: 0, nicht_mehr_geliefert: 0 },
    ranglisten: { geschrieben: 0, entfernt: 0, gruppen: 0 },
    verwaiste_zuordnungen: 0, derbys: 0,
  };

  const token = await holeToken(zugang);
  const saison = await holeSaison(zugang, token, new Date());
  erg.saison = saison;

  const sfvTeams: SfvTeam[] = await holeTeams(zugang, token, saison.id);
  const eigene = new Set(sfvTeams.map((t) => t.sfv_team_id));

  /* Namen aus der Zuordnung. Fehlt sie, greift der Ersatz in bildeSpiel. */
  const { data: teamZeilen } = await db
    .from("teams").select("id,name,sfv_team_id").eq("verein_id", v.verein_id);
  const namen = new Map<number, string>();
  for (const t of teamZeilen ?? []) {
    if (t.sfv_team_id != null) namen.set(Number(t.sfv_team_id), t.name as string);
  }
  erg.verwaiste_zuordnungen = (teamZeilen ?? [])
    .filter((t) => t.sfv_team_id != null && !eigene.has(Number(t.sfv_team_id))).length;

  /* ── Spielplan ── */
  if (nur !== "rangliste") {
    const spiele = await holeSpielplan(zugang, token, saison.id);

    /* NUR die Felder, die DIESER Durchgang berechnet. `sfv_matchdaten`
       gehoert dem Matchdaten-Teil (schiedsrichter kommt aus /referees pro
       Spiel, nicht aus dem Spielplan) und wird hier bewusst nicht geprueft
       — sonst meldete die Zweiwege-Pruefung ein Feld als fehlend, das ein
       anderer Durchgang schreibt. Genau daran ist der Lauf am 20.08.2026
       gescheitert. */
    const erlaubt = [
      ...((v.sync_felder as any)?.spiele?.sfv ?? []),
      ...((v.sync_felder as any)?.spiele?.abgeleitet ?? []),
    ] as string[];
    if (erlaubt.length === 0) throw new SfvFehler("sync_felder nennt keine Spalten für spiele");

    const zeilen: Record<string, unknown>[] = [];
    for (const s of spiele) {
      const gebildet = bildeSpiel(s, eigene, namen, jetzt);
      if (!gebildet) { erg.spiele.ohne_team++; continue; }
      if (gebildet.derby) erg.derbys++;
      const { zeile, fehlend } = schneideAufFeldhoheit(erlaubt, gebildet.zeile);
      if (fehlend.length) {
        throw new SfvFehler(`sync_felder nennt Spalten, die der Sync nicht berechnet: ${fehlend.join(", ")}`);
      }
      /* verein_id steht in keiner der Listen — sie gehört keinem Feldeigner,
         sie ist der Mandant. Ohne sie lehnt die DB die Zeile still ab. */
      zeilen.push({ ...zeile, verein_id: v.verein_id });
    }

    /* neu gegen aktualisiert: der Upsert sagt es nicht, also vorher fragen. */
    const { data: vorhanden } = await db
      .from("spiele").select("sfv_match_id")
      .eq("verein_id", v.verein_id).not("sfv_match_id", "is", null);
    const bekannt = new Set((vorhanden ?? []).map((z) => Number(z.sfv_match_id)));
    for (const z of zeilen) {
      if (bekannt.has(Number(z.sfv_match_id))) erg.spiele.aktualisiert++; else erg.spiele.neu++;
    }
    /* Nicht mehr gelieferte werden gezählt, nie gelöscht. */
    const geliefert = new Set(zeilen.map((z) => Number(z.sfv_match_id)));
    erg.spiele.nicht_mehr_geliefert = [...bekannt].filter((id) => !geliefert.has(id)).length;

    if (zeilen.length) {
      const { error } = await db.from("spiele").upsert(zeilen, { onConflict: "verein_id,sfv_match_id" });
      if (error) throw new SfvFehler(`Spiele speichern fehlgeschlagen: ${error.message}`);
    }
  }

  /* ── Rangliste ── */
  if (nur !== "spielplan") {
    const roh = await holeRangliste(zugang, token, saison.id);
    const zeilen = roh.map((r) => bildeRanglistenZeile(r, v.verein_id, saison.id, jetzt));
    erg.ranglisten.geschrieben = zeilen.length;

    if (zeilen.length) {
      const { error } = await db.from("ranglisten").upsert(zeilen, {
        onConflict: "verein_id,sfv_saison_id,sfv_liga_id,sfv_division_id,sfv_gruppe_id,sfv_team_id",
      });
      if (error) throw new SfvFehler(`Rangliste speichern fehlgeschlagen: ${error.message}`);

      /* Abgleich JE GRUPPE, nicht je Saison. Liefert der SFV nur einen Teil,
         werden nur die gelieferten Gruppen bereinigt — die übrigen bleibt
         der Lauf fern. Ein halber Ausfall kann so nichts wegräumen. */
      const gelieferteGruppen = new Set(zeilen.map(gruppenSchluessel));
      erg.ranglisten.gruppen = gelieferteGruppen.size;
      const erlaubteTeams = new Set(zeilen.map((z) => `${gruppenSchluessel(z)}|${z.sfv_team_id}`));

      const { data: gespeichert } = await db
        .from("ranglisten")
        .select("id,sfv_saison_id,sfv_liga_id,sfv_division_id,sfv_gruppe_id,sfv_team_id")
        .eq("verein_id", v.verein_id).eq("sfv_saison_id", saison.id);

      const zuLoeschen = (gespeichert ?? [])
        .filter((z) => gelieferteGruppen.has(gruppenSchluessel(z as never)))
        .filter((z) => !erlaubteTeams.has(`${gruppenSchluessel(z as never)}|${z.sfv_team_id}`))
        .map((z) => z.id as string);

      if (zuLoeschen.length) {
        const { error: delFehler } = await db.from("ranglisten").delete().in("id", zuLoeschen);
        if (delFehler) throw new SfvFehler(`Rangliste bereinigen fehlgeschlagen: ${delFehler.message}`);
        erg.ranglisten.entfernt = zuLoeschen.length;
      }
    }
  }

  /* ── Matchdaten ── */
  if (nur !== "rangliste" && nur !== "spielplan") {
    const { data: verein } = await db
      .from("vereine").select("sfv_club_nummer").eq("id", v.verein_id).single();

    erg.matchdaten = await laufeMatchdaten(
      db, v, zugang, token,
      (verein?.sfv_club_nummer as number | null) ?? null,
      MATCHDATEN_PRO_LAUF,
    );

    /* Wappen der Gegner: einmal holen, danach nie wieder. Kostet nach dem
       ersten Lauf null Aufrufe — geholt wird nur, was fehlt, und was der
       Verband nicht hat, wird erst nach dreissig Tagen neu gefragt. */
    erg.logos = await laufeLogos(db, v.verein_id, zugang, token);
  }

  const teile = [
    `Saison ${saison.name}`,
    `Spiele ${erg.spiele.neu} neu, ${erg.spiele.aktualisiert} aktualisiert`,
    `Rangliste ${erg.ranglisten.geschrieben} Zeilen in ${erg.ranglisten.gruppen} Gruppen`,
  ];
  if (erg.ranglisten.entfernt) teile.push(`${erg.ranglisten.entfernt} Ranglistenzeilen entfernt`);
  if (erg.spiele.nicht_mehr_geliefert) teile.push(`${erg.spiele.nicht_mehr_geliefert} Spiele nicht mehr geliefert (behalten)`);
  if (erg.derbys) teile.push(`${erg.derbys} Spiel(e) zwischen zwei eigenen Teams — dem Heimteam zugeordnet`);
  if (erg.verwaiste_zuordnungen) teile.push(`${erg.verwaiste_zuordnungen} Team-Zuordnung(en) zeigen ins Leere`);

  if (erg.logos && (erg.logos.geholt || erg.logos.fehlt)) {
    teile.push(`Wappen ${erg.logos.geholt} geholt`
      + (erg.logos.fehlt ? `, ${erg.logos.fehlt} ohne Bild beim Verband` : ""));
  }

  const md = erg.matchdaten;
  if (md) {
    teile.push(`Matchdaten ${md.spiele_geholt} Spiel(e), ${md.aufstellung_zeilen} Aufstellungs- und ${md.ereignisse_zeilen} Ereigniszeilen`);
    if (md.paesse_geschrieben) teile.push(`${md.paesse_geschrieben} Spielerpass/-paesse vom Verband uebernommen`);
    if (md.pass_konflikte.length) {
      erg.status = "warnung";
      teile.push(`${md.pass_konflikte.length} Spielerpass/-paesse NICHT geschrieben — ${md.pass_konflikte[0]}`);
    }
    if (md.nachzug_meldungen) teile.push(`${md.nachzug_meldungen} Korrektur(en) vom Verband eingeholt`);
    if (md.fehler) {
      /* Die Ursache gehoert in die Meldung, nicht nur die Zahl. */
      teile.push(`${md.fehler} Spiel(e) ohne Matchdaten`
        + (md.fehlermeldungen.length ? ` — ${md.fehlermeldungen[0]}` : ""));
    }
  }

  if (erg.verwaiste_zuordnungen > 0 || erg.spiele.nicht_mehr_geliefert > 0) erg.status = "warnung";

  /* ZWEI VERSCHIEDENE LAGEN, die vorher denselben Text bekamen.

     Gibt es NOCH KEINE EINZIGE Zuordnung, ist alles unzugeordnet — das ist
     der Normalzustand nach dem ersten Lauf und kein Verdachtsfall. Der Satz
     "hat der SFV die personId gewechselt?" waere dort schlicht falsch und
     schickt jemanden auf eine Suche, die es nicht gibt.

     Gibt es Zuordnungen UND trotzdem viele Unbekannte, ist es der
     Fruehwarner fuer den offenen Punkt "haelt personId ueber die Saison?"
     (CLAUDE.md): wechselt der Verband die IDs zum 1. Juli, zeigen alle
     Zuordnungen ins Leere — und zwar still. */
  if (md && md.eigene_unzugeordnet > 0) {
    if (md.zuordnungen_gesamt === 0) {
      teile.push(`Zuordnung steht noch aus — ${md.eigene_unzugeordnet} Spieler warten`);
    } else if (md.aufstellung_zeilen > 0
        && md.eigene_unzugeordnet / md.aufstellung_zeilen > UNZUGEORDNET_WARNUNG) {
      erg.status = "warnung";
      teile.push(`auffaellig viele unzugeordnete Spieler trotz ${md.zuordnungen_gesamt} bestehender Zuordnungen — hat der SFV die personId gewechselt?`);
    }
  }
  erg.meldung = teile.join(" · ");
  return erg;
}
