/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/OffenePunkteKarte.tsx

   „Bei dieser Person ist noch etwas offen" — Beitrag, Rechnung,
   Material, Tenue.

   ⚠ DAS ARCHIV IST KEIN ORT, SONDERN DIESE MARKIERUNG. Bis zum
   23.08.2026 stand ein Ausgetretener in zwei Listen: im Archiv (weil
   die Mitgliedschaftszeile inaktiv ist) und bei den Supportern (weil
   er die Austritts-Art trägt). Derselbe Mensch, zwei Tabs, und man
   sah nicht, dass es derselbe ist.

   ⚠ SETZEN VERLANGT EINEN TEXT, ENTFERNEN IST EINE EIGENE HANDLUNG.
   Ein Pflichtfeld, das man nicht leeren kann, wäre eine Falle; ein
   Pflichtfeld, das man durch Leeren aufhebt, wäre keins. Deshalb
   zwei Wege mit zwei Beschriftungen: „Vermerken" und „Erledigt —
   Vermerk entfernen". (Anforderung Didi, 23.08.2026.)
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, Btn, Input, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, R, SPACE, TEXT } from "../../constants.ts";
import { setzeOffenePunkte, hatOffenePunkte } from "../../domains/person/offenePunkteService.ts";
import type { Sb } from "../../types.ts";

export interface OffenePunkteKarteProps {
  sb: Sb;
  personId: string;
  /** Der gespeicherte Vermerk, oder null/leer. */
  wert?: string | null;
  /**
   * Nur die Verwaltung setzt und entfernt.
   *
   * ⚠ Sichtbarkeit, keine Rechteprüfung — die macht RLS auf `personen`.
   * Wer den Knopf nicht sieht, kommt trotzdem nicht durch; wer ihn
   * fälschlich sieht, bekommt „Die Änderung kam nicht an".
   */
  darfSetzen?: boolean;
  /** Läuft nach jeder Änderung, damit die Seite den neuen Wert holt. */
  onGeaendert?: () => void;
}

export function OffenePunkteKarte({
  sb, personId, wert = null, darfSetzen = false, onGeaendert,
}: OffenePunkteKarteProps) {
  const gesetzt = hatOffenePunkte(wert);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [text, setText] = useState(wert ?? "");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  /* ⚠ Keine Komponente, die bei fehlenden Daten `null` zurückgibt — eine
     Sektion, die still verschwindet, ist von einer nicht gerenderten nicht zu
     unterscheiden. Wer nicht setzen darf und wo nichts vermerkt ist, sieht
     aber auch keinen leeren Kasten: dann gibt es schlicht nichts zu zeigen,
     und das ist eine bewusste Sichtbarkeitsregel, keine fehlende Anzeige. */
  if (!gesetzt && !darfSetzen) return null;

  async function speichere(neu: string | null) {
    setLaeuft(true);
    setFehler(null);
    const { ok, fehler: f } = await setzeOffenePunkte(sb, personId, neu);
    setLaeuft(false);
    if (!ok) { setFehler(f); return; }
    setBearbeiten(false);
    if (onGeaendert) onGeaendert();
  }

  return (
    <Card className="cc-card-full">
      <div className="cc-section-title cc-between">
        <span className="cc-row cc-gap-6">
          <TI n="alert-triangle" size={14} /> Offene Punkte
        </span>
        {darfSetzen && gesetzt && !bearbeiten && (
          <button className="cc-btn-ghost" onClick={() => { setText(wert ?? ""); setBearbeiten(true); }}>
            <TI n="pencil" size={13} /> Ändern
          </button>
        )}
      </div>

      {fehler && <InfoBox color={R} text={fehler} />}

      {bearbeiten || (!gesetzt && darfSetzen && bearbeiten) ? (
        <>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Was ist offen? z.B. Beitrag 2026, Tenue nicht zurück"
            autoFocus
          />
          <div style={{ display: "flex", gap: SPACE[2], marginTop: SPACE[3] }}>
            {/* ⚠ Der Knopf ist gesperrt, solange kein Text dasteht. „Markiert,
                aber niemand weiss warum" ist genau der Zustand, den ein
                boolean erzeugt hätte. */}
            <Btn variant="primary" disabled={text.trim() === "" || laeuft}
                 onClick={() => speichere(text)}>
              {laeuft ? "Speichert …" : "Vermerken"}
            </Btn>
            <Btn onClick={() => { setBearbeiten(false); setFehler(null); }}>Abbrechen</Btn>
          </div>
        </>
      ) : gesetzt ? (
        <>
          <div style={{ fontSize: TEXT.md, marginBottom: SPACE[3] }}>{wert}</div>
          {darfSetzen && (
            <Btn disabled={laeuft} onClick={() => speichere(null)}>
              <TI n="check" size={13} /> {laeuft ? "…" : "Erledigt — Vermerk entfernen"}
            </Btn>
          )}
        </>
      ) : (
        <>
          <div className="cc-text-muted" style={{ fontSize: TEXT.sm, marginBottom: SPACE[3] }}>
            Nichts offen. Ein Vermerk hält fest, was vor dem endgültigen Abschluss
            noch zu erledigen ist — Beitrag, Rechnung, Material.
          </div>
          <Btn onClick={() => { setText(""); setBearbeiten(true); }}>
            <TI n="plus" size={13} /> Offenen Punkt vermerken
          </Btn>
        </>
      )}

      {gesetzt && !bearbeiten && (
        <div style={{ marginTop: SPACE[3] }}>
          <InfoBox color={AM} text="Diese Person erscheint im Archiv, solange der Vermerk steht." />
        </div>
      )}
    </Card>
  );
}
