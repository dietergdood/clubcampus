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
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet, PhoneInput, useAddrSearch, usePlzLookup } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { insertMitglied, logAktivitaet, AKTIVITAET_TYP, FELD_LABEL } from "../../domains/members/memberService.js";

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

const KANTON_OPTS_M = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"];

function AdresseFormular({strasse,plz,ort,kanton,onStrasse,onPlz,onOrt,onKanton,pflichtStrasse,pflichtPlz,pflichtOrt}){
  const [showSug,setShowSug]=useState(false);
  const wrapRef=useRef(null);
  const suggestions=useAddrSearch(strasse,plz);

  usePlzLookup(plz,({ort:o,kanton:k})=>{
    if(o) onOrt(o);
    if(k) onKanton(k);
  });

  useEffect(()=>{
    const h=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target)) setShowSug(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  function apply(s){
    onStrasse(s.label);
    if(s.plz) onPlz(s.plz);
    if(s.ort) onOrt(s.ort);
    setShowSug(false);
  }

  return(
    <>
      <div className="cc-form-full cc-relative" ref={wrapRef}>
        <label className="cc-label">Strasse {pflichtStrasse&&<span className="cc-label-req">*</span>}</label>
        <input className="cc-input" type="text" value={strasse}
          onChange={e=>{onStrasse(e.target.value);setShowSug(true);}}
          onFocus={()=>setShowSug(true)}
          onBlur={()=>setTimeout(()=>setShowSug(false),150)}
          placeholder="Seestrasse 1"/>
        {showSug&&suggestions.length>0&&(
          <div className="cc-addr-dropdown">
            {suggestions.map((s,i)=>(
              <div key={i} className="cc-addr-suggestion" onMouseDown={()=>apply(s)}>
                <span className="cc-addr-suggestion-main">{s.label}</span>
                {s.plz&&<span className="cc-addr-suggestion-sub">{s.plz} {s.ort}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="cc-label">PLZ {pflichtPlz&&<span className="cc-label-req">*</span>}</label>
        <input className="cc-input" type="text" value={plz} maxLength={4}
          onChange={e=>onPlz(e.target.value)} placeholder="8704"/>
      </div>
      <div>
        <label className="cc-label">Ort {pflichtOrt&&<span className="cc-label-req">*</span>}</label>
        <input className="cc-input" type="text" value={ort}
          onChange={e=>onOrt(e.target.value)} placeholder="Herrliberg"/>
      </div>
      <div>
        <label className="cc-label">Kanton</label>
        <select className="cc-input" value={kanton} onChange={e=>onKanton(e.target.value)}>
          <option value="">— wählen —</option>
          {KANTON_OPTS_M.map(k=><option key={k} value={k}>{k}</option>)}
        </select>
      </div>
    </>
  );
}

export function NeuesMitgliedModal({ open, onClose, sb, dbMitgliedtypen, dbPortalRollen, dbPflichtfelder=[], vereinId, onSuccess, account=null }) {
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
    const BEKANNTE_FELDER = ["geburtsdatum","geschlecht","strasse","plz","ort","telefon","email","ahv_nr","nationalitaet","heimatort"];
    for (const feld of pflichtfelder) {
      if (!BEKANNTE_FELDER.includes(feld)) continue; // unbekannte Felder überspringen
      if (!form[feld]?.trim()) {
        return `${FELD_LABEL[feld] || feld} ist Pflicht.`;
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
    // Aktivität "angelegt" loggen
    const von = account?.name || account?.email || "Administrator";
    logAktivitaet(sb, id, vereinId, AKTIVITAET_TYP.ANGELEGT, "Mitglied angelegt", null, null, von);
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
              Mitgliedtyp <span className="cc-label-req">*</span>
            </label>
            <select className="cc-input" value={form.mitgliedtyp} onChange={e => set("mitgliedtyp", e.target.value)}
              style={!form.mitgliedtyp ? {borderColor:"var(--cc-accent,#FEC604)"} : {}}>
              <option value="">— zuerst wählen —</option>
              {mitgliedtypen.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {!form.mitgliedtyp && (
              <div className="cc-hint-sub">
                Bestimmt welche Pflichtfelder erscheinen
              </div>
            )}
          </div>

          {/* Felder nur wenn Mitgliedtyp gewählt */}
          {form.mitgliedtyp && (<>

            {/* Vorname / Nachname */}
            <div>
              <label className="cc-label">Vorname <span className="cc-label-req">*</span></label>
              <input className="cc-input" type="text" value={form.vorname||""} onChange={e=>set("vorname",e.target.value)} placeholder="Adrian"/>
            </div>
            <div>
              <label className="cc-label">Nachname <span className="cc-label-req">*</span></label>
              <input className="cc-input" type="text" value={form.nachname||""} onChange={e=>set("nachname",e.target.value)} placeholder="Bürgi"/>
            </div>

            {/* Geburtsdatum / Geschlecht */}
            {(istPflicht("geburtsdatum")||istPflicht("geschlecht")) && (<>
              <div>
                <label className="cc-label">
                  Geburtsdatum {istPflicht("geburtsdatum")&&<span className="cc-label-req">*</span>}
                </label>
                <input className="cc-input" type="date" value={form.geburtsdatum||""} onChange={e=>set("geburtsdatum",e.target.value)}/>
              </div>
              <div>
                <label className="cc-label">
                  Geschlecht {istPflicht("geschlecht")&&<span className="cc-label-req">*</span>}
                </label>
                <select className="cc-input" value={form.geschlecht||""} onChange={e=>set("geschlecht",e.target.value)}>
                  <option value="">— wählen —</option>
                  {GESCHLECHT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            </>)}

            {/* Adresse */}
            {(istPflicht("strasse")||istPflicht("plz")||istPflicht("ort")) && (
              <AdresseFormular
                strasse={form.strasse||""}
                plz={form.plz||""}
                ort={form.ort||""}
                kanton={form.kanton||""}
                onStrasse={v=>set("strasse",v)}
                onPlz={v=>set("plz",v)}
                onOrt={v=>set("ort",v)}
                onKanton={v=>set("kanton",v)}
                pflichtStrasse={istPflicht("strasse")}
                pflichtPlz={istPflicht("plz")}
                pflichtOrt={istPflicht("ort")}
              />
            )}

            {/* Telefon */}
            {istPflicht("telefon") && (
              <div className="cc-form-full">
                <label className="cc-label">Telefon <span className="cc-label-req">*</span></label>
                <PhoneInput value={form.telefon||""} onChange={v=>set("telefon",v)} showHint={false}/>
              </div>
            )}

            {/* E-Mail — immer optional */}
            {!istPassiv && (
              <div className="cc-form-full">
                <label className="cc-label">E-Mail</label>
                <input className="cc-input" type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="adrian@example.ch"/>
                <div className="cc-hint-sub">Optional — wird für Portal-Einladung benötigt</div>
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
              <div className="cc-info-hint">
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
