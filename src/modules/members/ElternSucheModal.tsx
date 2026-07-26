/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternSucheModal.tsx
   Modal zum Suchen + Verknüpfen bestehender Elternkontakte
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { sucheElternkontakte, linkKind, logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.ts";
import { vollname } from "../../domains/person/personUtils.ts";
import { elternAvColor } from "./tabs/ElternTab.tsx";
import type { Sb } from "../../types.ts";

type ElternTreffer = Awaited<ReturnType<typeof sucheElternkontakte>>[number];

interface ElternSucheModalProps {
  open: boolean;
  onClose: () => void;
  raw: { id: number };
  sb: Sb;
  vereinId: string | null;
  geaendertVon: string;
  onVerknuepft: (mode?: "neu") => void;
}

export function ElternSucheModal({ open, onClose, raw, sb, vereinId, geaendertVon, onVerknuepft }: ElternSucheModalProps) {
  const [tab, setTab] = useState<"suche"|"neu">("suche");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ElternTreffer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!sb || !vereinId) return;
      const data = await sucheElternkontakte(sb, vereinId, query);
      setResults(data);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  function toggleSelected(e: ElternTreffer) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(e.id) ? next.delete(e.id) : next.add(e.id);
      return next;
    });
  }

  async function verknuepfen() {
    if (!selected.size || !sb || !vereinId) return;
    setSaving(true);
    const treffer = results.filter(e => selected.has(e.id));
    for (const e of treffer) {
      await linkKind(sb, e.id, raw.id, vereinId, false);
      const name = vollname(e);
      logAktivitaet(sb, raw.id, vereinId, AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT, `Elternkontakt hinzugefügt: ${name}`, "elternkontakte", name, geaendertVon);
    }
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
            <TI n="search" size={14} className="cc-search-icon-abs"/>
            <input className="cc-input cc-search-input" placeholder="Name oder E-Mail suchen…"
              value={query} onChange={e=>{setQuery(e.target.value);setSelected(new Set());}} autoFocus/>
          </div>

          {results.length > 0 && (
            <div className="cc-col cc-gap-6 cc-mt-8">
              {results.map(e => {
                const name = vollname(e);
                const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                const ac = elternAvColor(e.beziehung);
                const kinder = e.eltern_kinder||[];
                const isSel = selected.has(e.id);
                return (
                  <div key={e.id}
                    className={`cc-eltern-result${isSel?" cc-eltern-result-active":""}`}
                    onClick={()=>toggleSelected(e)}>
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
                    {isSel&&<TI n="check" size={16} className="cc-check-icon"/>}
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
          <Btn variant="primary" onClick={verknuepfen} disabled={!selected.size||saving}>
            {saving?"Verknüpft…":selected.size>1?`${selected.size} verknüpfen`:"Verknüpfen"}
          </Btn>
        ) : (
          <Btn variant="primary" onClick={()=>{ onClose(); if(onVerknuepft) onVerknuepft("neu"); }}>Weiter</Btn>
        )}
      </div>
    </ModalOrSheet>
  );
}
