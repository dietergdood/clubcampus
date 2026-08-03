/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/KindSucheModal.tsx
   Modal zum Suchen eines Kindes, das mit einem Elternkontakt
   verknüpft werden soll. Gegenstück zu ElternSucheModal.

   Zur Auswahl stehen nur Mitglieder, deren Mitgliedtyp laut
   Portalverwaltung einen Hauptkontakt verlangt.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { sucheKinder } from "../../domains/members/elternService.ts";
import type { Sb } from "../../types.ts";

type KindTreffer = Awaited<ReturnType<typeof sucheKinder>>[number];

interface KindSucheModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  vereinId: string | null;
  /* Mitgliedtypen mit hauptkontakt_pflicht — kommen vom Aufrufer */
  pflichtTypen: string[];
  /* Bereits verknüpfte Kinder werden ausgeblendet */
  bereitsVerknuepft?: number[];
  onGewaehlt: (mitgliedId: number) => void;
}

export function KindSucheModal({
  open, onClose, sb, vereinId, pflichtTypen,
  bereitsVerknuepft = [], onGewaehlt,
}: KindSucheModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KindTreffer[]>([]);
  const [suchend, setSuchend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    setSuchend(true);
    timerRef.current = setTimeout(async () => {
      if (!sb || !vereinId) { setSuchend(false); return; }
      const data = await sucheKinder(sb, vereinId, query, pflichtTypen);
      setResults(data.filter(k => !bereitsVerknuepft.includes(k.id)));
      setSuchend(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  if (!open) return null;

  return (
    <ModalOrSheet open={true} onClose={onClose} maxWidth={420}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">Kind verknüpfen</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-modal-body">
        <div className="cc-relative">
          <TI n="search" size={14} className="cc-search-icon-abs"/>
          <input className="cc-input cc-search-input" placeholder="Name des Kindes suchen…"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus/>
        </div>

        {pflichtTypen.length === 0 && (
          <div className="cc-text-sm cc-text-sub cc-mt-8">
            Kein Mitgliedtyp verlangt einen Elternkontakt. In der Portalverwaltung
            unter Mitgliedtypen einstellen.
          </div>
        )}

        {results.length > 0 && (
          <div className="cc-col cc-gap-6 cc-mt-8">
            {results.map(k => {
              const name = `${k.vorname || ""} ${k.nachname || ""}`.trim() || "?";
              return (
                <div key={k.id} className="cc-eltern-result" onClick={() => { onGewaehlt(k.id); onClose(); }}>
                  <div className="cc-flex-1 cc-col cc-gap-3">
                    <div className="cc-text-bold cc-text-sm">{name}</div>
                    {k.mitgliedtyp && <div className="cc-text-sm cc-text-sub">{k.mitgliedtyp}</div>}
                  </div>
                  <TI n="plus" size={14}/>
                </div>
              );
            })}
          </div>
        )}

        {!suchend && query.trim() && results.length === 0 && pflichtTypen.length > 0 && (
          <div className="cc-text-sm cc-text-sub cc-mt-8 cc-text-center">
            Keine passenden Mitglieder gefunden.
          </div>
        )}
        {!query.trim() && pflichtTypen.length > 0 && (
          <div className="cc-text-sm cc-text-sub cc-mt-8 cc-text-center">
            Name eingeben…
          </div>
        )}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={onClose}>Abbrechen</Btn>
      </div>
    </ModalOrSheet>
  );
}
