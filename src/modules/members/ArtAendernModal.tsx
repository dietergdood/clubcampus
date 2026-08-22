/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ArtAendernModal.tsx

   „Was ist diese Person?" — als Sammelaktion für mehrere Zeilen.

   ⚠ NUR GESETZTE ARTEN STEHEN ZUR WAHL, und gefiltert wird auf
   `ableitung === null`, NICHT auf einen Namen. Seit dem 22.08.2026
   gibt es zwei abgeleitete Arten („Elternteil" und „Ehemaliges
   Elternteil"), und es können weitere dazukommen — eine Prüfung
   gegen `name !== "Elternteil"` wäre beim zweiten schon falsch
   gewesen.

   Eine abgeleitete Art zu vergeben wäre ohnehin wirkungslos: sie
   steht in keiner Tabelle, sondern ergibt sich aus den Daten, und
   die Sicht überschriebe die Zusage im nächsten Moment. Genau der
   Fehler, der bei den von Hand gesetzten Rollen seit dem 05.08.2026
   als offener Punkt steht.

   ⚠ ÄNDERN HEISST ÄNDERN: die bisherigen gesetzten Arten fallen weg.
   Abgeleitete bleiben — sie sind keine Zeilen.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { ModalOrSheet, ModalTitle, Btn, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BL, AM } from "../../constants.ts";
import type { PersonArt } from "../../domains/person/personArtService.ts";

export interface ArtAendernModalProps {
  open: boolean;
  onClose: () => void;
  /** Wie viele Zeilen betroffen sind — die Zahl steht im Text. */
  anzahl: number;
  /** Alle Arten des Vereins; gefiltert wird hier. */
  arten: PersonArt[];
  /** Führt aus. Gibt eine Fehlermeldung zurück oder null. */
  onSetzen: (artId: string) => Promise<string | null>;
}

export function ArtAendernModal({ open, onClose, anzahl, arten, onSetzen }: ArtAendernModalProps) {
  const [artId, setArtId] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setArtId(""); setFehler(null);
  }, [open]);

  /* ⚠ `ableitung === null` — der Filter, auf den es ankommt. */
  const waehlbar = arten.filter(a => a.ableitung === null && a.aktiv !== false);
  const abgeleitet = arten.filter(a => a.ableitung !== null && a.aktiv !== false);

  async function ausfuehren() {
    if (!artId) return;
    setSpeichert(true); setFehler(null);
    const msg = await onSetzen(artId);
    setSpeichert(false);
    if (msg) { setFehler(msg); return; }
    onClose();
  }

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={420}>
      <div className="cc-modal-hdr">
        <ModalTitle>Art ändern</ModalTitle>
        <button className="cc-icon-btn" onClick={onClose}><TI n="x" size={14}/></button>
      </div>
      <div className="cc-modal-body cc-col">
        <InfoBox color={BL} text={
          anzahl === 1
            ? "Die Art bestimmt, welche Felder das Profil zeigt und was im Kopf steht."
            : `Gilt für ${anzahl} ausgewählte Personen. Die Art bestimmt, welche Felder das Profil zeigt und was im Kopf steht.`
        }/>

        {waehlbar.length === 0 ? (
          /* Keine Komponente, die bei fehlenden Daten nichts zeigt: eine
             leere Auswahl ist von einer nicht geladenen nicht zu
             unterscheiden. */
          <div className="cc-text-sm cc-text-sub">
            Es gibt keine vergebbare Art. Anlegen lässt sie sich in der
            Portalverwaltung unter Mitglieder-Konfiguration.
          </div>
        ) : (
          <div className="cc-col cc-gap-6">
            {waehlbar.map(a => (
              <label key={a.art_id} className="cc-card cc-clickable" style={{ padding: "10px 12px", borderRadius: 10,
                outline: artId === a.art_id ? "2px solid var(--cc-accent)" : "none" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="radio" name="art" checked={artId === a.art_id}
                         onChange={() => setArtId(a.art_id)} />
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {abgeleitet.length > 0 && (
          /* ⚠ Sie werden GENANNT, nicht verschwiegen. Wer „Elternteil"
             sucht und nicht findet, hält es sonst für einen Fehler. */
          <InfoBox color={AM} text={
            `Nicht wählbar, weil abgeleitet: ${abgeleitet.map(a => a.name).join(", ")}. `
            + "Diese Arten ergeben sich aus den Daten — wer ein Kind im Verein hat, ist Elternteil, "
            + "und eine Zusage hier würde im nächsten Moment überschrieben."
          }/>
        )}

        {fehler && <div className="cc-text-sm cc-text-danger">{fehler}</div>}
      </div>
      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Abbrechen</Btn>
        <Btn variant="primary" onClick={ausfuehren} disabled={speichert || !artId}>
          {speichert ? "Wird gesetzt …" : "Art setzen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
