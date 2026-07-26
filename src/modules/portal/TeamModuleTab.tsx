/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/TeamModuleTab.tsx
   Hülle um TeamModuleMatrix — hält nur die Sichtbarkeitsbedingung
   ═══════════════════════════════════════════════════════════════ */
import { TeamModuleMatrix } from "./TeamModuleMatrix.tsx";
import type { Sb } from "../../types.ts";

interface TeamModuleTabProps {
  supabase: Sb;
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  setSaveMsg: (msg: string) => void;
  tab: string;
  vereinId: string | null;
}

export function TeamModuleTab({supabase,loading,isMobile,mobileKachel,setSaveMsg,tab,vereinId}: TeamModuleTabProps) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="teammodule"&&(
        <TeamModuleMatrix supabase={supabase} setSaveMsg={setSaveMsg} vereinId={vereinId}/>
      )}

      {/* ── TAB: BENUTZER & ROLLEN ── */}
    </div>
  );
}
