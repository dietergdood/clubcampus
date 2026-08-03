/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/ElternTab.tsx
   Elternkontakte-Tab im Mitglied-Detail (n:m via eltern_kinder)

   Logik:
   - Ein Elternteil kann mehrere Kinder haben
   - hauptkontakt ist pro Kind in eltern_kinder gesetzt
   - Entknüpfen des letzten Kindes → Supporter oder Löschen (entkoppleKind)

   Das Bearbeiten-Formular liegt in ElternkontaktModal und wird mit der
   Elternliste geteilt. Hier ohne Kinder-Sektion: man steht bereits beim
   Kind, die anderen Verknüpfungen gehören in die Elternliste.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, DropMenu, EmptyState, useConfirm } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { ElternSucheModal } from "../ElternSucheModal.tsx";
import { ElternkontaktModal } from "../ElternkontaktModal.tsx";
import type { ElternFormular } from "../ElternkontaktModal.tsx";
import {
  entkoppleKind, setHauptkontakt, clearHauptkontaktFuerKind, fetchElternkontakte,
  logAktivitaet, AKTIVITAET_TYP,
} from "../../../domains/members/memberService.ts";
import { vollname } from "../../../domains/person/personUtils.ts";
import type { ElternkontaktMitLink } from "../../../domains/members/elternService.ts";
import type { Account, Mitglied, Sb, SetState } from "../../../types.ts";

export function elternAvColor(beziehung: string | null | undefined){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}

interface ElternTabProps {
  eltern: ElternkontaktMitLink[];
  canEdit?: boolean;
  raw: Mitglied;
  sb: Sb;
  onReload?: (() => void) | null;
  setElternLoaded: SetState<ElternkontaktMitLink[] | null>;
  vereinId?: string | null;
  account?: Account | null;
}

function ElternTab({eltern, canEdit, raw, sb, onReload, setElternLoaded, vereinId=null, account=null}: ElternTabProps){
  const [confirm, confirmDialog] = useConfirm();
  const [editEltern, setEditEltern] = useState<ElternFormular | null>(null);
  const [showSuche, setShowSuche] = useState(false);
  const geaendertVon = account?.name||account?.email||"Administrator";

  async function reload(){
    if(!sb) return;
    const data = await fetchElternkontakte(sb, raw.id);
    setElternLoaded(data);
    if(onReload) onReload();
  }

  async function handleEntknuepfen(e: ElternkontaktMitLink){
    if(!sb||!e.id) return;
    const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
    const ok = await confirm({
      title:`${name} entknüpfen?`,
      message:"Dieses Kind wird vom Elternkontakt getrennt.",
      danger:true,
      confirmLabel:"Entknüpfen"
    });
    if(!ok) return;

    await entkoppleKind(sb, e.id, raw.id, e.benutzer_id);
    if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_ENTFERNT,`Elternkontakt entknüpft: ${name}`,"elternkontakte",name,geaendertVon);
    reload();
  }

  async function handleHauptkontakt(e: ElternkontaktMitLink){
    if(!sb||!e.id) return;
    const name = vollname(e);
    if(!e.hauptkontakt){
      await setHauptkontakt(sb, raw.id, e.id, vereinId);
      if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt gesetzt: ${name}`,"elternkontakte",name,geaendertVon);
    } else {
      await clearHauptkontaktFuerKind(sb, e.id, raw.id);
      if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt entfernt: ${name}`,"elternkontakte",name,geaendertVon);
    }
    reload();
  }

  return(
    <div className="cc-col cc-gap-8">
      {canEdit&&(
        <div className="cc-between">
          <div className="cc-text-sm">{eltern.length} Elternkontakt{eltern.length!==1?"e":""}</div>
          <Btn small onClick={()=>setShowSuche(true)}>
            <TI n="plus"/> Hinzufügen
          </Btn>
        </div>
      )}
      <ElternSucheModal
        open={showSuche}
        onClose={()=>setShowSuche(false)}
        raw={raw} sb={sb} vereinId={vereinId}
        geaendertVon={geaendertVon}
        onVerknuepft={()=>{
          setShowSuche(false);
          reload();
        }}
      />
      {eltern.length===0&&<EmptyState icon="heart" title="Keine Elternkontakte" subtitle="Noch kein Elternkontakt für dieses Mitglied erfasst."/>}
      {eltern.map((e,i)=>{
        const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
        /* elternkontakte hat historisch beide Spalten: telefon und tel */
        const tel = e.telefon||e.tel;
        const ac = elternAvColor(e.beziehung);
        return(
          <Card key={e.id||i}>
            <div className="cc-row cc-gap-12 cc-items-center">
              <div className="cc-eltern-av" style={{background:ac.bg,color:ac.text}}>
                {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div className="cc-flex-1 cc-col cc-gap-5">
                <div className="cc-text-bold cc-text-lg">{name}</div>
                <div className="cc-row cc-gap-8 cc-flex-wrap">
                  {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                  {e.benutzer_id
                    ?<span className="cc-status-active">Portal: Aktiv</span>
                    :<span className="cc-status-inactive">Portal: Inaktiv</span>
                  }
                  {e.hauptkontakt&&<span className="cc-status-hauptkontakt">★ Hauptkontakt</span>}
                </div>
                {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                {tel&&<a href={`tel:${tel}`} className="cc-contact-link-plain"><TI n="phone" size={12}/>{tel}</a>}
              </div>
              {canEdit&&(
                <DropMenu items={[
                  {label:"Bearbeiten", icon:"edit", onClick:()=>setEditEltern({...e})},
                  {label:e.hauptkontakt?"Hauptkontakt entfernen":"Als Hauptkontakt setzen", icon:"star", onClick:()=>handleHauptkontakt(e)},
                  "sep",
                  {label:"Entknüpfen", icon:"unlink", danger:true, onClick:()=>handleEntknuepfen(e)},
                ]}/>
              )}
            </div>
          </Card>
        );
      })}

      {editEltern&&(
        <ElternkontaktModal
          mode="edit"
          data={editEltern}
          mitgliedId={raw.id}
          sb={sb}
          vereinId={vereinId}
          geaendertVon={geaendertVon}
          onClose={()=>setEditEltern(null)}
          onSaved={reload}
        />
      )}
      {confirmDialog}
    </div>
  );
}

export { ElternTab };
