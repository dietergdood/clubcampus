/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Tabs.jsx
   Tab-Navigation Komponente
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.jsx";
import { FONT } from "../../constants.ts";
import { useIsMobile } from "./hooks.jsx";

export function Tabs({tabs,active,setActive,mb=18}){
  const isMobile=useIsMobile();
  return(
    <div style={{display:"flex",gap:2,background:"var(--surface2)",borderRadius:10,padding:4,marginBottom:mb,overflowX:"auto",flexShrink:0}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>!t.soon&&setActive(t.key)} style={{
          padding:isMobile?"6px 10px":"6px 12px",borderRadius:7,
          background:active===t.key?"var(--surface)":"transparent",
          color:active===t.key?"var(--text)":t.soon?"var(--border)":"var(--sub)",
          fontWeight:active===t.key?600:400,
          cursor:t.soon?"default":"pointer",fontSize:14,
          boxShadow:active===t.key?"0 1px 3px rgba(0,0,0,0.12)":"none",
          border:"none",
          whiteSpace:"nowrap",fontFamily:FONT,minHeight:34,transition:"none",
          display:"flex",alignItems:"center",gap:6,WebkitTapHighlightColor:"transparent"
        }}>
          {t.icon&&<TI n={t.icon} size={13} style={{flexShrink:0}}/>}
          {isMobile&&t.short?t.short:t.label}
          {t.soon&&<span style={{fontSize:9,background:"var(--surface2)",color:"var(--sub)",padding:"1px 5px",borderRadius:6}}>bald</span>}
        </button>
      ))}
    </div>
  );
}

