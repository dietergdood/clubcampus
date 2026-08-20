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
export async function updateKindDurchElternteil(
  sb: SbClient,
  personId: string,
  fields: Zeile,
  bestaetigen = false,
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
      `updateKindDurchElternteil: ${abgewiesen.join(", ")} sind für Eltern gesperrt und wurden nicht geschrieben.`);
  }

  if (bestaetigen) erlaubt.profil_geprueft_at = new Date().toISOString();

  if (Object.keys(erlaubt).length === 0) {
    return { ok: true, abgewiesen, fehler: null };
  }

  const { error } = await sb.from("personen")
    .update({ ...erlaubt, updated_at: new Date().toISOString() })
    .eq("id", personId);

  /* ⚠ Bei RLS gibt es keinen Fehler zu lesen — eine gesperrte Zeile wird
     schlicht nicht getroffen, und `update` meldet Erfolg mit null Zeilen.
     Deshalb zusätzlich gegenlesen, ob der Schreibvorgang angekommen ist:
     ohne das stünde wieder eine Erfolgsmeldung ohne Deckung da, und genau
     davon hatte diese Kette schon fünf. */
  if (error) {
    console.error("updateKindDurchElternteil error:", error);
    return { ok: false, abgewiesen, fehler: error.message };
  }

  const { data: probe, error: leseFehler } = await sb.from("personen")
    .select("id").eq("id", personId).maybeSingle();
  if (leseFehler || !probe) {
    return {
      ok: false, abgewiesen,
      fehler: "Die Änderung konnte nicht bestätigt werden — fehlt die Verknüpfung zum Kind?",
    };
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
