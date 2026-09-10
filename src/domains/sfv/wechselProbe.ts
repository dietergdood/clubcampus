/* ══════════════════════════════════════════════════════════════════════
   Wer ist bei einem Wechsel wer — und was liefert der Verband dazu?

   ⚠ ANLASS (11.09.2026). Die Verbandsseite zeigt

       „85' Aksel Nonnez ersetzt durch Ivan Predannikov"

   und unsere Website zeigte

       „85' Aksel Nonnez · für Nr. 19"

   Daraus folgen zwei Dinge, und nur eines davon war bekannt:

     1 · DIE RICHTUNG WAR VERTAUSCHT. `personId` ist der Spieler, der
         VOM Platz geht; `substitutePlayer` ist sein Ersatz. Unser Text
         las sich umgekehrt („X für Nr. 19" heisst: X kommt für 19).
         Das ist ohne Messung nicht zu sehen — beide Lesarten ergeben
         einen plausiblen Satz, und solange beide Menschen Nummern
         waren, sah niemand einen Unterschied.

     2 · DER ZWEITE MENSCH HAT KEINE KENNUNG, aber offenbar einen Namen.
         Gemessen von Didi: `ein_sfv_person_id` ist bei allen 176
         Wechseln leer. Der Verband zeigt den Namen trotzdem — also muss
         er woanders herkommen.

   ⚠ `MatchEvent` führt fünf Felder zum zweiten Menschen:
   `substitutePlayerId`, `-JerseyNumber`, `-Name`, `-BirthDate`,
   `-PassportNumber`. Der Mapper liest die ersten zwei. **`-Name` steht
   in der Liste der Felder, die ausdrücklich NICHT gelesen werden** —
   dieselbe Zeile, die Geburtsdatum und Passnummer fernhält.

   Diese Datei entscheidet nichts, sie ZÄHLT: welches der Felder trägt
   bei einem echten Wechsel etwas? Erst danach ist zu entscheiden, ob
   eine Spalte dazukommt.

   ⚠ SIE GIBT KEINE NAMEN ZURÜCK, nur ob einer da ist. Die Frage lautet
   „liefert der Verband das Feld?", nicht „wie heisst er?" — und eine
   Probe, die mehr herausgibt als ihre Frage verlangt, ist der Anfang
   des nächsten Protokoll-Funds.
   ══════════════════════════════════════════════════════════════════════ */

/** Der Ereignistyp „Auswechslung" in den SFV-Stammdaten. */
export const TYP_WECHSEL_SFV = 2;

export interface WechselBefund {
  /** Wechselereignisse insgesamt, eigene wie fremde. */
  wechsel_gesamt: number;
  /** Davon eigene — nur bei diesen dürfen Personendaten stehen. */
  wechsel_eigene: number;
  /** Wie oft der Verband die Kennung des Ersatzspielers mitschickt. */
  mit_ersatz_id: number;
  /** Wie oft er dessen Rückennummer mitschickt. */
  mit_ersatz_nummer: number;
  /** ⚠ Die entscheidende Zahl: wie oft `substitutePlayerName` etwas trägt. */
  mit_ersatz_name: number;
  /** Und zum Vergleich: wie oft der erste Mensch eine Kennung hat. */
  mit_person_id: number;
  /**
   * Bis zu drei Beispiele — Zahlen und Ja/Nein, keine Namen.
   * Sie stehen dabei, weil eine nackte Zahl nicht sagt, ob ein Feld
   * *fehlt* oder *leer* ist.
   */
  beispiele: Array<{
    person_id: number | null;
    rueckennr: number | null;
    ersatz_id: number | null;
    ersatz_nr: number | null;
    ersatz_name_vorhanden: boolean;
  }>;
}

function zahl(w: unknown): number | null {
  if (w === null || w === undefined || w === "") return null;
  const n = Number(w);
  return Number.isFinite(n) ? n : null;
}

function hatText(w: unknown): boolean {
  return typeof w === "string" && w.trim() !== "";
}

/**
 * Zählt, was der Verband zu Auswechslungen tatsächlich mitschickt.
 *
 * @param roh    Ereignisse aus `/api/match/{id}/events`, mehrere Spiele
 * @param unsere `vereine.sfv_club_nummer` — trennt eigen von fremd
 */
export function fasseWechselProbe(
  roh: Array<Record<string, unknown>>,
  unsere: number | null,
): WechselBefund {
  const b: WechselBefund = {
    wechsel_gesamt: 0, wechsel_eigene: 0,
    mit_ersatz_id: 0, mit_ersatz_nummer: 0, mit_ersatz_name: 0,
    mit_person_id: 0, beispiele: [],
  };

  for (const e of roh) {
    if (zahl(e.eventTypeId) !== TYP_WECHSEL_SFV) continue;
    b.wechsel_gesamt++;

    /* ⚠ Nur eigene weiter zählen. Beim Gegner gibt es die Felder auch —
       sie gehen uns nichts an, und sie in einer Zahl mitzuführen machte
       aus der Auskunft eine über fremde Personen. */
    const club = zahl(e.clubNumber);
    if (club === null || unsere === null || club !== unsere) continue;
    b.wechsel_eigene++;

    const ersatzId = zahl(e.substitutePlayerId);
    const ersatzNr = zahl(e.substitutePlayerJerseyNumber);
    const ersatzName = hatText(e.substitutePlayerName);

    if (ersatzId !== null) b.mit_ersatz_id++;
    if (ersatzNr !== null) b.mit_ersatz_nummer++;
    if (ersatzName) b.mit_ersatz_name++;
    if (zahl(e.personId) !== null) b.mit_person_id++;

    if (b.beispiele.length < 3) {
      b.beispiele.push({
        person_id: zahl(e.personId),
        rueckennr: zahl(e.jerseyNumber),
        ersatz_id: ersatzId,
        ersatz_nr: ersatzNr,
        ersatz_name_vorhanden: ersatzName,
      });
    }
  }

  return b;
}

/**
 * Der Satz, der aus dem Befund folgt — damit die Deutung nicht jedes Mal
 * neu erfunden wird.
 *
 * ⚠ Er sagt ausdrücklich auch, wenn die Probe NICHTS gesehen hat. Null
 * Wechsel und null Namen sehen in einer Zahlenreihe gleich aus.
 */
export function deuteWechselProbe(b: WechselBefund): string {
  if (b.wechsel_eigene === 0) {
    return "Kein eigener Wechsel in den geprüften Spielen — die Probe sagt nichts. "
      + "Mehr Spiele prüfen, nicht die Zahlen deuten.";
  }
  if (b.mit_ersatz_id > 0) {
    return `Der Verband schickt die Kennung mit (${b.mit_ersatz_id} von ${b.wechsel_eigene}). `
      + "Dann ist der Name über sfv_personen auflösbar und es braucht keine neue Spalte.";
  }
  if (b.mit_ersatz_name > 0) {
    return `Keine Kennung, aber ein Name (${b.mit_ersatz_name} von ${b.wechsel_eigene}). `
      + "Der Name ist die einzige Quelle — er braucht eine eigene Spalte, und die "
      + "Zuordnung zu einem Mitglied ist über ihn NICHT möglich.";
  }
  return `Weder Kennung noch Name (${b.wechsel_eigene} Wechsel). Bleibt die Rückennummer `
    + `(${b.mit_ersatz_nummer}) — dann zeigt die Verbandsseite den Namen aus der `
    + "Aufstellung, und wir könnten es nur genauso tun.";
}

/* ══════════════════════════════════════════════════════════════════════
   Was trägt ein CUPSPIEL statt eines Gruppennamens? (11.09.2026)

   ⚠ Gemeldet: 13 von 13 Cupspielen ohne `runde`. `runde` kommt aus
   `groupName`, und ein Cupspiel hat keine Gruppe — der Wert entsteht
   beim Verband, nicht bei uns.

   Der Spielplan führt daneben `roundNbr`, `playDay` und `playDayName`.
   **Alle drei kommen bei jedem Abruf ohnehin mit.** Was sie bei einem
   Cupspiel enthalten, weiss niemand: die Swagger-Datei hat zu keinem
   eine Beschreibung, und in der aufgezeichneten Beispielantwort ist kein
   Cupspiel.

   ⚠ Deshalb wird hier gemessen und nicht gebaut. Eine Spalte für ein
   Feld anzulegen, von dem niemand weiss, ob es „1. Runde", „3" oder
   nichts enthält, ist genau der Fehler, der in diesem Projekt schon
   dreimal als „Spalte ohne Leser" protokolliert ist — hier in der
   Vorwärtsrichtung.
   ══════════════════════════════════════════════════════════════════════ */

export interface CupBefund {
  spiele_gesamt: number;
  /** Spiele ohne `groupName` — die, um die es geht. */
  ohne_gruppe: number;
  /** Wie oft die drei Kandidaten etwas tragen, unter den Spielen ohne Gruppe. */
  mit_round_nbr: number;
  mit_play_day: number;
  mit_play_day_name: number;
  /**
   * Bis zu fünf Beispiele. ⚠ Hier stehen die WERTE, nicht nur ob etwas
   * da ist — anders als bei der Wechselprobe. Der Unterschied ist die
   * Sache: dort ging es um Personennamen, hier um „1. Runde" gegen „3",
   * und diese Frage lässt sich ohne den Wert nicht beantworten.
   */
  beispiele: Array<{
    wettbewerb: string;
    liga: string;
    round_nbr: number | null;
    play_day: number | null;
    play_day_name: string;
  }>;
}

export function fasseCupProbe(roh: Array<Record<string, unknown>>): CupBefund {
  const b: CupBefund = {
    spiele_gesamt: 0, ohne_gruppe: 0,
    mit_round_nbr: 0, mit_play_day: 0, mit_play_day_name: 0, beispiele: [],
  };

  for (const s of roh) {
    b.spiele_gesamt++;
    if (hatText(s.groupName)) continue;
    b.ohne_gruppe++;

    if (zahl(s.roundNbr) !== null) b.mit_round_nbr++;
    if (zahl(s.playDay) !== null) b.mit_play_day++;
    if (hatText(s.playDayName)) b.mit_play_day_name++;

    if (b.beispiele.length < 5) {
      b.beispiele.push({
        /* ⚠ Beide nebeneinander, weil sie verwechselt werden:
           `matchTypeName` ist die Betriebsart („Cup"), `leagueName` der
           Wettbewerb („Schweizer Cup U-18"). */
        wettbewerb: String(s.matchTypeName ?? ""),
        liga: String(s.leagueName ?? ""),
        round_nbr: zahl(s.roundNbr),
        play_day: zahl(s.playDay),
        play_day_name: String(s.playDayName ?? ""),
      });
    }
  }
  return b;
}

export function deuteCupProbe(b: CupBefund): string {
  if (b.ohne_gruppe === 0) {
    return "Kein Spiel ohne Gruppenname in diesem Satz — die Probe sagt nichts über "
      + "Cupspiele. Ein Zeitraum mit Cupspielen wählen.";
  }
  const traeger: string[] = [];
  if (b.mit_play_day_name > 0) traeger.push(`playDayName (${b.mit_play_day_name})`);
  if (b.mit_round_nbr > 0) traeger.push(`roundNbr (${b.mit_round_nbr})`);
  if (b.mit_play_day > 0) traeger.push(`playDay (${b.mit_play_day})`);
  if (!traeger.length) {
    return `${b.ohne_gruppe} Spiele ohne Gruppe, und keines der drei Felder trägt etwas. `
      + "Dann liefert der Verband die Runde nicht — und sie ist über die Schnittstelle "
      + "nicht zu haben.";
  }
  return `${b.ohne_gruppe} Spiele ohne Gruppe. Es tragen: ${traeger.join(", ")}. `
    + 'Die Beispiele zeigen, ob dort ein Text („1. Runde") oder eine blosse Zahl steht — '
    + "nur der Text taugt für die Anzeige.";
}
