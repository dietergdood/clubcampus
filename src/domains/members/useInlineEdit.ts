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
import type { LogWert } from "./memberService.ts";
import type { Account, Sb } from "../../types.ts";
import type { InlineFeedback } from "../../shared/forms/InlineField.tsx";

export interface UseInlineEditProps {
  sb: Sb;
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

export function useInlineEdit({ sb, mitgliedId, onReload, vereinId=null, account=null, rawData=null }: UseInlineEditProps) {
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
    if (!sb || !mitgliedId) return;
    setSaving(true);
    // Alten Wert für Änderungshistorie merken
    const alterWert = leseFeld(rawData, field);
    const ok = await updateMitglied(sb, mitgliedId, { [field]: value || null });
    setSaving(false);
    setEditing(null);
    setEditVal("");
    if (ok) {
      // Änderung loggen wenn vereinId und account vorhanden
      if (vereinId && alterWert !== (value || null)) {
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
  }, [sb, mitgliedId, onReload, vereinId, account, rawData]);

  // Keyboard handler für Input-Felder
  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(field, editVal); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }, [editVal, saveEdit, cancelEdit]);

  return { editing, startEdit, saveEdit, cancelEdit, editVal, setEditVal, saving, feedback, handleKey };
}
