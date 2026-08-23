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

/** Was aus einem Kind wird, wenn der GANZE Stapel fällt. */
export interface StapelKind {
  mitglied_id: number;
  name: string;
  /** Elternteile nach dem Lauf — Gesamtzahl minus die im Stapel. */
  verbleibende_eltern: number;
  /** Wie viele der Ausgewählten an diesem Kind hängen. */
  im_stapel: number;
  war_hauptkontakt: boolean;
  /** Die Personen im Stapel, die an diesem Kind hängen. */
  eltern: { personId: string; name: string }[];
}

export interface StapelBefund {
  /** Kinder, an denen mindestens eine ausgewählte Person hängt. */
  kinder: StapelKind[];
  /** Personen, die nichts hindert. */
  loeschbar: StapelEintrag[];
  /** ⚠ Zurückgestellt statt blockiert — sie lassen sich einzeln dazunehmen. */
  zurueckgestellt: { eintrag: StapelEintrag; grund: string }[];
  /** Zeilen über alle löschbaren Personen. */
  zeilen: number;
}

/**
 * Vorschau für n Personen — nacheinander, mit Fortschritt.
 *
 * ⚠ NACHEINANDER, nicht parallel: zwanzig gleichzeitige Aufrufe derselben
 * Edge Function sind ein selbstgebauter Lastversuch, und ein abgewiesener
 * Aufruf sähe hier aus wie eine Person ohne Daten.
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
 * Was der Stapel als Ganzes bedeutet — und wer deshalb zurückgestellt wird.
 *
 * ⚠ ZURÜCKGESTELLT IST NICHT DASSELBE WIE BLOCKIERT. Blockiert heisst: die
 * Function würde es ablehnen. Zurückgestellt heisst: sie täte es, aber
 * jemand soll es einzeln entscheiden. Beide stehen in derselben Liste, mit
 * verschiedenem Grund — und die zurückgestellten lassen sich dazunehmen.
 */
export function rechneStapel(
  eintraege: StapelEintrag[],
  dazugenommen: Set<string> = new Set(),
): StapelBefund {
  /* ── Kinder über den ganzen Stapel ──────────────────────────────── */
  const proKind = new Map<number, StapelKind>();
  for (const e of eintraege) {
    if (!e.vorschau) continue;
    for (const k of e.vorschau.kinder) {
      /* `verbleibende_eltern` ist die Sicht der EINZELVORSCHAU: gesamt − 1.
         Daraus die Gesamtzahl zurückrechnen und die Stapelgrösse abziehen. */
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
          eltern: [{ personId: e.personId, name: e.vorschau.person.name }],
        });
      }
    }
  }
  const kinder = [...proKind.values()].sort((a, b) => a.verbleibende_eltern - b.verbleibende_eltern);

  /* Personen, deren Löschung ein Kind ohne jeden Elternteil liesse. */
  const heikel = new Map<string, string>();
  for (const k of kinder) {
    if (k.verbleibende_eltern > 0) continue;
    for (const p of k.eltern) {
      heikel.set(p.personId, `${k.name} bliebe danach ohne Elternteil`);
    }
  }

  const loeschbar: StapelEintrag[] = [];
  const zurueckgestellt: { eintrag: StapelEintrag; grund: string }[] = [];

  for (const e of eintraege) {
    if (e.fehler || !e.vorschau) {
      zurueckgestellt.push({ eintrag: e, grund: e.fehler || "Vorschau nicht lesbar" });
      continue;
    }
    /* ⚠ PUNKT 4: blockierte Personen fallen VOR dem Start heraus, benannt.
       Ein Abbruch mitten im Lauf, den die Vorschau schon kannte, ist der
       schlechteste von allen — vier sind dann weg, fünfzehn stehen, und der
       Grund stand die ganze Zeit auf dem Schirm. */
    if (e.vorschau.blockiert.length > 0) {
      zurueckgestellt.push({
        eintrag: e,
        grund: "blockiert: " + e.vorschau.blockiert.map(b => `${b.tabelle} (${b.anzahl})`).join(", "),
      });
      continue;
    }
    const grund = heikel.get(e.personId);
    if (grund && !dazugenommen.has(e.personId)) {
      zurueckgestellt.push({ eintrag: e, grund });
      continue;
    }
    loeschbar.push(e);
  }

  const zeilen = loeschbar.reduce(
    (s, e) => s + (e.vorschau?.faellt.reduce((t, p) => t + p.anzahl, 0) ?? 0), 0);

  return { kinder, loeschbar, zurueckgestellt, zeilen };
}

/** Wie ein einzelner Lauf im Stapel ausging. */
export interface StapelErgebnis {
  personId: string;
  name: string;
  stand: "geloescht" | "uebersprungen" | "fehlgeschlagen";
  meldung?: string;
}
