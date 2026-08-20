/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/AustrittModal.tsx

   „Diese Person tritt aus — was gilt danach?"

   Statuten Artikel 8: der Austritt ist ein ZEITPUNKT. Was danach
   mit der Person geschieht, ist eine eigene Frage, und sie wird
   GESTELLT statt geraten. Bis zum 20.08.2026 gab es hier nur
   „Archivieren" — der Kontakt war damit weg, ohne dass jemand das
   entschieden hätte.

   Drei der vier Antworten halten den Kontakt. Das ist der Punkt.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, Input, InfoBox, Col, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, SPACE, TEXT } from "../../constants.ts";
import type { AustrittsZiel } from "../../domains/members/supporterService.ts";

interface ZielDef {
  wert: AustrittsZiel;
  titel: string;
  text: string;
  /** Bleibt die Mitgliedschaft bestehen? */
  bleibt: boolean;
}

const ZIELE: ZielDef[] = [
  { wert: "supporter", bleibt: false,
    titel: "Supporter",
    text: "Die Mitgliedschaft endet, die Person bleibt für Nachrichten und Anfragen erreichbar. Kein Beitrag, kein Stimmrecht." },
  { wert: "ehrenmitglied", bleibt: true,
    titel: "Ehrenmitglied",
    text: "Die Mitgliedschaft läuft weiter, nur der Typ wechselt. Kader und Ämter bleiben." },
  { wert: "aktivmitglied", bleibt: true,
    titel: "Aktivmitglied",
    text: "Wechsel des Mitgliedtyps, etwa von Junioren- zu Aktivmitglied. Kein Austritt." },
  { wert: "archiv", bleibt: false,
    titel: "Archiv",
    text: "Die Mitgliedschaft endet und der Kontakt wird nicht weitergeführt. Die Person bleibt im Archiv auffindbar." },
];

export interface AustrittModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  /** Aktueller Mitgliedtyp — wird als Hinweis gezeigt. */
  mitgliedtyp?: string | null;
  hatKonto?: boolean;
  onAustritt: (ziel: AustrittsZiel, am: string) => Promise<{ fehler: string | null; hinweise: string[] }>;
}

export function AustrittModal({
  open, onClose, name, mitgliedtyp = null, hatKonto = false, onAustritt,
}: AustrittModalProps) {
  const [ziel, setZiel]       = useState<AustrittsZiel | "">("");
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

  const gewaehlt = ZIELE.find(z => z.wert === ziel) || null;

  async function ausfuehren() {
    if (!ziel) return;
    setSaving(true);
    setFehler(null);
    const { fehler: f, hinweise: h } = await onAustritt(ziel, am);
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
                + (gewaehlt.wert === "supporter"
                    ? (hatKonto
                        ? "Das Portal-Konto bleibt bestehen, die Rolle wechselt auf Supporter."
                        : "Diese Person hat kein Portal-Konto — sie bleibt über E-Mail und Telefon erreichbar.")
                    : "Der Kontakt wird nicht weitergeführt.")} />
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
