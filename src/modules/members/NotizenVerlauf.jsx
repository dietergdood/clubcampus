/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NotizenVerlauf.jsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Av, Btn, Card, Chip, Col, ModalOrSheet, ModalTitle, Row, Stat, StatusTile,
         useIsMobile, avColor, LandSelect, DropMenu, FunktionenMultiSelect,
         Toolbar, ColMenuButton, SortHeader, useConfirm, ConfirmDialog } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { BTN_COLOR as BTN, BTN_TXT, GN, R, RL, BL, AM, BK } from "../../constants.js";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.js";
import { currentSeason } from "../../domains/season/seasonUtils.js";
import { MemberHero, FotoUpload } from "./MemberHero.jsx";
import { LAENDER, getLandName, getFieldVisibility, RolleChip } from "./memberUtils.jsx";

function NotizenVerlauf({mitgliedId,canEdit,sb,dbUser,onCount}){
  const [confirm,confirmDialog]=useConfirm();
  const [notizen,setNotizen]=useState(null);
  const [newText,setNewText]=useState("");
  const [adding,setAdding]=useState(false);
  const [editId,setEditId]=useState(null);
  const [editText,setEditText]=useState("");
  const [editSaving,setEditSaving]=useState(false);

  useEffect(()=>{
    if(!sb||!mitgliedId) return;
    sb.from("mitglieder_notizen").select("*")
      .eq("mitglied_id",mitgliedId).order("created_at",{ascending:false})
      .then(({data})=>{const d=data||[];setNotizen(d);if(onCount)onCount(d.length);});
  },[mitgliedId]);

  async function addNotiz(){
    if(!newText.trim()||!sb) return;
    setAdding(true);
    const autorName=dbUser?.name||dbUser?.email||"Unbekannt";
    await sb.from("mitglieder_notizen").insert({
      mitglied_id:mitgliedId, text:newText.trim(),
      autor_id:dbUser?.id||null, autor_name:autorName,
    });
    const {data:fresh}=await sb.from("mitglieder_notizen").select("*")
      .eq("mitglied_id",mitgliedId).order("created_at",{ascending:false});
    const d=fresh||[];setNotizen(d);if(onCount)onCount(d.length);
    setNewText(""); setAdding(false);
  }

  async function saveEdit(id){
    if(!editText.trim()||!sb) return;
    setEditSaving(true);
    await sb.from("mitglieder_notizen").update({text:editText.trim(),updated_at:new Date().toISOString()}).eq("id",id);
    setNotizen(prev=>prev.map(n=>n.id===id?{...n,text:editText.trim()}:n));
    setEditId(null); setEditSaving(false);
  }

  async function deleteNotiz(id){
    const ok=await confirm({title:"Notiz löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    await sb.from("mitglieder_notizen").delete().eq("id",id);
    setNotizen(prev=>{const d=prev.filter(n=>n.id!==id);if(onCount)onCount(d.length);return d;});
  }

  function formatDate(ts){
    const d=new Date(ts);
    const now=new Date();
    const diff=now-d;
    if(diff<86400000&&d.getDate()===now.getDate()) return `heute, ${d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"})}`;
    if(diff<172800000) return "gestern";
    return d.toLocaleDateString("de-CH");
  }

  function initials(name){
    return (name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  }

  if(notizen===null) return <div className="cc-text-sm cc-text-sub">Lade…</div>;

  return(
    <>{confirmDialog}
    <div className="cc-notiz-list">
      {notizen.length===0&&!canEdit&&(
        <div className="cc-text-sm cc-text-sub cc-empty-italic">Keine Notizen vorhanden.</div>
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
              "sep",
              {label:"Löschen",icon:"trash",danger:true,onClick:()=>deleteNotiz(n.id)},
            ]}/>
          )}
        </div>
      ))}
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
        ):(
          <button className="cc-team-add-btn" onClick={()=>setNewText(" ")} style={{marginTop:notizen.length>0?8:0}}>
            <TI n="plus" size={14}/> Neue Notiz
          </button>
        )
      )}
    </div>
  </>
  );
}


export { NotizenVerlauf };
