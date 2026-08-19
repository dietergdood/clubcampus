// ClubCampus — supabase/functions/sfv-sync/matchdatenLauf.ts
// Der Matchdaten-Abschnitt eines Sync-Laufs. Kein console.* in dieser Datei.
//
// Getrennt von sync.ts, weil sync.ts schon 300 Zeilen Spielplan und
// Rangliste traegt und die Matchdaten eine eigene Ablaufform haben: pro
// Spiel drei Aufrufe statt einer Nutzlast fuer alles.
//
// WAS DIESER ABSCHNITT NIE TUT
//   - `aufgebote` anfassen. Aufgebot und Aufstellung sind zwei Dinge.
//   - Zeilen mit herkunft='verein' schreiben oder loeschen. Was der Verein
//     eingetragen hat, bleibt — auch beim naechsten Lauf.
//   - Personendaten fremder Spieler uebernehmen. Die Allowlist in
//     matchdaten.ts liest sie gar nicht erst; der CHECK-Constraint in der
//     Datenbank prueft es ein zweites Mal.
//   - ht_resultat schreiben. Die Feldhoheit steht dort auf `verein`; umgestellt
//     wird erst, wenn dieser Lauf steht (Entscheidung 6). leseHalbzeit() ist
//     vorbereitet und wird bewusst noch nicht aufgerufen.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { holeMatch, holeAufstellung, holeEreignisse, holeTeamBild, SfvFehler } from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import {
  bildeAufstellung, bildeEreignis, istKorrekturUeberfluessig, waehleKandidaten,
} from "./matchdaten.ts";
import type { KorrekturZeile, SpielKandidat } from "./matchdaten.ts";
import { ausBase64, erkenneBild, logoPfad, offeneLogos, LOGO_BUCKET } from "./logos.ts";
import type { LogoZeile } from "./logos.ts";

export interface MatchdatenErgebnis {
  spiele_geholt: number;
  aufstellung_zeilen: number;
  ereignisse_zeilen: number;
  eigene_unzugeordnet: number;
  /* Wie viele Zuordnungen es ueberhaupt schon gibt. Trennt den
     Normalzustand vom Verdachtsfall: ohne eine einzige Zuordnung steht sie
     schlicht noch aus, das ist keine Auffaelligkeit. */
  zuordnungen_gesamt: number;
  nachzug_meldungen: number;
  fehler: number;
  /* WARUM ein Spiel scheiterte, nicht nur DASS. Ohne diese Liste sah ein
     42P10 aus der Datenbank genauso aus wie ein 404 vom Verband — am
     20.08.2026 hat das einen reproduzierbaren Fehler tagelang als
     "der SFV hat nichts geliefert" getarnt. Auf die ersten fuenf begrenzt:
     scheitern alle zehn, sagen fuenf Meldungen dasselbe wie zehn. */
  fehlermeldungen: string[];
}

/* Ab diesem Anteil unzugeordneter eigener Spieler wird der Lauf zur Warnung.
   Der Frühwarner fuer den offenen Punkt "haelt personId ueber die Saison?":
   wechselt der SFV die IDs zum 1. Juli, zeigen alle Zuordnungen ins Leere —
   und zwar still, denn die Spieler landen einfach wieder in der
   Warteschlange. Im Normalbetrieb sind es null bis zwei. */
export const UNZUGEORDNET_WARNUNG = 0.5;

interface Verbindung { verein_id: string }

export async function laufeMatchdaten(
  db: SupabaseClient,
  v: Verbindung,
  zugang: SfvZugang,
  token: string,
  unsereClubNummer: number | null,
  hoechstens: number,
): Promise<MatchdatenErgebnis> {
  const erg: MatchdatenErgebnis = {
    spiele_geholt: 0, aufstellung_zeilen: 0, ereignisse_zeilen: 0,
    eigene_unzugeordnet: 0, zuordnungen_gesamt: 0, nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
  };

  /* Ohne clubNumber wird NICHT geholt. Sie trennt eigen von fremd; fehlt sie,
     gilt niemand als eigen (istEigener), und der Lauf schriebe lauter
     anonyme Zeilen, die spaeter niemand mehr zuordnen kann. Lieber gar
     nichts als etwas Falsches, das wie Daten aussieht. */
  if (unsereClubNummer === null) {
    throw new SfvFehler("vereine.sfv_club_nummer fehlt — ohne sie ist eigen/fremd nicht zu trennen");
  }

  const { data: kandidatenRoh } = await db
    .from("spiele")
    .select("id,date,matchdaten_geholt_am,sfv_match_id")
    .eq("verein_id", v.verein_id)
    .eq("sfv_status", 2);

  const kandidaten = waehleKandidaten(
    (kandidatenRoh ?? []) as unknown as SpielKandidat[], new Date(), hoechstens,
  );

  const jetzt = new Date().toISOString();

  for (const spiel of kandidaten) {
    const matchId = spiel.sfv_match_id as number;
    try {
      /* Drei Aufrufe, streng seriell mit demselben Token — ein zweiter
         POST /api/token wuerde den ersten sofort ungueltig machen. */
      await holeMatch(zugang, token, matchId);
      const rohAufstellung = await holeAufstellung(zugang, token, matchId);
      const rohEreignisse = await holeEreignisse(zugang, token, matchId);

      const aufstellung = rohAufstellung
        .map((p) => bildeAufstellung(p, unsereClubNummer, v.verein_id, spiel.id, jetzt))
        .filter((z): z is NonNullable<typeof z> => z !== null);

      const ereignisse = rohEreignisse
        .map((e) => bildeEreignis(e, unsereClubNummer, v.verein_id, spiel.id, jetzt))
        .filter((z): z is NonNullable<typeof z> => z !== null);

      if (aufstellung.length) {
        const { error } = await db.from("spiel_aufstellung")
          .upsert(aufstellung, { onConflict: "verein_id,spiel_id,sfv_person_id" });
        if (error) throw new SfvFehler(`Aufstellung: ${error.message}`);
        erg.aufstellung_zeilen += aufstellung.length;
      }

      if (ereignisse.length) {
        /* onConflict auf den partiellen Schluessel: nur SFV-Zeilen tragen
           eine sfv_event_id, Vereins-Zeilen bleiben unberuehrt. */
        const { error } = await db.from("spiel_ereignisse")
          .upsert(ereignisse, { onConflict: "verein_id,sfv_event_id" });
        if (error) throw new SfvFehler(`Ereignisse: ${error.message}`);
        erg.ereignisse_zeilen += ereignisse.length;
      }

      await db.from("spiele")
        .update({ matchdaten_geholt_am: jetzt })
        .eq("id", spiel.id);

      erg.spiele_geholt += 1;
    } catch (e) {
      /* Ein Spiel, das der SFV nicht liefert (404 bei aelteren Saisons),
         darf den Lauf nicht abbrechen. matchdaten_geholt_am bleibt leer,
         damit es beim naechsten Mal wieder drankommt.

         ⚠ ABER DIE URSACHE WIRD FESTGEHALTEN. Bis zum 20.08.2026 stand hier
         ein `catch {}` ohne Bindung — und verschluckte damit ein 42P10 der
         eigenen Datenbank (der Ereignis-Upsert traf einen partiellen Index,
         den ON CONFLICT nicht ableiten kann). Von aussen sah das aus wie
         "der Verband hat zu diesem Spiel nichts". Ein Fehler, der wie eine
         Datenlage aussieht, ist schlimmer als einer, der abbricht. */
      erg.fehler += 1;
      const text = e instanceof Error ? e.message : String(e);
      if (erg.fehlermeldungen.length < 5) {
        erg.fehlermeldungen.push(`Spiel ${matchId}: ${text}`);
      }
    }
  }

  erg.nachzug_meldungen = await pruefeNachzug(db, v.verein_id);
  const zaehlung = await zaehleUnzugeordnet(db, v.verein_id);
  erg.eigene_unzugeordnet = zaehlung.offen;
  erg.zuordnungen_gesamt = zaehlung.bekannt;

  return erg;
}

/* ── Nachzug ───────────────────────────────────────────────────────────────
   Hat der Verband von sich aus auf denselben Wert korrigiert wie wir? Dann
   ist unsere Korrektur ueberfluessig geworden. Verglichen wird nur, was die
   Korrektur angefasst hat — sonst schluege jede Nebenaenderung an.

   Gemeldet wird an die Person, die korrigiert hat: sie weiss, warum.

   ⚠ UEBER `benachrichtigungen`, NICHT ueber `nachrichten`. Im Plan stand
   `nachrichten` — das war falsch: dort erlaubt
   nachrichten_empfaenger_typ_check nur 'rolle', 'gruppe' und 'team', eine
   einzelne Person laesst sich gar nicht adressieren (und `typ` nur
   'broadcast' oder 'diskussion'). `nachrichten` ist der Rundruf,
   `benachrichtigungen` die persoenliche Meldung mit benutzer_id. Das ist
   kein zweiter Weg, sondern der einzige, der eine Person erreicht.

   Zweimal melden verhindert referenz_typ/referenz_id: existiert schon eine
   Benachrichtigung zu dieser Korrektur, wird keine zweite geschrieben. Das
   spart eine Spalte `nachzug_gemeldet_am` — der Vermerk steht dort, wo die
   Meldung steht. */
async function pruefeNachzug(db: SupabaseClient, vereinId: string): Promise<number> {
  const { data: korrekturen } = await db
    .from("spiel_ereignisse")
    .select("*")
    .eq("verein_id", vereinId)
    .eq("herkunft", "verein")
    .is("verworfen_am", null)
    .not("ersetzt_ereignis_id", "is", null);

  if (!korrekturen?.length) return 0;

  const { data: sfvZeilen } = await db
    .from("spiel_ereignisse")
    .select("*")
    .eq("verein_id", vereinId)
    .in("id", korrekturen.map((k) => k.ersetzt_ereignis_id as string));

  const nachId = new Map((sfvZeilen ?? []).map((z) => [z.id as string, z]));

  const faellig = (korrekturen as unknown as KorrekturZeile[])
    .filter((k) => k.korrigiert_von)
    .filter((k) => istKorrekturUeberfluessig(k, nachId.get(k.ersetzt_ereignis_id as string)));
  if (!faellig.length) return 0;

  /* Schon gemeldet? Eine Abfrage fuer alle statt eine pro Korrektur. */
  const { data: schonGemeldet } = await db
    .from("benachrichtigungen")
    .select("referenz_id")
    .eq("verein_id", vereinId)
    .eq("referenz_typ", "spiel_ereignis_nachzug")
    .in("referenz_id", faellig.map((k) => k.id));
  const bereits = new Set((schonGemeldet ?? []).map((b) => b.referenz_id as string));

  const neue = faellig
    .filter((k) => !bereits.has(k.id))
    .map((k) => ({
      verein_id: vereinId,
      benutzer_id: k.korrigiert_von as string,
      type: "hinweis",
      title: "Der Verband hat nachgezogen",
      content: "Deine Korrektur an einem Spielereignis stimmt jetzt mit dem überein, "
             + "was der SFV liefert. Sie wird nicht mehr gebraucht — du kannst sie "
             + "verwerfen und wieder den Verband mitschreiben lassen.",
      referenz_typ: "spiel_ereignis_nachzug",
      referenz_id: k.id,
    }));

  if (!neue.length) return 0;
  const { error } = await db.from("benachrichtigungen").insert(neue);
  return error ? 0 : neue.length;
}

/* ── Frühwarner ────────────────────────────────────────────────────────────
   Wie viele eigene Aufstellungszeilen haben keine Zuordnung? Im Normalbetrieb
   null bis zwei — ein neuer Spieler beim ersten Einsatz. Springt die Zahl auf
   eine ganze Mannschaft, hat der SFV vermutlich die personId gewechselt. */
async function zaehleUnzugeordnet(
  db: SupabaseClient, vereinId: string,
): Promise<{ offen: number; bekannt: number }> {
  const { data: aufstellung } = await db
    .from("spiel_aufstellung").select("sfv_person_id").eq("verein_id", vereinId);
  const { data: zuordnung } = await db
    .from("sfv_zuordnung").select("sfv_person_id").eq("verein_id", vereinId);

  const bekannt = new Set((zuordnung ?? []).map((z) => Number(z.sfv_person_id)));
  const alle = new Set((aufstellung ?? []).map((a) => Number(a.sfv_person_id)));
  let offen = 0;
  for (const p of alle) if (!bekannt.has(p)) offen += 1;
  return { offen, bekannt: bekannt.size };
}

/* ── Vereinswappen ─────────────────────────────────────────────────────────
   Einmal holen, im Bucket ablegen, danach nie wieder. Der Spielplan kennt
   die Gegner ueber spiele.sfv_gegner_team_id; geholt wird nur, was fehlt.

   ⚠ NUR GEGNER. Das eigene Wappen steht in vereine.theme, in besserer
   Qualitaet als die 80x80 vom Verband. */
export async function laufeLogos(
  db: SupabaseClient, vereinId: string, zugang: SfvZugang, token: string,
): Promise<{ geholt: number; fehlt: number }> {
  const { data: spiele } = await db
    .from("spiele").select("sfv_gegner_team_id")
    .eq("verein_id", vereinId).not("sfv_gegner_team_id", "is", null);
  const gebraucht = (spiele ?? []).map((s) => Number(s.sfv_gegner_team_id));
  if (!gebraucht.length) return { geholt: 0, fehlt: 0 };

  const { data: bekannt } = await db
    .from("sfv_team_logos").select("sfv_team_id,pfad,fehlt_seit").eq("verein_id", vereinId);

  const offen = offeneLogos(gebraucht, (bekannt ?? []) as unknown as LogoZeile[], new Date());
  let geholt = 0, fehlt = 0;

  for (const teamId of offen) {
    const jetzt = new Date().toISOString();
    let text: string | null = null;
    try {
      text = await holeTeamBild(zugang, token, teamId);
    } catch {
      /* Netzfehler: NICHT als "fehlt" vermerken, sonst schweigt der Sync
         danach dreissig Tage ueber ein Wappen, das es gibt. Beim naechsten
         Lauf wieder versuchen. */
      continue;
    }

    const bytes = text === null ? null : ausBase64(text);
    const art = bytes === null ? null : erkenneBild(bytes);

    if (!bytes || !art) {
      await db.from("sfv_team_logos").upsert({
        verein_id: vereinId, sfv_team_id: teamId, pfad: null, mime: null,
        fehlt_seit: jetzt,
      }, { onConflict: "verein_id,sfv_team_id" });
      fehlt += 1;
      continue;
    }

    const pfad = logoPfad(vereinId, teamId, art.endung);
    const { error: hochFehler } = await db.storage.from(LOGO_BUCKET)
      .upload(pfad, bytes, { contentType: art.mime, upsert: true });
    if (hochFehler) continue;   // beim naechsten Lauf erneut

    await db.from("sfv_team_logos").upsert({
      verein_id: vereinId, sfv_team_id: teamId,
      pfad, mime: art.mime, geholt_am: jetzt, fehlt_seit: null,
    }, { onConflict: "verein_id,sfv_team_id" });
    geholt += 1;
  }

  return { geholt, fehlt };
}
