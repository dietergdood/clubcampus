/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Av.tsx
   Avatar-Komponente mit Name-Hash-Farben
   ═══════════════════════════════════════════════════════════════ */
import { TI, TI_PATHS } from "../../icons.tsx";

export interface AvPalette {
  bg: string;
  text: string;
}

const AV_PALETTES: AvPalette[]=[
  {bg:"#E6F1FB",text:"#0C447C"},{bg:"#EEEDFE",text:"#3C3489"},
  {bg:"#E1F5EE",text:"#085041"},{bg:"#FAEEDA",text:"#633806"},
  {bg:"#EAF3DE",text:"#27500A"},{bg:"#FCEBEB",text:"#791F1F"},
  {bg:"#FEF3C7",text:"#92400E"},{bg:"#F0F4FF",text:"#3730A3"},
];
export function avColor(name?: string | null): AvPalette {
  const i=Math.abs((name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%AV_PALETTES.length;
  return AV_PALETTES[i];
}

const AV_SIZES = {sm:24,md:32,lg:40};

interface AvProps {
  name?: string | null;
  init?: string | null;
  size?: number | keyof typeof AV_SIZES;
  bg?: string;
  /* Wird im Rumpf nicht ausgewertet, bleibt aber Teil der Prop-Schnittstelle:
     mehrere Aufrufer setzen useTheme. */
  useTheme?: boolean;
}

export function Av({name,init,size="md",bg}: AvProps){
  name=name||"";
  const px = typeof size==="number" ? size : AV_SIZES[size]||32;
  const r = Math.round(px/4);
  const palette = bg ? {bg, text:bg.includes("cc-hover")||bg.includes("cc-accent")||bg.includes("rgba(255")||bg==="#FEC604"?"var(--cc-avatar-text,#7A6000)":"#fff"} : avColor(name);
  /* init kann ein Icon-Name oder ein Kürzel sein. hasOwnProperty statt Index-
     Zugriff, damit der Lookup ohne Cast mit beliebigen Strings funktioniert. */
  const iconName = init && Object.prototype.hasOwnProperty.call(TI_PATHS, init) ? init : null;
  const l = iconName ? null : (init||(name||"?").split(" ").filter(Boolean).map(n=>n[0]||"").join("").slice(0,2).toUpperCase()||"?");
  const fs = px<=24?9:px<=32?11:13;
  return(
    <div style={{width:px,height:px,borderRadius:r,background:palette.bg,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:palette.text,fontWeight:600,fontSize:fs,flexShrink:0,userSelect:"none"}}>
      {iconName ? <TI n={iconName} size={px*0.5} style={{color:palette.text}}/> : l}
    </div>
  );
}
