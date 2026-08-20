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
  /** Gesetzt, wenn die Zeile einem MITGLIEDTYP gilt — sonst null. */
  mitgliedtyp_id: string | null;
  /** Name des Mitgliedtyps, vom Service aus dem Join flachgezogen. Leer,
      wenn die Zeile einer Personenart gilt. */
  mitgliedtyp: string;
  /** Gesetzt, wenn die Zeile einer PERSONENART gilt — sonst null.
      Genau eines von beiden ist gesetzt (CHECK in der Datenbank). */
  art_id: string | null;
  /** Name der Personenart, aus dem Join. Leer bei einem Mitgliedtyp. */
  art: string;
  schluessel: string;
  modus: FeldModus;
}

/* ─── Die Achse ─────────────────────────────────────────────────────────
   Bis zum 21.08.2026 ein fester Wert `ohne_mitgliedschaft` — EIN Feldsatz
   fuer 394 Elternteile und 7 Supporter. Vom Elternteil will der Verein aber
   mehr wissen als vom Goenner.

   Seit dem 20.08.2026 ist es ein Verweis in `personenarten` (Migration
   `migration_personenarten.sql`). `gilt_fuer` ist ersatzlos gefallen: welche
   Achse gilt, steht in den Daten selbst — genau eine der beiden Id-Spalten
   ist gesetzt, und die Datenbank haelt das mit
   `CHECK (num_nonnulls(mitgliedtyp_id, art_id) = 1)` fest. Eine dritte
   Spalte waere dieselbe Aussage an einem zweiten Ort. */

/**
 * Wofuer eine Konfiguration gelesen wird.
 *
 * ⚠ VIER FAELLE, NICHT ZWEI.
 *
 *   mitgliedtyp mit Namen    der Normalfall
 *   mitgliedtyp OHNE Namen   `mitglieder.mitgliedtyp` ist nullable — ein
 *                            Datenloch, NICHT dasselbe wie „keine
 *                            Mitgliedschaft". Faellt auf „alles freiwillig".
 *   personenart mit Id       Elternteil, Supporter, Ehemalige …
 *   personenart OHNE Id      eine Person ohne Mitgliedschaft und ohne Art.
 *                            Bekommt den strukturellen Standard: die zehn
 *                            `nur_mitgliedschaft`-Schluessel `aus`, sonst
 *                            freiwillig.
 *
 * Ein blosser String ist damit ein Typfehler, und jede Aufrufstelle muss
 * sagen, welcher Fall bei ihr gilt.
 */
export type KonfigZiel =
  | { achse: "mitgliedtyp"; mitgliedtyp: string | null }
  | { achse: "personenart"; artId: string | null };

/**
 * Wofuer geschrieben wird — immer ueber die ID.
 *
 * Zwei fast gleiche Typen sind sonst ein Warnzeichen (CLAUDE.md, die vier
 * Kaderrollen-Typen). Hier tragen sie verschiedene Daten: beim Mitgliedtyp
 * wird ueber den NAMEN gelesen, weil die Aufrufstellen nur ihn haben
 * (`raw.mitgliedtyp` ist Text), und ueber die ID geschrieben. Bei der
 * Personenart ist es beide Male die ID — die Aufrufstellen bekommen sie aus
 * `personenarten_effektiv`, und ein Name als Schluessel verwaist beim
 * Umbenennen.
 */
export type KonfigZielSchreiben =
  | { achse: "mitgliedtyp"; mitgliedtypId: string }
  | { achse: "personenart"; artId: string };

/** Bequemer Weg zum haeufigen Fall. `null` bleibt `null` — siehe KonfigZiel. */
export function fuerMitgliedtyp(name: string | null | undefined): KonfigZiel {
  return { achse: "mitgliedtyp", mitgliedtyp: name ?? null };
}

/**
 * Eine Person ohne Mitgliedschaft.
 *
 * ⚠ `null` ist ein gueltiges Argument und heisst „hat keine Art" — nicht
 * „unbekannt". Das ersetzt die fruehere Konstante `OHNE_MITGLIEDSCHAFT`,
 * die fuer alle 401 dasselbe bedeutete.
 */
export function fuerPersonenart(artId: string | null | undefined): KonfigZiel {
  return { achse: "personenart", artId: artId ?? null };
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
  /**
   * Haengt an einer Mitgliedschaft. Erscheint in der Spalte „Ohne
   * Mitgliedschaft" gar nicht und ist dort strukturell `aus`.
   *
   * ⚠ Das Merkmal wirkt in der AUSWERTUNG (`getFeldkonfig`), nicht nur in der
   * Oberflaeche. Nur so brauchen diese Schluessel keine Seed-Zeile und koennen
   * nicht falsch gestellt werden — als Schalter koennte die Verwaltung sie auf
   * „Pflicht" setzen und erzeugte eine Anforderung, die niemand je erfuellen
   * kann. Genau der Fehler, den `rolle_pflichtfelder` gekostet hat.
   */
  nur_mitgliedschaft?: true;
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
  { schluessel: "ahv_nr",         bereich: "personalien",  modi: ALLE,
    hinweis: "Wird für die J+S-Abrechnung gebraucht. Ohne Spielbetrieb gibt es keinen Zweck — bei Personen ohne Mitgliedschaft deshalb als Startwert auf Gibt-es-nicht. Der Hinweis informiert, er wirkt nicht: ein Klick dreht es um." },

  /* Kontakt */
  { schluessel: "email",          bereich: "kontakt",      modi: ALLE },
  { schluessel: "telefon",        bereich: "kontakt",      modi: ALLE },
  { schluessel: "strasse",        bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "plz",            bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "ort",            bereich: "kontakt",      modi: ALLE, adresse: true },
  { schluessel: "kanton",         bereich: "kontakt",      modi: ALLE, adresse: true },

  /* Vereinsdaten */
  { schluessel: "mitgliedtyp",    bereich: "vereinsdaten", modi: AN_AUS, nur_mitgliedschaft: true },
  { schluessel: "eintrittsdatum", bereich: "vereinsdaten", modi: ALLE, nur_mitgliedschaft: true },
  { schluessel: "spielerpass",    bereich: "vereinsdaten", modi: ALLE, nur_mitgliedschaft: true },
  { schluessel: "js_nr",          bereich: "vereinsdaten", modi: ALLE, nur_mitgliedschaft: true },
  { schluessel: "fairgate_id",    bereich: "vereinsdaten", modi: ALLE, nur_mitgliedschaft: true,
    hinweis: "Schreibt der Fairgate-Sync, nicht der Mensch — als Pflicht nur sinnvoll, wenn jedes Mitglied synchronisiert ist." },

  /* Bereiche ohne Einzelfelder */
  { schluessel: "teams",          bereich: "teams",        modi: AN_AUS, nur_mitgliedschaft: true },
  { schluessel: "funktionen",     bereich: "funktionen",   modi: AN_AUS },
  /* ⚠ Kein `nur_mitgliedschaft` mehr (21.08.2026). Notizen hingen daran, weil
     `mitglieder_notizen.mitglied_id` NOT NULL war — eine technische Grenze,
     als fachliche Regel behandelt. Seit `migration_verlauf_person.sql` haengt
     die Notiz an der Person. */
  { schluessel: "notizen",        bereich: "notizen",      modi: AN_AUS,
    label: "Notizen" },

  /* Profil-Tabs. "Profil" fehlt bewusst: ohne ihn bliebe nichts. */
  { schluessel: "tab_eltern",        bereich: "tabs", modi: AN_AUS, label: "Eltern", nur_mitgliedschaft: true },
  { schluessel: "tab_stats",         bereich: "tabs", modi: AN_AUS, label: "Statistik", nur_mitgliedschaft: true },
  { schluessel: "tab_portal",        bereich: "tabs", modi: AN_AUS, label: "Portal-Zugang" },
  { schluessel: "tab_datenpruefung", bereich: "tabs", modi: AN_AUS, label: "Datenprüfung" },
  /* ⚠ Ebenfalls frei seit dem 21.08.2026. Notizen an der Person und den
     Verlauf weiterhin an der Mitgliedschaft waere auf derselben Seite ein
     Widerspruch. */
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

/** Gilt dieser Registry-Eintrag für dieses Ziel? Bei „ohne Mitgliedschaft"
    fallen die Schlüssel weg, die an einer Mitgliedschaft hängen. Die
    Oberfläche filtert damit ihre Spalte. */
export function giltFuerZiel(e: RegistryEintrag, ziel: KonfigZiel): boolean {
  return !(ziel.achse === "personenart" && e.nur_mitgliedschaft);
}

/**
 * Modus je Schlüssel für ein Ziel. Was nicht gespeichert ist, ist
 * "freiwillig" — siehe Dateikopf.
 *
 * Drei Verhalten, und die Unterscheidung ist der Zweck von `KonfigZiel`:
 *
 *   Mitgliedtyp bekannt   Zeilen dieses Typs gewinnen
 *   Mitgliedtyp NULL      alles freiwillig — Datenloch, kein Sonderfall
 *   ohne Mitgliedschaft   `nur_mitgliedschaft`-Schlüssel sind `aus`,
 *                         dazu die Zeilen mit `gilt_fuer = ohne_mitgliedschaft`
 *
 * ⚠ Gefiltert wird ZUERST über `gilt_fuer`, dann über den Namen. Andersherum
 * fielen die neuen Zeilen lautlos durch: ihr `mitgliedtyp` ist leer und
 * trifft keinen Vergleich.
 */
export function getFeldkonfig(
  ziel: KonfigZiel,
  zeilen: readonly FeldkonfigZeile[],
): Record<string, FeldModus> {
  const ohne = ziel.achse === "personenart";

  const konfig: Record<string, FeldModus> = {};
  for (const e of FELD_REGISTRY) {
    /* Strukturell `aus` statt bloss unsichtbar in der Oberfläche: sonst
       bräuchten die zehn eine Seed-Zeile, und ein Direktzugriff hätte sie
       wieder sichtbar. */
    konfig[e.schluessel] = ohne && e.nur_mitgliedschaft ? "aus" : "freiwillig";
  }

  /* Ohne Kennung gibt es nichts zu suchen: ein Mitgliedtyp ohne Namen ist ein
     Datenloch, eine Person ohne Art hat schlicht keine. Beide behalten den
     strukturellen Standard von oben. */
  if (ohne ? !ziel.artId : !ziel.mitgliedtyp) return konfig;

  for (const z of zeilen) {
    /* ⚠ ZUERST die Achse, dann die Kennung. Andersherum fielen die Zeilen
       einer Personenart lautlos durch: ihr `mitgliedtyp` ist leer und traefe
       keinen Namensvergleich. */
    if (ohne ? z.art_id !== ziel.artId : z.mitgliedtyp_id === null) continue;
    if (!ohne && z.mitgliedtyp !== ziel.mitgliedtyp) continue;
    /* Ein Schlüssel, der an einer Mitgliedschaft hängt, bleibt auch dann
       `aus`, wenn eine Altzeile etwas anderes behauptet — die Registry ist
       hier die Wahrheit, nicht die Datenbank. */
    if (ohne && FELD_REGISTRY.find(e => e.schluessel === z.schluessel)?.nur_mitgliedschaft) continue;
    /* Unbekannte Schlüssel bewusst übernehmen statt verschlucken: sie
       fallen sonst erst auf, wenn jemand sie sucht. Die Oberfläche zeigt
       nur, was in der Registry steht — hier zählt die Wahrheit der DB. */
    konfig[z.schluessel] = z.modus;
  }
  return konfig;
}

/**
 * Die Pflichtfeld-SCHLUESSEL eines Ziels — die eine Quelle.
 *
 * ⚠ Es gab sie zweimal: `getProfilCheck.pflichtfelderFuer()` fuer die
 * Mitglieder-Maske, und die Eltern-Maske haette sich am 20.08.2026 eine
 * zweite gebaut. Zwei Listen, die dasselbe behaupten, laufen auseinander —
 * und dann sperrt die Maske ein Feld, das der Hinweis nicht nennt. Dieselbe
 * Lehre wie bei `rolle_pflichtfelder` und bei `hat_portal_zugang`: eine
 * Aussage, ein Ort.
 *
 * `IMMER_PFLICHT_KEYS` steht mit drin, weil `vorname`/`nachname` in
 * `mitglieder` NOT NULL sind und in keiner Matrix auftauchen.
 */
export function pflichtfelderFuerZiel(
  ziel: KonfigZiel,
  zeilen: readonly FeldkonfigZeile[],
): string[] {
  return [...IMMER_PFLICHT_KEYS, ...pflichtfelderAus(getFeldkonfig(ziel, zeilen))];
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
