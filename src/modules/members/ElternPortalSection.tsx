/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternPortalSection.tsx
   Portal-Zugang eines Elternkontakts: Status anzeigen, Zugang
   deaktivieren.

   Einrichten kann der Admin nicht — das Elternteil registriert sich
   selbst mit der hinterlegten E-Mail. Deshalb gibt es hier keinen
   Knopf dafür, sondern den Hinweis, ob eine Registrierung möglich ist.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { TI } from "../../icons.tsx";
import { unlinkElternBenutzer } from "../../domains/members/elternService.ts";
import type { Sb } from "../../types.ts";
import type { ElternFormular } from "./ElternkontaktModal.tsx";

interface ElternPortalSectionProps {
  e: ElternFormular;
  sb: Sb;
  onReload?: (() => void) | null;
  /* Ohne Bearbeitungsrecht nur der Status, kein Deaktivieren */
  canEdit?: boolean;
}

export function ElternPortalSection({ e, sb, onReload, canEdit = true }: ElternPortalSectionProps) {
  const [loading, setLoading] = useState(false);

  async function unlink() {
    if (!sb || !e.id) return;
    setLoading(true);
    await unlinkElternBenutzer(sb, e.id);
    setLoading(false);
    if (onReload) onReload();
  }

  /* Aufbau wie die Kinder-Sektion: Trennlinie, Ueberschrift mit Aktion
     rechts, Inhalt darunter. Kein Warn-Kasten — ein fehlender Zugang ist
     der Normalfall, keine Auffaelligkeit. */
  return (
    <>
      <div className="cc-divider cc-mt-12"/>
      <div className="cc-mt-12">
        <div className="cc-section-title cc-between">
          <span className="cc-row cc-gap-6"><TI n="key" size={14}/> Portal-Zugang</span>
          {canEdit && e.benutzer_id && (
            <button className="cc-btn-danger" onClick={unlink} disabled={loading}>
              {loading ? "…" : "Deaktivieren"}
            </button>
          )}
        </div>
        <div className="cc-mt-4">
          {e.benutzer_id
            ? <span className="cc-status-active">Aktiv</span>
            : <span className="cc-text-sm cc-text-sub">
                {e.email
                  ? `Kein Zugang — Registrierung mit ${e.email} möglich`
                  : "Kein Zugang — keine E-Mail hinterlegt"}
              </span>
          }
        </div>
      </div>
    </>
  );
}
