/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Stat.tsx
   Statistik-Kachel Komponente
   ═══════════════════════════════════════════════════════════════ */
import type { MouseEventHandler, ReactNode } from "react";
import { TI } from "../../icons.tsx";
import { resolveColor } from "../utils/colorUtils.ts";
import type { SemanticKey } from "../utils/colorUtils.ts";

interface StatProps {
  label?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  color?: string;
  /* Schlägt in SEMANTIC nach — nicht zu verwechseln mit dem semantic von
     StatusTile, das einen CSS-Klassennamen bildet. */
  semantic?: SemanticKey;
  /* Teil der Prop-Schnittstelle, wird im Rumpf nicht ausgewertet:
     die Kachel rendert bei onClick ein festes chart-pie-Icon. */
  icon?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Stat({label,value,sub,color,semantic,onClick}: StatProps){
  const c=semantic?resolveColor(semantic):{text:color||"var(--text)",bg:(color||"var(--sub)")+"20"};
  return(
    <div
      onClick={onClick}
      style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4,cursor:onClick?"pointer":"default",userSelect:"none"}}
    >
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <span style={{fontSize:22,fontWeight:700,color:c.text,letterSpacing:-0.5,lineHeight:1}}>{value}</span>
        {onClick&&<TI n="chart-pie" size={13} style={{color:"var(--sub)",marginTop:4}}/>}
      </div>
      <span style={{fontSize:11,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      {sub&&<span style={{fontSize:12,color:"var(--sub)"}}>{sub}</span>}
    </div>
  );
}
