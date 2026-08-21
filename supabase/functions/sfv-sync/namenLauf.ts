// ClubCampus — supabase/functions/sfv-sync/namenLauf.ts
// Die Aktion "namen": Klarnamen der noch nicht zugeordneten EIGENEN Spieler
// nachtragen. Kein console.* in dieser Datei.
//
// WARUM EINE EIGENE AKTION UND NICHT DER SYNC
//   Die Mechanik des stuendlichen Laufs passt zur Frage nicht:
//
//     der Sync        holt zehn Spiele pro Lauf, weil er stuendlich laeuft.
//                     `waehleKandidaten` nimmt „nie geholt" und danach
//                     „juenger als sieben Tage". Ist der erste Topf leer,
//                     sind es immer DIESELBEN zehn.
//     die Frage hier  „wie heissen die offenen Spieler?" ist EINMALIG und
//                     betrifft ALLE Spiele, in denen sie vorkommen.
//
// ⚠ BELEG VOM 22.08.2026, warum das kein Feinschliff ist: von 177 offenen
//   Spielern waren ueber den Sync 129 ueberhaupt erreichbar und **48 gar
//   nicht** — ihre Spiele sind aelter als sieben Tage und laengst geholt,
//   kommen also in keinem Lauf mehr vor. Bei der 3. Mannschaft standen 15
//   offen und genau EINER mit Namen. Noch einmal druecken half nicht: es
//   kamen dieselben zehn Spiele und dieselben Namen. Ein Knopf, der eine
//   vollstaendige Auskunft verspricht, muss die Spiele nach der FRAGE
//   waehlen und nicht nach dem Zeitplan.
//
// ⚠ SIE SCHREIBT NICHTS. Kein Upsert nach `spiel_aufstellung`, kein
//   `matchdaten_geholt_am`, kein `letzter_sync`. Sie liest Namen und gibt
//   sie in der Antwort zurueck. Jeder Schreibvorgang waere ein weiterer
//   Ausgang, den jemand pruefen muesste — siehe CLAUDE.md, „ein neues Feld
//   erbt jeden Ausgang des Objekts, an dem es haengt".
//
// ⚠ EIN TOKEN, VIELE GETs. `holeToken` holt der Aufrufer EINMAL; hier laufen
//   ausschliesslich `GET /api/match/{id}/players`. Die SFV-API kennt pro
//   Anwendung genau EIN gueltiges Token — die Gefahr liegt deshalb nicht in
//   dieser Aktion, sondern in der UEBERLAPPUNG mit dem Sync, dessen
//   `POST /api/token` unser Token mitten in den Abrufen entwerten wuerde.
//   Dagegen steht die Laufsperre in index.ts, nicht etwas hier.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { holeAufstellung, SfvFehler } from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import { bildeOffeneNamen } from "./matchdaten.ts";
import type { OffenerName, SfvRoh } from "./matchdaten.ts";

export interface NamenErgebnis {
  spiele_abgefragt: number;
  namen_gefunden: number;
  fehler: number;
  /** Wie viele Spieler ueberhaupt offen sind — fuer den ehrlichen Satz in
      der Maske („171 von 177"). */
  offen_gesamt: number;
  /**
   * ⚠ NUR IN DER ANTWORT. Steht in keiner Allowlist fuers Protokoll und
   * wird nirgends gespeichert.
   */
  namen: OffenerName[];
}

/**
 * Was von dieser Aktion nach `api_sync_log.details` darf.
 *
 * ⚠ Aufgezaehlt, nicht ausgeschlossen — und getrennt von `fuersProtokoll()`,
 * weil es ein anderes Objekt ist. Am 21.08.2026 hat genau diese Verwechslung
 * 903 Klarnamen ins Protokoll geschrieben: die Allowlist war gedacht, aber
 * am Ausgang der Anzeige gebaut statt am Ausgang, der in die Datenbank ging.
 */
export function namenFuersProtokoll(erg: NamenErgebnis): Record<string, unknown> {
  return {
    spiele_abgefragt: erg.spiele_abgefragt,
    namen_gefunden: erg.namen_gefunden,
    fehler: erg.fehler,
  };
}

interface Verbindung { verein_id: string }

export async function laufeNamen(
  db: SupabaseClient,
  v: Verbindung,
  zugang: SfvZugang,
  token: string,
  unsereClubNummer: number | null,
): Promise<NamenErgebnis> {
  const erg: NamenErgebnis = {
    spiele_abgefragt: 0, namen_gefunden: 0, fehler: 0, offen_gesamt: 0, namen: [],
  };

  /* Ohne clubNumber gilt niemand als eigen (istEigener) — der Lauf gaebe
     dann eine leere Liste zurueck, die wie „keine offenen Spieler" aussieht.
     Lieber ein Fehler als eine Auskunft, die niemand hinterfragt. */
  if (unsereClubNummer === null) {
    throw new SfvFehler("vereine.sfv_club_nummer fehlt — ohne sie ist eigen/fremd nicht zu trennen");
  }

  const { data: zuordnungRoh, error: zErr } = await db
    .from("sfv_zuordnung").select("sfv_person_id").eq("verein_id", v.verein_id);
  if (zErr) throw new SfvFehler(`Zuordnungen nicht lesbar: ${zErr.message}`);
  const zugeordnet = new Set((zuordnungRoh ?? []).map((z) => Number(z.sfv_person_id)));

  const { data: zeilen, error: aErr } = await db
    .from("spiel_aufstellung")
    .select("sfv_person_id, spiele(sfv_match_id)").eq("verein_id", v.verein_id);
  if (aErr) throw new SfvFehler(`Aufstellung nicht lesbar: ${aErr.message}`);

  /* Genau die Spiele, in denen ein UNZUGEORDNETER eigener Spieler vorkommt.
     Nicht alle: wer zugeordnet ist, braucht keinen Namen mehr, und jedes
     ueberfluessige Spiel ist ein Aufruf beim Verband. Die Menge schrumpft
     also mit jeder Zuordnung. */
  const offeneIds = new Set<number>();
  const matchIds = new Set<number>();
  for (const z of (zeilen ?? []) as unknown as
       { sfv_person_id: number; spiele: { sfv_match_id: number | null } | null }[]) {
    const id = Number(z.sfv_person_id);
    if (zugeordnet.has(id)) continue;
    offeneIds.add(id);
    const mid = z.spiele?.sfv_match_id;
    if (mid != null) matchIds.add(Number(mid));
  }
  erg.offen_gesamt = offeneIds.size;

  const alleRoh: SfvRoh[] = [];
  for (const matchId of matchIds) {
    try {
      alleRoh.push(...await holeAufstellung(zugang, token, matchId));
      erg.spiele_abgefragt += 1;
    } catch (e) {
      /* Gebunden, nicht leer — auch wenn hier nur gezaehlt wird. Ein 404 des
         Verbands und ein Netzfehler saehen sonst gleich aus: als haette das
         Spiel keine Aufstellung. */
      void (e instanceof Error ? e.message : String(e));
      erg.fehler += 1;
    }
  }

  erg.namen = bildeOffeneNamen(alleRoh, unsereClubNummer, zugeordnet);
  erg.namen_gefunden = erg.namen.length;
  return erg;
}
