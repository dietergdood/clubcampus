/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/supporterService.ts

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT. Er zahlt
   keinen Beitrag, hat kein Stimmrecht an der GV und kommt in
   Artikel 6 der Statuten nicht vor — aber er bleibt erreichbar,
   traegt sich fuer Helferschichten ein und bekommt bestimmte News.

   Bis zum 20.08.2026 stand er als Mitgliedtyp in `mitglieder`
   (Etappe 5). Das war der falsche Weg herum: eine Abfrage hat das
   Datenmodell bestimmt — ohne Mitgliedschaft waere die Person
   nirgends auffindbar gewesen, weil `fetchAlleElternkontakte` ueber
   `eltern_kinder!inner` einsteigt. Diese Datei ist der Lesepfad,
   der das ersetzt.
   ═══════════════════════════════════════════════════════════════ */
import type { SbClient } from "../../types.ts";

export interface SupporterRoh {
  /** personen.id */
  id: string;
  vorname: string;
  nachname: string;
  email?: string | null;
  telefon?: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  geburtsdatum?: string | null;
  geschlecht?: string | null;
  nationalitaet?: string | null;
  nationalitaet2?: string | null;
  heimatort?: string | null;
  ahv_nr?: string | null;
  foto_url?: string | null;
  funktionen?: string[] | null;
  profil_geprueft_at?: string | null;
  /** benutzer.role — die Portalrolle, meist `supporter`. */
  rolle?: string | null;
  hat_benutzer?: boolean;
  benutzer_deaktiviert?: boolean;
}

/* Genau die Felder, die mapSupporter liest. Nicht `*`: was die Liste nicht
   anzeigt, muss auch nicht ueber die Leitung — und eine neue Spalte in
   `personen` soll nicht ungefragt in einer Liste landen. */
const PERSON_SELECT = `
  id, vorname, nachname, email, telefon,
  strasse, plz, ort, geburtsdatum, geschlecht,
  nationalitaet, nationalitaet2, heimatort, ahv_nr,
  foto_url, funktionen, profil_geprueft_at,
  mitglieder(id),
  eltern_kinder(person_id),
  benutzer(id, role, aktiv)
`;

/**
 * Alle Supporter eines Vereins.
 *
 * WER DAZUGEHOERT: eine Person ohne jede Zeile in `mitglieder` und ohne
 * jede Zeile in `eltern_kinder`.
 *
 * Beide Bedingungen sind Ausschluesse, keine Merkmale — es gibt kein
 * Kennzeichen „ist Supporter" und soll auch keines geben. Wer eine
 * Mitgliedschaft hat, steht in der Mitgliederliste oder im Archiv; wer ein
 * Kind hat, im Eltern-Tab. Uebrig bleibt, wer nur erreichbar ist.
 *
 * ⚠ Auch eine BEENDETE Mitgliedschaft zaehlt. `mitglieder(id)` fragt nicht
 * nach `aktiv`: ein ausgetretenes Mitglied gehoert ins Archiv und nicht
 * unter die Goenner, sonst stuende dieselbe Person an zwei Orten.
 *
 * ⚠ Gefiltert wird in JavaScript, nicht in der Abfrage. PostgREST kann
 * „hat keine Zeile in einer eingebetteten Beziehung" nicht ausdruecken —
 * `!inner` kann nur das Gegenteil. Bei rund tausend Personen ist das
 * unkritisch; wird es das nicht mehr, gehoert hierfuer eine Sicht in die
 * Datenbank und keine gebastelte Abfrage.
 */
export async function fetchSupporter(
  sb: SbClient,
  vereinId: string,
): Promise<SupporterRoh[]> {
  const { data, error } = await sb.from("personen")
    .select(PERSON_SELECT)
    .eq("verein_id", vereinId)
    .order("nachname", { ascending: true });

  /* error lesen, nicht nur try/catch: sb.from().select() wirft bei einem
     Datenbankfehler nicht, es liefert { data, error }. Ohne diese Zeile
     saehe ein 42501 aus wie „es gibt keine Supporter". */
  if (error) {
    console.error("fetchSupporter error:", error);
    return [];
  }

  return (data || [])
    .filter(p => {
      const hatMitgliedschaft = (p.mitglieder || []).length > 0;
      const hatKinder         = (p.eltern_kinder || []).length > 0;
      return !hatMitgliedschaft && !hatKinder;
    })
    .map(p => {
      const konto = (p.benutzer || [])[0] || null;
      return {
        id: p.id,
        vorname: p.vorname,
        nachname: p.nachname,
        email: p.email,
        telefon: p.telefon,
        strasse: p.strasse,
        plz: p.plz,
        ort: p.ort,
        geburtsdatum: p.geburtsdatum,
        geschlecht: p.geschlecht,
        nationalitaet: p.nationalitaet,
        nationalitaet2: p.nationalitaet2,
        heimatort: p.heimatort,
        ahv_nr: p.ahv_nr,
        foto_url: p.foto_url,
        funktionen: p.funktionen,
        profil_geprueft_at: p.profil_geprueft_at,
        rolle: konto?.role ?? null,
        hat_benutzer: Boolean(konto),
        benutzer_deaktiviert: Boolean(konto) && konto.aktiv === false,
      };
    });
}
