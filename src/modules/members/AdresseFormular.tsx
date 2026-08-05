/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/AdresseFormular.tsx
   Strasse, PLZ, Ort und Kanton mit Adresssuche und PLZ-Nachschlag.
   Ausgelagert aus NeuesMitgliedModal, das sonst über der 400-Zeilen-
   Grenze für Formularkomponenten läge.

   Welche der Felder Pflicht sind, entscheidet der Aufrufer über die
   pflicht*-Props — Quelle ist die Pflichtfeld-Matrix, seit dem
   05.08.2026 mit einzelnen Feldern für Strasse, PLZ und Ort.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { useAddrSearch, usePlzLookup } from "../../theme.ts";

const KANTON_OPTS_M = ["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"];

interface AdresseFormularProps {
  strasse: string;
  plz: string;
  ort: string;
  kanton: string;
  onStrasse: (v: string) => void;
  onPlz: (v: string) => void;
  onOrt: (v: string) => void;
  onKanton: (v: string) => void;
  pflichtStrasse?: boolean;
  pflichtPlz?: boolean;
  pflichtOrt?: boolean;
  /* Rote Umrandung, wenn das Pflichtfeld bei der Prüfung leer war. */
  fehlerStrasse?: boolean;
  fehlerPlz?: boolean;
  fehlerOrt?: boolean;
}

export function AdresseFormular({strasse,plz,ort,kanton,onStrasse,onPlz,onOrt,onKanton,pflichtStrasse,pflichtPlz,pflichtOrt,fehlerStrasse,fehlerPlz,fehlerOrt}: AdresseFormularProps){
  const cls=(fehler?: boolean)=>fehler?"cc-input cc-input-error":"cc-input";
  const [showSug,setShowSug]=useState(false);
  const wrapRef=useRef<HTMLDivElement>(null);
  const suggestions=useAddrSearch(strasse,plz);

  usePlzLookup(plz,({ort:o,kanton:k})=>{
    if(o) onOrt(o);
    if(k) onKanton(k);
  });

  useEffect(()=>{
    const h=(e: MouseEvent)=>{if(wrapRef.current&&e.target instanceof Node&&!wrapRef.current.contains(e.target)) setShowSug(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  function apply(s: (typeof suggestions)[number]){
    onStrasse(s.strasse);
    if(s.plz) onPlz(s.plz);
    if(s.ort) onOrt(s.ort);
    if(s.kanton) onKanton(s.kanton);
    setShowSug(false);
  }

  return(
    <>
      <div className="cc-form-full cc-relative" ref={wrapRef}>
        <label className="cc-label">Strasse {pflichtStrasse&&<span className="cc-label-req">*</span>}</label>
        <input className={cls(fehlerStrasse)} type="text" value={strasse}
          onChange={e=>{onStrasse(e.target.value);setShowSug(true);}}
          onFocus={()=>setShowSug(true)}
          onBlur={()=>setTimeout(()=>setShowSug(false),150)}
          placeholder="Seestrasse 1"/>
        {showSug&&suggestions.length>0&&(
          <div className="cc-addr-dropdown">
            {suggestions.map((s,i)=>(
              <div key={i} className="cc-addr-suggestion" onMouseDown={()=>apply(s)}>
                <span className="cc-addr-suggestion-main">{s.strasse}</span>
                {s.plz&&<span className="cc-addr-suggestion-sub">{s.plz} {s.ort}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* PLZ, Ort und Kanton in einer Zeile — in der Reihenfolge, in der man
          eine Schweizer Adresse liest. Im zweispaltigen cc-form-row stand der
          Kanton sonst allein auf halber Breite, mit Leerraum daneben. */}
      <div className="cc-form-full cc-grid-3">
        <div>
          <label className="cc-label">PLZ {pflichtPlz&&<span className="cc-label-req">*</span>}</label>
          <input className={cls(fehlerPlz)} type="text" value={plz} maxLength={4}
            onChange={e=>onPlz(e.target.value)} placeholder="8704"/>
        </div>
        <div>
          <label className="cc-label">Ort {pflichtOrt&&<span className="cc-label-req">*</span>}</label>
          <input className={cls(fehlerOrt)} type="text" value={ort}
            onChange={e=>onOrt(e.target.value)} placeholder="Herrliberg"/>
        </div>
        <div>
          <label className="cc-label">Kanton</label>
          <select className="cc-input" value={kanton} onChange={e=>onKanton(e.target.value)}>
            <option value="">— wählen —</option>
            {KANTON_OPTS_M.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}