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
type ZielKey = "beenden" | "archiv" | `typ:${string}`;

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
  onAustritt: (ziel: AustrittsZiel, am: string) => Promise<{ fehler: string | null; hinweise: string[] }>;
}

export function AustrittModal({
  open, onClose, name, mitgliedtyp = null, hatKonto = false,
  mitgliedtypen = [], austrittsart = null, onAustritt,
}: AustrittModalProps) {
  const [ziel, setZiel]       = useState<ZielKey | "">("");
  const [am, setAm]           = useState("");
  const [saving, setSaving]   = useState(false);
  const [fehler, setFehler]   = useState<string | null>(null);
  const [hinweise, setHinweise] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setZiel("");
    setAm(new Date().toISOString().slice(0, 10));
    setFehler(null);
    setHinweise([]);
  }, [open]);

  /* Die Auswahl entsteht aus den Daten, nicht aus einer Konstante. Die
     Reihenfolge ist die Aussage: erst die beiden Enden, dann die Wechsel. */
  const ZIELE: { wert: ZielKey; titel: string; text: string; bleibt: boolean }[] = [
    { wert: "beenden", bleibt: false,
      titel: austrittsart || "Mitgliedschaft beenden, Kontakt bleibt",
      text: austrittsart
        ? `Die Mitgliedschaft endet, die Person gilt danach als ${austrittsart} und bleibt für Nachrichten und Anfragen erreichbar. Kein Beitrag, kein Stimmrecht.`
        /* ⚠ Behauptet KEINE Ursache. „Keine Art eingestellt" wäre eine
           Diagnose, die diese Komponente nicht stellen kann: die Art kann
           fehlen ODER nicht geladen worden sein, und beides sieht von hier
           gleich aus. Was tatsächlich geschieht, sagt der Hinweis nach dem
           Ausführen — dort liest der Service die Einstellung selbst. */
        : "Die Mitgliedschaft endet, die Person bleibt erreichbar. ⚠ Es ist keine Art nach dem Austritt bekannt — bitte in der Portalverwaltung unter Mitglieder-Konfiguration prüfen." },
    { wert: "archiv", bleibt: false,
      titel: "Archiv",
      /* ⚠ Berichtigt am 22.08.2026. Hier stand „der Kontakt wird nicht
         weitergeführt" — das war die alte Bedeutung. Archiv heisst
         „ausgetreten, aber noch etwas offen": Beitrag, Rechnung, Material.
         Ein Fehleintrag wird gelöscht, nicht archiviert. */
      text: "Die Mitgliedschaft endet und es ist noch etwas offen — Beitrag, Rechnung, Material. Die Person bleibt im Archiv auffindbar, bis das erledigt ist." },
    ...mitgliedtypen.map(t => ({
      wert: `typ:${t.name}` as ZielKey, bleibt: true,
      titel: t.name,
      text: `Wechsel des Mitgliedtyps auf ${t.name}. Die Mitgliedschaft läuft weiter, Kader und Ämter bleiben. Kein Austritt.`,
    })),
  ];

  const gewaehlt = ZIELE.find(z => z.wert === ziel) || null;

  /** Von der Auswahl im Modal zur Aussage im Service. */
  function zumZiel(k: ZielKey): AustrittsZiel {
    if (k === "beenden") return { art: "beenden" };
    if (k === "archiv") return { art: "archiv" };
    return { art: "typwechsel", mitgliedtyp: k.slice(4) };
  }

  async function ausfuehren() {
    if (!ziel) return;
    setSaving(true);
    setFehler(null);
    const { fehler: f, hinweise: h } = await onAustritt(zumZiel(ziel), am);
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
            <InfoBox color={BL} text={`Heute ${mitgliedtyp || "Mitglied"}. Der Austritt ist ein Zeitpunkt — was danach gilt, entscheiden Sie hier.`} />

            <div className="cc-section-title">Was gilt danach?</div>
            <Col gap={SPACE[2]}>
              {ZIELE.map(z => (
                <label key={z.wert} className="cc-card" style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  outline: ziel === z.wert ? "2px solid var(--cc-accent)" : "none",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input type="radio" name="austritt-ziel" checked={ziel === z.wert}
                           onChange={() => setZiel(z.wert)} style={{ marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: TEXT.md }}>{z.titel}</div>
                      <div style={{ fontSize: TEXT.sm, color: "var(--sub)" }}>{z.text}</div>
                    </div>
                  </div>
                </label>
              ))}
            </Col>

            <div className="cc-section-title">{gewaehlt?.bleibt ? "Datum" : "Austrittsdatum"}</div>
            <label className="cc-field">
              <Label>{gewaehlt?.bleibt ? "Gilt ab" : "Tag des Austritts"}</Label>
              <Input type="date" value={am} onChange={e => setAm(e.target.value)} />
            </label>

            {/* Was der gewählte Weg konkret anfasst — vor dem Klick, nicht danach. */}
            {gewaehlt && !gewaehlt.bleibt && (
              <InfoBox color={AM} text={
                `Kadereinträge werden beendet${hatKonto ? ", laufende Vereinsfunktionen bekommen dieses Datum als Ende" : ""}. `
                + (gewaehlt.wert === "beenden"
                    ? (hatKonto
                        ? `Das Portal-Konto bleibt bestehen${austrittsart ? `, die Rolle richtet sich nach der Art „${austrittsart}"` : ""}.`
                        : "Diese Person hat kein Portal-Konto — sie bleibt über E-Mail und Telefon erreichbar.")
                    : "Die Person bleibt im Archiv auffindbar.")} />
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
            <Btn variant={gewaehlt?.bleibt ? "primary" : "danger"}
                 onClick={ausfuehren} disabled={saving || !ziel}>
              {saving ? "Wird ausgeführt …" : gewaehlt?.bleibt ? "Mitgliedtyp wechseln" : "Austritt eintragen"}
            </Btn>
          </>
        )}
      </div>
    </ModalOrSheet>
  );
}
