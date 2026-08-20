/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonKontakt.tsx
   Kontakt-Card mit Inline Editing
   Props: raw, fv, canEdit, sb, onReload, eltern, brauchtEltern, setTab
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { Av, Card, InlineField, useAddrSearch, usePlzLookup } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import type { UseInlineEditApi } from "../../domains/members/useInlineEdit.ts";
import type { InlineFieldOption } from "../../shared/forms/InlineField.tsx";
import type { AddressSuggestion } from "../../shared/forms/AddressInput.tsx";
import type { Mitglied, PersonZeile } from "../../types.ts";
import type { ElternkontaktMitLink } from "../../domains/members/elternService.ts";
import type { Sichtbarkeit } from "./types.ts";

const KANTON_OPTS: InlineFieldOption[] = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"].map(k=>({v:k,l:k}));

/* Die von useInlineEdit gelieferten Felder, die an InlineField gereicht werden */
type InlineEdit = UseInlineEditApi;

interface PersonKontaktProps {
  raw: PersonZeile;
  fv: Sichtbarkeit;
  canEdit?: boolean;
  /* Inline-Edit-API wird vom Parent (InfoTab) injiziert. */
  ie: UseInlineEditApi;
  eltern?: ElternkontaktMitLink[] | null;
  /* Entscheidet anhand des Mitgliedtyps, ob ein Elternkontakt nötig ist */
  brauchtEltern: (mitgliedtyp: string | null | undefined) => boolean;
  setTab: (tab: string) => void;
}

function PersonKontakt({ raw, fv, canEdit, ie, eltern, brauchtEltern, setTab }: PersonKontaktProps) {
  const [editMode, setEditMode] = useState(false);

  if (!fv.email && !fv.telefon && !fv.strasse) return null;

  const hk = brauchtEltern(raw.mitgliedtyp) ? (eltern || []).find(e => e.hauptkontakt) : null;
  const hkName = hk ? (hk.name || `${hk.vorname||""} ${hk.nachname||""}`.trim() || "?") : null;
  /* `personen` hat nur `telefon`. Die zweite Spalte `tel` gab es allein
     in `elternkontakte` und ist mit Etappe 3 weggefallen. */
  const hkTel = hk?.telefon || null;

  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit: canEdit && editMode };

  return (
    <Card>
      <div className="cc-section-title-row">
        <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
        {canEdit && (
          <button className={`cc-card-edit-btn${editMode?" cc-card-edit-btn-active":""}`}
            onClick={()=>setEditMode(m=>!m)} title={editMode?"Bearbeiten beenden":"Bearbeiten"}>
            <TI n={editMode?"x":"pencil"} size={16}/>
          </button>
        )}
      </div>
      <div className="cc-info-grid">
        {fv.email && (editMode
          ? <InlineField label="E-Mail" field="email" value={raw.email||null} type="email" {...ieProps}/>
          : <div className="cc-info-row">
              <span className="cc-info-key">E-Mail</span>
              {raw.email
                ? <a href={`mailto:${raw.email}`} className="cc-contact-link">{raw.email}</a>
                : <span className="cc-info-val-empty">—</span>}
            </div>
        )}
        {fv.telefon && (editMode
          ? <InlineField label="Telefon" field="telefon" value={raw.telefon||null} type="phone" {...ieProps}/>
          : <div className="cc-info-row">
              <span className="cc-info-key">Telefon</span>
              {raw.telefon
                ? <a href={`tel:${raw.telefon}`} className="cc-contact-link-plain">{raw.telefon}</a>
                : <span className="cc-info-val-empty">—</span>}
            </div>
        )}
        {fv.strasse && <AdressFelder raw={raw} ie={ie} ieProps={ieProps} KANTON_OPTS={KANTON_OPTS}/>}
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
              {hkTel&&<a href={`tel:${hkTel}`} className="cc-contact-link-plain"><TI n="phone" size={12}/>{hkTel}</a>}
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

interface AdressFelderProps {
  raw: PersonZeile;
  ie: InlineEdit;
  /* Die an InlineField durchgereichten Felder inkl. canEdit */
  ieProps: Pick<InlineEdit, "editing"|"editVal"|"setEditVal"|"startEdit"|"saveEdit"|"cancelEdit"|"handleKey"|"feedback"|"saving"> & { canEdit?: boolean };
  KANTON_OPTS: InlineFieldOption[];
}

function AdressFelder({raw, ie, ieProps, KANTON_OPTS}: AdressFelderProps){
  const [strasseInput, setStrasseInput] = useState(raw.strasse||"");
  const [plzInput, setPlzInput] = useState(raw.plz||"");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useAddrSearch(strasseInput, plzInput);

  usePlzLookup(plzInput, ({ort, kanton})=>{
    if(ort && !ie.editing) {
      ie.saveEdit("ort", ort);
      if(kanton) ie.saveEdit("kanton", kanton);
    }
  });

  useEffect(()=>{
    const h=(e: MouseEvent)=>{if(wrapRef.current&&e.target instanceof Node&&!wrapRef.current.contains(e.target)) setShowSuggestions(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  function applySuggestion(s: AddressSuggestion){
    setStrasseInput(s.strasse);
    setPlzInput(s.plz);
    setShowSuggestions(false);
    ie.saveEdit("strasse", s.strasse);
    if(s.plz) ie.saveEdit("plz", s.plz);
    if(s.ort) ie.saveEdit("ort", s.ort);
    if(s.kanton) ie.saveEdit("kanton", s.kanton);
  }

  return(
    <>
      <div className="cc-info-row cc-relative" ref={wrapRef}>
        <span className="cc-info-key">Strasse</span>
        {ieProps.editing==="strasse"?(
          <div className="cc-flex-1 cc-relative">
            <input className="cc-inline-input" value={strasseInput} autoFocus
              onChange={e=>{setStrasseInput(e.target.value);ieProps.setEditVal(e.target.value);setShowSuggestions(true);}}
              onKeyDown={e=>{if(e.key==="Enter"){ieProps.saveEdit("strasse",strasseInput);setShowSuggestions(false);}if(e.key==="Escape"){ieProps.cancelEdit();setShowSuggestions(false);}}}
              onBlur={()=>{setTimeout(()=>setShowSuggestions(false),150);}}
            />
            {showSuggestions&&suggestions.length>0&&(
              <div className="cc-addr-dropdown">
                {suggestions.map((s,i)=>(
                  <div key={i} className="cc-addr-suggestion" onMouseDown={()=>applySuggestion(s)}>
                    <span className="cc-addr-suggestion-main">{s.strasse}</span>
                    {s.plz&&<span className="cc-addr-suggestion-sub">{s.plz} {s.ort}{s.kanton?" · "+s.kanton:""}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="cc-inline-hint">Enter speichern · Esc abbrechen</div>
          </div>
        ):(
          <span className={`cc-inline-field ${raw.strasse?"cc-info-val":"cc-info-val-empty"}`}
            onClick={ieProps.canEdit?()=>{setStrasseInput(raw.strasse||"");ieProps.startEdit("strasse",raw.strasse||"");setShowSuggestions(true);}:undefined}>
            {raw.strasse||<span className="cc-inline-empty">nicht erfasst</span>}
            {ieProps.canEdit&&<span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>}
          </span>
        )}
      </div>
      <div className="cc-info-row">
        <span className="cc-info-key">PLZ</span>
        {ieProps.editing==="plz"?(
          <div className="cc-flex-1">
            <input className="cc-inline-input" value={plzInput} autoFocus maxLength={4}
              onChange={e=>{setPlzInput(e.target.value);ieProps.setEditVal(e.target.value);}}
              onKeyDown={e=>{if(e.key==="Enter"){ieProps.saveEdit("plz",plzInput);}if(e.key==="Escape")ieProps.cancelEdit();}}
              onBlur={()=>ieProps.saveEdit("plz",plzInput)}
            />
            <div className="cc-inline-hint">Enter speichern · Esc abbrechen</div>
          </div>
        ):(
          <span className={`cc-inline-field ${raw.plz?"cc-info-val":"cc-info-val-empty"}`}
            onClick={ieProps.canEdit?()=>{setPlzInput(raw.plz||"");ieProps.startEdit("plz",raw.plz||"");}:undefined}>
            {raw.plz||<span className="cc-inline-empty">nicht erfasst</span>}
            {ieProps.canEdit&&<span className="cc-inline-pencil"><TI n="pencil" size={14}/></span>}
          </span>
        )}
      </div>
      <InlineField label="Ort"    field="ort"    value={raw.ort||null}    {...ieProps}/>
      <InlineField label="Kanton" field="kanton" value={raw.kanton||null} opts={KANTON_OPTS} {...ieProps} startEdit={()=>ie.startEdit("kanton",raw.kanton||"")} saveEdit={(f,v)=>ie.saveEdit(f,v)}/>
    </>
  );
}

export { PersonKontakt };
