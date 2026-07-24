/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/InlineField.jsx
   Inline-Editierfeld für Profilansichten
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.jsx";
import { FONT } from "../../constants.js";
import { PhoneInput } from "./PhoneInput.jsx";

export function InlineField({ label, value, field, type="text", opts=null, canEdit=false, editing, editVal, setEditVal, startEdit, saveEdit, cancelEdit, handleKey, feedback, saving }){
  const isEditing = editing === field;
  const hasFeedback = feedback?.field === field;
  if(!canEdit) return(
    <div className="cc-info-row">
      <span className="cc-info-key">{label}</span>
      <span className={value?"cc-info-val":"cc-info-val-empty"}>{value||"—"}</span>
    </div>
  );
  return(
    <div className="cc-info-row">
      <span className="cc-info-key">{label}</span>
      {hasFeedback?(
        <span className={feedback.ok?"cc-inline-feedback-ok":"cc-inline-feedback-err"}>
          <TI n={feedback.ok?"check":"alert-circle"} size={13}/>
          {feedback.ok?"Gespeichert":"Fehler"}
        </span>
      ):isEditing?(
        <div style={{flex:1}}>
          {opts?(
            <select className="cc-inline-select" value={editVal} autoFocus
              onChange={e=>{setEditVal(e.target.value);saveEdit(field,e.target.value);}}
              onKeyDown={e=>e.key==="Escape"&&cancelEdit()}
              onBlur={cancelEdit}>
              <option value="">— wählen —</option>
              {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
            </select>
          ):type==="phone"?(
            <div onKeyDown={e=>{if(e.key==="Enter")saveEdit(field,editVal);if(e.key==="Escape")cancelEdit();}}>
              <PhoneInput value={editVal} onChange={v=>setEditVal(v)} showHint={true}/>
            </div>
          ):(
            <input className="cc-inline-input" type={type} value={editVal} autoFocus
              onChange={e=>setEditVal(e.target.value)}
              onKeyDown={e=>handleKey(e,field)}
              onBlur={()=>saveEdit(field,editVal)}/>
          )}
          {!opts&&<div className="cc-inline-hint">Enter speichern · Esc abbrechen</div>}
          {opts&&<div className="cc-inline-hint">Esc abbrechen</div>}
        </div>
      ):(
        <span className={`cc-inline-field ${value?"cc-info-val":"cc-info-val-empty"}`}
          onClick={()=>startEdit(field,value||"")}>
          {value||<span className="cc-inline-empty">nicht erfasst</span>}
          <span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>
        </span>
      )}
    </div>
  );
}

