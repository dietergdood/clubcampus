/* ═══════════════════════════════════════════════════════════════════════════
   ClubCampus — domains/sfv/spielerVorschlag.ts

   Wer von unseren Mitgliedern ist dieser Spieler des Verbands?

   ⚠ ANLASS. `sfv_zuordnung` stand am 13.09.2026 bei 0 Zeilen, 381 Spieler
   offen. Die Maske gibt es, sie schreibt, sie kann loesen — sie SCHLAEGT
   nur nichts vor und bietet je Spieler alle 512 aktiven Mitglieder
   alphabetisch an. Das sind 381 Griffe in eine lange Liste.

   ── DIE ZWEI SCHUTZREGELN SIND DER KERN, NICHT DIE TREFFERQUOTE ──────────

   **1 · Bei zwei Kandidaten wird KEINER vorgeschlagen.** Nicht der
   wahrscheinlichere, nicht der erste. Dieselbe Regel wie bei der
   Nummern-Bruecke im Export — und dort ist sie am 11.09.2026 teuer
   geworden, weil sie an einer Stelle fehlte: unsere Spieler standen mit
   vollem Namen beim Gegner, auf einer oeffentlichen Seite.

   **2 · Ein Vorschlag wird NIE automatisch gespeichert.** Er ist eine
   Vorauswahl im Auswahlfeld, nichts weiter. Ein falscher Treffer, der
   gespeichert ist, sieht danach aus wie eine Zuordnung von Hand — und
   `sfv_zuordnung` ist die Quelle jeder kuenftigen Statistik.

   ⚠ **UND DESHALB GIBT ES KEIN „ALLE BESTAETIGEN".** Das ist der Punkt, an
   dem aus einem Vorschlag eine Behauptung wird. (Bedingung Didi,
   13.09.2026.)

   ── WARUM JEDE STUMME ABLEHNUNG IHREN GRUND NENNT ────────────────────────

   Eine Zeile ohne Vorschlag ist von einer Zeile, die nicht geprueft wurde,
   nicht zu unterscheiden — und genau diese Ununterscheidbarkeit kostet in
   diesem Projekt regelmaessig die meiste Zeit. `grund` ist deshalb
   Pflichtfeld und nicht optional.
   ═══════════════════════════════════════════════════════════════════════════ */

import { namensschluessel } from "../spiele/personenAbgleich.ts";

/** Ein Mitglied, so weit der Vorschlag es braucht. */
export interface VorschlagKandidat {
  id: string | number;
  vorname: string | null;
  nachname: string | null;
  /** Aus `personen.geburtsdatum` — nur das Jahr wird gelesen. */
  geburtsdatum: string | null;
  /** Die Namen der Kader-Mannschaften (`kader_teams`). */
  teams: string[];
}

/** Ein offener Spieler des Verbands, so weit der Vorschlag ihn braucht. */
export interface OffenerSpieler {
  sfv_person_id: number;
  name: string;
  /** Nur das Jahr, und nur wenn lesbar — siehe `jahrgangAus()`. */
  jahrgang: number | null;
  /** UNSER Mannschaftsname, ueber `teams.sfv_team_id` aufgeloest. */
  team: string | null;
}

export type Vorschlag =
  | { art: "treffer"; mitglied_id: string; grund: string }
  | { art: "keiner"; grund: string };

/** Das Jahr aus einem Datum unserer Seite. */
function jahrAus(roh: string | null): number | null {
  const m = /(\d{4})/.exec(roh ?? "");
  if (!m) return null;
  const j = Number(m[1]);
  return j >= 1930 && j <= 2100 ? j : null;
}

/**
 * Einen Vorschlag fuer EINEN offenen Spieler.
 *
 * Die Reihenfolge ist die Aussage, und **keines der Merkmale entscheidet
 * allein**:
 *
 * | | |
 * |---|---|
 * | **Mannschaft** | schneidet 512 Mitglieder auf ein bis zwei Dutzend |
 * | **Namensschluessel** | muss zeichengleich treffen |
 * | **Jahrgang** | trennt die Namensgleichen — aber nur, wenn BEIDE Seiten ihn kennen |
 *
 * ⚠ Der Jahrgang schliesst nur aus, wenn beide Seiten ihn tragen. Ein
 * fehlender Jahrgang darf niemanden verwerfen — sonst haenge der Vorschlag
 * an einem Feld, dessen Form beim Verband **ungemessen** ist
 * (`docs/sfv/matchdaten_beispiel.json` hat `birthDate` geschwaerzt). Er
 * fuehrt dann zu zwei Kandidaten, und dann schweigt die Funktion. Das ist
 * die sichere Richtung: sie findet weniger, nie mehr.
 *
 * ⚠ DIE RUECKENNUMMER IST KEIN MERKMAL. Sie steht in der Maske als Anzeige
 * daneben, und dort gehoert sie hin: eine Rueckennummer ist eine
 * Beschriftung auf einem Trikot, kein Schluessel — dazu `integer` gegen
 * `text`. Am 11.09.2026 hat genau dieser Irrtum unsere Namen beim Gegner
 * erscheinen lassen.
 */
export function schlageVor(
  spieler: OffenerSpieler,
  kandidaten: readonly VorschlagKandidat[],
): Vorschlag {
  const gesucht = namensschluessel(spieler.name);
  if (gesucht === "") {
    return { art: "keiner", grund: "Der Verband nennt keinen Namen." };
  }

  /* Erst die Mannschaft. Ist sie unbekannt, wird NICHT abgebrochen — dann
     traegt der Namensschluessel allein, und bei zwei Gleichnamigen schweigt
     die Funktion ohnehin. Ein Abbruch hier liesse genau die Spieler ohne
     Vorschlag, deren Team-Zuordnung noch fehlt. */
  const imTeam = spieler.team === null
    ? [...kandidaten]
    : kandidaten.filter((k) => k.teams.includes(spieler.team as string));

  const nachName = imTeam.filter(
    (k) => namensschluessel(`${k.vorname ?? ""} ${k.nachname ?? ""}`) === gesucht);

  if (nachName.length === 0) {
    /* ⚠ Der Grund unterscheidet die zwei Faelle, und sie verlangen
       Verschiedenes: in der Mannschaft niemand dieses Namens heisst
       „Kadereintrag fehlt oder Schreibweise weicht ab", ueberhaupt niemand
       heisst „diese Person ist bei uns nicht erfasst". */
    const ueberall = kandidaten.filter(
      (k) => namensschluessel(`${k.vorname ?? ""} ${k.nachname ?? ""}`) === gesucht);
    if (spieler.team !== null && ueberall.length > 0) {
      return { art: "keiner", grund:
        `Nicht im Kader von ${spieler.team} — der Name kommt bei uns vor, die Mannschaft nicht.` };
    }
    return { art: "keiner", grund: "Kein Mitglied dieses Namens." };
  }

  /* Der Jahrgang trennt nur, wenn beide Seiten ihn tragen. */
  const eng = spieler.jahrgang === null ? nachName : nachName.filter((k) => {
    const j = jahrAus(k.geburtsdatum);
    return j === null || j === spieler.jahrgang;
  });
  const uebrig = eng.length === 0 ? nachName : eng;

  if (uebrig.length > 1) {
    /* ⚠ DIE SCHUTZREGEL. Kein „wahrscheinlichster", keine Reihenfolge —
       zwei Menschen desselben Namens sind kein Wahlfall, und bei genau
       diesen zwei wuerde ein falscher Treffer am wenigsten auffallen. */
    return { art: "keiner", grund:
      `${uebrig.length} Mitglieder passen — hier entscheidet ein Mensch.` };
  }

  const t = uebrig[0];
  const jahr = jahrAus(t.geburtsdatum);
  const teile = [spieler.team !== null ? `Mannschaft ${spieler.team}` : null, "Name"];
  if (spieler.jahrgang !== null && jahr === spieler.jahrgang) teile.push(`Jahrgang ${jahr}`);
  return {
    art: "treffer",
    mitglied_id: String(t.id),
    grund: `${teile.filter(Boolean).join(" · ")} — bitte prüfen.`,
  };
}

/**
 * Vorschlaege fuer eine ganze Gruppe, und **die Zaehlung dazu**.
 *
 * ⚠ Die Aufteilung MUSS aufgehen: `mit + ohne === spieler.length`. Eine
 * Aufteilung, die aufgehen muss, prueft sich selbst; eine einzelne Zahl
 * kann nur behauptet werden. Der Testfall haelt es fest.
 */
export function schlageAlleVor(
  spieler: readonly OffenerSpieler[],
  kandidaten: readonly VorschlagKandidat[],
): { vorschlaege: Map<number, Vorschlag>; mit: number; ohne: number } {
  const vorschlaege = new Map<number, Vorschlag>();
  let mit = 0, ohne = 0;
  for (const s of spieler) {
    const v = schlageVor(s, kandidaten);
    vorschlaege.set(s.sfv_person_id, v);
    if (v.art === "treffer") mit += 1; else ohne += 1;
  }
  return { vorschlaege, mit, ohne };
}
