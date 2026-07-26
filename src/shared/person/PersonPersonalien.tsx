/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonPersonalien.tsx
   Personalien-Card mit Inline Editing

   Nationalität: eine halbe Zelle, beide Badges nebeneinander.
   Klick → zwei Dropdowns untereinander in derselben Zelle.
   Beide Felder werden beim Schliessen gespeichert.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, InlineField } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { getLandName, LAENDER, formatDatum } from "../../domains/person/personUtils.ts";
import type { UseInlineEditApi } from "../../domains/members/useInlineEdit.ts";
import type { InlineFieldOption } from "../../shared/forms/InlineField.tsx";
import type { Mitglied } from "../../types.ts";
import type { FieldVisibility } from "./types.ts";

const GESCHLECHT_OPTS: InlineFieldOption[] = [
  { v: "m", l: "Männlich" },
  { v: "w", l: "Weiblich" },
  { v: "d", l: "Divers" },
];

const LAENDER_OPTS = LAENDER.map(l => ({ v: l.c, l: `${l.c} · ${l.n}` }));
const LAENDER_OPTS2 = [{ v: "", l: "— keine —" }, ...LAENDER_OPTS];

function NatBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return <span className="cc-land-badge">{code}</span>;
}

interface PersonPersonalienProps {
  raw: Mitglied;
  fv: FieldVisibility;
  canEdit?: boolean;
  /* Inline-Edit-API wird vom Parent (InfoTab) injiziert — die Komponente
     importiert den members-Hook nicht selbst (Schichtentrennung). */
  ie: UseInlineEditApi;
}

function PersonPersonalien({ raw, fv, canEdit, ie }: PersonPersonalienProps) {
  const [ahvVisible, setAhvVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [natEditing, setNatEditing] = useState(false);
  const [nat1Val, setNat1Val] = useState("");
  const [nat2Val, setNat2Val] = useState("");

  const age = raw.geburtsdatum
    ? Math.floor((Date.now() - new Date(raw.geburtsdatum).getTime()) / 31557600000)
    : null;

  const nat1Name = raw.nationalitaet ? getLandName(raw.nationalitaet) || raw.nationalitaet : null;
  const nat2Name = raw.nationalitaet2 ? getLandName(raw.nationalitaet2) || raw.nationalitaet2 : null;
  const geschlechtLabel = raw.geschlecht === "m" ? "Männlich" : raw.geschlecht === "w" ? "Weiblich" : raw.geschlecht || null;
  const gebdatLabel = raw.geburtsdatum ? formatDatum(raw.geburtsdatum) : null;

  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit: canEdit && editMode };

  function startNatEdit() {
    if (!canEdit || !editMode) return;
    setNat1Val(raw.nationalitaet || "");
    setNat2Val(raw.nationalitaet2 || "");
    setNatEditing(true);
  }

  async function saveNat() {
    setNatEditing(false);
    if (!raw.id) return;
    await ie.saveEdit("nationalitaet", nat1Val);
    /* nat2 ueber dieselbe Inline-Edit-API — persistiert und loggt wie nat1,
       ohne direkten Service-Import. */
    await ie.saveEdit("nationalitaet2", nat2Val || "");
  }

  function cancelNat() { setNatEditing(false); }

  return (
    <Card>
      <div className="cc-section-title-row">
        <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
        {canEdit && (
          <button className={`cc-card-edit-btn${editMode?" cc-card-edit-btn-active":""}`}
            onClick={()=>setEditMode(m=>!m)} title={editMode?"Bearbeiten beenden":"Bearbeiten"}>
            <TI n={editMode?"x":"pencil"} size={16}/>
          </button>
        )}
      </div>
      <div className="cc-info-grid">
        <InlineField label="Nachname"     field="nachname"     value={raw.nachname||null}  {...ieProps}/>
        <InlineField label="Vorname"      field="vorname"      value={raw.vorname||null}   {...ieProps}/>
        {fv.showGebdat && (
          <InlineField label="Geburtsdatum" field="geburtsdatum" value={gebdatLabel} type="date"
            {...ieProps} startEdit={()=>ie.startEdit("geburtsdatum", raw.geburtsdatum||"")}/>
        )}
        {age != null && (
          <div className="cc-info-row">
            <span className="cc-info-key">Alter</span>
            <span className="cc-info-val">{age} Jahre</span>
          </div>
        )}
        <InlineField label="Geschlecht" field="geschlecht" value={geschlechtLabel}
          opts={GESCHLECHT_OPTS} {...ieProps}
          startEdit={()=>ie.startEdit("geschlecht", raw.geschlecht||"")}
          saveEdit={(f,v)=>ie.saveEdit(f,v)}/>

        {/* Nationalität — eine halbe Zelle, beide Badges, zwei Dropdowns beim Edit */}
        <div className="cc-info-row">
          <span className="cc-info-key">Nationalität</span>
          {natEditing ? (
            <div className="cc-col cc-gap-6 cc-flex-1 cc-nat-edit-wrap">
              <div>
                <div className="cc-inline-hint">1</div>
                <select className="cc-inline-select" value={nat1Val} autoFocus
                  onChange={e=>setNat1Val(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Escape")cancelNat();if(e.key==="Enter")saveNat();}}
                  onBlur={e=>{if(!e.currentTarget.closest('.cc-nat-edit-wrap')?.contains(e.relatedTarget))saveNat();}}>
                  <option value="">— keine —</option>
                  {LAENDER_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div>
                <div className="cc-inline-hint">2</div>
                <select className="cc-inline-select" value={nat2Val}
                  onChange={e=>setNat2Val(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Escape")cancelNat();if(e.key==="Enter")saveNat();}}
                  onBlur={e=>{if(!e.currentTarget.closest('.cc-nat-edit-wrap')?.contains(e.relatedTarget))saveNat();}}>
                  {LAENDER_OPTS2.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div className="cc-inline-hint">Esc abbrechen</div>
            </div>
          ) : (
            <span className={`cc-inline-field ${nat1Name?"cc-info-val":"cc-info-val-empty"}`}
              onClick={startNatEdit}>
              {nat1Name ? (
                <span className="cc-row cc-gap-4">
                  <NatBadge code={raw.nationalitaet}/> {nat1Name}
                  {nat2Name && <><span className="cc-text-sub">·</span><NatBadge code={raw.nationalitaet2}/> {nat2Name}</>}
                </span>
              ) : <span className="cc-inline-empty">nicht erfasst</span>}
              {canEdit && editMode && <span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>}
            </span>
          )}
        </div>

        <InlineField label="Heimatort" field="heimatort" value={raw.heimatort||null} {...ieProps}/>

        {fv.showAhv && (
          <div className="cc-info-row">
            <span className="cc-info-key">AHV-Nr.</span>
            {ie.editing === "ahv_nr" ? (
              <div className="cc-col cc-flex-1">
                <input className="cc-inline-input" type="text" value={ie.editVal} autoFocus
                  onChange={e=>ie.setEditVal(e.target.value)}
                  onKeyDown={e=>ie.handleKey(e,"ahv_nr")}
                  onBlur={()=>ie.saveEdit("ahv_nr",ie.editVal)}
                  placeholder="756.XXXX.XXXX.XX"/>
                <div className="cc-inline-hint">Enter speichern · Esc abbrechen</div>
              </div>
            ) : raw.ahv_nr ? (
              <span className="cc-ahv-row">
                {ahvVisible
                  ? <span className={`cc-inline-field cc-info-val`} onClick={editMode?()=>ie.startEdit("ahv_nr", raw.ahv_nr):undefined}>
                      {raw.ahv_nr}
                      {editMode&&<span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>}
                    </span>
                  : <span className="cc-ahv-mask">••• •• ••••</span>}
                <button className="cc-ahv-toggle" onClick={()=>setAhvVisible(v=>!v)} title={ahvVisible?"Verbergen":"Anzeigen"}>
                  <TI n={ahvVisible?"eye-off":"eye"} size={14}/>
                </button>
              </span>
            ) : (
              <span className={`cc-inline-field cc-info-val-empty`} onClick={editMode?()=>ie.startEdit("ahv_nr",""):undefined}>
                <span className="cc-inline-empty">nicht erfasst</span>
                {editMode&&<span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export { PersonPersonalien };
