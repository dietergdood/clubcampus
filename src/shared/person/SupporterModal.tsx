/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/SupporterModal.tsx

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT (Statuten
   Artikel 6). `MemberDetail` kann ihn deshalb nicht zeigen: es
   arbeitet durchgehend mit einer Mitgliedschaft, von der
   Datenprüfung über Teams bis zum Verlauf.

   Diese Ansicht ist bewusst SCHLANK — Kontaktdaten, Portal-Zugang,
   Vereinsfunktionen, und der Weg ins Mitglied. Sie ist nicht die
   Personenseite; die kommt später und trägt dann Mitglied,
   Elternteil und Supporter gleichermassen. Bis dahin ist das hier
   das Wenigste, was funktioniert.

   Sie liegt unter `shared/person/`, damit sie beim Umzug in die
   Personenseite nicht wandern muss.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, Card, Av, Chip, Input, PhoneInput, InfoBox, Row, Col, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BL, GN, R, SPACE, TEXT } from "../../constants.ts";
import type { SupporterRoh } from "../../domains/members/supporterService.ts";

/* Nur die Felder, die ein Goenner braucht: erreichbar bleiben. Geburtsdatum,
   AHV-Nummer, Nationalitaet und Heimatort stehen bewusst NICHT hier — sie
   haengen an einer Mitgliedschaft oder am Spielbetrieb, und wer sie erfassen
   will, macht die Person zum Mitglied. */
const FELDER = [
  { key: "vorname",  label: "Vorname",  pflicht: true },
  { key: "nachname", label: "Nachname", pflicht: true },
  { key: "email",    label: "E-Mail",   typ: "email" },
  { key: "telefon",  label: "Telefon",  typ: "tel" },
  { key: "strasse",  label: "Strasse" },
  { key: "plz",      label: "PLZ" },
  { key: "ort",      label: "Ort" },
] as const;

type FeldKey = (typeof FELDER)[number]["key"];

export interface SupporterModalProps {
  open: boolean;
  onClose: () => void;
  supporter: SupporterRoh | null;
  /** Speichert die geänderten Personenfelder. Gibt false zurück, wenn es
      nicht geklappt hat — die Meldung bleibt dann stehen. */
  onSpeichern: (personId: string, felder: Record<string, unknown>) => Promise<boolean>;
  /** Öffnet „Mitglied werden". Fehlt der Callback, erscheint der Knopf nicht. */
  onMitgliedWerden?: ((supporter: SupporterRoh) => void) | null;
  canEdit?: boolean;
}

export function SupporterModal({
  open, onClose, supporter, onSpeichern, onMitgliedWerden = null, canEdit = false,
}: SupporterModalProps) {
  const [werte, setWerte]   = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  /* Beim Öffnen aus der Zeile befüllen — dieselbe Modal-Instanz wird für den
     nächsten Supporter wiederverwendet. */
  useEffect(() => {
    if (!open || !supporter) return;
    const start: Record<string, string> = {};
    for (const f of FELDER) start[f.key] = (supporter[f.key as FeldKey] as string) || "";
    setWerte(start);
    setMsg(null);
  }, [open, supporter?.id]);

  if (!supporter) return null;

  const name = `${supporter.vorname || ""} ${supporter.nachname || ""}`.trim() || "?";
  const geaendert = FELDER.some(f => werte[f.key] !== ((supporter[f.key as FeldKey] as string) || ""));
  const fehltPflicht = FELDER.filter(f => "pflicht" in f && f.pflicht).some(f => !werte[f.key]?.trim());

  async function speichern() {
    if (!supporter || fehltPflicht) return;
    setSaving(true);
    setMsg(null);
    /* Nur was sich geändert hat — ein update mit unveränderten Werten
       schriebe `updated_at` fort und sähe im Verlauf wie eine Bearbeitung
       aus, die nie stattgefunden hat. */
    const diff: Record<string, unknown> = {};
    for (const f of FELDER) {
      const alt = (supporter[f.key as FeldKey] as string) || "";
      if (werte[f.key] !== alt) diff[f.key] = werte[f.key].trim() || null;
    }
    const ok = await onSpeichern(supporter.id, diff);
    setSaving(false);
    setMsg(ok
      ? { text: "Gespeichert.", ok: true }
      : { text: "Speichern fehlgeschlagen. Die Änderungen stehen noch im Formular.", ok: false });
  }

  const portalText = supporter.hat_benutzer
    ? (supporter.benutzer_deaktiviert ? "Konto deaktiviert" : "Portal-Zugang aktiv")
    : "Kein Portal-Zugang";

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={560}>
      <div className="cc-modal-hdr">
        <Row gap={12}>
          {supporter.foto_url
            ? <img src={supporter.foto_url} alt={name} className="cc-avatar-foto-lg" />
            : <Av name={name} size={44} />}
          <div>
            <div className="cc-modal-title">{name}</div>
            <Row gap={6}>
              <Chip text="Supporter" semantic="neutral" size="sm" />
              <Chip text={portalText} semantic={supporter.hat_benutzer && !supporter.benutzer_deaktiviert ? "success" : "neutral"} size="sm" />
            </Row>
          </div>
        </Row>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>
      </div>

      <div className="cc-modal-body">
        {/* Was ein Supporter IST — der Satz steht hier, weil die Frage in
            jeder Sitzung wieder aufkommt. */}
        <InfoBox color={BL} text="Ein Supporter ist keine Mitgliedschaft: kein Beitrag, kein Stimmrecht an der GV. Er bleibt erreichbar, kann Helferschichten übernehmen und eine Vereinsfunktion tragen." />

        <div className="cc-section-title">Kontakt</div>
        <Col gap={SPACE[3]}>
          {FELDER.map(f => (
            <label key={f.key} className="cc-field">
              <Label>{f.label}{"pflicht" in f && f.pflicht ? " *" : ""}</Label>
              {f.key === "telefon"
                ? <PhoneInput
                    value={werte.telefon || ""}
                    onChange={(v: string) => setWerte(w => ({ ...w, telefon: v }))}
                    placeholder="+41 …" />
                : <Input
                    type={"typ" in f ? f.typ : "text"}
                    value={werte[f.key] || ""}
                    disabled={!canEdit}
                    onChange={e => setWerte(w => ({ ...w, [f.key]: e.target.value }))} />}
            </label>
          ))}
        </Col>

        <div className="cc-section-title">Vereinsfunktionen</div>
        {/* Kein `null` bei leerer Liste: eine Sektion, die still verschwindet,
            ist von einer nicht gerenderten nicht zu unterscheiden. */}
        {(supporter.funktionen || []).length > 0
          ? <Row gap={6} wrap>
              {(supporter.funktionen || []).map(fn => <Chip key={fn} text={fn} size="sm" />)}
            </Row>
          : <Card>
              <span style={{ fontSize: TEXT.sm }}>
                Keine Vereinsfunktion. Ämter werden im Portal unter „Gruppen und Funktionen" vergeben.
              </span>
            </Card>}

        <div className="cc-section-title">Verlauf</div>
        {/* ⚠ Der Verlauf hängt an der MITGLIEDSCHAFT: `mitglieder_aenderungen`
            und `mitglieder_aktivitaeten` haben `mitglied_id NOT NULL`. Ein
            Supporter hat keine, also gibt es hier strukturell nichts — und das
            gehört gesagt statt weggelassen. Mit der Personenseite bekommt der
            Verlauf einen Bezug zur Person; bis dahin ist das die Wahrheit. */}
        <Card>
          <span style={{ fontSize: TEXT.sm }}>
            Für eine Person ohne Mitgliedschaft wird noch kein Verlauf geführt —
            die Änderungshistorie hängt heute an der Mitgliedschaft. Sobald diese
            Person Mitglied wird, beginnt ihr Verlauf.
          </span>
        </Card>

        {msg && <InfoBox color={msg.ok ? GN : R} text={msg.text} />}
      </div>

      <div className="cc-modal-ftr">
        {onMitgliedWerden && (
          <Btn onClick={() => onMitgliedWerden(supporter)}>Mitglied werden</Btn>
        )}
        <Btn onClick={onClose}>Schliessen</Btn>
        {canEdit && (
          <Btn variant="primary" onClick={speichern} disabled={saving || !geaendert || fehltPflicht}>
            {saving ? "Speichert …" : "Speichern"}
          </Btn>
        )}
      </div>
    </ModalOrSheet>
  );
}
