/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/AustrittModal.tsx

   „Diese Person tritt aus — was gilt danach?"

   Statuten Artikel 8: der Austritt ist ein ZEITPUNKT. Was danach
   mit der Person geschieht, ist eine eigene Frage, und sie wird
   GESTELLT statt geraten. Bis zum 20.08.2026 gab es hier nur
   „Archivieren" — der Kontakt war damit weg, ohne dass jemand das
   entschieden hätte.

   Drei der vier Antworten halten den Kontakt. Das ist der Punkt.

   ⚠ ZWEI ACHSEN, SEIT 22.08.2026 AUCH IM TYP. „Ehrenmitglied" und
   „Aktivmitglied" sind ein TYPWECHSEL — die Mitgliedschaft bleibt.
   „Beenden" und „Archiv" sind ein ENDE. Vorher standen alle vier als
   Zeichenketten in einer Reihe, und der Unterschied lebte nur im Kopf
   des Aufrufers.

   ⚠ UND DIE TYPEN KOMMEN AUS DER DATENBANK. Fest verdrahtet waren nur
   „Ehrenmitglied" und „Aktivmitglied" — dieselbe Bauart wie die
   Spaltenköpfe der Pflichtfeld-Matrix, die am 05.08.2026 auf nicht
   existierende Typen zeigten. Gefehlt hat vor allem
   **Pausenmitglied**: der Typ, der wörtlich „kommt vielleicht wieder"
   bedeutet, war als Antwort nicht wählbar.

   Gezeigt werden ALLE aktiven Typen, keine gepflegte Auswahl. Eine
   zweite Liste, die jemand pflegen muss, veraltet — und
   „Juniorenmitglied" beim Austritt eines Erwachsenen ist sichtbar
   unsinnig, also wählt es niemand. Eine falsche Auswahl, die man
   sieht, ist besser als eine richtige, die veraltet.
   (Entscheidung Didi, 22.08.2026.)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, Input, InfoBox, Col, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, SPACE, TEXT } from "../../constants.ts";
import type { AustrittsZiel } from "../../domains/members/supporterService.ts";

/** Die Auswahl im Modal — ein Schlüssel je Zeile, damit der Radio-Knopf
    einen String hat und nicht ein Objekt. */
type ZielKey = "beenden" | `typ:${string}`;

export interface AustrittModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  /** Aktueller Mitgliedtyp — wird als Hinweis gezeigt. */
  mitgliedtyp?: string | null;
  hatKonto?: boolean;
  /** Alle aktiven Mitgliedtypen, für den Typwechsel. Aus `mitgliedtypen`,
      nicht aus dem Code. */
  mitgliedtypen?: { name: string }[];
  /** Name der eingestellten Art nach dem Austritt (`vereine.austritt_art_id`
      → `personenarten.name`). Fehlt sie, sagt das Modal das auch — es
      behauptet nicht „Supporter". */
  austrittsart?: string | null;
  onAustritt: (
    ziel: AustrittsZiel,
    am: string,
    extras: { offenePunkte: string | null; zugangBeenden: boolean },
  ) => Promise<{ fehler: string | null; hinweise: string[] }>;
}

export function AustrittModal({
  open, onClose, name, mitgliedtyp = null, hatKonto = false,
  mitgliedtypen = [], austrittsart = null, onAustritt,
}: AustrittModalProps) {
  const [ziel, setZiel]       = useState<ZielKey | "">("");
  const [am, setAm]           = useState("");
  /* ⚠ Zwei Fragen, zwei Zustaende — nicht ein Wort, das beides meint. */
  const [offen, setOffen]     = useState("");
  const [zugangWeg, setZugangWeg] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [fehler, setFehler]   = useState<string | null>(null);
  const [hinweise, setHinweise] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setZiel("");
    setAm(new Date().toISOString().slice(0, 10));
    setOffen("");
    setZugangWeg(false);
    setFehler(null);
    setHinweise([]);
  }, [open]);

  /* ⚠ DIE SIEBEN MITGLIEDTYP-OPTIONEN SIND AM 24.08.2026 GEFALLEN — und der
     Grund gehoert hierher, sonst baut sie jemand als Bequemlichkeit wieder
     ein:

       ES GIBT DEN WEG SCHON. `InfoTab` hat den Mitgliedtyp als
       Inline-Auswahl in der Vereinsdaten-Karte. Der Dialog war nicht der
       einzige Zugang — er war der ZWEITE.

       UND DER SCHLECHTERE. Das Inline-Feld schreibt ueber `useInlineEdit`
       und protokolliert die Aenderung (`logAenderung`). Der Typwechsel hier
       schrieb `mitgliedtyp` + `updated_at` und sonst nichts — kein Eintrag im
       Verlauf. Wer den Typ ueber den Austrittsdialog wechselte, hinterliess
       keine Spur.

     Dazu kam die Benennung: acht Antworten auf „Was gilt danach?", sieben
     davon mit dem Text „Kein Austritt" — ein Dialog fuer zwei verschiedene
     Sachen, benannt nach einer davon.

     Beim Austritt gibt es nur EINE Antwort: die Person wird zur eingestellten
     Art. Deshalb steht hier kein Auswahlfeld mehr, sondern ein Satz. */


  async function ausfuehren() {
    setSaving(true);
    setFehler(null);
    const { fehler: f, hinweise: h } = await onAustritt({ art: "beenden" }, am, {
      offenePunkte: offen.trim() || null,
      zugangBeenden: zugangWeg,
    });
    setSaving(false);
    if (f) { setFehler(f); return; }
    /* Nicht sofort schliessen: die Hinweise sagen, was tatsächlich geschehen
       ist — beendete Kadereinträge, beendete Ämter, der Verbleib des Kontos.
       Ein Modal, das nach getaner Arbeit zugeht, lässt genau das ungesagt. */
    setHinweise(h.length > 0 ? h : ["Erledigt."]);
  }

  const fertig = hinweise.length > 0;

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={520}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{name} — Austritt</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>
      </div>

      <div className="cc-modal-body">
        {fertig ? (
          <>
            <InfoBox color={BL} text="Erledigt. Was dabei geschehen ist:" />
            <Col gap={SPACE[2]}>
              {hinweise.map((h, i) => (
                <div key={i} style={{ fontSize: TEXT.base }}>· {h}</div>
              ))}
            </Col>
          </>
        ) : (
          <>
            {/* ⚠ EIN SATZ, KEINE AUSWAHL. Beim Austritt gibt es nur eine
                Antwort: die Person wird zur eingestellten Art. Hier standen
                bis zum 24.08.2026 acht Optionen — sieben davon
                Mitgliedtyp-Wechsel, jede mit dem Text „Kein Austritt".

                ⚠ Der Satz nennt die Art beim Namen, statt sie zu verschweigen.
                Fehlt sie, sagt er DAS — und behauptet keine Ursache: sie kann
                fehlen ODER nicht geladen sein, und beides sieht von hier gleich
                aus. */}
            <InfoBox color={BL} text={
              austrittsart
                ? `Die Mitgliedschaft endet${mitgliedtyp ? ` (heute ${mitgliedtyp})` : ""}. Die Person gilt danach als ${austrittsart} und bleibt für Nachrichten und Anfragen erreichbar — kein Beitrag, kein Stimmrecht.`
                : `Die Mitgliedschaft endet${mitgliedtyp ? ` (heute ${mitgliedtyp})` : ""}. Die Person bleibt erreichbar. ⚠ Es ist keine Art nach dem Austritt bekannt — bitte in der Portalverwaltung unter Mitglieder-Konfiguration prüfen.`} />

            <div className="cc-section-title">Austrittsdatum</div>
            <label className="cc-field">
              <Label>Tag des Austritts</Label>
              <Input type="date" value={am} onChange={e => setAm(e.target.value)} />
            </label>

          {/* ⚠ ZWEI FRAGEN, DIE FRUEHER IN „ARCHIV" STECKTEN — jetzt einzeln
                und beantwortbar. Sie gelten unabhaengig vom Ziel: auch ein
                Typwechsel kann etwas offen lassen. */}
            <div className="cc-section-title">Danach noch offen?</div>
            <label className="cc-field">
              <Label>Was ist offen? (leer = nichts)</Label>
              <Input value={offen} onChange={e => setOffen(e.target.value)}
                     placeholder="z.B. Beitrag 2026, Tenue nicht zurück" />
            </label>
            {offen.trim() !== "" && (
              <InfoBox color={AM} text="Die Person erscheint im Archiv, bis der Vermerk entfernt wird." />
            )}

            {hatKonto && (
              <label className="cc-row cc-gap-6" style={{ marginTop: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={zugangWeg}
                       onChange={e => setZugangWeg(e.target.checked)} />
                <span>Portal-Zugang beenden</span>
              </label>
            )}

            {/* Was der Austritt konkret anfasst — vor dem Klick, nicht danach. */}
            {(
              <InfoBox color={AM} text={
                `Kadereinträge werden beendet${hatKonto ? ", laufende Vereinsfunktionen bekommen dieses Datum als Ende" : ""}. `
                + (!hatKonto
                    ? "Diese Person hat kein Portal-Konto — sie bleibt über E-Mail und Telefon erreichbar."
                    : zugangWeg
                      ? "Das Portal-Konto wird deaktiviert — ausser die Person hat noch ein aktives Kind im Verein."
                      : `Das Portal-Konto bleibt bestehen${austrittsart ? `, die Rolle richtet sich nach der Art „${austrittsart}"` : ""}.`)} />
            )}

            {fehler && <InfoBox color={R} text={fehler} />}
          </>
        )}
      </div>

      <div className="cc-modal-ftr">
        {fertig ? (
          <Btn variant="primary" onClick={onClose}>Schliessen</Btn>
        ) : (
          <>
            <Btn onClick={onClose}>Abbrechen</Btn>
            <Btn variant="danger" onClick={ausfuehren} disabled={saving}>
              {saving ? "Wird ausgeführt …" : "Austritt eintragen"}
            </Btn>
          </>
        )}
      </div>
    </ModalOrSheet>
  );
}
