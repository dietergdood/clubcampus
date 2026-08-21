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
import { holeMatch, holeAufstellung, holeEreignisse, holeSchiedsrichter, holeTeamBild, SfvFehler } from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import {
  bildeAufstellung, bildeEreignis, istKorrekturUeberfluessig, waehleKandidaten,
  passAenderungen, passKonflikte, leseSchiedsrichter, bildeOffeneNamen,
} from "./matchdaten.ts";
import type { KorrekturZeile, OffenerName, SfvRoh, SpielKandidat } from "./matchdaten.ts";
import { ausBase64, erkenneBild, logoPfad, offeneLogos, LOGO_BUCKET } from "./logos.ts";
import type { LogoZeile } from "./logos.ts";
import type { MatchdatenErgebnis } from "./ergebnisTypen.ts";

/* Die Form steht in ergebnisTypen.ts — dort, wo auch die Allowlist steht,
   die entscheidet, was davon die Function verlaesst. Hier re-exportiert,
   damit bestehende Importe unveraendert bleiben. */
export type { MatchdatenErgebnis } from "./ergebnisTypen.ts";

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
    spiele_geholt: 0, aufstellung_zeilen: 0, ereignisse_zeilen: 0, offene_namen: [],
    eigene_unzugeordnet: 0, zuordnungen_gesamt: 0, paesse_geschrieben: 0, pass_konflikte: [], nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
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
  /* Die rohen Aufstellungen aller Spiele dieses Laufs — fuer die Paesse
     danach, in EINEM Durchgang statt einmal pro Spiel. */
  const alleRoh: SfvRoh[] = [];

  for (const spiel of kandidaten) {
    const matchId = spiel.sfv_match_id as number;
    try {
      /* Drei Aufrufe, streng seriell mit demselben Token — ein zweiter
         POST /api/token wuerde den ersten sofort ungueltig machen. */
      await holeMatch(zugang, token, matchId);
      const rohAufstellung = await holeAufstellung(zugang, token, matchId);
      const rohEreignisse = await holeEreignisse(zugang, token, matchId);
      const rohRefs = await holeSchiedsrichter(zugang, token, matchId);
      alleRoh.push(...rohAufstellung);

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

      /* schiedsrichter steht in sync_felder unter spiele.sfv_matchdaten —
         es gehoert dem Verband, wird aber von DIESEM Durchgang geschrieben,
         nicht vom Spielplan. Nie mit null ueberschreiben: bei zwei von 21
         Spielen liefert der Verband keinen Eintrag, und ein von Hand
         gepflegter Wert soll dann stehen bleiben. */
      const schiri = leseSchiedsrichter(rohRefs);
      await db.from("spiele")
        .update(schiri ? { matchdaten_geholt_am: jetzt, schiedsrichter: schiri }
                       : { matchdaten_geholt_am: jetzt })
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

  const pass = await schreibePaesse(db, v.verein_id, alleRoh, unsereClubNummer);
  erg.paesse_geschrieben = pass.geschrieben;
  erg.pass_konflikte = pass.konflikte;
  erg.nachzug_meldungen = await pruefeNachzug(db, v.verein_id);
  const zaehlung = await zaehleUnzugeordnet(db, v.verein_id);
  erg.eigene_unzugeordnet = zaehlung.offen;
  erg.zuordnungen_gesamt = zaehlung.bekannt;
  /* Die Namen aus denselben Rohdaten, die der Lauf ohnehin geholt hat —
     kein zweiter Abruf, kein zweites Token. */
  erg.offene_namen = bildeOffeneNamen(alleRoh, unsereClubNummer, zaehlung.zugeordnet);

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
/* Gibt die Menge der zugeordneten SFV-Personen mit zurueck: `bildeOffeneNamen`
   braucht sie, und sie zweimal zu holen waere ein zweiter Ort, an dem
   dieselbe Aussage auseinanderlaufen kann. */
async function zaehleUnzugeordnet(
  db: SupabaseClient, vereinId: string,
): Promise<{ offen: number; bekannt: number; zugeordnet: Set<number> }> {
  const { data: aufstellung } = await db
    .from("spiel_aufstellung").select("sfv_person_id").eq("verein_id", vereinId);
  const { data: zuordnung } = await db
    .from("sfv_zuordnung").select("sfv_person_id").eq("verein_id", vereinId);

  const bekannt = new Set((zuordnung ?? []).map((z) => Number(z.sfv_person_id)));
  const alle = new Set((aufstellung ?? []).map((a) => Number(a.sfv_person_id)));
  let offen = 0;
  for (const p of alle) if (!bekannt.has(p)) offen += 1;
  return { offen, bekannt: bekannt.size, zugeordnet: bekannt };
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


/* ── Spielerpass ───────────────────────────────────────────────────────────
   Der Verband fuehrt den Pass, wir schreiben ihn ab — wer von Hand tippt,
   macht Fehler. Es ist das ERSTE MAL, dass ein Sync ein Mitgliederfeld
   anfasst, deshalb steht die Entscheidung in migration_sfv_pass.sql und die
   Regeln in passAenderungen().

   ⚠ EINE ABWEICHUNG WIRD FESTGEHALTEN. `mitglieder.spielerpass` zu
   ueberschreiben ist richtig — der Verband hat recht —, aber nicht still:
   wer die Nummer von Hand eingetragen hatte, soll im Verlauf sehen, was
   daraus wurde. Nach der Regel aus CLAUDE.md:
     Wert A -> Wert B   mitglieder_aenderungen
     null   -> Wert     mitglieder_aktivitaeten (FELD_ERFASST) */
const PASS_URHEBER = "SFV-Sync";

async function schreibePaesse(
  db: SupabaseClient, vereinId: string, alleRoh: SfvRoh[], unsere: number | null,
): Promise<{ geschrieben: number; konflikte: string[] }> {
  if (!alleRoh.length || unsere === null) return { geschrieben: 0, konflikte: [] };

  const { data: zuordnungRoh, error: zuordnungErr } = await db
    .from("sfv_zuordnung").select("sfv_person_id,mitglied_id").eq("verein_id", vereinId);
  /* error lesen, nicht nur auf data pruefen: sb.from().select() wirft nicht.
     Ohne das saehe ein 42501 aus wie „es gibt keine Zuordnungen". */
  if (zuordnungErr) {
    return { geschrieben: 0, konflikte: [`Zuordnungen nicht lesbar: ${zuordnungErr.message}`] };
  }
  if (!zuordnungRoh?.length) return { geschrieben: 0, konflikte: [] };
  const zuordnung = new Map(
    zuordnungRoh.map((z) => [Number(z.sfv_person_id), Number(z.mitglied_id)]));

  /* ⚠ `person_id` MUSS mit. Seit der Migration `migration_verlauf_person.sql`
     haengen `mitglieder_aenderungen` und `mitglieder_aktivitaeten` an der
     PERSON: der Verlauf gehoert ihr und ueberlebt Austritt und Rueckkehr.
     `person_id` ist dort NOT NULL — ohne diesen Wert scheitert jeder
     stuendliche Lauf mit 23502.

     Absichtlich NOT NULL und nicht per Trigger nachgefuellt: ein
     vergesslicher Schreibpfad soll LAUT scheitern und nicht still eine Zeile
     ohne Bezug anlegen. */
  const { data: mitglieder, error: mitgliederErr } = await db
    .from("mitglieder").select("id,spielerpass,person_id")
    .in("id", [...zuordnung.values()]);
  /* ⚠ Auch hier: bliebe der Fehler ungelesen, waere `bestand` leer, jede
     Passnummer saehe neu aus, und der Lauf schriebe fuer JEDES Mitglied eine
     „Spielerpass vom Verband uebernommen"-Aktivitaet. Ein Lesefehler wuerde
     zu erfundener Geschichte. */
  if (mitgliederErr) {
    return { geschrieben: 0, konflikte: [`Mitglieder nicht lesbar: ${mitgliederErr.message}`] };
  }
  const bestand = new Map(
    (mitglieder ?? []).map((m) => [Number(m.id), (m.spielerpass as string | null) ?? null]));
  const personVon = new Map(
    (mitglieder ?? []).map((m) => [Number(m.id), (m.person_id as string | null) ?? null]));

  const konflikte = passKonflikte(alleRoh, unsere, zuordnung)
    .map((k) => `Mitglied ${k.mitglied_id}: zwei Passnummern (${k.werte.join(" / ")}) — Zuordnung pruefen`);

  const aenderungen = passAenderungen(alleRoh, unsere, zuordnung, bestand);
  if (!aenderungen.length) return { geschrieben: 0, konflikte };

  let geschrieben = 0;
  for (const a of aenderungen) {
    const { error } = await db.from("mitglieder")
      .update({ spielerpass: a.neu }).eq("id", a.mitglied_id);
    /* Die Meldung festhalten statt sie zu verschlucken — der Unique-Index
       auf (verein_id, spielerpass) schlaegt hier zu, wenn zwei Mitglieder
       dieselbe Nummer bekaemen. Ohne Text saehe das aus wie "der Verband
       hat nichts geliefert" (CLAUDE.md: ein leerer catch macht aus einem
       Fehler eine Datenlage). */
    if (error) {
      if (konflikte.length < 5) konflikte.push(`Mitglied ${a.mitglied_id}: ${error.message}`);
      continue;
    }

    const jetzt = new Date().toISOString();
    const personId = personVon.get(a.mitglied_id) ?? null;
    /* Eine Mitgliedschaft ohne Person waere ein Datenloch aus der Zeit vor
       Etappe 2b. Melden statt eine Zeile ohne Bezug zu schreiben — der
       Spielerpass selbst ist oben bereits gespeichert, nur der Verlaufseintrag
       entfaellt. */
    if (!personId) {
      if (konflikte.length < 5) {
        konflikte.push(`Mitglied ${a.mitglied_id}: keine person_id — Verlaufseintrag uebersprungen`);
      }
      geschrieben += 1;
      continue;
    }
    /* ⚠ Der Fehler wird GELESEN. Bis zum 21.08.2026 stand hier ein blosses
       `await …insert(…)` ohne Rueckgabewert: ein fehlgeschlagener Eintrag
       verschwand spurlos, und der Lauf meldete Erfolg. Genau in dem Fenster
       zwischen Migration und Deploy waere das passiert — die eine Sorte
       Verlust, die man hinterher nicht mehr findet. */
    const { error: logErr } = a.alt
      ? await db.from("mitglieder_aenderungen").insert({
          mitglied_id: a.mitglied_id, person_id: personId,
          verein_id: vereinId, feld: "spielerpass",
          alter_wert: a.alt, neuer_wert: a.neu,
          geaendert_von: PASS_URHEBER, geaendert_at: jetzt,
        })
      : await db.from("mitglieder_aktivitaeten").insert({
          mitglied_id: a.mitglied_id, person_id: personId,
          verein_id: vereinId, typ: "FELD_ERFASST",
          beschreibung: `Spielerpass vom Verband uebernommen: ${a.neu}`,
          feld: "spielerpass", wert: a.neu,
          geaendert_von: PASS_URHEBER, geaendert_at: jetzt,
        });
    if (logErr && konflikte.length < 5) {
      konflikte.push(`Mitglied ${a.mitglied_id}: Verlaufseintrag nicht geschrieben (${logErr.message})`);
    }
    geschrieben += 1;
  }
  return { geschrieben, konflikte };
}
