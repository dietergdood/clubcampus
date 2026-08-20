/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/getProfilCheck.ts
   Profil-Vollständigkeit und Prüfung. Kein React-Hook (ruft intern
   keine Hooks) — bewusst ohne use-Präfix.

   Was fehlt, entscheidet seit 05.08.2026 die Pflichtfeld-Matrix aus
   der Portalverwaltung, nicht mehr eine hier verdrahtete Liste. Vorher
   prüfte diese Datei Vorname, Nachname, Geburtsdatum und „Telefon oder
   E-Mail" — die Adresse gar nicht. Ein Verein konnte sie also als
   Pflicht konfigurieren, ohne dass es je eine Wirkung hatte.

   Seit 19.08.2026 gilt hier dieselbe Quelle wie beim Anlegen: die
   Mitgliedtyp-Konfiguration. Die frühere zweite Achse `rolle_pflichtfelder`
   ist entfallen — sie konnte nur addieren, nie wegnehmen, ihre Achse war
   ein berechneter Wert (`ableitUndSaveRolle` schreibt `rolle` bei jeder
   Kader-, Team- und Funktionsänderung neu), und netto trug sie drei Felder
   bei, die als pauschale Pflicht alle falsch waren: `fairgate_id` schreibt
   der Sync, eine `js_nr` hat ein Juniorenspieler nicht, und `spielerpass`
   galt auch für Trainer.

   ✅ ANGESCHLOSSEN am 20.08.2026. Bis dahin wurde nichts davon ausgewertet:
   getProfilFehlend() war in clubcampus.tsx destrukturiert und nie
   aufgerufen, und die Datenprüfungs-Masken setzten profil_geprueft_at
   bedingungslos — ein grünes Häkchen ohne Deckung. „Ausstehend" hiess
   „noch nie bestätigt", nicht „unvollständig".

   Jetzt gilt: `pflichtfelderFuer()` reicht die Schlüssel an die Maske, die
   gegen ihr eigenes Formular rechnet und den Bestätigen-Knopf sperrt,
   solange etwas fehlt, das sie selbst erfassen kann. Was nur die Verwaltung
   ändern kann (E-Mail, Spielerpass, Fairgate-ID), wird genannt und sperrt
   nicht — sonst wäre es eine Sackgasse.

   ⚠ NOCH OFFEN: die Elternseite. `kinderVonElternteil()` gibt weiterhin
   eine leere Liste zurück (siehe dort), damit bleibt DatenpruefungEltern
   ohne Prüfung. Eigener Schritt, weil es eine Verhaltensänderung für echte
   Nutzer ist.
   ═══════════════════════════════════════════════════════════════ */
import {
  IMMER_PFLICHT_KEYS,
  getFeldkonfig,
  fuerMitgliedtyp,
  OHNE_MITGLIEDSCHAFT,
  pflichtfelderAus,
  type FeldkonfigZeile,
  type KonfigZiel,
} from '../members/feldkonfig.ts';
import { FELD_LABEL, updateMitglied } from '../members/memberService.ts';
import { updatePerson } from '../person/personService.ts';
import type { Sb, DbUser, Mitglied, Rolle, SetState } from '../../types.js';

interface GetProfilCheckProps {
  sb: Sb;
  dbUser: DbUser | null;
  role: Rolle;
  dbMitglieder: Mitglied[];
  setDbUser: SetState<DbUser | null>;
  /** Die eigene Person. Seit Etappe 4 stehen Vorname, Nachname und Telefon
      dort und nicht mehr an `benutzer` — die Spalten sind gestrichen. Seit
      20.08.2026 auch `profil_geprueft_at`: es gehoert zu PERSON_FELDER, und
      die Altspalte an `benutzer` ist entfallen. */
  eigenePerson?: {
    vorname?: string | null;
    nachname?: string | null;
    telefon?: string | null;
    profil_geprueft_at?: string | null;
  } | null;
  /** Feldkonfiguration aus der Portalverwaltung. Fehlt sie, wird nichts
      verlangt — bewusst: ein leerer Ladezustand darf keinen Hinweis auslösen. */
  feldkonfig?: FeldkonfigZeile[];
  /**
   * Die verknüpften Kinder eines angemeldeten Elternteils, flach.
   *
   * ⚠ Wird HEREINGEREICHT, nicht hier geladen: `getProfilCheck` ist
   * synchron. `clubcampus` holt sie ohnehin schon über
   * `fetchKinderVollstaendigFuerElternteil()` für die Datenprüfungs-Maske —
   * eine zweite Abfrage wäre ein zweiter Ort, an dem dieselbe Liste
   * auseinanderlaufen kann.
   */
  eigeneKinder?: Mitglied[];
}

/* Feldwert eines Mitglieds — leer zählt als fehlend. `Mitglied` ist breit
   typisiert, der Zugriff über einen Schlüssel deshalb bewusst nachsichtig. */
function istLeer(raw: Partial<Mitglied>, feld: string): boolean {
  const wert = (raw as Record<string, unknown>)[feld];
  if (wert === null || wert === undefined) return true;
  if (typeof wert === 'string') return wert.trim() === '';
  if (Array.isArray(wert)) return wert.length === 0;
  return false;
}

export function getProfilCheck({
  sb, dbUser, role, dbMitglieder, setDbUser,
  eigenePerson = null, feldkonfig = [], eigeneKinder = [],
}: GetProfilCheckProps) {

  /* Fehlende Pflichtfelder, als Feld-Labels.

     `ziel` statt `raw.mitgliedtyp`: dieselbe Funktion traegt seit dem
     21.08.2026 beide Faelle — die Mitgliedschaft und die Person ohne. Vorher
     hatte der Elternteil einen fest verdrahteten Satz daneben, also einen
     zweiten Konfigurationsort. */
  function fehlendeFelder(raw: Partial<Mitglied>, ziel: KonfigZiel): string[] {
    const fehlend: string[] = [];

    for (const feld of IMMER_PFLICHT_KEYS) {
      if (istLeer(raw, feld)) fehlend.push(FELD_LABEL[feld] || feld);
    }

    const pflicht = pflichtfelderAus(getFeldkonfig(ziel, feldkonfig));
    for (const feld of pflicht) {
      if (istLeer(raw, feld)) fehlend.push(FELD_LABEL[feld] || feld);
    }
    return fehlend;
  }

  /**
   * Die Kinder eines angemeldeten Elternteils.
   *
   * ✅ ANGESCHLOSSEN am 21.08.2026. Bis dahin gab die Funktion eine feste
   * leere Liste zurück, und davor las sie die Json-Altspalte
   * `mitglieder.eltern` — die `loadDbMitglieder()` NIE befüllt hat. Eltern
   * bekamen deshalb seit jeher keinen Datenprüfungs-Hinweis für ihre Kinder,
   * ohne dass irgendwo etwas fehlschlug.
   *
   * ⚠ Vier Dinge mussten dafür zusammenkommen, drei davon lautlos:
   *   1. `mitglieder_select_kind` — vorher war das Lesen per RLS gesperrt
   *      und lieferte eine leere Einbettung statt eines Fehlers
   *   2. `personen_update_kind` — Schreiben war gesperrt
   *   3. die Achse `ohne_mitgliedschaft` für den Elternteil selbst
   *   4. diese Liste, hereingereicht statt hier geladen
   *
   * Die Verhaltensänderung ist gewollt: ein Elternteil sieht jetzt, was bei
   * seinem Kind fehlt. Bei 372 Junioren ist das die AHV-Nummer.
   */
  function kinderVonElternteil(): typeof dbMitglieder {
    return eigeneKinder as typeof dbMitglieder;
  }

  function getProfilFehlend(): string[] {
    if (!dbUser) return [];
    const isEltern = role === 'eltern' && !dbMitglieder.find(m => m.id === dbUser.mitglied_id);

    if (isEltern) {
      /* OHNE MITGLIEDSCHAFT. Hier stand bis zum 21.08.2026 ein fest
         verdrahteter Satz — Vorname, Nachname, Telefon — mit der Begruendung
         „hat keinen Mitgliedtyp, deshalb keine Matrix". Das war der zweite
         Konfigurationsort, dessen Abbau seit dem 19.08. laeuft: derselbe
         Grund, aus dem `rolle_pflichtfelder` entfallen ist.

         Gelesen wird seit Etappe 4 die PERSON: `benutzer.vorname`,
         `nachname` und `telefon` sind gestrichen, die Angaben stehen an
         `personen`. Fehlt die Person (Ladezustand), wird nichts verlangt —
         ein leerer Zustand darf keinen Hinweis ausloesen. */
      const fehlend: string[] = eigenePerson
        ? fehlendeFelder(eigenePerson as Partial<Mitglied>, OHNE_MITGLIEDSCHAFT)
        : [];

      const kinder = kinderVonElternteil();
      /* Die Kinder sind Mitglieder — für sie greift die Matrix ihres
         Mitgliedtyps, statt wie früher pauschal Geburtsdatum,
         Nationalität und Adresse zu verlangen. */
      kinder.forEach(kind => {
        for (const label of fehlendeFelder(kind, fuerMitgliedtyp(kind.mitgliedtyp))) {
          fehlend.push(`${kind.vorname}: ${label}`);
        }
      });
      return fehlend;
    }

    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id);
    if (!raw) return [];
    return fehlendeFelder(raw, fuerMitgliedtyp(raw.mitgliedtyp));
  }

  function sollProfilPruefen(): boolean {
    if (!dbUser || role === 'administrator' || role === 'administration') return false;
    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id) || null;
    const sechsMonate = new Date();
    sechsMonate.setMonth(sechsMonate.getMonth() - 6);
    /* Nur noch die Person. Die Altspalte `benutzer.profil_geprueft_at` stand
       hier als Rueckfall und verdeckte damit genau die Abweichung, die es
       aufzudecken galt: wer ueber den Overlay bestaetigte, schrieb dorthin,
       die Liste las `personen` — und sollProfilPruefen() sagte trotzdem
       „geprueft". */
    const eigenesGeprueft = raw?.profil_geprueft_at ?? eigenePerson?.profil_geprueft_at ?? null;
    if (!eigenesGeprueft) return true;
    if (new Date(eigenesGeprueft) < sechsMonate) return true;
    if (role === 'eltern') {
      const kinder = kinderVonElternteil();
      for (const kind of kinder) {
        if (!kind.profil_geprueft_at) return true;
        if (new Date(kind.profil_geprueft_at) < sechsMonate) return true;
      }
    }
    return false;
  }

  /**
   * Bestätigt die Datenprüfung — für die eigene Person und, bei Eltern, für
   * die Kinder.
   *
   * ⚠ SCHRIEB BIS ZUM 20.08.2026 NACH `benutzer`. `profil_geprueft_at` gehört
   * aber zur PERSON (`PERSON_FELDER`), und `DatenpruefungMitglied` schrieb
   * über `updateMitglied()` längst dorthin. Zwei Schreiber, zwei Tabellen,
   * dieselbe Aussage — und `sollProfilPruefen()` las beide mit Rückfall, was
   * die Abweichung verdeckte.
   *
   * Wirkung des Fehlers: wer über den Overlay-Weg bestätigte, sah in der
   * Mitgliederliste weiter „Ausstehend" — die liest `personen`. Dieselbe
   * Doppelung wie `hat_portal_zugang`, in Etappe 6c durchgerutscht.
   * `benutzer.profil_geprueft_at` fällt mit migration_profil_geprueft.sql.
   */
  async function markiereProfilGeprueft(): Promise<void> {
    if (!sb || !dbUser) return;
    const now = new Date().toISOString();

    /* Die eigene Person. Über updatePerson und nicht über updateMitglied:
       ein Elternteil hat keine Mitgliedschaft, über die man sie fände. */
    if (dbUser.person_id) {
      await updatePerson(sb as never, dbUser.person_id, { profil_geprueft_at: now });
    } else {
      console.warn('markiereProfilGeprueft: benutzer ohne person_id — nichts geschrieben.', dbUser.id);
    }
    if (role === 'eltern') {
      const kinder = kinderVonElternteil();
      /* profil_geprueft_at gehoert zur Person (PERSON_FELDER) — seit
         Etappe 6a gibt es die Spalte in `mitglieder` nicht mehr. Ueber
         updateMitglied(), damit die Aufteilung an einer Stelle bleibt. */
      for (const kind of kinder) {
        await updateMitglied(sb as never, kind.id, { profil_geprueft_at: now });
      }
    }
    setDbUser(u => u ? { ...u, profil_geprueft_at: now } : u);
  }

  /**
   * Pflichtfeld-SCHLUESSEL eines Mitglieds — dieselbe Quelle wie
   * `getProfilFehlend()`, nur unausgewertet.
   *
   * `getProfilFehlend()` liefert Labels und rechnet gegen die geladene
   * DB-Zeile; die Datenprüfungs-Maske braucht die Schlüssel, um gegen ihr
   * eigenes Formular zu rechnen — sonst bliebe der Knopf gesperrt, bis
   * jemand neu lädt.
   *
   * ⚠ Beide muessen aus derselben Quelle kommen. Zwei Listen, die dasselbe
   * behaupten, laufen auseinander — und dann sperrt die Maske ein Feld, das
   * der Hinweis nicht nennt.
   */
  function pflichtfelderFuer(ziel: KonfigZiel): string[] {
    return [
      ...IMMER_PFLICHT_KEYS,
      ...pflichtfelderAus(getFeldkonfig(ziel, feldkonfig)),
    ];
  }

  return { getProfilFehlend, sollProfilPruefen, markiereProfilGeprueft, pflichtfelderFuer };
}
