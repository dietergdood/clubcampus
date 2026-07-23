/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NeuesMitgliedModal.jsx
   Modal zum Anlegen eines neuen Mitglieds.

   Mitgliedtyp zuerst wählen → dynamische Pflichtfelder erscheinen.
   Pflichtfelder kommen aus mitgliedtyp_pflichtfelder (DB) oder
   Fallback-Logik wenn Tabelle leer.

   Felder:
     Immer:       mitgliedtyp*, vorname*, nachname*
     Aktivtypen:  geburtsdatum*, geschlecht*, strasse*, plz*, ort*, telefon*, email, portalrolle
     Passivtypen: geburtsdatum*, geschlecht*, strasse*, plz*, ort*, telefon*
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Btn, ModalOrSheet } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { insertMitglied } from "../../domains/members/memberService.js";

const PASSIV_TYPEN = ["Passivmitglied", "Ehrenmitglied", "Gönner", "Freimitglied"];

function getPflichtfelder(mitgliedtyp, dbPflichtfelder) {
  // DB-Konfiguration nutzen wenn vorhanden
  const dbFelder = dbPflichtfelder.filter(p => p.mitgliedtyp === mitgliedtyp && p.pflicht);
  if (dbFelder.length > 0) return dbFelder.map(p => p.feld);

  // Fallback-Logik
  const basis = ["vorname", "nachname", "geburtsdatum", "geschlecht", "strasse", "plz", "ort", "telefon"];
  if (PASSIV_TYPEN.includes(mitgliedtyp)) return basis;
  return basis; // Aktivmitglieder gleiche Basis
}

const GESCHLECHT_OPTS = [
  { v: "m", l: "Männlich" },
  { v: "w", l: "Weiblich" },
  { v: "d", l: "Divers" },
];

export function NeuesMitgliedModal({ open, onClose, sb, dbMitgliedtypen, dbPortalRollen, dbPflichtfelder=[], vereinId, onSuccess }) {
  const [form, setForm] = useState({ mitgliedtyp: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const mitgliedtypen = dbMitgliedtypen?.length > 0
    ? dbMitgliedtypen.map(t => t.name)
    : ["Aktivmitglied", "Juniormitglied", "Passivmitglied", "Ehrenmitglied"];

  const portalRollen = dbPortalRollen?.length > 0
    ? dbPortalRollen
    : [
        { name: "trainer",     label: "Trainer/in" },
        { name: "spieler",     label: "Spieler/in" },
        { name: "funktionaer", label: "Funktionär" },
        { name: "eltern",      label: "Elternteil" },
        { name: "mitglied",    label: "Mitglied" },
      ];

  const pflichtfelder = form.mitgliedtyp
    ? getPflichtfelder(form.mitgliedtyp, dbPflichtfelder)
    : [];

  const istPflicht = (feld) => pflichtfelder.includes(feld);
  const istPassiv = PASSIV_TYPEN.includes(form.mitgliedtyp);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setMsg(null);
  }

  function validate() {
    if (!form.mitgliedtyp) return "Bitte Mitgliedtyp wählen.";
    if (!form.vorname?.trim()) return "Vorname ist Pflicht.";
    if (!form.nachname?.trim()) return "Nachname ist Pflicht.";
    for (const feld of pflichtfelder) {
      if (!form[feld]?.trim()) {
        const labels = { geburtsdatum: "Geburtsdatum", geschlecht: "Geschlecht", strasse: "Strasse", plz: "PLZ", ort: "Ort", telefon: "Telefon" };
        return `${labels[feld] || feld} ist Pflicht.`;
      }
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setMsg({ ok: false, text: err }); return; }
    if (!sb) return;
    setSaving(true); setMsg(null);
    const id = await insertMitglied(sb, {
      vorname:      form.vorname?.trim() || null,
      nachname:     form.nachname?.trim() || null,
      geburtsdatum: form.geburtsdatum || null,
      geschlecht:   form.geschlecht || null,
      strasse:      form.strasse?.trim() || null,
      plz:          form.plz?.trim() || null,
      ort:          form.ort?.trim() || null,
      telefon:      form.telefon?.trim() || null,
      email:        form.email?.trim() || null,
      mitgliedtyp:  form.mitgliedtyp || null,
      rolle:        form.rolle || null,
    }, vereinId);
    setSaving(false);
    if (!id) { setMsg({ ok: false, text: "Fehler beim Speichern." }); return; }
    setMsg({ ok: true, text: "Mitglied angelegt ✓" });
    setTimeout(() => {
      setForm({ mitgliedtyp: "" });
      setMsg(null);
      onClose();
      if (onSuccess) onSuccess(id);
    }, 800);
  }

  function handleClose() {
    setForm({ mitgliedtyp: "" });
    setMsg(null);
    onClose();
  }

  return (
    <ModalOrSheet open={open} onClose={handleClose} maxWidth={520}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">Neues Mitglied</div>
        <Btn variant="ghost" small onClick={handleClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-modal-body">
        <div className="cc-form-row">

          {/* Mitgliedtyp — immer zuerst */}
          <div className="cc-form-full">
            <label className="cc-label">
              Mitgliedtyp <span style={{color:"var(--red,#A32D2D)"}}>*</span>
            </label>
            <select className="cc-input" value={form.mitgliedtyp} onChange={e => set("mitgliedtyp", e.target.value)}
              style={!form.mitgliedtyp ? {borderColor:"var(--cc-accent,#FFBF00)"} : {}}>
              <option value="">— zuerst wählen —</option>
              {mitgliedtypen.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {!form.mitgliedtyp && (
              <div className="cc-text-sm" style={{color:"var(--sub)",marginTop:4}}>
                Bestimmt welche Pflichtfelder erscheinen
              </div>
            )}
          </div>

          {/* Felder nur wenn Mitgliedtyp gewählt */}
          {form.mitgliedtyp && (<>

            {/* Vorname / Nachname */}
            <div>
              <label className="cc-label">Vorname <span style={{color:"var(--red,#A32D2D)"}}>*</span></label>
              <input className="cc-input" type="text" value={form.vorname||""} onChange={e=>set("vorname",e.target.value)} placeholder="Adrian"/>
            </div>
            <div>
              <label className="cc-label">Nachname <span style={{color:"var(--red,#A32D2D)"}}>*</span></label>
              <input className="cc-input" type="text" value={form.nachname||""} onChange={e=>set("nachname",e.target.value)} placeholder="Bürgi"/>
            </div>

            {/* Geburtsdatum / Geschlecht */}
            {(istPflicht("geburtsdatum")||istPflicht("geschlecht")) && (<>
              <div>
                <label className="cc-label">
                  Geburtsdatum {istPflicht("geburtsdatum")&&<span style={{color:"var(--red,#A32D2D)"}}>*</span>}
                </label>
                <input className="cc-input" type="date" value={form.geburtsdatum||""} onChange={e=>set("geburtsdatum",e.target.value)}/>
              </div>
              <div>
                <label className="cc-label">
                  Geschlecht {istPflicht("geschlecht")&&<span style={{color:"var(--red,#A32D2D)"}}>*</span>}
                </label>
                <select className="cc-input" value={form.geschlecht||""} onChange={e=>set("geschlecht",e.target.value)}>
                  <option value="">— wählen —</option>
                  {GESCHLECHT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            </>)}

            {/* Adresse */}
            {istPflicht("strasse") && (
              <div className="cc-form-full">
                <label className="cc-label">Strasse <span style={{color:"var(--red,#A32D2D)"}}>*</span></label>
                <input className="cc-input" type="text" value={form.strasse||""} onChange={e=>set("strasse",e.target.value)} placeholder="Seestrasse 1"/>
              </div>
            )}
            {(istPflicht("plz")||istPflicht("ort")) && (<>
              <div>
                <label className="cc-label">PLZ {istPflicht("plz")&&<span style={{color:"var(--red,#A32D2D)"}}>*</span>}</label>
                <input className="cc-input" type="text" value={form.plz||""} onChange={e=>set("plz",e.target.value)} placeholder="8704"/>
              </div>
              <div>
                <label className="cc-label">Ort {istPflicht("ort")&&<span style={{color:"var(--red,#A32D2D)"}}>*</span>}</label>
                <input className="cc-input" type="text" value={form.ort||""} onChange={e=>set("ort",e.target.value)} placeholder="Herrliberg"/>
              </div>
            </>)}

            {/* Telefon */}
            {istPflicht("telefon") && (
              <div className="cc-form-full">
                <label className="cc-label">Telefon <span style={{color:"var(--red,#A32D2D)"}}>*</span></label>
                <input className="cc-input" type="tel" value={form.telefon||""} onChange={e=>set("telefon",e.target.value)} placeholder="079 123 45 67"/>
              </div>
            )}

            {/* E-Mail — immer optional */}
            {!istPassiv && (
              <div className="cc-form-full">
                <label className="cc-label">E-Mail</label>
                <input className="cc-input" type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="adrian@example.ch"/>
                <div className="cc-text-sm" style={{color:"var(--sub)",marginTop:3}}>Optional — wird für Portal-Einladung benötigt</div>
              </div>
            )}

            {/* Portalrolle — nur für Aktive */}
            {!istPassiv && (
              <div className="cc-form-full">
                <label className="cc-label">Portalrolle</label>
                <select className="cc-input" value={form.rolle||""} onChange={e=>set("rolle",e.target.value)}>
                  <option value="">— keine —</option>
                  {portalRollen.map(r=><option key={r.name} value={r.name}>{r.label}</option>)}
                </select>
              </div>
            )}

            <div className="cc-form-full">
              <div className="cc-info-box" style={{fontSize:12,color:"var(--sub)",padding:"8px 10px",background:"var(--surface)",borderRadius:6,border:"0.5px solid var(--border)"}}>
                <TI n="info-circle" size={13}/> Alle weiteren Angaben (AHV-Nr., Nationalität, Spielerpass etc.) können danach im Profil ergänzt werden.
              </div>
            </div>

          </>)}

        </div>

        {msg && (
          <div className={`cc-badge ${msg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{msg.text}</div>
        )}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={handleClose}>Abbrechen</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving || !form.mitgliedtyp}>
          {saving ? "Wird gespeichert…" : "Mitglied anlegen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
