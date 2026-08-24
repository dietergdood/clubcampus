/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/loeschService.ts

   Der Weg zur Edge Function `person-loeschen`.

   ⚠ DIE VORSCHAU WIRD NICHT HIER GERECHNET, und das ist Absicht.
   Eine Vorschau, die der Browser rechnet, sieht nur, was RLS ihm
   zeigt; das Löschen läuft mit `service_role` und sieht alles. Eine
   Vorschau, die „3 Zeilen" sagt, während 7 fallen, ist SCHLIMMER als
   keine — sie erzeugt Zutrauen ohne Deckung.

   Diese Datei reicht also durch und rechnet nichts nach.
   ═══════════════════════════════════════════════════════════════ */
import { fingerabdruckDaten } from "../../../supabase/functions/person-loeschen/vorschau.ts";
import type { Vorschau, Posten } from "../../../supabase/functions/person-loeschen/vorschau.ts";
import type { Sb } from "../../types.ts";

export type { Vorschau, Posten };

export interface VorschauAntwort {
  vorschau: Vorschau;
  /** HMAC über die Tatsachen, signiert von der Function. Wandert unverändert
      zurück; der Browser kann ihn weder lesen noch nachrechnen. */
  abdruck: string;
  gueltig_bis: string;
}

export interface LoeschAntwort {
  geloescht: boolean;
  zahlen: Record<string, number>;
  /** Was die Vorschau nicht prüfen konnte, konnte auch der Lauf nicht
      aufräumen — genannt, nicht verschwiegen. */
  nicht_geprueft: string[];
}

/** Ein Fehler der Function, mit dem Status und — falls die Zahlen abwichen —
    den Unterschieden im Klartext. */
export interface LoeschFehler {
  fehler: string;
  unterschiede?: string[];
}

function istFehler(x: unknown): x is LoeschFehler {
  return !!x && typeof x === "object" && "fehler" in x;
}

async function rufe(sb: Sb, body: Record<string, unknown>): Promise<unknown> {
  if (!sb) return { fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("person-loeschen", { body });

  /* ⚠ Bei einem Status ausserhalb 2xx liefert `functions.invoke` `data = null`
     und einen `FunctionsHttpError`, dessen `message` nur „non-2xx status code"
     lautet — der eigentliche Text steht im RUMPF. Ohne das Auslesen sähe der
     Admin „Edge Function returned a non-2xx status code" statt der Meldung,
     die ihm sagt, was sich geändert hat. */
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const rumpf = await ctx.json();
        if (istFehler(rumpf)) return rumpf;
      } catch { /* kein JSON im Rumpf — dann bleibt die allgemeine Meldung */ }
    }
    return { fehler: error.message || "Der Aufruf ist fehlgeschlagen." };
  }
  return data;
}

/**
 * Was beim Löschen dieser Person geschähe — als Zahlen, bevor es geschieht.
 * Schreibt nichts.
 */
export async function holeLoeschVorschau(
  sb: Sb, personId: string,
): Promise<VorschauAntwort | LoeschFehler> {
  const raus = await rufe(sb, { aktion: "vorschau", person_id: personId });
  if (istFehler(raus)) return raus;
  return raus as VorschauAntwort;
}

/**
 * Löschen — nur mit dem Abdruck aus der Vorschau.
 *
 * ⚠ `zahlen_alt` GEHT MIT, obwohl die Function ohne es auskäme. Der Abdruck
 * allein sagt nur, DASS etwas abweicht; die Function kann die Zahlen von
 * damals nicht aus ihm zurückrechnen. Erst mit dieser Angabe nennt die
 * Abbruchmeldung, WAS sich geändert hat — und ohne das klickt der Admin auf
 * Vorschau und wieder auf Löschen, ohne hinzusehen.
 */
export async function loeschePerson(
  sb: Sb, personId: string, vorschau: Vorschau, abdruck: string,
  anlass: "selbstauskunft" | "verwaltung" = "verwaltung",
): Promise<LoeschAntwort | LoeschFehler> {
  const raus = await rufe(sb, {
    aktion: "loeschen", person_id: personId, abdruck, anlass,
    zahlen_alt: fingerabdruckDaten(vorschau),
  });
  if (istFehler(raus)) return raus;
  return raus as LoeschAntwort;
}

export function istLoeschFehler(x: unknown): x is LoeschFehler {
  return istFehler(x);
}

/* ═══════════════════════════════════════════════════════════════
   MEHRERE PERSONEN — die Sammelaktion

   ⚠ EIN FINGERABDRUCK PRO PERSON, KEIN GEMEINSAMER. Ein Abdruck über
   den ganzen Stapel bräche bei zwanzig Personen fast sicher (jede
   Änderung an einer trifft alle) und sagte nicht, WELCHE. Mit n
   einzelnen fällt die geänderte heraus und die übrigen laufen — aber
   nicht still: sie erscheint in der Ergebnisliste.

   ⚠ UND DIE FOLGEN FÜR DIE KINDER WERDEN ÜBER DEN STAPEL GERECHNET,
   nicht pro Person. Eine Einzelvorschau sagt `verbleibende_eltern: 1`
   und meint „wenn NUR diese Person fällt". Fallen im selben Stapel
   beide Elternteile, ist das Kind danach ohne — und keine der beiden
   Vorschauen hat das gesehen. Gemessen am 24.08.2026: 389 von 393
   Kindern haben ohnehin nur einen Elternteil, aber eine Datenlage ist
   keine Absicherung.
   ═══════════════════════════════════════════════════════════════ */

/** Eine Person im Stapel, mit dem Ergebnis ihrer eigenen Vorschau. */
export interface StapelEintrag {
  personId: string;
  /** Aus der Liste — nur bis die Vorschau da ist; danach gilt der Name aus der DB. */
  name: string;
  vorschau?: Vorschau;
  abdruck?: string;
  /** Die Vorschau selbst ist fehlgeschlagen. Diese Person kommt nicht mit. */
  fehler?: string;
}

/** Was aus einem Kind wird, wenn der GANZE Stapel faellt. */
export interface StapelKind {
  mitglied_id: number;
  name: string;
  /** Elternteile nach dem Lauf — Gesamtzahl minus die im Stapel. */
  verbleibende_eltern: number;
  /** Wie viele der Ausgewaehlten an diesem Kind haengen. */
  im_stapel: number;
  war_hauptkontakt: boolean;
  /** Aus der Vorschau: aktive Mitgliedschaft mit `hauptkontakt_pflicht`. */
  braucht_kontakt: boolean;
  /** Die Personen im Stapel, die an diesem Kind haengen. */
  eltern: { personId: string; name: string }[];
}

/** Warum eine Person nicht mitlaeuft. */
export type SperrGrund =
  /** ⚠ Aufloesbar: dem Kind einen Ersatzkontakt geben, dann faellt sie weg. */
  | { art: "kind_ohne_kontakt"; kinder: StapelKind[] }
  /** Die Function wuerde ablehnen — Nachrichten, Antworten, Lesemarken. */
  | { art: "blockiert"; text: string }
  /** Die Vorschau selbst ist fehlgeschlagen. */
  | { art: "unlesbar"; text: string };

export interface StapelBefund {
  /** Kinder, an denen mindestens eine ausgewaehlte Person haengt. */
  kinder: StapelKind[];
  /** ⚠ Kinder, die einen Kontakt BRAUCHEN und keinen behielten. Der Auftrag
      an den Menschen, nach KIND gruppiert — nicht nach Person. */
  ohneKontakt: StapelKind[];
  /** Personen, die nichts hindert. */
  loeschbar: StapelEintrag[];
  /** ⚠ GESPERRT, nicht zurueckgestellt. Es gibt kein „Trotzdem". */
  gesperrt: { eintrag: StapelEintrag; grund: SperrGrund }[];
  /** Zeilen ueber alle loeschbaren Personen. */
  zeilen: number;
}

/**
 * Vorschau fuer n Personen — nacheinander, mit Fortschritt.
 *
 * ⚠ NACHEINANDER, nicht parallel: zwanzig gleichzeitige Aufrufe derselben
 * Edge Function sind ein selbstgebauter Lastversuch, und ein abgewiesener
 * Aufruf saehe hier aus wie eine Person ohne Daten.
 */
export async function holeLoeschVorschauMehrere(
  sb: Sb,
  personen: { id: string; name: string }[],
  aufFortschritt?: (fertig: number, gesamt: number) => void,
): Promise<StapelEintrag[]> {
  const raus: StapelEintrag[] = [];
  for (const p of personen) {
    const a = await holeLoeschVorschau(sb, p.id);
    raus.push(istLoeschFehler(a)
      ? { personId: p.id, name: p.name, fehler: a.fehler }
      : { personId: p.id, name: p.name, vorschau: a.vorschau, abdruck: a.abdruck });
    if (aufFortschritt) aufFortschritt(raus.length, personen.length);
  }
  return raus;
}

/**
 * Was der Stapel als Ganzes bedeutet — und wer deshalb gesperrt ist.
 *
 * ⚠ EINE REGEL, KEINE WARNUNG. (Entscheidung Didi, 25.08.2026.)
 * Ein Kind ohne Kontakt zu hinterlassen ist nicht erlaubt; „Trotzdem loeschen"
 * gibt es nicht. Der Grund ist gemessen, nicht gefuehlt: 389 von 393 Kindern
 * haengen an GENAU EINEM Elternteil. Drei zufaellig gewaehlte Eltern ergaben in
 * zwei Proben hintereinander drei gesperrte Personen — „alle gesperrt" ist der
 * Normalfall, nicht die Ausnahme.
 *
 * ⚠ Und DAS ist das Argument gegen eine weiche Sperre: was bei fast jedem
 * Stapel erscheint, wird nach der dritten Anwendung weggeklickt. Eine
 * Rueckfrage und ein „Trotzdem"-Knopf haetten dasselbe Schicksal — die
 * Gewohnheit weicht beide auf. Nur eine Regel haelt.
 *
 * Der Ausweg ist deshalb nicht „bestaetigen", sondern HANDELN: dem Kind einen
 * Ersatzkontakt geben. Das steht in `ohneKontakt` und wird nach KIND
 * gruppiert — ein Kontakt fuer Lea Brunner entsperrt beide Elternteile
 * gleichzeitig. Nach Person gruppiert stuende derselbe Auftrag zweimal da.
 */
export function rechneStapel(eintraege: StapelEintrag[]): StapelBefund {
  /* ── Kinder ueber den ganzen Stapel ────────────────────── */
  const proKind = new Map<number, StapelKind>();
  for (const e of eintraege) {
    if (!e.vorschau) continue;
    for (const k of e.vorschau.kinder) {
      /* `verbleibende_eltern` ist die Sicht der EINZELVORSCHAU: gesamt − 1.
         Jeder weitere Elternteil im Stapel zieht eine weitere ab.

         ⚠ GEMESSEN, WARUM DAS NOETIG IST: Lea Brunner hat zwei Elternteile,
         Petra und Reto Brunner. Stehen beide im Stapel, sagt JEDE der beiden
         Einzelvorschauen „behaelt 1 Elternteil" — keine warnt. Erst diese
         Rechnung ergibt 0. Genau das kann eine Sammelaktion, was n
         Einzelloeschungen nicht koennen. */
      const vorhanden = proKind.get(k.mitglied_id);
      if (vorhanden) {
        vorhanden.im_stapel += 1;
        vorhanden.verbleibende_eltern -= 1;
        vorhanden.war_hauptkontakt = vorhanden.war_hauptkontakt || k.war_hauptkontakt;
        vorhanden.eltern.push({ personId: e.personId, name: e.vorschau.person.name });
      } else {
        proKind.set(k.mitglied_id, {
          mitglied_id: k.mitglied_id,
          name: k.name,
          verbleibende_eltern: k.verbleibende_eltern,
          im_stapel: 1,
          war_hauptkontakt: k.war_hauptkontakt,
          braucht_kontakt: k.braucht_kontakt,
          eltern: [{ personId: e.personId, name: e.vorschau.person.name }],
        });
      }
    }
  }
  const kinder = [...proKind.values()].sort((a, b) => a.verbleibende_eltern - b.verbleibende_eltern);

  /* ⚠ BEIDE BEDINGUNGEN. `verbleibende_eltern === 0` allein sperrte auch dort,
     wo es das Ziel ist: ein ausgetretenes Kind SOLL niemanden mehr erreichbar
     haben. Im Bestand betrifft das zwei (Andrea Furrer, Andrea Frei), deren
     Elternteile sonst dauerhaft unloeschbar waeren. */
  const ohneKontakt = kinder.filter(k => k.braucht_kontakt && k.verbleibende_eltern === 0);

  const sperrtWegen = new Map<string, StapelKind[]>();
  for (const k of ohneKontakt) {
    for (const p of k.eltern) {
      const liste = sperrtWegen.get(p.personId) ?? [];
      liste.push(k);
      sperrtWegen.set(p.personId, liste);
    }
  }

  const loeschbar: StapelEintrag[] = [];
  const gesperrt: { eintrag: StapelEintrag; grund: SperrGrund }[] = [];

  for (const e of eintraege) {
    if (e.fehler || !e.vorschau) {
      gesperrt.push({ eintrag: e, grund: { art: "unlesbar", text: e.fehler || "Vorschau nicht lesbar" } });
      continue;
    }
    /* ⚠ Blockierte fallen VOR dem Start heraus, benannt. Ein Abbruch mitten
       im Lauf, den die Vorschau schon kannte, ist der schlechteste von allen. */
    if (e.vorschau.blockiert.length > 0) {
      gesperrt.push({ eintrag: e, grund: { art: "blockiert",
        text: e.vorschau.blockiert.map(b => `${b.tabelle} (${b.anzahl})`).join(", ") } });
      continue;
    }
    const betroffen = sperrtWegen.get(e.personId);
    if (betroffen && betroffen.length > 0) {
      gesperrt.push({ eintrag: e, grund: { art: "kind_ohne_kontakt", kinder: betroffen } });
      continue;
    }
    loeschbar.push(e);
  }

  const zeilen = loeschbar.reduce(
    (s, e) => s + (e.vorschau?.faellt.reduce((t, p) => t + p.anzahl, 0) ?? 0), 0);

  return { kinder, ohneKontakt, loeschbar, gesperrt, zeilen };
}

/** Wie ein einzelner Lauf im Stapel ausging. */
export interface StapelErgebnis {
  personId: string;
  name: string;
  stand: "geloescht" | "uebersprungen" | "fehlgeschlagen";
  meldung?: string;
}
