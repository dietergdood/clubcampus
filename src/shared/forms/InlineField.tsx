/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/InlineField.tsx
   Inline-Editierfeld für Profilansichten

   Gegenstück zu useInlineEdit (domains/members): der Hook liefert
   editing/editVal/startEdit/saveEdit/cancelEdit/handleKey/feedback.
   ═══════════════════════════════════════════════════════════════ */
import type { KeyboardEvent, ReactNode } from "react";
import { TI } from "../../icons.tsx";
import { PhoneInput } from "./PhoneInput.tsx";

/* Optionen sind entweder einfache Strings oder {v,l}-Paare. */
export type InlineFieldOption = string | { v: string; l: string };

export interface InlineFeedback {
  field: string;
  ok: boolean;
}

export interface InlineFieldProps {
  label?: ReactNode;
  value?: string | null;
  field: string;
  type?: string;
  opts?: InlineFieldOption[] | null;
  canEdit?: boolean;
  editing?: string | null;
  editVal?: string;
  setEditVal: (value: string) => void;
  startEdit: (field: string, value: string) => void;
  saveEdit: (field: string, value: string) => void;
  cancelEdit: () => void;
  handleKey: (e: KeyboardEvent<HTMLInputElement>, field: string) => void;
  feedback?: InlineFeedback | null;
  /* Teil der Schnittstelle von useInlineEdit, wird hier nicht ausgewertet. */
  saving?: boolean;
}

/* Beide Optionsformen auf value/label abbilden */
function optValue(o: InlineFieldOption): string { return typeof o==="string"?o:o.v; }
function optLabel(o: InlineFieldOption): string { return typeof o==="string"?o:o.l; }

export function InlineField({ label, value, field, type="text", opts=null, canEdit=false, editing, editVal, setEditVal, startEdit, saveEdit, cancelEdit, handleKey, feedback }: InlineFieldProps){
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
      {hasFeedback&&feedback?(
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
              {opts.map(o=><option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
            </select>
          ):type==="phone"?(
            <div onKeyDown={e=>{if(e.key==="Enter")saveEdit(field,editVal??"");if(e.key==="Escape")cancelEdit();}}>
              <PhoneInput value={editVal} onChange={v=>setEditVal(v)} showHint={true}/>
            </div>
          ):(
            <input className="cc-inline-input" type={type} value={editVal} autoFocus
              onChange={e=>setEditVal(e.target.value)}
              onKeyDown={e=>handleKey(e,field)}
              onBlur={()=>saveEdit(field,editVal??"")}/>
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
