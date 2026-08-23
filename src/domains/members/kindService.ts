/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/kindService.ts

   Was ein Elternteil an der Person seines Kindes ändern darf.

   Seit der Migration vom 21.08.2026 erlaubt `personen_update_kind`
   dem Elternteil, die Personenzeile seines Kindes zu schreiben.

   ⚠ RLS KENNT KEINE SPALTEN. Die Policy erlaubt die ZEILE, nicht
   einzelne Felder — ohne diese Datei könnte ein Elternteil auch
   `funktionen` (Vereinsämter), `email` (Login-Name) oder
   `profil_geprueft_at` seines Kindes setzen.

   Die Sperre sitzt deshalb hier im Service und nicht in der Maske:
   der nächste Schreibpfad, den jemand baut, hat sie sonst nicht.
   ═══════════════════════════════════════════════════════════════ */
import { PERSON_FELDER } from "../person/personService.ts";
import type { SbClient } from "../../types.ts";

type Zeile = Record<string, unknown>;

/**
 * ALLOWLIST, nie Denylist (CLAUDE.md → Fremddaten).
 *
 * Aufgezählt wird, was durchkommt. Ein neues Feld in `personen` ist damit im
 * Zweifel gesperrt und fällt auf, statt still mitzureisen — eine Denylist
 * wäre nur so gut wie die Fantasie dessen, der sie geschrieben hat.
 *
 * Von den 18 Einträgen in `PERSON_FELDER` bleiben fünf draussen:
 *
 *   email               ist der Login-Name. Sie zu ändern heisst, das Konto
 *                       des Kindes umzuhängen — das gehört der Verwaltung.
 *                       (Ändert sich mit auftrag_email_identitaet.md.)
 *   funktionen          Vereinsämter. Niemand vergibt sich selbst eines.
 *   profil_geprueft_at  setzt der Ablauf, nicht das Formular — siehe unten.
 *   foto_url            der Upload geht in den Bucket `mitglieder-fotos`,
 *                       dessen Policy in keinem Dump steht (einer der vier
 *                       blinden Flecken, ARCHITECTURE.md). Das Feld
 *                       freizugeben, ohne die Bucket-Regel zu kennen, ergäbe
 *                       Feld schreibbar / Upload abgewiesen.
 *   land                dito zurückgestellt; hat heute keine Eingabe.
 */
export const ELTERN_DUERFEN = [
  "vorname", "nachname",
  "geburtsdatum", "geschlecht",
  "nationalitaet", "nationalitaet2", "heimatort",
  "ahv_nr",
  "telefon",
  "strasse", "plz", "ort", "kanton",
] as const;

const ERLAUBT: ReadonlySet<string> = new Set(ELTERN_DUERFEN);

export interface KindSchreibErgebnis {
  ok: boolean;
  /** Feldnamen, die die Allowlist abgewiesen hat. Wird GEMELDET, nicht
      verschluckt: ein stiller Verlust sähe aus wie ein gespeicherter Wert,
      der nicht ankommt. */
  abgewiesen: string[];
  fehler: string | null;
}

/**
 * Personenfelder eines Kindes durch den angemeldeten Elternteil schreiben.
 *
 * ⚠ NICHT `updateMitglied()`. Die schreibt über `verteileFelder()` alles, was
 * in `PERSON_FELDER` steht — für die Verwaltung richtig, hier zu viel. Und
 * sie sucht die Person über `mitglieder.person_id`; das geht seit dem
 * 21.08.2026 zwar (mitglieder_select_kind), aber die Spaltensperre fehlte ihr.
 *
 * ⚠ `profil_geprueft_at` steht NICHT in der Allowlist, obwohl die
 * Datenprüfung es setzen muss. Es geht über den eigenen Parameter
 * `bestaetigen` — sonst wäre es ein Feld unter Feldern, und wer das Formular
 * um eine Zeile erweitert, könnte die Bestätigung versehentlich mitschreiben.
 */
export function updateKindDurchElternteil(
  sb: SbClient,
  personId: string,
  fields: Zeile,
  bestaetigen = false,
): Promise<KindSchreibErgebnis> {
  return schreibeMitAllowlist(sb, personId, fields, bestaetigen, "updateKindDurchElternteil",
    "Die Änderung konnte nicht bestätigt werden — fehlt die Verknüpfung zum Kind?");
}

/**
 * Die EIGENE Person durch den angemeldeten Benutzer schreiben.
 *
 * ⚠ DIESELBE ALLOWLIST, und das ist die Aussage: was jemand an sich selbst
 * pflegen darf, ist dasselbe wie das, was ein Elternteil am Kind pflegen darf
 * — Name, Adresse, Geburtsdatum, AHV-Nummer. Die E-Mail bleibt aussen vor,
 * weil sie der Login-Name ist; `funktionen` sind Ämter, die niemand sich
 * selbst gibt.
 *
 * Den Unterschied macht nicht dieser Code, sondern die POLICY: `personen_
 * update_self` trifft die eigene Zeile, `personen_update_kind` die des
 * Kindes. Zwei Funktionen mit einem Rumpf, damit an der Aufrufstelle steht,
 * WESSEN Zeile gemeint ist — eine Verwechslung wäre sonst unsichtbar.
 *
 * Entschieden am 21.08.2026 (Didi).
 */
export function updateEigenePerson(
  sb: SbClient,
  personId: string,
  fields: Zeile,
  bestaetigen = false,
): Promise<KindSchreibErgebnis> {
  return schreibeMitAllowlist(sb, personId, fields, bestaetigen, "updateEigenePerson",
    "Die Änderung konnte nicht bestätigt werden — gehört diese Person zu deinem Konto?");
}

async function schreibeMitAllowlist(
  sb: SbClient,
  personId: string,
  fields: Zeile,
  bestaetigen: boolean,
  wer: string,
  /* ⚠ Die Meldung gehoert zum Aufrufer, nicht zur Mechanik. Sie ist das
     Einzige, was der Betroffene je zu sehen bekommt — „fehlt die Verknuepfung
     zum Kind?" sagt ihm, wo er suchen soll; ein gemeinsamer Satz ueber beide
     Faelle saegte genau die Auskunft ab. */
  nichtGetroffen: string,
): Promise<KindSchreibErgebnis> {
  const erlaubt: Zeile = {};
  const abgewiesen: string[] = [];

  for (const [key, wert] of Object.entries(fields)) {
    if (ERLAUBT.has(key)) erlaubt[key] = wert;
    else abgewiesen.push(key);
  }

  if (abgewiesen.length > 0) {
    /* Melden, nicht verschlucken. Wer ein Feld ergänzt und es hier vergisst,
       soll es in der Konsole sehen und nicht daran, dass der Wert nie
       ankommt. */
    console.warn(
      `${wer}: ${abgewiesen.join(", ")} sind in der Selbstbedienung gesperrt und wurden nicht geschrieben.`);
  }

  if (bestaetigen) erlaubt.profil_geprueft_at = new Date().toISOString();

  if (Object.keys(erlaubt).length === 0) {
    return { ok: true, abgewiesen, fehler: null };
  }

  /* ⚠ `.select("id")` AM SCHREIBVORGANG SELBST — nicht als zweite Abfrage.
     Bei RLS gibt es keinen Fehler zu lesen: eine gesperrte Zeile wird
     schlicht nicht getroffen, PostgREST antwortet `204 No Content`, und
     `error` ist `null`. Mit `.select()` liefert es stattdessen die
     GESCHRIEBENEN Zeilen, und deren Zahl ist die Antwort.

     ⚠ HIER STAND BIS ZUM 23.08.2026 EINE ZWEITE ABFRAGE (`select id where
     id = personId`), und die prüfte das Falsche: sie fragte, ob die Zeile
     LESBAR ist, nicht ob sie GESCHRIEBEN wurde. Lesen und Schreiben hängen
     an verschiedenen Policies — `personen_select_priv` ist weit,
     `personen_update_kind` eng. Eine Zeile, die man sehen aber nicht
     ändern darf, kam damit als Erfolg zurück. Genau der Fall, gegen den
     die Prüfung gebaut war. */
  const { data: getroffen, error } = await sb.from("personen")
    .update({ ...erlaubt, updated_at: new Date().toISOString() })
    .eq("id", personId)
    .select("id");

  if (error) {
    console.error(`${wer} error:`, error);
    return { ok: false, abgewiesen, fehler: error.message };
  }

  if (!getroffen || getroffen.length === 0) {
    return { ok: false, abgewiesen, fehler: nichtGetroffen };
  }

  return { ok: true, abgewiesen, fehler: null };
}

/** Prüft eine Feldmenge, ohne zu schreiben — für Formulare, die vorher
    wissen wollen, was sie überhaupt anbieten dürfen. */
export function elternDuerfen(schluessel: string): boolean {
  return ERLAUBT.has(schluessel);
}

/* Gegenprobe zur Bauzeit: jeder Eintrag der Allowlist muss ein echtes
   Personenfeld sein. Ein Tippfehler wäre sonst ein Feld, das nie ankommt —
   und niemand suchte den Grund in einer Liste, die richtig aussieht. */
const UNBEKANNT = ELTERN_DUERFEN.filter(k => !(PERSON_FELDER as readonly string[]).includes(k));
if (UNBEKANNT.length > 0) {
  console.error(`kindService: ${UNBEKANNT.join(", ")} stehen in ELTERN_DUERFEN, aber nicht in PERSON_FELDER.`);
}
