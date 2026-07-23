/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternTab.jsx
   Elternkontakte-Tab im Mitglied-Detail
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, ModalOrSheet, DropMenu, EmptyState, useConfirm } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { insertElternkontakt, updateElternkontakt, deleteElternkontakt, setHauptkontakt, unlinkElternBenutzer, fetchElternkontakte, logAenderung, logAktivitaet, AKTIVITAET_TYP } from "../../../domains/members/memberService.js";

function elternAvColor(beziehung){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}
function ElternPortalSection({e,sb,onReload}){
  const [loading,setLoading]=useState(false);
  async function unlink(){
    if(!sb) return;
    setLoading(true);
    await unlinkElternBenutzer(sb,e.id);
    setLoading(false);
    if(onReload) onReload();
  }
  return(
    <div className="cc-eltern-portal-row">
      <div>
        <div className="cc-text-bold cc-text-sm">Portal-Zugang</div>
        <div className={e.benutzer_id?"cc-status-active":"cc-status-inactive"}>
          {e.benutzer_id?"Aktiv":"Kein Zugang"}
        </div>
      </div>
      <div className="cc-col cc-gap-6 cc-items-end">
        {e.benutzer_id
          ?<button className="cc-btn-danger" onClick={unlink} disabled={loading}>
            {loading?"…":"Zugang deaktivieren"}
          </button>
          :e.email
            ?<span className="cc-warn-box">Registrierung mit <strong>{e.email}</strong></span>
            :<span className="cc-warn-box">Keine E-Mail hinterlegt</span>
        }
      </div>
    </div>
  );
}

/* Avatar-Farbe nach Beziehung */
function ElternTab({eltern,canEdit,raw,sb,onReload,setElternLoaded,vereinId=null,account=null}){
  const [confirm, confirmDialog] = useConfirm();
  const [editEltern,setEditEltern]=useState(null);
  const [elternMsg,setElternMsg]=useState(null);
  const [elternSaving,setElternSaving]=useState(false);
  const geaendertVon = account?.name||account?.email||"Administrator";

  async function saveEltern(){
    if(!sb) return;
    setElternSaving(true); setElternMsg(null);
    try{
      const d=editEltern.data;
      if(editEltern.mode==="new"){
        const error=await insertElternkontakt(sb,{
          mitglied_id:raw.id,
          verein_id:vereinId,
          vorname:d.vorname||null, nachname:d.nachname||null,
          name:d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||null,
          email:d.email||null, telefon:d.telefon||null,
          beziehung:d.beziehung||null,
        });
        if(error) throw error;
        const name=d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||"?";
        if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT,`Elternkontakt hinzugefügt: ${name}`,"elternkontakte",name,geaendertVon);
      } else {
        const alter=eltern.find(e=>e.id===d.id);
        const alterName=alter?`${alter.vorname||""} ${alter.nachname||""}`.trim():null;
        const error=await updateElternkontakt(sb,d.id,{
          vorname:d.vorname||null, nachname:d.nachname||null,
          name:d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||null,
          email:d.email||null, telefon:d.telefon||null,
          beziehung:d.beziehung||null,
        });
        if(error) throw error;
        const neuerName=d.vorname&&d.nachname?`${d.vorname} ${d.nachname}`:d.name||"?";
        if(vereinId) {
          if(alterName&&neuerName&&alterName!==neuerName)
            logAenderung(sb,raw.id,vereinId,"elternkontakte",alterName,neuerName,geaendertVon);
          else if(alterName!==neuerName)
            logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Elternkontakt bearbeitet: ${neuerName}`,"elternkontakte",neuerName,geaendertVon);
        }
      }
      setElternMsg({ok:true,text:"Gespeichert ✓"});
      fetchElternkontakte(sb,raw.id).then(data=>setElternLoaded(data));
      setTimeout(()=>{setEditEltern(null);setElternMsg(null);if(onReload)onReload();},800);
    }catch(e){setElternMsg({ok:false,text:e.message});}
    setElternSaving(false);
  }

  async function deleteEltern(id){
    const ok=await confirm({title:"Elternkontakt löschen?",danger:true,confirmLabel:"Löschen"});if(!sb||!ok) return;
    const elternItem=eltern.find(e=>e.id===id);
    const name=elternItem?`${elternItem.vorname||""} ${elternItem.nachname||""}`.trim():null;
    await deleteElternkontakt(sb,id);
    if(vereinId&&name) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_ENTFERNT,`Elternkontakt entfernt: ${name}`,"elternkontakte",name,geaendertVon);
    setElternLoaded(null);
    if(onReload) onReload();
  }

  return(
    <div className="cc-col cc-gap-8">
      {canEdit&&!editEltern&&(
        <div className="cc-between">
          <div className="cc-text-sm">{eltern.length} Elternkontakt{eltern.length!==1?"e":""}</div>
          <Btn small onClick={()=>setEditEltern({mode:"new",data:{mitglied_id:raw.id}})}>
            <TI n="plus"/> Hinzufügen
          </Btn>
        </div>
      )}
      {eltern.length===0&&<EmptyState icon="heart" title="Keine Elternkontakte" subtitle="Noch kein Elternkontakt für dieses Mitglied erfasst."/>}
      {eltern.map((e,i)=>{
        const name=e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
        const tel=e.telefon||e.tel;
        const ac=elternAvColor(e.beziehung);
        return(
          <Card key={i}>
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
                {tel&&<a href={`tel:${tel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{tel}</a>}
              </div>
              {canEdit&&(
                <DropMenu items={[
                  {label:"Bearbeiten", icon:"edit", onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
                  {label:e.hauptkontakt?"Hauptkontakt entfernen":"Als Hauptkontakt setzen", icon:"user", onClick:async()=>{
                    if(!sb) return;
                    if(!e.hauptkontakt){
                      await setHauptkontakt(sb,raw.id,e.id);
                    } else {
                      await updateElternkontakt(sb,e.id,{hauptkontakt:false});
                    }
                    fetchElternkontakte(sb,raw.id).then(data=>setElternLoaded(data));
                    if(onReload) onReload();
                  }},
                  "sep",
                  {label:"Löschen", icon:"trash", danger:true, onClick:()=>deleteEltern(e.id)},
                ]}/>
              )}
            </div>
          </Card>
        );
      })}
      {editEltern&&(
        <ModalOrSheet open={true} onClose={()=>{setEditEltern(null);setElternMsg(null);}} maxWidth={480}>
          <div className="cc-modal-hdr">
            <div className="cc-modal-title">{editEltern.mode==="new"?"Neuer Elternkontakt":"Elternkontakt bearbeiten"}</div>
            <Btn variant="ghost" small onClick={()=>setEditEltern(null)}><TI n="x" size={14}/></Btn>
          </div>
          <div className="cc-modal-body">
            <div className="cc-form-row">
              <div className="cc-form-section-title" data-label="Personalien"/>
              {[
                {k:"vorname",   l:"Vorname"},
                {k:"nachname",  l:"Nachname"},
                {k:"beziehung", l:"Beziehung", opts:["Mutter","Vater","Elternteil","Grossmutter","Grossvater","Vormund"]},
                {k:"email",     l:"E-Mail",    type:"email"},
                {k:"telefon",   l:"Telefon",   type:"tel"},
              ].map(({k,l,type="text",opts})=>(
                <div key={k} className={k==="email"||k==="telefon"?"cc-form-full":""}>
                  <label className="cc-label">{l}</label>
                  {opts
                    ?<select className="cc-input" value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))}>\n                      <option value="">– wählen –</option>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    :<input className="cc-input" type={type} value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))} placeholder={l}/>
                  }
                </div>
              ))}
            </div>
            {editEltern.mode==="edit"&&<ElternPortalSection e={editEltern.data} sb={sb} onReload={onReload}/>}
            {elternMsg&&<div className={`cc-badge ${elternMsg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{elternMsg.text}</div>}
          </div>
          <div className="cc-modal-ftr">
            <Btn onClick={()=>setEditEltern(null)}>Abbrechen</Btn>
            <Btn variant="primary" onClick={saveEltern} disabled={elternSaving}>
              {elternSaving?"Speichert…":"Speichern"}
            </Btn>
          </div>
        </ModalOrSheet>
      )}
      {confirmDialog}
    </div>
  );
}



export { ElternTab, ElternPortalSection, elternAvColor };
