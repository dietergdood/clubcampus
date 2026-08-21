/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/MitgliederKonfigTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Btn, Card, ModalOrSheet, ModalTitle, InfoBox, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BTN_COLOR as BTN, BTN_TXT, BL, FONT } from "../../constants.ts";
import { MitgliedtypFelderSektion } from "./MitgliedtypFelderSektion.tsx";
import { PersonenartenSektion } from "./PersonenartenSektion.tsx";
import type { FeldkonfigZeile } from "../../domains/members/feldkonfig.ts";
import { fetchPersonenarten } from "../../domains/person/personArtService.ts";
import type { PersonArt } from "../../domains/person/personArtService.ts";
import type { Sb, SetState } from "../../types.ts";

/* Zeile aus mitgliedtypen */
export interface MitgliedtypZeile {
  id: string;
  name: string;
  beitragsinfo?: string | null;
  hauptkontakt_pflicht?: boolean | null;
  standard_rolle?: string | null;
  sort_order?: number | null;
  aktiv?: boolean | null;
}

/* Formularzustand des Mitgliedtyp-Modals */
export interface MitgliedtypFormular {
  name: string;
  beitragsinfo: string;
  hauptkontakt_pflicht: boolean;
  standard_rolle: string;
}



const STANDARD_ROLLE_OPTS=[{v:"administrator",l:"Administrator"},{v:"administration",l:"Verwaltung"},{v:"funktionaer",l:"Funktionär"},{v:"trainer",l:"Trainer"},{v:"spieler",l:"Spieler"},{v:"eltern",l:"Eltern"},{v:"mitglied",l:"Mitglied"},{v:"supporter",l:"Supporter"}];

interface MitgliederKonfigTabProps {
  supabase: Sb;
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  tab: string;
  vereinId: string | null;
  dbMitgliedtypen: MitgliedtypZeile[];
  setDbMitgliedtypen: SetState<MitgliedtypZeile[]>;
  feldkonfig: FeldkonfigZeile[];
  setFeldkonfig: SetState<FeldkonfigZeile[]>;
  showMitgliedtypForm: boolean;
  setShowMitgliedtypForm: SetState<boolean>;
  editMitgliedtyp: MitgliedtypZeile | null;
  setEditMitgliedtyp: SetState<MitgliedtypZeile | null>;
  mitgliedtypForm: MitgliedtypFormular;
  setMitgliedtypForm: SetState<MitgliedtypFormular>;
}

export function MitgliederKonfigTab({supabase,loading,isMobile,mobileKachel,tab,vereinId,dbMitgliedtypen,setDbMitgliedtypen,feldkonfig,setFeldkonfig,showMitgliedtypForm,setShowMitgliedtypForm,editMitgliedtyp,setEditMitgliedtyp,mitgliedtypForm,setMitgliedtypForm}: MitgliederKonfigTabProps) {

  /* Die pflegbaren Arten ohne Mitgliedschaft. EINE Abfrage beim Aufbau des
     Tabs — nicht eine je Spalte. Seit dem 20.08.2026 gibt es statt eines
     Sammelwerts eine Liste (`personenarten`). */
  const [personenarten, setPersonenarten] = useState<PersonArt[]>([]);
  /* Zaehler statt eines Rueckrufs: die Sektion darunter aendert die Liste,
     und die Feldkonfiguration hat eine Spalte je Art — ohne Neuladen fehlte
     die neue Spalte, bis jemand den Tab wechselt. */
  const [artenStand, setArtenStand] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let abgebrochen = false;
    fetchPersonenarten(supabase).then(a => { if (!abgebrochen) setPersonenarten(a); });
    return () => { abgebrochen = true; };
  }, [supabase, artenStand]);
  const [confirm,confirmDialog]=useConfirm();

  async function saveMitgliedtyp(){
    if(!mitgliedtypForm.name.trim()) return;
    if(supabase){
      if(editMitgliedtyp?.id){
        await supabase.from("mitgliedtypen").update({name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true}).eq("id",editMitgliedtyp.id);
      } else if(vereinId){
        /* verein_id ist in mitgliedtypen NOT NULL — nur beim Insert nötig. */
        const maxSort=Math.max(0,...dbMitgliedtypen.map(t=>t.sort_order||0));
        await supabase.from("mitgliedtypen").insert({name:mitgliedtypForm.name.trim(),beitragsinfo:mitgliedtypForm.beitragsinfo||"",hauptkontakt_pflicht:!!mitgliedtypForm.hauptkontakt_pflicht,standard_rolle:mitgliedtypForm.standard_rolle||null,aktiv:true,verein_id:vereinId,sort_order:maxSort+1});
      }
      const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
      if(data) setDbMitgliedtypen(data);
    }
    setShowMitgliedtypForm(false); setEditMitgliedtyp(null);
    setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});
  }

  async function deleteMitgliedtyp(id: string){
    if(!supabase) return;
    const ok = await confirm({title:"Mitgliedtyp löschen?", message:"Diese Aktion kann nicht rückgängig gemacht werden.", danger:true, confirmLabel:"Löschen"});
    if(!ok) return;
    await supabase.from("mitgliedtypen").update({aktiv:false}).eq("id",id);
    const{data}=await supabase.from("mitgliedtypen").select("*").order("sort_order");
    if(data) setDbMitgliedtypen(data);
  }

  return (
    <div style={{display:'contents'}}>
      {confirmDialog}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="mitglieder_config"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Mitgliedtypen verwalten */}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="cc-section-title"><TI n="id-badge" size={14}/> Mitgliedtypen</div>
              <button onClick={()=>{setEditMitgliedtyp(null);setMitgliedtypForm({name:"",beitragsinfo:"",hauptkontakt_pflicht:false,standard_rolle:""});setShowMitgliedtypForm(true);}}
                style={{padding:"5px 12px",borderRadius:8,border:"none",background:BTN,color:BTN_TXT,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>
                + Neu
              </button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <th className="cc-th" style={{textAlign:"left"}}>Name</th>
                <th className="cc-th cc-th-center">Hauptkontakt</th>
                <th className="cc-th" style={{textAlign:"left"}}>Beitrag</th>
                <th className="cc-th" style={{textAlign:"left"}}>Standard-Rolle</th>
                <th className="cc-th cc-th-center">Aktiv</th>
                <th className="cc-th"></th>
              </tr></thead>
              <tbody>
                {dbMitgliedtypen.map(t=>(
                  <tr key={t.id} className="cc-tr">
                    <td className="cc-td" style={{fontWeight:500}}>{t.name}</td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      {t.hauptkontakt_pflicht
                        ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#fef9c3",color:"#854d0e",fontWeight:600}}>★ Pflicht</span>
                        :<span style={{fontSize:11,color:"var(--sub)"}}>—</span>}
                    </td>
                    <td className="cc-td" style={{fontSize:12,color:"var(--sub)"}}>{t.beitragsinfo||"—"}</td>
                    <td className="cc-td"><span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--surface2)",color:"var(--sub)"}}>{t.standard_rolle||"—"}</span></td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:t.aktiv?"#ECFDF5":"var(--surface2)",color:t.aktiv?"#15803d":"var(--sub)",fontWeight:500}}>
                        {t.aktiv?"Aktiv":"Inaktiv"}
                      </span>
                    </td>
                    <td className="cc-td" style={{textAlign:"right"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setEditMitgliedtyp(t);setMitgliedtypForm({name:t.name,beitragsinfo:t.beitragsinfo||"",hauptkontakt_pflicht:!!t.hauptkontakt_pflicht,standard_rolle:t.standard_rolle||""});setShowMitgliedtypForm(true);}}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6}}>
                          <TI n="edit" size={12}/>
                        </button>
                        <button onClick={()=>deleteMitgliedtyp(t.id)}
                          className="cc-icon-btn" style={{width:26,height:26,borderRadius:6,color:"var(--danger,#ef4444)"}}>
                          <TI n="trash" size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mitgliedtyp bearbeiten Modal */}
          <ModalOrSheet open={showMitgliedtypForm} onClose={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} maxWidth={420}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <ModalTitle>{editMitgliedtyp?"Mitgliedtyp bearbeiten":"Neuer Mitgliedtyp"}</ModalTitle>
                <button onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--sub)",lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="cc-label">Name *</label>
                <input className="cc-input" value={mitgliedtypForm.name} onChange={e=>setMitgliedtypForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Aktivmitglied" autoFocus/>
              </div>
              <div>
                <label className="cc-label">Beitragsinfo</label>
                <input className="cc-input" value={mitgliedtypForm.beitragsinfo||""} onChange={e=>setMitgliedtypForm(p=>({...p,beitragsinfo:e.target.value}))} placeholder="z.B. Voller Beitrag CHF 150"/>
              </div>
              <div>
                <label className="cc-label">Standard Portal-Rolle</label>
                <select className="cc-input" value={mitgliedtypForm.standard_rolle||""} onChange={e=>setMitgliedtypForm(p=>({...p,standard_rolle:e.target.value}))}>
                  <option value="">– keine –</option>
                  {STANDARD_ROLLE_OPTS.map(r=>(
                    <option key={r.v} value={r.v}>{r.l}</option>
                  ))}
                </select>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Wird automatisch gesetzt wenn keine höhere Rolle vorliegt</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",cursor:"pointer"}}
                onClick={()=>setMitgliedtypForm(p=>({...p,hauptkontakt_pflicht:!p.hauptkontakt_pflicht}))}>
                <div style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${mitgliedtypForm.hauptkontakt_pflicht?"#22c55e":"var(--border)"}`,background:mitgliedtypForm.hauptkontakt_pflicht?"#ECFDF5":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {mitgliedtypForm.hauptkontakt_pflicht&&<TI n="check" size={11} style={{color:"#15803d"}}/>}
                </div>
                <span style={{fontSize:13}}>Hauptkontakt Pflicht</span>
                <span style={{fontSize:12,color:"var(--sub)",marginLeft:"auto"}}>nur für Minderjährige</span>
              </div>
              <div style={{display:"flex",gap:10,paddingTop:4,borderTop:"0.5px solid var(--border)"}}>
                <button onClick={saveMitgliedtyp} style={{flex:1,padding:10,borderRadius:10,background:BTN,color:BTN_TXT,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                  {editMitgliedtyp?"Speichern":"Erstellen"}
                </button>
                <Btn onClick={()=>{setShowMitgliedtypForm(false);setEditMitgliedtyp(null);}}>Abbrechen</Btn>
              </div>
            </div>
          </ModalOrSheet>

          {/* Die Arten ohne Mitgliedschaft — Nachzug aus Etappe 1, gebaut
              am 22.08.2026. Steht VOR der Feldmatrix, weil sie deren
              Spalten liefert: wer eine Art anlegt, sieht sie unten sofort
              als eigene Spalte. */}
          <PersonenartenSektion supabase={supabase} vereinId={vereinId}
            onArtenGeaendert={() => setArtenStand(n => n + 1)}/>

          {/* Was ein Mitgliedtyp hat — drei Werte statt eines Häkchens.
              Ersetzt die beiden Matrizen "Pflichtfelder nach Mitgliedtyp"
              und "Zusatzfelder nach Rolle", die hier bis zum 19.08.2026
              standen: eine Achse statt zweier.

              Die Tabellen `mitgliedtyp_pflichtfelder` und
              `rolle_pflichtfelder` stehen noch in der Datenbank, werden aber
              von keiner Stelle mehr gelesen. Sie fallen in einer eigenen
              Migration, wie `elternkontakte`. */}
          <MitgliedtypFelderSektion
            supabase={supabase} vereinId={vereinId}
            dbMitgliedtypen={dbMitgliedtypen}
            feldkonfig={feldkonfig} setFeldkonfig={setFeldkonfig}
            personenarten={personenarten}
          />
        </div>
      )}

      {/* ── TAB: FELDSICHTBARKEIT ── */}
    </div>
  );
}
