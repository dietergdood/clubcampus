/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/BulkBar.tsx
   Auswahl-Aktionsleiste
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.tsx";

export interface BulkAction {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  /* Button wird deaktiviert, solange nichts ausgewählt ist */
  requiresSelection?: boolean;
}

interface BulkBarProps {
  count?: number;
  total?: number;
  onSelectAll?: (() => void) | null;
  actions?: BulkAction[];
  onCancel?: (() => void) | null;
  show?: boolean;
}

export function BulkBar({
  count=0,
  total=0,
  onSelectAll=null,
  actions=[],
  onCancel=null,
  show=true,
}: BulkBarProps){
  if(!show) return null;
  const allSelected=count>0&&count===total;
  return(
    <div className="cc-sel-bar">
      {onSelectAll&&(
        <div className="cc-col-menu-check cc-col-menu-check-on cc-sel-all" onClick={onSelectAll}>
          <TI n={allSelected?"check":"minus"} size={10}/>
        </div>
      )}
      <span className="cc-sel-bar-info">{count} ausgewählt</span>
      {actions.map((a,i)=>(
        <button key={i}
          className={`cc-ml-btn${a.danger?" cc-ml-btn-danger":""}`}
          onClick={a.onClick}
          disabled={a.requiresSelection&&count===0}>
          {a.icon&&<TI n={a.icon} size={14}/>} {a.label}
        </button>
      ))}
      {onCancel&&(
        <button className="cc-btn-ghost" onClick={onCancel}>
          <TI n="x" size={13}/> Abbrechen
        </button>
      )}
    </div>
  );
}
