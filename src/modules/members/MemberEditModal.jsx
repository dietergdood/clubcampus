/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberEditModal.jsx
   Edit-Modal für Mitglied-Stammdaten (aus MemberHero ausgelagert)
   Props: m, raw, editForm, setEditForm, editMsg, editSaving,
          onSave, onClose, LAENDER, MITGLIEDTYPEN, dbPortalRollen
   ═══════════════════════════════════════════════════════════════ */
import { Btn, ModalOrSheet, LandSelect } from "../../theme.jsx";
import { TI } from "../../icons.jsx";

export function MemberEditModal({ m, editForm, setEditForm, editMsg, editSaving, onSave, onClose, LAENDER, MITGLIEDTYPEN, dbPortalRollen }) {
  return (
    <ModalOrSheet open={true} onClose={onClose} maxWidth={560}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{m.name} bearbeiten</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14}/></Btn>
      </div>
      <div className="cc-modal-body">
        <div className="cc-form-row">
          {/* Personalien */}
          <div className="cc-form-section-title" data-label="Personalien"/>
          {[
            {k:"vorname",       l:"Vorname"},
            {k:"nachname",      l:"Nachname"},
            {k:"geburtsdatum",  l:"Geburtsdatum", type:"date"},
            {k:"geschlecht",    l:"Geschlecht",   opts:[{v:"m",l:"Männlich"},{v:"w",l:"Weiblich"}]},
            {k:"nationalitaet", l:"Nationalität",  isLaender:true},
            {k:"nationalitaet2",l:"Nationalität 2",isLaender:true},
            {k:"heimatort",     l:"Heimatort"},
            {k:"ahv_nr",        l:"AHV-Nr."},
          ].map(({k,l,type="text",opts,isLaender}) => (
            <div key={k}>
              <label className="cc-label">{l}</label>
              {isLaender ? (
                <LandSelect value={editForm[k]||""} onChange={v=>setEditForm(f=>({...f,[k]:v}))} laender={LAENDER}/>
              ) : opts ? (
                <select className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}>
                  <option value="">–</option>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : (
                <input className="cc-input" type={type} value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
              )}
            </div>
          ))}

          {/* Kontakt */}
          <div className="cc-form-section-title cc-form-full" data-label="Kontakt"/>
          {[
            {k:"email",   l:"E-Mail",  type:"email", full:true},
            {k:"telefon", l:"Telefon", type:"tel"},
            {k:"strasse", l:"Strasse", full:true},
            {k:"plz",     l:"PLZ"},
            {k:"ort",     l:"Ort"},
            {k:"kanton",  l:"Kanton"},
          ].map(({k,l,type="text",full}) => (
            <div key={k} className={full?"cc-form-full":""}>
              <label className="cc-label">{l}</label>
              <input className="cc-input" type={type} value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
            </div>
          ))}

          {/* Vereinsdaten */}
          <div className="cc-form-section-title cc-form-full" data-label="Vereinsdaten"/>
          <div>
            <label className="cc-label">Mitgliedtyp</label>
            <select className="cc-input" value={editForm.mitgliedtyp||""} onChange={e=>setEditForm(f=>({...f,mitgliedtyp:e.target.value}))}>
              <option value="">– wählen –</option>
              {MITGLIEDTYPEN.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="cc-label">Portal-Rolle</label>
            <select className="cc-input" value={editForm.rolle||""} onChange={e=>setEditForm(f=>({...f,rolle:e.target.value}))}>
              <option value="">– keine –</option>
              {((dbPortalRollen||[]).length>0
                ? dbPortalRollen
                : [{name:"administrator",label:"Administrator"},{name:"administration",label:"Verwaltung"},
                   {name:"funktionaer",label:"Funktionär"},{name:"trainer",label:"Trainer"},
                   {name:"spieler",label:"Spieler"},{name:"eltern",label:"Eltern"},
                   {name:"mitglied",label:"Mitglied"},{name:"supporter",label:"Supporter"}]
              ).map(r=><option key={r.name} value={r.name}>{r.label}</option>)}
            </select>
          </div>
          {[
            {k:"spielerpass", l:"Spielerpass"},
            {k:"js_nr",       l:"J+S Nr."},
            {k:"fairgate_id", l:"Fairgate-ID"},
          ].map(({k,l}) => (
            <div key={k}>
              <label className="cc-label">{l}</label>
              <input className="cc-input" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
            </div>
          ))}
        </div>
        {editMsg && <div className={`cc-badge ${editMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{editMsg.text}</div>}
      </div>
      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Abbrechen</Btn>
        <Btn variant="primary" onClick={onSave} disabled={editSaving}>
          {editSaving ? "Speichert…" : "Speichern"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
