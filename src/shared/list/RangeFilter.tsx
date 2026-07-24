/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/RangeFilter.tsx
   Bereichs-Filter mit Slider und Eingabefeldern
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";

/* Aktueller Wert des Filters. von/bis sind offen, solange der Benutzer
   die Grenze nicht angefasst hat — dann gelten min bzw. max. */
/* Bewusst ein Type-Alias statt eines Interface: nur so ist der Typ einer
   Index-Signatur (Json) zuweisbar, wenn eine Ansicht gespeichert wird. */
export type RangeValue = {
  von?: number | null;
  bis?: number | null;
};

/* Nutzlast, die RangeFilter unter dem Schlüssel "__range" zurückmeldet.
   von/bis sind null, wenn der Filter entfernt wird (Chip-Klick in der
   Toolbar) — useListView löscht den Eintrag dann aus filterVals. */
export interface RangeFilterPayload {
  rangeKey: string;
  von: number | null;
  bis: number | null;
}

interface RangeFilterProps {
  min: number;
  max: number;
  suffix?: string;
  rv: RangeValue;
  rangeKey: string;
  onFilterChange?: (key: string, value: RangeFilterPayload) => void;
  padLeft?: number;
}

export function RangeFilter({min,max,suffix,rv,rangeKey,onFilterChange,padLeft=12}: RangeFilterProps){
  const [localVon,setLocalVon]=useState(String(rv.von??min));
  const [localBis,setLocalBis]=useState(String(rv.bis??max));
  useEffect(()=>{setLocalVon(String(rv.von??min));setLocalBis(String(rv.bis??max));},[rv.von,rv.bis,min,max]);
  const commitVon=()=>{const v=Math.max(min,Math.min(max,Number(localVon)||min));setLocalVon(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:v,bis:rv.bis??max});};
  const commitBis=()=>{const v=Math.max(min,Math.min(max,Number(localBis)||max));setLocalBis(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:rv.von??min,bis:v});};
  const wrapClass=padLeft>12?"cc-range-filter-wrap-lg":"cc-range-filter-wrap";
  return(
    <div className={wrapClass}>
      <div className="cc-row cc-gap-6" style={{marginBottom:6}}>
        <input type="number" min={min} max={max} step={1} className="cc-range-input"
          value={localVon}
          onChange={e=>setLocalVon(e.target.value)}
          onBlur={commitVon}
          onKeyDown={e=>e.key==="Enter"&&commitVon()}/>
        <span className="cc-range-sep">–</span>
        <input type="number" min={min} max={max} step={1} className="cc-range-input"
          value={localBis}
          onChange={e=>setLocalBis(e.target.value)}
          onBlur={commitBis}
          onKeyDown={e=>e.key==="Enter"&&commitBis()}/>
        {suffix&&<span className="cc-range-sep">{suffix}</span>}
      </div>
      <input type="range" min={min} max={max} value={rv.von??min} step={1} className="cc-range-slider" style={{marginBottom:3}}
        onChange={e=>{const v=Number(e.target.value);setLocalVon(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:v,bis:rv.bis??max});}}/>
      <input type="range" min={min} max={max} value={rv.bis??max} step={1} className="cc-range-slider"
        onChange={e=>{const v=Number(e.target.value);setLocalBis(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:rv.von??min,bis:v});}}/>
      <div className="cc-range-labels">
        <span>{min}{suffix||""}</span><span>{max}{suffix||""}</span>
      </div>
    </div>
  );
}
