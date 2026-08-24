/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/memberService.ts
   Alle Supabase-Calls für Mitglieder, Notizen, Elternkontakte,
   Kader, Benutzer (Portal-Zugang), Ansichten
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import { flacheZeile, flacheZeilen, verteileFelder, updatePerson } from "../person/personService.ts";
import type { Ansicht, AnsichtSortDef, MitgliedInsert, MitgliedUpdate, SbClient, TablesInsert, TablesUpdate } from "../../types.ts";

/* ── Fehler-Vertrag der Write-Funktionen ──────────────────────────
   Reine Schreiboperationen (insert/update/delete/upsert ohne Rückgabe-
   daten) geben einheitlich `PostgrestError | null` zurück: null = ok,
   sonst der Fehler. Aufrufer koennen so konsistent `if (await fn())`
   pruefen (wie in elternService). Funktionen, die Daten zurueckgeben
   (fetch*, insertMitglied, insertAnsicht …), behalten ihren Rückgabetyp. */

/* ── Mitglieder ──
   Gelesen wird seit Etappe 2b per Join über `personen`, zurückgegeben
   wird weiterhin eine flache Zeile (siehe domains/person/personService).
   `personen` ist die Wahrheit; die gleichnamigen Spalten in `mitglieder`
   sind Altlast und verschwinden in Etappe 6. */

export async function fetchMitglied(sb: SbClient, id: number) {
  const { data } = await sb.from("mitglieder")
    /* MITGLIED_SELECT als Literal, nicht als Konstante: der Typparser von
       PostgREST liest den Select-Ausdruck zur Übersetzungszeit und kann mit
       einem Template-Literal nichts anfangen. */
    .select("*, personen(*), eltern_kinder(id)")
    .eq("id", id)
    .single();
  return flacheZeile(data as never) as typeof data;
}

/* ⚠ `deleteMitglied()` IST AM 24.08.2026 GEFALLEN — die letzte Stelle in
   `src/`, die aus `mitglieder` loeschte.

   Sie war seit dem 23.08.2026 als „entfernt" beschrieben und hatte an
   diesem Tag noch DREI lebende Aufrufer, alle im Archiv:
   die Sammelaktion „Mitgliedschaft löschen", ein unbeschrifteter roter
   Papierkorb pro Zeile, und ein toter `handleBulkDelete` in
   `MitgliederModul`. Kein Werkzeug hat das gemeldet — die Kommentare
   sagten das Gegenteil, und ein Kommentar prueft nichts.

   ⚠ EIN `delete` AUF `mitglieder` REISST `eltern_kinder` MIT (CASCADE):
   399 Zeilen an 393 Mitgliedschaften, gemessen 23.08.2026. Wer die
   Mitgliedschaft eines Juniors loescht, entfernt die Verknuepfungen zu
   seinen Eltern — und die stehen in keinem Verlauf.

   Der einzige verbliebene Weg ist die Loeschkette in
   `supabase/functions/person-loeschen`, und die zaehlt vorher. Gehalten
   wird das von einer Strukturpruefung in `austritt.test.ts`. */

/* ── Was zu einer beendeten Mitgliedschaft dazugehoert ────────────────────
   Kadereintraege, Aemter und der Portal-Zugang.

   ⚠ EINE FUNKTION FUER BEIDE WEGE. Es gab bis zum 22.08.2026 zwei Wege ins
   Archiv — den Knopf „Archivieren" und die Antwort „Archiv" im
   Austrittsdialog —, und sie taten FUENF verschiedene Dinge:

     | | Knopf | Austritt |
     |---|---|---|
     | Kadereintraege | blieben aktiv | wurden beendet |
     | Aemter | blieben offen | bekamen ein Ende |
     | Portal-Konto | wurde deaktiviert | blieb aktiv |

   Nach der Klaerung vom 21.08.2026 („Archiv heisst: ausgetreten, aber noch
   etwas offen") sind das nicht zwei Bedeutungen, sondern ein vollstaendiger
   und ein unvollstaendiger Weg. Deshalb rufen jetzt beide DIESE Funktion —
   dieselbe Wirkung an einem Ort, nicht zweimal derselbe Inhalt, der
   auseinanderlaufen kann.

   ⚠ DER ERNSTERE TEIL WAR DAS KONTO. Ein ausgetretenes Mitglied blieb
   angemeldet; gesperrt wird der Login allein durch `benutzer.aktiv`. Dass
   es niemanden getroffen hat, lag an der Datenlage — keines der drei
   ausgetretenen Mitglieder hatte ein Konto. Das ist keine Absicherung. */
export async function beendeVerknuepfungen(
  sb: SbClient, mitgliedIds: number[], tag: string,
): Promise<string[]> {
  const hinweise: string[] = [];
  if (mitgliedIds.length === 0) return hinweise;

  /* Kadereintraege. Sie haengen am MITGLIED, nicht an der Person — ohne
     diesen Schritt stuende ein Ausgetretener weiter in der Aufstellung
     seines Teams. */
  const { data: kader, error: kaderErr } = await sb.from("kader")
    .select("id").in("mitglied_id", mitgliedIds).eq("aktiv", true);
  if (kaderErr) {
    hinweise.push("Die Kadereinträge konnten nicht gelesen werden — bitte im Team prüfen.");
  } else if ((kader || []).length > 0) {
    const { error } = await sb.from("kader").update({ aktiv: false })
      .in("id", (kader || []).map(k => k.id));
    if (error) hinweise.push("Die Kadereinträge konnten nicht beendet werden — bitte im Team prüfen.");
    else hinweise.push(`${kader!.length} Kadereintrag/-einträge beendet.`);
  }

  /* Das Konto haengt an der PERSON (seit Etappe 4), nicht am Mitglied. */
  const { data: personen, error: pErr } = await sb.from("mitglieder")
    .select("person_id").in("id", mitgliedIds);
  if (pErr) {
    hinweise.push("Die Personen konnten nicht ermittelt werden — Portal-Zugang und Ämter bitte prüfen.");
    return hinweise;
  }
  const personIds = (personen || []).map(m => m.person_id).filter(Boolean) as string[];
  if (personIds.length === 0) return hinweise;

  const { data: konten, error: kErr } = await sb.from("benutzer")
    .select("id, person_id").in("person_id", personIds);
  if (kErr) {
    hinweise.push("Die Portal-Konten konnten nicht gelesen werden — bitte prüfen.");
    return hinweise;
  }
  const kontoIds = (konten || []).map(b => b.id as string);
  if (kontoIds.length === 0) return hinweise;

  /* Aemter auf `bis` setzen statt sie zu loeschen: wer ein Amt hatte, HATTE
     es — die Zeile ist der Nachweis. */
  const { error: fErr, count } = await sb.from("benutzer_funktionen")
    .update({ bis: tag }, { count: "exact" })
    .in("benutzer_id", kontoIds).is("bis", null);
  if (fErr) hinweise.push("Die Vereinsfunktionen konnten nicht beendet werden.");
  else if (count) hinweise.push(`${count} Vereinsfunktion(en) auf ${tag} beendet.`);

  /* ⚠ `aktiv`, nicht die Verknuepfung. Gesperrt wird der Login allein
     dadurch — `useDbUser` meldet ab, wenn es false ist. `mitglied_id` auf
     null zu setzen loeste die Verbindung, ohne irgendjemanden auszusperren
     (Befund vom 21.08.2026).

     ⚠ ABER NICHT, WER NOCH EIN KIND IM VEREIN HAT. Diese Bedingung stand
     seit Etappe 3 in `updatePortalZugang()`, und ich habe sie am 22.08.2026
     beim Buendeln der zwei Archiv-Wege uebergangen — hier wurde
     bedingungslos abgeschaltet. Wirkung: ein Elternteil, das SELBST Mitglied
     ist, haette mit dem Ende seiner Mitgliedschaft auch den Zugang zu den
     Daten seines noch aktiven Kindes verloren. Kein Fehler, keine Meldung —
     nur ein Login, der nicht mehr geht.

     Aufgefallen beim Zusammenlegen der zwei Wege in F2. Genau der Grund,
     aus dem zwei Stellen mit derselben Aufgabe gefaehrlich sind: sie sind
     nicht gleich, und beim Vereinheitlichen gewinnt die aermere. */
  const { data: nochEltern, error: eErr } = await sb.from("eltern_kinder")
    .select("person_id, mitglied_id, mitglieder(aktiv)")
    .in("person_id", personIds);
  if (eErr) {
    hinweise.push("Die Elternverknüpfungen konnten nicht geprüft werden — Portal-Zugang unverändert.");
    return hinweise;
  }
  /* Wer noch mindestens ein AKTIVES Kind hat, das nicht selbst gerade
     beendet wird, behaelt seinen Zugang. */
  const behalten = new Set(
    (nochEltern || [])
      .filter(e => !mitgliedIds.includes(Number(e.mitglied_id))
                && (e.mitglieder as { aktiv?: boolean } | null)?.aktiv === true)
      .map(e => e.person_id as string),
  );
  const abzuschalten = (konten || [])
    .filter(b => !behalten.has(b.person_id as string))
    .map(b => b.id as string);

  if (behalten.size > 0) {
    hinweise.push(`${behalten.size} Portal-Zugang/-Zugänge bleiben bestehen — noch ein Kind im Verein.`);
  }
  if (abzuschalten.length === 0) return hinweise;

  const { error: aErr } = await sb.from("benutzer")
    .update({ aktiv: false }).in("id", abzuschalten);
  if (aErr) hinweise.push("Der Portal-Zugang konnte nicht deaktiviert werden.");
  else hinweise.push(`${abzuschalten.length} Portal-Zugang/-Zugänge deaktiviert.`);

  return hinweise;
}

/* ── Der zweite Ausloeser: das letzte Kind tritt aus ──────────────────────
   Derselbe Ablauf, zwei Ereignisse (Auftrag Etappe 3):

     1 · Ein Mitglied tritt aus            -> `beendeMitgliedschaft`
     2 · Das LETZTE Kind eines Elternteils -> diese Funktion
         tritt aus, und der Elternteil hat
         keine eigene Mitgliedschaft

   ⚠ SIE MUSS BEI JEDEM ENDE EINER MITGLIEDSCHAFT LAUFEN, nicht nur beim
   Austrittsdialog. Eine Mitgliedschaft endet auf DREI Wegen:

     beendeMitgliedschaft, ziel „beenden"   Kontakt bleibt
     beendeMitgliedschaft, ziel „archiv"    noch etwas offen
     archiviereMitglied                     der Knopf und die Sammelaktion

   Laege der Ausloeser nur im ersten, haette ein archiviertes Kind denselben
   stillen Ausfall, den Etappe 3 gerade beseitigt: der Elternteil bliebe als
   Person stehen, ohne Art, und niemand fragte ihn.

   ⚠ NUR WER KEINE EIGENE MITGLIEDSCHAFT HAT. Ein Elternteil, das selbst
   Mitglied ist, bleibt Mitglied — heute betrifft das genau eine Person.

   ⚠ NUR BEIM LETZTEN KIND. Tritt eines von dreien aus, aendert sich nichts.
   Geprueft wird deshalb NACH dem Beenden: die Zeile des austretenden Kindes
   steht dann schon auf `aktiv = false` und zaehlt nicht mehr mit.

   ⚠ ZWEI ELTERNTEILE ZUGLEICH sind der Normalfall, nicht die Ausnahme —
   deshalb eine Menge und keine einzelne Id.

   ⚠ SIE STEHT HIER UND NICHT IN `supporterService`, obwohl sie fachlich
   zum Austritt gehoert: `supporterService` importiert bereits
   `beendeVerknuepfungen` von hier. Der umgekehrte Import waere ein
   Zyklus — ES-Module verkraften ihn oft, aber „oft" ist keine Eigenschaft,
   auf die man baut. */
export async function setzeArtFuerElternOhneKind(
  sb: SbClient, mitgliedIds: readonly number[], vereinId: string,
): Promise<string[]> {
  const hinweise: string[] = [];
  if (mitgliedIds.length === 0) return hinweise;

  /* Die eingestellte Art. Ohne sie passiert nichts — und das wird gesagt,
     nicht verschwiegen: „keine Art eingestellt" ist eine Konfigurationslage,
     kein Fehler, aber niemand soll spaeter suchen, warum nichts geschah. */
  const { data: verein, error: vFehler } = await sb.from("vereine")
    .select("austritt_art_id").eq("id", vereinId).maybeSingle();
  if (vFehler) {
    console.error("setzeArtFuerElternOhneKind (verein) error:", vFehler);
    hinweise.push("Die eingestellte Art konnte nicht gelesen werden — Eltern bitte prüfen.");
    return hinweise;
  }
  const artId = (verein?.austritt_art_id as string | null) ?? null;
  if (!artId) return hinweise;

  /* Wer sind die Eltern der gerade beendeten Mitgliedschaften? */
  const { data: links, error: lFehler } = await sb.from("eltern_kinder")
    .select("person_id").in("mitglied_id", mitgliedIds as number[]);
  if (lFehler) {
    console.error("setzeArtFuerElternOhneKind (eltern) error:", lFehler);
    hinweise.push("Die Elternverknüpfungen konnten nicht gelesen werden.");
    return hinweise;
  }
  const eltern = [...new Set((links ?? []).map(l => l.person_id as string))];
  if (eltern.length === 0) return hinweise;

  /* ⚠ Hat einer von ihnen noch ein AKTIVES Kind? Eine Abfrage fuer alle,
     nicht eine je Elternteil — bei zwei Eltern und drei Geschwistern waeren
     das sonst sechs Fahrten. */
  const { data: aktiveKinder, error: kFehler } = await sb.from("eltern_kinder")
    .select("person_id, mitglieder!inner(aktiv)")
    .in("person_id", eltern)
    .eq("mitglieder.aktiv", true);
  if (kFehler) {
    console.error("setzeArtFuerElternOhneKind (kinder) error:", kFehler);
    hinweise.push("Die Kinder der Eltern konnten nicht geprüft werden — bitte prüfen.");
    return hinweise;
  }
  const hatNochKind = new Set((aktiveKinder ?? []).map(k => k.person_id as string));

  /* ⚠ Und eine EIGENE Mitgliedschaft? Wer selbst Mitglied ist, bleibt es. */
  const { data: eigene, error: mFehler } = await sb.from("mitglieder")
    .select("person_id").in("person_id", eltern).eq("aktiv", true);
  if (mFehler) {
    console.error("setzeArtFuerElternOhneKind (eigene) error:", mFehler);
    hinweise.push("Die eigenen Mitgliedschaften der Eltern konnten nicht geprüft werden.");
    return hinweise;
  }
  const istSelbstMitglied = new Set((eigene ?? []).map(m => m.person_id as string));

  const betroffen = eltern.filter(
    p => !hatNochKind.has(p) && !istSelbstMitglied.has(p));
  if (betroffen.length === 0) return hinweise;

  const { error } = await sb.from("personenart_pro_person").upsert(
    betroffen.map(pid => ({ verein_id: vereinId, person_id: pid, art_id: artId })) as never,
    { onConflict: "verein_id,person_id,art_id" },
  );
  if (error) {
    console.error("setzeArtFuerElternOhneKind (setzen) error:", error);
    hinweise.push("Die Art der Eltern konnte nicht gesetzt werden — bitte im Profil prüfen.");
    return hinweise;
  }

  hinweise.push(betroffen.length === 1
    ? "Ein Elternteil hat kein Kind mehr im Verein und wurde zur eingestellten Art."
    : `${betroffen.length} Elternteile haben kein Kind mehr im Verein und wurden zur eingestellten Art.`);
  return hinweise;
}

/**
 * Eine Mitgliedschaft archivieren — die Abkuerzung.
 *
 * Tut dasselbe wie der Austritt mit dem Ziel „Archiv"; die zwei
 * Unterschiede, die bleiben, sind gewollt: das Datum ist HEUTE statt
 * waehlbar, und `deaktiviert_von` haelt fest, wer geklickt hat.
 */
/**
 * ⚠ SEIT DEM 23.08.2026 RUFT SIE NIEMAND MEHR.
 *
 * „Archivieren" ist als Knopf und als Sammelaktion weggefallen — es tat seit
 * dem 22.08. dasselbe wie der Austritt, nur ohne waehlbares Datum und ohne
 * die Frage, was danach gilt. Beide Wege gehen jetzt ueber
 * `beendeMitgliedschaft()`.
 *
 * ⚠ SIE STEHT TROTZDEM NOCH HIER, und das ist eine Entscheidung, keine
 * Nachlaessigkeit: sie ist der einzige Aufrufer von `beendeVerknuepfungen()`
 * mit einer LISTE von Mitgliedschaften. Wer eines Tages einen Sammelvorgang
 * ohne Dialog braucht, findet ihn hier statt ihn neu zu bauen.
 *
 * Wird sie in einem Monat immer noch von niemandem gerufen, gehoert sie
 * geloescht — eine Funktion ohne Aufrufer ist sonst genau der tote Zweig, vor
 * dem CLAUDE.md warnt.
 */
export async function archiviereMitglied(sb: SbClient, id: number | number[], deaktiviertVon: string | null, vereinId: string): Promise<PostgrestError | null> {
  const ids = Array.isArray(id) ? id : [id];
  const { error } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date().toISOString(),
    deaktiviert_von: deaktiviertVon,
  }).in("id", ids);
  if (error) return error;

  /* Erst nach dem Archivieren: schlaegt das fehl, soll nichts halb beendet
     dastehen. Die Hinweise gehen hier ins Leere — der Knopf hat keine
     Stelle, sie zu zeigen —, und das ist der Preis der Abkuerzung. Ein
     Fehler wird trotzdem nicht verschluckt: er steht in der Konsole. */
  const hinweise = await beendeVerknuepfungen(sb, ids, new Date().toISOString().slice(0, 10));

  /* ⚠ DER ZWEITE AUSLOESER, auch hier. Eine Mitgliedschaft endet auf drei
     Wegen; laege er nur im Austrittsdialog, haette ein archiviertes Kind
     denselben stillen Ausfall, den Etappe 3 beseitigt — der Elternteil
     bliebe ohne Art stehen, und niemand fragte ihn.

     `vereinId` ist dafuer neu und PFLICHT: ohne sie liesse sich die
     eingestellte Art nicht lesen, und ein optionaler Parameter waere
     vergessbar (dieselbe Ueberlegung wie bei den Service-Inserts, siehe
     CLAUDE.md → verein_id als eigener Pflichtparameter). */
  hinweise.push(...await setzeArtFuerElternOhneKind(sb, ids, vereinId));

  const probleme = hinweise.filter(h => h.includes("konnten nicht") || h.includes("konnte nicht"));
  if (probleme.length) console.error("archiviereMitglied (Verknüpfungen):", probleme.join(" · "));
  return null;
}

export async function reaktiviereMitglied(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").update({
    aktiv: true,
    deaktiviert_am: null,
    deaktiviert_von: null,
  }).eq("id", id);
  return error;
}

/* Eine Zeile der Archivliste. Explizit deklariert, weil die Abfrage die
   Namen verschachtelt liefert (personen(...)) und flacheZeilen() sie flach
   macht — der aus der Abfrage abgeleitete Typ träfe also nicht zu. */
/**
 * Eine Zeile im Archiv.
 *
 * ⚠ SEIT DEM 23.08.2026 IST DAS ARCHIV EINE PERSONENLISTE, keine Liste
 * inaktiver Mitgliedschaften. Die Identitaet der Zeile ist deshalb die
 * `person_id` — ein `string`, kein `number`.
 *
 * Vorher hiess Archiv „Mitgliedschaft inaktiv", und damit stand jeder
 * Ausgetretene in ZWEI Listen: hier und bei den Supportern. Jetzt heisst es
 * „bei dieser Person ist noch etwas offen", und das ist eine Markierung an
 * der Person.
 */
export interface ArchivZeile {
  /** ⚠ Die PERSON-Id. Die Mitgliedschaft steht daneben und kann fehlen. */
  id: string;
  vorname: string | null;
  nachname: string | null;
  /** ⚠ Der Vermerk. NICHT LEER = im Archiv. */
  offene_punkte: string | null;
  /**
   * Die zuletzt beendete Mitgliedschaft, falls es eine gibt.
   *
   * ⚠ KANN FEHLEN. Ein Vermerk haengt an der Person, nicht an einer
   * Mitgliedschaft — jemand ohne jede Mitgliedschaft kann etwas offen haben
   * (ein Supporter, der ein Tenue geliehen hat). Dann gibt es nichts zu
   * reaktivieren und nichts zu loeschen, und die Knoepfe erscheinen nicht.
   */
  mitglied_id: number | null;
  mitgliedtyp: string | null;
  deaktiviert_am: string | null;
  deaktiviert_von: string | null;
}

/**
 * Das Archiv: Personen mit einem Vermerk.
 *
 * ⚠ NICHT MEHR `mitglieder.aktiv = false`. Das war ein ORT; jetzt ist es eine
 * MARKIERUNG. Wer austritt und nichts offen hat, steht bei den Supportern und
 * sonst nirgends — statt in zwei Listen gleichzeitig.
 *
 * ⚠ `error` WIRD GELESEN. Ohne das saehe ein 42501 aus wie „niemand hat etwas
 * offen", und das Archiv waere lautlos leer. Genau die Verwechslung, die
 * dieses Projekt schon mehrfach Stunden gekostet hat.
 */
export async function fetchArchiv(sb: SbClient): Promise<ArchivZeile[] | null> {
  const { data, error } = await sb.from("personen")
    .select("id,vorname,nachname,offene_punkte,mitglieder(id,mitgliedtyp,aktiv,deaktiviert_am,deaktiviert_von)")
    .not("offene_punkte", "is", null)
    .order("nachname", { ascending: true });

  /* ⚠ `null` BEI EINEM LESEFEHLER, NICHT `[]`. Der Unterschied ist der ganze
     Punkt: `[]` heisst „nachgesehen, nichts da", `null` heisst „nicht
     gelesen". Wer beides zu `[]` macht, verwandelt einen Fehler in eine
     Datenlage — das teuerste Muster dieses Projekts.

     ⚠ Und hier ist es besonders scharf: die Tab-Zahl ist die Laenge dieser
     Liste. Bei `[]` stuende „0" da, als waere nachgesehen worden. Beim
     Supporter-Tab ist es noch schaerfer — er rendert bei 0 GAR NICHT. Ein
     einziger 42501 wuerde einen ganzen Bereich der Oberflaeche verschwinden
     lassen, ohne dass es jemandem auffaellt. (Didi, 25.08.2026.) */
  if (error) { console.error("fetchArchiv error:", error); return null; }

  return (data || [])
    /* ⚠ KEIN AKTIVES MITGLIED IM ARCHIV. Der Vermerk bleibt beim
       Wiedereintritt stehen — er soll ja nicht verschwinden, nur weil jemand
       zurueckkommt. Ohne diesen Filter stuende die Person dann im Archiv-Tab,
       und ein Tab namens „Archiv" mit aktiven Mitgliedern darin ist genau die
       Verwirrung, die der Umbau abbaut.

       ⚠ Der Vermerk ist dadurch NICHT unsichtbar: er steht als (ausgeblendete)
       Spalte in der Mitgliederliste und auf der Personenseite. Sonst suchte
       jemand etwas, das er nicht finden kann. */
    .filter(p => !((p.mitglieder || []) as MitgliedRoh[]).some(m => m.aktiv === true))
    .map(p => {
    /* Die zuletzt BEENDETE Mitgliedschaft. Eine aktive gehoert nicht hierher:
       wer wieder Mitglied ist, steht in der Mitgliederliste — der Vermerk
       bleibt trotzdem, weil eine offene Rechnung nicht durch einen
       Wiedereintritt verschwindet. */
    const alleM = (p.mitglieder || []) as MitgliedRoh[];
    const beendet = alleM
      .filter(m => m.aktiv === false)
      .sort((a, b) => String(b.deaktiviert_am || "").localeCompare(String(a.deaktiviert_am || "")))[0] || null;
    return {
      id: p.id as string,
      vorname: p.vorname as string | null,
      nachname: p.nachname as string | null,
      offene_punkte: p.offene_punkte as string | null,
      mitglied_id: beendet ? (beendet.id as number) : null,
      mitgliedtyp: beendet ? (beendet.mitgliedtyp ?? null) : null,
      deaktiviert_am: beendet ? (beendet.deaktiviert_am ?? null) : null,
      deaktiviert_von: beendet ? (beendet.deaktiviert_von ?? null) : null,
    };
  });
}

/** Die eingebettete Mitgliedschaftszeile aus `fetchArchiv`. */
interface MitgliedRoh {
  id: number;
  mitgliedtyp: string | null;
  aktiv: boolean | null;
  deaktiviert_am: string | null;
  deaktiviert_von: string | null;
}

/* ⚠ `fetchArchivCount()` IST AM 25.08.2026 GEFALLEN — und der Grund steht
   hier, weil er sich sonst wiederholt.

   Sie zaehlte mit `count: "exact", head: true` und der Bedingung
   `offene_punkte is not null`. Darueber stand woertlich der Kommentar
   „Dieselbe Bedingung wie `fetchArchiv`. Zwei Regeln fuer eine Zahl waeren
   genau der Fehler, den dieses Projekt heute dreimal gefunden hat."

   ⚠ ES WAR NICHT DIESELBE BEDINGUNG. `fetchArchiv` nimmt zusaetzlich jede
   Person heraus, die eine AKTIVE Mitgliedschaft hat (der Vermerk bleibt beim
   Wiedereintritt absichtlich stehen). Die Zahl tat das nicht. Wer eine Person
   mit stehendem Vermerk reaktivierte, sah danach dauerhaft „Archiv 1" ueber
   einer leeren Liste.

   Der Kommentar behauptete also genau das, was nicht galt — und wer ihn las,
   sah nicht nach. Dieselbe Familie wie die vier Faelle vom 23.08.2026.

   ⚠ DIE REPARATUR IST NICHT, DIE BEDINGUNG ZU KOPIEREN. Zwei Stellen, die
   dieselbe Bedingung fuehren, laufen wieder auseinander — nur spaeter. Der
   Aufrufer nimmt jetzt `fetchArchiv(sb).length`: eine Abfrage, eine Regel,
   und die Zahl kann per Bauart nicht mehr von ihrer Liste abweichen.

   Der Preis ist ehrlich: statt eines `head`-Zaehlers werden die Zeilen
   geladen. Das Archiv hat heute EINE. */

/* ── Mitglieder Ansichten ── */

export async function fetchAnsichten(sb: SbClient, benutzerId: string, typ = "mitglieder"): Promise<Ansicht[]> {
  const { data } = await sb.from("mitglieder_ansichten")
    .select("*")
    .eq("typ", typ)
    .or(`benutzer_id.eq.${benutzerId},geteilt.eq.true`)
    .order("created_at", { ascending: true });
  return (data || []) as Ansicht[];
}

/* sortierung liegt in der DB als jsonb — hier eng typisiert, damit die
   Aufrufer keine beliebige Json-Struktur hineinschreiben.
   verein_id ist bewusst ausgeschlossen: es kommt als eigener Pflichtparameter,
   damit der Aufrufer es nicht vergessen kann (siehe insertMitglied). */
export type AnsichtInsert = Omit<TablesInsert<"mitglieder_ansichten">, "sortierung" | "verein_id"> & {
  sortierung?: AnsichtSortDef[];
};

export async function insertAnsicht(sb: SbClient, ansicht: AnsichtInsert, vereinId: string): Promise<Ansicht | null> {
  const { data, error } = await sb.from("mitglieder_ansichten")
    .insert({ ...ansicht, verein_id: vereinId })
    .select().single();
  if (error) console.error("insertAnsicht error:", error);
  return (data as Ansicht | null) ?? null;
}

export async function deleteAnsicht(sb: SbClient, id: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_ansichten").delete().eq("id", id);
  return error;
}

/* ── Notizen ── */

/**
 * Notizen einer PERSON — ueber alle Mitgliedschaften hinweg.
 *
 * ⚠ Nicht mehr `.eq("mitglied_id", …)`. Notizen galten bis zum 21.08.2026 als
 * `nur_mitgliedschaft`, weil die Spalte NOT NULL war — eine technische Grenze,
 * als fachliche Regel behandelt. Ein Verein will ueber einen Supporter oder
 * ein Elternteil sehr wohl etwas notieren koennen.
 */
export async function fetchNotizen(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_notizen")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchNotizen error:", error);
  return data || [];
}

/* verein_id als Pflichtparameter statt Feld im Objekt — siehe insertAnsicht. */
export async function insertNotiz(
  sb: SbClient,
  notiz: Omit<TablesInsert<"mitglieder_notizen">, "verein_id">,
  vereinId: string,
): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen")
    .insert({ ...notiz, verein_id: vereinId });
  return error;
}

export async function updateNotiz(sb: SbClient, id: number, text: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").update({
    text,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  return error;
}

export async function deleteNotiz(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").delete().eq("id", id);
  return error;
}

/* ── Elternkontakte ── */

// Eltern-Funktionen → elternService.ts
export * from "./elternService.ts";

/* ── Kader ── */

export async function fetchKaderFuerMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("*, teams(id,name,kurzname)")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function fetchKaderEintraege(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("team_id, rollen")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function upsertKader(sb: SbClient, eintrag: TablesInsert<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").upsert(eintrag, { onConflict: "mitglied_id,team_id,saison" });
  return error;
}

export async function updateKader(sb: SbClient, id: number, fields: TablesUpdate<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update(fields).eq("id", id);
  return error;
}

export async function deaktiviereKader(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update({ aktiv: false }).eq("id", id);
  return error;
}

/* ── Benutzer (Portal-Zugang) ── */

/**
 * Das Portal-Konto einer PERSON.
 *
 * ⚠ Suchte bis zum 21.08.2026 ueber `benutzer.mitglied_id`. Beim Supporter
 * steht dort seit dem Rueckbau vom 20.08. `null` — sein Konto wurde also
 * NICHT gefunden, und der Portal-Tab zeigte bei ihm „kein Zugang", ohne dass
 * irgendetwas fehlschlug. Wieder ein Ausfall, der wie eine Datenlage aussieht.
 *
 * Der Zugang haengt seit Etappe 4 an `benutzer.person_id`; `mitglied_id` ist
 * nur noch Bequemlichkeit. Der alte Weg ist ERSETZT, nicht ergaenzt.
 */
export async function fetchBenutzerFuerPerson(sb: SbClient, personId: string) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role,created_at,last_sign_in_at,aktiv")
    .eq("person_id", personId)
    .maybeSingle();
  return data;
}

export async function updateBenutzer(sb: SbClient, id: string, fields: TablesUpdate<"benutzer">): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update(fields).eq("id", id);
  return error;
}

/* Der Portal-Zugang haengt allein an der Verknuepfung `benutzer.mitglied_id`.
   Das fruehere Kennzeichen `mitglieder.hat_portal_zugang` war eine Kopie
   derselben Aussage und konnte veralten — wurde ein Konto ausserhalb des
   Portals geloescht, blieb es auf true stehen. Gestrichen in Etappe 6c. */
/** ⚠ `mitglied_id` wird MITGESCHRIEBEN, wo es eine gibt — die Spalte ist
    Bequemlichkeit und kein Bezugspunkt, aber solange sie steht, soll sie
    stimmen. Ohne Mitgliedschaft bleibt sie null. */
/* ── Portal-Zugang an- und abschalten ────────────────────────────────────

   ⚠ GESCHALTET WIRD `benutzer.aktiv`, NICHT DIE VERKNUEPFUNG.

   Bis zum 21.08.2026 setzte das Deaktivieren `mitglied_id = null` — bei einer
   Person OHNE Mitgliedschaft (Supporter, Elternteil) stand dort aber laengst
   null. Geschrieben wurde null ueber null, gelesen wird der Status ueber
   `person_id` (fetchBenutzerFuerPerson), und der Tab meldete „Zugang
   deaktiviert" und zeigte danach unveraendert „Aktiv". Ein Knopf, der nichts
   tut und Erfolg meldet.

   Und selbst beim Mitglied traf es nicht, was das Wort sagt: gesperrt wird
   der Login allein durch `benutzer.aktiv` (useDbUser prueft `aktiv === false`
   und meldet ab). Das Loesen der Verknuepfung hat nur die Mitgliederliste
   umgestellt — der Betroffene konnte sich weiter anmelden.

   Deshalb jetzt: der Zustand wird geschaltet, die Verknuepfung bleibt. Ein
   Konto von seiner Person zu TRENNEN ist eine andere Aktion, und es gibt
   heute keine, die sie verlangt.

   Entschieden am 21.08.2026 (Didi).

   ⚠ Offen bleibt: die Mitgliederliste (`useAppData.loadDbMitglieder`) baut
   `hat_benutzer`/`benutzer_deaktiviert` weiterhin ueber `mitglied_id` auf.
   Eine Person ohne Mitgliedschaft steht dort gar nicht, `onUpdatePortalZugang`
   erreicht sie nicht — siehe den offenen Punkt in CLAUDE.md. */

export async function portalZugangDeaktivieren(sb: SbClient, personId: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ aktiv: false }).eq("person_id", personId);
  return error;
}

export async function portalZugangReaktivieren(sb: SbClient, personId: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ aktiv: true }).eq("person_id", personId);
  return error;
}

/* ── Portal Funktionen ── */

export async function fetchPortalFunktionen(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name,farbe)")
    .order("name");
  return data || [];
}

export async function fetchPortalFunktionenMitGruppe(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name)")
    .order("name");
  return data || [];
}

/* ── Teams ── */

export async function fetchAktiveTeams(sb: SbClient) {
  const { data } = await sb.from("teams")
    .select("id,name,kurzname")
    .eq("aktiv", true)
    .order("name");
  return data || [];
}

/**
 * Ändert ein Mitglied. Die Aufrufer (InfoTab, Datenprüfung,
 * Inline-Bearbeitung) übergeben flache Felder; die Zuordnung auf
 * `personen` und `mitglieder` passiert hier.
 *
 * Personenfelder gehen ausschliesslich nach `personen` — die
 * gleichnamigen Spalten in `mitglieder` werden ab Etappe 2b bewusst
 * NICHT mehr mitgeschrieben. Zwei Wahrheiten laufen sonst auseinander,
 * und man sucht den Fehler dort, wo er nicht ist.
 */
export async function updateMitglied(sb: SbClient, id: number, fields: MitgliedUpdate): Promise<boolean> {
  const { person, mitgliedschaft } = verteileFelder(fields as Record<string, unknown>);
  const jetzt = new Date().toISOString();

  if (Object.keys(person).length > 0) {
    const { data: zeile } = await sb.from("mitglieder")
      .select("person_id").eq("id", id).maybeSingle();
    const personId = zeile?.person_id;
    if (!personId) {
      /* ⚠ HIER STAND EIN AUSWEICHPFAD: „Mitglied ohne Person — schreibe in
         die Altspalten". Beides ist seit dem 21.08.2026 nachweislich falsch:

         `mitglieder.person_id` ist NOT NULL (seit Etappe 2b), und in der
         Datenbank steht keine einzige Zeile mit NULL. „Mitglied ohne Person"
         KANN nicht mehr entstehen. Und die Altspalten, in die der Zweig
         schrieb, gibt es seit Etappe 6a nicht mehr — der Schreibversuch wäre
         ohnehin gescheitert.

         Kommt hier nichts zurück, hat das genau zwei mögliche Gründe: die
         Zeile ist für diesen Benutzer nicht sichtbar (RLS) oder es gibt sie
         nicht. Beides ist ein Fehler und kein Grund für einen Umweg.

         ⚠ Am `error` ist das nicht zu erkennen: RLS liefert keine Meldung,
         sondern ein leeres Ergebnis. Die Unterscheidung ist auch nicht nötig
         — in beiden Fällen darf nicht geschrieben werden. */
      console.error(
        `updateMitglied: Mitgliedschaft ${id} nicht lesbar — RLS oder gelöscht. Es wurde nichts geschrieben.`);
      return false;
    } else {
      /* ⚠ Ueber updatePerson() und nicht mit einem eigenen `update`: es soll
         genau EINEN Schreiber fuer `personen` geben. Zwei Wege zu demselben
         Feld sind das, was der Altspalten-Zweig hier schon einmal gekostet
         hat — der eine schrieb, der andere diagnostizierte falsch. */
      const ok = await updatePerson(sb, personId, person);
      if (!ok) return false;
    }
  }

  if (Object.keys(mitgliedschaft).length === 0) return true;

  const { error } = await sb.from("mitglieder").update({
    ...mitgliedschaft,
    updated_at: jetzt,
  }).eq("id", id);
  if (error) console.error("updateMitglied error:", error);
  return !error;
}

export async function updateMitgliedRolle(sb: SbClient, id: number, rolle: string | null, benutzerId: string | null = null) {
  await sb.from("mitglieder").update({ rolle: rolle||null }).eq("id", id);
  if (rolle && benutzerId) {
    await sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
  }
}

/**
 * Foto einer PERSON setzen.
 *
 * ⚠ Hiess bis zum 21.08.2026 `updateMitgliedFoto` und war auf die
 * Mitgliedschaft geschluesselt — auch der Speicherpfad. `foto_url` gehoert
 * aber zur Person (PERSON_FELDER); ein Supporter oder Elternteil hat kein
 * Mitglied, an dem das Foto haengen koennte.
 *
 * ⚠ DER SPEICHERPFAD AENDERT SICH MIT: neue Bilder liegen unter
 * `<person_id>/foto.<ext>` statt `<mitglied_id>/foto.<ext>`. Bestehende
 * Bilder bleiben erreichbar, weil die vollstaendige URL in
 * `personen.foto_url` steht und nicht aus der Id errechnet wird. Die
 * Bucket-Policies pruefen nur `bucket_id`, nicht den Pfad (nachgesehen am
 * 21.08.2026) — der Wechsel ist also erlaubt.
 *
 * Der alte Weg ist ERSETZT, nicht ergaenzt: zwei Schluessel fuer dasselbe
 * Bild waeren zwei Orte, an denen es liegen kann.
 */
export async function updatePersonFoto(sb: SbClient, personId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const path = `${personId}/foto.${ext}`;
  const { error: upErr } = await sb.storage.from("mitglieder-fotos").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = sb.storage.from("mitglieder-fotos").getPublicUrl(path);
  const ok = await updatePerson(sb, personId, { foto_url: data.publicUrl + "?t=" + Date.now() });
  if (!ok) throw new Error("Foto konnte nicht gespeichert werden.");
  return data.publicUrl;
}

/** ⚠ Leert nur `foto_url`. Die Datei bleibt im Bucket liegen — das war schon
    vorher so und gehoert zum DSGVO-Loeschen, nicht hierhin. */
export async function deletePersonFoto(sb: SbClient, personId: string): Promise<boolean> {
  return updatePerson(sb, personId, { foto_url: null });
}

export async function fetchBenutzerByMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("benutzer").select("id,role").eq("mitglied_id", mitgliedId).maybeSingle();
  return data;
}

/**
 * Legt Person UND Mitgliedschaft an. Zwei Schreibvorgänge, feste
 * Reihenfolge: erst die Person, dann die Mitgliedschaft mit ihrer
 * `person_id`.
 *
 * Scheitert der zweite Schritt, bleibt eine Person ohne Mitgliedschaft
 * zurück. Das ist die harmlosere Hälfte — sie taucht nirgends auf und
 * lässt sich beim nächsten Anlegen derselben E-Mail wiederverwenden.
 * Umgekehrt wäre eine Mitgliedschaft ohne Person ein Datensatz, der
 * durch die Fassade fällt.
 */
export async function insertMitglied(
  sb: SbClient,
  fields: MitgliedInsert,
  vereinId: string,
): Promise<number | null> {
  const jetzt = new Date().toISOString();
  const { person, mitgliedschaft } = verteileFelder(fields as Record<string, unknown>);

  const { data: neuePerson, error: personErr } = await sb.from("personen").insert({
    ...person,
    verein_id: vereinId,
    created_at: jetzt,
    updated_at: jetzt,
  } as never).select("id").single();
  if (personErr) { console.error("insertMitglied (personen) error:", personErr); return null; }

  const { data, error } = await sb.from("mitglieder").insert({
    ...mitgliedschaft,
    person_id: neuePerson?.id,
    verein_id: vereinId,
    aktiv: true,
    created_at: jetzt,
    updated_at: jetzt,
  } as never).select("id").single();
  if (error) { console.error("insertMitglied error:", error); return null; }
  return data?.id ?? null;
}

/* fetchMitgliedtypPflichtfelder und fetchRollePflichtfelder standen hier bis
   zum 19.08.2026. Beide Tabellen werden nicht mehr gelesen — die Quelle ist
   `mitgliedtyp_feldkonfig` (domains/members/feldkonfigService.ts). */

export const FELD_LABEL: Record<string, string> = {
  vorname: "Vorname", nachname: "Nachname", email: "E-Mail",
  telefon: "Telefon", geburtsdatum: "Geburtsdatum", geschlecht: "Geschlecht",
  nationalitaet: "Nationalität 1", nationalitaet2: "Nationalität 2",
  heimatort: "Heimatort", ahv_nr: "AHV-Nr.", strasse: "Strasse",
  plz: "PLZ", ort: "Ort", kanton: "Kanton",
  mitgliedtyp: "Mitgliedtyp", rolle: "Portalrolle",
  /* Fehlte bis 19.08.2026: `eintrittsdatum` ist seit der Migration vom
     26.07.2026 eine echte Spalte und im Profil bearbeitbar — in der
     Aenderungshistorie stand deshalb der Spaltenname statt einer
     Beschriftung. Aufgefallen ueber den Registry-Test in feldkonfig. */
  eintrittsdatum: "Eintrittsdatum",
  spielerpass: "Spielerpass", js_nr: "J+S Nr.", fairgate_id: "Fairgate-ID",
  teams: "Teams", kaderrollen: "Kaderrollen",
  funktionen: "Vereinsfunktionen", elternkontakte: "Elternkontakte",
};

/* Werte, die in der Historie landen — die Aufrufer geben auch Zahlen
   oder Arrays weiter, deshalb bewusst weit gefasst. */
export type LogWert = string | number | boolean | null | undefined;

/**
 * Woran ein Verlaufseintrag haengt.
 *
 * ⚠ DIE PERSON IST PFLICHT, DIE MITGLIEDSCHAFT IST KONTEXT.
 *
 * Seit `migration_verlauf_person.sql` (21.08.2026) fuehren
 * `mitglieder_aenderungen` und `mitglieder_aktivitaeten` `person_id NOT NULL`
 * und `mitglied_id` nullable mit `ON DELETE SET NULL`. Der Verlauf gehoert der
 * PERSON und ueberlebt Austritt und Rueckkehr; die Mitgliedschaft sagt nur,
 * in welchem Zusammenhang es passiert ist.
 *
 * Als eigener Typ und nicht als zwei Parameter: so kann keine Aufrufstelle
 * die Person weglassen, ohne dass der Compiler es sagt. Ein `mitgliedId`
 * allein war bis heute die Signatur — und genau deshalb hing der ganze
 * Verlauf an einer Zeile, die beim Loeschen der Mitgliedschaft verschwand.
 */
export type LogBezug =
  /** Der Normalfall: die Person ist bekannt, die Mitgliedschaft optional. */
  | { personId: string; mitgliedId?: number | string | null }
  /** Der Rueckfall: nur die Mitgliedschaft. Die Person wird nachgeschlagen. */
  | { mitgliedId: number | string; personId?: undefined };

/**
 * Die zwei Bezugsspalten fuer einen Verlaufseintrag.
 *
 * ⚠ Wo `personId` fehlt, wird sie NACHGESCHLAGEN — sichtbar, an einer
 * Stelle, mit Fehlerpfad. Das ist bewusst KEIN Datenbank-Trigger: der waere
 * robuster und zugleich unsichtbar, und man saehe im Code nicht mehr, wer
 * die Wahrheit setzt. Hier steht die Abfrage da, wo sie passiert.
 *
 * Aufrufstellen, die die Person ohnehin haben, geben sie mit und sparen die
 * Abfrage. Das ist der Normalfall und die bessere Form.
 *
 * ⚠ Findet sich keine Person, wird NICHTS geschrieben und laut gemeldet. Eine
 * Zeile ohne Bezug waere schlimmer als keine: `person_id` ist NOT NULL, der
 * Insert schluege ohnehin fehl — nur eben ohne Erklaerung.
 */
async function bezugFelder(
  sb: SbClient, bezug: LogBezug,
): Promise<{ person_id: string; mitglied_id: number | null } | null> {
  const roh = bezug.mitgliedId;
  const mitgliedId = roh === null || roh === undefined || roh === "" ? null : parseInt(String(roh));

  if (bezug.personId) return { person_id: bezug.personId, mitglied_id: mitgliedId };

  if (mitgliedId == null) {
    console.error("logEintrag: weder personId noch mitgliedId — nichts geschrieben.");
    return null;
  }
  const { data, error } = await sb.from("mitglieder")
    .select("person_id").eq("id", mitgliedId).maybeSingle();
  if (error) { console.error("logEintrag: person_id nicht lesbar:", error); return null; }
  if (!data?.person_id) {
    console.error(`logEintrag: Mitgliedschaft ${mitgliedId} hat keine person_id — nichts geschrieben.`);
    return null;
  }
  return { person_id: data.person_id, mitglied_id: mitgliedId };
}

export async function logAenderung(
  sb: SbClient,
  bezug: LogBezug,
  vereinId: string,
  feld: string,
  alterWert: LogWert,
  neuerWert: LogWert,
  geaendertVon?: string | null,
): Promise<void> {
  if (alterWert === neuerWert) return; // Keine Änderung

  const feldLabel = FELD_LABEL[feld] || feld;
  const von = geaendertVon || "Administrator";

  if (alterWert && neuerWert) {
    // Echter Wechsel: Wert A → Wert B → in mitglieder_aenderungen
    const felder = await bezugFelder(sb, bezug);
    if (!felder) return;
    const { error } = await sb.from("mitglieder_aenderungen").insert({
      ...felder,
      verein_id:     vereinId,
      feld,
      alter_wert:    String(alterWert),
      neuer_wert:    String(neuerWert),
      geaendert_von: von,
    });
    /* ⚠ `error` lesen. Ein verlorener Verlaufseintrag faellt sonst nirgends
       auf — er hinterlaesst keine Luecke, die jemand suchen wuerde. */
    if (error) console.error("logAenderung error:", error);
  } else if (!alterWert && neuerWert) {
    // Erstmalig erfasst: null → Wert → in mitglieder_aktivitaeten
    await logAktivitaet(sb, bezug, vereinId,
      AKTIVITAET_TYP.FELD_ERFASST,
      `${feldLabel} erfasst`,
      feld, String(neuerWert), von
    );
  } else if (alterWert && !neuerWert) {
    // Geleert: Wert → null → in mitglieder_aktivitaeten
    await logAktivitaet(sb, bezug, vereinId,
      AKTIVITAET_TYP.FELD_GELEERT,
      `${feldLabel} geleert`,
      feld, String(alterWert), von
    );
  }
}

/**
 * Der Verlauf einer PERSON — ueber alle Mitgliedschaften hinweg, ungefiltert.
 *
 * ⚠ Das aendert, was auf dem Schirm steht: wer austritt und wiederkommt, sieht
 * auch die Eintraege von davor. Genau das ist der Zweck (Entscheidung Didi,
 * 21.08.2026) — der Verlauf gehoert der Person, nicht der Mitgliedschaft.
 */
export async function fetchAenderungen(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_aenderungen")
    .select("*")
    .eq("person_id", personId)
    .order("geaendert_at", { ascending: false })
    .limit(50);
  if (error) console.error("fetchAenderungen error:", error);
  return data || [];
}

// ── Aktivitäten-Typen ─────────────────────────────────────────
export const AKTIVITAET_TYP = {
  ANGELEGT:            "angelegt",
  FELD_ERFASST:        "feld_erfasst",
  FELD_GELEERT:        "feld_geleert",
  TEAM_HINZUGEFUEGT:   "team_hinzugefuegt",
  TEAM_ENTFERNT:       "team_entfernt",
  KADERROLLE_GEAENDERT:"kaderrolle_geaendert",
  FUNKTION_GEAENDERT:  "funktion_geaendert",
  ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt",
  ELTERN_ENTFERNT:     "eltern_entfernt",
  ELTERN_GEAENDERT:    "eltern_geaendert",
  PORTAL_AKTIVIERT:    "portal_aktiviert",
  PORTAL_DEAKTIVIERT:  "portal_deaktiviert",
  PORTAL_REAKTIVIERT:  "portal_reaktiviert",
  ARCHIVIERT:          "archiviert",
  REAKTIVIERT:         "reaktiviert",
} as const;

export type AktivitaetTyp = typeof AKTIVITAET_TYP[keyof typeof AKTIVITAET_TYP];

export async function logAktivitaet(
  sb: SbClient,
  bezug: LogBezug,
  vereinId: string,
  typ: AktivitaetTyp,
  beschreibung: string,
  feld: string | null = null,
  wert: LogWert = null,
  geaendertVon: string | null = null,
): Promise<void> {
  const felder = await bezugFelder(sb, bezug);
  if (!felder) return;
  const { error } = await sb.from("mitglieder_aktivitaeten").insert({
    ...felder,
    verein_id:     vereinId,
    typ,
    beschreibung,
    feld:          feld || null,
    wert:          wert == null ? null : String(wert),
    geaendert_von: geaendertVon || null,
  });
  if (error) console.error("logAktivitaet error:", error);
}

/** Aktivitaeten einer PERSON — siehe `fetchAenderungen`. */
export async function fetchAktivitaeten(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_aktivitaeten")
    .select("*")
    .eq("person_id", personId)
    .order("geaendert_at", { ascending: false })
    .limit(100);
  if (error) console.error("fetchAktivitaeten error:", error);
  return data || [];
}
