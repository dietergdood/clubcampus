/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Av.jsx
   Avatar-Komponente mit Name-Hash-Farben
   ═══════════════════════════════════════════════════════════════ */
import { TI, TI_PATHS } from "../../icons.jsx";

const AV_PALETTES=[
  {bg:"#E6F1FB",text:"#0C447C"},{bg:"#EEEDFE",text:"#3C3489"},
  {bg:"#E1F5EE",text:"#085041"},{bg:"#FAEEDA",text:"#633806"},
  {bg:"#EAF3DE",text:"#27500A"},{bg:"#FCEBEB",text:"#791F1F"},
  {bg:"#FEF3C7",text:"#92400E"},{bg:"#F0F4FF",text:"#3730A3"},
];
export function avColor(name){
  const i=Math.abs((name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%AV_PALETTES.length;
  return AV_PALETTES[i];
}


export function Av({name,init,size="md",bg,useTheme=false}){
  name=name||"";
  const px = typeof size==="number" ? size : {sm:24,md:32,lg:40}[size]||32;
  const r = Math.round(px/4);
  const palette = bg ? {bg, text:bg.includes("cc-hover")||bg.includes("cc-accent")||bg.includes("rgba(255")||bg==="#FEC604"?"var(--cc-avatar-text,#7A6000)":"#fff"} : avColor(name);
  const isIcon = init && TI_PATHS[init];
  const l = isIcon ? null : (init||(name||"?").split(" ").filter(Boolean).map(n=>n[0]||"").join("").slice(0,2).toUpperCase()||"?");
  const fs = px<=24?9:px<=32?11:13;
  return(
    <div style={{width:px,height:px,borderRadius:r,background:palette.bg,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:palette.text,fontWeight:600,fontSize:fs,flexShrink:0,userSelect:"none"}}>
      {isIcon ? <TI n={init} size={px*0.5} style={{color:palette.text}}/> : l}
    </div>
  );
}
