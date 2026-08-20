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
  getFeldkonfig, fuerMitgliedtyp, OHNE_MITGLIEDSCHAFT, pflichtfelderFuerZiel, labelFuer,
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
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
}

export function DatenpruefungEltern({
  sb, elternteil, kinder, kinderFehler = null, feldkonfig = [], setPortalMsg, onReload,
}: DatenpruefungElternProps) {
  /* Ausgangswerte einmal festhalten: gespeichert wird nur die Abweichung. */
  const [ausgangEigen] = useState<FelderWerte>(() => werteAusZeile(elternteil));
  const [eigen, setEigen] = useState<FelderWerte>(ausgangEigen);

  const [ausgangKinder] = useState<Record<number, FelderWerte>>(
    () => Object.fromEntries(kinder.map(k => [k.id, werteAusZeile(k as unknown as Record<string, unknown>)])));
  const [kinderWerte, setKinderWerte] = useState<Record<number, FelderWerte>>(ausgangKinder);

  const [saving, setSaving] = useState(false);

  /* Für die eigene Person gilt die Achse „ohne Mitgliedschaft" — 393 der 394
     Elternteile haben keine. */
  const eigeneKonfig = getFeldkonfig(OHNE_MITGLIEDSCHAFT, feldkonfig);

  const eigenerStand = personenStand(
    OHNE_MITGLIEDSCHAFT, feldkonfig, eigen, elternteil as Record<string, unknown>);
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

  async function alleBestaetigen() {
    if (!sb || !kannBestaetigen) return;
    setSaving(true);
    setPortalMsg(null);
    const fehler: string[] = [];

    /* Die eigenen Kontaktdaten. `personen_update_self` trifft genau diese
       Zeile; die Spaltensperre kommt aus der Allowlist im Service. */
    const eigenErg = await updateEigenePerson(sb, elternteil.id, geaenderte(eigen, ausgangEigen), true);
    if (!eigenErg.ok) fehler.push(`Eigene Daten: ${eigenErg.fehler ?? "unbekannter Fehler"}`);

    for (const kind of kinder) {
      const name = vollname(kind);
      const personId = (kind as unknown as { person_id?: string }).person_id;
      /* ⚠ Ohne `person_id` gibt es nichts zu schreiben — und das gehört
         gemeldet. Stillschweigend übersprungen sähe es aus, als wären die
         Daten des Kindes gespeichert worden. */
      if (!personId) { fehler.push(`${name}: keine Person verknüpft.`); continue; }
      const erg = await updateKindDurchElternteil(
        sb, personId, geaenderte(kinderWerte[kind.id] ?? {}, ausgangKinder[kind.id] ?? {}), true);
      if (!erg.ok) fehler.push(`${name}: ${erg.fehler ?? "unbekannter Fehler"}`);
    }

    setSaving(false);
    if (fehler.length > 0) {
      /* ⚠ Kein „Alles bestätigt ✓" über einem fehlgeschlagenen Schreibvorgang.
         Bei RLS gibt es keinen Fehler zu lesen — eine gesperrte Zeile wird
         schlicht nicht getroffen —, deshalb liest der Service gegen. */
      setPortalMsg({ ok: false, text: `Nicht alles konnte gespeichert werden. ${fehler.join(" ")}` });
      return;
    }
    setPortalMsg({ ok: true, text: "Alles bestätigt ✓" });
    if (onReload) setTimeout(onReload, 500);
  }

  return (
    <div className="cc-col cc-gap-16">
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

      <div className="cc-row cc-gap-8 cc-justify-end cc-items-center">
        {!kannBestaetigen && (
          <span className="cc-text-sm cc-text-sub">
            Noch {offeneFelder} {offeneFelder === 1 ? "Feld" : "Felder"} auszufüllen.
          </span>
        )}
        <Btn variant="primary" onClick={alleBestaetigen} disabled={saving || !kannBestaetigen}>
          {saving ? "Speichert…" : "Alles geprüft und korrekt ✓"}
        </Btn>
      </div>
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
  offen, onKlappe, name, stand, children,
}: {
  offen: boolean;
  onKlappe: () => void;
  name: string;
  stand: Stand;
  children: ReactNode;
}) {
  const fehlt = stand.selbst.length;
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
        </div>
      )}
    </Card>
  );
}
