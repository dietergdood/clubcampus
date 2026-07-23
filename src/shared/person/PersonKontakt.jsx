/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonKontakt.jsx
   Kontakt-Card mit Inline Editing
   Props: raw, fv, canEdit, sb, onReload, eltern, brauchtEltern, setTab
   ═══════════════════════════════════════════════════════════════ */
import { Av, Card, InlineField } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { useInlineEdit } from "../../domains/members/useInlineEdit.js";

const KANTON_OPTS = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"].map(k=>({v:k,l:k}));

function PersonKontakt({ raw, fv, canEdit, sb, onReload, vereinId=null, account=null, eltern, brauchtEltern, setTab }) {
  const ie = useInlineEdit({ sb, mitgliedId: raw.id, onReload, vereinId, account, rawData: raw });

  if (!fv.showEmail && !fv.showTelefon && !fv.showAdresse) return null;

  const hk = brauchtEltern(raw.mitgliedtyp) ? (eltern || []).find(e => e.hauptkontakt) : null;
  const hkName = hk ? (hk.name || `${hk.vorname||""} ${hk.nachname||""}`.trim() || "?") : null;
  const hkTel = hk ? (hk.telefon || hk.tel) : null;

  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit };

  return (
    <Card>
      <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
      <div className="cc-info-grid">
        {fv.showEmail   && <InlineField label="E-Mail"  field="email"   value={raw.email||null}   type="email" {...ieProps}/>}
        {fv.showTelefon && <InlineField label="Telefon" field="telefon" value={raw.telefon||null} type="tel"   {...ieProps}/>}
        {fv.showAdresse && <>
          <InlineField label="Strasse" field="strasse" value={raw.strasse||null} {...ieProps}/>
          <InlineField label="PLZ"     field="plz"     value={raw.plz||null}     {...ieProps}/>
          <InlineField label="Ort"     field="ort"     value={raw.ort||null}     {...ieProps}/>
          <InlineField label="Kanton"  field="kanton"  value={raw.kanton||null}  opts={KANTON_OPTS} {...ieProps} startEdit={()=>ie.startEdit("kanton",raw.kanton||"")} saveEdit={(f,v)=>ie.saveEdit(f,v)}/>
        </>}
      </div>

      {/* Hauptkontakt Mini-Karte */}
      {hk && (
        <>
          <div className="cc-hk-sub-label">
            <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
            <button className="cc-hk-tab-link" onClick={()=>setTab("eltern")}>
              Eltern ({(eltern||[]).length}) <TI n="chevron-right" size={12}/>
            </button>
          </div>
          <div className="cc-hk-card">
            <Av name={hkName} size="md" bg="rgba(255,191,0,0.15)"/>
            <div className="cc-hk-content">
              <div className="cc-text-bold">{hkName}</div>
              <div className="cc-text-sm cc-text-sub">{hk.beziehung||"—"}</div>
              {hk.email&&<a href={`mailto:${hk.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{hk.email}</a>}
              {hkTel&&<a href={`tel:${hkTel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{hkTel}</a>}
            </div>
          </div>
        </>
      )}
      {brauchtEltern(raw.mitgliedtyp)&&!hk&&(
        <>
          <div className="cc-hk-sub-label">
            <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
            <button className="cc-hk-tab-link" onClick={()=>setTab("eltern")}>
              Eltern ({(eltern||[]).length}) <TI n="chevron-right" size={12}/>
            </button>
          </div>
          <div className="cc-warn-box"><TI n="alert-triangle" size={14}/> Kein Hauptkontakt — bitte im Tab "Eltern" festlegen</div>
        </>
      )}
    </Card>
  );
}

export { PersonKontakt };
