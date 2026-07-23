/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonPersonalien.jsx
   Personalien-Card mit Inline Editing
   Props: raw, fv, canEdit, sb, onReload
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

function PersonPersonalien({ raw, fv, canEdit, sb, onReload }) {
  const [ahvVisible, setAhvVisible] = useState(false);
  const ie = useInlineEdit({ sb, mitgliedId: raw.id, onReload });

  const age = raw.geburtsdatum
    ? Math.floor((new Date() - new Date(raw.geburtsdatum)) / 31557600000)
    : null;

  const natLabel = raw.nationalitaet ? getLandName(raw.nationalitaet) || raw.nationalitaet : null;
  const nat2Label = raw.nationalitaet2 ? getLandName(raw.nationalitaet2) || raw.nationalitaet2 : null;
  const natDisplay = natLabel && nat2Label ? `${natLabel} · ${nat2Label}` : (natLabel || null);

  const geschlechtLabel = raw.geschlecht === "m" ? "Männlich" : raw.geschlecht === "w" ? "Weiblich" : raw.geschlecht || null;
  const gebdatLabel = raw.geburtsdatum ? new Date(raw.geburtsdatum).toLocaleDateString("de-CH") : null;

  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit };

  return (
    <Card>
      <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
      <div className="cc-info-grid">
        <InlineField label="Nachname"    field="nachname"    value={raw.nachname||null}    {...ieProps}/>
        <InlineField label="Vorname"     field="vorname"     value={raw.vorname||null}     {...ieProps}/>
        {fv.showGebdat && (
          <InlineField label="Geburtsdatum" field="geburtsdatum" value={gebdatLabel} type="date"
            {...ieProps}
            startEdit={()=>ie.startEdit("geburtsdatum", raw.geburtsdatum||"")}/>
        )}
        {age != null && (
          <div className="cc-info-row">
            <span className="cc-info-key">Alter</span>
            <span className="cc-info-val">{age} Jahre</span>
          </div>
        )}
        <InlineField label="Geschlecht"  field="geschlecht"  value={geschlechtLabel}
          opts={GESCHLECHT_OPTS} {...ieProps}
          startEdit={()=>ie.startEdit("geschlecht", raw.geschlecht||"")}
          saveEdit={(f,v)=>ie.saveEdit(f,v)}/>
        <InlineField label="Nationalität" field="nationalitaet" value={natDisplay}
          opts={LAENDER.map(l=>({v:l.c,l:l.n}))} {...ieProps}
          startEdit={()=>ie.startEdit("nationalitaet", raw.nationalitaet||"")}
          saveEdit={(f,v)=>ie.saveEdit(f,v)}/>
        <InlineField label="Heimatort"   field="heimatort"   value={raw.heimatort||null}   {...ieProps}/>
        {fv.showAhv && (
          <div className="cc-info-row">
            <span className="cc-info-key">AHV-Nr.</span>
            {ie.editing === "ahv_nr" ? (
              <div style={{flex:1}}>
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
                  ? <span className={`cc-inline-field cc-info-val`} onClick={()=>ie.startEdit("ahv_nr", raw.ahv_nr)}>
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
