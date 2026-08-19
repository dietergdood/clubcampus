/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/feldkonfig.ts

   Was ein Mitgliedtyp hat. Einzige Quelle dafür, welche Felder,
   Bereiche und Profil-Tabs es bei einem Mitgliedtyp überhaupt gibt
   und welche davon ausgefüllt sein müssen.

   Vorher lag das an vier Stellen verstreut: `mitgliedtyp_pflichtfelder`
   (Pflicht ja/nein), `rolle_pflichtfelder` (dasselbe pro Portalrolle),
   `getFieldVisibility()` in memberUtils (acht Zeilen über ein
   Rollen-Level) und InfoTab selbst (`fv.showPass`, `fv.showFairgateId`,
   `fv.showNotizen`, `istSupporter`).

   DREI WERTE STATT EINES HÄKCHENS:
     pflicht     wird gezeigt, wird verlangt
     freiwillig  wird gezeigt, darf leer bleiben
     aus         gibt es nicht — verschwindet aus Profil, Neuanlage
                 und Datenprüfung, AUCH für die Verwaltung

   EINE FEHLENDE ZEILE BEDEUTET "freiwillig". Gespeichert wird nur die
   Abweichung. Das ist kein Kompromiss, sondern exakt das bisherige
   Verhalten: es gab nie eine Rückfallliste, ohne Zeile war nichts
   Pflicht — und angezeigt wurde ohnehin alles. Ein neuer Mitgliedtyp
   braucht dadurch keine einzige Zeile und zeigt trotzdem ein
   vollständiges Profil. Wer etwas verbergen will, sucht danach; wer
   etwas vermisst, sucht nicht.

   NICHT ZU VERWECHSELN mit `getFieldVisibility(role)`: das beantwortet
   "wer sieht was bei ANDEREN" und meint die Rolle des Betrachters.
   Diese Datei beantwortet "was gibt es bei diesem Mitgliedtyp". Beides
   gilt gleichzeitig, und `aus` gewinnt gegen jede Rolle — siehe
   `kombiniereMitRolle()`.
   ═══════════════════════════════════════════════════════════════ */
import { FELD_LABEL } from "./memberService.ts";

/* ─── Werte ─────────────────────────────────────────────────────── */

export const MODI = ["pflicht", "freiwillig", "aus"] as const;
export type FeldModus = (typeof MODI)[number];

export const MODUS_LABEL: Record<FeldModus, string> = {
  pflicht: "Pflicht",
  freiwillig: "Freiwillig",
  aus: "Gibt es nicht",
};

/** Eine Zeile aus `mitgliedtyp_feldkonfig`, angereichert um den Namen des
    Mitgliedtyps. Den Namen hängt der Service über den Join an
    (`select("*, mitgliedtypen(name)")`) — in der Datenbank steht die
    Beziehung über `mitgliedtyp_id`, damit eine Umbenennung die Zeilen
    nicht mehr verwaisen lässt. Genau daran sind am 19.08.2026 siebzehn
    Zeilen der Vorgängertabelle hängengeblieben. */
export interface FeldkonfigZeile {
  mitgliedtyp_id: string;
  /** Name des Mitgliedtyps, vom Service aus dem Join flachgezogen. */
  mitgliedtyp: string;
  schluessel: string;
  modus: FeldModus;
}

/* ─── Bereiche ──────────────────────────────────────────────────── */

export interface Bereich {
  key: string;
  label: string;
  icon: string;
}

export const BEREICHE: Bereich[] = [
  { key: "personalien",  label: "Personalien",       icon: "id-badge-2" },
  { key: "kontakt",      label: "Kontakt",           icon: "address-book" },
  { key: "vereinsdaten", label: "Vereinsdaten",      icon: "building-community" },
  { key: "teams",        label: "Teams",             icon: "ball-football" },
  { key: "funktionen",   label: "Vereinsfunktionen", icon: "heart-handshake" },
  { key: "notizen",      label: "Notizen",           icon: "notes" },
  { key: "tabs",         label: "Tabs im Profil",    icon: "layout-grid" },
];

/* ─── Registry ──────────────────────────────────────────────────── */

export interface RegistryEintrag {
  schluessel: string;
  bereich: string;
  /** Nur setzen, wenn FELD_LABEL den Schlüssel nicht kennt (Bereiche, Tabs). */
  label?: string;
  /** Welche Werte für diesen Schlüssel wählbar sind. Leer = fest, kein
      Bedienelement (vorname/nachname sind in `mitglieder` NOT NULL). */
  modi: readonly FeldModus[];
  /** Teil des Adressblocks — siehe ADRESS_FELDER. */
  adresse?: boolean;
  hinweis?: string;
}

const ALLE: readonly FeldModus[] = MODI;
/* Ein Bereich oder ein Tab kann nicht "Pflicht" sein: es gibt nichts
   auszufüllen. Nur da oder nicht da. */
const AN_AUS: readonly FeldModus[] = ["freiwillig", "aus"];
const FEST: readonly FeldModus[] = [];

/* Strasse, PLZ, Ort und Kanton hängen aneinander: usePlzLookup füllt aus
   der PLZ Ort und Kanton, applySuggestion füllt alle vier
   (shared/person/PersonKontakt.tsx). Einzeln abschaltbar wäre das ein
   Formular, das sich selbst die Eingabe wegnimmt.

   Deshalb: Pflicht/Freiwillig einzeln — hier unterscheiden sich Vereine
   tatsächlich —, "Gibt es nicht" nur für den Block als Ganzes. Die
   Oberfläche erzwingt das; gespeichert werden weiterhin vier Zeilen,
   damit die Speicherform flach bleibt.

   ⚠ Wer das lockert, nimmt dem PLZ-Lookup die Eingabe. */
export const ADRESS_FELDER = ["strasse", "plz", "ort", "kanton"] as const;

export const FELD_REGISTRY: readonly RegistryEintrag[] = [
  /* Personalien */
  { schluessel: "vorname",        bereich: "personalien",  modi: FEST,
    hinweis: "In der Datenbank NOT NULL — immer Pflicht." },
  { schluessel: "nachname",       bereich: "personalien",  modi: FEST,
    hinweis: "In der Datenbank NOT NULL — immer Pflicht." },
  { schluessel: "geburtsdatum",   bereich: "personalien",  modi: ALLE },
  { schluessel: "geschlecht",     bereich: "personalien",  modi: ALLE },
  { schluessel: "nationalitaet",  bereich: "personalien",  modi: ALLE },
  { schluessel: "nationalitaet2", bereich: "personalien",  modi: ALLE },
  { schluessel: "heimatort",      bereich: "personalien",  modi: ALLE },
  { schluessel: "ahv_nr",         bereich: "personalien",  modi: ALLE },

  /* Kontakt */
  { schluessel: "email",          bereich: "kontakt",      modi: ALLE },
  { schluessel: "telefon",        bereich: "kontakt",      modi: ALLE },
  { schluessel: "strasse",        bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "plz",            bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "ort",            bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "kanton",         bereich: "kontakt",      modi: ALLE, adresse: true },

  /* Vereinsdaten */
  { schluessel: "mitgliedtyp",    bereich: "vereinsdaten", modi: AN_AUS },
  { schluessel: "eintrittsdatum", bereich: "vereinsdaten", modi: ALLE },
  { schluessel: "spielerpass",    bereich: "vereinsdaten", modi: ALLE },
  { schluessel: "js_nr",          bereich: "vereinsdaten", modi: ALLE },
  { schluessel: "fairgate_id",    bereich: "vereinsdaten", modi: ALLE,
    hinweis: "Schreibt der Fairgate-Sync, nicht der Mensch — als Pflicht nur sinnvoll, wenn jedes Mitglied synchronisiert ist." },

  /* Bereiche ohne Einzelfelder */
  { schluessel: "teams",          bereich: "teams",        modi: AN_AUS },
  { schluessel: "funktionen",     bereich: "funktionen",   modi: AN_AUS },
  { schluessel: "notizen",        bereich: "notizen",      modi: AN_AUS,
    label: "Notizen" },

  /* Profil-Tabs. "Profil" fehlt bewusst: ohne ihn bliebe nichts. */
  { schluessel: "tab_eltern",        bereich: "tabs", modi: AN_AUS, label: "Eltern" },
  { schluessel: "tab_stats",         bereich: "tabs", modi: AN_AUS, label: "Statistik" },
  { schluessel: "tab_portal",        bereich: "tabs", modi: AN_AUS, label: "Portal-Zugang" },
  { schluessel: "tab_datenpruefung", bereich: "tabs", modi: AN_AUS, label: "Datenprüfung" },
  { schluessel: "tab_verlauf",       bereich: "tabs", modi: AN_AUS, label: "Verlauf" },
];

/** Beschriftung eines Schlüssels. FELD_LABEL bleibt die Quelle für alles,
    was es dort gibt — sonst hiesse dasselbe Feld in der Änderungshistorie
    anders als in der Konfiguration. */
export function labelFuer(schluessel: string): string {
  const e = FELD_REGISTRY.find(r => r.schluessel === schluessel);
  return e?.label ?? FELD_LABEL[schluessel] ?? schluessel;
}

export function eintraegeFuerBereich(bereich: string): RegistryEintrag[] {
  return FELD_REGISTRY.filter(e => e.bereich === bereich);
}

/** Fest verdrahtete Pflichtfelder — in `mitglieder` NOT NULL. Sie stehen
    in der Registry mit `modi: []` und bekommen kein Bedienelement: ein
    Häkchen, das sich nicht wegnehmen lässt, wäre eine Lüge in der
    Oberfläche. Wortgleich mit IMMER_PFLICHT in pflichtfelder.ts. */
export const IMMER_PFLICHT_KEYS = FELD_REGISTRY
  .filter(e => e.modi.length === 0)
  .map(e => e.schluessel);

/* ─── Auswertung ────────────────────────────────────────────────── */

/** Modus je Schlüssel für einen Mitgliedtyp. Was nicht gespeichert ist,
    ist "freiwillig" — siehe Dateikopf. Ohne Mitgliedtyp gilt dasselbe:
    ein unbekannter Typ darf nichts ausblenden und nichts verlangen. */
export function getFeldkonfig(
  mitgliedtyp: string | null | undefined,
  zeilen: readonly FeldkonfigZeile[],
): Record<string, FeldModus> {
  const konfig: Record<string, FeldModus> = {};
  for (const e of FELD_REGISTRY) konfig[e.schluessel] = "freiwillig";
  if (!mitgliedtyp) return konfig;

  for (const z of zeilen) {
    if (z.mitgliedtyp !== mitgliedtyp) continue;
    /* Unbekannte Schlüssel bewusst übernehmen statt verschlucken: sie
       fallen sonst erst auf, wenn jemand sie sucht. Die Oberfläche zeigt
       nur, was in der Registry steht — hier zählt die Wahrheit der DB. */
    konfig[z.schluessel] = z.modus;
  }
  return konfig;
}

export function istSichtbar(konfig: Record<string, FeldModus>, schluessel: string): boolean {
  if (IMMER_PFLICHT_KEYS.includes(schluessel)) return true;
  return konfig[schluessel] !== "aus";
}

export function istPflicht(konfig: Record<string, FeldModus>, schluessel: string): boolean {
  if (IMMER_PFLICHT_KEYS.includes(schluessel)) return true;
  return konfig[schluessel] === "pflicht";
}

/** True, solange mindestens ein Eintrag des Bereichs sichtbar ist. Eine
    Karte, deren Felder alle auf "aus" stehen, darf ihre leere Hülle nicht
    rendern — sonst bliebe beim Gönner eine Karte "Vereinsdaten" stehen,
    wo heute keine ist. */
export function istBereichSichtbar(konfig: Record<string, FeldModus>, bereich: string): boolean {
  return eintraegeFuerBereich(bereich).some(e => istSichtbar(konfig, e.schluessel));
}

/** Die Pflichtfelder eines Mitgliedtyps, ohne die immer geltenden.
    Reihenfolge = Reihenfolge der Registry, damit eine Fehlermeldung im
    Formular nicht von der Zeilenreihenfolge der Datenbank abhängt. */
export function pflichtfelderAus(konfig: Record<string, FeldModus>): string[] {
  return FELD_REGISTRY
    .filter(e => e.modi.length > 0 && konfig[e.schluessel] === "pflicht")
    .map(e => e.schluessel);
}

/** Verknüpft die Mitgliedtyp-Konfiguration mit der Rollen-Sichtbarkeit.
    Die Reihenfolge ist die Aussage: **"Gibt es nicht" gewinnt gegen jede
    Rolle, auch gegen die Verwaltung.** Andersherum wäre der Wert nicht
    das, was sein Name sagt. */
export function kombiniereMitRolle(
  konfig: Record<string, FeldModus>,
  darfRolleSehen: boolean,
  schluessel: string,
): boolean {
  return istSichtbar(konfig, schluessel) && darfRolleSehen;
}
