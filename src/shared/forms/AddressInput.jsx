/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/AddressInput.jsx
   Adress-Autocomplete Hooks via Photon API
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { BL, GR } from "../../constants.js";

const CH_KANTON_MAP={"Aargau":"AG","Appenzell Ausserrhoden":"AR","Appenzell Innerrhoden":"AI","Basel-Landschaft":"BL","Basel-Stadt":"BS","Bern":"BE","Fribourg":"FR","Freiburg":"FR","Genf":"GE","Genève":"GE","Glarus":"GL","Graubünden":"GR","Grisons":"GR","Jura":"JU","Luzern":"LU","Neuenburg":"NE","Neuchâtel":"NE","Nidwalden":"NW","Obwalden":"OW","Schaffhausen":"SH","Schwyz":"SZ","Solothurn":"SO","St. Gallen":"SG","Tessin":"TI","Ticino":"TI","Thurgau":"TG","Uri":"UR","Waadt":"VD","Vaud":"VD","Wallis":"VS","Valais":"VS","Zug":"ZG","Zürich":"ZH"};


export function useAddrSearch(strasse, plz){
  const [suggestions,setSuggestions]=useState([]);
  const timerRef=useRef(null);

  useEffect(()=>{
    const q=(strasse||"").trim();
    if(q.length<3){setSuggestions([]);return;}
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(async()=>{
      try{
        const query=q;
        // DACH Bounding Box: Schweiz, Deutschland, Österreich
        const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=de&limit=15`;
        const res=await fetch(url);
        const json=await res.json();
        const seen=new Set();
        const results=(json.features||[])
          .map(f=>{
            const p=f.properties;
            const strasseVal=p.street?(p.housenumber?`${p.street} ${p.housenumber}`:p.street):"";
            const plzVal=p.postcode||"";
            const ortVal=p.city||p.locality||p.town||p.village||"";
            const stateVal=p.state||"";
            const kantonVal=CH_KANTON_MAP[stateVal]||"";
            if(!strasseVal) return null;
            if(!['ch','de','at','li'].includes((p.countrycode||'').toLowerCase())) return null;
            const key=`${strasseVal}|${plzVal}|${ortVal}`;
            if(seen.has(key)) return null;
            seen.add(key);
            return {strasse:strasseVal,plz:plzVal,ort:ortVal,staat:stateVal,kanton:kantonVal,land:p.countrycode||""};
          })
          .filter(Boolean)
          .slice(0,6);
        setSuggestions(results);
      }catch(e){setSuggestions([]);}
    },300);
    return()=>clearTimeout(timerRef.current);
  },[strasse,plz]);

  return suggestions;
}

export function usePlzLookup(plz, onResult){
  const timerRef=useRef(null);
  useEffect(()=>{
    const q=(plz||"").trim();
    if(q.length<4) return;
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(async()=>{
      try{
        const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=de&limit=3&layer=district&layer=city&bbox=5.9,45.8,17.2,55.1`;
        const res=await fetch(url);
        const json=await res.json();
        const f=json.features?.find(f=>f.properties.postcode===q||f.properties.postcode?.startsWith(q));
        if(!f) return;
        const p=f.properties;
        const ortVal=p.city||p.locality||p.town||p.village||p.name||"";
        const stateVal=p.state||"";
        const kantonVal=CH_KANTON_MAP[stateVal]||"";
        if(ortVal) onResult({ort:ortVal,kanton:kantonVal||null});
      }catch(e){}
    },400);
    return()=>clearTimeout(timerRef.current);
  },[plz]);
}

/* ── RollenAuswahlListe: Shared Rollenauswahl für PersonTeams + KaderModul ── */
