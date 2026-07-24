/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/hooks.ts
   Breakpoint-Hooks (enthält kein JSX, daher .ts)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { BP_MOBILE, BP_TABLET } from "../../constants.ts";

export interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export function useBreakpoint(): BreakpointState {
  const [w,setW]=useState<number>(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return{isMobile:w<BP_MOBILE,isTablet:w>=BP_MOBILE&&w<BP_TABLET,isDesktop:w>=BP_TABLET,width:w};
}

export function useIsMobile(): boolean {return useBreakpoint().isMobile;}
