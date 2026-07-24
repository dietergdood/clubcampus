/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternSucheModal.jsx
   Modal zum Suchen + Verknüpfen bestehender Elternkontakte
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { sucheElternkontakte, linkKind } from "../../domains/members/memberService.js";
import { elternAvColor } from "./tabs/ElternTab.jsx";

export function ElternSucheModal({ open, onClose, raw, sb, vereinId, onVerknuepft }) {
  const [tab, setTab] = useState("suche");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const data = await sucheElternkontakte(sb, vereinId, query);
      setResults(data);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  async function verknuepfen() {
    if (!selected) return;
    setSaving(true);
    await linkKind(sb, selected.id, raw.id, vereinId, false);
    setSaving(false);
    onVerknuepft();
    onClose();
  }

  if (!open) return null;
  return (
    <ModalOrSheet open={true} onClose={onClose} maxWidth={480}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">Elternkontakt hinzufügen</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-tab-row">
        <button className={`cc-tab-btn${tab==="suche"?" cc-tab-btn-active":""}`} onClick={()=>setTab("suche")}>Bestehenden suchen</button>
        <button className={`cc-tab-btn${tab==="neu"?" cc-tab-btn-active":""}`} onClick={()=>setTab("neu")}>Neu erfassen</button>
      </div>

      {tab==="suche" ? (
        <div className="cc-modal-body">
          <div className="cc-relative">
            <TI n="search" size={14} style={{position:"absolute",left:10,top:10,color:"var(--sub)"}}/>
            <input className="cc-input cc-search-input" placeholder="Name oder E-Mail suchen…"
              value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}} autoFocus/>
          </div>

          {results.length > 0 && (
            <div className="cc-col cc-gap-6 cc-mt-8">
              {results.map(e => {
                const name = `${e.vorname||""} ${e.nachname||""}`.trim()||e.name||"?";
                const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                const ac = elternAvColor(e.beziehung);
                const kinder = e.eltern_kinder||[];
                const isSel = selected?.id === e.id;
                return (
                  <div key={e.id}
                    className={`cc-eltern-result${isSel?" cc-eltern-result-active":""}`}
                    onClick={()=>setSelected(isSel?null:e)}>
                    <div className="cc-eltern-av" style={{background:ac.bg,color:ac.text}}>{initials}</div>
                    <div className="cc-flex-1 cc-col cc-gap-3">
                      <div className="cc-text-bold cc-text-sm">{name}</div>
                      {e.beziehung&&<div className="cc-text-sm cc-text-sub">{e.beziehung}{e.email?` · ${e.email}`:""}</div>}
                      {kinder.map((k,i)=>(
                        <div key={i} className="cc-text-sm cc-text-sub">
                          <TI n="users" size={12}/> {k.mitglieder?.vorname} {k.mitglieder?.nachname}
                        </div>
                      ))}
                    </div>
                    {isSel&&<TI n="check" size={16} style={{color:"#16a34a",flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
          )}
          {query.trim()&&results.length===0&&(
            <div className="cc-text-sm cc-text-sub cc-mt-8 cc-text-center">Keine Treffer — im Tab "Neu erfassen" anlegen.</div>
          )}
          {!query.trim()&&(
            <div className="cc-text-sm cc-text-sub cc-mt-8 cc-text-center">Name oder E-Mail eingeben…</div>
          )}
        </div>
      ) : (
        <div className="cc-modal-body">
          <div className="cc-text-sm cc-text-sub">Neuen Elternkontakt anlegen und mit diesem Kind verknüpfen.</div>
        </div>
      )}

      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Abbrechen</Btn>
        {tab==="suche" ? (
          <Btn variant="primary" onClick={verknuepfen} disabled={!selected||saving}>
            {saving?"Verknüpft…":"Verknüpfen"}
          </Btn>
        ) : (
          <Btn variant="primary" onClick={()=>{ onClose(); if(onVerknuepft) onVerknuepft("neu"); }}>Weiter</Btn>
        )}
      </div>
    </ModalOrSheet>
  );
}
