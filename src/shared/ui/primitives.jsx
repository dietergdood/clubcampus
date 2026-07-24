/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/primitives.jsx
   Kleine UI-Primitive ohne gegenseitige Abhängigkeiten
   ═══════════════════════════════════════════════════════════════ */
import { FONT } from "../../constants.ts";
import { TI } from "../../icons.jsx";

export function Card({children,mb=0,mt=0,style={},onClick,flush=false,className=""}){
  return <div onClick={onClick} className={`cc-card${flush?" cc-card-flush":""}${className?" "+className:""}`} style={{borderRadius:12,padding:flush?0:"16px 20px",overflow:"visible",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:mb,marginTop:mt,...style}}>{children}</div>;
}

export function Chip({text,color,bg,semantic,size="sm"}){
  const c=semantic?resolveColor(semantic):null;
  const clr=c?c.text:(color||"var(--sub)");
  const bgc=bg||(c?c.bg:clr+"15");
  const fs=size==="sm"?11:size==="md"?12:13;
  return <span style={{background:bgc,color:clr,fontSize:fs,fontWeight:500,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.2,border:`0.5px solid ${clr}30`}}>{text}</span>;
}

export function StatusTile({label,value,icon,semantic="neutral",action=null}){
  return(
    <div className="cc-status-tile">
      <div className={`cc-status-tile-icon cc-status-tile-icon-${semantic}`}>
        {icon&&<TI n={icon} size={16}/>}
      </div>
      <div className="cc-status-tile-body">
        <span className="cc-status-tile-label">{label}</span>
        <span className={semantic==="neutral"?"cc-status-tile-value":`cc-status-tile-value-${semantic}`}>{value}</span>
        {action&&<button className="cc-status-tile-action" onClick={action.onClick}>{action.label} →</button>}
      </div>
    </div>
  );
}

export function STitle({children,action,mb=14}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mb}}>
      <h2 style={{margin:0,fontSize:16,fontWeight:700,letterSpacing:-0.2,color:"var(--text)"}}>{children}</h2>
      {action}
    </div>
  );
}

export function Row({children, gap=8, wrap=false, justify="flex-start", align="center", style={}, ...props}){
  return <div style={{display:"flex",flexDirection:"row",gap,flexWrap:wrap?"wrap":"nowrap",justifyContent:justify,alignItems:align,...style}} {...props}>{children}</div>;
}

export function Col({children, gap=8, style={}, ...props}){
  return <div style={{display:"flex",flexDirection:"column",gap,...style}} {...props}>{children}</div>;
}

export function Between({children, gap=8, style={}, ...props}){
  return <div style={{display:"flex",flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap,...style}} {...props}>{children}</div>;
}

export function Sub({children, style={}, mb=0}){
  return <div style={{fontSize:13,color:"var(--sub)",marginBottom:mb,...style}}>{children}</div>;
}

export function Label({children, style={}}){
  return <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5,...style}}>{children}</div>;
}

export function H1({children, style={}, mb=0}){
  return <h1 style={{margin:0,marginBottom:mb,fontSize:22,fontWeight:700,letterSpacing:-0.5,color:"var(--text)",...style}}>{children}</h1>;
}

export function H2({children, style={}}){
  return <h2 style={{margin:0,fontSize:17,fontWeight:600,color:"var(--text)",...style}}>{children}</h2>;
}

export function PageHeader({children, action=null, mb=18}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mb}}>
      <H1>{children}</H1>
      {action}
    </div>
  );
}

export function Input({style={}, ...props}){
  return <input className="cc-input" style={style} {...props}/>;
}

export function Select({children, style={}, ...props}){
  return <select className="cc-input" style={style} {...props}>{children}</select>;
}

export function Textarea({style={}, ...props}){
  return <textarea className="cc-input" style={{resize:"vertical",...style}} {...props}/>;
}

export function SectionLabel({children, style={}}){
  return <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.7,marginBottom:6,...style}}>{children}</div>;
}

export function Empty({icon="inbox", text="Keine Einträge", sub=null, style={}}){
  return(
    <div style={{textAlign:"center",padding:"32px 16px",color:"var(--sub)",...style}}>
      <TI n={icon} size={32} style={{color:"var(--border)",marginBottom:8}}/>
      <div style={{fontSize:14,fontWeight:500,color:"var(--sub)"}}>{text}</div>
      {sub&&<div style={{fontSize:12,marginTop:4,color:"var(--border)"}}>{sub}</div>}
    </div>
  );
}

export function ModalTitle({children, style={}}){
  return <h3 style={{margin:0,fontSize:16,fontWeight:600,color:"var(--text)",...style}}>{children}</h3>;
}

export function Truncate({children, lines=1, style={}}){
  return <div style={{overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:lines,WebkitBoxOrient:"vertical",...style}}>{children}</div>;
}

export function EmptyState({icon, title, subtitle, action, onAction, danger=false}){
  return(
    <div className="cc-empty-state">
      {icon&&<div className={`cc-empty-state-icon${danger?" cc-empty-state-icon-danger":""}`}><TI n={icon} size={22}/></div>}
      <div className="cc-empty-state-title">{title}</div>
      {subtitle&&<div className="cc-empty-state-sub">{subtitle}</div>}
      {action&&onAction&&<button className="cc-empty-state-btn" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function InfoBox({text,color="#1d6fa4"}){
  return(
    <div style={{background:color+"15",border:`1px solid ${color}30`,borderRadius:8,padding:"8px 12px",fontSize:13,color,marginBottom:8}}>
      {text}
    </div>
  );
}
