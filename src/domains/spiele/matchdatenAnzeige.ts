/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/matchdatenAnzeige.ts

   Reine Logik für Spielbericht und Zuordnungs-Warteschlange. Kennt
   keine Datenbank.

   DIE ZWEI SCHICHTEN ZUSAMMENFÜHREN ist die Aufgabe: `spiel_ereignisse`
   hält SFV-Zeilen und Vereins-Zeilen nebeneinander. Der Sync schreibt
   nur die SFV-Zeilen fort, angezeigt wird die Vereins-Zeile, wo es
   eine gibt. Beide bleiben stehen — sonst könnte der Nachzug-Vergleich
   nie auslösen (siehe migration_matchdaten.sql).
   ═══════════════════════════════════════════════════════════════ */

import { bestimmeStammteam } from "./stammteam.ts";
import type { StammteamZeile } from "./stammteam.ts";

export type Herkunft = "sfv" | "verein";

export interface EreignisZeile {
  id: string;
  herkunft: Herkunft;
  ersetzt_ereignis_id: string | null;
  verworfen_am: string | null;
  typ_id: number;
  typ: string | null;
  subtyp: string | null;
  /** ⚠ Die Zahl, nicht der Text. Sie unterscheidet Rot von Gelb-Rot
      (`subtyp_id = 20` ist „2. Verwarnung"), und danach zu FRAGEN ist der
      Unterschied zwischen einem Merkmal und einer Schreibweise.

      Die Spalte gab es in `spiel_ereignisse` von Anfang an, und
      `select("*")` holt sie überall mit — nur dieses Interface führte sie
      nicht. Ergänzt am 05.09.2026, als der WordPress-Export sie brauchte:
      ein Typ, der schmaler ist als die Daten, zwingt den nächsten Leser
      zu einem Cast, und der Cast nimmt ihm die Prüfung ab. */
  subtyp_id: number | null;
  minute: number | null;
  zusatzminute: number | null;
  ist_eigener: boolean;
  gegner_club_name: string | null;
  sfv_person_id: number | null;
  rueckennr: number | null;
  ein_sfv_person_id: number | null;
  ein_rueckennr: number | null;
  /**
   * Die Rollenkategorie des Verbands als ZAHL — `roleCategoryId`.
   *
   * ⚠ ⚠  SIE ENTSCHEIDET, NICHT DIE FEHLENDE RÜCKENNUMMER. Bis zum
   * 24.09.2026 hing „Unser Team" daran, dass weder Name noch Nummer da
   * war — und bei allen fünf gemessenen Fällen (11.09.2026) waren das
   * Trainer und Betreuer. Der Schluss „keine Nummer ⇒ kein Spieler" ist
   * trotzdem ein Filter auf ein NEBENPRODUKT: ein unzugeordneter SPIELER
   * ohne Nummer landet im selben Zustand, und für ihn gilt ausdrücklich
   * weiter „Nr. 13" bzw. „Unser Team".
   *
   * ⚠ `null` heisst NICHT GEFRAGT, nicht „Spieler". Jede Zeile, die vor
   * dem 24.09.2026 geholt wurde, trägt null — rund tausend im Bestand,
   * bis ein Nachlauf sie neu holt. Sie fallen deshalb auf den alten Text
   * zurück, und das ist richtig: wir wissen es für sie nicht.
   *
   * ⚠ Der Verband führt **28** Kategorien (`docs/sfv/sfv_stammdaten.json`,
   * Liste `Rollenkategorie`), und ihre Ids sind NICHT durchgehend: 1–6,
   * 9–28, 98, 99. Wer auf „Trainer" prüft, verpasst den Betreuer (9) und
   * den Funktionär (4).
   */
  rolle_kategorie_id: number | null;
  /**
   * Derselbe Wert als Klartext — `roleCategoryName`, „Trainer",
   * „Betreuer", „Funktionär".
   *
   * ⚠ NUR FÜR DIE ANZEIGE. Entschieden wird an `rolle_kategorie_id`; ein
   * Vergleich auf diesen Text wäre eine Schreibweise des Verbands, und
   * `subtyp` hat gezeigt, wie unzuverlässig die ist — dort steht bei
   * Subtyp 0 ein `-` statt eines leeren Werts.
   */
  rolle_kategorie: string | null;
  /**
   * Der Name, den der Verband an der Ereigniszeile selbst mitschickt
   * (`personName`) — **nur bei eigenen Zeilen**.
   *
   * ⚠ ⚠  DIE DRITTE NAMENSQUELLE, UND DIE SCHWÄCHSTE. Es gibt jetzt drei:
   *
   *   1. die Zuordnung (`sfv_zuordnung`) — UNSERE Schreibweise, sie gewinnt
   *   2. `sfv_personen` — der Verband, über die Aufstellung, als Rückfall
   *   3. **dieses Feld** — der Verband, rohe Angabe an der Ereigniszeile
   *
   * Die ersten zwei kommen über die `namen`-Map bei `beschreibeWer()`;
   * dieses Feld steht daneben. **Zwei Aussagen über dieselbe Sache laufen
   * still auseinander**, deshalb ist die Reihenfolge festgelegt und nicht
   * dem Zufall überlassen: die Zuordnung gewinnt immer.
   *
   * ⚠ UND ES IST NUR BEI EINEM ROLLENVERMERK ERREICHBAR (siehe
   * `rollenName()`). Sonst bekäme ein unzugeordneter eigener Spieler seinen
   * rohen Verbandsnamen statt „Nr. 13" — eine Preisgabe, die niemand
   * bestellt hat, an der Stelle, an der 308 offene Zuordnungen warten.
   *
   * ⚠ Bei Gegnern verboten, nicht bloss ungenutzt — Entscheid B vom
   * 10.09.2026. Eine Rollenkategorie ist einer von 28 festen Werten und
   * bezeichnet keinen Menschen; ein Name schon.
   *
   * ⚠ ⚠  EINE KORRIGIERTE ZEILE TRÄGT DIE DREI FELDER NICHT — und das ist
   * eine bestehende Lücke, keine neue. `speichereKorrektur()` schreibt
   * genau die Spalten aus `KORRIGIERBAR` plus `typ`; alles andere bleibt an
   * der Vereins-Zeile leer. **`subtyp_id` fällt dort schon heute weg**, und
   * damit der Eigentor-Zusatz einer korrigierten Zeile.
   *
   * Für diese drei heisst das: wer eine Trainerkarte korrigiert, sieht
   * danach wieder „Unser Team". Zu entscheiden ist nicht, ob das ein Fehler
   * ist, sondern WELCHER — soll eine Korrektur die Rolle fortschreiben
   * (dann gehört sie in den Insert) oder zurücksetzen (dann gehört der Satz
   * in die Maske)? Das ist eine Frage an `matchdatenService.ts` und an die
   * Korrekturmaske, nicht an diese Datei.
   */
  person_name: string | null;
}

/* Was der Bericht zeigt: eine Zeile je Ereignis, mit dem Vermerk, ob
   der Verein sie geändert hat. */
export interface AnzeigeEreignis extends EreignisZeile {
  /** true, wenn diese Zeile eine SFV-Zeile verdeckt oder ergänzt. */
  vomVerein: boolean;
  /** Die verdeckte SFV-Zeile — für „Original anzeigen". */
  original: EreignisZeile | null;
}

/**
 * Führt die zwei Schichten zu der Liste zusammen, die angezeigt wird.
 *
 * Eine Vereins-Zeile verdeckt die SFV-Zeile, auf die sie zeigt. Eine
 * verworfene Korrektur verdeckt nichts mehr — dann gilt wieder der SFV.
 * Eine Vereins-Zeile ohne `ersetzt_ereignis_id` ist ein Nachtrag
 * (Assist) und kommt zusätzlich dazu.
 */
export function mischeEreignisse(zeilen: EreignisZeile[]): AnzeigeEreignis[] {
  const aktiv = zeilen.filter(z => z.herkunft === "verein" && !z.verworfen_am);
  const verdeckt = new Map<string, EreignisZeile>();
  for (const k of aktiv) {
    if (k.ersetzt_ereignis_id) verdeckt.set(k.ersetzt_ereignis_id, k);
  }

  const sfvNachId = new Map(zeilen.filter(z => z.herkunft === "sfv").map(z => [z.id, z]));
  const raus: AnzeigeEreignis[] = [];

  for (const z of zeilen) {
    if (z.herkunft === "sfv") {
      const korrektur = verdeckt.get(z.id);
      /* Verdeckte SFV-Zeile: die Korrektur steht an ihrer Stelle, das
         Original bleibt greifbar. */
      if (korrektur) { raus.push({ ...korrektur, vomVerein: true, original: z }); continue; }
      raus.push({ ...z, vomVerein: false, original: null });
      continue;
    }
    /* Vereins-Zeile: nur die Nachträge kommen hier dazu — die Korrekturen
       sind oben schon an der Stelle ihrer SFV-Zeile eingesetzt. */
    if (z.verworfen_am) continue;
    if (z.ersetzt_ereignis_id) {
      /* Zeigt ins Leere (SFV-Zeile verschwunden): trotzdem zeigen, sonst
         verlöre der Verein seine Eingabe stillschweigend. */
      if (!sfvNachId.has(z.ersetzt_ereignis_id)) {
        raus.push({ ...z, vomVerein: true, original: null });
      }
      continue;
    }
    raus.push({ ...z, vomVerein: true, original: null });
  }

  return raus.sort((a, b) =>
    (a.minute ?? 0) - (b.minute ?? 0) || (a.zusatzminute ?? 0) - (b.zusatzminute ?? 0));
}

/**
 * Hat der Verband zu diesem Spiel überhaupt einen Verlauf erfasst?
 *
 * Bei vier von zehn Spielen liefert er keine Ereignisse — auch bei
 * sieben oder acht Toren (Trockenlauf 19.08.2026). Ein leerer Verlauf
 * bei einem 3:2 sieht aus wie ein Fehler in ClubCampus; dabei liegt es
 * am Verband. Deshalb wird der Unterschied benannt statt gezeigt.
 *
 * ⚠ Der Stand kommt aus `spiele.resultat`, NIE aus den Ereignissen.
 */
export function hatVerlauf(zeilen: EreignisZeile[]): boolean {
  return zeilen.some(z => z.herkunft === "sfv");
}

export const OHNE_VERLAUF_TEXT =
  "Der SFV hat zu diesem Spiel keinen Verlauf erfasst. Das Resultat stammt aus dem Spielplan.";

/* ── Warteschlange ─────────────────────────────────────────────────
   Wer ist noch keinem Mitglied zugeordnet? */

export interface AufstellungZeile {
  sfv_person_id: number;
  sfv_team_id: number | null;
  rueckennr: number | null;
  spiel_id: string;
}

/**
 * Eine Aufstellungszeile, wie die Warteschlange sie braucht.
 *
 * ⚠ ⚠  `spielzeit` IST PFLICHT, NICHT OPTIONAL — und der Grund ist nicht
 * Ordnungsliebe, sondern ein **stiller** Ausfall.
 *
 * `bestimmeStammteam()` zählt Einsätze, und `istEinsatz(undefined)` ist
 * `true`. Eine Aufrufstelle, die den Wert nicht durchreicht, bekäme also
 * für JEDE Mannschaft dieselbe Zahl — Gleichstand —, und das Stammteam
 * fiele auf die kleinste Teamnummer. Keine Zeile schlägt fehl, keine
 * Meldung entsteht, und die Gruppe stimmt in der Hälfte der Fälle
 * zufällig. Als Pflichtfeld nennt der Compiler jede Aufrufstelle einmal.
 *
 * ⚠ Abgeleitet aus `StammteamZeile` und NICHT neben ihr her getippt: was
 * die Regel liest, steht in `stammteam.ts` und nirgends sonst. Ein zweites
 * `{ spielzeit: number | null }` wäre dieselbe Aussage an zwei Orten —
 * `AufstellungFuerListe` in `spielerAusgabe.ts` ist derselbe Gedanke für
 * die Ausgabe, und auch die leitet ab statt zu tippen.
 *
 * Die Maske lädt ohnehin `AufstellungMitZeit` (`select("*")`); der Wert
 * ist da und wurde nur nicht weitergegeben.
 */
export type AufstellungFuerWarteschlange = AufstellungZeile & StammteamZeile;

export interface OffeneZuordnung {
  sfv_person_id: number;
  /**
   * Das STAMMTEAM der Person — nicht die Mannschaft ihrer ersten Zeile.
   *
   * ⚠ ⚠  BIS ZUM 24.09.2026 STAND HIER DIE ERSTE GESCHRIEBENE ZEILE, und
   * die Reihenfolge kam aus `.order("id")` — also aus der Einfügereihenfolge
   * in die Datenbank. Das ist willkürlich: dieselbe Person konnte nach
   * einem Nachlauf unter einer anderen Mannschaft stehen, ohne dass sich
   * an ihren Einsätzen etwas geändert hätte.
   *
   * Der Schaden war nicht die Willkür selbst, sondern dass die Ausgabe
   * seit demselben Tag das Stammteam nimmt (`alsMannschaftsliste()`):
   * Kästchen und Datei gruppierten nach zwei verschiedenen Regeln. Und
   * gemessen konnte eine Person dadurch über **kein** Kästchen erreichbar
   * sein — eine Gruppe entstand nur für Mannschaften, die irgendjemandes
   * ERSTE waren.
   *
   * ⚠ `null` heisst „keine einzige Zeile mit Mannschaft", nicht „unbekannte
   * Mannschaft": eine Teamnummer, die `teams` nicht kennt, steht hier
   * weiterhin als Zahl und bekommt erst in `gruppiereNachTeam()` den Namen
   * `OHNE_MANNSCHAFT`. Die zwei dürfen nicht verwechselt werden — das eine
   * ist eine fehlende Angabe des Verbands, das andere eine fehlende
   * Team-Zuordnung bei uns.
   */
  sfv_team_id: number | null;
  /** Alle Rückennummern, unter denen die Person aufgelaufen ist. */
  rueckennummern: number[];
  /**
   * Wie oft sie in der Aufstellung stand — hilft beim Einordnen.
   *
   * ⚠ ZEILEN, nicht Einsätze im Sinne von `bestimmeStammteam()`. Dort
   * zählt eine gemessene Null nicht mit; hier zählt jede Zeile. Der
   * Unterschied ist gewollt: die Anzeige sagt „in so vielen Aufstellungen
   * gefunden", und das ist auch dann wahr, wenn die Person nicht gespielt
   * hat. Zwei Fragen, zwei Zahlen.
   */
  einsaetze: number;
}

/**
 * Die noch offenen Zuordnungen, eine Zeile je Person.
 *
 * Nach Einsätzen absteigend: wer oft spielt, ist zuerst interessant und
 * am leichtesten zu erkennen.
 *
 * ⚠ Das Team kommt aus `bestimmeStammteam()` — derselben Regel, nach der
 * die Excel-Liste gruppiert. Sie steht an EINER Stelle; hätte die
 * Warteschlange ihre eigene, liefen die beiden wieder auseinander, und
 * zwar still.
 */
export function offeneZuordnungen(
  aufstellung: AufstellungFuerWarteschlange[], bekannt: Set<number>,
): OffeneZuordnung[] {
  /* ⚠ ZWEI DURCHGÄNGE, und das ist nicht vermeidbar: das Stammteam steht
     erst fest, wenn ALLE Zeilen der Person gelesen sind. Die alte Fassung
     entschied es bei der ersten — genau das war der Defekt. */
  const proPerson = new Map<number, {
    zeilen: StammteamZeile[]; rueckennummern: number[]; einsaetze: number;
  }>();
  for (const a of aufstellung) {
    if (bekannt.has(a.sfv_person_id)) continue;
    let p = proPerson.get(a.sfv_person_id);
    if (!p) {
      p = { zeilen: [], rueckennummern: [], einsaetze: 0 };
      proPerson.set(a.sfv_person_id, p);
    }
    p.zeilen.push(a);
    p.einsaetze += 1;
    if (a.rueckennr !== null && !p.rueckennummern.includes(a.rueckennr)) {
      p.rueckennummern.push(a.rueckennr);
    }
  }

  return [...proPerson.entries()].map(([sfv_person_id, p]) => ({
    sfv_person_id,
    sfv_team_id: bestimmeStammteam(p.zeilen).sfv_team_id,
    rueckennummern: p.rueckennummern,
    einsaetze: p.einsaetze,
  /* `Array.prototype.sort` ist stabil — bei gleicher Zahl bleibt die
     Reihenfolge der Map, also die des ersten Vorkommens. Unverändert
     gegenüber der alten Fassung. */
  })).sort((a, b) => b.einsaetze - a.einsaetze);
}

/**
 * Nach Mannschaft gruppiert — seit dem 24.09.2026 nach dem STAMMTEAM.
 *
 * Beim ersten Lauf standen 129 verschiedene eigene Spieler in zehn
 * Spielen; über die ganze Saison werden es mehr. Zweihundert Namen am
 * Stück sortiert man schlechter als fünfzehn pro Mannschaft.
 *
 * ⚠ ⚠  JEDE PERSON STEHT IN GENAU EINER GRUPPE, und das ist die Zusage,
 * an der es hing. `offeneZuordnungen()` liefert je Person eine Zeile mit
 * einem Team, also kann keine Person in zwei Gruppen stehen und keine in
 * keiner. Die Kästchen der Maske kommen aus dieser Liste — damit ist jede
 * Person über genau ein Kästchen erreichbar, und die Excel-Liste gruppiert
 * nach derselben Regel.
 *
 * Vorher entstand eine Gruppe nur für Mannschaften, die irgendjemandes
 * ERSTE waren. Wessen Stammteam eine Mannschaft war, in der sonst niemand
 * zuerst auflief, hatte kein Kästchen — und fiel damit aus der Ausgabe,
 * ohne dass etwas fehlschlug.
 */
export interface ZuordnungGruppe {
  sfv_team_id: number | null;
  teamName: string;
  offen: OffeneZuordnung[];
}

/**
 * Die Bezeichnung der Gruppe, deren `sfv_team_id` sich nicht aufloesen laesst.
 *
 * ⚠ EINE KONSTANTE, KEINE ZEICHENKETTE AN DREI ORTEN. Der Spieler-Vorschlag
 * muss diesen Fall von einem echten Mannschaftsnamen unterscheiden — er darf
 * nicht als Mannschaft in den Vergleich gehen. Stand die Bezeichnung an zwei
 * Stellen getippt, waere ein Umbenennen hier ein **stiller** Ausfall dort:
 * jeder Spieler ohne Team-Zuordnung bekaeme keinen Kandidaten und damit
 * keinen Vorschlag, ohne dass etwas fehlschlaegt.
 *
 * Dieselbe Regel wie „ein Filter auf einen NAMEN prueft eine Schreibweise" —
 * nur ueber zwei Dateien statt ueber zwei Systeme.
 */
export const OHNE_MANNSCHAFT = "Ohne Mannschaft";

export function gruppiereNachTeam(
  offen: OffeneZuordnung[], teamNamen: Map<number, string>,
): ZuordnungGruppe[] {
  const proTeam = new Map<string, ZuordnungGruppe>();
  for (const o of offen) {
    /* ⚠ ⚠  `"-"` IST EINE GRUPPE WIE JEDE ANDERE, kein Rest und kein
       Sonderfall. Sie bekommt in der Maske ihr eigenes Kästchen, weil die
       Kästchen aus dieser Liste kommen — und `alsMannschaftsliste()`
       filtert gegen genau diese Form. Wer sie hier überspränge („die
       kennen wir ja nicht"), machte jede Person ohne Team-Id
       unerreichbar: nicht in der Liste, nicht im Export, und nichts
       schlüge fehl.

       ⚠ Und derselbe Schlüssel entsteht an drei Orten aus derselben
       Regel — hier, in `SpielerZeile.stammteamSchluessel` und am `key`
       der Kästchen. Wer ihn ändert, ändert alle drei. */
    const schluessel = String(o.sfv_team_id ?? "-");
    let g = proTeam.get(schluessel);
    if (!g) {
      g = {
        sfv_team_id: o.sfv_team_id,
        teamName: (o.sfv_team_id !== null && teamNamen.get(o.sfv_team_id)) || OHNE_MANNSCHAFT,
        offen: [],
      };
      proTeam.set(schluessel, g);
    }
    g.offen.push(o);
  }
  /* Grösste Mannschaft zuerst — dort ist am meisten zu tun. */
  return [...proTeam.values()].sort((a, b) => b.offen.length - a.offen.length);
}

/* ── Statistik ─────────────────────────────────────────────────────
   ⚠ Die zwei Quellen sind NICHT gleich verlässlich, und das gehört an
   die Anzeige, nicht nur in den Code: Einsätze und Minuten stammen aus
   /players und stehen bei jedem Spiel, Tore und Karten aus /events —
   und die fehlen bei rund vier von zehn Spielen ganz. Sonst wundert
   sich jemand, warum ein Spieler 14 Spiele und 0 Tore hat. */
export const STATISTIK_HINWEIS =
  "Einsätze und Minuten liefert der SFV zu jedem Spiel. Tore und Karten nur dort, "
  + "wo er einen Spielverlauf erfasst hat — das ist längst nicht überall der Fall. "
  + "Eine 0 bei den Toren kann deshalb auch heissen: nicht erfasst.";

export interface SpielerStatistik {
  sfv_person_id: number;
  einsaetze: number;
  minuten: number;
  /** Spiele, zu denen ein Verlauf vorliegt — nur sie zählen für Tore. */
  spieleMitVerlauf: number;
  tore: number;
  verwarnungen: number;
  ausschluesse: number;
}

export const TYP_TOR = 1;
export const TYP_VERWARNUNG = 3;
export const TYP_AUSSCHLUSS = 4;

/**
 * Torzusatz — `eigentor` · `penalty` · `""`.
 *
 * ⚠ ⚠  ÜBER DIE KENNZAHL, NIE ÜBER DEN TEXT. `subtyp` trägt den Klartext
 * des Verbands und wäre eine Schreibweise; `subtyp_id` ist das Merkmal.
 * Gemessen in `sfv_stammdaten.json` am 11.09.2026:
 *
 *   2  Eigentor      4  Penalty
 *   1  Kopftor       3  Freistosstor      0  „-"
 *
 * ⚠ Die Liste hat **100 Einträge**, nicht vier. Was hier nicht steht,
 * ergibt bewusst `""` — das Theme kennt genau zwei Werte, und ein
 * dritter fiele dort in ein `select` mit festen Optionen.
 *
 * ⚠ ⚠  UND ER IST NICHT DIE WIEDERHOLUNG EINER ANDEREN ANGABE.
 * `art` steht beim Eigentor auf `tor` — **dass es eines war, steht
 * nirgends sonst als im Fliesstext.** Genau deshalb liest die Spielseite
 * heute das Wort „Eigentor" aus `text`, um den Zwischenstand auf die
 * andere Mannschaft zu drehen.
 *
 * ⚠ Bei `2. Verwarnung` ist es umgekehrt: `art` trägt bereits `gelbrot`,
 * und das Theme stellt es als eigenes Symbol dar. Ein Zusatz wäre dort
 * eine Doppelung — deshalb bekommt er **bewusst keinen Eintrag**.
 *
 * ⚠ ⚠  UND DER TYP-GUARD IN DER ERSTEN ZEILE IST DER GRUND, WARUM DIESE
 * FUNKTION AUCH DORT BENUTZT WIRD, WO ES NUR UM EIGENTORE GEHT. Die
 * Subtyp-Nummern gelten **je Ereignistyp**: `subtyp_id = 2` an einer
 * Verwarnung ist kein Eigentor. Ein blosser Vergleich auf 2 verschluckte
 * sie — deshalb fragt niemand den Subtyp selbst ab.
 *
 * ⚠ Sie stand bis zum 22.09.2026 in `wpNutzlast.ts` und ist hierher
 * gewandert, weil `baueStatistik()` dieselbe Regel braucht und die
 * Importrichtung `wpNutzlast → matchdatenAnzeige` lautet. `wpNutzlast.ts`
 * re-exportiert sie, damit keine Importzeile bricht.
 */
export const SUBTYP_EIGENTOR = 2;
export const SUBTYP_PENALTY = 4;

export function torZusatz(
  typId: number, subtypId: number | null,
): "eigentor" | "penalty" | "" {
  if (typId !== TYP_TOR) return "";
  if (subtypId === SUBTYP_EIGENTOR) return "eigentor";
  if (subtypId === SUBTYP_PENALTY) return "penalty";
  return "";
}

export function baueStatistik(
  aufstellung: AufstellungZeile[],
  ereignisse: (EreignisZeile & { spiel_id: string })[],
  spieleMitVerlauf: Set<string>,
): SpielerStatistik[] {
  const proPerson = new Map<number, SpielerStatistik>();
  const hole = (id: number) => {
    let s = proPerson.get(id);
    if (!s) {
      s = { sfv_person_id: id, einsaetze: 0, minuten: 0, spieleMitVerlauf: 0, tore: 0, verwarnungen: 0, ausschluesse: 0 };
      proPerson.set(id, s);
    }
    return s;
  };

  for (const a of aufstellung as (AufstellungZeile & { spielzeit?: number | null })[]) {
    const s = hole(a.sfv_person_id);
    s.einsaetze += 1;
    s.minuten += a.spielzeit ?? 0;
    if (spieleMitVerlauf.has(a.spiel_id)) s.spieleMitVerlauf += 1;
  }

  for (const e of ereignisse) {
    if (!e.ist_eigener || e.sfv_person_id === null) continue;
    /* ⚠ ⚠  EIN EIGENTOR IST KEIN PERSÖNLICHES TOR — und es zählt auch
       keinem Gegner. Es fällt hier ganz weg, wie an der
       Aufstellungszeile (`sammleMarken()`).

       ⚠ **Diese Funktion hat heute keinen Aufrufer**, und genau deshalb
       steht die Zeile hier: eine falsche Regel in totem Code ist still,
       bis jemand ihn anschliesst — und dann ist sie sein Fehler und
       nicht mehr unserer. Ihre vier Testfälle halten sie am Leben, ohne
       dass sie jemand liest.

       ⚠ Über `torZusatz()` und nicht über `subtyp_id === 2`: die Regel
       steht sonst an zwei Stellen, und der Typ-Guard fiele weg. */
    if (torZusatz(e.typ_id, e.subtyp_id ?? null) === "eigentor") continue;
    const s = hole(e.sfv_person_id);
    if (e.typ_id === TYP_TOR) s.tore += 1;
    else if (e.typ_id === TYP_VERWARNUNG) s.verwarnungen += 1;
    else if (e.typ_id === TYP_AUSSCHLUSS) s.ausschluesse += 1;
  }

  return [...proPerson.values()].sort((a, b) => b.einsaetze - a.einsaetze);
}

/* ── Korrektur ─────────────────────────────────────────────────────
   Zwei Helfer, die die Maske braucht — als reine Funktionen, damit sie
   ohne React prüfbar sind. */

/** Wer hinter einem Ereignis steckt, in Worten.

    Ohne Zuordnung bleibt die Rückennummer: der Name eines eigenen
    Spielers steht nicht in unserer Datenbank, solange ihn niemand
    zugeordnet hat, und der eines fremden nie. */
/** Text für einen eigenen Spieler ohne Zuordnung.

    ⚠ NIE die rohe personId als Anzeige. Eine Zahl aus einem fremden
    System sagt dem Leser nichts, sieht aber aus wie eine Auskunft — und
    verdeckt, dass hier schlicht noch etwas zu tun ist. Die Rückennummer
    kennt jeder, der beim Spiel war; die Id gehört daneben, klein. */
export function unzugeordnetLabel(rueckennr: number | null): string {
  return rueckennr != null ? `Nr. ${rueckennr} · nicht zugeordnet` : "Nicht zugeordnet";
}

/** Die Rollenkategorie „Spieler" — Id 1 von 28 (`sfv_stammdaten.json`).

    ⚠ Sie steht hier als EINZIGE der 28, und das ist Absicht: gefragt wird
    nur, ob jemand ein Spieler ist. Eine Liste aller 28 wäre eine zweite
    Wahrheit neben den Stammdaten des Verbands, und sie müsste gepflegt
    werden — am 24.09.2026 sind es 28, morgen vielleicht 29. */
export const ROLLE_SPIELER = 1;

/**
 * Trägt diese Zeile einen Rollenvermerk — ist der Mensch dahinter also
 * ausdrücklich KEIN Spieler?
 *
 * ⚠ ⚠  DREI ZUSTÄNDE, NICHT ZWEI. `null` heisst **nicht gefragt** und darf
 * nicht wie „Spieler" gelesen werden, auch wenn beide hier `false` ergeben:
 * der Unterschied steht am Feld und in der Vorschau, nicht in dieser
 * Antwort. Für die ANZEIGE fallen sie zusammen — in beiden Fällen gibt es
 * keinen Rollenvermerk zu zeigen —, und genau deshalb bleibt für den
 * Altbestand der alte Rückfalltext stehen.
 *
 * ⚠ Gefragt wird `!== ROLLE_SPIELER`, nicht `> 1`: die Ids des Verbands
 * sind nicht durchgehend (1–6, 9–28, 98, 99), und `> 1` wäre eine Aussage
 * über die Sortierung statt über die Sache.
 */
export function istRollenvermerk(
  e: Pick<EreignisZeile, "rolle_kategorie_id">,
): boolean {
  if (e.rolle_kategorie_id == null) return false;
  return e.rolle_kategorie_id !== ROLLE_SPIELER;
}

/** Der Rollentext, wie er vor dem Namen steht — `""`, wenn keiner gilt.

    ⚠ `-` gilt als LEER, nicht als Text. Bei `subtyp` steht dort der
    Klartext zu Subtyp 0 aus den SFV-Stammdaten, und ohne diese Prüfung
    stand am 05.09.2026 beinahe „FC Küsnacht a · -" auf der Website. Ob der
    Verband das bei `roleCategoryName` ebenso tut, ist ungemessen — die
    Prüfung kostet nichts, das Nachmessen kostet einen Lauf.

    ⚠ Fehlt der Text, obwohl die Id einen Vermerk nennt, bleibt der NAME
    trotzdem erreichbar (siehe `rollenName()`). Dann steht „Hans Meier"
    statt „Trainer Hans Meier" — weniger, aber nichts Falsches.

    ⚠ ⚠  GEMESSEN AM 24.09.2026: DIE ECHTE ANTWORT SCHREIBT „Spieler/in",
    DIE STAMMDATEN SCHREIBEN „Spieler".

    Fünf aufgezeichnete Ereignisse (`docs/sfv/matchdaten_beispiel.json`)
    tragen alle `roleCategoryId: 1` und `roleCategoryName: "Spieler/in"`;
    `sfv_stammdaten.json` führt zur selben Id „Spieler". **Zwei Listen
    desselben Verbands, nicht zeichengleich.**

    Daraus folgt zweierlei, und beides steht hier, weil es von hier aus
    wirkt:

      · Für die ENTSCHEIDUNG ist das gleichgültig — sie läuft über
        `rolle_kategorie_id`. Hätte sie über den Text gelaufen, wäre sie
        heute schon falsch, und zwar still.
      · Für die ANZEIGE heisst es: dort steht vermutlich „Trainer/in Hans
        Meier". **Das wird nicht geputzt.** Ein „Trainer" daraus zu machen
        wäre eine Schreibweise, die wir erfinden — dieselbe Entscheidung
        wie beim Doppelabstand in „Gruppe  2" und bei „Schweizer-Cup"
        neben „Schweizer Cup".

    ⚠ Für Kategorie 3 ist kein Ereignis aufgezeichnet; ob dort „Trainer"
    oder „Trainer/in" ankommt, ist ungemessen. Beide Fälle stehen deshalb
    im Test, und keiner von beiden ist eine Zusage über den Verband. */
export function rollenText(
  e: Pick<EreignisZeile, "rolle_kategorie_id" | "rolle_kategorie">,
): string {
  if (!istRollenvermerk(e)) return "";
  const t = (e.rolle_kategorie ?? "").trim();
  return t && t !== "-" ? t : "";
}

/**
 * Der rohe Name des Verbands an der Ereigniszeile — `""`, wenn er nicht
 * gilt.
 *
 * ⚠ ⚠  ZWEI RIEGEL, UND BEIDE HIER: `ist_eigener` **und** der
 * Rollenvermerk.
 *
 *   `ist_eigener`  Entscheid B — beim Gegner nie ein Name. Der CHECK in
 *                  der Datenbank soll dasselbe erzwingen; darauf zu BAUEN
 *                  wäre eine Zusicherung über eine andere Stelle, und die
 *                  prüft kein Werkzeug in dieser Datei.
 *   Rollenvermerk  sonst bekäme ein unzugeordneter eigener SPIELER seinen
 *                  rohen Verbandsnamen statt „Nr. 13". Das ist der Fall,
 *                  der die Regel von der fehlenden Nummer trennt.
 *
 * ⚠ EINE Stelle für diese Entscheidung, weil zwei Leser sie brauchen:
 * `werBefund()` für den Text und `zaehleVerlaufNamen()` für die Zahl, die
 * vor jedem Lauf entscheidet, ob Klarnamen auf eine öffentliche Seite
 * gehen. Liefen die zwei auseinander, meldete die Zahl etwas anderes, als
 * die Website zeigt — und beide wären für sich genommen plausibel.
 */
export function rollenName(
  e: Pick<EreignisZeile, "ist_eigener" | "rolle_kategorie_id" | "person_name">,
): string {
  if (!e.ist_eigener || !istRollenvermerk(e)) return "";
  /* ⚠ Unverändert durchgereicht, nur getrimmt. Welche FORM der Verband
     wählt — „Hans Meier", „MEIER Hans", „Meier, Hans" — ist ungemessen: in
     der aufgezeichneten Antwort ist `personName` geschwärzt. Ihn zu
     zerlegen oder umzustellen hiesse, eine Form anzunehmen, die niemand
     gesehen hat. */
  return (e.person_name ?? "").trim();
}

/** Was von einer Zeile über den Menschen dahinter zu sagen ist. */
export interface WerBefund {
  /** Der Text, den die Anzeige zeigt — „Trainer Hans Meier", „Nr. 9",
      „FC Fällanden", „Unser Team". */
  text: string;
  /** Der Rollentext allein, `""` wenn keiner gilt. Er geht als eigenes
      Feld in die Nutzlast, damit die Gegenseite ihn nicht aus `text`
      herausschneiden muss. */
  rolle: string;
  /**
   * Ist der Mensch in `text` KENNTLICH — durch einen Namen oder eine
   * Rückennummer?
   *
   * ⚠ Eine Rückennummer zählt mit. Das ist nicht „benannt", sondern
   * „zuzuordnen", und genau so hat `ohne_person` es von Anfang an gemeint:
   * *„weder über die Zuordnung noch über eine Rückennummer"*.
   *
   * ⚠ Beim Gegner immer `false` — eine Rolle und ein Vereinsname sind kein
   * Mensch. Was die Nutzlast daraus macht, steht dort; siehe den Vermerk an
   * `ohne_person` in `wpNutzlast.ts`.
   */
  benennbar: boolean;
}

/**
 * Die EINE Entscheidung darüber, wer hinter einer Zeile steckt.
 *
 * ⚠ ⚠  SIE STEHT HIER ZUSAMMEN, WEIL SIE ZWEIMAL GEBRAUCHT WIRD — als Text
 * und als Merkmal. Bis zum 24.09.2026 baute `wpNutzlast.ts` die Bedingung
 * für `ohne_person` von Hand nach, mit dem Kommentar *„⚠ Dieselbe Bedingung
 * wie der Rückfalltext in `beschreibeWer()`"*. Das ist eine Zusicherung
 * über eine andere Stelle: ändert sich die eine, läuft die andere davon —
 * und `ohne_person` ist das Feld, an dem die Website entscheidet, ob dort
 * ein Mensch steht.
 *
 * Die Reihenfolge ist die Aussage:
 *
 *   1. Gegner         → Rolle + Vereinsname, nie ein Mensch
 *   2. zugeordnet     → unsere Schreibweise, sie gewinnt immer
 *   3. Rollenvermerk  → der rohe Name des Verbands (`person_name`)
 *   4. Rückennummer   → „Nr. 9"
 *   5. nichts         → der Rollentext allein, sonst „Unser Team"
 *
 * ⚠ Stufe 5 ist der Gewinn dieses Umbaus: ein Trainer, den wir nicht
 * benennen können, heisst jetzt „Trainer" statt „Unser Team". Das sagt,
 * WAS er ist, auch wenn wir nicht sagen können, WER.
 */
export function werBefund(
  e: Pick<EreignisZeile, "ist_eigener" | "sfv_person_id" | "rueckennr"
       | "gegner_club_name" | "rolle_kategorie_id" | "rolle_kategorie" | "person_name">,
  namen?: Map<number, string>,
): WerBefund {
  const rolle = rollenText(e);
  /* Rolle und Wer, mit genau einem Leerzeichen — und keinem, wenn eines
     von beiden fehlt. „Trainer " oder „ Hans Meier" wäre eine Zeile, die
     nach einem Fehler aussieht. */
  const mit = (wer: string) => (rolle && wer ? `${rolle} ${wer}` : (rolle || wer));

  if (!e.ist_eigener) {
    return { text: mit(e.gegner_club_name ?? "Gegner"), rolle, benennbar: false };
  }

  const zugeordnet = e.sfv_person_id != null ? namen?.get(e.sfv_person_id) : null;
  if (zugeordnet) return { text: mit(zugeordnet), rolle, benennbar: true };

  const roh = rollenName(e);
  if (roh) return { text: mit(roh), rolle, benennbar: true };

  if (e.rueckennr != null) return { text: mit(`Nr. ${e.rueckennr}`), rolle, benennbar: true };

  /* ⚠ Ohne Rollentext bleibt es bei „Unser Team", und zwar auch dann, wenn
     die Id einen Vermerk nennt — dann wissen wir, dass es kein Spieler ist,
     können es aber nicht in Worte fassen. Und für den Altbestand
     (`rolle_kategorie_id === null`) ist es die einzige richtige Antwort:
     nicht gefragt heisst nicht „Mannschaft". */
  return { text: rolle || "Unser Team", rolle, benennbar: false };
}

/** Der Anzeigetext allein — die Fassade vor `werBefund()`.

    ⚠ Sie bleibt, weil sie mehrere Aufrufstellen hat und keine davon das
    Merkmal braucht. Wer beides braucht, ruft `werBefund()` einmal, statt
    zweimal dasselbe zu rechnen. */
export function beschreibeWer(
  e: Pick<EreignisZeile, "ist_eigener" | "sfv_person_id" | "rueckennr"
       | "gegner_club_name" | "rolle_kategorie_id" | "rolle_kategorie" | "person_name">,
  namen?: Map<number, string>,
): string {
  return werBefund(e, namen).text;
}

/**
 * Der ZWEITE Mensch einer Wechselzeile — der EINGEWECHSELTE.
 *
 * ⚠ HIESS HIER BIS ZUM 10.09.2026 „der Ausgewechselte". Das war falsch:
 * `personId` geht vom Platz, `substitutePlayer` kommt für ihn. Gemessen
 * an der Verbandsseite, nicht hergeleitet.
 *
 * ⚠ ⚠  ER HATTE VON ANFANG AN EINE ID UND BEKAM NIE EINEN NAMEN.
 *
 * `spiel_ereignisse.ein_sfv_person_id` wird seit dem ersten Matchdaten-Lauf
 * geschrieben (`matchdaten.ts:138`, aus `substitutePlayerId`), steht im Typ
 * `AnzeigeEreignis` — und wurde von **keiner** Anzeigestelle gelesen. Der
 * Verlauf baute „für Nr. 9" aus der Rückennummer daneben.
 *
 * Das ist die Sorte Lücke, die nichts meldet: die Zeile sieht vollständig
 * aus, weil eine Nummer dasteht. Erst neben einem Namen fällt auf, dass es
 * zwei Menschen sind und nur einer genannt wird.
 *
 * ⚠ DIESELBE REIHENFOLGE WIE `beschreibeWer` — zugeordnet gewinnt, sonst
 * der SFV-Name, sonst die Nummer. Zwei Menschen in einer Zeile dürfen nicht
 * nach verschiedenen Regeln benannt werden.
 *
 * Leerer Text heisst „über diesen Menschen ist nichts bekannt": weder Id
 * noch Nummer. Dann nennt die Zeile ihn gar nicht, statt „für Nr. null".
 */
/**
 * Die Bruecke ueber die Rueckennummer: `spiel_id:nummer` → Name.
 *
 * ⚠ ⚠  NUR EIGENE ZEILEN, NUR BEI GENAU EINEM TREFFER.
 *
 *   Die Nummer ist KEIN Schluessel (CLAUDE.md, 10.09.2026) — sie gibt es
 *   in beiden Mannschaften. Der erste echte Fall kam am selben Tag von
 *   der Website: im Verlauf „Fiona Monteleone ersetzt durch Nr. 9", und
 *   in der Aufstellung stand unter der 9 eine Spielerin der GEGNERISCHEN
 *   Mannschaft. Ein Join ohne Seitenfilter haette den falschen Namen
 *   eingesetzt — mit vollem Namen, auf einer oeffentlichen Seite.
 *
 *   Deshalb: `ist_eigener` auf beiden Seiten, dasselbe Spiel, und bei
 *   zwei Kandidaten **gar keiner**. Eine Bruecke, die raet, ist
 *   schlimmer als keine.
 */
export function baueNummernBruecke(
  zeilen: { spiel_id: string; ist_eigener: boolean; rueckennr: number | null;
            name: string | null }[],
): Map<string, string> {
  const kandidaten = new Map<string, Set<string>>();
  for (const z of zeilen) {
    if (!z.ist_eigener || z.rueckennr == null) continue;
    const n = String(z.name ?? "").trim();
    if (!n) continue;
    const k = `${z.spiel_id}:${z.rueckennr}`;
    const menge = kandidaten.get(k) ?? new Set<string>();
    menge.add(n);
    kandidaten.set(k, menge);
  }
  const raus = new Map<string, string>();
  for (const [k, menge] of kandidaten) {
    /* ⚠ Zwei verschiedene Namen unter derselben Nummer: die Bruecke
       traegt nicht, und Schweigen ist die richtige Antwort. */
    if (menge.size === 1) raus.set(k, [...menge][0]);
  }
  return raus;
}

/**
 * @param bruecke `spiel_id:nummer` → Name, aus der Aufstellung derselben
 *   Partie. Siehe baueNummernBruecke().
 * @param spielId nur noetig, wenn die Bruecke benutzt werden soll.
 */
export function beschreibeGewechselten(
  /* ⚠ `ist_eigener` ist PFLICHT, nicht optional — siehe unten. Optional
     hiesse: eine Aufrufstelle kann es weglassen, und dann ist der Fehler
     vom 11.09.2026 zurück, ohne dass etwas meldet. */
  e: Pick<EreignisZeile, "ein_sfv_person_id" | "ein_rueckennr" | "ist_eigener">,
  namen?: Map<number, string>,
  bruecke?: Map<string, string>,
  spielId?: string,
): string {
  /* ⚠ ⚠  DIE GRENZE STEHT GANZ VORNE, VOR JEDER NAMENSQUELLE — SIE FEHLTE
     BIS ZUM 11.09.2026, UND SIE HAT UNSERE SPIELER BEIM GEGNER ERSCHEINEN
     LASSEN.

     Die Brücke enthält NUR eigene Zeilen — `baueNummernBruecke()` filtert
     auf `ist_eigener`. Befragt wurde sie aber auch bei GEGNERISCHEN
     Wechseln, und dort fand sie unseren Spieler mit derselben Nummer.

     Auf der Spielseite Junioren Ba – FC Fällanden vom 30.08. stand
     viermal „FC Fällanden ersetzt durch <unser Spieler>" — und derselbe
     Mensch wurde im selben Verlauf bei UNS eingewechselt. Eine
     öffentliche Seite behauptete damit, ein Spieler von uns sei für den
     Gegner eingewechselt worden.

     ⚠ DER KOMMENTAR AN `baueNummernBruecke()` NANNTE DIE REGEL WÖRTLICH:
     „ist_eigener auf BEIDEN Seiten, dasselbe Spiel, genau ein Treffer."
     Im Code standen zwei davon. Die dritte war eine Zusicherung über
     eine andere Stelle — und die prüft kein Werkzeug.

     ⚠ UND SIE KONNTE HIER GAR NICHT GEPRÜFT WERDEN: diese Funktion bekam
     `ist_eigener` nicht. Deshalb steht es jetzt als PFLICHTFELD im Pick
     — so meldet der Compiler jede Aufrufstelle, die es nicht liefert.
     Eine Bedingung, die man weglassen kann, wäre die zweite Auflage
     desselben Fehlers. */
  /* ⚠ ⚠ UND SIE STEHT VOR DER ZUORDNUNGSKARTE, NICHT ZWISCHEN DEN BEIDEN
     NAMENSQUELLEN. Beim Schreiben des Testfalls dazu fiel auf, dass es
     ZWEI Wege zu einem Namen gibt: die Brücke UND `namen`. Löste die
     Kennung eines gegnerischen Wechsels zufällig in unserer Karte auf,
     stünde der Name genauso falsch auf der Seite.

     ⚠ BERICHTIGT AM 11.09.2026, am selben Tag: hier stand „für
     `spiel_ereignisse.ein_sfv_person_id` gibt es keinen solchen CHECK".
     **Falsch.** `spiel_ereignisse_fremde_anonym_check` deckt BEIDE
     Spalten ab — `ist_eigener OR (sfv_person_id IS NULL AND
     ein_sfv_person_id IS NULL)`. Ein fremdes Ereignis kann gar keine
     auflösbare Personennummer tragen; dieser zweite Weg war **nie
     erreichbar**.

     Die Reihenfolge bleibt trotzdem so. Sie kostet nichts, und eine
     Grenze vor ALLEN Quellen muss die Frage nicht beantworten — aber
     die Begründung war eine Behauptung über eine andere Stelle, und
     die habe ich nicht nachgesehen, während ich genau darüber schrieb. */
  if (!e.ist_eigener) {
    return e.ein_rueckennr != null ? `Nr. ${e.ein_rueckennr}` : "";
  }

  const name = e.ein_sfv_person_id != null ? namen?.get(e.ein_sfv_person_id) : null;
  if (name) return name;

  /* ⚠ ⚠  DER RUECKFALL, UND ER IST DER NORMALFALL — nicht die Ausnahme.
     Gemessen am 10.09.2026 an fuenf Wechseln eines Spiels: KEIN einziges
     Paar aus `substitutePlayerId` und `personId` stimmt ueberein, und
     die Ereignis-Kennung loest nirgends auf. Ueber die Rueckennummer
     findet sich jeder Name.

     **`substitutePlayerId` ist kein personId.** Die Kennung war die
     ganze Zeit da und zeigte ins Leere — deshalb hat `wechselnachtrag`
     nichts gebracht, deshalb waren die 207 nie ueber `sfv_personen`
     loesbar, und deshalb ist `/bench` gebaut worden. */
  if (bruecke && spielId != null && e.ein_rueckennr != null) {
    const ueber = bruecke.get(`${spielId}:${e.ein_rueckennr}`);
    if (ueber) return ueber;
  }
  return e.ein_rueckennr != null ? `Nr. ${e.ein_rueckennr}` : "";
}

/** Kurzform eines Ereignisses für Dialoge: „Tor, 34' · Nr. 11". */
export function beschreibeEreignis(
  e: Pick<EreignisZeile, "typ" | "minute" | "ist_eigener" | "sfv_person_id" | "rueckennr"
       | "gegner_club_name" | "rolle_kategorie_id" | "rolle_kategorie" | "person_name">,
  namen?: Map<number, string>,
): string {
  const teile = [e.typ ?? "Ereignis"];
  if (e.minute != null) teile.push(`${e.minute}'`);
  return `${teile.join(", ")} · ${beschreibeWer(e, namen)}`;
}

/** Welche Felder weicht die Korrektur vom Original ab?

    Genau diese Liste landet in `geaenderte_felder` und entscheidet später
    den Nachzug-Vergleich: verglichen wird nur, was angefasst wurde. Ein
    Vergleich der ganzen Zeile schlüge bei jeder Nebenänderung an.

    Leere Liste heisst: es gibt nichts zu korrigieren. Die Maske speichert
    dann nicht — eine Vereins-Zeile ohne Abweichung wäre eine Zeile, die
    den Sync blockiert, ohne etwas zu ändern. */
export const KORRIGIERBAR = ["typ_id", "minute", "ist_eigener", "sfv_person_id", "rueckennr", "gegner_club_name"] as const;
export type KorrigierbaresFeld = (typeof KORRIGIERBAR)[number];

export function geaenderteFelder(
  original: Record<string, unknown>, neu: Record<string, unknown>,
): KorrigierbaresFeld[] {
  return KORRIGIERBAR.filter(f => {
    const a = original[f] ?? null, b = neu[f] ?? null;
    return String(a) !== String(b);
  });
}
