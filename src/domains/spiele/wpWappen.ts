/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpWappen.ts

   Die Vereinswappen der Gegner für den WordPress-Export: entscheiden,
   WELCHE hinausgehen, und die Antwort der Gegenstelle lesen. Reine
   Logik — kein HTTP, kein Storage, keine Datenbank.

   Sie liegt hier und nicht in der Edge Function, aus demselben Grund
   wie `wpNutzlast.ts`: `tsc` liest eine Edge Function nicht, und vitest
   kann sie nicht importieren. Was dort entschieden würde, prüfte
   niemand.

   ── DER VERTRAG ─────────────────────────────────────────────────
   Die Gegenstelle bekommt eine Aktion `wappen` mit Einträgen

     { sfv_team_id: "38301", sha256: "…", mime: "image/gif", daten: "…" }

   ⚠ `sfv_team_id` als TEXT, `daten` als base64. Höchstens
   WAPPEN_PRO_PAKET Einträge je Aufruf. Sie antwortet mit
   `angelegt · ersetzt · unveraendert · fehler`.

   Ihre Aktion `bestand` meldet je Team `sfv_team_id` und `sha256` —
   daran erkennt dieser Lauf, was drüben schon liegt.

   ⚠ ⚠  DIE KOSTENRECHNUNG RUHT AUF EINER FREMDEN ZEILE, UND ZWAR AUF
   DIESER:

     supabase/functions/sfv-sync/logos.ts, offeneLogos():
       if (z.pfad) continue;          // liegt schon

   Ein Wappen, das im Bucket liegt, wird vom SFV-Sync **nie wieder
   geholt**. Also kann sich sein Inhalt nicht ändern. Also darf dieser
   Lauf jedes Wappen überspringen, dessen Nummer die Gegenstelle schon
   führt — **ohne die Bytes zu laden**. Das spart bei 219 Wappen 219
   Storage-Abrufe je Lauf, viermal die Stunde, für Daten, die sich nie
   bewegen.

   ⚠ Und genau deshalb ist es gefährlich: **sobald jemand Wappen
   auffrischbar macht, wird diese Regel still falsch.** Drüben bliebe
   das alte Bild stehen, und nichts schlüge fehl. Das ist die Bauart
   „ein Kommentar, der eine ANDERE Stelle zusichert", und dieses
   Projekt hat sie ein Dutzend Mal bezahlt.

   **Deshalb gehört dazu ein Fall, der die fremde Zeile festnagelt** —
   siehe ABHAENGIGKEIT unten. Der Kommentar hier ist keine Prüfung.

   ⚠ Was daraus folgt: „geändert" ist heute strukturell unerreichbar.
   Der Hash geht trotzdem mit — die Gegenstelle braucht ihn für ihr
   eigenes `unveraendert`. Und `ersetzt > 0` in ihrer Antwort wäre ein
   BEFUND: wir senden nichts, das sie kennt, also kann sie nichts
   ersetzen. Steht dort eine Zahl, widersprechen ihr Bestand und ihr
   Ablageort einander.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Höchstens so viele Einträge je Aufruf — der Vertrag mit der
 * Gegenstelle, nicht unsere Wahl.
 *
 * ⚠ Ein Wappen ist ein 80×80-Bild, base64 also wenige Kilobyte; zwanzig
 * davon sind kein Gewicht. Die Grenze steht drüben, weil PHP ein
 * Zeitlimit hat und jedes Bild geschrieben werden muss.
 */
export const WAPPEN_PRO_PAKET = 20;

/**
 * Wie lange ein Lauf hoechstens fuer die Wappen aufwenden darf, gemessen
 * vom Beginn des GANZEN Laufs.
 *
 * ⚠ ⚠  DIE GRENZE, DIE ES GIBT, IST NICHT UNSERE: das Gateway von Supabase
 * bricht eine Anfrage nach **150 Sekunden** ab
 * (`{"code":"IDLE_TIMEOUT","message":"Request idle timeout limit (150s)
 * reached"}`, gemessen am 24.09.2026 beim ersten Lauf, der alle Wappen
 * senden musste).
 *
 * ⚠ **Wie viele es sind, ist ein bewegtes Ziel, und deshalb steht hier
 * keine Zahl als Konstante.** Am 23.09.2026 waren es 219 (so steht es
 * oben und in den Tests), am 24.09.2026 nennt Didi 223 — beide waren zu
 * ihrer Zeit richtig, und mit jedem neuen Gegner kommt eines dazu. Eine
 * Stueckzahl im Code waere damit von Anfang an veraltet; genau das ist
 * der zweite Grund fuer ein Budget.
 *
 * Der Browser bekam dabei **keine Antwort** — und damit auch keines der
 * Felder, an denen die Gegenseite ihren Empfaenger prueft. ⚠ Die
 * Protokollzeile stand zwar schon da (`status: "laeuft"`, geschrieben VOR
 * dem Lauf), aber ihr Ergebnis fehlte: wird die Function beim Abbruch
 * getoetet, kommt das `update` am Ende nie.
 *
 * **Ein Zeitbudget und keine Stueckzahl.** Eine Stueckzahl waere genau
 * die Schwelle, die dieses Papier als „nie durch einen Test gedeckt"
 * fuehrt — und sie muesste jedes Mal neu geraten werden, wenn ein Wappen
 * dazukommt. Ein Budget misst, was die Grenze wirklich meint: Zeit.
 *
 * ⚠ ⚠  HIER STAND „und der Grund ist gemessen: der teure Teil ist nicht
 * das Senden, sondern das LADEN". **Das war nicht gemessen**, und ein
 * Subagent hat es am 24.09.2026 widerlegt: es gibt keine Zeitnahme im
 * Ladeteil — anders als bei den Spielen, wo `dauer_ms` je Mannschaft
 * steht. Die Aufteilung ist PLAUSIBEL (223 Downloads gegen 12 POSTs, und
 * das Laden laeuft vollstaendig vor dem ersten Paket), aber sie ist ein
 * Schluss und keine Beobachtung.
 *
 * ⚠ Fuer die Wahl des Budgets ist das folgenlos — es greift an BEIDEN
 * Schleifen, gleich welche die teure ist. Fuer die Frage, wie gross es
 * sein muss, ist es offen: **solange niemand die Zeit je Download
 * gemessen hat, ist `offen_wegen_zeit` ueber mehrere Laeufe die einzige
 * Auskunft darueber, ob 90 Sekunden reichen.**
 *
 * ⚠ **90 Sekunden von 150, und die Luecke ist Absicht.** Nach dem letzten
 * Paket muss der Lauf noch seine Bilanz bilden, die Protokollzeile
 * aktualisieren und antworten. Wer das Budget auf 150 setzt, verliert
 * genau die Antwort, um die es geht.
 *
 * ⚠ Und es ist ein ERSTER Wert, nicht ein gemessener: wie lange ein
 * Download braucht, ist ungemessen. Deshalb nennt die Antwort
 * `wappen_offen` — bleibt die Zahl ueber mehrere Laeufe gleich, ist das
 * Budget zu klein, und dann gehoert es korrigiert und nicht geraten.
 */
export const WAPPEN_BUDGET_MS = 90_000;

/**
 * Ist noch Zeit im Budget?
 *
 * ⚠ Eine eigene Funktion, damit die Entscheidung pruefbar ist. Ein
 * `Date.now() - beginn < 90_000` mitten in der Schleife laesst sich gegen
 * keine erfundene Uhr halten — und eine Grenze, die man nicht pruefen
 * kann, ist eine Behauptung.
 */
export function nochZeit(beginnMs: number, jetztMs: number,
                         budgetMs: number = WAPPEN_BUDGET_MS): boolean {
  return jetztMs - beginnMs < budgetMs;
}

/**
 * Was ein Lauf von den ausgewaehlten Wappen schafft, und was liegen bleibt.
 *
 * ⚠ `offen` ist NICHT „es gibt keine mehr" — es ist die Zahl derer, die
 * dieser Lauf nicht mehr angefasst hat. Eine fehlende Angabe und eine
 * Null duerfen nicht gleich aussehen, deshalb steht sie immer da.
 */
export interface WappenPortion<T> {
  nehmen: T[];
  offen: number;
}

/**
 * Die Portion, die in das Budget passt — nach der Zeit, die das LADEN
 * je Stueck gekostet hat.
 *
 * ⚠ Sie entscheidet nicht im Voraus, sondern beim Durchgehen: der
 * Aufrufer ruft `nochZeit()` vor jedem Stueck. Diese Funktion ist der
 * Abschluss danach — sie sagt, wie viele uebrig geblieben sind. Zwei
 * Stellen fuer eine Aussage waeren eine zu viel, also rechnet sie NICHT
 * selbst nach, sondern nimmt die Zahl der tatsaechlich Geladenen.
 */
export function portionBilanz<T>(alle: T[], angefasst: number): WappenPortion<T> {
  const n = Math.max(0, Math.min(angefasst, alle.length));
  return { nehmen: alle.slice(0, n), offen: alle.length - n };
}

/** Eine Zeile aus `public.sfv_team_logos`, so weit der Export sie braucht. */
export interface WappenZeile {
  sfv_team_id: number;
  /** Pfad im Bucket. Ohne ihn liegt kein Bild — solche Zeilen kommen hier
      gar nicht erst an (siehe `fehlt_seit` in logos.ts). */
  pfad: string;
  mime: string | null;
}

/** Ein Eintrag, wie er hinausgeht. */
export interface WappenNutzlast {
  /** ⚠ TEXT, nicht Zahl — so steht es im Vertrag. */
  sfv_team_id: string;
  sha256: string;
  mime: string;
  /** base64, ohne `data:`-Präfix. */
  daten: string;
}

/**
 * Was die Gegenstelle über ihren Wappenbestand sagt.
 *
 * ⚠ ⚠  VIER LAGEN, NICHT DREI — und die vierte ist der Grund, warum
 * hier kein `boolean` steht.
 *
 *   `feld_fehlt`  die Antwort führt das Feld gar nicht → eine Fassung
 *                 vor der Wappen-Aktion. **Nichts senden**, und das
 *                 sagen.
 *   `leer`        das Feld ist da und leer → sie ist bereit, drüben
 *                 liegt noch nichts. **Alles senden.**
 *   `gefuellt`    abgleichen.
 *   `unlesbar`    das Feld ist da und ist keine Liste.
 *
 * Die vierte in `feld_fehlt` zu falten hiesse, eine falsche Aussage
 * über die Gegenstelle zu machen („alte Fassung"), und sie in `leer` zu
 * falten hiesse, alles zu senden, weil wir die Antwort nicht verstehen.
 * Beides ist schlimmer als der eigene Name.
 */
export type WappenLage = "feld_fehlt" | "leer" | "gefuellt" | "unlesbar";

export interface WappenBestand {
  lage: WappenLage;
  /** Nummer (als Text) → Prüfsumme. Nur Einträge MIT Prüfsumme. */
  bekannt: Map<string, string>;
  /** Wo das Feld gefunden wurde, oder `null`. Gehört in die Antwort:
      eine Auskunft ohne Herkunft wurde hier schon dreimal falsch
      gelesen. */
  quelle: string | null;
  /** Wie viele Einträge die Gegenstelle gemeldet hat — die
      Bezugsgrösse zu `bekannt.size`. */
  eintraege: number;
  /** Einträge, die eine Nummer führen und keine Prüfsumme. Sie zählen
      NICHT als bekannt: die Gegenstelle kennt die Nummer und hat kein
      Bild. Getrennt ausgewiesen, weil eine Zahl, die zwei Fälle
      zusammenwirft, keine Auskunft ist. */
  ohne_pruefsumme: number;
}

/**
 * Die zwei Orte, an denen das Feld stehen darf. Eine Allowlist, kein
 * Suchlauf: was hier nicht steht, gilt als nicht vorhanden.
 *
 * ⚠ Zwei statt einem, weil der Vertrag „seine Aktion `bestand` meldet
 * je Team …" den Ort nicht festlegt und `teams` dort bereits eine
 * Team-Auskunft ist. Welcher getroffen hat, steht als `quelle` in der
 * Antwort — dann muss niemand raten.
 */
const BESTAND_ORTE: ReadonlyArray<readonly [string, (wp: Record<string, unknown>) => unknown]> = [
  ["wappen", (wp) => wp.wappen],
  ["teams.wappen", (wp) => (wp.teams as Record<string, unknown> | undefined)?.wappen],
];

/** Text oder Zahl zu einem getrimmten Text; alles andere zu "". */
function alsText(x: unknown): string {
  if (typeof x === "string") return x.trim();
  if (typeof x === "number" && Number.isFinite(x)) return String(x);
  return "";
}

/**
 * Den Wappenbestand der Gegenstelle aus ihrer `bestand`-Antwort lesen.
 *
 * ⚠ Sie entscheidet nichts über das Senden — sie sagt nur, was dasteht.
 * Entschieden wird in `waehleWappen()`.
 */
export function leseWappenBestand(wp: Record<string, unknown>): WappenBestand {
  let quelle: string | null = null;
  let roh: unknown = undefined;
  for (const [name, hole] of BESTAND_ORTE) {
    const wert = hole(wp);
    if (wert !== undefined && wert !== null) { quelle = name; roh = wert; break; }
  }

  const leer = { bekannt: new Map<string, string>(), eintraege: 0, ohne_pruefsumme: 0 };
  if (quelle === null) return { lage: "feld_fehlt", quelle: null, ...leer };
  if (!Array.isArray(roh)) return { lage: "unlesbar", quelle, ...leer };

  const bekannt = new Map<string, string>();
  let ohnePruefsumme = 0;
  for (const e of roh as unknown[]) {
    const z = (e ?? {}) as Record<string, unknown>;
    const id = alsText(z.sfv_team_id);
    if (id === "") continue;
    const summe = alsText(z.sha256);
    if (summe === "") { ohnePruefsumme += 1; continue; }
    bekannt.set(id, summe);
  }

  return {
    lage: (roh as unknown[]).length === 0 ? "leer" : "gefuellt",
    quelle,
    bekannt,
    eintraege: (roh as unknown[]).length,
    ohne_pruefsumme: ohnePruefsumme,
  };
}

export interface WappenWahl {
  /** Was geladen, gehasht und gesendet wird. */
  zu_senden: WappenZeile[];
  /** Wie viele übersprungen wurden, weil die Gegenstelle die Nummer
      schon führt. ⚠ NICHT geladen — siehe die Kostenrechnung im Kopf. */
  uebersprungen_bekannt: number;
  /** `null`, solange gesendet wird. Sonst der Satz, warum nicht — eine
      Null ohne Grund ist keine Auskunft. */
  uebersprungen: string | null;
}

/**
 * Welche Wappen gehen hinaus?
 *
 * ⚠ ⚠  DIE ÜBERSPRINGEN-REGEL IST „DIE GEGENSTELLE KENNT DIE NUMMER",
 * nicht „die Prüfsummen sind gleich". Der Unterschied ist die ganze
 * Ersparnis: für einen Prüfsummenvergleich müsste jedes Wappen geladen
 * werden, und genau das soll unterbleiben.
 *
 * Tragfähig ist das nur, weil ein abgelegtes Wappen bei uns nie neu
 * geholt wird (`offeneLogos()`). **Fällt diese Zeile, ist diese Regel
 * falsch.**
 */
export function waehleWappen(unsere: WappenZeile[], bestand: WappenBestand): WappenWahl {
  if (bestand.lage === "feld_fehlt") {
    return {
      zu_senden: [], uebersprungen_bekannt: 0,
      uebersprungen: "Die Gegenstelle führt kein Wappen-Feld in ihrem Bestand — "
        + "eine Fassung vor der Aktion `wappen`. Es wurde nichts gesendet. "
        + "Das ist KEINE Aussage über die Wappen, sondern über die Fassung drüben.",
    };
  }
  if (bestand.lage === "unlesbar") {
    return {
      zu_senden: [], uebersprungen_bekannt: 0,
      uebersprungen: `Die Gegenstelle meldet unter «${bestand.quelle}» keine Liste. `
        + "Es wurde nichts gesendet, weil die Antwort nicht zu deuten ist — "
        + "weder »sie ist alt« noch »drüben liegt nichts«.",
    };
  }

  const zuSenden: WappenZeile[] = [];
  let bekannt = 0;
  for (const z of unsere) {
    if (bestand.bekannt.has(String(z.sfv_team_id))) { bekannt += 1; continue; }
    zuSenden.push(z);
  }
  return { zu_senden: zuSenden, uebersprungen_bekannt: bekannt, uebersprungen: null };
}

/** Eine Liste in Pakete schneiden. Das letzte darf kürzer sein. */
export function bildePakete<T>(liste: T[], groesse: number = WAPPEN_PRO_PAKET): T[][] {
  if (groesse < 1) throw new Error("Paketgröße muss mindestens 1 sein");
  const raus: T[][] = [];
  for (let i = 0; i < liste.length; i += groesse) raus.push(liste.slice(i, i + groesse));
  return raus;
}

/**
 * Bytes → base64.
 *
 * ⚠ ⚠  BLOCKWEISE, UND DAS IST KEIN SCHMUCK. `String.fromCharCode(...arr)`
 * legt jedes Byte als eigenes Argument auf den Stapel; bei einer grossen
 * Datei wirft das `RangeError: Maximum call stack size exceeded` —
 * abhängig von der Dateigröße, also **erst beim ungünstigen Wappen** und
 * nicht beim Prüfen. Ein Fehler, der von der Datengröße abhängt, tritt
 * im Betrieb sporadisch auf und wird nicht gesucht.
 *
 * ⚠ Das Gegenstück `ausBase64()` gibt es in `sfv-sync/logos.ts`; ein
 * Encoder gab es im ganzen Projekt nicht.
 */
const BLOCK = 0x8000;
export function nachBase64(bytes: Uint8Array): string {
  let roh = "";
  for (let i = 0; i < bytes.length; i += BLOCK) {
    roh += String.fromCharCode(...bytes.subarray(i, i + BLOCK));
  }
  return btoa(roh);
}

/** Die Antwort der Gegenstelle auf ein Paket, so weit wir sie lesen. */
export interface WappenAntwort {
  angelegt?: unknown;
  ersetzt?: unknown;
  unveraendert?: unknown;
  fehler?: unknown;
}

export interface WappenBilanz {
  angelegt: number;
  ersetzt: number;
  unveraendert: number;
  fehler: number;
  /** Was die Gegenstelle an Text zu ihren Fehlern gesagt hat. Eine Zahl
      allein sähe aus wie „ein Fehler", und gesucht würde überall. */
  fehlermeldungen: string[];
  /** ⚠ Die Gegenprobe. `angelegt + ersetzt + unveraendert + fehler`
      muss die Zahl der gesendeten Einträge ergeben. Eine Aufteilung,
      die aufgehen MUSS, prüft sich selbst; eine einzelne Zahl kann nur
      behauptet werden. */
  aufteilung_stimmt: boolean;
}

/**
 * Eine Zahl aus einem Feld, das eine Zahl ODER eine Liste sein darf.
 *
 * ⚠ Der Vertrag nennt `fehler` als Feld und nicht seine Form. Beide
 * Formen werden gelesen, statt eine zu raten — und eine Form, die
 * keine von beiden ist, ergibt 0 statt `NaN`: ein `NaN` in einer
 * Summe macht jede Zahl daneben unbrauchbar.
 */
function zahlAus(x: unknown): number {
  if (Array.isArray(x)) return x.length;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** Texte aus einem Feld, das eine Liste sein darf. */
function textenAus(x: unknown): string[] {
  if (Array.isArray(x)) {
    return x.map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .filter((s): s is string => typeof s === "string" && s !== "");
  }
  return [];
}

/**
 * Die Antworten aller Pakete zu einer Bilanz.
 *
 * @param gesendet Wie viele Einträge hinausgingen — die Bezugsgrösse
 *                 für `aufteilung_stimmt`.
 */
export function fasseWappenAntworten(
  antworten: WappenAntwort[], gesendet: number,
): WappenBilanz {
  let angelegt = 0, ersetzt = 0, unveraendert = 0, fehler = 0;
  const meldungen: string[] = [];
  for (const a of antworten) {
    angelegt += zahlAus(a.angelegt);
    ersetzt += zahlAus(a.ersetzt);
    unveraendert += zahlAus(a.unveraendert);
    fehler += zahlAus(a.fehler);
    meldungen.push(...textenAus(a.fehler));
  }
  return {
    angelegt, ersetzt, unveraendert, fehler,
    fehlermeldungen: meldungen,
    aufteilung_stimmt: angelegt + ersetzt + unveraendert + fehler === gesendet,
  };
}

/* ═══════════════════════════════════════════════════════════════
   WAS DIE GEGENSTELLE ÜBERHAUPT ANNIMMT

   **png · jpeg · webp · gif** — beide Seiten, seit dem 23.09.2026.

   ── WIE ES DAZU KAM, UND WARUM DAS HIER STEHT ───────────────────

   Der Vertrag nannte zuerst DREI Typen. `erkenneBild()` in
   `sfv-sync/logos.ts` schreibt aber VIER, aus den Magic Bytes — der
   Verband gibt durch, was der Verein hochgeladen hat, und
   `migration_sfv_logos.sql` hält als Messung vom 20.08.2026 fest:
   **das Wappen des FCH selbst ist ein GIF.** Eine Allowlist mit drei
   Einträgen hätte den vierten nicht durchgelassen, und der vierte war
   der häufige Fall.

   Entschieden am 23.09.2026: **GIF wird zugelassen, beide Seiten
   ziehen nach.** Nicht gefiltert, weil ein Wappen, das der Verein
   hochgeladen hat, auf die Seite gehört — und nicht daran scheitern
   soll, in welchem Format es vorliegt.

   ⚠ ⚠  ÜBERGANGSLAGE, UND SIE IST GEMESSEN STATT ANGENOMMEN. Bis die
   Gegenstelle nachzieht, weist sie GIFs mit Grund ab. Das ist
   harmlos — **aber nur, solange sie für ein abgelehntes Bild KEINE
   Nummer mit Prüfsumme anlegt.** Der Grund steht in
   `leseWappenBestand()`: eine Nummer ohne `sha256` zählt dort nicht
   als bekannt, also geht dasselbe Wappen im nächsten Lauf erneut
   hinaus. Legt sie dagegen eine Nummer MIT Prüfsumme an, führt sie
   das Wappen als vorhanden, `waehleWappen()` überspringt es für
   immer, und es erschiene nie — **ohne dass etwas fehlschlägt.**

   Die Bedingung liegt drüben und ist von hier aus nicht prüfbar. Was
   sie sichtbar macht, ist `ohne_pruefsumme` in der Bestandsauskunft:
   steht dort nach dem Umstellen eine Null und fehlen trotzdem Wappen,
   ist genau das eingetreten.

   ⚠ ⚠  `image/svg+xml` KANN HEUTE NICHT VORKOMMEN, und das gehört
   dazu, damit niemand den Zweig für den eigentlichen Zweck hält:
   `erkenneBild()` hat für SVG keinen Zweig, ein unerkanntes Bild
   ergibt `null` und wird gar nicht erst abgelegt. Der Riegel steht
   trotzdem — er kostet nichts und trägt, sobald jemand die Erkennung
   erweitert. Er ist eine Vorsorge, keine Beobachtung.

   ⚠ Und die Liste bleibt eine ALLOWLIST, keine Liste verbotener
   Typen — daran ändert die Aufnahme von GIF nichts. Ein fünfter Typ,
   den jemand morgen in `erkenneBild()` ergänzt, fällt damit auf,
   statt still hinauszugehen und drüben abgewiesen zu werden. **Die
   Lehre war nicht „die Liste war zu kurz", sondern „eine Allowlist
   und ihre Quelle müssen zusammen gepflegt werden".**
   ═══════════════════════════════════════════════════════════════ */

/**
 * Die Typen, die die Gegenstelle annimmt — ihr Vertrag, nicht unsere
 * Wahl.
 *
 * ⚠ **Die vier sind genau die, die `erkenneBild()` schreiben kann**
 * (`sfv-sync/logos.ts`). Das ist kein Zufall und die eigentliche
 * Regel: was bei uns abgelegt werden KANN, muss drüben ankommen
 * dürfen. Wer hier etwas wegnimmt, filtert ab sofort echte Wappen;
 * wer dort einen Typ ergänzt, muss hier nachziehen.
 */
export const ERLAUBTE_MIME: ReadonlySet<string> = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
]);

/**
 * Die Obergrenze der Gegenstelle, gemessen an den **dekodierten**
 * Bytes — nicht an der Länge des base64-Textes.
 *
 * ⚠ Der Unterschied ist ein Drittel: base64 ist 4/3 so lang wie das
 * Bild. Wer den Text misst, weist Bilder ab 384 KiB ab und hält das
 * für die Grenze der Gegenstelle.
 *
 * ⚠ ⚠  UND SIE KANN FUER EIN BILD AUS DEM BUCKET NIE ZUSCHLAGEN. Gemessen
 * am 24.09.2026: `storage.buckets.file_size_limit` steht auf **262144**
 * (`migration_sfv_logos.sql:81`), also 256 KiB — halb so viel. Was groesser
 * ist, liegt dort nicht, und der Sync koennte es nicht ablegen.
 *
 * Sie bleibt trotzdem stehen, und zwar als Guertel hinter dem Hosentraeger:
 * die Grenze der Gegenstelle ist 512 KiB, und diese Pruefung sagt, was
 * DRUEBEN nicht angenommen wird — nicht, was hier nicht ablegbar ist. Wer
 * die Bucket-Grenze je erhoeht, findet sie hier vor.
 *
 * ⚠ Dass eine Pruefung heute nicht zuschlagen kann, gehoert aber
 * hingeschrieben: sonst liest jemand ihre Null als „geprueft und in
 * Ordnung", wo sie „nicht erreichbar" heisst. Dieselbe Familie wie eine
 * Pruefung, die grundlos gruen ist.
 */
export const WAPPEN_HOECHSTENS_BYTES = 512 * 1024;

/**
 * Darf dieses Bild hinaus?
 *
 * ⚠ Der Grund kommt als Satz zurück, nicht als Wahrheitswert. Eine
 * Zahl „3 abgelehnt" schickt den Leser auf die Suche; „38301:
 * image/avif nimmt die Gegenstelle nicht an (erlaubt: …)" nennt Team,
 * Ursache und die gültige Antwort in derselben Zeile.
 *
 * ⚠ Das Beispiel ist mit Absicht ein Typ, den es hier nicht gibt:
 * seit dem 23.09.2026 nimmt die Gegenstelle alle vier an, die
 * `erkenneBild()` schreiben kann. Wer diesen Zweig auslöst, hat
 * einen Typ vor sich, den eine der beiden Seiten noch nicht kennt —
 * und genau das soll er sagen.
 */
export function pruefeWappen(
  mime: string, bytes: number,
): { ok: true } | { ok: false; grund: string } {
  if (!ERLAUBTE_MIME.has(mime)) {
    return {
      ok: false,
      grund: `${mime} nimmt die Gegenstelle nicht an `
        + `(erlaubt: ${[...ERLAUBTE_MIME].join(", ")})`,
    };
  }
  if (bytes > WAPPEN_HOECHSTENS_BYTES) {
    return {
      ok: false,
      grund: `${bytes} Bytes über der Grenze von ${WAPPEN_HOECHSTENS_BYTES} `
        + `(gemessen am Bild, nicht am base64-Text)`,
    };
  }
  return { ok: true };
}
