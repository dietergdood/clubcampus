/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/useInlineEdit.ts
   Hook für Inline Cell Editing in PersonPersonalien, PersonKontakt
   und Vereinsdaten.

   Verwendung:
     const { editing, startEdit, saveEdit, cancelEdit, editVal, setEditVal, saving, feedback } = useInlineEdit({ sb, mitgliedId, onReload });
     <div onClick={() => startEdit('email', raw.email)}>...</div>
     {editing === 'email' && <input value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={handleKey}/>}

   Keyboard:
     Enter → saveEdit(fieldName, editVal)
     Esc   → cancelEdit()
   ═══════════════════════════════════════════════════════════════ */
import { useState, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { updateMitglied, logAenderung } from "./memberService.ts";
import { updatePerson, verteileFelder } from "../person/personService.ts";
import type { LogWert } from "./memberService.ts";
import type { Account, Sb } from "../../types.ts";
import type { InlineFeedback } from "../../shared/forms/InlineField.tsx";

export interface UseInlineEditProps {
  sb: Sb;
  /**
   * Die PERSON. Personenfelder gehen ausschliesslich hierueber — seit dem
   * 21.08.2026 gibt es fuer sie genau einen Schreibweg (`updatePerson`).
   */
  personId?: string | null;
  /**
   * Die MITGLIEDSCHAFT. `null` bei einer Person ohne.
   *
   * Sie wird fuer zweierlei gebraucht: fuer Mitgliedschaftsfelder
   * (`mitgliedtyp`, `spielerpass`, …) und fuer die Aenderungshistorie, die
   * `mitglied_id NOT NULL` fuehrt. Fehlt sie, entfaellt beides — der Aufruf
   * SCHEITERT nicht, es gibt nur keinen Verlauf. Dass der Verlauf an der
   * Mitgliedschaft haengt statt an der Person, ist eine eigene Migration.
   */
  mitgliedId?: number | null;
  onReload?: (() => void) | null;
  vereinId?: string | null;
  account?: Account | null;
  /* Aktueller Datensatz — liefert den alten Wert für die Historie */
  rawData?: object | null;
}

/* Liest ein Feld aus dem Rohdatensatz, ohne Index-Zugriff auf einen
   Interface-Typ (und damit ohne Cast). */
function leseFeld(obj: object | null | undefined, feld: string): LogWert {
  if (!obj) return null;
  for (const [k, v] of Object.entries(obj)) {
    if (k !== feld) continue;
    if (v == null) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    return String(v);
  }
  return null;
}

export function useInlineEdit({ sb, personId=null, mitgliedId=null, onReload, vereinId=null, account=null, rawData=null }: UseInlineEditProps) {
  const [editing, setEditing]   = useState<string | null>(null); // aktuell editiertes Feld (key)
  const [editVal, setEditVal]   = useState("");                  // aktueller Eingabewert
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState<InlineFeedback | null>(null);

  const startEdit = useCallback((field: string, currentVal?: string | null) => {
    setEditing(field);
    setEditVal(currentVal ?? "");
    setFeedback(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditVal("");
  }, []);

  const saveEdit = useCallback(async (field: string, value: string) => {
    if (!sb) return;
    setSaving(true);
    // Alten Wert für Änderungshistorie merken
    const alterWert = leseFeld(rawData, field);

    /* Welcher Weg gilt, entscheidet das FELD, nicht der Aufrufer:
       `verteileFelder` kennt PERSON_FELDER. Ein Personenfeld geht ueber
       updatePerson, ein Mitgliedschaftsfeld ueber updateMitglied — und
       letzteres braucht eine Mitgliedschaft. */
    const { person } = verteileFelder({ [field]: value || null });
    const istPersonenfeld = Object.keys(person).length > 0;

    let ok = false;
    if (istPersonenfeld) {
      if (!personId) { setSaving(false); return; }
      ok = await updatePerson(sb as never, personId, { [field]: value || null });
    } else if (mitgliedId != null) {
      ok = await updateMitglied(sb, mitgliedId, { [field]: value || null });
    } else {
      console.error(`useInlineEdit: ${field} gehoert zur Mitgliedschaft, diese Person hat keine.`);
      setSaving(false);
      setFeedback({ field, ok: false });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setSaving(false);
    setEditing(null);
    setEditVal("");
    if (ok) {
      // Änderung loggen wenn vereinId und account vorhanden
      /* ⚠ Kein Verlauf ohne Mitgliedschaft: `mitglieder_aenderungen` fuehrt
         `mitglied_id NOT NULL`. Der Aufruf ENTFAELLT, statt zu scheitern —
         ein Fehler an dieser Stelle saehe aus, als waere die Aenderung nicht
         angekommen, obwohl sie es ist. */
      if (vereinId && mitgliedId != null && alterWert !== (value || null)) {
        const geaendertVon = account?.name || account?.email || "Administrator";
        logAenderung(sb, mitgliedId, vereinId, field, alterWert, value || null, geaendertVon);
      }
      setFeedback({ field, ok: true });
      setTimeout(() => setFeedback(null), 1500);
      if (onReload) onReload();
    } else {
      setFeedback({ field, ok: false });
      setTimeout(() => setFeedback(null), 2500);
    }
  }, [sb, personId, mitgliedId, onReload, vereinId, account, rawData]);

  // Keyboard handler für Input-Felder
  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(field, editVal); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }, [editVal, saveEdit, cancelEdit]);

  return { editing, startEdit, saveEdit, cancelEdit, editVal, setEditVal, saving, feedback, handleKey };
}

/* Rückgabe-API des Hooks — damit Consumer sie als Prop annehmen koennen,
   ohne den Hook selbst (Runtime) importieren zu muessen. */
export type UseInlineEditApi = ReturnType<typeof useInlineEdit>;
