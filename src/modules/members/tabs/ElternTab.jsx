/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternTab.jsx
   Elternkontakte-Tab im Mitglied-Detail (n:m via eltern_kinder)

   Logik:
   - Ein Elternteil kann mehrere Kinder haben
   - hauptkontakt ist pro Kind in eltern_kinder gesetzt
   - Entknüpfen des letzten Kindes → deleteElternkontakt
   - E-Mail Pflichtfeld
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, ModalOrSheet, DropMenu, EmptyState, useConfirm, PhoneInput } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { useState, useEffect, useRef } from "react";
import { ElternSucheModal } from "../ElternSucheModal.jsx";
import {
  insertElternkontakt, updateElternkontakt, deleteElternkontakt,
  unlinkKind, linkKind, setHauptkontakt, unlinkElternBenutzer,
  fetchElternkontakte, fetchKinderFuerElternteil, sucheElternkontakte,
  updateBenutzerRolle, clearHauptkontaktFuerKind,
  logAenderung, logAktivitaet, AKTIVITAET_TYP
} from "../../../domains/members/memberService.js";

export function elternAvColor(beziehung){
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

function KinderListe({elternId, sb}){
  const [kinder, setKinder] = useState(null);
  const [open, setOpen] = useState(false);

  async function load(){
    if(!sb) return;
    const data = await fetchKinderFuerElternteil(sb, elternId);
    setKinder(data);
    setOpen(true);
  }

  if(!open) return(
    <button className="cc-text-sm cc-text-sub cc-link-btn" onClick={load}>
      Weitere Kinder anzeigen
    </button>
  );

  return(
    <div className="cc-col cc-gap-4 cc-mt-4">
      <div className="cc-text-sm cc-text-sub">Verknüpfte Kinder:</div>
      {(kinder||[]).map(k=>(
        <div key={k.mitglied_id} className="cc-text-sm">
          <TI n="user" size={11}/> {k.mitglieder?.vorname} {k.mitglieder?.nachname}
          {k.hauptkontakt&&<span className="cc-status-hauptkontakt cc-ml-6">★ HK</span>}
        </div>
      ))}
    </div>
  );
}

function ElternTab({eltern, canEdit, raw, sb, onReload, setElternLoaded, vereinId=null, account=null}){
  const [confirm, confirmDialog] = useConfirm();
  const [editEltern, setEditEltern] = useState(null);
  const [elternMsg, setElternMsg] = useState(null);
  const [elternSaving, setElternSaving] = useState(false);
  const [showSuche, setShowSuche] = useState(false);
  const geaendertVon = account?.name||account?.email||"Administrator";

  async function reload(){
    const data = await fetchElternkontakte(sb, raw.id);
    setElternLoaded(data);
    if(onReload) onReload();
  }

  function validate(d){
    if(!d.vorname?.trim()) return "Vorname ist Pflichtfeld";
    if(!d.nachname?.trim()) return "Nachname ist Pflichtfeld";
    if(!d.email?.trim()) return "E-Mail ist Pflichtfeld";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "Ungültige E-Mail-Adresse";
    return null;
  }

  async function saveEltern(){
    if(!sb) return;
    const d = editEltern.data;
    const err = validate(d);
    if(err){ setElternMsg({ok:false,text:err}); return; }

    setElternSaving(true); setElternMsg(null);
    try{
      const name = [d.vorname,d.nachname].filter(Boolean).join(" ");

      if(editEltern.mode==="new"){
        const error = await insertElternkontakt(sb,{
          mitglied_id: raw.id,
          verein_id: vereinId,
          vorname: d.vorname||null,
          nachname: d.nachname||null,
          name,
          email: d.email||null,
          telefon: d.telefon||null,
          beziehung: d.beziehung||null,
        });
        if(error) throw error;
        if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT,`Elternkontakt hinzugefügt: ${name}`,"elternkontakte",name,geaendertVon);
      } else {
        const alter = eltern.find(e=>e.id===d.id);
        const alterName = alter?`${alter.vorname||""} ${alter.nachname||""}`.trim():null;
        const error = await updateElternkontakt(sb,d.id,{
          vorname: d.vorname||null,
          nachname: d.nachname||null,
          name,
          email: d.email||null,
          telefon: d.telefon||null,
          beziehung: d.beziehung||null,
        });
        if(error) throw error;
        if(vereinId){
          if(alterName&&name&&alterName!==name)
            logAenderung(sb,raw.id,vereinId,"elternkontakte",alterName,name,geaendertVon);
          else
            logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Elternkontakt bearbeitet: ${name}`,"elternkontakte",name,geaendertVon);
        }
      }
      setElternMsg({ok:true,text:"Gespeichert ✓"});
      setTimeout(()=>{ setEditEltern(null); setElternMsg(null); reload(); },800);
    }catch(e){ setElternMsg({ok:false,text:e.message}); }
    setElternSaving(false);
  }

  async function handleEntknuepfen(e){
    const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
    const ok = await confirm({
      title:`${name} entknüpfen?`,
      message:"Dieses Kind wird vom Elternkontakt getrennt.",
      danger:true,
      confirmLabel:"Entknüpfen"
    });
    if(!ok) return;

    const { verbleibendeKinder, kindNochAktiv } = await unlinkKind(sb, e.id, raw.id);
    if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_ENTFERNT,`Elternkontakt entknüpft: ${name}`,"elternkontakte",name,geaendertVon);

    if(verbleibendeKinder === 0){
      if(kindNochAktiv){
        // Kind noch im Verein (z.B. Junioren → Aktiv) → Elternteil wird Supporter
        // TODO: E-Mail an Elternteil senden (benötigt Edge Function)
        await updateElternkontakt(sb, e.id, { supporter: true });
        // Benutzer-Rolle zu "supporter" ändern falls Portal-Zugang vorhanden
        if(e.benutzer_id){
          await updateBenutzerRolle(sb, e.benutzer_id, "supporter");
        }
      } else {
        // Kind nicht mehr im Verein → Elternkontakt löschen
        // TODO: E-Mail Bestätigung an Elternteil senden
        await deleteElternkontakt(sb, e.id);
      }
    }
    reload();
  }

  async function handleHauptkontakt(e){
    const name = `${e.vorname||""} ${e.nachname||""}`.trim()||e.name||"?";
    if(!e.hauptkontakt){
      await setHauptkontakt(sb, raw.id, e.id, vereinId);
      if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt gesetzt: ${name}`,"elternkontakte",name,geaendertVon);
    } else {
      // Hauptkontakt entfernen
      await clearHauptkontaktFuerKind(sb, e.id, raw.id);
      if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt entfernt: ${name}`,"elternkontakte",name,geaendertVon);
    }
    reload();
  }

  return(
    <div className="cc-col cc-gap-8">
      {canEdit&&!editEltern&&(
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
        onVerknuepft={(mode)=>{
          setShowSuche(false);
          if(mode==="neu") setEditEltern({mode:"neu",data:{mitglied_id:raw.id}});
          else reload();
        }}
      />
      {eltern.length===0&&<EmptyState icon="heart" title="Keine Elternkontakte" subtitle="Noch kein Elternkontakt für dieses Mitglied erfasst."/>}
      {eltern.map((e,i)=>{
        const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
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
                  {label:"Bearbeiten", icon:"edit", onClick:()=>setEditEltern({mode:"edit",data:{...e}})},
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
        <ModalOrSheet open={true} onClose={()=>{setEditEltern(null);setElternMsg(null);}} maxWidth={480}>
          <div className="cc-modal-hdr">
            <div className="cc-modal-title">{editEltern.mode==="new"?"Neuer Elternkontakt":"Elternkontakt bearbeiten"}</div>
            <Btn variant="ghost" small onClick={()=>setEditEltern(null)}><TI n="x" size={14}/></Btn>
          </div>
          <div className="cc-modal-body">
            <div className="cc-form-row">
              {[
                {k:"vorname",   l:"Vorname",    req:true},
                {k:"nachname",  l:"Nachname",   req:true},
                {k:"beziehung", l:"Beziehung",  opts:["Mutter","Vater","Elternteil","Grossmutter","Grossvater","Vormund"]},
                {k:"email",     l:"E-Mail",     type:"email", req:true, full:true},
              ].map(({k,l,type="text",opts,req,full})=>(
                <div key={k} className={full?"cc-form-full":""}>
                  <label className="cc-label">{l}{req&&<span className="cc-label-req"> *</span>}</label>
                  {opts
                    ?<select className="cc-input" value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))}>
                      <option value="">– wählen –</option>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    :<input className="cc-input" type={type} value={editEltern.data[k]||""} onChange={ev=>setEditEltern(p=>({...p,data:{...p.data,[k]:ev.target.value}}))} placeholder={l}/>
                  }
                </div>
              ))}
              <div className="cc-form-full">
                <label className="cc-label">Telefon</label>
                <PhoneInput value={editEltern.data.telefon||""} onChange={v=>setEditEltern(p=>({...p,data:{...p.data,telefon:v}}))} showHint={false}/>
              </div>
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

export { ElternTab, ElternPortalSection };
