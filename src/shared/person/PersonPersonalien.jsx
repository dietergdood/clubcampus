/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonPersonalien.jsx
   Personalien-Card mit Inline Editing

   Nationalität: eine halbe Zelle, beide Badges nebeneinander.
   Klick → zwei Dropdowns untereinander in derselben Zelle.
   Beide Felder werden beim Schliessen gespeichert.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, InlineField } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { getLandName, LAENDER } from "../../domains/person/personUtils.js";
import { useInlineEdit } from "../../domains/members/useInlineEdit.js";

const GESCHLECHT_OPTS = [
  { v: "m", l: "Männlich" },
  { v: "w", l: "Weiblich" },
  { v: "d", l: "Divers" },
];

const LAENDER_OPTS = LAENDER.map(l => ({ v: l.c, l: `${l.c} · ${l.n}` }));
const LAENDER_OPTS2 = [{ v: "", l: "— keine —" }, ...LAENDER_OPTS];

function NatBadge({ code }) {
  if (!code) return null;
  return <span className="cc-land-badge">{code}</span>;
}

function PersonPersonalien({ raw, fv, canEdit, sb, onReload }) {
  const [ahvVisible, setAhvVisible] = useState(false);
  const [natEditing, setNatEditing] = useState(false);
  const [nat1Val, setNat1Val] = useState("");
  const [nat2Val, setNat2Val] = useState("");
  const ie = useInlineEdit({ sb, mitgliedId: raw.id, onReload });

  const age = raw.geburtsdatum
    ? Math.floor((new Date() - new Date(raw.geburtsdatum)) / 31557600000)
    : null;

  const nat1Name = raw.nationalitaet ? getLandName(raw.nationalitaet) || raw.nationalitaet : null;
  const nat2Name = raw.nationalitaet2 ? getLandName(raw.nationalitaet2) || raw.nationalitaet2 : null;
  const geschlechtLabel = raw.geschlecht === "m" ? "Männlich" : raw.geschlecht === "w" ? "Weiblich" : raw.geschlecht || null;
  const gebdatLabel = raw.geburtsdatum ? new Date(raw.geburtsdatum).toLocaleDateString("de-CH") : null;

  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit };

  function startNatEdit() {
    if (!canEdit) return;
    setNat1Val(raw.nationalitaet || "");
    setNat2Val(raw.nationalitaet2 || "");
    setNatEditing(true);
  }

  async function saveNat() {
    setNatEditing(false);
    if (!sb || !raw.id) return;
    await ie.saveEdit("nationalitaet", nat1Val);
    // nat2 direkt speichern ohne useInlineEdit (eigener Aufruf)
    const { updateMitglied } = await import("../../domains/members/memberService.js");
    await updateMitglied(sb, raw.id, { nationalitaet2: nat2Val || null });
    if (onReload) onReload();
  }

  function cancelNat() { setNatEditing(false); }

  return (
    <Card>
      <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
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
              {canEdit && <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>}
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
                  ? <span className="cc-inline-field cc-info-val" onClick={()=>ie.startEdit("ahv_nr", raw.ahv_nr)}>
                      {raw.ahv_nr}
                      <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>
                    </span>
                  : <span className="cc-ahv-mask">••• •• ••••</span>}
                <button className="cc-ahv-toggle" onClick={()=>setAhvVisible(v=>!v)} title={ahvVisible?"Verbergen":"Anzeigen"}>
                  <TI n={ahvVisible?"eye-off":"eye"} size={14}/>
                </button>
              </span>
            ) : (
              <span className="cc-inline-field cc-info-val-empty" onClick={()=>ie.startEdit("ahv_nr","")}>
                <span className="cc-inline-empty">nicht erfasst</span>
                <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export { PersonPersonalien };
