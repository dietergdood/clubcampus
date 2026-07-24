/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/RangeFilter.jsx
   Bereichs-Filter mit Slider und Eingabefeldern
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";

export function RangeFilter({min,max,suffix,rv,rangeKey,onFilterChange,padLeft=12}){
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
