/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungEltern.tsx

   Die halbjährliche Datenprüfung eines Elternteils — für sich
   selbst und für jedes verknüpfte Kind.

   ⚠ WAS SICH AM 21.08.2026 GEÄNDERT HAT

   1. Die Felder kommen aus der KONFIGURATION, nicht aus einer
      Liste in dieser Datei. Für die eigene Person gilt die Achse
      `ohne_mitgliedschaft`, für jedes Kind sein Mitgliedtyp. Was
      dort auf „Gibt es nicht" steht, erscheint hier nicht — ohne
      dass jemand diese Datei anfassen muss.

   2. Die AHV-Nummer ist schreibbar. Sie stand hier als reines
      Lesefeld mit „Nur lesbar — Änderungen durch den
      Administrator" — und genau daran hingen 372 Junioren fest:
      die Nummer steht auf der Krankenkassenkarte des Kindes, der
      Elternteil hat sie, die Verwaltung nicht. Der Weg dorthin
      ist seit `migration_eltern_kind_rechte.sql` offen; hier wird
      er benutzt.

   3. Geschrieben wird über `updateEigenePerson` /
      `updateKindDurchElternteil` — mit Allowlist. Vorher lief der
      Kinder-Zweig über `updateMitglied()`, das jedes Feld aus
      PERSON_FELDER durchreicht.

   4. Ein Fehlschlag wird GEMELDET. Vorher stand am Ende
      bedingungslos „Alles bestätigt ✓", auch wenn RLS jede Zeile
      abgewiesen hätte — eine Erfolgsmeldung ohne Deckung.

   ⚠ WAS SIE WEITERHIN NICHT TUT: sie hält niemanden auf, dessen
   Pflichtfelder leer sind. Das ist der offene Punkt „Die
   Pflichtfeld-Matrizen wirken in der Datenprüfung gar nicht"
   (CLAUDE.md) und gehört an `getProfilFehlend()` angeschlossen —
   an einer Stelle für Mitglied und Elternteil, nicht hier
   nebenbei. Die Sternchen zeigen die Pflicht bereits an.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card } from "../../../theme.ts";
import { updateEigenePerson, updateKindDurchElternteil, elternDuerfen } from "../../../domains/members/kindService.ts";
import { vollname, formatDatum } from "../../../domains/person/personUtils.ts";
import {
  PersonFelderFormular, FORMULAR_FELDER, werteAusZeile, geaenderte,
} from "../../../shared/person/PersonFelderFormular.tsx";
import type { FelderWerte } from "../../../shared/person/PersonFelderFormular.tsx";
import {
  getFeldkonfig, fuerMitgliedtyp, OHNE_MITGLIEDSCHAFT,
} from "../../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile } from "../../../domains/members/feldkonfig.ts";
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
   konfigurierten nicht zu unterscheiden; wer seine E-Mail sucht und sie
   nirgends findet, meldet einen Fehler. Quelle ist die Allowlist im Service,
   nicht eine zweite Liste hier. */
const GESPERRT: ReadonlySet<string> = new Set(FORMULAR_FELDER.filter(k => !elternDuerfen(k)));

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
   * hat die Maske das Erste behauptet, während das Zweite galt: die Abfrage
   * lief in einen 400er, und `(data || [])` machte daraus eine leere Liste.
   * Ein Satz, der das Falsche sagt, ist schlimmer als keiner.
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
     Elternteile haben keine. Wer daneben auch Mitglied ist, sieht seine
     Vereinsdaten im Profil, nicht hier: diese Maske pflegt Personendaten. */
  const eigeneKonfig = getFeldkonfig(OHNE_MITGLIEDSCHAFT, feldkonfig);

  function setKindFeld(mitgliedId: number, schluessel: string, wert: string) {
    setKinderWerte(prev => ({ ...prev, [mitgliedId]: { ...prev[mitgliedId], [schluessel]: wert } }));
  }

  async function alleBestaetigen() {
    if (!sb) return;
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
         schlicht nicht getroffen —, deshalb liest der Service gegen und meldet
         es hier zurück. */
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

      {/* Eigene Kontaktdaten */}
      <Card>
        <div className="cc-text-bold cc-text-lg cc-mb-4">Meine Kontaktdaten</div>
        <div className="cc-text-sm cc-text-sub cc-mb-16">Prüfe deine eigenen Angaben.</div>
        <PersonFelderFormular
          konfig={eigeneKonfig}
          werte={eigen}
          onChange={(k, v) => setEigen(prev => ({ ...prev, [k]: v }))}
          gesperrt={GESPERRT}
          gesperrtHinweis="E-Mail-Adresse nur durch den Administrator änderbar — sie ist zugleich der Login-Name."
        />
      </Card>

      {/* Pro Kind eine Karte.

          ⚠ Kein stilles Nichts bei leerer Liste. Ein Elternteil, dessen
          Verknuepfung fehlt, saehe sonst nur seine eigene Karte — und haette
          keinen Anhaltspunkt, dass hier etwas fehlt. „Keine Kinder" und „die
          Kinder konnten nicht geladen werden" sehen von aussen gleich aus;
          gesagt werden muss es trotzdem. */}
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
      {kinder.map(kind => (
        <Card key={kind.id}>
          <div className="cc-row cc-gap-8 cc-items-center cc-mb-16">
            <div className="cc-av cc-av-sm" style={{ background: "var(--cc-accent)", color: "#000", fontSize: 11, fontWeight: 700 }}>
              {vollname(kind).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="cc-text-bold cc-text-lg">{vollname(kind)}</div>
          </div>
          {/* Die Achse des Kindes ist sein Mitgliedtyp — ein Juniorenmitglied
              zeigt andere Felder als ein Aktivmitglied. */}
          <PersonFelderFormular
            konfig={getFeldkonfig(fuerMitgliedtyp(kind.mitgliedtyp), feldkonfig)}
            werte={kinderWerte[kind.id] ?? {}}
            onChange={(k, v) => setKindFeld(kind.id, k, v)}
            gesperrt={GESPERRT}
            gesperrtHinweis="E-Mail-Adresse nur durch den Administrator änderbar."
          />
        </Card>
      ))}

      <div className="cc-row cc-gap-8 cc-justify-end">
        <Btn variant="primary" onClick={alleBestaetigen} disabled={saving}>
          {saving ? "Speichert…" : "Alles geprüft und korrekt ✓"}
        </Btn>
      </div>
    </div>
  );
}
