/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/utils/colorUtils.js
   Farb-Utilities ohne React-Abhängigkeiten
   ═══════════════════════════════════════════════════════════════ */

export const SEMANTIC = {
  success: { text:"#15803D", bg:"#DCFCE7" },
  danger:  { text:"#C8102E", bg:"#FEF2F2" },
  warning: { text:"#C2410C", bg:"#FEF3C7" },
  info:    { text:"#1D4ED8", bg:"#DBEAFE" },
  primary: { text:"var(--btn-primary-text,#000)", bg:"var(--btn-primary,#FEC604)" },
  neutral: { text:"var(--text)", bg:"var(--surface2)" },
};

export function resolveColor(sem, fallbackColor){
  if(sem && SEMANTIC[sem]) return SEMANTIC[sem];
  const c = fallbackColor||"var(--text)";
  return {text:c, bg:c+"20"};
}

export function hexToRgba(hex,alpha){
  const h=(hex||"#F8DE09").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function darkenHex(hex,pct=0.12){
  const h=(hex||"#FEC604").replace("#","");
  const r=Math.max(0,Math.round(parseInt(h.slice(0,2),16)*(1-pct)));
  const g=Math.max(0,Math.round(parseInt(h.slice(2,4),16)*(1-pct)));
  const b=Math.max(0,Math.round(parseInt(h.slice(4,6),16)*(1-pct)));
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export function contrastColor(hex){
  const h=(hex||"#000000").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  const luminance=(0.299*r+0.587*g+0.114*b)/255;
  return luminance>0.5?"#000000":"#FFFFFF";
}
