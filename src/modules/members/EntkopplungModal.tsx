/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/EntkopplungModal.tsx

   Das letzte Kind ist entkoppelt — was geschieht mit der Person?

   Bis zum 20.08.2026 entschied `entkoppleKind()` das selbst: war
   das Kind noch im Verein, wurde der Elternteil Supporter, sonst
   verschwand die Person. Ob der Verein einen Kontakt behält, hing
   damit an einem Nebenumstand, den niemand als Grund genannt
   hätte — und niemand sah die Entscheidung.

   ⚠ DIE VERKNÜPFUNG IST BEIM ÖFFNEN SCHON GELÖST. Dieses Modal
   entscheidet nur noch über die Person. Wer es wegklickt,
   hinterlässt eine Person ohne Mitgliedschaft und ohne Kind — also
   einen Supporter. Der Ausgang des Nichtstuns ist der harmlose.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, InfoBox, Col } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, SPACE, TEXT } from "../../constants.ts";
import type { EntkoppelWunsch } from "../../domains/members/elternService.ts";

const WAHL: { wert: EntkoppelWunsch; titel: string; text: string; gefahr: boolean }[] = [
  { wert: "supporter", gefahr: false,
    titel: "Als Supporter behalten",
    text: "Die Person bleibt mit Kontaktdaten und Portal-Zugang bestehen und ist für News und Helferschichten erreichbar. Keine Mitgliedschaft, kein Beitrag." },
  { wert: "entfernen", gefahr: true,
    titel: "Person entfernen",
    text: "Nur möglich, solange nichts mehr an ihr hängt — keine Mitgliedschaft, kein weiteres Kind, kein Konto. Hängt noch etwas daran, bleibt die Person stehen." },
];

export interface EntkopplungModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  /** Trägt die Entscheidung aus. Meldung zurück oder null. */
  onEntscheiden: (wunsch: EntkoppelWunsch) => Promise<string | null>;
}

export function EntkopplungModal({ open, onClose, name, onEntscheiden }: EntkopplungModalProps) {
  const [wunsch, setWunsch] = useState<EntkoppelWunsch | "">("");
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => { if (open) { setWunsch(""); setFehler(null); } }, [open]);

  async function ausfuehren() {
    if (!wunsch) return;
    setSaving(true);
    setFehler(null);
    const meldung = await onEntscheiden(wunsch);
    setSaving(false);
    if (meldung) setFehler(meldung);
    else onClose();
  }

  const gewaehlt = WAHL.find(w => w.wert === wunsch) || null;

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={480}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{name} hat kein Kind mehr im Verein</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>
      </div>

      <div className="cc-modal-body">
        <InfoBox color={BL} text="Die Verknüpfung ist getrennt. Bleibt die Frage, ob der Verein den Kontakt behält." />

        <Col gap={SPACE[2]}>
          {WAHL.map(w => (
            <label key={w.wert} className="cc-card" style={{
              padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              outline: wunsch === w.wert ? "2px solid var(--cc-accent)" : "none",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="radio" name="entkopplung-wunsch" checked={wunsch === w.wert}
                       onChange={() => setWunsch(w.wert)} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: TEXT.md }}>{w.titel}</div>
                  <div style={{ fontSize: TEXT.sm, color: "var(--sub)" }}>{w.text}</div>
                </div>
              </div>
            </label>
          ))}
        </Col>

        {/* Was passiert, wenn niemand entscheidet — offen gesagt, damit das
            Wegklicken keine unbemerkte Entscheidung ist. */}
        <InfoBox color={AM} text="Ohne Entscheidung bleibt die Person als Supporter stehen; sie lässt sich später in der Supporter-Liste behandeln." />

        {fehler && <InfoBox color={R} text={fehler} />}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Später entscheiden</Btn>
        <Btn variant={gewaehlt?.gefahr ? "danger" : "primary"}
             onClick={ausfuehren} disabled={saving || !wunsch}>
          {saving ? "Wird ausgeführt …" : "Übernehmen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
