/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/utils/colorUtils.ts
   Farb-Utilities ohne React-Abhängigkeiten
   ═══════════════════════════════════════════════════════════════ */

export interface ColorPair {
  text: string;
  bg: string;
}

export const SEMANTIC = {
  success: { text:"#15803D", bg:"#DCFCE7" },
  danger:  { text:"#C8102E", bg:"#FEF2F2" },
  warning: { text:"#C2410C", bg:"#FEF3C7" },
  info:    { text:"#1D4ED8", bg:"#DBEAFE" },
  primary: { text:"var(--btn-primary-text,#000)", bg:"var(--btn-primary,#FEC604)" },
  neutral: { text:"var(--text)", bg:"var(--surface2)" },
} satisfies Record<string, ColorPair>;

export type SemanticKey = keyof typeof SEMANTIC;

/* Laufzeit-geprüfter Guard statt Cast: resolveColor bekommt beliebige
   Variantennamen und darf SEMANTIC nur mit echten Schlüsseln indizieren. */
function istSemanticKey(key: string): key is SemanticKey {
  return Object.prototype.hasOwnProperty.call(SEMANTIC, key);
}

export function resolveColor(sem?: string | null, fallbackColor?: string | null): ColorPair {
  if(sem && istSemanticKey(sem)) return SEMANTIC[sem];
  const c = fallbackColor||"var(--text)";
  return {text:c, bg:c+"20"};
}

export function hexToRgba(hex: string | null | undefined, alpha: number): string {
  const h=(hex||"#F8DE09").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function darkenHex(hex: string | null | undefined, pct = 0.12): string {
  const h=(hex||"#FEC604").replace("#","");
  const r=Math.max(0,Math.round(parseInt(h.slice(0,2),16)*(1-pct)));
  const g=Math.max(0,Math.round(parseInt(h.slice(2,4),16)*(1-pct)));
  const b=Math.max(0,Math.round(parseInt(h.slice(4,6),16)*(1-pct)));
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export function contrastColor(hex: string | null | undefined): string {
  const h=(hex||"#000000").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  const luminance=(0.299*r+0.587*g+0.114*b)/255;
  return luminance>0.5?"#000000":"#FFFFFF";
}
