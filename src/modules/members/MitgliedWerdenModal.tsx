/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MitgliedWerdenModal.tsx

   Aus einem Supporter wird ein Mitglied.

   Die PERSON bleibt dieselbe — es entsteht nur eine Mitgliedschaft
   daneben. Das ist der Gewinn des Personen-Modells: kein zweites
   Anlegen, kein Zusammenführen, keine zweite Zeile mit denselben
   Kontaktdaten. Deshalb fragt dieses Modal auch nur nach dem, was
   die Mitgliedschaft ausmacht, und nicht noch einmal nach Namen
   und Adresse.

   Die PORTALROLLE wird hier NICHT gewählt. Sie ist ein berechneter
   Wert (`ableitUndSaveRolle`) und würde bis zur nächsten Kader-
   oder Funktionsänderung halten — dieselbe Falle, die am
   05.08.2026 aus dem Anlege-Formular entfernt wurde.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, Select, Input, InfoBox, Col, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BL, R, SPACE } from "../../constants.ts";
import type { Mitgliedtyp } from "../../types.ts";
import type { PersonFuerMitgliedschaft } from "../../domains/members/supporterService.ts";

export interface MitgliedWerdenModalProps {
  open: boolean;
  onClose: () => void;
  supporter: PersonFuerMitgliedschaft | null;
  mitgliedtypen: Mitgliedtyp[];
  /** Legt die Mitgliedschaft an. Gibt eine Fehlermeldung zurück oder null. */
  onAnlegen: (
    supporter: PersonFuerMitgliedschaft,
    felder: { mitgliedtyp: string; eintrittsdatum: string | null },
  ) => Promise<string | null>;
}

export function MitgliedWerdenModal({
  open, onClose, supporter, mitgliedtypen, onAnlegen,
}: MitgliedWerdenModalProps) {
  const [typ, setTyp]         = useState("");
  const [eintritt, setEintritt] = useState("");
  const [saving, setSaving]   = useState(false);
  const [fehler, setFehler]   = useState<string | null>(null);

  /* Der Mitgliedtyp „Supporter" steht seit dem Rückbau auf aktiv = false und
     fällt damit automatisch heraus — es gibt ihn nicht mehr zu wählen. */
  const waehlbar = (mitgliedtypen || [])
    .filter(t => t.aktiv !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  useEffect(() => {
    if (!open) return;
    setTyp("");
    /* Heute als Vorschlag: wer den Wechsel im Portal auslöst, macht ihn in
       aller Regel für heute. Änderbar bleibt es. */
    setEintritt(new Date().toISOString().slice(0, 10));
    setFehler(null);
  }, [open, supporter?.id]);

  if (!supporter) return null;

  const name = `${supporter.vorname || ""} ${supporter.nachname || ""}`.trim() || "?";

  async function anlegen() {
    if (!supporter || !typ) return;
    setSaving(true);
    setFehler(null);
    const meldung = await onAnlegen(supporter, { mitgliedtyp: typ, eintrittsdatum: eintritt || null });
    setSaving(false);
    /* Nur bei Erfolg schliessen. Ein Modal, das nach einem Fehler zugeht,
       lässt den Nutzer glauben, es habe geklappt. */
    if (meldung) setFehler(meldung);
    else onClose();
  }

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={440}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{name} wird Mitglied</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>
      </div>

      <div className="cc-modal-body">
        <InfoBox color={BL} text="Die Person bleibt dieselbe — Kontaktdaten, Portal-Zugang und Vereinsfunktionen wandern mit. Es entsteht nur die Mitgliedschaft dazu." />

        <Col gap={SPACE[3]}>
          <label className="cc-field">
            <Label>Mitgliedtyp *</Label>
            <Select value={typ} onChange={e => setTyp(e.target.value)}>
              <option value="">Bitte wählen …</option>
              {waehlbar.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </Select>
          </label>

          <label className="cc-field">
            <Label>Eintrittsdatum</Label>
            <Input type="date" value={eintritt} onChange={e => setEintritt(e.target.value)} />
          </label>
        </Col>

        {/* Die Portalrolle wird nicht gefragt — hier steht, warum, damit die
            Frage nicht bei jeder Durchsicht neu aufkommt. */}
        <InfoBox color={BL} text="Die Portalrolle ergibt sich aus Mitgliedtyp, Kaderrollen und Funktionen und wird gleich nach dem Anlegen berechnet. Von Hand setzen lässt sie sich anschliessend im Profil." />

        {fehler && <InfoBox color={R} text={fehler} />}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Abbrechen</Btn>
        <Btn variant="primary" onClick={anlegen} disabled={saving || !typ}>
          {saving ? "Wird angelegt …" : "Mitgliedschaft anlegen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
