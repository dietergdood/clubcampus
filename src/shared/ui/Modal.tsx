/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Modal.tsx
   ModalOrSheet — Desktop Modal / Mobile Bottom Sheet

   KLICK NEBEN DAS MODAL schliesst nur, solange nichts eingegeben
   wurde. Sobald im Modal getippt oder ausgewählt wurde, wird der
   Klick auf den Hintergrund ignoriert — zugemacht wird dann bewusst
   über ✕ oder Abbrechen. Vorher ging ein halb ausgefülltes Formular
   bei einem Fehlklick vollständig verloren.

   Erkannt wird das ohne Zutun der Modale: `input`- und `change`-
   Ereignisse blubbern bis zum Container. Ein reines Anzeige-Modal
   löst nie eines aus und schliesst deshalb weiterhin beim Klick
   daneben. Es gibt also nichts, was man bei einem neuen Modal
   vergessen könnte — anders als bei einem Prop, das jedes Modal
   selbst setzen müsste.

   ESCAPE folgt derselben Regel: es schliesst, solange nichts
   eingegeben wurde. So bleibt der schnelle Weg hinaus erhalten,
   ohne dass ein halb ausgefülltes Formular verloren geht.

   Bei mehreren offenen Modalen reagiert nur das oberste. Dafür führt
   das Modul einen Stapel: jedes offene Modal trägt sich beim Öffnen
   ein und beim Schliessen wieder aus, und Escape wirkt nur auf den
   letzten Eintrag. Ohne das würden bei einem Modal im Modal beide
   zugehen und die darunterliegende Eingabe wäre weg.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMobile } from "./hooks.ts";

/* Stapel der offenen Modale — nur das oberste reagiert auf Escape. */
const offeneModale: symbol[] = [];

interface ModalOrSheetProps {
  open: boolean;
  onClose?: () => void;
  children?: ReactNode;
  maxWidth?: number;
  /** Nur für Anzeige-Modale, die trotz Eingaben beim Klick daneben
      schliessen dürfen. Im Normalfall nicht setzen. */
  immerSchliessbar?: boolean;
}

export function ModalOrSheet({open,onClose,children,maxWidth=660,immerSchliessbar=false}: ModalOrSheetProps){
  const isMobile=useIsMobile();
  const [bearbeitet,setBearbeitet]=useState(false);
  const idRef=useRef<symbol>(undefined);
  if(!idRef.current) idRef.current=Symbol("modal");

  /* Beim Öffnen zurücksetzen — dieselbe Modal-Instanz wird für den
     nächsten Datensatz wiederverwendet. */
  useEffect(()=>{ if(open) setBearbeitet(false); },[open]);

  useEffect(()=>{
    if(!open) return;
    const id=idRef.current!;
    offeneModale.push(id);
    const onKey=(e: KeyboardEvent)=>{
      if(e.key!=="Escape") return;
      /* Nur das oberste Modal reagiert. */
      if(offeneModale[offeneModale.length-1]!==id) return;
      if(bearbeitet&&!immerSchliessbar) return;
      onClose?.();
    };
    window.addEventListener("keydown",onKey);
    return ()=>{
      window.removeEventListener("keydown",onKey);
      const i=offeneModale.lastIndexOf(id);
      if(i>=0) offeneModale.splice(i,1);
    };
  },[open,bearbeitet,immerSchliessbar,onClose]);

  if(!open) return null;

  const merkeEingabe=()=>setBearbeitet(true);
  const backdropClick=()=>{ if(!bearbeitet||immerSchliessbar) onClose?.(); };

  if(isMobile) return(
    <div className="cc-sheet-overlay">
      <div onClick={backdropClick} className="cc-sheet-backdrop"/>
      <div className="cc-sheet-box" onClick={e=>e.stopPropagation()}
        onInput={merkeEingabe} onChange={merkeEingabe}>
        <div className="cc-sheet-handle"><div className="cc-sheet-handle-bar"/></div>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
  return(
    <div onClick={backdropClick} className="cc-modal-overlay">
      <div onClick={e=>e.stopPropagation()} className="cc-modal-box" style={{maxWidth}}
        onInput={merkeEingabe} onChange={merkeEingabe}>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
}
