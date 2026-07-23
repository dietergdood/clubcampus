/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/useInlineEdit.js
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
import { updateMitglied, logAenderung } from "./memberService.js";

export function useInlineEdit({ sb, mitgliedId, onReload, vereinId=null, account=null, rawData=null }) {
  const [editing, setEditing]   = useState(null);   // aktuell editiertes Feld (key)
  const [editVal, setEditVal]   = useState("");      // aktueller Eingabewert
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState(null);   // { field, ok }

  const startEdit = useCallback((field, currentVal) => {
    setEditing(field);
    setEditVal(currentVal ?? "");
    setFeedback(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditVal("");
  }, []);

  const saveEdit = useCallback(async (field, value) => {
    if (!sb || !mitgliedId) return;
    setSaving(true);
    // Alten Wert für Änderungshistorie merken
    const alterWert = rawData ? rawData[field] : null;
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
  const handleKey = useCallback((e, field) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(field, editVal); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }, [editVal, saveEdit, cancelEdit]);

  return { editing, startEdit, saveEdit, cancelEdit, editVal, setEditVal, saving, feedback, handleKey };
}
