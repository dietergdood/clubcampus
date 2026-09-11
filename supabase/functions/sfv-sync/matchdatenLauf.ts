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
//   - ⚠ ht_resultat wird seit dem 10.09.2026 GESCHRIEBEN. Der Satz hier
//     lautete bis dahin „leseHalbzeit() ist vorbereitet und wird bewusst noch
//     nicht aufgerufen" — drei Wochen lang, waehrend die Spalte leer stand.
//     Die Feldhoheit ist mit migration_ht_resultat_sfv.sql zurueckgestellt.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { holeMatch, holeAufstellung, holeEreignisse, holeSchiedsrichter, holeTeamBild, SfvFehler } from "./sfvApi.ts";
import type { SfvZugang } from "./sfvApi.ts";
import { schreibeSfvPersonen } from "./sfvPersonenSchreiben.ts";
import {
  bildeAufstellung, verschmelzeAufstellung, bildeEreignis, leseHalbzeit, istKorrekturUeberfluessig, waehleKandidaten,
  passAenderungen, passKonflikte, leseSchiedsrichter,
  MATCHDATEN_STATUS, zaehleVerbandKorrekturen, gegnerUnveraendert,
  verlaufUnveraendert,
} from "./matchdaten.ts";
import type { KorrekturZeile, SfvRoh, SpielKandidat, VerlaufVergleich, FremdVergleich } from "./matchdaten.ts";
import { ausBase64, erkenneBild, logoPfad, offeneLogos, LOGO_BUCKET } from "./logos.ts";
import type { LogoZeile } from "./logos.ts";
import type { MatchdatenErgebnis } from "./ergebnisTypen.ts";
import { meldeNeueUnzugeordnete } from "./meldungZuordnung.ts";

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
    spiele_geholt: 0, aufstellung_zeilen: 0, ereignisse_zeilen: 0,
    /* ⚠ Was der Verband GELIEFERT hat, roh, vor jedem Filter. Ohne sie
       ist „nur neun Spieler" nicht von „wir haben neun uebrig gelassen"
       zu unterscheiden — und genau das war am 11.09.2026 die Frage. */
    aufstellung_geliefert: 0, eigen_ohne_person: 0, fremd_ohne_nummer: 0,
    verband_hat_korrigiert: 0, fremd_unveraendert: 0, verlauf_unveraendert: 0,
    eigene_unzugeordnet: 0, zuordnungen_gesamt: 0, namen_geschrieben: 0, aufstellung_fremd: 0, gegner_doppel: 0,
    halbzeit: { da: 0, fehlt: 0, leer: 0, ohne_halbzeit: 0 }, paesse_geschrieben: 0, pass_konflikte: [], nachzug_meldungen: 0, fehler: 0, fehlermeldungen: [],
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
    /* ⚠ Aus MATCHDATEN_STATUS, nicht als Zahl hier: die vollstaendige
       Liste der zwoelf Status steht daneben, und wer die Auswahl aendern
       will, sieht dort zuerst, wovon er auswaehlt. Am 11.09.2026 hat eine
       unvollstaendige Aufzaehlung (fuenf statt zwoelf) mich glauben
       lassen, „3 forfait" gebe es nicht. */
    .in("sfv_status", MATCHDATEN_STATUS);

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
      /* VIER Aufrufe, streng seriell mit demselben Token — ein zweiter
         POST /api/token wuerde den ersten sofort ungueltig machen.

         ⚠ Hier stand „Drei Aufrufe", seit holeSchiedsrichter am
         20.08.2026 dazukam — CLAUDE.md fuehrt die falsche Zahl als
         eigenen Befund: sie deckt den toten holeMatch-Aufruf zu, weil
         wer „drei" liest und vier zaehlt, den Fehler beim Zaehlen sucht.
         Am 10.09.2026 waren es kurzzeitig fuenf (/bench), jetzt wieder
         vier. Wer hier eine Zeile ergaenzt, aendert die Zahl mit. */
      /* ⚠ ⚠  GEBUNDEN, NICHT WEGGEWORFEN — seit dem 10.09.2026.

         Der Aufruf stand hier seit jeher und sein Ergebnis wurde in
         derselben Zeile verworfen; CLAUDE.md fuehrt ihn als eigenen
         Befund. Er traegt zehn Felder, die der Spielplan nicht hat —
         darunter `intermediateResults`, den Halbzeitstand, waehrend
         `spiele.ht_resultat` daneben leer stand.

         **Ein weggeworfener Abruf, kein fehlender: das Auslesen kostet
         nichts.** Die Antwort ist schon bezahlt und schon da. */
      const rohMatch = await holeMatch(zugang, token, matchId);
      const rohAufstellung = await holeAufstellung(zugang, token, matchId);
      const rohEreignisse = await holeEreignisse(zugang, token, matchId);
      const rohRefs = await holeSchiedsrichter(zugang, token, matchId);
      alleRoh.push(...rohAufstellung);

      /* ⚠ VERSCHMELZEN, obwohl es seit dem Ausbau von /bench nur noch
         EINE Quelle gibt. Der fremde Zweig arbeitet weiter: nennt der
         Verband zwei Gegner mit derselben Rueckennummer, braechte der
         Stapel sonst mit 21000 ab — genau das ist am 10.09.2026 mit den
         zwei Listen passiert. `gegner_doppel` zaehlt solche Faelle,
         statt sie stillschweigend zu schlucken. */
      /* ⚠ ⚠  DREI ZAHLEN, DIE AUFGEHEN MUESSEN — seit dem 11.09.2026.

         `bildeAufstellung` verwirft Zeilen, und bis heute zaehlte das
         niemand: eine eigene ohne personId und eine fremde ohne Nummer
         fielen lautlos weg. Der Aufrufer sah eine Liste und konnte nicht
         sagen, ob sie so kam oder so uebrig blieb.

         **Gemessen am 11.09.2026:** vier Spiele mit 8 bis 10 eigenen
         Zeilen, eines davon bei 21 Ereignissen. Weniger als elf kann
         keine Mannschaft aufstellen — aber ob der Verband weniger
         lieferte oder dieser Filter zuschlug, war nicht zu trennen.

         ⚠ Eine Aufteilung, die aufgehen MUSS, prueft sich selbst; eine
         einzelne Zahl kann nur behauptet werden. Dieselbe Bauart wie
         `zaehlung_stimmt` im Export. */
      const verworfen: string[] = [];
      const rohZeilen = [
        ...rohAufstellung
          .map((p) => bildeAufstellung(p, unsereClubNummer, v.verein_id, spiel.id, jetzt, verworfen)),
      ].filter((z): z is NonNullable<typeof z> => z !== null);
      const rohFremd = rohZeilen.filter((z) => !z.ist_eigener).length;

      erg.aufstellung_geliefert += rohAufstellung.length;
      for (const grund of verworfen) {
        if (grund === "eigen_ohne_person") erg.eigen_ohne_person += 1;
        else erg.fremd_ohne_nummer += 1;
      }
      const aufstellung = verschmelzeAufstellung(rohZeilen);

      const ereignisse = rohEreignisse
        .map((e) => bildeEreignis(e, unsereClubNummer, v.verein_id, spiel.id, jetzt))
        .filter((z): z is NonNullable<typeof z> => z !== null);

      /* ⚠ ⚠  ZWEI UPSERTS, ZWEI SCHLUESSEL — seit Entscheid B (10.09.2026).
         Fremde Zeilen haben `sfv_person_id = null`, und ein UNIQUE laesst
         in Postgres beliebig viele NULLs zu. Der alte Konfliktschluessel
         greift dort also GAR NICHT: mit einem einzigen Upsert legte jeder
         stuendliche Lauf dieselben elf Gegnerzeilen neu an, und niemand
         merkte es — die Tabelle waechst, nichts schlaegt fehl.

         Fuer sie gilt der partielle Index
         (verein_id, spiel_id, sfv_team_id, rueckennr). */
      const eigeneZeilen = aufstellung.filter((z) => z.ist_eigener);
      const fremdeZeilen = aufstellung.filter((z) => !z.ist_eigener);
      /* ⚠ Was das Verschmelzen auf der Gegnerseite weggenommen hat, wird
         GEZAEHLT. Ein Gegner kann nicht aus zwei Quellen kommen — /bench
         gibt fuer fremde Spieler nichts her —, also bedeutet eine
         Doppelung hier: der Verband nennt zwei Spieler mit derselben
         Nummer. Das ist ein Befund ueber die QUELLE, und stillschweigend
         zu verschmelzen hiesse, ihn zuzudecken. */
      erg.gegner_doppel += rohFremd - fremdeZeilen.length;

      if (eigeneZeilen.length) {
        const { error } = await db.from("spiel_aufstellung")
          .upsert(eigeneZeilen, { onConflict: "verein_id,spiel_id,sfv_person_id" });
        if (error) throw new SfvFehler(`Aufstellung: ${error.message}`);
        erg.aufstellung_zeilen += eigeneZeilen.length;
      }

      if (fremdeZeilen.length) {
        /* ⚠ ⚠  HIER STEHT ABSICHTLICH KEIN upsert — und wer ihn
           zurueckschreibt, bekommt denselben Fehler wie am 10.09.2026:

             there is no unique or exclusion constraint matching the
             ON CONFLICT specification

           Der Schluessel fuer Gegnerzeilen ist ein PARTIELLER Index
           (… where ist_eigener = false and rueckennr is not null).
           Postgres leitet einen partiellen Index nur ab, wenn dieselbe
           Bedingung als index_predicate im ON CONFLICT steht — und
           PostgREST kann in `onConflict` nur SPALTEN nennen, kein
           Praedikat. **Der Index passt; die Angabe kann ihn nicht
           erreichen.**

           ⚠ Die naheliegende Reparatur waere, den Index unpartiell zu
           machen. Sie ist falsch: die Bedingung IST die Sperre, und ein
           unpartieller Schluessel ueber (Team, Nummer) faengt auch eigene
           Zeilen — zwei eigene Spieler mit derselben Nummer waeren dann
           ein Fehler statt einer Datenlage.

           Also: die Gegneraufstellung dieses Spiels wird ERSETZT.
           Lesen, loeschen, schreiben. Sie ist reine Spiegelung des
           Verbands — es gibt in dieser Tabelle keine Vereinszeilen und
           keine Korrekturen, anders als bei spiel_ereignisse.

           ⚠ Nicht atomar: bricht das Schreiben nach dem Loeschen ab,
           fehlt die Gegneraufstellung dieses Spiels bis zum naechsten
           Lauf. Das ist der Preis, und er ist bezahlbar, weil jeder Lauf
           sie neu herleitet. */
        const alt = await db.from("spiel_aufstellung")
          .select("sfv_team_id,rueckennr,erstmals_gesehen,position_id,"
            + "position_name,von_minute,bis_minute,spielzeit,"
            + "rolle_zuweisung_id,rolle_zuweisung,sfv_person_id,name")
          .eq("verein_id", v.verein_id).eq("spiel_id", spiel.id)
          .eq("ist_eigener", false);
        if (alt.error) {
          throw new SfvFehler(`Gegneraufstellung lesen: ${alt.error.message}`);
        }
        const alteFremde = (alt.data ?? []) as unknown as FremdVergleich[];

        /* ⚠ ⚠  NUR ERSETZEN, WAS SICH GEAENDERT HAT — seit dem 11.09.2026,
           und es behebt eine Kollision mit dem WAECHTER, nicht bloss eine
           Verschwendung.

           `delete + insert` setzt ueber den Trigger IMMER
           `zuletzt_geaendert = now()`: bei INSERT gibt es kein `old`, es
           kann also nichts vergleichen. Daraus folgt `export_wartet() > 0`
           und daraus ein vollstaendiger WordPress-Export mit 21 POSTs —
           stuendlich, ohne dass sich etwas geaendert hat.

           ⚠ Der Waechter fragt beim Export **„wartet etwas?"** statt
           „wann lief er zuletzt?", mit ausdruecklicher Begruendung. Genau
           diese Frage wird bedeutungslos, wenn stuendlich etwas wartet.

           Der Vergleich kostet nichts: die alten Zeilen werden ohnehin
           gelesen (fuer `erstmals_gesehen`), es kommen nur Spalten dazu. */
        if (gegnerUnveraendert(alteFremde, fremdeZeilen as unknown as FremdVergleich[])) {
          /* ⚠ GEZAEHLT, NICHT STILL UEBERSPRUNGEN. Ein Schreibvorgang, der
             ausbleibt, sieht von aussen aus wie einer, der nie vorgesehen
             war — und dann ist beim naechsten Mal nicht zu sagen, ob die
             Reparatur greift oder der Zweig tot ist. */
          erg.fremd_unveraendert += fremdeZeilen.length;
        } else {
          /* `erstmals_gesehen` traegt mit — sonst hiesse die Spalte nach dem
             ersten Ersetzen „zuletzt neu angelegt", und ein Spaltenname, der
             etwas anderes sagt als sein Inhalt, ist teurer als der Umweg
             ueber diese eine Abfrage. */
          const seit = new Map<string, string>();
          for (const z of alteFremde) {
            seit.set(`${z.sfv_team_id}:${z.rueckennr}`, z.erstmals_gesehen as string);
          }

          const weg = await db.from("spiel_aufstellung").delete()
            .eq("verein_id", v.verein_id).eq("spiel_id", spiel.id)
            .eq("ist_eigener", false);
          if (weg.error) {
            throw new SfvFehler(`Gegneraufstellung leeren: ${weg.error.message}`);
          }

          const { error } = await db.from("spiel_aufstellung")
            .insert(fremdeZeilen.map((z) => {
              const frueher = seit.get(`${z.sfv_team_id}:${z.rueckennr}`);
              return frueher ? { ...z, erstmals_gesehen: frueher } : z;
            }));
          if (error) throw new SfvFehler(`Gegneraufstellung: ${error.message}`);
          erg.aufstellung_fremd += fremdeZeilen.length;
        }
      }

      /* ⚠ ⚠ ⚠  ERSETZEN, NICHT UPSERTEN — seit dem 11.09.2026.

         Hier stand ein `upsert` auf `(verein_id, sfv_event_id)`. Der
         Schluessel ist richtig und der Constraint haelt (gemessen: 1051
         Zeilen, 1051 verschiedene Paare). **Falsch war die Annahme
         darueber, was eine `sfv_event_id` IST.**

         Sie ist keine Kennung des EREIGNISSES, sondern eine des Eintrags
         beim Verband: wird ein Matchblatt nachtraeglich berichtigt,
         bekommt derselbe Vorgang eine neue Nummer. Der Upsert findet
         dann keinen Konflikt und legt den ganzen Verlauf noch einmal an.

         Gemessen an Spiel 4379006 (29.08., 1:6) — das Tor der 37.:

           30038739 · 31.08.   30064899 · 01.09.   30083863 · 11.09.

         Dieselbe Minute, derselbe Typ, dieselbe Person, drei Kennungen.
         Auf der Website stand jede Verlaufszeile dreifach.

         ⚠ **Dieselbe Klasse wie `substitutePlayerId`:** ein Feld, das wie
         ein Schluessel aussieht und keiner ist. Es war nie ein Fehler im
         Upsert.

         ── Warum ERSETZEN und nicht ein besserer Schluessel ─────────────

         Ein fachlicher Schluessel (Minute, Typ, Person) haette eine echte
         Doppelung verschluckt: gemessen am 11.09.2026 hat ein Gegner mit
         der Nummer 9 in der 69. ZWEI Tore erzielt, in EINEM Abruf. Nichts,
         was wir fuehren, unterscheidet die beiden Zeilen.

         **Was man nicht entdoppelt, kann man nicht faelschlich
         entdoppeln.** Der Verband liefert je Abruf den VOLLSTAENDIGEN
         Verlauf — gemessen an 70 Spielen, und bei 68 davon stimmt die
         Zahl der Tor-Ereignisse exakt gegen das Resultat. Also wird der
         jueng­ste Abruf ganz uebernommen und der vorherige ganz verworfen.

         ⚠ NUR `herkunft = 'sfv'`. Vereinszeilen sind Eingaben von
         Menschen und werden nie geloescht.

         ⚠ ⚠  UND EIN HAKEN, DER HEUTE FOLGENLOS IST UND ES NICHT BLEIBT:
         eine Vereins-Korrektur zeigt ueber `ersetzt_ereignis_id` auf die
         `id` einer SFV-Zeile. Wird die geloescht und neu angelegt, zeigt
         die Korrektur ins Leere; `mischeEreignisse` faengt das ab („zeigt
         ins Leere: trotzdem zeigen"), aber sie verliert ihren Anker.
         **Gemessen am 11.09.2026: null Vereinszeilen im ganzen Bestand.**
         Wer die erste erfasst, braucht davor ein Neuverankern ueber den
         fachlichen Schluessel. */
      const altRes = await db.from("spiel_ereignisse")
        .select("id, minute, zusatzminute, typ_id, subtyp_id, ist_eigener,"
          + " sfv_person_id, rueckennr, typ, subtyp, sfv_team_id,"
          + " gegner_club_name, ein_sfv_person_id, ein_rueckennr")
        .eq("verein_id", v.verein_id)
        .eq("spiel_id", spiel.id)
        .eq("herkunft", "sfv");
      if (altRes.error) {
        throw new SfvFehler(`Verlauf nicht lesbar: ${altRes.error.message}`);
      }
      const alteZeilen = (altRes.data ?? []) as unknown as VerlaufVergleich[];

      /* ⚠ ⚠  GEZAEHLT WIRD VOR DEM LOESCHEN. Danach gibt es nichts mehr
         zu vergleichen — und der Beleg, dass der Verband seine eigene
         Angabe geaendert hat, waere mitgeloescht. Dieselbe Regel wie bei
         `unplausibel`, das nach der Korrektur gesetzt bleibt: **die
         Korrektur macht den Befund unsichtbar, nicht ungeschehen.** */
      if (alteZeilen.length && ereignisse.length) {
        erg.verband_hat_korrigiert += zaehleVerbandKorrekturen(
          alteZeilen, ereignisse as unknown as VerlaufVergleich[],
        );
      }

      /* ⚠ ⚠  NUR ERSETZEN, WENN SICH ETWAS GEAENDERT HAT — nachgezogen
         am 11.09.2026, Stunden nach dem Ersetzen selbst.

         **Ich hatte eine von zwei identischen Stellen repariert.** Die
         Gegneraufstellung vergleicht seit heute Mittag; der Verlauf tat
         es nicht — und das Ersetzen, das ich heute gebaut habe, hat die
         Kollision hier ERST EINGEFUEHRT. Vorher lief er ueber einen
         Upsert: unveraenderte Zeilen wurden UPDATEt, der Trigger verglich
         den Inhalt und liess den Stempel stehen.

         ⚠ Bei INSERT kann er nichts vergleichen — es gibt kein `old`.
         Also: Stempel, `export_wartet() > 0`, vollstaendiger Export.
         Didi hat es an der anderen Stelle unabhaengig belegt: drei
         Laeufe, dreimal dieselben 141 Gegnerzeilen neu geschrieben.

         **Ohne diesen Vergleich haette die Messung der Reparatur „wirkt
         nicht" ergeben** — und die Suche waere beim Vergleich gelandet
         statt bei der zweiten Stelle. */
      const gleich = verlaufUnveraendert(
        alteZeilen as unknown as FremdVergleich[],
        ereignisse as unknown as FremdVergleich[],
      );
      if (gleich) {
        /* ⚠ Gezaehlt, nicht still uebersprungen — wie bei den
           Gegnerzeilen. Ein Schreibvorgang, der ausbleibt, sieht von
           aussen aus wie einer, der nie vorgesehen war. */
        erg.verlauf_unveraendert += ereignisse.length;
      } else {
      if (alteZeilen.length) {
        const { error } = await db.from("spiel_ereignisse")
          .delete()
          .eq("verein_id", v.verein_id)
          .eq("spiel_id", spiel.id)
          .eq("herkunft", "sfv");
        if (error) throw new SfvFehler(`Verlauf löschen: ${error.message}`);
      }

      if (ereignisse.length) {
        /* ⚠ Nicht atomar: bricht das Schreiben nach dem Loeschen ab,
           fehlt der Verlauf dieses Spiels bis zum naechsten Lauf.
           Dieselbe Abwaegung wie bei der Gegneraufstellung — und derselbe
           Grund, sie hinzunehmen: die Tabelle ist eine reine Spiegelung,
           der naechste Lauf stellt sie wieder her. */
        const { error } = await db.from("spiel_ereignisse").insert(ereignisse);
        if (error) throw new SfvFehler(`Ereignisse: ${error.message}`);
        erg.ereignisse_zeilen += ereignisse.length;
      }
      }

      /* ── Halbzeitstand ──────────────────────────────────────────────
         ⚠ NUR SCHREIBEN, WENN ETWAS DA IST. Der Grund, aus dem
         `ht_resultat` am 14.08.2026 der Feldhoheit `verein` zugeschlagen
         wurde, war: „bliebe die Deklaration stehen, schriebe der Sync
         stuendlich NULL ueber eine von Hand erfasste Halbzeit". Der
         Einwand gilt weiter — er wird hier beantwortet, nicht ignoriert.

         Deshalb geht `null` nie in das Update. Ein Verein, der eine
         Halbzeit von Hand erfasst hat, behaelt sie, solange der Verband
         keine liefert. */
      const hz = leseHalbzeit(rohMatch);
      erg.halbzeit[hz.zustand] += 1;
      if (hz.stand !== null) {
        const { error } = await db.from("spiele")
          .update({ ht_resultat: hz.stand })
          .eq("verein_id", v.verein_id).eq("id", spiel.id);
        if (error) throw new SfvFehler(`Halbzeit: ${error.message}`);
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
  /* ⚠ DIE NAMEN, aus denselben Rohdaten wie die Aufstellung — null
     zusaetzliche Abrufe. Nach der Schleife und nicht darin: derselbe
     Spieler steht in mehreren Spielen, und ein Stapel je Spiel schriebe
     dieselbe Zeile mehrfach. */
  if (alleRoh.length) {
    const namen = await schreibeSfvPersonen(db, alleRoh, unsereClubNummer, v.verein_id, jetzt);
    erg.namen_geschrieben = namen.geschrieben;
  }

  erg.paesse_geschrieben = pass.geschrieben;
  erg.pass_konflikte = pass.konflikte;
  erg.nachzug_meldungen = await pruefeNachzug(db, v.verein_id);

  /* Meldung ueber NEUE unzugeordnete Spieler. Steht hier und nicht in der
     Aktion `namen`: sie soll von selbst kommen, nicht erst, wenn jemand
     ohnehin schon in der Zuordnungsmaske sitzt. Der Rueckgabewert wird
     bewusst nicht ins Ergebnis geschrieben — die Zahl der Meldungen ist
     keine Aussage ueber die Daten, und ein weiteres Feld waere ein
     weiterer Ausgang. */
  await meldeNeueUnzugeordnete(db, v.verein_id);
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
  /* ⚠ ⚠  `.eq("ist_eigener", true)` IST NICHT ZIERRAT — ohne ihn zaehlt
     der Frühwarner einen Spieler, den es nicht gibt.

     Seit Entscheid B (10.09.2026) stehen Gegnerzeilen in derselben
     Tabelle, und ihre `sfv_person_id` ist NULL. `Number(null)` ist **0**,
     0 steht in keiner Zuordnung — also zaehlte jede Datenbank mit
     mindestens einer Gegnerzeile genau einen Phantomspieler mit.

     ⚠ Die Funktion heisst `zaehleUnzugeordnet` und das Feld
     `eigene_unzugeordnet`. Der Name sagte „eigene", der Filter nicht —
     dieselbe Familie wie ein Zaehler, dessen Name mehr behauptet als er
     misst. Und er verschiebt nur um eins, was ihn schwerer auffindbar
     macht als einen groben Fehler. */
  const { data: aufstellung } = await db
    .from("spiel_aufstellung").select("sfv_person_id")
    .eq("verein_id", vereinId).eq("ist_eigener", true);
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
    .map((k) => `Mitglied ${k.mitglied_id}: zwei Passnummern (${k.werte.join(" / ")}) — Zuordnung prüfen`);

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
        konflikte.push(`Mitglied ${a.mitglied_id}: keine person_id — Verlaufseintrag übersprungen`);
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
          beschreibung: `Spielerpass vom Verband übernommen: ${a.neu}`,
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
