/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/hooks.jsx
   Breakpoint-Hooks
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { BP_MOBILE, BP_TABLET } from "../../constants.ts";

export function useBreakpoint(){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return{isMobile:w<BP_MOBILE,isTablet:w>=BP_MOBILE&&w<BP_TABLET,isDesktop:w>=BP_TABLET,width:w};
}

export function useIsMobile(){return useBreakpoint().isMobile;}
