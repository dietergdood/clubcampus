/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/matchdatenAnzeige.ts

   Reine Logik für Spielbericht und Zuordnungs-Warteschlange. Kennt
   keine Datenbank.

   DIE ZWEI SCHICHTEN ZUSAMMENFÜHREN ist die Aufgabe: `spiel_ereignisse`
   hält SFV-Zeilen und Vereins-Zeilen nebeneinander. Der Sync schreibt
   nur die SFV-Zeilen fort, angezeigt wird die Vereins-Zeile, wo es
   eine gibt. Beide bleiben stehen — sonst könnte der Nachzug-Vergleich
   nie auslösen (siehe migration_matchdaten.sql).
   ═══════════════════════════════════════════════════════════════ */

export type Herkunft = "sfv" | "verein";

export interface EreignisZeile {
  id: string;
  herkunft: Herkunft;
  ersetzt_ereignis_id: string | null;
  verworfen_am: string | null;
  typ_id: number;
  typ: string | null;
  subtyp: string | null;
  minute: number | null;
  zusatzminute: number | null;
  ist_eigener: boolean;
  gegner_club_name: string | null;
  sfv_person_id: number | null;
  rueckennr: number | null;
  ein_sfv_person_id: number | null;
  ein_rueckennr: number | null;
}

/* Was der Bericht zeigt: eine Zeile je Ereignis, mit dem Vermerk, ob
   der Verein sie geändert hat. */
export interface AnzeigeEreignis extends EreignisZeile {
  /** true, wenn diese Zeile eine SFV-Zeile verdeckt oder ergänzt. */
  vomVerein: boolean;
  /** Die verdeckte SFV-Zeile — für „Original anzeigen". */
  original: EreignisZeile | null;
}

/**
 * Führt die zwei Schichten zu der Liste zusammen, die angezeigt wird.
 *
 * Eine Vereins-Zeile verdeckt die SFV-Zeile, auf die sie zeigt. Eine
 * verworfene Korrektur verdeckt nichts mehr — dann gilt wieder der SFV.
 * Eine Vereins-Zeile ohne `ersetzt_ereignis_id` ist ein Nachtrag
 * (Assist) und kommt zusätzlich dazu.
 */
export function mischeEreignisse(zeilen: EreignisZeile[]): AnzeigeEreignis[] {
  const aktiv = zeilen.filter(z => z.herkunft === "verein" && !z.verworfen_am);
  const verdeckt = new Map<string, EreignisZeile>();
  for (const k of aktiv) {
    if (k.ersetzt_ereignis_id) verdeckt.set(k.ersetzt_ereignis_id, k);
  }

  const sfvNachId = new Map(zeilen.filter(z => z.herkunft === "sfv").map(z => [z.id, z]));
  const raus: AnzeigeEreignis[] = [];

  for (const z of zeilen) {
    if (z.herkunft === "sfv") {
      const korrektur = verdeckt.get(z.id);
      /* Verdeckte SFV-Zeile: die Korrektur steht an ihrer Stelle, das
         Original bleibt greifbar. */
      if (korrektur) { raus.push({ ...korrektur, vomVerein: true, original: z }); continue; }
      raus.push({ ...z, vomVerein: false, original: null });
      continue;
    }
    /* Vereins-Zeile: nur die Nachträge kommen hier dazu — die Korrekturen
       sind oben schon an der Stelle ihrer SFV-Zeile eingesetzt. */
    if (z.verworfen_am) continue;
    if (z.ersetzt_ereignis_id) {
      /* Zeigt ins Leere (SFV-Zeile verschwunden): trotzdem zeigen, sonst
         verlöre der Verein seine Eingabe stillschweigend. */
      if (!sfvNachId.has(z.ersetzt_ereignis_id)) {
        raus.push({ ...z, vomVerein: true, original: null });
      }
      continue;
    }
    raus.push({ ...z, vomVerein: true, original: null });
  }

  return raus.sort((a, b) =>
    (a.minute ?? 0) - (b.minute ?? 0) || (a.zusatzminute ?? 0) - (b.zusatzminute ?? 0));
}

/**
 * Hat der Verband zu diesem Spiel überhaupt einen Verlauf erfasst?
 *
 * Bei vier von zehn Spielen liefert er keine Ereignisse — auch bei
 * sieben oder acht Toren (Trockenlauf 19.08.2026). Ein leerer Verlauf
 * bei einem 3:2 sieht aus wie ein Fehler in ClubCampus; dabei liegt es
 * am Verband. Deshalb wird der Unterschied benannt statt gezeigt.
 *
 * ⚠ Der Stand kommt aus `spiele.resultat`, NIE aus den Ereignissen.
 */
export function hatVerlauf(zeilen: EreignisZeile[]): boolean {
  return zeilen.some(z => z.herkunft === "sfv");
}

export const OHNE_VERLAUF_TEXT =
  "Der SFV hat zu diesem Spiel keinen Verlauf erfasst. Das Resultat stammt aus dem Spielplan.";

/* ── Warteschlange ─────────────────────────────────────────────────
   Wer ist noch keinem Mitglied zugeordnet? */

export interface AufstellungZeile {
  sfv_person_id: number;
  sfv_team_id: number | null;
  rueckennr: number | null;
  spiel_id: string;
}

export interface OffeneZuordnung {
  sfv_person_id: number;
  sfv_team_id: number | null;
  /** Alle Rückennummern, unter denen die Person aufgelaufen ist. */
  rueckennummern: number[];
  /** Wie oft sie in der Aufstellung stand — hilft beim Einordnen. */
  einsaetze: number;
}

/**
 * Die noch offenen Zuordnungen, eine Zeile je Person.
 *
 * Nach Einsätzen absteigend: wer oft spielt, ist zuerst interessant und
 * am leichtesten zu erkennen.
 */
export function offeneZuordnungen(
  aufstellung: AufstellungZeile[], bekannt: Set<number>,
): OffeneZuordnung[] {
  const proPerson = new Map<number, OffeneZuordnung>();
  for (const a of aufstellung) {
    if (bekannt.has(a.sfv_person_id)) continue;
    const vorhanden = proPerson.get(a.sfv_person_id);
    if (!vorhanden) {
      proPerson.set(a.sfv_person_id, {
        sfv_person_id: a.sfv_person_id,
        sfv_team_id: a.sfv_team_id,
        rueckennummern: a.rueckennr === null ? [] : [a.rueckennr],
        einsaetze: 1,
      });
      continue;
    }
    vorhanden.einsaetze += 1;
    if (a.rueckennr !== null && !vorhanden.rueckennummern.includes(a.rueckennr)) {
      vorhanden.rueckennummern.push(a.rueckennr);
    }
  }
  return [...proPerson.values()].sort((a, b) => b.einsaetze - a.einsaetze);
}

/**
 * Nach Mannschaft gruppiert.
 *
 * Beim ersten Lauf standen 129 verschiedene eigene Spieler in zehn
 * Spielen; über die ganze Saison werden es mehr. Zweihundert Namen am
 * Stück sortiert man schlechter als fünfzehn pro Mannschaft.
 */
export interface ZuordnungGruppe {
  sfv_team_id: number | null;
  teamName: string;
  offen: OffeneZuordnung[];
}

export function gruppiereNachTeam(
  offen: OffeneZuordnung[], teamNamen: Map<number, string>,
): ZuordnungGruppe[] {
  const proTeam = new Map<string, ZuordnungGruppe>();
  for (const o of offen) {
    const schluessel = String(o.sfv_team_id ?? "-");
    let g = proTeam.get(schluessel);
    if (!g) {
      g = {
        sfv_team_id: o.sfv_team_id,
        teamName: (o.sfv_team_id !== null && teamNamen.get(o.sfv_team_id)) || "Ohne Mannschaft",
        offen: [],
      };
      proTeam.set(schluessel, g);
    }
    g.offen.push(o);
  }
  /* Grösste Mannschaft zuerst — dort ist am meisten zu tun. */
  return [...proTeam.values()].sort((a, b) => b.offen.length - a.offen.length);
}

/* ── Statistik ─────────────────────────────────────────────────────
   ⚠ Die zwei Quellen sind NICHT gleich verlässlich, und das gehört an
   die Anzeige, nicht nur in den Code: Einsätze und Minuten stammen aus
   /players und stehen bei jedem Spiel, Tore und Karten aus /events —
   und die fehlen bei rund vier von zehn Spielen ganz. Sonst wundert
   sich jemand, warum ein Spieler 14 Spiele und 0 Tore hat. */
export const STATISTIK_HINWEIS =
  "Einsätze und Minuten liefert der SFV zu jedem Spiel. Tore und Karten nur dort, "
  + "wo er einen Spielverlauf erfasst hat — das ist längst nicht überall der Fall. "
  + "Eine 0 bei den Toren kann deshalb auch heissen: nicht erfasst.";

export interface SpielerStatistik {
  sfv_person_id: number;
  einsaetze: number;
  minuten: number;
  /** Spiele, zu denen ein Verlauf vorliegt — nur sie zählen für Tore. */
  spieleMitVerlauf: number;
  tore: number;
  verwarnungen: number;
  ausschluesse: number;
}

export const TYP_TOR = 1;
export const TYP_VERWARNUNG = 3;
export const TYP_AUSSCHLUSS = 4;

export function baueStatistik(
  aufstellung: AufstellungZeile[],
  ereignisse: (EreignisZeile & { spiel_id: string })[],
  spieleMitVerlauf: Set<string>,
): SpielerStatistik[] {
  const proPerson = new Map<number, SpielerStatistik>();
  const hole = (id: number) => {
    let s = proPerson.get(id);
    if (!s) {
      s = { sfv_person_id: id, einsaetze: 0, minuten: 0, spieleMitVerlauf: 0, tore: 0, verwarnungen: 0, ausschluesse: 0 };
      proPerson.set(id, s);
    }
    return s;
  };

  for (const a of aufstellung as (AufstellungZeile & { spielzeit?: number | null })[]) {
    const s = hole(a.sfv_person_id);
    s.einsaetze += 1;
    s.minuten += a.spielzeit ?? 0;
    if (spieleMitVerlauf.has(a.spiel_id)) s.spieleMitVerlauf += 1;
  }

  for (const e of ereignisse) {
    if (!e.ist_eigener || e.sfv_person_id === null) continue;
    const s = hole(e.sfv_person_id);
    if (e.typ_id === TYP_TOR) s.tore += 1;
    else if (e.typ_id === TYP_VERWARNUNG) s.verwarnungen += 1;
    else if (e.typ_id === TYP_AUSSCHLUSS) s.ausschluesse += 1;
  }

  return [...proPerson.values()].sort((a, b) => b.einsaetze - a.einsaetze);
}
