/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/FotoUpload.jsx
   Foto-Upload Komponente für Mitglieder-Personalien
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef } from "react";
import { Btn } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { updateMitgliedFoto, deleteMitgliedFoto } from "../../domains/members/memberService.js";

export function FotoUpload({ raw, canUpload, sb, onReload }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const inputRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !sb) return;
    if (file.size > 2 * 1024 * 1024) { setMsg({ok:false, text:"Max. 2MB"}); return; }
    setUploading(true); setMsg(null);
    try {
      await updateMitgliedFoto(sb, raw.id, file);
      setMsg({ok:true, text:"Foto gespeichert ✓"});
      setTimeout(() => { setMsg(null); if (onReload) onReload(); }, 800);
    } catch(e) { setMsg({ok:false, text:e.message}); }
    setUploading(false);
  }

  async function handleDelete() {
    if (!sb) return;
    await deleteMitgliedFoto(sb, raw.id);
    if (onReload) onReload();
  }

  if (!raw.foto_url && !canUpload) return null;

  return (
    <div className="cc-foto-row">
      {raw.foto_url
        ? <img src={raw.foto_url} className="cc-foto-img" alt="Foto"/>
        : <div className="cc-foto-placeholder"><TI n="photo" size={24}/></div>
      }
      <div className="cc-col cc-gap-8">
        <div className="cc-text-bold">{raw.vorname} {raw.nachname}</div>
        {canUpload && (
          <div className="cc-row cc-gap-8">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-hidden" onChange={handleUpload}/>
            <Btn small onClick={() => inputRef.current?.click()} disabled={uploading}>
              <TI n="upload" size={12}/> {raw.foto_url ? "Ändern" : "Foto hochladen"}
            </Btn>
            {raw.foto_url && <Btn small onClick={handleDelete}><TI n="trash" size={12}/></Btn>}
          </div>
        )}
        {msg && <div className={`cc-badge ${msg.ok ? "cc-badge-success" : "cc-badge-danger"}`}>{msg.text}</div>}
        {uploading && <div className="cc-text-sm">Wird hochgeladen…</div>}
      </div>
    </div>
  );
}
