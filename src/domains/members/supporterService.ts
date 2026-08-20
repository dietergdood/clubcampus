/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/supporterService.ts

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT. Er zahlt
   keinen Beitrag, hat kein Stimmrecht an der GV und kommt in
   Artikel 6 der Statuten nicht vor — aber er bleibt erreichbar,
   traegt sich fuer Helferschichten ein und bekommt bestimmte News.
   ⚠ Der Helferteil ist ZIEL, nicht Ist-Stand: helper_zuteilungen fuehrt
   heute mitglied_id. Im Nutzertext steht er deshalb nicht.

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

/* ── Statuswechsel ────────────────────────────────────────────────────────
   Teil B des Rueckbaus: in beide Richtungen, und beide Male mit Rueckfrage.
   Die Funktionen hier fuehren nur aus, was entschieden wurde. */

/**
 * Aus einem Supporter wird ein Mitglied.
 *
 * Die PERSON bleibt dieselbe — es entsteht nur eine Mitgliedschaft daneben.
 * Genau das ist der Gewinn des Personen-Modells: kein Anlegen, kein
 * Zusammenfuehren, keine zweite Zeile mit denselben Kontaktdaten.
 *
 * ⚠ NICHT ueber `insertMitglied()`. Die legt IMMER eine neue Person an
 * (siehe memberService) — hier gaebe das eine Dublette derselben Person, und
 * `personen_email_pro_verein` liesse sie nur durch, solange keine E-Mail
 * hinterlegt ist. Der Fehler waere also je nach Datenlage mal sichtbar und
 * mal nicht.
 *
 * Die Portalrolle wird NICHT hier gesetzt: sie ist ein abgeleiteter Wert
 * (`ableitUndSaveRolle`), und der Aufrufer leitet sie ab, sobald die
 * Mitgliedschaft steht. Sie hier zu raten hiesse, den berechneten Wert an
 * zwei Orten zu bestimmen.
 */
export async function macheZuMitglied(
  sb: SbClient,
  personId: string,
  vereinId: string,
  felder: { mitgliedtyp: string; eintrittsdatum?: string | null },
): Promise<{ mitgliedId: number | null; fehler: string | null }> {
  /* Erst nachsehen, ob schon eine besteht. Der partielle Index
     `mitglieder_eine_aktive_mitgliedschaft` laesst nur eine zu; ohne diese
     Abfrage bekaeme der Nutzer eine 23505-Meldung aus der Datenbank statt
     eines Satzes, den er versteht. */
  const { data: bestehend, error: leseFehler } = await sb.from("mitglieder")
    .select("id, mitgliedtyp")
    .eq("person_id", personId)
    .eq("aktiv", true);
  if (leseFehler) {
    console.error("macheZuMitglied (Vorabfrage) error:", leseFehler);
    return { mitgliedId: null, fehler: "Die bestehenden Mitgliedschaften konnten nicht geprüft werden." };
  }
  if ((bestehend || []).length > 0) {
    return {
      mitgliedId: null,
      fehler: `Diese Person ist bereits ${bestehend![0].mitgliedtyp || "Mitglied"}. `
            + `Eine zweite aktive Mitgliedschaft ist nicht möglich.`,
    };
  }

  const jetzt = new Date().toISOString();
  const { data, error } = await sb.from("mitglieder").insert({
    person_id:      personId,
    verein_id:      vereinId,          // Pflicht — sonst lehnt die DB still ab
    mitgliedtyp:    felder.mitgliedtyp,
    eintrittsdatum: felder.eintrittsdatum || null,
    aktiv:          true,
    created_at:     jetzt,
    updated_at:     jetzt,
  } as never).select("id").single();

  if (error) {
    console.error("macheZuMitglied error:", error);
    return { mitgliedId: null, fehler: error.message };
  }
  return { mitgliedId: data?.id ?? null, fehler: null };
}

/* ── Die Gegenrichtung: Austritt ──────────────────────────────────────────
   Statuten Artikel 8: der Austritt ist ein ZEITPUNKT, kein Zustand. Was
   danach mit der Person geschieht, ist eine eigene Frage — und sie wird
   gestellt, nicht geraten. Vier Antworten sind moeglich, und drei davon
   halten den Kontakt. */
export type AustrittsZiel = "supporter" | "archiv" | "ehrenmitglied" | "aktivmitglied";

export interface AustrittOptionen {
  mitgliedId: number;
  vereinId: string;
  ziel: AustrittsZiel;
  /** Konto der Person, falls vorhanden — für Rolle und Ämter. */
  benutzerId?: string | null;
  /** Tag des Austritts. Ohne Angabe: heute. */
  am?: string | null;
}

/**
 * Eine Mitgliedschaft beenden — oder in eine andere umwandeln.
 *
 * ⚠ ZWEI GRUNDVERSCHIEDENE FAELLE hinter einer Frage:
 *
 *   ehrenmitglied / aktivmitglied   die Mitgliedschaft BLEIBT, nur der Typ
 *                                   wechselt. Kader und Aemter bleiben.
 *   supporter / archiv              die Mitgliedschaft ENDET.
 *
 * Sie stehen zusammen, weil sie im Portal aus derselben Frage entstehen
 * („diese Person tritt aus — was gilt danach?"). Der Unterschied steht im
 * Code und nicht nur im Kopf des Aufrufers.
 */
export async function beendeMitgliedschaft(
  sb: SbClient, o: AustrittOptionen,
): Promise<{ ok: boolean; fehler: string | null; hinweise: string[] }> {
  const hinweise: string[] = [];
  const tag = o.am || new Date().toISOString().slice(0, 10);

  /* ── Typwechsel: die Mitgliedschaft bleibt ── */
  if (o.ziel === "ehrenmitglied" || o.ziel === "aktivmitglied") {
    const typ = o.ziel === "ehrenmitglied" ? "Ehrenmitglied" : "Aktivmitglied";
    const { error } = await sb.from("mitglieder")
      .update({ mitgliedtyp: typ, updated_at: new Date().toISOString() })
      .eq("id", o.mitgliedId);
    if (error) { console.error("beendeMitgliedschaft (Typwechsel) error:", error); return { ok: false, fehler: error.message, hinweise }; }
    hinweise.push(`Mitgliedschaft läuft weiter als ${typ}.`);
    return { ok: true, fehler: null, hinweise };
  }

  /* ── Austritt: die Mitgliedschaft endet ── */
  const { error: archErr } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date(tag).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", o.mitgliedId);
  if (archErr) { console.error("beendeMitgliedschaft error:", archErr); return { ok: false, fehler: archErr.message, hinweise }; }

  /* Kadereintraege beenden. Sie haengen am Mitglied und nicht an der Person —
     ohne diesen Schritt stuende die Person weiter im Kader eines Teams,
     obwohl sie nicht mehr Mitglied ist. */
  const { data: kader, error: kaderErr } = await sb.from("kader")
    .select("id").eq("mitglied_id", o.mitgliedId).eq("aktiv", true);
  if (kaderErr) {
    hinweise.push("Die Kadereinträge konnten nicht gelesen werden — bitte im Team prüfen.");
  } else if ((kader || []).length > 0) {
    const { error } = await sb.from("kader").update({ aktiv: false })
      .in("id", (kader || []).map(k => k.id));
    if (error) hinweise.push("Die Kadereinträge konnten nicht beendet werden — bitte im Team prüfen.");
    else hinweise.push(`${kader!.length} Kadereintrag/-einträge beendet.`);
  }

  /* Aemter auf `bis` setzen statt sie zu loeschen: wer ein Amt hatte, HATTE
     es — die Zeile ist der Nachweis. Die Spalte kam mit dem Supporter-Rueckbau
     (migration_supporter_rueckbau.sql, Block F). */
  if (o.benutzerId) {
    const { error, count } = await sb.from("benutzer_funktionen")
      .update({ bis: tag }, { count: "exact" })
      .eq("benutzer_id", o.benutzerId).is("bis", null);
    if (error) hinweise.push("Die Vereinsfunktionen konnten nicht beendet werden.");
    else if (count) hinweise.push(`${count} Vereinsfunktion(en) auf ${tag} beendet.`);

    /* Die Portalrolle: `supporter` haelt den Zugang, `mitglied` waere nach dem
       Austritt falsch. Beim Archiv bleibt sie stehen — das Konto wird ohnehin
       vom Aufrufer deaktiviert. */
    if (o.ziel === "supporter") {
      const { error: rolleErr } = await sb.from("benutzer")
        .update({ role: "supporter", mitglied_id: null }).eq("id", o.benutzerId);
      if (rolleErr) hinweise.push("Die Portalrolle konnte nicht auf Supporter gesetzt werden.");
      else hinweise.push("Portal-Zugang bleibt bestehen, Rolle jetzt Supporter.");
    }
  } else if (o.ziel === "supporter") {
    hinweise.push("Diese Person hat kein Portal-Konto — sie bleibt über E-Mail und Telefon erreichbar.");
  }

  return { ok: true, fehler: null, hinweise };
}

/* ── Dublettenprüfung bei der Neuanlage ───────────────────────────────────
   „Mitglied anlegen prüft nicht auf Dubletten" stand seit Monaten unter den
   bekannten Defekten: `insertMitglied()` schreibt ohne Abgleich gegen den
   Bestand, zweimal abgeschickt heisst zweimal in der Datenbank. Nachweis
   waren zwei Zeilen „Test User" mit fünf Sekunden Abstand.

   Seit dem Personen-Modell ist die Antwort einfacher als ein Sperrmechanismus:
   Wer schon als Person da ist — als Elternteil, als Supporter, als früheres
   Mitglied —, bekommt eine Mitgliedschaft DAZU statt einer zweiten Person. */

export interface PersonTreffer {
  id: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  /** Aktive Mitgliedschaft, falls vorhanden — dann ist die Person kein
      Kandidat mehr, sondern schon Mitglied. */
  mitgliedtyp: string | null;
  hatAktiveMitgliedschaft: boolean;
  /** Elternteil von wie vielen Kindern. */
  kinder: number;
}

/**
 * Personen im Verein suchen, um bei der Neuanlage eine Dublette zu vermeiden.
 *
 * Gesucht wird über Vorname, Nachname und E-Mail; mehrere Wörter müssen ALLE
 * treffen, die Reihenfolge ist egal — dasselbe Muster wie
 * `sucheElternkontakte`, damit „kaiser adrian" und „adrian kaiser" dasselbe
 * finden.
 *
 * ⚠ Es wird NICHTS ausgeschlossen. Auch wer schon Mitglied ist, erscheint —
 * mit dem Hinweis, dass er es ist. Ein stiller Filter wäre hier der falsche
 * Dienst: Wer seinen Treffer nicht sieht, legt ihn neu an, und genau das
 * sollte die Suche verhindern. (Am 05.08.2026 liess ein solcher Filter in
 * `sucheElternkontakte` den gesuchten Adrian Kaiser verschwinden.)
 */
export async function suchePersonen(
  sb: SbClient, vereinId: string, query: string,
): Promise<PersonTreffer[]> {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const woerter = q.split(/\s+/).filter(Boolean).slice(0, 4);
  let abfrage = sb.from("personen")
    .select("id, vorname, nachname, email, mitglieder(id, aktiv, mitgliedtyp), eltern_kinder(mitglied_id)")
    .eq("verein_id", vereinId);
  /* Mehrere .or()-Aufrufe verknüpft PostgREST mit UND, innerhalb eines mit ODER. */
  for (const w of woerter) {
    abfrage = abfrage.or(`vorname.ilike.%${w}%,nachname.ilike.%${w}%,email.ilike.%${w}%`);
  }

  const { data, error } = await abfrage.order("nachname", { ascending: true }).limit(20);
  if (error) { console.error("suchePersonen error:", error); return []; }

  return (data || []).map(p => {
    const aktiv = (p.mitglieder || []).find(m => m.aktiv);
    return {
      id: p.id,
      vorname: p.vorname,
      nachname: p.nachname,
      email: p.email,
      mitgliedtyp: aktiv?.mitgliedtyp ?? null,
      hatAktiveMitgliedschaft: Boolean(aktiv),
      kinder: (p.eltern_kinder || []).length,
    };
  });
}
