/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Modal.jsx
   ModalOrSheet — Desktop Modal / Mobile Bottom Sheet
   ═══════════════════════════════════════════════════════════════ */
import { useIsMobile } from "./hooks.jsx";

export function ModalOrSheet({open,onClose,children,maxWidth=660}){
  const isMobile=useIsMobile();
  if(!open) return null;
  if(isMobile) return(
    <div className="cc-sheet-overlay">
      <div onClick={onClose} className="cc-sheet-backdrop"/>
      <div className="cc-sheet-box" onClick={e=>e.stopPropagation()}>
        <div className="cc-sheet-handle"><div className="cc-sheet-handle-bar"/></div>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
  return(
    <div onClick={onClose} className="cc-modal-overlay">
      <div onClick={e=>e.stopPropagation()} className="cc-modal-box" style={{maxWidth}}>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
}
