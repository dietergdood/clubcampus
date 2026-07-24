/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Stat.jsx
   Statistik-Kachel Komponente
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.jsx";
import { resolveColor } from "../utils/colorUtils.js";

export function Stat({label,value,sub,color,semantic,icon,onClick}){
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
