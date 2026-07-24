/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NotizenVerlauf.tsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import type { MutableRefObject } from "react";
import { Btn, useConfirm, DropMenu, EmptyState } from "../../theme.ts";
import { fetchNotizen, insertNotiz, updateNotiz, deleteNotiz as deleteNotizService } from "../../domains/members/memberService.ts";
import type { Sb } from "../../types.ts";

/* Direkt aus der Service-Rückgabe abgeleitet */
type Notiz = Awaited<ReturnType<typeof fetchNotizen>>[number];

/* Autor einer Notiz. Der einzige Aufrufer (InfoTab) reicht ein Account
   durch, nicht den DbUser, als der das Prop bisher deklariert war —
   gelesen werden ohnehin nur id, name und email. */
interface NotizAutor {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

interface NotizenVerlaufProps {
  mitgliedId: number;
  canEdit?: boolean;
  sb: Sb;
  dbUser?: NotizAutor | null;
  /* Meldet die Anzahl Notizen nach aussen (Badge im Tab) */
  onCount?: ((anzahl: number) => void) | null;
  vereinId?: string | null;
  /* Wenn gesetzt, wird "neue Notiz starten" nach aussen exponiert */
  onAddRef?: MutableRefObject<(() => void) | null> | null;
}

function NotizenVerlauf({mitgliedId,canEdit,sb,dbUser,onCount,vereinId=null,onAddRef=null}: NotizenVerlaufProps){
  const [confirm,confirmDialog]=useConfirm();
  // Exponiere "neue Notiz starten" nach aussen
  if(onAddRef) onAddRef.current=()=>setNewText(" ");
  const [notizen,setNotizen]=useState<Notiz[]|null>(null);
  const [newText,setNewText]=useState("");
  const [adding,setAdding]=useState(false);
  const [editId,setEditId]=useState<number|null>(null);
  const [editText,setEditText]=useState("");
  const [editSaving,setEditSaving]=useState(false);

  useEffect(()=>{
    if(!sb||!mitgliedId) return;
    fetchNotizen(sb,mitgliedId).then(d=>{setNotizen(d);if(onCount)onCount(d.length);});
  },[mitgliedId]);

  async function addNotiz(){
    /* verein_id ist in mitglieder_notizen NOT NULL — ohne vereinId würde
       das Insert zwangsläufig scheitern, deshalb hier schon abbrechen. */
    if(!newText.trim()||!sb||!vereinId) return;
    setAdding(true);
    const autorName=dbUser?.name||dbUser?.email||"Unbekannt";
    await insertNotiz(sb,{mitglied_id:mitgliedId,verein_id:vereinId,text:newText.trim(),autor_id:dbUser?.id||null,autor_name:autorName});
    const d=await fetchNotizen(sb,mitgliedId);
    setNotizen(d);if(onCount)onCount(d.length);
    setNewText(""); setAdding(false);
  }

  async function saveEdit(id: number){
    if(!editText.trim()||!sb) return;
    setEditSaving(true);
    await updateNotiz(sb,id,editText.trim());
    setNotizen(prev=>(prev||[]).map(n=>n.id===id?{...n,text:editText.trim()}:n));
    setEditId(null); setEditSaving(false);
  }

  async function deleteNotiz(id: number){
    const ok=await confirm({title:"Notiz löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await deleteNotizService(sb,id);
    setNotizen(prev=>{const d=(prev||[]).filter(n=>n.id!==id);if(onCount)onCount(d.length);return d;});
  }

  function formatDate(ts: string | null){
    if(!ts) return "";
    const d=new Date(ts);
    const now=new Date();
    const diff=now.getTime()-d.getTime();
    if(diff<86400000&&d.getDate()===now.getDate()) return `heute, ${d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"})}`;
    if(diff<172800000) return "gestern";
    return d.toLocaleDateString("de-CH");
  }

  function initials(name?: string | null){
    return (name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  }

  if(notizen===null) return <div className="cc-text-sm cc-text-sub">Lade…</div>;

  return(
    <>{confirmDialog}
    <div className="cc-notiz-list">
      {canEdit&&(
        newText!==""?(
          <div className="cc-notiz-input-wrap">
            <div className="cc-notiz-av cc-notiz-av-me">{initials(dbUser?.name||dbUser?.email)}</div>
            <div className="cc-flex-1 cc-col cc-gap-6">
              <textarea className="cc-input cc-textarea" rows={3} value={newText}
                onChange={e=>setNewText(e.target.value)} autoFocus placeholder="Neue Notiz hinzufügen…"/>
              <div className="cc-row cc-gap-8 cc-justify-end">
                <Btn onClick={()=>setNewText("")}>Abbrechen</Btn>
                <Btn variant="primary" onClick={addNotiz} disabled={adding||!newText.trim()}>
                  {adding?"Wird gespeichert…":"Hinzufügen"}
                </Btn>
              </div>
            </div>
          </div>
        ):null
      )}
      {notizen.length===0&&!canEdit&&(
        <EmptyState icon="notes" title="Noch keine Notizen" subtitle="Halte wichtige Informationen zu diesem Mitglied fest."/>
      )}
      {notizen.map(n=>(
        <div key={n.id} className="cc-notiz-entry">
          <div className="cc-notiz-av">{initials(n.autor_name)}</div>
          <div className="cc-flex-1">
            <div className="cc-notiz-meta">
              <span className="cc-notiz-author">{n.autor_name||"Unbekannt"}</span>
              <span className="cc-notiz-dot"/>
              <span>{formatDate(n.created_at)}</span>
              {n.updated_at!==n.created_at&&<><span className="cc-notiz-dot"/><span className="cc-text-xs cc-text-sub">bearbeitet</span></>}
            </div>
            {editId===n.id?(
              <div className="cc-col cc-gap-6">
                <textarea className="cc-input cc-textarea cc-notiz-edit-area" rows={3} value={editText}
                  onChange={e=>setEditText(e.target.value)} autoFocus/>
                <div className="cc-row cc-gap-6">
                  <Btn variant="primary" onClick={()=>saveEdit(n.id)} disabled={editSaving}>{editSaving?"Speichert…":"Speichern"}</Btn>
                  <Btn onClick={()=>setEditId(null)}>Abbrechen</Btn>
                </div>
              </div>
            ):(
              <div className="cc-notiz-text">{n.text}</div>
            )}
          </div>
          {canEdit&&editId!==n.id&&(
            <DropMenu items={[
              {label:"Bearbeiten",icon:"edit",onClick:()=>{setEditId(n.id);setEditText(n.text);}},
              "sep" as const,
              {label:"Löschen",icon:"trash",danger:true,onClick:()=>deleteNotiz(n.id)},
            ]}/>
          )}
        </div>
      ))}

    </div>
  </>
  );
}


export { NotizenVerlauf };
