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
import { fetchArtenFuerPersonen } from "../person/personArtService.ts";
import type { PersonArt } from "../person/personArtService.ts";
import { beendeVerknuepfungen, setzeArtFuerElternOhneKind } from "./memberService.ts";

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
  /** Die Arten aus `personenarten_effektiv` — dieselbe Quelle wie der Chip
      im Profil. Ein Supporter kann seit dem 22.08.2026 auch „Ehemaliges
      Elternteil" sein. */
  arten?: PersonArt[];
  benutzer_deaktiviert?: boolean;
}

/**
 * Das Wenigste, was „Mitglied werden" braucht.
 *
 * ⚠ Als `Pick`, nicht als eigenes Interface (CLAUDE.md → Verengungen):
 * seit dem 21.08.2026 kommt die Person hier nicht mehr nur aus dem
 * Supporter-Tab, sondern auch aus der Elternliste — ein Elternteil kann
 * Mitglied werden wie ein Supporter. Ein handgeschriebener Zwillingstyp liefe
 * still auseinander, sobald `SupporterRoh` sich ändert.
 *
 * `funktionen` steht mit drin, weil `ableitRolle()` sie liest: wer ein Amt
 * trägt, wird beim Anlegen der Mitgliedschaft nicht zum Spieler.
 */
export type PersonFuerMitgliedschaft =
  Pick<SupporterRoh, "id" | "vorname" | "nachname" | "funktionen">;

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
 * WER DAZUGEHOERT — zwei Wege, und beide gelten:
 *
 *   1. eine Person ohne jede Zeile in `mitglieder` und ohne jede Zeile in
 *      `eltern_kinder` — sie ist nichts anderes, also Supporter;
 *   2. eine Person, die die eingestellte AUSTRITTS-ART traegt.
 *
 * ⚠ DER ZWEITE WEG KAM AM 22.08.2026 DAZU, und er behebt einen Widerspruch.
 * Bis dahin galt nur der erste, und „Supporter" beim Austritt machte
 * NIEMANDEN zum Supporter: die beendete Mitgliedschaftszeile bleibt stehen
 * und schloss die Person hier aus, waehrend `benutzer.role` „supporter"
 * sagte und `personenarten_effektiv` gar nichts. Drei Stellen, drei
 * Antworten.
 *
 * Jetzt schreibt der Austritt die Art (`beendeMitgliedschaft`), und diese
 * Liste liest sie. Damit sagen alle drei dasselbe.
 *
 * ⚠ EINE BEENDETE MITGLIEDSCHAFT ALLEIN reicht weiterhin NICHT. Wer
 * ausgetreten ist, ohne die Art zu bekommen — Archiv, oder es war keine
 * eingestellt —, gehoert ins Archiv und nicht unter die Supporter. Sonst
 * stuende dieselbe Person an zwei Orten.
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

  /* Die eingestellte Austritts-Art — der zweite Weg in diese Liste. Fehlt
     sie, bleibt es beim doppelten Ausschluss; das ist der Zustand vor dem
     22.08.2026 und kein Fehler. */
  const { data: verein, error: vFehler } = await sb.from("vereine")
    .select("austritt_art_id").eq("id", vereinId).maybeSingle();
  if (vFehler) console.error("fetchSupporter (austrittsart) error:", vFehler);
  const austrittArtId = (verein?.austritt_art_id as string | null) ?? null;

  let mitArt = new Set<string>();
  if (austrittArtId) {
    const { data: zuw, error: zFehler } = await sb.from("personenart_pro_person")
      .select("person_id").eq("verein_id", vereinId).eq("art_id", austrittArtId);
    /* error lesen: ohne das saehe ein 42501 aus wie „niemand traegt die Art",
       und die Ausgetretenen verschwaenden lautlos aus der Liste. */
    if (zFehler) console.error("fetchSupporter (arten) error:", zFehler);
    mitArt = new Set((zuw || []).map(z => z.person_id as string));
  }

  /* ⚠ Die ARTEN in EINER Abfrage — dieselbe Quelle wie der Chip im Profil.
     Wer als Elternteil verknuepft ist, dessen letztes Kind aber ausgetreten
     ist, traegt seit dem 22.08.2026 die Austritts-Art — GESETZT vom
     Ausloeser, nicht abgeleitet. Die Liste rechnet das nicht selbst nach. */
  const artenMap = await fetchArtenFuerPersonen(sb, (data || []).map(p => p.id as string));

  return (data || [])
    .filter(p => {
      const hatKinder = (p.eltern_kinder || []).length > 0;
      if (hatKinder) return false;          // steht im Eltern-Tab
      if (mitArt.has(p.id)) return true;    // ausgetreten, Kontakt bleibt
      return (p.mitglieder || []).length === 0;
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
        arten: artenMap[p.id] || [],
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
): Promise<{ mitgliedId: number | null; fehler: string | null; hinweis?: string }> {
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

  /* ⚠ DIE GEGENRICHTUNG. Ohne sie truege ein zurueckgekehrtes Mitglied fuer
     immer „Ehemalige" — die Art wuerde beim Austritt gesetzt und nie wieder
     entfernt. Ein Fehler hier bricht NICHT ab: die Mitgliedschaft steht
     bereits, und sie deshalb zurueckzurollen waere schlimmer als eine Art
     zu viel. Er wird gemeldet. */
  const artFehler = await entferneAustrittsart(sb, personId, vereinId);
  if (artFehler) {
    return {
      mitgliedId: data?.id ?? null,
      fehler: null,
      hinweis: "Die Mitgliedschaft steht. Die frühere Art konnte nicht entfernt werden — bitte im Profil prüfen.",
    };
  }
  return { mitgliedId: data?.id ?? null, fehler: null };
}

/* ── Die Gegenrichtung: Austritt ──────────────────────────────────────────
   Statuten Artikel 8: der Austritt ist ein ZEITPUNKT, kein Zustand. Was
   danach mit der Person geschieht, ist eine eigene Frage — und sie wird
   gestellt, nicht geraten.

   ⚠ ZWEI ACHSEN, UND DER TYP SAGT ES JETZT AUCH. Bis zum 22.08.2026 hiess
   der Typ `"supporter" | "archiv" | "ehrenmitglied" | "aktivmitglied"` —
   vier Zeichenketten in einer Reihe, obwohl zwei davon einen TYPWECHSEL
   meinen (die Mitgliedschaft bleibt) und zwei ein ENDE. Der Code trennte
   sie sauber, der Typ nicht, und ein Aufrufer musste die Regel im Kopf
   haben.

   Dazu kam, dass die beiden Mitgliedtypen als Zeichenketten festverdrahtet
   waren — dieselbe Bauart wie die Spaltenkoepfe der Pflichtfeld-Matrix, die
   am 05.08.2026 auf nicht existierende Typen zeigten. `Pausenmitglied`, der
   Typ, der woertlich „kommt vielleicht wieder" bedeutet, liess sich gar
   nicht waehlen. Jetzt kommt die Auswahl aus `mitgliedtypen`. */
export type AustrittsZiel =
  /** Die Mitgliedschaft ENDET. Die Person wird zur eingestellten Art
      (`vereine.austritt_art_id`) und bleibt erreichbar. */
  | { art: "beenden" }
  /* ⚠ HIER STAND `{ art: "archiv" }`, BIS ZUM 23.08.2026.

     „Archiv" war nie eine Antwort auf „was gilt danach?", sondern DREI
     Entscheidungen in einem Wort:

       1. die Mitgliedschaft endet        — dasselbe wie „beenden"
       2. der Portal-Zugang wird beendet  — das Einzige, was NUR Archiv tat
       3. die Person bleibt auffindbar    — jetzt die Markierung

     Punkt 3 ist seit Schritt 2 `personen.offene_punkte`. Punkt 2 war die
     stille Hälfte: wer „Archiv" wählte, sperrte nebenbei den Zugang aus, und
     im Text des Modals stand davon kein Wort. Er ist jetzt ein eigenes
     Häkchen — sichtbar statt mitgemeint.

     ⚠ Ein Wort, das drei Dinge tut, kann keines davon benennen. */
  /** Die Mitgliedschaft BLEIBT, nur der Typ wechselt. Kader und Aemter
      bleiben. Der Name kommt aus `mitgliedtypen`, nicht aus dem Code. */
  | { art: "typwechsel"; mitgliedtyp: string };

/** Bleibt die Mitgliedschaft bestehen? Die eine Frage, an der alles haengt. */
export function bleibtMitglied(ziel: AustrittsZiel): boolean {
  return ziel.art === "typwechsel";
}

export interface AustrittOptionen {
  mitgliedId: number;
  vereinId: string;
  ziel: AustrittsZiel;
  /** Person hinter der Mitgliedschaft — fuer die Art nach dem Austritt. */
  personId?: string | null;
  /** Konto der Person, falls vorhanden — für die Rolle. */
  benutzerId?: string | null;
  /** Wer den Austritt eingetragen hat → `deaktiviert_von`. Wer eine
      Mitgliedschaft beendet, gehört festgehalten, unabhängig vom Weg;
      vorher hielt nur der Knopf „Archivieren" das fest.
      (Entscheidung Didi, 22.08.2026.) */
  deaktiviertVon?: string | null;
  /** Tag des Austritts. Ohne Angabe: heute. */
  am?: string | null;
  /**
   * Was bei dieser Person noch offen ist — Beitrag, Rechnung, Material.
   *
   * ⚠ NICHT LEER = die Person erscheint im Archiv. Das ist die Markierung,
   * die den frueheren Ort ersetzt; sie haengt an der PERSON und wird von Hand
   * gesetzt und entfernt.
   */
  offenePunkte?: string | null;
  /**
   * Den Portal-Zugang beenden.
   *
   * ⚠ DAS TAT FRUEHER „ARCHIV" NEBENBEI, ohne es zu sagen. Jetzt eine eigene
   * Frage: wer austritt, muss den Zugang nicht verlieren — ein Supporter
   * bleibt erreichbar und hilft weiter mit.
   */
  zugangBeenden?: boolean;
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
  if (o.ziel.art === "typwechsel") {
    const typ = o.ziel.mitgliedtyp;
    const { error } = await sb.from("mitglieder")
      .update({ mitgliedtyp: typ, updated_at: new Date().toISOString() })
      .eq("id", o.mitgliedId);
    if (error) { console.error("beendeMitgliedschaft (Typwechsel) error:", error); return { ok: false, fehler: error.message, hinweise }; }
    hinweise.push(`Mitgliedschaft läuft weiter als ${typ}.`);
    return { ok: true, fehler: null, hinweise };
  }

  /* ── Austritt: die Mitgliedschaft endet ──────────────────────────────
     ⚠ HIER LAG DER EIGENTLICHE DEFEKT. „Supporter" beim Austritt machte
     bis zum 22.08.2026 NIEMANDEN zum Supporter — drei Stellen beantworten
     die Frage und sagten Verschiedenes:

       fetchSupporter()          nein, die beendete Zeile schliesst aus
       personenarten_effektiv    nein, die Zeile schrieb NIEMAND
       benutzer.role             ja

     Jetzt schreibt der Austritt die ART, und alle drei sagen dasselbe. */
  let artNachher: { art_id: string; name: string; standard_rolle: string | null } | null = null;
  if (o.ziel.art === "beenden") {
    const { data: verein, error: vFehler } = await sb.from("vereine")
      .select("austritt_art_id").eq("id", o.vereinId).maybeSingle();
    if (vFehler) {
      hinweise.push("Die eingestellte Art konnte nicht gelesen werden — bitte im Profil prüfen.");
    } else if (!verein?.austritt_art_id) {
      /* Kein Ziel eingestellt ist kein Fehler, aber es soll niemand später
         suchen, warum die Person keine Art bekam. */
      hinweise.push("Es ist keine Art für den Austritt eingestellt (Portalverwaltung → Mitglieder-Konfiguration).");
    } else {
      const { data: art, error: aFehler } = await sb.from("personenarten")
        .select("id, name, standard_rolle").eq("id", verein.austritt_art_id).maybeSingle();
      if (aFehler || !art) {
        hinweise.push("Die eingestellte Art wurde nicht gefunden — bitte im Profil prüfen.");
      } else {
        artNachher = {
          art_id: art.id as string,
          name: (art.name as string) || "",
          standard_rolle: (art.standard_rolle as string | null) ?? null,
        };
      }
    }
  }

  const { error: archErr } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date(tag).toISOString(),
    deaktiviert_von: o.deaktiviertVon ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", o.mitgliedId);
  if (archErr) { console.error("beendeMitgliedschaft error:", archErr); return { ok: false, fehler: archErr.message, hinweise }; }

  /* ⚠ ARCHIV: EINE FUNKTION FUER BEIDE WEGE. Kadereintraege, Aemter und der
     Portal-Zugang stehen in `beendeVerknuepfungen()` — derselben, die der
     Knopf „Archivieren" ruft. Bis zum 22.08.2026 taten die zwei Wege fuenf
     verschiedene Dinge; die Begruendung steht dort.

     ⚠ NUR BEIM ARCHIV WIRD DAS KONTO DEAKTIVIERT. Beim Beenden mit
     Weiterfuehrung ist das Gegenteil der Zweck: die Person bleibt
     erreichbar und behaelt ihren Zugang, nur die Rolle wechselt. */
  if (o.zugangBeenden) {
    hinweise.push(...await beendeVerknuepfungen(sb, [o.mitgliedId], tag));
  } else {
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
  }

  if (o.benutzerId) {
    /* Aemter auf `bis` setzen statt sie zu loeschen: wer ein Amt hatte, HATTE
       es — die Zeile ist der Nachweis. Die Spalte kam mit dem
       Supporter-Rueckbau (migration_supporter_rueckbau.sql, Block F).
       Beim Archiv erledigt das `beendeVerknuepfungen()`. */
    if (!o.zugangBeenden) {
      const { error, count } = await sb.from("benutzer_funktionen")
        .update({ bis: tag }, { count: "exact" })
        .eq("benutzer_id", o.benutzerId).is("bis", null);
      if (error) hinweise.push("Die Vereinsfunktionen konnten nicht beendet werden.");
      else if (count) hinweise.push(`${count} Vereinsfunktion(en) auf ${tag} beendet.`);
    }

    /* Die Portalrolle kommt aus der ART, nicht aus einer Zeichenkette hier.
       Bis zum 22.08.2026 stand hier fest `role: "supporter"` — richtig,
       solange das Ziel Supporter hiess, und falsch in dem Moment, in dem
       jemand „Ehemalige" einstellt. `personenarten.standard_rolle` haelt die
       Antwort dort, wo die Art steht.

       ⚠ OHNE `standard_rolle` BLEIBT DIE ROLLE STEHEN. Sie zu leeren waere
       schlechter als eine ungenaue: `mitglied_id` faellt ohnehin weg, und
       eine Person ohne Rolle kommt an gar nichts mehr.

       ⚠ HIER STAND EIN FALSCHER KOMMENTAR, vom 20. bis 22.08.2026:
       „Beim Archiv bleibt sie stehen — das Konto wird ohnehin vom Aufrufer
       deaktiviert." Das Konto wurde vom Aufrufer NIE deaktiviert;
       `fuehreAustrittAus` hat nie einen solchen Aufruf enthalten. Ein
       ausgetretenes Mitglied blieb angemeldet, und wer den Satz las,
       pruefte nicht nach — er sicherte etwas zu, wofuer eine andere Stelle
       zustaendig sein sollte, die es nicht tat. Was tatsaechlich passiert,
       steht oben: beim Archiv setzt `beendeVerknuepfungen()` `benutzer.aktiv`
       auf false, beim Beenden mit Weiterfuehrung bleibt der Zugang. */
    if (o.ziel.art === "beenden") {
      const rolle = artNachher?.standard_rolle || null;
      const felder: Record<string, unknown> = { mitglied_id: null };
      if (rolle) felder.role = rolle;
      const { error: rolleErr } = await sb.from("benutzer")
        .update(felder as never).eq("id", o.benutzerId);
      if (rolleErr) hinweise.push("Die Portalrolle konnte nicht angepasst werden.");
      else if (rolle) hinweise.push(`Portal-Zugang bleibt bestehen, Rolle jetzt ${rolle}.`);
      else hinweise.push("Portal-Zugang bleibt bestehen, Rolle unverändert.");
    }
  } else if (o.ziel.art === "beenden") {
    hinweise.push("Diese Person hat kein Portal-Konto — sie bleibt über E-Mail und Telefon erreichbar.");
  }

  /* Den Vermerk setzen — was noch offen ist. Steht VOR der Art, weil er
     unabhaengig von ihr gilt: auch ein Typwechsel kann etwas offen lassen.

     ⚠ GEZAEHLT, nicht nur `error` gelesen. Ein update ohne Treffer ist bei
     PostgREST kein Fehler; ohne `.select("id")` stuende hier ein Hinweis
     ueber einen Vermerk, den es nicht gibt. */
  if (o.offenePunkte != null && o.offenePunkte.trim() !== "") {
    let pid = o.personId ?? null;
    if (!pid) {
      const { data: m } = await sb.from("mitglieder")
        .select("person_id").eq("id", o.mitgliedId).maybeSingle();
      pid = (m?.person_id as string | null) ?? null;
    }
    if (!pid) {
      hinweise.push("Der Vermerk konnte nicht gesetzt werden — die Person war nicht zu ermitteln.");
    } else {
      const { data, error } = await sb.from("personen")
        .update({ offene_punkte: o.offenePunkte.trim() }).eq("id", pid).select("id");
      if (error || !data || data.length === 0) {
        hinweise.push("Der Vermerk konnte nicht gesetzt werden.");
      } else {
        hinweise.push("Im Archiv vermerkt: " + o.offenePunkte.trim());
      }
    }
  }

  /* Die Art setzen — nach dem Beenden, damit sie nicht steht, wenn der
     Austritt selbst scheitert. `personId` ist optional, weil aeltere
     Aufrufer sie nicht kennen; fehlt sie, wird sie nachgeschlagen statt
     stillschweigend uebergangen. */
  if (o.ziel.art === "beenden" && artNachher) {
    let personId = o.personId ?? null;
    if (!personId) {
      const { data: m, error: mFehler } = await sb.from("mitglieder")
        .select("person_id").eq("id", o.mitgliedId).maybeSingle();
      if (mFehler) hinweise.push("Die Person konnte nicht ermittelt werden — die Art wurde nicht gesetzt.");
      else personId = (m?.person_id as string | null) ?? null;
    }
    if (personId) {
      /* upsert statt insert: wer zum zweiten Mal austritt, hat die Art
         vielleicht schon. `ignoreDuplicates` waere hier falsch — es soll
         auffallen, wenn der Schluessel nicht passt. */
      const { error: artErr } = await sb.from("personenart_pro_person")
        .upsert({ verein_id: o.vereinId, person_id: personId, art_id: artNachher.art_id } as never,
                { onConflict: "verein_id,person_id,art_id" });
      if (artErr) hinweise.push(`Die Art „${artNachher.name}" konnte nicht gesetzt werden.`);
      else hinweise.push(`Gilt jetzt als ${artNachher.name}.`);
    }
  }

  /* ⚠ DER ZWEITE AUSLOESER. Das austretende Mitglied kann das letzte Kind
     eines Elternteils sein — dann verliert dieser seine abgeleitete Art und
     bekommt die eingestellte. Steht NACH dem Beenden, weil die Pruefung
     „hat noch ein aktives Kind" sonst das gerade beendete mitzaehlte.

     Gilt fuer BEIDE Zielarten: ob die Mitgliedschaft mit Weiterfuehrung
     endet oder ins Archiv geht, aendert am Kind des Elternteils nichts. */
  hinweise.push(...await setzeArtFuerElternOhneKind(sb, [o.mitgliedId], o.vereinId));

  return { ok: true, fehler: null, hinweise };
}

/**
 * Die Austritts-Art einer Person wieder entfernen.
 *
 * ⚠ DIE GEGENRICHTUNG GEHOERT DAZU, sonst baue ich den naechsten toten
 * Schalter: wer zurueckkommt, truege sonst fuer immer „Ehemalige" — eine
 * Aussage, die niemand mehr aufraeumt und die dem Chip im Profil
 * widerspricht. Wird von `macheZuMitglied()` aufgerufen.
 *
 * Entfernt wird NUR die eingestellte Austritts-Art. Andere gesetzte Arten
 * bleiben: sie hat jemand von Hand vergeben, und eine neue Mitgliedschaft
 * sagt darueber nichts.
 */
export async function entferneAustrittsart(
  sb: SbClient, personId: string, vereinId: string,
): Promise<string | null> {
  const { data: verein, error: vFehler } = await sb.from("vereine")
    .select("austritt_art_id").eq("id", vereinId).maybeSingle();
  if (vFehler) { console.error("entferneAustrittsart (verein) error:", vFehler); return vFehler.message; }
  if (!verein?.austritt_art_id) return null;

  const { error } = await sb.from("personenart_pro_person").delete()
    .eq("verein_id", vereinId).eq("person_id", personId)
    .eq("art_id", verein.austritt_art_id);
  if (error) { console.error("entferneAustrittsart error:", error); return error.message; }
  return null;
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
export interface SucheErgebnis {
  treffer: PersonTreffer[];
  /**
   * ⚠ `false` heisst „konnte nicht suchen", NICHT „nichts gefunden".
   *
   * Zwei Zustände, die an der Oberfläche identisch aussehen — eine leere
   * Liste — und völlig Verschiedenes bedeuten. Beim Anlegen eines Mitglieds
   * ist der Unterschied entscheidend: „nichts gefunden" heisst *leg an*,
   * „konnte nicht suchen" heisst *du weisst es nicht*. Wer beides gleich
   * behandelt, legt Dubletten an und hält es für geprüft.
   *
   * Dasselbe Muster wie ein leerer `catch`: ein Ausfall, der wie eine
   * Datenlage aussieht.
   */
  verfuegbar: boolean;
}

export async function suchePersonen(
  sb: SbClient | null | undefined, vereinId: string | null | undefined, query: string,
): Promise<SucheErgebnis> {
  /* ⚠ Nicht nur auf `sb` prüfen, sondern auf `sb.from`. Am 20.08.2026ergab
     eine Attrappe `{_tag:"sb"}` ein wahrheitsgemässes `sb`, aber kein `from`
     — der Aufruf warf in einem `setTimeout`, wo niemand ihn fing. Der Nutzer
     hätte weitergetippt und eine leere Trefferliste gesehen. */
  if (typeof sb?.from !== "function" || !vereinId) {
    return { treffer: [], verfuegbar: false };
  }

  const q = (query || "").trim();
  if (q.length < 2) return { treffer: [], verfuegbar: true };

  const woerter = q.split(/\s+/).filter(Boolean).slice(0, 4);
  let abfrage = sb.from("personen")
    .select("id, vorname, nachname, email, mitglieder(id, aktiv, mitgliedtyp), eltern_kinder(mitglied_id)")
    .eq("verein_id", vereinId);
  /* Mehrere .or()-Aufrufe verknüpft PostgREST mit UND, innerhalb eines mit ODER. */
  for (const w of woerter) {
    abfrage = abfrage.or(`vorname.ilike.%${w}%,nachname.ilike.%${w}%,email.ilike.%${w}%`);
  }

  const { data, error } = await abfrage.order("nachname", { ascending: true }).limit(20);
  /* Ein Datenbankfehler ist ebenfalls „konnte nicht suchen" und nicht
     „nichts gefunden" — sb.from().select() wirft nicht, es liefert error. */
  if (error) { console.error("suchePersonen error:", error); return { treffer: [], verfuegbar: false }; }

  const treffer = (data || []).map(p => {
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
  return { treffer, verfuegbar: true };
}
