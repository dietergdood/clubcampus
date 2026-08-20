/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungEltern.tsx

   Die halbjährliche Datenprüfung eines Elternteils — für sich
   selbst und für jedes verknüpfte Kind.

   ⚠ WAS SICH AM 21.08.2026 GEÄNDERT HAT

   1. Die Felder kommen aus der KONFIGURATION, nicht aus einer
      Liste in dieser Datei. Für die eigene Person gilt die Achse
      `ohne_mitgliedschaft`, für jedes Kind sein Mitgliedtyp.

   2. Die AHV-Nummer ist schreibbar. Daran hingen 372 Junioren
      fest: die Nummer steht auf der Krankenkassenkarte des
      Kindes, der Elternteil hat sie, die Verwaltung nicht.

   3. Geschrieben wird über `updateEigenePerson` /
      `updateKindDurchElternteil` — mit Allowlist.

   4. Ein Fehlschlag wird GEMELDET, nicht als Erfolg verkleidet.

   ⚠ ZWEI ANLÄSSE, ZWEI KNÖPFE (20.08.2026)

   Bis dahin machte EIN Knopf beides: er schrieb die Feldwerte und
   setzte `profil_geprueft_at`. Wer im März eine Nummer korrigierte,
   verschob damit den Prüftermin auf September — ohne dass jemand
   das Profil durchgesehen hätte.

     Speichern  PRO KARTE, der Normalfall unter dem Jahr. Schreibt
                nur diese eine Person, rührt das Datum NICHT an, und
                sperrt NICHT bei fehlenden Pflichtfeldern: wer seine
                Adresse korrigieren will, darf daran nicht scheitern,
                dass die AHV-Nummer leer ist.
     Prüfen     ein Balken oben, NUR wenn der Verein darum bittet.
                Setzt nur das Datum, für alle Personen gemeinsam, und
                verlangt Vollständigkeit.

   Vollständigkeit ist die Forderung der Prüfung, nicht der Änderung.
   Bei drei Kindern arbeitet man so eines nach dem anderen ab, statt
   am Schluss alles gleichzeitig abzuschicken.

   ⚠ WAS AM 20.08.2026 DAZUKAM: DIE SPERRE

   Bis dahin liess sich „Alles geprüft und korrekt ✓" drücken,
   während Pflichtfelder leer waren. Das Sternchen am Feld kam aus
   `istPflicht()`, der Knopf war an nichts gebunden — eine Anzeige,
   die eine Regel behauptet, die es nicht gibt.

   Gerechnet wird gegen die FORMULARWERTE, nicht gegen die
   DB-Zeile: sonst bliebe der Knopf gesperrt, bis jemand neu lädt.

   Und in zwei Gruppen, wie in `DatenpruefungMitglied`:

     selbst      Pflichtfeld, das dieses Formular erfasst → sperrt
     Verwaltung  gesperrt (E-Mail) oder gar nicht darstellbar
                 (Spielerpass, Fairgate-ID) → wird genannt, sperrt
                 nicht

   Jemanden für ein Feld zu sperren, das er nicht ändern kann, wäre
   eine Sackgasse. Deshalb zählt auch die Pille im Kartenkopf NUR
   die Gruppe „selbst" — sonst stünde dort eine Zahl, die sich nie
   auf null bringen liesse.

   ⚠ EINE RECHNUNG FÜR PILLE UND SPERRE. Zwei Zähler wären
   derselbe Fehler wie zwei Pflichtfeldlisten: sie laufen
   auseinander, und dann sperrt der Knopf, während die Karte
   „Vollständig" sagt. `personenStand()` liefert beides.

   ⚠ DER LETZTE REST DER KETTE BLEIBT LIEGEN: `getProfilFehlend()`
   ist weiterhin nirgends aufgerufen. Diese Maske sperrt jetzt —
   das Pflicht-Overlay beim Login nennt aber immer noch kein
   einziges fehlendes Feld, es schaut nur auf das Alter von
   `profil_geprueft_at`. Siehe CLAUDE.md, „Die Pflichtfeld-Matrizen
   wirken in der Datenprüfung gar nicht".
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { ReactNode } from "react";
import { Btn, Card } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { updateEigenePerson, updateKindDurchElternteil, elternDuerfen } from "../../../domains/members/kindService.ts";
import { vollname, formatDatum } from "../../../domains/person/personUtils.ts";
import {
  PersonFelderFormular, FORMULAR_FELDER, werteAusZeile, geaenderte,
} from "../../../shared/person/PersonFelderFormular.tsx";
import type { FelderWerte } from "../../../shared/person/PersonFelderFormular.tsx";
import {
  getFeldkonfig, fuerMitgliedtyp, fuerPersonenart, pflichtfelderFuerZiel, labelFuer,
} from "../../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile, KonfigZiel } from "../../../domains/members/feldkonfig.ts";
import type { Mitglied, Sb } from "../../../types.ts";
import type { StatusMeldung } from "./DatenpruefungTab.tsx";

/** Die eigene Zeile aus `personen`. */
export interface ElternteilPerson {
  id: string;
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  profil_geprueft_at?: string | null;
  [feld: string]: unknown;
}

/* Was die Selbstbedienung nicht schreiben darf, wird ANGEZEIGT und gesperrt —
   nicht weggelassen. Ein Feld, das verschwindet, ist von einem nicht
   konfigurierten nicht zu unterscheiden. Quelle ist die Allowlist im Service,
   nicht eine zweite Liste hier. */
const GESPERRT: ReadonlySet<string> = new Set(FORMULAR_FELDER.filter(k => !elternDuerfen(k)));
const DARSTELLBAR: ReadonlySet<string> = new Set(FORMULAR_FELDER);

/** Was eine Person zum Bestätigen noch braucht. */
export interface Stand {
  /** Pflichtfelder, die dieses Formular erfasst und die leer sind. Sperrt. */
  selbst: string[];
  /** Pflichtfelder, an die nur die Verwaltung kommt. Sperrt nicht. */
  verwaltung: string[];
}

/**
 * Die EINE Rechnung — für die Pille im Kartenkopf und für die Sperre.
 *
 * `werte` sind die Formularwerte (das, was auf dem Schirm steht), `zeile` die
 * geladene DB-Zeile für alles, was das Formular gar nicht darstellt.
 */
export function personenStand(
  ziel: KonfigZiel,
  feldkonfig: readonly FeldkonfigZeile[],
  werte: FelderWerte,
  zeile: Record<string, unknown>,
): Stand {
  const selbst: string[] = [];
  const verwaltung: string[] = [];

  for (const key of pflichtfelderFuerZiel(ziel, feldkonfig)) {
    const eigenhaendig = DARSTELLBAR.has(key) && !GESPERRT.has(key);
    const wert = eigenhaendig ? werte[key] : zeile[key];
    const leer = wert === null || wert === undefined || String(wert).trim() === "";
    if (!leer) continue;
    (eigenhaendig ? selbst : verwaltung).push(key);
  }
  return { selbst, verwaltung };
}

interface DatenpruefungElternProps {
  sb: Sb;
  /**
   * Das angemeldete Elternteil als Personenzeile.
   *
   * ⚠ Hiess bis zum 21.08.2026 `elternkontakt` — ein Name aus der Zeit vor
   * dem Personen-Umbau. Die Tabelle `elternkontakte` wird seit Etappe 3
   * weder gelesen noch geschrieben.
   */
  elternteil: ElternteilPerson;
  kinder: Mitglied[];
  /**
   * Warum die Kinderliste leer ist, falls sie es ist.
   *
   * ⚠ „Keine Kinder verknüpft" und „die Liste konnte nicht geladen werden"
   * sehen von aussen gleich aus — beide Male steht nichts da. Am 20.08.2026
   * hat die Maske das Erste behauptet, während das Zweite galt.
   */
  kinderFehler?: string | null;
  /** Zeilen aus `mitgliedtyp_feldkonfig`, vom Portal durchgereicht. */
  feldkonfig?: FeldkonfigZeile[];
  /**
   * Die bestimmende Art des Elternteils — seit dem 20.08.2026 entscheidet
   * sie den Feldsatz, nicht mehr ein Sammelwert fuer alle 401 Personen
   * ohne Mitgliedschaft. `null` heisst „keine Art": struktureller Standard.
   */
  eigeneArtId?: string | null;
  /**
   * Bittet der Verein gerade um eine Prüfung?
   *
   * ⚠ Quelle ist `sollProfilPruefen()` — die Sechs-Monats-Regel steht dort
   * und darf hier nicht ein zweites Mal stehen. Ohne die Prop erscheint der
   * Balken NICHT: den Rest des Jahres ist das hier eine normale Profilseite.
   */
  pruefungFaellig?: boolean;
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
}

export function DatenpruefungEltern({
  sb, elternteil, kinder, kinderFehler = null, feldkonfig = [], eigeneArtId = null,
  pruefungFaellig = false, setPortalMsg, onReload,
}: DatenpruefungElternProps) {
  /* Ausgangswerte: gespeichert wird nur die Abweichung — und daran haengt
     auch, ob eine Karte „ungespeicherte Aenderungen" hat. Nach dem Speichern
     werden sie nachgezogen, statt die Maske neu zu laden: ein Reload klappte
     alle Karten zurueck, mitten in der Arbeit. */
  const [ausgangEigen, setAusgangEigen] = useState<FelderWerte>(() => werteAusZeile(elternteil));
  const [eigen, setEigen] = useState<FelderWerte>(ausgangEigen);

  const [ausgangKinder, setAusgangKinder] = useState<Record<number, FelderWerte>>(
    () => Object.fromEntries(kinder.map(k => [k.id, werteAusZeile(k as unknown as Record<string, unknown>)])));
  const [kinderWerte, setKinderWerte] = useState<Record<number, FelderWerte>>(ausgangKinder);

  const [saving, setSaving] = useState(false);

  /* Für die eigene Person gilt die Achse „ohne Mitgliedschaft" — 393 der 394
     Elternteile haben keine. */
  const eigeneKonfig = getFeldkonfig(fuerPersonenart(eigeneArtId), feldkonfig);

  const eigenerStand = personenStand(
    fuerPersonenart(eigeneArtId), feldkonfig, eigen, elternteil as Record<string, unknown>);
  const kinderStand = kinder.map(kind => personenStand(
    fuerMitgliedtyp(kind.mitgliedtyp), feldkonfig,
    kinderWerte[kind.id] ?? {}, kind as unknown as Record<string, unknown>));

  /* Die Sperre. Dieselbe Rechnung wie die Pillen — nicht eine zweite. */
  const offeneFelder = eigenerStand.selbst.length + kinderStand.reduce((n, s) => n + s.selbst.length, 0);
  const kannBestaetigen = offeneFelder === 0;

  /* Offen ist, was unvollständig ist. Einmal beim Aufbau bestimmt: sonst
     klappte die Karte zu, sobald der Nutzer das letzte Feld ausfüllt — mitten
     im Tippen. */
  const [offen, setOffen] = useState<Record<string, boolean>>(() => {
    const start: Record<string, boolean> = { eigen: eigenerStand.selbst.length > 0 };
    kinder.forEach((kind, i) => { start[`kind-${kind.id}`] = kinderStand[i].selbst.length > 0; });
    return start;
  });
  const klappe = (key: string) => setOffen(p => ({ ...p, [key]: !p[key] }));

  function setKindFeld(mitgliedId: number, schluessel: string, wert: string) {
    setKinderWerte(prev => ({ ...prev, [mitgliedId]: { ...prev[mitgliedId], [schluessel]: wert } }));
  }

  /* Hat eine Karte ungespeicherte Aenderungen? */
  const eigenGeaendert = Object.keys(geaenderte(eigen, ausgangEigen)).length > 0;
  const kindGeaendert = (id: number) =>
    Object.keys(geaenderte(kinderWerte[id] ?? {}, ausgangKinder[id] ?? {})).length > 0;
  const etwasUngespeichert = eigenGeaendert || kinder.some(k => kindGeaendert(k.id));

  /** Speichern einer EINZELNEN Person — ohne das Prüfdatum anzufassen. */
  async function speichereEigen(): Promise<string | null> {
    if (!sb) return "Keine Verbindung zur Datenbank.";
    const erg = await updateEigenePerson(sb, elternteil.id, geaenderte(eigen, ausgangEigen), false);
    if (!erg.ok) return erg.fehler ?? "unbekannter Fehler";
    setAusgangEigen(eigen);
    return null;
  }

  async function speichereKind(kind: Mitglied): Promise<string | null> {
    if (!sb) return "Keine Verbindung zur Datenbank.";
    const personId = (kind as unknown as { person_id?: string }).person_id;
    /* ⚠ Ohne `person_id` gibt es nichts zu schreiben — und das gehoert
       gemeldet. Stillschweigend uebersprungen saehe es aus, als waeren die
       Daten des Kindes gespeichert worden. */
    if (!personId) return "keine Person verknüpft.";
    const erg = await updateKindDurchElternteil(
      sb, personId, geaenderte(kinderWerte[kind.id] ?? {}, ausgangKinder[kind.id] ?? {}), false);
    if (!erg.ok) return erg.fehler ?? "unbekannter Fehler";
    setAusgangKinder(prev => ({ ...prev, [kind.id]: kinderWerte[kind.id] ?? {} }));
    return null;
  }

  /**
   * Die Prüfung — der andere Anlass.
   *
   * ⚠ Schreibt NUR das Datum, für alle Personen gemeinsam. Die Felder sind zu
   * diesem Zeitpunkt gespeichert, sonst käme man hier nicht vorbei:
   * ungespeicherte Änderungen sperren den Knopf. „Geprüft" bezieht sich auf
   * das, was in der Datenbank steht — nicht auf das, was im Formular steht.
   */
  async function bestaetigen() {
    if (!sb || !kannBestaetigen || etwasUngespeichert) return;
    setSaving(true);
    setPortalMsg(null);
    const fehler: string[] = [];

    const eigenErg = await updateEigenePerson(sb, elternteil.id, {}, true);
    if (!eigenErg.ok) fehler.push(`Eigene Daten: ${eigenErg.fehler ?? "unbekannter Fehler"}`);

    for (const kind of kinder) {
      const personId = (kind as unknown as { person_id?: string }).person_id;
      if (!personId) { fehler.push(`${vollname(kind)}: keine Person verknüpft.`); continue; }
      const erg = await updateKindDurchElternteil(sb, personId, {}, true);
      if (!erg.ok) fehler.push(`${vollname(kind)}: ${erg.fehler ?? "unbekannter Fehler"}`);
    }

    setSaving(false);
    if (fehler.length > 0) {
      /* ⚠ Kein „bestätigt ✓" über einem fehlgeschlagenen Schreibvorgang. Bei
         RLS gibt es keinen Fehler zu lesen — eine gesperrte Zeile wird
         schlicht nicht getroffen —, deshalb liest der Service gegen. */
      setPortalMsg({ ok: false, text: `Nicht alles konnte bestätigt werden. ${fehler.join(" ")}` });
      return;
    }
    setPortalMsg({ ok: true, text: "Angaben bestätigt ✓" });
    if (onReload) setTimeout(onReload, 500);
  }

  return (
    <div className="cc-col cc-gap-16">
      {/* ⚠ NUR wenn die Prüfung fällig ist. Den Rest des Jahres ist das hier
          eine Profilseite, auf der man seine Adresse ändert — ein Aufruf, der
          immer dasteht, wird zur Tapete und dann nicht mehr gelesen. */}
      {pruefungFaellig && (
        <Card className="cc-card-rahmen-akzent">
          <div className="cc-between cc-items-center cc-gap-12">
            <div>
              <div className="cc-text-bold cc-text-lg">Der Verein bittet um Prüfung deiner Angaben</div>
              <div className="cc-text-sm cc-text-sub cc-mt-4">
                {!kannBestaetigen
                  ? `Noch ${offeneFelder} ${offeneFelder === 1 ? "Feld" : "Felder"} auszufüllen — die Karten mit Rahmen zeigen, wo.`
                  : etwasUngespeichert
                    ? "Es gibt ungespeicherte Änderungen — bitte zuerst speichern."
                    : "Stimmt alles? Dann bestätige es hier."}
              </div>
            </div>
            {/* ⚠ „Meine Angaben" statt „Alles": Pflichtfelder, an die nur die
                Verwaltung kommt, sperren nicht — sonst sässe die Person in
                einer Sackgasse. Dann darf die Zusage aber auch nicht mehr
                behaupten, als sie deckt. Entschieden am 20.08.2026 (Didi). */}
            <Btn variant="primary" onClick={bestaetigen}
                 disabled={saving || !kannBestaetigen || etwasUngespeichert}>
              {saving ? "Speichert…" : "Meine Angaben sind korrekt ✓"}
            </Btn>
          </div>
        </Card>
      )}

      {/* Profil-Status */}
      <Card>
        <div className="cc-between">
          <div>
            <div className="cc-text-bold cc-text-lg">Profil-Status</div>
            <div className="cc-text-sm cc-mt-4">
              {elternteil.profil_geprueft_at
                ? `Zuletzt bestätigt am ${formatDatum(elternteil.profil_geprueft_at)}`
                : "Noch nie bestätigt"}
            </div>
          </div>
          <span className={`cc-badge ${elternteil.profil_geprueft_at ? "cc-badge-success" : "cc-badge-warning"}`}>
            {elternteil.profil_geprueft_at ? "Geprüft" : "Ausstehend"}
          </span>
        </div>
      </Card>

      <div className="cc-section-title">Meine Angaben</div>
      <PersonKarte
        offen={offen.eigen} onKlappe={() => klappe("eigen")}
        name={vollname(elternteil as never) || "Ich"}
        stand={eigenerStand}
        geaendert={eigenGeaendert}
        onSpeichern={speichereEigen}
      >
        <PersonFelderFormular
          konfig={eigeneKonfig}
          werte={eigen}
          onChange={(k, v) => setEigen(prev => ({ ...prev, [k]: v }))}
          gesperrt={GESPERRT}
          gesperrtHinweis="E-Mail-Adresse nur durch den Administrator änderbar — sie ist zugleich der Login-Name."
        />
      </PersonKarte>

      <div className="cc-section-title">Meine Kinder ({kinder.length})</div>

      {/* ⚠ Kein stilles Nichts bei leerer Liste: „keine Kinder" und „konnte
          nicht geladen werden" sehen von aussen gleich aus. */}
      {kinder.length === 0 && kinderFehler && (
        <Card>
          <div className="cc-text-bold cc-text-lg cc-mb-4">Die Kinder konnten nicht geladen werden</div>
          <div className="cc-text-sm cc-text-danger">{kinderFehler}</div>
          <div className="cc-text-sm cc-text-sub cc-mt-4">
            Deine eigenen Angaben lassen sich trotzdem prüfen und bestätigen.
            Bitte melde den Fehler dem Vereinsadministrator.
          </div>
        </Card>
      )}
      {kinder.length === 0 && !kinderFehler && (
        <Card>
          <div className="cc-text-bold cc-text-lg cc-mb-4">Keine Kinder verknüpft</div>
          <div className="cc-text-sm cc-text-sub">
            Mit deinem Konto ist zurzeit kein Kind verknüpft. Wenn das nicht stimmt,
            melde es dem Vereinsadministrator — er verknüpft es im Profil des Kindes
            unter „Eltern".
          </div>
        </Card>
      )}

      {kinder.map((kind, i) => (
        <PersonKarte
          key={kind.id}
          offen={offen[`kind-${kind.id}`]} onKlappe={() => klappe(`kind-${kind.id}`)}
          name={vollname(kind)}
          stand={kinderStand[i]}
          geaendert={kindGeaendert(kind.id)}
          onSpeichern={() => speichereKind(kind)}
        >
          {/* Die Achse des Kindes ist sein Mitgliedtyp — ein Juniorenmitglied
              zeigt andere Felder als ein Aktivmitglied. */}
          <PersonFelderFormular
            konfig={getFeldkonfig(fuerMitgliedtyp(kind.mitgliedtyp), feldkonfig)}
            werte={kinderWerte[kind.id] ?? {}}
            onChange={(k, v) => setKindFeld(kind.id, k, v)}
            gesperrt={GESPERRT}
            gesperrtHinweis="E-Mail-Adresse nur durch den Administrator änderbar."
          />
        </PersonKarte>
      ))}

    </div>
  );
}

/* ── Eine Klappkarte pro Person ──────────────────────────────────────────
   Auch die eigenen Angaben sind eine: gleich gebaut heisst gleich zu lesen.

   ⚠ Auf MODULEBENE, nicht innerhalb von DatenpruefungEltern. Eine Komponente,
   die in einer anderen deklariert wird, entsteht bei jedem Render neu — React
   hängt den Teilbaum ab und neu an, und jedes Eingabefeld darin verlöre bei
   jedem Tastendruck den Fokus (CLAUDE.md). Genau das wäre hier fatal: in
   diesen Karten wird getippt. */
function PersonKarte({
  offen, onKlappe, name, stand, geaendert, onSpeichern, children,
}: {
  offen: boolean;
  onKlappe: () => void;
  name: string;
  stand: Stand;
  /** Ungespeicherte Änderungen in DIESER Karte. */
  geaendert: boolean;
  /** Speichert nur diese Person. Gibt die Fehlermeldung zurück, oder `null`. */
  onSpeichern: () => Promise<string | null>;
  children: ReactNode;
}) {
  const fehlt = stand.selbst.length;
  /* Die Rueckmeldung steht IN der Karte, nicht als globale Meldung: bei drei
     Kindern muss man sehen, welche gespeichert hat. */
  const [speichert, setSpeichert] = useState(false);
  const [meldung, setMeldung] = useState<StatusMeldung | null>(null);

  async function speichern() {
    setSpeichert(true);
    setMeldung(null);
    const fehler = await onSpeichern();
    setSpeichert(false);
    setMeldung(fehler ? { ok: false, text: fehler } : { ok: true, text: "Gespeichert ✓" });
  }

  const initialen = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <Card className={fehlt > 0 ? "cc-card-rahmen-akzent" : ""}>
      <button type="button" className="cc-klappkarte-kopf" onClick={onKlappe} aria-expanded={offen}>
        <TI n={offen ? "chevron-up" : "chevron-down"} size={16} className="cc-klappkarte-chevron"/>
        <div className="cc-av cc-av-sm" style={{ background: "var(--cc-accent)", color: "#000", fontSize: 11, fontWeight: 700 }}>
          {initialen}
        </div>
        <span className="cc-text-bold cc-text-lg cc-flex-1">{name}</span>
        {/* Zählt NUR „selbst": was allein die Verwaltung ändern kann, liesse
            sich nie auf null bringen und stünde für immer als Mangel da. */}
        <span className={`cc-badge ${fehlt > 0 ? "cc-badge-warning" : "cc-badge-success"}`}>
          {fehlt > 0 ? `${fehlt} fehlt` : "Vollständig"}
        </span>
      </button>

      {offen && (
        <div className="cc-mt-16">
          {stand.verwaltung.length > 0 && (
            /* Getrennt genannt, nicht mit dem Obigen vermischt: hier kann der
               Nutzer nichts tun, und ein Hinweis, den man nicht befolgen kann,
               gehört als solcher gekennzeichnet. */
            <div className="cc-text-sm cc-text-sub cc-mb-16">
              Nur durch die Vereinsverwaltung zu ergänzen:{" "}
              {stand.verwaltung.map(k => labelFuer(k)).join(" · ")}
            </div>
          )}
          {children}

          {/* ⚠ Speichern sperrt NICHT bei fehlenden Pflichtfeldern. Wer seine
              Adresse korrigieren will, darf daran nicht scheitern, dass die
              AHV-Nummer leer ist — Vollstaendigkeit ist die Forderung der
              PRUEFUNG, nicht der Aenderung. Und es setzt `profil_geprueft_at`
              nicht: wer im Maerz eine Nummer aendert, hat nicht das ganze
              Profil durchgesehen. */}
          <div className="cc-row cc-gap-8 cc-justify-end cc-items-center cc-mt-16">
            {meldung && (
              <span className={meldung.ok ? "cc-text-sm cc-text-success" : "cc-text-sm cc-text-danger"}>
                {meldung.text}
              </span>
            )}
            <Btn onClick={speichern} disabled={speichert || !geaendert}>
              {speichert ? "Speichert…" : "Speichern"}
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
